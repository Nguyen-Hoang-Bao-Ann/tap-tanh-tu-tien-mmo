# THIẾT KẾ — HỆ KHÁM PHÁ: ĐIỂM BÍ MẬT + MANH MỐI

*Bảo duyệt TOÀN BỘ theo đề xuất 08/11/2026 20:40 (F1 = A đợt 1 + B đợt 3; F2 = A; F3 = A; F4 = A; F5 = A; cả 2 perk gắn noBoost).*

> **TRẠNG THÁI XÂY:**
> - **GĐ356 (đợt 1) — XONG, probe 32/32.** Sổ đăng ký thống nhất 89 điểm (manh_moi 27 · di_vat 10 · ruong_an 14 · cong_bi_canh 2 · hang 36) vào `soul.secrets` qua soulNorm; đồng bộ phát hiện từ cả 5 hệ con (đúng 1 lần, idempotent); quét bù lúc đăng nhập từ cờ GĐ127 + soul.relics + anState cổng đã vào (rương ẩn/hang không có lịch sử theo điểm nên không bù được — ghi nhận trung thực); mục 🧭 Manh mối trong Thiên Mệnh Ký; minimap hiện dấu điểm đã tìm cho mọi người, dấu vùng mờ lệch tâm đúng 300px cho điểm có manh mối CHỈ khi có perk; perk (a) `kham_pha` mốc 2 đã nối thật + noBoost. Payload kiểm chứng: không perk → 0 hints; tọa độ điểm chưa tìm không xuất hiện trong bất kỳ payload nào. soul.secrets sống sót qua restart + autosave offline 20s (đo trong file).
> - **Phát hiện phụ khi rà:** 6/27 điểm manh mối GĐ127 nằm ở `bai_farm` — mapId của người chơi trực tuyến không bao giờ là `bai_farm` (đó là vùng trong map nhà, mapOf trả về id map nhà) nên 6 điểm này theo đúng code hệ con không thể kích hoạt khi chơi thật. **→ ĐÃ SỬA ở GĐ359 (Bảo duyệt 08/11/2026 21:49)** — xem mục GĐ359 ngay dưới.
> - **GĐ357 (đợt 2) — XONG, probe 25/25.** Nguồn manh mối: 22 đoạn kể bản rõ của 8 NPC kể chuyện gắn tổng 33 manh mối (mỗi NPC 1–4, đúng khung thiết kế tính theo đoạn); hint thiền Đạo Quán mở rộng thành nguồn tổng quát — mỗi ngày game tối đa 1 manh mối, chọn TẤT ĐỊNH điểm chưa tìm đầu tiên hợp cảnh (trần/ngày thay cho tỉ lệ % — ghi TẠM tại §7); 2 hint cổng cũ đồng thời ghi manh mối thật vào sổ; nhặt 1 di vật → cảm ứng manh mối về 1 di vật khác chưa tìm; 5 bia khắc Cổ Ngữ (cây cổ thụ + nghĩa địa ở map nhà, Văn Uyển, Đài Kiếp, thượng nguồn sông) — đọc bia nhận manh mối, bia chỉ khắc từ khóa; perk (b) mốc 3 nhóm Ẩn đã nối thật + noBoost: tạo kiếp mới mở đúng 1 manh mối theo ưu tiên cổng ẩn → di vật (ưu tiên tộc kiếp mới) → điểm nhiệm vụ ẩn hợp cảnh, kèm 1 dòng ghi chú trong Kiếp Ký (client đã sửa: dòng ghi chú không tiêu thụ số kiếp). Văn bản manh mối đợt này viết cho 21/27 điểm nhiệm vụ ẩn TỚI ĐƯỢC (6 điểm bai_farm chưa soạn đợt này — **đã bổ sung đủ ở GĐ359**).
> - **GĐ358 (đợt 3) — XONG, probe 22/22. HỆ KHÁM PHÁ HOÀN TẤT 3 ĐỢT (tổng probe 79/79: 32+25+22).** Thêm **15 điểm bí mật thuần** (loại `thuan`: Giếng cổ Dược Cốc · Mộ cổ dưới băng · Bia đá cháy · Dấu chân khổng lồ · Hốc mộ vô danh · Cột mốc chiến trường · Đáy khe trong · Mộ kiếm gãy · Giếng băng · Bia kiếm · Dấu tích lưng mây · Mộ cổ khóc · Phiến đá hỗn độn · Cột đá thần cổ · Hố sấm sét) rải 15 map từ Luyện Khí tới Hóa Thần (ưu tiên map farm/nguyên tố ít nội dung ẩn), vị trí neo theo cổng map lệch 140–250px, bán kính phát hiện 120px (TẠM), mỗi điểm 1 đoạn lore ghi sổ, KHÔNG quà (F3). **2 chuỗi manh mối 2 nấc**: Dấu chân khổng lồ (Huyết Sắc Rừng) → manh mối → Mộ kiếm gãy (Kiếm Trủng); Bia kiếm (Thiên Kiếm Trì) → manh mối → Mộ cổ khóc (Quỷ Khốc Lâm) — điểm đích vẫn tự tìm được khi chưa có manh mối (probe đã đo). **Tổng sổ đăng ký: 104 điểm** (27+10+14+2+36+15). **Bộ đếm `ach_kp_secrets` = 27 điểm manh mối + 15 điểm thuần = 42 → bậc 40 KHẢ THI** (trước đợt này trần đếm 27 < 40). Lệch nhỏ so với §7 đợt 3: chuỗi làm ở dạng "phát hiện điểm đầu → nhận manh mối nấc 2" thay vì "manh mối → điểm trung gian chứa manh mối" — cùng cấu trúc 2 nấc, nhưng nấc 1 là HÀNH ĐỘNG TỰ TÌM (đúng triết lý khám phá tự do, không khóa), ghi nhận tại đây.
> - **GĐ359 (vá lỗi, Bảo duyệt 08/11/2026) — XONG, probe 40/40 + hồi quy GĐ356 32/32, GĐ358 22/22, GĐ357 23/25 (2 chân trượt là kỳ vọng cứng cũ về THỨ TỰ chọn manh mối: pool nay có thêm 6 manh mối bãi farm tới được nên thiền/perk đầu kiếp chọn tất định `clue_mm_q127_hid_002` — điểm map nhà đầu sổ — thay cho hid_008/q199_xe1 như kỳ vọng cũ; cơ chế chọn không đổi, đã đo lại ở probe GĐ359 chân 9).** Nguyên nhân lỗi: `bai_farm`/`thach_lam` là VÙNG trong map nhà (không có MAP_RUNTIME riêng — xem `hitsObstacleIn`), người chơi đứng ở đó vẫn mang mapId `lang_tan_thu`, trong khi tick phát hiện điểm manh mối GĐ127 so `mapOf(p) === cluePoint.mapId` (`'bai_farm'`) → không bao giờ khớp. **Cách sửa (tối thiểu, chỉ lớp map):** helper `homeRegionMapId()` chuẩn hóa mapId vùng (`bai_farm`/`thach_lam` → HOME_MAP) tại đúng 3 chỗ — (1) tick phát hiện điểm manh mối, (2) tick hoàn thành explore (đích `targetPoint` ghi `bai_farm` cùng gốc lỗi: 6 đích "Bãi Farm Quanh Làng" gồm cả đích của chính q127_hid_006 + explore_002/058/064/095 + chain_05_2, trước đây cũng không hoàn thành được), (3) sổ đăng ký `secretRegistry` (mapId điểm → map nhà để dấu minimap + tên map trong sổ hiển thị đúng "Làng Tân Thủ"). KHÔNG đổi mapId người chơi, bán kính (150), cờ, quà của hệ GĐ127; tọa độ điểm giữ nguyên (vốn là tọa độ map nhà). **Bổ sung văn bản manh mối cho cả 6 điểm** (gợi hình ảnh + địa danh, không tọa độ/spoil) và nối nguồn theo vị trí: hid_002 Cổ Tịch → đoạn Cụ Ký `ck_chao`; hid_004 Kho Báu → Thương Nhân `tn_chao`; hid_006 Trận Đồ → Quản Sự `qs_chao`; hid_012 Cây Khô → Cụ Ký `ck_h5_chuky`; hid_014 Bến Đò → Lão Ngư `lng_den`; hid_016 Lò Rèn Cũ → Trưởng Làng `tl_luanhoi`; cả 6 đồng thời tự chảy vào nguồn thiền (chọn tất định) + rẽ perk đầu kiếp như mọi manh mối khác. Probe đo đủ: từng điểm trong 6 điểm bằng nhân vật riêng bay tới đúng tọa độ (phát hiện + cờ + sổ + bộ đếm +1, không lẫn điểm kề), đối chứng âm đứng giữa vùng bãi farm ngoài bán kính → không phát hiện oan, hid_006 trọn đường (điểm manh mối → đích explore → quest done).
*Mẫu trình bày: tách bạch HIỆN TRẠNG KIỂM CHỨNG (đọc từ code thật) ↔ ĐỀ XUẤT của agent; fork đánh số ở §6; mọi con số tài liệu/game chưa chốt đều ghi TẠM.*

> Nguyên tắc xuyên suốt (luật Bảo đã chốt): khám phá bằng **quan sát và tự đặt chân tới**, hint **gợi hình ảnh/địa danh — không tọa độ, không spoil quà**; phần thưởng khám phá là **hiểu biết, manh mối tiếp, danh hiệu/vật kỷ niệm** — **TUYỆT ĐỐI không Tu Vi** (Tu Vi chỉ từ thiền); không sinh thêm kênh farm.

---

## §1. HIỆN TRẠNG NỘI DUNG ẨN (kiểm chứng trong code, 08/11/2026)

Game đã có rất nhiều nội dung ẩn, nhưng mỗi hệ là một ốc đảo riêng — cơ chế phát hiện, nơi lưu trạng thái và cách người chơi biết tới đều khác nhau:

| Hệ | Cơ chế phát hiện hiện tại | Lưu trạng thái ở đâu | Người chơi biết tới bằng cách nào |
|---|---|---|---|
| **Điểm manh mối nhiệm vụ ẩn** (GĐ127/198) — 27 điểm | Điểm cố định trên map (`QUESTS` có `hidden + cluePoint {mapId,x,y,r=150} + requiresFlag`); đi vào bán kính 150px là tự “phát hiện”, hiện notice *“🔍 Bạn phát hiện manh mối: … — tới gặp {NPC} xem nhiệm vụ ẩn!”* | `flags[requiresFlag]` của **nhân vật** (không theo hồn) | **Không có kênh báo trước nào cả** — điểm vô hình tuyệt đối tới khi tình cờ bước vào. Thuần may rủi |
| **10 vật phẩm ẩn / di vật** (GĐ317) | Cảm ứng theo khoảng cách ngay trong tầm: ≤1500px hiện notice khí tức theo 3 mức xa/gần/rất gần (chặn spam 8s); ≤95px hiện hình và nhặt | `soul.relics` — theo **hồn**, vĩnh viễn qua kiếp | Cảm ứng tự phát khi lọt vào vùng 1500px + truyền thuyết kể trong cốt truyện |
| **Rương ẩn** (GĐ309) | Điểm giấu suy từ dữ liệu hang (mỗi hang 1 điểm) + 2 điểm đặc biệt (bãi trùm/nơi tu luyện map nhà); người chơi tới trong **260px** thì rương (hạng B) mới nảy ra, client chỉ vẽ khi tới gần; mở được 20% thêm Ngọc Giản Trống (GĐ334) | Mốc hồi rương ở **world** (`hiddenChestState`, hồi sau 4 giờ thật — TẠM); bộ đếm mở ở `counters.ach_hiddenChests` | Không có hint nào — tới gần mới biết |
| **2 cổng bí cảnh ẩn** (GĐ344/345) | Cổng cố định (bia đá sau cây cổ thụ (1140,2010); nghĩa địa cổ (700,430) map nhà) nhưng chỉ người đạt Viên Mãn / Luyện Hồn mới tương tác được, người thường chạm vào “im lìm” | Điều kiện ở `anState` của nhân vật; khóa lượt theo ngày game trong `anState` | **Hint thiền ở Đạo Quán**: thiền sâu khi đã đủ điều kiện thì hiện 1 lần hình ảnh gợi (bia đá/cây cổ thụ; sương nghĩa địa) — cờ `flags.anHintDoiAnh / anHintUHon`, không tọa độ |
| **Hang chui** (GĐ236) | Miệng hang thật trên map (tối đa 3 miệng/map thật), E vào/ra nội thất hang tự sinh | Cấu trúc map (không có trạng thái “đã khám phá hang này” theo người chơi) | Nhìn thấy miệng hang khi đi qua; minimap có phân biệt độ hiếm miệng hang |
| **Mảnh hồn khiếm khuyết** (GĐ315) | 7 mảnh sinh theo người chơi (không phải điểm cố định), cảm ứng notice theo ngưỡng khoảng cách 1200/600/250px | Theo tiến trình quest hồn của nhân vật | Notice cảm ứng khi vào vùng |
| **Vật lễ ẩn mùa lễ** (GĐ222) | Vật ẩn quanh làng theo mùa, nhặt khi tới nơi; thành tựu đếm `festHunt` | `counters` nhân vật | Thông báo mùa lễ |
| **Truyện kể / Thiên Mệnh Ký** (GĐ352–355) | Đoạn kể khóa theo cảnh/trải nghiệm/phe/tộc, có bản **mơ hồ → rõ** sau khi tự trải qua; NPC kể chuyện là kênh tiết lộ lore chính | `soul.storySegs / storyFull / storyRace` — theo **hồn** | Tự tới NPC nghe kể; Thiên Mệnh Ký có tab 🌌 Thiên Mệnh + “Chuyện Nghe Được” |

### Khoảng trống thật (lý do cần hệ này)

1. **Không có khái niệm “điểm bí mật” thống nhất.** Chữ “điểm bí mật” hiện chỉ tồn tại trong thành tựu `ach_kp_secrets` (nhóm Khám phá, GĐ306 bật): nó đếm **chỉ** 27 điểm manh mối GĐ127 qua cờ trong `flags`. Di vật, rương ẩn, cổng bí cảnh không thuộc khái niệm này dù cùng bản chất “điểm cố định phải tự tới mới biết”.
2. **Bậc thành tựu không với tới được:** `ach_kp_secrets` có bậc [1, 5, 15, **40**] nhưng toàn game chỉ có **27** điểm được đếm → bậc 4 (40) **không thể đạt** bằng bất kỳ cách chơi nào hiện nay.
3. **Không có sổ manh mối.** Mọi “manh mối” hiện nay chỉ là notice thoáng qua (cảm ứng di vật, hint thiền 1 lần, notice phát hiện điểm GĐ127). Người chơi không có nơi nào xem lại mình đang lần theo cái gì, đã biết những gì. Thiên Mệnh Ký ghi *truyện*, không ghi *manh mối*.
4. **Điểm GĐ127 là may rủi thuần túy:** 27 điểm, bán kính 150px, không một kênh hint nào chỉ về chúng trước khi phát hiện — trái với triết lý “ẩn nhưng có hint để quan sát mà tìm”.
5. **Thừa hưởng qua kiếp không nhất quán:** di vật và truyện đi theo hồn; cờ điểm GĐ127 và hiểu biết về rương/cổng chỉ theo nhân vật — kiếp mới “quên” sạch những nơi mình từng tìm ra, dù hồn là một.
6. **Minimap chưa có lớp khám phá:** minimap hiện tại có dấu trụ sở tông (GĐ324), thông tin map quanh; không có bất kỳ dấu nào cho nơi đã khám phá.
7. **2 perk thành tựu đang parked chờ đúng hệ này** (xem §4) — panel ghi rõ “chưa có cơ chế”.

---

## §2. ĐIỂM BÍ MẬT (đề xuất)

### 2.1. Định nghĩa

**Điểm bí mật** là một **vị trí cố định trên map** thỏa cả 4 tiêu chí:

1. Không hiện trên bản đồ/minimap mặc định và không có dấu chỉ đường sẵn;
2. Game chỉ ghi nhận khi người chơi **tự đặt chân tới** (vào bán kính của điểm) hoặc **tự tương tác** được với nó;
3. Có một sự kiện phát hiện xác định (notice/cờ/bộ đếm) — hoặc được cấp sự kiện đó khi đăng ký vào hệ;
4. Thuộc một **loại (category)** trong sổ đăng ký thống nhất.

Hệ khám phá **không thay** cơ chế phát hiện riêng của từng hệ con (di vật vẫn cảm ứng, rương vẫn nảy khi tới gần, cổng vẫn khóa theo cảnh giới ẩn) — nó là **lớp đăng ký + ghi nhớ + hiển thị thống nhất** phủ lên trên: mỗi khi một hệ con báo “đã phát hiện điểm X”, lớp khám phá ghi vào sổ của hồn.

### 2.2. Sổ đăng ký đợt đầu (chỉ đăng ký cái đã có — xem fork F1)

| Loại | Điểm | Nguồn sự kiện phát hiện (sẵn có) |
|---|---|---|
| `manh_moi` — điểm manh mối nhiệm vụ ẩn | 27 | Cờ `flags[requiresFlag]` GĐ127 |
| `di_vat` — điểm giấu di vật 10 thần đầu | 10 | `soul.relics[race]` GĐ317 |
| `ruong_an` — điểm giấu rương ẩn | Mỗi hang 1 + 2 điểm đặc biệt (số điểm suy từ dữ liệu lúc boot, như code GĐ309 hiện tại) | Sự kiện mở rương tại `hiddenSpotId` |
| `cong_bi_canh` — cổng bí cảnh ẩn | 2 (Đối Ảnh, U Hồn) | Lần đầu vào cổng thành công (GĐ344/345) |
| `hang` — miệng hang chui | Theo dữ liệu map (tối đa 3 miệng thật/map) | Lần đầu vào nội thất của hang đó |

*Không đăng ký:* mảnh hồn GĐ315 (vị trí sinh theo người chơi, không cố định), vật lễ mùa (theo mùa, đã có bộ đếm riêng `festHunt`), điểm lãnh địa/trụ sở tông (đã hiện minimap công khai theo luật riêng).

### 2.3. Cách phát hiện — phân biệt rõ với cảm ứng di vật để không giẫm nhau

- **Di vật giữ nguyên cảm ứng khoảng cách** (1500/95px): đó là “vật có linh tính tự tỏa khí tức” — đặc quyền riêng của hệ di vật, hệ khám phá không nhân bản cơ chế này sang điểm thường.
- **Điểm bí mật thường: phát hiện bằng TỚI NƠI**, giữ nguyên bán kính của hệ con (150px điểm manh mối, 260px điểm rương, tương tác cổng…). Lớp khám phá không thêm vòng cảm ứng mới; thay vào đó **manh mối (§3) thu hẹp vùng tìm** bằng địa danh + hình ảnh, để “tới nơi” là việc của quan sát chứ không phải dò từng ô đất.
- **Ngoại lệ duy nhất:** perk bản đồ (§4.1) cho người đạt mốc một “linh cảm mờ” trên minimap trong phạm vi gần — đó là thưởng thành tựu, không phải cơ chế mặc định.

### 2.4. Trạng thái & nơi xem lại

- Trạng thái phát hiện ghi theo **hồn**: `soul.secrets = { pointId: <số kiếp đã phát hiện> }` (qua `soulNorm` như `storySegs/carryMax` — bền qua persist, diễn viên offline, chuyển kiếp). Điểm thuộc hệ con vốn theo nhân vật (cờ GĐ127) vẫn giữ cờ gốc cho nhiệm vụ; lớp khám phá **đồng bộ một chiều** vào sổ hồn khi sự kiện phát hiện xảy ra (và quét bù lúc đăng nhập cho dữ liệu cũ — người đã tìm điểm từ trước không bị mất ghi nhận).
- **Xem lại:** trong sổ manh mối (§3.4) có mục “Đã tìm ra” liệt kê theo loại: tên điểm (chỉ hiện **sau** khi đã phát hiện — trước đó không liệt kê, không spoil), map/địa danh, kiếp nào tìm ra. Kèm tổng số theo loại (vd Di vật 7/10 — vốn đã có ở panel luân hồi, nay thống nhất về một chỗ).

### 2.5. Điểm bí mật cho gì

- **Bản thân việc phát hiện chỉ cho: ghi sổ + bộ đếm + manh mối tiếp (nếu điểm nằm trong chuỗi).** Phần thưởng vật chất giữ nguyên ở hệ con chủ quản (rương cho đồ của rương, di vật mở Hoán Vu, điểm manh mối mở nhiệm vụ ẩn, cổng mở bí cảnh) — hệ khám phá **không sinh thêm kênh rơi đồ/farm mới**.
- Mốc hoàn thành theo loại (vd đủ 10 di vật — đã có quà hệ con; đủ mọi điểm của một map) cho **danh hiệu kỷ niệm** (TẠM, theo mẫu “Người Nghe Chuyện Xưa”) — không Tu Vi, không linh thạch.

---

## §3. MANH MỐI (đề xuất)

### 3.1. Định nghĩa

**Manh mối** là một **đơn vị thông tin** người chơi nhận được về **một điểm bí mật cụ thể chưa phát hiện**, gồm:

- **Văn bản gợi**: hình ảnh + địa danh + (khi hợp) vài chữ Cổ Ngữ — vd *“Sau cây cổ thụ già nhất làng có tấm bia đá; mặt bia khắc hai chữ LÔI KIẾP bằng chữ cổ, rêu phủ gần hết.”*;
- **Tuyệt đối không**: tọa độ, tên phần thưởng, số liệu cơ chế, mũi tên chỉ đường;
- Trạng thái: `chua_co` → `da_nhan` (nằm trong sổ, còn mờ) → `da_lan_toi` (đã phát hiện điểm đích — manh mối khép lại nhưng **vẫn đọc lại được** trong sổ như kỷ niệm).

Đợt đầu: **1 manh mối ↔ 1 điểm bí mật**. Chuỗi nhiều nấc (manh mối A dẫn tới điểm chứa manh mối B) để dành đợt sau (xem §7 đợt 3) — không làm phức tạp ngay.

### 3.2. Nguồn manh mối

| Nguồn | Cách cho | Ghi chú bám hạ tầng thật |
|---|---|---|
| **NPC kể chuyện** (GĐ352–355) | Một số đoạn kể (ưu tiên bản **rõ**) kèm theo 1 manh mối: Cụ Ký → điểm cổ quanh làng/cổ thụ; Âm Bà → nghĩa địa/U Hồn/bãi tha ma; Kiếp Đài Thủ → Đài Kiếp/điểm cõi cao; Thương Nhân → điểm xa ở map khác | Đoạn kể đã có sẵn cơ chế mơ hồ→rõ; manh mối là “phần thực dụng” của bản rõ — nghe kể không chỉ biết truyện mà còn biết *nơi để đi* |
| **Hint thiền** | Mở rộng mẫu hint thiền GĐ344 (hiện cứng cho 2 cổng, cờ 1 lần): thiền sâu có thể gợi 1 manh mối **chưa có** về điểm hợp cảnh của nhân vật | Giữ nguyên tắc: thiền là kênh gợi ý tĩnh lặng, không spam (giữ nhịp chặn như hiện tại) |
| **Bia khắc Cổ Ngữ tại điểm cổ** | Tại vài điểm cổ (điểm di vật, cổng cõi, Văn Uyển…), tương tác E đọc bia → nhận manh mối về một điểm *khác* liên quan | Vật mang manh mối dùng hệ chữ Cổ Ngữ đã chốt (§5) |
| **Perk đầu kiếp** (§4.2) | Đầu mỗi kiếp, hồn “nhớ sẵn” 1 manh mối | Chính là perk nhóm Ẩn mốc 3 đang parked |
| **Hoàn thành một phần hệ con** | Vd tìm được 1 di vật → hồn “văng vẳng” manh mối về 1 di vật khác chưa tìm (gợi vùng, không gợi điểm) | Bám sự kiện sẵn có, không thêm nhiệm vụ |

### 3.3. Manh mối dẫn tới điểm thế nào

Manh mối không tự mở gì cả — nó chỉ **thu hẹp vùng tìm** (map nào, gần địa danh nào, tìm hình thù gì). Người chơi vẫn phải tự đi, tự quan sát, tự đặt chân tới bán kính phát hiện. Khi điểm đích được phát hiện (bất kể có manh mối hay tình cờ tìm trước), manh mối tương ứng tự khép `da_lan_toi`. Tìm điểm *trước khi* có manh mối là chuyện bình thường và được ghi nhận như nhau (đúng chất khám phá tự do).

### 3.4. Lưu trữ & thừa hưởng qua kiếp; giao diện

- Lưu theo **hồn**: `soul.clues = { clueId: { st: 1|2, life: <kiếp nhận> } }` qua `soulNorm`. Manh mối **không hết hạn** — nó là tri thức của hồn như truyện kể; qua kiếp vẫn giữ nguyên văn bản (hồn nhớ rõ), chỉ có *việc đi lại* là của kiếp mới. (Lý do: nhất quán với di vật/truyện đều theo hồn; bắt “nhớ mờ” rồi học lại sẽ biến khám phá thành cày lại — trái triết lý chơi chậm nhiều kiếp để *sưu tầm thêm*, không phải làm lại.)
- **Giao diện:** thêm mục **“🧭 Manh mối”** trong 📖 Thiên Mệnh Ký (đề xuất — fork F4), hai phần: *Đang lần theo* (manh mối `da_nhan`, hiện văn bản gợi + nguồn cho) và *Đã tìm ra* (điểm đã phát hiện theo loại, §2.4). Manh mối nhận ở đầu kiếp theo perk §4.2 được ghi thêm một dòng vào **Kiếp Ký** của kiếp đó (“Hồn mang theo một manh mối từ trước khi mở mắt…”).

---

## §4. NỐI 2 PERK ĐANG PARKED

### 4.1. Perk (a) — “Bản đồ hiện điểm bí mật trong phạm vi gần”

- **Vị trí thật trong code:** `GROUP_PERKS.kham_pha[1]` — perk **mốc 2 nhóm Khám phá** (mốc nhóm Khám phá = [15, **35**, 65] Đạo Tích nhóm). Văn bản hiện tại: *“Bản đồ hiện điểm bí mật trong phạm vi gần”*, `parked: true, why: 'MMO chưa có hệ điểm bí mật'`.
- **Cơ chế khi nối (đề xuất):** người đạt mốc, khi mở minimap/bản đồ chi tiết của map, được thấy thêm một lớp dấu **chỉ trong phạm vi gần của map đang đứng** (TẠM: đúng phạm vi hiển thị của bản đồ chi tiết hiện có):
  - Điểm **đã phát hiện**: dấu ✦ rõ (vốn được thấy nhờ §4/F2 mức cơ bản — perk không cần cho việc này);
  - Điểm **chưa phát hiện nhưng ĐÃ CÓ MANH MỐI**: dấu ◌ **mờ, chỉ ở mức vùng** (làm tròn về ô lưới thô/map con — TẠM: lệch tâm trong bán kính ~300px, không chấm tọa độ thật) — perk biến manh mối chữ thành “linh cảm phương hướng”, vẫn phải tới nơi quan sát mới tìm ra điểm thật;
  - Điểm **chưa phát hiện và chưa có manh mối**: **không hiện gì** — perk không phá chất khám phá, không biến thành radar soi toàn map.
- **Chống spoil phía server:** server chỉ gửi cho client những dấu người chơi đủ quyền thấy (đã phát hiện / có manh mối + có perk); tọa độ điểm chưa phát hiện **không bao giờ** rời server ở dạng chính xác.
- Nối xong: `parked: false`, bỏ `why`, cơ chế qua `achMilestoneOf(p,'kham_pha') >= 2` đúng mẫu GĐ347/348; cân nhắc `noBoost` như các perk có trần cứng (đề xuất: **gắn noBoost** — “hiện điểm” là quyền dạng có/không, nhân đôi vô nghĩa).

### 4.2. Perk (b) — “Mỗi kiếp mở sẵn 1 manh mối bí cảnh ẩn”

- **Vị trí thật trong code:** `GROUP_PERKS.an[2]` — perk **mốc 3 nhóm Ẩn** (mốc nhóm Ẩn = [5, 10, **15**]). Văn bản hiện tại: *“Mỗi kiếp mở sẵn 1 manh mối bí cảnh ẩn”*, `parked: true, why: 'MMO chưa có hệ manh mối'`.
- **Cơ chế khi nối (đề xuất):** tại thời điểm tạo nhân vật của kiếp mới (sau bước thừa hưởng hồn, cùng điểm các perk theo kiếp GĐ341/348/351 áp dụng), nếu hồn **chưa từng** phát hiện hết các điểm đích, server chọn **1 điểm bí mật chưa phát hiện** và trao sẵn manh mối của nó vào sổ (`da_nhan`), kèm notice + dòng Kiếp Ký. Tiêu chí chọn điểm (theo thứ tự):
  1. **Cổng bí cảnh ẩn** chưa phát hiện (đúng chữ “bí cảnh ẩn” của perk) — ưu tiên cổng mà kiếp mới có khả năng chạm tới theo lộ trình cảnh (U Hồn trước Đối Ảnh theo thứ tự mở ẩn, TẠM theo thứ tự thiết kế GĐ344/345);
  2. Hết cổng thì tới **di vật** chưa tìm (ưu tiên tộc của kiếp mới chưa có di vật);
  3. Rồi tới điểm `manh_moi` / `ruong_an` chưa phát hiện ở map hợp cảnh hiện tại của nhân vật mới.
  Không trao trùng manh mối đang `da_nhan` chưa khép; một kiếp tối đa 1 manh mối từ perk này (đúng văn bản “1 manh mối”).
- Nối xong: `parked: false`, bỏ `why`; perk dạng sự kiện theo kiếp — đề xuất **gắn noBoost** (nhân đôi thành 2 manh mối/kiếp sẽ sai văn bản perk, cùng tiền lệ mốc Ẩn 1/2 ở GĐ341/347).
- Sau khi nối cả 2 perk: hệ thành tựu **không còn perk nào parked vì thiếu hệ khám phá**; đồng thời bộ đếm `ach_kp_secrets` được đồng bộ (§5) — và nếu Bảo chọn fork F1 phương án thêm điểm mới, bậc 40 của nó trở nên với tới được.

---

## §5. ĐIỂM CHẠM HỆ KHÁC

- **NPC kể chuyện (GĐ352–355):** đoạn kể là nguồn manh mối chính (§3.2). Triển khai bám đúng mẫu sẵn có: bảng đoạn kể phía server kiểm điều kiện, trạng thái theo hồn (`storySegs`) — manh mối gắn vào đoạn ở **bản rõ** để giữ nhịp “nghe mơ hồ trước, tự trải qua rồi mới rõ đường đi”. Không thêm kênh socket mới (dùng payload `talk_npc` + payload Thiên Mệnh Ký như đợt B/C).
- **Cổ Ngữ:** bia khắc là vật mang manh mối (§3.2) — glyph dùng đúng hệ chữ Khoa Đẩu × Nôm đã chốt (34 chữ gốc + ghép, renderer `congu_render3.py` sẵn có); bia chỉ khắc **từ khóa** (tên địa danh/chủ thể), phần giải nghĩa nằm trong văn bản manh mối — người chơi không cần “dịch” mới chơi được, nhưng ai để ý chữ cổ sẽ nhận ra mẫu lặp giữa các bia.
- **Thiên Mệnh Ký:** sổ manh mối sống cùng nhà với truyện (§3.4) — truyện cho *vì sao*, manh mối cho *đi đâu*; hai mục cạnh nhau trong cùng panel.
- **Thành tựu đếm điểm ẩn (GĐ306):** `ach_kp_secrets` giữ nguyên cách đếm đợt đầu (cờ GĐ127) để không hồi tố tiến độ người chơi; khi có điểm thuần mới (fork F1), các điểm đó **tham gia cùng bộ đếm** qua cờ phát hiện của chúng — đây là đường duy nhất để bậc 40 thành khả thi, và phải ghi rõ trong tài liệu khi xây.
- **Tông môn:** đợt đầu **không** làm manh mối/điểm bí mật riêng cho tông (lãnh địa + trụ sở đã có luật hiển thị minimap riêng, GĐ324). Chỉ đăng ký tham khảo: điểm ẩn trong bí cảnh Thạch Lâm của tông môn NPC giữ nguyên hệ của nó. Manh mối chung cho cả tông là ý tưởng để sau, không đưa vào phạm vi này.
- **Lễ hội:** vật lễ ẩn theo mùa không vào sổ đăng ký thường trực (§2.2); nếu mùa lễ có điểm cổ liên quan truyện, NPC mùa (Lão Ngư, Tuyết Ông…) có thể cho manh mối thường trực như NPC thường — tùy đợt, không bắt buộc.
- **Luân hồi / hồn:** mọi trạng thái của hệ (sổ điểm, sổ manh mối) đi theo hồn qua `soulNorm` — cùng mẫu `storySegs` (GĐ352) và `carryMax` (GĐ351): field mới phải có mặt ở mọi điểm chuẩn hóa hồn, dữ liệu hồn cũ thiếu field thì mặc định rỗng, không lỗi.

---

## §6. FORKS CẦN BẢO CHỐT

- **F1 — Phạm vi điểm bí mật đợt đầu:**
  - A: **Chỉ đăng ký thống nhất các điểm ẩn đã có** (27 manh mối + 10 di vật + rương ẩn + 2 cổng + hang) — không thêm điểm mới.
  - B: Đăng ký như A **+ thêm điểm bí mật thuần mới** (đề xuất TẠM 12–18 điểm: bia khắc cổ, mộ cổ vô danh, giếng cổ, tảng đá khắc chữ… rải ở map sẵn có; mỗi điểm cho 1 manh mối tiếp hoặc 1 đoạn lore ngắn khi phát hiện).
  - C: Thêm nhiều hẳn (30+ điểm) để thành trục nội dung khám phá riêng.
  - → **Đề xuất: A cho đợt 1, B cho đợt 2.** Lý do: giá trị lớn nhất hiện nay là *thống nhất + sổ manh mối + nối 2 perk* trên nội dung đã tồn tại; điểm mới thêm sau khi khung chạy sẽ được đo lường tử tế (và vừa đủ lấp bậc 40 của `ach_kp_secrets` nếu cộng dồn 27 + ~15 ≈ 42). C ngay từ đầu dễ loãng chất lượng từng điểm.
- **F2 — Minimap mặc định (chưa tính perk) hiện tới đâu:**
  - A: Chỉ hiện điểm **đã phát hiện** (dấu ghi nhớ vị trí).
  - B: Hiện cả điểm đã có manh mối ở mức vùng mờ **cho mọi người**.
  - C: Không hiện gì trên minimap; sổ chỉ ở trong Thiên Mệnh Ký.
  - → **Đề xuất: A.** Lý do: B cho không cái perk mốc Khám phá đáng lẽ phải là thưởng riêng; C làm sổ manh mối thiếu “bản đồ trí nhớ” — thứ người chơi khám phá nào cũng cần để quay lại. Perk §4.1 giữ vai trò nâng từ A lên “thấy vùng mờ của điểm có manh mối trong phạm vi gần”.
- **F3 — Manh mối chỉ sang nội dung sẵn có hay mở quà mới riêng:**
  - A: Đợt đầu manh mối **chỉ dẫn tới nội dung sẵn có**; “quà” của hệ chỉ là danh hiệu kỷ niệm theo loại/hoàn thành.
  - B: Kèm 1–2 vật kỷ niệm riêng của hệ (vd “La Bàn Cũ” không sức mạnh) ở mốc hoàn thành lớn.
  - → **Đề xuất: A** (B để dành khi thêm điểm thuần ở F1-B, gắn vào hoàn thành đợt điểm mới). Lý do: giữ luật không sinh kênh farm/không quà sức mạnh; hệ này bán *trải nghiệm lần mò*, không bán phần thưởng.
- **F4 — Sổ manh mối đặt ở đâu:**
  - A: Mục **“🧭 Manh mối” trong Thiên Mệnh Ký** (cạnh tab Thiên Mệnh).
  - B: Panel riêng mở bằng phím/nút riêng.
  - → **Đề xuất: A.** Lý do: Thiên Mệnh Ký đã là “sổ của hồn” (truyện + kiếp ký); thêm panel riêng làm loãng thói quen mở sổ, và đợt B/C vừa xây xong khung panel này.
- **F5 — Thừa hưởng qua kiếp:**
  - A: Sổ điểm + sổ manh mối **theo hồn toàn bộ** (như di vật/truyện): kiếp sau vẫn nhớ điểm đã tìm và manh mối đã nhận; việc *đi lại/tương tác lại* theo hệ con vẫn là của kiếp mới.
  - B: Nhớ manh mối nhưng điểm phải “phát hiện lại” mỗi kiếp mới tính.
  - → **Đề xuất: A.** Lý do: nhất quán với 2 tiền lệ theo hồn gần nhất (di vật GĐ317, truyện GĐ352); B biến khám phá thành việc làm lại mỗi kiếp — ngược triết lý “nhiều kiếp để sưu tầm thêm”. A cũng làm perk §4.2 có nghĩa (đầu kiếp *nhắc* một điều chưa làm, không phải thưởng làm lại).

---

## §7. PHẠM VI XÂY THEO ĐỢT + PROBE + SỐ TẠM

### Đợt 1 (đề xuất GĐ356) — Khung thống nhất + sổ + perk bản đồ
- Sổ đăng ký điểm bí mật (bảng điểm suy từ các hệ con như cách `HIDDEN_CHEST_SPOTS`/`relicSpots` suy từ dữ liệu) + đồng bộ sự kiện phát hiện của 5 loại vào `soul.secrets` (kèm quét bù lúc đăng nhập cho dữ liệu cũ).
- Mục 🧭 Manh mối trong Thiên Mệnh Ký: phần “Đã tìm ra” + khung “Đang lần theo” (chưa có nguồn manh mối thì hiện gợi ý đi nghe kể chuyện/thiền).
- Nối perk (a) §4.1: lớp dấu minimap theo quyền (server lọc), `parked: false` + `noBoost`.
- **Probe:** số điểm đăng ký khớp nguồn từng loại (27/10/2/hang theo dữ liệu); phát hiện từng loại ghi sổ đúng 1 lần, không ghi trùng khi lặp sự kiện; hồn cũ (thiếu field) nạp bình thường và được quét bù đúng số điểm đã có; payload minimap: không perk → chỉ dấu đã phát hiện; có perk → thêm dấu vùng mờ cho điểm có manh mối (ép fixture có manh mối), **không** lộ tọa độ điểm chưa phát hiện/chưa manh mối (kiểm payload thô); perk chưa đạt mốc → không dấu mờ.

### Đợt 2 (đề xuất GĐ357) — Nguồn manh mối + perk đầu kiếp
- Manh mối cho các điểm đợt 1: gán manh mối vào đoạn kể bản rõ của NPC kể chuyện (mỗi NPC 2–4 manh mối theo vùng của họ), mở rộng hint thiền (gợi 1 manh mối chưa có, giữ nhịp chặn), 3–5 bia khắc Cổ Ngữ tại điểm cổ cho manh mối chéo.
- Nối perk (b) §4.2: trao manh mối đầu kiếp theo tiêu chí chọn, ghi Kiếp Ký, `parked: false` + `noBoost`.
- **Probe:** nghe đoạn bản rõ nhận manh mối đúng 1 lần (nghe lại không trùng); manh mối tự khép khi phát hiện điểm đích (kể cả phát hiện trước khi có manh mối); tạo kiếp mới với hồn đạt mốc Ẩn 3 → đúng 1 manh mối theo thứ tự ưu tiên (cổng → di vật → điểm thường), hồn chưa mốc → không có; hồn đã phát hiện hết → không trao, không lỗi; hint thiền không gợi manh mối đã có/đã khép.

### Đợt 3 (đề xuất GĐ358, chỉ khi F1 chọn B) — Điểm bí mật thuần + chuỗi 2 nấc
- Thêm TẠM 12–18 điểm thuần (bia khắc/mộ cổ/giếng cổ…) có sự kiện phát hiện riêng (bán kính TẠM 120px), mỗi điểm cho 1 đoạn lore ngắn hoặc 1 manh mối tiếp; vài điểm lớn dùng **chuỗi 2 nấc** (manh mối → điểm trung gian chứa manh mối kế → điểm đích).
- Đồng bộ điểm thuần vào bộ đếm `ach_kp_secrets` (bậc 40 thành khả thi: 27 + số điểm mới ≥ 40).
- **Probe:** phát hiện điểm thuần đúng bán kính, ghi sổ + đếm thành tựu tăng đúng; chuỗi 2 nấc không nhảy nấc (chưa có manh mối nấc 1 vẫn phát hiện được điểm đích nếu tự tìm thấy — khám phá tự do không bị khóa); tổng đếm đạt qua mốc 40 trong fixture đầy đủ.

### Bảng số TẠM (chờ Bảo veto một lượt khi duyệt)

| Số | Giá trị đề xuất | Ghi chú |
|---|---|---|
| Phạm vi “gần” của perk bản đồ | Đúng phạm vi bản đồ chi tiết của map đang đứng | Không phải bán kính px mới — bám luật minimap hiện có |
| Lệch tâm dấu vùng mờ trên minimap | ~300px quanh điểm thật | Đủ để định hướng vùng, không đủ để đứng đúng ô |
| Bán kính phát hiện điểm thuần mới (đợt 3) | 120px | Nhỏ hơn điểm manh mối GĐ127 (150px) vì điểm thuần có manh mối dẫn đường |
| Số điểm thuần mới (đợt 3) | 12–18 điểm | Đủ đưa tổng đếm qua 40, không loãng |
| Số bia khắc Cổ Ngữ cho manh mối chéo (đợt 2) | 3–5 bia | Đặt tại điểm cổ sẵn có |
| Manh mối mỗi NPC kể chuyện (đợt 2) | 2–4 manh mối/NPC | Theo vùng kể của từng NPC |
| Trần manh mối từ perk đầu kiếp | Đúng 1/kiếp | Theo nguyên văn perk, không TẠM |
| Trần manh mối từ thiền (đợt 2, thêm khi xây GĐ357) | Tối đa 1 manh mối/ngày game, chọn tất định điểm chưa tìm đầu tiên hợp cảnh | Thay cho tỉ lệ % ngẫu nhiên: thiền mỗi ngày chắc chắn có tiến triển nhưng không farm được; chỉ ở sân Đạo Quán như hint cổng cũ |
