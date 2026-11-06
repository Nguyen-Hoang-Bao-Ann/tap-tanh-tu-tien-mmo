process.env.NODE_PATH = process.env.HOME + '/workspace/tap-tanh-tu-tien-mmo/client/node_modules';
require('module').Module._initPaths();
const fs = require('fs'); const path = require('path'); const http = require('http');
const { spawn } = require('child_process'); const net = require('net');
const { io } = require('socket.io-client');
const { createMerger } = require(process.env.HOME + '/workspace/tap-tanh-tu-tien-mmo/client/worldmerge.cjs');
const DIR = __dirname; const PORT = 3550;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
function portFree(port) { return new Promise((res) => { const s = net.createServer(); s.once('error', () => res(false)); s.once('listening', () => s.close(() => res(true))); s.listen(port, '127.0.0.1'); }); }
function waitStatus(tries = 90) { return new Promise((resolve, reject) => { let n = 0; const tick = () => { const req = http.get({ host: '127.0.0.1', port: PORT, path: '/api/status', timeout: 1500 }, (r) => { let b = ''; r.on('data', (c) => b += c); r.on('end', () => { try { resolve(JSON.parse(b)); } catch { again(); } }); }); req.on('error', again); req.on('timeout', () => { req.destroy(); again(); }); }; const again = () => { if (++n >= tries) reject(new Error('no')); else setTimeout(tick, 700); }; tick(); }); }
let serverProc = null;
async function startServer() {
  const env = { ...process.env, PORT: String(PORT), TTT_STORAGE: 'file', TTT_CHAR_FILE: path.join(DIR, 'characters.json'), TTT_WORLD_FILE: path.join(DIR, 'world.json'), TTT_SESS_FILE: path.join(DIR, 'sessions.json'), TTT_ACC_FILE: path.join(DIR, 'accounts.json'), TTT_DAY_REAL_MS: '600000', TTT_TUVI_NEED: '5' };
  serverProc = spawn('node', ['server/index.js'], { cwd: process.env.HOME + '/workspace/tap-tanh-tu-tien-mmo', env, stdio: ['ignore', 'pipe', 'pipe'] });
  let kt = setTimeout(() => { try { serverProc.kill('SIGKILL'); } catch {} }, 60000);
  serverProc.on('exit', () => clearTimeout(kt));
  await waitStatus(); clearTimeout(kt);
}
async function stopServer() { if (!serverProc) return; const p = serverProc; serverProc = null; await new Promise((res) => { const t = setTimeout(() => { try { p.kill('SIGKILL'); } catch {} res(); }, 5000); p.once('exit', () => { clearTimeout(t); res(); }); try { p.kill('SIGTERM'); } catch { clearTimeout(t); res(); } }); for (let i = 0; i < 40; i++) { if (await portFree(PORT)) return; await sleep(250); } }
(async () => {
  const BASE = (token, name, over = {}) => ({ token, name, classId: 'kiemtu', gender: 'nam', robe: '#3a6ea5', weaponId: 'kiem', realm: 'na', tier: 1, tuVi: 100, hp: 150, mp: 9999, x: 1252, y: 880, mapId: 'lang_tan_thu', stats: { khiHuyet: 5, vatCong: 5, vatPhong: 0, phapCong: 5, phapPhong: 0, tocDo: 20, minhMan: 10 }, statPoints: 0, freePoints: 10, inventory: {}, stones: 10000, skills: [], skillMastery: {}, counters: {}, achClaimed: [], geo175: 1, gearBag: {}, equipped: [], ageStart: 16, birthDay: 0, lifespan: 100, affV2: 1, linhCan: { main: 'kim', subs: [], purity: 40, quality: 'trung', elements: { kim: 40 }, mutations: [] }, ...over });
  fs.writeFileSync(path.join(DIR, 'characters.json'), JSON.stringify({ p3190w01: BASE('p3190w01', 'Yeu W') }));
  fs.writeFileSync(path.join(DIR, 'world.json'), JSON.stringify({ totalMinutes: 480, savedAt: Date.now(), sects: [] }));
  await startServer();
  const socket = io('http://127.0.0.1:' + PORT, { transports: ['websocket'], reconnection: false });
  const c = { merger: createMerger(), syncs: [], downed: false };
  socket.on('connect', () => socket.emit('hello', { token: 'p3190w01' }));
  socket.on('welcome', (d) => { c.welcome = d; });
  socket.on('server_tick', (t) => { try { c.state = c.merger(t); } catch {} });
  socket.on('char_sync', (d) => c.syncs.push(d.character || d));
  socket.on('you_downed', () => { c.downed = true; console.log('EVENT you_downed'); });
  await sleep(2500);
  socket.emit('sect_found_fight');
  const t0 = Date.now();
  while (Date.now() - t0 < 45000) {
    const me = (c.state?.players || []).find((p) => p.id === c.welcome?.id);
    const b = (c.state?.monsters || []).find((m) => m.trial === 'khaquan');
    console.log(`t=${Math.round((Date.now() - t0) / 1000)}s me=${me ? Math.round(me.x) + ',' + Math.round(me.y) + ' hp=' + me.hp : '?'} boss=${b ? Math.round(b.x) + ',' + Math.round(b.y) + ' hp=' + b.hp : 'NONE'} downed=${c.downed} failDay=${(c.syncs[c.syncs.length - 1] || {}).foundFailDay}`);
    if (!b) { await sleep(2000); continue; }
    if (me) { const dx = b.x - me.x, dy = b.y - me.y, d = Math.hypot(dx, dy) || 1; if (d > 40) socket.emit('client_input', { vx: dx / d, vy: dy / d }); else socket.emit('client_input', { vx: 0, vy: 0 }); }
    await sleep(2000);
  }
  socket.disconnect();
  await stopServer();
  process.exit(0);
})();
