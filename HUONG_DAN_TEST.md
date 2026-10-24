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
- Bố cục màn hình (GĐ61): thẻ nhân vật ở **trái trên** (nhiệm vụ ngay
  dưới thẻ), minimap ở **phải trên** với hàng nút có nhãn chữ ngay dưới
  (Túi đồ / Nhiệm vụ / Công pháp / Nghề / Thành tựu / Menu); bảng chỉ
  số bấm nút **"▸ Chỉ số"** trong thẻ để mở.

**Điện thoại (màn hình cảm ứng):**
- **Joystick** ở trái dưới để di chuyển.
- Một cụm nút tròn duy nhất bám góc phải dưới quanh nút **⚔** (đánh
  thường, to nhất sát góc): **5 nút chiêu chính xếp quạt** quanh ⚔,
  **4 ô đa dụng thành hàng đáy** (ô trống hiện Đ1–Đ4, bấm mở Sổ công
  pháp), nút **Né** và nút **💊** thuốc nhanh cạnh cụm. **Không còn
  nút E riêng**: đứng gần điểm tương tác (NPC, rương, cổng...) thì nút
  ⚔ tự thành **E xanh lá**, bấm là tương tác; muốn đánh thì bước ra xa
  hơn 70px. Pill **Linh thạch** dưới minimap: bấm mở panel ví 4 phẩm.
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
12. **Trận Dịch Chuyển (GĐ59 + GĐ60)**: vòng đá phát sáng xanh ở mép
    đông quảng trường, bấm E mở danh sách 52 bản đồ — đi Thanh Vân
    Thành (cần Luyện Khí 1), dạo các đất nghề; vùng chưa đủ cảnh giới
    sẽ ghi rõ điều kiện còn thiếu. Người ở map khác nhau không thấy
    nhau. Chết ở map khác → về quảng trường làng.
    - **GĐ60 — dịch chuyển TỐN Linh thạch**: theo cảnh giới map đích
      (Luyện Khí 50, Trúc Cơ 150, Kim Đan 400). Về làng miễn phí; từ
      map xa về thành miễn phí (khỏi sợ kẹt). Thiếu tiền thì xem mục
      12b — nhận việc hộ tống để đi miễn phí + có thưởng.
    - **Kim Đan: ngự kiếm** — nút 🗡 cạnh nút dịch chuyển, miễn phí
      nhưng bay chậm (~15 giây/chặng, có thanh đếm ngược; đang bay
      mà di chuyển là hủy chuyến). **Đảo ngoài biển** (Thâm Hải Bí
      Cảnh): Trận không tới được — đi thuyền ⛵ từ Thanh Vân Thành.
    - Các map nay RẤT TO (bãi săn 3800×2850, vùng ngũ hành
      4000×3000), cây cối/chướng ngại dày theo chủ đề: rừng cực
      nhiều cây + rắn Độc Xà NẰM ẨN phục kích (tới gần mới lao ra!),
      núi băng có hang băng, núi lửa có hố lửa — đứng vào hố lửa
      MẤT MÁU, tránh ra.
12b. **Hộ tống thương nhân (MỚI — GĐ60)**: gặp **Lái Buôn** (đứng
    cạnh Trận Dịch Chuyển ở quảng trường), bấm E → Nhận hộ tống một
    map → thương nhân đi theo bạn. Đi qua Trận tới map đó MIỄN PHÍ
    cả tuyến. Tới nơi sẽ có quái PHỤC KÍCH — bảo vệ thương nhân,
    đưa ông ta tới **cột sáng vàng ở GIỮA map** (chấm vàng trên
    minimap) để nhận thưởng Linh thạch + Tu vi. Thương nhân chết
    hoặc bạn thoát game giữa chuyến = hỏng chuyến.
12c. **Bản đồ thế giới (MỚI — GĐ60)**: **bấm vào minimap** (góc phải
    trên) → panel hiện chi tiết map đang đứng (quái gì, hố lửa/núi
    lửa/hang băng ở đâu, cổng ở đâu) + danh sách mọi map: cổng khóa
    thế nào, quái gì, dịch chuyển tốn bao nhiêu.
13. **Chết thử** 1 lần: hồi sinh ở quảng trường, không mất đồ.
14. Thoát ra vào lại: nhân vật, đồ đạc còn nguyên; để nhân vật ngồi
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
- Chưa có PvP (đánh nhau giữa người chơi); bí cảnh mới có Thạch Lâm
  (đệ tử tông môn); công pháp RIÊNG của tông môn chưa làm (đang chờ
  duyệt thiết kế).
- Núi lửa / hang băng trong các map là cảnh + chướng ngại vật,
  CHƯA vào trong được; việc hộ tống thoát game giữa chừng là mất
  chuyến (chưa lưu tiến trình hộ tống).
- Bản đồ đã có đủ 52 vùng (GĐ59) nhưng phần lớn cần Trúc Cơ / Kim
  Đan — đột phá Kim Đan chưa mở nên vùng Kim Đan chưa vào được bằng
  chơi thường; cảnh quan từng vùng là bản dựng theo chủ đề, chưa có
  NPC/cửa hàng riêng; quái vùng mới dùng hành vi cơ bản chung.
- Làng tân thủ vừa vẽ lại bằng ảnh PixelLab (nhà nhỏ, Đạo Quán to,
  cây mới) — buổi này rất cần nhận xét thật về đồ họa làng mới; các
  map khác vẫn dùng cảnh vẽ code, nhà lớn/thành phố vẽ sau.
- Thương nhân chỉ bán 3 món/ngày và số lượng ít — đó là thiết kế
  (hàng hiếm phải canh), không phải lỗi.
- Vụ án luân phiên: ngày không mở là không nhận được — thiết kế.

## 6. Sau buổi test

- Gửi lại cho Muse: danh sách lỗi + nhận xét của bạn bè (dán thẳng vào
  chat cũng được), kèm ảnh chụp nếu có.
- Muốn giữ dữ liệu buổi test thì thôi; muốn làm sạch cho nhóm chơi
  thật: xóa 3 file trong `server\data` (`characters.json`,
  `accounts.json`, `world.json`) khi server đang tắt.

## GĐ61 — Giao diện HUD mới (theo ảnh mẫu các bạn gửi)

- Thẻ nhân vật chuyển lên TRÁI TRÊN (nhiệm vụ ngay dưới thẻ), minimap
  sang PHẢI TRÊN với hàng nút có nhãn chữ ngay dưới (Túi đồ / Nhiệm
  vụ / Công pháp / Nghề / Thành tựu / Menu).
- Đánh trùm sẽ có THANH MÁU TRÙM lớn giữa trên màn hình; tung chiêu
  mạnh có HÔ TÊN CHIÊU vàng giữa màn hình; góc trái dưới là NHẬT KÝ
  thông báo sự kiện.

## GĐ62–66 — Giao diện điện thoại làm lại nhiều vòng

- Joystick + nút ⚔ cách mép màn hình 16px; nút công cụ xếp lưới 2×3;
  thẻ nhân vật gọn lại, thanh máu/mana mỏng dài ở giữa dưới.
- 5 ô chiêu xếp QUẠT quanh nút ⚔; nút tương tác E gộp hẳn vào ⚔
  (gần điểm tương tác → ⚔ thành E xanh lá, bấm là tương tác).
- Pill Linh thạch tách riêng dưới minimap (trên cảm ứng chỉ ghi
  "Linh thạch", bấm mở panel ví); chấm đỏ báo chiêu chưa học trên
  nút Công pháp và điểm chưa cộng ở góc avatar; nút 💊 uống thuốc
  nhanh (ưu tiên Hồi Xuân Đan → Đan Tụ Khí).

## GĐ67 — Linh thạch 4 phẩm rơi từ rương

- Rương quái rơi Linh thạch theo phẩm: quái thường phẩm Hạ, quái
  Trúc Cơ phẩm Trung, quái Kim Đan phẩm Thượng, **trùm phẩm Cực**.
- Bấm pill Linh thạch (hoặc dòng Linh thạch trên thẻ) mở panel ví
  gọn 4 phẩm. Hiện tại Trung/Thượng/Cực chỉ tích lũy, chưa tiêu được
  (về sau sẽ là tiền chính mua đồ, luyện chế...).

## GĐ68 — Đồ họa map mượt + nhiều cảnh trang trí

- Các map lớn (thành, đất nghề, bãi săn, vùng ngũ hành) vẽ mượt hơn,
  hết răng cưa khi camera chạy; thêm 15 loại cảnh mới theo vùng
  (trúc, đào, liễu, dừa, nhà ngói, lều, đình, núi, núi tuyết, hang
  đá, ao, sóng, cỏ, hoa, cỏ khô).

## GĐ69 — Sổ công pháp dạng tab + Cực phẩm từ rương trùm

- Mở Công pháp thấy Sổ dạng **tab ngang rộng, cuộn dọc** (không còn
  panel hẹp); khay chiêu desktop chỉ hiện icon (không còn chữ).
- **Cực phẩm** rơi từ rương trùm (trùm thật + trùm của map) và về
  sau là rương ẩn + nhiệm vụ xịn.

## GĐ70 — Tất cả loài quái, số lượng lớn, trùm khắp map

- Tổng quái **224 → 367 con**: map yếu cực kỳ đông quái, map mạnh
  ít dần; **trùm ở mọi map có quái trừ map Luyện Khí cơ bản**;
  2 map đặc biệt có 3 trùm (Vô Tận Hư Không, Thâm Hải Bí Cảnh).
- Quái có chiêu riêng: rắn độc (trúng độc rút máu), trâu húc lao
  thẳng + choáng, Cốt Binh hồi sinh 1 lần, mèo phân thân ảo ảnh,
  quái đánh xa (kiếm khí, độc đan, sét dây chuyền), hút máu, tàng
  hình, dậm băng (có báo trước), mưa lửa, triệu sét, trùm 5 hệ.
  Trúng độc/chậm/choáng sẽ có thông báo riêng.

## GĐ71 — Icon chiêu mới + nút công cụ kiểu mới

- 511 công pháp có icon riêng (phong cách game-icons): nhìn icon
  là đoán được hệ + vũ khí; chiêu hỗ trợ có vành xanh lá.
- Hàng nút công cụ (Túi đồ / Nhiệm vụ / Công pháp / Nghề / Thành
  tựu / Menu) có mặt nút kiểu game mới, vẫn giữ nguyên vị trí.

## GĐ72–73 — Làng tân thủ vẽ lại bằng ảnh PixelLab

- 5 nhà nhỏ (Nhà Trưởng Làng, Tiệm Đan, Tiệm Rèn, Quán Ăn, Tiệm
  Nguyên Liệu) dùng ảnh nhà PixelLab; **Đạo Quán** đổi sang đại
  điện rộng 2 tầng mái + 2 cánh; **cây trong làng** đổi sang cây tán
  tự nhiên (to nhỏ khác nhau, có cây lật ngang cho đỡ giống nhau).
- Va chạm, vị trí, thứ tự trước sau không đổi; biển tên "Đạo Quán"
  trên mặt tiền cũ không còn (điện có biển vàng trống), gợi ý phím
  E vẫn nhận diện Đạo Quán bình thường.
- Nhà lớn / map thành phố chưa vẽ — vẫn dùng nhà vẽ code.
