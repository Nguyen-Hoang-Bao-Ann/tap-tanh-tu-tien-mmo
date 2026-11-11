// Probe GĐ367 — B4-2 (Bảo duyệt 09/11/2026): mở trùm map cho 18 map NA/HT/PH.
// Vá: MAP_BOSSES nối tay thêm 18 entry count 1 (loài tiêu biểu từng map, cờ
// mapBoss thật, KHÔNG nhân chỉ số — luật đồng nhất trùm map). Trước vá: 47
// entry / 2.930 quái → kỳ vọng sau vá: 65 entry / 2.948 quái (+18).
// Cả 18 map đều không có loài boss-class trong MAP_SPAWNS (đã kiểm bằng dữ
// liệu MonsterData) → cơ chế cũ không đụng; map có boss-class không thuộc
// danh sách này.
// Chân kiểm (1 boot, port 3744):
//  0) Boot log + /api/status: 65 entry trùm, tổng 2948 quái.
//  1) 18/18 map: đúng 1 cá thể sp=1 không hiếm của loài đích, maxHp = số gốc
//     loài; cá thể thường (sp=0) còn nguyên.
//  2) PH (thoi_gian_hanh_lang/Thời Gian Thú): đối chứng hạ thường -> ach_bossKills
//     giữ nguyên; hạ bản trùm -> ach_bossKills +1 + rương phẩm >= B rơi tại chỗ
//     + mở rương ra đá Cực (stonesCuc tăng). Ghi T0 cho chân hồi sinh.
//  3) NA (bang_nguyen_dai/Sơn Quân Hổ): Duyên Nợ cho ăn -> +15 thiện cảm loài;
//     tame_beast -> lỗi "Không thuần hóa được trùm."; hạ trùm -> counters + rương.
//  4) HT (minh_ha_co/Cõi Âm Sát Thủ): hạ trùm -> counters + rương.
//  5) Hồi quy: GĐ363 — thanh_moc_lam (lam_tru + Sâm Lâm Cự Mãng), huyet_sac_rung
//     (doc_xa + huyetlang), loi_dinh_son_coc (loi_dieu + huyen_anh_mieu),
//     Thạch Lâm nhà (kiemma + huyetlang + khoiloi) còn nguyên mỗi loài 1 trùm.
//  6) Hồi sinh: T0 + 600s -> bản trùm Thời Gian Thú trở lại đúng 1 cá thể.
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const net = require('net');
const ROOT = path.join(__dirname, '..', '..');
const DIR = __dirname;
const { io } = require(path.join(ROOT, 'client/node_modules/socket.io-client'));
const { createMerger } = require(path.join(ROOT, 'client/worldmerge.cjs'));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function waitFor(fn, ms) { const t0 = Date.now(); while (Date.now() - t0 < ms) { const v = fn(); if (v) return v; await sleep(120); } return null; }
function portFree(port) { return new Promise((res) => { const s = net.createServer(); s.once('error', () => res(false)); s.listen(port, () => s.close(() => res(true))); }); }
let serverProc = null, killTimer = null, CUR_PORT = 0;
async function startServer(port, tag, extraEnv) {
  CUR_PORT = port;
  if (!(await portFree(port))) throw new Error('port ban ' + port);
  serverProc = spawn('node', ['server/index.js'], { cwd: ROOT, env: { ...process.env, PORT: String(port), TTT_STORAGE: 'file', TTT_CHAR_FILE: path.join(DIR, 'characters.json'), TTT_ACC_FILE: path.join(DIR, 'accounts.json'), TTT_WORLD_FILE: path.join(DIR, 'world.json'), TTT_SESS_FILE: path.join(DIR, 'sessions.json'), TTT_DAY_REAL_MS: '600000', TTT_TUVI_NEED: '5', ...(extraEnv || {}) }, stdio: ['ignore', 'pipe', 'pipe'] });
  serverProc.stderr.on('data', (d) => { try { fs.appendFileSync(path.join(DIR, 'srv_' + tag + '.log'), d); } catch (e) {} });
  serverProc.stdout.on('data', (d) => { try { fs.appendFileSync(path.join(DIR, 'srv_' + tag + '.log'), d); } catch (e) {} });
  killTimer = setTimeout(() => { try { serverProc.kill('SIGKILL'); } catch (e) {} }, 1800000);
  const t0 = Date.now();
  while (Date.now() - t0 < 45000) { try { const r = await fetch(`http://127.0.0.1:${port}/api/status`); if (r.ok) { clearTimeout(killTimer); return; } } catch (e) {} await sleep(500); }
  throw new Error('server khong len');
}
async function stopServer() { if (!serverProc) return; const p = serverProc; serverProc = null; if (killTimer) { clearTimeout(killTimer); killTimer = null; } await new Promise((res) => { const t = setTimeout(() => { try { p.kill('SIGKILL'); } catch (e) {} res(); }, 4000); p.once('exit', () => { clearTimeout(t); res(); }); try { p.kill('SIGTERM'); } catch (e) { clearTimeout(t); res(); } }); const t0 = Date.now(); while (Date.now() - t0 < 10000 && !(await portFree(CUR_PORT))) await sleep(300); }
const STRONG = { khiHuyet: 20000, vatCong: 6000, vatPhong: 2000, phapCong: 400, phapPhong: 2000, tocDo: 80, minhMan: 100 };
const LC1 = { elements: ['kim'], main: 'kim', count: 1, mutations: [] };
function BASE(token, name, extra) {
  return Object.assign({ token, name, classId: 'kiemtu', gender: 'nam', race: null, geo175: 1, realm: 'tn', tier: 9, x: 1565, y: 1011, mapId: 'lang_tan_thu', hp: 999999, mp: 99999, lifespan: 500, birthDay: -5660, ageStart: 16, stats: { ...STRONG }, statPoints: 0, freePoints: 0, tuVi: 99999, stones: 100000, stonesTrung: 0, stonesThuong: 0, stonesCuc: 0, inventory: {}, gearBag: {}, equipped: [], skills: [], job: null, job2: null, job3: null, linhCan: { ...LC1 }, affinity: {}, affV2: 1, bonds: {}, quests: {}, questsDone: {}, flags: {}, counters: {}, disciples: [], foundInvites: [], reformIn: [], sectTech: [], sectArts: [], sectArtsActive: [], mails: [], classRes: {}, food: 100, water: 100 }, extra || {});
}
let pass = 0, fail = 0;
function ok(name, cond, extra) { if (cond) { pass++; console.log('PASS | ' + name); } else { fail++; console.log('FAIL | ' + name + (extra ? ' | ' + extra : '')); } }
function connect(token) {
  const socket = io(`http://127.0.0.1:${CUR_PORT}`, { transports: ['websocket'] });
  const ctx = { socket, merger: createMerger(), state: null, welcome: null, syncs: [], errs: [], notices: [], maps: [], killed: [], chestEvents: [], myName: null };
  socket.on('connect', () => socket.emit('hello', { token }));
  socket.on('welcome', (w) => { ctx.welcome = w; ctx.myName = (w.character || {}).name; });
  socket.on('char_sync', (s) => ctx.syncs.push(s));
  socket.on('notice', (n) => ctx.notices.push(n.text || ''));
  socket.on('interact_error', (e) => ctx.errs.push(e.message || ''));
  socket.on('map_enter', (m) => ctx.maps.push(m));
  socket.on('monster_killed', (k) => ctx.killed.push(k));
  socket.on('chest_opened', (e) => ctx.chestEvents.push(e));
  socket.on('server_tick', (t) => { const st = ctx.merger(t); if (st) ctx.state = st; });
  return ctx;
}
const lastChar = (c) => { for (let i = c.syncs.length - 1; i >= 0; i--) { if (c.syncs[i]) return c.syncs[i]; } return c.welcome ? c.welcome.character : null; };
const meOf = (c) => { const ps = (c.state && c.state.players) || []; return ps.find((p) => p.name === c.myName) || null; };
const mons = (c) => (c.state && c.state.monsters) || [];
const chestsOf = (c) => (c.state && c.state.chests) || [];
const achBossKills = (c) => { const ch = lastChar(c); return (ch && ch.counters && ch.counters.ach_bossKills) || 0; };
const stonesCucOf = (c) => { const ch = lastChar(c); return ch ? (ch.stonesCuc || 0) : -1; };
const isBossInd = (m) => m.sp === 1 && !m.rare; // cá thể đặc biệt KHÔNG hiếm -> với 18 loài đích (type không minChestGrade) chính là bản mapBoss
async function flyTo(c, tx, ty, tol, ms) {
  c.socket.emit('fly_toggle', {});
  await sleep(400);
  const t0 = Date.now();
  while (Date.now() - t0 < (ms || 60000)) {
    const me = meOf(c); if (!me) { await sleep(150); continue; }
    const dx = tx - me.x, dy = ty - me.y; const d = Math.hypot(dx, dy);
    if (d <= (tol || 60)) break;
    c.socket.emit('client_input', { vx: dx / d, vy: dy / d });
    await sleep(120);
  }
  c.socket.emit('client_input', { vx: 0, vy: 0 });
  c.socket.emit('fly_toggle', {});
  await sleep(400);
}
async function huntByPred(c, kind, pred, ms) {
  const t0 = Date.now(); let flying = false; let targetId = null;
  while (Date.now() - t0 < (ms || 180000)) {
    if (targetId && c.killed.some((k) => k.monsterId === targetId && k.byName === c.myName)) { if (flying) c.socket.emit('fly_toggle', {}); c.socket.emit('client_input', { vx: 0, vy: 0 }); return targetId; }
    const me = meOf(c); if (!me) { await sleep(200); continue; }
    const cands = mons(c).filter((m) => m.kind === kind && pred(m));
    if (!cands.length) { targetId = null; await sleep(300); continue; }
    cands.sort((a, b) => Math.hypot(a.x - me.x, a.y - me.y) - Math.hypot(b.x - me.x, b.y - me.y));
    const t = cands[0]; targetId = t.id;
    const d = Math.hypot(t.x - me.x, t.y - me.y);
    if (d > 58 && !flying) { c.socket.emit('fly_toggle', {}); flying = true; await sleep(300); continue; }
    if (d <= 58 && flying) { c.socket.emit('fly_toggle', {}); flying = false; await sleep(300); continue; }
    if (d > 52) { c.socket.emit('client_input', { vx: (t.x - me.x) / d, vy: (t.y - me.y) / d }); await sleep(120); continue; }
    c.socket.emit('client_input', { vx: 0, vy: 0 });
    c.socket.emit('player_attack', {}); await sleep(550);
  }
  if (flying) { try { c.socket.emit('fly_toggle', {}); } catch (e) {} }
  const me = meOf(c); const t = mons(c).filter((m) => m.kind === kind && pred(m))[0];
  console.log('  [diag hunt ' + kind + '] me=' + (me ? me.x + ',' + me.y + ' hp=' + me.hp : '?') + ' target=' + (t ? t.id + ' ' + t.x + ',' + t.y + ' hp=' + t.hp + '/' + t.maxHp : 'khong thay') + ' killed=' + JSON.stringify(c.killed.slice(-3)));
  return null;
}
async function waitStableKind(c, kind, ms) {
  const t0 = Date.now(); let last = -1, stable = 0;
  while (Date.now() - t0 < (ms || 45000)) {
    const n = mons(c).length;
    if (n === last && n > 0) { stable++; if (stable >= 3 && mons(c).some((m) => m.kind === kind)) return true; }
    else stable = 0;
    last = n;
    await sleep(1000);
  }
  return mons(c).some((m) => m.kind === kind);
}
// Đếm bản trùm của 1 loài trên map hiện tại của ctx (chờ tối đa ms cho đủ 1).
async function bossListOf(c, kind, ms) {
  const b = await waitFor(() => { const l = mons(c).filter((m) => m.kind === kind && isBossInd(m)); return l.length >= 1 ? l : null; }, ms || 20000);
  return b || mons(c).filter((m) => m.kind === kind && isBossInd(m));
}

// 18 map đích: [mapId, kind, tên hiển thị] — hp gốc lấy từ MonsterData trong lúc chạy.
const TARGETS = [
  ['bang_nguyen_dai', 'son_quan_ho'], ['diem_thien_son', 'hoa_van_mang'], ['hac_thuy_dam', 'thiet_giap_te'],
  ['hoa_van_coc', 'thien_nien_xa_yeu'], ['ngu_hanh_thien_cung', 'loi_linh'], ['van_dang_son', 'hoa_vu_phuong_anh'],
  ['chu_thien_chien_truong', 'tu_la_chien_ma'], ['huyet_hai', 'hu_khong_thu'], ['kim_than_nguyen', 'ky_lan_than_anh'],
  ['minh_ha_co', 'coi_am_sat_thu'], ['than_dao_nguyen', 'co_than_thu_tinh'], ['thien_diem_hai', 'thien_hoa_su'],
  ['thuy_than_dam', 'thuy_than_ngu'], ['vo_bien_bang_nguyen', 'con_bang_anh'],
  ['khong_gian_loi', 'khong_gian_xa'], ['nghich_luu_sa_mac', 'hon_don_khoi'], ['thoi_gian_hanh_lang', 'thoi_gian_thu'],
  ['van_co_chien_truong', 'dao_thien_te'],
];
const MD = JSON.parse(fs.readFileSync(path.join(ROOT, 'server/data/gdd/MonsterData.json'), 'utf8'));
const REV_ALIAS = { kiemma: 'kiem_ma', huyetlang: 'huyet_lang', khoiloi: 'thach_khoi_loi', wolf: 'soi_xam', bat: 'doi_den', golem: 'thach_quai' };
function baseHp(kind) { const g = MD.monsters.find((x) => x.id === (REV_ALIAS[kind] || kind)); return g ? g.hp : null; }

// Chân đếm dùng chung: đúng 1 bản trùm (maxHp = số gốc) + cá thể thường còn nguyên.
async function countAssert(c, mapId, kind, label) {
  const entered = c.maps.some((m) => m.mapId === mapId) || (c.welcome && c.welcome.character && c.welcome.character.mapId === mapId);
  ok(label + ': nhân vật vào đúng map ' + mapId, entered, 'maps=' + JSON.stringify(c.maps.map((m) => m.mapId)));
  await waitStableKind(c, kind, 90000);
  const boss = await bossListOf(c, kind, 30000);
  const all = mons(c).filter((m) => m.kind === kind);
  const hp = baseHp(kind);
  ok(label + ': đúng 1 bản trùm ' + kind + ' (sp=1, không hiếm), maxHp=' + hp + ' (số gốc loài)', boss.length === 1 && boss[0].maxHp === hp, 'tong=' + all.length + ' sp=' + JSON.stringify(all.map((m) => [m.sp, !!m.rare, m.maxHp])));
  ok(label + ': cá thể thường ' + kind + ' còn nguyên (có cá thể sp=0)', all.some((m) => m.sp === 0), 'tong=' + all.length);
  return boss[0] || null;
}

// Chân hạ trùm dùng chung: đối chứng thường -> hạ trùm -> counters + rương trùm.
async function killLeg(c, mapId, kind, label, withControl) {
  const boss = await countAssert(c, mapId, kind, label);
  if (!boss) { ok(label + ': hạ được bản trùm', false, 'khong thay ban trum'); return null; }
  const before = achBossKills(c);
  if (withControl) {
    const killedNorm = await huntByPred(c, kind, (m) => !m.sp, 300000);
    ok(label + ' (đối chứng): hạ được cá thể thường ' + kind, !!killedNorm, JSON.stringify(c.killed.slice(-2)));
    await sleep(2000);
    ok(label + ' (đối chứng): ach_bossKills GIỮ NGUYÊN sau khi hạ cá thể thường', achBossKills(c) === before, 'before=' + before + ' after=' + achBossKills(c));
  }
  const chestIdsBefore = new Set(chestsOf(c).map((x) => x.id));
  const killedBoss = await huntByPred(c, kind, isBossInd, 300000);
  const T0 = Date.now();
  ok(label + ': hạ được bản trùm ' + kind, !!killedBoss && killedBoss === boss.id, 'killed=' + JSON.stringify(c.killed.slice(-2)) + ' bossId=' + boss.id);
  const prog = await waitFor(() => achBossKills(c) === before + 1 ? true : null, 10000);
  ok(label + ': ach_bossKills +1 (họ nhiệm vụ/thành tựu trùm nhận diện bản trùm mới)', !!prog, 'before=' + before + ' after=' + achBossKills(c));
  const me = meOf(c);
  const newChest = await waitFor(() => { const l = chestsOf(c).filter((x) => !chestIdsBefore.has(x.id) && (x.grade === 'A' || x.grade === 'B')); if (!l.length) return null; if (me) l.sort((a, b) => Math.hypot(a.x - me.x, a.y - me.y) - Math.hypot(b.x - me.x, b.y - me.y)); return l[0]; }, 15000);
  ok(label + ': rương trùm phẩm >= B rơi tại chỗ hạ', !!newChest, 'chests=' + JSON.stringify(chestsOf(c).map((x) => [x.grade, Math.round(x.x), Math.round(x.y)])));
  if (newChest) {
    const cucBefore = stonesCucOf(c);
    const evBefore = c.chestEvents.length;
    await flyTo(c, newChest.x, newChest.y, 20, 30000);
    const opened = await waitFor(() => c.chestEvents.length > evBefore ? c.chestEvents[c.chestEvents.length - 1] : null, 10000);
    ok(label + ': mở được rương trùm', !!opened, 'loot=' + (opened ? JSON.stringify(opened.loot) : ''));
    const cucUp = await waitFor(() => stonesCucOf(c) > cucBefore ? true : null, 10000);
    ok(label + ': rương trùm ra Linh thạch CỰC PHẨM (stonesCuc tăng)', !!cucUp, 'cucBefore=' + cucBefore + ' cucAfter=' + stonesCucOf(c) + ' loot=' + (opened ? JSON.stringify(opened.loot) : ''));
  }
  return T0;
}

(async () => {
  try {
    const chars = {};
    TARGETS.forEach(([mid], i) => { const tk = 'tk367c' + String(i + 1).padStart(2, '0'); chars[tk] = BASE(tk, 'P367Dem' + String(i + 1).padStart(2, '0'), { mapId: mid, x: 4250, y: 3200 }); });
    chars['tk367kna1'] = BASE('tk367kna1', 'P367SanNA', { mapId: 'bang_nguyen_dai', x: 4250, y: 3200, job: { jobId: 'thusu', crafts: 10 }, inventory: { thit_thu: 5, thit_nuong: 5, linh_thao: 5, tien_linh_chi: 5, thanh_thao: 5, xuong_thu: 5 } });
    chars['tk367kht1'] = BASE('tk367kht1', 'P367SanHT', { mapId: 'minh_ha_co', x: 4250, y: 3200 });
    chars['tk367kph1'] = BASE('tk367kph1', 'P367SanPH', { mapId: 'thoi_gian_hanh_lang', x: 4250, y: 3200 });
    chars['tk367r001'] = BASE('tk367r001', 'P367HoiML', { mapId: 'thanh_moc_lam', x: 400, y: 400 });
    chars['tk367r002'] = BASE('tk367r002', 'P367HoiHS', { mapId: 'huyet_sac_rung', x: 4248, y: 2950 });
    chars['tk367r003'] = BASE('tk367r003', 'P367HoiLD', { realm: 'kd', mapId: 'loi_dinh_son_coc', x: 2400, y: 3000 });
    chars['tk367r004'] = BASE('tk367r004', 'P367HoiTL', { x: 1565, y: 1011 });
    fs.writeFileSync(path.join(DIR, 'characters.json'), JSON.stringify(chars));
    fs.writeFileSync(path.join(DIR, 'accounts.json'), '{}');
    fs.writeFileSync(path.join(DIR, 'world.json'), JSON.stringify({ totalMinutes: 3360, savedAt: Date.now() }));
    fs.writeFileSync(path.join(DIR, 'sessions.json'), '{}');
    await startServer(3744, '367a');

    // ---- Chân 0: boot log + /api/status ----
    const bootLog = fs.readFileSync(path.join(DIR, 'srv_367a.log'), 'utf8');
    const spawnLine = bootLog.split('\n').find((l) => l.includes('Đã sinh quái')) || '';
    ok('chân 0a: boot log — 65 entry trùm, tổng 2948 quái (trước vá 47/2930)', spawnLine.includes('65 map có trùm') && spawnLine.includes('tổng 2948 quái'), spawnLine.trim());
    const st0 = await (await fetch(`http://127.0.0.1:${CUR_PORT}/api/status`)).json();
    ok('chân 0b: /api/status monsters = 2948 (+18 bản trùm mới)', st0.monsters === 2948, 'monsters=' + st0.monsters);

    // ---- Chân PH trước (khởi động đồng hồ hồi sinh 600s) ----
    const cPH = connect('tk367kph1'); await waitFor(() => cPH.welcome, 20000); await waitFor(() => meOf(cPH), 8000);
    const T0 = await killLeg(cPH, 'thoi_gian_hanh_lang', 'thoi_gian_thu', 'PH thoi_gian_hanh_lang', true);
    cPH.socket.disconnect();

    // ---- Chân NA: Duyên Nợ + thuần hóa bị chặn + hạ trùm ----
    const cNA = connect('tk367kna1'); await waitFor(() => cNA.welcome, 20000); await waitFor(() => meOf(cNA), 8000);
    {
      const bossNA = await countAssert(cNA, 'bang_nguyen_dai', 'son_quan_ho', 'NA bang_nguyen_dai');
      if (bossNA) {
        // Duyên Nợ: bay tới gần rồi cho ăn món ưa thích (pool đủ 6 món trong túi)
        let fed = null;
        const t0f = Date.now();
        while (Date.now() - t0f < 120000 && !fed) {
          const b = mons(cNA).find((m) => m.kind === 'son_quan_ho' && isBossInd(m));
          const me = meOf(cNA);
          if (!b || !me) { await sleep(300); continue; }
          if (Math.hypot(b.x - me.x, b.y - me.y) > 200) { await flyTo(cNA, b.x, b.y, 150, 30000); continue; }
          cNA.socket.emit('bond_feed', { monsterId: b.id });
          fed = await waitFor(() => cNA.notices.some((x) => x.includes('thiện cảm')) ? true : null, 5000);
          if (!fed) await sleep(500);
        }
        const chNA = lastChar(cNA);
        const bondScore = chNA && chNA.bonds && chNA.bonds['m:son_quan_ho'] ? chNA.bonds['m:son_quan_ho'].score : null;
        ok('NA (Duyên Nợ): cho bản trùm Sơn Quân Hổ ăn -> thiện cảm loài tăng (notice + điểm bonds)', !!fed && bondScore >= 15, 'notices=' + JSON.stringify(cNA.notices.slice(-3)) + ' bondScore=' + bondScore + ' errs=' + JSON.stringify(cNA.errs.slice(-2)));
        // Thuần hóa: phải bị cổng trùm chặn
        cNA.socket.emit('tame_beast', { monsterId: bossNA.id });
        const tameBlocked = await waitFor(() => cNA.errs.some((x) => x.includes('Không thuần hóa được trùm')) ? true : null, 6000);
        ok('NA: tame_beast lên bản trùm -> bị chặn "Không thuần hóa được trùm."', !!tameBlocked, 'errs=' + JSON.stringify(cNA.errs.slice(-3)));
      }
    }
    await killLeg(cNA, 'bang_nguyen_dai', 'son_quan_ho', 'NA bang_nguyen_dai (hạ trùm)', false);
    cNA.socket.disconnect();

    // ---- Chân HT: hạ trùm ----
    const cHT = connect('tk367kht1'); await waitFor(() => cHT.welcome, 20000); await waitFor(() => meOf(cHT), 8000);
    await killLeg(cHT, 'minh_ha_co', 'coi_am_sat_thu', 'HT minh_ha_co', false);
    cHT.socket.disconnect();

    // ---- Chân đếm 15 map còn lại (trừ 3 map đã đếm ở chân hạ trùm) ----
    const counted = new Set(['thoi_gian_hanh_lang', 'bang_nguyen_dai', 'minh_ha_co']);
    for (let i = 0; i < TARGETS.length; i++) {
      const [mid, kind] = TARGETS[i];
      if (counted.has(mid)) continue;
      const tk = 'tk367c' + String(i + 1).padStart(2, '0');
      const cc = connect(tk); await waitFor(() => cc.welcome, 20000); await waitFor(() => meOf(cc), 8000);
      await countAssert(cc, mid, kind, 'Đếm ' + mid);
      cc.socket.disconnect();
    }

    // ---- Chân hồi quy GĐ363 ----
    const reg = [
      ['tk367r001', 'thanh_moc_lam', [['lam_tru', 90], ['sam_lam_cu_mang', null]]],
      ['tk367r002', 'huyet_sac_rung', [['doc_xa', 55], ['huyetlang', 350]]],
      ['tk367r003', 'loi_dinh_son_coc', [['loi_dieu', 300], ['huyen_anh_mieu', null]]],
      ['tk367r004', 'lang_tan_thu', [['kiemma', 420], ['huyetlang', 350], ['khoiloi', null]]],
    ];
    for (const [tk, mid, kinds] of reg) {
      const cr = connect(tk); await waitFor(() => cr.welcome, 20000); await waitFor(() => meOf(cr), 8000);
      for (const [kind, hp] of kinds) {
        await waitStableKind(cr, kind, 60000);
        const b = await bossListOf(cr, kind, 45000);
        const exp = hp || baseHp(kind);
        ok('Hồi quy ' + mid + ': trùm cũ ' + kind + ' còn nguyên đúng 1 bản' + (exp ? ' (maxHp=' + exp + ')' : ''), b.length === 1 && (exp ? b[0].maxHp === exp : true), 'sp=' + JSON.stringify(mons(cr).filter((m) => m.kind === kind).map((m) => [m.sp, !!m.rare, m.maxHp])));
      }
      cr.socket.disconnect();
    }

    // ---- Chân hồi sinh PH: T0 + 600s ----
    if (T0) {
      const remainMs = T0 + 600000 + 30000 - Date.now();
      console.log('  [respawn] chờ thêm ' + Math.max(0, Math.round(remainMs / 1000)) + 's tới mốc T0+630s');
      const cR = connect('tk367kph1'); await waitFor(() => cR.welcome, 20000); await waitFor(() => meOf(cR), 8000);
      const back = await waitFor(() => { const b = mons(cR).filter((m) => m.kind === 'thoi_gian_thu' && isBossInd(m)); return b.length === 1 ? b[0] : null; }, Math.max(60000, remainMs + 120000));
      ok('Hồi sinh: bản trùm Thời Gian Thú trở lại sau ~600s, vẫn đúng 1 cá thể (sp=1, không hiếm)', !!back, 'sp=' + JSON.stringify(mons(cR).filter((m) => m.kind === 'thoi_gian_thu').map((m) => [m.sp, !!m.rare])));
      cR.socket.disconnect();
    } else {
      ok('Hồi sinh: bản trùm Thời Gian Thú trở lại sau ~600s', false, 'khong co T0 (chân hạ trùm PH lỗi)');
    }

    console.log(`\nKẾT QUẢ GĐ367: ${pass} PASS / ${fail} FAIL`);
    await stopServer();
    process.exit(fail ? 1 : 0);
  } catch (e) {
    console.log('PROBE ERROR:', e && e.stack || e);
    try { await stopServer(); } catch (e2) {}
    process.exit(2);
  }
})();
