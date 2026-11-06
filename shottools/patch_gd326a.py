import io
P = 'server/index.js'
s = io.open(P, encoding='utf-8').read()
def rep(old, new, n=1):
    global s
    assert s.count(old) == n, 'anchor %dx: %s' % (s.count(old), old[:70])
    s = s.replace(old, new)

# --- luu tru sectTech (4 noi nhu luat truong ben vung) ---
rep("""  c.foundInvites = Array.isArray(p.foundInvites) ? p.foundInvites : []; // GĐ319: thiếp mời đang chờ ta""",
    """  c.foundInvites = Array.isArray(p.foundInvites) ? p.foundInvites : []; // GĐ319: thiếp mời đang chờ ta
  c.sectTech = Array.isArray(p.sectTech) ? p.sectTech : []; // GĐ326: tông pháp Tàng Kinh Các đã học""")
rep("""foundSlipFor: char.foundSlipFor || null, reformIn: Array.isArray(char.reformIn) ? char.reformIn : [], // GĐ319 + GĐ321""",
    """foundSlipFor: char.foundSlipFor || null, reformIn: Array.isArray(char.reformIn) ? char.reformIn : [], sectTech: Array.isArray(char.sectTech) ? char.sectTech : [], // GĐ319 + GĐ321 + GĐ326""", 2)
rep("""    foundInvites: Array.isArray(p.foundInvites) ? p.foundInvites : [], // GĐ319""",
    """    foundInvites: Array.isArray(p.foundInvites) ? p.foundInvites : [], // GĐ319
    sectTech: Array.isArray(p.sectTech) ? p.sectTech : [], // GĐ326""")

# --- hang so + ham phu dot 3 (chen canh khoi GĐ322) ---
rep("""function sectWarehouseCapOf(g) { return SECT_WAREHOUSE_CAPS[sectLevelOf(g) - 1]; }""",
    """function sectWarehouseCapOf(g) { return SECT_WAREHOUSE_CAPS[sectLevelOf(g) - 1]; }
// ===== GĐ326: TÔNG MÔN ĐỢT 3 — tông quy / nhật ký / kế vị / Chấp Pháp / tông pháp =====
const SECT_TECH = [ // TẠM: tông pháp học ở Tàng Kinh Các — bị động, chỉ có tác dụng khi còn là thành viên (rời tông là mất hiệu lực, học vẫn giữ)
  { id: 'ho_the', name: 'Tông Pháp Hộ Thể', cost: 200, desc: '+3% phòng thủ vật/pháp.' },
  { id: 'chien_y', name: 'Tông Pháp Chiến Ý', cost: 250, desc: '+3% công vật/pháp.' },
  { id: 'tu_linh', name: 'Tông Pháp Tụ Linh', cost: 200, desc: 'Thiền +5% Tu vi.' },
  { id: 'cap_hanh', name: 'Tông Pháp Cấp Hành', cost: 150, desc: '+3% tốc độ (chỉ số Tốc Độ).' },
];
const SECT_ACTING_DAYS = 14, SECT_SUCCESSION_DAYS = 30; // TẠM: ngày game Tông chủ vắng mặt
function sectRulesOf(g) { const r = (g && g.rules) || {}; return { open: !!r.open, minRealm: Math.max(0, Math.min(8, r.minRealm || 0)), taxPct: Math.max(0, Math.min(30, r.taxPct == null ? 10 : r.taxPct)) }; }
function sectLog(g, text) { if (!g) return; g.log = g.log || []; g.log.unshift({ day: worldClock().dayIndex, text }); if (g.log.length > 50) g.log.length = 50; }
function sectTechHas(p, id) { return !!(p && Array.isArray(p.sectTech) && p.sectTech.includes(id) && p.token && sectOfToken(p.token)); }
function sectTechMedMulOf(p) { return sectTechHas(p, 'tu_linh') ? 1.05 : 1; }
function isChapPhapHead(g, token) { return !!(g && g.depts && g.depts.chapphap === token); }
function sectChairedBy(g, token) { if (!g) return false; if (g.acting && g.acting.token === token) return true; const m = g.members.find((x) => x.token === token); return !!m && m.role === 'chu'; }""")

# --- hieu luc tong phap trong effStatsOf + thien ---
rep("""  // GĐ320: Đau xót (nhánh Thân bậc cuối) — bạn tri kỉ gục ngã: +15% công trong 30s""",
    """  // GĐ326: TÔNG PHÁP Tàng Kinh Các — bị động theo thành viên (rời tông mất hiệu lực)
  if (p && p.token && !p.isCompanion && Array.isArray(p.sectTech) && p.sectTech.length && sectOfToken(p.token)) {
    if (p.sectTech.includes('chien_y')) { eff.vatCong = Math.round((eff.vatCong || 0) * 1.03); eff.phapCong = Math.round((eff.phapCong || 0) * 1.03); }
    if (p.sectTech.includes('ho_the')) { eff.vatPhong = Math.round((eff.vatPhong || 0) * 1.03); eff.phapPhong = Math.round((eff.phapPhong || 0) * 1.03); }
    if (p.sectTech.includes('cap_hanh')) { eff.tocDo = Math.round((eff.tocDo || 0) * 1.03); }
  }
  // GĐ320: Đau xót (nhánh Thân bậc cuối) — bạn tri kỉ gục ngã: +15% công trong 30s""")
rep(""" * discMedMulOf(p) * bondMedMulOf(p)); bondProximityMeditate(p); // GĐ320 // GĐ318""",
    """ * discMedMulOf(p) * bondMedMulOf(p) * sectTechMedMulOf(p)); bondProximityMeditate(p); // GĐ326: + Tông Pháp Tụ Linh // GĐ320 // GĐ318""")
rep(""" * discMedMulOf(p) * bondMedMulOf(p); bondProximityMeditate(p); // GĐ320""",
    """ * discMedMulOf(p) * bondMedMulOf(p) * sectTechMedMulOf(p); bondProximityMeditate(p); // GĐ326 // GĐ320""")

# --- mac dinh truong moi trong ensureSectV2 ---
rep("""  g.questDay = today; g.quests = []; // GĐ323: bỏ nhiệm vụ tự sinh — tông nhận việc ở Bảng Ủy Thác (Đạo Quán)""",
    """  g.questDay = today; g.quests = []; // GĐ323: bỏ nhiệm vụ tự sinh — tông nhận việc ở Bảng Ủy Thác (Đạo Quán)
  // GĐ326: KẾ VỊ — chu vắng 14 ngày game → Phó kỳ cựu nhất giữ QUYỀN Tông chủ; 30 ngày → kế vị hẳn
  const chu326 = g.members.find((m) => m.role === 'chu');
  if (chu326) {
    if (playerByName(chu326.name)) { g.chuSeenDay = today; if (g.acting) { g.acting = null; sectLog(g, `Tông chủ ${chu326.name} trở lại — quyền điều hành tạm thời kết thúc.`); saveWorld(); } }
    else if (g.chuSeenDay == null) g.chuSeenDay = today;
    else {
      const absent = today - g.chuSeenDay;
      if (absent >= SECT_SUCCESSION_DAYS) {
        const cand = (g.acting && g.members.find((m) => m.token === g.acting.token)) || g.members.find((m) => m.role === 'pho');
        if (cand && cand.role !== 'chu') { cand.role = 'chu'; chu326.role = 'pho'; g.acting = null; g.chuSeenDay = today; sectLog(g, `${cand.name} KẾ VỊ Tông chủ — Tông chủ cũ ${chu326.name} vắng mặt ${absent} ngày game.`); sectNotify(g, `🏯 ${cand.name} đã KẾ VỊ Tông chủ của “${g.name}” (Tông chủ cũ vắng mặt ${absent} ngày game).`); saveWorld(); }
      } else if (absent >= SECT_ACTING_DAYS && !g.acting) {
        const pho = g.members.find((m) => m.role === 'pho');
        if (pho) { g.acting = { token: pho.token, name: pho.name, sinceDay: today }; sectLog(g, `${pho.name} giữ QUYỀN Tông chủ (Tông chủ vắng ${absent} ngày game).`); sectNotify(g, `🏯 Tông chủ vắng mặt ${absent} ngày game — ${pho.name} tạm giữ QUYỀN Tông chủ của “${g.name}”.`); saveWorld(); }
      }
    }
  }""")

# --- thue viec tong trong completeActiveQuest + log ---
rep("""  g.activeQuests = (g.activeQuests || []).filter((x) => x !== q);
  g.fund = (g.fund || 0) + (q.rewardFund || 0);""",
    """  g.activeQuests = (g.activeQuests || []).filter((x) => x !== q);
  g.fund = (g.fund || 0) + (q.rewardFund || 0);
  // GĐ326: THUẾ VIỆC TÔNG — theo tông quy, taxPct% tiền thưởng việc chia đều cho thành viên đang ONLINE (phần còn lại nằm quỹ như cũ)
  { const rl326 = sectRulesOf(g); const rf326 = q.rewardFund || 0;
    if (rf326 > 0 && rl326.taxPct > 0) { const pool = Math.floor(rf326 * rl326.taxPct / 100); const ons = g.members.map((m) => playerByName(m.name)).filter(Boolean); const each = ons.length ? Math.floor(pool / ons.length) : 0;
      if (each > 0) { g.fund -= each * ons.length; for (const op of ons) { op.stones = (op.stones || 0) + each; persistPlayer(op); syncPlayerSocket(op); emitTo(op, 'notice', { text: `🏯 Chia thưởng việc tông “${q.title}”: +${each.toLocaleString('vi-VN')} LT (thuế tông quy ${rl326.taxPct}%).` }); } } }
  sectLog(g, `Hoàn thành việc “${q.title}” — quỹ +${(q.rewardFund || 0).toLocaleString('vi-VN')} LT, +${q.rewardUy || 0} Tông Uy.`);""")

# --- trang thai: directory + mySect dot 3 ---
rep("""  const directory = sects.map((g) => ({ id: g.id, name: g.name, intro: g.intro || '', count: g.members.length, leader: (g.members.find((m) => m.role === 'chu') || {}).name || '' }));""",
    """  const directory = sects.map((g) => { const rl = sectRulesOf(g); return { id: g.id, name: g.name, intro: g.intro || '', count: g.members.length, leader: (g.members.find((m) => m.role === 'chu') || {}).name || '', level: sectLevelOf(g), open: rl.open, minRealm: rl.minRealm, taxPct: rl.taxPct }; }); // GĐ326: + tông quy trong danh mục""")
rep("""    mySect.quests = (mine.activeQuests || []).map((q) => ({ key: q.ref, name: q.title, giver: q.giver, type: q.type, itemId: q.itemId || null, target: q.target, progress: q.progress || 0, done: false, rewardFund: q.rewardFund || 0, rewardUy: q.rewardUy || 0 })); // GĐ323: việc Bảng Ủy Thác đang làm""",
    """    mySect.quests = (mine.activeQuests || []).map((q) => ({ key: q.ref, name: q.title, giver: q.giver, type: q.type, itemId: q.itemId || null, target: q.target, progress: q.progress || 0, done: false, rewardFund: q.rewardFund || 0, rewardUy: q.rewardUy || 0 })); // GĐ323: việc Bảng Ủy Thác đang làm
    // GĐ326: tông quy + nhật ký + kế vị + tông pháp
    mySect.rules = sectRulesOf(mine);
    mySect.log = (mine.log || []).slice(0, 15);
    mySect.acting = mine.acting ? { name: mine.acting.name } : null;
    mySect.canChair = sectChairedBy(mine, token);
    mySect.isChapPhap = isChapPhapHead(mine, token);
    mySect.techs = SECT_TECH.map((t) => ({ id: t.id, name: t.name, cost: t.cost, desc: t.desc, learned: (p.sectTech || []).includes(t.id) }));
    mySect.members = mySect.members.map((m) => ({ ...m, muted: !!((mine.muted || {})[m.token] > worldClock().totalMinutes), chapPhap: isChapPhapHead(mine, m.token) }));""")

io.open(P, 'w', encoding='utf-8').write(s)
print('gd326a OK')
