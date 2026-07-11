# Cách cập nhật V15.2 mà không mất cấu hình Supabase

Chép đè đúng 3 file sau vào project đang dùng:

- `cskh.html`
- `js/cskh.js`
- `css/ops.css`

Không thay `js/supabase-config.js`, vì file đó đang chứa Project URL và Publishable key của bạn.

Sau khi chép đè:

1. Lưu file.
2. Mở lại `cskh.html` bằng Live Server.
3. Nhấn `Ctrl + F5` để xóa cache.
