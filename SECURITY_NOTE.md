# SECURITY NOTE — V15

- Frontend chỉ được chứa Supabase publishable/anon key.
- Không đưa `service_role`, secret key, database password hoặc file `.env` lên GitHub.
- Service role chỉ dùng trong `tools/bulk-upload-images.js` trên máy cá nhân và phải nằm trong `.env` đã bị `.gitignore`.
- Tất cả bảng public đã bật RLS trong schema V15.
- `payment-bills` là bucket private; chỉ mở bằng signed URL cho tài khoản vận hành.
- Apps Script kiểm tra Supabase JWT và role trước khi ghi Google Sheet.
- Nếu một service role key từng bị chia sẻ, commit hoặc chụp màn hình công khai, hãy rotate key đó trong Supabase rồi cập nhật `.env` cá nhân.
