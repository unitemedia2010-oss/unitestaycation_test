# BÁO CÁO KIỂM TRA — UNITE STAYCATION V15 AUDITED

## Kết luận

Bản gốc có nền tảng giao diện và vận hành khá đầy đủ nhưng chưa nên đưa vào dùng thật ngay vì tồn tại lỗi phân quyền, dữ liệu phòng không đồng bộ giữa các trang, bill thanh toán công khai và một số CRUD không hoạt động đúng.

Bản V15 đã được chỉnh để phù hợp giai đoạn **staging/kiểm thử có dữ liệu thật**. Trước production vẫn phải chạy checklist với Supabase và tài khoản thật.

## Những phần đã kiểm tra

- Cấu trúc tất cả trang HTML, CSS, JavaScript, SQL, Apps Script và tool upload ảnh.
- Cú pháp toàn bộ JavaScript trong `js/` và `tools/`.
- Liên kết file cục bộ và ID trùng trong các trang HTML.
- Luồng đăng nhập và kiểm tra role.
- RLS và Storage policies trong schema.
- Luồng Admin thêm/sửa chi nhánh, layout, phòng thật, giá, khuyến mãi, ảnh, tài khoản.
- Luồng CSKH tạo/sửa/xóa booking, chống trùng giờ, upload bill.
- Luồng Dashboard tải booking và inventory live.
- Luồng Google Apps Script backup Sheet.

## Lỗi nghiêm trọng đã sửa

### 1. Tài khoản Auth chưa có profile vẫn có thể nhận quyền giả

Bản cũ có fallback gán profile CSKH local khi không tìm thấy `app_profiles`. Bản V15 đã xóa hoàn toàn fallback này. User phải tồn tại, có profile, `is_active=true` và đúng role.

### 2. Phiên đăng nhập hết hạn không refresh đúng

Đã bổ sung refresh token, kiểm tra thời hạn và xóa session/profile cũ khi không còn hợp lệ.

### 3. Bill cọc/thanh toán để trong bucket public

`payment-bills` đã chuyển thành private. UI lưu `storage_path` và tạo signed URL 15 phút khi người có quyền bấm mở bill.

### 4. RPC kiểm tra booking có thể bị gọi công khai

`check_booking_conflicts` đã bị revoke khỏi `public` và `anon`; chỉ `authenticated` được execute, đồng thời hàm kiểm tra role vận hành.

### 5. Full schema xóa policy của toàn bộ public schema

Đã giới hạn việc drop policy chỉ trong danh sách bảng của Unite Staycation, tránh ảnh hưởng bảng khác trong cùng Supabase project.

### 6. CSKH và Dashboard không thấy layout/phòng mới từ Admin

Đã thêm loader inventory live từ `room_types`, `branches`, `room_units`. Layout/phòng mới, phòng ẩn và phòng bảo trì hiện được phản ánh trên CSKH/Dashboard.

### 7. Tạo layout mới không sinh phòng thật

Đã sửa `ensureUnits` để dùng trực tiếp object vừa insert hoặc fetch lại bằng ID. Layout mới sẽ tạo đúng `P1`, `P2`, `P3...`.

### 8. Giảm số lượng phòng không xử lý phòng dư

Phòng dư được chuyển `hidden` thay vì còn xuất hiện trong CSKH. Tăng lại sẽ tái sử dụng và chuyển về `available`.

### 9. Admin không cập nhật được giá đã tồn tại

Form giá giờ nhận diện layout + package và PATCH dòng hiện có. Có nút sửa, trạng thái bật/tắt và giá sale riêng.

### 10. Nút bật/tắt khuyến mãi chưa tắt được ưu đãi cũ

Khi lưu một khuyến mãi cho layout/global, bản V15 vô hiệu hóa các record cũ cùng phạm vi và cập nhật record hiện hành. Public site đọc promotion active và hiển thị giá gốc/giá giảm/badge.

### 11. Xóa ảnh chỉ xóa database, không xóa file Storage

Đã xóa cả object trong `room-images` và record `room_images`. Tool upload hàng loạt cũng kiểm tra lỗi xóa và dọn file nếu insert database thất bại.

### 12. Tab tài khoản hiển thị không đúng quyền và không update được user cũ

Tab Accounts chỉ xuất hiện cho `super_admin`. Form nhận diện `user_id` đã có và cập nhật thay vì insert trùng.

### 13. Lỗi Supabase vẫn được lưu local như booking thành công

Trong chế độ live, nếu Supabase từ chối booking, CSKH không còn chèn booking giả vào localStorage. Nhân viên sẽ thấy lỗi và phải xử lý lại.

### 14. Cho phép xác nhận booking active dù trùng lịch

CSKH vẫn có thể lưu `Mới/Đang tư vấn` để ghi nhận lead, nhưng không thể lưu `Giữ phòng/Đã cọc/Đã thanh toán/Check-in` nếu cùng phòng bị giao nhau thời gian. Database exclusion constraint là lớp chặn cuối.

### 15. Ghi Google Sheet không xác thực

Apps Script V15 yêu cầu Supabase access token, kiểm tra `/auth/v1/user`, kiểm tra `app_profiles`, role và `is_active` trước khi ghi.

### 16. Spreadsheet formula injection

Dữ liệu bắt đầu bằng `=`, `+`, `-`, `@` được prefix an toàn khi xuất CSV và ghi Google Sheet.

### 17. Giá live không khớp nhãn “Ngày”

Dữ liệu Supabase dùng package code `day`/label `Theo ngày`, còn UI tìm `Ngày`. V15 chuẩn hóa package code sang nhãn UI, đồng thời seed giá đúng từng layout theo `rooms.js`.

### 18. Dashboard dùng inventory cứng và tỷ lệ lấp thiếu chính xác

Dashboard giờ lấy số phòng thật từ Supabase và tính tỷ lệ lấp theo số giờ booking giao với kỳ báo cáo, thay vì chỉ đếm ngày check-in.

## Kiểm tra kỹ thuật đã đạt

- Toàn bộ JavaScript qua `node --check`.
- Không phát hiện ID HTML bị trùng.
- CSS/JS/logo được tham chiếu đúng.
- Các ảnh local `img/.../0.jpg` chưa tồn tại nhưng đã có fallback hiển thị “Chưa thấy ảnh”; khi Supabase có ảnh live, catalogue sẽ dùng ảnh Storage.
- Config không chứa service role key hoặc secret thật.
- `.gitignore` đã chặn `.env` và `node_modules`.
- `.nojekyll` đã được thêm cho GitHub Pages.

## Chưa thể xác nhận trong môi trường kiểm tra

- Đăng nhập thật và thao tác REST trên Supabase của Hạnh vì ZIP đang để placeholder URL/key.
- Upload Storage thật và signed URL thật.
- Ghi Google Sheet thật vì chưa có deployment URL và Script Properties.
- Hiển thị ảnh phòng thật vì ZIP không chứa ảnh.
- Kiểm thử nhiều nhân viên thao tác đồng thời trên dữ liệu production.

## Hạn chế nghiệp vụ còn lại

1. Contact channels và một số nội dung marketing vẫn lưu local/frontend, chưa phải CMS dùng chung nhiều máy.
2. Không có audit log chi tiết cho mọi lần admin đổi giá, xóa ảnh hoặc sửa booking.
3. Không có cơ chế soft-delete đầy đủ cho chi nhánh/layout; xóa trực tiếp có thể bị database từ chối nếu còn booking liên quan.
4. Dashboard chưa lưu lịch sử trạng thái bảo trì theo thời gian, nên mẫu số occupancy dùng trạng thái phòng hiện tại.
5. Google Sheet sync chạy `no-cors`; trình duyệt chỉ biết request đã gửi, không đọc được JSON phản hồi. Cần kiểm tra trực tiếp Sheet hoặc execution log.
6. Chưa có hệ thống thông báo Zalo/email tự động khi booking đổi trạng thái.

## Mức sẵn sàng đề xuất

- **Chạy local/demo:** đạt.
- **Kết nối Supabase staging:** đạt sau khi điền config và chạy schema/migration.
- **Cho team test nội bộ:** đạt sau khi hoàn thành checklist.
- **Đưa vào vận hành chính thức:** chỉ sau khi test quyền, booking trùng, bill private, backup Sheet và backup database.
