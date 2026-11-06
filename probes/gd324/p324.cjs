// Probe GĐ324c — miệng hang thật: van_dang_son còn <= 3 miệng trong map_enter và vẫn chui vào được.
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const net = require('net');
const ROOT = path.join(__dirname, '..', '..');
const PORT = 3559;
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
  return Object.assign({ token, name, classId: 'kiemtu', gender: 'nam', race: null, geo175: 1, realm: 'kd', tier: 1, x: 4000, y: 3000, mapId: 'van_dang_son', hp: 99999, stats: { khiHuyet: 500, vatCong: 300, vatPhong: 300, phapCong: 100, phapPhong: 300, tocDo: 60, minhMan: 60 }, statPoints: 0, freePoints: 0, tuVi: 0, stones: 0, stonesTrung: 0, stonesThuong: 0, stonesCuc: 0, inventory: {}, gearBag: {}, equipped: [], skills: [], job: null, job2: null, job3: null, linhCan: { element: 'kim', grade: 'trung', mult: 1.2 }, affinity: {}, affV2: 1, bonds: {}, quests: {}, questsDone: {}, flags: {}, counters: {}, disciples: [], foundInvites: [], reformIn: [] }, extra || {});
}
let pass = 0, fail = 0;
function ok(name, cond, extra) { if (cond) { pass++; console.log('PASS | ' + name); } else { fail++; console.log('FAIL | ' + name + (extra ? ' | ' + extra : '')); } }
(async () => {
  fs.writeFileSync(path.join(DIR, 'characters.json'), JSON.stringify({ p324v00001: BASE('p324v00001', ' Tham Hang') }));
  fs.writeFileSync(path.join(DIR, 'world.json'), JSON.stringify({ totalMinutes: 100 * 1440, savedAt: Date.now(), sects: [] }));
  await startServer();
  const socket = io(`http://127.0.0.1:${PORT}`, { transports: ['websocket'] });
  const ctx = { merger: createMerger(), state: null, welcome: null, enters: [] };
  socket.on('connect', () => socket.emit('hello', { token: 'p324v00001' }));
  socket.on('welcome', (w) => { ctx.welcome = w; });
  socket.on('server_tick', (t) => { const st = ctx.merger(t); if (st) ctx.state = st; });
  socket.on('map_enter', (m) => { ctx.enters.push(m); });
  await waitFor(() => ctx.welcome && ctx.enters.length, 20000);
  const enter0 = ctx.enters[0] || {};
  const caves = enter0.caves || [];
  ok('V1 van_dang_son: so mieng hang that trong 1..3', caves.length >= 1 && caves.length <= 3, 'n=' + caves.length);
  const meOf = () => (ctx.state?.players || []).find((p) => p.id === ctx.welcome.id);
  if (caves.length) {
    const m = caves[0];
    socket.emit('fly_toggle', {}); await sleep(400);
    const t0 = Date.now();
    while (Date.now() - t0 < 40000) { const me = meOf(); if (!me) { await sleep(150); continue; } const dx = m.x - me.x, dy = m.y - me.y; const d = Math.hypot(dx, dy); if (d <= 60) break; socket.emit('client_input', { vx: dx / d, vy: dy / d }); await sleep(110); }
    socket.emit('client_input', { vx: 0, vy: 0 });
    socket.emit('fly_toggle', {}); await sleep(500);
    const nEnter = ctx.enters.length;
    socket.emit('cave_enter');
    const inCave = await waitFor(() => ctx.enters.slice(nEnter).find((e) => e.mapId === 'hang_van_dang_son' || (e.caveExit)), 10000);
    ok('V2 dung sat mieng hang that -> chui vao duoc hang', !!inCave, JSON.stringify(ctx.enters.slice(nEnter).map((e) => e.mapId)));
  }
  socket.disconnect();
  await stopServer();
  console.log(`\n== p324: ${pass} PASS, ${fail} FAIL ==`);
  process.exit(fail ? 1 : 0);
})();
