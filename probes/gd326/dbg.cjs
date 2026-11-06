// Debug D4: mute -> chat, in moi event cua E
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const net = require('net');
const ROOT = path.join(__dirname, '..', '..');
const PORT = 3562;
const DIR = __dirname;
const { io } = require(path.join(ROOT, 'client/node_modules/socket.io-client'));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
function portFree(port) { return new Promise((res) => { const s = net.createServer(); s.once('error', () => res(false)); s.listen(port, () => s.close(() => res(true))); }); }
let serverProc = null, killTimer = null;
async function startServer() {
  serverProc = spawn('node', ['server/index.js'], { cwd: ROOT, env: { ...process.env, PORT: String(PORT), TTT_STORAGE: 'file', TTT_CHAR_FILE: path.join(DIR, 'characters.json'), TTT_ACC_FILE: path.join(DIR, 'accounts.json'), TTT_WORLD_FILE: path.join(DIR, 'world.json'), TTT_SESS_FILE: path.join(DIR, 'sessions.json'), TTT_DAY_REAL_MS: '600000', TTT_TUVI_NEED: '5' }, stdio: ['ignore', 'pipe', 'pipe'] });
  serverProc.stderr.on('data', (d) => process.stderr.write('[srv] ' + d));
  killTimer = setTimeout(() => { try { serverProc.kill('SIGKILL'); } catch (e) {} }, 60000);
  const t0 = Date.now();
  while (Date.now() - t0 < 45000) { try { const r = await fetch(`http://127.0.0.1:${PORT}/api/status`); if (r.ok) { clearTimeout(killTimer); return; } } catch (e) {} await sleep(500); }
  throw new Error('no server');
}
function BASE(token, name, extra) { return Object.assign({ token, name, classId: 'kiemtu', gender: 'nam', race: null, geo175: 1, realm: 'lk', tier: 1, x: 1565, y: 1252, mapId: 'lang_tan_thu', hp: 99999, stats: { khiHuyet: 500, vatCong: 300, vatPhong: 300, phapCong: 100, phapPhong: 300, tocDo: 60, minhMan: 60 }, statPoints: 0, freePoints: 0, tuVi: 0, stones: 0, stonesTrung: 0, stonesThuong: 0, stonesCuc: 0, inventory: {}, gearBag: {}, equipped: [], skills: [], job: null, job2: null, job3: null, linhCan: { element: 'kim', grade: 'trung', mult: 1.2 }, affinity: {}, affV2: 1, bonds: {}, quests: {}, questsDone: {}, flags: {}, counters: {}, disciples: [], foundInvites: [], reformIn: [], sectTech: [] }, extra || {}); }
(async () => {
  const chars = { p326d00001: BASE('p326d00001', ' ChuD'), p326d00002: BASE('p326d00002', ' ChapPhap'), p326e00001: BASE('p326e00001', ' DonXin') };
  fs.writeFileSync(path.join(DIR, 'characters.json'), JSON.stringify(chars));
  const sects = [{ id: 'sd', name: 'Tông D', intro: '', fund: 0, level: 1, uy: 0, members: [{ token: 'p326d00001', name: ' ChuD', role: 'chu', contrib: 999 }, { token: 'p326d00002', name: ' ChapPhap', role: 'detu', contrib: 0 }, { token: 'p326e00001', name: ' DonXin', role: 'detu', contrib: 0 }], applicants: [], activeQuests: [], territories: [], territory: null, warehouse: [], garden: [], depts: { chapphap: 'p326d00002' }, tributeDay: 100, upkeepDay: 100, questDay: 100, debtDays: 0 }];
  fs.writeFileSync(path.join(DIR, 'world.json'), JSON.stringify({ totalMinutes: 100 * 1440, savedAt: Date.now(), sects }));
  await startServer();
  const mk = (token, tag) => { const s = io(`http://127.0.0.1:${PORT}`, { transports: ['websocket'] }); s.on('connect', () => s.emit('hello', { token })); s.onAny((ev, d) => { if (['interact_error', 'notice', 'chat_msg'].includes(ev)) console.log(tag, ev, JSON.stringify(d).slice(0, 130)); }); return s; };
  const chu = mk('p326d00001', '[chu]'); const cp = mk('p326d00002', '[cp]'); const e1 = mk('p326e00001', '[e1]');
  await sleep(2500);
  cp.emit('sect_mute', { token: 'p326e00001' });
  await sleep(1000);
  e1.emit('chat_send', { ch: 'sect', text: 'alo alo' });
  await sleep(1500);
  console.log('--- xong ---');
  process.exit(0);
})();
