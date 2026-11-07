# Kiểm thử thu bổ sung theo món thu (staging)

Mục tiêu: mỗi giao dịch tiền mặt/thủ công có **mã giao dịch duy nhất**; hai lần nộp 100.000đ cùng một món phải được giữ riêng, còn thiếu 400.000đ trên nghĩa vụ 600.000đ.

## Đã kiểm thử bằng JS cô lập từ app.js của nhánh
- 100.000đ lần 1: `valid`, `partialPayment=true`.
- 100.000đ lần 2, mã khác: `valid`, `partialPayment=true`.
- 100.000đ với mã giao dịch lặp: `duplicate`.
- Thêm 450.000đ sau khi đã thu 200.000đ: `amount_mismatch` vì vượt 600.000đ.
- Cú pháp toàn bộ `app.js`: kiểm tra thành công.

## Thay đổi trên nhánh
- `reconcileTransactions` theo dõi tổng số tiền giao dịch thủ công vào từng món, không còn mặc định `duplicate` ngay khi nộp bổ sung.
- `exportParentPreview` ghi `paid` và `remaining` bằng số tiền cộng dồn của giao dịch xác nhận ghép **duy nhất một món**.
- QR không phát hành trong trường hợp nộp một phần; khi cần QR số dư còn thiếu phải xuất thông tin QR mới theo số dư đã xác minh.

## Giới hạn quan trọng
- Phần lớn giao diện thống kê hiện dùng `paidKeys` đánh dấu món đã thanh toán đủ và cần thiết kế lại để không phóng đại số thu khi có giao dịch nộp một phần.
- Chưa tự động chia giao dịch gộp nhiều món.
- Chưa bảo đảm mã giao dịch ổn định giữa lần nhập/re-import nếu nguồn không cung cấp mã gốc.
- Chưa có ràng buộc unique + phép kiểm tra số dư nguyên tử ở cấp D1 cho các lô đồng thời.
- Các thay đổi **chưa được merge vào main** và không dùng cho học sinh/giao dịch thực tế.

## Tiêu chí kiểm thử trước merge
- Tổng thu trên dashboard = tổng tiền đã xác nhận, không bằng giá trị toàn món thu.
- Xuất bảng kê theo lớp/khoản/kỳ phản ánh hai giao dịch thay vì một.
- Giao dịch hoàn tác không còn tính vào tổng thu.
- Giao dịch import lặp không tăng số dư.
- Nhiều giao dịch cùng khoản trong một lô được kiểm soát tổng tiền.
- QR định danh đối với nộp một phần chỉ hiển thị khi đã kiểm tra đúng số tiền còn lại.
