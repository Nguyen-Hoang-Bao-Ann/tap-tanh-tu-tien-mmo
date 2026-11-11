// Chẩn đoán GĐ367d: vì sao flyTo ở map nhà không đưa nhân vật tới cổng làng?
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
let serverProc = null, killTimer = null;
async function startServer(port) {
  if (!(await portFree(port))) throw new Error('port ban ' + port);
  serverProc = spawn('node', ['server/index.js'], { cwd: ROOT, env: { ...process.env, PORT: String(port), TTT_STORAGE: 'file', TTT_CHAR_FILE: path.join(DIR, 'characters.json'), TTT_ACC_FILE: path.join(DIR, 'accounts.json'), TTT_WORLD_FILE: path.join(DIR, 'world.json'), TTT_SESS_FILE: path.join(DIR, 'sessions.json'), TTT_DAY_REAL_MS: '600000', TTT_TUVI_NEED: '5' }, stdio: ['ignore', 'pipe', 'pipe'] });
  serverProc.stdout.on('data', (d) => { try { fs.appendFileSync(path.join(DIR, 'srv_diag.log'), d); } catch (e) {} });
  serverProc.stderr.on('data', (d) => { try { fs.appendFileSync(path.join(DIR, 'srv_diag.log'), d); } catch (e) {} });
  killTimer = setTimeout(() => { try { serverProc.kill('SIGKILL'); } catch (e) {} }, 600000);
  const t0 = Date.now();
  while (Date.now() - t0 < 45000) { try { const r = await fetch(`http://127.0.0.1:${port}/api/status`); if (r.ok) { clearTimeout(killTimer); return; } } catch (e) {} await sleep(500); }
  throw new Error('server khong len');
}
async function stopServer() { if (!serverProc) return; const p = serverProc; serverProc = null; if (killTimer) clearTimeout(killTimer); await new Promise((res) => { const t = setTimeout(() => { try { p.kill('SIGKILL'); } catch (e) {} res(); }, 4000); p.once('exit', () => { clearTimeout(t); res(); }); try { p.kill('SIGTERM'); } catch (e) { clearTimeout(t); res(); } }); }
const STRONG = { khiHuyet: 20000, vatCong: 6000, vatPhong: 2000, phapCong: 400, phapPhong: 2000, tocDo: 80, minhMan: 100 };
const LC1 = { elements: ['kim'], main: 'kim', count: 1, mutations: [] };
function BASE(token, name, extra) {
  return Object.assign({ token, name, classId: 'kiemtu', gender: 'nam', race: null, geo175: 1, realm: 'tn', tier: 9, x: 1890, y: 1050, mapId: 'lang_tan_thu', hp: 999999, mp: 99999, lifespan: 500, birthDay: -5660, ageStart: 16, stats: { ...STRONG }, statPoints: 0, freePoints: 0, tuVi: 99999, stones: 99999, stonesTrung: 0, stonesThuong: 99999, stonesCuc: 0, inventory: {}, gearBag: {}, equipped: [], skills: [], job: null, job2: null, job3: null, linhCan: { ...LC1 }, affinity: {}, affV2: 1, bonds: {}, quests: {}, questsDone: {}, flags: {}, counters: {}, disciples: [], foundInvites: [], reformIn: [], sectTech: [], sectArts: [], sectArtsActive: [], mails: [], classRes: {}, food: 100, water: 100 }, extra || {});
}
(async () => {
  const chars = { diag367x: BASE('diag367x', 'Diag367X', {}) };
  fs.writeFileSync(path.join(DIR, 'characters.json'), JSON.stringify(chars));
  fs.writeFileSync(path.join(DIR, 'accounts.json'), '{}');
  fs.writeFileSync(path.join(DIR, 'world.json'), JSON.stringify({ totalMinutes: 3360, savedAt: Date.now() }));
  fs.writeFileSync(path.join(DIR, 'sessions.json'), '{}');
  fs.rmSync(path.join(DIR, 'srv_diag.log'), { force: true });
  await startServer(3752);
  await sleep(60000); // để diễn viên offline kịp dời chỗ + vào trạng thái nghỉ/thiền như phiên thật (phiên chính connect sau ~25 phút)
  const socket = io('http://127.0.0.1:3752', { transports: ['websocket'] });
  const merger = createMerger();
  let state = null, welcome = null; const errs = [], maps = [];
  socket.on('connect', () => socket.emit('hello', { token: 'diag367x' }));
  socket.on('welcome', (w) => { welcome = w; });
  socket.on('server_tick', (t) => { const st = merger(t); if (st) state = st; });
  socket.on('interact_error', (e) => errs.push(e.message || ''));
  socket.on('map_enter', (m) => maps.push(m));
  socket.on('travel_info', (t) => console.log('travel_info from=' + t.from + ' list=', JSON.stringify((t.list || []).map((d) => ({ id: d.id, canEnter: d.canEnter, cost: d.cost, grade: d.costGrade })))));
  await waitFor(() => welcome, 20000);
  console.log('welcome.character:', JSON.stringify({ mapId: welcome.character.mapId, x: Math.round(welcome.character.x), y: Math.round(welcome.character.y) }));
  await sleep(3000);
  const dump = (tag) => {
    const ps = (state && state.players) || [];
    const mine = ps.filter((p) => p.name === 'Diag367X');
    console.log(tag, 'tongPlayers=' + ps.length, 'trung ten=' + mine.length, mine.map((p) => JSON.stringify({ id: p.id, x: Math.round(p.x), y: Math.round(p.y), map: p.mapId || p.map, med: p.meditating, fly: p.flying, off: p.offline || p.isOffline })).join(' '));
    return mine[0] || null;
  };
  let me = dump('SAU CONNECT:');
  // Thử lái thẳng (không bay) về cổng 10s
  for (let i = 0; i < 40 && me; i++) {
    const dx = 1890 - me.x, dy = 1050 - me.y, d = Math.hypot(dx, dy);
    if (d <= 60) break;
    socket.emit('client_input', { vx: dx / d, vy: dy / d });
    await sleep(250); me = dump('  di bo ' + i + ':');
  }
  socket.emit('client_input', { vx: 0, vy: 0 });
  await sleep(500); me = dump('SAU DI BO:');
  // Thử bay về cổng
  socket.emit('fly_toggle', {});
  await sleep(500);
  for (let i = 0; i < 40 && me; i++) {
    const dx = 1890 - me.x, dy = 1050 - me.y, d = Math.hypot(dx, dy);
    if (d <= 60) break;
    socket.emit('client_input', { vx: dx / d, vy: dy / d });
    await sleep(250); me = dump('  bay ' + i + ':');
  }
  socket.emit('client_input', { vx: 0, vy: 0 });
  socket.emit('fly_toggle', {});
  await sleep(500); me = dump('SAU BAY:');
  if (me) console.log('khoang cach toi cong:', Math.round(Math.hypot(1890 - me.x, 1050 - me.y)));
  errs.length = 0;
  socket.emit('travel_to', { mapId: 'thanh_van_thanh', method: 'portal' });
  await sleep(2500);
  console.log('travel_to thanh: maps=', JSON.stringify(maps.map((m) => m.mapId)), 'errs=', JSON.stringify(errs));
  socket.disconnect();
  await stopServer();
  process.exit(0);
})().catch(async (e) => { console.log('CRASH', e && e.stack || e); try { await stopServer(); } catch (_) {} process.exit(1); });
