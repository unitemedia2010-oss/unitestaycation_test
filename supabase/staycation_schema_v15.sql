-- Unite Staycation V15 audited & hardened schema
-- Chạy toàn bộ file này trong Supabase SQL Editor cho project mới.
-- Sau khi chạy, tạo user trong Authentication, rồi thêm user_id vào app_profiles với role super_admin/admin/cskh/accountant.

create extension if not exists pgcrypto;
create extension if not exists btree_gist;

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

create table if not exists public.app_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique not null,
  email text unique not null,
  full_name text,
  role text not null default 'cskh' check (role in ('super_admin', 'admin', 'cskh', 'accountant')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists app_profiles_set_updated_at on public.app_profiles;
create trigger app_profiles_set_updated_at before update on public.app_profiles
for each row execute function public.set_updated_at();

create or replace function public.current_app_role()
returns text language sql stable security definer set search_path = public as $$
  select coalesce((select role from public.app_profiles where user_id = auth.uid() and is_active = true limit 1), 'anonymous')
$$;

create or replace function public.is_ops_user()
returns boolean language sql stable security definer set search_path = public as $$
  select public.current_app_role() in ('super_admin','admin','cskh','accountant')
$$;

create or replace function public.is_admin_user()
returns boolean language sql stable security definer set search_path = public as $$
  select public.current_app_role() in ('super_admin','admin')
$$;

create or replace function public.is_super_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select public.current_app_role() = 'super_admin'
$$;

create table if not exists public.branches (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  area text,
  public_address text,
  map_url text,
  private_note text,
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

create table if not exists public.room_units (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches(id) on delete cascade,
  room_type_id uuid not null references public.room_types(id) on delete cascade,
  code text unique not null,
  unit_name text not null,
  floor text,
  status text not null default 'available' check (status in ('available','maintenance','hidden')),
  sort_order integer not null default 0,
  note text,
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
  sale_price integer check (sale_price is null or sale_price >= 0),
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
  discount_percent integer check (discount_percent is null or discount_percent between 0 and 100),
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

create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  public_code text unique not null default ('US-' || to_char(now(), 'YYYYMMDD') || '-' || upper(substr(gen_random_uuid()::text, 1, 6))),
  source_code text references public.booking_sources(code),
  branch_id uuid references public.branches(id),
  room_type_id uuid references public.room_types(id),
  room_unit_id uuid references public.room_units(id),
  customer_name text not null,
  customer_phone text not null,
  customer_email text,
  checkin_at timestamptz not null,
  checkout_at timestamptz not null,
  package_label text,
  guests integer not null default 2 check (guests > 0),
  status text not null default 'new' check (status in ('new', 'consulting', 'holding', 'deposited', 'paid', 'checked_in', 'checked_out', 'cancelled', 'no_show')),
  total_amount integer not null default 0 check (total_amount >= 0),
  deposit_amount integer not null default 0 check (deposit_amount >= 0),
  paid_amount integer not null default 0 check (paid_amount >= 0),
  payment_method text,
  assigned_to text,
  customer_note text,
  internal_note text,
  external_ref text,
  deposit_bill_url text,
  full_payment_bill_url text,
  deposit_bill_path text,
  full_payment_bill_path text,
  sheet_row integer,
  sheet_synced_at timestamptz,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint bookings_time_valid check (checkout_at > checkin_at)
);

-- Chống trùng lịch theo từng phòng thật, chính xác theo giờ.
-- Constraint này chặn các booking active bị giao nhau thời gian trên cùng room_unit_id.
do $$ begin
  alter table public.bookings add constraint bookings_no_overlap_per_unit
  exclude using gist (
    room_unit_id with =,
    tstzrange(checkin_at, checkout_at, '[)') with &&
  ) where (room_unit_id is not null and status in ('holding','deposited','paid','checked_in'));
exception when duplicate_object then null;
end $$;

create table if not exists public.booking_notes (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  note text not null,
  note_type text not null default 'internal',
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  amount integer not null check (amount > 0),
  payment_type text not null default 'deposit' check (payment_type in ('deposit','full','extra','refund')),
  payment_method text,
  payment_status text not null default 'received' check (payment_status in ('pending', 'received', 'refunded', 'failed')),
  paid_at timestamptz not null default now(),
  bill_storage_path text,
  bill_url text,
  uploaded_at timestamptz not null default now(),
  note text,
  created_by uuid default auth.uid(),
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

create index if not exists bookings_checkin_idx on public.bookings(checkin_at);
create index if not exists bookings_checkout_idx on public.bookings(checkout_at);
create index if not exists bookings_status_idx on public.bookings(status);
create index if not exists bookings_room_unit_idx on public.bookings(room_unit_id);
create index if not exists room_units_type_idx on public.room_units(room_type_id);
create unique index if not exists room_prices_base_unique_idx on public.room_prices(room_type_id, package_code) where starts_at is null and ends_at is null;

-- updated_at triggers
do $$ declare t text; begin
  foreach t in array array['branches','room_types','room_units','room_prices','promotions','bookings'] loop
    execute format('drop trigger if exists %I_set_updated_at on public.%I', t, t);
    execute format('create trigger %I_set_updated_at before update on public.%I for each row execute function public.set_updated_at()', t, t);
  end loop;
end $$;

-- Buckets
insert into storage.buckets (id, name, public) values ('room-images', 'room-images', true) on conflict (id) do update set public = true;
insert into storage.buckets (id, name, public) values ('payment-bills', 'payment-bills', false) on conflict (id) do update set public = false;

-- Seed data
insert into public.booking_sources (code, label, is_ota) values
  ('website', 'Website', false), ('zalo', 'Zalo', false), ('fanpage_main', 'Fanpage chính', false), ('fanpage_levansi', 'Fanpage Lê Văn Sỹ', false), ('fanpage_tayho', 'Fanpage Tây Hồ', false), ('instagram', 'Instagram', false), ('agoda', 'Agoda', true), ('airbnb', 'Airbnb', true), ('booking', 'Booking', true), ('walkin', 'Walk-in', false)
on conflict (code) do update set label=excluded.label, is_ota=excluded.is_ota, is_active=true;

insert into public.amenities (code, label_vi, label_en, label_zh, icon, sort_order) values
  ('wifi','Wi-Fi','Wi-Fi','Wi-Fi','wifi',10), ('aircon','Máy lạnh','Air conditioning','空调','snowflake',20), ('bathtub','Bồn tắm','Bathtub','浴缸','bath',30), ('tv','TV / giải trí','TV / Entertainment','电视 / 娱乐','tv',40), ('self-checkin','Check-in tự túc','Self check-in','自助入住','key',50), ('support','Hỗ trợ nhanh','Fast support','快速支持','phone',60)
on conflict (code) do update set label_vi=excluded.label_vi, sort_order=excluded.sort_order, is_active=true;

insert into public.branches (slug, name, area, public_address, sort_order) values
  ('nhieu-tu','Chi nhánh Nhiêu Tứ','Phú Nhuận','Chi nhánh Nhiêu Tứ, Phú Nhuận',10),
  ('phan-tay-ho','Chi nhánh Phan Tây Hồ','Phú Nhuận','Chi nhánh Phan Tây Hồ, Phú Nhuận',20),
  ('le-van-si','Chi nhánh Lê Văn Sĩ','Phú Nhuận','Chi nhánh Lê Văn Sĩ, Phú Nhuận',30)
on conflict (slug) do update set name=excluded.name, area=excluded.area, public_address=excluded.public_address, sort_order=excluded.sort_order, is_active=true;

insert into public.room_types (branch_id, code, name, category, price_tier, vibe, short_line, description, inventory_count, sort_order)
select b.id, v.code, v.name, v.category, v.price_tier, v.vibe, v.short_line, v.description, 3, v.sort_order
from (values
  ('nhieu-tu','C1-ELAN','ÉLAN Layout','Studio bathtub','premium','Chill boutique · bồn tắm · cửa kính thoáng','Studio riêng tư có bồn tắm.','Phù hợp staycation couple, nghỉ ngắn hoặc chụp hình lifestyle.',10),
  ('nhieu-tu','C1-NOIR','NOIR Layout','Private studio','premium','Dark modern · riêng tư · cá tính','Không gian tone tối sang.','Phù hợp khách thích vibe noir, trầm và có gu.',20),
  ('phan-tay-ho','C8-THE-ART','THE ART Layout','Signature bathtub','signature','Signature studio · cửa vòm · bồn tắm','Layout nghệ thuật có bồn tắm.','Nổi bật với ánh sáng, đường cong và bồn tắm rời.',30),
  ('phan-tay-ho','C9-VELVET','VELVET Layout','Warm studio','premium','Warm luxury · cozy · private stay','Studio ấm, dễ nghỉ.','Phù hợp khách cần không gian riêng tư ấm áp.',40),
  ('phan-tay-ho','C10-MIDNIGHT','MIDNIGHT Layout','Compact studio','budget','Compact · giá tốt · tối giản','Layout gọn, giá dễ tiếp cận.','Phù hợp khách cần phòng riêng tư, gọn sạch.',50),
  ('le-van-si','C12-AMOR','Amor Layout','Romantic studio','premium','Romantic · warm · couple stay','Layout lãng mạn, ấm áp.','Phòng couple cho dịp kỷ niệm hoặc nghỉ riêng tư.',60),
  ('le-van-si','C12-ROMA','Roma Layout','Classic studio','premium','Classic · elegant · private stay','Layout cổ điển, riêng tư.','Phòng có cảm giác sang và yên tĩnh.',70)
) as v(slug,code,name,category,price_tier,vibe,short_line,description,sort_order)
join public.branches b on b.slug = v.slug
on conflict (code) do update set name=excluded.name, branch_id=excluded.branch_id, category=excluded.category, price_tier=excluded.price_tier, vibe=excluded.vibe, short_line=excluded.short_line, description=excluded.description, inventory_count=3, sort_order=excluded.sort_order, is_published=true, status='available';

-- 3 phòng thật cho mỗi layout
do $$ declare rt record; i int; begin
  for rt in select id, branch_id, code from public.room_types loop
    for i in 1..3 loop
      insert into public.room_units (branch_id, room_type_id, code, unit_name, sort_order)
      values (rt.branch_id, rt.id, rt.code || '-P' || i, 'Phòng ' || i, i)
      on conflict (code) do update set branch_id=excluded.branch_id, room_type_id=excluded.room_type_id, unit_name=excluded.unit_name, sort_order=excluded.sort_order, status='available';
    end loop;
  end loop;
end $$;

-- Giá mẫu đồng bộ với dữ liệu fallback trong js/rooms.js
insert into public.room_prices (room_type_id, package_code, package_label, duration_hours, base_price, sort_order)
select rt.id, v.package_code, v.package_label, v.duration_hours, v.price, v.sort_order
from (values
  ('C1-ELAN','3h','3 tiếng',3,299000,10), ('C1-ELAN','4h','4 tiếng',4,379000,20), ('C1-ELAN','8h','8 tiếng',8,579000,30), ('C1-ELAN','day','Theo ngày',16,799000,40),
  ('C1-NOIR','3h','3 tiếng',3,299000,10), ('C1-NOIR','4h','4 tiếng',4,379000,20), ('C1-NOIR','8h','8 tiếng',8,579000,30), ('C1-NOIR','day','Theo ngày',16,799000,40),
  ('C8-THE-ART','3h','3 tiếng',3,299000,10), ('C8-THE-ART','4h','4 tiếng',4,379000,20), ('C8-THE-ART','8h','8 tiếng',8,579000,30), ('C8-THE-ART','day','Theo ngày',16,759000,40),
  ('C9-VELVET','3h','3 tiếng',3,299000,10), ('C9-VELVET','4h','4 tiếng',4,379000,20), ('C9-VELVET','8h','8 tiếng',8,579000,30), ('C9-VELVET','day','Theo ngày',16,759000,40),
  ('C10-MIDNIGHT','3h','3 tiếng',3,259000,10), ('C10-MIDNIGHT','4h','4 tiếng',4,359000,20), ('C10-MIDNIGHT','8h','8 tiếng',8,500000,30), ('C10-MIDNIGHT','day','Theo ngày',16,659000,40),
  ('C12-AMOR','3h','3 tiếng',3,329000,10), ('C12-AMOR','4h','4 tiếng',4,409000,20), ('C12-AMOR','8h','8 tiếng',8,629000,30), ('C12-AMOR','day','Theo ngày',16,829000,40),
  ('C12-ROMA','3h','3 tiếng',3,299000,10), ('C12-ROMA','4h','4 tiếng',4,379000,20), ('C12-ROMA','8h','8 tiếng',8,579000,30), ('C12-ROMA','day','Theo ngày',16,759000,40)
) as v(room_code,package_code,package_label,duration_hours,price,sort_order)
join public.room_types rt on rt.code = v.room_code
on conflict (room_type_id, package_code) where starts_at is null and ends_at is null do update set package_label=excluded.package_label, duration_hours=excluded.duration_hours, base_price=excluded.base_price, sort_order=excluded.sort_order, is_active=true;

-- Storage policies
-- Lưu ý: policies thuộc schema storage nên drop riêng trước khi tạo lại.
drop policy if exists "ops can upload room images" on storage.objects;
drop policy if exists "public can read room images" on storage.objects;
drop policy if exists "ops can manage room images" on storage.objects;
drop policy if exists "ops can delete room images" on storage.objects;
drop policy if exists "ops can upload payment bills" on storage.objects;
drop policy if exists "ops can read payment bills" on storage.objects;
drop policy if exists "ops can delete payment bills" on storage.objects;
create policy "ops can upload room images" on storage.objects for insert to authenticated with check (bucket_id = 'room-images' and public.is_admin_user());
create policy "public can read room images" on storage.objects for select to anon, authenticated using (bucket_id = 'room-images');
create policy "ops can manage room images" on storage.objects for update to authenticated using (bucket_id = 'room-images' and public.is_admin_user()) with check (bucket_id = 'room-images' and public.is_admin_user());
create policy "ops can delete room images" on storage.objects for delete to authenticated using (bucket_id = 'room-images' and public.is_admin_user());
create policy "ops can upload payment bills" on storage.objects for insert to authenticated with check (bucket_id = 'payment-bills' and public.is_ops_user());
create policy "ops can read payment bills" on storage.objects for select to authenticated using (bucket_id = 'payment-bills' and public.is_ops_user());
create policy "ops can delete payment bills" on storage.objects for delete to authenticated using (bucket_id = 'payment-bills' and public.is_admin_user());

-- RLS
alter table public.app_profiles enable row level security;
alter table public.branches enable row level security;
alter table public.room_types enable row level security;
alter table public.room_units enable row level security;
alter table public.room_images enable row level security;
alter table public.amenities enable row level security;
alter table public.room_amenities enable row level security;
alter table public.room_prices enable row level security;
alter table public.promotions enable row level security;
alter table public.booking_sources enable row level security;
alter table public.bookings enable row level security;
alter table public.booking_notes enable row level security;
alter table public.payments enable row level security;
alter table public.sheet_sync_logs enable row level security;

-- Drop old policies if re-run
-- Supabase không hỗ trợ create policy if not exists trên mọi version, nên dùng do-block an toàn.
do $$ declare p record; begin
  for p in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname='public'
      and tablename = any(array[
        'app_profiles','branches','room_types','room_units','room_images','amenities',
        'room_amenities','room_prices','promotions','booking_sources','bookings',
        'booking_notes','payments','sheet_sync_logs'
      ])
  loop
    execute format('drop policy if exists %I on public.%I', p.policyname, p.tablename);
  end loop;
end $$;

-- Profiles
create policy "profile read own or super" on public.app_profiles for select to authenticated using (user_id = auth.uid() or public.is_super_admin());
create policy "super admin manage profiles" on public.app_profiles for all to authenticated using (public.is_super_admin()) with check (public.is_super_admin());

-- Public read catalogue; admin manage catalogue
create policy "public read active branches" on public.branches for select to anon, authenticated using (is_active = true or public.is_ops_user());
create policy "admin manage branches" on public.branches for all to authenticated using (public.is_admin_user()) with check (public.is_admin_user());
create policy "public read published room types" on public.room_types for select to anon, authenticated using (is_published = true or public.is_ops_user());
create policy "admin manage room types" on public.room_types for all to authenticated using (public.is_admin_user()) with check (public.is_admin_user());
create policy "ops read room units" on public.room_units for select to authenticated using (public.is_ops_user());
create policy "admin manage room units" on public.room_units for all to authenticated using (public.is_admin_user()) with check (public.is_admin_user());
create policy "public read room images" on public.room_images for select to anon, authenticated using (is_active = true or public.is_ops_user());
create policy "admin manage room images" on public.room_images for all to authenticated using (public.is_admin_user()) with check (public.is_admin_user());
create policy "public read amenities" on public.amenities for select to anon, authenticated using (is_active = true or public.is_ops_user());
create policy "admin manage amenities" on public.amenities for all to authenticated using (public.is_admin_user()) with check (public.is_admin_user());
create policy "public read room amenities" on public.room_amenities for select to anon, authenticated using (true);
create policy "admin manage room amenities" on public.room_amenities for all to authenticated using (public.is_admin_user()) with check (public.is_admin_user());
create policy "public read prices" on public.room_prices for select to anon, authenticated using (is_active = true or public.is_ops_user());
create policy "admin manage prices" on public.room_prices for all to authenticated using (public.is_admin_user()) with check (public.is_admin_user());
create policy "public read promotions" on public.promotions for select to anon, authenticated using (is_active = true or public.is_ops_user());
create policy "admin manage promotions" on public.promotions for all to authenticated using (public.is_admin_user()) with check (public.is_admin_user());
create policy "ops read booking sources" on public.booking_sources for select to authenticated using (public.is_ops_user());

-- Booking permissions
create policy "ops read bookings" on public.bookings for select to authenticated using (public.is_ops_user());
create policy "cskh create bookings" on public.bookings for insert to authenticated with check (public.current_app_role() in ('super_admin','admin','cskh'));
create policy "cskh update bookings" on public.bookings for update to authenticated using (public.current_app_role() in ('super_admin','admin','cskh','accountant')) with check (public.current_app_role() in ('super_admin','admin','cskh','accountant'));
create policy "admin delete bookings" on public.bookings for delete to authenticated using (public.current_app_role() in ('super_admin','admin'));
create policy "ops notes" on public.booking_notes for all to authenticated using (public.is_ops_user()) with check (public.is_ops_user());
create policy "ops payments read" on public.payments for select to authenticated using (public.is_ops_user());
create policy "ops payments insert" on public.payments for insert to authenticated with check (public.is_ops_user());
create policy "accounting update payments" on public.payments for update to authenticated using (public.current_app_role() in ('super_admin','admin','accountant')) with check (public.current_app_role() in ('super_admin','admin','accountant'));
create policy "ops sync logs" on public.sheet_sync_logs for all to authenticated using (public.is_ops_user()) with check (public.is_ops_user());

-- RPC: xem conflict trước khi lưu
create or replace function public.check_booking_conflicts(
  p_room_unit_id uuid,
  p_checkin_at timestamptz,
  p_checkout_at timestamptz,
  p_ignore_booking_id uuid default null
)
returns table(id uuid, public_code text, customer_name text, checkin_at timestamptz, checkout_at timestamptz, status text)
language sql stable security definer set search_path = public as $$
  select b.id, b.public_code, b.customer_name, b.checkin_at, b.checkout_at, b.status
  from public.bookings b
  where public.is_ops_user()
    and b.room_unit_id = p_room_unit_id
    and b.status in ('holding','deposited','paid','checked_in')
    and (p_ignore_booking_id is null or b.id <> p_ignore_booking_id)
    and tstzrange(b.checkin_at, b.checkout_at, '[)') && tstzrange(p_checkin_at, p_checkout_at, '[)')
  order by b.checkin_at
$$;


-- V15 hardening: RPC chỉ dành cho tài khoản vận hành đã đăng nhập.
revoke all on function public.check_booking_conflicts(uuid,timestamptz,timestamptz,uuid) from public;
revoke all on function public.check_booking_conflicts(uuid,timestamptz,timestamptz,uuid) from anon;
grant execute on function public.check_booking_conflicts(uuid,timestamptz,timestamptz,uuid) to authenticated;
