# GĐ319b: trụ sở (bia) + 7 công trình + Dược Viên tông + thiền Luyện Công Trường + Đan/Khí Phòng +5%
# Chay: python3 shottools/patch_gd319b.py
import io
P = '/home/hatch/workspace/tap-tanh-tu-tien-mmo/server/index.js'
s = io.open(P, encoding='utf-8').read()
def rep(old, new, n=1):
    global s
    assert s.count(old) == n, 'anchor %dx: %s' % (s.count(old), old[:70])
    s = s.replace(old, new)

# --- 1) ensureSectV2: tru so / cong trinh / phong ban / vuon ---
rep("""function ensureSectV2(g) {
  if (typeof g.fund !== 'number') g.fund = 0;
  if (!Array.isArray(g.warehouse)) g.warehouse = [];
  for (const m of g.members) if (typeof m.contrib !== 'number') m.contrib = 0;
  return g;
}""",
"""function ensureSectV2(g) {
  if (typeof g.fund !== 'number') g.fund = 0;
  if (!Array.isArray(g.warehouse)) g.warehouse = [];
  for (const m of g.members) if (typeof m.contrib !== 'number') m.contrib = 0;
  if (!('hq' in g)) g.hq = null; // GĐ319: trụ sở {mapId, x, y} — Lệnh Bài hóa bia
  if (!Array.isArray(g.buildings)) g.buildings = []; // GĐ319: công trình quanh bia
  if (!g.depts || typeof g.depts !== 'object') g.depts = {}; // GĐ319: phòng ban -> token Đường Chủ
  if (!Array.isArray(g.garden)) g.garden = []; // GĐ319: 6 ô Dược Viên tông
  return g;
}
// ================= GĐ319: TRỤ SỞ + PHÒNG BAN + DƯỢC VIÊN TÔNG =================
const SECT_DEPTS = { tongvu: 'Tông Vụ Đường', dan: 'Đan Phòng', khi: 'Khí Phòng', duoc: 'Dược Viên', tangkinh: 'Tàng Kinh Các', luyencong: 'Luyện Công Trường', chapphap: 'Chấp Pháp Đường' };
const SECT_TIER_NAMES = { chu: 'Tông Chủ', pho: 'Phó Tông Chủ', truonglao: 'Trưởng Lão', duongchu: 'Đường Chủ', noimon: 'Đệ Tử Nội Môn', ngoaemon: 'Đệ Tử Ngoại Môn' };
const SECT_NOIMON_CONTRIB = 100; // TẠM: Tông Cống >= 100 = Đệ Tử Nội Môn
function sectTierOf(g, m) {
  if (m.role !== 'detu') return m.role;
  if (Object.values(g.depts || {}).includes(m.token)) return 'duongchu';
  return (m.contrib || 0) >= SECT_NOIMON_CONTRIB ? 'noimon' : 'ngoaemon';
}
function sectBuildingAt(g, kind) { return (g.buildings || []).find((b) => b.kind === kind) || null; }
function sectGardenPts(plot) { if (!plot || !plot.herb) return 0; return Math.min(35, Math.floor((Date.now() - plot.plantedAt) / 360000) + (plot.bonus || 0)); }
function sectGardenView(g, p) {
  return (g.garden || []).map((plot, i) => ({ i, herb: plot.herb || null, herbName: plot.herb ? (ITEMS[plot.herb] || {}).name : null, pts: sectGardenPts(plot), stage: plot.herb ? GARDEN_STAGE_AT.filter((a) => sectGardenPts(plot) >= a).length - 1 : -1, mature: sectGardenPts(plot) >= 35, canWater: Date.now() - ((plot.waters || {})[p.token] || 0) >= 600000 }));
}
function sectHqsView() { return sects.filter((g) => g.hq).map((g) => { ensureSectV2(g); return { sectId: g.id, name: g.name, mapId: g.hq.mapId, x: g.hq.x, y: g.hq.y, buildings: (g.buildings || []).map((b) => ({ kind: b.kind, name: b.name, x: b.x, y: b.y })) }; }); }
function broadcastSectHqs() { io.emit('sect_hqs', { list: sectHqsView() }); }
function sectHqCraftBonus(p, jobId) { // GĐ319: luyện tại Đan/Khí Phòng của tông +5% tỉ lệ thành công (TẠM)
  const kind = jobId === 'dansu' ? 'danphong' : jobId === 'luyenkhi' ? 'khiphong' : null;
  if (!kind) return 0;
  const g = sectOfToken(p.token); if (!g || !g.hq || g.hq.mapId !== mapOf(p)) return 0;
  const b = sectBuildingAt(g, kind); if (!b) return 0;
  return Math.hypot(p.x - b.x, p.y - b.y) <= 600 ? 0.05 : 0;
}
function hqPlaceError(p, g) { // GĐ319: luật đặt trụ sở (TẠM)
  const mid = mapOf(p);
  if (mid === HOME_MAP) return 'Không đặt trụ sở trong làng được — hãy ra map hoang dã hoặc bãi farm.';
  if (mid.startsWith('hang_')) return 'Không đặt trụ sở trong hang được.';
  const rt = MAP_RUNTIME.get(mid);
  if (rt && rt.bicanh) return 'Không đặt trụ sở trong bí cảnh được.';
  const def = MAP_DEFS.get(mid) || {};
  if (['city', 'fortress', 'village', 'cave'].includes(def.category)) return 'Không đặt trụ sở trong thành thị/làng/hang được — hãy ra vùng hoang dã.';
  if (def.minRealm && (REALM_ORDER[def.minRealm] ?? 0) > (REALM_ORDER[p.realm] ?? 0) + 1) return 'Map này có cổng cảnh cao hơn cảnh của tông chủ quá 1 bậc — không đặt trụ sở được.';
  if (rt && rt.portal && Math.hypot(p.x - rt.portal.x, p.y - rt.portal.y) < 400) return 'Quá gần cổng dịch chuyển của map (cần cách tối thiểu 400px).';
  for (const o of sects) {
    if (g && o.id === g.id) continue;
    ensureSectV2(o);
    if (o.hq && o.hq.mapId === mid && Math.hypot(p.x - o.hq.x, p.y - o.hq.y) < 800) return `Quá gần trụ sở của tông "${o.name}" (cần cách tối thiểu 800px).`;
    const tp = o.territory ? territoryPoint(o.territory) : null;
    if (tp && tp.mapId === mid && Math.hypot(p.x - tp.x, p.y - tp.y) < 800) return `Quá gần lãnh địa của tông "${o.name}" (cần cách tối thiểu 800px).`;
  }
  if (hitsObstacleIn(mid, p.x, p.y, 26)) return 'Chỗ đứng này vướng chướng ngại vật — chọn khoảng đất trống khác.';
  return null;
}""")

# --- 2) sectStateFor: mo rong mySect ---
rep("    mySect.members = mySect.members.map((m, i) => ({ ...m, contrib: mine.members[i].contrib || 0 }));",
"""    mySect.members = mySect.members.map((m, i) => ({ ...m, contrib: mine.members[i].contrib || 0 }));
    // GĐ319: trụ sở + công trình + phòng ban + tầng đệ tử + Dược Viên tông
    mySect.hq = mine.hq ? { mapId: mine.hq.mapId, mapName: (MAP_DEFS.get(mine.hq.mapId) || {}).name || mine.hq.mapId, x: mine.hq.x, y: mine.hq.y } : null;
    mySect.buildings = (mine.buildings || []).map((b) => ({ kind: b.kind, name: b.name, x: b.x, y: b.y }));
    mySect.depts = Object.entries(SECT_DEPTS).map(([k, nm]) => ({ key: k, name: nm, chiefToken: (mine.depts || {})[k] || null, chiefName: ((mine.members.find((m) => m.token === (mine.depts || {})[k]) || {}).name) || null }));
    mySect.myTier = sectTierOf(mine, me); mySect.myTierName = SECT_TIER_NAMES[mySect.myTier];
    mySect.members = mySect.members.map((m, i) => ({ ...m, tier: sectTierOf(mine, mine.members[i]), tierName: SECT_TIER_NAMES[sectTierOf(mine, mine.members[i])], founder: !!mine.members[i].founder }));
    mySect.garden = sectGardenView(mine, p);
    mySect.gardenHerbs = GARDEN_HERBS.map((h) => ({ itemId: h, name: (ITEMS[h] || {}).name || h }));""")

# --- 3) Dang nhap: gui danh sach tru so ---
rep("pushSectState(player); pushGuildState(player);", "pushSectState(player); pushGuildState(player); socket.emit('sect_hqs', { list: sectHqsView() }); // GĐ319", 3)

# --- 4) Thien tai Luyen Cong Truong = noi linh khi ---
rep("""  if (g302 && g302.territory) { const tp302 = territoryPoint(g302.territory); if (tp302 && tp302.mapId === mapId) { const pos302 = territoryPos(tp302); if (pos302 && Math.hypot(p.x - pos302.x, p.y - pos302.y) <= MEDITATE_SPOT_RADIUS) return 'linhmach'; } }
  return null;""",
"""  if (g302 && g302.territory) { const tp302 = territoryPoint(g302.territory); if (tp302 && tp302.mapId === mapId) { const pos302 = territoryPos(tp302); if (pos302 && Math.hypot(p.x - pos302.x, p.y - pos302.y) <= MEDITATE_SPOT_RADIUS) return 'linhmach'; } }
  // GĐ319: thiền tại Luyện Công Trường ở trụ sở của tông mình cũng tính là nơi linh khí
  if (g302 && g302.hq && g302.hq.mapId === mapId) { const lc319 = sectBuildingAt(g302, 'luyencong'); if (lc319 && Math.hypot(p.x - lc319.x, p.y - lc319.y) <= MEDITATE_SPOT_RADIUS) return 'linhmach'; }
  return null;""")

# --- 5) Dan/Khi Phong +5% trong craft_item ---
rep("    const effRate = Math.min(1, rc.rate + apprenticeBonus + achCraftBonus(player)); // GĐ139: mốc Nghề phụ 2 +3%",
"    const effRate = Math.min(1, rc.rate + apprenticeBonus + achCraftBonus(player) + sectHqCraftBonus(player, rc.jobId)); // GĐ139: mốc Nghề phụ 2 +3% · GĐ319: + Đan/Khí Phòng tại trụ sở")

# --- 6) use_item: Lenh Bai + Tran Phap (chen truoc nhanh phao hoa) ---
rep("    if (id === 'phao_hoa_le' || id === 'phao_hoa_dao') { // GĐ217 + GĐ218: pháo hoa — hiệu ứng cho cả vùng",
"""    if (id === 'lenh_bai_tong_mon') { // GĐ319: Lệnh Bài hóa Tông Môn Thạch Bia — đặt trụ sở
      const g = sectOfToken(player.token);
      if (!g) { socket.emit('interact_error', { message: 'Bạn không còn ở tông môn nào — lệnh bài vô hiệu.' }); return; }
      ensureSectV2(g);
      const me = g.members.find((m) => m.token === player.token);
      if (!me || me.role !== 'chu') { socket.emit('interact_error', { message: 'Chỉ Tông chủ mới dùng Lệnh Bài đặt trụ sở được.' }); return; }
      if (g.hq) { socket.emit('interact_error', { message: 'Tông đã có trụ sở rồi — lệnh bài này không còn dùng được.' }); return; }
      const err = hqPlaceError(player, g);
      if (err) { socket.emit('interact_error', { message: err }); return; }
      g.hq = { mapId: mapOf(player), x: Math.round(player.x), y: Math.round(player.y) };
      player.inventory[id] -= 1; if (player.inventory[id] <= 0) delete player.inventory[id];
      saveWorld(); persistPlayer(player); syncChar(socket, player); pushSectStateAll(g); broadcastSectHqs();
      notice(`🏯 Lệnh Bài hóa thành TÔNG MÔN THẠCH BIA khắc tên "${g.name}" — trụ sở của tông đã định vị tại đây! Dùng Trận Pháp Khai Sơn cạnh bia để dựng công trình.`);
      return;
    }
    if (id === 'tran_phap_khai_son') { // GĐ319: dựng 7 công trình cơ bản quanh bia
      const g = sectOfToken(player.token);
      if (!g) { socket.emit('interact_error', { message: 'Bạn không còn ở tông môn nào — trận pháp vô hiệu.' }); return; }
      ensureSectV2(g);
      const me = g.members.find((m) => m.token === player.token);
      if (!me || me.role !== 'chu') { socket.emit('interact_error', { message: 'Chỉ Tông chủ mới khai trận dựng công trình được.' }); return; }
      if (!g.hq) { socket.emit('interact_error', { message: 'Chưa có trụ sở — dùng Lệnh Bài Tông Môn đặt Thạch Bia trước đã.' }); return; }
      if ((g.buildings || []).length) { socket.emit('interact_error', { message: 'Công trình cơ bản đã được dựng rồi.' }); return; }
      if (g.hq.mapId !== mapOf(player) || Math.hypot(player.x - g.hq.x, player.y - g.hq.y) > 250) { socket.emit('interact_error', { message: 'Đứng cạnh Tông Môn Thạch Bia của tông mình rồi mới dùng Trận Pháp.' }); return; }
      const rt = MAP_RUNTIME.get(g.hq.mapId);
      const DEFS319 = [['sonmon', 'Sơn Môn', 0, 200], ['daidien', 'Đại Điện', 0, -240], ['danphong', 'Đan Phòng', -280, -80], ['khiphong', 'Khí Phòng', 280, -80], ['duocvien', 'Dược Viên', -260, 200], ['tangkinh', 'Tàng Kinh Các', 260, 200], ['luyencong', 'Luyện Công Trường', 0, 380]];
      const placed = [];
      for (const [kind, nm, dx, dy] of DEFS319) {
        let bx = g.hq.x + dx, by = g.hq.y + dy, ok = false;
        outer: for (const rad of [0, 50, 100, 150, 200]) {
          for (let a = 0; a < 8; a++) {
            const cx = g.hq.x + dx + Math.round(Math.cos(a * Math.PI / 4) * rad), cy = g.hq.y + dy + Math.round(Math.sin(a * Math.PI / 4) * rad);
            if (rt && (cx < 60 || cy < 60 || cx > rt.w - 60 || cy > rt.h - 60)) continue;
            if (!hitsObstacleIn(g.hq.mapId, cx, cy, 26)) { bx = cx; by = cy; ok = true; break outer; }
          }
        }
        placed.push({ kind, name: nm, x: bx, y: by });
      }
      g.buildings = placed;
      g.garden = Array.from({ length: 6 }, () => ({ herb: null, plantedAt: 0, bonus: 0, waters: {} }));
      player.inventory[id] -= 1; if (player.inventory[id] <= 0) delete player.inventory[id];
      saveWorld(); persistPlayer(player); syncChar(socket, player); pushSectStateAll(g); broadcastSectHqs();
      notice('🏯 Trận Pháp Khai Sơn khởi động — 7 công trình cơ bản mọc lên quanh Thạch Bia: Sơn Môn · Đại Điện · Đan Phòng · Khí Phòng · Dược Viên · Tàng Kinh Các · Luyện Công Trường!');
      return;
    }
    if (id === 'phao_hoa_le' || id === 'phao_hoa_dao') { // GĐ217 + GĐ218: pháo hoa — hiệu ứng cho cả vùng""")

# --- 7) Handler vuon tong (chen truoc sect_territory_claim) ---
rep("  socket.on('sect_territory_claim', (data) => {",
"""  socket.on('sect_garden_op', (data) => { // GĐ319: Dược Viên tông — trồng/tưới/hái 6 ô chung
    if (!player || !data) return;
    const g = sectOfToken(player.token); if (!g) return;
    ensureSectV2(g);
    const me = g.members.find((m) => m.token === player.token); if (!me) return;
    if (!sectBuildingAt(g, 'duocvien')) { socket.emit('interact_error', { message: 'Tông chưa dựng Dược Viên (cần đặt trụ sở + dùng Trận Pháp Khai Sơn).' }); return; }
    if (!Array.isArray(g.garden) || g.garden.length !== 6) g.garden = Array.from({ length: 6 }, () => ({ herb: null, plantedAt: 0, bonus: 0, waters: {} }));
    const plot = g.garden[Math.floor(Number(data.plot) || 0)];
    if (!plot) return;
    const bv = sectBuildingAt(g, 'duocvien');
    if (!g.hq || g.hq.mapId !== mapOf(player) || Math.hypot(player.x - bv.x, player.y - bv.y) > 300) { socket.emit('interact_error', { message: 'Tới Dược Viên ở trụ sở của tông để làm vườn.' }); return; }
    if (data.op === 'plant') {
      if (plot.herb) { socket.emit('interact_error', { message: 'Ô này đã có cây rồi.' }); return; }
      const herb = String(data.herbId || '');
      if (!GARDEN_HERBS.includes(herb)) return;
      if ((player.inventory[herb] || 0) < 1) { socket.emit('interact_error', { message: `Cần 1 ${(ITEMS[herb] || {}).name || herb} làm giống.` }); return; }
      player.inventory[herb] -= 1; if (player.inventory[herb] <= 0) delete player.inventory[herb];
      plot.herb = herb; plot.plantedAt = Date.now(); plot.bonus = 0; plot.waters = {};
      socket.emit('notice', { text: `🌱 Đã gieo ${(ITEMS[herb] || {}).name} vào ô vườn tông ${Math.floor(Number(data.plot) || 0) + 1}.` });
    } else if (data.op === 'water') {
      if (!plot.herb) { socket.emit('interact_error', { message: 'Ô trống — gieo hạt trước đã.' }); return; }
      if (Date.now() - ((plot.waters || {})[player.token] || 0) < 600000) { socket.emit('interact_error', { message: 'Bạn vừa tưới ô này — chờ 10 phút mới tưới lại được.' }); return; }
      if ((plot.bonus || 0) >= 25) { socket.emit('interact_error', { message: 'Ô này đã được tưới đủ ẩm rồi.' }); return; }
      plot.waters = plot.waters || {}; plot.waters[player.token] = Date.now(); plot.bonus = Math.min(25, (plot.bonus || 0) + 3);
      socket.emit('notice', { text: '💧 Đã tưới nước — cây lớn nhanh hơn (+3 điểm).' });
    } else if (data.op === 'harvest') {
      if (!plot.herb || sectGardenPts(plot) < 35) { socket.emit('interact_error', { message: 'Cây chưa chín — chưa hái được.' }); return; }
      const tier = sectTierOf(g, me);
      if (tier === 'ngoaemon') { socket.emit('interact_error', { message: 'Đệ Tử Ngoại Môn chưa được hái vườn tông — đạt 100 Tông Cống (Nội Môn) hoặc được phong Đường Chủ rồi hẵng hái.' }); return; }
      const herb = plot.herb;
      player.inventory[herb] = (player.inventory[herb] || 0) + 3;
      plot.herb = null; plot.plantedAt = 0; plot.bonus = 0; plot.waters = {};
      socket.emit('notice', { text: `🌿 Thu hoạch vườn tông: +3 ${(ITEMS[herb] || {}).name}!` });
    } else return;
    saveWorld(); persistPlayer(player); syncChar(socket, player); pushSectState(player);
  });
  socket.on('sect_territory_claim', (data) => {""")

io.open(P, 'w', encoding='utf-8').write(s)
print('patch gd319b OK')
