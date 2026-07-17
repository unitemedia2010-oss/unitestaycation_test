# Unite Staycation V15.4.2

> SQL hotfix: điều kiện kiểm tra QuickPay claim trong V15.4.2 đã bỏ biểu thức `CASE ... END THEN` gây lỗi `42601` trên Supabase. Nếu lần chạy trước dừng ở dòng 109, dùng lại file migration hiện tại và chạy toàn bộ từ đầu.

## Luồng đặt phòng và lịch CSKH

- Đồng nhất check-in/check-out theo múi giờ `Asia/Ho_Chi_Minh`; giờ 14:00 không còn hiển thị thành 07:00 ở CSKH.
- Gói 3 giờ, 4 giờ, qua đêm 8 giờ và theo ngày 16 giờ dùng cùng một cách tính ở public, CSKH và RPC.
- Booking `Mới`, `Đang tư vấn`, booking chưa gán phòng và booking đã check-out đều xuất hiện đúng trên lịch tuần.
- Booking chưa gán phòng nằm ở hàng `Cần xếp phòng`; hệ thống chỉ tự xếp khi CSKH bấm `Tự xếp phòng` hoặc xác nhận lưu trong QuickPay, không tự đổi phòng khi chỉ mở form.
- Khi sửa booking, phòng P2/P3 đã chọn được giữ nguyên và xung đột giờ được kiểm tra trước khi lưu.
- Booking `Giữ phòng`, `Đã cọc` hoặc `Đã thanh toán` có thể chưa xếp phòng cụ thể, nhưng bắt buộc có loại phòng/layout và vẫn giữ một suất của layout trong khung giờ đó.
- Chỉ `Đã check-in`/`Đã check-out` mới bắt buộc có `room_unit_id`; khi xếp phòng cụ thể, hệ thống vẫn kiểm tra trùng giờ theo đúng phòng thật.
- Giới hạn sức chứa layout được chặn ở cả UI và database; advisory lock ngăn hai CSKH cùng nhận suất cuối trong một thời điểm.
- RPC `auto_assign_booking_room_unit` khóa booking/layout, chọn nguyên tử một phòng cùng chi nhánh/layout còn trống và từ chối dữ liệu stale hoặc cuộc đua đã mất.
- QuickPay tải lại booking live và tự xếp/kiểm tra phòng trước khi lưu bill; nếu hết phòng hoặc migration chưa chạy, luồng dừng trước bước upload chứng từ.
- QuickPay giữ một claim có thời hạn 15 phút trong lúc tự xếp phòng và lưu bill; form `Sửa đơn` dùng CAS và bị database chặn nếu booking đang được QuickPay xử lý.
- Phòng P1/P2/P3 do CSKH chọn thủ công luôn được ưu tiên giữ nguyên nếu còn hợp lệ; tự xếp không âm thầm thay sang phòng khác.
- Booking dữ liệu cũ đã cọc/đã thanh toán nhưng chưa có phòng hiển thị nút `Tự xếp phòng` ngay trong danh sách.
- QuickPay không chuyển `Đã thanh toán` nếu bill chưa đủ phần còn lại; dữ liệu tiền không được cập nhật trước khi bill lưu thành công.
- Bill ảnh/PDF bị giới hạn 15 MB; payment guard xác thực claim cho cả `POST` và `PATCH`, còn database trigger chặn hai giao dịch `deposit`/`full` cùng được tạo.
- Khi thay bill, QuickPay chỉ cập nhật payment có trạng thái `received`; dòng `pending`, `failed` hoặc `refunded` không bị tái sử dụng làm chứng từ đã thu.
- Bước chốt tiền/trạng thái chạy qua RPC `finalize_quickpay_booking`; chỉ token đang sở hữu booking mới được hoàn tất và claim được nhả nguyên tử ngay trong cùng giao dịch.
- Claim chỉ lưu dạng băm trong database và token thô không được ghi vào `localStorage`.
- Bill cũ chỉ bị xóa sau khi booking đã trỏ thành công sang bill mới; nếu chưa xác định được request ghi payment đã commit hay chưa, file mới được giữ lại để đối soát thay vì xóa nhầm.
- Nếu phiên đăng nhập hết giữa lúc lưu, QuickPay báo lỗi và không rơi về dữ liệu local hoặc báo thu tiền giả.
- Trong lúc upload/lưu bill, popup không cho đóng hoặc mở thêm một QuickPay khác trong cùng tab; lượt cũ cũng không thể nhả nhầm token của lượt mới.
- QuickPay cho chọn rõ phương thức thu, có đường bổ sung bill cho dữ liệu cũ, không cho check-in/check-out khi chứng từ hoặc số tiền chưa đủ.
- Đơn mới/giữ chỗ có thể hủy; `No-show` chỉ được xác nhận khi đã đến giờ nhận, tránh nhả suất phòng tương lai ngoài ý muốn.
- Backup CSKH xuất CSV đầy đủ mã layout/phòng, bill và số liên hệ; nhập lại kiểm tra layout, phòng cụ thể, sức chứa và chứng từ trước khi lưu.
- Phòng/layout lịch sử đã ẩn vẫn được giữ khi sửa đơn và vẫn có hàng hiển thị trên lịch, tránh booking cũ biến mất khỏi bảng tuần.
- Dữ liệu cũ ghi `tiền cọc = tổng đơn` có thể xác nhận dùng bill cọc hiện có làm chứng từ thu đủ mà không tạo giao dịch hoặc cộng tiền lần hai; trường hợp không có bill gốc được đưa về trạng thái cần quản trị đối soát.
- Nhãn liên hệ được đổi thành `Số Zalo / WhatsApp`.
- Bộ lọc mobile ẩn `Số đêm` với gói theo giờ và chỉ hiện lại với gói ngày.
- Public booking đi qua RPC có kiểm tra dữ liệu, chống gửi trùng ngắn hạn và trả mã yêu cầu.
- Tin nhắn Zalo/Fanpage dùng lịch check-in → check-out có cả ngày và giờ; mẫu cũ dùng `{{date}}` được chuẩn hóa sang `{{schedule}}`, còn link liên hệ giữ tham số `checkin`.
- Quick Paste đọc được cả mẫu hội thoại và mẫu gạch đầu dòng, giữ đúng check-in/check-out thay vì tự rơi về 14:00.
- Asset JavaScript của bản vá được cache-bust bằng revision `v15.4.6`.

## Migration bắt buộc

Project đã ở V15.4.1 chạy:

```text
supabase/migration_v15_4_2_auto_room_assignment.sql
```

Project đã từng chạy V15.4 nhưng chưa chạy V15.4.1 phải chạy:

```text
supabase/migration_v15_4_1_unassigned_payments.sql
supabase/migration_v15_4_2_auto_room_assignment.sql
```

Project đang ở V15.3 chạy theo thứ tự:

```text
supabase/migration_v15_4_booking_flow.sql
supabase/migration_v15_4_1_unassigned_payments.sql
supabase/migration_v15_4_2_auto_room_assignment.sql
```

Project cũ hơn cần chạy các migration theo đúng thứ tự. Xem [HUONG_DAN_CAP_NHAT_V15_4.md](HUONG_DAN_CAP_NHAT_V15_4.md).

Các migration đến V15.4.2 chạy trong transaction và không xóa booking cũ. Constraint dùng `NOT VALID`: chặn dữ liệu sai mới nhưng cho phép rà soát dữ liệu lịch sử trước khi validate toàn bộ.
