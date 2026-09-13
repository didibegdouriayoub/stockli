// ============================================================================
// Cloudflare Worker — الجزء الوحيد من التطبيق الذي يعمل على خادم (وليس في
// المتصفح). كل ما عدا هذا الملف هو موقع ثابت (React مبني) يُقدَّم مباشرة.
//
// لماذا نحتاج خادماً هنا أصلاً؟ إعادة تعيين كلمة مرور صاحب محل من طرف المشرف
// يتطلّب مفتاح service_role الخاص بـ Supabase (وصول كامل، يتجاوز RLS). هذا
// المفتاح خطير جداً ليُستعمل من المتصفح مباشرة (أي شخص يفتح أدوات المطوّر
// سيراه). لذا يبقى هنا فقط، كسرّ على Cloudflare، ولا يصل أبداً لكود React.
// ============================================================================

export default {
  async fetch(request, env) {
    const url = new URL(request.url)

    if (url.pathname === '/api/admin/reset-password' && request.method === 'POST') {
      return handleResetPassword(request, env)
    }

    // أي طلب آخر: قدّم الموقع الثابت (React) كالمعتاد
    return env.ASSETS.fetch(request)
  },
}

async function handleResetPassword(request, env) {
  const authHeader = request.headers.get('Authorization') || ''
  const callerToken = authHeader.replace(/^Bearer\s+/i, '')
  if (!callerToken) return json({ error: 'يجب تسجيل الدخول.' }, 401)

  let body
  try {
    body = await request.json()
  } catch {
    return json({ error: 'طلب غير صالح.' }, 400)
  }

  const { storeOwnerId, newPassword } = body || {}
  if (!storeOwnerId || !newPassword || newPassword.length < 6) {
    return json({ error: 'بيانات ناقصة أو كلمة مرور قصيرة جداً.' }, 400)
  }

  // 1) تحقّق من هوية المتَّصل عبر رمزه الخاص (لا نثق بأي "أنا مشرف" يُرسَل من العميل)
  const whoRes = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, {
    headers: {
      apikey: env.SUPABASE_ANON_KEY,
      Authorization: `Bearer ${callerToken}`,
    },
  })
  if (!whoRes.ok) return json({ error: 'جلسة غير صالحة.' }, 401)
  const caller = await whoRes.json()

  // 2) تحقّق أنه فعلاً مشرف (فحص داخلي آمن عبر service_role، يتجاوز RLS)
  const adminCheckRes = await fetch(`${env.SUPABASE_URL}/rest/v1/admins?user_id=eq.${caller.id}&select=user_id`, {
    headers: {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
    },
  })
  const adminRows = await adminCheckRes.json().catch(() => [])
  if (!Array.isArray(adminRows) || adminRows.length === 0) {
    return json({ error: 'غير مصرَّح لك بهذا الإجراء.' }, 403)
  }

  // 3) نفّذ إعادة التعيين فعلياً عبر Admin API الخاص بـ Supabase
  const updateRes = await fetch(`${env.SUPABASE_URL}/auth/v1/admin/users/${storeOwnerId}`, {
    method: 'PUT',
    headers: {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ password: newPassword }),
  })

  if (!updateRes.ok) {
    return json({ error: 'فشل تغيير كلمة المرور في Supabase.' }, 500)
  }

  return json({ success: true })
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}
