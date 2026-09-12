import { supabase } from './supabaseClient'
import { resizeImageFile } from './imageResize'

const BUCKET = 'product-images'

/** يرفع صورة منتج لمجلد المحل الخاص به، ويُرجع رابطها العام. */
export async function uploadProductImage(storeId, file) {
  const resized = await resizeImageFile(file)
  const path = `${storeId}/${crypto.randomUUID()}.jpg`

  const { error } = await supabase.storage.from(BUCKET).upload(path, resized, {
    cacheControl: '3600',
    upsert: false,
    contentType: 'image/jpeg',
  })
  if (error) throw error

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return data.publicUrl
}

/** يحذف صورة قديمة عند استبدالها أو حذف المنتج. لا يرمي خطأ إن فشل (غير حرج). */
export async function deleteProductImageByUrl(url) {
  if (!url) return
  try {
    const marker = `/object/public/${BUCKET}/`
    const idx = url.indexOf(marker)
    if (idx === -1) return
    const path = url.slice(idx + marker.length)
    await supabase.storage.from(BUCKET).remove([path])
  } catch {
    // تجاهل: حذف الصورة القديمة ليس إجراءً حرجاً
  }
}
