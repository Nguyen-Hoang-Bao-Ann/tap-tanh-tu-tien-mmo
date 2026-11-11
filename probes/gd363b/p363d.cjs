// Probe phụ GĐ363d — chân Duyên Nợ tập trung: cho bản trùm Kiếm Ma (Thạch Lâm) ăn Thanh Thảo -> +25.
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
const STRONG = { khiHuyet: 20000, vatCong: 6000, vatPhong: 2000, phapCong: 400, phapPhong: 2000, tocDo: 80, minhMan: 100 };
const LC1 = { elements: ['kim'], main: 'kim', count: 1, mutations: [] };
function BASE(token, name, extra) {
  return Object.assign({ token, name, classId: 'kiemtu', gender: 'nam', race: null, geo175: 1, realm: 'ht', tier: 9, x: 1565, y: 1011, mapId: 'lang_tan_thu', hp: 999999, mp: 99999, lifespan: 500, birthDay: -5660, ageStart: 16, stats: { ...STRONG }, statPoints: 0, freePoints: 0, tuVi: 99999, stones: 100000, stonesTrung: 0, stonesThuong: 0, stonesCuc: 0, inventory: {}, gearBag: {}, equipped: [], skills: [], job: null, job2: null, job3: null, linhCan: { ...LC1 }, affinity: {}, affV2: 1, bonds: {}, quests: {}, questsDone: {}, flags: {}, counters: {}, disciples: [], foundInvites: [], reformIn: [], sectTech: [], sectArts: [], sectArtsActive: [], mails: [], classRes: {}, food: 100, water: 100 }, extra || {});
}
(async () => {
  const PORT = 3751;
  const chars = { 'tk363feed1': BASE('tk363feed1', 'P363ChoAn', { inventory: { thanh_thao: 5 } }) };
  fs.writeFileSync(path.join(DIR, 'characters.json'), JSON.stringify(chars));
  fs.writeFileSync(path.join(DIR, 'accounts.json'), '{}');
  fs.writeFileSync(path.join(DIR, 'world.json'), JSON.stringify({ totalMinutes: 3360, savedAt: Date.now() }));
  fs.writeFileSync(path.join(DIR, 'sessions.json'), '{}');
  if (!(await portFree(PORT))) { console.log('port ban'); process.exit(2); }
  const proc = spawn('node', ['server/index.js'], { cwd: ROOT, env: { ...process.env, PORT: String(PORT), TTT_STORAGE: 'file', TTT_CHAR_FILE: path.join(DIR, 'characters.json'), TTT_ACC_FILE: path.join(DIR, 'accounts.json'), TTT_WORLD_FILE: path.join(DIR, 'world.json'), TTT_SESS_FILE: path.join(DIR, 'sessions.json'), TTT_DAY_REAL_MS: '600000', TTT_TUVI_NEED: '5' }, stdio: ['ignore', 'pipe', 'pipe'] });
  proc.stderr.on('data', (d) => { try { fs.appendFileSync(path.join(DIR, 'srv3.log'), d); } catch (e) {} });
  proc.stdout.on('data', (d) => { try { fs.appendFileSync(path.join(DIR, 'srv3.log'), d); } catch (e) {} });
  const t0 = Date.now();
  let up = false;
  while (Date.now() - t0 < 45000) { try { const r = await fetch(`http://127.0.0.1:${PORT}/api/status`); if (r.ok) { up = true; break; } } catch (e) {} await sleep(500); }
  if (!up) { console.log('server khong len'); proc.kill('SIGKILL'); process.exit(2); }
  const socket = io(`http://127.0.0.1:${PORT}`, { transports: ['websocket'] });
  const ctx = { merger: createMerger(), state: null, welcome: null, notices: [], errs: [], syncs: [] };
  socket.on('connect', () => socket.emit('hello', { token: 'tk363feed1' }));
  socket.on('welcome', (w) => { ctx.welcome = w; });
  socket.on('char_sync', (s) => ctx.syncs.push(s));
  socket.on('notice', (n) => ctx.notices.push(n.text || ''));
  socket.on('interact_error', (e) => ctx.errs.push(e.message || ''));
  socket.on('server_tick', (t) => { const st = ctx.merger(t); if (st) ctx.state = st; });
  await waitFor(() => ctx.welcome, 20000);
  console.log('welcome inventory =', JSON.stringify(ctx.welcome && ctx.welcome.character && ctx.welcome.character.inventory));
  const myName = ctx.welcome.character.name;
  const meOf = () => ((ctx.state && ctx.state.players) || []).find((p) => p.name === myName) || null;
  const mons = () => (ctx.state && ctx.state.monsters) || [];
  await waitFor(() => meOf(), 8000);
  const boss0 = await waitFor(() => mons().find((m) => m.kind === 'kiemma' && m.sp === 1 && !m.rare) || null, 30000);
  console.log('boss kiemma:', boss0 ? boss0.id + ' @' + boss0.x + ',' + boss0.y : 'KHONG THAY');
  // bay tới sát trùm
  socket.emit('fly_toggle', {});
  await sleep(400);
  const tF = Date.now();
  while (Date.now() - tF < 60000) {
    const me = meOf(); const b = mons().find((m) => m.kind === 'kiemma' && m.sp === 1 && !m.rare);
    if (!me || !b) { await sleep(200); continue; }
    const d = Math.hypot(b.x - me.x, b.y - me.y);
    if (d <= 150) break;
    socket.emit('client_input', { vx: (b.x - me.x) / d, vy: (b.y - me.y) / d });
    await sleep(120);
  }
  socket.emit('client_input', { vx: 0, vy: 0 });
  socket.emit('fly_toggle', {});
  await sleep(400);
  const boss = mons().find((m) => m.kind === 'kiemma' && m.sp === 1 && !m.rare);
  const me = meOf();
  console.log('khoang cach toi trum:', me && boss ? Math.round(Math.hypot(boss.x - me.x, boss.y - me.y)) : '?');
  const lastSync = ctx.syncs[ctx.syncs.length - 1];
  console.log('inventory truoc feed (sync) =', JSON.stringify(lastSync && lastSync.inventory));
  if (boss) socket.emit('bond_feed', { monsterId: boss.id });
  const fedNotice = await waitFor(() => ctx.notices.find((x) => x.includes('+25')) || null, 6000);
  console.log(fedNotice ? 'PASS | cho trum Kiem Ma an -> ' + fedNotice : 'FAIL | notices=' + JSON.stringify(ctx.notices.slice(-3)) + ' errs=' + JSON.stringify(ctx.errs.slice(-3)));
  const afterSync = ctx.syncs[ctx.syncs.length - 1];
  console.log('inventory sau feed (sync) =', JSON.stringify(afterSync && afterSync.inventory));
  socket.disconnect();
  proc.kill('SIGTERM');
  await sleep(1500);
  try { proc.kill('SIGKILL'); } catch (e) {}
  process.exit(fedNotice ? 0 : 1);
})();
