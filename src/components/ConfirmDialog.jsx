/** نافذة تأكيد عامة — تُستعمل قبل أي إجراء لا يمكن التراجع عنه (حذف مثلاً). */
export default function ConfirmDialog({
  title,
  message,
  confirmLabel = 'تأكيد',
  cancelLabel = 'إلغاء',
  danger = true,
  busy = false,
  onConfirm,
  onCancel,
}) {
  return (
    <div className="dialog-overlay" role="dialog" aria-modal="true" aria-label={title}>
      <div className="dialog-card">
        <div className="dialog-icon" aria-hidden="true">
          ⚠️
        </div>
        <h3 className="center">{title}</h3>
        <p className="muted center">{message}</p>
        <div className="row dialog-actions">
          <button type="button" className="btn btn-secondary grow" onClick={onCancel} disabled={busy}>
            {cancelLabel}
          </button>
          <button
            type="button"
            className={'btn grow ' + (danger ? 'btn-danger' : 'btn-primary')}
            onClick={onConfirm}
            disabled={busy}
          >
            {busy ? '...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
