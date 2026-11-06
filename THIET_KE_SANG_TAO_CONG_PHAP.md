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
| Tốc | +1% tốc độ | 2 | +4% | effStatsOf |
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
