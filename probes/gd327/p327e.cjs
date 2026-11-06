// Probe GĐ327e — Hộ Thể +3% phòng đo ở điểm gãy làm tròn: Kiếm Ma (công 26) cắn người phòng 78:
// damageThrough(26, 78) = 15; phòng +3% -> 80.3 -> damageThrough = 14. Hai nhân vật sinh đôi, chỉ khác tông pháp.
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const net = require('net');
const ROOT = path.join(__dirname, '..', '..');
const PORT = 3567;
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
  return Object.assign({ token, name, classId: 'kiemtu', gender: 'nam', race: null, geo175: 1, realm: 'kd', tier: 1, x: 5702, y: 1232, mapId: 'lang_tan_thu', hp: 99999, stats: { khiHuyet: 500, vatCong: 100, vatPhong: 78, phapCong: 100, phapPhong: 78, tocDo: 60, minhMan: 60 }, statPoints: 0, freePoints: 0, tuVi: 0, stones: 0, stonesTrung: 0, stonesThuong: 0, stonesCuc: 0, inventory: {}, gearBag: {}, equipped: [], skills: [], job: null, job2: null, job3: null, linhCan: { element: 'kim', grade: 'trung', mult: 1.2 }, affinity: {}, affV2: 1, bonds: {}, quests: {}, questsDone: {}, flags: {}, counters: {}, disciples: [], foundInvites: [], reformIn: [], sectTech: [], mails: [], classRes: {} }, extra || {});
}
function SECT(id, name, members, extra) { return Object.assign({ id, name, intro: '', fund: 0, level: 1, uy: 0, members, applicants: [], activeQuests: [], territories: [], territory: null, warehouse: [], garden: [], depts: {}, tributeDay: 100, upkeepDay: 100, questDay: 100, debtDays: 0 }, extra || {}); }
let pass = 0, fail = 0;
function ok(name, cond, extra) { if (cond) { pass++; console.log('PASS | ' + name); } else { fail++; console.log('FAIL | ' + name + (extra ? ' | ' + extra : '')); } }
async function connect(token) {
  const socket = io(`http://127.0.0.1:${PORT}`, { transports: ['websocket'] });
  const ctx = { socket, merger: createMerger(), state: null, welcome: null };
  socket.on('connect', () => socket.emit('hello', { token }));
  socket.on('welcome', (w) => { ctx.welcome = w; });
  socket.on('server_tick', (t) => { const st = ctx.merger(t); if (st) ctx.state = st; });
  await waitFor(() => ctx.welcome, 20000);
  return ctx;
}
const meOf = (c) => (c.state?.players || []).find((p) => p.id === c.welcome.id);
const monsOf = (c) => c.state?.monsters || [];
async function flyTo(c, x, y, tol) {
  c.socket.emit('fly_toggle', {}); await sleep(350);
  const t0 = Date.now();
  while (Date.now() - t0 < 30000) { const me = meOf(c); if (!me) { await sleep(120); continue; } const dx = x - me.x, dy = y - me.y; const d = Math.hypot(dx, dy); if (d <= (tol || 45)) break; c.socket.emit('client_input', { vx: dx / d, vy: dy / d }); await sleep(110); }
  c.socket.emit('client_input', { vx: 0, vy: 0 });
  c.socket.emit('fly_toggle', {}); await sleep(450);
}
async function sampleBites(c, n) {
  // tìm Kiếm Ma đầy máu, bay tới đứng cạnh, ghi các cú sụt máu của mình
  const drops = []; const t0 = Date.now();
  let target = null;
  while (Date.now() - t0 < 40000 && !target) { const ks = monsOf(c).filter((m) => m.kind === 'kiemma' && (m.hp || 0) > 0); if (ks.length) target = ks[0]; else await sleep(300); }
  if (!target) return drops;
  await flyTo(c, target.x + 42, target.y, 40);
  let last = null;
  const t1 = Date.now();
  while (Date.now() - t1 < 60000 && drops.length < n) {
    const me = meOf(c); if (!me) { await sleep(150); continue; }
    if (last === null) { last = me.hp; await sleep(150); continue; }
    if (me.hp < last) { drops.push(last - me.hp); last = me.hp; }
    await sleep(150);
  }
  return drops;
}
const median = (a) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : 0; };
(async () => {
  const chars = {
    p327e00001: BASE('p327e00001', ' KhongPhap'),
    p327e00002: BASE('p327e00002', ' CoHoThe', { sectTech: ['ho_the'] }),
  };
  fs.writeFileSync(path.join(DIR, 'characters.json'), JSON.stringify(chars));
  const sects = [SECT('st', 'Tông Pháp', [{ token: 'p327e00001', name: ' KhongPhap', role: 'detu', contrib: 0 }, { token: 'p327e00002', name: ' CoHoThe', role: 'detu', contrib: 0 }])];
  fs.writeFileSync(path.join(DIR, 'world.json'), JSON.stringify({ totalMinutes: 100 * 1440, savedAt: Date.now(), sects }));
  await startServer();
  const A = await connect('p327e00001');
  const bitesA = await sampleBites(A, 6);
  A.socket.disconnect(); await sleep(800);
  const B = await connect('p327e00002');
  const bitesB = await sampleBites(B, 6);
  B.socket.disconnect();
  ok('E1 du mau can (moi ben >= 5 cu)', bitesA.length >= 5 && bitesB.length >= 5, `A=${JSON.stringify(bitesA)} B=${JSON.stringify(bitesB)}`);
  ok('E2 Ho The +3% phong: can giam 15 -> 14 o diem gay lam tron', median(bitesA) === 15 && median(bitesB) === 14, `medA=${median(bitesA)} medB=${median(bitesB)} A=${JSON.stringify(bitesA)} B=${JSON.stringify(bitesB)}`);
  await stopServer();
  console.log(`\n== p327e: ${pass} PASS, ${fail} FAIL ==`);
  process.exit(fail ? 1 : 0);
})();
