// Debug GĐ334-B8: học + lắp + cast chiến kỹ yếu trong fixture rút gọn của p334b.
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const net = require('net');
const ROOT = path.join(__dirname, '..', '..');
const PORT = 3581;
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
  killTimer = setTimeout(() => { try { serverProc.kill('SIGKILL'); } catch (e) {} }, 60000);
  const t0 = Date.now();
  while (Date.now() - t0 < 45000) { try { const r = await fetch(`http://127.0.0.1:${PORT}/api/status`); if (r.ok) { clearTimeout(killTimer); return; } } catch (e) {} await sleep(500); }
  throw new Error('server khong len');
}
async function stopServer() { if (!serverProc) return; const p = serverProc; serverProc = null; await new Promise((res) => { const t = setTimeout(() => { try { p.kill('SIGKILL'); } catch (e) {} res(); }, 4000); p.once('exit', () => { clearTimeout(t); res(); }); try { p.kill('SIGTERM'); } catch (e) { clearTimeout(t); res(); } }); const t0 = Date.now(); while (Date.now() - t0 < 10000 && !(await portFree(PORT))) await sleep(300); }
function BASE(token, name, extra) {
  return Object.assign({ token, name, classId: 'kiemtu', gender: 'nam', race: null, geo175: 1, realm: 'kd', tier: 1, x: 4248, y: 2950, mapId: 'huyet_sac_rung', hp: 99999, lifespan: 500, birthDay: -5660, ageStart: 16, stats: { khiHuyet: 500, vatCong: 100, vatPhong: 100, phapCong: 100, phapPhong: 100, tocDo: 60, minhMan: 60 }, statPoints: 0, freePoints: 0, tuVi: 0, stones: 0, stonesTrung: 0, stonesThuong: 0, stonesCuc: 0, inventory: {}, gearBag: {}, equipped: [], skills: [], job: null, job2: null, job3: null, linhCan: { element: 'hoa', grade: 'trung', mult: 1.2 }, affinity: {}, affV2: 1, bonds: {}, quests: {}, questsDone: {}, flags: {}, counters: {}, disciples: [], foundInvites: [], reformIn: [], sectTech: [], sectArts: [], sectArtsActive: [], mails: [], classRes: {} }, extra || {});
}
function SECT(id, name, members, extra) { return Object.assign({ id, name, intro: '', fund: 0, level: 1, uy: 0, members, applicants: [], activeQuests: [], territories: [], territory: null, warehouse: [], garden: [], depts: {}, tributeDay: 100, upkeepDay: 100, questDay: 100, artDay: 100, debtDays: 0, arts: [], honor: [] }, extra || {}); }
async function connect(token) {
  const socket = io(`http://127.0.0.1:${PORT}`, { transports: ['websocket'] });
  const ctx = { socket, merger: createMerger(), state: null, welcome: null, sect: null, sync: null, errors: [], casts: [] };
  socket.on('connect', () => socket.emit('hello', { token }));
  socket.on('welcome', (w) => { ctx.welcome = w; });
  socket.on('server_tick', (t) => { const st = ctx.merger(t); if (st) ctx.state = st; });
  socket.on('sect_state', (st) => { ctx.sect = st; });
  socket.on('char_sync', (sy) => { ctx.sync = sy; });
  socket.on('interact_error', (e) => ctx.errors.push(e.message || ''));
  socket.on('cast_result', (r) => ctx.casts.push(r));
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
(async () => {
  const chars = {
    dbg334c001: BASE('dbg334c001', ' ChuDbg334', { realm: 'ht', stonesThuong: 1000, inventory: { ngoc_gian_trong: 10, da_quy: 10, tien_linh_chi: 5, linh_thao: 40 } }),
    dbg334m001: BASE('dbg334m001', ' DeTuDbg334', { inventory: { da_quy: 300 }, skills: ['kiemtu_1'], equipped: ['kiemtu_1'] }),
  };
  fs.writeFileSync(path.join(DIR, 'characters.json'), JSON.stringify(chars));
  const sects = [SECT('sdbg', 'Tông Debug', [
    { token: 'dbg334c001', name: ' ChuDbg334', role: 'chu', contrib: 0 },
    { token: 'dbg334m001', name: ' DeTuDbg334', role: 'detu', contrib: 5000 },
  ], { fund: 200000, uy: 300, level: 5, hq: { mapId: 'huyet_sac_rung', x: 4248, y: 2900 }, buildings: [{ kind: 'tangkinh', name: 'Tàng Kinh Các', x: 4248, y: 3000, lv: 3 }] })];
  fs.writeFileSync(path.join(DIR, 'world.json'), JSON.stringify({ totalMinutes: 100 * 1440, savedAt: Date.now(), sects }));
  await startServer();
  const C = await connect('dbg334c001'); const M = await connect('dbg334m001');
  C.socket.emit('sect_art_create', { name: 'Kỹ Yếu Tầm Xa', gradeId: 'pham', comps: { tam: 4 }, flawId: 'f_yeu', kind: 'chienky' }); await sleep(700);
  M.socket.emit('sect_art_donate', { itemId: 'da_quy', qty: 13 }); await sleep(600);
  M.socket.emit('sect_get'); await sleep(500);
  const art = (mySect(M).arts || [])[0] || {};
  console.log('DBG art:', JSON.stringify(art));
  M.errors = []; M.socket.emit('sect_art_learn', { artId: art.id }); await sleep(700);
  console.log('DBG learn errors:', M.errors.join(';'), 'syncSkills:', JSON.stringify(((M.sync || {}).skills || []).map((x) => x.id)));
  M.errors = []; M.socket.emit('equip_skill', { skillId: 'art:' + art.id }); await sleep(800);
  const skList = (M.sync && M.sync.skills) || [];
  console.log('DBG equip errors:', M.errors.join(';'), 'skills:', JSON.stringify(skList.map((x) => x.id)), 'catalog:', JSON.stringify(((M.sync || {}).catalog || []).filter((x) => String(x.id).startsWith('art:'))));
  const artSlot = skList.findIndex((x) => x.id === 'art:' + art.id);
  const me = meOf(M);
  console.log('DBG me:', me ? JSON.stringify({ x: me.x, y: me.y, mp: me.mp, hp: me.hp }) : 'none', 'artSlot:', artSlot);
  const w = monsOf(M).filter((m) => m.kind === 'huyetlang')[0];
  console.log('DBG wolf:', w ? JSON.stringify({ id: w.id, x: w.x, y: w.y, hp: w.hp }) : 'none', 'mons:', monsOf(M).length);
  if (w && artSlot >= 0) {
    await flyTo(M, w.x, w.y, 55);
    const me2 = meOf(M); const w2 = monsOf(M).find((m) => m.id === w.id);
    console.log('DBG dist sau bay:', me2 && w2 ? Math.round(Math.hypot(w2.x - me2.x, w2.y - me2.y)) : '?', 'mp:', me2 && me2.mp);
    const cm = M.casts.length;
    M.socket.emit('cast_skill', { slot: artSlot });
    const r = await waitFor(() => M.casts.length > cm && M.casts[M.casts.length - 1], 4000);
    console.log('DBG cast result:', JSON.stringify(r));
    await sleep(800);
    const w3 = monsOf(M).find((m) => m.id === w.id);
    console.log('DBG wolf hp sau cast:', w3 ? w3.hp : 'dead');
  }
  C.socket.disconnect(); M.socket.disconnect();
  await stopServer();
  process.exit(0);
})();
