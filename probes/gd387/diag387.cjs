// Chẩn đoán GĐ387: client thật nhận được gì trên map cõi cao (map_enter + tick monsters).
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const net = require('net');
const ROOT = path.join(__dirname, '..', '..');
const DIR = __dirname;
const { io } = require(path.join(ROOT, 'client/node_modules/socket.io-client'));
const { createMerger } = require(path.join(ROOT, 'client/worldmerge.cjs'));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
function portFree(port) { return new Promise((res) => { const s = net.createServer(); s.once('error', () => res(false)); s.listen(port, () => s.close(() => res(true))); }); }
const LC1 = { elements: ['kim'], main: 'kim', count: 1, mutations: [] };
(async () => {
  const PORT = 4003;
  if (!(await portFree(PORT))) { console.log('port ban'); process.exit(1); }
  const ch = { token: 'diag387x', name: 'Diag387', classId: 'phaptu', gender: 'nam', race: null, geo175: 1, realm: 'tn', tier: 9, x: 1000, y: 1000, mapId: 'phan_hu_nguyen', hp: 9999999, mp: 999999, lifespan: 900, birthDay: -5660, ageStart: 16, stats: { khiHuyet: 200000, vatCong: 5000000, vatPhong: 3000, phapCong: 5000000, phapPhong: 3000, tocDo: 80, minhMan: 100 }, statPoints: 0, freePoints: 0, tuVi: 99999, stones: 100000, stonesTrung: 0, stonesThuong: 0, stonesCuc: 0, inventory: {}, gearBag: {}, equipped: [], skills: [], job: null, job2: null, job3: null, linhCan: { ...LC1 }, affinity: {}, affV2: 1, bonds: {}, quests: {}, questsDone: {}, flags: {}, counters: {}, disciples: [], foundInvites: [], reformIn: [], sectTech: [], sectArts: [], sectArtsActive: [], mails: [], classRes: {}, food: 100, water: 100 };
  fs.writeFileSync(path.join(DIR, 'characters.json'), JSON.stringify({ diag387x: ch }));
  fs.writeFileSync(path.join(DIR, 'accounts.json'), JSON.stringify({}));
  for (const f of ['world.json', 'sessions.json']) { try { fs.unlinkSync(path.join(DIR, f)); } catch (e) {} }
  const proc = spawn('node', ['server/index.js'], { cwd: ROOT, env: { ...process.env, PORT: String(PORT), TTT_STORAGE: 'file', TTT_CHAR_FILE: path.join(DIR, 'characters.json'), TTT_ACC_FILE: path.join(DIR, 'accounts.json'), TTT_WORLD_FILE: path.join(DIR, 'world.json'), TTT_SESS_FILE: path.join(DIR, 'sessions.json'), TTT_DAY_REAL_MS: '600000', TTT_TUVI_NEED: '5' }, stdio: ['ignore', 'pipe', 'pipe'] });
  proc.stderr.on('data', (d) => process.stdout.write('[srv-err] ' + d));
  const t0 = Date.now();
  let up = false;
  while (Date.now() - t0 < 90000) { try { const r = await fetch(`http://127.0.0.1:${PORT}/api/status`); if (r.ok) { up = true; break; } } catch (e) {} await sleep(400); }
  console.log('server up:', up);
  const merger = createMerger();
  let state = null, mapEnter = null, tickCount = 0, fullTicks = 0;
  const socket = io(`http://127.0.0.1:${PORT}`, { transports: ['websocket'] });
  socket.on('connect', () => socket.emit('hello', { token: 'diag387x' }));
  socket.on('map_enter', (m) => { mapEnter = m; });
  socket.on('welcome', (w) => console.log('welcome char mapId?', JSON.stringify(w.character).slice(0, 200)));
  socket.on('server_tick', (t) => { tickCount++; if (t.full) fullTicks++; const st = merger(t); if (st) state = st; });
  await sleep(9000);
  console.log('ticks:', tickCount, 'full:', fullTicks);
  console.log('map_enter id:', mapEnter && (mapEnter.id || mapEnter.mapId || JSON.stringify(mapEnter).slice(0, 120)));
  console.log('players:', state ? state.players.length : 'no state', '| monsters:', state ? state.monsters.length : '-');
  if (state && state.monsters.length) {
    console.log('sample monster:', JSON.stringify(state.monsters[0]));
    console.log('boss-flagged:', state.monsters.filter((m) => m.boss === 1).length, '| sp:', state.monsters.filter((m) => m.sp === 1).length);
    const hist = {};
    for (const m of state.monsters) hist[m.kind] = (hist[m.kind] || 0) + 1;
    console.log('kinds:', JSON.stringify(hist));
    for (const m of state.monsters) if (m.sp === 1 || m.boss === 1 || m.hidden === 1) console.log('special:', JSON.stringify(m));
    const me = state.players.find((p) => p.name === 'Diag387');
    console.log('me:', me ? JSON.stringify({ x: me.x, y: me.y }) : 'NOT FOUND');
    const m0 = state.monsters[0];
    console.log('dist to first monster:', me ? Math.round(Math.hypot(m0.x - me.x, m0.y - me.y)) : '-');
  }
  socket.disconnect();
  proc.kill('SIGTERM');
  await sleep(1500);
  try { proc.kill('SIGKILL'); } catch (e) {}
  process.exit(0);
})();
