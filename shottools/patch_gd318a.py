# GĐ318a: SU DO — loi du lieu + helpers + spawn/AI NPC de tu + diem cau su (the gioi)
import io
P = '/home/hatch/workspace/tap-tanh-tu-tien-mmo/server/index.js'
s = io.open(P, encoding='utf-8').read()
def rep(old, new, n=1):
    global s
    assert s.count(old) == n, 'anchor %dx: %s' % (s.count(old), old[:70])
    s = s.replace(old, new)

# --- World field discTaken: khai bao + loader + snap ---
rep("let gardenPlants = []; // GĐ308: cây vườn thảo dược của người chơi (persist qua saveWorld như festPlants)",
"let gardenPlants = []; // GĐ308: cây vườn thảo dược của người chơi (persist qua saveWorld như festPlants)\nlet discTaken = {}; // GĐ318: diem cau su da co de tu hom nay {spotId: dayIndex}")
rep("      if (Array.isArray(w.gardenPlants)) gardenPlants = w.gardenPlants; // GĐ308",
"      if (Array.isArray(w.gardenPlants)) gardenPlants = w.gardenPlants; // GĐ308\n      if (w.discTaken && typeof w.discTaken === 'object') discTaken = w.discTaken; // GĐ318")
rep("const snap = { totalMinutes: worldMinutes, savedAt: Date.now(), altarUsed, festPlants, gardenPlants, hiddenChestState, festLanterns, sects, sectWars, broadcastMails };",
"const snap = { totalMinutes: worldMinutes, savedAt: Date.now(), altarUsed, festPlants, gardenPlants, hiddenChestState, festLanterns, sects, sectWars, broadcastMails, discTaken }; // GĐ318: + discTaken")

CORE = r'''
// ===================== GĐ318: SƯ ĐỒ — đệ tử NPC + đệ tử người chơi =====================
// Bảo chốt thiết kế 06/11 (THIET_KE_DE_TU.md): nhận đệ tử phải qua TÔNG MÔN
// NGƯỜI CHƠI (Trưởng lão trở lên, hoặc tự lập tông làm Tông chủ); quan hệ
// VĨNH VIỄN — chỉ sư phụ được đơn phương TRỤC XUẤT, đệ tử không tự rời;
// sư phụ TRUYỀN CÔNG PHÁP cho đệ tử (học nếu đủ điều kiện gốc); đệ tử NPC
// chết là MẤT HẲN, đệ tử người chơi hồi sinh theo luật thường. Mọi số TẠM.
const DISC_MAX = 3; // đệ tử đang theo học tối đa (NPC + người chơi chung)
const DISC_LEVEL_NAMES = ['', 'Học Đồ', 'Ký Danh Đệ Tử', 'Thân Truyền', 'Đệ Tử Chân Truyền', 'Chuẩn Xuất Sư'];
const DISC_NEED = [80, 200, 420, 800]; // Tâm đắc tích lũy để lên cấp 2..5
const DISC_GRAD_NEED = 1200; // cấp 5 đạt mốc này thì cho xuất sư được
const DISC_FRAC = [0, 0.25, 0.35, 0.45, 0.55, 0.65]; // sức đệ tử NPC theo % sức sư phụ, theo cấp
const DISC_POINT_GAIN = 25; // chỉ điểm: Tâm đắc cho đệ tử NPC / 1 lần / ngày
const DISC_GRAD_STONES = 500; // quà mừng sư phụ khi đệ tử người chơi thành tài (LT Hạ)
const DISC_SPOTS = [ // điểm cầu sư ở làng (NPC động — client chỉ vẽ NPC qua snapshot làng)
  { id: 's0', x: 1750, y: 1252 }, { id: 's1', x: 1400, y: 1000 }, { id: 's2', x: 1565, y: 1520 },
  { id: 's3', x: 1140, y: 1700 }, { id: 's4', x: 2050, y: 1050 },
];
const DISC_NAMES = ['Tiểu Thạch', 'A Ngưu', 'Tiểu Mai', 'A Phúc', 'Tiểu Liên', 'A Sơn', 'Tiểu Yến', 'A Hải', 'Tiểu Trúc', 'A Lâm', 'Tiểu Cúc', 'A Phong', 'Tiểu Hà', 'A Dũng', 'Tiểu Ngọc', 'A Khôi'];
function disciplesOf(p) { if (!Array.isArray(p.disciples)) p.disciples = []; return p.disciples; }
function discipleMasterEligible(p) { // cổng tông môn: Trưởng lão+ trong tông người chơi
  const g = sectOfToken(p.token); if (!g) return false;
  const me = g.members.find((m) => m.token === p.token);
  return !!me && (SECT_RANK[me.role] ?? 0) >= 1;
}
function discipleActiveCount(p) { return disciplesOf(p).filter((e) => !e.graduated).length; }
function candidateFor(spot, day) { // thiếu niên cầu sư: tất định theo (điểm, ngày)
  const h = Math.abs(((day + 7) * 31 + DISC_SPOTS.indexOf(spot) * 17 + 5) | 0);
  const classIds = Object.keys(CLASSES);
  return { name: DISC_NAMES[h % DISC_NAMES.length], tilt: classIds[h % classIds.length], gender: h % 2 ? 'nu' : 'nam' };
}
function candidateNpcs() {
  const day = worldClock().dayIndex;
  const out = [];
  for (const spot of DISC_SPOTS) {
    if (discTaken[spot.id] === day) continue;
    const c = candidateFor(spot, day);
    out.push({ id: 'disc_cand_' + spot.id, name: c.name, role: 'Thiếu niên cầu sư', personality: 'Cầu sư', x: spot.x, y: spot.y, direction: 'down' });
  }
  return out;
}
function discipleEntityOf(owner, idx) { for (const q of players.values()) if (q.isDisciple && q.ownerId === owner.id && q.discIdx === idx) return q; return null; }
function discipleStatsFor(owner, e) {
  const frac = DISC_FRAC[e.level] || 0.25;
  const maxHp = Math.max(40, Math.round(maxHpEff(owner) * frac));
  const stats = {};
  for (const k of STAT_KEYS) stats[k] = Math.max(1, Math.round((owner.stats?.[k] || 5) * frac));
  stats.khiHuyet = Math.max(1, Math.round((maxHp - 100) / 10));
  stats.maxHpOverride = maxHp;
  stats.tocDo = 100;
  return stats;
}
function discipleRealmFor(e) { return e.level >= 5 ? 'kd' : e.level >= 3 ? 'tc' : 'lk'; }
function spawnDisciple(owner, idx) {
  const e = disciplesOf(owner)[idx];
  if (!e || e.type !== 'npc') return null;
  const old = discipleEntityOf(owner, idx); if (old) players.delete(old.id);
  const stats = discipleStatsFor(owner, e);
  const maxHp = stats.maxHpOverride;
  const c = {
    id: `disc-${owner.id}-${idx}`,
    x: owner.x + 42, y: owner.y + 26, vx: 0, vy: 0, input: { vx: 0, vy: 0 }, direction: 'down',
    isBot: false, isCompanion: true, isDisciple: true, discIdx: idx, ownerId: owner.id, ownerKey: owner.charKey, mapId: mapOf(owner),
    name: e.name, classId: e.tilt, stats,
    hp: Math.min(maxHp, Math.max(1, e.hp || maxHp)), mp: 0,
    robe: null, gender: e.gender || 'nam', weaponId: weaponOf(e.tilt, null)?.id || null,
    realm: discipleRealmFor(e), tier: e.level >= 3 ? 1 : 9, lastAttackAt: 0, skillCd: {}, meditating: false,
    followDx: 42, followDy: 26,
  };
  players.set(c.id, c);
  return c;
}
function spawnDisciples(owner) { disciplesOf(owner).forEach((e, i) => { if (e.type === 'npc') spawnDisciple(owner, i); }); }
function breakDisciple(c) { // đệ tử NPC tử nạn: MẤT HẲN (Bảo chốt)
  const owner = players.get(c.ownerId);
  players.delete(c.id);
  io.to('map:' + mapOf(c)).emit('pet_died', { id: c.id, kind: 'disciple', x: c.x, y: c.y });
  if (!owner) return;
  const list = disciplesOf(owner);
  const e = list[c.discIdx];
  if (e && e.type === 'npc') {
    list.splice(c.discIdx, 1);
    for (const q of players.values()) if (q.isDisciple && q.ownerId === owner.id && q.discIdx > c.discIdx) q.discIdx -= 1;
    persistPlayer(owner);
    emitNoticeTo(owner, `💔 Đệ tử ${e.name} đã tử nạn trong trận chiến. Sư đồ một kiếp, nay đoạn tuyệt — hãy tới điểm cầu sư nhận lớp đệ tử mới khi sẵn sàng.`);
    const sock = io.sockets.sockets.get(owner.id); if (sock) syncChar(sock, owner);
  }
}
function addDiscipleTamDac(owner, e, n) {
  if (!e || e.type !== 'npc') return;
  const before = e.level;
  e.tamDac = (e.tamDac || 0) + n;
  while (e.level < 5 && e.tamDac >= DISC_NEED[e.level - 1]) e.level += 1;
  if (e.level >= 3 && !(e.skills || []).length) { const basic = (SKILLS[e.tilt] || [])[0]; if (basic) { e.skills = [basic.id]; } }
  if (e.level > before) {
    emitNoticeTo(owner, `🎓 Đệ tử ${e.name} lên cấp ${e.level} — ${DISC_LEVEL_NAMES[e.level]}! (Tâm đắc ${e.tamDac})`);
    const idx = disciplesOf(owner).indexOf(e);
    if (idx >= 0) spawnDisciple(owner, idx);
  }
  persistPlayer(owner);
}
// AI đệ tử NPC: theo mẫu updateTamed — bám chủ, đánh quái gần chủ, dùng chiêu được truyền
function updateDisciple(c, dt) {
  const owner = players.get(c.ownerId);
  if (!owner || owner.isOffline) { players.delete(c.id); return; }
  const e = disciplesOf(owner)[c.discIdx];
  if (!e || e.type !== 'npc') { players.delete(c.id); return; }
  if (c.hp <= 0) { breakDisciple(c); return; }
  const maxHpD = maxHpOf(c.stats);
  if (c.hp < maxHpD) c.hp = Math.min(maxHpD, c.hp + 0.02 * maxHpD * dt);
  c.meditating = !!(owner.meditating && Math.hypot(owner.x - c.x, owner.y - c.y) <= 220);
  if (Math.hypot(owner.x - c.x, owner.y - c.y) > PET_LEASH_SNAP) {
    const tx = owner.x + c.followDx, ty = owner.y + c.followDy;
    if (!hitsObstacle(tx, ty)) { c.x = tx; c.y = ty; }
  }
  let target = null, td = Infinity;
  for (const m of monsters.values()) {
    if (m.kind === 'trial' && m.ownerId !== owner.id) continue;
    if (mapOf(m) !== mapOf(owner) || m.hidden) continue;
    const d = Math.hypot(m.x - owner.x, m.y - owner.y);
    if (d < td) { td = d; target = m; }
  }
  const anchor = target && td <= PET_ENGAGE_RANGE ? target : null;
  const dest = anchor ? { x: anchor.x, y: anchor.y } : { x: owner.x + c.followDx, y: owner.y + c.followDy };
  const distDest = Math.hypot(dest.x - c.x, dest.y - c.y);
  const stopD = anchor ? 40 : 4;
  if (distDest > stopD) {
    const stepLen = Math.min(distDest - stopD, 305 * dt);
    const dx = (dest.x - c.x) / (distDest || 1), dy = (dest.y - c.y) / (distDest || 1);
    moveWithCollision(c, c.x + dx * stepLen, c.y + dy * stepLen);
    faceDirection(c, dx, dy);
  }
  const dims = mapDims(mapOf(c));
  c.x = Math.max(MARGIN, Math.min(dims.w - MARGIN, c.x));
  c.y = Math.max(MARGIN, Math.min(dims.h - MARGIN, c.y));
  if (anchor) {
    const now = Date.now();
    const distA = Math.hypot(anchor.x - c.x, anchor.y - c.y);
    let casted = false;
    for (const sid of (e.skills || [])) {
      const sk = SKILL_BY_ID[sid]; if (!sk) continue;
      if (distA > (sk.range || 60)) continue;
      if (now - (c.skillCd[sid] || 0) < (sk.cdMs || 5000)) continue;
      if (now - (c.lastAttackAt || 0) < 500) continue;
      c.skillCd[sid] = now; c.lastAttackAt = now;
      hurtMonster(anchor, sk.coef * (attackStatOf(c).value + 10), anchor.def ?? WOLF.def);
      io.emit('player_attacked', { id: c.id, targetId: anchor.id });
      if (anchor.hp <= 0) onMonsterKilled(null, owner, anchor);
      casted = true; break;
    }
    if (!casted && distA <= 48) {
      const cd = ATTACK_COOLDOWN_MS * (1 - cdrOf(c.stats));
      if (now - (c.lastAttackAt || 0) >= cd) {
        c.lastAttackAt = now;
        hurtMonster(anchor, BASIC_COEF * (attackStatOf(c).value + 10), anchor.def ?? WOLF.def);
        io.emit('player_attacked', { id: c.id, targetId: anchor.id });
        if (anchor.hp <= 0) onMonsterKilled(null, owner, anchor);
      }
    }
  }
  e.hp = Math.round(c.hp);
}
function discMedMulOf(p) { // buff thiền của đệ tử người chơi: gần sư phụ đang thiền +10%, buff chỉ điểm +20%
  let m = 1;
  if ((p.chiDiemUntilMin || 0) > worldMinutes) m *= 1.2;
  if (p.masterInfo && p.meditating) {
    const mp = playerByName(p.masterInfo.name);
    if (mp && !mp.isOffline && mp.meditating && mapOf(mp) === mapOf(p) && Math.hypot(mp.x - p.x, mp.y - p.y) <= 600) m *= 1.1;
  }
  return m;
}
function skillTeachCheck(d, sk) { // d = {realm, tier, linhCan, stats, classId, weaponId, skills}
  if (!sk) return 'Công pháp không tồn tại.';
  if (sk.sectId) return 'Công pháp tông môn chỉ lĩnh ngộ được tại Sứ Giả Tông Môn.';
  if (sk.tier === 'phaptuong' || sk.tier === 'vienman') return 'Chiêu này là tự thân lĩnh ngộ, không truyền được.';
  if ((KD_SKILLS[d.classId] || []).some((x) => x.id === sk.id) || (NA_SKILLS[d.classId] || []).some((x) => x.id === sk.id)) return 'Thần thông tự lĩnh ngộ khi đột phá, không truyền được.';
  if ((d.skills || []).includes(sk.id)) return 'Đệ tử đã học công pháp này rồi.';
  if (sk.weaponId) {
    const w = weaponOf(d.classId, d.weaponId);
    if (!w || w.id !== sk.weaponId) return `Cần dùng đúng vũ khí của công pháp (${sk.weaponId}).`;
  } else if (!(SKILLS[d.classId] || []).some((x) => x.id === sk.id) && !(SKILL_CATALOG[d.classId]?.[weaponOf(d.classId, d.weaponId)?.id] || []).some((x) => x.id === sk.id)) {
    return 'Công pháp không thuộc đường tu của đệ tử.';
  }
  const ro = REALM_ORDER[d.realm] ?? 0;
  let realmOk;
  const legacy = (SKILLS[d.classId] || []).some((x) => x.id === sk.id);
  if (legacy && sk.tier === 'luyenkhi') realmOk = d.realm === 'lk' && (d.tier || 0) >= 3;
  else if (legacy && sk.tier === 'trucco') realmOk = d.realm === 'tc';
  else realmOk = sk.tier === 'coban' ? !!d.linhCan : sk.tier === 'luyenkhi' ? d.realm !== 'pham' : sk.tier === 'kimdan' ? ro >= 3 : sk.tier === 'nguyenanh' ? ro >= 4 : d.realm === 'tc';
  if (!realmOk) return `Đệ tử chưa đủ cảnh giới để học ${sk.name}.`;
  if (sk.element && BIENDI_ELEMENTS.includes(sk.element) && !(d.linhCan?.mutations || []).includes(sk.element)) return `Cần linh căn biến dị hệ ${sk.element}.`;
  if (!condMetOf(d, sk)) return `Đệ tử chưa đủ chỉ số — cần: ${condTextOf(sk)}.`;
  return null;
}
function discipleGraduateCheck(dp) { // đệ tử người chơi đạt Kim Đan -> thành tài (quan hệ còn nguyên)
  if (!dp.masterInfo || dp.masterInfo.graduated) return;
  if ((REALM_ORDER[dp.realm] ?? 0) < 3) return;
  dp.masterInfo.graduated = true;
  persistPlayer(dp);
  const mKey = dp.masterInfo.key, mName = dp.masterInfo.name;
  const gift = { id: newMailId(), from: 'Đệ tử ' + dp.name, title: '🎓 Đệ tử thành tài!', body: `${dp.name} đã đột phá Kim Đan và thành tài dưới sự dạy dỗ của bạn. Món quà nhỏ gửi tới sư phụ để tạ ơn dạy dỗ.`, stones: DISC_GRAD_STONES, items: { linh_thao: 5 }, at: Date.now(), read: false, claimed: false };
  const mp = playerByName(mName);
  if (mp && mp.token === mKey) {
    const e = disciplesOf(mp).find((x) => x.type === 'player' && x.key === dp.token);
    if (e) e.graduated = true;
    mp.counters = mp.counters || {}; mp.counters.disciples = (mp.counters.disciples || 0) + 1;
    pushPersonalMail(mp, gift); persistPlayer(mp);
    emitNoticeTo(mp, `🎓 Đệ tử ${dp.name} của bạn đã thành tài (đạt Kim Đan)! Có thư tạ ơn trong hộp thư.`);
    const sock = io.sockets.sockets.get(mp.id); if (sock) { syncChar(sock, mp); pushMailState(mp); }
  } else {
    const rec = characters[mKey];
    if (rec) {
      if (Array.isArray(rec.disciples)) { const e = rec.disciples.find((x) => x.type === 'player' && x.key === dp.token); if (e) e.graduated = true; }
      rec.counters = rec.counters || {}; rec.counters.disciples = (rec.counters.disciples || 0) + 1;
      if (!Array.isArray(rec.mails)) rec.mails = [];
      rec.mails.unshift(gift); if (rec.mails.length > 50) rec.mails.length = 50;
      saveCharacters();
    }
  }
  emitNoticeTo(dp, `🎓 Bạn đã THÀNH TÀI dưới sự dạy dỗ của sư phụ ${mName}! Quan hệ sư đồ vẫn còn — hãy về thăm và phụng dưỡng sư phụ.`);
}
function emitDiscipleCandidateDialog(socket, player, npcId) {
  const spot = DISC_SPOTS.find((x) => 'disc_cand_' + x.id === npcId);
  if (!spot) return;
  if (discTaken[spot.id] === worldClock().dayIndex) { socket.emit('interact_error', { message: 'Thiếu niên này đã được người khác nhận làm đệ tử rồi.' }); return; }
  if (Math.hypot(player.x - spot.x, player.y - spot.y) > 95) { socket.emit('interact_error', { message: 'Tới gần thiếu niên cầu sư để trò chuyện.' }); return; }
  const cand = candidateFor(spot, worldClock().dayIndex);
  const tiltName = CLASSES[cand.tilt]?.name || cand.tilt;
  socket.emit('npc_dialog', {
    npcId, name: cand.name, personality: 'Thiếu niên cầu sư', shopId: null, affinity: 0, gained: 0,
    text: `Con là ${cand.name}, nhà nghèo không có đường tu, nghe nói làng có Đạo Quán và các vị tiền bối mở tông lập phái. Con có thiên hướng ${tiltName}, chỉ mong được một vị sư phụ nhận làm đệ tử, dạy con nên người. (Nhận đệ tử cần: có tông môn người chơi và giữ chức Trưởng lão trở lên — hoặc tự lập tông môn riêng.)`,
    accuse: null, personalQuest: null, personalQuests: [], claimable: [], merchantInfo: null, sectInfo: null, realmInfo: null, escortInfo: null, envoySect: null, mountShop: null, festivalInfo: null,
    discipleCandidate: { spotId: spot.id, tilt: cand.tilt, tiltName, eligible: discipleMasterEligible(player), slots: DISC_MAX - discipleActiveCount(player) },
  });
}
'''
anchor103 = "// ------------------------- GĐ103: PHẬT TU"
assert s.count(anchor103) == 1
s = s.replace(anchor103, CORE + "\n" + anchor103)
io.open(P, 'w', encoding='utf-8').write(s)
print('gd318a OK')
