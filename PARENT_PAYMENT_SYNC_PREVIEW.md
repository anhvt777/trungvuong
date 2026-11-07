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


## Duyệt lô trên Cloudflare (bổ sung V1.4)

- URL quản trị: `https://school-parent-dev.tuananh0001.workers.dev/admin/payment-import`
- Chọn JSON schema `school-parent-payments-draft/2` xuất từ nhánh thử nghiệm.
- Worker kiểm tra định dạng, quyền truy cập, từng `charge_id`, mã giao dịch đã tồn tại và số tiền còn thiếu trên D1.
- Trước khi ghi, trang yêu cầu duyệt lại số giao dịch mới và tổng tiền, ký HMAC phía server có hạn dùng 10 phút.
- Chỉ tải lô 1–30 giao dịch *giả lập*. Giao dịch ngân hàng thật và thông tin học sinh thật bị cấm trong môi trường demo.
- Hai giao dịch cùng khoản thu trong cùng một lô vẫn bị chặn. Có thể thử ở **hai lô riêng**; không gửi lặp những giao dịch cũ.
- Phản hồi `ALREADY_SYNCED` có nghĩa toàn bộ giao dịch hợp lệ trong lô đã tồn tại.
- Không lưu file đã xuất trong repository.

## Kiểm thử logic đã chạy

| Kịch bản | Kết quả |
| --- | --- |
| Ánh xạ giao dịch một phần (100.000/683.100) | Khớp đúng khoản |
| Ngày giao dịch không có múi giờ | Đưa vào held |
| Mã khoản thu trên máy không tồn tại | Đưa vào held |
| Mã giao dịch trùng | Chỉ cho phép một giao dịch vào bản nháp |
| Giao dịch gộp nhiều món | Đưa vào held |
| Trùng ứng viên khoản thu trên D1 | Đưa vào held |

Các kiểm thử trên là **kiểm thử logic bằng dữ liệu mẫu trong bộ chạy script**, không thay thế cho kiểm thử nhập/lưu qua trình duyệt trên môi trường thật. Việc ghi một lô mới qua `/admin/payment-import` vẫn chưa được kiểm thử đầu-cuối.

## Tiêu chí phát hành

Chỉ hợp nhất vào `main` sau khi xác nhận ánh xạ ID không đổi qua kỳ thu, cơ chế nhiều lần nộp, nguồn mã giao dịch, thời gian thu thực tế, rollback và xử lý khi mất mạng. Không bật import giao dịch thật vào Worker demo.
