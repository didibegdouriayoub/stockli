import { useEffect, useRef, useState } from 'react'
import { fetchAllStoresForAdmin, setStoreSuspended, renewStorePlan, approveStore } from '../lib/admin'
import { resetStorePassword } from '../lib/adminApi'
import { getSubscriptionStatus } from '../lib/subscription'
import { formatPhoneDisplay } from '../lib/phone'
import { absoluteDateLabel } from '../lib/dateFormat'
import { formatPrice } from '../lib/format'
import { PLANS, planLabel } from '../lib/plans'
import { useAuth } from '../lib/AuthContext'

const STATUS_ORDER = { lapsed: 0, ending: 1, ok: 2, unknown: 3 }

function statusBadge(status) {
  if (status.state === 'lapsed') return { cls: 'badge-danger', text: 'منتهية' }
  if (status.state === 'ending') return { cls: 'badge-warn', text: `تنتهي خلال ${status.daysLeft} ${status.daysLeft === 1 ? 'يوم' : 'أيام'}` }
  if (status.state === 'ok') return { cls: 'badge-ok', text: status.isPaid ? 'مشترك' : 'تجربة سارية' }
  return { cls: 'badge-neutral', text: '—' }
}

export default function AdminStoresPage() {
  const { user, signOut } = useAuth()
  const [stores, setStores] = useState(undefined)
  const [error, setError] = useState(null)
  const [busyId, setBusyId] = useState(null)
  const [notice, setNotice] = useState(null)
  const [resetTarget, setResetTarget] = useState(null)
  const [renewTarget, setRenewTarget] = useState(null)
  const noticeTimerRef = useRef(null)

  async function load() {
    setError(null)
    try {
      const data = await fetchAllStoresForAdmin()
      setStores(data)
    } catch (err) {
      setError(err)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  async function handleToggleSuspend(store) {
    setBusyId(store.id)
    try {
      await setStoreSuspended(store.id, !store.suspended)
      setStores((prev) => prev.map((s) => (s.id === store.id ? { ...s, suspended: !store.suspended } : s)))
      showNotice('info', store.suspended ? `تم تفعيل محل "${store.name}" من جديد.` : `تم تعليق محل "${store.name}".`)
    } catch {
      showNotice('danger', 'تعذّر تنفيذ الإجراء. حاول مرة أخرى.')
    } finally {
      setBusyId(null)
    }
  }

  async function handleRenew(store, planKey) {
    setBusyId(store.id)
    try {
      const updated = await renewStorePlan(store, planKey)
      setStores((prev) => prev.map((s) => (s.id === store.id ? { ...s, ...updated } : s)))
      showNotice(
        'info',
        `تم تجديد اشتراك "${store.name}" (${planLabel(planKey)}) — ينتهي في ${absoluteDateLabel(updated.paid_until)}.`
      )
      setRenewTarget(null)
    } catch {
      showNotice('danger', 'تعذّر التجديد. حاول مرة أخرى.')
    } finally {
      setBusyId(null)
    }
  }

  async function handleApprove(store) {
    setBusyId(store.id)
    try {
      const trialEndsAt = await approveStore(store.id)
      setStores((prev) => prev.map((s) => (s.id === store.id ? { ...s, approved: true, trial_ends_at: trialEndsAt } : s)))
      showNotice('info', `تم قبول "${store.name}". تبدأ تجربته المجانية الآن، تنتهي في ${absoluteDateLabel(trialEndsAt)}.`)
    } catch {
      showNotice('danger', 'تعذّر القبول. حاول مرة أخرى.')
    } finally {
      setBusyId(null)
    }
  }

  // محل المشرف نفسه (يُنشأ تلقائياً كأي حساب جديد) ليس محلاً حقيقياً لزبون —
  // لا نعرضه في القائمة، وأهم من ذلك: لا نسمح بتعليقه (سيقفل المشرف نفسه خارج التطبيق).
  const realStores = (stores ?? []).filter((s) => s.owner_id !== user?.id)

  const pendingStores = realStores.filter((s) => !s.approved)
  const approvedStores = realStores.filter((s) => s.approved)

  const sorted = [...approvedStores].sort((a, b) => {
    const sa = getSubscriptionStatus(a)
    const sb = getSubscriptionStatus(b)
    return STATUS_ORDER[sa.state] - STATUS_ORDER[sb.state]
  })

  return (
    <div className="page">
      <header className="page-header">
        <div className="row-between">
          <span className="badge badge-neutral">لوحة المشرف</span>
          <button className="btn btn-ghost btn-sm" onClick={signOut}>
            خروج
          </button>
        </div>
        <h1>المحلات ({stores ? realStores.length : '...'})</h1>
      </header>

      {notice && <div className={'alert alert-' + notice.type} style={{ marginBottom: 12 }}>{notice.text}</div>}
      {error && <div className="alert alert-danger">تعذّر تحميل المحلات. حاول مرة أخرى.</div>}

      {stores === undefined && !error && (
        <div className="loading-screen" style={{ minHeight: '40vh' }}>
          <div className="spinner" />
        </div>
      )}

      {stores && realStores.length === 0 && (
        <div className="empty">
          <div className="empty-icon">🏪</div>
          <h3>لا توجد محلات بعد</h3>
        </div>
      )}

      {pendingStores.length > 0 && (
        <section style={{ marginBottom: 22 }}>
          <h3 style={{ marginBottom: 10 }}>🆕 بانتظار الموافقة ({pendingStores.length})</h3>
          <ul className="stack-sm">
            {pendingStores.map((store) => {
              const phoneDisplay = store.phone ? formatPhoneDisplay(store.phone) : '—'
              const waLink = store.phone ? `https://wa.me/212${store.phone.replace(/^0/, '')}` : null

              return (
                <li key={store.id} className="card admin-store-row pending">
                  <div className="row-between">
                    <span className="truncate admin-store-name">{store.name}</span>
                    <span className="badge badge-info">جديد</span>
                  </div>
                  <p className="muted small num" dir="ltr" style={{ textAlign: 'end' }}>
                    {phoneDisplay}
                  </p>
                  <div className="admin-actions">
                    {waLink && (
                      <a href={waLink} target="_blank" rel="noreferrer" className="btn btn-secondary btn-sm">
                        💬 واتساب
                      </a>
                    )}
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      disabled={busyId === store.id}
                      onClick={() => handleApprove(store)}
                    >
                      {busyId === store.id ? '...' : '✅ قبول'}
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        </section>
      )}

      {sorted.length > 0 && (
        <ul className="stack-sm">
          {sorted.map((store) => {
            const status = getSubscriptionStatus(store)
            const badge = statusBadge(status)
            const phoneDisplay = store.phone ? formatPhoneDisplay(store.phone) : '—'
            const waLink = store.phone ? `https://wa.me/212${store.phone.replace(/^0/, '')}` : null
            const endDate = store.paid_until || store.trial_ends_at

            return (
              <li key={store.id} className={'card admin-store-row' + (store.suspended ? ' suspended' : '')}>
                <div className="row-between">
                  <span className="truncate admin-store-name">{store.name}</span>
                  <span className={'badge ' + badge.cls}>{badge.text}</span>
                </div>
                <p className="muted small num" dir="ltr" style={{ textAlign: 'end' }}>
                  {phoneDisplay}
                </p>
                <div className="row-between admin-plan-row">
                  <span className="small">{planLabel(store.plan)}</span>
                  <span className="small num">ينتهي: {absoluteDateLabel(endDate)}</span>
                </div>
                {store.suspended && <p className="admin-suspended-tag">⛔ معلَّق يدوياً</p>}

                <div className="admin-actions">
                  {waLink && (
                    <a href={waLink} target="_blank" rel="noreferrer" className="btn btn-secondary btn-sm">
                      💬 واتساب
                    </a>
                  )}
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    disabled={busyId === store.id}
                    onClick={() => setRenewTarget(store)}
                  >
                    🔄 تجديد
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    disabled={busyId === store.id}
                    onClick={() => setResetTarget(store)}
                  >
                    🔑 كلمة المرور
                  </button>
                  <button
                    type="button"
                    className={'btn btn-sm ' + (store.suspended ? 'btn-primary' : 'btn-danger-soft')}
                    disabled={busyId === store.id}
                    onClick={() => handleToggleSuspend(store)}
                  >
                    {store.suspended ? '✅ تفعيل' : '⛔ تعليق'}
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {resetTarget && (
        <ResetPasswordDialog
          store={resetTarget}
          onClose={() => setResetTarget(null)}
          onDone={(msg) => {
            setResetTarget(null)
            showNotice('info', msg)
          }}
          onFail={(msg) => showNotice('danger', msg)}
        />
      )}

      {renewTarget && (
        <RenewDialog
          store={renewTarget}
          busy={busyId === renewTarget.id}
          onChoose={(planKey) => handleRenew(renewTarget, planKey)}
          onClose={() => setRenewTarget(null)}
        />
      )}
    </div>
  )
}

function ResetPasswordDialog({ store, onClose, onDone, onFail }) {
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const invalid = password.length < 6

  async function handleConfirm() {
    setBusy(true)
    try {
      await resetStorePassword(store.owner_id, password)
      onDone(`كلمة المرور الجديدة لـ "${store.name}": ${password} — أخبره بها.`)
    } catch (err) {
      onFail(err.message || 'تعذّر إعادة التعيين.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="dialog-overlay" role="dialog" aria-modal="true" aria-label="إعادة تعيين كلمة المرور">
      <div className="dialog-card">
        <div className="dialog-icon" aria-hidden="true">
          🔑
        </div>
        <h3 className="center truncate">{store.name}</h3>
        <p className="muted center small">اكتب كلمة مرور جديدة، ثم أخبر صاحب المحل بها هاتفياً.</p>
        <input
          className="input"
          type="text"
          dir="ltr"
          placeholder="كلمة مرور جديدة (6 أحرف على الأقل)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{ textAlign: 'center' }}
          autoFocus
        />
        <div className="row dialog-actions">
          <button type="button" className="btn btn-secondary grow" onClick={onClose} disabled={busy}>
            إلغاء
          </button>
          <button type="button" className="btn btn-primary grow" onClick={handleConfirm} disabled={busy || invalid}>
            {busy ? '...' : 'تأكيد'}
          </button>
        </div>
      </div>
    </div>
  )
}

function RenewDialog({ store, busy, onChoose, onClose }) {
  return (
    <div className="dialog-overlay" role="dialog" aria-modal="true" aria-label="تجديد الاشتراك">
      <div className="dialog-card">
        <div className="dialog-icon" aria-hidden="true">
          🔄
        </div>
        <h3 className="center truncate">{store.name}</h3>
        <p className="muted center small">اختر الخطة التي دفعها صاحب المحل:</p>

        <div className="stack-sm">
          {PLANS.map((plan) => (
            <button
              key={plan.key}
              type="button"
              className="btn btn-secondary btn-block plan-choice-btn"
              disabled={busy}
              onClick={() => onChoose(plan.key)}
            >
              <span>{plan.label}</span>
              <span className="num">{formatPrice(plan.price)} د.م.</span>
            </button>
          ))}
        </div>

        <button type="button" className="btn btn-ghost btn-block" onClick={onClose} disabled={busy}>
          إلغاء
        </button>
      </div>
    </div>
  )
}
