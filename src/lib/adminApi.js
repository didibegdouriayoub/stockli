import { supabase } from './supabaseClient'

/**
 * إعادة تعيين كلمة مرور صاحب محل — لا يمكن أن يتم هذا عبر RLS العادية (كلمات
 * المرور في auth.users، خارج متناول أي مستخدم مهما كانت صلاحياته). يستدعي
 * دالة على Cloudflare Worker (نفس الموقع، المسار /api/admin/reset-password)
 * التي تملك مفتاح service_role بشكل خاص من طرف الخادم فقط.
 *
 * ⚠️ يعمل فقط على النسخة المنشورة على Cloudflare — لا يوجد Worker مكافئ في
 * npm run dev المحلي، لذا سيفشل هذا الطلب أثناء التطوير المحلي (404).
 */
export async function resetStorePassword(storeOwnerId, newPassword) {
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) throw new Error('يجب تسجيل الدخول.')

  const res = await fetch('/api/admin/reset-password', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ storeOwnerId, newPassword }),
  })

  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || 'فشل إعادة تعيين كلمة المرور.')
  return data
}
