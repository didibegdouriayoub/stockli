-- ============================================================================
-- Row Level Security (RLS) — عزل بيانات كل محل عن الآخر
-- ============================================================================
-- فكرة RLS ببساطة: بدل أن تكتب "WHERE store_id = ..." يدوياً في كل استعلام
-- (وتخاطر بنسيانه مرة وتسريب بيانات محل آخر)، تضع القاعدة داخل قاعدة البيانات
-- نفسها. حتى لو استُخدم anon key مباشرة من المتصفح، لن يقدر أي مستخدم قراءة
-- أو تعديل صف لا يخصّه — Postgres يرفض الطلب قبل أن يصل لأي بيانات.
--
-- خطوتان لكل جدول:
--   1) enable row level security  → تقفل الجدول بشكل افتراضي (لا أحد يرى شيئاً)
--   2) create policy ...          → تفتح استثناءات محددة (فقط صفوفي أنا)
--
-- auth.uid() هي دالة توفرها Supabase: تُرجع id المستخدم المسجّل دخوله حالياً
-- (تُقرأ من الـ JWT الخاص بالجلسة). إن لم يكن هناك مستخدم مسجَّل، تُرجع NULL،
-- وبالتالي لا تُطابق أي صف.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) stores: كل مستخدم يرى صفّ محله فقط (owner_id = auth.uid())
-- ----------------------------------------------------------------------------
alter table public.stores enable row level security;

create policy "صاحب المحل يقرأ محله فقط"
  on public.stores for select
  using (owner_id = auth.uid());

create policy "صاحب المحل يعدّل محله فقط"
  on public.stores for update
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

-- لا حاجة لسياسة INSERT من طرف المستخدم: إنشاء المحل يتم تلقائياً عبر
-- الدالة handle_new_user (بصلاحيات SECURITY DEFINER) في الملف السابق.
-- ولا سياسة DELETE: حذف المحل من التطبيق غير متاح حالياً (إجراء حساس).

-- ----------------------------------------------------------------------------
-- 2) products: القاعدة العامة لكل الجداول الأخرى:
--    "اسمح فقط إذا كان store_id يعود لمحل يملكه المستخدم الحالي"
-- ----------------------------------------------------------------------------
alter table public.products enable row level security;

create policy "قراءة منتجات محلي فقط"
  on public.products for select
  using (
    store_id in (select id from public.stores where owner_id = auth.uid())
  );

create policy "إضافة منتجات لمحلي فقط"
  on public.products for insert
  with check (
    store_id in (select id from public.stores where owner_id = auth.uid())
  );

create policy "تعديل منتجات محلي فقط"
  on public.products for update
  using (
    store_id in (select id from public.stores where owner_id = auth.uid())
  )
  with check (
    store_id in (select id from public.stores where owner_id = auth.uid())
  );

create policy "حذف منتجات محلي فقط"
  on public.products for delete
  using (
    store_id in (select id from public.stores where owner_id = auth.uid())
  );

-- ----------------------------------------------------------------------------
-- 3) sales: نفس القاعدة بالضبط. لا سياسة UPDATE ولا DELETE عمداً —
--    سجل المبيعات لا يُعدَّل يدوياً؛ التصحيح الوحيد هو "تراجع" (undo) خلال
--    ثوانٍ من البيع، وذلك عبر حذف صف البيع الذي أنشأه نفس المستخدم للتو
--    (يُسمح به لأن سياسة DELETE أدناه موجودة).
-- ----------------------------------------------------------------------------
alter table public.sales enable row level security;

create policy "قراءة مبيعات محلي فقط"
  on public.sales for select
  using (
    store_id in (select id from public.stores where owner_id = auth.uid())
  );

create policy "تسجيل مبيعات لمحلي فقط"
  on public.sales for insert
  with check (
    store_id in (select id from public.stores where owner_id = auth.uid())
  );

create policy "حذف مبيعات محلي فقط (للتراجع)"
  on public.sales for delete
  using (
    store_id in (select id from public.stores where owner_id = auth.uid())
  );
