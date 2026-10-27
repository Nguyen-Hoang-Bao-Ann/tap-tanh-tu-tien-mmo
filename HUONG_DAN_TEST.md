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

## GĐ97 — Sát Thủ: Sát Khí + Phản Xạ + Siêu Giác Quan

- Sát Thủ có thêm thanh Sát Khí tím trên thẻ nhân vật
  (dưới thanh thức ăn/nước uống, chỉ Sát Thủ mới thấy):
  đánh trúng quái +3, giết quái +25; bị đánh không tăng
  Sát Khí; Sát Khí không tự tụt, giữ nguyên qua thoát
  game rồi vào lại.
- Phản Xạ: Sát Thủ tự né đòn quái theo lượng Sát Khí —
  càng nhiều Sát Khí càng khó bị đánh trúng, tối đa né
  75% lúc đầy 100. Nút né Space vẫn dùng được như cũ
  (lướt nhanh một đoạn để đổi vị trí).
- Siêu Giác Quan: khi Sát Khí đầy 100 thì tự bật 8 giây —
  trong 8 giây đó quái đánh không trúng phát nào, đòn
  nào của bạn cũng chí mạng (mạnh gấp đôi), quái quanh
  người chậm lại một nửa. Hết 8 giây thì Sát Khí về 0,
  phải tích lại từ đầu.
- Sát Thủ nhìn thấy quái đang ẩn nấp (rắn độc, Địa Hành
  Yêu, quỷ tàng hình) từ xa hơn lớp khác một nửa.
- Chưa có: chế độc + bôi độc cho Sát Thủ — sẽ làm sau.

## GĐ98 — Sát Thủ: Chế độc + bôi độc lên vũ khí

- Độc Xà rơi Nọc Rắn tại chỗ gục (đi qua là nhặt như
  mọi đồ rơi). Lưu ý: rắn chỉ có ở Hắc Ám Đầm Lầy
  (map farm Trúc Cơ 7, đi từ Thanh Vân Thành) — map
  nhà không có rắn.
- Sát Thủ mở panel Nghề (nút 🔨) thấy mục riêng "☠️
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
  hồn chưa lìa — khớp cửa sổ gục ngã 60s).
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
  cắn, độc) không về làng ngay mà GỤC NGÃ 60s
  (hp 0, đứng yên, quái ngó lơ, hiện lớp phủ đếm
  ngược); Y Tu từng đạt 500 Y Đức (mở khóa vĩnh
  viễn) trong 300px dùng socket y_revive + nút
  riêng → người gục dậy tại chỗ, cùng map, 50%
  máu tối đa, người cứu +100 Y Đức. Hết 60s
  không ai cứu → về làng như cũ (quảng trường
  PLAZA 700,560 + ngẫu nhiên 20–95px). Chết do
  hết thọ nguyên (tọa hóa) vẫn vĩnh viễn, không
  cứu được. Người gục không đánh/chiêu/thiền/
  dịch chuyển được; thoát game lúc gục → đăng
  nhập lại đầy máu (không kẹt 0 máu).
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
