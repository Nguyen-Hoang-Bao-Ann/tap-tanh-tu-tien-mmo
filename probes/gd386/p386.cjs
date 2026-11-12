// Probe GĐ386 — VĂN UYỂN PA2: NPC THỦ TÀNG + ĐỌC SÁCH CHO MỌI LỚP + BẬT ach_an_books (Bảo chốt xây 11/11/2026).
// Phạm vi hồ sơ (sổ rà soát 08/11, mục 6 Văn Uyển PA2): bổ 1 NPC Thủ Tàng + mở
// điểm đọc sách cho mọi lớp (khung study GĐ105) để ach_an_books có nguồn đếm và bật được.
// Chân kiểm:
//  0) Tĩnh: ITEMS = 171; icon chiêu public = 1.360; FX = 85; marker ttt_intro_v1 còn;
//     ach_an_books đã enabled:true; server có libKeeper + addLibRead + case booksRead.
//  1) Khám phá: char vào van_uyen → map_enter.study = cổng; npcs chứa Thủ Tàng
//     (id van_uyen_npc_thutang, tên Trầm Mặc) đứng gần cổng (≤260px);
//     van_uyen KHÔNG có Chủ Tiệm Thảo Dược (thư viện, không đặt tiệm — GĐ386).
//  2) Hội thoại: đứng xa >95px talk_npc → lỗi "Tới gần Trầm Mặc"; đứng gần →
//     npc_dialog { name: 'Trầm Mặc', personality: 'Thủ Tàng', libInfo.booksRead = 0 }.
//  3) Kiếm Tu (không phải Nho) đọc sách: counters.readSec vá 59 → nho_study không bị
//     chặn lớp, sync studying=1; đủ 60s → notice "Đọc xong một quyển" + toast 🏆
//     ach_an_books; di chuyển → ngắt đọc; file sau disconnect: booksRead=1, readSec ≥0,5.
//  4) Nho Tu đọc sách: Hạo Nhiên tăng như cũ (GĐ105 không vỡ) + cũng tích giây thư viện
//     (file: readSec ≥3 sau ~4s).
//  5) Đứng xa cổng >300px: nho_study bị chặn với lỗi "đứng gần chính đường".
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
  serverProc = spawn('node', ['server/index.js'], { cwd: ROOT, env: { ...process.env, PORT: String(port), TTT_STORAGE: 'file', TTT_CHAR_FILE: path.join(DIR, 'characters.json'), TTT_ACC_FILE: path.join(DIR, 'accounts.json'), TTT_WORLD_FILE: path.join(DIR, 'world.json'), TTT_SESS_FILE: path.join(DIR, 'sessions.json'), TTT_DAY_REAL_MS: '600000', TTT_TUVI_NEED: '5' }, stdio: ['ignore', 'pipe', 'pipe'] });
  serverProc.stderr.on('data', (d) => { try { fs.appendFileSync(path.join(DIR, 'srv_' + tag + '.log'), d); } catch (e) {} });
  serverProc.stdout.on('data', (d) => { try { fs.appendFileSync(path.join(DIR, 'srv_' + tag + '.log'), d); } catch (e) {} });
  killTimer = setTimeout(() => { try { serverProc.kill('SIGKILL'); } catch (e) {} }, 1500000);
  const t0 = Date.now();
  while (Date.now() - t0 < 90000) { try { const r = await fetch(`http://127.0.0.1:${port}/api/status`); if (r.ok) { clearTimeout(killTimer); return; } } catch (e) {} await sleep(400); }
  throw new Error('server khong len');
}
async function stopServer() { if (!serverProc) return; const p = serverProc; serverProc = null; if (killTimer) { clearTimeout(killTimer); killTimer = null; } await new Promise((res) => { const t = setTimeout(() => { try { p.kill('SIGKILL'); } catch (e) {} res(); }, 4000); p.once('exit', () => { clearTimeout(t); res(); }); try { p.kill('SIGTERM'); } catch (e) { clearTimeout(t); res(); } }); const t0 = Date.now(); while (Date.now() - t0 < 10000 && !(await portFree(CUR_PORT))) await sleep(300); }
const LC1 = { elements: ['kim'], main: 'kim', count: 1, mutations: [] };
function BASE(token, name, extra) {
  return Object.assign({ token, name, classId: 'kiemtu', gender: 'nam', race: null, geo175: 1, realm: 'lk', tier: 1, x: 1000, y: 1000, mapId: 'van_uyen', hp: 999999, mp: 9999, lifespan: 500, birthDay: -5660, ageStart: 16, stats: { khiHuyet: 500, vatCong: 300, vatPhong: 200, phapCong: 300, phapPhong: 200, tocDo: 60, minhMan: 100 }, statPoints: 0, freePoints: 0, tuVi: 99999, stones: 100000, stonesTrung: 0, stonesThuong: 0, stonesCuc: 0, inventory: {}, gearBag: {}, equipped: [], skills: [], job: null, job2: null, job3: null, linhCan: { ...LC1 }, affinity: {}, affV2: 1, bonds: {}, quests: {}, questsDone: {}, flags: {}, counters: {}, disciples: [], foundInvites: [], reformIn: [], sectTech: [], sectArts: [], sectArtsActive: [], mails: [], classRes: {}, food: 100, water: 100 }, extra || {});
}
let pass = 0, fail = 0;
function ok(name, cond, extra) { if (cond) { pass++; console.log('PASS | ' + name); } else { fail++; console.log('FAIL | ' + name + (extra ? ' | ' + extra : '')); } }
function info(name, val) { console.log('INFO | ' + name + ' | ' + val); }
function connect(token) {
  const socket = io(`http://127.0.0.1:${CUR_PORT}`, { transports: ['websocket'] });
  const ctx = { socket, merger: createMerger(), state: null, welcome: null, syncs: [], errs: [], notices: [], dialogs: [], mapEnter: null, myName: null, myId: null };
  socket.on('connect', () => socket.emit('hello', { token }));
  socket.on('welcome', (w) => { ctx.welcome = w; ctx.myName = (w.character || {}).name; ctx.myId = w.id; });
  socket.on('map_enter', (m) => { ctx.mapEnter = m; });
  socket.on('char_sync', (s) => ctx.syncs.push(s));
  socket.on('interact_error', (e) => ctx.errs.push({ t: Date.now(), msg: e.message || '' }));
  socket.on('notice', (n) => ctx.notices.push(n.text || ''));
  socket.on('npc_dialog', (d) => ctx.dialogs.push(d));
  socket.on('server_tick', (t) => { const st = ctx.merger(t); if (st) ctx.state = st; });
  return ctx;
}
const lastChar = (c) => { for (let i = c.syncs.length - 1; i >= 0; i--) { if (c.syncs[i]) return c.syncs[i]; } return c.welcome ? c.welcome.character : null; };
const meOf = (c) => { if (!c.state || !c.state.players) return null; return c.state.players.find((p) => p.name === c.myName) || null; }; // studying/haoNhien nằm ở object tick (server/index.js ~18403), không ở char_sync
function writeStore(chars) {
  for (const f of ['characters.json', 'accounts.json', 'world.json', 'sessions.json']) { try { fs.unlinkSync(path.join(DIR, f)); } catch (e) {} }
  fs.writeFileSync(path.join(DIR, 'characters.json'), JSON.stringify(chars));
  fs.writeFileSync(path.join(DIR, 'accounts.json'), JSON.stringify({}));
}
const readCharFile = (token) => JSON.parse(fs.readFileSync(path.join(DIR, 'characters.json'), 'utf8'))[token];

(async () => {
  try {
    // ---------- Chân 0: tĩnh ----------
    const srvSrc = fs.readFileSync(path.join(ROOT, 'server/index.js'), 'utf8');
    const ii = srvSrc.indexOf('const ITEMS = {');
    let depth = 0, j = srvSrc.indexOf('{', ii); const istart = j;
    for (; j < srvSrc.length; j++) { if (srvSrc[j] === '{') depth++; else if (srvSrc[j] === '}') { depth--; if (!depth) break; } }
    const ITEMS = eval('(' + srvSrc.slice(istart, j + 1) + ')');
    ok('chân 0a: ITEMS server = 171 loại', Object.keys(ITEMS).length === 171, 'dem=' + Object.keys(ITEMS).length);
    const iconCount = fs.readdirSync(path.join(ROOT, 'client/public/icons')).filter((f) => f.endsWith('.png')).length;
    ok('chân 0b: icon chiêu public = 1360', iconCount === 1360, 'dem=' + iconCount);
    const fxCount = fs.readdirSync(path.join(ROOT, 'client/public/sprites/fx')).length;
    ok('chân 0c: FX = 85', fxCount === 85, 'dem=' + fxCount);
    const cliSrc = fs.readFileSync(path.join(ROOT, 'client/src/main.ts'), 'utf8');
    ok('chân 0d: marker ttt_intro_v1 còn trong client', cliSrc.includes('ttt_intro_v1'));
    const achSrc = fs.readFileSync(path.join(ROOT, 'server/achievements.js'), 'utf8');
    const achLine = (achSrc.match(/\{ id: 'ach_an_books'[^}]*\}/) || [''])[0];
    ok('chân 0e: ach_an_books đã bật (enabled: true)', achLine.includes('enabled: true'), achLine.slice(0, 80));
    ok('chân 0f: server có Thủ Tàng + addLibRead + progressFor booksRead', srvSrc.includes('van_uyen_npc_thutang') && srvSrc.includes('function addLibRead') && srvSrc.includes("case 'booksRead'") && srvSrc.includes('libKeeper: true'));

    // ---------- Chân 1: khám phá tọa độ Văn Uyển ----------
    writeStore({ disc386x: BASE('disc386x', 'KhamPha386') });
    await startServer(3995, 'disc');
    const st = await fetch(`http://127.0.0.1:3995/api/status`).then((r) => r.json()).catch(() => null);
    ok('chân 1a: /api/status 4.579 quái', !!st && st.monsters === 4579, st ? 'monsters=' + st.monsters : 'no status');
    const cd = connect('disc386x');
    const meDisc = await waitFor(() => cd.mapEnter && cd.welcome, 20000);
    ok('chân 1b: char vào được van_uyen, có map_enter', !!meDisc);
    const mp = cd.mapEnter || {};
    const keeper = (mp.npcs || []).find((n) => n.role === 'Thủ Tàng');
    ok('chân 1c: map_enter có Thủ Tàng (Trầm Mặc)', !!keeper && keeper.id === 'van_uyen_npc_thutang' && keeper.name === 'Trầm Mặc', JSON.stringify((mp.npcs || []).map((n) => n.role)));
    const herb = (mp.npcs || []).find((n) => n.role === 'Chủ Tiệm Thảo Dược');
    ok('chân 1d: van_uyen không có Chủ Tiệm Thảo Dược', !herb);
    const studyPt = mp.study;
    ok('chân 1e: map_enter có điểm đọc sách (cổng)', !!studyPt && typeof studyPt.x === 'number');
    let dKeeperPortal = null;
    if (keeper && studyPt) dKeeperPortal = Math.hypot(keeper.x - studyPt.x, keeper.y - studyPt.y);
    ok('chân 1f: Thủ Tàng đứng gần cổng/điểm đọc (≤260px)', dKeeperPortal !== null && dKeeperPortal <= 260, 'd=' + dKeeperPortal);
    info('tọa độ', `portal/study=${JSON.stringify(studyPt)} keeper=${keeper ? keeper.x + ',' + keeper.y : '?'} map ${mp.w}x${mp.h} npcs=${(mp.npcs || []).length}`);
    cd.socket.disconnect();
    await stopServer();
    if (!keeper || !studyPt) throw new Error('khám phá thất bại — dừng');

    // ---------- Vòng chính: vá fixture theo tọa độ thật ----------
    const dirKP = Math.atan2(studyPt.y - keeper.y, studyPt.x - keeper.x);
    const nearPt = { x: Math.round(keeper.x + Math.cos(dirKP) * 35), y: Math.round(keeper.y + Math.sin(dirKP) * 35) };
    const farX = Math.max(80, Math.min((mp.w || 4000) - 80, studyPt.x + 650));
    const farY = Math.max(80, Math.min((mp.h || 3000) - 80, studyPt.y + 550));
    info('điểm kiểm', `near=${nearPt.x},${nearPt.y} (cách cổng ${Math.round(Math.hypot(nearPt.x - studyPt.x, nearPt.y - studyPt.y))}px) far=${farX},${farY} (cách thủ tàng ${Math.round(Math.hypot(farX - keeper.x, farY - keeper.y))}px, cách cổng ${Math.round(Math.hypot(farX - studyPt.x, farY - studyPt.y))}px)`);
    writeStore({
      docgia386x: BASE('docgia386x', 'DocGia386', { x: nearPt.x, y: nearPt.y, counters: { readSec: 59 } }),
      nhodoc386x: BASE('nhodoc386x', 'NhoDoc386', { classId: 'nhotu', x: nearPt.x + 25, y: nearPt.y + 15 }),
      xa386far: BASE('xa386far', 'Xa386', { x: farX, y: farY }),
    });
    await startServer(3996, 'main');

    // ---------- Chân 2+3: Kiếm Tu — hội thoại + đọc sách ----------
    const ca = connect('docgia386x');
    await waitFor(() => ca.welcome && ca.mapEnter, 20000);
    await sleep(600);
    ca.socket.emit('talk_npc', { npcId: 'van_uyen_npc_thutang' });
    const dlg1 = await waitFor(() => ca.dialogs[ca.dialogs.length - 1], 8000);
    ok('chân 2a: đứng gần → mở được hội thoại Thủ Tàng', !!dlg1 && dlg1.name === 'Trầm Mặc' && dlg1.personality === 'Thủ Tàng', dlg1 ? dlg1.name + '/' + dlg1.personality : 'no dialog');
    ok('chân 2b: hội thoại có libInfo booksRead=0', !!dlg1 && !!dlg1.libInfo && dlg1.libInfo.booksRead === 0, dlg1 ? JSON.stringify(dlg1.libInfo) : '');
    info('lời thoại Thủ Tàng', dlg1 ? dlg1.text : '');

    ca.errs.length = 0;
    ca.socket.emit('nho_study');
    await sleep(1200);
    const syncStudy = meOf(ca);
    ok('chân 3a: Kiếm Tu bấm đọc sách KHÔNG bị chặn lớp', !ca.errs.some((e) => e.msg.includes('việc riêng của Nho Tu')), JSON.stringify(ca.errs.map((e) => e.msg)));
    ok('chân 3b: tick studying=1 (đang đọc)', !!syncStudy && syncStudy.studying === 1, syncStudy ? 'studying=' + syncStudy.studying : 'no tick me');
    ok('chân 3c: notice bắt đầu đọc cho lớp thường nhắc sổ Bác Học', ca.notices.some((t) => t.includes('bắt đầu đọc sách') && t.includes('Bác Học')), ca.notices.slice(-3).join(' | '));
    const bookNotice = await waitFor(() => ca.notices.find((t) => t.includes('Đọc xong một quyển')), 20000);
    ok('chân 3d: đủ 60s tích lũy → đọc xong 1 quyển (notice)', !!bookNotice, ca.notices.slice(-4).join(' | '));
    const achToast = await waitFor(() => ca.notices.find((t) => t.includes('🏆') && t.includes('đọc hết sách')), 8000);
    ok('chân 3e: toast 🏆 ach_an_books bật thật (bậc 1)', !!achToast, ca.notices.slice(-4).join(' | '));
    // ngắt bằng di chuyển
    ca.socket.emit('client_input', { vx: 1, vy: 0 });
    await sleep(700);
    ca.socket.emit('client_input', { vx: 0, vy: 0 });
    const syncAfterMove = meOf(ca);
    ok('chân 3f: di chuyển → ngắt đọc (studying=0)', !!syncAfterMove && syncAfterMove.studying === 0, syncAfterMove ? 'studying=' + syncAfterMove.studying : '');
    ok('chân 3g: notice ngắt vì di chuyển', ca.notices.some((t) => t.includes('ngắt vì bạn di chuyển')), ca.notices.slice(-3).join(' | '));
    ca.socket.disconnect();
    await sleep(800);
    const fileA = readCharFile('docgia386x');
    ok('chân 3h: persist — file có booksRead=1', !!fileA && fileA.counters && fileA.counters.booksRead === 1, fileA ? JSON.stringify(fileA.counters) : 'no file');
    ok('chân 3i: persist — readSec lẻ sau khi xong quyển còn giữ (<10)', !!fileA && fileA.counters && typeof fileA.counters.readSec === 'number' && fileA.counters.readSec >= 0 && fileA.counters.readSec < 10, fileA ? 'readSec=' + fileA.counters.readSec : '');

    // ---------- Chân 4: Nho Tu — Hạo Nhiên cũ + tích thư viện ----------
    const cb = connect('nhodoc386x');
    await waitFor(() => cb.welcome && cb.mapEnter, 20000);
    await sleep(500);
    const hao0 = (meOf(cb) || {}).haoNhien || 0;
    cb.socket.emit('nho_study');
    await sleep(4500);
    const syncB = meOf(cb);
    ok('chân 4a: Nho Tu đang đọc (studying=1)', !!syncB && syncB.studying === 1);
    ok('chân 4b: Hạo Nhiên tăng như cũ (+5/giây)', !!syncB && (syncB.haoNhien || 0) > hao0, 'haoNhien ' + hao0 + ' -> ' + (syncB ? syncB.haoNhien : '?'));
    cb.socket.emit('nho_study'); // toggle dừng
    await sleep(400);
    cb.socket.disconnect();
    await sleep(800);
    const fileB = readCharFile('nhodoc386x');
    ok('chân 4c: Nho Tu cũng tích giây thư viện (readSec ≥3)', !!fileB && fileB.counters && fileB.counters.readSec >= 3, fileB ? 'readSec=' + (fileB.counters || {}).readSec : 'no file');

    // ---------- Chân 2b+5: đứng xa — chặn hội thoại + chặn đọc ----------
    const cc = connect('xa386far');
    await waitFor(() => cc.welcome && cc.mapEnter, 20000);
    await sleep(600);
    cc.socket.emit('talk_npc', { npcId: 'van_uyen_npc_thutang' });
    const farTalkErr = await waitFor(() => cc.errs.find((e) => e.msg.includes('Tới gần Trầm Mặc')), 8000);
    ok('chân 2c: đứng xa >95px → talk bị chặn "Tới gần Trầm Mặc"', !!farTalkErr && cc.dialogs.length === 0, JSON.stringify(cc.errs.map((e) => e.msg)));
    cc.socket.emit('nho_study');
    const farStudyErr = await waitFor(() => cc.errs.find((e) => e.msg.includes('đứng gần chính đường')), 8000);
    ok('chân 5: đứng xa cổng >300px → đọc sách bị chặn', !!farStudyErr, JSON.stringify(cc.errs.map((e) => e.msg)));
    cc.socket.disconnect();
    await stopServer();
  } catch (e) {
    console.log('PROBE ERROR: ' + (e && e.stack || e));
    fail++;
    try { await stopServer(); } catch (e2) {}
  }
  console.log(`=== GĐ386 PROBE: ${pass} PASS / ${fail} FAIL ===`);
  process.exit(fail ? 1 : 0);
})();
