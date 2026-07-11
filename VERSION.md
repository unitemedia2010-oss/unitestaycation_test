# Unite Staycation V15.3

## CSKH booking-first & kiểm soát bill

- Đưa form nhập booking lên đầu trang, trước danh sách và lịch tuần.
- Tích hợp bill cọc và bill thanh toán trực tiếp trong form tạo/sửa booking.
- Tiền cọc tự đồng bộ sang khu vực bill cọc.
- Khi có tiền cọc + bill cọc, trạng thái tự chuyển sang `Đã cọc`.
- Khi có bill thanh toán phần còn lại, trạng thái tự chuyển sang `Đã thanh toán`.
- Không cho đẩy từ `Đã cọc` lên `Đã thanh toán` nếu chưa có bill thanh toán.
- Thêm nút `Bây giờ` cho ngày giờ thu cọc/thanh toán.
- Hiển thị rõ `Xem bill cọc` và `Xem bill thanh toán` ngay trong danh sách CSKH.
- Khi thay bill đã tải nhầm, hệ thống cập nhật dòng payment gần nhất thay vì cộng trùng tiền.
- Giữ nguyên import backup CSV/XLS/XLSX, Supabase live và Google Sheet backup.

## Migration cần chạy cho project đã tạo trước V15.3

Chạy file sau trong Supabase SQL Editor:

```text
supabase/migration_v15_3_payment_proofs.sql
```

Migration chỉ bổ sung quyền cập nhật chứng từ cho tài khoản vận hành hợp lệ; không xóa dữ liệu.
