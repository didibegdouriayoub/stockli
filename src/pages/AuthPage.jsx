import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { normalizeMoroccanPhone, phoneToFakeEmail } from '../lib/phone'
import { translateAuthError } from '../lib/authErrors'

const MODE_LOGIN = 'login'
const MODE_SIGNUP = 'signup'

export default function AuthPage() {
  const [mode, setMode] = useState(MODE_LOGIN)
  const [storeName, setStoreName] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [fieldErrors, setFieldErrors] = useState({})
  const [formError, setFormError] = useState('')

  const isSignup = mode === MODE_SIGNUP

  function validate() {
    const errors = {}
    if (isSignup && storeName.trim().length < 2) {
      errors.storeName = 'اكتب اسم المحل (حرفان على الأقل).'
    }
    const normalizedPhone = normalizeMoroccanPhone(phone)
    if (!normalizedPhone) {
      errors.phone = 'رقم الهاتف غير صحيح. مثال: 0612345678'
    }
    if (password.length < 6) {
      errors.password = 'كلمة المرور يجب أن تكون 6 أحرف/أرقام على الأقل.'
    }
    return { errors, normalizedPhone }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setFormError('')

    const { errors, normalizedPhone } = validate()
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) return

    setSubmitting(true)
    const email = phoneToFakeEmail(normalizedPhone)

    const { error } = isSignup
      ? await supabase.auth.signUp({
          email,
          password,
          options: { data: { store_name: storeName.trim() } },
        })
      : await supabase.auth.signInWithPassword({ email, password })

    setSubmitting(false)

    if (error) {
      setFormError(translateAuthError(error))
      return
    }
    // النجاح: AuthProvider سيلتقط تغيّر الجلسة تلقائياً ويُعاد توجيه المستخدم
    // من App.jsx — لا حاجة لأي تنقّل يدوي هنا.
  }

  function switchMode(nextMode) {
    setMode(nextMode)
    setFieldErrors({})
    setFormError('')
  }

  return (
    <div className="page page-narrow auth-page">
      <div className="auth-brand">
        <div className="auth-logo" aria-hidden="true">
          <img src="/icons/icon.svg" alt="" width="40" height="40" />
        </div>
        <h1 className="auth-title">ستوكلي</h1>
        <p className="muted">إدارة المبيعات والمخزون ببساطة</p>
      </div>

      <form className="card auth-card stack" onSubmit={handleSubmit} noValidate>
        <h2>{isSignup ? 'إنشاء حساب' : 'تسجيل الدخول'}</h2>

        {isSignup && (
          <div className="field">
            <label htmlFor="storeName">اسم المحل</label>
            <input
              id="storeName"
              className="input"
              type="text"
              placeholder="مثال: متجر الهاتف الذكي"
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
              autoComplete="organization"
            />
            {fieldErrors.storeName && <p className="field-error">{fieldErrors.storeName}</p>}
          </div>
        )}

        <div className="field">
          <label htmlFor="phone">رقم الهاتف</label>
          <input
            id="phone"
            className="input"
            type="tel"
            inputMode="numeric"
            placeholder="06XXXXXXXX"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            autoComplete="tel"
            dir="ltr"
          />
          {fieldErrors.phone && <p className="field-error">{fieldErrors.phone}</p>}
        </div>

        <div className="field">
          <label htmlFor="password">كلمة المرور</label>
          <div className="password-row">
            <input
              id="password"
              className="input"
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={isSignup ? 'new-password' : 'current-password'}
            />
            <button
              type="button"
              className="btn btn-ghost password-toggle"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
            >
              {showPassword ? '🙈' : '👁'}
            </button>
          </div>
          {fieldErrors.password && <p className="field-error">{fieldErrors.password}</p>}
        </div>

        {formError && <div className="alert alert-danger">{formError}</div>}

        <button type="submit" className="btn btn-primary btn-lg btn-block" disabled={submitting}>
          {submitting ? 'جارٍ التحقق...' : isSignup ? 'ابدأ الآن' : 'دخول'}
        </button>
      </form>

      <p className="center small muted auth-switch">
        {isSignup ? (
          <>
            لديك حساب؟{' '}
            <button type="button" className="link-btn" onClick={() => switchMode(MODE_LOGIN)}>
              سجّل الدخول
            </button>
          </>
        ) : (
          <>
            ليس لديك حساب؟{' '}
            <button type="button" className="link-btn" onClick={() => switchMode(MODE_SIGNUP)}>
              أنشئ محلك الآن
            </button>
          </>
        )}
      </p>
    </div>
  )
}
