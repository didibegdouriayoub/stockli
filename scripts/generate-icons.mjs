// يولّد أيقونات PWA الحقيقية (PNG) من ملفات SVG المصدر في public/icons/.
// شغّله من جديد إن تغيّر الشعار: npm run icons
import sharp from 'sharp'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const dir = path.dirname(fileURLToPath(import.meta.url))
const iconsDir = path.join(dir, '..', 'public', 'icons')

const regularSvg = readFileSync(path.join(iconsDir, 'icon.svg'))
// نسخة "maskable": خلفية تملأ الإطار بالكامل (بدون زوايا مدوَّرة) مع هامش أكبر
// حول الرسمة حتى لا يقصّها نظام Android عند قصّها بأشكال مختلفة (دائرة، مربع...)
const maskableSvg = readFileSync(path.join(iconsDir, 'icon-maskable-source.svg'))

const targets = [
  { src: regularSvg, size: 192, file: 'icon-192.png' },
  { src: regularSvg, size: 512, file: 'icon-512.png' },
  { src: regularSvg, size: 180, file: 'icon-180.png' }, // apple-touch-icon
  { src: maskableSvg, size: 512, file: 'icon-maskable-512.png' },
]

for (const { src, size, file } of targets) {
  await sharp(src, { density: 384 })
    .resize(size, size)
    .png()
    .toFile(path.join(iconsDir, file))
  console.log(`✓ ${file} (${size}x${size})`)
}
