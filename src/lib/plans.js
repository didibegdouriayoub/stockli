export const PLANS = [
  { key: 'monthly', label: 'شهر واحد', months: 1, price: 150 },
  { key: 'six_months', label: '6 أشهر', months: 6, price: 600 },
  { key: 'yearly', label: 'سنة كاملة', months: 12, price: 1000 },
]

export function planLabel(planKey) {
  return PLANS.find((p) => p.key === planKey)?.label ?? 'تجربة مجانية'
}
