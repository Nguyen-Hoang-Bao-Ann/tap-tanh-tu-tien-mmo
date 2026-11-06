// Debug chân D GĐ321: W yếu bay tới trùm Vạn Thú, log hp/khoảng cách, đọc file char sau khi gục.
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const net = require('net');
const ROOT = path.join(__dirname, '..', '..');
const PORT = 3552;
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
  fs.writeFileSync(path.join(DIR, 'characters.json'), JSON.stringify({ p321w00001: BASE('p321w00001', 'Yeu Sinh W', { realm: 'kd', mapId: 'van_thu_son_mach', x: 6600, y: 1400, stats: { khiHuyet: 20, vatCong: 50, vatPhong: 0, phapCong: 10, phapPhong: 0, tocDo: 60, minhMan: 30 } }) }));
  fs.writeFileSync(path.join(DIR, 'world.json'), JSON.stringify({ totalMinutes: 100 * 1440, savedAt: Date.now(), sects: [] }));
  await startServer();
  const socket = io(`http://127.0.0.1:${PORT}`, { transports: ['websocket'] });
  const ctx = { syncs: [], notices: [], merger: createMerger(), state: null, welcome: null };
  socket.on('connect', () => socket.emit('hello', { token: 'p321w00001' }));
  socket.on('welcome', (w) => { ctx.welcome = w; });
  socket.on('char_sync', (c) => ctx.syncs.push(c));
  socket.on('notice', (n) => ctx.notices.push(n.text || ''));
  socket.on('server_tick', (t) => { const st = ctx.merger(t); if (st) ctx.state = st; });
  await waitFor(() => ctx.welcome, 15000);
  const meOf = () => (ctx.state?.players || []).find((p) => p.id === ctx.welcome.id);
  const mons = () => ctx.state?.monsters || [];
  const boss = await waitFor(() => { const sp = mons().filter((m) => m.sp === 1); const bs = sp.filter((m) => m.boss === 1); const pool = bs.length ? bs : sp; return pool.length ? pool.reduce((a, b) => ((b.maxHp || 0) > (a.maxHp || 0) ? b : a)) : null; }, 15000);
  console.log('BOSS:', JSON.stringify(boss));
  const me0 = meOf(); console.log('W SPAWN POS:', me0 ? Math.round(me0.x) + ',' + Math.round(me0.y) + ' hp=' + me0.hp : 'null');
  // (debug D2: dung yen tai cho, khong bay)
  if (false) socket.emit('fly_toggle', {});
  await sleep(400);
  for (let i = 0; i < 40; i++) {
    const m = mons().find((x) => x.id === boss.id); const me = meOf();
    if (!m || !me) { await sleep(200); continue; }
    const d = Math.hypot(m.x - me.x, m.y - me.y);
    if (i % 8 === 0) console.log('fly d=' + Math.round(d) + ' meHp=' + me.hp + ' bossHp=' + m.hp + '/' + m.maxHp + ' bossPos=' + Math.round(m.x) + ',' + Math.round(m.y));
    if (d <= 55) break;
    socket.emit('client_input', { vx: (m.x - me.x) / d, vy: (m.y - me.y) / d });
    await sleep(120);
  }
  socket.emit('client_input', { vx: 0, vy: 0 });
  socket.emit('fly_toggle', {});
  await sleep(500);
  for (let i = 0; i < 30; i++) {
    const m = mons().find((x) => x.id === boss.id); const me = meOf();
    console.log('t+' + i + 's meHp=' + (me ? me.hp : '?') + ' mePos=' + (me ? Math.round(me.x) + ',' + Math.round(me.y) : '?') + ' bossD=' + (m && me ? Math.round(Math.hypot(m.x - me.x, m.y - me.y)) : '?') + ' bossHp=' + (m ? m.hp : '?'));
    if (me && me.hp <= 0) break;
    await sleep(1000);
  }
  await sleep(1500);
  const file = JSON.parse(fs.readFileSync(path.join(DIR, 'characters.json'), 'utf8'));
  console.log('FILE BONDS:', JSON.stringify(file.p321w00001?.bonds || {}));
  console.log('NOTICES:', ctx.notices.slice(-4).join(' | '));
  socket.disconnect();
  await stopServer();
  process.exit(0);
})();
