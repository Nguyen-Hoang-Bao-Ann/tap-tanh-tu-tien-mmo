# GĐ321c: handlers kết lại duyên xưa / hồi đáp / tha mạng / cho ăn + nhánh cho quái.
import io
P = 'server/index.js'
s = io.open(P, encoding='utf-8').read()
def rep(old, new, n=1):
    global s
    assert s.count(old) == n, 'anchor %dx: %s' % (s.count(old), old[:70])
    s = s.replace(old, new)

HANDLERS = """  socket.on('bond_reform', (data) => { // GĐ321: KẾT LẠI duyên xưa / ĐỐI MẶT nợ cũ (khôi phục thấp hơn kiếp trước 1 bậc)
    if (!player || !data) return;
    const key = String(data.key || '');
    const pb = pastBondOf(player, key);
    if (!pb) { socket.emit('interact_error', { message: 'Sổ kiếp trước không còn mối này.' }); return; }
    const R = restoredBondOf(pb.score, pb.branch);
    const doneText = (who) => R.score >= 0 ? `💞 Duyên xưa kết lại với ${who} — quan hệ khôi phục ở mức ${bondTierNameFor(player, key, R.score, R.branch)} (thấp hơn kiếp trước một bậc).` : `🥀 Bạn đối mặt nợ cũ với ${who} — món nợ khôi phục ở mức ${bondTierNameFor(player, key, R.score, R.branch)}.`;
    if (key.startsWith('n:')) {
      const npcId = key.slice(2); const def = NPC_BY_ID[npcId];
      if (!def || mapOf(player) !== HOME_MAP || Math.hypot(player.x - def.x, player.y - def.y) > 220) { socket.emit('interact_error', { message: `Phải đứng gần ${pb.name} mới đối mặt được chuyện kiếp trước.` }); return; }
      if (!player.affinity) player.affinity = {};
      player.affinity[npcId] = R.score;
      if (!player.bonds) player.bonds = {};
      const e = player.bonds[key] || (player.bonds[key] = { score: 0, branch: null, pick: null, gainDay: -1, gainAmt: 0, name: pb.name });
      e.branch = R.branch;
      dropPastBond(player, key);
      persistPlayer(player); syncChar(socket, player);
      socket.emit('notice', { text: doneText(pb.name) });
      return;
    }
    if (key.startsWith('m:')) {
      const kind = key.slice(2);
      let near = false; for (const m of monsters.values()) { if (m.kind === kind && isSpecialMonster(m) && mapOf(m) === mapOf(player) && Math.hypot(player.x - m.x, player.y - m.y) <= 320) { near = true; break; } }
      if (!near) { socket.emit('interact_error', { message: 'Phải tới gần cá thể đặc biệt của loài đó mới kết lại được.' }); return; }
      const e = bondEntryMonster(player, kind, pb.name);
      e.score = R.score; e.branch = R.branch;
      dropPastBond(player, key);
      persistPlayer(player); syncChar(socket, player);
      socket.emit('notice', { text: doneText(pb.name) });
      return;
    }
    if (key.startsWith('p:')) {
      const other = playerByToken(key.slice(2));
      if (!other || other.isCompanion) { socket.emit('interact_error', { message: 'Người ấy lúc này không tại thế (chưa online) — cả hai cùng có mặt mới kết lại được.' }); return; }
      if (!Array.isArray(other.reformIn)) other.reformIn = [];
      if (other.reformIn.some((r) => r.fromKey === player.token)) { socket.emit('interact_error', { message: 'Đã gửi lời hẹn kết lại rồi — chờ người ấy hồi đáp.' }); return; }
      other.reformIn.push({ fromKey: player.token, fromName: player.name });
      persistPlayer(other); const os = io.sockets.sockets.get(other.id); if (os) syncChar(os, other);
      emitNoticeTo(other, `💞 ${player.name} nói rằng hai người từng có duyên/nợ từ kiếp trước và muốn kết lại. Mở 💞 Duyên Nợ — Sổ kiếp trước để hồi đáp.`);
      socket.emit('notice', { text: `💞 Đã gửi lời hẹn kết lại duyên xưa tới ${other.name}.` });
      return;
    }
  });
  socket.on('bond_reform_respond', (data) => { // GĐ321: hồi đáp lời hẹn kết lại (cần cả hai đồng ý)
    if (!player || !data) return;
    const fromKey = String(data.fromKey || '');
    const list = Array.isArray(player.reformIn) ? player.reformIn : [];
    const ix = list.findIndex((r) => r.fromKey === fromKey);
    if (ix < 0) return;
    list.splice(ix, 1);
    const other = playerByToken(fromKey);
    if (!data.accept) { persistPlayer(player); syncChar(socket, player); if (other) emitNoticeTo(other, `💞 ${player.name} chưa sẵn lòng kết lại chuyện kiếp trước với bạn.`); return; }
    const mine = pastBondOf(player, 'p:' + fromKey);
    const theirs = other ? pastBondOf(other, 'p:' + player.token) : null;
    const src = mine || theirs;
    if (!src) { socket.emit('interact_error', { message: 'Sổ kiếp trước của cả hai đều không còn mối này.' }); persistPlayer(player); syncChar(socket, player); return; }
    const R = restoredBondOf(src.score, src.branch);
    const e1 = bondEntryOf(player, 'p:' + fromKey); e1.score = R.score; e1.branch = R.branch; e1.pick = null; e1.theirPick = null; if (other) e1.name = other.name;
    dropPastBond(player, 'p:' + fromKey);
    persistPlayer(player); syncChar(socket, player);
    if (other) {
      const e2 = bondEntryOf(other, 'p:' + player.token); e2.score = R.score; e2.branch = R.branch; e2.pick = null; e2.theirPick = null; e2.name = player.name;
      dropPastBond(other, 'p:' + player.token);
      persistPlayer(other); const os = io.sockets.sockets.get(other.id); if (os) syncChar(os, other);
      emitNoticeTo(other, `💞 Duyên nợ kiếp trước giữa bạn và ${player.name} đã kết lại ở mức ${bondTierNameFor(other, 'p:' + player.token, R.score, R.branch)} (thấp hơn kiếp trước một bậc).`);
    } else {
      const rec = characters[fromKey];
      if (rec) { if (!rec.bonds) rec.bonds = {}; const e2 = rec.bonds['p:' + player.token] || (rec.bonds['p:' + player.token] = { score: 0, branch: null, pick: null, gainDay: -1, gainAmt: 0, name: player.name }); e2.score = R.score; e2.branch = R.branch; if (rec.soul && Array.isArray(rec.soul.pastBonds)) rec.soul.pastBonds = rec.soul.pastBonds.filter((x) => x.key !== 'p:' + player.token); saveCharacters(); }
    }
    socket.emit('notice', { text: `💞 Duyên nợ kiếp trước với ${e1.name || fromKey} đã kết lại ở mức ${bondTierNameFor(player, 'p:' + fromKey, R.score, R.branch)} (thấp hơn kiếp trước một bậc).` });
  });
  socket.on('bond_spare', (data) => { // GĐ321: THA MẠNG quái đặc biệt đang hấp hối (<10% máu) -> +300 ân cứu mạng
    if (!player || !data) return;
    const m = monsters.get(String(data.monsterId || ''));
    if (!m || mapOf(m) !== mapOf(player) || !isSpecialMonster(m)) { socket.emit('interact_error', { message: 'Chỉ tha được cá thể đặc biệt (trùm / quái hiếm ✦).' }); return; }
    if (Math.hypot(player.x - m.x, player.y - m.y) > 260) { socket.emit('interact_error', { message: 'Lại gần con quái đang hấp hối mới tha được.' }); return; }
    if (m.hp > m.maxHp * 0.1) { socket.emit('interact_error', { message: `${m.name} còn khỏe — chỉ tha được khi nó dưới 10% máu.` }); return; }
    monsters.delete(m.id); // nó rút lui — không rơi đồ, không tính hạ gục
    const d = addBondMonster(player, m, 300, {});
    persistPlayer(player); syncChar(socket, player);
    socket.emit('notice', { text: `🕊️ Bạn thu tay, tha mạng cho ${m.name}. Nó nhìn bạn một lúc rồi rút vào bóng tối. (+${d} thiện cảm với loài này)` });
  });
  socket.on('bond_feed', (data) => { // GĐ321: cho quái đặc biệt ăn món nó thích -> +25 (trần lặp/ngày)
    if (!player || !data) return;
    const m = monsters.get(String(data.monsterId || ''));
    if (!m || mapOf(m) !== mapOf(player) || !isSpecialMonster(m)) { socket.emit('interact_error', { message: 'Chỉ cho cá thể đặc biệt (trùm / quái hiếm ✦) ăn được.' }); return; }
    if (Math.hypot(player.x - m.x, player.y - m.y) > 260) { socket.emit('interact_error', { message: 'Lại gần nó mới cho ăn được.' }); return; }
    const food = monsterLikedFood(m.kind);
    if (!((player.inventory || {})[food] > 0)) { socket.emit('interact_error', { message: `${m.name} hếch mũi ngửi quanh… nó chỉ chực chờ món ${(ITEMS[food] && ITEMS[food].name) || food} thôi. (Bạn không mang theo món đó)` }); return; }
    player.inventory[food] -= 1; if (player.inventory[food] <= 0) delete player.inventory[food];
    const d = addBondMonster(player, m, 25, { repeatable: true });
    persistPlayer(player); syncChar(socket, player);
    socket.emit('notice', { text: `🍖 Bạn ném ${(ITEMS[food] && ITEMS[food].name) || food} cho ${m.name}. Nó ăn ngon lành. (+${d} thiện cảm với loài này)` });
  });
  socket.on('bond_choose_branch', (data) => {"""

rep("""  socket.on('bond_choose_branch', (data) => {""", HANDLERS)

# nhánh cho quái trong bond_choose_branch (khóa ngay như NPC)
rep("""    if (key.startsWith('p:')) {
      const otherToken = key.slice(2);
      const e = bondEntryOf(player, key);""",
    """    if (key.startsWith('m:')) { // GĐ321: quái đặc biệt — người chơi chọn, phía kia nhận khi điểm đủ (khóa ngay như NPC)
      const e = (player.bonds || {})[key];
      if (!e || (e.score || 0) < 300) { socket.emit('interact_error', { message: 'Phải đạt Bạn thân (300) mới chọn được hướng quan hệ.' }); return; }
      if (e.branch) { socket.emit('interact_error', { message: 'Quan hệ này đã khóa nhánh — không đổi được.' }); return; }
      e.branch = branch;
      persistPlayer(player); syncChar(socket, player);
      socket.emit('notice', { text: `💞 Quan hệ với ${e.name || 'quái đặc biệt'} từ đây đi theo hướng ${branch === 'than' ? 'Thân tình (Tri kỉ → Huynh đệ/Tỷ muội)' : 'Tình cảm (Động lòng → Tri âm)'}. Nhánh đã khóa, không đổi lại được.` });
      return;
    }
    if (key.startsWith('p:')) {
      const otherToken = key.slice(2);
      const e = bondEntryOf(player, key);""")

io.open(P, 'w', encoding='utf-8').write(s)
print('gd321c OK')
