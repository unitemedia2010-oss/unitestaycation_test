# Hướng dẫn tải toàn bộ ảnh phòng lên Supabase Storage - V15

## Cách dễ nhất: upload trong trang Admin

1. Mở `admin.html`.
2. Đăng nhập tài khoản có quyền `super_admin` hoặc `admin`.
3. Vào tab **Ảnh phòng** trong khu vực Live operations.
4. Chọn layout cần upload.
5. Chọn nhiều ảnh hoặc kéo ảnh vào vùng upload.
6. Bấm lưu. Ảnh sẽ lên bucket `room-images`, sau đó web public tự dùng ảnh mới.

## Cách nhanh nhất cho lần đầu có nhiều ảnh: upload hàng loạt bằng CMD

### 1. Chuẩn bị thư mục ảnh

Tạo thư mục `room-images-upload` ở cạnh file `package.json`, bên trong chia theo mã layout:

```text
room-images-upload/
  C1-ELAN/
    001-cover.jpg
    002.jpg
    003.jpg
  C1-NOIR/
    001-cover.jpg
    002.jpg
  C8-THE-ART/
  C9-VELVET/
  C10-MIDNIGHT/
  C12-AMOR/
  C12-ROMA/
```

Có sẵn thư mục mẫu `image-upload-template/`. Hạnh có thể copy thư mục này thành `room-images-upload` rồi bỏ ảnh thật vào.

### 2. Tạo file `.env`

Copy `.env.example` thành `.env`, rồi điền:

```env
SUPABASE_URL=https://PROJECT_ID.supabase.co
SUPABASE_SERVICE_ROLE_KEY=service_role_key_của_project_mới
ROOM_IMAGE_BUCKET=room-images
IMAGE_SOURCE_DIR=./room-images-upload
IMAGE_MAX_WIDTH=1800
IMAGE_QUALITY=78
```

File `.env` chỉ nằm trên máy Hạnh, không đưa lên GitHub.

### 3. Cài thư viện và chạy upload

Mở CMD trong thư mục project:

```bash
npm install
npm run upload:images
```

Script sẽ tự:

- đọc từng thư mục layout;
- nén ảnh về `.webp` rộng tối đa 1800px;
- upload vào Supabase Storage;
- xóa ảnh cũ của layout đó trong bảng `room_images`;
- ghi ảnh mới vào bảng `room_images` đúng thứ tự;
- ảnh đầu tiên hoặc ảnh có chữ `cover` sẽ làm ảnh đại diện.

## Chuẩn ảnh nên dùng

- Ảnh phòng public: mỗi ảnh sau nén nên khoảng 200KB - 800KB.
- Ảnh chính: rộng 1600-2000px là đủ đẹp trên điện thoại.
- Không nên upload ảnh gốc 5-15MB trực tiếp nếu chưa nén.
- Tên file nên dùng `001-cover.jpg`, `002.jpg`, không dùng dấu tiếng Việt.

## Ghi chú vận hành

Theo dõi dung lượng Storage và băng thông trong Supabase Dashboard. Khi lượng ảnh hoặc lượt xem tăng, đánh giá lại gói dịch vụ/CDN dựa trên số liệu sử dụng thực tế; không để ảnh gốc quá nặng.
