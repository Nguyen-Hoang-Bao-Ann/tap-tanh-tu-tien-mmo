// Debug: in 3 sect_state dau tien cua A1 — mySect co null khong?
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const net = require('net');
const ROOT = path.join(__dirname, '..', '..');
const PORT = 3557;
const DIR = __dirname;
const { io } = require(path.join(ROOT, 'client/node_modules/socket.io-client'));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function waitFor(fn, ms) { const t0 = Date.now(); while (Date.now() - t0 < ms) { const v = fn(); if (v) return v; await sleep(150); } return null; }
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
function BASE(token, name) {
  return { token, name, classId: 'kiemtu', gender: 'nam', race: null, geo175: 1, realm: 'kd', tier: 1, x: 1565, y: 1252, mapId: 'lang_tan_thu', hp: 9999, stats: { khiHuyet: 200, vatCong: 100, vatPhong: 100, phapCong: 50, phapPhong: 100, tocDo: 60, minhMan: 60 }, statPoints: 0, freePoints: 0, tuVi: 0, stones: 0, stonesTrung: 0, stonesThuong: 0, stonesCuc: 0, inventory: {}, gearBag: {}, equipped: [], skills: [], job: null, job2: null, job3: null, linhCan: { element: 'kim', grade: 'trung', mult: 1.2 }, affinity: {}, affV2: 1, bonds: {}, quests: {}, questsDone: {}, flags: {}, counters: {}, disciples: [], foundInvites: [], reformIn: [] };
}
(async () => {
  const sectA = { id: 'sectA322', name: 'Uy Tong A', intro: '', members: [{ token: 'p322a10001', name: 'Chu A', role: 'chu', contrib: 0 }], applicants: [], fund: 60000, warehouse: [], level: 1, uy: 195, territories: ['lm_huyet_sac'], territory: 'lm_huyet_sac', tributeDay: 100, upkeepDay: 100, questDay: 100, quests: [], hq: null, buildings: [], garden: [], depts: {} };
  fs.writeFileSync(path.join(DIR, 'characters.json'), JSON.stringify({ p322a10001: BASE('p322a10001', 'Chu A') }));
  fs.writeFileSync(path.join(DIR, 'world.json'), JSON.stringify({ totalMinutes: 100 * 1440, savedAt: Date.now(), sects: [sectA] }));
  await startServer();
  const socket = io(`http://127.0.0.1:${PORT}`, { transports: ['websocket'] });
  let n = 0;
  socket.on('connect', () => socket.emit('hello', { token: 'p322a10001' }));
  socket.on('sect_state', (st) => { n++; console.log('STATE #' + n + ' mySect=' + (st.mySect ? ('level ' + st.mySect.level + ' uy ' + st.mySect.uy + ' fund ' + st.mySect.fund) : 'NULL')); });
  await sleep(10000);
  console.log('tong state nhan duoc:', n);
  socket.disconnect();
  if (serverProc) { try { serverProc.kill('SIGTERM'); } catch (e) {} }
  await sleep(1500);
  process.exit(0);
})();
