/**
 * بحث عن منتج عبر باركوده في UPCitemdb (قاعدة بيانات باركودات عمومية مجانية).
 * نستعمل نقطة النهاية التجريبية (trial) التي لا تحتاج مفتاحاً؛ إن أضفت
 * VITE_UPCITEMDB_API_KEY في .env سنستعملها لرفع الحد المجاني لاحقاً.
 *
 * ملاحظة: هذا طلب من المتصفح مباشرة (بدون خادم وسيط). إن كانت هناك مشكلة شبكة
 * أو CORS، نتعامل مع الأمر بهدوء كأنه "لا نتيجة" بدل إظهار خطأ للمستخدم —
 * فهذا البحث اختياري وليس ضرورياً لإضافة المنتج يدوياً.
 */
const TRIAL_ENDPOINT = 'https://api.upcitemdb.com/prod/trial/lookup'

export async function lookupBarcode(code) {
  if (!code) return null

  try {
    const res = await fetch(`${TRIAL_ENDPOINT}?upc=${encodeURIComponent(code)}`, {
      headers: { Accept: 'application/json' },
    })
    if (!res.ok) return null

    const data = await res.json()
    const item = data?.items?.[0]
    if (!item) return null

    return {
      name: item.title?.trim() || '',
      brand: item.brand?.trim() || '',
      imageUrl: item.images?.[0] || null,
    }
  } catch {
    return null
  }
}
