-- Unite Staycation V15.5 — ngừng hoạt động chi nhánh an toàn, không xóa lịch sử booking.
-- Chạy toàn bộ file này một lần trong Supabase SQL Editor của đúng project đang dùng.

begin;

drop policy if exists "admin manage branches" on public.branches;
drop policy if exists "admin insert branches" on public.branches;
drop policy if exists "admin update branches" on public.branches;
drop policy if exists "super admin delete empty branches" on public.branches;

create policy "admin insert branches"
on public.branches
for insert
to authenticated
with check (public.is_admin_user());

create policy "admin update branches"
on public.branches
for update
to authenticated
using (public.is_admin_user())
with check (public.is_admin_user());

-- Chỉ cho Super Admin xóa một chi nhánh thực sự trống.
-- Booking, layout hoặc phòng còn tham chiếu sẽ chặn thao tác thay vì bị cascade mất dữ liệu.
create policy "super admin delete empty branches"
on public.branches
for delete
to authenticated
using (
  public.is_super_admin()
  and not exists (select 1 from public.room_types rt where rt.branch_id = branches.id)
  and not exists (select 1 from public.room_units ru where ru.branch_id = branches.id)
  and not exists (select 1 from public.bookings bk where bk.branch_id = branches.id)
);

drop policy if exists "public read published room types" on public.room_types;
create policy "public read published room types"
on public.room_types
for select
to anon, authenticated
using (
  public.is_ops_user()
  or (
    is_published = true
    and exists (
      select 1
      from public.branches br
      where br.id = room_types.branch_id
        and br.is_active = true
    )
  )
);

drop function if exists public.set_branch_active(uuid, boolean);
create function public.set_branch_active(
  p_branch_id uuid,
  p_is_active boolean
)
returns table(
  branch_id uuid,
  branch_name text,
  is_active boolean,
  layout_count bigint,
  unit_count bigint,
  booking_count bigint
)
language plpgsql
security invoker
set search_path = pg_catalog, pg_temp
as $$
declare
  v_branch public.branches%rowtype;
begin
  if public.current_app_role() not in ('super_admin', 'admin') then
    raise exception 'Tài khoản không có quyền cập nhật chi nhánh'
      using errcode = '42501';
  end if;

  update public.branches br
  set is_active = p_is_active
  where br.id = p_branch_id
  returning br.* into v_branch;

  if not found then
    raise exception 'Không tìm thấy chi nhánh hoặc tài khoản không có quyền cập nhật'
      using errcode = 'P0002';
  end if;

  return query
  select
    v_branch.id,
    v_branch.name,
    v_branch.is_active,
    (select count(*) from public.room_types rt where rt.branch_id = v_branch.id),
    (select count(*) from public.room_units ru where ru.branch_id = v_branch.id),
    (select count(*) from public.bookings bk where bk.branch_id = v_branch.id);
end;
$$;

comment on function public.set_branch_active(uuid, boolean)
is 'Ẩn/mở lại chi nhánh mà không xóa layout, phòng, booking, payment hoặc bill lịch sử.';

revoke all on function public.set_branch_active(uuid, boolean) from public;
revoke all on function public.set_branch_active(uuid, boolean) from anon;
grant execute on function public.set_branch_active(uuid, boolean) to authenticated;

notify pgrst, 'reload schema';

commit;
