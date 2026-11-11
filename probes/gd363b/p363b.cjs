// Probe phụ GĐ363b: cô lập — inventory fixture {thanh_thao:5} có qua spawn không?
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const net = require('net');
const ROOT = path.join(__dirname, '..', '..');
const DIR = __dirname;
const { io } = require(path.join(ROOT, 'client/node_modules/socket.io-client'));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
function portFree(port) { return new Promise((res) => { const s = net.createServer(); s.once('error', () => res(false)); s.listen(port, () => s.close(() => res(true))); }); }
(async () => {
  const PORT = 3747;
  const chars = { 'tk363inv01': { token: 'tk363inv01', name: 'P363KTuiDo', classId: 'kiemtu', gender: 'nam', race: null, geo175: 1, realm: 'ht', tier: 9, x: 1565, y: 1011, mapId: 'lang_tan_thu', hp: 99999, mp: 99999, lifespan: 500, birthDay: -5660, ageStart: 16, stats: { khiHuyet: 20000, vatCong: 6000, vatPhong: 2000, phapCong: 400, phapPhong: 2000, tocDo: 80, minhMan: 100 }, statPoints: 0, freePoints: 0, tuVi: 99999, stones: 100000, stonesTrung: 0, stonesThuong: 0, stonesCuc: 0, inventory: { thanh_thao: 5, linh_thao: 2 }, gearBag: {}, equipped: [], skills: [], job: null, job2: null, job3: null, linhCan: { elements: ['kim'], main: 'kim', count: 1, mutations: [] }, affinity: {}, affV2: 1, bonds: {}, quests: {}, questsDone: {}, flags: {}, counters: {}, disciples: [], foundInvites: [], reformIn: [], sectTech: [], sectArts: [], sectArtsActive: [], mails: [], classRes: {}, food: 100, water: 100 } };
  fs.writeFileSync(path.join(DIR, 'characters.json'), JSON.stringify(chars));
  fs.writeFileSync(path.join(DIR, 'accounts.json'), '{}');
  fs.writeFileSync(path.join(DIR, 'world.json'), JSON.stringify({ totalMinutes: 3360, savedAt: Date.now() }));
  fs.writeFileSync(path.join(DIR, 'sessions.json'), '{}');
  if (!(await portFree(PORT))) { console.log('port ban'); process.exit(2); }
  const proc = spawn('node', ['server/index.js'], { cwd: ROOT, env: { ...process.env, PORT: String(PORT), TTT_STORAGE: 'file', TTT_CHAR_FILE: path.join(DIR, 'characters.json'), TTT_ACC_FILE: path.join(DIR, 'accounts.json'), TTT_WORLD_FILE: path.join(DIR, 'world.json'), TTT_SESS_FILE: path.join(DIR, 'sessions.json'), TTT_DAY_REAL_MS: '600000', TTT_TUVI_NEED: '5' }, stdio: ['ignore', 'pipe', 'pipe'] });
  proc.stderr.on('data', (d) => { try { fs.appendFileSync(path.join(DIR, 'srv.log'), d); } catch (e) {} });
  proc.stdout.on('data', (d) => { try { fs.appendFileSync(path.join(DIR, 'srv.log'), d); } catch (e) {} });
  const t0 = Date.now();
  let up = false;
  while (Date.now() - t0 < 45000) { try { const r = await fetch(`http://127.0.0.1:${PORT}/api/status`); if (r.ok) { up = true; break; } } catch (e) {} await sleep(500); }
  if (!up) { console.log('server khong len'); proc.kill('SIGKILL'); process.exit(2); }
  const socket = io(`http://127.0.0.1:${PORT}`, { transports: ['websocket'] });
  const welcome = await new Promise((res) => { socket.on('connect', () => socket.emit('hello', { token: 'tk363inv01' })); socket.on('welcome', (w) => res(w)); setTimeout(() => res(null), 20000); });
  console.log('welcome inventory =', JSON.stringify(welcome && welcome.character && welcome.character.inventory));
  socket.disconnect();
  proc.kill('SIGTERM');
  await sleep(1500);
  try { proc.kill('SIGKILL'); } catch (e) {}
  process.exit(0);
})();
