// GĐ320 probe P5 thay thế: buff/debuff chỉ số Duyên Nợ đọc qua maxHp trong payload (khiHuyet nằm trong
// effStatsOf — cùng đường nhân với công/phòng). Tri âm +4% / Không đội trời chung -5%: số lớn, tất định.
process.env.NODE_PATH = process.env.HOME + '/workspace/tap-tanh-tu-tien-mmo/client/node_modules';
require('module').Module._initPaths();
const fs = require('fs'); const path = require('path'); const http = require('http');
const { spawn } = require('child_process'); const net = require('net');
const { io } = require('socket.io-client');
const DIR = __dirname; const PORT = 3544;
for (const f of ['characters_d.json', 'world_d.json', 'sessions_d.json', 'accounts_d.json']) { try { fs.unlinkSync(path.join(DIR, f)); } catch {} }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
function portFree(port) { return new Promise((res) => { const s = net.createServer(); s.once('error', () => res(false)); s.once('listening', () => s.close(() => res(true))); s.listen(port, '127.0.0.1'); }); }
function waitStatus(tries = 90) { return new Promise((resolve, reject) => { let n = 0; const tick = () => { const req = http.get({ host: '127.0.0.1', port: PORT, path: '/api/status', timeout: 1500 }, (r) => { let b = ''; r.on('data', (c) => b += c); r.on('end', () => { try { resolve(JSON.parse(b)); } catch { again(); } }); }); req.on('error', again); req.on('timeout', () => { req.destroy(); again(); }); }; const again = () => { if (++n >= tries) reject(new Error('server khong len')); else setTimeout(tick, 700); }; tick(); }); }
let serverProc = null;
async function startServer() {
  if (!await portFree(PORT)) throw new Error('port ban');
  const env = { ...process.env, PORT: String(PORT), TTT_STORAGE: 'file', TTT_CHAR_FILE: path.join(DIR, 'characters_d.json'), TTT_WORLD_FILE: path.join(DIR, 'world_d.json'), TTT_SESS_FILE: path.join(DIR, 'sessions_d.json'), TTT_ACC_FILE: path.join(DIR, 'accounts_d.json'), TTT_DAY_REAL_MS: '600000', TTT_TUVI_NEED: '5' };
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
    const c = { socket, syncs: [] };
    socket.on('connect', () => socket.emit('hello', { token }));
    socket.on('welcome', (d) => { c.welcome = d; resolve(c); });
    socket.on('char_sync', (d) => c.syncs.push(d.character || d));
    setTimeout(() => reject(new Error('connect timeout')), 15000);
  });
}
const lastSync = (c) => c.syncs[c.syncs.length - 1] || c.welcome?.character;
const BASE = (token, name, over = {}) => ({ token, name, classId: 'kiemtu', gender: 'nam', robe: '#3a6ea5', weaponId: 'kiem', realm: 'kd', tier: 1, tuVi: 100, hp: 99999, mp: 9999, x: 1565, y: 1252, mapId: 'lang_tan_thu', stats: { khiHuyet: 30, vatCong: 30, vatPhong: 25, phapCong: 10, phapPhong: 20, tocDo: 20, minhMan: 20 }, statPoints: 0, freePoints: 10, inventory: {}, stones: 0, skills: [], skillMastery: {}, counters: {}, achClaimed: [], geo175: 1, gearBag: {}, equipped: [], ageStart: 16, birthDay: 0, lifespan: 100, affV2: 1, linhCan: { main: 'kim', subs: [], purity: 40, quality: 'trung', elements: { kim: 40 }, mutations: [] }, ...over });
const bondSeed = (score, branch = null) => ({ score, branch, pick: null, gainDay: -1, gainAmt: 0, name: '' });
(async () => {
  // maxHp goc: 100 + 30*10 = 400. Tri am (+4%): 100 + 312 = 412. Khong doi (-5%): 100 + 285 = 385.
  const store = {
    p3200f01: BASE('p3200f01', 'TriAm F1', { x: 1500, y: 1252, bonds: { 'p:p3200f02': { ...bondSeed(1000, 'tinh'), name: 'TriAm F2' } } }),
    p3200f02: BASE('p3200f02', 'TriAm F2', { x: 1580, y: 1252, bonds: { 'p:p3200f01': { ...bondSeed(1000, 'tinh'), name: 'TriAm F1' } } }),
    p3200f03: BASE('p3200f03', 'Solo F3', { x: 2500, y: 1252 }),
    p3200f04: BASE('p3200f04', 'No F4', { x: 1500, y: 1600, bonds: { 'p:p3200f05': { ...bondSeed(-700), name: 'No F5' } } }),
    p3200f05: BASE('p3200f05', 'No F5', { x: 1580, y: 1600, bonds: { 'p:p3200f04': { ...bondSeed(-700), name: 'No F4' } } }),
  };
  fs.writeFileSync(path.join(DIR, 'characters_d.json'), JSON.stringify(store));
  fs.writeFileSync(path.join(DIR, 'world_d.json'), JSON.stringify({ totalMinutes: 480, savedAt: Date.now(), sects: [] }));
  await startServer();
  let pass = 0, fail = 0;
  const ok = (n, c, x = '') => { if (c) { pass++; console.log('PASS | ' + n); } else { fail++; console.log('FAIL | ' + n + ' | ' + x); } };
  try {
    const f2 = await connect('p3200f02'); // ban doi vao truoc
    const f1 = await connect('p3200f01');
    await sleep(2500); // cho cache fx + mot sync moi
    f1.socket.emit('talk_npc', { npcId: 'npc_truonglang' }); // kich mot char_sync tuoi
    await sleep(1200);
    const m1 = lastSync(f1)?.maxHp;
    const f3 = await connect('p3200f03');
    await sleep(600);
    const m3 = lastSync(f3)?.maxHp;
    console.log('maxHp: tri am=' + m1 + ' solo=' + m3 + ' (goc 400, ky vong tri am 412)');
    ok('P5a buff chi so Tri am +4% qua maxHp', m1 === 412 && m3 === 400, 'm1=' + m1 + ' m3=' + m3);
    const f5 = await connect('p3200f05');
    const f4 = await connect('p3200f04');
    await sleep(2500);
    f4.socket.emit('talk_npc', { npcId: 'npc_truonglang' });
    await sleep(1200);
    const m4 = lastSync(f4)?.maxHp;
    console.log('maxHp: no sau=' + m4 + ' (ky vong 385)');
    ok('P5b debuff Khong doi troi chung -5% qua maxHp', m4 === 385, 'm4=' + m4);
    f1.socket.disconnect(); f2.socket.disconnect(); f3.socket.disconnect(); f4.socket.disconnect(); f5.socket.disconnect();
  } catch (e) { console.log('ERR ' + (e && e.stack || e)); }
  finally { await stopServer(); console.log('TONG KET D: ' + pass + ' PASS, ' + fail + ' FAIL'); process.exit(fail ? 1 : 0); }
})();
