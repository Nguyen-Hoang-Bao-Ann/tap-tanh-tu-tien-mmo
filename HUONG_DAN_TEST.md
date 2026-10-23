# HƯỚNG DẪN BUỔI TEST — Tập Tành Tu Tiên (bản MMO)

> CÁCH KHÁC — ĐƯA LÊN WEB LUÔN: nếu không muốn chạy server ở máy nhà,
> xem file `HUONG_DAN_LEN_WEB.md` (deploy lên Render.com miễn phí qua
> GitHub — bạn bè chỉ mở link, máy nhà không cần bật). File này dành
> cho cách chạy server tại nhà + tunnel.

## 1. Chuẩn bị trên máy chủ nhà (máy của Bảo)

1. Giải nén bản zip mới nhất **đè lên thư mục game cũ** (đừng xóa thư mục cũ —
   dữ liệu nhân vật/tài khoản nằm ở `server\data`, file zip không chứa nên
   giải nén đè sẽ giữ nguyên).
2. **Sao lưu**: copy thư mục `server\data` ra chỗ khác trước buổi test, phòng
   khi cần khôi phục.
3. Mở thư mục game, mở cửa sổ lệnh tại đó (gõ `cmd` trên thanh địa chỉ của
   File Explorer) rồi chạy:

```
npm start
```

4. Giữ nguyên cửa sổ server đang chạy, làm tiếp mục 1b để mở đường cho
   bạn bè ở xa.

## 1b. Mở đường cho bạn bè Ở XA (Cloudflare Tunnel — bạn bè không phải cài gì)

1. Vào trang phát hành của Cloudflare Tunnel trên GitHub
   (`github.com/cloudflare/cloudflared/releases`), ở bản mới nhất mở
   mục **Assets** và tải file **`cloudflared-windows-amd64.exe`**.
   Tải xong **đổi tên thành `cloudflared.exe`** và để vào thư mục game.
2. Mở **một cửa sổ cmd mới** tại thư mục game, chạy:

```
cloudflared.exe tunnel --url http://localhost:3001
```

3. Chờ vài giây, nó in ra một link dạng
   `https://<chữ-ngẫu-nhiên>.trycloudflare.com` — **đó là link gửi cho
   bạn bè**. Bạn bè chỉ việc mở link bằng Chrome (máy tính hay điện
   thoại đều được, có joystick cảm ứng trên điện thoại).
4. **Tự kiểm tra trước giờ hẹn** (quan trọng): cầm điện thoại của bạn,
   **tắt Wi-Fi** (dùng 4G), mở link đó — vào được game là bạn bè vào
   được. Chưa vào được thì xem mục Dự phòng dưới đây.
5. Suốt buổi test phải **giữ cả 2 cửa sổ mở** (server + cloudflared).
   Đóng cloudflared là link chết; mở lại thì nó cấp **link mới** —
   phải gửi lại link mới cho bạn bè.

Lưu ý: ai có link là vào được server — chỉ gửi link trong nhóm bạn bè
của buổi test, đừng đăng công khai.

**Dự phòng — Tailscale** (nếu Cloudflare không chạy trên mạng nhà bạn):
mọi người cùng cài Tailscale (trang tailscale.com, mục Download),
đăng nhập, chủ máy mời bạn bè vào mạng của mình (nút Share/Invite
trong trang quản trị), bạn bè mở `http://<IP-Tailscale-của-chủ-máy>:3001`
(IP dạng `100.x.x.x`, xem trong app Tailscale). Cách này bạn bè phải
cài app nhưng rất ổn định, hợp cho các buổi sau.

(Nếu có bạn nào qua nhà chơi cùng Wi-Fi thì khỏi cần tunnel: mở
`http://<IPv4-máy-chủ>:3001`, xem `ipconfig` để lấy IPv4, và bấm Allow
khi Windows Firewall hỏi lúc chạy server.)

## 2. Chế độ "test nhanh" cho tối nay (tùy chọn, nên dùng)

Chạy bình thường thì 1 ngày game = 24 phút thật, đột phá cần 200 Tu vi —
một buổi tối chỉ trải nghiệm được phần đầu. Muốn bạn bè thấy được nhiều
tính năng hơn (lên Luyện Khí nhanh, thương nhân ghé qua vài lần, vụ án
luân phiên đổi), chạy server bằng lệnh sau thay cho `npm start`:

PowerShell:
```powershell
$env:TTT_DAY_REAL_MS="600000"; $env:TTT_TUVI_NEED="5"; npm start
```

CMD thường:
```bat
set TTT_DAY_REAL_MS=600000
set TTT_TUVI_NEED=5
npm start
```

- `TTT_DAY_REAL_MS=600000`: 1 ngày game = 10 phút thật → thương nhân và
  các vụ án luân phiên xuất hiện nhiều lần trong buổi.
- `TTT_TUVI_NEED=5`: nhu cầu Tu vi đột phá giảm mạnh → lên Luyện Khí /
  Trúc Cơ nhanh để test công pháp, trùm thử thách, tông môn.

Lưu ý: hai biến này chỉ có tác dụng trong cửa sổ lệnh đang mở. Tắt cửa
sổ là server dừng; mở lại bằng `npm start` thường thì trở về nhịp thật.

## 2b. Điều khiển nhanh

**Máy tính:**
- Di chuyển: **WASD** hoặc phím mũi tên.
- Đánh thường: phím **J** hoặc bấm nút **⚔** ở khay chiêu dưới màn hình.
- **Né (vọt nhanh): phím Space** hoặc bấm nút 💨 cạnh nút ⚔ (hồi 2,5 giây).
- Tung công pháp: phím **1–5** (ô chính), **6–9** (ô đa dụng) — hoặc bấm
  chuột thẳng vào ô chiêu tròn tương ứng.
- Tương tác / nói chuyện / mở rương: phím **E**. Túi đồ: phím **I**.
- Bố cục màn hình: minimap ở **trái trên**; thẻ nhân vật + hàng nút công
  cụ ở **phải trên**; bảng chỉ số bấm nút **"▸ Chỉ số"** trong thẻ để mở.

**Điện thoại (màn hình cảm ứng):**
- **Joystick** ở trái dưới để di chuyển.
- Một cụm nút tròn duy nhất bám góc phải dưới quanh nút **⚔** (đánh
  thường, to nhất sát góc): **vòng cung trong là 5 nút chiêu chính**
  ghi tên công pháp theo ô 1–5, **vòng cung ngoài là 4 nút ô đa dụng**,
  nút **Né** và nút **···/E** tương tác ở mép trái của cụm.
- Chạm vào thẻ nhân vật (phải trên) để mở bảng chỉ số + cộng điểm.

## 3. Lộ trình gợi ý cho 1 buổi (~90 phút)

1. **Tạo tài khoản + nhân vật** (mỗi tài khoản tối đa 3 nhân vật): quay
   chỉ số, chọn lớp trong 9 lớp, chọn vũ khí, màu áo.
2. **Đo linh căn** ở Đạo Quán (đá đo ở quảng trường) → lên Luyện Khí 1,
   nhận 2 công pháp cơ bản của vũ khí đang cầm.
3. **Ra bãi farm** đánh cả 3 loài: Sói Xám (dễ), Dơi Đen (nhanh), Thạch
   Quái (góc đông bắc — trâu, dame to). Chú ý **rương rơi** khi hạ quái:
   đi tới gần là mở; rương của người khác làm rơi mình cũng mở được.
4. **Bán đồ + mua đan** ở Tiệm Đan / Tiệm Nguyên Liệu; dùng Đan Tụ Khí.
5. **Panel Công pháp (📖)**: học thêm chiêu khi đủ tầng (ngồi học tốn
   thời gian trong game — bị đánh là mất tiến độ học), xếp chiêu vào
   **2 bảng công pháp** (đổi bảng farm/tu luyện) + 4 ô đa dụng.
6. **Bảng treo thưởng** (giữa quảng trường): nhận nhiệm vụ; để ý các
   **🔍 vụ án luân phiên** — mỗi ngày mở vụ khác nhau.
7. **Chủ Tiệm Đan**: nhận chuỗi vụ án **bệnh lạ** 2 phần.
8. **Đối đầu Tu Sĩ Thù Địch**: nhận ở bảng → ra ngoài làng → mở panel
   Nhiệm vụ bấm ⚔ Đối đầu. Bạn bè đánh ké được nhưng **không cướp công**
   — chủ nhân phải tự kết liễu.
9. **Bế quan** ở Tụ Linh Trận (sau Đạo Quán): +3 Tu vi/ngày.
10. **Bảng Vàng** (tấm đá cạnh Bảng treo thưởng): xem xếp hạng Tu Vi /
    Tu Luyện của cả nhóm + Bảng Truy Nã.
11. Nếu gặp ngày **Thương Nhân Lưu Động** ghé (quảng trường phía đông,
    có loan tin toàn server): xem hàng — giá mỗi ngày mỗi khác, số
    lượng ít; thử **đặt hàng** món không có sẵn.
12. **Chết thử** 1 lần: hồi sinh ở quảng trường, không mất đồ.
13. Thoát ra vào lại: nhân vật, đồ đạc còn nguyên; để nhân vật ngồi
    thiền/ngủ rồi quay lại xem nghỉ offline.

## 4. Cách báo lỗi (gửi cho Bảo theo mẫu)

```
[LỖI]
- Đang làm gì: (đang đánh Thạch Quái / đang mua đồ / vừa bấm nút Học...)
- Thấy gì lạ: (màn hình đứng / quái không mất máu / chữ chồng nhau...)
- Mong đợi: (đáng lẽ phải...)
- Máy + trình duyệt: (Windows + Chrome / Android + Chrome...)
- Ảnh chụp màn hình: (đính kèm nếu có)
```

Nhận xét đồ họa/cảm giác chơi cứ ghi tự do: chỗ nào đẹp, chỗ nào xấu,
chữ khó đọc, nút khó bấm, lag ở đâu (đông người/đông quái có giật không).

## 5. Giới hạn ĐÃ BIẾT — khỏi mất công báo

- Giá bán đồ, tỉ lệ rơi vật phẩm lẻ, thưởng một số nhiệm vụ là **số tạm**
  của bản MMO (file thiết kế không ghi) — góp ý "đắt/rẻ" vẫn quý.
- Quái hồi sinh sau 5 giây (số tạm; file gốc là 120 giây).
- Chưa có PvP (đánh nhau giữa người chơi), chưa có bí cảnh, công pháp
  tông môn chưa làm.
- Đồ họa môi trường đang ở mức "tạm ổn" — buổi này chính là để lấy
  nhận xét thật về đồ họa.
- Thương nhân chỉ bán 3 món/ngày và số lượng ít — đó là thiết kế
  (hàng hiếm phải canh), không phải lỗi.
- Vụ án luân phiên: ngày không mở là không nhận được — thiết kế.

## 6. Sau buổi test

- Gửi lại cho Muse: danh sách lỗi + nhận xét của bạn bè (dán thẳng vào
  chat cũng được), kèm ảnh chụp nếu có.
- Muốn giữ dữ liệu buổi test thì thôi; muốn làm sạch cho nhóm chơi
  thật: xóa 3 file trong `server\data` (`characters.json`,
  `accounts.json`, `world.json`) khi server đang tắt.
