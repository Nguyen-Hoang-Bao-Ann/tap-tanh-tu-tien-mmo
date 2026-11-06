// GĐ320 probe P5 chung cuoi: buff chi so Tri am +4% do qua sat thuong don thuong len golem
// (attackStatOf -> effStatsOf -> damageThrough; ti le ky vong (57+10)/(55+10) voi vatCong 55).
process.env.NODE_PATH = process.env.HOME + '/workspace/tap-tanh-tu-tien-mmo/client/node_modules';
require('module').Module._initPaths();
const fs = require('fs'); const path = require('path'); const http = require('http');
const { spawn } = require('child_process'); const net = require('net');
const { io } = require('socket.io-client');
const { createMerger } = require(process.env.HOME + '/workspace/tap-tanh-tu-tien-mmo/client/worldmerge.cjs');
const DIR = __dirname; const PORT = 3545;
for (const f of ['characters_e.json', 'world_e.json', 'sessions_e.json', 'accounts_e.json']) { try { fs.unlinkSync(path.join(DIR, f)); } catch {} }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
function portFree(port) { return new Promise((res) => { const s = net.createServer(); s.once('error', () => res(false)); s.once('listening', () => s.close(() => res(true))); s.listen(port, '127.0.0.1'); }); }
function waitStatus(tries = 90) { return new Promise((resolve, reject) => { let n = 0; const tick = () => { const req = http.get({ host: '127.0.0.1', port: PORT, path: '/api/status', timeout: 1500 }, (r) => { let b = ''; r.on('data', (c) => b += c); r.on('end', () => { try { resolve(JSON.parse(b)); } catch { again(); } }); }); req.on('error', again); req.on('timeout', () => { req.destroy(); again(); }); }; const again = () => { if (++n >= tries) reject(new Error('server khong len')); else setTimeout(tick, 700); }; tick(); }); }
let serverProc = null;
async function startServer() {
  if (!await portFree(PORT)) throw new Error('port ban');
  const env = { ...process.env, PORT: String(PORT), TTT_STORAGE: 'file', TTT_CHAR_FILE: path.join(DIR, 'characters_e.json'), TTT_WORLD_FILE: path.join(DIR, 'world_e.json'), TTT_SESS_FILE: path.join(DIR, 'sessions_e.json'), TTT_ACC_FILE: path.join(DIR, 'accounts_e.json'), TTT_DAY_REAL_MS: '600000', TTT_TUVI_NEED: '5' };
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
function myPlayer(c) { return c.state?.players?.find((p) => p.id === c.welcome?.id) || null; }
const BASE = (token, name, over = {}) => ({ token, name, classId: 'kiemtu', gender: 'nam', robe: '#3a6ea5', weaponId: 'kiem', realm: 'kd', tier: 1, tuVi: 100, hp: 99999, mp: 9999, x: 3702, y: 687, mapId: 'lang_tan_thu', stats: { khiHuyet: 60, vatCong: 55, vatPhong: 60, phapCong: 10, phapPhong: 40, tocDo: 30, minhMan: 5 }, statPoints: 0, freePoints: 10, inventory: {}, stones: 0, skills: [], skillMastery: {}, counters: {}, achClaimed: [], geo175: 1, gearBag: {}, equipped: [], ageStart: 16, birthDay: 0, lifespan: 100, affV2: 1, linhCan: { main: 'kim', subs: [], purity: 40, quality: 'trung', elements: { kim: 40 }, mutations: [] }, ...over });
const bondSeed = (score, branch = null) => ({ score, branch, pick: null, gainDay: -1, gainAmt: 0, name: '' });
(async () => {
  const store = {
    p3200f01: BASE('p3200f01', 'Danh F1', { bonds: { 'p:p3200f02': { ...bondSeed(1000, 'tinh'), name: 'Danh F2' } } }),
    p3200f02: BASE('p3200f02', 'Danh F2', { x: 3850, y: 700, bonds: { 'p:p3200f01': { ...bondSeed(1000, 'tinh'), name: 'Danh F1' } } }),
    p3200f03: BASE('p3200f03', 'Danh F3', { x: 2500, y: 900 }),
  };
  fs.writeFileSync(path.join(DIR, 'characters_e.json'), JSON.stringify(store));
  fs.writeFileSync(path.join(DIR, 'world_e.json'), JSON.stringify({ totalMinutes: 480, savedAt: Date.now(), sects: [] }));
  await startServer();
  let pass = 0, fail = 0;
  const ok = (n, c, x = '') => { if (c) { pass++; console.log('PASS | ' + n); } else { fail++; console.log('FAIL | ' + n + ' | ' + x); } };
  try {
    const f1 = await connect('p3200f01'); const f2 = await connect('p3200f02'); const f3 = await connect('p3200f03');
    await sleep(1500);
    const golemHp = (c, id) => { const m = (c.state?.monsters || []).find((mn) => mn.id === id); return m ? m.hp : null; };
    async function oneHit(atk, partner, golemId) {
      // lai atk toi golem, partner (neu co) bam theo atk; danh 1 don, tra ve do sut hp
      const t0 = Date.now();
      while (Date.now() - t0 < 25000) {
        const me = myPlayer(atk);
        const g = (atk.state?.monsters || []).find((mn) => mn.id === golemId);
        if (!me || !g) return null;
        if (partner) { const pm = myPlayer(partner); const pa = (partner.state?.players || []).find((p) => p.id === atk.welcome?.id); if (pm && pa) { const pd = Math.hypot(pa.x - pm.x, pa.y - pm.y); partner.socket.emit('client_input', pd > 130 ? { vx: (pa.x - pm.x) / (pd || 1), vy: (pa.y - pm.y) / (pd || 1) } : { vx: 0, vy: 0 }); } }
        const d = Math.hypot(g.x - me.x, g.y - me.y);
        if (d > 42) { atk.socket.emit('client_input', { vx: (g.x - me.x) / (d || 1), vy: (g.y - me.y) / (d || 1) }); await sleep(220); continue; }
        atk.socket.emit('client_input', { vx: 0, vy: 0 });
        await sleep(350);
        const before = golemHp(atk, golemId);
        atk.socket.emit('player_attack', {});
        await sleep(1100);
        const after = golemHp(atk, golemId);
        if (before != null && after != null && after < before) return before - after;
        if (after == null) return null; // chet = don qua manh, khong doc duoc
        await sleep(600); // don truot/ne: thu lai
      }
      return null;
    }
    const drops = { f1: [], f3: [] };
    const golems = () => (f1.state?.monsters || []).filter((mn) => mn.kind === 'golem');
    await sleep(1000);
    const gs = golems();
    console.log('golem thay: ' + gs.map((g) => g.id + '@' + Math.round(g.x) + ',' + Math.round(g.y) + ' hp' + g.hp).join(' | '));
    if (gs.length >= 2) {
      const d1 = await oneHit(f1, f2, gs[0].id); if (d1) drops.f1.push(d1);
      const d3 = await oneHit(f3, null, gs[0].id); if (d3) drops.f3.push(d3);
      const d3b = await oneHit(f3, null, gs[1].id); if (d3b) drops.f3.push(d3b);
      const d1b = await oneHit(f1, f2, gs[1].id); if (d1b) drops.f1.push(d1b);
    }
    console.log('sut hp: F1(bond)=' + JSON.stringify(drops.f1) + ' F3(solo)=' + JSON.stringify(drops.f3));
    const avg = (a) => a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0;
    // loai don chi mang (sut >= 1.8x trung binh tho cua phia solo)
    const med = drops.f3.slice().sort((a, b) => a - b)[Math.floor(drops.f3.length / 2)] || 0;
    const f1c = drops.f1.filter((d) => d < med * 1.8), f3c = drops.f3.filter((d) => d < med * 1.8);
    console.log('sau loc crit: F1=' + JSON.stringify(f1c) + ' F3=' + JSON.stringify(f3c));
    ok('P5 buff chi so Tri am +4% tang sat thuong don thuong', f1c.length >= 1 && f3c.length >= 1 && avg(f1c) > avg(f3c), 'avgF1=' + avg(f1c) + ' avgF3=' + avg(f3c));
    f1.socket.disconnect(); f2.socket.disconnect(); f3.socket.disconnect();
  } catch (e) { console.log('ERR ' + (e && e.stack || e)); }
  finally { await stopServer(); console.log('TONG KET E: ' + pass + ' PASS, ' + fail + ' FAIL'); process.exit(fail ? 1 : 0); }
})();
