// GĐ320 probe P5 dai: thien 330s (11 moc 30s) — phan le tich luy cua buff +10% (Hen ho) phai cho +1 vuot.
process.env.NODE_PATH = process.env.HOME + '/workspace/tap-tanh-tu-tien-mmo/client/node_modules';
require('module').Module._initPaths();
const fs = require('fs'); const path = require('path'); const http = require('http');
const { spawn } = require('child_process'); const net = require('net');
const { io } = require('socket.io-client');
const { createMerger } = require(process.env.HOME + '/workspace/tap-tanh-tu-tien-mmo/client/worldmerge.cjs');
const DIR = __dirname; const PORT = 3543;
for (const f of ['characters_c.json', 'world_c.json', 'sessions_c.json', 'accounts_c.json']) { try { fs.unlinkSync(path.join(DIR, f)); } catch {} }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
function portFree(port) { return new Promise((res) => { const s = net.createServer(); s.once('error', () => res(false)); s.once('listening', () => s.close(() => res(true))); s.listen(port, '127.0.0.1'); }); }
function waitStatus(tries = 90) { return new Promise((resolve, reject) => { let n = 0; const tick = () => { const req = http.get({ host: '127.0.0.1', port: PORT, path: '/api/status', timeout: 1500 }, (r) => { let b = ''; r.on('data', (c) => b += c); r.on('end', () => { try { resolve(JSON.parse(b)); } catch { again(); } }); }); req.on('error', again); req.on('timeout', () => { req.destroy(); again(); }); }; const again = () => { if (++n >= tries) reject(new Error('server khong len')); else setTimeout(tick, 700); }; tick(); }); }
let serverProc = null;
async function startServer() {
  if (!await portFree(PORT)) throw new Error('port ban');
  const env = { ...process.env, PORT: String(PORT), TTT_STORAGE: 'file', TTT_CHAR_FILE: path.join(DIR, 'characters_c.json'), TTT_WORLD_FILE: path.join(DIR, 'world_c.json'), TTT_SESS_FILE: path.join(DIR, 'sessions_c.json'), TTT_ACC_FILE: path.join(DIR, 'accounts_c.json'), TTT_DAY_REAL_MS: '600000', TTT_TUVI_NEED: '5' };
  serverProc = spawn('node', ['server/index.js'], { cwd: process.env.HOME + '/workspace/tap-tanh-tu-tien-mmo', env, stdio: ['ignore', 'pipe', 'pipe'] });
  let killTimer = setTimeout(() => { try { serverProc.kill('SIGKILL'); } catch {} }, 60000);
  serverProc.on('exit', () => clearTimeout(killTimer));
  await waitStatus(); clearTimeout(killTimer);
}
async function stopServer() {
  if (!serverProc) return; const p = serverProc; serverProc = null;
  await new Promise((res) => { const t = setTimeout(() => { try { p.kill('SIGKILL'); } catch {} res(); }, 5000); p.once('exit', () => { clearTimeout(t); res(); }); try { p.kill('SIGTERM'); } catch { clearTimeout(t); res(); } });
  for (let i = 0; i < 40; i++) { if (await portFree(PORT)) return; await sleep(250); }
}
function connect(token) {
  return new Promise((resolve, reject) => {
    const socket = io('http://127.0.0.1:' + PORT, { transports: ['websocket'], reconnection: false });
    const c = { socket, merger: createMerger(), syncs: [] };
    socket.on('connect', () => socket.emit('hello', { token }));
    socket.on('welcome', (d) => { c.welcome = d; resolve(c); });
    socket.on('server_tick', (t) => { try { c.state = c.merger(t); } catch {} });
    socket.on('char_sync', (d) => c.syncs.push(d.character || d));
    setTimeout(() => reject(new Error('connect timeout')), 15000);
  });
}
const lastSync = (c) => c.syncs[c.syncs.length - 1] || c.welcome?.character;
const BASE = (token, name, over = {}) => ({ token, name, classId: 'kiemtu', gender: 'nam', robe: '#3a6ea5', weaponId: 'kiem', realm: 'ht', tier: 9, tuVi: 100, hp: 99999, mp: 9999, x: 1565, y: 1252, mapId: 'lang_tan_thu', stats: { khiHuyet: 30, vatCong: 30, vatPhong: 25, phapCong: 10, phapPhong: 20, tocDo: 20, minhMan: 20 }, statPoints: 0, freePoints: 10, inventory: {}, stones: 0, skills: [], skillMastery: {}, counters: {}, achClaimed: [], geo175: 1, gearBag: {}, equipped: [], ageStart: 16, birthDay: 0, lifespan: 100, affV2: 1, linhCan: { main: 'kim', subs: [], purity: 40, quality: 'trung', elements: { kim: 40 }, mutations: [] }, ...over });
const bondSeed = (score, branch = null) => ({ score, branch, pick: null, gainDay: -1, gainAmt: 0, name: '' });
(async () => {
  const store = {
    p3200e01: BASE('p3200e01', 'Thien E1', { x: 1500, y: 438, bonds: { 'p:p3200e02': { ...bondSeed(700, 'tinh'), name: 'Thien E2' } } }),
    p3200e02: BASE('p3200e02', 'Thien E2', { x: 1580, y: 438, bonds: { 'p:p3200e01': { ...bondSeed(700, 'tinh'), name: 'Thien E1' } } }),
    p3200e03: BASE('p3200e03', 'Thien E3', { x: 1565, y: 520 }),
  };
  fs.writeFileSync(path.join(DIR, 'characters_c.json'), JSON.stringify(store));
  fs.writeFileSync(path.join(DIR, 'world_c.json'), JSON.stringify({ totalMinutes: 480, savedAt: Date.now(), sects: [] }));
  await startServer();
  try {
    const e1 = await connect('p3200e01'); const e2 = await connect('p3200e02'); const e3 = await connect('p3200e03');
    await sleep(2000);
    const b1 = lastSync(e1)?.tuVi || 0, b3 = lastSync(e3)?.tuVi || 0;
    e1.socket.emit('meditate_toggle', {}); e2.socket.emit('meditate_toggle', {}); e3.socket.emit('meditate_toggle', {});
    console.log('bat dau thien 330s...');
    await sleep(330000);
    e1.socket.emit('meditate_toggle', {}); e2.socket.emit('meditate_toggle', {}); e3.socket.emit('meditate_toggle', {});
    await sleep(1500);
    const gBond = (lastSync(e1)?.tuVi || 0) - b1;
    const gSolo = (lastSync(e3)?.tuVi || 0) - b3;
    console.log('thien 330s: co ban doi +' + gBond + ' | mot minh +' + gSolo);
    const cond = gSolo >= 9 && gBond >= gSolo + 1 && gBond / gSolo >= 1.05 && gBond / gSolo <= 1.3;
    console.log((cond ? 'PASS' : 'FAIL') + ' | P5 thien gan ban doi Hen ho (+10%) vuot mot minh qua tich luy phan le');
    process.exit(cond ? 0 : 1);
  } catch (e) { console.log('ERR ' + (e && e.stack || e)); process.exit(1); }
  finally { await stopServer(); }
})();
