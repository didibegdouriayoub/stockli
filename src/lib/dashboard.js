import { supabase } from './supabaseClient'

function startOfDaysAgo(daysAgo) {
  const d = new Date()
  d.setDate(d.getDate() - daysAgo)
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}

/** بداية اليوم الحالي (00:00). */
export function startOfToday() {
  return startOfDaysAgo(0)
}

/** بداية اليوم قبل 6 أيام — نافذة متحركة من 7 أيام تشمل اليوم الحالي. */
export function sevenDaysAgo() {
  return startOfDaysAgo(6)
}

/** يجلب كل عمليات البيع منذ تاريخ معيّن (RLS يحصرها في محل المستخدم تلقائياً). */
export async function fetchSalesSince(sinceIso) {
  const { data, error } = await supabase
    .from('sales')
    .select('product_id, product_name, quantity, sale_price, sold_at')
    .gte('sold_at', sinceIso)

  if (error) throw error
  return data ?? []
}

/** يُلخّص قائمة مبيعات: الإيرادات، عدد الوحدات، وأكثر المنتجات مبيعاً. */
export function summarizeSales(sales) {
  let revenue = 0
  let units = 0
  const byProduct = new Map()

  for (const s of sales) {
    revenue += Number(s.sale_price) * s.quantity
    units += s.quantity

    const key = s.product_id ?? s.product_name
    const entry = byProduct.get(key) ?? { name: s.product_name, units: 0 }
    entry.units += s.quantity
    byProduct.set(key, entry)
  }

  const topProducts = [...byProduct.values()].sort((a, b) => b.units - a.units).slice(0, 5)

  return { revenue, units, topProducts }
}

/** يجلب المنتجات التي وصلت كميتها لحد التنبيه أو أقل. */
export async function fetchLowStockProducts() {
  const { data, error } = await supabase
    .from('products')
    .select('id, name, stock_qty, low_stock_threshold')
    .order('stock_qty', { ascending: true })

  if (error) throw error
  return (data ?? []).filter((p) => p.stock_qty <= p.low_stock_threshold)
}
