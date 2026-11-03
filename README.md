# Trường Trưng Vương · SchoolCollect

Hệ thống quản lý thu học sinh độc lập, kế thừa từ mã nguồn Hiếu Giang 2 nhưng sử dụng kho dữ liệu IndexedDB và tên bộ nhớ đệm riêng.

## Vận hành

- Dữ liệu học sinh lưu trong trình duyệt máy sử dụng; chưa đồng bộ đám mây.
- Tạo mã học sinh mới với tiền tố TV.
- Kiểm tra cấu hình ngân hàng, số tài khoản, tên đơn vị và kỳ thu trước khi sử dụng.
- Trong Sao lưu & cài đặt có chức năng **Xuất bản nháp đồng bộ phụ huynh (JSON)**. File chứa dữ liệu cá nhân, không tải lên repository hoặc chia sẻ công khai.
- Cổng tra cứu phụ huynh và dịch vụ đồng bộ Cloudflare chưa được kết nối.

## GitHub Pages

Vào Settings → Pages → Deploy from a branch → main → /(root) để xuất bản tại https://anhvt777.github.io/trungvuong/.

**Không nhập dữ liệu học sinh thật trước khi hoàn thành kiểm thử nghiệp vụ và bảo mật.**
