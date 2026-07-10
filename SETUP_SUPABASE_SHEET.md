# Unite Staycation - Supabase + Sheet setup

## Bạn cần cung cấp gì cho mình

1. Supabase Project URL
   - Đã cấu hình: `https://afjzycyffhhyifixtelq.supabase.co`.

2. Supabase anon public key
   - Đã cấu hình bằng `publishable key`.
   - Key public/publishable được phép đưa vào web public.

3. Không gửi service_role key cho web tĩnh
   - `service_role` là key quyền cao.
   - Chỉ dùng trong môi trường kín như Edge Function, server riêng hoặc Apps Script nếu thật sự cần.
   - Theo lựa chọn hiện tại, không rotate lại key Supabase.

4. Google Sheet backup
   - Sheet hiện dùng: `https://docs.google.com/spreadsheets/d/1sd9TKGa2v-6KJWzFjPLGXJ2aOTPXCZdi-ExnkNGrsUM/edit?usp=sharing`.
   - Tab nên đặt tên `Bookings`.
   - Header mẫu nằm ở `templates/google-sheet-bookings-columns.csv`.

5. Ảnh phòng mới
   - Hiện web đã có đủ 7 layout trong dữ liệu.
   - Amor/Roma đang dùng ảnh fallback để giao diện không trống.
   - Khi có ảnh thật, gửi theo thư mục như:
     - `img/C12-AMOR/0.jpg`, `1.jpg`, `2.jpg`
     - `img/C12-ROMA/0.jpg`, `1.jpg`, `2.jpg`

## GitHub Pages có upload và lưu phòng mới được không?

GitHub Pages chỉ host file tĩnh. Người dùng/admin không thể upload ảnh hoặc thêm phòng mới rồi lưu dùng chung cho mọi máy nếu chỉ dùng GitHub Pages.

Hướng đúng cho Unite:

- GitHub Pages: chạy giao diện public.
- Supabase Database: lưu chi nhánh, layout, phòng, giá, giảm giá, booking.
- Supabase Storage: lưu ảnh phòng/admin upload.
- Google Sheet: backup cuối ngày hoặc đối soát cho team quen dùng Sheet.
- CSKH page: nhập booking từ web, Zalo, Fanpage, Instagram, Agoda, Airbnb, Booking.
- Dashboard page: xem doanh thu, nguồn khách, trạng thái booking, xuất CSV.

## File đã chuẩn bị

- `supabase/staycation_schema.sql`
  - Tạo bảng chi nhánh, layout/phòng, ảnh, tiện ích, giá, khuyến mãi, booking, thanh toán và log sync Sheet.

- `js/supabase-config.js`
  - Đã có Project URL, publishable key, Sheet ID và Sheet URL.
  - Đã có Apps Script endpoint để backup Sheet.

- `apps-script/Code.gs`
  - Mẫu Google Apps Script để Sheet nhận booking.
  - Bản local hiện hỗ trợ thêm `callback` cho JSONP khi web tĩnh cần đọc `action=list`.
  - Sau khi deploy Web App, test bằng:
    - `?action=ping`
    - `?action=list`
    - `?action=list&callback=tenCallback` nếu cần đọc list từ browser bằng JSONP.

- `dashboard.html`
  - Dashboard doanh thu/KPI đang chạy bằng dữ liệu mẫu/localStorage.

- `cskh.html`
  - Giao diện CSKH để nhập và cập nhật booking đa kênh.

## Quy trình CSKH đề xuất

1. Khách hỏi phòng từ web/Zalo/Fanpage/Instagram/OTA.
2. CSKH nhập hoặc kiểm tra booking trong `cskh.html`.
3. Trạng thái đi theo luồng:
   - Mới
   - Đang tư vấn
   - Giữ phòng
   - Đã cọc
   - Đã thanh toán
   - Đã check-in
   - Đã check-out
   - Đã hủy / No-show
4. Khi khách cọc, cập nhật số tiền đã thu.
5. Khi khách chốt, dùng nút copy tin nhắn để gửi xác nhận.
6. Cuối ngày xem `dashboard.html`, xuất CSV hoặc sync sang Sheet.

## Các bước còn cần làm trong Supabase

1. Tạo project mới trong Supabase nếu muốn làm lại sạch:
   - Name: `unite-staycation`
   - Region gần Việt Nam, ví dụ Singapore.
   - Lưu lại password database.
2. Vào Project Settings > API:
   - Copy Project URL.
   - Copy `Publishable key`.
   - Dán vào `js/supabase-config.js`.
3. Mở Supabase SQL Editor.
4. Copy toàn bộ file `supabase/staycation_schema.sql`.
5. Run SQL để tạo bảng, policy RLS, seed 3 chi nhánh / 7 layout, bucket `room-images` và `booking-bills`.
6. Vào Authentication > Users:
   - Tạo user email/password cho Admin tổng.
   - Tạo thêm user cho CSKH/kế toán khi cần.
7. Vào Table Editor > `user_profiles`:
   - Thêm `id` đúng bằng UID user.
   - Chọn role: `super_admin`, `admin`, `manager`, hoặc `cskh`.
8. Mở `dashboard.html`, `cskh.html` hoặc `admin-live.html`, đăng nhập bằng email/password admin.

Nếu chưa chạy schema, Dashboard/CSKH vẫn hiện dữ liệu local mẫu để thao tác thử, nhưng chưa đọc/ghi database live.

## Chức năng mới trong bản ops

- CSKH:
  - Nhập giờ nhận/trả để kiểm trùng lịch theo giờ.
  - Tiền tự tách hàng nghìn.
  - Có dòng `Còn lại cần thu`.
  - Có log thanh toán/cọc.
  - Có trường bill/biên nhận, lưu tên file + thời gian; nếu có Supabase Storage sẽ upload vào bucket `booking-bills`.
  - Import CSV/JSON từ backup Sheet hoặc file Excel đã lưu dạng CSV.
  - Calendar tuần theo phòng/layout để xem trống/bận.

- Dashboard:
  - Biểu đồ doanh thu theo ngày.
  - Hiệu suất chi nhánh.
  - Nguồn booking.
  - Ngày nào trong tuần đông khách.
  - Tháng nào trong năm mạnh nhất.
  - Phòng/layout hiệu quả.
  - Cảnh báo công nợ, hủy/no-show, chi nhánh yếu.

- Admin Live:
  - File `admin-live.html`.
  - Thêm/sửa chi nhánh, layout, dạng phòng, số lượng phòng, trạng thái.
  - Cập nhật giá theo gói.
  - Bật/tắt khuyến mãi.
  - Upload ảnh phòng vào Supabase Storage nếu đã đăng nhập.
  - Đổi thứ tự ảnh bằng nút lên/xuống.

## Các bước còn cần làm cho Google Sheet

1. Mở Sheet đã gửi.
2. Vào Extensions > Apps Script.
3. Dán nội dung `apps-script/Code.gs`.
4. Deploy > New deployment > Web app.
5. Chọn quyền chạy bằng tài khoản của bạn và cho phép truy cập.
6. Web App URL hiện đã được dán vào `sheetWebhookUrl` trong `js/supabase-config.js`.
7. Test Web App URL với:
   - `?action=ping`
   - `?action=list`

Endpoint hiện tại đã test OK với `ping` và `list`. Nếu muốn bật đọc list bằng JSONP trên web tĩnh, redeploy Apps Script bằng nội dung `apps-script/Code.gs` mới nhất.
