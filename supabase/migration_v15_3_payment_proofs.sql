-- Unite Staycation V15.3
-- Cho phép CSKH sửa/cập nhật chứng từ thanh toán đã tải nhầm.
-- Chạy một lần trong Supabase SQL Editor nếu project đã tạo từ V15/V15.2.

begin;

drop policy if exists "accounting update payments" on public.payments;
drop policy if exists "ops payments update" on public.payments;

create policy "ops payments update"
on public.payments
for update
to authenticated
using (public.is_ops_user())
with check (public.is_ops_user());

commit;
