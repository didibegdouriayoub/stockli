import { useState } from 'react'

/** "كم قطعة استلمت؟" — يُستعمل بعد مسح باركود منتج معروف في شاشة المخزون. */
export default function RestockDialog({ productName, currentQty, busy, onConfirm, onCancel }) {
  const [amount, setAmount] = useState(1)

  function inc(delta) {
    setAmount((v) => Math.max(1, v + delta))
  }

  return (
    <div className="dialog-overlay" role="dialog" aria-modal="true" aria-label="إعادة تخزين">
      <div className="dialog-card">
        <div className="dialog-icon" aria-hidden="true">
          📦
        </div>
        <h3 className="center">{productName}</h3>
        <p className="muted center small">الكمية الحالية: {currentQty} قطعة</p>
        <p className="center" style={{ fontWeight: 700, marginTop: 6 }}>
          كم قطعة استلمت؟
        </p>

        <div className="stepper" style={{ justifyContent: 'center' }}>
          <button type="button" onClick={() => inc(-1)} aria-label="إنقاص">
            −
          </button>
          <input
            className="input"
            type="number"
            inputMode="numeric"
            min="1"
            value={amount}
            onChange={(e) => setAmount(Math.max(1, Number(e.target.value) || 1))}
            style={{ maxWidth: 90 }}
          />
          <button type="button" onClick={() => inc(1)} aria-label="زيادة">
            +
          </button>
        </div>

        <div className="row dialog-actions">
          <button type="button" className="btn btn-secondary grow" onClick={onCancel} disabled={busy}>
            إلغاء
          </button>
          <button type="button" className="btn btn-primary grow" onClick={() => onConfirm(amount)} disabled={busy}>
            {busy ? '...' : 'تأكيد'}
          </button>
        </div>
      </div>
    </div>
  )
}
