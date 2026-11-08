// Debug B: tái hiện p345 — char F vào/ra trước, D atk 400 đi bộ giết đợt 1 (killWave như probe), rồi quan sát đợt 2 qua merged state + RAW.
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const net = require('net');
const ROOT = path.join(__dirname, '..', '..');
const DIR = __dirname;
const { io } = require(path.join(ROOT, 'client/node_modules/socket.io-client'));
const { createMerger } = require(path.join(ROOT, 'client/worldmerge.cjs'));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function waitFor(fn, ms) { const t0 = Date.now(); while (Date.now() - t0 < ms) { const v = fn(); if (v) return v; await sleep(120); } return null; }
function portFree(port) { return new Promise((res) => { const s = net.createServer(); s.once('error', () => res(false)); s.listen(port, () => s.close(() => res(true))); }); }
let serverProc = null, CUR_PORT = 3647;
async function startServer(port) {
  CUR_PORT = port;
  if (!(await portFree(port))) throw new Error('port ban');
  const env = { ...process.env, PORT: String(port), TTT_STORAGE: 'file', TTT_CHAR_FILE: path.join(DIR, 'characters.json'), TTT_ACC_FILE: path.join(DIR, 'accounts.json'), TTT_WORLD_FILE: path.join(DIR, 'world.json'), TTT_SESS_FILE: path.join(DIR, 'sessions.json'), TTT_DAY_REAL_MS: '600000', TTT_TUVI_NEED: '5' };
  serverProc = spawn('node', ['server/index.js'], { cwd: ROOT, env, stdio: ['ignore', 'pipe', 'pipe'] });
  serverProc.stderr.on('data', (d) => { try { fs.appendFileSync(path.join(DIR, 'srv_dbg.log'), d); } catch (e) {} });
  serverProc.stdout.on('data', (d) => { try { fs.appendFileSync(path.join(DIR, 'srv_dbg.log'), d); } catch (e) {} });
  const t0 = Date.now();
  while (Date.now() - t0 < 45000) { try { const r = await fetch(`http://127.0.0.1:${port}/api/status`); if (r.ok) return; } catch (e) {} await sleep(500); }
  throw new Error('server khong len');
}
async function stopServer() { if (!serverProc) return; const p = serverProc; serverProc = null; await new Promise((res) => { const t = setTimeout(() => { try { p.kill('SIGKILL'); } catch (e) {} res(); }, 4000); p.once('exit', () => { clearTimeout(t); res(); }); try { p.kill('SIGTERM'); } catch (e) { clearTimeout(t); res(); } }); }
const LC1 = { elements: ['kim'], main: 'kim', count: 1, mutations: [] };
function BASE(token, name, extra) {
  return Object.assign({ token, name, classId: 'kiemtu', gender: 'nam', race: null, geo175: 1, realm: 'lk', tier: 9, x: 700, y: 480, mapId: 'lang_tan_thu', hp: 99999, lifespan: 500, birthDay: -5660, ageStart: 16, stats: { khiHuyet: 8000, vatCong: 400, vatPhong: 250, phapCong: 400, phapPhong: 250, tocDo: 60, minhMan: 100 }, statPoints: 0, freePoints: 0, tuVi: 99999, stones: 0, stonesTrung: 0, stonesThuong: 0, stonesCuc: 0, inventory: {}, gearBag: {}, equipped: [], skills: [], job: null, job2: null, job3: null, linhCan: { ...LC1 }, affinity: {}, affV2: 1, bonds: {}, quests: {}, questsDone: {}, flags: {}, counters: {}, disciples: [], foundInvites: [], reformIn: [], sectTech: [], sectArts: [], sectArtsActive: [], mails: [], classRes: {}, food: 100, water: 100, branch: null, branchQi: 0, anState: { lkDays: 0, kdDays: 0, lkLastDay: -1, kdLastDay: -1, vienman: true, luyenHon: true, nhapDao: false } }, extra || {});
}
const TKF = 'dbg345tokenF123456', TKD = 'dbg345tokenD123456';
const T0 = Date.now();
const log = (...a) => console.log(((Date.now() - T0) / 1000).toFixed(1) + 's', ...a);
function connect(token, rawLog) {
  const socket = io(`http://127.0.0.1:${CUR_PORT}`, { transports: ['websocket'] });
  const ctx = { socket, merger: createMerger(), state: null, welcome: null, notices: [] };
  socket.on('connect', () => socket.emit('hello', { token }));
  socket.on('welcome', (w) => { ctx.welcome = w; ctx.myName = (w.character || {}).name; });
  socket.on('notice', (n) => ctx.notices.push(n.text || ''));
  socket.on('server_tick', (t) => { const st = ctx.merger(t); if (st) ctx.state = st; if (rawLog) { const ms = (t.monsters || []).filter((m) => m.trial === 'uhon'); if (ms.length) log('RAW monsters:', ms.map((m) => m.id + '@' + m.x + ',' + m.y + ' hp' + m.hp + ' hid' + m.hidden).join(' | ')); const g = (t.monstersGone || []); if (g.length) log('RAW gone:', g.join(',')); } });
  return ctx;
}
const meOf = (c) => (c.state?.players || []).find((p) => p.name === c.myName) || null;
const ghosts = (c) => (c.state?.monsters || []).filter((m) => m.trial === 'uhon');
async function walkTo(c, x, y, tol) {
  const t0 = Date.now();
  while (Date.now() - t0 < 20000) { const me = meOf(c); if (!me) { await sleep(120); continue; } const dx = x - me.x, dy = y - me.y; const d = Math.hypot(dx, dy); if (d <= (tol || 45)) break; c.socket.emit('client_input', { vx: dx / d, vy: dy / d }); await sleep(110); }
  c.socket.emit('client_input', { vx: 0, vy: 0 });
}
async function killWave(c, timeoutMs) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    const alive = ghosts(c).filter((m) => m.hp > 0);
    if (!alive.length) { await sleep(3600); if (!ghosts(c).filter((m) => m.hp > 0).length) return true; continue; }
    const me = meOf(c); if (!me) { await sleep(200); continue; }
    const t = alive.sort((a, b) => Math.hypot(a.x - me.x, a.y - me.y) - Math.hypot(b.x - me.x, b.y - me.y))[0];
    const d = Math.hypot(t.x - me.x, t.y - me.y);
    if (d > 55) await walkTo(c, t.x, t.y, 40);
    c.socket.emit('player_attack');
    await sleep(620);
  }
  return false;
}
(async () => {
  fs.writeFileSync(path.join(DIR, 'characters.json'), JSON.stringify({ [TKF]: BASE(TKF, 'DBG F'), [TKD]: BASE(TKD, 'DBG D') }, null, 1));
  fs.writeFileSync(path.join(DIR, 'accounts.json'), '{}');
  for (const f of ['world.json', 'sessions.json']) { try { fs.unlinkSync(path.join(DIR, f)); } catch (e) {} }
  await startServer(CUR_PORT);
  const cF = connect(TKF, false);
  await waitFor(() => cF.welcome, 15000);
  cF.socket.emit('an_gate_enter', { canh: 'uhon' });
  await sleep(1500);
  cF.socket.disconnect();
  log('F disconnected');
  const cD = connect(TKD, true);
  await waitFor(() => cD.welcome, 15000);
  await waitFor(() => meOf(cD), 15000);
  cD.socket.emit('an_gate_enter', { canh: 'uhon' });
  await waitFor(() => ghosts(cD).length >= 4, 15000);
  log('wave1 seen:', ghosts(cD).length);
  log('killWave wave1 =', await killWave(cD, 90000));
  log('notices:', JSON.stringify(cD.notices.filter((n) => n.includes('đợt') || n.includes('Đợt'))));
  log('--- quan sát đợt 2 trong 30s ---');
  for (let i = 0; i < 30; i++) { await sleep(1000); log('merged uhon =', ghosts(cD).length, ghosts(cD).map((m) => m.id + ':' + m.hp + ':h' + (m.hidden || 0)).join(' ')); }
  cD.socket.disconnect();
  await stopServer();
  process.exit(0);
})().catch(async (e) => { console.error('DBG CRASH', e); await stopServer(); process.exit(2); });
