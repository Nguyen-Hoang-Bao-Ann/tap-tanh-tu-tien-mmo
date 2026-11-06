// GĐ319-phụ probe: thua Khảo Quan Ảnh -> chờ 3 ngày game + thi lại 3.000 LT (lần đầu miễn phí).
process.env.NODE_PATH = process.env.HOME + '/workspace/tap-tanh-tu-tien-mmo/client/node_modules';
require('module').Module._initPaths();
const fs = require('fs'); const path = require('path'); const http = require('http');
const { spawn } = require('child_process'); const net = require('net');
const { io } = require('socket.io-client');
const { createMerger } = require(process.env.HOME + '/workspace/tap-tanh-tu-tien-mmo/client/worldmerge.cjs');
const DIR = __dirname; const PORT = 3549;
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
let pass = 0, fail = 0;
function ok(name, cond, extra = '') { if (cond) { pass++; console.log('PASS | ' + name); } else { fail++; console.log('FAIL | ' + name + ' | ' + extra); } }
const STRONG = { khiHuyet: 300, vatCong: 400, vatPhong: 200, phapCong: 50, phapPhong: 100, tocDo: 50, minhMan: 50 };
const BASE = (token, name, over = {}) => ({ token, name, classId: 'kiemtu', gender: 'nam', robe: '#3a6ea5', weaponId: 'kiem', realm: 'na', tier: 1, tuVi: 100, hp: 99999, mp: 9999, x: 1252, y: 880, mapId: 'lang_tan_thu', stats: STRONG, statPoints: 0, freePoints: 10, inventory: {}, stones: 0, skills: [], skillMastery: {}, counters: {}, achClaimed: [], geo175: 1, gearBag: {}, equipped: [], ageStart: 16, birthDay: 0, lifespan: 100, affV2: 1, linhCan: { main: 'kim', subs: [], purity: 40, quality: 'trung', elements: { kim: 40 }, mutations: [] }, ...over });
(async () => {
  const store = {
    p3190w01: BASE('p3190w01', 'Yeu W', { stats: { khiHuyet: 5, vatCong: 5, vatPhong: 0, phapCong: 5, phapPhong: 0, tocDo: 20, minhMan: 10 }, hp: 150, stones: 10000 }),
    p3190x01: BASE('p3190x01', 'Thu Lai X', { x: 1180, y: 900, foundAttempts: 1, stonesTrung: 4000 }),
    p3190y01: BASE('p3190y01', 'Thieu Tien Y', { x: 1330, y: 900, foundAttempts: 1, stonesTrung: 1000 }),
    p3190z01: BASE('p3190z01', 'Dang Cho Z', { x: 1252, y: 960, foundAttempts: 1, foundFailDay: 0, stones: 99999 }),
  };
  fs.writeFileSync(path.join(DIR, 'characters.json'), JSON.stringify(store));
  fs.writeFileSync(path.join(DIR, 'world.json'), JSON.stringify({ totalMinutes: 480, savedAt: Date.now(), sects: [] }));
  await startServer();
  try {
    const W = await connect('p3190w01'); const X = await connect('p3190x01'); const Y = await connect('p3190y01'); const Z = await connect('p3190z01');
    await sleep(1200);
    // Z: dang trong thoi gian cho -> chan ngay, khong spawn
    Z.socket.emit('sect_found_fight');
    const zErr = await waitFor(() => Z.errors.find((e) => e.includes('chờ 6 ngày game') || e.includes('còn 6 ngày')), 6000);
    ok('Z1 vua thua -> thi lai bi chan cho 6 ngay game', !!zErr, Z.errors.join(' / '));
    // Y: thi lai nhung khong du 3.000 LT
    Y.socket.emit('sect_found_fight');
    const yErr = await waitFor(() => Y.errors.find((e) => e.includes('Thi lại Khảo Quan Ảnh tốn 4000')), 6000);
    ok('Y1 thi lai thieu tien bi chan', !!yErr, Y.errors.join(' / '));
    ok('Y2 tien Y nguyen ven (1000 TP)', (lastSync(Y)?.stonesTrung || 0) === 1000, 'stonesTrung=' + lastSync(Y)?.stonesTrung);
    // X: thi lai du tien -> tru dung 3.000, boss spawn, attempts 2
    X.socket.emit('sect_found_fight');
    const xBoss = await waitFor(() => (X.state?.monsters || []).find((m) => m.trial === 'khaquan'), 8000);
    ok('X1 thi lai: boss spawn', !!xBoss);
    const xSync = await waitFor(() => { const s = lastSync(X); return s && s.foundAttempts === 2 ? s : null; }, 6000);
    ok('X2 tru dung 4.000 TP le phi (4000 -> 0), attempts 1->2', !!xSync && (xSync.stonesTrung || 0) === 0, 'stonesTrung=' + lastSync(X)?.stonesTrung + ' attempts=' + lastSync(X)?.foundAttempts);
    X.socket.disconnect();
    // W: lan dau mien phi — dung yen cho boss ha guc -> ghi foundFailDay
    W.socket.emit('sect_found_fight');
    const wBoss = await waitFor(() => (W.state?.monsters || []).find((m) => m.trial === 'khaquan'), 8000);
    ok('W1 lan thi dau: boss spawn (mien phi, stones nguyen 10000)', !!wBoss && (lastSync(W)?.stones || 0) === 10000, 'stones=' + lastSync(W)?.stones);
    // W yeu phai TU DEN GAN boss (boss chi danh khi chu den gan) — lai den cho no ha guc
    const wFailP = waitFor(() => { const s = lastSync(W); return s && (s.foundFailDay ?? -1) >= 0 ? s : null; }, 70000, 500);
    const chaseT0 = Date.now();
    while (Date.now() - chaseT0 < 65000) {
      const s = lastSync(W); if (s && (s.foundFailDay ?? -1) >= 0) break;
      const b = (W.state?.monsters || []).find((m) => m.trial === 'khaquan');
      const me = (W.state?.players || []).find((p) => p.id === W.welcome?.id);
      if (!b || !me) { await sleep(300); continue; }
      const dx = b.x - me.x, dy = b.y - me.y, d = Math.hypot(dx, dy) || 1;
      if (d > 40) W.socket.emit('client_input', { vx: dx / d, vy: dy / d }); else W.socket.emit('client_input', { vx: 0, vy: 0 });
      await sleep(250);
    }
    const wFail = await wFailP;
    // char_sync khong ve sau khi guc/hoi sinh — doc lai qua ket noi moi (welcome.character la payload day du)
    let wRec = null;
    if (!wFail) {
      await waitFor(() => { const me = (W.state?.players || []).find((p) => p.id === W.welcome?.id); return me && me.hp > 0 ? me : null; }, 60000); // cho hoi sinh ve lang
      W.socket.disconnect();
      await sleep(600);
      const W2c = await connect('p3190w01');
      wRec = W2c.welcome?.character || null;
      W2c.socket.disconnect();
    }
    const wFd = wFail ? wFail.foundFailDay : (wRec ? wRec.foundFailDay : -1);
    ok('W2 bi Khao Quan Anh ha guc -> ghi foundFailDay (=0, ngay hien tai)', wFd === 0, 'foundFailDay=' + wFd);
    for (const c of [W, Y, Z]) c.socket.disconnect();
    await sleep(500);
  } catch (e) { console.log('PROBE ERROR: ' + (e && e.stack || e)); fail++; }
  await stopServer();
  console.log(`\n== p319f: ${pass} PASS, ${fail} FAIL ==`);
  process.exit(fail ? 1 : 0);
})();
