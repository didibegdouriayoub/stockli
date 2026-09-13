-- ============================================================================
-- لوحة تحكم المشرف (أنت، مُشغّل التطبيق) — وليس أصحاب المحلات
-- ============================================================================
-- حتى الآن كل مستخدم مسجَّل هو "صاحب محل" معزول عن غيره عبر RLS. هذا الملف
-- يضيف مفهوم "مشرف": مستخدم يملك صلاحية رؤية وتعديل كل المحلات، لمتابعة
-- الدفع وتعليق الحسابات عند الحاجة.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) جدول المشرفين. لا واجهة تسجيل لهذا الجدول — يُضاف إليه يدوياً عبر
--    supabase/ops/make-admin.sql بعد أن يُنشئ المشرف حساباً عادياً بالتطبيق.
-- ----------------------------------------------------------------------------
create table if not exists public.admins (
  user_id     uuid primary key references auth.users (id) on delete cascade,
  created_at  timestamptz not null default now()
);

comment on table public.admins is 'المستخدمون الذين يملكون صلاحية الإشراف على كل المحلات.';

alter table public.admins enable row level security;

-- كل مستخدم يتحقق فقط من عضويته هو (لا يرى قائمة المشرفين الكاملة إن لم يكن أحدهم)
create policy "التحقق من صفة الإشراف الخاصة بي فقط"
  on public.admins for select
  using (user_id = auth.uid());

-- ----------------------------------------------------------------------------
-- 2) دالة مساعدة: هل المستخدم الحالي مشرف؟ SECURITY DEFINER لتفادي أي تعقيد
--    متعلق بـ RLS عند استعمالها داخل سياسات جداول أخرى.
-- ----------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

-- ----------------------------------------------------------------------------
-- 3) أعمدة جديدة في stores: رقم الهاتف (نسخة عملية لعرضه للمشرف دون الحاجة
--    لصلاحيات خاصة لقراءة auth.users)، وعلم "معلَّق" (تعليق يدوي صريح من
--    المشرف، منفصل تماماً عن حساب التجربة/الدفع التلقائي — راجع الملاحظة
--    في subscription.js على الواجهة: التعليق قفل صارم، بخلاف التنبيه اللطيف).
-- ----------------------------------------------------------------------------
alter table public.stores add column if not exists phone text;
alter table public.stores add column if not exists suspended boolean not null default false;

-- تعبئة الهاتف للمحلات الموجودة مسبقاً (البريد الوهمي هو رقم الهاتف نفسه + @stockli.app)
update public.stores s
set phone = split_part(u.email, '@', 1)
from auth.users u
where s.owner_id = u.id and s.phone is null;

-- تحديث الدالة التي تُنشئ المحل تلقائياً عند التسجيل، لتعبئة الهاتف أيضاً
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.stores (owner_id, name, phone, trial_ends_at)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'store_name'), ''), 'محلي'),
    split_part(new.email, '@', 1),
    now() + interval '14 days'
  )
  on conflict (owner_id) do nothing;

  return new;
end;
$$;

-- ----------------------------------------------------------------------------
-- 4) صلاحيات إضافية للمشرف على stores — تُضاف بجانب سياسات صاحب المحل
--    الحالية (سياسات RLS المتعددة لنفس الإجراء تُجمَع بـ OR تلقائياً في
--    Postgres، لذا لا حاجة لحذف أو تعديل السياسات القديمة).
-- ----------------------------------------------------------------------------
create policy "المشرف يقرأ كل المحلات"
  on public.stores for select
  using (public.is_admin());

create policy "المشرف يعدّل كل المحلات"
  on public.stores for update
  using (public.is_admin())
  with check (public.is_admin());
