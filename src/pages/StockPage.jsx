import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { CATEGORIES, categoryIcon } from '../lib/categories'
import { fetchAltBarcodes, findProductByBarcode } from '../lib/barcodes'
import PageHeader from '../components/PageHeader'
import RestockDialog from '../components/RestockDialog'
import { IconPlus, IconSearch } from '../components/icons'

const BarcodeScanner = lazy(() => import('../components/BarcodeScanner'))

const ALL = 'الكل'

export default function StockPage() {
  const [products, setProducts] = useState(undefined)
  const [altBarcodes, setAltBarcodes] = useState([])
  const [error, setError] = useState(null)
  const [notice, setNotice] = useState(null)
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState(ALL)
  const [scannerOpen, setScannerOpen] = useState(false)
  const [restockTarget, setRestockTarget] = useState(null)
  const [restockBusy, setRestockBusy] = useState(false)
  const [unknownBarcode, setUnknownBarcode] = useState(null)

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
    fetchProducts()

    async function fetchProducts() {
      const [{ data, error: fetchError }, altResult] = await Promise.all([
        supabase
          .from('products')
          .select('id, name, category, stock_qty, low_stock_threshold, barcode')
          .order('name', { ascending: true }),
        fetchAltBarcodes().catch(() => []),
      ])

      if (cancelled) return
      if (fetchError) setError(fetchError)
      else setProducts(data)
      setAltBarcodes(altResult)
    }

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    return () => {
      if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current)
    }
  }, [])

  function showNotice(type, text) {
    if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current)
    setNotice({ type, text })
    noticeTimerRef.current = setTimeout(() => setNotice(null), 4500)
  }

  function handleScanDetected(code) {
    setScannerOpen(false)
    setUnknownBarcode(null)
    const product = findProductByBarcode(productsRef.current || [], altBarcodesRef.current || [], code)
    if (!product) {
      setUnknownBarcode(code)
      return
    }
    setRestockTarget(product)
  }

  async function handleConfirmRestock(amount) {
    if (!restockTarget) return
    setRestockBusy(true)
    const newQty = restockTarget.stock_qty + amount

    const { error: updateError } = await supabase.from('products').update({ stock_qty: newQty }).eq('id', restockTarget.id)

    setRestockBusy(false)

    if (updateError) {
      showNotice('danger', 'تعذّر تحديث الكمية. حاول مرة أخرى.')
      return
    }

    setProducts((prev) => prev.map((p) => (p.id === restockTarget.id ? { ...p, stock_qty: newQty } : p)))
    showNotice('info', `تم تحديث كمية "${restockTarget.name}" إلى ${newQty} قطعة.`)
    setRestockTarget(null)
  }

  const categories = [ALL, ...CATEGORIES.map((c) => c.value)]

  const filtered = (products ?? []).filter((p) => {
    const matchesCategory = activeCategory === ALL || p.category === activeCategory
    const matchesSearch = !search.trim() || p.name.toLowerCase().includes(search.trim().toLowerCase())
    return matchesCategory && matchesSearch
  })

  return (
    <div className="page">
      <PageHeader title="المخزون" />

      {products && products.length > 0 && (
        <>
          <div className="search-input-wrap" style={{ marginBottom: 12 }}>
            <IconSearch width={18} height={18} />
            <input
              type="search"
              className="input search-input"
              placeholder="ابحث باسم المنتج..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
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

          <button
            type="button"
            className="btn btn-secondary btn-block"
            style={{ marginBottom: 14 }}
            onClick={() => setScannerOpen(true)}
          >
            📷 مسح لإعادة التخزين
          </button>
        </>
      )}

      {notice && <div className={'alert alert-' + notice.type} style={{ marginBottom: 12 }}>{notice.text}</div>}

      {unknownBarcode && (
        <div className="alert alert-warn" style={{ marginBottom: 12 }}>
          لم نجد منتجاً بهذا الباركود في مخزونك.{' '}
          <Link to="/stock/new" state={{ presetBarcode: unknownBarcode }} className="link-btn">
            أضف منتجاً جديداً
          </Link>
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
          <div className="empty-icon">📦</div>
          <h3>لا توجد منتجات بعد</h3>
          <p className="muted">أضف أول منتج ليبدأ ظهور مخزونك هنا.</p>
          <Link to="/stock/new" className="btn btn-primary btn-lg">
            أضف أول منتج
          </Link>
        </div>
      )}

      {products && products.length > 0 && filtered.length === 0 && (
        <div className="empty">
          <div className="empty-icon">🔍</div>
          <h3>لا نتائج مطابقة</h3>
          <p className="muted">جرّب كلمة بحث أخرى أو فئة مختلفة.</p>
        </div>
      )}

      {filtered.length > 0 && (
        <ul className="stack-sm stock-list">
          {filtered.map((p) => {
            const low = p.stock_qty <= p.low_stock_threshold
            return (
              <li key={p.id}>
                <Link to={`/stock/${p.id}/edit`} className="card row stock-row">
                  <span className="stock-icon" aria-hidden="true">
                    {categoryIcon(p.category)}
                  </span>
                  <span className="grow stock-info">
                    <span className="stock-name truncate">{p.name}</span>
                    <span className="muted small truncate">{p.category}</span>
                  </span>
                  <span className={'badge num ' + (low ? 'badge-danger' : 'badge-ok')}>{p.stock_qty} قطعة</span>
                </Link>
              </li>
            )
          })}
        </ul>
      )}

      {products && products.length > 0 && (
        <Link to="/stock/new" className="fab" aria-label="إضافة منتج">
          <IconPlus />
        </Link>
      )}

      <Suspense fallback={null}>
        {scannerOpen && <BarcodeScanner onDetect={handleScanDetected} onClose={() => setScannerOpen(false)} />}
      </Suspense>

      {restockTarget && (
        <RestockDialog
          productName={restockTarget.name}
          currentQty={restockTarget.stock_qty}
          busy={restockBusy}
          onConfirm={handleConfirmRestock}
          onCancel={() => setRestockTarget(null)}
        />
      )}
    </div>
  )
}
