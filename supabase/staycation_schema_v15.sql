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
  quickpay_claim_token uuid,
  quickpay_claimed_at timestamptz,
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
  constraint bookings_time_valid check (checkout_at > checkin_at),
  constraint bookings_committed_requires_room_type check (
    status not in ('holding','deposited','paid','checked_in','checked_out')
    or room_type_id is not null
  ),
  constraint bookings_checkin_requires_room_unit check (
    status not in ('checked_in','checked_out')
    or room_unit_id is not null
  )
);

alter table public.bookings
  add column if not exists quickpay_claim_token uuid,
  add column if not exists quickpay_claimed_at timestamptz;

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

-- Phòng thực tế phải thuộc đúng layout và chi nhánh của booking.
create or replace function public.validate_booking_room_unit_scope()
returns trigger
language plpgsql
set search_path = pg_catalog, pg_temp
as $$
declare
  v_unit public.room_units%rowtype;
begin
  if new.room_unit_id is null then return new; end if;
  select * into v_unit from public.room_units where id = new.room_unit_id;
  if v_unit.id is null
     or new.room_type_id is distinct from v_unit.room_type_id
     or new.branch_id is distinct from v_unit.branch_id then
    raise exception 'Phòng thực tế không thuộc layout/chi nhánh đã chọn';
  end if;
  return new;
end;
$$;

revoke all on function public.validate_booking_room_unit_scope() from public;
drop trigger if exists bookings_room_unit_scope_trigger on public.bookings;
create trigger bookings_room_unit_scope_trigger
before insert or update of room_unit_id, room_type_id, branch_id on public.bookings
for each row execute function public.validate_booking_room_unit_scope();

-- Booking chưa xếp phòng vẫn giữ một suất của layout; chỉ room_unit_id cụ thể
-- mới tham gia exclusion constraint ở trên.
create or replace function public.validate_booking_room_type_capacity()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, pg_temp
as $$
declare
  v_capacity integer;
  v_reserved integer;
begin
  if new.status not in ('holding','deposited','paid','checked_in') then
    return new;
  end if;
  if new.room_type_id is null then
    raise exception 'Booking đã giữ/cọc/thanh toán phải có loại phòng / layout';
  end if;

  if tg_op = 'UPDATE'
     and old.status in ('holding','deposited','paid','checked_in')
     and new.status in ('holding','deposited','paid','checked_in')
     and old.room_type_id is not distinct from new.room_type_id
     and old.checkin_at is not distinct from new.checkin_at
     and old.checkout_at is not distinct from new.checkout_at then
    return new;
  end if;

  perform pg_advisory_xact_lock(hashtextextended(new.room_type_id::text, 0));

  select case
    when count(ru.id) > 0
      then (count(ru.id) filter (where ru.status = 'available'))::integer
    else rt.inventory_count
  end
  into v_capacity
  from public.room_types rt
  left join public.room_units ru on ru.room_type_id = rt.id
  where rt.id = new.room_type_id
  group by rt.inventory_count;

  if v_capacity is null then
    raise exception 'Không tìm thấy loại phòng / layout';
  end if;

  select count(*)::integer
  into v_reserved
  from public.bookings b
  where b.id is distinct from new.id
    and b.public_code is distinct from new.public_code
    and b.room_type_id = new.room_type_id
    and b.status in ('holding','deposited','paid','checked_in')
    and tstzrange(b.checkin_at, b.checkout_at, '[)')
        && tstzrange(new.checkin_at, new.checkout_at, '[)');

  if v_reserved >= v_capacity then
    raise exception 'Layout đã đủ % suất trong khung giờ này', v_capacity
      using hint = 'Đổi giờ, đổi layout hoặc xử lý các booking đang Chờ xếp phòng.';
  end if;
  return new;
end;
$$;

revoke all on function public.validate_booking_room_type_capacity() from public;
drop trigger if exists bookings_room_type_capacity_trigger on public.bookings;
create trigger bookings_room_type_capacity_trigger
before insert or update of room_type_id, checkin_at, checkout_at, status on public.bookings
for each row execute function public.validate_booking_room_type_capacity();

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
  quickpay_write_token uuid,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);

alter table public.payments
  add column if not exists quickpay_write_token uuid;

comment on column public.payments.quickpay_write_token
is 'Credential chỉ dùng trong request ghi bill; trigger xác thực rồi xóa, không lưu token trên payment.';

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
create policy "ops payments update" on public.payments for update to authenticated using (public.is_ops_user()) with check (public.is_ops_user());
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

-- V15.4.2: tự xếp một phòng cụ thể còn trống và giữ chỗ trước khi thu tiền.
drop trigger if exists bookings_guard_quickpay_claim on public.bookings;
update public.bookings
set quickpay_claim_token = null,
    quickpay_claimed_at = null
where quickpay_claim_token is not null or quickpay_claimed_at is not null;

comment on column public.bookings.quickpay_claim_token
is 'MD5 digest dạng UUID của claim token; tuyệt đối không lưu raw token có thể đọc qua PostgREST.';

create or replace function public.guard_booking_quickpay_claim()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, pg_temp
as $$
declare
  v_token_text text;
  v_write_token uuid;
begin
  if old.quickpay_claim_token is null
     or old.quickpay_claimed_at is null
     or old.quickpay_claimed_at <= now() - interval '15 minutes' then
    return new;
  end if;

  v_token_text := nullif(current_setting('app.quickpay_claim_token', true), '');
  if v_token_text is not null then
    v_write_token := md5(v_token_text)::uuid;
  end if;

  if v_write_token is distinct from old.quickpay_claim_token then
    raise exception 'QUICKPAY_BUSY: Booking đang được một CSKH khác xử lý thanh toán'
      using hint = 'Đóng form cũ, chờ QuickPay hiện tại hoàn tất hoặc thử lại sau 15 phút.';
  end if;
  return new;
end;
$$;

revoke all on function public.guard_booking_quickpay_claim() from public;
drop trigger if exists bookings_guard_quickpay_claim on public.bookings;
create trigger bookings_guard_quickpay_claim
before update on public.bookings
for each row execute function public.guard_booking_quickpay_claim();

drop function if exists public.auto_assign_booking_room_unit(uuid,timestamptz);

create or replace function public.auto_assign_booking_room_unit(
  p_booking_id uuid,
  p_expected_updated_at timestamptz default null,
  p_claim_token uuid default null
)
returns table(
  booking_id uuid,
  room_unit_id uuid,
  room_unit_code text,
  room_unit_name text,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = pg_catalog, pg_temp
as $$
declare
  v_booking public.bookings%rowtype;
  v_room_type public.room_types%rowtype;
  v_unit public.room_units%rowtype;
  v_next_status text;
begin
  if public.current_app_role() not in ('super_admin','admin','cskh') then
    raise exception 'Tài khoản không có quyền tự xếp phòng'
      using errcode = '42501';
  end if;

  select b.*
  into v_booking
  from public.bookings b
  where b.id = p_booking_id
  for update;

  if v_booking.id is null then
    raise exception 'Không tìm thấy booking cần xếp phòng';
  end if;

  if p_expected_updated_at is not null
     and v_booking.updated_at is distinct from p_expected_updated_at then
    raise exception 'BOOKING_STALE: Đơn vừa được tài khoản khác cập nhật. Hãy tải lại trước khi tự xếp phòng.'
      using errcode = '40001';
  end if;

  if v_booking.quickpay_claim_token is not null
     and v_booking.quickpay_claimed_at > now() - interval '15 minutes'
     and (
       p_claim_token is null
       or v_booking.quickpay_claim_token <> md5(p_claim_token::text)::uuid
     ) then
    raise exception 'QUICKPAY_BUSY: Booking đang được một CSKH khác xử lý thanh toán'
      using hint = 'Chờ thao tác hiện tại hoàn tất hoặc thử lại sau 15 phút.';
  end if;

  if p_claim_token is not null then
    perform set_config('app.quickpay_claim_token', p_claim_token::text, true);
  end if;

  if v_booking.status not in ('new','consulting','holding','deposited','paid','checked_in','checked_out') then
    raise exception 'Trạng thái % không cho phép tự xếp phòng', v_booking.status
      using errcode = '22023';
  end if;

  if v_booking.room_type_id is null then
    raise exception 'Booking chưa có loại phòng / layout hợp lệ'
      using errcode = '22023';
  end if;

  if v_booking.status in ('checked_in','checked_out') and v_booking.room_unit_id is null then
    raise exception 'Booking đã check-in/check-out nhưng thiếu phòng cụ thể; cần quản trị rà soát dữ liệu';
  end if;

  select rt.*
  into v_room_type
  from public.room_types rt
  where rt.id = v_booking.room_type_id;

  if v_room_type.id is null then
    raise exception 'Không tìm thấy layout đã chọn';
  end if;

  if v_booking.branch_id is not null
     and v_booking.branch_id is distinct from v_room_type.branch_id then
    raise exception 'Chi nhánh booking không khớp layout đã chọn'
      using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(v_booking.room_type_id::text, 0));

  if v_booking.room_unit_id is not null then
    select ru.*
    into v_unit
    from public.room_units ru
    where ru.id = v_booking.room_unit_id
    for update;

    if v_unit.id is null
       or v_unit.room_type_id is distinct from v_booking.room_type_id
       or v_unit.branch_id is distinct from v_room_type.branch_id
       or (v_booking.status not in ('checked_in','checked_out') and v_unit.status <> 'available') then
      raise exception 'Phòng đã chọn không còn hợp lệ/khả dụng; cần CSKH rà soát';
    end if;

    if v_booking.status <> 'checked_out' and exists (
      select 1
      from public.bookings other_booking
      where other_booking.id <> v_booking.id
        and other_booking.room_unit_id = v_unit.id
        and other_booking.status in ('holding','deposited','paid','checked_in')
        and tstzrange(other_booking.checkin_at, other_booking.checkout_at, '[)')
            && tstzrange(v_booking.checkin_at, v_booking.checkout_at, '[)')
    ) then
      raise exception 'Phòng đã chọn vừa bị booking khác giữ trong khung giờ này'
        using hint = 'Mở Sửa đơn để chọn phòng khác hoặc bỏ phòng cũ rồi thử tự xếp lại.';
    end if;
  else
    select ru.*
    into v_unit
    from public.room_units ru
    where ru.room_type_id = v_booking.room_type_id
      and ru.branch_id = v_room_type.branch_id
      and ru.status = 'available'
      and not exists (
        select 1
        from public.bookings other_booking
        where other_booking.id <> v_booking.id
          and other_booking.room_unit_id = ru.id
          and other_booking.status in ('holding','deposited','paid','checked_in')
          and tstzrange(other_booking.checkin_at, other_booking.checkout_at, '[)')
              && tstzrange(v_booking.checkin_at, v_booking.checkout_at, '[)')
      )
    order by ru.sort_order, ru.code
    for update of ru skip locked
    limit 1;

    if v_unit.id is null then
      raise exception 'Không còn phòng cụ thể trống trong khung giờ này'
        using hint = 'Tải lại lịch, đổi giờ/layout hoặc chọn phòng thủ công nếu cần sắp xếp đặc biệt.';
    end if;
  end if;

  v_next_status := case
    when v_booking.status in ('new','consulting') then 'holding'
    else v_booking.status
  end;

  if v_booking.room_unit_id is distinct from v_unit.id
     or v_booking.branch_id is distinct from v_room_type.branch_id
     or v_booking.status is distinct from v_next_status
     or p_claim_token is not null then
    update public.bookings b
    set room_unit_id = v_unit.id,
        branch_id = v_room_type.branch_id,
        status = v_next_status,
        quickpay_claim_token = coalesce(
          case when p_claim_token is null then null else md5(p_claim_token::text)::uuid end,
          b.quickpay_claim_token
        ),
        quickpay_claimed_at = case
          when p_claim_token is not null then now()
          else b.quickpay_claimed_at
        end
    where b.id = v_booking.id
    returning b.* into v_booking;
  end if;

  return query
  select v_booking.id, v_unit.id, v_unit.code, v_unit.unit_name, v_booking.updated_at;
end;
$$;

revoke all on function public.auto_assign_booking_room_unit(uuid,timestamptz,uuid) from public;
revoke all on function public.auto_assign_booking_room_unit(uuid,timestamptz,uuid) from anon;
grant execute on function public.auto_assign_booking_room_unit(uuid,timestamptz,uuid) to authenticated;

comment on function public.auto_assign_booking_room_unit(uuid,timestamptz,uuid)
is 'Nguyên tử chọn room_unit available, giữ phòng thủ công, chuyển sang holding và có thể claim QuickPay trước khi upload bill.';

drop function if exists public.release_quickpay_claim(uuid,uuid);

create or replace function public.release_quickpay_claim(
  p_booking_id uuid,
  p_claim_token uuid
)
returns table(booking_id uuid, released boolean, updated_at timestamptz)
language plpgsql
security definer
set search_path = pg_catalog, pg_temp
as $$
declare
  v_booking public.bookings%rowtype;
  v_released boolean := false;
begin
  if public.current_app_role() not in ('super_admin','admin','cskh') then
    raise exception 'Tài khoản không có quyền xử lý QuickPay'
      using errcode = '42501';
  end if;

  select b.*
  into v_booking
  from public.bookings b
  where b.id = p_booking_id
  for update;

  if v_booking.id is null then
    raise exception 'Không tìm thấy booking cần nhả khóa QuickPay';
  end if;

  if v_booking.quickpay_claim_token is null then
    v_released := true;
  elsif p_claim_token is not null
     and v_booking.quickpay_claim_token = md5(p_claim_token::text)::uuid then
    perform set_config('app.quickpay_claim_token', p_claim_token::text, true);
    update public.bookings b
    set quickpay_claim_token = null,
        quickpay_claimed_at = null
    where b.id = v_booking.id
    returning b.* into v_booking;
    v_released := true;
  end if;

  return query select v_booking.id, v_released, v_booking.updated_at;
end;
$$;

revoke all on function public.release_quickpay_claim(uuid,uuid) from public;
revoke all on function public.release_quickpay_claim(uuid,uuid) from anon;
grant execute on function public.release_quickpay_claim(uuid,uuid) to authenticated;

comment on function public.release_quickpay_claim(uuid,uuid)
is 'Nhả claim QuickPay theo token; idempotent và trả updated_at mới nhất cho client.';

drop function if exists public.finalize_quickpay_booking(
  uuid,timestamptz,uuid,text,integer,integer,integer,text,text,text,text,text
);

create or replace function public.finalize_quickpay_booking(
  p_booking_id uuid,
  p_expected_updated_at timestamptz,
  p_claim_token uuid,
  p_status text,
  p_total_amount integer,
  p_deposit_amount integer,
  p_paid_amount integer,
  p_payment_method text,
  p_deposit_bill_url text,
  p_full_payment_bill_url text,
  p_deposit_bill_path text,
  p_full_payment_bill_path text
)
returns table(booking_id uuid, updated_at timestamptz)
language plpgsql
security definer
set search_path = pg_catalog, pg_temp
as $$
declare
  v_booking public.bookings%rowtype;
begin
  if public.current_app_role() not in ('super_admin','admin','cskh') then
    raise exception 'Tài khoản không có quyền hoàn tất QuickPay'
      using errcode = '42501';
  end if;
  if p_claim_token is null then
    raise exception 'QUICKPAY_CLAIM_REQUIRED: Thiếu khóa QuickPay';
  end if;

  select b.*
  into v_booking
  from public.bookings b
  where b.id = p_booking_id
  for update;

  if v_booking.id is null then
    raise exception 'Không tìm thấy booking cần hoàn tất QuickPay';
  end if;
  if v_booking.quickpay_claim_token is distinct from md5(p_claim_token::text)::uuid
     or v_booking.quickpay_claimed_at is null
     or v_booking.quickpay_claimed_at <= now() - interval '15 minutes' then
    raise exception 'QUICKPAY_CLAIM_EXPIRED: Khóa thanh toán không còn hợp lệ'
      using hint = 'Mở lại QuickPay để kiểm tra dữ liệu live và thử lại.';
  end if;
  if p_expected_updated_at is null
     or v_booking.updated_at is distinct from p_expected_updated_at then
    raise exception 'BOOKING_STALE: Đơn vừa được tài khoản khác cập nhật. Hãy tải lại trước khi hoàn tất thanh toán.'
      using errcode = '40001';
  end if;
  if p_status not in ('holding','deposited','paid','checked_in','checked_out') then
    raise exception 'Trạng thái % không hợp lệ cho QuickPay', p_status
      using errcode = '22023';
  end if;
  if p_total_amount <= 0
     or p_deposit_amount < 0
     or p_paid_amount < 0
     or p_deposit_amount > p_total_amount
     or p_paid_amount > p_total_amount
     or p_paid_amount < p_deposit_amount then
    raise exception 'Số tiền QuickPay không hợp lệ'
      using errcode = '22023';
  end if;
  if p_status = 'deposited'
     and (p_deposit_amount <= 0
          or p_deposit_amount >= p_total_amount
          or p_paid_amount >= p_total_amount
          or (coalesce(p_deposit_bill_path, '') = '' and coalesce(p_deposit_bill_url, '') = '')) then
    raise exception 'Đã cọc cần có số tiền và bill cọc'
      using errcode = '22023';
  end if;
  if p_status in ('paid','checked_in','checked_out')
     and (p_paid_amount <> p_total_amount
          or (coalesce(p_full_payment_bill_path, '') = '' and coalesce(p_full_payment_bill_url, '') = '')) then
    raise exception 'Đã thanh toán/check-in/check-out cần có bill thanh toán'
      using errcode = '22023';
  end if;

  perform set_config('app.quickpay_claim_token', p_claim_token::text, true);
  update public.bookings b
  set status = p_status,
      total_amount = p_total_amount,
      deposit_amount = p_deposit_amount,
      paid_amount = p_paid_amount,
      payment_method = p_payment_method,
      deposit_bill_url = p_deposit_bill_url,
      full_payment_bill_url = p_full_payment_bill_url,
      deposit_bill_path = p_deposit_bill_path,
      full_payment_bill_path = p_full_payment_bill_path,
      quickpay_claim_token = null,
      quickpay_claimed_at = null
  where b.id = v_booking.id
  returning b.* into v_booking;

  return query select v_booking.id, v_booking.updated_at;
end;
$$;

revoke all on function public.finalize_quickpay_booking(
  uuid,timestamptz,uuid,text,integer,integer,integer,text,text,text,text,text
) from public;
revoke all on function public.finalize_quickpay_booking(
  uuid,timestamptz,uuid,text,integer,integer,integer,text,text,text,text,text
) from anon;
grant execute on function public.finalize_quickpay_booking(
  uuid,timestamptz,uuid,text,integer,integer,integer,text,text,text,text,text
) to authenticated;

comment on function public.finalize_quickpay_booking(
  uuid,timestamptz,uuid,text,integer,integer,integer,text,text,text,text,text
) is 'CAS hoàn tất tiền/trạng thái/bill và nhả claim nguyên tử; chỉ token đang giữ booking mới được ghi.';

create or replace function public.guard_payment_quickpay_claim()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, pg_temp
as $$
declare
  v_booking public.bookings%rowtype;
  v_booking_id uuid;
  v_write_token uuid;
  v_claim_active boolean;
begin
  if tg_op = 'UPDATE' then
    if new.booking_id is distinct from old.booking_id then
      raise exception 'Không được chuyển payment sang booking khác'
        using errcode = '22023';
    end if;
  end if;

  v_booking_id := new.booking_id;
  v_write_token := new.quickpay_write_token;

  select b.*
  into v_booking
  from public.bookings b
  where b.id = v_booking_id
  for update;

  if v_booking.id is null then
    raise exception 'Không tìm thấy booking của giao dịch';
  end if;

  v_claim_active := v_booking.quickpay_claim_token is not null
    and v_booking.quickpay_claimed_at is not null
    and v_booking.quickpay_claimed_at > now() - interval '15 minutes';

  if v_claim_active
     and (case when v_write_token is null then null else md5(v_write_token::text)::uuid end)
       is distinct from v_booking.quickpay_claim_token then
    raise exception 'QUICKPAY_BUSY: Booking đang được một CSKH khác xử lý thanh toán'
      using hint = 'Không sửa bill từ form khác trong lúc QuickPay đang mở.';
  end if;
  if not v_claim_active and v_write_token is not null then
    raise exception 'QUICKPAY_CLAIM_EXPIRED: Khóa ghi bill không còn hợp lệ'
      using hint = 'Mở lại QuickPay và thử lại.';
  end if;

  if not v_claim_active then
    -- Ghi payment ngoài QuickPay làm mọi snapshot QuickPay đang mở trở nên stale
    -- và dọn lease cũ/không nhất quán trước khi giao dịch tiếp tục.
    update public.bookings b
    set quickpay_claim_token = null,
        quickpay_claimed_at = null,
        updated_at = clock_timestamp()
    where b.id = v_booking.id;
  end if;

  -- Token chỉ dùng để xác thực request hiện tại, không lưu lại trên payment.
  new.quickpay_write_token := null;
  return new;
end;
$$;

revoke all on function public.guard_payment_quickpay_claim() from public;
drop trigger if exists payments_guard_quickpay_claim on public.payments;
create trigger payments_guard_quickpay_claim
before insert or update on public.payments
for each row execute function public.guard_payment_quickpay_claim();

create or replace function public.prevent_duplicate_payment_proof_insert()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, pg_temp
as $$
begin
  if new.payment_type not in ('deposit','full') or new.payment_status <> 'received' then
    return new;
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(new.booking_id::text || ':' || new.payment_type, 0)
  );

  if exists (
    select 1
    from public.payments p
    where p.booking_id = new.booking_id
      and p.payment_type = new.payment_type
      and p.payment_status = 'received'
  ) then
    raise exception 'Booking đã có bill %; hãy cập nhật bill hiện có thay vì tạo dòng trùng', new.payment_type
      using errcode = '23505';
  end if;
  return new;
end;
$$;

revoke all on function public.prevent_duplicate_payment_proof_insert() from public;
drop trigger if exists payments_prevent_duplicate_proof_insert on public.payments;
create trigger payments_prevent_duplicate_proof_insert
before insert on public.payments
for each row execute function public.prevent_duplicate_payment_proof_insert();

comment on function public.prevent_duplicate_payment_proof_insert()
is 'Advisory lock ngăn hai request đồng thời tạo hai bill received cùng loại cho một booking.';

notify pgrst, 'reload schema';
