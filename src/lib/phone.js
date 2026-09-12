/**
 * هوية الدخول في ستوكلي هي رقم الهاتف، لكن Supabase Auth (email+password) يحتاج
 * بريداً إلكترونياً. الحل: نحوّل رقم الهاتف إلى بريد وهمي ثابت الشكل
 * (0612345678@stockli.app) ونستعمله داخلياً فقط — المستخدم لا يراه أبداً.
 */

const FAKE_EMAIL_DOMAIN = 'stockli.app'

/**
 * ينظّف وي‌تحقق من رقم هاتف مغربي، ويُرجعه بصيغة موحّدة 0XXXXXXXXX (10 أرقام).
 * يقبل: 0612345678 / 06 12 34 56 78 / +212612345678 / 00212612345678
 * يُرجع null إن كان الرقم غير صالح.
 */
export function normalizeMoroccanPhone(raw) {
  if (!raw) return null

  let digits = raw.trim().replace(/[\s.-]/g, '')

  if (digits.startsWith('+212')) digits = '0' + digits.slice(4)
  else if (digits.startsWith('00212')) digits = '0' + digits.slice(5)
  else if (digits.startsWith('212') && digits.length === 12) digits = '0' + digits.slice(3)

  digits = digits.replace(/\D/g, '')

  // الهواتف المحمولة في المغرب: تبدأ بـ 06 أو 07، ثم 8 أرقام أخرى (10 أرقام إجمالاً)
  if (!/^0[67]\d{8}$/.test(digits)) return null

  return digits
}

export function phoneToFakeEmail(phone) {
  return `${phone}@${FAKE_EMAIL_DOMAIN}`
}

/** يُظهر الرقم بشكل مقروء: 06 12 34 56 78 */
export function formatPhoneDisplay(phone) {
  if (!phone) return ''
  return phone.replace(/^(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})$/, '$1 $2 $3 $4 $5')
}
