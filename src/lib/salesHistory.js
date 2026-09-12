import { supabase } from './supabaseClient'

/** يجلب صفحة من سجل المبيعات (الأحدث أولاً)، مع تصفية اختيارية بتاريخ بداية. */
export async function fetchSalesPage({ sinceIso, offset = 0, limit = 25 }) {
  let query = supabase
    .from('sales')
    .select('id, product_id, product_name, quantity, sale_price, sold_at')
    .order('sold_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (sinceIso) query = query.gte('sold_at', sinceIso)

  const { data, error } = await query
  if (error) throw error
  return data ?? []
}
