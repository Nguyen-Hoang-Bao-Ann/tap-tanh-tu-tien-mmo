# GĐ318c: handlers su do + tan quan he khi toa hoa
import io
P = '/home/hatch/workspace/tap-tanh-tu-tien-mmo/server/index.js'
s = io.open(P, encoding='utf-8').read()
def rep(old, new, n=1):
    global s
    assert s.count(old) == n, 'anchor %dx: %s' % (s.count(old), old[:70])
    s = s.replace(old, new)

HANDLERS = r'''
  // ===================== GĐ318: SƯ ĐỒ =====================
  socket.on('disciple_accept_npc', (data) => {
    if (!player || !data) return;
    const spot = DISC_SPOTS.find((x) => x.id === data.spotId);
    if (!spot) return;
    const day = worldClock().dayIndex;
    if (discTaken[spot.id] === day) { socket.emit('interact_error', { message: 'Thiếu niên này vừa được người khác nhận làm đệ tử rồi.' }); return; }
    if (Math.hypot(player.x - spot.x, player.y - spot.y) > 200) { socket.emit('interact_error', { message: 'Tới gần thiếu niên cầu sư để nhận đệ tử.' }); return; }
    if (!discipleMasterEligible(player)) { socket.emit('interact_error', { message: 'Muốn nhận đệ tử, bạn phải có tông môn (người chơi) và giữ chức Trưởng lão trở lên — hoặc tự lập tông môn riêng.' }); return; }
    if (discipleActiveCount(player) >= DISC_MAX) { socket.emit('interact_error', { message: `Bạn đang có ${DISC_MAX} đệ tử theo học — dạy cho thành tài bớt rồi nhận thêm.` }); return; }
    const cand = candidateFor(spot, day);
    const e = { type: 'npc', name: cand.name, tilt: cand.tilt, gender: cand.gender, level: 1, tamDac: 0, skills: [], lastPointDay: -1, medFrac: 0, hp: 0 };
    disciplesOf(player).push(e);
    player.counters = player.counters || {}; player.counters.disciples = (player.counters.disciples || 0) + 1;
    discTaken[spot.id] = day; saveWorld();
    spawnDisciple(player, disciplesOf(player).length - 1);
    persistPlayer(player); syncChar(socket, player);
    socket.emit('notice', { text: `🎓 Bạn nhận ${cand.name} (thiên hướng ${CLASSES[cand.tilt]?.name || cand.tilt}) làm đệ tử! Dắt theo săn quái, thiền cùng và chỉ điểm mỗi ngày để đệ tử tích Tâm đắc lên cấp.` });
  });
  socket.on('disciple_invite', (data) => {
    if (!player || !data) return;
    if (!discipleMasterEligible(player)) { socket.emit('interact_error', { message: 'Muốn nhận đệ tử, bạn phải có tông môn (người chơi) và giữ chức Trưởng lão trở lên — hoặc tự lập tông môn riêng.' }); return; }
    if (discipleActiveCount(player) >= DISC_MAX) { socket.emit('interact_error', { message: `Bạn đang có ${DISC_MAX} đệ tử theo học.` }); return; }
    const name = String(data.name || '').trim();
    const key = charKeyByName(name) || Object.keys(characters).find((k) => characters[k] && String(characters[k].name || '').toLowerCase() === name.toLowerCase());
    if (!key) { socket.emit('interact_error', { message: `Không tìm thấy nhân vật "${name}".` }); return; }
    if (key === player.token) { socket.emit('interact_error', { message: 'Không thể tự nhận mình làm đệ tử.' }); return; }
    const rec = characters[key];
    if (!rec || rec.dead) { socket.emit('interact_error', { message: `${name} không còn tại thế.` }); return; }
    if (player.masterInfo && player.masterInfo.key === key) { socket.emit('interact_error', { message: 'Không thể nhận chính sư phụ của mình làm đệ tử.' }); return; }
    if (rec.masterInfo) { socket.emit('interact_error', { message: `${rec.name} đã có sư phụ rồi — quan hệ sư đồ là vĩnh viễn.` }); return; }
    if (disciplesOf(player).some((e) => e.type === 'player' && e.key === key)) { socket.emit('interact_error', { message: `${rec.name} đã là đệ tử của bạn.` }); return; }
    const tp = playerByName(rec.name);
    const invTarget = tp && tp.token === key ? tp : null;
    const invList = invTarget ? (invTarget.discipleInvites = invTarget.discipleInvites || []) : (rec.discipleInvites = Array.isArray(rec.discipleInvites) ? rec.discipleInvites : []);
    if (invList.some((v) => v.fromKey === player.token)) { socket.emit('interact_error', { message: `Đã có lời mời chờ ${rec.name} nhận lời.` }); return; }
    invList.push({ fromKey: player.token, fromName: player.name, at: Date.now() });
    if (invTarget) { persistPlayer(invTarget); if (!invTarget.isOffline) { const ts = io.sockets.sockets.get(invTarget.id); if (ts) { syncChar(ts, invTarget); ts.emit('notice', { text: `🎓 ${player.name} muốn nhận bạn làm đệ tử — mở Menu → Đệ tử để nhận lời.` }); } } }
    else saveCharacters();
    socket.emit('notice', { text: `🎓 Đã gửi lời mời nhận đệ tử tới ${rec.name}.` });
  });
  socket.on('disciple_respond', (data) => {
    if (!player || !data) return;
    const list = player.discipleInvites || [];
    const ix = list.findIndex((v) => v.fromKey === data.fromKey);
    if (ix < 0) return;
    const inv = list[ix]; list.splice(ix, 1);
    if (!data.accept) {
      persistPlayer(player); syncChar(socket, player);
      const mp = playerByName(inv.fromName); if (mp && mp.token === inv.fromKey) emitNoticeTo(mp, `🎓 ${player.name} đã từ chối lời mời làm đệ tử của bạn.`);
      return;
    }
    if (player.masterInfo) { socket.emit('interact_error', { message: 'Bạn đã có sư phụ — quan hệ sư đồ là vĩnh viễn, không đổi được.' }); persistPlayer(player); syncChar(socket, player); return; }
    const mRec = characters[inv.fromKey];
    if (!mRec || mRec.dead) { socket.emit('interact_error', { message: 'Sư phụ tương lai không còn tại thế.' }); persistPlayer(player); syncChar(socket, player); return; }
    const mp = playerByName(inv.fromName);
    const mLive = mp && mp.token === inv.fromKey ? mp : null;
    const mList = mLive ? disciplesOf(mLive) : (Array.isArray(mRec.disciples) ? mRec.disciples : (mRec.disciples = []));
    if (mList.filter((e) => !e.graduated).length >= DISC_MAX) { socket.emit('interact_error', { message: 'Sư phụ đã đủ đệ tử theo học.' }); persistPlayer(player); syncChar(socket, player); return; }
    if (mLive && !discipleMasterEligible(mLive)) { socket.emit('interact_error', { message: 'Người mời đã mất tư cách nhận đệ tử (không còn giữ chức Trưởng lão trở lên trong tông môn).' }); persistPlayer(player); syncChar(socket, player); return; }
    player.masterInfo = { key: inv.fromKey, name: inv.fromName, graduated: false };
    mList.push({ type: 'player', key: player.token, name: player.name, graduated: false, lastPointDay: -1 });
    if (mLive) { mLive.counters = mLive.counters || {}; mLive.counters.disciples = (mLive.counters.disciples || 0) + 1; persistPlayer(mLive); emitNoticeTo(mLive, `🎓 ${player.name} đã bái bạn làm sư phụ!`); const ms = io.sockets.sockets.get(mLive.id); if (ms) syncChar(ms, mLive); }
    else { mRec.counters = mRec.counters || {}; mRec.counters.disciples = (mRec.counters.disciples || 0) + 1; saveCharacters(); }
    persistPlayer(player); syncChar(socket, player);
    socket.emit('notice', { text: `🎓 Bạn đã bái ${inv.fromName} làm sư phụ. Quan hệ sư đồ là VĨNH VIỄN — chỉ sư phụ mới có thể trục xuất bạn.` });
    discipleGraduateCheck(player);
  });
  socket.on('disciple_expel', (data) => {
    if (!player || !data) return;
    const list = disciplesOf(player);
    const e = list[data.idx];
    if (!e) return;
    if (e.type === 'npc') {
      const ent = discipleEntityOf(player, data.idx);
      if (ent) players.delete(ent.id);
      list.splice(data.idx, 1);
      for (const q of players.values()) if (q.isDisciple && q.ownerId === player.id && q.discIdx > data.idx) q.discIdx -= 1;
      socket.emit('notice', { text: `🎓 Bạn đã trục xuất đệ tử ${e.name} khỏi sư môn.` });
    } else {
      const tp = playerByName(e.name);
      if (tp && tp.token === e.key && tp.masterInfo && tp.masterInfo.key === player.token) { tp.masterInfo = null; tp.chiDiemUntilMin = 0; persistPlayer(tp); emitNoticeTo(tp, `🎓 Sư phụ ${player.name} đã trục xuất bạn khỏi sư môn. Quan hệ sư đồ từ đây đoạn tuyệt.`); const ts = io.sockets.sockets.get(tp.id); if (ts) syncChar(ts, tp); }
      else { const rec = characters[e.key]; if (rec && rec.masterInfo && rec.masterInfo.key === player.token) { rec.masterInfo = null; rec.chiDiemUntilMin = 0; saveCharacters(); } }
      list.splice(data.idx, 1);
      socket.emit('notice', { text: `🎓 Bạn đã trục xuất đệ tử ${e.name} khỏi sư môn.` });
    }
    persistPlayer(player); syncChar(socket, player);
  });
  socket.on('disciple_point', (data) => {
    if (!player || !data) return;
    const e = disciplesOf(player)[data.idx];
    if (!e || e.graduated) return;
    const day = worldClock().dayIndex;
    if (e.lastPointDay === day) { socket.emit('interact_error', { message: 'Hôm nay đã chỉ điểm cho đệ tử này rồi (mỗi ngày 1 lần).' }); return; }
    if (e.type === 'npc') {
      e.lastPointDay = day;
      addDiscipleTamDac(player, e, DISC_POINT_GAIN);
      socket.emit('notice', { text: `🎓 Bạn giảng giải chỉ điểm cho ${e.name}: +${DISC_POINT_GAIN} Tâm đắc.` });
    } else {
      const tp = playerByName(e.name);
      if (!tp || tp.token !== e.key || tp.isOffline) { socket.emit('interact_error', { message: `${e.name} đang không ở trong thế giới.` }); return; }
      if (mapOf(tp) !== mapOf(player) || Math.hypot(tp.x - player.x, tp.y - player.y) > 300) { socket.emit('interact_error', { message: 'Chỉ điểm phải mặt đối mặt — tới đứng gần đệ tử (trong 300px, cùng bản đồ).' }); return; }
      e.lastPointDay = day;
      tp.chiDiemUntilMin = worldMinutes + 60;
      persistPlayer(tp);
      emitNoticeTo(tp, `🎓 Sư phụ ${player.name} chỉ điểm cho bạn: thiền định +20% trong 1 giờ tới!`);
      socket.emit('notice', { text: `🎓 Đã chỉ điểm cho đệ tử ${e.name} (buff thiền +20%, 1 giờ game).` });
    }
    persistPlayer(player); syncChar(socket, player);
  });
  socket.on('disciple_teach', (data) => {
    if (!player || !data) return;
    const e = disciplesOf(player)[data.idx];
    const sk = SKILL_BY_ID[data.skillId];
    if (!e || !sk) return;
    if (!(player.skills || []).includes(sk.id)) { socket.emit('interact_error', { message: 'Bạn chưa học công pháp này — không truyền được.' }); return; }
    if (e.type === 'npc') {
      if ((e.skills || []).length >= 4) { socket.emit('interact_error', { message: 'Đệ tử chỉ mang tối đa 4 công pháp.' }); return; }
      const fake = { realm: discipleRealmFor(e), tier: e.level >= 3 ? 1 : 9, linhCan: { mutations: [] }, stats: discipleStatsFor(player, e), classId: e.tilt, weaponId: weaponOf(e.tilt, null)?.id, skills: e.skills || [] };
      const err = skillTeachCheck(fake, sk);
      if (err) { socket.emit('interact_error', { message: err }); return; }
      e.skills = [...(e.skills || []), sk.id];
      socket.emit('notice', { text: `🎓 Đã truyền ${sk.name} cho đệ tử ${e.name} — đệ tử sẽ dùng chiêu này khi theo bạn chiến đấu.` });
    } else {
      const tp = playerByName(e.name);
      if (!tp || tp.token !== e.key || tp.isOffline) { socket.emit('interact_error', { message: `${e.name} đang không ở trong thế giới.` }); return; }
      if (mapOf(tp) !== mapOf(player) || Math.hypot(tp.x - player.x, tp.y - player.y) > 300) { socket.emit('interact_error', { message: 'Truyền công pháp phải mặt đối mặt — tới đứng gần đệ tử (trong 300px, cùng bản đồ).' }); return; }
      const err = skillTeachCheck(tp, sk);
      if (err) { socket.emit('interact_error', { message: err }); return; }
      tp.skills = [...(tp.skills || []), sk.id];
      persistPlayer(tp);
      const ts = io.sockets.sockets.get(tp.id); if (ts) syncChar(ts, tp);
      emitNoticeTo(tp, `🎓 Sư phụ ${player.name} truyền cho bạn công pháp ${sk.name} — đã lĩnh hội, mở Sổ công pháp để lắp ô chiêu!`);
      socket.emit('notice', { text: `🎓 Đã truyền ${sk.name} cho đệ tử ${e.name}.` });
    }
    persistPlayer(player); syncChar(socket, player);
  });
  socket.on('disciple_graduate', (data) => {
    if (!player || !data) return;
    const list = disciplesOf(player);
    const e = list[data.idx];
    if (!e || e.type !== 'npc') return;
    if (!(e.level >= 5 && (e.tamDac || 0) >= DISC_GRAD_NEED)) { socket.emit('interact_error', { message: `Đệ tử chưa đủ chín muồi để xuất sư (cần cấp 5 + ${DISC_GRAD_NEED} Tâm đắc).` }); return; }
    const ent = discipleEntityOf(player, data.idx);
    if (ent) players.delete(ent.id);
    list.splice(data.idx, 1);
    for (const q of players.values()) if (q.isDisciple && q.ownerId === player.id && q.discIdx > data.idx) q.discIdx -= 1;
    player.counters = player.counters || {}; player.counters.disciples = (player.counters.disciples || 0) + 1;
    addStones(player, 300); // TẠM: quà tạ ơn của đệ tử xuất sư
    player.inventory = player.inventory || {}; player.inventory.linh_thao = (player.inventory.linh_thao || 0) + 3;
    persistPlayer(player); syncChar(socket, player);
    socket.emit('notice', { text: `🎓 ${e.name} hành lễ tạ ơn rồi XUẤT SƯ, lên đường lập nghiệp! Quà tạ ơn: 300 Linh thạch + 3 Linh Thảo. Danh Sư tiến thêm một bước.` });
  });
'''
rep("  socket.on('sect_invite', (data) => {", HANDLERS + "  socket.on('sect_invite', (data) => {")

# Toa hoa: tan quan he su do hai phia
DISSOLVE = r'''  // GĐ318: tọa hóa -> quan hệ sư đồ tan (bên còn lại nhận tin)
  if (p.masterInfo) {
    const mk = p.masterInfo.key, mn = p.masterInfo.name;
    const mp = playerByName(mn);
    if (mp && mp.token === mk) { const l = disciplesOf(mp); const ix = l.findIndex((x) => x.type === 'player' && x.key === p.token); if (ix >= 0) l.splice(ix, 1); persistPlayer(mp); emitNoticeTo(mp, `🎓 Đệ tử ${p.name} của bạn đã tọa hóa — quan hệ sư đồ khép lại cùng kiếp này.`); }
    else { const rec = characters[mk]; if (rec && Array.isArray(rec.disciples)) { const ix = rec.disciples.findIndex((x) => x.type === 'player' && x.key === p.token); if (ix >= 0) { rec.disciples.splice(ix, 1); saveCharacters(); } } }
    p.masterInfo = null;
  }
  for (const e of disciplesOf(p).filter((x) => x.type === 'player')) {
    const tp = playerByName(e.name);
    if (tp && tp.token === e.key && tp.masterInfo && tp.masterInfo.key === p.token) { tp.masterInfo = null; persistPlayer(tp); emitNoticeTo(tp, `🎓 Sư phụ ${p.name} của bạn đã tọa hóa — quan hệ sư đồ khép lại cùng kiếp này.`); }
    else { const rec = characters[e.key]; if (rec && rec.masterInfo && rec.masterInfo.key === p.token) { rec.masterInfo = null; saveCharacters(); } }
  }
'''
rep("function finalizeSoulAtDeath(p, path) {\n  const sl = soulOf(p);",
"function finalizeSoulAtDeath(p, path) {\n" + DISSOLVE + "  const sl = soulOf(p);")
io.open(P, 'w', encoding='utf-8').write(s)
print('gd318c OK')
