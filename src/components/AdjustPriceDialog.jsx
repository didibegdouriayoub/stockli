import { useState } from 'react'

/** يسمح بتحديد سعر مختلف عن السعر المعروض قبل تأكيد البيع (مساومة الزبون). */
export default function AdjustPriceDialog({ productName, defaultPrice, busy, onConfirm, onCancel }) {
  const [price, setPrice] = useState(String(defaultPrice))
  const numeric = Number(price)
  const invalid = price === '' || Number.isNaN(numeric) || numeric < 0

  return (
    <div className="dialog-overlay" role="dialog" aria-modal="true" aria-label="تعديل سعر البيع">
      <div className="dialog-card">
        <div className="dialog-icon" aria-hidden="true">
          💰
        </div>
        <h3 className="center truncate">{productName}</h3>
        <p className="muted center small">كم بعت هذه القطعة؟ (السعر المعروض: {defaultPrice} د.م.)</p>

        <input
          className="input"
          type="number"
          inputMode="decimal"
          min="0"
          step="0.01"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          style={{ textAlign: 'center', fontSize: '1.4rem', fontWeight: 700 }}
          autoFocus
        />
        {invalid && <p className="field-error center">أدخل سعراً صحيحاً.</p>}

        <div className="row dialog-actions">
          <button type="button" className="btn btn-secondary grow" onClick={onCancel} disabled={busy}>
            إلغاء
          </button>
          <button
            type="button"
            className="btn btn-primary grow"
            onClick={() => onConfirm(numeric)}
            disabled={busy || invalid}
          >
            {busy ? '...' : '✓ تأكيد البيع'}
          </button>
        </div>
      </div>
    </div>
  )
}
