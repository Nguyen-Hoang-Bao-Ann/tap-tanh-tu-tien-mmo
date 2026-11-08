// Debug chân Y GĐ343
const { spawn } = require('child_process');
const fs = require('fs'); const path = require('path'); const net = require('net');
const ROOT = path.join(__dirname, '..', '..'); const DIR = __dirname;
const { io } = require(path.join(ROOT, 'client/node_modules/socket.io-client'));
const { createMerger } = require(path.join(ROOT, 'client/worldmerge.cjs'));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function waitFor(fn, ms) { const t0 = Date.now(); while (Date.now() - t0 < ms) { const v = fn(); if (v) return v; await sleep(120); } return null; }
function portFree(port) { return new Promise((res) => { const s = net.createServer(); s.once('error', () => res(false)); s.listen(port, () => s.close(() => res(true))); }); }
let serverProc = null, killTimer = null, CUR_PORT = 0;
async function startServer(port, tag, startMin) {
  CUR_PORT = port;
  if (!(await portFree(port))) throw new Error('port ban ' + port);
  const env = { ...process.env, PORT: String(port), TTT_STORAGE: 'file', TTT_CHAR_FILE: path.join(DIR, 'characters.json'), TTT_ACC_FILE: path.join(DIR, 'accounts.json'), TTT_WORLD_FILE: path.join(DIR, 'world.json'), TTT_SESS_FILE: path.join(DIR, 'sessions.json'), TTT_DAY_REAL_MS: '600000', TTT_TUVI_NEED: '5' };
  if (startMin != null) env.TTT_WORLD_START_MINUTES = String(startMin);
  serverProc = spawn('node', ['server/index.js'], { cwd: ROOT, env, stdio: ['ignore', 'pipe', 'pipe'] });
  serverProc.stderr.on('data', (d) => { try { fs.appendFileSync(path.join(DIR, 'srv_' + tag + '.log'), d); } catch (e) {} });
  serverProc.stdout.on('data', (d) => { try { fs.appendFileSync(path.join(DIR, 'srv_' + tag + '.log'), d); } catch (e) {} });
  killTimer = setTimeout(() => { try { serverProc.kill('SIGKILL'); } catch (e) {} }, 240000);
  const t0 = Date.now();
  while (Date.now() - t0 < 45000) { try { const r = await fetch(`http://127.0.0.1:${port}/api/status`); if (r.ok) { clearTimeout(killTimer); return; } } catch (e) {} await sleep(500); }
  throw new Error('server khong len');
}
async function stopServer() { if (!serverProc) return; const p = serverProc; serverProc = null; await new Promise((res) => { const t = setTimeout(() => { try { p.kill('SIGKILL'); } catch (e) {} res(); }, 4000); p.once('exit', () => { clearTimeout(t); res(); }); try { p.kill('SIGTERM'); } catch (e) { clearTimeout(t); res(); } }); const t0 = Date.now(); while (Date.now() - t0 < 10000 && !(await portFree(CUR_PORT))) await sleep(300); }
const STATS = { khiHuyet: 500, vatCong: 100, vatPhong: 100, phapCong: 100, phapPhong: 100, tocDo: 60, minhMan: 100 };
const LC1 = { elements: ['kim'], main: 'kim', count: 1, mutations: [] };
const AN = (vm, lh, nd) => ({ lkDays: 0, kdDays: 0, lkLastDay: -1, kdLastDay: -1, vienman: !!vm, luyenHon: !!lh, nhapDao: !!nd });
function BASE(token, name, extra) {
  return Object.assign({ token, name, classId: 'kiemtu', gender: 'nam', race: null, geo175: 1, realm: 'kd', tier: 1, x: 4248, y: 2950, mapId: 'huyet_sac_rung', hp: 99999, lifespan: 500, birthDay: -5660, ageStart: 16, stats: { ...STATS }, statPoints: 0, freePoints: 0, tuVi: 0, stones: 0, stonesTrung: 0, stonesThuong: 0, stonesCuc: 0, inventory: {}, gearBag: {}, equipped: [], skills: [], job: null, job2: null, job3: null, linhCan: { ...LC1 }, affinity: {}, affV2: 1, bonds: {}, quests: {}, questsDone: {}, flags: {}, counters: {}, disciples: [], foundInvites: [], reformIn: [], sectTech: [], sectArts: [], sectArtsActive: [], mails: [], classRes: {}, food: 100, water: 100, anState: AN(0, 0, 0) }, extra || {});
}
function connect(token) {
  const socket = io(`http://127.0.0.1:${CUR_PORT}`, { transports: ['websocket'] });
  const ctx = { socket, merger: createMerger(), state: null, welcome: null, notices: [], casts: [], sync: null, errors: [], downed: false };
  socket.on('connect', () => socket.emit('hello', { token }));
  socket.on('welcome', (w) => { ctx.welcome = w; ctx.myName = (w.character || {}).name; });
  socket.on('notice', (n) => ctx.notices.push(n.text || ''));
  socket.on('cast_result', (r) => ctx.casts.push(r));
  socket.on('char_sync', (sy) => { ctx.sync = sy; });
  socket.on('server_tick', (t) => { const st = ctx.merger(t); if (st) ctx.state = st; });
  socket.on('interact_error', (e) => ctx.errors.push(e.message || ''));
  socket.on('player_downed', () => { ctx.downed = true; });
  return ctx;
}
const meOf = (c) => (c.state?.players || []).find((p) => p.name === c.myName) || null;
const monsOf = (c) => c.state?.monsters || [];
const myChar = (c) => (c.sync && typeof c.sync.hp === 'number' ? c.sync : null) || (c.welcome && c.welcome.character) || {};
async function flyTo(c, x, y, tol) {
  if (!c.flying) { c.socket.emit('fly_toggle', {}); c.flying = true; await sleep(350); }
  const t0 = Date.now();
  while (Date.now() - t0 < 30000) { const me = meOf(c); if (!me) { await sleep(120); continue; } const dx = x - me.x, dy = y - me.y; const d = Math.hypot(dx, dy); if (d <= (tol || 45)) break; c.socket.emit('client_input', { vx: dx / d, vy: dy / d }); await sleep(110); }
  c.socket.emit('client_input', { vx: 0, vy: 0 });
}
(async () => {
  const chars = {};
  chars['tk343dy8'] = BASE('tk343dy8', 'DbgY8', { classId: 'ytu', anState: AN(1, 1, 0), hp: 250, skills: ['kd_y-tu'] });
  fs.writeFileSync(path.join(DIR, 'characters.json'), JSON.stringify(chars, null, 1));
  fs.writeFileSync(path.join(DIR, 'accounts.json'), '{}');
  for (const f of ['world.json', 'sessions.json']) { try { fs.unlinkSync(path.join(DIR, f)); } catch (e) {} }
  await startServer(3642, '343dbg2', 600);
  const y = connect('tk343dy8');
  await waitFor(() => y.welcome, 12000);
  y.socket.emit('fly_toggle', {}); y.flying = true;
  await sleep(2000);
  console.log('eq:', JSON.stringify((myChar(y).skills || []).map((s) => s.id)), 'hp:', myChar(y).hp, 'downed:', y.downed);
  const slot = (myChar(y).skills || []).findIndex((s) => s.id === 'kd_y-tu');
  console.log('slot kd_y-tu =', slot);
  const me = meOf(y); const w = monsOf(y).filter((m) => m.kind === 'huyetlang' && m.hp >= m.maxHp - 1).sort((a, b) => Math.hypot(a.x - me.x, a.y - me.y) - Math.hypot(b.x - me.x, b.y - me.y))[0];
  console.log('mon:', w && w.id, w && Math.round(Math.hypot(w.x - me.x, w.y - me.y)));
  if (w) await flyTo(y, w.x, w.y, 100);
  console.log('truoc cast hp:', myChar(y).hp, 'mp:', myChar(y).mp, 'downed:', y.downed, 'errs:', JSON.stringify(y.errors));
  const idx = y.casts.length;
  y.socket.emit('cast_skill', { slot });
  const res = await waitFor(() => y.casts.length > idx && y.casts[y.casts.length - 1], 4000);
  console.log('cast_result:', JSON.stringify(res));
  await sleep(1500);
  console.log('sau cast hp:', myChar(y).hp, 'maxHp:', myChar(y).maxHp, 'errs:', JSON.stringify(y.errors.slice(-3)), 'notices:', JSON.stringify(y.notices.slice(-3)));
  y.socket.disconnect();
  await stopServer();
  process.exit(0);
})().catch(async (e) => { console.error('PROBE ERROR', e); try { await stopServer(); } catch (x) {} process.exit(2); });
