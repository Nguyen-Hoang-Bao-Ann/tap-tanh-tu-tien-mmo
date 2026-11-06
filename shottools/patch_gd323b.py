# GĐ323b: NPC Ban Lão + hội thoại bảng + handlers board_* + trừ quỹ khi xong việc quyên góp.
import io
P = 'server/index.js'
s = io.open(P, encoding='utf-8').read()
def rep(old, new, n=1):
    global s
    assert s.count(old) == n, 'anchor %dx: %s' % (s.count(old), old[:70])
    s = s.replace(old, new)

# 1) NPC giữ bảng ở sân Đạo Quán
rep("""  { id: 'npc_quansu', name: 'Quản Sự Đạo Quán', role: 'Quầy Quản Lý', personality: 'Nghiêm cẩn', x: hs175(560), y: hs175(390), direction: 'down' }, // GĐ319: đầu mối khai tông""",
    """  { id: 'npc_quansu', name: 'Quản Sự Đạo Quán', role: 'Quầy Quản Lý', personality: 'Nghiêm cẩn', x: hs175(560), y: hs175(390), direction: 'down' }, // GĐ319: đầu mối khai tông
  { id: 'npc_banguythac', name: 'Ban Lão', role: 'Người giữ Bảng Ủy Thác', personality: 'Công khai', x: hs175(612), y: hs175(468), direction: 'down' }, // GĐ323: Bảng Ủy Thác tông môn""")

# 2) payload hội thoại: cờ bảng
rep("""      sectFoundInfo: npc.id === 'npc_quansu' ? sectFoundInfoFor(player) : null, // GĐ319: quy trình khai tông ở Quầy Quản Lý""",
    """      sectFoundInfo: npc.id === 'npc_quansu' ? sectFoundInfoFor(player) : null, // GĐ319: quy trình khai tông ở Quầy Quản Lý
      board: npc.id === 'npc_banguythac', // GĐ323: mở Bảng Ủy Thác""")

# 3) lời thoại của Ban Lão
rep("""        : npc.id === 'npc_bicanh_out'
        ? 'Cổng đá sau lưng từ từ khép lại. Bước qua cổng này là trở về sân Thanh Phong Môn, Làng Tân Thủ.'""",
    """        : npc.id === 'npc_bicanh_out'
        ? 'Cổng đá sau lưng từ từ khép lại. Bước qua cổng này là trở về sân Thanh Phong Môn, Làng Tân Thủ.'
        : npc.id === 'npc_banguythac'
        ? 'Lão phu giữ Bảng Ủy Thác này cho thiên hạ. Ai cần thuê người, cần thu mua vật liệu, cứ treo ủy thác lên bảng và ký quỹ Linh thạch — tông môn nào nhận việc, làm xong thì tiền trao cháo múc. Tông chủ các tông cũng tới đây nhận việc treo sẵn của làng, của thương nhân và của Thiên Cơ (Admin) nữa.'""")

# 4) xong việc quyên góp: tiền rời quỹ đi làm việc thiện (trừ đúng số đã góp)
rep("""function completeActiveQuest(g, q) {
  g.activeQuests = (g.activeQuests || []).filter((x) => x !== q);""",
    """function completeActiveQuest(g, q) {
  if (q.type === 'donate') g.fund = Math.max(0, (g.fund || 0) - Math.min(g.fund || 0, q.target)); // GĐ323: tiền quyên góp rời quỹ đi tu sửa làng
  g.activeQuests = (g.activeQuests || []).filter((x) => x !== q);""")

# 5) handlers — chèn trước khối GĐ267
rep("""  // ===== GĐ267: hội nghề — gia nhập / nộp nhiệm vụ / quầy hội =====""",
    """  // ===== GĐ323: BẢNG ỦY THÁC — xem/nhận/đăng/hủy/nộp đồ =====
  const boardGate = () => { const bn = NPC_BY_ID['npc_banguythac']; return bn && mapOf(player) === HOME_MAP && Math.hypot(player.x - bn.x, player.y - bn.y) <= 240; };
  socket.on('board_get', () => { if (player) pushBoardState(player); });
  socket.on('board_accept', (data) => {
    if (!player || !data) return;
    if (!boardGate()) { socket.emit('interact_error', { message: 'Muốn nhận việc phải tới Bảng Ủy Thác ở sân Đạo Quán (gặp Ban Lão).' }); return; }
    const g = sectOfToken(player.token); if (!g) { socket.emit('interact_error', { message: 'Bạn chưa có tông môn — việc trên bảng chỉ dành cho tông môn.' }); return; }
    ensureSectV2(g);
    const me = g.members.find((m) => m.token === player.token);
    if (SECT_RANK[me.role] < 2) { socket.emit('interact_error', { message: 'Từ Phó tông chủ trở lên mới nhận việc cho tông được.' }); return; }
    if (g.activeQuests.length >= BOARD_ACTIVE_CAP) { socket.emit('interact_error', { message: `Tông đang làm ${BOARD_ACTIVE_CAP} việc — xong bớt rồi nhận tiếp.` }); return; }
    const day = worldClock().dayIndex;
    const offer = boardOffers(day).find((o) => o.key === String(data.key || ''));
    if (!offer) { socket.emit('interact_error', { message: 'Việc này không còn trên bảng.' }); return; }
    if (g.activeQuests.some((q) => q.ref === offer.key)) return;
    g.activeQuests.push({ ref: offer.key, title: offer.title, giver: offer.giver, type: offer.type, monsterKind: offer.monsterKind || null, itemId: offer.itemId || null, target: offer.target, progress: 0, rewardFund: offer.rewardFund, rewardUy: offer.rewardUy, expiresDay: day + 2 });
    saveWorld(); pushSectStateEveryone(); pushBoardToSect(g);
    sectNotify(g, `📋 Tông ta đã nhận việc “${offer.title}” (${offer.giver}) từ Bảng Ủy Thác — cả tông cùng làm, xem tiến độ ở panel Tông môn!`, player.token);
    socket.emit('notice', { text: `📋 Đã nhận việc “${offer.title}” cho tông!` });
  });
  socket.on('board_accept_comm', (data) => {
    if (!player || !data) return;
    if (!boardGate()) { socket.emit('interact_error', { message: 'Muốn nhận ủy thác phải tới Bảng Ủy Thác ở sân Đạo Quán (gặp Ban Lão).' }); return; }
    const g = sectOfToken(player.token); if (!g) { socket.emit('interact_error', { message: 'Bạn chưa có tông môn — ủy thác chỉ dành cho tông môn nhận làm.' }); return; }
    ensureSectV2(g);
    const me = g.members.find((m) => m.token === player.token);
    if (SECT_RANK[me.role] < 2) { socket.emit('interact_error', { message: 'Từ Phó tông chủ trở lên mới nhận ủy thác cho tông được.' }); return; }
    if (g.activeQuests.length >= BOARD_ACTIVE_CAP) { socket.emit('interact_error', { message: `Tông đang làm ${BOARD_ACTIVE_CAP} việc — xong bớt rồi nhận tiếp.` }); return; }
    const c = commissions.find((x) => x.id === String(data.id || ''));
    if (!c || c.sectId) { socket.emit('interact_error', { message: 'Ủy thác này đã có tông khác nhận hoặc không còn.' }); return; }
    if (c.poster === player.token) { socket.emit('interact_error', { message: 'Không tự nhận ủy thác của chính mình được.' }); return; }
    c.sectId = g.id;
    g.activeQuests.push({ ref: 'comm:' + c.id, commId: c.id, title: c.title, giver: c.posterName, type: c.type, monsterKind: c.monsterKind || null, itemId: c.itemId || null, target: c.target, progress: c.type === 'collect' ? (c.delivered || 0) : (c.progress || 0), rewardFund: 0, rewardUy: c.gm ? (c.rewardUy || 0) : BOARD_COMM_UY, expiresDay: c.expiresDay });
    saveWorld(); pushSectStateEveryone(); pushBoardToSect(g);
    const poster = [...players.values()].find((x) => x && x.token === c.poster && !x.isBot); if (poster) { emitTo(poster, 'notice', { text: `📋 Tông “${g.name}” đã nhận ủy thác “${c.title}” của bạn!` }); pushBoardState(poster); }
    socket.emit('notice', { text: `📋 Đã nhận ủy thác “${c.title}” của ${c.posterName}!` });
  });
  socket.on('board_post', (data) => {
    if (!player || !data) return;
    if (!boardGate()) { socket.emit('interact_error', { message: 'Muốn treo ủy thác phải tới Bảng Ủy Thác ở sân Đạo Quán (gặp Ban Lão).' }); return; }
    const day = worldClock().dayIndex;
    if (commissions.filter((c) => c.poster === player.token && c.expiresDay >= day).length >= BOARD_POST_MAX) { socket.emit('interact_error', { message: `Mỗi người chỉ treo tối đa ${BOARD_POST_MAX} ủy thác cùng lúc.` }); return; }
    const type = String(data.type || '');
    const target = Math.floor(Number(data.target || 0));
    const pay = Math.floor(Number(data.pay || 0));
    if (pay < 100 || pay > 1000000) { socket.emit('interact_error', { message: 'Tiền công ký quỹ phải từ 100 tới 1.000.000 Linh thạch.' }); return; }
    if ((player.stones || 0) < pay) { socket.emit('interact_error', { message: `Không đủ Linh thạch ký quỹ (cần ${pay.toLocaleString('vi-VN')}, đang có ${(player.stones || 0).toLocaleString('vi-VN')}).` }); return; }
    let c = null;
    if (type === 'collect') {
      const itemId = String(data.itemId || '');
      if (!ITEMS[itemId] || itemId === 'lenh_bai_tong_mon' || itemId === 'tran_phap_khai_son') { socket.emit('interact_error', { message: 'Vật phẩm này không treo thu mua được.' }); return; }
      if (target < 1 || target > 200) { socket.emit('interact_error', { message: 'Số lượng thu mua từ 1 tới 200.' }); return; }
      c = { id: 'c' + Date.now().toString(36) + Math.floor(Math.random() * 999), poster: player.token, posterName: player.name, type, itemId, target, delivered: 0, escrow: pay, unit: Math.max(1, Math.floor(pay / target)), day, expiresDay: day + BOARD_EXPIRE_DAYS, sectId: null, gm: false, title: 'Thu mua ' + ((ITEMS[itemId] || {}).name || itemId) + ' ×' + target };
    } else if (type === 'kill') {
      const mk = String(data.monsterKind || '');
      if (!boardFarmKinds().includes(mk)) { socket.emit('interact_error', { message: 'Loài quái này không treo thuê săn được.' }); return; }
      if (target < 1 || target > 100) { socket.emit('interact_error', { message: 'Số lượng thuê săn từ 1 tới 100.' }); return; }
      c = { id: 'c' + Date.now().toString(36) + Math.floor(Math.random() * 999), poster: player.token, posterName: player.name, type, monsterKind: mk, target, progress: 0, escrow: pay, day, expiresDay: day + BOARD_EXPIRE_DAYS, sectId: null, gm: false, title: 'Thuê săn ' + ((MONSTER_TYPES[mk] || {}).name || mk) + ' ×' + target };
    } else return;
    player.stones -= pay; commissions.push(c);
    saveWorld(); pushBoardState(player);
    socket.emit('notice', { text: `📋 Đã treo ủy thác “${c.title}” — ký quỹ ${pay.toLocaleString('vi-VN')} LT, hạn ${BOARD_EXPIRE_DAYS} ngày game.` });
  });
  socket.on('board_gm_post', (data) => {
    if (!player || !data) return;
    if (!GM_NAMES.includes((player.name || '').toLowerCase())) { socket.emit('interact_error', { message: 'Chỉ Admin mới ghim việc Thiên Cơ được.' }); return; }
    if (!boardGate()) { socket.emit('interact_error', { message: 'Tới Bảng Ủy Thác ở sân Đạo Quán để ghim việc.' }); return; }
    const day = worldClock().dayIndex;
    const type = String(data.type || '');
    const target = Math.max(1, Math.min(500, Math.floor(Number(data.target || 0))));
    const rewardFund = Math.max(0, Math.min(1000000, Math.floor(Number(data.rewardFund || 0))));
    const rewardUy = Math.max(0, Math.min(500, Math.floor(Number(data.rewardUy || 0))));
    const title = String(data.title || '').slice(0, 60).trim();
    if (!title) { socket.emit('interact_error', { message: 'Việc Admin cần tiêu đề.' }); return; }
    let c = null;
    if (type === 'kill') { const mk = String(data.monsterKind || ''); if (!boardFarmKinds().includes(mk) && !boardBossKinds().includes(mk)) return; c = { id: 'g' + Date.now().toString(36), poster: player.token, posterName: '🔱 Admin', type: boardBossKinds().includes(mk) ? 'special' : 'kill', monsterKind: mk, target, progress: 0, escrow: 0, rewardFund, rewardUy, day, expiresDay: day + 30, sectId: null, gm: true, title }; }
    else if (type === 'collect') { const itemId = String(data.itemId || ''); if (!ITEMS[itemId]) return; c = { id: 'g' + Date.now().toString(36), poster: player.token, posterName: '🔱 Admin', type, itemId, target, delivered: 0, escrow: 0, unit: 0, rewardFund, rewardUy, day, expiresDay: day + 30, sectId: null, gm: true, title }; }
    else return;
    commissions.push(c); saveWorld(); pushBoardState(player);
    socket.emit('notice', { text: `🔱 Đã ghim việc Admin “${title}” lên Bảng Ủy Thác (30 ngày).` });
  });
  socket.on('board_cancel', (data) => {
    if (!player || !data) return;
    const ix = commissions.findIndex((x) => x.id === String(data.id || '') && x.poster === player.token);
    if (ix < 0) return;
    const c = commissions[ix];
    if (c.sectId) { socket.emit('interact_error', { message: 'Ủy thác đã có tông nhận làm — không hủy ngang được, chờ xong hoặc hết hạn.' }); return; }
    commissions.splice(ix, 1);
    if (!c.gm && (c.escrow || 0) > 0) player.stones = (player.stones || 0) + c.escrow;
    saveWorld(); pushBoardState(player);
    socket.emit('notice', { text: `📋 Đã gỡ ủy thác “${c.title}”${!c.gm && c.escrow ? ` — hoàn ký quỹ ${c.escrow.toLocaleString('vi-VN')} LT` : ''}.` });
  });
  socket.on('board_deposit', (data) => { // thành viên nộp vật phẩm cho việc thu mua của tông (làm ở đâu cũng được)
    if (!player || !data) return;
    const g = sectOfToken(player.token); if (!g) return;
    ensureSectV2(g);
    const q = g.activeQuests.find((x) => x.ref === String(data.ref || ''));
    if (!q || q.type !== 'collect' || !q.itemId) return;
    const want = Math.max(1, Math.floor(Number(data.qty || 1)));
    const have = (player.inventory && player.inventory[q.itemId]) || 0;
    const n = Math.min(want, have, q.target - (q.progress || 0));
    if (n <= 0) { socket.emit('interact_error', { message: have <= 0 ? `Bạn không có ${((ITEMS[q.itemId] || {}).name || q.itemId)} trong túi.` : 'Việc này đã đủ số lượng.' }); return; }
    player.inventory[q.itemId] -= n; if (player.inventory[q.itemId] <= 0) delete player.inventory[q.itemId];
    q.progress = (q.progress || 0) + n;
    if (q.commId) { const c = commissions.find((x) => x.id === q.commId); if (c) { c.delivered = (c.delivered || 0) + n; const pay = Math.min(c.escrow || 0, (c.unit || 0) * n); if (!c.gm && pay > 0) { c.escrow -= pay; g.fund = (g.fund || 0) + pay; } } }
    if ((q.progress || 0) >= q.target) completeActiveQuest(g, q); else { saveWorld(); pushSectStateEveryone(); pushBoardToSect(g); }
    syncPlayerSocket(player);
    socket.emit('notice', { text: `📦 Đã nộp ${n} × ${((ITEMS[q.itemId] || {}).name || q.itemId)} cho việc “${q.title}”.` });
  });

  // ===== GĐ267: hội nghề — gia nhập / nộp nhiệm vụ / quầy hội =====""")
io.open(P, 'w', encoding='utf-8').write(s)
print('gd323b OK')
