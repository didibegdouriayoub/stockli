import { useCallback, useEffect, lazy, Suspense, useState } from 'react'
import { useNavigate, useParams, useLocation, Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useStore } from '../lib/StoreContext'
import { CATEGORIES } from '../lib/categories'
import { uploadProductImage, deleteProductImageByUrl } from '../lib/productImages'
import { lookupBarcode } from '../lib/upcLookup'
import { generateStickerCode } from '../lib/stickerCode'
import { translateProductError } from '../lib/productErrors'
import ConfirmDialog from '../components/ConfirmDialog'
import LoadingScreen from '../components/LoadingScreen'

// نُحمّل مكتبتي مسح الباركود وتوليد QR فقط عند الحاجة الفعلية (زر المسح/الملصق)
// حتى لا يُثقَّل التحميل الأول للصفحة بمكتبات لن يستعملها كل المستخدمين فوراً —
// مهم لأصحاب المحلات بباقات إنترنت محدودة.
const BarcodeScanner = lazy(() => import('../components/BarcodeScanner'))
const QrStickerModal = lazy(() => import('../components/QrStickerModal'))

const emptyForm = {
  name: '',
  category: CATEGORIES[0].value,
  price: '',
  stockQty: '',
  lowStockThreshold: '3',
  barcode: '',
}

export default function ProductFormPage() {
  const { id } = useParams()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const location = useLocation()
  const { store } = useStore()

  const [form, setForm] = useState(emptyForm)
  const [fieldErrors, setFieldErrors] = useState({})
  const [formError, setFormError] = useState('')

  const [loading, setLoading] = useState(isEdit)
  const [notFound, setNotFound] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [existingImageUrl, setExistingImageUrl] = useState(null)
  const [imageRemoved, setImageRemoved] = useState(false)

  const [scannerOpen, setScannerOpen] = useState(false)
  const [lookupLoading, setLookupLoading] = useState(false)
  const [lookupBanner, setLookupBanner] = useState(null)
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)
  const [stickerCode, setStickerCode] = useState(null)

  const justScanned = Boolean(location.state?.justScanned)

  // ---- تحميل المنتج في وضع التعديل ----
  useEffect(() => {
    if (!isEdit) return
    let cancelled = false

    supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return
        if (error || !data) {
          setNotFound(true)
          setLoading(false)
          return
        }
        setForm({
          name: data.name,
          category: data.category || CATEGORIES[0].value,
          price: String(data.price),
          stockQty: String(data.stock_qty),
          lowStockThreshold: String(data.low_stock_threshold),
          barcode: data.barcode || '',
        })
        setExistingImageUrl(data.image_url)
        setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [id, isEdit])

  // ---- تنظيف رابط معاينة الصورة المحلي عند تغييره أو إلغاء تحميل الصفحة ----
  useEffect(() => {
    return () => {
      if (imagePreview) URL.revokeObjectURL(imagePreview)
    }
  }, [imagePreview])

  function setField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function handleImageChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setImageFile(file)
    setImageRemoved(false)
    setImagePreview(URL.createObjectURL(file))
  }

  // ---- منطق الباركود: بحث في منتجات المحل، ثم UPCitemdb، ثم إدخال يدوي ----
  const handleScanDetected = useCallback(
    async (code) => {
      setScannerOpen(false)
      setField('barcode', code)
      setLookupBanner(null)

      if (isEdit) return // في التعديل: فقط حدّث الحقل، لا حاجة لبحث

      setLookupLoading(true)

      const { data: existing } = await supabase.from('products').select('id, name').eq('barcode', code).maybeSingle()

      if (existing) {
        setLookupLoading(false)
        navigate(`/stock/${existing.id}/edit`, { replace: true, state: { justScanned: true } })
        return
      }

      const upcResult = await lookupBarcode(code)
      setLookupLoading(false)

      if (upcResult?.name) {
        setForm((prev) => ({ ...prev, name: prev.name || upcResult.name }))
        setLookupBanner({
          type: 'info',
          text: `وجدنا هذا المنتج: ${upcResult.name}${upcResult.brand ? ' — ' + upcResult.brand : ''}. تحقق من الاسم وأكمل السعر والكمية.`,
        })
      } else {
        setLookupBanner({
          type: 'neutral',
          text: 'لم نجد معلومات عن هذا الباركود. أدخل تفاصيل المنتج يدوياً وسيُحفظ الباركود معه.',
        })
      }
    },
    [isEdit, navigate]
  )

  // ---- باركود ممسوح مسبقاً من شاشة أخرى (مثلاً "إعادة تخزين" لمنتج غير معروف) ----
  useEffect(() => {
    const preset = location.state?.presetBarcode
    if (preset && !isEdit) handleScanDetected(preset)
    // نُشغّلها مرة واحدة فقط عند فتح الصفحة بهذه الحالة
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleGenerateCode() {
    const code = generateStickerCode(store.id)
    setField('barcode', code)
    setLookupBanner(null)
    setStickerCode(code)
  }

  function validate() {
    const errors = {}
    if (form.name.trim().length < 2) errors.name = 'اكتب اسم المنتج (حرفان على الأقل).'
    const price = Number(form.price)
    if (form.price === '' || Number.isNaN(price) || price < 0) errors.price = 'أدخل سعراً صحيحاً.'
    const qty = Number(form.stockQty)
    if (form.stockQty === '' || !Number.isInteger(qty) || qty < 0) errors.stockQty = 'أدخل كمية صحيحة.'
    const threshold = Number(form.lowStockThreshold)
    if (form.lowStockThreshold === '' || !Number.isInteger(threshold) || threshold < 0) {
      errors.lowStockThreshold = 'أدخل رقماً صحيحاً.'
    }
    return errors
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const errors = validate()
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) return

    setSaving(true)
    setFormError('')

    try {
      let imageUrl = existingImageUrl
      if (imageFile) {
        imageUrl = await uploadProductImage(store.id, imageFile)
        if (existingImageUrl) deleteProductImageByUrl(existingImageUrl)
      } else if (imageRemoved) {
        if (existingImageUrl) deleteProductImageByUrl(existingImageUrl)
        imageUrl = null
      }

      const payload = {
        store_id: store.id,
        name: form.name.trim(),
        category: form.category,
        price: Number(form.price),
        stock_qty: Number(form.stockQty),
        low_stock_threshold: Number(form.lowStockThreshold),
        barcode: form.barcode.trim() || null,
        image_url: imageUrl,
      }

      const { error } = isEdit
        ? await supabase.from('products').update(payload).eq('id', id)
        : await supabase.from('products').insert(payload)

      if (error) throw error

      navigate('/stock', { replace: true })
    } catch (err) {
      setFormError(translateProductError(err))
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    setDeleting(true)
    const { error } = await supabase.from('products').delete().eq('id', id)
    setDeleting(false)

    if (error) {
      setConfirmDeleteOpen(false)
      setFormError('تعذّر حذف المنتج. حاول مرة أخرى.')
      return
    }
    if (existingImageUrl) deleteProductImageByUrl(existingImageUrl)
    navigate('/stock', { replace: true })
  }

  if (loading) return <LoadingScreen />

  if (notFound) {
    return (
      <div className="page center">
        <div className="empty">
          <div className="empty-icon">❓</div>
          <h3>المنتج غير موجود</h3>
          <Link to="/stock" className="btn btn-primary">
            الرجوع للمخزون
          </Link>
        </div>
      </div>
    )
  }

  const previewSrc = imagePreview || (!imageRemoved ? existingImageUrl : null)

  return (
    <div className="page page-narrow">
      <div className="row-between" style={{ marginBottom: 10 }}>
        <Link to="/stock" className="btn btn-ghost btn-sm">
          ✕ إلغاء
        </Link>
        <h1>{isEdit ? 'تعديل المنتج' : 'إضافة منتج'}</h1>
        <span style={{ width: 60 }} />
      </div>

      {justScanned && (
        <div className="alert alert-info" style={{ marginBottom: 14 }}>
          🔁 هذا المنتج موجود بالفعل. عدّل الكمية إذا استلمت بضاعة جديدة، ثم احفظ.
        </div>
      )}

      <form className="stack" onSubmit={handleSubmit} noValidate>
        <div className="field">
          <label htmlFor="name">اسم المنتج</label>
          <input
            id="name"
            className="input"
            type="text"
            placeholder="مثال: آيفون 15 برو"
            value={form.name}
            onChange={(e) => setField('name', e.target.value)}
          />
          {fieldErrors.name && <p className="field-error">{fieldErrors.name}</p>}
        </div>

        <div className="field">
          <label htmlFor="category">الفئة</label>
          <select id="category" className="input" value={form.category} onChange={(e) => setField('category', e.target.value)}>
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.icon} {c.label}
              </option>
            ))}
          </select>
        </div>

        <div className="form-row-2">
          <div className="field">
            <label htmlFor="price">السعر (د.م.)</label>
            <input
              id="price"
              className="input"
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              placeholder="0"
              value={form.price}
              onChange={(e) => setField('price', e.target.value)}
            />
            {fieldErrors.price && <p className="field-error">{fieldErrors.price}</p>}
          </div>
          <div className="field">
            <label htmlFor="stockQty">الكمية</label>
            <input
              id="stockQty"
              className="input"
              type="number"
              inputMode="numeric"
              min="0"
              step="1"
              placeholder="0"
              value={form.stockQty}
              onChange={(e) => setField('stockQty', e.target.value)}
            />
            {fieldErrors.stockQty && <p className="field-error">{fieldErrors.stockQty}</p>}
          </div>
        </div>

        <div className="field">
          <label htmlFor="lowStockThreshold">حد التنبيه (مخزون منخفض)</label>
          <input
            id="lowStockThreshold"
            className="input"
            type="number"
            inputMode="numeric"
            min="0"
            step="1"
            value={form.lowStockThreshold}
            onChange={(e) => setField('lowStockThreshold', e.target.value)}
          />
          <p className="hint">عندما تنخفض الكمية عن هذا الرقم، سيظهر تنبيه في لوحة التحكم.</p>
          {fieldErrors.lowStockThreshold && <p className="field-error">{fieldErrors.lowStockThreshold}</p>}
        </div>

        <div className="field">
          <label>الباركود</label>
          <div className="barcode-row">
            <input
              className="input"
              type="text"
              dir="ltr"
              placeholder="امسح أو اكتب الباركود"
              value={form.barcode}
              onChange={(e) => setField('barcode', e.target.value)}
            />
            <button
              type="button"
              className="btn btn-secondary barcode-scan-btn"
              onClick={() => setScannerOpen(true)}
              aria-label="مسح الباركود"
            >
              📷
            </button>
          </div>

          {lookupLoading && <p className="hint">جارٍ البحث عن معلومات المنتج...</p>}

          {lookupBanner && (
            <div className={'alert ' + (lookupBanner.type === 'info' ? 'alert-info' : 'alert-warn')}>
              {lookupBanner.text}
            </div>
          )}

          {!form.barcode && (
            <button type="button" className="link-action" onClick={handleGenerateCode}>
              🏷️ ليس له باركود؟ أنشئ رمزاً خاصاً واطبع ملصقاً
            </button>
          )}
          {form.barcode && (
            <button
              type="button"
              className="link-action"
              onClick={() => setStickerCode(form.barcode)}
            >
              🖨️ اطبع ملصق هذا الرمز
            </button>
          )}
        </div>

        <div className="field">
          <label>صورة المنتج</label>
          <label className="image-upload">
            {previewSrc ? (
              <>
                <img src={previewSrc} alt="" />
                <span className="image-upload-change">تغيير الصورة</span>
              </>
            ) : (
              <>
                <span style={{ fontSize: '1.8rem' }}>📷</span>
                <span>اضغط هنا لإضافة صورة المنتج</span>
              </>
            )}
            <input type="file" accept="image/*" capture="environment" onChange={handleImageChange} />
          </label>
        </div>

        {formError && <div className="alert alert-danger">{formError}</div>}

        <button type="submit" className="btn btn-primary btn-lg btn-block" disabled={saving}>
          {saving ? 'جارٍ الحفظ...' : isEdit ? 'حفظ التعديلات' : 'إضافة المنتج'}
        </button>

        {isEdit && (
          <button type="button" className="delete-link" onClick={() => setConfirmDeleteOpen(true)}>
            حذف المنتج
          </button>
        )}
      </form>

      <Suspense fallback={null}>
        {scannerOpen && <BarcodeScanner onDetect={handleScanDetected} onClose={() => setScannerOpen(false)} />}

        {stickerCode && (
          <QrStickerModal code={stickerCode} productName={form.name} onClose={() => setStickerCode(null)} />
        )}
      </Suspense>

      {confirmDeleteOpen && (
        <ConfirmDialog
          title="حذف المنتج؟"
          message="هل أنت متأكد من حذف هذا المنتج؟ لا يمكن التراجع عن هذا الإجراء."
          confirmLabel="حذف"
          busy={deleting}
          onConfirm={handleDelete}
          onCancel={() => setConfirmDeleteOpen(false)}
        />
      )}
    </div>
  )
}
