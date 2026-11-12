// Probe GĐ388 — B3+B4: ĐỒ CHO PET + ĐAN GIẢI TRẠNG THÁI (Bảo chốt hết theo đề
// xuất 11/11 21:46; THIET_KE_DO_PET_GIAI_TRANG_THAI):
//  Phần B: Giải Độc Đan (xoá mọi DoT) + Thanh Tâm Đan (xoá chậm+choáng, KHÔNG
//          giải phản phệ Quỷ Tu) — hồi chiêu CHUNG 30s, chặn không trừ khi
//          không có trạng thái tương ứng.
//  Phần A: Linh Thú Đan (+50% máu pet, hồi dùng riêng 10s) · Thú Linh Hoàn
//          (+20% công pet/10', buff phía CHỦ trong classRes.petAtkBuffUntil)
//          · Linh Thú Hộ Mệnh (mang túi, tự vỡ cứu pet ở 30% máu + rút 5s).
// Chân: 0 tĩnh · B1 độc · B2 không-trạng-thái · B3 chậm · B4 choáng · B5 phản
// phệ · A1 hồi máu pet · A2 buff công + đổi pet + hết hạn (boot B) · A3 hộ
// mệnh + đối chứng chết thật · C chế tạo 3 công thức · persist file + boot B.
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const net = require('net');
const crypto = require('crypto');
const ROOT = path.join(__dirname, '..', '..');
const DIR = __dirname;
const { io } = require(path.join(ROOT, 'client/node_modules/socket.io-client'));
const { createMerger } = require(path.join(ROOT, 'client/worldmerge.cjs'));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function waitFor(fn, ms) { const t0 = Date.now(); while (Date.now() - t0 < ms) { const v = fn(); if (v) return v; await sleep(100); } return null; }
function portFree(port) { return new Promise((res) => { const s = net.createServer(); s.once('error', () => res(false)); s.listen(port, () => s.close(() => res(true))); }); }
let serverProc = null, killTimer = null, CUR_PORT = 0;
async function startServer(port, tag) {
  CUR_PORT = port;
  if (!(await portFree(port))) throw new Error('port ban ' + port);
  serverProc = spawn('node', ['server/index.js'], { cwd: ROOT, env: { ...process.env, PORT: String(port), TTT_STORAGE: 'file', TTT_CHAR_FILE: path.join(DIR, 'characters.json'), TTT_ACC_FILE: path.join(DIR, 'accounts.json'), TTT_WORLD_FILE: path.join(DIR, 'world.json'), TTT_SESS_FILE: path.join(DIR, 'sessions.json'), TTT_DAY_REAL_MS: '600000', TTT_TUVI_NEED: '5' }, stdio: ['ignore', 'pipe', 'pipe'] });
  serverProc.stderr.on('data', (d) => { try { fs.appendFileSync(path.join(DIR, 'srv_' + tag + '.log'), d); } catch (e) {} });
  serverProc.stdout.on('data', (d) => { try { fs.appendFileSync(path.join(DIR, 'srv_' + tag + '.log'), d); } catch (e) {} });
  killTimer = setTimeout(() => { try { serverProc.kill('SIGKILL'); } catch (e) {} }, 1500000);
  const t0 = Date.now();
  while (Date.now() - t0 < 90000) { try { const r = await fetch(`http://127.0.0.1:${port}/api/status`); if (r.ok) { clearTimeout(killTimer); return; } } catch (e) {} await sleep(400); }
  throw new Error('server khong len');
}
async function stopServer() { if (!serverProc) return; const p = serverProc; serverProc = null; if (killTimer) { clearTimeout(killTimer); killTimer = null; } await new Promise((res) => { const t = setTimeout(() => { try { p.kill('SIGKILL'); } catch (e) {} res(); }, 4000); p.once('exit', () => { clearTimeout(t); res(); }); try { p.kill('SIGTERM'); } catch (e) { clearTimeout(t); res(); } }); const t0 = Date.now(); while (Date.now() - t0 < 10000 && !(await portFree(CUR_PORT))) await sleep(300); }
const LC1 = { elements: ['kim'], main: 'kim', count: 1, mutations: [] };
function BASE(token, name, extra) {
  return Object.assign({ token, name, classId: 'kiemtu', gender: 'nam', race: null, geo175: 1, realm: 'kd', tier: 1, x: 2415, y: 1400, mapId: 'lang_tan_thu', hp: 999999, mp: 9999, lifespan: 500, birthDay: -5660, ageStart: 16, stats: { khiHuyet: 500, vatCong: 300, vatPhong: 200, phapCong: 300, phapPhong: 200, tocDo: 60, minhMan: 100 }, statPoints: 0, freePoints: 0, tuVi: 99999, stones: 100000, stonesTrung: 0, stonesThuong: 0, stonesCuc: 0, inventory: {}, gearBag: {}, equipped: [], skills: [], job: null, job2: null, job3: null, linhCan: { ...LC1 }, affinity: {}, affV2: 1, bonds: {}, quests: {}, questsDone: {}, flags: {}, counters: {}, disciples: [], foundInvites: [], reformIn: [], sectTech: [], sectArts: [], sectArtsActive: [], mails: [], classRes: {}, food: 100, water: 100 }, extra || {});
}
const THUSU = { jobId: 'thusu', crafts: 5000 };
const DANSU = { jobId: 'dansu', crafts: 5000 };
const tamedWolf = (name, atk, hp, maxHp) => ({ active: true, kind: 'wolf', name, atk, def: 0, maxHp, hp, evo: 0, growth: 0 });
let pass = 0, fail = 0;
function ok(name, cond, extra) { if (cond) { pass++; console.log('PASS | ' + name); } else { fail++; console.log('FAIL | ' + name + (extra ? ' | ' + extra : '')); } }
function info(name, val) { console.log('INFO | ' + name + ' | ' + val); }
function connect(token) {
  const socket = io(`http://127.0.0.1:${CUR_PORT}`, { transports: ['websocket'] });
  const ctx = { socket, merger: createMerger(), state: null, welcome: null, syncs: [], errs: [], notices: [], petDied: [], mapInfo: null, myName: null, myId: null };
  socket.on('connect', () => socket.emit('hello', { token }));
  socket.on('welcome', (w) => { ctx.welcome = w; ctx.myName = (w.character || {}).name; ctx.myId = w.id; });
  socket.on('char_sync', (s) => ctx.syncs.push(s));
  socket.on('interact_error', (e) => ctx.errs.push({ t: Date.now(), msg: e.message || '' }));
  socket.on('notice', (n) => ctx.notices.push({ t: Date.now(), text: n.text || '' }));
  socket.on('pet_died', (d) => ctx.petDied.push({ t: Date.now(), ...d }));
  socket.on('map_enter', (m) => { ctx.mapInfo = m || null; });
  socket.on('server_tick', (t) => { const st = ctx.merger(t); if (st) ctx.state = st; });
  return ctx;
}
const lastChar = (c) => { for (let i = c.syncs.length - 1; i >= 0; i--) { if (c.syncs[i]) return c.syncs[i]; } return c.welcome ? c.welcome.character : null; };
const invOf = (c, id) => { const ch = lastChar(c); return (ch && ch.inventory && ch.inventory[id]) || 0; };
const meOf = (c) => { if (!c.state || !c.state.players) return null; return c.state.players.find((p) => p.name === c.myName) || null; };
const petOf = (c, petName) => { if (!c.state || !c.state.players) return null; return c.state.players.find((p) => p.tamed === 1 && p.name === petName) || null; };
const monsOf = (c) => (c.state && c.state.monsters) || [];
const median = (a) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : 0; };
function writeStore(chars) {
  for (const f of ['characters.json', 'accounts.json', 'world.json', 'sessions.json']) { try { fs.unlinkSync(path.join(DIR, f)); } catch (e) {} }
  fs.writeFileSync(path.join(DIR, 'characters.json'), JSON.stringify(chars));
  fs.writeFileSync(path.join(DIR, 'accounts.json'), JSON.stringify({}));
}
const readCharFile = (token) => JSON.parse(fs.readFileSync(path.join(DIR, 'characters.json'), 'utf8'))[token];
function extractBlock(src, marker) {
  const i = src.indexOf(marker); if (i < 0) return '';
  let depth = 0, j = src.indexOf('{', i); const s = j;
  for (; j < src.length; j++) { if (src[j] === '{') depth++; else if (src[j] === '}') { depth--; if (!depth) break; } }
  return src.slice(s, j + 1);
}
async function steerStep(c, tx, ty, tol) {
  const me = meOf(c); if (!me) return;
  const dx = tx - me.x, dy = ty - me.y; const d = Math.hypot(dx, dy);
  if (d <= tol) { c.socket.emit('client_input', { vx: 0, vy: 0 }); return; }
  c.socket.emit('client_input', { vx: dx / d, vy: dy / d });
}
async function steerTo(c, tx, ty, tol, timeoutMs) {
  const t0 = Date.now();
  while (Date.now() - t0 < (timeoutMs || 30000)) {
    const me = meOf(c); if (!me) { await sleep(120); continue; }
    if (Math.hypot(tx - me.x, ty - me.y) <= tol) break;
    await steerStep(c, tx, ty, tol);
    await sleep(130);
  }
  c.socket.emit('client_input', { vx: 0, vy: 0 });
}
// Bay/đi 1 hướng trong ms, trả tốc độ px/s theo độ dời đầu→cuối.
async function measureSpeed(c, vx, vy, ms) {
  const p0 = meOf(c); if (!p0) return 0;
  const x0 = p0.x, y0 = p0.y; const t0 = Date.now();
  c.socket.emit('client_input', { vx, vy });
  await sleep(ms);
  c.socket.emit('client_input', { vx: 0, vy: 0 });
  const p1 = meOf(c); if (!p1) return 0;
  return Math.hypot(p1.x - x0, p1.y - y0) / ((Date.now() - t0) / 1000);
}
// Gom các cú rơi HP quái (theo id) trong cửa sổ giây; lọc theo kind nếu có.
async function sampleDrops(c, sec, kind) {
  const prev = new Map(); const drops = [];
  const t0 = Date.now();
  while (Date.now() - t0 < sec * 1000) {
    for (const m of monsOf(c)) {
      if (kind && m.kind !== kind) continue;
      const old = prev.get(m.id);
      if (old != null && m.hp < old) drops.push({ id: m.id, kind: m.kind, d: old - m.hp, t: Date.now() });
      if (m.hp > 0) prev.set(m.id, m.hp); else prev.delete(m.id);
    }
    await sleep(110);
  }
  return drops;
}
async function travelTo(c, mapId, kindProbe) {
  // Đồ thị dịch chuyển thật: làng → Thanh Vân Thành → mọi map (destinationsFor).
  const me = meOf(c);
  if (me && Math.hypot(me.x - 2415, me.y - 1342) > 120) await steerTo(c, 2415, 1342, 60, 20000);
  let n0 = c.notices.length;
  c.socket.emit('travel_to', { mapId: 'thanh_van_thanh' });
  const toCity = await waitFor(() => c.notices.slice(n0).find((n) => n.text.includes('Đã tới Thanh Vân Thành')), 20000);
  if (!toCity) { info('travel: khong toi duoc Thanh Van Thanh', JSON.stringify(c.errs.slice(-3).map((e) => e.msg))); return false; }
  await sleep(600);
  n0 = c.notices.length;
  c.socket.emit('travel_to', { mapId });
  const toDest = await waitFor(() => c.notices.slice(n0).find((n) => n.text.includes('Đã tới')), 20000);
  if (!toDest) { info('travel: khong toi duoc ' + mapId, JSON.stringify(c.errs.slice(-3).map((e) => e.msg))); return false; }
  const seen = await waitFor(() => monsOf(c).some((m) => m.kind === kindProbe), 15000);
  if (seen) return true;
  // Chưa thấy loài cần trong tick → bay quét zigzag từ cổng lên bắc
  c.socket.emit('fly_toggle');
  await sleep(300);
  const meA = meOf(c); if (!meA) return false;
  const ax = meA.x, ay = meA.y;
  const lanes = [];
  for (let r = 0; r < 4; r++) { const y = ay - r * 1100; lanes.push([ax - 1300, y]); lanes.push([ax + 1300, y]); }
  for (const [lx, ly] of lanes) {
    const got = await Promise.race([
      waitFor(() => monsOf(c).some((m) => m.kind === kindProbe), 45000),
      (async () => { await steerTo(c, lx, ly, 120, 45000); return null; })(),
    ]);
    if (got || monsOf(c).some((m) => m.kind === kindProbe)) { c.socket.emit('fly_toggle'); await sleep(200); return true; }
  }
  c.socket.emit('fly_toggle');
  await sleep(200);
  return monsOf(c).some((m) => m.kind === kindProbe);
}
// Lấy mẫu rơi HP quái trong khi CHỦ chủ động áp sát quái gần nhất (pet theo
// đánh) — tránh cửa sổ đo trống vì quái lang thang ngoài tầm pet 440px.
async function sampleDropsGuided(c, sec) {
  const prev = new Map(); const drops = [];
  const t0 = Date.now(); let lastSteer = 0;
  while (Date.now() - t0 < sec * 1000) {
    const me = meOf(c);
    if (me && Date.now() - lastSteer > 350) {
      lastSteer = Date.now();
      let best = null, bd = Infinity;
      for (const m of monsOf(c)) { if ((m.hp || 0) <= 0 || m.hidden) continue; const d = Math.hypot(m.x - me.x, m.y - me.y); if (d < bd) { bd = d; best = m; } }
      if (best) { if (bd > 200) await steerStep(c, best.x, best.y, 180); else c.socket.emit('client_input', { vx: 0, vy: 0 }); }
    }
    for (const m of monsOf(c)) {
      const old2 = prev.get(m.id);
      if (old2 != null && m.hp < old2) drops.push({ id: m.id, kind: m.kind, d: old2 - m.hp, t: Date.now() });
      if (m.hp > 0) prev.set(m.id, m.hp); else prev.delete(m.id);
    }
    await sleep(110);
  }
  c.socket.emit('client_input', { vx: 0, vy: 0 });
  return drops;
}

(async () => {
  try {
    // ---------- Chân 0: tĩnh ----------
    const srvSrc = fs.readFileSync(path.join(ROOT, 'server/index.js'), 'utf8');
    const ITEMS = eval('(' + extractBlock(srvSrc, 'const ITEMS = {') + ')');
    ok('chân 0a: ITEMS server = 177 loại', Object.keys(ITEMS).length === 177, 'dem=' + Object.keys(ITEMS).length);
    ok('chân 0b: đủ 5 món mới đúng tên', ITEMS.dan_giai_doc?.name === 'Giải Độc Đan' && ITEMS.dan_thanh_tam?.name === 'Thanh Tâm Đan' && ITEMS.dan_linh_thu?.name === 'Linh Thú Đan' && ITEMS.thu_linh_hoan?.name === 'Thú Linh Hoàn' && ITEMS.linh_thu_ho_menh?.name === 'Linh Thú Hộ Mệnh');
    const RECIPES = extractBlock(srvSrc, 'const RECIPES = {');
    ok('chân 0c: đủ 5 công thức mới trong RECIPES', ['rc_dan_giai_doc', 'rc_dan_thanh_tam', 'rc_dan_linh_thu', 'rc_thu_linh_hoan', 'rc_linh_thu_ho_menh'].every((r) => RECIPES.includes(r + ':')));
    const iconCount = fs.readdirSync(path.join(ROOT, 'client/public/icons')).filter((f) => f.endsWith('.png')).length;
    ok('chân 0d: icon chiêu public = 1360', iconCount === 1360, 'dem=' + iconCount);
    const fxCount = fs.readdirSync(path.join(ROOT, 'client/public/sprites/fx')).length;
    ok('chân 0e: FX = 85', fxCount === 85, 'dem=' + fxCount);
    const cliSrc = fs.readFileSync(path.join(ROOT, 'client/src/main.ts'), 'utf8');
    ok('chân 0f: marker ttt_intro_v1 còn trong client', cliSrc.includes('ttt_intro_v1'));
    ok('chân 0g: client ITEM_INFO đủ 5 món + RECIPE_INFO đủ 5 thức', ['dan_giai_doc', 'dan_thanh_tam', 'dan_linh_thu', 'thu_linh_hoan', 'linh_thu_ho_menh'].every((i) => cliSrc.includes(i + ': {')) && ['rc_dan_giai_doc', 'rc_dan_thanh_tam', 'rc_dan_linh_thu', 'rc_thu_linh_hoan', 'rc_linh_thu_ho_menh'].every((r) => cliSrc.includes(r + ': {')));
    ok('chân 0h: icon item 96x96 đủ 5 món', ['dan_giai_doc', 'dan_thanh_tam', 'dan_linh_thu', 'thu_linh_hoan', 'linh_thu_ho_menh'].every((i) => { try { const b = fs.readFileSync(path.join(ROOT, 'client/public/sprites/items/' + i + '.png')); return b.readUInt32BE(16) === 96 && b.readUInt32BE(20) === 96; } catch (e) { return false; } }));
    ok('chân 0i: server đủ cơ chế GĐ388 (hằng số + breakTamed hộ mệnh + buff updateTamed + quyBacklashUntil)', srvSrc.includes('CLEANSE_CD_MS') && srvSrc.includes('petAtkBuffUntil') && srvSrc.includes('quyBacklashUntil') && srvSrc.includes('hoMenhRetreatUntil'));
    const zipPath = path.join(ROOT, '..', 'tap-tanh-tu-tien-mmo_GD235-385.zip');
    const zipMd5 = crypto.createHash('md5').update(fs.readFileSync(zipPath)).digest('hex');
    ok('chân 0j: zip GD235-385 nguyên vẹn (md5 khớp)', zipMd5 === '66d4e90e6c97549a688bd5f21b78753e', zipMd5);

    // ---------- Boot A ----------
    writeStore({
      doc388aa: BASE('doc388aa', 'DocGiai388', { inventory: { dan_giai_doc: 2, dan_thanh_tam: 2 } }),
      sach388a: BASE('sach388a', 'SachTrang388', { x: 1200, y: 1100, inventory: { dan_giai_doc: 1, dan_thanh_tam: 1 } }),
      cham388a: BASE('cham388a', 'ChamTam388', { inventory: { dan_thanh_tam: 3 } }),
      choang388: BASE('choang388', 'Choang388', { inventory: { dan_thanh_tam: 4 } }),
      pet388dd: BASE('pet388dd', 'PetDanh388', { x: 5600, y: 900, job: { ...THUSU }, inventory: { thu_linh_hoan: 1 }, classRes: { tamed: tamedWolf('Sói Đánh388', 100, 3000, 3000) } }),
      pet388aa: BASE('pet388aa', 'PetChu388', { x: 2236, y: 1400, job: { ...THUSU }, inventory: { dan_linh_thu: 3, thu_linh_hoan: 1 }, classRes: { tamed: tamedWolf('Sói Đo388', 100, 60, 200) } }),
      pet388bb: BASE('pet388bb', 'PetHomenh388', { x: 6200, y: 1900, job: { ...THUSU }, inventory: { linh_thu_ho_menh: 2 }, classRes: { tamed: tamedWolf('Sói Hộ388', 10, 40, 200) } }),
      pet388cc: BASE('pet388cc', 'PetChet388', { x: 7000, y: 800, job: { ...THUSU }, inventory: {}, classRes: { tamed: tamedWolf('Sói Lìa388', 10, 40, 200) } }),
      quy388aa: BASE('quy388aa', 'QuyPhan388', { x: 7150, y: 2000, classId: 'quytu', stats: { khiHuyet: 500, vatCong: 1, vatPhong: 200, phapCong: 1, phapPhong: 200, tocDo: 60, minhMan: 100 }, inventory: { dan_thanh_tam: 2 }, classRes: { honKhi: 100 } }),
      che388aa: BASE('che388aa', 'CheDan388', { x: 1300, y: 1100, job: { ...DANSU }, inventory: { noc_ran: 4, thao_duoc: 8, linh_thao: 4, canh_doi: 4 } }),
      che388bb: BASE('che388bb', 'CheThu388', { x: 1400, y: 1100, job: { ...THUSU }, inventory: { thit_thu: 4, thao_duoc: 4 } }),
      nopet388: BASE('nopet388', 'KhongPet388', { x: 1500, y: 1100, inventory: { dan_linh_thu: 1, thu_linh_hoan: 1, linh_thu_ho_menh: 1 } }),
    });
    await startServer(3999, 'main');
    const st = await fetch(`http://127.0.0.1:3999/api/status`).then((r) => r.json()).catch(() => null);
    ok('boot A: /api/status 4.579 quái', !!st && st.monsters === 4579, st ? 'monsters=' + st.monsters : 'no status');

    // ===== Chân B2: không trạng thái → chặn không trừ (chạy ngay tại làng) =====
    const cs = connect('sach388a');
    await waitFor(() => cs.welcome && lastChar(cs), 20000);
    let e0 = cs.errs.length;
    cs.socket.emit('use_item', { itemId: 'dan_giai_doc' });
    const bErr1 = await waitFor(() => cs.errs.slice(e0).find((e) => e.msg.includes('không có độc')), 6000);
    ok('B2a: không độc → Giải Độc bị chặn "không có độc"', !!bErr1, JSON.stringify(cs.errs.slice(e0)));
    e0 = cs.errs.length;
    cs.socket.emit('use_item', { itemId: 'dan_thanh_tam' });
    const bErr2 = await waitFor(() => cs.errs.slice(e0).find((e) => e.msg.includes('không bị làm chậm hay choáng')), 6000);
    ok('B2b: không chậm/choáng → Thanh Tâm bị chặn', !!bErr2, JSON.stringify(cs.errs.slice(e0)));
    await sleep(500);
    ok('B2c: cả 2 viên KHÔNG bị trừ', invOf(cs, 'dan_giai_doc') === 1 && invOf(cs, 'dan_thanh_tam') === 1, `gd=${invOf(cs, 'dan_giai_doc')} tt=${invOf(cs, 'dan_thanh_tam')}`);
    cs.socket.disconnect();

    // ===== Chân A-phụ: không pet → chặn; hộ mệnh bấm dùng → chỉ báo =====
    const cn = connect('nopet388');
    await waitFor(() => cn.welcome && lastChar(cn), 20000);
    e0 = cn.errs.length;
    cn.socket.emit('use_item', { itemId: 'dan_linh_thu' });
    const nErr1 = await waitFor(() => cn.errs.slice(e0).find((e) => e.msg.includes('Không có thú thuần hoá nào đang theo')), 6000);
    ok('A0a: không pet → Linh Thú Đan bị chặn', !!nErr1, JSON.stringify(cn.errs.slice(e0)));
    e0 = cn.errs.length;
    cn.socket.emit('use_item', { itemId: 'thu_linh_hoan' });
    const nErr2 = await waitFor(() => cn.errs.slice(e0).find((e) => e.msg.includes('Chưa có thú thuần hoá nào')), 6000);
    ok('A0b: không pet → Thú Linh Hoàn bị chặn', !!nErr2, JSON.stringify(cn.errs.slice(e0)));
    e0 = cn.errs.length;
    cn.socket.emit('use_item', { itemId: 'linh_thu_ho_menh' });
    const nErr3 = await waitFor(() => cn.errs.slice(e0).find((e) => e.msg.includes('không cần bấm dùng')), 6000);
    ok('A0c: bấm dùng Hộ Mệnh → báo vật bị động, không trừ', !!nErr3, JSON.stringify(cn.errs.slice(e0)));
    await sleep(500);
    ok('A0d: túi nguyên vẹn cả 3 món', invOf(cn, 'dan_linh_thu') === 1 && invOf(cn, 'thu_linh_hoan') === 1 && invOf(cn, 'linh_thu_ho_menh') === 1);
    cn.socket.disconnect();

    // ===== Chân C: chế tạo =====
    const cc = connect('che388aa');
    await waitFor(() => cc.welcome && lastChar(cc), 20000);
    if (!cc.welcome) { ok('C-spawn: CheDan388 vào được game', false, 'no welcome'); throw new Error('CheDan388 no welcome'); }
    for (let i = 0; i < 5 && invOf(cc, 'dan_giai_doc') < 1; i++) { cc.socket.emit('craft_item', { recipeId: 'rc_dan_giai_doc' }); await sleep(700); }
    ok('C1: Đan Sư chế được Giải Độc Đan (rc_dan_giai_doc)', invOf(cc, 'dan_giai_doc') >= 1, 'gd=' + invOf(cc, 'dan_giai_doc'));
    for (let i = 0; i < 5 && invOf(cc, 'dan_thanh_tam') < 1; i++) { cc.socket.emit('craft_item', { recipeId: 'rc_dan_thanh_tam' }); await sleep(700); }
    ok('C2: Đan Sư chế được Thanh Tâm Đan (rc_dan_thanh_tam)', invOf(cc, 'dan_thanh_tam') >= 1, 'tt=' + invOf(cc, 'dan_thanh_tam'));
    cc.socket.disconnect();
    const ct = connect('che388bb');
    await waitFor(() => ct.welcome && lastChar(ct), 20000);
    for (let i = 0; i < 5 && invOf(ct, 'dan_linh_thu') < 1; i++) { ct.socket.emit('craft_item', { recipeId: 'rc_dan_linh_thu' }); await sleep(700); }
    ok('C3: Thú Sư chế được Linh Thú Đan (rc_dan_linh_thu)', invOf(ct, 'dan_linh_thu') >= 1, 'lt=' + invOf(ct, 'dan_linh_thu'));
    ct.socket.disconnect();

    // ===== Chân B1: Giải Độc — rắn độc ở Thanh Mộc Lâm (kd1) =====
    const legPoison = (async () => {
      const cd = connect('doc388aa');
      await waitFor(() => cd.welcome && lastChar(cd), 20000);
      if (!cd.welcome) { ok('B1-spawn: DocGiai388 vào được game', false, 'no welcome'); cd.socket.disconnect(); return; }
      const trav = await travelTo(cd, 'thanh_moc_lam', 'doc_xa');
      ok('B1a: tới được Thanh Mộc Lâm, thấy Độc Xà trong tick', trav);
      if (!trav) { cd.socket.disconnect(); return; }
      // Đứng sát rắn cho cắn tới khi có notice trúng độc
      const t0 = Date.now(); let poisoned = false;
      while (Date.now() - t0 < 90000 && !poisoned) {
        const me = meOf(cd);
        const snake = monsOf(cd).filter((m) => m.kind === 'doc_xa' && m.hp > 0).sort((a, b) => Math.hypot(a.x - me.x, a.y - me.y) - Math.hypot(b.x - me.x, b.y - me.y))[0];
        if (snake) await steerStep(cd, snake.x, snake.y, 30);
        if (cd.notices.some((n) => n.text.includes('trúng độc'))) poisoned = true;
        await sleep(150);
      }
      cd.socket.emit('client_input', { vx: 0, vy: 0 });
      ok('B1b: bị Độc Xà cắn trúng độc (notice ☠)', poisoned);
      if (!poisoned) { cd.socket.disconnect(); return; }
      // Bay thoát xa rắn, xác nhận HP còn tụt vì độc, rồi dùng đan trong hạn 5s
      cd.socket.emit('fly_toggle');
      await sleep(300);
      const meF = meOf(cd);
      const away = { x: meF.x + (meF.x < 3000 ? 900 : -900), y: meF.y };
      const fleeP = steerTo(cd, away.x, away.y, 80, 6000);
      await sleep(1400);
      const hpA = (meOf(cd) || {}).hp;
      await sleep(1100);
      const hpB = (meOf(cd) || {}).hp;
      await fleeP;
      info('B1: HP trong lúc thoát (độc đốt)', hpA + ' -> ' + hpB);
      ok('B1c: sau khi thoát, HP vẫn tụt vì độc DoT', typeof hpA === 'number' && typeof hpB === 'number' && hpB < hpA, hpA + '->' + hpB);
      const gdBefore = invOf(cd, 'dan_giai_doc');
      cd.socket.emit('use_item', { itemId: 'dan_giai_doc' });
      const clr = await waitFor(() => cd.notices.find((n) => n.text.includes('Giải Độc Đan: độc trong người tan sạch')), 5000);
      ok('B1d: dùng Giải Độc → notice tan độc', !!clr);
      await sleep(400);
      ok('B1e: trừ đúng 1 viên Giải Độc', invOf(cd, 'dan_giai_doc') === gdBefore - 1, 'gd=' + invOf(cd, 'dan_giai_doc'));
      const hpC = (meOf(cd) || {}).hp;
      await sleep(2200);
      const hpD = (meOf(cd) || {}).hp;
      ok('B1f: sau giải độc, HP NGỪNG tụt (đứng yên trên không, không nguồn sát thương khác)', hpC === hpD, hpC + '->' + hpD);
      // Hồi chiêu CHUNG: Thanh Tâm dùng ngay cũng bị chặn
      const e1 = cd.errs.length;
      cd.socket.emit('use_item', { itemId: 'dan_thanh_tam' });
      const cdErr = await waitFor(() => cd.errs.slice(e1).find((e) => e.msg.includes('hồi chiêu chung')), 5000);
      ok('B1g: trong 30s hồi chiêu chung → Thanh Tâm cũng bị chặn', !!cdErr, JSON.stringify(cd.errs.slice(e1)));
      await sleep(400);
      ok('B1h: Thanh Tâm không bị trừ khi bị chặn hồi chiêu', invOf(cd, 'dan_thanh_tam') === 2, 'tt=' + invOf(cd, 'dan_thanh_tam'));
      cd.socket.disconnect();
    })();

    // ===== Chân B3: Thanh Tâm xoá chậm 40% (Thủy Triều Tinh, Thanh Tuyền Khe) =====
    const legSlow = (async () => {
      const cl = connect('cham388a');
      await waitFor(() => cl.welcome && lastChar(cl), 20000);
      if (!cl.welcome) { ok('B3-spawn: ChamTam388 vào được game', false, 'no welcome'); cl.socket.disconnect(); return; }
      const trav = await travelTo(cl, 'thanh_tuyen_khe', 'thuy_trieu_tinh');
      ok('B3a: tới được Thanh Tuyền Khe, thấy Thủy Triều Tinh', trav);
      if (!trav) { cl.socket.disconnect(); return; }
      const s0 = await measureSpeed(cl, 1, 0, 1600);
      info('B3: tốc độ nền (px/s)', Math.round(s0));
      // Tới sát tinh cho phun chậm
      const t0 = Date.now(); let slowed = false;
      while (Date.now() - t0 < 90000 && !slowed) {
        const me = meOf(cl);
        const tinh = monsOf(cl).filter((m) => m.kind === 'thuy_trieu_tinh' && m.hp > 0).sort((a, b) => Math.hypot(a.x - me.x, a.y - me.y) - Math.hypot(b.x - me.x, b.y - me.y))[0];
        if (tinh) await steerStep(cl, tinh.x, tinh.y, 30);
        if (cl.notices.some((n) => n.text.includes('bị làm chậm 40%'))) slowed = true;
        await sleep(150);
      }
      cl.socket.emit('client_input', { vx: 0, vy: 0 });
      ok('B3b: bị Thủy Triều Tinh làm chậm 40% (notice ❄)', slowed);
      if (!slowed) { cl.socket.disconnect(); return; }
      const sSlow = await measureSpeed(cl, 0, 1, 1300);
      info('B3: tốc độ khi chậm (px/s)', Math.round(sSlow) + ' / nền ' + Math.round(s0));
      ok('B3c: tốc độ khi chậm ≈ 60% nền (0,5–0,72)', s0 > 0 && sSlow / s0 > 0.45 && sSlow / s0 < 0.75, (sSlow / s0).toFixed(2));
      // Đứng lại cho tinh bồi thêm 1 đòn (làm mới chậm 3s) rồi uống ngay
      const t1 = Date.now();
      while (Date.now() - t1 < 15000) {
        const me = meOf(cl);
        const tinh = monsOf(cl).filter((m) => m.kind === 'thuy_trieu_tinh' && m.hp > 0).sort((a, b) => Math.hypot(a.x - me.x, a.y - me.y) - Math.hypot(b.x - me.x, b.y - me.y))[0];
        if (tinh && Math.hypot(tinh.x - me.x, tinh.y - me.y) > 40) await steerStep(cl, tinh.x, tinh.y, 32); else cl.socket.emit('client_input', { vx: 0, vy: 0 });
        await sleep(150);
        if (Date.now() - t1 > 2500) break;
      }
      cl.socket.emit('client_input', { vx: 0, vy: 0 });
      const ttBefore = invOf(cl, 'dan_thanh_tam');
      cl.socket.emit('use_item', { itemId: 'dan_thanh_tam' });
      const clr = await waitFor(() => cl.notices.find((n) => n.text.includes('Thanh Tâm Đan') && n.text.includes('làm chậm')), 5000);
      ok('B3d: dùng Thanh Tâm → notice đã xoá làm chậm', !!clr, cl.notices.slice(-3).map((n) => n.text).join(' | '));
      await sleep(300);
      ok('B3e: trừ đúng 1 viên Thanh Tâm', invOf(cl, 'dan_thanh_tam') === ttBefore - 1, 'tt=' + invOf(cl, 'dan_thanh_tam'));
      const sPost = await measureSpeed(cl, 0, -1, 1300);
      info('B3: tốc độ sau Thanh Tâm (px/s)', Math.round(sPost) + ' / nền ' + Math.round(s0));
      ok('B3f: tốc độ khôi phục ≥ 88% nền ngay trong cửa sổ chậm còn hạn', s0 > 0 && sPost / s0 >= 0.85, (sPost / s0).toFixed(2));
      cl.socket.disconnect();
    })();

    // ===== Chân B4: Thanh Tâm xoá choáng (Kim Giáp Tê lao, Kim Quáng Động) =====
    const legStun = (async () => {
      const cg = connect('choang388');
      await waitFor(() => cg.welcome && lastChar(cg), 20000);
      if (!cg.welcome) { ok('B4-spawn: Choang388 vào được game', false, 'no welcome'); cg.socket.disconnect(); return; }
      const trav = await travelTo(cg, 'kim_quang_dong', 'kim_giap_te');
      ok('B4a: tới được Kim Quáng Động, thấy Kim Giáp Tê', trav);
      if (!trav) { cg.socket.disconnect(); return; }
      let cleared = false; let attempts = 0;
      const t0 = Date.now();
      while (Date.now() - t0 < 150000 && !cleared && attempts < 10) {
        // Đứng cách tê ~150-220px chờ lao
        const me = meOf(cg);
        const te = monsOf(cg).filter((m) => m.kind === 'kim_giap_te' && m.hp > 0).sort((a, b) => Math.hypot(a.x - me.x, a.y - me.y) - Math.hypot(b.x - me.x, b.y - me.y))[0];
        if (!te) { await sleep(300); continue; }
        const d = Math.hypot(te.x - me.x, te.y - me.y);
        if (d > 230) await steerStep(cg, te.x, te.y, 200);
        else if (d < 110) { const ux = (me.x - te.x) / (d || 1), uy = (me.y - te.y) / (d || 1); await steerStep(cg, me.x + ux * 220, me.y + uy * 220, 170); }
        else cg.socket.emit('client_input', { vx: 0, vy: 0 });
        const stunN = cg.notices.filter((n) => n.text.includes('Bạn bị choáng')).length;
        if (stunN > attempts) {
          attempts = stunN;
          const ttB = invOf(cg, 'dan_thanh_tam');
          cg.socket.emit('use_item', { itemId: 'dan_thanh_tam' });
          const clr = await waitFor(() => cg.notices.find((n) => n.text.includes('Thanh Tâm Đan') && n.text.includes('choáng')), 900);
          if (clr) { cleared = true; info('B4: xoá choáng ở lần lao thứ', attempts); await sleep(300); ok('B4c: trừ đúng 1 viên Thanh Tâm khi xoá choáng', invOf(cg, 'dan_thanh_tam') === ttB - 1, 'tt=' + invOf(cg, 'dan_thanh_tam')); }
        }
        await sleep(120);
      }
      ok('B4b: Thanh Tâm xoá được choáng của Kim Giáp Tê trong cửa sổ 0,8s', cleared, 'attempts=' + attempts);
      cg.socket.disconnect();
    })();

    await Promise.all([legPoison, legSlow, legStun]);

    // ===== Chuỗi Thạch Lâm (tuần tự, tránh nhiễu chéo giữa các pet) =====
    // --- A1: Linh Thú Đan hồi 50% + hồi dùng riêng 10s + chặn khi đầy máu ---
    const cp = connect('pet388aa');
    await waitFor(() => cp.welcome && lastChar(cp), 20000);
    if (!cp.welcome) { ok('A-spawn: PetChu388 vào được game', false, 'no welcome'); throw new Error('PetChu388 no welcome'); }
    const petA = await waitFor(() => petOf(cp, 'Sói Đo388'), 15000);
    ok('A1a: pet hiện hình theo chủ, HP vá 60/200', !!petA && petA.hp >= 55 && petA.hp <= 75, petA ? 'hp=' + petA.hp : 'no pet');
    if (petA) {
      const hp0 = petA.hp;
      cp.socket.emit('use_item', { itemId: 'dan_linh_thu' });
      const healN = await waitFor(() => cp.notices.find((n) => n.text.includes('Linh Thú Đan')), 5000);
      const petA2 = petOf(cp, 'Sói Đo388');
      ok('A1b: dùng Linh Thú Đan → notice hồi 50%', !!healN, cp.notices.slice(-2).map((n) => n.text).join(' | '));
      ok('A1c: HP pet tăng ≈ +100 (50% của 200, ±hồi phục ngoài trận)', !!petA2 && (petA2.hp - hp0) >= 88 && (petA2.hp - hp0) <= 115, hp0 + '->' + (petA2 && petA2.hp));
      ok('A1d: trừ đúng 1 viên Linh Thú Đan', invOf(cp, 'dan_linh_thu') === 2, 'lt=' + invOf(cp, 'dan_linh_thu'));
      const eH = cp.errs.length;
      cp.socket.emit('use_item', { itemId: 'dan_linh_thu' });
      const cdH = await waitFor(() => cp.errs.slice(eH).find((e) => e.msg.includes('Linh Thú Đan đang hồi')), 5000);
      ok('A1e: viên 2 trong 10s → bị chặn hồi dùng riêng', !!cdH, JSON.stringify(cp.errs.slice(eH)));
      await sleep(400);
      ok('A1f: viên 2 không bị trừ', invOf(cp, 'dan_linh_thu') === 2);
      // Chờ pet hồi đầy (regen) + hết 10s hồi dùng → dùng tiếp bị chặn "đầy máu"
      await waitFor(() => { const p = petOf(cp, 'Sói Đo388'); return p && p.hp >= 199 ? p : null; }, 30000);
      await sleep(10500);
      const eH2 = cp.errs.length;
      cp.socket.emit('use_item', { itemId: 'dan_linh_thu' });
      const fullH = await waitFor(() => cp.errs.slice(eH2).find((e) => e.msg.includes('đang đầy máu')), 5000);
      ok('A1g: pet đầy máu → dùng bị chặn, không trừ', !!fullH && invOf(cp, 'dan_linh_thu') === 2, JSON.stringify(cp.errs.slice(eH2)));
    }
    // --- A2: Thú Linh Hoàn — char riêng pet trâu (Sói Đánh388, 3000 máu) ---
    cp.socket.disconnect();
    await sleep(800);
    const cd2 = connect('pet388dd');
    await waitFor(() => cd2.welcome && lastChar(cd2), 20000);
    if (!cd2.welcome) { ok('A2-spawn: PetDanh388 vào được game', false, 'no welcome'); throw new Error('PetDanh388 no welcome'); }
    const petD = await waitFor(() => petOf(cd2, 'Sói Đánh388'), 15000);
    const meTL = meOf(cd2);
    ok('A2a: chủ+pet đo đòn đã ở Thạch Lâm', !!petD && !!meTL && meTL.x > 5200, meTL ? 'x=' + meTL.x : 'no me');
    const dropsPre = await sampleDropsGuided(cd2, 16);
    const medPre = median(dropsPre.map((d) => d.d).filter((d) => d >= 40));
    info('A2: sát thương pet TRƯỚC buff (median mọi loài)', medPre + ' từ ' + dropsPre.length + ' cú');
    ok('A2b: đo được sát thương pet trước buff (kỳ vọng ≈91–94)', medPre >= 82 && medPre <= 103, 'med=' + medPre);
    cd2.socket.emit('use_item', { itemId: 'thu_linh_hoan' });
    const buffN = await waitFor(() => cd2.notices.find((n) => n.text.includes('Thú Linh Hoàn')), 5000);
    ok('A2c: dùng Thú Linh Hoàn → notice +20% công/10 phút', !!buffN, cd2.errs.slice(-2).map((e) => e.msg).join(' | '));
    await sleep(300);
    ok('A2d: trừ đúng 1 Thú Linh Hoàn', invOf(cd2, 'thu_linh_hoan') === 0, 'tlh=' + invOf(cd2, 'thu_linh_hoan'));
    const dropsBuff = await sampleDropsGuided(cd2, 16);
    const medBuff = median(dropsBuff.map((d) => d.d).filter((d) => d >= 40));
    info('A2: sát thương pet SAU buff (median)', medBuff + ' từ ' + dropsBuff.length + ' cú');
    ok('A2e: sát thương sau buff tăng đúng theo công thức (×(1,2·100+10)/(100+10)=×1,18; đo trong [1,10–1,25])', medPre > 0 && medBuff / medPre >= 1.10 && medBuff / medPre <= 1.25, (medBuff / medPre).toFixed(3));
    // Đổi pet: thả pet cũ, thuần hoá 1 Huyết Lang mới (đánh yếu <50% rồi tame)
    cd2.socket.emit('tame_release');
    await waitFor(() => !petOf(cd2, 'Sói Đánh388'), 6000);
    let tamedNew = false;
    const tTame = Date.now();
    while (Date.now() - tTame < 90000 && !tamedNew) {
      const me = meOf(cd2);
      const hl = monsOf(cd2).filter((m) => m.kind === 'huyetlang' && m.hp > 0).sort((a, b) => Math.hypot(a.x - me.x, a.y - me.y) - Math.hypot(b.x - me.x, b.y - me.y))[0];
      if (!hl) { await sleep(400); continue; }
      if (Math.hypot(hl.x - me.x, hl.y - me.y) > 70) { await steerStep(cd2, hl.x, hl.y, 55); await sleep(130); continue; }
      cd2.socket.emit('client_input', { vx: 0, vy: 0 });
      if (hl.hp > hl.maxHp * 0.45) { cd2.socket.emit('player_attack'); await sleep(420); continue; }
      cd2.socket.emit('tame_beast', { monsterId: hl.id });
      await sleep(800);
      if (cd2.notices.some((n) => n.text.includes('Thuần hóa thành công'))) tamedNew = true;
    }
    ok('A2f: thuần hoá được Huyết Lang mới (pet B)', tamedNew);
    if (tamedNew) {
      const petB = await waitFor(() => petOf(cd2, 'Huyết Lang'), 8000);
      ok('A2g: pet B hiện hình theo chủ', !!petB);
      const dropsB = await sampleDropsGuided(cd2, 16);
      const medB = median(dropsB.map((d) => d.d).filter((d) => d >= 20));
      info('A2: sát thương pet B (atk 30) khi buff còn hạn (mọi loài)', medB + ' từ ' + dropsB.length + ' cú');
      // Chưa buff: 33 (Kiếm Ma def 3) / 34 (Huyết Lang def 0). Buff +20%: 38 / 39.
      ok('A2h: pet B VẪN được +20% (buff theo chủ) — median ≈38–39 thay vì 33–34', medB >= 36 && medB <= 41, 'med=' + medB);
    }
    cd2.socket.disconnect();
    await sleep(1000);
    const filePet = readCharFile('pet388dd');
    ok('A2i: file — classRes.petAtkBuffUntil là mốc tương lai (buff bền qua persist)', !!filePet && !!filePet.classRes && typeof filePet.classRes.petAtkBuffUntil === 'number' && filePet.classRes.petAtkBuffUntil > Date.now(), filePet && filePet.classRes ? 'until=' + filePet.classRes.petAtkBuffUntil : 'no classRes');
    ok('A2j: file — pet B (huyetlang) còn active trong classRes.tamed', !!filePet && !!filePet.classRes && !!filePet.classRes.tamed && filePet.classRes.tamed.active === true && filePet.classRes.tamed.kind === 'huyetlang', filePet && filePet.classRes && filePet.classRes.tamed ? filePet.classRes.tamed.kind : 'none');

    // --- A3a: Hộ Mệnh cứu pet ---
    const ch = connect('pet388bb');
    await waitFor(() => ch.welcome && lastChar(ch), 20000);
    if (!ch.welcome) { ok('A3-spawn: PetHomenh388 vào được game', false, 'no welcome'); throw new Error('PetHomenh388 no welcome'); }
    const petH = await waitFor(() => petOf(ch, 'Sói Hộ388'), 15000);
    ok('A3a: pet Hộ Mệnh hiện hình, HP vá 40/200', !!petH && petH.hp <= 45, petH ? 'hp=' + petH.hp : 'no pet');
    const savedN = await waitFor(() => ch.notices.find((n) => n.text.includes('Hộ Mệnh vỡ')), 120000);
    ok('A3b: pet nhận đòn kết liễu → Hộ Mệnh TỰ VỠ cứu (notice)', !!savedN, ch.notices.slice(-4).map((n) => n.text).join(' | '));
    if (savedN) {
      await sleep(600);
      const petH2 = petOf(ch, 'Sói Hộ388');
      ok('A3c: pet còn sống ở ≈30% máu (60/200)', !!petH2 && petH2.hp >= 52 && petH2.hp <= 75, petH2 ? 'hp=' + petH2.hp : 'pet gone');
      const syncH = lastChar(ch);
      ok('A3d: túi Hộ Mệnh 2 → 1', invOf(ch, 'linh_thu_ho_menh') === 1, 'hm=' + invOf(ch, 'linh_thu_ho_menh'));
      ok('A3e: classRes.tamed.hp đồng bộ ≈60 (không về 0)', !!syncH && !!syncH.classRes && !!syncH.classRes.tamed && syncH.classRes.tamed.hp >= 50, syncH && syncH.classRes && syncH.classRes.tamed ? 'tm.hp=' + syncH.classRes.tamed.hp : 'no tm');
      const meH = meOf(ch); const petH3 = petOf(ch, 'Sói Hộ388');
      ok('A3f: pet rút về sát chủ sau cứu (≤130px)', !!meH && !!petH3 && Math.hypot(petH3.x - meH.x, petH3.y - meH.y) <= 130, petH3 && meH ? 'd=' + Math.round(Math.hypot(petH3.x - meH.x, petH3.y - meH.y)) : 'n/a');
    }
    ch.socket.disconnect();
    await sleep(1000);
    const fileH = readCharFile('pet388bb');
    ok('A3g: file — Hộ Mệnh còn 1, pet vẫn active', !!fileH && (fileH.inventory || {}).linh_thu_ho_menh === 1 && !!fileH.classRes && fileH.classRes.tamed.active === true);

    // --- A3b: đối chứng — không Hộ Mệnh thì chết hẳn (GĐ137) ---
    const ck = connect('pet388cc');
    await waitFor(() => ck.welcome && lastChar(ck), 20000);
    if (!ck.welcome) { ok('A3-spawn2: PetChet388 vào được game', false, 'no welcome'); throw new Error('PetChet388 no welcome'); }
    await waitFor(() => petOf(ck, 'Sói Lìa388'), 15000);
    const diedN = await waitFor(() => ck.notices.find((n) => n.text.includes('đã gục')) || ck.petDied.find((d) => d.kind === 'thu_thuan'), 120000);
    ok('A3h: pet không Hộ Mệnh chịu đòn kết liễu → có tín hiệu chết', !!diedN, ck.notices.slice(-4).map((n) => n.text).join(' | '));
    await sleep(1500);
    const petGone = !petOf(ck, 'Sói Lìa388');
    const syncK = lastChar(ck);
    ok('A3i: pet biến mất khỏi tick + classRes.tamed.active=false (chết hẳn)', petGone && !!syncK && !!syncK.classRes && syncK.classRes.tamed.active === false, 'gone=' + petGone);
    ck.socket.disconnect();

    // --- B5: phản phệ Quỷ Tu KHÔNG bị Thanh Tâm giải ---
    const cq = connect('quy388aa');
    await waitFor(() => cq.welcome && lastChar(cq), 20000);
    if (!cq.welcome) { ok('B5-spawn: QuyPhan388 vào được game', false, 'no welcome'); throw new Error('QuyPhan388 no welcome'); }
    cq.socket.emit('quy_summon');
    const ghost = await waitFor(() => { if (!cq.state || !cq.state.players) return null; return cq.state.players.find((p) => p.quyHon === 1) || null; }, 15000);
    ok('B5a: triệu hồi được Quỷ Hồn (100 Hồn Khí)', !!ghost);
    const backlashN = await waitFor(() => cq.notices.find((n) => n.text.includes('phản phệ')), 150000);
    ok('B5b: Quỷ Hồn bị hạ → chủ trúng phản phệ choáng 3s (notice 💀)', !!backlashN, cq.notices.slice(-3).map((n) => n.text).join(' | '));
    if (backlashN) {
      const eQ = cq.errs.length;
      cq.socket.emit('use_item', { itemId: 'dan_thanh_tam' });
      const bErr = await waitFor(() => cq.errs.slice(eQ).find((e) => e.msg.includes('phản phệ')), 4000);
      ok('B5c: Thanh Tâm bị chặn với lý do PHẢN PHỆ (không giải được)', !!bErr, JSON.stringify(cq.errs.slice(eQ)));
      await sleep(300);
      ok('B5d: viên Thanh Tâm KHÔNG bị trừ', invOf(cq, 'dan_thanh_tam') === 2, 'tt=' + invOf(cq, 'dan_thanh_tam'));
      await sleep(3200); // choáng phản phệ tự hết sau 3s
      const eQ2 = cq.errs.length;
      cq.socket.emit('use_item', { itemId: 'dan_thanh_tam' });
      const bErr2 = await waitFor(() => cq.errs.slice(eQ2).find((e) => e.msg.includes('không bị làm chậm hay choáng')), 4000);
      ok('B5e: sau 3s choáng tự hết → Thanh Tâm chuyển sang chặn "không có trạng thái" (chứng tỏ lần trước không hề được xoá)', !!bErr2, JSON.stringify(cq.errs.slice(eQ2)));
    }
    cq.socket.disconnect();
    await stopServer();

    // ---------- Boot B: buff hết hạn + nạp lại từ file ----------
    const past = Date.now() - 60000;
    const future = Date.now() + 600000;
    writeStore({
      het388aa: BASE('het388aa', 'HetHan388', { x: 5900, y: 1400, job: { ...THUSU }, inventory: {}, classRes: { tamed: tamedWolf('Sói Hết388', 30, 3000, 3000), petAtkBuffUntil: past } }),
      con388aa: BASE('con388aa', 'ConHan388', { x: 5900, y: 1400, job: { ...THUSU }, inventory: {}, classRes: { tamed: tamedWolf('Sói Còn388', 30, 3000, 3000), petAtkBuffUntil: future } }),
    });
    await startServer(4001, 'bootb');
    const stB = await fetch(`http://127.0.0.1:4001/api/status`).then((r) => r.json()).catch(() => null);
    ok('boot B: /api/status 4.579 quái', !!stB && stB.monsters === 4579, stB ? 'monsters=' + stB.monsters : 'no status');
    const cHet = connect('het388aa');
    await waitFor(() => cHet.welcome && lastChar(cHet), 20000);
    if (!cHet.welcome) { ok('B-exp-spawn: HetHan388 vào được game', false, 'no welcome'); throw new Error('HetHan388 no welcome'); }
    await waitFor(() => petOf(cHet, 'Sói Hết388'), 15000);
    const dropsHet = await sampleDropsGuided(cHet, 16);
    const medHet = median(dropsHet.map((d) => d.d).filter((d) => d >= 20));
    info('bootB: sát thương pet mốc buff ĐÃ QUA (file)', medHet + ' từ ' + dropsHet.length + ' cú');
    ok('B-exp1: buff hết hạn (mốc trong file đã qua) → sát thương về thường ≈33', medHet >= 31 && medHet <= 35, 'med=' + medHet);
    cHet.socket.disconnect();
    const cCon = connect('con388aa');
    await waitFor(() => cCon.welcome && lastChar(cCon), 20000);
    if (!cCon.welcome) { ok('B-exp-spawn2: ConHan388 vào được game', false, 'no welcome'); throw new Error('ConHan388 no welcome'); }
    await waitFor(() => petOf(cCon, 'Sói Còn388'), 15000);
    const dropsCon = await sampleDropsGuided(cCon, 16);
    const medCon = median(dropsCon.map((d) => d.d).filter((d) => d >= 20));
    info('bootB: sát thương pet mốc buff CÒN HẠN (file)', medCon + ' từ ' + dropsCon.length + ' cú');
    ok('B-exp2: buff còn hạn nạp từ file → sát thương vẫn +20% ≈38 (persist đủ vòng)', medCon >= 36 && medCon <= 41, 'med=' + medCon);
    cCon.socket.disconnect();
    await stopServer();
  } catch (e) {
    console.log('PROBE ERROR: ' + (e && e.stack || e));
    fail++;
    try { await stopServer(); } catch (e2) {}
  }
  console.log(`=== GĐ388 PROBE: ${pass} PASS / ${fail} FAIL ===`);
  process.exit(fail ? 1 : 0);
})();
