# Quy trình chuẩn: BIDV Direct → quản lý trường → Cổng phụ huynh → QR khoản còn thiếu

**Trạng thái:** nhánh thử nghiệm; CHƯA sử dụng dữ liệu/giao dịch học sinh thật. Không merge vào `main` trước QA và phê duyệt bảo mật.

## Vai trò hệ thống

- **Web quản lý Trưng Vương (offline-first):** nguồn dữ liệu gốc về học sinh, kỳ, món phải thu; nhập sao kê BIDV Direct (Excel/CSV) và ghi nhận tiền mặt/chuyển thẳng thủ công theo phiên; lưu dấu giao dịch duy nhất.
- **Cloudflare Worker + D1:** cổng công bố **đã phê duyệt**, lưu số phải thu/đã nộp/còn thiếu, đối chiếu từng khoản theo kỳ; kiểm soát quyền cán bộ bằng Access, người nhà tra cứu có mã riêng + Turnstile.
- **Công cụ tạo QR BIDV:** nguồn ảnh/payload QR theo **mã tài khoản định danh của từng khoản và kỳ thu**. Không tạo lại tài khoản mới khi chỉ đổi số tiền còn thiếu. Mã khoản và kỳ là bất biến sau khi công bố.
- **Cổng phụ huynh:** tra cứu; xem khoản đã thu/đang thiếu; bấm xem QR **chỉ nếu đã xác minh đúng tài khoản định danh và số tiền còn thiếu**.

## Các bước tác nghiệp chuẩn

1. Cán bộ tải bảng kê BIDV Direct có **số tham chiếu giao dịch thật, ngày giao dịch, nội dung/mã định danh, trạng thái và số tiền** vào tab **Nhập dữ liệu**. Chỉ giao dịch thành công được xem xét khớp.
2. Bộ đối soát theo `qrAccountNumber/paymentCode` gắn với **một món thu và kỳ**; trong trường hợp nộp một phần, cộng dồn các giao dịch có tham chiếu khác nhau. Món không có tham chiếu thật, không rõ kỳ, không rõ mã hoặc nộp vượt đưa danh sách **cần xác minh**.
3. Giao dịch tiền mặt/thủ quỹ/chuyển thẳng được lưu như giao dịch riêng có nguồn thu và mã tham chiếu; không tự coi là giao dịch BIDV.
4. Cán bộ chọn **Đồng bộ thu nộp** trong tab **Nhập dữ liệu**, web trường xây dựng bản nháp từ nguồn cục bộ và đối chiếu danh mục khoản thu đã công bố trên D1. **Không gửi học sinh thật khi chưa có cơ chế bảo mật/sự đồng ý triển khai phù hợp.**
5. Cửa sổ quản trị Cloudflare Access kiểm tra lại số tiền, tham chiếu, khoản thu, kỳ thu trên D1 (PREVIEW); chỉ khi được cán bộ xác nhận mới ghi. Bản ghi trùng mã phải là idempotent; khi nhiều lần nộp cùng một món trong một lô phải kiểm tra tổng <= số còn thiếu.
6. Phụ huynh tra cứu thấy dữ liệu mới sau COMMITTED; nếu có lô chưa đối chiếu/đã hủy, cổng không tự cộng thêm.
7. Với khoản còn thiếu: yêu cầu ảnh QR qua **hợp đồng API QR chung** bên dưới; chỉ công bố sau khi cán bộ xác minh tài khoản thụ hưởng BIDV, định danh món, kỳ thu, số tiền và khả năng quét thanh toán. Khi số còn thiếu thay đổi, ảnh QR cũ không còn đủ điều kiện hiển thị.

## Quy ước hợp đồng API QR (thiết kế, chưa kích hoạt)

`POST /api/admin/qr/preview` trên máy quản trị (không công khai trực tiếp ở GitHub Pages), dữ liệu đầu vào:
```json
{
  "school_id": "TRUNGVUONG",
  "student_id": "<ma-noi-bo>",
  "charge_id": "<ma-mon-thu>",
  "period_id": "2026-11",
  "virtual_account": "<tai-khoan-dinh-danh-da-duoc-BIDV-xac-nhan>",
  "bank_bin": "<BIN-BIDV-da-xac-nhan>",
  "account_name": "<ten-chu-tai-khoan-da-xac-nhan>",
  "amount": 400000,
  "remark": "<ma-noi-dung-dinh-danh-hop-le>"
}
```
Trả về `preview_id`, `payload_emv`, `qr_png`, `amount`, `account`, `valid_until` (nếu phù hợp) và trạng thái **UNVERIFIED**. Không trả mã QR giả khi không đủ điều kiện. Bước duyệt độc lập `POST /api/admin/qr/approve` chỉ cho cán bộ đã xác thực, kiểm tra payload khớp đúng tài khoản, mã thu và số tiền còn thiếu tại **thời điểm duyệt**; lưu bản QR và dấu xác minh vào D1, ghi audit.

**Lưu ý:** hợp đồng này là thiết kế API cho bộ sinh QR chung. Chưa có endpoint `/api/admin/qr/preview` hoặc `/api/admin/qr/approve` trong Worker và chưa triển khai tạo QR ngân hàng từ frontend phụ huynh. Cần đặc tả chính thức của bộ QR hiện có và dữ liệu tài khoản do BIDV xác nhận trước khi hiện thực.

## Kiểm soát an toàn hiện đã triển khai trên DEMO

- Access bảo vệ `/admin*` và `/api/admin/*`.
- D1 có unique `(school_id,source_ref)`.
- Có trigger D1 chặn chèn/sửa phân bổ làm tổng nộp **vượt nghĩa vụ** của món.
- Batch demo 1–30 giao dịch, nhiều lần nộp hợp lệ cùng món; kiểm tra lại tiền còn thiếu trước ghi.
- Cổng tra cứu chỉ trả QR nếu `qr_verified=1`, ảnh hợp lệ và `qr_amount == remaining`.
- Trang `/admin/qr-status` giúp rà soát tình trạng QR từng món.
- Bản giao diện nhánh thử nghiệm đưa nút đồng bộ vào ngay tab **Nhập dữ liệu**.

## Tiêu chí nghiệm thu để dùng thật

- [ ] BIDV Direct: nhập lại một file không làm phát sinh trùng; hai file cùng mã giao dịch không làm ghi hai lần.
- [ ] Đối soát đúng ngày/tháng và giờ; ngày thiếu giờ được gắn cờ **date_only**, không được trình bày như giờ giao dịch thật.
- [ ] Hai khoản nộp bổ sung vào cùng món cùng kỳ không làm tăng quá nghĩa vụ; giao dịch khác kỳ không lẫn nhau.
- [ ] Giao dịch gộp nhiều khoản chỉ phân bổ khi xác định được cấu phần; không tự đoán.
- [ ] Kết quả ngân hàng thất bại/chưa xử lý và lô chưa duyệt không hiển thị là đã nộp.
- [ ] Hoàn tác, kiểm tra lặp, và ghi đồng thời an toàn, có audit.
- [ ] Bắt buộc xác minh QR thật trên ứng dụng ngân hàng trước khi công bố và sau nộp một phần.
- [ ] Cơ chế phân quyền nhiều trường, sao lưu/phục hồi, nguồn dữ liệu cá nhân được pháp lý/nhà trường phê duyệt.
- [ ] Môi trường thật dùng D1 riêng, khóa bí mật riêng, không dùng 15 học sinh demo.

## Địa chỉ thử nghiệm

- Web trường (nhánh thử nghiệm): dùng `?parentSyncPreview=1` và tab **Nhập dữ liệu**.
- Quản trị: `https://school-parent-dev.tuananh0001.workers.dev/admin/live-bridge` (chỉ mở từ web trường).
- Báo cáo: `https://school-parent-dev.tuananh0001.workers.dev/admin/reconciliation`.
- Kiểm tra QR: `https://school-parent-dev.tuananh0001.workers.dev/admin/qr-status`.



## Kết nối QR từ bidvqrgen (07/11/2026 – DEMO)

**Đã triển khai:**
- Bộ sinh QR hàng loạt `https://anhvt777.github.io/bidvqrgen/` có 2 nút: **Xuất danh mục QR** (JSON cục bộ) và **Kết nối trực tiếp cổng phụ huynh (DEMO)**.
- Bộ xuất lấy dữ liệu **AccountNumber, BankBin, Amount, AccountName, Remark, StudentName, Class, FeeName, StudentID** đúng từ Excel hiện tại. Không tự sinh một tài khoản ngân hàng khác; payload EMV được tạo cục bộ và lưu cùng ảnh QR. Không tự tải ảnh lên Cloudflare.
- Màn hình duyệt QR `/admin/qr-review` chỉ cho người đăng nhập Cloudflare Access; nhận file JSON hoặc dữ liệu chuyển trực tiếp từ bộ sinh QR bằng `postMessage` có challenge ngẫu nhiên và kiểm tra origin.
- API `/api/admin/qr-review` kiểm tra mã trường, BIN BIDV 970418, tài khoản nhận, mã định danh (`payment_reference`), tên/lớp, tên khoản, **số tiền chính xác còn thiếu trên D1**, payload EMV/CRC, PNG và trạng thái xác minh.
- Cán bộ phải quét QR bằng ứng dụng ngân hàng và xác nhận trước khi lưu `qr_verified=1`; bản demo được lưu `qr_source='DEMO_ONLY'` kèm dấu vết phê duyệt, không tự coi là giao dịch ngân hàng.
- Cổng phụ huynh chỉ trả ảnh QR nếu `qr_verified=1`, ảnh hợp lệ và `qr_amount == remaining > 0`. Khi có khoản nộp một phần mới, QR số tiền cũ lập tức không còn đủ điều kiện hiển thị.
- Nhánh thử nghiệm web Trưng Vương có nút **Xuất QR số dư còn thiếu (giữ tài khoản cũ)** trong mục xuất bảng kê tạo QR; tệp .xlsx đúng 11 cột dùng lại tại bidvqrgen.

### Chu trình kiểm thử dự kiến

1. Tại web trường bản nhánh thử nghiệm: ghi nhận giao dịch BIDV Direct giả lập, xác minh khớp món, kỳ và tổng còn thiếu. Chỉ dùng dữ liệu giả.
2. Mục **Thiết lập khoản thu → Xuất bảng kê tạo QR**, chọn đúng lớp/khoản/kỳ. Với học sinh đã nộp một phần, chọn **Xuất QR số dư còn thiếu**; tài khoản định danh phải giữ nguyên.
3. Tải .xlsx lên **bidvqrgen**, kiểm tra mẫu QR trên trang, chọn **Kết nối trực tiếp cổng phụ huynh (DEMO)** (hoặc tải JSON dự phòng).
4. Trong trang `/admin/qr-review`, chọn từng món, bấm **Đối chiếu với D1**. Kiểm tra đúng lớp, tên, kỳ, số tiền còn thiếu, tài khoản và Remark; quét bằng app ngân hàng rồi xác nhận. Nếu không xác minh được tài khoản/QR thật, không phê duyệt.
5. Tra cứu trên `/admin/reconciliation` và cổng phụ huynh. QR hợp lệ sẽ hiển thị đối với món chưa thu đủ.
6. Ghi thêm một khoản thu DEMO, tái tra cứu: QR số tiền cũ không được hiển thị. Xuất lại file QR số dư còn thiếu và duyệt lại để hiện QR mới.
7. Nạp lại cùng sao kê và cùng mã giao dịch: không tăng thu; thử lô nhiều khoản cùng món, cố gắng ghi vượt nghĩa vụ phải bị từ chối.

**Đã kiểm thử logic:** payload tạo ở bidvqrgen khớp thuật toán kiểm tra EMV của Worker; đối chiếu QR 600.000đ cho nghĩa vụ còn 400.000đ → `HELD/AMOUNT_CHANGED`; 400.000đ → `PREVIEW`; payload bị sửa → bị từ chối; request khác origin → bị từ chối. Những bài test này không thao tác tài khoản ngân hàng.

**Chưa xác nhận:** đăng nhập Access + popup + quét app ngân hàng + bước duyệt mã QR end-to-end trên thiết bị thật, vì chưa có file QR/tài khoản được ngân hàng xác minh. D1 hiện chưa có QR được công bố. Chưa triển khai tài khoản thật/đa trường. Không dùng QR DEMO để thu tiền thật.
