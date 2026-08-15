# Thông báo booking web qua Telegram cho CSKH

## Luồng hệ thống

```text
Khách gửi booking
  -> RPC create_public_booking_v2 tự xếp phòng và tạo booking holding 30 phút
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
- `supabase/migrations/20260814101932_telegram_booking_webhook_vault.sql`:
  `pg_net`, trigger gọi Edge Function bất đồng bộ và khóa webhook đọc từ Vault.
- `supabase/functions/notify-booking-telegram/index.ts`: xác thực webhook, khóa
  delivery, gửi Telegram và cập nhật trạng thái.
- `supabase/functions/notify-booking-telegram/_shared.ts`: tạo nội dung tin,
  đổi giờ sang `Asia/Ho_Chi_Minh`, định dạng 24 giờ và escape toàn bộ HTML.
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

`BOOKING_WEBHOOK_SECRET` phải là chuỗi ngẫu nhiên tối thiểu 32 ký tự. Cùng giá
trị này được lưu mã hóa trong Supabase Vault với tên
`telegram_booking_webhook_secret`. Không đưa giá trị thật vào migration.

## Cấu hình Database Webhook

Migration Vault tạo trigger `telegram_booking_delivery_insert` trên sự kiện
`INSERT` của `public.booking_notification_deliveries`. Trigger đọc khóa đã mã
hóa từ Vault và dùng `pg_net` để POST bất đồng bộ tới:

```text
https://icudxncctjselkjcbjvp.supabase.co/functions/v1/notify-booking-telegram
```

Khóa thật không nằm trong Git, migration hoặc trigger arguments. Nếu Vault hay
`pg_net` tạm lỗi, exception được giữ khỏi giao dịch đặt phòng và delivery vẫn ở
`pending` để vận hành kiểm tra/replay.

Edge Function tắt kiểm tra JWT của nền tảng vì Database Webhook không có user
JWT, nhưng request vẫn bắt buộc vượt qua secret riêng bằng so sánh constant-time.

## Nội dung gửi vào nhóm CSKH riêng

Tin chứa mã đơn, **tên khách đầy đủ**, **số Zalo/WhatsApp đầy đủ**, chi
nhánh, layout, phòng thực tế, giờ nhận/trả theo chuẩn 24 giờ, gói, số khách và
thời hạn giữ phòng. Email và ghi chú riêng không bao giờ được đưa vào Telegram.
Mọi trường động đều được HTML-escape trước khi gửi với `parse_mode=HTML`.

Vì tin có thông tin liên hệ đầy đủ, chỉ cấu hình `TELEGRAM_CHAT_ID` của nhóm CSKH
riêng, kiểm soát thành viên; không dùng nhóm cộng đồng. Nút mở CSKH dùng dạng:

```text
https://unitestaycation.com.vn/cskh.html?status=holding&booking=US-...
```

CSKH phải đăng nhập mới xem được dữ liệu đầy đủ.

## Kiểm tra trước khi bật thật

1. Gửi một lệnh mới có nhắc username bot trong nhóm để lấy `chat_id`.
2. Gửi tin kết nối thử bằng Bot API và xác nhận đúng nhóm.
3. Chạy migration outbox và migration webhook Vault.
4. Deploy Edge Function với `verify_jwt = false`, đặt đủ ba secret và lưu cùng
   khóa webhook trong Vault.
5. Xác minh request không khóa bị chặn `401` và trigger `pg_net` đang bật.
6. Tạo một booking test được ghi rõ `TEST - KHÔNG XỬ LÝ`; xác minh một tin duy
   nhất xuất hiện, có đúng tên/số liên hệ/phòng/thời hạn giữ, không có email hay
   ghi chú, deep-link mở đúng đơn và delivery có trạng thái `sent`.

Nếu request Telegram bị timeout sau khi đã gửi đi, kết quả là không chắc chắn.
Delivery phải được giữ để người vận hành kiểm tra trước khi thử lại, tránh tạo tin
trùng.
