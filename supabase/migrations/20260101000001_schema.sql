-- ============================================================================
-- ستوكلي — الهيكل الأساسي لقاعدة البيانات
-- ============================================================================
-- هذا الملف ينشئ الجداول الثلاثة فقط. لا يفعّل RLS بعد (ذلك في الملف التالي)
-- حتى تبقى الخطوات واضحة ومنفصلة.

create extension if not exists pgcrypto; -- يوفر gen_random_uuid()

-- ----------------------------------------------------------------------------
-- stores: كل صف هو محل واحد. owner_id مرتبط بمستخدم Supabase Auth (صاحب المحل).
-- علاقة واحد لواحد: كل مستخدم يملك محلاً واحداً حالياً (يكفي لهذه المرحلة).
-- ----------------------------------------------------------------------------
create table if not exists public.stores (
  id             uuid primary key default gen_random_uuid(),
  name           text not null check (char_length(trim(name)) > 0),
  owner_id       uuid not null unique references auth.users (id) on delete cascade,
  created_at     timestamptz not null default now(),
  trial_ends_at  timestamptz,
  paid_until     timestamptz
);

comment on table public.stores is 'محل واحد لكل مستخدم (صاحب المحل).';

-- ----------------------------------------------------------------------------
-- products: منتجات كل محل. store_id هو عمود العزل بين المحلات (multi-tenant).
-- ----------------------------------------------------------------------------
create table if not exists public.products (
  id                  uuid primary key default gen_random_uuid(),
  store_id            uuid not null references public.stores (id) on delete cascade,
  name                text not null check (char_length(trim(name)) > 0),
  category            text,
  barcode             text,
  price               numeric(10, 2) not null default 0 check (price >= 0),
  stock_qty           integer not null default 0 check (stock_qty >= 0),
  low_stock_threshold integer not null default 3 check (low_stock_threshold >= 0),
  image_url           text,        -- إضافة عملية: صورة المنتج (تظهر في تصميم شاشة البيع)
  is_on_offer         boolean not null default false,  -- للعرض بسعر مخفض في شاشة البيع
  offer_price         numeric(10, 2) check (offer_price >= 0),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

comment on table public.products is 'منتجات كل محل، معزولة عبر store_id.';

-- باركود واحد لا يتكرر داخل نفس المحل (لكن يمكن أن يتكرر بين محلات مختلفة)
create unique index if not exists products_store_barcode_unique
  on public.products (store_id, barcode)
  where barcode is not null and barcode <> '';

create index if not exists products_store_id_idx on public.products (store_id);

-- ----------------------------------------------------------------------------
-- sales: سجل كل عملية بيع. sale_price يُسجَّل وقت البيع (وليس سعر المنتج الحالي)
-- حتى لا تتغير الإيرادات التاريخية إذا غيّر صاحب المحل السعر لاحقاً.
-- product_name يُسجَّل أيضاً كنسخة احتياطية حتى تبقى شاشة "السجل" مقروءة
-- حتى لو حُذف المنتج لاحقاً.
-- ----------------------------------------------------------------------------
create table if not exists public.sales (
  id            uuid primary key default gen_random_uuid(),
  store_id      uuid not null references public.stores (id) on delete cascade,
  product_id    uuid references public.products (id) on delete set null,
  product_name  text not null,
  quantity      integer not null default 1 check (quantity > 0),
  sale_price    numeric(10, 2) not null check (sale_price >= 0),
  sold_at       timestamptz not null default now()
);

comment on table public.sales is 'سجل المبيعات، معزول عبر store_id.';

create index if not exists sales_store_id_idx on public.sales (store_id);
create index if not exists sales_store_sold_at_idx on public.sales (store_id, sold_at desc);
create index if not exists sales_product_id_idx on public.sales (product_id);

-- ----------------------------------------------------------------------------
-- تحديث updated_at تلقائياً عند تعديل أي منتج
-- ----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists products_set_updated_at on public.products;
create trigger products_set_updated_at
  before update on public.products
  for each row
  execute function public.set_updated_at();
