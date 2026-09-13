-- ============================================================================
-- موافقة المشرف قبل تفعيل أي محل جديد
-- ============================================================================
-- محل جديد يُنشأ الآن بحالة "غير موافَق عليه" (approved = false)، ولا يبدأ
-- عدّاد التجربة المجانية إلا بعد موافقة المشرف صراحة — حتى لا يخسر صاحب
-- المحل أياماً من تجربته وهو ينتظر المراجعة.
-- ============================================================================

alter table public.stores add column if not exists approved boolean not null default false;

-- المحلات الموجودة مسبقاً (قبل هذه الميزة) تُعتبر مقبولة تلقائياً — لا نريد
-- قفل أي صاحب محل يستعمل التطبيق فعلاً حالياً.
update public.stores set approved = true where approved = false;

-- تحديث الدالة: لا تُفعَّل trial_ends_at عند التسجيل بعد الآن؛ ستُضبَط لاحقاً
-- عند الموافقة (من لوحة المشرف).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.stores (owner_id, name, phone)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'store_name'), ''), 'محلي'),
    split_part(new.email, '@', 1)
  )
  on conflict (owner_id) do nothing;

  return new;
end;
$$;
