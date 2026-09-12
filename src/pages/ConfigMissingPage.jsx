/** تُعرض إذا لم يُملأ ملف .env بعد — بدل شاشة بيضاء أو خطأ تقني مخيف. */
export default function ConfigMissingPage() {
  return (
    <div className="page page-narrow center" style={{ paddingTop: '20vh' }}>
      <div className="empty">
        <div className="empty-icon">⚙️</div>
        <h3>الإعداد غير مكتمل</h3>
        <p className="muted">
          انسخ ملف <code>.env.example</code> إلى <code>.env</code> في مجلد المشروع، واملأ فيه مفاتيح
          مشروع Supabase الخاص بك، ثم أعد تشغيل الخادم.
        </p>
      </div>
    </div>
  )
}
