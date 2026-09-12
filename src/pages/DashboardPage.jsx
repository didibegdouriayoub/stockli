import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchSalesSince, summarizeSales, fetchLowStockProducts, startOfToday, sevenDaysAgo } from '../lib/dashboard'
import { formatPrice } from '../lib/format'
import { useAuth } from '../lib/AuthContext'
import PageHeader from '../components/PageHeader'

const PERIODS = [
  { key: 'today', label: 'اليوم' },
  { key: 'week', label: 'آخر 7 أيام' },
]

export default function DashboardPage() {
  const { signOut } = useAuth()

  const [period, setPeriod] = useState('today')
  const [stats, setStats] = useState(undefined) // { revenue, units, topProducts }
  const [statsError, setStatsError] = useState(null)

  const [lowStock, setLowStock] = useState(undefined)
  const [lowStockError, setLowStockError] = useState(null)

  useEffect(() => {
    let cancelled = false
    setStats(undefined)
    setStatsError(null)

    const since = period === 'today' ? startOfToday() : sevenDaysAgo()

    fetchSalesSince(since)
      .then((sales) => {
        if (cancelled) return
        setStats(summarizeSales(sales))
      })
      .catch((err) => {
        if (!cancelled) setStatsError(err)
      })

    return () => {
      cancelled = true
    }
  }, [period])

  useEffect(() => {
    let cancelled = false
    fetchLowStockProducts()
      .then((data) => {
        if (!cancelled) setLowStock(data)
      })
      .catch((err) => {
        if (!cancelled) setLowStockError(err)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const maxUnits = stats?.topProducts?.[0]?.units || 1

  return (
    <div className="page">
      <PageHeader title="لوحة التحكم" />

      <div className="dashboard-hero">
        <div className="row-between">
          <h3>أداء محلك</h3>
          <div className="period-toggle">
            {PERIODS.map((p) => (
              <button
                key={p.key}
                type="button"
                className={'period-pill' + (period === p.key ? ' active' : '')}
                onClick={() => setPeriod(p.key)}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {statsError && <p className="hero-error">تعذّر تحميل الإحصائيات.</p>}

        {!statsError && (
          <div className="dashboard-stats">
            <div className="stat">
              <span className="stat-value num">{stats ? formatPrice(stats.revenue) : '—'}</span>
              <span className="stat-label">د.م. الإيرادات</span>
            </div>
            <div className="stat">
              <span className="stat-value num">{stats ? stats.units : '—'}</span>
              <span className="stat-label">وحدة مباعة</span>
            </div>
            <div className="stat">
              <span className="stat-value num">{lowStock ? lowStock.length : '—'}</span>
              <span className="stat-label">نقص مخزون</span>
            </div>
          </div>
        )}
      </div>

      <section className="dashboard-section">
        <h3>الأكثر مبيعاً</h3>

        {stats === undefined && !statsError && (
          <div className="loading-screen" style={{ minHeight: 120 }}>
            <div className="spinner" />
          </div>
        )}

        {stats && stats.topProducts.length === 0 && (
          <p className="muted small">لا توجد مبيعات بعد في هذه الفترة.</p>
        )}

        {stats && stats.topProducts.length > 0 && (
          <ul className="stack-sm top-sellers-list">
            {stats.topProducts.map((p) => (
              <li key={p.name} className="top-seller-row">
                <div className="row-between">
                  <span className="truncate">{p.name}</span>
                  <span className="num small muted">{p.units} وحدة</span>
                </div>
                <div className="progress-track">
                  <div className="progress-fill" style={{ width: `${Math.max(6, (p.units / maxUnits) * 100)}%` }} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="dashboard-section">
        <h3>يحتاج إعادة تخزين</h3>

        {lowStock === undefined && !lowStockError && (
          <div className="loading-screen" style={{ minHeight: 100 }}>
            <div className="spinner" />
          </div>
        )}

        {lowStockError && <p className="muted small">تعذّر تحميل قائمة النقص.</p>}

        {lowStock && lowStock.length === 0 && (
          <div className="alert alert-info">👍 لا يوجد نقص في المخزون حالياً.</div>
        )}

        {lowStock && lowStock.length > 0 && (
          <ul className="stack-sm">
            {lowStock.map((p) => (
              <li key={p.id} className="card restock-row row-between">
                <span className="row">
                  <span className="restock-warn" aria-hidden="true">⚠️</span>
                  <span className="truncate">
                    {p.name} <span className="muted small">({p.stock_qty} قطعة)</span>
                  </span>
                </span>
                <Link to={`/stock/${p.id}/edit`} className="btn btn-sm restock-btn">
                  تحديث
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <button className="btn btn-ghost btn-block" onClick={signOut} style={{ color: 'var(--text-muted)', marginTop: 8 }}>
        تسجيل الخروج
      </button>
    </div>
  )
}
