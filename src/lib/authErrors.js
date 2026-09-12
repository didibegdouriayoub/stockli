/**
 * Supabase يُرجع رسائل الأخطاء بالإنجليزية. نترجم الحالات الشائعة فقط إلى
 * عربية بسيطة، ونترك رسالة عامة لما لا نعرفه بدل عرض نص تقني مخيف للمستخدم.
 */
export function translateAuthError(error) {
  const msg = (error?.message || '').toLowerCase()

  if (msg.includes('invalid login credentials')) {
    return 'رقم الهاتف أو كلمة المرور غير صحيحة.'
  }
  if (msg.includes('user already registered') || msg.includes('already been registered')) {
    return 'هذا الرقم مسجَّل من قبل. جرّب تسجيل الدخول بدل إنشاء حساب جديد.'
  }
  if (msg.includes('password') && (msg.includes('at least') || msg.includes('short') || msg.includes('6 characters'))) {
    return 'كلمة المرور قصيرة جداً. يجب أن تكون 6 أحرف/أرقام على الأقل.'
  }
  if (msg.includes('email not confirmed')) {
    return 'الحساب غير مُفعَّل بعد. تواصل مع الدعم.'
  }
  if (msg.includes('rate limit') || msg.includes('too many requests')) {
    return 'محاولات كثيرة متتالية. انتظر قليلاً وحاول مرة أخرى.'
  }
  if (msg.includes('failed to fetch') || msg.includes('network')) {
    return 'تعذّر الاتصال بالإنترنت. تحقق من الاتصال وحاول مرة أخرى.'
  }

  return 'حدث خطأ غير متوقع. حاول مرة أخرى.'
}
