# GĐ323a: BẢNG ỦY THÁC — kho ủy thác + persist + việc NPC ngày + việc đang làm của tông + hook tiến độ + hết hạn.
import io
P = 'server/index.js'
s = io.open(P, encoding='utf-8').read()
def rep(old, new, n=1):
    global s
    assert s.count(old) == n, 'anchor %dx: %s' % (s.count(old), old[:70])
    s = s.replace(old, new)

# 1) kho ủy thác toàn server
rep("""let sectWars = []; // GĐ302: các cuộc tông chiến (persist cùng world save)""",
    """let sectWars = []; // GĐ302: các cuộc tông chiến (persist cùng world save)
let commissions = []; // GĐ323: ủy thác người chơi/Admin treo ở Bảng Ủy Thác (persist cùng world save)""")

# 2) nạp file + snap + nạp cloud
rep("""      if (Array.isArray(w.sectWars)) sectWars = w.sectWars; // GĐ302""",
    """      if (Array.isArray(w.sectWars)) sectWars = w.sectWars; // GĐ302
      if (Array.isArray(w.commissions)) commissions = w.commissions; // GĐ323""")
rep("""sects, sectWars, broadcastMails, discTaken }""",
    """sects, sectWars, broadcastMails, discTaken, commissions } // GĐ323: + commissions""")
rep("""        if (Array.isArray(wDoc.sectWars)) sectWars = wDoc.sectWars; // GĐ308: bổ sung — khối cloud từng thiếu sectWars/broadcastMails/gardenPlants (chỉ có ở bộ nạp file) khiến dữ liệu world mất sau restart trên Render""",
    """        if (Array.isArray(wDoc.sectWars)) sectWars = wDoc.sectWars; // GĐ308: bổ sung — khối cloud từng thiếu sectWars/broadcastMails/gardenPlants (chỉ có ở bộ nạp file) khiến dữ liệu world mất sau restart trên Render
        if (Array.isArray(wDoc.commissions)) commissions = wDoc.commissions; // GĐ323""")

# 3) ensureSectV2: việc đang làm
rep("""  for (const b of g.buildings || []) if (!b.lv) b.lv = 1; // GĐ322: cấp công trình
  return g;
}""",
    """  for (const b of g.buildings || []) if (!b.lv) b.lv = 1; // GĐ322: cấp công trình
  if (!Array.isArray(g.activeQuests)) g.activeQuests = []; // GĐ323: việc bảng/ủy thác tông đang làm
  return g;
}""")

# 4) bỏ nhiệm vụ tông tự sinh mỗi ngày (thay bằng Bảng Ủy Thác)
rep("""  if (g.questDay === today && Array.isArray(g.quests)) return;
  const h = sectHash(g.id + ':' + today);
  g.questDay = today;
  g.quests = [
    { key: 'kill', name: 'Toàn tông diệt quái', target: 60 + (h % 41), progress: 0, done: false },
    { key: 'donate', name: 'Cả tông góp Linh thạch vào quỹ', target: 3000, progress: 0, done: false },
    { key: 'store', name: 'Cả tông gửi vật phẩm vào kho chung', target: 30, progress: 0, done: false },
  ];
}""",
    """  g.questDay = today; g.quests = []; // GĐ323: bỏ nhiệm vụ tự sinh — tông nhận việc ở Bảng Ủy Thác (Đạo Quán)
}""")

# 5) lõi bảng: chèn trước pushSectMembers
rep("""function pushSectMembers(g) { for (const m of g.members) { const op = playerByName(m.name); if (op) pushSectState(op); } }""",
    """// ===== GĐ323: BẢNG ỦY THÁC TÔNG MÔN (mọi số TẠM) =====
// Việc đến từ 3 nguồn: (1) NPC/thương nhân/tu sĩ vô tông treo mỗi ngày (tất định theo ngày),
// (2) NGƯỜI CHƠI treo ủy thác thật — ký quỹ Linh thạch lúc đăng, tông làm xong thì quỹ nhận tiền,
//     vật phẩm thu thập gửi về người đăng qua thư; (3) ADMIN (GM) ghim việc sự kiện.
// Tông chủ/Phó tới bảng (Ban Lão ở sân Đạo Quán) nhận việc -> đưa xuống panel cho cả tông cùng làm.
const BOARD_ACTIVE_CAP = 2; // mỗi tông tối đa 2 việc bảng cùng lúc
const BOARD_POST_MAX = 3; // mỗi người tối đa 3 ủy thác đang treo
const BOARD_EXPIRE_DAYS = 3; // ủy thác hết hạn sau 3 ngày game
const BOARD_COMM_UY = 10; // Tông Uy khi hoàn thành ủy thác người chơi
const BOARD_GIVERS = ['Trưởng Làng', 'Chủ Tiệm Đan', 'Chủ Tiệm Nguyên Liệu', 'Chủ Tiệm Thảo Dược', 'Thương Nhân Lưu Động', 'Tu sĩ vô tông Vân Du', 'Tu sĩ vô tông họ Liễu', 'Dược nông họ Trần', 'Ngư ông Bến Sông', 'Thợ săn già họ Triệu'];
const BOARD_COLLECT_ITEMS = ['linh_thao', 'thanh_thao', 'nanh_soi', 'canh_doi', 'da_quy', 'xuong_thu', 'thit_thu', 'tien_linh_chi', 'nanh_tinh', 'da_soi'];
function boardFarmKinds() { return Object.keys(MONSTER_TYPES).filter((k) => k !== 'trial' && !(MONSTER_TYPES[k] || {}).minChestGrade); }
function boardBossKinds() { return Object.keys(MONSTER_TYPES).filter((k) => (MONSTER_TYPES[k] || {}).minChestGrade); }
function boardOffers(day) {
  const kinds = boardFarmKinds(), bosses = boardBossKinds();
  const out = [];
  const kindsOf = ['kill', 'collect', 'kill', 'collect', 'donate', 'special'];
  for (let i = 0; i < 6; i++) {
    const h = sectHash('board:' + day + ':' + i);
    const type = kindsOf[i];
    const giver = BOARD_GIVERS[h % BOARD_GIVERS.length];
    if (type === 'kill') { const mk = kinds[h % kinds.length]; out.push({ key: 'npc:' + day + ':' + i, giver, type, monsterKind: mk, target: 20 + (h % 41), rewardFund: 800 + (h % 13) * 100, rewardUy: 15 + (h % 11), title: 'Trừ khử ' + ((MONSTER_TYPES[mk] || {}).name || mk) + ' hoành hành' }); }
    else if (type === 'collect') { const it = BOARD_COLLECT_ITEMS[h % BOARD_COLLECT_ITEMS.length]; out.push({ key: 'npc:' + day + ':' + i, giver, type, itemId: it, target: 10 + (h % 21), rewardFund: 700 + (h % 11) * 100, rewardUy: 15 + (h % 11), title: 'Thu mua ' + ((ITEMS[it] || {}).name || it) }); }
    else if (type === 'donate') { out.push({ key: 'npc:' + day + ':' + i, giver, type, target: 2000 + (h % 7) * 1000, rewardFund: 300, rewardUy: 25 + (h % 16), title: 'Quyên góp tu sửa đường làng, cầu cống' }); }
    else { const mk = bosses[h % bosses.length]; out.push({ key: 'npc:' + day + ':' + i, giver, type: 'special', monsterKind: mk, target: 1, rewardFund: 3000 + (h % 21) * 100, rewardUy: 35 + (h % 16), title: 'Truy lùng ' + ((MONSTER_TYPES[mk] || {}).name || mk) }); }
  }
  return out;
}
function mailToToken(token, mail) { // GĐ323: gửi thư cho người chơi (online hay offline đều nhận)
  const op = [...players.values()].find((x) => x && x.token === token && !x.isBot);
  if (op) { pushPersonalMail(op, mail); pushMailState(op); persistPlayer(op); return; }
  const rec = characters[token];
  if (rec) { if (!Array.isArray(rec.mails)) rec.mails = []; rec.mails.unshift(mail); if (rec.mails.length > 50) rec.mails.length = 50; saveCharacters(); }
}
function boardQuestView(q) { return { ref: q.ref, title: q.title, giver: q.giver, type: q.type, itemId: q.itemId || null, itemName: q.itemId ? ((ITEMS[q.itemId] || {}).name || q.itemId) : null, monsterName: q.monsterKind ? ((MONSTER_TYPES[q.monsterKind] || {}).name || q.monsterKind) : null, target: q.target, progress: q.progress || 0, rewardFund: q.rewardFund || 0, rewardUy: q.rewardUy || 0, commId: q.commId || null, daysLeft: q.expiresDay - worldClock().dayIndex }; }
function commView(c, p) { return { id: c.id, posterName: c.posterName, gm: !!c.gm, title: c.title, type: c.type, itemId: c.itemId || null, itemName: c.itemId ? ((ITEMS[c.itemId] || {}).name || c.itemId) : null, monsterName: c.monsterKind ? ((MONSTER_TYPES[c.monsterKind] || {}).name || c.monsterKind) : null, target: c.target, progress: c.type === 'collect' ? (c.delivered || 0) : (c.progress || 0), escrow: c.escrow || 0, rewardFund: c.rewardFund || 0, rewardUy: c.rewardUy || 0, sectName: c.sectId ? ((sects.find((x) => x.id === c.sectId) || {}).name || null) : null, mine: !!p && c.poster === p.token, daysLeft: c.expiresDay - worldClock().dayIndex }; }
function boardStateFor(p) {
  const day = worldClock().dayIndex;
  const g = sectOfToken(p.token); if (g) ensureSectV2(g);
  const me = g ? g.members.find((m) => m.token === p.token) : null;
  const bn = NPC_BY_ID['npc_banguythac'];
  const atBoard = !!bn && mapOf(p) === HOME_MAP && Math.hypot(p.x - bn.x, p.y - bn.y) <= 240;
  return {
    atBoard, canLead: !!me && SECT_RANK[me.role] >= 2, isGM: GM_NAMES.includes((p.name || '').toLowerCase()),
    offers: boardOffers(day).map((o) => ({ ...o, itemName: o.itemId ? ((ITEMS[o.itemId] || {}).name || o.itemId) : null, monsterName: o.monsterKind ? ((MONSTER_TYPES[o.monsterKind] || {}).name || o.monsterKind) : null, takenByMe: !!g && g.activeQuests.some((q) => q.ref === o.key) })),
    commissions: commissions.filter((c) => c.expiresDay >= day).map((c) => commView(c, p)),
    active: g ? g.activeQuests.map(boardQuestView) : [],
    activeCap: BOARD_ACTIVE_CAP,
    monsters: boardFarmKinds().map((k) => ({ kind: k, name: (MONSTER_TYPES[k] || {}).name || k })),
    myStone: p.stones || 0,
  };
}
function pushBoardState(p) { if (p) emitTo(p, 'board_state', boardStateFor(p)); }
function pushBoardToSect(g) { if (!g) return; for (const m of g.members) { const op = playerByName(m.name); if (op) pushBoardState(op); } }
function completeActiveQuest(g, q) {
  g.activeQuests = (g.activeQuests || []).filter((x) => x !== q);
  g.fund = (g.fund || 0) + (q.rewardFund || 0);
  for (const m of g.members) m.contrib = (m.contrib || 0) + 25;
  if (q.rewardUy) sectUyAdd(g, q.rewardUy);
  sectNotify(g, `📋 Hoàn thành việc “${q.title}” (${q.giver}) — quỹ +${(q.rewardFund || 0).toLocaleString('vi-VN')} LT, +${q.rewardUy || 0} Tông Uy, mọi thành viên +25 Tông Cống!`);
  if (q.commId) settleCommComplete(g, q);
  saveWorld(); pushSectStateEveryone(); pushBoardToSect(g);
}
function settleCommComplete(g, q) {
  const ix = commissions.findIndex((x) => x.id === q.commId); if (ix < 0) return;
  const c = commissions[ix]; commissions.splice(ix, 1);
  if (c.gm) { g.fund = (g.fund || 0) + (c.rewardFund || 0); mailToToken(c.poster, { id: newMailId(), from: 'Bảng Ủy Thác', title: '📋 Việc Admin đã có tông hoàn thành', body: `Tông “${g.name}” đã hoàn thành việc “${c.title}”.`, stones: 0, items: {}, at: Date.now(), read: false, claimed: false }); return; }
  if (c.type === 'kill') { g.fund = (g.fund || 0) + (c.escrow || 0); mailToToken(c.poster, { id: newMailId(), from: 'Bảng Ủy Thác', title: `📋 Ủy thác hoàn thành: ${c.title}`, body: `Tông “${g.name}” đã hoàn thành ủy thác của bạn. Toàn bộ ký quỹ ${(c.escrow || 0).toLocaleString('vi-VN')} LT đã chuyển vào quỹ của tông.`, stones: 0, items: {}, at: Date.now(), read: false, claimed: false }); }
  else { mailToToken(c.poster, { id: newMailId(), from: 'Bảng Ủy Thác', title: `📦 Ủy thác hoàn thành: ${c.title}`, body: `Tông “${g.name}” đã thu thập đủ ${c.delivered || 0} × ${((ITEMS[c.itemId] || {}).name || c.itemId)}. Vật phẩm đính kèm thư này; phần ký quỹ còn thừa ${(c.escrow || 0).toLocaleString('vi-VN')} LT cũng hoàn lại cho bạn.`, stones: c.escrow || 0, items: c.delivered > 0 ? { [c.itemId]: c.delivered } : {}, at: Date.now(), read: false, claimed: false }); }
}
function advanceBoardWork(p, ev) { // tiến độ gộp cho việc bảng của tông người chơi
  const g = sectOfToken(p.token); if (!g) return;
  ensureSectV2(g);
  for (const q of [...g.activeQuests]) {
    let grew = false;
    if (ev.kill && q.type === 'kill' && q.monsterKind === ev.kind) { q.progress = (q.progress || 0) + 1; grew = true; }
    else if (ev.kill && q.type === 'special' && ev.special && q.monsterKind === ev.kind) { q.progress = (q.progress || 0) + 1; grew = true; }
    else if (ev.donate && q.type === 'donate') { q.progress = Math.min(q.target, (q.progress || 0) + ev.donate); grew = true; }
    if (!grew) continue;
    if (q.commId) { const c = commissions.find((x) => x.id === q.commId); if (c && q.type !== 'collect') c.progress = q.progress; }
    if ((q.progress || 0) >= q.target) completeActiveQuest(g, q);
    else { saveWorld(); pushSectStateEveryone(); pushBoardToSect(g); }
  }
}
setInterval(() => { // GĐ323: dọn ủy thác/việc hết hạn mỗi 60s
  try {
    const day = worldClock().dayIndex;
    for (const c of [...commissions]) {
      if (c.expiresDay >= day) continue;
      commissions = commissions.filter((x) => x.id !== c.id);
      const g = c.sectId ? sects.find((x) => x.id === c.sectId) : null;
      if (g) { ensureSectV2(g); g.activeQuests = g.activeQuests.filter((q) => q.commId !== c.id); sectNotify(g, `📋 Ủy thác “${c.title}” của ${c.posterName} đã HẾT HẠN — việc bị gỡ khỏi danh sách của tông.`); }
      if (!c.gm) {
        let refund = c.escrow || 0; const items = {};
        if (c.type === 'collect' && (c.delivered || 0) > 0) items[c.itemId] = c.delivered;
        if (c.type === 'kill' && g && (c.progress || 0) > 0 && c.target > 0) { const paid = Math.floor((c.escrow || 0) * Math.min(1, (c.progress || 0) / c.target)); if (paid > 0) { g.fund = (g.fund || 0) + paid; refund -= paid; } }
        mailToToken(c.poster, { id: newMailId(), from: 'Bảng Ủy Thác', title: `📋 Ủy thác hết hạn: ${c.title}`, body: `Ủy thác của bạn đã hết hạn.${(c.delivered || 0) > 0 ? ` Phần đã thu thập được ${(c.delivered || 0)} món gửi kèm thư này.` : ''}${refund > 0 ? ` Hoàn lại ký quỹ ${refund.toLocaleString('vi-VN')} LT.` : ''}`, stones: Math.max(0, refund), items, at: Date.now(), read: false, claimed: false });
      }
      saveWorld(); if (g) { pushSectStateEveryone(); pushBoardToSect(g); }
    }
    for (const g of sects) { ensureSectV2(g); const before = g.activeQuests.length; g.activeQuests = g.activeQuests.filter((q) => q.commId || q.expiresDay >= day); if (g.activeQuests.length !== before) { sectNotify(g, '📋 Một việc trên Bảng Ủy Thác đã hết hạn và bị gỡ.'); saveWorld(); pushSectStateEveryone(); } }
  } catch (e) { /* nhịp dọn không được làm sập server */ }
}, 60000);
function pushSectMembers(g) { for (const m of g.members) { const op = playerByName(m.name); if (op) pushSectState(op); } }""")

# 6) hook tiến độ: giết quái / góp quỹ / bỏ hook gửi kho
rep("""  advanceSectQuest(player, 'kill', 1); // GĐ266: tiến độ gộp nhiệm vụ tông""",
    """  advanceBoardWork(player, { kill: true, kind: target.kind, special: isSpecialMonster(target) }); // GĐ323: tiến độ gộp việc Bảng Ủy Thác""")
rep("""    advanceSectQuest(player, 'donate', n);""",
    """    advanceBoardWork(player, { donate: n }); // GĐ323""")
rep("""    advanceSectQuest(player, 'store', qty);
""", """""")

# 7) sectStateFor: mySect.quests = việc đang làm
rep("""    mySect.quests = (mine.quests || []).map((q) => ({ key: q.key, name: q.name, target: q.target, progress: q.progress || 0, done: !!q.done }));""",
    """    mySect.quests = (mine.activeQuests || []).map((q) => ({ key: q.ref, name: q.title, giver: q.giver, type: q.type, itemId: q.itemId || null, target: q.target, progress: q.progress || 0, done: false, rewardFund: q.rewardFund || 0, rewardUy: q.rewardUy || 0 })); // GĐ323: việc Bảng Ủy Thác đang làm""")

io.open(P, 'w', encoding='utf-8').write(s)
print('gd323a OK')
