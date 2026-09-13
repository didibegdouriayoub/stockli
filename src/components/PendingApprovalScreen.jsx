import { useAuth } from '../lib/AuthContext'
import { supportWhatsappLink } from '../lib/contact'

/** يُعرض لمحل جديد لم يوافق عليه المشرف بعد — قفل مؤقت، والتجربة المجانية لم تبدأ بعد. */
export default function PendingApprovalScreen() {
  const { signOut } = useAuth()

  return (
    <div className="page page-narrow center" style={{ paddingTop: '18vh' }}>
      <div className="empty">
        <div className="empty-icon">⏳</div>
        <h3>حسابك قيد المراجعة</h3>
        <p className="muted">
          سيتم تفعيل حسابك قريباً. تبدأ فترة التجربة المجانية (يومين) بمجرد التفعيل.
        </p>
        <a href={supportWhatsappLink('مرحباً، حسابي في ستوكلي بانتظار التفعيل.')} target="_blank" rel="noreferrer" className="btn btn-primary">
          💬 تواصل معنا
        </a>
        <button className="btn btn-ghost" onClick={signOut}>
          تسجيل الخروج
        </button>
      </div>
    </div>
  )
}
