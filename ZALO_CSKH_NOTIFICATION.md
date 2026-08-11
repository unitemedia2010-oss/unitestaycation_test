# Thông báo booking web qua Zalo cho CSKH

## Trạng thái hiện tại

App **chưa gửi Zalo tự động**. Booking web được lưu vào Supabase; trang Admin/CSKH đang mở sẽ kiểm tra đơn mới định kỳ rồi phát chuông hoặc Browser Notification.

Không gọi Zalo trực tiếp từ `js/app.js`: token đặt trong frontend có thể bị bất kỳ khách truy cập nào đọc và lợi dụng.

## Luồng nên triển khai

```text
Khách gửi booking
  → RPC create_public_booking_request lưu booking thành công
  → Database Webhook của bảng bookings (INSERT)
  → Supabase Edge Function zalo-booking-notifier
  → Zalo Official Account OpenAPI
  → Nhóm GMF của CSKH
```

Database Webhook chạy sau khi booking đã được lưu. Nếu Zalo tạm lỗi, booking của khách vẫn thành công và hệ thống retry riêng; không trả lỗi đặt phòng giả cho khách.

## Tài khoản/dữ liệu cần chuẩn bị

- Zalo Official Account đã xác thực và gói có quyền dùng OpenAPI/nhóm GMF.
- Zalo App đã liên kết đúng OA.
- ID nhóm GMF dành riêng cho CSKH, hoặc danh sách OA UID nhân viên nếu tài khoản chưa hỗ trợ GMF.
- Quy trình cấp và làm mới access token theo tài liệu Zalo OA hiện hành.

Không gửi access token, refresh token hoặc App Secret qua chat. Cấu hình trực tiếp trong **Supabase Edge Function Secrets** với các tên dự kiến:

```text
ZALO_OA_ACCESS_TOKEN
ZALO_OA_REFRESH_TOKEN
ZALO_GMF_GROUP_ID
ZALO_WEBHOOK_SECRET
```

## Nội dung thông báo đề xuất

```text
🔔 Đơn web mới US-…
Phan Tây Hồ · THE ART
18:00 17/07 → 22:00 17/07 · 2 khách
Liên hệ: ***758
Mở CSKH: https://TEN-MIEN/cskh.html?status=new&booking=US-…
```

Chỉ hiện số điện thoại rút gọn trong nhóm. Nhân viên phải đăng nhập CSKH để xem thông tin đầy đủ và ghi thao tác vào hệ thống.

## Yêu cầu kỹ thuật trước khi bật live

- Chỉ xử lý `INSERT` của bảng `bookings` và `source_code = 'website'`.
- Dùng khóa chống gửi trùng theo `booking_id + event_type`.
- Có trạng thái `pending/sent/failed`, số lần thử, lịch retry và lỗi cuối.
- Xác thực webhook bằng secret riêng; không tin payload từ request công khai.
- Không log tên đầy đủ, số điện thoại đầy đủ, email hoặc ghi chú riêng của khách.
- Zalo lỗi không được rollback booking và không được làm giao diện khách báo đặt phòng thất bại.
- Kiểm thử bằng OA/nhóm test trước, sau đó mới đổi sang nhóm CSKH thật.

## Khi nào có thể hoàn tất tích hợp

Sau khi OA/App/nhóm GMF đã sẵn sàng, bổ sung:

- `supabase/functions/zalo-booking-notifier/index.ts`
- bảng outbox + trigger chống gửi trùng
- Database Webhook trỏ đến Edge Function
- deep-link mở đúng booking trong `cskh.html`

Endpoint và payload gửi nhóm phải lấy đúng từ tài liệu OpenAPI đang áp dụng cho Zalo App/OA của Unite; không hard-code theo ví dụ cũ trên Internet.
