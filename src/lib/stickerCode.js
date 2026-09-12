/**
 * لمنتجات الإكسسوارات التي لا تملك باركوداً حقيقياً من المصنع: نولّد رمزاً
 * داخلياً فريداً خاصاً بهذا المحل، يُطبَع كملصق QR ويُستعمل بنفس طريقة أي
 * باركود عادي (نفس عمود barcode، نفس الماسح).
 */
export function generateStickerCode(storeId) {
  const storePart = storeId.replace(/-/g, '').slice(0, 6).toUpperCase()
  const randomPart = Math.random().toString(36).slice(2, 8).toUpperCase()
  return `STK-${storePart}-${randomPart}`
}
