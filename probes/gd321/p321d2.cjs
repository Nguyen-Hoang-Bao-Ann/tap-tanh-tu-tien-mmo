// Debug D3: dùng đúng approach() của p321, log liên tục hp + khoảng cách + file bonds.
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const net = require('net');
const ROOT = path.join(__dirname, '..', '..');
const PORT = 3553;
const DIR = __dirname;
const { io } = require(path.join(ROOT, 'client/node_modules/socket.io-client'));
const { createMerger } = require(path.join(ROOT, 'client/worldmerge.cjs'));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function waitFor(fn, ms) { const t0 = Date.now(); while (Date.now() - t0 < ms) { const v = fn(); if (v) return v; await sleep(200); } return null; }
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
async function stopServer() { if (!serverProc) return; const p = serverProc; serverProc = null; await new Promise((res) => { const t = setTimeout(() => { try { p.kill('SIGKILL'); } catch (e) {} res(); }, 4000); p.once('exit', () => { clearTimeout(t); res(); }); try { p.kill('SIGTERM'); } catch (e) { clearTimeout(t); res(); } }); }
function BASE(token, name, extra) {
  return Object.assign({ token, name, classId: 'kiemtu', gender: 'nam', race: null, geo175: 1, realm: 'na', tier: 1, x: 1565, y: 1252, mapId: 'lang_tan_thu', hp: 99999, stats: { khiHuyet: 300, vatCong: 500, vatPhong: 200, phapCong: 100, phapPhong: 200, tocDo: 60, minhMan: 60 }, statPoints: 0, freePoints: 0, tuVi: 0, stones: 100000, stonesTrung: 0, stonesThuong: 0, stonesCuc: 0, inventory: {}, gearBag: {}, equipped: [], skills: [], job: null, job2: null, job3: null, linhCan: { element: 'kim', grade: 'trung', mult: 1.2 }, affinity: {}, affV2: 1, bonds: {}, quests: {}, questsDone: {}, flags: {}, counters: {}, disciples: [], foundInvites: [], reformIn: [] }, extra || {});
}
(async () => {
  fs.writeFileSync(path.join(DIR, 'characters.json'), JSON.stringify({ p321w00001: BASE('p321w00001', 'Yeu Sinh W', { realm: 'kd', mapId: 'van_thu_son_mach', x: 500, y: 500, stats: { khiHuyet: 20, vatCong: 50, vatPhong: 0, phapCong: 10, phapPhong: 0, tocDo: 60, minhMan: 30 } }) }));
  fs.writeFileSync(path.join(DIR, 'world.json'), JSON.stringify({ totalMinutes: 100 * 1440, savedAt: Date.now(), sects: [] }));
  await startServer();
  const socket = io(`http://127.0.0.1:${PORT}`, { transports: ['websocket'] });
  const ctx = { syncs: [], merger: createMerger(), state: null, welcome: null };
  socket.on('connect', () => socket.emit('hello', { token: 'p321w00001' }));
  socket.on('welcome', (w) => { ctx.welcome = w; });
  socket.on('char_sync', (c) => ctx.syncs.push(c));
  socket.on('server_tick', (t) => { const st = ctx.merger(t); if (st) ctx.state = st; });
  await waitFor(() => ctx.welcome, 15000);
  const meOf = () => (ctx.state?.players || []).find((p) => p.id === ctx.welcome.id);
  const mons = () => ctx.state?.monsters || [];
  const bossOf = () => { const sp = mons().filter((m) => m.sp === 1); return sp.length ? sp.reduce((a, b) => ((b.maxHp || 0) > (a.maxHp || 0) ? b : a)) : null; };
  const boss = await waitFor(() => bossOf(), 15000);
  console.log('BOSS:', boss.kind, boss.id, 'at', Math.round(boss.x), Math.round(boss.y), 'hp', boss.maxHp);
  async function flyTo(tx, ty, tol) {
    socket.emit('fly_toggle', {}); await sleep(400);
    const t0 = Date.now();
    while (Date.now() - t0 < 30000) {
      const me = meOf(); if (!me) { await sleep(150); continue; }
      const dx = tx - me.x, dy = ty - me.y; const d = Math.hypot(dx, dy);
      if (d <= (tol || 60)) break;
      socket.emit('client_input', { vx: dx / d, vy: dy / d });
      await sleep(120);
    }
    socket.emit('client_input', { vx: 0, vy: 0 });
    socket.emit('fly_toggle', {}); await sleep(400);
  }
  const t0 = Date.now();
  let arrived = false;
  for (let i = 0; i < 5 && !arrived; i++) {
    const m = mons().find((x) => x.id === boss.id); const me = meOf();
    if (m && me && Math.hypot(m.x - me.x, m.y - me.y) <= 60) { arrived = true; break; }
    if (m) await flyTo(m.x, m.y, 60);
    const m2 = mons().find((x) => x.id === boss.id); const me2 = meOf();
    console.log('approach try', i, 'dist=', m2 && me2 ? Math.round(Math.hypot(m2.x - me2.x, m2.y - me2.y)) : '?', 'elapsed=', Math.round((Date.now() - t0) / 1000) + 's', 'meHp=', me2?.hp);
    if (m2 && me2 && Math.hypot(m2.x - me2.x, m2.y - me2.y) <= 220) arrived = true;
  }
  console.log('ARRIVED:', arrived);
  for (let i = 0; i < 30; i++) {
    const m = mons().find((x) => x.id === boss.id); const me = meOf();
    console.log('t+' + i + 's hp=' + (me ? me.hp : '?') + ' bossD=' + (m && me ? Math.round(Math.hypot(m.x - me.x, m.y - me.y)) : '?'));
    if (me && me.hp <= 0) { console.log('DOWNED at t+' + i); break; }
    await sleep(1000);
  }
  await sleep(2000);
  const file = JSON.parse(fs.readFileSync(path.join(DIR, 'characters.json'), 'utf8'));
  console.log('FILE BONDS:', JSON.stringify(file.p321w00001?.bonds || {}));
  socket.disconnect();
  await stopServer();
  process.exit(0);
})();
