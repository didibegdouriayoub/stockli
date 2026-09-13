import { useAuth } from '../lib/AuthContext'

/** يُعرض بدل كل التطبيق لمحل عُلِّق يدوياً من طرف المشرف — قفل صارم، وليس تنبيهاً فقط. */
export default function SuspendedScreen() {
  const { signOut } = useAuth()

  return (
    <div className="page page-narrow center" style={{ paddingTop: '18vh' }}>
      <div className="empty">
        <div className="empty-icon">⛔</div>
        <h3>الحساب معلَّق مؤقتاً</h3>
        <p className="muted">تم تعليق الوصول لهذا الحساب. تواصل معنا لمعرفة السبب وإعادة التفعيل.</p>
        <button className="btn btn-secondary" onClick={signOut}>
          تسجيل الخروج
        </button>
      </div>
    </div>
  )
}
