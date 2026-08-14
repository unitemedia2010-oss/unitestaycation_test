# Thông báo booking web qua Telegram cho CSKH

## Luồng hệ thống

```text
Khách gửi booking
  -> RPC create_public_booking_request lưu booking
  -> trigger tạo một delivery pending trong cùng giao dịch
  -> Supabase Database Webhook gọi Edge Function
  -> Edge Function xác thực webhook, khóa delivery và đọc booking chuẩn
  -> Telegram Bot API gửi vào nhóm CSKH
  -> delivery chuyển sang sent hoặc failed
```

Telegram lỗi không gọi ngược vào giao diện khách và không rollback booking. Khóa
`booking_id + event_type + channel` ngăn cùng một đơn được gửi lặp do webhook chạy
lại.

## Thành phần trong source

- `supabase/migrations/20260814094602_telegram_booking_notifications.sql`:
  transactional outbox, RLS, quyền tối thiểu và trigger enqueue.
- `supabase/functions/notify-booking-telegram/index.ts`: xác thực webhook, khóa
  delivery, gửi Telegram và cập nhật trạng thái.
- `supabase/functions/notify-booking-telegram/_shared.ts`: tạo nội dung tin,
  đổi giờ sang `Asia/Ho_Chi_Minh`, escape HTML và che số liên hệ.
- `supabase/verify_telegram_booking_notifications.sql`: truy vấn kiểm tra và
  smoke test luôn rollback.

## Secrets bắt buộc

Đặt trong **Supabase Edge Function Secrets**, tuyệt đối không đưa vào JavaScript,
HTML, GitHub hoặc ảnh chụp màn hình:

```text
TELEGRAM_BOT_TOKEN
TELEGRAM_CHAT_ID
BOOKING_WEBHOOK_SECRET
```

`BOOKING_WEBHOOK_SECRET` phải là chuỗi ngẫu nhiên tối thiểu 32 ký tự. Supabase tự
cấp các biến kết nối server-side cần thiết cho Edge Function.

## Cấu hình Database Webhook

- Table: `public.booking_notification_deliveries`
- Event: chỉ `INSERT`
- Method: `POST`
- URL:
  `https://icudxncctjselkjcbjvp.supabase.co/functions/v1/notify-booking-telegram`
- Header:
  - `Content-Type: application/json`
  - `x-booking-webhook-secret: <cùng giá trị BOOKING_WEBHOOK_SECRET>`

Edge Function tắt kiểm tra JWT của nền tảng vì Database Webhook không có user
JWT, nhưng request vẫn bắt buộc vượt qua secret riêng bằng so sánh constant-time.

## Nội dung gửi vào nhóm

Tin chỉ chứa mã đơn, chi nhánh/layout, giờ nhận/trả, gói, số khách và vài số cuối
của Zalo/WhatsApp. Tên đầy đủ, email, ghi chú và số liên hệ đầy đủ không được gửi
vào Telegram. Nút mở CSKH dùng dạng:

```text
https://unitestaycation.com.vn/cskh.html?status=new&booking=US-...
```

CSKH phải đăng nhập mới xem được dữ liệu đầy đủ.

## Kiểm tra trước khi bật thật

1. Gửi một lệnh mới có nhắc username bot trong nhóm để lấy `chat_id`.
2. Gửi tin kết nối thử bằng Bot API và xác nhận đúng nhóm.
3. Chạy migration, sau đó chạy các truy vấn read-only và smoke test rollback.
4. Deploy Edge Function với `verify_jwt = false` và đặt đủ ba secret.
5. Tạo Database Webhook theo cấu hình trên.
6. Tạo một booking test được ghi rõ `TEST - KHÔNG XỬ LÝ`; xác minh một tin duy
   nhất xuất hiện, deep-link mở đúng đơn và delivery có trạng thái `sent`.

Nếu request Telegram bị timeout sau khi đã gửi đi, kết quả là không chắc chắn.
Delivery phải được giữ để người vận hành kiểm tra trước khi thử lại, tránh tạo tin
trùng.
