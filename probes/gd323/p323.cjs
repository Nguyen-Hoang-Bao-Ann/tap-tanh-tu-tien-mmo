// Probe GĐ323 — Bảng Ủy Thác: việc NPC ngày + ủy thác người chơi ký quỹ (thu mua + thuê săn) + việc Admin + hủy/gate khoảng cách.
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const net = require('net');
const ROOT = path.join(__dirname, '..', '..');
const PORT = 3558;
const DIR = __dirname;
const { io } = require(path.join(ROOT, 'client/node_modules/socket.io-client'));
const { createMerger } = require(path.join(ROOT, 'client/worldmerge.cjs'));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function waitFor(fn, ms) { const t0 = Date.now(); while (Date.now() - t0 < ms) { const v = fn(); if (v) return v; await sleep(150); } return null; }
function portFree(port) { return new Promise((res) => { const s = net.createServer(); s.once('error', () => res(false)); s.listen(port, () => s.close(() => res(true))); }); }
let serverProc = null, killTimer = null;
async function startServer() {
  if (!(await portFree(PORT))) throw new Error('port ban');
  serverProc = spawn('node', ['server/index.js'], { cwd: ROOT, env: { ...process.env, PORT: String(PORT), TTT_STORAGE: 'file', TTT_CHAR_FILE: path.join(DIR, 'characters.json'), TTT_ACC_FILE: path.join(DIR, 'accounts.json'), TTT_WORLD_FILE: path.join(DIR, 'world.json'), TTT_SESS_FILE: path.join(DIR, 'sessions.json'), TTT_DAY_REAL_MS: '600000', TTT_TUVI_NEED: '5', TTT_GM_NAMES: 'Admin Bao' }, stdio: ['ignore', 'pipe', 'pipe'] });
  serverProc.stderr.on('data', (d) => process.stderr.write('[srv] ' + d));
  killTimer = setTimeout(() => { try { serverProc.kill('SIGKILL'); } catch (e) {} }, 60000);
  const t0 = Date.now();
  while (Date.now() - t0 < 45000) { try { const r = await fetch(`http://127.0.0.1:${PORT}/api/status`); if (r.ok) { clearTimeout(killTimer); return; } } catch (e) {} await sleep(500); }
  throw new Error('server khong len');
}
async function stopServer() { if (!serverProc) return; const p = serverProc; serverProc = null; await new Promise((res) => { const t = setTimeout(() => { try { p.kill('SIGKILL'); } catch (e) {} res(); }, 4000); p.once('exit', () => { clearTimeout(t); res(); }); try { p.kill('SIGTERM'); } catch (e) { clearTimeout(t); res(); } }); const t0 = Date.now(); while (Date.now() - t0 < 10000 && !(await portFree(PORT))) await sleep(300); }
function BASE(token, name, extra) {
  return Object.assign({ token, name, classId: 'kiemtu', gender: 'nam', race: null, geo175: 1, realm: 'kd', tier: 1, x: 1368, y: 1046, mapId: 'lang_tan_thu', hp: 99999, stats: { khiHuyet: 500, vatCong: 300, vatPhong: 300, phapCong: 100, phapPhong: 300, tocDo: 60, minhMan: 60 }, statPoints: 0, freePoints: 0, tuVi: 0, stones: 0, stonesTrung: 0, stonesThuong: 0, stonesCuc: 0, inventory: {}, gearBag: {}, equipped: [], skills: [], job: null, job2: null, job3: null, linhCan: { element: 'kim', grade: 'trung', mult: 1.2 }, affinity: {}, affV2: 1, bonds: {}, quests: {}, questsDone: {}, flags: {}, counters: {}, disciples: [], foundInvites: [], reformIn: [] }, extra || {});
}
let pass = 0, fail = 0;
function ok(name, cond, extra) { if (cond) { pass++; console.log('PASS | ' + name); } else { fail++; console.log('FAIL | ' + name + (extra ? ' | ' + extra : '')); } }
async function connectChar(token) {
  const socket = io(`http://127.0.0.1:${PORT}`, { transports: ['websocket'] });
  const ctx = { socket, merger: createMerger(), state: null, welcome: null, board: null, sect: null, errors: [], mails: [] };
  socket.on('connect', () => socket.emit('hello', { token }));
  socket.on('welcome', (w) => { ctx.welcome = w; });
  socket.on('server_tick', (t) => { const st = ctx.merger(t); if (st) ctx.state = st; });
  socket.on('board_state', (b) => { ctx.board = b; });
  socket.on('sect_state', (st) => { ctx.sect = st; });
  socket.on('mail_state', (m) => { ctx.mails.push(JSON.stringify(m)); });
  socket.on('interact_error', (e) => { ctx.errors.push(e.message || ''); });
  await waitFor(() => ctx.welcome, 20000);
  socket.emit('sect_get');
  return ctx;
}
const meOf = (c) => (c.state?.players || []).find((p) => p.id === c.welcome.id);
async function flyToBoard(c) {
  c.socket.emit('fly_toggle', {}); await sleep(400);
  const t0 = Date.now();
  while (Date.now() - t0 < 30000) { const me = meOf(c); if (!me) { await sleep(150); continue; } const dx = 1368 - me.x, dy = 1046 - me.y; const d = Math.hypot(dx, dy); if (d <= 60) break; c.socket.emit('client_input', { vx: dx / d, vy: dy / d }); await sleep(110); }
  c.socket.emit('client_input', { vx: 0, vy: 0 }); c.socket.emit('fly_toggle', {}); await sleep(500);
}
const fundOf = (c) => c.sect?.mySect?.fund;
const uyOf = (c) => c.sect?.mySect?.uy;
async function getBoard(c) { c.board = null; c.socket.emit('board_get'); return waitFor(() => c.board, 8000); }
async function killKind(c, kind, n) {
  // bay tới Thạch Lâm, hạ n quái kind (không bot quấy)
  c.socket.emit('fly_toggle', {}); await sleep(400);
  let killed = 0; const t0 = Date.now();
  while (killed < n && Date.now() - t0 < 90000) {
    const mons = (c.state?.monsters || []).filter((m) => m.kind === kind && (m.hp || 0) > 0);
    const me = meOf(c); if (!me || !mons.length) { await sleep(300); continue; }
    const t = mons[0];
    const d = Math.hypot(t.x - me.x, t.y - me.y);
    if (d > 55) { c.socket.emit('client_input', { vx: (t.x - me.x) / d, vy: (t.y - me.y) / d }); await sleep(110); continue; }
    c.socket.emit('client_input', { vx: 0, vy: 0 });
    if (me.flying) { c.socket.emit('fly_toggle', {}); await sleep(350); }
    const before = (c.state?.monsters || []).filter((m) => m.kind === kind).length;
    for (let i = 0; i < 14; i++) { c.socket.emit('player_attack', {}); await sleep(230); }
    const after = (c.state?.monsters || []).filter((m) => m.kind === kind).length;
    if (after < before) killed++;
    await sleep(200);
  }
  return killed;
}
(async () => {
  const chars = {
    p323l10001: BASE('p323l10001', 'Tru Ton', { stones: 5000 }),
    p323m10001: BASE('p323m10001', 'De Tu S', { stones: 20000, inventory: { linh_thao: 10 } }),
    p323p10001: BASE('p323p10001', 'Nguoi Dang', { stones: 10000 }),
    p323g10001: BASE('p323g10001', 'Admin Bao', {}),
  };
  const sectS = { id: 'sectS323', name: 'Uy Thac Tong', intro: '', members: [{ token: 'p323l10001', name: 'Tru Ton', role: 'chu', contrib: 0 }, { token: 'p323m10001', name: 'De Tu S', role: 'detu', contrib: 0 }], applicants: [], fund: 0, warehouse: [], level: 1, uy: 0, territories: [], territory: null, tributeDay: 100, upkeepDay: 100, questDay: 100, quests: [], hq: null, buildings: [], garden: [], depts: {}, activeQuests: [] };
  fs.writeFileSync(path.join(DIR, 'characters.json'), JSON.stringify(chars));
  fs.writeFileSync(path.join(DIR, 'world.json'), JSON.stringify({ totalMinutes: 100 * 1440, savedAt: Date.now(), sects: [sectS] }));
  await startServer();
  const L = await connectChar('p323l10001');
  const M = await connectChar('p323m10001');
  const P = await connectChar('p323p10001');
  const G = await connectChar('p323g10001');
  // A: xem bảng
  const b0 = await getBoard(P);
  ok('A bang co 6 viec ngay + atBoard', !!b0 && (b0.offers || []).length === 6 && b0.atBoard === true, b0 ? 'offers=' + (b0.offers || []).length + ' at=' + b0.atBoard : 'null');
  // B: đăng ủy thác thu mua
  P.socket.emit('board_post', { type: 'collect', itemId: 'linh_thao', target: 10, pay: 1000 });
  const comm1 = await waitFor(() => { const c = (P.board?.commissions || []).find((x) => x.mine && x.type === 'collect'); return c || null; }, 8000);
  ok('B dang uy thac thu mua: ky quy 1000, tru tien nguoi dang', !!comm1 && comm1.escrow === 1000, comm1 ? 'escrow=' + comm1.escrow : 'null');
  // C: tông chủ nhận ủy thác
  L.socket.emit('board_accept_comm', { id: comm1.id });
  const act1 = await waitFor(() => { const g = L.sect?.mySect; return g && (g.quests || []).some((q) => q.key === 'comm:' + comm1.id) ? g : null; }, 8000);
  ok('C tong chu nhan uy thac -> viec xuong panel tong', !!act1);
  // D: thành viên nộp đồ -> xong -> quỹ nhận 1000, người đăng nhận thư kèm đồ
  const fundB = fundOf(L) || 0;
  M.socket.emit('board_deposit', { ref: 'comm:' + comm1.id, qty: 10 });
  const doneD = await waitFor(() => { const g = L.sect?.mySect; return g && !(g.quests || []).some((q) => q.key === 'comm:' + comm1.id) ? g : null; }, 8000);
  const mailD = await waitFor(() => P.mails.find((m) => m.includes('Ủy thác hoàn thành')), 8000);
  ok('D nop du 10 linh thao -> xong viec, quy +1000, nguoi dang nhan thu kem do', !!doneD && (fundOf(L) || 0) === fundB + 1000 && !!mailD, 'fund=' + fundOf(L) + ' mail=' + !!mailD);
  // E: ủy thác thuê săn Kiếm Ma x2 (Thạch Lâm)
  P.socket.emit('board_post', { type: 'kill', monsterKind: 'kiemma', target: 2, pay: 900 });
  const comm2 = await waitFor(() => { const b = P.board; const c = (b?.commissions || []).find((x) => x.mine && x.type === 'kill' && !x.sectName); return c || null; }, 8000);
  ok('E1 dang uy thac thue san kiemma x2', !!comm2);
  if (comm2) {
    L.socket.emit('board_accept_comm', { id: comm2.id });
    await waitFor(() => (L.sect?.mySect?.quests || []).some((q) => q.key === 'comm:' + comm2.id), 8000);
    const fundE = fundOf(L) || 0;
    const kk = await killKind(L, 'kiemma', 2);
    const doneE = await waitFor(() => { const g = L.sect?.mySect; return g && !(g.quests || []).some((q) => q.key === 'comm:' + comm2.id) ? g : null; }, 30000);
    ok('E2 san du 2 kiemma -> xong, quy nhan ky quy 900', kk >= 2 && !!doneE && (fundOf(L) || 0) === fundE + 900, 'killed=' + kk + ' fund=' + fundOf(L) + ' want=' + (fundE + 900));
  }
  // F: việc NPC quyên góp (slot donate của ngày)
  const bF = await getBoard(L);
  const donateOffer = (bF?.offers || []).find((o) => o.type === 'donate');
  ok('F0 co viec quyen gop trong bang ngay', !!donateOffer, JSON.stringify((bF?.offers || []).map((o) => o.type)));
  if (donateOffer) {
    await flyToBoard(L);
    L.socket.emit('board_accept', { key: donateOffer.key });
    const actF = await waitFor(() => (L.sect?.mySect?.quests || []).some((q) => q.key === donateOffer.key), 8000);
    const fundF = fundOf(L) || 0; const uyF = uyOf(L) || 0;
    M.socket.emit('sect_donate', { stones: donateOffer.target });
    const doneF = await waitFor(() => { const g = L.sect?.mySect; return g && !(g.quests || []).some((q) => q.key === donateOffer.key) ? g : null; }, 10000);
    ok('F gop du -> xong viec quyen gop: quy net +300 (tien ra viec thien), Uy tang', !!actF && !!doneF && (fundOf(L) || 0) === fundF + 300 && (uyOf(L) || 0) > uyF, 'fund ' + fundF + '->' + fundOf(L) + ' uy ' + uyF + '->' + uyOf(L));
  }
  // G: việc Admin
  G.socket.emit('board_gm_post', { title: 'Thien Co test kiemma', type: 'kill', monsterKind: 'kiemma', target: 1, rewardFund: 5000, rewardUy: 50 });
  const gmComm = await waitFor(() => { const c = (G.board?.commissions || []).find((x) => x.gm); return c || null; }, 8000);
  ok('G1 Admin ghim viec', !!gmComm, JSON.stringify((G.board?.commissions || []).length));
  if (gmComm) {
    await flyToBoard(L);
    L.socket.emit('board_accept_comm', { id: gmComm.id });
    await waitFor(() => (L.sect?.mySect?.quests || []).some((q) => q.key === 'comm:' + gmComm.id), 8000);
    const fundG = fundOf(L) || 0; const uyG = uyOf(L) || 0;
    const kk = await killKind(L, 'kiemma', 1);
    const doneG = await waitFor(() => { const g = L.sect?.mySect; return g && !(g.quests || []).some((q) => q.key === 'comm:' + gmComm.id) ? g : null; }, 30000);
    ok('G2 xong viec Admin: quy +5000, Uy +50', kk >= 1 && !!doneG && (fundOf(L) || 0) === fundG + 5000 && (uyOf(L) || 0) === uyG + 50, 'fund ' + fundG + '->' + fundOf(L) + ' uy ' + uyG + '->' + uyOf(L) + ' killed=' + kk);
  }
  // H: hủy ủy thác chưa ai nhận -> hoàn ký quỹ
  const stonesH = (await waitFor(() => P.welcome?.character?.stones, 3000)) || null;
  P.socket.emit('board_post', { type: 'collect', itemId: 'thanh_thao', target: 5, pay: 500 });
  const comm3 = await waitFor(() => { const c = (P.board?.commissions || []).find((x) => x.mine && x.itemId === 'thanh_thao'); return c || null; }, 8000);
  ok('H1 dang them uy thac thanh thao', !!comm3);
  if (comm3) {
    P.socket.emit('board_cancel', { id: comm3.id });
    const gone = await waitFor(() => { const b = P.board; return b && !(b.commissions || []).some((x) => x.id === comm3.id) ? true : null; }, 8000);
    ok('H2 go uy thac chua ai nhan -> mat khoi bang', !!gone);
  }
  // I: đứng xa bảng -> đăng bị chặn
  P.socket.emit('fly_toggle', {}); await sleep(400);
  const t0 = Date.now();
  while (Date.now() - t0 < 15000) { const me = meOf(P); if (!me) break; const dx = 4000 - me.x, dy = 4000 - me.y; const d = Math.hypot(dx, dy); if (d <= 80) break; P.socket.emit('client_input', { vx: dx / d, vy: dy / d }); await sleep(110); }
  P.socket.emit('client_input', { vx: 0, vy: 0 }); P.socket.emit('fly_toggle', {}); await sleep(400);
  P.errors = [];
  P.socket.emit('board_post', { type: 'collect', itemId: 'linh_thao', target: 1, pay: 100 });
  const errFar = await waitFor(() => P.errors.find((e) => e.includes('tới Bảng Ủy Thác')), 8000);
  ok('I dung xa bang -> dang uy thac bi chan', !!errFar, P.errors.join(' | '));
  L.socket.disconnect(); M.socket.disconnect(); P.socket.disconnect(); G.socket.disconnect();
  await stopServer();
  console.log(`\n== p323: ${pass} PASS, ${fail} FAIL ==`);
  process.exit(fail ? 1 : 0);
})();
