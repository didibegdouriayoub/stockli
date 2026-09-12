-- ============================================================================
-- إنشاء المحل تلقائياً عند التسجيل
-- ============================================================================
-- عند التسجيل (signUp) من التطبيق، نرسل اسم المحل ضمن بيانات المستخدم الإضافية
-- (user metadata). هذه الدالة تنفَّذ تلقائياً بعد إنشاء أي مستخدم جديد في
-- auth.users وتُنشئ له صف "متجر" واحد، مع فترة تجربة مجانية 14 يوماً.
--
-- SECURITY DEFINER: تجعل الدالة تعمل بصلاحيات مالكها (postgres) وليس بصلاحيات
-- المستخدم الجديد الذي لم تُفعَّل جلسته بعد. بدون هذا، سيمنعها RLS من الكتابة.
-- هذا هو الاستثناء الوحيد المقبول لتجاوز RLS، ولأن الدالة تُنشئ فقط صفاً واحداً
-- مرتبطاً بـ NEW.id (المستخدم الجديد نفسه) فهي آمنة.
-- ============================================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.stores (owner_id, name, trial_ends_at)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'store_name'), ''), 'محلي'),
    now() + interval '14 days'
  )
  on conflict (owner_id) do nothing; -- احتياط: لا تُنشئ محلاً مكرراً لنفس المستخدم

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();
