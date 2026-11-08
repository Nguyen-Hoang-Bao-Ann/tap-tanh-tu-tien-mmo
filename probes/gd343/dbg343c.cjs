// Debug chân Ảnh + Kiếm GĐ343
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
  const ctx = { socket, merger: createMerger(), state: null, welcome: null, notices: [], casts: [], sync: null, errors: [], attacked: [], downed: false };
  socket.on('connect', () => socket.emit('hello', { token }));
  socket.on('welcome', (w) => { ctx.welcome = w; ctx.myName = (w.character || {}).name; ctx.myId = w.id; });
  socket.on('notice', (n) => ctx.notices.push(n.text || ''));
  socket.on('cast_result', (r) => ctx.casts.push(r));
  socket.on('char_sync', (sy) => { ctx.sync = sy; });
  socket.on('server_tick', (t) => { const st = ctx.merger(t); if (st) ctx.state = st; });
  socket.on('player_attacked', (e) => { if (e.id === ctx.myId) ctx.attacked.push(e); });
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
async function land(c) { if (c.flying) { c.socket.emit('fly_toggle', {}); c.flying = false; await sleep(450); } }
(async () => {
  const chars = {};
  chars['tk343da4'] = BASE('tk343da4', 'DbgAnh', { classId: 'satthu', anState: AN(1, 1, 0) });
  chars['tk343dk6'] = BASE('tk343dk6', 'DbgKiem', { classId: 'kiemtu', anState: AN(1, 1, 0), stats: { ...STATS, vatCong: 500 }, skills: ['kiemtu_1'] });
  fs.writeFileSync(path.join(DIR, 'characters.json'), JSON.stringify(chars, null, 1));
  fs.writeFileSync(path.join(DIR, 'accounts.json'), '{}');
  for (const f of ['world.json', 'sessions.json']) { try { fs.unlinkSync(path.join(DIR, f)); } catch (e) {} }
  await startServer(3643, '343dbg3', 600);
  const a = connect('tk343da4'); const k = connect('tk343dk6');
  await waitFor(() => a.welcome && k.welcome, 12000);
  await sleep(1500);
  // --- KIẾM: cast kiemtu_1 x6, in mọi kết quả
  {
    const slot = (myChar(k).skills || []).findIndex((s) => s.id === 'kiemtu_1');
    console.log('KIEM eq:', JSON.stringify((myChar(k).skills || []).map((s) => s.id)), 'slot kiemtu_1 =', slot);
    for (let i = 0; i < 6; i++) {
      const me = meOf(k); const w = monsOf(k).filter((m) => m.kind === 'huyetlang').sort((x, y) => Math.hypot(x.x - me.x, x.y - me.y) - Math.hypot(y.x - me.x, y.y - me.y))[0];
      if (w) await flyTo(k, w.x, w.y, 90);
      const idx = k.casts.length;
      k.socket.emit('cast_skill', { slot });
      const res = await waitFor(() => k.casts.length > idx && k.casts[k.casts.length - 1], 3500);
      console.log('KIEM cast', i, JSON.stringify(res), 'monDist:', w ? Math.round(Math.hypot(w.x - (meOf(k) || {}).x, w.y - (meOf(k) || {}).y)) : '?');
      await sleep(400);
    }
  }
  // --- ẢNH: cast lh_sat-thu rồi đánh thường, theo dõi attacked + drop
  {
    const slot = (myChar(a).skills || []).findIndex((s) => s.id === 'lh_sat-thu');
    console.log('ANH eq:', JSON.stringify((myChar(a).skills || []).map((s) => s.id)), 'slot lh =', slot, 'hp:', myChar(a).hp);
    const me = meOf(a); const w = monsOf(a).filter((m) => m.kind === 'huyetlang').sort((x, y) => Math.hypot(x.x - me.x, x.y - me.y) - Math.hypot(y.x - me.x, y.y - me.y))[0];
    if (w) await flyTo(a, w.x, w.y, 90);
    const idx = a.casts.length;
    a.socket.emit('cast_skill', { slot });
    const res = await waitFor(() => a.casts.length > idx && a.casts[a.casts.length - 1], 3500);
    console.log('ANH cast lh:', JSON.stringify(res));
    // bay tới sói nguyên vẹn khác, hạ cánh, đánh
    const me2 = meOf(a); const w2 = monsOf(a).filter((m) => m.kind === 'huyetlang' && m.hp >= m.maxHp - 1).sort((x, y) => Math.hypot(x.x - me2.x, x.y - me2.y) - Math.hypot(y.x - me2.x, y.y - me2.y))[0];
    console.log('ANH soi dich:', w2 && w2.id, w2 && Math.round(Math.hypot(w2.x - me2.x, w2.y - me2.y)));
    if (w2) { await flyTo(a, w2.x, w2.y, 30); await land(a); }
    for (let t = 0; t < 3; t++) {
      const snap = new Map(monsOf(a).map((m) => [m.id, m.hp]));
      const atkN = a.attacked.length;
      a.socket.emit('player_attack');
      await sleep(700);
      const drops = [];
      for (const m of monsOf(a)) { const b = snap.get(m.id); if (b != null && m.hp < b) drops.push([m.id, b - m.hp]); }
      const gone = [...snap.keys()].filter((id) => !monsOf(a).find((m) => m.id === id));
      console.log('ANH attack', t, 'attackedEvents:', a.attacked.length - atkN, 'drops:', JSON.stringify(drops), 'gone:', JSON.stringify(gone), 'hpMe:', myChar(a).hp, 'downed:', a.downed, 'errs:', JSON.stringify(a.errors.slice(-2)));
    }
  }
  a.socket.disconnect(); k.socket.disconnect();
  await stopServer();
  process.exit(0);
})().catch(async (e) => { console.error('PROBE ERROR', e); try { await stopServer(); } catch (x) {} process.exit(2); });
