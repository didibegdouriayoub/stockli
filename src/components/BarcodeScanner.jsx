import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode'

const SCANNER_ELEMENT_ID = 'barcode-scanner-region'
const FILE_SCANNER_ELEMENT_ID = 'barcode-scanner-file-region'

// clear() في html5-qrcode قد يرمي استثناءً متزامناً (وليس Promise مرفوضاً فقط)
// إن كان عنصر DOM قد أُزيل بالفعل — .catch() وحدها لا تكفي لالتقاطه.
function safeClear(instance) {
  try {
    Promise.resolve(instance.clear()).catch(() => {})
  } catch {
    // تجاهل: العنصر أُزيل من الصفحة بالفعل
  }
}

// ندعم QR (لملصقاتنا الخاصة) + أكثر صيغ باركود المنتجات شيوعاً
const FORMATS = [
  Html5QrcodeSupportedFormats.QR_CODE,
  Html5QrcodeSupportedFormats.EAN_13,
  Html5QrcodeSupportedFormats.EAN_8,
  Html5QrcodeSupportedFormats.UPC_A,
  Html5QrcodeSupportedFormats.UPC_E,
  Html5QrcodeSupportedFormats.CODE_128,
  Html5QrcodeSupportedFormats.CODE_39,
]

/** شاشة مسح كاملة (كاميرا حيّة + اختيار صورة من المعرض) — تُغلق تلقائياً وتُعيد الكود الممسوح عبر onDetect. */
export default function BarcodeScanner({ onDetect, onClose }) {
  const [error, setError] = useState('')
  const [starting, setStarting] = useState(true)
  const [fileBusy, setFileBusy] = useState(false)
  const [fileError, setFileError] = useState('')

  // مشترك بين المسح المباشر بالكاميرا ومسح الصورة المختارة من المعرض، حتى لا
  // يستدعي كلاهما onDetect مرتين لو نجح الاثنان في نفس اللحظة تقريباً.
  const detectedRef = useRef(false)

  useEffect(() => {
    let cancelled = false
    const instance = new Html5Qrcode(SCANNER_ELEMENT_ID, { formatsToSupport: FORMATS, verbose: false })

    const startPromise = instance.start(
      { facingMode: 'environment' },
      { fps: 10, qrbox: { width: 260, height: 160 } },
      (decodedText) => {
        if (detectedRef.current || cancelled) return
        detectedRef.current = true
        instance
          .stop()
          .catch(() => {})
          .finally(() => {
            safeClear(instance)
            onDetect(decodedText)
          })
      },
      () => {} // فشل قراءة إطار واحد أمر عادي جداً، نتجاهله وننتظر الإطار التالي
    )

    startPromise
      .then(() => {
        if (!cancelled) setStarting(false)
      })
      .catch(() => {
        if (cancelled) return
        setStarting(false)
        setError('تعذّر تشغيل الكاميرا. تأكد من منح إذن الكاميرا لهذا الموقع، ومن استعمال رابط https (أو localhost).')
      })

    return () => {
      cancelled = true

      // إن كان قد تم اكتشاف باركود بالفعل، فرد نداء النجاح أعلاه أوقف الكاميرا
      // ونظّفها بنفسه قبل إغلاق المكوّن — تكرار ذلك هنا (بعد إزالة عنصر DOM من
      // الصفحة) هو ما كان يُسبّب الانهيار السابق. لا نكرر التنظيف في هذه الحالة.
      if (detectedRef.current) return

      // في وضع React StrictMode (التطوير فقط)، يُشغَّل هذا التأثير مرتين متتاليتين.
      // إن أوقفنا الكاميرا قبل أن ينتهي start() فعلياً من التفاوض مع المتصفح
      // (طلب إذن الكاميرا)، تبقى الكاميرا "معلَّقة" ولا يصل أي مسح بعدها أبداً.
      // لذا ننتظر استقرار start() أولاً (نجاحاً أو فشلاً) قبل استدعاء stop().
      startPromise
        .catch(() => {})
        .finally(() => {
          instance
            .stop()
            .catch(() => {})
            .finally(() => safeClear(instance))
        })
    }
  }, [onDetect])

  async function handleFilePicked(e) {
    const file = e.target.files?.[0]
    e.target.value = '' // يسمح باختيار نفس الملف مرة أخرى لاحقاً إن لزم
    if (!file || detectedRef.current) return

    setFileError('')
    setFileBusy(true)

    // نسخة منفصلة تماماً عن كاميرا البث الحيّ (عنصر DOM مختلف) حتى لا نتعارض
    // مع حالة المسح الحي الجاري بالفعل.
    const fileScanner = new Html5Qrcode(FILE_SCANNER_ELEMENT_ID, { formatsToSupport: FORMATS, verbose: false })

    try {
      const decodedText = await fileScanner.scanFile(file, false)
      setFileBusy(false)
      if (detectedRef.current) return
      detectedRef.current = true
      onDetect(decodedText)
    } catch {
      setFileBusy(false)
      setFileError('لم نتمكن من إيجاد باركود في هذه الصورة. جرّب صورة أوضح أو استعمل الكاميرا.')
    } finally {
      safeClear(fileScanner)
    }
  }

  function handleClose() {
    onClose()
  }

  return (
    <div className="scanner-overlay" role="dialog" aria-modal="true" aria-label="مسح الباركود">
      <div className="scanner-header">
        <button type="button" className="btn btn-ghost scanner-close" onClick={handleClose} aria-label="إغلاق">
          ✕
        </button>
        <p>وجّه الكاميرا نحو الباركود</p>
      </div>

      <div id={SCANNER_ELEMENT_ID} className="scanner-region" />
      <div id={FILE_SCANNER_ELEMENT_ID} style={{ display: 'none' }} />

      {starting && !error && <p className="scanner-hint">جارٍ تشغيل الكاميرا...</p>}

      {error && (
        <div className="scanner-error">
          <p>{error}</p>
          <button type="button" className="btn btn-secondary" onClick={handleClose}>
            إغلاق
          </button>
        </div>
      )}

      {!error && (
        <label className="btn btn-secondary scanner-gallery-btn">
          {fileBusy ? '...جارٍ القراءة' : '📁 اختر صورة من المعرض'}
          <input type="file" accept="image/*" onChange={handleFilePicked} disabled={fileBusy} />
        </label>
      )}

      {fileError && <p className="scanner-hint" style={{ color: '#FCA5A5' }}>{fileError}</p>}
    </div>
  )
}
