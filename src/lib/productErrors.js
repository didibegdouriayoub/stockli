export function translateProductError(err) {
  const msg = (err?.message || '').toLowerCase()

  if (err?.code === '23505' || msg.includes('duplicate') || msg.includes('unique')) {
    return 'هذا الباركود مستعمل من قبل لمنتج آخر في محلك. امسح باركوداً مختلفاً أو اتركه فارغاً.'
  }
  if (msg.includes('failed to fetch') || msg.includes('network')) {
    return 'تعذّر الاتصال بالإنترنت. تحقق من الاتصال وحاول مرة أخرى.'
  }
  return 'تعذّر حفظ المنتج. حاول مرة أخرى.'
}
