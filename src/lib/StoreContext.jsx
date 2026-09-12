import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from './supabaseClient'
import { useAuth } from './AuthContext'

const StoreContext = createContext(null)

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * يجلب صف "المحل" الخاص بالمستخدم المسجَّل دخوله. RLS يضمن أنه لن يحصل إلا على
 * محله هو (انظر supabase/migrations/…_rls_policies.sql).
 *
 * ملاحظة: صف المحل يُنشأ تلقائياً بواسطة trigger في قاعدة البيانات مباشرة بعد
 * التسجيل (انظر …_auto_create_store.sql)، لذا نضيف محاولات إعادة قصيرة فقط
 * احتياطاً لأي تأخير بسيط جداً.
 */
export function StoreProvider({ children }) {
  const { user } = useAuth()
  const [store, setStore] = useState(undefined) // undefined = لم يُجلب بعد
  const [error, setError] = useState(null)

  const fetchStore = useCallback(async () => {
    if (!user) {
      setStore(null)
      return
    }
    setError(null)

    for (let attempt = 0; attempt < 4; attempt++) {
      const { data, error: fetchError } = await supabase.from('stores').select('*').maybeSingle()

      if (fetchError) {
        setError(fetchError)
        setStore(null)
        return
      }
      if (data) {
        setStore(data)
        return
      }
      await sleep(400 * (attempt + 1)) // انتظار قصير متزايد قبل إعادة المحاولة
    }

    setError(new Error('تعذّر العثور على محلك. أعد تحميل الصفحة أو تواصل مع الدعم.'))
    setStore(null)
  }, [user])

  useEffect(() => {
    fetchStore()
  }, [fetchStore])

  const value = {
    store,
    loading: store === undefined,
    error,
    refresh: fetchStore,
  }

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore() {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore يجب أن يُستعمل داخل StoreProvider')
  return ctx
}
