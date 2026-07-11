# CHECKLIST KIỂM THỬ V15 TRƯỚC KHI DÙNG THẬT

Đánh dấu từng mục sau. Không bỏ qua lỗi dù chỉ xảy ra một lần.

## A. Cấu hình

- [ ] `js/supabase-config.js` có đúng Project URL.
- [ ] Chỉ dùng publishable/anon key trong frontend.
- [ ] Không có service role key trong repository GitHub.
- [ ] Full schema V15 đã chạy cho project mới, hoặc migration V15 đã chạy cho project cũ.
- [ ] Bucket `room-images` là public.
- [ ] Bucket `payment-bills` là private.

## B. Đăng nhập và phân quyền

Tạo bốn user test và gán role tương ứng.

- [ ] Super Admin vào được Admin, CSKH, Dashboard và thấy tab Tài khoản.
- [ ] Admin vào được Admin, CSKH, Dashboard nhưng không thấy tab Tài khoản.
- [ ] CSKH chỉ vào được CSKH.
- [ ] Accountant chỉ vào được Dashboard.
- [ ] User Auth chưa có `app_profiles` bị từ chối.
- [ ] User `is_active=false` bị từ chối.
- [ ] Đăng xuất xong không vào lại trang vận hành bằng nút Back.

## C. Admin — chi nhánh và layout

- [ ] Thêm một chi nhánh test.
- [ ] Thêm layout mới trong chi nhánh test với 3 phòng.
- [ ] Kiểm tra `room_units` sinh đủ `P1`, `P2`, `P3`.
- [ ] Mở CSKH và thấy layout/phòng mới mà không sửa `rooms.js`.
- [ ] Giảm inventory từ 3 xuống 2; phòng thứ 3 không còn book được.
- [ ] Tăng lại 3; phòng thứ 3 xuất hiện lại.
- [ ] Chuyển một phòng thật sang `maintenance` trong Supabase; CSKH không cho chọn phòng đó.

## D. Admin — giá và khuyến mãi

- [ ] Sửa giá gói 3 tiếng của một layout.
- [ ] Refresh Admin và kiểm tra giá vẫn đúng.
- [ ] Mở website public và kiểm tra giá mới.
- [ ] Bật giảm 10% cho một layout.
- [ ] Website hiện badge, giá gốc gạch ngang và giá giảm.
- [ ] Tắt khuyến mãi; website không còn giá giảm sau refresh cứng.
- [ ] Bật khuyến mãi “Tất cả layout” và kiểm tra nhiều layout.
- [ ] Xóa record khuyến mãi test nếu không dùng.

## E. Ảnh phòng

- [ ] Upload 3 ảnh cho một layout.
- [ ] Website public hiển thị ảnh live.
- [ ] Đổi thứ tự ảnh và kiểm tra cover thay đổi đúng.
- [ ] Xóa một ảnh trong Admin.
- [ ] Record `room_images` biến mất.
- [ ] File tương ứng trong Storage cũng biến mất.
- [ ] Ảnh trên điện thoại tải ổn và không quá nặng.

## F. Booking và chống trùng lịch

- [ ] Tạo booking trạng thái `Mới`.
- [ ] Chuyển booking sang `Giữ phòng`.
- [ ] Tạo booking khác cùng phòng, cùng khung giờ, trạng thái `Giữ phòng`.
- [ ] UI chặn lưu.
- [ ] Thử gửi trực tiếp/đổi dữ liệu để vượt UI; database vẫn từ chối vì exclusion constraint.
- [ ] Booking cùng layout nhưng khác phòng thật lưu được.
- [ ] Booking cùng phòng nhưng check-in đúng bằng checkout booking trước lưu được.
- [ ] Booking hủy không chặn booking mới.
- [ ] Lỗi Supabase không tạo một booking “ảo” chỉ có trong localStorage.

## G. Bill cọc và thanh toán

- [ ] Chọn booking đã có `supabaseId`.
- [ ] Upload bill cọc ảnh JPG/PNG.
- [ ] Upload bill thanh toán PDF hoặc ảnh.
- [ ] `payment-bills` vẫn là private.
- [ ] Copy public URL thủ công không mở được bill.
- [ ] Nút Bill trong CSKH mở signed URL khi đăng nhập.
- [ ] Signed URL hết hạn sau khoảng 15 phút.
- [ ] User không có quyền vận hành không đọc được bill.
- [ ] Giao dịch payment xuất hiện trong bảng `payments`.

## H. Dashboard

- [ ] Chi nhánh/layout mới xuất hiện trong bộ lọc.
- [ ] Số lượng phòng khả dụng đúng với `room_units`.
- [ ] Doanh thu thay đổi đúng khi cập nhật paid/status.
- [ ] Tỷ lệ lấp theo giờ thay đổi hợp lý khi thêm booking.
- [ ] Lọc tuần/tháng/năm hoạt động.
- [ ] Lọc từ ngày/đến ngày hoạt động.
- [ ] Xuất CSV mở được, không lỗi tiếng Việt.

## I. Google Sheet backup

- [ ] Apps Script có Script Properties `SUPABASE_URL` và `SUPABASE_ANON_KEY`.
- [ ] URL dùng `/exec`, không dùng `/dev`.
- [ ] Tạo/sửa booking và thấy dòng trong tab `Bookings`.
- [ ] Booking cùng ID được update đúng dòng, không nhân bản.
- [ ] Request không có token không ghi được Sheet.
- [ ] User bị khóa không ghi được Sheet.
- [ ] Sau khi sửa Apps Script, deployment đã chuyển sang version mới.

## J. GitHub Pages và điện thoại

- [ ] `index.html` nằm ở root repository.
- [ ] `.env` không có trên GitHub.
- [ ] Pages publish từ `main /(root)`.
- [ ] HTTPS được bật.
- [ ] Mở website bằng 4G/5G, không chỉ Wi-Fi nội bộ.
- [ ] Đăng nhập Admin trên điện thoại được.
- [ ] Upload ảnh từ thư viện điện thoại được.
- [ ] CSKH thao tác form không bị tràn ngang.
- [ ] Không có lỗi đỏ nghiêm trọng trong Console trình duyệt desktop.
