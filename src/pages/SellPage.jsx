import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { CATEGORIES, categoryIcon } from '../lib/categories'
import { formatPrice } from '../lib/format'
import { sellOne, undoSale } from '../lib/sales'
import { fetchAltBarcodes, findProductByBarcode } from '../lib/barcodes'
import PageHeader from '../components/PageHeader'
import AdjustPriceDialog from '../components/AdjustPriceDialog'
import { IconSearch } from '../components/icons'

const BarcodeScanner = lazy(() => import('../components/BarcodeScanner'))

const ALL = 'الكل'
const UNDO_MS = 5000

export default function SellPage() {
  const [products, setProducts] = useState(undefined)
  const [altBarcodes, setAltBarcodes] = useState([])
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState(ALL)
  const [sellingId, setSellingId] = useState(null)
  const [notice, setNotice] = useState(null)
  const [undo, setUndo] = useState(null) // { saleId, productId, productName, previousQty }
  const [scannerOpen, setScannerOpen] = useState(false)
  const [adjustTarget, setAdjustTarget] = useState(null) // منتج بصدد تعديل سعر بيعه
  const [adjustBusy, setAdjustBusy] = useState(false)

  const undoTimerRef = useRef(null)
  const noticeTimerRef = useRef(null)
  const productsRef = useRef(products)
  useEffect(() => {
    productsRef.current = products
  }, [products])
  const altBarcodesRef = useRef(altBarcodes)
  useEffect(() => {
    altBarcodesRef.current = altBarcodes
  }, [altBarcodes])

  useEffect(() => {
    let cancelled = false
    Promise.all([
      supabase.from('products').select('*').order('name', { ascending: true }),
      fetchAltBarcodes().catch(() => []),
    ]).then(([{ data, error: fetchError }, altResult]) => {
      if (cancelled) return
      if (fetchError) setError(fetchError)
      else setProducts(data)
      setAltBarcodes(altResult)
    })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    return () => {
      if (undoTimerRef.current) clearTimeout(undoTimerRef.current)
      if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current)
    }
  }, [])

  function showNotice(type, text) {
    if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current)
    setNotice({ type, text })
    noticeTimerRef.current = setTimeout(() => setNotice(null), 4000)
  }

  function showUndo(entry) {
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current)
    setUndo(entry)
    undoTimerRef.current = setTimeout(() => setUndo(null), UNDO_MS)
  }

  const handleSell = useCallback(async (product, priceOverride) => {
    if (product.stock_qty <= 0 || sellingId) return
    setSellingId(product.id)
    try {
      const { sale, newQty } = await sellOne(product, priceOverride)
      setProducts((prev) => prev.map((p) => (p.id === product.id ? { ...p, stock_qty: newQty } : p)))
      showUndo({ saleId: sale.id, productId: product.id, productName: product.name, previousQty: product.stock_qty })
    } catch (err) {
      if (err.code === 'STALE_STOCK' || err.code === 'OUT_OF_STOCK') {
        showNotice('warn', 'تغيّرت الكمية للتو. تحقق من المخزون وحاول مرة أخرى.')
        // أعد جلب الكمية الحقيقية لهذا المنتج فقط، بهدوء
        supabase
          .from('products')
          .select('stock_qty')
          .eq('id', product.id)
          .maybeSingle()
          .then(({ data }) => {
            if (data) setProducts((prev) => prev.map((p) => (p.id === product.id ? { ...p, stock_qty: data.stock_qty } : p)))
          })
      } else {
        showNotice('danger', 'تعذّر تسجيل البيع. حاول مرة أخرى.')
      }
    } finally {
      setSellingId(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sellingId])

  const handleScanSell = useCallback(
    async (code) => {
      setScannerOpen(false)
      const product = findProductByBarcode(productsRef.current || [], altBarcodesRef.current || [], code)

      if (!product) {
        showNotice('warn', 'لم نجد منتجاً بهذا الباركود في مخزونك.')
        return
      }
      if (product.stock_qty <= 0) {
        showNotice('warn', `نفدت كمية "${product.name}".`)
        return
      }
      setAdjustTarget(product)
    },
    []
  )

  async function handleConfirmAdjustSell(customPrice) {
    if (!adjustTarget) return
    setAdjustBusy(true)
    await handleSell(adjustTarget, customPrice)
    setAdjustBusy(false)
    setAdjustTarget(null)
  }

  async function handleUndo() {
    if (!undo) return
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current)
    const entry = undo
    setUndo(null)
    setProducts((prev) => prev.map((p) => (p.id === entry.productId ? { ...p, stock_qty: entry.previousQty } : p)))
    try {
      await undoSale(entry.saleId, entry.productId, entry.previousQty)
    } catch {
      showNotice('danger', 'تعذّر التراجع بالكامل. تحقق من المخزون.')
    }
  }

  const categories = [ALL, ...CATEGORIES.map((c) => c.value)]

  const filtered = (products ?? []).filter((p) => {
    const matchesCategory = activeCategory === ALL || p.category === activeCategory
    const matchesSearch = !search.trim() || p.name.toLowerCase().includes(search.trim().toLowerCase())
    return matchesCategory && matchesSearch
  })

  return (
    <div className="page">
      <PageHeader title="البيع" />

      {products && products.length > 0 && (
        <>
          <div className="row sell-search-row">
            <div className="search-input-wrap grow">
              <IconSearch width={18} height={18} />
              <input
                type="search"
                className="input search-input"
                placeholder="ابحث عن منتج..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <button
              type="button"
              className="btn btn-secondary sell-scan-btn"
              onClick={() => setScannerOpen(true)}
              aria-label="مسح للبيع"
            >
              📷
            </button>
          </div>

          <div className="pill-row">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                className={'pill' + (activeCategory === cat ? ' active' : '')}
                onClick={() => setActiveCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>
        </>
      )}

      {notice && (
        <div className={'alert alert-' + notice.type} style={{ marginBottom: 12 }}>
          {notice.text}
        </div>
      )}

      {error && <div className="alert alert-danger">تعذّر تحميل المنتجات. حاول مرة أخرى.</div>}

      {products === undefined && !error && (
        <div className="loading-screen" style={{ minHeight: '40vh' }}>
          <div className="spinner" />
        </div>
      )}

      {products?.length === 0 && (
        <div className="empty">
          <div className="empty-icon">🛍️</div>
          <h3>لا توجد منتجات بعد</h3>
          <p className="muted">أضف منتجات في المخزون أولاً حتى تظهر هنا للبيع.</p>
          <Link to="/stock/new" className="btn btn-primary btn-lg">
            أضف منتجاً
          </Link>
        </div>
      )}

      {products && products.length > 0 && filtered.length === 0 && (
        <div className="empty">
          <div className="empty-icon">🔍</div>
          <h3>لا نتائج</h3>
          <p className="muted">جرّب كلمة بحث أخرى أو فئة مختلفة.</p>
        </div>
      )}

      {filtered.length > 0 && (
        <div className="sell-grid">
          {filtered.map((p) => {
            const outOfStock = p.stock_qty <= 0
            const lowStock = !outOfStock && p.stock_qty <= p.low_stock_threshold
            const hasOffer = p.is_on_offer && p.offer_price != null
            const displayPrice = hasOffer ? p.offer_price : p.price

            return (
              <div key={p.id} className="card sell-card">
                <div className="sell-card-image">
                  {p.image_url ? (
                    <img src={p.image_url} alt="" />
                  ) : (
                    <span className="sell-card-icon" aria-hidden="true">
                      {categoryIcon(p.category)}
                    </span>
                  )}
                  {lowStock && <span className="badge badge-danger sell-badge">مخزون منخفض</span>}
                  {hasOffer && <span className="badge badge-warn sell-badge sell-badge-start">عرض</span>}
                </div>

                <p className="sell-card-name truncate">{p.name}</p>
                <div className="row-between sell-price-row">
                  <p className="sell-card-price">
                    {hasOffer && <span className="sell-price-strike num">{formatPrice(p.price)}</span>}
                    <span className="num">{formatPrice(displayPrice)}</span>{' '}
                    <span className="small muted">د.م.</span>
                  </p>
                  {!outOfStock && (
                    <button
                      type="button"
                      className="price-edit-btn"
                      onClick={() => setAdjustTarget(p)}
                      aria-label="تعديل سعر البيع (مساومة)"
                    >
                      ✏️
                    </button>
                  )}
                </div>

                {outOfStock ? (
                  <button type="button" className="btn btn-secondary btn-sm btn-block" disabled>
                    نفدت الكمية
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn btn-primary btn-sm btn-block"
                    disabled={sellingId === p.id}
                    onClick={() => handleSell(p)}
                  >
                    {sellingId === p.id ? '...' : '✓ تم البيع'}
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}

      <Suspense fallback={null}>
        {scannerOpen && <BarcodeScanner onDetect={handleScanSell} onClose={() => setScannerOpen(false)} />}
      </Suspense>

      {undo && (
        <div className="undo-toast">
          <span>✓ تم بيع {undo.productName} بنجاح</span>
          <button type="button" onClick={handleUndo}>
            تراجع
          </button>
        </div>
      )}

      {adjustTarget && (
        <AdjustPriceDialog
          productName={adjustTarget.name}
          defaultPrice={
            adjustTarget.is_on_offer && adjustTarget.offer_price != null ? adjustTarget.offer_price : adjustTarget.price
          }
          busy={adjustBusy}
          onConfirm={handleConfirmAdjustSell}
          onCancel={() => setAdjustTarget(null)}
        />
      )}
    </div>
  )
}
