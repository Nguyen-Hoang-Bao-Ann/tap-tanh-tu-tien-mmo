# Tập Tành Tu Tiên — Khung Client-Server (bản nền tảng)

Monorepo 2 phần:

- `server/` — Node.js + Express + Socket.io, cổng **3001**.
  Mỗi client kết nối → 1 player (ID ngẫu nhiên, tọa độ X/Y ngẫu nhiên trong sân 800×600).
  Server phát sự kiện **`server_tick` 10 lần/giây** chứa danh sách mọi người chơi `[{id, x, y}]`.
  (Bản demo: player tự trôi nhẹ + có `DEMO_BOTS = 8` người chơi mô phỏng để mở Preview là thấy chuyển động ngay — chỉnh trong `server/index.js`.)
- `client/` — Phaser 3 + TypeScript + Vite, cổng **5173**.
  Scene 800×600, nghe `server_tick`, vẽ mỗi người chơi là 1 ô vuông xanh lá tại tọa độ X/Y,
  dùng **lerp** trong `update()` để chuyển động mượt giữa các tick. Ô viền trắng = chính bạn.

## Chạy

```bash
npm run install:all   # cài dependencies cả 3 nơi (chỉ lần đầu)
npm start             # GĐ5: tự build client rồi chạy server — CẢ GAME ở http://localhost:3001
npm run dev           # chế độ dev cũ: server :3001 + Vite :5173 (hot reload khi sửa client)
```

- **Chơi game: mở http://localhost:3001** (server phục vụ luôn giao diện game).
- Mở nhiều tab = nhiều người chơi cùng lúc.
- API kiểm tra: http://localhost:3001/api/status

## Kiến trúc chịu tải (định hướng 100 người chơi)

Socket.io + tick 10/giây + snapshot dạng mảng phẳng là đủ nhẹ cho ~100 kết nối đồng thời
trên 1 tiến trình Node. Khi mở rộng tiếp: tách vòng tick khỏi tiến trình HTTP (worker),
gửi delta thay vì toàn bộ danh sách, và chia phòng (room) theo khu vực bản đồ.

## Giai đoạn 2 — Điều khiển thật (đã xong)

- Client bắt **WASD / phím mũi tên**, tính vector (vx, vy) trong `update()` (đi chéo được chuẩn hóa)
  và gửi sự kiện **`client_input`** lên server mỗi khi vector thay đổi.
- Server lưu vector theo từng socket, tự cập nhật tọa độ trong tick: `x += vx * SPEED * 0.1`
  (SPEED = 260 px/giây), kẹp trong sân 800×600 — **server là chuẩn**, client chỉ hiển thị + lerp.
- Bot demo được làm mờ (alpha 0.13) phía client; ô viền trắng là chính bạn.
- Kiểm chứng: 2 client socket — giữ phải 0.5s → y không đổi, x tăng đúng từng tick 26px;
  giữ 4s → kẹp đúng biên x = 784; thả phím → đứng yên. Ảnh Preview 2 tab: `preview2-tab2-before/after.png`.

## Giai đoạn 3 — Nhân vật thật + đồng bộ hướng nhìn (đã xong)

- Server: player có thêm `direction` ("left"/"right"/"up"/"down", mặc định "down");
  khi di chuyển, hướng lấy theo trục vận tốc lớn hơn; đứng yên giữ hướng cuối.
  `server_tick` gửi kèm `direction`.
- Client: sprite nhân vật pixel-art 4 hướng dệt từ bản đồ pixel trong code
  (xuống = thấy mặt, lên = thấy gáy, trái/phải = profile), nhãn tên ID rút gọn trên đầu,
  vòng sáng dưới chân + tên vàng cho chính mình; độ sâu sắp xếp theo y.
- Kiểm chứng: test socket 6/6 đúng (mặc định down, 4 hướng, chéo theo trục lớn, thả phím giữ hướng);
  ảnh Preview 2 tab: `preview3-tab2-front/right/up.png`.

## Giai đoạn 4 — Bản đồ + Quái vật + Combat đồng bộ (đã xong)

- Bản đồ 1600×1200 nền cỏ ô gạch; camera bám nhân vật (khung hình 800×600).
- Server giữ mảng quái: 5 Sói, HP 100, AI lang thang / đuổi người chơi gần nhất
  (tầm 260px, tốc độ đuổi 120px/giây, dừng cách người ~26px); `server_tick`
  đổi sang dạng `{ players, monsters }`, quái gồm {id, x, y, hp, maxHp, direction}.
- Client vẽ quái = khối đỏ + mõm theo hướng + thanh máu trên đầu (đổi màu theo %HP).
- Combat: SPACE → `player_attack`; server kiểm tra tầm 50px, trừ 25 HP/đòn,
  hồi chiêu 350ms; chết → xóa quái + broadcast `monster_killed` (client hiện thông báo),
  hồi sinh quái mới sau 5s để bản đồ luôn đủ 5 con.
- Kiểm chứng: test socket 7/7 (tick có 5 quái HP 100; đánh ngoài tầm không mất máu;
  HP đi đúng 100→75→50→25→chết; broadcast đúng người hạ; quái biến mất; hồi sinh đủ 5).
  Ảnh: `preview4-approach/fight/kill.png`.

## Giai đoạn 5 — Gộp 1 địa chỉ + Làng Tân Thủ (đã xong)

- **Gộp vận hành:** Express phục vụ bản dựng `client/dist` + Socket.io trên cùng cổng 3001;
  `npm start` tự build client (prestart) rồi chạy server → cả game 1 địa chỉ, 1 lệnh.
  Client tự chọn: trang từ :3001 → socket cùng origin; từ Vite :5173 (dev) → trỏ :3001.
- **Làng Tân Thủ** (client vẽ + server giữ luật): quảng trường đá tròn với vòng trận pháp
  Bát Quái phát sáng (vòng quẻ xoay liên tục, 5 điểm Ngũ Hành) tại (700, 560);
  6 nhà có tên: Đạo Quán, Nhà Trưởng Làng, Tiệm Đan Dược, Tiệm Rèn, Quán Ăn, Tiệm Nguyên Liệu;
  ao sen; đường làng nối 4 cổng; hàng rào quanh làng; cây trang trí.
- **Luật server:** spawn tại quảng trường; nhà + ao là vật cản (di chuyển tách trục, trượt dọc tường);
  làng = **vùng an toàn** — quái sinh ngoài làng, không vào làng, không đuổi người trong làng;
  bot demo đi dạo trong làng. Khu ngoài làng = bãi farm.
- Kiểm chứng: test socket 6/6 (spawn tại quảng trường; không quái nào vào làng; không đi xuyên
  Đạo Quán — chặn ở mép y=389 khi nhà kết thúc y=360 + đệm 14; ra farm hạ sói bình thường;
  quái hồi sinh ngoài làng tại (1497, 455)). Ảnh: `preview5-village.png`, `preview5-farm-b.png`.
  (Chỉnh sau: dời Nhà Trưởng Làng + Tiệm Đan Dược lên y=425 để thông đường ngang của làng.)

## Giai đoạn 6 — Nhân vật thật + công thức file thiết kế (đã xong)

- **Tạo nhân vật:** client gửi `hello {token}` (token lưu ở localStorage của trình duyệt).
  Chưa có nhân vật → màn hình tạo (DOM): nhập tên, **bốc 7 chỉ số** (server bốc 1–10,
  tối đa 3 lượt, lượt 3 đảm bảo tổng ≥ 10 — server giữ kết quả, client không tự khai được),
  chọn 1 trong **9 lớp** → `create_character`. Nhân vật lưu ở `server/data/characters.json`
  theo token; vào lại là nhận ra ngay. (Tài khoản/mật khẩu thật để giai đoạn sau.)
- **Công thức đúng file thiết kế (B3), chạy phía server:** HP max = 100 + Khí huyết×10;
  Chân nguyên max = Thần thức×10, hồi 2 + Thần thức×0,2/giây; CDR = 0,40×Tốc độ/(Tốc độ+100);
  tốc độ chạy cộng nhẹ theo Tốc độ; đánh thường = 0,85 × (Công + 10) — lớp vật lý dùng
  Vật công, lớp phép dùng Pháp công, Phật/Quỷ tu lấy chỉ số công cao hơn; sát thương nhận
  × 100/(100 + Phòng tương ứng), tối thiểu 1. **10 điểm tự do** khởi đầu chưa cộng (giai đoạn sau cộng).
- **Sói Xám theo bảng quái của file:** HP 40, dame 5 (thay bộ số tạm 100/25 của GĐ4).
  Sói **cắn trả** người chơi trong tầm 42px, hồi chiêu cắn 1 giây, trừ theo Vật phòng.
- **Chết:** HP ≤ 0 → hồi sinh tại quảng trường làng, máu/Chân nguyên đầy (chết về làng
  không mất đồ như bản chơi đơn; thời gian chờ leo thang chưa áp dụng).
- Client: nhãn trên đầu = tên nhân vật, thanh máu trên đầu mọi người chơi, panel HUD
  góc trái (tên/lớp/HP/Chân nguyên/7 chỉ số), bị cắn → nháy đỏ, chết → thông báo.
- Kiểm chứng: test socket **17/17** — bốc chỉ số đúng luật; HP/Chân nguyên khớp công thức
  (KH=4 → 140 HP); đòn đầu trừ đúng 16 = 0,85×(9+10); sói cắn trừ đúng 5 = 5×100/(100+3);
  chết → hồi sinh quảng trường máu đầy; ngắt kết nối vào lại còn nguyên nhân vật.
  Hồi quy GĐ5 sau khi dời nhà: 6/6. Ảnh: `preview6-create.png`, `preview6-hud.png`, `preview6-farm-a.png`.

## Giai đoạn 7 — Công pháp + Tu vi + Cảnh giới/Đột phá (đã xong)

- **Linh căn:** nhân vật khởi đầu là Phàm nhân. Đứng trước cửa Đạo Quán bấm **E**
  → server bốc linh căn đúng tỷ lệ file (Đơn 10% / Song 30% / Tam 25% / Tứ 30% / Ngũ 5%,
  hệ đầu tiên là hệ chính) → lên **Luyện Khí tầng 1** + nhận **2 công pháp Cơ bản**.
  Chưa có linh căn thì hạ quái không được Tu vi (có thông báo nhắc đi đo linh căn).
- **Công pháp:** catalog tạm theo lớp nằm trong khung bậc của file (Cơ bản: hệ số 1.0,
  CD 0,5–2s, tốn 5–15 Chân nguyên; Luyện Khí: hệ số 1.6, CD 3–8s, tốn 20–50) — tên chiêu
  là bản tạm cho tới khi chuyển đủ dữ liệu 477 công pháp. Phím **1/2/3** tung chiêu
  (`cast_skill`): server kiểm tra tầm / hồi chiêu (giảm theo CDR) / Chân nguyên;
  sát thương = hệ số × (Công + 10) qua cùng đường công thức. Chiêu Luyện Khí (ô 3)
  học tại Đạo Quán từ Luyện Khí tầng 3 (điều kiện tạm).
- **Tu vi + đột phá:** Sói Xám (quái Yếu) **+3 Tu vi**/con cho người hạ. Nhu cầu tầng n
  = **200 × 1,12^(n−1)**. Đủ Tu vi → nút **Đột phá** sáng trên panel: lên tầng (tiểu cảnh
  thành công chắc chắn), nhận **2–5 điểm chỉ số**. Tới tầng 9 là viên mãn — Trúc Cơ để sau.
- **Cộng điểm:** trên panel, mỗi chỉ số có nút **+1** (điểm tự do tạo nhân vật) và **+2**
  (điểm đột phá) — đúng luật file: điểm về sau mỗi điểm cộng 2 chỉ số.
- Server cấu hình qua env: `PORT`, `TTT_CHAR_FILE`, `TTT_TUVI_NEED` (chỉ để test nhanh
  trên instance riêng; bản chính luôn dùng 200).
- Kiểm chứng: test socket trên instance test (nhu cầu 3) **14/14** trong 19 giây —
  linh căn Song hệ; chiêu ngoài tầm không tốn Chân nguyên; Kiếm Khí Trảm trừ đúng
  1,0×(Vật công+10); Ngự Kiếm Quyết trừ đúng 1,6×(Công+10); đột phá ×2; cộng điểm
  +2 → HP tối đa +20; vào lại còn nguyên tiến trình. Hồi quy bản chính: test làng 6/6.
  (Bài học test: vòng lặp farm phải có quãng nghỉ — quay tít không nghỉ làm nghẽn
  socket + tràn bộ nhớ tiến trình test; game không bị ảnh hưởng.)
  Ảnh: `preview7-linhcan.png`, `preview7-break.png`, `preview7-breakthrough.png`.

## Giai đoạn 8 — NPC + Linh thạch + Cửa hàng + Nhiệm vụ (đã xong)

- **NPC làng:** 3 NPC cố định do server quản lý, client vẽ sprite áo nâu + nhãn
  tên/vai trò: Trưởng Làng (trả nhiệm vụ), Chủ Tiệm Đan, Chủ Tiệm Nguyên Liệu —
  đứng cạnh cửa nơi mình phụ trách. Dân làng bot đi dạo giữ nguyên.
- **Linh thạch + rơi đồ:** Sói Xám chết rơi **3–8 Linh thạch** và **30% Nanh Sói**
  (đúng file thiết kế) nằm dưới đất 120 giây; đi qua gần (≤34px) là tự nhặt.
  Linh thạch hạ phẩm là tiền tệ (hiện trên HUD + trong túi đồ, phím **I**).
- **Cửa hàng** (đứng trước cửa, bấm **E** mở panel; server kiểm khoảng cách):
  Tiệm Đan Dược bán Đan Tụ Khí 30 LT / Hồi Xuân Đan 15 LT, mua lại 40% (12/6);
  Tiệm Nguyên Liệu bán Nanh Sói 12 LT, thu mua 5 LT. Giá là **bản tạm** (file
  thiết kế không chốt giá), luật bán lại 40% theo file. Dùng đan ngay trong túi:
  Đan Tụ Khí +50 Tu vi; Hồi Xuân Đan hồi 50% HP tối đa.
- **Nhiệm vụ** đúng cấu trúc file: nhận tại **Bảng Treo Thưởng** giữa quảng trường
  (đã vẽ bảng gỗ vào làng), trả tại **Nhà Trưởng Làng**. Hai nhiệm vụ lặp lại:
  *Trừ khử Sói Xám* (hạ 5 con → 25 LT) và *Thu thập Nanh Sói* (mang 3 nanh → 20 LT).
  Tiến độ hiện ngay trên HUD; làm xong có thông báo mời về trả.
- **Sửa bố cục làng:** Tiệm Nguyên Liệu dời lên y=262 (trước kê sát Nhà Trưởng Làng,
  khe cửa chỉ 17px trong khi bước đi 26px/tick khiến gần như không vào được tầm
  tương tác từ phía đông) — hành lang trước cửa giờ rộng 40px.
- Kiểm chứng: `client/test8.cjs` trên instance test **18/18** — nhận/trả đủ vòng
  nhiệm vụ, nhặt đồ rơi (Linh thạch ≥15 sau 5 con, đúng sàn 3/con), mua −30/−15/−12
  và bán +5 đều khớp số dư tuyệt đối, dùng Đan Tụ Khí +50 Tu vi, Hồi Xuân Đan hồi
  đúng 50% HP, vào lại còn nguyên sau mọi giao dịch. Hồi quy bản chính 6/6.
  (Bài học test: lái tự động phải đi theo điểm mốc qua hành lang trống + vòng cam kết
  khi bị tường chặn — lái tham lam đơn trục sẽ kẹt ở góc nhà; `client/steer.cjs`.)
  Ảnh: `preview8-quest.png`, `preview8-shop.png`, `preview8-inv.png`,
  `preview8-boardprobe.png` (bảng + NPC), `preview8-farm.png`. (Ảnh đồ rơi nằm đất
  chưa chụp được trong môi trường headless — nhân vật luôn tự nhặt trước khi kịp
  chụp; cơ chế rơi/nhặt đã chứng minh bằng test + log server.)

## Giai đoạn 9 — Đồ họa chuyển từ bản chơi đơn (đã xong)

Toàn bộ lớp vẽ trong thế giới được thay bằng đồ họa minh họa 2D của bản chơi đơn
(artifact): các hàm vẽ Canvas 2D của bản cũ được chuyển gần như nguyên văn vào
`client/src/gfx.ts`, nướng thành texture lúc khởi động (bake) rồi cho Phaser
phát lại theo khung — server/luật chơi/hình học làng **không đổi một dòng logic**
(server chỉ thêm 2 sự kiện thuần hiển thị `player_attacked` / `skill_cast` để
client khác máy phát tư thế ra đòn + đạn bay).

- **Thế giới**: nền cỏ họa tiết pixel + wash màu nước của bản cũ, đường đá cuội,
  quảng trường đá đồng tâm, ao sen, hàng rào có nan ngang + 4 cổng, cột đèn trụ
  đá + tinh thể, nhà 2,5D mái ngói 2 dốc có biển tên + đèn lồng (mỗi nhà 1
  texture, sắp chiều sâu theo chân nhà), cây tán 3 lớp, trang trí mặt đất gieo
  hạt giống cố định (cỏ/hoa/đá/nấm/lá rụng).
- **Vòng trận pháp Bát Quái**: phần tĩnh nướng vào nền (hào quang + vòng + tâm),
  lớp 8 quẻ ☰☱☲… xoay thuận + sao Ngũ Hành 5 màu xoay ngược bằng texture riêng,
  kèm hạt linh khí bốc lên liên tục.
- **Nhân vật**: đủ 9 lớp theo bảng phong cách bản cũ (áo/mũ/phụ kiện riêng —
  Thể tu nón lá + nắm đấm gấu 2 tay, Phật tu đầu trọc + chuỗi hạt, Pháp tu mũ
  nhọn + quạt…), 4 hướng × khung đứng/4 khung đi/khung tung chiêu; vũ khí đặc
  trưng theo lớp (bản MMO chưa có hệ thống vật phẩm vũ khí — mỗi lớp cầm vũ khí
  khởi điểm của lớp đó). NPC dùng áo riêng theo vai trò; bot dân làng dùng 5 bộ
  đồ dân làng; người chơi khác tung chiêu/đánh thường cũng phát tư thế nhờ 2 sự
  kiện hiển thị mới.
- **Quái**: sói vẽ nguyên bản cũ (2 hướng mặt × đứng/4 khung chạy/khung vồ cắn
  há miệng lộ nanh), nháy sáng khi trúng đòn, khung vồ đồng bộ nhịp cắn ~1s của
  server. Dơi + Thạch Quái đã nướng sẵn texture (server hiện mới có sói).
- **Sinh vật ambient phía client**: 6 gà (3 màu lông) + 3 vịt bờ ao đi dạo, mổ
  thóc, tự né người chơi — thuần hiển thị như bản cũ.
- **Đồ rơi**: Linh thạch = khối ngọc xanh xoay 45° phát sáng, Nanh Sói = nanh
  cong trắng ngà, có hào quang + nhấp nhô.
- **Hiệu ứng chiêu**: viên đạn phát sáng theo hệ linh căn chính của người tung
  (Kim/Mộc/Thủy/Hỏa/Thổ; người chơi khác chưa lộ linh căn nên tạm màu vàng
  trung tính), bay tới quái rồi lóe sáng khi chạm đích.
- Kiểm chứng: build sạch; test5 (GĐ5) + test8 (GĐ8) vẫn ALL PASS; ảnh chụp
  `preview9-world1.png`, `preview9-wolf1/2.png`, `preview9-fx*.png`.

## Đo tải 100 CCU — full logic game (`client/loadtest8.cjs`)

Script đo lại bài test tải 100 client socket.io thật sau khi server đã có đủ logic game
(GĐ6–8), thay cho bài đo GĐ3 (lúc đó mới chỉ có khung mạng):
- **Phase A** (12s): 100 client chỉ di chuyển liên tục — so sánh trực tiếp với số GĐ3
  (tick TB 98,8ms / p99 107ms, ~4,5KB/tick, CPU 4,3%, RAM ~100MB).
- **Phase B** (20s): 100 client CÓ nhân vật thật (bốc chỉ số + chọn lớp ngẫu nhiên),
  tự đi đo linh căn ở Đạo Quán rồi ra farm đánh sói + tung chiêu slot 0 —
  stress đường combat/AI quái/rơi đồ/Tu vi thật.
- Đo: số tick nhận/kỳ vọng, khoảng cách tick (TB/p99/max), payload KB/tick,
  CPU% + RAM của đúng tiến trình server đang listen cổng target (qua `ss`).

Chạy: `node client/loadtest8.cjs [--url http://localhost:3001] [--phase A|B|AB] [--clients 100] [--dry]`
(`--dry` = 2 client vài giây để kiểm tra script; nhân vật test tự dọn khỏi characters.json
sau phase B theo prefix token của lần chạy.)

**Chỉ chạy bản đủ 100 client khi server ở trạng thái ổn định** — không ai đang test/sửa
song song, vì 100 client sẽ làm nhiễu mọi bài test socket khác.

**Kết quả đo thật (21/10/2026, trên bản chính :3001, cùng máy loopback):**
- **Phase A** (di chuyển thuần, 12s): nhận đủ 120/120 tick; khoảng cách tick TB
  **100,4ms**, p99 106ms, max 111ms — ngang bằng thời GĐ3 (98,8/107ms) dù server đã
  nặng thêm 5 giai đoạn logic. Payload ~1,85KB/tick (gọn hơn mức 4,5KB của GĐ3),
  CPU **2,8%**, RAM 61→63MB (GĐ3: 4,3% / ~100MB).
- **Phase B** (full combat, 20s): 100/100 đo linh căn, **100 sói bị hạ**; nhận
  195/200 tick, TB **102,6ms**, p99 144ms, một spike max 449ms (lúc 100 client dồn
  đo linh căn + ồ ạt ra farm). CPU **2,6%**, RAM 64→73MB. Payload phình lên
  ~17,7KB/tick (trạng thái combat + đồ rơi của cả làng) → server phát tổng
  ~17MB/s: **băng thông ra là giới hạn cần để ý khi lên 100 người thật**, không
  phải CPU/RAM. Chiêu thức ghi nhận thành công chỉ 2 lượt trong cửa sổ đo — bot
  chủ yếu hạ sói bằng đánh thường (đường chiêu đã kiểm chứng riêng ở GĐ7).
- Sau đo đã dọn toàn bộ nhân vật test khỏi `characters.json` (gồm 2 nhân vật sót
  của lượt chạy thử bị server tự lưu đè lại — đã xóa và khởi động lại server).

## Tối ưu băng thông tick (phương án A+B, 21/10/2026)

Khắc phục nút thắt ~17MB/s phát hiện ở lần đo tải sau GĐ8, **không đổi luật
chơi** — chỉ đổi cách server phát trạng thái:

- **A — Tách trường tĩnh khỏi tick:** tên/lớp/cảnh giới/tầng/maxHp/maxMp của
  người chơi, maxHp của quái chỉ gửi khi THAY ĐỔI (đột phá, cộng điểm...);
  3 NPC tĩnh chỉ gửi 1 lần trong bản FULL lúc client mới vào.
- **B — Delta:** mỗi tick `server_tick` (định dạng `v: 2`) chỉ chứa entity có
  thay đổi, mỗi entity chỉ chứa trường đã đổi, kèm danh sách `*Gone` cho
  entity biến mất. Client mới kết nối nhận riêng 1 bản `full: true` rồi gộp
  delta tiếp (client trình duyệt gộp trong `mergeTick` ở `main.ts`; client
  thô/test dùng chung `client/worldmerge.cjs`).
- **Đo lại 100 CCU** bằng chính `loadtest8.cjs` trên :3001, so với trước:
  Phase A payload 1,85KB → **0,48KB/tick**; Phase B (full combat) 17,7KB →
  **4,69KB/tick**, tổng phát ~17MB/s → **~4,6MB/s** (giảm ~73%) — VPS
  100Mbps (~12,5MB/s) giờ dư địa gấp ~2,7 lần cho 100 người combat. Tick vẫn
  10/s (TB 100,5–103,1ms), CPU ~2,5–2,8%, RAM ~75MB. Hồi quy: test5 + test7
  (TTT_TUVI_NEED=5 trên :3002) + test8 đều ALL PASS; ảnh kiểm chứng
  `preview-delta1.png`.

## Giai đoạn 10 — Tài khoản + màn hình chờ + tùy chỉnh (21/10/2026)

Luồng vào game hoàn chỉnh thay cho cơ chế "mở trang là vào thẳng":

- **Màn hình chờ (splash):** ảnh bìa `client/public/splash.jpg` lấy nguyên từ
  bản game cũ (bản chơi đơn), tiêu đề vàng kim + thanh tiến trình tải, các nút
  Đăng nhập / Đăng ký / Chơi nhanh / Thoát (Thoát hiện ghi chú như bản cũ:
  bản web không tự đóng tab được).
- **Tài khoản (server `server/data/accounts.json`):** đăng ký/đăng nhập bằng
  tên tài khoản + mật khẩu băm **scrypt + salt** (không lưu mật khẩu thô);
  phiên đăng nhập là token ngẫu nhiên giữ trong RAM, client lưu ở
  localStorage (`ttt_session_v1`), tải lại trang tự khôi phục tới danh sách
  nhân vật. Mỗi tài khoản tối đa **3 nhân vật** (tạo / chọn / xóa), nhân vật
  nằm chung `characters.json` với khóa `acc-…` và trường `account`.
- **Chơi nhanh (khách):** giữ nguyên luồng token trình duyệt cũ — 1 trình
  duyệt 1 nhân vật, tương thích toàn bộ test cũ.
- **Tùy chỉnh nhân vật:** lúc tạo chọn thêm **giới tính** (Nam/Nữ — đổi kiểu
  tóc trong hàm vẽ) và **màu áo** (8 màu + mặc định theo lớp), có **ảnh xem
  trước trực tiếp** vẽ bằng chính hàm đồ họa trong game. Trong game mở
  **Menu (⚙ / Esc)**: đổi màu áo áp dụng ngay cho mọi người chơi khác thấy
  (trường `robe` đi theo tick delta) + lưu lại; nút **Thoát về màn hình
  chính** (giữ phiên) và **Đăng xuất**.
- Kiểm chứng: `client/test10.cjs` **13/13 PASS** (đăng ký trùng, sai mật khẩu,
  tạo/chọn/xóa nhân vật, khôi phục phiên, robe hợp lệ/không hợp lệ); hồi quy
  test5 + test7 + test8 **ALL PASS**; ảnh `preview10-splash.png`,
  `preview10-create.png`, `preview10-ingame2.png`, `preview10-menu.png`,
  `preview10-charlist.png`.

## Giai đoạn 11 — Vũ khí theo hướng tu + màu áo pastel (21/10/2026)

Theo phản hồi người chơi sau GĐ10:

- **Màu áo:** bảng màu cũ bị chê "lố, chói mắt" → đổi toàn bộ sang **tông nhạt
  pastel** (8 màu), đồng thời giảm hệ số bão hòa khi vẽ áo (`sat` 1.35 → 1.18
  trong `GFX_CONFIG.style`). Nhân vật đã tạo với màu cũ được **tự chuyển**
  sang màu nhạt tương ứng khi vào game (bảng `ROBE_MIGRATE` phía server).
- **Chọn hướng tu:** bỏ hẳn nhãn "Vật công / Pháp công / Cả hai công" trên ô
  chọn lớp — mỗi ô chỉ hiện tên hướng tu + **danh sách loại vũ khí** của
  hướng đó.
- **Vũ khí khởi đầu (đúng file thiết kế):** dữ liệu lấy từ 2 bảng "Vũ khí
  khởi đầu" và "Vũ khí khởi đầu bổ sung" trong file thiết kế — mỗi hướng tu
  có 2–6 vũ khí (Thể tu 6, Sát thủ 4, Phật/Quỷ/Kiếm/Pháp/Y/Nho 3, Cốt 2; tổng
  30 lựa chọn tính cả Ngâm thơ của Nho tu; con số "28 vũ khí" nằm ở file
  Excel chưa đọc được). Tạo nhân vật chọn 1 vũ khí: ô chọn hiện tốc độ ra
  chiêu / mức đòn / tốn linh lực / tầm + đặc điểm theo file, ảnh xem trước
  cầm đúng vũ khí, hình trong game vẽ đúng loại (phủ, thương, côn, chùy,
  khiên, cờ, liềm, trảo, cầm, trục... — hàm vẽ vũ khí có sẵn từ bản cũ).
- **Đánh thường theo vũ khí (server là chuẩn):** hồi chiêu theo tốc độ của
  file (Nhanh 0,5s / Trung bình 0,8s / Chậm 1,4s — chuẩn hoá quanh nhịp
  Trung bình hiện tại), hệ số mỗi đòn tỉ lệ với hồi chiêu để vũ khí nhanh
  yếu / chậm mạnh mà sát thương mỗi giây gần bằng nhau như nguyên tắc của
  file. Vũ khí tầm xa (Pháp tu, Y tu, Nho tu, Phật châu, Cờ lệnh...) đánh
  thường từ xa 150px và có đạn bay như chiêu. HUD và danh sách nhân vật
  hiện "Hướng tu · Vũ khí".
- Kiểm chứng: `client/test11.cjs` **10/10 PASS** (vũ khí sai lớp tự về vũ
  khí đầu, tầm xa trúng ở 117px, cận chiến hụt ở 120px, hồi chiêu Chậm
  chặn đòn nối tiếp); hồi quy test5 + test7 + test8 **ALL PASS**, test10
  **13/13**; ảnh `preview11-create-the.png`, `preview11-ingame.png`.

## Giai đoạn 12 — Nhân vật kiểu pixel (22/10/2026)

Theo ảnh mẫu sprite pixel người chơi gửi (chibi 80×80, 8 khung đi bộ):

- Ảnh mẫu chỉ có 1 nhân vật / 1 hướng nên không thể thay trực tiếp cho game
  9 lớp × 30 vũ khí × 4 hướng. Thay vào đó, toàn bộ pipeline nướng texture
  nhân vật chuyển sang **phong cách pixel**: vẽ ở độ phân giải thấp (mỗi
  "pixel" = 3 đơn vị vẽ, `PERSON_PIXEL` trong `gfx.ts`) rồi phóng to với
  `imageSmoothingEnabled = false` + bộ lọc NEAREST của Phaser — cạnh ô
  vuông rõ nét như sprite pixel thật.
- Áp dụng cho **mọi nhân vật**: người chơi (đủ lớp/vũ khí/màu áo/giới tính),
  NPC, dân làng/bot — vì tất cả đều qua chung một hàm nướng. Ảnh xem trước ở
  màn tạo nhân vật và thẻ chọn nhân vật cũng pixel đồng bộ. Logic game,
  chỉ số, hoạt ảnh (4 hướng × đi/đứng/tung chiêu) giữ nguyên 100%.
- Kiểm chứng: ảnh `preview12-ingame.png` + `preview12-closeup.png` (cận
  cảnh thấy rõ ô pixel trên nhân vật), hồi quy test5 ALL PASS.
- Nếu có bộ spritesheet đầy đủ (đủ hướng/đủ khung, ví dụ từ AutoSprite) thì
  gửi sang — sẽ thay hẳn bằng sprite thật thay cho bản vẽ bằng code này.

## Giai đoạn 13 — Sprite nhân vật pixel thật (22/10/2026)

Người chơi gửi bộ sprite export từ AutoSprite (nhân vật tu tiên áo teal,
tay không) và bản pixel-hoá ở GĐ12 bị chê "thô xấu" → thay bằng sprite thật:

- Bộ gốc: idle 8 hướng (80×80) + đi bộ 5 hướng × 4 khung (112×112), nền
  trong suốt. Đã **chuẩn hoá mọi khung về khổ 96×96, căn giữa + căn chân
  (y=94)** để không nhảy hình khi đổi hướng/khung — file nằm ở
  `client/public/sprites/hero/` (idle-<hướng>.png, walk-<hướng>-<0..3>.png),
  Phaser nạp ở `preload()`.
- **Người chơi thật** (mình + người khác) dùng sprite này: đủ 4 hướng
  đứng/đi, khung tung chiêu tạm dùng khung bước (bộ sprite chưa có khung
  đánh riêng). Cỡ hiển thị ~57px, ngang bản vẽ cũ. Nạp lỗi thì tự lùi về
  bản vẽ code.
- **Đánh đổi nói rõ:** bộ sprite chỉ có 1 hình — tạm thời mọi lớp/vũ khí/
  màu áo/giới tính **không phân biệt bằng hình nhân vật** (vẫn hiện đầy đủ
  ở HUD, thẻ nhân vật, danh sách chọn). Khi có thêm bộ sprite theo lớp
  (đúng định dạng export này) thì gắn thêm từng lớp một.
- NPC + dân làng/bot: giữ bản vẽ code nhưng **tắt pixel-hoá** của GĐ12
  (`PERSON_PIXEL = 1`, về nét mượt như GĐ11).
- Ảnh xem trước ở màn tạo nhân vật + thẻ chọn nhân vật cũng hiện sprite
  thật. Kiểm chứng: `preview13-ingame.png` (đứng tại quảng trường),
  `preview13-walk.png` (đi hướng đông), `preview13-create.png`; test5 ALL PASS.

## Giai đoạn 14 — Học style từ sprite gốc, sinh NPC + dân làng (22/10/2026)

Từ bộ sprite PixelLab của người chơi, trích xuất kỷ luật style (bảng màu
26 màu theo cụm: áo teal 7 tông, tóc 5 tông, da 4 tông, vàng đồng...) rồi
suy ra thêm asset bằng thay bảng màu theo bậc sáng (giữ nguyên shading):

- **Trưởng Làng** (`elder`): áo chàm trầm + tóc hoá bạc + **râu bạc vẽ thêm
  từng pixel** bám theo cụm da mặt (hướng nam/đông/tây).
- **Chủ Tiệm Đan** (`shopdan`): áo nâu gỉ. **Chủ Tiệm Nguyên Liệu**
  (`shopnl`): áo xanh ô-liu.
- **Dân làng/bot** (`villager-a/b/c`): áo xanh bụi / tím mận / nâu cát —
  bot đi dạo trong làng giờ dùng sprite thật thay cho hình vẽ code.
- Mỗi bộ đủ 24 khung (idle 4 hướng + walk 4 hướng × 4) ở
  `client/public/sprites/<bộ>/`; client nối theo vai trò
  (`NPC_SPRITE_SET`, `BOT_SPRITE_SETS`), nạp lỗi thì lùi về hình cũ.
- Bộ kit để người chơi tự sửa bằng LibreSprite/Aseprite nằm ở
  `assets/style/`: `palette.gpl` (bảng màu chuẩn), `palette.png`,
  `gen_variants.py` (script sinh biến thể — đổi tông/làm tóc bạc/thêm râu).
- Kiểm chứng: `preview14-plaza.png` (quảng trường toàn sprite),
  `preview14-elder.png` (Trưởng Làng tại nhà), test5 ALL PASS.

## Giai đoạn 15 — Pixel hoá nốt quái, nhà, cây, môi trường (22/10/2026)

Hàm `pixelSnap` trong gfx.ts: thu texture về lưới pixel thật rồi bắt mọi
màu về bảng màu giới hạn theo nhóm vật liệu (suy từ style sprite gốc):
nền đất/đường/ao/hàng rào (PAL_ENV), nhà + bảng treo thưởng (PAL_HOUSE —
biển tên vẫn đọc rõ), cây, sói (PAL_WOLF đã nới sáng), dơi, thạch quái,
gà/vịt. Nhân vật + môi trường + quái giờ chung một chất pixel.
Chưa đổi (cố ý): đồ rơi và viên đạn chiêu — là hiệu ứng phát sáng nên giữ
nét mượt; vòng quẻ Bát Quái giữ nguyên.
Kiểm chứng: `preview15-village.png`, `preview15-wolf.png`, test5 ALL PASS.

## Giai đoạn 16 — Sprite theo lớp + vũ khí cầm tay + hoạt ảnh ra đòn (22/10/2026)

Theo phản hồi "bản cũ làm chung chung quá" — làm lại toàn bộ hình vũ khí:

- **Vũ khí pixel vẽ riêng từng loại** (28 hình ở `client/public/sprites/
  weapons/`): chiến phủ ra rìu, kiếm ra kiếm, thương ra thương, cờ lệnh,
  lưỡi hái, cốt thuẫn, cốt chùy, phật châu, bình bát, quạt, phất trần,
  kim châm, cổ cầm, bút phép, quyển trục, sách phép... mỗi loại một
  silhouette riêng, vẽ theo bảng màu chuẩn của game.
- **Cầm trên tay thật**: lớp phủ vũ khí bám theo tay nhân vật (nằm sau lưng
  khi quay lên), song kiếm/song đao cầm 2 tay. Hoạt ảnh ra đòn theo nhóm:
  **vung** (kiếm/rìu/đao/chùy/liềm/quạt/trảo), **đâm** (thương/dao găm/
  kim châm), **nâng kết ấn** (trượng/châu/bát/cờ/sách/trục/bút/đàn/phất
  trần), **giơ thủ** (khiên). Đi bộ lắc theo nhịp bước, đứng yên đung đưa.
- **Sprite theo từng lớp**: 9 bộ `cls-<lớp>` đổi tông áo theo màu đặc
  trưng của lớp (Sát thủ áo đen đai đỏ, Phật vàng hổ phách, Quỷ đỏ thẫm).
  Đánh đổi: màu áo pastel tự chọn tạm không áp lên sprite (ưu tiên màu lớp).
- **Nét hình**: bật `pixelArt: true` cho Phaser (NEAREST toàn cục + làm
  tròn điểm ảnh) — hết rung/mờ khi di chuyển lẻ pixel.
- Kiểm chứng: `preview16-create/idle/swing.png`; test5 ALL PASS +
  test11 10/10 (lượt đầu treo 69 phút vì quên mở server test :3006 —
  test chờ kết nối không có timeout; đã rõ nguyên nhân, không phải lỗi game).

## Giai đoạn 17 — Vũ khí hoàn thiện cao + HUD mobile MMO + điều khiển cảm ứng (22/10/2026)

- **Vũ khí vẽ lại bản hoàn thiện cao** (script `assets/style/draw_weapons.py`):
  khổ 64×80 (trước 48×56), 3–4 tông bóng đổ mỗi chất liệu, chi tiết trang
  trí riêng: kiếm có ngọc ở chắn tay + cán quấn chỉ chéo, thương có tua đỏ,
  cờ lệnh có chữ vàng + tua, quạt có mặt trời đỏ, phất trần chùm lông 2 tông.
  Điểm cầm mới (32, 66) — đã đồng bộ origin/xem trước trong client.
- **HUD kiểu mobile MMO** (theo ảnh mẫu Võ Lâm Pixel của người chơi):
  khung nhân vật có **avatar tròn** (cắt từ sprite theo lớp) + thanh HP/
  Chân nguyên/Tu vi; **banner khu vực** giữa trên ("Làng Tân Thủ · An toàn"
  / "Bãi Săn Sói · Nguy hiểm"); **minimap** góc phải (nhà, ao, NPC vàng,
  sói đỏ, người chơi trắng, mình vàng có vòng); cột nút 🎒📜⚙ bên phải.
  Màn hình game co vừa mọi kích thước (Phaser Scale FIT) — web và điện
  thoại dùng chung một bố cục.
- **Điều khiển cảm ứng** (chỉ hiện trên thiết bị cảm ứng): **joystick ảo**
  analog trái dưới (kéo càng xa chạy càng nhanh — server đã nhận vector
  −1..1), cụm nút tròn phải dưới: **⚔ đánh lớn**, 3 nút chiêu theo tên
  công pháp (mờ khi hồi chiêu), nút **E** tương tác theo ngữ cảnh. Trên
  điện thoại khung nhân vật thu gọn (chạm để mở bảng chỉ số/cộng điểm),
  minimap thu nhỏ nhường chỗ cụm nút. Phím WASD/Space/1-3/E/I giữ nguyên
  trên máy tính; thao tác dùng chung một hàm xử lý.
- Kiểm chứng: `preview17-desktop.png`, `preview17-mobile.png` (giả lập
  iPhone ngang 844×390) — kéo joystick bằng sự kiện chạm thật: nhân vật
  chạy x 785 → 1256. test5 ALL PASS.

## GDD mở rộng — Dữ liệu + module logic (22/10/2026, theo tài liệu mở rộng của người chơi)

Chưa nối vào gameplay (bản Alpha hiện tại mới tới Luyện Khí/Trúc Cơ) — đây là
tầng dữ liệu + logic data-driven sẵn sàng cho giai đoạn Kim Đan về sau:

- `server/data/gdd/MapData.json`: 52 map (50 map của tài liệu: 10 thành phố,
  15 nghề phụ, 10 farm, 15 Ngũ Hành + 2 map hiện có), có minRealm/minTier.
- `server/data/gdd/MonsterData.json`: 21 quái (3 quái gốc theo số docx,
  còn lại tài liệu cho tên/cơ chế — chỉ số gắn cờ placeholder).
- `server/data/gdd/SkillData.json`: 140 công pháp Kim Đan (28 nhóm vũ khí ×
  5 hệ, mô tả chép nguyên văn), 100 đa dụng (50 bộ pháp/20 phòng thủ/10 hỗ
  trợ/10 khống chế/10 sinh tồn), 15 công pháp ẩn, 15 bộ khiếm khuyết, 15 cấm
  thuật. Mục tài liệu chỉ cho số lượng được sinh hệ thống, gắn cờ generated.
- `server/data/gdd/NPCData.json`: 25 map × 200 NPC (50 chính + 150 phụ theo
  đúng cơ cấu tài liệu) = 5.000 NPC.
- `server/gdd/MapManager.js`: kiểm tra cảnh giới khi vào map, cấp quái + NPC.
- `server/gdd/FragmentManager.js`: `combine_fragments()` ghép mảnh khiếm khuyết.
- `server/gdd/HiddenQuestService.js`: `check_hidden_quests()` theo điều kiện
  (map/giờ/vật phẩm/cảnh giới), mỗi công pháp ẩn 1 chủ (is_claimed), truyền
  thừa tối đa 2 người 70-80%, lưu trạng thái ra file khi có stateFile.
- Sinh lại dữ liệu: `python3 assets/gdd/gen_gdd_data.py`. Test:
  `node server/gdd/test_gdd.cjs` — 23/23 PASS.

## GĐ18 — Đối chiếu GDD mở rộng với bản game + nền lát đá (22/10/2026)

- **Đối chiếu dữ liệu GDD** (script sinh dữ liệu là nguồn sự thật, `meta.version: 2`):
  mã cảnh giới dùng đúng mã server (`pham/lk/tc/kd/na/ht`); Tu vi quái theo
  công thức thiết kế gốc (nền 3/4/8/12/75 × 1.12^(bước đầu bậc−1), boss Kim
  Đan = 577); công pháp Kim Đan có thêm `coef 3.0 / cost 150-250 / cdMs /
  rangePx` theo khung Áo nghĩa của game; nghề phụ khớp 5 nghề của game
  (Luyện Khí Sư, Phù Sư); bổ sung `realmFeatures` (4 kỳ Kim Đan), `hiddenPaths`
  (LK Viên Mãn/Luyện Hồn/Nhập Đạo — số năm X/Y/Z chờ chốt), `daoPaths`
  (Tiên/Ma Đạo); map có cờ `impl: live/planned`, Làng Tân Thủ nối 3 NPC thật.
  Test GDD nâng lên 27/27 PASS.
- **Nền lát đá** (món nợ từ GĐ17, theo ảnh mẫu Võ Lâm Pixel): quảng trường
  lát đá cuội toàn bộ (viên bo tròn lệch hàng, mạch vữa tối) dưới vòng Bát
  Quái; nền trong hàng rào làng phủ đất nện + sỏi, tách khỏi cỏ hoang.
  Ảnh `preview18-plaza.png`; test5 ALL PASS + test11 10/10.

## GĐ19 — Đột phá Trúc Cơ: thang 18 bước B6 + trùm thử thách (22/10/2026)

- **Thang đột phá** theo thiết kế gốc B6 (thay luật cũ "ngẫu nhiên 2–5 điểm"):
  Tiểu cảnh +3 (LK) / +4 (TC) điểm; Trung cảnh (đích bước 4/7/13/16) +5/+6;
  Đại cảnh LK9→TC1 +12 điểm. Điểm đột phá vẫn +2/chỉ số như cũ.
- **Trung cảnh**: cần Đan Trung Cảnh + thắng **Thử Luyện Thú** tại sân Đạo
  Quán (nút HUD đổi nhãn theo ngữ cảnh; trùm = 4× máu tinh anh cùng bậc,
  công = tinh anh; chỉ chủ nhân đánh/ bị đánh; quá 5 phút hoặc gục ngã → tan,
  đan chưa trừ). **Đại cảnh**: cần Đan Trúc Cơ + thắng **Tâm Ma Ảnh**
  (HP 6× tinh anh, công ×1.3, tung chiêu hệ số 1.6 mỗi 4s, HP ≤50% phân
  thân 2 bóng 20% máu) + tỉ lệ thành công theo công thức file: 0.60 + 0.10
  Đan Hộ Mạch (tự tiêu) + 0.10 chỉ số chính ≥ 40 − 0.05×(số linh căn − 1)
  + 0.10×thua liên tiếp; kẹp [0.10, 0.95]; thua 3 lần liên tiếp → lần kế
  chắc chắn. Hậu quả thua: 50% mất 30% Tu vi; 35% mất 50% Tu vi (gốc: −10
  năm tuổi thọ — bản online chưa có tuổi thọ, quy đổi tạm); 15% toàn bộ chỉ
  số gốc −10% vĩnh viễn (tối đa 3 lần). TC9→Kim Đan: chặn "chưa mở" (V1).
- **Thích ứng bản online (đã báo người chơi)**: bỏ bế quan theo ngày (không
  có đồng hồ ngày), bỏ cộng tỉ lệ từ tài năng/năm tháng (chưa có 2 hệ đó);
  giá đan TẠM: Trung Cảnh 200, Trúc Cơ 800, Hộ Mạch 300 LT (bán lại 40%).
- Trúc Cơ farm sói vẫn +3 Tu vi (theo bậc của quái). Hình trùm: Thạch Quái
  pixel (Tâm Ma nhuộm tím) + nhãn tên; test19.cjs **15/15 PASS** (chạy thật
  qua socket, có vá file bỏ qua farm); test5/test7 ALL PASS, test11 10/10
  (file test sạch — file cũ tích lũy nhân vật gây FAIL giả, đã xác minh).

## GĐ20 — Đồng hồ thế giới + tuổi & tuổi thọ (22/10/2026)

- **Đồng hồ dùng chung toàn server** (server là chuẩn): 1 ngày game = 24
  phút thật — người chơi chốt **đêm trôi nhanh hơn ngày**: ban ngày
  06:00–18:00 chiếm 16 phút (1 giờ game = 80 giây thật), ban đêm 18:00–06:00
  chiếm 8 phút (1 giờ game = 40 giây thật, nhanh gấp đôi). Ngày mới bắt đầu
  00:00; 1 năm = 12 tháng × 30 ngày = 360 ngày. Lưu ở `server/data/world.json`
  và **chạy tiếp theo thời gian thật khi server tắt** (mở lại cộng dồn đúng).
  Phát xuống client khi giờ đổi (kèm bản FULL lúc vào game) — gần như không
  tốn thêm băng thông. Env test: `TTT_DAY_REAL_MS`, `TTT_WORLD_FILE`,
  `TTT_WORLD_START_MINUTES`.
- **HUD**: pill đồng hồ dưới banner khu vực — ☀️/🌙 + "Ngày · Tháng · Năm —
  Giờ <12 canh> (HH:MM)"; **lớp phủ sáng/tối** theo giờ (đêm sâu tối 34%,
  rạng đông/chạng vạng chuyển dần ~2 giờ game; HUD nằm trên lớp phủ nên vẫn
  đọc rõ). Sự kiện `world_day` + toast khi qua ngày mới.
- **Tuổi + tuổi thọ**: nhân vật mới roll tuổi khởi đầu 10–25, tuổi thọ
  50–100 (đúng file); tuổi tăng theo năm thế giới; khung nhân vật hiện
  "🎂 Tuổi — Thọ nguyên còn X năm" (đỏ khi ≤ 5 năm). Nhân vật cũ: TẠM
  16 tuổi / thọ 80. Hết thọ: đợt này mới cảnh báo, chưa xử "tọa hóa".
- **Gắn lại vào đột phá B6** (GĐ19 từng phải tạm bỏ): cộng thọ Trung cảnh
  LK +5 / TC +10, Đại cảnh +50 năm; thua Đại cảnh mức trung bình về đúng
  gốc **−10 năm tuổi thọ** (bỏ quy đổi tạm sang Tu vi).
- **Tu vi theo ngày**: qua ngày mới người online **+1 Tu vi** (tu luyện
  thường — đúng file); offline quay lại cộng dồn theo số ngày vắng, trần
  30 ngày (TẠM chống lạm dụng — file không ghi). Bế quan +3/ngày: đợt sau.
- Test `client/test20.cjs` **14/14 PASS** (tốc độ ngày ~180 vs đêm ~360
  phút game/giây ở thang test, rollover + sự kiện ngày mới, cộng offline,
  Trung cảnh +5 năm thọ chạy thật qua socket). Hồi quy: test5 ALL PASS,
  test11 10/10, test19 15/15. Ảnh `preview20-day.png` / `preview20-night.png`.

## GĐ21 — Nghỉ offline: về nơi an toàn, ngồi thiền / ngủ (22/10/2026)

- **Thoát game ≠ biến mất**: khi ngắt kết nối, nhân vật tự trở về điểm an
  toàn gần nhất — hiện tại là **sân trước Đạo Quán** (chế độ chơi 1 mình);
  trường `homeType` ('daoquan' | 'tongmon' để dành) sẵn sàng cho đợt tông
  môn. Nhân vật ở lại trong thế giới dạng bản offline: người khác nhìn thấy,
  không điều khiển được, quái không chạm tới; server khởi động lại dựng lại
  các bản offline từ file. Thử thách đột phá dang dở bị hủy khi thoát.
- **Học Tọa Thiền** tại Đạo Quán (điều kiện: đã đo linh căn; phím E tại Đạo
  Quán theo thứ tự: đo linh căn → học Tọa Thiền → học công pháp Luyện Khí).
  Đã học → lúc offline **ngồi thiền**: hấp thụ linh khí **+3 Tu vi/ngày**
  (tỉ lệ bế quan của file). Chưa học → **ngủ**: **+0** (không hấp thụ).
  Người online vẫn +1/ngày như GĐ20. Trần cộng dồn khi server tắt: 30 ngày
  (TẠM). Luật này thay cách cộng offline +1/ngày của GĐ20.
- **Tổng kết khi quay lại**: server ghi sổ quãng nghỉ (số ngày + Tu vi) kể
  cả khi tick đã cộng trực tiếp; đăng nhập lại hiện toast "🧘 đã tọa thiền
  X ngày… +Y Tu vi" hoặc "💤 đã ngủ X ngày — chưa học Tọa Thiền…".
- Client: nhãn trên đầu nhân vật offline thêm 🧘/💤 + thân hơi mờ; số
  "Người chơi trực tuyến" không đếm người đang nghỉ offline.
- Test `client/test21.cjs` **13/13 PASS** (học thiền → thoát ở bãi farm →
  bản offline tự về sân Đạo Quán dạng meditate → qua ngày +3; nhân vật chưa
  học → sleep → +0; boot lại server vẫn dựng được bản offline — kiểm cả
  bằng ảnh `preview21-rest.png`). Hồi quy: test5 ALL PASS, test20 14/14
  (đã cập nhật kỳ vọng offline theo luật mới).
- Chưa có sprite tư thế ngồi thiền/ngủ (bộ sprite PixelLab không có khung
  ngồi) → nhân vật đứng yên + nhãn trạng thái; điểm nghỉ xếp lưới 5 cột ở
  sân Đạo Quán, đông người có thể trùng ô.

## GĐ22 — Tọa Thiền là công pháp tiện ích phải kiếm học + 2 con đường khởi đầu (22/10/2026)

Theo chỉnh sửa của người chơi:

- **Tọa Thiền = công pháp tiện ích** (nhóm Hỗ trợ tu luyện), KHÔNG còn học
  miễn phí ở Đạo Quán (đã gỡ sự kiện `learn_meditation`). Cách học: hạ Sói
  Xám có **8% rơi Sách Tọa Thiền** (tỉ lệ TẠM — file không ghi), nhặt vào
  túi, bấm **Dùng** khi đã có linh căn → học được, sách bị tiêu hao.
- **2 con đường khởi đầu** (đúng file thiết kế / bản chơi đơn), chọn ngay ở
  màn tạo nhân vật:
  - 🚶 **Tu luyện một mình**: phần thưởng 100%, nghỉ offline tại Đạo Quán.
  - 🏯 **Gia nhập Thanh Phong Môn** (môn phái nhỏ): **2 đồng môn AI** đi
    theo hỗ trợ — chỉ số **70%** của chủ nhân, tự bám theo + lao vào đánh
    phụ quái quanh chủ (kể cả hạ gục, thưởng ghi cho chủ); phần thưởng
    **×2/3** (chia cả đội — mức bản chơi đơn đã chốt: Tu vi hạ sói +2 thay
    vì +3, Linh thạch rơi cũng nhân 2/3). Nghỉ offline tại tông môn.
- **Sân Thanh Phong Môn** mới ở phía đông làng (nhà mái xanh + sân đất nện
  300×240): vùng **an toàn** thứ hai — quái không sinh, không đuổi, không
  lọt vào. Banner khu vực hiện "🏯 Thanh Phong Môn · An toàn".
- Nhân vật cũ (tạo trước GĐ22) mặc định đường Một mình.
- Test `client/test22.cjs` **10/10 PASS**; test21 cập nhật theo luật sách:
  **15/15 PASS** (Đạo Quán không dạy miễn phí nữa; dùng sách học được; thiền
  +3/ngày, ngủ +0 như cũ). Hồi quy test5 ALL PASS, test20 14/14.
- ⚠️ **Đóng gói zip từ GĐ22**: LOẠI `server/data/characters.json`,
  `server/data/accounts.json`, `server/data/world.json` khỏi zip — tránh ghi
  đè dữ liệu thật của người chơi khi họ giải nén đè lên thư mục cũ (lỗi đã
  xảy ra ở zip GĐ20/GĐ21, đã báo và hướng dẫn cập nhật an toàn).

## GĐ23 — Bế quan chủ động tại Tụ Linh Trận (Thiền Phòng sau Đạo Quán) (22/10/2026)

- **Tụ Linh Trận** mới phía sau Đạo Quán (700,196): vòng trận phát sáng vẽ
  trên nền; quanh trận (bán kính 78) là **vùng an toàn** — sói không sinh,
  không đuổi vào; banner hiện "🧘 Thiền Phòng · Tụ Linh Trận · An toàn".
- **Bế quan** (phím E tại trận, sự kiện `toggle_bequan`): điều kiện đã có
  linh căn + đứng trong trận. Đang bế quan: nhân vật đứng yên hấp thụ linh
  khí, cộng dồn theo phút game **+1 Tu vi mỗi 480 phút game = +3/ngày**
  (đúng tỉ lệ bế quan của file) và ngày mới KHÔNG cộng thêm +1 thường
  (không trùng). **Di chuyển / ra đòn / tung chiêu / thoát game = dừng**
  bế quan. Người khác thấy nhãn 🧘 trên đầu người đang bế quan.
- Khác với nghỉ offline (GĐ21): bế quan là hoạt động CHỦ ĐỘNG khi online;
  offline thiền vẫn cần học Tọa Thiền bằng sách (GĐ22). Bế quan tại trận
  chỉ cần linh căn (chỗ này là lựa chọn thiết kế của bản MMO, bản chơi đơn
  dùng thiền Tụ Linh Trận để tua thời gian — MMO thế giới chung không tua
  riêng được).
- Sửa nhỏ: toast tổng kết ngủ offline (GĐ21) còn nhắc "học Tọa Thiền ở Đạo
  Quán" → đã đổi theo luật GĐ22 (kiếm Sách Tọa Thiền) + tên nơi nghỉ theo
  nhà (Đạo Quán / Thanh Phong Môn).
- Đồng môn AI (GĐ22): thêm cơ chế đuổi kịp — bị bỏ xa >280px (kẹt góc nhà)
  thì xuất hiện lại cạnh chủ, tránh đứng kẹt vĩnh viễn.
- Test `client/test23.cjs` **9/9 PASS** (từ chối khi chưa có linh căn / sai
  chỗ; bế quan 1 ngày game đo được đúng +3; di chuyển + ra đòn đều dừng).
  Hồi quy: test5 ALL PASS, test21 15/15, test22 10/10.

## GĐ24 — Thiện cảm NPC (đúng file B11) (22/10/2026)

- Mỗi NPC có **thiện cảm −100..100** (bắt đầu 0, lưu theo từng nhân vật) và
  **tính cách** theo file: Trưởng Làng — Hiền hòa; Chủ Tiệm Đan — Trầm lặng;
  Chủ Tiệm Nguyên Liệu — Hào sảng. Lời thoại thay đổi theo tính cách + mức
  thiện cảm.
- **Cách tăng** (file không ghi số cụ thể — đây là mức của bản MMO): trò
  chuyện lần đầu mỗi ngày game **+2** · mua/bán tại tiệm của NPC **+1/lần**
  · trả nhiệm vụ bảng cho Trưởng Làng **+5** · hoàn thành nhiệm vụ riêng
  **+10**. Hiện CHƯA có hành động trừ điểm trong gameplay (file mới nêu
  ngưỡng) — cơ chế từ chối đã cài sẵn, chờ đợt sự kiện gây thù.
- **Hiệu lực đúng file**: thiện cảm **≥50** → **giảm giá MUA 10%** tại tiệm
  của NPC đó + mở **NHIỆM VỤ RIÊNG** (mỗi NPC 1 nhiệm vụ: Trưởng Làng — nộp
  5 Nanh Sói/80 LT; Tiệm Đan — hạ 10 sói/50 LT + 1 Đan Tụ Khí; Tiệm Nguyên
  Liệu — nộp 5 Nanh Sói/70 LT; nhận + trả ngay tại NPC, lặp lại được);
  **≤−50** → NPC **từ chối giao dịch** (cả mua lẫn bán).
- Giao diện: bấm E gặp Trưởng Làng → hộp thoại trò chuyện (thiện cảm, lời
  thoại, nút trả nhiệm vụ + nhận nhiệm vụ riêng); trong tiệm có dòng thiện
  cảm + giá gạch ngang khi được giảm + nút 💬 Trò chuyện; bảng nhiệm vụ
  hiện cả nhiệm vụ riêng (khóa/mở theo thiện cảm).
- Test `client/test24.cjs` **14/14 PASS** (trò chuyện +2/ngày không cộng
  trùng; mua ở 49 giá gốc, ở 50 giảm đúng 15→14; nhiệm vụ riêng mở/nhận/
  hạ 10 sói/trả +10 thiện cảm + thưởng vật phẩm; vá −60 → bị từ chối bán,
  tiền không đổi).

## GĐ25 — Hết thọ → tọa hóa, phương án B "mềm cho MMO" (người chơi chốt 22/10)

- Thọ ≤ 0 → **ÂN HẠN 30 ngày game** bắt đầu khi nhân vật "biết" (đang online
  lúc thọ tận hoặc lần đăng nhập đầu tiên sau đó — người offline chưa đăng
  nhập thì ân hạn chưa chạy). Trong ân hạn chơi bình thường, HUD hiện đếm
  ngược đỏ "ÂN HẠN TỌA HÓA: còn X ngày game".
- **Tự cứu**: đột phá cộng thọ theo B6 (Trung +5/+10 năm, Đại +50 năm) kéo
  thọ dương trở lại → ân hạn HỦY ngay, có thông báo.
- Hết ân hạn mà thọ vẫn ≤ 0 → **TỌA HÓA VĨNH VIỄN**: nhân vật chết thật
  (khác chết thường), hồ sơ ghi `dead`, biến mất khỏi danh sách tài khoản,
  đồ + Linh thạch mất theo; khách/tài khoản tạo nhân vật mới bình thường.
- Test `client/test25.cjs` **9/9 PASS**.

## GĐ26 — Nghề phụ cơ bản (22/10/2026)

- 5 nghề như bản cũ: **Đan Sư · Luyện Khí Sư · Trận Pháp Sư · Phù Sư · Thú
  Sư**. Học nghề cần linh căn, mỗi nhân vật 1 nghề (panel 🔨).
- Chế tạo từ **Nanh Sói + Linh thạch** — BẢN THÍCH ỨNG của bản MMO (file
  dùng Linh thổ/Hỏa tinh/Huyền thạch chưa có trong game): 8 công thức, tỉ
  lệ thành công 60–90%, thất bại mất nguyên liệu. Sản phẩm: đan dược, Phù
  Hộ Thân (+40% HP), Phù Tụ Linh (+20 Tu vi), Trận Kỳ Dịch Chuyển (về
  quảng trường), Nanh Tinh/Da Sói (bán lại Tiệm Nguyên Liệu 30/22 LT).
- **Cấp nghề** theo lượt chế thành công: Thợ nghề ở **50**, Sư phụ ở
  **200** (đúng mốc bản cũ), trần cấp theo cảnh giới (Sư phụ cần Trúc Cơ).
  Công thức mạnh (Đan Tụ Khí, Phù Tụ Linh) cần cấp Thợ nghề.
- Test `client/test26.cjs` **11/11 PASS**.

## GĐ27 — Thành tựu cơ bản (22/10/2026)

- Bộ đếm tích lũy theo nhân vật (sói đã hạ, nhiệm vụ xong, đột phá, lượt
  chế, Tu vi tích lũy, phút bế quan) + **10 mốc thành tựu** thưởng Linh
  thạch (20–200 LT): từ "Sơ Nhập Tiên Đồ" tới "Trúc Cơ Chân Nhân",
  "Sát Lang Giả" (200 sói), "Nhập Định" (bế quan 1440 phút game)...
- Panel 🏆: tiến độ thật từ server, đạt mốc thì bấm Nhận thưởng (mỗi mốc
  nhận 1 lần). Test `client/test27.cjs` **14/14 PASS**.
- Hồi quy cả đợt: test5 ALL PASS, test8 ALL PASS, test20 14/14.

## GĐ28 — Môi trường nét như sprite nhân vật (22/10/2026)

- Người chơi phản hồi: biển tên nhà bị nhòe (hệ quả pixelSnap ×2 ở GĐ15
  làm chữ 12.5px nát còn ~6px). Khắc phục: **nướng supersample 2×** —
  nền, nhà, cây, bảng treo thưởng đều vẽ trên canvas gấp đôi rồi mới
  pixelSnap ×2: mỗi "pixel" môi trường giờ = 1px thế giới (trước là 2px,
  cây 3px), chữ biển hiệu đọc rõ, chi tiết mái/ngói/cửa sắc cạnh như
  sprite nhân vật. Hiển thị scale 0.5, vị trí/kích thước không đổi.
- Test5 ALL PASS; ảnh preview28-village / preview28-sign đã kiểm.

## GĐ29 — Bỏ hẳn pixel hoá môi trường, nét tối đa (22/10/2026)

- Người chơi vẫn thấy mờ sau GĐ28 → đi nốt bước cuối: **bỏ pixelSnap**
  cho nền/nhà/cây/bảng. Texture giữ bản nướng 2× nguyên độ phân giải +
  lọc LINEAR: biển hiệu, mái ngói, cửa sổ sắc như ảnh gốc vẽ tay.
  Quái và gà/vịt giữ pixelSnap riêng (không đổi).
- Test5 ALL PASS; ảnh preview29 đã kiểm — chữ "Đạo Quán" nét căng.

## GĐ30 — Chiêu mộ tông môn + Công trạng (22/10/2026)

- **Công trạng**: trả nhiệm vụ bảng được cộng — giao hàng (nộp nanh) **+1**
  đúng file; nhiệm vụ chiến đấu (hạ sói) **+3** là số của bản MMO (file ghi
  hộ tống +6 — game chưa có nhiệm vụ hộ tống). Đủ **10 nhiệm vụ bảng** →
  Trưởng Làng trao **Thư Tiến Cử**.
- **Sứ Giả Tông Môn** đứng ở quảng trường (bấm E): hộp thoại hiện Công
  trạng, tiến độ thư, trạng thái 2 đợt chiêu mộ theo đồng hồ thế giới.
- **Thiên Kiếm Môn**: mở 30 ngày **tháng 3** hằng năm — cần Luyện Khí
  tầng 7+, Công trạng ≥ 100, nộp Thư Tiến Cử khi gia nhập.
- **Huyền Thiên Tông** (tên tạm — file không đặt tên tông môn lớn): mở
  **3 năm/đợt, 60 ngày đầu năm** (năm 3, 6, 9…) — cần Trúc Cơ+, Công
  trạng ≥ 500 và thắng **Thử Thách Thú** (HP = tinh anh bậc 9 ×4, chỉ
  chủ nhân đánh được, gọi tại Sứ Giả).
- Một nhân vật chỉ thờ **một tông môn**. Quyền lợi đệ tử: **Tiệm Tông
  Môn** tại Sứ Giả (đan rẻ hơn Tiệm Đan ~15% — giá TẠM) + **đổi
  50 Công trạng → +1 điểm chỉ số tự do** (tỉ lệ TẠM 50:1, file không ghi).
- Test `client/test28.cjs` **20/20 PASS**; hồi quy test5 ALL PASS,
  test24 14/14. Sứ Giả hiện dùng hình người vẽ thường (chưa có sprite riêng).

## GĐ31 — Học công pháp tốn thời gian (22/10/2026)

- Đúng mốc đã chốt ở bản chơi đơn: học công pháp **không còn ăn ngay**.
  Tới Đạo Quán bấm E khi đủ điều kiện (chiêu Luyện Khí: tầng 3) → bắt đầu
  **lĩnh ngộ 1 NGÀY GAME** (mốc Trúc Cơ 3 ngày đã cài sẵn trong bảng thời
  gian, chờ có chiêu Trúc Cơ). Thời gian tính theo đồng hồ thế giới —
  **online hay offline đều trôi**; qua ngày mới (hoặc đăng nhập lại sau
  khi đủ ngày) chiêu tự hoàn tất + có thông báo 📖.
- Mỗi lúc chỉ lĩnh ngộ **1 chiêu**; đang dở mà bấm học tiếp sẽ báo còn
  mấy ngày. Khung nhân vật hiện dòng "📖 Đang lĩnh ngộ … (còn X ngày game)".
- 2 chiêu Cơ bản lúc đo linh căn vẫn trao ngay (phần khởi đầu của Đạo
  Quán, không tính vào luật này — đã ghi rõ trong code).
- Test `client/test29.cjs` **8/8 PASS**; test7 đã cập nhật theo luật mới
  (ALL PASS); test5 ALL PASS.

### GĐ31-SỬA (theo ý người chơi tối 22/10): NGỒI LĨNH NGỘ chủ động

- Người chơi sửa luật: chiêu **Luyện Khí chỉ học ở Đạo Quán**; từ **Trúc Cơ
  trở lên học ở MỌI NƠI** (kể cả bãi quái — tìm chỗ không có quái mà ngồi);
  đang học mà **bị quái tấn công thì bị văng, phải giết quái rồi học lại**;
  **bị tác động (quái hoặc chiêu của người khác) → học lại TỪ ĐẦU**.
- Cơ chế: `learning {skillId, progressMin}` lưu tiến độ theo PHÚT GAME khi
  NGỒI YÊN học (LK 1440 phút = 1 ngày game; TC 4320 = 3 ngày). Di chuyển /
  ra đòn / tung chiêu / thoát game → dừng buổi, **giữ tiến độ** (phần này
  là cách hiểu của bản build: luật "về 0" chỉ áp cho BỊ ĐÁNH — móc ở
  `hitPlayer`, mọi nguồn sát thương lên người chơi đều qua đó). Bị đánh
  trúng → tiến độ **về 0** + thông báo. Tiến độ KHÔNG tự trôi offline nữa.
- Thêm **1 công pháp Trúc Cơ cho mỗi lớp** (`<lớp>_4`, tên tạm) với số theo
  khung bậc Trúc Cơ của file (hệ số 2.2, CD 12s, tốn 80) để cơ chế học TC
  dùng được ngay; điều kiện: cảnh giới Trúc Cơ + đã có chiêu Luyện Khí.
- Client: nút **📖 Ngồi học** trong khung nhân vật (cho chiêu TC), dòng
  tiến độ % ở dòng linh căn, nhãn 📖 trên đầu nhân vật đang ngồi học;
  chiêu LK vẫn bấm E tại Đạo Quán.
- Hồ sơ GĐ31 bản đầu (dạng readyDay) tự chuyển đổi khi vào game
  (test29 viết lại thành test chuyển đổi 5/5). Test cơ chế mới:
  `client/test30.cjs` **16/16** (học LK ở quảng trường bị từ chối → Đạo
  Quán chạy tiến độ → di chuyển giữ tiến độ → học tiếp xong; TC học ở
  quảng trường; ra bãi farm bị sói cắn → về 0; học lại an toàn → xong).
  test5 ALL PASS.

## GĐ32 — Luật học v3 + toàn bộ công pháp LK/TC theo khung file (23/10/2026)

- Người chơi chốt lại luật học: **tự đứng dậy / di chuyển / ra đòn cũng về 0**
  (không còn giữ tiến độ); **thoát game** thì nhân vật tự về chỗ an toàn và
  **ngồi học tiếp khi offline** (trạng thái nghỉ 'learn', nhãn 📖, tiến độ vẫn
  chạy; học xong lúc offline → đăng nhập có thông báo + phát skill_learned).
- Thời gian học mới: **Luyện Khí nửa ngày game, Trúc Cơ 2 ngày game** (Kim Đan
  1–5 ngày theo cấp — đã chừa khung `learnDays`). **Lĩnh hội** là nhánh của
  Thần thức: thời gian cần = gốc × 100/(100 + Thần thức), chốt tại lúc bắt đầu học.
- **Danh mục công pháp**: bảng tên chi tiết nằm trong file Excel
  `Du_lieu_game_tu_tien.xlsx` — đã kiểm tra Google Drive (thư mục TuTienGame
  không có file này) và máy chủ dự án: không có. Vì vậy danh mục dựng theo
  ĐÚNG CẤU TRÚC của file thiết kế (lớp × vũ khí, 7 cột): mỗi vũ khí 3 chiêu
  Luyện Khí + 2 chiêu Trúc Cơ (30 vũ khí → 150 chiêu, tên tạm theo phong vị),
  số trong khung file (LK hệ số 1.6/CD 3–8s/tốn 20–50; TC 2.2/10–20s/60–120),
  **điều kiện học theo file** (LK: 1 chỉ số 15–30 hoặc 2 chỉ số 15–20; TC:
  Trúc Cơ + 1 chỉ số 35–50 hoặc 2 chỉ số 30–40) và **chân nguyên nhân hệ số
  theo lớp của file** (áp cho cả chiêu cũ — vd Kiếm tu ×0.8: chiêu gốc 8 tốn 6).
  Khi có file Excel, thay dữ liệu thật 1-1 vào `SKILL_CATALOG`.
- Client: panel **📖 Công pháp** (nút trong khung nhân vật / phím E ở Đạo
  Quán): liệt kê toàn bộ chiêu của vũ khí đang cầm — đã học / đang học % /
  🔒 điều kiện còn thiếu / nút Ngồi học.
- Test: `client/test31.cjs` **15/15** (danh mục 7 chiêu cho Pháp tu+Phiến,
  khóa TC, hệ số chân nguyên ×1.2, lĩnh hội rút ngắn theo Thần thức, học
  offline hoàn tất + thông báo); test30 cập nhật luật về-0 **16/16**;
  test29 5/5; test7 cập nhật (chân nguyên theo hệ số lớp) ALL PASS; test5 ALL PASS.

## GĐ33 — Nạp TOÀN BỘ công pháp THẬT từ file thiết kế (23/10/2026)

- Sửa sai của GĐ32: bảng công pháp nằm NGAY TRONG docx (145 bảng; trước đây
  trích văn bản thuần nên bị xẹp bảng và kết luận nhầm là chỉ có trong Excel).
  `assets/extract_skills.py` đọc cấu trúc bảng của docx → trích đủ **477 chiêu:
  56 Cơ bản / 277 Luyện Khí / 144 Trúc Cơ** (bảng Thể tu dùng chung cho Chiến
  phủ/Cự kiếm/Đao → trải theo vũ khí thành 511 mục) vào
  `server/data/skills_catalog.json`, server nạp thay danh mục dựng tạm.
- Mỗi chiêu có đủ 7 cột của file: tên, hệ, bậc, điều kiện học (đã bóc thành
  chỉ số máy đọc được), hồi chiêu (giây → ms), chân nguyên gốc (nhân hệ số
  lớp khi nạp), mô tả (hiện trong panel). Hệ số sát thương theo khung bậc của
  file (1.0/1.6/2.2) vì bảng không có cột hệ số. Tầm đánh theo vũ khí (xa/gần)
  vì bảng không có cột tầm.
- Đo linh căn giờ trao **2 chiêu Cơ bản của vũ khí đang cầm** (đúng file:
  công pháp theo lớp × vũ khí); chiêu Cơ bản trong panel bấm **Học ngay**
  (tự có, không tốn thời gian) — nhân vật cũ thiếu chiêu cơ bản của vũ khí
  tự bổ sung bằng nút này.
- Chưa mô phỏng: hiệu ứng đặc biệt trong mô tả (choáng, trói, hút máu, buff
  Công/Thủ...) — chiêu vẫn gây sát thương theo hệ số bậc như hiện tại.
- Test: test31 viết lại theo dữ liệu thật **15/15**; test30 16/16; test29
  5/5; test7 (áp sát vì Trảm Kiếm là chiêu chém gần) + test5 ALL PASS.

## GĐ34 — Hiệu ứng đặc biệt của công pháp (theo mô tả trong file, tùy chỉnh cho game)

- `assets/extract_skills.py` bóc hiệu ứng từ cột Mô tả của từng chiêu trong
  docx → trường `fx` + `fxText` trong `skills_catalog.json`. Engine hỗ trợ:
  choáng, trói, làm chậm, thiêu đốt/độc theo thời gian (DoT — quái chết vì
  DoT vẫn tính công người hạ độc), hút máu, đẩy lùi, xuyên phòng, giảm sát
  thương nhận, tăng công, đòn kế tiếp ×1.5, phản sát thương, hồi máu, đánh
  nhiều lần, đánh vùng, địch yếu đi (nhận thêm sát thương). 342/511 chiêu
  có hiệu ứng; phần còn lại là chiêu thuần sát thương trong dữ liệu gốc.
- Chỉnh số hợp lý (chốt khi nạp): chiêu vùng hệ số ×0.7; chiêu nhiều đòn
  chia lại tổng ≈ ×1.3; choáng ≥1.5s hệ số ×0.9; chiêu thiên thủ ×0.85.
  Chiêu CƠ BẢN: mô tả liệt kê biến thể cả 5 hệ nên giới hạn tối đa 2 hiệu
  ứng theo bản sắc chiêu (tên có "Hộ" → thiên thủ) kẻo thành chiêu ôm đồm.
  Trùm thử thách kháng khống chế 50%.
- Server: `hurtMonster` (tôn trọng "yếu đi"), `applyFxToMonster`,
  `applySelfFx`, `atkMulOf`; quái bị choáng đứng yên, bị trói không di
  chuyển, bị chậm giảm tốc; DoT xử lý trong tick. Client: panel Công pháp
  hiện `⚡ fxText`; quái được nhuộm màu theo trạng thái (choáng = xanh
  dương, chậm = xanh nhạt, trói = xám, đốt/độc = cam).
- test32 (phần GĐ34): chậm + DoT tự trừ máu, phản sát thương PASS.

## GĐ35 — Sự kiện ngẫu nhiên đầu tháng (đúng bảng B11 của file)

- Đầu mỗi tháng game, mỗi sự kiện tung độc lập theo tỉ lệ của file, tối đa
  2 sự kiện/tháng; cơ duyên ×1.5 cho người đi một mình (theo file). Tung
  khi qua tháng (người online) hoặc lúc đăng nhập (tháng hiện tại; tháng
  bị bỏ lỡ không cộng dồn). Lời mời tông môn theo đợt chiêu mộ (không tính
  vào quota 2).
- Đã có: nhặt túi linh thạch (+50–150 LT), suối linh (+100 Tu vi), kết
  bạn (NPC +20 thiện cảm), thương nhân lưu động (1 món hiếm giá ×1.5, mua
  trong Tiệm Đan trong 2 ngày — shop `luu_dong`), bị cướp (ở ngoài vùng an
  toàn → 3 Kẻ Cướp Đường đuổi đánh, hạ mỗi tên +30 LT; ở nơi an toàn/ngoại
  tuyến → mất 10% LT), bệnh lạ (−20% sát thương gây ra 7 ngày, Hồi Xuân
  Đan chữa khỏi).
- Điều chỉnh cho MMO (ghi rõ): tán tu truyền kinh nghiệm → tiến độ lĩnh
  ngộ +30% (không học dở thì +30 Tu vi); rương lạ → vật phẩm ngẫu nhiên
  (có tỉ lệ ra Sách Tọa Thiền); gây thù → NPC −20 thiện cảm và sau 30–90
  ngày "tu sĩ thù địch" (HP theo tinh anh cùng bậc ×1.1) tìm đến ngoài
  vùng an toàn — hạ được +100 LT, xóa thù. Bí cảnh nhỏ: file ghi "(làm
  sau)" nên chưa làm. Nhân của thiên phú bỏ qua (MMO chưa có thiên phú).
- Trạng thái hiện ở khung nhân vật: 🤒 bệnh còn X ngày · ⚔️ kẻ thù rình ·
  🛒 thương nhân còn X ngày. test32 (phần GĐ35) PASS.

## GĐ35 — Sự kiện ngẫu nhiên đầu tháng: ĐÃ GỠ (23/10)

- Đã triển khai đầy đủ theo bảng B11 (túi linh thạch, suối linh, kết bạn,
  gây thù, bị cướp, bệnh lạ, thương nhân lưu động...) và test đạt, nhưng
  người chơi chốt "không cần" → gỡ toàn bộ khỏi server + client: không
  còn tung sự kiện khi qua tháng/đăng nhập, bỏ quái Kẻ Cướp/Tu Sĩ Thù
  Địch, bỏ bệnh lạ và hàng thương nhân lưu động. Các trường dữ liệu cũ
  trong hồ sơ nhân vật (nếu có) được bỏ qua, không ảnh hưởng.

## GĐ36 — Ô công pháp theo file (kiểu A: lắp/tháo thủ công)

- Giới hạn ô theo đúng file: Luyện Khí 3 ô (từ tầng 7: 4 ô), Trúc Cơ 4 ô
  (từ tầng 7: 5 ô), Kim Đan trở lên 5 ô. Chỉ chiêu ĐANG LẮP trong ô mới
  tung được (cast_skill tra theo `equipped`); chiêu đã học mà chưa lắp
  vẫn giữ nguyên trong danh sách đã học.
- Học xong chiêu mới: còn ô trống thì tự lắp vào; ô đầy thì chiêu nằm
  chờ, mở panel 📖 bấm [Tháo]/[Lắp vào ô] để sắp xếp (server chặn lắp
  khi đầy). Nhân vật cũ tự lắp các chiêu đầu tiên theo thứ tự đã học.
  Payload thêm `skillSlots {used, max}`; catalog thêm cờ `equipped`.
- Sửa toast học chiêu cũ ghi cứng "(ô chiêu 3 — phím 3)" → báo đúng ô
  vừa lắp / nhắc mở panel khi ô đầy.
- test33: 10/10 PASS (ô 3 ở LK1, chiêu chờ khi đầy, tháo/lắp, tung chiêu
  theo ô, lên tầng 7 mở ô 4). Hồi quy: test5/test7 ALL PASS, test28
  20/20, test30 16/16, test31 15/15, test32 ALL PASS (test31/test7 đã
  cập nhật theo luật ô + hiệu ứng GĐ34).

## GĐ37 — 2 bảng công pháp + ô đa dụng (23/10)

- Mỗi người chơi có **2 BẢNG công pháp** đổi qua lại (tab trong panel 📖,
  sự kiện `switch_board`): vd Bảng 1 farm quái, Bảng 2 tu luyện. Bảng 2
  khởi đầu là bản sao của Bảng 1 để tùy chỉnh tiếp; hai bảng độc lập và
  lưu bền theo nhân vật (`boards`, `activeBoard`).
- Mỗi bảng gồm **ô CHÍNH** (số ô theo cảnh giới như GĐ36) + **4 ô ĐA
  DỤNG** nhỏ chứa công pháp HỖ TRỢ — nhận diện theo hiệu ứng: giảm sát
  thương nhận / hồi máu / phản sát thương / tăng công / đòn kế tiếp
  (`isUtilitySkill`). Chiêu thuần công không lắp được vào ô đa dụng;
  một chiêu không lắp chéo 2 khu trong cùng 1 bảng.
- Tung chiêu ô đa dụng: phím **6–9** hoặc bấm chuột vào ô nhỏ trên thanh
  chiêu (client gửi `cast_skill {slot, area: 'util'}`; server trả
  `cast_result` kèm `area` để client chạy hồi chiêu đúng ô).
- Bài học test: việc "tự lắp chiêu đầu cho nhân vật cũ" chỉ được làm 1
  lần lúc DỰNG bảng (trong `boardsOf`) — để trong normalize chạy mỗi lần
  thì người chơi tháo trống bảng sẽ bị tự lắp lại.
- test34: ALL PASS (lắp ô phụ, tung chiêu ô phụ, chặn chiêu thuần công,
  chặn lắp chéo, đổi bảng giữ sắp xếp, lưu bền). Hồi quy: test5 ALL
  PASS, test30 16/16, test31 15/15, test33 ALL PASS.
- Ghi chú: nút chiêu cảm ứng (mobile) hiện vẫn là 3 nút ô chính — ô đa
  dụng trên cảm ứng chưa có nút riêng.

## GĐ38 — Bãi farm đa loài: Dơi Đen + Thạch Quái (23/10)

- Thêm 2 loài quái theo ĐÚNG bảng quái của file: **Dơi Đen** (HP 20,
  công 4, Tu vi +3) bay nhanh (đuổi 175px/s) và **Thạch Quái** (HP 140,
  công 10, phòng thủ 8, Tu vi +8 hạng Mạnh) chậm chạp, sống ở góc đông
  bắc. Sói Xám giữ nguyên (40/5, +3). Mỗi loài duy trì số lượng riêng
  (5 sói / 4 dơi / 3 thạch) và hồi sinh đúng loài.
- Sát thương lên quái tôn trọng phòng thủ TỪNG LOÀI ở mọi nguồn: đánh
  thường, tung chiêu (kể cả chiêu vùng), đồng môn đánh phụ, phản sát
  thương. AI quái dùng tốc độ/tầm cắn/hồi cắn riêng theo loài.
- Rơi đồ theo loài: sói như cũ; dơi 35% **Cánh Dơi**; thạch quái 25%
  **Đá Quý**. Tiệm Nguyên Liệu thu mua: Cánh Dơi 8, Đá Quý 45 (giá TẠM).
  Vật phẩm rơi hiện đúng tên trên mặt đất.
- Nhiệm vụ bảng mới theo ĐÚNG bảng B11 của file (thưởng gồm Tu vi):
  Diệt Dơi Đen (10 con → 80 LT + 20 Tu vi), Diệt Thạch Quái (5 con →
  150 LT + 30 Tu vi), Thu thập Cánh Dơi (5 cái → 60 LT). Nhiệm vụ diệt
  quái nay tính ĐÚNG loài (hạ sói không tính vào Diệt Dơi) — áp cả
  nhiệm vụ riêng của Chủ Tiệm Đan. Công trạng +3/+1 như lệ bản MMO.
- Client: dơi dùng 4 khung vỗ cánh (đã nướng sẵn), thạch quái dùng bộ
  khung đá (đi/đập), mọi quái farm có nhãn tên loài trên đầu.
- test35: ALL PASS (3 loài đúng chỉ số, +3/+8 Tu vi, def thạch quái,
  nhiệm vụ đúng loài). Hồi quy: test5 ALL PASS, test28 20/20, test32
  ALL PASS.

## GĐ39 — Hệ thống rương dữ liệu-hóa + sửa Tu vi Dơi (23/10)

- NGƯỜI CHƠI HỎI rương: bản MMO chưa có (chỉ bản chơi đơn có) → làm mới
  theo bảng B10 của file: rương rơi theo HẠNG quái — Yếu C 60%; Trung
  C 50% / B 30% / A 5%; Mạnh C 25% / B 50% / A 20%. Sói = Yếu, Dơi =
  Trung, Thạch = Mạnh. Đồ trong rương: số mục theo file (C 1–2, B 2–3,
  A 3–4), rút từ kho trọng số từng phẩm (`CHEST_LOOT`); rương tồn tại
  120s, tới gần (42px) là tự mở, đồ vào thẳng túi người mở + toast
  `chest_opened` liệt kê nội dung.
- RÀ SOÁT + UPDATE LỚN (theo yêu cầu): toàn bộ nằm trong 1 cấu hình
  `CHEST_TABLES / CHEST_COUNT / CHEST_LOOT / CHEST_TTL_MS /
  CHEST_MAX_UNOPENED (12)`; mỗi loài quái chỉ khai `chestTier` trong
  MONSTER_TYPES; `ZONE_CHEST_TIER` để vùng/map sau này (bí cảnh) ghi đè
  hạng rương; trùm thử thách không rơi rương (như bản chơi đơn); hạ
  bằng DoT/đồng môn vẫn tung rương; có đồng hành thì tỉ lệ + Linh thạch
  trong rương ×2/3 như bản chơi đơn. Quái/map mới = thêm 1 dòng khai
  báo, không sửa logic.
- SỬA LỖI GĐ38: file xếp Dơi Đen là quái TRUNG → Tu vi hạ dơi +3 → **+4**
  (đúng thang Yếu 3 / Trung 4 / Mạnh 8).
- Móc kiểm thử: env TTT_CHEST_FORCE_GRADE (ép phẩm), TTT_CHEST_TTL_MS.
- test36: ALL PASS (rương C 1–2 mục, rương A 3–4 mục, hết hạn tự mất).
  Hồi quy: test35 ALL PASS (gồm số Tu vi dơi mới), test5 ALL PASS.

## GĐ40 — Nội dung sống: thương nhân lưu động · vụ án bệnh lạ · tu sĩ thù địch (23/10)

Theo đính chính của người chơi (23/10): các yếu tố từng ở "sự kiện ngẫu
nhiên" (đã gỡ ở GĐ35) nay thành NỘI DUNG CHƠI thật, trải dài trong game:

- **Thương nhân lưu động** (`npc_thuongnhan`, quảng trường phía đông):
  NPC buôn bán bình thường với tiệm `luu_dong` — hàng hiếm giá cao (số
  TẠM: Đan Tụ Khí 45, Đan Trung Cảnh 300, Sách Tọa Thiền 500…), mỗi
  ngày game chỉ mang **3 món luân phiên** (`merchantStockToday`, server
  chặn mua món ngoài kho; lời thoại chào đúng hàng của ngày).
- **Vụ án bệnh lạ** — chuỗi nhiệm vụ 2 phần tại Chủ Tiệm Đan (không cần
  thiện cảm): (1/2) hạ 8 Dơi Đen chặn nguồn bệnh → đặt cờ chuỗi;
  (2/2) mang 2 Hồi Xuân Đan cứu người (thưởng 120 LT + 30 Tu vi) → gỡ
  cờ, vụ án mở lại từ đầu. Cơ chế tổng quát: `requiresFlag / setsFlag /
  clearsFlag` trong QUESTS + `flags` lưu theo nhân vật; hộp thoại NPC
  trả DANH SÁCH nhiệm vụ (phần chuỗi chưa mở thì ẩn).
- **Tu sĩ thù địch** — nhiệm vụ bảng "Đối đầu Tu Sĩ Thù Địch": ra
  ngoài làng bấm ⚔ Khiêu chiến (panel Nhiệm vụ) → tu sĩ xuất hiện đấu
  tay đôi (quái thử thách khóa chủ nhân, HP = tinh anh ×2 theo bậc,
  dùng sprite NGƯỜI áo đỏ sẫm thay vì hình quái). Thắng → trả Trưởng
  Làng: 100 LT + 20 Tu vi + 3 Công trạng.
- test37: ALL PASS (14 kiểm). Hồi quy: test24 14/14, test28 20/20,
  test5 ALL PASS.

## GĐ40+ — MỞ RỘNG LỚN nội dung sống (23/10, theo triết lý của người chơi)

Triết lý dẫn đường (người chơi chốt): game như đời thật + tu tiên —
không nạp-tiền-là-mạnh, không cày-một-chỗ, không lên-cấp-rồi-AFK; người
chơi tự viết cuộc đời mình, chơi chậm tận hưởng, quan sát hint và phán
đoán để mở nội dung ẩn.

- **Thương nhân lưu động v2**: ghé làng THẤT THƯỜNG — chắc chắn mỗi 4
  ngày + ~30% ngày khác ghé bất chợt (không vắng quá 3 ngày); vắng thì
  NPC biến mất khỏi làng thật (snapshot/delta theo lịch) + loan tin toàn
  server khi tới/rời. Mỗi ngày ghé: 3 món trong kho 8 món, GIÁ dao động
  ±15% theo ngày, SỐ LƯỢNG 1–3 (hết là hết). **Đặt hàng**: trả trước
  giá gốc +10%, lần ghé sau nói chuyện là giao tận tay (mỗi lần 1 đơn).
  **Bán tin tức**: mỗi ngày 1 hint về thế giới trong lời thoại.
- **Kho vụ án luân phiên** (chu kỳ 7 ngày, mỗi vụ mở 2–3 ngày — phải
  quan sát bảng mỗi ngày): Đàn sói dữ (hạ 12 sói), Bầy dơi phá kho
  (12 dơi), Thạch quái chặn đường (4 thạch), Dân làng mất tích (đối
  đầu Kẻ Bắt Cóc cứu người — hệ đối đầu tổng quát `start_duel`), và
  **Kẻ trộm trong làng** (vụ điều tra: 3 manh mối từ nhân chứng, nhất
  quán với thủ phạm được gán lúc nhận vụ; về Trưởng Làng chỉ đích
  danh 1/3 nghi phạm — đúng: phá án; sai: vụ khép lại, −5 thiện cảm).
- **Bảng Vàng + Bảng Truy Nã** (điểm đá tại 856,668 cạnh bảng treo
  thưởng): Bảng Tu Vi (top 10 cảnh giới toàn server, kể cả offline),
  Bảng Tu Luyện (top 10 tổng Tu vi tích lũy), Bảng Truy Nã (tu sĩ thù
  địch, kẻ bắt cóc, kẻ trộm + tin đồn truy nã luân phiên theo ngày).
- test38 ALL PASS (17 kiểm); test37 cập nhật theo v2 ALL PASS; hồi quy
  test24 14/14, test5 ALL PASS.

## Chuẩn bị buổi test bạn bè (23/10)
- test39 (khói đa người chơi): ALL PASS — 3 client thật thấy nhau; rương
  là của chung (ai tới gần cũng mở được, kể cả rương người khác làm
  rơi); quái đối đầu: bạn bè đánh ké được nhưng không cướp công (chủ
  nhân phải tự kết liễu; gọi lại được, không kẹt nhiệm vụ).
- `HUONG_DAN_TEST.md`: hướng dẫn buổi test (chạy server + firewall +
  IPv4 cho bạn cùng Wi-Fi, chế độ test nhanh bằng TTT_DAY_REAL_MS /
  TTT_TUVI_NEED, lộ trình 90 phút, mẫu báo lỗi, danh sách giới hạn đã
  biết để khỏi báo nhầm).

## Đưa lên web (Render) — 23/10
- Thêm `render.yaml` (build `npm --prefix server install`, start
  `node server/index.js`, env test nhanh) + `.gitignore` (bỏ node_modules
  + dữ liệu cá nhân). ĐÃ MÔ PHỎNG tại máy agent: bản sao sạch (không
  node_modules/không dữ liệu) cài đúng lệnh trong render.yaml → server
  lên ở cổng tùy ý (PORT), trang game HTTP 200, socket vào được tới
  bước tạo nhân vật.
- `HUONG_DAN_LEN_WEB.md`: từng bước GitHub Desktop → Render cho người
  chơi; giới hạn free: ngủ sau 15 phút không ai vào (thức ~1 phút),
  đĩa tạm mất dữ liệu khi restart/redeploy.

BỔ SUNG (23/10 chiều) — lớp lưu trữ cloud `server/storage.js`:
- Không đặt `MONGODB_URI` → hành vi y hệt trước (file JSON tại chỗ).
- Có `MONGODB_URI` (MongoDB Atlas free, không cần thẻ): boot nạp dữ
  liệu từ cloud trước khi mở cổng (cloud trống + file có dữ liệu →
  tự đẩy lên, chuyển nhà 1 bước); mọi lần lưu ghi cả file lẫn cloud
  (gộp, trễ ≤ ~0,8s); Mongo lỗi → server vẫn chạy bằng file.
  `/api/status` có trường `storage: 'file' | 'mongodb'` để kiểm nhanh.
- Kiểm chứng: test stub-Mongo trong bộ nhớ 9/9 PASS (boot/nạp/chuyển
  nhà/ghi runtime/song song file); hồi quy file test5 ALL PASS trên
  :3001. Atlas thật sẽ xác nhận ở lần deploy đầu qua /api/status.
- HUONG_DAN_LEN_WEB.md thêm Phần 2 (Atlas từng bước) + Phần 3 (ping
  chống ngủ bằng cron-job.org chỉ trong giờ chơi). Lưu ý đã kiểm
  chứng: Render free chỉ có ~5 GB băng thông/tháng cho workspace —
  chỉ hợp test/demo nhóm nhỏ; 100–300 người thường xuyên thì chạy
  máy nhà/VPS, dữ liệu Atlas mang theo được.

GĐ41 (23/10) — NÚT CẢM ỨNG CHO Ô ĐA DỤNG (trả nợ GĐ37):
- Client: thêm 4 nút tròn tUtil0–3 trong cụm điều khiển cảm ứng (cột
  nhỏ viền xanh ngọc bên trái cụm chiêu chính, phía trên nút E). Nút
  chỉ hiện khi ô phụ tương ứng có chiêu (nhãn = tên chiêu), mờ khi
  đang hồi chiêu; bấm = castSlot(i, 'util') — cùng đường với phím 6–9
  và bấm chuột ở thanh chiêu. Màn hình thường không đổi.
- Kiểm chứng: build OK; test34 (lắp/tung ô phụ qua socket) ALL PASS;
  probe Chromium giả lập cảm ứng 844×390 với nhân vật có Hộ Thể Công
  ở ô phụ: nút hiện đúng tên + vị trí, 3 ô trống ẩn; hồi quy test5
  ALL PASS trên :3001.

GĐ42 (23/10) — LÀM GỌN HUD + ĐỒNG BỘ SPRITE NPC CÒN SÓT:
Theo ý người chơi ("HUD quá to; vẫn còn nhân vật đồ họa cũ; học
VLTK + Where Winds Meet rồi làm lại"):
- HUD gọn: thẻ nhân vật 218→184px (avatar 52→40, thanh trạng thái
  13→10px, nền trong hơn), banner + đồng hồ nhỏ lại, minimap
  168×126→140×105, nút chức năng 46→38px, thanh chiêu neo đáy giữa
  kiểu VLTK (ô 62→52, ô phụ 46→42), panel 284→268px, cụm cảm ứng
  thu ~15% (joystick 124→106, nút đánh 78→66, chiêu 56→50, ô phụ
  46→42; hành trình joystick 42→38). Dòng "Người chơi trực tuyến"
  nâng từ y=580 lên 512 khỏi bị thanh chiêu che.
- Đồ họa cũ: Sứ Giả + Thương Nhân Lưu Động + Tu Sĩ Thù Địch trước
  đây rớt về hình vẽ code thời GĐ9 — đã sinh 3 bộ sprite pixel biến
  thể từ bộ gốc (envoy áo hổ phách / merchant áo tím / rival áo đỏ
  sẫm, thêm vào assets/style/gen_variants.py) và nối vào
  NPC_SPRITE_SET + đường dựng quái đối đầu (giữ fallback cũ nếu
  thiếu file). Giờ mọi nhân vật trên màn hình chung 1 phong cách.
- Kiểm chứng: build OK; test5 + test37 ALL PASS trên :3001; ảnh
  probe desktop 1280×720 + mobile 844×390 (preview42-*) đã xem bằng
  mắt: HUD nhỏ rõ rệt, Sứ Giả áo vàng đứng ở quảng trường. Đẹp tới
  đâu chờ người chơi duyệt trên máy thật.

GĐ42b (23/10) — THẺ NHÂN VẬT THU GỌN + NÚT "CHỈ SỐ" RIÊNG:
Theo ý người chơi (gửi ảnh thẻ cũ: "này nhỏ lại, có thể tạo 1 nút
riêng ấn vô coi"): bảng 7 chỉ số + điểm cộng được gói vào
#hudDetails ẩn mặc định ở MỌI thiết bị; trong thẻ thêm nút
#hudDetailBtn "▸ Chỉ số" (tự nhắc "· còn N điểm chưa cộng" khi có
điểm; mở thì lật "▾"). Bấm nút hoặc chạm thẻ (mobile) để mở/đóng;
nút Đột phá vẫn hiện ngoài phần ẩn. Số đo probe: thẻ thu gọn cao
193px so với 319px khi mở chi tiết (trước kia luôn ~330px).
test5 ALL PASS; ảnh preview42b-* đã xem bằng mắt.

GĐ43 (23/10) — THEME THỦY MẶC NGỌC BÍCH (MẪU C NGƯỜI CHƠI CHỐT):
Người chơi chê GĐ42/42b "đồ họa và hud vẫn không đẹp" → trình 3 mẫu
HUD trên ảnh game thật (A WWM / B VLTK / C thủy mặc) → CHỐT MẪU C.
Đã áp theme C vào game thật: khối override CSS "GĐ43" trong
index.html (thẻ nhân vật kính mờ ngọc + gờ ngọc trái, thanh trạng
thái viên thuốc gradient, banner/clock dạng pill kính mờ, minimap
viền ngọc bo 14px, panel + nút pill ngọc toàn bộ, Ô CHIÊU TRÒN
54px viền ngọc + ô phụ 44px, joystick vòng ngọc + núm ngọc, nút
cảm ứng tròn radial ngọc, nút ⚔ giữ đỏ nâu làm điểm nhấn) + phông
canvas đổi monospace → Palatino/Georgia serif (nhãn tên người
chơi/NPC, Bảng Treo Thưởng, toast). test5 ALL PASS; ảnh
preview43-desktop/mobile đã xem: desktop thấy ô tròn "Liên Hoàn
Quyền"/"Hộ Thể Công", mobile thấy đủ joystick + cụm nút chiêu.
Hướng đồ họa THẾ GIỚI (minh họa mềm / pixel đồng bộ / thêm chiều
sâu) người chơi CHƯA chốt — chờ chọn sau.

GĐ44 (23/10) — THANH CHIÊU THÀNH KHAY NÚT BẤM + HUD MOBILE NHỎ LẠI:
Theo phản hồi người chơi (ảnh desktop GĐ43): (1) thanh chiêu cũ chỉ
vẽ ô cho chiêu ĐÃ CÓ + ô chính không bấm chuột được → nay LUÔN
hiện đủ khung: nút ⚔ Đánh thường bấm được (Space) + 5 ô chính
(phím 1–5) + 4 ô phụ (phím 6–9); ô trống = viền đứt mờ + số phím;
ô chính có data-cast bấm chuột như ô phụ; cả thanh nằm trên khay
kính mờ ngọc. Probe đếm: 10 ô, atk=true, display flex. (2) Mobile
bị chê HUD to → thẻ 184→148px + avatar 30 + ẩn dòng Tuổi/Công
trạng/Linh căn khi thẻ thu gọn (mở thẻ là hiện lại), minimap
110×82→92×69, nút công cụ 38→32, joystick 106→94, cụm nút chiêu
nhỏ ~10%.

GĐ45 (23/10) — BỐ CỤC CHỐT THEO NGƯỜI CHƠI:
"map phải luôn luôn nằm bên trái trên; bên phải trên thì vừa có
thông tin nhân vật, các công cụ" → minimap cố định TRÁI TRÊN
(mọi thiết bị); PHẢI TRÊN = hàng nút công cụ (ngang, trên cùng) +
thẻ nhân vật ngay bên dưới (top 54px). Panel mở ra vẫn ở phải
trên, tạm đè lên thẻ, đóng panel là thẻ hiện lại.
test5 ALL PASS; ảnh preview44/45 desktop+mobile đã xem đạt.

GĐ46 (23/10) — THÊM NÉ + THỐNG NHẤT PHÍM SPACE + MINIMAP RÕ:
Người chơi hỏi "space là gì / cái né đâu / minimap nhìn rõ chút":
(1) MMO trước giờ CHƯA có Né, và Space bị gán = đánh thường (khác
bản chơi đơn Space = Né; tin nhắn GĐ43 nói nhầm "Space né" gây rối
— đã nhận lỗi). Nay: thêm cơ chế NÉ server-authoritative (sự kiện
'dodge', vọt 520px/s trong 190ms ≈ 104px, hồi 2,5s — số TẠM vì
file thiết kế không quy định Né cho MMO; vẫn tôn trọng vật cản),
Space = Né (khớp bản chơi đơn), đánh thường chuyển sang phím J
(+ bấm nút ⚔ / nút ⚔ cảm ứng như cũ). Khay chiêu thêm ô 💨 Né
(Space) cạnh ⚔; mobile thêm nút "Né" riêng trên cụm chiêu (đã sửa
lỗi chồng nút Liên Hoàn Quyền ở bản đầu). test40 ALL PASS (vọt
104px, tốc độ 547 vs đi bộ 262px/s, né lần 2 bị hồi chiêu chặn,
hết hồi né lại được) + test5 ALL PASS.
(2) Minimap: canvas 168×126 → 380×284 (hiển thị 190×142 desktop /
108×81 mobile), chấm NPC/quái/người chơi to ~2,3× + viền tối tương
phản, thêm viền vàng quanh làng, khối nhà tối thiểu 7px.
HUONG_DAN_TEST.md thêm mục 2b "Điều khiển nhanh" cho buổi test.

GĐ47 (23/10) — CỤM CHIÊU MOBILE ĐỦ 5 Ô CHÍNH (VÒNG CUNG):
Người chơi chê "hub chiêu mobile tàn/phế" vì cụm cảm ứng chỉ có 3
nút chiêu chính (di sản GĐ17, thời bảng chính tối đa 3 ô) trong khi
lên cao dùng 5 ô chính + 4 ô phụ → chiêu ô 4–5 không bấm được trên
điện thoại. Đã thiết kế lại: thêm tSkill3/tSkill4; 5 nút chính xếp
VÒNG CUNG quanh ⚔ (S1 trái ⚔, S2 trên-trái, S3 trên ⚔, S4/S5 tiếp
lên trên); Né dời sang cạnh nút tương tác (right 146, bottom 76);
cột ô phụ đẩy lên (bottom 126/172/218/264) nhường vòng cung; nhãn
+ bind + mờ hồi chiêu đủ 5 ô. Kiểm tra tự động bằng probe: 10 nút
cảm ứng hiển thị, 0 cặp chồng nhau. test5 ALL PASS.

GĐ48 (23/10) — CÂN LẠI BỐ CỤC MOBILE:
Người chơi xem ảnh GĐ47: "nút bấm quá to; bên dưới khúc ở giữa
không có gì hết lại quá trống; mấy chỗ bên phải thì dày đặc đồ".
Đã sửa: (1) toàn bộ nút cảm ứng nhỏ ~15% (⚔ 60→52, chiêu 45→40,
phụ 37→34, Né/E 41→36, joystick 94→88); (2) 4 ô ĐA DỤNG rời phía
phải → HÀNG NGANG ĐÁY GIỮA (vị trí cố định theo ô Đ1–Đ4, căn giữa
màn hình); (3) phía phải chỉ còn vòng cung ⚔ + 5 chiêu chính (xếp
gọn lại theo cỡ mới) + cột nhỏ Né/E. Probe: 10 nút hiện, 0 chồng.
test5 ALL PASS.

GĐ49 (23/10) — TOÀN MÀN HÌNH TRÊN MOBILE (HẾT 2 DẢI ĐEN):
Người chơi gửi 3 ảnh mẫu game tu tiên mobile khác (đều phủ kín
màn hình) và yêu cầu "màn hình mobile toàn màn hình, đừng để đen
2 bên". Nguyên nhân: Phaser Scale FIT giữ khung 800×600 căn giữa
→ máy ngang 19.5:9 bị 2 dải đen. Đã chuyển sang Scale EXPAND:
canvas phủ 100% cửa sổ (đo thật 844×390 = đúng 100%), camera mở
rộng tầm nhìn ngang (thấy nhiều thế giới hơn hẳn — 4 nhà cùng lúc),
nền ngoài bản đồ đổi tông cỏ tối #22391b (màn siêu rộng/dọc đọc
như bóng rừng thay vì đen), chữ giữa màn hình (toast/online) tính
theo kích thước khung thật + tự căn lại khi resize, meta viewport
thêm viewport-fit=cover, bỏ bóng/viền bo của canvas.
Giới hạn còn lại (đã báo người chơi): màn DỌC — hết đen nhưng dưới
đáy bản đồ là vùng cỏ tối vì bản đồ hình ngang (1200px cao) trong
khi khung dọc nhìn được ~1730px; chơi ngang là chuẩn.
test5 ALL PASS; ảnh preview49-mobile/desktop đã xem đạt.

GĐ50 (23/10) — CỤM ĐIỀU KHIỂN MOBILE THEO ẢNH MẪU (1 CỤM GÓC):
Người chơi xem ảnh GĐ49: "Hộ Thể Công nằm kì vậy, HUD mobile vẫn
quá kì" — hàng ô phụ ở đáy giữa (GĐ48) khiến nút lẻ loi giữa màn
hình. Học theo đúng 3 ảnh mẫu người chơi gửi: MỘT cụm duy nhất bám
góc phải dưới — ⚔ 56px sát góc; 5 chiêu chính 44px vòng cung trong
(bán kính ~118px quanh tâm ⚔); 4 ô đa dụng 36px vòng cung ngoài
(~168px); Né + tương tác 36px ở mép trái cụm; joystick thành đĩa
mềm 104px trong suốt (nền 0.22, núm 44) như ảnh mẫu. Kiểm tra
chồng nút theo HÌNH TRÒN (tâm + bán kính): 0 va chạm. test5 PASS.
Nguyên tắc rút ra: điều khiển mobile = 1 cụm góc phải dưới + 
joystick trái dưới, KHÔNG rải nút ra giữa màn hình.

GĐ51 (23/10) — ĐÈN LÀNG BAN ĐÊM PHÁT SÁNG:
Trước: đêm chỉ có lớp phủ tối phẳng, trụ đèn đứng chết. Nay mỗi trụ
trong 8 trụ (tọa độ dùng chung LAMP_POSITIONS ở gfx.ts) có 3 lớp
sáng cộng (ADD): vệt sáng ấm trên mặt đất + quầng halo xanh ngọc
quanh tinh thể (có tween "thở" nhẹ, mỗi đèn một nhịp) + lõi trắng.
Độ sáng bám đúng hàm độ tối của đồng hồ (0 ngày → 1 đêm sâu, chuyển
dần lúc rạng đông/chạng vạng), ban ngày ẩn hẳn. Kiểm chứng bằng ảnh
đêm sâu 21:46: 8 quầng sáng rõ, NPC gần đèn được hắt sáng. test5 PASS.

GĐ51b (23/10) — GỠ QUẦNG SÁNG ĐÈN (người chơi bác bỏ):
Người chơi xem ảnh đêm GĐ51: "bỏ trụ đèn kiểu đó đi, nó sáng chói
chá hết map rồi" — 3 lớp sáng ADD (halo 315px + vệt đất + lõi) quá
gắt, rửa sáng cả vùng quanh đèn. Đã gỡ SẠCH lớp quầng động: trụ đèn
về nguyên trạng nướng tĩnh (đốm sáng nhỏ ở đầu tinh thể như trước
GĐ51), đêm chỉ còn lớp phủ tối. Ảnh đêm sau gỡ đã kiểm: dịu, không
còn vùng cháy sáng. test5 PASS. Bài học: hiệu ứng sáng cộng dồn diện
rộng dễ thành "chói" — sau này có làm lại ánh sáng đêm phải rất nhẹ
và hỏi ý người chơi bằng ảnh mẫu trước.

GĐ52 (23/10) — ÁNH SÁNG ĐÊM = ÁNH TRĂNG TỰ NHIÊN (theo yêu cầu
người chơi "thay đèn bằng ánh sáng tự nhiên của ánh trăng"):
- Lớp phủ đêm đổi từ màu phẳng sang gradient nhuộm sắc trăng (sáng
  bạc dần về góc phải trên — hướng trăng).
- 5 vệt sáng trăng bạc blend THƯỜNG (không ADD) rất nhẹ trên các
  khoảng trống: quảng trường, sân tông môn, bãi farm sói, góc thạch
  quái + mặt ao (ao sáng hơn + lấp lánh theo sin thời gian).
- Độ sáng vệt trăng theo PHA TRĂNG chu kỳ 29 ngày tính từ dayIndex:
  trăng non còn 45%, rằm 100%; icon đồng hồ hiện đúng pha (🌑→🌕).
- Bài học GĐ51 áp dụng: bản đầu alpha 0.13 vẫn rửa sáng — đã hạ còn
  0.07–0.085 (ao 0.13) mới đạt "sáng như trăng, không chói". Ảnh đêm
  rằm 21:45 đã kiểm đạt. test5 PASS.

GĐ53 (23/10) — VA CHẠM NHÀ/CÂY (người chơi chụp ảnh: "người đi xuyên
nhà, xuyên cây luôn kìa"):
Nguyên nhân: (1) cây chỉ là hình vẽ, server không có vật cản cho cây
nên đi thẳng qua thân; (2) khung va chạm nhà nhỏ hơn hình vẽ (mái hiên
+ nóc thò ra 16–32px) nên đứng sát hông/nóc là bị mái "nuốt"; (3) quái
thường vốn không tránh vật cản nào (chỉ bị chặn khỏi làng).
Đã vá: TREE_TRUNKS — 20 thân cây thành vật cản (khớp WORLD_GEO.trees);
khung nhà nở +10px hai bên, +16px phía nóc (không nở mặt tiền để giữ
điểm tương tác); quái (đuổi + lang thang + trùm thử thách) và đồng
hành chuyển sang moveWithCollision tách trục; thêm "cửa thoát" chống
kẹt cho đối tượng lỡ đứng trong vùng cấm + BƯỚC NỬA khi bước đầy bị
chặn (mỗi tick đi ~26px, không có bước nửa thì dừng cách tường 26px).
test41 (cây chặn / nóc nhà / mặt tiền / vòng quanh cây) + test5 PASS.
Ghi chú gỡ lỗi: vùng chặn luôn trông "to hơn tính toán ~24px" vì bước
đi mỗi tick ~26px — không phải lỗi, là độ hạt của tick 10/s.

GĐ54 (23/10) — CÔNG PHÁP TÔNG MÔN (theo đúng file thiết kế, mục Tông môn
và đợt chiêu mộ): "Gia nhập tông môn: mở tiệm và công pháp riêng của tông
(ở bản đầu: danh sách ngắn các công pháp đã có trong bảng, giảm điều kiện
5 điểm chỉ số)". Cách làm: đệ tử Thiên Kiếm Môn / Huyền Thiên Tông nói
chuyện với Sứ Giả sẽ thấy mục "📜 Công pháp <tông>" — danh sách = công
pháp bậc TRÚC CƠ của lớp + vũ khí đang cầm trong bảng 511 sẵn có (5–6
chiêu), mỗi chiêu ghi rõ điều kiện gốc → điều kiện đệ tử (mỗi chỉ số
GIẢM 5 điểm). Học qua đường tông (learn_skill {via:'sect'}) dùng chính
luồng lĩnh ngộ ngồi học hiện có; server chặn: người ngoài tông, chiêu
không thuộc danh sách (Cơ bản/Luyện Khí/vũ khí khác). Môn phái nhỏ
Thanh Phong KHÔNG có công pháp tông — khớp bảng của file (phần của nó
chỉ gồm tiệm cơ bản + nhiệm vụ bang + 2 đồng hành). test42 (11 mục:
danh sách, giảm 40→35, học thường bị chặn/học qua tông được, lĩnh ngộ
xong thật, chặn chiêu Luyện Khí qua đường tông) + test5 ALL PASS.
Ảnh: preview54-sect.png.

GĐ55 (23/10 tối) — CỘNG ĐIỂM CHỈ SỐ LÀM LẠI (feedback trực tiếp từ bạn bè
đang test trên Render: "up chỉ số k bị thoát bảng đi" + "nhiều điểm phải
ấn nhiều quá"; người chơi chốt cách làm: thao tác tự do trên bảng, giữ
nút để tăng nhanh, thêm nút trừ, bấm OK mới xác nhận):
- BUG GỐC: trên cảm ứng, MỌI cú chạm trong thẻ nhân vật đều lan lên bộ xử
  lý chạm-thẻ (toggle expanded) → bấm + cộng điểm là bảng THU LẠI. Đã chặn:
  handler thẻ bỏ qua chạm từ #hudDetails + mọi nút trong bảng stopPropagation.
- Cách cộng mới (client): chọn bể điểm (chíp "Điểm tự do +1" / "Điểm đột
  phá +2") → mỗi dòng chỉ số có nút − / +; bấm = ±1, GIỮ = tăng liên tục
  (nhịp lặp chạy theo tick 10/s trong updateHudBars — setInterval bị máy
  yếu bóp nhịp nên không dùng); số đã chọn hiện vàng "+N" cạnh chỉ số;
  "Hoàn lại" hủy chọn; "✔ OK" mới gửi server.
- Server: sự kiện mới allocate_stats {free:{}, stat:{}} — kiểm tổng điểm
  từng bể, áp MỘT lần, cộng quá → từ chối + sync lại số thật; sự kiện cũ
  allocate_stat giữ nguyên tương thích.
- test43 (6 mục: áp đúng 1 lần, chặn quá điểm, lọc số âm/thập phân, tương
  thích sự kiện cũ) ALL PASS; probe cảm ứng: giữ + 1,3s chọn được +12
  điểm, bảng KHÔNG đóng, OK áp thật 15→27. Ảnh: preview55-stats.png.

GĐ56 (23/10 tối) — TỰ VÀO LẠI SAU KHI RỚT KẾT NỐI (feedback buổi test:
"server chạy đc chút thì đứng disconnect"). GỐC LỖI ở client: sau lần
nối đầu tiên, pendingMode bị xóa nên khi socket nối LẠI (rớt mạng, đổi
WiFi/4G, tab bị đóng băng, server chập chờn) client KHÔNG gửi lại hello
→ socket mới vô danh, nhân vật đứng hình tới khi tải lại trang. Đã sửa:
- Client nhớ helloPayload (phiên/tài khoản hoặc token khách) và gửi lại
  ở MỌI lần 'connect'; nếu đang trong game (wantsRejoin) và là tài
  khoản, danh sách nhân vật về là tự chọn lại đúng nhân vật cũ
  (activeCharId) — vào thẳng game, không dừng ở màn hình chọn.
- Server: spawnFromCharacter cho "nghỉ hưu" bản online của phiên cũ
  chưa timeout (_superseded) — phiên mới tiếp quản, thế giới chỉ còn 1
  bản; disconnect của socket cũ không kéo nhân vật đi nghỉ offline nữa.
- Server: guard uncaughtException/unhandledRejection (log + giữ sống),
  pingTimeout 20s → 45s cho server free CPU yếu.
- test44 (6 mục: rớt hẳn vào lại + di chuyển; tiếp quản khi phiên cũ
  còn treo; socket cũ chết không kéo offline) ALL PASS; probe trình
  duyệt thật: cắt mạng 4s → mở lại → nhân vật tự vào lại, chạy 624→911.
  Ảnh: preview56-reconnect.png.

GĐ57 (23/10 tối) — BÍ CẢNH THẠCH LÂM (bí cảnh NHỎ, hạng mục file xếp
"làm sau" + quyền lợi đệ tử tông môn trung/lớn theo bảng tông môn):
- Vùng mới phía đông thế giới (1760,240 — 880×720), ngăn với làng bằng
  dải rừng rậm + vòng đá: KHÔNG đi bộ qua được, chỉ vào/ra bằng cổng.
  Thế giới mở rộng 1600 → 2800 (nền phía đông nướng ở texture riêng
  'realm-bg' vì giới hạn 4096px của GPU điện thoại).
- Cổng vào ở sân Thanh Phong Môn (1470,600), cổng ra trong bí cảnh
  (1832,600) — đều là NPC cổng: bấm E → hộp thoại → nút qua cổng. Vào
  chỉ dành cho đệ tử Thiên Kiếm Môn / Huyền Thiên Tông (đúng file);
  người ngoài bị từ chối kèm lời nhắn đi gia nhập tông môn.
- Quái bậc Trúc Cơ lấy từ dữ liệu GDD của người chơi (MonsterData):
  Kiếm Ma (HP 420, ATK 26, Tu vi 22, hình kiếm khách ma), Huyết Lang
  (HP 350, ATK 30, Tu vi 22, hình sói nhuộm đỏ), Thạch Khôi Lỗi trấn
  đàn đá (HP 700, ATK 22, Tu vi 33, giáp đá def 8 — hình Thạch Quái
  xanh xám lớn hơn). def/tốc độ/hồi sinh là số TẠM vì dữ liệu không
  ghi (quái thường 30s, trùm 10 phút). Rương theo hạng Mạnh (B10);
  riêng trùm không rớt dưới phẩm B.
- Chặn xuyên vách hai phía: đuổi/đánh/tung chiêu đều không qua được
  vách bí cảnh; quái farm cũ không sinh sang phía đông.
- test45 ALL PASS (10 mục: từ chối người ngoài, đệ tử qua cổng, đủ
  quái đúng vùng, vách chặn, hạ trùm ra rương A, cổng về đúng chỗ);
  ảnh: preview57-portal.png (hộp thoại cổng), preview57-realm-entry.png
  (trong bí cảnh, cạnh cổng về + viền đá + tinh thể).

GĐ58 (23/10 tối) — KHÓA MÀN HÌNH DỌC + SỬA TAB BẢNG CÔNG PHÁP (feedback bạn bè
gửi ảnh+video: chơi dọc trên điện thoại vỡ hết bố cục; người chơi chốt
"chỉnh về ngang hết"):
- Lớp phủ #rotateLock: thiết bị CẢM ỨNG đang ở dọc (@media orientation:
  portrait + pointer: coarse) → phủ kín màn hình ngọc bích "Vui lòng xoay
  ngang điện thoại" + icon điện thoại tự xoay, chặn mọi thao tác; xoay
  ngang là tự biến mất, chơi tiếp ngay. Máy tính không bị khóa.
- GỐC LỖI tab Bảng 1/Bảng 2 phình thành oval khổng lồ (~330px) trong panel
  Công pháp (lỗi có CẢ ở ngang trên điện thoại, video bạn bè quay được):
  dòng hint "Đổi bảng..." nằm cùng hàng flex với 2 nút tab, bị ép hẹp nên
  quấn thành cột cao, kéo nút giãn theo (align stretch) + border-radius
  99px → oval. Đã tách hint xuống dòng riêng, nút flex:0 0 auto +
  align-items:center → tab về dạng pill 23px.
- Thẻ nhân vật trên mobile: max-height calc(100vh - 128px) + cuộn trong
  thẻ, không tràn xuống cụm nút chiêu ở màn ngang thấp.
- probe58 (shottools/probe_portrait58.cjs, server :3072): 6/6 PASS — dọc
  hiện khóa, ngang vào game bình thường, tab đo 153×23/147×23px; ảnh
  preview58-portrait-lock.png + preview58-learn.png. test5 ALL PASS.

GĐ59 (23/10 khuya) — HỆ THỐNG 52 BẢN ĐỒ (người chơi: "làm tất cả các map
còn lại trong file thiết kế + mấy chục map đó"):
- Nguồn sự thật: server/data/gdd/MapData.json (52 map) + MonsterData.json
  (21 quái). Đồ thị theo file: mọi map nối qua trung tâm thanh_van_thanh.
- TRẬN DỊCH CHUYỂN: vòng đá phát sáng ở mép đông quảng trường làng
  (1080,600); mỗi map khác có cổng ở nam-trung. Bấm E → danh sách điểm đến
  (server travel_list/travel_to; phải đứng ≤130px cạnh cổng; cổng kiểm
  cảnh giới theo minRealm/minTier của file, báo rõ "Cần Luyện Khí tầng 1"…).
  Từ làng → [Thanh Vân Thành, Thạch Lâm (chỉ đệ tử tông)]; từ thành → 50
  điểm (cả 48 map còn lại + làng + Thạch Lâm); từ map khác → chỉ về thành.
- Map chính (lang_tan_thu) GIỮ NGUYÊN thế giới 2800×1200 hiện tại (làng +
  farm + Thạch Lâm trong cùng map); bai_farm/thach_lam không tách runtime
  — mục Thạch Lâm trong danh sách là lối tắt dịch chuyển nội bộ, vẫn bắt
  đệ tử như GĐ57.
- 50 map mới là KHÔNG GIAN RIÊNG: đồng bộ theo phòng socket.io ('map:'+id)
  — chỉ thấy người/quái/rương/đạn cùng map; NPC/chợ/nhiệm vụ chỉ ở làng.
  Đồng hồ thế giới dùng chung. Chết ở map khác → hồi sinh quảng trường làng.
  Nhân vật lưu mapId + vị trí; đăng nhập lại đứng đúng map cũ.
- Cảnh quan SINH THEO CHỦ ĐỀ (seeded RNG theo id map — mọi người thấy
  giống nhau): 24 theme (thành thị/vườn thuốc/rừng huyết/băng/ngục lửa/
  hư không/kim loại/đầm lầy/mộ địa…) × bảng màu nền + ~26–64 vật trang trí
  (cây/đá/tinh thể/cột/trụ đèn/lò rèn/bia mộ…) kèm vòng đá cổng. Vật có
  bán kính cản được server giữ làm chướng ngại va chạm thật.
- Quái theo MonsterData.maps (28 cặp map–loài); 4 map file không gán quái
  được gán TẠM theo theme (bang_phong_coc←Thủy Triều Tinh, hoa_diem_son←
  Thạch Quái, van_thu_son_mach←Huyết Lang, tham_hai_bi_canh←Băng Tinh Cự
  Nhân). Số lượng TẠM: thường 5/map, Tu vi ≥33 hoặc hạng boss = 1. def/
  tốc độ/hồi sinh TẠM suy từ cảnh giới+hạng (file không ghi). Rơi đồ TẠM:
  linh thạch theo cảnh giới quái + đá quý 22%. Đánh quái nay cộng Tu vi
  cả cho Kim Đan+ (trước chỉ LK/TC).
- Hình quái mới (15 loài GDD): mượn hình họ gần nhất (sói/dơi/golem/người)
  + nhuộm màu + phóng tỉ lệ theo loài (GDD_MONSTER_VISUAL ở client) —
  hình RIÊNG từng loài là việc sau. Cơ chế riêng của quái trong file
  (Kiếm Ma kiếm khí tầm xa, Huyết Lang hút máu, Cốt Binh hồi sinh…) CHƯA
  làm — quái GDD dùng AI cơ bản chung.
- Kích thước map TẠM theo loại: thành 1600×1200, đất nghề 1400×1050,
  bãi săn/ngũ hành 1800×1350.
- Sửa kèm: thẻ nhân vật + thẻ chọn nhân vật nay gọi đúng "Kim Đan tầng N"
  (trước đây TC/KD đều hiện "Luyện Khí" — chỉ là chữ hiển thị).
- test46 (client/test46.cjs, :3074) ALL PASS 31 mục: Phàm nhân bị khóa
  cổng thành + Thạch Lâm; LK1 vào thành (tick chỉ thấy mình, người ở làng
  không thấy), 50 điểm đến từ thành, khóa đúng LK7/TC1/TC9/KD1; Dược Cốc
  an toàn không quái; LK9 hạ Thủy Triều Tinh ở Băng Phong Cốc (+4 Tu vi —
  số file), lưu map qua đăng nhập lại, chết về làng hồi đầy máu; KD1 vào
  Kim Quáng Động gặp đúng 1 Kim Giáp Tê. test5 ALL PASS. Probe trình
  duyệt probe_maps59.cjs 12/12 PASS + 5 ảnh preview59-*.png (cổng làng,
  thành, cốc băng, hư không, động kim) — đã xem bằng mắt: nền/vòng cổng/
  trang trí đúng theme, minimap + banner đúng tên vùng.

Các số TẠM của GĐ59 (chờ người chơi duyệt/đổi): kích thước map, số quái
mỗi map, def/tốc độ/hồi sinh quái GDD, 4 map gán quái tay, tỉ lệ rơi đá
quý 22% + linh thạch theo cảnh giới, hình quái mượn+nhuộm.

GĐ59b (23/10 khuya, sửa trong lúc chạy hồi quy test45): (1) Quái bí cảnh
không còn sinh camp ngay điểm vào + không sinh chụm (<110px) — trước đây
quái lang thang tụ ở cửa, người vừa qua cổng bị hội đồng chết. (2) Điểm
đáp bí cảnh có vòng an toàn 130px như cổng các map GĐ59 (quái không
đuổi vào vòng này). (3) Trùm có minChestGrade (Thạch Khôi Lỗi): CHẮC
CHẮN rơi rương — hệ số thưởng đệ tử ×2/3 từng làm xác suất rương trùm
tụt còn ~63%. test45 ALL PASS 13/13 sau 3 sửa này (kèm chỉnh test: đệ
tử mẫu mạnh đúng tầm Trúc Cơ + nhận diện rương tự mở trong tầm 42px).

## GĐ60 (24/10) — Kinh tế di chuyển + map siêu to + bản đồ thế giới

Theo luật người chơi chốt 24/10: đi lại phải là HÀNH TRÌNH để khám phá,
không phải bấm là tới nơi.

- MAP SIÊU TO: thành 2400×1800, đất nghề 2200×1650, bãi săn 3800×2850,
  vùng ngũ hành 4000×3000 (map nhà giữ nguyên vẽ tay). Trang trí dày
  theo theme: rừng/đầm lầy ~1 vật/7000px² (tối đa 650/map), theme khác
  ~1/12000px² (tối đa 420). Map dung nham có NÚI LỬA (chướng ngại r95)
  + 7 HỐ LỬA đứng vào mất 9 HP/giây; map băng có tới 2 HANG BĂNG
  (cảnh + chướng ngại). Client bỏ nướng 1 canvas khổng lồ, chuyển sang
  VẼ THEO LƯỚI Ô 1024px + texture trang trí dùng chung theo theme.
- QUÁI NHIỀU HƠN: mỗi map yếu/trung ×12, mạnh ×6, tinh anh ×3, trùm ×1
  (tổng cả server 224 quái). Độc Xà (doc_xa) thành quái PHỤC KÍCH: ẩn
  hoàn toàn (không hiện hình, không lên minimap, không bị đánh trúng),
  người tới <130px thì hiện hình lao ra với tốc độ ×2,1 trong 0,7s.
  Map không có người thì quái đứng yên (tiết kiệm CPU).
- TRẬN DỊCH CHUYỂN CÓ GIÁ (theo cảnh giới map đích): Luyện Khí 50,
  Trúc Cơ 150, Kim Đan 400 Linh thạch (Nguyên Anh 900 / Hóa Thần 1600
  để sẵn). VỀ LÀNG luôn miễn phí; từ map xa VỀ THÀNH miễn phí
  (chống kẹt); làng → thành vẫn 50 như map LK khác. Đang hộ tống thì
  cả tuyến tới map đích miễn phí.
- NGỰ KIẾM: Kim Đan trở lên, miễn phí nhưng CHẬM — 15 giây/chặng
  (env TTT_JOURNEY_MS chỉnh được), có thanh đếm ngược trên màn hình;
  di chuyển / chết / thoát game là HỦY hành trình.
- THUYỀN: đảo ngoài biển (Thâm Hải Bí Cảnh) — Trận KHÔNG tới được;
  thuyền chỉ chạy tuyến Thanh Vân Thành ↔ đảo (20 giây/chặng); Kim
  Đan có thể ngự kiếm qua thay thế.
- HỘ TỐNG THƯƠNG NHÂN: NPC mới Lái Buôn (1005,545 — cạnh Trận ở
  quảng trường). Nhận chuyến → thương nhân (500 HP, không đánh trả)
  đi theo; qua Trận miễn phí cả tuyến; tới map đích có 2 quái PHỤC
  KÍCH gần điểm đáp; đưa thương nhân tới điểm giao hàng GIỮA map
  (cột sáng vàng + chấm vàng trên minimap) → thưởng theo cảnh giới
  map đích: LK 80 LT + 8 Tu vi, TC 160 + 16, KD 260 + 30 (NA/HT để
  sẵn 400+45 / 600+60). Thương nhân chết = hỏng chuyến; bỏ chuyến
  thì ông ta tự về. Trạng thái hộ tống KHÔNG lưu qua đăng xuất
  (thoát game = bỏ chuyến) — giới hạn v1.
- BẢN ĐỒ THẾ GIỚI: bấm vào minimap → panel vẽ map hiện tại (vật
  trang trí, hố lửa, núi lửa, hang băng, cổng, điểm giao hàng, vị
  trí của mình) + chi tiết quái từng map + sổ 51 map: khóa cổng,
  giá dịch chuyển, đường nào đi thẳng được. Nút "Đi" trong panel
  cũng dùng được khi đứng cạnh Trận.
- test47 (client/test47.cjs, :3078, TTT_JOURNEY_MS=300) ALL PASS 42
  mục: nghèo bị chặn vì Linh thạch, trừ phí đúng từng chặng (tổng
  300 LT cho tuyến TC9), ngự kiếm chậm + hủy khi di chuyển, thuyền
  đúng tuyến, rắn ẩn → hiện, hố lửa đốt máu, hộ tống trọn vòng
  (miễn phí 2 chặng, phục kích 2 quái, giao hàng nhận thưởng, bỏ
  chuyến). test46 cập nhật kích thước mới + ALL PASS; test45 +
  test5 ALL PASS. Probe trình duyệt: 6 ảnh preview60-*.png (hộp
  thoại Trận ở thành 98 nút đi, rừng Thanh Mộc Lâm dày, núi lửa +
  hố lửa Hỏa Diệm Sơn, panel bản đồ thế giới, thanh ngự kiếm đếm
  ngược 8s → tới thành) — đã xem bằng mắt.

Các số TẠM của GĐ60 (chờ người chơi duyệt/đổi): kích thước map, mật
độ trang trí, số quái mỗi hạng, bảng giá dịch chuyển, 15s/chặng ngự
kiếm (thuyền 20s), thưởng hộ tống, hố lửa 9 HP/giây, vị trí núi
lửa/hang băng sinh ngẫu nhiên theo seed map.

## GĐ61 (24/10) — Làm lại HUD theo CẤU TRÚC ảnh mẫu bạn bè gửi

Bạn bè chê "đồ họa và HUD cổ" (tiếp nối nhận xét của Đặng Nam tối
23/10). Người chơi gửi 2 ảnh mẫu (mobile + web) của một game tu tiên
khác và chốt: LẤY CẤU TRÚC, tên nút/nội dung giữ của game mình.

- TRÁI TRÊN: thẻ nhân vật (avatar tròn, tên, cảnh giới, 3 thanh
  HP/Chân nguyên/Tu vi) → pill 💠 Linh thạch → khung nhiệm vụ ngay
  dưới thẻ (tracker cũ chuyển thành ô riêng bo góc).
- GIỮA TRÊN: pill tên vùng + dòng đồng hồ thế giới → THANH TRÙM mới:
  khi có trùm/quái thử thách đang giao chiến trong ~950px, hiện tên
  + thanh máu đỏ lớn kiểu mẫu (server gửi thêm cờ boss trong sync).
- PHẢI TRÊN: minimap (tên vùng chuyển lên ĐẦU khung) + hàng nút công
  cụ CÓ NHÃN CHỮ: Túi đồ / Nhiệm vụ / Công pháp (nút MỚI, mở Sổ công
  pháp) / Nghề / Thành tựu / Menu. Sửa luôn lỗi cũ: minimap trước
  để pointer-events:none nên người chơi bấm chuột thật KHÔNG mở
  được bản đồ thế giới (probe bấm bằng DOM nên không phát hiện) —
  nay bấm được thật.
- TRÁI DƯỚI: NHẬT KÝ thông báo (khu chat của mẫu — game mình chưa
  có chat người chơi nên đặt nhật ký sự kiện): mọi thông báo server
  + mở rương đều ghi 1 dòng, tối đa 5 dòng, tự mờ sau 14s. Nút 🎒
  Túi đồ (I) cũ ở góc này bỏ (trùng nút hàng công cụ).
- GIỮA DƯỚI: khay chiêu đổi sang ô vuông bo góc 14px, badge phím có
  nền tối — giữ nguyên 10 ô + Né Space như luật cũ.
- HÔ TÊN CHIÊU: tung chiêu từ bậc Luyện Khí trở lên → tên chiêu hiện
  chữ vàng serif lớn giữa màn hình kiểu "Trầm Thiên Kiếm Thuật!"
  trong mẫu (chiêu Cơ bản không hô cho đỡ rối).
- Mobile: cùng cấu trúc thu gọn — thẻ trái trên, minimap phải trên,
  hàng nút có nhãn ngay dưới minimap, cụm chiêu tròn phải dưới giữ
  nguyên (vốn đã giống mẫu).
- Kiểm chứng: probe61 13/13 PASS (bố cục đo bằng tọa độ thật trên
  desktop + giả lập mobile; thanh trùm hiện đúng "Hỗn Độn Thú
  4446/4500" khi đánh trùm ở Vô Tận Hư Không), test5 ALL PASS,
  3 ảnh preview61-* đã xem bằng mắt. CHƯA gồm: đổi đồ họa THẾ GIỚI
  (mẫu là vẽ vector phẳng — hướng đồ họa thế giới vẫn là câu hỏi mở
  riêng), số sát thương nổi (server chưa phát số đòn đánh), chat
  thật giữa người chơi.

## GĐ62 (24/10) — Tinh chỉnh HUD mobile theo góp ý trực tiếp của người chơi

- Joystick + nút ⚔: dời sát góc (8px) và to lên (joystick 102px,
  ⚔ 66px) cho ngón tay dễ thao tác.
- Thanh HP + Chân nguyên: TÁCH khỏi thẻ nhân vật, đặt thành cụm
  riêng ở GIỮA DƯỚI màn hình (rộng tối đa 330px, chữ số to rõ);
  trong thẻ trên mobile chỉ còn thanh Tu vi. Desktop giữ nguyên.
- Hàng nút công cụ trên mobile: thu nhỏ (34×38px) và ôm sát minimap
  (cách 4px).
- probe62 11/11 PASS (đo tọa độ/kích thước thật trên giả lập mobile +
  đối chứng desktop không đổi), ảnh preview62-mobile.png đã xem.

## GĐ63 (24/10) — Chỉnh HUD mobile đợt 2 theo góp ý người chơi

- Joystick + nút ⚔: cách góc/mép 16px (≥15px theo yêu cầu) để đặt
  tay lên điện thoại dễ thao tác; cả vòng cung chiêu dời theo.
- Thanh HP/Chân nguyên dưới giữa: thu còn ~một nửa (rộng 205px,
  thanh cao 11px).
- Hàng nút công cụ: đổi thành lưới 2 cột × 3 hàng ÔM SÁT mép trái
  minimap, cao ngang minimap.
- Bấm minimap trên mobile: panel Bản đồ thế giới mở dạng popup TO
  giữa màn hình (97% bề ngang). Kèm sửa: tổng quan map nhà trước
  trả decor rỗng nên canvas ở làng trống trơn — nay lấy 41 điểm
  cây + nhà từ hằng số thế giới. (Bản nháp đầu của sửa này làm sập
  handler overview vì TREE_TRUNKS lưu dạng hộp {x,y,w,h} chứ không
  phải cặp [x,y] — đã sửa + kiểm chứng bằng socket test riêng.)
- probe63 12/12 PASS (gồm chạm thật vào minimap trên giả lập cảm
  ứng), test5 ALL PASS, ảnh preview63-mobile/worldmap đã xem.

## GĐ64 (24/10) — Chỉnh HUD mobile đợt 3 + làm lại popup bản đồ

- Thẻ nhân vật mobile thu nhỏ (avatar 24px, chữ 8–11px, thẻ cao
  ~147px so với ~170px trước).
- 5 ô chiêu cảm ứng xếp QUẠT đều quanh nút ⚔ (bán kính 124px, góc
  giãn dần, tâm các nút kề nhau ≥44,6px — không chồng). Né + ô đa
  dụng lùi sang trái nhường quạt. (Đối chiếu luật ô: Kim Đan mở đủ
  5 ô chính — LK 3 ô/tầng 7→4, TC 4 ô/tầng 7→5, KD+ 5; thêm 4 ô đa
  dụng mỗi bảng × 2 bảng.)
- Thanh HP/Chân nguyên: mỏng hơn (9px) + dài ra (300px).
- Popup Bản đồ thế giới làm lại: canvas theo đúng tỉ lệ map (hết
  dải đen), lưới tọa độ 200px, khung + tên từng vùng (Làng / Thanh
  Phong Môn / Bí Cảnh), NPC chấm vàng CÓ TÊN (tên tự né khi NPC
  đứng sát nhau), chú thích ký hiệu.
- probe64 15/15 PASS, ảnh preview64-mobile/worldmap đã xem.

## GĐ65 (24/10) — Chỉnh HUD mobile đợt 4: quạt chiêu thu sát ⚔ + gỡ nút bị đè + popup bản đồ gọn/xịn

- Đo thật GĐ64 trước khi sửa (probe đo rect): mép nút ⚔ cách mép chiêu
  69–81px (khoảng trống chết), trong khi 5 nút chiêu sát nhau chỉ hở
  0,6px (nhìn như dính nhau). Và lỗi thật nặng hơn: nút Né (tDodge)
  với nút tương tác (tAct, hiện "E"/"···") đè lên nhau — tâm cách nhau
  chỉ ~13px trong khi mỗi nút rộng 36px, nên nút tương tác bị Né che
  gần hết (các pha trước chỉ đo tAct nên lọt lỗi này).
- Quạt chiêu mới (chỉ touch): 5 nút thu còn 40px trên vòng R=92 quanh
  ⚔, góc −12°/16°/44°/72°/100° → mép ⚔–chiêu còn tối đa 39px, tâm kề
  44px (hở 4px, hết chạm nhau), không nút nào chạm mép màn hình
  (cách ≥10px). Chú ý: luật cũ dùng selector ID (#tSkill…) nên thắng
  luật class — GĐ65 phải ghi đè bằng chính selector ID mới thu nhỏ
  được nút (phát hiện khi probe lần 1 vẫn đo ra 44px).
- Cặp Né + tương tác xếp dọc bên trái Chiêu 1 (Né dưới, tương tác
  trên): tâm cách nhau 48px, cách chiêu gần nhất 50–52px — hết đè.
  Ô đa dụng thành cột ôm sát bên trái cụm mới. ⚔/joystick giữ nguyên
  cách mép 16px; desktop không đổi.
- Popup bản đồ làm lại lần 2 cho gọn/xịn: nền gradient, panel bo
  18px + viền sáng; lưới thưa lại (400px, mờ hơn); chấm cây/nhà mờ
  hơn; khung vùng nền rất nhạt + nhãn dạng pill; NPC chấm vàng viền
  tối + nhãn pill thử 4 vị trí (phải/trái/trên/dưới), vị trí nào cũng
  đè thì xếp chồng xuống dưới kèm đường nối mảnh — hết cảnh tên đè
  lên nhau ở giữa làng; cổng dịch chuyển đổi thành hình thoi xanh lá
  (khác hẳn chấm tròn NPC); chú thích thành hàng chip bo tròn.
- probe65 14/14 PASS (gồm chạm thật vào minimap), test5 ALL PASS,
  ảnh preview65-mobile/worldmap đã xem bằng mắt.

## GĐ66 (24/10) — Thẻ gọn + ⚔ kiêm E + ô đa dụng/bình thuốc luôn hiện nút

- Thẻ nhân vật mobile thu gọn hẳn (từ ~147px còn ~54px khi thu):
  Linh thạch tách khỏi khung thẻ → pill riêng cố định dưới minimap
  (chỉ cảm ứng; desktop vẫn trong thẻ). Bỏ dòng "Công pháp — học
  chiêu mới" trong thẻ → chấm đỏ có số trên nút Công pháp (số chiêu
  đủ điều kiện chỉ số, chưa học, chưa đang lĩnh ngộ; nhân vật test
  Trúc Cơ 9 đo được 16). Bỏ dòng "Chỉ số · còn N điểm" trên cảm ứng
  → chấm đỏ có số trên góc TRÁI avatar (chạm thẻ vẫn mở bảng chỉ số
  như cũ; bản đầu đặt góc phải làm che 2 chữ đầu của tên — đã dời).
  Bỏ chữ "(Kim Đan chưa mở)" ở dòng cảnh giới. Khi thẻ thu lại thì
  ẩn dòng Tuổi + Linh căn (mở thẻ ra vẫn thấy đủ; riêng cảnh báo Ân
  hạn tọa hóa luôn hiện). Thẻ khi thu chỉ còn: tên, hướng tu + vũ khí,
  cảnh giới, thanh Tu vi (+ tên tông môn/Công trạng khi có).
- Nút tương tác (E/…) riêng BỎ HẲN — tích hợp vào nút ⚔ như nhiều
  game khác: đứng gần chỗ tương tác được thì nút ⚔ đổi thành E nền
  xanh lá, bấm là tương tác (mở đúng panel/NPC/cổng đó); đi ra xa thì
  nút trở lại ⚔ đánh thường. Đã kiểm bằng đi bộ thật tới Bảng treo
  thưởng: nút hóa E + bấm mở được Bảng. Lưu ý: đứng sát NPC thì nút
  là E, muốn đánh quái phải bước ra xa một chút (ngoài tầm 70px).
- Ô đa dụng + bình thuốc LUÔN HIỆN nút (trước đây trống là ẩn nên
  người chơi không thấy): 4 ô phụ về hàng ngang đáy giữa (như GĐ48
  từng chốt), trống thì "Đ1..Đ4" viền đứt — bấm ô trống mở Sổ công
  pháp để lắp chiêu hỗ trợ. Thêm nút bình thuốc 💊 cùng hàng: ưu tiên
  Hồi Xuân Đan, rồi Đan Tụ Khí, rồi vật phẩm dùng được khác trong túi
  (kèm số lượng); túi trống thì nút mờ, bấm mở Túi đồ.
- probe66 20/20 PASS (gồm đi bộ tới Bảng + bấm E mở Bảng + bấm bình
  thuốc mở Túi đồ), test5 ALL PASS, ảnh preview66-mobile/interact
  đã xem bằng mắt.
- Sửa nhỏ sau GĐ66 (theo ý người chơi): pill Linh thạch dưới minimap
  trên cảm ứng viết gọn "💠 LT: N" (LT là chữ tắt game đã dùng ở phí
  dịch chuyển) — đo được 79px, nằm trọn trong bề ngang minimap
  110px; desktop vẫn giữ đủ chữ "Linh thạch hạ phẩm". probe66 cập
  nhật lên 21/21 PASS.
- Sửa nhỏ (2) sau GĐ66: người chơi chê "💠 LT: N" vẫn dài → pill
  trên cảm ứng chỉ còn chữ "💠 Linh thạch" (81px); bấm pill mở panel
  Ví Linh thạch liệt kê đủ 4 phẩm theo file thiết kế. MMO hiện chỉ
  có 1 số dư thật (Hạ phẩm = c.stones, mọi giao dịch đều dùng nó)
  nên 3 phẩm cao hiện 0 kèm ghi chú, không bịa số. Bấm pill không
  làm thẻ nở/thu bảng chỉ số (stopPropagation). Trên desktop, dòng
  Linh thạch trong thẻ giữ đủ chữ + số và bấm cũng mở panel ví —
  lúc đầu desktop bấm không mở vì thẻ chỉ có pointer-events: auto
  trên cảm ứng, click xuyên xuống canvas; đã thêm pointer-events:
  auto riêng cho dòng Linh thạch. probe66 lên 25/25 PASS.

## GĐ67 (24/10) — Phẩm Linh thạch trong rương + panel ví gọn

- Người chơi đính chính: Trung/Thượng phẩm có từ mở rương (theo
  file/SP), và chốt mốc: Trung phẩm ở rương Trúc Cơ trung trở lên,
  Thượng phẩm ở rương Kim Đan hậu trở lên (rương LK vẫn chỉ Hạ).
- Code MMO trước đây: rương không ghi quái nào rơi ra, loot `stones`
  về thẳng 1 ví Hạ phẩm; quái chỉ có cảnh giới, không có tầng; map
  KD toàn cổng KD1 nên mốc "KD hậu" không bám được vào cổng map.
  Quy ước đã ghi rõ trong code để người chơi sửa từng loài nếu muốn:
  mỗi loài có thêm `stage` (sơ/trung/hậu) — TC = trung kỳ; KD hạng
  Trung = trung kỳ, KD hạng Mạnh/Tinh anh/Trùm = hậu kỳ; LK = sơ kỳ;
  NA/HT = hậu kỳ. Loài làng/bí cảnh được gán cảnh giới theo
  MonsterData (sói/dơi/thạch = LK sơ; Kiếm Ma/Huyết Lang/Khôi Lỗi
  = TC trung). Rương ghi `stoneGrade` lúc rơi (phân biệt "phẩm rương"
  C/B/A với "phẩm Linh thạch" Hạ/Trung/Thượng); mở rương cộng đúng
  ví (`stones` / `stonesTrung` / `stonesThuong`, vẫn nhân hệ số
  thưởng 2/3 khi có đồng hành) và toast ghi rõ phẩm. Ví mới được
  lưu bền (persistPlayer), đồng bộ (characterPayload) và spawn từ
  file cũ (thiếu → 0). Chi tiêu (mua/dịch chuyển/hộ tống/chế tạo)
  vẫn chỉ dùng Hạ phẩm — Trung/Thượng hiện chỉ tích lũy từ rương.
  Cực phẩm chưa có luật rơi, vẫn 0.
- Panel ví gọn theo ý người chơi: bỏ hết dòng mô tả + ghi chú cuối,
  chỉ còn 4 hàng tên + số; panel thu từ 268px còn 216px.
  probe66 cập nhật (panel không mô tả + rộng ≤230px).
- Kiểm chứng: probe_chestgrades hạ quái thật 3 đường — sói LK →
  chỉ Hạ; Kiếm Ma TC ở Cổ Chiến Trường → Trung; Kim Giáp Tê KD
  mạnh ở Kim Quang Động → Thượng.

## GĐ68 (24/10) — Sắc nét + asset môi trường mới + icon công pháp

- Sắc nét: 6 texture map GĐ60 (decor, plaza, núi lửa, hang băng,
  hố lửa, nền lát ô 1024) chuyển từ NEAREST sang LINEAR — hết răng
  cưa/rung khi camera di chuyển. Map nhà vốn đã LINEAR từ GĐ29;
  nhân vật/quái vẫn NEAREST để giữ nét pixel.
- 15 kind decor mới trong drawDecorItem (vẽ vector viền sáng):
  trúc, đào, liễu, dừa; nhà ngói, lều, đình; núi, núi tuyết; hang đá;
  ao, sóng; cỏ, hoa, cỏ khô. THEME_DECOR cân lại theo theme (tổng
  trọng số mỗi theme vẫn = 1,00); va chạm: nhà 22, lều/đình 18,
  núi 30, hang 18, cây mới 14–16; ao/sóng/cỏ/hoa không va chạm.
  Map làng KHÔNG đổi decor (tránh rối bản đồ thế giới).
- Icon cho cả 511 công pháp (skillIconURL, vẽ Canvas 2D, cache):
  màu theo hệ (Kim/Hỏa/Mộc/Thủy/Thổ + "Theo linh căn" = vòng 5 màu),
  khung theo bậc (Cơ bản vuông đồng, Luyện Khí thoi ngọc, Trúc Cơ
  lục giác vàng), glyph theo 10 họ vũ khí (đao/kiếm, thương, búa,
  côn/trượng, châu/trận, phiến, sách/bút, lưới, đàn, quyền cước);
  chiêu hỗ trợ thêm viền xanh nhạt. Icon hiện ở Sổ công pháp (mọi
  hàng) và nút chiêu cảm ứng khi đã lắp chiêu; khay chiêu desktop
  vẫn giữ chữ (ô 52px không đủ chỗ icon + tên 2 dòng).
- Kiểm chứng: probe_hud68 29/29 — 6 texture LINEAR, đủ 15 kind mới,
  map rừng sâu gửi đủ trúc/đào/cỏ, Sổ 19/19 hàng có icon, nút chiêu
  chính hiện icon Trảm Kiếm, chuỗi làng → thành → rừng mở đúng
  dialog dịch chuyển; ảnh rừng/làng/Sổ/ví đã xem bằng mắt.

## GĐ69 (24/10) — Sổ công pháp dạng tab + khay desktop icon-only + Cực phẩm rương boss

- Sổ công pháp mở như 1 tab mới: panel rộng (tối đa 900px,
  94% màn hình), tiêu đề dính trên cùng + nút ✕, nội dung cuộn
  dọc — hết tràn tab "Bảng 2" và hết che cụm nút toolbar như
  panel hẹp 268px trước đây (desktop + mobile đều vậy).
- Icon "Theo linh căn" bỏ vành 5 màu, dùng 1 màu trung tính
  (#8fa3bd) tạm thời; vẽ tay từng chiêu để sau, chưa gấp.
- Khay chiêu desktop: ô có chiêu chỉ hiện icon, bỏ tên +
  chân nguyên; số phím nhỏ ở góc giữ lại để biết bấm phím nào.
  Ô trống và ô ⚔/💨 giữ nguyên.
- Cực phẩm có luật rơi: rương boss (quái có minChestGrade:
  Thạch Khôi Lỗi + boss các map GDD) cho Cực phẩm; ví thêm ô
  stonesCuc (lưu bền + đồng bộ + panel ví hiện số thật).
  Rương ẩn và nhiệm vụ xịn là 2 nguồn Cực tiếp theo, làm khi
  có cơ chế rương ẩn / bảng nhiệm vụ xịn.
- Luật tiền tệ về sau (ý người chơi): Trung/Thượng càng về
  sau càng là tiền chính (mua đồ, luyện chế...); hướng đồ họa
  tổng thể = pixel đời mới; decor làng kiểu làng trong
  truyện/phim tu tiên (đợt vẽ lại làng làm tiếp sau GĐ69).
- Kiểm chứng: probe_gd69 12/13 — 1 fail là lỗi check tĩnh
  (quét nhầm ô ⚔/💨), check trên trình duyệt khẳng định ô
  chiêu chính có icon, không tên, chỉ còn số phím; rương boss
  Hỗn Độn Thú ở Vô Tận Hư Không cho 65 Cực phẩm ngay lượt
  đầu; tab Sổ rộng 900px (desktop) / 793px (mobile), cuộn
  dọc được, tab Bảng 2 không cắt; ảnh tab đã xem bằng mắt.

## GĐ70 (24/10) — Tất cả loài quái + số lượng theo map + luật trùm + cơ chế riêng
- Luật quái (ý người chơi): làm tất cả loài; map yếu cực
  nhiều quái, map mạnh ít dần; map Luyện Khí cơ bản không
  có trùm; map khác có trùm; map đặc biệt có nhiều trùm.
- Số lượng: cơ số yếu/trung 12, mạnh 6, tinh anh 3, trùm 1;
  nhân hệ số theo cảnh giới map đích: LK ×3, TC ×2,
  KD/NA/HT giữ nguyên. Tổng quái 224 → 367.
  Loài cứng giữ nguyên số lượng (làng 12 + bí cảnh 9).
- Trùm theo map: mọi map TC/KD có quái mà chưa có trùm
  thật thì lấy loài mạnh nhất map làm trùm (1 con, cờ
  mapBoss: thanh máu trùm + rương chắc chắn tối thiểu B +
  Linh thạch Cực phẩm + hồi sinh 10 phút như trùm thật).
  21 trùm map. 2 map đặc biệt 3 trùm: Vô Tận Hư Không
  (Hỗn Độn Thú ×3) + Thâm Hải Bí Cảnh (1 thường + 3 trùm
  Cự Nhân Băng, đi thuyền từ thành).
- Cơ chế riêng cho 18 loài theo MonsterData.mechanics
  (mọi số TẠM): độc (Độc Xà 2 HP/s×5s, Huyền Điệp 3×4s),
  lao + choáng (Lam Trư, Kim Giáp Tê), hồi sinh 1 lần 50%
  (Cốt Binh), làm chậm khi đánh trúng (Thủy Triều Tinh
  40%×3s), đánh xa (Kiếm Ma 150, Đan Ma 130, Lôi Điêu 150
  + sét dây chuyền), hút máu (Huyết Lang 30%, Hấp Huyết
  Quỷ 40% + tàng hình), phân thân (Huyễn Ảnh Miêu né 60%
  + 2 ảo ảnh HP 30% — ảo ảnh không Tu vi, không rương,
  tồn tại tối đa 25s kể cả khi bản thể chết), kháng vật
  lý 50% (Thạch Khôi Lỗi), độn thổ (Địa Hành Yêu), dậm
  băng có vận chiêu (Băng Tinh Cự Nhân: vòng 120, ×1,2,
  làm chậm 50%×3s, báo trước bằng notice + nhuộm đỏ
  sprite), mưa lửa (Diệm Hỏa Phượng), triệu sét (Thiên
  Lôi Thú), trùm 5 hệ ngẫu nhiên (Hỗn Độn Thú), tự bạo
  khi chết (Đan Ma). Trạng thái người chơi (độc/chậm/
  choáng) có notice riêng, không lưu file.
- Sửa kèm: loài GDD trùng loài cứng (Kiếm Ma/Huyết
  Lang/Thạch Khôi Lỗi) được backfill cơ chế + tầm đánh +
  hạng từ GDD (trước đây alias làm mất cơ chế); quái
  đánh xa dừng ở tầm đánh của nó thay vì áp sát 26px.
- Giản lược v1 (chờ người chơi duyệt): loài đánh xa gây
  sát thương ở tầm xa nhưng chưa có đạn bay nhìn thấy;
  Diệm Hỏa Phượng chưa bay thật; Hấp Huyết Quỷ tàng hình
  = ẩn tới khi lộ lần đầu, không ẩn lại; dậm băng báo
  bằng notice + nhuộm đỏ, chưa có vòng đỏ dưới đất;
  trạng thái người chơi chưa có biểu hiện trên sprite/HUD.
- Kiểm chứng: probe_gd70 20/20 — /api/status 367 quái;
  Băng Phong Cốc 36 Thủy Triều Tinh, 0 trùm; Cổ Chiến
  Trường 13 Kiếm Ma (12 + 1 trùm); rương trùm cho Cực
  phẩm; độc rút máu khi đứng yên; lao gây choáng; Kim
  Quang Động 7 Kim Giáp Tê (6 + 1 trùm); phân thân +
  hạ ảo ảnh không thưởng; dậm băng có windup; kiếm khí
  trúng từ 113–141px; Thâm Hải 3 trùm; tick giữ 100ms
  với 367 quái (map không có người thì quái đứng yên).

## GĐ71 (24/10) — Icon chiêu game-icons + mặt nút Kenney
- Icon chiêu: 511 chiêu trong skills_catalog.json được
  map sang icon game-icons.net (CC BY 3.0, credit trong
  panel Menu) theo từ khóa trong tên chiêu + hệ + vũ
  khí, phân phối băm để chiêu cùng họ nhận biến thể
  khác nhau. Kết quả: 189 icon riêng (bản procedural cũ
  chỉ có 111 mẫu). Icon sinh ra là SVG 96×96: khung bậc
  (đồng / thoi ngọc / lục giác vàng) + silhouette tô
  màu hệ + vành lam cho chiêu hỗ trợ; nền đen gốc của
  game-icons đã gỡ, scale theo viewBox thật của từng
  file (512 hoặc 256).
- Nối vào client: skillIconURL() trả /icons/<id>.svg
  khi id có trong skill_icons.ts (sinh tự động bởi
  shottools/gen_skill_icons.py); chiêu ngoài catalog
  (2 chiêu legacy Ngự Kiếm Quyết, Thiên Kiếm Vô Song)
  vẫn dùng icon procedural cũ — đúng thiết kế fallback.
  File SVG nằm trong client/public/icons/ (2,0 MB) nên
  theo zip lên Render và được Vite copy sang dist.
- Mặt nút toolbar: tile tròn Kenney UI Pack - Pixel
  Adventure (CC0, tile_0042 xám xanh) làm background
  cho #sideBtns button — chỉ là background nên KHÔNG
  đổi kích thước/vị trí nút. Nút cảm ứng chưa áp (chờ
  xem trên máy thật).
- Kiểm chứng: probe_gd71 11/11 — Sổ 17/19 icon thật
  (2 hàng procedural đúng 2 chiêu legacy), 0 icon vỡ,
  khay desktop có icon thật, Menu hiện credit; ảnh
  preview71-learn.png / preview71-hud.png /
  preview71-kenney.png đã xem bằng mắt.
- Chưa làm: vẽ tay từng icon chiêu (người chơi dặn
  không gấp — vẫn PARKED); Báo (panther/leopard) không
  có file trong game-icons nên chiêu Báo dùng icon vũ
  khí; 2 chiêu legacy ngoài catalog chưa có icon thật.

## GĐ72 (24/10) — Nhà làng PixelLab nối vào Làng Tân Thủ
- Sprite `client/public/sprites/house_village_01.png` (gen PixelLab
  24/10, 192×128, nền trong suốt) vẽ thay mặt tiền code cho 5 nhà
  nhỏ: Nhà Trưởng Làng, Tiệm Đan Dược, Tiệm Rèn, Quán Ăn, Tiệm
  Nguyên Liệu. Vẽ vừa chiều ngang hộp nhà, giữ tỉ lệ gốc, có bóng
  đất; load lỗi thì rơi về vẽ code như cũ.
- Đạo Quán + Thanh Phong Môn GIỮ vẽ code. Khung va chạm, vị trí
  và depth không đổi — chỉ đổi texture nướng `house-i`.
- Ảnh `preview72-village.png` đã xem bằng mắt: nhà nhỏ hiện đúng
  sprite (mái ngói cong, tường gỗ, đèn lồng đỏ), Đạo Quán vẫn
  kiểu cũ. Zip GĐ54→GĐ71 hiện tại CHƯA có GĐ72 — đóng lại sau khi
  người chơi duyệt ảnh trong game.

## GĐ72b (24/10) — Sửa nhà sprite bay + phóng to
- Theo feedback "nhà bay lơ lửng": đo được ảnh 192×128 có viền
  trong suốt (trái/phải 12px, trên 9px, dưới 10px) và bản GĐ72 vẽ
  căn giữa hộp nên đáy nhà nổi ~19px trên bóng đất.
- Sửa: cắt đúng vùng thấy được (12,9,168×109), phóng 1.3× chiều
  ngang hộp, neo đáy nhà vào đáy hộp, bóng đất theo chiều ngang
  mới ngay dưới đáy. Ảnh `preview72b-village.png` đã xem bằng mắt:
  nhà to hơn ~49% so với bản đầu, đáy chạm đất.

## GĐ72c (24/10) — Nhà nhỏ to thêm xíu
- Theo feedback "to hơn xíu": tỉ lệ 1.3× → 1.45× chiều ngang hộp
  (vừa khung nướng: nhà 140px có mép x = 0.5px, không cắt).
- Bóng đất kẹp rx ≤ w/2 + 18 cho khỏi tràn khung nướng (bóng vẽ
  liền màu, tràn là thấy vệt cắt). Ảnh `preview72c-village.png`
  đã xem bằng mắt: nhà to hơn rõ, đáy vẫn chạm đất.

## GĐ72d (24/10) — Bỏ bóng nhà sprite + gen Đạo Quán/cây
- Theo feedback "bóng nhà nhìn như bay": bỏ hẳn ellipse bóng đất
  của nhà sprite (nhà vẽ code giữ nguyên bóng trong drawBuilding).
  Ảnh `preview72d-village.png` đã xem bằng mắt: nhà đứng trực tiếp
  trên cỏ bằng chân đế đá, hết cảm giác bay.
- Gen PixelLab 2 ảnh (user duyệt spec, tốn 2 lượt, tổng 3/40):
  `dao_quan_01.png` (384×192, đại điện rộng 2 tầng + 2 cánh) và
  `tree_village_01.png` (128×128, tán tự nhiên). Ảnh Đạo Quán gốc
  về với nền xám đặc (no_background không tác dụng ở cỡ này) nên
  đã tách nền miễn phí bằng flood-fill + dọn viền, ra
  `dao_quan_01_cut.png` (vùng thấy được 338×146). Cả 2 CHƯA nối
  vào game — chờ user duyệt.

## GĐ73 (24/10) — Nối Đạo Quán + cây PixelLab vào làng
- `dao_quan_01.png` (bản cắt nền) + `tree_village_01.png` vào
  `client/public/sprites/`, preload `dao-quan-01`/`tree-village-01`.
- Đạo Quán nướng canvas riêng `DAOQUAN_TEX` (352×160, đặt ở
  h.x−81): sprite 320×138, đáy ở world 360 (đáy hộp cũ), đỉnh
  world 222 — tâm Tụ Linh Trận (700,196) vẫn nhìn thấy. Biển tên
  vẽ code mất theo (sprite có biển vàng trống).
- Cây làng: cả 20 cây dùng sprite (vùng thấy được 102×114, đáy
  neo điểm đất canvas y=130, giữ độ lệch cỡ cũ s 0.9–1.3, cây lẻ
  lật ngang). Cây decor các map GĐ60 không đổi. Va chạm/vị trí/
  depth không đổi; load lỗi thì vẽ code. Ảnh `preview73-village.png`
  đã xem bằng mắt: Đạo Quán bề thế, cây tự nhiên nhiều cỡ.

## GĐ74 (25/10) — Feedback bạn bè đợt 25/10 (layout + 2 lỗi nặng + reset chỉ số)
- Banner tên map chỉ hiện 1 lần 2,5s khi vào map / đăng nhập
  (`showZoneBanner`, class .show + timeout; toast 🗺 cũ ở onMapEnter
  đã bỏ để khỏi trùng). Đồng hồ dời vào cuối thẻ nhân vật trái
  (trong #hudChar). Pill Linh thạch dời vào trong khung minimap,
  sát dưới bản đồ (bấm pill vẫn mở panel ví, stopPropagation nên
  không mở Bản đồ thế giới); hàng nút phải trên lùi xuống 214px
  desktop cho khỏi đè khung minimap (đo thật: wrap bottom 208,
  nút top 214). Ảnh `preview74-banner.png` / `preview74-after.png`
  đã xem bằng mắt: banner hiện rồi tự mất, đồng hồ + pill đúng chỗ.
- Panel cuộn được + chữ nhỏ lại: .panel max-height calc(100vh -
  130px), overflow-y auto; .prow 12px → 11px, .panelHead 14px →
  13px (learnPanel tab GĐ69 giữ max-height riêng).
- Trả nhiệm vụ được ngay tại Bảng: server quest_claim cho nhiệm
  vụ bảng chấp nhận cả BOARD_POINT lẫn ELDER_POINT; panel bảng
  hiện nút "Trả +X LT" khi xong (trước chỉ có chữ bảo đi gặp
  Trưởng Làng nên bạn bè tưởng ấn không được). Gợi ý E ở bảng đổi
  thành "nhận/trả nhiệm vụ"; notice hoàn thành ghi cả 2 chỗ trả.
- Lỗi bắt đăng nhập lại: gốc là phiên tài khoản chỉ giữ trong RAM
  (Map sessions) nên mỗi lần Render deploy/ngủ-dậy là toàn bộ
  người chơi bị auth_expired. Giờ phiên lưu bền như accounts:
  file sessions.json + doc 'sessions' trên cloud (nạp lại khi boot,
  xóa khi logout). "Mất nhân vật" khi đổi tk thường chỉ là nhầm
  lẫn khách/tài khoản: nhân vật khách nằm theo token trình duyệt,
  nhân vật tài khoản nằm theo tên tài khoản — đổi sang tài khoản
  thì không thấy nhân vật khách (không mất, đăng nhập lại đúng
  chỗ là thấy). ZIP PHẢI LOẠI sessions.json (chứa token phiên)
  như characters/accounts/world.
- Reset chỉ số bằng Linh thạch (phí TẠM 100 LT Hạ phẩm): nút
  "↺ Reset chỉ số (100 LT)" trong bảng chỉ số; server ghi sổ
  allocFree/allocStat từ mọi lần cộng điểm (cộng 1 lần + hàng loạt),
  reset hoàn đúng số điểm đã cộng về bể điểm và trừ phí; chặn lỗi
  thiếu LT và chưa có điểm. Giới hạn thật: chỉ hoàn được điểm cộng
  TỪ GĐ74 trở đi (sổ mới ghi từ đây).
- Kiểm chứng: probe socket probe_gd74.cjs 15/15 (phiên sống qua
  restart + logout hủy phiên; trả nhiệm vụ tại bảng +25 LT; cộng
  điểm + reset hoàn đúng + trừ 100 LT + 2 chặn lỗi); probe trình
  duyệt probe_gd74_hud.cjs 8/8 (banner, đồng hồ, pill, nút, panel).
- CHƯA làm: "đàn để mở boss thử thách" — cần user chốt thiết kế
  (đặt ở đâu, tốn gì, gọi trùm nào) trước khi code.

## GĐ75 (25/10) — Nút bao quanh minimap + pill ảnh đá bản cũ
- 6 nút chia 2: cột trái minimap (Túi đồ / Nhiệm vụ / Công pháp,
  ôm sát cạnh trái 4px, cân tâm) + hàng dưới (Nghề / Thành tựu /
  Menu, hở khung 6px). Cảm ứng: 2 lưới 1 cột kề nhau (hở 3px).
  Nút dời DOM nhưng handler gắn theo id nút nên bấm vẫn mở đúng panel.
- Pill Linh thạch: bỏ emoji, dùng ảnh đá bản game đơn cũ
  (assets/items/linh_thach_{ha,trung,thuong,cuc}.png, copy sang
  client/public/items/), chỉ ghi "Linh thạch: N" với N = số của phẩm
  NHIỀU NHẤT (bằng nhau → phẩm cao hơn; mới chơi = Hạ 0).
  Bấm pill vẫn mở panel ví đủ 4 phẩm.
- Lỗi tìm được lúc đo cảm ứng: luật GĐ66 cũ ghim pill
  `position: fixed; top: 134px` kéo pill ra ngoài khung 33px —
  đã ghi đè `position: static` trong block GĐ75.
- Kiểm chứng: probe trình duyệt probe_gd75_hud.cjs 10/10
  (cột/hàng đủ nút + khoảng hở đo thật; pill ảnh Hạ lúc 0, đổi
  sang ảnh Trung khi Trung 150 > Hạ 20; nút dời vẫn mở panel;
  cảm ứng đủ 6 nút).

## GĐ76 (25/10) — Tu vi + hồi phục (người chơi chốt 25/10)
- Bỏ hoàn toàn Đan Tụ Khí: khỏi ITEMS, rương (B/A), công thức
  Đan Sư (→ Đan Hồi Nguyên), tiệm (mua/bán), giỏ thương nhân,
  nhiệm vụ pq_dan (thưởng đổi sang Hồi Xuân Đan). Túi đồ cũ có
  Đan Tụ Khí được migrate lúc boot: cộng dồn sang Hồi Xuân Đan.
  Mua đan cũ ở tiệm bị chặn hẳn (server không sync, không trừ tiền).
- Bỏ Tu vi khi đánh quái (khối grant trong onMonsterKilled đã gỡ).
  Tu vi còn lại từ: nhiệm vụ, hộ tống, tick ngày, Phù Tụ Linh,
  và MỚI: thiền tại nơi linh khí.
- Bỏ hồi chân nguyên tự động cả trong lẫn ngoài giao tranh.
  Trong giao tranh máu + chân nguyên chỉ hồi bằng đan hồi phục.
  MỚI: Đan Hồi Nguyên (hồi 50% Chân nguyên tối đa, Đan Sư chế,
  tiệm Đan 30/12, tiệm Tông 25/10, lưu động 45).
- Ngồi thiền: phím M hoặc nút 🧘 (desktop: phải dưới, trên khay
  chiêu; cảm ứng: trên quạt chiêu, không đè nút ⚔). Điều kiện:
  rời giao tranh 5s (đồng hồ làm mới khi đánh/đánh hụt/bị đánh/
  né/hố lửa); di chuyển, đánh, né, bị đánh, dịch chuyển đều ngắt
  thiền. Khi thiền: hồi máu 1%/s + chân nguyên theo mpRegenOf
  (2 + Thần thức×0,2)/s — số TẠM.
- Linh mạch: sân Đạo Quán/Tụ Linh Trận (700,196) r120 + 2 điểm
  trong làng (600,1000), (1100,1000) + 3 điểm ngẫu nhiên (seeded)
  mỗi map GĐ59. Marker ✦ Linh mạch vẽ trên map. Thiền tại đó
  (cần có linh căn): +1 Tu vi mỗi 30s, trần 15/ngày game — số TẠM.
  Trần/ngày lưu bền (tuViMedDay/tuViMedGain). Thiền ngoài điểm
  linh mạch vẫn hồi máu/mana nhưng không Tu vi.
- Kiểm chứng: probe socket probe_gd76.cjs 16/16 (migrate, tiệm,
  không hồi mana tự động, cổng 5s, thiền hồi máu 446→457 và
  mana 38→42, +1 Tu vi tại linh mạch, ngắt thiền khi di chuyển,
  giết sói Tu vi không đổi); probe trình duyệt probe_gd76_hud.cjs
  9/9 (nút thiền hiện/ẩn theo giao tranh, bấm thiền/đứng dậy,
  nút 💊, cảm ứng không đè ⚔) + ảnh preview76-*.png đã xem bằng mắt.
  Lưu ý: trần Tu vi/ngày chỉ kiểm chứng bằng đọc code (test sống
  cần ~70s và ngày game hiện tại); lần chạy đầu 4 kiểm tra cuối
  fail do nhân vật 60 máu bị sói đánh chết giữa chừng — đã sửa
  probe (nhân vật 1100 máu + dọn sói) và lần chạy lại pass hết.

## GĐ77 — Số giây hồi chiêu + trạng thái Suy nhược (25/10)
- Hồi chiêu theo độ mạnh ĐÃ CÓ SẴN trong dữ liệu (Cơ bản TB 1,6s,
  Luyện Khí TB 5s, Trúc Cơ TB 19s) và server đã chặn tung lại khi
  chưa hồi xong — phần thiếu chỉ là HIỂN THỊ. GĐ77 gắn số giây đếm
  ngược lên nút chiêu: khay desktop (ô chính + ô đa dụng) và nút
  cảm ứng (fan chiêu + ô phụ), tự xóa khi hết hồi.
- Suy nhược (mới): đánh quái tích mệt mỏi 0–100 (+1 mỗi 12s giao
  tranh; −1 mỗi 6s nghỉ, thiền −1 mỗi 3s). Đủ 100 → Suy nhược: gây
  sát thương ×0,75, chịu sát thương ×1,25; hết khi mệt mỏi <50.
  Có notice khi bật/tắt, dòng cảnh báo trên thẻ nhân vật (≥70%
  báo "sắp suy nhược"), mệt mỏi/suy nhược lưu bền (relog không
  xóa). Chỉ áp cho người thật, không áp đồng môn. MỌI SỐ đều TẠM.
- Kiểm chứng: probe socket probe_gd77.cjs 13/13 (cast trả cdMs,
  tung lại bị chặn reason=cooldown, sát thương 11→8 khi suy nhược,
  hồi phục ở quảng trường an toàn, lưu bền); probe trình duyệt
  probe_gd77_hud.cjs 8/8 (số hiện trên khay + nút cảm ứng, tự xóa,
  dòng Suy nhược trên thẻ) + ảnh preview77-cdnum.png (số 1 giữa ô
  chiêu) và preview77-exhausted.png (notice + dòng đỏ trên thẻ)
  đã xem bằng mắt. Mấy lần fail đầu đều do probe đo sai (patch
  thiếu boards, sói dính DoT, đo ở vùng sói bị cắn giữ giao
  tranh) — đã sửa probe, code game không đổi.
- CHƯA push (chờ gộp với GĐ74–GĐ76).
  (GĐ78: suy nhược đã bị GỠ theo yêu cầu người chơi 25/10 — xem GĐ78.)

## GĐ78 — Đói/khát thay Suy nhược (25/10, theo yêu cầu người chơi)
- GỠ HẲN suy nhược GĐ77 (server + dòng thẻ): không còn mệt mỏi,
  không còn debuff sát thương. Số giây hồi chiêu của GĐ77 GIỮ LẠI.
- 2 thanh mới trên thẻ nhân vật: 🍖 Thức ăn + 💧 Nước uống
  (0–100, bắt đầu 100). Hao khi giao tranh (thức ăn 1/60s, nước
  1/45s — nước tụt nhanh hơn) và khi chế tạo thành công (−2/−2).
  KHÔNG tự hồi — chỉ ăn/uống mới lên. Hết 1 trong 2 → thiền
  không hồi máu/chân nguyên (Tu vi vẫn lên). ≤20% báo "đang
  đói/khát", =0 báo kiệt sức (mỗi ngưỡng 1 lần tới khi ăn lại).
- Kim Đan trở lên TỊCH CỐC: 2 thanh ẩn, không hao, ăn/uống vào
  bị từ chối ("không cần ăn uống nữa").
- Đồ ăn/uống (giá TẠM): Cơm Nắm +35 (8 LT), Thịt Nướng +60
  (15 LT), Lương Khô +25 (10 LT); Nước Lọc +40 (5 LT), Trà Thảo
  Mộc +60 (12 LT), Rượu Gạo +30 (10 LT). Bánh Thịt Thú sẵn có
  thêm +30 thức ăn kèm 25% HP. Bán ở TỬU LÂU (cửa Quán Ăn,
  525,841); Thương Nhân Lưu Động bán thêm Lương Khô + Nước Lọc
  (vào kho luân phiên 10 món, 3 món/ngày).
- Kiểm chứng: probe socket probe_gd78.cjs 18/18 (hao khi đánh,
  không tự hồi ở nơi an toàn, mua/ăn/uống ở Tửu Lâu, thiền kiệt
  sức không hồi máu/mana, Kim Đan đóng băng + từ chối ăn, chế
  tạo −2/−2); probe trình duyệt probe_gd78_hud.cjs 4/4 (thanh
  hiện, đánh 10s tụt 100→83, Kim Đan ẩn thanh) + ảnh
  preview78-needs.png đã xem bằng mắt (thức ăn 83, nước 77).
  Lỗi probe gặp: lái thẳng tới Tửu Lâu bị kẹt góc nhà — sửa
  thành đi vòng phía nam; patch file khi server còn chạy bị
  autosave 15s ghi đè — sửa thành patch sau khi kill server.
- CHƯA push (chờ gộp với GĐ74–GĐ77).

## GĐ79 — Nhích nút chiêu cảm ứng + 30 tông môn + 20 thành phố (25/10, theo yêu cầu người chơi)
- Cụm nút chiêu cảm ứng (⚔ + fan 5 nút) nhích sang trái 20px
  (⚔ cách mép phải 14→34px, fan theo cùng). Khay chiêu desktop
  vốn căn giữa nên không đổi. Nút Thiền, Né, ô phụ giữ nguyên.
- 20 THÀNH PHỐ MỚI (MapData 52→72 map, 30 thành phố): 9 Luyện
  Khí + 9 Trúc Cơ + 2 Kim Đan, theme city, vào được từ Thanh
  Vân Thành như thành phố cũ (destinationsFor tự liệt kê, không
  cần code đường đi riêng). Quái vẫn 367 (thành phố an toàn).
- 30 TÔNG MÔN MỚI (SECTS 2→32): 15 nhỏ (vào từ Luyện Khí,
  không cần công trạng), 10 vừa (từ Trúc Cơ, công trạng ≥100),
  5 lớn (từ Kim Đan, công trạng ≥300); chiêu mộ quanh năm (2
  tông cũ giữ cửa sổ mùa vụ); gia nhập tại Sứ Giả như cũ.
  Mỗi tông đặt trụ sở ở đúng 1 thành phố — 30 thành phố vừa đủ
  1 tông/thành (dialog Sứ Giả nhóm theo cỡ + ghi trụ sở).
  Tên tông/thành và mức công trạng do agent đặt — người chơi
  cứ đổi. Hệ quả tự động: đệ tử tông mới cũng được hưởng ưu
  đãi học công pháp tông GĐ54 (−5 điều kiện); Tiệm Tông Môn +
  đổi công trạng mở cho mọi đệ tử tông.
- GIỮ LUẬT GĐ57: Thạch Lâm vẫn CHỈ dành Thiên Kiếm/Huyền
  Thiên — code cổng (dialog, danh sách đi, tổng quan map, qua
  cổng) siết từ "mọi đệ tử tông" thành 2 tông cũ, để tông nhỏ
  (vào từ Luyện Khí) không thành cửa sau vào bí cảnh Trúc Cơ.
  Tông mới CHƯA có công pháp riêng (như 2 tông cũ trước GĐ54
  — công pháp tông thật vẫn PARKED); gia nhập tại Sứ Giả ở
  làng, chưa có sứ giả riêng tại từng thành phố.
- Kiểm chứng: probe socket probe_gd79.cjs 17/17 (đủ 30 tông
  theo cỡ, trụ sở phủ đúng 30 thành, gia nhập cả 3 bậc, từ
  chối sai bậc + đã có tông, tông mới không mở cổng Thạch
  Lâm, du hành tới thành mới theme city); probe trình duyệt
  probe_gd79_hud.cjs 5/5 (đo đúng ⚔ 34px, fan 108/42px) + ảnh
  preview79-touch.png đã xem bằng mắt. Lỗi probe gặp: nhân
  vật spawn ở quảng trường cách Sứ Giả ~117px > 95px nên
  talk/join lặng lẽ fail — sửa thành lái tới gần Sứ Giả trước
  mỗi lần nói chuyện/gia nhập.
- CHƯA push (chờ gộp với GĐ74–GĐ78).

## GĐ80 — Sửa bảng skill cảm ứng + công pháp riêng 30 tông (25/10, theo yêu cầu người chơi)
- SỬA LỖI fan cảm ứng: trước đây fan luôn vẽ đủ 5 nút và ghi
  "Chiêu n" lên ô trống — nhân vật Phàm nhân/Luyện Khí chỉ có
  3 ô nên 2 nút thừa nhìn như skill thật mà bấm không có tác
  dụng. Nay fan tôn trọng SỐ Ô của nhân vật (Phàm/LK 3, LK7+
  4, TC 4, TC7+ 5, KD+ 5 — như slotCountFor server): nút vượt
  số ô thì ẨN hẳn; ô trống trong số ô chỉ hiện số phím + mờ
  (viền đứt). Khay desktop giữ thiết kế GĐ44 (luôn đủ khung,
  ô trống mờ + số phím) nên không đổi.
- 500 CÔNG PHÁP TÔNG RIÊNG (server/data/sect_skills.json,
  sinh bởi shottools/gen_sect_skills.py): tông nhỏ 10 chiêu
  (4 Cơ bản + 4 Luyện Khí + 2 Trúc Cơ), tông vừa 20 (6+8+6),
  tông lớn 30 (8+12+10); tên + id duy nhất toàn cục; mỗi tông
  1 hệ ngũ hành + bộ từ khóa riêng nên tên không lẫn tông
  nhau. Hệ số theo bậc như chiêu thường (1,0/1,6/2,2); hồi
  chiêu Cơ bản ~1–2s, Luyện Khí ~3,5–6,5s, Trúc Cơ ~14–24s;
  chân nguyên 8–15 / 25–45 / 70–100.
- Học tại Sứ Giả (via:'sect'), CHỈ đệ tử đúng tông đó (người
  ngoài tông + đệ tử tông khác đều bị từ chối); Cơ bản trao
  ngay + tự lắp ô trống; Luyện Khí ngồi 720 phút game, Trúc
  Cơ 2880 (như chiêu thường, rút ngắn theo Thần thức); cổng
  cảnh giới: Cơ bản cần đo linh căn, Luyện Khí từ LK trở lên,
  Trúc Cơ từ TC trở lên; chiêu Luyện Khí tông học TẠI SỨ GIẢ
  (miễn luật Đạo Quán của chiêu thường). Chiêu tông không gắn
  vũ khí/lớp, lắp ô chính, sau khi học hiện trong Sổ công pháp
  để lắp/tháo (học thì chỉ ở Sứ Giả). 2 tông cũ giữ ưu đãi
  GĐ54 (chưa có chiêu riêng; bản thiết kế công pháp tông thật
  vẫn PARKED).
- Kiểm chứng: probe socket probe_gd80.cjs 15/15 (đủ số chiêu
  theo cỡ, dialog 10/20/30, học Cơ bản trao ngay + tự lắp,
  tung trúng quái, Sổ có chiêu đã học, từ chối ngoài tông +
  sai tông, Luyện Khí học tại Sứ Giả, Trúc Cơ học ở TC);
  probe trình duyệt probe_gd80_hud.cjs 6/6 (Phàm nhân chỉ
  3 nút 1/2/3 mờ, ô 4/5 ẩn) + ảnh preview80-touch.png đã xem
  bằng mắt. Lỗi probe gặp: nhân vật đã học chiêu đó nên
  learn_skill lặng lẽ bỏ qua trước cổng tông — sửa thành thử
  chiêu cùng tông chưa từng học.
- CHƯA push (chờ gộp với GĐ74–GĐ79).

## GĐ81 — Fan ẩn ô trống + nút Thiền nhỏ lại + hàng 5 nút dưới đều nhau (25/10, theo yêu cầu người chơi)
- Fan cảm ứng: GĐ80 mới làm ô trống mờ ghi số — người chơi vẫn
  thấy thừa nên GĐ81 ẨN HẲN ô trống: fan chỉ hiện chiêu ĐÃ LẮP
  (chưa có chiêu nào thì chỉ còn nút ⚔; lắp 1 chiêu thì chỉ
  hiện đúng nút đó). Khay desktop giữ GĐ44 (luôn đủ khung).
- Nút Thiền cảm ứng: 46×46 → 40×40 (box-sizing border-box
  để đo đúng 40); desktop giữ 52×52.
- Hàng 5 nút dưới (💊 + Đ1–Đ4) trước đây lệch: thuốc chỉ 36px
  trong khi ô đa dụng ~42px, các ô đa dụng dính sát nhau còn
  thuốc hở riêng, lại vướng margin-left: -17px cũ. Nay cả 5
  cùng 42px, cùng đáy 45px, hở đều, cân giữa (đo thật: hở
  8px/8px/8px/8px, lệch tâm 0).
- Kiểm chứng: probe trình duyệt probe_gd81_hud.cjs 6/6 (fan
  trống ẩn hết; lắp 1 chiêu chỉ hiện đúng nút đó có icon;
  Thiền 40×40; hàng dưới đều nhau) + ảnh preview81-touch.png
  đã xem bằng mắt.
- CHƯA push (chờ gộp với GĐ74–GĐ80).

## GĐ82 — Nút Thiền kiểu nút Né + hàng 5 nút bằng cỡ Né (25/10, theo yêu cầu người chơi)
- Nút Thiền cảm ứng: bỏ icon 🧘, vẽ như nút Né — tròn, chữ
  không (nhãn "Thiền"/"Đứng dậy" vẫn do JS đổi trong span;
  chữ 8px để "Đứng dậy" vừa hoặc xuống 2 dòng trong nút
  tròn), cùng cỡ nút Né 36×36. Desktop giữ nguyên (52px,
  icon + nhãn).
- Hàng 5 nút dưới (💊 + Đ1–Đ4): 42px → 36px = đúng cỡ nút Né
  đo thật, hở đều 8px, cân giữa (lệch tâm 0).
- Nút skill KHÔNG mất: GĐ81 chỉ ẩn ô TRỐNG — nhân vật chưa
  có chiêu thì fan trống (đúng ảnh GĐ81), nhân vật đã lắp
  chiêu thì fan hiện đúng nút đó (ảnh GĐ82: Trảm Kiếm lắp ô
  1 hiện icon cạnh ⚔). Người chơi hỏi nên đã chụp ảnh minh
  chứng bằng nhân vật có chiêu.
- Kiểm chứng: probe trình duyệt probe_gd82_hud.cjs 6/6 (Né
  chuẩn 36×36; Thiền chữ không, tròn, bằng cỡ Né; hàng dưới
  bằng cỡ Né, hở đều, cân giữa; nhân vật có chiêu hiện nút
  skill có icon) + ảnh preview82-touch.png đã xem bằng mắt.
- CHƯA push (chờ gộp với GĐ74–GĐ81).

## GĐ83 — Hiện lại nút chiêu cảm ứng (25/10, theo yêu cầu người chơi)
- Hoàn lại kiểu GĐ80 sau khi GĐ81 ẩn hẳn ô trống: fan cảm ứng
  hiện đủ SỐ Ô của nhân vật (Phàm/LK 3, LK7+ 4, TC 4, TC7+ 5,
  KD+ 5), ô trống chỉ hiện số phím + mờ (viền đứt), không ghi
  "Chiêu n" như skill thật. Nút Thiền kiểu Né (GĐ82) và hàng
  5 nút 36px (GĐ82) giữ nguyên.
- Kiểm chứng: probe trình duyệt probe_gd80_hud.cjs 6/6 (Phàm
  nhân hiện 3 nút 1/2/3 mờ, ô 4/5 ẩn) + ảnh preview83-touch.png.
- CHƯA push (chờ gộp với GĐ74–GĐ82).

## GĐ84 — Đan đột phá: mua ở Tiệm Đan + Đan Sư chế từ nguyên liệu (25/10, theo yêu cầu người chơi)
- Gốc vấn đề tìm được khi kiểm tra: server VẪN bán 3 đan đột phá
  ở Tiệm Đan, nhưng bản mirror phía client (SHOP_INFO.tiem_dan)
  thiếu chúng nên UI tiệm không hiện hàng — người chơi không
  mua được; ITEM_INFO client cũng thiếu tên 3 đan (hàng tiệm
  tông môn có nguy cơ hiện "undefined"). Cả 2 mirror đã đồng
  bộ đúng giá server (Trung Cảnh 200/80, Trúc Cơ 800/320,
  Hộ Mạch 300/120 — số TẠM).
- Đường chế tạo MỚI (nghề Đan Sư, công thức generic sẵn có —
  không sửa handler): Trung Cảnh = 10 Nanh Sói + 20 LT, tỉ lệ
  0,7, bậc Nhập môn (cho đột phá LK 3→4 sơ→trung và 6→7
  trung→hậu); Trúc Cơ = 20 Nanh Sói + 2 Đá Quý + 50 LT, tỉ lệ
  0,6, bậc Thợ nghề; Hộ Mạch = 8 Nanh Sói + 2 Cánh Dơi + 15 LT,
  tỉ lệ 0,75, bậc Thợ nghề. Mọi số TẠM. Nghề khác bị chặn chế
  (đúng luật nghề). Thông báo thiếu đan khi đột phá đã sửa
  thành "mua ở Tiệm Đan Dược hoặc luyện chế (nghề Đan Sư)".
- Thử thách (Thử Luyện Thú / Tâm Ma Ảnh ở Đạo Quán) KHÔNG đổi
  — vẫn bắt buộc kèm đan.
- Kiểm chứng: probe socket probe_gd84.cjs 12/12 (chế Trung Cảnh
  → đột phá 3→4 tiêu đan; mua Trung Cảnh ở tiệm −200 LT; bậc 2
  chế Trúc Cơ + Hộ Mạch → đột phá Đại LK9→TC1 bằng đan tự chế;
  nghề khác bị chặn) + probe trình duyệt probe_gd84_hud.cjs
  6/6 + ảnh preview84-shop.png đã xem bằng mắt (tiệm hiện đủ
  3 đan + giá, không "undefined").
- CHƯA push (chờ gộp với GĐ74–GĐ83).

## GĐ85 — Đàn tế triệu hồi trùm map (25/10, phương án B theo yêu cầu "tiếp giai đoạn tiếp theo")
- Đàn tế ở từng map có trùm (20 map: 19 map trùm GĐ70 +
  Vô Tận Hư Không): dấu quầng lửa cam + nhãn "🕯️ Đàn Tế" cách
  cổng dịch chuyển 160px về phía bắc (trong vùng trống decor
  ≥185px và quái >200px, ngoài tầm E lúc mới tới cổng 56px).
  Bấm E mở hộp thoại (không trừ tiền ngay — tránh bấm nhầm);
  nút "Tế 200 LT — triệu hồi" chỉ bật khi đủ điều kiện, kèm
  lý do khi không tế được.
- Luật (số TẠM): 200 LT Hạ phẩm/lần, mỗi map 1 lần/ngày game
  (theo dayIndex của đồng hồ thế giới, lưu bền trong world
  qua saveWorld — restart vẫn nhớ); mỗi lần triệu hồi đủ số
  trùm còn thiếu của map (1 con, map đặc biệt 3 con); từ chối
  khi trùm còn sống / đã tế hôm nay / thiếu đá. Trùm triệu hồi
  dùng đúng đường sinh tự nhiên (rương như trùm thường: map
  trùm chắc chắn rương B + Linh thạch Cực phẩm; Vô Tận Hư
  Không như trùm tự nhiên) và luật hồi sinh tự nhiên đã chống
  trùng nên không nhân đôi trùm.
- Kiểm chứng: probe socket probe_gd85.cjs 14/14 (trùm sống →
  chưa tế được; giết trùm → tế được; tế −200 LT → trùm xuất
  hiện lại; tế lần 2 trong ngày bị chặn; restart vẫn nhớ;
  Vô Tận Hư Không 3 Hỗn Độn Thú) + probe trình duyệt
  probe_gd85_hud.cjs 6/6 + ảnh preview85-altar.png đã xem
  bằng mắt (hộp thoại + nút khóa + quầng lửa).
- CHƯA push (chờ gộp với GĐ74–GĐ84).
