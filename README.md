# ستوكلي (Stockli)

تطبيق ويب بسيط لتسيير المخزون والمبيعات لمحلات الهواتف والإكسسوارات في المغرب.
مبني بواجهة عربية كاملة (RTL)، مُحسَّن للهاتف أولاً، وقابل للتثبيت كتطبيق (PWA).

A mobile-first inventory & sales management web app for phone/accessory shops
in Morocco. Multi-tenant (one Supabase backend, data isolated per store via
`store_id` + Row Level Security). Arabic-only UI, RTL layout.

## التقنيات المستعملة / Stack

- **React + Vite** (PWA via `vite-plugin-pwa`)
- **Supabase** — Postgres + Auth + Storage, with RLS enforcing per-store data isolation
- **html5-qrcode** — in-browser barcode/QR scanning (camera-based, no native app)
- **react-router-dom**

## البدء / Getting started

```bash
npm install
cp .env.example .env   # املأ VITE_SUPABASE_URL و VITE_SUPABASE_ANON_KEY من مشروعك في Supabase
npm run dev
```

### قاعدة البيانات / Database setup

Run the SQL files in `supabase/migrations/` **in order**, once, via the Supabase
SQL Editor (or the Supabase CLI if you have it linked). Each file is commented
in Arabic explaining what it does and why — start with `20260101000001_schema.sql`.

Also required in your Supabase project settings:
- **Authentication → Sign In / Providers → Email → "Confirm email" = OFF**
  (the app logs users in by phone number, mapped internally to a synthetic
  `@stockli.app` email — see `src/lib/phone.js` — so there's no real inbox to
  confirm against).

### تفعيل الدفع يدوياً / Marking a store as paid

There's no payment provider integrated (by design, for now). After a shop
owner pays you in person, run the template in `supabase/ops/mark-store-paid.sql`
in the SQL Editor to extend their `paid_until`. It's a reusable snippet, not a
one-time migration.

### توليد أيقونات PWA / Regenerating PWA icons

If the logo (`public/icons/icon.svg`) changes:

```bash
npm run icons
```

### لوحة المشرف / Admin panel (`/admin`)

Lets you (the operator) see every store's subscription status, extend a paid
period, suspend a store outright (a hard lock, unlike the normal soft banner),
message the owner on WhatsApp, and reset a forgotten password.

**One-time setup:**
1. Sign up for a regular account through the app itself (any phone/password —
   this is *your* login, not a real shop).
2. Run `supabase/migrations/20260101000006_admin.sql` (adds the `admins`
   table + related RLS).
3. Run `supabase/ops/make-admin.sql` (edit the phone number in it first) to
   mark that account as an admin.
4. Visit `/admin` while logged in as that account.

**Deployment requirement — this app is no longer a pure static site.** The
password-reset action needs Supabase's privileged Admin API (`service_role`
key), which must never run in the browser. `worker/index.js` is a small
Cloudflare Worker that holds that key server-side and exposes exactly one
narrow endpoint (`/api/admin/reset-password`) for it; everything else is still
served as the static built site via the same Worker (see `wrangler.jsonc`).

In the Cloudflare Pages/Workers project's **Settings → Variables and Secrets**,
add (as **encrypted** secrets, not the build-time `VITE_...` ones):
- `SUPABASE_URL` — same as `VITE_SUPABASE_URL`
- `SUPABASE_ANON_KEY` — same as `VITE_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` — from Supabase Settings → API → **Secret keys**
  (the `service_role`/`sb_secret_...` one — never put this in `.env` or any
  `VITE_`-prefixed variable, since those get bundled into the public
  JavaScript sent to every visitor's browser)

⚠️ **Local dev limitation**: `npm run dev` doesn't run the Worker, so the
password-reset button only works on the real Cloudflare deployment, not
`localhost`. Everything else in `/admin` (viewing stores, suspend, extend
payment) works locally too since those are plain Supabase calls.

## البنية / Structure

```
src/
  pages/       شاشات التطبيق (البيع، المخزون، السجل، لوحة التحكم، النماذج...)
  components/  عناصر واجهة قابلة لإعادة الاستعمال (الماسح، الحوارات، شريط التنقل...)
  lib/         منطق العمل: Supabase client، الجلسة/المحل، المبيعات، الباركود...
supabase/
  migrations/  ملفات SQL مرقّمة، تُشغَّل مرة واحدة بالترتيب
  ops/         استعلامات تُعاد استعمالها يدوياً (وليست migrations)
```

## أوامر مفيدة / Scripts

| Command         | ماذا يفعل                                  |
| ---------------- | -------------------------------------------- |
| `npm run dev`     | خادم تطوير (HTTPS محلي لاختبار الكاميرا)     |
| `npm run build`   | بناء نسخة الإنتاج                            |
| `npm run preview` | معاينة نسخة الإنتاج محلياً                   |
| `npm run lint`    | فحص الكود (oxlint)                           |
| `npm run icons`   | توليد أيقونات PWA من الشعار                  |
