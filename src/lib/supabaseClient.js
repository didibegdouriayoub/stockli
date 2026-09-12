import { createClient } from '@supabase/supabase-js'

/**
 * الاتصال بقاعدة البيانات (Supabase).
 *
 * المفاتيح تُقرأ من ملف .env في جذر المشروع.
 * ملاحظة مهمة: أي متغيّر يبدأ بـ VITE_ يصبح مرئياً في المتصفح — وهذا عادي هنا،
 * لأن anon key مُصمَّم ليكون عمومياً. الحماية الحقيقية تأتي من RLS في قاعدة البيانات،
 * وليس من إخفاء المفتاح. لا تضع أبداً service_role key هنا.
 */
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)

if (!isSupabaseConfigured) {
  console.error(
    '[ستوكلي] المفاتيح ناقصة. انسخ .env.example إلى .env واملأ ' +
      'VITE_SUPABASE_URL و VITE_SUPABASE_ANON_KEY، ثم أعد تشغيل npm run dev.'
  )
}

// عنوان وهمي صالح الشكل فقط: يمنع createClient من رمي استثناء ويُسقط التطبيق
// كاملاً قبل أن نتمكن من عرض شاشة "الإعداد ناقص" الودية في App.jsx.
export const supabase = createClient(supabaseUrl || 'https://placeholder.supabase.co', supabaseAnonKey || 'placeholder', {
  auth: {
    persistSession: true, // يبقى صاحب المحل مسجّل الدخول بعد إغلاق التطبيق
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})
