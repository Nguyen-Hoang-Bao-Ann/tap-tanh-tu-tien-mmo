// Probe GĐ322 — CẤP TÔNG + Tông Uy + trần theo cấp + lãnh địa mảng + phí duy trì/tụt cấp + nâng cấp công trình.
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const net = require('net');
const ROOT = path.join(__dirname, '..', '..');
const PORT = 3556;
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
function BASE(token, name) {
  return { token, name, classId: 'kiemtu', gender: 'nam', race: null, geo175: 1, realm: 'kd', tier: 1, x: 1565, y: 1252, mapId: 'lang_tan_thu', hp: 9999, stats: { khiHuyet: 200, vatCong: 100, vatPhong: 100, phapCong: 50, phapPhong: 100, tocDo: 60, minhMan: 60 }, statPoints: 0, freePoints: 0, tuVi: 0, stones: 0, stonesTrung: 0, stonesThuong: 0, stonesCuc: 0, inventory: {}, gearBag: {}, equipped: [], skills: [], job: null, job2: null, job3: null, linhCan: { element: 'kim', grade: 'trung', mult: 1.2 }, affinity: {}, affV2: 1, bonds: {}, quests: {}, questsDone: {}, flags: {}, counters: {}, disciples: [], foundInvites: [], reformIn: [] };
}
function SECT(id, name, chuToken, chuName, extra) {
  return Object.assign({ id, name, intro: '', members: [{ token: chuToken, name: chuName, role: 'chu', contrib: 0 }], applicants: [], fund: 0, warehouse: [], level: 1, uy: 0, territories: [], territory: null, tributeDay: 100, upkeepDay: 100, questDay: 100, quests: [], hq: null, buildings: [], garden: [], depts: {} }, extra || {});
}
let pass = 0, fail = 0;
function ok(name, cond, extra) { if (cond) { pass++; console.log('PASS | ' + name); } else { fail++; console.log('FAIL | ' + name + (extra ? ' | ' + extra : '')); } }
async function connectChar(token) {
  const socket = io(`http://127.0.0.1:${PORT}`, { transports: ['websocket'] });
  const ctx = { socket, welcome: null, state: null, errors: [] };
  socket.on('connect', () => socket.emit('hello', { token }));
  socket.on('welcome', (w) => { ctx.welcome = w; });
  socket.on('sect_state', (st) => { ctx.state = st; });
  socket.on('interact_error', (e) => { ctx.errors.push(e.message || ''); });
  await waitFor(() => ctx.welcome, 20000);
  socket.emit('sect_get'); // push lúc login trượt qua emitTo (socket chưa kịp đăng ký) — xin state tường minh như client thật khi mở panel
  await waitFor(() => ctx.state, 10000);
  return ctx;
}
const mySect = (c) => c.state && c.state.mySect;
(async () => {
  const DAY = 100 * 1440;
  // ============ BOOT 1: cấp/Uy/trần/cắm cờ/nâng cấp/kết nạp đầy ============
  {
    const chars = { p322a10001: BASE('p322a10001', 'Chu A'), p322c10001: BASE('p322c10001', 'Chu C'), p322d10001: BASE('p322d10001', 'Chu D'), p322e10001: BASE('p322e10001', 'Moi E') };
    const sectA = SECT('sectA322', 'Uy Tong A', 'p322a10001', 'Chu A', { uy: 195, fund: 60000, territories: ['lm_huyet_sac'], territory: 'lm_huyet_sac', hq: { mapId: 'huyet_sac_rung', x: 4248, y: 6000 }, buildings: [{ kind: 'danphong', name: 'Đan Phòng', x: 4000, y: 5900, lv: 1 }, { kind: 'duocvien', name: 'Dược Viên', x: 4500, y: 6200, lv: 1 }], garden: [{}, {}, {}, {}, {}, {}] });
    const sectC = SECT('sectC322', 'Uy Tong C', 'p322c10001', 'Chu C', { uy: 198, fund: 0, territories: ['lm_co_chien'], territory: 'lm_co_chien', tributeDay: 99 });
    const dMembers = [{ token: 'p322d10001', name: 'Chu D', role: 'chu', contrib: 0 }];
    for (let i = 2; i <= 10; i++) dMembers.push({ token: 'dmem' + i, name: 'De Tu D' + i, role: 'detu', contrib: 0 });
    const sectD = SECT('sectD322', 'Day Tong D', 'p322d10001', 'Chu D', { members: dMembers, fund: 5000 });
    fs.writeFileSync(path.join(DIR, 'characters.json'), JSON.stringify(chars));
    fs.writeFileSync(path.join(DIR, 'world.json'), JSON.stringify({ totalMinutes: DAY, savedAt: Date.now(), sects: [sectA, sectC, sectD] }));
    await startServer();
    const A = await connectChar('p322a10001');
    const gA = mySect(A);
    ok('L1 state cap 1: level/uy/caps/lanh dia/phi', !!gA && gA.level === 1 && gA.uy === 195 && gA.memberCap === 10 && gA.warehouseCap === 60 && gA.territoryCap === 1 && (gA.territories || []).length === 1 && gA.upkeepPerDay === 300 && gA.fund === 60000, JSON.stringify(gA && { l: gA.level, uy: gA.uy, mc: gA.memberCap, up: gA.upkeepPerDay, f: gA.fund }));
    A.socket.emit('sect_territory_claim', { pointId: 'lm_bang_phong' });
    const errCap = await waitFor(() => A.errors.find((e) => e.includes('tối đa 1 lãnh địa')), 6000);
    ok('L2 cap 1 cam co diem 2 bi chan', !!errCap, A.errors.join(' | '));
    A.socket.emit('sect_building_upgrade', { kind: 'danphong' });
    const upA = await waitFor(() => { const g = mySect(A); const b = g && (g.buildings || []).find((x) => x.kind === 'danphong'); return b && b.lv === 2 ? g : null; }, 8000);
    ok('L3 nang cap Dan Phong lv2, quy -20000', !!upA && upA.fund === 40000, 'fund=' + (upA && upA.fund));
    A.socket.emit('sect_building_upgrade', { kind: 'duocvien' });
    const upA2 = await waitFor(() => { const g = mySect(A); return g && (g.garden || []).length === 8 ? g : null; }, 8000);
    ok('L4 nang cap Duoc Vien lv2 -> vuon 8 o, quy 20000', !!upA2 && upA2.fund === 20000, 'garden=' + (upA2 && (upA2.garden || []).length) + ' fund=' + (upA2 && upA2.fund));
    const C = await connectChar('p322c10001');
    const gC = mySect(C);
    ok('L5 trieu cong +5 Uy -> 203 du moc THANG CAP 2', !!gC && gC.level === 2 && gC.uy === 203 && gC.memberCap === 20 && gC.fund === 500, JSON.stringify(gC && { l: gC.level, uy: gC.uy, f: gC.fund, mc: gC.memberCap }));
    const D = await connectChar('p322d10001');
    const E = await connectChar('p322e10001');
    D.socket.emit('sect_invite', { name: 'Moi E' });
    const inv = await waitFor(() => (E.state?.invites || []).find((i) => i.sectId === 'sectD322'), 8000);
    ok('L6a loi moi toi E', !!inv);
    E.socket.emit('sect_invite_respond', { sectId: 'sectD322', accept: true });
    const errFull = await waitFor(() => E.errors.find((e) => e.includes('đủ 10 thành viên')), 8000);
    await sleep(600);
    const gD = mySect(D);
    ok('L6b tran thanh vien cap 1 (10) chan ket nap', !!errFull && (gD?.members || []).length === 10 && !mySect(E), E.errors.join(' | '));
    A.socket.disconnect(); C.socket.disconnect(); D.socket.disconnect(); E.socket.disconnect();
    await stopServer();
  }
  // ============ BOOT 2: phí duy trì + tụt cấp ============
  {
    const chars = { p322e20001: BASE('p322e20001', 'Chu E2'), p322f20001: BASE('p322f20001', 'Chu F2'), p322g20001: BASE('p322g20001', 'Chu G2') };
    const sectE = SECT('sectE322', 'No Tong E', 'p322e20001', 'Chu E2', { level: 3, uy: 700, fund: 50, upkeepDay: 97 });
    const sectF = SECT('sectF322', 'Du Tong F', 'p322f20001', 'Chu F2', { fund: 1000, upkeepDay: 99 });
    const sectG = SECT('sectG322', 'Hai Diem G', 'p322g20001', 'Chu G2', { level: 2, uy: 250, fund: 10000, territories: ['lm_kiem_trung', 'lm_thien_moc'], territory: 'lm_kiem_trung', upkeepDay: 99 });
    fs.writeFileSync(path.join(DIR, 'characters.json'), JSON.stringify(chars));
    fs.writeFileSync(path.join(DIR, 'world.json'), JSON.stringify({ totalMinutes: DAY, savedAt: Date.now(), sects: [sectE, sectF, sectG] }));
    await startServer();
    const E2 = await connectChar('p322e20001');
    const gE = mySect(E2);
    ok('M1 thieu phi 3 ngay -> TUT CAP 3->2, Uy cat 599, quy giu 50', !!gE && gE.level === 2 && gE.uy === 599 && gE.fund === 50 && gE.debtDays === 0, JSON.stringify(gE && { l: gE.level, uy: gE.uy, f: gE.fund, d: gE.debtDays }));
    const F2 = await connectChar('p322f20001');
    const gF = mySect(F2);
    ok('M2 phi ngay cap 1 = 100: quy 1000 -> 900', !!gF && gF.fund === 900 && gF.level === 1, 'fund=' + (gF && gF.fund));
    const G2 = await connectChar('p322g20001');
    const gG = mySect(G2);
    ok('M3 2 lanh dia o cap 2: phi 600/ngay, quy 10000 -> 9400, giu ca 2 diem', !!gG && gG.fund === 9400 && (gG.territories || []).length === 2 && gG.upkeepPerDay === 600, JSON.stringify(gG && { f: gG.fund, t: (gG.territories || []).length, up: gG.upkeepPerDay }));
    E2.socket.disconnect(); F2.socket.disconnect(); G2.socket.disconnect();
    await stopServer();
  }
  // ============ BOOT 3: cấp 3 giữ 2 lãnh địa, bỏ theo điểm ============
  {
    const chars = { p322h30001: BASE('p322h30001', 'Chu H3') };
    const sectH = SECT('sectH322', 'Cap Ba H', 'p322h30001', 'Chu H3', { level: 3, uy: 1500, fund: 100000, territories: ['lm_huyet_sac'], territory: 'lm_huyet_sac' });
    fs.writeFileSync(path.join(DIR, 'characters.json'), JSON.stringify(chars));
    fs.writeFileSync(path.join(DIR, 'world.json'), JSON.stringify({ totalMinutes: DAY, savedAt: Date.now(), sects: [sectH] }));
    await startServer();
    const H = await connectChar('p322h30001');
    H.socket.emit('sect_territory_claim', { pointId: 'lm_thien_loi' });
    const claimed = await waitFor(() => { const g = mySect(H); return g && (g.territories || []).length === 2 ? g : null; }, 8000);
    ok('N1 cap 3 cam co diem THU 2 duoc', !!claimed, JSON.stringify((mySect(H) || {}).territories));
    H.socket.emit('sect_territory_abandon', { pointId: 'lm_thien_loi' });
    const dropped = await waitFor(() => { const g = mySect(H); return g && (g.territories || []).length === 1 && g.territories[0].pointId === 'lm_huyet_sac' ? g : null; }, 8000);
    ok('N2 bo lanh dia THEO DIEM: con lai dung diem cu', !!dropped);
    H.socket.disconnect();
    await stopServer();
  }
  console.log(`\n== p322: ${pass} PASS, ${fail} FAIL ==`);
  process.exit(fail ? 1 : 0);
})();
