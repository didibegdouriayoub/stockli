import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import basicSsl from '@vitejs/plugin-basic-ssl'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // شهادة HTTPS محلية موقَّعة ذاتياً: الكاميرا (مسح الباركود) يمنعها المتصفح
    // على http:// من أي جهاز غير localhost. بهذا يمكن فتح التطبيق من الهاتف
    // عبر https://<عنوان الحاسوب>:5173 واختبار الكاميرا فعلياً. المتصفح سيُظهر
    // تحذير "الشهادة غير موثوقة" مرة واحدة — اضغط "متابعة على أي حال" (Advanced
    // → Proceed)، هذا طبيعي لأنها شهادة تطوير محلية وليست موقَّعة من جهة رسمية.
    basicSsl(),
    VitePWA({
      registerType: 'autoUpdate',
      // يجعل التطبيق يشتغل حتى في وضع التطوير (مفيد للاختبار على الهاتف)
      devOptions: { enabled: false },
      includeAssets: ['icons/icon.svg', 'icons/icon-192.png', 'icons/icon-512.png'],
      manifest: {
        name: 'ستوكلي — إدارة المبيعات والمخزون ببساطة',
        short_name: 'ستوكلي',
        description: 'ستوكلي: إدارة المبيعات والمخزون ببساطة لمحلات الهواتف والإكسسوارات',
        lang: 'ar',
        dir: 'rtl',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#FFFFFF',
        theme_color: '#0F766E',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        navigateFallbackDenylist: [/^\/api/],
        runtimeCaching: [
          {
            // خطوط Google: تُخزَّن محلياً حتى يشتغل التطبيق بدون أنترنت
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts',
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
  server: {
    host: true, // يسمح بفتح التطبيق من الهاتف على نفس شبكة الواي فاي
  },
})
