import { useStore } from '../lib/StoreContext'
import { getSubscriptionStatus } from '../lib/subscription'

/**
 * تنبيه لطيف (وليس قفلاً) يظهر فقط عندما تقترب التجربة/الاشتراك من الانتهاء
 * أو ينتهي فعلاً. لا يمنع أي استعمال للتطبيق.
 */
export default function SubscriptionBanner() {
  const { store } = useStore()
  if (!store) return null

  const status = getSubscriptionStatus(store)
  if (status.state === 'ok' || status.state === 'unknown') return null

  const lapsed = status.state === 'lapsed'
  const what = status.isPaid ? 'اشتراكك' : 'فترتك التجريبية المجانية'

  let message
  if (lapsed) {
    message = `انتهت ${what}. تواصل معنا لتفعيل الدفع ومواصلة استعمال التطبيق.`
  } else if (status.daysLeft <= 0) {
    message = `تنتهي ${what} اليوم.`
  } else {
    message = `تنتهي ${what} خلال ${status.daysLeft} ${status.daysLeft === 1 ? 'يوم' : 'أيام'}.`
  }

  return (
    <div className={'subscription-banner' + (lapsed ? ' lapsed' : '')}>
      <span aria-hidden="true">{lapsed ? '⛔' : '⏳'}</span>
      <span>{message}</span>
    </div>
  )
}
