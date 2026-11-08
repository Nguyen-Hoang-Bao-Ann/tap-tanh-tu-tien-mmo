// Probe GĐ345 (bản 2) — U Hồn Cảnh: cổng nghĩa địa cổ (chỉ Luyện Hồn), hồn tàng hình theo nhịp,
// Hồn Vương → lĩnh ngộ tuyệt kỹ Hồn (ĐƯỜNG DUY NHẤT — đã gỡ cấp bù GĐ343), F3 +5 điểm lần đầu 100%,
// F6 quà khí nhánh/quy đổi 500 LT, khóa ngày độc lập với Đối Ảnh Cảnh.
// Tiến trình đợt bám theo NOTICE của server (không bám trạng thái rỗng — bài học: killWave nuốt nhiều đợt).
// Thiết kế: THIET_KE_PHAN_THUONG_AN.md §4.3/§7 đợt 3 (Bảo duyệt 08/11).
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
let serverProc = null, killTimer = null, CUR_PORT = 0;
async function startServer(port, tag) {
  CUR_PORT = port;
  if (!(await portFree(port))) throw new Error('port ban ' + port);
  const env = { ...process.env, PORT: String(port), TTT_STORAGE: 'file', TTT_CHAR_FILE: path.join(DIR, 'characters.json'), TTT_ACC_FILE: path.join(DIR, 'accounts.json'), TTT_WORLD_FILE: path.join(DIR, 'world.json'), TTT_SESS_FILE: path.join(DIR, 'sessions.json'), TTT_DAY_REAL_MS: '600000', TTT_TUVI_NEED: '5' };
  serverProc = spawn('node', ['server/index.js'], { cwd: ROOT, env, stdio: ['ignore', 'pipe', 'pipe'] });
  serverProc.stderr.on('data', (d) => { try { fs.appendFileSync(path.join(DIR, 'srv_' + tag + '.log'), d); } catch (e) {} });
  serverProc.stdout.on('data', (d) => { try { fs.appendFileSync(path.join(DIR, 'srv_' + tag + '.log'), d); } catch (e) {} });
  killTimer = setTimeout(() => { try { serverProc.kill('SIGKILL'); } catch (e) {} }, 480000);
  const t0 = Date.now();
  while (Date.now() - t0 < 45000) { try { const r = await fetch(`http://127.0.0.1:${port}/api/status`); if (r.ok) { clearTimeout(killTimer); return; } } catch (e) {} await sleep(500); }
  throw new Error('server khong len');
}
async function stopServer() { if (!serverProc) return; const p = serverProc; serverProc = null; await new Promise((res) => { const t = setTimeout(() => { try { p.kill('SIGKILL'); } catch (e) {} res(); }, 4000); p.once('exit', () => { clearTimeout(t); res(); }); try { p.kill('SIGTERM'); } catch (e) { clearTimeout(t); res(); } }); const t0 = Date.now(); while (Date.now() - t0 < 10000 && !(await portFree(CUR_PORT))) await sleep(300); }
const LC1 = { elements: ['kim'], main: 'kim', count: 1, mutations: [] };
const AN = (vm, lh, nd, extra) => Object.assign({ lkDays: 0, kdDays: 0, lkLastDay: -1, kdLastDay: -1, vienman: !!vm, luyenHon: !!lh, nhapDao: !!nd }, extra || {});
function BASE(token, name, extra) {
  return Object.assign({ token, name, classId: 'kiemtu', gender: 'nam', race: null, geo175: 1, realm: 'lk', tier: 9, x: 700, y: 480, mapId: 'lang_tan_thu', hp: 99999, lifespan: 500, birthDay: -5660, ageStart: 16, stats: { khiHuyet: 8000, vatCong: 400, vatPhong: 250, phapCong: 400, phapPhong: 250, tocDo: 60, minhMan: 100 }, statPoints: 0, freePoints: 0, tuVi: 99999, stones: 0, stonesTrung: 0, stonesThuong: 0, stonesCuc: 0, inventory: {}, gearBag: {}, equipped: [], skills: [], job: null, job2: null, job3: null, linhCan: { ...LC1 }, affinity: {}, affV2: 1, bonds: {}, quests: {}, questsDone: {}, flags: {}, counters: {}, disciples: [], foundInvites: [], reformIn: [], sectTech: [], sectArts: [], sectArtsActive: [], mails: [], classRes: {}, food: 100, water: 100, branch: null, branchQi: 0, anState: AN(1, 1, 0) }, extra || {});
}
let pass = 0, fail = 0;
function ok(name, cond, extra) { if (cond) { pass++; console.log('PASS | ' + name); } else { fail++; console.log('FAIL | ' + name + (extra ? ' | ' + extra : '')); } }
function note(name, extra) { console.log('NOTE | ' + name + (extra ? ' | ' + extra : '')); }
function connect(token) {
  const socket = io(`http://127.0.0.1:${CUR_PORT}`, { transports: ['websocket'] });
  const ctx = { socket, merger: createMerger(), state: null, welcome: null, notices: [], sync: null, errors: [], mapEnters: [] };
  socket.on('connect', () => socket.emit('hello', { token }));
  socket.on('welcome', (w) => { ctx.welcome = w; ctx.myName = (w.character || {}).name; });
  socket.on('notice', (n) => ctx.notices.push(n.text || ''));
  socket.on('char_sync', (sy) => { ctx.sync = sy; });
  socket.on('server_tick', (t) => { const st = ctx.merger(t); if (st) ctx.state = st; });
  socket.on('interact_error', (e) => ctx.errors.push(e.message || ''));
  socket.on('map_enter', (d) => ctx.mapEnters.push(d));
  return ctx;
}
function writeChars(chars) {
  fs.writeFileSync(path.join(DIR, 'characters.json'), JSON.stringify(chars, null, 1));
  fs.writeFileSync(path.join(DIR, 'accounts.json'), JSON.stringify({}, null, 1));
  for (const f of ['world.json', 'sessions.json']) { try { fs.unlinkSync(path.join(DIR, f)); } catch (e) {} }
}
const meOf = (c) => (c.state?.players || []).find((p) => p.name === c.myName) || null;
const monsOf = (c) => c.state?.monsters || [];
const myChar = (c) => (c.sync && typeof c.sync.hp === 'number' ? c.sync : null) || (c.welcome && c.welcome.character) || {};
const ghosts = (c) => monsOf(c).filter((m) => m.trial === 'uhon');
const skillIds = (c) => (myChar(c).skills || []).map((s) => (typeof s === 'string' ? s : s.id));
async function walkTo(c, x, y, tol, ms) {
  const t0 = Date.now();
  while (Date.now() - t0 < (ms || 20000)) { const me = meOf(c); if (!me) { await sleep(120); continue; } const dx = x - me.x, dy = y - me.y; const d = Math.hypot(dx, dy); if (d <= (tol || 45)) break; c.socket.emit('client_input', { vx: dx / d, vy: dy / d }); await sleep(110); }
  c.socket.emit('client_input', { vx: 0, vy: 0 });
}
// Đánh tới khi notice chứa `marker` xuất hiện (notice tính từ mốc bắt đầu gọi)
async function killUntilNotice(c, marker, timeoutMs) {
  const start = c.notices.length;
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    if (c.notices.slice(start).some((n) => n.includes(marker))) return true;
    const alive = ghosts(c).filter((m) => m.hp > 0 && !m.hidden);
    const me = meOf(c);
    if (!alive.length || !me) { await sleep(350); continue; }
    const t = alive.sort((a, b) => Math.hypot(a.x - me.x, a.y - me.y) - Math.hypot(b.x - me.x, b.y - me.y))[0];
    const d = Math.hypot(t.x - me.x, t.y - me.y);
    if (d > 55) await walkTo(c, t.x, t.y, 40, 6000);
    c.socket.emit('player_attack');
    await sleep(620);
  }
  return c.notices.slice(start).some((n) => n.includes(marker));
}
async function enterUHon(c, label) {
  c.socket.emit('an_gate_enter', { canh: 'uhon' });
  const inC = await waitFor(() => c.mapEnters.some((d) => d.mapId === 'u_hon_canh'), 8000);
  ok(label + ': vào được U Hồn Cảnh', !!inC, JSON.stringify(c.mapEnters.map((d) => d.mapId)));
  const w1 = await waitFor(() => ghosts(c).length >= 4, 15000);
  ok(label + ': đợt 1 có 4 Du Hồn', !!w1, 'count=' + ghosts(c).length);
  ok(label + ': dọn đợt 1 → 33%', await killUntilNotice(c, 'Qua đợt 1 (33%)', 120000), JSON.stringify(c.notices.slice(-3)));
}
(async () => {
  const TKD = 'p345tokenD123456', TKE = 'p345tokenE123456', TKF = 'p345tokenF123456', TKG = 'p345tokenG123456', TKH = 'p345tokenH123456';
  writeChars({
    [TKD]: BASE(TKD, 'P345 QuyD'),
    [TKE]: BASE(TKE, 'P345 TienE', { branch: { side: 'tien', source: 'hidden' }, branchQi: 40 }),
    [TKF]: BASE(TKF, 'P345 VmF', { anState: AN(1, 0, 0) }),
    // G: đã dùng U Hồn hôm nay (preset ngày 0) đứng ở cổng Đối Ảnh — kiểm khóa độc lập chiều 1
    [TKG]: BASE(TKG, 'P345 KhoaG', { x: 1140, y: 2050, anState: AN(1, 1, 0, { uHonDay: 0, uHonBest: 100 }) }),
    // H: đã dùng Đối Ảnh hôm nay (preset ngày 0) đứng ở cổng U Hồn — kiểm khóa độc lập chiều 2
    [TKH]: BASE(TKH, 'P345 KhoaH', { anState: AN(1, 1, 0, { doiAnhDay: 0, doiAnhBest: 66 }) }),
  });
  await startServer(3645, 'p345');
  try {
    // ---------- Chân F: chưa Luyện Hồn → cổng U Hồn không mở ----------
    const cF = connect(TKF);
    await waitFor(() => cF.welcome, 15000);
    await waitFor(() => meOf(cF), 15000);
    cF.socket.emit('an_gate_enter', { canh: 'uhon' });
    const errF = await waitFor(() => cF.errors.find((e) => e.includes('im lìm')), 6000);
    ok('F: chưa Luyện Hồn bị cổng U Hồn từ chối', !!errF, JSON.stringify(cF.errors));
    cF.socket.disconnect();

    // ---------- Chân G/H: khóa ngày của 2 cảnh ĐỘC LẬP ----------
    const cG = connect(TKG);
    await waitFor(() => cG.welcome, 15000);
    await waitFor(() => meOf(cG), 15000);
    cG.socket.emit('an_gate_enter', { canh: 'doianh' });
    const inG = await waitFor(() => cG.mapEnters.some((d) => d.mapId === 'doi_anh_canh'), 8000);
    ok('G: đã dùng U Hồn hôm nay vẫn vào được Đối Ảnh (khóa độc lập)', !!inG, JSON.stringify(cG.errors));
    cG.socket.disconnect();
    const cH = connect(TKH);
    await waitFor(() => cH.welcome, 15000);
    await waitFor(() => meOf(cH), 15000);
    cH.socket.emit('an_gate_enter', { canh: 'uhon' });
    const inH = await waitFor(() => cH.mapEnters.some((d) => d.mapId === 'u_hon_canh'), 8000);
    ok('H: đã dùng Đối Ảnh hôm nay vẫn vào được U Hồn (khóa độc lập)', !!inH, JSON.stringify(cH.errors));
    cH.socket.disconnect();

    // ---------- Chân D: Luyện Hồn, chưa chọn phe ----------
    const cD = connect(TKD);
    await waitFor(() => cD.welcome, 15000);
    await waitFor(() => meOf(cD), 15000);
    await sleep(1500);
    ok('D: đăng nhập KHÔNG còn được cấp bù tuyệt kỹ Hồn (đã gỡ đường GĐ343)', !skillIds(cD).some((id) => String(id).startsWith('lh_')), JSON.stringify(skillIds(cD)));
    const homeEnter = cD.mapEnters.find((d) => d.mapId === 'lang_tan_thu');
    ok('D: payload map nhà có cổng uhon', !!(homeEnter && (homeEnter.anGates || []).some((g) => g.canh === 'uhon')), JSON.stringify(homeEnter?.anGates));
    await enterUHon(cD, 'D');
    // Đợt 2: chờ spawn, chạy xa đàn hồn rồi lấy mẫu cờ hidden qua tick (hồn ẩn bị đóng băng khi xa người >130px)
    const w2notice = await waitFor(() => cD.notices.find((n) => n.includes('Đợt 2 — ảo ảnh hiện hình')), 15000);
    ok('D: đợt 2 hiện hình', !!w2notice, JSON.stringify(cD.notices.slice(-3)));
    const w2 = await waitFor(() => ghosts(cD).length >= 5, 8000);
    ok('D: đợt 2 có 5 Du Hồn', !!w2, 'count=' + ghosts(cD).length);
    const meD = meOf(cD);
    if (meD) await walkTo(cD, meD.x, Math.max(120, meD.y - 700), 80, 12000);
    let sawHidden = false, sawVisible = false; const hidSamples = [];
    for (let i = 0; i < 44; i++) { const gs = ghosts(cD); hidSamples.push(gs.map((g) => g.hidden || 0).join('')); if (gs.some((g) => g.hidden)) sawHidden = true; if (gs.some((g) => !g.hidden)) sawVisible = true; await sleep(280); }
    note('D: mẫu cờ hidden đợt 2', hidSamples.filter((v, i, a) => i === 0 || v !== a[i - 1]).join(' → '));
    ok('D: hồn đợt 2 tàng hình theo nhịp (có lúc ẩn, có lúc hiện)', sawHidden && sawVisible, 'sawHidden=' + sawHidden + ' sawVisible=' + sawVisible);
    ok('D: dọn đợt 2 → 66%', await killUntilNotice(cD, 'Qua đợt 2 (66%)', 150000), JSON.stringify(cD.notices.slice(-3)));
    const boss = await waitFor(() => ghosts(cD).find((m) => m.name === 'Hồn Vương'), 20000);
    ok('D: Hồn Vương hiện hình', !!boss, 'mons=' + ghosts(cD).map((m) => m.name).join(','));
    if (boss) note('D: Hồn Vương HP', 'maxHp=' + boss.maxHp);
    ok('D: hạ Hồn Vương → hoàn thành 100%', await killUntilNotice(cD, 'HOÀN THÀNH 100%', 150000), JSON.stringify(cD.notices.slice(-4)));
    const learn = cD.notices.find((n) => n.includes('Lĩnh ngộ tuyệt kỹ Hồn'));
    ok('D: hạ Hồn Vương → lĩnh ngộ tuyệt kỹ Hồn', !!learn, JSON.stringify(cD.notices.slice(-5)));
    await waitFor(() => skillIds(cD).includes('lh_kiem-tu'), 8000);
    ok('D: Sổ có lh_kiem-tu sau lĩnh ngộ', skillIds(cD).includes('lh_kiem-tu'), JSON.stringify(skillIds(cD)));
    const stD = myChar(cD).anState || {};
    ok('D: honKingDown=true + uHonBest=100 + uHonFirst=true', stD.honKingDown === true && stD.uHonBest === 100 && stD.uHonFirst === true, JSON.stringify(stD));
    ok('D: quà 100% + F6 quy đổi (chưa chọn phe) = 2.500 LT Hạ', (myChar(cD).stones || 0) === 2500, 'stones=' + myChar(cD).stones);
    ok('D: F3 lần đầu 100% → +5 điểm chỉ số tự do', (myChar(cD).freePoints || 0) === 5, 'freePoints=' + myChar(cD).freePoints);
    const ce = cD.mapEnters.find((d) => d.mapId === 'u_hon_canh');
    const portal = (ce && ce.portal) || { x: 1312, y: 1837 };
    await walkTo(cD, portal.x, portal.y, 60, 15000);
    cD.socket.emit('an_gate_exit');
    await waitFor(() => cD.mapEnters[cD.mapEnters.length - 1]?.mapId === 'lang_tan_thu', 8000);
    const meD2 = meOf(cD);
    if (meD2) await walkTo(cD, 700, 430, 60, 15000);
    const errND = cD.errors.length;
    cD.socket.emit('an_gate_enter', { canh: 'uhon' });
    const lockD = await waitFor(() => cD.errors.slice(errND).find((e) => e.includes('chỉ mở 1 lần mỗi ngày')), 6000);
    ok('D: vào lại U Hồn cùng ngày bị khóa', !!lockD, JSON.stringify(cD.errors.slice(errND)));
    cD.socket.disconnect();

    // ---------- Chân E: đã chọn phe Tiên — +100 Khí Tiên, không quy đổi ----------
    const cE = connect(TKE);
    await waitFor(() => cE.welcome, 15000);
    await waitFor(() => meOf(cE), 15000);
    ok('E: fixture nhánh Tiên sẵn sàng (branchQi=40)', (myChar(cE).branchQi || 0) === 40, 'branchQi=' + myChar(cE).branchQi);
    await enterUHon(cE, 'E');
    ok('E: dọn đợt 2 → 66%', await killUntilNotice(cE, 'Qua đợt 2 (66%)', 150000), JSON.stringify(cE.notices.slice(-3)));
    const bossE = await waitFor(() => ghosts(cE).find((m) => m.name === 'Hồn Vương'), 20000);
    ok('E: Hồn Vương hiện hình', !!bossE, 'mons=' + ghosts(cE).map((m) => m.name).join(','));
    ok('E: hạ Hồn Vương → 100%', await killUntilNotice(cE, 'HOÀN THÀNH 100%', 150000), JSON.stringify(cE.notices.slice(-4)));
    await waitFor(() => (myChar(cE).anState || {}).uHonBest === 100, 8000);
    ok('E: F6 có nhánh → +100 Khí Tiên (40 → 140)', (myChar(cE).branchQi || 0) === 140, 'branchQi=' + myChar(cE).branchQi);
    ok('E: stones chỉ +2.000 (không quy đổi 500)', (myChar(cE).stones || 0) === 2000, 'stones=' + myChar(cE).stones);
    cE.socket.disconnect();
  } finally {
    await stopServer();
  }
  console.log(`\nKẾT QUẢ GĐ345: ${pass} PASS / ${fail} FAIL`);
  process.exit(fail ? 1 : 0);
})().catch(async (e) => { console.error('PROBE CRASH', e); await stopServer(); process.exit(2); });
