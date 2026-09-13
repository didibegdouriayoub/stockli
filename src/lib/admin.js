import { supabase } from './supabaseClient'
import { PLANS } from './plans'

/** يتحقق إن كان المستخدم الحالي مشرفاً (يقرأ فقط صفّه الخاص في admins، مسموح به عبر RLS). */
export async function checkIsAdmin(userId) {
  if (!userId) return false
  const { data } = await supabase.from('admins').select('user_id').eq('user_id', userId).maybeSingle()
  return Boolean(data)
}

/** يجلب كل المحلات (تسمح به سياسة RLS الخاصة بالمشرف فقط). */
export async function fetchAllStoresForAdmin() {
  const { data, error } = await supabase
    .from('stores')
    .select('id, name, phone, owner_id, created_at, trial_ends_at, paid_until, suspended, plan')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data ?? []
}

export async function setStoreSuspended(storeId, suspended) {
  const { error } = await supabase.from('stores').update({ suspended }).eq('id', storeId)
  if (error) throw error
}

/**
 * يجدّد اشتراك محل بخطة معيّنة: يمدّد paid_until بعدد أشهر الخطة من الأبعد بين
 * اليوم و paid_until الحالي (لا يُضيّع أياماً مدفوعة مسبقاً لو جدّد مبكراً)،
 * ويسجّل الخطة الحالية على صف المحل.
 */
export async function renewStorePlan(store, planKey) {
  const plan = PLANS.find((p) => p.key === planKey)
  if (!plan) throw new Error('خطة غير معروفة')

  const now = new Date()
  const current = store.paid_until ? new Date(store.paid_until) : null
  const base = current && current > now ? current : now
  const next = new Date(base)
  next.setMonth(next.getMonth() + plan.months)

  const { error } = await supabase
    .from('stores')
    .update({ paid_until: next.toISOString(), plan: planKey })
    .eq('id', store.id)

  if (error) throw error
  return { paid_until: next.toISOString(), plan: planKey }
}
