-- Unite Staycation V15.4.2 — FIXED 42601 (không còn CASE ... END THEN ở điều kiện claim)
-- Tự kiểm tra và xếp một phòng cụ thể còn trống cho booking đã giữ/cọc/thanh toán.
-- Hàm chạy nguyên tử trên database để hai nhân viên không thể cùng giữ một phòng.

begin;

alter table public.bookings
  add column if not exists quickpay_claim_token uuid,
  add column if not exists quickpay_claimed_at timestamptz;

drop trigger if exists bookings_guard_quickpay_claim on public.bookings;
update public.bookings
set quickpay_claim_token = null,
    quickpay_claimed_at = null
where quickpay_claim_token is not null or quickpay_claimed_at is not null;

comment on column public.bookings.quickpay_claim_token
is 'MD5 digest dạng UUID của claim token; tuyệt đối không lưu raw token có thể đọc qua PostgREST.';

alter table public.payments
  add column if not exists quickpay_write_token uuid;

comment on column public.payments.quickpay_write_token
is 'Credential chỉ dùng trong request ghi bill; trigger xác thực rồi xóa, không lưu token trên payment.';

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

  -- Dùng cùng advisory key với trigger kiểm tra sức chứa theo layout. RPC giữ
  -- khóa này cho đến khi booking đã chuyển sang holding và đã gán room_unit_id.
  perform pg_advisory_xact_lock(hashtextextended(v_booking.room_type_id::text, 0));

  -- Phòng đã chọn thủ công được ưu tiên giữ nguyên, nhưng vẫn phải kiểm tra lại
  -- trạng thái và xung đột trên snapshot đang khóa.
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

commit;
