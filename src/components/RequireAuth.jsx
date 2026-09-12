import { Navigate } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'
import { useStore } from '../lib/StoreContext'
import LoadingScreen from './LoadingScreen'

/** يحمي الصفحات: يوجّه لشاشة الدخول إن لم يكن هناك مستخدم، وينتظر جلب المحل. */
export default function RequireAuth({ children }) {
  const { user, loading: authLoading } = useAuth()

  if (authLoading) return <LoadingScreen />
  if (!user) return <Navigate to="/auth" replace />

  return <WaitForStore>{children}</WaitForStore>
}

function WaitForStore({ children }) {
  const { store, loading, error } = useStore()

  if (loading) return <LoadingScreen />

  if (error || !store) {
    return (
      <div className="page center stack">
        <div className="alert alert-danger">
          تعذّر تحميل بيانات محلك. تأكد من اتصالك بالإنترنت وأعد المحاولة.
        </div>
        <button className="btn btn-primary" onClick={() => window.location.reload()}>
          إعادة المحاولة
        </button>
      </div>
    )
  }

  return children
}
