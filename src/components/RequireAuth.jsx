import { Navigate } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'
import { useStore } from '../lib/StoreContext'
import LoadingScreen from './LoadingScreen'
import SuspendedScreen from './SuspendedScreen'

/**
 * يحمي الصفحات: يوجّه لشاشة الدخول إن لم يكن هناك مستخدم.
 *
 * ملاحظة مهمة للأداء: لا ننتظر هنا جلب صف "المحل" (StoreContext) قبل عرض
 * الصفحة. لو انتظرنا، كل فتح أول للتطبيق يصبح سلسلة طلبات متتالية (تحقّق من
 * الجلسة ← جلب المحل ← جلب المنتجات)، وهذا بطيء جداً على اتصال ضعيف. بما أن كل
 * صفحة تجلب بياناتها مباشرة عبر RLS (auth.uid())، لا حاجة فعلية لصف المحل قبل
 * عرضها — يكفي أن يكون المستخدم مسجَّل الدخول. صف المحل يُجلب بالتوازي، وأي
 * جزء يحتاجه فعلاً (مثل اسم المحل في PageHeader، أو حفظ منتج جديد) يتعامل مع
 * حالة "لم يصل بعد" بنفسه.
 *
 * التعليق (suspended): على العكس من ذلك هذا قفل صارم مقصود (تعليق يدوي من
 * المشرف)، لذا بمجرد وصول صف المحل ووجود suspended=true، نستبدل الصفحة بالكامل
 * بشاشة التعليق — نقبل ثانية واحدة من التأخر هنا لأنه إجراء نادر ومقصود.
 */
export default function RequireAuth({ children }) {
  const { user, loading: authLoading } = useAuth()
  const { store } = useStore()

  if (authLoading) return <LoadingScreen />
  if (!user) return <Navigate to="/auth" replace />
  if (store?.suspended) return <SuspendedScreen />

  return children
}
