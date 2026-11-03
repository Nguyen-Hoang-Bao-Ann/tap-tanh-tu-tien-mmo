# THIẾT KẾ CỔ NGỮ — Hệ chữ cổ của Tập Tành Tu Tiên

_Bảo chốt hướng 02/11/2026: chữ Việt cổ Khoa Đẩu × nguyên lý ghép chữ Nôm. Tài liệu này là chuẩn chính thức; mọi văn khắc trong game vẽ theo đây._

## 1. Nguồn cảm hứng & nguyên tắc

- **Chữ Việt cổ Khoa Đẩu** (thời Hùng Vương): nét **đầu to đuôi nhỏ như con nòng nọc**, uốn lượn tự do như giun dế/lửa bốc; bộ chữ **không có dấu**.
- **Chữ Nôm**: chữ mới sinh bằng cách **ghép các chữ có sẵn** — một phần mang nghĩa, một phần mang tiếng đọc.
- Cổ Ngữ là chữ **khắc** (bia đá, cổng, phù, ấn) — không thay lời thoại NPC. Người chơi giải mã bằng cách nhìn THÀNH PHẦN của chữ (manh mối ẩn kiểu quan sát, đúng triết lý game).

## 2. Luật nét vẽ (bất biến)

1. Mọi nét là **nét nòng nọc**: đầu nét phình tròn, thân uốn cong, đuôi vuốt nhọn.
2. **Không** khung vuông, **không** nét thẳng cứng, **không** dấu thanh/dấu mũ.
3. Mỗi chữ nằm trong ô tưởng tượng 100×100; nét dày chuẩn 7.5.
4. Dữ liệu chuẩn duy nhất: `asset-src/muse-gen/congu_chars.json` (trường `chars` = chữ gốc, `compounds` = chữ ghép). Vẽ bằng `shottools/congu_render3.py` (hàm `tile_char`). **Không** sinh chữ bằng AI hình ảnh (mỗi lần sinh một bộ khác nhau = mất hệ thống).

## 3. Bảng chữ gốc — 34 chữ

| Nhóm | Chữ |
|---|---|
| Trời đất | THIÊN · ĐỊA · NHẬT · NGUYỆT · TINH · VÂN · QUANG · ÂM |
| Thời tiết / ngũ hành | LÔI · PHONG · HỎA · THỦY · SƠN · THẠCH · MỘC · KIM · HẢI |
| Tu luyện | LINH · HỒN · TÂM · ĐẠO · PHÁP · TU · TIÊN · THẦN · MA · LONG |
| Sự vật / khái niệm | KIẾM · ĐAN · TRẬN · ẤN · KIẾP · MÔN · HUYẾT |

Mỗi chữ là một **tượng** vẽ bằng nét cong: THIÊN = vòm trời trên sóng đất; SƠN = dãy núi liền; HẢI = đầu sóng cuộn; TIÊN = người áo bay; TU = người tọa thiền; MÔN = hai cột cổng + vòng cửa; LONG = rồng uốn...

## 4. Sinh chữ mới — 3 quy tắc

1. **Ghép nghĩa** (2 gốc → 1 chữ trong cùng ô): MINH = NHẬT+NGUYỆT (sáng); MƯA = VÂN+hạt mưa; SÉT = KIẾP+xoáy LÔI; GIANG = THỦY+ĐẠO (sông); BĂNG = THỦY+TINH; TUYẾT = VÂN+THỦY rơi; BÃO = LÔI+PHONG. Đã chuẩn hóa 7 chữ ghép trong dữ liệu.
2. **Ghép cụm** (2–4 chữ → từ/câu khắc): LÔI KIẾP (đài kiếp), THIÊN ĐẠO, PHONG ẤN (bia phong ấn), TIÊN MÔN (cổng trời), LINH ĐAN...
3. **Mượn âm kiểu Nôm** (khi cần tên riêng/từ lạ): chữ = [gốc mang NGHĨA] + [gốc có TIẾNG ĐỌC gần]. Tiếng đọc của chữ gốc chính là tên của nó (thiên/địa/lôi...). Dùng cho tên boss, địa danh, nhân vật cổ.

Khi game cần chữ mới: vẽ thêm vào `congu_chars.json` theo đúng 3 quy tắc + luật nét; bảng gốc không sửa.

## 5. Ứng dụng đã định

| Nơi | Văn khắc |
|---|---|
| Đài Kiếp (landmark `dai`) | cột dọc **LÔI KIẾP** |
| Cổng Trời / Tiên Môn (`cong`) | biển ngang **TIÊN MÔN** |
| Bia Cổ (`bia`) | **PHONG ẤN** + 1 chữ thay đổi theo map (chữ "chủ" của vùng) |
| Đài Sen (`sen`) | **LINH** ở tâm đài |
| Tượng (`tuong`) | chữ của loài/vùng (vd LONG, SƠN) |
| Bí cảnh / manh mối ẩn | câu khắc 3–4 chữ làm gợi ý (vd cạnh hang: **HUYẾT NGUYỆT** = đêm trăng máu) |

Màu khắc chuẩn: tím sáng (như bảng chữ) trên đá tối; nơi linh thiêng dùng vàng ấm.
