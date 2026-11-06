import io
P = 'server/index.js'
s = io.open(P, encoding='utf-8').read()
def rep(old, new, n=1):
    global s
    assert s.count(old) == n, 'anchor %dx: %s' % (s.count(old), old[:70])
    s = s.replace(old, new)

rep("""const SECT_ACTING_DAYS = 14, SECT_SUCCESSION_DAYS = 30; // TẠM: ngày game Tông chủ vắng mặt""",
    """const SECT_ACTING_DAYS = 14, SECT_SUCCESSION_DAYS = 30; // TẠM: ngày game Tông chủ vắng mặt
const SECT_REALM_IDS = ['pham', 'lk', 'tc', 'kd', 'na', 'ht', 'ph', 'dk', 'tn']; // thứ tự cảnh cho tông quy (khớp REALM_ORDER)""")

# --- nhat ky: cac diem ghi chinh ---
rep("""    sectNotify(g, `🏯 Tông môn thăng CẤP ${g.level}! (Tông Uy ${g.uy}) — trần thành viên ${sectMemberCapOf(g)}, kho ${sectWarehouseCapOf(g)} ô, lãnh địa tối đa ${sectTerritoryCapOf(g)}.`);""",
    """    sectNotify(g, `🏯 Tông môn thăng CẤP ${g.level}! (Tông Uy ${g.uy}) — trần thành viên ${sectMemberCapOf(g)}, kho ${sectWarehouseCapOf(g)} ô, lãnh địa tối đa ${sectTerritoryCapOf(g)}.`); sectLog(g, `Tông môn thăng CẤP ${g.level} (Tông Uy ${g.uy}).`);""")
rep("""      sectNotify(g, `🏯 ${player.name} đã gia nhập “${g.name}”!`, player.token);""",
    """      sectNotify(g, `🏯 ${player.name} đã gia nhập “${g.name}”!`, player.token); sectLog(g, `${player.name} gia nhập tông (nhận lời mời).`);""")
rep("""      sectNotify(g, `🏯 ${app.name} đã gia nhập “${g.name}”!`, app.token);""",
    """      sectNotify(g, `🏯 ${app.name} đã gia nhập “${g.name}”!`, app.token); sectLog(g, `${app.name} gia nhập tông (đơn được duyệt).`);""")
rep("""    sectNotify(g, `🏯 ${player.name} đã rời “${g.name}”.`);""",
    """    sectNotify(g, `🏯 ${player.name} đã rời “${g.name}”.`); sectLog(g, `${player.name} rời tông.`); saveWorld();""")
rep("""    t.role = data.role;""",
    """    t.role = data.role; sectLog(g, `${player.name} phong ${t.name} làm ${SECT_ROLES[data.role]}.`);""")

# --- Chấp Pháp: duyệt đơn + trục xuất đệ tử + cấm chat ---
rep("""    if (SECT_RANK[me.role] < 2) { socket.emit('interact_error', { message: 'Từ Phó tông chủ trở lên mới duyệt đơn.' }); return; }""",
    """    if (SECT_RANK[me.role] < 2 && !isChapPhapHead(g, player.token)) { socket.emit('interact_error', { message: 'Từ Phó tông chủ trở lên (hoặc Đường Chủ Chấp Pháp) mới duyệt đơn.' }); return; } // GĐ326: Chấp Pháp duyệt đơn""")
rep("""    const canKick = me.role === 'chu' || (me.role === 'pho' && SECT_RANK[t.role] < 2);""",
    """    const canKick = me.role === 'chu' || sectChairedBy(g, me.token) && SECT_RANK[t.role] < 3 || (me.role === 'pho' && SECT_RANK[t.role] < 2) || (isChapPhapHead(g, me.token) && t.role === 'detu'); // GĐ326: Quyền Tông chủ trục xuất dưới cấp Tông chủ; Chấp Pháp chỉ trục xuất Đệ tử""")
rep("""    sectNotify(g, `🏯 ${t.name} đã rời khỏi “${g.name}” (bị trục xuất).`, player.token);""",
    """    sectLog(g, `${t.name} bị ${player.name} trục xuất khỏi tông.`); sectNotify(g, `🏯 ${t.name} đã rời khỏi “${g.name}” (bị trục xuất).`, player.token);""")
rep("""    socket.emit('notice', { text: `🏯 Đã trục xuất ${t.name}.` });
  });""",
    """    socket.emit('notice', { text: `🏯 Đã trục xuất ${t.name}.` });
  });
  socket.on('sect_mute', (data) => { // GĐ326: cấm chat tông 1 ngày game — Tông chủ/Phó/Chấp Pháp
    if (!player || !data) return;
    const g = sectOfToken(player.token);
    if (!g) return;
    ensureSectV2(g);
    const me = g.members.find((m) => m.token === player.token);
    const t = g.members.find((m) => m.token === data.token);
    if (!t || t.token === player.token) return;
    const can = me.role === 'chu' || me.role === 'pho' || isChapPhapHead(g, me.token);
    if (!can || t.role === 'chu') { socket.emit('interact_error', { message: 'Bạn không có quyền cấm chat người này.' }); return; }
    g.muted = g.muted || {};
    g.muted[t.token] = worldClock().totalMinutes + 1440; // TẠM: 1 ngày game
    sectLog(g, `${t.name} bị ${player.name} cấm chat tông 1 ngày game.`);
    saveWorld(); pushSectMembers(g);
    const tp = playerByName(t.name);
    if (tp) emitTo(tp, 'notice', { text: `🏯 Bạn bị cấm chat kênh Tông môn của “${g.name}” trong 1 ngày game (Chấp Pháp xử lý).` });
    socket.emit('notice', { text: `🏯 Đã cấm chat ${t.name} 1 ngày game.` });
  });""")
rep("""      const g = sectOfToken(player.token);
      if (!g) { socket.emit('interact_error', { message: 'Bạn chưa có tông môn.' }); return; }""",
    """      const g = sectOfToken(player.token);
      if (!g) { socket.emit('interact_error', { message: 'Bạn chưa có tông môn.' }); return; }
      if ((g.muted || {})[player.token] > worldClock().totalMinutes) { socket.emit('interact_error', { message: 'Bạn đang bị cấm chat kênh Tông môn (Chấp Pháp xử lý — hết hạn sau tối đa 1 ngày game).' }); return; } // GĐ326""")

# --- Quyền Tông chủ dùng được phong chức + bổ nhiệm Đường Chủ ---
rep("""    if (me.role !== 'chu') { socket.emit('interact_error', { message: 'Chỉ Tông chủ mới phong chức.' }); return; }""",
    """    if (!sectChairedBy(g, player.token)) { socket.emit('interact_error', { message: 'Chỉ Tông chủ (hoặc Quyền Tông chủ) mới phong chức.' }); return; } // GĐ326""")
rep("""    if (me.role !== 'chu') { socket.emit('interact_error', { message: 'Chỉ Tông chủ mới bổ nhiệm Đường Chủ.' }); return; }""",
    """    if (!sectChairedBy(g, player.token)) { socket.emit('interact_error', { message: 'Chỉ Tông chủ (hoặc Quyền Tông chủ) mới bổ nhiệm Đường Chủ.' }); return; } // GĐ326""")

# --- tông quy: đặt quy + vào tông mở + cổng cảnh cho đơn xin ---
rep("""  socket.on('sect_apply', (data) => {""",
    """  socket.on('sect_rules_set', (data) => { // GĐ326: đặt tông quy (Tông chủ / Quyền Tông chủ)
    if (!player || !data) return;
    const g = sectOfToken(player.token);
    if (!g) return;
    ensureSectV2(g);
    if (!sectChairedBy(g, player.token)) { socket.emit('interact_error', { message: 'Chỉ Tông chủ (hoặc Quyền Tông chủ) mới đặt tông quy.' }); return; }
    g.rules = { open: !!data.open, minRealm: Math.max(0, Math.min(8, Number(data.minRealm) || 0)), taxPct: Math.max(0, Math.min(30, Number(data.taxPct) || 0)) };
    sectLog(g, `${player.name} đặt tông quy: ${g.rules.open ? 'MỞ cửa tự vào' : 'xét duyệt đơn'} · cảnh tối thiểu ${REALM_NAMES[SECT_REALM_IDS[g.rules.minRealm]] || ''} · thuế việc tông ${g.rules.taxPct}%.`);
    saveWorld(); pushSectMembers(g); pushSectState(player);
    socket.emit('notice', { text: '🏯 Đã lưu tông quy.' });
  });
  socket.on('sect_join', (data) => { // GĐ326: vào thẳng tông đang MỞ cửa theo tông quy
    if (!player || !data) return;
    if (sectOfToken(player.token)) { socket.emit('interact_error', { message: 'Bạn đã có tông môn.' }); return; }
    const g = sects.find((x) => x.id === data.sectId);
    if (!g) return;
    ensureSectV2(g); ensureSectDay(g);
    const rl = sectRulesOf(g);
    if (!rl.open) { socket.emit('interact_error', { message: `Tông “${g.name}” không mở cửa tự vào — hãy gửi đơn xin gia nhập.` }); return; }
    if ((REALM_ORDER[player.realm] ?? 0) < rl.minRealm) { socket.emit('interact_error', { message: `Tông “${g.name}” chỉ nhận từ cảnh ${REALM_NAMES[SECT_REALM_IDS[rl.minRealm]] || ''} trở lên.` }); return; }
    if (g.members.length >= sectMemberCapOf(g)) { socket.emit('interact_error', { message: `Tông “${g.name}” đã đủ ${sectMemberCapOf(g)} thành viên (trần cấp ${sectLevelOf(g)}).` }); return; }
    g.members.push({ token: player.token, name: player.name, role: 'detu' });
    sectLog(g, `${player.name} gia nhập tông (vào thẳng — cửa mở theo tông quy).`);
    sectNotify(g, `🏯 ${player.name} đã gia nhập “${g.name}”!`, player.token);
    saveWorld(); pushSectMembers(g); pushSectState(player);
    socket.emit('notice', { text: `🏯 Bạn đã gia nhập “${g.name}” với vai Đệ tử.` });
  });
  socket.on('sect_apply', (data) => {""")
rep("""    g.applicants.push({ token: player.token, name: player.name, kind: 'apply' });""",
    """    { const rlA = sectRulesOf(g); if ((REALM_ORDER[player.realm] ?? 0) < rlA.minRealm) { socket.emit('interact_error', { message: `Tông “${g.name}” chỉ nhận thành viên từ cảnh ${REALM_NAMES[SECT_REALM_IDS[rlA.minRealm]] || ''} trở lên (tông quy).` }); return; } } // GĐ326: cổng cảnh tối thiểu của tông quy
    g.applicants.push({ token: player.token, name: player.name, kind: 'apply' });""")

# --- học tông pháp ở Tàng Kinh Các ---
rep("""  socket.on('sect_building_upgrade', (data) => { // GĐ322""",
    """  socket.on('sect_tech_learn', (data) => { // GĐ326: học tông pháp ở Tàng Kinh Các — tốn Tông Cống, bị động khi còn trong tông
    if (!player || !data) return;
    const g = sectOfToken(player.token);
    if (!g) return;
    ensureSectV2(g);
    const tech = SECT_TECH.find((t) => t.id === data.techId);
    if (!tech) return;
    player.sectTech = Array.isArray(player.sectTech) ? player.sectTech : [];
    if (player.sectTech.includes(tech.id)) { socket.emit('interact_error', { message: 'Bạn đã học tông pháp này rồi.' }); return; }
    const b = (g.buildings || []).find((x) => x.kind === 'tangkinh');
    if (!g.hq || !b) { socket.emit('interact_error', { message: 'Tông chưa dựng Tàng Kinh Các ở trụ sở.' }); return; }
    if (mapOf(player) !== g.hq.mapId || Math.hypot(player.x - b.x, player.y - b.y) > 350) { socket.emit('interact_error', { message: 'Tới Tàng Kinh Các ở trụ sở tông để học tông pháp.' }); return; }
    const me = g.members.find((m) => m.token === player.token);
    if ((me.contrib || 0) < tech.cost) { socket.emit('interact_error', { message: `Cần ${tech.cost} Tông Cống (bạn đang có ${me.contrib || 0}).` }); return; }
    me.contrib -= tech.cost;
    player.sectTech.push(tech.id);
    sectLog(g, `${player.name} học ${tech.name} ở Tàng Kinh Các (−${tech.cost} Tông Cống).`);
    saveWorld(); persistPlayer(player); syncPlayerSocket(player); pushSectState(player);
    socket.emit('notice', { text: `📚 Đã lĩnh ngộ ${tech.name}: ${tech.desc} (chỉ có tác dụng khi còn là thành viên tông)` });
  });
  socket.on('sect_building_upgrade', (data) => { // GĐ322""")

io.open(P, 'w', encoding='utf-8').write(s)
print('gd326b OK')
