import { supabase } from './supabaseClient'

/**
 * ⚠️ كل الدوال هنا تعمل فقط على النسخة المنشورة على Cloudflare — لا يوجد
 * Worker مكافئ في npm run dev المحلي، لذا ستفشل هذه الطلبات أثناء التطوير
 * المحلي (404).
 */
async function callAdminApi(path, body) {
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) throw new Error('يجب تسجيل الدخول.')

  const res = await fetch(path, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify(body),
  })

  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || 'فشل تنفيذ الإجراء.')
  return data
}

/**
 * إعادة تعيين كلمة مرور صاحب محل — لا يمكن أن يتم هذا عبر RLS العادية (كلمات
 * المرور في auth.users، خارج متناول أي مستخدم مهما كانت صلاحياته). يستدعي
 * دالة على Cloudflare Worker تملك مفتاح service_role بشكل خاص من طرف الخادم فقط.
 */
export async function resetStorePassword(storeOwnerId, newPassword) {
  return callAdminApi('/api/admin/reset-password', { storeOwnerId, newPassword })
}

/**
 * حذف محل نهائياً (مع كل منتجاته ومبيعاته — لا يمكن التراجع). يحذف حساب
 * الدخول الخاص بصاحب المحل عبر Admin API؛ بقية بياناته تُحذف تلقائياً معه
 * بفضل "on delete cascade" في قاعدة البيانات.
 */
export async function deleteStoreAccount(storeOwnerId) {
  return callAdminApi('/api/admin/delete-store', { storeOwnerId })
}
