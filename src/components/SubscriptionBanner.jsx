import { useStore } from '../lib/StoreContext'
import { getSubscriptionStatus } from '../lib/subscription'
import { supportWhatsappLink } from '../lib/contact'

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
    message = `انتهت ${what}.`
  } else if (status.daysLeft <= 0) {
    message = `تنتهي ${what} اليوم.`
  } else {
    message = `تنتهي ${what} خلال ${status.daysLeft} ${status.daysLeft === 1 ? 'يوم' : 'أيام'}.`
  }

  const waLink = supportWhatsappLink(`مرحباً، محلي "${store.name}" — أريد تجديد الاشتراك.`)

  return (
    <div className={'subscription-banner' + (lapsed ? ' lapsed' : '')}>
      <span aria-hidden="true">{lapsed ? '⛔' : '⏳'}</span>
      <span>{message}</span>
      <a href={waLink} target="_blank" rel="noreferrer" className="subscription-banner-link">
        💬 تواصل معنا للدفع
      </a>
    </div>
  )
}
