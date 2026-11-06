# GĐ320a: DUYEN NO loi — thang thien cam NPC -1000..1000 (gop vao affinity cu) + bonds nguoi choi
# + engine diem/nhanh + hieu ung khi gan + payload. Chay: python3 shottools/patch_gd320a.py
import io
P = '/home/hatch/workspace/tap-tanh-tu-tien-mmo/server/index.js'
s = io.open(P, encoding='utf-8').read()
def rep(old, new, n=1):
    global s
    assert s.count(old) == n, 'anchor %dx: %s' % (s.count(old), old[:70])
    s = s.replace(old, new)

# --- 1) addAffinity: thang moi +-1000, giam nua tren 300, tran ngay cho nguon lap lai ---
rep("""function addAffinity(socket, p, npcId, delta) {
  if (!p.affinity) p.affinity = {};
  const before = affinityOf(p, npcId);
  const after = Math.max(-100, Math.min(100, before + delta));""",
"""function addAffinity(socket, p, npcId, delta, opts = {}) {
  if (!p.affinity) p.affinity = {};
  const before = affinityOf(p, npcId);
  // GĐ320: thang DUYÊN NỢ -1000..+1000 (Bảo chốt: leo cực khó) — trên Bạn thân (300) điểm cộng giảm nửa; nguồn LẶP LẠI trần +15/ngày game/cặp
  if (delta > 0) {
    if (before >= 300) delta = Math.max(1, Math.floor(delta / 2));
    if (opts.repeatable) {
      const day = worldClock().dayIndex;
      if (!p.affDay || p.affDay.day !== day) p.affDay = { day, gains: {} };
      const room = Math.max(0, 15 - (p.affDay.gains[npcId] || 0));
      delta = Math.min(delta, room);
      if (delta <= 0) return before;
      p.affDay.gains[npcId] = (p.affDay.gains[npcId] || 0) + delta;
    }
  }
  const after = Math.max(-1000, Math.min(1000, before + delta));""")

# --- 2) Engine Duyen No ngay sau khoi addAffinity (neo: dau ham ke tiep sau no) ---
anchor2 = "  console.log(`[thiện cảm] ${p.name} ↔ ${NPC_BY_ID[npcId]?.name}: ${before} → ${after}`);\n  return after;\n}"
assert s.count(anchor2) == 1
engine = anchor2 + """

// ================= GĐ320: DUYÊN NỢ — quan hệ đặc biệt (người chơi + NPC) =================
// NPC dùng chính p.affinity (thang -1000..1000 ở trên). Người chơi dùng p.bonds:
//   { 'p:<token>': {score, branch:null|'than'|'tinh', pick, gainDay, gainAmt, name} }
// branch khóa vĩnh viễn khi đủ: NPC = người chơi chọn; người chơi = CẢ HAI cùng chọn một nhánh.
const BOND_TIER_NAME = { nguoidung: 'Người dưng', banbe: 'Bạn bè', banthan: 'Bạn thân', triki: 'Tri kỉ', huynhde: 'Huynh Đệ', donglong: 'Động lòng', henho: 'Hẹn hò', phuthe: 'Phu thê', triam: 'Tri âm', ganhghet: 'Ganh ghét', kethu: 'Kẻ thù', khongdoi: 'Không đội trời chung', motmat: '1 mất 1 còn' };
const BOND_DEPTH = { banbe: 1, ganhghet: 1, banthan: 2, kethu: 2, donglong: 2.5, triki: 3, henho: 3, khongdoi: 3, phuthe: 3.5, huynhde: 4, motmat: 4, triam: 4.5 };
const BOND_FX = { banbe: { stat: 0.01 }, banthan: { stat: 0.02 }, donglong: { med: 0.05 }, triki: { stat: 0.03 }, henho: { med: 0.10, stat: 0.02 }, phuthe: { med: 0.10, stat: 0.03, spouse: true }, triam: { med: 0.15, stat: 0.04 }, huynhde: { stat: 0.04, grief: true }, ganhghet: { speed: -0.02 }, kethu: { stat: -0.03 }, khongdoi: { stat: -0.05 }, motmat: { stat: -0.08 } };
function bondTierOf(score, branch) {
  if (score >= 100) {
    if (!branch) return score >= 300 ? 'banthan' : 'banbe';
    if (branch === 'than') return score >= 900 ? 'huynhde' : score >= 600 ? 'triki' : score >= 300 ? 'banthan' : 'banbe';
    return score >= 1000 ? 'triam' : score >= 850 ? 'phuthe' : score >= 650 ? 'henho' : score >= 450 ? 'donglong' : score >= 300 ? 'banthan' : 'banbe';
  }
  if (score <= -1000) return 'motmat';
  if (score <= -600) return 'khongdoi';
  if (score <= -300) return 'kethu';
  if (score <= -100) return 'ganhghet';
  return 'nguoidung';
}
function bondPairTopName(myGender, myAge, otGender, otAge) { // tên bậc cuối nhánh Thân theo giới tính + tuổi (TẠM: NPC không có tuổi -> coi ngang tuổi, bên nam làm Huynh/Tỷ theo giới)
  const mg = myGender === 'nu' ? 'nu' : 'nam'; const og = otGender === 'nu' ? 'nu' : 'nam';
  if (mg === 'nam' && og === 'nam') return 'Huynh Đệ';
  if (mg === 'nu' && og === 'nu') return 'Tỷ Muội';
  if (mg === 'nam') return (myAge ?? 20) >= (otAge ?? 20) ? 'Huynh Muội' : 'Tỷ Đệ';
  return (myAge ?? 20) >= (otAge ?? 20) ? 'Tỷ Đệ' : 'Huynh Muội';
}
function bondTierNameFor(p, key, score, branch) {
  const tier = bondTierOf(score, branch);
  if (tier !== 'huynhde') return BOND_TIER_NAME[tier];
  if (key.startsWith('n:')) { const n = NPC_BY_ID[key.slice(2)]; return bondPairTopName(p.gender, ageOf(p), n?.gender, ageOf(p)); }
  const ot = playerByToken(key.slice(2)) || characters[key.slice(2)];
  return bondPairTopName(p.gender, ageOf(p), ot?.gender, ot ? ageOf(ot) : ageOf(p));
}
function playerByToken(token) { for (const q of players.values()) if (q && q.token === token && !q.isCompanion) return q; return null; }
function bondEntryOf(p, key) { if (!p.bonds) p.bonds = {}; return p.bonds[key] || null; }
function bondGainApply(entry, delta, opts = {}) { // luật chung: giảm nửa >=300, trần +15/ngày cho nguồn lặp; trả điểm thật áp được
  if (delta > 0) {
    if (entry.score >= 300) delta = Math.max(1, Math.floor(delta / 2));
    if (!opts.event) {
      const day = worldClock().dayIndex;
      if (entry.gainDay !== day) { entry.gainDay = day; entry.gainAmt = 0; }
      const room = Math.max(0, 15 - (entry.gainAmt || 0));
      delta = Math.min(delta, room);
      if (delta <= 0) return 0;
      entry.gainAmt = (entry.gainAmt || 0) + delta;
    }
  }
  entry.score = Math.max(-1000, Math.min(1000, (entry.score || 0) + delta));
  return delta;
}
function bondMirrorEntry(other, key, srcEntry) { // chép trạng thái quan hệ sang phía bên kia (online hoac file nhan vat)
  if (!other) return;
  if (!other.bonds) other.bonds = {};
  const e = other.bonds[key] || (other.bonds[key] = { score: 0, branch: null, pick: null, gainDay: -1, gainAmt: 0, name: '' });
  e.score = srcEntry.score; e.branch = srcEntry.branch; e.name = srcEntry.mirrorName || e.name;
}
function addBondPair(p, otherToken, delta, opts = {}) { // cộng điểm quan hệ NGƯỜI CHƠI–NGƯỜI CHƠI, gương hai phía
  if (!p || !otherToken || p.token === otherToken || !delta) return 0;
  if (!p.bonds) p.bonds = {};
  const key = 'p:' + otherToken;
  const other = playerByToken(otherToken);
  const otherRec = other || characters[otherToken];
  if (!otherRec) return 0;
  const e = p.bonds[key] || (p.bonds[key] = { score: 0, branch: null, pick: null, gainDay: -1, gainAmt: 0, name: otherRec.name || '' });
  e.name = otherRec.name || e.name;
  const applied = bondGainApply(e, delta, opts);
  if (applied) {
    e.mirrorName = p.name;
    bondMirrorEntry(otherRec, 'p:' + p.token, e);
    persistPlayer(p);
    if (other) { persistPlayer(other); const os = io.sockets.sockets.get(other.id); if (os) syncChar(os, other); }
    else saveCharacters();
    const ps = io.sockets.sockets.get(p.id); if (ps) syncChar(ps, p);
    if (opts.announce) { emitNoticeTo(p, opts.announce); if (other) emitNoticeTo(other, opts.announce); }
  }
  return applied;
}
function bondNpcScore(p, npcId) { return affinityOf(p, npcId); }
function bondEffectsOf(p) { // hiệu ứng của mối quan hệ MẠNH NHẤT đang ở gần (cùng map <=600px, cả hai còn sống) — cache 2s
  if (p.isCompanion) return null;
  const now = Date.now();
  if (p._bondFx && now - (p._bondFxAt || 0) < 2000) return p._bondFx;
  let best = null;
  if (p.bonds && (p.hp || 0) > 0 && !isDowned(p)) {
    for (const q of players.values()) {
      if (q === p || q.isCompanion || q.isBot || q.isOffline || (q.hp || 0) <= 0 || isDowned(q)) continue;
      if (mapOf(q) !== mapOf(p)) continue;
      if (Math.hypot(q.x - p.x, q.y - p.y) > 600) continue;
      const e = p.bonds['p:' + q.token];
      if (!e || Math.abs(e.score || 0) < 100) continue;
      const tier = bondTierOf(e.score, e.branch);
      const depth = BOND_DEPTH[tier] || 0;
      if (depth > 0 && (!best || depth > best.depth)) best = { tier, depth, fx: BOND_FX[tier] || {}, key: 'p:' + q.token, otherId: q.id };
    }
  }
  p._bondFx = best ? { statMul: 1 + (best.fx.stat || 0), medMul: 1 + (best.fx.med || 0), speedMul: 1 + (best.fx.speed || 0), spouse: !!best.fx.spouse, grief: !!best.fx.grief, tier: best.tier, otherId: best.otherId } : { statMul: 1, medMul: 1, speedMul: 1, spouse: false, grief: false, tier: null, otherId: null };
  p._bondFxAt = now;
  return p._bondFx;
}
function bondStatMulOf(p) { const fx = bondEffectsOf(p); return fx ? fx.statMul : 1; }
function bondMedMulOf(p) { const fx = bondEffectsOf(p); return fx ? fx.medMul : 1; }
function bondSpeedMulOf(p) { const fx = bondEffectsOf(p); return fx ? fx.speedMul : 1; }
function bondViewOf(p) { // dữ liệu panel Duyên Nợ
  const out = [];
  for (const [key, e] of Object.entries(p.bonds || {})) {
    out.push({ key, kind: 'player', name: e.name || key.slice(2), score: e.score || 0, branch: e.branch || null, pick: e.pick || null, tier: bondTierOf(e.score || 0, e.branch), tierName: bondTierNameFor(p, key, e.score || 0, e.branch), canChoose: (e.score || 0) >= 300 && !e.branch });
  }
  for (const [npcId, sc] of Object.entries(p.affinity || {})) {
    if (!sc) continue;
    const key = 'n:' + npcId;
    const br = (p.bonds && p.bonds[key] && p.bonds[key].branch) || null;
    out.push({ key, kind: 'npc', name: NPC_BY_ID[npcId]?.name || npcId, score: sc, branch: br, pick: null, tier: bondTierOf(sc, br), tierName: bondTierNameFor(p, key, sc, br), canChoose: sc >= 300 && !br });
  }
  out.sort((a, b) => Math.abs(b.score) - Math.abs(a.score));
  return out;
}
function migrateAffinityV2(p) { // GĐ320: điểm thiện cảm cũ (thang +-100) -> thang Duyên Nợ (x3, kẹp +-1000), chạy 1 lần
  if (!p || p.affV2) return;
  p.affV2 = 1;
  if (p.affinity) for (const k of Object.keys(p.affinity)) p.affinity[k] = Math.max(-1000, Math.min(1000, Math.round((p.affinity[k] || 0) * 3)));
}
function npcQuestGateOf(def) { return (def.minAffinity ?? 50) * 2; } // GĐ320: cổng nhiệm vụ riêng theo thang mới (50 cũ -> 100 = Bạn bè)
"""
s = s.replace(anchor2, engine)

# --- 3) effStatsOf: nhan chi so theo Duyen No + buff Dau xot ---
rep("""  // GĐ230: KIẾP THƯƠNG — thua 1 cổng kiếp: toàn bộ chỉ số hiệu dụng ×0,85""",
"""  // GĐ320: DUYÊN NỢ — chỉ số theo mối quan hệ mạnh nhất đang ở gần (+-%) — cùng cơ chế các hệ số toàn cục ở trên
  if (p && !p.isCompanion) { const bm = bondStatMulOf(p); if (bm !== 1) for (const k of ['vatCong', 'phapCong', 'vatPhong', 'phapPhong', 'tocDo', 'minhMan', 'khiHuyet']) if (typeof eff[k] === 'number') eff[k] = Math.round(eff[k] * bm); }
  // GĐ320: Đau xót (nhánh Thân bậc cuối) — bạn tri kỉ gục ngã: +15% công trong 30s
  if (p && Date.now() < (p.bondGriefUntil || 0)) { eff.vatCong = Math.round((eff.vatCong || 0) * 1.15); eff.phapCong = Math.round((eff.phapCong || 0) * 1.15); }
  // GĐ230: KIẾP THƯƠNG — thua 1 cổng kiếp: toàn bộ chỉ số hiệu dụng ×0,85""")

# --- 4) Persist: bonds + affV2 + affDay (3 noi theo luat truong ben) ---
rep("  c.chiDiemUntilMin = p.chiDiemUntilMin || 0; // GĐ318: hạn buff chỉ điểm (phút thế giới)",
"  c.chiDiemUntilMin = p.chiDiemUntilMin || 0; // GĐ318: hạn buff chỉ điểm (phút thế giới)\n  c.bonds = p.bonds || {}; // GĐ320: quan hệ Duyên Nợ với người chơi (+ nhánh của quan hệ NPC)\n  c.affV2 = p.affV2 ? 1 : 0; // GĐ320: đã chuyển thang thiện cảm\n  c.affDay = p.affDay || null; // GĐ320: trần điểm lặp lại theo ngày (NPC)")
rep("    chiDiemUntilMin: char.chiDiemUntilMin || 0, // GĐ318",
"    chiDiemUntilMin: char.chiDiemUntilMin || 0, // GĐ318\n    bonds: char.bonds && typeof char.bonds === 'object' ? char.bonds : {}, // GĐ320\n    affV2: char.affV2 ? 1 : 0, affDay: char.affDay || null, // GĐ320", 2)
rep("function spawnFromCharacter(socket, charKey, char) {\n  migrateGeo175(char); // GĐ175",
"function spawnFromCharacter(socket, charKey, char) {\n  migrateGeo175(char); // GĐ175\n  migrateAffinityV2(char); // GĐ320: chuyển thang thiện cảm cũ -> thang Duyên Nợ (1 lần)")
rep("function spawnOfflineActor(charKey, char) {\n  migrateGeo175(char); // GĐ175",
"function spawnOfflineActor(charKey, char) {\n  migrateGeo175(char); // GĐ175\n  migrateAffinityV2(char); // GĐ320")

# --- 5) Payload: bonds view ---
rep("    masterInfo: p.masterInfo ? { name: p.masterInfo.name, graduated: !!p.masterInfo.graduated } : null, // GĐ318",
"    masterInfo: p.masterInfo ? { name: p.masterInfo.name, graduated: !!p.masterInfo.graduated } : null, // GĐ318\n    bonds: bondViewOf(p), // GĐ320: panel Duyên Nợ")

# --- 6) Cong nhiem vu rieng theo thang moi ---
rep("      if (affinityOf(player, def.npcId) < (def.minAffinity ?? 50)) {\n        socket.emit('interact_error', { message: `Nhiệm vụ riêng chỉ mở khi thiện cảm với ${npc.name} ≥ ${def.minAffinity ?? 50} (hiện ${affinityOf(player, def.npcId)}).` });",
"      if (affinityOf(player, def.npcId) <= -600) { socket.emit('interact_error', { message: `${npc.name} không muốn gặp bạn nữa (quan hệ đã tới mức không đội trời chung).` }); return; }\n      if (affinityOf(player, def.npcId) < npcQuestGateOf(def)) {\n        socket.emit('interact_error', { message: `Nhiệm vụ riêng chỉ mở khi thiện cảm với ${npc.name} ≥ ${npcQuestGateOf(def)} (hiện ${affinityOf(player, def.npcId)}).` });")
rep("        state: q ? q.state : aff >= (def.minAffinity ?? 50) ? 'available' : 'locked',",
"        state: q ? q.state : aff >= npcQuestGateOf(def) ? 'available' : 'locked',")
rep("        minAffinity: def.minAffinity ?? 50,", "        minAffinity: npcQuestGateOf(def), // GĐ320: hiện cổng theo thang Duyên Nợ")

# --- 7) Tiem: tu choi <=-600, giam gia >=600 ---
rep("""    if (npcId && aff <= -50) {
      socket.emit('interact_error', { message: `${NPC_BY_ID[npcId].name} từ chối giao dịch với bạn (thiện cảm ${aff} — quá thấp).` });
      return;
    }""",
"""    if (npcId && aff <= -600) { // GĐ320: hai mức nợ sâu nhất -> từ chối phục vụ
      socket.emit('interact_error', { message: `${NPC_BY_ID[npcId].name} từ chối giao dịch với bạn (quan hệ đã tới mức không đội trời chung).` });
      return;
    }""")
rep("    const discounted = npcId && aff >= 50 && repDisc === 1;",
"    const discounted = npcId && aff >= 600 && repDisc === 1; // GĐ320: khách tri kỉ (thang mới) giảm 10%")
rep("""    if (npcId && affinityOf(player, npcId) <= -50) {
      socket.emit('interact_error', { message: `${NPC_BY_ID[npcId].name} từ chối giao dịch với bạn (thiện cảm quá thấp).` });
      return;
    }""",
"""    if (npcId && affinityOf(player, npcId) <= -600) { // GĐ320
      socket.emit('interact_error', { message: `${NPC_BY_ID[npcId].name} từ chối giao dịch với bạn (quan hệ đã tới mức không đội trời chung).` });
      return;
    }""")

io.open(P, 'w', encoding='utf-8').write(s)
print('patch gd320a OK')
