# GĐ322b: lãnh địa nhiều ô (cắm/bỏ/tuyên chiến/kết chiến) + Uy từ nhiệm vụ/chiến +
# nâng cấp công trình + hiệu ứng theo cấp công trình + state cho client.
import io
P = 'server/index.js'
s = io.open(P, encoding='utf-8').read()
def rep(old, new, n=1):
    global s
    assert s.count(old) == n, 'anchor %dx: %s' % (s.count(old), old[:70])
    s = s.replace(old, new)

# 1) tạo tông mới: khởi tạo cấp/Uy/lãnh địa/ngày phí
rep("""    const g = { id: 'sect' + Date.now().toString(36) + Math.floor(Math.random() * 999), name, intro: String(data.intro || '').slice(0, 120), members, applicants: [] };""",
    """    const g = { id: 'sect' + Date.now().toString(36) + Math.floor(Math.random() * 999), name, intro: String(data.intro || '').slice(0, 120), members, applicants: [], level: 1, uy: 0, territories: [], upkeepDay: null, debtDays: 0 }; // GĐ322""")

# 2) cắm cờ: trần theo cấp + mảng
rep("""    if (g.territory) { socket.emit('interact_error', { message: 'Tông bạn đã có lãnh địa — bỏ lãnh địa hiện tại trước.' }); return; }
    const tp = territoryPoint(String(data.pointId || ''));
    if (!tp) return;
    if (territoryOwner(tp.id)) { socket.emit('interact_error', { message: 'Điểm linh mạch này đã có chủ — muốn lấy phải tuyên chiến.' }); return; }""",
    """    if (territoriesOf(g).length >= sectTerritoryCapOf(g)) { socket.emit('interact_error', { message: `Tông cấp ${sectLevelOf(g)} chỉ giữ tối đa ${sectTerritoryCapOf(g)} lãnh địa — thăng cấp tông (nhiều Tông Uy hơn) để mở thêm.` }); return; } // GĐ322
    const tp = territoryPoint(String(data.pointId || ''));
    if (!tp) return;
    if (territoriesOf(g).includes(tp.id)) { socket.emit('interact_error', { message: 'Điểm này đã là lãnh địa của tông bạn.' }); return; }
    if (territoryOwner(tp.id)) { socket.emit('interact_error', { message: 'Điểm linh mạch này đã có chủ — muốn lấy phải tuyên chiến.' }); return; }""")
rep("""    g.fund -= TERR_CLAIM_COST; g.territory = tp.id;""",
    """    g.fund -= TERR_CLAIM_COST; territoriesOf(g).push(tp.id); syncTerritoryMirror(g); // GĐ322""")

# 3) bỏ lãnh địa theo điểm cụ thể
rep("""  socket.on('sect_territory_abandon', () => {
    if (!player) return;
    const g = sectOfToken(player.token); if (!g) return;
    const me = g.members.find((m) => m.token === player.token);
    if (SECT_RANK[me.role] < 2) { socket.emit('interact_error', { message: 'Từ Phó tông chủ trở lên mới bỏ lãnh địa.' }); return; }
    if (!g.territory) return;
    const w = warOfSect(g.id);
    if (w && w.pointId === g.territory) { socket.emit('interact_error', { message: 'Đang có tông chiến nhắm vào lãnh địa này — không bỏ được lúc này.' }); return; }
    const tp = territoryPoint(g.territory);
    g.territory = null;""",
    """  socket.on('sect_territory_abandon', (data) => { // GĐ322: bỏ theo điểm cụ thể (không truyền = điểm đầu)
    if (!player) return;
    const g = sectOfToken(player.token); if (!g) return;
    const me = g.members.find((m) => m.token === player.token);
    if (SECT_RANK[me.role] < 2) { socket.emit('interact_error', { message: 'Từ Phó tông chủ trở lên mới bỏ lãnh địa.' }); return; }
    const pid = data && data.pointId ? String(data.pointId) : g.territory;
    if (!pid || !territoriesOf(g).includes(pid)) return;
    const w = warOfSect(g.id);
    if (w && w.pointId === pid) { socket.emit('interact_error', { message: 'Đang có tông chiến nhắm vào lãnh địa này — không bỏ được lúc này.' }); return; }
    const tp = territoryPoint(pid);
    g.territories = territoriesOf(g).filter((x) => x !== pid); syncTerritoryMirror(g);""")

# 4) tuyên chiến: bên công phải còn slot lãnh địa trống
rep("""    if (g.territory) { socket.emit('interact_error', { message: 'Tông bạn đã có lãnh địa — mỗi tông chỉ giữ 1 lãnh địa, bỏ lãnh địa hiện tại mới tuyên chiến được.' }); return; }""",
    """    if (territoriesOf(g).length >= sectTerritoryCapOf(g)) { socket.emit('interact_error', { message: `Tông bạn đã giữ tối đa ${sectTerritoryCapOf(g)} lãnh địa theo cấp — thắng cũng không giữ thêm được. Bỏ bớt lãnh địa hoặc thăng cấp tông rồi hãy tuyên chiến.` }); return; } // GĐ322""")

# 5) kết chiến: chuyển điểm theo mảng + Uy thắng +50 / thua +10
rep("""  if (atkWin) {
    if (defG && defG.territory === w.pointId) defG.territory = null;
    if (atkG) { atkG.territory = w.pointId; atkG.fund = (atkG.fund || 0) + (w.stake || 0); }
  } else if (defG) { defG.fund = (defG.fund || 0) + (w.stake || 0); }""",
    """  if (atkWin) {
    if (defG) { defG.territories = territoriesOf(defG).filter((x) => x !== w.pointId); syncTerritoryMirror(defG); }
    if (atkG) { if (territoriesOf(atkG).length < sectTerritoryCapOf(atkG) && !territoriesOf(atkG).includes(w.pointId)) territoriesOf(atkG).push(w.pointId); syncTerritoryMirror(atkG); atkG.fund = (atkG.fund || 0) + (w.stake || 0); sectUyAdd(atkG, 50); } // GĐ322: thắng chiến +50 Uy
    if (defG) sectUyAdd(defG, 10);
  } else { if (defG) { defG.fund = (defG.fund || 0) + (w.stake || 0); sectUyAdd(defG, 50); } if (atkG) sectUyAdd(atkG, 10); } // GĐ322: giữ vững +50 Uy""")
rep("""    if (w.def === sectId && atkG) { atkG.territory = w.pointId; atkG.fund = (atkG.fund || 0) + (w.stake || 0); }""",
    """    if (w.def === sectId && atkG) { if (territoriesOf(atkG).length < sectTerritoryCapOf(atkG) && !territoriesOf(atkG).includes(w.pointId)) territoriesOf(atkG).push(w.pointId); syncTerritoryMirror(atkG); atkG.fund = (atkG.fund || 0) + (w.stake || 0); } // GĐ322""")

# 6) nhiệm vụ tông hoàn thành: +10 Uy
rep("""    sectNotify(g, `🏯 Nhiệm vụ tông hoàn thành: “${q.name}” — quỹ tông +1.500 Linh thạch, mọi thành viên +25 điểm cống hiến!`);""",
    """    sectNotify(g, `🏯 Nhiệm vụ tông hoàn thành: “${q.name}” — quỹ tông +1.500 Linh thạch, mọi thành viên +25 điểm cống hiến!`);
    sectUyAdd(g, 10); // GĐ322: +10 Tông Uy mỗi nhiệm vụ tông hoàn thành""")

# 7) nâng cấp công trình (handler mới, đặt cạnh sect_garden_op — neo vào dept handler cuối khối GĐ319)
rep("""  socket.on('sect_garden_op', (data) => {""",
    """  socket.on('sect_building_upgrade', (data) => { // GĐ322: nâng cấp công trình tại trụ sở (tiền quỹ; TẠM cấp 2 = 20.000, cấp 3 = 50.000 LT)
    if (!player || !data) return;
    const g = sectOfToken(player.token); if (!g) return;
    ensureSectV2(g);
    const me = g.members.find((m) => m.token === player.token);
    if (SECT_RANK[me.role] < 2) { socket.emit('interact_error', { message: 'Từ Phó tông chủ trở lên mới nâng cấp công trình.' }); return; }
    const b = sectBuildingAt(g, String(data.kind || ''));
    if (!b) return;
    const lv = b.lv || 1;
    if (lv >= 3) { socket.emit('interact_error', { message: `${b.name} đã đạt cấp tối đa (3).` }); return; }
    const cost = lv === 1 ? 20000 : 50000;
    if ((g.fund || 0) < cost) { socket.emit('interact_error', { message: `Nâng ${b.name} lên cấp ${lv + 1} cần ${cost.toLocaleString('vi-VN')} Linh thạch trong quỹ tông (đang có ${(g.fund || 0).toLocaleString('vi-VN')}).` }); return; }
    g.fund -= cost; b.lv = lv + 1;
    if (b.kind === 'duocvien') { const target = 4 + 2 * b.lv; if (!Array.isArray(g.garden)) g.garden = []; while (g.garden.length < target) g.garden.push({}); }
    saveWorld(); pushSectStateEveryone(); broadcastSectHqs();
    sectNotify(g, `🏯 ${b.name} của tông đã nâng lên CẤP ${b.lv}!`, player.token);
    socket.emit('notice', { text: `🏯 Đã nâng ${b.name} lên cấp ${b.lv}.` });
  });
  socket.on('sect_garden_op', (data) => {""")

# 8) hiệu ứng theo cấp công trình: Đan/Khí Phòng 5/8/12%; Luyện Công Trường bán kính x1/x1.5/x2
rep("""  const b = sectBuildingAt(g, kind); if (!b) return 0;
  return Math.hypot(p.x - b.x, p.y - b.y) <= 600 ? 0.05 : 0;
}""",
    """  const b = sectBuildingAt(g, kind); if (!b) return 0;
  return Math.hypot(p.x - b.x, p.y - b.y) <= 600 ? [0, 0.05, 0.08, 0.12][b.lv || 1] : 0; // GĐ322: theo cấp công trình
}""")
rep("""  if (g302 && g302.hq && g302.hq.mapId === mapId) { const lc319 = sectBuildingAt(g302, 'luyencong'); if (lc319 && Math.hypot(p.x - lc319.x, p.y - lc319.y) <= MEDITATE_SPOT_RADIUS) return 'linhmach'; }""",
    """  if (g302 && g302.hq && g302.hq.mapId === mapId) { const lc319 = sectBuildingAt(g302, 'luyencong'); const lcR322 = MEDITATE_SPOT_RADIUS * ((lc319 && (lc319.lv || 1) === 3) ? 2 : (lc319 && (lc319.lv || 1) === 2) ? 1.5 : 1); if (lc319 && Math.hypot(p.x - lc319.x, p.y - lc319.y) <= lcR322) return 'linhmach'; } // GĐ322: cấp trường luyện công nới vùng linh khí""")

# 9) state cho client: cấp/Uy/trần/phí + danh sách lãnh địa + lv công trình
rep("""    mySect.fund = mine.fund || 0;""",
    """    mySect.fund = mine.fund || 0;
    // GĐ322: cấp tông + Tông Uy + trần theo cấp + phí duy trì
    mySect.level = sectLevelOf(mine); mySect.uy = mine.uy || 0;
    mySect.uyNext = sectLevelOf(mine) < 5 ? SECT_LEVEL_UY[sectLevelOf(mine)] : null;
    mySect.memberCap = sectMemberCapOf(mine); mySect.warehouseCap = sectWarehouseCapOf(mine); mySect.territoryCap = sectTerritoryCapOf(mine);
    mySect.upkeepPerDay = sectUpkeepPerDay(mine); mySect.debtDays = mine.debtDays || 0;
    mySect.territories = territoriesOf(mine).map((pid) => { const tp = territoryPoint(pid); return tp ? { pointId: tp.id, name: tp.name, mapId: tp.mapId, mapName: (MAP_DEFS.get(tp.mapId) || {}).name || tp.mapId } : null; }).filter(Boolean);""")
rep("""    mySect.buildings = (mine.buildings || []).map((b) => ({ kind: b.kind, name: b.name, x: b.x, y: b.y }));""",
    """    mySect.buildings = (mine.buildings || []).map((b) => ({ kind: b.kind, name: b.name, x: b.x, y: b.y, lv: b.lv || 1 })); // GĐ322: + cấp công trình""")
rep("""function sectHqsView() { return sects.filter((g) => g.hq).map((g) => { ensureSectV2(g); return { sectId: g.id, name: g.name, mapId: g.hq.mapId, x: g.hq.x, y: g.hq.y, buildings: (g.buildings || []).map((b) => ({ kind: b.kind, name: b.name, x: b.x, y: b.y })) }; }); }""",
    """function sectHqsView() { return sects.filter((g) => g.hq).map((g) => { ensureSectV2(g); return { sectId: g.id, name: g.name, mapId: g.hq.mapId, x: g.hq.x, y: g.hq.y, buildings: (g.buildings || []).map((b) => ({ kind: b.kind, name: b.name, x: b.x, y: b.y, lv: b.lv || 1 })) }; }); } // GĐ322: + lv""")

io.open(P, 'w', encoding='utf-8').write(s)
print('gd322b OK')
