// أسماء الأشهر بالدارجة المغربية (كما تُكتب وتُقرأ عادة في المغرب)
const MONTHS_MA = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'ماي', 'يونيو',
  'يوليوز', 'غشت', 'شتنبر', 'أكتوبر', 'نونبر', 'دجنبر',
]

function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

/** "اليوم" / "أمس" / "12 شتنبر 2026" — بأرقام غربية دائماً بغضّ النظر عن إعدادات الجهاز. */
export function dayLabel(isoString) {
  const d = new Date(isoString)
  const now = new Date()
  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)

  if (isSameDay(d, now)) return 'اليوم'
  if (isSameDay(d, yesterday)) return 'أمس'
  return `${d.getDate()} ${MONTHS_MA[d.getMonth()]} ${d.getFullYear()}`
}

/** "12 شتنبر 2026" — تاريخ مطلق دائماً (بخلاف dayLabel، لا يستعمل "اليوم/أمس"). */
export function absoluteDateLabel(isoString) {
  if (!isoString) return '—'
  const d = new Date(isoString)
  return `${d.getDate()} ${MONTHS_MA[d.getMonth()]} ${d.getFullYear()}`
}

/** "٣:٤٥ م" بصيغة 12 ساعة بأرقام غربية — أسهل قراءة لغير المتخصصين من 24 ساعة. */
export function timeLabel(isoString) {
  const d = new Date(isoString)
  const hours = d.getHours()
  const minutes = d.getMinutes()
  const period = hours < 12 ? 'ص' : 'م'
  const hours12 = hours % 12 === 0 ? 12 : hours % 12
  return `${hours12}:${String(minutes).padStart(2, '0')} ${period}`
}
