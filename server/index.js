// ============================================================
// Tập Tành Tu Tiên — Backend (Node.js + Express + Socket.io)
//
// GIAI ĐOẠN 2 — ĐIỀU KHIỂN THẬT (server là chuẩn):
// - Server Express lắng nghe ở cổng 3001.
// - Khi có client kết nối: tạo 1 "player" với ID ngẫu nhiên và
//   tọa độ X/Y ngẫu nhiên trong sân 800×600.
// - Client gửi sự kiện 'client_input' {vx, vy} (mỗi thành phần
//   trong [-1, 1]) mỗi khi hướng bấm thay đổi; server lưu lại
//   vector đó cho đúng player của socket ấy.
// - setInterval 10 tick/giây: server tự cập nhật tọa độ của từng
//   player theo vector input (x += vx * SPEED * 0.1), kẹp không
//   cho ra khỏi sân, rồi emit 'server_tick' chứa danh sách TẤT CẢ
//   người chơi [{id, x, y}] cho mọi client.
//   → Client không tự quyết vị trí; mọi tab đều thấy cùng 1 thế
//     giới do server giữ — nền của mô hình chịu tải nhiều người.
//
// Riêng bot demo (DEMO_BOTS): không có input nên vẫn tự trôi nhẹ
// như giai đoạn 1 để thế giới không trống; phía client đã làm mờ
// chúng, chỉ nổi bật người chơi thật.
// ============================================================

const express = require('express');
const http = require('http');
const path = require('path');
const fs = require('fs');
const { Server } = require('socket.io');
const storage = require('./storage'); // lưu trữ cloud tuỳ chọn (MONGODB_URI) — xem storage.js

const PORT = process.env.PORT || 3001; // env để chạy thêm instance test song song
const WORLD_W = 3400; // GĐ126: mở rộng phía đông 600px (làng nuốt sân tông + vành đai farm rộng + dải rừng ngăn + vùng bí cảnh dời đông); camera client bám theo nhân vật
const WORLD_H = 1200;
const TICK_MS = 100; // 10 tick/giây
const DEMO_BOTS = 8;
const SPEED = 260; // tốc độ di chuyển của người chơi thật: px/giây
// GĐ46: NÉ (dash) — người chơi hỏi "cái né đâu" (bản chơi đơn Space = Né).
// Số TẠM (file thiết kế không quy định Né cho MMO): vọt ~99px trong
// 190ms (520px/s), hồi chiêu 2,5s. Server giữ luật + chống spam.
const DODGE_SPEED = 520;
const DODGE_MS = 190;
const DODGE_CD_MS = 2500;
const MARGIN = 16; // giữ tâm ô vuông cách biên sân tối thiểu bấy nhiêu px

// ---- Combat + Quái vật (Giai đoạn 4 → 6: số liệu theo file thiết kế) ----
const ATTACK_RANGE = 50; // tầm đánh: quái cách người chơi < 50px mới trúng
const BASIC_COEF = 0.85; // hệ số đánh thường (bản chơi đơn đã chốt)
const ATTACK_COOLDOWN_MS = 350; // hồi chiêu gốc của đánh thường (được giảm theo CDR)
const MONSTER_COUNT = 5; // số Sói duy trì trên bản đồ
const MONSTER_AGGRO_RANGE = 260; // quái phát hiện & đuổi theo người chơi trong bán kính này
const MONSTER_CHASE_SPEED = 120; // px/giây khi đuổi
const MONSTER_WANDER_SPEED = 42; // px/giây khi lang thang
const MONSTER_RESPAWN_MS = 5000; // hồi sinh quái mới sau khi bị hạ (giữ bản đồ luôn có quái)
// Sói Xám theo bảng quái của file thiết kế: HP 40, dame 5 (cắn = vật lý), Vật phòng 0
const WOLF = { hp: 40, atk: 5, def: 0, atkRange: 42, atkCooldownMs: 1000, name: 'Sói Xám' };
// GĐ38: BÃI FARM ĐA LOÀI — chỉ số đúng bảng quái của file: Sói Xám 40/5,
// Dơi Đen 20/4, Thạch Quái 140/10. Tu vi theo hạng của file: Yếu 3, Mạnh 8
// (dơi yếu như sói). Phòng thủ Thạch Quái 8 (bản chơi đơn đã dùng; file
// không ghi phòng thủ quái). Tốc độ: dơi bay nhanh, thạch quái chậm chạp.
const MONSTER_TYPES = {
  wolf: { name: 'Sói Xám', hp: 40, atk: 5, def: 0, tuVi: 3, count: 5, chaseSpeed: 120, wanderSpeed: 42, atkRange: 42, atkCdMs: 1000, chestTier: 'yeu', realm: 'lk', stage: 'so' },
  bat: { name: 'Dơi Đen', hp: 20, atk: 4, def: 0, tuVi: 4, count: 4, chaseSpeed: 175, wanderSpeed: 62, atkRange: 42, atkCdMs: 900, chestTier: 'trung', realm: 'lk', stage: 'so' },
  golem: { name: 'Thạch Quái', hp: 140, atk: 10, def: 8, tuVi: 8, count: 3, chaseSpeed: 55, wanderSpeed: 20, atkRange: 46, atkCdMs: 1400, chestTier: 'manh', realm: 'lk', stage: 'so' },
  // GĐ57 — BÍ CẢNH THẠCH LÂM: số HP/ATK/Tu vi lấy từ dữ liệu GDD của
  // người chơi (MonsterData: quái bậc Trúc Cơ); def/tốc độ là số TẠM vì
  // dữ liệu không ghi. Chỉ sống trong vùng bí cảnh (area).
  kiemma: { name: 'Kiếm Ma', hp: 420, atk: 26, def: 3, tuVi: 22, count: 4, chaseSpeed: 132, wanderSpeed: 40, atkRange: 44, atkCdMs: 1100, chestTier: 'manh', area: 'realm', respawnMs: 30000, realm: 'tc', stage: 'trung' },
  huyetlang: { name: 'Huyết Lang', hp: 350, atk: 30, def: 0, tuVi: 22, count: 4, chaseSpeed: 168, wanderSpeed: 55, atkRange: 42, atkCdMs: 950, chestTier: 'manh', area: 'realm', respawnMs: 30000, realm: 'tc', stage: 'trung' },
  khoiloi: { name: 'Thạch Khôi Lỗi', hp: 700, atk: 22, def: 8, tuVi: 33, count: 1, chaseSpeed: 62, wanderSpeed: 16, atkRange: 48, atkCdMs: 1400, chestTier: 'manh', area: 'realmBoss', respawnMs: 600000, minChestGrade: 'B', realm: 'tc', stage: 'trung' },
};

// ================= GĐ59: HỆ THỐNG NHIỀU BẢN ĐỒ — 52 map theo file GDD =================
// Người chơi chốt 23/10: "làm tất cả các map còn lại trong file thiết kế".
// Nguồn SỰ THẬT: server/data/gdd/MapData.json (52 map: tên, loại, cổng cảnh
// giới minRealm/minTier, an toàn hay không, nối về đâu) + MonsterData.json
// (21 quái: HP/ATK/Tu vi + danh sách map chúng sống). Đồ thị nối theo file:
// mọi map đều nối về THANH VÂN THÀNH (cổng Luyện Khí tầng 1); thành nối về
// Làng Tân Thủ + mọi nơi; các map khác chỉ nối về thành. Di chuyển bằng
// TRẬN DỊCH CHUYỂN ở mỗi map (tại làng đặt ở (1080,600), mép đông quảng
// trường) → mở danh sách đích, đích chưa đủ cảnh giới hiện khóa kèm điều kiện.
// Map "nhà" lang_tan_thu = thế giới hiện tại 2800×1200 (làng + bãi farm +
// bí cảnh Thạch Lâm của GĐ57 — giữ nguyên, Thạch Lâm KHÔNG tách map riêng,
// cổng tông môn cũ vẫn chạy; mục thach_lam trong danh sách dịch chuyển là
// lối tắt tới cổng đó, vẫn bắt buộc đệ tử tông môn như GĐ57).
// Mỗi map mới là một KHÔNG GIAN RIÊNG (kích thước theo loại — số TẠM):
// thành 1600×1200, đất nghề 1400×1050, farm/ngũ hành 1800×1350. Đồng bộ
// theo phòng map: socket chỉ nhận entity của map mình đang đứng. Trang trí
// + vật cản của map mới sinh bằng RNG có hạt giống theo id map (server giữ
// vật cản để tính va chạm; client nhận decor qua map_enter để vẽ nền theo
// theme). Số TẠM đã công bố: def/tốc độ/hồi sinh của quái GDD (file chỉ ghi
// HP/ATK/Tu vi), số lượng quái mỗi map (thường 5, tinh anh 1, trùm 1),
// 4 map file không gán quái (bang_phong_coc, hoa_diem_son, van_thu_son_mach,
// tham_hai_bi_canh) được gán quái TẠM theo tông/cảnh giới ở cuối bảng dưới.
const HOME_MAP = 'lang_tan_thu';
const MAP_DEFS = new Map();
try {
  const rawMaps = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'gdd', 'MapData.json'), 'utf8')).maps || [];
  for (const m of rawMaps) MAP_DEFS.set(m.id, m);
  console.log(`[bản đồ] Đã nạp ${MAP_DEFS.size} bản đồ từ MapData.json`);
} catch (e) { console.warn('[bản đồ] Không đọc được MapData.json:', e.message); }
const REALM_ORDER = { pham: 0, lk: 1, tc: 2, kd: 3, na: 4, ht: 5 };
const REALM_NAMES = { pham: 'Phàm nhân', lk: 'Luyện Khí', tc: 'Trúc Cơ', kd: 'Kim Đan', na: 'Nguyên Anh', ht: 'Hóa Thần' };
const MAP_SIZE_BY_CAT = { city: [4800, 3600], profession: [2200, 1650], farm: [3800, 2850], elemental: [4000, 3000], current: [WORLD_W, WORLD_H] }; // GĐ60: map SIÊU TO theo yêu cầu khám phá (số TẠM); GĐ110: city nhân 2 mỗi chiều (diện tích gấp 4) cho thưa bớt, đỡ lag — cổng/khu dân/dãy nhà/đàn/điểm đều tính theo cổng + kích thước nên tự giãn theo
function mapDims(mapId) {
  if (!mapId || mapId === HOME_MAP) return { w: WORLD_W, h: WORLD_H };
  const def = MAP_DEFS.get(mapId);
  const s = (def && MAP_SIZE_BY_CAT[def.category]) || [1600, 1200];
  return { w: s[0], h: s[1] };
}
function mapOf(a) { return (a && a.mapId) || HOME_MAP; }
function gateTextOf(def) { return `Cần ${REALM_NAMES[def.minRealm] || def.minRealm}${def.minTier ? ` tầng ${def.minTier}` : ''}`; }
function canEnterGate(p, def) {
  const mine = REALM_ORDER[p.realm || 'pham'] ?? 0;
  const need = REALM_ORDER[def.minRealm || 'pham'] ?? 0;
  if (mine !== need) return mine > need;
  return (p.tier || 0) >= (def.minTier || 0);
}
// Theme nền theo từng map (client vẽ theo theme này; decor quyết vật cản)
const THEME_BY_ID = {
  thanh_van_thanh: 'city', vong_nguyet_lau: 'city', hac_phong_trai: 'city', tang_kinh_cac: 'city',
  van_uyen: 'script', // GĐ105: Văn Uyển — theme thư phòng (bàn sách/đình/trụ)
  phong_van_tong: 'city', thien_co_thanh: 'city', long_mach_co_thanh: 'city', thien_ngoai_phuong: 'city',
  ma_vuc_thanh: 'city', tien_gioi_cac: 'city',
  // GĐ79: 20 thành phố mới — cùng theme city
  thanh_ha_thanh: 'city', bach_lo_thanh: 'city', tu_truc_thanh: 'city', hoang_sa_thanh: 'city',
  bich_ba_thanh: 'city', van_an_thanh: 'city', xich_thuy_thanh: 'city', co_moc_thanh: 'city',
  suong_nguyet_thanh: 'city', long_ngam_thanh: 'city', phuong_minh_thanh: 'city', huyen_vu_thanh: 'city',
  bach_ho_thanh: 'city', chu_tuoc_thanh: 'city', thanh_long_thanh: 'city', ky_lan_thanh: 'city',
  tinh_ha_thanh: 'city', nguyet_hoa_thanh: 'city', cuu_tieu_thanh: 'city', vo_cuc_thanh: 'city',
  duoc_coc: 'garden', luyen_dan_phong: 'garden', dan_thap: 'garden',
  van_thu_son: 'beast', linh_thu_vien: 'beast', ngu_thu_son_trang: 'beast',
  ky_mon_dong: 'array', tran_phap_cac: 'array', bat_quai_tran_do: 'array',
  linh_phu_dien: 'script', chu_van_duong: 'script', but_mac_hien: 'script',
  hoa_lo_coc: 'forge', thiet_coc: 'forge', kiem_lo_son_trang: 'forge',
  bang_phong_coc: 'ice', hoa_diem_son: 'lava', hac_phong_sa_mac: 'desert', huyet_sac_rung: 'blood_forest',
  tu_vong_mo_dia: 'graveyard', cuu_u_bi_canh: 'graveyard', van_thu_son_mach: 'mountain', loi_dinh_son_coc: 'storm',
  hac_am_dam_lay: 'swamp', co_chien_truong: 'battlefield', vo_tan_hu_khong: 'void',
  kim_quang_dong: 'metal', kiem_trung: 'swords', thien_cuong_kim_son: 'metal',
  thanh_moc_lam: 'deep_forest', u_minh_quy_lam: 'ghost_forest', co_thu_yeu_gioi: 'deep_forest',
  thanh_tuyen_khe: 'stream', han_bang_nguyen: 'ice_plain', tham_hai_bi_canh: 'deep_sea',
  hoa_diem_dong: 'lava', hoa_son_khau: 'lava', dia_nguc_hoa_hai: 'lava',
  hoang_tho_coc: 'badland', thai_co_sa_mac: 'desert',
};
// [loại decor, trọng số, bán kính va chạm (0 = chỉ để ngắm)]
// GĐ91: mọi loại CÂY đều đi xuyên được (người/NPC/quái qua được, tán
// che khuất theo chiều sâu phía client) — chỉ đất đá/núi/hang/nhà còn
// chặn đường. Đổi bán kính cây về 0 làm bố cục decor các map xáo lại
// 1 lần (cùng seed, ổn định sau đó).
const THEME_DECOR = {
  // GĐ68: thêm kind mới (nhà/núi/hang/nước/cỏ/hoa + cây mới) — mỗi theme tổng
  // trọng số vẫn = 1.00; bán kính va chạm 0 = chỉ để ngắm, không cản đường.
  city: [['tree', 0.25, 0], ['lamp', 0.20, 0], ['stone', 0.15, 14], ['banner', 0.20, 0], ['house', 0.15, 22], ['flower', 0.05, 0]],
  garden: [['tree', 0.30, 0], ['herb', 0.25, 0], ['furnace', 0.15, 18], ['stone', 0.10, 14], ['flower', 0.15, 0], ['grass', 0.05, 0]],
  beast: [['tree', 0.35, 0], ['fence', 0.25, 0], ['hay', 0.15, 0], ['rock', 0.10, 16], ['hut', 0.15, 18]],
  array: [['pillar', 0.25, 16], ['stone', 0.25, 14], ['tree', 0.15, 0], ['banner', 0.15, 0], ['pavilion', 0.20, 18]],
  script: [['pillar', 0.20, 16], ['tree', 0.30, 0], ['desk', 0.15, 0], ['stone', 0.15, 14], ['pavilion', 0.20, 18]],
  forge: [['rock', 0.35, 16], ['forge', 0.20, 18], ['anvil', 0.15, 12], ['dead_tree', 0.30, 0]],
  ice: [['ice_shard', 0.35, 16], ['rock', 0.25, 16], ['pine', 0.15, 0], ['mountain_snow', 0.25, 30]],
  lava: [['lava_rock', 0.35, 16], ['rock', 0.25, 16], ['dead_tree', 0.20, 0], ['mountain', 0.20, 30]],
  desert: [['cactus', 0.25, 0], ['rock', 0.25, 16], ['bone', 0.15, 0], ['dead_tree', 0.15, 0], ['grass_tall', 0.20, 0]],
  blood_forest: [['blood_tree', 0.40, 0], ['rock', 0.20, 16], ['mushroom', 0.15, 0], ['blossom', 0.10, 0], ['grass', 0.15, 0]],
  graveyard: [['tomb', 0.30, 16], ['dead_tree', 0.30, 0], ['bone', 0.20, 0], ['willow', 0.10, 0], ['grass', 0.10, 0]],
  mountain: [['pine', 0.30, 0], ['rock', 0.25, 16], ['tree', 0.15, 0], ['mountain', 0.15, 30], ['cave', 0.10, 18], ['grass', 0.05, 0]],
  storm: [['rock', 0.35, 16], ['pillar', 0.20, 16], ['dead_tree', 0.25, 0], ['mountain', 0.20, 30]],
  swamp: [['swamp_tree', 0.35, 0], ['mushroom', 0.20, 0], ['rock', 0.15, 16], ['reed', 0.15, 0], ['pond', 0.15, 0]],
  battlefield: [['sword_stone', 0.25, 14], ['bone', 0.20, 0], ['dead_tree', 0.20, 0], ['rock', 0.15, 16], ['hut', 0.10, 18], ['grass_tall', 0.10, 0]],
  void: [['crystal', 0.35, 16], ['rock', 0.30, 16], ['pillar', 0.20, 16], ['mushroom', 0.15, 0]],
  metal: [['crystal_gold', 0.30, 16], ['rock', 0.40, 16], ['pillar', 0.30, 16]],
  swords: [['sword_stone', 0.45, 14], ['rock', 0.30, 16], ['dead_tree', 0.25, 0]],
  deep_forest: [['tree_big', 0.40, 0], ['tree', 0.20, 0], ['mushroom', 0.15, 0], ['bamboo', 0.15, 0], ['grass', 0.10, 0]],
  ghost_forest: [['dead_tree', 0.30, 0], ['mushroom', 0.20, 0], ['tomb', 0.15, 16], ['tree', 0.10, 0], ['willow', 0.15, 0], ['grass', 0.10, 0]],
  stream: [['tree', 0.30, 0], ['rock', 0.20, 16], ['reed', 0.20, 0], ['stone', 0.10, 14], ['pond', 0.10, 0], ['willow', 0.10, 0]],
  ice_plain: [['ice_shard', 0.35, 16], ['rock', 0.25, 16], ['pine', 0.15, 0], ['mountain_snow', 0.25, 30]],
  deep_sea: [['coral', 0.30, 14], ['rock', 0.25, 16], ['reed', 0.15, 0], ['palm', 0.15, 0], ['wave', 0.15, 0]],
  badland: [['rock', 0.35, 16], ['dead_tree', 0.25, 0], ['bone', 0.15, 0], ['grass_tall', 0.15, 0], ['mountain', 0.10, 30]],
};
function hashStr(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h = Math.imul(h ^ s.charCodeAt(i), 16777619); } return h >>> 0; }
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
// Runtime của 1 map mới: cổng dịch chuyển (cũng là điểm tới) + decor + vật cản
const MAP_RUNTIME = new Map();
function buildMapRuntime(def) {
  const { w, h } = mapDims(def.id);
  const theme = THEME_BY_ID[def.id] || 'mountain';
  const portal = { x: Math.round(w / 2), y: h - 150 };
  const rng = mulberry32(hashStr(def.id));
  const table = THEME_DECOR[theme] || THEME_DECOR.mountain;
  const decor = [];
  const obstacles = [];
  // GĐ60: mật độ trang trí theo theme — rừng/đầm DÀY ĐẶC cây cối (người
  // chơi: "map rừng thì phải cực kì nhiều cây"), theme khác thưa hơn.
  const FORESTY = ['deep_forest', 'ghost_forest', 'blood_forest', 'swamp'];
  const n = FORESTY.includes(theme)
    ? Math.max(120, Math.min(650, Math.round((w * h) / 7000)))
    : (theme === 'ice' || theme === 'ice_plain')
      ? Math.max(40, Math.min(280, Math.round((w * h) / 20000)))
      : Math.max(60, Math.min(420, Math.round((w * h) / 12000)));
  // GĐ94: vùng cấm vật cản — nhà/cổng/NPC luôn có lối đi (số TẠM).
  // Đàn tế ở bắc cổng 160px (bằng ALTAR_DIST ở dòng ~450 — KHÔNG dùng
  // trực tiếp vì buildMapRuntime chạy lúc boot trước khi const đó nạp).
  const altarPt = { x: portal.x, y: portal.y - 160 };
  const isCity = def.category === 'city';
  // Khu dân thành phố: lưới chức năng (GĐ109: portal.x±675, portal.y−750..−150)
  // + vùng cấm decor chặn (portal.x±620, portal.y−770..−10), chừa lề 70px.
  const district = isCity ? { x0: portal.x - 620, x1: portal.x + 620, y0: portal.y - 770, y1: portal.y - 10 } : null;
  const HOUSE_LIKE = ['house', 'hut', 'pavilion'];
  const MOUNTAIN_LIKE = ['mountain', 'mountain_snow'];
  // GĐ109: kiểm tra vị trí (dùng chung cho rải ngẫu nhiên + dãy nhà).
  const posOk = (x, y, cr, kind) => Math.hypot(x - portal.x, y - portal.y) > (MOUNTAIN_LIKE.includes(kind) ? 260 : 185)
    && !(district && cr > 0 && x >= district.x0 && x <= district.x1 && y >= district.y0 && y <= district.y1)
    && !(cr > 0 && Math.hypot(x - altarPt.x, y - altarPt.y) < (MOUNTAIN_LIKE.includes(kind) ? 160 : 130))
    // GĐ115: mọi decor (kể cả cây/cỏ không chặn) đều không được nằm lên
    // hình núi — trước đây luật né chỉ chạy khi cr > 0 nên cây mọc lên
    // cả sườn núi, nhìn như sprite chồng nhau. Núi đặt sau cũng không
    // được đè lên cây/cỏ đã đặt (kiểm tra decor, 150px).
    && !obstacles.some((o) => (MOUNTAIN_LIKE.includes(o.k) && Math.hypot(x - o.x, y - o.y) < o.r + 50) || (o.k === 'ridge' && Math.hypot(x - o.x, y - o.y) < o.r + 90))
    && !(cr > 0 && MOUNTAIN_LIKE.includes(kind) && decor.some((d) => Math.hypot(x - d.x, y - d.y) < 150))
    && !(cr > 0 && obstacles.some((o) => {
      if (Math.hypot(x - o.x, y - o.y) < 52) return true;
      // GĐ116: núi vs dãy sprite — dãy rộng 753px, núi không được đè lên.
      if (o.k === 'ridge' && MOUNTAIN_LIKE.includes(kind)) return Math.hypot(x - o.x, y - o.y) < 350;
      // GĐ114: núi cỡ lớn (rộng tới ~216px ở hệ số 2.4, cao ~150px, to
      // hơn cây) — cặp núi cách nhau 230px, núi vs vật cản khác 180px;
      // kiểm tra trước luật nhà vì số này lớn hơn hành lang nhà.
      // (GĐ113 chỉ bắt 130px thì hết chồng nhưng núi vẫn nhỏ như đồi.)
      if (MOUNTAIN_LIKE.includes(kind) || MOUNTAIN_LIKE.includes(o.k)) {
        const bothMtn = MOUNTAIN_LIKE.includes(kind) && MOUNTAIN_LIKE.includes(o.k);
        return Math.hypot(x - o.x, y - o.y) < (bothMtn ? 230 : 180);
      }
      // Nhà (kể cả nhà vs nhà): chừa hành lang 40px quanh nhà.
      if (HOUSE_LIKE.includes(kind) || HOUSE_LIKE.includes(o.k)) return Math.hypot(x - o.x, y - o.y) < o.r + cr + 40;
      return false;
    }));
  // GĐ117: khoảng cách tối thiểu giữa mọi decor (trước đây vật cản chỉ
  // cách nhau 52px, cây/cỏ đặt sát bất cứ thứ gì) — núi/cây/đá/băng
  // không còn chụm thành đống; cây-trong-rừng giữ dày (miễn cây-cây).
  // Luật núi/dãy (230/180/350/240) lớn hơn nên vẫn chiếm ưu thế.
  const blockingKinds = new Set(table.filter(([, , r]) => r > 0).map(([k]) => k));
  const TREE_LIKE = ['tree', 'tree_big'];
  const spacingOk = (x, y, kind) => decor.every((d) => {
    if (FORESTY.includes(theme) && TREE_LIKE.includes(kind) && TREE_LIKE.includes(d.k)) return true;
    const need = (blockingKinds.has(kind) || blockingKinds.has(d.k)) ? 150 : 120;
    return Math.hypot(x - d.x, y - d.y) >= need;
  });
  // GĐ109: nhà thành phố xếp thành dãy phố (4 hàng phía bắc khu dân, cách
  // đều, lệch nhẹ cho tự nhiên) thay vì rải ngẫu nhiên nhìn lung tung.
  // Slot tăng theo số lần thử nhà (kể cả rớt) — slot tắc thì bỏ qua, không
  // đóng băng cả dãy như khi đếm theo số nhà đã đặt.
  // GĐ110: cột giãn theo chiều rộng map (thành phố to gấp đôi mà cột vẫn
  // 160px thì nhà dồn nửa tây map) — khoảng cách cột tính từ số nhà kỳ
  // vọng để dãy phủ hết chiều rộng.
  const houseRows = isCity ? [h * 0.12, h * 0.22, h * 0.32, h * 0.42] : null;
  const houseCols = houseRows ? Math.max(8, Math.round((n * 0.15) / houseRows.length)) : 0;
  const houseGapX = houseRows ? (w - 240) / houseCols : 160;
  let houseSlot = 0;
  // GĐ115: dãy núi — núi ngoài đời đứng thành dãy (nhiều đỉnh nối nhau
  // thành sống núi) chứ không phải nón rời rạc. Đặt TRƯỚC rải ngẫu
  // nhiên để dãy luôn có đất trống (đặt sau thì map đã dày decor, ngọn
  // nào cũng vướng cây/đá trong 150–180px và gãy); decor rải sau tự né
  // núi dãy theo luật chung. Mỗi map có núi: 3 dãy, mỗi dãy 4 ngọn
  // thẳng hàng cách nhau 225px (ngọn rộng nhất 216px nên chỉ chạm nhau
  // như sống núi, không chồng); thử 20 hướng/vị trí, dãy nào đủ ≥3 ngọn
  // mới giữ.
  const mtnEntry = table.find(([k]) => MOUNTAIN_LIKE.includes(k));
  if (mtnEntry && theme !== 'ice' && theme !== 'ice_plain' && w >= 1000 && h >= 1000) {
    const mtnKind = mtnEntry[0];
    for (let r = 0; r < 3; r++) {
      let placed = null;
      for (let a = 0; a < 20 && !placed; a++) {
        const ang = rng() * Math.PI * 2;
        const dx = Math.cos(ang), dy = Math.sin(ang);
        const ax = Math.round(200 + rng() * (w - 400));
        const ay = Math.round(200 + rng() * (h - 400));
        const cands = [];
        for (let k = 0; k < 4; k++) {
          const x = Math.round(ax + dx * 225 * k);
          const y = Math.round(ay + dy * 225 * k);
          if (x < 150 || x > w - 150 || y < 150 || y > h - 150) break;
          if (Math.hypot(x - portal.x, y - portal.y) <= 260) break;
          if (Math.hypot(x - altarPt.x, y - altarPt.y) < 160) break;
          if (obstacles.some((o) => Math.hypot(x - o.x, y - o.y) < (MOUNTAIN_LIKE.includes(o.k) ? 230 : 180))) break;
          cands.push({ x, y });
        }
        if (cands.length >= 3) placed = cands;
      }
      if (!placed) continue;
      for (const c of placed) {
        const s = Math.round((2.0 + rng() * 0.4) * 100) / 100;
        decor.push({ k: mtnKind, x: c.x, y: c.y, s });
        obstacles.push({ x: c.x, y: c.y, r: Math.round(45 * s), k: mtnKind });
      }
    }
  }
  // GĐ116: dãy núi tuyết bằng 1 sprite liền (ghép từ sprite núi tuyết —
  // Trial PixelLab đã hết 40/40 nên không vẽ mới được). 1 dãy mỗi map
  // băng, thay cho dãy nón GĐ115 ở map băng; đặt trước rải decor để
  // decor tự né. Va chạm = 3 vòng tròn dọc băng (tâm y−115, r 150) phủ
  // kín băng 753×231; điểm {x, y} là điểm đất giữa dãy.
  const ridgeList = [];
  if (theme === 'ice' || theme === 'ice_plain') {
    let rx = Math.round(w / 2), ry = 500;
    for (let t = 0; t < 20; t++) {
      const x = Math.round(400 + rng() * (w - 800));
      const y = Math.round(300 + rng() * (h - 400));
      if (Math.hypot(x - portal.x, y - 115 - portal.y) > 600 && Math.hypot(x - altarPt.x, y - 115 - altarPt.y) > 450) { rx = x; ry = y; break; }
    }
    ridgeList.push({ x: rx, y: ry });
    for (const dx of [-250, 0, 250]) obstacles.push({ x: rx + dx, y: ry - 115, r: 150, k: 'ridge' });
  }
  for (let i = 0; i < n; i++) {
    let kind = table[0][0]; let cr = table[0][2];
    const roll = rng();
    let acc = 0;
    for (const [k, wt, r] of table) { acc += wt; if (roll <= acc) { kind = k; cr = r; break; } }
    let x = 0; let y = 0; let okPos = false;
    if (houseRows && kind === 'house') {
      const hi = houseSlot++;
      const row = hi % houseRows.length, col = Math.floor(hi / houseRows.length);
      for (let t = 0; t < 8 && !okPos; t++) {
        x = Math.round(120 + col * houseGapX + (rng() * 50 - 25));
        y = Math.round(houseRows[row] + (rng() * 40 - 20));
        okPos = x >= 56 && x <= w - 56 && y >= 56 && y <= h - 56 && posOk(x, y, cr, kind) && spacingOk(x, y, kind);
      }
    } else {
      for (let t = 0; t < 8 && !okPos; t++) {
        x = Math.round(56 + rng() * (w - 112));
        y = Math.round(56 + rng() * (h - 112));
        okPos = posOk(x, y, cr, kind) && spacingOk(x, y, kind);
      }
    }
    if (!okPos) continue;
    // GĐ114: núi cỡ lớn thay vì cỡ decor thường — hệ số 2.0–2.4 (cao
    // ~150px, rộng ~200px, to hơn cây to nhất ~95px, nhỏ hơn núi lửa
    // feature 310px); va chạm r = 45×s để chân núi khớp hình vẽ (núi
    // tuyết rộng 90px trong hộp 96). Cây/cỏ giữ hệ số cũ.
    const isMtn = MOUNTAIN_LIKE.includes(kind);
    const s = isMtn ? Math.round((2.0 + rng() * 0.4) * 100) / 100 : Math.round((0.85 + rng() * 0.4) * 100) / 100;
    decor.push({ k: kind, x, y, s });
    if (cr > 0) obstacles.push({ x, y, r: isMtn ? Math.round(45 * s) : cr, k: kind });
  }
  // GĐ60: ĐẶC SẢN theo theme — dung nham có NÚI LỬA + HỐ LỬA (đứng vào
  // bị thiêu), băng có HANG BĂNG (cụm tinh thể quanh cửa hang tối).
  const hazards = [];
  const features = { volcano: null, caves: [], ridges: ridgeList };
  const farFromPortal = (minD, altarMin) => {
    for (let t = 0; t < 20; t++) {
      const x = Math.round(180 + rng() * (w - 360));
      const y = Math.round(180 + rng() * (h - 360));
      if (Math.hypot(x - portal.x, y - portal.y) > minD && Math.hypot(x - altarPt.x, y - altarPt.y) > altarMin) return { x, y };
    }
    return { x: Math.round(w / 2), y: 260 }; // fallback vẫn xa đàn (mọi map cao ≥1200 → cách đàn ≥630px)
  };
  if (theme === 'lava') {
    const v = farFromPortal(650, 250);
    features.volcano = { x: v.x, y: v.y, r: 95 };
    obstacles.push({ x: v.x, y: v.y, r: 95 });
    for (let i = 0; i < 7; i++) {
      const p = farFromPortal(300, 180);
      hazards.push({ x: p.x, y: p.y, r: 42 + Math.round(rng() * 26) });
    }
  }
  if (theme === 'ice' || theme === 'ice_plain') {
    for (let i = 0; i < 2; i++) {
      const c = farFromPortal(420, 200);
      if (features.caves.some((o) => Math.hypot(o.x - c.x, o.y - c.y) < 300)) continue;
      if (ridgeList.some((r) => Math.hypot(c.x - r.x, c.y - 115 - r.y) < 500)) continue;
      features.caves.push({ x: c.x, y: c.y });
      obstacles.push({ x: c.x, y: c.y, r: 62 });
    }
  }
  // GĐ76: điểm linh mạch — 3 điểm/map, seed theo id map (ổn định qua restart),
  // cách cổng >200px, cách nhau >300px. Client vẽ dấu ✦ để người chơi tìm.
  const spots = [];
  for (let i = 0; i < 3; i++) {
    let sx = 0, sy = 0, okS = false;
    for (let t = 0; t < 20 && !okS; t++) {
      sx = Math.round(120 + rng() * (w - 240));
      sy = Math.round(120 + rng() * (h - 240));
      okS = Math.hypot(sx - portal.x, sy - portal.y) > 200
        && Math.hypot(sx - altarPt.x, sy - altarPt.y) > 130
        && spots.every((s) => Math.hypot(sx - s.x, sy - s.y) > 300)
        && !obstacles.some((o) => Math.hypot(sx - o.x, sy - o.y) < o.r + 60)
        && !hazards.some((hz) => Math.hypot(sx - hz.x, sy - hz.y) < hz.r + 50);
    }
    if (okS) spots.push({ x: sx, y: sy });
  }
  return { w, h, theme, portal, decor, obstacles, hazards, features, spots };
}
for (const def of MAP_DEFS.values()) {
  if (def.id !== HOME_MAP && def.id !== 'thach_lam' && def.id !== 'bai_farm') MAP_RUNTIME.set(def.id, buildMapRuntime(def));
}
// ---- GĐ89: DÂN CƯ THÀNH PHỐ — nối NPCData (10 thành cũ) + NPCData_new
// (20 thành mới, sinh bởi shottools/gen_city_npcs.py) thành NPC thật trên
// từng map thành phố. Vị trí xếp lúc boot: chức năng thành lưới quảng
// trường phía bắc cổng, dân thường rải seed quanh đó, tránh vật cản
// (decor map đã seed theo id nên vị trí ổn định qua restart). Các vai
// khác ngoài tiệm Đan/Nguyên Liệu/sứ giả đợt này chỉ nói chuyện.
const CITY_NPCS = {}; // mapId -> [{id,name,role,kind,group,dialogue,x,y,style}]
const CITY_NPC_BY_ID = new Map();
try {
  const npcOld = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'gdd', 'NPCData.json'), 'utf8')).maps || {};
  const npcNew = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'gdd', 'NPCData_new.json'), 'utf8')).maps || {};
  const npcAll = { ...npcOld, ...npcNew };
  const hash89 = (s) => { let h = 0; for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return h; };
  for (const def of MAP_DEFS.values()) {
    // GĐ129: trước đây chỉ nhận map 'city' nên NPC 15 map nghề (và giver
    // Cổ Thụ mới) không bao giờ spawn — giờ nhận mọi map có entry trong
    // NPCData (thành + nghề + Cổ Thụ); map không có entry vẫn bỏ qua.
    const entry = npcAll[def.id];
    const rt = MAP_RUNTIME.get(def.id);
    if (!entry || !rt) continue;
    const rng = mulberry32(hash89(def.id));
    const placed = [];
    const blocked = (x, y, pad) => rt.obstacles.some((o) => Math.hypot(x - o.x, y - o.y) < o.r + pad);
    // GĐ109: dân không đứng chồng lên decor (cây/nhà/trụ/đá/đèn — trước đây
    // chỉ tránh vật cản nên dân đứng lên cả tán cây).
    const DECOR_PAD = { tree: 45, tree_big: 45, house: 45, hut: 45, pavilion: 45, stone: 35, rock: 35, pillar: 35, tomb: 35, furnace: 35, forge: 35, lamp: 25, banner: 25 };
    const decorBlocked = (x, y) => (rt.decor || []).some((d) => {
      const pad = DECOR_PAD[d.k];
      return pad ? Math.hypot(x - d.x, y - d.y) < pad : false;
    });
    const farEnough = (x, y, d) => placed.every((q) => Math.hypot(x - q.x, y - q.y) >= d);
    const list = [];
    const funcs = entry.npcs.filter((n) => n.kind === 'functional');
    const ambs = entry.npcs.filter((n) => n.kind !== 'functional');
    const gx0 = rt.portal.x - 675, gy0 = rt.portal.y - 750; // GĐ109: lưới 10x5, bước 150px (trước 95px — dân dồn thành đám)
    const OFF12 = [[60, 0], [-60, 0], [0, 60], [0, -60], [60, 60], [-60, -60], [60, -60], [-60, 60], [120, 0], [-120, 0], [0, 120], [0, -120]];
    let fi = 0;
    for (const n of funcs) {
      const col = fi % 10, row = Math.floor(fi / 10) % 5; fi++;
      let x = gx0 + col * 150, y = gy0 + row * 150;
      if (blocked(x, y, 20) || decorBlocked(x, y) || !farEnough(x, y, 40)) {
        for (const [dx, dy] of OFF12) {
          if (!blocked(x + dx, y + dy, 20) && !decorBlocked(x + dx, y + dy) && farEnough(x + dx, y + dy, 40)) { x += dx; y += dy; break; }
        }
      }
      const npc = { ...n, x, y, style: 'villager' + (hash89(n.id) % 5) };
      list.push(npc); placed.push(npc);
    }
    for (const n of ambs) {
      // GĐ109: dân thường rải khắp thành phố (trước dồn trong ô quanh cổng).
      let x = rt.portal.x, y = rt.portal.y - 200, ok = false;
      for (let t = 0; t < 30 && !ok; t++) {
        x = Math.round(100 + rng() * (rt.w - 200));
        y = Math.round(100 + rng() * (rt.h - 200));
        ok = !blocked(x, y, 20) && !decorBlocked(x, y) && farEnough(x, y, 45);
      }
      const npc = { ...n, x, y, style: 'villager' + (hash89(n.id) % 5) };
      list.push(npc); placed.push(npc);
    }
    CITY_NPCS[def.id] = list;
    for (const npc of list) CITY_NPC_BY_ID.set(npc.id, { ...npc, mapId: def.id });
  }
  console.log(`[GĐ89] Đã nối dân các map: ${Object.keys(CITY_NPCS).length} map, ${CITY_NPC_BY_ID.size} NPC.`);
} catch (e) { console.warn('[GĐ89] Không nối được dân thành phố:', e.message); }
function hitsObstacleIn(mapId, x, y, pad = 14) {
  if (!mapId || mapId === HOME_MAP) return hitsObstacle(x, y, pad);
  const rt = MAP_RUNTIME.get(mapId);
  // GĐ91: thach_lam/bai_farm không có runtime riêng (là vùng trong map
  // làng) nên vẫn dùng rect map làng; trước đây trả false là kẽ hở.
  if (!rt) return hitsObstacle(x, y, pad);
  return rt.obstacles.some((o) => Math.hypot(x - o.x, y - o.y) <= o.r + 6);
}
function mapEnterPayload(mapId) {
  if (!mapId || mapId === HOME_MAP) {
    return { mapId: HOME_MAP, isHome: true, name: 'Làng Tân Thủ', w: WORLD_W, h: WORLD_H, safe: false, portal: { x: 1080, y: 600 }, spots: HOME_SPOTS, nodes: MAP_NODES[HOME_MAP] || [] }; // GĐ76: + điểm linh mạch; GĐ132: + điểm tài nguyên
  }
  const def = MAP_DEFS.get(mapId);
  const rt = MAP_RUNTIME.get(mapId);
  if (!def || !rt) return mapEnterPayload(HOME_MAP);
  return { mapId, isHome: false, name: def.name, category: def.category, safe: !!def.safe, w: rt.w, h: rt.h, theme: rt.theme, portal: rt.portal, decor: rt.decor, hazards: rt.hazards || [], features: rt.features || null, spots: rt.spots || [], desc: def.desc || '', altar: altarEntryFor(mapId) ? altarPosOf(mapId) : null, study: mapId === NHO_STUDY_MAP && rt ? { x: rt.portal.x, y: rt.portal.y } : null, npcs: (CITY_NPCS[mapId] || []).map((n) => ({ id: n.id, name: n.name, role: n.role, kind: n.kind, x: n.x, y: n.y, style: n.style })), nodes: MAP_NODES[mapId] || [] }; // GĐ60: + hazards/features; GĐ76: + spots; GĐ85: + đàn tế; GĐ89: + dân thành phố; GĐ105: + điểm đọc sách Văn Uyển; GĐ132: + điểm tài nguyên
}
// ---- Quái GDD: nạp thêm loài chưa có từ MonsterData (số file: HP/ATK/Tu vi;
//      def/tốc độ/hồi sinh TẠM như ghi chú đầu mục) ----
const GDD_KIND_ALIAS = { soi_xam: 'wolf', doi_den: 'bat', thach_quai: 'golem', kiem_ma: 'kiemma', huyet_lang: 'huyetlang', thach_khoi_loi: 'khoiloi' };
const CHEST_BY_REWARD = { weak: 'yeu', medium: 'trung', strong: 'manh', elite: 'manh', boss: 'manh' };
let GDD_MONSTERS = [];
try {
  GDD_MONSTERS = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'gdd', 'MonsterData.json'), 'utf8')).monsters || [];
} catch (e) { console.warn('[bản đồ] Không đọc được MonsterData.json:', e.message); }
// GĐ119: hệ thống Trang Bị — dữ liệu + logic sinh đồ (server/gear.js).
// Socket mặc/rèn nối ở bước 2/3; bước 1 chỉ cần nạp dữ liệu + lưu bền.
const GEAR = require('./gear');
// GĐ70: CƠ CHẾ RIÊNG từng loài — bóc từ MonsterData.mechanics (file chỉ ghi
// tên cơ chế, mọi con số dưới đây đều là TẠM do agent chọn, người chơi duyệt sau):
const MONSTER_MECH = {
  doc_xa: { poison: { dps: 2, sec: 5 } }, // cắn độc theo thời gian (phục kích đã có từ GĐ60)
  lam_tru: { charge: { cdMs: 6000, dmgMul: 1.5 } }, // húc lao thẳng
  cot_binh: { reviveOnce: 0.5 }, // hồi sinh 1 lần khi gần chết (về 50% HP)
  thuy_trieu_tinh: { slowOnHit: { pct: 40, sec: 3 } }, // phun bọt nước làm chậm
  kiem_ma: { ranged: 150 }, // chém kiếm khí tầm xa
  huyet_lang: { lifesteal: 0.3 }, // hồi máu khi cắn trúng
  cuu_u_ma_quan: { lifesteal: 0.3 }, // GĐ130: Ma Quân Cửu U hút máu khi đánh trúng
  huyen_anh_mieu: { dodge: 0.6, clones: 2 }, // phân thân ảo ảnh + né chiêu cao
  thach_khoi_loi: { physResist: 0.5 }, // giáp đá giảm 50% sát thương vật lý
  loi_dieu: { ranged: 150, chain: { jumps: 2, falloff: 0.7, radius: 150 } }, // phóng sét dây chuyền
  dia_hanh_yeu: { burrow: true }, // độn thổ bất ngờ (ẩn như rắn độc)
  huyen_diep: { poison: { dps: 3, sec: 4 }, clones: 2 }, // bướm độc + phân thân
  kim_giap_te: { charge: { cdMs: 7000, dmgMul: 1.6, stunSec: 0.8 } }, // trâu bò, lao thẳng gây choáng
  dan_ma: { ranged: 130, poison: { dps: 4, sec: 4 }, selfDestruct: { radius: 100, mul: 1.5 } }, // ném độc đan, chết tự bạo
  hap_huyet_quy: { invis: true, lifesteal: 0.4 }, // tàng hình + hút máu
  bang_tinh_cu_nhan: { iceStomp: { radius: 120, mul: 1.2, windupMs: 850, cdMs: 8000, slowPct: 50, slowSec: 3 } }, // dậm chân sóng băng
  diem_hoa_phuong: { fireRain: { radius: 90, mul: 1.3, delayMs: 1000, cdMs: 9000 } }, // bay lượn thả mưa lửa
  thien_loi_thu: { lightning: { radius: 80, mul: 1.4, delayMs: 800, cdMs: 7000 } }, // triệu hồi sét
  hon_don_thu: { boss5: true }, // trùm: mỗi đòn ngẫu nhiên 1 trong 5 hệ
};
function mechOf(m) {
  if (!m || m.illusion) return null; // ảo ảnh không có cơ chế riêng
  return (m.kind && MONSTER_TYPES[m.kind]?.mech) || null;
}
for (const g of GDD_MONSTERS) {
  const rk = GDD_KIND_ALIAS[g.id] || g.id;
  if (MONSTER_TYPES[rk]) {
    // GĐ70: loài GDD trùng loài cứng (Kiếm Ma, Huyết Lang, Thạch Khôi Lỗi) —
    // giữ bộ số đã chốt nhưng NHẬN cơ chế riêng + tầm đánh + hạng từ GDD,
    // nếu không 3 cơ chế này mất hẳn trên mọi map dùng loài cứng.
    if (GDD_KIND_ALIAS[g.id] && MONSTER_TYPES[rk]) {
      if (!MONSTER_TYPES[rk].mech) MONSTER_TYPES[rk].mech = MONSTER_MECH[g.id] || null;
      if (MONSTER_MECH[g.id]?.ranged) MONSTER_TYPES[rk].atkRange = MONSTER_MECH[g.id].ranged;
      if (!MONSTER_TYPES[rk].rewardClass) MONSTER_TYPES[rk].rewardClass = g.rewardClass;
    }
    continue;
  }
  MONSTER_TYPES[rk] = {
    name: g.name, hp: g.hp, atk: g.atk,
    def: g.realm === 'kd' ? (g.rewardClass === 'boss' ? 10 : 6) : g.realm === 'tc' ? (g.rewardClass === 'elite' || g.rewardClass === 'boss' ? 8 : 3) : 0,
    tuVi: g.tuViReward, count: 0, realm: g.realm, rewardClass: g.rewardClass, // GĐ70: để luật trùm (MAP_BOSSES) nhận diện đúng hạng
    mech: MONSTER_MECH[g.id] || null, // GĐ70
    // GĐ67: tầng quái (sơ/trung/hậu) — file GDD chỉ có cảnh giới, không có
    // tầng, nên quy ước: TC = trung kỳ; KD hạng Trung = trung kỳ, KD hạng
    // Mạnh/Tinh anh/Trùm = hậu kỳ; LK = sơ kỳ; NA/HT = hậu kỳ. Người chơi
    // có thể sửa từng loài nếu muốn mốc khác.
    stage: g.realm === 'tc' ? 'trung' : g.realm === 'kd' ? (g.rewardClass === 'medium' ? 'trung' : 'hau') : g.realm === 'lk' ? 'so' : 'hau',
    chaseSpeed: g.realm === 'kd' ? 160 : g.realm === 'tc' ? 148 : 128,
    wanderSpeed: 40, atkRange: MONSTER_MECH[g.id]?.ranged || 44, atkCdMs: 1150, // GĐ70: loài đánh xa (kiếm khí / độc đan / sét) có tầm riêng
    chestTier: CHEST_BY_REWARD[g.rewardClass] || 'trung',
    respawnMs: g.rewardClass === 'boss' ? 600000 : 30000,
    ...(g.rewardClass === 'boss' ? { minChestGrade: 'B' } : {}),
    ...(g.id === 'doc_xa' ? { ambush: true } : {}), // GĐ60: rắn độc nằm ẩn phục kích
    gdd: true,
  };
}
// Bảng sinh quái theo map — từ MonsterData.maps (map nhà bỏ qua: hệ cũ giữ nguyên)
// GĐ70: SỐ LƯỢNG THEO MAP (người chơi chốt 24/10: map yếu cực nhiều, map mạnh
// ít dần) + LUẬT TRÙM (map LK cơ bản KHÔNG có trùm; map TC/KD có quái đều có
// trùm; map đặc biệt có NHIỀU trùm). Mọi hệ số đều TẠM.
const MAP_COUNT_FACTOR = { pham: 3, lk: 3, tc: 2, kd: 1, na: 1, ht: 1 }; // LK ×3, TC ×2, KD giữ nguyên
const SPECIAL_BOSS_MAPS = ['vo_tan_hu_khong', 'tham_hai_bi_canh']; // map đặc biệt: 3 trùm (TẠM — người chơi có thể chỉ định thêm)
const MAP_SPAWNS = [];
for (const g of GDD_MONSTERS) {
  const rk = GDD_KIND_ALIAS[g.id] || g.id;
  const base = g.rewardClass === 'boss' ? 1 : g.rewardClass === 'elite' ? 3 : g.rewardClass === 'strong' ? 6 : 12; // GĐ60: map siêu to → quái đông (số TẠM)
  for (const mid of g.maps || []) {
    if (mid === HOME_MAP || mid === 'bai_farm' || mid === 'thach_lam') continue;
    const mr = MAP_DEFS.get(mid)?.minRealm || 'lk';
    if (g.rewardClass === 'boss' && (mr === 'lk' || mr === 'pham')) continue; // GĐ70: map LK cơ bản không có trùm
    let count = g.rewardClass === 'boss' ? 1 : Math.round(base * (MAP_COUNT_FACTOR[mr] ?? 1));
    if (g.rewardClass === 'boss' && SPECIAL_BOSS_MAPS.includes(mid)) count = 3; // GĐ70: map đặc biệt nhiều trùm
    MAP_SPAWNS.push({ mapId: mid, kind: rk, count });
  }
}
// 4 map file KHÔNG gán quái nào — gán TẠM theo tông + cảnh giới của map (cũng nhân hệ số map):
MAP_SPAWNS.push(
  { mapId: 'bang_phong_coc', kind: 'thuy_trieu_tinh', count: 12 * MAP_COUNT_FACTOR.lk }, // cốc băng LK7 ← tinh linh thủy/băng
  { mapId: 'hoa_diem_son', kind: 'golem', count: 12 * MAP_COUNT_FACTOR.lk },             // núi lửa LK7 ← thạch quái
  { mapId: 'van_thu_son_mach', kind: 'huyetlang', count: 12 * MAP_COUNT_FACTOR.tc },    // sơn mạch vạn thú TC1 ← huyết lang
  { mapId: 'tham_hai_bi_canh', kind: 'bang_tinh_cu_nhan', count: 1 }, // biển sâu KD ← cự nhân băng (trùm thêm ở MAP_BOSSES dưới)
);
// GĐ70: TRÙM THEO MAP — mọi map TC/KD có quái mà chưa có trùm thật thì lấy loài
// mạnh nhất map làm trùm (1 con, gắn cờ mapBoss: thanh máu trùm + rương chắc chắn
// + Linh thạch Cực phẩm + hồi sinh 10 phút như trùm thật).
const MAP_BOSSES = [];
{
  const byMap = new Map();
  for (const s of MAP_SPAWNS) {
    if (!byMap.has(s.mapId)) byMap.set(s.mapId, []);
    if (!byMap.get(s.mapId).includes(s.kind)) byMap.get(s.mapId).push(s.kind);
  }
  const RANK = { boss: 4, elite: 3, strong: 2, medium: 1, weak: 0 };
  for (const [mid, kinds] of byMap) {
    const mr = MAP_DEFS.get(mid)?.minRealm || 'lk';
    if (mr !== 'tc' && mr !== 'kd') continue; // LK cơ bản không trùm
    if (kinds.some((k) => MONSTER_TYPES[k]?.rewardClass === 'boss')) continue; // đã có trùm thật (Vô Tận Hư Không)
    if (mid === 'cuu_u_bi_canh') continue; // GĐ130: trùm Ma Quân nối tay sau vòng này, không lấy auto-boss
    let top = kinds[0];
    for (const k of kinds) {
      const r = RANK[MONSTER_TYPES[k]?.rewardClass] ?? 2;
      if (r > (RANK[MONSTER_TYPES[top]?.rewardClass] ?? 2)) top = k;
    }
    MAP_BOSSES.push({ mapId: mid, kind: top, count: SPECIAL_BOSS_MAPS.includes(mid) ? 3 : 1 });
  }
}
// GĐ130: Cửu U Ma Quân là loài boss nhưng KHÔNG nằm trong MAP_SPAWNS (maps rỗng) nên vòng
// auto trên không nhận — nối tay 3 con có cờ mapBoss (quest trùm chỉ tính quái có cờ;
// boss-class spawn thường không có cờ nên quest sẽ không bao giờ nhích). Nối trước
// ALTAR_BOSSES để đàn tế tự sinh theo.
MAP_BOSSES.push({ mapId: 'cuu_u_bi_canh', kind: 'cuu_u_ma_quan', count: 3 });
function spawnCountFor(kind, mapId) { const e = MAP_SPAWNS.find((s) => s.kind === kind && s.mapId === mapId); return e ? e.count : 0; }
// GĐ85: ĐÀN TẾ TRIỆU HỒI TRÙM — phương án B (người chơi chốt "tiếp
// giai đoạn tiếp theo" 25/10): đàn ở từng map có trùm, 200 LT/lần,
// mỗi map 1 lần/ngày game; mỗi lần triệu hồi đủ số trùm còn thiếu
// (không nhân đôi — luật hồi sinh tự nhiên đã chống trùng).
const ALTAR_COST = 200; // LT Hạ phẩm / lần (TẠM)
const ALTAR_DIST = 160; // đàn cách cổng 160px về phía bắc — trong vùng trống decor (≥185px) và quái (>200px), ngoài tầm E lúc mới tới (56px)
const ALTAR_RANGE = 95; // tầm tế = tầm nói chuyện NPC
const ALTAR_BOSSES = [...MAP_BOSSES, { mapId: 'vo_tan_hu_khong', kind: 'hon_don_thu', count: 3 }]; // Vô Tận Hư Không có trùm thật nên không nằm trong MAP_BOSSES
// GĐ132: ĐIỂM TÀI NGUYÊN THU THẬP — mạch quặng (ore, nghề Đào Khoáng) + bụi thuốc
// (herb, nghề Hái Thuốc). Vị trí CỐ ĐỊNH theo map (seed từ mapId nên không đổi
// qua mỗi lần boot); mỗi người chơi thu thập riêng (trạng thái theo ngày nằm ở
// player.gatheredNodes, không đồng bộ qua tick). Thành phố/map nghề là khu văn
// minh nên không có điểm hoang; làng có sẵn 6+6 ở vành đai farm cho người mới.
// Nguyên liệu theo bậc map (TẠM): Phàm/LK → Sắt/Thảo Dược, TC → Đồng/Linh Thảo,
// KD+ → Bạc/Tiên Thảo. Số lượng mỗi map 6+6 (TẠM).
const GATHER_ITEMS = {
  ore: { pham: 'quang_sat', lk: 'quang_sat', tc: 'quang_dong', kd: 'quang_bac', na: 'quang_bac', ht: 'quang_bac' },
  herb: { pham: 'thao_duoc', lk: 'thao_duoc', tc: 'linh_thao', kd: 'tien_thao', na: 'tien_thao', ht: 'tien_thao' },
};
const HOME_GATHER_NODES = [ // làng: vành đai farm (x ≥ 1650, ngoài nhà/ao/vách rừng) — đã kiểm tra ô trống
  { kind: 'ore', x: 2050, y: 200 }, { kind: 'ore', x: 2150, y: 500 }, { kind: 'ore', x: 2000, y: 800 },
  { kind: 'ore', x: 2180, y: 1000 }, { kind: 'ore', x: 1700, y: 300 }, { kind: 'ore', x: 1850, y: 900 },
  { kind: 'herb', x: 1700, y: 200 }, { kind: 'herb', x: 1800, y: 400 }, { kind: 'herb', x: 1900, y: 650 },
  { kind: 'herb', x: 1750, y: 850 }, { kind: 'herb', x: 2050, y: 950 }, { kind: 'herb', x: 1650, y: 550 },
];
function gatherSeededRand(seedStr) { // RNG xác định nhỏ (hash FNV + mulberry32) — chỉ dùng sinh vị trí node
  let h = 2166136261;
  for (let i = 0; i < seedStr.length; i++) { h ^= seedStr.charCodeAt(i); h = Math.imul(h, 16777619); }
  let a = h >>> 0;
  return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
function buildGatherNodes() {
  const out = {};
  out[HOME_MAP] = HOME_GATHER_NODES.map((n, i) => ({ id: `node-${HOME_MAP}-${i}`, kind: n.kind, itemId: GATHER_ITEMS[n.kind].pham, x: n.x, y: n.y }));
  for (const [mapId, def] of MAP_DEFS) {
    if (def.category !== 'farm' && def.category !== 'elemental') continue;
    const rt = MAP_RUNTIME.get(mapId); if (!rt) continue;
    const tier = def.minRealm || 'lk';
    const placed = [];
    const altar = altarPosOf(mapId);
    const cityNpcs = CITY_NPCS[mapId] || [];
    for (const kind of ['ore', 'herb']) {
      for (let k = 0; k < 6; k++) {
        const rnd = gatherSeededRand(`${mapId}:${kind}:${k}`);
        let pos = null;
        for (let t = 0; t < 50 && !pos; t++) {
          const ang = rnd() * Math.PI * 2, rad = 300 + rnd() * 600;
          const x = Math.round(rt.portal.x + Math.cos(ang) * rad), y = Math.round(rt.portal.y + Math.sin(ang) * rad);
          if (x < 60 || y < 60 || x > rt.w - 60 || y > rt.h - 60) continue;
          if (hitsObstacleIn(mapId, x, y)) continue;
          if (Math.hypot(x - rt.portal.x, y - rt.portal.y) < 200) continue;
          if (placed.some((p) => Math.hypot(x - p.x, y - p.y) < 150)) continue;
          if (altar && Math.hypot(x - altar.x, y - altar.y) < 150) continue;
          if (cityNpcs.some((n) => Math.hypot(x - n.x, y - n.y) < 150)) continue;
          pos = [x, y];
        }
        if (!pos) continue;
        placed.push({ x: pos[0], y: pos[1] });
        (out[mapId] = out[mapId] || []).push({ id: `node-${mapId}-${kind}-${k}`, kind, itemId: GATHER_ITEMS[kind][tier] || GATHER_ITEMS[kind].lk, x: pos[0], y: pos[1] });
      }
    }
  }
  return out;
}
const MAP_NODES = buildGatherNodes();
function altarEntryFor(mapId) { return ALTAR_BOSSES.find((b) => b.mapId === mapId) || null; }
function altarPosOf(mapId) { const rt = MAP_RUNTIME.get(mapId); return rt ? { x: rt.portal.x, y: rt.portal.y - ALTAR_DIST } : null; }
let altarUsed = {}; // mapId -> dayIndex đã tế (persist qua saveWorld)
function countKindInMap(kind, mapId) { let n = 0; for (const m of monsters.values()) if (!m.illusion && m.kind === kind && mapOf(m) === mapId) n++; return n; } // GĐ70: ảo ảnh không tính vào số lượng thật
function countBossInMap(kind, mapId) { let n = 0; for (const m of monsters.values()) if (m.mapBoss && m.kind === kind && mapOf(m) === mapId) n++; return n; } // GĐ70

// ================= GĐ39: HỆ THỐNG RƯƠNG (dữ liệu-hóa) =================
// Số liệu theo bảng B10 của file thiết kế (đối chiếu bản chơi đơn):
// rương rơi khi hạ quái FARM, theo HẠNG quái chứ không gắn cứng loài:
//   Yếu:   C 60% · B 0%  · A 0%   (40% không rơi)
//   Trung: C 50% · B 30% · A 5%   (15% không rơi)
//   Mạnh:  C 25% · B 50% · A 20%  (5% không rơi)
// Đồ trong rương: số MỤC theo file — C 1–2, B 2–3, A 3–4; mỗi mục rút từ
// kho trọng số của phẩm. Quái/map mới chỉ cần khai `chestTier` trong
// MONSTER_TYPES (hoặc ghi đè theo vùng trong ZONE_CHEST_TIER) — logic
// không đổi. Có đồng hành (đường tông môn): tỉ lệ rơi + Linh thạch trong
// rương nhân hệ số thưởng 2/3 như bản chơi đơn.
const CHEST_TTL_MS = Number(process.env.TTT_CHEST_TTL_MS || 120000); // file: rương tồn tại 120 giây
const CHEST_OPEN_RANGE = 42; // tới gần là tự mở (như nhặt đồ rơi)
const CHEST_MAX_UNOPENED = 12; // trần rương chưa mở trên bản đồ (bản chơi đơn: 8)
const CHEST_TABLES = {
  yeu: { C: 60, B: 0, A: 0 },
  trung: { C: 50, B: 30, A: 5 },
  manh: { C: 25, B: 50, A: 20 },
};
const CHEST_COUNT = { C: [1, 2], B: [2, 3], A: [3, 4] };
const CHEST_LOOT = {
  C: [
    { w: 30, stones: [8, 20] },
    { w: 25, item: 'dan_hoi_xuan', qty: [1, 1] },
    { w: 25, item: 'nanh_soi', qty: [1, 2] },
    { w: 20, item: 'canh_doi', qty: [1, 2] },
  ],
  B: [
    { w: 25, stones: [20, 45] },
    { w: 20, item: 'dan_hoi_nguyen', qty: [1, 1] },
    { w: 20, item: 'dan_hoi_xuan', qty: [1, 2] },
    { w: 15, item: 'nanh_tinh', qty: [1, 1] },
    { w: 10, item: 'da_soi', qty: [1, 1] },
    { w: 10, item: 'canh_doi', qty: [2, 3] },
  ],
  A: [
    { w: 22, stones: [45, 90] },
    { w: 18, item: 'dan_hoi_nguyen', qty: [2, 2] },
    { w: 15, item: 'da_quy', qty: [1, 1] },
    { w: 12, item: 'phu_ho_than', qty: [1, 1] },
    { w: 12, item: 'tran_ky', qty: [1, 1] },
    { w: 11, item: 'dan_hoi_xuan', qty: [2, 3] },
    { w: 5, item: 'sach_toa_thien', qty: [1, 1] },
    { w: 5, item: 'dan_trung_canh', qty: [1, 1] },
  ],
};
const ZONE_CHEST_TIER = {}; // ghi đè hạng rương theo vùng (vd bí cảnh) — chưa có vùng nào
const chests = new Map();
let chestSeq = 0;
function chestTierFor(target) {
  return ZONE_CHEST_TIER[target.zoneId] || MONSTER_TYPES[target.kind]?.chestTier || null;
}
function rollChestGrade(tier, mul = 1) {
  const force = process.env.TTT_CHEST_FORCE_GRADE; // móc kiểm thử
  if (force && CHEST_TABLES[tier]) return force;
  const t = CHEST_TABLES[tier];
  if (!t) return null;
  let r = Math.random() * 100;
  if (r < t.C * mul) return 'C';
  r -= t.C * mul;
  if (r < t.B * mul) return 'B';
  r -= t.B * mul;
  if (r < t.A * mul) return 'A';
  return null;
}
function rollChestLoot(grade) {
  const pool = CHEST_LOOT[grade];
  const [mn, mx] = CHEST_COUNT[grade];
  const n = mn + Math.floor(Math.random() * (mx - mn + 1));
  const totalW = pool.reduce((a, e) => a + e.w, 0);
  const out = [];
  for (let i = 0; i < n; i++) {
    let r = Math.random() * totalW;
    let e = pool[pool.length - 1];
    for (const cand of pool) { if (r < cand.w) { e = cand; break; } r -= cand.w; }
    if (e.stones) out.push({ kind: 'stones', amount: e.stones[0] + Math.floor(Math.random() * (e.stones[1] - e.stones[0] + 1)) });
    else out.push({ kind: 'item', itemId: e.item, qty: e.qty[0] + Math.floor(Math.random() * (e.qty[1] - e.qty[0] + 1)) });
  }
  return out;
}
// GĐ67: phẩm Linh thạch trong rương theo quái rơi ra (ý người chơi
// 24/10: Trung phẩm ở rương Trúc Cơ trung trở lên, Thượng phẩm ở rương
// Kim Đan hậu trở lên; rương LK vẫn chỉ Hạ phẩm). Phân biệt "phẩm
// rương" (C/B/A — số mục đồ) với "phẩm Linh thạch" (Hạ/Trung/Thượng).
const STAGE_ORDER = { so: 0, trung: 1, hau: 2 };
function stoneGradeForKind(kind) {
  const t = MONSTER_TYPES[kind];
  if (!t) return 'ha';
  if (t.minChestGrade) return 'cuc'; // GĐ69: rương boss → Cực phẩm (ý người chơi: Cực từ rương boss; trùm = minChestGrade: Khôi Lỗi + boss GDD)
  const ro = REALM_ORDER[t.realm || 'lk'] ?? 1;
  const so = STAGE_ORDER[t.stage || 'so'] ?? 0;
  if (ro >= 4) return 'thuong'; // Nguyên Anh / Hóa Thần trở lên
  if (t.realm === 'kd' && so >= 2) return 'thuong'; // Kim Đan hậu kỳ
  if (t.realm === 'tc' && so >= 1) return 'trung'; // Trúc Cơ trung kỳ trở lên
  if (t.realm === 'kd') return 'trung'; // Kim Đan sơ/trung kỳ
  return 'ha';
}
const STONE_GRADE_NAME = { ha: 'Hạ phẩm', trung: 'Trung phẩm', thuong: 'Thượng phẩm', cuc: 'Cực phẩm' };
function spawnChest(x, y, grade, mapId = HOME_MAP, stoneGrade = 'ha') {
  if (chests.size >= CHEST_MAX_UNOPENED) return null;
  chestSeq++;
  const c = { id: 'chest-' + chestSeq, x: Math.round(x), y: Math.round(y), grade, bornAt: Date.now(), mapId, stoneGrade };
  chests.set(c.id, c);
  return c;
}
function chestSyncState(c) {
  return { id: c.id, x: c.x, y: c.y, grade: c.grade };
}

// ---- Nhân vật (Giai đoạn 6) — công thức đúng file thiết kế (mục B3) ----
// 7 chỉ số: Khí huyết, Vật công, Vật phòng, Pháp công, Pháp phòng, Tốc độ, Thần thức
const STAT_KEYS = ['khiHuyet', 'vatCong', 'vatPhong', 'phapCong', 'phapPhong', 'tocDo', 'thanThuc'];
const FREE_POINTS_START = 10; // 10 điểm tự do chưa cộng (cộng ở giai đoạn sau)
// 9 lớp: dmgType quyết định chỉ số công dùng cho đánh thường
// (đúng file: Thể/Sát/Kiếm/Cốt = vật lý; Pháp/Quỷ/Nho/Y = phép; Phật tu căn cả hai phòng → công lấy chỉ số cao hơn)
const CLASSES = {
  thetu: { name: 'Thể tu', dmgType: 'physical' },
  phattu: { name: 'Phật tu', dmgType: 'both' },
  cottu: { name: 'Cốt tu', dmgType: 'physical' },
  satthu: { name: 'Sát thủ', dmgType: 'physical' },
  kiemtu: { name: 'Kiếm tu', dmgType: 'physical' },
  phaptu: { name: 'Pháp tu', dmgType: 'magic' },
  quytu: { name: 'Quỷ tu', dmgType: 'both' },
  ytu: { name: 'Y tu', dmgType: 'magic' },
  nhotu: { name: 'Nho tu', dmgType: 'magic' },
};

// ---- Vũ khí khởi đầu theo lớp (GĐ11) — đúng 2 bảng của file thiết kế:
// "Vũ khí khởi đầu" + "Vũ khí khởi đầu bổ sung (đề xuất)". speed: nhanh /
// trung / cham (hồi chiêu gốc theo file: 0,5s / 0,8s / 1,4s); dmg: nhãn mức
// sát thương mỗi đòn trong file (Thấp / Trung bình / Cao); ranged: vũ khí
// đánh xa theo mô tả lớp/vũ khí trong file. cat = loại hình vẽ phía client.
const WEAPON_SPEED_SEC = { nhanh: 0.5, trung: 0.8, cham: 1.4 };
const WEAPONS = {
  thetu: [
    { id: 'taykhong', name: 'Tay không', cat: 'fist', speed: 'nhanh', dmg: 'Thấp', mana: 'Ít', ranged: false, note: 'Đánh liên hoàn, hợp diệt quái nhỏ' },
    { id: 'chienphu', name: 'Chiến phủ', cat: 'axe', speed: 'cham', dmg: 'Cao', mana: 'Ít', ranged: false, note: 'Quét vòng, hợp đập quái lớn' },
    { id: 'cukiem', name: 'Cự kiếm', cat: 'sword', speed: 'cham', dmg: 'Cao', mana: 'Ít', ranged: false, note: 'Quét vòng, hợp đập quái lớn' },
    { id: 'daothe', name: 'Đao', cat: 'sword', speed: 'cham', dmg: 'Cao', mana: 'Ít', ranged: false, note: 'Quét vòng, hợp đập quái lớn' },
    { id: 'thuongthe', name: 'Thương', cat: 'spear', speed: 'trung', dmg: 'Trung bình', mana: 'Ít', ranged: false, note: 'Đâm thẳng về phía trước, tầm đánh dài' },
    { id: 'thietcon', name: 'Thiết côn', cat: 'staff', speed: 'trung', dmg: 'Trung bình', mana: 'Ít', ranged: false, note: 'Tầm đánh dài hơn tay không' },
  ],
  phattu: [
    { id: 'phatchau', name: 'Phật châu', cat: 'beads', speed: 'nhanh', dmg: 'Thấp', mana: 'Ít', ranged: true, note: 'Phối hợp đánh và thủ, có thể đánh xa' },
    { id: 'quyentruong', name: 'Quyền trượng', cat: 'staff', speed: 'cham', dmg: 'Cao', mana: 'Ít', ranged: true, note: 'Đánh chậm, có thể đánh xa' },
    { id: 'binhbat', name: 'Bình bát', cat: 'bowl', speed: 'trung', dmg: 'Thấp', mana: 'Ít', ranged: true, note: 'Úp bát đỡ đòn, ném ra đánh xa rồi thu về' },
  ],
  cottu: [
    { id: 'cotthuan', name: 'Cốt thuẫn', cat: 'shield', speed: 'cham', dmg: 'Thấp', mana: 'Ít', ranged: false, note: 'Khiên xương, đỡ đòn và đẩy lùi quái' },
    { id: 'cotchuy', name: 'Cốt chùy', cat: 'club', speed: 'trung', dmg: 'Trung bình', mana: 'Ít', ranged: false, note: 'Chùy xương, vừa đỡ vừa đánh' },
  ],
  quytu: [
    { id: 'colenh', name: 'Cờ lệnh', cat: 'flag', speed: 'trung', dmg: 'Trung bình', mana: 'Trung bình', ranged: true, note: 'Gọi và điều khiển quỷ hồn đánh thay' },
    { id: 'luoihai', name: 'Lưỡi hái', cat: 'sickle', speed: 'cham', dmg: 'Cao', mana: 'Ít', ranged: false, note: 'Cận chiến, chém quét vòng cung' },
    { id: 'quythuong', name: 'Quỷ thương', cat: 'spear', speed: 'trung', dmg: 'Trung bình', mana: 'Ít', ranged: false, note: 'Vũ khí dài, đâm xa cận chiến' },
  ],
  satthu: [
    { id: 'daogam', name: 'Dao găm', cat: 'dagger', speed: 'nhanh', dmg: 'Thấp', mana: 'Ít', ranged: false, note: 'Độ chính xác cao' },
    { id: 'songdao', name: 'Song đao', cat: 'dual', speed: 'nhanh', dmg: 'Thấp', mana: 'Ít', ranged: false, note: 'Đánh liên tục' },
    { id: 'liemngan', name: 'Liềm ngắn', cat: 'sickle', speed: 'trung', dmg: 'Thấp', mana: 'Ít', ranged: false, note: 'Móc kéo kẻ địch lại gần' },
    { id: 'trao', name: 'Trảo', cat: 'claw', speed: 'nhanh', dmg: 'Thấp', mana: 'Ít', ranged: false, note: 'Móng vuốt, đánh liên tục' },
  ],
  kiemtu: [
    { id: 'kiem', name: 'Kiếm', cat: 'sword', speed: 'trung', dmg: 'Cao', mana: 'Trung bình', ranged: false, note: 'Mạnh, nhanh, nhưng khó luyện' },
    { id: 'songkiem', name: 'Song kiếm', cat: 'dual', speed: 'nhanh', dmg: 'Thấp', mana: 'Ít', ranged: false, note: 'Cận chiến linh hoạt' },
    { id: 'trongkiem', name: 'Trọng kiếm', cat: 'sword', speed: 'cham', dmg: 'Cao', mana: 'Trung bình', ranged: false, note: 'Chém nặng, hắt lùi' },
  ],
  phaptu: [
    { id: 'phien', name: 'Phiến', cat: 'fan', speed: 'nhanh', dmg: 'Thấp', mana: 'Ít', ranged: true, note: 'Niệm nhanh, đánh liên tục' },
    { id: 'phaptruong', name: 'Pháp trượng', cat: 'staff', speed: 'cham', dmg: 'Cao', mana: 'Trung bình', ranged: true, note: 'Niệm lâu nhưng đau' },
    { id: 'sachphep', name: 'Sách phép', cat: 'book', speed: 'nhanh', dmg: 'Cao', mana: 'Nhiều', ranged: true, note: 'Mạnh nhất nhưng cạn linh lực nhanh' },
  ],
  ytu: [
    { id: 'phattran', name: 'Phất trần', cat: 'fan', speed: 'trung', dmg: 'Thấp', mana: 'Ít', ranged: true, note: 'Buff, debuff, hồi máu, khống chế' },
    { id: 'kimcham', name: 'Kim châm', cat: 'needle', speed: 'nhanh', dmg: 'Thấp', mana: 'Ít', ranged: true, note: 'Tầm xa, chính xác, gây debuff' },
    { id: 'cocam', name: 'Cổ cầm', cat: 'lute', speed: 'cham', dmg: 'Thấp', mana: 'Trung bình', ranged: true, note: 'Gảy đàn tạo vùng hồi máu hoặc buff' },
  ],
  nhotu: [
    { id: 'ngamtho', name: 'Ngâm thơ', cat: '', speed: 'nhanh', dmg: 'Thấp', mana: 'Trung bình', ranged: true, note: 'Dùng miệng đọc thơ, chữ phép tạo vùng ảnh hưởng' },
    { id: 'butphep', name: 'Bút phép', cat: 'brush', speed: 'nhanh', dmg: 'Thấp', mana: 'Trung bình', ranged: true, note: 'Viết chữ phép tầm xa' },
    { id: 'quyentruc', name: 'Quyển trục', cat: 'scroll', speed: 'cham', dmg: 'Thấp', mana: 'Trung bình', ranged: true, note: 'Mở quyển tạo vùng ảnh hưởng lớn' },
  ],
};
function weaponOf(classId, weaponId) {
  const list = WEAPONS[classId] || [];
  return list.find((w) => w.id === weaponId) || list[0] || null;
}
const ATTACK_RANGE_RANGED = 150; // tầm đánh thường của vũ khí tầm xa (px)

// Công thức suy ra (file thiết kế B3)
const maxHpOf = (s) => (s.maxHpOverride ? Math.round(s.maxHpOverride) : 100 + s.khiHuyet * 10); // HP tối đa = 100 + Khí huyết × 10; GĐ137: thú thuần hóa giữ máu gốc của thú hoang (40/20...) nên cần override — người chơi không bao giờ có key này nên không đổi hành vi cũ
const maxMpOf = (s) => s.thanThuc * 10; // Chân nguyên tối đa = Thần thức × 10

// GĐ119 bước 2: chỉ số hiệu dụng từ trang bị đang mặc.
// - attack cộng vào CẢ vatCong lẫn phapCong (trang bị spec dùng 1 chỉ số
//   công chung, game tách vật/pháp — cộng cả 2 để mọi lớp đều hưởng).
// - defense cộng vào CẢ vatPhong lẫn phapPhong (cùng lý do).
// - hp/mp cộng phẳng vào máu/chân nguyên tối đa (như tamBo cộng phẳng).
// - speed cộng vào tocDo (tốc chạy + giảm hồi chiêu qua speedOf/cdrOf).
// - crit CHỈ lưu chỉ số (chưa móc combat — theo mặc định đã duyệt).
// gearStats được cache trên player (tính lúc login + sau mỗi lần mặc/tháo);
// actor không có đồ (bot/pet/quái) thì totals = 0 nên mọi hàm eff = hàm gốc.
function gearTotalsOf(p) {
  const totals = { attack: 0, defense: 0, hp: 0, mp: 0, speed: 0, crit: 0 };
  const bag = (p && p.gearBag) || {};
  const worn = (p && p.gear) || {};
  for (const uid of Object.values(worn)) {
    const item = bag[uid];
    if (!item) continue;
    const calc = GEAR.calcGearStats(item);
    for (const [stat, v] of Object.entries(calc.final)) totals[stat] = (totals[stat] || 0) + v;
    if (calc.talentBonus.crit) totals.crit += calc.talentBonus.crit;
  }
  return totals;
}
function refreshGearStats(p) { p.gearStats = gearTotalsOf(p); }
function effStatsOf(p) {
  const g = (p && p.gearStats) || gearTotalsOf(p);
  const s = (p && p.stats) || {};
  const eff = { ...s,
    vatCong: (s.vatCong || 0) + (g.attack || 0),
    phapCong: (s.phapCong || 0) + (g.attack || 0),
    vatPhong: (s.vatPhong || 0) + (g.defense || 0),
    phapPhong: (s.phapPhong || 0) + (g.defense || 0),
    tocDo: (s.tocDo || 0) + (g.speed || 0) };
  // GĐ133: buff đan dược % cộng vào chỉ số hiệu dụng (gốc + đồ) — qua đây thì
  // đánh thường (attackStatOf), chiêu, pet theo chủ đều ăn buff cùng lúc.
  for (const def of Object.values(activeBuffsOf(p))) {
    if (def.mode === 'pct') for (const st of def.stats) eff[st] = Math.round(eff[st] * (1 + def.value));
  }
  return eff;
}
function maxHpEff(p) { let m = maxHpOf((p && p.stats) || {}) + (((p && p.gearStats) || gearTotalsOf(p)).hp || 0); const b = activeBuffsOf(p); if (b.hp) m += b.hp.value; return m; } // GĐ133: + buff Huyết Khí
function maxMpEff(p) { let m = maxMpOf((p && p.stats) || {}) + (((p && p.gearStats) || gearTotalsOf(p)).mp || 0); const b = activeBuffsOf(p); if (b.mp) m += b.mp.value; return m; } // GĐ133: + buff Nguyên Linh
// GĐ133: BUFF ĐAN DƯỢC CÓ THỜI HẠN — uống đan → chỉ số tăng trong X phút THẬT
// (đồng hồ thật, không phụ thuộc ngày game; bền qua restart vì buffs lưu file).
// Mỗi loại buff 1 key: uống đan khác loại thì cộng dồn, uống cùng loại thì
// LÀM MỚI thời hạn (refresh, không cộng dồn — như độc GĐ98). Mọi số TẠM.
const PILL_BUFFS = {
  atk: { name: 'Cuồng Bạo', icon: '🔥', desc: 'Vật công + Pháp công', stats: ['vatCong', 'phapCong'], mode: 'pct', value: 0.30, minutes: 30 },
  def: { name: 'Thiết Bích', icon: '🛡️', desc: 'Vật phòng + Pháp phòng', stats: ['vatPhong', 'phapPhong'], mode: 'pct', value: 0.30, minutes: 30 },
  hp: { name: 'Huyết Khí', icon: '❤️', desc: 'HP tối đa', maxStat: 'hp', mode: 'flat', value: 200, minutes: 60 },
  mp: { name: 'Nguyên Linh', icon: '💧', desc: 'Chân nguyên tối đa', maxStat: 'mp', mode: 'flat', value: 200, minutes: 60 },
  spd: { name: 'Thần Tốc', icon: '💨', desc: 'Tốc độ', stats: ['tocDo'], mode: 'pct', value: 0.20, minutes: 30 },
  // GĐ136: bùa đi chung bảng buff (cùng cơ chế thời hạn + bền file + HUD) —
  // talatk cộng vào effStatsOf qua mode pct như đan; taldef KHÔNG qua chỉ số
  // mà móc ở hitPlayer (mode shield, effStatsOf/maxHpEff bỏ qua).
  talatk: { name: 'Cuồng Bạo', icon: '⚡', desc: 'Vật công + Pháp công', stats: ['vatCong', 'phapCong'], mode: 'pct', value: 0.50, minutes: 1 },
  taldef: { name: 'Kim Cang', icon: '💎', desc: 'Sát thương nhận', mode: 'shield', value: 0.50, minutes: 1 },
};
const PILL_BY_ITEM = { dan_bao_luc: 'atk', dan_thiet_bich: 'def', dan_huyet_khi: 'hp', dan_nguyen_linh: 'mp', dan_than_toc: 'spd',
  // GĐ136: bùa buff đi chung nhánh đan (cùng cơ chế buff có thời hạn) — khác
  // đan ở thời gian ngắn (60s) và cường độ mạnh (burst trận đánh, không phải buff dài)
  phu_cuong_bao: 'talatk', phu_kim_cang: 'taldef' };
function activeBuffsOf(p) { // buff đang còn hạn (lười: quá hạn coi như không có, tick sẽ dọn sau)
  const out = {};
  const b = p?.buffs;
  if (!b || typeof b !== 'object') return out;
  const now = Date.now();
  for (const [key, until] of Object.entries(b)) {
    if (PILL_BUFFS[key] && until > now) out[key] = PILL_BUFFS[key];
  }
  return out;
}
function pruneBuffs(p) { // xóa key hết hạn (cả key lạ); trả true nếu có gì bị xóa
  if (!p?.buffs || typeof p.buffs !== 'object') return false;
  const now = Date.now();
  let pruned = false;
  for (const [key, until] of Object.entries(p.buffs)) {
    if (!PILL_BUFFS[key] || until <= now) { delete p.buffs[key]; pruned = true; }
  }
  return pruned;
}
function activeBuffsPayload(p) { // mảng buff đang còn hạn cho client/HUD (key, tên, icon, until)
  const out = [];
  const b = p?.buffs;
  if (!b || typeof b !== 'object') return out;
  const now = Date.now();
  for (const [key, until] of Object.entries(b)) {
    if (PILL_BUFFS[key] && until > now) out.push({ key, name: PILL_BUFFS[key].name, icon: PILL_BUFFS[key].icon, until });
  }
  return out;
}
// GĐ134: LUYỆN KHÍ SƯ TỰ RÈN — rèn ngay (không chờ như đặt rèn NPC), hỏng mất
// nguyên liệu. Khác đặt rèn NPC ở 3 điểm: cần nghề Luyện Khí Sư + cấp phẩm,
// làm ở đâu cũng được (không cần đứng gần Thợ Rèn), phẩm tối đa theo cấp nghề.
// Nguyên liệu chính là quặng GĐ132 (bậc quặng khóa phẩm theo map tới được).
// Mọi số TẠM.
const PLAYER_FORGE = {
  TRANG: { rank: 1, rate: 0.95, stones: 10, mats: { quang_sat: 2 } },
  XAM: { rank: 2, rate: 0.90, stones: 20, mats: { quang_sat: 3 } },
  LUC: { rank: 4, rate: 0.85, stones: 40, mats: { quang_sat: 5 } },
  LAM: { rank: 6, rate: 0.80, stones: 80, mats: { quang_dong: 3 } },
  TIM: { rank: 8, rate: 0.75, stones: 150, mats: { quang_dong: 5 } },
  CAM: { rank: 10, rate: 0.70, stones: 300, mats: { quang_bac: 3 } },
  DO: { rank: 12, rate: 0.65, stones: 600, mats: { quang_bac: 5 } },
  DEN: { rank: 13, rate: 0.60, stones: 1200, mats: { quang_bac: 8, da_quy: 2 } },
  VO: { rank: 14, rate: 0.50, stones: 3000, mats: { quang_bac: 12, da_quy: 5, tinh_huyet: 2 } },
};

// GĐ119 bước 4: đồ rơi (rương/nhiệm vụ) luôn theo hướng tu + hệ của người
// chơi (đồ thưởng mà không mặc được thì vô nghĩa); shop thì ngẫu nhiên hoàn
// toàn (người chơi tự chọn món hợp mình); rèn thì tự thiết kế hoàn toàn.
function gearPathFor(p) { return GEAR.CLASS_TO_PATH[p.classId] || p.path || 'THE_TU'; }
function gearElementFor(p) {
  const main = p.linhCan?.main;
  if (main) { const id = GEAR.normElement(main); if (id) return id; }
  const ce = CLASS_ELEMENT[p.classId];
  return (ce && GEAR.normElement(ce)) || 'VO';
}
function randomGearFor(p, rarityPool) {
  const rarity = rarityPool[Math.floor(Math.random() * rarityPool.length)];
  const slot = GEAR.SLOTS[Math.floor(Math.random() * GEAR.SLOTS.length)];
  let weapon = null;
  if (slot === 'WEAPON') {
    const list = GEAR.WEAPONS[gearPathFor(p)] || [];
    weapon = list.length ? list[Math.floor(Math.random() * list.length)].id : null;
  }
  return GEAR.generateGear({ path: gearPathFor(p), element: gearElementFor(p), rarity, slot, weapon });
}
const mpRegenOf = (s) => 2 + s.thanThuc * 0.2; // hồi Chân nguyên/giây — GĐ76: CHỈ dùng khi ngồi thiền (không còn hồi tự động)
// GĐ76: THIỀN + LINH MẠCH — thay cơ chế Tu vi đánh quái (người chơi chốt 25/10).
// - Ngồi thiền: sau 5s không gây/nhận sát thương mới được ngồi; ngồi yên hồi
//   máu + chân nguyên từ từ (ít); di chuyển/đánh/bị đánh/né/dịch chuyển là ngắt.
// - Tu vi mới: thiền tại nơi linh khí (sân Đạo Quán/Tụ Linh Trận, điểm linh
//   mạch) → +1 Tu vi / 30s, trần 15 / ngày game. MỌI SỐ đều TẠM.
const MEDITATE_COMBAT_MS = 5000;
const MEDITATE_SPOT_RADIUS = 90;
const MEDITATE_TUVI_SEC = 30;
const MEDITATE_TUVI_DAY_CAP = 15;
const MEDITATE_HP_PCT_PER_S = 0.01; // 1% máu tối đa / giây (TẠM, ít)
// GĐ78: ĐÓI/KHÁT — thay Suy nhược GĐ77 (người chơi yêu cầu 25/10: bỏ suy nhược).
// Thức ăn + Nước uống 0–100, bắt đầu 100; CHỈ hồi bằng ăn/uống (không tự hồi).
// Hao khi giao tranh (thức ăn 1/60s, nước 1/45s) và khi chế tạo thành công (−2/−2).
// Hết 1 trong 2 → thiền không hồi máu/chân nguyên (Tu vi vẫn lên).
// Kim Đan trở lên tịch cốc: thanh ẩn, không hao, ăn vào bị từ chối. MỌI SỐ đều TẠM.
const NEED_FOOD_MS_PER_POINT = 60000;
const NEED_WATER_MS_PER_POINT = 45000;
const NEED_CRAFT_DRAIN = 2;
const NEED_WARN_BELOW = 20;
const NEED_SCALE = Math.max(0.01, Number(process.env.TTT_NEED_SCALE || 1) || 1); // probe tăng tốc
function needsKd(p) { return ['kd', 'na', 'ht'].includes(p.realm || 'pham'); } // Kim Đan+ tịch cốc
const HOME_SPOTS = [{ x: 600, y: 1000 }, { x: 1100, y: 1000 }]; // điểm linh mạch làng (đất trống phía nam)
function spiritPlaceOf(p) {
  const mapId = mapOf(p);
  if (mapId === HOME_MAP) {
    if (Math.hypot(p.x - 700, p.y - 196) <= 120) return 'tulinh'; // sân Đạo Quán / Tụ Linh Trận
    if (HOME_SPOTS.some((s) => Math.hypot(p.x - s.x, p.y - s.y) <= MEDITATE_SPOT_RADIUS)) return 'linhmach';
    return null;
  }
  const rt = MAP_RUNTIME.get(mapId);
  if (rt && rt.spots && rt.spots.some((s) => Math.hypot(p.x - s.x, p.y - s.y) <= MEDITATE_SPOT_RADIUS)) return 'linhmach';
  return null;
}
function stopMeditation(p, why) {
  if (!p || !p.meditating) return;
  p.meditating = false;
  p.meditAcc = 0;
  io.to(p.id).emit('meditate_state', { on: false });
  if (why === 'hit') io.to(p.id).emit('notice', { text: 'Bị đánh trúng — dứt thiền!' });
}
const cdrOf = (s) => (0.4 * s.tocDo) / (s.tocDo + 100); // giảm hồi chiêu
const speedOf = (s) => SPEED * (1 + (0.2 * s.tocDo) / (s.tocDo + 100)); // tốc độ chạy theo Tốc độ
function attackStatOf(char) {
  const eff = effStatsOf(char); // GĐ119: công hiệu dụng (gốc + đồ mặc)
  const t = CLASSES[char.classId]?.dmgType || 'physical';
  if (t === 'magic') return { value: eff.phapCong, type: 'magic' };
  if (t === 'both') {
    return eff.vatCong >= eff.phapCong
      ? { value: eff.vatCong, type: 'physical' }
      : { value: eff.phapCong, type: 'magic' };
  }
  return { value: eff.vatCong, type: 'physical' };
}
// Sát thương nhận = thô × 100/(100 + Phòng tương ứng), tối thiểu 1
function damageThrough(raw, def) {
  return Math.max(1, Math.round((raw * 100) / (100 + def)));
}

// ---- Tu luyện (Giai đoạn 7) — số liệu theo file thiết kế ----
const ELEMENTS = ['Kim', 'Mộc', 'Thủy', 'Hỏa', 'Thổ'];
// Tỷ lệ linh căn: Đơn 10% / Song 30% / Tam 25% / Tứ 30% / Ngũ 5%
const LINHCAN_TABLE = [[1, 0.1], [2, 0.4], [3, 0.65], [4, 0.95], [5, 1.0]];
function rollLinhCan() {
  const r = Math.random();
  const count = (LINHCAN_TABLE.find(([, cum]) => r <= cum) || [5])[0];
  const pool = [...ELEMENTS];
  const elements = [];
  for (let i = 0; i < count; i++) {
    elements.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
  }
  return { elements, main: elements[0], count }; // hệ đầu tiên bốc được = hệ chính
}
const TU_VI_PER_KILL = 3; // quái Yếu (Sói Xám) +3 Tu vi — đúng file
const TU_VI_NEED_BASE = Number(process.env.TTT_TUVI_NEED) || 200; // env chỉ để test nhanh
const tuViNeed = (tier) => Math.round(TU_VI_NEED_BASE * Math.pow(1.12, tier - 1)); // tầng n: 200 × 1.12^(n−1)
// GĐ19 — Thang đột phá 18 bước (thiết kế gốc B6): bước toàn cục LK t = t, TC t = 9 + t.
// Đích Trung cảnh: bước 4, 7, 13, 16. Đại cảnh: LK9→TC1 (điểm 12). GĐ87: TC9→Kim Đan mở theo mẫu Đại;
// trong Kim Đan chỉ có tiểu cảnh (bước 19–27), Nguyên Anh chưa mở.
const globalStep = (realm, tier) => (realm === 'lk' ? tier : realm === 'tc' ? 9 + tier : realm === 'kd' ? 18 + tier : realm === 'na' ? 27 + tier : realm === 'ht' ? 36 + tier : 0);
const tuViNeedStep = (step) => Math.round(TU_VI_NEED_BASE * Math.pow(1.12, step - 1));
function breakInfoFor(realm, tier) {
  if (realm !== 'lk' && realm !== 'tc' && realm !== 'kd') return null;
  // GĐ20: lifespan = số năm TUỔI THỌ cộng thêm đúng thang B6 (Trung LK +5, Trung TC +10, Đại +50)
  if (realm === 'lk' && tier >= 9) return { type: 'dai', toRealm: 'tc', toTier: 1, points: 12, lifespan: 50, pill: 'dan_truc_co', trial: 'dai' };
  // GĐ87: Trúc Cơ 9 → Kim Đan theo mẫu Đại (đan mới + thử thách Lôi Kiếp + tỉ lệ; điểm/thọ là số TẠM)
  if (realm === 'tc' && tier >= 9) return { type: 'kimdan', toRealm: 'kd', toTier: 1, points: 15, lifespan: 100, pill: 'dan_ket_dan', trial: 'kimdan' };
  // GĐ87: trong Kim Đan chỉ có tiểu cảnh (Nguyên Anh chưa mở)
  if (realm === 'kd' && tier >= 9) return { type: 'blocked_na' };
  if (realm === 'kd') return { type: 'tieu', points: 5, lifespan: 0 };
  const dest = globalStep(realm, tier) + 1;
  if ([4, 7, 13, 16].includes(dest)) return { type: 'trung', points: realm === 'lk' ? 5 : 6, lifespan: realm === 'lk' ? 5 : 10, pill: 'dan_trung_canh', trial: 'trung' };
  return { type: 'tieu', points: realm === 'lk' ? 3 : 4, lifespan: 0 };
}
// Tinh anh cùng bậc (điểm tham chiếu trùm thử thách): nội suy từ Thạch Quái (Mạnh: HP 140 / công 10)
const eliteHpAt = (step) => Math.round(140 * Math.pow(1.12, step - 1));

// ---- GĐ20: Đồng hồ thế giới (dùng chung toàn server) ----
// Người chơi chốt 22/10: 1 ngày game = 24 phút thật, nhưng ĐÊM TRÔI NHANH HƠN
// NGÀY (đêm ít hoạt động hơn). Chia chu kỳ: ban ngày 06:00–18:00 chiếm 2/3
// (16 phút → 1 giờ game = 80 giây thật); ban đêm 18:00–06:00 chiếm 1/3
// (8 phút → 1 giờ game = 40 giây thật, nhanh gấp đôi). Ngày mới bắt đầu 00:00.
// 1 năm = 12 tháng × 30 ngày = 360 ngày. Đồng hồ lưu ở world.json và CHẠY TIẾP
// theo thời gian thật trong lúc server tắt (mở lại cộng dồn đúng phần đã trôi).
// Env chỉ để test: TTT_DAY_REAL_MS (rút ngắn 1 ngày), TTT_WORLD_FILE (file
// đồng hồ riêng), TTT_WORLD_START_MINUTES (phút trong ngày khi tạo thế giới mới).
const DAY_REAL_MS = Number(process.env.TTT_DAY_REAL_MS) || 24 * 60 * 1000;
const DAY_SEGMENT_MS = (DAY_REAL_MS * 2) / 3; // đoạn ngày 06:00–18:00
const NIGHT_SEGMENT_MS = DAY_REAL_MS / 3; // đoạn đêm 18:00–06:00
const WORLD_FILE = process.env.TTT_WORLD_FILE || path.join(__dirname, 'data', 'world.json');
// Tốc độ: số phút game trôi qua mỗi mili-giây thật, tùy đoạn ngày/đêm hiện tại
const gameRateAt = (minuteOfDay) =>
  minuteOfDay >= 360 && minuteOfDay < 1080 ? 720 / DAY_SEGMENT_MS : 720 / NIGHT_SEGMENT_MS;
// Đẩy thời gian game theo realElapsedMs thật, tôn trọng tốc độ từng đoạn
// (gộp trọn chu kỳ 24 phút trước để server tắt lâu vẫn tính nhanh + đúng).
function advanceWorldMinutes(startMinutes, realElapsedMs) {
  let mins = startMinutes;
  let remain = realElapsedMs;
  const fullCycles = Math.floor(remain / DAY_REAL_MS);
  if (fullCycles > 0) {
    mins += fullCycles * 1440;
    remain -= fullCycles * DAY_REAL_MS;
  }
  let guard = 0;
  while (remain > 0.5 && guard++ < 8) {
    const mod = ((mins % 1440) + 1440) % 1440;
    const segEnd = mod < 360 ? 360 : mod < 1080 ? 1080 : 1440;
    const segGameLeft = segEnd - mod;
    const realNeeded = segGameLeft / gameRateAt(mod);
    if (remain >= realNeeded) {
      mins += segGameLeft;
      remain -= realNeeded;
    } else {
      mins += remain * gameRateAt(mod);
      remain = 0;
    }
  }
  return mins;
}
let worldMinutes = (() => {
  const startMin = Math.min(1439, Math.max(0, Number(process.env.TTT_WORLD_START_MINUTES) || 480)); // mặc định 08:00 ngày đầu
  try {
    const w = JSON.parse(fs.readFileSync(WORLD_FILE, 'utf8'));
    if (typeof w.totalMinutes === 'number' && typeof w.savedAt === 'number') {
      if (w.altarUsed && typeof w.altarUsed === 'object') altarUsed = w.altarUsed; // GĐ85
      return advanceWorldMinutes(w.totalMinutes, Math.max(0, Date.now() - w.savedAt));
    }
  } catch { /* chưa có file → thế giới mới bắt đầu ở startMin */ }
  return startMin;
})();
let lastWorldDayIndex = Math.floor(worldMinutes / 1440);
function saveWorld() {
  const snap = { totalMinutes: worldMinutes, savedAt: Date.now(), altarUsed }; // GĐ85: + lịch tế đàn
  storage.saveDoc('world', snap);
  try {
    fs.mkdirSync(path.dirname(WORLD_FILE), { recursive: true });
    fs.writeFileSync(WORLD_FILE, JSON.stringify(snap));
  } catch (e) {
    console.warn('[world] Không ghi được world.json:', e.message);
  }
}
const CANH_NAMES = ['Tý', 'Sửu', 'Dần', 'Mão', 'Thìn', 'Tỵ', 'Ngọ', 'Mùi', 'Thân', 'Dậu', 'Tuất', 'Hợi'];
function worldClock() {
  const total = Math.floor(worldMinutes);
  const dayIndex = Math.floor(total / 1440);
  const minuteOfDay = total - dayIndex * 1440;
  const hour = Math.floor(minuteOfDay / 60);
  const dayOfYear = dayIndex % 360;
  return {
    dayIndex,
    minuteOfDay,
    hour,
    minute: minuteOfDay % 60,
    day: (dayOfYear % 30) + 1,
    month: Math.floor(dayOfYear / 30) + 1,
    year: Math.floor(dayIndex / 360) + 1,
    canh: CANH_NAMES[Math.floor(((hour + 1) % 24) / 2)],
    isNight: hour >= 18 || hour < 6,
  };
}
// Tuổi + tuổi thọ nhân vật (GĐ20): khoảng roll đúng file thiết kế lúc tạo nhân
// vật (tuổi 10–25, tuổi thọ 50–100). Nhân vật cũ chưa có → TẠM 16 tuổi / thọ 80.
const rollAgeStart = () => 10 + Math.floor(Math.random() * 16);
const rollLifespan = () => 50 + Math.floor(Math.random() * 51);
const ageOf = (p) => {
  const now = worldClock().dayIndex;
  return (p.ageStart ?? 16) + Math.max(0, Math.floor((now - (p.birthDay ?? now)) / 360));
};
// GĐ25 — HẾT THỌ → TỌA HÓA (phương án B, người chơi chốt 22/10: "mềm cho
// MMO"): thọ ≤ 0 thì bắt đầu ÂN HẠN 30 ngày game kể từ khi nhân vật "biết"
// (đang online lúc thọ tận hoặc lần đăng nhập đầu tiên sau đó — nhân vật
// offline chưa đăng nhập thì ân hạn CHƯA chạy). Trong ân hạn vẫn chơi bình
// thường; đột phá cộng thọ (Trung +5/+10, Đại +50 theo B6) kéo thọ dương
// lại = ĐƯỢC CỨU, ân hạn hủy. Hết ân hạn mà thọ vẫn ≤ 0 → TỌA HÓA VĨNH
// VIỄN: nhân vật chết thật (khác chết thường — không hồi sinh), đồ đạc +
// Linh thạch mất theo nhân vật, tài khoản/khách được tạo nhân vật mới.
const GRACE_DAYS = 30;
const lifespanLeftOf = (p) => (p.lifespan ?? 80) - ageOf(p);
function graceDaysLeftOf(p) {
  if (p.graceStartDay == null) return null;
  return Math.max(0, GRACE_DAYS - (worldClock().dayIndex - p.graceStartDay));
}
// Trả: 'ok' | 'grace' | 'grace_started' | 'rescued' | 'die'
function checkLifespan(p) {
  const left = lifespanLeftOf(p);
  const today = worldClock().dayIndex;
  if (left > 0) {
    if (p.graceStartDay != null) {
      p.graceStartDay = null;
      persistPlayer(p);
      return 'rescued';
    }
    return 'ok';
  }
  if (p.graceStartDay == null) {
    p.graceStartDay = today;
    persistPlayer(p);
    return 'grace_started';
  }
  if (today - p.graceStartDay > GRACE_DAYS) return 'die';
  return 'grace';
}
function killCharacterPermanent(p) {
  const key = p.charKey || p.token;
  if (key && characters[key]) {
    characters[key].dead = true;
    characters[key].deadReason = 'toa_hoa';
    saveCharacters();
  }
  removeCompanionsOf(p);
  players.delete(p.id);
  console.log(`[tọa hóa] ${p.name} hết ân hạn thọ nguyên — tọa hóa vĩnh viễn`);
}
const eliteAtkAt = (step) => Math.round(10 * Math.pow(1.12, step - 1) * 10) / 10;
const DAO_QUAN_DOOR = { x: 700, y: 378 }; // điểm tương tác trước cửa Đạo Quán
const INTERACT_RANGE = 80;
// GĐ119 bước 5: Tiệm Rèn ở Làng Tân Thủ — mua sẵn, đặt rèn, nhận đồ,
// rèn lại đều cần đứng gần Thợ Rèn (cùng luật tầm 80px như tiệm thường).
const FORGE_POINT = { x: 620, y: 560 };
function nearForge(p) { return !!p && mapOf(p) === HOME_MAP && Math.hypot(p.x - FORGE_POINT.x, p.y - FORGE_POINT.y) <= INTERACT_RANGE; }
// GĐ21+GĐ22: điểm an toàn khi người chơi thoát game, theo NHÀ của nhân vật:
// chơi 1 mình → sân trước Đạo Quán; gia nhập Thanh Phong Môn → sân tông môn.
const REST_SPOT = { x: 700, y: 452 }; // giữ cho tương thích (mặc định Đạo Quán)
const REST_BASES = {
  daoquan: { x: 700, y: 452, label: 'Đạo Quán' },
  tongmon: { x: 1385, y: 592, label: 'Thanh Phong Môn' },
};
function restSpotFor(homeType, index) {
  const b = REST_BASES[homeType] || REST_BASES.daoquan;
  return { x: b.x + ((index % 5) - 2) * 38, y: b.y + Math.floor(index / 5) * 36 };
}
// GĐ23: TỤ LINH TRẬN ở Thiền Phòng phía sau Đạo Quán — nơi BẾ QUAN chủ động
// khi đang online. Tỉ lệ file: bế quan +3 Tu vi/ngày → cộng dồn theo phút
// game: +1 mỗi 480 phút game (8 giờ). Di chuyển / ra đòn / thoát game = dừng.
const TULINH = { x: 700, y: 196 };
const BEQUAN_MIN_PER_POINT = 480;
function setBequan(p, on) {
  if (!!p.bequan === on) return;
  p.bequan = on;
  if (!on) p.bequanAcc = 0;
  const sock = io.sockets.sockets.get(p.id);
  if (sock) {
    sock.emit('bequan_state', { on });
    syncChar(sock, p);
  }
}

// Catalog công pháp khởi đầu theo lớp — TÊN + CHỈ SỐ LÀ BẢN TẠM nằm trong
// khung bậc của file (Cơ bản: hệ số 1.0, CD 0.5–2s, tốn 5–15; Luyện Khí:
// hệ số 1.6, CD 3–8s, tốn 20–50) cho tới khi chuyển đủ 477 công pháp từ
// file dữ liệu. 2 chiêu Cơ bản nhận ngay khi đo linh căn; chiêu Luyện Khí
// học tại Đạo Quán từ Luyện Khí tầng 3 (điều kiện tạm).
const SKILLS = {
  thetu: [
    { id: 'thetu_1', name: 'Liên Hoàn Quyền', tier: 'coban', coef: 1.0, cdMs: 800, cost: 6, range: 55 },
    { id: 'thetu_2', name: 'Thiết Sơn Kháo', tier: 'coban', coef: 1.0, cdMs: 1500, cost: 10, range: 55 },
    { id: 'thetu_3', name: 'Băng Sơn Chưởng', tier: 'luyenkhi', coef: 1.6, cdMs: 5000, cost: 30, range: 60 },
    { id: 'thetu_4', name: 'Kim Cang Bất Hoại Công', tier: 'trucco', coef: 2.2, cdMs: 12000, cost: 80, range: 60 }, // GĐ31-sửa: công pháp Trúc Cơ (tên tạm, số theo khung bậc Trúc Cơ của file: hệ số 2.2, CD 10–20s, tốn 60–120)
  ],
  phattu: [
    { id: 'phattu_1', name: 'Kim Cang Chưởng', tier: 'coban', coef: 1.0, cdMs: 1000, cost: 8, range: 55 },
    { id: 'phattu_2', name: 'Phật Quang Ấn', tier: 'coban', coef: 1.0, cdMs: 1800, cost: 12, range: 120 },
    { id: 'phattu_3', name: 'Đại Lực Kim Cang Chỉ', tier: 'luyenkhi', coef: 1.6, cdMs: 6000, cost: 35, range: 120 },
    { id: 'phattu_4', name: 'Đại Bi Vô Lượng Ấn', tier: 'trucco', coef: 2.2, cdMs: 12000, cost: 80, range: 120 }, // GĐ31-sửa: công pháp Trúc Cơ (tên tạm, số theo khung bậc Trúc Cơ của file: hệ số 2.2, CD 10–20s, tốn 60–120)
  ],
  cottu: [
    { id: 'cottu_1', name: 'Cốt Thích', tier: 'coban', coef: 1.0, cdMs: 900, cost: 7, range: 55 },
    { id: 'cottu_2', name: 'Hủ Cốt Trảo', tier: 'coban', coef: 1.0, cdMs: 1600, cost: 11, range: 55 },
    { id: 'cottu_3', name: 'Bạch Cốt Xuyên Tâm', tier: 'luyenkhi', coef: 1.6, cdMs: 5500, cost: 32, range: 60 },
    { id: 'cottu_4', name: 'Cửu U Cốt Ngục', tier: 'trucco', coef: 2.2, cdMs: 12000, cost: 80, range: 60 }, // GĐ31-sửa: công pháp Trúc Cơ (tên tạm, số theo khung bậc Trúc Cơ của file: hệ số 2.2, CD 10–20s, tốn 60–120)
  ],
  satthu: [
    { id: 'satthu_1', name: 'Ảnh Thích', tier: 'coban', coef: 1.0, cdMs: 700, cost: 6, range: 55 },
    { id: 'satthu_2', name: 'Đoạn Hầu', tier: 'coban', coef: 1.0, cdMs: 1400, cost: 10, range: 55 },
    { id: 'satthu_3', name: 'Vô Ảnh Sát', tier: 'luyenkhi', coef: 1.6, cdMs: 4500, cost: 28, range: 60 },
    { id: 'satthu_4', name: 'Tuyệt Ảnh Đoạt Mệnh', tier: 'trucco', coef: 2.2, cdMs: 12000, cost: 80, range: 60 }, // GĐ31-sửa: công pháp Trúc Cơ (tên tạm, số theo khung bậc Trúc Cơ của file: hệ số 2.2, CD 10–20s, tốn 60–120)
  ],
  kiemtu: [
    { id: 'kiemtu_1', name: 'Kiếm Khí Trảm', tier: 'coban', coef: 1.0, cdMs: 1000, cost: 8, range: 120 },
    { id: 'kiemtu_2', name: 'Liên Kiếm Thức', tier: 'coban', coef: 1.0, cdMs: 1600, cost: 12, range: 60 },
    { id: 'kiemtu_3', name: 'Ngự Kiếm Quyết', tier: 'luyenkhi', coef: 1.6, cdMs: 5000, cost: 30, range: 160 },
    { id: 'kiemtu_4', name: 'Thiên Kiếm Vô Song', tier: 'trucco', coef: 2.2, cdMs: 12000, cost: 80, range: 160 }, // GĐ31-sửa: công pháp Trúc Cơ (tên tạm, số theo khung bậc Trúc Cơ của file: hệ số 2.2, CD 10–20s, tốn 60–120)
  ],
  phaptu: [
    { id: 'phaptu_1', name: 'Hỏa Cầu Thuật', tier: 'coban', coef: 1.0, cdMs: 1100, cost: 9, range: 150, element: 'Hỏa' },
    { id: 'phaptu_2', name: 'Băng Tiễn', tier: 'coban', coef: 1.0, cdMs: 1700, cost: 12, range: 150, element: 'Băng' },
    { id: 'phaptu_3', name: 'Lôi Đình Phá', tier: 'luyenkhi', coef: 1.6, cdMs: 6000, cost: 35, range: 170, element: 'Lôi' },
    { id: 'phaptu_4', name: 'Cửu Thiên Huyền Lôi', tier: 'trucco', coef: 2.2, cdMs: 12000, cost: 80, range: 170, element: 'Lôi' }, // GĐ31-sửa: công pháp Trúc Cơ (tên tạm, số theo khung bậc Trúc Cơ của file: hệ số 2.2, CD 10–20s, tốn 60–120)
  ],
  quytu: [
    { id: 'quytu_1', name: 'Âm Khí Trảo', tier: 'coban', coef: 1.0, cdMs: 900, cost: 8, range: 60 },
    { id: 'quytu_2', name: 'Quỷ Hỏa', tier: 'coban', coef: 1.0, cdMs: 1600, cost: 11, range: 140 },
    { id: 'quytu_3', name: 'Vạn Quỷ Phệ Tâm', tier: 'luyenkhi', coef: 1.6, cdMs: 6500, cost: 38, range: 150 },
    { id: 'quytu_4', name: 'Diêm La Quỷ Vực', tier: 'trucco', coef: 2.2, cdMs: 12000, cost: 80, range: 150 }, // GĐ31-sửa: công pháp Trúc Cơ (tên tạm, số theo khung bậc Trúc Cơ của file: hệ số 2.2, CD 10–20s, tốn 60–120)
  ],
  ytu: [
    { id: 'ytu_1', name: 'Kim Châm Thứ', tier: 'coban', coef: 1.0, cdMs: 1000, cost: 7, range: 140 },
    { id: 'ytu_2', name: 'Ngân Châm Liên Hoàn', tier: 'coban', coef: 1.0, cdMs: 1800, cost: 10, range: 140 },
    { id: 'ytu_3', name: 'Thiên Châm Vạn Vũ', tier: 'luyenkhi', coef: 1.6, cdMs: 5500, cost: 30, range: 160 },
    { id: 'ytu_4', name: 'Hồi Thiên Thánh Châm', tier: 'trucco', coef: 2.2, cdMs: 12000, cost: 80, range: 160 }, // GĐ31-sửa: công pháp Trúc Cơ (tên tạm, số theo khung bậc Trúc Cơ của file: hệ số 2.2, CD 10–20s, tốn 60–120)
  ],
  nhotu: [
    { id: 'nhotu_1', name: 'Mặc Kiếm', tier: 'coban', coef: 1.0, cdMs: 1000, cost: 8, range: 130 },
    { id: 'nhotu_2', name: 'Thi Vận Trảm', tier: 'coban', coef: 1.0, cdMs: 1700, cost: 11, range: 130 },
    { id: 'nhotu_3', name: 'Chính Khí Ca', tier: 'luyenkhi', coef: 1.6, cdMs: 6000, cost: 33, range: 150 },
    { id: 'nhotu_4', name: 'Hạo Nhiên Thiên Chương', tier: 'trucco', coef: 2.2, cdMs: 12000, cost: 80, range: 150 }, // GĐ31-sửa: công pháp Trúc Cơ (tên tạm, số theo khung bậc Trúc Cơ của file: hệ số 2.2, CD 10–20s, tốn 60–120)
  ],
};
const skillById = (classId, id) => (SKILLS[classId] || []).find((s) => s.id === id) || SKILL_BY_ID[id] || null;
// ===== GĐ32: TOÀN BỘ CÔNG PHÁP LUYỆN KHÍ + TRÚC CƠ theo cấu trúc file =====
// File thiết kế tổ chức bảng công pháp theo (LỚP × VŨ KHÍ), 7 cột: tên, hệ,
// bậc, điều kiện học, hồi chiêu, chân nguyên, mô tả. Bảng TÊN chi tiết nằm
// trong file Excel Du_lieu_game_tu_tien.xlsx (không có trên Drive, chưa được
// gửi kèm) — nên danh mục dưới đây dựng đủ KHUNG của file: mỗi vũ khí của mỗi
// lớp có 3 công pháp Luyện Khí + 2 công pháp Trúc Cơ; tên là tên tạm theo
// phong vị lớp/vũ khí; mọi con số nằm trong khung của file:
//   LK: hệ số 1.6, CD 3–8s, tốn gốc 20–50 · TC: hệ số 2.2, CD 10–20s, tốn 60–120
//   Điều kiện học (đúng mục của file): LK = 1 chỉ số 15–30 hoặc 2 chỉ số 15–20;
//   TC = cảnh giới Trúc Cơ + 1 chỉ số 35–50 hoặc 2 chỉ số 30–40.
//   Chân nguyên nhân HỆ SỐ THEO LỚP của file (Thể ×0.6, Phật ×0.7, Cốt ×0.5,
//   Sát ×0.7, Kiếm ×0.8, Pháp ×1.2, Quỷ ×1.0, Y ×1.1, Nho ×1.1).
const CLASS_MANA_FACTOR = { thetu: 0.6, phattu: 0.7, cottu: 0.5, satthu: 0.7, kiemtu: 0.8, phaptu: 1.2, quytu: 1.0, ytu: 1.1, nhotu: 1.1 };
for (const [cid, list] of Object.entries(SKILLS)) {
  for (const sk of list) sk.cost = Math.max(1, Math.round(sk.cost * (CLASS_MANA_FACTOR[cid] || 1)));
}
const CLASS_MAIN_STAT = { thetu: 'vatCong', phattu: 'phapCong', cottu: 'vatCong', satthu: 'vatCong', kiemtu: 'vatCong', phaptu: 'phapCong', quytu: 'phapCong', ytu: 'phapCong', nhotu: 'phapCong' };
const CLASS_ELEMENT = { thetu: 'Thổ', phattu: 'Kim', cottu: 'Thủy', satthu: 'Kim', kiemtu: 'Kim', phaptu: 'Hỏa', quytu: 'Thủy', ytu: 'Mộc', nhotu: 'Mộc' };
const STAT_NAMES = { khiHuyet: 'Khí huyết', vatCong: 'Vật công', vatPhong: 'Vật phòng', phapCong: 'Pháp công', phapPhong: 'Pháp phòng', tocDo: 'Tốc độ', thanThuc: 'Thần thức' };
const NAME_PRE = {
  thetu: { lk: ['Cương Sơn', 'Thiết Bích', 'Hổ Khiếu'], tc: ['Bá Thể', 'Thiên Quân'] },
  phattu: { lk: ['Kim Cang', 'Từ Vân', 'Phổ Độ'], tc: ['Đại Bi', 'Vô Lượng'] },
  cottu: { lk: ['Hủ Minh', 'Âm Sương', 'Phệ Hồn'], tc: ['Cửu U', 'Hoàng Tuyền'] },
  satthu: { lk: ['Ảnh Sát', 'Vô Thanh', 'Đoạn Mệnh'], tc: ['Tuyệt Ảnh', 'Thí Thần'] },
  kiemtu: { lk: ['Lưu Vân', 'Đoạn Thủy', 'Hồi Phong'], tc: ['Thiên Ngoại', 'Vạn Kiếm'] },
  phaptu: { lk: ['Liệt Diễm', 'Hàn Băng', 'Cuồng Lôi'], tc: ['Cửu Thiên', 'Diệt Thế'] },
  quytu: { lk: ['U Minh', 'Quỷ Khốc', 'Phệ Huyết'], tc: ['Diêm La', 'Tu La'] },
  ytu: { lk: ['Thanh Tâm', 'Hồi Xuân', 'Linh Tê'], tc: ['Hồi Thiên', 'Tạo Hóa'] },
  nhotu: { lk: ['Hạo Nhiên', 'Mặc Vận', 'Chính Khí'], tc: ['Thiên Chương', 'Thánh Ngôn'] },
};
const CAT_NOUN = { sword: 'Kiếm', dual: 'Song Nhận', dagger: 'Nhận', claw: 'Trảo', fist: 'Quyền', axe: 'Phủ', spear: 'Thương', staff: 'Trượng', club: 'Chùy', shield: 'Thuẫn', flag: 'Kỳ', sickle: 'Liềm', beads: 'Châu', bowl: 'Bát', fan: 'Phiến', book: 'Thiên Thư', needle: 'Châm', lute: 'Cầm Âm', brush: 'Bút', scroll: 'Quyển', '': 'Ngâm' };
const LK_SUFFIX = ['Quyết', 'Trảm', 'Vũ'];
const TC_SUFFIX = ['Vô Song', 'Quy Tông'];
const SEC_STATS = ['khiHuyet', 'thanThuc', 'tocDo', 'vatPhong', 'phapPhong'];
function buildCatalog() {
  const cat = {};
  for (const [cid, weapons] of Object.entries(WEAPONS)) {
    cat[cid] = {};
    const main = CLASS_MAIN_STAT[cid];
    const factor = CLASS_MANA_FACTOR[cid] || 1;
    weapons.forEach((w, wi) => {
      const noun = CAT_NOUN[w.cat] || 'Quyết';
      const range = w.ranged ? 160 : 60;
      const list = [];
      for (let i = 0; i < 3; i++) {
        const sec = SEC_STATS[(wi + i) % SEC_STATS.length];
        const cond = i === 2
          ? [{ stat: main, value: 15 + ((wi * 2 + i) % 5) }, { stat: sec, value: 15 + ((wi + i) % 4) }]
          : [{ stat: i === 1 ? sec : main, value: 16 + ((wi * 3 + i * 4) % 13) }];
        list.push({
          id: `${cid}_${w.id}_lk${i + 1}`,
          name: `${NAME_PRE[cid].lk[i]} ${noun} ${LK_SUFFIX[i]}`,
          tier: 'luyenkhi', coef: 1.6,
          cdMs: [4000, 5500, 7000][i],
          cost: Math.max(1, Math.round([25, 35, 45][i] * factor)),
          range: w.ranged ? range + i * 5 : range,
          element: CLASS_ELEMENT[cid], weaponId: w.id, cond,
        });
      }
      for (let i = 0; i < 2; i++) {
        const sec = SEC_STATS[(wi + i + 2) % SEC_STATS.length];
        const cond = i === 1
          ? [{ stat: main, value: 30 + ((wi * 2) % 8) }, { stat: sec, value: 30 + ((wi + 3) % 9) }]
          : [{ stat: main, value: 36 + ((wi * 3 + i * 5) % 13) }];
        list.push({
          id: `${cid}_${w.id}_tc${i + 1}`,
          name: `${NAME_PRE[cid].tc[i]} ${noun} ${TC_SUFFIX[i]}`,
          tier: 'trucco', coef: 2.2,
          cdMs: [12000, 16000][i],
          cost: Math.max(1, Math.round([70, 100][i] * factor)),
          range: w.ranged ? 170 : 65,
          element: CLASS_ELEMENT[cid], weaponId: w.id, cond,
        });
      }
      cat[cid][w.id] = list;
    });
  }
  return cat;
}
const SKILL_CATALOG = buildCatalog();
// GĐ33: NẠP DỮ LIỆU THẬT từ file thiết kế — assets/extract_skills.py trích
// toàn bộ bảng công pháp trong docx (477 chiêu: 56 Cơ bản / 277 Luyện Khí /
// 144 Trúc Cơ; bảng Thể tu dùng chung cho Chiến phủ/Cự kiếm/Đao nên khi trải
// theo vũ khí thành 511 mục) vào server/data/skills_catalog.json. Có file này
// thì dùng dữ liệu thật thay cho danh mục dựng tạm ở GĐ32. Chân nguyên trong
// file là GIÁ GỐC → nhân hệ số lớp tại đây như file quy định.
try {
  const real = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'skills_catalog.json'), 'utf8'));
  let n = 0;
  for (const [cid, byWeapon] of Object.entries(real)) {
    SKILL_CATALOG[cid] = {};
    const factor = CLASS_MANA_FACTOR[cid] || 1;
    for (const [wid, list] of Object.entries(byWeapon)) {
      const w = (WEAPONS[cid] || []).find((x) => x.id === wid);
      SKILL_CATALOG[cid][wid] = list.map((s) => ({
        ...s,
        // GĐ34: chỉnh hệ số theo hiệu ứng cho cân bằng: đánh vùng ×0.7; nhiều
        // đòn chia lại (tổng ≈ ×1.3); choáng nặng ×0.9; chiêu thiên thủ ×0.85
        coef: (() => {
          let c = s.coef;
          const fx = s.fx || {};
          if (fx.aoe) c *= 0.7;
          if (fx.hits > 1) c = (c * 1.3) / fx.hits;
          if ((fx.stun || 0) >= 1.5) c *= 0.9;
          if (fx.defPct && !fx.stun && !fx.dotDps && !fx.aoe) c *= 0.85;
          return Math.round(c * 100) / 100;
        })(),
        cost: Math.max(1, Math.round((s.cost || 0) * factor)),
        range: w ? (w.ranged ? (s.tier === 'trucco' ? 170 : 160) : (s.tier === 'trucco' ? 65 : 60)) : 60,
      }));
      n += list.length;
    }
  }
  console.log(`[công pháp] Đã nạp ${n} chiêu THẬT từ file thiết kế (data/skills_catalog.json)`);
} catch (e) {
  console.log('[công pháp] Không có data/skills_catalog.json — dùng danh mục dựng tạm theo khung file');
}
// GĐ80: CÔNG PHÁP RIÊNG CỦA TÔNG — 500 chiêu cho 30 tông mới
// (nhỏ 10, vừa 20, lớn 30; tên + id duy nhất toàn cục, sinh bởi
// shottools/gen_sect_skills.py). Học duy nhất qua Sứ Giả (via:'sect').
let SECT_SKILLS = {};
try {
  SECT_SKILLS = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'sect_skills.json'), 'utf8'));
  const nSect = Object.values(SECT_SKILLS).reduce((a, l) => a + l.length, 0);
  console.log(`[công pháp] Đã nạp ${nSect} chiêu tông môn (data/sect_skills.json)`);
} catch (e) {
  console.log('[công pháp] Không có data/sect_skills.json — tông mới chưa có công pháp riêng');
}
// GĐ88: THẦN THÔNG RIÊNG THEO LỚP (Kim Đan) — mỗi lớp 1 chiêu, tự lĩnh ngộ
// khi đột phá Kim Đan (không học từ Sổ, không cần ngồi lĩnh ngộ).
// Hệ số 3.0 ngang Áo nghĩa, hồi chiêu 30s, tốn 100 Chân nguyên, tầm 170
// (Pháp tu 200) — mọi số TẠM, người chơi đổi tên/hiệu ứng tùy ý.
const KD_SKILLS = {
  thetu: [{ id: 'kd_the-tu', name: 'Kim Cang Bá Thể', tier: 'kimdan', coef: 3.0, cdMs: 30000, cost: 100, range: 170, cond: [], condText: 'Đạt Kim Đan', desc: 'Thần thông Thể tu: thân như kim cang, đòn đánh kèm hộ thể.', fx: { defPct: 50, defSec: 10 }, fxText: 'Giảm 50% sát thương nhận trong 10s' }],
  phattu: [{ id: 'kd_phat-tu', name: 'Phật Quang Phổ Độ', tier: 'kimdan', coef: 3.0, cdMs: 30000, cost: 100, range: 170, cond: [], condText: 'Đạt Kim Đan', desc: 'Thần thông Phật tu: phật quang phổ độ, vừa đánh vừa hồi phục.', fx: { healPct: 30 }, fxText: 'Hồi 30% máu tối đa' }],
  cottu: [{ id: 'kd_cot-tu', name: 'Vạn Cốt Triều Tông', tier: 'kimdan', coef: 3.0, cdMs: 30000, cost: 100, range: 170, cond: [], condText: 'Đạt Kim Đan', desc: 'Thần thông Cốt tu: vạn cốt triều tông, hút máu địch về mình.', fx: { lifesteal: 50 }, fxText: 'Hút 50% sát thương thành máu' }],
  satthu: [{ id: 'kd_sat-thu', name: 'Vô Ảnh Ám Sát', tier: 'kimdan', coef: 3.0, cdMs: 30000, cost: 100, range: 170, cond: [], condText: 'Đạt Kim Đan', desc: 'Thần thông Sát thủ: một đòn vô ảnh, đòn kế tiếp càng chí mạng.', fx: { nextMul: 2 }, fxText: 'Đòn kế tiếp ×2 sát thương' }],
  kiemtu: [{ id: 'kd_kiem-tu', name: 'Vạn Kiếm Quy Tông', tier: 'kimdan', coef: 3.0, cdMs: 30000, cost: 100, range: 170, cond: [], condText: 'Đạt Kim Đan', desc: 'Thần thông Kiếm tu: vạn kiếm quy tông, đánh mọi quái trong tầm.', fx: { aoe: 1 }, fxText: 'Đánh mọi quái trong tầm' }],
  phaptu: [{ id: 'kd_phap-tu', name: 'Ngũ Lôi Oanh Đỉnh', tier: 'kimdan', coef: 3.0, cdMs: 30000, cost: 100, range: 200, cond: [], condText: 'Đạt Kim Đan', desc: 'Thần thông Pháp tu: ngũ lôi oanh đỉnh, tầm xa nhất trong các thần thông.', fx: null, fxText: '' }],
  quytu: [{ id: 'kd_quy-tu', name: 'Quỷ Vụ Phệ Hồn', tier: 'kimdan', coef: 3.0, cdMs: 30000, cost: 100, range: 170, cond: [], condText: 'Đạt Kim Đan', desc: 'Thần thông Quỷ tu: quỷ vụ phệ hồn, hút trọn sát thương thành máu.', fx: { lifesteal: 100 }, fxText: 'Hút 100% sát thương thành máu' }],
  ytu: [{ id: 'kd_y-tu', name: 'Hồi Xuân Thánh Thủ', tier: 'kimdan', coef: 2.0, cdMs: 30000, cost: 100, range: 170, cond: [], condText: 'Đạt Kim Đan', desc: 'Thần thông Y tu: hồi xuân thánh thủ — đánh nhẹ nhưng hồi máu mạnh.', fx: { healPct: 50 }, fxText: 'Hồi 50% máu tối đa' }],
  nhotu: [{ id: 'kd_nho-tu', name: 'Hạo Nhiên Chính Khí', tier: 'kimdan', coef: 3.0, cdMs: 30000, cost: 100, range: 170, cond: [], condText: 'Đạt Kim Đan', desc: 'Thần thông Nho tu: hạo nhiên chính khí, tăng công bản thân sau đòn đánh.', fx: { atkPct: 30, atkSec: 12 }, fxText: 'Tăng 30% công trong 12s' }],
};
function condTextOf(sk) {
  if (!sk.cond) return '';
  return sk.cond.map((c) => `${STAT_NAMES[c.stat] || c.stat} ${c.value}`).join(' + ');
}
function condMetOf(p, sk) {
  if (!sk.cond) return true;
  return sk.cond.every((c) => (p.stats?.[c.stat] || 0) >= c.value);
}

// Bốc 7 chỉ số, mỗi chỉ số 1–10 (đúng luật tạo nhân vật của file)
function rollStats() {
  const s = {};
  for (const k of STAT_KEYS) s[k] = 1 + Math.floor(Math.random() * 10);
  return s;
}
const statTotal = (s) => STAT_KEYS.reduce((a, k) => a + s[k], 0);

// ---- Kinh tế + NPC + Nhiệm vụ (Giai đoạn 8) ----
// Giá cả là BẢN TẠM (file thiết kế không chốt giá); luật bán lại = 40% giá mua.
const ITEMS = {
  nanh_soi: { name: 'Nanh Sói' },
  dan_hoi_nguyen: { name: 'Đan Hồi Nguyên', desc: 'Dùng: hồi 50% Chân nguyên tối đa (GĐ76 — thay Đan Tụ Khí đã bỏ)' },
  // GĐ78: đồ ăn / thức uống — chỉ hồi thanh đói/khát (không hồi HP/MP)
  com_nam: { name: 'Cơm Nắm', desc: 'Dùng: +35 thức ăn (mua ở Tửu Lâu)' },
  thit_nuong: { name: 'Thịt Nướng', desc: 'Dùng: +60 thức ăn (mua ở Tửu Lâu)' },
  luong_kho: { name: 'Lương Khô', desc: 'Dùng: +25 thức ăn — lương thực mang theo đường (thương nhân lưu động bán)' },
  nuoc_loc: { name: 'Nước Lọc', desc: 'Dùng: +40 nước uống (mua ở Tửu Lâu / thương nhân lưu động)' },
  tra_thao_moc: { name: 'Trà Thảo Mộc', desc: 'Dùng: +60 nước uống (mua ở Tửu Lâu)' },
  ruou_gao: { name: 'Rượu Gạo', desc: 'Dùng: +30 nước uống (mua ở Tửu Lâu)' },
  dan_hoi_xuan: { name: 'Hồi Xuân Đan', desc: 'Dùng: hồi 50% HP tối đa' },
  dan_bao_luc: { name: 'Bạo Lực Đan', desc: 'Dùng: Vật công + Pháp công +30% trong 30 phút' }, // GĐ133: đan buff có thời hạn (Đan Sư chế)
  dan_thiet_bich: { name: 'Thiết Bích Đan', desc: 'Dùng: Vật phòng + Pháp phòng +30% trong 30 phút' }, // GĐ133
  dan_huyet_khi: { name: 'Huyết Khí Đan', desc: 'Dùng: HP tối đa +200 trong 60 phút' }, // GĐ133
  dan_nguyen_linh: { name: 'Nguyên Linh Đan', desc: 'Dùng: Chân nguyên tối đa +200 trong 60 phút' }, // GĐ133
  dan_than_toc: { name: 'Thần Tốc Đan', desc: 'Dùng: Tốc độ +20% trong 30 phút' }, // GĐ133
  canh_doi: { name: 'Cánh Dơi', desc: 'Cánh của Dơi Đen — Tiệm Nguyên Liệu thu mua, dùng trả nhiệm vụ' }, // GĐ38
  da_quy: { name: 'Đá Quý', desc: 'Đá quý rơi từ Thạch Quái — bán được giá cao' }, // GĐ38
  quang_sat: { name: 'Quặng Sắt', desc: 'Quặng sắt đào ngoài hoang — dùng rèn, luyện khí' }, // GĐ132: nguyên liệu đào khoáng (map Phàm/Luyện Khí)
  quang_dong: { name: 'Quặng Đồng', desc: 'Quặng đồng đào ngoài hoang — dùng rèn, luyện khí' }, // GĐ132: nguyên liệu đào khoáng (map Trúc Cơ)
  quang_bac: { name: 'Quặng Bạc', desc: 'Quặng bạc đào ngoài hoang — dùng rèn, luyện khí' }, // GĐ132: nguyên liệu đào khoáng (map Kim Đan trở lên)
  thao_duoc: { name: 'Thảo Dược', desc: 'Thảo dược hái ngoài hoang — dùng luyện đan' }, // GĐ132: nguyên liệu hái thuốc (map Phàm/Luyện Khí)
  linh_thao: { name: 'Linh Thảo', desc: 'Linh thảo hái ngoài hoang — dùng luyện đan' }, // GĐ132: nguyên liệu hái thuốc (map Trúc Cơ)
  tien_thao: { name: 'Tiên Thảo', desc: 'Tiên thảo hái ngoài hoang — dùng luyện đan cao cấp' }, // GĐ132: nguyên liệu hái thuốc (map Kim Đan trở lên)
  // GĐ96: Tẩm bổ Thể Tu — thịt/xương săn từ quái + 2 món nấu (chỉ Thể Tu ăn được)
  thit_thu: { name: 'Thịt Thú', desc: 'Thịt tươi săn từ quái — nguyên liệu Tẩm bổ (Thể Tu)' },
  xuong_thu: { name: 'Xương Thú', desc: 'Xương thú săn từ quái — nguyên liệu Tẩm bổ (Thể Tu)' },
  thit_ham_tam_bo: { name: 'Thịt Hầm Tẩm Bổ', desc: 'Dùng (Thể Tu): HP tối đa vĩnh viễn +10, +30 thức ăn (tối đa +100 HP)' },
  canh_xuong_tam_bo: { name: 'Canh Xương Tẩm Bổ', desc: 'Dùng (Thể Tu): Vật phòng vĩnh viễn +2, +30 thức ăn (tối đa +20 phòng)' },
  // GĐ98: Chế độc Sát Thủ — Nọc Rắn săn từ Độc Xà + 2 lọ độc bôi vũ khí (chỉ Sát Thủ dùng được)
  noc_ran: { name: 'Nọc Rắn', desc: 'Nọc độc lấy từ Độc Xà — nguyên liệu Chế độc (Sát Thủ)' },
  quang: { name: 'Quặng', desc: 'Quặng thô lấy từ thạch quái — nguyên liệu Dưỡng Kiếm (Kiếm Tu)' },
  tinh_huyet: { name: 'Tinh Huyết', desc: 'Tinh huyết quái thú — nguyên liệu Dưỡng Kiếm (Kiếm Tu)' },
  manh_xuong: { name: 'Mảnh Xương', desc: 'Mảnh xương quái thú — nguyên liệu Luyện Khôi Lõi (Cốt Tu)' },
  khoi_loi: { name: 'Khôi Lõi Xương', desc: 'Dùng (Cốt Tu): triệu hồi Cốt Vương vĩnh viễn — chuyên đỡ đòn cho chủ' },
  lo_doc_ria_mau: { name: 'Độc Rỉa Máu', desc: 'Dùng (Sát Thủ): bôi lên vũ khí — 10 đòn, đòn trúng bôi độc rỉa 5 máu/giây trong 5 giây' },
  lo_doc_kich_thich: { name: 'Độc Kích Thích', desc: 'Dùng (Sát Thủ): bôi lên vũ khí — 10 đòn, đòn trúng +5 Sát Khí thêm' },
  // GĐ19: đan đột phá (giá bán là TẠM — file thiết kế không ghi giá)
  dan_trung_canh: { name: 'Đan Trung Cảnh', desc: 'Đan bắt buộc để đột phá Trung cảnh (tầng 3→4, 6→7)' },
  dan_truc_co: { name: 'Đan Trúc Cơ', desc: 'Đan bắt buộc để đột phá Đại cảnh Luyện Khí 9 → Trúc Cơ' },
  dan_ket_dan: { name: 'Đan Kết Đan', desc: 'Đan bắt buộc để đột phá Kim Đan (Trúc Cơ 9 → Kim Đan)' }, // GĐ87
  dan_ho_mach: { name: 'Đan Hộ Mạch', desc: 'Dùng khi đột phá Đại cảnh: +10% tỉ lệ thành công (tự tiêu hao)' },
  // GĐ22: Tọa Thiền là CÔNG PHÁP TIỆN ÍCH (nhóm Hỗ trợ tu luyện) — phải kiếm
  // được sách mới học được, không ai dạy miễn phí lúc đo linh căn.
  sach_toa_thien: { name: 'Sách Tọa Thiền', desc: 'Công pháp tiện ích (Hỗ trợ tu luyện) — Dùng để học Tọa Thiền: thoát game sẽ ngồi thiền +3 Tu vi/ngày' },
  thu_tien_cu: { name: 'Thư Tiến Cử', desc: 'Hoàn thành 10 nhiệm vụ bảng mới được trao — vé vào Thiên Kiếm Môn (nộp khi gia nhập)' }, // GĐ30
  // GĐ26: sản phẩm NGHỀ PHỤ (chế tạo)
  phu_ho_than: { name: 'Phù Hộ Thân', desc: 'Dùng: hồi 40% HP tối đa' },
  phu_tu_linh: { name: 'Phù Tụ Linh', desc: 'Dùng: +20 Tu vi (cần linh căn)' },
  // GĐ136: 5 bùa Phù Sư — chế cần nghề, dùng thì ai cũng dùng được (như đan)
  phu_don_tho: { name: 'Phù Độn Thổ', desc: 'Dùng: dịch chuyển về cổng map đang đứng' },
  phu_cuong_bao: { name: 'Phù Cuồng Bạo', desc: 'Dùng: sát thương ×1,5 trong 60 giây' },
  phu_kim_cang: { name: 'Phù Kim Cang', desc: 'Dùng: sát thương nhận ×0,5 trong 60 giây' },
  phu_dinh_than: { name: 'Phù Định Thân', desc: 'Dùng: quái gần nhất (300px) đứng yên 5 giây' },
  phu_loi_kich: { name: 'Phù Lôi Kích', desc: 'Dùng: sét đánh quái gần nhất (300px), 100 sát thương phép' },
  nanh_tinh: { name: 'Nanh Sói Tinh Luyện', desc: 'Nguyên liệu đã tinh luyện — bán lại cho Tiệm Nguyên Liệu giá cao' },
  tran_ky: { name: 'Trận Kỳ Dịch Chuyển', desc: 'Dùng: dịch chuyển tức thời về quảng trường làng' },
  banh_thit: { name: 'Bánh Thịt Thú', desc: 'Dùng: hồi 25% HP tối đa' },
  da_soi: { name: 'Da Sói Khô', desc: 'Nguyên liệu thuộc da — bán lại cho Tiệm Nguyên Liệu' },
};
// GĐ26 — NGHỀ PHỤ (bản cơ bản): 5 nghề như bản cũ/file (Đan Sư, Luyện Khí
// Sư, Trận Pháp Sư, Phù Sư, Thú Sư). Học 1 nghề sau khi có linh căn; chế
// tạo từ Nanh Sói + Linh thạch (bản MMO hiện chỉ có nguyên liệu này — công
// thức là BẢN THÍCH ỨNG, file dùng Linh thổ/Hỏa tinh/Huyền thạch chưa có
// trong game). Mỗi lần chế THÀNH CÔNG +1 lượt; cấp nghề theo lượt chế:
// Thợ nghề ở 50, Sư phụ ở 200 (đúng mốc bản cũ), trần cấp theo cảnh giới
// (Sư phụ cần Trúc Cơ). Chế thất bại mất nguyên liệu.
const JOBS = {
  dansu: { name: 'Đan Sư', icon: '⚗️' },
  luyenkhi: { name: 'Luyện Khí Sư', icon: '🔨' },
  tranphap: { name: 'Trận Pháp Sư', icon: '🧭' },
  phusu: { name: 'Phù Sư', icon: '🧧' },
  thusu: { name: 'Thú Sư', icon: '🐾' },
  daokhoang: { name: 'Đào Khoáng Sư', icon: '⛏️' }, // GĐ132: nghề thu thập — đào mạch quặng
  haithuoc: { name: 'Hái Thuốc Sư', icon: '🌿' }, // GĐ132: nghề thu thập — hái bụi thuốc
};
const SKILL_BY_ID = Object.fromEntries([
  ...Object.values(SKILLS).flat(),
  ...Object.values(SKILL_CATALOG).flatMap((byWeapon) => Object.values(byWeapon).flat()),
  ...Object.values(SECT_SKILLS).flat(), // GĐ80: chiêu tông (học/tung/lắp đều qua đây)
  ...Object.values(KD_SKILLS).flat(), // GĐ88: thần thông Kim Đan (học/tung/lắp đều qua đây)
].map((s) => [s.id, s]));
// GĐ31/GĐ32 (luật người chơi chốt 22–23/10): HỌC CÔNG PHÁP = NGỒI LĨNH NGỘ.
// - Công pháp Luyện Khí: chỉ học ở ĐẠO QUÁN. Trúc Cơ trở lên: học ở MỌI NƠI.
// - Thời gian gốc: Luyện Khí NỬA NGÀY game, Trúc Cơ 2 NGÀY; Kim Đan 1–5 ngày
//   tùy cấp bậc (chưa có công pháp KD để áp). Rút ngắn theo LĨNH HỘI — một
//   nhánh của Thần thức: cần = gốc × 100/(100 + Thần thức).
// - DỪNG GIỮA CHỪNG vì bất cứ lý do gì lúc đang online (tự đứng dậy, di
//   chuyển, ra đòn, tung chiêu, BỊ ĐÁNH TRÚNG) → tiến độ VỀ 0, học lại từ đầu.
// - THOÁT GAME: nhân vật tự về chỗ an toàn và NGỒI HỌC TIẾP khi offline
//   (bản offline mang trạng thái 'learn', tiến độ vẫn chạy, xong thì ghi
//   nhận để báo lúc đăng nhập lại) — như ngồi thiền nhưng đây là học công pháp.
// - 2 chiêu Cơ bản vẫn trao ngay lúc đo linh căn (phần khởi đầu).
const LEARN_BASE_MIN = { luyenkhi: 720, trucco: 2880 };
function learnNeedMinFor(p, skill) {
  const base = skill?.tier === 'kimdan' ? (skill.learnDays || 3) * 1440 : (LEARN_BASE_MIN[skill?.tier] || 720);
  const tt = p.stats?.thanThuc || 0;
  return Math.max(60, Math.round(base * (100 / (100 + tt))));
}
function learningNeedMin(skill, p) {
  if (p?.learning?.needMin) return p.learning.needMin;
  return p ? learnNeedMinFor(p, skill) : (LEARN_BASE_MIN[skill?.tier] || 720);
}
function setLearningActive(p, on) {
  if (!!p.learningActive === on) return;
  p.learningActive = on;
  const sock = io.sockets.sockets.get(p.id);
  if (sock) {
    sock.emit('learning_state', { on });
    syncChar(sock, p);
  }
}
// Phá buổi lĩnh ngộ: tiến độ VỀ 0 (mọi lý do dừng lúc online đều mất tiến độ)
function breakLearning(p, byHit) {
  if (!p.learning || (!p.learningActive && !(p.learning.progressMin > 0))) return;
  p.learning.progressMin = 0;
  p.learningActive = false;
  const sk = SKILL_BY_ID[p.learning.skillId];
  const sock = io.sockets.sockets.get(p.id);
  if (sock) {
    sock.emit('notice', {
      text: byHit
        ? `💥 Bị đánh trúng — buổi lĩnh ngộ ${sk ? sk.name : ''} bị phá, tiến độ VỀ 0! Giết con quái gây rối rồi ngồi học lại từ đầu.`
        : `💨 Bạn đã đứng dậy — buổi lĩnh ngộ ${sk ? sk.name : ''} tan vỡ, tiến độ VỀ 0. Lần sau hãy ngồi yên học một mạch đến khi xong.`,
    });
    sock.emit('learning_state', { on: false });
    syncChar(sock, p);
  }
  persistPlayer(p);
  console.log(`[tu luyện] ${p.name} bị phá lĩnh ngộ (${byHit ? 'bị đánh' : 'tự dừng'}) — tiến độ về 0`);
}
// ===== GĐ36+37: Ô CÔNG PHÁP + 2 BẢNG CÔNG PHÁP + Ô ĐA DỤNG =====
// Ô chính theo file: LK 3 ô (tầng 7+ → 4), TC 4 ô (tầng 7+ → 5), KD+ 5.
// Người chơi có 2 BẢNG công pháp đổi qua lại (vd: bảng farm quái / bảng tu
// luyện); mỗi bảng gồm ô CHÍNH (chủ động) + 4 ô ĐA DỤNG nhỏ chứa công
// pháp hỗ trợ (buff thủ / hồi máu / phản / tăng công / đòn kế — nhận diện
// theo hiệu ứng của chiêu). 1 chiêu không lắp cùng lúc ở 2 khu của 1 bảng.
const UTIL_MAX = 4;
function slotCountFor(p) {
  if (p.realm === 'lk') return p.tier >= 7 ? 4 : 3;
  if (p.realm === 'tc') return p.tier >= 7 ? 5 : 4;
  if (p.realm === 'kd') return 6; // GĐ88: Kim Đan có ô công pháp thứ 6 (theo file thiết kế)
  if (p.realm === 'na' || p.realm === 'ht') return 5; // Nguyên Anh/Hóa Thần chưa mở — giữ 5 tới khi làm Nguyên Anh
  return 3;
}
// GĐ88: hệ số tầm đánh của Thần Thức Ngoại Phóng — Kim Đan tầng 4+ (Trung Kỳ) +20% (NA/HT giữ luôn)
function rangeMulOf(p) {
  return ((p.realm === 'kd' && (p.tier || 0) >= 4) || (REALM_ORDER[p.realm] ?? 0) > 3) ? 1.2 : 1;
}
function isUtilitySkill(sk) {
  const fx = sk?.fx;
  return !!(fx && (fx.defPct || fx.healPct || fx.reflect || fx.atkPct || fx.nextMul));
}
function boardsOf(p) {
  if (!Array.isArray(p.boards) || !p.boards[0]) {
    // Dựng lần đầu từ dữ liệu cũ: ô chính = equipped đã lưu; nhân vật từ
    // trước GĐ36 (chưa từng có equipped) → tự lắp các chiêu đầu đã học.
    // Việc này chỉ xảy ra ĐÚNG 1 LẦN khi dựng bảng — người chơi tháo trống
    // bảng sau này KHÔNG bị tự lắp lại.
    let main = [...(p.equipped || [])];
    if (!main.length && (p.skills || []).length) main = (p.skills || []).slice(0, slotCountFor(p));
    p.boards = [{ main: [...main], util: [] }, { main: [...main], util: [] }];
  }
  if (!p.boards[1]) p.boards[1] = { main: [], util: [] };
  if (p.activeBoard !== 1) p.activeBoard = 0;
  return p.boards;
}
function activeBoardOf(p) { return boardsOf(p)[p.activeBoard || 0]; }
function equippedOf(p) { return activeBoardOf(p).main; }
function normalizeEquipped(p) {
  const learned = p.skills || [];
  const boards = boardsOf(p);
  for (const b of boards) {
    b.main = (b.main || []).filter((id, i, a) => learned.includes(id) && a.indexOf(id) === i).slice(0, slotCountFor(p));
    b.util = (b.util || []).filter((id, i, a) => learned.includes(id) && a.indexOf(id) === i && !b.main.includes(id) && isUtilitySkill(skillById(p.classId, id))).slice(0, UTIL_MAX);
  }
  p.equipped = boards[p.activeBoard || 0].main; // gương tương thích ngược
  return p.equipped;
}
// Học xong 1 chiêu: bảng đang dùng còn ô chính trống thì tự lắp vào
function autoEquipIfFree(p, skillId) {
  normalizeEquipped(p);
  const main = equippedOf(p);
  if (!main.includes(skillId) && main.length < slotCountFor(p)) {
    main.push(skillId);
    p.equipped = main;
    return main.length; // số ô (1-based)
  }
  return 0;
}

function completeLearning(p, socket) {
  if (!p.learning) return;
  const sk = SKILL_BY_ID[p.learning.skillId];
  if (sk && !(p.skills || []).includes(sk.id)) {
    p.skills = [...(p.skills || []), sk.id];
  }
  const name = sk ? sk.name : p.learning.skillId;
  p.learning = null;
  p.learningActive = false;
  const slotNo = sk ? autoEquipIfFree(p, sk.id) : 0; // GĐ36
  if (!socket) p.learnedOfflineName = name; // GĐ32: học xong lúc offline → báo khi đăng nhập lại
  persistPlayer(p);
  if (socket) {
    if (sk) socket.emit('skill_learned', { skill: sk, equipped: slotNo > 0, slot: slotNo });
    socket.emit('notice', { text: slotNo > 0
      ? `📖 Lĩnh ngộ hoàn tất — bạn đã học được ${name}! (đã tự lắp vào ô ${slotNo})`
      : `📖 Lĩnh ngộ hoàn tất — bạn đã học được ${name}! Ô công pháp đã đầy — mở panel 📖 để lắp/tháo.` });
    socket.emit('learning_state', { on: false });
    syncChar(socket, p);
  }
  console.log(`[tu luyện] ${p.name} lĩnh ngộ xong ${name}`);
}
// Chuyển đổi hồ sơ GĐ31 bản đầu (learning dạng {readyDay} đếm ngày thụ động)
// sang dạng tiến độ phút của bản sửa; nếu đã quá hạn thì trao chiêu luôn.
function normalizeLearning(p, socket) {
  if (!p.learning || typeof p.learning.readyDay !== 'number') return;
  if (worldClock().dayIndex >= p.learning.readyDay) {
    const sk = SKILL_BY_ID[p.learning.skillId];
    if (sk && !(p.skills || []).includes(sk.id)) p.skills = [...(p.skills || []), sk.id];
    p.learning = null;
    persistPlayer(p);
    if (socket && sk) {
      socket.emit('skill_learned', { skill: sk });
      socket.emit('notice', { text: `📖 Lĩnh ngộ hoàn tất — bạn đã học được ${sk.name}!` });
    }
  } else {
    const sk = SKILL_BY_ID[p.learning.skillId];
    p.learning = { skillId: p.learning.skillId, progressMin: 0, needMin: sk ? learnNeedMinFor(p, sk) : 720 };
    persistPlayer(p);
  }
}
const JOB_RANK_NAMES = { 1: 'Nhất Phẩm', 2: 'Nhị Phẩm', 3: 'Tam Phẩm', 4: 'Tứ Phẩm', 5: 'Ngũ Phẩm', 6: 'Lục Phẩm', 7: 'Thất Phẩm', 8: 'Bát Phẩm', 9: 'Cửu Phẩm', 10: 'Thập Phẩm', 11: 'Thập Nhất Phẩm', 12: 'Thập Nhị Phẩm', 13: 'Đế Sư', 14: 'Thánh Sư' }; // GĐ131: thang 14 cấp — 12 phẩm + 2 cấp đặc biệt
const RECIPES = {
  rc_hoi_xuan: { jobId: 'dansu', name: 'Luyện Hồi Xuân Đan', inputs: { nanh_soi: 2 }, stones: 5, output: 'dan_hoi_xuan', rate: 0.9, minRank: 1 },
  rc_hoi_nguyen: { jobId: 'dansu', name: 'Luyện Đan Hồi Nguyên', inputs: { nanh_soi: 5 }, stones: 10, output: 'dan_hoi_nguyen', rate: 0.6, minRank: 3 }, // GĐ76: thay công thức Đan Tụ Khí đã bỏ
  // GĐ84: ĐAN ĐỘT PHÁ — Đan Sư chế từ nguyên liệu (đường song song với
  // mua ở tiệm; giá trị nguyên liệu + tỉ lệ hỏng ≈ giá tiệm — số TẠM).
  // Trung Cảnh cho đột phá LK 3→4 (sơ→trung) và 6→7 (trung→hậu).
  rc_trung_canh: { jobId: 'dansu', name: 'Luyện Đan Trung Cảnh', inputs: { nanh_soi: 10 }, stones: 20, output: 'dan_trung_canh', rate: 0.7, minRank: 1 },
  rc_truc_co: { jobId: 'dansu', name: 'Luyện Đan Trúc Cơ', inputs: { nanh_soi: 20, da_quy: 2 }, stones: 50, output: 'dan_truc_co', rate: 0.6, minRank: 3 },
  rc_ket_dan: { jobId: 'dansu', name: 'Luyện Đan Kết Đan', inputs: { nanh_soi: 30, da_quy: 5 }, stones: 200, output: 'dan_ket_dan', rate: 0.5, minRank: 3 }, // GĐ87
  rc_ho_mach: { jobId: 'dansu', name: 'Luyện Đan Hộ Mạch', inputs: { nanh_soi: 8, canh_doi: 2 }, stones: 15, output: 'dan_ho_mach', rate: 0.75, minRank: 3 },
  // GĐ133: ĐAN BUFF CÓ THỜI HẠN — nguyên liệu chính là thảo dược GĐ132 (bậc thảo
  // dược khóa công thức theo map tới được: Thảo Dược ở làng, Linh Thảo map TC,
  // Tiên Thảo map KD). Số TẠM.
  rc_huyet_khi: { jobId: 'dansu', name: 'Luyện Huyết Khí Đan', inputs: { thao_duoc: 3, nanh_soi: 2 }, stones: 15, output: 'dan_huyet_khi', rate: 0.85, minRank: 3 },
  rc_nguyen_linh: { jobId: 'dansu', name: 'Luyện Nguyên Linh Đan', inputs: { thao_duoc: 3, canh_doi: 2 }, stones: 15, output: 'dan_nguyen_linh', rate: 0.85, minRank: 3 },
  rc_bao_luc: { jobId: 'dansu', name: 'Luyện Bạo Lực Đan', inputs: { linh_thao: 2, nanh_soi: 2 }, stones: 20, output: 'dan_bao_luc', rate: 0.8, minRank: 2 },
  rc_thiet_bich: { jobId: 'dansu', name: 'Luyện Thiết Bích Đan', inputs: { linh_thao: 2, da_quy: 1 }, stones: 20, output: 'dan_thiet_bich', rate: 0.8, minRank: 2 },
  rc_than_toc: { jobId: 'dansu', name: 'Luyện Thần Tốc Đan', inputs: { tien_thao: 2, canh_doi: 2 }, stones: 30, output: 'dan_than_toc', rate: 0.75, minRank: 4 },
  rc_nanh_tinh: { jobId: 'luyenkhi', name: 'Tinh luyện Nanh Sói', inputs: { nanh_soi: 3 }, stones: 0, output: 'nanh_tinh', rate: 0.85, minRank: 1 },
  rc_tran_ky: { jobId: 'tranphap', name: 'Khắc Trận Kỳ Dịch Chuyển', inputs: { nanh_soi: 4 }, stones: 10, output: 'tran_ky', rate: 0.75, minRank: 1 },
  rc_phu_ho_than: { jobId: 'phusu', name: 'Vẽ Phù Hộ Thân', inputs: { nanh_soi: 3 }, stones: 8, output: 'phu_ho_than', rate: 0.8, minRank: 1 },
  rc_phu_tu_linh: { jobId: 'phusu', name: 'Vẽ Phù Tụ Linh', inputs: { nanh_soi: 5 }, stones: 12, output: 'phu_tu_linh', rate: 0.65, minRank: 3 },
  // GĐ136: 5 bùa mới — nguyên liệu/tỉ lệ/cấp TẠM
  rc_phu_don_tho: { jobId: 'phusu', name: 'Vẽ Phù Độn Thổ', inputs: { da_quy: 1, nanh_soi: 2 }, stones: 30, output: 'phu_don_tho', rate: 0.8, minRank: 2 },
  rc_phu_cuong_bao: { jobId: 'phusu', name: 'Vẽ Phù Cuồng Bạo', inputs: { canh_doi: 2 }, stones: 15, output: 'phu_cuong_bao', rate: 0.85, minRank: 1 },
  rc_phu_kim_cang: { jobId: 'phusu', name: 'Vẽ Phù Kim Cang', inputs: { da_quy: 1, canh_doi: 2 }, stones: 20, output: 'phu_kim_cang', rate: 0.8, minRank: 2 },
  rc_phu_dinh_than: { jobId: 'phusu', name: 'Vẽ Phù Định Thân', inputs: { canh_doi: 2, da_quy: 1 }, stones: 25, output: 'phu_dinh_than', rate: 0.8, minRank: 2 },
  rc_phu_loi_kich: { jobId: 'phusu', name: 'Vẽ Phù Lôi Kích', inputs: { nanh_soi: 3 }, stones: 20, output: 'phu_loi_kich', rate: 0.85, minRank: 1 },
  rc_banh_thit: { jobId: 'thusu', name: 'Nướng Bánh Thịt Thú', inputs: { nanh_soi: 2 }, stones: 4, output: 'banh_thit', rate: 0.9, minRank: 1 },
  rc_da_soi: { jobId: 'thusu', name: 'Thuộc Da Sói', inputs: { nanh_soi: 2 }, stones: 0, output: 'da_soi', rate: 0.9, minRank: 1 },
  // GĐ96: Tẩm bổ Thể Tu — tambo: true = cơ chế lớp, không cần nghề (xem craft_item); tỉ lệ/nguyên liệu TẠM
  rc_thit_ham_tam_bo: { jobId: 'thusu', tambo: true, name: 'Hầm Thịt Tẩm Bổ', inputs: { thit_thu: 3 }, stones: 10, output: 'thit_ham_tam_bo', rate: 0.9, minRank: 1 },
  rc_canh_xuong_tam_bo: { jobId: 'thusu', tambo: true, name: 'Nấu Canh Xương Tẩm Bổ', inputs: { xuong_thu: 3 }, stones: 10, output: 'canh_xuong_tam_bo', rate: 0.9, minRank: 1 },
  // GĐ98: Chế độc Sát Thủ — docduoc: true = cơ chế lớp, không cần nghề (xem craft_item); tỉ lệ/nguyên liệu TẠM
  rc_doc_ria_mau: { jobId: 'thusu', docduoc: true, name: 'Chế Độc Rỉa Máu', inputs: { noc_ran: 3 }, stones: 10, output: 'lo_doc_ria_mau', rate: 0.9, minRank: 1 },
  rc_doc_kich_thich: { jobId: 'thusu', docduoc: true, name: 'Chế Độc Kích Thích', inputs: { noc_ran: 2, canh_doi: 2 }, stones: 10, output: 'lo_doc_kich_thich', rate: 0.9, minRank: 1 },
  // GĐ99: Dưỡng Kiếm là cơ chế lớp Kiếm Tu — không cần nghề (kiểu tambo/docduoc).
  // Rèn xong TRANG BỊ NGAY, không qua túi (không có vật phẩm kiếm) — công thức không có output.
  rc_kiem_thanh_phong: { jobId: 'thusu', duongkiem: true, sword: 'thanh_phong', name: 'Rèn Thanh Phong Kiếm', inputs: { quang: 3, tinh_huyet: 3 }, stones: 10, rate: 0.9, minRank: 1 },
  rc_kiem_huyet_sat: { jobId: 'thusu', duongkiem: true, sword: 'huyet_sat', name: 'Rèn Huyết Sát Kiếm', inputs: { quang: 3, tinh_huyet: 3 }, stones: 10, rate: 0.9, minRank: 1 },
  rc_kiem_kim_cuong: { jobId: 'thusu', duongkiem: true, sword: 'kim_cuong', name: 'Rèn Kim Cương Kiếm', inputs: { quang: 3, tinh_huyet: 3 }, stones: 10, rate: 0.9, minRank: 1 },
  rc_kiem_bang_suong: { jobId: 'thusu', duongkiem: true, sword: 'bang_suong', name: 'Rèn Băng Sương Kiếm', inputs: { quang: 3, tinh_huyet: 3 }, stones: 10, rate: 0.9, minRank: 1 },
  rc_kiem_liet_hoa: { jobId: 'thusu', duongkiem: true, sword: 'liet_hoa', name: 'Rèn Liệt Hỏa Kiếm', inputs: { quang: 3, tinh_huyet: 3 }, stones: 10, rate: 0.9, minRank: 1 },
  // GĐ101: Luyện Khôi Lõi Cốt Tu — cotloi: true = cơ chế lớp, không cần nghề (kiểu tambo/docduoc/duongkiem).
  rc_cot_khoi_loi: { jobId: 'thusu', cotloi: true, name: 'Luyện Khôi Lõi Xương', inputs: { manh_xuong: 5 }, stones: 10, output: 'khoi_loi', rate: 0.9, minRank: 1 },
};
// GĐ131: ngưỡng lượt chế thành công cho 14 cấp (số TẠM).
const JOB_RANK_CRAFTS = [0, 10, 30, 60, 100, 160, 240, 340, 460, 600, 800, 1000, 1400, 2000];
function jobRankOf(p) {
  const crafts = p.job?.crafts || 0;
  let byCount = 1;
  for (let r = JOB_RANK_CRAFTS.length; r >= 1; r--) if (crafts >= JOB_RANK_CRAFTS[r - 1]) { byCount = r; break; }
  const cap = p.realm === 'ht' ? 14 : p.realm === 'na' ? 13 : p.realm === 'kd' ? 12 : p.realm === 'tc' ? 10 : p.realm === 'lk' ? 7 : 4;
  return Math.min(byCount, cap);
}
// GĐ131: danh hiệu nghề đầy đủ — Đế/Thánh xưng Vương (vd Đế Vương Đan Sư, Thánh Vương Đan Sư).
function jobTitleOf(p) {
  if (!p.job || !JOBS[p.job.jobId]) return null;
  const rank = jobRankOf(p);
  const jn = JOBS[p.job.jobId].name;
  if (rank === 13) return `Đế Vương ${jn}`;
  if (rank === 14) return `Thánh Vương ${jn}`;
  return `${JOB_RANK_NAMES[rank]} ${jn}`;
}
// GĐ27 — THÀNH TỰU CƠ BẢN: số liệu tích lũy (counters) + 10 mốc thưởng
// Linh thạch. Tiến độ server tính từ counters/trạng thái thật, client chỉ
// hiển thị + bấm nhận khi đạt.
const ACHIEVEMENTS = [
  { id: 'ach_lk1', name: 'Sơ Nhập Tiên Đồ', desc: 'Đạt Luyện Khí tầng 1', target: 1, reward: 20, progress: (p) => (p.realm !== 'pham' ? 1 : 0) },
  { id: 'ach_tc1', name: 'Trúc Cơ Chân Nhân', desc: 'Đạt cảnh giới Trúc Cơ', target: 1, reward: 200, progress: (p) => (p.realm === 'tc' || p.realm === 'kd' ? 1 : 0) },
  { id: 'ach_wolf50', name: 'Thợ Săn Sói', desc: 'Hạ 50 Sói Xám', target: 50, reward: 50, progress: (p) => p.counters?.wolfKills || 0 },
  { id: 'ach_wolf200', name: 'Sát Lang Giả', desc: 'Hạ 200 Sói Xám', target: 200, reward: 150, progress: (p) => p.counters?.wolfKills || 0 },
  { id: 'ach_rich', name: 'Tiểu Phú Tu Sĩ', desc: 'Đang giữ 500 Linh thạch', target: 500, reward: 30, progress: (p) => p.stones || 0 },
  { id: 'ach_friend', name: 'Người Của Làng', desc: 'Thiện cảm 50 với một NPC bất kỳ', target: 50, reward: 40, progress: (p) => Math.max(0, ...Object.values(p.affinity || {})) },
  { id: 'ach_break1', name: 'Đột Phá Đầu Tiên', desc: 'Đột phá thành công 1 lần', target: 1, reward: 50, progress: (p) => p.counters?.breakthroughs || 0 },
  { id: 'ach_craft50', name: 'Thợ Nghề Lão Luyện', desc: 'Chế tạo thành công 50 lần', target: 50, reward: 60, progress: (p) => p.counters?.crafts || 0 },
  { id: 'ach_bequan', name: 'Nhập Định', desc: 'Bế quan tích lũy 1 ngày game (1440 phút game)', target: 1440, reward: 40, progress: (p) => Math.floor(p.counters?.bequanMin || 0) },
  { id: 'ach_quest10', name: 'Nhiệm Vụ Quen Tay', desc: 'Hoàn thành 10 nhiệm vụ', target: 10, reward: 60, progress: (p) => p.counters?.questsDone || 0 },
];
function achievementState(p) {
  const claimed = p.achClaimed || [];
  return ACHIEVEMENTS.map((a) => {
    const prog = Math.min(a.target, Math.max(0, a.progress(p)));
    return { id: a.id, name: a.name, desc: a.desc, target: a.target, progress: prog, reward: a.reward, done: prog >= a.target, claimed: claimed.includes(a.id) };
  });
}
// Điểm tương tác trước cửa từng nơi (khớp vị trí nhà phía client)
const SHOPS = {
  tiem_dan: {
    name: 'Tiệm Đan Dược', point: { x: 1012, y: 541 },
    sell: { dan_hoi_nguyen: 30, dan_hoi_xuan: 15, dan_trung_canh: 200, dan_truc_co: 800, dan_ho_mach: 300, dan_ket_dan: 2000 }, // người chơi MUA (đan đột phá: giá TẠM; GĐ76: Hồi Nguyên thay Tụ Khí; GĐ87: + Kết Đan)
    buy: { dan_hoi_nguyen: 12, dan_hoi_xuan: 6, dan_trung_canh: 80, dan_truc_co: 320, dan_ho_mach: 120, dan_ket_dan: 800 }, // người chơi BÁN (40% giá mua)
  },
  tiem_nguyen_lieu: {
    name: 'Tiệm Nguyên Liệu', point: { x: 392, y: 373 },
    sell: { nanh_soi: 12 },
    buy: { nanh_soi: 5, nanh_tinh: 30, da_soi: 22, canh_doi: 8, da_quy: 45 }, // GĐ26 + GĐ38: thu mua thêm Cánh Dơi / Đá Quý (giá TẠM)
  },
  // GĐ30: TIỆM TÔNG MÔN + KHO ĐAN — chỉ đệ tử tông môn mới mua được, giá ưu đãi
  // hơn Tiệm Đan ~15% (số TẠM của bản MMO, file không ghi giá)
  tiem_tong_mon: {
    name: 'Tiệm Tông Môn', point: { x: 762, y: 470 },
    sell: { dan_hoi_nguyen: 25, dan_hoi_xuan: 12, dan_trung_canh: 170, dan_truc_co: 680, dan_ho_mach: 255, dan_ket_dan: 1700 },
    buy: { dan_hoi_nguyen: 10, dan_hoi_xuan: 5, dan_trung_canh: 68, dan_truc_co: 272, dan_ho_mach: 102, dan_ket_dan: 680 },
  },
  // GĐ40: THƯƠNG NHÂN LƯU ĐỘNG — NPC buôn bán bình thường trong thế giới;
  // hàng hiếm giá cao (số TẠM), mỗi ngày game chỉ mang theo 3 món luân phiên
  luu_dong: {
    name: 'Thương Nhân Lưu Động', point: { x: 884, y: 616 },
    sell: { dan_hoi_nguyen: 45, dan_hoi_xuan: 22, dan_trung_canh: 300, dan_ho_mach: 340, sach_toa_thien: 500, da_quy: 68, nanh_tinh: 40, phu_ho_than: 60, luong_kho: 10, nuoc_loc: 8 }, // GĐ78: + lương khô, nước lọc cho người đi xa
    buy: { da_quy: 45, nanh_tinh: 30, canh_doi: 8 },
  },
  // GĐ78: TỬU LÂU — tiệm đồ ăn thức uống ở cửa Quán Ăn (phía nam nhà, 525,841)
  tuu_lau: {
    name: 'Tửu Lâu', point: { x: 525, y: 841 },
    sell: { com_nam: 8, thit_nuong: 15, nuoc_loc: 5, tra_thao_moc: 12, ruou_gao: 10 },
    buy: { com_nam: 3, thit_nuong: 6, nuoc_loc: 2, tra_thao_moc: 5, ruou_gao: 4 }, // bán lại 40% như các tiệm khác
  },
  // GĐ89: TIỆM Ở THÀNH PHỐ — cùng bảng giá với tiệm làng (giá TẠM như làng);
  // điểm bán thật do shopPointFor tra theo NPC trên map hiện tại, point dưới
  // chỉ là giá trị giữ chỗ (mua ở sai map thì kiểm tra khoảng cách sẽ chặn).
  city_dan: {
    name: 'Tiệm Đan Dược', point: { x: 0, y: 0 },
    sell: { dan_hoi_nguyen: 30, dan_hoi_xuan: 15, dan_trung_canh: 200, dan_truc_co: 800, dan_ho_mach: 300, dan_ket_dan: 2000 },
    buy: { dan_hoi_nguyen: 12, dan_hoi_xuan: 6, dan_trung_canh: 80, dan_truc_co: 320, dan_ho_mach: 120, dan_ket_dan: 800 },
  },
  city_nguyenlieu: {
    name: 'Tiệm Nguyên Liệu', point: { x: 0, y: 0 },
    sell: { nanh_soi: 12 },
    buy: { nanh_soi: 5, nanh_tinh: 30, da_soi: 22, canh_doi: 8, da_quy: 45 },
  },
};
// GĐ89: điểm bán thật của một tiệm — tiệm thành phố lấy vị trí NPC chủ tiệm
// trên map hiện tại; Tiệm Tông Môn ở trụ sở tông lấy vị trí sứ giả thành đó.
function shopPointFor(player, shopId) {
  if (!player) return null;
  const cityNpcs = CITY_NPCS[mapOf(player)];
  if (cityNpcs) {
    if (shopId === 'city_dan' || shopId === 'city_nguyenlieu') {
      const role = shopId === 'city_dan' ? 'Chủ Tiệm Đan' : 'Chủ Tiệm Nguyên Liệu';
      const npc = cityNpcs.find((n) => n.role === role);
      if (npc) return { x: npc.x, y: npc.y };
    }
    if (shopId === 'tiem_tong_mon') {
      const npc = cityNpcs.find((n) => n.role === 'Sứ Giả Tông Môn');
      if (npc) return { x: npc.x, y: npc.y };
    }
  }
  return SHOPS[shopId]?.point || null;
}
// GĐ40+: THƯƠNG NHÂN LƯU ĐỘNG v2 — ông ta đi buôn khắp nơi, ghé làng
// THẤT THƯỜNG theo ngày (hàm băm theo ngày: ~40% số ngày có mặt, có đợt
// vắng 3–4 ngày) — muốn mua hàng hiếm phải canh ngày / đặt hàng trước.
// Mỗi ngày ghé: mang 3 món trong kho 8 món (chọn theo ngày), mỗi món có
// SỐ LƯỢNG ít (1–3) và GIÁ dao động ±15% theo ngày. Hết hàng là hết.
// ĐẶT HÀNG: trả trước (giá gốc +10%), lần ghé sau nói chuyện là nhận.
// Ông ta còn BÁN TIN TỨC: mỗi ngày một hint về thế giới (nơi quái mạnh,
// rương, tông môn, vụ án...) — quan sát hint mới mở được đồ ẩn.
const MERCHANT_POOL = ['dan_hoi_nguyen', 'dan_hoi_xuan', 'dan_trung_canh', 'dan_ho_mach', 'sach_toa_thien', 'da_quy', 'nanh_tinh', 'phu_ho_than', 'luong_kho', 'nuoc_loc']; // GĐ78: + lương khô, nước lọc
function dayHash(n) { let x = (n + 1) * 2654435761; x = (x ^ (x >> 13)) * 1274126177; return Math.abs(x ^ (x >> 16)); }
function merchantPresent(dayIndex = worldClock().dayIndex) {
  // Chắc chắn ghé mỗi 4 ngày (ngày % 4 == 2) + ~30% ngày khác ghé bất chợt
  // → không bao giờ vắng quá 3 ngày liên tiếp, mà vẫn thất thường
  return dayIndex % 4 === 2 || dayHash(dayIndex) % 100 < 30;
}
let merchantState = null; // {day, stock: {itemId: {price, qty}}}
function merchantToday() {
  const day = worldClock().dayIndex;
  if (merchantState && merchantState.day === day) return merchantState;
  const stock = {};
  if (merchantPresent(day)) {
    const picks = [];
    // GĐ86: kho luôn có 4 món — món thứ 4 chỉ khách quen (rep ≥3) mới xem/mua được
    for (let i = 0; picks.length < 4 && i < 24; i++) {
      const id = MERCHANT_POOL[dayHash(day * 97 + i * 13) % MERCHANT_POOL.length];
      if (!picks.includes(id)) picks.push(id);
    }
    for (const id of picks) {
      const base = SHOPS.luu_dong.sell[id] || 50;
      const price = Math.max(1, Math.round(base * (0.85 + (dayHash(day * 7 + id.length * 31) % 31) / 100)));
      const qty = 1 + (dayHash(day * 3 + id.length * 17) % 3);
      stock[id] = { price, qty };
    }
  }
  merchantState = { day, stock };
  return merchantState;
}
function merchantStockToday() {
  return Object.keys(merchantToday().stock);
}
// GĐ86 — NỘI DUNG SỐNG THÀNH TIẾN TRÌNH (không phải sự kiện xổ số):
// (1) Kẻ thù truyền kiếp: mỗi lần thắng Tu Sĩ Thù Địch, lần sau hắn quay
// lại với HP ×(2 + 0,5×số lần thắng), tối đa ×5 — số TẠM.
// (2) Bệnh lạ cần điều tra: trò chuyện với 3 người trong làng mới thu đủ
// manh mối, mở cờ benhla_probed thì Chủ Tiệm Đan mới giao phần 1.
// (3) Thương nhân khách quen: mua hàng / nhận đơn đặt tăng merchantRep;
// rep ≥3 được xem món thứ 4 trong kho, rep ≥5 giảm 10%, rep ≥10 giảm 15%.
const BENHLA_CLUES = {
  npc_truonglang: 'Mấy nhà phía đông làng ho khan suốt đêm — người bệnh đều từng ra bãi dơi hái thuốc.',
  npc_dan: 'Đan phường nghi nguồn bệnh ở bãi dơi: dơi mang thứ gì đó lạ trong người, không phải bệnh thường.',
  npc_nguyenlieu: 'Mấy hôm nay dơi bay về làng nhiều bất thường — có con rơi xuống giếng phía đông, nước giếng phải xem lại.',
};
function rivalHpMul(p) { return Math.min(5, 2 + 0.5 * (p?.rivalWins || 0)); }
function merchantRepDiscount(p) { const r = p?.merchantRep || 0; return r >= 10 ? 0.85 : r >= 5 ? 0.9 : 1; }
function merchantStockCount(p) { return (p?.merchantRep || 0) >= 3 ? 4 : 3; }
const WORLD_HINTS = [
  'Nghe nói Thạch Quái ở góc đông bắc giữ nhiều Đá Quý — rương của quái Mạnh toàn đồ tốt (50% ra phẩm B).',
  'Rương cấp A đôi khi có cả Đan Trung Cảnh — muốn mở rương xịn thì đừng chỉ farm sói yếu.',
  'Thiên Kiếm Môn chỉ mở chiêu mộ vào tháng 3 hằng năm — tích đủ 100 Công trạng và Thư Tiến Cử trước đi.',
  'Đứng trong Tụ Linh Trận sau Đạo Quán mà bế quan, mỗi ngày được +3 Tu vi — hơn hẳn ngồi không.',
  'Sách Tọa Thiền rơi từ Sói Xám, tỉ lệ thấp — kiên nhẫn hoặc canh thương nhân như ta đây.',
  'Chủ Tiệm Đan đang ôm một vụ bệnh lạ — ai giúp được, danh tiếng trong làng lên cao đấy.',
  'Dơi Đen là quái hạng Trung: rương của chúng có 30% ra phẩm B — ngon hơn sói nhiều.',
  'Có kẻ trộm lảng vảng trong làng dạo này — để ý ai nói dối, manh mối nằm trong lời kể của dân làng.',
];
const BOARD_POINT = { x: 800, y: 668 }; // Bảng treo thưởng giữa làng (nhận nhiệm vụ)
const ELDER_POINT = { x: 387, y: 541 }; // Nhà Trưởng Làng (trả nhiệm vụ)
const QUESTS = {
  q_dietsoi: { name: 'Trừ khử Sói Xám', desc: 'Hạ 5 con Sói Xám ngoài làng', target: 5, rewardStones: 25, kind: 'kill', monsterKind: 'wolf', merit: 3 }, // GĐ30: Công trạng (bản MMO: nhiệm vụ chiến đấu +3; file ghi hộ tống +6, giao hàng +1)
  q_nanhsoi: { name: 'Thu thập Nanh Sói', desc: 'Mang theo 3 Nanh Sói tới trả', target: 3, rewardStones: 20, kind: 'item', itemId: 'nanh_soi', merit: 1 }, // GĐ30: giao hàng +1 đúng file
  // GĐ38: nhiệm vụ Dơi/Thạch theo ĐÚNG bảng nhiệm vụ B11 của file (thưởng
  // gồm cả Tu vi); Công trạng theo lệ bản MMO như nhiệm vụ sói (+3/+1)
  q_dietdoi: { name: 'Diệt Dơi Đen', desc: 'Hạ 10 con Dơi Đen ngoài làng', target: 10, rewardStones: 80, tuViReward: 20, kind: 'kill', monsterKind: 'bat', merit: 3 },
  q_dietthach: { name: 'Diệt Thạch Quái', desc: 'Hạ 5 con Thạch Quái ở góc đông bắc', target: 5, rewardStones: 150, tuViReward: 30, kind: 'kill', monsterKind: 'golem', merit: 3 },
  q_canhdoi: { name: 'Thu thập Cánh Dơi', desc: 'Mang theo 5 Cánh Dơi tới trả', target: 5, rewardStones: 60, kind: 'item', itemId: 'canh_doi', merit: 1 },
  // GĐ40: ĐỐI ĐẦU TU SĨ THÙ ĐỊCH — nội dung đối kháng trải dài trong game
  // (không phải sự kiện ngẫu nhiên): nhận ở bảng → ra ngoài làng bấm
  // "Khiêu chiến" trong panel Nhiệm vụ → tu sĩ xuất hiện đấu tay đôi.
  q_tusi: { name: 'Đối đầu Tu Sĩ Thù Địch', desc: 'Tu sĩ thù địch quấy nhiễu bãi farm. Ra ngoài làng, mở panel Nhiệm vụ bấm ⚔ Khiêu chiến để đấu tay đôi — thắng rồi hắn còn quay lại mạnh hơn, thưởng cũng tăng theo', target: 1, rewardStones: 100, tuViReward: 20, kind: 'kill', monsterKind: 'duel', merit: 3, duel: { spawnName: 'Tu Sĩ Thù Địch', hpMul: 2 } },
  // GĐ40+: KHO VỤ ÁN LUÂN PHIÊN — mỗi vụ chỉ MỞ vài ngày trong chu kỳ 7
  // ngày (caseCycle/caseDays), hết vụ này tới vụ khác: người chơi phải
  // QUAN SÁT bảng mỗi ngày mới thấy vụ mới (đúng triết lý "chơi là tìm
  // hiểu"). Vụ án là nội dung sống của làng, không phải sự kiện ngẫu nhiên.
  case_soi_du: { name: '🔍 Vụ án: Đàn sói dữ', desc: 'Đàn sói dữ quấy phá đường làng — hạ 12 con Sói Xám', target: 12, rewardStones: 130, kind: 'kill', monsterKind: 'wolf', merit: 4, caseCycle: 7, caseDays: [0, 3] },
  case_doi_pha: { name: '🔍 Vụ án: Bầy dơi phá kho', desc: 'Bầy dơi phá kho lương thực ban đêm — hạ 12 con Dơi Đen', target: 12, rewardStones: 150, tuViReward: 25, kind: 'kill', monsterKind: 'bat', merit: 4, caseCycle: 7, caseDays: [1, 4] },
  case_thach_chan: { name: '🔍 Vụ án: Thạch quái chặn đường', desc: 'Thạch Quái lăn xuống chặn đường đông bắc — hạ 4 con', target: 4, rewardStones: 200, tuViReward: 30, kind: 'kill', monsterKind: 'golem', merit: 5, caseCycle: 7, caseDays: [2, 5] },
  case_batcoc: { name: '🔍 Vụ án: Dân làng mất tích', desc: 'Một dân làng bị bắt cóc ra bãi farm! Ra ngoài làng bấm ⚔ Đối đầu để cứu người', target: 1, rewardStones: 180, kind: 'kill', monsterKind: 'duel', merit: 5, caseCycle: 7, caseDays: [3, 6], duel: { spawnName: 'Kẻ Bắt Cóc', hpMul: 1.6 } },
  case_trom: { name: '🔍 Vụ án: Kẻ trộm trong làng', desc: 'Kho làng bị trộm! Thu thập 3 manh mối từ dân làng (trò chuyện), rồi về gặp Trưởng Làng CHỈ ĐÍCH DANH thủ phạm — chỉ sai là vụ án khép lại!', target: 3, rewardStones: 150, tuViReward: 30, kind: 'clues', merit: 5, caseCycle: 7, caseDays: [1, 3, 5] },
  // GĐ40: VỤ ÁN BỆNH LẠ — chuỗi 2 phần tại Chủ Tiệm Đan (không cần thiện
  // cảm), làm xong mở lại từ đầu (bệnh lạ tái phát theo mùa vụ án mới)
  q_benhla1: { name: 'Bệnh lạ ở bãi dơi (1/2)', desc: 'Bệnh lạ lan từ bãi dơi — trước hết trò chuyện với 3 người trong làng để thu thập manh mối, rồi hạ 8 con Dơi Đen để chặn nguồn bệnh', target: 8, rewardStones: 60, kind: 'kill', monsterKind: 'bat', npcId: 'npc_dan', minAffinity: 0, requiresFlag: 'benhla_probed', setsFlag: 'case_benhla' },
  q_benhla2: { name: 'Bệnh lạ ở bãi dơi (2/2)', desc: 'Mang 2 Hồi Xuân Đan cho Chủ Tiệm Đan cứu người bệnh', target: 2, rewardStones: 120, tuViReward: 30, kind: 'item', itemId: 'dan_hoi_xuan', npcId: 'npc_dan', minAffinity: 0, requiresFlag: 'case_benhla', clearsFlag: 'case_benhla' },
  // GĐ24: NHIỆM VỤ RIÊNG của NPC — chỉ mở khi thiện cảm với NPC đó ≥ 50 (đúng
  // file B11), nhận + trả ngay tại NPC, làm xong +10 thiện cảm, lặp lại được.
  pq_truonglang: { name: 'Tâm nguyện của Trưởng Làng', desc: 'Mang 5 Nanh Sói cho Trưởng Làng', target: 5, rewardStones: 80, kind: 'item', itemId: 'nanh_soi', npcId: 'npc_truonglang', minAffinity: 50 },
  pq_dan: { name: 'Đan phường thiếu tay', desc: 'Hạ 10 Sói Xám giúp Chủ Tiệm Đan', target: 10, rewardStones: 50, kind: 'kill', monsterKind: 'wolf', npcId: 'npc_dan', minAffinity: 50, rewardItem: 'dan_hoi_xuan' }, // GĐ76: thưởng Hồi Xuân thay Tụ Khí đã bỏ
  pq_nguyenlieu: { name: 'Nguyên liệu cho tiệm', desc: 'Mang 5 Nanh Sói cho Chủ Tiệm Nguyên Liệu', target: 5, rewardStones: 70, kind: 'item', itemId: 'nanh_soi', npcId: 'npc_nguyenlieu', minAffinity: 50 },
  // GĐ90: NHIỆM VỤ BẢNG CAO CẤP — cho người chơi Trúc Cơ / Kim Đan (nhận +
  // trả tại Bảng làng như nhiệm vụ bảng cũ; vẫn tính vào boardQuests/Thư).
  bq_kiemma: { name: 'Diệt Kiếm Ma (Trúc Cơ)', desc: 'Hạ 15 Kiếm Ma ở Cổ Chiến Trường (cần Trúc Cơ tầng 7 trở lên mới vào được)', target: 15, rewardStones: 350, tuViReward: 60, kind: 'kill', monsterKind: 'kiemma', merit: 5 },
  bq_huyetlang: { name: 'Diệt Huyết Lang (Trúc Cơ)', desc: 'Hạ 15 Huyết Lang ở Huyết Sắc Rừng', target: 15, rewardStones: 350, tuViReward: 60, kind: 'kill', monsterKind: 'huyetlang', merit: 5 },
  bq_diahanh: { name: 'Diệt Địa Hành Yêu (Trúc Cơ)', desc: 'Hạ 5 Địa Hành Yêu ở Hắc Phong Sa Mạc', target: 5, rewardStones: 350, tuViReward: 60, kind: 'kill', monsterKind: 'dia_hanh_yeu', merit: 5 },
  bq_daquy_tc: { name: 'Thu thập Đá Quý (Trúc Cơ)', desc: 'Mang theo 10 Đá Quý tới trả', target: 10, rewardStones: 300, tuViReward: 50, kind: 'item', itemId: 'da_quy', merit: 4 },
  bq_kimgiap: { name: 'Diệt Kim Giáp Tê (Kim Đan)', desc: 'Hạ 8 Kim Giáp Tê ở Kim Quáng Động hoặc Thiên Cương Kim Sơn', target: 8, rewardStones: 700, tuViReward: 100, kind: 'kill', monsterKind: 'kim_giap_te', merit: 8 },
  bq_thienloi: { name: 'Diệt Thiên Lôi Thú (Kim Đan)', desc: 'Hạ 5 Thiên Lôi Thú ở Thiên Cương Kim Sơn', target: 5, rewardStones: 800, tuViReward: 120, kind: 'kill', monsterKind: 'thien_loi_thu', merit: 10 },
  bq_hondon: { name: 'Diệt Hỗn Độn Thú (Kim Đan)', desc: 'Hạ 1 Hỗn Độn Thú ở Vô Tận Hư Không (cần Trúc Cơ 9 trở lên mới vào được)', target: 1, rewardStones: 1200, tuViReward: 150, kind: 'kill', monsterKind: 'hon_don_thu', merit: 12 },
  bq_daquy_kd: { name: 'Thu thập Đá Quý (Kim Đan)', desc: 'Mang theo 15 Đá Quý tới trả', target: 15, rewardStones: 500, tuViReward: 80, kind: 'item', itemId: 'da_quy', merit: 6 },
};
// GĐ90: nhiệm vụ thành phố — sinh bởi shottools/gen_city_quests.py, nạp
// rồi gộp vào QUESTS (nhiệm vụ riêng, npcId = Người Giao Nhiệm Vụ của thành).
try {
  const cq = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'city_quests.json'), 'utf8'));
  for (const [qid, def] of Object.entries(cq)) QUESTS[qid] = def;
  console.log(`[GĐ90] Đã nối nhiệm vụ thành phố: ${Object.keys(cq).length} nhiệm vụ.`);
} catch (e) { console.log('[GĐ90] Không nạp được city_quests.json:', e.message); }
// GĐ127: nhiệm vụ mở rộng — sinh bởi shottools/gen_quests_gd127.py, nạp rồi
// gộp vào QUESTS như nhiệm vụ thành phố (8 loại thường x 100 + ẩn/liên/thăng cấp x 50).
try {
  const q127 = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'quests_gd127.json'), 'utf8'));
  for (const [qid, def] of Object.entries(q127)) QUESTS[qid] = def;
  console.log(`[GĐ127] Đã nối nhiệm vụ mở rộng: ${Object.keys(q127).length} nhiệm vụ.`);
} catch (e) { console.log('[GĐ127] Không nạp được quests_gd127.json:', e.message); }
// GĐ129: nhiệm vụ Cổ Thụ Yêu Giới — file riêng, nối như GĐ127, không đụng 950 quest cũ.
try {
  const q129 = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'quests_gd129.json'), 'utf8'));
  for (const [qid, def] of Object.entries(q129)) QUESTS[qid] = def;
  console.log(`[GĐ129] Đã nối nhiệm vụ Cổ Thụ: ${Object.keys(q129).length} nhiệm vụ.`);
} catch (e) { console.log('[GĐ129] Không nạp được quests_gd129.json:', e.message); }
// GĐ130: nhiệm vụ Cửu U Bí Cảnh — file riêng, nối như GĐ129 (chuỗi 6 liên hoàn + thu thập + khám phá).
try {
  const q130 = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'quests_gd130.json'), 'utf8'));
  for (const [qid, def] of Object.entries(q130)) QUESTS[qid] = def;
  console.log(`[GĐ130] Đã nối nhiệm vụ Cửu U: ${Object.keys(q130).length} nhiệm vụ.`);
} catch (e) { console.log('[GĐ130] Không nạp được quests_gd130.json:', e.message); }
// GĐ131: nhiệm vụ riêng cho nghề phụ (15 quest — 5 nghề × chuỗi 3).
try {
  const q131 = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'quests_gd131.json'), 'utf8'));
  for (const [qid, def] of Object.entries(q131)) QUESTS[qid] = def;
  console.log(`[GĐ131] Đã nối nhiệm vụ nghề phụ: ${Object.keys(q131).length} nhiệm vụ.`);
} catch (e) { console.log('[GĐ131] Không nạp được quests_gd131.json:', e.message); }
// GĐ132: nhiệm vụ riêng cho 2 nghề thu thập (6 quest — 2 nghề × chuỗi 3: gặp sư phụ → thu thập 5 → thu thập 15).
try {
  const q132 = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'quests_gd132.json'), 'utf8'));
  for (const [qid, def] of Object.entries(q132)) QUESTS[qid] = def;
  console.log(`[GĐ132] Đã nối nhiệm vụ nghề thu thập: ${Object.keys(q132).length} nhiệm vụ.`);
} catch (e) { console.log('[GĐ132] Không nạp được quests_gd132.json:', e.message); }
// GĐ127: manh mối ẩn dạng điểm — tính sẵn 1 lần để tick không duyệt cả QUESTS.
const G127_CLUE_POINTS = Object.values(QUESTS).filter((d) => d.hidden && d.cluePoint && d.requiresFlag);
// GĐ90: tra NPC giao nhiệm vụ — NPC làng (chỉ đúng khi đang ở làng) hoặc
// NPC thành phố (chỉ đúng khi đang ở đúng thành đó). Trả null khi sai map
// (trước đây quest_accept/claim tra thẳng NPC_BY_ID nên NPC thành phố gây crash).
function questNpcFor(player, npcId) {
  const home = NPC_BY_ID[npcId];
  if (home) return mapOf(player) === HOME_MAP ? home : null;
  const city = CITY_NPC_BY_ID.get(npcId);
  if (city) return mapOf(player) === city.mapId ? city : null;
  return null;
}
// GĐ90: tên người giao để hiện thông báo hoàn thành (không cần đúng map,
// vì lúc hạ quái xong người chơi đang ở map săn, chưa về thành).
function questNpcName(npcId) {
  const home = NPC_BY_ID[npcId];
  if (home) return home.name;
  const city = CITY_NPC_BY_ID.get(npcId);
  if (city) return `Người Giao Nhiệm Vụ ở ${MAP_DEFS.get(city.mapId)?.name || city.mapId}`;
  return null;
}
// GĐ127: tên hiển thị thật của NPC (thay vì tên vai giao nhiệm vụ).
function npcDisplayName(npcId) {
  const home = NPC_BY_ID[npcId];
  if (home) return home.name;
  const city = CITY_NPC_BY_ID.get(npcId);
  if (city) return city.name;
  return npcId;
}
// GĐ127: quest sẵn sàng trả — kill/clues/talk/explore/craft/boss/escort/
// delivery xong khi state done; item xong khi đủ đồ. (Trước đây dialog tính
// mọi loại không phải kill như item — quest clues/talk mới sẽ không bao giờ
// hiện "sẵn sàng trả" nếu giữ công thức cũ.)
function questReadyFor(player, def, q) {
  if (!q) return false;
  if (def.kind === 'item') return (player.inventory[def.itemId] || 0) >= def.target;
  return q.state === 'done';
}
// GĐ127: móc nhiệm vụ khi trò chuyện — quest trò chuyện, giao hàng, manh mối
// ẩn dạng NPC. Chỉ gọi khi talk đã qua kiểm tra (đúng map + đủ gần), trước
// npc_dialog để dialog hiện trạng thái mới nhất.
function applyTalkQuestHooks(socket, player, npcId) {
  let dirty = false;
  for (const [qid, def] of Object.entries(QUESTS)) {
    if (def.kind === 'talk' && def.targetNpcId === npcId) {
      const q = player.quests?.[qid];
      if (q && q.state === 'active') {
        q.state = 'done'; dirty = true;
        socket.emit('notice', { text: `✔ Hoàn thành “${def.name}” — về gặp ${questNpcName(def.npcId) || 'người giao nhiệm vụ'} trả nhiệm vụ!` });
      }
    } else if (def.kind === 'delivery' && def.targetNpcId === npcId) {
      const q = player.quests?.[qid];
      if (q && q.state === 'active') {
        if ((player.inventory[def.itemId] || 0) >= def.target) {
          player.inventory[def.itemId] -= def.target;
          q.state = 'done'; dirty = true;
          socket.emit('notice', { text: `✔ Đã giao ${def.target} ${ITEMS[def.itemId]?.name || def.itemId} cho ${npcDisplayName(npcId)} — về gặp ${questNpcName(def.npcId) || 'người giao nhiệm vụ'} trả nhiệm vụ!` });
        } else {
          socket.emit('notice', { text: `Cần mang theo ${def.target} ${ITEMS[def.itemId]?.name || def.itemId} (đang có ${player.inventory[def.itemId] || 0}) để giao.` });
        }
      }
    } else if (def.hidden && def.clueNpcId === npcId && def.requiresFlag && !player.flags?.[def.requiresFlag]) {
      player.flags = player.flags || {}; player.flags[def.requiresFlag] = true; dirty = true;
      socket.emit('notice', { text: `🔍 Bạn phát hiện manh mối: ${def.clueHint || def.name} — tới gặp ${questNpcName(def.npcId) || 'người giao nhiệm vụ'} xem nhiệm vụ ẩn!` });
    }
  }
  if (dirty) { persistPlayer(player); syncChar(socket, player); }
}
function caseActiveToday(def, dayIndex = worldClock().dayIndex) {
  if (!def.caseCycle) return true;
  return (def.caseDays || []).includes(dayIndex % def.caseCycle);
}
// GĐ40+: VỤ ÁN KẺ TRỘM — nghi phạm và manh mối. Thủ phạm được gán lúc
// nhận vụ (theo hạt giống nhân vật + ngày) và 3 nhân chứng mỗi người giữ
// 1 manh mối NHẤT QUÁN với thủ phạm: người chơi phải đọc kỹ, đối chiếu
// (áo màu gì, mất món gì, thấy ở đâu) mới chỉ đúng — rèn quan sát/phán đoán.
const CASE_SUSPECTS = [
  { id: 'npc_dan', name: 'Chủ Tiệm Đan' },
  { id: 'npc_nguyenlieu', name: 'Chủ Tiệm Nguyên Liệu' },
  { id: 'npc_thuongnhan', name: 'Thương Nhân Lưu Động' },
];
const CASE_CLUES = {
  npc_dan: {
    npc_truonglang: 'Đêm qua ta thấy một bóng người lảng vảng gần Tiệm Đan — dáng đó ta quen lắm, là người trong làng.',
    npc_nguyenlieu: 'Kẻ trộm làm đổ lọ đan dược mà không lấy — chắc không biết giá trị của đan, không phải người trong nghề đan.',
    npc_sugia: 'Đêm qua có kẻ áo xanh lá hỏi ta đường tắt ra bãi farm lúc nửa đêm — dân làng mà đi giờ đó thì lạ lắm.',
  },
  npc_nguyenlieu: {
    npc_truonglang: 'Kho mất mấy bao nguyên liệu thô — thứ đó chỉ người làm nghề nguyên liệu mới biết đường tiêu thụ.',
    npc_dan: 'Ta nghe tiếng kéo bao tải nặng về phía Tiệm Nguyên Liệu lúc nửa đêm — kẻ đó khỏe và quen đường đi lối lại trong làng.',
    npc_sugia: 'Ta thấy một người áo nâu sẫm khiêng bao tải nặng đi về phía đông lúc trời chưa sáng.',
  },
  npc_thuongnhan: {
    npc_truonglang: 'Kẻ trộm nói giọng xứ khác, dân làng ta không ai nói thế — lại còn mặc áo tím lạ mắt.',
    npc_dan: 'Mất đúng món Đá Quý trong kho — chỉ người buôn bán đường dài mới biết món đó cất ở đâu và đáng giá bao nhiêu.',
    npc_nguyenlieu: 'Đêm qua có người lạ mặt hỏi mua dây thừng với bao tải lớn — không phải dân làng này, ta chắc chắn.',
  },
};
const CASE_WITNESSES = ['npc_truonglang', 'npc_dan', 'npc_nguyenlieu', 'npc_sugia'];

// NPC cố định của làng (đứng cạnh cửa nơi mình phụ trách). GĐ24: mỗi NPC có
// TÍNH CÁCH (đúng file B11) — dùng cho lời thoại theo mức thiện cảm.
// GĐ57: thông tin cổng bí cảnh cho hộp thoại NPC cổng — vào chỉ dành cho
// đệ tử Thiên Kiếm Môn / Huyền Thiên Tông (đúng file: bí cảnh nhỏ là quyền
// lợi của tông môn trung/lớn); cổng ra thì ai ở trong cũng dùng được.
function realmInfoFor(p, npcId) {
  if (npcId === 'npc_bicanh_in') {
    const member = isOldSectMember(p); // GĐ79: chỉ 2 tông cũ (không phải tông mới)
    return {
      dir: 'enter', member, canEnter: member,
      sectName: member ? SECTS[p.sect].name : null,
      missingText: member ? '' : 'Cổng chỉ nhận ấn ký đệ tử Thiên Kiếm Môn / Huyền Thiên Tông. Hãy gia nhập tông môn trước (gặp Sứ Giả Tông Môn).',
    };
  }
  if (npcId === 'npc_bicanh_out') return { dir: 'exit', member: true, canEnter: true, sectName: null, missingText: '' };
  return null;
}

const NPCS = [
  { id: 'npc_truonglang', name: 'Trưởng Làng', role: 'Trả nhiệm vụ', personality: 'Hiền hòa', x: 362, y: 548, direction: 'down' },
  { id: 'npc_dan', name: 'Chủ Tiệm Đan', role: 'Mua bán đan dược', personality: 'Trầm lặng', shopId: 'tiem_dan', x: 985, y: 548, direction: 'down' },
  { id: 'npc_nguyenlieu', name: 'Chủ Tiệm Nguyên Liệu', role: 'Mua bán nguyên liệu', personality: 'Hào sảng', shopId: 'tiem_nguyen_lieu', x: 368, y: 379, direction: 'down' },
  { id: 'npc_thuongnhan', name: 'Thương Nhân Lưu Động', role: 'Buôn hàng hiếm khắp nơi', personality: 'Tham lam', shopId: 'luu_dong', x: 884, y: 616, direction: 'down' }, // GĐ40
  { id: 'npc_sugia', name: 'Sứ Giả Tông Môn', role: 'Chiêu mộ đệ tử', personality: 'Trang nghiêm', x: 762, y: 470, direction: 'down' }, // GĐ30
  { id: 'npc_bicanh_in', name: 'Cổng Bí Cảnh', role: 'Chỉ đệ tử tông môn mới qua được', personality: 'Cổ xưa', x: 1470, y: 600, direction: 'down' }, // GĐ57
  { id: 'npc_bicanh_out', name: 'Cổng Trở Về', role: 'Về Làng Tân Thủ', personality: 'Cổ xưa', x: 2432, y: 600, direction: 'down' }, // GĐ57, GĐ126: dời đông 600 theo bí cảnh
  { id: 'npc_laibuan', name: 'Lái Buôn', role: 'Giao việc hộ tống thương nhân', personality: 'Sởi lởi', x: 1005, y: 545, direction: 'down' }, // GĐ60
  { id: 'npc_ren', name: 'Thợ Rèn', role: 'Rèn trang bị', personality: 'Cần mẫn', x: 620, y: 560, direction: 'down' }, // GĐ119 bước 5: Tiệm Rèn (quảng trường làng, đất trống)
  { id: 'npc_master_dansu', name: 'Đan Lão', role: 'Sư phụ Đan Sư', personality: 'Hiền hòa', x: 520, y: 390, direction: 'down' }, // GĐ131: hàng sư phụ dạy nghề phía nam Đạo Quán (ô trống đã kiểm tra va chạm)
  { id: 'npc_master_luyenkhi', name: 'Khí Lão', role: 'Sư phụ Luyện Khí Sư', personality: 'Cần mẫn', x: 640, y: 390, direction: 'down' },
  { id: 'npc_master_tranphap', name: 'Trận Lão', role: 'Sư phụ Trận Pháp Sư', personality: 'Trầm lặng', x: 760, y: 390, direction: 'down' },
  { id: 'npc_master_phusu', name: 'Phù Lão', role: 'Sư phụ Phù Sư', personality: 'Hào sảng', x: 880, y: 390, direction: 'down' },
  { id: 'npc_master_thusu', name: 'Thú Lão', role: 'Sư phụ Thú Sư', personality: 'Sởi lởi', x: 1000, y: 390, direction: 'down' },
  { id: 'npc_master_daokhoang', name: 'Khoáng Lão', role: 'Sư phụ Đào Khoáng Sư', personality: 'Cần mẫn', x: 1120, y: 390, direction: 'down' }, // GĐ132: nối dài hàng sư phụ (ô trống đã kiểm tra va chạm)
  { id: 'npc_master_haithuoc', name: 'Thảo Lão', role: 'Sư phụ Hái Thuốc Sư', personality: 'Hiền hòa', x: 1240, y: 390, direction: 'down' }, // GĐ132: nối dài hàng sư phụ (ô trống đã kiểm tra va chạm)
];
const MASTER_JOB = { npc_master_dansu: 'dansu', npc_master_luyenkhi: 'luyenkhi', npc_master_tranphap: 'tranphap', npc_master_phusu: 'phusu', npc_master_thusu: 'thusu', npc_master_daokhoang: 'daokhoang', npc_master_haithuoc: 'haithuoc' }; // GĐ131: NPC sư phụ → nghề; GĐ132: +2 sư phụ thu thập
const MASTER_GUIDE = {
  dansu: 'Muốn làm Đan Sư thì nhớ: đo linh căn ở Đạo Quán trước, rồi bái sư học nghề. Chế đan tốn nguyên liệu + linh thạch, thất bại mất nguyên liệu — nhưng mỗi lần chế thành công là một bước lên phẩm. Đệ tử của ta chế đan dễ thành hơn đôi chút.',
  luyenkhi: 'Luyện Khí Sư tinh luyện nguyên liệu, sau này còn rèn được trang bị. Cứ chế nhiều, phẩm tự lên — Phàm tối đa Tứ Phẩm, lên cảnh giới mới mở thêm phẩm. Bái sư rồi chế mới được hưởng lộc sư phụ.',
  tranphap: 'Trận Pháp Sư khắc trận kỳ, bày trận — nghề đi đường dài. Chế đủ lượt thì phẩm lên, trận mới mạnh. Nghề phụ không bắt buộc, nhưng ai tinh ý sẽ thấy nó giúp rất nhiều.',
  phusu: 'Phù Sư vẽ bùa — hộ thân, tụ linh, sau này đủ loại bùa công thủ. Nhớ bái sư trước khi chế: đệ tử của ta vẽ bùa dễ thành hơn.',
  thusu: 'Thú Sư gần gũi muông thú: nướng bánh, thuộc da, sau này thuần hóa thú hoang thành bạn đồng hành. Không cần vội — cứ chế đều tay, phẩm lên theo lượt chế.',
  daokhoang: 'Đào Khoáng Sư tìm mạch quặng ngoài hoang dã: map farm và map nguyên tố đều có mạch ⛏️. Tới gần bấm E là đào — mỗi mạch ngày đào một lần, đào xong nghề lên theo lượt. Bái sư rồi đào mới hưởng lộc sư phụ.',
  haithuoc: 'Hái Thuốc Sư hái thảo dược ngoài hoang dã: map farm và map nguyên tố đều có bụi thuốc 🌿. Tới gần bấm E là hái — mỗi bụi ngày hái một lần. Thảo dược để dành luyện đan, sau này nhiều công thức dùng tới.',
};
const NPC_BY_ID = Object.fromEntries(NPCS.map((n) => [n.id, n]));
const SHOP_NPC = Object.fromEntries(NPCS.filter((n) => n.shopId).map((n) => [n.shopId, n.id]));
// GĐ24: THIỆN CẢM NPC (file B11): −100..100, bắt đầu 0. ≥50: mở nhiệm vụ
// riêng + giảm giá mua 10%; ≤−50: NPC từ chối giao dịch. Cách tăng (bản MMO):
// trò chuyện mỗi ngày +2 · mua/bán tại tiệm +1/lần · trả nhiệm vụ bảng cho
// Trưởng Làng +5 · hoàn thành nhiệm vụ riêng +10. (File chưa có hành động
// trừ điểm trong gameplay hiện tại — ngưỡng từ chối đã cài sẵn chờ sự kiện.)
function affinityOf(p, npcId) {
  return (p.affinity && p.affinity[npcId]) || 0;
}
function addAffinity(socket, p, npcId, delta) {
  if (!p.affinity) p.affinity = {};
  const before = affinityOf(p, npcId);
  const after = Math.max(-100, Math.min(100, before + delta));
  if (after === before) return after;
  p.affinity[npcId] = after;
  persistPlayer(p);
  if (socket) {
    socket.emit('affinity_changed', { npcId, name: NPC_BY_ID[npcId]?.name || npcId, value: after, delta: after - before });
    syncChar(socket, p);
  }
  console.log(`[thiện cảm] ${p.name} ↔ ${NPC_BY_ID[npcId]?.name}: ${before} → ${after}`);
  return after;
}
function dialogLine(npc, aff) {
  const tier = aff >= 50 ? 'high' : aff < 0 ? 'low' : 'mid';
  const LINES = {
    npc_truonglang: {
      low: 'Làng này nhỏ, lòng người không nhỏ đâu cháu. Sống cho phải đạo nhé.',
      mid: 'Cháu lại ghé à? Làng mình yên bình là nhờ những người trẻ chịu khó như cháu.',
      high: 'Cháu như con cháu trong nhà vậy. Ta có một tâm nguyện riêng, chỉ tin tưởng giao cho cháu...',
    },
    npc_dan: {
      low: '...Mua thì mua. Đừng làm phiền ta luyện đan.',
      mid: 'Ngươi cần đan gì? Nói nhanh.',
      high: 'Khách quen ta tin được không nhiều. Đan của ngươi ta bớt một phần — với lại, đan phường đang thiếu tay nghề...',
    },
    npc_nguyenlieu: {
      low: 'Ê ê, mua bán sòng phẳng, đừng có mặc cả linh tinh!',
      mid: 'Khách quen! Cứ xem hàng thoải mái, giá ta để hữu nghị lắm rồi!',
      high: 'Ha ha! Người anh em! Hàng cho ngươi ta tính giá khác hẳn — mà này, ta có mối việc riêng chỉ dành cho người thân thiết...',
    },
    npc_sugia: {
      low: 'Tông môn chiêu mộ có kỳ, công trạng có công. Muốn vào tông môn thì lo tích Công trạng từ nhiệm vụ bảng trước đã.',
      mid: 'Tông môn chiêu mộ có kỳ, công trạng có công. Muốn vào tông môn thì lo tích Công trạng từ nhiệm vụ bảng trước đã.',
      high: 'Tông môn chiêu mộ có kỳ, công trạng có công. Muốn vào tông môn thì lo tích Công trạng từ nhiệm vụ bảng trước đã.',
    },
  };
  return (LINES[npc.id] && LINES[npc.id][tier]) || '...';
}
// ---------------- GĐ30: CHIÊU MỘ TÔNG MÔN + CÔNG TRẠNG ----------------
// Theo file thiết kế (đợt Chiêu mộ tông môn): Công trạng kiếm từ nhiệm vụ
// bảng (giao hàng +1; bản MMO thêm nhiệm vụ chiến đấu +3); đủ 10 nhiệm vụ
// bảng → Thư Tiến Cử. Thiên Kiếm Môn mở 30 ngày mỗi tháng 3, cần Luyện Khí
// tầng 7 + Công trạng ≥100 + Thư Tiến Cử. Tông môn lớn (tên trong file
// KHÔNG đặt — bản này giữ tên tạm Huyền Thiên Tông như bản chơi đơn) mở
// 3 năm/đợt, 60 ngày đầu năm, cần Trúc Cơ + Công trạng ≥500 + thắng Thử
// Thách Thú. Quyền lợi đệ tử: Tiệm Tông Môn (giá ưu đãi ~15%) + đổi
// 50 Công trạng → +1 điểm chỉ số tự do (tỉ lệ TẠM 50:1, file không ghi).
const SECTS = {
  thienkiem: { name: 'Thiên Kiếm Môn' },
  huyenthien: { name: 'Huyền Thiên Tông' },
};
// GĐ79: 30 TÔNG MÔN MỚI — 15 nhỏ (vào từ Luyện Khí, không cần công trạng),
// 10 vừa (từ Trúc Cơ, công trạng ≥100), 5 lớn (từ Kim Đan, công trạng ≥300),
// chiêu mộ quanh năm, gia nhập tại Sứ Giả như 2 tông cũ. Mỗi tông đặt trụ sở
// ở 1 thành phố — 30 thành phố (10 cũ + 20 mới) vừa đủ 1 tông/thành.
// (Tên tông/thành và mức công trạng đều do agent đặt — người chơi cứ đổi.)
const NEW_SECTS = {
  // Tông nhỏ — Luyện Khí
  thanh_truc_mon: { name: 'Thanh Trúc Môn', size: 'nho', homeCity: 'thanh_van_thanh', minRealm: 'lk', merit: 0 },
  bach_van_coc: { name: 'Bạch Vân Cốc', size: 'nho', homeCity: 'vong_nguyet_lau', minRealm: 'lk', merit: 0 },
  hac_phong_duong: { name: 'Hắc Phong Đường', size: 'nho', homeCity: 'hac_phong_trai', minRealm: 'lk', merit: 0 },
  tang_kinh_mon: { name: 'Tàng Kinh Môn', size: 'nho', homeCity: 'tang_kinh_cac', minRealm: 'lk', merit: 0 },
  phong_van_tong: { name: 'Phong Vân Tông', size: 'nho', homeCity: 'phong_van_tong', minRealm: 'lk', merit: 0 },
  thien_co_mon: { name: 'Thiên Cơ Môn', size: 'nho', homeCity: 'thien_co_thanh', minRealm: 'lk', merit: 0 },
  thanh_ha_kiem_phai: { name: 'Thanh Hà Kiếm Phái', size: 'nho', homeCity: 'thanh_ha_thanh', minRealm: 'lk', merit: 0 },
  bach_lo_mon: { name: 'Bạch Lộ Môn', size: 'nho', homeCity: 'bach_lo_thanh', minRealm: 'lk', merit: 0 },
  tu_truc_coc: { name: 'Tử Trúc Cốc', size: 'nho', homeCity: 'tu_truc_thanh', minRealm: 'lk', merit: 0 },
  hoang_sa_duong: { name: 'Hoàng Sa Đường', size: 'nho', homeCity: 'hoang_sa_thanh', minRealm: 'lk', merit: 0 },
  bich_ba_mon: { name: 'Bích Ba Môn', size: 'nho', homeCity: 'bich_ba_thanh', minRealm: 'lk', merit: 0 },
  van_an_coc: { name: 'Vân Ẩn Cốc', size: 'nho', homeCity: 'van_an_thanh', minRealm: 'lk', merit: 0 },
  xich_thuy_phai: { name: 'Xích Thủy Phái', size: 'nho', homeCity: 'xich_thuy_thanh', minRealm: 'lk', merit: 0 },
  co_moc_mon: { name: 'Cổ Mộc Môn', size: 'nho', homeCity: 'co_moc_thanh', minRealm: 'lk', merit: 0 },
  suong_nguyet_lau: { name: 'Sương Nguyệt Lâu', size: 'nho', homeCity: 'suong_nguyet_thanh', minRealm: 'lk', merit: 0 },
  // Tông vừa — Trúc Cơ
  long_mach_tong: { name: 'Long Mạch Tông', size: 'vua', homeCity: 'long_mach_co_thanh', minRealm: 'tc', merit: 100 },
  long_ngam_mon: { name: 'Long Ngâm Môn', size: 'vua', homeCity: 'long_ngam_thanh', minRealm: 'tc', merit: 100 },
  phuong_minh_coc: { name: 'Phượng Minh Cốc', size: 'vua', homeCity: 'phuong_minh_thanh', minRealm: 'tc', merit: 100 },
  huyen_vu_duong: { name: 'Huyền Vũ Đường', size: 'vua', homeCity: 'huyen_vu_thanh', minRealm: 'tc', merit: 100 },
  bach_ho_mon: { name: 'Bạch Hổ Môn', size: 'vua', homeCity: 'bach_ho_thanh', minRealm: 'tc', merit: 100 },
  chu_tuoc_phai: { name: 'Chu Tước Phái', size: 'vua', homeCity: 'chu_tuoc_thanh', minRealm: 'tc', merit: 100 },
  thanh_long_tong: { name: 'Thanh Long Tông', size: 'vua', homeCity: 'thanh_long_thanh', minRealm: 'tc', merit: 100 },
  ky_lan_coc: { name: 'Kỳ Lân Cốc', size: 'vua', homeCity: 'ky_lan_thanh', minRealm: 'tc', merit: 100 },
  tinh_ha_mon: { name: 'Tinh Hà Môn', size: 'vua', homeCity: 'tinh_ha_thanh', minRealm: 'tc', merit: 100 },
  nguyet_hoa_lau: { name: 'Nguyệt Hoa Lâu', size: 'vua', homeCity: 'nguyet_hoa_thanh', minRealm: 'tc', merit: 100 },
  // Tông lớn — Kim Đan
  thien_ngoai_tong: { name: 'Thiên Ngoại Tông', size: 'lon', homeCity: 'thien_ngoai_phuong', minRealm: 'kd', merit: 300 },
  ma_vuc_mon: { name: 'Ma Vực Môn', size: 'lon', homeCity: 'ma_vuc_thanh', minRealm: 'kd', merit: 300 },
  tien_gioi_tong: { name: 'Tiên Giới Tông', size: 'lon', homeCity: 'tien_gioi_cac', minRealm: 'kd', merit: 300 },
  cuu_tieu_tong: { name: 'Cửu Tiêu Tông', size: 'lon', homeCity: 'cuu_tieu_thanh', minRealm: 'kd', merit: 300 },
  vo_cuc_mon: { name: 'Vô Cực Môn', size: 'lon', homeCity: 'vo_cuc_thanh', minRealm: 'kd', merit: 300 },
};
for (const [id, s] of Object.entries(NEW_SECTS)) SECTS[id] = s;
// GĐ79: Thạch Lâm vẫn chỉ dành cho 2 tông cũ (luật GĐ57) — tông mới không
// mở cửa sau vào bí cảnh (tông nhỏ vào từ Luyện Khí, bí cảnh bậc Trúc Cơ).
function isOldSectMember(p) { return !!p.sect && (p.sect === 'thienkiem' || p.sect === 'huyenthien'); }
const MERIT_PER_POINT = 50;
// GĐ54: CÔNG PHÁP TÔNG MÔN — đúng file thiết kế (mục Tông môn và đợt chiêu
// mộ): "Gia nhập tông môn: mở tiệm và công pháp riêng của tông (ở bản đầu:
// danh sách ngắn các công pháp đã có trong bảng, giảm điều kiện 5 điểm chỉ
// số)". Danh sách tông = công pháp bậc TRÚC CƠ của lớp + vũ khí đang cầm
// trong bảng 511 sẵn có; đệ tử Thiên Kiếm Môn / Huyền Thiên Tông học các
// chiêu này tại Sứ Giả với MỖI điều kiện chỉ số giảm 5 điểm. Môn phái nhỏ
// Thanh Phong không có công pháp tông (bảng của file ghi rõ phần của nó chỉ
// là tiệm cơ bản + nhiệm vụ bang + đồng hành).
const SECT_COND_DISCOUNT = 5;
function discountedSkill(sk, d = SECT_COND_DISCOUNT) {
  if (!sk?.cond?.length) return sk;
  return { ...sk, cond: sk.cond.map((c) => ({ stat: c.stat, value: Math.max(0, c.value - d) })) };
}
function sectSkillListFor(p) {
  if (!p.sect || !SECTS[p.sect]) return null;
  if (NEW_SECTS[p.sect]) {
    // GĐ80: công pháp RIÊNG của tông mới — mọi bậc, chỉ đệ tử tông đó
    const ro = REALM_ORDER[p.realm] ?? 0;
    return (SECT_SKILLS[p.sect] || []).map((sk) => {
      const learned = (p.skills || []).includes(sk.id);
      const isLearning = p.learning?.skillId === sk.id;
      const realmText = sk.tier === 'coban' ? 'Cơ bản (cần đo linh căn)' : sk.tier === 'luyenkhi' ? 'Luyện Khí trở lên' : 'Trúc Cơ trở lên';
      const realmOk = sk.tier === 'coban' ? !!p.linhCan : sk.tier === 'luyenkhi' ? ro >= 1 : ro >= 2;
      return {
        id: sk.id, name: sk.name, coef: sk.coef, cdMs: sk.cdMs, cost: sk.cost,
        fxText: '', learned, isLearning, sectSkill: true,
        canLearn: !learned && !isLearning && realmOk,
        missingText: learned || isLearning ? '' : realmOk ? '' : (sk.tier === 'coban' ? 'Chưa đo linh căn — tới Đạo Quán bấm E' : `Chưa đạt ${sk.tier === 'luyenkhi' ? 'Luyện Khí' : 'Trúc Cơ'}`),
        condText: realmText, sectCondText: 'Đệ tử tông',
      };
    });
  }
  const w = weaponOf(p.classId, p.weaponId);
  if (!w) return [];
  return (SKILL_CATALOG[p.classId]?.[w.id] || [])
    .filter((s) => s.tier === 'trucco')
    .map((sk) => {
      const dsk = discountedSkill(sk);
      const learned = (p.skills || []).includes(sk.id);
      const realmOk = p.realm === 'tc';
      const condMet = realmOk && condMetOf(p, dsk);
      return {
        id: sk.id, name: sk.name, coef: sk.coef, cdMs: sk.cdMs, cost: sk.cost,
        fxText: sk.fxText || '', desc: sk.desc || '',
        condText: condTextOf(sk), sectCondText: condTextOf(dsk),
        learned, isLearning: p.learning?.skillId === sk.id,
        canLearn: !learned && condMet,
        missingText: learned ? 'Đã lĩnh hội'
          : !realmOk ? 'Cần cảnh giới Trúc Cơ'
          : !condMet ? `Chưa đủ chỉ số — đệ tử cần: ${condTextOf(dsk)}` : '',
      };
    });
}
function sectInfoFor(p) {
  const w = worldClock();
  const stepNow = globalStep(p.realm, p.tier);
  const letter = (p.inventory?.thu_tien_cu || 0) > 0;
  const tkOpen = w.month === 3;
  const htOpen = (w.year % 3 === 0) && w.month <= 2;
  // GĐ79: 30 tông mới — điều kiện theo cảnh giới thật (globalStep trả 0 cho
  // Kim Đan nên không dùng step cho tông lớn), chiêu mộ quanh năm.
  const roNow = REALM_ORDER[p.realm] ?? 0;
  const newList = Object.entries(NEW_SECTS).map(([id, s]) => {
    const needRo = REALM_ORDER[s.minRealm] ?? 1;
    const realmText = s.minRealm === 'lk' ? 'Luyện Khí' : s.minRealm === 'tc' ? 'Trúc Cơ' : 'Kim Đan';
    const missing = [
      ...(roNow < needRo ? [`Chưa đạt ${realmText}`] : []),
      ...((p.merit || 0) < s.merit ? [`Công trạng ${p.merit || 0}/${s.merit}`] : []),
    ];
    return {
      id, name: s.name, size: s.size,
      sizeText: s.size === 'nho' ? 'Tông nhỏ' : s.size === 'vua' ? 'Tông vừa' : 'Tông lớn',
      homeCity: s.homeCity,
      homeCityName: MAP_DEFS.get(s.homeCity)?.name || s.homeCity,
      needText: `${realmText} trở lên${s.merit ? ` · Công trạng ≥ ${s.merit}` : ''}`,
      open: true, windowText: 'Chiêu mộ quanh năm',
      canJoin: !p.sect && roNow >= needRo && (p.merit || 0) >= s.merit,
      missing,
    };
  });
  return {
    list: newList,
    ...Object.fromEntries(newList.map((e) => [e.id, e])), // join_sect tra theo id như 2 tông cũ
    merit: p.merit || 0,
    boardQuests: p.boardQuests || 0,
    letter,
    sect: p.sect || null,
    sectName: p.sect && SECTS[p.sect] ? SECTS[p.sect].name : null,
    sectSkills: !!NEW_SECTS[p.sect], // GĐ80: tông mới → danh sách là công pháp riêng
    skills: sectSkillListFor(p), // GĐ54: công pháp tông môn (null nếu chưa có tông)
    clock: { day: w.day, month: w.month, year: w.year },
    thienkiem: {
      id: 'thienkiem', name: SECTS.thienkiem.name, open: tkOpen,
      windowText: 'Mở 30 ngày mỗi tháng 3 hằng năm',
      needText: 'Luyện Khí tầng 7 trở lên · Công trạng ≥ 100 · có Thư Tiến Cử (trao khi xong 10 nhiệm vụ bảng)',
      canJoin: !p.sect && tkOpen && stepNow >= 7 && (p.merit || 0) >= 100 && letter,
      missing: [
        ...(!tkOpen ? ['Chưa tới tháng 3'] : []),
        ...(stepNow < 7 ? ['Chưa đạt Luyện Khí tầng 7'] : []),
        ...((p.merit || 0) < 100 ? [`Công trạng ${p.merit || 0}/100`] : []),
        ...(!letter ? ['Chưa có Thư Tiến Cử'] : []),
      ],
    },
    huyenthien: {
      id: 'huyenthien', name: SECTS.huyenthien.name, open: htOpen,
      windowText: '3 năm mở 1 đợt — 60 ngày đầu của năm thứ 3, 6, 9…',
      needText: 'Trúc Cơ trở lên · Công trạng ≥ 500 · thắng Thử Thách Thú của tông môn',
      trialPassed: !!p.sectTrialPassed,
      canJoin: !p.sect && htOpen && stepNow >= 10 && (p.merit || 0) >= 500 && !!p.sectTrialPassed,
      missing: [
        ...(!htOpen ? ['Chưa tới đợt mở (năm thứ 3, 6, 9… tháng 1–2)'] : []),
        ...(stepNow < 10 ? ['Chưa đạt Trúc Cơ'] : []),
        ...((p.merit || 0) < 500 ? [`Công trạng ${p.merit || 0}/500`] : []),
        ...(!p.sectTrialPassed ? ['Chưa thắng Thử Thách Thú'] : []),
      ],
    },
  };
}
const DROP_TTL_MS = 120000; // đồ rơi tồn tại 120 giây
const PICKUP_RANGE = 34; // đi qua gần là tự nhặt (đúng file thiết kế)
const DATA_DIR = path.join(__dirname, 'data');
const CHAR_FILE = process.env.TTT_CHAR_FILE || path.join(DATA_DIR, 'characters.json');
let characters = {};
try {
  characters = JSON.parse(fs.readFileSync(CHAR_FILE, 'utf8')) || {};
} catch {
  characters = {};
}
function saveCharacters() {
  storage.saveDoc('characters', characters);
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(CHAR_FILE, JSON.stringify(characters, null, 1));
  } catch (e) {
    console.warn('[save] Không ghi được characters.json:', e.message);
  }
}
function persistPlayer(p) {
  const key = p && (p.charKey || p.token);
  if (!p || p.isBot || !key || !characters[key]) return;
  const c = characters[key];
  c.hp = Math.round(p.hp);
  c.mp = Math.round(p.mp);
  c.x = Math.round(p.x);
  c.y = Math.round(p.y);
  c.mapId = mapOf(p); // GĐ59: nhớ map đang đứng để đăng nhập lại đúng chỗ
  // GĐ7: tiến trình tu luyện
  c.stats = p.stats;
  c.freePoints = p.freePoints;
  c.statPoints = p.statPoints;
  c.allocFree = p.allocFree; // GĐ74: sổ điểm đã cộng (để reset chỉ số)
  c.allocStat = p.allocStat;
  c.linhCan = p.linhCan;
  c.tuViMedDay = p.tuViMedDay ?? -1; // GĐ76: ngày đã tính trần Tu vi thiền
  c.tuViMedGain = p.tuViMedGain ?? 0;
  c.food = p.food ?? 100; // GĐ78: thức ăn / nước uống lưu bền
  c.water = p.water ?? 100;
  c.classRes = p.classRes && typeof p.classRes === 'object' ? p.classRes : {}; // GĐ95: tài nguyên riêng từng lớp (Nộ Khí...)
  c.tamBo = p.tamBo && typeof p.tamBo === 'object' ? { hp: p.tamBo.hp || 0, def: p.tamBo.def || 0 } : { hp: 0, def: 0 }; // GĐ96: tổng Tẩm bổ vĩnh viễn
  c.realm = p.realm;
  c.tier = p.tier;
  // GĐ19: tiến trình đột phá trung/đại cảnh
  c.failStreak = p.failStreak || 0;
  c.trialReady = p.trialReady || null;
  c.statPenaltyStacks = p.statPenaltyStacks || 0;
  // GĐ20: tuổi + tuổi thọ + mốc ngày gần nhất (để cộng Tu vi ngày mới/offline)
  c.ageStart = p.ageStart ?? 16;
  c.lifespan = p.lifespan ?? 80;
  c.graceStartDay = p.graceStartDay ?? null; // GĐ25: mốc bắt đầu ân hạn thọ
  // GĐ30: tông môn + Công trạng
  c.merit = p.merit || 0;
  c.boardQuests = p.boardQuests || 0;
  c.letterGiven = !!p.letterGiven;
  c.sect = p.sect || null;
  c.sectTrialPassed = !!p.sectTrialPassed;
  c.learning = p.learning || null; // GĐ31/32: công pháp đang lĩnh ngộ {skillId, progressMin, needMin}
  c.equipped = equippedOf(p); // GĐ36: gương ô chính của bảng đang dùng
  c.boards = boardsOf(p); // GĐ37: 2 bảng công pháp {main, util}
  c.activeBoard = p.activeBoard || 0; // GĐ37
  c.learnedOfflineName = p.learnedOfflineName || null; // GĐ32: tên công pháp học xong lúc offline
  c.birthDay = p.birthDay ?? worldClock().dayIndex;
  c.lastDayIndex = p.lastDayIndex ?? worldClock().dayIndex;
  // GĐ21: học Tọa Thiền chưa + trạng thái nghỉ offline + nhà an toàn
  c.meditation = !!p.meditation;
  c.restState = p.restState ?? null;
  c.homeType = p.homeType || 'daoquan';
  // GĐ22: con đường khởi đầu
  c.path = p.path === 'sect' ? 'sect' : 'solo';
  // GĐ24: thiện cảm NPC + mốc ngày đã trò chuyện
  c.affinity = p.affinity || {};
  c.affTalk = p.affTalk || {};
  c.flags = p.flags || {}; // GĐ40
  c.merchantOrder = p.merchantOrder || null; // GĐ40+
  c.caseCulprit = p.caseCulprit || null; // GĐ40+
  c.caseClues = p.caseClues || {}; // GĐ40+
  c.rivalWins = p.rivalWins || 0; // GĐ86: số lần thắng Tu Sĩ Thù Địch
  c.merchantRep = p.merchantRep || 0; // GĐ86: mức khách quen với thương nhân
  c.benhlaClues = p.benhlaClues || {}; // GĐ86: manh mối bệnh lạ đã thu
  // GĐ26: nghề phụ
  c.job = p.job || null;
  c.gatheredNodes = p.gatheredNodes && typeof p.gatheredNodes === 'object' ? p.gatheredNodes : {}; // GĐ132: ngày thu thập từng điểm tài nguyên (per-player)
  c.buffs = p.buffs && typeof p.buffs === 'object' ? p.buffs : {}; // GĐ133: buff đan dược (until ms)
  c.teleportArray = p.teleportArray || null; // GĐ135: Trận Dịch Chuyển (bền qua restart; trận tạm không lưu)
  // GĐ27: số liệu thành tựu + mốc đã nhận thưởng
  c.counters = p.counters || {};
  c.achClaimed = p.achClaimed || [];
  c.tuVi = p.tuVi;
  c.skills = p.skills;
  // GĐ8: kinh tế + nhiệm vụ
  c.stones = p.stones;
  c.stonesTrung = p.stonesTrung ?? 0; // GĐ67: ví Trung phẩm (rương TC+)
  c.stonesThuong = p.stonesThuong ?? 0; // GĐ67: ví Thượng phẩm (rương KD hậu+)
  c.stonesCuc = p.stonesCuc ?? 0; // GĐ69: ví Cực phẩm (rương boss)
  c.inventory = p.inventory;
  c.gearBag = p.gearBag || {}; // GĐ119: kho trang bị
  c.gear = p.gear || {}; // GĐ119: đồ đang mặc
  c.gearOrders = p.gearOrders || []; // GĐ119 bước 4: đơn đặt rèn chưa nhận
  c.gearShopBought = p.gearShopBought || {}; // GĐ119 bước 4: món shop đã mua theo ngày
  c.quests = p.quests;
  // GĐ10: ngoại hình tùy chỉnh
  c.robe = p.robe ?? null;
  c.gender = p.gender || 'nam';
  // GĐ11: vũ khí đang dùng
  c.weaponId = p.weaponId || null;
  saveCharacters();
}

// ---- Tài khoản (Giai đoạn 10) ----
// Đăng ký / đăng nhập bằng tên tài khoản + mật khẩu (băm scrypt + salt,
// không lưu mật khẩu thô). Phiên đăng nhập = token ngẫu nhiên giữ trong RAM,
// client lưu ở localStorage. Mỗi tài khoản tối đa MAX_CHARS_PER_ACCOUNT nhân
// vật; nhân vật của tài khoản nằm chung characters.json với khóa charId riêng
// và trường account = tên tài khoản. Luồng khách cũ (hello kèm token trình
// duyệt) vẫn giữ nguyên để tương thích.
const crypto = require('crypto');
const ACC_FILE = process.env.TTT_ACC_FILE || path.join(DATA_DIR, 'accounts.json');
const MAX_CHARS_PER_ACCOUNT = 3;
let accounts = {};
try {
  accounts = JSON.parse(fs.readFileSync(ACC_FILE, 'utf8')) || {};
} catch {
  accounts = {};
}
function saveAccounts() {
  storage.saveDoc('accounts', accounts);
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(ACC_FILE, JSON.stringify(accounts, null, 1));
  } catch (e) {
    console.warn('[save] Không ghi được accounts.json:', e.message);
  }
}
const sessions = new Map(); // sessionToken -> username (khóa thường)
function hashPassword(password, salt) {
  return crypto.scryptSync(password, salt, 64).toString('hex');
}
// GĐ74 (feedback 25/10): phiên đăng nhập PHẢI sống qua restart server —
// trước đây chỉ giữ trong RAM nên mỗi lần Render deploy/ngủ-dậy là toàn bộ
// người chơi tài khoản bị auth_expired, bắt đăng nhập lại (bạn bè báo).
// Giờ lưu như accounts: file sessions.json + doc 'sessions' trên cloud.
const SESS_FILE = process.env.TTT_SESS_FILE || path.join(DATA_DIR, 'sessions.json');
try {
  const rawSess = JSON.parse(fs.readFileSync(SESS_FILE, 'utf8')) || {};
  for (const [t, u] of Object.entries(rawSess)) if (typeof t === 'string' && typeof u === 'string') sessions.set(t, u);
} catch { /* chưa có file phiên */ }
function saveSessions() {
  const obj = Object.fromEntries(sessions);
  storage.saveDoc('sessions', obj);
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(SESS_FILE, JSON.stringify(obj));
  } catch (e) {
    console.warn('[save] Không ghi được sessions.json:', e.message);
  }
}
function newSession(username) {
  const token = crypto.randomBytes(24).toString('hex');
  sessions.set(token, username);
  saveSessions();
  return token;
}
function accountChars(username) {
  return Object.entries(characters)
    .filter(([, c]) => c && c.account === username && !c.dead) // GĐ25: nhân vật đã tọa hóa không còn trong danh sách
    .map(([charId, c]) => ({ charId, char: c }));
}
function charSummary(charId, c) {
  return {
    charId,
    name: c.name,
    classId: c.classId,
    className: CLASSES[c.classId]?.name || c.classId,
    realm: c.realm || 'pham',
    tier: c.tier || 0,
    linhCanMain: c.linhCan ? c.linhCan.main : null,
    bienDi: c.classRes?.bienDi ?? null, // GĐ100: hệ Biến Dị Pháp Tu
    robe: migrateRobe(c.robe ?? null),
    gender: c.gender || 'nam',
    weaponId: weaponOf(c.classId, c.weaponId)?.id || null,
    weaponName: weaponOf(c.classId, c.weaponId)?.name || null,
  };
}
function sendCharList(socket, username) {
  socket.emit('char_list', {
    username,
    maxChars: MAX_CHARS_PER_ACCOUNT,
    characters: accountChars(username).map(({ charId, char }) => charSummary(charId, char)),
  });
}
// Màu áo người chơi được phép chọn (tùy chỉnh ngoại hình — GĐ10;
// GĐ11: chuyển sang tông NHẠT pastel theo phản hồi người chơi — bản cũ quá chói)
const ROBE_CHOICES = ['#e8a0a0', '#eebd93', '#a3d9a5', '#a5c8e8', '#c3aee0', '#e8b4d0', '#e8e2d0', '#a8b0bc'];
const validRobe = (r) => (ROBE_CHOICES.includes(r) ? r : null);
// Nhân vật đã tạo với bảng màu cũ → tự chuyển sang màu nhạt tương ứng
const ROBE_MIGRATE = {
  '#c22e35': '#e8a0a0', '#2470e0': '#a5c8e8', '#1fa84f': '#a3d9a5', '#8a3fd1': '#c3aee0',
  '#e89b1c': '#eebd93', '#d469a8': '#e8b4d0', '#23272e': '#a8b0bc',
};
const migrateRobe = (r) => (r ? ROBE_MIGRATE[r] || r : null);
const validGender = (g) => (g === 'nu' ? 'nu' : 'nam');

// ---- Làng Tân Thủ (Giai đoạn 5) ----
// Làng là VÙNG AN TOÀN: quái không vào, người chơi spawn ở quảng trường.
const PLAZA = { x: 700, y: 560, r: 150 }; // quảng trường + vòng trận pháp ở tâm
const VILLAGE = { x: 240, y: 180, w: 1290, h: 760 }; // GĐ126: làng mở rộng về đông, nuốt luôn sân Thanh Phong Môn (1230–1530) thành một khu an toàn liền mạch; hàng rào làng (4 cổng ở 4 hướng đường)
// Các nhà trong làng — vật cản không đi xuyên qua được (x, y, w, h)
const HOUSES = [
  { name: 'Đạo Quán', x: 605, y: 245, w: 190, h: 115 },
  { name: 'Nhà Trưởng Làng', x: 320, y: 425, w: 135, h: 100 },
  { name: 'Tiệm Đan Dược', x: 945, y: 425, w: 135, h: 100 },
  { name: 'Tiệm Rèn', x: 930, y: 695, w: 140, h: 105 },
  { name: 'Quán Ăn', x: 455, y: 725, w: 140, h: 100 },
  { name: 'Tiệm Nguyên Liệu', x: 330, y: 262, w: 125, h: 95 },
  { name: 'Thanh Phong Môn', x: 1300, y: 440, w: 170, h: 110 }, // GĐ22: môn phái nhỏ ở phía đông làng
];
// GĐ22: sân Thanh Phong Môn — vùng AN TOÀN thứ hai (quái không vào, không
// đuổi theo người đứng trong sân). Người chọn con đường tông môn nghỉ
// offline tại đây.
const SECT = { x: 1230, y: 420, w: 300, h: 240 };
function insideSect(x, y, pad = 0) {
  return (
    x >= SECT.x - pad && x <= SECT.x + SECT.w + pad &&
    y >= SECT.y - pad && y <= SECT.y + SECT.h + pad
  );
}
// GĐ23: quanh Tụ Linh Trận (Thiền Phòng sau Đạo Quán) cũng là vùng an toàn —
// người đang bế quan không bị sói quấy rầy (điểm trận nằm sát mép bắc làng).
const TULINH_SAFE_R = 78;
const isSafeZone = (x, y) =>
  insideVillage(x, y) || insideSect(x, y) || Math.hypot(x - 700, y - 196) <= TULINH_SAFE_R;
const POND = { x: 915, y: 845, w: 150, h: 90 }; // ao sen (vật cản)
// GĐ53: khung va chạm nhà NỞ theo hình vẽ thật — mái hiên/nóc thò ra
// ngoài khung logic ~10px hai bên và ~16px phía nóc; KHÔNG nở đáy (mặt
// tiền) để giữ nguyên các điểm tương tác trước nhà.
const HOUSE_OBSTACLES = HOUSES.map((h) => ({ x: h.x - 10, y: h.y - 16, w: h.w + 20, h: h.h + 16 }));
// GĐ53: thân cây cũng là vật cản (trước đây cây chỉ là hình vẽ nên người
// và quái đi xuyên qua thân). Khớp WORLD_GEO.trees bên client — sửa vị
// trí cây thì phải sửa cả hai nơi. Khung nhỏ quanh gốc (gốc ở ty+12).
// GĐ91: cây lẻ ĐI XUYÊN ĐƯỢC — TREE_TRUNKS không còn nằm trong OBSTACLES
// nữa (chỉ còn dùng để vẽ cây lên bản đồ tổng quan ở HOME_DECOR). Dải
// rừng ngăn Thạch Lâm vẫn chặn nhờ vách x=2252 trong REALM_WALLS.
const TREE_TRUNKS = [
  [280, 220], [1120, 220], [280, 900], [1120, 905], [520, 300], [880, 300],
  [520, 860], [880, 640], [280, 400], [1120, 400], [640, 215], [760, 905],
  [150, 150], [1450, 150], [150, 1050], [1450, 1050], [120, 600], [1480, 600],
  [800, 80], [80, 80],
  // GĐ57: cây dải rừng ngăn (x≈1680) + cây trong bí cảnh — KHỚP WORLD_GEO.trees phía client
  [2280, 150], [2292, 330], [2276, 520], [2290, 700], [2280, 880], [2294, 1050],
  [2500, 340], [2750, 320], [3050, 360], [2580, 880], [2880, 890], [3120, 860],
  [2650, 560], [3000, 660],
].map(([tx, ty]) => ({ x: tx - 6, y: ty + 6, w: 12, h: 12 }));
// ================= GĐ57: BÍ CẢNH THẠCH LÂM (bí cảnh NHỎ) =================
// File thiết kế: bí cảnh nhỏ là QUYỀN LỢI của đệ tử tông môn trung/lớn
// (Thiên Kiếm Môn / Huyền Thiên Tông). Tên "Thạch Lâm" lấy từ dữ liệu bản
// đồ GDD của người chơi (thach_lam — quê của Thạch Khôi Lỗi). Vùng nằm ở
// phía đông thế giới, ngăn với làng bằng một dải rừng rậm không đi bộ qua
// được — chỉ vào/ra bằng CỔNG BÍ CẢNH (NPC cổng ở sân Thanh Phong Môn).
const REALM = { x: 2360, y: 240, w: 880, h: 720, name: 'Bí Cảnh Thạch Lâm' }; // GĐ126: dời đông 600 theo map mở rộng
const REALM_ENTRY = { x: 2505, y: 640 }; // điểm rơi xuống khi qua cổng vào
const REALM_RETURN = { x: 1438, y: 648 }; // điểm trở về (trước cổng, sân Thanh Phong Môn — nay đã trong làng)
const REALM_BOSS_AREA = { x: 2690, y: 510, w: 220, h: 180 }; // quanh đàn đá — Thạch Khôi Lỗi
function insideRealm(x, y, pad = 0) {
  return x >= REALM.x - pad && x <= REALM.x + REALM.w + pad && y >= REALM.y - pad && y <= REALM.y + REALM.h + pad;
}
const REALM_WALLS = [
  { x: REALM.x - 16, y: REALM.y - 16, w: REALM.w + 32, h: 16 },
  { x: REALM.x - 16, y: REALM.y + REALM.h, w: REALM.w + 32, h: 16 },
  { x: REALM.x - 16, y: REALM.y - 16, w: 16, h: REALM.h + 32 },
  { x: REALM.x + REALM.w, y: REALM.y - 16, w: 16, h: REALM.h + 32 },
  { x: 2252, y: 0, w: 16, h: WORLD_H }, // vách rừng rậm ngăn làng ↔ bí cảnh (GĐ126: dời đông 600)
];
// GĐ91: cây đi xuyên được nên OBSTACLES không còn gốc cây — chỉ nhà,
// ao, vách bí cảnh (vách rừng x=2252 vẫn giữ cổng Thạch Lâm).
const OBSTACLES = [...HOUSE_OBSTACLES, POND, ...REALM_WALLS];

function insideVillage(x, y, pad = 0) {
  return (
    x >= VILLAGE.x - pad && x <= VILLAGE.x + VILLAGE.w + pad &&
    y >= VILLAGE.y - pad && y <= VILLAGE.y + VILLAGE.h + pad
  );
}

// Điểm (x, y) có nằm trong vật cản nào không (pad = bán kính thân người)
function hitsObstacle(x, y, pad = 14) {
  return OBSTACLES.some(
    (r) => x >= r.x - pad && x <= r.x + r.w + pad && y >= r.y - pad && y <= r.y + r.h + pad,
  );
}

// GĐ53: di chuyển tách trục có tôn trọng vật cản. Nếu đối tượng đang lỡ
// đứng TRONG vùng cấm (vd quái đẻ cạnh thân cây mới thêm) thì cho đi ra
// thay vì kẹt cứng tại chỗ. Bước đầy bị chặn thì thử BƯỚC NỬA — mỗi tick
// đi ~26px nên không có bước nửa, nhân vật dừng cách tường tới ~26px.
function moveWithCollision(a, nx, ny) {
  const mid = mapOf(a); // GĐ59: vật cản theo map của đối tượng
  const stuck = hitsObstacleIn(mid, a.x, a.y);
  if (stuck || !hitsObstacleIn(mid, nx, a.y)) a.x = nx;
  else { const mx = (a.x + nx) / 2; if (!hitsObstacleIn(mid, mx, a.y)) a.x = mx; }
  if (stuck || !hitsObstacleIn(mid, a.x, ny)) a.y = ny;
  else { const my = (a.y + ny) / 2; if (!hitsObstacleIn(mid, a.x, my)) a.y = my; }
}

const app = express();
const server = http.createServer(app);

// Socket.io — cho phép client Vite (cổng 5173) kết nối chéo origin khi dev
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
  pingInterval: 25000,
  pingTimeout: 45000, // GĐ56: nới chờ pong — server free CPU yếu dễ trễ nhịp, tránh rớt oan
});

// GĐ56: một lỗi bất ngờ lúc xử lý KHÔNG được phép làm sập cả tiến trình
// (mọi người chơi rớt theo) — ghi log để truy vết, giữ server sống.
process.on('uncaughtException', (e) => { console.error('[CRASH-GUARD] uncaughtException:', (e && e.stack) || e); });
process.on('unhandledRejection', (e) => { console.error('[CRASH-GUARD] unhandledRejection:', (e && e.stack) || e); });

// API trạng thái để kiểm tra nhanh (trang chủ / dành cho bản dựng game)
app.get('/api/status', (req, res) => {
  res.json({
    game: 'Tap Tanh Tu Tien — server',
    status: 'ok',
    tickRate: '10/giây',
    players: players.size,
    monsters: monsters.size,
    storage: storage.mode(), // 'file' hoặc 'mongodb' — kiểm tra nhanh chế độ lưu trữ
    world: worldClock(), // GĐ20: đồng hồ thế giới hiện tại
  });
});

// GIAI ĐOẠN 5: server phục vụ luôn bản dựng của client (client/dist)
// → cả game chạy ở MỘT địa chỉ http://localhost:3001
const CLIENT_DIST = path.join(__dirname, '..', 'client', 'dist');
app.use(express.static(CLIENT_DIST));
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/socket.io/') || req.path.startsWith('/api/')) return next();
  res.sendFile(path.join(CLIENT_DIST, 'index.html'), (err) => {
    if (err) res.status(503).send('Client chua duoc build — hay chay: npm start (tu build) hoac npm --prefix client run build');
  });
});

// ------------------------- Trạng thái thế giới -------------------------
/** @type {Map<string, {id:string, x:number, y:number, vx:number, vy:number, input:{vx:number, vy:number}, isBot:boolean}>} */
const players = new Map();

const rand = (min, max) => min + Math.random() * (max - min);

function makeVelocity() {
  const angle = Math.random() * Math.PI * 2;
  const speed = rand(24, 60); // px/giây
  return { vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed };
}

function plazaSpawn() {
  const ang = Math.random() * Math.PI * 2;
  const rad = rand(20, 95);
  return { x: Math.round(PLAZA.x + Math.cos(ang) * rad), y: Math.round(PLAZA.y + Math.sin(ang) * rad) };
}

const BOT_NAMES = ['A Ngưu', 'Tiểu Mai', 'Lão Trần', 'A Phúc', 'Tiểu Lan', 'Chú Tư', 'A Bảo', 'Tiểu Hà'];

function createPlayer(id, isBot) {
  const v = makeVelocity();
  const pos = plazaSpawn();
  const botStats = { khiHuyet: 5, vatCong: 5, vatPhong: 5, phapCong: 5, phapPhong: 5, tocDo: 5, thanThuc: 5 };
  const player = {
    id,
    x: pos.x,
    y: pos.y,
    vx: v.vx, // vận tốc tự trôi — chỉ bot dùng
    vy: v.vy,
    input: { vx: 0, vy: 0 }, // vector điều khiển mới nhất — chỉ người thật dùng
    direction: 'down', // hướng nhìn: 'left' | 'right' | 'up' | 'down'
    isBot: !!isBot,
    // Nhân vật (GĐ6) — bot chỉ là dân làng demo cho có sinh khí
    name: isBot ? BOT_NAMES[(parseInt(id.split('-')[1], 10) || 1) - 1] || 'Dân làng' : '',
    classId: 'thetu',
    stats: botStats,
    hp: maxHpOf(botStats),
    mp: maxMpOf(botStats),
    token: null,
    lastAttackAt: 0,
    realm: 'pham',
    tier: 0,
  };
  players.set(id, player);
  return player;
}

// Dựng player từ nhân vật đã lưu (hoặc vừa tạo).
// charKey = khóa trong characters.json (token trình duyệt với khách,
// charId với nhân vật của tài khoản).
function spawnFromCharacter(socket, charKey, char) {
  // GĐ32: giữ cờ "học xong lúc offline" TRƯỚC mọi lần persistPlayer trong
  // hàm này (persist ghi đè hồ sơ từ player object sẽ xóa cờ nếu đọc sau)
  const pendingLearnedName = char.learnedOfflineName || null;
  // GĐ21: nhân vật đang hiện offline (ngồi thiền/ngủ ở điểm an toàn) → gỡ bản
  // offline khỏi thế giới, người thật tiếp quản ngay tại chỗ đó. Tổng kết
  // quãng nghỉ do vòng tick ghi trên bản offline (số ngày + Tu vi đã cộng).
  let offlineSummary = null;
  for (const [id, op] of players) {
    if (op.charKey !== charKey) continue;
    if (op.isOffline) {
      if ((op.restDays || 0) > 0) {
        offlineSummary = { state: op.restState || null, days: op.restDays, grant: op.restGrant || 0 };
      }
      players.delete(id);
    } else {
      // GĐ56: bản ONLINE của phiên socket cũ chưa kịp timeout (người chơi
      // vừa nối lại bằng socket mới) → cho nghỉ hưu ngay: gỡ khỏi thế
      // giới + đánh dấu để khi socket cũ ngắt hẳn, disconnect KHÔNG kéo
      // nhân vật đi nghỉ offline chồng lên phiên mới.
      op._superseded = true;
      players.delete(id);
    }
  }
  // GĐ59: nhân vật có thể đang đứng ở map khác — hồi sinh đúng map đó
  const spawnMapId = MAP_DEFS.has(char.mapId) && char.mapId !== 'thach_lam' && char.mapId !== 'bai_farm' ? char.mapId : HOME_MAP;
  let pos;
  if (spawnMapId === HOME_MAP) {
    pos =
      typeof char.x === 'number' && typeof char.y === 'number' && !hitsObstacle(char.x, char.y)
        ? { x: char.x, y: char.y }
        : plazaSpawn();
  } else {
    const rt = MAP_RUNTIME.get(spawnMapId);
    pos =
      rt && typeof char.x === 'number' && typeof char.y === 'number' && char.x >= 0 && char.x <= rt.w && char.y >= 0 && char.y <= rt.h && !hitsObstacleIn(spawnMapId, char.x, char.y)
        ? { x: char.x, y: char.y }
        : { x: rt ? rt.portal.x : 800, y: rt ? rt.portal.y - 56 : 600 };
  }
  const player = {
    id: socket.id,
    x: pos.x,
    y: pos.y,
    mapId: spawnMapId, // GĐ59
    vx: 0,
    vy: 0,
    input: { vx: 0, vy: 0 },
    direction: 'down',
    isBot: false,
    name: char.name,
    classId: char.classId,
    stats: char.stats,
    hp: (char.hp ?? maxHpEff(char)) <= 0 ? maxHpEff(char) : Math.min(char.hp, maxHpEff(char)), // GĐ104: file hp 0 (thoát lúc gục ngã) → tỉnh dậy đầy máu, không kẹt ở 0 máu
    mp: Math.min(char.mp ?? maxMpEff(char), maxMpEff(char)),
    token: charKey,
    charKey,
    // GĐ10: ngoại hình tùy chỉnh (robe = null → màu mặc định theo lớp)
    robe: migrateRobe(char.robe ?? null),
    gender: char.gender || 'nam',
    // GĐ11: vũ khí khởi đầu (nhân vật cũ chưa có → vũ khí đầu của lớp)
    weaponId: weaponOf(char.classId, char.weaponId)?.id || null,
    account: char.account || null,
    lastAttackAt: 0,
    // Tiến trình tu luyện (GĐ7) — nhân vật cũ chưa có thì dùng mặc định
    freePoints: char.freePoints ?? FREE_POINTS_START,
    statPoints: char.statPoints ?? 0,
    allocFree: char.allocFree && typeof char.allocFree === 'object' ? char.allocFree : {}, // GĐ74
    allocStat: char.allocStat && typeof char.allocStat === 'object' ? char.allocStat : {}, // GĐ74
    linhCan: char.linhCan ?? null,
    realm: char.realm ?? 'pham',
    tier: char.tier ?? 0,
    tuVi: char.tuVi ?? 0,
    // GĐ19
    failStreak: char.failStreak ?? 0,
    trialReady: char.trialReady ?? null,
    statPenaltyStacks: char.statPenaltyStacks ?? 0,
    // GĐ20: tuổi/thọ — nhân vật cũ chưa có thì TẠM 16 tuổi / thọ 80, sinh nhật = hôm nay
    ageStart: char.ageStart ?? 16,
    lifespan: char.lifespan ?? 80,
    graceStartDay: char.graceStartDay ?? null, // GĐ25
    birthDay: char.birthDay ?? worldClock().dayIndex,
    lastDayIndex: char.lastDayIndex ?? worldClock().dayIndex,
    // GĐ21: Tọa Thiền + nhà an toàn (trạng thái nghỉ chỉ tồn tại lúc offline)
    meditation: !!char.meditation,
    restState: null,
    lastCombatAt: 0, meditating: false, meditAcc: 0, // GĐ76: đồng hồ giao tranh + thiền
    tuViMedDay: char.tuViMedDay ?? -1, tuViMedGain: char.tuViMedGain ?? 0, // GĐ76: trần Tu vi thiền/ngày
    food: char.food ?? 100, water: char.water ?? 100, // GĐ78: thức ăn / nước uống (lưu bền)
    classRes: char.classRes && typeof char.classRes === 'object' ? char.classRes : {}, // GĐ95: tài nguyên lớp
    tamBo: char.tamBo && typeof char.tamBo === 'object' ? { hp: char.tamBo.hp || 0, def: char.tamBo.def || 0 } : { hp: 0, def: 0 }, // GĐ96
    // GĐ22: con đường khởi đầu (nhân vật cũ chưa có → chơi 1 mình)
    path: char.path === 'sect' ? 'sect' : 'solo',
    homeType: char.homeType || (char.path === 'sect' ? 'tongmon' : 'daoquan'),
    skills: Array.isArray(char.skills) ? char.skills : [],
    skillReadyAt: {},
    // GĐ8: kinh tế + nhiệm vụ
    stones: char.stones ?? 0,
    stonesTrung: char.stonesTrung ?? 0, // GĐ67
    stonesThuong: char.stonesThuong ?? 0, // GĐ67
    stonesCuc: char.stonesCuc ?? 0, // GĐ69
    inventory: char.inventory && typeof char.inventory === 'object' ? char.inventory : {},
    gearBag: char.gearBag && typeof char.gearBag === 'object' ? char.gearBag : {}, // GĐ119: kho trang bị (mỗi món 1 uid)
    gear: char.gear && typeof char.gear === 'object' ? char.gear : {}, // GĐ119: ô nào đang mặc món nào {slot: uid}
    gearOrders: Array.isArray(char.gearOrders) ? char.gearOrders : [], // GĐ119 bước 4: đơn đặt rèn
    gearShopBought: char.gearShopBought && typeof char.gearShopBought === 'object' ? char.gearShopBought : {}, // GĐ119 bước 4
    quests: char.quests && typeof char.quests === 'object' ? char.quests : {},
    // GĐ24: thiện cảm NPC
    affinity: char.affinity && typeof char.affinity === 'object' ? char.affinity : {},
    affTalk: char.affTalk && typeof char.affTalk === 'object' ? char.affTalk : {},
    // GĐ26: nghề phụ
    job: char.job && JOBS[char.job.jobId] ? { jobId: char.job.jobId, crafts: char.job.crafts || 0, master: char.job.master || null } : null,
    gatheredNodes: char.gatheredNodes && typeof char.gatheredNodes === 'object' ? char.gatheredNodes : {}, // GĐ132: ngày thu thập từng điểm tài nguyên (per-player)
    buffs: char.buffs && typeof char.buffs === 'object' ? char.buffs : {}, // GĐ133: buff đan dược (until ms, quá hạn tick dọn)
    teleportArray: char.teleportArray || null, // GĐ135: Trận Dịch Chuyển (bền qua restart)
    merit: char.merit || 0, boardQuests: char.boardQuests || 0, letterGiven: !!char.letterGiven, sect: char.sect || null, sectTrialPassed: !!char.sectTrialPassed, learning: char.learning || null, // GĐ30+31
    flags: char.flags && typeof char.flags === 'object' ? char.flags : {}, // GĐ40: cờ chuỗi nhiệm vụ (vụ án bệnh lạ)
    merchantOrder: char.merchantOrder || null, // GĐ40+: đơn đặt hàng với thương nhân lưu động
    caseCulprit: char.caseCulprit || null, caseClues: char.caseClues && typeof char.caseClues === 'object' ? char.caseClues : {}, // GĐ40+: vụ án điều tra
    rivalWins: char.rivalWins || 0, merchantRep: char.merchantRep || 0, benhlaClues: char.benhlaClues && typeof char.benhlaClues === 'object' ? char.benhlaClues : {}, // GĐ86
    equipped: char.equipped || [], // GĐ36
    boards: char.boards || null, activeBoard: char.activeBoard || 0, // GĐ37
    // GĐ27: số liệu thành tựu
    counters: char.counters && typeof char.counters === 'object' ? char.counters : {},
    achClaimed: Array.isArray(char.achClaimed) ? char.achClaimed : [],
  };
  player.gearStats = gearTotalsOf(player); // GĐ119: cache tổng chỉ số đồ mặc (tính lại sau mỗi lần mặc/tháo)
  // GĐ20+GĐ21: cộng dồn Tu vi cho những ngày trôi qua lúc nhân vật offline,
  // theo TRẠNG THÁI NGHỈ của nhân vật (người chơi chốt 22/10):
  // - Ngồi thiền (đã học Tọa Thiền): hấp thụ linh khí như bế quan +3/ngày.
  // - Ngủ (chưa học Tọa Thiền): không hấp thụ → 0.
  // - restState trống = lần thoát trước GĐ21 → giữ luật GĐ20 (+1/ngày).
  // Trần 30 ngày là TẠM chống lạm dụng (file không ghi). Nếu server vẫn chạy
  // lúc qua ngày, vòng tick đã cộng trực tiếp cho bản offline nên daysAway = 0.
  const daysAway = worldClock().dayIndex - player.lastDayIndex;
  if (daysAway > 0) {
    const rate = char.restState === 'meditate' ? 3 : char.restState === 'sleep' ? 0 : 1;
    const grant = Math.min(daysAway, 30) * rate;
    player.tuVi += grant;
    player.offlineTuViGrant = grant;
    player.restSummary = { state: char.restState || null, days: daysAway, grant };
    player.lastDayIndex = worldClock().dayIndex;
  } else if (offlineSummary) {
    // Server chạy suốt lúc nhân vật nghỉ: tick đã cộng Tu vi trực tiếp rồi,
    // ở đây chỉ còn tổng kết để báo cho người chơi.
    player.restSummary = offlineSummary;
  }
  players.set(socket.id, player);
  // Lưu ngay khi: có cộng ngày / nhân vật cũ chưa có tuổi / còn trạng thái nghỉ
  // trong file (phải xóa restState khỏi file, kẻo server khởi động lại sẽ dựng
  // nhầm bản offline trong lúc người chơi đang online).
  if (daysAway > 0 || char.ageStart == null || char.restState) persistPlayer(player);
  // GĐ25: kiểm tra thọ nguyên ngay khi vào game — hết ân hạn thì tọa hóa
  // (không cho vào thế giới), mới hết thọ thì bắt đầu ân hạn + báo người chơi.
  const lifeState = checkLifespan(player);
  if (lifeState === 'die') {
    killCharacterPermanent(player);
    socket.emit('character_died', {
      name: char.name,
      message: `${char.name} đã hết thọ nguyên và qua 30 ngày ân hạn — nhân vật TỌA HÓA vĩnh viễn. Hãy tạo nhân vật mới để bắt đầu kiếp tu mới.`,
    });
    return null;
  }
  if (lifeState === 'grace_started' || lifeState === 'grace') {
    socket.emit('lifespan_grace', { graceDaysLeft: graceDaysLeftOf(player), lifespanLeft: lifespanLeftOf(player) });
  }
  normalizeLearning(player, socket);
  normalizeEquipped(player); // GĐ36: nhân vật cũ tự lắp các chiêu đầu vào ô
  // (normalizeLearning phía trên: chuyển hồ sơ lĩnh ngộ bản cũ sang tiến độ phút)
  // GĐ100: Pháp Tu đã ở TC+ mà chưa từng roll Biến Dị → roll bù 1 lần (cùng tỉ lệ
  // 5%), persist ngay để lần vào sau không roll lại.
  if (player.classId === 'phaptu' && (REALM_ORDER[player.realm] ?? 0) >= 2 && classResOf(player).bienDi === undefined) {
    const bd = rollBienDi();
    classResOf(player).bienDi = bd;
    persistPlayer(player);
    if (bd) socket.emit('notice', { text: `✦ Linh căn biến dị: ${bd}! Pháp thuật của bạn mang thêm hiệu ứng hệ ${bd}.` });
  }
  // GĐ32: học xong công pháp trong lúc offline → báo ngay khi vào game
  if (pendingLearnedName) {
    const skDone = (player.skills || []).map((id) => SKILL_BY_ID[id]).find((s) => s && s.name === pendingLearnedName);
    if (skDone) socket.emit('skill_learned', { skill: skDone });
    socket.emit('notice', { text: `📖 Trong lúc bạn vắng mặt, nhân vật đã ngồi học ở nơi an toàn và LĨNH NGỘ XONG ${pendingLearnedName}!` });
    player.learnedOfflineName = null;
    persistPlayer(player);
  }
  spawnCompanions(player); // GĐ22: đường tông môn → 2 đồng môn theo cùng
  spawnCotVuong(player); // GĐ101: Cốt Vương còn lõi nguyên thì hiện lại theo chủ
  spawnQuyHon(player); // GĐ102: Quỷ Hồn còn sống thì hiện lại theo chủ
  spawnTamed(player); // GĐ137: thú thuần hóa còn sống thì hiện lại theo chủ
  // GĐ59: vào phòng đồng bộ của map + báo client dựng đúng bản đồ
  socket.join('map:' + mapOf(player));
  socket.emit('map_enter', mapEnterPayload(mapOf(player)));
  return player;
}

// Gói dữ liệu nhân vật gửi cho client (welcome / char_sync / HUD)
function characterPayload(p) {
  return {
    name: p.name,
    classId: p.classId,
    className: CLASSES[p.classId]?.name || p.classId,
    // GĐ10: ngoại hình + tài khoản
    robe: p.robe ?? null,
    gender: p.gender || 'nam',
    account: p.account || null,
    // GĐ11: vũ khí đang dùng
    weaponId: p.weaponId || null,
    weaponName: weaponOf(p.classId, p.weaponId)?.name || null,
    stats: p.stats,
    freePoints: p.freePoints ?? FREE_POINTS_START,
    statPoints: p.statPoints ?? 0,
    hp: Math.round(p.hp),
    maxHp: maxHpEff(p),
    mp: Math.round(p.mp),
    maxMp: maxMpEff(p),
    gearStats: p.gearStats || gearTotalsOf(p), // GĐ119: tổng chỉ số đồ đang mặc (cho probe + UI bước 5)
    // GĐ7: tu luyện
    linhCan: p.linhCan ?? null,
    bienDi: bienDiOf(p), // GĐ100: hệ Biến Dị Pháp Tu (null = không có)
    realm: p.realm ?? 'pham',
    tier: p.tier ?? 0,
    tuVi: p.tuVi ?? 0,
    escort: p.escort ? { dest: p.escort.dest, destName: MAP_DEFS.get(p.escort.dest)?.name || p.escort.dest, delivery: p.escort.delivery, reward: p.escort.reward } : null, // GĐ60
    tuViNeed: (() => {
      const bi = breakInfoFor(p.realm ?? 'pham', p.tier ?? 0);
      return bi && bi.type !== 'blocked_kimdan' && bi.type !== 'blocked_na' ? tuViNeedStep(globalStep(p.realm, p.tier)) : null;
    })(),
    // GĐ19: thông tin đột phá kế tiếp cho HUD (loại, đan cần, đã thắng thử thách chưa)
    breakInfo: (() => {
      const bi = breakInfoFor(p.realm ?? 'pham', p.tier ?? 0);
      if (!bi) return null;
      return {
        type: bi.type,
        pill: bi.pill || null,
        pillName: bi.pill ? ITEMS[bi.pill]?.name : null,
        trial: bi.trial || null,
        trialReady: bi.trial ? p.trialReady === bi.trial : false,
        failStreak: p.failStreak || 0,
        lifespanGain: bi.lifespan || 0,
      };
    })(),
    // GĐ20: tuổi hiện tại + thọ nguyên còn lại + đồng hồ thế giới + Tu vi cộng lúc offline
    age: ageOf(p),
    lifespan: p.lifespan ?? 80,
    lifespanLeft: (p.lifespan ?? 80) - ageOf(p),
    // GĐ25: số ngày ân hạn còn lại (null = thọ chưa tận)
    graceDaysLeft: graceDaysLeftOf(p),
    // GĐ30: Công trạng + tông môn hiện tại
    merit: p.merit || 0,
    sect: p.sect || null,
    sectName: p.sect && SECTS[p.sect] ? SECTS[p.sect].name : null,
    // GĐ86: tiến trình nội dung sống (đồng bộ cho probe + client sau này)
    rivalWins: p.rivalWins || 0,
    merchantRep: p.merchantRep || 0,
    benhlaClues: Object.keys(p.benhlaClues || {}).length,
    classRes: p.classRes || {}, // GĐ95: tài nguyên riêng từng lớp (Nộ Khí Thể Tu...)
    tamBo: p.tamBo || { hp: 0, def: 0 }, // GĐ96: tổng Tẩm bổ vĩnh viễn
    buffs: activeBuffsPayload(p), // GĐ133: buff đan dược đang còn hạn (cho HUD + probe)
    teleportArray: p.teleportArray || null, // GĐ135: Trận Dịch Chuyển (cho nút Gọi về ở panel Nghề)
    // GĐ31-sửa: công pháp đang lĩnh ngộ (nếu có) + tiến độ phút game
    learning: p.learning
      ? (() => {
          const sk = SKILL_BY_ID[p.learning.skillId];
          const need = learningNeedMin(sk, p);
          const prog = Math.floor(p.learning.progressMin || 0);
          return {
            skillId: p.learning.skillId,
            name: sk?.name || p.learning.skillId,
            tier: sk?.tier || 'luyenkhi',
            progressMin: prog,
            needMin: need,
            pct: Math.min(100, Math.floor((prog / need) * 100)),
            active: !!p.learningActive,
          };
        })()
      : null,
    // GĐ32: DANH MỤC công pháp (lớp + theo vũ khí đang cầm) cho panel học
    catalog: (() => {
      const out = [];
      const seen = new Set();
      const push = (sk, legacy) => {
        if (!sk || seen.has(sk.id)) return;
        seen.add(sk.id);
        let condMet;
        let condText = condTextOf(sk);
        if (legacy) {
          if (sk.tier === 'luyenkhi') { condMet = p.realm === 'lk' && p.tier >= 3; condText = 'Luyện Khí tầng 3'; }
          else { condMet = p.realm === 'tc'; condText = 'Cảnh giới Trúc Cơ'; }
        } else {
          const realmOk = sk.tier === 'coban' ? !!p.linhCan : sk.tier === 'luyenkhi' ? p.realm !== 'pham' : sk.tier === 'kimdan' ? (REALM_ORDER[p.realm] ?? 0) >= 3 : p.realm === 'tc';
          condMet = realmOk && condMetOf(p, sk);
          condText = sk.condText || condText;
        }
        out.push({
          id: sk.id, name: sk.name, tier: sk.tier, coef: sk.coef, cdMs: sk.cdMs, cost: sk.cost, range: sk.range,
          element: sk.element || CLASS_ELEMENT[p.classId] || '', weaponId: sk.weaponId || '', condText, condMet,
          desc: sk.desc || '',
          fxText: sk.fxText || '',
          learned: (p.skills || []).includes(sk.id),
          equipped: equippedOf(p).includes(sk.id), // GĐ36: đang lắp ô chính (bảng hiện tại)
          equippedUtil: activeBoardOf(p).util.includes(sk.id), // GĐ37: đang lắp ô đa dụng
          utility: isUtilitySkill(sk), // GĐ37: chiêu hỗ trợ → lắp được vào ô đa dụng
          isLearning: p.learning?.skillId === sk.id,
        });
      };
      for (const sk of SKILLS[p.classId] || []) if (sk.tier === 'luyenkhi' || sk.tier === 'trucco') push(sk, true);
      const w = weaponOf(p.classId, p.weaponId);
      if (w) for (const sk of SKILL_CATALOG[p.classId]?.[w.id] || []) push(sk, false);
      // GĐ80: công pháp tông riêng ĐÃ HỌC — hiện trong Sổ để lắp/tháo
      // (học thì chỉ ở Sứ Giả, không học từ Sổ)
      if (p.sect && NEW_SECTS[p.sect]) {
        for (const sk of SECT_SKILLS[p.sect] || []) {
          if ((p.skills || []).includes(sk.id)) push(sk, false);
        }
      }
      // GĐ88: thần thông Kim Đan ĐÃ HỌC — hiện trong Sổ để lắp/tháo
      // (tự lĩnh ngộ khi đột phá Kim Đan, không học từ Sổ)
      for (const sk of KD_SKILLS[p.classId] || []) {
        if ((p.skills || []).includes(sk.id)) push(sk, false);
      }
      return out;
    })(),
    offlineTuViGrant: p.offlineTuViGrant || 0,
    world: worldClock(),
    // GĐ21: đã học Tọa Thiền chưa + tổng kết quãng nghỉ offline vừa qua
    meditation: !!p.meditation,
    restSummary: p.restSummary || null,
    // GĐ22: con đường khởi đầu + nhà an toàn
    path: p.path === 'sect' ? 'sect' : 'solo',
    homeType: p.homeType || 'daoquan',
    // GĐ23: đang bế quan hay không
    bequan: !!p.bequan,
    // GĐ24: thiện cảm theo NPC
    affinity: p.affinity || {},
    // GĐ26: nghề phụ (kèm cấp hiện tại đã tính trần theo cảnh giới) — GĐ131: kèm sư phụ + danh hiệu đầy đủ
    job: p.job && JOBS[p.job.jobId]
      ? { jobId: p.job.jobId, jobName: JOBS[p.job.jobId].name, crafts: p.job.crafts || 0, rank: jobRankOf(p), rankName: JOB_RANK_NAMES[jobRankOf(p)], title: jobTitleOf(p), master: p.job.master || null }
      : null,
    // GĐ27: thành tựu (trạng thái tính sẵn)
    achievements: achievementState(p),
    // GĐ36+37: thanh chiêu = ô CHÍNH của bảng đang dùng (theo thứ tự ô)
    skills: equippedOf(p)
      .map((id) => skillById(p.classId, id))
      .filter(Boolean)
      .map((s) => ({ id: s.id, name: s.name, tier: s.tier, coef: s.coef, cdMs: Math.round(s.cdMs * (1 - cdrOf(effStatsOf(p)))), cost: s.cost, range: s.range })),
    // GĐ37: ô ĐA DỤNG của bảng đang dùng
    utilSkills: activeBoardOf(p).util
      .map((id) => skillById(p.classId, id))
      .filter(Boolean)
      .map((s) => ({ id: s.id, name: s.name, tier: s.tier, coef: s.coef, cdMs: Math.round(s.cdMs * (1 - cdrOf(effStatsOf(p)))), cost: s.cost, range: s.range })),
    // GĐ36+37: số ô đang dùng / tối đa + bảng đang chọn
    skillSlots: { used: equippedOf(p).length, max: slotCountFor(p), utilUsed: activeBoardOf(p).util.length, utilMax: UTIL_MAX },
    activeBoard: p.activeBoard || 0,
    // GĐ40+: vụ án nào đang mở hôm nay (để client hiện/ẩn nút Nhận ở bảng)
    caseActive: Object.fromEntries(Object.entries(QUESTS).filter(([, d]) => d.caseCycle).map(([qid, d]) => [qid, caseActiveToday(d)])),
    merchantOrder: p.merchantOrder || null, // GĐ40+
    boardsInfo: boardsOf(p).map((b) => ({ main: b.main.length, util: b.util.length })),
    // GĐ8: ví + túi + nhiệm vụ (tiến độ nhiệm vụ thu thập tính theo túi đồ)
    stones: p.stones ?? 0,
    stonesTrung: p.stonesTrung ?? 0, // GĐ67
    stonesThuong: p.stonesThuong ?? 0, // GĐ67
    stonesCuc: p.stonesCuc ?? 0, // GĐ69
    inventory: p.inventory || {},
    gearBag: p.gearBag || {}, // GĐ119: kho trang bị (đọc ở welcome/char_sync)
    gear: p.gear || {}, // GĐ119: đồ đang mặc
    gearOrders: p.gearOrders || [], // GĐ119 bước 4: đơn đặt rèn (UI nhận đồ)
    quests: Object.fromEntries(
      Object.entries(p.quests || {}).map(([qid, q]) => {
        const def = QUESTS[qid];
        const progress =
          def && def.kind === 'item' ? Math.min((p.inventory || {})[def.itemId] || 0, def.target) : q.progress || 0;
        return [qid, { progress, state: q.state }];
      }),
    ),
  };
}

// Đẩy trạng thái nhân vật mới nhất về đúng chủ nhân (sau mỗi thay đổi)
function syncChar(socket, p) {
  socket.emit('char_sync', characterPayload(p));
}

// Cập nhật hướng nhìn từ vector di chuyển: trục nào có độ lớn
// vận tốc lớn hơn sẽ quyết định hướng; đứng yên thì giữ hướng cũ.
function faceDirection(p, mvx, mvy) {
  if (mvx === 0 && mvy === 0) return;
  if (Math.abs(mvx) >= Math.abs(mvy)) {
    p.direction = mvx > 0 ? 'right' : 'left';
  } else {
    p.direction = mvy > 0 ? 'down' : 'up';
  }
}

// ---- GĐ21: nhân vật offline (ngồi thiền / ngủ ở điểm an toàn) ----
// Khi người chơi thoát, nhân vật KHÔNG biến mất: tự trở về điểm an toàn gần
// nhất (hiện tại: sân Đạo Quán cho chế độ chơi 1 mình; homeType 'tongmon' để
// dành cho đợt tông môn) rồi ngồi thiền (nếu đã học Tọa Thiền) hoặc ngủ.
// Bản offline ở lại trong `players` để người khác nhìn thấy, không điều khiển
// được, quái không chạm tới (điểm an toàn trong làng).
function goOffline(p) {
  // Dọn trùm thử thách đang dang dở của người này (thử thách bị hủy khi thoát)
  for (const m of Array.from(monsters.values())) {
    if (m.kind === 'trial' && m.ownerId === p.id) monsters.delete(m.id);
  }
  p.bequan = false; // GĐ23: thoát game là dứt bế quan (chuyển sang nghỉ offline)
  p.learningActive = false; // GĐ31-sửa: thoát game là dừng buổi lĩnh ngộ (tiến độ giữ nguyên, không tự trôi)
  p.preaching = false; p.studying = false; p.nhoZone = null; p.tranBuff = null; p.tranDebuff = null; p.tranSeal = null; // GĐ103: thoát game là dứt Thuyết Pháp; GĐ105: dứt đọc sách + xóa Ý Cảnh; GĐ135: dứt trận tạm (Trận Dịch Chuyển bền thì giữ lại)
  p.bequanAcc = 0;
  removeCompanionsOf(p); // GĐ22: đồng môn AI tan theo khi chủ nhân thoát
  const home = p.homeType || 'daoquan';
  const idx = Array.from(players.values()).filter((q) => q.isOffline && (q.homeType || 'daoquan') === home).length;
  const spot = restSpotFor(home, idx);
  p.x = spot.x;
  p.y = spot.y;
  p.direction = 'down';
  p.input = { vx: 0, vy: 0 };
  p.vx = 0;
  p.vy = 0;
  p.isOffline = true;
  // GĐ32: đang có công pháp học dở → về chỗ an toàn NGỒI HỌC TIẾP (trạng thái
  // 'learn') thay vì thiền/ngủ; tiến độ vẫn chạy khi offline như ngồi thiền.
  p.restState = p.learning ? 'learn' : p.meditation ? 'meditate' : 'sleep';
  p.restDays = 0;
  p.restGrant = 0;
  persistPlayer(p);
  console.log(`[offline] ${p.name} về ${REST_BASES[home]?.label || 'Đạo Quán'} — ${p.restState === 'learn' ? 'ngồi học 📖' : p.restState === 'meditate' ? 'ngồi thiền 🧘' : 'đi ngủ 💤'}`);
}
// Dựng lại bản offline khi server khởi động (nhân vật còn restState trong file)
function spawnOfflineActor(charKey, char) {
  if (!char.restState || !char.stats) return;
  const id = 'offline-' + charKey;
  if (players.has(id)) return;
  const actor = {
    id,
    mapId: char.mapId || HOME_MAP, // GĐ89-sửa: giữ map đang đứng qua restart (trước đây autosave ghi đè về làng)
    x: typeof char.x === 'number' ? char.x : REST_SPOT.x,
    y: typeof char.y === 'number' ? char.y : REST_SPOT.y,
    vx: 0, vy: 0, input: { vx: 0, vy: 0 }, direction: 'down',
    isBot: false, isOffline: true,
    name: char.name, classId: char.classId, stats: char.stats,
    hp: maxHpEff(char), mp: maxMpEff(char),
    charKey,
    robe: migrateRobe(char.robe ?? null), gender: char.gender || 'nam',
    weaponId: weaponOf(char.classId, char.weaponId)?.id || null,
    account: char.account || null, lastAttackAt: 0,
    freePoints: char.freePoints ?? FREE_POINTS_START, statPoints: char.statPoints ?? 0,
    linhCan: char.linhCan ?? null, realm: char.realm ?? 'pham', tier: char.tier ?? 0,
    tuVi: char.tuVi ?? 0,
    failStreak: char.failStreak ?? 0, trialReady: char.trialReady ?? null, statPenaltyStacks: char.statPenaltyStacks ?? 0,
    ageStart: char.ageStart ?? 16, lifespan: char.lifespan ?? 80,
    graceStartDay: char.graceStartDay ?? null, // GĐ25
    birthDay: char.birthDay ?? worldClock().dayIndex, lastDayIndex: char.lastDayIndex ?? worldClock().dayIndex,
    meditation: !!char.meditation, restState: char.restState,
    path: char.path === 'sect' ? 'sect' : 'solo',
    homeType: char.homeType || (char.path === 'sect' ? 'tongmon' : 'daoquan'),
    skills: Array.isArray(char.skills) ? char.skills : [], skillReadyAt: {},
    stones: char.stones ?? 0,
    inventory: char.inventory && typeof char.inventory === 'object' ? char.inventory : {},
    gearBag: char.gearBag && typeof char.gearBag === 'object' ? char.gearBag : {}, // GĐ119: kho trang bị qua restart
    gear: char.gear && typeof char.gear === 'object' ? char.gear : {}, // GĐ119
    gearOrders: Array.isArray(char.gearOrders) ? char.gearOrders : [], // GĐ119 bước 4: đơn đặt rèn qua restart
    gearShopBought: char.gearShopBought && typeof char.gearShopBought === 'object' ? char.gearShopBought : {}, // GĐ119 bước 4
    quests: char.quests && typeof char.quests === 'object' ? char.quests : {},
    affinity: char.affinity && typeof char.affinity === 'object' ? char.affinity : {}, // GĐ24
    affTalk: char.affTalk && typeof char.affTalk === 'object' ? char.affTalk : {},
    job: char.job && JOBS[char.job.jobId] ? { jobId: char.job.jobId, crafts: char.job.crafts || 0, master: char.job.master || null } : null, // GĐ26
    gatheredNodes: char.gatheredNodes && typeof char.gatheredNodes === 'object' ? char.gatheredNodes : {}, // GĐ132: ngày thu thập từng điểm tài nguyên (per-player)
    buffs: char.buffs && typeof char.buffs === 'object' ? char.buffs : {}, // GĐ133: buff đan dược (until ms, quá hạn tick dọn)
    teleportArray: char.teleportArray || null, // GĐ135: Trận Dịch Chuyển (bền qua restart; bóng offline phải mang theo kẻo autosave 15s ghi đè mất)
    merit: char.merit || 0, boardQuests: char.boardQuests || 0, letterGiven: !!char.letterGiven, sect: char.sect || null, sectTrialPassed: !!char.sectTrialPassed, learning: char.learning || null, // GĐ30+31
    classRes: char.classRes && typeof char.classRes === 'object' ? char.classRes : {}, // GĐ95: giữ tài nguyên lớp qua restart (kẻo autosave ghi đè mất Nộ)
    tamBo: char.tamBo && typeof char.tamBo === 'object' ? { hp: char.tamBo.hp || 0, def: char.tamBo.def || 0 } : { hp: 0, def: 0 }, // GĐ96: giữ Tẩm bổ qua restart (cùng họ lỗi GĐ89/GĐ95)
    flags: char.flags && typeof char.flags === 'object' ? char.flags : {}, // GĐ40: cờ chuỗi nhiệm vụ (vụ án bệnh lạ)
    merchantOrder: char.merchantOrder || null, // GĐ40+: đơn đặt hàng với thương nhân lưu động
    caseCulprit: char.caseCulprit || null, caseClues: char.caseClues && typeof char.caseClues === 'object' ? char.caseClues : {}, // GĐ40+: vụ án điều tra
    equipped: char.equipped || [], // GĐ36
    boards: char.boards || null, activeBoard: char.activeBoard || 0, // GĐ37
    counters: char.counters && typeof char.counters === 'object' ? char.counters : {}, // GĐ27
    achClaimed: Array.isArray(char.achClaimed) ? char.achClaimed : [],
    learnedOfflineName: char.learnedOfflineName || null, // GĐ32
  };
  players.set(id, actor);
  // GĐ32: nhân vật đang HỌC OFFLINE — thời gian server tắt vẫn trôi theo đồng
  // hồ thế giới: cộng tiến độ theo số ngày đã qua, xong thì ghi nhận luôn.
  if (actor.restState === 'learn' && actor.learning) {
    const days = Math.max(0, worldClock().dayIndex - actor.lastDayIndex);
    if (days > 0) {
      actor.learning.progressMin = (actor.learning.progressMin || 0) + days * 1440;
      const sk = SKILL_BY_ID[actor.learning.skillId];
      if (sk && actor.learning.progressMin >= (actor.learning.needMin || learnNeedMinFor(actor, sk))) {
        completeLearning(actor, null);
        actor.restState = actor.meditation ? 'meditate' : 'sleep';
      }
      persistPlayer(actor);
    }
  }
}

// ---- GĐ22: đồng môn AI (con đường Thanh Phong Môn) ----
// Người chọn đường tông môn có 2 đồng môn đi theo hỗ trợ: chỉ số = 70% của
// chủ nhân (đúng file), tự bám theo và đánh phụ quái quanh chủ. Phần thưởng
// của đường này nhân hệ số 2/3 (bản chơi đơn đã chốt — chia cho cả đội).
const SECT_REWARD_FACTOR = 2 / 3;
const rewardFactorOf = (p) => (p.path === 'sect' ? SECT_REWARD_FACTOR : 1);
const COMPANION_DEFS = [
  { name: 'Đồng môn huynh', classId: 'kiemtu', gender: 'nam', dx: -36, dy: 28 },
  { name: 'Đồng môn muội', classId: 'thetu', gender: 'nu', dx: 36, dy: 28 },
];
function removeCompanionsOf(owner) {
  for (const [id, q] of players) {
    if (q.isCompanion && q.ownerKey === owner.charKey) players.delete(id);
  }
}
function spawnCompanions(owner) {
  if (owner.path !== 'sect' || !owner.charKey) return;
  removeCompanionsOf(owner);
  COMPANION_DEFS.forEach((def, i) => {
    const stats = {};
    for (const k of STAT_KEYS) stats[k] = Math.max(1, Math.round((owner.stats[k] || 5) * 0.7));
    const c = {
      id: `comp-${owner.id}-${i}`,
      x: owner.x + def.dx, y: owner.y + def.dy,
      vx: 0, vy: 0, input: { vx: 0, vy: 0 }, direction: 'down',
      isBot: false, isCompanion: true, ownerId: owner.id, ownerKey: owner.charKey, mapId: mapOf(owner), // GĐ59
      name: def.name, classId: def.classId, stats,
      hp: maxHpOf(stats), mp: maxMpOf(stats),
      robe: null, gender: def.gender,
      weaponId: weaponOf(def.classId, null)?.id || null,
      realm: owner.realm || 'pham', tier: owner.tier || 0, lastAttackAt: 0,
      followDx: def.dx, followDy: def.dy,
    };
    players.set(c.id, c);
  });
}
// AI đồng môn mỗi tick: bám theo chủ; có quái trong 220px quanh chủ thì lao
// vào đánh phụ (đánh thường theo công thức file, công = 70% chỉ số của chủ).
function updateCompanion(c, dt) {
  const owner = players.get(c.ownerId);
  if (!owner || owner.isOffline) {
    players.delete(c.id);
    return;
  }
  c.realm = owner.realm;
  c.tier = owner.tier;
  // Bị bỏ quá xa (kẹt góc nhà, chủ chạy nhanh...) → đồng môn đuổi kịp bằng
  // cách xuất hiện lại ngay cạnh chủ (kiểu game MMO vẫn làm với bạn đồng hành)
  if (Math.hypot(owner.x - c.x, owner.y - c.y) > 280) {
    const tx = owner.x + c.followDx;
    const ty = owner.y + c.followDy;
    if (!hitsObstacle(tx, ty)) {
      c.x = tx;
      c.y = ty;
    }
  }
  let target = null;
  let td = Infinity;
  for (const m of monsters.values()) {
    if (m.kind === 'trial' && m.ownerId !== owner.id) continue; // trùm của người khác — không xen vào
    if (mapOf(m) !== mapOf(owner)) continue; // GĐ59: đồng hành chỉ đánh quái cùng map với chủ
    if (m.hidden) continue; // GĐ60: quái đang ẩn nấp — chưa ai thấy nó
    const d = Math.hypot(m.x - owner.x, m.y - owner.y);
    if (d < td) {
      td = d;
      target = m;
    }
  }
  const anchor = !c.isEscortMerchant && target && td <= 220 ? target : null; // GĐ60: thương nhân được hộ tống là dân thường — chỉ đi theo, không đánh nhau
  const dest = anchor ? { x: anchor.x, y: anchor.y } : { x: owner.x + c.followDx, y: owner.y + c.followDy };
  const distDest = Math.hypot(dest.x - c.x, dest.y - c.y);
  const stopD = anchor ? 40 : 4;
  if (distDest > stopD) {
    const stepLen = Math.min(distDest - stopD, 305 * dt);
    const dx = (dest.x - c.x) / (distDest || 1);
    const dy = (dest.y - c.y) / (distDest || 1);
    const nx = c.x + dx * stepLen;
    const ny = c.y + dy * stepLen;
    moveWithCollision(c, nx, ny);
    faceDirection(c, dx, dy);
  }
  const cd59 = mapDims(mapOf(c)); // GĐ59: biên theo map của đồng hành
  c.x = Math.max(MARGIN, Math.min(cd59.w - MARGIN, c.x));
  c.y = Math.max(MARGIN, Math.min(cd59.h - MARGIN, c.y));
  if (anchor && Math.hypot(anchor.x - c.x, anchor.y - c.y) <= 48) {
    const now = Date.now();
    const cd = ATTACK_COOLDOWN_MS * (1 - cdrOf(c.stats));
    if (now - (c.lastAttackAt || 0) >= cd) {
      c.lastAttackAt = now;
      const atk = attackStatOf(c);
      const dmg = hurtMonster(anchor, BASIC_COEF * (atk.value + 10), anchor.def ?? WOLF.def); // GĐ38: hurtMonster đã tự trừ HP
      io.emit('player_attacked', { id: c.id, targetId: anchor.id });
      if (anchor.hp <= 0) onMonsterKilled(null, owner, anchor);
    }
  }
}

// ------------------------- GĐ101: CỐT TU — CỐT VƯƠNG -------------------------
// Pet theo mẫu đồng môn GĐ22 (thực thể players: theo chủ, đánh phụ, theo qua
// map nhờ các vòng isCompanion sẵn có) + taunt + Hạch Tâm (hồi 5%/s, chết là vỡ).
const COTVUONG_TAUNT_RANGE = 220; // TẠM: cùng tầm đánh phụ của đồng môn
const COTVUONG_FOLLOW = { dx: 0, dy: 36 }; // TẠM: đi sau chủ 1 bước
const PET_ENGAGE_RANGE = 440; // GĐ123: gấp đôi 220 cũ — pet được đi xa chủ gấp đôi để đánh quái
const PET_LEASH_SNAP = 560; // GĐ123: kéo pet về khi xa chủ quá 560 (phải lớn hơn tầm đánh)
const COTVUONG_REGEN = 0.05; // theo tài liệu: Hạch Tâm tái tạo xương 5% máu tối đa mỗi giây
function cotVuongMaxHpOf(p) { const ri = REALM_ORDER[p.realm] ?? 0; return 200 + 150 * ri; } // TẠM
function cotVuongOf(p) { const cr = classResOf(p); if (!cr.cotVuong || typeof cr.cotVuong !== 'object') cr.cotVuong = { active: false }; return cr.cotVuong; }
function cotVuongPetOf(owner) {
  if (!owner) return null;
  for (const q of players.values()) if (q.isCotVuong && q.ownerId === owner.id) return q;
  return null;
}
function petHpOf(p) {
  if (p.isCotVuong || p.isCompanion || !p.petId) return null;
  const pet = players.get(p.petId);
  return pet ? Math.round(pet.hp) + '/' + maxHpOf(pet.stats) : null;
}
function spawnCotVuong(owner) {
  if (owner.classId !== 'cottu') return null;
  const cv = cotVuongOf(owner);
  if (!cv.active) return null;
  const old = cotVuongPetOf(owner);
  if (old) players.delete(old.id);
  const maxHp = cotVuongMaxHpOf(owner);
  const stats = {};
  for (const k of STAT_KEYS) stats[k] = 1;
  stats.khiHuyet = Math.max(1, Math.round((maxHp - 100) / 10)); // maxHpOf(stats) = 100 + khiHuyet×10
  stats.vatCong = 5; stats.vatPhong = 50; stats.phapPhong = 10; stats.tocDo = 100;
  const c = {
    id: `cotvuong-${owner.id}`,
    x: owner.x + COTVUONG_FOLLOW.dx, y: owner.y + COTVUONG_FOLLOW.dy,
    vx: 0, vy: 0, input: { vx: 0, vy: 0 }, direction: 'down',
    isBot: false, isCompanion: true, isCotVuong: true, ownerId: owner.id, ownerKey: owner.charKey, mapId: mapOf(owner),
    name: 'Cốt Vương', classId: 'cottu', stats,
    hp: Math.min(maxHp, Math.max(1, cv.hp || maxHp)), mp: 0,
    robe: null, gender: 'nam',
    weaponId: null,
    realm: owner.realm || 'pham', tier: owner.tier || 0, lastAttackAt: 0,
    followDx: COTVUONG_FOLLOW.dx, followDy: COTVUONG_FOLLOW.dy,
  };
  players.set(c.id, c);
  owner.petId = c.id;
  return c;
}
function breakCotVuongCore(pet) {
  if (!pet || !players.has(pet.id)) return;
  const owner = players.get(pet.ownerId);
  players.delete(pet.id);
  if (owner) {
    if (owner.petId === pet.id) owner.petId = null;
    const cv = cotVuongOf(owner);
    cv.active = false; cv.hp = 0;
    persistPlayer(owner);
    const sock = io.sockets.sockets.get(owner.id);
    if (sock) {
      sock.emit('notice', { text: '💔 Hạch Tâm của Cốt Vương đã vỡ! Luyện Khôi Lõi mới để triệu hồi lại.' });
      syncChar(sock, owner);
    }
  }
}
// AI Cốt Vương mỗi tick: bám theo chủ (như đồng môn), đánh phụ quái quanh chủ,
// hồi 5% máu/s (Hạch Tâm), chết → vỡ lõi.
function updateCotVuong(c, dt) {
  const owner = players.get(c.ownerId);
  if (!owner || owner.isOffline) { players.delete(c.id); return; }
  c.realm = owner.realm;
  c.tier = owner.tier;
  if (c.hp <= 0) { breakCotVuongCore(c); return; }
  // Hạch Tâm: tái tạo xương 5%/s
  const maxHp = maxHpOf(c.stats);
  if (c.hp < maxHp) c.hp = Math.min(maxHp, c.hp + COTVUONG_REGEN * maxHp * dt);
  if (Math.hypot(owner.x - c.x, owner.y - c.y) > PET_LEASH_SNAP) {
    const tx = owner.x + c.followDx;
    const ty = owner.y + c.followDy;
    if (!hitsObstacle(tx, ty)) { c.x = tx; c.y = ty; }
  }
  let target = null;
  let td = Infinity;
  for (const m of monsters.values()) {
    if (m.kind === 'trial' && m.ownerId !== owner.id) continue;
    if (mapOf(m) !== mapOf(owner)) continue;
    if (m.hidden) continue;
    const d = Math.hypot(m.x - owner.x, m.y - owner.y);
    if (d < td) { td = d; target = m; }
  }
  const anchor = target && td <= PET_ENGAGE_RANGE ? target : null;
  const dest = anchor ? { x: anchor.x, y: anchor.y } : { x: owner.x + c.followDx, y: owner.y + c.followDy };
  const distDest = Math.hypot(dest.x - c.x, dest.y - c.y);
  const stopD = anchor ? 40 : 4;
  if (distDest > stopD) {
    const stepLen = Math.min(distDest - stopD, 305 * dt);
    const dx = (dest.x - c.x) / (distDest || 1);
    const dy = (dest.y - c.y) / (distDest || 1);
    const nx = c.x + dx * stepLen;
    const ny = c.y + dy * stepLen;
    moveWithCollision(c, nx, ny);
    faceDirection(c, dx, dy);
  }
  const cd59 = mapDims(mapOf(c));
  c.x = Math.max(MARGIN, Math.min(cd59.w - MARGIN, c.x));
  c.y = Math.max(MARGIN, Math.min(cd59.h - MARGIN, c.y));
  if (anchor && Math.hypot(anchor.x - c.x, anchor.y - c.y) <= 48) {
    const now = Date.now();
    const cd = ATTACK_COOLDOWN_MS * (1 - cdrOf(c.stats));
    if (now - (c.lastAttackAt || 0) >= cd) {
      c.lastAttackAt = now;
      const atk = attackStatOf(c);
      const dmg = hurtMonster(anchor, BASIC_COEF * (atk.value + 10), anchor.def ?? WOLF.def);
      io.emit('player_attacked', { id: c.id, targetId: anchor.id });
      if (anchor.hp <= 0) onMonsterKilled(null, owner, anchor);
    }
  }
  // Lưu HP pet vào classRes của chủ (bền qua restart; autosave 15s ghi file)
  const cv = cotVuongOf(owner);
  cv.hp = Math.round(c.hp);
}

// ------------------------- GĐ102: QUỶ TU — QUỶ HỒN -------------------------
// Pet theo mẫu Cốt Vương GĐ101 (thực thể players, isCompanion) nhưng khác
// bản chất: dmg cao + mỏng + hồi bằng hút hồn khi giết (không hồi thụ động),
// chết thì chủ phản phệ (mất hết Hồn Khí + choáng).
const HONKHI_HIT = 3; // TẠM: đòn gây dmg tích Hồn Khí (mirror Sát Khí/Ngộ Kiếm)
const HONKHI_KILL = 25; // TẠM: giết quái thường tích Hồn Khí
const QUY_SUMMON_COST = 100; // Hồn Khí cần để triệu hồi
const QUY_DRAIN_PCT = 0.10; // TẠM: pet giết quái hồi 10% máu tối đa
const QUY_DMG_OWNER_PCT = 0.5; // GĐ128 TẠM: dmg Quỷ Hồn = 1/2 chỉ số công của chủ (trước: vatCong cố định 30, khỏe gấp 2–3 lần chủ đầu game)
const QUY_BACKLASH_STUN_SEC = 3; // TẠM: phản phệ choáng chủ 3s
function quyHonMaxHpOf(p) { const ri = REALM_ORDER[p.realm] ?? 0; return 200 + 150 * ri; } // TẠM: cùng công thức Cốt Vương
function honKhiOf(p) { return p.classId === 'quytu' ? Math.min(100, Math.max(0, Math.round(classResOf(p).honKhi || 0))) : 0; }
function addHonKhi(p, n) {
  if (p.classId !== 'quytu' || p.hp <= 0) return;
  const cr = classResOf(p);
  cr.honKhi = Math.min(100, Math.max(0, (cr.honKhi || 0) + n));
}
function quyHonOf(p) { const cr = classResOf(p); if (!cr.quyHon || typeof cr.quyHon !== 'object') cr.quyHon = { active: false }; return cr.quyHon; }
function quyHonPetOf(owner) {
  if (!owner) return null;
  for (const q of players.values()) if (q.isQuyHon && q.ownerId === owner.id) return q;
  return null;
}
function spawnQuyHon(owner) {
  if (owner.classId !== 'quytu') return null;
  const qh = quyHonOf(owner);
  if (!qh.active) return null;
  const old = quyHonPetOf(owner);
  if (old) players.delete(old.id);
  const maxHp = quyHonMaxHpOf(owner);
  const stats = {};
  for (const k of STAT_KEYS) stats[k] = 1;
  stats.khiHuyet = Math.max(1, Math.round((maxHp - 100) / 10)); // maxHpOf(stats) = 100 + khiHuyet×10
  stats.vatCong = 30; stats.vatPhong = 20; stats.phapPhong = 10; stats.tocDo = 100; // TẠM: mỏng (dmg từ GĐ128 tính theo chủ, không dùng vatCong này nữa)
  const c = {
    id: `quyhon-${owner.id}`,
    x: owner.x + COTVUONG_FOLLOW.dx, y: owner.y + COTVUONG_FOLLOW.dy,
    vx: 0, vy: 0, input: { vx: 0, vy: 0 }, direction: 'down',
    isBot: false, isCompanion: true, isQuyHon: true, ownerId: owner.id, ownerKey: owner.charKey, mapId: mapOf(owner),
    name: 'Quỷ Hồn', classId: 'quytu', stats,
    hp: Math.min(maxHp, Math.max(1, qh.hp || maxHp)), mp: 0,
    robe: null, gender: 'nam',
    weaponId: null,
    realm: owner.realm || 'pham', tier: owner.tier || 0, lastAttackAt: 0,
    followDx: COTVUONG_FOLLOW.dx, followDy: COTVUONG_FOLLOW.dy,
  };
  players.set(c.id, c);
  owner.petId = c.id;
  return c;
}
function breakQuyHon(pet) {
  if (!pet || !players.has(pet.id)) return;
  const owner = players.get(pet.ownerId);
  players.delete(pet.id);
  if (owner) {
    if (owner.petId === pet.id) owner.petId = null;
    const qh = quyHonOf(owner);
    qh.active = false; qh.hp = 0;
    classResOf(owner).honKhi = 0; // GĐ102: phản phệ — mất hết Hồn Khí
    applyPlayerStatus(owner, { stunSec: QUY_BACKLASH_STUN_SEC }); // GĐ102: phản phệ — choáng chủ
    persistPlayer(owner);
    const sock = io.sockets.sockets.get(owner.id);
    if (sock) {
      sock.emit('notice', { text: `💀 Quỷ Hồn tan biến — phản phệ! Mất hết Hồn Khí, choáng ${QUY_BACKLASH_STUN_SEC} giây.` });
      syncChar(sock, owner);
    }
  }
}
// AI Quỷ Hồn mỗi tick: như Cốt Vương nhưng KHÔNG hồi thụ động — chỉ hồi khi
// chính nó giết quái (hút hồn 10% máu tối đa).
function updateQuyHon(c, dt) {
  const owner = players.get(c.ownerId);
  if (!owner || owner.isOffline) { players.delete(c.id); return; }
  c.realm = owner.realm;
  c.tier = owner.tier;
  if (c.hp <= 0) { breakQuyHon(c); return; }
  if (Math.hypot(owner.x - c.x, owner.y - c.y) > PET_LEASH_SNAP) {
    const tx = owner.x + c.followDx;
    const ty = owner.y + c.followDy;
    if (!hitsObstacle(tx, ty)) { c.x = tx; c.y = ty; }
  }
  let target = null;
  let td = Infinity;
  for (const m of monsters.values()) {
    if (m.kind === 'trial' && m.ownerId !== owner.id) continue;
    if (mapOf(m) !== mapOf(owner)) continue;
    if (m.hidden) continue;
    const d = Math.hypot(m.x - owner.x, m.y - owner.y);
    if (d < td) { td = d; target = m; }
  }
  const anchor = target && td <= PET_ENGAGE_RANGE ? target : null;
  const dest = anchor ? { x: anchor.x, y: anchor.y } : { x: owner.x + c.followDx, y: owner.y + c.followDy };
  const distDest = Math.hypot(dest.x - c.x, dest.y - c.y);
  const stopD = anchor ? 40 : 4;
  if (distDest > stopD) {
    const stepLen = Math.min(distDest - stopD, 305 * dt);
    const dx = (dest.x - c.x) / (distDest || 1);
    const dy = (dest.y - c.y) / (distDest || 1);
    const nx = c.x + dx * stepLen;
    const ny = c.y + dy * stepLen;
    moveWithCollision(c, nx, ny);
    faceDirection(c, dx, dy);
  }
  const cd59 = mapDims(mapOf(c));
  c.x = Math.max(MARGIN, Math.min(cd59.w - MARGIN, c.x));
  c.y = Math.max(MARGIN, Math.min(cd59.h - MARGIN, c.y));
  if (anchor && Math.hypot(anchor.x - c.x, anchor.y - c.y) <= 48) {
    const now = Date.now();
    const cd = ATTACK_COOLDOWN_MS * (1 - cdrOf(c.stats));
    if (now - (c.lastAttackAt || 0) >= cd) {
      c.lastAttackAt = now;
      // GĐ128: dmg theo chủ, không theo chỉ số cố định của pet nữa
      const atkVal = Math.round(attackStatOf(owner).value * QUY_DMG_OWNER_PCT);
      const dmg = hurtMonster(anchor, BASIC_COEF * (atkVal + 10), anchor.def ?? WOLF.def);
      io.emit('player_attacked', { id: c.id, targetId: anchor.id });
      if (anchor.hp <= 0) {
        onMonsterKilled(null, owner, anchor);
        // GĐ102: hút hồn — pet giết quái hồi 10% máu tối đa
        const maxHp = maxHpOf(c.stats);
        c.hp = Math.min(maxHp, c.hp + maxHp * QUY_DRAIN_PCT);
      }
    }
  }
  // Lưu HP pet vào classRes của chủ (bền qua restart; autosave 15s ghi file)
  const qh = quyHonOf(owner);
  qh.hp = Math.round(c.hp);
}

// ------------------------- GĐ137: THÚ SƯ — THUẦN HÓA THÚ HOANG -------------------------
// Pet thứ 3 của game, khác Cốt Vương/Quỷ Hồn ở chỗ: thú là thú HOANG thuần
// hóa được (giữ nguyên loài + chỉ số của con hoang đó), không phải triệu hồi
// từ tài nguyên lớp. Theo mẫu pet Cốt/Quỷ (thực thể players, isCompanion):
// bám chủ, đánh phụ, qua map theo chủ, mất khi chủ thoát, hiện lại khi vào.
const TAME_RATE = 0.60; // TẠM: tỉ lệ thuần hóa cơ bản
const TAME_APPRENTICE_BONUS = 0.05; // TẠM: đệ tử Thú Lão +5% (chung luật nghề)
const TAME_HP_PCT = 0.5; // TẠM: chỉ thuần hóa được thú dưới 50% máu (phải đánh yếu trước)
function tamedOf(p) { const cr = classResOf(p); if (!cr.tamed || typeof cr.tamed !== 'object') cr.tamed = { active: false }; return cr.tamed; }
function tamedPetOf(owner) {
  if (!owner) return null;
  for (const q of players.values()) if (q.isTamed && q.ownerId === owner.id) return q;
  return null;
}
function spawnTamed(owner) {
  const tm = tamedOf(owner);
  if (!tm.active || !tm.kind) return null;
  const old = tamedPetOf(owner);
  if (old) players.delete(old.id);
  const maxHp = Math.max(20, Math.round(tm.maxHp || 40));
  const stats = {};
  for (const k of STAT_KEYS) stats[k] = 1;
  stats.khiHuyet = Math.max(1, Math.round((maxHp - 100) / 10)); // dự phòng khi thiếu override
  stats.maxHpOverride = maxHp; // GĐ137: máu tối đa thật của thú hoang (vượt công thức khiHuyet, sàn 100)
  stats.vatCong = Math.max(0, Math.round(tm.atk || 0));
  stats.vatPhong = Math.max(0, Math.round(tm.def || 0));
  stats.phapPhong = Math.max(0, Math.round(tm.def || 0));
  stats.tocDo = 100;
  const c = {
    id: `tamed-${owner.id}`,
    x: owner.x + COTVUONG_FOLLOW.dx, y: owner.y + COTVUONG_FOLLOW.dy,
    vx: 0, vy: 0, input: { vx: 0, vy: 0 }, direction: 'down',
    isBot: false, isCompanion: true, isTamed: true, tamedKind: tm.kind, ownerId: owner.id, ownerKey: owner.charKey, mapId: mapOf(owner),
    name: tm.name || tm.kind, classId: 'thetu', stats,
    hp: Math.min(maxHp, Math.max(1, tm.hp || maxHp)), mp: 0,
    robe: null, gender: 'nam',
    weaponId: null,
    realm: owner.realm || 'pham', tier: owner.tier || 0, lastAttackAt: 0,
    followDx: COTVUONG_FOLLOW.dx, followDy: COTVUONG_FOLLOW.dy,
  };
  players.set(c.id, c);
  owner.petId = c.id;
  return c;
}
function breakTamed(pet) {
  if (!pet || !players.has(pet.id)) return;
  const owner = players.get(pet.ownerId);
  players.delete(pet.id);
  if (owner) {
    if (owner.petId === pet.id) owner.petId = null;
    const tm = tamedOf(owner);
    tm.active = false; tm.hp = 0;
    persistPlayer(owner);
    const sock = io.sockets.sockets.get(owner.id);
    if (sock) {
      sock.emit('notice', { text: `💔 ${pet.name} đã gục ngã và trở về rừng. Thuần hóa một con thú khác khi sẵn sàng.` });
      syncChar(sock, owner);
    }
  }
}
// AI thú thuần hóa mỗi tick: như Cốt Vương — hồi 5%/s (chung luật Hạch Tâm)
// vì thú yếu (sói 40 máu) không hồi thì chết giữa trận đầu (probe p137
// chạy 3: pet chết trong lúc theo chủ sau ~15s tank). Chết vẫn là mất hẳn.
function updateTamed(c, dt) {
  const owner = players.get(c.ownerId);
  if (!owner || owner.isOffline) { players.delete(c.id); return; }
  c.realm = owner.realm;
  c.tier = owner.tier;
  if (c.hp <= 0) { breakTamed(c); return; }
  const maxHpT = maxHpOf(c.stats);
  if (c.hp < maxHpT) c.hp = Math.min(maxHpT, c.hp + COTVUONG_REGEN * maxHpT * dt);
  if (Math.hypot(owner.x - c.x, owner.y - c.y) > PET_LEASH_SNAP) {
    const tx = owner.x + c.followDx;
    const ty = owner.y + c.followDy;
    if (!hitsObstacle(tx, ty)) { c.x = tx; c.y = ty; }
  }
  let target = null;
  let td = Infinity;
  for (const m of monsters.values()) {
    if (m.kind === 'trial' && m.ownerId !== owner.id) continue;
    if (mapOf(m) !== mapOf(owner)) continue;
    if (m.hidden) continue;
    const d = Math.hypot(m.x - owner.x, m.y - owner.y);
    if (d < td) { td = d; target = m; }
  }
  const anchor = target && td <= PET_ENGAGE_RANGE ? target : null;
  const dest = anchor ? { x: anchor.x, y: anchor.y } : { x: owner.x + c.followDx, y: owner.y + c.followDy };
  const distDest = Math.hypot(dest.x - c.x, dest.y - c.y);
  const stopD = anchor ? 40 : 4;
  if (distDest > stopD) {
    const stepLen = Math.min(distDest - stopD, 305 * dt);
    const dx = (dest.x - c.x) / (distDest || 1);
    const dy = (dest.y - c.y) / (distDest || 1);
    const nx = c.x + dx * stepLen;
    const ny = c.y + dy * stepLen;
    moveWithCollision(c, nx, ny);
    faceDirection(c, dx, dy);
  }
  const cd59 = mapDims(mapOf(c));
  c.x = Math.max(MARGIN, Math.min(cd59.w - MARGIN, c.x));
  c.y = Math.max(MARGIN, Math.min(cd59.h - MARGIN, c.y));
  if (anchor && Math.hypot(anchor.x - c.x, anchor.y - c.y) <= 48) {
    const now = Date.now();
    const cd = ATTACK_COOLDOWN_MS * (1 - cdrOf(c.stats));
    if (now - (c.lastAttackAt || 0) >= cd) {
      c.lastAttackAt = now;
      const atk = attackStatOf(c);
      const dmg = hurtMonster(anchor, BASIC_COEF * (atk.value + 10), anchor.def ?? WOLF.def);
      io.emit('player_attacked', { id: c.id, targetId: anchor.id });
      if (anchor.hp <= 0) onMonsterKilled(null, owner, anchor);
    }
  }
  // Lưu HP thú vào classRes của chủ (bền qua restart; autosave 15s ghi file)
  const tm = tamedOf(owner);
  tm.hp = Math.round(c.hp);
}

// ------------------------- GĐ103: PHẬT TU — CÔNG ĐỨC, TẦNG THỨC, SIÊU ĐỘ, THUYẾT PHÁP -------------------------
// Công Đức tách biệt Công trạng tông (p.merit); không giới hạn max (theo tài liệu).
// Chiêu cũ của Phật Tu được GIỮ (user chốt 27/10) — Phật Quang + Thuyết Pháp là
// 2 nút riêng kiểu nút Ultimate, không gỡ bảng chiêu cũ.
const PHAT_TIER_NAMES = ['Chưa nhập môn', 'Cư Sĩ Quy Y', 'Sa Di', 'La Hán', 'Bồ Tát', 'Kiếp Môn Thành Phật']; // GĐ104: sửa tên 2 bậc đầu theo nghiên cứu Phật giáo (người mới quy y là cư sĩ, chưa phải Tăng sĩ)
function congDucOf(p) { return p.classId === 'phattu' ? Math.max(0, classResOf(p).congDuc || 0) : 0; }
function phatTierOf(p) {
  const cd = congDucOf(p);
  if (cd > 1000000) return 5; // Kiếp Môn Thành Phật: trên 1M
  if (cd >= 1000000) return 4; // Bồ Tát
  if (cd >= 200000) return 3; // La Hán
  if (cd >= 50000) return 2; // Tăng Sĩ
  if (cd >= 10000) return 1; // Quy Y
  return 0;
}
function addCongDuc(p, n) {
  if (p.classId !== 'phattu' || p.hp <= 0) return;
  const cr = classResOf(p);
  const before = phatTierOf(p);
  cr.congDuc = Math.max(0, (cr.congDuc || 0) + n); // không giới hạn max
  const after = phatTierOf(p);
  if (after > before) emitNoticeTo(p, `☸ Tầng Thức mới: ${PHAT_TIER_NAMES[after]}! Phật Quang Phổ Chiếu đã mạnh thêm.`);
}
function phatQuangMulOf(p) {
  const t = phatTierOf(p);
  let mul = 1;
  if (t >= 1) mul *= 1.2; // Cư Sĩ Quy Y: dmg +20%
  if (t >= 5) mul *= 2; // Kiếp Môn Thành Phật: dmg ×2 thêm
  return mul;
}
const PHAT_QUANG_COST = 20; // TẠM: MP
const PHAT_QUANG_CD_MS = 5000; // TẠM
const PHAT_QUANG_COEF = 1.2; // TẠM: dmg = coef × (Pháp công + 10)
const PHAT_QUANG_RANGE = 300; // TẠM: px
const SIEU_DO_KINDS = new Set(['hap_huyet_quy']); // TẠM: game chỉ có 1 loài tên Quỷ
const SIEU_DO_CONGDUC = 500; // TẠM
const THUYET_PHAP_PER_SEC = 10; // TẠM: Công Đức/giây
function stopPreaching(p, reason) {
  if (!p.preaching) return;
  p.preaching = false;
  const sock = io.sockets.sockets.get(p.id);
  if (sock) sock.emit('notice', { text: reason === 'move' ? '📿 Thuyết Pháp bị ngắt vì bạn di chuyển.' : reason === 'hit' ? '📿 Thuyết Pháp bị ngắt vì bạn bị đánh.' : reason === 'travel' ? '📿 Thuyết Pháp đã dừng vì bạn rời thành phố.' : '📿 Thuyết Pháp đã dừng.' });
}
// ================= GĐ104: Y TU — Y ĐỨC, BỔ KHÍ HUYẾT, CỐ BẢN BỒI NGUYÊN, HỒI DƯƠNG CỨU NGHỊCH ==============
// Nghiên cứu nền 27/10 (Đông y): Y Đức = y giả nhân tâm, treo hồ tế thế;
// Bổ Khí Huyết (hồi máu), Cố Bản Bồi Nguyên (bồi bổ tăng sức khỏe, có giới
// hạn), Hồi Dương Cứu Nghịch (chỉ cứu người tưởng chết, hồn chưa lìa —
// khớp cửa sổ gục ngã 40s (GĐ128). Mọi số TẠM.
// Chết do đánh nhau không còn hồi sinh tức thì: người chơi thật gục ngã
// 40s (hp 0, quái ngó lơ) chờ Y Tu cứu; hết giờ mới về làng như cũ.
// GĐ128: lúc gục hóa LINH THỂ đi lại được (xuyên vật cản) nhưng không
// tương tác/đánh/chiêu/thiền/dịch chuyển gì khác.
// Chết do hết thọ nguyên (tọa hóa) vẫn vĩnh viễn, không cứu được.
const Y_HEAL_COST = 20; // TẠM: MP
const Y_HEAL_CD_MS = 5000; // TẠM
const Y_HEAL_BASE = 100; // TẠM: máu hồi lúc Y Đức 0
const Y_HEAL_SCALE_CAP = 10000; // TẠM: Y Đức chạm cap thì hồi ×2
const Y_HEAL_RANGE = 300; // TẠM: px
const Y_HEAL_YDUC = 5; // TẠM: Y Đức mỗi lần hồi thật (≥1 máu)
const Y_GIFT_UNLOCK = 2000; // TẠM: Y Đức từng đạt → mở khóa vĩnh viễn
const Y_GIFT_COST_YDUC = 50; // TẠM: Y Đức mỗi lần tặng
const Y_GIFT_RANGE = 300; // TẠM: px
const Y_GIFT_CAP = 100; // TẠM: máu tối đa được tặng mỗi người nhận
const Y_REVIVE_UNLOCK = 500; // TẠM: Y Đức từng đạt → mở khóa vĩnh viễn
const Y_REVIVE_RANGE = 300; // TẠM: px
const Y_REVIVE_YDUC = 100; // TẠM: Y Đức mỗi lần cứu sống
const Y_REVIVE_HP_PCT = 0.5; // TẠM: người được cứu dậy với 50% máu tối đa
const Y_SELL_YDUC = 2; // TẠM: Y Đức mỗi viên thuốc bán ở tiệm
const Y_MEDICINES = new Set(['dan_hoi_xuan', 'dan_hoi_nguyen']); // TẠM: đan hồi máu / hồi nguyên
const DOWNED_MS = 40000; // GĐ128 TẠM: cửa sổ gục ngã chờ cứu (trước 60s)
function yDucOf(p) { return p.classId === 'ytu' ? Math.max(0, classResOf(p).yDuc || 0) : 0; }
function yGiftUnlockedOf(p) { return !!classResOf(p).yGiftUnlocked || yDucOf(p) >= Y_GIFT_UNLOCK; }
function yReviveUnlockedOf(p) { return !!classResOf(p).yReviveUnlocked || yDucOf(p) >= Y_REVIVE_UNLOCK; }
function isDowned(p) { return !!(p && p.downedUntil && Date.now() < p.downedUntil); }
function isDownable(p) { return !!p && !p.isBot && !p.isCompanion && !p.isCotVuong && !p.isQuyHon && !p.isEscortMerchant && !p.isOffline; }
function addYDuc(p, n) {
  if (p.classId !== 'ytu' || p.hp <= 0) return;
  const cr = classResOf(p);
  cr.yDuc = Math.max(0, (cr.yDuc || 0) + n);
  if (cr.yDuc >= Y_REVIVE_UNLOCK && !cr.yReviveUnlocked) { cr.yReviveUnlocked = true; emitNoticeTo(p, '💚 Đã mở khóa: Hồi Dương Cứu Nghịch — cứu đồng đội gục ngã trong 40 giây!'); }
  if (cr.yDuc >= Y_GIFT_UNLOCK && !cr.yGiftUnlocked) { cr.yGiftUnlocked = true; emitNoticeTo(p, '❤️ Đã mở khóa: Cố Bản Bồi Nguyên — tặng máu tối đa vĩnh viễn cho đồng đội!'); }
  persistPlayer(p);
}
function yHealAmountOf(p) { return Math.round(Y_HEAL_BASE * (1 + Math.min(yDucOf(p), Y_HEAL_SCALE_CAP) / Y_HEAL_SCALE_CAP)); }
function nearestAlly(player, range, wantDowned) {
  let target = null; let targetDist = Infinity;
  for (const q of players.values()) {
    if (q.id === player.id || q.isBot || q.isOffline || q.isCompanion || q.isCotVuong || q.isQuyHon || q.isEscortMerchant) continue;
    if (mapOf(q) !== mapOf(player)) continue;
    if (wantDowned ? !isDowned(q) : q.hp <= 0) continue;
    const d = Math.hypot(q.x - player.x, q.y - player.y);
    if (d <= range && d < targetDist) { target = q; targetDist = d; }
  }
  return target;
}
function syncPlayerSocket(p) { const s = io.sockets.sockets.get(p.id); if (s) syncChar(s, p); }
function enterDowned(p, source) {
  p.journey = null; p.flying = false; p.preaching = false; p.studying = false; p.nhoZone = null; p.tranBuff = null; p.tranDebuff = null; p.tranSeal = null; // GĐ105: gục ngã là dứt đọc sách + xóa Ý Cảnh; GĐ135: gục ngã xóa trận tạm
  p.input.vx = 0; p.input.vy = 0;
  p.dots = []; p.slowUntil = 0; p.stunUntil = 0;
  p.hp = 0;
  p.downedUntil = Date.now() + DOWNED_MS;
  p.downedSourceKind = source && source.kind ? source.kind : null;
  p.downedSourceName = (source && source.name) || 'quái vật';
  persistPlayer(p);
  io.to('map:' + mapOf(p)).emit('player_downed', { id: p.id, name: p.name, by: p.downedSourceName });
  const sock = io.sockets.sockets.get(p.id);
  if (sock) sock.emit('you_downed', { by: p.downedSourceName, leftSec: Math.ceil(DOWNED_MS / 1000) });
  console.log(`[combat] ${p.name} gục ngã — chờ hồi sinh trong ${DOWNED_MS / 1000}s`);
}

// Người chơi mô phỏng cho bản demo Preview
for (let i = 1; i <= DEMO_BOTS; i++) {
  createPlayer('bot-' + i, true);
}
// GĐ21: dựng lại các nhân vật đang nghỉ offline từ lần chạy trước
for (const [key, c] of Object.entries(characters)) spawnOfflineActor(key, c);


// ================= GĐ105: NHO TU — HẠO NHIÊN CHI KHÍ, ĐỌC SÁCH MỞ CHƯƠNG, Ý CẢNH ==============
// Tài liệu mục 8 chỉ có 3 ý (Điểm Tri Thức + Chương; map riêng Văn Uyển Tàng
// Kinh Các, vào đọc sách tốn thời gian game để mở Chương; Chương tạo vùng AOE
// Ý Cảnh buff đồng đội / debuff quái) — mọi số còn lại TẠM.
// Nền nghiên cứu 27/10: Ý Cảnh là thuật ngữ thi học thật; "Chương" theo
// Chương Cú Tập Chú của Chu Hy; Điểm Tri Thức nâng thành Hạo Nhiên Chi Khí
// (Mạnh Tử — nuôi bằng đạo nghĩa). Tên vùng: Thanh Tuyền Thạch Thượng (Vương
// Duy, hồi máu) + Liễu Ti Vạn Lũ (trói chân) từ ghi chú nghiên cứu; 2 tên còn
// lại đặt theo thành ngữ, không mạo nhận là câu thơ cổ.
const NHO_STUDY_MAP = 'van_uyen'; // GĐ105: map đọc sách
const NHO_STUDY_PER_SEC = 5; // TẠM: Hạo Nhiên mỗi giây đọc
const NHO_STUDY_RANGE = 300; // TẠM: px quanh cổng Văn Uyển tính là đang ở điểm đọc
const NHO_CHUONG_UNLOCK = { 2: 300, 3: 900, 4: 1800 }; // TẠM: tổng giây đọc để mở Chương 2/3/4 (Chương 1 có sẵn)
const NHO_ZONE_COST_MP = 20; // TẠM
const NHO_ZONE_COST_HAO = 25; // TẠM: Hạo Nhiên mỗi lần mở Ý Cảnh
const NHO_ZONE_CD_MS = 10000; // TẠM
const NHO_ZONE_DUR_MS = 10000; // TẠM: vùng tồn tại
const NHO_ZONE_RADIUS = 200; // TẠM: px
const NHO_HEAL_PER_SEC = 10; // TẠM: máu/giây trong vùng Thanh Tuyền
const NHO_DMG_MUL = 1.25; // TẠM: nhân dmg trong vùng Nghĩa Bạc
const NHO_STUN_SEC = 1; // TẠM: choáng trong vùng Ngôn Xuất
const NHO_STUN_IMMUNE_MS = 5000; // TẠM: mỗi quái không bị choáng lại trong 5s
const NHO_ZONE_NAMES = { 1: 'Thanh Tuyền Thạch Thượng', 2: 'Nghĩa Bạc Vân Thiên', 3: 'Ngôn Xuất Pháp Tùy', 4: 'Liễu Ti Vạn Lũ' }; // GĐ105
// GĐ135: TRẬN PHÁP SƯ — 4 loại trận, bố bằng 1 Trận Kỳ (chế ở panel Nghề).
// Trận Dịch Chuyển bền qua restart (lưu file); 3 trận còn lại chỉ tồn tại
// trong bộ nhớ, chủ trận rời map thì trận ngừng chạy (như Ý Cảnh).
// Mọi số TẠM.
const TRAN_ARRAY_RANK = { teleport: 1, buff: 2, debuff: 4, seal: 6 }; // cấp nghề tối thiểu
const TRAN_ARRAY_NAMES = { teleport: 'Trận Dịch Chuyển', buff: 'Trận Cường Công', debuff: 'Trận Suy Nhược', seal: 'Cấm Chế Trận' };
const TRAN_BUFF_RADIUS = 200, TRAN_BUFF_DUR_MS = 60000, TRAN_BUFF_MUL = 1.25; // buff: sát thương ×1,25
const TRAN_DEBUFF_RADIUS = 200, TRAN_DEBUFF_DUR_MS = 60000, TRAN_DEBUFF_MUL = 0.5; // debuff: quái gây ×0,5 sát thương
const TRAN_SEAL_RADIUS = 150, TRAN_SEAL_DUR_MS = 15000; // cấm chế: quái trong trận không đi không cắn được
function haoNhienOf(p) { return p.classId === 'nhotu' ? Math.min(100, Math.max(0, Math.round(classResOf(p).haoNhien || 0))) : 0; }
function nhoStudySecOf(p) { return p.classId === 'nhotu' ? Math.max(0, Math.floor(classResOf(p).nhoStudySec || 0)) : 0; }
function nhoChuongOf(p) { const cr = classResOf(p); if (!Array.isArray(cr.nhoChuong) || !cr.nhoChuong.includes(1)) cr.nhoChuong = [1]; return cr.nhoChuong; }
function nhoChuongUnlocked(p, n) { return n === 1 || nhoChuongOf(p).includes(n); }
function addNhoStudy(p, dtSec) {
  if (p.classId !== 'nhotu') return;
  const cr = classResOf(p);
  cr.haoNhien = Math.min(100, (cr.haoNhien || 0) + NHO_STUDY_PER_SEC * dtSec);
  cr.nhoStudySec = (cr.nhoStudySec || 0) + dtSec;
  const list = nhoChuongOf(p);
  for (const n of [2, 3, 4]) {
    if (!list.includes(n) && cr.nhoStudySec >= NHO_CHUONG_UNLOCK[n]) {
      list.push(n);
      emitNoticeTo(p, `📖 Bạn đã đọc đủ ${NHO_CHUONG_UNLOCK[n]} giây — mở khóa Chương ${n}: ${NHO_ZONE_NAMES[n]}!`);
    }
  }
}
function stopStudying(p, reason) {
  if (!p.studying) return;
  p.studying = false;
  const sock = io.sockets.sockets.get(p.id);
  if (sock) sock.emit('notice', { text: reason === 'move' ? '📖 Đọc sách bị ngắt vì bạn di chuyển.' : reason === 'hit' ? '📖 Đọc sách bị ngắt vì bạn bị đánh.' : reason === 'travel' ? '📖 Đọc sách đã dừng vì bạn rời Văn Uyển.' : '📖 Đọc sách đã dừng.' });
}
function vanUyenPortal() { const rt = MAP_RUNTIME.get(NHO_STUDY_MAP); return rt ? rt.portal : null; }
function nhoDmgMulOf(p) { return Date.now() < (p.nhoDmgBoostUntil || 0) ? NHO_DMG_MUL : 1; }
// GĐ135: hệ số sát thương khi đứng trong Trận Cường Công (của bất kỳ ai cùng map).
function tranDmgMulOf(p) { return Date.now() < (p.tranDmgBoostUntil || 0) ? TRAN_BUFF_MUL : 1; }
// GĐ135: hệ số sát thương quái gây ra khi đứng trong Trận Suy Nhược.
function tranDebuffMulOf(m) { return Date.now() < (m.tranWeakUntil || 0) ? TRAN_DEBUFF_MUL : 1; }
// GĐ135: tick trận — mirror applyNhoZones: chủ trận ở cùng map thì trận chạy,
// hết hạn thì xóa; cờ hiệu ứng chỉ sống 300ms (chủ trận ngắt là mất như Ý Cảnh).
function applyTranArrays(owner, dt) {
  const now = Date.now();
  const map = mapOf(owner);
  const b = owner.tranBuff;
  if (b) {
    if (now >= b.until) owner.tranBuff = null;
    else if (b.mapId === map) {
      for (const q of players.values()) {
        if (q.isBot || q.isOffline || q.isCompanion || q.isCotVuong || q.isQuyHon) continue;
        if (mapOf(q) !== map || q.hp <= 0) continue;
        if (Math.hypot(q.x - b.x, q.y - b.y) > TRAN_BUFF_RADIUS) continue;
        q.tranDmgBoostUntil = now + 300;
      }
    }
  }
  const d = owner.tranDebuff;
  if (d) {
    if (now >= d.until) owner.tranDebuff = null;
    else if (d.mapId === map) {
      for (const m of monsters.values()) {
        if (mapOf(m) !== map) continue;
        if (m.isTrialBoss || m.trial) continue; // như Ý Cảnh: không khống chế trùm thử thách
        if (Math.hypot(m.x - d.x, m.y - d.y) > TRAN_DEBUFF_RADIUS) continue;
        m.tranWeakUntil = now + 300;
      }
    }
  }
  const s = owner.tranSeal;
  if (s) {
    if (now >= s.until) owner.tranSeal = null;
    else if (s.mapId === map) {
      for (const m of monsters.values()) {
        if (mapOf(m) !== map) continue;
        if (m.isTrialBoss || m.trial) continue;
        if (Math.hypot(m.x - s.x, m.y - s.y) > TRAN_SEAL_RADIUS) continue;
        m.tranSealUntil = now + 300;
      }
    }
  }
}
function applyNhoZones(owner, dt) {
  const z = owner.nhoZone;
  if (!z || Date.now() >= z.until) { owner.nhoZone = null; return; }
  const now = Date.now();
  const map = mapOf(owner);
  if (z.chuong === 1 || z.chuong === 2) {
    for (const q of players.values()) {
      if (q.isBot || q.isOffline || q.isCompanion || q.isCotVuong || q.isQuyHon) continue;
      if (mapOf(q) !== map || q.hp <= 0) continue;
      if (Math.hypot(q.x - z.x, q.y - z.y) > NHO_ZONE_RADIUS) continue;
      if (z.chuong === 1) q.hp = Math.min(maxHpEff(q), q.hp + NHO_HEAL_PER_SEC * dt);
      else q.nhoDmgBoostUntil = now + 300;
    }
  } else {
    for (const m of monsters.values()) {
      if (mapOf(m) !== map) continue;
      if (m.isTrialBoss || m.trial) continue; // GĐ105: không khống chế trùm thử thách
      if (Math.hypot(m.x - z.x, m.y - z.y) > NHO_ZONE_RADIUS) continue;
      initMonsterFx(m);
      if (z.chuong === 3) {
        if (now >= (m.nhoStunImmuneUntil || 0)) {
          m.stunUntil = Math.max(m.stunUntil || 0, now + NHO_STUN_SEC * 1000);
          m.nhoStunImmuneUntil = now + NHO_STUN_IMMUNE_MS;
        }
      } else {
        if (now >= (m.slowUntil || 0) || 100 >= (m.slowPct || 0)) m.slowPct = 100;
        m.slowUntil = Math.max(m.slowUntil || 0, now + 300);
      }
    }
  }
}

// ------------------------- Quái vật (Giai đoạn 4) -------------------------
/** @type {Map<string, {id:string, kind:string, x:number, y:number, hp:number, maxHp:number, vx:number, vy:number, direction:string}>} */
const monsters = new Map();
let monsterSeq = 0;

function spawnMonster(kind = 'wolf', mapId = HOME_MAP, opts = {}) {
  const type = MONSTER_TYPES[kind] || MONSTER_TYPES.wolf;
  monsterSeq++;
  const v = makeVelocity();
  // GĐ59: quái của map mới sinh trong biên map đó, né cổng dịch chuyển + vật cản
  if (mapId && mapId !== HOME_MAP) {
    const rt = MAP_RUNTIME.get(mapId);
    if (!rt) return null;
    let x = rt.portal.x; let y = rt.portal.y - 220;
    for (let tries = 0; tries < 30; tries++) {
      x = Math.round(rand(60, rt.w - 60));
      y = Math.round(rand(60, rt.h - 60));
      if (Math.hypot(x - rt.portal.x, y - rt.portal.y) > 200 && !hitsObstacleIn(mapId, x, y, 20)) break;
    }
    const m = {
      id: kind + '-' + monsterSeq, kind, name: type.name, mapId,
      x, y, hp: type.hp, maxHp: type.hp, atk: type.atk, def: type.def,
      chaseSpeed: type.chaseSpeed, wanderSpeed: type.wanderSpeed,
      atkRange: type.atkRange, atkCdMs: type.atkCdMs,
      vx: v.vx, vy: v.vy, direction: 'down', lastAttackAt: 0,
    };
    if (type.ambush || type.mech?.burrow || type.mech?.invis) m.hidden = true; // GĐ60: sinh ra đã ẩn nấp (rắn độc, độn thổ, tàng hình)
    if (opts.mapBoss) m.mapBoss = true; // GĐ70: trùm theo map
    initMonsterFx(m);
    monsters.set(m.id, m);
    return m;
  }
  // Sinh quái NGOÀI làng (khu farm) — thử ngẫu nhiên tới khi ngoài hàng rào.
  // GĐ38: Thạch Quái ưu tiên góc ĐÔNG BẮC (vùng núi đá); Dơi/Sói khắp bãi.
  // GĐ57: quái bí cảnh chỉ sinh TRONG vùng của chúng (area); quái farm giữ
  // nguyên bãi cũ (x < 1600) — không lọt vào dải rừng ngăn / bí cảnh.
  let x = 0;
  let y = 0;
  const area = type.area === 'realm' ? REALM : type.area === 'realmBoss' ? REALM_BOSS_AREA : null;
  for (let tries = 0; tries < 30; tries++) {
    if (area) {
      x = Math.round(rand(area.x + 46, area.x + area.w - 46));
      y = Math.round(rand(area.y + 46, area.y + area.h - 46));
      if (hitsObstacle(x, y, 20)) continue;
      // GĐ59b: quái bí cảnh không sinh CAMP ngay điểm vào (REALM_ENTRY — người
      // vừa qua cổng đã bị 2 Kiếm Ma kẹp chết) và không sinh chụm một chỗ
      // (cả đàn hội đồng ở đàn đá làm trận trùm thành không thể đi lẻ).
      // Cùng nguyên tắc cổng >200px đã áp cho các map GĐ59.
      if (Math.hypot(x - REALM_ENTRY.x, y - REALM_ENTRY.y) < 180) continue;
      let crowded = false;
      for (const o of monsters.values()) {
        if ((MONSTER_TYPES[o.kind]?.area === 'realm' || MONSTER_TYPES[o.kind]?.area === 'realmBoss') && Math.hypot(o.x - x, o.y - y) < 110) { crowded = true; break; }
      }
      if (crowded) continue;
      break;
    }
    if (kind === 'golem') {
      x = Math.round(rand(1120, 2190));
      y = Math.round(rand(60, 320));
    } else {
      x = Math.round(rand(60, 2190));
      y = Math.round(rand(60, WORLD_H - 60));
    }
    if (!insideVillage(x, y, 50) && !insideSect(x, y, 50) && Math.hypot(x - 700, y - 196) > 110) break; // GĐ22/23: không sinh trong sân tông môn / gần Tụ Linh Trận
  }
  const m = {
    id: kind + '-' + monsterSeq,
    kind,
    mapId: HOME_MAP, // GĐ59
    name: type.name, // GĐ38: nhãn tên loài trên đầu quái
    x,
    y,
    hp: type.hp,
    maxHp: type.hp,
    atk: type.atk,
    def: type.def,
    chaseSpeed: type.chaseSpeed,
    wanderSpeed: type.wanderSpeed,
    atkRange: type.atkRange,
    atkCdMs: type.atkCdMs,
    vx: v.vx,
    vy: v.vy,
    direction: 'down',
    lastAttackAt: 0,
  };
  initMonsterFx(m);
  monsters.set(m.id, m);
  return m;
}
function countKind(kind) {
  let n = 0;
  for (const m of monsters.values()) if (m.kind === kind) n++;
  return n;
}

for (const [kind, type] of Object.entries(MONSTER_TYPES)) for (let i = 0; i < type.count; i++) spawnMonster(kind);
// GĐ59: sinh quái cho các map mới theo bảng MAP_SPAWNS (từ MonsterData.maps)
for (const s of MAP_SPAWNS) for (let i = 0; i < s.count; i++) spawnMonster(s.kind, s.mapId);
// GĐ70: sinh trùm theo map (MAP_BOSSES) — gắn cờ mapBoss
for (const b of MAP_BOSSES) for (let i = 0; i < b.count; i++) spawnMonster(b.kind, b.mapId, { mapBoss: true });
console.log(`[bản đồ] Đã sinh quái cho ${MAP_SPAWNS.length} cặp map/loài + ${MAP_BOSSES.length} map có trùm (tổng ${monsters.size} quái)`);

// ------------------------- Rơi đồ + hạ quái (GĐ8) -------------------------
const drops = new Map();
let dropSeq = 0;
function spawnDrop(kind, itemId, amount, x, y, mapId = HOME_MAP) {
  dropSeq++;
  const id = 'drop-' + dropSeq;
  drops.set(id, { id, kind, itemId, amount, x, y, bornAt: Date.now(), mapId });
}

// Xử lý tập trung khi một con quái bị hạ (đánh thường + tung chiêu dùng chung)
// GĐ96: Tẩm bổ Thể Tu — thịt/xương rơi từ quái có thân xác (TẠM: thịt 50%, xương 50%).
// Loài không thịt: golem/khoiloi (đá), kiemma (kiếm linh), cot_binh (chỉ xương),
// huyen_anh_mieu/huyen_diep (huyễn ảnh), thuy_trieu_tinh (thủy linh), hap_huyet_quy
// (quỷ hồn), bang_tinh_cu_nhan (băng), diem_hoa_phuong (hỏa linh).
const MEAT_KINDS = new Set(['wolf', 'bat', 'huyetlang', 'doc_xa', 'lam_tru', 'dia_hanh_yeu', 'kim_giap_te', 'dan_ma', 'thien_loi_thu', 'hon_don_thu']);
const BONE_KINDS = new Set(['wolf', 'bat', 'huyetlang', 'cot_binh', 'doc_xa', 'lam_tru', 'dia_hanh_yeu', 'kim_giap_te', 'dan_ma', 'thien_loi_thu', 'hon_don_thu']);
// GĐ99: Dưỡng Kiếm — Quặng từ thạch quái, Tinh Huyết từ quái thú (tỉ lệ 50% như thịt/xương).
const QUANG_KINDS = new Set(['golem', 'khoiloi']);
const HUYET_KINDS = new Set(['wolf', 'bat', 'huyetlang', 'doc_xa']);
const TAMBO_HP_CAP = 100; // tối đa +100 HP tối đa (10 món Thịt Hầm)
const TAMBO_DEF_CAP = 20; // tối đa +20 Vật phòng (10 món Canh Xương)
function tamBoOf(p) { if (!p.tamBo || typeof p.tamBo !== 'object') p.tamBo = { hp: 0, def: 0 }; if (typeof p.tamBo.hp !== 'number') p.tamBo.hp = 0; if (typeof p.tamBo.def !== 'number') p.tamBo.def = 0; return p.tamBo; }
function onMonsterKilled(socket, player, target) {
  // GĐ70: ảo ảnh (phân thân) — chỉ tan biến, không rương/Tu vi/nhiệm vụ/hồi sinh
  if (target.illusion) {
    monsters.delete(target.id);
    io.to('map:' + mapOf(target)).emit('monster_killed', { monsterId: target.id, kind: target.kind, by: player.id, byName: player.name });
    return;
  }
  // GĐ19: trùm thử thách — không rơi đồ/Tu vi; thắng trùm chính → mở khóa đột phá tương ứng
  if (target.kind === 'trial') {
    monsters.delete(target.id);
    io.to('map:' + mapOf(target)).emit('monster_killed', { monsterId: target.id, kind: target.kind, by: player.id, byName: player.name }); // GĐ59: chỉ map liên quan
    // GĐ40+: thắng trận ĐỐI ĐẦU (tu sĩ thù địch / kẻ bắt cóc...) → nhiệm
    // vụ tương ứng hoàn thành, về Trưởng Làng trả
    if ((target.trialKind === 'duel' || target.trialKind === 'rival') && target.ownerId === player.id) {
      const qid = target.questId || 'q_tusi';
      const q = player.quests?.[qid];
      if (q && q.state === 'active') {
        q.state = 'done';
        q.progress = 1;
        persistPlayer(player);
        if (socket) {
          socket.emit('notice', { text: `✔ Đã đánh bại ${target.name}! Về Bảng treo thưởng hoặc Nhà Trưởng Làng trả nhiệm vụ “${QUESTS[qid]?.name || ''}”.` });
          syncChar(socket, player);
        }
      }
      console.log(`[đối đầu] ${player.name} thắng ${target.name} (${qid})`);
      return;
    }
    if (target.isTrialBoss && target.ownerId === player.id) {
      // GĐ30: thắng Thử Thách Thú của tông môn → đủ tư cách vào Huyền Thiên Tông
      if (target.trialKind === 'sect') {
        player.sectTrialPassed = true;
        persistPlayer(player);
        if (socket) {
          socket.emit('notice', { text: '✔ Đã thắng Thử Thách Thú! Quay lại gặp Sứ Giả Tông Môn để gia nhập Huyền Thiên Tông.' });
          syncChar(socket, player);
        }
        console.log(`[tông môn] ${player.name} thắng Thử Thách Thú`);
        return;
      }
      player.trialReady = target.trialKind;
      persistPlayer(player);
      if (socket) {
        socket.emit('notice', { text: `✔ Đã thắng ${target.name}! Quay lại Đạo Quán bấm nút Đột phá để hoàn tất.` });
        syncChar(socket, player);
      }
      console.log(`[thử thách] ${player.name} thắng ${target.name} (${target.trialKind})`);
    }
    return;
  }
  monsters.delete(target.id);
  io.to('map:' + mapOf(target)).emit('monster_killed', { monsterId: target.id, kind: target.kind, by: player.id, byName: player.name }); // GĐ59: chỉ map liên quan
  // GĐ97: Sát Thủ — giết quái tích Sát Khí (+25, nguồn chính).
  if (player.classId === 'satthu') addSatKhi(player, SATKHI_KILL);
  if (player.classId === 'kiemtu') addNgoKiem(player, NGOKIEM_KILL); // GĐ99: giết quái tích Ngộ Kiếm
  if (player.classId === 'quytu') addHonKhi(player, HONKHI_KILL); // GĐ102: giết quái tích Hồn Khí
  // GĐ70: Đan Ma chết tự bạo (phân thân KHÔNG tan theo bản thể — còn lại tối đa
  // 25s, để cơ chế nhìn thấy được cả khi bản thể bị một đòn hạ)
  const mechD = mechOf(target);
  if (mechD?.selfDestruct) {
    for (const p of players.values()) {
      if (p.isOffline || p.isBot || mapOf(p) !== mapOf(target)) continue;
      if (Math.hypot(p.x - target.x, p.y - target.y) <= (mechD.selfDestruct.radius || 100)) {
        hitPlayer(p, (target.atk ?? 10) * (mechD.selfDestruct.mul || 1.5), 'magic', target);
      }
    }
  }
  // GĐ22: đường tông môn chia thưởng cho cả đội (hệ số 2/3 — bản chơi đơn đã chốt)
  const rf = rewardFactorOf(player);
  // GĐ38: rơi đồ theo LOÀI (nằm dưới đất, đi qua là nhặt). Linh thạch: sói
  // 3–8 (theo file), dơi 2–6, thạch quái 8–15 (số MMO). Tỉ lệ rơi vật phẩm
  // là số TẠM của bản MMO (file không ghi): nanh sói 30%, cánh dơi 35%,
  // đá quý 25%, sách tọa thiền 8% từ sói.
  let stoneRange = target.kind === 'golem' ? [8, 15] : target.kind === 'bat' ? [2, 6] : [3, 8];
  // GĐ59: quái GDD ở map mới — Linh thạch theo bậc (TẠM): TC 8–15, KD 15–30
  if (MONSTER_TYPES[target.kind]?.gdd) stoneRange = MONSTER_TYPES[target.kind].realm === 'kd' ? [15, 30] : MONSTER_TYPES[target.kind].realm === 'tc' ? [8, 15] : [3, 8];
  const deadMapId = mapOf(target); // GĐ59: đồ rơi thuộc về map của quái
  spawnDrop('stones', null, Math.max(1, Math.round((stoneRange[0] + Math.floor(Math.random() * (stoneRange[1] - stoneRange[0] + 1))) * rf)), Math.round(target.x), Math.round(target.y), deadMapId);
  const dropItem = (itemId, dx, dy) => spawnDrop('item', itemId, 1, Math.round(target.x + dx), Math.round(target.y + dy), deadMapId);
  if (target.kind === 'wolf') {
    if (Math.random() < 0.3) dropItem('nanh_soi', rand(-18, 18), rand(-14, 14));
    if (Math.random() < 0.08) dropItem('sach_toa_thien', rand(-18, 18), rand(-14, 14)); // GĐ22
  } else if (target.kind === 'bat') {
    if (Math.random() < 0.35) dropItem('canh_doi', rand(-18, 18), rand(-14, 14));
  } else if (target.kind === 'golem') {
    if (Math.random() < 0.25) dropItem('da_quy', rand(-18, 18), rand(-14, 14));
  } else if (target.kind === 'huyetlang') { // GĐ57 (tỉ lệ TẠM theo loài thường cùng hạng)
    if (Math.random() < 0.30) dropItem('nanh_soi', rand(-18, 18), rand(-14, 14));
  } else if (target.kind === 'kiemma') { // GĐ57 TẠM
    if (Math.random() < 0.20) dropItem('da_quy', rand(-18, 18), rand(-14, 14));
  } else if (target.kind === 'khoiloi') { // GĐ57: trùm bí cảnh rơi Đá Quý khá hơn (TẠM)
    if (Math.random() < 0.45) dropItem('da_quy', rand(-18, 18), rand(-14, 14));
  } else if (MONSTER_TYPES[target.kind]?.gdd) { // GĐ59: loài GDD mới — Đá Quý 22% (TẠM, mọi map)
    if (Math.random() < 0.22) dropItem('da_quy', rand(-18, 18), rand(-14, 14));
  }
  // GĐ96: Tẩm bổ Thể Tu — thịt/xương rơi ngay tại chỗ quái gục, đi qua là nhặt (như mọi đồ rơi)
  if (MEAT_KINDS.has(target.kind) && Math.random() < 0.5) dropItem('thit_thu', rand(-18, 18), rand(-14, 14));
  if (BONE_KINDS.has(target.kind) && Math.random() < 0.5) dropItem('xuong_thu', rand(-18, 18), rand(-14, 14));
  if (target.kind === 'doc_xa' && Math.random() < 0.5) dropItem('noc_ran', rand(-18, 18), rand(-14, 14)); // GĐ98: Nọc Rắn — nguyên liệu Chế độc (tỉ lệ TẠM)
  if (QUANG_KINDS.has(target.kind) && Math.random() < 0.5) dropItem('quang', rand(-18, 18), rand(-14, 14)); // GĐ99: Quặng — nguyên liệu Dưỡng Kiếm (tỉ lệ TẠM)
  if (HUYET_KINDS.has(target.kind) && Math.random() < 0.5) dropItem('tinh_huyet', rand(-18, 18), rand(-14, 14)); // GĐ99: Tinh Huyết — nguyên liệu Dưỡng Kiếm (tỉ lệ TẠM)
  if (Math.random() < 0.15) dropItem('manh_xuong', rand(-18, 18), rand(-14, 14)); // GĐ101: Mảnh Xương — nguyên liệu Cốt Tu (theo tài liệu 15%; trùm thử thách/ảo ảnh đã return sớm phía trên)
  // GĐ39: tung RƯƠNG theo hạng quái (bảng B10) — rơi tại chỗ quái gục,
  // người chơi tới gần là mở; trùm thử thách không rơi rương (theo bản SP)
  {
    const tier = chestTierFor(target);
    if (tier) {
      let grade = rollChestGrade(tier, rf);
      const minG = MONSTER_TYPES[target.kind]?.minChestGrade || (target.mapBoss ? 'B' : null); // GĐ57: trùm bí cảnh không rớt rương dưới phẩm B; GĐ70: trùm theo map cũng vậy
      // GĐ59b: trùm có minChestGrade thì CHẮC CHẮN có rương — trước đây hệ số
      // thưởng rf (đệ tử tông môn ×2/3) làm xác suất rơi rương của trùm tụt
      // còn ~63%, giết trùm xong 1/3 số lần không có rương nào, trái với
      // cam kết "tối thiểu phẩm B" (đã bắt gặp ở test45).
      if (!grade && minG) grade = minG;
      if (grade && minG && ({ C: 1, B: 2, A: 3 }[grade] || 0) < ({ C: 1, B: 2, A: 3 }[minG] || 0)) grade = minG;
      const stoneG = target.mapBoss ? 'cuc' : stoneGradeForKind(target.kind); // GĐ70: rương trùm theo map cũng ra Cực phẩm
      if (grade && spawnChest(target.x + rand(-14, 14), target.y + rand(-10, 10), grade, deadMapId, stoneG)) {
        console.log(`[rương] ${target.name} rơi rương cấp ${grade} (linh thạch ${stoneG})`);
      }
    }
  }
  // GĐ76: BỎ Tu vi khi đánh quái — nguồn Tu vi mới là linh mạch + thiền
  // (thiền tại nơi linh khí). Nhiệm vụ / hộ tống / ngày mới / bế quan
  // vẫn thưởng Tu vi như cũ.
  // GĐ27: đếm sói đã hạ cho thành tựu (chỉ quái sói thường, không tính trùm thử thách)
  if (target.kind === 'wolf' && player.counters) {
    player.counters.wolfKills = (player.counters.wolfKills || 0) + 1;
  }
  // Tiến độ nhiệm vụ diệt quái (GĐ8 + GĐ24: mọi nhiệm vụ kind 'kill' —
  // cả nhiệm vụ bảng lẫn nhiệm vụ riêng của NPC)
  for (const [qid, def] of Object.entries(QUESTS)) {
    if (def.kind !== 'kill') continue;
    if (def.monsterKind && def.monsterKind !== target.kind) continue; // GĐ38: nhiệm vụ tính đúng loài
    if (def.targetMap && def.targetMap !== deadMapId) continue; // GĐ129: quest diệt gắn map thì chỉ tính quái đúng map đó
    const q = player.quests?.[qid];
    if (q && q.state === 'active') {
      q.progress = Math.min(def.target, (q.progress || 0) + 1);
      if (q.progress >= def.target) {
        q.state = 'done';
        if (socket) {
          const where = def.npcId ? (questNpcName(def.npcId) || 'người giao nhiệm vụ') : 'Bảng treo thưởng / Nhà Trưởng Làng';
          socket.emit('notice', { text: `✔ Hoàn thành “${def.name}” — tới ${where} trả nhiệm vụ!` });
        }
      }
    }
  }
  // GĐ127: tiến độ nhiệm vụ săn trùm — chỉ tính quái có cờ trùm (mapBoss
  // hoặc trùm đàn tế realmBoss); quái thường cùng loài không tính.
  if (target.mapBoss || MONSTER_TYPES[target.kind]?.area === 'realmBoss') {
    for (const [qid, def] of Object.entries(QUESTS)) {
      if (def.kind !== 'boss' || !def.bossOnly) continue;
      if (def.monsterKind && def.monsterKind !== target.kind) continue;
      if (def.targetMap && def.targetMap !== deadMapId) continue; // GĐ129: quest trùm gắn map thì chỉ tính trùm đúng map đó
      const q = player.quests?.[qid];
      if (q && q.state === 'active') {
        q.progress = Math.min(def.target, (q.progress || 0) + 1);
        if (q.progress >= def.target) {
          q.state = 'done';
          if (socket) {
            const where = def.npcId ? (questNpcName(def.npcId) || 'người giao nhiệm vụ') : 'Bảng treo thưởng / Nhà Trưởng Làng';
            socket.emit('notice', { text: `✔ Hoàn thành “${def.name}” — tới ${where} trả nhiệm vụ!` });
          }
        }
      }
    }
  }
  persistPlayer(player);
  if (socket) syncChar(socket, player);
  scheduleMonsterRespawn(target, mapOf(target)); // GĐ59: hồi sinh đúng map + đúng số lượng của map đó
  console.log(`[combat] ${target.id} bị tiêu diệt bởi ${player.name} — hồi sinh sau ${(target.mapBoss ? 600000 : MONSTER_TYPES[target.kind]?.respawnMs || MONSTER_RESPAWN_MS) / 1000}s`);
}

// GĐ103: nhịp hồi sinh quái — tách từ đuôi onMonsterKilled thành hàm chung để
// Siêu Độ (quái biến mất nhưng vẫn hồi sinh) dùng lại, không đổi hành vi kill thường.
function scheduleMonsterRespawn(target, deadMap) {
  const respawnMs = target.mapBoss ? 600000 : MONSTER_TYPES[target.kind]?.respawnMs || MONSTER_RESPAWN_MS; // GĐ57: từng loài có nhịp hồi sinh riêng (trùm bí cảnh 10 phút — TẠM); GĐ70: trùm theo map cũng 10 phút
  setTimeout(() => {
    const t = MONSTER_TYPES[target.kind]; // GĐ38: hồi sinh đúng loài vừa hạ
    if (!t) return;
    if (target.mapBoss) { // GĐ70: trùm hồi sinh riêng theo số trùm của map, không phụ thuộc số lượng thường
      const wantBoss = MAP_BOSSES.find((b) => b.kind === target.kind && b.mapId === deadMap)?.count || 1;
      if (countBossInMap(target.kind, deadMap) < wantBoss) spawnMonster(target.kind, deadMap, { mapBoss: true });
      return;
    }
    const want = deadMap === HOME_MAP ? t.count : spawnCountFor(target.kind, deadMap);
    if (countKindInMap(target.kind, deadMap) < want) spawnMonster(target.kind, deadMap);
  }, respawnMs);
}

// AI quái mỗi tick: có người chơi NGOÀI LÀNG trong tầm AGGRO thì
// đuổi theo người gần nhất; không thì lang thang ngẫu nhiên.
// Người chơi ở trong làng = an toàn, quái không đuổi theo.
function updateMonster(m, dt) {
  initMonsterFx(m);
  const nowFx = Date.now();
  const stunned = nowFx < (m.stunUntil || 0);
  const rooted = nowFx < (m.rootUntil || 0);
  const slowK = nowFx < (m.slowUntil || 0) ? 1 - (m.slowPct || 0) / 100 : 1;
  if (nowFx < (m.tranSealUntil || 0)) return; // GĐ135: quái trong Cấm Chế Trận — đứng yên, không đi không cắn được
  // GĐ70: AoE đã hẹn giờ (mưa lửa / sét / dậm băng) tới giờ thì nổ
  if (m.aoe && nowFx >= m.aoe.at) {
    const a = m.aoe; m.aoe = null; m.windupUntil = 0;
    const cx = a.centerOnSelf ? m.x : a.x;
    const cy = a.centerOnSelf ? m.y : a.y;
    for (const p of players.values()) {
      if (p.isOffline || p.isBot || mapOf(p) !== mapOf(m)) continue;
      if (Math.hypot(p.x - cx, p.y - cy) <= a.radius) {
        hitPlayer(p, (m.atk ?? 10) * (a.mul || 1), a.type || 'magic', m);
        if (a.slowPct) applyPlayerStatus(p, { slowPct: a.slowPct, slowSec: a.slowSec || 3 });
      }
    }
  }
  // GĐ60: quái PHỤC KÍCH (rắn độc…) — nằm ẩn bất động, chỉ hiện hình + lao
  // vồ khi con mồi tới gần (<130px). Đang ẩn: không lang thang, không bị
  // nhắm đánh (chưa ai nhìn thấy nó).
  if (m.hidden) {
    let nd = Infinity;
    let ndSat = Infinity; // GĐ97: Sát Thủ thấy quái ẩn từ xa hơn
    for (const p of players.values()) {
      if (p.isOffline || p.isCompanion || p.isBot) continue;
      if (mapOf(p) !== mapOf(m)) continue;
      const d = Math.hypot(p.x - m.x, p.y - m.y);
      if (d < nd) nd = d;
      if (p.classId === 'satthu' && d < ndSat) ndSat = d;
    }
    // GĐ97: Sát Thủ nhìn xa gấp 1,5 lần — quái ẩn hiện hình ở 195px thay vì 130px.
    if (nd < 130 || ndSat < 195) { m.hidden = false; m.lungeUntil = Date.now() + 700; }
    else return;
  }
  // GĐ19: trùm thử thách — chỉ đuổi/cắn CHỦ NHÂN của nó, đứng trong làng (sân Đạo Quán), quá 5 phút tự tan
  if (m.kind === 'trial') {
    if (Date.now() - (m.bornAt || 0) > 5 * 60 * 1000) {
      monsters.delete(m.id);
      return;
    }
    const owner = players.get(m.ownerId);
    if (!owner || owner.hp <= 0) return;
    if (stunned) return; // GĐ34: bị choáng → đứng yên chịu trận
    const d = Math.hypot(owner.x - m.x, owner.y - m.y);
    if (d > 30 && !rooted) {
      const dx = owner.x - m.x;
      const dy = owner.y - m.y;
      const len = Math.hypot(dx, dy) || 1;
      // GĐ97: chủ nhân đang Siêu Giác Quan → trùm thử thách cũng chậm lại (×0,5).
      const slow97 = ultActiveOf(owner) ? 0.5 : 1;
      moveWithCollision(
        m,
        m.x + (dx / len) * MONSTER_CHASE_SPEED * slowK * slow97 * dt,
        m.y + (dy / len) * MONSTER_CHASE_SPEED * slowK * slow97 * dt,
      );
      faceDirection(m, dx, dy);
    } else {
      faceDirection(m, owner.x - m.x, owner.y - m.y);
      const now = Date.now();
      if (now - (m.lastAttackAt || 0) >= (ultActiveOf(owner) ? 2000 : 1000)) {
        m.lastAttackAt = now;
        hitPlayer(owner, m.atk, 'physical', m);
      }
    }
    // Tâm Ma Ảnh / Lôi Kiếp Ảnh: tung chiêu theo hệ số + phase 2 phân thân khi HP ≤ 50% (GĐ87: Kim Đan dùng hệ số 2.0)
    if ((m.trialKind === 'dai' || m.trialKind === 'kimdan') && m.isTrialBoss) {
      const now = Date.now();
      if (d <= 190 && now - (m.lastSkillAt || 0) >= 4000) {
        m.lastSkillAt = now;
        hitPlayer(owner, m.atk * (m.trialKind === 'kimdan' ? 2.0 : 1.6), 'magic', m);
        io.emit('skill_cast', { id: m.id, slot: 2, skillId: 'tam_ma', targetId: owner.id });
      }
      if (!m.phase2 && m.hp <= m.maxHp / 2) {
        m.phase2 = true;
        for (let i = 0; i < 2; i++) {
          const miniHp = Math.round(m.maxHp * 0.2);
          const miniId = 'trial-mini-' + ++monsterSeq;
          monsters.set(miniId, {
            id: miniId, kind: 'trial', trialKind: m.trialKind, isTrialBoss: false, ownerId: m.ownerId, mapId: mapOf(m), // GĐ59
            name: m.trialKind === 'kimdan' ? 'Lôi Kiếp Phân Thân' : 'Tâm Ma Phân Thân', x: m.x + (i === 0 ? -46 : 46), y: m.y + 24, hp: miniHp, maxHp: miniHp,
            atk: Math.round(m.atk * 0.5 * 10) / 10, vx: 0, vy: 0, direction: 'down', lastAttackAt: 0, bornAt: Date.now(),
          });
        }
        io.to(m.ownerId).emit('notice', { text: m.trialKind === 'kimdan' ? 'Lôi Kiếp Ảnh phân thân thành 2 bóng sét!' : 'Tâm Ma Ảnh phân thân thành 2 bóng nhỏ!' });
      }
    }
    return;
  }
  // Tìm người chơi gần nhất đang ở ngoài vùng an toàn (làng + sân tông môn)
  let nearest = null;
  let nearestDist = Infinity;
  for (const p of players.values()) {
    if (p.isOffline) continue; // GĐ22: người nghỉ offline luôn ở vùng an toàn
    if (p.hp <= 0) continue; // GĐ104: quái ngó lơ người gục ngã (hp 0)
    if (mapOf(p) !== mapOf(m)) continue; // GĐ59: quái chỉ thấy người CÙNG MAP
    if (mapOf(m) === HOME_MAP) {
      if (isSafeZone(p.x, p.y)) continue;
      if (insideRealm(p.x, p.y) !== insideRealm(m.x, m.y)) continue; // GĐ57: vách bí cảnh ngăn hai phía — không đuổi/đánh xuyên
      // GĐ59b: điểm đáp bí cảnh (REALM_ENTRY) có vòng an toàn 130px như cổng
      // các map GĐ59 — vừa qua cổng không bị quái chờ sẵn hội đồng.
      if (insideRealm(m.x, m.y) && Math.hypot(p.x - REALM_ENTRY.x, p.y - REALM_ENTRY.y) < 130) continue;
    } else {
      // GĐ59: vòng an toàn quanh cổng dịch chuyển của map mới — quái không đuổi vào
      const rt59 = MAP_RUNTIME.get(mapOf(m));
      if (rt59 && Math.hypot(p.x - rt59.portal.x, p.y - rt59.portal.y) < 130) continue;
    }
    const d = Math.hypot(p.x - m.x, p.y - m.y);
    if (d < nearestDist) {
      nearestDist = d;
      nearest = p;
    }
  }

  // GĐ101: Cốt Vương taunt — quái đã chọn chủ có pet đang hoạt động, mà pet
  // trong tầm quanh quái (cùng map) thì chuyển mục tiêu sang pet.
  // GĐ102: Quỷ Hồn taunt y hệt (chung luật pet).
  // GĐ137: thú thuần hóa taunt y hệt.
  if (nearest && !nearest.isCotVuong && !nearest.isQuyHon && !nearest.isTamed && !nearest.isCompanion) {
    for (const q of players.values()) {
      if ((!q.isCotVuong && !q.isQuyHon && !q.isTamed) || q.ownerId !== nearest.id) continue;
      if (mapOf(q) !== mapOf(m)) continue;
      const dq = Math.hypot(q.x - m.x, q.y - m.y);
      if (dq <= COTVUONG_TAUNT_RANGE) { nearest = q; nearestDist = dq; break; }
    }
  }

  if (stunned) { // GĐ34: bị choáng → đứng yên; GĐ70: khống chế ngắt luôn chiêu đang vận (dậm băng / lao)
    m.aoe = null; m.windupUntil = 0;
    if (m.chargeState === 'windup' || m.chargeState === 'dashing') { m.chargeState = 'ready'; m.chargeReadyAt = Date.now() + 3000; }
    return;
  }
  // GĐ70: đang vận dậm băng thì đứng yên (cảnh báo phía client qua st='windup' → nhuộm đỏ)
  if (m.windupUntil && nowFx < m.windupUntil) return;
  const mech70 = mechOf(m);
  // GĐ70: kích hoạt AoE theo loài (dậm băng / mưa lửa / triệu sét)
  if (mech70 && nearest && !m.aoe) {
    const nowA = Date.now();
    if (mech70.iceStomp && nearestDist <= 160 && nowA >= (m.nextStompAt || 0)) {
      m.aoe = { at: nowA + mech70.iceStomp.windupMs, centerOnSelf: true, radius: mech70.iceStomp.radius, mul: mech70.iceStomp.mul, type: 'physical', slowPct: mech70.iceStomp.slowPct, slowSec: mech70.iceStomp.slowSec };
      m.windupUntil = nowA + mech70.iceStomp.windupMs;
      m.nextStompAt = nowA + mech70.iceStomp.cdMs;
      const sockA = io.sockets.sockets.get(nearest.id);
      if (sockA) sockA.emit('notice', { text: `⚠ ${m.name} đang dậm chân — tránh ra khỏi vòng băng!` });
      return;
    }
    if (mech70.fireRain && nearestDist <= 320 && nowA >= (m.nextRainAt || 0)) {
      m.aoe = { at: nowA + mech70.fireRain.delayMs, x: nearest.x, y: nearest.y, radius: mech70.fireRain.radius, mul: mech70.fireRain.mul, type: 'magic' };
      m.nextRainAt = nowA + mech70.fireRain.cdMs;
      const sockA = io.sockets.sockets.get(nearest.id);
      if (sockA) sockA.emit('notice', { text: `⚠ ${m.name} sắp thả mưa lửa xuống chỗ bạn!` });
    }
    if (mech70.lightning && nearestDist <= 320 && nowA >= (m.nextBoltAt || 0)) {
      m.aoe = { at: nowA + mech70.lightning.delayMs, x: nearest.x, y: nearest.y, radius: mech70.lightning.radius, mul: mech70.lightning.mul, type: 'magic' };
      m.nextBoltAt = nowA + mech70.lightning.cdMs;
      const sockA = io.sockets.sockets.get(nearest.id);
      if (sockA) sockA.emit('notice', { text: `⚠ ${m.name} triệu hồi sét đánh xuống chỗ bạn!` });
    }
  }
  // GĐ70: LAO (Lâm Trư / Kim Giáp Tê) — lấy đà 0.6s rồi vọt thẳng ×3 tốc độ
  if (mech70?.charge && !rooted && nearest && nearestDist <= MONSTER_AGGRO_RANGE) {
    const nowC = Date.now();
    if (m.chargeState === 'windup') {
      if (nowC >= (m.chargeWindupUntil || 0)) {
        const dx = nearest.x - m.x;
        const dy = nearest.y - m.y;
        const len = Math.hypot(dx, dy) || 1;
        m.chargeDx = dx / len; m.chargeDy = dy / len;
        m.chargeState = 'dashing'; m.chargeUntil = nowC + 700; m.chargeHit = false;
        faceDirection(m, dx, dy);
      } else { faceDirection(m, nearest.x - m.x, nearest.y - m.y); return; }
    } else if (m.chargeState === 'dashing') {
      if (nowC >= (m.chargeUntil || 0)) { m.chargeState = 'ready'; m.chargeReadyAt = nowC + (mech70.charge.cdMs || 6000); }
      else {
        const step = (m.chaseSpeed || 160) * 3 * dt;
        const nx = m.x + m.chargeDx * step;
        const ny = m.y + m.chargeDy * step;
        if (hitsObstacleIn(mapOf(m), nx, ny, 20)) { m.chargeState = 'ready'; m.chargeReadyAt = nowC + (mech70.charge.cdMs || 6000); }
        else {
          m.x = nx; m.y = ny; faceDirection(m, m.chargeDx, m.chargeDy);
          if (!m.chargeHit) {
            for (const p of players.values()) {
              if (p.isOffline || p.isBot || mapOf(p) !== mapOf(m)) continue;
              if (Math.hypot(p.x - m.x, p.y - m.y) <= 48) {
                m.chargeHit = true;
                hitPlayer(p, (m.atk ?? 10) * (mech70.charge.dmgMul || 1.5), 'physical', m);
                if (mech70.charge.stunSec) applyPlayerStatus(p, { stunSec: mech70.charge.stunSec });
                break;
              }
            }
          }
        }
      }
      return;
    } else if (nearestDist < 280 && nearestDist > 50 && nowC >= (m.chargeReadyAt || 0)) {
      m.chargeState = 'windup'; m.chargeWindupUntil = nowC + 600;
      faceDirection(m, nearest.x - m.x, nearest.y - m.y);
      return;
    }
  }
  if (nearest && nearestDist <= MONSTER_AGGRO_RANGE && nearestDist > Math.max(26, m.atkRange || WOLF.atkRange)) {
    // Đuổi theo người chơi gần nhất (dừng ở tầm đánh của mình — GĐ70: quái đánh
    // xa dừng ở 150px chứ không áp sát 26px; quái cận chiến dừng ở ~44px như cũ)
    if (rooted) return; // GĐ34: bị trói → không di chuyển (vẫn cắn được nếu đã áp sát)
    const dx = nearest.x - m.x;
    const dy = nearest.y - m.y;
    const len = Math.hypot(dx, dy) || 1;
    // GĐ97: mục tiêu đang Siêu Giác Quan → quái đuổi chậm lại (×0,5).
    const slow97 = ultActiveOf(nearest) ? 0.5 : 1;
    moveWithCollision(
      m,
      m.x + (dx / len) * (m.chaseSpeed || MONSTER_CHASE_SPEED) * (Date.now() < (m.lungeUntil || 0) ? 2.1 : 1) * slowK * slow97 * dt, // GĐ60: cú lao vồ lúc vừa hiện hình nhanh gấp đôi
      m.y + (dy / len) * (m.chaseSpeed || MONSTER_CHASE_SPEED) * (Date.now() < (m.lungeUntil || 0) ? 2.1 : 1) * slowK * slow97 * dt,
    );
    faceDirection(m, dx, dy);
  } else if (nearest && nearestDist <= (m.atkRange || WOLF.atkRange)) {
    // Đã áp sát → CẮN (GĐ6): sát thương vật lý của sói trừ theo Vật phòng
    // của người chơi, đúng công thức file: × 100/(100 + Vật phòng), tối thiểu 1.
    faceDirection(m, nearest.x - m.x, nearest.y - m.y);
    const now = Date.now();
    // GĐ97: mục tiêu đang Siêu Giác Quan → quái cắn chậm lại (×2 thời gian hồi).
    if (now - (m.lastAttackAt || 0) >= (m.atkCdMs || WOLF.atkCooldownMs) * (ultActiveOf(nearest) ? 2 : 1)) {
      m.lastAttackAt = now;
      hitPlayer(nearest, (m.atk ?? WOLF.atk) * tranDebuffMulOf(m), 'physical', m); // GĐ135: quái trong Trận Suy Nhược cắn yếu đi
    }
  } else if (!nearest || nearestDist > MONSTER_AGGRO_RANGE) {
    // Lang thang: thỉnh thoảng đổi hướng, nảy biên
    if (Math.random() < 0.02) {
      const v = makeVelocity();
      m.vx = v.vx;
      m.vy = v.vy;
    }
    const scale = ((m.wanderSpeed || MONSTER_WANDER_SPEED) * slowK) / (Math.hypot(m.vx, m.vy) || 1);
    // GĐ53: lang thang cũng tránh vật cản — đụng trục nào thì nảy trục đó
    const wx = m.x + m.vx * scale * dt;
    const wy = m.y + m.vy * scale * dt;
    const wStuck = hitsObstacleIn(mapOf(m), m.x, m.y);
    if (wStuck || !hitsObstacleIn(mapOf(m), wx, m.y)) m.x = wx;
    else m.vx = -m.vx;
    if (wStuck || !hitsObstacleIn(mapOf(m), m.x, wy)) m.y = wy;
    else m.vy = -m.vy;
    faceDirection(m, m.vx, m.vy);
    const md59 = mapDims(mapOf(m)); // GĐ59: biên theo map của quái
    if (m.x < MARGIN) { m.x = MARGIN; m.vx = Math.abs(m.vx); }
    if (m.x > md59.w - MARGIN) { m.x = md59.w - MARGIN; m.vx = -Math.abs(m.vx); }
    if (m.y < MARGIN) { m.y = MARGIN; m.vy = Math.abs(m.vy); }
    if (m.y > md59.h - MARGIN) { m.y = md59.h - MARGIN; m.vy = -Math.abs(m.vy); }
  }
  // Kẹp trong sân + TUYỆT ĐỐI không vào làng: nếu lọt vào thì đẩy ra cạnh gần nhất
  const md59b = mapDims(mapOf(m));
  m.x = Math.max(MARGIN, Math.min(md59b.w - MARGIN, m.x));
  m.y = Math.max(MARGIN, Math.min(md59b.h - MARGIN, m.y));
  if (mapOf(m) !== HOME_MAP) return; // GĐ59: đẩy khỏi làng/sân tông chỉ có ở map nhà
  if (insideVillage(m.x, m.y, 6)) {
    const left = m.x - (VILLAGE.x - 6);
    const right = VILLAGE.x + VILLAGE.w + 6 - m.x;
    const top = m.y - (VILLAGE.y - 6);
    const bottom = VILLAGE.y + VILLAGE.h + 6 - m.y;
    const min = Math.min(left, right, top, bottom);
    if (min === left) m.x = VILLAGE.x - 6;
    else if (min === right) m.x = VILLAGE.x + VILLAGE.w + 6;
    else if (min === top) m.y = VILLAGE.y - 6;
    else m.y = VILLAGE.y + VILLAGE.h + 6;
  }
  // GĐ22: tương tự — tuyệt đối không vào sân Thanh Phong Môn
  if (insideSect(m.x, m.y, 6)) {
    const left = m.x - (SECT.x - 6);
    const right = SECT.x + SECT.w + 6 - m.x;
    const top = m.y - (SECT.y - 6);
    const bottom = SECT.y + SECT.h + 6 - m.y;
    const min = Math.min(left, right, top, bottom);
    if (min === left) m.x = SECT.x - 6;
    else if (min === right) m.x = SECT.x + SECT.w + 6;
    else if (min === top) m.y = SECT.y - 6;
    else m.y = SECT.y + SECT.h + 6;
  }
}

// Quái đánh người chơi (GĐ6): trừ HP theo phòng thủ tương ứng;
// HP ≤ 0 → gục ngã, hồi sinh tại quảng trường làng với máu đầy (đúng luật
// bản chơi đơn: chết về làng, không mất đồ; thời gian chờ leo thang để sau).
// ===== GĐ34: HIỆU ỨNG ĐẶC BIỆT của công pháp (bóc từ mô tả trong file) =====
function initMonsterFx(m) {
  if (!m.dots) { m.stunUntil = 0; m.rootUntil = 0; m.slowUntil = 0; m.slowPct = 0; m.vulnUntil = 0; m.vulnPct = 0; m.dots = []; }
  return m;
}
// Gây sát thương lên quái, tôn trọng trạng thái "yếu đi" (vuln: nhận thêm %)
function hurtMonster(m, raw, def, dmgType = 'physical', mul = 1) { // GĐ105: mul = nhân dmg Ý Cảnh Nghĩa Bạc (mặc định 1)
  initMonsterFx(m);
  // GĐ70: phân thân lần đầu chịu đòn (Huyễn Ảnh Miêu / Huyễn Điệp)
  const mech = mechOf(m);
  if (mech?.clones && !m.clonesSpawned && !m.illusion) {
    m.clonesSpawned = true;
    spawnIllusions(m, mech.clones);
  }
  let dmg = damageThrough(raw * mul, def);
  if (mech?.physResist && dmgType === 'physical') dmg = Math.max(1, Math.round(dmg * (1 - mech.physResist))); // GĐ70: giáp đá (Thạch Khôi Lỗi)
  if (Date.now() < (m.vulnUntil || 0)) dmg = Math.max(1, Math.round(dmg * (1 + (m.vulnPct || 0) / 100)));
  m.hp -= dmg;
  // GĐ70: hồi sinh 1 lần (Cốt Binh) — không chết mà về 50% HP
  if (m.hp <= 0 && mech?.reviveOnce && !m.revivedOnce) {
    m.revivedOnce = true;
    m.hp = Math.max(1, Math.round(m.maxHp * mech.reviveOnce));
  }
  return dmg;
}
// GĐ70: sinh ảo ảnh (phân thân quái) — HP thấp, không rương/Tu vi/nhiệm vụ/hồi sinh, tự tan sau 25s
function spawnIllusions(m, n) {
  for (let i = 0; i < n; i++) {
    const hp = Math.max(1, Math.round(m.maxHp * 0.3));
    const id = m.kind + '-ao-' + (++monsterSeq);
    const ill = {
      id, kind: m.kind, name: m.name, mapId: mapOf(m),
      x: m.x + (i === 0 ? -44 : 44), y: m.y + 30,
      hp, maxHp: hp, atk: Math.round(m.atk * 0.5), def: m.def,
      chaseSpeed: m.chaseSpeed, wanderSpeed: m.wanderSpeed,
      atkRange: m.atkRange, atkCdMs: m.atkCdMs,
      vx: 0, vy: 0, direction: 'down', lastAttackAt: 0,
      illusion: true, illusionBornAt: Date.now(),
    };
    initMonsterFx(ill);
    monsters.set(id, ill);
  }
}
function applyFxToMonster(caster, m, fx) {
  if (!fx) return;
  initMonsterFx(m);
  const now = Date.now();
  const bossK = m.isTrialBoss ? 0.5 : 1; // trùm thử thách kháng khống chế một nửa
  if (fx.stun) m.stunUntil = Math.max(m.stunUntil, now + fx.stun * 1000 * bossK);
  if (fx.root) m.rootUntil = Math.max(m.rootUntil, now + fx.root * 1000 * bossK);
  if (fx.slowPct) {
    if (now >= m.slowUntil || fx.slowPct >= m.slowPct) m.slowPct = fx.slowPct;
    m.slowUntil = Math.max(m.slowUntil, now + fx.slowSec * 1000);
  }
  if (fx.vuln) { m.vulnPct = fx.vuln; m.vulnUntil = Math.max(m.vulnUntil, now + fx.vulnSec * 1000); }
  if (fx.dotDps) {
    m.dots = m.dots.filter((d) => d.ownerId !== caster.id);
    m.dots.push({ dps: fx.dotDps, until: now + fx.dotSec * 1000, ownerId: caster.id });
  }
  if (fx.knock && m.kind !== 'trial') {
    const dx = m.x - caster.x;
    const dy = m.y - caster.y;
    const len = Math.hypot(dx, dy) || 1;
    const nx = m.x + (dx / len) * fx.knock;
    const ny = m.y + (dy / len) * fx.knock;
    if (!hitsObstacle(nx, m.y)) m.x = nx;
    if (!hitsObstacle(m.x, ny)) m.y = ny;
  }
}
// Buff/hồi phục áp lên NGƯỜI tung chiêu
function applySelfFx(p, fx, totalDealt) {
  if (!fx) return;
  const now = Date.now();
  if (fx.defPct) {
    if (now >= (p.defBuffUntil || 0) || fx.defPct >= (p.defBuffPct || 0)) p.defBuffPct = fx.defPct;
    p.defBuffUntil = Math.max(p.defBuffUntil || 0, now + fx.defSec * 1000);
  }
  if (fx.atkPct) { p.atkBuffPct = fx.atkPct; p.atkBuffUntil = now + fx.atkSec * 1000; }
  if (fx.reflect) { p.reflectPct = fx.reflect; p.reflectUntil = now + fx.reflectSec * 1000; }
  if (fx.nextMul) p.nextAtkMul = fx.nextMul;
  let heal = 0;
  if (fx.healPct) heal += Math.round((maxHpEff(p) * fx.healPct) / 100);
  if (fx.lifesteal && totalDealt > 0) heal += Math.round((totalDealt * fx.lifesteal) / 100);
  if (heal > 0) p.hp = Math.min(maxHpEff(p), p.hp + heal);
}
// Hệ số công hiện hành của người chơi (buff tăng công + đòn kế tiếp)
function atkMulOf(p) {
  let mul = 1;
  if (Date.now() < (p.atkBuffUntil || 0)) mul *= 1 + (p.atkBuffPct || 0) / 100;
  if (p.nextAtkMul) mul *= p.nextAtkMul;
  return mul;
}

// GĐ70: trạng thái quái gây lên NGƯỜI CHƠI (độc / chậm / choáng) — chỉ báo lần đầu để khỏi spam
function applyPlayerStatus(p, st) {
  if (!p || p.isBot || p.hp <= 0) return;
  const now = Date.now();
  // GĐ95: Bất khuất Thể Tu — đang bật thì miễn khống chế (chậm/choáng);
  // độc vẫn tính vì độc không phải khống chế.
  if (p.classId === 'thetu' && now < (p.unyieldUntil || 0) && (st.slowPct || st.stunSec)) {
    const rest = { ...st };
    delete rest.slowPct; delete rest.slowSec; delete rest.stunSec;
    if (!rest.poisonDps) return;
    st = rest;
  }
  const sock = io.sockets.sockets.get(p.id);
  if (st.poisonDps) {
    const fresh = !(p.dots && p.dots.length);
    if (!p.dots) p.dots = [];
    p.dots.push({ dps: st.poisonDps, until: now + (st.poisonSec || 4) * 1000 });
    if (fresh && sock) sock.emit('notice', { text: `☠ Bạn trúng độc (${st.poisonDps} HP/s)!` });
  }
  if (st.slowPct) {
    const fresh = !(now < (p.slowUntil || 0));
    if (fresh || st.slowPct >= (p.slowPct || 0)) p.slowPct = st.slowPct;
    p.slowUntil = Math.max(p.slowUntil || 0, now + (st.slowSec || 3) * 1000);
    if (fresh && sock) sock.emit('notice', { text: `❄ Bạn bị làm chậm ${st.slowPct}%!` });
  }
  if (st.stunSec) {
    const fresh = !(now < (p.stunUntil || 0));
    p.stunUntil = Math.max(p.stunUntil || 0, now + st.stunSec * 1000);
    if (fresh && sock) sock.emit('notice', { text: `💫 Bạn bị choáng ${st.stunSec}s!` });
  }
}
// GĐ70: gục ngã — tách từ hitPlayer để độc theo thời gian cũng dùng chung
function handlePlayerDeath(p, source) {
  p.downedUntil = 0; // GĐ104: chết thật thì hết trạng thái gục ngã
  if (p.isEscortMerchant) { failEscort(p); players.delete(p.id); return; } // GĐ60
  p.journey = null; // GĐ60: gục giữa hành trình → hủy ngự kiếm/thuyền
  p.flying = false; // GĐ88: chết là hạ xuống đất
  p.preaching = false; p.studying = false; p.nhoZone = null; p.tranBuff = null; p.tranDebuff = null; p.tranSeal = null; // GĐ103: chết là dứt Thuyết Pháp; GĐ105: dứt đọc sách + xóa Ý Cảnh; GĐ135: chết xóa trận tạm
  const pos = plazaSpawn();
  const diedMap = mapOf(p); // GĐ59
  p.mapId = HOME_MAP;
  p.x = pos.x;
  p.y = pos.y;
  p.hp = maxHpEff(p);
  p.mp = maxMpEff(p);
  p.input.vx = 0;
  p.input.vy = 0;
  p.dots = []; p.slowUntil = 0; p.stunUntil = 0; // GĐ70: hồi sinh sạch trạng thái
  // GĐ19: gục ngã giữa thử thách → trùm thử thách tan, phải gọi lại (đan chưa bị trừ)
  if (source && source.kind === 'trial') {
    for (const mm of [...monsters.values()]) {
      if (mm.kind === 'trial' && mm.ownerId === p.id) monsters.delete(mm.id);
    }
  }
  persistPlayer(p);
  // GĐ59: chết ở map khác → socket rời phòng map đó, về phòng làng + nạp lại cảnh làng
  if (diedMap !== HOME_MAP) {
    const dsock = io.sockets.sockets.get(p.id);
    if (dsock) {
      dsock.leave('map:' + diedMap);
      dsock.join('map:' + HOME_MAP);
      dsock.emit('map_enter', mapEnterPayload(HOME_MAP));
      emitFull(dsock, HOME_MAP);
    }
    for (const q of players.values()) if (q.isCompanion && q.ownerId === p.id) { q.mapId = HOME_MAP; q.x = pos.x + 28; q.y = pos.y + 12; }
  }
  io.to('map:' + diedMap).emit('player_died', { id: p.id, name: p.name, by: (source && source.name) || WOLF.name });
  io.to(p.id).emit('you_died', { by: (source && source.name) || WOLF.name });
  console.log(`[combat] ${p.name} gục ngã — hồi sinh tại quảng trường làng`);
}
// ================= GĐ95: KHUNG CƠ CHẾ LỚP + THỂ TU (NỘ KHÍ) ==============
// Tài nguyên riêng từng lớp, lưu bền trong char.classRes (khung chung cho
// cả 9 lớp sau này; mỗi lớp chỉ dùng field của mình). Thể Tu dùng rage.
// Số TẠM: đánh trúng +6, bị đánh trúng +10, Bất khuất ×1.5.
function classResOf(p) { if (!p.classRes || typeof p.classRes !== 'object') p.classRes = {}; return p.classRes; }
function rageOf(p) { return p.classId === 'thetu' ? Math.min(100, Math.max(0, Math.round(classResOf(p).rage || 0))) : 0; }
function addRage(p, n) {
  if (p.classId !== 'thetu' || p.hp <= 0) return;
  const cr = classResOf(p);
  const mul = Date.now() < (p.unyieldUntil || 0) ? 1.5 : 1;
  cr.rage = Math.min(100, Math.max(0, Math.round((cr.rage || 0) + n * mul)));
}
function rageRedOf(p) { return p.classId === 'thetu' ? (rageOf(p) / 100) * 0.3 : 0; } // Cương Kình: giảm tới 30%
function maybeTriggerUnyield(p) {
  const now = Date.now();
  if (p.classId !== 'thetu' || p.hp <= 0) return;
  if (p.hp >= maxHpEff(p) * 0.2) return;
  if (now < (p.unyieldUntil || 0) || now < (p.unyieldCdUntil || 0)) return;
  p.unyieldUntil = now + 5000;
  p.unyieldCdUntil = now + 180000;
  const sock = io.sockets.sockets.get(p.id);
  if (sock) sock.emit('notice', { text: '✦ Bất khuất kích hoạt — miễn khống chế, tích Nộ nhanh hơn 50% trong 5s!' });
}
// GĐ97: Sát Thủ — Sát Khí (classRes.satKhi 0–100), Phản Xạ, Siêu Giác Quan.
// Tài liệu chỉ chốt cap Phản Xạ 75% + hiệu ứng Siêu Giác Quan, KHÔNG ghi tốc
// độ tích / thời gian / hệ số crit → mọi số dưới đây là TẠM, chờ veto:
// đánh trúng +3, giết quái +25 (nguồn chính — đúng chất "sát khí" tích từ
// việc hạ thủ), Phản Xạ = Sát Khí × 0,75% (0 khi chưa tích, 75% khi đầy),
// Siêu Giác Quan TỰ KÍCH khi đầy (theo chữ "khi đầy thì..."): 8s, né 100%,
// crit ×2 (game chưa có crit nên hệ số này là mới), quái đang đánh đúng
// người đó chậm lại (cắn ×2 thời gian hồi, di chuyển ×0,5); hết 8s Sát Khí
// về 0 (coi như tiêu hết — không tự kích lại ngay). ultUntil là trạng thái
// tạm như hoThe/unyield (mất khi thoát game, Sát Khí trong classRes thì bền).
const ULT_MS = 8000;
const SATKHI_HIT = 3;
const SATKHI_KILL = 25;
function satKhiOf(p) { return p.classId === 'satthu' ? Math.min(100, Math.max(0, Math.round(classResOf(p).satKhi || 0))) : 0; }
function ultActiveOf(p) { return !!p.ultUntil && Date.now() < p.ultUntil; }
function critMulOf(p) { return p.classId === 'satthu' && ultActiveOf(p) ? 2 : 1; }
function emitNoticeTo(p, text) { const sock = io.sockets.sockets.get(p.id); if (sock) sock.emit('notice', { text }); }
function addSatKhi(p, n) {
  if (p.classId !== 'satthu' || p.hp <= 0) return;
  const cr = classResOf(p);
  cr.satKhi = Math.min(100, Math.max(0, (cr.satKhi || 0) + n));
  if (cr.satKhi >= 100 && !ultActiveOf(p)) {
    p.ultUntil = Date.now() + ULT_MS;
    emitNoticeTo(p, '✦ Siêu Giác Quan kích hoạt — quái chậm lại, né tuyệt đối, đòn nào cũng chí mạng trong 8s!');
  }
}
// GĐ98: Sát Thủ — lớp độc bôi vũ khí. Lưu trong classRes.coating nên bền qua restart
// như Sát Khí (không cần nối thêm điểm persist nào — classRes đã nối đủ 4 điểm từ GĐ95).
const COAT_HITS = 10, POISON_DOT_DPS = 5, POISON_DOT_SEC = 5, STIM_SATKHI = 5;
function coatingOf(p) { const cr = classResOf(p); return cr.coating && cr.coating.hits > 0 ? cr.coating : null; }
function applyCoatingOnHit(p, target) {
  // Chỉ chạy sau hurtMonster (đòn thật sự gây dmg) — đòn bị quái né đã return trước đó
  // nên không tốn lượt bôi, không bôi độc. Gọi cho cả đòn thường lẫn chiêu (giống Sát Khí).
  const coat = coatingOf(p);
  if (!coat || p.classId !== 'satthu') return;
  if (coat.type === 'ria_mau') {
    // Làm mới độc cũ của chính mình (không cộng dồn); dot kỹ năng giữ nguyên (lọc theo cờ poison).
    target.dots = (target.dots || []).filter((d) => !(d.poison && d.ownerId === p.id));
    target.dots.push({ dps: POISON_DOT_DPS, until: Date.now() + POISON_DOT_SEC * 1000, ownerId: p.id, poison: true });
  } else if (coat.type === 'kich_thich') {
    addSatKhi(p, STIM_SATKHI); // +5 thêm ngoài +3 thường → tổng +8/đòn, nhanh đầy Sát Khí
  }
  coat.hits -= 1;
  if (coat.hits <= 0) {
    classResOf(p).coating = null;
    emitNoticeTo(p, '☠️ Lớp độc trên vũ khí đã hết.');
  }
}
// GĐ99: Kiếm Tu — Ngộ Kiếm, Kiếm Vực, Ultimate, Dưỡng Kiếm. Lưu trong classRes nên bền
// qua restart như Sát Khí (không cần nối thêm điểm persist nào — classRes đã nối đủ 4 điểm
// từ GĐ95); riêng kiemUltUntil là trạng thái tạm như p.ultUntil của Sát Thủ (mất khi restart).
const NGOKIEM_HIT = 3, NGOKIEM_KILL = 25, KIEM_ULT_MS = 600000; // 10 phút thực theo tài liệu
const SWORD_NAMES = { thanh_phong: 'Thanh Phong Kiếm', huyet_sat: 'Huyết Sát Kiếm', kim_cuong: 'Kim Cương Kiếm', bang_suong: 'Băng Sương Kiếm', liet_hoa: 'Liệt Hỏa Kiếm' };
function ngoKiemOf(p) { return p.classId === 'kiemtu' ? Math.min(100, Math.max(0, Math.round(classResOf(p).ngoKiem || 0))) : 0; }
function swordOf(p) { const s = classResOf(p).sword; return p.classId === 'kiemtu' && SWORD_NAMES[s] ? s : null; }
function vucActiveOf(p) { return p.classId === 'kiemtu' && p.hp > 0 && p.hp < maxHpEff(p) * 0.3; } // Kiếm Vực: HP < 30% tự bật, tắt khi hồi trên 30%
function kiemUltActiveOf(p) { return p.classId === 'kiemtu' && !!p.kiemUltUntil && Date.now() < p.kiemUltUntil; }
function addNgoKiem(p, n) {
  if (p.classId !== 'kiemtu' || p.hp <= 0) return;
  const cr = classResOf(p);
  cr.ngoKiem = Math.min(100, Math.max(0, (cr.ngoKiem || 0) + n));
}
function kiemDmgMulOf(p) {
  // Nhân sát thương: Kiếm Vực ×2 (theo tài liệu +100%); Ultimate ×1.2 (chỉ số +20%)
  // ×1.5 (sát thương hệ Kiếm — mọi đòn của Kiếm Tu đều là đòn kiếm, vì vũ khí của họ là kiếm).
  let mul = 1;
  if (vucActiveOf(p)) mul *= 2;
  if (kiemUltActiveOf(p)) mul *= 1.2 * 1.5;
  return mul;
}
function applySwordOnHit(p, target, dealt) {
  // Chỉ chạy sau hurtMonster (đòn thật sự gây dmg) — đòn bị quái né đã return trước đó
  // nên không hút máu/làm chậm/đốt. Gọi cho cả đòn thường lẫn chiêu (giống Sát Khí/bôi độc).
  const s = swordOf(p);
  if (!s) return;
  if (s === 'huyet_sat') p.hp = Math.min(maxHpEff(p), p.hp + Math.round(dealt * 0.2)); // hút 20% sát thương gây ra (TẠM)
  else if (s === 'bang_suong') { target.slowUntil = Date.now() + 2000; target.slowPct = 100; } // đóng băng: đứng yên 2s (TẠM; vẫn cắn được nếu đã trong tầm)
  else if (s === 'liet_hoa') { // dot thiêu đốt 5 dps/5s, làm mới không cộng dồn (mẫu dot độc GĐ98)
    target.dots = (target.dots || []).filter((d) => !(d.burn && d.ownerId === p.id));
    target.dots.push({ dps: 5, until: Date.now() + 5000, ownerId: p.id, burn: true });
  }
}
// ---- GĐ100: Pháp Tu — Biến Dị Linh Căn + Phép Dung Hợp (tài liệu 9 hướng) ----
// Biến Dị: roll 1 lần duy nhất khi Pháp Tu lần đầu vào Trúc Cơ (5% theo tài liệu);
// các hệ chia đều (TẠM — tài liệu không cho tỉ trọng). GĐ107: thêm 3 hệ Huyết /
// Thời Gian / Không Gian theo yêu cầu người chơi (từ 7 lên 10 hệ, vẫn chia đều).
// Biến dị là hệ PHỤ thêm vào linh căn Ngũ Hành đã đo, không thay hệ chính. Lưu trong classRes.bienDi nên bền
// qua restart mà không cần nối persist thêm (classRes đã nối đủ 4 điểm từ GĐ95);
// undefined = chưa roll, null = đã roll mà không trúng.
const BIENDI_ELEMENTS = ['Lôi', 'Phong', 'Băng', 'Nham', 'Độc', 'Quang', 'Ám', 'Huyết', 'Thời Gian', 'Không Gian'];
const BIENDI_RATE = 0.05; // TẠM: 5% theo tài liệu
const FUSION_WINDOW_MS = 1500; // theo tài liệu
const FUSION_DMG_MUL = 1.5; // TẠM
const FUSION_NAMES = { 'Hỏa+Băng': 'Bạo Phá Băng Hỏa', 'Băng+Hỏa': 'Bạo Phá Băng Hỏa', 'Lôi+Phong': 'Lôi Đình Bão Tố', 'Phong+Lôi': 'Lôi Đình Bão Tố' };
function bienDiOf(p) { return p.classId === 'phaptu' ? (classResOf(p).bienDi ?? null) : null; }
function rollBienDi() { return Math.random() < BIENDI_RATE ? BIENDI_ELEMENTS[Math.floor(Math.random() * BIENDI_ELEMENTS.length)] : null; }
function skillElementOf(p, skill) {
  let el = skill.element || CLASS_ELEMENT[p.classId] || '';
  if (el === 'Theo linh căn') el = p.linhCan?.main || CLASS_ELEMENT[p.classId] || ''; // chiêu "theo linh căn" lấy hệ chính của người tung
  return el;
}
// Hiệu ứng theo hệ — 1 hệ 1 rider, toàn số TẠM, toàn dùng cơ chế sẵn có.
// Kim xử lý riêng trước đòn (xuyên phòng) nên không có trong hàm này.
function applyElementRider(p, t, d, el, effDef) {
  const now = Date.now();
  // Rider lên BẢN THÂN (Mộc/Thổ/Quang/Ám) vẫn chạy kể cả khi đòn kết liễu;
  // rider lên QUÁI bỏ qua nếu quái đã chết vì đòn đó.
  if (el === 'Mộc') p.hp = Math.min(maxHpEff(p), p.hp + Math.round(d * 0.10));
  else if (el === 'Thổ') { // da đá: 5s giảm 20% sát thương nhận (mẫu defBuff của applySelfFx)
    if (now >= (p.defBuffUntil || 0) || 20 >= (p.defBuffPct || 0)) p.defBuffPct = 20;
    p.defBuffUntil = Math.max(p.defBuffUntil || 0, now + 5000);
  }
  else if (el === 'Quang') p.mp = Math.min(maxMpEff(p), p.mp + Math.round(d * 0.15));
  else if (el === 'Ám') p.hp = Math.min(maxHpEff(p), p.hp + Math.round(d * 0.15));
  else if (!t || t.hp <= 0) return;
  else if (el === 'Thủy') { initMonsterFx(t); if (now >= t.slowUntil || 30 >= t.slowPct) t.slowPct = 30; t.slowUntil = Math.max(t.slowUntil, now + 2000); }
  else if (el === 'Hỏa') { t.dots = (t.dots || []).filter((x) => !(x.burn && x.ownerId === p.id)); t.dots.push({ dps: 5, until: now + 3000, ownerId: p.id, burn: true }); }
  else if (el === 'Lôi') { if (Math.random() < 0.2) { initMonsterFx(t); t.stunUntil = Math.max(t.stunUntil, now + 1000); } }
  else if (el === 'Phong') { if (Math.random() < 0.2) hurtMonster(t, Math.round(d * 0.5), effDef, 'physical'); }
  else if (el === 'Băng') { initMonsterFx(t); if (now >= t.slowUntil || 100 >= t.slowPct) t.slowPct = 100; t.slowUntil = Math.max(t.slowUntil, now + 1500); }
  else if (el === 'Nham') { initMonsterFx(t); t.vulnPct = 20; t.vulnUntil = Math.max(t.vulnUntil, now + 5000); }
  else if (el === 'Độc') { t.dots = (t.dots || []).filter((x) => !(x.poison && x.ownerId === p.id)); t.dots.push({ dps: 5, until: now + 5000, ownerId: p.id, poison: true }); }
  // GĐ107: 3 hệ mới — toàn số TẠM, toàn dùng cơ chế sẵn có (như 7 hệ cũ).
  else if (el === 'Huyết') { // huyết sát: đòn phụ bằng 10% máu đã mất của chủ (qua giáp, hệ magic nên không bị giáp đá giảm); đầy máu thì không có đòn phụ — guard missing > 0 vì damageThrough floor 1 sẽ gây 1 dmg ma khi raw = 0
    const missing = maxHpEff(p) - p.hp;
    if (missing > 0) hurtMonster(t, Math.round(missing * 0.10), effDef, 'magic');
  }
  else if (el === 'Thời Gian') { // ngưng trệ: chậm 50%/3s (mạnh hơn Thủy 30%/2s, yếu hơn Băng đóng băng 100%)
    initMonsterFx(t); if (now >= t.slowUntil || 50 >= t.slowPct) t.slowPct = 50; t.slowUntil = Math.max(t.slowUntil, now + 3000);
  }
  else if (el === 'Không Gian') { // liệt phùng: 20% đòn phụ 50% sát thương, XUYÊN GIÁP (def = 0, hệ magic nên không bị giáp đá giảm) — khác Phong (50% qua giáp + giáp đá)
    if (Math.random() < 0.2) hurtMonster(t, Math.round(d * 0.5), 0, 'magic');
  }
}
function hitPlayer(p, rawDamage, type, source, chainDepth = 0, chainHit = null) {
  if (p.isBot || p.hp <= 0) return;
  // GĐ97: Sát Thủ — Phản Xạ (né bị động theo Sát Khí, cap 75%) + Siêu Giác
  // Quan (né tuyệt đối). Chỉ né đòn TỪ QUÁI (source có kind); sát thương môi
  // trường (hố lửa...) không né được, độc/chậm/choáng từ applyPlayerStatus
  // cũng không nằm ở đây. Đòn hụt KHÔNG phá buổi lĩnh ngộ (chưa "trúng"),
  // nhưng vẫn tính là đang giao tranh (quái vẫn bám theo, thiền vẫn bị chặn).
  if (p.classId === 'satthu' && source && source.kind) {
    const ult = ultActiveOf(p);
    const dodgePct = ult ? 100 : satKhiOf(p) * 0.75;
    if (Math.random() * 100 < dodgePct) {
      p.dodgeCount = (p.dodgeCount || 0) + 1;
      p.lastCombatAt = Date.now();
      if (!ult && Date.now() - (p.lastDodgeNoticeAt || 0) > 3000) {
        p.lastDodgeNoticeAt = Date.now();
        emitNoticeTo(p, '↯ Phản Xạ: né được đòn!');
      }
      return;
    }
  }
  // GĐ31/GĐ32: đang ngồi lĩnh ngộ mà BỊ ĐÁNH TRÚNG → văng, tiến độ VỀ 0
  breakLearning(p, true);
  // GĐ103: đang Thuyết Pháp mà BỊ ĐÁNH TRÚNG → ngắt (đòn bị né đã return ở trên nên không tính)
  if (p.preaching) stopPreaching(p, 'hit');
  if (p.studying) stopStudying(p, 'hit'); // GĐ105
  // GĐ70: trùm Hỗn Độn — mỗi đòn ngẫu nhiên 1 trong 5 hệ
  let effType = type;
  let rawEff = rawDamage;
  let bossElem = null;
  const srcMech = source && source.kind ? mechOf(source) : null;
  if (source && source.kind === 'hon_don_thu' && !source.illusion) {
    bossElem = ['fire', 'water', 'wood', 'metal', 'earth'][Math.floor(Math.random() * 5)];
    if (bossElem === 'fire') rawEff = rawDamage * 1.2;
    if (bossElem === 'metal') effType = 'magic'; // kim hệ xuyên Vật phòng → tính theo Pháp phòng
  }
  const def = effType === 'magic' ? effStatsOf(p).phapPhong : effStatsOf(p).vatPhong; // GĐ119: phòng hiệu dụng (gốc + đồ mặc)
  // GĐ34: buff giảm sát thương nhận đang hiệu lực
  let rawIn = rawEff;
  if (Date.now() < (p.defBuffUntil || 0)) rawIn *= 1 - (p.defBuffPct || 0) / 100;
  if (p.classId === 'thetu') rawIn *= 1 - rageRedOf(p); // GĐ95: Cương Kình — giảm dmg theo Nộ Khí (tới 30%)
  if (activeBuffsOf(p).taldef) rawIn *= 1 - 0.5; // GĐ136: Phù Kim Cang — sát thương nhận ×0,5
  let dmg = damageThrough(rawIn, def);
  // GĐ88: KIM ĐAN HỘ THỂ — Kim Đan tầng 7+ (Hậu Kỳ): máu xuống ≤30% thì tự
  // động bật hộ thể: giảm 50% sát thương nhận trong 10s, hồi 60s (TẠM).
  const maxHp88 = maxHpEff(p);
  if (Date.now() < (p.hoTheUntil || 0)) {
    dmg = Math.max(1, Math.round(dmg * 0.5));
  } else if (p.hp - dmg <= maxHp88 * 0.3 && p.hp - dmg > 0 && Date.now() >= (p.hoTheCdUntil || 0)
    && ((p.realm === 'kd' && (p.tier || 0) >= 7) || (REALM_ORDER[p.realm] ?? 0) > 3)) {
    const now88 = Date.now();
    p.hoTheUntil = now88 + 10000;
    p.hoTheCdUntil = now88 + 60000;
    dmg = Math.max(1, Math.round(dmg * 0.5));
    const sock88 = io.sockets.sockets.get(p.id);
    if (sock88) sock88.emit('notice', { text: '✦ Kim Đan Hộ Thể tự động kích hoạt — giảm 50% sát thương trong 10s!' });
  }
  p.hp -= dmg;
  // GĐ99: Kiếm Tu Kim Cương Kiếm — phản 30% sát thương nhận về quái tấn công (TẠM).
  // Chỉ phản đòn từ quái (source có kind), không phản đòn dây chuyền, không phản trùm
  // thử thách (tránh phá luồng thử thách); quái chết vì phản đòn xử lý như quái chết vì dot.
  if (p.classId === 'kiemtu' && swordOf(p) === 'kim_cuong' && source && source.kind && source.kind !== 'trial' && typeof source.hp === 'number' && chainDepth === 0) {
    hurtMonster(source, Math.round(dmg * 0.3), 0); // phản xuyên phòng (tính trên dmg đã nhận)
    if (source.hp <= 0) onMonsterKilled(null, p, source);
  }
  // GĐ95: Thể Tu — bị đánh trúng tích Nộ (+10, Bất khuất ×1.5); HP <20% kích Bất khuất.
  if (p.classId === 'thetu' && p.hp > 0) { addRage(p, 10); maybeTriggerUnyield(p); }
  p.lastCombatAt = Date.now(); // GĐ76: đồng hồ giao tranh cho thiền
  if (p.meditating) stopMeditation(p, 'hit');
  // GĐ70: hút máu / độc / chậm / choáng theo loài quái + sét dây chuyền (Lôi Điểu)
  if (source && typeof source.hp === 'number' && typeof source.maxHp === 'number' && srcMech?.lifesteal) {
    source.hp = Math.min(source.maxHp, source.hp + Math.round(dmg * srcMech.lifesteal));
  }
  if (source && source.kind) {
    if (srcMech?.poison) applyPlayerStatus(p, { poisonDps: srcMech.poison.dps, poisonSec: srcMech.poison.sec });
    if (srcMech?.slowOnHit) applyPlayerStatus(p, { slowPct: srcMech.slowOnHit.pct, slowSec: srcMech.slowOnHit.sec });
    if (bossElem === 'water') applyPlayerStatus(p, { slowPct: 40, slowSec: 3 });
    if (bossElem === 'wood') applyPlayerStatus(p, { poisonDps: 3, poisonSec: 4 });
    if (bossElem === 'earth') applyPlayerStatus(p, { stunSec: 0.5 });
    if (srcMech?.chain && chainDepth < srcMech.chain.jumps) {
      const hit = chainHit || new Set([p.id]);
      let next = null;
      let nextD = Infinity;
      for (const q of players.values()) {
        if (hit.has(q.id) || q.isOffline || q.isBot || mapOf(q) !== mapOf(p)) continue;
        if (Math.hypot(q.x - p.x, q.y - p.y) <= (srcMech.chain.radius || 150) && Math.hypot(q.x - p.x, q.y - p.y) < nextD) { next = q; nextD = Math.hypot(q.x - p.x, q.y - p.y); }
      }
      if (next) {
        hit.add(next.id);
        hitPlayer(next, rawDamage * Math.pow(srcMech.chain.falloff || 0.7, chainDepth + 1), 'magic', source, chainDepth + 1, hit);
      }
    }
  }
  // GĐ34: phản sát thương — quái đánh trúng người đang có buff phản thì ăn lại
  if (source && typeof source.hp === 'number' && Date.now() < (p.reflectUntil || 0) && p.reflectPct) {
    hurtMonster(source, (rawDamage * p.reflectPct) / 100, source.def ?? WOLF.def); // GĐ38
    if (source.hp <= 0) onMonsterKilled(null, p, source);
  }
  console.log(`[combat] ${source.id} cắn ${p.name}: -${dmg} HP (còn ${Math.max(0, Math.round(p.hp))}/${maxHpEff(p)})`);
  if (p.hp <= 0) {
    if (p.isCotVuong) { breakCotVuongCore(p); return; } // GĐ101: pet chết = vỡ Hạch Tâm, không hồi sinh kiểu người chơi
    if (p.isQuyHon) { breakQuyHon(p); return; } // GĐ102: pet chết = phản phệ, không hồi sinh kiểu người chơi
    if (p.isTamed) { breakTamed(p); return; } // GĐ137: thú thuần hóa chết = mất hẳn, thuần hóa con khác
    if (isDownable(p)) { enterDowned(p, source); return; } // GĐ104: người chơi thật gục ngã chờ cứu, không về làng ngay
    handlePlayerDeath(p, source);
  } else persistPlayer(p);
}
// ------------------------- Kết nối người chơi -------------------------
// ================= GĐ60: LUẬT ĐI LẠI LIÊN MAP (người chơi chốt 24/10) =====
// - Mọi map có Trận Dịch Chuyển, nhưng TỐN NHIỀU LINH THẠCH (về làng/thành
//   miễn phí; đang hộ tống tới đúng đích cũng miễn phí).
// - Kim Đan NGỰ KIẾM: miễn phí nhưng CHẬM (tính theo số chặng qua hub).
// - Đảo ngoài biển: trận không tới được — ĐI THUYỀN tuyến thành ↔ đảo
//   (chậm), hoặc ngự kiếm nếu đã Kim Đan.
// - Luyện Khí / Trúc Cơ kiếm Linh thạch + đi lại bằng HỘ TỐNG THƯƠNG NHÂN.
const TRAVEL_COST_BY_ORDER = { 0: 0, 1: 50, 2: 150, 3: 400, 4: 900, 5: 1600 }; // theo cảnh giới của map đích (TẠM)
const BOAT_ONLY = new Set(['tham_hai_bi_canh']); // đảo biển sâu — chỉ thuyền / ngự kiếm
const JOURNEY_UNIT_MS = Number(process.env.TTT_JOURNEY_MS) > 0 ? Number(process.env.TTT_JOURNEY_MS) : 15000; // 1 chặng ngự kiếm (móc kiểm thử: TTT_JOURNEY_MS)
let lastHazardMs60 = 0;
function journeyHops(from, to) {
  if (from === to) return 0;
  if (from === 'thanh_van_thanh' || to === 'thanh_van_thanh') return 1;
  if (from === HOME_MAP || to === HOME_MAP) return 2;
  return 2;
}
function travelCostFor(p, destId) {
  if (destId === HOME_MAP) return 0; // về làng: luôn miễn phí (chống kẹt)
  if (destId === 'thanh_van_thanh' && mapOf(p) !== HOME_MAP) return 0; // từ map xa về thành: miễn phí; làng → thành vẫn phí 50 như map LK
  if (p.escort && (destId === p.escort.dest || destId === 'thanh_van_thanh')) return 0; // đang hộ tống: cả chặng qua thành lẫn tới map đích đều miễn phí
  const def = MAP_DEFS.get(destId);
  return TRAVEL_COST_BY_ORDER[REALM_ORDER[def?.minRealm || 'pham'] ?? 0] ?? 50;
}
function startJourney(socket, p, dest, method) {
  const hops = Math.max(1, journeyHops(mapOf(p), dest));
  const ms = method === 'boat' ? Math.round((JOURNEY_UNIT_MS * 4) / 3) * hops : JOURNEY_UNIT_MS * hops;
  p.journey = { dest, method, arriveAt: Date.now() + ms };
  socket.emit('journey_started', { dest, name: MAP_DEFS.get(dest)?.name || dest, method, seconds: Math.round(ms / 1000) });
}
// HỘ TỐNG: nhận ở Lái Buôn (cạnh Trận làng) — thương nhân đi theo như đồng
// hành (không đánh nhau), bị quái phục kích ở map đích; đưa người + hàng
// tới ĐIỂM GIAO (giữa map đích) là xong, thưởng Linh thạch + Tu vi.
const ESCORT_REWARD = { 1: { stones: 80, tuVi: 8 }, 2: { stones: 160, tuVi: 16 }, 3: { stones: 260, tuVi: 30 }, 4: { stones: 400, tuVi: 45 }, 5: { stones: 600, tuVi: 60 } }; // theo cảnh giới map đích (TẠM)
function escortDestinationsFor(p) {
  return [...MAP_DEFS.values()]
    .filter((d) => !d.safe && d.id !== HOME_MAP && d.id !== 'thach_lam' && d.id !== 'bai_farm' && d.id !== 'thanh_van_thanh' && !BOAT_ONLY.has(d.id) && canEnterGate(p, d))
    .sort((a, b) => (REALM_ORDER[a.minRealm] - REALM_ORDER[b.minRealm]) || ((a.minTier || 0) - (b.minTier || 0)) || a.name.localeCompare(b.name, 'vi'))
    .map((d) => ({ id: d.id, name: d.name, category: d.category, reward: ESCORT_REWARD[REALM_ORDER[d.minRealm] ?? 1] || ESCORT_REWARD[1] }));
}
function escortInfoFor(p) {
  return {
    active: p.escort ? { dest: p.escort.dest, destName: MAP_DEFS.get(p.escort.dest)?.name || p.escort.dest } : null,
    missions: p.escort ? [] : escortDestinationsFor(p),
  };
}
function spawnEscortMerchant(p) {
  const stats = { khiHuyet: 40, vatCong: 5, vatPhong: 25, phapCong: 5, phapPhong: 25, tocDo: 20, thanThuc: 10 };
  const c = {
    id: `escort-${p.id}`, x: p.x + 36, y: p.y + 10, vx: 0, vy: 0, input: { vx: 0, vy: 0 }, direction: 'down',
    isBot: false, isCompanion: true, isEscortMerchant: true, ownerId: p.id, ownerKey: p.charKey, mapId: mapOf(p),
    name: 'Thương Nhân (đang hộ tống)', classId: 'nhotu', stats, hp: maxHpOf(stats), mp: maxMpOf(stats),
    robe: null, gender: 'nam', weaponId: null, realm: p.realm || 'pham', tier: p.tier || 0, lastAttackAt: 0,
    followDx: 36, followDy: 10,
  };
  players.set(c.id, c);
  return c;
}
function failEscort(merchant) {
  const owner = players.get(merchant.ownerId);
  if (!owner || !owner.escort) return;
  owner.escort = null;
  const sock = io.sockets.sockets.get(owner.id);
  if (sock) {
    sock.emit('escort_failed', {});
    sock.emit('notice', { text: '💀 Thương nhân đã gục ngã — nhiệm vụ hộ tống THẤT BẠI. Về gặp Lái Buôn nhận chuyến khác.' });
    syncChar(sock, owner);
  }
  console.log(`[hộ tống] ${owner.name}: thương nhân gục — thất bại`);
}
function completeEscort(p) {
  const esc = p.escort; if (!esc) return;
  p.escort = null;
  players.delete(esc.merchantId);
  p.stones = (p.stones || 0) + esc.reward.stones;
  p.tuVi = (p.tuVi || 0) + esc.reward.tuVi;
  if (p.counters) p.counters.totalTuVi = (p.counters.totalTuVi || 0) + esc.reward.tuVi;
  // GĐ127: nhiệm vụ hộ tống tới đúng map đích thì xong (trả tại người giao sau).
  for (const [qid, def] of Object.entries(QUESTS)) {
    if (def.kind !== 'escort' || def.destMap !== esc.dest) continue;
    const q = p.quests?.[qid];
    if (q && q.state === 'active') {
      q.state = 'done';
      const sock = io.sockets.sockets.get(p.id);
      if (sock) sock.emit('notice', { text: `✔ Hoàn thành “${def.name}” — về gặp ${questNpcName(def.npcId) || 'người giao nhiệm vụ'} trả nhiệm vụ!` });
    }
  }
  persistPlayer(p);
  const sock = io.sockets.sockets.get(p.id);
  if (sock) {
    sock.emit('escort_done', { destName: MAP_DEFS.get(esc.dest)?.name || esc.dest, stones: esc.reward.stones, tuVi: esc.reward.tuVi });
    sock.emit('notice', { text: `🎉 Hộ tống thành công! Thương nhân thưởng ${esc.reward.stones} Linh thạch + ${esc.reward.tuVi} Tu vi.` });
    syncChar(sock, p);
  }
  console.log(`[hộ tống] ${p.name}: giao hàng xong tới ${esc.dest} (+${esc.reward.stones} LT)`);
}

// GĐ59: danh sách đích dịch chuyển từ map hiện tại của người chơi (đồ thị
// theo MapData: mọi nơi nối về Thanh Vân Thành; thành nối đi khắp nơi).
function destinationsFor(p) {
  const cur = mapOf(p);
  const entry = (def, sectGate) => {
    if (!def) return null;
    if (sectGate) {
      const ok = isOldSectMember(p); // GĐ79: chỉ 2 tông cũ
      return { id: def.id, name: def.name, category: def.category, safe: !!def.safe, canEnter: ok, needText: ok ? '' : 'Chỉ đệ tử Thiên Kiếm Môn / Huyền Thiên Tông' };
    }
    const ok = canEnterGate(p, def);
    const hops = journeyHops(cur, def.id);
    return {
      id: def.id, name: def.name, category: def.category, safe: !!def.safe, canEnter: ok, needText: ok ? '' : gateTextOf(def),
      cost: travelCostFor(p, def.id), boatOnly: BOAT_ONLY.has(def.id), // GĐ60
      flySec: Math.round((JOURNEY_UNIT_MS / 1000) * hops), boatSec: Math.round(((JOURNEY_UNIT_MS * 4) / 3000) * hops),
    };
  };
  const city = MAP_DEFS.get('thanh_van_thanh');
  const realm = MAP_DEFS.get('thach_lam');
  const home = MAP_DEFS.get(HOME_MAP);
  if (cur === HOME_MAP) return [entry(city), entry(realm, true)].filter(Boolean);
  if (cur === 'thanh_van_thanh') {
    const list = [entry(home)];
    const rest = [...MAP_DEFS.values()].filter((d) => d.id !== HOME_MAP && d.id !== 'thanh_van_thanh' && d.id !== 'thach_lam' && d.id !== 'bai_farm');
    rest.sort((a, b) => (REALM_ORDER[a.minRealm] - REALM_ORDER[b.minRealm]) || ((a.minTier || 0) - (b.minTier || 0)) || a.name.localeCompare(b.name, 'vi'));
    for (const d of rest) list.push(entry(d));
    list.push(entry(realm, true));
    return list.filter(Boolean);
  }
  return [entry(city)].filter(Boolean);
}
// GĐ59: chuyển người chơi sang map khác (cả đồng hành), đổi phòng đồng bộ,
// nạp lại toàn cảnh của map đích cho client.
function switchPlayerMap(socket, p, destId, pos) {
  const old = mapOf(p);
  p.flying = false; // GĐ88: dịch chuyển là hạ xuống đất
  p.mapId = destId; p.x = pos.x; p.y = pos.y; p.vx = 0; p.vy = 0;
  if (p.input) { p.input.vx = 0; p.input.vy = 0; }
  for (const q of players.values()) if (q.isCompanion && q.ownerId === p.id) { q.mapId = destId; q.x = pos.x + 28; q.y = pos.y + 12; q.vx = 0; q.vy = 0; }
  // GĐ60: tới map đích của chuyến hộ tống → quái phục kích gần điểm tới
  if (p.escort && destId === p.escort.dest && !p.escort.ambushDone) {
    p.escort.ambushDone = true;
    const spKind = (MAP_SPAWNS.find((s) => s.mapId === destId) || {}).kind;
    if (spKind) {
      for (let i = 0; i < 2; i++) {
        const mm = spawnMonster(spKind, destId);
        if (mm) {
          mm.x = pos.x + (i ? 175 : -155); mm.y = pos.y + (i ? -70 : 95);
          if (hitsObstacleIn(destId, mm.x, mm.y, 20)) { mm.x = pos.x; mm.y = pos.y - 130; }
          mm.hidden = false;
        }
      }
    }
    if (socket) socket.emit('notice', { text: '⚠ Quái phục kích đoàn hộ tống — bảo vệ thương nhân, đưa ông ta tới điểm giao hàng ở giữa bản đồ!' });
  }
  if (socket) {
    if (old !== destId) { socket.leave('map:' + old); socket.join('map:' + destId); }
    socket.emit('map_enter', mapEnterPayload(destId));
    emitFull(socket, destId);
    syncChar(socket, p);
  }
  persistPlayer(p);
}

io.on('connection', (socket) => {
  // GĐ6: kết nối socket CHƯA phải người chơi. Client gửi 'hello' kèm token:
  // - Đã có nhân vật → vào thẳng thế giới (welcome kèm dữ liệu nhân vật)
  // - Chưa có → 'need_character', client hiện màn hình tạo nhân vật:
  //   bốc chỉ số (request_roll, tối đa 3 lượt — server giữ kết quả, client
  //   không tự khai chỉ số) → create_character {token, name, classId}
  let player = null;
  let myToken = null;
  let myAccount = null; // GĐ10: tên tài khoản (khóa thường) nếu đã đăng nhập
  let pendingRoll = null;
  let rollsUsed = 0;
  console.log(`[.] Socket kết nối: ${socket.id} — chờ hello`);

  const validToken = (t) => typeof t === 'string' && t.length >= 8 && t.length <= 64;

  socket.on('hello', (data) => {
    if (player) return;
    // GĐ10: hello kèm phiên đăng nhập → chế độ tài khoản: gửi danh sách
    // nhân vật để client chọn, chưa vào thế giới ngay.
    if (data && typeof data.session === 'string' && data.session) {
      const username = sessions.get(data.session);
      if (username) {
        myAccount = username;
        sendCharList(socket, username);
        return;
      }
      socket.emit('auth_expired', {});
      return;
    }
    const token = data && validToken(data.token) ? data.token : null;
    if (!token) {
      socket.emit('need_character', {});
      return;
    }
    myToken = token;
    const char = characters[token];
    if (char && char.dead) {
      // GĐ25: nhân vật đã tọa hóa vĩnh viễn → về màn hình tạo nhân vật mới
      socket.emit('character_died', { name: char.name, message: `${char.name} đã tọa hóa vĩnh viễn (hết thọ nguyên). Hãy tạo nhân vật mới để bắt đầu kiếp tu mới.` });
      socket.emit('need_character', {});
      return;
    }
    if (char && CLASSES[char.classId] && char.stats) {
      player = spawnFromCharacter(socket, token, char);
      if (!player) return; // GĐ25: vừa tọa hóa trong lúc vào game (đã báo client)
      socket.emit('welcome', { id: socket.id, character: characterPayload(player) });
      emitFull(socket, mapOf(player)); // bản FULL riêng cho client mới vào (delta A+B) — GĐ59: theo map
      console.log(`[+] ${char.name} (${CLASSES[char.classId].name}) trở lại — tổng ${players.size} player`);
    } else {
      socket.emit('need_character', {});
    }
  });

  socket.on('request_roll', () => {
    if (player || rollsUsed >= 3) return;
    rollsUsed++;
    pendingRoll = rollStats();
    // Lượt bốc thứ 3: đảm bảo tổng không dưới 10 (đúng luật file thiết kế)
    if (rollsUsed === 3 && statTotal(pendingRoll) < 10) {
      let guard = 0;
      while (statTotal(pendingRoll) < 10 && guard++ < 50) {
        const k = STAT_KEYS[Math.floor(Math.random() * STAT_KEYS.length)];
        if (pendingRoll[k] < 10) pendingRoll[k]++;
      }
    }
    socket.emit('roll_result', { stats: pendingRoll, rollsUsed, rollsLeft: 3 - rollsUsed });
  });

  socket.on('create_character', (data) => {
    if (player || !data) return;
    const name = typeof data.name === 'string' ? data.name.trim().slice(0, 16) : '';
    if (name.length < 2 || !CLASSES[data.classId]) {
      socket.emit('create_error', { message: 'Tên cần 2–16 ký tự và phải chọn lớp.' });
      return;
    }
    const char = {
      name,
      classId: data.classId,
      stats: pendingRoll || rollStats(),
      createdAt: new Date().toISOString(),
      // GĐ7: khởi đầu là Phàm nhân, chưa đo linh căn
      freePoints: FREE_POINTS_START,
      statPoints: 0,
      linhCan: null,
      realm: 'pham',
      tier: 0,
      tuVi: 0,
      flags: {}, // GĐ40
      merchantOrder: null, caseCulprit: null, caseClues: {}, // GĐ40+
      skills: [],
      // GĐ8
      stones: 0,
      inventory: {},
      quests: {},
      // GĐ24: thiện cảm NPC bắt đầu 0 (đúng file)
      affinity: {},
      affTalk: {},
      // GĐ26: chưa học nghề phụ
      job: null,
      merit: 0, boardQuests: 0, letterGiven: false, sect: null, sectTrialPassed: false, learning: null, // GĐ30+31
      equipped: [], // GĐ36
      boards: null, activeBoard: 0, // GĐ37
      // GĐ27: số liệu thành tựu
      counters: {},
      achClaimed: [],
      // GĐ20: tuổi + tuổi thọ roll đúng khoảng của file (tuổi 10–25, thọ 50–100),
      // sinh vào ngày thế giới hiện tại
      ageStart: rollAgeStart(),
      lifespan: rollLifespan(),
      graceStartDay: null, // GĐ25
      birthDay: worldClock().dayIndex,
      lastDayIndex: worldClock().dayIndex,
      // GĐ21: chưa học Tọa Thiền. GĐ22: con đường khởi đầu do người chơi chọn —
      // 'solo' (một mình, thưởng 100%, nghỉ tại Đạo Quán) hoặc 'sect' (Thanh
      // Phong Môn: 2 đồng môn AI 70%, thưởng ×2/3, nghỉ tại tông môn)
      meditation: false,
      restState: null,
      path: data.path === 'sect' ? 'sect' : 'solo',
      homeType: data.path === 'sect' ? 'tongmon' : 'daoquan',
      // GĐ10: tùy chỉnh ngoại hình lúc tạo
      robe: validRobe(data.robe),
      gender: validGender(data.gender),
      // GĐ11: vũ khí khởi đầu — phải thuộc lớp đã chọn, sai thì lấy vũ khí đầu
      weaponId: weaponOf(data.classId, data.weaponId)?.id || null,
    };
    char.hp = maxHpEff(char);
    char.mp = maxMpEff(char);
    if (myAccount) {
      // Chế độ tài khoản: nhân vật gắn vào tài khoản, khóa charId riêng
      if (accountChars(myAccount).length >= MAX_CHARS_PER_ACCOUNT) {
        socket.emit('create_error', { message: `Tài khoản tối đa ${MAX_CHARS_PER_ACCOUNT} nhân vật.` });
        return;
      }
      const charId = 'acc-' + crypto.randomBytes(6).toString('hex');
      char.account = myAccount;
      characters[charId] = char;
      saveCharacters();
      player = spawnFromCharacter(socket, charId, char);
    } else {
      const token = validToken(data.token) ? data.token : myToken;
      if (!token) {
        socket.emit('create_error', { message: 'Thiếu mã định danh trình duyệt.' });
        return;
      }
      if (characters[token] && !characters[token].dead) {
        socket.emit('create_error', { message: 'Trình duyệt này đã có nhân vật rồi.' });
        return;
      }
      // GĐ25: nhân vật cũ đã tọa hóa → cho tạo nhân vật mới đè lên hồ sơ cũ
      characters[token] = char;
      saveCharacters();
      myToken = token;
      player = spawnFromCharacter(socket, token, char);
    }
    socket.emit('welcome', { id: socket.id, character: characterPayload(player) });
    emitFull(socket, mapOf(player)); // bản FULL riêng cho client mới vào (delta A+B) — GĐ59: theo map
    console.log(`[+] Nhân vật mới: ${name} (${CLASSES[char.classId].name}) — tổng chỉ số ${statTotal(char.stats)}`);
  });

  // ---- GĐ10: tài khoản + chọn nhân vật ----
  const validUsername = (u) => typeof u === 'string' && /^[A-Za-z0-9_]{3,20}$/.test(u);
  const validPassword = (pw) => typeof pw === 'string' && pw.length >= 6 && pw.length <= 64;

  socket.on('auth_register', (data) => {
    if (player || !data || !validUsername(data.username) || !validPassword(data.password)) {
      socket.emit('auth_error', { message: 'Tên tài khoản 3–20 ký tự (chữ, số, _) và mật khẩu 6–64 ký tự.' });
      return;
    }
    const key = data.username.toLowerCase();
    if (accounts[key]) {
      socket.emit('auth_error', { message: 'Tên tài khoản đã có người dùng.' });
      return;
    }
    const salt = crypto.randomBytes(16).toString('hex');
    accounts[key] = { name: data.username, salt, hash: hashPassword(data.password, salt), createdAt: new Date().toISOString() };
    saveAccounts();
    myAccount = key;
    const session = newSession(key);
    socket.emit('auth_result', { ok: true, session, username: accounts[key].name });
    sendCharList(socket, key);
    console.log(`[auth] Đăng ký mới: ${accounts[key].name}`);
  });

  socket.on('auth_login', (data) => {
    if (player || !data || typeof data.username !== 'string' || typeof data.password !== 'string') {
      socket.emit('auth_error', { message: 'Thiếu tên tài khoản hoặc mật khẩu.' });
      return;
    }
    const key = data.username.toLowerCase();
    const acc = accounts[key];
    if (!acc || hashPassword(data.password, acc.salt) !== acc.hash) {
      socket.emit('auth_error', { message: 'Sai tên tài khoản hoặc mật khẩu.' });
      return;
    }
    myAccount = key;
    const session = newSession(key);
    socket.emit('auth_result', { ok: true, session, username: acc.name });
    sendCharList(socket, key);
    console.log(`[auth] Đăng nhập: ${acc.name}`);
  });

  socket.on('auth_logout', (data) => {
    if (data && typeof data.session === 'string' && sessions.delete(data.session)) saveSessions();
    if (myAccount) console.log(`[auth] Đăng xuất: ${myAccount}`);
    myAccount = null;
    socket.emit('logged_out', {});
  });

  socket.on('select_character', (data) => {
    if (player || !myAccount || !data || typeof data.charId !== 'string') return;
    const char = characters[data.charId];
    if (!char || char.account !== myAccount || !CLASSES[char.classId] || !char.stats) {
      socket.emit('auth_error', { message: 'Không tìm thấy nhân vật thuộc tài khoản này.' });
      return;
    }
    if (char.dead) {
      socket.emit('character_died', { name: char.name, message: `${char.name} đã tọa hóa vĩnh viễn (hết thọ nguyên).` });
      sendCharList(socket, myAccount);
      return;
    }
    player = spawnFromCharacter(socket, data.charId, char);
    if (!player) return; // GĐ25: nhân vật vừa tọa hóa (đã báo client)
    socket.emit('welcome', { id: socket.id, character: characterPayload(player) });
    emitFull(socket, mapOf(player)); // GĐ59: theo map
    console.log(`[+] ${char.name} (${CLASSES[char.classId].name}) vào game bằng tài khoản — tổng ${players.size} player`);
  });

  socket.on('delete_character', (data) => {
    if (player || !myAccount || !data || typeof data.charId !== 'string') return;
    const char = characters[data.charId];
    if (!char || char.account !== myAccount) return;
    delete characters[data.charId];
    saveCharacters();
    console.log(`[auth] ${myAccount} đã xóa nhân vật ${char.name}`);
    sendCharList(socket, myAccount);
  });

  // Đổi màu áo trong game (menu Tùy chỉnh) — áp ngay + lưu lại
  socket.on('set_robe', (data) => {
    if (!player || !data) return;
    if (data.robe !== null && !validRobe(data.robe)) return;
    player.robe = data.robe === null ? null : data.robe;
    persistPlayer(player);
    syncChar(socket, player);
  });

  // Nhận vector điều khiển từ client của chính socket này.
  // Chỉ nhận số hữu hạn và kẹp mỗi thành phần về [-1, 1].
  socket.on('client_input', (data) => {
    if (!player || !data) return;
    const clamp = (n) => {
      n = Number(n);
      if (!Number.isFinite(n)) return 0;
      return Math.max(-1, Math.min(1, n));
    };
    player.input.vx = clamp(data.vx);
    player.input.vy = clamp(data.vy);
    // GĐ60: đang ngự kiếm / trên thuyền mà di chuyển → hủy hành trình
    if (player.journey && (player.input.vx !== 0 || player.input.vy !== 0)) {
      player.journey = null;
      socket.emit('journey_cancelled', {});
      socket.emit('notice', { text: 'Đã hủy hành trình — bạn ở lại nơi này.' });
    }
    // GĐ76: di chuyển là dứt thiền
    if (player.meditating && (player.input.vx !== 0 || player.input.vy !== 0)) stopMeditation(player, 'move');
    // GĐ103: di chuyển là ngắt Thuyết Pháp
    if (player.preaching && (player.input.vx !== 0 || player.input.vy !== 0)) stopPreaching(player, 'move');
    if (player.studying && (player.input.vx !== 0 || player.input.vy !== 0)) stopStudying(player, 'move'); // GĐ105
  });

  // GĐ76: NGỒI THIỀN — chỉ được ngồi sau 5s không gây/nhận sát thương;
  // ngồi yên hồi máu + chân nguyên từ từ; mọi hành động giao tranh ngắt thiền.
  socket.on('meditate_toggle', () => {
    if (!player) return;
    if (player.hp <= 0) return; // GĐ104: đang gục ngã thì không ngồi thiền được
    if (player.meditating) { stopMeditation(player, 'toggle'); return; }
    if (player.bequan) { socket.emit('interact_error', { message: 'Đang bế quan rồi.' }); return; }
    if (player.learningActive) { socket.emit('interact_error', { message: 'Đang lĩnh ngộ, không thiền được.' }); return; }
    if (Date.now() - (player.lastCombatAt || 0) < MEDITATE_COMBAT_MS) {
      socket.emit('interact_error', { message: 'Đang giao tranh — rời giao tranh 5s mới ngồi thiền được.' });
      return;
    }
    if (player.flying) { player.flying = false; socket.emit('fly_state', { on: false }); } // GĐ88: ngồi thiền là hạ xuống đất
    player.meditating = true;
    player.meditAcc = 0;
    socket.emit('meditate_state', { on: true });
    socket.emit('notice', { text: '🧘 Bạn ngồi xuống thiền — hồi máu + chân nguyên từ từ.' });
    if (!needsKd(player) && ((player.food ?? 100) <= 0 || (player.water ?? 100) <= 0)) socket.emit('notice', { text: '⚠ Đang đói/khát kiệt sức — thiền lúc này không hồi máu/chân nguyên, ăn uống trước đã.' }); // GĐ78
  });

  // GĐ88: NGỰ KIẾM PHI HÀNH (Sơ Kỳ Kim Đan 1–3 đã bay được) — bật/tắt bay
  // tự do trên map: tốc độ ×1.5, bỏ qua vật cản. Bay là trạng thái tạm
  // (không lưu file): chết / dịch chuyển / ngồi thiền đều hạ xuống đất.
  socket.on('fly_toggle', () => {
    if (!player) return;
    if ((REALM_ORDER[player.realm || 'pham'] ?? 0) < 3) { socket.emit('interact_error', { message: 'Chỉ tu sĩ Kim Đan mới ngự kiếm phi hành được.' }); return; }
    if (player.meditating) { socket.emit('interact_error', { message: 'Đang thiền — đứng dậy rồi hãy ngự kiếm.' }); return; }
    if (player.learningActive) { socket.emit('interact_error', { message: 'Đang lĩnh ngộ, không ngự kiếm được.' }); return; }
    if (player.bequan) { socket.emit('interact_error', { message: 'Đang bế quan rồi.' }); return; }
    player.flying = !player.flying;
    socket.emit('fly_state', { on: !!player.flying });
    socket.emit('notice', { text: player.flying ? '🕊️ Bạn ngự kiếm bay lên — tốc độ ×1.5, bỏ qua vật cản (phím F để hạ xuống).' : '🕊️ Bạn hạ xuống đất.' });
  });

  // GĐ46: NÉ — client gửi hướng muốn vọt (thường là hướng đang di
  // chuyển); đứng yên thì server dùng hướng nhân vật đang quay mặt.
  socket.on('dodge', (data) => {
    if (!player || player.isBot) return;
    if (player.hp <= 0) return; // GĐ128: đang gục ngã thì không né được
    const now = Date.now();
    if (now < (player.dodgeCdUntil || 0)) return;
    if (now < (player.stunUntil || 0)) return; // GĐ70: đang choáng thì không né được
    if (player.meditating) stopMeditation(player, 'dodge'); // GĐ76: né là dứt thiền
    const clamp = (n) => {
      n = Number(n);
      if (!Number.isFinite(n)) return 0;
      return Math.max(-1, Math.min(1, n));
    };
    let vx = clamp(data && data.vx);
    let vy = clamp(data && data.vy);
    if (vx === 0 && vy === 0) {
      const DV = { down: [0, 1], up: [0, -1], left: [-1, 0], right: [1, 0] };
      const d = DV[player.direction] || DV.down;
      vx = d[0];
      vy = d[1];
    }
    const len = Math.hypot(vx, vy) || 1;
    player.dodgeVx = vx / len;
    player.dodgeVy = vy / len;
    player.dodgeUntil = now + DODGE_MS;
    player.dodgeCdUntil = now + DODGE_CD_MS;
  });

  // Tấn công (Space): sát thương theo công thức file thiết kế —
  // thô = 0.85 × (Công + 10), trừ theo phòng của quái; hồi chiêu giảm theo CDR.
  socket.on('player_attack', () => {
    if (!player) return;
    if (player.hp <= 0) return; // GĐ104: đang gục ngã thì không ra đòn được
    if (Date.now() < (player.stunUntil || 0)) return; // GĐ70: đang choáng thì không ra đòn được
    if (player.bequan) setBequan(player, false); // GĐ23: ra đòn là dứt bế quan
    if (player.learningActive) breakLearning(player, false); // GĐ32: ra đòn là phá lĩnh ngộ (về 0)
    if (player.meditating) stopMeditation(player, 'attack'); // GĐ76: ra đòn là dứt thiền
    // GĐ11: nhịp đánh thường theo TỐC ĐỘ VŨ KHÍ (file thiết kế: Nhanh 0,5s /
    // Trung bình 0,8s / Chậm 1,4s). Hệ số mỗi đòn tỉ lệ với hồi chiêu theo
    // đúng nguyên tắc của file — vũ khí nhanh yếu, chậm mạnh, sát thương mỗi
    // giây gần bằng nhau (chuẩn hoá quanh mức Trung bình đang dùng).
    const weapon = weaponOf(player.classId, player.weaponId);
    const speedK = weapon ? WEAPON_SPEED_SEC[weapon.speed] / WEAPON_SPEED_SEC.trung : 1;
    const now = Date.now();
    const cd = ATTACK_COOLDOWN_MS * speedK * (1 - cdrOf(effStatsOf(player))) * (swordOf(player) === 'thanh_phong' ? 0.8 : 1); // GĐ99: Thanh Phong Kiếm đánh nhanh hơn 20% (TẠM)
    if (now - (player.lastAttackAt || 0) < cd) return;
    player.lastAttackAt = now;
    player.lastCombatAt = now; // GĐ76: ra đòn = giao tranh

    let target = null;
    let targetDist = Infinity;
    for (const m of monsters.values()) {
      if (m.kind === 'trial' && m.ownerId !== player.id) continue; // GĐ19: trùm thử thách của người khác — không đánh được
      if (mapOf(m) !== mapOf(player)) continue; // GĐ59: không đánh xuyên map
      if (m.hidden) continue; // GĐ60: quái đang ẩn nấp — không thấy mà đánh
      if (insideRealm(m.x, m.y) !== insideRealm(player.x, player.y)) continue; // GĐ57: không đánh xuyên vách bí cảnh
      const d = Math.hypot(m.x - player.x, m.y - player.y);
      if (d < targetDist) {
        targetDist = d;
        target = m;
      }
    }
    const range = (weapon && weapon.ranged ? ATTACK_RANGE_RANGED : ATTACK_RANGE) * rangeMulOf(player); // GĐ88: Thần Thức Ngoại Phóng +20% tầm (KD4+)
    if (!target || targetDist > range) return; // đánh hụt — không có quái trong tầm

    // GĐ70: quái né chiêu cao (Huyễn Ảnh Miêu) — né được thì đòn này hụt hẳn
    const mechA = mechOf(target);
    if (mechA?.dodge && Math.random() < mechA.dodge) {
      io.emit('player_attacked', { id: player.id, targetId: target.id });
      socket.emit('notice', { text: `${target.name} né được đòn của bạn!` });
      return;
    }
    const atk = attackStatOf(player);
    // GĐ95: Thể Tu đầy Nộ — đòn thường + Vật phòng × 0.5 (cộng thẳng, không nhân hệ số vũ khí).
    const rageBonus = player.classId === 'thetu' && rageOf(player) >= 100 ? (player.stats.vatPhong || 0) * 0.5 : 0;
    // GĐ97: Sát Thủ Siêu Giác Quan — chí mạng ×2 (crit nhân phần gốc, không nhân bonus phẳng).
    const dmg = hurtMonster(target, BASIC_COEF * speedK * atkMulOf(player) * (atk.value + 10) * critMulOf(player) * kiemDmgMulOf(player) + rageBonus, target.def ?? WOLF.def, atk.type, nhoDmgMulOf(player) * tranDmgMulOf(player)); // GĐ38: def theo loài; GĐ70: loại sát thương cho giáp đá; GĐ99: Kiếm Vực/Ultimate nhân sát thương; GĐ105: Ý Cảnh Nghĩa Bạc nhân dmg; GĐ135: Trận Cường Công nhân dmg
    if (player.classId === 'thetu') addRage(player, 6); // GĐ95: đánh trúng tích Nộ
    if (player.classId === 'satthu') addSatKhi(player, SATKHI_HIT); // GĐ97: đánh trúng tích Sát Khí
    if (player.classId === 'satthu') applyCoatingOnHit(player, target); // GĐ98: đòn trúng bôi độc / kích thích
    if (player.classId === 'kiemtu') addNgoKiem(player, NGOKIEM_HIT); // GĐ99: đánh trúng tích Ngộ Kiếm
    if (player.classId === 'quytu') addHonKhi(player, HONKHI_HIT); // GĐ102: đòn trúng tích Hồn Khí
    if (player.classId === 'kiemtu') applySwordOnHit(player, target, dmg); // GĐ99: đòn trúng kích hiệu ứng kiếm
    if (player.classId === 'kiemtu' && vucActiveOf(player)) player.hp = Math.min(maxHpEff(player), player.hp + Math.round(dmg * 0.3)); // GĐ99: Kiếm Vực hút 30% sát thương gây ra (TẠM)
    if (player.nextAtkMul) player.nextAtkMul = 0; // GĐ34: đòn kế tiếp đã dùng
    io.emit('player_attacked', { id: player.id, targetId: target.id }); // GĐ9: cho client khác phát tư thế ra đòn
    console.log(`[combat] ${player.name} đánh ${target.id}: -${dmg} (${atk.type}) — HP quái còn ${Math.max(0, target.hp)}/${target.maxHp}`);
    if (target.hp <= 0) onMonsterKilled(socket, player, target);
  });

  // GĐ99: Kiếm Tu — kích Ultimate Nhân Kiếm Hợp Nhất khi Ngộ Kiếm đầy 100. Bấm chủ động
  // (không tự bật như Siêu Giác Quan vì buff dài 10 phút thực); kích xong Ngộ Kiếm về 0.
  socket.on('kiem_ult', () => {
    if (!player) return;
    if (player.classId !== 'kiemtu') { socket.emit('interact_error', { message: 'Nhân Kiếm Hợp Nhất là tuyệt kỹ riêng của Kiếm Tu.' }); return; }
    if (kiemUltActiveOf(player)) { socket.emit('interact_error', { message: 'Nhân Kiếm Hợp Nhất đang hiệu lực.' }); return; }
    if (ngoKiemOf(player) < 100) { socket.emit('interact_error', { message: `Cần Ngộ Kiếm đầy 100 mới hợp nhất (đang ${ngoKiemOf(player)}).` }); return; }
    classResOf(player).ngoKiem = 0;
    player.kiemUltUntil = Date.now() + KIEM_ULT_MS;
    emitNoticeTo(player, '✦ Nhân Kiếm Hợp Nhất — toàn bộ chỉ số +20%, sát thương kiếm +50% trong 10 phút!');
    persistPlayer(player);
    syncChar(socket, player);
  });

  // GĐ102: triệu hồi Quỷ Hồn — tốn 100 Hồn Khí (không cần item/nghề).
  socket.on('quy_summon', () => {
    if (!player) return;
    if (player.classId !== 'quytu') { socket.emit('interact_error', { message: 'Triệu hồi Quỷ Hồn là cơ chế riêng của Quỷ Tu.' }); return; }
    if (quyHonPetOf(player)) { socket.emit('interact_error', { message: 'Bạn đã có Quỷ Hồn đi theo rồi.' }); return; }
    if (honKhiOf(player) < QUY_SUMMON_COST) { socket.emit('interact_error', { message: `Cần đủ 100 Hồn Khí mới triệu hồi (đang ${honKhiOf(player)}).` }); return; }
    const cr = classResOf(player);
    cr.honKhi = honKhiOf(player) - QUY_SUMMON_COST;
    cr.quyHon = { active: true, hp: quyHonMaxHpOf(player) };
    spawnQuyHon(player);
    emitNoticeTo(player, '👻 Quỷ Hồn đã hiện hình — nó sẽ xé xác quái và đỡ đòn cho bạn!');
    persistPlayer(player);
    syncChar(socket, player);
  });

  // GĐ137: Thú Sư thuần hóa thú hoang — socket tame_beast {monsterId}.
  // Cổng (theo thứ tự): nghề Thú Sư → chưa có thú → tìm thấy thú → cùng
  // map → không ẩn/trùm/thử thách/ảo ảnh → trong 80px → dưới 50% máu.
  // Thành công: thú hoang biến mất (một con hoang cùng loài sinh lại giữ
  // bãi không hụt), thú thành pet đầy máu theo chủ. Thất bại: chỉ báo
  // notice, thử lại thoải mái (không tốn gì — cái giá là trận đánh yếu thú).
  socket.on('tame_beast', (data) => {
    if (!player) return;
    if (player.hp <= 0) return;
    if (player.job?.jobId !== 'thusu') { socket.emit('interact_error', { message: 'Thuần hóa thú hoang là nghề của Thú Sư.' }); return; }
    if (tamedPetOf(player) || tamedOf(player).active) { socket.emit('interact_error', { message: 'Bạn đã có thú thuần hóa đi theo rồi.' }); return; }
    const m = monsters.get(data?.monsterId);
    if (!m) { socket.emit('interact_error', { message: 'Không tìm thấy con thú đó.' }); return; }
    if (mapOf(m) !== mapOf(player)) { socket.emit('interact_error', { message: 'Con thú đó không ở đây.' }); return; }
    if (m.hidden) { socket.emit('interact_error', { message: 'Không thấy con thú đó.' }); return; }
    if (m.mapBoss || MONSTER_TYPES[m.kind]?.area === 'realmBoss' || m.isTrialBoss) { socket.emit('interact_error', { message: 'Không thuần hóa được trùm.' }); return; }
    if (m.kind === 'trial' || m.illusion) { socket.emit('interact_error', { message: 'Không thuần hóa được con thú này.' }); return; }
    if (Math.hypot(m.x - player.x, m.y - player.y) > INTERACT_RANGE) { socket.emit('interact_error', { message: 'Đứng gần con thú hơn (trong 80px) mới thuần hóa được.' }); return; }
    if (m.hp >= (m.maxHp || 1) * TAME_HP_PCT) { socket.emit('interact_error', { message: 'Đánh cho con thú yếu đi (dưới 50% máu) rồi hãy thuần hóa.' }); return; }
    const rate = Math.min(1, TAME_RATE + (player.job?.master ? TAME_APPRENTICE_BONUS : 0));
    if (Math.random() >= rate) { emitNoticeTo(player, '🐾 Thuần hóa thất bại — con thú vẫn còn hoang, thử lại!'); return; }
    const kind = m.kind;
    const tamedName = m.name || kind;
    monsters.delete(m.id);
    spawnMonster(kind, mapOf(player)); // giữ bãi không hụt thú
    const tm = tamedOf(player);
    tm.active = true; tm.kind = kind; tm.name = tamedName;
    tm.maxHp = Math.round(m.maxHp || MONSTER_TYPES[kind]?.hp || 40);
    tm.atk = Math.round(m.atk ?? MONSTER_TYPES[kind]?.atk ?? 0);
    tm.def = Math.round(m.def ?? MONSTER_TYPES[kind]?.def ?? 0);
    tm.hp = tm.maxHp; // thuần hóa xong thú hồi đầy máu (TẠM: dễ nuôi, không phải dắt thú què)
    spawnTamed(player);
    emitNoticeTo(player, `🐾 Thuần hóa thành công! ${tamedName} giờ đi theo bạn.`);
    persistPlayer(player);
    syncChar(socket, player);
  });

  // GĐ137: thả thú thuần hóa về rừng (mở lại ô thú để thuần hóa con khác).
  socket.on('tame_release', () => {
    if (!player) return;
    if (player.hp <= 0) return;
    const pet = tamedPetOf(player);
    if (!pet && !tamedOf(player).active) { socket.emit('interact_error', { message: 'Bạn không có thú thuần hóa nào.' }); return; }
    const petName = pet ? pet.name : (tamedOf(player).name || 'Thú thuần hóa');
    if (pet) players.delete(pet.id);
    if (player.petId === pet?.id) player.petId = null;
    const tm = tamedOf(player);
    tm.active = false; tm.hp = 0;
    emitNoticeTo(player, `🐾 Bạn đã thả ${petName} về rừng.`);
    persistPlayer(player);
    syncChar(socket, player);
  });

  // GĐ103: Phật Quang Phổ Chiếu — chiêu riêng của Phật Tu (giữ chiêu cũ).
  socket.on('phat_quang', () => {
    if (!player) return;
    if (player.classId !== 'phattu') { socket.emit('interact_error', { message: 'Phật Quang Phổ Chiếu là công pháp riêng của Phật Tu.' }); return; }
    if (Date.now() < (player.stunUntil || 0)) return; // GĐ70: choáng thì không tung được
    if (player.mp < PHAT_QUANG_COST) { socket.emit('interact_error', { message: `Phật Quang cần ${PHAT_QUANG_COST} MP (đang ${Math.round(player.mp)}).` }); return; }
    if (Date.now() - (player.lastPhatQuangAt || 0) < PHAT_QUANG_CD_MS) { socket.emit('interact_error', { message: 'Phật Quang đang hồi chiêu.' }); return; }
    let target = null, td = Infinity;
    for (const m of monsters.values()) {
      if (m.kind === 'trial' && m.ownerId !== player.id) continue;
      if (mapOf(m) !== mapOf(player)) continue;
      if (m.hidden) continue;
      if (insideRealm(m.x, m.y) !== insideRealm(player.x, player.y)) continue;
      const d = Math.hypot(m.x - player.x, m.y - player.y);
      if (d < td) { td = d; target = m; }
    }
    if (!target || td > PHAT_QUANG_RANGE) { socket.emit('interact_error', { message: 'Không có quái trong tầm Phật Quang.' }); return; }
    player.mp -= PHAT_QUANG_COST;
    player.lastPhatQuangAt = Date.now();
    player.lastCombatAt = Date.now();
    // GĐ103: SIÊU ĐỘ — quái Quỷ dưới 10% máu thì biến mất (không rớt đồ, không tính kill), +Công Đức
    if (SIEU_DO_KINDS.has(target.kind) && target.hp < target.maxHp * 0.1) {
      monsters.delete(target.id);
      scheduleMonsterRespawn(target, mapOf(target));
      addCongDuc(player, SIEU_DO_CONGDUC);
      emitNoticeTo(player, `☸ Siêu độ ${target.name} — Công Đức +${SIEU_DO_CONGDUC}, không rớt đồ.`);
      persistPlayer(player);
      syncChar(socket, player);
      return;
    }
    const mechP = mechOf(target);
    if (mechP?.dodge && Math.random() < mechP.dodge) {
      io.emit('player_attacked', { id: player.id, targetId: target.id });
      socket.emit('notice', { text: `${target.name} né được Phật Quang!` });
      persistPlayer(player);
      syncChar(socket, player);
      return;
    }
    const phap = player.stats.phapCong || 0;
    const dmg = hurtMonster(target, PHAT_QUANG_COEF * (phap + 10) * phatQuangMulOf(player), target.def ?? 0, 'magic', nhoDmgMulOf(player) * tranDmgMulOf(player)); // GĐ105: Ý Cảnh Nghĩa Bạc nhân dmg; GĐ135: Trận Cường Công nhân dmg
    io.emit('player_attacked', { id: player.id, targetId: target.id });
    const tier = phatTierOf(player);
    if (tier >= 2) player.hp = Math.min(maxHpEff(player), player.hp + maxHpEff(player) * 0.1); // Tăng Sĩ: tự hồi 10% máu tối đa
    if (tier >= 3) { initMonsterFx(target); target.stunUntil = Math.max(target.stunUntil || 0, Date.now() + 1000); } // La Hán: choáng quái 1s
    if (tier >= 4) { // Bồ Tát: hồi máu đồng đội trong 300px (người chơi khác + đồng môn/pet của mình)
      let healed = false;
      for (const q of players.values()) {
        if (q.id === player.id || q.isBot || q.hp <= 0) continue;
        if (mapOf(q) !== mapOf(player)) continue;
        if (Math.hypot(q.x - player.x, q.y - player.y) > 300) continue;
        if ((q.isCompanion || q.isCotVuong || q.isQuyHon) && q.ownerId !== player.id) continue;
        q.hp = Math.min(maxHpEff(q), q.hp + maxHpEff(q) * 0.1);
        healed = true;
      }
      if (healed) emitNoticeTo(player, '☸ Bồ Tát phổ độ — đồng đội quanh bạn hồi máu!');
    }
    if (target.hp <= 0) onMonsterKilled(socket, player, target);
    else { persistPlayer(player); syncChar(socket, player); }
  });

  // GĐ103: Thuyết Pháp — bật/tắt; chỉ ở thành phố, đứng yên mới tích Công Đức.
  socket.on('thuyet_phap', () => {
    if (!player) return;
    if (player.classId !== 'phattu') { socket.emit('interact_error', { message: 'Thuyết Pháp là công pháp riêng của Phật Tu.' }); return; }
    if (player.preaching) { stopPreaching(player, 'toggle'); return; }
    if (THEME_BY_ID[mapOf(player)] !== 'city') { socket.emit('interact_error', { message: 'Thuyết Pháp chỉ thực hiện được ở thành phố.' }); return; }
    player.preaching = true;
    emitNoticeTo(player, `📿 Bạn bắt đầu Thuyết Pháp — đứng yên nhận +${THUYET_PHAP_PER_SEC} Công Đức/giây (di chuyển hoặc bị đánh sẽ ngắt).`);
  });

  // GĐ104: Y TU — Bổ Khí Huyết (hồi máu đồng đội) + Cố Bản Bồi Nguyên
  // (tặng máu tối đa vĩnh viễn) + Hồi Dương Cứu Nghịch (cứu người gục ngã).
  socket.on('y_heal', () => {
    if (!player) return;
    if (player.classId !== 'ytu') { socket.emit('interact_error', { message: 'Bổ Khí Huyết là y thuật riêng của Y Tu.' }); return; }
    if (player.hp <= 0) return; // GĐ104: đang gục ngã thì không chữa được
    if (player.mp < Y_HEAL_COST) { socket.emit('interact_error', { message: `Bổ Khí Huyết cần ${Y_HEAL_COST} Chân nguyên.` }); return; }
    if (Date.now() - (player.lastYHealAt || 0) < Y_HEAL_CD_MS) { socket.emit('interact_error', { message: 'Bổ Khí Huyết đang hồi chiêu.' }); return; }
    const target = nearestAlly(player, Y_HEAL_RANGE, false);
    if (!target) { socket.emit('interact_error', { message: 'Không có đồng đội trong tầm Bổ Khí Huyết.' }); return; }
    if (target.hp >= maxHpEff(target)) { socket.emit('interact_error', { message: 'Đồng đội đã đầy máu.' }); return; }
    const amount = yHealAmountOf(player);
    const restored = Math.min(amount, maxHpEff(target) - target.hp);
    target.hp += restored;
    player.mp -= Y_HEAL_COST;
    player.lastYHealAt = Date.now();
    emitNoticeTo(player, `💚 Bổ Khí Huyết: hồi ${restored} máu cho ${target.name} (+${Y_HEAL_YDUC} Y Đức).`);
    emitNoticeTo(target, `💚 ${player.name} dùng Bổ Khí Huyết hồi cho bạn ${restored} máu.`);
    addYDuc(player, Y_HEAL_YDUC);
    persistPlayer(player); persistPlayer(target);
    syncChar(socket, player); syncPlayerSocket(target);
  });

  socket.on('y_gift_hp', () => {
    if (!player) return;
    if (player.classId !== 'ytu') { socket.emit('interact_error', { message: 'Cố Bản Bồi Nguyên là y thuật riêng của Y Tu.' }); return; }
    if (player.hp <= 0) return;
    if (!yGiftUnlockedOf(player)) { socket.emit('interact_error', { message: 'Chưa mở khóa Cố Bản Bồi Nguyên (cần Y Đức từng đạt 2000).' }); return; }
    const target = nearestAlly(player, Y_GIFT_RANGE, false);
    if (!target) { socket.emit('interact_error', { message: 'Không có đồng đội trong tầm Cố Bản Bồi Nguyên.' }); return; }
    const gifted = classResOf(target).yGiftHp || 0;
    if (gifted >= Y_GIFT_CAP) { socket.emit('interact_error', { message: `${target.name} đã nhận tối đa máu từ Cố Bản Bồi Nguyên.` }); return; }
    if (yDucOf(player) < Y_GIFT_COST_YDUC) { socket.emit('interact_error', { message: `Cố Bản Bồi Nguyên cần ${Y_GIFT_COST_YDUC} Y Đức.` }); return; }
    const cr = classResOf(player);
    cr.yDuc = Math.max(0, (cr.yDuc || 0) - Y_GIFT_COST_YDUC);
    classResOf(target).yGiftHp = gifted + 10;
    target.stats.khiHuyet = (target.stats.khiHuyet || 0) + 1;
    emitNoticeTo(player, `❤️ Cố Bản Bồi Nguyên: ${target.name} tăng vĩnh viễn 10 máu tối đa (−${Y_GIFT_COST_YDUC} Y Đức).`);
    emitNoticeTo(target, `❤️ ${player.name} dùng Cố Bản Bồi Nguyên — bạn tăng vĩnh viễn 10 máu tối đa!`);
    persistPlayer(player); persistPlayer(target);
    syncChar(socket, player); syncPlayerSocket(target);
  });

  socket.on('y_revive', () => {
    if (!player) return;
    if (player.classId !== 'ytu') { socket.emit('interact_error', { message: 'Hồi Dương Cứu Nghịch là y thuật riêng của Y Tu.' }); return; }
    if (player.hp <= 0) return;
    if (!yReviveUnlockedOf(player)) { socket.emit('interact_error', { message: 'Chưa mở khóa Hồi Dương Cứu Nghịch (cần Y Đức từng đạt 500).' }); return; }
    const target = nearestAlly(player, Y_REVIVE_RANGE, true);
    if (!target) { socket.emit('interact_error', { message: 'Không có đồng đội gục ngã trong tầm Hồi Dương Cứu Nghịch.' }); return; }
    target.downedUntil = 0;
    target.downedSourceKind = null; target.downedSourceName = null;
    target.hp = Math.round(maxHpEff(target) * Y_REVIVE_HP_PCT);
    target.dots = []; target.slowUntil = 0; target.stunUntil = 0;
    target.input.vx = 0; target.input.vy = 0;
    emitNoticeTo(player, `💚 Hồi Dương Cứu Nghịch: ${target.name} đã tỉnh dậy (+${Y_REVIVE_YDUC} Y Đức).`);
    const tsock = io.sockets.sockets.get(target.id);
    if (tsock) tsock.emit('you_revived', { by: player.name });
    io.to('map:' + mapOf(target)).emit('player_revived', { id: target.id, name: target.name, by: player.name });
    addYDuc(player, Y_REVIVE_YDUC);
    persistPlayer(player); persistPlayer(target);
    syncChar(socket, player); syncPlayerSocket(target);
  });

  // GĐ105: NHO TU — Đọc sách ở Văn Uyển (tích Hạo Nhiên + mở Chương) + mở Ý Cảnh.
  socket.on('nho_study', () => {
    if (!player) return;
    if (player.classId !== 'nhotu') { socket.emit('interact_error', { message: 'Đọc sách ở Văn Uyển là việc riêng của Nho Tu.' }); return; }
    if (player.hp <= 0) return; // GĐ105: đang gục ngã thì không đọc được
    if (player.studying) { stopStudying(player, 'toggle'); return; }
    if (mapOf(player) !== NHO_STUDY_MAP) { socket.emit('interact_error', { message: 'Muốn đọc sách, hãy tới Văn Uyển Tàng Kinh Các.' }); return; }
    const portal = vanUyenPortal();
    if (!portal || Math.hypot(player.x - portal.x, player.y - portal.y) > NHO_STUDY_RANGE) { socket.emit('interact_error', { message: 'Hãy đứng gần chính đường Văn Uyển (quanh cổng) để đọc sách.' }); return; }
    player.studying = true;
    emitNoticeTo(player, `📖 Bạn bắt đầu đọc sách ở Văn Uyển — đứng yên nhận +${NHO_STUDY_PER_SEC} Hạo Nhiên/giây, đủ giây sẽ mở Chương mới (di chuyển hoặc bị đánh sẽ ngắt).`);
  });

  socket.on('nho_zone', (data) => {
    if (!player) return;
    if (player.classId !== 'nhotu') { socket.emit('interact_error', { message: 'Ý Cảnh là tuyệt học riêng của Nho Tu.' }); return; }
    if (player.hp <= 0) return; // GĐ105: đang gục ngã thì không mở được
    const chuong = data && typeof data.chuong === 'number' ? data.chuong : 0;
    if (![1, 2, 3, 4].includes(chuong)) { socket.emit('interact_error', { message: 'Chương không hợp lệ.' }); return; }
    if (!nhoChuongUnlocked(player, chuong)) { socket.emit('interact_error', { message: `Chưa mở khóa Chương ${chuong} (${NHO_ZONE_NAMES[chuong]}) — đọc sách ở Văn Uyển tổng ${NHO_CHUONG_UNLOCK[chuong]} giây để mở.` }); return; }
    if (player.mp < NHO_ZONE_COST_MP) { socket.emit('interact_error', { message: `Mở Ý Cảnh cần ${NHO_ZONE_COST_MP} Chân nguyên.` }); return; }
    if (Date.now() - (player.lastNhoZoneAt || 0) < NHO_ZONE_CD_MS) { socket.emit('interact_error', { message: 'Ý Cảnh đang hồi chiêu.' }); return; }
    if (haoNhienOf(player) < NHO_ZONE_COST_HAO) { socket.emit('interact_error', { message: `Mở Ý Cảnh cần ${NHO_ZONE_COST_HAO} Hạo Nhiên.` }); return; }
    const cr = classResOf(player);
    cr.haoNhien = (cr.haoNhien || 0) - NHO_ZONE_COST_HAO;
    player.mp -= NHO_ZONE_COST_MP;
    player.lastNhoZoneAt = Date.now();
    player.nhoZone = { chuong, x: player.x, y: player.y, until: Date.now() + NHO_ZONE_DUR_MS };
    emitNoticeTo(player, `📖 Bạn mở Ý Cảnh: ${NHO_ZONE_NAMES[chuong]} (tồn tại ${NHO_ZONE_DUR_MS / 1000}s).`);
    persistPlayer(player);
    syncChar(socket, player);
  });

  // GĐ135: TRẬN PHÁP SƯ BỐ TRẬN — mỗi loại 1 trận/người (bố lại thay trận cũ);
  // tốn 1 Trận Kỳ (chế ở panel Nghề — lưu ý Trận Kỳ dùng trực tiếp thì về làng,
  // bố trận thì thành trận: người chơi tự cân nhắc). Trận Dịch Chuyển bền qua
  // restart, 3 trận còn lại là tạm (hết hạn / thoát / chết / dịch chuyển là mất).
  socket.on('array_place', (data) => {
    if (!player || !data) return;
    if (player.hp <= 0) return; // GĐ128: linh thể chỉ đi lại, không tương tác được
    if (player.job?.jobId !== 'tranphap') {
      socket.emit('interact_error', { message: 'Chỉ Trận Pháp Sư mới bố trận.' });
      return;
    }
    const type = data.type;
    if (!TRAN_ARRAY_RANK[type]) { socket.emit('interact_error', { message: 'Loại trận không hợp lệ.' }); return; }
    const rank = jobRankOf(player);
    if (rank < TRAN_ARRAY_RANK[type]) {
      socket.emit('interact_error', { message: `Cần cấp nghề ${JOB_RANK_NAMES[TRAN_ARRAY_RANK[type]]} mới bố ${TRAN_ARRAY_NAMES[type]}.` });
      return;
    }
    if ((player.inventory['tran_ky'] || 0) < 1) {
      socket.emit('interact_error', { message: 'Cần Trận Kỳ để bố trận (chế ở panel Nghề: 4 Nanh Sói + 10 Linh thạch).' });
      return;
    }
    player.inventory['tran_ky'] -= 1;
    const mapId = mapOf(player);
    if (type === 'teleport') {
      player.teleportArray = { mapId, x: player.x, y: player.y };
      socket.emit('array_place_result', { ok: true, type, mapId, x: player.x, y: player.y });
      notice(`🌀 Đã bố Trận Dịch Chuyển tại đây — bấm Gọi về trong panel Nghề để dịch chuyển tức thời về đây (cùng map, dùng được nhiều lần).`);
    } else {
      const dur = type === 'seal' ? TRAN_SEAL_DUR_MS : type === 'buff' ? TRAN_BUFF_DUR_MS : TRAN_DEBUFF_DUR_MS;
      const field = type === 'buff' ? 'tranBuff' : type === 'debuff' ? 'tranDebuff' : 'tranSeal';
      player[field] = { x: player.x, y: player.y, mapId, until: Date.now() + dur };
      socket.emit('array_place_result', { ok: true, type, mapId, x: player.x, y: player.y, until: Date.now() + dur });
      notice(`🔮 Đã bố ${TRAN_ARRAY_NAMES[type]} (tồn tại ${dur / 1000}s).`);
    }
    persistPlayer(player);
    syncChar(socket, player);
  });

  // GĐ135: GỌI VỀ TRẬN DỊCH CHUYỂN — tức thời, cùng map, dùng nhiều lần, không tốn gì.
  socket.on('array_recall', () => {
    if (!player) return;
    if (player.hp <= 0) return; // GĐ128: linh thể chỉ đi lại, không dịch chuyển được
    const a = player.teleportArray;
    if (!a) {
      socket.emit('interact_error', { message: 'Chưa bố Trận Dịch Chuyển — bố trận trước rồi hãy gọi.' });
      return;
    }
    if (a.mapId !== mapOf(player)) {
      socket.emit('interact_error', { message: 'Trận dịch chuyển ở map khác — quay lại map đó rồi hãy gọi.' });
      return;
    }
    player.x = a.x; player.y = a.y;
    socket.emit('array_recall_result', { ok: true, x: a.x, y: a.y });
    notice('🌀 Trận Dịch Chuyển phát sáng — bạn đã về chỗ bố trận!');
    persistPlayer(player);
    syncChar(socket, player);
  });

  // ---- Tu luyện (GĐ7) ----
  const nearDaoQuan = () => Math.hypot(player.x - DAO_QUAN_DOOR.x, player.y - DAO_QUAN_DOOR.y) <= INTERACT_RANGE;

  // Đo linh căn tại Đạo Quán: bốc hệ → lên Luyện Khí tầng 1 + 2 công pháp Cơ bản
  socket.on('measure_linhcan', () => {
    if (!player || player.linhCan) return;
    if (!nearDaoQuan()) {
      socket.emit('interact_error', { message: 'Hãy tới trước cửa Đạo Quán để đo linh căn.' });
      return;
    }
    player.linhCan = rollLinhCan();
    player.realm = 'lk';
    player.tier = 1;
    // GĐ33: 2 công pháp Cơ bản tự có = của VŨ KHÍ đang cầm (dữ liệu thật từ
    // file thiết kế); chưa có dữ liệu vũ khí thì lùi về chiêu Cơ bản theo lớp.
    const wNow = weaponOf(player.classId, player.weaponId);
    const weaponBasics = wNow ? (SKILL_CATALOG[player.classId]?.[wNow.id] || []).filter((s) => s.tier === 'coban').map((s) => s.id) : [];
    player.skills = weaponBasics.length
      ? weaponBasics
      : (SKILLS[player.classId] || []).filter((s) => s.tier === 'coban').map((s) => s.id);
    player.equipped = []; // GĐ36: đo linh căn xong → 2 chiêu Cơ bản tự lắp vào ô 1–2
    player.boards = null; // GĐ37: dựng lại 2 bảng từ đầu (bảng tự lắp 2 chiêu Cơ bản)
    player.activeBoard = 0;
    normalizeEquipped(player);
    persistPlayer(player);
    syncChar(socket, player);
    socket.emit('linhcan_result', { linhCan: player.linhCan });
    console.log(`[tu luyện] ${player.name} đo linh căn: ${player.linhCan.elements.join(' + ')} (${player.linhCan.count} hệ) → Luyện Khí 1`);
  });

  // GĐ31-SỬA: NGỒI LĨNH NGỘ công pháp (bấm E ở Đạo Quán cho chiêu Luyện Khí;
  // nút 📖 trong khung nhân vật cho chiêu Trúc Cơ — học ở mọi nơi).
  // Bấm lần nữa khi đang học = dừng buổi học, GIỮ tiến độ.
  socket.on('learn_skill', (data) => {
    if (!player) return;
    const wantId = data && typeof data.skillId === 'string' ? data.skillId : null;
    // Bấm dừng (không chỉ định chiêu, hoặc bấm lại đúng chiêu đang học) → phá buổi, về 0
    if (player.learningActive && (!wantId || wantId === player.learning?.skillId)) {
      breakLearning(player, false);
      return;
    }
    let target = wantId ? SKILL_BY_ID[wantId] : null;
    if (wantId && !target) return;
    if (!target) {
      // Không chỉ định chiêu: học tiếp chiêu đang dở, hoặc chiêu lớp bản cũ đầu tiên đủ điều kiện
      if (player.learning) target = SKILL_BY_ID[player.learning.skillId];
      if (!target) {
        const list = SKILLS[player.classId] || [];
        const lk = list.find((s) => s.tier === 'luyenkhi');
        const tc = list.find((s) => s.tier === 'trucco');
        if (lk && !player.skills.includes(lk.id)) {
          if (player.realm !== 'lk') return;
          if (player.tier < 3) {
            socket.emit('interact_error', { message: `Cần Luyện Khí tầng 3 để học ${lk.name} (đang tầng ${player.tier}).` });
            return;
          }
          target = lk;
        } else if (tc && !player.skills.includes(tc.id)) {
          if (player.realm !== 'tc') {
            socket.emit('interact_error', { message: `Đạt Trúc Cơ mới học được công pháp Trúc Cơ ${tc.name}.` });
            return;
          }
          target = tc;
        } else return;
      }
    }
    if (player.skills.includes(target.id)) return;
    // GĐ54: học QUA TÔNG MÔN — chỉ đệ tử Thiên Kiếm/Huyền Thiên, chỉ công
    // pháp Trúc Cơ trong danh sách tông (lớp + vũ khí đang cầm); điều kiện
    // chỉ số được giảm 5 điểm mỗi chỉ số qua effTarget ở bước kiểm tra dưới.
    // GĐ80: công pháp tông RIÊNG (30 tông mới) — chỉ học qua Sứ Giả, chỉ
    // đệ tử đúng tông đó, không gắn vũ khí/lớp, không giảm điều kiện.
    const viaSect = !!(data && data.via === 'sect');
    let effTarget = target;
    if (target.sectId) {
      if (!viaSect) {
        socket.emit('interact_error', { message: `Công pháp của tông môn chỉ lĩnh ngộ được tại Sứ Giả Tông Môn — ${target.name} là chiêu riêng của ${SECTS[target.sectId]?.name || 'tông môn'}.` });
        return;
      }
      if (player.sect !== target.sectId) {
        socket.emit('interact_error', { message: `Chỉ đệ tử ${SECTS[target.sectId]?.name || 'tông môn'} mới học được ${target.name}.` });
        return;
      }
    } else if (viaSect) {
      if (!player.sect || !SECTS[player.sect]) {
        socket.emit('interact_error', { message: 'Chỉ đệ tử tông môn mới học được công pháp riêng của tông.' });
        return;
      }
      if (target.tier !== 'trucco' || !target.weaponId) {
        socket.emit('interact_error', { message: `${target.name} không nằm trong danh sách công pháp tông môn.` });
        return;
      }
      effTarget = discountedSkill(target);
    }
    // Kiểm tra thuộc về: chiêu theo vũ khí phải đúng vũ khí đang cầm; chiêu lớp thì đúng lớp
    if (target.weaponId) {
      const w = weaponOf(player.classId, player.weaponId);
      if (!w || w.id !== target.weaponId || !SKILL_CATALOG[player.classId]?.[target.weaponId]?.some((s) => s.id === target.id)) {
        socket.emit('interact_error', { message: `${target.name} là công pháp của vũ khí khác — bạn đang cầm ${w ? w.name : 'tay không'}.` });
        return;
      }
    } else if (target.sectId) {
      // đã kiểm tra tư cách tông ở trên — công pháp tông không gắn vũ khí/lớp
    } else if (!(SKILLS[player.classId] || []).some((s) => s.id === target.id)) {
      return; // chiêu không thuộc lớp của mình (bản cũ) — bỏ qua
    }
    // Điều kiện học
    if (target.sectId) {
      // GĐ80: cổng cảnh giới riêng cho công pháp tông (Cơ bản cần đo linh
      // căn như chiêu Cơ bản thường; Luyện Khí từ LK trở lên; Trúc Cơ từ TC trở lên)
      const ro = REALM_ORDER[player.realm] ?? 0;
      if (target.tier === 'coban' && !player.linhCan) {
        socket.emit('interact_error', { message: `Cần đo linh căn tại Đạo Quán mới học được ${target.name}.` });
        return;
      }
      if (target.tier === 'luyenkhi' && ro < 1) {
        socket.emit('interact_error', { message: `Cần vào Luyện Khí để học ${target.name}.` });
        return;
      }
      if (target.tier === 'trucco' && ro < 2) {
        socket.emit('interact_error', { message: `Cần đạt Trúc Cơ để học ${target.name}.` });
        return;
      }
    } else if (target.cond) {
      const realmOk = target.tier === 'coban' ? !!player.linhCan : target.tier === 'luyenkhi' ? player.realm !== 'pham' : target.tier === 'trucco' ? player.realm === 'tc' : false;
      if (!realmOk) {
        socket.emit('interact_error', { message: target.tier === 'trucco' ? `Cần cảnh giới Trúc Cơ để học ${target.name}.` : `Cần vào Luyện Khí để học ${target.name}.` });
        return;
      }
      if (!condMetOf(player, effTarget)) {
        socket.emit('interact_error', { message: `Chưa đủ điều kiện học ${target.name} — cần: ${condTextOf(effTarget)}${viaSect ? ' (đã giảm 5 điểm cho đệ tử tông môn)' : ''}.` });
        return;
      }
    } else if (target.tier === 'luyenkhi') {
      if (player.realm !== 'lk' || player.tier < 3) {
        socket.emit('interact_error', { message: `Cần Luyện Khí tầng 3 để học ${target.name}.` });
        return;
      }
    } else if (target.tier === 'trucco' && player.realm !== 'tc') {
      socket.emit('interact_error', { message: `Cần cảnh giới Trúc Cơ để học ${target.name}.` });
      return;
    }
    // GĐ33: công pháp CƠ BẢN tự có (đúng file) — trao ngay, không tốn thời gian
    if (target.tier === 'coban') {
      player.skills.push(target.id);
      const slotNo = autoEquipIfFree(player, target.id); // GĐ36
      persistPlayer(player);
      syncChar(socket, player);
      socket.emit('skill_learned', { skill: target, equipped: slotNo > 0, slot: slotNo });
      notice(`✨ Đã lĩnh hội ${target.name} — công pháp Cơ bản tự có, không tốn thời gian học.`);
      return;
    }
    // Luật nơi học: chiêu Luyện Khí CHỈ ở Đạo Quán; Trúc Cơ trở lên ở mọi nơi
    // (GĐ80: công pháp tông học tại Sứ Giả — tông môn chính là nơi học, không cần Đạo Quán)
    if (target.tier === 'luyenkhi' && !target.sectId && !nearDaoQuan()) {
      socket.emit('interact_error', { message: `Công pháp Luyện Khí phải đến Đạo Quán mới lĩnh ngộ được. ${target.name} học ở mọi nơi là từ Trúc Cơ trở đi.` });
      return;
    }
    if (player.bequan) setBequan(player, false);
    // Đổi sang chiêu khác = bỏ chiêu đang dở (tiến độ của chiêu cũ mất — đúng luật về 0)
    if (!player.learning || player.learning.skillId !== target.id) {
      player.learning = { skillId: target.id, progressMin: 0, needMin: learnNeedMinFor(player, target) };
    }
    persistPlayer(player);
    setLearningActive(player, true);
    const need = player.learning.needMin;
    const pct = Math.min(100, Math.floor(((player.learning.progressMin || 0) / need) * 100));
    const days = (need / 1440).toFixed(1).replace('.0', '');
    notice(`📖 Ngồi xuống lĩnh ngộ ${target.name} — tiến độ ${pct}% (cần ≈${days} ngày game ngồi học; Thần thức ${player.stats.thanThuc} giúp lĩnh hội nhanh hơn). Đứng dậy, di chuyển, ra đòn hay BỊ ĐÁNH TRÚNG đều làm tiến độ VỀ 0 — chỉ thoát game là nhân vật tự về chỗ an toàn học tiếp.`);
    console.log(`[tu luyện] ${player.name} ngồi lĩnh ngộ ${target.name} (${pct}%, cần ${need} phút game) tại (${Math.round(player.x)},${Math.round(player.y)})`);
  });

  // GĐ36+37: LẮP / THÁO công pháp (kiểu A — thủ công trong panel 📖);
  // data.area: 'main' (ô chính) | 'util' (ô đa dụng); đổi BẢNG: switch_board
  socket.on('equip_skill', (data) => {
    if (!player || !data?.skillId) return;
    if (!(player.skills || []).includes(data.skillId)) {
      socket.emit('interact_error', { message: 'Chưa học công pháp này.' });
      return;
    }
    normalizeEquipped(player);
    const board = activeBoardOf(player);
    const area = data.area === 'util' ? 'util' : 'main';
    const list = area === 'util' ? board.util : board.main;
    const other = area === 'util' ? board.main : board.util;
    if (list.includes(data.skillId)) return;
    if (other.includes(data.skillId)) {
      socket.emit('interact_error', { message: area === 'util' ? 'Chiêu này đang lắp ở ô chính — hãy tháo bên ô chính trước.' : 'Chiêu này đang lắp ở ô đa dụng — hãy tháo bên ô đa dụng trước.' });
      return;
    }
    if (area === 'util') {
      const sk = skillById(player.classId, data.skillId);
      if (!isUtilitySkill(sk)) {
        socket.emit('interact_error', { message: 'Ô đa dụng chỉ chứa công pháp HỖ TRỢ (buff thủ, hồi máu, phản sát thương, tăng công...).' });
        return;
      }
      if (list.length >= UTIL_MAX) {
        socket.emit('interact_error', { message: `Ô đa dụng đã đầy (${UTIL_MAX}/${UTIL_MAX}).` });
        return;
      }
    } else if (list.length >= slotCountFor(player)) {
      socket.emit('interact_error', { message: `Ô công pháp đã đầy (${list.length}/${slotCountFor(player)}). Hãy tháo bớt chiêu khác trước.` });
      return;
    }
    list.push(data.skillId);
    player.equipped = board.main;
    persistPlayer(player);
    syncChar(socket, player);
  });
  socket.on('unequip_skill', (data) => {
    if (!player || !data?.skillId) return;
    normalizeEquipped(player);
    const board = activeBoardOf(player);
    if (data.area === 'util') board.util = board.util.filter((id) => id !== data.skillId);
    else if (data.area === 'main') board.main = board.main.filter((id) => id !== data.skillId);
    else { board.main = board.main.filter((id) => id !== data.skillId); board.util = board.util.filter((id) => id !== data.skillId); }
    player.equipped = board.main;
    persistPlayer(player);
    syncChar(socket, player);
  });
  // GĐ37: chuyển giữa 2 bảng công pháp (vd: bảng farm quái ↔ bảng tu luyện)
  socket.on('switch_board', (data) => {
    if (!player || !data) return;
    const b = Number(data.board);
    if (b !== 0 && b !== 1) return;
    boardsOf(player);
    if ((player.activeBoard || 0) === b) return;
    player.activeBoard = b;
    normalizeEquipped(player);
    persistPlayer(player);
    syncChar(socket, player);
    socket.emit('notice', { text: `🔀 Đã chuyển sang Bảng công pháp ${b + 1}.` });
  });

  // GĐ22: Tọa Thiền KHÔNG còn học miễn phí ở Đạo Quán — nó là công pháp tiện
  // ích, phải kiếm được Sách Tọa Thiền (rơi từ sói) rồi dùng sách để học
  // (xem use_item). Handler learn_meditation cũ của GĐ21 đã gỡ.

  // GĐ23: BẾ QUAN tại Tụ Linh Trận (Thiền Phòng sau Đạo Quán) — bật/tắt.
  // Điều kiện: đã có linh căn + đang đứng trong trận. Đang bế quan mà bấm
  // lần nữa (hoặc di chuyển / ra đòn) là dừng.
  socket.on('toggle_bequan', () => {
    if (!player) return;
    if (player.hp <= 0) return; // GĐ128: linh thể chỉ đi lại, không tương tác được
    if (player.bequan) {
      setBequan(player, false);
      return;
    }
    if (player.learningActive) breakLearning(player, false); // GĐ32: chuyển sang bế quan là phá lĩnh ngộ (về 0)
    if (!player.linhCan) {
      socket.emit('interact_error', { message: 'Cần đo linh căn ở Đạo Quán trước khi bế quan.' });
      return;
    }
    if (Math.hypot(player.x - TULINH.x, player.y - TULINH.y) > 90) {
      socket.emit('interact_error', { message: 'Bế quan phải đứng trong Tụ Linh Trận (Thiền Phòng — phía sau Đạo Quán).' });
      return;
    }
    setBequan(player, true);
    console.log(`[bế quan] ${player.name} bắt đầu bế quan tại Tụ Linh Trận`);
  });

  // Tung công pháp (phím 1/2/3): server kiểm tra đã học / hồi chiêu /
  // Chân nguyên / tầm — sát thương qua cùng đường công thức của file.
  socket.on('cast_skill', (data) => {
    if (!player || !data) return;
    if (player.hp <= 0) return; // GĐ104: đang gục ngã thì không tung chiêu được
    if (Date.now() < (player.stunUntil || 0)) { socket.emit('cast_result', { ok: false, slot: Number(data.slot), area: data.area === 'util' ? 'util' : 'main', reason: 'stunned' }); return; } // GĐ70: đang choáng thì không tung chiêu được
    if (player.bequan) setBequan(player, false); // GĐ23: tung chiêu là dứt bế quan
    if (player.learningActive) breakLearning(player, false); // GĐ32: tung chiêu là phá lĩnh ngộ (về 0)
    const slot = Number(data.slot);
    const area = data.area === 'util' ? 'util' : 'main'; // GĐ37: ô đa dụng
    const skillId = (area === 'util' ? activeBoardOf(player).util : equippedOf(player))[slot]; // GĐ36+37: chỉ chiêu đang lắp mới tung được
    const skill = skillId ? skillById(player.classId, skillId) : null;
    if (!skill) return;
    const now = Date.now();
    const cdMs = Math.round(skill.cdMs * (1 - cdrOf(effStatsOf(player))));
    if (now < (player.skillReadyAt[skill.id] || 0)) {
      socket.emit('cast_result', { ok: false, slot, area, reason: 'cooldown' });
      return;
    }
    // Quái gần nhất trong tầm chiêu
    let target = null;
    let targetDist = Infinity;
    for (const m of monsters.values()) {
      if (m.kind === 'trial' && m.ownerId !== player.id) continue; // GĐ19: trùm thử thách của người khác
      if (mapOf(m) !== mapOf(player)) continue; // GĐ59: không tung chiêu xuyên map
      if (insideRealm(m.x, m.y) !== insideRealm(player.x, player.y)) continue; // GĐ57: không tung chiêu xuyên vách bí cảnh
      const d = Math.hypot(m.x - player.x, m.y - player.y);
      if (d < targetDist) {
        targetDist = d;
        target = m;
      }
    }
    const effRange = (skill.range ?? Infinity) * rangeMulOf(player); // GĐ88: Thần Thức Ngoại Phóng +20% tầm (KD4+)
    if (!target || targetDist > effRange) {
      socket.emit('cast_result', { ok: false, slot, area, reason: 'range' }); // không tốn Chân nguyên
      return;
    }
    // GĐ99: Kiếm Vực — toàn bộ chi phí Chân nguyên chuyển sang tiêu hao HP; không tự sát
    // (HP phải còn lớn hơn chi phí mới tung được, giống luật "không đủ Mana thì không tung").
    // GĐ100: Pháp Tu — Phép Dung Hợp: cast chiêu khác trong 1,5s sau 1 cast thành công
    // thì chiêu này thành dung hợp, tốn gấp đôi mana. Không đủ mana mức gấp đôi →
    // tung thường (không fail), vẫn tốn mức thường.
    const vucCost = vucActiveOf(player);
    let fusion = null;
    if (player.classId === 'phaptu' && player.lastCast && player.lastCast.skillId !== skill.id && now - player.lastCast.at <= FUSION_WINDOW_MS) {
      fusion = { elA: player.lastCast.element, elB: skillElementOf(player, skill) };
      fusion.name = FUSION_NAMES[fusion.elA + '+' + fusion.elB] || `Dung hợp ${fusion.elA} + ${fusion.elB}`;
    }
    let fuseCost = fusion ? skill.cost * 2 : skill.cost;
    if (vucCost ? player.hp <= fuseCost : player.mp < fuseCost) {
      if (fusion) { fusion = null; fuseCost = skill.cost; }
      if (vucCost ? player.hp <= fuseCost : player.mp < fuseCost) {
        socket.emit('cast_result', { ok: false, slot, area, reason: 'mana' });
        return;
      }
    }
    if (vucCost) player.hp -= fuseCost; else player.mp -= fuseCost;
    player.lastCombatAt = now; // GĐ76: tung chiêu = giao tranh
    if (player.meditating) stopMeditation(player, 'attack'); // GĐ76: tung chiêu là dứt thiền
    player.skillReadyAt[skill.id] = now + cdMs;
    const atk = attackStatOf(player);
    // GĐ34: HIỆU ỨNG ĐẶC BIỆT — chiêu vùng đánh mọi quái trong tầm; xuyên
    // phòng giảm phòng thủ địch; đánh nhiều lần; buff/choáng/chậm/đốt... áp
    // qua applyFxToMonster + applySelfFx
    const fx = skill.fx || null;
    const mul = atkMulOf(player);
    if (player.nextAtkMul) player.nextAtkMul = 0; // đòn kế tiếp đã được dùng
    let targets = [target];
    if (fx?.aoe) {
      targets = [...monsters.values()].filter((m) => !(m.kind === 'trial' && m.ownerId !== player.id) && !m.hidden && mapOf(m) === mapOf(player) && insideRealm(m.x, m.y) === insideRealm(player.x, player.y) && Math.hypot(m.x - player.x, m.y - player.y) <= effRange); // GĐ59: + cùng map · GĐ60: trừ quái đang ẩn · GĐ88: tầm đã × Thần Thức
      if (!targets.length) targets = [target];
    }
    const pierce0 = fx?.pierce ? fx.pierce / 100 : 0;
    // GĐ100: xuyên phòng từ hệ Kim — biến dị Kim (mọi cast) hoặc dung hợp có hệ Kim
    let pierce = pierce0;
    if (player.classId === 'phaptu') {
      const els = new Set();
      const bd0 = bienDiOf(player);
      if (bd0) els.add(bd0);
      if (fusion) { els.add(fusion.elA); els.add(fusion.elB); }
      if (els.has('Kim')) pierce += 0.3;
    }
    let totalDealt = 0;
    let firstDmg = 0;
    for (const t of targets) {
      // GĐ70: quái né chiêu cao — né được thì chiêu này không trúng nó
      const mechT = mechOf(t);
      if (mechT?.dodge && Math.random() < mechT.dodge) {
        if (t === target) socket.emit('notice', { text: `${t.name} né được chiêu của bạn!` });
        continue;
      }
      const effDef = Math.max(0, Math.round((t.def ?? WOLF.def) * (1 - pierce))); // GĐ38: def theo loài
      const hits = fx?.hits || 1;
      for (let h = 0; h < hits; h++) {
        const g = 1 + (fx?.hitGrowth || 0) * h;
        const d = hurtMonster(t, skill.coef * g * mul * (atk.value + 10) * critMulOf(player) * kiemDmgMulOf(player) * (fusion ? FUSION_DMG_MUL : 1), effDef, atk.type, nhoDmgMulOf(player) * tranDmgMulOf(player)); // GĐ70: loại sát thương cho giáp đá; GĐ97: Siêu Giác Quan chí mạng ×2; GĐ99: Kiếm Vực/Ultimate nhân sát thương; GĐ100: dung hợp ×1,5; GĐ105: Ý Cảnh Nghĩa Bạc nhân dmg; GĐ135: Trận Cường Công nhân dmg
        if (player.classId === 'thetu') addRage(player, 6); // GĐ95: chiêu trúng tích Nộ
        if (player.classId === 'satthu') addSatKhi(player, SATKHI_HIT); // GĐ97: chiêu trúng tích Sát Khí
        if (player.classId === 'satthu') applyCoatingOnHit(player, t); // GĐ98: chiêu trúng bôi độc / kích thích
        if (player.classId === 'kiemtu') addNgoKiem(player, NGOKIEM_HIT); // GĐ99: chiêu trúng tích Ngộ Kiếm
        if (player.classId === 'quytu') addHonKhi(player, HONKHI_HIT); // GĐ102: chiêu trúng tích Hồn Khí
        if (player.classId === 'kiemtu') applySwordOnHit(player, t, d); // GĐ99: chiêu trúng kích hiệu ứng kiếm
        if (player.classId === 'kiemtu' && vucActiveOf(player)) player.hp = Math.min(maxHpEff(player), player.hp + Math.round(d * 0.3)); // GĐ99: Kiếm Vực hút 30% sát thương chiêu gây ra (TẠM)
        if (player.classId === 'phaptu') { // GĐ100: nội tại Biến Dị (mọi cast gây dmg) + hiệu ứng 2 hệ dung hợp
          const bd = bienDiOf(player);
          if (bd) applyElementRider(player, t, d, bd, effDef);
          if (fusion) { applyElementRider(player, t, d, fusion.elA, effDef); applyElementRider(player, t, d, fusion.elB, effDef); }
        }
        totalDealt += d;
        if (t === target && h === 0) firstDmg = d;
        if (t.hp <= 0) break;
      }
      applyFxToMonster(player, t, fx);
      if (t.hp <= 0) onMonsterKilled(socket, player, t);
    }
    applySelfFx(player, fx, totalDealt);
    const dmg = firstDmg;
    // GĐ100: cast thành công (kể cả bị né hết) vẫn tính là "đã dùng phép" cho cửa sổ
    // dung hợp; dung hợp cũng cập nhật lastCast nên có thể nối chuỗi, mỗi lần đều tốn gấp đôi.
    player.lastCast = { skillId: skill.id, element: skillElementOf(player, skill), at: now };
    if (fusion) socket.emit('notice', { text: `✦ Phép Dung Hợp: ${fusion.name}!` });
    socket.emit('cast_result', { ok: true, slot, area, skillId: skill.id, cdMs, targetId: target.id, dmg, fusion: !!fusion, fusionName: fusion ? fusion.name : null });
    io.emit('skill_cast', { id: player.id, slot, skillId: skill.id, targetId: target.id }); // GĐ9: tư thế + đạn bay phía client
    console.log(`[combat] ${player.name} tung ${skill.name}: -${dmg} lên ${target.id} (còn ${Math.max(0, target.hp)})${fx ? ' [fx]' : ''}`);
    syncChar(socket, player);
  });

  // GĐ19 — Triệu hồi trùm thử thách (Trung cảnh: Thử Luyện Thú; Đại cảnh: Tâm Ma Ảnh; GĐ87: Kim Đan: Lôi Kiếp Ảnh)
  // tại sân Đạo Quán. Điều kiện: đủ Tu vi + có đan tương ứng. Đan chỉ bị trừ khi bấm Đột phá.
  socket.on('start_trial', () => {
    if (!player) return;
    const info = breakInfoFor(player.realm, player.tier);
    if (!info || (info.type !== 'trung' && info.type !== 'dai' && info.type !== 'kimdan')) {
      socket.emit('interact_error', { message: 'Hiện không có thử thách đột phá nào chờ bạn.' });
      return;
    }
    const need = tuViNeedStep(globalStep(player.realm, player.tier));
    if (player.tuVi < need) {
      socket.emit('interact_error', { message: `Chưa đủ Tu vi để thử thách: ${player.tuVi}/${need}.` });
      return;
    }
    if ((player.inventory[info.pill] || 0) < 1) {
      socket.emit('interact_error', { message: `Cần mang theo ${ITEMS[info.pill].name} (mua ở Tiệm Đan Dược) mới bắt đầu thử thách được.` });
      return;
    }
    if (player.trialReady === info.trial) {
      socket.emit('interact_error', { message: 'Bạn đã thắng thử thách rồi — bấm Đột phá để hoàn tất!' });
      return;
    }
    if ([...monsters.values()].some((m) => m.kind === 'trial' && m.ownerId === player.id && m.isTrialBoss)) {
      socket.emit('interact_error', { message: 'Thử thách của bạn đang diễn ra!' });
      return;
    }
    if (Math.hypot(player.x - DAO_QUAN_DOOR.x, player.y - DAO_QUAN_DOOR.y) > 160) {
      socket.emit('interact_error', { message: 'Hãy tới sân Đạo Quán để bắt đầu thử thách.' });
      return;
    }
    const step = globalStep(player.realm, player.tier);
    const isDai = info.type === 'dai';
    const isKimdan = info.type === 'kimdan';
    const eHp = eliteHpAt(step);
    const eAtk = eliteAtkAt(step);
    const boss = {
      id: 'trial-' + ++monsterSeq, kind: 'trial', trialKind: info.trial, isTrialBoss: true, ownerId: player.id,
      mapId: mapOf(player), // GĐ59
      name: isKimdan ? 'Lôi Kiếp Ảnh' : isDai ? 'Tâm Ma Ảnh' : 'Thử Luyện Thú',
      x: 700, y: 452, hp: isKimdan ? eHp * 8 : isDai ? eHp * 6 : eHp * 4, maxHp: isKimdan ? eHp * 8 : isDai ? eHp * 6 : eHp * 4,
      atk: (isDai || isKimdan) ? Math.round(eAtk * 1.3 * 10) / 10 : eAtk,
      vx: 0, vy: 0, direction: 'down', lastAttackAt: 0, lastSkillAt: 0, bornAt: Date.now(), phase2: false,
    };
    monsters.set(boss.id, boss);
    io.emit('trial_started', { ownerId: player.id, ownerName: player.name, name: boss.name, monsterId: boss.id });
    socket.emit('notice', { text: `${boss.name} xuất hiện tại sân Đạo Quán! Đánh bại nó để mở khóa đột phá.` });
    console.log(`[thử thách] ${player.name} triệu hồi ${boss.name} (HP ${boss.hp}, công ${boss.atk})`);
  });

  // GĐ19 — Đột phá theo thang B6: Tiểu (chắc chắn) / Trung (đan + thắng Thử Luyện Thú, chắc chắn)
  // / Đại (đan + thắng Tâm Ma Ảnh + tỉ lệ theo công thức file; thất bại có hậu quả).
  // GĐ87 — Kim Đan (đan Kết Đan + thắng Lôi Kiếp Ảnh + tỉ lệ như Đại; trong Kim Đan chỉ có tiểu cảnh).
  // GĐ20: đã có đồng hồ ngày + tuổi thọ → cộng thọ theo B6 và hậu quả thua Đại
  // cảnh mức trung bình về đúng gốc (−10 năm tuổi thọ). Bế quan vẫn chưa làm.
  // GĐ40+: HỆ ĐỐI ĐẦU tổng quát — nhiệm vụ nào khai `duel` trong QUESTS
  // đều gọi được kẻ địch tay đôi khóa chủ nhân (tu sĩ thù địch, kẻ bắt
  // cóc...): chỉ người nhận nhiệm vụ đánh được/bị đánh, ở ngoài vùng an
  // toàn. start_rival giữ làm alias cho nút cũ (q_tusi).
  function spawnDuel(questId) {
    const def = QUESTS[questId];
    if (!def?.duel) return;
    const q = player.quests?.[questId];
    if (!q || q.state !== 'active') {
      socket.emit('interact_error', { message: `Hãy nhận nhiệm vụ “${def.name}” trước.` });
      return;
    }
    if (insideVillage(player.x, player.y, 0) || insideSect(player.x, player.y, 0)) {
      socket.emit('interact_error', { message: 'Đối thủ không dám vào vùng an toàn — hãy ra ngoài làng rồi đối đầu.' });
      return;
    }
    if ([...monsters.values()].some((m) => m.kind === 'trial' && m.trialKind === 'duel' && m.ownerId === player.id && m.questId === questId)) {
      socket.emit('interact_error', { message: `${def.duel.spawnName} đang chờ bạn rồi!` });
      return;
    }
    const step = globalStep(player.realm, player.tier);
    const eHp = eliteHpAt(step);
    const eAtk = eliteAtkAt(step);
    // GĐ86: Tu Sĩ Thù Địch quay lại mạnh hơn sau mỗi lần thua (thang cừu hận)
    const hpMul = questId === 'q_tusi' ? rivalHpMul(player) : def.duel.hpMul;
    const foe = {
      id: 'trial-' + ++monsterSeq, kind: 'trial', trialKind: 'duel', questId, isTrialBoss: true, ownerId: player.id,
      mapId: mapOf(player), // GĐ59
      name: def.duel.spawnName,
      x: Math.round(player.x + 130), y: Math.round(player.y),
      hp: Math.round(eHp * hpMul), maxHp: Math.round(eHp * hpMul), atk: Math.round(eAtk * 10) / 10,
      vx: 0, vy: 0, direction: 'left', lastAttackAt: 0, lastSkillAt: 0, bornAt: Date.now(), phase2: false,
    };
    initMonsterFx(foe);
    monsters.set(foe.id, foe);
    io.emit('trial_started', { ownerId: player.id, ownerName: player.name, name: foe.name, monsterId: foe.id });
    socket.emit('notice', { text: `⚔️ ${foe.name} xuất hiện! Hắn chỉ nhắm vào bạn — hãy đánh bại hắn!${questId === 'q_tusi' && (player.rivalWins || 0) > 0 ? ` (Hắn quay lại lần thứ ${(player.rivalWins || 0) + 1} — HP ×${hpMul}!)` : ''}` });
    console.log(`[đối đầu] ${player.name} đối đầu ${foe.name} (HP ${foe.hp}, công ${foe.atk})`);
  }
  socket.on('start_duel', (data) => { if (player && data?.questId) spawnDuel(data.questId); });
  socket.on('start_rival', () => { if (player) spawnDuel('q_tusi'); });

  socket.on('breakthrough', () => {
    if (!player) return;
    const info = breakInfoFor(player.realm, player.tier);
    if (!info) return;
    if (info.type === 'blocked_na') {
      socket.emit('interact_error', { message: 'Đột phá Nguyên Anh chưa mở trong phiên bản này.' });
      return;
    }
    const step = globalStep(player.realm, player.tier);
    const need = tuViNeedStep(step);
    if (player.tuVi < need) {
      socket.emit('interact_error', { message: `Chưa đủ Tu vi: ${player.tuVi}/${need}.` });
      return;
    }
    const applyBreak = () => {
      player.tuVi -= need;
      if (info.toRealm) {
        player.realm = info.toRealm;
        player.tier = info.toTier;
      } else {
        player.tier += 1;
      }
      // GĐ88: đột phá Kim Đan → tự lĩnh ngộ thần thông riêng của lớp
      if (info.type === 'kimdan') {
        const kdSk = (KD_SKILLS[player.classId] || [])[0];
        if (kdSk && !(player.skills || []).includes(kdSk.id)) {
          player.skills = [...(player.skills || []), kdSk.id];
          const slotNo = autoEquipIfFree(player, kdSk.id);
          socket.emit('notice', { text: `✦ Bạn lĩnh ngộ thần thông ${kdSk.name}!${slotNo ? ` (đã lắp vào ô ${slotNo})` : ' (mở Sổ công pháp để lắp vào ô chiêu)'}` });
        }
      }
      // GĐ100: Pháp Tu — lần đầu bước vào Trúc Cơ roll Biến Dị (5%, 1 lần duy nhất)
      if (player.classId === 'phaptu' && info.toRealm === 'tc' && classResOf(player).bienDi === undefined) {
        const bd = rollBienDi();
        classResOf(player).bienDi = bd;
        if (bd) socket.emit('notice', { text: `✦ Linh căn biến dị: ${bd}! Pháp thuật của bạn mang thêm hiệu ứng hệ ${bd}.` });
      }
      player.statPoints = (player.statPoints || 0) + info.points;
      if (player.counters) player.counters.breakthroughs = (player.counters.breakthroughs || 0) + 1; // GĐ27
      // GĐ20: cộng tuổi thọ đúng thang B6 (Trung LK +5 / Trung TC +10 / Đại +50 năm)
      if (info.lifespan) player.lifespan = (player.lifespan ?? 80) + info.lifespan;
      // GĐ25: thọ dương trở lại sau khi đã vào ân hạn → ĐƯỢC CỨU, hủy ân hạn
      if (player.graceStartDay != null && checkLifespan(player) === 'rescued') {
        socket.emit('notice', { text: `✦ Đột phá cộng thêm ${info.lifespan} năm thọ — thọ nguyên dương trở lại, THOÁT ân hạn tọa hóa!` });
        socket.emit('lifespan_grace', { graceDaysLeft: null, lifespanLeft: lifespanLeftOf(player) });
      }
      player.hp = Math.min(player.hp, maxHpEff(player));
      player.mp = Math.min(player.mp, maxMpEff(player));
      persistPlayer(player);
      syncChar(socket, player);
      io.emit('player_breakthrough', { id: player.id, name: player.name, tier: player.tier, realm: player.realm });
      socket.emit('breakthrough_ok', { tier: player.tier, realm: player.realm, gainedPoints: info.points, type: info.type, lifespanGain: info.lifespan || 0 });
      console.log(`[tu luyện] ${player.name} đột phá (${info.type}) → ${player.realm} tầng ${player.tier} (+${info.points} điểm đột phá, +${info.lifespan || 0} năm thọ)`);
    };
    if (info.type === 'tieu') {
      applyBreak();
      return;
    }
    // Trung / Đại / Kim Đan: cần đan + đã thắng thử thách
    const brkLabel = info.type === 'dai' ? 'Đại' : info.type === 'kimdan' ? 'Kim Đan' : 'Trung';
    const trialName = info.type === 'dai' ? 'Tâm Ma Ảnh' : info.type === 'kimdan' ? 'Lôi Kiếp Ảnh' : 'Thử Luyện Thú';
    if ((player.inventory[info.pill] || 0) < 1) {
      socket.emit('interact_error', { message: `Đột phá ${brkLabel} cảnh cần ${ITEMS[info.pill].name} — mua ở Tiệm Đan Dược hoặc luyện chế (nghề Đan Sư).` });
      return;
    }
    if (player.trialReady !== info.trial) {
      socket.emit('interact_error', { message: `Cần đánh bại ${trialName} tại Đạo Quán trước (bấm nút Thử thách khi ở sân Đạo Quán).` });
      return;
    }
    player.inventory[info.pill] -= 1;
    if (player.inventory[info.pill] <= 0) delete player.inventory[info.pill];
    player.trialReady = null;
    if (info.type === 'trung') {
      applyBreak();
      return;
    }
    // Đại / Kim Đan cảnh — tỉ lệ thành công theo file: 0.60 (đã gồm đan bắt buộc) + 0.10 Đan Hộ Mạch
    // + 0.10 chỉ số chính của lớp ≥ 40 − 0.05 × (số linh căn − 1) + 0.10 × số lần thất bại liên tiếp;
    // kẹp [0.10, 0.95]; 3 lần thua liên tiếp → lần kế chắc chắn. (Cộng tài năng + năm tháng ở tầng 9:
    // bản online chưa có 2 hệ đó nên bỏ qua — đã báo người chơi. GĐ87: Kim Đan dùng cùng công thức Đại.)
    let chance = 0.6;
    if ((player.inventory.dan_ho_mach || 0) > 0) {
      player.inventory.dan_ho_mach -= 1;
      if (player.inventory.dan_ho_mach <= 0) delete player.inventory.dan_ho_mach;
      chance += 0.1;
    }
    if (attackStatOf(player).value >= 40) chance += 0.1;
    chance -= 0.05 * ((player.linhCan?.count || 1) - 1);
    chance += 0.1 * (player.failStreak || 0);
    chance = Math.min(0.95, Math.max(0.1, chance));
    const success = (player.failStreak || 0) >= 3 || Math.random() < chance;
    if (success) {
      player.failStreak = 0;
      applyBreak();
      socket.emit('notice', { text: `✦ Đột phá ${brkLabel} cảnh THÀNH CÔNG (tỉ lệ ${Math.round(chance * 100)}%) — chúc mừng ${info.type === 'kimdan' ? 'Kim Đan' : 'Trúc Cơ'}!` });
      return;
    }
    player.failStreak = (player.failStreak || 0) + 1;
    const roll = Math.random();
    let msg;
    if (roll < 0.5) {
      const lose = Math.floor(player.tuVi * 0.3);
      player.tuVi -= lose;
      msg = `Đột phá ${brkLabel} cảnh THẤT BẠI (nhẹ, tỉ lệ ${Math.round(chance * 100)}%): mất ${lose} Tu vi. Thua ${player.failStreak} lần liên tiếp — lần sau +10% tỉ lệ.`;
    } else if (roll < 0.85) {
      // GĐ20: về đúng thiết kế gốc — trừ 10 năm TUỔI THỌ (GĐ19 từng tạm quy đổi sang Tu vi)
      player.lifespan = (player.lifespan ?? 80) - 10;
      const left = player.lifespan - ageOf(player);
      msg = `Đột phá ${brkLabel} cảnh THẤT BẠI (trung bình): mất 10 năm tuổi thọ — thọ nguyên còn ${left} năm.`;
      if (left <= 5) msg += ' ⚠ Thọ nguyên sắp cạn, hãy đột phá để kéo dài tuổi thọ!';
    } else if ((player.statPenaltyStacks || 0) < 3) {
      player.statPenaltyStacks += 1;
      for (const k of STAT_KEYS) player.stats[k] = Math.max(1, Math.floor(player.stats[k] * 0.9));
      player.hp = Math.min(player.hp, maxHpEff(player));
      player.mp = Math.min(player.mp, maxMpEff(player));
      msg = `Đột phá ${brkLabel} cảnh THẤT BẠI (nặng): toàn bộ chỉ số gốc −10% VĨNH VIỄN (cộng dồn tối đa 3 lần)!`;
    } else {
      const lose = Math.floor(player.tuVi * 0.3);
      player.tuVi -= lose;
      msg = `Đột phá ${brkLabel} cảnh THẤT BẠI: mất ${lose} Tu vi (đã chạm trần −chỉ số nên không trừ thêm).`;
    }
    persistPlayer(player);
    syncChar(socket, player);
    socket.emit('breakthrough_fail', { message: msg, chance: Math.round(chance * 100), failStreak: player.failStreak });
    console.log(`[tu luyện] ${player.name} đột phá ${brkLabel} cảnh THẤT BẠI (tỉ lệ ${Math.round(chance * 100)}%, thua liên tiếp ${player.failStreak})`);
  });

  // Cộng điểm chỉ số: điểm tạo nhân vật +1/điểm; điểm đột phá +2/điểm
  socket.on('allocate_stat', (data) => {
    if (!player || !data) return;
    const stat = data.stat;
    if (!STAT_KEYS.includes(stat)) return;
    if (data.pool === 'stat') {
      if ((player.statPoints || 0) <= 0) return;
      player.statPoints -= 1;
      player.stats[stat] += 2;
      player.allocStat = player.allocStat || {};
      player.allocStat[stat] = (player.allocStat[stat] || 0) + 1; // GĐ74: sổ điểm đã cộng (để reset)
    } else {
      if ((player.freePoints || 0) <= 0) return;
      player.freePoints -= 1;
      player.stats[stat] += 1;
      player.allocFree = player.allocFree || {};
      player.allocFree[stat] = (player.allocFree[stat] || 0) + 1; // GĐ74: sổ điểm đã cộng (để reset)
    }
    // Chỉ số tăng có thể nâng trần HP/Chân nguyên — kẹp lại giá trị hiện tại
    player.hp = Math.min(player.hp, maxHpEff(player));
    player.mp = Math.min(player.mp, maxMpEff(player));
    persistPlayer(player);
    syncChar(socket, player);
    console.log(`[tu luyện] ${player.name} cộng điểm vào ${stat} → ${player.stats[stat]}`);
  });

  // GĐ55 (feedback buổi test 23/10): cộng điểm HÀNG LOẠT — client cho chọn
  // trước bằng +/− (giữ nút tăng nhanh, trừ để sửa) rồi bấm OK mới gửi gói
  // này. Server kiểm tổng điểm từng bể rồi áp một lần, tránh cộng dở dang.
  socket.on('allocate_stats', (data) => {
    if (!player || !data) return;
    if (player.hp <= 0) return; // GĐ128: linh thể chỉ đi lại, không tương tác được
    const clean = (obj) => {
      if (!obj || typeof obj !== 'object') return {};
      const out = {};
      for (const [stat, n] of Object.entries(obj)) {
        if (!STAT_KEYS.includes(stat)) continue;
        const v = Math.floor(Number(n));
        if (Number.isFinite(v) && v > 0) out[stat] = v;
      }
      return out;
    };
    const freeReq = clean(data.free);
    const statReq = clean(data.stat);
    const freeTotal = Object.values(freeReq).reduce((a, b) => a + b, 0);
    const statTotal = Object.values(statReq).reduce((a, b) => a + b, 0);
    if (freeTotal === 0 && statTotal === 0) return;
    if (freeTotal > (player.freePoints || 0) || statTotal > (player.statPoints || 0)) {
      socket.emit('interact_error', { message: 'Số điểm chọn vượt quá điểm đang có — bảng đã nạp lại số thật.' });
      syncChar(socket, player);
      return;
    }
    for (const [stat, n] of Object.entries(freeReq)) player.stats[stat] += n;
    for (const [stat, n] of Object.entries(statReq)) player.stats[stat] += n * 2;
    player.freePoints -= freeTotal;
    player.statPoints -= statTotal;
    // GĐ74: ghi sổ điểm đã cộng để reset được (cộng dồn theo từng chỉ số)
    player.allocFree = player.allocFree || {};
    player.allocStat = player.allocStat || {};
    for (const [stat, n] of Object.entries(freeReq)) player.allocFree[stat] = (player.allocFree[stat] || 0) + n;
    for (const [stat, n] of Object.entries(statReq)) player.allocStat[stat] = (player.allocStat[stat] || 0) + n;
    player.hp = Math.min(player.hp, maxHpEff(player));
    player.mp = Math.min(player.mp, maxMpEff(player));
    persistPlayer(player);
    syncChar(socket, player);
    console.log(`[tu luyện] ${player.name} cộng điểm hàng loạt: tự do ${freeTotal} điểm, đột phá ${statTotal} điểm`);
  });

  // GĐ74 (feedback 25/10): reset chỉ số bằng Linh thạch — hoàn toàn bộ
  // điểm ĐÃ CỘNG (theo sổ allocFree/allocStat) về lại bể điểm, trừ phí.
  // Phí TẠM: 100 Linh thạch Hạ phẩm. Giới hạn thật: chỉ hoàn được điểm
  // cộng TỪ GĐ74 trở đi (sổ mới ghi từ đây); điểm cộng trước đó không có
  // sổ nên không hoàn được — không tự ý trừ chỉ số gốc của người chơi.
  const RESET_STATS_COST = 100;
  socket.on('reset_stats', () => {
    if (!player) return;
    const af = player.allocFree || {}, as = player.allocStat || {};
    const totalFree = Object.values(af).reduce((a, b) => a + b, 0);
    const totalStat = Object.values(as).reduce((a, b) => a + b, 0);
    if (totalFree === 0 && totalStat === 0) {
      socket.emit('interact_error', { message: 'Chưa có điểm nào đã cộng để reset.' });
      return;
    }
    if ((player.stones || 0) < RESET_STATS_COST) {
      socket.emit('interact_error', { message: `Reset chỉ số cần ${RESET_STATS_COST} Linh thạch (đang có ${player.stones || 0}).` });
      return;
    }
    for (const [stat, n] of Object.entries(af)) player.stats[stat] -= n;
    for (const [stat, n] of Object.entries(as)) player.stats[stat] -= n * 2;
    player.freePoints = (player.freePoints || 0) + totalFree;
    player.statPoints = (player.statPoints || 0) + totalStat;
    player.allocFree = {}; player.allocStat = {};
    player.stones -= RESET_STATS_COST;
    player.hp = Math.min(player.hp, maxHpEff(player));
    player.mp = Math.min(player.mp, maxMpEff(player));
    persistPlayer(player);
    syncChar(socket, player);
    notice(`Đã reset chỉ số (−${RESET_STATS_COST} Linh thạch): hoàn ${totalFree} điểm tự do, ${totalStat} điểm đột phá.`);
    console.log(`[tu luyện] ${player.name} reset chỉ số: hoàn ${totalFree} tự do + ${totalStat} đột phá`);
  });

  // ---- Kinh tế + Nhiệm vụ (GĐ8) ----
  const nearPoint = (pt) => !!player && Math.hypot(player.x - pt.x, player.y - pt.y) <= INTERACT_RANGE;
  const notice = (text) => socket.emit('notice', { text });

  socket.on('shop_buy', (data) => {
    if (!player || !data) return;
    if (player.hp <= 0) return; // GĐ128: linh thể chỉ đi lại, không tương tác được
    const shop = SHOPS[data.shopId];
    let price = shop?.sell?.[data.itemId];
    if (!shop || !price || !ITEMS[data.itemId]) return;
    if (!nearPoint(shopPointFor(player, data.shopId) || shop.point)) {
      socket.emit('interact_error', { message: `Hãy tới ${shop.name} để mua bán.` });
      return;
    }
    // GĐ40+: thương nhân lưu động — chỉ bán khi đang ghé làng, theo kho
    // của ngày (món + giá dao động + số lượng ít, hết là hết)
    let merchantEntry = null;
    if (data.shopId === 'luu_dong') {
      if (!merchantPresent()) {
        socket.emit('interact_error', { message: 'Thương Nhân Lưu Động hiện không có ở làng — ông ta đi buôn thất thường, hôm khác quay lại hoặc đặt hàng trước.' });
        return;
      }
      merchantEntry = merchantToday().stock[data.itemId];
      if (!merchantEntry) {
        socket.emit('interact_error', { message: `Hôm nay thương nhân không mang ${ITEMS[data.itemId].name} — đặt hàng để lần ghé sau ông ta đem tới!` });
        return;
      }
      // GĐ86: món thứ 4 trong kho chỉ khách quen (rep ≥3) mới mua được
      if (!Object.keys(merchantToday().stock).slice(0, merchantStockCount(player)).includes(data.itemId)) {
        socket.emit('interact_error', { message: 'Món thứ 4 trong kho chỉ dành cho khách quen — mua vài lần với thương nhân để lên mức khách quen nhé.' });
        return;
      }
      if (merchantEntry.qty <= 0) {
        socket.emit('interact_error', { message: `${ITEMS[data.itemId].name} đã HẾT hàng hôm nay!` });
        return;
      }
      price = Math.ceil(merchantEntry.price * merchantRepDiscount(player)); // GĐ86: giảm khách quen
    }
    // GĐ30: Tiệm Tông Môn chỉ bán cho đệ tử tông môn
    if (data.shopId === 'tiem_tong_mon' && !player.sect) {
      socket.emit('interact_error', { message: 'Tiệm Tông Môn chỉ bán cho đệ tử tông môn. Hãy gia nhập một tông môn trước.' });
      return;
    }
    // GĐ24: thiện cảm với chủ tiệm — ≤−50 từ chối giao dịch; ≥50 giảm giá mua 10%
    const npcId = SHOP_NPC[data.shopId];
    const aff = npcId ? affinityOf(player, npcId) : 0;
    if (npcId && aff <= -50) {
      socket.emit('interact_error', { message: `${NPC_BY_ID[npcId].name} từ chối giao dịch với bạn (thiện cảm ${aff} — quá thấp).` });
      return;
    }
    // GĐ86: giảm khách quen của thương nhân KHÔNG cộng dồn với giảm thiện cảm
    const repDisc = data.shopId === 'luu_dong' ? merchantRepDiscount(player) : 1;
    const discounted = npcId && aff >= 50 && repDisc === 1;
    if (discounted) price = Math.ceil(price * 0.9);
    if ((player.stones || 0) < price) {
      socket.emit('interact_error', { message: `Không đủ Linh thạch (cần ${price}, đang có ${player.stones || 0}).` });
      return;
    }
    player.stones -= price;
    if (merchantEntry) merchantEntry.qty -= 1; // GĐ40+: trừ kho ngày của thương nhân
    if (data.shopId === 'luu_dong') player.merchantRep = (player.merchantRep || 0) + 1; // GĐ86: mua hàng tăng khách quen
    player.inventory[data.itemId] = (player.inventory[data.itemId] || 0) + 1;
    persistPlayer(player);
    syncChar(socket, player);
    notice(`Đã mua ${ITEMS[data.itemId].name} (−${price} Linh thạch${discounted ? ', đã giảm 10% nhờ thiện cảm' : repDisc < 1 ? `, đã giảm ${Math.round((1 - repDisc) * 100)}% nhờ khách quen` : ''})`);
    if (npcId) addAffinity(socket, player, npcId, 1); // GĐ24: giao dịch quen mặt +1
    console.log(`[kinh tế] ${player.name} mua ${data.itemId} tại ${data.shopId}: −${price} LT (còn ${player.stones})`);
  });

  socket.on('shop_sell', (data) => {
    if (!player || !data) return;
    if (player.hp <= 0) return; // GĐ128: linh thể chỉ đi lại, không tương tác được
    if (data.shopId === 'luu_dong' && !merchantPresent()) { // GĐ40+
      socket.emit('interact_error', { message: 'Thương Nhân Lưu Động hiện không có ở làng.' });
      return;
    }
    const shop = SHOPS[data.shopId];
    const price = shop?.buy?.[data.itemId];
    if (!shop || !price || !ITEMS[data.itemId]) return;
    if (!nearPoint(shopPointFor(player, data.shopId) || shop.point)) {
      socket.emit('interact_error', { message: `Hãy tới ${shop.name} để mua bán.` });
      return;
    }
    // GĐ30: Tiệm Tông Môn chỉ giao dịch với đệ tử tông môn
    if (data.shopId === 'tiem_tong_mon' && !player.sect) {
      socket.emit('interact_error', { message: 'Tiệm Tông Môn chỉ giao dịch với đệ tử tông môn.' });
      return;
    }
    // GĐ24: ≤−50 chủ tiệm từ chối cả mua lẫn bán
    const npcId = SHOP_NPC[data.shopId];
    if (npcId && affinityOf(player, npcId) <= -50) {
      socket.emit('interact_error', { message: `${NPC_BY_ID[npcId].name} từ chối giao dịch với bạn (thiện cảm quá thấp).` });
      return;
    }
    if ((player.inventory[data.itemId] || 0) < 1) return;
    player.inventory[data.itemId] -= 1;
    player.stones = (player.stones || 0) + price;
    persistPlayer(player);
    syncChar(socket, player);
    notice(`Đã bán ${ITEMS[data.itemId].name} (+${price} Linh thạch)`);
    if (player.classId === 'ytu' && Y_MEDICINES.has(data.itemId)) addYDuc(player, Y_SELL_YDUC); // GĐ104: Y Tu bán thuốc → tích Y Đức
    if (npcId) addAffinity(socket, player, npcId, 1);
    console.log(`[kinh tế] ${player.name} bán ${data.itemId} tại ${data.shopId}: +${price} LT (có ${player.stones})`);
  });

  socket.on('quest_accept', (data) => {
    if (!player || !data) return;
    if (player.hp <= 0) return; // GĐ128: linh thể chỉ đi lại, không tương tác được
    const def = QUESTS[data.questId];
    if (!def) return;
    // GĐ24: nhiệm vụ RIÊNG nhận ngay tại NPC khi thiện cảm đủ cao
    // GĐ90: NPC có thể là NPC làng hoặc NPC thành phố (đúng map mới tính).
    if (def.npcId) {
      const npc = questNpcFor(player, def.npcId);
      if (!npc) {
        socket.emit('interact_error', { message: 'Tới gặp người giao nhiệm vụ để nhận nhiệm vụ riêng.' });
        return;
      }
      if (Math.hypot(player.x - npc.x, player.y - npc.y) > 95) {
        socket.emit('interact_error', { message: `Tới gặp ${npc.name} để nhận nhiệm vụ riêng.` });
        return;
      }
      if (affinityOf(player, def.npcId) < (def.minAffinity ?? 50)) {
        socket.emit('interact_error', { message: `Nhiệm vụ riêng chỉ mở khi thiện cảm với ${npc.name} ≥ ${def.minAffinity ?? 50} (hiện ${affinityOf(player, def.npcId)}).` });
        return;
      }
      // GĐ131: nhiệm vụ nghề — phải cùng nghề mới nhận được (kiểm tra TRƯỚC cờ chuỗi để báo đúng lý do: sai nghề thì cờ chuỗi cũng không có ý nghĩa)
      if (def.jobId && player.job?.jobId !== def.jobId) {
        socket.emit('interact_error', { message: `Nhiệm vụ này của nghề ${JOBS[def.jobId].name} — bái sư ${JOBS[def.jobId].name} rồi hãy nhận.` });
        return;
      }
      // GĐ40: nhiệm vụ chuỗi — phải xong phần trước (cờ flags)
      if (def.requiresFlag && !player.flags?.[def.requiresFlag]) {
        socket.emit('interact_error', { message: 'Hãy hoàn thành phần trước của vụ việc này đã.' });
        return;
      }
    } else if (!nearPoint(BOARD_POINT)) {
      socket.emit('interact_error', { message: 'Tới Bảng treo thưởng giữa làng để nhận nhiệm vụ.' });
      return;
    }
    // GĐ40+: vụ án luân phiên — chưa tới ngày mở thì không nhận được
    if (def.caseCycle && !caseActiveToday(def)) {
      socket.emit('interact_error', { message: `“${def.name}” hiện chưa mở — vụ án luân phiên theo ngày, quay lại xem bảng vào ngày khác.` });
      return;
    }
    if (player.quests[data.questId]) return; // đang làm hoặc chờ trả
    player.quests[data.questId] = { progress: 0, state: 'active' };
    // GĐ40+: nhận vụ trộm → gán thủ phạm (hạt giống nhân vật + ngày, để manh mối nhất quán)
    if (data.questId === 'case_trom') {
      const seed = dayHash([...player.name].reduce((a, c) => a + c.charCodeAt(0), 0) + worldClock().dayIndex * 7);
      player.caseCulprit = CASE_SUSPECTS[seed % CASE_SUSPECTS.length].id;
      player.caseClues = {};
    }
    persistPlayer(player);
    syncChar(socket, player);
    notice(`Đã nhận nhiệm vụ “${def.name}”`);
    // GĐ86: nhận lại đối đầu sau khi đã thắng → báo trước hắn mạnh hơn
    if (data.questId === 'q_tusi' && (player.rivalWins || 0) > 0) {
      notice(`⚔️ Tu Sĩ Thù Địch quay lại lần thứ ${(player.rivalWins || 0) + 1} — lần này HP ×${rivalHpMul(player)}!`);
    }
  });

  socket.on('quest_claim', (data) => {
    if (!player || !data) return;
    if (player.hp <= 0) return; // GĐ128: linh thể chỉ đi lại, không tương tác được
    const def = QUESTS[data.questId];
    const q = player.quests?.[data.questId];
    if (!def || !q) return;
    // GĐ24: nhiệm vụ riêng trả tại NPC của nó; GĐ74: nhiệm vụ bảng trả
    // được CẢ tại Bảng treo thưởng lẫn Nhà Trưởng Làng (bạn bè báo: nhận
    // ở bảng, làm xong rồi mà ra bảng không trả được).
    // GĐ90: NPC có thể là NPC làng hoặc NPC thành phố (đúng map mới tính).
    if (def.npcId) {
      const npc = questNpcFor(player, def.npcId);
      if (!npc) {
        socket.emit('interact_error', { message: 'Tới gặp người giao nhiệm vụ để trả nhiệm vụ.' });
        return;
      }
      if (Math.hypot(player.x - npc.x, player.y - npc.y) > 95) {
        socket.emit('interact_error', { message: `Tới gặp ${npc.name} để trả nhiệm vụ.` });
        return;
      }
    } else if (!nearPoint(ELDER_POINT) && !nearPoint(BOARD_POINT)) {
      socket.emit('interact_error', { message: 'Tới Bảng treo thưởng hoặc Nhà Trưởng Làng để trả nhiệm vụ.' });
      return;
    }
    if ((def.kind === 'kill' || def.kind === 'clues' || def.kind === 'talk' || def.kind === 'explore' || def.kind === 'craft' || def.kind === 'boss' || def.kind === 'escort' || def.kind === 'delivery') && q.state !== 'done') {
      socket.emit('interact_error', { message: `Chưa hoàn thành “${def.name}”: tiến độ ${q.progress || 0}/${def.target}.` });
      return;
    }
    if (def.kind === 'item') {
      if ((player.inventory[def.itemId] || 0) < def.target) {
        socket.emit('interact_error', { message: `Cần mang theo ${def.target} ${ITEMS[def.itemId].name} (đang có ${player.inventory[def.itemId] || 0}).` });
        return;
      }
      player.inventory[def.itemId] -= def.target;
    }
    delete player.quests[data.questId];
    // GĐ40: cờ chuỗi vụ án — phần 1 đặt cờ mở phần 2; phần 2 gỡ cờ để vụ án lặp lại
    if (def.setsFlag) { player.flags = player.flags || {}; player.flags[def.setsFlag] = true; }
    if (def.clearsFlag && player.flags) delete player.flags[def.clearsFlag];
    // GĐ86: thắng Tu Sĩ Thù Địch → tăng bậc cừu hận; lần thắng sau thưởng thêm 25 LT/bậc
    let rivalBonus = 0;
    if (data.questId === 'q_tusi') {
      player.rivalWins = (player.rivalWins || 0) + 1;
      rivalBonus = 25 * (player.rivalWins - 1);
    }
    player.stones = (player.stones || 0) + def.rewardStones + rivalBonus;
    if (def.tuViReward) { // GĐ38: nhiệm vụ B11 thưởng cả Tu vi
      player.tuVi = (player.tuVi || 0) + def.tuViReward;
      if (player.counters) player.counters.totalTuVi = (player.counters.totalTuVi || 0) + def.tuViReward;
    }
    let extra = '';
    if (def.rewardItem && ITEMS[def.rewardItem]) {
      player.inventory[def.rewardItem] = (player.inventory[def.rewardItem] || 0) + 1;
      extra = ` + 1 ${ITEMS[def.rewardItem].name}`;
    }
    // GĐ119 bước 4: trả nhiệm vụ có tỉ lệ thưởng thêm trang bị (nhiệm vụ
    // thành phố cao hơn nhiệm vụ bảng); đồ thưởng theo hướng tu + hệ người chơi.
    const qRarity = GEAR.questGearFor(!!def.npcId);
    if (qRarity) {
      const qgear = randomGearFor(player, [qRarity]);
      player.gearBag = player.gearBag || {};
      player.gearBag[qgear.uid] = qgear;
      extra += ` + ⚔️ ${qgear.name}`;
    }
    persistPlayer(player);
    syncChar(socket, player);
    notice(`Trả nhiệm vụ “${def.name}” — nhận ${def.rewardStones} Linh thạch${rivalBonus > 0 ? ` + ${rivalBonus} thưởng cừu hận` : ''}${extra}!`);
    if (player.counters) player.counters.questsDone = (player.counters.questsDone || 0) + 1; // GĐ27
    // GĐ30: nhiệm vụ BẢNG cho CÔNG TRẠNG; đủ 10 nhiệm vụ bảng → THƯ TIẾN CỬ
    if (!def.npcId) {
      player.boardQuests = (player.boardQuests || 0) + 1;
      if (def.merit) {
        player.merit = (player.merit || 0) + def.merit;
        notice(`⚜️ +${def.merit} Công trạng (tổng ${player.merit}) — tích đủ để xin vào tông môn.`);
      }
      if (player.boardQuests >= 10 && !player.letterGiven) {
        player.letterGiven = true;
        player.inventory.thu_tien_cu = (player.inventory.thu_tien_cu || 0) + 1;
        notice('✉️ Hoàn thành 10 nhiệm vụ bảng — Trưởng Làng trao bạn THƯ TIẾN CỬ! Tới gặp Sứ Giả Tông Môn ở quảng trường khi Thiên Kiếm Môn mở chiêu mộ (tháng 3).');
      }
      persistPlayer(player);
      syncChar(socket, player);
    }
    // GĐ24: trả nhiệm vụ bảng → Trưởng Làng quý thêm +5; nhiệm vụ riêng → +10 với NPC đó
    if (def.npcId) addAffinity(socket, player, def.npcId, 10);
    else addAffinity(socket, player, 'npc_truonglang', 5);
    console.log(`[nhiệm vụ] ${player.name} trả ${data.questId}: +${def.rewardStones} LT`);
  });

  // GĐ24: TRÒ CHUYỆN với NPC — mỗi ngày game +2 thiện cảm (lần đầu gặp trong
  // ngày), kèm lời thoại theo tính cách + mức thiện cảm và các nút hành động
  // (nhận/trả nhiệm vụ riêng, trả nhiệm vụ bảng với Trưởng Làng).
  // GĐ59: TRẬN DỊCH CHUYỂN — xin danh sách đích + đi. Phải đứng gần trận
  // của map hiện tại (chống gọi từ xa); cổng cảnh giới/tông môn kiểm ở đây.
  socket.on('travel_list', () => {
    if (!player) return;
    socket.emit('travel_info', { from: mapOf(player), list: destinationsFor(player) });
  });
  socket.on('travel_to', (data) => {
    if (!player || !data || typeof data.mapId !== 'string') return;
    if (player.hp <= 0) { socket.emit('interact_error', { message: 'Bạn đang gục ngã, không thể dịch chuyển — chờ đồng đội hồi sinh.' }); return; } // GĐ104
    if (player.meditating) stopMeditation(player, 'travel'); // GĐ76: dịch chuyển là dứt thiền
    if (player.preaching) stopPreaching(player, 'travel'); // GĐ103: dịch chuyển là dứt Thuyết Pháp
    if (player.studying) stopStudying(player, 'travel'); // GĐ105: dịch chuyển là dứt đọc sách
    player.nhoZone = null; player.tranBuff = null; player.tranDebuff = null; player.tranSeal = null; // GĐ105: dịch chuyển xóa Ý Cảnh; GĐ135: dịch chuyển xóa trận tạm (Trận Dịch Chuyển bền thì giữ lại)
    const dest = data.mapId;
    const info = destinationsFor(player).find((d) => d.id === dest);
    if (!info) { socket.emit('interact_error', { message: 'Không có đường dịch chuyển tới đó từ nơi này.' }); return; }
    const curPortal = mapOf(player) === HOME_MAP ? { x: 1080, y: 600 } : (MAP_RUNTIME.get(mapOf(player)) || {}).portal;
    if (!curPortal || Math.hypot(player.x - curPortal.x, player.y - curPortal.y) > 130) {
      socket.emit('interact_error', { message: 'Hãy đứng cạnh Trận Dịch Chuyển rồi mới lên đường.' });
      return;
    }
    if (dest === 'thach_lam') {
      // Thạch Lâm vẫn là vùng trong map nhà (GĐ57) — cổng tông môn giữ nguyên
      if (!info.canEnter) { socket.emit('interact_error', { message: 'Bí Cảnh Thạch Lâm chỉ mở cho đệ tử Thiên Kiếm Môn / Huyền Thiên Tông.' }); return; }
      switchPlayerMap(socket, player, HOME_MAP, { x: REALM_ENTRY.x, y: REALM_ENTRY.y });
      socket.emit('notice', { text: '🌀 Dịch chuyển tới Bí Cảnh Thạch Lâm!' });
      return;
    }
    if (!info.canEnter) { socket.emit('interact_error', { message: `Chưa thể tới ${info.name} — ${info.needText}.` }); return; }
    const rt = MAP_RUNTIME.get(dest);
    const pos = dest === HOME_MAP ? { x: 1080, y: 664 } : { x: rt.portal.x, y: rt.portal.y - 56 };
    const method = data.method === 'fly' || data.method === 'boat' ? data.method : 'portal';
    if (method === 'fly') {
      // GĐ60: NGỰ KIẾM — chỉ Kim Đan, miễn phí nhưng chậm theo số chặng
      if ((REALM_ORDER[player.realm || 'pham'] ?? 0) < 3) { socket.emit('interact_error', { message: 'Chỉ tu sĩ Kim Đan mới ngự kiếm phi hành được.' }); return; }
      startJourney(socket, player, dest, 'fly');
      return;
    }
    if (method === 'boat') {
      // GĐ60: THUYỀN — chỉ chạy tuyến Thanh Vân Thành ↔ đảo ngoài biển
      const cur = mapOf(player);
      const okLeg = (cur === 'thanh_van_thanh' && BOAT_ONLY.has(dest)) || (BOAT_ONLY.has(cur) && dest === 'thanh_van_thanh');
      if (!okLeg) { socket.emit('interact_error', { message: 'Thuyền chỉ chạy tuyến Thanh Vân Thành ↔ đảo ngoài biển.' }); return; }
      startJourney(socket, player, dest, 'boat');
      return;
    }
    // Trận Dịch Chuyển: tức thì nhưng tốn Linh thạch (đảo thì không tới được)
    if (BOAT_ONLY.has(dest)) { socket.emit('interact_error', { message: `${info.name} là đảo ngoài biển — trận dịch chuyển không tới được. Hãy đi thuyền từ Thanh Vân Thành (hoặc ngự kiếm nếu đã Kim Đan).` }); return; }
    const cost = travelCostFor(player, dest);
    if ((player.stones || 0) < cost) {
      socket.emit('interact_error', { message: `Không đủ Linh thạch để dịch chuyển — cần ${cost}, đang có ${player.stones || 0}. Hãy nhận việc hộ tống thương nhân ở Lái Buôn để kiếm thêm (hoặc ngự kiếm nếu đã Kim Đan).` });
      return;
    }
    if (cost > 0) { player.stones -= cost; persistPlayer(player); }
    switchPlayerMap(socket, player, dest, pos);
    socket.emit('notice', { text: cost > 0 ? `🌀 Đã tới ${info.name} (−${cost} Linh thạch)` : `🌀 Đã tới ${info.name}` });
    if (cost > 0) syncChar(socket, player);
  });

  // GĐ60: NHẬN / HỦY việc hộ tống thương nhân (nói chuyện với Lái Buôn)
  socket.on('escort_accept', (data) => {
    if (!player || !data || typeof data.mapId !== 'string') return;
    if (player.escort) { socket.emit('interact_error', { message: 'Bạn đang hộ tống một chuyến rồi — giao xong hoặc bỏ chuyến đã.' }); return; }
    const npc = NPC_BY_ID.npc_laibuan;
    if (mapOf(player) !== HOME_MAP || Math.hypot(player.x - npc.x, player.y - npc.y) > 110) {
      socket.emit('interact_error', { message: 'Hãy tới gặp Lái Buôn (cạnh Trận Dịch Chuyển ở quảng trường) để nhận việc.' });
      return;
    }
    const mission = escortDestinationsFor(player).find((d) => d.id === data.mapId);
    if (!mission) { socket.emit('interact_error', { message: 'Không có chuyến hộ tống tới đó cho cảnh giới của bạn.' }); return; }
    const rt = MAP_RUNTIME.get(mission.id);
    const mer = spawnEscortMerchant(player);
    player.escort = {
      dest: mission.id, merchantId: mer.id, reward: mission.reward, ambushDone: false,
      delivery: { x: Math.round(rt.w / 2), y: Math.round(rt.h / 2) },
    };
    persistPlayer(player);
    socket.emit('escort_started', { dest: mission.id, destName: mission.name, reward: mission.reward });
    socket.emit('notice', { text: `🧳 Đã nhận hộ tống! Đưa thương nhân tới điểm giao hàng ở GIỮA ${mission.name} — đi qua Trận Dịch Chuyển là miễn phí cho chuyến này. Cẩn thận quái phục kích!` });
    syncChar(socket, player);
  });
  socket.on('escort_abandon', () => {
    if (!player || !player.escort) return;
    players.delete(player.escort.merchantId);
    player.escort = null;
    persistPlayer(player);
    socket.emit('escort_abandoned', {});
    socket.emit('notice', { text: 'Đã bỏ chuyến hộ tống — thương nhân quay về làng an toàn.' });
    syncChar(socket, player);
  });

  // GĐ60: TỔNG QUAN BẢN ĐỒ (bấm vào minimap) — chi tiết map hiện tại + mọi
  // map: quái gì, đặc sản gì, cổng khóa ra sao, đi hết bao nhiêu Linh thạch.
  // GĐ63: map nhà không có decor sinh tự động — lấy cây + nhà từ hằng số
  // thế giới để canvas tổng quan ở làng cũng có hình (trước đây trống trơn).
  const HOME_DECOR = [
    ...TREE_TRUNKS.map((o) => ({ x: Math.round(o.x + o.w / 2), y: Math.round(o.y + o.h / 2), kind: 'tree' })), // TREE_TRUNKS đã là hộp va chạm {x,y,w,h}
    ...HOUSE_OBSTACLES.map((o) => ({ x: Math.round(o.x + o.w / 2), y: Math.round(o.y + o.h / 2), kind: 'house' })),
  ];
  socket.on('map_overview', () => {
    if (!player) return;
    const cur = mapOf(player);
    const dests = destinationsFor(player);
    // GĐ60: quái bí cảnh Thạch Lâm là vùng riêng trong map nhà — tách đúng từng map:
    // làng/farm chỉ hiện Sói Xám, Dơi Đen, Thạch Quái; mục Bí Cảnh Thạch Lâm
    // hiện Kiếm Ma, Huyết Lang, Thạch Khôi Lỗi (trước đây gộp nhầm quái bí cảnh
    // vào làng và để mục Bí Cảnh Thạch Lâm trống 0 quái trong panel tổng quan).
    const DUNGEON_MONSTERS = [{ name: 'Kiếm Ma', count: 4 }, { name: 'Huyết Lang', count: 4 }, { name: 'Thạch Khôi Lỗi', count: 1 }];
    const FARM_MONSTERS = [{ name: 'Sói Xám', count: 5 }, { name: 'Dơi Đen', count: 4 }, { name: 'Thạch Quái', count: 3 }];
    const inDungeon = (x, y) => x >= REALM.x && x <= REALM.x + REALM.w && y >= REALM.y && y <= REALM.y + REALM.h;
    const monstersOf = (mid) => mid === 'thach_lam' ? DUNGEON_MONSTERS
      : mid === HOME_MAP ? (inDungeon(player.x, player.y) ? DUNGEON_MONSTERS : FARM_MONSTERS)
      : MAP_SPAWNS.filter((s) => s.mapId === mid).map((s) => ({ name: MONSTER_TYPES[s.kind]?.name || s.kind, count: s.count }));
    const rt = MAP_RUNTIME.get(cur);
    socket.emit('overview_data', {
      current: {
        mapId: cur, name: cur === HOME_MAP ? 'Làng Tân Thủ' : (MAP_DEFS.get(cur)?.name || cur),
        theme: cur === HOME_MAP ? 'village' : (rt?.theme || ''), w: rt ? rt.w : WORLD_W, h: rt ? rt.h : WORLD_H,
        portal: cur === HOME_MAP ? { x: 1080, y: 600 } : rt?.portal, hazards: rt?.hazards || [], features: rt?.features || null,
        decor: cur === HOME_MAP ? HOME_DECOR : (rt?.decor || []), monsters: monstersOf(cur),
        // GĐ64: popup bản đồ vẽ đàng hoàng — NPC (chấm vàng + tên) + khung vùng cho map nhà
        npcs: cur === HOME_MAP ? NPCS.map((n) => ({ x: n.x, y: n.y, name: n.name })) : [],
        zones: cur === HOME_MAP ? [
          { x: 240, y: 180, w: 920, h: 760, label: 'Làng Tân Thủ' },
          { x: 1230, y: 420, w: 300, h: 240, label: 'Thanh Phong Môn' },
          { x: REALM.x, y: REALM.y, w: REALM.w, h: REALM.h, label: 'Bí Cảnh Thạch Lâm' },
        ] : [],
      },
      maps: [...MAP_DEFS.values()].filter((d) => d.id !== 'bai_farm').map((d) => ({
        id: d.id, name: d.name, category: d.category, safe: !!d.safe, minRealm: d.minRealm, minTier: d.minTier || 0,
        theme: d.id === HOME_MAP ? 'village' : (THEME_BY_ID[d.id] || ''), boatOnly: BOAT_ONLY.has(d.id),
        canEnter: d.id === 'thach_lam' ? isOldSectMember(player) : canEnterGate(player, d), // GĐ79: chỉ 2 tông cũ
        needText: d.id === 'thach_lam' ? 'Chỉ đệ tử tông môn' : gateTextOf(d),
        cost: travelCostFor(player, d.id), reachable: dests.some((x) => x.id === d.id),
        monsters: monstersOf(d.id),
      })),
    });
  });

  // GĐ57: QUA CỔNG BÍ CẢNH — kiểm tra đứng gần đúng cổng + tư cách đệ tử
  // (vào); dịch chuyển cả người lẫn đồng hành theo chủ, nạp lại toàn cảnh
  // cho client để camera nhảy thẳng tới nơi.
  socket.on('realm_portal', (data) => {
    if (!player || !data) return;
    const go = (x, y) => {
      player.x = x; player.y = y; player.vx = 0; player.vy = 0;
      if (player.input) { player.input.vx = 0; player.input.vy = 0; }
      for (const q of players.values()) {
        if (q.isCompanion && q.ownerId === player.id) { q.x = x + 28; q.y = y + 12; q.vx = 0; q.vy = 0; }
      }
      persistPlayer(player);
      emitFull(socket, HOME_MAP);
      syncChar(socket, player);
    };
    if (data.action === 'enter') {
      const npc = NPC_BY_ID.npc_bicanh_in;
      if (Math.hypot(player.x - npc.x, player.y - npc.y) > 110) return;
      if (!isOldSectMember(player)) { // GĐ79: chỉ 2 tông cũ
        socket.emit('interact_error', { message: 'Cổng bí cảnh chỉ mở cho đệ tử Thiên Kiếm Môn / Huyền Thiên Tông.' });
        return;
      }
      go(REALM_ENTRY.x, REALM_ENTRY.y);
      socket.emit('notice', { text: '🌀 Bạn bước qua cổng — Bí Cảnh Thạch Lâm. Đất dữ đầy rẫy Kiếm Ma, Huyết Lang và Thạch Khôi Lỗi trấn giữ đàn đá!' });
      console.log(`[bí cảnh] ${player.name} vào Bí Cảnh Thạch Lâm`);
    } else if (data.action === 'exit') {
      const npc = NPC_BY_ID.npc_bicanh_out;
      if (Math.hypot(player.x - npc.x, player.y - npc.y) > 110) return;
      go(REALM_RETURN.x, REALM_RETURN.y);
      socket.emit('notice', { text: '🌀 Bạn trở về Làng Tân Thú an toàn.' });
      console.log(`[bí cảnh] ${player.name} rời Bí Cảnh Thạch Lâm`);
    }
  });

  socket.on('talk_npc', (data) => {
    if (!player || !data) return;
    if (player.hp <= 0) return; // GĐ128: linh thể chỉ đi lại, không tương tác được
    // GĐ89: NPC thành phố — tra theo map, trả hộp thoại riêng (không thiện
    // cảm, không manh mối vụ án như NPC làng; tiệm + sứ giả theo vai).
    const cityNpc = CITY_NPC_BY_ID.get(data.npcId);
    if (cityNpc) {
      if (mapOf(player) !== cityNpc.mapId) {
        socket.emit('interact_error', { message: 'NPC này không ở bản đồ hiện tại.' });
        return;
      }
      if (Math.hypot(player.x - cityNpc.x, player.y - cityNpc.y) > 95) {
        socket.emit('interact_error', { message: `Tới gần ${cityNpc.name} để trò chuyện.` });
        return;
      }
      let envoySect = null;
      if (cityNpc.role === 'Sứ Giả Tông Môn') {
        const si = sectInfoFor(player);
        const entry = (si.list || []).find((s) => s.homeCity === cityNpc.mapId);
        if (entry) envoySect = { ...entry, isMember: player.sect === entry.id, skills: player.sect === entry.id ? si.skills : null };
      }
      // GĐ90: nhiệm vụ thành phố của Người Giao Nhiệm Vụ — nhận qua nút
      // Nhận, đang làm hiện tiến độ, xong hiện nút Trả (như nhiệm vụ riêng
      // làng; không cần thiện cảm vì dân thành phố không tăng thiện cảm).
      const cityQuests = [];
      const cityClaimable = [];
      if (cityNpc.role === 'Người Giao Nhiệm Vụ') {
        for (const [qid, def] of Object.entries(QUESTS)) {
          if (def.npcId !== cityNpc.id) continue;
          if (def.requiresFlag && !player.flags?.[def.requiresFlag] && !player.quests?.[qid]) continue; // GĐ127: phần chuỗi/ẩn chưa mở thì ẩn hẳn (như hộp thoại làng)
          const q = player.quests?.[qid];
          const ready = questReadyFor(player, def, q);
          if (!q) cityQuests.push({ questId: qid, name: def.name, desc: def.desc, target: def.target, rewardStones: def.rewardStones, state: 'available', progress: 0, ready: false });
          else if (!ready) cityQuests.push({ questId: qid, name: def.name, desc: def.desc, target: def.target, rewardStones: def.rewardStones, state: q.state, progress: q.progress || 0, ready: false });
          else cityClaimable.push({ questId: qid, name: def.name, rewardStones: def.rewardStones });
        }
      }
      applyTalkQuestHooks(socket, player, cityNpc.id); // GĐ127: talk/giao hàng/manh mối
      socket.emit('npc_dialog', {
        npcId: cityNpc.id, name: cityNpc.name, personality: cityNpc.role,
        shopId: cityNpc.role === 'Chủ Tiệm Đan' ? 'city_dan' : cityNpc.role === 'Chủ Tiệm Nguyên Liệu' ? 'city_nguyenlieu' : null,
        affinity: 0, gained: 0, text: (cityNpc.dialogue && cityNpc.dialogue[0]) || '...',
        accuse: null, personalQuest: null, personalQuests: cityQuests, claimable: cityClaimable,
        merchantInfo: null, sectInfo: null, realmInfo: null, escortInfo: null, envoySect,
      });
      return;
    }
    if (mapOf(player) !== HOME_MAP) { // GĐ59: NPC đều ở Làng Tân Thủ (trừ dân thành phố GĐ89 ở trên)
      socket.emit('interact_error', { message: 'Nơi này không có ai để trò chuyện — về Làng Tân Thủ nhé.' });
      return;
    }
    const npc = NPC_BY_ID[data.npcId];
    if (!npc) return;
    if (Math.hypot(player.x - npc.x, player.y - npc.y) > 95) {
      socket.emit('interact_error', { message: `Tới gần ${npc.name} để trò chuyện.` });
      return;
    }
    // GĐ40+: thương nhân vắng làng thì không gặp được (dù client còn hình cũ)
    if (npc.id === 'npc_thuongnhan' && !merchantPresent()) {
      socket.emit('interact_error', { message: 'Thương Nhân Lưu Động đã rời làng — ông ta ghé thất thường, canh ngày khác nhé.' });
      return;
    }
    // GĐ40+: GIAO ĐƠN ĐẶT HÀNG khi thương nhân ghé lại vào ngày sau
    if (npc.id === 'npc_thuongnhan' && player.merchantOrder && worldClock().dayIndex > player.merchantOrder.day) {
      const oid = player.merchantOrder.itemId;
      player.inventory[oid] = (player.inventory[oid] || 0) + 1;
      player.merchantOrder = null;
      player.merchantRep = (player.merchantRep || 0) + 1; // GĐ86: nhận đơn đặt cũng tăng khách quen
      persistPlayer(player);
      socket.emit('notice', { text: `📦 Thương nhân mang tới món bạn đặt: ${ITEMS[oid]?.name || oid} ×1 — đã giao tận tay! (Khách quen mức ${player.merchantRep})` });
    }
    if (!player.affTalk) player.affTalk = {};
    const today = worldClock().dayIndex;
    let gained = 0;
    if (player.affTalk[npc.id] !== today) {
      player.affTalk[npc.id] = today;
      gained = 2;
      persistPlayer(player);
    }
    if (gained) addAffinity(socket, player, npc.id, gained);
    const aff = affinityOf(player, npc.id);
    // GĐ40+: thu thập MANH MỐI vụ trộm — nhân chứng kể đúng 1 lần, lời kể
    // nhất quán với thủ phạm thật; đủ 3 manh mối mới chỉ đích danh được
    let clueText = null;
    const caseQ = player.quests?.case_trom;
    if (caseQ?.state === 'active' && player.caseCulprit) {
      const line = CASE_CLUES[player.caseCulprit]?.[npc.id];
      if (line && !player.caseClues?.[npc.id]) {
        player.caseClues = player.caseClues || {};
        player.caseClues[npc.id] = true;
        caseQ.progress = Object.keys(player.caseClues).length;
        persistPlayer(player);
        syncChar(socket, player);
        clueText = `🔍 Manh mối (${caseQ.progress}/3): “${line}”`;
        if (caseQ.progress >= 3) socket.emit('notice', { text: '🔍 Đã đủ 3 manh mối! Về gặp Trưởng Làng và CHỈ ĐÍCH DANH thủ phạm — chỉ sai là vụ án khép lại!' });
      }
    }
    // GĐ86: thu thập MANH MỐI BỆNH LẠ — trò chuyện với 3 người trong làng
    // (Trưởng Làng, Chủ Tiệm Đan, Chủ Tiệm Nguyên Liệu) mới đủ manh mối;
    // đủ 3 thì mở cờ benhla_probed, Chủ Tiệm Đan mới giao phần 1 của vụ án.
    // Người đã vào chuỗi (đang làm phần 1/2 hoặc đang giữ cờ case_benhla)
    // thì không cần điều tra lại; điều tra xong 1 lần thì vụ tái phát sau
    // này không cần điều tra lại.
    if (BENHLA_CLUES[npc.id] && !player.flags?.benhla_probed && !player.flags?.case_benhla && !player.quests?.q_benhla1 && !player.quests?.q_benhla2) {
      if (!player.benhlaClues?.[npc.id]) {
        player.benhlaClues = player.benhlaClues || {};
        player.benhlaClues[npc.id] = true;
        const nClues = Object.keys(player.benhlaClues).length;
        persistPlayer(player);
        if (!clueText) clueText = `🔍 Manh mối bệnh lạ (${nClues}/3): “${BENHLA_CLUES[npc.id]}”`;
        if (nClues >= 3) {
          player.flags = player.flags || {};
          player.flags.benhla_probed = true;
          persistPlayer(player);
          socket.emit('notice', { text: '🔍 Đã đủ 3 manh mối bệnh lạ! Về gặp Chủ Tiệm Đan nhận phần 1 của vụ án.' });
        }
      }
    }
    // Nhiệm vụ riêng của NPC này: trạng thái cho client dựng nút (GĐ40:
    // trả cả DANH SÁCH — NPC có thể có nhiều nhiệm vụ/chuỗi nhiều phần;
    // phần chuỗi chưa mở khóa thì ẩn hẳn)
    const personalQuests = [];
    for (const [qid, def] of Object.entries(QUESTS)) {
      if (def.npcId !== npc.id) continue;
      if (def.requiresFlag && !player.flags?.[def.requiresFlag] && !player.quests?.[qid]) continue;
      if (def.jobId && player.job?.jobId !== def.jobId && !player.quests?.[qid]) continue; // GĐ131: nhiệm vụ nghề chỉ hiện với người cùng nghề
      const q = player.quests?.[qid];
      personalQuests.push({
        questId: qid, name: def.name, desc: def.desc, target: def.target, rewardStones: def.rewardStones,
        state: q ? q.state : aff >= (def.minAffinity ?? 50) ? 'available' : 'locked',
        progress: q?.progress || 0,
        ready: questReadyFor(player, def, q),
        minAffinity: def.minAffinity ?? 50,
      });
    }
    // Nhiệm vụ riêng "kinh điển" (cần thiện cảm) xếp trước nhiệm vụ vụ án
    // (không cần thiện cảm) — personalQuest (số ít) = mục đầu cho tương thích
    personalQuests.sort((a, b) => b.minAffinity - a.minAffinity);
    const personalQuest = personalQuests[0] || null;
    // Nhiệm vụ đã sẵn sàng trả TẠI NPC này (bảng → Trưởng Làng; riêng → chính NPC)
    const claimable = [];
    for (const [qid, def] of Object.entries(QUESTS)) {
      const q = player.quests?.[qid];
      if (!q) continue;
      if ((def.npcId || 'npc_truonglang') !== npc.id) continue;
      const ready = questReadyFor(player, def, q);
      if (ready) claimable.push({ questId: qid, name: def.name, rewardStones: def.rewardStones });
    }
    applyTalkQuestHooks(socket, player, npc.id); // GĐ127: talk/giao hàng/manh mối
    socket.emit('npc_dialog', {
      npcId: npc.id, name: npc.name, personality: npc.personality, shopId: npc.shopId || null,
      affinity: aff, gained,
      // GĐ40: thương nhân lưu động chào hàng theo kho luân phiên của ngày
      // GĐ57: cổng bí cảnh có lời riêng (không dùng kho thoại theo tính cách)
      text: clueText || (npc.id === 'npc_bicanh_in'
        ? 'Cổng đá phủ rêu khắc đầy phù văn cổ. Linh khí lạnh lẽo phả ra từ khe đá — phía sau là Bí Cảnh Thạch Lâm, đất dữ chỉ dành cho đệ tử tông môn.'
        : npc.id === 'npc_bicanh_out'
        ? 'Cổng đá sau lưng từ từ khép lại. Bước qua cổng này là trở về sân Thanh Phong Môn, Làng Tân Thủ.'
        : npc.id === 'npc_thuongnhan'
        ? `Ta buôn bán khắp nơi, nay ghé làng này ít hôm. Hôm nay ta mang: ${Object.entries(merchantToday().stock).slice(0, merchantStockCount(player)).map(([id, e]) => `${ITEMS[id].name} (${Math.ceil(e.price * merchantRepDiscount(player))} LT, còn ${e.qty})`).join(' · ') || '— hết sạch hàng rồi!'}. Đặt hàng trước thì lần sau ta đem tới tận nơi. À, nghe đồn: ${WORLD_HINTS[worldClock().dayIndex % WORLD_HINTS.length]}${(player.merchantRep || 0) >= 3 ? ' Bạn là khách quen nên được xem cả món thứ 4 trong kho.' : ''}${merchantRepDiscount(player) < 1 ? ` Khách quen mức ${player.merchantRep} được giảm ${Math.round((1 - merchantRepDiscount(player)) * 100)}% hôm nay.` : ''}`
        : dialogLine(npc, aff)),
      // GĐ40+: đủ manh mối → Trưởng Làng cho chỉ đích danh 1 trong 3 nghi phạm
      accuse: npc.id === 'npc_truonglang' && player.quests?.case_trom?.state === 'active' && (player.quests.case_trom.progress || 0) >= 3 ? CASE_SUSPECTS : null,
      personalQuest, personalQuests, claimable,
      // GĐ40+: kho + giá hôm nay + danh mục đặt hàng + hint thế giới của thương nhân
      // GĐ86: kho hiển thị theo khách quen — món thứ 4 chỉ rep ≥3 mới thấy,
      // giá đã trừ giảm khách quen (rep ≥5: −10%, rep ≥10: −15%) để khớp giá lúc mua
      merchantInfo: npc.id === 'npc_thuongnhan' ? {
        stock: Object.entries(merchantToday().stock).slice(0, merchantStockCount(player)).map(([itemId, e]) => ({ itemId, price: Math.ceil(e.price * merchantRepDiscount(player)), qty: e.qty })),
        catalog: MERCHANT_POOL.map((itemId) => ({ itemId, orderPrice: Math.ceil((SHOPS.luu_dong.sell[itemId] || 50) * 1.1) })),
        hint: WORLD_HINTS[worldClock().dayIndex % WORLD_HINTS.length],
        order: player.merchantOrder ? { itemId: player.merchantOrder.itemId } : null,
        rep: player.merchantRep || 0,
        repDiscount: merchantRepDiscount(player),
      } : null,
      sectInfo: npc.id === 'npc_sugia' ? sectInfoFor(player) : null, // GĐ30
      realmInfo: realmInfoFor(player, npc.id), // GĐ57: cổng bí cảnh
      escortInfo: npc.id === 'npc_laibuan' ? escortInfoFor(player) : null, // GĐ60: việc hộ tống
      masterInfo: MASTER_JOB[npc.id] ? { // GĐ131: sư phụ dạy nghề
        jobId: MASTER_JOB[npc.id], jobName: JOBS[MASTER_JOB[npc.id]].name,
        hasJob: player.job?.jobId === MASTER_JOB[npc.id],
        hasOtherJob: !!player.job && player.job.jobId !== MASTER_JOB[npc.id],
        otherJobName: player.job ? JOBS[player.job.jobId].name : null,
        isApprentice: player.job?.master === npc.id,
        guide: MASTER_GUIDE[MASTER_JOB[npc.id]],
      } : null,
    });
  });

  // GĐ40+: BẢNG VÀNG (xếp hạng người chơi toàn server — đọc từ kho nhân
  // vật, kể cả người đang offline) + BẢNG TRUY NÃ (mục tiêu đối đầu)
  socket.on('get_leaderboard', () => {
    if (!player) return;
    const rows = Object.values(characters)
      .filter((c) => c && c.name && !c.dead)
      .map((c) => ({
        name: c.name, classId: c.classId, realm: c.realm || 'pham', tier: c.tier || 0,
        step: globalStep(c.realm || 'pham', c.tier || 0), tuVi: c.tuVi || 0,
        totalTuVi: c.counters?.totalTuVi || 0, merit: c.merit || 0,
      }));
    const byTuVi = [...rows].sort((a, b) => b.step - a.step || b.tuVi - a.tuVi).slice(0, 10);
    const byTuLuyen = [...rows].sort((a, b) => b.totalTuVi - a.totalTuVi).slice(0, 10);
    const day = worldClock().dayIndex;
    const flavorNames = ['Hắc Phong Tặc', 'Huyết Thủ Tăng', 'Vô Ảnh Khách', 'Độc Nương Tử'];
    const truyNa = [
      { name: 'Tu Sĩ Thù Địch', bounty: '100 LT + 20 Tu vi + 3 Công trạng', how: 'Nhiệm vụ bảng “Đối đầu Tu Sĩ Thù Địch” — luôn mở' },
      { name: 'Kẻ Bắt Cóc', bounty: '180 LT + 5 Công trạng', how: caseActiveToday(QUESTS.case_batcoc) ? 'Vụ án “Dân làng mất tích” — ĐANG MỞ hôm nay!' : 'Vụ án “Dân làng mất tích” — chưa mở hôm nay' },
      { name: 'Kẻ Trộm Trong Làng', bounty: '150 LT + 30 Tu vi + 5 Công trạng', how: caseActiveToday(QUESTS.case_trom) ? 'Vụ án “Kẻ trộm trong làng” — ĐANG MỞ hôm nay!' : 'Vụ án “Kẻ trộm trong làng” — chưa mở hôm nay' },
      { name: flavorNames[day % flavorNames.length], bounty: `${120 + (dayHash(day) % 200)} LT`, how: 'Mới có tin đồn — chưa rõ tung tích, chờ vụ án liên quan' },
    ];
    socket.emit('leaderboard_data', { tuVi: byTuVi, tuLuyen: byTuLuyen, truyNa });
  });

  // GĐ40+: ĐẶT HÀNG với thương nhân lưu động — trả trước giá gốc +10%,
  // lần ghé sau (ngày khác) nói chuyện với ông ta là nhận hàng
  socket.on('merchant_order', (data) => {
    if (!player || !data) return;
    const npc = NPC_BY_ID['npc_thuongnhan'];
    if (Math.hypot(player.x - npc.x, player.y - npc.y) > 95 || !merchantPresent()) {
      socket.emit('interact_error', { message: 'Tới gặp Thương Nhân Lưu Động khi ông ta đang ở làng để đặt hàng.' });
      return;
    }
    if (!MERCHANT_POOL.includes(data.itemId)) return;
    if (player.merchantOrder) {
      socket.emit('interact_error', { message: `Bạn đang có đơn đặt ${ITEMS[player.merchantOrder.itemId]?.name} chưa nhận — mỗi lần chỉ đặt 1 món.` });
      return;
    }
    const price = Math.ceil((SHOPS.luu_dong.sell[data.itemId] || 50) * 1.1);
    if ((player.stones || 0) < price) {
      socket.emit('interact_error', { message: `Không đủ Linh thạch đặt hàng (cần ${price}, có ${player.stones || 0}).` });
      return;
    }
    player.stones -= price;
    player.merchantOrder = { itemId: data.itemId, day: worldClock().dayIndex };
    persistPlayer(player);
    syncChar(socket, player);
    notice(`📦 Đã đặt ${ITEMS[data.itemId].name} (−${price} LT) — lần ghé sau của thương nhân, nói chuyện với ông ta để nhận hàng.`);
    console.log(`[thương nhân] ${player.name} đặt hàng ${data.itemId} (${price} LT)`);
  });

  // GĐ40+: CHỈ ĐÍCH DANH thủ phạm vụ trộm — đúng: vụ án hoàn thành (về
  // trả tại Trưởng Làng); sai: vụ án KHÉP LẠI + mất thiện cảm. Ép người
  // chơi đọc kỹ manh mối thay vì bấm bừa.
  socket.on('accuse_suspect', (data) => {
    if (!player || !data) return;
    const npc = NPC_BY_ID['npc_truonglang'];
    if (Math.hypot(player.x - npc.x, player.y - npc.y) > 95) {
      socket.emit('interact_error', { message: 'Tới gặp Trưởng Làng để chỉ đích danh thủ phạm.' });
      return;
    }
    const q = player.quests?.case_trom;
    if (!q || q.state !== 'active' || (q.progress || 0) < 3) {
      socket.emit('interact_error', { message: 'Chưa đủ 3 manh mối — hãy trò chuyện với dân làng để thu thập thêm.' });
      return;
    }
    if (data.npcId === player.caseCulprit) {
      q.state = 'done';
      player.caseCulprit = null;
      player.caseClues = {};
      persistPlayer(player);
      syncChar(socket, player);
      socket.emit('notice', { text: '🎉 CHỈ ĐÚNG THỦ PHẠM! Kẻ trộm đã bị bắt. Trả nhiệm vụ ngay với Trưởng Làng để nhận thưởng.' });
      console.log(`[vụ án] ${player.name} phá án kẻ trộm — chỉ đúng thủ phạm`);
    } else {
      delete player.quests.case_trom;
      player.caseCulprit = null;
      player.caseClues = {};
      persistPlayer(player);
      syncChar(socket, player);
      addAffinity(socket, player, 'npc_truonglang', -5);
      socket.emit('notice', { text: '❌ CHỈ SAI NGƯỜI! Dân làng xôn xao, kẻ trộm thật đã cao chạy xa bay — vụ án khép lại. Trưởng Làng thất vọng (−5 thiện cảm).' });
      console.log(`[vụ án] ${player.name} chỉ sai thủ phạm — vụ án khép lại`);
    }
  });

  // GĐ30: GIA NHẬP TÔNG MÔN — kiểm tra lại toàn bộ điều kiện phía server
  socket.on('join_sect', (data) => {
    if (!player || !data || !SECTS[data.sectId]) return;
    const npc = NPC_BY_ID['npc_sugia'];
    // GĐ89: gia nhập tại Sứ Giả làng HOẶC tại Sứ Giả trụ sở của đúng tông đó
    const atVillage = mapOf(player) === HOME_MAP && Math.hypot(player.x - npc.x, player.y - npc.y) <= 95;
    const cityEnvoy = (CITY_NPCS[mapOf(player)] || []).find((n) => n.role === 'Sứ Giả Tông Môn');
    const atHQ = !!cityEnvoy && SECTS[data.sectId]?.homeCity === mapOf(player)
      && Math.hypot(player.x - cityEnvoy.x, player.y - cityEnvoy.y) <= 95;
    if (!atVillage && !atHQ) {
      socket.emit('interact_error', { message: 'Tới gặp Sứ Giả Tông Môn ở quảng trường làng hoặc tại thành trụ sở của tông môn.' });
      return;
    }
    if (player.sect) {
      socket.emit('interact_error', { message: `Bạn đã là đệ tử ${SECTS[player.sect].name} — một người chỉ thờ một tông môn.` });
      return;
    }
    const info = sectInfoFor(player)[data.sectId];
    if (!info.open) {
      socket.emit('interact_error', { message: `${info.name} chưa mở đợt chiêu mộ. ${info.windowText}.` });
      return;
    }
    if (!info.canJoin) {
      socket.emit('interact_error', { message: `Chưa đủ điều kiện vào ${info.name}: ${info.missing.join('; ')}.` });
      return;
    }
    if (data.sectId === 'thienkiem') player.inventory.thu_tien_cu -= 1; // nộp Thư Tiến Cử
    if (data.sectId === 'huyenthien') player.sectTrialPassed = false; // đã dùng tư cách thử thách
    player.sect = data.sectId;
    persistPlayer(player);
    syncChar(socket, player);
    socket.emit('sect_joined', { sectId: data.sectId, name: SECTS[data.sectId].name });
    notice(`🎉 Gia nhập ${SECTS[data.sectId].name} thành công! Từ nay bạn là đệ tử tông môn — được mua ở Tiệm Tông Môn và đổi Công trạng lấy điểm chỉ số tại Sứ Giả.`);
    console.log(`[tông môn] ${player.name} gia nhập ${SECTS[data.sectId].name}`);
  });

  // GĐ30: THỬ THÁCH THÚ của Huyền Thiên Tông — trùm chỉ chủ nhân đánh được
  socket.on('start_sect_trial', () => {
    if (!player) return;
    const npc = NPC_BY_ID['npc_sugia'];
    if (Math.hypot(player.x - npc.x, player.y - npc.y) > 95) {
      socket.emit('interact_error', { message: 'Tới gặp Sứ Giả Tông Môn ở quảng trường để nhận thử thách.' });
      return;
    }
    const info = sectInfoFor(player).huyenthien;
    if (!info.open) {
      socket.emit('interact_error', { message: `Huyền Thiên Tông chưa mở đợt chiêu mộ. ${info.windowText}.` });
      return;
    }
    if (globalStep(player.realm, player.tier) < 10) {
      socket.emit('interact_error', { message: 'Cần đạt Trúc Cơ mới nhận được thử thách của Huyền Thiên Tông.' });
      return;
    }
    if ((player.merit || 0) < 500) {
      socket.emit('interact_error', { message: `Cần Công trạng ≥ 500 (đang có ${player.merit || 0}).` });
      return;
    }
    if (player.sectTrialPassed) {
      socket.emit('interact_error', { message: 'Bạn đã thắng Thử Thách Thú rồi — bấm Gia nhập Huyền Thiên Tông!' });
      return;
    }
    if ([...monsters.values()].some((m) => m.kind === 'trial' && m.ownerId === player.id && m.isTrialBoss)) {
      socket.emit('interact_error', { message: 'Thử thách của bạn đang diễn ra!' });
      return;
    }
    const eHp = eliteHpAt(9);
    const eAtk = eliteAtkAt(9);
    const boss = {
      id: 'trial-' + ++monsterSeq, kind: 'trial', trialKind: 'sect', isTrialBoss: true, ownerId: player.id,
      mapId: mapOf(player), // GĐ59
      name: 'Thử Thách Thú', x: 700, y: 712, hp: eHp * 4, maxHp: eHp * 4, atk: eAtk,
      vx: 0, vy: 0, direction: 'down', lastAttackAt: 0, lastSkillAt: 0, bornAt: Date.now(), phase2: false,
    };
    monsters.set(boss.id, boss);
    io.emit('trial_started', { ownerId: player.id, ownerName: player.name, name: boss.name, monsterId: boss.id });
    notice('⚔️ Thử Thách Thú xuất hiện phía nam quảng trường — chỉ mình bạn đánh được và bị nó đánh. Thắng nó rồi quay lại gặp Sứ Giả!');
    console.log(`[tông môn] ${player.name} bắt đầu thử thách Huyền Thiên Tông (HP ${boss.hp})`);
  });

  // GĐ30: ĐỔI CÔNG TRẠNG → điểm chỉ số tự do (50:1, tỉ lệ TẠM) — chỉ đệ tử tông môn
  socket.on('exchange_merit', () => {
    if (!player) return;
    const npc = NPC_BY_ID['npc_sugia'];
    if (Math.hypot(player.x - npc.x, player.y - npc.y) > 95) {
      socket.emit('interact_error', { message: 'Tới gặp Sứ Giả Tông Môn ở quảng trường để đổi Công trạng.' });
      return;
    }
    if (!player.sect) {
      socket.emit('interact_error', { message: 'Chỉ đệ tử tông môn mới đổi được Công trạng.' });
      return;
    }
    if ((player.merit || 0) < MERIT_PER_POINT) {
      socket.emit('interact_error', { message: `Cần ${MERIT_PER_POINT} Công trạng cho 1 điểm chỉ số (đang có ${player.merit || 0}).` });
      return;
    }
    player.merit -= MERIT_PER_POINT;
    player.freePoints = (player.freePoints || 0) + 1;
    persistPlayer(player);
    syncChar(socket, player);
    notice(`⚜️ Đã đổi ${MERIT_PER_POINT} Công trạng → +1 điểm chỉ số tự do (cộng điểm trong khung nhân vật). Công trạng còn ${player.merit}.`);
    console.log(`[tông môn] ${player.name} đổi ${MERIT_PER_POINT} Công trạng → +1 điểm tự do`);
  });

  // GĐ26: HỌC NGHỀ PHỤ — cần linh căn, mỗi nhân vật 1 nghề (bản cơ bản)
  socket.on('learn_job', (data) => {
    if (!player || !data) return;
    if (!JOBS[data.jobId]) return;
    if (!player.linhCan) {
      socket.emit('interact_error', { message: 'Cần đo linh căn ở Đạo Quán trước khi học nghề phụ.' });
      return;
    }
    if (player.job) {
      socket.emit('interact_error', { message: `Đã học nghề ${JOBS[player.job.jobId].name} rồi (bản này mỗi người 1 nghề).` });
      return;
    }
    player.job = { jobId: data.jobId, crafts: 0 };
    persistPlayer(player);
    syncChar(socket, player);
    notice(`Đã học nghề phụ: ${JOBS[data.jobId].name}! Mở panel Nghề phụ (🔨) để chế tạo.`);
    console.log(`[nghề] ${player.name} học nghề ${JOBS[data.jobId].name}`);
  });

  // GĐ131: BÁI SƯ — qua NPC sư phụ dạy nghề. Chưa có nghề thì bái sư = học nghề luôn (vẫn cần đo linh căn trước); đã có nghề này thì chỉ nhận làm đệ tử (mở bonus chế tạo +5%); đã có nghề khác thì chặn (mỗi người 1 nghề).
  socket.on('apprentice_master', (data) => {
    if (!player || !data) return;
    if (player.hp <= 0) return; // GĐ128: linh thể chỉ đi lại, không tương tác được
    const npc = NPC_BY_ID[data.npcId];
    const jobId = npc ? MASTER_JOB[npc.id] : null;
    if (!jobId) return;
    if (mapOf(player) !== HOME_MAP) return;
    if (Math.hypot(player.x - npc.x, player.y - npc.y) > 95) {
      socket.emit('interact_error', { message: `Tới gần ${npc.name} để bái sư.` });
      return;
    }
    if (player.job && player.job.jobId !== jobId) {
      socket.emit('interact_error', { message: `Đã học nghề ${JOBS[player.job.jobId].name} rồi (mỗi người 1 nghề).` });
      return;
    }
    if (!player.job) {
      if (!player.linhCan) {
        socket.emit('interact_error', { message: 'Cần đo linh căn ở Đạo Quán trước khi bái sư học nghề.' });
        return;
      }
      player.job = { jobId, crafts: 0, master: npc.id };
      notice(`Đã bái sư ${npc.name} — học nghề phụ: ${JOBS[jobId].name}! Mở panel Nghề phụ (🔨) để chế tạo.`);
    } else if (player.job.master === npc.id) {
      socket.emit('notice', { text: `Bạn đã là đệ tử của ${npc.name} rồi.` });
      return;
    } else {
      player.job.master = npc.id;
      notice(`Đã bái sư ${npc.name} — từ nay chế tạo nghề ${JOBS[jobId].name} dễ thành hơn đôi chút!`);
    }
    persistPlayer(player);
    syncChar(socket, player);
    console.log(`[nghề] ${player.name} bái sư ${npc.name} (${jobId})`);
  });

  // GĐ26: CHẾ TẠO — trừ nguyên liệu trước, tung tỉ lệ; thành công +1 lượt chế
  // GĐ85: ĐÀN TẾ — xem trạng thái + triệu hồi trùm map (kiểm tra lại
  // mọi điều kiện ở cả 2 bước, tránh client cũ / gọi trực tiếp).
  const altarCheck = () => {
    const mapId = mapOf(player);
    const entry = altarEntryFor(mapId);
    if (!entry) return { error: 'Map này không có đàn tế.' };
    const ap = altarPosOf(mapId);
    if (!ap || Math.hypot(player.x - ap.x, player.y - ap.y) > ALTAR_RANGE) return { error: 'Hãy tới gần đàn tế hơn.' };
    const day = worldClock().dayIndex;
    const usedToday = altarUsed[mapId] === day;
    const live = entry.mapId === 'vo_tan_hu_khong' ? countKindInMap(entry.kind, mapId) : countBossInMap(entry.kind, mapId);
    const missing = Math.max(0, entry.count - live);
    const bossName = MONSTER_TYPES[entry.kind]?.name || entry.kind;
    let reason = '';
    if (usedToday) reason = 'Hôm nay đã tế ở map này rồi — mai hãy quay lại.';
    else if (missing <= 0) reason = 'Trùm vẫn còn sống — đánh bại hết trùm rồi hãy tế.';
    else if ((player.stones || 0) < ALTAR_COST) reason = `Không đủ Linh thạch (cần ${ALTAR_COST}).`;
    return { mapId, entry, bossName, live, missing, usedToday, reason, canSummon: !reason };
  };
  socket.on('altar_info', () => {
    if (!player) return;
    const c = altarCheck();
    if (c.error) { socket.emit('interact_error', { message: c.error }); return; }
    socket.emit('altar_info', { mapId: c.mapId, mapName: MAP_DEFS.get(c.mapId)?.name || c.mapId, bossName: c.bossName, bossCount: c.entry.count, live: c.live, missing: c.missing, cost: ALTAR_COST, usedToday: c.usedToday, canSummon: c.canSummon, reason: c.reason });
  });
  socket.on('altar_summon', () => {
    if (!player) return;
    if (player.hp <= 0) return; // GĐ128: linh thể chỉ đi lại, không tương tác được
    const c = altarCheck();
    if (c.error) { socket.emit('interact_error', { message: c.error }); return; }
    if (!c.canSummon) { socket.emit('interact_error', { message: c.reason }); return; }
    player.stones -= ALTAR_COST;
    altarUsed[c.mapId] = worldClock().dayIndex;
    saveWorld();
    let spawned = 0;
    for (let i = 0; i < c.missing; i++) {
      const m = spawnMonster(c.entry.kind, c.mapId, c.mapId === 'vo_tan_hu_khong' ? {} : { mapBoss: true });
      if (m) spawned++;
    }
    persistPlayer(player);
    syncChar(socket, player);
    socket.emit('altar_result', { ok: true, spawned, bossName: c.bossName });
    notice(`🕯️ Đàn tế rung chuyển — ${spawned} ${c.bossName} xuất hiện trong map!`);
  });

  socket.on('craft_item', (data) => {
    if (!player || !data) return;
    if (player.hp <= 0) return; // GĐ128: linh thể chỉ đi lại, không tương tác được
    const rc = RECIPES[data.recipeId];
    if (!rc) return;
    // GĐ96: công thức Tẩm bổ là cơ chế lớp Thể Tu — không cần nghề (kể cả chưa học
    // nghề nào), nhưng lớp khác không chế được. Các công thức thường giữ cổng nghề cũ.
    if (rc.tambo) {
      if (player.classId !== 'thetu') {
        socket.emit('interact_error', { message: 'Tẩm bổ là cơ chế riêng của Thể Tu.' });
        return;
      }
    } else if (rc.docduoc) {
      // GĐ98: công thức Chế độc là cơ chế lớp Sát Thủ — không cần nghề (kể cả chưa học
      // nghề nào), nhưng lớp khác không chế được (giống cổng tambo của Thể Tu).
      if (player.classId !== 'satthu') {
        socket.emit('interact_error', { message: 'Chế độc là cơ chế riêng của Sát Thủ.' });
        return;
      }
    } else if (rc.duongkiem) {
      // GĐ99: công thức Dưỡng Kiếm là cơ chế lớp Kiếm Tu — không cần nghề (kể cả chưa học
      // nghề nào), nhưng lớp khác không rèn được (giống cổng tambo/docduoc).
      if (player.classId !== 'kiemtu') {
        socket.emit('interact_error', { message: 'Dưỡng Kiếm là cơ chế riêng của Kiếm Tu.' });
        return;
      }
    } else if (rc.cotloi) {
      // GĐ101: công thức Luyện Khôi Lõi là cơ chế lớp Cốt Tu — không cần nghề (kể cả chưa học
      // nghề nào), nhưng lớp khác không luyện được (giống cổng tambo/docduoc/duongkiem).
      if (player.classId !== 'cottu') {
        socket.emit('interact_error', { message: 'Luyện Khôi Lõi là cơ chế riêng của Cốt Tu.' });
        return;
      }
    } else if (!player.job || player.job.jobId !== rc.jobId) {
      socket.emit('interact_error', { message: `Công thức này của nghề ${JOBS[rc.jobId].name}.` });
      return;
    }
    const rank = jobRankOf(player);
    if (rank < rc.minRank) {
      socket.emit('interact_error', { message: `Cần cấp nghề ${JOB_RANK_NAMES[rc.minRank]} mới chế được (đang ${JOB_RANK_NAMES[rank]} — chế thêm cho đủ lượt).` });
      return;
    }
    for (const [itemId, n] of Object.entries(rc.inputs)) {
      if ((player.inventory[itemId] || 0) < n) {
        socket.emit('interact_error', { message: `Thiếu ${ITEMS[itemId].name}: cần ${n}, đang có ${player.inventory[itemId] || 0}.` });
        return;
      }
    }
    if ((player.stones || 0) < (rc.stones || 0)) {
      socket.emit('interact_error', { message: `Không đủ Linh thạch (cần ${rc.stones}).` });
      return;
    }
    for (const [itemId, n] of Object.entries(rc.inputs)) player.inventory[itemId] -= n;
    player.stones -= rc.stones || 0;
    const apprenticeBonus = player.job?.master ? 0.05 : 0; // GĐ131: đệ tử bái sư chế dễ thành hơn 5% (TẠM)
    const effRate = Math.min(1, rc.rate + apprenticeBonus);
    const okCraft = Math.random() < effRate;
    if (okCraft) {
      // GĐ99: Dưỡng Kiếm rèn xong trang bị ngay, không qua túi (công thức không có output).
      if (rc.duongkiem) classResOf(player).sword = rc.sword;
      else player.inventory[rc.output] = (player.inventory[rc.output] || 0) + 1;
      // GĐ78: làm nghề tốn sức — chế thành công hao 2 thức ăn + 2 nước (Kim Đan+ tịch cốc thì không)
      if (!needsKd(player)) {
        player.food = Math.max(0, (player.food ?? 100) - NEED_CRAFT_DRAIN);
        player.water = Math.max(0, (player.water ?? 100) - NEED_CRAFT_DRAIN);
      }
      // GĐ96: Tẩm bổ chế được cả khi chưa có nghề → mọi chỗ đọc player.job phải chịu null
      if (player.job) player.job.crafts = (player.job.crafts || 0) + 1;
      if (player.counters) player.counters.crafts = (player.counters.crafts || 0) + 1; // GĐ27: đếm cho thành tựu
      const newRank = jobRankOf(player);
      socket.emit('craft_result', { ok: true, recipeId: data.recipeId, output: rc.duongkiem ? rc.sword : rc.output, crafts: player.job ? player.job.crafts : 0, rank: newRank, rate: effRate });
      if (rc.duongkiem) notice(`⚔️ Rèn THÀNH CÔNG: Bản Mệnh Kiếm — ${SWORD_NAMES[rc.sword]} đã trang bị!`);
      else notice(`⚗️ Chế tạo THÀNH CÔNG: +1 ${ITEMS[rc.output].name}${player.job ? ` (lượt chế ${player.job.crafts}${newRank > rank ? ` — LÊN CẤP NGHỀ: ${JOB_RANK_NAMES[newRank]}!` : ''})` : ''}`);
      // GĐ127: tiến độ nhiệm vụ chế tạo — chỉ tính chế thành công.
      for (const [qid, def] of Object.entries(QUESTS)) {
        if (def.kind !== 'craft') continue;
        if (def.recipeId) { if (def.recipeId !== data.recipeId) continue; }
        else if (def.jobId) { if (rc.jobId !== def.jobId) continue; } // GĐ131: nhiệm vụ rèn tay nghề — tính mọi món cùng nghề
        else continue;
        const q = player.quests?.[qid];
        if (q && q.state === 'active') {
          q.progress = Math.min(def.target, (q.progress || 0) + 1);
          if (q.progress >= def.target) {
            q.state = 'done';
            socket.emit('notice', { text: `✔ Hoàn thành “${def.name}” — tới ${questNpcName(def.npcId) || 'người giao nhiệm vụ'} trả nhiệm vụ!` });
          }
        }
      }
    } else {
      socket.emit('craft_result', { ok: false, recipeId: data.recipeId, rate: effRate });
      notice(`💥 Chế tạo THẤT BẠI — “${rc.name}” hỏng, mất nguyên liệu.`);
    }
    persistPlayer(player);
    syncChar(socket, player);
  });

  // GĐ134: LUYỆN KHÍ SƯ TỰ RÈN TRANG BỊ — đồ rèn ra là đồ GĐ119 thật (cùng
  // roller generateGear, mặc được ngay, vào gearBag như đồ đặt rèn/nhặt).
  socket.on('forge_gear', (data) => {
    if (!player || !data) return;
    if (player.hp <= 0) return; // GĐ128: linh thể chỉ đi lại, không tương tác được
    if (player.job?.jobId !== 'luyenkhi') {
      socket.emit('interact_error', { message: 'Chỉ Luyện Khí Sư mới tự rèn trang bị.' });
      return;
    }
    const slot = data.slot;
    const rarity = data.rarity;
    if (!GEAR.SLOTS.includes(slot)) { socket.emit('interact_error', { message: 'Ô trang bị không hợp lệ.' }); return; }
    const cfg = PLAYER_FORGE[rarity];
    if (!cfg) { socket.emit('interact_error', { message: 'Phẩm không hợp lệ.' }); return; }
    const rank = jobRankOf(player);
    if (rank < cfg.rank) {
      socket.emit('interact_error', { message: `Cần cấp nghề ${JOB_RANK_NAMES[cfg.rank]} mới rèn phẩm ${GEAR.RARITIES[rarity].name}.` });
      return;
    }
    if (!player.linhCan) {
      socket.emit('interact_error', { message: 'Cần đo linh căn trước khi rèn (đồ rèn theo hệ của người rèn).' });
      return;
    }
    const path = GEAR.CLASS_TO_PATH[player.classId] || player.path;
    if (!GEAR.PATHS.includes(path)) { socket.emit('interact_error', { message: 'Hướng tu không hợp lệ.' }); return; }
    let weapon = null;
    if (slot === 'WEAPON') {
      const weapons = GEAR.WEAPONS[path] || [];
      weapon = weapons.find((w) => w.id === data.weapon)?.id || null;
      if (!weapon) { socket.emit('interact_error', { message: 'Vũ khí không hợp lệ.' }); return; }
    }
    let tokenRank = null;
    if (slot === 'TOKEN') {
      tokenRank = Number(data.tokenRank);
      if (!(tokenRank >= 1 && tokenRank <= 9)) { socket.emit('interact_error', { message: 'Cấp lệnh bài từ 1 đến 9.' }); return; }
    }
    const element = GEAR.normElement(player.linhCan.main);
    if (!element) { socket.emit('interact_error', { message: 'Hệ linh căn không hợp lệ.' }); return; }
    if ((player.stones || 0) < cfg.stones) {
      socket.emit('interact_error', { message: `Không đủ Linh thạch (cần ${cfg.stones}, đang có ${player.stones || 0})` });
      return;
    }
    for (const [mid, qty] of Object.entries(cfg.mats)) {
      if ((player.inventory[mid] || 0) < qty) {
        socket.emit('interact_error', { message: `Thiếu nguyên liệu: cần ${ITEMS[mid]?.name || mid} ×${qty}.` });
        return;
      }
    }
    // Trừ nguyên liệu trước (hỏng vẫn mất, như chế tạo).
    player.stones -= cfg.stones;
    for (const [mid, qty] of Object.entries(cfg.mats)) player.inventory[mid] -= qty;
    const effRate = Math.min(1, cfg.rate + (player.job.master ? 0.05 : 0)); // GĐ131: đệ tử +5%
    const okForge = Math.random() < effRate;
    if (okForge) {
      const item = GEAR.generateGear({ path, element, rarity, slot, weapon, tokenRank });
      player.gearBag = player.gearBag || {};
      player.gearBag[item.uid] = item;
      if (!needsKd(player)) {
        player.food = Math.max(0, (player.food ?? 100) - NEED_CRAFT_DRAIN);
        player.water = Math.max(0, (player.water ?? 100) - NEED_CRAFT_DRAIN);
      }
      if (player.job) player.job.crafts = (player.job.crafts || 0) + 1;
      if (player.counters) player.counters.crafts = (player.counters.crafts || 0) + 1;
      const newRank = jobRankOf(player);
      socket.emit('forge_result', { ok: true, item, crafts: player.job ? player.job.crafts : 0, rank: newRank, rate: effRate });
      notice(`🔨 Rèn THÀNH CÔNG: +1 ${item.name}${player.job ? ` (lượt nghề ${player.job.crafts}${newRank > rank ? ` — LÊN CẤP NGHỀ: ${JOB_RANK_NAMES[newRank]}!` : ''})` : ''} — xem trong Túi đồ, tab Trang bị.`);
      // GĐ131: tiến độ nhiệm vụ nghề — rèn tính như chế thành công cùng nghề
      // (chỉ quest jobId-only, không gắn công thức cụ thể).
      for (const [qid, def] of Object.entries(QUESTS)) {
        if (def.kind !== 'craft') continue;
        if (def.recipeId) continue;
        if (!def.jobId || def.jobId !== 'luyenkhi') continue;
        const q = player.quests?.[qid];
        if (q && q.state === 'active') {
          q.progress = Math.min(def.target, (q.progress || 0) + 1);
          if (q.progress >= def.target) {
            q.state = 'done';
            socket.emit('notice', { text: `✔ Hoàn thành “${def.name}” — tới ${questNpcName(def.npcId) || 'người giao nhiệm vụ'} trả nhiệm vụ!` });
          }
        }
      }
    } else {
      socket.emit('forge_result', { ok: false, rate: effRate });
      notice(`💥 Rèn THẤT BẠI — phẩm ${GEAR.RARITIES[rarity].name} hỏng, mất nguyên liệu.`);
    }
    persistPlayer(player);
    syncChar(socket, player);
  });

  // GĐ27: NHẬN THƯỞNG THÀNH TỰU — server kiểm tra mốc từ số liệu thật
  socket.on('claim_achievement', (data) => {
    if (!player || !data) return;
    const def = ACHIEVEMENTS.find((a) => a.id === data.achId);
    if (!def) return;
    if (!player.achClaimed) player.achClaimed = [];
    if (player.achClaimed.includes(def.id)) return;
    const state = achievementState(player).find((a) => a.id === def.id);
    if (!state || !state.done) {
      socket.emit('interact_error', { message: `Chưa đạt mốc “${def.name}” (${state ? state.progress : 0}/${def.target}).` });
      return;
    }
    player.achClaimed.push(def.id);
    player.stones = (player.stones || 0) + def.reward;
    persistPlayer(player);
    syncChar(socket, player);
    notice(`🏆 Thành tựu “${def.name}” — nhận thưởng ${def.reward} Linh thạch!`);
    console.log(`[thành tựu] ${player.name} nhận ${def.id} (+${def.reward} LT)`);
  });

  // GĐ136: quái gần nhất để bùa nhắm vào — cùng map, không ẩn hình, không
  // trùm thử thách, không ảo ảnh (như discipline nhắm mục tiêu các GĐ trước).
  function nearestMonsterForTalisman(p, maxDist) {
    const map = mapOf(p);
    let best = null, bestD = Infinity;
    for (const m of monsters.values()) {
      if (mapOf(m) !== map || m.hidden || m.isTrialBoss || m.trial || m.illusion) continue;
      const d = Math.hypot(m.x - p.x, m.y - p.y);
      if (d <= maxDist && d < bestD) { best = m; bestD = d; }
    }
    return best;
  }
  socket.on('use_item', (data) => {
    if (!player || !data) return;
    if (player.hp <= 0) return; // GĐ128: linh thể chỉ đi lại, không tương tác được
    const id = data.itemId;
    if ((player.inventory[id] || 0) <= 0) return;
    if (id === 'dan_hoi_nguyen') {
      const max = maxMpEff(player);
      if (player.mp >= max) {
        socket.emit('interact_error', { message: 'Chân nguyên đã đầy.' });
        return;
      }
      player.mp = Math.min(max, player.mp + Math.round(max * 0.5));
      notice('Dùng Đan Hồi Nguyên: hồi 50% Chân nguyên');
    } else if (id === 'dan_hoi_xuan') {
      const max = maxHpEff(player);
      if (player.hp >= max) {
        socket.emit('interact_error', { message: 'Máu đã đầy.' });
        return;
      }
      player.hp = Math.min(max, player.hp + Math.round(max * 0.5));
      notice('Dùng Hồi Xuân Đan: hồi 50% HP');
    } else if (id === 'sach_toa_thien') {
      // GĐ22: học Tọa Thiền bằng sách (công pháp tiện ích — phải kiếm học)
      if (!player.linhCan) {
        socket.emit('interact_error', { message: 'Chưa có linh căn thì chưa hấp thụ được linh khí — hãy tới Đạo Quán đo linh căn trước rồi mới học Tọa Thiền.' });
        return;
      }
      if (player.meditation) {
        socket.emit('interact_error', { message: 'Đã học Tọa Thiền rồi.' });
        return;
      }
      player.meditation = true;
      socket.emit('meditation_learned', {});
      notice('📖 Đọc Sách Tọa Thiền — đã học công pháp tiện ích TỌA THIỀN! Từ nay thoát game, nhân vật sẽ về nơi an toàn ngồi thiền hấp thụ linh khí (+3 Tu vi/ngày).');
    } else if (id === 'phu_ho_than') {
      // GĐ26: Phù Hộ Thân (Phù Sư chế) — hồi 40% HP
      const max = maxHpEff(player);
      if (player.hp >= max) {
        socket.emit('interact_error', { message: 'Máu đã đầy.' });
        return;
      }
      player.hp = Math.min(max, player.hp + Math.round(max * 0.4));
      notice('Dùng Phù Hộ Thân: hồi 40% HP');
    } else if (id === 'banh_thit') {
      // GĐ26: Bánh Thịt Thú (Thú Sư chế) — hồi 25% HP; GĐ78: +30 thức ăn (nó là đồ ăn)
      const max = maxHpEff(player);
      const hpFull = player.hp >= max;
      const foodFull = (player.food ?? 100) >= 100;
      if (hpFull && foodFull) {
        socket.emit('interact_error', { message: 'Máu đã đầy và đã no.' });
        return;
      }
      if (!hpFull) player.hp = Math.min(max, player.hp + Math.round(max * 0.25));
      if (!needsKd(player)) player.food = Math.min(100, (player.food ?? 100) + 30);
      notice('Ăn Bánh Thịt Thú: hồi 25% HP + 30 thức ăn');
    } else if (id === 'com_nam' || id === 'thit_nuong' || id === 'luong_kho') {
      // GĐ78: đồ ăn — chỉ hồi thức ăn
      if (needsKd(player)) {
        socket.emit('interact_error', { message: 'Đã đạt Kim Đan, cơ thể tịch cốc — không cần ăn uống nữa.' });
        return;
      }
      if ((player.food ?? 100) >= 100) {
        socket.emit('interact_error', { message: 'Bạn đã no rồi.' });
        return;
      }
      const gain = { com_nam: 35, thit_nuong: 60, luong_kho: 25 }[id];
      player.food = Math.min(100, (player.food ?? 100) + gain);
      notice(`Ăn ${ITEMS[id].name}: +${gain} thức ăn`);
    } else if (id === 'nuoc_loc' || id === 'tra_thao_moc' || id === 'ruou_gao') {
      // GĐ78: thức uống — chỉ hồi nước uống
      if (needsKd(player)) {
        socket.emit('interact_error', { message: 'Đã đạt Kim Đan, cơ thể tịch cốc — không cần ăn uống nữa.' });
        return;
      }
      if ((player.water ?? 100) >= 100) {
        socket.emit('interact_error', { message: 'Bạn đã hết khát rồi.' });
        return;
      }
      const gain = { nuoc_loc: 40, tra_thao_moc: 60, ruou_gao: 30 }[id];
      player.water = Math.min(100, (player.water ?? 100) + gain);
      notice(`Uống ${ITEMS[id].name}: +${gain} nước uống`);
    } else if (id === 'phu_tu_linh') {
      // GĐ26: Phù Tụ Linh (Phù Sư chế) — +20 Tu vi
      if (!player.linhCan) {
        socket.emit('interact_error', { message: 'Cần có linh căn mới dùng được Phù Tụ Linh.' });
        return;
      }
      player.tuVi += 20;
      if (player.counters) player.counters.totalTuVi = (player.counters.totalTuVi || 0) + 20; // GĐ27
      notice('Dùng Phù Tụ Linh: +20 Tu vi');
    } else if (id === 'tran_ky') {
      // GĐ26: Trận Kỳ Dịch Chuyển (Trận Pháp Sư chế) — về quảng trường làng
      player.x = 700;
      player.y = 590;
      player.bequan = false;
      notice('🌀 Trận Kỳ phát sáng — dịch chuyển về quảng trường Làng Tân Thủ!');
    } else if (id === 'phu_don_tho') {
      // GĐ136: Phù Độn Thổ — về cổng map đang đứng (điểm tới như travel:
      // làng (1080,664), map GDD portal−56). Không cổng → lỗi, không tốn bùa.
      const cur = mapOf(player);
      let dest = null;
      if (cur === HOME_MAP) dest = { x: 1080, y: 664 };
      else {
        const rt = MAP_RUNTIME.get(cur);
        if (rt && rt.portal) dest = { x: rt.portal.x, y: rt.portal.y - 56 };
      }
      if (!dest) {
        socket.emit('interact_error', { message: 'Không tìm thấy cổng của map này.' });
        return;
      }
      player.x = dest.x;
      player.y = dest.y;
      player.bequan = false;
      notice('🌀 Phù Độn Thổ phát sáng — dịch chuyển về cổng map!');
    } else if (id === 'phu_dinh_than') {
      // GĐ136: Phù Định Thân — quái gần nhất (300px) đứng yên 5s (dùng chung
      // cờ cấm chế của trận GĐ135: updateMonster đã chặn đi/cắn khi cờ còn hạn).
      const t = nearestMonsterForTalisman(player, 300);
      if (!t) {
        socket.emit('interact_error', { message: 'Không có quái nào trong tầm 300px.' });
        return;
      }
      t.tranSealUntil = Date.now() + 5000;
      notice('🔒 Phù Định Thân: quái gần nhất đứng yên 5 giây!');
    } else if (id === 'phu_loi_kich') {
      // GĐ136: Phù Lôi Kích — sét đánh quái gần nhất (300px), 100 sát thương
      // phép xuyên giáp đá (magic không bị physResist). Log riêng cho probe.
      const t = nearestMonsterForTalisman(player, 300);
      if (!t) {
        socket.emit('interact_error', { message: 'Không có quái nào trong tầm 300px.' });
        return;
      }
      const dmg = hurtMonster(t, 100, t.def ?? 0, 'magic');
      console.log(`[talisman] ${player.name} dùng Phù Lôi Kích lên ${t.id}: -${dmg}`);
      notice(`⚡ Phù Lôi Kích: -${dmg} máu lên quái gần nhất!`);
    } else if (id === 'thit_ham_tam_bo' || id === 'canh_xuong_tam_bo') {
      // GĐ96: Tẩm bổ nhục thân — CHỈ Thể Tu; tăng vĩnh viễn vào chỉ số gốc (không
      // qua allocate nên reset_stats không hoàn lại — đúng nghĩa "vĩnh viễn").
      // Món ăn vẫn hồi 30 thức ăn kể cả khi đã đạt cap (Kim Đan tịch cốc thì không).
      if (player.classId !== 'thetu') {
        socket.emit('interact_error', { message: 'Chỉ Thể Tu mới hấp thụ được Tẩm bổ nhục thân.' });
        return;
      }
      const tb = tamBoOf(player);
      const isMeat = id === 'thit_ham_tam_bo';
      const cap = isMeat ? TAMBO_HP_CAP : TAMBO_DEF_CAP;
      const cur = isMeat ? tb.hp : tb.def;
      const foodTxt = needsKd(player) ? '' : ' + 30 thức ăn';
      if (!needsKd(player)) player.food = Math.min(100, (player.food ?? 100) + 30);
      if (cur >= cap) {
        notice(`🍲 Đã đạt giới hạn Tẩm bổ (${ITEMS[id].name}) — chỉ hồi thức ăn.`);
      } else if (isMeat) {
        player.stats.khiHuyet += 1; tb.hp += 10;
        notice(`🍲 Tẩm bổ: HP tối đa vĩnh viễn +10 (tổng +${tb.hp}/${TAMBO_HP_CAP})${foodTxt}`);
      } else {
        player.stats.vatPhong += 2; tb.def += 2;
        notice(`🍲 Tẩm bổ: Vật phòng vĩnh viễn +2 (tổng +${tb.def}/${TAMBO_DEF_CAP})${foodTxt}`);
      }
    } else if (id === 'lo_doc_ria_mau' || id === 'lo_doc_kich_thich') {
      // GĐ98: bôi độc lên vũ khí — CHỈ Sát Thủ; lớp bôi lưu trong classRes nên bền qua
      // restart (không cần nối thêm). Bôi lọ mới thay lớp cũ; hết lượt bôi báo ở applyCoatingOnHit.
      if (player.classId !== 'satthu') {
        socket.emit('interact_error', { message: 'Chỉ Sát Thủ mới biết bôi độc lên vũ khí.' });
        return;
      }
      const type = id === 'lo_doc_ria_mau' ? 'ria_mau' : 'kich_thich';
      const had = coatingOf(player);
      classResOf(player).coating = { type, hits: COAT_HITS };
      notice(`☠️ Đã bôi ${ITEMS[id].name} lên vũ khí — ${COAT_HITS} đòn${had ? ' (thay lớp độc cũ)' : ''}.`);
    } else if (id === 'khoi_loi') {
      // GĐ101: triệu hồi Cốt Vương — CHỈ Cốt Tu; đã có pet thì không tốn lõi.
      if (player.classId !== 'cottu') {
        socket.emit('interact_error', { message: 'Chỉ Cốt Tu mới biết triệu hồi Cốt Vương.' });
        return;
      }
      if (cotVuongPetOf(player)) {
        socket.emit('interact_error', { message: 'Bạn đã có Cốt Vương đi theo rồi.' });
        return;
      }
      const cv = cotVuongOf(player);
      cv.active = true; cv.hp = cotVuongMaxHpOf(player);
      spawnCotVuong(player);
      notice('🦴 Cốt Vương đã hiện hình — nó sẽ đỡ đòn cho bạn!');
    } else if (PILL_BY_ITEM[id]) {
      // GĐ133: đan tăng chỉ số có thời hạn — cùng loại làm mới thời hạn, khác loại cộng dồn.
      const key = PILL_BY_ITEM[id];
      const def = PILL_BUFFS[key];
      player.buffs = player.buffs || {};
      const had = player.buffs[key] && player.buffs[key] > Date.now();
      player.buffs[key] = Date.now() + def.minutes * 60000;
      const valTxt = def.mode === 'pct' ? `+${Math.round(def.value * 100)}%` : `+${def.value}`;
      notice(`Dùng ${ITEMS[id].name}: ${def.desc} ${valTxt} trong ${def.minutes} phút${had ? ' (làm mới thời hạn)' : ''}.`);
    } else {
      return;
    }
    player.inventory[id] -= 1;
    persistPlayer(player);
    syncChar(socket, player);
  });

  // GĐ119 bước 2: mặc/tháo trang bị.
  // - Mặc: món phải có trong kho (gearBag), đúng ô của nó, qua luật linh căn
  //   (hệ Vô ai cũng mặc được, Pháp Tu mặc cả 16 hệ, còn lại cần linh căn
  //   tương ứng — sai thì lỗi đúng chữ 'Không thể trang bị').
  // - Mặc vũ khí gear KHÔNG đổi weaponId cũ (tầm/loại đánh giữ nguyên — theo
  //   mặc định đã duyệt); vũ khí gear chỉ cộng chỉ số.
  // - Crit chỉ lưu trong gearStats, chưa móc combat (theo mặc định đã duyệt).
  // - Lệnh bài: tier lưu sẵn trong món, hiệu ứng NPC + Trấn Áp nối ở bước sau.
  const gearResult = () => ({ ok: true, gear: player.gear || {}, gearStats: player.gearStats || {},
    maxHp: maxHpEff(player), maxMp: maxMpEff(player) });
  // GĐ132: thu thập điểm tài nguyên — cổng: hp > 0 (linh thể không thu thập),
  // đúng map của điểm, trong 80px (INTERACT_RANGE), đúng nghề của điểm, và
  // chưa thu thập điểm này trong ngày (mỗi điểm ngày 1 lần, tính theo từng
  // người chơi). Thành công: +1–2 nguyên liệu (TẠM), nghề +1 lượt (chung thang
  // 14 cấp với nghề chế tạo), tiến trình quest gather, báo lên cấp nếu có.
  socket.on('gather_node', (data) => {
    if (!player || !data || !data.nodeId) return;
    if (player.hp <= 0) { socket.emit('gather_result', { ok: false, message: 'Đang gục ngã không thu thập được.' }); return; }
    const mapId = mapOf(player);
    const node = (MAP_NODES[mapId] || []).find((n) => n.id === data.nodeId);
    if (!node) { socket.emit('gather_result', { ok: false, message: 'Không tìm thấy điểm tài nguyên này.' }); return; }
    if (Math.hypot(player.x - node.x, player.y - node.y) > INTERACT_RANGE) { socket.emit('gather_result', { ok: false, message: 'Tới gần điểm tài nguyên hơn để thu thập.' }); return; }
    const wantJob = node.kind === 'ore' ? 'daokhoang' : 'haithuoc';
    if (player.job?.jobId !== wantJob) { socket.emit('gather_result', { ok: false, message: `Điểm này của nghề ${JOBS[wantJob].name} — bái sư ${JOBS[wantJob].name} rồi hãy thu thập.` }); return; }
    const today = worldClock().dayIndex;
    if (player.gatheredNodes?.[node.id] === today) { socket.emit('gather_result', { ok: false, message: 'Điểm này hôm nay bạn đã thu thập rồi — mai quay lại nhé.' }); return; }
    const qty = Math.random() < 0.5 ? 1 : 2; // TẠM: 1–2 nguyên liệu mỗi lần
    player.inventory[node.itemId] = (player.inventory[node.itemId] || 0) + qty;
    player.gatheredNodes = player.gatheredNodes || {};
    player.gatheredNodes[node.id] = today;
    const rankBefore = jobRankOf(player);
    player.job.crafts = (player.job.crafts || 0) + 1;
    const rankAfter = jobRankOf(player);
    for (const [qid, def] of Object.entries(QUESTS)) {
      if (def.kind !== 'gather') continue;
      if (def.nodeKind && def.nodeKind !== node.kind) continue;
      if (def.jobId && player.job?.jobId !== def.jobId) continue;
      const q = player.quests?.[qid];
      if (q && q.state === 'active') {
        q.progress = Math.min(def.target, (q.progress || 0) + 1);
        if (q.progress >= def.target) { q.state = 'done'; socket.emit('notice', { text: `✔ Hoàn thành “${def.name}” — về gặp ${questNpcName(def.npcId) || 'người giao nhiệm vụ'} trả nhiệm vụ!` }); }
      }
    }
    persistPlayer(player);
    socket.emit('gather_result', { ok: true, nodeId: node.id, itemId: node.itemId, qty, crafts: player.job.crafts, rank: rankAfter });
    socket.emit('notice', { text: `${node.kind === 'ore' ? '⛏️' : '🌿'} Thu thập +${qty} ${ITEMS[node.itemId]?.name || node.itemId}.` });
    if (rankAfter > rankBefore) socket.emit('notice', { text: `⬆️ LÊN CẤP NGHỀ: ${JOB_RANK_NAMES[rankAfter]} ${JOBS[player.job.jobId].name}!` });
    syncChar(socket, player);
  });
  socket.on('gear_equip', (data) => {
    if (!player || !data || !data.uid) return;
    if (player.hp <= 0) return; // GĐ128: linh thể chỉ đi lại, không tương tác được
    const item = (player.gearBag || {})[data.uid];
    if (!item) { socket.emit('interact_error', { message: 'Không có trang bị này.' }); return; }
    if (player.gear && player.gear[item.slot] === data.uid) { socket.emit('gear_equip_result', gearResult()); return; }
    const chk = GEAR.canEquip(player, item);
    if (!chk.ok) { socket.emit('interact_error', { message: chk.message }); return; }
    player.gear = player.gear || {};
    player.gear[item.slot] = data.uid;
    refreshGearStats(player);
    player.hp = Math.min(player.hp, maxHpEff(player));
    player.mp = Math.min(player.mp, maxMpEff(player));
    persistPlayer(player);
    syncChar(socket, player);
    socket.emit('gear_equip_result', gearResult());
  });
  socket.on('gear_unequip', (data) => {
    if (!player || !data || !data.slot) return;
    if (player.hp <= 0) return; // GĐ128: linh thể chỉ đi lại, không tương tác được
    if (!player.gear || !player.gear[data.slot]) { socket.emit('interact_error', { message: 'Ô này đang trống.' }); return; }
    delete player.gear[data.slot];
    refreshGearStats(player);
    player.hp = Math.min(player.hp, maxHpEff(player));
    player.mp = Math.min(player.mp, maxMpEff(player));
    persistPlayer(player);
    syncChar(socket, player);
    socket.emit('gear_unequip_result', gearResult());
  });

  // GĐ119 bước 3: rèn lại nội tại — roll lại toàn bộ dòng nội tại của món
  // (trùng vẫn được, như lúc sinh đồ), tốn phí theo phẩm. Đồ 0 dòng (dưới Tím)
  // thì không rèn được, thiếu đá thì không trừ. Đồ đang mặc thì tính lại
  // gearStats ngay (nội tại mới đổi chỉ số).
  socket.on('gear_reroll', (data) => {
    if (!player || !data || !data.uid) return;
    if (player.hp <= 0) return; // GĐ128: linh thể chỉ đi lại, không tương tác được
    if (!nearForge(player)) { socket.emit('interact_error', { message: 'Bạn cần đứng gần Thợ Rèn ở Làng Tân Thủ để rèn lại.' }); return; }
    const item = (player.gearBag || {})[data.uid];
    if (!item) { socket.emit('interact_error', { message: 'Không có trang bị này.' }); return; }
    if (!item.talents || item.talents.length === 0) { socket.emit('interact_error', { message: 'Trang bị này không có nội tại để rèn lại.' }); return; }
    const fee = GEAR.REROLL_COST[item.rarity] || 0;
    if ((player.stones || 0) < fee) { socket.emit('interact_error', { message: `Không đủ Linh thạch (cần ${fee}, đang có ${player.stones || 0}).` }); return; }
    player.stones -= fee;
    item.talents = GEAR.rollTalents(item.path, item.rarity);
    if (player.gear && player.gear[item.slot] === data.uid) {
      refreshGearStats(player);
      player.hp = Math.min(player.hp, maxHpEff(player));
      player.mp = Math.min(player.mp, maxMpEff(player));
    }
    persistPlayer(player);
    syncChar(socket, player);
    socket.emit('gear_reroll_result', { ok: true, item, fee, stones: player.stones, gearStats: player.gearStats || {} });
  });

  // GĐ119 bước 4: ĐẶT RÈN ở Tiệm Rèn — người chơi tự làm bản thiết kế (hướng
  // tu, hệ, phẩm, ô, vũ khí/lệnh bài) + đưa đủ nguyên liệu, thợ rèn rèn theo
  // đúng thiết kế, chờ đủ ngày trong game thì nhận (gear_claim). Hệ đặt rèn
  // phải là hệ mặc được (luật như mặc đồ); tối đa 3 đơn cùng lúc (TẠM).
  // GĐ119 bước 5: đã cổng vị trí Thợ Rèn (nearForge) cho đặt/nhận/mua/rèn lại.
  socket.on('gear_order', (data) => {
    if (!player || !data) return;
    if (player.hp <= 0) return; // GĐ128: linh thể chỉ đi lại, không tương tác được
    if (!nearForge(player)) { socket.emit('interact_error', { message: 'Bạn cần đứng gần Thợ Rèn ở Làng Tân Thủ để đặt rèn.' }); return; }
    if (!GEAR.PATHS.includes(data.path) || !GEAR.RARITIES[data.rarity] || !GEAR.SLOTS.includes(data.slot)) {
      socket.emit('interact_error', { message: 'Bản thiết kế không hợp lệ.' }); return;
    }
    const element = GEAR.normElement(data.element);
    if (!element) { socket.emit('interact_error', { message: 'Hệ không hợp lệ.' }); return; }
    let weapon = null;
    if (data.slot === 'WEAPON') {
      const list = GEAR.WEAPONS[data.path] || [];
      weapon = list.find((w) => w.id === data.weapon)?.id || list[0]?.id || null;
      if (!weapon) { socket.emit('interact_error', { message: 'Vũ khí không hợp lệ.' }); return; }
    }
    let tokenRank = null;
    if (data.slot === 'TOKEN') {
      tokenRank = Number(data.tokenRank) || 1;
      if (tokenRank < 1 || tokenRank > 9) { socket.emit('interact_error', { message: 'Cấp lệnh bài từ 1 đến 9.' }); return; }
    }
    const chk = GEAR.canEquip(player, { element });
    if (!chk.ok) { socket.emit('interact_error', { message: chk.message }); return; }
    const orders = player.gearOrders || [];
    if (orders.length >= 3) { socket.emit('interact_error', { message: 'Thợ rèn chỉ nhận tối đa 3 đơn cùng lúc.' }); return; }
    const mats = GEAR.FORGE_MATERIALS[data.rarity] || {};
    for (const [mid, qty] of Object.entries(mats)) {
      if ((player.inventory[mid] || 0) < qty) { socket.emit('interact_error', { message: `Thiếu nguyên liệu: cần ${ITEMS[mid]?.name || mid} ×${qty}.` }); return; }
    }
    for (const [mid, qty] of Object.entries(mats)) player.inventory[mid] -= qty;
    const days = GEAR.FORGE_DAYS[data.rarity] || 1;
    const today = worldClock().dayIndex;
    const order = { id: 'ord_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
      path: data.path, element, rarity: data.rarity, slot: data.slot, weapon, tokenRank,
      createdDay: today, readyDay: today + days };
    player.gearOrders = [...orders, order];
    persistPlayer(player);
    syncChar(socket, player);
    socket.emit('gear_order_result', { ok: true, order, days });
  });
  socket.on('gear_claim', (data) => {
    if (!player || !data || !data.orderId) return;
    if (player.hp <= 0) return; // GĐ128: linh thể chỉ đi lại, không tương tác được
    if (!nearForge(player)) { socket.emit('interact_error', { message: 'Bạn cần đứng gần Thợ Rèn ở Làng Tân Thủ để nhận đồ.' }); return; }
    const orders = player.gearOrders || [];
    const idx = orders.findIndex((o) => o.id === data.orderId);
    if (idx < 0) { socket.emit('interact_error', { message: 'Không có đơn rèn này.' }); return; }
    const order = orders[idx];
    const today = worldClock().dayIndex;
    if (today < order.readyDay) { socket.emit('interact_error', { message: `Chưa tới ngày nhận — còn ${order.readyDay - today} ngày trong game.` }); return; }
    const item = GEAR.generateGear({ path: order.path, element: order.element, rarity: order.rarity, slot: order.slot, weapon: order.weapon, tokenRank: order.tokenRank });
    player.gearBag = player.gearBag || {};
    player.gearBag[item.uid] = item;
    player.gearOrders = orders.filter((_, i) => i !== idx);
    persistPlayer(player);
    syncChar(socket, player);
    socket.emit('gear_claim_result', { ok: true, item });
    notice(`⚒️ Thợ rèn đã rèn xong: ${item.name}!`);
  });

  // GĐ119 bước 4: SHOP BÁN SẴN — kho 8 món/ngày, gieo hạt theo ngày game nên
  // mọi người thấy cùng 1 kho và restart không đổi kho; mỗi người mua tối đa
  // 1 lần/món/ngày (ghi theo ngày, ngày cũ tự bỏ).
  socket.on('gear_shop_stock', () => {
    if (!player) return;
    const day = worldClock().dayIndex;
    const stock = GEAR.shopStockForDay(day);
    const bought = (player.gearShopBought && player.gearShopBought[day]) || [];
    socket.emit('gear_shop_stock_result', { ok: true, dayIndex: day, stock: stock.map((s) => ({ ...s, sold: bought.includes(s.index) })) });
  });
  // GĐ119 bước 5: bảng dữ liệu rèn cho form đặt rèn ở client (chỉ đọc — mọi
  // kiểm tra thật vẫn ở server khi đặt/mua/nhận/rèn lại).
  socket.on('gear_meta', () => {
    if (!player) return;
    socket.emit('gear_meta_result', { ok: true, meta: {
      rarities: GEAR.RARITIES, elements: GEAR.ELEMENTS, paths: GEAR.PATHS,
      pathNames: GEAR.GEAR_DATA.path_names, slots: GEAR.SLOTS, weapons: GEAR.WEAPONS,
      forgeDays: GEAR.FORGE_DAYS, forgeMaterials: GEAR.FORGE_MATERIALS,
      shopPrice: GEAR.SHOP_PRICE, rerollCost: GEAR.REROLL_COST,
    } });
  });
  socket.on('gear_shop_buy', (data) => {
    if (!player || !data || data.index == null) return;
    if (player.hp <= 0) return; // GĐ128: linh thể chỉ đi lại, không tương tác được
    if (!nearForge(player)) { socket.emit('interact_error', { message: 'Bạn cần đứng gần Thợ Rèn ở Làng Tân Thủ để mua đồ.' }); return; }
    const day = worldClock().dayIndex;
    if (data.dayIndex != null && data.dayIndex !== day) { socket.emit('interact_error', { message: 'Kho hàng đã đổi ngày — hãy xem lại kho mới.' }); return; }
    const entry = GEAR.shopStockItem(day, data.index);
    if (!entry) { socket.emit('interact_error', { message: 'Không có món này trong kho.' }); return; }
    const bought = (player.gearShopBought && player.gearShopBought[day]) || [];
    if (bought.includes(data.index)) { socket.emit('interact_error', { message: 'Món này bạn đã mua hôm nay rồi.' }); return; }
    if ((player.stones || 0) < entry.price) { socket.emit('interact_error', { message: `Không đủ Linh thạch (cần ${entry.price}, đang có ${player.stones || 0}).` }); return; }
    player.stones -= entry.price;
    // Sinh lại đúng món trong kho bằng cùng seed ngày: cùng tên + nội tại,
    // chỉ khác uid (mỗi người mua là 1 bản riêng).
    const item = GEAR.shopStockGear(day, data.index);
    player.gearBag = player.gearBag || {};
    player.gearBag[item.uid] = item;
    player.gearShopBought = { [day]: [...bought, data.index] };
    persistPlayer(player);
    syncChar(socket, player);
    socket.emit('gear_shop_buy_result', { ok: true, item, stones: player.stones });
    notice(`Đã mua ${item.name} (−${entry.price} Linh thạch).`);
  });

  socket.on('disconnect', () => {
    if (player && !player._superseded) {
      // GĐ21: nhân vật không biến mất — tự về điểm an toàn ngồi thiền / ngủ
      goOffline(player);
      console.log(`[-] ${player.name} rời game (nhân vật ở lại nghỉ offline) — ${players.size} thực thể`);
    } else {
      console.log(`[-] Socket ${socket.id} ngắt (${player ? 'phiên cũ đã được phiên mới thay' : 'chưa vào game'})`);
    }
  });
});

// Autosave định kỳ: vị trí + HP của mọi người chơi thật đang online
setInterval(() => {
  for (const p of players.values()) persistPlayer(p);
  saveWorld(); // GĐ20: lưu mốc đồng hồ thế giới
}, 15000);

// ------------------- Đồng bộ delta (tối ưu băng thông A+B) -------------------
// Mỗi tick chỉ phát TRƯỜNG THAY ĐỔI của từng entity + danh sách id đã biến mất,
// thay vì gửi lại toàn bộ trạng thái (tên/lớp/cảnh giới/maxHp của người chơi,
// maxHp của quái, NPC tĩnh...). Client gộp delta vào trạng thái đã có.
// Client mới vào được nhận riêng 1 bản FULL (đủ mọi trường) ngay sau welcome,
// rồi gộp các delta phát chung như mọi người.
// GĐ59: cache delta TÁCH THEO MAP — mỗi map một bộ {players, monsters, drops, chests}
const sentByMap = new Map(); // mapId -> cache
function sentCacheFor(mapId) {
  let c = sentByMap.get(mapId);
  if (!c) { c = { players: new Map(), monsters: new Map(), drops: new Map(), chests: new Map() }; sentByMap.set(mapId, c); }
  return c;
}
// GĐ106-sửa bóng ma: tập id "từng gửi" theo map — bản FULL gửi riêng cho 1
// socket không đi qua cache delta của phòng, nên entry trong full mà bị xóa
// trước tick kế tiếp sẽ không bao giờ có Gone (cache chưa từng chứa nó) →
// client giữ bóng ma vĩnh viễn tới khi relog. Ghi id của full vào đây để
// vòng tick báo Gone cho id đã gửi mà nay không còn. Chỉ dùng để tính Gone,
// KHÔNG nạp vào cache so sánh trường (nạp vào đó sẽ làm observer cũ lỡ mất
// thay đổi trường xảy ra giữa tick trước và lúc full được gửi).
const knownByMap = new Map(); // mapId -> {players:Set, monsters:Set, drops:Set, chests:Set}
function knownFor(mapId) {
  let k = knownByMap.get(mapId);
  if (!k) { k = { players: new Set(), monsters: new Set(), drops: new Set(), chests: new Set() }; knownByMap.set(mapId, k); }
  return k;
}
function noteFullFor(mapId, full) {
  const k = knownFor(mapId);
  for (const e of full.players || []) k.players.add(e.id);
  for (const e of full.monsters || []) k.monsters.add(e.id);
  for (const e of full.drops || []) k.drops.add(e.id);
  for (const e of full.chests || []) k.chests.add(e.id);
}
function emitFull(sock, mapId) {
  const f = fullSnapshotFor(mapId);
  noteFullFor(mapId, f);
  sock.emit('server_tick', f);
}
let lastNpcKey = ''; // GĐ40+: khóa danh sách NPC đã phát (theo lịch thương nhân)
let lastSentWorldKey = -1; // GĐ20: khóa ngày×24+giờ của đồng hồ đã phát gần nhất

function playerSyncState(p) {
  return {
    id: p.id, x: Math.round(p.x), y: Math.round(p.y), direction: p.direction,
    name: p.name, classId: p.classId, realm: p.realm || 'pham', tier: p.tier || 0,
    robe: p.robe ?? null, gender: p.gender || 'nam', weaponId: p.weaponId || null,
    hp: Math.round(p.hp), maxHp: maxHpEff(p),
    mp: Math.round(p.mp), maxMp: maxMpEff(p),
    rest: p.isOffline ? (p.restState || null) : null, // GĐ21: 'meditate' | 'sleep' | null (đang online)
    companion: p.isCompanion ? 1 : 0, // GĐ22: đồng môn AI đi theo người chơi khác
    cotVuong: p.isCotVuong ? 1 : 0, // GĐ101: Cốt Vương (pet xương của Cốt Tu)
    quyHon: p.isQuyHon ? 1 : 0, // GĐ102: Quỷ Hồn (pet ma của Quỷ Tu)
    tamed: p.isTamed ? 1 : 0, // GĐ137: thú thuần hóa (pet của Thú Sư)
    tamedKind: p.tamedKind || '', // GĐ137: loài thú thuần hóa (để client vẽ đúng sprite)
    honKhi: honKhiOf(p), // GĐ102: Hồn Khí Quỷ Tu (lớp khác = 0)
    congDuc: Math.floor(congDucOf(p)), // GĐ103: Công Đức Phật Tu (lớp khác = 0)
    phatTier: phatTierOf(p), // GĐ103: Tầng Thức Phật Tu (lớp khác = 0)
    preaching: p.preaching ? 1 : 0, // GĐ103: đang Thuyết Pháp
    haoNhien: haoNhienOf(p), // GĐ105: Hạo Nhiên Nho Tu (lớp khác = 0)
    nhoStudy: nhoStudySecOf(p), // GĐ105: tổng giây đọc sách Nho Tu
    nhoChuong: p.classId === 'nhotu' ? nhoChuongOf(p).join(',') : '', // GĐ105: Chương đã mở
    studying: p.studying ? 1 : 0, // GĐ105: đang đọc sách
    nhoZoneChuong: (!p.isOffline && p.nhoZone && Date.now() < p.nhoZone.until) ? p.nhoZone.chuong : 0, // GĐ105: Ý Cảnh đang mở
    nhoZoneX: (!p.isOffline && p.nhoZone && Date.now() < p.nhoZone.until) ? Math.round(p.nhoZone.x) : 0, // GĐ105
    nhoZoneY: (!p.isOffline && p.nhoZone && Date.now() < p.nhoZone.until) ? Math.round(p.nhoZone.y) : 0, // GĐ105
    nhoZoneLeft: (!p.isOffline && p.nhoZone && Date.now() < p.nhoZone.until) ? Math.max(0, Math.ceil((p.nhoZone.until - Date.now()) / 1000)) : 0, // GĐ105: giây vùng còn lại
    // GĐ135: trận của chủ trận — số phẳng để delta-diff tick an toàn (0 = không có)
    tranBuff: (!p.isOffline && p.tranBuff && Date.now() < p.tranBuff.until && p.tranBuff.mapId === mapOf(p)) ? 1 : 0,
    tranBuffX: (!p.isOffline && p.tranBuff && Date.now() < p.tranBuff.until && p.tranBuff.mapId === mapOf(p)) ? Math.round(p.tranBuff.x) : 0,
    tranBuffY: (!p.isOffline && p.tranBuff && Date.now() < p.tranBuff.until && p.tranBuff.mapId === mapOf(p)) ? Math.round(p.tranBuff.y) : 0,
    tranDebuff: (!p.isOffline && p.tranDebuff && Date.now() < p.tranDebuff.until && p.tranDebuff.mapId === mapOf(p)) ? 1 : 0,
    tranDebuffX: (!p.isOffline && p.tranDebuff && Date.now() < p.tranDebuff.until && p.tranDebuff.mapId === mapOf(p)) ? Math.round(p.tranDebuff.x) : 0,
    tranDebuffY: (!p.isOffline && p.tranDebuff && Date.now() < p.tranDebuff.until && p.tranDebuff.mapId === mapOf(p)) ? Math.round(p.tranDebuff.y) : 0,
    tranSeal: (!p.isOffline && p.tranSeal && Date.now() < p.tranSeal.until && p.tranSeal.mapId === mapOf(p)) ? 1 : 0,
    tranSealX: (!p.isOffline && p.tranSeal && Date.now() < p.tranSeal.until && p.tranSeal.mapId === mapOf(p)) ? Math.round(p.tranSeal.x) : 0,
    tranSealY: (!p.isOffline && p.tranSeal && Date.now() < p.tranSeal.until && p.tranSeal.mapId === mapOf(p)) ? Math.round(p.tranSeal.y) : 0,
    tranTeleport: (!p.isOffline && p.teleportArray && p.teleportArray.mapId === mapOf(p)) ? 1 : 0,
    tranTeleportX: (!p.isOffline && p.teleportArray && p.teleportArray.mapId === mapOf(p)) ? Math.round(p.teleportArray.x) : 0,
    tranTeleportY: (!p.isOffline && p.teleportArray && p.teleportArray.mapId === mapOf(p)) ? Math.round(p.teleportArray.y) : 0,
    yDuc: Math.floor(yDucOf(p)), // GĐ104: Y Đức Y Tu (lớp khác = 0)
    yGift: yGiftUnlockedOf(p) ? 1 : 0, // GĐ104: đã mở Cố Bản Bồi Nguyên
    yRevive: yReviveUnlockedOf(p) ? 1 : 0, // GĐ104: đã mở Hồi Dương Cứu Nghịch
    downed: isDowned(p) ? 1 : 0, // GĐ104: đang gục ngã chờ cứu
    downedLeft: p.downedUntil ? Math.max(0, Math.ceil((p.downedUntil - Date.now()) / 1000)) : 0, // GĐ104: giây gục còn lại
    petHp: petHpOf(p), // GĐ101: máu pet của chủ, dạng "hp/maxHp" (null = không có pet)
    petIsTamed: (() => { const pt = p.petId ? players.get(p.petId) : null; return pt && pt.isTamed ? 1 : 0; })(), // GĐ137: pet đang hiện có phải thú thuần hóa
    petName: (() => { const pt = p.petId ? players.get(p.petId) : null; return pt && pt.isTamed ? (pt.name || '') : ''; })(), // GĐ137: tên thú thuần hóa (để HUD ghi đúng tên)
    bequan: p.bequan ? 1 : 0, // GĐ23: đang bế quan tại Tụ Linh Trận
    learning: p.learningActive ? 1 : 0, // GĐ31-sửa: đang ngồi lĩnh ngộ công pháp
    meditating: p.meditating ? 1 : 0, // GĐ76: đang ngồi thiền → nhãn 🧘 + nút Đứng dậy
    food: Math.round(p.food ?? 100), water: Math.round(p.water ?? 100), // GĐ78: thức ăn / nước uống
    flying: p.flying ? 1 : 0, // GĐ88: đang ngự kiếm bay → nhân vật nhấc khỏi mặt đất
    hoThe: (p.hoTheUntil && Date.now() < p.hoTheUntil) ? 1 : 0, // GĐ88: Kim Đan Hộ Thể đang bật
    rage: Math.round(rageOf(p)), // GĐ95: Nộ Khí Thể Tu (lớp khác = 0)
    unyield: (p.unyieldUntil && Date.now() < p.unyieldUntil) ? 1 : 0, // GĐ95: Bất khuất đang bật
    satKhi: satKhiOf(p), // GĐ97: Sát Khí Sát Thủ (lớp khác = 0)
    coating: p.classId === 'satthu' && coatingOf(p) ? coatingOf(p).type + ':' + coatingOf(p).hits : null, // GĐ98: lớp độc bôi vũ khí, dạng "loại:số đòn" (chuỗi để delta-diff chỉ phát khi đổi)
    ngoKiem: ngoKiemOf(p), // GĐ99: Ngộ Kiếm Kiếm Tu (lớp khác = 0)
    sword: swordOf(p), // GĐ99: Bản Mệnh Kiếm đang trang bị (null = chưa rèn)
    bienDi: bienDiOf(p), // GĐ100: hệ Biến Dị Pháp Tu (null = không có)
    kiemVuc: vucActiveOf(p) ? 1 : 0, // GĐ99: Kiếm Vực đang bật (HP < 30%)
    kiemUlt: kiemUltActiveOf(p) ? 1 : 0, // GĐ99: Nhân Kiếm Hợp Nhất đang bật
    ult: ultActiveOf(p) ? 1 : 0, // GĐ97: Siêu Giác Quan đang bật
    dodges: p.dodgeCount || 0, // GĐ97: số đòn đã né (tích lũy từ lúc vào game)
  };
}
function monsterSyncState(m) {
  return {
    id: m.id, x: Math.round(m.x), y: Math.round(m.y), hp: m.hp, maxHp: m.maxHp, direction: m.direction,
    kind: m.kind, name: m.name || null, trial: m.kind === 'trial' ? m.trialKind : null, ownerId: m.ownerId || null, hidden: m.hidden ? 1 : 0, boss: (m.trialKind || m.mapBoss || MONSTER_TYPES[m.kind]?.minChestGrade) ? 1 : 0, // GĐ61: trùm/thử thách → thanh máu trùm trên HUD; GĐ70: + trùm theo map
    st: (m.windupUntil && Date.now() < m.windupUntil) ? 'windup' : Date.now() < (m.stunUntil || 0) ? 'stun' : Date.now() < (m.rootUntil || 0) ? 'root' : Date.now() < (m.slowUntil || 0) ? 'slow' : m.dots && m.dots.length ? 'dot' : null, // GĐ34; GĐ70: + windup
  };
}
function dropSyncState(d) {
  return { id: d.id, kind: d.kind, itemId: d.itemId, amount: d.amount, x: d.x, y: d.y };
}
// So trạng thái hiện tại với bản đã phát: entity mới → gửi trọn; đổi trường nào
// gửi trường đó; entity biến mất → vào danh sách gone.
function diffInto(cache, cur, changed, gone) {
  for (const [id, st] of cur) {
    const prev = cache.get(id);
    if (!prev) {
      changed.push(st);
      cache.set(id, st);
      continue;
    }
    let entry = null;
    for (const k of Object.keys(st)) {
      if (k !== 'id' && prev[k] !== st[k]) {
        if (!entry) entry = { id };
        entry[k] = st[k];
      }
    }
    if (entry) changed.push(entry);
    cache.set(id, st);
  }
  for (const id of Array.from(cache.keys())) {
    if (!cur.has(id)) {
      gone.push(id);
      cache.delete(id);
    }
  }
}
// GĐ40+: NPC trong snapshot — thương nhân chỉ xuất hiện khi đang ghé làng
function npcsForWorld() {
  return NPCS.filter((n) => n.id !== 'npc_thuongnhan' || merchantPresent());
}
function fullSnapshotFor(mapId) {
  const inMap = (a) => mapOf(a) === mapId; // GĐ59: chỉ entity của map này
  return {
    v: 2, full: true,
    players: Array.from(players.values()).filter(inMap).map(playerSyncState),
    monsters: Array.from(monsters.values()).filter(inMap).map(monsterSyncState),
    npcs: mapId === HOME_MAP ? npcsForWorld() : [], // GĐ40+ (NPC chỉ ở làng)
    drops: Array.from(drops.values()).filter(inMap).map(dropSyncState),
    chests: Array.from(chests.values()).filter(inMap).map(chestSyncState), // GĐ39
    world: worldClock(), // GĐ20
  };
}
function fullSnapshot() { return fullSnapshotFor(HOME_MAP); }

// ------------------------- Vòng lặp tick của server -------------------------
setInterval(() => {
  const dt = TICK_MS / 1000; // 0.1 giây mỗi tick
  // GĐ20: đồng hồ thế giới trôi theo tốc độ đoạn ngày/đêm; qua 00:00 = ngày mới
  const wmBefore = worldMinutes;
  worldMinutes = advanceWorldMinutes(worldMinutes, TICK_MS);
  const wmDelta = worldMinutes - wmBefore; // GĐ23: số phút game trôi trong tick này
  const wcNow = worldClock();
  if (wcNow.dayIndex !== lastWorldDayIndex) {
    const wasPresent = merchantPresent(lastWorldDayIndex);
    lastWorldDayIndex = wcNow.dayIndex;
    saveWorld();
    // GĐ40+: loan tin thương nhân lưu động tới / rời làng cho cả server
    const nowPresent = merchantPresent(wcNow.dayIndex);
    if (nowPresent && !wasPresent) io.emit('notice', { text: '🛒 Thương Nhân Lưu Động đã ghé Làng Tân Thủ! Hàng hiếm số lượng ít — tới quảng trường phía đông gặp ông ta.' });
    else if (!nowPresent && wasPresent) io.emit('notice', { text: '🧳 Thương Nhân Lưu Động đã rời làng — ai chưa kịp mua thì đặt hàng lần ghé sau nhé.' });
    // Ngày mới (GĐ20+GĐ21): online +1 Tu vi (tu luyện thường — đúng file);
    // offline NGỒI THIỀN +3 (bế quan — đúng file); offline NGỦ +0 (không hấp thụ linh khí)
    for (const p of players.values()) {
      if (p.isBot) continue;
      // GĐ23: người đang BẾ QUAN không nhận +1 thường — họ đi đường cộng dồn +3/ngày riêng
      const gain = p.isOffline ? (p.restState === 'meditate' ? 3 : 0) : p.bequan ? 0 : 1;
      p.tuVi = (p.tuVi || 0) + gain;
      if (gain > 0 && p.counters) p.counters.totalTuVi = (p.counters.totalTuVi || 0) + gain; // GĐ27
      if (p.isOffline) {
        // GĐ21: ghi sổ quãng nghỉ để lúc chủ nhân quay lại còn có tổng kết
        p.restDays = (p.restDays || 0) + 1;
        p.restGrant = (p.restGrant || 0) + gain;
        // GĐ32: đang HỌC OFFLINE → qua 1 ngày = +1440 phút tiến độ lĩnh ngộ
        if (p.restState === 'learn' && p.learning) {
          p.learning.progressMin = (p.learning.progressMin || 0) + 1440;
          const skL = SKILL_BY_ID[p.learning.skillId];
          if (skL && p.learning.progressMin >= (p.learning.needMin || learnNeedMinFor(p, skL))) {
            completeLearning(p, null);
            p.restState = p.meditation ? 'meditate' : 'sleep';
          }
        }
      }
      p.lastDayIndex = wcNow.dayIndex;
      persistPlayer(p);
      const sock = io.sockets.sockets.get(p.id);
      if (sock) syncChar(sock, p);
    }
    // GĐ25: qua ngày mới — kiểm tra thọ nguyên của người ĐANG ONLINE (ân hạn
    // của người offline chỉ chạy khi họ đăng nhập thấy, theo phương án B)
    for (const p of [...players.values()]) {
      if (p.isBot || p.isOffline || p.isCompanion) continue;
      const st = checkLifespan(p);
      const sock = io.sockets.sockets.get(p.id);
      if (st === 'die') {
        if (sock) {
          sock.emit('character_died', { name: p.name, message: `${p.name} đã hết thọ nguyên và qua 30 ngày ân hạn — nhân vật TỌA HÓA vĩnh viễn.` });
        }
        killCharacterPermanent(p);
        if (sock) sock.disconnect(true);
      } else if (st === 'grace_started' && sock) {
        sock.emit('lifespan_grace', { graceDaysLeft: graceDaysLeftOf(p), lifespanLeft: lifespanLeftOf(p) });
        syncChar(sock, p);
      } else if (st === 'grace' && sock) {
        syncChar(sock, p); // cập nhật đếm ngược ân hạn trên HUD
      }
    }
    io.emit('world_day', { day: wcNow.day, month: wcNow.month, year: wcNow.year });
    console.log(`[thời gian] Ngày mới: ngày ${wcNow.day} tháng ${wcNow.month} năm ${wcNow.year} — người online +1 Tu vi`);
  }
  for (const p of players.values()) {
    if (p.isCotVuong) { updateCotVuong(p, dt); continue; } // GĐ101: Cốt Vương
    if (p.isQuyHon) { updateQuyHon(p, dt); continue; } // GĐ102: Quỷ Hồn
    if (p.isTamed) { updateTamed(p, dt); continue; } // GĐ137: thú thuần hóa
    if (p.isCompanion) { updateCompanion(p, dt); continue; } // GĐ22: đồng môn AI
    if (p.isOffline) continue; // GĐ21: nhân vật nghỉ offline đứng yên tại điểm an toàn
    // GĐ104: GỤC NGÃ — bỏ qua mọi xử lý tick khác (thiền, bế quan, lĩnh ngộ);
    // hết 40s không được cứu → chết thật, về làng như cũ (kèm hủy trùm
    // thử thách nếu gục vì thử thách). GĐ128: linh thể ĐI LẠI ĐƯỢC —
    // xuyên vật cản, kẹp biên map; đánh/chiêu/thiền/dịch chuyển/tương tác
    // vẫn bị chặn ở handler (hp <= 0).
    if (p.downedUntil) {
      if (Date.now() >= p.downedUntil) {
        p.downedUntil = 0;
        handlePlayerDeath(p, { kind: p.downedSourceKind || undefined, name: p.downedSourceName || 'quái vật' });
      } else {
        const spd = speedOf(effStatsOf(p));
        const dims = mapDims(mapOf(p));
        const w = dims ? dims.w : WORLD_W;
        const h = dims ? dims.h : WORLD_H;
        const ivx = p.input ? p.input.vx : 0;
        const ivy = p.input ? p.input.vy : 0;
        p.x = Math.max(0, Math.min(w, p.x + ivx * spd * dt));
        p.y = Math.max(0, Math.min(h, p.y + ivy * spd * dt));
        if (ivx !== 0 || ivy !== 0) faceDirection(p, ivx, ivy);
      }
      continue;
    }
    // GĐ97: hết Siêu Giác Quan → Sát Khí về 0 (đã tiêu hết, không tự kích lại ngay).
    if (p.classId === 'satthu' && p.ultUntil && Date.now() >= p.ultUntil) {
      p.ultUntil = 0;
      const cr = classResOf(p);
      if ((cr.satKhi || 0) >= 100) cr.satKhi = 0;
    }
    // GĐ103: THUYẾT PHÁP — đứng yên thì mỗi tick tích Công Đức theo giây thực;
    // có ý định di chuyển thì ngắt (dự phòng — client_input đã ngắt ngay khi bấm).
    if (p.preaching) {
      if (p.input && (p.input.vx !== 0 || p.input.vy !== 0)) {
        stopPreaching(p, 'move');
      } else {
        addCongDuc(p, dt * THUYET_PHAP_PER_SEC);
      }
    }
    // GĐ105: ĐỌC SÁCH — đứng yên ở Văn Uyển thì mỗi tick tích Hạo Nhiên +
    // giây đọc (mở Chương); có ý định di chuyển thì ngắt (dự phòng).
    if (p.studying) {
      if (p.input && (p.input.vx !== 0 || p.input.vy !== 0)) {
        stopStudying(p, 'move');
      } else {
        addNhoStudy(p, dt);
      }
    }
    // GĐ105: Ý CẢNH — vùng của chính người này tác dụng lên đồng đội/quái quanh vùng.
    if (p.nhoZone) applyNhoZones(p, dt);
    if (p.tranBuff || p.tranDebuff || p.tranSeal) applyTranArrays(p, dt); // GĐ135: tick trận của chủ trận
    // GĐ23: BẾ QUAN — đứng yên hấp thụ linh khí (+1 Tu vi mỗi 480 phút game);
    // có ý định di chuyển thì dừng bế quan và đi tiếp bình thường.
    if (p.bequan) {
      if (p.input && (p.input.vx !== 0 || p.input.vy !== 0)) {
        setBequan(p, false);
      } else {
        p.bequanAcc = (p.bequanAcc || 0) + wmDelta;
        if (p.counters) p.counters.bequanMin = (p.counters.bequanMin || 0) + wmDelta; // GĐ27: phút bế quan tích lũy
        let gained = 0;
        while (p.bequanAcc >= BEQUAN_MIN_PER_POINT) {
          p.bequanAcc -= BEQUAN_MIN_PER_POINT;
          gained++;
        }
        if (gained > 0) {
          p.tuVi = (p.tuVi || 0) + gained;
          if (p.counters) p.counters.totalTuVi = (p.counters.totalTuVi || 0) + gained; // GĐ27
          persistPlayer(p);
          const sock = io.sockets.sockets.get(p.id);
          if (sock) syncChar(sock, p);
        }
        continue;
      }
    }
    // GĐ31-SỬA: NGỒI LĨNH NGỘ — ngồi yên thì tiến độ chạy theo phút game;
    // có ý định di chuyển thì dừng buổi học (GIỮ tiến độ, khác với bị đánh).
    if (p.learningActive && p.learning) {
      if (p.input && (p.input.vx !== 0 || p.input.vy !== 0)) {
        breakLearning(p, false);
      } else {
        p.learning.progressMin = (p.learning.progressMin || 0) + wmDelta;
        const sk = SKILL_BY_ID[p.learning.skillId];
        if (sk && p.learning.progressMin >= learningNeedMin(sk, p)) {
          const sock = io.sockets.sockets.get(p.id);
          completeLearning(p, sock || null);
        } else if (Math.floor(p.learning.progressMin) % 60 < wmDelta) {
          // Mỗi ~60 phút game đồng bộ 1 lần cho HUD hiện % tiến độ
          const sock = io.sockets.sockets.get(p.id);
          if (sock) syncChar(sock, p);
          persistPlayer(p);
        }
        continue;
      }
    }
    // GĐ133: buff đan dược hết hạn → dọn + kẹp máu/mana về max mới + lưu (hiếm nên lưu trực tiếp được).
    if (p.buffs && Object.keys(p.buffs).length && pruneBuffs(p)) {
      p.hp = Math.min(p.hp, maxHpEff(p));
      p.mp = Math.min(p.mp, maxMpEff(p));
      persistPlayer(p);
    }
    if (p.isBot) {
      // Bot demo: đi dạo TRONG LÀNG (nảy lại ở hàng rào làng)
      if (Math.random() < 0.02) {
        const v = makeVelocity();
        p.vx = v.vx;
        p.vy = v.vy;
      }
      let nx = p.x + p.vx * dt;
      let ny = p.y + p.vy * dt;
      if (hitsObstacle(nx, p.y)) { p.vx = -p.vx; nx = p.x; }
      if (hitsObstacle(p.x, ny)) { p.vy = -p.vy; ny = p.y; }
      p.x = nx;
      p.y = ny;
      faceDirection(p, p.vx, p.vy);
      if (p.x < VILLAGE.x + MARGIN) { p.x = VILLAGE.x + MARGIN; p.vx = Math.abs(p.vx); }
      if (p.x > VILLAGE.x + VILLAGE.w - MARGIN) { p.x = VILLAGE.x + VILLAGE.w - MARGIN; p.vx = -Math.abs(p.vx); }
      if (p.y < VILLAGE.y + MARGIN) { p.y = VILLAGE.y + MARGIN; p.vy = Math.abs(p.vy); }
      if (p.y > VILLAGE.y + VILLAGE.h - MARGIN) { p.y = VILLAGE.y + VILLAGE.h - MARGIN; p.vy = -Math.abs(p.vy); }
    } else {
      // Người thật: tốc độ theo công thức file (Tốc độ cộng nhẹ), tách trục
      // X/Y để trượt dọc tường nhà thay vì kẹt cứng
      // GĐ46: đang NÉ thì dùng hướng + tốc độ vọt, vẫn tôn trọng vật cản
      const dodging = p.dodgeUntil && Date.now() < p.dodgeUntil;
      const stunnedP = Date.now() < (p.stunUntil || 0); // GĐ70: choáng → đứng yên
      const mvx = stunnedP ? 0 : (dodging ? p.dodgeVx : p.input.vx);
      const mvy = stunnedP ? 0 : (dodging ? p.dodgeVy : p.input.vy);
      // GĐ88: NGỰ KIẾM PHI HÀNH — đang bay: tốc độ ×1.5, bỏ qua vật cản
      // (chỉ còn kẹp biên map); né vẫn dùng tốc độ vọt riêng, không ×1.5.
      const flying88 = !!p.flying && !dodging;
      const spd = dodging ? DODGE_SPEED : speedOf(effStatsOf(p)) * (Date.now() < (p.slowUntil || 0) ? 1 - (p.slowPct || 0) / 100 : 1) * (flying88 ? 1.5 : 1); // GĐ70: bị chậm → tốc độ giảm
      const stepX = mvx * spd * dt;
      const stepY = mvy * spd * dt;
      const pStuck = hitsObstacleIn(mapOf(p), p.x, p.y); // GĐ53: đang trong vùng cấm thì cho đi ra
      if (flying88) {
        const rt88 = MAP_RUNTIME.get(mapOf(p));
        const w88 = rt88 ? rt88.w : WORLD_W;
        const h88 = rt88 ? rt88.h : WORLD_H;
        p.x = Math.max(0, Math.min(w88, p.x + stepX));
        p.y = Math.max(0, Math.min(h88, p.y + stepY));
      } else {
        if (stepX !== 0) {
          // GĐ91: người chơi tôn trọng vật cản của ĐÚNG map đang đứng
          // (trước đây chỉ kiểm rect map làng nên trên map GDD đi xuyên
          // đá/nhà; quái đã dùng hitsObstacleIn từ trước).
          if (pStuck || !hitsObstacleIn(mapOf(p), p.x + stepX, p.y)) p.x += stepX;
          else if (!hitsObstacleIn(mapOf(p), p.x + stepX / 2, p.y)) p.x += stepX / 2; // bước nửa cho áp sát khít
        }
        if (stepY !== 0) {
          if (pStuck || !hitsObstacleIn(mapOf(p), p.x, p.y + stepY)) p.y += stepY;
          else if (!hitsObstacleIn(mapOf(p), p.x, p.y + stepY / 2)) p.y += stepY / 2;
        }
      }
      faceDirection(p, mvx, mvy);
      // GĐ76: KHÔNG còn hồi chân nguyên tự động (cả trong lẫn ngoài giao
      // tranh — theo ý người chơi 25/10). Chân nguyên chỉ hồi khi NGỒI
      // THIỀN (ngoài giao tranh) hoặc uống Đan Hồi Nguyên.
      if (p.meditating) {
        // GĐ78: đói/khát kiệt sức → thiền không hồi máu/chân nguyên (Tu vi vẫn lên)
        const starving = !needsKd(p) && ((p.food ?? 100) <= 0 || (p.water ?? 100) <= 0);
        if (!starving) {
          // Hồi chậm: máu 1% tối đa/giây + chân nguyên theo tốc độ cũ (TẠM)
          p.hp = Math.min(maxHpEff(p), p.hp + maxHpEff(p) * MEDITATE_HP_PCT_PER_S * dt);
          p.mp = Math.min(maxMpEff(p), p.mp + mpRegenOf(p.stats) * dt);
        }
        // Tu vi tại nơi linh khí (cần linh căn) — +1 / 30s, trần 15 / ngày game
        const sp = spiritPlaceOf(p);
        if (sp && p.linhCan) {
          const day = wcNow.dayIndex;
          if (p.tuViMedDay !== day) { p.tuViMedDay = day; p.tuViMedGain = 0; }
          if ((p.tuViMedGain || 0) < MEDITATE_TUVI_DAY_CAP) {
            p.meditAcc = (p.meditAcc || 0) + dt;
            if (p.meditAcc >= MEDITATE_TUVI_SEC) {
              p.meditAcc -= MEDITATE_TUVI_SEC;
              p.tuVi = (p.tuVi || 0) + 1;
              p.tuViMedGain = (p.tuViMedGain || 0) + 1;
              if (p.counters) p.counters.totalTuVi = (p.counters.totalTuVi || 0) + 1;
              const sock = io.sockets.sockets.get(p.id);
              if (sock) syncChar(sock, p);
            }
          }
        }
      }
      // GĐ78: đói/khát — giao tranh hao thể lực (không áp cho đồng môn; Kim Đan+ tịch cốc)
      if (!p.isCompanion && !needsKd(p)) {
        if (Date.now() - (p.lastCombatAt || 0) < MEDITATE_COMBAT_MS) {
          p.food = Math.max(0, (p.food ?? 100) - (dt * 1000 * NEED_SCALE) / NEED_FOOD_MS_PER_POINT);
          p.water = Math.max(0, (p.water ?? 100) - (dt * 1000 * NEED_SCALE) / NEED_WATER_MS_PER_POINT);
        }
        // Cảnh báo ngưỡng: mỗi ngưỡng 1 lần cho tới khi ăn lại trên 20
        const warnNeed = (key, label) => {
          const v = p[key] ?? 100;
          const sock = io.sockets.sockets.get(p.id);
          if (!sock) return;
          if (v <= 0) {
            if (!p[key + 'EmptyWarned']) { p[key + 'EmptyWarned'] = true; sock.emit('notice', { text: `⚠ Bạn đã kiệt sức vì ${label}! Ăn uống để hồi phục (thiền cũng không hồi máu/chân nguyên khi ${label}).` }); }
          } else if (v <= NEED_WARN_BELOW) {
            if (!p[key + 'Warned']) { p[key + 'Warned'] = true; sock.emit('notice', { text: `Bạn đang ${label} (${Math.round(v)}%) — ghé Tửu Lâu ăn uống đi.` }); }
          } else { p[key + 'Warned'] = false; p[key + 'EmptyWarned'] = false; }
        };
        warnNeed('food', 'đói');
        warnNeed('water', 'khát');
      }
      // Không cho ra khỏi sân 1600×1200
      const pd59 = mapDims(mapOf(p)); // GĐ59: biên theo map đang đứng
      p.x = Math.max(MARGIN, Math.min(pd59.w - MARGIN, p.x));
      p.y = Math.max(MARGIN, Math.min(pd59.h - MARGIN, p.y));
    }
  }

  // Cập nhật AI quái sau người chơi
  // GĐ34: sát thương theo thời gian (thiêu đốt/độc) — quái chết vì DoT vẫn
  // tính công cho người đã hạ độc/đốt nó
  for (const m of [...monsters.values()]) {
    initMonsterFx(m);
    if (!m.dots.length) continue;
    const nowD = Date.now();
    m.dots = m.dots.filter((d) => nowD < d.until);
    if (!m.dots.length) continue;
    const dps = m.dots.reduce((a, d) => a + d.dps, 0);
    m.hp = Math.round((m.hp - dps * 0.1) * 10) / 10;
    if (m.hp <= 0) {
      const owner = players.get(m.dots[0].ownerId);
      if (owner && !owner.isBot && !owner.isOffline) onMonsterKilled(null, owner, m);
      else monsters.delete(m.id);
    }
  }
  // GĐ70: độc trên NGƯỜI CHƠI (quái độc cắn) + ảo ảnh tự tan sau 25s
  for (const p of [...players.values()]) {
    if (p.isBot || p.hp <= 0 || !p.dots?.length) continue;
    const nowP = Date.now();
    p.dots = p.dots.filter((d) => nowP < d.until);
    if (!p.dots.length) continue;
    const dps = p.dots.reduce((a, d) => a + d.dps, 0);
    p.hp = Math.round((p.hp - dps * 0.1) * 10) / 10;
    if (p.hp <= 0) { if (isDownable(p)) enterDowned(p, { name: 'Độc' }); else handlePlayerDeath(p, { name: 'Độc' }); } // GĐ104: chết vì độc cũng gục ngã chờ cứu
  }
  for (const m of [...monsters.values()]) if (m.illusion && Date.now() - (m.illusionBornAt || 0) > 25000) monsters.delete(m.id);
  // GĐ60: map không có người chơi đang hoạt động thì quái đứng yên (tiết
  // kiệm CPU khi có ~600 quái khắp 50 map siêu to; hồi sinh chạy theo giờ)
  const activeMaps60 = new Set();
  for (const p of players.values()) if (!p.isOffline) activeMaps60.add(mapOf(p));
  for (const m of monsters.values()) if (activeMaps60.has(mapOf(m))) updateMonster(m, dt);

  // GĐ60: HÀNH TRÌNH (ngự kiếm / đi thuyền) — tới giờ là tới nơi
  for (const p of players.values()) {
    if (!p.journey) continue;
    if (p.isOffline) { p.journey = null; continue; }
    if (Date.now() < p.journey.arriveAt) continue;
    const j = p.journey; p.journey = null;
    const rtJ = MAP_RUNTIME.get(j.dest);
    const posJ = j.dest === HOME_MAP ? { x: 1080, y: 664 } : rtJ ? { x: rtJ.portal.x, y: rtJ.portal.y - 56 } : null;
    if (!posJ) continue;
    const sockJ = io.sockets.sockets.get(p.id);
    if (sockJ) {
      switchPlayerMap(sockJ, p, j.dest, posJ);
      sockJ.emit('notice', { text: j.method === 'boat' ? `⛵ Thuyền đã cập bến — ${MAP_DEFS.get(j.dest)?.name || j.dest}` : `🗡 Ngự kiếm đã tới — ${MAP_DEFS.get(j.dest)?.name || j.dest}` });
    } else { p.mapId = j.dest; p.x = posJ.x; p.y = posJ.y; }
  }
  // GĐ60: HỐ LỬA ở map dung nham — đứng trong vòng lửa bị thiêu 9 HP/s
  if (Date.now() - lastHazardMs60 >= 1000) {
    lastHazardMs60 = Date.now();
    for (const p of players.values()) {
      if (p.isBot || p.isOffline || p.isCompanion || p.hp <= 0) continue;
      const rtH = MAP_RUNTIME.get(mapOf(p));
      if (!rtH || !rtH.hazards || !rtH.hazards.length) continue;
      for (const hz of rtH.hazards) {
        if (Math.hypot(p.x - hz.x, p.y - hz.y) < hz.r) { hitPlayer(p, 9, 'magic', { id: 'hố lửa', name: 'Hố lửa' }); break; }
      }
    }
  }
  // GĐ60: HỘ TỐNG — người + thương nhân cùng tới điểm giao hàng là xong
  for (const p of players.values()) {
    if (!p.escort || p.isBot || p.isOffline) continue;
    if (mapOf(p) !== p.escort.dest) continue;
    const mer = players.get(p.escort.merchantId);
    if (!mer) { p.escort = null; continue; }
    const d = p.escort.delivery;
    if (Math.hypot(p.x - d.x, p.y - d.y) < 130 && Math.hypot(mer.x - d.x, mer.y - d.y) < 220) completeEscort(p);
  }

  // GĐ127: nhiệm vụ khám phá + manh mối ẩn dạng điểm — tick kiểm tra vị trí.
  for (const p of players.values()) {
    if (p.isBot || p.isOffline) continue;
    let dirty127 = false;
    for (const [qid, q] of Object.entries(p.quests || {})) {
      const def = QUESTS[qid];
      if (!def || q.state !== 'active' || def.kind !== 'explore' || !def.targetPoint) continue;
      const tp = def.targetPoint;
      if (mapOf(p) === tp.mapId && Math.hypot(p.x - tp.x, p.y - tp.y) <= (tp.r || 200)) {
        q.state = 'done'; dirty127 = true;
        const sock = io.sockets.sockets.get(p.id);
        if (sock) {
          sock.emit('notice', { text: `✔ Hoàn thành “${def.name}” — về gặp ${questNpcName(def.npcId) || 'người giao nhiệm vụ'} trả nhiệm vụ!` });
          syncChar(sock, p);
        }
      }
    }
    for (const def of G127_CLUE_POINTS) {
      if (p.flags?.[def.requiresFlag]) continue;
      const cp = def.cluePoint;
      if (mapOf(p) === cp.mapId && Math.hypot(p.x - cp.x, p.y - cp.y) <= (cp.r || 150)) {
        p.flags = p.flags || {}; p.flags[def.requiresFlag] = true; dirty127 = true;
        const sock = io.sockets.sockets.get(p.id);
        if (sock) {
          sock.emit('notice', { text: `🔍 Bạn phát hiện manh mối: ${def.clueHint || def.name} — tới gặp ${questNpcName(def.npcId) || 'người giao nhiệm vụ'} xem nhiệm vụ ẩn!` });
          syncChar(sock, p);
        }
      }
    }
    if (dirty127) persistPlayer(p);
  }

  // Đồ rơi (GĐ8): hết hạn thì xóa; người chơi đi qua gần là tự nhặt
  if (drops.size) {
    const now = Date.now();
    for (const d of Array.from(drops.values())) {
      if (now - d.bornAt > DROP_TTL_MS) {
        drops.delete(d.id);
        continue;
      }
      for (const p of players.values()) {
        if (p.isBot) continue;
        if (mapOf(p) !== mapOf(d)) continue; // GĐ59
        if (Math.hypot(p.x - d.x, p.y - d.y) <= PICKUP_RANGE) {
          drops.delete(d.id);
          if (d.kind === 'stones') {
            p.stones = (p.stones || 0) + d.amount;
            console.log(`[nhặt đồ] ${p.name} nhặt ${d.amount} Linh thạch (có ${p.stones})`);
          } else {
            p.inventory[d.itemId] = (p.inventory[d.itemId] || 0) + d.amount;
            console.log(`[nhặt đồ] ${p.name} nhặt ${ITEMS[d.itemId]?.name || d.itemId} ×${d.amount}`);
          }
          persistPlayer(p);
          const sock = io.sockets.sockets.get(p.id);
          if (sock) syncChar(sock, p);
          break;
        }
      }
    }
  }

  // Rương (GĐ39): hết 120s thì biến mất; người chơi tới gần là MỞ — đồ vào
  // thẳng túi người mở, kèm sự kiện chest_opened để client báo nội dung
  if (chests.size) {
    const now = Date.now();
    for (const c of Array.from(chests.values())) {
      if (now - c.bornAt > CHEST_TTL_MS) {
        chests.delete(c.id);
        continue;
      }
      for (const p of players.values()) {
        if (p.isBot || p.isOffline || p.isCompanion) continue;
        if (mapOf(p) !== mapOf(c)) continue; // GĐ59
        if (Math.hypot(p.x - c.x, p.y - c.y) <= CHEST_OPEN_RANGE) {
          chests.delete(c.id);
          const loot = rollChestLoot(c.grade);
          const lines = [];
          for (const l of loot) {
            if (l.kind === 'stones') {
              const amt = Math.max(1, Math.round(l.amount * rewardFactorOf(p)));
              const sg = c.stoneGrade || 'ha'; // GĐ67: phẩm linh thạch theo quái rơi rương
              if (sg === 'trung') p.stonesTrung = (p.stonesTrung || 0) + amt;
              else if (sg === 'thuong') p.stonesThuong = (p.stonesThuong || 0) + amt;
              else if (sg === 'cuc') p.stonesCuc = (p.stonesCuc || 0) + amt;
              else p.stones = (p.stones || 0) + amt;
              lines.push(`${amt} Linh thạch ${STONE_GRADE_NAME[sg] || 'Hạ phẩm'}`);
            } else {
              p.inventory[l.itemId] = (p.inventory[l.itemId] || 0) + l.qty;
              lines.push(`${ITEMS[l.itemId]?.name || l.itemId} ×${l.qty}`);
            }
          }
          // GĐ101: mở rương 10% thêm Mảnh Xương (Cốt Tu, theo tài liệu)
          if (Math.random() < 0.1) {
            p.inventory.manh_xuong = (p.inventory.manh_xuong || 0) + 1;
            lines.push('Mảnh Xương ×1');
          }
          // GĐ119 bước 4: rương có tỉ lệ rơi trang bị (rương boss cao hơn);
          // đồ rơi theo hướng tu + hệ của người mở nên mặc được ngay.
          const gearRarity = GEAR.chestGearFor(c.grade, c.stoneGrade);
          if (gearRarity) {
            const found = randomGearFor(p, [gearRarity]);
            p.gearBag = p.gearBag || {};
            p.gearBag[found.uid] = found;
            lines.push(`⚔️ ${found.name}`);
          }
          persistPlayer(p);
          const sock = io.sockets.sockets.get(p.id);
          if (sock) {
            sock.emit('chest_opened', { grade: c.grade, loot: lines });
            syncChar(sock, p);
          }
          console.log(`[rương] ${p.name} mở rương ${c.grade}: ${lines.join(', ')}`);
          break;
        }
      }
    }
  }

  // BROADCAST delta THEO MAP (GĐ59): gom entity theo map, diff với cache
  // riêng của map, phát vào phòng 'map:<id>' — client chỉ thấy map mình đứng.
  // Map không có socket nào thì bỏ qua + xóa cache (người vào sau nhận FULL).
  const byMap59 = new Map();
  const bucket59 = (mid) => {
    let b = byMap59.get(mid);
    if (!b) { b = { players: new Map(), monsters: new Map(), drops: new Map(), chests: new Map() }; byMap59.set(mid, b); }
    return b;
  };
  for (const p of players.values()) bucket59(mapOf(p)).players.set(p.id, playerSyncState(p));
  for (const m of monsters.values()) bucket59(mapOf(m)).monsters.set(m.id, monsterSyncState(m));
  for (const d of drops.values()) bucket59(mapOf(d)).drops.set(d.id, dropSyncState(d));
  for (const c of chests.values()) bucket59(mapOf(c)).chests.set(c.id, chestSyncState(c));
  // GĐ40+: danh sách NPC đổi (thương nhân tới/rời) → gửi lại cho phòng làng
  const npcListNow = npcsForWorld();
  const npcKey = npcListNow.map((n) => n.id).join(',');
  const npcChanged = npcKey !== lastNpcKey;
  if (npcChanged) lastNpcKey = npcKey;
  // GĐ20: đồng hồ chỉ phát kèm tick khi GIỜ đổi (nhẹ băng thông)
  const wKey = wcNow.dayIndex * 24 + wcNow.hour;
  const worldChanged = wKey !== lastSentWorldKey;
  if (worldChanged) lastSentWorldKey = wKey;
  for (const mapId of new Set([...byMap59.keys(), ...sentByMap.keys()])) {
    const room = io.sockets.adapter.rooms.get('map:' + mapId);
    if (!room || room.size === 0) { sentByMap.delete(mapId); knownByMap.delete(mapId); continue; }
    const cache = sentCacheFor(mapId);
    const cur = byMap59.get(mapId) || { players: new Map(), monsters: new Map(), drops: new Map(), chests: new Map() };
    const delta = { v: 2, full: false, players: [], playersGone: [], monsters: [], monstersGone: [], drops: [], dropsGone: [], chests: [], chestsGone: [] };
    diffInto(cache.players, cur.players, delta.players, delta.playersGone);
    diffInto(cache.monsters, cur.monsters, delta.monsters, delta.monstersGone);
    diffInto(cache.drops, cur.drops, delta.drops, delta.dropsGone);
    diffInto(cache.chests, cur.chests, delta.chests, delta.chestsGone);
    // GĐ106: Gone cho cả id chỉ mới gửi qua bản FULL (chưa vào cache tick).
    const known = knownFor(mapId);
    const extraGone = (set, curMap, goneArr) => {
      for (const id of Array.from(set)) {
        if (!curMap.has(id)) { if (!goneArr.includes(id)) goneArr.push(id); set.delete(id); }
      }
    };
    extraGone(known.players, cur.players, delta.playersGone);
    extraGone(known.monsters, cur.monsters, delta.monstersGone);
    extraGone(known.drops, cur.drops, delta.dropsGone);
    extraGone(known.chests, cur.chests, delta.chestsGone);
    if (mapId === HOME_MAP && npcChanged) delta.npcs = npcListNow;
    if (worldChanged) delta.world = wcNow;
    io.to('map:' + mapId).emit('server_tick', delta);
  }
}, TICK_MS);

// Khởi động: nếu có MONGODB_URI thì đồng bộ dữ liệu từ cloud xuống
// TRƯỚC khi mở cổng nhận người chơi (cloud trống mà file có dữ liệu
// thì tự đẩy file lên — chuyển nhà 1 bước). Đồng bộ lỗi thì vẫn mở
// cổng bằng dữ liệu file tại chỗ, không để game chết vì cloud.
(async () => {
  if (await storage.init()) {
    try {
      const wDoc = await storage.loadDoc('world');
      if (wDoc && typeof wDoc.totalMinutes === 'number' && typeof wDoc.savedAt === 'number') {
        worldMinutes = advanceWorldMinutes(wDoc.totalMinutes, Math.max(0, Date.now() - wDoc.savedAt));
        lastWorldDayIndex = Math.floor(worldMinutes / 1440);
        if (wDoc.altarUsed && typeof wDoc.altarUsed === 'object') altarUsed = wDoc.altarUsed; // GĐ85
      } else if (wDoc === null) saveWorld(); // cloud chưa có → đẩy bản file lên
      const cDoc = await storage.loadDoc('characters');
      if (cDoc && typeof cDoc === 'object') characters = cDoc;
      else if (cDoc === null && Object.keys(characters).length) saveCharacters();
      const aDoc = await storage.loadDoc('accounts');
      if (aDoc && typeof aDoc === 'object') accounts = aDoc;
      else if (aDoc === null && Object.keys(accounts).length) saveAccounts();
      const sDoc = await storage.loadDoc('sessions');
      if (sDoc && typeof sDoc === 'object') {
        sessions.clear();
        for (const [t, u] of Object.entries(sDoc)) if (typeof t === 'string' && typeof u === 'string') sessions.set(t, u);
      } else if (sDoc === null && sessions.size) saveSessions();
      console.log(`[storage] Đồng bộ cloud xong: ${Object.keys(characters).length} nhân vật, ${Object.keys(accounts).length} tài khoản.`);
    } catch (e) {
      console.warn('[storage] Đồng bộ cloud lỗi — dùng dữ liệu file tại chỗ:', e.message);
    }
  }
  // GĐ76: migrate Đan Tụ Khí → Hồi Xuân Đan (bỏ đan Tu vi hẳn — túi đồ
  // cũ không mất giá trị, chuyển sang đan hồi máu dùng được khi chiến đấu)
  let migrated76 = 0;
  for (const c of Object.values(characters)) {
    if (c && c.inventory && typeof c.inventory === 'object' && (c.inventory.dan_tu_khi || 0) > 0) {
      c.inventory.dan_hoi_xuan = (c.inventory.dan_hoi_xuan || 0) + c.inventory.dan_tu_khi;
      delete c.inventory.dan_tu_khi;
      migrated76++;
    }
  }
  if (migrated76) { saveCharacters(); console.log(`[GĐ76] Đã chuyển Đan Tụ Khí → Hồi Xuân Đan cho ${migrated76} nhân vật.`); }
  server.listen(PORT, () => {
    console.log(`[server] Tap Tanh Tu Tien backend dang chay tai http://localhost:${PORT}`);
    console.log(`[server] Phat 'server_tick' ${1000 / TICK_MS} lan/giay cho ${players.size} player (gom ${DEMO_BOTS} bot demo)`);
  });
})();
