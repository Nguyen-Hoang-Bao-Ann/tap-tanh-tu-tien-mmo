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
const WORLD_W = 1600; // Giai đoạn 4: sân mở rộng 1600×1200, camera phía client bám theo nhân vật
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
  wolf: { name: 'Sói Xám', hp: 40, atk: 5, def: 0, tuVi: 3, count: 5, chaseSpeed: 120, wanderSpeed: 42, atkRange: 42, atkCdMs: 1000, chestTier: 'yeu' },
  bat: { name: 'Dơi Đen', hp: 20, atk: 4, def: 0, tuVi: 4, count: 4, chaseSpeed: 175, wanderSpeed: 62, atkRange: 42, atkCdMs: 900, chestTier: 'trung' },
  golem: { name: 'Thạch Quái', hp: 140, atk: 10, def: 8, tuVi: 8, count: 3, chaseSpeed: 55, wanderSpeed: 20, atkRange: 46, atkCdMs: 1400, chestTier: 'manh' },
};

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
    { w: 20, item: 'dan_tu_khi', qty: [1, 1] },
    { w: 20, item: 'dan_hoi_xuan', qty: [1, 2] },
    { w: 15, item: 'nanh_tinh', qty: [1, 1] },
    { w: 10, item: 'da_soi', qty: [1, 1] },
    { w: 10, item: 'canh_doi', qty: [2, 3] },
  ],
  A: [
    { w: 22, stones: [45, 90] },
    { w: 18, item: 'dan_tu_khi', qty: [2, 2] },
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
function spawnChest(x, y, grade) {
  if (chests.size >= CHEST_MAX_UNOPENED) return null;
  chestSeq++;
  const c = { id: 'chest-' + chestSeq, x: Math.round(x), y: Math.round(y), grade, bornAt: Date.now() };
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
const maxHpOf = (s) => 100 + s.khiHuyet * 10; // HP tối đa = 100 + Khí huyết × 10
const maxMpOf = (s) => s.thanThuc * 10; // Chân nguyên tối đa = Thần thức × 10
const mpRegenOf = (s) => 2 + s.thanThuc * 0.2; // hồi Chân nguyên/giây
const cdrOf = (s) => (0.4 * s.tocDo) / (s.tocDo + 100); // giảm hồi chiêu
const speedOf = (s) => SPEED * (1 + (0.2 * s.tocDo) / (s.tocDo + 100)); // tốc độ chạy theo Tốc độ
function attackStatOf(char) {
  const t = CLASSES[char.classId]?.dmgType || 'physical';
  if (t === 'magic') return { value: char.stats.phapCong, type: 'magic' };
  if (t === 'both') {
    return char.stats.vatCong >= char.stats.phapCong
      ? { value: char.stats.vatCong, type: 'physical' }
      : { value: char.stats.phapCong, type: 'magic' };
  }
  return { value: char.stats.vatCong, type: 'physical' };
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
// Đích Trung cảnh: bước 4, 7, 13, 16. Đại cảnh: LK9→TC1 (điểm 12). TC9→Kim Đan: chưa mở (V1).
const globalStep = (realm, tier) => (realm === 'lk' ? tier : realm === 'tc' ? 9 + tier : 0);
const tuViNeedStep = (step) => Math.round(TU_VI_NEED_BASE * Math.pow(1.12, step - 1));
function breakInfoFor(realm, tier) {
  if (realm !== 'lk' && realm !== 'tc') return null;
  // GĐ20: lifespan = số năm TUỔI THỌ cộng thêm đúng thang B6 (Trung LK +5, Trung TC +10, Đại +50)
  if (realm === 'lk' && tier >= 9) return { type: 'dai', toRealm: 'tc', toTier: 1, points: 12, lifespan: 50, pill: 'dan_truc_co', trial: 'dai' };
  if (realm === 'tc' && tier >= 9) return { type: 'blocked_kimdan' };
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
      return advanceWorldMinutes(w.totalMinutes, Math.max(0, Date.now() - w.savedAt));
    }
  } catch { /* chưa có file → thế giới mới bắt đầu ở startMin */ }
  return startMin;
})();
let lastWorldDayIndex = Math.floor(worldMinutes / 1440);
function saveWorld() {
  const snap = { totalMinutes: worldMinutes, savedAt: Date.now() };
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
    { id: 'phaptu_1', name: 'Hỏa Cầu Thuật', tier: 'coban', coef: 1.0, cdMs: 1100, cost: 9, range: 150 },
    { id: 'phaptu_2', name: 'Băng Tiễn', tier: 'coban', coef: 1.0, cdMs: 1700, cost: 12, range: 150 },
    { id: 'phaptu_3', name: 'Lôi Đình Phá', tier: 'luyenkhi', coef: 1.6, cdMs: 6000, cost: 35, range: 170 },
    { id: 'phaptu_4', name: 'Cửu Thiên Huyền Lôi', tier: 'trucco', coef: 2.2, cdMs: 12000, cost: 80, range: 170 }, // GĐ31-sửa: công pháp Trúc Cơ (tên tạm, số theo khung bậc Trúc Cơ của file: hệ số 2.2, CD 10–20s, tốn 60–120)
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
  dan_tu_khi: { name: 'Đan Tụ Khí', desc: 'Dùng: +50 Tu vi' },
  dan_hoi_xuan: { name: 'Hồi Xuân Đan', desc: 'Dùng: hồi 50% HP tối đa' },
  canh_doi: { name: 'Cánh Dơi', desc: 'Cánh của Dơi Đen — Tiệm Nguyên Liệu thu mua, dùng trả nhiệm vụ' }, // GĐ38
  da_quy: { name: 'Đá Quý', desc: 'Đá quý rơi từ Thạch Quái — bán được giá cao' }, // GĐ38
  // GĐ19: đan đột phá (giá bán là TẠM — file thiết kế không ghi giá)
  dan_trung_canh: { name: 'Đan Trung Cảnh', desc: 'Đan bắt buộc để đột phá Trung cảnh (tầng 3→4, 6→7)' },
  dan_truc_co: { name: 'Đan Trúc Cơ', desc: 'Đan bắt buộc để đột phá Đại cảnh Luyện Khí 9 → Trúc Cơ' },
  dan_ho_mach: { name: 'Đan Hộ Mạch', desc: 'Dùng khi đột phá Đại cảnh: +10% tỉ lệ thành công (tự tiêu hao)' },
  // GĐ22: Tọa Thiền là CÔNG PHÁP TIỆN ÍCH (nhóm Hỗ trợ tu luyện) — phải kiếm
  // được sách mới học được, không ai dạy miễn phí lúc đo linh căn.
  sach_toa_thien: { name: 'Sách Tọa Thiền', desc: 'Công pháp tiện ích (Hỗ trợ tu luyện) — Dùng để học Tọa Thiền: thoát game sẽ ngồi thiền +3 Tu vi/ngày' },
  thu_tien_cu: { name: 'Thư Tiến Cử', desc: 'Hoàn thành 10 nhiệm vụ bảng mới được trao — vé vào Thiên Kiếm Môn (nộp khi gia nhập)' }, // GĐ30
  // GĐ26: sản phẩm NGHỀ PHỤ (chế tạo)
  phu_ho_than: { name: 'Phù Hộ Thân', desc: 'Dùng: hồi 40% HP tối đa' },
  phu_tu_linh: { name: 'Phù Tụ Linh', desc: 'Dùng: +20 Tu vi (cần linh căn)' },
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
};
const SKILL_BY_ID = Object.fromEntries([
  ...Object.values(SKILLS).flat(),
  ...Object.values(SKILL_CATALOG).flatMap((byWeapon) => Object.values(byWeapon).flat()),
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
  if (p.realm === 'kd' || p.realm === 'na' || p.realm === 'ht') return 5;
  return 3;
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
const JOB_RANK_NAMES = { 1: 'Nhập môn', 2: 'Thợ nghề', 3: 'Sư phụ' };
const RECIPES = {
  rc_hoi_xuan: { jobId: 'dansu', name: 'Luyện Hồi Xuân Đan', inputs: { nanh_soi: 2 }, stones: 5, output: 'dan_hoi_xuan', rate: 0.9, minRank: 1 },
  rc_tu_khi: { jobId: 'dansu', name: 'Luyện Đan Tụ Khí', inputs: { nanh_soi: 5 }, stones: 10, output: 'dan_tu_khi', rate: 0.6, minRank: 2 },
  rc_nanh_tinh: { jobId: 'luyenkhi', name: 'Tinh luyện Nanh Sói', inputs: { nanh_soi: 3 }, stones: 0, output: 'nanh_tinh', rate: 0.85, minRank: 1 },
  rc_tran_ky: { jobId: 'tranphap', name: 'Khắc Trận Kỳ Dịch Chuyển', inputs: { nanh_soi: 4 }, stones: 10, output: 'tran_ky', rate: 0.75, minRank: 1 },
  rc_phu_ho_than: { jobId: 'phusu', name: 'Vẽ Phù Hộ Thân', inputs: { nanh_soi: 3 }, stones: 8, output: 'phu_ho_than', rate: 0.8, minRank: 1 },
  rc_phu_tu_linh: { jobId: 'phusu', name: 'Vẽ Phù Tụ Linh', inputs: { nanh_soi: 5 }, stones: 12, output: 'phu_tu_linh', rate: 0.65, minRank: 2 },
  rc_banh_thit: { jobId: 'thusu', name: 'Nướng Bánh Thịt Thú', inputs: { nanh_soi: 2 }, stones: 4, output: 'banh_thit', rate: 0.9, minRank: 1 },
  rc_da_soi: { jobId: 'thusu', name: 'Thuộc Da Sói', inputs: { nanh_soi: 2 }, stones: 0, output: 'da_soi', rate: 0.9, minRank: 1 },
};
function jobRankOf(p) {
  const crafts = p.job?.crafts || 0;
  const byCount = crafts >= 200 ? 3 : crafts >= 50 ? 2 : 1;
  const cap = p.realm === 'tc' || p.realm === 'kd' ? 3 : p.realm === 'lk' ? 2 : 1;
  return Math.min(byCount, cap);
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
    sell: { dan_tu_khi: 30, dan_hoi_xuan: 15, dan_trung_canh: 200, dan_truc_co: 800, dan_ho_mach: 300 }, // người chơi MUA (đan đột phá: giá TẠM)
    buy: { dan_tu_khi: 12, dan_hoi_xuan: 6, dan_trung_canh: 80, dan_truc_co: 320, dan_ho_mach: 120 }, // người chơi BÁN (40% giá mua)
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
    sell: { dan_tu_khi: 25, dan_hoi_xuan: 12, dan_trung_canh: 170, dan_truc_co: 680, dan_ho_mach: 255 },
    buy: { dan_tu_khi: 10, dan_hoi_xuan: 5, dan_trung_canh: 68, dan_truc_co: 272, dan_ho_mach: 102 },
  },
  // GĐ40: THƯƠNG NHÂN LƯU ĐỘNG — NPC buôn bán bình thường trong thế giới;
  // hàng hiếm giá cao (số TẠM), mỗi ngày game chỉ mang theo 3 món luân phiên
  luu_dong: {
    name: 'Thương Nhân Lưu Động', point: { x: 884, y: 616 },
    sell: { dan_tu_khi: 45, dan_hoi_xuan: 22, dan_trung_canh: 300, dan_ho_mach: 340, sach_toa_thien: 500, da_quy: 68, nanh_tinh: 40, phu_ho_than: 60 },
    buy: { da_quy: 45, nanh_tinh: 30, canh_doi: 8 },
  },
};
// GĐ40+: THƯƠNG NHÂN LƯU ĐỘNG v2 — ông ta đi buôn khắp nơi, ghé làng
// THẤT THƯỜNG theo ngày (hàm băm theo ngày: ~40% số ngày có mặt, có đợt
// vắng 3–4 ngày) — muốn mua hàng hiếm phải canh ngày / đặt hàng trước.
// Mỗi ngày ghé: mang 3 món trong kho 8 món (chọn theo ngày), mỗi món có
// SỐ LƯỢNG ít (1–3) và GIÁ dao động ±15% theo ngày. Hết hàng là hết.
// ĐẶT HÀNG: trả trước (giá gốc +10%), lần ghé sau nói chuyện là nhận.
// Ông ta còn BÁN TIN TỨC: mỗi ngày một hint về thế giới (nơi quái mạnh,
// rương, tông môn, vụ án...) — quan sát hint mới mở được đồ ẩn.
const MERCHANT_POOL = ['dan_tu_khi', 'dan_hoi_xuan', 'dan_trung_canh', 'dan_ho_mach', 'sach_toa_thien', 'da_quy', 'nanh_tinh', 'phu_ho_than'];
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
    for (let i = 0; picks.length < 3 && i < 24; i++) {
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
  q_tusi: { name: 'Đối đầu Tu Sĩ Thù Địch', desc: 'Tu sĩ thù địch quấy nhiễu bãi farm. Ra ngoài làng, mở panel Nhiệm vụ bấm ⚔ Khiêu chiến để đấu tay đôi', target: 1, rewardStones: 100, tuViReward: 20, kind: 'kill', monsterKind: 'duel', merit: 3, duel: { spawnName: 'Tu Sĩ Thù Địch', hpMul: 2 } },
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
  q_benhla1: { name: 'Bệnh lạ ở bãi dơi (1/2)', desc: 'Bệnh lạ lan từ bãi dơi — hạ 8 con Dơi Đen để chặn nguồn bệnh', target: 8, rewardStones: 60, kind: 'kill', monsterKind: 'bat', npcId: 'npc_dan', minAffinity: 0, setsFlag: 'case_benhla' },
  q_benhla2: { name: 'Bệnh lạ ở bãi dơi (2/2)', desc: 'Mang 2 Hồi Xuân Đan cho Chủ Tiệm Đan cứu người bệnh', target: 2, rewardStones: 120, tuViReward: 30, kind: 'item', itemId: 'dan_hoi_xuan', npcId: 'npc_dan', minAffinity: 0, requiresFlag: 'case_benhla', clearsFlag: 'case_benhla' },
  // GĐ24: NHIỆM VỤ RIÊNG của NPC — chỉ mở khi thiện cảm với NPC đó ≥ 50 (đúng
  // file B11), nhận + trả ngay tại NPC, làm xong +10 thiện cảm, lặp lại được.
  pq_truonglang: { name: 'Tâm nguyện của Trưởng Làng', desc: 'Mang 5 Nanh Sói cho Trưởng Làng', target: 5, rewardStones: 80, kind: 'item', itemId: 'nanh_soi', npcId: 'npc_truonglang', minAffinity: 50 },
  pq_dan: { name: 'Đan phường thiếu tay', desc: 'Hạ 10 Sói Xám giúp Chủ Tiệm Đan', target: 10, rewardStones: 50, kind: 'kill', monsterKind: 'wolf', npcId: 'npc_dan', minAffinity: 50, rewardItem: 'dan_tu_khi' },
  pq_nguyenlieu: { name: 'Nguyên liệu cho tiệm', desc: 'Mang 5 Nanh Sói cho Chủ Tiệm Nguyên Liệu', target: 5, rewardStones: 70, kind: 'item', itemId: 'nanh_soi', npcId: 'npc_nguyenlieu', minAffinity: 50 },
};
// GĐ40+: vụ án có mở hôm nay không (luân phiên theo chu kỳ ngày)
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
const NPCS = [
  { id: 'npc_truonglang', name: 'Trưởng Làng', role: 'Trả nhiệm vụ', personality: 'Hiền hòa', x: 362, y: 548, direction: 'down' },
  { id: 'npc_dan', name: 'Chủ Tiệm Đan', role: 'Mua bán đan dược', personality: 'Trầm lặng', shopId: 'tiem_dan', x: 985, y: 548, direction: 'down' },
  { id: 'npc_nguyenlieu', name: 'Chủ Tiệm Nguyên Liệu', role: 'Mua bán nguyên liệu', personality: 'Hào sảng', shopId: 'tiem_nguyen_lieu', x: 368, y: 379, direction: 'down' },
  { id: 'npc_thuongnhan', name: 'Thương Nhân Lưu Động', role: 'Buôn hàng hiếm khắp nơi', personality: 'Tham lam', shopId: 'luu_dong', x: 884, y: 616, direction: 'down' }, // GĐ40
  { id: 'npc_sugia', name: 'Sứ Giả Tông Môn', role: 'Chiêu mộ đệ tử', personality: 'Trang nghiêm', x: 762, y: 470, direction: 'down' }, // GĐ30
];
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
const MERIT_PER_POINT = 50;
function sectInfoFor(p) {
  const w = worldClock();
  const stepNow = globalStep(p.realm, p.tier);
  const letter = (p.inventory?.thu_tien_cu || 0) > 0;
  const tkOpen = w.month === 3;
  const htOpen = (w.year % 3 === 0) && w.month <= 2;
  return {
    merit: p.merit || 0,
    boardQuests: p.boardQuests || 0,
    letter,
    sect: p.sect || null,
    sectName: p.sect && SECTS[p.sect] ? SECTS[p.sect].name : null,
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
  // GĐ7: tiến trình tu luyện
  c.stats = p.stats;
  c.freePoints = p.freePoints;
  c.statPoints = p.statPoints;
  c.linhCan = p.linhCan;
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
  // GĐ26: nghề phụ
  c.job = p.job || null;
  // GĐ27: số liệu thành tựu + mốc đã nhận thưởng
  c.counters = p.counters || {};
  c.achClaimed = p.achClaimed || [];
  c.tuVi = p.tuVi;
  c.skills = p.skills;
  // GĐ8: kinh tế + nhiệm vụ
  c.stones = p.stones;
  c.inventory = p.inventory;
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
function newSession(username) {
  const token = crypto.randomBytes(24).toString('hex');
  sessions.set(token, username);
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
const VILLAGE = { x: 240, y: 180, w: 920, h: 760 }; // hàng rào làng (4 cổng ở 4 hướng đường)
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
const TREE_TRUNKS = [
  [280, 220], [1120, 220], [280, 900], [1120, 905], [520, 300], [880, 300],
  [520, 860], [880, 640], [280, 400], [1120, 400], [640, 215], [760, 905],
  [150, 150], [1450, 150], [150, 1050], [1450, 1050], [120, 600], [1480, 600],
  [800, 80], [80, 80],
].map(([tx, ty]) => ({ x: tx - 6, y: ty + 6, w: 12, h: 12 }));
const OBSTACLES = [...HOUSE_OBSTACLES, POND, ...TREE_TRUNKS];

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
  const stuck = hitsObstacle(a.x, a.y);
  if (stuck || !hitsObstacle(nx, a.y)) a.x = nx;
  else { const mx = (a.x + nx) / 2; if (!hitsObstacle(mx, a.y)) a.x = mx; }
  if (stuck || !hitsObstacle(a.x, ny)) a.y = ny;
  else { const my = (a.y + ny) / 2; if (!hitsObstacle(a.x, my)) a.y = my; }
}

const app = express();
const server = http.createServer(app);

// Socket.io — cho phép client Vite (cổng 5173) kết nối chéo origin khi dev
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

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
    if (op.isOffline && op.charKey === charKey) {
      if ((op.restDays || 0) > 0) {
        offlineSummary = { state: op.restState || null, days: op.restDays, grant: op.restGrant || 0 };
      }
      players.delete(id);
    }
  }
  const pos =
    typeof char.x === 'number' && typeof char.y === 'number' && !hitsObstacle(char.x, char.y)
      ? { x: char.x, y: char.y }
      : plazaSpawn();
  const player = {
    id: socket.id,
    x: pos.x,
    y: pos.y,
    vx: 0,
    vy: 0,
    input: { vx: 0, vy: 0 },
    direction: 'down',
    isBot: false,
    name: char.name,
    classId: char.classId,
    stats: char.stats,
    hp: Math.min(char.hp ?? maxHpOf(char.stats), maxHpOf(char.stats)),
    mp: Math.min(char.mp ?? maxMpOf(char.stats), maxMpOf(char.stats)),
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
    // GĐ22: con đường khởi đầu (nhân vật cũ chưa có → chơi 1 mình)
    path: char.path === 'sect' ? 'sect' : 'solo',
    homeType: char.homeType || (char.path === 'sect' ? 'tongmon' : 'daoquan'),
    skills: Array.isArray(char.skills) ? char.skills : [],
    skillReadyAt: {},
    // GĐ8: kinh tế + nhiệm vụ
    stones: char.stones ?? 0,
    inventory: char.inventory && typeof char.inventory === 'object' ? char.inventory : {},
    quests: char.quests && typeof char.quests === 'object' ? char.quests : {},
    // GĐ24: thiện cảm NPC
    affinity: char.affinity && typeof char.affinity === 'object' ? char.affinity : {},
    affTalk: char.affTalk && typeof char.affTalk === 'object' ? char.affTalk : {},
    // GĐ26: nghề phụ
    job: char.job && JOBS[char.job.jobId] ? { jobId: char.job.jobId, crafts: char.job.crafts || 0 } : null,
    merit: char.merit || 0, boardQuests: char.boardQuests || 0, letterGiven: !!char.letterGiven, sect: char.sect || null, sectTrialPassed: !!char.sectTrialPassed, learning: char.learning || null, // GĐ30+31
    flags: char.flags && typeof char.flags === 'object' ? char.flags : {}, // GĐ40: cờ chuỗi nhiệm vụ (vụ án bệnh lạ)
    merchantOrder: char.merchantOrder || null, // GĐ40+: đơn đặt hàng với thương nhân lưu động
    caseCulprit: char.caseCulprit || null, caseClues: char.caseClues && typeof char.caseClues === 'object' ? char.caseClues : {}, // GĐ40+: vụ án điều tra
    equipped: char.equipped || [], // GĐ36
    boards: char.boards || null, activeBoard: char.activeBoard || 0, // GĐ37
    // GĐ27: số liệu thành tựu
    counters: char.counters && typeof char.counters === 'object' ? char.counters : {},
    achClaimed: Array.isArray(char.achClaimed) ? char.achClaimed : [],
  };
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
  // GĐ32: học xong công pháp trong lúc offline → báo ngay khi vào game
  if (pendingLearnedName) {
    const skDone = (player.skills || []).map((id) => SKILL_BY_ID[id]).find((s) => s && s.name === pendingLearnedName);
    if (skDone) socket.emit('skill_learned', { skill: skDone });
    socket.emit('notice', { text: `📖 Trong lúc bạn vắng mặt, nhân vật đã ngồi học ở nơi an toàn và LĨNH NGỘ XONG ${pendingLearnedName}!` });
    player.learnedOfflineName = null;
    persistPlayer(player);
  }
  spawnCompanions(player); // GĐ22: đường tông môn → 2 đồng môn theo cùng
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
    maxHp: maxHpOf(p.stats),
    mp: Math.round(p.mp),
    maxMp: maxMpOf(p.stats),
    // GĐ7: tu luyện
    linhCan: p.linhCan ?? null,
    realm: p.realm ?? 'pham',
    tier: p.tier ?? 0,
    tuVi: p.tuVi ?? 0,
    tuViNeed: (() => {
      const bi = breakInfoFor(p.realm ?? 'pham', p.tier ?? 0);
      return bi && bi.type !== 'blocked_kimdan' ? tuViNeedStep(globalStep(p.realm, p.tier)) : null;
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
          const realmOk = sk.tier === 'coban' ? !!p.linhCan : sk.tier === 'luyenkhi' ? p.realm !== 'pham' : p.realm === 'tc';
          condMet = realmOk && condMetOf(p, sk);
          condText = sk.condText || condText;
        }
        out.push({
          id: sk.id, name: sk.name, tier: sk.tier, coef: sk.coef, cdMs: sk.cdMs, cost: sk.cost, range: sk.range,
          element: sk.element || CLASS_ELEMENT[p.classId] || '', condText, condMet,
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
    // GĐ26: nghề phụ (kèm cấp hiện tại đã tính trần theo cảnh giới)
    job: p.job && JOBS[p.job.jobId]
      ? { jobId: p.job.jobId, jobName: JOBS[p.job.jobId].name, crafts: p.job.crafts || 0, rank: jobRankOf(p), rankName: JOB_RANK_NAMES[jobRankOf(p)] }
      : null,
    // GĐ27: thành tựu (trạng thái tính sẵn)
    achievements: achievementState(p),
    // GĐ36+37: thanh chiêu = ô CHÍNH của bảng đang dùng (theo thứ tự ô)
    skills: equippedOf(p)
      .map((id) => skillById(p.classId, id))
      .filter(Boolean)
      .map((s) => ({ id: s.id, name: s.name, tier: s.tier, coef: s.coef, cdMs: Math.round(s.cdMs * (1 - cdrOf(p.stats))), cost: s.cost, range: s.range })),
    // GĐ37: ô ĐA DỤNG của bảng đang dùng
    utilSkills: activeBoardOf(p).util
      .map((id) => skillById(p.classId, id))
      .filter(Boolean)
      .map((s) => ({ id: s.id, name: s.name, tier: s.tier, coef: s.coef, cdMs: Math.round(s.cdMs * (1 - cdrOf(p.stats))), cost: s.cost, range: s.range })),
    // GĐ36+37: số ô đang dùng / tối đa + bảng đang chọn
    skillSlots: { used: equippedOf(p).length, max: slotCountFor(p), utilUsed: activeBoardOf(p).util.length, utilMax: UTIL_MAX },
    activeBoard: p.activeBoard || 0,
    // GĐ40+: vụ án nào đang mở hôm nay (để client hiện/ẩn nút Nhận ở bảng)
    caseActive: Object.fromEntries(Object.entries(QUESTS).filter(([, d]) => d.caseCycle).map(([qid, d]) => [qid, caseActiveToday(d)])),
    merchantOrder: p.merchantOrder || null, // GĐ40+
    boardsInfo: boardsOf(p).map((b) => ({ main: b.main.length, util: b.util.length })),
    // GĐ8: ví + túi + nhiệm vụ (tiến độ nhiệm vụ thu thập tính theo túi đồ)
    stones: p.stones ?? 0,
    inventory: p.inventory || {},
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
    x: typeof char.x === 'number' ? char.x : REST_SPOT.x,
    y: typeof char.y === 'number' ? char.y : REST_SPOT.y,
    vx: 0, vy: 0, input: { vx: 0, vy: 0 }, direction: 'down',
    isBot: false, isOffline: true,
    name: char.name, classId: char.classId, stats: char.stats,
    hp: maxHpOf(char.stats), mp: maxMpOf(char.stats),
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
    quests: char.quests && typeof char.quests === 'object' ? char.quests : {},
    affinity: char.affinity && typeof char.affinity === 'object' ? char.affinity : {}, // GĐ24
    affTalk: char.affTalk && typeof char.affTalk === 'object' ? char.affTalk : {},
    job: char.job && JOBS[char.job.jobId] ? { jobId: char.job.jobId, crafts: char.job.crafts || 0 } : null, // GĐ26
    merit: char.merit || 0, boardQuests: char.boardQuests || 0, letterGiven: !!char.letterGiven, sect: char.sect || null, sectTrialPassed: !!char.sectTrialPassed, learning: char.learning || null, // GĐ30+31
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
      isBot: false, isCompanion: true, ownerId: owner.id, ownerKey: owner.charKey,
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
    const d = Math.hypot(m.x - owner.x, m.y - owner.y);
    if (d < td) {
      td = d;
      target = m;
    }
  }
  const anchor = target && td <= 220 ? target : null;
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
  c.x = Math.max(MARGIN, Math.min(WORLD_W - MARGIN, c.x));
  c.y = Math.max(MARGIN, Math.min(WORLD_H - MARGIN, c.y));
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

// Người chơi mô phỏng cho bản demo Preview
for (let i = 1; i <= DEMO_BOTS; i++) {
  createPlayer('bot-' + i, true);
}
// GĐ21: dựng lại các nhân vật đang nghỉ offline từ lần chạy trước
for (const [key, c] of Object.entries(characters)) spawnOfflineActor(key, c);

// ------------------------- Quái vật (Giai đoạn 4) -------------------------
/** @type {Map<string, {id:string, kind:string, x:number, y:number, hp:number, maxHp:number, vx:number, vy:number, direction:string}>} */
const monsters = new Map();
let monsterSeq = 0;

function spawnMonster(kind = 'wolf') {
  const type = MONSTER_TYPES[kind] || MONSTER_TYPES.wolf;
  monsterSeq++;
  const v = makeVelocity();
  // Sinh quái NGOÀI làng (khu farm) — thử ngẫu nhiên tới khi ngoài hàng rào.
  // GĐ38: Thạch Quái ưu tiên góc ĐÔNG BẮC (vùng núi đá); Dơi/Sói khắp bãi.
  let x = 0;
  let y = 0;
  for (let tries = 0; tries < 30; tries++) {
    if (kind === 'golem') {
      x = Math.round(rand(1120, WORLD_W - 60));
      y = Math.round(rand(60, 320));
    } else {
      x = Math.round(rand(60, WORLD_W - 60));
      y = Math.round(rand(60, WORLD_H - 60));
    }
    if (!insideVillage(x, y, 50) && !insideSect(x, y, 50) && Math.hypot(x - 700, y - 196) > 110) break; // GĐ22/23: không sinh trong sân tông môn / gần Tụ Linh Trận
  }
  const m = {
    id: kind + '-' + monsterSeq,
    kind,
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

// ------------------------- Rơi đồ + hạ quái (GĐ8) -------------------------
const drops = new Map();
let dropSeq = 0;
function spawnDrop(kind, itemId, amount, x, y) {
  dropSeq++;
  const id = 'drop-' + dropSeq;
  drops.set(id, { id, kind, itemId, amount, x, y, bornAt: Date.now() });
}

// Xử lý tập trung khi một con quái bị hạ (đánh thường + tung chiêu dùng chung)
function onMonsterKilled(socket, player, target) {
  // GĐ19: trùm thử thách — không rơi đồ/Tu vi; thắng trùm chính → mở khóa đột phá tương ứng
  if (target.kind === 'trial') {
    monsters.delete(target.id);
    io.emit('monster_killed', { monsterId: target.id, kind: target.kind, by: player.id, byName: player.name });
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
          socket.emit('notice', { text: `✔ Đã đánh bại ${target.name}! Về Nhà Trưởng Làng trả nhiệm vụ “${QUESTS[qid]?.name || ''}”.` });
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
  io.emit('monster_killed', { monsterId: target.id, kind: target.kind, by: player.id, byName: player.name });
  // GĐ22: đường tông môn chia thưởng cho cả đội (hệ số 2/3 — bản chơi đơn đã chốt)
  const rf = rewardFactorOf(player);
  // GĐ38: rơi đồ theo LOÀI (nằm dưới đất, đi qua là nhặt). Linh thạch: sói
  // 3–8 (theo file), dơi 2–6, thạch quái 8–15 (số MMO). Tỉ lệ rơi vật phẩm
  // là số TẠM của bản MMO (file không ghi): nanh sói 30%, cánh dơi 35%,
  // đá quý 25%, sách tọa thiền 8% từ sói.
  const stoneRange = target.kind === 'golem' ? [8, 15] : target.kind === 'bat' ? [2, 6] : [3, 8];
  spawnDrop('stones', null, Math.max(1, Math.round((stoneRange[0] + Math.floor(Math.random() * (stoneRange[1] - stoneRange[0] + 1))) * rf)), Math.round(target.x), Math.round(target.y));
  const dropItem = (itemId, dx, dy) => spawnDrop('item', itemId, 1, Math.round(target.x + dx), Math.round(target.y + dy));
  if (target.kind === 'wolf') {
    if (Math.random() < 0.3) dropItem('nanh_soi', rand(-18, 18), rand(-14, 14));
    if (Math.random() < 0.08) dropItem('sach_toa_thien', rand(-18, 18), rand(-14, 14)); // GĐ22
  } else if (target.kind === 'bat') {
    if (Math.random() < 0.35) dropItem('canh_doi', rand(-18, 18), rand(-14, 14));
  } else if (target.kind === 'golem') {
    if (Math.random() < 0.25) dropItem('da_quy', rand(-18, 18), rand(-14, 14));
  }
  // GĐ39: tung RƯƠNG theo hạng quái (bảng B10) — rơi tại chỗ quái gục,
  // người chơi tới gần là mở; trùm thử thách không rơi rương (theo bản SP)
  {
    const tier = chestTierFor(target);
    if (tier) {
      const grade = rollChestGrade(tier, rf);
      if (grade && spawnChest(target.x + rand(-14, 14), target.y + rand(-10, 10), grade)) {
        console.log(`[rương] ${target.name} rơi rương cấp ${grade}`);
      }
    }
  }
  // Tu vi (GĐ7): chỉ khi đã có linh căn. GĐ38+39: theo hạng quái của file
  // (Yếu 3 / Trung 4 / Mạnh 8)
  if (player.realm === 'lk' || player.realm === 'tc') {
    const tv = Math.round((MONSTER_TYPES[target.kind]?.tuVi ?? TU_VI_PER_KILL) * rf);
    player.tuVi += tv;
    if (player.counters) player.counters.totalTuVi = (player.counters.totalTuVi || 0) + tv; // GĐ27
  } else if (socket) {
    socket.emit('no_linhcan_hint', {});
  }
  // GĐ27: đếm sói đã hạ cho thành tựu (chỉ quái sói thường, không tính trùm thử thách)
  if (target.kind === 'wolf' && player.counters) {
    player.counters.wolfKills = (player.counters.wolfKills || 0) + 1;
  }
  // Tiến độ nhiệm vụ diệt quái (GĐ8 + GĐ24: mọi nhiệm vụ kind 'kill' —
  // cả nhiệm vụ bảng lẫn nhiệm vụ riêng của NPC)
  for (const [qid, def] of Object.entries(QUESTS)) {
    if (def.kind !== 'kill') continue;
    if (def.monsterKind && def.monsterKind !== target.kind) continue; // GĐ38: nhiệm vụ tính đúng loài
    const q = player.quests?.[qid];
    if (q && q.state === 'active') {
      q.progress = Math.min(def.target, (q.progress || 0) + 1);
      if (q.progress >= def.target) {
        q.state = 'done';
        if (socket) {
          const where = def.npcId ? NPC_BY_ID[def.npcId]?.name : 'Nhà Trưởng Làng';
          socket.emit('notice', { text: `✔ Hoàn thành “${def.name}” — tới ${where} trả nhiệm vụ!` });
        }
      }
    }
  }
  persistPlayer(player);
  if (socket) syncChar(socket, player);
  console.log(`[combat] ${target.id} bị tiêu diệt bởi ${player.name} — hồi sinh sau ${MONSTER_RESPAWN_MS / 1000}s`);
  setTimeout(() => {
    const t = MONSTER_TYPES[target.kind]; // GĐ38: hồi sinh đúng loài vừa hạ
    if (t && countKind(target.kind) < t.count) spawnMonster(target.kind);
  }, MONSTER_RESPAWN_MS);
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
      moveWithCollision(
        m,
        m.x + (dx / len) * MONSTER_CHASE_SPEED * slowK * dt,
        m.y + (dy / len) * MONSTER_CHASE_SPEED * slowK * dt,
      );
      faceDirection(m, dx, dy);
    } else {
      faceDirection(m, owner.x - m.x, owner.y - m.y);
      const now = Date.now();
      if (now - (m.lastAttackAt || 0) >= 1000) {
        m.lastAttackAt = now;
        hitPlayer(owner, m.atk, 'physical', m);
      }
    }
    // Tâm Ma Ảnh: tung chiêu theo hệ số công pháp Luyện Khí (1.6) + phase 2 phân thân khi HP ≤ 50%
    if (m.trialKind === 'dai' && m.isTrialBoss) {
      const now = Date.now();
      if (d <= 190 && now - (m.lastSkillAt || 0) >= 4000) {
        m.lastSkillAt = now;
        hitPlayer(owner, m.atk * 1.6, 'magic', m);
        io.emit('skill_cast', { id: m.id, slot: 2, skillId: 'tam_ma', targetId: owner.id });
      }
      if (!m.phase2 && m.hp <= m.maxHp / 2) {
        m.phase2 = true;
        for (let i = 0; i < 2; i++) {
          const miniHp = Math.round(m.maxHp * 0.2);
          const miniId = 'trial-mini-' + ++monsterSeq;
          monsters.set(miniId, {
            id: miniId, kind: 'trial', trialKind: 'dai', isTrialBoss: false, ownerId: m.ownerId,
            name: 'Tâm Ma Phân Thân', x: m.x + (i === 0 ? -46 : 46), y: m.y + 24, hp: miniHp, maxHp: miniHp,
            atk: Math.round(m.atk * 0.5 * 10) / 10, vx: 0, vy: 0, direction: 'down', lastAttackAt: 0, bornAt: Date.now(),
          });
        }
        io.to(m.ownerId).emit('notice', { text: 'Tâm Ma Ảnh phân thân thành 2 bóng nhỏ!' });
      }
    }
    return;
  }
  // Tìm người chơi gần nhất đang ở ngoài vùng an toàn (làng + sân tông môn)
  let nearest = null;
  let nearestDist = Infinity;
  for (const p of players.values()) {
    if (p.isOffline) continue; // GĐ22: người nghỉ offline luôn ở vùng an toàn
    if (isSafeZone(p.x, p.y)) continue;
    const d = Math.hypot(p.x - m.x, p.y - m.y);
    if (d < nearestDist) {
      nearestDist = d;
      nearest = p;
    }
  }

  if (stunned) return; // GĐ34: sói bị choáng → đứng yên
  if (nearest && nearestDist <= MONSTER_AGGRO_RANGE && nearestDist > 26) {
    // Đuổi theo người chơi gần nhất (dừng cách ~26px, không đứng chồng lên người)
    if (rooted) return; // GĐ34: bị trói → không di chuyển (vẫn cắn được nếu đã áp sát)
    const dx = nearest.x - m.x;
    const dy = nearest.y - m.y;
    const len = Math.hypot(dx, dy) || 1;
    moveWithCollision(
      m,
      m.x + (dx / len) * (m.chaseSpeed || MONSTER_CHASE_SPEED) * slowK * dt,
      m.y + (dy / len) * (m.chaseSpeed || MONSTER_CHASE_SPEED) * slowK * dt,
    );
    faceDirection(m, dx, dy);
  } else if (nearest && nearestDist <= (m.atkRange || WOLF.atkRange)) {
    // Đã áp sát → CẮN (GĐ6): sát thương vật lý của sói trừ theo Vật phòng
    // của người chơi, đúng công thức file: × 100/(100 + Vật phòng), tối thiểu 1.
    faceDirection(m, nearest.x - m.x, nearest.y - m.y);
    const now = Date.now();
    if (now - (m.lastAttackAt || 0) >= (m.atkCdMs || WOLF.atkCooldownMs)) {
      m.lastAttackAt = now;
      hitPlayer(nearest, m.atk ?? WOLF.atk, 'physical', m);
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
    const wStuck = hitsObstacle(m.x, m.y);
    if (wStuck || !hitsObstacle(wx, m.y)) m.x = wx;
    else m.vx = -m.vx;
    if (wStuck || !hitsObstacle(m.x, wy)) m.y = wy;
    else m.vy = -m.vy;
    faceDirection(m, m.vx, m.vy);
    if (m.x < MARGIN) { m.x = MARGIN; m.vx = Math.abs(m.vx); }
    if (m.x > WORLD_W - MARGIN) { m.x = WORLD_W - MARGIN; m.vx = -Math.abs(m.vx); }
    if (m.y < MARGIN) { m.y = MARGIN; m.vy = Math.abs(m.vy); }
    if (m.y > WORLD_H - MARGIN) { m.y = WORLD_H - MARGIN; m.vy = -Math.abs(m.vy); }
  }
  // Kẹp trong sân + TUYỆT ĐỐI không vào làng: nếu lọt vào thì đẩy ra cạnh gần nhất
  m.x = Math.max(MARGIN, Math.min(WORLD_W - MARGIN, m.x));
  m.y = Math.max(MARGIN, Math.min(WORLD_H - MARGIN, m.y));
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
function hurtMonster(m, raw, def) {
  initMonsterFx(m);
  let dmg = damageThrough(raw, def);
  if (Date.now() < (m.vulnUntil || 0)) dmg = Math.max(1, Math.round(dmg * (1 + (m.vulnPct || 0) / 100)));
  m.hp -= dmg;
  return dmg;
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
  if (fx.healPct) heal += Math.round((maxHpOf(p.stats) * fx.healPct) / 100);
  if (fx.lifesteal && totalDealt > 0) heal += Math.round((totalDealt * fx.lifesteal) / 100);
  if (heal > 0) p.hp = Math.min(maxHpOf(p.stats), p.hp + heal);
}
// Hệ số công hiện hành của người chơi (buff tăng công + đòn kế tiếp)
function atkMulOf(p) {
  let mul = 1;
  if (Date.now() < (p.atkBuffUntil || 0)) mul *= 1 + (p.atkBuffPct || 0) / 100;
  if (p.nextAtkMul) mul *= p.nextAtkMul;
  return mul;
}

function hitPlayer(p, rawDamage, type, source) {
  if (p.isBot || p.hp <= 0) return;
  // GĐ31/GĐ32: đang ngồi lĩnh ngộ mà BỊ ĐÁNH TRÚNG → văng, tiến độ VỀ 0
  breakLearning(p, true);
  const def = type === 'magic' ? p.stats.phapPhong : p.stats.vatPhong;
  // GĐ34: buff giảm sát thương nhận đang hiệu lực
  let rawIn = rawDamage;
  if (Date.now() < (p.defBuffUntil || 0)) rawIn *= 1 - (p.defBuffPct || 0) / 100;
  const dmg = damageThrough(rawIn, def);
  p.hp -= dmg;
  // GĐ34: phản sát thương — quái đánh trúng người đang có buff phản thì ăn lại
  if (source && typeof source.hp === 'number' && Date.now() < (p.reflectUntil || 0) && p.reflectPct) {
    hurtMonster(source, (rawDamage * p.reflectPct) / 100, source.def ?? WOLF.def); // GĐ38
    if (source.hp <= 0) onMonsterKilled(null, p, source);
  }
  console.log(`[combat] ${source.id} cắn ${p.name}: -${dmg} HP (còn ${Math.max(0, Math.round(p.hp))}/${maxHpOf(p.stats)})`);
  if (p.hp <= 0) {
    const pos = plazaSpawn();
    p.x = pos.x;
    p.y = pos.y;
    p.hp = maxHpOf(p.stats);
    p.mp = maxMpOf(p.stats);
    p.input.vx = 0;
    p.input.vy = 0;
    // GĐ19: gục ngã giữa thử thách → trùm thử thách tan, phải gọi lại (đan chưa bị trừ)
    if (source && source.kind === 'trial') {
      for (const mm of [...monsters.values()]) {
        if (mm.kind === 'trial' && mm.ownerId === p.id) monsters.delete(mm.id);
      }
    }
    persistPlayer(p);
    io.emit('player_died', { id: p.id, name: p.name, by: (source && source.name) || WOLF.name });
    io.to(p.id).emit('you_died', { by: (source && source.name) || WOLF.name });
    console.log(`[combat] ${p.name} gục ngã — hồi sinh tại quảng trường làng`);
  } else {
    persistPlayer(p);
  }
}
// ------------------------- Kết nối người chơi -------------------------
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
      socket.emit('server_tick', fullSnapshot()); // bản FULL riêng cho client mới vào (delta A+B)
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
    char.hp = maxHpOf(char.stats);
    char.mp = maxMpOf(char.stats);
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
    socket.emit('server_tick', fullSnapshot()); // bản FULL riêng cho client mới vào (delta A+B)
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
    if (data && typeof data.session === 'string') sessions.delete(data.session);
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
    socket.emit('server_tick', fullSnapshot());
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
  });

  // GĐ46: NÉ — client gửi hướng muốn vọt (thường là hướng đang di
  // chuyển); đứng yên thì server dùng hướng nhân vật đang quay mặt.
  socket.on('dodge', (data) => {
    if (!player || player.isBot) return;
    const now = Date.now();
    if (now < (player.dodgeCdUntil || 0)) return;
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
    if (player.bequan) setBequan(player, false); // GĐ23: ra đòn là dứt bế quan
    if (player.learningActive) breakLearning(player, false); // GĐ32: ra đòn là phá lĩnh ngộ (về 0)
    // GĐ11: nhịp đánh thường theo TỐC ĐỘ VŨ KHÍ (file thiết kế: Nhanh 0,5s /
    // Trung bình 0,8s / Chậm 1,4s). Hệ số mỗi đòn tỉ lệ với hồi chiêu theo
    // đúng nguyên tắc của file — vũ khí nhanh yếu, chậm mạnh, sát thương mỗi
    // giây gần bằng nhau (chuẩn hoá quanh mức Trung bình đang dùng).
    const weapon = weaponOf(player.classId, player.weaponId);
    const speedK = weapon ? WEAPON_SPEED_SEC[weapon.speed] / WEAPON_SPEED_SEC.trung : 1;
    const now = Date.now();
    const cd = ATTACK_COOLDOWN_MS * speedK * (1 - cdrOf(player.stats));
    if (now - (player.lastAttackAt || 0) < cd) return;
    player.lastAttackAt = now;

    let target = null;
    let targetDist = Infinity;
    for (const m of monsters.values()) {
      if (m.kind === 'trial' && m.ownerId !== player.id) continue; // GĐ19: trùm thử thách của người khác — không đánh được
      const d = Math.hypot(m.x - player.x, m.y - player.y);
      if (d < targetDist) {
        targetDist = d;
        target = m;
      }
    }
    const range = weapon && weapon.ranged ? ATTACK_RANGE_RANGED : ATTACK_RANGE;
    if (!target || targetDist > range) return; // đánh hụt — không có quái trong tầm

    const atk = attackStatOf(player);
    const dmg = hurtMonster(target, BASIC_COEF * speedK * atkMulOf(player) * (atk.value + 10), target.def ?? WOLF.def); // GĐ38: def theo loài
    if (player.nextAtkMul) player.nextAtkMul = 0; // GĐ34: đòn kế tiếp đã dùng
    io.emit('player_attacked', { id: player.id, targetId: target.id }); // GĐ9: cho client khác phát tư thế ra đòn
    console.log(`[combat] ${player.name} đánh ${target.id}: -${dmg} (${atk.type}) — HP quái còn ${Math.max(0, target.hp)}/${target.maxHp}`);
    if (target.hp <= 0) onMonsterKilled(socket, player, target);
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
    // Kiểm tra thuộc về: chiêu theo vũ khí phải đúng vũ khí đang cầm; chiêu lớp thì đúng lớp
    if (target.weaponId) {
      const w = weaponOf(player.classId, player.weaponId);
      if (!w || w.id !== target.weaponId || !SKILL_CATALOG[player.classId]?.[target.weaponId]?.some((s) => s.id === target.id)) {
        socket.emit('interact_error', { message: `${target.name} là công pháp của vũ khí khác — bạn đang cầm ${w ? w.name : 'tay không'}.` });
        return;
      }
    } else if (!(SKILLS[player.classId] || []).some((s) => s.id === target.id)) {
      return; // chiêu không thuộc lớp của mình (bản cũ) — bỏ qua
    }
    // Điều kiện học
    if (target.cond) {
      const realmOk = target.tier === 'coban' ? !!player.linhCan : target.tier === 'luyenkhi' ? player.realm !== 'pham' : target.tier === 'trucco' ? player.realm === 'tc' : false;
      if (!realmOk) {
        socket.emit('interact_error', { message: target.tier === 'trucco' ? `Cần cảnh giới Trúc Cơ để học ${target.name}.` : `Cần vào Luyện Khí để học ${target.name}.` });
        return;
      }
      if (!condMetOf(player, target)) {
        socket.emit('interact_error', { message: `Chưa đủ điều kiện học ${target.name} — cần: ${condTextOf(target)}.` });
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
    if (target.tier === 'luyenkhi' && !nearDaoQuan()) {
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
    if (player.bequan) setBequan(player, false); // GĐ23: tung chiêu là dứt bế quan
    if (player.learningActive) breakLearning(player, false); // GĐ32: tung chiêu là phá lĩnh ngộ (về 0)
    const slot = Number(data.slot);
    const area = data.area === 'util' ? 'util' : 'main'; // GĐ37: ô đa dụng
    const skillId = (area === 'util' ? activeBoardOf(player).util : equippedOf(player))[slot]; // GĐ36+37: chỉ chiêu đang lắp mới tung được
    const skill = skillId ? skillById(player.classId, skillId) : null;
    if (!skill) return;
    const now = Date.now();
    const cdMs = Math.round(skill.cdMs * (1 - cdrOf(player.stats)));
    if (now < (player.skillReadyAt[skill.id] || 0)) {
      socket.emit('cast_result', { ok: false, slot, area, reason: 'cooldown' });
      return;
    }
    // Quái gần nhất trong tầm chiêu
    let target = null;
    let targetDist = Infinity;
    for (const m of monsters.values()) {
      if (m.kind === 'trial' && m.ownerId !== player.id) continue; // GĐ19: trùm thử thách của người khác
      const d = Math.hypot(m.x - player.x, m.y - player.y);
      if (d < targetDist) {
        targetDist = d;
        target = m;
      }
    }
    if (!target || targetDist > skill.range) {
      socket.emit('cast_result', { ok: false, slot, area, reason: 'range' }); // không tốn Chân nguyên
      return;
    }
    if (player.mp < skill.cost) {
      socket.emit('cast_result', { ok: false, slot, area, reason: 'mana' });
      return;
    }
    player.mp -= skill.cost;
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
      targets = [...monsters.values()].filter((m) => !(m.kind === 'trial' && m.ownerId !== player.id) && Math.hypot(m.x - player.x, m.y - player.y) <= skill.range);
      if (!targets.length) targets = [target];
    }
    const pierce = fx?.pierce ? fx.pierce / 100 : 0;
    let totalDealt = 0;
    let firstDmg = 0;
    for (const t of targets) {
      const effDef = Math.max(0, Math.round((t.def ?? WOLF.def) * (1 - pierce))); // GĐ38: def theo loài
      const hits = fx?.hits || 1;
      for (let h = 0; h < hits; h++) {
        const g = 1 + (fx?.hitGrowth || 0) * h;
        const d = hurtMonster(t, skill.coef * g * mul * (atk.value + 10), effDef);
        totalDealt += d;
        if (t === target && h === 0) firstDmg = d;
        if (t.hp <= 0) break;
      }
      applyFxToMonster(player, t, fx);
      if (t.hp <= 0) onMonsterKilled(socket, player, t);
    }
    applySelfFx(player, fx, totalDealt);
    const dmg = firstDmg;
    socket.emit('cast_result', { ok: true, slot, area, skillId: skill.id, cdMs, targetId: target.id, dmg });
    io.emit('skill_cast', { id: player.id, slot, skillId: skill.id, targetId: target.id }); // GĐ9: tư thế + đạn bay phía client
    console.log(`[combat] ${player.name} tung ${skill.name}: -${dmg} lên ${target.id} (còn ${Math.max(0, target.hp)})${fx ? ' [fx]' : ''}`);
    syncChar(socket, player);
  });

  // GĐ19 — Triệu hồi trùm thử thách (Trung cảnh: Thử Luyện Thú; Đại cảnh: Tâm Ma Ảnh)
  // tại sân Đạo Quán. Điều kiện: đủ Tu vi + có đan tương ứng. Đan chỉ bị trừ khi bấm Đột phá.
  socket.on('start_trial', () => {
    if (!player) return;
    const info = breakInfoFor(player.realm, player.tier);
    if (!info || (info.type !== 'trung' && info.type !== 'dai')) {
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
    const eHp = eliteHpAt(step);
    const eAtk = eliteAtkAt(step);
    const boss = {
      id: 'trial-' + ++monsterSeq, kind: 'trial', trialKind: info.trial, isTrialBoss: true, ownerId: player.id,
      name: isDai ? 'Tâm Ma Ảnh' : 'Thử Luyện Thú',
      x: 700, y: 452, hp: isDai ? eHp * 6 : eHp * 4, maxHp: isDai ? eHp * 6 : eHp * 4,
      atk: isDai ? Math.round(eAtk * 1.3 * 10) / 10 : eAtk,
      vx: 0, vy: 0, direction: 'down', lastAttackAt: 0, lastSkillAt: 0, bornAt: Date.now(), phase2: false,
    };
    monsters.set(boss.id, boss);
    io.emit('trial_started', { ownerId: player.id, ownerName: player.name, name: boss.name, monsterId: boss.id });
    socket.emit('notice', { text: `${boss.name} xuất hiện tại sân Đạo Quán! Đánh bại nó để mở khóa đột phá.` });
    console.log(`[thử thách] ${player.name} triệu hồi ${boss.name} (HP ${boss.hp}, công ${boss.atk})`);
  });

  // GĐ19 — Đột phá theo thang B6: Tiểu (chắc chắn) / Trung (đan + thắng Thử Luyện Thú, chắc chắn)
  // / Đại (đan + thắng Tâm Ma Ảnh + tỉ lệ theo công thức file; thất bại có hậu quả).
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
    const foe = {
      id: 'trial-' + ++monsterSeq, kind: 'trial', trialKind: 'duel', questId, isTrialBoss: true, ownerId: player.id,
      name: def.duel.spawnName,
      x: Math.round(player.x + 130), y: Math.round(player.y),
      hp: Math.round(eHp * def.duel.hpMul), maxHp: Math.round(eHp * def.duel.hpMul), atk: Math.round(eAtk * 10) / 10,
      vx: 0, vy: 0, direction: 'left', lastAttackAt: 0, lastSkillAt: 0, bornAt: Date.now(), phase2: false,
    };
    initMonsterFx(foe);
    monsters.set(foe.id, foe);
    io.emit('trial_started', { ownerId: player.id, ownerName: player.name, name: foe.name, monsterId: foe.id });
    socket.emit('notice', { text: `⚔️ ${foe.name} xuất hiện! Hắn chỉ nhắm vào bạn — hãy đánh bại hắn!` });
    console.log(`[đối đầu] ${player.name} đối đầu ${foe.name} (HP ${foe.hp}, công ${foe.atk})`);
  }
  socket.on('start_duel', (data) => { if (player && data?.questId) spawnDuel(data.questId); });
  socket.on('start_rival', () => { if (player) spawnDuel('q_tusi'); });

  socket.on('breakthrough', () => {
    if (!player) return;
    const info = breakInfoFor(player.realm, player.tier);
    if (!info) return;
    if (info.type === 'blocked_kimdan') {
      socket.emit('interact_error', { message: 'Đột phá Kim Đan chưa mở trong phiên bản này.' });
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
      player.statPoints = (player.statPoints || 0) + info.points;
      if (player.counters) player.counters.breakthroughs = (player.counters.breakthroughs || 0) + 1; // GĐ27
      // GĐ20: cộng tuổi thọ đúng thang B6 (Trung LK +5 / Trung TC +10 / Đại +50 năm)
      if (info.lifespan) player.lifespan = (player.lifespan ?? 80) + info.lifespan;
      // GĐ25: thọ dương trở lại sau khi đã vào ân hạn → ĐƯỢC CỨU, hủy ân hạn
      if (player.graceStartDay != null && checkLifespan(player) === 'rescued') {
        socket.emit('notice', { text: `✦ Đột phá cộng thêm ${info.lifespan} năm thọ — thọ nguyên dương trở lại, THOÁT ân hạn tọa hóa!` });
        socket.emit('lifespan_grace', { graceDaysLeft: null, lifespanLeft: lifespanLeftOf(player) });
      }
      player.hp = Math.min(player.hp, maxHpOf(player.stats));
      player.mp = Math.min(player.mp, maxMpOf(player.stats));
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
    // Trung / Đại: cần đan + đã thắng thử thách
    if ((player.inventory[info.pill] || 0) < 1) {
      socket.emit('interact_error', { message: `Đột phá ${info.type === 'dai' ? 'Đại' : 'Trung'} cảnh cần ${ITEMS[info.pill].name} — mua ở Tiệm Đan Dược.` });
      return;
    }
    if (player.trialReady !== info.trial) {
      socket.emit('interact_error', { message: `Cần đánh bại ${info.type === 'dai' ? 'Tâm Ma Ảnh' : 'Thử Luyện Thú'} tại Đạo Quán trước (bấm nút Thử thách khi ở sân Đạo Quán).` });
      return;
    }
    player.inventory[info.pill] -= 1;
    if (player.inventory[info.pill] <= 0) delete player.inventory[info.pill];
    player.trialReady = null;
    if (info.type === 'trung') {
      applyBreak();
      return;
    }
    // Đại cảnh — tỉ lệ thành công theo file: 0.60 (đã gồm đan bắt buộc) + 0.10 Đan Hộ Mạch
    // + 0.10 chỉ số chính của lớp ≥ 40 − 0.05 × (số linh căn − 1) + 0.10 × số lần thất bại liên tiếp;
    // kẹp [0.10, 0.95]; 3 lần thua liên tiếp → lần kế chắc chắn. (Cộng tài năng + năm tháng ở tầng 9:
    // bản online chưa có 2 hệ đó nên bỏ qua — đã báo người chơi.)
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
      socket.emit('notice', { text: `✦ Đột phá Đại cảnh THÀNH CÔNG (tỉ lệ ${Math.round(chance * 100)}%) — chúc mừng Trúc Cơ!` });
      return;
    }
    player.failStreak = (player.failStreak || 0) + 1;
    const roll = Math.random();
    let msg;
    if (roll < 0.5) {
      const lose = Math.floor(player.tuVi * 0.3);
      player.tuVi -= lose;
      msg = `Đột phá Đại cảnh THẤT BẠI (nhẹ, tỉ lệ ${Math.round(chance * 100)}%): mất ${lose} Tu vi. Thua ${player.failStreak} lần liên tiếp — lần sau +10% tỉ lệ.`;
    } else if (roll < 0.85) {
      // GĐ20: về đúng thiết kế gốc — trừ 10 năm TUỔI THỌ (GĐ19 từng tạm quy đổi sang Tu vi)
      player.lifespan = (player.lifespan ?? 80) - 10;
      const left = player.lifespan - ageOf(player);
      msg = `Đột phá Đại cảnh THẤT BẠI (trung bình): mất 10 năm tuổi thọ — thọ nguyên còn ${left} năm.`;
      if (left <= 5) msg += ' ⚠ Thọ nguyên sắp cạn, hãy đột phá để kéo dài tuổi thọ!';
    } else if ((player.statPenaltyStacks || 0) < 3) {
      player.statPenaltyStacks += 1;
      for (const k of STAT_KEYS) player.stats[k] = Math.max(1, Math.floor(player.stats[k] * 0.9));
      player.hp = Math.min(player.hp, maxHpOf(player.stats));
      player.mp = Math.min(player.mp, maxMpOf(player.stats));
      msg = 'Đột phá Đại cảnh THẤT BẠI (nặng): toàn bộ chỉ số gốc −10% VĨNH VIỄN (cộng dồn tối đa 3 lần)!';
    } else {
      const lose = Math.floor(player.tuVi * 0.3);
      player.tuVi -= lose;
      msg = `Đột phá Đại cảnh THẤT BẠI: mất ${lose} Tu vi (đã chạm trần −chỉ số nên không trừ thêm).`;
    }
    persistPlayer(player);
    syncChar(socket, player);
    socket.emit('breakthrough_fail', { message: msg, chance: Math.round(chance * 100), failStreak: player.failStreak });
    console.log(`[tu luyện] ${player.name} đột phá Đại cảnh THẤT BẠI (tỉ lệ ${Math.round(chance * 100)}%, thua liên tiếp ${player.failStreak})`);
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
    } else {
      if ((player.freePoints || 0) <= 0) return;
      player.freePoints -= 1;
      player.stats[stat] += 1;
    }
    // Chỉ số tăng có thể nâng trần HP/Chân nguyên — kẹp lại giá trị hiện tại
    player.hp = Math.min(player.hp, maxHpOf(player.stats));
    player.mp = Math.min(player.mp, maxMpOf(player.stats));
    persistPlayer(player);
    syncChar(socket, player);
    console.log(`[tu luyện] ${player.name} cộng điểm vào ${stat} → ${player.stats[stat]}`);
  });

  // ---- Kinh tế + Nhiệm vụ (GĐ8) ----
  const nearPoint = (pt) => !!player && Math.hypot(player.x - pt.x, player.y - pt.y) <= INTERACT_RANGE;
  const notice = (text) => socket.emit('notice', { text });

  socket.on('shop_buy', (data) => {
    if (!player || !data) return;
    const shop = SHOPS[data.shopId];
    let price = shop?.sell?.[data.itemId];
    if (!shop || !price || !ITEMS[data.itemId]) return;
    if (!nearPoint(shop.point)) {
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
      if (merchantEntry.qty <= 0) {
        socket.emit('interact_error', { message: `${ITEMS[data.itemId].name} đã HẾT hàng hôm nay!` });
        return;
      }
      price = merchantEntry.price;
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
    const discounted = npcId && aff >= 50;
    if (discounted) price = Math.ceil(price * 0.9);
    if ((player.stones || 0) < price) {
      socket.emit('interact_error', { message: `Không đủ Linh thạch (cần ${price}, đang có ${player.stones || 0}).` });
      return;
    }
    player.stones -= price;
    if (merchantEntry) merchantEntry.qty -= 1; // GĐ40+: trừ kho ngày của thương nhân
    player.inventory[data.itemId] = (player.inventory[data.itemId] || 0) + 1;
    persistPlayer(player);
    syncChar(socket, player);
    notice(`Đã mua ${ITEMS[data.itemId].name} (−${price} Linh thạch${discounted ? ', đã giảm 10% nhờ thiện cảm' : ''})`);
    if (npcId) addAffinity(socket, player, npcId, 1); // GĐ24: giao dịch quen mặt +1
    console.log(`[kinh tế] ${player.name} mua ${data.itemId} tại ${data.shopId}: −${price} LT (còn ${player.stones})`);
  });

  socket.on('shop_sell', (data) => {
    if (!player || !data) return;
    if (data.shopId === 'luu_dong' && !merchantPresent()) { // GĐ40+
      socket.emit('interact_error', { message: 'Thương Nhân Lưu Động hiện không có ở làng.' });
      return;
    }
    const shop = SHOPS[data.shopId];
    const price = shop?.buy?.[data.itemId];
    if (!shop || !price || !ITEMS[data.itemId]) return;
    if (!nearPoint(shop.point)) {
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
    if (npcId) addAffinity(socket, player, npcId, 1);
    console.log(`[kinh tế] ${player.name} bán ${data.itemId} tại ${data.shopId}: +${price} LT (có ${player.stones})`);
  });

  socket.on('quest_accept', (data) => {
    if (!player || !data) return;
    const def = QUESTS[data.questId];
    if (!def) return;
    // GĐ24: nhiệm vụ RIÊNG nhận ngay tại NPC khi thiện cảm đủ cao
    if (def.npcId) {
      const npc = NPC_BY_ID[def.npcId];
      if (Math.hypot(player.x - npc.x, player.y - npc.y) > 95) {
        socket.emit('interact_error', { message: `Tới gặp ${npc.name} để nhận nhiệm vụ riêng.` });
        return;
      }
      if (affinityOf(player, def.npcId) < (def.minAffinity ?? 50)) {
        socket.emit('interact_error', { message: `Nhiệm vụ riêng chỉ mở khi thiện cảm với ${npc.name} ≥ ${def.minAffinity ?? 50} (hiện ${affinityOf(player, def.npcId)}).` });
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
  });

  socket.on('quest_claim', (data) => {
    if (!player || !data) return;
    const def = QUESTS[data.questId];
    const q = player.quests?.[data.questId];
    if (!def || !q) return;
    // GĐ24: nhiệm vụ riêng trả tại NPC của nó; nhiệm vụ bảng trả Trưởng Làng
    if (def.npcId) {
      const npc = NPC_BY_ID[def.npcId];
      if (Math.hypot(player.x - npc.x, player.y - npc.y) > 95) {
        socket.emit('interact_error', { message: `Tới gặp ${npc.name} để trả nhiệm vụ.` });
        return;
      }
    } else if (!nearPoint(ELDER_POINT)) {
      socket.emit('interact_error', { message: 'Tới Nhà Trưởng Làng để trả nhiệm vụ.' });
      return;
    }
    if ((def.kind === 'kill' || def.kind === 'clues') && q.state !== 'done') {
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
    player.stones = (player.stones || 0) + def.rewardStones;
    if (def.tuViReward) { // GĐ38: nhiệm vụ B11 thưởng cả Tu vi
      player.tuVi = (player.tuVi || 0) + def.tuViReward;
      if (player.counters) player.counters.totalTuVi = (player.counters.totalTuVi || 0) + def.tuViReward;
    }
    let extra = '';
    if (def.rewardItem && ITEMS[def.rewardItem]) {
      player.inventory[def.rewardItem] = (player.inventory[def.rewardItem] || 0) + 1;
      extra = ` + 1 ${ITEMS[def.rewardItem].name}`;
    }
    persistPlayer(player);
    syncChar(socket, player);
    notice(`Trả nhiệm vụ “${def.name}” — nhận ${def.rewardStones} Linh thạch${extra}!`);
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
  socket.on('talk_npc', (data) => {
    if (!player || !data) return;
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
      persistPlayer(player);
      socket.emit('notice', { text: `📦 Thương nhân mang tới món bạn đặt: ${ITEMS[oid]?.name || oid} ×1 — đã giao tận tay!` });
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
    // Nhiệm vụ riêng của NPC này: trạng thái cho client dựng nút (GĐ40:
    // trả cả DANH SÁCH — NPC có thể có nhiều nhiệm vụ/chuỗi nhiều phần;
    // phần chuỗi chưa mở khóa thì ẩn hẳn)
    const personalQuests = [];
    for (const [qid, def] of Object.entries(QUESTS)) {
      if (def.npcId !== npc.id) continue;
      if (def.requiresFlag && !player.flags?.[def.requiresFlag] && !player.quests?.[qid]) continue;
      const q = player.quests?.[qid];
      personalQuests.push({
        questId: qid, name: def.name, desc: def.desc, target: def.target, rewardStones: def.rewardStones,
        state: q ? q.state : aff >= (def.minAffinity ?? 50) ? 'available' : 'locked',
        progress: q?.progress || 0,
        ready: q ? (def.kind === 'kill' ? q.state === 'done' : (player.inventory[def.itemId] || 0) >= def.target) : false,
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
      const ready = def.kind === 'kill' ? q.state === 'done' : (player.inventory[def.itemId] || 0) >= def.target;
      if (ready) claimable.push({ questId: qid, name: def.name, rewardStones: def.rewardStones });
    }
    socket.emit('npc_dialog', {
      npcId: npc.id, name: npc.name, personality: npc.personality, shopId: npc.shopId || null,
      affinity: aff, gained,
      // GĐ40: thương nhân lưu động chào hàng theo kho luân phiên của ngày
      text: clueText || (npc.id === 'npc_thuongnhan'
        ? `Ta buôn bán khắp nơi, nay ghé làng này ít hôm. Hôm nay ta mang: ${Object.entries(merchantToday().stock).map(([id, e]) => `${ITEMS[id].name} (${e.price} LT, còn ${e.qty})`).join(' · ') || '— hết sạch hàng rồi!'}. Đặt hàng trước thì lần sau ta đem tới tận nơi. À, nghe đồn: ${WORLD_HINTS[worldClock().dayIndex % WORLD_HINTS.length]}`
        : dialogLine(npc, aff)),
      // GĐ40+: đủ manh mối → Trưởng Làng cho chỉ đích danh 1 trong 3 nghi phạm
      accuse: npc.id === 'npc_truonglang' && player.quests?.case_trom?.state === 'active' && (player.quests.case_trom.progress || 0) >= 3 ? CASE_SUSPECTS : null,
      personalQuest, personalQuests, claimable,
      // GĐ40+: kho + giá hôm nay + danh mục đặt hàng + hint thế giới của thương nhân
      merchantInfo: npc.id === 'npc_thuongnhan' ? {
        stock: Object.entries(merchantToday().stock).map(([itemId, e]) => ({ itemId, price: e.price, qty: e.qty })),
        catalog: MERCHANT_POOL.map((itemId) => ({ itemId, orderPrice: Math.ceil((SHOPS.luu_dong.sell[itemId] || 50) * 1.1) })),
        hint: WORLD_HINTS[worldClock().dayIndex % WORLD_HINTS.length],
        order: player.merchantOrder ? { itemId: player.merchantOrder.itemId } : null,
      } : null,
      sectInfo: npc.id === 'npc_sugia' ? sectInfoFor(player) : null, // GĐ30
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
    if (Math.hypot(player.x - npc.x, player.y - npc.y) > 95) {
      socket.emit('interact_error', { message: 'Tới gặp Sứ Giả Tông Môn ở quảng trường để gia nhập.' });
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

  // GĐ26: CHẾ TẠO — trừ nguyên liệu trước, tung tỉ lệ; thành công +1 lượt chế
  socket.on('craft_item', (data) => {
    if (!player || !data) return;
    const rc = RECIPES[data.recipeId];
    if (!rc) return;
    if (!player.job || player.job.jobId !== rc.jobId) {
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
    const okCraft = Math.random() < rc.rate;
    if (okCraft) {
      player.inventory[rc.output] = (player.inventory[rc.output] || 0) + 1;
      player.job.crafts = (player.job.crafts || 0) + 1;
      if (player.counters) player.counters.crafts = (player.counters.crafts || 0) + 1; // GĐ27: đếm cho thành tựu
      const newRank = jobRankOf(player);
      socket.emit('craft_result', { ok: true, recipeId: data.recipeId, output: rc.output, crafts: player.job.crafts, rank: newRank });
      notice(`⚗️ Chế tạo THÀNH CÔNG: +1 ${ITEMS[rc.output].name} (lượt chế ${player.job.crafts}${newRank > rank ? ` — LÊN CẤP NGHỀ: ${JOB_RANK_NAMES[newRank]}!` : ''})`);
    } else {
      socket.emit('craft_result', { ok: false, recipeId: data.recipeId });
      notice(`💥 Chế tạo THẤT BẠI — “${rc.name}” hỏng, mất nguyên liệu.`);
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

  socket.on('use_item', (data) => {
    if (!player || !data) return;
    const id = data.itemId;
    if ((player.inventory[id] || 0) <= 0) return;
    if (id === 'dan_tu_khi') {
      if (!player.linhCan) {
        socket.emit('interact_error', { message: 'Cần có linh căn mới dùng được Đan Tụ Khí.' });
        return;
      }
      player.tuVi += 50;
      if (player.counters) player.counters.totalTuVi = (player.counters.totalTuVi || 0) + 50; // GĐ27
      notice('Dùng Đan Tụ Khí: +50 Tu vi');
    } else if (id === 'dan_hoi_xuan') {
      const max = maxHpOf(player.stats);
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
      const max = maxHpOf(player.stats);
      if (player.hp >= max) {
        socket.emit('interact_error', { message: 'Máu đã đầy.' });
        return;
      }
      player.hp = Math.min(max, player.hp + Math.round(max * 0.4));
      notice('Dùng Phù Hộ Thân: hồi 40% HP');
    } else if (id === 'banh_thit') {
      // GĐ26: Bánh Thịt Thú (Thú Sư chế) — hồi 25% HP
      const max = maxHpOf(player.stats);
      if (player.hp >= max) {
        socket.emit('interact_error', { message: 'Máu đã đầy.' });
        return;
      }
      player.hp = Math.min(max, player.hp + Math.round(max * 0.25));
      notice('Ăn Bánh Thịt Thú: hồi 25% HP');
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
    } else {
      return;
    }
    player.inventory[id] -= 1;
    persistPlayer(player);
    syncChar(socket, player);
  });

  socket.on('disconnect', () => {
    if (player) {
      // GĐ21: nhân vật không biến mất — tự về điểm an toàn ngồi thiền / ngủ
      goOffline(player);
      console.log(`[-] ${player.name} rời game (nhân vật ở lại nghỉ offline) — ${players.size} thực thể`);
    } else {
      console.log(`[-] Socket ${socket.id} ngắt (chưa vào game)`);
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
const sentPlayers = new Map(); // id -> object trạng thái đã phát ở tick trước
const sentMonsters = new Map();
const sentDrops = new Map();
const sentChests = new Map(); // GĐ39
let lastNpcKey = ''; // GĐ40+: khóa danh sách NPC đã phát (theo lịch thương nhân)
let lastSentWorldKey = -1; // GĐ20: khóa ngày×24+giờ của đồng hồ đã phát gần nhất

function playerSyncState(p) {
  return {
    id: p.id, x: Math.round(p.x), y: Math.round(p.y), direction: p.direction,
    name: p.name, classId: p.classId, realm: p.realm || 'pham', tier: p.tier || 0,
    robe: p.robe ?? null, gender: p.gender || 'nam', weaponId: p.weaponId || null,
    hp: Math.round(p.hp), maxHp: maxHpOf(p.stats),
    mp: Math.round(p.mp), maxMp: maxMpOf(p.stats),
    rest: p.isOffline ? (p.restState || null) : null, // GĐ21: 'meditate' | 'sleep' | null (đang online)
    companion: p.isCompanion ? 1 : 0, // GĐ22: đồng môn AI đi theo người chơi khác
    bequan: p.bequan ? 1 : 0, // GĐ23: đang bế quan tại Tụ Linh Trận
    learning: p.learningActive ? 1 : 0, // GĐ31-sửa: đang ngồi lĩnh ngộ công pháp
  };
}
function monsterSyncState(m) {
  return {
    id: m.id, x: Math.round(m.x), y: Math.round(m.y), hp: m.hp, maxHp: m.maxHp, direction: m.direction,
    kind: m.kind, name: m.name || null, trial: m.kind === 'trial' ? m.trialKind : null, ownerId: m.ownerId || null,
    st: Date.now() < (m.stunUntil || 0) ? 'stun' : Date.now() < (m.rootUntil || 0) ? 'root' : Date.now() < (m.slowUntil || 0) ? 'slow' : m.dots && m.dots.length ? 'dot' : null, // GĐ34
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
function fullSnapshot() {
  return {
    v: 2, full: true,
    players: Array.from(players.values()).map(playerSyncState),
    monsters: Array.from(monsters.values()).map(monsterSyncState),
    npcs: npcsForWorld(), // GĐ40+
    drops: Array.from(drops.values()).map(dropSyncState),
    chests: Array.from(chests.values()).map(chestSyncState), // GĐ39
    world: worldClock(), // GĐ20
  };
}

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
    if (p.isCompanion) { updateCompanion(p, dt); continue; } // GĐ22: đồng môn AI
    if (p.isOffline) continue; // GĐ21: nhân vật nghỉ offline đứng yên tại điểm an toàn
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
      const mvx = dodging ? p.dodgeVx : p.input.vx;
      const mvy = dodging ? p.dodgeVy : p.input.vy;
      const spd = dodging ? DODGE_SPEED : speedOf(p.stats);
      const stepX = mvx * spd * dt;
      const stepY = mvy * spd * dt;
      const pStuck = hitsObstacle(p.x, p.y); // GĐ53: đang trong vùng cấm thì cho đi ra
      if (stepX !== 0) {
        if (pStuck || !hitsObstacle(p.x + stepX, p.y)) p.x += stepX;
        else if (!hitsObstacle(p.x + stepX / 2, p.y)) p.x += stepX / 2; // bước nửa cho áp sát khít
      }
      if (stepY !== 0) {
        if (pStuck || !hitsObstacle(p.x, p.y + stepY)) p.y += stepY;
        else if (!hitsObstacle(p.x, p.y + stepY / 2)) p.y += stepY / 2;
      }
      faceDirection(p, mvx, mvy);
      // Hồi Chân nguyên: 2 + Thần thức × 0.2 mỗi giây
      p.mp = Math.min(maxMpOf(p.stats), p.mp + mpRegenOf(p.stats) * dt);
      // Không cho ra khỏi sân 1600×1200
      p.x = Math.max(MARGIN, Math.min(WORLD_W - MARGIN, p.x));
      p.y = Math.max(MARGIN, Math.min(WORLD_H - MARGIN, p.y));
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
  for (const m of monsters.values()) updateMonster(m, dt);

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
        if (Math.hypot(p.x - c.x, p.y - c.y) <= CHEST_OPEN_RANGE) {
          chests.delete(c.id);
          const loot = rollChestLoot(c.grade);
          const lines = [];
          for (const l of loot) {
            if (l.kind === 'stones') {
              const amt = Math.max(1, Math.round(l.amount * rewardFactorOf(p)));
              p.stones = (p.stones || 0) + amt;
              lines.push(`${amt} Linh thạch`);
            } else {
              p.inventory[l.itemId] = (p.inventory[l.itemId] || 0) + l.qty;
              lines.push(`${ITEMS[l.itemId]?.name || l.itemId} ×${l.qty}`);
            }
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

  // BROADCAST delta: chỉ entity/trường thay đổi so với tick trước (A+B)
  const curP = new Map(); for (const p of players.values()) curP.set(p.id, playerSyncState(p));
  const curM = new Map(); for (const m of monsters.values()) curM.set(m.id, monsterSyncState(m));
  const curD = new Map(); for (const d of drops.values()) curD.set(d.id, dropSyncState(d));
  const curC = new Map(); for (const c of chests.values()) curC.set(c.id, chestSyncState(c));
  const delta = { v: 2, full: false, players: [], playersGone: [], monsters: [], monstersGone: [], drops: [], dropsGone: [], chests: [], chestsGone: [] };
  diffInto(sentPlayers, curP, delta.players, delta.playersGone);
  diffInto(sentMonsters, curM, delta.monsters, delta.monstersGone);
  diffInto(sentDrops, curD, delta.drops, delta.dropsGone);
  diffInto(sentChests, curC, delta.chests, delta.chestsGone);
  // GĐ40+: danh sách NPC đổi (thương nhân tới/rời) → gửi lại nguyên danh sách
  const npcListNow = npcsForWorld();
  const npcKey = npcListNow.map((n) => n.id).join(',');
  if (npcKey !== lastNpcKey) {
    lastNpcKey = npcKey;
    delta.npcs = npcListNow;
  }
  // GĐ20: đồng hồ chỉ phát kèm tick khi GIỜ đổi (nhẹ băng thông)
  const wKey = wcNow.dayIndex * 24 + wcNow.hour;
  if (wKey !== lastSentWorldKey) {
    lastSentWorldKey = wKey;
    delta.world = wcNow;
  }
  io.emit('server_tick', delta);
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
      } else if (wDoc === null) saveWorld(); // cloud chưa có → đẩy bản file lên
      const cDoc = await storage.loadDoc('characters');
      if (cDoc && typeof cDoc === 'object') characters = cDoc;
      else if (cDoc === null && Object.keys(characters).length) saveCharacters();
      const aDoc = await storage.loadDoc('accounts');
      if (aDoc && typeof aDoc === 'object') accounts = aDoc;
      else if (aDoc === null && Object.keys(accounts).length) saveAccounts();
      console.log(`[storage] Đồng bộ cloud xong: ${Object.keys(characters).length} nhân vật, ${Object.keys(accounts).length} tài khoản.`);
    } catch (e) {
      console.warn('[storage] Đồng bộ cloud lỗi — dùng dữ liệu file tại chỗ:', e.message);
    }
  }
  server.listen(PORT, () => {
    console.log(`[server] Tap Tanh Tu Tien backend dang chay tai http://localhost:${PORT}`);
    console.log(`[server] Phat 'server_tick' ${1000 / TICK_MS} lan/giay cho ${players.size} player (gom ${DEMO_BOTS} bot demo)`);
  });
})();
