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
4. **Bán đồ + mua đan** ở Tiệm Đan / Tiệm Nguyên Liệu; dùng Hồi Xuân Đan (hồi máu) / Đan Hồi Nguyên (hồi chân nguyên). Đan Tụ Khí đã bỏ hẳn từ GĐ76 — túi cũ tự đổi sang Hồi Xuân Đan.
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
    đông quảng trường, bấm E mở danh sách 72 bản đồ — đi Thanh Vân
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
  (đệ tử tông môn); công pháp RIÊNG đã có cho 30 tông môn mới (GĐ80,
  học tại Sứ Giả), 2 tông cũ (Thiên Kiếm / Huyền Thiên) vẫn chờ duyệt
  thiết kế riêng.
- Núi lửa / hang băng trong các map là cảnh + chướng ngại vật,
  CHƯA vào trong được; việc hộ tống thoát game giữa chừng là mất
  chuyến (chưa lưu tiến trình hộ tống).
- Bản đồ đã có đủ 72 vùng (GĐ59 + 20 thành phố GĐ79) nhưng phần lớn cần Trúc Cơ / Kim
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

## GĐ74 — Sửa theo feedback: banner, đồng hồ, pill, trả nhiệm vụ, phiên bền, reset chỉ số

- Vào map chỉ thấy banner tên map **2,5 giây rồi tự mất** (không còn đứng suốt).
- Đồng hồ ngày/giờ dời vào cuối thẻ nhân vật (trái trên); pill Linh thạch
  nằm **trong khung minimap**, bấm mở panel ví.
- Panel cuộn được, chữ nhỏ lại — panel nào dài thì cuộn xuống xem hết.
- **Trả nhiệm vụ được ngay tại Bảng** treo thưởng, không cần về Nhà
  Trưởng Làng.
- Thoát game rồi vào lại **không bị bắt đăng nhập lại** (phiên sống qua
  cả restart server).
- Bảng chỉ số có nút **Reset chỉ số (100 Linh thạch Hạ phẩm)**: chỉ hoàn
  điểm đã cộng từ GĐ74 trở đi.

## GĐ75 — Nút quanh minimap + pill ảnh đá

- 6 nút công cụ chia 2 cụm quanh minimap: trái minimap (Túi đồ / Nhiệm
  vụ / Công pháp), dưới minimap (Nghề / Thành tựu / Menu); trên điện
  thoại thành 2 cột kề nhau.
- Pill Linh thạch dùng **ảnh đá của bản game đơn cũ**, chỉ ghi
  "Linh thạch: N" với N là số của phẩm đang có nhiều nhất (bằng nhau
  thì lấy phẩm cao hơn).

## GĐ76 — Tu vi + hồi phục làm lại: bỏ Đan Tụ Khí, thiền tại linh mạch

- **Đánh quái không còn cho Tu vi.** Tu vi giờ từ nhiệm vụ, hộ tống,
  Phù Tụ Linh, và **ngồi thiền tại điểm linh mạch**.
- **Không còn hồi chân nguyên tự động** (trong hay ngoài giao tranh).
  Trong giao tranh chỉ hồi bằng đan: Hồi Xuân Đan (máu), **Đan Hồi
  Nguyên mới (50% chân nguyên)**.
- Sau **5 giây rời giao tranh** mới ngồi thiền được (phím **M** / nút
  🧘): thiền hồi máu 1%/giây + chân nguyên từ từ; thiền tại điểm có
  marker **✦ Linh mạch** (Tụ Linh Trận + 2 điểm làng + 3 điểm/map)
  thì **+1 Tu vi/30 giây, tối đa 15/ngày game**.
- Đan Tụ Khí đã bỏ hẳn: túi cũ tự đổi sang Hồi Xuân Đan, mua đan cũ
  bị chặn, rương không còn rơi đan cũ.

## GĐ77 — Số giây hồi chiêu hiện trên nút

- Chiêu càng mạnh hồi càng lâu vốn đã có sẵn (Cơ bản ~1,6s, Luyện Khí
  ~5s, Trúc Cơ ~19s) — giờ **số giây đếm ngược hiện ngay giữa nút
  chiêu** (khay desktop, ô đa dụng, quạt cảm ứng), hết hồi thì tự mất.

## GĐ78 — Đói/khát thay suy nhược

- Thẻ nhân vật có thêm 2 thanh **🍖 Thức ăn + 💧 Nước uống** (bắt đầu
  100): hao khi giao tranh và khi chế tạo thành công; **chỉ ăn/uống
  mới hồi**, không tự hồi.
- Hết 1 trong 2 thanh thì thiền **không hồi máu/chân nguyên** (Tu vi
  vẫn lên); ≤20% báo đói/khát, =0 báo kiệt sức.
- **Kim Đan trở lên tịch cốc**: 2 thanh ẩn, không hao, ăn vào bị từ
  chối.
- Đồ ăn/uống mua ở **Tửu Lâu** (cửa Quán Ăn) và Thương Nhân Lưu Động:
  Cơm Nắm, Thịt Nướng, Lương Khô, Nước Lọc, Trà Thảo Mộc, Rượu Gạo,
  Bánh Thịt Thú (vừa hồi máu vừa +thức ăn).

## GĐ79 — Cụm chiêu nhích khỏi góc + 30 tông môn + 20 thành phố

- Cụm nút chiêu cảm ứng (⚔ + quạt) **nhích sang trái 20px**, khỏi sát
  mép phải; khay desktop căn giữa nên không đổi.
- **20 thành phố mới** (tổng 72 map, 30 thành phố): đi từ Thanh Vân
  Thành như cũ.
- **30 tông môn mới** (tổng 32 tông): 15 nhỏ (vào từ Luyện Khí, không
  cần công trạng), 10 vừa (từ Trúc Cơ, công trạng ≥100), 5 lớn (từ
  Kim Đan, công trạng ≥300); chiêu mộ quanh năm, gia nhập tại Sứ Giả
  trong làng; mỗi tông có trụ sở ở đúng 1 thành phố (ghi trong hộp
  thoại Sứ Giả).
- Lưu ý: **Thạch Lâm vẫn chỉ dành cho đệ tử Thiên Kiếm / Huyền Thiên**
  — tông mới không phải cửa sau vào bí cảnh.

## GĐ80 — 500 công pháp riêng của tông môn mới

- Mỗi tông mới có công pháp riêng: nhỏ 10, vừa 20, lớn 30 (tổng 500).
- **Chỉ đệ tử đúng tông mới học được, học tại Sứ Giả**: Cơ bản học
  ngay, Luyện Khí ngồi 720 phút game, Trúc Cơ 2880 phút game (chiêu
  Luyện Khí của tông học ngay tại Sứ Giả, không cần ra Đạo Quán).
- Sau khi học, chiêu hiện trong Sổ công pháp để lắp/tháo ô như chiêu
  thường. 2 tông cũ chưa có chiêu riêng (vẫn ưu đãi học Trúc Cơ −5
  chỉ số như trước). Danh sách đủ 32 tông + 500 chiêu xem file
  `Tong_mon_va_cong_phap.md` kèm theo.

## GĐ81–83 — Nút chiêu cảm ứng: hiện lại đủ ô + Thiền kiểu nút Né

- Quạt chiêu hiện **đủ số ô của nhân vật** (Luyện Khí 3, Trúc Cơ 4,
  Kim Đan 6; LK/TC tầng 7+ thêm 1 ô): ô đã lắp chiêu hiện icon, ô trống
  hiện số phím + mờ, ô vượt số ô thì ẩn hẳn.
- Nút **Thiền kiểu nút Né**: tròn, chỉ có chữ (không còn icon 🧘),
  cỡ bằng nút Né; 5 nút trên thanh máu/chân nguyên (💊 + Đ1–Đ4) đều
  nhau, cỡ bằng nút Né.

## GĐ84 — Đan đột phá: mua ở Tiệm Đan + Đan Sư chế từ nguyên liệu

- **Tiệm Đan Dược** giờ hiện đủ 3 đan đột phá: Đan Trung Cảnh 200,
  Đan Trúc Cơ 800, Đan Hộ Mạch 300 Linh thạch (Tiệm Tông Môn rẻ hơn
  ~15% cho đệ tử tông).
- **Đan Sư chế được**: Trung Cảnh = 10 Nanh Sói + 20 LT (tỉ lệ 0,7);
  Trúc Cơ = 20 Nanh Sói + 2 Đá Quý + 50 LT (0,6); Hộ Mạch = 8 Nanh
  Sói + 2 Cánh Dơi + 15 LT (0,75). Nghề khác không chế được — mua ở
  tiệm.
- Đột phá Luyện Khí trung kỳ (3→4) và hậu kỳ (6→7) cần Đan Trung
  Cảnh + thắng Thử Luyện Thú ở Đạo Quán; đột phá Đại cảnh (LK9→TC1)
  cần Đan Trúc Cơ + thắng Tâm Ma Ảnh (Đan Hộ Mạch +10% tỉ lệ, tự tiêu
  hao khi quay). Mọi số trên đều là số tạm.

## GĐ85 — Đàn tế triệu hồi trùm

- Mỗi map có trùm đều có **🕯️ Đàn Tế** ngay phía bắc cổng vào map
  (cách cổng 160px): tới gần bấm **E** mở hộp thoại, bấm nút triệu
  hồi để gọi trùm map đó ngay, **200 Linh thạch/lần, mỗi map 1 lần/
  ngày game** (ngày game tính chung cho mọi người — ai tế trước được
  trước).
- Chỉ tế được khi trùm map đã chết hết; trùm còn sống thì nút triệu
  hồi khóa kèm lý do. Trùm triệu hồi rớt rương như trùm thường
  (rương trùm có Cực phẩm), không nhân đôi với hồi sinh tự nhiên.
- Lưu ý: Thạch Lâm và làng không có đàn tế.

## GĐ86 — Nội dung sống thành tiến trình (không còn sự kiện xổ số)

- **Đối đầu Tu Sĩ Thù Địch**: thắng rồi gặp lại, hắn mạnh dần
  (máu ×2 rồi +0,5 mỗi lần thắng, tối đa ×5) và thưởng thêm 25 Linh
  thạch mỗi bậc (lần 1: 100, lần 2: 125).
- **Bệnh lạ cần điều tra**: nói chuyện đủ 3 người (Trưởng Làng +
  Chủ Tiệm Đan + Chủ Tiệm Nguyên Liệu) mới đủ manh mối, Chủ Tiệm
  Đan mới giao phần 1; phần 2 chỉ mở sau khi trả xong phần 1.
- **Thương nhân khách quen**: mua hàng/nhận đơn tăng mức khách
  quen (lưu bền); mức ≥3 xem/mua được món thứ 4 trong kho, ≥5
  giảm 10%, ≥10 giảm 15% (không cộng dồn với giảm giá thiện cảm).
  Thương nhân giờ có điểm E riêng trước tiệm (trước đây hộp thoại
  của ông chỉ mở được từ chính tiệm của ông). Mọi số đều tạm.

## GĐ87 — Mở đột phá Trúc Cơ 9 → Kim Đan (theo mẫu đột phá Đại)

- Cần **Đan Kết Đan** (Tiệm Đan 2000, Tiệm Tông Môn 1700; Đan Sư
  bậc 2 chế từ 30 Nanh Sói + 5 Đá Quý + 200 LT, tỉ lệ 0,5) + thắng
  thử thách **Lôi Kiếp Ảnh** ở Đạo Quán (máu gấp 8 lần quái tinh
  anh, phase 2 phân thân 2 bóng sét, nhuộm vàng).
- Tỉ lệ như đột phá Đại: gốc 0,60 + Đan Hộ Mạch 0,10 + chỉ số
  0,10 − linh căn 0,05 mỗi hệ thừa + thua liên tiếp 0,10, kẹp
  [0,10, 0,95]; thua 3 lần liên tiếp thì lần sau chắc chắn thành
  công. Phạt khi thất bại như đột phá Đại. Thành công +15 điểm
  chỉ số, +100 thọ (tạm). Tu vi cần cho TC9→KD1 là 1373.
- Trong Kim Đan chỉ có tiểu cảnh (+5 điểm/tầng, tạm); KD9 hiện
  báo "Nguyên Anh chưa mở".

## GĐ88 — Kim Đan đủ bộ: ô chiêu thứ 6, thần thông, ngự kiếm, tầm xa, hộ thể

- **Ô công pháp thứ 6** cho Kim Đan (desktop phím 0, cảm ứng nút
  thứ 6 cạnh quạt chiêu; Trúc Cơ trở xuống lắp ô 6 bị chặn).
- **Thần thông riêng theo lớp** (9 chiêu, hệ số 3,0 trừ Y tu 2,0,
  hồi 30s, tốn 100 chân nguyên — số tạm): chỉ nhận được khi đột
  phá Kim Đan thật, tự lắp vào ô trống.
- **Ngự Kiếm Phi Hành** (phím F): bay nhanh hơn 50%, bỏ qua vật
  cản (bay qua nhà, cây), hạ xuống bằng F lại; quái vẫn đánh trúng
  người đang bay. **Thần Thức Ngoại Phóng** (KD4+): tầm đánh
  +20%. **Kim Đan Hộ Thể** (KD7+): máu ≤30% tự bật khiên giảm
  50% sát thương trong 10s, hồi 60s (số tạm).
- Lưu ý: nhân vật đã lên Kim Đan bằng cách khác (không qua đột
  phá) sẽ chưa có thần thông — chỉ đột phá thật mới cấp.

## GĐ89 — 30 thành phố có dân: 6000 NPC, gia nhập tông tại trụ sở, tiệm thành

- Mỗi thành phố giờ có **200 người thật** (50 vai chức năng + 150
  dân thường): 10 thành cũ dùng danh sách sẵn có, 20 thành mới
  sinh theo cùng mẫu (tên cố định). Dân đứng quanh quảng trường
  phía bắc cổng; nhãn chức năng chỉ hiện khi lại gần (trong
  260px) cho đỡ rối màn hình, dân thường không có nhãn.
- Bấm **E nói chuyện được với tất cả**. **Sứ Giả Tông Môn tại
  thành trụ sở** cho gia nhập đúng tông đó tại chỗ (không cần về
  làng), đệ tử xem được chiêu tông riêng và mua Tiệm Tông Môn
  ngay tại trụ sở. **Chủ Tiệm Đan / Chủ Tiệm Nguyên Liệu** mở
  tiệm bán như tiệm làng (cùng giá).
- Các vai khác (đấu giá, ngân hàng, giao nhiệm vụ, vũ khí...)
  đợt này mới chỉ nói chuyện, mở chức năng sau. Map nghề chưa
  có dân.
- Sửa kèm: người chơi logout ở map khác, server restart xong
  tỉnh dậy ở làng (lỗi giữ map của nhân vật offline) — nay giữ
  đúng map đang đứng.

## GĐ90 — Nhiệm vụ thành phố + nhiệm vụ bảng cao cấp

- Vào bất kỳ thành phố nào, tới gặp **Người Giao Nhiệm Vụ** (đứng
  trong quảng trường, bấm E nói chuyện): ông ta giao 2 nhiệm vụ của
  thành đó (1 diệt quái + 1 thu thập, đúng cảnh giới thành — thành
  Luyện Khí thì diệt Sói/Dơi/Thạch Quái quanh làng, thành Trúc Cơ thì
  Huyết Lang/Địa Hành Yêu, thành Kim Đan thì quái Kim Đan). Bấm
  **Nhận** trong hộp thoại, làm xong quay lại đúng ông ta bấm **Trả**
  (nhận/trả sai thành hoặc từ xa đều bị chặn, game báo rõ).
- Nhiệm vụ thành phố **không hiện ở Bảng làng** — xem tiến độ ở khung
  nhiệm vụ góc trái trên (ghi rõ "Trả tại <tên thành>" khi xong).
- Ra **Bảng treo thưởng giữa làng** có thêm 8 nhiệm vụ mới cho Trúc
  Cơ/Kim Đan: diệt Kiếm Ma (lưu ý: cần Trúc Cơ tầng 7 mới vào được
  Cổ Chiến Trường), Huyết Lang, Địa Hành Yêu, thu thập Đá Quý, diệt
  Kim Giáp Tê, Thiên Lôi Thú, Hỗn Độn Thú. Trả ở Bảng hoặc Nhà Trưởng
  Làng như cũ, vẫn tính vào số nhiệm vụ bảng (đủ 10 có Thư Tiến Cử).

## GĐ91 — Map như thật: cây đi xuyên, đá chặn, đứng sau bị che

- Vào rừng hoặc thành phố, đi thẳng qua cây — cây không còn chặn
  đường nữa (người, quái đều qua được). Đứng sau cây (phía bắc, tức
  phía trên màn hình) thì bị tán cây che mất một phần người, đi ra
  phía nam thì hiện rõ trở lại. Đứng sau tảng đá/núi cũng bị che
  tương tự.
- Đá, núi, hang động, nhà vẫn chặn đường như cũ: đi vào thì dừng
  lại, phải đi vòng qua. Dải rừng ngăn vào Thạch Lâm vẫn chặn (không
  đi bộ vào được, vẫn phải qua cổng như trước).
- Bố cục cây/đá các map có xáo lại một chút so với bản trước (do đổi
  luật va chạm) — đó là cố ý, không phải lỗi.


## GĐ93 — Bỏ xoay map + bỏ vật cản che nhân vật (user yêu cầu 26/10)

- Không còn xoay map nữa: bỏ phím Q/R/T, bỏ hàng nút xoay dưới
  minimap, bỏ camera tự động — map luôn hướng Bắc như trước.
- Không còn vật nào che nhân vật nữa: cây, nhà, đá, decor các map
  đều vẽ dưới nhân vật — đứng sau cây cũng thấy người rõ.
- Giữ nguyên luật đi lại của GĐ91: cây vẫn đi xuyên được, đá/núi/
  nhà vẫn chặn đường phải đi vòng.

## GĐ94 — Map chừa lối cho nhà, cổng, NPC

- Đi trong thành phố giờ thoáng hơn hẳn: khu dân không còn đá,
  nhà, vật cản chèn giữa các NPC nữa — tới ông giao nhiệm vụ,
  sứ giả tông môn, chủ tiệm đều đi thẳng được, không bị kẹt.
- Nhà cửa, đàn tế, điểm linh mạch ở các map khác cũng vậy: vật
  cản không rơi trúng nữa, luôn có lối đi vòng quanh.
- Đá, núi, hang vẫn chặn đường như cũ (đi vòng qua) — chỉ khác
  là chúng không còn chặn đúng chỗ cần tới. Bố cục cây/đá các
  map có xáo lại một chút so với bản trước (do đổi luật đặt) —
  đó là cố ý, không phải lỗi.

## GĐ95 — Khung cơ chế lớp + Thể Tu (Nộ Khí)

- Thể Tu có thêm thanh Nộ Khí trên thẻ nhân vật (dưới thanh
  thức ăn/nước uống, chỉ Thể Tu mới thấy): đánh trúng quái
  thì Nộ tăng, bị quái đánh trúng cũng tăng; Nộ càng cao
  càng trâu (tối đa giảm 30% sát thương nhận); Nộ đầy thì
  đòn đánh thường mạnh thêm bằng một nửa Vật phòng; máu
  xuống dưới 20% thì tự bật Bất khuất 5 giây (không bị
  choáng, không bị làm chậm).
- Các lớp khác chơi như cũ, chưa có thanh riêng.
- Chưa có: nấu ăn Tẩm bổ tăng vĩnh viễn máu/phòng thủ cho
  Thể Tu — sẽ làm sau.

## GĐ96 — Tẩm bổ nấu ăn (Thể Tu)

- Đánh quái có thân xác rơi Thịt Thú / Xương Thú ngay tại
  chỗ quái gục (đi qua là nhặt như mọi đồ rơi); quái đá,
  kiếm linh, huyễn ảnh, thủy linh, quỷ hồn, băng, hỏa
  linh không rơi thịt; xương chỉ rơi từ loài có xương
  (kể cả Cốt Binh — có xương, không có thịt).
- Thể Tu mở panel Nghề (nút 🔨) thấy mục riêng "🍲 Tẩm bổ
  nhục thân" — nấu được ngay mà KHÔNG cần học nghề Thú
  Sư (cơ chế lớp, không phải nghề): Thịt Hầm Tẩm Bổ
  (3 Thịt Thú + 10 Linh thạch) ăn vào HP tối đa vĩnh viễn
  +10; Canh Xương Tẩm Bổ (3 Xương Thú + 10 Linh thạch)
  ăn vào Vật phòng vĩnh viễn +2. Mỗi món còn hồi 30 thức
  ăn. Giới hạn vĩnh viễn +100 HP / +20 phòng — đạt giới
  hạn rồi ăn chỉ hồi thức ăn, không tăng thêm. Tăng
  vĩnh viễn nên nút reset chỉ số không hoàn lại phần này.
  Lớp khác không nấu/không ăn được 2 món này.
- Món Tẩm bổ trong túi đồ có nút Dùng như mọi đồ ăn.

## GĐ97 — Ảnh Tu: Sát Khí + Phản Xạ + Siêu Giác Quan

- Ảnh Tu có thêm thanh Sát Khí tím trên thẻ nhân vật
  (dưới thanh thức ăn/nước uống, chỉ Ảnh Tu mới thấy):
  đánh trúng quái +3, giết quái +25; bị đánh không tăng
  Sát Khí; Sát Khí không tự tụt, giữ nguyên qua thoát
  game rồi vào lại.
- Phản Xạ: Ảnh Tu tự né đòn quái theo lượng Sát Khí —
  càng nhiều Sát Khí càng khó bị đánh trúng, tối đa né
  75% lúc đầy 100. Nút né Space vẫn dùng được như cũ
  (lướt nhanh một đoạn để đổi vị trí).
- Siêu Giác Quan: khi Sát Khí đầy 100 thì tự bật 8 giây —
  trong 8 giây đó quái đánh không trúng phát nào, đòn
  nào của bạn cũng chí mạng (mạnh gấp đôi), quái quanh
  người chậm lại một nửa. Hết 8 giây thì Sát Khí về 0,
  phải tích lại từ đầu.
- Ảnh Tu nhìn thấy quái đang ẩn nấp (rắn độc, Địa Hành
  Yêu, quỷ tàng hình) từ xa hơn lớp khác một nửa.
- Chưa có: chế độc + bôi độc cho Ảnh Tu — sẽ làm sau.

## GĐ98 — Ảnh Tu: Chế độc + bôi độc lên vũ khí

- Độc Xà rơi Nọc Rắn tại chỗ gục (đi qua là nhặt như
  mọi đồ rơi). Lưu ý: rắn chỉ có ở Hắc Ám Đầm Lầy
  (map farm Trúc Cơ 7, đi từ Thanh Vân Thành) — map
  nhà không có rắn.
- Ảnh Tu mở panel Nghề (nút 🔨) thấy mục riêng "☠️
  Chế độc" — chế được ngay mà KHÔNG cần học nghề:
  Độc Rỉa Máu (3 Nọc Rắn + 10 Linh thạch), Độc Kích
  Thích (2 Nọc Rắn + 2 Cánh Dơi + 10 Linh thạch).
  Lớp khác không chế/không dùng được 2 lọ này.
- Bấm Dùng lọ trong túi là bôi lên vũ khí, được 10
  đòn (thoát game vào lại vẫn còn lớp bôi). Đòn trúng
  bôi Độc Rỉa Máu làm quái rỉa máu 5/giây trong 5 giây
  (đánh tiếp chỉ làm mới thời gian, không cộng dồn);
  bôi Độc Kích Thích làm mỗi đòn trúng +5 Sát Khí thêm
  (tổng +8/đòn) nên nhanh đầy Sát Khí để bật Siêu Giác
  Quan sớm hơn. Hết 10 đòn thì lớp độc hết, phải bôi
  lọ mới.

## GĐ99 — Kiếm Tu: Ngộ Kiếm + Kiếm Vực + Ultimate + Dưỡng Kiếm

- Kiếm Tu đánh quái tích Ngộ Kiếm (thanh mới trên thẻ
  nhân vật, dưới các thanh khác): đòn trúng +3, giết
  quái +25. Đủ 100 thì nút Ultimate hiện ra — bấm để
  bật Nhân Kiếm Hợp Nhất trong 10 phút (toàn bộ chỉ
  số +20%, sát thương kiếm +50%). Hết 10 phút hoặc
  thoát game vào lại thì hết hiệu lực, phải tích lại
  từ đầu.
- Khi máu xuống dưới 30%, Kiếm Vực tự bật: đánh mạnh
  gấp đôi, chiêu tốn máu thay vì tốn mana, đánh trúng
  hút lại 30% máu.
- Đánh quái rơi Quặng (từ Thạch Quái) và Tinh Huyết
  (từ Sói, Dơi...) — Kiếm Tu mở panel Nghề (nút 🔨)
  thấy mục riêng "⚔️ Dưỡng Kiếm", rèn được ngay mà
  KHÔNG cần học nghề, 5 loại kiếm (mỗi 3 Quặng + 3
  Tinh Huyết + 10 Linh thạch, tỉ lệ 90%): rèn xong
  mang kiếm ngay, rèn kiếm mới thay kiếm cũ. Thanh
  Phong đánh nhanh hơn, Huyết Sát hút máu, Kim Cương
  phản đòn, Băng Sương đóng băng quái 2 giây, Liệt
  Hỏa đốt quái rỉa máu. Lớp khác không rèn kiếm được.

## GĐ100 — Pháp Tu: Biến Dị Linh Căn + Phép Dung Hợp

- Pháp Tu khi đột phá lên Trúc Cơ có 5% thức tỉnh
  Biến Dị Linh Căn (1 trong 7 hệ: Lôi, Phong, Băng,
  Nham, Độc, Quang, Ám) — hệ phụ thêm vào linh căn
  cũ, hiện trên thẻ nhân vật dạng "✦ Biến dị: X".
  Ai đã lên Trúc Cơ từ trước thì vào game 1 lần là
  tự roll bù (chỉ roll 1 lần duy nhất, trúng mới báo).
- Biến dị cho nội tại theo hệ trên MỌI chiêu gây sát
  thương: Lôi có tỉ lệ choáng, Phong có tỉ lệ đánh
  thêm 1 lần nửa sát thương, Băng đóng băng quái,
  Nham làm quái yếu đi (chịu thêm 20% sát thương),
  Độc rỉa máu, Quang hồi mana, Ám hút máu.
- Tung 2 chiêu khác nhau liên tiếp trong 1,5 giây thì
  chiêu thứ hai thành Phép Dung Hợp: mạnh gấp rưỡi,
  tốn gấp đôi mana, kèm hiệu ứng của cả 2 hệ, có tên
  riêng (Hỏa rồi Băng = Bạo Phá Băng Hỏa). Không đủ
  mana gấp đôi thì chiêu vẫn tung thường, không hỏng.
  Tung cùng 1 chiêu hoặc để quá 1,5 giây thì không
  dung hợp. Số ô chiêu không đổi, lớp khác không
  dung hợp được.

## GĐ101 — Cốt Tu: Nuôi Cốt Vương

- Giết quái thường có 15% rơi Mảnh Xương, mở rương
  có 10% thêm Mảnh Xương. Mảnh Xương khác với
  Xương Thú nấu ăn của Thể Tu (không dùng chung).
- Cốt Tu vào panel Nghề thấy mục riêng "🦴 Luyện
  Khôi Lõi" (không cần học nghề, lớp khác không
  luyện được): 5 Mảnh Xương + 10 Linh thạch, tỉ lệ
  90% (TẠM), ra Khôi Lõi Xương.
- Dùng Khôi Lõi (chỉ Cốt Tu, chỉ khi chưa có pet)
  thì triệu hồi Cốt Vương đi theo sau chủ, đánh phụ
  quái quanh chủ (sát thương thấp). Quái đang đánh
  chủ mà Cốt Vương ở trong 220px quanh quái thì
  chuyển sang đánh Cốt Vương (taunt) thay vì chủ.
- Hạch Tâm: Cốt Vương tự hồi 5% máu tối đa mỗi
  giây. Máu về 0 thì Hạch Tâm vỡ, pet tan biến,
  phải luyện lõi mới + triệu hồi lại. Pet bền qua
  thoát game/restart (vào lại tự hiện nếu lõi còn
  nguyên), máu pet hiện trên thẻ dạng
  "🦴 Cốt Vương: hp/maxHp". Máu pet theo cảnh giới
  chủ (TẠM): Phàm 200, LK 350, TC 500, KD 650...

## GĐ102 — Quỷ Tu: Nuôi Quỷ Hồn

- Quỷ Tu đánh quái tích Hồn Khí (đòn trúng +3,
  giết quái thường +25, tối đa 100; pet giết quái
  cũng tính cho chủ). Đủ 100 Hồn Khí thì bấm nút
  "✦ Triệu Hồi Quỷ Hồn" (chỉ Quỷ Tu, chỉ khi chưa
  có pet) để triệu hồi, trừ 100 Hồn Khí. Không cần
  vật phẩm, không cần học nghề.
- Quỷ Hồn đi theo sau chủ, tự đánh quái quanh chủ
  (sát thương cao, TẠM: Vật công 30), quái đang
  đánh chủ mà Quỷ Hồn ở trong 220px quanh quái thì
  chuyển sang đánh Quỷ Hồn (taunt) thay vì chủ.
- Quỷ Hồn không tự hồi máu theo thời gian như Cốt
  Vương: chỉ hồi khi chính nó giết quái (hút hồn,
  hồi 10% máu tối đa mỗi lần giết, TẠM). Máu pet
  theo cảnh giới chủ (TẠM): Phàm 200, LK 350,
  TC 500, KD 650...
- Quỷ Hồn chết thì chủ bị phản phệ: mất hết Hồn
  Khí (về 0) và choáng 3 giây (TẠM). Muốn có pet
  lại phải tích lại đủ 100 Hồn Khí, không cần
  nguyên liệu mới. Pet bền qua thoát game/restart
  (vào lại tự hiện nếu còn sống), máu pet hiện trên
  thẻ dạng "👻 Quỷ Hồn: hp/maxHp", thanh Hồn Khí
  riêng chỉ Quỷ Tu thấy.

## GĐ103 — Phật Tu: Công Đức, Tầng Thức, Siêu Độ, Thuyết Pháp

- Phật Tu có tài nguyên riêng Công Đức
  (classRes.congDuc, không giới hạn max, tách
  biệt Công trạng tông p.merit). Nguồn duy nhất
  theo tài liệu: Siêu Độ + Thuyết Pháp (giết quái
  thường KHÔNG cho Công Đức). Chiêu cũ của Phật
  Tu được GIỮ (user chốt 27/10) — Phật Quang +
  Thuyết Pháp là 2 nút riêng kiểu nút Ultimate.
- 5 Tầng Thức theo mốc Công Đức: Cư Sĩ Quy Y
  10k, Sa Di 50k, La Hán 200k, Bồ Tát 1M, Kiếp
  Môn Thành Phật trên 1M (dưới 10k là Chưa nhập
  môn; GĐ104 đổi tên 2 bậc đầu theo nghiên cứu
  Phật giáo — người mới quy y là cư sĩ, chưa
  phải Tăng sĩ).
  Lên tầng mới báo notice. Dòng HUD riêng chỉ
  Phật Tu thấy: "☸ Công Đức: N · Tầng: X".
- Phật Quang Phổ Chiếu: nút riêng + socket
  phat_quang, chỉ Phật Tu; tốn 20 MP, hồi 5s,
  đánh quái gần nhất trong 300px, dmg TẠM =
  1,2 × (Pháp công + 10) qua giáp quái. Nội tại
  cộng dồn theo tầng: Cư Sĩ Quy Y dmg +20%; Sa
  Di tung trúng tự hồi 10% máu tối đa; La Hán
  đòn trúng choáng quái 1s; Bồ Tát đòn trúng hồi
  10% máu tối đa cho người chơi khác + đồng
  môn/pet của mình trong 300px; Kiếp Môn Thành
  Phật dmg ×2 thêm (tổng ×2,4 với Cư Sĩ Quy Y).
- Siêu Độ: Phật Quang đánh Hấp Huyết Quỷ đang
  dưới 10% máu → quái biến mất, KHÔNG rớt đồ,
  KHÔNG tính kill/nhiệm vụ, +500 Công Đức (TẠM).
  Quái vẫn hồi sinh theo nhịp thường (dùng chung
  hàm scheduleMonsterRespawn với kill thường).
  Game chỉ có 1 loài tên Quỷ là Hấp Huyết Quỷ
  (ở U Minh Quỷ Lâm, KD) nên Siêu Độ tạm chỉ
  áp dụng cho loài này. Quái Quỷ trên 10% máu
  hoặc quái thường dưới 10% thì Phật Quang đánh/
  giết thường.
- Thuyết Pháp: nút bật/tắt riêng + socket
  thuyet_phap, chỉ Phật Tu, chỉ ở map theme
  thành phố (30 thành phố); đang thuyết thì
  +10 Công Đức/giây (TẠM); di chuyển hoặc bị
  đánh thì ngắt + notice; chết/dịch chuyển/thoát
  game cũng dứt thuyết. HUD hiện "📿 Đang
  Thuyết Pháp" khi đang thuyết.
- Chưa probe live: chân "ngắt khi bị đánh" (thành
  phố không có quái nên không cắn được người đang
  thuyết — hook hitPlayer đã gắn, kiểm chứng bằng
  code) và nhịp hồi sinh sau Siêu Độ (dùng chung
  hàm với kill thường nên không probe riêng).

## GĐ104 — Y Tu: Y Đức, Bổ Khí Huyết, Cố Bản Bồi Nguyên, Hồi Dương Cứu Nghịch

- Y Tu có tài nguyên riêng Y Đức (classRes.yDuc,
  không giới hạn max). Tên gọi theo nghiên cứu
  Đông y 27/10 (y giả nhân tâm, treo hồ tế thế):
  Bổ Khí Huyết (hồi máu), Cố Bản Bồi Nguyên
  (bồi bổ tăng máu tối đa, có giới hạn), Hồi
  Dương Cứu Nghịch (chỉ cứu người tưởng chết,
  hồn chưa lìa — khớp cửa sổ gục ngã 40s, GĐ128).
- Bổ Khí Huyết: socket y_heal + nút riêng, chỉ Y
  Tu; tốn 20 MP, hồi 5s, hồi người chơi khác gần
  nhất trong 300px (không tự hồi, không hồi
  đồng môn/pet); lượng hồi TẠM = 100 × (1 +
  min(Y Đức, 10000)/10000) → 100 lúc Y Đức 0,
  200 lúc Y Đức 10000. Hồi thật ≥1 máu → +5 Y
  Đức. Đồng đội đầy máu thì báo lỗi, không tốn
  MP, không cộng điểm.
- Cố Bản Bồi Nguyên: socket y_gift_hp + nút riêng
  (chỉ hiện khi đã mở khóa); mở khóa vĩnh viễn
  khi Y Đức từng đạt 2000; tốn 50 Y Đức/lần,
  tặng người chơi khác gần nhất trong 300px +1
  Khí Huyết (+10 máu tối đa vĩnh viễn vào chỉ
  số gốc, reset không hoàn lại), cap +100/người
  theo classRes.yGiftHp của người nhận.
- Bán thuốc: Y Tu bán Hồi Xuân Đan hoặc Đan Hồi
  Nguyên ở tiệm → +2 Y Đức/viên. Đồ khác/lớp
  khác không cộng.
- Hồi Dương Cứu Nghịch + LUẬT CHẾT MỚI (áp
  dụng mọi người chơi): chết do đánh nhau (quái
  cắn, độc) không về làng ngay mà GỤC NGÃ 40s
  (GĐ128, trước 60s; hp 0, quái ngó lơ, hiện lớp
  phủ đếm ngược); Y Tu từng đạt 500 Y Đức (mở
  khóa vĩnh viễn) trong 300px dùng socket
  y_revive + nút riêng → người gục dậy tại chỗ,
  cùng map, 50% máu tối đa, người cứu +100 Y
  Đức. Hết 40s không ai cứu → về làng như cũ
  (quảng trường PLAZA 700,560 + ngẫu nhiên
  20–95px). Chết do hết thọ nguyên (tọa hóa) vẫn
  vĩnh viễn, không cứu được. Người gục không
  đánh/chiêu/thiền/dịch chuyển/tương tác được;
  thoát game lúc gục → đăng nhập lại đầy máu
  (không kẹt 0 máu).
- HUD riêng chỉ Y Tu thấy: "💚 Y Đức: N" + dấu
  mở khóa Cố Bản/Hồi Dương; nút Bổ Khí Huyết
  luôn hiện cho Y Tu, 2 nút còn lại chỉ hiện khi
  đã mở khóa. Lớp phủ gục ngã hiện cho chính
  người đang gục.
- GĐ104 cũng đổi tên 2 Tầng Thức Phật Tu theo
  nghiên cứu Phật giáo: Quy Y → Cư Sĩ Quy Y,
  Tăng Sĩ → Sa Di (3 bậc sau giữ nguyên).
- Chưa probe live: lớp phủ gục ngã HIỂN THỊ
  khi đang gục (HUD probe chỉ kiểm tra element
  tồn tại + ẩn khi đang sống; trạng thái gục
  trong tick đã probe đủ qua socket).

## GĐ105 — Nho Tu: Hạo Nhiên Chi Khí, Đọc Sách Mở Chương, Ý Cảnh (LỚP CUỐI — 9/9 XONG)

- Tài liệu mục 8 chỉ có 3 ý (Điểm Tri Thức +
  Chương; map riêng Văn Uyển Tàng Kinh Các, vào
  đọc sách tốn thời gian game để mở Chương;
  Chương tạo vùng AOE Ý Cảnh buff đồng đội /
  debuff quái) — mọi số còn lại TẠM. Nền nghiên
  cứu 27/10: Ý Cảnh là thuật ngữ thi học thật;
  "Chương" theo Chương Cú Tập Chú của Chu Hy;
  Điểm Tri Thức nâng thành Hạo Nhiên Chi Khí
  (Mạnh Tử). Tên vùng: Thanh Tuyền Thạch Thượng
  (Vương Duy) + Liễu Ti Vạn Lũ từ ghi chú nghiên
  cứu; 2 tên còn lại đặt theo thành ngữ, không
  mạo nhận là câu thơ cổ.
- Map mới Văn Uyển Tàng Kinh Các: 1 entry
  MapData (category city, theme script: bàn
  sách/đình/trụ, monsterSet rỗng → không quái,
  cổng LK1 như 30 thành phố khác — Phàm không
  tới được vì mọi đường dịch chuyển đều qua hub
  LK1); tự lên danh sách dịch chuyển từ Thanh
  Vân Thành (phí 50 Linh thạch như map LK),
  về làng/hub miễn phí theo luật cũ; không có
  entry NPCData nên không có dân thành phố.
  Điểm đọc sách = cổng map (1200,1650) + cổng
  đọc rộng 300px (decor ngẫu nhiên không chặn
  được); client nhận điểm qua map_enter.study
  (không dùng danh sách E cứng của làng).
- Hạo Nhiên Chi Khí `classRes.haoNhien` 0–100
  (thước tung Ý Cảnh) + `classRes.nhoStudySec`
  tổng giây đọc (thước mở Chương) + `classRes.
  nhoChuong` (mặc định [1]). Đọc sách: socket
  nho_study bật/tắt, chỉ nhotu, chỉ ở Văn Uyển
  trong 300px quanh cổng; đứng yên +5 Hạo
  Nhiên/giây; di chuyển/bị đánh/dịch chuyển/
  chết/thoát đều ngắt (cùng kiểu Thuyết Pháp).
  Ai cũng vào được Văn Uyển, chỉ Nho Tu đọc
  được. Mở Chương: Chương 1 có sẵn; Chương 2
  ở 300 giây, Chương 3 ở 900 giây, Chương 4 ở
  1800 giây (notice khi mở).
- 4 Ý Cảnh, socket nho_zone: tốn 20 MP + 25
  Hạo Nhiên, hồi 10s, vùng tồn tại 10s, bán
  kính 200px, 1 vùng/người (tung mới thay cũ),
  dùng được mọi map (không riêng Văn Uyển):
  1. Thanh Tuyền Thạch Thượng — đồng đội trong
  vùng +10 máu/giây (kể cả bản thân, chỉ người
  chơi thật, không pet/đồng môn, không hồi
  người gục); 2. Nghĩa Bạc Vân Thiên — đồng
  đội trong vùng dmg ×1,25 (nhân qua tham số
  mul của hurtMonster ở 3 điểm đòn người chơi:
  đánh thường/Phật Quang/chiêu; pet/phản đòn
  không hưởng); 3. Ngôn Xuất Pháp Tùy — quái
  trong vùng choáng 1s, mỗi quái miễn nhiễm
  choáng lại 5s (không khống chế trùm thử
  thách); 4. Liễu Ti Vạn Lũ — quái trong vùng
  chậm 100% khi còn trong vùng. Dịch chuyển/
  chết/thoát xóa vùng.
- HUD riêng chỉ Nho Tu thấy: "📖 Hạo Nhiên:
  N/100 · 📚 Đã đọc: Ss · Chương: a,b" + "📖
  Đang đọc sách" khi đang đọc; nút Đọc sách
  luôn hiện cho Nho Tu, 4 nút Ý Cảnh chỉ hiện
  khi đã mở Chương; vòng Ý Cảnh vẽ trên map
  (màu riêng từng Chương + nhãn tên vùng,
  depth 9999/10000 như marker đàn tế).
- Chưa probe live: ngắt đọc khi bị đánh (hook
  code-identical với ngắt Thuyết Pháp, Văn Uyển
  không có quái nên không cắn được người đang
  đọc); luật không khống chế trùm thử thách
  (code-only, không dựng trial để probe).

## GĐ106 — Sửa Bóng Ma: Entry Trong Bản Full Bị Xóa Trước Tick Kế Thì Không Bao Giờ Có Gone

- Triệu chứng: người đang online suốt lúc người
  khác reconnect thấy 2 entry trùng tên (1 bản
  offline ngủ + 1 người thật) tới khi relog;
  người mới vào sau thấy sạch.
- Nguyên nhân thật (không phải merger):
  cache delta theo map của server chỉ nạp từ
  vòng tick, còn bản FULL gửi riêng cho socket
  mới vào thì không. Entry có trong full mà bị
  xóa trước tick kế tiếp (cửa sổ 100ms) sẽ
  không bao giờ có Gone. Điển hình sau restart:
  A vào trước nhận full chứa actor offline của
  B, B reconnect ngay sau xóa actor đó.
- Cách sửa (chỉ server): tập id "từng gửi"
  theo map, nạp từ mọi lần emit full; vòng
  tick báo Gone cho id đã gửi mà nay không
  còn. Không nạp full vào cache so sánh trường
  (sẽ làm observer cũ lỡ thay đổi trường giữa
  2 tick). Áp chung cho người/quái/rớt/rương.
- Probe: ghost_probe.js mode D tái hiện xác
  định (restart riêng, hello sát nhau trong
  cùng nhịp tick); sau sửa D sạch 3/3, luồng
  GĐ104 R1 chạy lại 0 trùng tên + PASS. Actor
  offline vẫn hiện đúng 1 entry rest=sleep
  khi chủ chưa về.

## GĐ107 — Thêm 3 Linh Căn Biến Dị: Huyết, Thời Gian, Không Gian (Pool 7 → 10 Hệ)

- Pool roll: BIENDI_ELEMENTS thêm 3 hệ mới,
  vẫn roll 1 lần 5% khi lên Trúc Cơ, chia đều
  (mỗi hệ còn 0,5% tổng thay vì ~0,71% như
  trước — TẠM, tài liệu không cho tỉ trọng).
  Người đã roll giữ nguyên hệ cũ; người TC+
  chưa roll thì roll bù khi vào game (cùng
  hàm rollBienDi, không cần migrate). Hiển
  thị "✦ Biến dị: X" là chuỗi chung nên
  không sửa client; dung hợp không đổi (chỉ
  tính hệ chiêu, không tính hệ biến dị).
- Rider mới (toàn số TẠM, toàn cơ chế sẵn
  có, chỉ chạy trên cast gây dmg như 7 hệ
  cũ, không chạy trên đánh thường):
  Huyết — đòn phụ bằng 10% máu đã mất của
  chủ, qua giáp, hệ magic (không bị giáp đá
  giảm như đòn vật lý); đầy máu thì không có
  đòn phụ (guard missing > 0, vì
  damageThrough floor 1 sẽ gây 1 dmg ma khi
  raw = 0). Thời Gian — chậm quái 50%/3s
  (mạnh hơn Thủy 30%/2s, yếu hơn Băng đóng
  băng 100%/1,5s). Không Gian — 20% đòn phụ
  50% sát thương, XUYÊN GIÁP (def = 0, hệ
  magic) — khác Phong (50% qua giáp + giáp
  đá). Huyết khác Ám (Ám hút 15% sát thương
  gây ra, Huyết tính theo máu đã mất).
- Chưa có chiêu riêng từng hệ (như 7 hệ cũ:
  biến dị chỉ thể hiện qua rider).
- Probe p107 (port 3307, Hỏa Cầu Thuật
  coef 1.0 lên golem, control C = 19):
  Thời Gian slow đúng st=slow trong 3s, dmg
  không đổi; Không Gian proc 29 = 19 + 10
  xuyên giáp (1,53×C); Huyết đầy máu drop
  đúng 19 (guard sống), thiếu 102 máu đòn
  phụ đúng 9; roll bù login TC vẫn chạy
  (file bienDi khác undefined, khớp tick).
- Chưa probe live: phân phối roll 10 hệ
  (cần hàng trăm lần đột phá mới đo được —
  pool kiểm chứng bằng code, đường roll
  kiểm chứng bằng smoke test login); hiển
  thị tên 3 hệ mới trên trình duyệt (đường
  chuỗi chung như 7 hệ cũ, code-verified).

## GĐ108 — Kiểm chứng đi map + Asset làng sang mọi map (27/10, XONG)

- Probe đi map p108 (port 3308): T1 cổng
  nhà→hub→Thanh Mộc Lâm→hub→nhà PASS —
  tới đúng điểm đến từng chặng (lệch 0px),
  phí 500→450 (nhà→hub) →50 (hub→rừng),
  về miễn phí, Thanh Mộc Lâm có 25 quái
  trong tick. T2 thuyền PASS — cổng bị chặn
  ở đảo đúng thông báo thuyền, thuyền
  hub↔đảo 20s/chặng, cập bến đúng điểm,
  không tốn đá. Cổng hộ tống không chạy
  lại trong đợt này (đã có từ GĐ60).
- Asset (theo yêu cầu user): nhân vật đã
  dùng sprite sẵn khắp map (người chơi
  cls-*, NPC làng villager-*, bot villager)
  — chỉ decor map GDD là vẽ code, và dân
  thành phố (GĐ89) cũng vẽ code. Đã sửa:
  decorTexture: kind 'tree' → sprite
  tree-village-01 (cao 62px, đáy ở y≈79
  trong hộp 96, khớp chân đế hình cũ),
  kind 'house' → house-village-01 (rộng
  76px); chỉ đúng 2 kind này đổi sprite,
  các kind chủ đề (dead_tree, blood_tree,
  tree_big, bamboo, hut, pavilion...) giữ
  vẽ code để không mất bản sắc theme;
  thiếu texture thì lùi về vẽ code.
  Dân thành phố: role rõ thì đúng bộ
  (Sứ Giả→envoy, Tiệm Đan→shopdan, Tiệm
  Nguyên Liệu→shopnl, thương nhân→
  merchant, trưởng/lão→elder), còn lại
  xoay villager-a/b/c theo số cuối id;
  thiếu texture lùi về vẽ code.
- Kiểm chứng ảnh: preview108-hub.png
  (Thanh Vân Thành: nhà sprite mái ngói +
  cây sprite + dân sprite đầy màn hình)
  và preview108-forest.png (Thanh Mộc Lâm:
  cây sprite xen cây chủ đề vẽ code, quái
  Huyễn Điệp sống, nấm giữ vẽ code).
- Client build lại OK (vite 16,9s).

## GĐ109 — Dọn visual thành phố + rừng (27/10, XONG, CHƯA PUSH)

- User chê ảnh GĐ108: rừng 2-3 loại cây
  đan xen, thành phố nhà lung tung + dân
  rối. Nguyên nhân đo được: rừng sâu có
  tree_big (vector tối) + tree (sprite
  sáng, từ GĐ108) + blossom (đào hồng) +
  bamboo cùng lúc; thành phố 200 dân dồn
  trong ô 1100×700 quanh cổng (lưới chức
  năng 95px) và đặt dân chỉ tránh vật cản
  nên dân đứng lên cả tán cây; nhà rải
  ngẫu nhiên (54 cái).
- Sửa: sprite cây chỉ ở theme văn minh
  (city, garden, beast, array, script,
  stream; willow ở stream cũng sprite) —
  map hoang/rừng giữ cây vẽ code cùng ngôn
  ngữ với cây chủ đề; bỏ blossom khỏi
  rừng sâu (tree_big 0,35→0,40). Nhà thành
  phố xếp 4 dãy phía bắc khu dân (cách
  160px, lệch nhẹ); dân chức năng giãn
  lưới 95→150px, dân thường rải khắp map,
  đặt dân tránh decor (cây/nhà/trụ/đá/
  đèn theo pad riêng) — sửa cả lỗi slot
  nhà đóng băng (slot tính theo số nhà đã
  đặt nên 1 slot tắc là cả dãy dừng).
- Probe p109 PASS: nhà 48 cái đúng 4 dãy
  (220×11, 393×12, 569×13, 758×12), cách
  cổng 883px; dân đủ 200, NN nội bộ lưới
  chức năng 128px, dân thường bbox
  2190×1587 (trước 1100×620), 0 dân đứng
  lên decor; rừng không còn blossom.
- Ảnh preview109-hub (nhà thành hàng,
  dân thưa, nhãn còn vài cái) +
  preview109-forest (một màu cây vector
  tối, chỉ còn tre/nấm làm nền) đã xem.
- Zip GĐ108 thành cũ (GĐ109 đổi cả server
  + client) — CHƯA đóng zip mới, đợi user
  duyệt ảnh rồi gộp GĐ90–109.

## GĐ110 — Rừng sprite + Thành phố to gấp 4 diện tích (27/10, XONG, CHƯA PUSH)

- Theo 2 ý user trên ảnh GĐ109: rừng đổi
  hết sang cây sprite; thành phố phóng to
  cho thưa bớt đỡ lag.
- Rừng sâu: theme deep_forest vào nhóm
  sprite (tree 62px, tree_big 76px cho vừa
  hộp 96 mà vẫn to hơn); tre/nấm/cỏ giữ
  làm nền. Các theme hoang khác (cây chết,
  cây máu, pine băng...) giữ vector vì
  sprite xanh không hợp.
- Thành phố: MAP_SIZE_BY_CAT city
  2400×1800 → 4800×3600 (mỗi chiều ×2,
  diện tích ×4, áp cho cả 31 thành phố vì
  kích thước theo loại map). Cổng/khu dân/
  dãy nhà/đàn/điểm đều tính theo cổng +
  kích thước nên tự giãn theo; dãy nhà đổi
  sang cột giãn theo chiều rộng (không thì
  nhà dồn nửa tây map). Decor trần 420 nên
  mật độ decor 83→24/Mpx², dân 200 giảm
  4× — mỗi khung hình vẽ ít vật hơn nên đỡ
  lag.
- Probe p110 PASS: map 4800×3600, cổng
  (2400,3450), nhà 58 cái 4 dãy tới
  x=4112, NN lưới chức năng 140px, dân
  rải 4580×3371, 0 dân lên decor.
- Ảnh preview110-hub (cổng thưa, ~15
  người/khung hình) + preview110-forest
  (toàn cây sprite) đã xem. CHƯA push —
  đợi duyệt rồi đóng zip mới gộp GĐ90–110.

## GĐ111 — SPRITE TOÀN BỘ NGOẠI CẢNH (27/10, XONG, CHƯA PUSH)

- Theo yêu cầu user: sprite hết ngoại
  cảnh bằng PixelLab (chỗ làm cây/nhà
  làng). 44 loại decor, trừ cây/nhà đã
  có → cần 41 loại mới.
- PixelLab giới hạn ảnh 400×400, bật
  nền trong suốt vẫn trả nền phẳng
  (232,251,249) — tách bằng flood-fill
  từ viền + gộp cụm gap<=8px (tre tách
  3 thân). Model KHÔNG giữ lưới (xin
  4×4 được ~26 món xếp tự do) và hay
  bỏ món xin (tùng/liễu/cọ/xương rồng
  ở sheet A) + bịa thêm cây tròn/kiếm
  rời — nên phải map bằng mắt sau mỗi
  sheet và làm sheet vét.
- 5 sheet, 5 lượt Trial: A cây cỏ (11
  loại) + B cây đá (8) + C công trình
  nước (9) + D vét (9) + E vét 4 món
  (cọ, xương rồng, thảo dược, sóng) =
  41/41 loại. File nối game ở
  client/public/sprites/decor/ (41 file).
- Nối game: khung vừa theo nhóm, KHÔNG
  phóng to, neo đáy y≈79 như cây/nhà
  (to [90,76], vừa [70,56], nhỏ
  [46,40]); load lỗi rơi về vẽ code.
  Lưu ý: sprite hang dính cả ao trước
  hang (model gộp) — chấp nhận, hang
  nào cũng có ao.
- SỬA sau duyệt (user chê trên ảnh
  rừng): nấm hộp [46,40]→[36,30] vì
  nấm tròn đọc to hơn hộp, lăn hệ số
  1.25 thì to ngang cây; tre vẽ lại
  dáng cao (ảnh 98×301, hộp [40,76])
  thay bụi bè cũ. Ảnh rừng chụp lại
  đã kiểm chứng cả 2.

## GĐ112 — CÂY CỐI SANG KIỂU CHI TIẾT (27/10, XONG, CHƯA PUSH)

- Theo duyệt của user trên cây mẫu:
  vỏ vân nứt, tán nhiều cụm lá có
  sáng tối. Đổi hết các loại cây:
  cây chung/tree_big (ghép cây mẫu
  vào đúng vùng (13,8,102,114) của
  file cây làng cũ nên cây làng +
  cây map đổi theo mà không sửa
  code; file phẳng cũ giữ ở
  asset-src/pixellab/
  tree_village_01_flat.png), tùng,
  liễu (tách tay từ cụm dính tùng+
  liễu bằng cột trống), cọ, cây chết,
  cây đầm lầy, đào, cây máu (riêng
  1 lượt). Cây máu bản phẳng cũ
  (tán đỏ sẫm) được thay bằng cây
  máu chi tiết; cây táo đỏ trong
  sheet cây chi tiết không hợp nên
  bỏ xó.
- Sửa nhánh liễu: trước đây liễu vẽ
  bằng cây làng vì chưa có sprite
  liễu — giờ liễu dùng sprite riêng
  (nhánh cây chung chỉ còn kind
  'tree').
- Tốn thêm 3 lượt Trial (sheet 7
  cây + sheet cọ/cây chết + cây
  máu); tổng decor từ đầu tới giờ
  10 lượt — ước tính đã hết lượt
  Trial, lần tạo tiếp mà lỗi thì
  cần nạp thêm.
- Ảnh preview111-forest (cây chi
  tiết, tre cao, nấm nhỏ) +
  preview111-ice (tùng tuyết chi
  tiết) + preview112-blood (cây
  máu chi tiết, đào chi tiết) đã
  xem. CHƯA push — đợi duyệt rồi
  đóng zip mới gộp GĐ90–112.

## GĐ113 — NÚI KHÔNG CHỒNG NHAU (27/10, XONG, CHƯA PUSH)

- User chê ảnh Băng Phong Cốc: núi
  chồng lên nhau, ngoài đời không
  có thế. Nguyên nhân: luật đặt
  decor chỉ bắt vật cản cách nhau
  52px, trong khi sprite núi tuyết
  rộng 90px, nhân hệ số to thành
  112px — chồng là tất yếu.
- Sửa (server-only): cặp nào dính
  tới núi (mountain/mountain_snow)
  bắt cách nhau 130px (đủ cho 2
  ngọn to nhất đứng cạnh nhau);
  cây/cỏ không chặn (cr=0) nên
  vẫn mọc sát chân núi như ngoài
  đời. Bố cục decor mọi map xáo
  lại 1 lần theo seed (ổn định sau
  đó).
- Probe p113 PASS: map băng vẫn
  91 ngọn núi, khoảng cách nhỏ
  nhất núi-núi 133px, núi-vật cản
  130px. Ảnh băng chụp lại đã xem:
  mỗi ngọn đứng riêng. CHƯA push
  — đợi duyệt rồi đóng zip mới
  gộp GĐ90–113.
- Ảnh preview111-hub (đèn, cờ sprite) +
  preview111-forest (nấm, tre sprite) +
  preview111-ice (tinh thể băng, tùng
  tuyết, núi tuyết, đá tròn sprite) đã
  xem. CHƯA push — đợi duyệt rồi đóng
  zip mới gộp GĐ90–111.

## GĐ114 — NÚI CỠ LỚN (27/10, XONG)
- User chê núi nhỏ hơn cây, nhìn
  không cân bằng. Sửa (server-only):
  núi/núi tuyết hệ số 2.0–2.4 (cao
  ~150px, rộng ~200px); va chạm
  r = 45×s cho khớp chân núi; cặp
  núi cách nhau 230px, núi vs vật
  cản khác 180px; luật núi kiểm tra
  TRƯỚC luật nhà.
- Probe p114 PASS (map băng: 49 ngọn,
  s 2.01–2.39, min 231/180px). Ảnh
  preview114-ice đã xem: núi to gấp
  đôi cây.

## GĐ115 — HẾT CHỒNG SPRITE + DÃY NÚI
(27/10, XONG)
- User gửi 2 ảnh núi tuyết thật, chê
  sprite chồng nhau. Nguyên nhân:
  luật né vật cản chỉ chạy khi vật
  mới có va chạm (cr > 0) — cây/cỏ
  cr = 0 đặt bất chấp, kể cả lên
  sườn núi; núi đặt sau cũng không
  kiểm tra cây đã đặt.
- Sửa (server-only): mọi decor đều
  không được nằm lên hình núi, cả
  2 chiều; núi né cổng 260px + né
  đàn 160px. Dãy núi: 3 dãy/map có
  núi, mỗi dãy 4 ngọn thẳng hàng
  cách nhau 225px; dãy đặt TRƯỚC
  rải decor (đặt sau thì gãy hết).
- Probe p115 PASS (51 ngọn, 14 ngọn
  thành dãy, min núi-núi 224px).
  Ảnh cổng + ảnh dãy đã xem.

## GĐ116 — DÃY NÚI TUYẾT 1 SPRITE LIỀN
(27/10, XONG)
- User bảo làm lại dãy núi bằng
  sprite. PixelLab HẾT Trial thật
  (API 402: 40/40) nên ghép từ
  sprite núi tuyết sẵn có: 5 đỉnh
  chồng ~40%, tô phẳng phần đá
  thành 1 khối gradient (giữ chóp
  tuyết) — script compose_ridge.py,
  file client/public/sprites/
  ridge_snow.png (753×231).
- Nối game dạng feature (như núi
  lửa): 1 dãy/map băng, thay dãy
  nón GĐ115 ở map băng; va chạm 3
  vòng r150; decor né 240px, núi né
  350px, hang băng né 500px.
- Probe p116 PASS (dãy ở (2135,1631),
  decor gần nhất 252px). Ảnh
  preview116-ice đã xem: khối núi
  liền + 5 chóp tuyết.
- Sửa hiểu sai cũ: decorTexture nướng
  canvas 192×192 (2× supersample
  của hộp 96) — kích thước hiển thị
  = logical×2×s (núi tuyết 90 → 180×s
  rộng). Dùng kích thước hiển thị
  cho mọi tính toán va chạm/khoảng
  cách sau này.

## GĐ117 — HẾT CHỤM DECOR + MAP BĂNG THƯA
(27/10, XONG)
- User chê núi/cây/băng chụm thành
  đống. Nguyên nhân: vật cản chỉ
  cách nhau 52px, cây/cỏ đặt sát bất
  cứ thứ gì.
- Sửa (server-only): khoảng cách tối
  thiểu giữa MỌI cặp decor — 150px
  nếu dính vật cản, 120px nếu không
  (luật núi/dãy lớn hơn vẫn chiếm ưu
  thế; cây-trong-rừng giữ dày, miễn
  cây-cây ở theme rừng). Map băng
  thưa hơn: cap 420→280, tỉ lệ thông
  0.30→0.15.
- Probe p117 PASS (decor 372→202 món,
  thông ~111→37 cây, min đúng 120px,
  dãy núi nguyên vị trí). Ảnh
  preview117-ice đã xem: mỗi thứ
  đứng riêng trên nền tuyết trống.
- User bảo vẫn chưa ok nhưng "thôi
  kệ, chưa cần đồ họa gấp" — GÁC
  thread núi/decor lại, đừng đẩy thêm.

## GĐ118 — NỐI 21 SPRITE QUÁI VÀO GAME
(27/10, XONG)
- 21 file vào client/public/sprites/
  monsters/<loài>.png; bảng MON_SPRITE
  kind→file trong main.ts; preload
  mon-<kind>; spawnMonsterActor dùng
  sprite khi textures.exists (nạp lỗi
  lùi về họ hình vẽ code).
- Sprite scale giữ đúng chiều cao hiển
  thị cũ (sói 220×0.55, dơi/thạch
  120, người 130, khôi lỗi ×1.15, ×
  tỉ lệ vis GĐ59) nên cỡ quái không
  đổi; bỏ hết nhuộm màu (sprite đã
  có màu thật); vòng update chặn đổi
  khung + nhuộm lại cho actor dùng
  sprite (cờ monSprite); thanh máu
  treo theo chiều cao sprite thật.
- Giữ nguyên: trùm thử thách vẫn hình
  thạch quái; 6 biến thể không nối
  (game không có spawn biến thể).
- Đổi duy nhất: Kiếm Ma từ hình người
  (rival, GĐ57) → sprite kiếm khách
  quỷ giáp đen (theo lệnh "21 sprite").
- Ảnh preview118-farm (Thạch Quái đá
  rêu + Sói Xám sprite) + preview118-
  forest (2 Lâm Trư xanh nanh vàng)
  đã xem. Zip này gộp GĐ90–118.

## GĐ119 — HỆ THỐNG TRANG BỊ (server + giao diện)
- 9 phẩm (Phàm→Vô Cực, hệ số 1.0→15.0, 0→5 dòng nội tại),
  9 hướng tu, 9 ô, 30 vũ khí, tên = Tiền tố + Hệ + Ô.
- Nội tại: 13/hướng (7 tốt +4%/cấp, 6 phế −2%/cấp), roll
  có trùng, cấp nội tại = cấp phẩm. Lệnh bài 9 hạng,
  Trấn Áp chênh ×5% trần 30% (mới lưu chỉ số, chưa móc
  combat vì game chưa có PvP/tranh boss).
- Luật mặc: hệ Vô ai cũng mặc được, Pháp Tu mặc cả 16
  hệ, còn lại cần linh căn tương ứng, lỗi đúng chữ
  "Không thể trang bị". Vũ khí gear chỉ cộng chỉ số,
  không đổi vũ khí chiến đấu cũ. Crit mới lưu chỉ số.
- Chỉ số hiệu dụng: công cộng cả vật + pháp công, thủ
  cộng cả vật + pháp phòng, máu/nguyên cộng phẳng vào
  max, tốc độ cộng tốc độ chạy + giảm hồi chiêu.
- 3 nguồn cùng tồn tại: (1) Đặt rèn ở Tiệm Rèn — tự
  làm thiết kế + đủ nguyên liệu, chờ theo phẩm (Tiên 3
  ngày … Vô 90 ngày game), tối đa 3 đơn; (2) Kho bán
  sẵn 8 món/ngày, gieo hạt theo ngày game (mọi người
  cùng kho, mỗi người 1 lần/món/ngày); (3) Rơi đồ —
  rương C 10%/B 20%/A 35%/boss 60%, nhiệm vụ bảng 10%/
  thành phố 20%, đồ theo hướng + hệ người chơi.
- Giao diện: tab Trang bị trong Túi đồ (kho + 9 ô đang
  mặc + Mặc/Tháo/Rèn lại + tổng chỉ số); panel Tiệm
  Rèn (kho + form đặt rèn + đơn chờ + Nhận) mở bằng
  E cạnh NPC Thợ Rèn ở quảng trường làng (620,560).
  Mua/đặt/nhận/rèn lại cần đứng trong 80px quanh ông.
- Phí rèn lại: Tiên 100, Thần 300, Huyết 800, Ma 2000,
  Vô 5000. Đồ 0 dòng không rèn lại được.
- Test: probe p119s5 (cổng vị trí + đơn + mua + rèn
  lại + HUD) PASS; ảnh preview119s5-forge/gear.

## GĐ120 — SPRITE TRANG BỊ
- Vũ khí dùng lại 28 sprite GĐ16 (sprites/weapons);
  chỉ thiếu Độc Thơ nên vẽ mới (sách xanh lục +
  emblem vàng, sprites/weapons/doctho.png). Tay Không
  vốn không có hình.
- 8 ô giáp vẽ mới bằng code, pixel 16x16 → 64x64
  (sprites/gear/ARMOR, PANTS, HAT, CLOAK, SHOES,
  BROOCH, RING, TOKEN): áo, quần, nón lá, choàng đỏ,
  giày, bội, nhẫn, lệnh bài. PixelLab đã hết lượt
  (40/40) nên không vẽ AI được đợt này.
- Icon hiện trong tab Trang bị, kho Tiệm Rèn và đơn
  chờ, viền theo màu phẩm. Áo quần mặc lên người
  (đổi sprite nhân vật) CHƯA làm — cần vẽ lại sprite
  nhân vật theo lớp đồ, để riêng khi có yêu cầu.
- Test: probe p120_icons PASS; ảnh preview120-gear
  (áo Tiên đang mặc + Độc Thơ trong kho).

## GĐ127 — NHIỆM VỤ MỞ RỘNG (950 NHIỆM VỤ)
- Thêm 950 nhiệm vụ từ file server/data/quests_gd127.json,
  gộp vào bảng nhiệm vụ cũ: 8 loại thường x 100 (diệt,
  thu thập, trò chuyện, khám phá, chế tạo, giao hàng,
  săn trùm, hộ tống) + ẩn/liên/thăng cấp x 50.
- Ẩn mở bằng manh mối: nói chuyện NPC manh mối (Người
  Áo Đen, Người Giữ Bí Mật...) hoặc đứng vào điểm manh
  mối, nhiệm vụ mới hiện trong hội thoại của người giao.
  Thăng cấp là thang bậc khó dần, KHÔNG khóa cảnh giới
  khi nhận/trả, tầng sau mở ngay sau khi trả tầng trước.
- Nhận/trả: trò chuyện/giao hàng/hộ tống xong ở đích
  rồi về gặp người giao để trả; săn trùm chỉ tính quái
  có cờ trùm (trùm map/trùm cảnh giới, không tính quái
  thử thách). Thưởng TẠM theo cảnh giới người giao:
  Phàm 80 đá/15 tu vi, LK 140/25, TC 320/60, KD 650/120;
  boss/hộ tống/ẩn x1.5, liên tầng 2 x1.3, thăng cấp
  x(1+0,3x(tầng-1)).
- Nhiệm vụ mới KHÔNG hiện trên bảng treo thưởng làng
  (chỉ nhận qua hội thoại NPC); bảng làng vẫn chỉ có
  nhiệm vụ cũ.
- Test: probe p127_quests PASS đủ chân: diệt/thu thập/
  trò chuyện/khám phá/giao hàng/ẩn/liên/thăng cấp/săn
  trùm Cốt Binh/hộ tống Băng Phong Cốc + bảng làng
  không lọt nhiệm vụ mới.

## GĐ128 — CỔNG DỊCH CHUYỂN HIỆN HÌNH + NERF QUỶ HỒN + LINH THỂ
- Cổng dịch chuyển: trước đây map GDD không vẽ gì ở
  cổng (chỉ 1 chấm nhỏ trên minimap + gợi ý E trong
  70px) nên không tìm được. Giờ map nào cũng có quầng
  sáng xanh + nhãn "Trận Dịch Chuyển" ngay tại cổng
  (w/2, h-150), như dấu đàn tế/điểm linh mạch.
- Quỷ Hồn (Quỷ Tu) nerf: trước đánh bằng vatCong cố
  định 30, khỏe gấp 2–3 lần chủ đầu game. Giờ dmg =
  1/2 chỉ số công hiệu dụng của chủ (số TẠM, Cốt
  Vương không đổi vì vốn đã yếu).
- Chết: cửa sổ gục ngã 60s → 40s. Lúc gục hóa LINH
  THỂ: nhân vật mờ + nhãn 👻, đi lại được khắp map
  (xuyên vật cản, quái vẫn ngó lơ), nhưng không
  đánh/né/chiêu/thiền/dịch chuyển/mua bán/chế
  tạo/nói chuyện NPC được (server chặn hp <= 0).
  Còn 5s nữa tự hồi sinh thì hiện thông báo.
  Được Y Tu cứu thì dậy tại chỗ linh thể đang đứng.
- Sửa lỗi chết khi đánh boss: trước đây client vẫn
  phát animation vung vũ khí tại chỗ dù server đã
  chặn đòn (hp <= 0), mà giữ phím J thì auto-repeat
  nên xác cứ lặp 1 động tác ở chỗ boss tới khi hết
  giờ. Giờ client chặn đánh/né/chiêu/tương tác ngay
  khi đang gục.
- Test: probe p128 PASS (dmg pet 26 lên sói, gục
  đúng 40s, linh thể đi được 792px/3s + không nói
  chuyện được với Trưởng Làng trong khi người sống
  nói được, dấu cổng ở thành phố, overlay Linh thể
  39s; ảnh p128_portal/p128_linh).

## GĐ129 — LẤP CỔ THỤ YÊU GIỚI (MAP TRỐNG DUY NHẤT)
- Trước đây Cổ Thụ Yêu Giới (Kim Đan 1, hệ Mộc,
  rừng sâu 4000×3000) đi tới được nhưng trống hoàn
  toàn: 0 quái, 0 NPC, 0 nhiệm vụ, 0 đàn tế.
- Quái (chỉ sửa data MonsterData, không sửa code):
  Lâm Trư ×12, Huyễn Điệp ×12, Huyết Lang ×6, cộng
  1 trùm Huyết Lang + đàn tế tự sinh theo luật map
  KD có quái thì có trùm. Tổng quái toàn game
  367 → 398.
- NPC mới: Ông Lão Giữ Rừng (Người Giao Nhiệm Vụ)
  đứng gần cổng Cổ Thụ, giao 6 nhiệm vụ riêng
  (file quests_gd129.json, không đụng 950 quest cũ):
  diệt Lâm Trư ×12, Huyễn Điệp ×8, Huyết Lang ×6,
  săn trùm Huyết Lang ×1 (thưởng ×1.5), thu Đá Quý
  ×3, khám phá Tâm Cổ Thụ. Thưởng theo chuẩn giver
  KD (650 đá/120 tu vi, trùm 975/180).
- Sửa lỗi tiềm ẩn từ GĐ89: vòng build NPC trước đây
  chỉ nhận map 'city' nên NPC 15 map nghề không bao
  giờ spawn — 205 quest GĐ127 từ giver map nghề
  không nhận/trả được. Giờ map nào có entry NPCData
  đều spawn (46 map, 9001 NPC), 205 quest đó sống lại.
- Quest diệt/trùm có thêm trường targetMap (tùy chọn,
  quest cũ không có nên không ảnh hưởng): chỉ tính
  quái đúng map ghi trong nhiệm vụ.
- Test: probe p129 PASS (spawn đúng 12/12/6 + 1 trùm,
  dialog đủ 6 quest, giết Lâm Trư ở Thanh Mộc Lâm
  không tính progress, trả đủ 6 quest đúng đá,
  travel hub → Cổ Thụ tới đúng (2000,2794), Dược Cốc
  200 NPC + nhận được quest GĐ127 q127_kill_018).

## GĐ130 — CỬU U BÍ CẢNH (BÍ CẢNH LỚN)

- Tài liệu chỉ ghi "bí cảnh để sau theo Phần B", không định sẵn — thiết kế do
  mình đề xuất, Bảo chốt 28/10 11:52. Thạch Lâm chỉ là khu nhỏ trong làng,
  Thâm Hải có trùm nhưng không có tiến trình — bí cảnh lớn phải có cả 3:
  map riêng + trùm riêng + chuỗi tiến trình riêng.
- Map mới `cuu_u_bi_canh` "Cửu U Bí Cảnh": category elemental, 4000×3000,
  theme mộ địa (sprite sẵn, không cần PixelLab), cổng Kim Đan 1, đi bằng
  dịch chuyển từ thành trung tâm (400 đá chuẩn KD), không phải khu an toàn.
  Cổng (2000,2850), tới (2000,2794), đàn tế (2000,2690).
- Quái thường 30 con: Cốt Binh ×6, Đan Ma ×6, Huyễn Ảnh Miêu ×12,
  Hấp Huyết Quỷ ×6 (tàng hình phục kích tới 130px).
- Trùm: Cửu U Ma Quân ×3 (loài mới, hp 3500, atk 85, hút máu 30%, tuVi
  400 — TẠM), dùng lại sprite kiếm khách quỷ (`MON_SPRITE:
  cuu_u_ma_quan: 'kiem_ma'`, hiển thị ~121px) vì PixelLab hết lượt.
  Trùm NỐI TAY vào MAP_BOSSES (không qua MAP_SPAWNS): loài boss có maps
  rỗng nên vòng auto không nhận; nếu để spawn thường thì quái không có cờ
  mapBoss nên quest trùm không bao giờ nhích (bài học từ Hỗn Độn Thú ở
  Vô Tận Hư Không — boss-class spawn thường cũng không có cờ). Vòng auto
  được loại trừ riêng Cửu U để không sinh thêm auto-boss. Nối trước
  ALTAR_BOSSES nên đàn tế tự sinh theo (200 đá/lần/ngày, bơm đủ số thiếu).
- Người giữ cổng: Ông Lão Giữ Cổng (tên TẠM, `cuu_u_bi_canh_npc_007`) tại
  cổng, giao 8 quest (`quests_gd130.json` + mirror client): chuỗi 6 liên
  hoàn (cổng → Cốt Binh ×10 → Đan Ma ×8 → Huyễn Ảnh Miêu ×8 → 1 Ma Quân
  → cả 3 Ma Quân, mở bằng requiresFlag/setsFlag cuu_u_t1..t5) + thu thập
  Đá Quý ×5 + khám phá Tâm Cửu U (2000,1500). Thưởng chuẩn KD 650/120,
  quest trùm ×1,5 = 975/180.
- Boot sau GĐ130: 74 map, 47 map có dân / 9002 NPC, 35 cặp spawn,
  21 map có trùm, 431 quái.
- Test: probe p130 (port 3339, xem `~/workspace/probes/p130_quests.js`).
  **Probe p130 ALL PASS (chạy 8, 28/10)**: dialog chỉ hiện chain_1/item/
  explore trước khi mở chuỗi; trả chain_1 +650 đúng; giết Cốt Binh ở
  Tử Vong Mộ Địa không nhích progress (targetMap lọc đúng); spawn đúng
  6/6/12/6 + 3 trùm; chuỗi trả đúng từng bước (chain_2/3/4 mỗi cái +650,
  chain_5/6 mỗi cái +975); đàn tế bơm lại đủ 3 trùm sau khi giết 1;
  khám phá Tâm +650; item Đá Quý ×5 trả được; travel hub → Cửu U tới
  đúng (2000,2794) tuyệt đối; heap probe phẳng ~12MB suốt (không OOM).
  Bài học probe: (1) chuỗi phải giết → trả → nhận → giết (giết quest
  chưa nhận thì progress không nhích, vòng giết chạy vô hạn); (2) map
  nhiều loài chỉ có 1 loài là mục tiêu thì phải giết ghim (pinned) chứ
  không đánh con gần nhất như GĐ129; (3) không ghim ảo ảnh (-ao-) vì
  chúng không tính nhiệm vụ; (4) mục tiêu đã trong tầm mà bị con khác
  chen ngang thì chỉ chờ, không lái lại — lái lại trả về tức thì gây
  vòng kẹt không chờ, spam log tới OOM 4GB (chạy 7).
## GĐ131 — NỀN NGHỀ PHỤ: 14 CẤP + SƯ PHỤ + BÁI SƯ + QUEST NGHỀ

- Bảo chốt roadmap mở rộng nghề phụ 28/10, GĐ131 làm nền trước
  (GĐ132 đào khoáng/hái thuốc, GĐ133 đan dược, GĐ134–137 mở rộng
  từng nghề làm sau). Nghề phụ vẫn KHÔNG bắt buộc — ai tinh ý phát
  hiện thì được lợi nhiều, đúng triết lý game.
- Thang 14 cấp (thay 3 cấp cũ Nhập môn/Thợ nghề/Sư phụ): Nhất Phẩm
  → Thập Nhị Phẩm (12 phẩm) + 2 cấp đặc biệt Đế Sư, Thánh Sư.
  Danh hiệu đầy đủ: "Tam Phẩm Đan Sư", "Đế Vương Đan Sư",
  "Thánh Vương Đan Sư". Ngưỡng theo lượt chế thành công (số TẠM):
  0/10/30/60/100/160/240/340/460/600/800/1000/1400/2000.
  Trần theo cảnh giới (TẠM): Phàm→Tứ Phẩm, LK→Thất Phẩm,
  TC→Thập Phẩm, KD→Thập Nhị Phẩm, NA→Đế Sư, HT→Thánh Sư.
  Người chơi cũ chuyển tự động theo lượt chế đã có (không migrate
  file): cấp cũ 2 (50 lượt) → Tam Phẩm, cấp cũ 3 (200 lượt) → Lục
  Phẩm (trừ khi chạm trần cảnh giới).
- Công thức cũ cấp 2 remap → Tam Phẩm (5 công thức: Hồi Nguyên,
  Trúc Cơ, Kết Đan, Hộ Mạch, Phù Tụ Linh) cho khớp thang mới.
- 5 sư phụ dạy nghề ở làng, hàng phía nam Đạo Quán (y=390, ô trống
  đã kiểm tra va chạm, cách nhau 120px): Đan Lão (520), Khí Lão
  (640), Trận Lão (760), Phù Lão (880), Thú Lão (1000). Sprite tạm
  dùng lại bộ dân làng (elder/villager/envoy) như Thợ Rèn chờ
  PixelLab. Hộp thoại sư phụ có khối hướng dẫn riêng + nút Bái sư.
- Bái sư (socket `apprentice_master`, cần đứng ≤95px, linh thể bị
  chặn như mọi tương tác GĐ128): chưa có nghề thì bái sư = học nghề
  luôn (vẫn cần đo linh căn trước); đã có nghề này thì chỉ nhận làm
  đệ tử; đã có nghề khác thì chặn (mỗi người 1 nghề). Đệ tử được
  bonus chế tạo +5% tỉ lệ thành công (TẠM), hiện cả trong panel
  Nghề và trong `craft_result.rate` (cả khi chế thất bại — sửa sau
  khi probe chỉ ra nhánh thất bại thiếu rate).
- Sư phụ lưu bền: `job.master` copy ở cả 2 chỗ load/lưu nhân vật
  (quy tắc GĐ89/GĐ95) + payload kèm `title`/`master`; panel Nghề
  hiện danh hiệu đầy đủ, tên sư phụ, lượt chế, còn bao nhiêu lượt
  nữa lên phẩm kế (hoặc đã chạm trần cảnh giới).
- Quest nghề: `server/data/quests_gd131.json` (15 quest — 5 nghề ×
  chuỗi 3: bái kiến (talk) → chế 5 món cơ bản → chế 15 món bất kỳ
  của nghề; thưởng 80/15 → 140/25 → 320/60, TẠM) + mirror client
  `quests_gd131_info.ts` (nhận/trả qua hộp thoại sư phụ, không qua
  bảng). Chuỗi nối bằng requiresFlag/setsFlag như GĐ130. Engine
  thêm 2 luật: (1) quest có `jobId` thì dialog chỉ hiện với người
  cùng nghề và accept chặn sai nghề — kiểm tra nghề TRƯỚC cờ
  chuỗi để báo đúng lý do (probe bắt được: sai nghề mà báo "hoàn
  thành phần trước" là sai thông điệp); (2) quest chế không có
  `recipeId` mà có `jobId` thì tính mọi lần chế thành công cùng
  nghề (dùng cho Q3 rèn tay nghề).
- Test: probe p131 (port 3342, xem `~/workspace/probes/p131_quests.js`).
- Test: probe p131 (port 3342, xem `~/workspace/probes/p131_quests.js`).
  **Probe p131 ALL PASS (chạy 3, 28/10)**: boot nối 15 quest; 5 sư
  phụ đúng vị trí (520/640/760/880/1000, y=390); thang 14 cấp đúng
  cả 7 nấc kiểm tra (0→Nhất Phẩm, 30→Tam Phẩm, 200 Phàm→Tứ Phẩm
  chạm trần, 200 LK→Lục Phẩm, 1500 KD→Thập Nhị Phẩm chạm trần,
  1500 NA→Đế Sư/Đế Vương Đan Sư, 2500 HT→Thánh Sư/Thánh Vương
  Đan Sư); dialog sư phụ có masterInfo, chưa có nghề không thấy
  quest nghề; chế không nghề → lỗi nghề, bái sư học luôn nghề,
  bái lại → nhắc đã là đệ tử, bái nghề khác → lỗi đã học nghề;
  dialog sau bái sư hiện Q1, Q2 ẩn tới khi xong Q1; rank 1 chế công
  thức Tam Phẩm → lỗi cấp; chuỗi Đan Sư trả đúng +80/+140/+320;
  tỉ lệ đệ tử 0.95, không bái sư 0.9; nhận quest nghề khác → lỗi
  nghề; sau restart sư phụ + 20 lượt chế + Nhị Phẩm còn nguyên.
  Bài học probe: (1) chạy 1 rớt ở nhận quest nghề khác vì
  requiresFlag chặn trước jobId nên báo sai thông điệp — đã đổi
  thứ tự: kiểm tra nghề trước cờ chuỗi; (2) chạy 2 rớt ở đối chứng
  không bái sư vì craft thất bại không kèm rate — đã thêm rate
  vào cả nhánh thất bại của craft_result.

## GĐ132 — NGHỀ THU THẬP: ĐÀO KHOÁNG + HÁI THUỐC

- 2 nghề mới (mỗi người vẫn 1 nghề): Linh Khoáng Sư (⛏️) + Hái Thuốc
  Sư (🌿), chung thang 14 cấp GĐ131 (lượt thu thập tính vào
  job.crafts). Sư phụ nối dài hàng y=390: Khoáng Lão (1120), Thảo
  Lão (1240), sprite tạm merchant/shopdan (chờ sprite riêng như
  các sư phụ khác).
- Điểm tài nguyên: mạch quặng (ore) + bụi thuốc (herb), vị trí CỐ
  ĐỊNH theo map (seed từ mapId nên không đổi qua mỗi lần boot).
  Làng 6+6 ở vành đai farm phía đông (x ≥ 1650) cho người mới;
  map farm + map nguyên tố mỗi map 6+6 (seed, tránh vật cản, cổng,
  đàn tế, NPC trong 150px); thành phố + map nghề là khu văn minh
  nên không có điểm hoang.
- Nguyên liệu theo bậc map (TẠM): Phàm/LK → Quặng Sắt/Thảo Dược;
  TC → Quặng Đồng/Linh Thảo; KD+ → Quặng Bạc/Tiên Thảo. Mỗi lần thu
  thập +1–2 nguyên liệu (TẠM).
- Socket `gather_node`: cổng hp > 0 (linh thể chặn như mọi tương
  tác GĐ128), đúng map của điểm, ≤80px (INTERACT_RANGE), đúng nghề
  của điểm, chưa thu thập điểm đó trong ngày (per-player: mỗi
  người một lịch riêng, người khác đào cùng mạch trong ngày vẫn
  được). Thành công: nghề +1 lượt, tiến trình quest gather, notice
  lên cấp nếu có.
- Client: map_enter gửi `nodes` (cả làng lẫn map hoang); quầng
  sáng + nhãn điểm (nhãn chỉ hiện trong 260px như NPC thành phố);
  gợi ý E "Bấm E — Đào/Hái ..." + bấm E gửi gather_node; panel
  nghề thu thập không có công thức nên hiện hướng dẫn đi thu thập
  thay cho danh sách trống.
- Quest nghề thu thập (`quests_gd132.json`, 6 cái, 2 nghề × chuỗi
  3): gặp sư phụ (80/15) → thu thập 5 (140/25) → thu thập 15
  (320/60); engine thêm quest kind `gather` (lọc nodeKind
  ore/herb, jobId gate như GĐ131).
- Test: probe p132 (port 3344, xem `~/workspace/probes/p132_quests.js`).
  **Probe p132 ALL PASS (chạy 5, 28/10)**: 62 asserts — boot nối
  6 quest; 2 sư phụ đúng vị trí; map_enter làng 12 điểm đúng vị
  trí + đúng nguyên liệu bậc Phàm; bái sư học luôn nghề; hái sai
  nghề → lỗi nghề; đào ok qty 1–2, nghề +1 lượt; đào lại trong
  ngày → lỗi ngày; đào mạch xa → lỗi khoảng cách; chuỗi Đào
  Khoáng trả đúng +80/+140/+320 (Q3 15 lượt qua 3 lần sang ngày,
  tiến trình 6/12/15); B đào mạch A vừa đào trong ngày vẫn ok
  (per-player); chuỗi Hái Thuốc Q1 +80, Q2 tiến trình 1/5; map
  hoang Băng Phong Cốc 12 điểm đúng bậc LK, ô mạch đi được (đứng
  đúng mạch, lệch 0px, không bị respawn về cổng); sau restart job
  21 lượt + Nhị Phẩm + gatheredNodes còn trong file.
  Bài học probe + lỗi game thật: (1) chạy 1–2 rớt ở trả quest vì
  waitFor chỉ nhận giá trị truthy nên đá = 0 bị coi là chưa đọc
  được — từ nay chờ điều kiện boolean rồi mới đọc số; (2) chạy 3
  rớt ở leg restart vì rejoin chỉ có welcome, không có char_sync
  — đọc job từ welcome.character; (3) chạy 4 rớt ở leg restart vì
  persistPlayer không ghi gatheredNodes (chỉ 2 chỗ tạo nhân vật có
  field, chỗ lưu bền thì thiếu) — lỗi game thật: cổng ngày sẽ
  reset mỗi lần restart; đã thêm dòng ghi vào persistPlayer (đủ
  bộ 3: tạo lúc đăng nhập + tạo bóng offline + lưu bền); (4)
  probe treo sau khi server dừng vì socket.io client tự reconnect
  giữ event loop — finally phải process.exit sau khi dọn server.

## GĐ133 — ĐAN DƯỢC TĂNG CHỈ SỐ CÓ THỜI HẠN

- 5 đan mới của Đan Sư, uống là tăng chỉ số trong X phút THẬT
  (đồng hồ thật, không phụ thuộc ngày game; bền qua restart vì
  buffs lưu file): Bạo Lực Đan (Vật công + Pháp công +30%, 30
  phút), Thiết Bích Đan (Vật phòng + Pháp phòng +30%, 30 phút),
  Huyết Khí Đan (HP tối đa +200, 60 phút), Nguyên Linh Đan (Chân
  nguyên tối đa +200, 60 phút), Thần Tốc Đan (Tốc độ +20%, 30
  phút). Mọi số TẠM.
- Luật cộng dồn: uống đan khác loại thì cộng dồn cả 5 cùng lúc;
  uống cùng loại thì LÀM MỚI thời hạn (không cộng dồn — như độc
  GĐ98).
- Công thức (Đan Sư, nguyên liệu chính là thảo dược GĐ132 nên tự
  khóa theo map tới được): Huyết Khí {Thảo Dược 3 + Nanh Sói 2,
  15 đá, 85%, Tam Phẩm}; Nguyên Linh {Thảo Dược 3 + Cánh Dơi 2,
  15 đá, 85%, Tam Phẩm}; Bạo Lực {Linh Thảo 2 + Nanh Sói 2, 20 đá,
  80%, Nhị Phẩm}; Thiết Bích {Linh Thảo 2 + Đá Quý 1, 20 đá, 80%,
  Nhị Phẩm}; Thần Tốc {Tiên Thảo 2 + Cánh Dơi 2, 30 đá, 75%, Tứ
  Phẩm}. Tổng công thức 22 → 27.
- Cơ chế: buff % móc vào effStatsOf (đánh thường, chiêu, pet theo
  chủ đều ăn cùng lúc); buff máu/mana móc vào maxHpEff/maxMpEff
  (payload đã có sẵn 2 số này nên HUD hiện đúng max mới không
  cần sửa thêm); hết hạn: tick dọn key + kẹp máu/mana về max mới
  + lưu file; quá hạn coi như không có ngay cả trước khi tick dọn
  (lazy). Field buffs đủ bộ 3 chỗ (đăng nhập + bóng offline +
  lưu bền, bài học GĐ132).
- Client: ITEM_INFO + RECIPE_INFO mirror; HUD thêm dòng buff đang
  còn hạn (icon + tên + phút còn lại). Lưu ý: updateHudBars nhận
  tick entry nên KHÔNG có buffs — dòng buff phải đọc từ myChar
  (welcome/sync) mới hiện, đọc nhầm p.buffs là không bao giờ
  hiện.
- Test: probe p133 (port 3345, xem `~/workspace/probes/p133_quests.js`).
  **Probe p133 ALL PASS (chạy 4, 28/10)**: 19 asserts — cổng
  cấp (cấp 1 lỗi Tam Phẩm, cấp 3 lỗi Tứ Phẩm), cổng nghề (không
  nghề → lỗi Đan Sư), chế đủ 5 đan mới; sát thương thật lên sói
  16 → 19 khi có buff Cuồng Bạo → 16 khi hết hạn; làm mới thời
  hạn khi uống lại cùng loại; cộng dồn 2 buff rồi đủ 5 buff;
  maxHp 1100 → 1300, maxMp 100 → 300; sau restart đủ 5 buff
  trong welcome; buff hết hạn thì welcome mất key đó, tick
  prune xóa key khỏi file.
  Bài học probe: (1) sát thương đánh thường còn nhân speedK vũ
  khí (tay không nhanh → ×0,625) nên số đo phải tính cả hệ số
  này; (2) Nộ Thể Tu bền trong classRes qua các lần chạy probe
  — đủ 100 Nộ thì đòn thường +vatPhong×0,5 làm lệch số đo
  (chạy 3 đo 18 thay vì 16) — leg đo sát thương phải xóa
  classRes + đặt vatPhong 0; (3) đo sát thương nên đọc dòng
  [combat] trong log server (ghi dmg + target id mỗi đòn) thay
  vì soi hp qua tick — chính xác hơn khi quái khác chen ngang.

## GĐ134 — LUYỆN KHÍ SƯ TỰ RÈN TRANG BỊ

- Socket `forge_gear` {slot, rarity, weapon?, tokenRank?}:
  Luyện Khí Sư rèn ngay, không chờ như đặt rèn NPC, hỏng mất
  nguyên liệu. Khác đặt rèn NPC ở 3 điểm: cần nghề + cấp phẩm,
  làm ở đâu cũng được (không cần đứng gần Thợ Rèn), phẩm tối đa
  theo cấp nghề.
- Phẩm theo cấp (TẠM): Phàm cấp 1, Sơ cấp 2, Linh cấp 4, Bảo cấp
  6, Tiên cấp 8, Thần cấp 10, Huyết cấp 12, Ma cấp 13, Vô Cực
  cấp 14. Tỉ lệ thành công (TẠM): 95/90/85/80/75/70/65/60/50%,
  đệ tử Khí Lão +5% như chế tạo.
- Nguyên liệu (TẠM): quặng GĐ132 theo phẩm (Sắt → Đồng → Bạc)
  + Linh thạch (Phàm 10 … Vô Cực 3000; Vô Cực thêm Đá Quý 5 +
  Tinh Huyết 2).
- Đồ rèn ra là đồ GĐ119 thật: cùng roller generateGear, theo
  hướng tu + hệ chính của người rèn (linh căn chuẩn hóa qua
  normElement), vào gearBag, mặc được ngay; vũ khí chọn loại,
  lệnh bài chọn hạng 1–9 (Cửu → Nhất phẩm). Rèn thành công +1
  lượt nghề, tốn 2 thức ăn + 2 nước như chế tạo, tính vào quest
  nghề jobId-only (chuỗi Luyện Khí Sư). Lưu ý: generateGear
  throw khi đầu vào sai mà socket không có error boundary nên
  forge_gear kiểm tra hết (ô/phẩm/vũ khí/hạng/hướng/hệ) trước
  khi gọi roller.
- Client: khối Tự rèn trong panel Nghề (chỉ hiện với Luyện Khí
  Sư): chọn phẩm (khóa phẩm chưa đủ cấp), 9 ô đồ + select vũ
  khí/lệnh bài, bấm Rèn gửi forge_gear.
- Test: probe p134 (port 3346, xem `~/workspace/probes/p134_quests.js`).
  **Probe p134 ALL PASS (chạy 1, 28/10)**: 20 asserts — cổng
  cấp (cấp 1 lỗi Nhị Phẩm), cổng ô/phẩm/nghề, rèn Phàm ra
  "Phàm Kim Y" đúng phẩm/ô/hướng/hệ vào gearBag, rèn Vô Cực ra
  "Vô Cực Kim Chiến Phủ" đủ 5 dòng nội tại, mặc xong attack
  hiệu dụng 480, chuỗi Luyện Khí Q1 +80 / Q2 +140 / rèn 1 lần →
  Q3 tiến trình 1/15, sau restart còn đồ + đang mặc + lượt nghề
  2007.

## GĐ135 — TRẬN PHÁP SƯ BỐ TRẬN

- Socket `array_place` {type} + `array_recall` {}: Trận Pháp Sư
  bố trận tốn 1 Trận Kỳ mỗi lần (Trận Kỳ chế ở panel Nghề: 4
  Nanh Sói + 10 Linh thạch, tỉ lệ 0,75, cấp 1; lưu ý Trận Kỳ dùng
  trực tiếp thì về quảng trường làng — người chơi tự chọn dùng
  làm trận hay để dành gọi về làng). Mỗi loại 1 trận/người, bố
  lại thay trận cũ. Cổng cấp (TẠM): dịch chuyển cấp 1, buff cấp
  2, debuff cấp 4, cấm chế cấp 6; sai nghề/sai loại/thiếu Trận Kỳ
  đều báo lỗi rõ ràng.
- 4 loại trận (TẠM): Trận Dịch Chuyển — bố tại chỗ đứng, bấm
  Gọi về trong panel Nghề là dịch chuyển tức thời về đó, CHỈ
  CÙNG MAP (khác map báo lỗi), dùng nhiều lần không tốn thêm,
  BỀN QUA RESTART (lưu teleportArray đủ 3 chỗ như gatheredNodes
  GĐ132); Trận Cường Công — người trong trận (200px, 60s) gây
  sát thương ×1,25; Trận Suy Nhược — quái trong trận (200px,
  60s) gây sát thương ×0,5; Cấm Chế Trận — quái trong trận
  (150px, 15s) không đi không cắn được (trừ trùm thử thách như
  Ý Cảnh).
- Trận chỉ chạy khi chủ trận ở cùng map (mirror cơ chế Ý Cảnh
  GĐ105: cờ hiệu ứng sống 300ms, chủ trận ngắt là mất); 3 trận
  tạm hết hạn / thoát / gục / dịch chuyển là mất, riêng Trận
  Dịch Chuyển giữ lại. Client: vòng tròn + tên trận như vòng Ý
  Cảnh, khối Bố trận trong panel Nghề (chỉ hiện với Trận Pháp
  Sư, nút khóa khi chưa đủ cấp/thiếu Trận Kỳ) + nút Gọi về.
- Test: probe p135 (port 3347, xem `~/workspace/probes/p135_quests.js`).
  **Probe p135 ALL PASS (chạy 11, 28/10)**: cổng nghề/cấp/
  loại/Trận Kỳ; bố trận dịch chuyển tại (1700,200) + gọi về tới
  đúng tuyệt đối + chặn gọi từ map khác; trong trận buff đánh
  sói 20 (16 × 1,25), hết hạn 60s về lại 16; không trận sói cắn 5,
  trong trận debuff cắn 3 (5 × 0,5 = 2,5 → 3); 10s trong cấm chế
  máu không đổi (5069 → 5069) mà sói vẫn đứng trong 60px (bị
  cấm chế, không phải bỏ đi); sau ngắt kết nối + 17s autosave
  offline + restart, file còn teleportArray và gọi về đúng
  (1700,200). Chưa kiểm tra bằng trình duyệt: vòng trận + panel
  Bố trận mới code-verified, chưa screenshot.

## GĐ136 — PHÙ SƯ 5 BÙA

- 5 bùa mới, chế cần nghề Phù Sư, dùng thì ai cũng dùng được
  (như đan dược): Phù Độn Thổ (về cổng map đang đứng — điểm tới
  như travel: làng (1080,664), map GDD portal−56; khác Trận Kỳ
  về làng và khác Trận Dịch Chuyển cần bố trước), Phù Cuồng Bạo
  (sát thương ×1,5 trong 60 giây — burst ngắn, khác đan buff dài
  30 phút), Phù Kim Cang (sát thương nhận ×0,5 trong 60 giây),
  Phù Định Thân (quái gần nhất trong 300px đứng yên 5 giây),
  Phù Lôi Kích (sét đánh quái gần nhất trong 300px, 100 sát
  thương phép xuyên giáp đá, log riêng `[talisman]` để đo).
- Bùa buff/khiên đi chung bảng buff có thời hạn GĐ133 (cùng cơ
  chế: bền file, tự dọn hết hạn, tự hiện HUD — không thêm field
  bền mới): Cuồng Bạo cộng vào chỉ số hiệu dụng qua mode pct
  (lưu ý: buff % cộng vào CHỈ SỐ rồi mới +10, nên phapCong 20→30
  cho 21 chứ không phải 16×1,5=24 như nhân thẳng dmg kiểu trận);
  Kim Cang móc ở hitPlayer (mode shield, không qua chỉ số).
  Định Thân dùng chung cờ cấm chế của trận GĐ135. Công thức
  (TẠM): Độn Thổ {Đá Quý 1, Nanh Sói 2} 30 đá cấp 2; Cuồng Bạo
  {Cánh Dơi 2} 15 đá cấp 1; Kim Cang {Đá Quý 1, Cánh Dơi 2} 20 đá
  cấp 2; Định Thân {Cánh Dơi 2, Đá Quý 1} 25 đá cấp 2; Lôi Kích
  {Nanh Sói 3} 20 đá cấp 1; tỉ lệ 0,8–0,85. Client: tên bùa,
  công thức, nút Dùng trong túi đồ.
- Test: probe p136 (port 3348, xem `~/workspace/probes/p136_quests.js`).
  **Probe p136 ALL PASS (chạy 2, 28/10)**: cổng nghề (không nghề
  chế → lỗi Phù Sư), chế Lôi Kích qua socket ok + kho tăng 1;
  Độn Thổ về đúng cổng làng (1080,664) + cổng thành (2400,3394);
  Cuồng Bạo đánh sói 21, hết hạn 60s về lại 16; không khiên sói
  cắn 5, trong khiên sói cắn 3 + dơi cắn 2 (khiên ở người nên mọi
  loài đều yếu, không phải trận theo vị trí); Định Thân: sói
  wolf-2 cắn 5 lần trước bùa, 0 lần trong 4s sau bùa, vẫn đứng
  gần (bị định thân, không phải bỏ đi); Lôi Kích đánh golem đúng
  93 (100 qua giáp 8), golem còn 47 máu; trong làng không quái
  thì 2 bùa nhắm mục tiêu báo lỗi tầm 300px. Chạy 1 rớt ở đo buff
  vì Pháp Tu đánh thường dùng PHÁP CÔNG (attackStatOf theo
  dmgType lớp) mà probe chỉ patch Vật Công — bài học đã ghi
  AGENTS.md. Chưa screenshot trình duyệt (tên bùa/công thức/nút
  Dùng mới code-verified).

## GĐ137 — THÚ SƯ THUẦN HÓA THÚ HOANG (NGHỀ CUỐI, 7/7)

- Thú Sư thuần hóa thú HOANG thành pet riêng (khác Cốt Vương của
  Cốt Tu và Quỷ Hồn của Quỷ Tu; Khôi Lỗi vẫn của Cốt Tu): socket
  `tame_beast` {monsterId} + `tame_release` {}. Cổng theo thứ tự:
  nghề Thú Sư → chưa có thú → tìm thấy thú → cùng map → không
  ẩn/trùm/thử thách/ảo ảnh → trong 80px → thú dưới 50% máu (phải
  đánh yếu trước). Tỉ lệ TẠM 60% + 5% nếu là đệ tử Thú Lão; thất
  bại chỉ báo notice, thử lại thoải mái không tốn gì.
- Thú thuần hóa giữ nguyên loài + tên + chỉ số của con hoang gốc
  (sói 40 máu/atk 5, golem 140 máu/atk 10...), thuần hóa xong hồi
  đầy máu. Theo mẫu pet Cốt/Quỷ: thực thể players (isCompanion +
  isTamed), bám chủ (0,36), đánh quái trong 440px quanh chủ, kéo
  về khi xa chủ quá 560px, taunt 220px, giết tính cho chủ, theo
  qua map, mất khi chủ thoát, hiện lại khi vào nếu còn sống. Hồi
  5%/s như Hạch Tâm Cốt Vương (không hồi thì thú yếu chết giữa
  trận đầu — probe chạy 3 chứng minh). Chết là mất hẳn (không
  phản phệ như Quỷ Hồn), thuần hóa con khác. Thú hoang gốc biến
  mất nhưng một con cùng loài sinh lại ngay để bãi không hụt.
  Bền trong classRes.tamed {active, kind, name, maxHp, atk, def,
  hp} — classRes lưu wholesale nên không cần field bền mới.
  Lưu ý kỹ thuật: mã hóa máu qua khiHuyet (100 + khiHuyet×10) có
  sàn 110 nên thú dưới 100 máu (sói 40, dơi 20) bị thổi lên 110 —
  đã sửa bằng stats.maxHpOverride (chỉ pet thú dùng, người chơi
  không có key này nên không đổi hành vi cũ).
- Client: pet vẽ sprite đúng loài (mon-<kind>, cao ~60px); dòng
  HUD pet hiện 🐾 + tên thú + máu; nút 🐾 Thuần Hóa chỉ hiện cho
  Thú Sư khi có thú yếu (<50% máu) trong 80px và chưa có thú;
  nút Thả về rừng trong dòng HUD pet khi đang có thú.
- Test: probe p137 (port 3349, xem `~/workspace/probes/p137_quests.js`).
  **Probe p137 ALL PASS (chạy 5, 28/10)**: cổng nghề (không nghề
  → lỗi Thú Sư), sói đầy máu → lỗi dưới 50%, sói xa >200px → lỗi
  trong 80px; đánh yếu sói 40→8 rồi thuần hóa thành công (60%/lần,
  trong 6 lần); pet xuất hiện đúng loài wolf tên Sói Xám, sói gốc
  biến mất, bãi vẫn đủ 5 sói (sinh lại), owner tick petIsTamed=1
  + petName=Sói Xám + petHp khớp pet thật; đã có thú → thuần hóa
  nữa bị chặn; chủ đi 700px nam, pet di cư theo (Δy=626px) và luôn
  trong phong bì leash (min 68px); pet tự đánh sói đúng 13 dmg
  (0,85×15) khi chủ đứng yên; sau disconnect + autosave 17s +
  restart, file còn tamed.active=true + kind wolf + hp 28, pet
  hiện lại đúng loài; thả thú (hết petHp + notice) rồi thuần hóa
  lại thành công. Chạy 1 rớt vì mã hóa khiHuyet thổi sói 40→110
  máu (bug game thật, đã sửa bằng maxHpOverride); chạy 2–3 rớt
  vì pet 40 máu không hồi thì chết giữa trận khi tank (đã sửa
  bằng hồi 5%/s); chạy 4 rớt vì assert pet sát chủ trong 150px
  sai luật engage (pet ưu tiên đánh quái gần chủ, không về sát
  chủ) — đã sửa thành đo di cư + phong bì leash. Chưa screenshot
  trình duyệt (sprite thú/nút Thuần Hóa/nút Thả mới code-verified).
  Chưa probe: cổng trùm/thử thách/ảo ảnh/ẩn (code-verified 1 dòng
  mỗi cổng, giống mẫu cũ).

## GĐ138 — THÀNH TỰU CHUNG (KHUNG + DANH HIỆU + ĐẠO TÍCH + RƯƠNG)

- Thay hẳn 10 mốc GĐ27 (thưởng Linh thạch) bằng khung thành tựu theo
  tài liệu bản -2: 100 loại / 11 nhóm (Tu luyện, Chiến đấu, Công
  pháp, Nghề phụ, Khám phá, Quái và trùm, Sinh tồn, Của cải, Nhân
  duyên, Linh thú/thảo/đan, Ẩn); mỗi loại 3–10 bậc; mỗi bậc nhận 1
  lần, thưởng 3 thứ: danh hiệu `Tên gốc · Cấp` + 1 Rương Thành Tựu +
  Đạo Tích. Cấp danh hiệu 1–10 theo công thức trong tài liệu (bậc
  1 = cấp 1, bậc cuối = cấp 10, giữa rải đều: 5 bậc → 1, 3, 6, 8,
  10); Đạo Tích mỗi bậc: bậc 1–3 → 1, 4–6 → 2, 7–9 → 3, bậc 10 → 4.
  Tổng Đạo Tích toàn bộ khung = 816 (khớp đúng bảng tài liệu theo
  từng nhóm: 83/121/59/85/85/91/71/83/76/40/22). Danh hiệu đeo 1
  cái, đổi tự do ngoài lúc gục ngã, hiện dưới tên nhân vật cho mọi
  người thấy (màu theo cấp). Nhóm Ẩn hiện "???" cho tới khi đạt
  bậc 1. Thành tựu là của tài khoản, không reset — số liệu nằm
  trong counters của nhân vật, không bao giờ xóa.
- 71/100 loại đã nối số liệu thật (server tự đo trong lúc chơi);
  29 loại chưa nối (vườn, thú cưỡi, luân hồi, thư viện, bẫy, treo
  thưởng, vượt Tường Đá/Trận Bão, rương ẩn, điểm bí mật, tinh
  thông vũ khí, chiêu max cấp, phẩm đan, mốc riêng từng lớp, xuất
  khiếu, chơi nhiều hướng, ngân sách, chết vì bẫy, kết bái, đệ
  tử, NPC đột phá giúp, thân mật/tiến hóa pet, chuỗi Đỏ/Đen/Hư
  sắc, mộng kiếp trước, ma khí, sách thư viện) vẫn có đủ dữ liệu
  trong code nhưng ẩn khỏi panel cho tới khi cơ chế của chúng có
  thật. Đá đã nhận từ 10 mốc GĐ27 cũ không bị thu hồi, mốc cũ
  không nhận trùng được nữa (socket cũ đã thay bằng socket mới).
- Rương Thành Tựu có 5 phẩm theo cấp danh hiệu: Đồng/Bạc/Vàng/
  Ngọc/Thiên. Tài liệu ghi vật phẩm chưa có trong game (hạt giống,
  Lệnh Tiết Thời, trứng thú, bí tịch) nên nội dung rương là TẠM
  từ kho đồ đã có: Đồng 1 món thường, Bạc 2 món thường, Vàng 1
  thường + 1 hiếm, Ngọc 2 thường + 1 hiếm (+15% thêm 1 hiếm),
  Thiên 2 thường + 1 rất hiếm. Món thường: Nanh Sói, Cánh Dơi,
  Đá Quý, Hồi Xuân Đan, Đan Hồi Nguyên; hiếm: Khôi Lỗi, Mảnh
  Xương; rất hiếm: Đan Kết Đan, Khôi Lỗi. Mở rương bằng nút Dùng
  trong túi như mọi vật phẩm.
- Chưa làm trong GĐ138 (để giai đoạn sau): thưởng mốc nhóm
  (15%/40%/75% Đạo Tích nhóm, 3 mốc mỗi nhóm + thưởng hoàn thành
  nhóm), mốc Đạo Tích vĩnh viễn (20–780), 29 loại chưa nối, hiệu
  ứng động cho danh hiệu cấp 8–10 (hiện chỉ approximated bằng màu
  vàng sáng). Sát thương tính thành tựu chỉ tính đòn do chính
  người chơi gây ra (đánh thường + chiêu + Phật Quang + Lôi
  Kích); dot/pet/phản đòn không tính.
- Test: probe p138 (port 3350, xem `~/workspace/probes/p138_quests.js`).
  **Probe p138 ALL PASS (28/10)**: boot 431 quái; giết 23 sói →
  ach_cd_kills bậc 1 + claimable; panel ẩn hiện "???" cho thành
  tựu ẩn, def chưa nối không hiện; nhận bậc 1 được +1 Đạo Tích +
  rương Đồng trong túi; đeo danh hiệu "Sát Tinh · Tập Sự", tick
  hiện đúng tên + màu trắng; nấu 10 món tẩm bổ → nhận bậc, tổng
  Đạo Tích = 2; thuần hóa 1 sói (Thú Sư, đánh yếu 40→8) → nhận
  bậc; patch questsDone=5 → nhận bậc, tổng Đạo Tích = 3; mở
  rương Đồng: rương −1, đúng 1 món thường +1; sau disconnect +
  autosave 17s + restart, file còn đủ 3 bậc + Đạo Tích 3 + danh
  hiệu đang đeo, vào lại game vẫn thấy danh hiệu dưới tên. Chạy
  1 rớt ở mở rương vì probe gửi `{id}` trong khi handler use_item
  đọc `data.itemId` (return lặng, không báo lỗi) — đã sửa probe.
  Chưa screenshot trình duyệt (panel + danh hiệu dưới tên mới
  code-verified qua tick/payload).

## GĐ139 — THƯỞNG MỐC NHÓM + HOÀN THÀNH NHÓM + MỐC ĐẠO TÍCH + HIỆU ỨNG DANH HIỆU
- Nối tiếp GĐ138 (đóng các mục "chưa làm" của GĐ138 trừ 29 loại chưa
  nối — 29 loại vẫn để giai đoạn sau, xem cuối mục).
- Thưởng mốc nhóm (tài liệu bản -2: 3 mốc mỗi nhóm = 15%/40%/75%
  tổng Đạo Tích nhóm, làm tròn 5 — tổng nhóm lấy theo bảng tài liệu,
  KHÔNG đổi khi nối thêm def mới nên perk đã mở không bao giờ bị thu
  hồi): Tu luyện 10/35/60, Chiến đấu 20/50/90, Công pháp 10/25/45,
  Nghề phụ 15/35/65, Khám phá 15/35/65, Quái và trùm 15/35/70,
  Sinh tồn 10/30/55, Của cải 10/35/60, Nhân duyên 10/30/55,
  Linh thú 5/15/30, Ẩn 5/10/15. Mốc tự mở khi đủ Đạo Tích NHÓM
  (tính từ các bậc ĐÃ NHẬN, không cần nhận riêng).
- Perk nối thật (chỉ những perk map được lên hệ MMO đã có; perk nào
  trỏ tới hệ chưa có thì panel hiện rõ "(chưa có cơ chế)", KHÔNG bịa
  cơ chế): Chiến đấu m1 +2% sát thương lên quái (đánh thường + chiêu
  + Phật Quang + Lôi Kích), m2 +3% hồi máu nhận được (đan Hồi Xuân
  tính theo người uống, Y Tu hồi tính theo người được hồi); Công pháp
  m1 −5% thời gian luyện, m3 −5% chân nguyên mọi chiêu (trừ Kiếm Vực
  trả bằng máu); Nghề phụ m2 +3% tỷ lệ chế tạo (chế thường + tự rèn);
  Khám phá m1 −5% thời gian đi đường (ngự kiếm/thuyền); Quái và trùm
  m1 +5% tỷ lệ rơi nguyên liệu, m3 +10% Linh thạch rơi từ quái; Sinh
  tồn m1 thức ăn/nước giảm chậm 5%, m2 −20% thời gian hồi sinh (40s →
  32s); Của cải m1 bán +5%, m2 mua −5% (áp sau giảm thiện cảm/khách
  quen); Tu luyện m2 bế quan +5% Tu vi (tích phần lẻ để không mất khi
  gained nhỏ); Nhân duyên m1 NPC mới quen bắt đầu +5 thiện cảm (ghi
  thẳng vào affinity lúc nói chuyện lần đầu, không qua affinityOf để
  khỏi bị cộng dồn khi tương tác sau).
- Perk chưa nối (parked, hiện rõ trong panel): Tu luyện m1 (MMO không
  cộng Tu vi khi giết quái), m3 (không có thời gian chờ thử lại đột
  phá); Chiến đấu m3, Công pháp m2 (chỉ có 2 bảng chiêu cố định);
  Nghề phụ m1/m3 (chế tạo tức thời, không hàng chờ); Khám phá m2
  (chưa có điểm bí mật), m3 (chưa có Tường Đá/Trận Bão); Quái và trùm
  m2 (mở rương tự động, không chọn ô); Sinh tồn m3 (chết không có
  hình phạt để miễn); Của cải m3 (túi không giới hạn ô); Nhân duyên
  m2/m3 (chưa có NPC giúp đột phá / nhờ chỉ điểm); Linh thú cả 3
  (chưa có thân thiết pet / vườn linh thảo / phẩm đan); Ẩn cả 3 (sự
  kiện ngẫu nhiên đã gỡ ở GĐ35 theo lệnh người chơi — không làm lại;
  chưa có thiên phú / manh mối).
- Hoàn thành nhóm: nhận đủ mọi bậc của mọi thành tựu ĐANG NỐI trong
  nhóm → 1 Rương Thành Tựu Thiên (1 lần/nhóm) + mở quyền chọn nhân
  đôi 1 perk của nhóm (socket `ach_choose_boost` {groupId, perk},
  mỗi nhóm 1 lựa chọn, vĩnh viễn — nhân đôi PHẦN THƯỞNG, ví dụ +2%
  thành +4%, không nhân đôi ngưỡng mốc). Panel hiện mốc + perk +
  nút Nhân đôi (chỉ perk đã nối mới có nút; nhóm toàn perk parked
  thì báo rõ chưa chọn được).
- Mốc Đạo Tích vĩnh viễn (8 mốc tài liệu): 20/60/120/220/350/500/650
  hiện rõ là chưa áp dụng (gắn với kiếp sau / túi có ô / thiên phú /
  Lệnh Tiết Thời — MMO chưa có); mốc 780 nối thật: danh hiệu "Vô
  Thượng Đạo Tích" đeo được qua `ach_equip_title` {daoTitle:true},
  cấp 10, màu cầu vồng. LƯU Ý QUAN TRỌNG: tổng Đạo Tích nối được
  hiện tại chỉ 646 (68 def) nên danh hiệu 780 CHƯA AI ĐẠT ĐƯỢC trong
  game thật — phải đợi các giai đoạn sau nối thêm ít nhất 134 Đạo
  Tích từ 32 def chưa nối; probe kiểm tra cơ chế bằng cách patch
  white-box daoTich=780 (ghi rõ trong probe, không phải chơi thật).
  Tương tự, mốc nhóm tính theo tổng tài liệu nên vài mốc chưa tới
  được hôm nay: Công pháp m3 (45, nối được mới 26), Khám phá m3 (65,
  nối được 63), Linh thú m2/m3, Ẩn m2/m3 — chúng sẽ mở dần khi các
  def chưa nối được nối thêm. Ngược lại, HOÀN THÀNH NHÓM thì nhóm
  nào cũng làm được ngay với def đang nối (tiêu chí GĐ139).
- Hiệu ứng danh hiệu cấp 8–10 (tài liệu bản -2): cấp 8 Siêu Phàm chữ
  ánh kim chuyển tông vàng (đổi màu theo tick 250ms), cấp 9 Chí Tôn
  chữ vàng 12px + hào quang, cấp 10 Vô Thượng chữ cầu vồng chuyển
  động (tự tính HSV→RGB, không dùng helper Phaser vì typings) +
  hào quang. Chùm tia sáng bay lên khi bước vào bản đồ (cấp 10) CHƯA
  làm — chỉ có cầu vồng + hào quang, ghi rõ là approximated.
- SỬA LỖI DỮ LIỆU GĐ138 (phát hiện khi audit để làm hoàn thành nhóm):
  vài def đang nối có bậc cuối KHÔNG BAO GIỜ tới được (trần cứng của
  game), khiến nhóm đó không thể hoàn thành — đã sửa ngưỡng, GIỮ
  NGUYÊN số bậc (để tổng Đạo Tích nhóm vẫn khớp tài liệu):
  itemsOwned 1200 → 32 (game chỉ có 55 id vật phẩm, char không nghề
  sở hữu được 32 loại qua rơi/shop/rương/quest); mapsVisited 150 →
  73 (74 map trừ thach_lam khóa tông môn); questsDone 12000 → 1040
  (1069 quest trừ 21 quest nghề khác, char không nghề làm được
  1048); speciesKilled 80 → 22 (đúng 22 loài quái); godskills 9 → 1
  (1 char chỉ lĩnh ngộ được 1 thần thông của lớp mình — tên def vốn
  là "Thần thông đầu tiên"). 3 def khái niệm đa nhân vật/đa nghề
  (directions, master, toprank) chuyển sang TẠM ẨN (enabled:false)
  — tổng def nối được: 68 (trước 71), tổng Đạo Tích nối được: 646,
  tổng toàn bộ def (kể cả ẩn) vẫn 816 khớp tài liệu (Công pháp bù
  lại bằng cách nới def chưa nối weapons 4→6 bậc để giữ tổng 59).
- Sửa bug thật trong handler đeo danh hiệu: emit {daoTitle:true}
  không có achId nên rẽ nhầm vào nhánh Tháo (đứng trước) — đã đổi
  thứ tự: nhánh daoTitle lên trước nhánh Tháo. Probe có hồi quy
  Tháo sau khi đeo danh hiệu Đạo Tích.
- Test: probe p139 (port 3351, xem `~/workspace/probes/p139_quests.js`).
  **Probe p139 ALL PASS (28/10, chạy 2)**: damage control 112 →
  sau mốc Chiến đấu nhân đôi 116 (sói/dơi; golem 103 → 107); heal
  3550 → 3627 (+3% mốc 2); bán da_quy 45 → 47 (+5%), mua nanh_soi
  12 → 11 (−5%); claim 113 bậc (Chiến đấu 73 + Của cải 40) → 2 nhóm
  hoàn thành, 121 + 71 Đạo Tích, 3/3 mốc cả 2 nhóm, tổng 192, rương
  Thiên 29 = 27 từ bậc cấp 9–10 + 2 hoàn thành nhóm; chọn nhân đôi
  perk 1, chọn lần 2 bị chặn; đeo Vô Thượng Đạo Tích, tick
  achTitleLevel 10; sau disconnect + autosave 17s + restart còn đủ
  groupComplete/groupBoost/title/daoTich. Chạy 1 rớt 4 chân: (1) probe
  gõ sai shopId `tiem_nguyenlieu` (đúng là `tiem_nguyen_lieu`) →
  shop undefined → throw ở `shop.point`, crash-guard nuốt lặng nên
  không có event nào (bài học: action socket im lặng hoàn toàn thì
  kiểm tra log server dòng [CRASH-GUARD] + chính tả identifier);
  (2) assert rương Thiên sai (tưởng chỉ có 2, quên bậc cấp 9–10 cũng
  cho rương Thiên); (3) bug thứ tự handler daoTitle/Tháo (trên);
  (4) chân damage S4 rớt 1 lần do quái farm spawn xa, chạy lại PASS
  (bat-7 −116). Chưa screenshot trình duyệt (panel mốc + hiệu ứng
  danh hiệu mới code-verified qua tick/payload).
- Chưa làm (để giai đoạn sau): 32 loại chưa nối (29 từ GĐ138 + 3 mới
  ẩn ở GĐ139); perk parked + mốc Đạo Tích 20–650 (đợi hệ tương ứng);
  tia sáng cấp 10 khi vào map; đan GĐ133 ĐÃ CÓ nguồn thảo dược từ
  GĐ140 (Tiệm Thảo Dược, xem mục GĐ140 dưới) — phát hiện ngoài lề
  GĐ139 coi như sửa xong.

## GĐ140 — TIỆM THẢO DƯỢC RIÊNG (CHỈ NPC CÓ BẰNG HÁI THUỐC SƯ MỚI ĐƯỢC BÁN)
- Luật do Bảo chốt 28/10: thảo dược KHÔNG bán ở Tiệm Nguyên Liệu mà
  có tiệm riêng; người bán phải là NPC có bằng Thải Dược Sư (người
  chơi thì bán lại thảo dược cho tiệm). Sửa phát hiện ngoài lề GĐ139
  (đan GĐ133 thiếu nguồn thảo dược) — không cần hệ mới, chỉ thêm tiệm.
- Tiệm mới `tiem_thao_duoc` (làng, chưa có bản thành phố vì NPC thành
  phố lấy từ data, chưa có vai Chủ Tiệm Thảo Dược): Chủ Tiệm Thảo Dược
  ở (700,660), điểm E (724,654) — ô trống đã kiểm tra ngoài mọi rect
  nhà + pad. NPC mang cờ `herbCert: true`; handler `shop_buy` chặn
  bán thảo dược khi chủ tiệm của tiệm đó không có bằng (lỗi nhắc đúng
  bằng Thải Dược Sư). Các tiệm khác vốn không liệt kê thảo dược nên
  cũng không bán được — cổng kiểm chặn luôn cả trường hợp sau này có
  tiệm khác thêm thảo dược vào bảng giá.
- Giá TẠM (thảo dược thường 5 LT theo tài liệu, còn lại TẠM): bán ra
  Thảo Dược 5 / Linh Thảo 20 / Tiên Thảo 40; thu mua lại 2 / 8 / 16
  (~40% như các tiệm khác). Thiện cảm +1/giao dịch, giảm 10% khi ≥50,
  từ chối khi ≤−50 và mốc Của cải GĐ139 áp dụng chung qua handler
  shop (không code riêng). Client mirror đủ: SHOP_INFO, SHOP_NPC_CLIENT,
  NPC_NAME_CLIENT, sprite tạm `villager-b`, điểm E, mô tả vật phẩm.
- Probe p140 ALL PASS (port 3352, env p140_env, script p140_quests.js):
  điểm tiệm đi được (không respawn về quảng trường), dialog mở đúng
  Tiệm Thảo Dược, mua 3 thảo dược đúng giá (−5/−20/−40), bán lại +2,
  Tiệm Nguyên Liệu + Tiệm Đan từ chối thảo dược (không đổi), white-box
  gỡ `herbCert` → mua bị chặn đúng lỗi bằng + không trừ tiền, khôi
  phục file byte-identical (md5) → mua lại được, log không CRASH-GUARD.
  Chạy 1 rớt 2 lần do lỗi cú pháp probe (thiếu `try {` mở đầu main rồi
  thiếu `}` đóng main) — lỗi probe, không phải lỗi game.
- Chưa làm: bản thành phố của Tiệm Thảo Dược (cần thêm vai vào data
  NPC thành phố); sprite riêng cho Chủ Tiệm Thảo Dược (đang dùng tạm
  villager-b); chưa screenshot trình duyệt.

## Đổi tên nghề (28/10)
- Đào Khoáng Sư → **Linh Khoáng Sư** (địa mạch = mạch đất, đúng chất tu
  tiên); Hái Thuốc Sư → **Thải Dược Sư** (thải dược = hái thuốc theo
  cách nói cổ điển). Chỉ đổi tên hiển thị: JOBS server + client, vai
  sư phụ, hướng dẫn sư phụ, tên/mô tả 6 quest GĐ132, lỗi bằng GĐ140.
  Giữ nguyên: jobId (daokhoang/haithuoc), cơ chế nghề, tên sư phụ
  Khoáng Lão/Thảo Lão, icon. Kiểm chứng: node --check, vite build,
  grep hết tên cũ trong code, boot server /api/status ok (quái 431,
  NPC 9002, 0 CRASH-GUARD).

## Đổi tên tiếp (28/10)
- Địa Mạch Sư bị chê khái quát quá → **Linh Khoáng Sư** (mạch thì cái
  gì dưới đất cũng là mạch; khoáng mới chỉ đúng quặng, thêm linh cho
  ra chất tu tiên). Đổi theo ở JOBS, vai sư phụ, hướng dẫn sư phụ,
  quest GĐ132 (Địa mạch nhập môn/chăm chỉ → Linh khoáng nhập môn/
  chăm chỉ).
- Sát Thủ → **Ảnh tu** (Bảo chọn Ảnh Tu trong 3 phương án Ảnh Tu/Vô Ảnh Tu/Dạ Tu; Sát tu từng thử nhưng bị chê không hay; lớp duy nhất phá nếp X tu của 9 hướng; Ảnh tu
  giữ gốc Sát Khí, khớp Thể tu/Kiếm tu/Pháp tu...). Đổi ở: tên lớp
  (server CLASSES + client CLASS_LIST), mô tả vật phẩm độc, lỗi chế
  độc/bôi độc, mô tả quest GĐ127, tên đường gear SAT_THU, className
  trong SkillData (giờ 9 lớp đều dạng X Tu). Giữ nguyên: classId
  satthu, cơ chế Sát Khí/né/độc, tên chiêu Vô Ảnh Ám Sát, danh hiệu
  thành tựu Trùm Sát Thủ (danh hiệu săn trùm, không phải tên lớp).
- Kiểm chứng: node --check, 4 file JSON hợp lệ, vite build, grep hết
  tên cũ trong code/data, boot server /api/status ok (quái 431, NPC
  9002, 0 CRASH-GUARD).


## GĐ141 — CẢNH GIỚI ẨN (ENGINE: đếm + mở khóa, chưa gắn phần thưởng)

- Luật Bảo chốt 28/10: ở tầng 9 đã đủ tu vi nhưng không đột phá mà tiếp
  tục tu luyện thì tích "năm tu thêm": **30 ngày tu luyện = 1 năm**.
  Mốc mở: **Luyện Khí viên mãn 10 năm (LK9, 300 ngày)**, **Luyện Hồn
  15 năm (LK9, 450 ngày, cộng dồn)**, **Nhập Đạo 20 năm (KD9, 600 ngày)**.
- Chỉ đếm ngày có tu luyện THẬT: đang bế quan / thiền ở linh mạch, hoặc
  nhận tu vi từ quest trong ngày đó. Đồng hồ thế giới chạy cả khi offline
  nên KHÔNG đếm ngày chỉ trôi qua (chống AFK chờ tài nguyên — đúng triết
  lý game). Mỗi ngày game tối đa 1 lần (khóa theo lastDay).
- "Đủ" = tầng 9 + tu vi >= ngưỡng đột phá của bước đó (cùng đường cong
  tuViNeedStep mà đột phá dùng). KD9 tính theo bước 27 (NA đang bị chặn
  nên KD9 luôn ở trạng thái "đủ nhưng không độ").
- Mở khóa một chiều, không thu hồi; mở thì báo notice
  "✦ Đã mở cảnh giới ẩn: ...!". Trạng thái `anState {lkDays, kdDays,
  lkLastDay, kdLastDay, vienman, luyenHon, nhapDao}` bền ở cả 3 chỗ
  (persistPlayer, spawnFromCharacter, spawnOfflineActor) + đi theo
  characterPayload (welcome + char_sync).
- Thẻ nhân vật hiện dòng `🌑 Năm tu thêm: X/Y năm → ...` khi đang ở
  tầng max, và `✦ Cảnh giới ẩn: ...` khi đã mở (kể cả sau khi đã đột
  phá lên cảnh khác).
- Probe p141 ALL PASS (port 3353, DAY_REAL_MS=30000): 299→300 mở viên
  mãn + notice, 449→450 mở Luyện Hồn kèm viên mãn, KD9 599→600 mở
  Nhập Đạo, cùng ngày không đếm thêm, không tu luyện / chưa đủ tu vi
  qua 2 ngày vẫn không đếm, bền qua autosave 15s + restart, 0
  CRASH-GUARD. Dòng thẻ nhân vật mới chỉ code-verified (chưa chụp
  trình duyệt).
- GĐ142 (xem dưới) đã làm: chỉ số ẩn Luyện Hồn (bạo kích/may mắn),
  tăng chỉ số + nghề thứ hai của Nhập Đạo, danh hiệu đường viên mãn.
  Vẫn CHƯA LÀM (đợi Bảo chốt): loại tu thứ hai / hợp nhất, ô 8-10,
  bí cảnh riêng, nhánh Ma/Tiên (đã làm ở GĐ143 dưới đây), cơ chế riêng từng đường viên mãn,
  đường viên mãn cho Cốt/Quỷ/Ảnh/Pháp.

## GĐ142 — PHẦN THƯỞNG CẢNH GIỚI ẨN (Luyện Hồn + Nhập Đạo + danh hiệu đường)

- Luyện Hồn (mở ở LK9 15 năm) mở 2 chỉ số ẩn, số TẠM: **bạo kích
  10% — đòn thường + chiêu gây ×2 sát thương** (chiêu tung 1 lần
  cho cả sát thương lẫn ghi nhận thành tựu, tránh 2 lần tung lệch
  nhau), **may mắn +15% tỉ lệ rơi nguyên liệu** (nhân vào cùng chỗ
  với mốc Quái/trùm GĐ139). Chỉ số ẩn hiện trong payload `anBonus
  {crit, luck, stats}` để probe/thẻ nhân vật đọc.
- Nhập Đạo (mở ở KD9 20 năm): **toàn bộ chỉ số ×1,2** (TẠM, áp sau
  đồ + đan trong effStatsOf, 7 chỉ số vatCong/phapCong/vatPhong/
  phapPhong/tocDo/thanThuc/khiHuyet; pet/bot không có anState nên
  không hưởng) + **học thêm 1 nghề phụ thứ hai**.
- Nghề thứ hai: `job2` cùng hình dạng với `job`, bền ở cả 3 chỗ
  (persistPlayer, spawnFromCharacter, spawnOfflineActor) + payload
  (welcome + char_sync). Mọi cổng nghề chấp nhận cả 2 nghề qua
  helper `jobOf(p, jobId)` + `jobRankOfJob`/`jobTitleOfJob`: học nghề
  (chưa Nhập Đạo thì nghề 2 bị chặn, đã đủ 2 nghề thì chặn nghề 3),
  bái sư theo nghề khớp, nhiệm vụ nghề, chế tạo (lượt/cấp/bonus đệ
  tử theo nghề khớp; công thức lớp Tẩm bổ/Chế độc/Dưỡng Kiếm/Luyện
  Lõi giữ cách tính cũ), tự rèn, bố trận, thu thập (lượt vào nghề
  khớp; gather_result.crafts + notice lên cấp báo theo nghề khớp),
  thuần hóa, thành tựu topRanks/masters (tính cả nghề 2).
- Panel Nghề hiện cả 2 nghề: dòng sub thêm nghề thứ hai, công thức/
  tự rèn/bố trận lọc theo nghề khớp, nghề thu thập thứ hai có hướng
  dẫn riêng, người đã Nhập Đạo mà chưa có nghề 2 thấy mục học nghề
  thứ hai (gửi learn_job như nhánh chưa có nghề).
- Viên mãn: thẻ nhân vật hiện danh hiệu đường theo tài liệu (chỉ có
  5 đường): Phật → Thánh tăng, Nho → Đại nho, Y → Thần y, Kiếm →
  Kiếm tâm, Thể → Võ tông sư; kèm dòng bonus Luyện Hồn (🍀 May mắn
  +15% · 💥 Bạo kích 10%) và Nhập Đạo (⚡ Toàn bộ chỉ số ×1,2).
  Cốt/Quỷ/Ảnh/Pháp KHÔNG có đường trong tài liệu — chưa bịa, đợi
  Bảo cho ý.
- Probe p142 (port 3354) + p142b (port 3355): anBonus crit 0.1 /
  luck 1.15 / stats 1–1.2; crit ×2 chứng minh qua sói 9/18 (Pháp công
  7), dơi 7/14 + golem 6/13 (Pháp công 3) + file ach_crits 3 và 8;
  đối chứng thetu vatCong 20 = 16, Nhập Đạo = 18; học dansu +
  daokhoang (nghề 2), chặn nghề 3, gather quặng vào job2 (job1 vẫn
  0), chế Hồi Xuân Đan vào job1 (job2 vẫn 1), chưa Nhập Đạo thì nghề
  2 bị chặn; bền qua autosave 15s + restart (file + reconnect giữ
  đủ job/job2/crafts); 0 CRASH-GUARD cả 2 run. Lưu ý probe: chỉ số
  char mới tạo là RANDOM (đừng giả định chỉ số gốc theo lớp — phải
  đọc file/patch đúng chỉ số cần đo); chân crit giết sạch sói nên
  chân đối chứng phải đo trước hoặc trên server mới.
- May mắn +15% chỉ mới kiểm chứng ở mức payload + code (muốn chứng
  minh thống kê cần ~1000 lần giết, không làm trong probe).
- CHƯA LÀM (đợi Bảo chốt): loại tu thứ hai / hợp nhất (Tách/Luyện
  hóa), ô 8-10, bí cảnh riêng từng người, nhánh Ma/Tiên (đã làm ở GĐ143 dưới đây), cơ chế
  riêng từng đường viên mãn (vũ khí/chiêu — vũ khí hiện khóa cứng
  theo lớp), đường viên mãn cho Cốt/Quỷ/Ảnh/Pháp. Dòng thẻ GĐ142
  mới code-verified + kiểm tra chuỗi trong bundle build (chưa chụp
  trình duyệt).

## GĐ143 — NHÁNH TIÊN/MA: 2 ĐƯỜNG QUEST (ẩn Luyện Hồn / thường Kim Đan)

- Luật Bảo chốt (28/10, sau 4 lần đổi ý trong tối — event chiến phe
  PARKED, không còn là cơ chế mở nhánh): nhánh Tiên/Ma dành cho MỌI
  người, không khóa ẩn, không mở sớm ở Luyện Khí. Ai đạt Luyện Hồn
  (cảnh giới ẩn GĐ141) thì tự mở nhiệm vụ nhánh ẨN "Tiên/Ma tranh đấu"
  (đồ phe đặc biệt + buff ẩn); ai chưa có Luyện Hồn thì tới Kim Đan
  mới mở nhiệm vụ nhánh THƯỜNG (chỉ có thân phận + quest + thưởng
  thường, KHÔNG buff). Chọn phe 1 lần; đổi phe (tẩy luyện: lễ gột
  rửa tốn linh thạch, xóa khí, tu lại từ đầu, cả 2 chiều) CHƯA LÀM.
- Trạng thái: `branch {side: 'tien'|'ma', source: 'hidden'|'normal'}`
  bền đủ 3 chỗ (đăng nhập + bóng offline + lưu bền) + payload.
  Socket `branch_choose {side}`: gục thì lỗi; đã chọn thì lỗi 'Bạn
  đã chọn phe rồi.'; Luyện Hồn → source hidden, Kim Đan+ (realm ≥ kd)
  → source normal, còn lại lỗi 'Chưa mở Tiên/Ma…'. Trả
  `branch_choose_result {ok, side, source}`.
- Quest `server/data/quests_gd143.json` (4 cái, Sứ Giả giao, mirror
  client `quests_gd143_info.ts`): nhánh ẩn q143_an_1 giết 10 quái bất
  kỳ (140 LT/25 tuVi, cờ branch_an_1) → q143_an_2 gặp Sứ Giả nhận
  Lệnh Bài (320/60, cờ branch_hidden_done); nhánh thường q143_thuong_1
  (650/120) → q143_thuong_2 (650/120). Cổng trong quest_accept (sau
  cổng jobId): chưa chọn phe → 'Hãy chọn phe Tiên hoặc Ma trước đã.';
  sai đường → lỗi riêng từng đường; quest sai đường cũng bị ẩn khỏi
  danh sách dialog ở làng. Nhận Q1 (cả 2 đường) spawn Tướng phe đối
  địch: người chọn Tiên gặp 'Ma Tướng Tranh Đấu', chọn Ma gặp 'Tiên
  Tướng Tranh Đấu' (golem ở (1700,200), mang `faction` phe đối địch).
- Lệnh Bài phe (chỉ nhánh ẩn, trả Q2): đồ TOKEN thật của GĐ119, phẩm
  DO, hạng 9 Nhất Phẩm, tên 'Tiên Lệnh Nhất Phẩm'/'Ma Lệnh Nhất Phẩm',
  base {attack 2, defense 2, hp 10} → mặc vào gearStats 14/14/70
  (DO ×7,0). Cổng mặc: gear.js canEquip chặn đồ có `faction` khác phe
  người mặc ('Không thể trang bị'). Đeo Lệnh Bài mới dùng được skill
  phe, mới hưởng dmg +25% lên phe đối địch.
- Buff ẩn (chỉ khi đã trả Q2 nhánh ẩn, cờ branch_hidden_done): Tu vi
  ×1,2 cả 2 phe (bế quan + thiền + trả quest + offline — KHÔNG áp cho
  phù tụ linh vì đó là vật phẩm); Tiên hồi phục ×1,2 (đan Hồi Xuân /
  Hồi Nguyên + y_heal); Ma dmg gây ra ×1,1 (đòn thường + chiêu +
  Phật Quang + bùa Lôi Kích). Chú ý thứ tự trong quest_claim:
  setsFlag đặt TRƯỚC khi cộng tuVi nên chính Q2 đã hưởng ×1,2
  (60 → 72), không phải 60 như thiết kế probe ban đầu tưởng.
- Skill phe `faction_skill`: cần đeo Lệnh Bài phe, 20 MP, hồi 5s, quái
  gần nhất cùng map ≤300px (né được). Tiên 'Tiên Quang' hệ số 1,2 +
  tự hồi 10% máu tối đa; Ma 'Ma Diệm' hệ số 1,8. Trả
  `faction_skill_result {ok, skill, dmg}`.
- Client: thẻ nhân vật thêm dòng nhánh (nút chọn Tiên/Ma khi đủ điều
  kiện: Luyện Hồn hoặc realm kd/na/ht, chưa chọn phe) + nút skill phe
  (nhãn theo phe, chỉ hiện khi đeo Lệnh Bài). Chưa chụp trình duyệt.
- Probe p143 (port 3356) ALL PASS chạy 3 (0 CRASH-GUARD): đối chứng
  sói 16 (chưa nhánh); LK5 chọn/nhận đều bị chặn; Tiên ẩn chọn +
  file branch/flag + chọn lần 2 bị chặn; Q1 spawn Tướng Ma; giết 10
  → Q1 +25; Q2 talk + Tiên Lệnh DO/TOKEN/hạng 9 + flag + tuVi +72;
  heal 100 → Tiên ẩn 3160 vs thường 2650 (60% vs 50% của 5100); nhận
  lại Q1 → +30 (25×1,2); KdMa chain thường: chọn Ma/thường, Tướng
  Tiên, KHÔNG token KHÔNG flag; AnMa Ma Lệnh + gearStats 14/14/70;
  sói Ma ẩn 18 (16×1,1), Tướng chưa đeo 16 → đeo token 30 (gồm +14
  công của token ×1,1 ×1,25, def golem 8); Ma Diệm dmg ≥ 70, tốn
  đúng 20 MP, không token bị chặn; cổng sai đường 2 chiều; bền
  autosave 17s + restart (file + welcome.branch).
- Bài học probe (ghi lại để lần sau khỏi vấp): (1) ĐỪNG đánh mù ở
  bãi farm — chỉ 12 con rải khắp map, đứng sai chỗ là đánh không khí;
  phải ghim quái SỐNG (steerToLiveMon) và giết theo con gần nhất.
  (2) Char Luyện Hồn có chí mạng 10% ×2 nên assert dmg phải chịu
  được crit (sói Ma-ẩn 18/35, Tướng 16/32, đeo token 30/60).
  (3) quest_accept cần ≤95px từ người giao — nhận lại Q1 phải quay
  về Sứ Giả trước, đứng ở farm nhận là bị từ chối lặng lẽ.
  (4) Thạch Quái KHÔNG có giáp đá (giáp đá 50% là của Thạch Khôi
  Lỗi) — đừng áp physResist vào dmg golem.
- CHƯA LÀM (đợi Bảo chốt): tẩy luyện đổi phe; thang cảnh giới riêng
  Ma (Huyết Luyện, Nhập Ma, Ma Tướng, Ma Quân, Ma Tôn) / Tiên (Tiên
  Cơ, Địa Tiên, Thiên Tiên, Kim Tiên, Đại La) — tên trong tài liệu,
  số tầng làm sau; bảng hậu quả đột phá theo phe (Ma hỏng nhiều
  nhưng nặng nhất chỉ mất thọ nguyên, không mất căn cơ; Tiên hỏng
  ít nhưng có thể mất căn cơ); event chiến phe (đã park, nếu quay
  lại thì cả 2 đường cùng tham gia, không còn là cơ chế mở nhánh);
  mục tiêu dmg vs phe ngoài Tướng Q1 (game chưa có PvP nên hiện chỉ
  có Tướng là mục tiêu thật); screenshot trình duyệt UI nhánh +
  nút skill phe. GĐ143 local-only, CHƯA có zip mới.

## GĐ144 — MINH MẪN THAY THẦN THỨC + CHỈ SỐ ẨN ĐẠO QUÁN (29/10, probe p144 ALL PASS)
- Người chơi chốt (29/10): BỎ Thần Thức, thay bằng Minh Mẫn — Minh Mẫn CHỈ
  tăng chân nguyên + niệm phép nhanh hơn tí (không lĩnh hội chiêu nhanh);
  lĩnh hội chiêu nhanh + am hiểu chiêu nhanh chuyển hết sang Ngộ Tính.
- Minh Mẫn (đổi tên 1:1 từ Thần Thức, không mất chỉ số): chân nguyên tối
  đa = Minh Mẫn × 10; hồi chân nguyên khi thiền = 2 + Minh Mẫn × 0,2/giây;
  niệm nhanh = giảm hồi chiêu chiêu thức, TẠM 10 điểm = 1%, tối đa 20%,
  nhân với giảm hồi chiêu từ Tốc Độ. Không áp vào đòn thường hay skill phe.
  Migration: file cũ có thanThuc được đổi sang minhMan lúc load (cả 3 điểm
  spawn); skills_catalog.json đổi 182 điều kiện thanThuc → minhMan (không
  đổi là chiêu kẹt điều kiện cũ).
- Chỉ số ẩn (field hiddenStats, bền đủ 3 điểm + payload): luôn hiện trên thẻ
  nhân vật nhưng KHÓA tới khi mở thành tựu ẩn Đạo Quán; chưa mở thì không
  cộng được bằng điểm (allocate_stats chặn lặng, không trừ điểm).
  - Cấp 1 "Đạo Quán Là Nhà": thiền/bế quan trong khu Đạo Quán (vòng 120px
    quanh Tụ Linh (700,196), chỉ tính lúc online) đủ 300 giờ game → mở
    Ngộ Tính/Phúc Duyên/Bạo Kích/Bạo Thương + 200 điểm tự do.
  - Cấp 2 "Không Vội Chiến Đấu": đủ 1000 giờ game (lũy tiến) → mở Bản
    Nguyên/Ý Chí + 400 điểm tự do. Mở 2 cấp một lượt cộng dồn 600 điểm.
  - Ngộ Tính: thời gian lĩnh ngộ = gốc × 100/(100 + Ngộ Tính) (công thức cũ
    của Thần Thức chuyển sang); am hiểu: dùng chiêu tích điểm (1 × (1 +
    Ngộ Tính × 3%)), 100 điểm = 1 cấp, tối đa 10 cấp, mỗi cấp +2% sát thương
    chiêu và −2% chân nguyên (chiêu, không áp đòn thường).
  - Phúc Duyên (may mắn): cộng thẳng điểm % vào tỉ lệ đột phá (Đại/Kim
    Đan) và số món đồ xịn từ rương (mỗi 100 điểm = chắc chắn +1 món, phần
    lẻ roll thêm, tối đa +2 món ngoài món gốc); tổng tỉ lệ KHÔNG chặn
    100% (đột phá 100%+ = chắc chắn thành công, notice hiện 100%+).
  - Bạo Kích/Bạo Thương: giá 10 điểm chỉ số = 1 điểm (điểm tự do, không
    dùng bể đột phá ×2); Bạo Kích +1% tỉ lệ chí mạng mỗi điểm (tối đa
    100%, cộng với 10% của Luyện Hồn); Bạo Thương +5% sát thương chí mạng
    mỗi điểm (gốc ×2, áp cả đòn thường, chiêu và Siêu Giác Quan Ảnh Tu).
  - Bản Nguyên: +5% điểm chỉ số khi lên cấp (đột phá) mỗi điểm, phần lẻ
    tích lũy (banNguyenFrac bền file); lưu ý breakthrough_ok báo
    gainedPoints GỐC, phải đo bằng delta statPoints.
  - Ý Chí: +2% kháng khống chế (chậm/choáng, không tính độc) mỗi điểm,
    tối đa 75%; áp tại applyPlayerStatus (quái đánh trúng người chơi).
  - Bản Nguyên/Ý Chí KHÔNG cộng bằng điểm (allocate chặn); chỉ tăng qua
    nhiệm vụ ẩn + khảo hạch — CHƯA LÀM (GĐ145).
- Client: thẻ nhân vật thêm dòng chỉ số ẩn (giờ Đạo Quán + tiến độ cấp +
  6 chỉ số, khóa hiện 🔒, đã mở hiện nút +1 trừ điểm tự do theo giá).
  Reset chỉ số không hoàn điểm đã cộng vào chỉ số ẩn.
- Probe p144 (port 3357, env p144_env) ALL PASS (0 CRASH-GUARD): migration
  thanThuc 33 → minhMan 33 + maxMp 330; needMin LK 720 (Ngộ Tính 0) →
  360 (Ngộ Tính 100); thiền ở (700,150) mở cấp 1 +200, mở 2 cấp một lượt
  +600; allocate: Ngộ Tính 1 điểm, Bạo Kích 10 điểm, Bản Nguyên chặn,
  tier 0 chặn; crit sói 40 (Bạo Kích 100 + Bạo Thương 10: 16 × 2,5) vs đối
  chứng 16; Phúc Duyên 60 → đột phá Đại notice 100% (0,6 − 0,2 linh căn
  5 + 0,6); Bản Nguyên 10: đột phá tiểu +4 rồi +5 (lẻ dồn); am hiểu
  thetu_1 ≥ 100 sau 6 cast (Ngộ Tính 900) + cast cấp 1 sói −31 (30 × 1,02);
  Ý Chí 50 (trần 75%): đối chứng bị chậm, char Ý Chí kháng 185 > chậm 6
  trong 60s đứng chịu Thủy Triều Tinh ở bang_phong_coc; bền file
  (daoQuan tier, hiddenStats, skillMastery, minhMan) qua autosave +
  restart. GĐ144 local-only, CHƯA có zip mới.
- CHƯA LÀM: nhiệm vụ ẩn về tu luyện + khảo hạch tăng Bản Nguyên/Ý Chí
  (GĐ145); tẩy luyện
  đổi phe; screenshot trình duyệt dòng chỉ số ẩn trên thẻ.

## GĐ145 — NHIỆM VỤ ẨN TU LUYỆN → KHẢO HẠCH BẢN NGUYÊN/Ý CHÍ (29/10, probe p145 ALL PASS)
- Chỉ mở khi đạt cấp Đạo Quán 2 (cả dialog Sứ Giả lẫn quest_accept đều
  chặn: dialog ẩn hẳn, accept báo "chỉ mở khi đạt cấp Đạo Quán 2").
  Nhận/trả qua Sứ Giả Tông Môn (npc_sugia), thiện cảm yêu cầu 0.
- 6 nhiệm vụ (server/data/quests_gd145.json + mirror client
  quests_gd145_info.ts), làm lại được — trả xong nhận lại là có lượt
  roll mới (quest_claim xóa quest, nhận lại hoạt động như mọi quest):
  - Bản Nguyên: "Tọa Vong Ngộ Đạo" thiền Đạo Quán 10 giờ game (140 LT/
    25 Tu vi); "Phá Cảnh Liên Châu" đột phá 3 lần (320/60); "Lĩnh Ngộ
    Song Pháp" lĩnh ngộ xong 2 chiêu (320/60).
  - Ý Chí: "Bất Động Như Sơn" thiền Đạo Quán 20 giờ game (320/60);
    "Vạn Kiếp Bất Ma" đột phá 5 lần (650/120); "Tâm Như Chỉ Thủy"
    lĩnh ngộ xong 3 chiêu (650/120).
- Cơ chế tiến độ (3 loại mới, nối vào hook sẵn có, không chế riêng):
  daoquan = giờ Đạo Quán tích lũy kể từ lúc nhận (ghi startMin lúc
  accept, tick thiền trong khu cập nhật tiến độ); breakthrough = mỗi lần
  đột phá thành công +1 (hook trong applyBreak, tính cả Tiểu/Trung/Đại);
  learn = mỗi lần lĩnh ngộ xong 1 chiêu +1 (hook trong completeLearning,
  tính cả học online lẫn offline). Trả quest kiểm tra state done như
  mọi loại quest khác.
- Khảo hạch (roll lúc trả quest, TẠM 30%): trúng → +1 đúng chỉ số của
  quest đó (Bản Nguyên hoặc Ý Chí), trượt → notice "chưa thành công —
  tu luyện thêm rồi thử lại". Điểm cộng bền file qua persistPlayer của
  claim (roll đặt TRƯỚC persist, không sau). Không cộng bằng điểm tự do
  (đã chặn từ GĐ144), không giới hạn số lần thử.
- Probe p145 (port 3358, env p145_env, DAY 10s) ALL PASS (0 CRASH-GUARD):
  tier 1 dialog không hiện quest + accept chặn đúng cổng; tier 2 dialog
  hiện available; thiền Đạo Quán trả quest tỉ lệ thật (delta 0/1 + notice
  khảo hạch); white-box tỉ lệ 100% → Ý Chí +1, tỉ lệ 0% → Bản Nguyên +0
  (file quest khôi phục byte-identical sau white-box); đột phá 3 lần
  (chân Kim Đan — chân Luyện Khí bị kẹt bước Trung ở lần thứ 3, bài học
  probe: bước đột phá đích 4/7/13/16 là Trung, cần đan + trắc nghiệm);
  lĩnh ngộ 2 chiêu (LK thetu_3 tại Đạo Quán + TC thetu_4) → claim có roll;
  bền file (Ý Chí = 1, quest đã trả bị xóa, 2 chiêu đã học còn nguyên).
  GĐ145 local-only, CHƯA có zip mới.
- CHƯA LÀM: tẩy luyện
  đổi phe; screenshot trình duyệt dialog Sứ Giả hiện quest khảo hạch.

## GĐ146 — THANG TIÊN/MA (29/10, probe p146 ALL PASS)
- Thang song song mở khi chọn phe (cả đường ẩn lẫn đường thường đều leo
  được, không cần cảnh giới chính): Ma 5 cảnh giới × 3 tầng = 15 bước
  (Huyết Luyện, Nhập Ma, Ma Tướng, Ma Quân, Ma Tôn); Tiên 5 × 9 tầng =
  45 bước (Tiên Cơ, Địa Tiên, Thiên Tiên, Kim Tiên, Đại La). Tên cảnh
  giới theo tài liệu; số tầng TẠM (Ma ít tầng = nhanh/mạnh, Tiên nhiều
  tầng = chậm/bền).
- Khí phe (branchQi, bền đủ 3 điểm + payload): giết Tướng phe đối địch
  +50 (hook trong onMonsterKilled, chỉ khi quái có faction khác phe
  mình); trả nhiệm vụ nhánh (mọi quest có branchSource) +30. Tẩy luyện
  đổi phe sau này sẽ xóa thang + khí (chưa làm).
- Đột phá thang (socket branch_breakthrough, nút "✦ Đột phá thang" trên
  thẻ khi đã chọn phe): tốn 100 Khí/lượt (TẠM); Ma 50%/Tiên 70% (TẠM);
  thua liên tiếp +10%/lần, 3 lần thua liên tiếp thì lần sau chắc chắn
  (theo luật đột phá chính). Thất bại chia 3 mức như đột phá chính:
  nhẹ mất 30% Tu vi; trung bình mất 10 năm tuổi thọ; nặng — Ma chỉ mất
  thêm 20 năm tuổi thọ (KHÔNG mất căn cơ, đúng tài liệu), Tiên mất căn
  cơ (chỉ số gốc ×0,9, cộng dồn tối đa 3 lần, như đột phá chính).
- Bonus thang CHỈ cho đường nhánh ẩn (quyết theo luật GĐ143: đường thường
  chỉ có thân phận + quest, không buff): Ma ẩn +2% sát thương gây ra mỗi
  bước; Tiên ẩn +1% hồi phục +1% Tu vi mỗi bước. Nối vào đúng 3 hàm
  tuviMulOf/healMulOf/branchDmgMulOf nên mọi đường dmg/heal/tu vi đều
  ăn theo (đòn thường, chiêu, Phật Quang, bùa Lôi Kích, đan hồi, y_heal,
  thiền/bế quan/quest/offline). Đường thường leo thang vẫn hiện tên
  cảnh giới + bước + Khí trên thẻ, chỉ không có bonus sức mạnh.
- Client: thẻ phe thêm "Thang: <tên> (bước/max) · Khí: <n>" + nút đột
  phá thang (emit branch_breakthrough; kết quả về qua
  branch_breakthrough_result + notice).
- Probe p146 (port 3359, env p146_env) ALL PASS (0 CRASH-GUARD): chưa
  chọn phe bị chặn; thiếu Khí bị chặn; Ma leo bước 1 (tối đa 5 lượt nhờ
  bảo đảm chuỗi thua), mỗi lượt tốn đúng 100 Khí, notice "Huyết Luyện
  tầng 1"; Ma thất bại không mất căn cơ (chỉ mất Tu vi hoặc thọ nguyên);
  Ma ẩn sói 125 ở bước 1 vs 123 ở bước 0 (vatCong 200); Tiên heal 3091
  ở bước 1 vs 3060 đối chứng (dan_hoi_xuan, maxHp 5100); Tiên trả Q2 Tu
  vi +73 ở bước 1 vs +72 đối chứng; Ma thường leo bước 1 nhưng sói vẫn
  -16 (không buff); giết Tướng +50 Khí, trả quest nhánh +30 Khí; bền
  file (branchStep/branchQi). GĐ146 local-only, CHƯA có zip mới.
- Bài học probe (3 lần vấp mới PASS): (1) char đo máu thấp ngồi offline
  qua chân dài sẽ bị autosave ghi đè máu đầy — đo heal phải ngay sau
  restart; (2) char đo heal đứng ở bãi farm bị quái cắn trước khi uống
  đan (lệch đúng 4 và 17 máu) — đo trong làng, nơi không có quái;
  (3) đánh thường trúng quái GẦN NHẤT mọi loài — đo dmg phải khớp đúng
  id mục tiêu đã ghim, trượt thì thử lại.
- CHƯA LÀM: tẩy luyện đổi phe (xóa thang + khí); screenshot trình duyệt
  dòng thang + nút đột phá trên thẻ.

## GĐ147 — Gợi ý ẩn Đạo Quán + tẩy luyện đổi phe (29/10, probe p147 ALL PASS)
- Gợi ý ẩn Đạo Quán — KHÔNG có dấu hiệu chỉ dẫn, không popup hướng
  dẫn: chỉ hiện sau khi nhân vật đã đo linh căn, mỗi gợi ý đúng 1 lần
  duy nhất, phát hiện bằng cách chơi (đúng triết lý "ẩn mở qua quan
  sát trong thế giới"):
  + Ở lại tu luyện: lần đầu thiền/bế quan trong khu Đạo Quán → notice
    bia đá cổ bên Tụ Linh (ngồi đủ lâu sẽ mở "những khiếu huyệt trước
    nay chưa từng biết" — nhá hàng chỉ số ẩn, không spoil số).
  + Ra farm quái: lần đầu bước ra khỏi làng trên map nhà → notice vết
    kiếm cũ (đánh quái/nhặt đồ/làm nhiệm vụ cho thân thể cứng + túi đầy
    linh thạch, nhưng đi mà không tu tâm sớm muộn gặp bình cảnh).
  + Lựa chọn không vĩnh viễn: lần đầu tới gần cửa Đạo Quán (nơi học
    chiêu Luyện Khí) → mảnh giấy của tiền bối (ngồi một chỗ hay đi khắp
    thiên hạ đều thành đạo được; đường nào cũng có thể quay đầu).
  Cờ daoHint1/2/3 lưu trong flags (persistPlayer; cờ tự ghi khi phát
  hiện, không cần tương tác E). Chưa có sổ xem lại gợi ý đã tìm.
- Tẩy luyện đổi phe (luật tài liệu, trước đây CHƯA LÀM): socket
  branch_cleanse, cổng: đã chọn phe + đứng gần Sứ Giả (≤95px) + 1000
  Linh thạch (TẠM). Tác dụng: branch = null, branchQi/branchStep/
  branchFailStreak = 0, Lệnh Bài phe cũ tháo khỏi ô TOKEN (đồ vẫn giữ
  trong túi), trừ đúng 1000 LT, notice + branch_cleanse_result. Chọn
  lại bằng branch_choose như cũ (nguồn tự tính lại theo Luyện Hồn /
  Kim Đan; cờ chuỗi nhiệm vụ cũ giữ nguyên làm lịch sử). Client: nút
  "☯ Tẩy luyện đổi phe" cạnh nút đột phá thang, chỉ hiện khi đã chọn
  phe.
- Probe p147 (port 3360, env p147_env) ALL PASS (0 CRASH-GUARD): chưa
  đo linh căn thiền trong khu + ra farm đều không ra hint; đủ 3 hint
  đúng nội dung + chỉ hiện 1 lần (kiểm tra lại đúng tọa độ sau
  restart); tẩy luyện bị chặn khi chưa chọn phe / xa Sứ Giả / thiếu
  LT; tẩy xong branch + khí + thang + chuỗi thua về 0, trừ đúng 1000
  LT, Lệnh cũ tháo nhưng còn trong túi, chọn lại được phe Tiên nguồn
  ẩn; bền file (daoHint1/2/3, branch mới). Bài học: dữ liệu giả của
  probe phải đúng dạng thật — Lệnh Bài thiếu rarity làm boot sập ở
  spawnOfflineActor→calcGearStats (đồ thật luôn có rarity); linhCan
  thiếu elements làm client throw ở dòng linh căn và nuốt mất các dòng
  phe/Đạo Quán phía sau.
- Screenshot trình duyệt (nhân vật Ma ẩn, thang bước 3, Đạo Quán cấp
  1): thẻ hiện đủ dòng phe + thang + Khí, dòng Đạo Quán 8 giờ + 4 chỉ
  số ẩn có nút +1, nút đột phá thang + nút tẩy luyện — xem file
  probes/p147_shot.png. GĐ147 local-only, CHƯA có zip mới.

## GĐ148 — Sổ xem lại gợi ý Đạo Quán (29/10, probe p148 ALL PASS)
- Vấn đề GĐ147 để lại: notice gợi ý trôi qua là mất, không xem lại
  được. Sửa: characterPayload thêm daoHints (lọc từ flags theo thứ tự
  daoHint1/2/3, chỉ gồm gợi ý đã tìm; không đổi spawn/persist vì cờ
  đã bền sẵn từ GĐ147). Client: khối Đạo Quán thêm dòng "💡 Gợi ý
  Đạo Quán đã tìm: X/3" + nút Xem lại/Thu lại; bấm mở ra toàn văn các
  gợi ý đã tìm (bảng chữ tĩnh phía client, khớp từng chữ với notice
  server). Trạng thái mở/thu giữ trên dataset của chính phần tử
  (innerHTML dựng lại mỗi lần sync nên không giữ biến cục bộ được).
- Probe p148 (port 3362, env p148_env) ALL PASS (0 CRASH-GUARD):
  payload đúng cờ đã patch (1 + 3, không có 2, giữ thứ tự); chưa tìm
  thì rỗng; đầu-cuối thiền trong khu → notice → vào lại thấy daoHint1
  trong payload. Screenshot trình duyệt (JourA, 2/3 gợi ý): dòng sổ +
  toàn văn 2 gợi ý + nút Thu lại — xem file probes/p148_shot.png.
- Bài học probe: (1) splash là panel fixed nên offsetParent LUÔN null
  — kiểm tra nút thấy được phải dùng getBoundingClientRect, không dùng
  offsetParent; (2) hudName giữ chỗ "—" là chuỗi truthy — đừng dùng
  textContent trần làm bằng chứng đã vào game, phải loại trừ "—".

## GĐ149 — Ghi file nguyên tử, chống mất dữ liệu khi kill/deploy (29/10)
- Phát hiện khi chụp GĐ148: file characters.json của env probe bị cắt
  về 0 byte sau các lần chạy server bị kill — và đường load hỏng thì
  IM LẶNG về rỗng (catch → {}), tức cắt file = mất sạch nhân vật mà
  không báo gì. Nguyên nhân gốc: cả 4 file dữ liệu (characters,
  accounts, sessions, world) đều ghi trực tiếp bằng writeFileSync —
  kill đúng lúc đang ghi là cắt file. (Live Render dùng Atlas làm
  chính nên đỡ hơn, nhưng file vẫn là bản dự phòng + máy nhà chạy
  file thuần thì ăn đủ.)
- Sửa: helper atomicWriteFile (ghi file tạm cùng thư mục + fsync +
  rename — rename là nguyên tử trên cùng filesystem) thay cho cả 4
  chỗ ghi trực tiếp; load characters/accounts hỏng mà file còn dung
  lượng thì in cảnh báo to. Không còn writeFileSync trực tiếp nào vào
  4 file dữ liệu. Kiểm chứng: probe p148 chạy lại toàn bộ PASS trên
  code GĐ149 (nhiều lần restart + persist, file nguyên vẹn).
  GĐ148 + GĐ149 local-only, CHƯA có zip mới.

## GĐ150 — Bảng tên chữ thường + panel sổ gợi ý + hội thoại NPC liên tục (29/10)
- Bảng tên về chữ thường (theo ảnh feedback của Bảo): bỏ nền khung +
  padding ở cả 5 chỗ vẽ nhãn nổi — nhãn NPC làng, nhãn NPC chức năng
  thành phố, nhãn cổng bí cảnh, biển Bảng Treo Thưởng, biển Trận Dịch
  Chuyển. Thay bằng chữ thường + viền chữ tối cho dễ đọc trên mọi
  nền. Các nhãn vốn đã thường (linh mạch, đàn tế, điểm tài nguyên...)
  giữ nguyên.
- Sổ gợi ý dời khỏi thẻ sang panel riêng (thẻ đỡ bị chiếm không gian):
  thẻ chỉ còn dòng "💡 Gợi ý Đạo Quán đã tìm: X/3" + nút Xem lại; bấm
  mở panel #hintPanel (theo đúng hệ panel sẵn có + nút ✕ đóng) với
  toàn văn gợi ý đã tìm + dòng khóa cho gợi ý chưa tìm (không spoil:
  chỉ nhắc để ý những chỗ hay đi qua, cả trong lẫn ngoài làng).
- Hội thoại liên tục của NPC (chạy phía client, không tốn server):
  file mới client/src/npc_lines.ts — thoại theo vai trò + map: 16 NPC
  làng theo id (Trưởng Làng, Sứ Giả, Thợ Rèn, Lái Buôn, thương nhân,
  3 chủ tiệm, 7 sư phụ nghề), NPC thành phố theo role (Sứ Giả, Tiệm
  Đan, Tiệm Nguyên Liệu, thương nhân, trưởng lão), dân thường theo
  map (làng / thành / map nghề, có hương vị riêng theo từ khóa mapId
  như dược/thảo, thiết/khoáng, đan/lò, thú, trận, phù). Nội dung theo
  đúng 4 nguồn Bảo dặn: loại nhiệm vụ (bảng treo thưởng, hộ tống,
  nghề, nhiệm vụ ẩn, chọn phe), hint ẩn (nói bóng gió, không spoil
  số: ngồi thiền Đạo Quán lâu, đường nào cũng quay đầu được...),
  chuyện xung quanh và đời sống. Cổng bí cảnh không phải người nên
  không có thoại. Hiển thị: chữ thường không khung (cùng luật với
  bảng tên), hiện 4,5s rồi đổi câu sau ~11s (lệch pha theo hash id để
  không nói đồng loạt), chỉ NPC trong tầm nhìn + ≤520px, tối đa 8
  người cùng nói. Móc probe: window.tttDialogues() trả danh sách bong
  bóng đang hiện.
- Probe trình duyệt p150 (port 3363, env p150_env) ALL PASS: NPC nói
  (≥1 bong bóng), thoại đổi câu theo thời gian, panel sổ gợi ý mở đủ
  toàn văn 2 gợi ý và KHÔNG lộ gợi ý chưa tìm. Screenshot
  probes/p150_shot.png: bảng tên chữ thường, thẻ gọn, panel gợi ý.
  tsc vẫn đúng 4 lỗi cũ, không thêm lỗi mới. GĐ150 local-only, CHƯA
  có zip mới.

## GĐ151 — TIỆM THẢO DƯỢC BẢN THÀNH PHỐ (29/10, probe p151 + ảnh trình duyệt ALL PASS)

- GĐ140 mới có tiệm thảo dược ở làng; đợt này nối bản thành phố: mỗi
  thành phố có dân đều thêm 1 NPC "Chủ Tiệm Thảo Dược" CÓ BẰNG Thải
  Dược Sư (herbCert) — data GDD không có vai này nên server nối tay lúc
  boot (như boss GĐ130), đứng nối tiếp lưới NPC chức năng cạnh cổng
  thành. Tên riêng từng thành theo mẫu tên dân thành phố (ví dụ Thanh
  Vân Thành: Trần Sâm Ông). Tổng NPC 9002 → 9032 (+30).
- Ngoại lệ: Văn Uyển (map đọc sách của Nho tu) vốn KHÔNG có dân nào
  (không có data NPC) nên không có tiệm — giữ nguyên như cũ. Map nghề
  cũng không có tiệm thảo dược (đúng phạm vi "bản thành phố").
- Shop city_thao_duoc: CÙNG bảng giá với tiệm làng (mua Thảo Dược 5 /
  Linh Thảo 20 / Tiên Thảo 40 LT; bán lại 2 / 8 / 16 LT). Nói chuyện
  với chủ tiệm (phím E) → nút "Vào tiệm" như 2 tiệm thành phố cũ.
- Cổng bằng nâng cấp theo map: mua thảo dược ở tiệm thành phố thì
  server tra bằng của NPC chủ tiệm TRÊN MAP HIỆN TẠI của người chơi —
  đang ở làng mà cố mua tiệm thành phố (hoặc ngược lại sai map) đều bị
  chặn với thông báo chỉ người có bằng Thải Dược Sư mới được bán.
  Khoảng cách mua bán vẫn theo NPC chủ tiệm trên map (≤80px) như các
  tiệm thành phố khác.
- Client: sprite chủ tiệm = villager-b (cùng bộ tạm với chủ tiệm làng,
  chờ sprite riêng ở hàng đợi PixelLab GĐ121); có thoại liên tục riêng
  (pool shopthao trong npc_lines.ts: bằng Thải Dược, thảo hái từ vùng
  dược, giá như làng, gợi ý bái Thảo Lão học nghề Thải Dược).
- Cách test nhanh: dịch chuyển tới bất kỳ thành phố nào → đi lên khu
  NPC chức năng phía bắc cổng (hàng cuối) → gặp Chủ Tiệm Thảo Dược →
  E → Vào tiệm → mua/bán thảo dược giá như làng. Thử mua thảo ở Tiệm
  Đan thành phố: không có thảo trong bảng giá, không mua được.
- Probe p151 (port 3364) ALL PASS: cổng bằng chặn khi sai map; quét
  đủ 30/30 thành phố có dân — mỗi thành đúng 1 chủ tiệm; map nghề
  không có; chặn mua từ xa; nói chuyện mở đúng shop; mua đủ 3 loại
  thảo trừ đúng 5/20/40, bán lại +2; tiệm làng GĐ140 không hồi quy;
  file bền; 0 CRASH-GUARD. Probe trình duyệt p151_shot (port 3365)
  ALL PASS + 2 screenshot: chủ tiệm đứng cạnh người chơi, bảng tên
  chữ thường, nói đúng thoại shopthao, panel Tiệm Thảo Dược mở đủ
  3 loại thảo (probes/p151_shot1.png + p151_shot.png). tsc vẫn đúng
  4 lỗi cũ. GĐ151 local-only, CHƯA PUSH (chờ gộp vào zip sau GĐ137).
- PHÁT HIỆN NGOÀI PHẠM VI (chưa sửa, chờ Bảo chốt): goOffline (GĐ21)
  khi ngắt kết nối sẽ dời nhân vật về TỌA ĐỘ điểm nghỉ của làng
  (quanh 700,452) nhưng GIỮ NGUYÊN mapId — thoát game ở thành phố
  thì đăng nhập lại sẽ đứng ở tọa độ kiểu làng (≈624,452) ngay trong
  thành phố đó, không phải chỗ cũ cũng không phải Đạo Quán thật.
  Hai hướng sửa: (a) về hẳn Đạo Quán — đổi cả mapId về làng khi
  thoát; (b) nghỉ tại chỗ — đang ở map nào thì giữ nguyên tọa độ
  map đó, chỉ nhân vật ở làng mới về điểm nghỉ Đạo Quán.

## GĐ152 — ĐIỂM NGHỈ OFFLINE THEO MAP ĐANG ĐỨNG (29/10, probe p152 ALL PASS)

- Lỗi cũ (phát hiện ở GĐ151): thoát game ở map khác thì nhân vật bị dời
  về TỌA ĐỘ điểm nghỉ của làng (~700,452) nhưng giữ nguyên mapId →
  đăng nhập lại đứng ở tọa độ lạ ngay trong thành phố đó. Bảo chốt
  hướng: KHÔNG kéo về Đạo Quán làng tân thủ nữa (game lớn dần, người
  chơi sống ở các thành/map cao cấp), nghỉ theo map đang đứng.
- Luật mới (goOffline): đang ở LÀNG thì giữ nguyên như cũ (về điểm
  nghỉ Đạo Quán / Thanh Phong Môn theo nhà, rải chỗ theo thứ tự);
  đang ở BẤT KỲ map nào khác (thành phố, map nghề, map quái, bí
  cảnh...) thì nghỉ ngay tại ĐIỂM CỔNG DỊCH CHUYỂN CỦA CHÍNH MAP ĐÓ
  (điểm người chơi đáp tới, vốn luôn trống), rải chỗ theo số người
  đang ngủ cùng map (ô đầu −76px, ô sau +38px... như cách rải ở làng).
  Vào lại game là đứng đúng điểm nghỉ của map đó.
- Chưa làm đợt này (để giai đoạn sau nếu Bảo muốn): dựng nhà Đạo Quán
  thật ở mỗi thành phố, và tính giờ Đạo Quán ẩn (chỉ số ẩn GĐ144) khi
  thiền tại điểm nghỉ thành phố — hiện giờ thiền tính giờ ẩn vẫn chỉ
  ở Đạo Quán làng như cũ.
- Cách test nhanh: dịch chuyển tới một thành phố → đi xa khỏi cổng →
  thoát game → vào lại: nhân vật phải đứng ở khu vực cổng của thành
  đó (không phải góc lạ, không bị kéo về làng). Thoát ở làng thì vẫn
  về sân Đạo Quán như trước.
- Probe p152 (port 3366) ALL PASS: thoát ở Thanh Vân Thành sau khi
  đi xa điểm tới >250px → file giữ mapId thành phố + tọa độ đúng ô
  nghỉ ở cổng thành, đăng nhập lại đứng đúng chỗ đó; map nghề Dược
  Cốc và map farm Băng Phong Cốc cùng luật theo cổng của chính map;
  ở làng vẫn về điểm nghỉ Đạo Quán (idx 1: 662,452); hai người ngủ
  cùng một thành phố được rải 2 ô khác nhau (−76 và −38); log ghi
  "nghỉ tại <tên map>"; 0 CRASH-GUARD. Lần chạy đầu probe tính sai
  kích thước map (MapData không mang w/h, phải lấy theo bảng
  MAP_SIZE_BY_CAT) — file nhân vật khi đó đã cho thấy server ghi
  đúng tọa độ nghỉ ở cả 3 loại map; sửa probe xong chạy lại ALL PASS.
  GĐ152 local-only, CHƯA PUSH (chờ gộp vào zip sau GĐ137).

## GĐ153 — RÀ SOÁT 5 CƠ CHẾ CŨ CHƯA TỪNG KIỂM CHỨNG (29/10, probe p153 ALL PASS)

- Đợt này không thêm tính năng — đem 5 cơ chế đã code từ các giai đoạn
  trước mà chưa từng có probe ra kiểm chứng toàn bộ. Kết quả: cả 5 đều
  chạy đúng như thiết kế, KHÔNG phát hiện lỗi game (mọi lần probe đỏ
  đều là lỗi của chính probe, đã sửa và chạy lại xanh toàn bộ).
- 1) Tiên Quang (kỹ năng phe Tiên, GĐ143): sát thương đúng công thức
  1.2 × (công + 10) qua giáp (144 lên quái def 0, 133 lên golem
  def 8), trừ đúng 20 Chân nguyên, tự hồi đúng 10% máu tối đa.
  (Ma Diệm đã đo ở GĐ143; nay phe Tiên cũng đã đo.)
- 2) Siêu Độ (Phật Tu, GĐ103): bào Hấp Huyết Quỷ (1350 máu ở Cửu U)
  xuống dưới 10% rồi tung Phật Quang → quỷ biến mất, Công Đức +500,
  KHÔNG rớt đồ, không tính hạ quái — và quỷ VẪN hồi sinh sau ~30 giây
  như quái thường. Lưu ý khi test tay: ngưỡng là DƯỚI 10% (dưới 135
  máu); quỷ hút máu nên có thể hồi qua ngưỡng — bào xuống ~110 cho
  chắc.
- 3) Thuyết Pháp (Phật Tu, GĐ103): đứng yên ở thành phố tích +10
  Công Đức/giây; di chuyển là ngắt; bị đánh trúng cũng ngắt — đã
  kiểm chứng bằng cách gọi Tu Sĩ Thù Địch (nhiệm vụ đối đầu) ra đánh
  ngay giữa thành phố: trúng đòn là buổi thuyết pháp dừng, Công Đức
  ngừng tăng.
- 4) Cổng thuần hóa (Thú Sư, GĐ137): thuần hóa quỷ đang tàng hình →
  "Không thấy con thú đó."; thuần hóa trùm map → "Không thuần hóa
  được trùm." (cổng này chạy trước cả cổng khoảng cách/máu); sói
  thường đầy máu → chặn ở cổng "dưới 50% máu".
- 5) Roll biến dị 10 hệ (Pháp Tu, GĐ107): kiểm chứng kiểu hộp trắng —
  tạm nâng tỉ lệ roll lên 100% cho 30 nhân vật Pháp Tu lên Trúc Cơ:
  cả 30 lần đều ra hệ thuộc pool 10 hệ (Lôi/Phong/Băng/Nham/Độc/
  Quang/Ám/Huyết/Thời Gian/Không Gian), đủ mặt cả 3 hệ mới; khôi
  phục tỉ lệ gốc 5% (kiểm tra md5 file khớp nguyên trạng) thì 20
  nhân vật tiếp theo gần như không ai biến dị.
- Cách test tay gợi ý: Phật Tu ra Cửu U bào quỷ xuống ~110 máu rồi
  Phật Quang (xem notice Siêu độ + Công Đức nhảy +500); Phật Tu vào
  thành phố bật Thuyết Pháp rồi thử đi bộ (ngắt) và nhận nhiệm vụ
  Đối đầu Tu Sĩ Thù Địch ra đánh nhau giữa thành (ngắt vì bị đánh).
- GĐ153 local-only, KHÔNG đổi code game, CHƯA PUSH (không có gì để
  gộp vào zip — chỉ có thêm tài liệu test này).

## GĐ154 — BIẾN DỊ LINH CĂN ROLL LÚC ĐO, THEO TỪNG HỆ (29/10, probe p154 + p154b ALL PASS)

- Thay đổi LỚN theo chốt của Bảo (29/10): biến dị KHÔNG còn roll 1
  lần 5% khi lên Trúc Cơ nữa. Nay biến dị tính luôn vào LÚC ĐO LINH
  CĂN ở Đạo Quán: mỗi hệ trong linh căn của Pháp Tu có 2% cơ hội
  (TẠM) "nở" thêm 1 hệ biến dị trong pool 10 hệ (Lôi/Phong/Băng/
  Nham/Độc/Quang/Ám/Huyết/Thời Gian/Không Gian), rút không trùng.
  Linh căn càng nhiều hệ càng có cơ hội gom nhiều biến dị — ngũ
  linh căn trúng cả 5 hệ là "tay vàng". Chỉ Pháp Tu mới biến dị
  (như tài liệu gốc — Bảo vừa chốt lại).
- Vì roll ngay từ lúc đo, rider của hệ biến dị (hiệu ứng cộng thêm
  khi tung chiêu gây sát thương) chạy NGAY TỪ LUYỆN KHÍ — người
  trúng biến dị thấy mình mạnh sớm vì skill tác dụng mạnh hơn hệ
  thường, đúng ý Bảo. Đo trúng sẽ có thông báo lớn "✦ LINH CĂN
  BIẾN DỊ" + dòng biến dị hiện ngay trong thông báo đo linh căn và
  trên thẻ nhân vật ("✦ Biến dị: Lôi, Băng"...).
- Người chơi cũ: ai từng có biến dị kiểu cũ (roll ở Trúc Cơ) được
  GIỮ NGUYÊN, tự chuyển sang dạng mới khi vào game; ai đã đo linh
  căn rồi mà chưa từng có biến dị sẽ được ROLL BÙ 1 lần theo luật
  mới (2%/hệ) khi vào game; ai chưa đo thì roll tự nhiên lúc đo.
  Đột phá lên Trúc Cơ từ nay không roll biến dị nữa.
- Trang bị: các hệ biến dị trong linh căn đều tính là hệ người
  chơi đang có khi xét mặc trang bị theo hệ (trước đây chỉ tính
  hệ biến dị đầu tiên kiểu cũ).
- Đã kiểm chứng bằng probe p154 (cổng 3368) + p154b (cổng 3369,
  chạy lại 2 chân đột phá/rider sau khi sửa lỗi harness của chính
  probe): đo ở tỉ lệ hộp trắng 100% → Pháp Tu ra đủ số biến dị =
  số hệ trong linh căn, thuộc pool, không trùng; Thể Tu đo không
  có biến dị; migrate người cũ giữ đúng hệ Lôi; roll bù người cũ
  ra biến dị; đột phá LK9→TC thành công ở tỉ lệ 100% vẫn KHÔNG
  sinh biến dị (cả payload lẫn file); rider Ám (hút 15% sát thương
  thành máu) chạy ngay ở Luyện Khí tầng 1 — tung chiêu dmg 70, hồi
  máu biến dị 11, trừ đúng 12 máu bị cắn trong cửa sổ đo, delta
  khớp tuyệt đối; tỉ lệ thật 2%/hệ: 10 người đo liên tiếp 0 biến
  dị (đúng kỳ vọng hiếm); biến dị bền qua restart; 0 CRASH-GUARD.
- Cách test tay gợi ý: tạo nhân vật Pháp Tu mới, ra Đạo Quán đo
  linh căn — đa số sẽ không có biến dị (tỉ lệ 2%/hệ là hiếm thật);
  nếu trúng sẽ thấy thông báo biến dị ngay lúc đo và dòng "✦ Biến
  dị" trên thẻ nhân vật, tung chiêu Luyện Khí đã có hiệu ứng rider.
- GĐ154 local-only, CHƯA PUSH (sẽ gộp vào zip sau zip GĐ131–137
  cùng GĐ138–153).

## SỬA LỖI CHIỀU 29/10 — 4 lỗi TypeScript + nút Thuần Hóa mất tích

- 4 lỗi TypeScript trên máy Bảo (ảnh chụp màn hình VS Code) đã sửa
  hết, `tsc` sạch hoàn toàn, build lại bình thường. Ba lỗi là chuyện
  kiểu dữ liệu trong code (forgeMeta/forgeStock + sprite của thú
  thuần hóa dùng Image thay vì Sprite).
- Lỗi thứ tư đào ra một BUG THẬT chôn từ GĐ137: nút "🐾 Thuần Hóa"
  KHÔNG BAO GIỜ hiện cho Thú Sư — client đọc nghề từ dữ liệu tick
  (vốn không chứa nghề) thay vì từ hồ sơ nhân vật. Đã sửa: từ nay
  nhân vật có nghề Thú Sư (nghề chính hoặc nghề phụ thứ hai) sẽ
  thấy nút Thuần Hóa trên HUD như thiết kế.
- Cách test tay: vào bằng nhân vật Thú Sư → nút 🐾 Thuần Hóa phải
  hiện trên thanh HUD.

## RÀ SOÁT ĐỢT 2 — 4 cơ chế còn lại chưa từng kiểm chứng (29/10, probe p155 + p155b + p155c)

- Đọc sách Nho Tu BỊ NGẮT khi bị đánh (điểm duy nhất còn thiếu của
  GĐ105 sau GĐ153): cho 2 nhân vật đấu tay đôi (duel) ngay tại điểm
  đọc sách trong Văn Uyển — Hạo Nhiên đang tăng thì đứng yên, có
  thông báo "📖 Đọc sách bị ngắt vì bạn bị đánh." (Lưu ý theo lời
  Bảo: trong Văn Uyển vốn không có quái, đọc sách ở đó là an toàn
  tuyệt đối; đọc ở nơi khác mới có rủi ro — đúng thiết kế.)
- Cổng thuần hóa với quái THỬ THÁCH (trial): Thú Sư thuần hóa quái
  gọi ra bằng nhiệm vụ đấu tay đôi → bị chặn, quái còn nguyên,
  không có thú. Thông báo hiển thị là "Không thuần hóa được trùm."
  vì quái thử thách mang cờ trùm thử thách nên cổng trùm chặn
  trước cổng trial — kết quả đúng như luật (không thuần hóa được
  quái nhiệm vụ/thử thách).
- Phúc Duyên (chỉ số ẩn Đạo Quán) mở rương: nhân vật Phúc Duyên 250
  mở rương C → nhận CHẮC CHẮN 2 món trang bị thưởng thêm (mở được
  2 món ⚔️), nhân vật đối chứng Phúc Duyên 0 → 0 món thưởng. Đúng
  công thức: mỗi 100 điểm = +1 món chắc chắn (trần +2), phần lẻ
  roll thêm theo %.
- May mắn Luyện Hồn (đường ẩn, GĐ142): hệ số trong hồ sơ nhân vật
  đúng 1.15 (đối chứng 1.0); đo thống kê 200 kill/mẫu bằng tồn kho
  thực nhận: tỉ lệ rơi của người Luyện Hồn cao hơn đối chứng rõ
  rệt (1.71 món/kill so với 1.57 trên cùng phương pháp đo — cả hai
  đều cao hơn bảng rơi sói gốc vì đòn đánh lan sang dơi/golem gần
  đó, nhưng phép so sánh cùng điều kiện nên kết luận đứng vững).
  Lần đo đầu đếm đồ rơi trên mặt đất qua tick bị hụt nặng (đồ bị
  nhặt ngay trong cùng tick) — đã làm lại bằng tồn kho + quét nhặt
  sạch, số mới là số tin được.
- Cả 4 cơ chế đều ĐÚNG như thiết kế, không phải sửa code game.

## GĐ155 — SIÊU ĐỘ THÀNH KỸ NĂNG RIÊNG, DÙNG CHO MỌI ĐỐI TƯỢNG (29/10, probe p156 ALL PASS)

- Theo hướng Bảo nêu 29/10: Siêu Độ tách khỏi Phật Quang thành
  công pháp riêng của Phật Tu — bấm nút "🕯️ Siêu Độ" trên HUD
  (cạnh nút Thuyết Pháp). Phật Quang từ nay là chiêu sát thương
  thuần như cũ, không còn nhánh siêu độ ẩn bên trong.
- Siêu Độ tự chọn ĐỐI TƯỢNG GẦN NHẤT trong tầm 300px và tác dụng
  theo loại đối tượng (mọi số TẠM): tốn 20 Chân nguyên, hồi chiêu
  5 giây — chỉ tốn khi thật sự có tác dụng, chỗ vắng sẽ báo "Không
  có đối tượng nào trong tầm Siêu Độ." và không tốn gì.
  - Quái dưới 10% máu → SIÊU THOÁT: tan biến, không rớt đồ, không
    tính hạ gục nhưng VẪN tính tiến độ nhiệm vụ diệt quái; quái
    thường +50 Công Đức, riêng Hấp Huyết Quỷ vẫn +500 Công Đức
    như luật cũ.
  - Quái còn khỏe → chịu sát thương phật pháp (cùng công thức
    Phật Quang), +10 Công Đức.
  - Người chơi khác → hồi 15% máu tối đa, +20 Công Đức (người
    được hồi nhận thông báo; đầy máu thì không tác dụng).
  - Thú/đồng hành/hộ tống → hồi 20% máu tối đa, +10 Công Đức.
  - NPC → +2 thiện cảm với NPC đó, +10 Công Đức.
  - Điểm tài nguyên ĐÃ HÁI hôm nay → cỏ cây/mỏ mọc lại, hái tiếp
    được ngay trong ngày, +15 Công Đức.
  - Không dùng lên được: quái đang ẩn thân, ảo ảnh, quái thử
    thách/nhiệm vụ, quái bí cảnh khác cõi.
- Đã kiểm chứng probe p156 (cổng 3371) ALL PASS: sát thương đúng
  công thức 122 lên Thạch Quái; siêu thoát dưới 10% máu cho +50,
  không rớt đồ, nhiệm vụ 4/5 → hoàn thành; Phật Quang lên quái
  <10% nay là hạ gục thường (hết nhánh ẩn); quỷ Cửu U siêu thoát
  +500; hồi đồng đội đúng +165 (15% của 1100 máu); NPC +2 thiện
  cảm; node hái rồi mọc lại hái tiếp được; lớp khác bị chặn;
  0 CRASH-GUARD.
- Cách test tay gợi ý: Phật Tu đứng cạnh Thạch Quái còn khỏe bấm
  Siêu Độ (thấy sát thương + Công Đức nhảy ít), bào quái xuống
  sắp chết rồi bấm lại (quái tan biến, Công Đức nhảy nhiều); đứng
  cạnh bạn thiếu máu bấm Siêu Độ để hồi cho bạn; hái 1 điểm thảo
  dược rồi siêu độ lên đúng điểm đó để hái lại.
- GĐ155 local-only, CHƯA PUSH (gộp vào zip sau zip GĐ131–137).

## GĐ156 — THUYẾT PHÁP CÓ KHÁN GIẢ + GIỚI HẠN MỖI NGÀY (29/10, probe p157 + p157b ALL PASS)

- Theo yêu cầu của Bảo 29/10: khi Phật Tu thuyết pháp ở thành
  phố, NPC trong vòng ~600px TỰ ĐI BỘ TỚI NGHE, đứng thành vòng
  quanh người thuyết; thuyết xong thì ai về chỗ nấy (client đã
  nối: hình NPC di chuyển thật trên màn hình, bong bóng thoại và
  điểm tương tác E đi theo vị trí sống của NPC).
- Công Đức không còn phẳng 10/giây: nay = 10 + 2 × số người đang
  nghe (người nghe = NPC đứng trong ~400px), tối đa tính 30
  người → trần 70 Công Đức/giây ở quảng trường đông. Mọi số TẠM.
  Người mới vào thành giữa buổi thuyết cũng thấy NPC đang đứng
  nghe đúng vị trí.
- GIỚI HẠN MỖI NGÀY: mỗi ngày game chỉ thuyết pháp được tổng
  cộng 5 PHÚT THẬT (TẠM) — chạm trần là tự dừng kèm thông báo,
  trong ngày không bắt đầu lại được; qua ngày mới lại thuyết
  tiếp. Thời gian đã thuyết lưu bền theo nhân vật.
- Đã kiểm chứng probe p157 + p157b (cổng 3374/3375): 47 NPC rời
  chỗ gốc >50px tụ về quanh người thuyết ở Thanh Vân Thành; tốc
  độ Công Đức đo thật 70.4/giây tại 47 người nghe (trần 30 →
  kỳ vọng 70) và 59.6/giây tại 25 người nghe (kỳ vọng 60) — bám
  đúng công thức ở cả hai điểm đo; khán giả vành ngoài tăng từ
  9 → 25 người sau khi đi bộ tới; dừng thuyết → 47/47 NPC về
  đúng chỗ cũ; vá sẵn 299.5/300 giây → thuyết tự dừng + chặn mở
  lại trong ngày; ở làng vẫn bị chặn như luật cũ; 0 CRASH-GUARD.
- Cách test tay gợi ý: Phật Tu ra quảng trường thành phố bấm
  Thuyết Pháp, đứng yên xem dân từ từ kéo tới vây quanh và Công
  Đức nhảy nhanh dần; đi bộ 1 bước là ngắt và dân tản về chỗ cũ.
- GĐ156 local-only, CHƯA PUSH (gộp vào zip sau zip GĐ131–137).

## GĐ157 — BẢO CHỐT TÊN 9 ĐƯỜNG ẨN + VŨ KHÍ NHO TU "NGÔN LINH" (29/10)

- Danh hiệu đường ẩn (viên mãn/Luyện Hồn/Nhập Đạo) nay đủ cả 9
  lớp theo chốt của Bảo: Phật = Thánh tăng, Nho = **Văn Thánh**
  (người truyền bá học thức), Y = Thần y, Kiếm = **Kiếm Thánh**
  (đổi từ Kiếm tâm), Thể = **Võ Vương** (đổi từ Võ tông sư),
  Pháp = **Đại Thiên Sư**, Cốt = **Khô Lâu Vương**, Quỷ =
  **Minh Thần Đế**, Ảnh = **Dạ Ảnh Thần Minh**. Tên hiện trên
  thẻ nhân vật khi nhân vật đi đường ẩn. Cơ chế đường ẩn vốn đã
  chạy cho cả 9 lớp từ GĐ141–142, nay chỉ bổ sung tên.
- Vũ khí trang bị của Nho Tu: "Độc Thơ" đổi thành **Ngôn Linh**
  — đọc chữ thành vũ khí, đúng chất Nho Tu (2 loại còn lại giữ
  nguyên: Bút Phép, Quyển Trúc). Đồ đã rèn mang tên cũ không
  bị ảnh hưởng gì ngoài tên hiển thị của loại vũ khí khi rèn mới.
- Sprite PixelLab (Thợ Rèn, icon trang bị, Cốt Vương đội vương
  miện, Quỷ Hồn): spec đã sẵn đủ 4 bản (kể cả 2 spec mới viết
  cho pet), nhưng API PixelLab vẫn báo hết lượt (40/40, credits
  0) khi thử vẽ ngày 29/10 — lượt miễn phí chưa nạp lại. Khi nào
  tài khoản có lượt, chỉ cần báo là vẽ + nối vào game ngay.
  Trong lúc chờ, game vẫn dùng sprite tạm như cũ.

## GĐ158 — SPRITE VẼ BẰNG CÔNG CỤ CỦA CLAUDE (29/10, CHỜ BẢO DUYỆT MỚI NỐI VÀO GAME)

- Bối cảnh: PixelLab hết lượt trial (40/40). Tra bảng giá: gói
  free sau trial còn 5 lượt vẽ CHẬM mỗi ngày nhưng chỉ bấm được
  trên web (API vẫn báo hết); gói trả phí rẻ nhất $12/tháng.
  Bảo chốt: vẽ bằng công cụ ảnh của Muse trước.
- Đã vẽ đủ 4 mục tồn của hàng chờ GĐ121/GĐ157, lấy sprite sẵn
  trong game làm ảnh mẫu style: Thợ Rèn (tạp dề nâu, cầm búa),
  Cốt Vương (vương miện vàng, choàng đỏ, cốt kiếm — khác hẳn
  Cốt Binh), Quỷ Hồn (ma nữ tóc đen, áo trắng, đuôi khói lơ
  lửng), tấm 8 icon trang bị (áo/quần/nón/choàng/giày/trâm/
  nhẫn/lệnh bài).
- Đã xử lý xong: tách nền, dọn mảnh vụn, thu đúng khung game
  (Thợ Rèn 96×96 nội dung cao 68 như mọi NPC; Cốt Vương + Quỷ
  Hồn 128×128; icon 64×64). File thành phẩm nằm ở
  `~/workspace/asset-src/claudegen/final/` (kèm preview_finals.png
  và script process_sprites.py để xử lý lại khi cần).
- CHƯA nối vào game: chờ Bảo duyệt ảnh (luật cũ: duyệt xong mới
  nối). Khi duyệt: Thợ Rèn thay sprite dân làng mượn tạm
  (SPRITE_SETS 'blacksmith' + NPC_SPRITE_SET npc_ren), Cốt
  Vương/Quỷ Hồn thay sprite mượn của quái ở nhánh petMon, 8 icon
  đè lên bộ icon vẽ code tạm GĐ120 (giữ bản sao lưu).
- ĐÃ NỐI VÀO GAME (Bảo duyệt 29/10 18:33): bộ blacksmith đủ 24
  khung (1 ảnh mặt trước cho mọi khung, NPC đứng yên tại lò) vào
  `client/public/sprites/blacksmith/` + SPRITE_SETS thêm
  'blacksmith' + npc_ren trỏ sang 'blacksmith'; Cốt Vương/Quỷ
  Hồn vào `sprites/monsters/cot_vuong.png` + `quy_hon.png`
  (MON_SPRITE thêm 2 khóa chỉ để nạp texture) và petMon trỏ
  sang sprite riêng; 8 icon gear đè lên bộ tạm (bản tạm đã sao
  lưu ở `~/workspace/asset-src/gear_placeholder_backup/`).
  tsc 0 + vite build OK. Probe ảnh p158 (port 3376) ALL PASS:
  Thợ Rèn hiện đúng sprite tạp dề nâu + nhãn "Thợ Rèn — Rèn
  trang bị" giữa quảng trường, kèm thoại lò rèn. Cốt Vương/Quỷ
  Hồn + icon gear: kiểm chứng bằng code/build (đường nạp texture
  y hệt quái thường), Bảo test tay khi triệu hồi bạn đồng hành
  và mở tab Trang bị. GĐ158 local-only, CHƯA PUSH (gộp zip sau).

## GĐ159 — TỈ LỆ THẬT CHO QUÁI + VẬT TRIỆU HỒI TO HƠN (29/10, Bảo yêu cầu)

- Quái hoang nhỏ lại theo cỡ thật so với người chơi (hiện ~57px),
  trước đây mọi loài đều khổng lồ ~104–114px: MON_BASE_H mới —
  họ sói 77 (Sói Xám hiện ~38px), họ dơi 49 (Dơi Đen ~30px), họ
  thạch 92 (Thạch Quái ~80px, Khôi Lỗi ~88px), họ người 65 (Kiếm
  Ma/Cốt Binh ~51–57px, ngang người chơi). Tỉ lệ tương đối giữa
  các loài (vis.scale, khôi lỗi ×1.15) giữ nguyên nên loài khổng
  lồ vẫn khổng lồ (Băng Tinh Cự Nhân ~136px, Hỗn Độn Thú ~135px).
  Tính chung qua monSpriteScale/monBaseForKind trong main.ts.
- Thú thuần hóa (Thú Sư) dùng cùng công thức — ngang cỡ đồng
  loại hoang dã (trước cố định cao 60px khung).
- Ngược lại, Cốt Vương/Quỷ Hồn TO LÊN vì là vật triệu hồi: khung
  64 → 84px, hiện ~74px ≈ 1,3× người chơi.
- Kiểm chứng: tsc 0 + build OK; probe ảnh p159 (port 3377) ALL
  PASS — ảnh tây: sói nhỏ hơn hẳn người chơi, dơi bé xíu; ảnh
  đông: Huyết Lang cỡ chó, Kiếm Ma cao ngang người chơi, thạch
  quái vẫn khổng lồ ở mép khung. Cốt Vương/Quỷ Hồn mới kiểm
  chứng bằng code/build — Bảo test tay khi triệu hồi. GĐ159
  local-only, CHƯA PUSH (gộp zip sau zip GĐ131–137).

## GĐ160 — MỞ NGUYÊN ANH: ĐỘT PHÁ + Ô CHIÊU 7 + NGHỀ THỨ BA (29/10, probe p160 ALL PASS)

Theo bảng mở khóa của tài liệu: Nguyên Anh (9 tầng) = ô công pháp
thứ 7 + nghề phụ cấp 3 + thú cưỡi; thưởng đột phá "tăng mạnh toàn
bộ chỉ số". Đợt này làm 3/4 (thú cưỡi chờ Bảo chốt thiết kế riêng):
- Đột phá KD9 → NA theo mẫu Đại: cần **Đan Hóa Anh** (tên TẠM —
  tài liệu không đặt tên; Đan Sư luyện: 50 Nanh Sói + 10 Da Quỷ +
  500 LT, tỉ lệ 45%, cần cấp nghề 5 — số TẠM; tiệm bán 5000/mua
  lại 2000 — TẠM) + thắng **Thiên Kiếp Ảnh** (tên TẠM) ở sân Đạo
  Quán: HP = tinh anh bước 27 ×10 ≈ 26.660, chiêu ×2.4, HP ≤ 50%
  phân thân 2 Thiên Kiếp Phân Thân, client nhuộm xanh kiếp. Tỉ lệ
  như Đại (60% + phụ trợ, thua có hậu quả như cũ). Thưởng: +18
  điểm chỉ số (TẠM, thang 12→15→18) + 150 năm thọ (TẠM, 50→100→150).
- Trong Nguyên Anh chỉ có tiểu cảnh (+6 điểm, thang 3/4/5/6);
  NA9 bấm đột phá báo "Đột phá Hóa Thần chưa mở".
- Ô công pháp thứ 7 khi đạt Nguyên Anh (server + client khớp nhau).
- Nghề thứ ba: trần nghề = Nguyên Anh thì 3 (mọi người lên NA đều
  học được nghề 3 — kể cả chưa đi đường Nhập Đạo; Nhập Đạo vẫn cho
  nghề 2 sớm từ Kim Đan). job3 nối đủ: learn_job + bái sư lấp ô
  trống đầu tiên, jobOf tính cả 3 nghề (chế tạo/bố trận/tự rèn/
  thuần hóa đều dùng được nghề 3), bền qua persist + actor offline,
  panel Nghề hiện nghề thứ ba + mục học thêm khi đã Nguyên Anh.
- Probe p160 (port 3378) ALL PASS 17 chân: cổng đan đúng tên, boss
  đúng tên/HP, đột phá thành công (lần 2 ở lượt chạy đầu — có 1 lần
  thua trung bình −10 thọ đúng luật), +18 điểm, +150 thọ ròng theo
  số lần thua, ô 7, tiểu cảnh +6, chặn Hóa Thần, học/chế nghề 3,
  chặn nghề 4, job3 bền trong file, 0 CRASH-GUARD.
- CHƯA LÀM: thú cưỡi (tài liệu chỉ ghi từ khóa, không có thiết kế
  chi tiết — chờ Bảo chốt phương án). GĐ160 local-only, CHƯA PUSH.

## GĐ161 — THÚ CƯỠI: MUA Ở TRẠI / THUẦN HÓA HỘ / TRỨNG ẤP (29/10, probe p161 + p161_shot ALL PASS)

Theo ý Bảo (29/10 tối): thú cưỡi lấy ở map luyện thú sư, nhờ Ngự
Thú Sư thuần hóa hộ, hoặc mua trứng tự ấp hên xui. Mở từ Nguyên Anh.
- Điểm bán: NPC **Mã Vân — Chủ Trại Ngự Thú** ở **Ngự Thú Sơn Trang**
  (nói chuyện → nút "Vào trại"). Ba đường sở hữu:
  1. **Mua thẳng** (có ngay, tốc độ chuẩn): Huyền Quy ×1,3 —
     15.000 LT; Linh Mã ×1,5 — 30.000; Thanh Vân Hạc ×1,75 — 80.000.
  2. **Đặt thuần hóa hộ**: trại bắt thú hoang thuần sẵn, chờ ngày
     game rồi tới trại nhận — Lâm Trư ×1,35 (7.000, 1 ngày), Sói
     Xám ×1,4 (8.000, 1 ngày), Huyết Lang ×1,5 (18.000, 2 ngày),
     Thiên Lôi Thú ×1,65 (35.000, 3 ngày). Tốc độ từng con hên xui
     ±10%. (Bản người chơi bán cho người chơi chờ hệ thống giao
     dịch — chưa có; bản này NPC trại đóng vai người thuần hóa hộ.)
  3. **Trứng Linh Thú** 5.000 LT: mua ở trại → Túi đồ bấm Dùng để
     ấp → 1 ngày game sau mở panel cho nở. Hên xui: 15% nở ra con
     KHÔNG thuần hóa được (bỏ chạy mất); ra loài theo tỉ lệ sói/lâm
     trư/huyết lang/linh mã/thiên lôi/vân hạc, tốc độ ±10%.
- Cưỡi: panel Thú Cưỡi (Menu → 🐴 Thú cưỡi) — tối đa 3 con (TẠM);
  lên lưng tăng tốc chạy theo hệ số của con thú (không cộng dồn
  ngự kiếm — lấy hệ số cao hơn). Ra đòn/tung chiêu là tự xuống
  thú; bị đánh trúng cũng bị hất xuống. Phóng sinh có hỏi lại.
- Sprite: Linh Mã/Huyền Quy/Thanh Vân Hạc vẽ bằng công cụ của
  Muse (thư mục sprites/mounts/), loài hoang dùng lại sprite
  quái. Người chơi hiện trên lưng thú, lật hình theo hướng chạy.
- Thành tựu "Thú cưỡi" (nhóm Linh Thú) đã nối thật (đếm số loài
  đã sở hữu; mốc 1/3/6 đạt được với 7 loài hiện có, mốc 10 chờ
  thêm loài sau). Mọi con số trong đợt này đều TẠM.
- Kiểm chứng: probe p161 (20 chân: cổng Nguyên Anh, cổng khoảng
  cách trại, mua/trừ tiền đúng, đo tốc độ cưỡi ≈ ×1,5, ra đòn tự
  xuống, phóng sinh, đặt thuần + nhận sau ngày game, trứng nở ra
  thú thật, bền trong file) + p161_shot (đi đường UI thật: panel
  liệt kê thú, bấm Lên lưng → nhân vật cưỡi Linh Mã giữa Ngự Thú
  Sơn Trang, ảnh p161_shot_panel.png + p161_shot_ride.png).
  GĐ161 local-only, CHƯA PUSH.

## GĐ162 — THẦN THÔNG NGUYÊN ANH + TRANG BỊ BẬC NGUYÊN ANH (29/10, probe p162 ALL PASS)

- **Chiêu Nguyên Anh**: tài liệu không liệt kê chiêu NA nên đợt này
  bổ sung theo đúng mẫu thần thông Kim Đan — mỗi lớp **1 thần thông
  Nguyên Anh, tự lĩnh ngộ ngay khi đột phá Nguyên Anh thành công**
  (tự lắp vào ô chiêu nếu còn trống, hiện trong Sổ Công pháp như
  thần thông Kim Đan). Tên + số đều TẠM (khung nhỉnh hơn Kim Đan 1
  bậc: hệ số 3.6 so với 3.0, hồi chiêu 45s so với 30s, tốn 150 chân
  nguyên so với 100):
  Thể — Bất Diệt Chiến Thể (giảm 60% sát thương nhận, 12s) · Phật —
  Như Lai Thần Chưởng (đánh mọi quái trong tầm + hồi 35% máu) ·
  Cốt — Cốt Hải Triều Thiên (đánh vùng + hút 60% sát thương thành
  máu) · Ảnh — Dạ Ảnh Tuyệt Sát (hệ số 4.4, đòn kế tiếp ×2.5) ·
  Kiếm — Thiên Ngoại Phi Tiên (đánh vùng, xuyên 30% phòng) · Pháp —
  Thiên Lôi Diệt Thế (hệ số 3.8, tầm 220, choáng 1.5s) · Quỷ —
  Minh Hà Phệ Thiên (đánh vùng + hút 75%) · Y — Tái Sinh Thánh Thủ
  (hệ số 2.6, hồi 70% máu) · Nho — Thiên Địa Chính Khí (tăng 40%
  công, 15s).
- **Trang bị bậc Nguyên Anh**: từ Nguyên Anh trở đi, MỌI món đồ
  người chơi nhận được (mở rương, thưởng nhiệm vụ, mua ở Tiệm Rèn,
  tự rèn, nhận đồ đặt rèn) đều mang **bậc Nguyên Anh**: tên món thêm
  "· Nguyên Anh", **chỉ số cuối ×1.6** (TẠM), và **dưới Nguyên Anh
  không mặc được** (báo đúng câu "Không thể trang bị" — kể cả nhặt/
  được cho từ người khác). Đồ nhận trước khi lên Nguyên Anh giữ
  nguyên bậc thường. Tẩy luyện giữ nguyên bậc.
- Kiểm chứng: probe p162 ALL PASS (18 chân: đột phá TC9→KD vẫn
  nhận thần thông Kim Đan (hồi quy), KD9→NA nhận Thiên Lôi Diệt
  Thế + tự lắp ô 1, tung chiêu log combat 1558 dmg/tốn 150 MP,
  mua cùng 1 món kho: bản NA có bậc + tên nhãn + chỉ số ×1.6 đúng
  tỉ lệ, NA mặc được, KD mặc bị chặn "Không thể trang bị", bậc
  bền trong file). GĐ162 local-only, CHƯA PUSH.

## GĐ163 — CHIÊU BIẾN DỊ CHO PHÁP TU: 10 HỆ × 3 CHIÊU × 3 ĐƯỜNG VŨ KHÍ (29/10, probe p163 ALL PASS)

- Ma trận công pháp đầy đủ là HƯỚNG TU × VŨ KHÍ × HỆ: phần 5 hệ cơ
  bản đã có sẵn từ trước (mỗi đường vũ khí đủ 3 chiêu/hệ cơ bản).
  Đợt này lấp phần còn thiếu: **10 hệ biến dị** (Lôi, Phong, Băng,
  Nham, Độc, Quang, Ám, Huyết, Thời Gian, Không Gian) — mỗi hệ 3
  chiêu (2 Luyện Khí + 1 Trúc Cơ, đúng khung 3 chiêu của hệ cơ bản)
  cho **3 đường vũ khí của Pháp Tu** (Phiến/Pháp Trượng/Sách Phép)
  = **90 chiêu mới**, catalog 511 → 601 chiêu. Tên + mô tả là TẠM,
  sinh theo bộ hiệu ứng chuẩn từng hệ (Lôi xuyên giáp, Băng làm
  chậm/choáng, Độc ăn mòn, Ám/Huyết hút máu, Thời Gian chậm nặng/
  choáng, Không Gian xuyên giáp mạnh...) nhân kiểu vũ khí; số theo
  khung bậc chung (hệ số 1.6/2.2, điều kiện chỉ số như chiêu thường).
- **Cổng học**: chiêu biến dị chỉ lĩnh ngộ được khi linh căn có
  ĐÚNG biến dị đó (báo rõ "công pháp biến dị hệ X — cần linh căn
  biến dị hệ X"); trong Sổ Công pháp, chiêu chưa đủ biến dị hiện
  điều kiện "Cần linh căn biến dị hệ X" và không bấm học được.
  Theo luật Bảo chốt, biến dị chỉ Pháp Tu mới roll được khi đo
  linh căn → 27 đường vũ khí của 8 lớp còn lại KHÔNG làm chiêu biến
  dị (không ai học được, làm là dữ liệu chết; khi nào mở biến dị
  cho mọi lớp thì sinh nốt 810 chiêu bằng cùng bộ mẫu trong 1 lần).
  Chiêu lớp cũ mang tên hệ (vd Lôi Đình Phá của Pháp Tu) không bị
  cổng này — vẫn học bình thường như trước.
- Kiểm chứng: probe p163 ALL PASS (Sổ hiện đủ 30 chiêu biến dị/
  đường, chiêu Ám đủ biến dị thì học được — chiêu Lôi thiếu biến
  dị bị chặn đúng câu, Kiếm Tu bị chặn ở cổng lớp/vũ khí, tung
  Vĩnh Dạ Ám Ngục Phiến (Ám bậc Trúc Cơ) gây 902 sát thương qua
  log combat). GĐ163 local-only, CHƯA PUSH.

## GĐ164 — THẦN THÔNG THEO LỚP × VŨ KHÍ: 30 ĐƯỜNG × 6 VAI (29/10, probe p164 ALL PASS)

- Bảo đổi hướng giữa chừng: bỏ phương án "thần thông theo lớp 54
  chiêu", làm **theo lớp × vũ khí**. Mỗi đường vũ khí (30 đường) có
  bộ **6 thần thông theo vai**: đạt **Kim Đan** lĩnh ngộ 3 chiêu
  **Tấn công / Phòng thủ / Cân bằng**; đạt **Nguyên Anh** lĩnh ngộ
  thêm 3 chiêu **Tốc độ / Hồi phục / Khống chế**. Tổng **180 chiêu
  mới**, catalog 601 → 781. Tên + mô tả TẠM, sinh theo mẫu từng lớp
  (gốc tên theo vai × tên vũ khí, vd đường Kiếm: Vạn Kiếm, Ngự Kiếm,
  Kiếm Tâm, Lưu Quang, Kiếm Ý, Kiếm Vực).
- Khung số (TẠM, theo thần thông sẵn có): Kim Đan hệ số 3.0, hồi
  chiêu 30s, tốn 100 chân nguyên; Nguyên Anh hệ số 3.6 (Tốc độ 3.4,
  Hồi phục 2.6), hồi chiêu 45s, tốn 150. Hiệu ứng theo vai: Tấn công
  = đánh vùng (vũ khí xa) hoặc đẩy lùi + xuyên giáp (cận chiến);
  Phòng thủ = giảm 50% sát thương nhận trong 10s; Cân bằng = hút
  35% sát thương thành máu; Tốc độ = **tăng tốc chạy +40% trong 8s**
  (Ảnh Tu +50%) — hiệu ứng tăng tốc là cơ chế MỚI (fx spdPct, nhân
  thêm vào tốc độ chạy, không cộng dồn kiểu khác); Hồi phục = hồi
  ngay 45% máu (Y Tu 55%); Khống chế = choáng 1,5s + chậm 30%/3s.
- Cách nhận: **tự lĩnh ngộ khi đột phá** đạt cảnh giới (nhảy thẳng
  lên Nguyên Anh thì nhận cả 2 bộ), nhân vật cũ đã đạt cảnh giới thì
  **tự bù khi đăng nhập** — chỉ bộ của vũ khí đang cầm (mỗi nhân vật
  1 đường vũ khí cố định). Thần thông **không học theo thời gian**:
  bấm nút Học trong Sổ sẽ báo rõ "là thần thông — không học theo
  thời gian, sẽ tự lĩnh ngộ khi đột phá". Sổ hiện nhãn bậc mới "Kim
  Đan · Thần thông" / "Nguyên Anh · Thần thông" đúng màu khung
  (trước đây chiêu Kim Đan bị hiện nhầm nhãn "Trúc Cơ" — đã sửa).
  Thần thông lớp riêng của GĐ88/GĐ162 (1 chiêu/lớp) vẫn giữ nguyên.
- Kiểm chứng: probe p164 ALL PASS (đăng nhập Nguyên Anh bù đủ bộ 6
  chiêu đường Phiến; đột phá lên Nguyên Anh nhận cả 2 bộ; đột phá
  Kim Đan chỉ nhận bộ Kim Đan; chặn học theo thời gian đúng câu;
  đổi vũ khí sang Sách Phép đăng nhập lại nhận bộ mới; tung chiêu
  Tốc độ Phiêu Vân Triện đo tốc độ chạy thật **392 vs 286 px/s ≈
  ×1,37** khớp buff +40%). GĐ164 local-only, CHƯA PUSH.

## GĐ165 — TRANG BỊ THEO ĐƯỜNG VŨ KHÍ (29/10, probe p165 ALL PASS)

- Trước GĐ165: đồ ô VŨ KHÍ chỉ theo hướng tu — rơi/mua được Song
  Kiếm trong khi đang cầm Kiếm vẫn mặc bừa, và đồ rơi ngẫu nhiên
  trong hướng tu nên hay thành đồ chết. Nay đồng bộ ma trận với
  thần thông GĐ164: **đồ ô VŨ KHÍ phải đúng đường vũ khí đang cầm
  mới mặc được**, sai đường báo đúng câu "Không thể trang bị".
- Ba chỗ nối: (1) **Cổng mặc** trong gear.js — đối chiếu vũ khí của
  món đồ với đường vũ khí của nhân vật qua bảng nối id game → gear
  (30 đường; 3 ngoại lệ: Đao Thế→DAO, Thương Thể→THUONG, Ngâm
  Thơ→NGON_LINH); các ô khác (áo/mũ/giày...) không đổi. (2) **Đồ
  rơi rương/thưởng nhiệm vụ**: ô vũ khí sinh theo đúng vũ khí người
  mở đang cầm, không ngẫu nhiên nữa. (3) **Shop Thợ Rèn**: kho gieo
  hạt giữ nguyên cho mọi người xem, nhưng món ô vũ khí CÙNG hướng
  tu với người mua thì lúc giao được rèn lại sang đúng vũ khí người
  mua (đổi cả tên, giữ nguyên phẩm/hệ/nội tại/bậc); khác hướng tu
  thì giữ nguyên món gốc (mua về ngắm, mặc không được). Tự rèn +
  đặt rèn vẫn tự thiết kế tự do như cũ — cổng mặc là nơi chốt luật.
- Hệ quả cần biết: **đồ vũ khí cũ trong túi** (sinh trước GĐ165)
  nếu khác đường vũ khí đang cầm thì từ giờ mặc sẽ bị chặn — đúng
  luật mới, không phải lỗi.
- Kiểm chứng: probe p165 ALL PASS 13 chân — unit gear.js (bảng nối
  + cổng mặc 4 trường hợp + rèn lại giữ hậu tố bậc Nguyên Anh +
  khác hướng không đổi) và socket thật (Kiếm Tu mặc đồ Kiếm được /
  đồ Song Kiếm bị chặn đúng câu / áo mặc bình thường; mua shop cùng
  hướng giao đúng Phiến, khác hướng giữ nguyên Quyển Trúc và mặc
  bị chặn). Riêng đường đồ rơi dùng chung hàm nối đã test unit +
  cổng mặc socket — chưa quay trúng rương rơi ô vũ khí để xác nhận
  trực tiếp. GĐ165 local-only, CHƯA PUSH.

## GĐ166 — FULL MAP: THÊM QUÁI + ĐỊA HÌNH THEO CHỦ ĐỀ (29/10, probe p166 + p166_shot ALL PASS)

- Trước GĐ166: 74 map và 26 map hoang dã đều có quái, nhưng mỗi map
  chỉ 1–3 loài (22 loài chia cho 26 map) và địa hình theo chủ đề mới
  ở mức decor chung. Đợt này làm "full" theo luật map của Bảo:
- **Quái: 22 → 31 loài.** Thêm 9 loài mới có sprite vẽ bằng công cụ
  của Muse (kiểu PixelLab, Bảo duyệt qua ảnh chụp trong game):
  Tuyết Hồ + Băng Xà (băng), Hỏa Thử (lửa), Sa Mạc Hạt (sa mạc),
  Sâm Lâm Cự Mãng (rừng, PHỤC KÍCH), Thủy Yêu Ngư (biển sâu),
  Lôi Xà (lôi), Địa Kim Thử (kim), Dung Nham Giải (dung nham).
  Chỉ số nội suy theo loài cùng bậc (TẠM), tuViReward đúng bảng bậc
  sẵn có. Băng Xà + Cự Mãng phục kích như Độc Xà (cờ ambush nay đọc
  từ dữ liệu). Gán bổ sung loài sẵn có cho các map mỏng theo chủ đề
  (dơi vào các map hang động, sói vào sơn mạch sa mạc, cốt binh vào
  kiếm trủng/chiến trường...) — **mọi map hoang dã giờ có ≥3 loài**;
  3 map từng gán tay (Băng Phong Cốc, Hỏa Diễm Sơn, Vạn Thú Sơn
  Mạch) đã chuyển hẳn vào dữ liệu. Tổng quái toàn thế giới
  **431 → 1121** (79 cặp map/loài) theo đúng luật mật độ cũ (map
  Luyện Khí ×3, Trúc Cơ ×2) — lưu ý theo dõi FPS/độ nặng server bản
  free khi bạn bè vào test đông.
- **Địa hình theo chủ đề:** theme lửa thêm **hố dung nham** (để ngắm
  như ao, không cản đường), theme băng thêm **cụm tinh thể băng
  lớn** (cản đường r=20), theme sa mạc thêm **đụn cát**; đã cân lại
  trọng số decor từng theme (tổng vẫn 1.00). Sprite 3 loại decor
  cũng vẽ mới cùng đợt.
- Kiểm chứng: boot log "79 cặp map/loài, tổng 1121 quái" khớp tính
  tay; probe socket tuần tra thật ở Băng Phong Cốc gặp đủ 3 loài
  (kể cả Tuyết Hồ + Băng Xà mới) và Hỏa Diễm Sơn đủ 3 loài (kể cả
  Hỏa Thử); ảnh chụp trình duyệt: Hỏa Diễm Sơn thấy 3 hố dung nham
  quanh cổng + dơi, Băng Phong Cốc thấy cụm tinh thể băng + 2 Tuyết
  Hồ có nhãn tên cạnh Thủy Triều Tinh. GĐ166 local-only, CHƯA PUSH.

## GĐ167 — ÂM THANH: NHẠC NỀN + HIỆU ỨNG (29/10, probe p167 ALL PASS)

- Trước GĐ167 game câm hoàn toàn (tài liệu B15 vẫn nợ ~10 hiệu ứng +
  2–3 bản nhạc nền). Đợt này làm bằng WebAudio tổng hợp tại chỗ —
  KHÔNG cần file nhạc ngoài, không tốn dung lượng, chạy offline:
  module mới client/src/sound.ts.
- **Nhạc nền generative:** tiếng đàn gảy (thuật toán Karplus-Strong
  nghe như đàn tranh) chạy trên thang ngũ cung + lớp đệm pad êm.
  Nhạc không lặp một bài cố định mà tự sinh giai điệu mỗi lúc một
  khác, theo 3 tâm trạng tự chuyển: **làng/thành phố/khu an toàn**
  (sáng, thư thả), **map hoang dã** (trầm, thưa nốt hơn), **đang
  thiền/bế quan** (rất thưa, tĩnh). Âm lượng/mật độ nốt đều TẠM.
- **18 hiệu ứng:** vung vũ khí, trúng đòn, đòn nặng, bị thương,
  tung chiêu, quái vận đòn cảnh báo (khi quái gần mình nhuộm đỏ),
  nhặt đồ, mở rương, mua đồ ở Tiệm Rèn, học chiêu/đo linh căn,
  đột phá thành công (dàn chuông đi lên), đột phá thất bại (trầm
  xuống), gục ngã/tọa hóa, được cứu dậy, dịch chuyển đổi map, né,
  hạ quái, bấm nút. Tiếng đánh trúng/bị thương do client tự suy từ
  tick (máu quái tụt ngay sau đòn của mình / máu mình tụt).
- **Điều khiển:** Menu (⚙) có 2 nút mới "🎵 Nhạc nền: Đang bật/tắt"
  và "🔔 Hiệu ứng: Đang bật/tắt", lưu lựa chọn vào máy người chơi.
  Trình duyệt chỉ cho phát âm thanh sau thao tác đầu tiên nên nhạc
  bắt đầu từ cú bấm/chạm đầu tiên vào game — đây là luật trình
  duyệt, không phải lỗi.
- Kiểm chứng p167 (trình duyệt thật): AudioContext chạy sau thao
  tác đầu; cả 18 hiệu ứng tổng hợp không lỗi; đánh quái thật ở bãi
  farm — bị cắn phát tiếng bị thương, vung kiếm có tiếng swing,
  trúng đòn có tiếng hit; nút Menu tắt/bật + đổi nhãn đúng. Bảo
  cần nghe thử bằng tai trên máy mình để chỉnh âm lượng/khẩu vị.
  GĐ167 local-only, CHƯA PUSH.

## GĐ168 — CHAT GIỮA NGƯỜI CHƠI (29/10, probe p168 ALL PASS)

- Ô chat mới ở góc trái dưới (trên nhật ký): 2 kênh — **📍 Gần**
  (chỉ người cùng map nghe) và **🌐 Thế giới** (toàn server), đổi
  kênh bằng nút cạnh ô nhập. Bấm **Enter** để mở ô gõ, Enter lần
  nữa để gửi, Esc hủy. Đang gõ thì nhân vật đứng yên và mọi phím
  game (WASD/J/chiêu/E...) đều khóa — gõ chữ không lo nhân vật tự
  chạy hay vung kiếm.
- Tin chat hiện thành **bong bóng trên đầu** nhân vật ~4 giây (kèm
  dòng trong ô chat, giữ 40 dòng gần nhất). Chống spam phía server:
  tối thiểu 900ms giữa 2 tin, tối đa 200 ký tự/tin (số TẠM).

## GĐ169 — SỐ SÁT THƯƠNG NỔI (29/10, probe p169 ALL PASS)

- Mọi đòn trúng quái hiện **số trắng bay lên** trên đầu quái; đòn
  nặng (>= 20% máu tối đa của mục tiêu) số to màu cam; sát thương
  lên người chơi/pet hiện **số đỏ có dấu trừ**. Số là số THẬT từ
  công thức sát thương phía server (gom theo tick 100ms nên đòn
  liên hoàn trong cùng tick cộng thành 1 số), không phải số đoán
  phía client. Kiểm chứng: sói 40 máu nhận 2 số tổng 68 (đòn cuối
  đánh thừa), sói cắn người chơi hiện đúng -4.

## GĐ170 — GIAO DỊCH NGƯỜI CHƠI ↔ NGƯỜI CHƠI (29/10, probe p170 ALL PASS)

- Đứng gần người chơi khác (<= 220px) thì nút **🤝 Giao dịch**
  hiện ở góc phải dưới. Bấm để mời; đối tác có 30 giây Đồng ý /
  Từ chối. Bàn giao dịch 2 cột: bấm món trong túi để đưa lên bàn,
  bấm món trên bàn (cột trái) để bớt, nhập số Linh thạch, thú cưỡi
  bấm để đưa/gỡ. **Đổi bất cứ thứ gì là hủy xác nhận của cả hai**;
  cả hai cùng ✔ Xác nhận mới trao — server kiểm lại toàn bộ lúc
  trao (cùng map, khoảng cách, đồ còn trong túi, chuồng còn chỗ),
  sai là hủy kèm lý do chứ không trao nửa vời.
- Giao được: vật phẩm thường + Linh thạch (Hạ) + **thú cưỡi**
  (mở khóa vụ người chơi bán thú cho nhau; con đang cưỡi không
  đưa lên bàn được). Trang bị chưa giao dịch được ở đợt này.
- Kiểm chứng probe: trao 4 nanh + 200 thạch + 1 Linh Mã ↔ 2 da
  quỷ + 60 thạch khớp từng con số 2 phía; đặt 999 nanh bị kẹp
  còn đúng 10 (số có trong túi); chuồng đầy 3 con thì hủy an
  toàn, đồ nguyên vẹn.

## GĐ171 — GÓI HIỆU ỨNG (29/10, probe p171 ALL PASS phần số liệu)

- **Chiêu quái có vòng báo trước**: quái vận chiêu diện rộng (Cự
  Nhân Băng dậm băng, quái húc lao...) hiện **vòng đỏ trên mặt
  đất nở dần** theo đúng bán kính + thời gian vận chiêu thật của
  server (Cự Nhân: 120px / 850ms — probe tick khớp từng số), chiêu
  tung ra thì vòng nổ tung. Đứng trong vòng khi nó đầy là ăn đòn.
- **Phi kiếm**: người Kim Đan+ ngự kiếm bay giờ có **thanh kiếm
  bạc lơ lửng dưới chân** đung đưa theo nhịp (bỏ dấu 🕊️ trên tên).
- **Cưỡi thú có nhịp**: thú và người nhấp nhô theo bước đi thay vì
  trượt phẳng.
- **Đánh/chiêu có chạm nổ**: đạn chiêu chạm đích nổ vòng sáng theo
  màu hệ + tia lửa; đòn thường gần cũng có tia nổ nhỏ; chiêu
  buff/hồi không mục tiêu có vòng sáng quanh người tung. Người
  chơi khác và pet (Cốt Vương / Quỷ Hồn / thú thuần hóa) khi đánh
  thường sẽ **lao người vào mục tiêu** thay vì đứng yên vung tay.

## GĐ172 — HIỆU ỨNG LUYỆN ĐAN + ĐỘT PHÁ + LÔI KIẾP (29/10, probe p172 + p172b ALL PASS)

- **Luyện chế**: thành công thì lò bùng vòng lửa vàng 2 nhịp
  quanh người + tiếng xu; hỏng thì khói xám + tiếng xì. (Trước
  đợt này client không hề nghe sự kiện craft_result — chỉ có
  dòng chữ của server; nay có thêm hình + tiếng.)
- **Đột phá theo cỡ**: Tiểu = cột sáng vàng nhỏ; Trung = 1 tia
  sét + cột sáng; **Đại / Kim Đan / Nguyên Anh = LÔI KIẾP**: 3
  tia sét răng cưa giáng từ trời xuống (kèm tiếng sấm tổng hợp +
  rung màn hình + chớp sáng), rồi cột sáng lớn bừng lên. Người
  đứng cạnh cũng THẤY hiệu ứng của người đột phá (server gửi kèm
  loại đột phá trong sự kiện chung). Sửa kèm: toast đột phá của
  người khác trước đây hiện sai tên cảnh giới Kim Đan/Nguyên
  Anh thành "Luyện Khí" — đã đúng.
- Kiểm chứng: luồng thử thách thật ở sân Đạo Quán (start_trial
  -> giết Tâm Ma Ảnh HP 2082 -> breakthrough_ok type=dai, +12
  điểm, +50 năm thọ; Thử Luyện Thú trung +5 điểm/+5 thọ, trừ
  đúng 1 Đan Trung Cảnh). Ảnh tĩnh bắt không kịp tia sét (nó
  chỉ ~0,3s) — xem trực tiếp khi chơi sẽ rõ, nhất là lôi kiếp
  Đại kéo dài ~2,3 giây.

## GĐ173 — ĐAN ĐỘT PHÁ TỪNG CẢNH: LẤP LỖ HỔNG TRUNG CẢNH KIM ĐAN/NGUYÊN ANH (29/10, probe p173 ALL PASS)

- Rà soát phát hiện **lỗi thật**: đột phá Trung cảnh (tầng 3→4,
  6→7) của **Kim Đan và Nguyên Anh trước đây rơi xuống Tiểu
  cảnh** — không cần Đan Trung Cảnh, không có thử thách, thiếu
  điểm + thọ của bậc trung (do 2 nhánh return sớm trong bảng
  đột phá đứng chắn trước nhánh trung). Đã sửa: trung cảnh áp
  cho cả 4 cảnh, điểm theo thang 5 (LK) / 6 (TC) / 7 (KD) / 8
  (NA), thọ +5 / +10 / +20 / +30 (số KD/NA là TẠM theo đà thang).
- Kiểm chứng đủ 3 ca thật qua luồng thử thách: KD3→4 (+7 điểm,
  +20 thọ), NA6→7 (+8, +30), TC3→4 hồi quy (+6, +10) — đều trừ
  đúng 1 Đan Trung Cảnh.
- Các đan còn lại đã đủ từ trước và không đổi: Trúc Cơ (luyện:
  20 nanh + 2 da quỷ, tỉ lệ 60%, Đan Sư cấp 3; tiệm 800), Kết
  Đan (30 nanh + 5 da quỷ, 50%, cấp 3; tiệm 2000), Hóa Anh
  (50 nanh + 10 da quỷ, 45%, cấp 5; tiệm 5000), Hộ Mạch (+10%
  tỉ lệ Đại, tiệm 300, tự trừ khi đột phá Đại).

## GĐ174 — NHÃN THEO TẦM GẦN + THOẠI NPC THƯA (30/10, probe p174 ALL PASS; Bảo chê rối chữ từ ảnh giao dịch)

- **Mọi nhãn tên chỉ hiện khi người chơi đứng trong 240px** (số
  TẠM, thống nhất 1 tầm cho tất cả): NPC làng + cổng bí cảnh,
  NPC thành phố (cũ 260px), điểm tài nguyên, người chơi khác +
  pet (tên của chính mình luôn hiện), nhãn Bảng Treo Thưởng,
  nhãn Trận Dịch Chuyển ở làng, nhãn đàn tế / cổng / điểm đọc
  sách trên map GDD. Xa hơn là ẩn hết — ảnh chụp đối chứng:
  đứng nam làng chỉ còn tên mình + người đứng cạnh; vào giữa
  quảng trường tên các NPC gần mới hiện.
- **Thoại NPC thưa hẳn**: tầm nghe 520 → 230px, tối đa cùng lúc
  8 → **2 người**, mỗi NPC ~28–42 giây mới nói lại 1 câu (trước
  ~11–15s). Lấy mẫu 30 giây giữa quảng trường đông: tối đa 2
  người cùng nói, tổng chỉ 2–3 câu mới.
- Chưa đụng: tên quái (vẫn hiện như cũ — Bảo chỉ nói NPC +
  người chơi), nhãn "Linh mạch" trên nền map.

## GĐ175 — MỌI MAP RỘNG ×5 DIỆN TÍCH (30/10, Bảo chốt "diện tích ×5 — mỗi chiều ×2,24"; probe p175 + p175_shot ALL PASS)

- **Cách nhân**: mọi tọa độ bố cục ×√5 ≈ 2,236 (hàm hs175 ở cả
  server + client); kích thước vật thể (nhà, ao, bán kính) GIỮ
  NGUYÊN → nhà cửa/cây cối/NPC tự thưa ra đúng ý. Kích thước:
  làng 3400×1200 → **7603×2683**; thành phố → **10733×8050**;
  map nghề → 4919×3689; farm → 8497×6373; nguyên tố → 8944×6708.
- Map GDD: cổng/khu dân/dãy nhà/decor/quái/node đều suy từ kích
  thước nên tự giãn; lưới NPC chức năng giãn bước 150 → 335px
  (NPC xa cổng nhất đo được 9075px so với ~1009px ở lưới cũ —
  có cả dân thường rải toàn map). Số quái giữ nguyên 1121 →
  mật độ thưa đi 5 lần (chủ đích "thưa"; nếu test thấy vắng quá
  thì tăng số lượng sau — chưa tăng vì Render free đã phải gánh
  1121 quái tick 10Hz).
- Map làng: nhân toàn bộ bố cục (nhà, NPC, cổng, quảng trường,
  Đạo Quán, bí cảnh Thạch Lâm, vùng farm, điểm nghỉ, điểm tương
  tác E phía client). Nền nướng lại ở 1× chia 2 texture tại
  x=3578 (bản 2× cũ vượt giới hạn 4096px của GPU).
- **Đào ra + sửa 1 lỗi hệ quả**: cổng kiểm tra "đứng ở sân Đạo
  Quán" của thử thách đột phá neo theo cửa (160px) — sân giãn
  ra làm tâm sân cách cửa 166px nên bấm bắt đầu thử thách bị
  từ chối oan; đã neo lại theo tâm sân (200px) + cửa (160px).
- **Nhân vật cũ tự dịch tọa độ ×√5 đúng 1 lần** khi đăng nhập
  (cờ geo175 trong hồ sơ) — ai đang đứng đâu ở bản cũ sẽ hiện
  ở đúng vị trí tương ứng trên bản đồ mới, không bị kẹt trong
  nhà/tường.
- Test tay gợi ý: vào làng đi từ quảng trường lên Đạo Quán —
  đường dài hẳn; mở bản đồ tổng quan (bấm minimap) xem làng +
  bí cảnh; ra farm phía đông tìm sói (thưa hơn trước nhiều);
  vào 1 thành phố đi từ cổng lên khu dân.

## GĐ176 — DỜI KHAY CHIÊU SANG PHẢI + CHAT SÁT ĐÁY (30/10, probe p176 ALL PASS; Bảo gửi ảnh khoanh vùng dưới màn hình)

- Khay chiêu desktop: từ neo đáy giữa → **phía phải dưới**,
  cách mép phải 300px (sát mép 10px bị chê kì, 76–100px Bảo bảo nhìn không khác gì).
  Đáy giữa trống hoàn toàn cho bảng nhiệm vụ.
- Ô chat: từ bottom 158px → **sát đáy 10px**; nhật ký game dời
  lên trên ô chat (bottom 190px) — hoán đổi vị trí, tổng chiều
  cao cụm trái dưới không đổi. Bản cảm ứng hoán đổi tương tự
  (chat 292→128px, nhật ký 122→306px) — cần Bảo test tay trên
  điện thoại vì sandbox không kiểm chứng được cảm ứng.
- Đo thật trên trình duyệt 1280×800: khay chiêu right=1270,
  bottom=790; chat bottom=790; nhật ký không chồng chat.

## GĐ177 — SỐ SÁT THƯƠNG NỔI + FX THEO ẢNH MẪU (30/10, probe p177 ALL PASS; Bảo gửi ảnh mẫu game khác: chùm số vàng to đậm giữa vòng skill)

- Khay chiêu chốt cách mép phải **150px** (sau các bản 10/76/100/300px).
- Số nổi viết lại: chữ đậm to (16 thường / 22 đòn nặng / **27 chí
  mạng**), viền đen dày 5–6, màu vàng kem → cam → **vàng rực khi
  chí mạng**; xuất hiện kiểu "nảy" phồng 0,45 → 1,15–1,3 → 1 rồi
  bay lên; lệch vị trí ngẫu nhiên để chùm số không dính nhau; trần
  80 số cùng lúc (chí mạng luôn hiện). LƯU Ý: các ảnh chụp thử của
  agent gửi trùng tên file có thể bị app hiện cache ảnh cũ — từ
  nay ảnh đối chứng luôn đặt tên riêng từng bản.
- Server: số nổi KHÔNG cộng gộp theo mục tiêu trong tick nữa —
  **mỗi đòn một số riêng** (trần 120 số/map/tick, giữ đòn to nhất);
  hurtMonster thêm cờ crit, đòn thường + tung chiêu của người chơi
  truyền critMul>1 vào → client hiện số chí mạng. DoT/pet không
  gắn cờ (số thường).
- FX chạm đích (impactFx): thêm chớp trắng ở tâm + vòng phụ đuổi
  theo + tia lửa 5 → 11 tia xa hơn; thêm chớp sáng tại người tung
  chiêu khi cast (cả mình lẫn người khác).
- Kiểm chứng: socket — nhân vật Bạo Kích 100 điểm: mọi số nổi trên
  golem đều mang cờ chí mạng, dmg đều nhau; browser — 16 số nổi
  hiện trong 1 trận farm, ảnh thấy số cam đậm + số đỏ -4/-5 khi bị
  dơi cắn + chớp nổ vàng trên mục tiêu.

## GĐ178 — BỎ SỐ NỔI LÊN NGƯỜI CHƠI + THÔNG BÁO NHỎ MÉP PHẢI (30/10, probe p178 ALL PASS; Bảo góp ý từ ảnh GĐ177)

- Sát thương lên NGƯỜI CHƠI không hiện số nổi nữa (server ngừng
  phát t='p', client cũng bỏ qua) — đỡ rối mắt; số nổi chỉ trên quái.
- Banner to giữa màn "⚔ Sói wolf-1122 đã bị tiêu diệt bởi BẠN!"
  BỎ HẲN (trước đây còn lộ id nội bộ + ghi "Sói" cho mọi loài).
  Server monster_killed nay kèm `name` = tên loài tử tế (Sói Xám,
  Dơi Đen...); chỉ NGƯỜI HẠ thấy dòng nhỏ: "Bạn đã hạ gục 1 Sói Xám".
- Chồng thông báo #sideNotes sát mép phải (right 10px, top 302px
  dưới minimap): chữ trắng 12px nền mờ, tối đa 6 dòng, tự mờ sau
  ~3,6s. Nơi hiện: hạ gục quái + NHẶT ĐỒ RƠI (trước đây nhặt đồ
  im lặng, nay server gửi pickup_note: "+4 Linh thạch" / "Nhặt
  được Xương Thú") + loot rương (bỏ toast giữa màn, giữ nhật ký).
- Kiểm chứng: máu tụt trong trận mà 0 số nổi t='p'; pickup_note
  nhận đủ; browser thấy dòng hạ gục cách mép phải đúng 10px.

## GĐ179 — NGỘ KIỆM TÍCH CHẬM LẠI (30/10, probe p179 ALL PASS; Bảo thấy phàm nhân đã 80/100 thì hỏi "lẹ vậy")

- Ngộ Kiếm là thanh tích lũy cho hợp nhất kiếm (đầy 100 dùng →
  về 0), không phải chỉ số tu luyện. Tốc độ cũ TẠM: trúng +3,
  hạ +25 (đầy sau ~4 mạng). Bảo chốt chậm lại: **trúng +1, hạ
  quái +10** (NGOKIEM_HIT/NGOKIEM_KILL) → đầy sau ~10 mạng hoặc
  ~50 đòn trúng.
- Kiểm chứng đếm từng đòn: 4 đòn trúng + 1 mạng sói → Ngộ Kiếm
  đúng 14 (công thức cũ sẽ là 37).

## GĐ180 — THANG CẢNH MỚI + ĐƯỜNG ẨN "TÀN ĐĂNG" + THOÁT THAI HOÁN CỐT (30/10, probe p180 + p180_shot ALL PASS; Bảo thiết kế)

- THANG CẢNH ĐỔI (Bảo chốt): Nguyên Anh → **Vô Danh** (cảnh trung
  gian CHƯA có tên — "Vô Danh" là tên TẠM agent đặt, chờ Bảo đặt
  tên thật) → **Phản Hư** → **Hóa Thân** (đổi tên từ Hóa Thần theo
  chữ Bảo viết). REALM_ORDER tg 5 / ph 6 / ht 7; globalStep dịch
  theo (tg 36+, ph 45+, ht 54+). Nội dung Vô Danh + Hóa Thân vẫn
  khóa như Hóa Thần trước đây.
- ĐƯỜNG TÀN ĐĂNG (ẩn): NA tầng 9 + thọ còn ≤10 năm → tàn thư gợi ý
  ẩn ở Đạo Quán (thiền ở đó / lại gần cửa) → nút "🕯 Đi đường Tàn
  Đăng" trên thẻ (chọn 1 lần, không quay lại). Đang đi đường này:
  đột phá tay bị khóa. Thọ còn ≤3 năm → TỰ lên NA tầng 10 (viên
  mãn). Thọ còn ≤1 năm → thành tựu ẩn "Đến cuối vẫn còn chăm chỉ"
  (tên Bảo đặt, nhóm Ẩn, danh hiệu "Tàn Đăng Bất Diệt") + TỰ
  THOÁT THAI HOÁN CỐT.
- HOÁN CỐT: tuổi + thọ nguyên quay về ĐÚNG thời điểm vừa đột phá
  Nguyên Anh tầng 1 (server chụp ageAtNa1/lifespanAtNa1 lúc đột
  phá Nguyên Anh; nhân vật cũ không có mốc thì lấy lúc chọn đường
  — TẠM migrate). Tu vi giữ NA viên mãn. Hoạt ảnh TỰ CHẠY (Bảo
  yêu cầu): ở map nhà thì dời ra sân Đạo Quán đón kiếp, cả map
  thấy 3 tia sét + cột sáng lớn; chính chủ thêm màn chữ 2 dòng
  "Thọ nguyên đã tận — đèn tàn trước gió… / THOÁT THAI HOÁN CỐT".
- Sau hoán cốt: đầy tu vi → thử thách Phản Hư Kiếp Ảnh (HP ×12
  thang cũ, công kiếp ×2,6 — TẠM) → đột phá THẲNG Phản Hư (bỏ qua
  Vô Danh), tỉ lệ như Đại cảnh, KHÔNG cần đan (chưa có đan Phản
  Hư — TẠM), thưởng +21 điểm / +200 năm thọ (TẠM theo thang).
  Phản Hư giữ 7 ô chiêu + bay như NA (TẠM).
- SỬA LUÔN LỖI CŨ (từ GĐ160): thẻ nhân vật của Nguyên Anh bị hiện
  nhầm "Luyện Khí tầng 9" vì client thiếu nhánh 'na' — đã viết lại
  nhãn đủ cả thang mới ở 2 chỗ (thẻ chính + thẻ chi tiết).
- Kiểm chứng toàn trình bằng nhân vật vá: gợi ý → chọn → khóa nút
  → NA10 → hoán cốt (tuổi 190→100, thọ còn 8→160) → giết boss
  99.348 máu → Phản Hư tầng 1 (+200 thọ, +21 điểm). Ảnh hoạt ảnh
  chụp trực tiếp khi kiếp giáng lúc đang online.

## GĐ181 (30/10) — Đích đường Tàn Đăng đổi thành HÓA THẦN + quà đường (Bảo chốt lại theo thang truyện chuẩn)
- Sau thoát thai hoán cốt, đột phá thẳng lên **Hóa Thần** (không nhảy lên Phản Hư nữa). Thang cảnh hiển thị: Nguyên Anh → Vô Danh → **Hóa Thần → Phản Hư** (Hóa Thần trước Phản Hư như truyện chuẩn; Vô Danh vẫn là tên tạm chờ Bảo đặt).
- **Quà đường Tàn Đăng** khi đột phá Hóa Thần: **+10% Tu vi từ mọi nguồn VĨNH VIỄN** + **tặng 30 điểm cộng chỉ số** (số điểm là tạm).
- Sửa luôn 1 lỗi cũ từ GĐ180: phân thân của trùm thử thách (mọi loại kiếp ảnh) bị mất vị trí/máu do lỗi code — giờ phân thân hiện đúng, có máu riêng.
- Cách test: đi hết đường Tàn Đăng như mục GĐ180 → sau hoán cốt, thử thách đổi tên **Hóa Thần Kiếp Ảnh**, thắng → đột phá → vào Hóa Thần tầng 1, có dòng quà 🎁 + điểm tăng 51 (21 + 30).

## GĐ182 (30/10) — HÓA THẦN đầy đủ: cảnh giới + skill + trang bị
1. **Tiến trình trong cảnh**: Hóa Thần tu tiếp tầng 1→9 như các cảnh khác — tiểu cảnh +7 điểm/tầng; **trung cảnh** ở tầng 3→4 và 6→7 (+9 điểm, +40 năm thọ — số tạm; cần Đan Trung Cảnh + thắng Thử Luyện Thú như thường). Tầng 9 là đỉnh hiện tại: nút đột phá báo "Cảnh giới Phản Hư chưa mở".
2. **Ô chiêu thứ 8**: Hóa Thần lắp được 8 ô công pháp (Nguyên Anh 7).
3. **Skill**: (a) **9 thần thông theo LỚP** tự lĩnh ngộ khi lên Hóa Thần — vd Kiếm tu "Vạn Kiếm Hóa Thần", Y tu "Hồi Thiên Thần Thủ" (hồi 85% máu); khung tạm: hồi chiêu 60s, tốn 200 chân nguyên. (b) **90 thần thông theo ĐƯỜNG VŨ KHÍ** (mỗi đường +3: Diệt/Vực/Sinh) tự lĩnh ngộ khi lên Hóa Thần nếu đang cầm đúng vũ khí — tổng catalog 871 chiêu.
4. **Trang bị bậc Hóa Thần**: đồ sinh ra (rương/nhiệm vụ/rèn/mua) khi người chơi đã Hóa Thần mang hậu tố **"· Hóa Thần"**, chỉ số nhân **×2,0** (Nguyên Anh ×1,6); người dưới Hóa Thần KHÔNG mặc được đồ bậc này. Sửa kèm: bảng thứ hạng cảnh giới trong luật mặc đồ bị thiếu cảnh mới (Phản Hư mặc đồ Hóa Thần bị chặn oan — đã sửa).
- Cách test nhanh: nhân vật Hóa Thần mở Sổ công pháp xem 2 nhóm thần thông mới + lắp đủ 8 ô; mở rương/mua đồ ở Tiệm Rèn xem món "· Hóa Thần"; nhân vật Nguyên Anh thử mặc món đó → bị báo "Không thể trang bị".

## GĐ183 (30/10) — BỎ HẲN cảnh trung gian "Vô Danh" (Bảo chốt)
- Thang cảnh giờ gọn đúng chuẩn truyện: **… Nguyên Anh → Hóa Thần → Phản Hư**. Không còn cảnh "Vô Danh" ở bất kỳ đâu (thẻ nhân vật, sổ, luật mặc đồ, ô chiêu, bay).
- Hệ quả quan trọng: **Nguyên Anh tầng 9 đường thường giờ đột phá THẲNG lên Hóa Thần** như một đột phá lớn bình thường (thắng Hóa Thần Kiếp Ảnh, +21 điểm, +200 năm thọ — số tạm) — trước đây bị chặn "chưa mở". Trùm của NA9 thường yếu hơn chút (88.704 máu) so với người đi đường Tàn Đăng viên mãn (99.348) vì tính theo bước cảnh giới.
- **Đường Tàn Đăng giữ nguyên** và giờ là con đường "đi vòng lấy quà": cùng đích Hóa Thần nhưng người đi hết đường (thoát thai hoán cốt) mới nhận **quà +10% tu vi vĩnh viễn + 30 điểm**; đường thường lên thẳng thì KHÔNG có quà (probe đo đúng: thường +21 điểm, đường ẩn +51).
- Cách test: nhân vật NA9 thường, đầy tu vi → nút đột phá hiện thử thách Hóa Thần Kiếp Ảnh → thắng → lên Hóa Thần. Nhân vật NA9 đã chọn đường Tàn Đăng thì nút vẫn khóa theo thọ nguyên như cũ.

## GĐ184 (30/10) — PHÁP TƯỚNG thay thần thông Hóa Thần (Bảo chốt thiết kế)
- **BỎ TOÀN BỘ thần thông Hóa Thần của GĐ182** (9 chiêu lớp + 90 chiêu đường vũ khí). Thần thông Kim Đan/Nguyên Anh giữ nguyên. Thay vào đó: lên Hóa Thần là **ngưng tụ 1 Pháp Tướng của riêng mình**.
- **Hệ của pháp tướng KHÓA CỨNG** theo linh căn chính tại thời khắc đột phá Hóa Thần (có bao nhiêu linh căn cũng chỉ lấy hệ đó; Pháp Tu có biến dị thì biến dị lấn hệ chính). Hình dáng trong game: hình tượng khổng lồ sau lưng (cùng bộ sprite nhân vật, phóng to theo giai đoạn, nhuộm màu theo hệ) — hiện hình là thấy ngay.
- **5 giai đoạn**: Sơ Hình ×1 → Chân Thân ×1,3 → Viên Mãn ×1,7 → Chung Cực ×2,2 → Thần Vị ×3 — nhân **toàn bộ chỉ số** (công/phòng/tốc độ/máu/chân nguyên tối đa đều nhân; ảnh test: máu 200.100 → 340.170 ở Viên Mãn).
- **Hiện hình (nút trên thẻ nhân vật)**: tốn ngay 15% máu + 20% chân nguyên tối đa; duy trì −1% máu và −1,2% chân nguyên mỗi giây (số đã chỉnh sau probe: bản đầu 1,8% làm cửa sổ hiện hình ngắn quá, không đánh nổi ải 1). **Không hồi chiêu**, bật tắt tự do; cạn máu/chân nguyên thì tự tắt (drain không giết).
- **Đang hiện hình KHÔNG hồi phục được bằng bất cứ cách nào**: thiền không hồi, đan hồi máu/hồi nguyên bị chặn (không mất đan), chiêu hồi máu/hút máu vô hiệu — **ngoại lệ duy nhất là dòng hồi nội tại độc nhất của trang bị: CHƯA LÀM, Bảo dặn làm sau**.
- **Dưới 20% máu hoặc chân nguyên**: bấm bật lần 1 chỉ hiện cảnh báo nguy hiểm tính mạng; bấm lần nữa (trong 10s) là CỐ BẬT → duy trì bằng **đốt thọ nguyên ~9 ngày thọ/giây (≈1 năm mỗi 40 giây)**, máu/chân nguyên không tụt nữa; thọ sắp cạn thì tự tắt.
- **Nuôi pháp tướng (tu dưỡng)**: trích 20% Tu vi nhận được (nhiệm vụ/offline/thiền...); mở pháp tướng ngồi thiền +60/giây; giao chiến khi đang hiện hình +6/giây; học chiêu pháp tướng +2.000; đột phá tầng trong cảnh Hóa Thần +5.000; tế luyện bằng Linh thạch Thượng (nút trên thẻ, 1 viên = +50). Mốc lên giai đoạn (tạm): 30.000 / 120.000 / 400.000 / 1.200.000.
- **Lên giai đoạn qua Ảo Cảnh Pháp Tướng** (nút hiện trên thẻ khi đủ tu dưỡng + đang hiện hình, vào ải ở sân Đạo Quán): trùm "Ảo Ảnh Pháp Tướng" có lực chiến = chỉ số gốc của chính mình ×1,7 (mỗi đòn của nó ≈ 1,8% máu gốc của bạn — đã giảm từ 5,5% sau probe vì không qua nổi). **Tắt pháp tướng giữa ải hoặc gục ngã = thua ải**; thắng = lên 1 giai đoạn.
- **Chiêu của pháp tướng**: 90 chiêu mới (30 đường vũ khí × 3), học bằng lĩnh ngộ như thường nhưng có cổng giai đoạn (chiêu 1/2/3 cần giai đoạn 1/2/3), thiên về đánh VÙNG quanh mình; **chỉ tung được khi đang hiện hình** — lúc đó cả khay chiêu tự đổi thành bộ chiêu pháp tướng. Hệ của chiêu = hệ đã khóa (Hỏa kèm đốt, Băng làm chậm...). Chưa học chiêu nào thì hiện hình gần như chỉ để phòng thủ như Bảo nói.
- Cách test nhanh: nhân vật Hóa Thần → thẻ có dòng 🔮 Pháp Tướng + nút Hiện hình → bật lên ngắm hình khổng lồ sau lưng, mở Túi/Sổ học chiêu Pháp Tướng của vũ khí đang cầm, qua sân Đạo Quán vào Ảo Cảnh khi đủ tu dưỡng (tế luyện bằng Linh thạch Thượng cho nhanh).

## GĐ185 (30/10) — Thông báo THÀNH TỰU sang mép PHẢI (Bảo yêu cầu)
- Mọi thông báo 🏆 Thành tựu (lên bậc, hoàn thành nhóm, thành tựu ẩn mở khóa...) giờ hiện ở **chồng thông báo mép phải** — cùng chỗ với dòng hạ gục/nhặt đồ của GĐ178 — không còn dồn vào nhật ký bên trái + toast giữa màn hình nữa. Các thông báo khác giữ nguyên.

## GĐ186 (30/10) — CÂN BẰNG LẠI PHÁP TƯỚNG (Bảo tự chốt)
- **Bật + duy trì Pháp Tướng KHÔNG tốn gì nữa** — bỏ hết phí mở (15% máu/20% chân nguyên), drain duy trì, cảnh báo dưới 20% và chế độ đốt thọ nguyên. Máu thọ nguyên để nguyên vẹn; bật tắt tự do tuyệt đối.
- **Chi phí dồn vào CHIÊU của pháp tướng**: mỗi chiêu tốn **cả chân nguyên lẫn máu** — chân nguyên gốc 180/220/300 (lớn hơn thần thông Nguyên Anh 150; vào game còn nhân hệ số chân nguyên theo lớp như mọi chiêu catalog, vd Kiếm ×0,8 → 144/176/240) **cộng thêm 4%/6%/10% máu tối đa**. Máu không đủ trả thì tung không ra (không tự sát). Số đều là TẠM do agent đặt theo yêu cầu "lớn hơn chiêu thường".
- **Giữ nguyên** luật đang hiện hình thì không hồi phục được (thiền/đan/chiêu hồi đều chặn) — chi phí máu của chiêu vì thế là áp lực thật. Nếu Bảo muốn bỏ luật chặn hồi này thì nói, gỡ 5 phút.
- Cách test: nhân vật Hóa Thần bật tướng để yên bao lâu cũng không tụt máu/chân nguyên; vào bãi quái tung chiêu Pháp Tướng sẽ thấy cả 2 thanh cùng tụt một khúc lớn.

## GĐ187 (30/10) — DUY TRÌ NHẸ TRỞ LẠI (Bảo chốt: không phí mở, chỉ tốn duy trì + chiêu)
- Bật Pháp Tướng vẫn **miễn phí**; duy trì tốn nhẹ **0,5% máu + 0,8% chân nguyên tối đa mỗi giây** (TẠM) — đầy cây hiện hình được khoảng 2 phút, cạn thì tướng tự tắt (không chết vì drain). Nhẹ hơn hẳn bản drain cũ của GĐ184 (1% + 1,2%/giây kèm phí mở 15%/20%).
- Chiêu của pháp tướng giữ nguyên chi phí lớn của GĐ186 (cả chân nguyên lẫn % máu).
- Cách test: bật tướng đứng yên xem 2 thanh tụt chậm đều; vào Ảo Cảnh đánh trọn ải vẫn thừa thời gian.

## GĐ188 (30/10) — GÓI FEEDBACK CỦA DRAX: COMBO ĐÒN ĐÁNH + NỚI ĐẦU GAME + TĂNG MẬT ĐỘ QUÁI
- **Combo đòn thường**: đánh thường giờ luân phiên 3 nhịp tư thế theo nhóm vũ khí (nghỉ quá 2,5s thì về nhịp đầu). Thương: **đâm thẳng → QUÉT NGANG → bổ dọc**; kiếm/rìu/chùy: chém xuôi → chém ngược → bổ trên xuống; pháp cụ: giơ thẳng → chếch trái → chếch phải; khiên: đẩy + nghiêng theo nhịp. Chỉ là hoạt ảnh, không đổi sát thương/cân bằng. Song kiếm/song đao tay phụ vẫn vung trễ nửa nhịp như cũ.
- **Nới độ khó đầu game** (số TẠM): tầm đánh gần 50 → **65px** (đỡ phải đứng sát); Sói Xám công 5 → **3**, tốc đuổi 120 → **100**; Dơi Đen công 4 → **3**, tốc đuổi 175 → **145**.
- **Mật độ quái**: bãi farm làng Sói 5 → **10**, Dơi 4 → **8**, Thạch Quái 3 → **5**; map hoang Luyện Khí hệ số ×3 → **×4**, Trúc Cơ ×2 → **×3** (Kim Đan+ giữ nguyên vì Render free). Tổng quái toàn server 1.121 → **1.403** — để ý buổi test bạn bè xem server có lag không, lag thì hạ lại.
- Cách test: tạo nhân vật Thể Tu cầm thương, ra bãi farm đánh liên tục 3 đòn — đòn 2 phải thấy thương quét ngang rõ. Người mới đánh sói phải đỡ ngộp hơn trước.

## GĐ189 (30/10) — BỔ SUNG COMBO: SONG ĐAO/SONG KIẾM + TAY KHÔNG + ĐẠN ĐÁNH XA
- Kiểm tra lại theo câu hỏi của Bảo thì combo GĐ188 có 2 lỗ hổng: **song đao/song kiếm** (Ảnh Tu/Kiếm Tu) và **tay không** bị rơi vào kiểu "giơ pháp cụ" — tay phụ của song đao đứng yên. Đã sửa: song vũ khí về nhóm **chém** (2 tay vung lệch nhịp nhau), tay không về nhóm **đấm/đâm**.
- **Đòn đánh xa** (13 vũ khí tầm xa): tư thế đã có combo từ GĐ188 (quạt quét như chém; trượng/sách/bút giơ chếch theo nhịp; kim châm đâm). Nay thêm biến thể cho **viên đạn**: nhịp 1 bay thẳng, nhịp 2 (quét) bay **vòng cung**, nhịp 3 đạn **to hơn**. Sát thương không đổi — chỉ hình ảnh.
- Cách test: Ảnh Tu cầm song đao đánh 3 đòn liên tiếp — phải thấy 2 lưỡi đao vung lệch nhau; Pháp Tu bắn 3 đòn — viên đạn thứ 2 bay cong.

## GĐ190 (30/10) — COMBO ĐẶC TRƯNG TỪNG VŨ KHÍ (30/30 món)
- Mỗi vũ khí giờ có **bộ 3 nhịp riêng** thay cho combo theo nhóm: tay không đấm liên hoàn (móc trái → móc phải → đấm thẳng nặng); rìu/cự kiếm/trọng kiếm quét cực rộng rồi bổ; kiếm đúng kiếm pháp (chém → **đâm** → chém ngược); côn quét 2 chiều rồi đâm; phật châu nhịp cuối **xoay châu**; quỷ thương đâm xa + đòn cuối **đâm xoay**; khiên nhịp cuối là **húc khiên**; sách phép nhịp cuối **lật trang**; cổ cầm **gảy đàn**; bút phép vẩy 2 chiều rồi **chấm bút**; quyển trục có nhịp **mở trục**; kim châm 2 châm nhanh + 1 châm sâu; dao găm đâm nhanh + cứa; trảo/liềm cào móc liên tiếp...
- Vẫn chỉ là hoạt ảnh (không đổi sát thương/cân bằng); đạn xa vẫn theo nhịp như GĐ189 (nhịp 2 cong, nhịp 3 to — khớp với nhịp "quét" của từng món).
- Cách test: đổi qua vài món vũ khí khác nhau, đánh 3 đòn liên tục mỗi món — cảm giác phải khác nhau rõ, không còn "cùng một kiểu vung".

## GĐ191 (30/10) — DÒNG NỘI TẠI ĐỘC NHẤT CHO TRANG BỊ (theo hướng tu + nhóm vũ khí)
- Trang bị phẩm **Tím trở lên** (có dòng nội tại) mỗi dòng có **10%** cơ hội (TẠM) thành dòng **ĐỘC NHẤT** — tối đa **1 dòng/món**, hiện trong tab Trang bị với tiền tố "✦ ĐỘC NHẤT". Rèn lại (tẩy luyện) cũng rút được.
- Pool rút theo món: **3 dòng chung** (hồi máu/chân nguyên theo giây) + **2 dòng riêng của hướng tu** món đồ + (nếu là vũ khí) **1 dòng riêng của nhóm vũ khí** (nhọn/chém/nặng/pháp cụ). Tổng 25 dòng.
- Hiệu ứng: hồi theo giây (Sinh Cơ, Hồi Nguyên, Từ Bi, Pháp Nguyên Vô Biên...), hút máu đòn thường (Thể Tu 3%, Quỷ Tu 4%), chí mạng + tỉ lệ/+ sát thương (Kiếm, Ảnh, Cốt, Pháp, Nho), tốc độ chạy (Kiếm +8%, Ảnh +10%), Tu vi +% (Y +6%, Nho +8%), phản chấn 15% (Thể Tu).
- **Luật Pháp Tướng**: chỉ các dòng HỒI THEO GIÂY mới hồi được khi đang hiện hình (đúng ngoại lệ Bảo chốt ở GĐ184) — hút máu vẫn bị chặn như thường. Drain duy trì 0,5%/0,8% mà có đồ hồi 0,3%/0,4% thì ròng chỉ còn -0,2%/-0,4% mỗi giây.
- Cách test: kiếm 1 món Tím+ có dòng ✦ (mở rương/rèn lại nhiều lần), mặc vào, để ý máu tự hồi dù không thiền không đan; lên Hóa Thần bật Pháp Tướng xem máu tụt chậm hơn hẳn người không có đồ.

## GĐ192 (30/10) — DÒNG ĐỘC NHẤT: THÊM 16 LOẠI + LUÔN LUÔN DÙNG ĐƯỢC
- **Luật mới (Bảo chốt)**: hiệu ứng của dòng ĐỘC NHẤT **luôn luôn dùng được** — kể cả hút máu/hồi khi hạ quái cũng chạy trong lúc Pháp Tướng hiện hình (bản GĐ191 từng chặn hút máu, nay gỡ). Chỉ các nguồn hồi THƯỜNG (thiền/đan/chiêu) mới bị Pháp Tướng chặn.
- Thêm 16 dòng → tổng **41 dòng độc nhất**: hút chân nguyên (Cốt/Quỷ), né tránh +% (Thể/Ảnh/vũ khí nhọn), trừ sát thương vào chân nguyên (Phật 20%/Y 15%/vũ khí nặng 10%), chém lan sang quái cạnh mục tiêu (Kiếm 40%/vũ khí chém 30%), hạ quái hồi máu/chân nguyên (dòng chung), rơi nguyên liệu +15% (dòng chung), giảm hồi chiêu mọi chiêu (Pháp -10%/Nho -8%/pháp cụ -6%).
- Cách test: mặc đồ có dòng ✦ rồi lên Hóa Thần bật Pháp Tướng và đánh quái — máu vẫn được hút về như thường; đồ chém lan thì đứng giữa bầy sói đánh 1 con, con bên cạnh cũng mất máu.

## GĐ193 (30/10) — THÊM 18 DÒNG ĐỘC NHẤT (tổng 59)
- 7 cơ chế mới: sát thương tổng +%, giảm sát thương nhận -%, tốc độ đánh thường +%, tầm đánh/tầm chiêu +%, chiêu tốn ít chân nguyên hơn, tỉ lệ đột phá +điểm %, thiền hồi nhanh hơn. Mỗi hướng tu thêm 1 dòng riêng, mỗi nhóm vũ khí thêm 1, chung thêm 5.
- Cách test: rút đồ Vô nhiều lần sẽ thấy các dòng ✦ mới (Chiến Ý Vô Song, Thể Như Bàn Thạch, Kiếm Thế Liên Hoàn...); mặc đồ giảm tốn chân nguyên thì tung chiêu thấy MP tụt ít hơn hẳn.

## GĐ194–195 (30/10) — KẾT BẠN / TỔ ĐỘI / XEM THÔNG TIN / BẢNG XẾP HẠNG
- Nút **👥 Xã hội** (cạnh nút Giao dịch): 3 thẻ Bạn bè / Tổ đội / Xếp hạng. Nút **👤** hiện khi đứng gần người chơi khác: Xem thông tin / Kết bạn / Mời tổ đội / Giao dịch.
- **Kết bạn**: nhập đúng tên nhân vật (kể cả người đang offline — họ nhận lời mời khi đăng nhập); huy hiệu đỏ trên nút Xã hội báo số lời mời chờ. Xóa bạn là xóa 2 chiều.
- **Tổ đội** tối đa 5 người (TẠM), chỉ đội trưởng mời thêm/ mời ra; rời game = rời đội; chat có thêm kênh **⚔ Đội** (bấm nút kênh chat để xoay Gần → Thế giới → Đội). Panel tổ đội hiện máu từng thành viên.
- **Xem thông tin**: thẻ hiện lớp/cảnh giới, lực chiến, điểm trang bị, tông môn, nhánh Tiên/Ma, pháp thân, thú cưỡi, và từng món đồ đang mặc (kèm dòng độc nhất trên đồ).
- **Bảng xếp hạng** (tính cả người offline, cập nhật mỗi 30s): Tu vi (cảnh giới), Trang bị (điểm đồ — dòng độc nhất cộng nhiều điểm), Thú cưỡi (số con + tốc độ), Pháp thân (giai đoạn + tu dưỡng); luôn hiện hạng của chính mình.
- Cách test: 2 tài khoản đứng cạnh nhau → kết bạn qua nút 👤, lập đội, chat kênh Đội, mở BXH so hạng.

## GĐ196 (30/10) — 7 GỢI Ý ẨN MỚI + SỬA LỖI NHIỆM VỤ BẢNG
- **SỬA LỖI QUAN TRỌNG**: từ đợt phóng to map (GĐ175), điểm nhận/trả NHIỆM VỤ BẢNG và Nhà Trưởng Làng bị sót tỉ lệ — đứng ở bảng thật cũng không nhận/trả được nhiệm vụ bảng. Đã sửa; test: ra Bảng Treo Thưởng nhận "Trừ khử Sói Xám", làm xong quay lại bảng trả — phải được.
- 7 gợi ý ẩn mới (nâng tổng lên 10, xem lại trong Sổ gợi ý trên thẻ nhân vật), bật từ hành vi thật: có món đồ mang dòng ĐỘC NHẤT đầu tiên; có thú cưỡi đầu tiên; suýt chết trong giao chiến; ra bãi farm ban đêm; có bạn đầu tiên; lần đầu rời map quê; lần đầu gục ngã. Không gợi ý nào chỉ đường cụ thể — toàn là lời người xưa để tự ngẫm.

## GĐ197 (30/10) — BẬT 3 THÀNH TỰU TỪNG BỊ KHÓA
- "Luyện đến cùng" (có chiêu luyện tới am hiểu cấp 10), "Mục Tiêu truy nã" (hạ quái của nhiệm vụ bảng — tính khi trả nhiệm vụ), và thành tựu ẨN "???: bí mật ẩn" (hoàn thành chuỗi nhiệm vụ ẩn — xem GĐ198). Các thành tựu còn khóa đều thuộc hệ chưa có trong game (vườn thuốc, thú tiến hóa, đầu thai...) — để dành khi các hệ đó ra đời.

## GĐ198–199 (30/10) — CHUỖI NHIỆM VỤ ẨN CÓ CỐT TRUYỆN
- **Di Thư Tiền Bối** (3 phần): đứng thiền/ngắm ở Tụ Linh Trận sẽ thấy phong thư niêm sáp dưới chân bia đá → mang cho Sứ Giả mở thư → mang 2 Hồi Xuân Đan cho Trưởng Làng thay lời hồi âm → dọn 5 Thạch Quái quanh mộ phần tiền bối ở bãi Thạch Quái. Phần thưởng cuối: **1 món đồ Cam CHẮC CHẮN có dòng độc nhất** + mở thành tựu ẩn "bí mật ẩn". KHÔNG có dấu chỉ đường — phải tự phát hiện phong thư.
- **Cây Búa Của Cha** (Thợ Rèn, 2 phần): nghe Chủ Tiệm Nguyên Liệu kể chuyện (nói chuyện với bà ấy) → nhận nhiệm vụ ở Thợ Rèn: hạ 8 Sói Xám tìm búa rơi → mang 5 Quặng Sắt về rèn lại búa.
- **Đoàn Xe Năm Xưa** (Thương Nhân, 2 phần): đứng ở cổng làng thấy vệt bánh xe cũ → hỏi Thương Nhân Lưu Động → hạ 10 Dơi Đen cho vong linh đoàn xe yên nghỉ.
- Cách test nhanh chuỗi Di Thư: thiền ở Tụ Linh vài giây → thấy thông báo 🔍 manh mối → gặp Sứ Giả (nhận + nói chuyện + trả) → Trưởng Làng → Sứ Giả → săn Thạch Quái ở bãi farm đông bắc → về Sứ Giả nhận đồ độc nhất.

## GĐ200 (30/10) — GIAO DỊCH TRANG BỊ GIỮA NGƯỜI CHƠI
- Bàn giao dịch có thêm mục **⚔️ Trang bị trong túi**: bấm món để đưa lên bàn, bấm lại để gỡ; cả hai phía đều thấy tên đồ nhuộm màu phẩm + bậc (Nguyên Anh/Hóa Thần) + dòng ✦ ĐỘC NHẤT của món — xem kỹ trước khi khóa bàn.
- **Đồ đang mặc không giao dịch được** (hàng đó ghi rõ "đang mặc — tháo ra mới giao dịch được"); muốn bán phải tháo ra trước.
- An toàn: đang thương lượng mà mặc luôn món đang trên bàn (hoặc đồ trên bàn thay đổi) thì giao dịch tự HỦY, không trao gì cả — tránh mất đồ oan.
- Cách test: 2 tài khoản đứng gần → Giao dịch → mỗi bên đưa 1 món gear + ít Linh thạch → cả hai Xác nhận → kiểm tra túi đồ hai phía đã đổi món cho nhau.

## GĐ201 (30/10) — TỔ ĐỘI CHIA SẺ TIẾN ĐỘ NHIỆM VỤ SĂN QUÁI
- Đồng đội **cùng map, trong vòng 800px quanh chỗ quái gục** (số TẠM) được tính tiến độ nhiệm vụ săn quái (cả nhiệm vụ thường lẫn săn trùm) y như người ra đòn kết liễu — kể cả khi họ không đánh con quái đó. Hoàn thành nhờ đồng đội vẫn có thông báo ✔ như thường, kèm dòng "⚔ Đồng đội X vừa hạ ... — nhiệm vụ săn quái của bạn cũng tiến thêm" (tối đa 1 dòng/5 giây).
- Ở xa hơn 800px hoặc khác map: không tính. Đồ rơi vẫn ai nhặt người đó được; thành tựu cá nhân và hồi độc nhất vẫn chỉ tính cho người kết liễu.
- Lưu ý thiết kế: hạ quái vốn không cho Tu vi (luật từ GĐ76 — Tu vi đến từ linh mạch/thiền/nhiệm vụ) nên không có Tu vi để chia; cái chia nhau là TIẾN ĐỘ NHIỆM VỤ.
- Cách test: 2 tài khoản cùng nhận "Trừ khử Sói Xám", lập đội, đi săn CÙNG nhau (đứng gần nhau) — một người đánh, người kia mở panel nhiệm vụ sẽ thấy số đếm tăng theo.

## GĐ202 (30/10) — NGUYÊN ANH XUẤT KHIẾU
- Từ **Nguyên Anh** trở lên, thẻ nhân vật có nút **👻 Xuất khiếu** (mọi số đều TẠM): tốn 30% chân nguyên tối đa, nguyên thần rời thân tối đa 45 giây, hồi chiêu 180 giây.
- Nguyên thần: bay nhanh (×1.8, cộng cả ngự kiếm), **xuyên vật cản**, **quái không nhìn thấy** — hợp để do thám map nguy hiểm, tới điểm khám phá/manh mối ẩn ở nơi quái mạnh. Thân xác ngồi yên tại chỗ (người khác nhìn thấy như một bản sao đang thiền).
- Nguyên thần **không** đánh, không tung chiêu, không dùng đồ, không giao dịch được. Hết 45 giây, bay xa thân xác quá 2000 bước, hoặc bước sang map khác → **tự nhập thể** về đúng vị trí thân xác. Bấm nút lần nữa (🌕 Nhập thể) để về sớm. Rời game giữa chừng cũng tự nhập thể.
- Thành tựu "Xuất khiếu" (nhóm Công pháp, từng bị khóa) nay đã bật — xuất khiếu đủ số lần là lên bậc.
- Cách test: nhân vật Nguyên Anh ở quảng trường → bấm Xuất khiếu → bay một vòng quanh làng, thử bay xuyên nhà, bay thẳng về phía đông quá xa sẽ bị kéo về thân xác; để ý nhân vật mờ đi và thân xác còn ngồi ở quảng trường (nhờ tài khoản thứ hai nhìn giúp).

## GĐ203 (30/10) — THÊM 4 LOÀI THÚ CƯỚI + HIỆU ỨNG CƯỚI
- Trại Ngự Thú (Mã Vân, Ngự Thú Sơn Trang) nhận thuần hóa hộ thêm 4 loài (số TẠM): **Địa Kim Thử** ×1.35 (12k, 1 ngày), **Sa Mạc Hạt** ×1.40 (16k, 1 ngày), **Hỏa Thử** ×1.45 (20k, 2 ngày), **Tuyết Hồ** ×1.60 (28k, 2 ngày). Tổng **11 loài** — mốc thành tựu "10 loài thú cưỡi" giờ với tới được. Trứng thú cũng có tỉ lệ nhỏ nở ra 4 loài mới.
- **Hiệu ứng cưỡi**: khi chạy, dưới chân thú có vệt khói/bụi theo hệ của loài (Thiên Lôi Thú tím điện + tia lửa, Hỏa Thử cam + than lửa bay, Tuyết Hồ trắng tuyết, Thanh Vân Hạc mây lớn trôi chậm, loài thường bụi đất). Lên thú có vòng sáng màu của loài, xuống thú có bụp khói nhỏ.
- Cách test: tới trại đặt thuần hóa Tuyết Hồ, hôm sau (ngày game) nhận rồi cưỡi chạy quanh làng — nhìn vệt dưới chân thú và so màu giữa các loài; cưỡi thử Hỏa Thử/Thiên Lôi Thú để thấy tia lửa.
