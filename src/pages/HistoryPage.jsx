import { useEffect, useRef, useState } from 'react'
import { fetchSalesPage } from '../lib/salesHistory'
import { undoSaleFromHistory } from '../lib/sales'
import { dayLabel, timeLabel } from '../lib/dateFormat'
import { formatPrice } from '../lib/format'
import PageHeader from '../components/PageHeader'
import ConfirmDialog from '../components/ConfirmDialog'

const PAGE_SIZE = 25

const FILTERS = [
  { key: 'today', label: 'اليوم' },
  { key: 'week', label: 'آخر 7 أيام' },
  { key: 'all', label: 'الكل' },
]

/** يحوّل قائمة مبيعات مسطّحة إلى صفوف للعرض، مع إدراج عنوان يوم قبل كل مجموعة جديدة. */
function buildGroupedRows(sales) {
  const rows = []
  let lastLabel = null

  for (const s of sales) {
    const label = dayLabel(s.sold_at)
    if (label !== lastLabel) {
      rows.push({ type: 'header', key: `day-${s.id}`, label })
      lastLabel = label
    }
    rows.push({ type: 'sale', key: s.id, sale: s })
  }

  return rows
}

function sinceIsoFor(filter) {
  const d = new Date()
  if (filter === 'today') {
    d.setHours(0, 0, 0, 0)
    return d.toISOString()
  }
  if (filter === 'week') {
    d.setDate(d.getDate() - 6)
    d.setHours(0, 0, 0, 0)
    return d.toISOString()
  }
  return null // 'all'
}

export default function HistoryPage() {
  const [filter, setFilter] = useState('all')
  const [sales, setSales] = useState(undefined)
  const [error, setError] = useState(null)
  const [hasMore, setHasMore] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)

  const [undoTarget, setUndoTarget] = useState(null) // صف البيع المطلوب التراجع عنه
  const [undoBusy, setUndoBusy] = useState(false)
  const [notice, setNotice] = useState(null)
  const noticeTimerRef = useRef(null)

  useEffect(() => {
    let cancelled = false
    setSales(undefined)
    setError(null)
    setHasMore(true)

    fetchSalesPage({ sinceIso: sinceIsoFor(filter), offset: 0, limit: PAGE_SIZE })
      .then((page) => {
        if (cancelled) return
        setSales(page)
        setHasMore(page.length === PAGE_SIZE)
      })
      .catch((err) => {
        if (!cancelled) setError(err)
      })

    return () => {
      cancelled = true
    }
  }, [filter])

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

  async function handleLoadMore() {
    setLoadingMore(true)
    try {
      const page = await fetchSalesPage({ sinceIso: sinceIsoFor(filter), offset: sales.length, limit: PAGE_SIZE })
      setSales((prev) => [...prev, ...page])
      setHasMore(page.length === PAGE_SIZE)
    } catch (err) {
      setError(err)
    } finally {
      setLoadingMore(false)
    }
  }

  async function handleConfirmUndo() {
    if (!undoTarget) return
    setUndoBusy(true)
    try {
      await undoSaleFromHistory(undoTarget)
      setSales((prev) => prev.filter((s) => s.id !== undoTarget.id))
      showNotice('info', `تم التراجع عن بيع "${undoTarget.product_name}".`)
    } catch {
      showNotice('danger', 'تعذّر التراجع عن عملية البيع. حاول مرة أخرى.')
    } finally {
      setUndoBusy(false)
      setUndoTarget(null)
    }
  }

  return (
    <div className="page">
      <PageHeader title="السجل" />

      <div className="pill-row">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            className={'pill' + (filter === f.key ? ' active' : '')}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {notice && <div className={'alert alert-' + notice.type} style={{ marginBottom: 12 }}>{notice.text}</div>}

      {error && <div className="alert alert-danger">تعذّر تحميل السجل. حاول مرة أخرى.</div>}

      {sales === undefined && !error && (
        <div className="loading-screen" style={{ minHeight: '40vh' }}>
          <div className="spinner" />
        </div>
      )}

      {sales?.length === 0 && (
        <div className="empty">
          <div className="empty-icon">🧾</div>
          <h3>لا توجد مبيعات</h3>
          <p className="muted">لم تُسجَّل أي عملية بيع في هذه الفترة.</p>
        </div>
      )}

      {sales && sales.length > 0 && (
        <div className="stack-sm">
          {buildGroupedRows(sales).map((row) =>
            row.type === 'header' ? (
              <p key={row.key} className="history-day-label">
                {row.label}
              </p>
            ) : (
              <div key={row.key} className="card history-row">
                <div className="row-between">
                  <span className="truncate history-name">{row.sale.product_name}</span>
                  <span className="num history-total">
                    {formatPrice(row.sale.sale_price * row.sale.quantity)} <span className="small muted">د.م.</span>
                  </span>
                </div>
                <div className="row-between" style={{ marginTop: 4 }}>
                  <span className="muted small">
                    {row.sale.quantity} قطعة · {timeLabel(row.sale.sold_at)}
                  </span>
                  <button type="button" className="history-undo-btn" onClick={() => setUndoTarget(row.sale)}>
                    ↩ تراجع
                  </button>
                </div>
              </div>
            )
          )}
        </div>
      )}

      {sales && sales.length > 0 && hasMore && (
        <button
          type="button"
          className="btn btn-secondary btn-block"
          style={{ marginTop: 14 }}
          onClick={handleLoadMore}
          disabled={loadingMore}
        >
          {loadingMore ? '...' : 'تحميل المزيد'}
        </button>
      )}

      {undoTarget && (
        <ConfirmDialog
          title="التراجع عن عملية البيع؟"
          message={`سيُحذف سجل بيع "${undoTarget.product_name}" وتُعاد ${undoTarget.quantity} قطعة إلى المخزون. لا يمكن التراجع عن هذا الإجراء.`}
          confirmLabel="تراجع"
          busy={undoBusy}
          onConfirm={handleConfirmUndo}
          onCancel={() => setUndoTarget(null)}
        />
      )}
    </div>
  )
}
