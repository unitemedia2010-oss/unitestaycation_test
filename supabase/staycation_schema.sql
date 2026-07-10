-- Unite Staycation Supabase schema
-- Run this in Supabase SQL Editor after reviewing names and policies.

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select role
      from public.user_profiles
      where id = auth.uid()
        and is_active = true
      limit 1
    ),
    'guest'
  );
$$;

create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_user_role() = 'super_admin';
$$;

create or replace function public.can_manage_inventory()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_user_role() in ('super_admin', 'admin');
$$;

create or replace function public.can_manage_bookings()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_user_role() in ('super_admin', 'admin', 'manager', 'cskh');
$$;

create or replace function public.can_manage_payments()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_user_role() in ('super_admin', 'admin', 'manager', 'cskh');
$$;

create table if not exists public.branches (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  area text,
  public_address text,
  map_url text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.room_types (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches(id) on delete cascade,
  code text unique not null,
  name text not null,
  category text,
  price_tier text,
  vibe text,
  short_line text,
  description text,
  inventory_count integer not null default 3 check (inventory_count >= 0),
  max_guests integer not null default 2,
  status text not null default 'available' check (status in ('available', 'limited', 'maintenance', 'hidden')),
  is_published boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.room_images (
  id uuid primary key default gen_random_uuid(),
  room_type_id uuid not null references public.room_types(id) on delete cascade,
  storage_path text not null,
  public_url text,
  alt text,
  sort_order integer not null default 0,
  is_cover boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.amenities (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  label_vi text not null,
  label_en text,
  label_zh text,
  icon text,
  sort_order integer not null default 0,
  is_active boolean not null default true
);

create table if not exists public.room_amenities (
  room_type_id uuid not null references public.room_types(id) on delete cascade,
  amenity_id uuid not null references public.amenities(id) on delete cascade,
  primary key (room_type_id, amenity_id)
);

create table if not exists public.room_prices (
  id uuid primary key default gen_random_uuid(),
  room_type_id uuid not null references public.room_types(id) on delete cascade,
  package_code text not null,
  package_label text not null,
  duration_hours numeric,
  base_price integer not null check (base_price >= 0),
  currency text not null default 'VND',
  starts_at timestamptz,
  ends_at timestamptz,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.promotions (
  id uuid primary key default gen_random_uuid(),
  room_type_id uuid references public.room_types(id) on delete cascade,
  title text not null,
  discount_percent integer check (discount_percent between 0 and 100),
  discount_amount integer check (discount_amount is null or discount_amount >= 0),
  badge_label text,
  show_badge boolean not null default true,
  starts_at timestamptz,
  ends_at timestamptz,
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.booking_sources (
  code text primary key,
  label text not null,
  is_ota boolean not null default false,
  is_active boolean not null default true
);

create table if not exists public.user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  phone text,
  role text not null default 'cskh' check (role in ('super_admin', 'admin', 'manager', 'cskh')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  public_code text unique not null default ('US-' || to_char(now(), 'YYYYMMDD') || '-' || upper(substr(gen_random_uuid()::text, 1, 6))),
  source_code text references public.booking_sources(code),
  room_type_id uuid references public.room_types(id),
  branch_id uuid references public.branches(id),
  customer_name text not null,
  customer_phone text not null,
  customer_email text,
  stay_date date not null,
  checkout_date date,
  start_time time,
  end_time time,
  package_code text,
  package_label text,
  nights integer not null default 0 check (nights >= 0),
  guests integer not null default 2 check (guests > 0),
  status text not null default 'new' check (status in ('new', 'consulting', 'holding', 'deposited', 'paid', 'checked_in', 'checked_out', 'cancelled', 'no_show')),
  total_amount integer not null default 0 check (total_amount >= 0),
  deposit_amount integer not null default 0 check (deposit_amount >= 0),
  paid_amount integer not null default 0 check (paid_amount >= 0),
  balance_amount integer not null default 0 check (balance_amount >= 0),
  payment_method text,
  assigned_to text,
  customer_note text,
  internal_note text,
  external_ref text,
  sheet_row integer,
  sheet_synced_at timestamptz,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.booking_notes (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  note text not null,
  note_type text not null default 'internal',
  created_by uuid,
  created_at timestamptz not null default now()
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  payment_type text not null default 'deposit' check (payment_type in ('deposit', 'remaining', 'full', 'refund', 'adjustment')),
  amount integer not null check (amount > 0),
  payment_method text,
  payment_status text not null default 'received' check (payment_status in ('pending', 'received', 'refunded', 'failed')),
  paid_at timestamptz not null default now(),
  bill_storage_path text,
  bill_uploaded_at timestamptz,
  note text,
  created_at timestamptz not null default now()
);

create table if not exists public.sheet_sync_logs (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid references public.bookings(id) on delete set null,
  action text not null,
  status text not null default 'pending',
  sheet_row integer,
  payload jsonb,
  error text,
  created_at timestamptz not null default now()
);

-- Migration helpers for projects that already had an older Unite Staycation schema.
-- Supabase keeps old tables when using `create table if not exists`, so add new columns
-- before indexes, policies, and app queries reference them.
alter table public.bookings add column if not exists checkout_date date;
alter table public.bookings add column if not exists start_time time;
alter table public.bookings add column if not exists end_time time;
alter table public.bookings add column if not exists balance_amount integer not null default 0 check (balance_amount >= 0);
alter table public.bookings add column if not exists customer_email text;
alter table public.bookings add column if not exists package_label text;
alter table public.bookings add column if not exists nights integer not null default 0 check (nights >= 0);
alter table public.bookings add column if not exists guests integer not null default 2 check (guests > 0);
alter table public.bookings add column if not exists paid_amount integer not null default 0 check (paid_amount >= 0);
alter table public.bookings add column if not exists assigned_to text;
alter table public.bookings add column if not exists customer_note text;
alter table public.bookings add column if not exists internal_note text;
alter table public.bookings add column if not exists external_ref text;
alter table public.bookings add column if not exists sheet_row integer;
alter table public.bookings add column if not exists sheet_synced_at timestamptz;

alter table public.payments add column if not exists payment_type text not null default 'deposit';
alter table public.payments add column if not exists bill_storage_path text;
alter table public.payments add column if not exists bill_uploaded_at timestamptz;
alter table public.payments add column if not exists note text;

alter table public.room_images add column if not exists public_url text;
alter table public.room_images add column if not exists alt text;
alter table public.room_images add column if not exists sort_order integer not null default 0;
alter table public.room_images add column if not exists is_cover boolean not null default false;
alter table public.room_images add column if not exists is_active boolean not null default true;

alter table public.user_profiles add column if not exists email text;
alter table public.user_profiles add column if not exists phone text;
alter table public.user_profiles drop constraint if exists user_profiles_role_check;
alter table public.user_profiles
  add constraint user_profiles_role_check
  check (role in ('super_admin', 'admin', 'manager', 'cskh'));

create index if not exists bookings_stay_date_idx on public.bookings(stay_date);
create index if not exists bookings_status_idx on public.bookings(status);
create index if not exists bookings_source_idx on public.bookings(source_code);
create index if not exists bookings_room_time_idx on public.bookings(room_type_id, stay_date, start_time, end_time);
create index if not exists room_types_branch_idx on public.room_types(branch_id);
create unique index if not exists room_prices_base_unique_idx
on public.room_prices(room_type_id, package_code)
where starts_at is null and ends_at is null;

drop trigger if exists branches_set_updated_at on public.branches;
create trigger branches_set_updated_at before update on public.branches
for each row execute function public.set_updated_at();

drop trigger if exists room_types_set_updated_at on public.room_types;
create trigger room_types_set_updated_at before update on public.room_types
for each row execute function public.set_updated_at();

drop trigger if exists room_prices_set_updated_at on public.room_prices;
create trigger room_prices_set_updated_at before update on public.room_prices
for each row execute function public.set_updated_at();

drop trigger if exists promotions_set_updated_at on public.promotions;
create trigger promotions_set_updated_at before update on public.promotions
for each row execute function public.set_updated_at();

drop trigger if exists bookings_set_updated_at on public.bookings;
create trigger bookings_set_updated_at before update on public.bookings
for each row execute function public.set_updated_at();

drop trigger if exists user_profiles_set_updated_at on public.user_profiles;
create trigger user_profiles_set_updated_at before update on public.user_profiles
for each row execute function public.set_updated_at();

insert into public.booking_sources (code, label, is_ota) values
  ('website', 'Website', false),
  ('zalo', 'Zalo', false),
  ('fanpage_main', 'Fanpage chính', false),
  ('fanpage_levansi', 'Fanpage Lê Văn Sỹ', false),
  ('fanpage_tayho', 'Fanpage Tây Hồ', false),
  ('instagram', 'Instagram', false),
  ('agoda', 'Agoda', true),
  ('airbnb', 'Airbnb', true),
  ('booking', 'Booking', true),
  ('walkin', 'Walk-in', false)
on conflict (code) do update set
  label = excluded.label,
  is_ota = excluded.is_ota,
  is_active = true;

do $$
declare
  unite_super_admin_id uuid := '61731da0-58b4-414a-be71-81eeb9ca3c05';
begin
  if exists (select 1 from auth.users where id = unite_super_admin_id) then
    insert into public.user_profiles (id, email, full_name, role, is_active)
    values (unite_super_admin_id, 'nptruong60@gmail.com', 'Unite Super Admin', 'super_admin', true)
    on conflict (id) do update set
      email = coalesce(excluded.email, public.user_profiles.email),
      full_name = coalesce(excluded.full_name, public.user_profiles.full_name),
      role = 'super_admin',
      is_active = true,
      updated_at = now();
  end if;
end $$;

insert into public.amenities (code, label_vi, label_en, label_zh, icon, sort_order) values
  ('wifi', 'Wi-Fi', 'Wi-Fi', 'Wi-Fi', 'wifi', 10),
  ('aircon', 'Máy lạnh', 'Air conditioning', '空调', 'snowflake', 20),
  ('bathtub', 'Bồn tắm', 'Bathtub', '浴缸', 'bath', 30),
  ('tv', 'TV / Giải trí', 'TV / Entertainment', '电视 / 娱乐', 'tv', 40),
  ('self-checkin', 'Tự nhận phòng', 'Self check-in', '自助入住', 'key', 50),
  ('support', 'Hỗ trợ nhanh', 'Fast support', '快速支持', 'phone', 60),
  ('photo-corner', 'Góc chụp ảnh', 'Photo corner', '拍照角', 'camera', 70)
on conflict (code) do update set
  label_vi = excluded.label_vi,
  label_en = excluded.label_en,
  label_zh = excluded.label_zh,
  icon = excluded.icon,
  sort_order = excluded.sort_order,
  is_active = true;

with seeded_branches as (
  insert into public.branches (slug, name, area, public_address, sort_order)
  values
    ('nhieu-tu', 'Chi nhánh Nhiêu Tứ', 'Phú Nhuận', 'Chi nhánh Nhiêu Tứ, Phú Nhuận', 10),
    ('phan-tay-ho', 'Chi nhánh Phan Tây Hồ', 'Phú Nhuận', 'Chi nhánh Phan Tây Hồ, Phú Nhuận', 20),
    ('le-van-si', 'Chi nhánh Lê Văn Sĩ', 'Phú Nhuận', 'Chi nhánh Lê Văn Sĩ, Phú Nhuận', 30)
  on conflict (slug) do update set
    name = excluded.name,
    area = excluded.area,
    public_address = excluded.public_address,
    sort_order = excluded.sort_order,
    is_active = true
  returning id, slug
)
select 1;

insert into public.room_types (branch_id, code, name, category, price_tier, vibe, short_line, inventory_count, sort_order)
select branches.id, seed.code, seed.name, seed.category, seed.price_tier, seed.vibe, seed.short_line, seed.inventory_count, seed.sort_order
from (
  values
    ('nhieu-tu', 'C1-ELAN', 'ÉLAN Layout', 'Studio bathtub', 'premium', 'Private bathtub · quiet city light', 'Studio riêng tư có bồn tắm.', 3, 10),
    ('nhieu-tu', 'C1-NOIR', 'NOIR Layout', 'Studio', 'premium', 'Dark modern · private · signature', 'Không gian tối hiện đại, riêng tư.', 3, 20),
    ('phan-tay-ho', 'C8-THE-ART', 'THE ART Layout', 'Art bathtub', 'signature', 'Gallery mood · bathtub · soft light', 'Layout nghệ thuật có bồn tắm.', 3, 30),
    ('phan-tay-ho', 'C9-VELVET', 'VELVET Layout', 'Warm studio', 'premium', 'Warm velvet · relaxed · private', 'Studio ấm, dễ nghỉ.', 3, 40),
    ('phan-tay-ho', 'C10-MIDNIGHT', 'MIDNIGHT Layout', 'Compact studio', 'budget', 'Minimal · private · budget-friendly', 'Layout gọn, giá dễ tiếp cận.', 3, 50),
    ('le-van-si', 'C12-AMOR', 'Amor Layout', 'Romantic bathtub', 'signature', 'Romantic · bathtub · soft mood', 'Studio lãng mạn có bồn tắm.', 3, 60),
    ('le-van-si', 'C12-ROMA', 'Roma Layout', 'Warm studio', 'premium', 'Warm classic · private · easy stay', 'Studio ấm, tinh tế và riêng tư.', 3, 70)
) as seed(branch_slug, code, name, category, price_tier, vibe, short_line, inventory_count, sort_order)
join public.branches branches on branches.slug = seed.branch_slug
on conflict (code) do update set
  branch_id = excluded.branch_id,
  name = excluded.name,
  category = excluded.category,
  price_tier = excluded.price_tier,
  vibe = excluded.vibe,
  short_line = excluded.short_line,
  inventory_count = excluded.inventory_count,
  sort_order = excluded.sort_order,
  is_published = true,
  status = 'available';

insert into public.room_prices (room_type_id, package_code, package_label, duration_hours, base_price, sort_order)
select room_types.id, prices.package_code, prices.package_label, prices.duration_hours, prices.base_price, prices.sort_order
from public.room_types
join (
  values
    ('3h', '3 tiếng', 3, 299000, 10),
    ('4h', '4 tiếng', 4, 379000, 20),
    ('8h', '8 tiếng', 8, 579000, 30),
    ('day', 'Theo ngày', 24, 759000, 40)
) as prices(package_code, package_label, duration_hours, base_price, sort_order) on true
on conflict (room_type_id, package_code) where starts_at is null and ends_at is null do update set
  package_label = excluded.package_label,
  duration_hours = excluded.duration_hours,
  base_price = excluded.base_price,
  sort_order = excluded.sort_order,
  is_active = true;

insert into public.room_amenities (room_type_id, amenity_id)
select room_types.id, amenities.id
from public.room_types
join public.amenities on amenities.code in ('wifi', 'aircon', 'tv', 'self-checkin', 'support')
on conflict do nothing;

insert into public.room_amenities (room_type_id, amenity_id)
select room_types.id, amenities.id
from public.room_types
join public.amenities on amenities.code in ('bathtub', 'photo-corner')
where room_types.code in ('C1-ELAN', 'C8-THE-ART', 'C12-AMOR')
on conflict do nothing;

insert into storage.buckets (id, name, public)
values ('room-images', 'room-images', true)
on conflict (id) do update set public = true;

insert into storage.buckets (id, name, public)
values ('booking-bills', 'booking-bills', true)
on conflict (id) do update set public = true;

alter table public.branches enable row level security;
alter table public.room_types enable row level security;
alter table public.room_images enable row level security;
alter table public.amenities enable row level security;
alter table public.room_amenities enable row level security;
alter table public.room_prices enable row level security;
alter table public.promotions enable row level security;
alter table public.booking_sources enable row level security;
alter table public.user_profiles enable row level security;
alter table public.bookings enable row level security;
alter table public.booking_notes enable row level security;
alter table public.payments enable row level security;
alter table public.sheet_sync_logs enable row level security;

drop policy if exists "public read active branches" on public.branches;
create policy "public read active branches" on public.branches
for select using (is_active = true);

drop policy if exists "public read published room types" on public.room_types;
create policy "public read published room types" on public.room_types
for select using (is_published = true and status <> 'hidden');

drop policy if exists "public read active room images" on public.room_images;
create policy "public read active room images" on public.room_images
for select using (is_active = true);

drop policy if exists "public read active amenities" on public.amenities;
create policy "public read active amenities" on public.amenities
for select using (is_active = true);

drop policy if exists "public read room amenities" on public.room_amenities;
create policy "public read room amenities" on public.room_amenities
for select using (true);

drop policy if exists "public read active prices" on public.room_prices;
create policy "public read active prices" on public.room_prices
for select using (is_active = true);

drop policy if exists "public read active promotions" on public.promotions;
create policy "public read active promotions" on public.promotions
for select using (is_active = true and (starts_at is null or starts_at <= now()) and (ends_at is null or ends_at >= now()));

drop policy if exists "public read booking sources" on public.booking_sources;
create policy "public read booking sources" on public.booking_sources
for select using (is_active = true);

drop policy if exists "public insert booking request" on public.bookings;
create policy "public insert booking request" on public.bookings
for insert with check (status = 'new');

drop policy if exists "authenticated manage branches" on public.branches;
create policy "authenticated manage branches" on public.branches
for all using (public.can_manage_inventory()) with check (public.can_manage_inventory());

drop policy if exists "authenticated manage room types" on public.room_types;
create policy "authenticated manage room types" on public.room_types
for all using (public.can_manage_inventory()) with check (public.can_manage_inventory());

drop policy if exists "authenticated manage room images" on public.room_images;
create policy "authenticated manage room images" on public.room_images
for all using (public.can_manage_inventory()) with check (public.can_manage_inventory());

drop policy if exists "authenticated manage amenities" on public.amenities;
create policy "authenticated manage amenities" on public.amenities
for all using (public.can_manage_inventory()) with check (public.can_manage_inventory());

drop policy if exists "authenticated manage room amenities" on public.room_amenities;
create policy "authenticated manage room amenities" on public.room_amenities
for all using (public.can_manage_inventory()) with check (public.can_manage_inventory());

drop policy if exists "authenticated manage prices" on public.room_prices;
create policy "authenticated manage prices" on public.room_prices
for all using (public.can_manage_inventory()) with check (public.can_manage_inventory());

drop policy if exists "authenticated manage promotions" on public.promotions;
create policy "authenticated manage promotions" on public.promotions
for all using (public.can_manage_inventory()) with check (public.can_manage_inventory());

drop policy if exists "authenticated manage booking sources" on public.booking_sources;
create policy "authenticated manage booking sources" on public.booking_sources
for all using (public.can_manage_inventory()) with check (public.can_manage_inventory());

drop policy if exists "authenticated read own profile" on public.user_profiles;
create policy "authenticated read own profile" on public.user_profiles
for select using (auth.uid() = id or public.is_super_admin());

drop policy if exists "authenticated manage profiles" on public.user_profiles;
create policy "authenticated manage profiles" on public.user_profiles
for all using (public.is_super_admin()) with check (public.is_super_admin());

drop policy if exists "authenticated manage bookings" on public.bookings;
drop policy if exists "authenticated read bookings" on public.bookings;
drop policy if exists "authenticated insert bookings" on public.bookings;
drop policy if exists "authenticated update bookings" on public.bookings;
drop policy if exists "super admin delete bookings" on public.bookings;
create policy "authenticated read bookings" on public.bookings
for select using (public.current_user_role() in ('super_admin', 'admin', 'manager', 'cskh'));
create policy "authenticated insert bookings" on public.bookings
for insert with check (public.can_manage_bookings());
create policy "authenticated update bookings" on public.bookings
for update using (public.can_manage_bookings()) with check (public.can_manage_bookings());
create policy "super admin delete bookings" on public.bookings
for delete using (public.is_super_admin());

drop policy if exists "authenticated manage booking notes" on public.booking_notes;
create policy "authenticated manage booking notes" on public.booking_notes
for all using (public.can_manage_bookings()) with check (public.can_manage_bookings());

drop policy if exists "authenticated manage payments" on public.payments;
drop policy if exists "authenticated read payments" on public.payments;
drop policy if exists "authenticated insert payments" on public.payments;
drop policy if exists "authenticated update payments" on public.payments;
drop policy if exists "super admin delete payments" on public.payments;
create policy "authenticated read payments" on public.payments
for select using (public.can_manage_payments());
create policy "authenticated insert payments" on public.payments
for insert with check (public.can_manage_payments());
create policy "authenticated update payments" on public.payments
for update using (public.can_manage_payments()) with check (public.can_manage_payments());
create policy "super admin delete payments" on public.payments
for delete using (public.is_super_admin());

drop policy if exists "authenticated manage sheet logs" on public.sheet_sync_logs;
create policy "authenticated manage sheet logs" on public.sheet_sync_logs
for all using (public.can_manage_payments()) with check (public.can_manage_payments());

drop policy if exists "public read room images bucket" on storage.objects;
create policy "public read room images bucket" on storage.objects
for select using (bucket_id = 'room-images');

drop policy if exists "authenticated upload room images" on storage.objects;
create policy "authenticated upload room images" on storage.objects
for insert with check (public.can_manage_inventory() and bucket_id = 'room-images');

drop policy if exists "authenticated update room images" on storage.objects;
create policy "authenticated update room images" on storage.objects
for update using (public.can_manage_inventory() and bucket_id = 'room-images')
with check (public.can_manage_inventory() and bucket_id = 'room-images');

drop policy if exists "authenticated delete room images" on storage.objects;
create policy "authenticated delete room images" on storage.objects
for delete using (public.can_manage_inventory() and bucket_id = 'room-images');

drop policy if exists "public read booking bills bucket" on storage.objects;
create policy "public read booking bills bucket" on storage.objects
for select using (bucket_id = 'booking-bills');

drop policy if exists "authenticated upload booking bills" on storage.objects;
create policy "authenticated upload booking bills" on storage.objects
for insert with check (public.can_manage_payments() and bucket_id = 'booking-bills');

drop policy if exists "authenticated update booking bills" on storage.objects;
create policy "authenticated update booking bills" on storage.objects
for update using (public.can_manage_payments() and bucket_id = 'booking-bills')
with check (public.can_manage_payments() and bucket_id = 'booking-bills');

drop policy if exists "authenticated delete booking bills" on storage.objects;
create policy "authenticated delete booking bills" on storage.objects
for delete using (public.is_super_admin() and bucket_id = 'booking-bills');
