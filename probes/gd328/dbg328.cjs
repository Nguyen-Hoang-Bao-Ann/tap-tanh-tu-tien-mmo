// Debug GĐ328: tạo pháp Phàm cong+5, nộp từng đợt nhỏ, in tiến độ + lỗi + sát thương trước/sau vận hành.
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const net = require('net');
const ROOT = path.join(__dirname, '..', '..');
const PORT = 3569;
const DIR = __dirname;
const { io } = require(path.join(ROOT, 'client/node_modules/socket.io-client'));
const { createMerger } = require(path.join(ROOT, 'client/worldmerge.cjs'));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function waitFor(fn, ms) { const t0 = Date.now(); while (Date.now() - t0 < ms) { const v = fn(); if (v) return v; await sleep(150); } return null; }
function portFree(port) { return new Promise((res) => { const s = net.createServer(); s.once('error', () => res(false)); s.listen(port, () => s.close(() => res(true))); }); }
let serverProc = null, killTimer = null;
async function startServer() {
  if (!(await portFree(PORT))) throw new Error('port ban');
  serverProc = spawn('node', ['server/index.js'], { cwd: ROOT, env: { ...process.env, PORT: String(PORT), TTT_STORAGE: 'file', TTT_CHAR_FILE: path.join(DIR, 'characters.json'), TTT_ACC_FILE: path.join(DIR, 'accounts.json'), TTT_WORLD_FILE: path.join(DIR, 'world.json'), TTT_SESS_FILE: path.join(DIR, 'sessions.json'), TTT_DAY_REAL_MS: '600000', TTT_TUVI_NEED: '5' }, stdio: ['ignore', 'pipe', 'pipe'] });
  serverProc.stderr.on('data', (d) => process.stderr.write('[srv] ' + d));
  serverProc.stdout.on('data', (d) => { try { fs.appendFileSync(path.join(DIR, 'srv_dbg.log'), d); } catch (e) {} });
  killTimer = setTimeout(() => { try { serverProc.kill('SIGKILL'); } catch (e) {} }, 60000);
  const t0 = Date.now();
  while (Date.now() - t0 < 45000) { try { const r = await fetch(`http://127.0.0.1:${PORT}/api/status`); if (r.ok) { clearTimeout(killTimer); return; } } catch (e) {} await sleep(500); }
  throw new Error('server khong len');
}
async function stopServer() { if (!serverProc) return; const p = serverProc; serverProc = null; await new Promise((res) => { const t = setTimeout(() => { try { p.kill('SIGKILL'); } catch (e) {} res(); }, 4000); p.once('exit', () => { clearTimeout(t); res(); }); try { p.kill('SIGTERM'); } catch (e) { clearTimeout(t); res(); } }); const t0 = Date.now(); while (Date.now() - t0 < 10000 && !(await portFree(PORT))) await sleep(300); }
function BASE(token, name, extra) {
  return Object.assign({ token, name, classId: 'kiemtu', gender: 'nam', race: null, geo175: 1, realm: 'kd', tier: 1, x: 4248, y: 2950, mapId: 'huyet_sac_rung', hp: 99999, lifespan: 500, birthDay: -5660, ageStart: 16, stats: { khiHuyet: 500, vatCong: 100, vatPhong: 100, phapCong: 100, phapPhong: 100, tocDo: 60, minhMan: 60 }, statPoints: 0, freePoints: 0, tuVi: 0, stones: 0, stonesTrung: 0, stonesThuong: 0, stonesCuc: 0, inventory: {}, gearBag: {}, equipped: [], skills: [], job: null, job2: null, job3: null, linhCan: { element: 'hoa', grade: 'trung', mult: 1.2 }, affinity: {}, affV2: 1, bonds: {}, quests: {}, questsDone: {}, flags: {}, counters: {}, disciples: [], foundInvites: [], reformIn: [], sectTech: [], sectArts: [], sectArtsActive: [], mails: [], classRes: {} }, extra || {});
}
function SECT(id, name, members, extra) { return Object.assign({ id, name, intro: '', fund: 0, level: 1, uy: 0, members, applicants: [], activeQuests: [], territories: [], territory: null, warehouse: [], garden: [], depts: {}, tributeDay: 100, upkeepDay: 100, questDay: 100, artDay: 100, debtDays: 0 }, extra || {}); }
async function connect(token) {
  const socket = io(`http://127.0.0.1:${PORT}`, { transports: ['websocket'] });
  const ctx = { socket, merger: createMerger(), state: null, welcome: null, sect: null, sync: null, errors: [] };
  socket.on('connect', () => socket.emit('hello', { token }));
  socket.on('welcome', (w) => { ctx.welcome = w; });
  socket.on('server_tick', (t) => { const st = ctx.merger(t); if (st) ctx.state = st; });
  socket.on('sect_state', (st) => { ctx.sect = st; });
  socket.on('char_sync', (sy) => { ctx.sync = sy; });
  socket.on('interact_error', (e) => ctx.errors.push(e.message || ''));
  await waitFor(() => ctx.welcome, 20000);
  socket.emit('sect_get');
  await waitFor(() => ctx.sect, 10000);
  return ctx;
}
const mySect = (c) => c.sect && c.sect.mySect;
const meOf = (c) => (c.state?.players || []).find((p) => p.id === c.welcome.id);
const monsOf = (c) => c.state?.monsters || [];
async function flyTo(c, x, y, tol) {
  c.socket.emit('fly_toggle', {}); await sleep(350);
  const t0 = Date.now();
  while (Date.now() - t0 < 30000) { const me = meOf(c); if (!me) { await sleep(120); continue; } const dx = x - me.x, dy = y - me.y; const d = Math.hypot(dx, dy); if (d <= (tol || 45)) break; c.socket.emit('client_input', { vx: dx / d, vy: dy / d }); await sleep(110); }
  c.socket.emit('client_input', { vx: 0, vy: 0 });
  c.socket.emit('fly_toggle', {}); await sleep(450);
}
async function sampleDealt(c, n) {
  const drops = []; const t0 = Date.now(); let tid = null, last = null;
  while (Date.now() - t0 < 50000 && drops.length < n) {
    const ms = monsOf(c).filter((m) => m.kind === 'huyetlang' && (m.hp || 0) > 0);
    if (!tid) { const full = ms.filter((m) => m.hp >= (m.maxHp || 9999) - 1); if (!full.length) { await sleep(250); continue; } tid = full[0].id; last = full[0].hp; await flyTo(c, full[0].x, full[0].y, 40); continue; }
    const t = monsOf(c).find((m) => m.id === tid);
    if (!t) { tid = null; continue; }
    const me = meOf(c); const d = Math.hypot(t.x - me.x, t.y - me.y);
    if (d > 62) { c.socket.emit('client_input', { vx: (t.x - me.x) / d, vy: (t.y - me.y) / d }); await sleep(110); continue; }
    c.socket.emit('client_input', { vx: 0, vy: 0 });
    if (t.hp < last) { drops.push(last - t.hp); last = t.hp; }
    c.socket.emit('player_attack'); await sleep(950);
    const t2 = monsOf(c).find((m) => m.id === tid);
    if (t2 && t2.hp < last) { drops.push(last - t2.hp); last = t2.hp; }
    if (!t2) tid = null;
  }
  return drops;
}
(async () => {
  const chars = {
    p328c00001: BASE('p328c00001', ' ChuDbg', { inventory: { linh_thao: 60 } }),
    p328m00001: BASE('p328m00001', ' DeTuDbg', { inventory: { linh_thao: 300 } }),
  };
  fs.writeFileSync(path.join(DIR, 'characters.json'), JSON.stringify(chars));
  const sects = [SECT('sa', 'Tông Debug', [
    { token: 'p328c00001', name: ' ChuDbg', role: 'chu', contrib: 0 },
    { token: 'p328m00001', name: ' DeTuDbg', role: 'detu', contrib: 1000 },
  ], { fund: 100000, uy: 100, level: 3, hq: { mapId: 'huyet_sac_rung', x: 4248, y: 2900 }, buildings: [{ kind: 'tangkinh', name: 'Tàng Kinh Các', x: 4248, y: 3000, lv: 2 }] })];
  fs.writeFileSync(path.join(DIR, 'world.json'), JSON.stringify({ totalMinutes: 100 * 1440, savedAt: Date.now(), sects }));
  await startServer();
  const C = await connect('p328c00001'); const M = await connect('p328m00001');
  C.errors = []; C.socket.emit('sect_art_create', { name: 'Debug Công', gradeId: 'pham', comps: { cong: 5 }, flawId: 'f_toc' }); await sleep(900);
  C.socket.emit('sect_get'); await sleep(500);
  console.log('arts after create:', JSON.stringify((mySect(C).arts || []).map((a) => [a.name, a.status, a.progress, a.need])), 'Cerr:', C.errors.join(';'));
  M.errors = []; M.socket.emit('sect_art_donate', { itemId: 'linh_thao', qty: 50 }); await sleep(800);
  M.socket.emit('sect_get'); await sleep(500);
  console.log('after donate 50:', JSON.stringify((mySect(M).arts || []).map((a) => [a.status, a.progress])), 'Merr:', M.errors.join(';'));
  M.socket.emit('sect_art_donate', { itemId: 'linh_thao', qty: 50 }); await sleep(800);
  M.socket.emit('sect_get'); await sleep(500);
  console.log('after donate 50+50:', JSON.stringify((mySect(M).arts || []).map((a) => [a.status, a.progress])), 'Merr:', M.errors.join(';'));
  const art = (mySect(M).arts || [])[0] || {};
  M.errors = []; M.socket.emit('sect_art_learn', { artId: art.id }); await sleep(800);
  console.log('learn err:', M.errors.join(';'), 'syncArts:', JSON.stringify(M.sync && M.sync.sectArts));
  const pre = await sampleDealt(M, 5);
  M.socket.emit('sect_art_toggle', { artId: art.id }); await sleep(600);
  console.log('active:', JSON.stringify(M.sync && M.sync.sectArtsActive));
  const post = await sampleDealt(M, 5);
  console.log('DMG pre:', JSON.stringify(pre), 'post:', JSON.stringify(post));
  C.socket.disconnect(); M.socket.disconnect();
  await stopServer();
  process.exit(0);
})();
