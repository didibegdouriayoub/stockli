// رقم واتساب المشرف (صاحب التطبيق) — يظهر لأصحاب المحلات للتواصل عند الحاجة
// (الدفع، مشاكل تقنية...). 👈 TODO: استبدل هذا برقم حقيقي بصيغة دولية بدون +
// أو أصفار (مثال مغربي: "212612345678").
export const SUPPORT_WHATSAPP_NUMBER = '212600000000'

export function supportWhatsappLink(message) {
  const base = `https://wa.me/${SUPPORT_WHATSAPP_NUMBER}`
  return message ? `${base}?text=${encodeURIComponent(message)}` : base
}
