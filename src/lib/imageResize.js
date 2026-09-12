/**
 * يُصغّر صورة المنتج قبل رفعها (أقصى بعد 800px، جودة JPEG 0.82) لتوفير بيانات
 * الهاتف (مهم لأصحاب المحلات بباقات إنترنت محدودة) وتسريع الرفع والتحميل.
 */
export function resizeImageFile(file, maxDim = 800, quality = 0.82) {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file)
    const img = new Image()

    img.onload = () => {
      let { width, height } = img
      if (width > maxDim || height > maxDim) {
        if (width >= height) {
          height = Math.round((height * maxDim) / width)
          width = maxDim
        } else {
          width = Math.round((width * maxDim) / height)
          height = maxDim
        }
      }

      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      canvas.getContext('2d').drawImage(img, 0, 0, width, height)

      canvas.toBlob(
        (blob) => {
          URL.revokeObjectURL(objectUrl)
          if (!blob) {
            reject(new Error('تعذّر معالجة الصورة'))
            return
          }
          resolve(new File([blob], file.name.replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' }))
        },
        'image/jpeg',
        quality
      )
    }

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('تعذّر قراءة الصورة'))
    }

    img.src = objectUrl
  })
}
