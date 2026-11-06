# THIẾT KẾ — ĐỆ TỬ NPC (người chơi làm sư phụ)

_Trình Bảo duyệt 06/11/2026. Mọi con số ghi TẠM. **Bảo chỉnh cùng ngày**: (1) đệ tử có thể là NGƯỜI CHƠI hoặc NPC; (2) mở hệ đệ tử phải qua TÔNG MÔN — chức Trưởng lão trở lên mới được nhận đệ tử, hoặc tự lập tông môn riêng (làm Tông chủ); (3) đệ tử người chơi thì hồi sinh như thường, đệ tử **NPC chết là mất hẳn, không hồi sinh**. **Bảo thêm cùng ngày 10:23**: (4) quan hệ sư đồ là **VĨNH VIỄN** — chỉ sư phụ được đơn phương **trục xuất**, đệ tử **KHÔNG được tự rời**; (5) sư phụ **truyền công pháp** được cho đệ tử — đệ tử học công pháp đó nếu đủ điều kiện học. Bản dưới đã sửa theo 3 ý này._

## 1. Ý tưởng cốt lõi

Đảo ngược hệ Bái sư (GĐ131): xưa người chơi đi bái 7 vị sư phụ nghề, nay người chơi **làm sư phụ**, nhận NPC làm đệ tử, dạy dỗ cho tới ngày đệ tử **xuất sư thành tài**. Đây là hệ lớn cuối cùng còn nợ; nó mở khóa thành tựu đang tắt sẵn trong dữ liệu:

- `ach_nd_disciple` "Đệ tử" — mô tả gốc: _"Số đệ tử đã nhận hoặc dạy thành tài"_, bậc [1, 3, 10, 30], danh hiệu gốc **"Danh Sư"**. → Bộ đếm cộng dồn: +1 khi nhận một đệ tử, +1 nữa khi đệ tử đó xuất sư. Trần đồng thời thấp nhưng cộng dồn dài lâu mới chạm được bậc 30 — đúng chất "danh sư cả đời".

## 2. Ai là đệ tử được — "thiếu niên cầu sư"

- Có **điểm cầu sư** cố định: 3 điểm ở làng (gần Đạo Quán + quảng trường) và 2 điểm ở Thanh Vân Thành. Tại mỗi điểm luôn có 1 thiếu niên đứng chờ (hình pixel chibi dân làng/thành phố sẵn có, không cần vẽ mới).
- Thiếu niên có **tên ngẫu nhiên, tính cách, và thiên hướng** (nghiêng 1 hướng tu/vũ khí — hiện trong lời thoại). Không có biểu tượng nổi trên đầu: người chơi phải **nói chuyện (E)** mới biết ai đang cầu sư — đúng triết lý quan sát của game.
- Nhận rồi thì điểm đó trống; **sang ngày game mới có thiếu niên khác tới** (tên mới, thiên hướng mới). Nguồn đệ tử vô hạn nhưng theo nhịp ngày — không spam nhận hàng loạt.

## 3. Điều kiện nhận — CỔNG TÔNG MÔN (Bảo chốt 06/11)

- Sư phụ phải **có tông môn** và giữ chức **Trưởng lão trở lên** trong tông môn người chơi (Trưởng lão / Phó tông chủ / Tông chủ — theo hệ chức vụ GĐ224). **Tự lập tông môn riêng** = làm Tông chủ → tự đủ điều kiện.
- Tông NPC Thanh Phong Môn không có hệ chức vụ này → không tính (ghi rõ để Bảo veto nếu muốn khác).
- Mất chức (bị giáng xuống Đệ tử / rời tông) thì **không nhận thêm được**, nhưng đệ tử đã nhận vẫn giữ nguyên.
- Tối đa **3 đệ tử đồng thời** — NPC và người chơi **dùng chung** 3 slot này (TẠM).
- (Bỏ điều kiện Trúc Cơ cũ: cổng tông môn đã là điều kiện chính.)

## 4. Đệ tử làm gì (v1)

1. **Đi theo + đánh cùng**: dùng nguyên bộ máy đồng hành sẵn có (thực thể theo chủ, tầm ra đòn 440px, dây kéo 560px, đổi map đi theo chủ). Đòn của đệ tử tính như pet: yếu hơn chủ, tỉ lệ theo cấp đệ tử (mục 5). Quái chết bởi đòn đệ tử tính cho chủ như pet hiện nay.
2. **Thiền cùng**: sư phụ thiền ở nơi linh khí thì đệ tử ngồi thiền cạnh bên → đệ tử tích Tâm đắc; **sư phụ KHÔNG nhận Tu vi từ đệ tử** (luật cứng: Tu vi chỉ từ thiền của chính mình).
3. **Chỉ điểm** (tương tác chủ động): trong panel Đệ tử, mỗi đệ tử được chỉ điểm **1 lần/ngày game** — sư phụ giảng giải, đệ tử nhận một cục Tâm đắc lớn. Đây là hành động "dạy" có chủ ý, không phải treo máy.

_Vai trò để dành v2 nếu Bảo muốn: hái lượm phụ khi chủ thu thập, chạy việc gửi đồ/thư. V1 không làm để giữ nhịp._

## 5. Lớn lên — Tâm đắc & 5 cấp đệ tử

Đệ tử tích **Tâm đắc** (gương Linh tê của pet GĐ307):

| Nguồn | Tâm đắc (TẠM) |
|---|---|
| Quái gục khi đệ tử đang theo đánh cùng | theo cảnh quái: 1 / 2 / 3 / 6 / 12 (bảng Linh tê) |
| Thiền cùng sư phụ | +1 mỗi 30 giây thiền chung |
| Chỉ điểm (sư phụ bấm) | +25, tối đa 1 lần/ngày/đệ tử |

| Cấp | Tên gọi | Ngưỡng Tâm đắc (TẠM) | Sức mạnh |
|---|---|---|---|
| 1 | Học Đồ | 0 | công ≈ 25% công hiệu dụng của sư phụ, máu tương tự |
| 2 | Ký Danh Đệ Tử | 80 | 35% |
| 3 | Thân Truyền | 200 | 45% + học 1 chiêu cơ bản theo thiên hướng |
| 4 | Đệ Tử Chân Truyền | 420 | 55% |
| 5 | Chuẩn Xuất Sư | 800 | 65% |

- Lên cấp có thông báo + đệ tử đổi lời thoại (cảm kích, trưởng thành dần).
- **Xuất sư**: đệ tử đạt cấp 5 và đầy Tâm đắc cấp 5 (TẠM +400 nữa) → sư phụ bấm **Cho xuất sư** trong panel: đệ tử hành lễ tạ ơn, **tặng sư phụ một món quà chia tay** (vật phẩm/Linh thạch theo thiên hướng — KHÔNG tặng Tu vi), rời đi (biến mất khỏi thế giới như một người đã ra đời hành đạo), trống 1 slot, bộ đếm thành tựu +1 "dạy thành tài". Về sau có thể gặp lại tên đệ tử cũ trong lời thoại dân làng (hương vị, v2).

## 6. Khi đệ tử gục trong trận — Bảo chốt 06/11: NPC mất hẳn, người chơi hồi sinh

- **Đệ tử NPC: chết là mất hẳn, KHÔNG hồi sinh** (như pet). Hết máu trong trận = đệ tử tử nạn: thông báo cho sư phụ, slot trống ra, bộ đếm thành tựu GIỮ nguyên phần đã nhận (điểm "đã nhận" không thu hồi). Cái chết có trọng lượng — sư phụ phải giữ đệ tử như giữ pet quý.
- **Đệ tử người chơi: hồi sinh theo luật game thường** (gục → hồi sinh như mọi người chơi). Quan hệ sư đồ không cộng thêm hình phạt chết nào; chỉ khi đệ tử người chơi **tọa hóa hẳn** (hết thọ/vẫn lạc) thì quan hệ sư đồ mới tan, sư phụ nhận được tin "đệ tử vẫn lạc".

## 7. Panel & hiển thị

- Menu → **👨‍🎓 Đệ tử**: danh sách đệ tử (tên, thiên hướng, cấp, thanh Tâm đắc, máu hiện tại), nút **Chỉ điểm** (mờ khi đã dùng hôm nay), **Cho xuất sư** (hiện khi đủ điều kiện), **Trục xuất** (đuổi đệ tử, trống slot, không tính thành tựu, đệ tử quay về điểm cầu sư... thực tế: biến mất).
- Trên đầu đệ tử trong game: tên + dòng nhỏ "đệ tử của {tên sư phụ}" cho người khác thấy (khoe danh sư đúng chất).
- Lời thoại đệ tử theo cấp + theo ngữ cảnh (sau trận, khi lên cấp, khi thiền) — vài câu mỗi mốc, viết tay.

## 8. Kỹ thuật (rút từ bài học các GĐ trước)

- Đệ tử = thực thể đồng hành `isCompanion + isDisciple` trong `players` — thừa hưởng: đi theo/đổi map/dây kéo/loại trừ khỏi các vòng nhắm mục tiêu người chơi. Spawn theo mẫu `spawnTamed`.
- Dữ liệu đệ tử lưu **trên nhân vật sư phụ** (`disciples: [...]` trong persist + bản sao ở spawnOfflineActor theo luật trường-bền; nhân vật đi qua storage chung file/Mongo nên không dính lỗi đồng bộ world của GĐ308). Bộ đếm thành tựu: `counters.disciples` + bật `ach_nd_disciple`.
- Chủ offline/đăng xuất: đệ tử NPC biến mất cùng chủ (như pet), đăng nhập lại spawn lại. Chủ chết tọa hóa (luân hồi): đệ tử NPC **tự giải tán**, quan hệ với đệ tử người chơi cũng tan — kiếp mới là người mới, không kế thừa đệ tử (hồn không mang theo người).
- Quan hệ người chơi: lưu hai phía (sư phụ: danh sách đệ tử gồm cả mục type 'player'; đệ tử: `masterInfo`) — cả hai đều là trường bền trên nhân vật theo luật persist 3 nơi; kiểm tra tư cách nhận đệ tử đọc từ registry tông môn người chơi (vai trò hiện tại của sư phụ).
- Probe dự kiến: nhận (đủ/thiếu điều kiện), theo + đánh, Tâm đắc từ săn/thiền/chỉ điểm, lên cấp, gục → dưỡng thương → quay lại, xuất sư + quà + đếm thành tựu, trục xuất, trần 3, bền qua restart server.

## 9. ĐỆ TỬ NGƯỜI CHƠI (Bảo chốt 06/11: đệ tử có thể là người chơi thật)

### 9.1 Luồng quan hệ
- Sư phụ đủ điều kiện (mục 3) → panel Đệ tử → **Mời đệ tử (người chơi)**: nhập tên nhân vật → lời mời nằm chờ trong hồ sơ người đó (như mời tông môn), họ đăng nhập thấy popup **Chấp nhận / Từ chối**.
- Điều kiện phía đệ tử: chưa có sư phụ-người-chơi nào khác (tối đa **1 sư phụ người chơi** cùng lúc; bái sư phụ NGHỀ là hệ riêng, không xung đột). Không yêu cầu cùng tông môn.
- Chặn vòng lặp: không nhận chính sư phụ của mình làm đệ tử.
- **QUAN HỆ VĨNH VIỄN (Bảo chốt 06/11 10:23)**: đệ tử **KHÔNG có nút rời sư môn** — không tự cắt được. Chỉ **sư phụ mới được đơn phương trục xuất** (áp cho cả đệ tử NPC lẫn người chơi; trục xuất = cắt sạch quan hệ + lợi ích + ghi chép thành tài nếu có). Sư phụ mất tư cách nhận (giáng chức/rời tông) không làm tan quan hệ — chỉ chặn nhận mới.
- Ngoại lệ tự nhiên duy nhất: sư phụ hoặc đệ tử **tọa hóa (luân hồi)** thì nhân vật không còn → quan hệ tan, bên còn lại nhận tin. (Muốn nối lại ở kiếp sau là việc của hệ **Duyên Nợ** — xem `THIET_KE_DUYEN_NO.md`.)
- "Thành tài/xuất sư" (mục 9.3) KHÔNG cắt quan hệ: chỉ đổi trạng thái thành "đã thành tài" + trống slot theo học; quan hệ và lợi ích còn nguyên vĩnh viễn.

### 9.2 Lợi ích (TẠM, giữ luật: không tặng Tu Vi, không phá kinh tế)
- Đệ tử thiền **gần sư phụ đang thiền cùng**: tốc độ thiền **+10%** ("sư phụ chỉ điểm" — là buff theo vị trí như lãnh địa tông môn, không phải quà).
- Đệ tử có sư phụ người chơi: **học/luyện +5%** (gương lộc bái sư NPC +5%).
- **Chỉ điểm**: sư phụ chỉ điểm đệ tử người chơi đang online gần mình, 1 lần/ngày: đệ tử nhận buff **thiền +20% trong 1 giờ game** (buff có hạn, không phải Tu Vi tặng).
- Sư phụ: không buff số — phần thưởng là tiến độ Danh Sư (mục 9.3) + quà xuất sư.

### 9.3 "Dạy thành tài" với đệ tử người chơi
- Nhận đệ tử người chơi: thành tựu +1 như NPC.
- **Thành tài**: đệ tử đạt **Kim Đan** trong lúc còn quan hệ → mốc thành tài: hai bên nhận thông báo, sư phụ +1 "dạy thành tài", nhận **quà mừng** (LT/vật phẩm TẠM — không Tu vi). Quan hệ **KHÔNG tan** (vĩnh viễn — mục 9.1): đệ tử chuyển sang nhóm "đã thành tài" trong panel, **slot theo học trống** cho đệ tử mới; lợi ích sư đồ còn nguyên.
- Trục xuất trước Kim Đan: không tính thành tài, không quà.

## 9.4 TRUYỀN CÔNG PHÁP (Bảo chốt 06/11 10:23)

- Sư phụ mở panel Đệ tử → chọn đệ tử → **Truyền công pháp**: danh sách hiện các công pháp **sư phụ đã học**.
- Chọn một công pháp → đệ tử **học ngay công pháp đó NẾU đủ điều kiện học** (điều kiện gốc của chiêu trong catalog: cảnh giới + chỉ số điều kiện; nghề/lớp/vũ khí không hợp thì truyền thất bại và báo rõ thiếu điều kiện gì). Đủ điều kiện mà đệ tử đã biết rồi → báo "đã học".
- Đệ tử **người chơi**: công pháp vào thẳng sổ đã học của họ (tự lắp ô chiêu như thường); chỉ truyền được khi hai bên **cùng map và ở gần nhau** (TẠM ≤ 300px) — truyền công là việc mặt đối mặt.
- Đệ tử **NPC**: học vào bộ chiêu của đệ tử (tối đa **3 chiêu được truyền**, cộng chiêu cơ bản theo thiên hướng ở cấp 3 — dùng trong vòng đánh tự động của nó).
- Không tốn Linh thạch/Tu vi của hai bên; không giới hạn số lần truyền mỗi ngày — cổng duy nhất là điều kiện học của đệ tử (muốn truyền chiêu cao thì phải dạy đệ tử lớn trước). _(Số TẠM, Bảo veto được.)_

## 10. Đã chốt / còn chờ

- ĐÃ CHỐT (Bảo 06/11): đệ tử = người chơi hoặc NPC; cổng tông môn Trưởng lão+ / tự lập tông; NPC chết mất hẳn, người chơi hồi sinh thường.
- Chờ duyệt phần còn lại: vai trò NPC v1 (theo + đánh + thiền + chỉ điểm), Tâm đắc 5 cấp, lợi ích đệ tử người chơi (9.2), mốc xuất sư Kim Đan (9.3), trần 3 slot chung.
