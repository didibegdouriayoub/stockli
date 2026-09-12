import { useEffect, useState } from 'react'
import QRCode from 'qrcode'

/** يعرض ملصق QR قابلاً للطباعة لمنتج لا يملك باركوداً حقيقياً. */
export default function QrStickerModal({ code, productName, onClose }) {
  const [dataUrl, setDataUrl] = useState('')

  useEffect(() => {
    let cancelled = false
    QRCode.toDataURL(code, { margin: 1, width: 400 }).then((url) => {
      if (!cancelled) setDataUrl(url)
    })
    return () => {
      cancelled = true
    }
  }, [code])

  return (
    <div className="dialog-overlay" role="dialog" aria-modal="true" aria-label="ملصق المنتج">
      <div className="dialog-card sticker-card">
        <h3 className="center">ملصق المنتج</h3>
        <p className="muted center small">اطبع هذا الملصق والصقه على المنتج، وستتمكن من مسحه لاحقاً كأي باركود.</p>

        <div id="sticker-print-area" className="sticker-preview">
          {dataUrl && <img src={dataUrl} alt={code} width={200} height={200} />}
          <p className="sticker-name truncate">{productName || 'منتج'}</p>
          <p className="sticker-code num">{code}</p>
        </div>

        <div className="row dialog-actions">
          <button type="button" className="btn btn-secondary grow" onClick={onClose}>
            إغلاق
          </button>
          <button type="button" className="btn btn-primary grow" onClick={() => window.print()}>
            🖨️ طباعة
          </button>
        </div>
      </div>
    </div>
  )
}
