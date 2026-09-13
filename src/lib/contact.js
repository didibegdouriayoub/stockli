// رقم واتساب المشرف (صاحب التطبيق) — يظهر لأصحاب المحلات للتواصل عند الحاجة (الدفع، مشاكل تقنية...)
export const SUPPORT_WHATSAPP_NUMBER = '212708528965'

export function supportWhatsappLink(message) {
  const base = `https://wa.me/${SUPPORT_WHATSAPP_NUMBER}`
  return message ? `${base}?text=${encodeURIComponent(message)}` : base
}
