# UNITE STAYCATION V15.4.2 — HẠNH BẮT ĐẦU TỪ ĐÂY

Đây là bản đã kiểm tra và gia cố từ project Hạnh gửi. Giao diện public được giữ nguyên hướng thiết kế; phần được chỉnh chủ yếu là dữ liệu live, phân quyền, bảo mật bill, Admin, CSKH và Dashboard.

## 1. Hạnh cần chuẩn bị

- Một tài khoản Supabase.
- Một tài khoản GitHub nếu muốn đưa web lên mạng.
- VS Code trên máy tính.
- Extension **Live Server** trong VS Code.
- Một Google Sheet nếu muốn có bản backup booking.
- Node.js chỉ cần khi muốn upload ảnh hàng loạt bằng CMD; upload từng ảnh trong Admin không cần Node.js.

## 2. Chọn đúng trường hợp Supabase

### Trường hợp A — tạo project Supabase mới

Chạy toàn bộ file:

```text
supabase/staycation_schema_v15.sql
supabase/migration_v15_3_payment_proofs.sql
supabase/migration_v15_4_booking_flow.sql
supabase/migration_v15_4_1_unassigned_payments.sql
supabase/migration_v15_4_2_auto_room_assignment.sql
```

### Trường hợp B — project cũ đã từng chạy schema V11/V12

Không chạy lại full schema. Chạy file:

```text
supabase/migration_v15_hardening.sql
supabase/migration_v15_3_payment_proofs.sql
supabase/migration_v15_4_booking_flow.sql
supabase/migration_v15_4_1_unassigned_payments.sql
supabase/migration_v15_4_2_auto_room_assignment.sql
```

Chuỗi migration này bổ sung đường dẫn bill riêng tư, chuyển bucket bill sang private, thêm quyền xóa file, khóa RPC kiểm tra trùng lịch và áp dụng luồng đến V15.4.2. Migration V15.4.2 phải chạy sau V15.4.1 để QuickPay tự xếp phòng nguyên tử trước khi lưu bill.

## 3. Tạo project Supabase mới

1. Đăng nhập Supabase và chọn **New project**.
2. Đặt tên project, chọn region gần Việt Nam và đặt database password.
3. Chờ project tạo xong.
4. Mở **SQL Editor** → **New query**.
5. Mở file `supabase/staycation_schema_v15.sql` trong VS Code.
6. Copy toàn bộ nội dung, dán vào SQL Editor và bấm **Run**.
7. Sau khi hoàn tất, vào **Table Editor** kiểm tra có các bảng:
   - `app_profiles`
   - `branches`
   - `room_types`
   - `room_units`
   - `room_prices`
   - `promotions`
   - `room_images`
   - `bookings`
   - `payments`
8. Vào **Storage** kiểm tra có:
   - `room-images`: public, dùng cho ảnh phòng.
   - `payment-bills`: private, dùng cho bill cọc/thanh toán.

Schema tạo sẵn 3 chi nhánh, 7 layout, 3 phòng thật cho mỗi layout và bảng giá mẫu đồng bộ với `js/rooms.js`.

## 4. Tạo tài khoản Super Admin đầu tiên

### Bước 4.1 — tạo user đăng nhập

1. Supabase → **Authentication** → **Users**.
2. Chọn **Add user** → **Create new user**.
3. Nhập email đăng nhập và mật khẩu mạnh.
4. Bật xác nhận email tự động nếu Dashboard hỏi tùy chọn này.

Hạnh có thể dùng email `dieuhanh022112@gmail.com`, hoặc thay bằng email khác.

### Bước 4.2 — gán quyền Super Admin

Mở SQL Editor, sửa email trong câu lệnh nếu cần rồi chạy:

```sql
insert into public.app_profiles (user_id, email, full_name, role, is_active)
select id, email, 'Hạnh', 'super_admin', true
from auth.users
where email = 'dieuhanh022112@gmail.com'
on conflict (user_id) do update
set email = excluded.email,
    full_name = excluded.full_name,
    role = excluded.role,
    is_active = true;
```

Nếu kết quả không thêm dòng nào, kiểm tra lại email trong Authentication có đúng hoàn toàn hay không.

## 5. Dán cấu hình Supabase vào web

Supabase → **Project Settings** → **API** hoặc phần **Connect**. Copy:

- Project URL.
- Publishable key hoặc anon key.

Mở file:

```text
js/supabase-config.js
```

Sửa thành dạng:

```js
window.UNITE_SUPABASE_CONFIG = {
  mode: "supabase",
  url: "https://PROJECT_ID.supabase.co",
  anonKey: "DAN_PUBLISHABLE_HOAC_ANON_KEY_VAO_DAY",
  publishableKey: "",
  sheetId: "",
  sheetUrl: "",
  sheetWebhookUrl: "",
  roomImageBucket: "room-images",
  paymentBillBucket: "payment-bills",
  authProvider: "email-password",
  requiredLogin: true,
  appVersion: "v15-audited"
};
```

**Tuyệt đối không dán** service role key, secret key hoặc database password vào file JavaScript/HTML. Các file frontend sẽ được người truy cập tải về trình duyệt.

## 6. Chạy thử trên máy tính

### Cách dễ nhất

1. Mở VS Code.
2. Chọn **File → Open Folder** và mở đúng thư mục `unite-staycation-v15-audited`.
3. Chuột phải `index.html` → **Open with Live Server**.
4. Trình duyệt mở địa chỉ gần giống `http://127.0.0.1:5500/index.html`.

Không nên double-click trực tiếp file HTML vì một số trình duyệt sẽ chặn chức năng liên quan đường dẫn, fetch hoặc module.

### Các trang cần mở

- Website khách: `index.html`
- Danh sách phòng: `rooms.html`
- Admin: `admin.html`
- CSKH: `cskh.html`
- Dashboard: `dashboard.html`

Bản V15.4.2 dùng cache revision `v15.4.6` cho các JavaScript đã thay đổi. Sau khi upload, kiểm tra URL asset có query này rồi nhấn `Ctrl+F5`.

## 7. Thứ tự nhập dữ liệu trong Admin

Đăng nhập `admin.html` bằng tài khoản Super Admin, sau đó làm đúng thứ tự:

1. **Chi nhánh**: thêm/sửa tên, slug, khu vực và địa chỉ public.
2. **Layout/phòng**: chọn chi nhánh, nhập mã layout, tên layout và số lượng phòng thật.
3. **Giá & KM**:
   - Chọn layout + gói để cập nhật giá hiện có.
   - Có thể đặt giá sale riêng.
   - Có thể bật/tắt khuyến mãi theo từng layout hoặc toàn hệ thống.
4. **Ảnh phòng**: chọn layout rồi tải nhiều ảnh; ảnh được nén WebP trước khi upload.
5. **Tài khoản**: chỉ Super Admin thấy tab này. Tạo user trong Supabase Authentication trước, rồi gán User ID và vai trò tại đây.

Khi giảm số lượng phòng từ 3 xuống 2, phòng dư được chuyển sang `hidden`, không xóa lịch sử. Khi tăng lại, phòng cũ được mở lại.

Với booking chưa có `P1/P2/P3`, QuickPay tải lại lịch live và tự xếp một phòng phù hợp trước khi lưu bill. Nếu đã chọn phòng thủ công, hệ thống giữ nguyên phòng đó và chỉ kiểm tra lại xung đột. Nếu hết phòng hoặc có tài khoản khác vừa cập nhật booking, QuickPay dừng trước bước upload bill. Booking dữ liệu cũ chưa có unit có nút `Tự xếp phòng` trong danh sách; check-in/check-out luôn bắt buộc có phòng cụ thể.

Trong lúc thanh toán, booking được claim tối đa 15 phút để tránh hai CSKH cùng thao tác. Claim chỉ lưu dạng băm trong database; token thô chỉ nằm trong bộ nhớ tab và không lưu vào `localStorage`. Khi hoàn tất, RPC chốt tiền/bill và nhả claim trong cùng giao dịch. Tab đang upload/lưu bill không cho đóng popup hoặc mở chồng QuickPay khác. Form `Sửa đơn` dùng CAS và sẽ bị chặn nếu booking đang được QuickPay xử lý. Bill tối đa 15 MB; nếu phiên đăng nhập hết giữa chừng, hệ thống dừng và không báo thanh toán thành công khi Supabase chưa ghi nhận.

Khi thay bill, hệ thống chỉ xóa file cũ sau khi booking đã chốt thành công sang file mới. Booking gắn layout/phòng lịch sử đã ẩn vẫn được giữ khi sửa và vẫn có hàng hiển thị trên lịch tuần.

Dữ liệu cũ ghi tiền cọc bằng toàn bộ tổng đơn có thể dùng bill cọc hiện có làm chứng từ thu đủ mà không tạo payment hoặc cộng tiền lần hai. Nếu bill gốc không còn, hệ thống yêu cầu quản trị đối soát thay vì cho lưu giao dịch 0 đồng.

## 8. Upload ảnh phòng

### Cách 1 — upload trong Admin

1. Admin → **Ảnh phòng**.
2. Chọn layout.
3. Chọn nhiều ảnh JPG/PNG/WebP.
4. Bấm upload.
5. Dùng nút lên/xuống để sắp xếp.
6. Xóa ảnh sẽ xóa cả dòng database lẫn file trong Storage.

### Cách 2 — upload hàng loạt bằng CMD

1. Cài Node.js LTS.
2. Trong thư mục project, copy `.env.example` thành `.env`.
3. Điền `SUPABASE_URL` và `SUPABASE_SERVICE_ROLE_KEY` vào `.env`.
4. Không upload `.env` lên GitHub; project đã có `.gitignore` để chặn file này.
5. Đặt ảnh vào đúng thư mục con trong `image-upload-template`, ví dụ:

```text
image-upload-template/
  C1-ELAN/
    01.jpg
    02.jpg
  C12-AMOR/
    01.jpg
    02.jpg
```

6. Mở Terminal tại thư mục project và chạy:

```bash
npm install
npm run upload:images -- image-upload-template
```

Tool sẽ resize ảnh tối đa 1800px, chuyển WebP, upload Storage và tạo dữ liệu `room_images`.

## 9. Cài Google Sheet backup

Google Sheet chỉ là bản backup/đối soát; Supabase vẫn là nguồn dữ liệu chính.

Lịch CSKH đọc Supabase, không đọc ngược từ Sheet. Do trình duyệt gửi webhook bằng `no-cors`, thông báo “đã gửi” chưa xác minh được dòng đã ghi; hãy kiểm tra trực tiếp tab `Bookings` hoặc **Apps Script → Executions**. Script hiện không có API `action=list`.

### Bước 9.1 — tạo Sheet và Apps Script

1. Tạo một Google Sheet mới.
2. Đặt tên tab là `Bookings`, hoặc để script tự tạo.
3. Vào **Extensions → Apps Script**.
4. Xóa code mẫu, copy toàn bộ `apps-script/Code.gs` vào.
5. Trong Apps Script, mở **Project Settings** → **Script properties**.
6. Thêm hai property:
   - `SUPABASE_URL`: URL project Supabase.
   - `SUPABASE_ANON_KEY`: publishable/anon key.

### Bước 9.2 — deploy Web App

1. Chọn **Deploy → New deployment**.
2. Loại deployment: **Web app**.
3. Execute as: **Me**.
4. Who has access: **Anyone** hoặc **Anyone with the link**, tùy giao diện tài khoản.
5. Bấm Deploy và cấp quyền.
6. Copy URL kết thúc bằng `/exec`.
7. Dán URL vào `sheetWebhookUrl` trong `js/supabase-config.js`.

Không dùng URL dạng `/macros/library/...`; đó là bản phát hành Library để script khác gọi lại, không phải webhook HTTP cho website.

Mặc dù Web App có thể nhận request từ người có link, code V15 bắt buộc kiểm tra Supabase access token và quyền `app_profiles` trước khi ghi Sheet.

Khi sửa `Code.gs`, vào **Deploy → Manage deployments**, sửa deployment và chọn version mới. Nếu vẫn dùng version cũ, thay đổi code sẽ chưa áp dụng cho URL `/exec`.

## 10. Đưa web lên GitHub Pages

1. Tạo repository mới trên GitHub.
2. Upload **toàn bộ nội dung bên trong** thư mục project lên root repository; `index.html` phải nằm ngay ở root.
3. Không upload `.env` hoặc service role key.
4. GitHub repository → **Settings → Pages**.
5. Source: **Deploy from a branch**.
6. Branch: `main`; folder: `/(root)`.
7. Save và chờ GitHub cung cấp URL.
8. Bật **Enforce HTTPS** khi tùy chọn xuất hiện.

Project có file `.nojekyll`, phù hợp để deploy nguyên trạng như website tĩnh.

Sau khi deploy, Hạnh có thể mở Admin/CSKH trên điện thoại bằng URL GitHub Pages. Ảnh và dữ liệu không lưu trên GitHub Pages mà lưu trên Supabase, nên nhiều máy sẽ thấy cùng dữ liệu.

## 11. Phân quyền hiện tại

| Vai trò | Admin dữ liệu | CSKH | Dashboard | Quản lý tài khoản |
|---|---:|---:|---:|---:|
| `super_admin` | Có | Có | Có | Có |
| `admin` | Có | Có | Có | Không |
| `cskh` | Không | Có | Không | Không |
| `accountant` | Không | Không | Có | Không |

Bill thanh toán nằm trong bucket private. Tài khoản vận hành hợp lệ mở bill bằng signed URL có thời hạn 15 phút.

## 12. Điều bắt buộc trước khi dùng thật

1. Chạy toàn bộ `CHECKLIST_TEST_V15.md`.
2. Tạo ít nhất một tài khoản test cho từng vai trò.
3. Thử QuickPay trên booking chưa xếp phòng và xác nhận phòng được tự gán trước khi bill được lưu.
4. Chọn P2/P3 thủ công rồi mở QuickPay; xác nhận hệ thống giữ đúng phòng đã chọn.
5. Thử khi không còn phòng phù hợp; xác nhận không có bill/payment mới và booking không bị gán sai.
6. Cho hai tài khoản tự xếp đồng thời; xác nhận không thể cùng giữ một phòng và request thua cuộc được yêu cầu tải lại.
7. Thử booking dữ liệu cũ chưa có unit và xác nhận nút `Tự xếp phòng` đưa lịch vào đúng hàng phòng.
8. Thử vượt sức chứa layout và xác nhận cả UI lẫn database đều từ chối.
9. Thử check-in khi chưa xếp phòng cụ thể và xác nhận hệ thống không cho lưu.
10. Thử booking trùng giờ trên cùng phòng cụ thể và xác nhận hệ thống từ chối.
11. Thử tin nhắn có đúng check-in/check-out, link giữ `checkin` và Quick Paste điền lại đúng giờ.
12. Kiểm tra asset mới dùng cache revision `v15.4.6`.
13. Thử upload/mở bill trên một máy khác.
14. Kiểm tra ảnh thật đã upload đủ cho 7 layout.
15. Kiểm tra Google Sheet thực sự xuất hiện dòng mới.
16. Backup database trước khi thay schema hoặc xóa dữ liệu.

## 13. Các giới hạn còn lại

- ZIP hiện không có ảnh phòng thật; cần upload qua Admin hoặc tool hàng loạt.
- Contact channels, một số nội dung giới thiệu và bản dịch vẫn là nội dung frontend/local, chưa có bảng CMS live riêng.
- Website public hiện là luồng xem phòng và liên hệ; chưa phải cổng thanh toán trực tuyến.
- Chưa thể xác nhận end-to-end với dữ liệu thật cho đến khi Hạnh dán Supabase URL/key và triển khai Apps Script.
