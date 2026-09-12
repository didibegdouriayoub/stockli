import { Outlet } from 'react-router-dom'
import BottomNav from './BottomNav'
import SubscriptionBanner from './SubscriptionBanner'

/** الإطار العام لكل الشاشات المحمية: تنبيه الاشتراك + محتوى الصفحة + شريط التنقل السفلي. */
export default function AppShell() {
  return (
    <>
      <SubscriptionBanner />
      <Outlet />
      <BottomNav />
    </>
  )
}
