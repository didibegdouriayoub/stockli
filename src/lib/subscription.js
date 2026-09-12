/**
 * يحسب حالة الاشتراك بمقارنة أبعد تاريخين: نهاية التجربة المجانية (trial_ends_at)
 * ونهاية الدفع اليدوي (paid_until) — أيهما أبعد في المستقبل هو الذي يحكم.
 * لا قفل صارم هنا أبداً؛ فقط حالة تُستعمل لعرض تنبيه لطيف.
 */
export function getSubscriptionStatus(store) {
  const now = new Date()
  const trialEnds = store?.trial_ends_at ? new Date(store.trial_ends_at) : null
  const paidUntil = store?.paid_until ? new Date(store.paid_until) : null

  let effectiveUntil = null
  let isPaid = false

  if (paidUntil && (!trialEnds || paidUntil > trialEnds)) {
    effectiveUntil = paidUntil
    isPaid = true
  } else if (trialEnds) {
    effectiveUntil = trialEnds
    isPaid = false
  } else if (paidUntil) {
    effectiveUntil = paidUntil
    isPaid = true
  }

  if (!effectiveUntil) {
    return { state: 'unknown', isPaid: false, daysLeft: null, effectiveUntil: null }
  }

  const msLeft = effectiveUntil.getTime() - now.getTime()
  const daysLeft = Math.ceil(msLeft / 86400000)

  if (msLeft < 0) return { state: 'lapsed', isPaid, daysLeft, effectiveUntil }
  if (daysLeft <= 3) return { state: 'ending', isPaid, daysLeft, effectiveUntil }
  return { state: 'ok', isPaid, daysLeft, effectiveUntil }
}
