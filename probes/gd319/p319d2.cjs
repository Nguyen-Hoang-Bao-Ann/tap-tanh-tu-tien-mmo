// GĐ319 D2 debug: thiền tại Luyện Công Trường — chạy trên state đã có của probes/gd319 (sect + công trình đã dựng).
process.env.NODE_PATH = process.env.HOME + '/workspace/tap-tanh-tu-tien-mmo/client/node_modules';
require('module').Module._initPaths();
const fs = require('fs'); const path = require('path'); const http = require('http');
const { spawn } = require('child_process'); const net = require('net');
const { io } = require('socket.io-client');
const { createMerger } = require(process.env.HOME + '/workspace/tap-tanh-tu-tien-mmo/client/worldmerge.cjs');
const DIR = __dirname; const PORT = 3548;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
function portFree(port) { return new Promise((res) => { const s = net.createServer(); s.once('error', () => res(false)); s.once('listening', () => s.close(() => res(true))); s.listen(port, '127.0.0.1'); }); }
function waitStatus(tries = 90) { return new Promise((resolve, reject) => { let n = 0; const tick = () => { const req = http.get({ host: '127.0.0.1', port: PORT, path: '/api/status', timeout: 1500 }, (r) => { let b = ''; r.on('data', (c) => b += c); r.on('end', () => { try { resolve(JSON.parse(b)); } catch { again(); } }); }); req.on('error', again); req.on('timeout', () => { req.destroy(); again(); }); }; const again = () => { if (++n >= tries) reject(new Error('no server')); else setTimeout(tick, 700); }; tick(); }); }
let serverProc = null;
async function startServer() {
  if (!await portFree(PORT)) throw new Error('port ban');
  const env = { ...process.env, PORT: String(PORT), TTT_STORAGE: 'file', TTT_CHAR_FILE: path.join(DIR, 'characters.json'), TTT_WORLD_FILE: path.join(DIR, 'world.json'), TTT_SESS_FILE: path.join(DIR, 'sessions.json'), TTT_ACC_FILE: path.join(DIR, 'accounts.json'), TTT_DAY_REAL_MS: '600000', TTT_TUVI_NEED: '5' };
  serverProc = spawn('node', ['server/index.js'], { cwd: process.env.HOME + '/workspace/tap-tanh-tu-tien-mmo', env, stdio: ['ignore', 'pipe', 'pipe'] });
  let killTimer = setTimeout(() => { try { serverProc.kill('SIGKILL'); } catch {} }, 60000);
  serverProc.on('exit', () => clearTimeout(killTimer));
  await waitStatus(); clearTimeout(killTimer);
}
async function stopServer() { if (!serverProc) return; const p = serverProc; serverProc = null; await new Promise((res) => { const t = setTimeout(() => { try { p.kill('SIGKILL'); } catch {} res(); }, 5000); p.once('exit', () => { clearTimeout(t); res(); }); try { p.kill('SIGTERM'); } catch { clearTimeout(t); res(); } }); for (let i = 0; i < 40; i++) { if (await portFree(PORT)) return; await sleep(250); } }
function connect(token) {
  return new Promise((resolve, reject) => {
    const socket = io('http://127.0.0.1:' + PORT, { transports: ['websocket'], reconnection: false });
    const c = { socket, merger: createMerger(), notices: [], syncs: [], errors: [] };
    socket.on('connect', () => socket.emit('hello', { token }));
    socket.on('welcome', (d) => { c.welcome = d; resolve(c); });
    socket.on('server_tick', (t) => { try { c.state = c.merger(t); } catch {} });
    socket.on('notice', (d) => c.notices.push(d.text || ''));
    socket.on('char_sync', (d) => c.syncs.push(d.character || d));
    socket.on('interact_error', (d) => c.errors.push(d.message || ''));
    setTimeout(() => reject(new Error('timeout')), 15000);
  });
}
const lastSync = (c) => c.syncs[c.syncs.length - 1] || c.welcome?.character;
async function waitFor(fn, ms = 10000, step = 200) { const t0 = Date.now(); while (Date.now() - t0 < ms) { const v = fn(); if (v) return v; await sleep(step); } return null; }
function myPlayer(c) { return c.state?.players?.find((p) => p.id === c.welcome?.id) || null; }
function steer(c, tx, ty) { const me = myPlayer(c); if (!me) return; const dx = tx - me.x, dy = ty - me.y; const d = Math.hypot(dx, dy) || 1; c.socket.emit('client_input', { vx: dx / d, vy: dy / d }); }
function halt(c) { c.socket.emit('client_input', { vx: 0, vy: 0 }); }
async function goTo(c, tx, ty, tol = 45, ms = 40000) { const t0 = Date.now(); while (Date.now() - t0 < ms) { const me = myPlayer(c); if (!me) { await sleep(200); continue; } if (Math.hypot(me.x - tx, me.y - ty) <= tol) { halt(c); return true; } steer(c, tx, ty); await sleep(200); } halt(c); return false; }
(async () => {
  const bmap = JSON.parse(fs.readFileSync(path.join(DIR, 'buildings.json'), 'utf8'));
  const lc = bmap.luyencong;
  console.log('luyencong at', JSON.stringify(lc));
  await startServer();
  try {
    const A = await connect('p3190a01');
    await waitFor(() => myPlayer(A), 8000);
    console.log('A spawn:', JSON.stringify(myPlayer(A)), 'tuVi:', lastSync(A)?.tuVi);
    A.socket.emit('fly_toggle');
    await sleep(600);
    const arrived = await goTo(A, lc.x, lc.y, 40, 40000);
    console.log('arrived lc:', arrived, 'pos:', JSON.stringify(myPlayer(A)));
    // don quai quanh 500px
    const t0 = Date.now();
    while (Date.now() - t0 < 60000) {
      const near = (A.state?.monsters || []).filter((m) => !m.trial && Math.hypot(m.x - lc.x, m.y - lc.y) < 500);
      if (!near.length) break;
      const t = near[0]; const me = myPlayer(A);
      if (!me) { await sleep(200); continue; }
      if (Math.hypot(me.x - t.x, me.y - t.y) > 55) steer(A, t.x, t.y); else { halt(A); A.socket.emit('player_attack'); }
      await sleep(220);
    }
    await goTo(A, lc.x, lc.y, 40, 20000);
    halt(A);
    console.log('cleared. pos:', JSON.stringify(myPlayer(A)), 'near monsters:', (A.state?.monsters || []).filter((m) => Math.hypot(m.x - lc.x, m.y - lc.y) < 600).length);
    await sleep(5500);
    const tuv0 = lastSync(A)?.tuVi || 0;
    A.socket.emit('meditate_toggle');
    await sleep(3000);
    console.log('after toggle: me.meditating =', myPlayer(A)?.meditating, '| notices:', JSON.stringify(A.notices.slice(-3)), '| errors:', JSON.stringify(A.errors));
    const up = await waitFor(() => (lastSync(A)?.tuVi || 0) > tuv0, 90000, 1000);
    console.log(up ? `PASS D2 thien tai Luyen Cong Truong: tuVi ${tuv0} -> ${lastSync(A)?.tuVi}` : `FAIL D2 tuVi stuck ${tuv0} | meditating=${myPlayer(A)?.meditating} pos=${JSON.stringify(myPlayer(A))} notices=${JSON.stringify(A.notices.slice(-4))}`);
    A.socket.disconnect();
    await sleep(500);
  } catch (e) { console.log('ERR', e && e.stack || e); }
  await stopServer();
  process.exit(0);
})();
