-- ============================================================================
-- باركودات إضافية لكل منتج (product_barcodes)
-- ============================================================================
-- المشكلة: أحياناً نفس المنتج (نفس الاسم والسعر والمخزون) يصل بأكثر من باركود
-- مطبوع عليه — دفعة مختلفة من المورّد، تغيير الشركة المصنّعة لرمز EAN، إلخ.
-- عمود products.barcode يبقى كما هو (الباركود "الرئيسي" الذي يظهر في نموذج
-- المنتج وعلى الملصق المطبوع)، وهذا الجدول يخزّن أي رموز إضافية تشير لنفس
-- المنتج، حتى يعمل المسح الضوئي بأي واحد منها.
-- ============================================================================

create table if not exists public.product_barcodes (
  id          uuid primary key default gen_random_uuid(),
  store_id    uuid not null references public.stores (id) on delete cascade,
  product_id  uuid not null references public.products (id) on delete cascade,
  barcode     text not null check (char_length(trim(barcode)) > 0),
  created_at  timestamptz not null default now()
);

comment on table public.product_barcodes is 'باركودات بديلة إضافية لمنتج موجود، تشير كلها لنفس product_id.';

-- نفس الباركود لا يتكرر داخل نفس المحل (سواء بين منتجين مختلفين أو مرتين لنفس المنتج)
create unique index if not exists product_barcodes_store_barcode_unique
  on public.product_barcodes (store_id, barcode);

create index if not exists product_barcodes_product_id_idx on public.product_barcodes (product_id);

-- ----------------------------------------------------------------------------
-- منع تضارب الباركود بين الجدولين: نفس الرمز لا يمكن أن يكون في نفس الوقت
-- الباركود الرئيسي لمنتج والباركود البديل لمنتج آخر (أو حتى لنفس المنتج).
-- ----------------------------------------------------------------------------
create or replace function public.check_alt_barcode_not_taken()
returns trigger
language plpgsql
as $$
begin
  if exists (
    select 1 from public.products p
    where p.store_id = new.store_id
      and p.barcode = new.barcode
      and p.id <> new.product_id
  ) then
    raise exception 'هذا الباركود مستعمل بالفعل مع منتج آخر' using errcode = 'unique_violation';
  end if;
  return new;
end;
$$;

drop trigger if exists product_barcodes_check_conflict on public.product_barcodes;
create trigger product_barcodes_check_conflict
  before insert or update of barcode, store_id, product_id on public.product_barcodes
  for each row execute function public.check_alt_barcode_not_taken();

create or replace function public.check_primary_barcode_not_taken()
returns trigger
language plpgsql
as $$
begin
  if new.barcode is null or new.barcode = '' then
    return new;
  end if;
  if exists (
    select 1 from public.product_barcodes pb
    where pb.store_id = new.store_id
      and pb.barcode = new.barcode
      and pb.product_id <> new.id
  ) then
    raise exception 'هذا الباركود مستعمل بالفعل مع منتج آخر' using errcode = 'unique_violation';
  end if;
  return new;
end;
$$;

drop trigger if exists products_check_barcode_conflict on public.products;
create trigger products_check_barcode_conflict
  before insert or update of barcode, store_id on public.products
  for each row execute function public.check_primary_barcode_not_taken();

-- ----------------------------------------------------------------------------
-- RLS: نفس منطق العزل بين المحلات المستعمل في كل جدول آخر. لا سياسة UPDATE —
-- تعديل رمز بديل يكون بحذفه وإضافة رمز جديد (أبسط، ويكفي لهذا الاستعمال).
-- ----------------------------------------------------------------------------
alter table public.product_barcodes enable row level security;

create policy "قراءة باركودات محلي فقط"
  on public.product_barcodes for select
  using (
    store_id in (select id from public.stores where owner_id = auth.uid())
  );

create policy "إضافة باركود لمنتج محلي فقط"
  on public.product_barcodes for insert
  with check (
    store_id in (select id from public.stores where owner_id = auth.uid())
    and product_id in (select id from public.products where store_id = product_barcodes.store_id)
  );

-- (product_barcodes.store_id أعلاه يشير لعمود الصف الجديد نفسه — مسموح داخل
-- with check لأن اسم الجدول يُستعمل كاسم مستعار ضمني للصف قيد الإدخال)

create policy "حذف باركود من محلي فقط"
  on public.product_barcodes for delete
  using (
    store_id in (select id from public.stores where owner_id = auth.uid())
  );
