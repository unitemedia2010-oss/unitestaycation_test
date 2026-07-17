# Cập nhật Unite Staycation lên V15.4.2

Nếu Supabase từng báo `42601: syntax error at end of input` tại dòng có `case when p_claim_token`, hãy thay nội dung SQL Editor bằng file V15.4.2 hiện tại rồi chạy lại **toàn bộ file**. Lần chạy lỗi nằm trong transaction nên không cần chạy riêng phần còn lại.

## 1. Sao lưu

- Sao lưu database Supabase và thư mục web.
- Không ghi đè `js/supabase-config.js` bằng file cấu hình mẫu.

## 2. Upload frontend

Upload đồng bộ các file V15.4.2:

- `index.html`, `rooms.html`, `room.html`
- `cskh.html`, `dashboard.html`, `admin.html`
- `css/custom.css`, `css/ops.css`
- `js/app.js`, `js/cskh.js`, `js/ops-data.js`

Không upload riêng lẻ một file JS vì các asset HTML phải được cache-bust đồng bộ; bản vá giao diện hiện dùng revision `v15.4.6`.

## 3. Chạy migration Supabase

Project đã ở V15.4.1:

```text
supabase/migration_v15_4_2_auto_room_assignment.sql
```

Project đã từng chạy V15.4 nhưng chưa chạy V15.4.1:

```text
supabase/migration_v15_4_1_unassigned_payments.sql
supabase/migration_v15_4_2_auto_room_assignment.sql
```

Project đã ở V15.3:

```text
supabase/migration_v15_4_booking_flow.sql
supabase/migration_v15_4_1_unassigned_payments.sql
supabase/migration_v15_4_2_auto_room_assignment.sql
```

Project V15/V15.2:

```text
supabase/migration_v15_3_payment_proofs.sql
supabase/migration_v15_4_booking_flow.sql
supabase/migration_v15_4_1_unassigned_payments.sql
supabase/migration_v15_4_2_auto_room_assignment.sql
```

Project mới tạo từ full schema hiện tại:

```text
supabase/staycation_schema_v15.sql
supabase/migration_v15_3_payment_proofs.sql
supabase/migration_v15_4_booking_flow.sql
supabase/migration_v15_4_1_unassigned_payments.sql
supabase/migration_v15_4_2_auto_room_assignment.sql
```

Source hiện tại đã tích hợp luật V15.4.1 và RPC V15.4.2 vào full schema, nhưng database đã chạy bản cũ không tự thay đổi. Vì vậy, khi nâng cấp một project đang vận hành, luôn chạy `migration_v15_4_1_unassigned_payments.sql` rồi `migration_v15_4_2_auto_room_assignment.sql` theo đúng thứ tự nếu hai bản vá này chưa được áp dụng.

V15.4 tạo RPC public booking, thu hồi quyền anon insert trực tiếp và kiểm tra thời lượng gói. V15.4.1 cho phép booking giữ suất layout trước khi có phòng cụ thể. V15.4.2 thêm RPC tự xếp phòng nguyên tử: khóa booking/layout, giữ phòng thủ công nếu còn hợp lệ, chọn một unit trống theo `sort_order` và chuyển `Mới/Đang tư vấn` sang `Giữ phòng`. Các migration chạy trong transaction và không xóa booking cũ.

Nên chạy V15.4.2 lúc ít nhân viên đang mở QuickPay. Migration chủ động xóa claim tạm của phiên bản cũ và làm mới `updated_at`; các form đang mở từ trước thời điểm deploy cần đóng rồi mở lại.

Trong QuickPay, hệ thống tải lại dữ liệu live và tự xếp/kiểm tra phòng **trước khi upload bill**. Nếu booking vừa bị sửa, hết phòng hoặc RPC chưa được deploy, QuickPay dừng trước bước lưu chứng từ. Nếu tự xếp đã thành công nhưng upload bill gặp lỗi sau đó, phòng vẫn được giữ; CSKH sửa lỗi và thử lại bill, không tạo booking mới.

QuickPay dùng claim 15 phút để chặn hai CSKH cùng xử lý một booking, giới hạn mỗi bill 15 MB và fail-closed nếu phiên đăng nhập hết giữa chừng. Form `Sửa đơn` lưu bằng CAS và bị database từ chối nếu booking đang có QuickPay claim. Payment guard kiểm token trên cả insert/update, trigger chặn hai insert bill `deposit`/`full` đồng thời, còn RPC `finalize_quickpay_booking` chốt tiền/trạng thái theo claim + `updated_at` rồi nhả claim ngay trong cùng giao dịch; frontend không được báo thành công nếu booking hoặc payment chưa lưu trên Supabase. Claim được lưu dạng băm trong database, còn token thô chỉ tồn tại trong bộ nhớ của tab và không đi vào `localStorage`.

Khi thay bill, file cũ chỉ được xóa sau khi booking đã chốt thành công và thật sự trỏ tới file mới. Nếu kết nối lỗi đúng lúc ghi payment khiến chưa thể xác định request đã commit hay chưa, hệ thống giữ file mới để CSKH đối soát thay vì xóa nhầm chứng từ đã được database nhận.

Trong lúc QuickPay đang upload/lưu, tab hiện tại chặn đóng popup và chặn mở thêm luồng thanh toán khác. Với dữ liệu cũ có `tiền cọc = tổng đơn`, nếu bill cọc còn tồn tại thì CSKH có thể xác nhận dùng bill đó làm chứng từ thu đủ mà không tạo thêm payment; nếu không có bill gốc, hệ thống yêu cầu quản trị đối soát thay vì tạo giao dịch 0 đồng.

## 4. Kiểm tra sau triển khai

- Public gửi booking và nhận mã yêu cầu.
- Chọn 14:00; CSKH vẫn hiển thị 14:00, không phải 07:00.
- Booking `Mới`/`Đang tư vấn` xuất hiện trên lịch.
- Booking chưa gán phòng nằm ở hàng `Chờ xếp phòng`.
- Chọn P2, lưu và mở lại vẫn là P2.
- Booking `Giữ phòng`/`Đã cọc`/`Đã thanh toán` lưu được khi chưa xếp phòng cụ thể nhưng phải có layout.
- Booking chưa xếp phòng vẫn trừ một suất của layout; khi layout đủ suất, booking active tiếp theo bị UI và database từ chối.
- Không thể check-in/check-out nếu chưa chọn phòng cụ thể.
- QuickPay của booking chưa xếp phòng tự gán một unit hợp lệ trước khi lưu bill; sau khi thành công booking chuyển vào đúng hàng phòng trên lịch.
- Nếu CSKH đã chọn P2/P3 thủ công, QuickPay giữ đúng phòng đó và chỉ kiểm tra lại khả dụng/xung đột.
- Khi không còn phòng cụ thể phù hợp, QuickPay báo lỗi trước khi upload bill và không tạo giao dịch payment.
- Hai CSKH tự xếp đồng thời không thể giữ cùng một phòng; request thua cuộc phải tải lại lịch.
- Booking dữ liệu cũ chưa có unit hiển thị nút `Tự xếp phòng`; bấm thành công thì booking rời hàng `Cần xếp phòng`.
- Booking đang trỏ tới layout/phòng lịch sử đã ẩn vẫn giữ lựa chọn đó khi sửa thông tin khác và vẫn xuất hiện trên lịch tuần.
- Gói 3/4 giờ ẩn `Số đêm` trên mobile; gói ngày hiện lại.
- Thu thiếu phần còn lại không thể chuyển booking sang `Đã thanh toán`.
- Tin nhắn Zalo/Fanpage hiển thị đúng check-in → check-out có cả ngày và giờ.
- Sửa giờ trong modal thì nội dung tin nhắn và link có tham số `checkin` được cập nhật theo.
- Dán lại tin nhắn vào Quick Paste phải điền đúng check-in/check-out, không tự đổi về 14:00.
- Kiểm tra các asset thay đổi đang tải với query `v=v15.4.6`, sau đó refresh cứng bằng `Ctrl+F5`.

## 5. Google Sheet backup

Supabase là nguồn dữ liệu của danh sách và lịch CSKH. Google Sheet chỉ là backup ghi một chiều.

Frontend gửi Apps Script bằng `no-cors`, vì vậy trạng thái `Đã gửi` chưa chứng minh Sheet đã ghi thành công. Phải kiểm tra dòng thật trong tab `Bookings` hoặc mục **Apps Script → Executions**. `apps-script/Code.gs` hiện không cung cấp API `action=list`; không dùng `action=list` để đánh giá lịch CSKH.
