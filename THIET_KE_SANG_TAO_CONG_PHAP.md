# THIẾT KẾ — SÁNG TẠO CÔNG PHÁP TÔNG MÔN (GĐ328)

Ý của Bảo (06/11/2026, chọn mức LỚN): công pháp của tông người chơi **không phải đồ có sẵn** —
**Tông chủ, Phó tông chủ và Trưởng Lão Danh Dự tự sáng tạo ra pháp riêng cho tông mình**, tốn cực kỳ nhiều thứ.
Mọi số trong tài liệu này đều là **TẠM**, Bảo sửa một dòng là đổi.

## 1. Ai được sáng tạo

- **Tông chủ + Phó tông chủ** (theo chức), và **Trưởng Lão Danh Dự**: chức danh dự mới do Tông chủ phong cho Trưởng lão, tối đa **2 người** (TẠM) — ghế này mang quyền sáng tạo pháp.
- Người tạo phải đạt **cảnh tối thiểu theo cấp pháp** (mục 3). Hệ của pháp = **linh căn của người tạo** (dấu ấn cá nhân; đợt 1 là danh tính + biểu tượng, đợt 2 chiến kỹ sẽ dùng hệ thật).
- Tên người tạo lưu vĩnh viễn trong pháp: "Khai sáng: <tên>".

## 2. Cách tạo — ghép thành phần trong ngân sách

Người tạo ghép các **thành phần hiệu ứng**; mỗi thành phần có **trọng số**, tổng trọng số ≤ **ngân sách của cấp pháp + điểm khuyết** (mục 4). Trần từng thành phần:

| Thành phần | Mỗi bậc | Trọng số/bậc | Trần | Kênh áp dụng |
|---|---|---|---|---|
| Công | +1% vật/pháp công | 2 | +5% | effStatsOf |
| Phòng | +1% vật/pháp phòng | 2 | +5% | effStatsOf |
| Tốc | +1% tốc độ (chỉ số Tốc Độ) | 2 | +4% | effStatsOf |
| Máu | +1% máu tối đa | 3 | +4% | maxHpEff |
| Thiền | +2% Tu vi khi thiền | 2 | +10% | hệ số thiền |
| Chế | +2% tỉ lệ chế tạo | 2 | +8% | tỉ lệ chế |

Tên pháp: người tạo tự đặt, 3–24 ký tự. Pháp có **tối thiểu 1 thành phần** và **đúng 1 khuyết điểm**.

## 3. Cấp pháp (TẠM)

| Cấp | Ngân sách | Cảnh người tạo | Cấp tông | Tàng Kinh Các | Quỹ tông | Tông Uy | Người tạo trả | Nguyên liệu | Điểm ngộ | Thọ người tạo | Học (Tông Cống) |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Phàm | 10 | Luyện Khí+ | 1 | 1 | 2.000 LT | 10 | — | 10 Linh Thảo | 100 | — | 150 |
| Linh | 16 | Trúc Cơ+ | 2 | 1 | 6.000 LT | 30 | 300 LT Trung | 3 Tiên Linh Chi | 250 | — | 300 |
| Huyền | 24 | Kim Đan+ | 3 | 2 | 15.000 LT | 60 | 800 LT Trung | 5 Đá Quý | 500 | — | 500 |
| Địa | 34 | Nguyên Anh+ | 4 | 2 | 40.000 LT | 120 | 300 LT Thượng | 10 Đá Quý + 5 Tiên Linh Chi | 1.000 | 2 năm | 800 |
| Thiên | 46 | Hóa Thần+ | 5 | 3 | 100.000 LT | 250 | 1.000 LT Thượng | 20 Đá Quý | 2.000 | 5 năm | 1.200 |

Số ô pháp của tông = cấp tông (1–5), tính cả pháp đang ngộ.

## 4. Khuyết điểm bắt buộc (chọn đúng 1, được +4 ngân sách)

Giảm Công −3% · Giảm Phòng −3% · Giảm Tốc −3% · Giảm Máu −3% · Thiền −6% · Chế −6%.
Áp qua đúng kênh của thành phần tương ứng. Nguyên tắc: **không có pháp hoàn hảo**.

## 5. Ngộ pháp (nghiên cứu)

Pháp tạo xong ở trạng thái **đang ngộ**, chưa học được. Tiến độ từ:
- Cả tông hoàn thành việc Bảng Ủy Thác: **+10 điểm/việc** (móc vào completeActiveQuest).
- Thành viên **nộp vật phẩm** tại panel: điểm = max(1, ⌊giá bán/100⌋), trần 20 điểm/món (TẠM).
- Mỗi ngày game trôi qua: **+5 điểm** (tông nhỏ vẫn xong được, chỉ chậm).

Đủ điểm → pháp **thành**, ghi nhật ký tông + thông báo cả tông.

## 6. Học và vận hành

- Học tại **Tàng Kinh Các** (đứng gần công trình ≤350px như tông pháp đợt 3), hạng **Nội Môn trở lên** (Tông Cống ≥100), trả Tông Cống theo cấp pháp.
- Mỗi người **vận hành tối đa 2 pháp tông cùng lúc** (bật/tắt trong panel). Học thì giữ mãi, vận hành mới có hiệu lực.
- **Rời tông = mất hiệu lực ngay** (như tông pháp GĐ326); vào lại tông cũ thì dùng lại được. Pháp bị phế thì mất hiệu lực với mọi người.
- **Phế pháp**: Tông chủ (hoặc Quyền Tông chủ) xóa pháp, trống ô, **không hoàn chi phí**.

## 7. Sở hữu

Pháp là **tài sản của tông**: người tạo rời tông/giải tán ghế, pháp ở lại với tông. Tông giải tán thì pháp mất theo tông.

## 8. Chia đợt

- **Đợt 1 (GĐ328)**: khung sáng tạo + Trưởng Lão Danh Dự + chi phí + ngộ pháp + học/vận hành pháp bị động (6 thành phần trên) + panel + form sáng tạo.
- **Đợt 2**: Chiến kỹ — pháp chủ động đánh thật theo hệ của người tạo (hệ số theo cấp pháp, hồi chiêu/tốn chân nguyên là khuyết điểm mở rộng).
- **Đợt 3**: Tông Phong (danh tính chung của tông, cộng hưởng với các pháp đã sáng tạo) + Trận pháp tông chiến (bố trận trong vùng cờ).

## 9. Ghi chú đã xây đợt 1 (GĐ328, 06/11/2026 — probe p328 PASS 14/14)

- Server: `SECT_ART_COMPS` (6 thành phần) + `SECT_ART_FLAWS` (6 khuyết, +4 ngân sách) + `SECT_ART_GRADES` (5 cấp như bảng mục 3); pháp lưu ở `g.arts`, ghế Danh Dự ở `g.honor`; người học lưu `sectArts`/`sectArtsActive` (đủ 4 điểm lưu trữ). Hiệu ứng qua đúng kênh sẵn có: effStatsOf (công/phòng/tốc), maxHpEff (máu), hệ số thiền, tỉ lệ chế. Sự kiện: `sect_honor_set`, `sect_art_create`, `sect_art_donate`, `sect_art_learn`, `sect_art_toggle`, `sect_art_delete`. Ngộ pháp: việc Bảng +10 (móc completeActiveQuest), nộp đồ theo bảng điểm hiếm, +5/ngày.
- Client: khối "📜 Công pháp tự sáng tạo" trong panel tông (danh sách + thanh ngộ + nộp đồ + học/vận hành/phế), form sáng tạo có nút +/− từng thành phần và đếm trọng số trực tiếp, nút Phong/Bỏ Danh Dự ở hàng Trưởng lão.
- **Chênh lệch so với bản duyệt**: cột "Tông Uy" ở mục 3 là **điều kiện tối thiểu, KHÔNG trừ** — vì Tông Uy quyết định cấp tông, trừ Uy sẽ khiến tông tụt cấp ngay khi tạo pháp. Quỹ tông, đá của người tạo, nguyên liệu và thọ nguyên vẫn trừ thật như thiết kế.
- Đã đo thật bằng probe: quyền tạo theo ghế + Danh Dự, chặn vượt ngân sách, trừ đúng chi phí (quỹ −15.000 / Trung −800 / Đá Quý −5 cho Huyền cấp), ngộ đủ điểm mới học được, cổng Nội Môn, trần vận hành 2, phế pháp, rời tông mất hiệu lực, và **hiệu ứng Công +5% đo bằng sát thương thật (89 → 93, đúng công thức)**. Kênh Thiền/Chế/Máu của pháp tự tạo đi chung đường cộng/nhân với tông pháp GĐ326 (đã đo ở GĐ327) — ở mức công thức.
- Chưa làm: đợt 2 (chiến kỹ chủ động theo hệ), đợt 3 (Tông Phong + trận pháp tông chiến).

## 10. Ghi chú đã xây đợt 2 — CHIẾN KỸ (GĐ329, 06/11/2026 — probe p329 PASS 9/9)

- Thể loại thứ hai của pháp tự sáng tạo: **Chiến kỹ** — chiêu đánh thật, lắp vào ô chiêu như công pháp thường (hiện cả trong Sổ Công Pháp), tung bằng phím số qua đúng đường `cast_skill` của game (kiểm tầm/chân nguyên/hồi chiêu, tính sát thương, tông chiến PvP như chiêu thường).
- Ghép theo bảng riêng (cùng ngân sách + khuyết điểm bắt buộc): **Sát thương** +0,4 hệ số/bậc (trọng số 3, tối đa 5; hệ số trần theo cấp pháp: Phàm 1,6 · Linh 2,0 · Huyền 2,4 · Địa 3,0 · Thiên 3,6) · **Tầm** +1 ô/bậc (gốc 4 ô, trọng số 2, tối đa 4) · **Đánh vùng** (trọng số 5, 1 bậc — trúng mọi quái trong tầm như chiêu vùng của game) · **Làm chậm** +10%/bậc trong 2,5 giây (trọng số 3, tối đa 3).
- Chân nguyên + hồi chiêu SUY RA từ ghép (TẠM): mana = 20 + 10×Sát + 5×Tầm + 12×Vùng + 6×Chậm; hồi = 5s + 0,8s×Sát + 2s×Vùng + 0,5s×Chậm.
- Khuyết điểm riêng của Chiến kỹ (chọn 1, vẫn +4 ngân sách): **Hồi Chiêu Lâu** (hồi chiêu ×1,5) · **Hao Chân Nguyên** (mana ×1,5) · **Thế Yếu** (hệ số −0,4).
- Chiến kỹ KHÔNG "vận hành" như tâm pháp: học xong thì lắp ô chiêu; rời tông là bị gỡ khỏi bảng chiêu và không lắp lại được (cùng luật mất hiệu lực). Hệ của pháp vẫn theo linh căn người tạo (hiển thị; hiệu ứng hệ chuyên sâu để đợt sau).
- Đo thật bằng probe: tạo đúng số (hệ số bị trần Phàm chặn 2,0 → 1,6; mana 61 → 92 vì khuyết Hao Nguyên), lắp/gỡ ô chiêu, hồi chiêu chặn tung liên tục, **sát thương đo theo tỉ lệ ~×1,6 so với chiêu cơ bản hệ số 1,0**, tầm 200 thắng tầm 120 của chiêu cơ bản ở khoảng cách ~175px.
- Còn lại: đợt 3 (Tông Phong + trận pháp tông chiến).

## 11. Thiết kế chi tiết đợt 3 — TÔNG PHONG + TRẬN PHÁP TÔNG CHIẾN (soạn 07/11/2026 — CHỜ BẢO DUYỆT; mọi con số đều TẠM)

### 11.1 Tông Phong — danh tính TỰ SINH, không chọn

- **Nguyên tắc**: đúng triết lý game — tông phong KHÔNG phải thứ chọn trong menu. Tông sáng tạo pháp gì nhiều thì tự thành phong đó; danh tính là hệ quả của hành động, người ngoài nhìn vào tông là biết tông mạnh về đường nào.
- **Nguồn điểm**: mọi pháp **đã ngộ xong** của tông (cả Tâm pháp lẫn Chiến kỹ) cộng điểm cho 5 trục theo thành phần đã ghép (tính theo số bậc thành phần):
  - **Công Phá** ← Công (tâm pháp) + Sát thương + Đánh vùng (chiến kỹ)
  - **Thủ Ngự** ← Phòng + Máu
  - **Linh Động** ← Tốc độ + Tầm + Làm chậm
  - **Tu Hành** ← Thiền
  - **Xảo Nghệ** ← Chế tạo
- **Định hình**: tổng điểm tích ≥ **30** (TẠM) mới có phong. Trục cao nhất hơn trục nhì ≥ 20% → phong chính là trục đó. Hai trục đầu chênh < 20% → **Song Phong** (mang cả hai danh tính).
- **Hiệu ứng cộng hưởng** (chỉ khi còn ở trong tông; mọi trục ngang sức nhau, chỉ khác mùi vị — giữ luật không có build đúng):
  - Học pháp **thuộc trục phong chính**: giảm **20%** Tông Cống (TẠM).
  - Vận hành Tâm pháp thuộc trục phong: các thành phần **thuộc trục đó +1 bậc hiệu lực** (không vượt trần bậc của thành phần).
  - Chiến kỹ thuộc trục phong: **hồi chiêu −10%** (TẠM).
  - Song Phong: cả hai trục đều được cộng hưởng nhưng ở mức **60%** các con số trên (làm tròn xuống; +1 bậc thành phần thì giữ nguyên vì không chia nhỏ được — ghi rõ khi xây).
- **Tên phong**: "<Hệ trội> <Tên trục>" — hệ trội = hệ linh căn chiếm đa số trong số người đã tạo pháp cho tông (vd "Hỏa Công Phá", "Thủy Linh Động"). Hiện ở panel tông và ở trụ sở. **Phong tính lại mỗi khi có pháp ngộ xong hoặc bị phế** — tông đổi hướng sáng tạo là phong tự trôi theo, không khóa chết.
- Chưa đủ điểm: panel hiện "Tông phong chưa định hình — đã tích X/30 điểm" kèm trục đang dẫn đầu, để tông biết mình đang thành hình ra sao (gợi ý trong thế giới, không ép buộc).

### 11.2 Trận pháp tông chiến — bày trận trong vùng cờ

- **Mở khóa theo phong**: tông **đã định hình Tông Phong** mới bày được trận, và loại trận = trục phong của tông (Song Phong: mỗi trận chiến chọn 1 trong 2 trục lúc bày). Tông chưa sáng tạo đủ pháp thì chưa có trận — danh tính đi trước, sức mạnh chiến trường theo sau.
- **Cách bày**: trong **30 phút chuẩn bị** sau khi tuyên chiến/nhận chiến (cơ chế GĐ302), Tông chủ hoặc Phó tới **điểm cờ** của lãnh địa đang tranh và bày trận: tốn **Quỹ 10.000 LT + 5 Đá Quý** (TẠM; Tông Uy chỉ là điều kiện tông đã định hình phong, không trừ — theo tiền lệ GĐ328). Trận hiện hình thành **vòng trận văn bán kính 350px quanh cờ** (đúng vùng chiến), màu theo hệ trội của tông.
- **Hiệu ứng trận** — chỉ áp cho thành viên tông mình **đang đứng trong vùng trận** và **chỉ trong cửa sổ chiến 10 phút**:
  - **Công Phá trận**: +8% công (TẠM)
  - **Thủ Ngự trận**: −8% sát thương nhận vào; Thủ Lĩnh Chiến Kỳ +2.000 máu tối đa (TẠM)
  - **Linh Động trận**: +8% tốc độ (chỉ số Tốc Độ); kháng làm chậm 50% (TẠM) — GĐ350: nhãn ghi rõ chỉ số vì trận nhân vào eff.tocDo rồi qua đường cong speedOf, không phải +8% tốc chạy cuối (trong game panel chỉ hiện tên trận, không hiện %)
  - **Tu Hành trận**: hồi 0,5% máu tối đa/giây (TẠM)
  - **Xảo Nghệ trận**: chiến kỹ của tông hồi chiêu −15% khi đứng trong trận (TẠM)
- **Đối sách — Trận Nhãn**: mỗi trận có 1 **Trận Nhãn** (cột sáng đặt ở rìa vùng trận, phía đối diện cờ), máu **3.000** (TẠM). Đối thủ phá vỡ Trận Nhãn trong cửa sổ chiến → trận mất hiệu lực ngay, phần thời gian còn lại đánh chay. Trận Nhãn là mục tiêu hợp lệ trong vùng chiến theo đúng đường PvP sẵn có (như đồng hành/thủ lĩnh).
- **Công bằng (khóa cứng khi xây)**: hiệu ứng KHÔNG scale theo số thành viên hay cấp tông — tông nhỏ đã định hình phong vẫn bày được trận ngang sức; mỗi tông tối đa 1 trận trong 1 trận chiến; trận không cộng điểm trực tiếp (điểm số giữ nguyên luật GĐ302); ra khỏi vùng hoặc hết cửa sổ chiến là trận tự tắt/gỡ. Ngoài vùng chiến game vẫn không có PvP.
- Thắng/thua/hòa, cược 5.000 LT, giữ vùng tính điểm, hạ thủ lĩnh +150: **giữ nguyên toàn bộ GĐ302**, đợt này chỉ thêm lớp trận.

### 11.3 Dữ liệu và móc code (ghi sẵn cho lúc xây)

- **Không thêm field world mới**: phong là giá trị SUY RA từ `g.arts` (tính lại khi arts thay đổi, cache vào `g.phong` trong bản ghi tông — cùng bản ghi sẵn có như GĐ328). Trận đang bày lưu trong trạng thái trận chiến hiện hành của GĐ302, hết chiến tự xóa theo war state.
- **Kênh hiệu ứng**: dùng lại đúng các kênh sẵn có — effStatsOf (công/phòng/tốc), hồi máu theo tick, hệ số hồi chiêu của chiến kỹ tự tạo; điều kiện vùng = hàm kiểm vùng cờ tông chiến sẵn có.
- **Sự kiện dự kiến**: `sect_war_formation_set` (trong pha chuẩn bị, tại cờ); panel tông thêm khối **🏳️ Tông Phong** (trục, điểm tích theo trục dạng thanh, hiệu ứng đang hưởng, tên phong); client vẽ vòng trận văn (vẽ code như vòng lãnh địa) + Trận Nhãn (cột sáng + thanh máu như thủ lĩnh) — không cần sprite mới.
- **Thông báo**: khi phong định hình/đổi trục → thư + nhật ký tông; khi trận bị phá Trận Nhãn → thông báo cho cả hai tông trong vùng.

### 11.4 Kế hoạch đo khi xây (probe)

- Phong: tông fixture có arts lệch hẳn 1 trục → phong đúng trục + tên đúng hệ trội; hai trục sát điểm → Song Phong; học pháp thuộc trục được giảm đúng 20% cống; vận hành tâm pháp thuộc trục đo sát thương thấy +1 bậc thành phần.
- Trận: bày trận trừ đúng quỹ/đá, bày ngoài pha chuẩn bị hoặc xa cờ bị chặn; hiệu ứng Công Phá đo bằng sát thương trong vùng, ra khỏi vùng mất ngay; Trận Nhãn bị phá → hiệu ứng tắt; hết cửa sổ chiến trận tự gỡ; tông chưa định hình phong không bày được.

## 12. CƠ CHẾ CHUẨN HÓA TỰ ĐỘNG — tự do sáng tạo + Thiên Đạo tự cân bằng (Bảo yêu cầu 07/11/2026 — CHỜ DUYỆT)

**Yêu cầu của Bảo**: người chơi phải được TỰ DO tối ưu — phát huy sở trường và trí tưởng tượng trong cách điều hành, sáng tạo tông môn; nhưng nếu pháp tạo ra **quá mạnh hoặc quá yếu so với cấp bậc** của nó thì phải được **tinh chỉnh lại ngay**. Mục này là cơ chế đáp ứng yêu cầu đó, áp cho TOÀN BỘ pháp tự sáng tạo (đợt 1 + 2, và là nền cho đợt 3).

### 12.1 Nguyên tắc

- **Tự do nằm ở HÌNH DÁNG, cân bằng nằm ở ĐỘ LỚN.** Người chơi ghép gì, tỉ lệ ra sao, đặt khuyết điểm ở đâu cho khôn — đó là đất sáng tạo, hệ thống không can thiệp. Hệ thống chỉ đo TỔNG sức mạnh của pháp so với khung của cấp pháp, và co/giãn độ lớn tổng thể cho về khung. Ghép khéo (đặt khuyết vào kênh mình không cần, dồn trục mình mạnh) vẫn được thưởng trong khung — đó chính là "tối ưu".
- Ngân sách trọng số hiện tại (GĐ328/329) giữ vai trò **hàng rào ngoài** (chặn ghép vô lý); chuẩn hóa là **lớp cân bằng trong** xử lý phần lệch còn lại — nhờ có lớp này, hàng rào ngoài không cần siết thêm nữa.

### 12.2 Cách đo — chỉ số sức mạnh (Power Index, PI)

- Mỗi thành phần + khuyết điểm có một **trọng số sức mạnh chuẩn** (bảng tham chiếu cố định, TẠM — tách khỏi trọng số ngân sách: ngân sách đo "giá ghép", PI đo "sức mạnh thật"). PI của pháp = tổng (bậc × trọng số PI) của mọi thành phần **trừ** phần khuyết điểm (khuyết làm giảm PI thật bao nhiêu tính đúng bấy nhiêu — đặt khuyết khôn thì PI ròng cao hơn, được hệ thống công nhận).
- Chiến kỹ: PI tính từ hệ số sát thương, tầm, đánh vùng, làm chậm; chân nguyên/hồi chiêu dài hơn được cộng một phần PI (chiêu đắt thì được mạnh hơn một chút — hệ số quy đổi TẠM, trần rõ ràng).
- Mỗi cấp pháp có **khung PI chuẩn**: Phàm/Linh/Huyền/Địa/Thiên = 100/160/240/340/460 (TẠM), biên dung sai **±10%** (TẠM).

### 12.3 Cách chỉnh — hệ số chuẩn hóa k

- Thời điểm chỉnh: **ngay khi pháp ngộ xong** (trước khi ai học được) — "tinh chỉnh lại ngay" đúng nghĩa, không để pháp lệch khung lọt vào game dù chỉ một ngày.
- Ngoài biên → áp hệ số **k = PI chuẩn giữa khung / PI thật**, nhân vào **mọi độ lớn hiệu ứng** của pháp (tâm pháp: % của từng thành phần; chiến kỹ: hệ số sát thương và % làm chậm — tầm và đánh vùng là bậc rời rạc nên giữ nguyên, phần lệch dồn hết vào hệ số sát thương). Trong biên → k = 1, không đụng.
- **k bị kẹp trong [0,65 – 1,40]** (TẠM): pháp lệch tới mức kẹp vẫn chưa về khung thì phần ngân sách hàng rào ngoài vốn đã chặn từ đầu; nếu vẫn lọt, lấy k ở biên kẹp (lệch tối đa còn lại < dung sai ×2, chấp nhận được và ghi log để chỉnh bảng PI sau).
- **Tỉ lệ ghép của người chơi giữ nguyên tuyệt đối** — pháp ghép 5 Công 1 Phòng chuẩn hóa xong vẫn là 5 Công 1 Phòng, chỉ nhỏ/lớn hơn theo k. Pháp yếu được **buff lên** theo cùng cơ chế (k > 1) — sáng tạo dở không bị phạt chết, chỉ bị đưa về đúng tầm cấp bậc.
- **Công khai minh bạch**: panel pháp hiện rõ "Sức mạnh: PI thật → chuẩn cấp X · Thiên Đạo chuẩn hóa ×k" — người chơi thấy trước, tính toán được, đúng triết lý quan sát–phán đoán; không có nerf ngầm.
- **Hồi tố khi cân bằng game thay đổi**: nếu sau này chỉnh bảng trọng số PI/khung chuẩn, mọi pháp hiện có tự chuẩn hóa lại theo k mới ở lần đăng nhập/ngày mới kế tiếp (công bằng cho cả tông cũ lẫn tông mới; k cũ không thành đặc quyền).

### 12.4 Ảnh hưởng lên đợt 3

- **Điểm Tông Phong tính theo PI SAU chuẩn hóa** (chuẩn hóa xong mới cộng trục) — tông không thể "thổi" phong bằng pháp lệch khung.
- Trận pháp đợt 3 có hiệu ứng cố định theo trục (không do người chơi ghép) nên không cần chuẩn hóa; độ mạnh của trận đã khóa trần ở 11.2.

### 12.5 Điểm chờ Bảo chốt

- Biên dung sai ±10% và kẹp k [0,65–1,40] là số TẠM — Bảo có thể siết/nới. Nới biên = tự do lệch nhiều hơn, siết = cân bằng chặt hơn.
- Chuẩn hóa áp cả **buff pháp yếu lên** (như bản này) hay chỉ **nerf pháp mạnh xuống**, pháp yếu giữ nguyên cho người tạo tự rút kinh nghiệm? → Đề xuất: **cả hai chiều** (đúng chữ "quá mạnh hoặc quá yếu" trong yêu cầu của Bảo).

### 12.6 Chi phí sáng tạo phải NẶNG (Bảo nhấn lại 07/11/2026)

- Bảo chốt: tạo công pháp tông phải **tốn nhiều Linh thạch và nhiều thứ khác** — đây là luật giữ nguyên từ yêu cầu gốc ("tốn cực kỳ nhiều thứ"), không được làm rẻ đi trong các đợt sau.
- Cơ cấu chi phí hiện hành (GĐ328, đã trừ thật + đo probe) giữ nguyên làm chuẩn: **Quỹ tông bằng LT tăng mạnh theo cấp** (2.000 → 100.000) + **đá Trung/Thượng của chính người tạo** (300–1.000) + **nguyên liệu hiếm** (Đá Quý tới 20, Tiên Linh Chi) + **thọ nguyên 2/5 năm** ở Địa/Thiên cấp; sau đó còn tốn công ngộ pháp (nộp đồ + việc Bảng + ngày) và Tông Cống để học.
- Áp cho đợt 3: bày trận tốn Quỹ + Đá Quý như 11.2; Tông Phong không tốn trực tiếp vì là hệ quả tự sinh của những pháp đã tốn kém tạo ra.
- **Vật phẩm hiếm riêng cho MỖI lần tạo (Bảo chọn thêm 07/11/2026)**: thêm vật phẩm mới **Ngọc Giản Trống** — phôi ngọc để khắc ghi một công pháp mới; không có nó thì không khởi sáng được, áp cho cả Tâm pháp lẫn Chiến kỹ, trừ **khi tạo thành công** (ghép lỗi/vượt ngân sách không trừ). Số lượng theo cấp pháp (TẠM): Phàm 1 · Linh 1 · Huyền 2 · Địa 3 · Thiên 5, lấy từ túi người tạo.
  - **Nguồn kiếm (chỉ trong thế giới, không bán shop, không nạp)**: rơi từ trùm map + quái đặc biệt ✦ (tỉ lệ TẠM ~25%/con), rương ẩn, phần thưởng việc Ủy Thác độ khó cao; thêm đường **chế tạo dự phòng**: 3 Đá Quý + 5 Tiên Linh Chi → 1 Ngọc Giản Trống ở Luyện Khí Phòng (TẠM) để tông nào cũng có đường cày, chỉ là đắt.
  - Hệ quả cân bằng: Ngọc Giản là "van" giới hạn tốc độ spam pháp của tông giàu — tiền nhiều đến mấy cũng phải có phôi mới tạo tiếp được; đồng thời tạo thêm một mặt hàng hiếm có giá trị trao đổi giữa người chơi.

### 11.5 Ba điểm chờ Bảo chốt khi duyệt (đề xuất của agent ghi kèm)

1. **Mở khóa trận theo Tông Phong** (phải sáng tạo pháp đủ mới có trận — như bản này) hay tông nào cũng bày được trận, phong chỉ quyết định loại? → Đề xuất: **theo phong**.
2. **Song Phong lúc bày trận**: chọn 1 trục hiệu ứng đầy đủ (như bản này) hay mang cả hai ở mức 60%? → Đề xuất: **chọn 1 trục** (có quyết định chiến thuật trước giờ G).
3. **Trận Nhãn phá được để tắt trận** (như bản này) hay trận bất khả xâm phạm, chỉ hết giờ mới tắt? → Đề xuất: **phá được** (có đối sách thì trận chiến mới có lớp lang).

## 13. GHI CHÚ XÂY DỰNG GĐ334 (đợt 3 — đã xây + probe xong 07/11/2026)

Mọi số dưới đây đều TẠM như các đợt trước. Probe: `probes/gd334/p334a–f.cjs` — Ngọc Giản 7/7, Chuẩn hóa 8/8, Tông Phong 14/14, Trận pháp 12/12, cổng phong/cleanup 6/6, rơi giản qua combat thật PASS (rơi ngay con Thạch Khôi Lỗi đầu tiên, nhặt vào túi thành công).

### 13.1 Chuẩn hóa tự động — bộ số PI đã chọn (§12)

- **Trọng số PI mỗi bậc, Tâm pháp**: Công 30 · Phòng 30 · Tốc 26 · Máu 34 · Thiền 26 · Chế 26. **Chiến kỹ**: Sát 45 · Tầm 18 · Vùng 55 · Hiệu (làm chậm) 24. Thang cân để một pháp Địa ghép mạnh ra ~400 PI như ví dụ §12.2 (probe đo: Địa {Công 5, Máu 4, Thiền 5, Tốc 3} + khuyết Chế → PI 416, k = 340/416 = 0,82 ✓).
- **Khuyết điểm = PI âm** đúng số bậc tương đương của thành phần bị trừ: khuyết −3% của thành phần X → −(3 ÷ % mỗi bậc của X) × PI(X). Chiến kỹ: Thế Yếu −45 (= 1 bậc Sát), Hồi Chiêu Lâu −16, Hao Chân Nguyên −12.
- **Chiến kỹ — PI phụ từ cd/mana dài** (chỉ tính phần vượt nền, có trần): cd +1 PI mỗi 0,5 giây vượt 5.000ms, trần +12; mana +1 PI mỗi 10 vượt 20, trần +8.
- **PI sàn = 5**: pháp ghép cực lệch vẫn có PI dương để k chạm trần ×1,40 thay vì chia số âm/0.
- **k = clamp(khung ÷ PI thật, 0,65 – 1,40)**, làm tròn 2 chữ số; PI trong biên ±10% quanh khung (100/160/240/340/460) → k = 1. Lưu `art.k` khi pháp chuyển "đã ngộ xong" (đúng điểm `addArtResearch` hoàn tất); **pháp cũ trước GĐ334 được tính k hồi tố** ở lần nạp tông đầu tiên sau cập nhật (cờ một lần trong `ensureSectV2`, không ghi nhật ký).
- **k áp vào mọi kênh**: Tâm pháp nhân % từng thành phần và cả % khuyết (qua `sectArtFxOf`); Chiến kỹ nhân hệ số sát thương (sau trần cấp + Thế Yếu, sàn 0,6 trước khi nhân k) và % làm chậm; tầm/đánh vùng/mana/cd KHÔNG đổi theo k.
- **Lưu ý cấu trúc (TẠM chấp nhận)**: Chiến kỹ cấp cao thường THẤP hơn khung PI vì hệ số bị trần cấp ép (Địa trần 3,0) → hay được nâng tới trần k = 1,40. Nếu sau này muốn khung riêng cho Chiến kỹ thì tách `SECT_ART_PI_BAND` theo `kind`.
- Panel: hàng pháp hiện "💪 Sức mạnh: \<PI\> · chuẩn cấp \<khung\> · đúng khung / chuẩn hóa ×\<k\>"; payload `sect_state` kèm `pi`, `k`, `band` cho từng pháp đã ngộ.

### 13.2 Tông Phong — quy tắc đã chốt khi xây (§11.1)

- **Điểm trục** = tổng (bậc thành phần × k của pháp đó) trên các pháp ĐÃ NGỘ XONG, làm tròn 0,1. **Hệ trội** = hệ linh căn chiếm đa số trong số NGƯỜI TẠO các pháp đã xong (pháp lưu sẵn `element` của người tạo từ GĐ328 — không thêm field nhân vật).
- **Trục của một pháp** = trục chứa thành phần có bậc cao nhất của pháp; hòa bậc → trục có tổng bậc lớn hơn; hòa nữa → theo thứ tự trục Công Phá → Thủ Ngự → Linh Động → Tu Hành → Xảo Nghệ.
- **Cộng hưởng +1 bậc**: áp vào BẬC GỐC của thành phần thuộc trục phong TRƯỚC khi nhân k, không vượt trần bậc của thành phần (Công đã 5 bậc thì không lên nữa — probe C3 đo ở pháp Công 4 bậc: dmg chiêu cơ bản 210 → 220 đúng +5% thay vì +4%). Chỉ áp cho TÂM PHÁP đang vận hành; Chiến kỹ không nhận +1 bậc (chỉ nhận giảm hồi chiêu như §11.1 ghi). Song Phong: +1 bậc cho thành phần thuộc CẢ hai trục, không chia mức.
- **Giảm Tông Cống học pháp thuộc trục**: phong đơn ×0,8; Song Phong ×0,88 (hiểu "cộng hưởng 60%" = hưởng 60% của mức giảm 20% → giảm 12%), làm tròn xuống, tối thiểu 1. Áp cả khi học pháp thuộc trục chính lẫn trục phụ.
- **Hồi chiêu Chiến kỹ thuộc trục**: ×0,9 phong đơn, ×0,94 Song Phong — áp tại thời điểm tung chiêu (`sectArtSkillDefOf`), nên số hồi chiêu hiện trên panel là số gốc (sau khuyết); hồi chiêu hiệu dụng còn nhân thêm giảm hồi chiêu từ Minh Mẫn của người tung (probe C4 đo: 11,0s → 7,91s hiệu dụng).
- Tông Phong tính lại khi: một pháp ngộ xong, phế pháp, lần nạp đầu sau GĐ334. Đổi định hình/trục → ghi nhật ký tông + thư hệ thống cho Tông chủ. Panel tông có khối 🏳️ Tông Phong: tên phong (hoặc "chưa định hình — X/30 điểm" + trục dẫn đầu), thanh điểm 5 trục, dòng cộng hưởng đang hưởng; tên phong hiện kèm ở đầu panel tông khi đã định hình.

### 13.3 Ngọc Giản Trống — nguồn và kênh đã chọn (§12.6)

- Tạo pháp trừ giản từ túi NGƯỜI TẠO sau khi qua mọi cổng khác (thiếu → báo rõ "Thiếu Ngọc Giản Trống…", không trừ bất cứ thứ gì). Phàm 1 · Linh 1 · Huyền 2 · Địa 3 · Thiên 5.
- **Rơi từ quái**: loài boss-class (`MONSTER_TYPES[kind].minChestGrade`), trùm map hoặc quái hiếm ✦ → 25% rơi 1, đi đường rơi NGOÀI hệ số nerf đồ farm (LOOT_NERF không chạm).
- **Rương ẩn**: mở rương ẩn có 20% (TẠM) thêm 1 Ngọc Giản Trống.
- **Việc Ủy Thác khó**: tiêu chí đã chọn theo code hiện có = việc NPC loại "Truy Lùng Trùm" (offer `special` — thưởng quỹ cao nhất trong 6 việc ngày, không phải việc người chơi treo) → thưởng +1 Ngọc Giản Trống vào **KHO TÔNG** của người hoàn thành (kèm dòng nhật ký tông).
- **Chế tạo**: công thức `rc_ngoc_gian_trong` đặt trong bảng RECIPES của nghề Luyện Khí (cạnh các công thức luyện từ Đá Quý): 3 Đá Quý + 5 Tiên Linh Chi + 200 Linh thạch phí, tỉ lệ thành 90%, yêu cầu cấp nghề 3.
- **Icon**: dùng lại hình cuộn ngọc sẵn có `cuon_ngam_trang.png` (copy thành `sprites/items/ngoc_gian_trong.png`) — không vẽ mới đợt này.

### 13.4 Trận pháp tông chiến — kênh và quy tắc đã chọn (§11.2)

- **Đá Quý bày trận trừ từ KHO TÔNG** (`g.warehouse` — kênh kho có thật của tông, cùng kênh việc Ủy Thác khó thưởng vào); Quỹ trừ 10.000 LT từ quỹ tông như thiết kế. Bày lại = thay thế + tốn lại từ đầu.
- **Vị trí bày**: đứng trong 90px quanh điểm cờ (dùng đúng hằng `MEDITATE_SPOT_RADIUS` — chuẩn "đứng tại cờ" của game) trên đúng map đang tranh, trong pha chuẩn bị, Tông chủ/Phó (hạng ≥ Phó).
- **Vị trí Trận Nhãn**: trên tia từ TÂM MAP qua điểm cờ, cách cờ 320px (nằm trong vành 350 của vùng trận, phía xa cờ nhất — bên muốn phá phải xuyên qua vùng trận); cờ trùng tâm map thì bên công lấy hướng +x, bên thủ −x.
- **Đánh Trận Nhãn**: CHỈ đòn thường qua đường PvP vùng cờ (mở rộng quét mục tiêu như móc đồng hành GĐ327), sát thương qua công thức riêng `damageWarEye` với phòng 0 và KHÔNG áp hệ số riêng của quái (kháng vật lý/hệ của Thạch Khôi Lỗi v.v. không tính vì nhãn dùng khung golem); chiêu thức KHÔNG khóa được Trận Nhãn. Phá nhãn → trận bên đó tắt ngay, thông báo cả hai tông; hết cửa sổ chiến → trận + nhãn tự gỡ sạch (probe E3 xác nhận không còn sót thực thể).
- **Thủ lĩnh +2.000 máu** (trận Thủ Ngự của bên THỦ): cộng vào máu tối đa khi chiến mở, gỡ khi trận tắt/bị phá (máu hiện tại kẹp lại theo trần mới).
- Hiệu ứng 4 trục còn lại (Công Phá +8% công đo thật tỉ lệ 1,08 trên Trận Nhãn; Thủ Ngự −8% sát thương nhận đo thật tỉ lệ ~1,087 qua PvP) — Linh Động +8% tốc/kháng chậm 50%, Tu Hành hồi 0,5% máu/giây trong vùng, Xảo Nghệ cd chiến kỹ ×0,85 trong vùng: nối code qua cùng một cổng `warFormFx`. **ĐÃ ĐO SỐ THẬT ở GĐ338 và ĐO LẠI XÁC NHẬN ở GĐ349 (08/11/2026):** Linh Động — thông báo làm chậm của Thủy Triều Tinh trong vùng trận hiện đúng "làm chậm 20%" (ngoài vùng 40% theo cơ chế quái, kháng đúng một nửa; lượt đo lại GĐ349 bắt lại được mẫu trong vùng, mẫu đối chứng ngoài vùng ở bãi farm tông chiến bắt trượt vì thao tác kéo quái của probe, không phải lỗi hiệu ứng); Tu Hành — hồi 0,5% máu tối đa/giây trong vùng, đo đạt ở cả hai vòng; Xảo Nghệ — hồi chiêu chiến kỹ trong vùng 4.000ms vs ngoài vùng 4.725ms, tỉ lệ 0,847 ≈ ×0,85 (probe `probes/gd349/p349e.cjs`, bản đo lại có bám mục tiêu + chọn quái trâu nhất cho chân ngoài vùng).

## 14. KHUNG PI RIÊNG CHO CHIẾN KỸ (GĐ336 — đã xây + probe xong 07/11/2026)

Đóng ghi chú cấu trúc ở cuối §13.1: từ GĐ336, chuẩn hóa chọn khung theo **thể loại** của pháp — `SECT_ART_PI_BAND` (100/160/240/340/460) chỉ còn áp cho **Tâm pháp**; **Chiến kỹ** dùng bảng riêng `SECT_ART_PI_BAND_CK`. Mọi thứ khác giữ nguyên GĐ334: trọng số PI từng thành phần, biên ±10%, kẹp k [0,65 – 1,40], PI sàn 5, thời điểm áp k (ngộ xong), hồi tố.

### 14.1 Cách hiệu chuẩn (không đoán số)

Script `probes/gd336/calib336.cjs` + `calib336b.cjs` liệt kê **toàn bộ** cách ghép Chiến kỹ hợp lệ theo luật tạo pháp (trọng số ≤ ngân sách cấp + 4 của khuyết điểm, đúng 1 khuyết điểm, trần bậc từng thành phần), tính PI bằng đúng công thức `sectArtPI` của server, rồi đối chiếu 4 mẫu ghép điển hình (dồn Sát · cân bằng vòng tròn · dồn Tầm+Vùng · dồn Sát+Hiệu — mỗi mẫu tiêu ngân sách theo thứ tự ưu tiên, khuyết chọn có lợi nhất cho PI):

| Cấp | Ngân sách | PI min | PI trung vị (mọi cách ghép) | PI các mẫu điển hình | PI max | Khung cũ (chung) | Hệ quả khung cũ lên mẫu điển hình |
|---|---|---|---|---|---|---|---|
| Phàm | 10+4 | 5 | 98 | 125 – 199 | 199 | 100 | k bị nén 0,65 – 0,80 (dồn Sát chạm sàn kẹp 0,65) |
| Linh | 16+4 | 5 | 147 | 220 – 288 | 288 | 160 | k bị nén 0,65 – 0,73 |
| Huyền | 24+4 | 5 | 190 | 317 – 360 | 360 | 240 | k bị nén 0,67 – 0,76 |
| Địa | 34+4 | 5 | 202 | 432 (bão hòa) | 432 | 340 | mẫu trọn vẹn k = 0,79; mẫu ghép thiếu hụt chìm dưới khung xa, kẹp trần nâng 1,40 |
| Thiên | 46+4 | 5 | 202 | 432 (bão hòa) | 432 | 460 | khung **không với tới được** (PI max 432 < 460): mọi pháp Thiên đều bị nâng, mẫu ghép vừa (PI ~290–330) kẹp trần 1,40 |

**Phát hiện cấu trúc**: tổng trọng số thành phần CK tối đa chỉ **37** (Sát 15 + Tầm 8 + Vùng 5 + Hiệu 9) — từ Địa (ngân sách 38) trở đi không gian ghép **bão hòa**: Địa và Thiên có cùng một không gian ghép và cùng PI max 432. Chênh khung Địa → Thiên vì vậy thu hẹp hẳn; chênh lệch thật của Thiên cấp nằm ở chi phí/nguyên liệu/thọ nguyên chứ không còn nằm ở khung PI. Nếu sau này thêm bậc/thành phần cho CK cấp cao thì phải hiệu chuẩn lại mục này.

### 14.2 Khung CK đã chốt (TẠM như mọi số của hệ)

| Cấp | Khung CK | Cách neo |
|---|---|---|
| Phàm | **143** | = PI mẫu cân bằng điển hình (trung vị các mẫu) |
| Linh | **250** | = trung vị PI các mẫu điển hình (220 – 288) |
| Huyền | **350** | = trung vị PI các mẫu điển hình (317 – 360), làm tròn |
| Địa | **400** | = trung vị PI nhóm ghép tiêu gần trọn không gian thành phần (404), làm tròn |
| Thiên | **410** | = neo Địa + bậc cấp tối thiểu (không gian ghép bão hòa như Địa); pháp ghép trọn vẹn (PI 432) vẫn nằm trong biên |

Sau hiệu chuẩn: **mọi mẫu ghép điển hình ở mọi cấp đều cho k trong [0,72 – 1,14]** — không mẫu nào còn kẹp ở hai đầu; 0% cách ghép toàn cục bị kẹp sàn 0,65. Pháp ghép cực yếu (PI vài chục) vẫn chạm trần nâng 1,40 như thiết kế §12.3 vốn định (lệch quá xa thì kẹp là đúng luật, chỉ là giờ trần đó chỉ còn chạm tới khi ghép thật sự hụt, không phải mặc định của cả một thể loại).

### 14.3 Áp dụng + hồi tố + Tông Phong

- `sectArtBandOf(a)`: `kind === 'chienky'` → `SECT_ART_PI_BAND_CK`, còn lại → `SECT_ART_PI_BAND`. Dùng ở `sectArtKOf` (tính k khi ngộ xong + hồi tố) và ở payload panel (`band` — client chỉ hiển thị số server gửi, không có số cứng phía client, đã rà).
- **Hồi tố**: cờ một lần `_gd336init` trong `ensureSectV2` — Chiến kỹ đã ngộ được tính lại k theo khung CK ở lần nạp tông đầu tiên sau cập nhật; **Tâm pháp không tính lại** (giữ nguyên k); sau đó `recomputeSectPhong(g, true)` để điểm trục (Σ bậc × k) khớp k mới.
- **Probe p336: PASS 11/11** (`probes/gd336/p336.cjs`, cổng 3590): hồi tố CK Thiên k 1,40 → 1,29 (band 410) · CK Linh k 0,65 → 0,87 (band 250) · TP Địa giữ nguyên 0,82 (band 340) · phong hồi tố khớp k mới (Công Phá 17,1 · tổng 29,5); tạo mới: CK Thiên {Sát 5, Vùng 1, Tầm 2} khuyết Hồi Chiêu — PI 319, k 1,29 (trước kẹp 1,40), hệ số 3,61 · CK Thiên {Sát 5, Vùng 1, Hiệu 3} — PI 360, k 1,14, hệ số 3,19, **sát thương cast thật 351 = 3,19 × đòn cơ bản 110** · CK Phàm cực mạnh PI 199 — k 0,72 theo công thức (trước kẹp sàn 0,65), hệ số 1,15 · CK Phàm rất yếu PI 29 — vẫn nâng k 1,40, hệ số 0,84 (đúng luật) · TP Phàm PI 110 — k 1, band 100 (hồi quy, khung tâm pháp không đổi) · Tông Phong tông tạo mới theo k mới: Công Phá 21,5 · tổng 35,8, định hình.
