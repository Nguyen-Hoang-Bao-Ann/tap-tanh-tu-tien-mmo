// GĐ319 probe: KHAI TÔNG QUA QUẦY QUẢN LÝ — 3 bài kiểm tra + Thiếp Đồng Sáng Lập + phí TP
// + trụ sở/bia + 7 công trình + phòng ban/tầng đệ tử + kho theo tầng + Dược Viên tông + thiền Luyện Công Trường.
process.env.NODE_PATH = process.env.HOME + '/workspace/tap-tanh-tu-tien-mmo/client/node_modules';
require('module').Module._initPaths();
const fs = require('fs'); const path = require('path'); const http = require('http');
const { spawn } = require('child_process'); const net = require('net');
const { io } = require('socket.io-client');
const { createMerger } = require(process.env.HOME + '/workspace/tap-tanh-tu-tien-mmo/client/worldmerge.cjs');
const DIR = __dirname; const PORT = 3546;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
function portFree(port) { return new Promise((res) => { const s = net.createServer(); s.once('error', () => res(false)); s.once('listening', () => s.close(() => res(true))); s.listen(port, '127.0.0.1'); }); }
function waitStatus(tries = 90) { return new Promise((resolve, reject) => { let n = 0; const tick = () => { const req = http.get({ host: '127.0.0.1', port: PORT, path: '/api/status', timeout: 1500 }, (r) => { let b = ''; r.on('data', (c) => b += c); r.on('end', () => { try { resolve(JSON.parse(b)); } catch { again(); } }); }); req.on('error', again); req.on('timeout', () => { req.destroy(); again(); }); }; const again = () => { if (++n >= tries) reject(new Error('server khong len')); else setTimeout(tick, 700); }; tick(); }); }
let serverProc = null;
async function startServer() {
  if (!await portFree(PORT)) throw new Error('port ban');
  const env = { ...process.env, PORT: String(PORT), TTT_STORAGE: 'file', TTT_CHAR_FILE: path.join(DIR, 'characters.json'), TTT_WORLD_FILE: path.join(DIR, 'world.json'), TTT_SESS_FILE: path.join(DIR, 'sessions.json'), TTT_ACC_FILE: path.join(DIR, 'accounts.json'), TTT_DAY_REAL_MS: '600000', TTT_TUVI_NEED: '5' };
  serverProc = spawn('node', ['server/index.js'], { cwd: process.env.HOME + '/workspace/tap-tanh-tu-tien-mmo', env, stdio: ['ignore', 'pipe', 'pipe'] });
  let killTimer = setTimeout(() => { try { serverProc.kill('SIGKILL'); } catch {} }, 60000);
  serverProc.on('exit', () => clearTimeout(killTimer));
  await waitStatus(); clearTimeout(killTimer);
}
async function stopServer() {
  if (!serverProc) return; const p = serverProc; serverProc = null;
  await new Promise((res) => { const t = setTimeout(() => { try { p.kill('SIGKILL'); } catch {} res(); }, 5000); p.once('exit', () => { clearTimeout(t); res(); }); try { p.kill('SIGTERM'); } catch { clearTimeout(t); res(); } });
  for (let i = 0; i < 40; i++) { if (await portFree(PORT)) return; await sleep(250); }
}
function connect(token) {
  return new Promise((resolve, reject) => {
    const socket = io('http://127.0.0.1:' + PORT, { transports: ['websocket'], reconnection: false });
    const c = { socket, merger: createMerger(), notices: [], syncs: [], errors: [], sectStates: [], dialogs: [], hqs: null };
    socket.on('connect', () => socket.emit('hello', { token }));
    socket.on('welcome', (d) => { c.welcome = d; resolve(c); });
    socket.on('need_character', () => { c.needChar = true; resolve(c); });
    socket.on('server_tick', (t) => { try { c.state = c.merger(t); } catch {} });
    socket.on('notice', (d) => c.notices.push(d.text || ''));
    socket.on('char_sync', (d) => c.syncs.push(d.character || d));
    socket.on('interact_error', (d) => c.errors.push(d.message || ''));
    socket.on('error_msg', (d) => c.errors.push(d.text || ''));
    socket.on('sect_state', (d) => c.sectStates.push(d));
    socket.on('npc_dialog', (d) => c.dialogs.push(d));
    socket.on('sect_hqs', (d) => { c.hqs = d.list; });
    setTimeout(() => reject(new Error('connect timeout')), 15000);
  });
}
const lastSync = (c) => c.syncs[c.syncs.length - 1] || c.welcome?.character;
const lastSect = (c) => c.sectStates[c.sectStates.length - 1] || null;
async function waitFor(fn, ms = 10000, step = 200) { const t0 = Date.now(); while (Date.now() - t0 < ms) { const v = fn(); if (v) return v; await sleep(step); } return null; }
function myPlayer(c) { return c.state?.players?.find((p) => p.id === c.welcome?.id) || null; }
let pass = 0, fail = 0;
function ok(name, cond, extra = '') { if (cond) { pass++; console.log('PASS | ' + name); } else { fail++; console.log('FAIL | ' + name + ' | ' + extra); } }
function steer(c, tx, ty) { const me = myPlayer(c); if (!me) return; const dx = tx - me.x, dy = ty - me.y; const d = Math.hypot(dx, dy) || 1; c.socket.emit('client_input', { vx: dx / d, vy: dy / d }); }
function halt(c) { c.socket.emit('client_input', { vx: 0, vy: 0 }); }
async function goTo(c, tx, ty, tol = 45, ms = 30000) { const t0 = Date.now(); while (Date.now() - t0 < ms) { const me = myPlayer(c); if (!me) { await sleep(200); continue; } if (Math.hypot(me.x - tx, me.y - ty) <= tol) { halt(c); return true; } steer(c, tx, ty); await sleep(200); } halt(c); return false; }
async function killTrialBoss(c, kind, ms = 160000) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    if (lastSync(c)?.foundTestPassed) { halt(c); return true; }
    const boss = (c.state?.monsters || []).find((m) => m.trial === kind);
    const me = myPlayer(c);
    if (!boss || !me) { await sleep(250); continue; }
    if (Math.hypot(me.x - boss.x, me.y - boss.y) > 55) steer(c, boss.x, boss.y);
    else { halt(c); c.socket.emit('player_attack'); }
    await sleep(220);
  }
  return !!lastSync(c)?.foundTestPassed;
}
const STRONG = { khiHuyet: 300, vatCong: 400, vatPhong: 200, phapCong: 50, phapPhong: 100, tocDo: 50, minhMan: 50 };
const BASE = (token, name, over = {}) => ({ token, name, classId: 'kiemtu', gender: 'nam', robe: '#3a6ea5', weaponId: 'kiem', realm: 'lk', tier: 1, tuVi: 100, hp: 99999, mp: 9999, x: 1252, y: 880, mapId: 'lang_tan_thu', stats: { khiHuyet: 30, vatCong: 30, vatPhong: 25, phapCong: 10, phapPhong: 20, tocDo: 20, minhMan: 20 }, statPoints: 0, freePoints: 10, inventory: {}, stones: 0, skills: [], skillMastery: {}, counters: {}, achClaimed: [], geo175: 1, gearBag: {}, equipped: [], ageStart: 16, birthDay: 0, lifespan: 100, affV2: 1, linhCan: { main: 'kim', subs: [], purity: 40, quality: 'trung', elements: { kim: 40 }, mutations: [] }, ...over });
const QS = { x: 1252, y: 872 };
function patchChars(fn) { const f = path.join(DIR, 'characters.json'); const st = JSON.parse(fs.readFileSync(f, 'utf8')); fn(st); fs.writeFileSync(f, JSON.stringify(st)); }
(async () => {
  for (const f of ['characters.json', 'world.json', 'sessions.json', 'accounts.json']) { try { fs.unlinkSync(path.join(DIR, f)); } catch {} }
  const store = {
    p3190a01: BASE('p3190a01', 'Lanh Chu A', { realm: 'na', tier: 1, x: QS.x, y: QS.y + 8, stats: STRONG, hp: 3100, stonesTrung: 100000, inventory: { linh_thao: 3 } }),
    p3190b01: BASE('p3190b01', 'De Tu B', { x: QS.x - 50, y: QS.y + 30, stones: 5000 }),
    p3190c01: BASE('p3190c01', 'De Tu C', { x: QS.x + 50, y: QS.y + 30, inventory: { linh_thao: 3 } }),
    p3190d01: BASE('p3190d01', 'De Tu D', { x: QS.x - 90, y: QS.y + 60 }),
    p3190e01: BASE('p3190e01', 'De Tu E', { x: QS.x + 90, y: QS.y + 60 }),
    p3190f01: BASE('p3190f01', 'De Tu F', { x: QS.x, y: QS.y + 100 }),
    p3190g01: BASE('p3190g01', 'Khach G', { x: QS.x + 120, y: QS.y + 100 }),
    p3190h01: BASE('p3190h01', 'Doc Hanh H', { realm: 'na', tier: 1, x: QS.x - 120, y: QS.y - 20, stats: STRONG, hp: 3100, stonesTrung: 100000 }),
    p3190k01: BASE('p3190k01', 'Thieu Canh K', { realm: 'kd', tier: 1, x: QS.x + 120, y: QS.y - 20 }),
  };
  fs.writeFileSync(path.join(DIR, 'characters.json'), JSON.stringify(store));
  fs.writeFileSync(path.join(DIR, 'world.json'), JSON.stringify({ totalMinutes: 480, savedAt: Date.now(), sects: [] }));
  await startServer();
  try {
    // ===== BOOT 1: tai lang — cac bai kiem tra + dang ky =====
    const A = await connect('p3190a01'); const B = await connect('p3190b01'); const C = await connect('p3190c01');
    const D = await connect('p3190d01'); const E = await connect('p3190e01'); const F = await connect('p3190f01');
    const G = await connect('p3190g01'); const H = await connect('p3190h01'); const K = await connect('p3190k01');
    await waitFor(() => myPlayer(A), 8000);
    // K: thieu canh -> cac cong deu chan
    K.socket.emit('sect_found_fight');
    const kErr1 = await waitFor(() => K.errors.find((e) => e.includes('Nguyên Anh')), 6000);
    ok('K1 kd thi khao hach bi chan (can Nguyen Anh)', !!kErr1, K.errors.join(' / '));
    K.socket.emit('sect_create', { name: 'Tong Gia Mao' });
    const kErr2 = await waitFor(() => K.errors.find((e) => e.includes('Quầy Quản Lý')), 6000);
    ok('K2 lap tong truc tiep bi chuyen huong ve Quay Quan Ly', !!kErr2, K.errors.join(' / '));
    // A: xem quy trinh o Quay
    A.socket.emit('talk_npc', { npcId: 'npc_quansu' });
    const dlg = await waitFor(() => A.dialogs.find((d) => d.npcId === 'npc_quansu'), 8000);
    ok('A1 dialog Quan Su co sectFoundInfo (realmOk, phi solo 70000, chua dang ky duoc)', !!dlg && dlg.sectFoundInfo && dlg.sectFoundInfo.realmOk === true && dlg.sectFoundInfo.feeNow === 70000 && dlg.sectFoundInfo.canRegister === false, JSON.stringify(dlg && dlg.sectFoundInfo));
    // A: thi + thang Khao Quan Anh
    A.socket.emit('sect_found_fight');
    const bossUp = await waitFor(() => (A.state?.monsters || []).find((m) => m.trial === 'khaquan'), 8000);
    ok('A2 Khao Quan Anh xuat hien', !!bossUp);
    const won = await killTrialBoss(A, 'khaquan');
    ok('A3 A thang Khao Quan Anh -> foundTestPassed', won);
    // Thiep: moi B..F; F tu choi lan dau roi dong y lai
    for (const [c, nm] of [[B, 'De Tu B'], [C, 'De Tu C'], [D, 'De Tu D'], [E, 'De Tu E'], [F, 'De Tu F']]) {
      A.socket.emit('sect_found_invite', { name: nm });
      const got = await waitFor(() => (lastSync(c)?.foundInvites || []).some((v) => v.fromKey === 'p3190a01'), 8000);
      if (!got) { ok('thiep toi ' + nm, false, 'khong thay foundInvites'); }
    }
    for (const c of [B, C, D, E]) c.socket.emit('sect_found_respond', { fromKey: 'p3190a01', accept: true });
    F.socket.emit('sect_found_respond', { fromKey: 'p3190a01', accept: false });
    const four = await waitFor(() => (lastSync(A)?.foundSlip?.count || 0) >= 4, 8000);
    ok('A4 4 nguoi dong y -> slip count 4', !!four, JSON.stringify(lastSync(A)?.foundSlip));
    A.socket.emit('sect_found_invite', { name: 'De Tu F' });
    await waitFor(() => (lastSync(F)?.foundInvites || []).some((v) => v.fromKey === 'p3190a01'), 8000);
    F.socket.emit('sect_found_respond', { fromKey: 'p3190a01', accept: true });
    const five = await waitFor(() => (lastSync(A)?.foundSlip?.count || 0) >= 5, 8000);
    ok('A5 F doi y dong y -> du 5 nguoi', !!five, JSON.stringify(lastSync(A)?.foundSlip));
    // G: dong y cho H roi RUT
    H.socket.emit('sect_found_invite', { name: 'Khach G' });
    await waitFor(() => (lastSync(G)?.foundInvites || []).some((v) => v.fromKey === 'p3190h01'), 8000);
    G.socket.emit('sect_found_respond', { fromKey: 'p3190h01', accept: true });
    await waitFor(() => (lastSync(H)?.foundSlip?.count || 0) >= 1, 8000);
    G.socket.emit('sect_found_withdraw');
    const withdrawn = await waitFor(() => (lastSync(H)?.foundSlip?.count || 0) === 0 && !lastSync(G)?.foundSlipFor, 8000);
    ok('G1 G rut dong y -> H mat moc (slip 0)', !!withdrawn, JSON.stringify(lastSync(H)?.foundSlip));
    // A dang ky: phi nhom 30000 (phai dung tai Quay — quay lai cho Quan Su truoc)
    await goTo(A, QS.x, QS.y + 8, 40, 20000);
    A.socket.emit('sect_found_register', { name: 'Thien Kiem Tong' });
    const regA = await waitFor(() => { const s = lastSect(A); return s && s.mySect && s.mySect.name === 'Thien Kiem Tong' ? s : null; }, 10000);
    ok('A6 A dang ky thanh cong (tong 6 thanh vien)', !!regA && regA.mySect.members.length === 6, JSON.stringify(regA && regA.mySect && regA.mySect.members.length));
    ok('A7 phi nhom 30000 TP (100000 -> 70000)', (lastSync(A)?.stonesTrung || 0) === 70000, 'stonesTrung=' + lastSync(A)?.stonesTrung);
    ok('A8 nhan Lenh Bai + Tran Phap', (lastSync(A)?.inventory?.lenh_bai_tong_mon || 0) >= 1 && (lastSync(A)?.inventory?.tran_phap_khai_son || 0) >= 1, JSON.stringify(lastSync(A)?.inventory));
    const bSect = await waitFor(() => { const s = lastSect(B); return s && s.mySect ? s : null; }, 8000);
    ok('A9 B tu thanh vien SANG LAP', !!bSect && bSect.mySect.members.find((m) => m.token === 'p3190b01')?.founder === true, JSON.stringify(bSect && bSect.mySect));
    // H: thi + dang ky SOLO phi 70000
    H.socket.emit('sect_found_fight');
    await waitFor(() => (H.state?.monsters || []).find((m) => m.trial === 'khaquan'), 8000);
    const wonH = await killTrialBoss(H, 'khaquan');
    ok('H1 H thang Khao Quan Anh', wonH);
    await goTo(H, QS.x - 60, QS.y, 40, 20000);
    H.socket.emit('sect_found_register', { name: 'Doc Hanh Tong' });
    const regH = await waitFor(() => { const s = lastSect(H); return s && s.mySect && s.mySect.name === 'Doc Hanh Tong' ? s : null; }, 10000);
    ok('H2 H dang ky solo (1 thanh vien)', !!regH && regH.mySect.members.length === 1);
    ok('H3 phi solo 70000 TP (100000 -> 30000)', (lastSync(H)?.stonesTrung || 0) === 30000, 'stonesTrung=' + lastSync(H)?.stonesTrung);
    // H dung Tran Phap khi chua co bia -> chan
    H.socket.emit('use_item', { itemId: 'tran_phap_khai_son' });
    const hErr = await waitFor(() => H.errors.find((e) => e.includes('Chưa có trụ sở')), 6000);
    ok('H4 Tran Phap chua co bia bi chan', !!hErr, H.errors.join(' / '));
    // A dung Lenh Bai ngay tai lang -> chan
    A.socket.emit('use_item', { itemId: 'lenh_bai_tong_mon' });
    const aErr = await waitFor(() => A.errors.find((e) => e.includes('trong làng')), 6000);
    ok('A10 Lenh Bai tai lang bi chan', !!aErr, A.errors.join(' / '));
    for (const c of [A, B, C, D, E, F, G, H, K]) c.socket.disconnect();
    await sleep(800);
    await stopServer();
    // ===== BOOT 2: A ra map farm dat tru so =====
    patchChars((st) => { st.p3190a01.mapId = 'huyet_sac_rung'; st.p3190a01.x = 4248; st.p3190a01.y = 6223; });
    await startServer();
    const A2 = await connect('p3190a01');
    await waitFor(() => myPlayer(A2), 8000);
    A2.socket.emit('fly_toggle');
    await sleep(600);
    await goTo(A2, 4248, 6123, 40, 20000);
    A2.socket.emit('use_item', { itemId: 'lenh_bai_tong_mon' });
    const pErr = await waitFor(() => A2.errors.find((e) => e.includes('cổng dịch chuyển')), 6000);
    ok('B1 dat bia sat cong map bi chan', !!pErr, A2.errors.join(' / '));
    await goTo(A2, 4248, 5523, 40, 25000);
    A2.socket.emit('use_item', { itemId: 'lenh_bai_tong_mon' });
    const hqOk = await waitFor(() => { const s = lastSect(A2); return s && s.mySect && s.mySect.hq ? s : null; }, 10000);
    ok('B2 dat bia thanh cong (hq co toa do)', !!hqOk, JSON.stringify(hqOk && hqOk.mySect && hqOk.mySect.hq));
    ok('B3 sect_hqs phat toi client', !!A2.hqs && A2.hqs.some((h) => h.name === 'Thien Kiem Tong'));
    A2.socket.emit('use_item', { itemId: 'tran_phap_khai_son' });
    const built = await waitFor(() => { const s = lastSect(A2); return s && s.mySect && (s.mySect.buildings || []).length === 7 ? s : null; }, 10000);
    ok('B4 Tran Phap dung du 7 cong trinh', !!built, JSON.stringify(built && built.mySect && built.mySect.buildings));
    const bmap = {}; for (const b of built.mySect.buildings) bmap[b.kind] = b;
    fs.writeFileSync(path.join(DIR, 'buildings.json'), JSON.stringify(bmap));
    A2.socket.disconnect();
    await sleep(800);
    await stopServer();
    // ===== BOOT 3: vuon tong + kho + chuc vu (B, C tai Duoc Vien) =====
    const bv = bmap.duocvien, lc = bmap.luyencong;
    patchChars((st) => {
      st.p3190b01.mapId = 'huyet_sac_rung'; st.p3190b01.x = bv.x; st.p3190b01.y = bv.y;
      st.p3190c01.mapId = 'huyet_sac_rung'; st.p3190c01.x = bv.x + 30; st.p3190c01.y = bv.y;
      st.p3190a01.x = lc.x; st.p3190a01.y = lc.y;
    });
    await startServer();
    const A3 = await connect('p3190a01'); const B3 = await connect('p3190b01'); const C3 = await connect('p3190c01'); const E3 = await connect('p3190e01');
    await waitFor(() => myPlayer(B3), 8000);
    // Kho: B la Ngoai Mon (contrib 0) -> lay bi chan; gui thi duoc
    A3.socket.emit('sect_store_put', { itemId: 'linh_thao', qty: 1 });
    await waitFor(() => { const s = lastSect(B3); return s && s.mySect && (s.mySect.warehouse || []).length >= 1 ? s : null; }, 8000);
    B3.socket.emit('sect_store_take', { itemId: 'linh_thao', qty: 1 });
    const wErr = await waitFor(() => B3.errors.find((e) => e.includes('Ngoại Môn')), 6000);
    ok('C1 Ngoai Mon lay kho bi chan', !!wErr, B3.errors.join(' / '));
    B3.socket.emit('sect_donate', { stones: 1000 });
    const noiMon = await waitFor(() => { const s = lastSect(B3); return s && s.mySect && s.mySect.myTier === 'noimon' ? s : null; }, 8000);
    ok('C2 B gop 1000 LT -> 100 Tong Cong -> Noi Mon', !!noiMon, JSON.stringify(noiMon && noiMon.mySect && noiMon.mySect.myTier));
    B3.socket.emit('sect_store_take', { itemId: 'linh_thao', qty: 1 });
    const took = await waitFor(() => (lastSync(B3)?.inventory?.linh_thao || 0) >= 1, 8000);
    ok('C3 Noi Mon lay kho duoc', !!took);
    // Chuc vu: phong Pho B, C ok; D bi tran 2
    A3.socket.emit('sect_set_role', { token: 'p3190b01', role: 'pho' });
    await waitFor(() => { const s = lastSect(A3); return s && s.mySect && s.mySect.members.find((m) => m.token === 'p3190b01')?.role === 'pho' ? s : null; }, 8000);
    A3.socket.emit('sect_set_role', { token: 'p3190c01', role: 'pho' });
    await waitFor(() => { const s = lastSect(A3); return s && s.mySect && s.mySect.members.find((m) => m.token === 'p3190c01')?.role === 'pho' ? s : null; }, 8000);
    A3.socket.emit('sect_set_role', { token: 'p3190d01', role: 'pho' });
    const capErr = await waitFor(() => A3.errors.find((e) => e.includes('đủ 2 Phó')), 6000);
    ok('C4 phong Pho nguoi thu 3 bi tran 2 chan', !!capErr, A3.errors.join(' / '));
    // Duong Chu: E lam Duong Chu Dan Phong
    A3.socket.emit('sect_dept_set', { dept: 'dan', token: 'p3190e01' });
    const dcOk = await waitFor(() => { const s = lastSect(E3); return s && s.mySect && s.mySect.myTier === 'duongchu' ? s : null; }, 8000);
    ok('C5 E duoc bo nhiem Duong Chu (tier duongchu)', !!dcOk, JSON.stringify(dcOk && dcOk.mySect && dcOk.mySect.myTier));
    // Vuon tong: C gieo, B tuoi, C hai khi chua chin -> chan
    C3.socket.emit('sect_garden_op', { plot: 0, op: 'plant', herbId: 'linh_thao' });
    const planted = await waitFor(() => { const s = lastSect(C3); return s && s.mySect && s.mySect.garden && s.mySect.garden[0] && s.mySect.garden[0].herb === 'linh_thao' ? s : null; }, 8000);
    ok('C6 C gieo linh thao vao vuon tong', !!planted, JSON.stringify(planted && planted.mySect && planted.mySect.garden));
    B3.socket.emit('sect_garden_op', { plot: 0, op: 'water' });
    const watered = await waitFor(() => { const s = lastSect(B3); return s && s.mySect && s.mySect.garden && s.mySect.garden[0] && s.mySect.garden[0].pts >= 3 ? s : null; }, 8000);
    ok('C7 B tuoi -> +3 diem lon', !!watered, JSON.stringify(watered && watered.mySect && watered.mySect.garden && watered.mySect.garden[0]));
    C3.socket.emit('sect_garden_op', { plot: 0, op: 'harvest' });
    const hErr2 = await waitFor(() => C3.errors.find((e) => e.includes('chưa chín')), 6000);
    ok('C8 hai khi chua chin bi chan', !!hErr2, C3.errors.join(' / '));
    for (const c of [A3, B3, C3, E3]) c.socket.disconnect();
    await sleep(800);
    await stopServer();
    // ===== BOOT 4: vuon chin (gia lap thoi gian) + thien tai Luyen Cong Truong =====
    const wf = path.join(DIR, 'world.json'); const w = JSON.parse(fs.readFileSync(wf, 'utf8'));
    const gA = (w.sects || []).find((g) => g.name === 'Thien Kiem Tong');
    if (gA && gA.garden && gA.garden[0]) gA.garden[0].plantedAt = 1;
    fs.writeFileSync(wf, JSON.stringify(w));
    // Dien vien offline doi cho khi boot — B nang tam kd de BAY toi Duoc Vien, A bay toi Luyen Cong Truong
    patchChars((st) => { st.p3190b01.realm = 'kd'; });
    await startServer();
    const A4 = await connect('p3190a01'); const B4 = await connect('p3190b01'); const C4 = await connect('p3190c01');
    await waitFor(() => myPlayer(A4), 8000);
    B4.socket.emit('fly_toggle'); A4.socket.emit('fly_toggle');
    await sleep(600);
    await goTo(B4, bv.x, bv.y, 40, 40000);
    // C da la Pho (tier pho) — dung F? F o lang, contrib 0 ngaoemon nhung khong o vuon. Dung chinh C4: C la Pho nen hai duoc.
    // Chan Ngoai Mon khi hai: tam ha C xuong detu? Khong — dung B4 kiem chung hai duoc, con chan Ngoai Mon da chung o C1 (kho). O vuon: thu bang tai khoan D khong duoc (o lang). Bo qua chan vuon rieng, ghi nhan code.
    const ltB = lastSync(B4)?.inventory?.linh_thao || 0;
    B4.socket.emit('sect_garden_op', { plot: 0, op: 'harvest' });
    const harvested = await waitFor(() => (lastSync(B4)?.inventory?.linh_thao || 0) >= ltB + 3, 8000);
    ok('D1 vuon chin: B hai duoc +3 linh thao', !!harvested, 'truoc ' + ltB + ' sau ' + (lastSync(B4)?.inventory?.linh_thao || 0) + ' | err: ' + B4.errors.join(' / '));
    // Thien tai Luyen Cong Truong: A bay toi truong, don quai quanh truoc
    await goTo(A4, lc.x, lc.y, 40, 40000);
    const tuv0 = lastSync(A4)?.tuVi || 0;
    const clearT0 = Date.now();
    while (Date.now() - clearT0 < 45000) {
      const near = (A4.state?.monsters || []).filter((m) => !m.trial && Math.hypot(m.x - lc.x, m.y - lc.y) < 500);
      if (!near.length) break;
      const t = near[0]; const me = myPlayer(A4);
      if (!me) { await sleep(200); continue; }
      if (Math.hypot(me.x - t.x, me.y - t.y) > 55) steer(A4, t.x, t.y); else { halt(A4); A4.socket.emit('player_attack'); }
      await sleep(220);
    }
    await goTo(A4, lc.x, lc.y, 40, 20000); // dung dung tam Luyen Cong Truong truoc khi thien (ban kinh linh khi nho)
    halt(A4);
    await sleep(5500); // het cua so combat 5s
    A4.socket.emit('meditate_toggle');
    // Thien can 30s lien tuc moi +1 Tu vi — quai farm hoi sinh di ngang pha thien thi danh chet roi thien lai
    let tuvUp = false;
    const medT0 = Date.now();
    while (Date.now() - medT0 < 150000) {
      if ((lastSync(A4)?.tuVi || 0) > tuv0) { tuvUp = true; break; }
      const me = myPlayer(A4);
      const threat = me && (A4.state?.monsters || []).find((m) => !m.trial && Math.hypot(m.x - me.x, m.y - me.y) < 300);
      if (threat) {
        if (me.meditating) A4.socket.emit('meditate_toggle');
        const kT0 = Date.now();
        while (Date.now() - kT0 < 20000) {
          const mm = myPlayer(A4); const tt = (A4.state?.monsters || []).find((m) => m.id === threat.id);
          if (!tt || !mm) break;
          if (Math.hypot(mm.x - tt.x, mm.y - tt.y) > 55) steer(A4, tt.x, tt.y); else { halt(A4); A4.socket.emit('player_attack'); }
          await sleep(220);
        }
        await goTo(A4, lc.x, lc.y, 40, 15000); halt(A4);
        await sleep(5500);
        A4.socket.emit('meditate_toggle');
      } else if (me && !me.meditating) A4.socket.emit('meditate_toggle');
      await sleep(1000);
    }
    ok('D2 thien tai Luyen Cong Truong len Tu vi (' + tuv0 + ' -> ' + (lastSync(A4)?.tuVi || 0) + ')', tuvUp);
    for (const c of [A4, B4, C4]) c.socket.disconnect();
    await sleep(500);
  } catch (e) { console.log('PROBE ERROR: ' + (e && e.stack || e)); fail++; }
  await stopServer();
  console.log(`\n== p319: ${pass} PASS, ${fail} FAIL ==`);
  process.exit(fail ? 1 : 0);
})();
