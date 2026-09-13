import { supabase } from './supabaseClient'

/** يجلب كل الباركودات البديلة (غير الرئيسي) للمنتجات في محل المستخدم الحالي. */
export async function fetchAltBarcodes() {
  const { data, error } = await supabase.from('product_barcodes').select('id, product_id, barcode')
  if (error) throw error
  return data ?? []
}

/**
 * يبحث عن منتج بأي باركود يخصّه — الرئيسي (products.barcode) أو أحد البدائل
 * (product_barcodes) — حتى يعمل المسح الضوئي بأي رمز مطبوع على القطعة.
 */
export function findProductByBarcode(products, altBarcodes, code) {
  const byPrimary = products.find((p) => p.barcode === code)
  if (byPrimary) return byPrimary

  const alt = altBarcodes.find((a) => a.barcode === code)
  if (!alt) return null
  return products.find((p) => p.id === alt.product_id) ?? null
}

/**
 * يتحقق إن كان باركود معيّن مستعملاً بالفعل (رئيسياً أو بديلاً) قبل ربطه
 * بمنتج، ويُرجع اسم المنتج الذي يستعمله حالياً إن وُجد.
 */
export async function findExistingProductByBarcode(code) {
  const { data: primary } = await supabase.from('products').select('id, name').eq('barcode', code).maybeSingle()
  if (primary) return primary

  const { data: alt } = await supabase
    .from('product_barcodes')
    .select('product_id, products:product_id (id, name)')
    .eq('barcode', code)
    .maybeSingle()

  return alt?.products ?? null
}

/** يجلب الباركودات البديلة الخاصة بمنتج واحد (لعرضها في صفحة تعديله). */
export async function fetchProductAltBarcodes(productId) {
  const { data, error } = await supabase
    .from('product_barcodes')
    .select('id, barcode')
    .eq('product_id', productId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data ?? []
}

/** يربط باركوداً إضافياً بمنتج موجود (بعد التأكد أنه غير مستعمل من طرف آخر). */
export async function addAltBarcode(storeId, productId, code) {
  const { data, error } = await supabase
    .from('product_barcodes')
    .insert({ store_id: storeId, product_id: productId, barcode: code })
    .select('id, barcode')
    .single()
  if (error) throw error
  return data
}

/** يحذف باركوداً بديلاً (لا يمسّ الباركود الرئيسي للمنتج). */
export async function deleteAltBarcode(id) {
  const { error } = await supabase.from('product_barcodes').delete().eq('id', id)
  if (error) throw error
}
