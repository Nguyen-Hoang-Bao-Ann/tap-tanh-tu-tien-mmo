// GĐ119 — Hệ thống Trang Bị (server): port từ trang-bi/game_data.json.
// Module thuần logic (không phụ thuộc server/index.js) để probe unit test
// được trực tiếp. Bước 1 chỉ dùng: nạp dữ liệu + sinh đồ + tính chỉ số +
// kiểm tra mặc đồ; socket mặc/rèn sẽ nối ở bước 2/3.
const fs = require('fs');
const path = require('path');

const GEAR_DATA = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'data', 'gear_data.json'), 'utf8')
);

const RARITIES = GEAR_DATA.rarities;
const ELEMENTS = { ...GEAR_DATA.elements.basic, ...GEAR_DATA.elements.mutation };
const PATHS = GEAR_DATA.paths;
const SLOTS = GEAR_DATA.slots;
const WEAPONS = GEAR_DATA.weapons;
const SLOT_NAMES = GEAR_DATA.slot_names;
const BASE_STATS = GEAR_DATA.base_stats;
const TALENT_LEVEL = GEAR_DATA.talent_level_by_rarity;
const REROLL_COST = GEAR_DATA.reroll_cost;
const TOKEN = GEAR_DATA.token;

// GĐ119 bước 4: kinh tế nguồn trang bị (giá shop, ngày rèn, nguyên liệu rèn,
// tỉ lệ rơi rương/nhiệm vụ, kho shop theo ngày).
const SHOP_PRICE = GEAR_DATA.shop_price;
const FORGE_DAYS = GEAR_DATA.forge_days;
const FORGE_MATERIALS = GEAR_DATA.forge_materials;
const CHEST_GEAR = GEAR_DATA.chest_gear;
const QUEST_GEAR = GEAR_DATA.quest_gear;
const SHOP_STOCK_CFG = GEAR_DATA.shop_stock;
const ELEMENT_IDS = Object.keys(ELEMENTS);

// RNG gieo hạt (mulberry32): kho shop theo ngày phải giống nhau cho mọi
// người chơi và sau restart — mỗi món có seed riêng (ngày, vị trí) nên mua
// lại đúng món đã xem mà không cần lưu kho đâu cả.
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function pickRand(rand, arr) { return arr[Math.floor(rand() * arr.length)]; }
function weightedRand(rand, entries) {
  const total = entries.reduce((s, e) => s + e[1], 0);
  let r = rand() * total;
  for (const [k, w] of entries) { if (r < w) return k; r -= w; }
  return entries[entries.length - 1][0];
}
function shopStockGear(dayIndex, index) {
  const seed = ((dayIndex + 1) * 2654435761) ^ ((index + 1) * 40503);
  const rand = mulberry32(seed);
  const rarity = weightedRand(rand, Object.entries(SHOP_STOCK_CFG.rarity_weights));
  const path = pickRand(rand, PATHS);
  const element = pickRand(rand, ELEMENT_IDS);
  const slot = pickRand(rand, SLOTS);
  const weapons = WEAPONS[path] || [];
  const weapon = slot === 'WEAPON' && weapons.length ? pickRand(rand, weapons).id : null;
  return generateGear({ path, element, rarity, slot, weapon, rand });
}
function shopStockItem(dayIndex, index) {
  const item = shopStockGear(dayIndex, index);
  return { index, dayIndex, rarity: item.rarity, slot: item.slot, path: item.path, element: item.element, weapon: item.weapon,
    tokenRank: item.tokenRank, name: item.name, baseStats: item.baseStats,
    talents: item.talents, price: SHOP_PRICE[item.rarity] };
}
function shopStockForDay(dayIndex) {
  const out = [];
  for (let i = 0; i < SHOP_STOCK_CFG.count; i++) out.push(shopStockItem(dayIndex, i));
  return out;
}

// GĐ119 bước 4: roll phẩm trang bị rơi từ rương / thưởng nhiệm vụ (hàm thuần
// để probe unit test được; server chỉ việc sinh đồ theo phẩm trả về).
// Trả về phẩm (string) hoặc null khi không rơi.
function chestGearFor(grade, stoneGrade, rand = Math.random) {
  const cfg = stoneGrade === 'cuc' ? CHEST_GEAR.boss : CHEST_GEAR[grade];
  if (!cfg || rand() >= cfg.chance) return null;
  return pickRand(rand, cfg.pool);
}
function questGearFor(isCity, rand = Math.random) {
  const cfg = isCity ? QUEST_GEAR.city : QUEST_GEAR.board;
  if (!cfg || rand() >= cfg.chance) return null;
  return pickRand(rand, cfg.pool);
}

// classId trong game -> path id trong spec trang bị.
const CLASS_TO_PATH = {
  thetu: 'THE_TU', phattu: 'PHAT_TU', cottu: 'COT_TU', satthu: 'SAT_THU',
  kiemtu: 'KIEM_TU', phaptu: 'PHAP_TU', quytu: 'QUY_TU', ytu: 'Y_TU', nhotu: 'NHO_TU',
};

// GĐ165: id đường vũ khí trong game (weaponId, chữ thường) -> id vũ khí
// trong spec trang bị. Có 3 ngoại lệ không suy ra bằng viết hoa được:
// daothe -> DAO, thuongthe -> THUONG, ngamtho -> NGON_LINH (vũ khí Nho
// Tu đã đổi tên Ngôn Linh ở GĐ157, id đường vẫn là ngamtho).
const GAME_WEAPON_TO_GEAR = {
  taykhong: 'TAY_KHONG', chienphu: 'CHIEN_PHU', cukiem: 'CU_KIEM', daothe: 'DAO',
  thuongthe: 'THUONG', thietcon: 'THIET_CON',
  phatchau: 'PHAT_CHAU', quyentruong: 'QUYEN_TRUONG', binhbat: 'BINH_BAT',
  cotthuan: 'COT_THUAN', cotchuy: 'COT_CHUY',
  colenh: 'CO_LENH', luoihai: 'LUOI_HAI', quythuong: 'QUY_THUONG',
  daogam: 'DAO_GAM', songdao: 'SONG_DAO', liemngan: 'LIEM_NGAN', trao: 'TRAO',
  kiem: 'KIEM', songkiem: 'SONG_KIEM', trongkiem: 'TRONG_KIEM',
  phien: 'PHIEN', phaptruong: 'PHAP_TRUONG', sachphep: 'SACH_PHEP',
  phattran: 'PHAT_TRAN', kimcham: 'KIM_CHAM', cocam: 'CO_CAM',
  ngamtho: 'NGON_LINH', butphep: 'BUT_PHEP', quyentruc: 'QUYEN_TRUC',
};
// Id vũ khí gear của đường vũ khí người chơi đang cầm (null nếu không rõ).
function gearWeaponFor(player) {
  if (!player) return null;
  return GAME_WEAPON_TO_GEAR[player.weaponId] || null;
}

// Tên hệ tiếng Việt trong game (linhCan.main/elements, bienDi) -> id hệ spec.
const DISPLAY_TO_ID = {
  Kim: 'KIM', Mộc: 'MOC', Thủy: 'THUY', Hỏa: 'HOA', Thổ: 'THO', Vô: 'VO',
  Lôi: 'LOI', Phong: 'PHONG', Băng: 'BANG', Nham: 'NHAM', Độc: 'DOC',
  Quang: 'QUANG', Ám: 'AM', Huyết: 'HUYET', 'Thời Gian': 'THOI_GIAN', 'Không Gian': 'KHONG_GIAN',
};

function normElement(v) {
  if (typeof v !== 'string') return null;
  if (ELEMENTS[v]) return v; // đã là id (KIM, LOI, ...)
  if (DISPLAY_TO_ID[v]) return DISPLAY_TO_ID[v]; // tên tiếng Việt
  const up = v.toUpperCase();
  return ELEMENTS[up] ? up : null;
}

// Tập hệ (id) mà người chơi đang có: linhCan.elements + main + bienDi.
function playerElementIds(p) {
  const out = new Set();
  const lc = p.linhCan || {};
  const list = Array.isArray(lc.elements) ? lc.elements : [];
  if (lc.main) list.push(lc.main);
  for (const e of list) {
    const id = normElement(e);
    if (id) out.add(id);
  }
  const bd = p.classRes && p.classRes.bienDi;
  const bdId = normElement(bd);
  if (bdId) out.add(bdId);
  // GĐ154: biến dị nay là DANH SÁCH trong linhCan.mutations (roll lúc đo linh căn)
  if (Array.isArray(lc.mutations)) {
    for (const m of lc.mutations) {
      const id = normElement(m);
      if (id) out.add(id);
    }
  }
  return out;
}

function gearUid() {
  return 'gear_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function slotDisplayName(pathId, slot, weaponName) {
  if (slot === 'WEAPON') return weaponName || 'Tay Không';
  const names = SLOT_NAMES[slot];
  return names[pathId] || names['*'];
}

// Roll nội tại ẩn từ Pool của Path. Lấy ngẫu nhiên CÓ TRÙNG (đúng spec).
function rollTalents(pathId, rarity, rand) {
  const rnd = rand || Math.random;
  const count = RARITIES[rarity].talent_lines;
  const level = TALENT_LEVEL[rarity] || 0;
  const pool = GEAR_DATA.talent_pools[pathId];
  const totIds = new Set(pool.tot.map((t) => t.id));
  const all = pool.tot.concat(pool.phe);
  const rates = GEAR_DATA.talent_rates;
  const lines = [];
  for (let i = 0; i < count; i++) {
    const t = all[Math.floor(rnd() * all.length)];
    const kind = totIds.has(t.id) ? 'tot' : 'phe';
    const rate = kind === 'tot' ? rates.good_pct_per_level : rates.bad_pct_per_level;
    lines.push({ id: t.id, name: t.name, kind, stat: t.stat, level,
                 bonusPct: rate * level, desc: t.desc });
  }
  return lines;
}

// Sinh trang bị. Tên = [Prefix phẩm] + [Tên hệ] + [Tên slot].
// slot/weapon/prefix/tokenRank bỏ trống sẽ random.
function generateGear(opts) {
  const { path: pathId, element, rarity } = opts;
  const rand = opts.rand || Math.random;
  if (!PATHS.includes(pathId)) throw new Error('Hướng tu không tồn tại: ' + pathId);
  if (!ELEMENTS[element]) throw new Error('Hệ không tồn tại: ' + element);
  if (!RARITIES[rarity]) throw new Error('Phẩm không tồn tại: ' + rarity);
  const slot = opts.slot || SLOTS[Math.floor(rand() * SLOTS.length)];
  if (!SLOTS.includes(slot)) throw new Error('Ô trang bị không tồn tại: ' + slot);

  let weapon = null;
  let weaponName = null;
  if (slot === 'WEAPON') {
    const list = WEAPONS[pathId];
    if (opts.weapon) {
      const match = list.find((w) => w.id === opts.weapon);
      if (!match) throw new Error(pathId + ' không có vũ khí ' + opts.weapon);
      weapon = match.id;
      weaponName = match.name;
    } else {
      const picked = list[Math.floor(rand() * list.length)];
      weapon = picked.id;
      weaponName = picked.name;
    }
  }

  const prefix = opts.prefix || RARITIES[rarity].prefixes[Math.floor(rand() * RARITIES[rarity].prefixes.length)];
  const slotName = slotDisplayName(pathId, slot, weaponName);

  let tokenRank = null;
  let tokenRankName = null;
  let name;
  if (slot === 'TOKEN') {
    tokenRank = opts.tokenRank || (1 + Math.floor(rand() * 9));
    if (tokenRank < 1 || tokenRank > 9) throw new Error('Cấp lệnh bài phải từ 1 (Cửu Phẩm) đến 9 (Nhất Phẩm)');
    tokenRankName = TOKEN.ranks[tokenRank - 1].name;
    name = prefix + ' ' + ELEMENTS[element] + ' ' + slotName + ' ' + tokenRankName;
  } else {
    name = prefix + ' ' + ELEMENTS[element] + ' ' + slotName;
  }

  return {
    uid: gearUid(), path: pathId, element, rarity, slot, weapon, name, prefix,
    tokenRank, tokenRankName,
    baseStats: { ...BASE_STATS[slot] },
    talents: rollTalents(pathId, rarity, rand),
  };
}

// GĐ165: rèn lại vũ khí của 1 món ô WEAPON sang đường vũ khí khác CÙNG
// hướng tu (dùng khi giao đồ shop: kho gieo hạt giữ nguyên cho mọi
// người xem, bản giao cho người mua cùng hướng tu được đổi sang đúng
// vũ khí người mua đang cầm + đặt lại tên, giữ nguyên hậu tố bậc).
function restampWeaponGear(item, gearWeaponId) {
  if (!item || item.slot !== 'WEAPON' || !gearWeaponId) return item;
  const match = (WEAPONS[item.path] || []).find((w) => w.id === gearWeaponId);
  if (!match || item.weapon === gearWeaponId) return item;
  const bandSuffix = item.band && GEAR_DATA.realm_bands && GEAR_DATA.realm_bands[item.band]
    ? ` · ${GEAR_DATA.realm_bands[item.band].label}` : '';
  item.weapon = match.id;
  item.name = `${item.prefix} ${ELEMENTS[item.element]} ${match.name}${bandSuffix}`;
  return item;
}

// GĐ162: đóng dấu BẬC CẢNH GIỚI lên món đồ (vd đồ sinh cho người chơi
// Nguyên Anh trở lên mang bậc 'na'). Tên món thêm nhãn bậc để người
// chơi nhìn là biết; hệ số nhân nằm ở calcGearStats; cổng mặc ở canEquip.
function applyBand(item, band) {
  const cfg = GEAR_DATA.realm_bands && GEAR_DATA.realm_bands[band];
  if (!cfg || !item || item.band) return item;
  item.band = band;
  item.name = `${item.name} · ${cfg.label}`;
  return item;
}

// Chỉ số cuối = Base × Hệ số phẩm × Hệ số bậc cảnh giới × (1 + tổng bonus nội tại), bonus theo từng chỉ số.
function calcGearStats(item) {
  const bandMul = (item.band && GEAR_DATA.realm_bands && GEAR_DATA.realm_bands[item.band]) ? GEAR_DATA.realm_bands[item.band].multiplier : 1;
  const mult = RARITIES[item.rarity].multiplier * bandMul;
  const bonus = {};
  for (const line of item.talents || []) {
    bonus[line.stat] = (bonus[line.stat] || 0) + line.bonusPct;
  }
  const final = {};
  for (const [stat, base] of Object.entries(item.baseStats || {})) {
    final[stat] = Math.round(base * mult * (1 + (bonus[stat] || 0)) * 100) / 100;
  }
  const talentBonus = {};
  for (const [k, v] of Object.entries(bonus)) talentBonus[k] = Math.round(v * 10000) / 10000;
  return { final, multiplier: mult, talentBonus };
}

// Luật mặc đồ (đúng spec): hệ VO ai cũng mặc được; Pháp Tu mặc cả 16 hệ;
// còn lại cần linh căn tương ứng. Sai -> { ok: false, message: 'Không thể trang bị' }.
function canEquip(player, item) {
  // GĐ162: đồ mang bậc cảnh giới thì phải đạt cảnh giới đó mới mặc được
  if (item.band && GEAR_DATA.realm_bands && GEAR_DATA.realm_bands[item.band]) {
    const ORDER = { pham: 0, lk: 1, tc: 2, kd: 3, na: 4, ht: 5 };
    const need = GEAR_DATA.realm_bands[item.band].min_realm;
    if ((ORDER[player.realm] ?? 0) < (ORDER[need] ?? 0)) return { ok: false, message: 'Không thể trang bị' };
  }
  // GĐ165: đồ ô VŨ KHÍ phải đúng đường vũ khí đang cầm mới mặc được
  // (cầm Kiếm mà mặc đồ Song Kiếm thì không dùng được).
  if (item.slot === 'WEAPON' && item.weapon) {
    const mine = gearWeaponFor(player);
    if (mine && item.weapon !== mine) return { ok: false, message: 'Không thể trang bị' };
  }
  const pathId = CLASS_TO_PATH[player.classId] || player.path;
  if (item.faction && (!player.branch || player.branch.side !== item.faction)) return { ok: false, message: 'Không thể trang bị' }; // GĐ143: Lệnh Bài phe chỉ phe đó đeo được
  if (item.element === GEAR_DATA.elements.universal) return { ok: true };
  if (pathId === GEAR_DATA.elements.all_access_path) return { ok: true };
  if (playerElementIds(player).has(item.element)) return { ok: true };
  return { ok: false, message: 'Không thể trang bị' };
}

// Trấn Áp lệnh bài: cấp cao hơn gây giảm (chênh × 5%) toàn bộ chỉ số lên
// cấp thấp hơn, tối đa 30%. Tier 9 (Nhất Phẩm) cao nhất.
function tokenSuppression(attackerTier, defenderTier) {
  if (attackerTier == null || defenderTier == null) return 0;
  const diff = attackerTier - defenderTier;
  if (diff <= 0) return 0;
  return Math.min(diff * TOKEN.suppression_per_tier, TOKEN.suppression_cap);
}

// Hiệu ứng NPC của lệnh bài (số TẠM, spec chưa chốt): mỗi tier +1% giảm giá
// với NPC cùng nghề và +1% tỉ lệ nhận nhiệm vụ ẩn.
function tokenNpcBonus(tier) {
  if (tier == null) return { tradeDiscount: 0, hiddenQuestBonus: 0 };
  return {
    tradeDiscount: tier * TOKEN.npc_trade_discount_per_tier,
    hiddenQuestBonus: tier * TOKEN.npc_hidden_quest_per_tier,
  };
}

module.exports = {
  GEAR_DATA, RARITIES, ELEMENTS, ELEMENT_IDS, PATHS, SLOTS, WEAPONS, SLOT_NAMES, BASE_STATS,
  TALENT_LEVEL, REROLL_COST, TOKEN, CLASS_TO_PATH,
  SHOP_PRICE, FORGE_DAYS, FORGE_MATERIALS, CHEST_GEAR, QUEST_GEAR, SHOP_STOCK_CFG,
  normElement, playerElementIds, gearUid, rollTalents, generateGear,
  calcGearStats, canEquip, applyBand, tokenSuppression, tokenNpcBonus,
  GAME_WEAPON_TO_GEAR, gearWeaponFor, restampWeaponGear,
  mulberry32, pickRand, weightedRand, shopStockGear, shopStockItem, shopStockForDay,
  chestGearFor, questGearFor,
};
