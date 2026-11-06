// Probe GĐ327a — ủy thác HẾT HẠN (GĐ323): kill trả theo tỉ lệ, collect trả đồ + ký quỹ thừa, chưa ai nhận hoàn đủ.
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const net = require('net');
const ROOT = path.join(__dirname, '..', '..');
const PORT = 3563;
const DIR = __dirname;
const { io } = require(path.join(ROOT, 'client/node_modules/socket.io-client'));
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
async function stopServer() { if (!serverProc) return; const p = serverProc; serverProc = null; await new Promise((res) => { const t = setTimeout(() => { try { p.kill('SIGKILL'); } catch (e) {} res(); }, 4000); p.once('exit', () => { clearTimeout(t); res(); }); try { p.kill('SIGTERM'); } catch (e) { clearTimeout(t); res(); } }); const t0 = Date.now(); while (Date.now() - t0 < 10000 && !(await portFree(PORT))) await sleep(300); }
function BASE(token, name, extra) {
  return Object.assign({ token, name, classId: 'kiemtu', gender: 'nam', race: null, geo175: 1, realm: 'lk', tier: 1, x: 1565, y: 1252, mapId: 'lang_tan_thu', hp: 99999, stats: { khiHuyet: 500, vatCong: 300, vatPhong: 300, phapCong: 100, phapPhong: 300, tocDo: 60, minhMan: 60 }, statPoints: 0, freePoints: 0, tuVi: 0, stones: 0, stonesTrung: 0, stonesThuong: 0, stonesCuc: 0, inventory: {}, gearBag: {}, equipped: [], skills: [], job: null, job2: null, job3: null, linhCan: { element: 'kim', grade: 'trung', mult: 1.2 }, affinity: {}, affV2: 1, bonds: {}, quests: {}, questsDone: {}, flags: {}, counters: {}, disciples: [], foundInvites: [], reformIn: [], sectTech: [], mails: [] }, extra || {});
}
let pass = 0, fail = 0;
function ok(name, cond, extra) { if (cond) { pass++; console.log('PASS | ' + name); } else { fail++; console.log('FAIL | ' + name + (extra ? ' | ' + extra : '')); } }
async function connect(token) {
  const socket = io(`http://127.0.0.1:${PORT}`, { transports: ['websocket'] });
  const ctx = { socket, welcome: null, sect: null, mail: null };
  socket.on('connect', () => socket.emit('hello', { token }));
  socket.on('welcome', (w) => { ctx.welcome = w; });
  socket.on('sect_state', (st) => { ctx.sect = st; });
  socket.on('mail_state', (m) => { ctx.mail = m; });
  await waitFor(() => ctx.welcome, 20000);
  return ctx;
}
(async () => {
  const chars = {
    p327m00001: BASE('p327m00001', ' ThanhVienS1'),
    p327p00001: BASE('p327p00001', ' NguoiThue1'),
    p327p00002: BASE('p327p00002', ' NguoiThue2'),
    p327p00003: BASE('p327p00003', ' NguoiThue3'),
  };
  fs.writeFileSync(path.join(DIR, 'characters.json'), JSON.stringify(chars));
  const sects = [{ id: 's1', name: 'Tông S1', intro: '', fund: 0, level: 1, uy: 0, members: [{ token: 'p327m00001', name: ' ThanhVienS1', role: 'chu', contrib: 0 }], applicants: [], activeQuests: [{ ref: 'comm:c1', commId: 'c1', title: 'Săn Kiếm Ma ×2', giver: ' NguoiThue1', type: 'kill', monsterKind: 'kiemma', target: 2, progress: 1, rewardFund: 0, rewardUy: 10, expiresDay: 102 }, { ref: 'comm:c2', commId: 'c2', title: 'Thu Linh Thảo ×10', giver: ' NguoiThue2', type: 'collect', itemId: 'linh_thao', target: 10, progress: 3, rewardFund: 0, rewardUy: 10, expiresDay: 102 }], territories: [], territory: null, warehouse: [], garden: [], depts: {}, tributeDay: 100, upkeepDay: 100, questDay: 100, debtDays: 0 }];
  const commissions = [
    { id: 'c1', poster: 'p327p00001', posterName: ' NguoiThue1', type: 'kill', monsterKind: 'kiemma', target: 2, progress: 1, delivered: 0, escrow: 1000, unit: 0, day: 97, expiresDay: 99, sectId: 's1', gm: false, title: 'Săn Kiếm Ma ×2' },
    { id: 'c2', poster: 'p327p00002', posterName: ' NguoiThue2', type: 'collect', itemId: 'linh_thao', target: 10, progress: 3, delivered: 3, escrow: 400, unit: 100, day: 97, expiresDay: 99, sectId: 's1', gm: false, title: 'Thu Linh Thảo ×10' },
    { id: 'c3', poster: 'p327p00003', posterName: ' NguoiThue3', type: 'collect', itemId: 'thit_thu', target: 5, progress: 0, delivered: 0, escrow: 800, unit: 160, day: 97, expiresDay: 99, sectId: null, gm: false, title: 'Thu Thịt Thú ×5' },
  ];
  fs.writeFileSync(path.join(DIR, 'world.json'), JSON.stringify({ totalMinutes: 100 * 1440, savedAt: Date.now(), sects, commissions }));
  await startServer();
  // chờ vòng quét hết hạn (60s) xử lý
  const mem = await connect('p327m00001');
  const fundOk = await waitFor(() => { mem.socket.emit('sect_get'); return mem.sect && mem.sect.mySect && mem.sect.mySect.fund >= 500 ? true : null; }, 90000);
  ok('S1 kill het han: quy tong nhan 500 (50% tien do 1/2)', !!fundOk, 'fund=' + (mem.sect && mem.sect.mySect && mem.sect.mySect.fund));
  async function mailsOf(token) { const c = await connect(token); c.socket.emit('mail_open'); await waitFor(() => c.mail, 8000); const ms = (c.mail && (c.mail.mails || c.mail.list)) || []; c.socket.disconnect(); return ms; }
  const m1 = await mailsOf('p327p00001');
  ok('S2 nguoi thue kill duoc hoan 500 LT qua thu', m1.some((m) => (m.stones || 0) === 500), JSON.stringify(m1.map((m) => [m.title, m.stones])));
  const m2 = await mailsOf('p327p00002');
  ok('S3 collect het han: tra 3 Linh Thao + 400 LT thua qua thu', m2.some((m) => (m.stones || 0) === 400 && Array.isArray(m.items) && m.items.some((it) => it.id === 'linh_thao' && it.qty === 3)), JSON.stringify(m2.map((m) => [m.title, m.stones, JSON.stringify(m.items)])));
  const m3 = await mailsOf('p327p00003');
  ok('S4 chua ai nhan: hoan du 800 LT ky quy', m3.some((m) => (m.stones || 0) === 800), JSON.stringify(m3.map((m) => [m.title, m.stones])));
  mem.socket.disconnect();
  await stopServer();
  console.log(`\n== p327a: ${pass} PASS, ${fail} FAIL ==`);
  process.exit(fail ? 1 : 0);
})();
