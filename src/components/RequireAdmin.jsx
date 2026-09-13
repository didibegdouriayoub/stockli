import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'
import { checkIsAdmin } from '../lib/admin'
import LoadingScreen from './LoadingScreen'

/** يحمي شاشة /admin: يسمح فقط لمستخدم موجود في جدول admins، وإلا يعيد التوجيه. */
export default function RequireAdmin({ children }) {
  const { user } = useAuth()
  const [status, setStatus] = useState('checking') // checking | admin | not-admin

  useEffect(() => {
    let cancelled = false
    checkIsAdmin(user?.id).then((isAdmin) => {
      if (!cancelled) setStatus(isAdmin ? 'admin' : 'not-admin')
    })
    return () => {
      cancelled = true
    }
  }, [user])

  if (status === 'checking') return <LoadingScreen />
  if (status === 'not-admin') return <Navigate to="/" replace />
  return children
}
