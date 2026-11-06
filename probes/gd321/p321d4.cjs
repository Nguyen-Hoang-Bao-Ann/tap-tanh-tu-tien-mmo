// Debug H2: bond -1000 voi loi_dieu, H dung cach trum ~1300px phia bac, log day du.
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const net = require('net');
const ROOT = path.join(__dirname, '..', '..');
const PORT = 3555;
const DIR = __dirname;
const { io } = require(path.join(ROOT, 'client/node_modules/socket.io-client'));
const { createMerger } = require(path.join(ROOT, 'client/worldmerge.cjs'));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function waitFor(fn, ms) { const t0 = Date.now(); while (Date.now() - t0 < ms) { const v = fn(); if (v) return v; await sleep(200); } return null; }
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
  return Object.assign({ token, name, classId: 'kiemtu', gender: 'nam', race: null, geo175: 1, realm: 'kd', tier: 1, x: 500, y: 500, mapId: 'loi_dinh_son_coc', hp: 99999, stats: { khiHuyet: 500, vatCong: 300, vatPhong: 300, phapCong: 100, phapPhong: 300, tocDo: 60, minhMan: 60 }, statPoints: 0, freePoints: 0, tuVi: 0, stones: 100000, stonesTrung: 0, stonesThuong: 0, stonesCuc: 0, inventory: {}, gearBag: {}, equipped: [], skills: [], job: null, job2: null, job3: null, linhCan: { element: 'kim', grade: 'trung', mult: 1.2 }, affinity: {}, affV2: 1, bonds: {}, quests: {}, questsDone: {}, flags: {}, counters: {}, disciples: [], foundInvites: [], reformIn: [] }, extra || {});
}
(async () => {
  fs.writeFileSync(path.join(DIR, 'characters.json'), JSON.stringify({ p321h00001: BASE('p321h00001', 'Ke Thu H', { bonds: { 'm:loi_dieu': { score: -1000, branch: null, pick: null, gainDay: -1, gainAmt: 0, name: 'Lôi Điêu' } } }) }));
  fs.writeFileSync(path.join(DIR, 'world.json'), JSON.stringify({ totalMinutes: 100 * 1440, savedAt: Date.now(), sects: [] }));
  await startServer();
  const socket = io(`http://127.0.0.1:${PORT}`, { transports: ['websocket'] });
  const ctx = { merger: createMerger(), state: null, welcome: null };
  socket.on('connect', () => socket.emit('hello', { token: 'p321h00001' }));
  socket.on('welcome', (w) => { ctx.welcome = w; });
  socket.on('server_tick', (t) => { const st = ctx.merger(t); if (st) ctx.state = st; });
  await waitFor(() => ctx.welcome, 15000);
  const meOf = () => (ctx.state?.players || []).find((p) => p.id === ctx.welcome.id);
  const mons = () => ctx.state?.monsters || [];
  // ổn định state
  let lastN = -1, stable = 0; const tS = Date.now();
  while (Date.now() - tS < 25000) { const n = mons().length; if (n === lastN && n > 0) { stable++; if (stable >= 3) break; } else stable = 0; lastN = n; await sleep(1000); }
  const loiDieus = mons().filter((m) => m.kind === 'loi_dieu');
  console.log('LOI DIEU COUNT:', loiDieus.length, loiDieus.map((m) => `${m.id} hp${m.maxHp} sp=${m.sp} rare=${m.rare} name=${m.name} @${Math.round(m.x)},${Math.round(m.y)}`).join(' || '));
  const track = loiDieus.reduce((a, b) => ((b.maxHp || 0) > (a.maxHp || 0) ? b : a));
  console.log('TRACK:', JSON.stringify(track));
  // bay len phia bac cua trum 1300px
  socket.emit('fly_toggle', {}); await sleep(400);
  const dest = { x: track.x, y: Math.max(150, track.y - 1300) };
  const t0 = Date.now();
  while (Date.now() - t0 < 25000) {
    const me = meOf(); if (!me) { await sleep(150); continue; }
    const dx = dest.x - me.x, dy = dest.y - me.y; const d = Math.hypot(dx, dy);
    if (d <= 70) break;
    socket.emit('client_input', { vx: dx / d, vy: dy / d });
    await sleep(120);
  }
  socket.emit('client_input', { vx: 0, vy: 0 });
  socket.emit('fly_toggle', {}); await sleep(500);
  for (let i = 0; i < 20; i++) {
    const m = mons().find((x) => x.id === track.id); const me = meOf();
    console.log('t+' + (i * 2) + 's boss=' + (m ? Math.round(m.x) + ',' + Math.round(m.y) : '?') + ' me=' + (me ? Math.round(me.x) + ',' + Math.round(me.y) : '?') + ' d=' + (m && me ? Math.round(Math.hypot(m.x - me.x, m.y - me.y)) : '?'));
    await sleep(2000);
  }
  socket.disconnect();
  await stopServer();
  process.exit(0);
})();
