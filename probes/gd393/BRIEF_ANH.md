# Brief chụp ảnh trong game — GĐ393 (6 đường vũ khí mới)

Dùng sau khi probe socket GĐ393 đạt. Subagent không dùng được live browser nên parent cử browser task.

## Server + nhân vật
- Boot local từ `~/workspace/tap-tanh-tu-tien-mmo/` đúng kiểu probe: `PORT=<port mới> TTT_STORAGE=file TTT_CHAR_FILE=probes/gd393/characters.json TTT_ACC_FILE=probes/gd393/accounts.json TTT_WORLD_FILE=probes/gd393/world.json TTT_SESS_FILE=probes/gd393/sessions.json node server/index.js` (port mới + token mới mỗi lần theo lệ probe; KHÔNG dùng port 3931 nếu probe khác đang chạy).
- Nhân vật fixture (đã có trong `probes/gd393/characters.json`):
  - Gốc: token `gd393main1`–`gd393main6` — An393 (phapan) · Luan393 (phatluan) · Kiem393 (phikiem) · Linh393 (quylinh) · Doc393 (dockinh) · Van393 (vankiem). Đứng rải ở bãi farm map `lang_tan_thu` (spawn 2415,1400 / 2800,1500 / 2100,1600 / 2600,1200 / 3000,1300 / 1900,1400).
  - Viên Mãn: token `gd393vm01`–`gd393vm06` — VmAn393 … VmVan393 (realm na, `anState.vienman: true`, cầm `<đường>_vm`).
- Lệ chụp (AGENTS.md): giữ phiên NODE đang kết nối (nhân vật đứng yên tại chỗ) trong lúc mở browser cùng token — browser tiếp quản phiên, vị trí giữ nguyên. Kiểm vị trí sống theo id phiên (welcome.id), KHÔNG theo tên. Nhân vật ngắt kết nối là diễn viên offline dời chỗ + autosave 15s ghi đè vị trí.

## Danh sách ảnh (12 tấm: 6 đường × gốc + VM)
1. `gd393_phapan_v1.png` — An393 cầm Pháp Ấn (ấn chú, tay giơ ấn)
2. `gd393_phapan_vm_v1.png` — VmAn393 cầm Thiên La Pháp Ấn
3. `gd393_phatluan_v1.png` — Luan393 cầm Phật Luân (luân xoay)
4. `gd393_phatluan_vm_v1.png` — VmLuan393 cầm Phật Quang Pháp Luân
5. `gd393_phikiem_v1.png` — Kiem393 cầm Phi Kiếm (ngự kiếm)
6. `gd393_phikiem_vm_v1.png` — VmKiem393 cầm Ngự Hư Phi Kiếm
7. `gd393_quylinh_v1.png` — Linh393 cầm Chiêu Hồn Linh (chuông)
8. `gd393_quylinh_vm_v1.png` — VmLinh393 cầm Cửu U Chiêu Hồn Linh
9. `gd393_dockinh_v1.png` — Doc393 cầm Độc Kinh (kinh thư độc)
10. `gd393_dockinh_vm_v1.png` — VmDoc393 cầm Vạn Độc Thiên Kinh
11. `gd393_vankiem_v1.png` — Van393 cầm Văn Kiếm (kiếm quân tử)
12. `gd393_vankiem_vm_v1.png` — VmVan393 cầm Thánh Hiền Văn Kiếm

## Yêu cầu ảnh
- Chụp trong game đúng tỉ lệ thật, nhân vật ở giữa khung, thấy rõ vũ khí trên tay (đặc biệt kiểm: Pháp Ấn/Phật Luân/Chiêu Hồn Linh là họ cầm mới `raise` — ấn/luân/chuông phải hiện đúng tay, không rơi về tư thế mặc định).
- Mỗi file tên mới riêng từng bản (Bảo cache theo tên file — không ghi đè tên cũ).
- Nếu browser task không dựng được VM (chưa tiến hoá trong phiên đó) thì chụp 6 tấm gốc trước, ghi rõ 6 tấm VM chưa chụp được.
