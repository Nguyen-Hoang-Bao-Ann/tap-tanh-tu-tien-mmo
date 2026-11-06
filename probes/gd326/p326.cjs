// Probe GĐ326 — tông môn đợt 3: tông quy (mở/thuế), nhật ký, kế vị, Chấp Pháp, tông pháp.
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const net = require('net');
const ROOT = path.join(__dirname, '..', '..');
const PORT = 3560;
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
async function stopServer() { if (!serverProc) return; const p = serverProc; serverProc = null; await new Promise((res) => { const t = setTimeout(() => { try { p.kill('SIGKILL'); } catch (e) {} res(); }, 4000); p.once('exit', () => { clearTimeout(t); res(); }); try { p.kill('SIGTERM'); } catch (e) { clearTimeout(t); res(); } }); const t0 = Date.now(); while (Date.now() - t0 < 10000 && !(await portFree(PORT))) await sleep(300); }
function BASE(token, name, extra) {
  return Object.assign({ token, name, classId: 'kiemtu', gender: 'nam', race: null, geo175: 1, realm: 'lk', tier: 1, x: 1565, y: 1252, mapId: 'lang_tan_thu', hp: 99999, stats: { khiHuyet: 500, vatCong: 300, vatPhong: 300, phapCong: 100, phapPhong: 300, tocDo: 60, minhMan: 60 }, statPoints: 0, freePoints: 0, tuVi: 0, stones: 0, stonesTrung: 0, stonesThuong: 0, stonesCuc: 0, inventory: {}, gearBag: {}, equipped: [], skills: [], job: null, job2: null, job3: null, linhCan: { element: 'kim', grade: 'trung', mult: 1.2 }, affinity: {}, affV2: 1, bonds: {}, quests: {}, questsDone: {}, flags: {}, counters: {}, disciples: [], foundInvites: [], reformIn: [], sectTech: [] }, extra || {});
}
function SECT(id, name, members, extra) {
  return Object.assign({ id, name, intro: '', fund: 0, level: 1, uy: 0, members, applicants: [], activeQuests: [], territories: [], territory: null, warehouse: [], garden: [], depts: {}, tributeDay: 100, upkeepDay: 100, questDay: 100, debtDays: 0 }, extra || {});
}
let pass = 0, fail = 0;
function ok(name, cond, extra) { if (cond) { pass++; console.log('PASS | ' + name); } else { fail++; console.log('FAIL | ' + name + (extra ? ' | ' + extra : '')); } }
async function connect(token) {
  const socket = io(`http://127.0.0.1:${PORT}`, { transports: ['websocket'] });
  const ctx = { socket, welcome: null, sect: null, board: null, errors: [], chats: [], sync: null };
  socket.on('connect', () => socket.emit('hello', { token }));
  socket.on('welcome', (w) => { ctx.welcome = w; });
  socket.on('sect_state', (st) => { ctx.sect = st; });
  socket.on('board_state', (st) => { ctx.board = st; });
  socket.on('char_sync', (sy) => { ctx.sync = sy; });
  socket.on('interact_error', (e) => ctx.errors.push(e.message || ''));
  socket.on('chat_msg', (m) => ctx.chats.push(m));
  await waitFor(() => ctx.welcome, 20000);
  socket.emit('sect_get');
  await waitFor(() => ctx.sect, 10000);
  return ctx;
}
(async () => {
  const DAY = 100;
  const chars = {
    p326a00001: BASE('p326a00001', ' ChuA', { x: 1368, y: 1046, stones: 1000 }),
    p326a00002: BASE('p326a00002', ' MemA', { inventory: { linh_thao: 99, thit_thu: 99, da_quy: 99, nanh_soi: 99, thanh_thao: 99, xuong_thu: 99, canh_doi: 99, tien_linh_chi: 99 } }),
    p326j00001: BASE('p326j00001', ' VaoThang'),
    p326j00002: BASE('p326j00002', ' CanhThap', { realm: 'pham' }),
    p326b00002: BASE('p326b00002', ' PhoB'),
    p326c00002: BASE('p326c00002', ' PhoC'),
    p326d00001: BASE('p326d00001', ' ChuD', { x: 1565, y: 1252 }),
    p326d00002: BASE('p326d00002', ' ChapPhap'),
    p326d00003: BASE('p326d00003', ' HocPhap', { mapId: 'huyet_sac_rung', x: 4248, y: 3000 }),
    p326e00001: BASE('p326e00001', ' DonXin'),
  };
  chars.p326b00001 = BASE('p326b00001', ' ChuBOffline'); chars.p326c00001 = BASE('p326c00001', ' ChuCOffline'); chars.p326d00009 = BASE('p326d00009', ' TruongLaoD'); chars.p326d00008 = BASE('p326d00008', ' DeTuThuong');
  fs.writeFileSync(path.join(DIR, 'characters.json'), JSON.stringify(chars));
  const sects = [
    SECT('sa', 'Tông A', [{ token: 'p326a00001', name: ' ChuA', role: 'chu', contrib: 0 }, { token: 'p326a00002', name: ' MemA', role: 'detu', contrib: 0 }]),
    SECT('sb', 'Tông B', [{ token: 'p326b00001', name: ' ChuBOffline', role: 'chu', contrib: 0 }, { token: 'p326b00002', name: ' PhoB', role: 'pho', contrib: 0 }], { chuSeenDay: DAY - 31 }),
    SECT('sc', 'Tông C', [{ token: 'p326c00001', name: ' ChuCOffline', role: 'chu', contrib: 0 }, { token: 'p326c00002', name: ' PhoC', role: 'pho', contrib: 0 }], { chuSeenDay: DAY - 15 }),
    SECT('sd', 'Tông D', [{ token: 'p326d00001', name: ' ChuD', role: 'chu', contrib: 999 }, { token: 'p326d00002', name: ' ChapPhap', role: 'detu', contrib: 0 }, { token: 'p326d00003', name: ' HocPhap', role: 'detu', contrib: 500 }, { token: 'p326d00009', name: ' TruongLaoD', role: 'truonglao', contrib: 0 }, { token: 'p326d00008', name: ' DeTuThuong', role: 'detu', contrib: 0 }], { depts: { chapphap: 'p326d00002' }, hq: { mapId: 'huyet_sac_rung', x: 4248, y: 2900 }, buildings: [{ kind: 'tangkinh', name: 'Tàng Kinh Các', x: 4248, y: 3000 }] }),
  ];
  fs.writeFileSync(path.join(DIR, 'world.json'), JSON.stringify({ totalMinutes: DAY * 1440, savedAt: Date.now(), sects }));
  await startServer();
  // ===== A: tông quy + vào thẳng + thuế + nhật ký =====
  const chuA = await connect('p326a00001'); const memA = await connect('p326a00002');
  chuA.socket.emit('sect_rules_set', { open: true, minRealm: 1, taxPct: 20 });
  await waitFor(() => chuA.sect && chuA.sect.mySect && chuA.sect.mySect.rules && chuA.sect.mySect.rules.open, 8000);
  ok('A1 chu dat tong quy mo + thue 20%', !!(chuA.sect.mySect.rules.open && chuA.sect.mySect.rules.taxPct === 20 && chuA.sect.mySect.rules.minRealm === 1), JSON.stringify(chuA.sect.mySect.rules));
  const j1 = await connect('p326j00001');
  j1.socket.emit('sect_join', { sectId: 'sa' });
  await waitFor(() => j1.sect && j1.sect.mySect, 8000);
  ok('A2 nguoi ngoai canh LK vao thang tong mo', !!(j1.sect.mySect && j1.sect.mySect.name === 'Tông A'));
  j1.socket.disconnect(); await sleep(700);
  const j2 = await connect('p326j00002');
  j2.errors = []; j2.socket.emit('sect_join', { sectId: 'sa' });
  await sleep(1200); j2.socket.emit('sect_get'); await sleep(600);
  ok('A3 canh Pham bi chan boi canh toi thieu', !j2.sect.mySect && j2.errors.some((e) => e.includes('chỉ nhận')), j2.errors.join(';'));
  j2.socket.disconnect();
  // thuế: chuA nhận việc thu thập ở bảng, memA nộp đủ
  chuA.socket.emit('board_get'); await waitFor(() => chuA.board, 8000);
  const offer = (chuA.board.offers || []).find((o) => o.type === 'collect');
  ok('A4a co viec thu thap trong 6 viec ngay', !!offer, JSON.stringify((chuA.board.offers || []).map((o) => o.type)));
  if (offer) {
    chuA.socket.emit('board_accept', { key: offer.key });
    await waitFor(() => chuA.sect.mySect && (chuA.sect.mySect.quests || []).length >= 1, 8000);
    const q = chuA.sect.mySect.quests[0];
    const rf = q.rewardFund || 0;
    const fund0 = chuA.sect.mySect.fund || 0;
    memA.socket.emit('board_deposit', { ref: q.key, qty: q.target });
    const done = await waitFor(() => chuA.sect.mySect && !(chuA.sect.mySect.quests || []).length, 10000);
    const each = Math.floor(Math.floor(rf * 0.2) / 2);
    const fundExp = fund0 + rf - each * 2;
    await waitFor(() => memA.sync, 5000); memA.socket.emit('sect_get'); await sleep(500);
    const chuStones = (chuA.sync && chuA.sync.character) ? chuA.sync.character.stones : null;
    ok('A4b thue viec: quy nhan phan con lai, 2 nguoi online duoc chia deu', !!done && chuA.sect.mySect.fund === fundExp, `fund=${chuA.sect.mySect.fund} exp=${fundExp} rf=${rf} each=${each}`);
    ok('A4c nhat ky co: dat tong quy + gia nhap + hoan thanh viec', (chuA.sect.mySect.log || []).some((e) => e.text.includes('tông quy')) && (chuA.sect.mySect.log || []).some((e) => e.text.includes('gia nhập')) && (chuA.sect.mySect.log || []).some((e) => e.text.includes('Hoàn thành việc')), JSON.stringify((chuA.sect.mySect.log || []).map((e) => e.text)));
  }
  // ===== B: kế vị hẳn sau 30 ngày =====
  const phoB = await connect('p326b00002');
  phoB.socket.emit('sect_get'); await sleep(800);
  const mb = (phoB.sect.mySect.members || []);
  ok('B1 vang 31 ngay: Pho ke vi lam Tong chu, chu cu xuong Pho', (mb.find((m) => m.name.includes('PhoB')) || {}).role === 'chu' && (mb.find((m) => m.name.includes('ChuBOffline')) || {}).role === 'pho', JSON.stringify(mb.map((m) => [m.name, m.role])));
  ok('B2 nhat ky ghi ke vi', (phoB.sect.mySect.log || []).some((e) => e.text.includes('KẾ VỊ')), JSON.stringify((phoB.sect.mySect.log || []).map((e) => e.text)));
  // ===== C: quyền tông chủ sau 14 ngày =====
  const phoC = await connect('p326c00002');
  phoC.socket.emit('sect_get'); await sleep(800);
  ok('C1 vang 15 ngay: co Quyen Tong chu', !!(phoC.sect.mySect.acting && phoC.sect.mySect.acting.name.includes('PhoC')), JSON.stringify(phoC.sect.mySect.acting));
  phoC.socket.emit('sect_rules_set', { open: false, minRealm: 0, taxPct: 15 });
  await waitFor(() => phoC.sect.mySect.rules && phoC.sect.mySect.rules.taxPct === 15, 8000);
  ok('C2 Quyen Tong chu dat duoc tong quy', phoC.sect.mySect.rules.taxPct === 15);
  phoC.errors = []; phoC.socket.emit('sect_disband'); await sleep(1000); phoC.socket.emit('sect_get'); await sleep(600);
  ok('C3 Quyen Tong chu KHONG giai tan duoc', !!phoC.sect.mySect && phoC.errors.some((e) => e.includes('Chỉ Tông chủ')), phoC.errors.join(';'));
  // ===== D: Chấp Pháp + tông pháp =====
  const chuD = await connect('p326d00001'); const cp = await connect('p326d00002'); const hp = await connect('p326d00003'); const e1 = await connect('p326e00001');
  e1.socket.emit('sect_apply', { sectId: 'sd' }); await sleep(700);
  cp.socket.emit('sect_apply_respond', { token: 'p326e00001', accept: true });
  await waitFor(() => e1.sect && e1.sect.mySect, 8000);
  ok('D1 Duong Chu Chap Phap duyet don duoc', !!(e1.sect.mySect && e1.sect.mySect.name === 'Tông D'));
  cp.errors = []; cp.socket.emit('sect_kick', { token: 'p326d00009' }); await sleep(900); chuD.socket.emit('sect_get'); await sleep(600);
  ok('D2 Chap Phap khong truc xuat duoc Truong Lao', (chuD.sect.mySect.members || []).some((m) => m.name.includes('TruongLaoD')), cp.errors.join(';'));
  cp.socket.emit('sect_kick', { token: 'p326d00008' }); await sleep(900); chuD.socket.emit('sect_get'); await sleep(600);
  ok('D3 Chap Phap truc xuat duoc De tu thuong', !(chuD.sect.mySect.members || []).some((m) => m.name.includes('DeTuThuong')));
  cp.socket.emit('sect_mute', { token: 'p326e00001' }); await sleep(700);
  e1.chats = []; chuD.chats = []; e1.errors = [];
  e1.socket.emit('chat_send', { ch: 'sect', text: 'bi cam chat roi' }); await sleep(1200);
  ok('D4 nguoi bi cam chat khong gui duoc kenh tong', !chuD.chats.some((m) => m.text.includes('bi cam chat')) && e1.errors.some((x) => x.includes('cấm chat')), e1.errors.join(';'));
  chuD.socket.emit('chat_send', { ch: 'sect', text: 'chu van chat duoc' });
  const gotChat = await waitFor(() => e1.chats.find((m) => m.text.includes('chu van chat duoc')), 6000);
  ok('D5 nguoi khac chat tong binh thuong', !!gotChat);
  hp.socket.emit('sect_tech_learn', { techId: 'ho_the' });
  await waitFor(() => hp.sect && hp.sect.mySect && (hp.sect.mySect.techs || []).some((t) => t.id === 'ho_the' && t.learned), 8000);
  ok('D6 hoc tong phap tai Tang Kinh Cac tru 200 Tong Cong', !!(hp.sect.mySect.techs || []).some((t) => t.id === 'ho_the' && t.learned) && hp.sect.mySect.myContrib === 300, 'contrib=' + (hp.sect && hp.sect.mySect.myContrib));
  hp.errors = []; hp.socket.emit('sect_tech_learn', { techId: 'ho_the' }); await sleep(900);
  ok('D7 hoc lai bi chan', hp.errors.some((x) => x.includes('đã học')), hp.errors.join(';'));
  chuD.errors = []; chuD.socket.emit('sect_tech_learn', { techId: 'chien_y' }); await sleep(900);
  ok('D8 dung xa Tang Kinh Cac khong hoc duoc', chuD.errors.some((x) => x.includes('Tàng Kinh Các')), chuD.errors.join(';'));
  for (const c of [chuA, memA, phoB, phoC, chuD, cp, hp, e1]) c.socket.disconnect();
  await stopServer();
  console.log(`\n== p326: ${pass} PASS, ${fail} FAIL ==`);
  process.exit(fail ? 1 : 0);
})();
