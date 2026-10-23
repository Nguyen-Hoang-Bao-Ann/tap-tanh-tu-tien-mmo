# ORACLE CLOUD ALWAYS FREE — máy chủ miễn phí vĩnh viễn cho game

Đây là cách "ngon" nhất trong các cách miễn phí: một máy chủ ảo riêng
— **không ngủ, đĩa bền (dữ liệu nhân vật không mất), chạy 24/7** —
giải quyết tận gốc cả 2 vấn đề của Render free. Đổi lại khâu đăng ký
và dựng máy cầu kỳ hơn; script đã chuẩn bị sẵn giúp phần khó nhất
thành 1 lệnh.

## Điều kiện & lưu ý trước khi bắt đầu

- Đăng ký Oracle **bắt buộc có thẻ ngân hàng thật** (credit hoặc
  debit, không nhận thẻ ảo/trả trước) để xác minh danh tính. Always
  Free **không trừ tiền** — chỉ nâng cấp lên trả phí mới tính.
- Hạn mức free hiện tại: máy ARM Ampere tổng **2 OCPU / 12 GB RAM** —
  game này chỉ ăn ~75 MB RAM khi 100 người chơi nên thừa rất nhiều.
- Chọn **Home Region = Singapore** lúc đăng ký (không đổi được sau
  này) — gần Việt Nam nhất, ping thấp.
- Tạo máy có thể gặp lỗi **"Out of capacity"** (hết máy free ở khu
  vực) — cứ thử lại lúc khác hoặc chọn 1 OCPU / 6 GB.
- Oracle có chính sách thu hồi máy **nhàn rỗi**: nếu suốt 7 ngày mà
  CPU/mạng/RAM đều dưới 20% thì họ gửi email rồi dừng máy. Đang có
  người chơi thường xuyên thì không sao; lâu không ai chơi thì thỉnh
  thoảng vào chơi một chút là giữ được máy.

## Bước 1 — Đăng ký

1. Vào `oracle.com/cloud/free` → **Start for free** → điền email,
   quốc gia, xác minh thẻ theo hướng dẫn.
2. Home Region: chọn **Singapore (Singapore)**.
3. Tạo xong, đăng nhập vào OCI Console.

## Bước 2 — Tạo máy ảo

1. Menu ☰ → **Compute → Instances → Create instance**.
2. Name: `taptien`. Image: **Canonical Ubuntu 24.04**.
3. Shape: bấm **Change shape** → **Ampere** → `VM.Standard.A1.Flex`
   → chỉnh **2 OCPU, 12 GB** (hoặc 1/6 nếu hết capacity).
4. Networking: để mặc định (tạo VCN mới). Mục **SSH keys**: chọn
   **Generate a key pair for me** → **Save private key** về máy tính
   (file này để đăng nhập máy ảo — giữ cẩn thận).
5. Bấm **Create** → chờ trạng thái **RUNNING**, chép lại **Public IP**.

## Bước 3 — Mở cổng 3001 ở trang Oracle

1. Bấm vào tên máy ảo → ở phần **Attached VNICs / Subnet** bấm vào
   subnet → **Security Lists** → security list mặc định →
   **Add Ingress Rules**:
   - Source CIDR: `0.0.0.0/0`
   - IP Protocol: **TCP**
   - Destination Port Range: `3001`
2. Bấm **Add Ingress Rules**.

## Bước 4 — Đăng nhập máy ảo & cài game bằng 1 lệnh

Trên Windows, mở PowerShell tại thư mục chứa file khóa `.key` đã tải:

```powershell
ssh -i .\ssh-key-xxxx.key ubuntu@<Public-IP>
```

Vào được máy ảo rồi thì:

```bash
# Nếu đã đẩy code lên GitHub theo HUONG_DAN_LEN_WEB.md:
curl -O https://raw.githubusercontent.com/<ten-ban>/tap-tanh-tu-tien-mmo/main/deploy/oracle-install.sh
bash oracle-install.sh https://github.com/<ten-ban>/tap-tanh-tu-tien-mmo.git
```

Script tự làm: cài Node.js 20 → clone code → cài thư viện → mở tường
lửa trong máy → tạo dịch vụ `taptien` tự chạy nền và tự bật lại khi
máy restart.

## Bước 5 — Chơi

Mở `http://<Public-IP>:3001` — gửi link này cho bạn bè. Xong!

- Xem server sống không: `systemctl status taptien`
- Xem nhật ký lỗi: `journalctl -u taptien -n 50`
- Cập nhật bản game mới: `cd ~/tap-tanh-tu-tien-mmo && git pull && npm run install:all && sudo systemctl restart taptien`
  — **dữ liệu nhân vật nằm trong `server/data` trên đĩa của máy ảo,
  cập nhật code không làm mất.**
- Chế độ test nhanh: sửa file dịch vụ như ghi chú trong script
  (bỏ dấu `#` ở 2 dòng `TTT_*`).
