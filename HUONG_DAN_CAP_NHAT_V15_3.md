# Cập nhật CSKH lên V15.3

## 1. Sao lưu project đang dùng

Tạo một bản copy thư mục website trước khi ghi đè file.

## 2. Chép đè các file trong patch

Chép đúng vị trí:

```text
cskh.html
css/ops.css
js/cskh.js
js/ops-data.js
```

Không thay `js/supabase-config.js`, vì file patch không chứa file cấu hình này.

## 3. Chạy migration Supabase

Mở Supabase → SQL Editor → New query, sau đó copy toàn bộ nội dung file:

```text
supabase/migration_v15_3_payment_proofs.sql
```

Bấm Run. Kết quả đúng là `Success` hoặc `Success. No rows returned`.

## 4. Làm mới trình duyệt

Nhấn `Ctrl + F5`. Nếu dùng GitHub Pages, upload đè các file và chờ Pages build xong rồi mở lại bằng tab ẩn danh.

## 5. Luồng thao tác mới

1. Nhập thông tin khách, phòng, thời gian.
2. Nhập tổng tiền và tiền cọc.
3. Chọn bill cọc trong bước 4 và bấm `Lưu booking & bill`.
4. Booking tự chuyển sang `Đã cọc`.
5. Khi khách thanh toán phần còn lại, bấm `Cập nhật bill` ở danh sách.
6. Tải bill thanh toán, lưu lại; booking tự chuyển sang `Đã thanh toán`.
7. Chỉ sau khi có bill thanh toán mới đẩy tiếp sang check-in/check-out.
