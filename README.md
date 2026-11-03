# Trường Trưng Vương · SchoolCollect (bản độc lập thử nghiệm)

Bản sao chuyển đổi từ mã nguồn `anhvt777/thcs_so2_hieugiang`, được phát triển độc lập trong repository `anhvt777/trungvuong`. **Không sửa repository Hiếu Giang 2.**

## Điểm đã tách riêng

- Tên trường Trưng Vương, ID học sinh mặc định `TV-...`, ID kho IndexedDB riêng `so-thu-hoc-sinh-trungvuong-local`.
- Cache Service Worker riêng cho Trưng Vương.
- Mẫu biên nhận và nhãn giao diện đổi sang Trưng Vương.
- Không đưa danh sách học sinh hay dữ liệu thanh toán thật lên GitHub.
- Giữ nguyên quy trình nhập Excel, đối chiếu thu, thu tiền mặt, báo cáo và tạo QR hiện hữu trong bản nguồn.

## Cổng phụ huynh - giai đoạn thử nghiệm

Trong mục **Sao lưu & cài đặt**, nút **Xuất bản nháp đồng bộ phụ huynh (JSON)** chỉ tạo một tệp JSON tại máy để đối chiếu. Không tự đồng bộ internet. Tệp chứa dữ liệu cá nhân, **không commit lên GitHub**, không chia sẻ công khai.

Bản nháp sử dụng một khoản thu / một QR dựa trên mã thanh toán và cấu hình tài khoản của nhà trường. Chỉ đánh dấu khoản *đã nộp* khi có giao dịch khớp, không hỗ trợ phân bổ một phần. Cần kiểm thử và xác nhận quy trình trước khi nhập Cloudflare.

**Chưa bật đăng nhập phụ huynh/đồng bộ lên Cloudflare từ website này.** Bước tiếp theo là xây API đồng bộ bảo mật và kiểm tra bằng dữ liệu giả lập; không đưa dữ liệu học sinh thật lên khi chưa đánh giá pháp lý và cấu hình bảo mật.

## Triển khai GitHub Pages

Repository Settings → Pages → Deploy from a branch → `main` / `(root)`. URL dự kiến: `https://anhvt777.github.io/trungvuong/` sau khi Pages được bật.

Kiểm tra cấu hình QR ngân hàng, tiền tố mã khách hàng, tên trường/cơ quan chủ quản, năm học và các kỳ thu trước khi triển khai thật. Cơ chế định danh `TV` chỉ áp dụng cho dữ liệu mới trên bản Trưng Vương; không nhập chung dữ liệu trường Hiếu Giang 2.
