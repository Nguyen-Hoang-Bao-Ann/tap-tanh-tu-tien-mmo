# -*- coding: utf-8 -*-
# GĐ317 (05/11): LUÂN HỒI CÁCH 1 — hệ CHỦNG TỘC (10 tộc: buff/debuff/đặc trưng/thọ/
# điểm gốc theo THIET_KE_COT_TRUYEN + bảng tộc v3 Bảo duyệt 22:39) + chuỗi 10 VẬT
# PHẨM ẨN của 10 vị thần đầu tiên (cảm ứng theo vùng như mảnh hồn GĐ315) + công
# pháp ẩn HOÁN VU KIẾP HỒN (hồi chiêu 500 năm game) + Thiên Đạo Môn chọn tộc lúc
# tạo nhân vật + lifeLog cho Kiếp Ký. Mọi số TẠM theo bảng Bảo đã duyệt.
import io
P = '/home/hatch/workspace/tap-tanh-tu-tien-mmo/server/index.js'
s = io.open(P, encoding='utf-8').read()
def rep(old, new, cnt=1):
    global s
    assert s.count(old) == cnt, 'ANCHOR x%d: %s' % (s.count(old), old[:90])
    s = s.replace(old, new)

# ===== 1. Dữ liệu 10 tộc + helper (chèn trước khối GĐ314) =====
rep("""// ===== GĐ314: LUÂN HỒI — hồn bền qua các kiếp (Bảo duyệt 05/11) =====""",
"""// ------------------------- GĐ317: CHỦNG TỘC (10 tộc — Cách 1) -------------------------
// Bảng tộc v3 Bảo duyệt 05/11 22:39 (THIET_KE_LUAN_HOI + THIET_KE_COT_TRUYEN):
// điểm gốc = tổng 7 chỉ số cơ bản lúc bắt đầu kiếp tộc; main = 2 chỉ số thiên lệch
// (trọng số 2 khi chia điểm). Nhân vật thường (chưa qua Thiên Đạo Môn) race = null
// = phàm nhân, không buff/debuff tộc. Mọi số TẠM.
const RACES = {
  nhan: { name: 'Nhân tộc', god: 'Nhân Hoàng Toại Hiền', relic: 'Toại Hiền Học Ấn', total: 120, lifespan: 80, main: [] },
  than: { name: 'Thần tộc', god: 'Thái Nhất Thần Quân', relic: 'Thái Nhất Thiên Mệnh Kính', total: 132, lifespan: 150, main: ['phapCong', 'minhMan'] },
  hoa: { name: 'Hoa tộc', god: 'Xuân Hoa Mẫu', relic: 'Xuân Sinh Chủng', total: 124, lifespan: 120, main: ['khiHuyet', 'minhMan'] },
  ma: { name: 'Ma tộc', god: 'Ma Tổ La Hầu', relic: 'La Hầu Huyết Châu', total: 132, lifespan: 90, main: ['vatCong', 'khiHuyet'] },
  quy: { name: 'Quỷ tộc', god: 'U Minh Quỷ Đế', relic: 'Sinh Tử Bộ', total: 112, lifespan: 200, main: ['minhMan', 'tocDo'] },
  tien: { name: 'Tiên tộc', god: 'Nguyên Thủy Tiên Ông', relic: 'Tiên Thiên Ngọc Giản', total: 128, lifespan: 160, main: ['phapCong', 'minhMan'] },
  long: { name: 'Long tộc', god: 'Tổ Long', relic: 'Tổ Long Nghịch Lân', total: 148, lifespan: 180, main: ['vatCong', 'khiHuyet'] },
  ho: { name: 'Hồ tộc', god: 'Thanh Khâu Hồ Tổ', relic: 'Cửu Vĩ Linh Châu', total: 116, lifespan: 110, main: ['tocDo', 'minhMan'] },
  dieu: { name: 'Bách Điểu tộc', god: 'Đan Phượng Thần Điểu', relic: 'Ngũ Sắc Thần Linh', total: 114, lifespan: 70, main: ['tocDo', 'minhMan'] },
  thu: { name: 'Vạn Thú tộc', god: 'Bạch Trạch', relic: 'Bạch Trạch Đồ', total: 138, lifespan: 100, main: ['vatCong', 'khiHuyet'] },
};
function raceOf(p) { return p && p.race && RACES[p.race] ? p.race : null; }
function raceDistribute(raceId) { // chia điểm gốc theo thiên lệch (main x2)
  const R = RACES[raceId]; const out = {};
  const wsum = STAT_KEYS.reduce((a, k) => a + (R.main.includes(k) ? 2 : 1), 0);
  let used = 0;
  for (const k of STAT_KEYS) { out[k] = Math.floor(R.total * (R.main.includes(k) ? 2 : 1) / wsum); used += out[k]; }
  let rem = R.total - used; const order = [...R.main, ...STAT_KEYS.filter((k) => !R.main.includes(k))];
  for (let i = 0; rem > 0; i = (i + 1) % order.length) { out[order[i]]++; rem--; }
  return out;
}
function raceHpMulOf(p) { const r = raceOf(p); return r === 'quy' || r === 'dieu' ? 0.75 : r === 'ho' ? 0.82 : r === 'long' ? 1.35 : 1; }
function raceDmgMulOf(p, isSkill, atkType) { // hệ số sát thương GÂY RA theo tộc
  const r = raceOf(p); if (!r) return 1;
  let m = 1;
  if (r === 'ma') { m *= 1.2; if ((p.hp || 0) > 0 && (p.hp || 0) < maxHpEff(p) * 0.3) m *= 1.25; } // + Thị Huyết Cuồng
  if (r === 'long') m *= 1.15;
  if (r === 'than' && isSkill) m *= 1.2 * (p.phapTuongActive ? 1.2 : 1); // chiêu +20%, chiêu Pháp Tướng +20% nữa
  if (r === 'tien' && atkType === 'physical') m *= 0.85;
  if (r === 'thu' && !isSkill) m *= 1.25;
  return m;
}
function raceMedMulOf(p) { const r = raceOf(p); return r === 'than' ? 0.8 : r === 'tien' ? 1.2 : 1; } // thiền nói chung (Ma trừ riêng ở nơi linh khí)
function raceSpeedMulOf(p) { let m = raceOf(p) === 'dieu' ? 1.18 : 1; if (Date.now() < (p.foxHasteUntil || 0)) m *= 1.3; return m; }
function craftGainOf(p) { // Nhân tộc: học nghề +20% (tích phần lẻ)
  if (!p || raceOf(p) !== 'nhan') return 1;
  p._craftFrac = (p._craftFrac || 0) + 0.2; const ex = Math.floor(p._craftFrac); p._craftFrac -= ex; return 1 + ex;
}
let FIRE_KINDS = null, BEAST_KINDS = null;
function raceKindSets() { // suy từ tên loài trong dữ liệu (Hỏa: Viêm/Hỏa/Dung Nham; Thú: thú hoang có tên gọi)
  if (FIRE_KINDS) return;
  FIRE_KINDS = new Set(); BEAST_KINDS = new Set();
  for (const [k, d] of Object.entries(MONSTER_TYPES)) {
    const nm = (d && d.name) || '';
    if (/Hỏa|Viêm|Dung Nham|Liệt Diễm/.test(nm)) FIRE_KINDS.add(k);
    if (/Sói|Lang|Hổ|Gấu|Thỏ|Khỉ|Trâu|Hươu|Nai|Cáo|Mèo|Lợn|Heo|Dê|Cừu|Ngựa|Chồn|Rắn|Dơi/.test(nm)) BEAST_KINDS.add(k);
  }
}

// ===== GĐ314: LUÂN HỒI — hồn bền qua các kiếp (Bảo duyệt 05/11) =====""")

# ===== 2. soulNorm: thêm relics / hoanVu / lifeLog / raceChoicePending =====
rep("""    lastLife: x.lastLife && typeof x.lastLife === 'object' ? x.lastLife : null,
    consumed: !!x.consumed,
  };
}""",
"""    lastLife: x.lastLife && typeof x.lastLife === 'object' ? x.lastLife : null,
    relics: x.relics && typeof x.relics === 'object' ? x.relics : {}, // GĐ317: vật phẩm ẩn đã tìm được, theo tộc
    hoanVu: x.hoanVu && typeof x.hoanVu === 'object' ? x.hoanVu : null, // GĐ317: { learned, lastUseYear }
    raceChoicePending: !!x.raceChoicePending, // GĐ317: đang chờ chọn tộc ở Thiên Đạo Môn
    lifeLog: Array.isArray(x.lifeLog) ? x.lifeLog.slice(-20) : [], // GĐ317: biên niên các kiếp (Kiếp Ký)
    consumed: !!x.consumed,
  };
}""")

# ===== 3. maxHpEff nhân hệ số máu tộc =====
rep("function maxHpEff(p) { let m = maxHpOf((p && p.stats) || {}) + (((p && p.gearStats) || gearTotalsOf(p)).hp || 0); const b = activeBuffsOf(p); if (b.hp) m += b.hp.value; return Math.round(m * ptMulOf(p)); }",
    "function maxHpEff(p) { let m = maxHpOf((p && p.stats) || {}) + (((p && p.gearStats) || gearTotalsOf(p)).hp || 0); const b = activeBuffsOf(p); if (b.hp) m += b.hp.value; return Math.round(m * ptMulOf(p) * raceHpMulOf(p)); } // GĐ317: x hệ số máu theo tộc (Quỷ/Điểu 0.75, Hồ 0.82, Long 1.35)")

# ===== 4. learnMulOf: Nhân +20% học/luyện, Thú -25% =====
rep("function learnMulOf(p) { return cultMulOf(p) * (blessingActiveOf(p) && p.blessing === 'tien' ? 1.05 : 1); }",
    "function learnMulOf(p) { const r = raceOf(p); return cultMulOf(p) * (blessingActiveOf(p) && p.blessing === 'tien' ? 1.05 : 1) * (r === 'nhan' ? 1.2 : r === 'thu' ? 0.75 : 1); } // GĐ317: Nhân tộc học nhanh +20%, Vạn Thú học chậm (x0.75)")

# ===== 5. critChanceOf: Hồ +10% =====
rep("function critChanceOf(p) { const base = p && p.anState && p.anState.luyenHon ? 0.10 : 0; return Math.min(1, base + (hiddenStatsOf(p).baoKich || 0) * 0.01 + GEAR.uniqueFxOf(p).critRate); }",
    "function critChanceOf(p) { const base = p && p.anState && p.anState.luyenHon ? 0.10 : 0; return Math.min(1, base + (hiddenStatsOf(p).baoKich || 0) * 0.01 + GEAR.uniqueFxOf(p).critRate + (raceOf(p) === 'ho' ? 0.10 : 0)); } // GĐ317: Hồ tộc +10% chí mạng")

io.open(P, 'w', encoding='utf-8').write(s)
print('gd317 part1 OK')
