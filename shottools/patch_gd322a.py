# GĐ322a: CẤP TÔNG 1-5 + Tông Uy + trần theo cấp + lãnh địa dạng mảng + phí duy trì.
import io
P = 'server/index.js'
s = io.open(P, encoding='utf-8').read()
def rep(old, new, n=1):
    global s
    assert s.count(old) == n, 'anchor %dx: %s' % (s.count(old), old[:70])
    s = s.replace(old, new)

# 1) hằng + helper cấp tông (sau SECT_WAREHOUSE_CAP)
rep("""const SECT_WAREHOUSE_CAP = 60; // TẠM: tối đa 60 ô (stack) trong kho chung""",
    """const SECT_WAREHOUSE_CAP = 60; // TẠM: tối đa 60 ô (stack) trong kho chung
// ===== GĐ322: CẤP TÔNG + TÔNG UY + PHÍ DUY TRÌ (mọi số TẠM) =====
const SECT_LEVEL_UY = [0, 200, 600, 1500, 3500]; // Tông Uy cần để ĐẠT cấp 1..5 (index = cấp - 1)
const SECT_MEMBER_CAPS = [10, 20, 35, 55, 80];
const SECT_WAREHOUSE_CAPS = [60, 90, 120, 160, 200];
const SECT_TERRITORY_CAPS = [1, 1, 2, 2, 3];
const SECT_UPKEEP_BASE = 100; // phí duy trì/ngày = 100 x cấp + 200 x số lãnh địa
const SECT_UPKEEP_TERR = 200;
function sectLevelOf(g) { return Math.max(1, Math.min(5, (g && g.level) || 1)); }
function sectMemberCapOf(g) { return SECT_MEMBER_CAPS[sectLevelOf(g) - 1]; }
function sectWarehouseCapOf(g) { return SECT_WAREHOUSE_CAPS[sectLevelOf(g) - 1]; }
function sectTerritoryCapOf(g) { return SECT_TERRITORY_CAPS[sectLevelOf(g) - 1]; }
function territoriesOf(g) { if (!Array.isArray(g.territories)) g.territories = g.territory ? [g.territory] : []; return g.territories; }
function syncTerritoryMirror(g) { const t = territoriesOf(g); g.territory = t[0] || null; }
function sectUpkeepPerDay(g) { return SECT_UPKEEP_BASE * sectLevelOf(g) + SECT_UPKEEP_TERR * territoriesOf(g).length; }
function sectUyAdd(g, n) { // cộng Tông Uy + tự thăng cấp khi đủ mốc
  if (!g || !n) return;
  g.uy = (g.uy || 0) + n;
  while (sectLevelOf(g) < 5 && g.uy >= SECT_LEVEL_UY[sectLevelOf(g)]) {
    g.level = sectLevelOf(g) + 1;
    sectNotify(g, `🏯 Tông môn thăng CẤP ${g.level}! (Tông Uy ${g.uy}) — trần thành viên ${sectMemberCapOf(g)}, kho ${sectWarehouseCapOf(g)} ô, lãnh địa tối đa ${sectTerritoryCapOf(g)}.`);
  }
}""")

# 2) ensureSectV2: trường mới + di cư lãnh địa + lv công trình
rep("""  if (!Array.isArray(g.garden)) g.garden = []; // GĐ319: 6 ô Dược Viên tông
  return g;
}""",
    """  if (!Array.isArray(g.garden)) g.garden = []; // GĐ319: 6 ô Dược Viên tông
  if (typeof g.level !== 'number') g.level = 1; // GĐ322: cấp tông
  if (typeof g.uy !== 'number') g.uy = 0; // GĐ322: Tông Uy
  if (!Array.isArray(g.territories)) g.territories = g.territory ? [g.territory] : []; // GĐ322: lãnh địa dạng mảng (di cư từ 1 điểm)
  if (typeof g.debtDays !== 'number') g.debtDays = 0; // GĐ322: số ngày thiếu phí duy trì liên tiếp
  for (const b of g.buildings || []) if (!b.lv) b.lv = 1; // GĐ322: cấp công trình
  return g;
}""")

# 3) ensureSectDay: triều cống theo số lãnh địa + Uy; phí duy trì bắt kịp theo ngày + tụt cấp khi nợ 3 ngày
rep("""function ensureSectDay(g) {
  const today = worldClock().dayIndex;
  if (g.territory && g.tributeDay !== today) { g.tributeDay = today; g.fund = (g.fund || 0) + TERR_TRIBUTE; } // GĐ302: triều cống lãnh địa +500 LT mỗi ngày game (TẠM)""",
    """function ensureSectDay(g) {
  const today = worldClock().dayIndex;
  const terrN322 = territoriesOf(g).length;
  if (terrN322 && g.tributeDay !== today) { g.tributeDay = today; g.fund = (g.fund || 0) + TERR_TRIBUTE * terrN322; sectUyAdd(g, 5 * terrN322); } // GĐ302 + GĐ322: mỗi lãnh địa +500 LT triều cống + 5 Tông Uy mỗi ngày game
  // GĐ322: PHÍ DUY TRÌ — thu cho từng ngày đã trôi qua kể từ upkeepDay (bắt kịp khi tông hoạt động lại; bỏ qua phần nợ quá 30 ngày)
  if (g.upkeepDay == null) g.upkeepDay = today;
  else if (g.upkeepDay < today) {
    if (today - g.upkeepDay > 30) g.upkeepDay = today - 30;
    while (g.upkeepDay < today) {
      const due = sectUpkeepPerDay(g);
      if ((g.fund || 0) >= due) { g.fund -= due; g.debtDays = 0; }
      else {
        g.debtDays = (g.debtDays || 0) + 1;
        if (g.debtDays >= 3) {
          g.debtDays = 0;
          if (sectLevelOf(g) > 1) { g.level = sectLevelOf(g) - 1; g.uy = Math.min(g.uy || 0, SECT_LEVEL_UY[sectLevelOf(g)] - 1); sectNotify(g, `🏯 Quỹ tông không đủ phí duy trì 3 ngày liền — tông môn TỤT xuống CẤP ${g.level}. Hãy nạp quỹ và gây dựng lại Tông Uy.`); }
        }
      }
      g.upkeepDay++;
    }
  }""")

# 4) territoryOwner theo mảng
rep("""function territoryOwner(pointId) { return sects.find((g) => g.territory === pointId) || null; }""",
    """function territoryOwner(pointId) { return sects.find((g) => territoriesOf(g).includes(pointId)) || null; } // GĐ322: lãnh địa dạng mảng""")

# 5) trần kho theo cấp
rep("""    if (!slot && g.warehouse.length >= SECT_WAREHOUSE_CAP) { socket.emit('interact_error', { message: 'Kho chung đã đầy ô.' }); return; }""",
    """    if (!slot && g.warehouse.length >= sectWarehouseCapOf(g)) { socket.emit('interact_error', { message: `Kho chung đã đầy ô (trần cấp ${sectLevelOf(g)}: ${sectWarehouseCapOf(g)} ô).` }); return; } // GĐ322""")

# 6) trần thành viên: nhận lời mời + duyệt đơn
rep("""    g.applicants.splice(ix, 1);
    if (data.accept && !sectOfToken(player.token)) {
      g.members.push({ token: player.token, name: player.name, role: 'detu' });""",
    """    const invA = g.applicants[ix];
    g.applicants.splice(ix, 1);
    if (data.accept && !sectOfToken(player.token) && g.members.length >= sectMemberCapOf(g)) { g.applicants.splice(ix, 0, invA); socket.emit('interact_error', { message: `Tông “${g.name}” đã đủ ${sectMemberCapOf(g)} thành viên (trần cấp ${sectLevelOf(g)}) — thăng cấp tông mới nhận thêm được.` }); saveWorld(); return; } // GĐ322
    if (data.accept && !sectOfToken(player.token)) {
      g.members.push({ token: player.token, name: player.name, role: 'detu' });""")
rep("""    const app = g.applicants[ix];
    g.applicants.splice(ix, 1);
    if (data.accept && !sectOfToken(app.token)) {
      g.members.push({ token: app.token, name: app.name, role: 'detu' });""",
    """    const app = g.applicants[ix];
    g.applicants.splice(ix, 1);
    if (data.accept && !sectOfToken(app.token) && g.members.length >= sectMemberCapOf(g)) { g.applicants.splice(ix, 0, app); socket.emit('interact_error', { message: `Tông đã đủ ${sectMemberCapOf(g)} thành viên (trần cấp ${sectLevelOf(g)}) — thăng cấp tông mới nhận thêm được.` }); saveWorld(); return; } // GĐ322
    if (data.accept && !sectOfToken(app.token)) {
      g.members.push({ token: app.token, name: app.name, role: 'detu' });""")

io.open(P, 'w', encoding='utf-8').write(s)
print('gd322a OK')
