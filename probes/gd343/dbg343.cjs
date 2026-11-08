// Debug GĐ343: trạng thái sync của quytu/ytu/phattu sau cast tuyệt kỹ Hồn.
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
  const ctx = { socket, merger: createMerger(), state: null, welcome: null, notices: [], casts: [], sync: null, errors: [], syncCount: 0 };
  socket.on('connect', () => socket.emit('hello', { token }));
  socket.on('welcome', (w) => { ctx.welcome = w; ctx.myName = (w.character || {}).name; });
  socket.on('notice', (n) => ctx.notices.push(n.text || ''));
  socket.on('cast_result', (r) => ctx.casts.push(r));
  socket.on('char_sync', (sy) => { ctx.sync = sy; ctx.syncCount++; });
  socket.on('server_tick', (t) => { const st = ctx.merger(t); if (st) ctx.state = st; });
  socket.on('interact_error', (e) => ctx.errors.push(e.message || ''));
  return ctx;
}
const meOf = (c) => (c.state?.players || []).find((p) => p.name === c.myName) || null;
const monsOf = (c) => c.state?.monsters || [];
const myChar = (c) => (c.sync && c.sync.character) || (c.welcome && c.welcome.character) || {};
async function flyTo(c, x, y, tol) {
  if (!c.flying) { c.socket.emit('fly_toggle', {}); c.flying = true; await sleep(350); }
  const t0 = Date.now();
  while (Date.now() - t0 < 30000) { const me = meOf(c); if (!me) { await sleep(120); continue; } const dx = x - me.x, dy = y - me.y; const d = Math.hypot(dx, dy); if (d <= (tol || 45)) break; c.socket.emit('client_input', { vx: dx / d, vy: dy / d }); await sleep(110); }
  c.socket.emit('client_input', { vx: 0, vy: 0 });
}
function dump(tag, c) { const ch = myChar(c); console.log(tag, JSON.stringify({ hp: ch.hp, maxHp: ch.maxHp, mp: ch.mp, honKhi: (ch.classRes || {}).honKhi, syncN: c.syncCount, eq: (ch.skills || []).map((s) => s.id), errs: c.errors.slice(-2), notices: c.notices.slice(-2) })); }

(async () => {
  const chars = {};
  chars['tk343dq1'] = BASE('tk343dq1', 'DbgQuy', { classId: 'quytu', anState: AN(1, 1, 0), hp: 2000 });
  chars['tk343dy1'] = BASE('tk343dy1', 'DbgY', { classId: 'ytu', anState: AN(1, 1, 0), hp: 250 });
  chars['tk343dp1'] = BASE('tk343dp1', 'DbgPhat', { classId: 'phattu', anState: AN(1, 1, 0) });
  fs.writeFileSync(path.join(DIR, 'characters.json'), JSON.stringify(chars, null, 1));
  fs.writeFileSync(path.join(DIR, 'accounts.json'), '{}');
  for (const f of ['world.json', 'sessions.json']) { try { fs.unlinkSync(path.join(DIR, f)); } catch (e) {} }
  await startServer(3641, '343dbg', 600);
  const q = connect('tk343dq1'); const y = connect('tk343dy1'); const p = connect('tk343dp1');
  await waitFor(() => q.welcome && y.welcome && p.welcome, 12000);
  await sleep(2500);
  dump('Q login+2.5s', q); dump('Y login+2.5s', y); dump('P login+2.5s', p);
  // Quỷ cast
  {
    const slot = (myChar(q).skills || []).findIndex((s) => s.id === 'lh_quy-tu');
    const me = meOf(q); const w = monsOf(q).filter((m) => m.kind === 'huyetlang').sort((a, b) => Math.hypot(a.x - me.x, a.y - me.y) - Math.hypot(b.x - me.x, b.y - me.y))[0];
    console.log('Q slot lh =', slot, 'mon gan nhat:', w && w.kind, w && Math.round(Math.hypot(w.x - me.x, w.y - me.y)));
    if (w) await flyTo(q, w.x, w.y, 100);
    dump('Q truoc cast', q);
    const idx = q.casts.length;
    q.socket.emit('cast_skill', { slot });
    const res = await waitFor(() => q.casts.length > idx && q.casts[q.casts.length - 1], 4000);
    console.log('Q cast_result:', JSON.stringify(res));
    await sleep(1200);
    dump('Q sau cast 1.2s', q);
  }
  // Y cast kd_y-tu
  {
    const slot = (myChar(y).skills || []).findIndex((s) => s.id === 'kd_y-tu');
    const me = meOf(y); const w = monsOf(y).filter((m) => m.kind === 'huyetlang').sort((a, b) => Math.hypot(a.x - me.x, a.y - me.y) - Math.hypot(b.x - me.x, b.y - me.y))[0];
    console.log('Y slot kd_y-tu =', slot, 'mon:', w && w.kind);
    if (w) await flyTo(y, w.x, w.y, 100);
    dump('Y truoc cast', y);
    const idx = y.casts.length;
    y.socket.emit('cast_skill', { slot });
    const res = await waitFor(() => y.casts.length > idx && y.casts[y.casts.length - 1], 4000);
    console.log('Y cast_result:', JSON.stringify(res));
    await sleep(1200);
    dump('Y sau cast 1.2s', y);
  }
  // Phật cast vm_phat-tu
  {
    const slot = (myChar(p).skills || []).findIndex((s) => s.id === 'vm_phat-tu');
    const me = meOf(p); const w = monsOf(p).filter((m) => m.kind === 'huyetlang').sort((a, b) => Math.hypot(a.x - me.x, a.y - me.y) - Math.hypot(b.x - me.x, b.y - me.y))[0];
    console.log('P slot vm_phat-tu =', slot, 'mon:', w && w.kind);
    if (w) await flyTo(p, w.x, w.y, 100);
    dump('P truoc cast', p);
    const idx = p.casts.length;
    p.socket.emit('cast_skill', { slot });
    const res = await waitFor(() => p.casts.length > idx && p.casts[p.casts.length - 1], 4000);
    console.log('P cast_result:', JSON.stringify(res));
    await sleep(800);
    dump('P sau cast', p);
  }
  for (const c of [q, y, p]) { try { c.socket.disconnect(); } catch (e) {} }
  await stopServer();
  process.exit(0);
})().catch(async (e) => { console.error('PROBE ERROR', e); try { await stopServer(); } catch (x) {} process.exit(2); });
