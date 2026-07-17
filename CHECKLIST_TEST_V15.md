# CHECKLIST KIỂM THỬ V15.4.2 TRƯỚC KHI DÙNG THẬT

Đánh dấu từng mục sau. Không bỏ qua lỗi dù chỉ xảy ra một lần.

## A. Cấu hình

- [ ] `js/supabase-config.js` có đúng Project URL.
- [ ] Chỉ dùng publishable/anon key trong frontend.
- [ ] Không có service role key trong repository GitHub.
- [ ] Full schema/migration nền đã chạy; các migration V15.4, V15.4.1 và `migration_v15_4_2_auto_room_assignment.sql` đã áp dụng thành công theo đúng thứ tự.
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
- [ ] Booking public chưa gán phòng vẫn hiện ở hàng `Chờ xếp phòng`.
- [ ] Chọn P2/P3, lưu và mở lại; hệ thống không đổi về P1.
- [ ] Check-in 14:00 vẫn hiện 14:00 trong CSKH, không lệch 7 tiếng.
- [ ] `Giữ phòng`/`Đã cọc`/`Đã thanh toán` lưu được khi chưa có `room_unit_id`, nhưng bắt buộc có `room_type_id`.
- [ ] Booking active chưa xếp phòng vẫn trừ một suất của layout.
- [ ] `Đã check-in`/`Đã check-out` bị UI và database từ chối nếu chưa có `room_unit_id`.
- [ ] Gói 3/4/8/16 giờ tính check-out nhất quán giữa public và CSKH.

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
- [ ] Booking tương lai không thể bị đánh dấu `No-show`; đến giờ nhận mới xác nhận được.
- [ ] Lỗi Supabase không tạo một booking “ảo” chỉ có trong localStorage.
- [ ] Layout có 3 phòng: ba booking active giao nhau được lưu, booking thứ tư bị chặn kể cả khi các booking chưa xếp phòng cụ thể.
- [ ] Hai tài khoản CSKH cùng nhận suất cuối: database chỉ cho một giao dịch thành công.
- [ ] Hủy booking hoặc chuyển khỏi trạng thái active thì suất layout được trả lại.
- [ ] Xếp phòng cụ thể sau khi nhận cọc vẫn kiểm tra conflict theo đúng `room_unit_id`.
- [ ] Mở QuickPay của booking `Mới/Đang tư vấn`; RPC gán một unit hợp lệ và chuyển booking sang `Giữ phòng` trước khi tải bill.
- [ ] Hai booking cùng tranh phòng cuối ở hai tài khoản: chỉ một request thành công, request còn lại không giữ trùng unit.
- [ ] Hai thao tác cùng sửa một booking: request dùng `updated_at` cũ bị báo dữ liệu stale và không ghi đè thay đổi mới.
- [ ] Khi không còn unit phù hợp, tự xếp báo lỗi rõ ràng và booking không bị gán nhầm phòng.
- [ ] Booking đã chọn P2/P3 thủ công vẫn giữ nguyên phòng đó sau khi gọi tự xếp/QuickPay.
- [ ] Booking dữ liệu cũ đã cọc/đã thanh toán chưa có unit hiện nút `Tự xếp phòng` và rời hàng `Cần xếp phòng` sau khi thành công.

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
- [ ] Thu cọc khi chưa xếp phòng: QuickPay tải lại booking live, tự xếp phòng trước, sau đó mới upload bill và chuyển `Đã cọc`.
- [ ] Thu đủ khi chưa xếp phòng: QuickPay tự xếp phòng trước, sau đó lưu đúng bill, tổng đã thu và trạng thái `Đã thanh toán`.
- [ ] Nếu không còn phòng hoặc booking vừa bị tài khoản khác sửa, QuickPay dừng trước upload bill; không có payment/chứng từ mới.
- [ ] Nếu phòng đã tự xếp nhưng bước lưu bill lỗi sau đó, booking vẫn giữ phòng; CSKH thử lại bill và không tạo đơn mới.
- [ ] Hai tài khoản cùng mở QuickPay một booking: tài khoản thứ hai bị báo booking đang được xử lý; claim được nhả sau khi thành công/lỗi và tự hết hạn sau 15 phút.
- [ ] Sau khi `finalize_quickpay_booking` thành công, `quickpay_claim_token` và `quickpay_claimed_at` cùng về `NULL` ngay trong giao dịch, không cần chờ request nhả khóa riêng.
- [ ] Khi bill đang upload/lưu, nút đóng/backdrop và thao tác mở QuickPay khác trong cùng tab bị chặn; lượt cũ không thể nhả token của lượt mới.
- [ ] Một tài khoản đang QuickPay, tài khoản khác mở `Sửa đơn` và lưu booking: database từ chối thao tác thứ hai; thay bill chỉ thực hiện trong QuickPay nên không làm lệch đường dẫn giữa `bookings` và `payments`.
- [ ] `Sửa đơn` dùng `updated_at` CAS: nếu booking đã bị tài khoản khác sửa, form báo dữ liệu cũ và không ghi đè.
- [ ] Bill lớn hơn 15 MB bị chặn trước upload.
- [ ] Mất phiên đăng nhập sau khi upload nhưng trước khi lưu payment: giao diện báo lỗi, không báo đã thu tiền và không cập nhật local thay cho Supabase.
- [ ] Hai request đồng thời tạo cùng loại bill `deposit` hoặc `full`: database chỉ nhận một dòng payment.
- [ ] Nếu payment mới nhất là `pending`, `failed` hoặc `refunded`, QuickPay không PATCH dòng đó; hệ thống tạo/cập nhật đúng dòng `received`.
- [ ] QuickPay không thay P2/P3 đã chọn thủ công bằng phòng khác.
- [ ] Không thể check-in booking đã cọc/đã thanh toán nếu chưa chọn phòng cụ thể.
- [ ] QuickPay lưu đúng phương thức thu đã chọn, không còn ghi `Chưa thu`.
- [ ] Booking dữ liệu cũ thiếu bill hiện nút bổ sung chứng từ và chỉ được đi tiếp sau khi sửa đủ.
- [ ] Claim trong cột booking là giá trị băm; token thô không xuất hiện trong database hoặc `localStorage`.
- [ ] Thay bill thành công chỉ xóa file cũ sau khi booking đã trỏ sang file mới.
- [ ] Giả lập mất kết nối ngay sau request lưu payment: nếu chưa xác định được commit, file mới không bị xóa và giao diện không báo thu tiền thành công.
- [ ] Sửa booking dùng layout/phòng đã ẩn không làm mất lựa chọn cũ; lịch tuần vẫn hiển thị booking ở hàng phòng lịch sử/đã ẩn.
- [ ] Booking cũ có `deposit = paid = total` và có bill cọc nhưng thiếu bill thanh toán: xác nhận kế thừa bill không tạo payment mới và không cộng doanh thu lần hai.
- [ ] Cùng trường hợp trên nhưng không có bill gốc: UI báo cần quản trị đối soát, không cho tạo payment 0 đồng.

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
- [ ] Xác minh dòng thật hoặc execution thành công; không chỉ dựa vào thông báo `Đã gửi` trên UI.
- [ ] Booking cùng ID được update đúng dòng, không nhân bản.
- [ ] Xuất `Unite-Backup-Booking.csv`, nhập lại vào môi trường test và giữ đúng mã layout/phòng, giờ, trạng thái, tiền, bill và số `+84`.
- [ ] File backup có layout/phòng sai hoặc booking paid thiếu chứng từ bị từ chối với lỗi dễ hiểu.
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
- [ ] `app.js`, `ops-data.js` và `cskh.js` thay đổi trong bản vá được tải với query cache `v=v15.4.6`.

## K. Tin nhắn liên hệ và Quick Paste

- [ ] Chọn 18:00 với gói 4 giờ; tin nhắn Zalo/Fanpage hiển thị đúng `18:00 → 22:00`, không chỉ có ngày.
- [ ] Sửa giờ nhận trong modal; nội dung của tất cả kênh liên hệ cập nhật ngay.
- [ ] Link được tạo có tham số `checkin`; mở lại link vẫn giữ đúng ngày và giờ đã chọn.
- [ ] Mẫu liên hệ cũ dùng `{{date}}` được chuẩn hóa sang `{{schedule}}` và vẫn đúng sau khi reload.
- [ ] Khi chưa chọn giờ, tin nhắn ghi rõ `chưa chọn giờ`, không âm thầm dùng 14:00.
- [ ] Copy tin nhắn hệ thống sang Quick Paste; CSKH điền đúng cả check-in và check-out, không tự rơi về 14:00.
