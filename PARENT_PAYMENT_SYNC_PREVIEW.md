# Kiểm thử đồng bộ giao dịch sang Cổng phụ huynh — nhánh thử nghiệm

Nhánh này không thay đổi `main` và không gửi dữ liệu học sinh lên Cloudflare.

## Kiểm thử giao diện
Mở bản dựng của nhánh trên môi trường riêng hoặc chạy bản sao local, vào **Sao lưu & cài đặt → Đối chiếu giao dịch đã nộp – Cổng phụ huynh** → **Xuất bản nháp giao dịch để đối chiếu (JSON)**.

Tệp `TRUNGVUONG_PAYMENTS_PREVIEW_YYYY-MM-DD.json` được xuất trên thiết bị, có:
- `payments`: các giao dịch hiện có trạng thái đối chiếu `valid`, được ghép với đúng **một** khoản thu; có mã giao dịch và số tiền hợp lệ;
- `held`: các khoản chưa đủ điều kiện tự động phân bổ, chỉ là chỉ số/cảnh báo, không trích xuất dữ liệu không cần thiết.

## Giới hạn an toàn
- Chưa tích hợp gửi trực tiếp lên `/api/admin/payments-sync`. API Cloudflare hiện yêu cầu `charge_id` riêng của Parent Portal, còn web trường dùng `dueItem.id` riêng. Chỉ khi có bảng ánh xạ chắc chắn theo học sinh, kỳ thu và khoản thu mới được phép đồng bộ.
- Ngày giao dịch nguồn được giữ nguyên trong `paid_at_source`; **chưa tự diễn giải** định dạng ngày giờ có thể không thống nhất.
- Không sử dụng dữ liệu học sinh thật; đây là nhánh thử nghiệm.
- Không đưa JSON có dữ liệu học sinh lên GitHub, pull request hoặc issue.

## Các bước tiếp
1. Xác minh cấu trúc transaction và khóa món thu từ dữ liệu giả lập địa phương.
2. Tạo mapping chính xác, có báo cáo khoản không ghép được, xem trước tổng tiền trước khi ghi.
3. Thiết lập cơ chế xác thực bảo mật khi gửi từ trình duyệt GitHub Pages sang Cloudflare (không đưa secrets lên mã nguồn client).
4. Kiểm thử lặp, nộp một phần, hoàn tác và chống trùng, rồi mới cân nhắc đưa vào `main`.
