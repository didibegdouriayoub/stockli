/** يُنسّق الأسعار بفواصل الآلاف مع إبقاء الأرقام بترتيب LTR صحيح (يُستعمل مع className="num"). */
export function formatPrice(value) {
  const n = Number(value)
  if (Number.isNaN(n)) return '0'
  return n.toLocaleString('en-US', { maximumFractionDigits: 2 })
}
