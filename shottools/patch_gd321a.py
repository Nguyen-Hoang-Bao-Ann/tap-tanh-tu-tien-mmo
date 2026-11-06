# GĐ321a (Bảo duyệt 06/11): DUYÊN NỢ XUYÊN KIẾP — snapshot sổ hồn lúc tọa hóa,
# cảm ứng khi gặp lại, kết lại giảm 1 bậc (NPC/người chơi/quái).
import io
P = 'server/index.js'
s = io.open(P, encoding='utf-8').read()
def rep(old, new, n=1):
    global s
    assert s.count(old) == n, 'anchor %dx: %s' % (s.count(old), old[:70])
    s = s.replace(old, new)

# 1) soulNorm mang pastBonds
rep("""    lifeLog: Array.isArray(x.lifeLog) ? x.lifeLog.slice(-20) : [], // GĐ317: biên niên các kiếp (Kiếp Ký)""",
    """    lifeLog: Array.isArray(x.lifeLog) ? x.lifeLog.slice(-20) : [], // GĐ317: biên niên các kiếp (Kiếp Ký)
    pastBonds: Array.isArray(x.pastBonds) ? x.pastBonds.filter((e) => e && typeof e.key === 'string').slice(0, 30) : [], // GĐ321: sổ Duyên Nợ — các mối sâu đậm của kiếp trước""")

# 2) snapshot lúc tọa hóa (ngay sau const sl = soulOf(p);)
rep("""  const sl = soulOf(p);
  sl.lives = (sl.lives || 0) + 1;""",
    """  const sl = soulOf(p);
  { // GĐ321: chép các mối Duyên Nợ sâu đậm (|điểm| >= 300 = Bạn thân/Kẻ thù trở lên) vào sổ hồn
    const pb = [];
    for (const [key, e] of Object.entries(p.bonds || {})) {
      if (key.startsWith('n:')) continue;
      const sc = e.score || 0;
      if (Math.abs(sc) < 300) continue;
      if (key.startsWith('p:')) pb.push({ key, kind: 'player', name: (characters[key.slice(2)] && characters[key.slice(2)].name) || e.name || key.slice(2), score: sc, branch: e.branch || null });
      else if (key.startsWith('m:')) pb.push({ key, kind: 'monster', name: e.name || key.slice(2), score: sc, branch: e.branch || null });
    }
    for (const [npcId, sc] of Object.entries(p.affinity || {})) {
      if (!sc || Math.abs(sc) < 300) continue;
      const br = (p.bonds && p.bonds['n:' + npcId] && p.bonds['n:' + npcId].branch) || null;
      pb.push({ key: 'n:' + npcId, kind: 'npc', name: (NPC_BY_ID[npcId] && NPC_BY_ID[npcId].name) || npcId, score: sc, branch: br });
    }
    sl.pastBonds = pb.slice(0, 30);
  }
  sl.lives = (sl.lives || 0) + 1;""")

# 3) helpers xuyên kiếp + quái đặc biệt (sau bondViewOf)
rep("""function migrateAffinityV2(p) { // GĐ320: điểm thiện cảm cũ (thang +-100) -> thang Duyên Nợ (x3, kẹp +-1000), chạy 1 lần""",
    """// ===== GĐ321: DUYÊN NỢ XUYÊN KIẾP + QUÁI ĐẶC BIỆT =====
function restoredBondOf(score, branch) { // mức kiếp trước -> khôi phục THẤP HƠN 1 BẬC, điểm đặt giữa bậc đó (TẠM)
  if (score <= -300) { const L = [-100, -300, -600, -1000]; let idx = 0; for (let i = 0; i < L.length; i++) if (score <= L[i]) idx = i; if (idx === 0) return { score: -200, branch: null }; return { score: Math.round((L[idx - 1] + L[idx]) / 2), branch: null }; }
  const L = branch === 'tinh' ? [100, 300, 450, 650, 850, 1000] : [100, 300, 600, 900];
  let idx = 0; for (let i = 0; i < L.length; i++) if (score >= L[i]) idx = i;
  if (idx === 0) return { score: 200, branch: null };
  const sc = Math.round((L[idx - 1] + L[idx]) / 2);
  return { score: sc, branch: sc >= 300 ? (branch || null) : null };
}
function pastBondOf(p, key) { const sl = p && p.soul; return sl && Array.isArray(sl.pastBonds) ? sl.pastBonds.find((e) => e.key === key) : null; }
function dropPastBond(p, key) { const sl = soulOf(p); if (Array.isArray(sl.pastBonds)) sl.pastBonds = sl.pastBonds.filter((e) => e.key !== key); }
function pastBondsViewOf(p) {
  const sl = p && p.soul; const out = [];
  for (const e of (sl && sl.pastBonds) || []) {
    let gone = false;
    if (e.kind === 'player') gone = !characters[e.key.slice(2)]; // người ấy đã tan hẳn (nhân vật bị xóa) -> chỉ còn kỷ niệm
    out.push({ key: e.key, kind: e.kind, name: e.name, score: e.score, branch: e.branch || null, tierName: bondTierNameFor(p, e.key, e.score, e.branch), sensed: !!e.sensed, gone });
  }
  return out;
}
function isSpecialMonster(m) { return !!(m && m.kind !== 'trial' && !m.isCompanion && !m.illusion && (m.rare || m.mapBoss || m.minChestGrade)); } // GĐ321: trùm / quái hiếm ✦
const MONSTER_FOOD_POOL = ['thit_thu', 'thit_nuong', 'linh_thao', 'tien_linh_chi', 'thanh_thao', 'xuong_thu'];
function monsterLikedFood(kind) { let h = 0; const str = String(kind); for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0; return MONSTER_FOOD_POOL[h % MONSTER_FOOD_POOL.length]; }
function bondEntryMonster(p, kind, name) { if (!p.bonds) p.bonds = {}; const key = 'm:' + kind; return p.bonds[key] || (p.bonds[key] = { score: 0, branch: null, pick: null, gainDay: -1, gainAmt: 0, pairMin: -1, name: name || (MONSTER_TYPES[kind] && MONSTER_TYPES[kind].name) || kind, downDebt: 0 }); }
function addBondMonster(p, m, delta, opts) { // đổi điểm với LOÀI quái đặc biệt; repeatable = ăn trần lặp +15/ngày; điểm >= 300 giảm nửa (luật GĐ320)
  if (!p || !m) return 0;
  const e = bondEntryMonster(p, m.kind, m.name);
  const day = worldClock().dayIndex;
  let d = delta;
  if (opts && opts.repeatable) {
    if (e.gainDay !== day) { e.gainDay = day; e.gainAmt = 0; }
    if (d > 0) { const room = Math.max(0, 15 - (e.gainAmt || 0)); d = Math.min(d, room); if (d > 0) e.gainAmt += d; }
  }
  if (d > 0 && (e.score || 0) >= 300) d = Math.ceil(d / 2);
  e.score = Math.max(-1000, Math.min(1000, (e.score || 0) + d));
  return d;
}
function migrateAffinityV2(p) { // GĐ320: điểm thiện cảm cũ (thang +-100) -> thang Duyên Nợ (x3, kẹp +-1000), chạy 1 lần""")

# 4) bondViewOf: thêm kind monster cho khóa m:
rep("""    out.push({ key, kind: 'player', name: e.name || key.slice(2), score: e.score || 0, branch: e.branch || null, pick: e.pick || null, tier: bondTierOf(e.score || 0, e.branch), tierName: bondTierNameFor(p, key, e.score || 0, e.branch), canChoose: (e.score || 0) >= 300 && !e.branch });""",
    """    out.push({ key, kind: key.startsWith('m:') ? 'monster' : 'player', name: e.name || key.slice(2), score: e.score || 0, branch: e.branch || null, pick: e.pick || null, tier: bondTierOf(e.score || 0, e.branch), tierName: bondTierNameFor(p, key, e.score || 0, e.branch), canChoose: (e.score || 0) >= 300 && !e.branch });""")

# 5) bondEffectsOf: quái đặc biệt ở gần cũng tính (mạnh nhất thắng)
rep("""      if (depth > 0 && (!best || depth > best.depth)) best = { tier, depth, fx: BOND_FX[tier] || {}, key: 'p:' + q.token, otherId: q.id };
    }
  }""",
    """      if (depth > 0 && (!best || depth > best.depth)) best = { tier, depth, fx: BOND_FX[tier] || {}, key: 'p:' + q.token, otherId: q.id };
    }
    for (const m of monsters.values()) { // GĐ321: đứng gần cá thể đặc biệt của loài có duyên/nợ cũng chịu hiệu ứng của mối đó
      if (!isSpecialMonster(m) || mapOf(m) !== mapOf(p)) continue;
      if (Math.hypot(m.x - p.x, m.y - p.y) > 600) continue;
      const e = p.bonds['m:' + m.kind];
      if (!e || Math.abs(e.score || 0) < 100) continue;
      const tier = bondTierOf(e.score, e.branch);
      const depth = BOND_DEPTH[tier] || 0;
      if (depth > 0 && (!best || depth > best.depth)) best = { tier, depth, fx: BOND_FX[tier] || {}, key: 'm:' + m.kind, otherId: m.id };
    }
  }""")

io.open(P, 'w', encoding='utf-8').write(s)
print('gd321a part1 OK')
