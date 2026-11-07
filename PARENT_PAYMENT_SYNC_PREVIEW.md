# Giai đoạn đồng bộ khoản đã nộp — bản thử nghiệm biệt lập

Nhánh: `feature/parent-payment-sync-preview-20261107`. **Không thay đổi `main`** của Trường Trưng Vương.

## Đã triển khai

- Trên Cloudflare Worker Parent Portal: `/admin/charge-map` xuất bảng tham chiếu **60 khoản thu giả lập** từ D1, yêu cầu Access JWT hợp lệ. Dữ liệu trả về không cache và chỉ dùng cho `demo_only`.
- Trên nhánh GitHub của web Trưng Vương: mục **Sao lưu & cài đặt** có nút đối chiếu giao dịch, cho phép chọn bảng tham chiếu và xuất JSON bản nháp **trên máy**.
- Bản nháp dùng schema `school-parent-payments-draft/2`; **không gọi API ghi, không lưu Secret, không upload** bất kỳ dữ liệu nào.

## Cách thử với dữ liệu GIẢ LẬP

1. Đăng nhập bằng tài khoản quản trị Cloudflare Access, tải tệp từ `https://school-parent-dev.tuananh0001.workers.dev/admin/charge-map`. Bảo vệ tệp vì có tên, lớp, ngày sinh học sinh giả lập và mã khoản thu.
2. Kiểm thử *nhánh* trên môi trường localhost/preview độc lập. Không mở trang `main` rồi kỳ vọng nút mới xuất hiện.
3. Tại **Sao lưu & cài đặt → Đối chiếu giao dịch đã nộp – Cổng phụ huynh**, chọn file tham chiếu vừa tải, nhấn **Đối chiếu và xuất bản nháp giao dịch (JSON)**.
4. Đọc `summary`, `payments` và `held` trong tệp kết quả bằng công cụ nội bộ bảo mật. **Không đưa hai tệp lên GitHub, PR hoặc chat công khai.**

## Quy tắc ghép khắt khe

- Dựa trên **tên chuẩn hóa + lớp + ngày sinh + kỳ thu + loại/nội dung món thu + tổng nghĩa vụ khoản thu**; chỉ cho qua một kết quả duy nhất.
- Số tiền nộp có thể nhỏ hơn tổng nghĩa vụ, nhưng không được lớn hơn nghĩa vụ.
- Tạm giữ nếu ngày giao dịch không có định dạng ISO8601 kèm múi giờ; mã tham chiếu trùng; một giao dịch khớp nhiều món; nguồn chưa xác nhận; thiếu định danh hoặc có nhiều khoản trùng khớp.
- Không tự chuyển đổi ngày kiểu `dd/mm/yyyy` để tránh đảo ngày và tháng.
- Không ghi nhận QR chưa xác minh.

## Những hạn chế phải hoàn thiện trước khi triển khai thật

1. Web trường hiện đối chiếu theo trạng thái **đã thu đủ món** ở một số nhánh xử lý; chưa bảo đảm xuất đúng từng khoản nộp một phần. Cần mở rộng mô hình phân bổ giao dịch phía trường.
2. Mã `source_ref` phải được tạo ổn định và không xung đột giữa bảng kê ngân hàng, tiền mặt và phiên thu; không dùng mã thiếu định danh.
3. Sử dụng bảng ánh xạ **đã xác minh** thay cho suy luận tên, đặc biệt khi chuyển lớp hoặc thay đổi khoản thu.
4. Cần cơ chế xác thực Access và kiểm duyệt trước khi gọi `/api/admin/payments-sync` từ web trường; không lưu secret trên GitHub Pages.
5. Tạo test độc lập: đồng bộ trùng, khoản thiếu, khoản đã thu đủ, hoàn tác, cập nhật nhiều phiên, giao dịch đảo ngược.
6. Không đưa học sinh thật lên môi trường `school-parent-dev` trước khi rà soát bảo vệ dữ liệu cá nhân, phân quyền, lưu trữ và kiểm thử bảo mật.

## Trạng thái

**Chưa tích hợp đồng bộ trực tiếp, chưa merge vào main, chưa thay đổi QR.**
