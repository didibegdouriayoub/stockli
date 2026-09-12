import { Navigate } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'
import LoadingScreen from './LoadingScreen'

/** يمنع مستخدماً مسجَّل الدخول من رؤية شاشة الدخول مرة أخرى. */
export default function PublicOnly({ children }) {
  const { user, loading } = useAuth()

  if (loading) return <LoadingScreen />
  if (user) return <Navigate to="/" replace />

  return children
}
