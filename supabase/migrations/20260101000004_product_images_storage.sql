-- ============================================================================
-- تخزين صور المنتجات (Supabase Storage)
-- ============================================================================
-- نُنشئ "دلواً" (bucket) عاماً للقراءة (حتى تظهر الصور في التطبيق بدون تعقيد
-- روابط موقَّعة)، لكن الكتابة (رفع/تعديل/حذف) محمية بنفس منطق العزل: كل صاحب
-- محل يكتب فقط داخل مجلد بصيغة <store_id>/... الخاص به.
--
-- ملاحظة: نستعمل storage.foldername(name) التي تُرجع مسار الملف كمصفوفة
-- (["<store_id>", "<filename>"])، ونقارن أول عنصر بمعرّفات محلات المستخدم.
-- ============================================================================

insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

create policy "قراءة عامة لصور المنتجات"
  on storage.objects for select
  using (bucket_id = 'product-images');

create policy "رفع صور محلي فقط"
  on storage.objects for insert
  with check (
    bucket_id = 'product-images'
    and (storage.foldername(name))[1] in (select id::text from public.stores where owner_id = auth.uid())
  );

create policy "تعديل صور محلي فقط"
  on storage.objects for update
  using (
    bucket_id = 'product-images'
    and (storage.foldername(name))[1] in (select id::text from public.stores where owner_id = auth.uid())
  );

create policy "حذف صور محلي فقط"
  on storage.objects for delete
  using (
    bucket_id = 'product-images'
    and (storage.foldername(name))[1] in (select id::text from public.stores where owner_id = auth.uid())
  );
