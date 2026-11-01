# Nội dung cần làm cho PHẢN HƯ (GĐ204) — bản ghi 30/10/2026

Mọi con số dưới đây đều là **TẠM** (tiếp thang số hiện có), Bảo test cảm giác rồi chỉnh.

## Đã có sẵn khung (không phải làm lại)
- Thang bước: Phản Hư = bước 55–63 (globalStep), công thức Tu Vi cần `×1.12/bước` tự chạy tiếp — lên PH không kẹt Tu Vi.
- Ô chiêu PH đang tạm 7 ô; trần chỉ số theo cảnh 15; gear `canEquip` đã tính PH = bậc 6 (mặc được đồ bậc Hóa Thần).
- Hiện trạng: Hóa Thần tầng 9 bấm đột phá → `blocked_ph` "Cảnh giới Phản Hư chưa mở". Đây là chỗ mở khóa.

## Giai đoạn 1 — Mở cảnh giới (xương sống, làm trước)
1. **Đột phá HT9 → PH1**: loại đột phá mới `phanhu`, thử thách **Hư Không Kiếp Ảnh** (boss HP ×14 — tiếp thang Đại ×6 / Kim Đan ×8 / Nguyên Anh ×10 / Hóa Thần ×12; có phân thân như kiếp Hóa Thần; đòn boss ×2.8 TẠM).
   - Điểm tự do **+24** (thang 12 → 15 → 18 → 21 → 24), thọ **+250 năm** (thang 50 → 100 → 150 → 200 → 250).
   - Đan: đề xuất **không cần đan** như Hóa Thần (đỡ phải chế đan mới); nếu muốn có đan "Phản Hư Đan" thì thêm ở giai đoạn 3.
   - Tỉ lệ theo khung đột phá Đại hiện có (cơ số + Hộ Mạch + Phúc Duyên + fail streak).
2. **Tiểu / Trung cảnh trong PH**: tiểu +8 điểm/tầng; trung cảnh ở tầng 3→4 và 6→7: +10 điểm, +50 năm thọ, vẫn dùng Đan Trung Cảnh + thắng Thử Luyện Thú (thêm bước đích 58/61 vào danh sách trung cảnh, bảng điểm/thọ thêm bậc `ph`).
3. Bỏ `blocked_ph`; thẻ nhân vật hiện lại Tu Vi cần cho bậc PH; PH9 = đỉnh hiện tại ("Phản Hư viên mãn — cảnh giới cao nhất hiện nay").

## Giai đoạn 2 — Củng cố Pháp Tướng → mở đường CHÂN THÂN BÁN THẦN (Bảo chốt hướng 30/10 23:13, chi tiết 23:20)
Định danh của Phản Hư (Bảo chốt): **cảnh giới củng cố Pháp Tướng, mở ra một con đường mạnh hơn — "Chân Thân Bán Thần"**. Không làm tier chiêu riêng; sức mạnh PH chảy qua Pháp Tướng.
- **Củng cố**: lên PH, Pháp Tướng ổn định hơn — phí duy trì hiện hình giảm một nửa (0.5% máu / 0.8% chân nguyên mỗi giây → 0.25% / 0.4%, TẠM).
- **4 giai đoạn Chân Thân** (nối sau 5 giai đoạn cũ, hệ số do Bảo chốt): **6 Tọa Hồn ×3.5 · 7 Sơ Ảnh ×4.1 · 8 Diệt Thân ×4.9 · 9 Chân Ảnh ×5.5**. Cách lên từng giai đoạn là một HÀNH ĐỘNG đúng nghĩa của nó (Bảo chốt "dễ hơn" — không cày số thuần túy):
  - **Tọa Hồn**: tự tu dưỡng thần cách của bản thân, tạo ra 1 linh hồn cho Pháp Tướng. *Cơ chế đề xuất*: thiền/bế quan tại Đạo Quán TRONG LÚC HIỆN HÌNH, tích "hồn lực" (mốc TẠM ≈ 500 giây thiền hiện hình) → Pháp Tướng có hồn (`pt.soul`).
  - **Sơ Ảnh**: cố gắng nặn nên hình dạng của Chân Thân Bán Thần. *Cơ chế đề xuất*: tế luyện Linh thạch Thượng + phần Tu Vi chia sẻ của Pháp Tướng dồn vào "nặn hình" đạt mốc TẠM → có hình sơ bộ (`pt.shape`).
  - **Diệt Thân**: phá bỏ đi Pháp Tướng cũ. *Cơ chế đề xuất*: Ảo Cảnh đặc biệt — đấu với CHÍNH Pháp Tướng cũ của mình (boss = bản sao sức mạnh giai đoạn 5 ×1.2 TẠM, nhẹ hơn ải giai đoạn thường), thắng = thân cũ tan.
  - **Chân Ảnh**: đưa linh hồn ở Tọa Hồn vào Sơ Ảnh để hoàn thiện Chân Thân Bán Thần. *Cơ chế đề xuất*: nghi lễ Hợp Nhất tại sân Đạo Quán khi đang hiện hình (đã có hồn + hình + đã diệt thân) → hoàn thiện ×5.5 và **sinh Thần Thuật**.
  - Lưu ý tên: giai đoạn 2 cũ tên "Chân Thân" (×1.3) — trùng từ với đường "Chân Thân Bán Thần"; giữ nguyên vẫn hiểu được, đổi tên hiển thị giai đoạn 2 là việc nhỏ nếu Bảo muốn.
- **THẦN THUẬT** (Bảo chốt: khái niệm MỚI, không phải thêm nhiều skill): khi hoàn thiện Chân Ảnh, mỗi người sinh **1 Thần Thuật riêng** từ hồ sơ chỉ số của chính mình. *Cách chọn (Bảo giao tớ chọn)*: theo **chỉ số chủ đạo + chỉ số phụ** — chỉ số cao nhất quyết định bản chất thuật, chỉ số cao nhì thêm tính chất phụ; nếu 2 chỉ số cao nhất ngang nhau (chênh ≤10%) thì là trường hợp "song chủ/trung bình" — thuật dung hợp cả hai, hệ số thấp hơn một chút. Họ thuật theo chủ đạo (đề xuất): Vật Công → phá xuyên giáp; Pháp Công → nổ diện rộng theo hệ linh căn; Khí Huyết → hồi phục + hộ thuẫn máu; Vật Phòng → hộ thể + phản chấn; Pháp Phòng → kết giới + đẩy lùi; Tốc Độ → lướt + làm chậm diện rộng; Minh Mẫn → bùng chân nguyên + giảm hồi chiêu. Thần Thuật chỉ dùng khi hiện hình Chân Ảnh, phí lớn + hồi chiêu dài (TẠM 120s), cố định theo người (đổi điểm sau này không đổi thuật — nó là "thần cách" của riêng họ).
- Tên con đường là cầu nối sang cảnh giới sau (xem Lộ trình): Độ Kiếp giai đoạn 1 cũng tên "Bán Thần" — người đi hết đường Chân Thân ở PH sẽ vào Độ Kiếp với nền Bán Thần đã sẵn.

## Lộ trình cảnh giới SAU Phản Hư (Bảo chốt 30/10 23:13 — ghi trước, chưa làm)
- **Độ Kiếp** — cảnh giới gồm **3 giai đoạn**: Bán Thần → Độ Kiếp → Chứng Thần (khác khung 9 tầng thường; chi tiết cơ chế để đợt làm Độ Kiếp mới thiết kế).
- **Địa Tiên** — cảnh giới chính sau Độ Kiếp.
- ⚠️ Lưu ý tên: thang Tiên phụ (GĐ146) cũng có một bậc tên "Địa Tiên" (bậc 2/5 của đường Tiên) — khi làm tới nơi cần chốt lại tên để tránh trùng (hoặc coi là cố ý hội tụ).

## Giai đoạn 3 — Thế giới cho người Phản Hư
**Cập nhật sau GĐ207 (30/10):** GĐ207 đã thêm 66 map NA/HT (mỗi cảnh 33: farm/thành trì/làng/thành phố/thành phố nghề/đặc biệt) và đưa tổng map lên 140, quái lên 2.140 — nên phần "chưa có map HT" dưới đây đã cũ.
**Cập nhật GĐ206 (31/10):** Bảo yêu cầu rà toàn bộ nhánh Thần Thuật theo 7 chỉ số cơ bản → genDivineArt thành hệ 5 nhánh (Toàn Năng / Tam Chủ / Song Chủ / Thuần Chủ / Đơn Chủ) + tính phụ riêng cho từng chỉ số, tổng 302 cấu hình, sinh bằng luật tổ hợp parts. Probe p205 ALL PASS 12/12. Chi tiết trong MEMORY.md mục GĐ204+GĐ205.
**Cập nhật GĐ204+GĐ205 (31/10) — ĐÃ LÀM XONG Giai đoạn 1 + 2:** đột phá `phanhu` (Hư Không Kiếp Ảnh ×14/chiêu ×2.8/phân thân, +24 điểm/+250 thọ, tiểu +8, trung đích 58/61 +10/+50, PH9 = blocked_max), củng cố Pháp Tướng (drain giảm nửa ở PH), và trọn đường Chân Thân Bán Thần (Tọa Hồn hồn lực 500 → Sơ Ảnh tu dưỡng 3.000.000 → Diệt Thân Ảo Cảnh riêng ×1,2 → Hợp Nhất sinh Thần Thuật theo chủ đạo + phụ/song chủ). Probe p203 23/23 + p204 26/26. Giai đoạn 3 giờ chỉ còn: band gear `ph`, quest bậc PH (map đã xong ở GĐ208).
4. ~~**Map bậc PH**~~ — ĐÃ LÀM ở GĐ208 (30 map, xem trên). Phí dịch chuyển map bậc PH: **2500** linh thạch (thang 0/50/150/400/900/1600 → 2500) — đã nối.
5. **Trang bị bậc Phản Hư**: thêm band `ph` ×2.5 (hai band cũ: NA ×1.6, HT ×2.0), rà lại các điểm đóng dấu band theo bài học ngưỡng cứng (điều kiện theo bậc PH = 6 trên thang hiện tại).
6. **Nhiệm vụ bậc PH**: quest bảng + thành phố dùng quái map PH; có thể thêm 1 chuỗi ẩn riêng cho PH ở giai đoạn sau.

## Giai đoạn 4 — Hoàn thiện
7. Thành tựu PH (đột phá Phản Hư, Pháp Tướng Hư Vô...) — khung progressFor có sẵn, thêm def + case.
8. Kiểm tra các hệ phụ: Tiên/Ma (thang phụ độc lập, không chặn), bảng xếp hạng Tu Vi (tự tính theo REALM_ORDER — PH tự lên đầu), xuất khiếu/thú cưỡi (cổng NA+ nên PH dùng bình thường).
9. Cân bằng cuối: boss map PH và Kiếp Ảnh PH phải đo bằng probe với nhân vật HT9 thật (không để PH thành "lên cho có").

## Thứ tự đề xuất
GĐ204 = Giai đoạn 1 (mở cảnh giới) + củng cố Pháp Tướng (giảm phí duy trì) → GĐ205 = đường Chân Thân (4 giai đoạn Tọa Hồn → Chân Ảnh + Thần Thuật) → GĐ206 = Giai đoạn 3 (map + gear + quest) → Giai đoạn 4 rải vào các đợt trên. (Hư Không Hành — lướt xuyên không gian — là ý phụ tớ từng đề xuất, Bảo chưa chốt, không nằm trong kế hoạch chính.)


**Cập nhật 31/10 (GĐ214–216): PHẢN HƯ TRỌN GÓI** — band gear 'ph' ×2,5, quest thành phố + bảng bậc PH (kiêm lấp quest cho 30 thành NA/HT/PH của GĐ207/208), thành tựu PH (cảnh giới bậc 6, Pháp Tướng, map PH, Thần Thuật ẩn). Probe p210 ALL PASS 16/16. Việc lớn còn lại của thang: Độ Kiếp (3 giai đoạn Bán Thần → Độ Kiếp → Chứng Thần) + Địa Tiên.
