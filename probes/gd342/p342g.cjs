// Probe GĐ342-G — Tham Tượng Linh thạch rơi: đọc TRỰC TIẾP amount của drop 'stones' trong tick ngay khi Huyết Lang chết
// (kênh spawnDrop — đúng chỗ móc x1,25), không qua khâu nhặt (nhiễu). 10 lần hạ/người, so trung bình.
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const net = require('net');
const ROOT = path.join(__dirname, '..', '..');
const DIR = __dirname;
const { io } = require(path.join(ROOT, 'client/node_modules/socket.io-client'));
const { createMerger } = require(path.join(ROOT, 'client/worldmerge.cjs'));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function waitFor(fn, ms) { const t0 = Date.now(); while (Date.now() - t0 < ms) { const v = fn(); if (v) return v; await sleep(100); } return null; }
function portFree(port) { return new Promise((res) => { const s = net.createServer(); s.once('error', () => res(false)); s.listen(port, () => s.close(() => res(true))); }); }
let serverProc = null, killTimer = null, CUR_PORT = 3639;
async function startServer(port, tag) {
  CUR_PORT = port;
  if (!(await portFree(port))) throw new Error('port ban ' + port);
  serverProc = spawn('node', ['server/index.js'], { cwd: ROOT, env: { ...process.env, PORT: String(port), TTT_STORAGE: 'file', TTT_CHAR_FILE: path.join(DIR, 'characters.json'), TTT_ACC_FILE: path.join(DIR, 'accounts.json'), TTT_WORLD_FILE: path.join(DIR, 'world.json'), TTT_SESS_FILE: path.join(DIR, 'sessions.json'), TTT_DAY_REAL_MS: '600000', TTT_TUVI_NEED: '5', TTT_WORLD_START_MINUTES: '600' }, stdio: ['ignore', 'pipe', 'pipe'] });
  serverProc.stderr.on('data', () => {});
  serverProc.stdout.on('data', () => {});
  killTimer = setTimeout(() => { try { serverProc.kill('SIGKILL'); } catch (e) {} }, 240000);
  const t0 = Date.now();
  while (Date.now() - t0 < 45000) { try { const r = await fetch(`http://127.0.0.1:${port}/api/status`); if (r.ok) { clearTimeout(killTimer); return; } } catch (e) {} await sleep(500); }
  throw new Error('server khong len');
}
async function stopServer() { if (!serverProc) return; const p = serverProc; serverProc = null; await new Promise((res) => { const t = setTimeout(() => { try { p.kill('SIGKILL'); } catch (e) {} res(); }, 4000); p.once('exit', () => { clearTimeout(t); res(); }); try { p.kill('SIGTERM'); } catch (e) { clearTimeout(t); res(); } }); const t0 = Date.now(); while (Date.now() - t0 < 10000 && !(await portFree(CUR_PORT))) await sleep(300); }
const STATS = { khiHuyet: 500, vatCong: 100, vatPhong: 100, phapCong: 100, phapPhong: 100, tocDo: 60, minhMan: 100 };
function BASE(token, name, extra) {
  return Object.assign({ token, name, classId: 'kiemtu', gender: 'nam', race: null, geo175: 1, realm: 'kd', tier: 1, x: 4248, y: 2950, mapId: 'huyet_sac_rung', hp: 99999, lifespan: 500, birthDay: -5660, ageStart: 16, stats: { ...STATS }, statPoints: 0, freePoints: 0, tuVi: 0, stones: 0, stonesTrung: 0, stonesThuong: 0, stonesCuc: 0, inventory: {}, gearBag: {}, equipped: [], skills: [], job: null, job2: null, job3: null, linhCan: { elements: ['kim'], main: 'kim', count: 1, mutations: [] }, affinity: {}, affV2: 1, bonds: {}, quests: {}, questsDone: {}, flags: {}, counters: {}, disciples: [], foundInvites: [], reformIn: [], sectTech: [], sectArts: [], sectArtsActive: [], mails: [], classRes: {}, food: 100, water: 100 }, extra || {});
}
let pass = 0, fail = 0;
function ok(name, cond, extra) { if (cond) { pass++; console.log('PASS | ' + name); } else { fail++; console.log('FAIL | ' + name + (extra ? ' | ' + extra : '')); } }
function connect(token) {
  const socket = io(`http://127.0.0.1:${CUR_PORT}`, { transports: ['websocket'] });
  const ctx = { socket, merger: createMerger(), state: null, welcome: null };
  socket.on('connect', () => socket.emit('hello', { token }));
  socket.on('welcome', (w) => { ctx.welcome = w; ctx.myName = (w.character || {}).name; });
  socket.on('server_tick', (t) => { const st = ctx.merger(t); if (st) ctx.state = st; });
  return ctx;
}
const meOf = (c) => (c.state?.players || []).find((p) => p.name === c.myName) || null;
const monsOf = (c) => c.state?.monsters || [];
const dropsOf = (c) => c.state?.drops || [];
async function flyTo(c, x, y, tol) {
  if (!c.flying) { c.socket.emit('fly_toggle', {}); c.flying = true; await sleep(350); }
  const t0 = Date.now();
  while (Date.now() - t0 < 30000) { const me = meOf(c); if (!me) { await sleep(120); continue; } const dx = x - me.x, dy = y - me.y; const d = Math.hypot(dx, dy); if (d <= tol) break; c.socket.emit('client_input', { vx: dx / d, vy: dy / d }); await sleep(110); }
  c.socket.emit('client_input', { vx: 0, vy: 0 });
}
async function land(c) { if (c.flying) { c.socket.emit('fly_toggle', {}); c.flying = false; await sleep(450); } }
async function killAndReadDrop(c) {
  const me = meOf(c); if (!me) return null;
  const t0 = monsOf(c).filter((m) => m.kind === 'huyetlang').sort((a, b) => Math.hypot(a.x - me.x, a.y - me.y) - Math.hypot(b.x - me.x, b.y - me.y))[0];
  if (!t0) { await sleep(2000); return null; }
  const known = new Set(dropsOf(c).map((d) => d.id));
  await flyTo(c, t0.x, t0.y, 26); await land(c);
  let deathPos = { x: t0.x, y: t0.y }; let dead = false;
  for (let att = 0; att < 12 && !dead; att++) {
    const live = monsOf(c).find((m) => m.id === t0.id);
    if (!live) { dead = true; break; }
    deathPos = { x: live.x, y: live.y };
    c.socket.emit('player_attack'); await sleep(750);
    if (!monsOf(c).find((m) => m.id === t0.id)) dead = true;
  }
  if (!dead) return null;
  const drop = await waitFor(() => dropsOf(c).find((d) => d.kind === 'stones' && !known.has(d.id) && Math.hypot(d.x - deathPos.x, d.y - deathPos.y) < 90) || null, 3000);
  return drop ? drop.amount : null;
}
const mean = (a) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0);

(async () => {
  const chars = {};
  chars['tk342ttu09'] = BASE('tk342ttu09', 'TtuG342', { talent: { id: 'tham_tuong', tier: 'den' } });
  chars['tk342ttc09'] = BASE('tk342ttc09', 'TtuCtG342', {});
  fs.writeFileSync(path.join(DIR, 'characters.json'), JSON.stringify(chars, null, 1));
  fs.writeFileSync(path.join(DIR, 'accounts.json'), '{}');
  for (const f of ['world.json', 'sessions.json']) { try { fs.unlinkSync(path.join(DIR, f)); } catch (e) {} }
  await startServer(3639, '342g');
  const ttuct = connect('tk342ttc09'); const ttu = connect('tk342ttu09');
  await waitFor(() => ttuct.welcome && ttu.welcome, 10000);
  await waitFor(() => meOf(ttuct) && monsOf(ttuct).length > 0, 15000);
  const sC = [], sT = [];
  for (let i = 0; i < 10; i++) { const a = await killAndReadDrop(ttuct); if (a != null) sC.push(a); }
  for (let i = 0; i < 10; i++) { const a = await killAndReadDrop(ttu); if (a != null) sT.push(a); }
  console.log('DROPS ctrl:', JSON.stringify(sC), 'mean=', mean(sC).toFixed(2));
  console.log('DROPS talent:', JSON.stringify(sT), 'mean=', mean(sT).toFixed(2));
  ok('G1 đối chứng: lượng Linh thạch rơi mỗi lần trong thang gốc (mọi mẫu 4–12, trung bình 6–11)', sC.length >= 8 && sC.every((a) => a >= 4 && a <= 12) && mean(sC) >= 6 && mean(sC) <= 11, JSON.stringify(sC));
  ok('G2 Tham Tượng: Linh thạch rơi +25% (tỉ lệ trung bình 1,10–1,45)', sT.length >= 8 && sC.length >= 8 && (mean(sT) / mean(sC)) >= 1.10 && (mean(sT) / mean(sC)) <= 1.45, `ratio=${sC.length && sT.length ? (mean(sT) / mean(sC)).toFixed(3) : '?'}`);
  ttuct.socket.disconnect(); ttu.socket.disconnect();
  await stopServer();
  console.log('=== TỔNG GĐ342-G: PASS=' + pass + ' FAIL=' + fail);
  process.exit(fail > 0 ? 1 : 0);
})().catch(async (e) => { console.error('PROBE ERROR', e); try { await stopServer(); } catch (x) {} process.exit(2); });
