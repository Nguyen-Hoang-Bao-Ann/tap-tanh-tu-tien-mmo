// GĐ396 chân 2 — ĐẾM PHÂN BỔ BỘ SPRITE NPC THÀNH PHỐ (cũ vs mới).
// Tái hiện ĐÚNG logic 3 phía, giữ đồng bộ với client/src/main.ts (cityNpcPool /
// cityNpcLook) và server/index.js (GĐ89: gộp NPCData + NPCData_new, gán style,
// nối tay Chủ Tiệm Thảo Dược / Chủ Trại Ngự Thú / Thủ Tàng / NPC kể chuyện):
//   - style = 'villager' + (hash89(id) % 5)   [server, lúc boot — KHÔNG nằm trong file JSON]
//   - h = FNV-1a(id)                          [client GĐ396]
//   - cũ: role khớp → bộ cố định; style villager0-4 → city-a..e; else số cuối id → villager-a/b/c
//   - mới: role khớp → pool[h % pool.length], variant = floor(h/pool.length) % 8;
//          vai không khớp → giữ đúng cách chọn bộ cũ, chỉ thêm variant = h % 8.
// Chạy: node probes/f32/f32_count_396.cjs   (đọc server/data/gdd/*.json, không đụng server đang chạy)
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..', '..');

function hash89(s) { let h = 0; for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return h; }
function fnv1a32(s) { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h >>> 0; }

// ---- Bảng pool GĐ396 — GIỮ ĐỒNG BỘ với cityNpcPool trong client/src/main.ts ----
function cityNpcPool(n) {
  const role = n.role || '';
  if (role.includes('Sứ Giả')) return ['envoy'];
  if (role === 'Chủ Tiệm Đan') return ['shopdan'];
  if (role === 'Chủ Tiệm Nguyên Liệu') return ['shopnl'];
  if (role === 'Chủ Tiệm Thảo Dược' || role === 'Dược Sư' || role.includes('Đan Sư')) return ['npc-thaoduoc'];
  if (role === 'Thủ Tàng' || role === 'Thầy Đồ' || role.includes('Thư Ký') || role === 'Trợ Lý Trận Pháp' || role === 'Trợ Lý Phù Chú') return ['city-d'];
  if (role.includes('Thương nhân') || role.includes('Thương Gia')) return ['merchant'];
  if (role.startsWith('Trưởng') || role === 'Lão Tổ Về Hưu' || role.includes('Thú Sư') || role === 'Đại Sư Trận Pháp' || role === 'Đại Sư Phù Chú' || role === 'Phù Sư' || role === 'Trận Sư') return ['elder'];
  if (role.includes('Lính gác') || role.includes('Lính Gác')) return ['city-e'];
  if (role.includes('Thợ Rèn') || role === 'Chủ Tiệm Vũ Khí') return ['blacksmith'];
  if (role === 'Chủ Quán Ăn') return ['f32-quanan'];
  if (role === 'Chủ Tiệm Tạp Hóa') return ['f32-taphoa'];
  if (role.includes('Người Áo Đen') || role === 'Người Giữ Bí Mật') return ['f32-aoden'];
  if (role === 'Bà Mối') return ['f32-bamoi'];
  if (role === 'Thầy Bói') return ['f32-thayboi'];
  if (role === 'Lão Ngư') return ['f32-laongu'];
  if (role.includes('Thợ Săn')) return ['f32-thosan'];
  if (role.includes('Kiếm Khách')) return ['f32-kiemkhach'];
  if (role.includes('Hòa Thượng')) return ['f32-hoathuong'];
  if (role.includes('Nữ Hiệp')) return ['f32-nuhiep'];
  if (role.includes('Đạo Sĩ')) return ['f32-daosi'];
  if (role.includes('Tiểu Yêu')) return ['f32-tieuyeu'];
  if (role === 'Dân thường') return ['city-a', 'city-b', 'city-c', 'city-d', 'city-e', 'villager-a', 'villager-b', 'villager-c', 'f32-dannu', 'f32-laodan'];
  if (role === 'Người ngắm cảnh') return ['city-b', 'city-c', 'city-d'];
  return null;
}
function cityNpcLook(n) {
  const h = fnv1a32(n.id || `${n.name || ''}|${n.role || ''}|${n.x || 0},${n.y || 0}`);
  const pool = cityNpcPool(n);
  if (pool) return { set: pool[h % pool.length], variant: Math.floor(h / pool.length) % 8 };
  const sd = Number(String(n.style || '').replace('villager', ''));
  if (Number.isInteger(sd) && sd >= 0 && sd <= 4) return { set: ['city-a', 'city-b', 'city-c', 'city-d', 'city-e'][sd], variant: h % 8 };
  const m = n.id.match(/(\d+)\s*$/);
  const idx = m ? Number(m[1]) : 0;
  return { set: ['villager-a', 'villager-b', 'villager-c'][Math.abs(idx) % 3], variant: h % 8 };
}
// Hàm gán CŨ (trước GĐ396) — để đối chiếu city-a trước/sau.
function cityNpcSpriteKeyOld(n) {
  const role = n.role || '';
  if (role.includes('Sứ Giả')) return 'envoy';
  if (role === 'Chủ Tiệm Đan') return 'shopdan';
  if (role === 'Chủ Tiệm Nguyên Liệu') return 'shopnl';
  if (role === 'Chủ Tiệm Thảo Dược') return 'npc-thaoduoc';
  if (role === 'Thủ Tàng') return 'city-d';
  if (role.includes('Thương nhân') || role.includes('Thương Gia')) return 'merchant';
  if (role.startsWith('Trưởng') || role === 'Lão Tổ Về Hưu') return 'elder';
  const sd = Number(String(n.style || '').replace('villager', ''));
  if (Number.isInteger(sd) && sd >= 0 && sd <= 4) return ['city-a', 'city-b', 'city-c', 'city-d', 'city-e'][sd];
  const m = n.id.match(/(\d+)\s*$/);
  const idx = m ? Number(m[1]) : 0;
  return ['villager-a', 'villager-b', 'villager-c'][Math.abs(idx) % 3];
}

// ---- Nạp dữ liệu như server GĐ89 ----
const npcOld = JSON.parse(fs.readFileSync(path.join(ROOT, 'server/data/gdd/NPCData.json'), 'utf8')).maps || {};
const npcNew = JSON.parse(fs.readFileSync(path.join(ROOT, 'server/data/gdd/NPCData_new.json'), 'utf8')).maps || {};
const npcAll = { ...npcOld, ...npcNew };
const mapDefs = new Map(JSON.parse(fs.readFileSync(path.join(ROOT, 'server/data/gdd/MapData.json'), 'utf8')).maps.map((d) => [d.id, d]));
const npcs = [];
for (const [mapId, entry] of Object.entries(npcAll)) {
  if (!mapDefs.has(mapId)) { console.log(`(bỏ qua map ${mapId}: không có trong MapData)`); continue; }
  for (const n of entry.npcs || []) npcs.push({ ...n, mapId, style: 'villager' + (hash89(n.id) % 5) });
}
// NPC nối tay (server/index.js GĐ151/161/386/353) — style như server gán:
let herbN = 0, mountN = 0;
for (const mapId of Object.keys(npcAll)) {
  const def = mapDefs.get(mapId);
  if (!def) continue;
  if ((def.category === 'city' || def.category === 'fortress' || def.category === 'village') && mapId !== 'van_uyen') {
    const kid = `${mapId}_npc_thaoduoc`;
    npcs.push({ id: kid, name: 'Chủ Tiệm Thảo Dược', role: 'Chủ Tiệm Thảo Dược', kind: 'functional', mapId, style: 'villager' + (hash89(kid) % 5) });
    herbN++;
  }
  if (mapId === 'ngu_thu_son_trang') {
    const kid = 'npc_chutrai_nguthu';
    npcs.push({ id: kid, name: 'Mã Vân', role: 'Chủ Trại Ngự Thú', kind: 'functional', mapId, style: 'villager' + (hash89(kid) % 5) });
    mountN++;
  }
}
if (npcAll.van_uyen || mapDefs.has('van_uyen')) {
  npcs.push({ id: 'van_uyen_npc_thutang', name: 'Trầm Mặc', role: 'Thủ Tàng', kind: 'functional', mapId: 'van_uyen', style: 'villager3' });
}
npcs.push(
  { id: 'npc_kiepdaithu', name: 'Kiếp Đài Thủ', role: 'Người giữ Đài Kiếp', kind: 'functional', mapId: '?', style: 'villager2' },
  { id: 'npc_hovetm', name: 'Hộ Vệ Tiên Môn', role: 'Hộ Vệ Tiên Môn ngoại viện', kind: 'functional', mapId: '?', style: 'villager4' },
);

// ---- Đếm ----
// Đối chiếu boot thật (probes/f32/boot396/boot396.cjs): log GĐ89 in 158 map /
// 14488 NPC — 158 = 157 map gộp + van_uyen (entry rỗng, chỉ có Thủ Tàng);
// 14488 + 2 NPC kể chuyện GĐ353 (push SAU log GĐ89) = 14490 = tổng ở đây.
const total = npcs.length;
const oldCount = {}, newCount = {}, newLooks = new Set();
const roleStats = {}; // role -> {n, poolSize, looks}
for (const n of npcs) {
  const o = cityNpcSpriteKeyOld(n);
  oldCount[o] = (oldCount[o] || 0) + 1;
  const lk = cityNpcLook(n);
  newCount[lk.set] = (newCount[lk.set] || 0) + 1;
  newLooks.add(lk.set + '|v' + lk.variant);
  const pool = cityNpcPool(n);
  // Vai giữ cũ: bộ theo style (city-a..e, 5 bộ) × variant 8 = 40 diện mạo.
  const rs = roleStats[n.role] || (roleStats[n.role] = { n: 0, pool: pool ? pool.join(',') : '(giữ cũ: style→city-a..e)', poolSize: pool ? pool.length : 5 });
  rs.n++;
}
const pct = (c) => (100 * c / total).toFixed(1) + '%';
const top = (count) => Object.entries(count).sort((a, b) => b[1] - a[1]).slice(0, 12);
console.log(`TỔNG NPC (file gộp + nối tay): ${total}  [gộp ${Object.keys(npcAll).length} map; nối tay: thảo dược ${herbN}, trại ngự thú ${mountN}, thủ tàng 1, kể chuyện 2]`);
console.log(`\n--- CŨ (cityNpcSpriteKey, có style) — top bộ ---`);
for (const [s, c] of top(oldCount)) console.log(`  ${s.padEnd(14)} ${String(c).padStart(6)}  ${pct(c)}`);
console.log(`  city-a cũ: ${oldCount['city-a'] || 0} (${pct(oldCount['city-a'] || 0)})`);
console.log(`\n--- MỚI (cityNpcLook + variant) — top bộ ---`);
for (const [s, c] of top(newCount)) console.log(`  ${s.padEnd(14)} ${String(c).padStart(6)}  ${pct(c)}`);
console.log(`  city-a mới: ${newCount['city-a'] || 0} (${pct(newCount['city-a'] || 0)}) — giảm ${((oldCount['city-a'] || 0) - (newCount['city-a'] || 0))} NPC`);
console.log(`  tổng diện mạo khác nhau (set×variant): ${newLooks.size}`);
console.log(`\n--- DIỆN MẠO / VAI (poolSize × 8; vai giữ cũ = 5 bộ city × 8 = 40) — top vai đông nhất ---`);
for (const [role, rs] of Object.entries(roleStats).sort((a, b) => b[1].n - a[1].n).slice(0, 16)) {
  console.log(`  ${String(rs.n).padStart(5)}  ${role.padEnd(26)} pool ${rs.poolSize} → ${rs.poolSize * 8} diện mạo`);
}
console.log(`\n--- VAI NÀO KHÔNG KHỚP POOL (giữ hành vi cũ) ---`);
for (const [role, rs] of Object.entries(roleStats).sort((a, b) => b[1].n - a[1].n)) {
  if (rs.pool.startsWith('(giữ cũ')) console.log(`  ${String(rs.n).padStart(5)}  ${role}`);
}
