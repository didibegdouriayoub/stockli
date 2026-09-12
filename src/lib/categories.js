/** فئات المنتجات الثابتة لمحلات الهواتف والإكسسوارات. */
export const CATEGORIES = [
  { value: 'هواتف', label: 'هواتف', icon: '📱' },
  { value: 'إكسسوارات', label: 'إكسسوارات', icon: '🎧' },
  { value: 'أغطية', label: 'أغطية', icon: '🛡️' },
  { value: 'شواحن', label: 'شواحن', icon: '🔌' },
  { value: 'أخرى', label: 'أخرى', icon: '📦' },
]

export function categoryIcon(value) {
  return CATEGORIES.find((c) => c.value === value)?.icon ?? '📦'
}
