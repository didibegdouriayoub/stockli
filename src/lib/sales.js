import { supabase } from './supabaseClient'

/**
 * يسجّل بيع قطعة واحدة: ينقص المخزون أولاً بحارس تفاؤلي (WHERE stock_qty = ...)
 * يمنع بيع نفس القطعة مرتين لو ضُغط الزر بسرعة أو حصل مسح وبيع يدوي بالتزامن،
 * ثم يسجّل صف البيع. إن فشل تسجيل البيع بعد نجاح خصم المخزون، نُعيد المخزون
 * لقيمته السابقة حتى لا "تختفي" قطعة من المخزون بدون سبب.
 *
 * priceOverride اختياري: يُستعمل عندما يبيع صاحب المحل بسعر متّفق عليه مع
 * الزبون (المساومة شائعة جداً) بدل السعر المعروض. لا يُغيّر سعر المنتج نفسه،
 * فقط سعر هذه العملية بالذات.
 */
export async function sellOne(product, priceOverride) {
  const newQty = product.stock_qty - 1
  if (newQty < 0) {
    const err = new Error('نفدت الكمية')
    err.code = 'OUT_OF_STOCK'
    throw err
  }

  const { data: updated, error: updateError } = await supabase
    .from('products')
    .update({ stock_qty: newQty })
    .eq('id', product.id)
    .eq('stock_qty', product.stock_qty)
    .select('stock_qty')

  if (updateError) throw updateError
  if (!updated || updated.length === 0) {
    const err = new Error('تغيّرت الكمية للتو')
    err.code = 'STALE_STOCK'
    throw err
  }

  const salePrice =
    priceOverride != null ? priceOverride : product.is_on_offer && product.offer_price != null ? product.offer_price : product.price

  const { data: sale, error: saleError } = await supabase
    .from('sales')
    .insert({
      store_id: product.store_id,
      product_id: product.id,
      product_name: product.name,
      quantity: 1,
      sale_price: salePrice,
    })
    .select()
    .single()

  if (saleError) {
    // فشل تسجيل البيع رغم نجاح خصم المخزون: نتراجع حتى لا يختفي المخزون بدون بيع مسجَّل
    await supabase.from('products').update({ stock_qty: product.stock_qty }).eq('id', product.id)
    throw saleError
  }

  return { sale, newQty }
}

/** يُلغي بيعاً حديثاً (خلال ثوانٍ من توست "تراجع"): يحذف صف البيع ويُعيد المخزون لقيمته السابقة تماماً. */
export async function undoSale(saleId, productId, restoreQty) {
  await supabase.from('sales').delete().eq('id', saleId)
  await supabase.from('products').update({ stock_qty: restoreQty }).eq('id', productId)
}

/**
 * يُلغي أي عملية بيع من السجل (وليس بالضرورة حديثة). لا نعرف هنا "الكمية
 * السابقة" كما في التراجع الفوري، لذا نضيف كمية البيع إلى المخزون الحالي
 * للمنتج (أياً كان الآن)، ثم نحذف صف البيع. إن كان المنتج نفسه محذوفاً
 * (product_id فارغ)، نحذف صف البيع فقط دون لمس أي مخزون.
 */
export async function undoSaleFromHistory(sale) {
  if (sale.product_id) {
    const { data: product, error: fetchError } = await supabase
      .from('products')
      .select('stock_qty')
      .eq('id', sale.product_id)
      .maybeSingle()

    if (fetchError) throw fetchError

    if (product) {
      const { error: updateError } = await supabase
        .from('products')
        .update({ stock_qty: product.stock_qty + sale.quantity })
        .eq('id', sale.product_id)
      if (updateError) throw updateError
    }
  }

  const { error: deleteError } = await supabase.from('sales').delete().eq('id', sale.id)
  if (deleteError) throw deleteError
}
