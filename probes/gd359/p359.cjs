// Probe GĐ359 — Sửa lỗi 6 điểm manh mối GĐ127 ở vùng bai_farm không kích hoạt được.
// Nguyên nhân: tick so mapOf(p) === cluePoint.mapId ('bai_farm') nhưng bai_farm là
// VÙNG trong map nhà — mapId người chơi luôn là 'lang_tan_thu'. GĐ359 thêm
// homeRegionMapId() chuẩn hóa mapId vùng -> HOME_MAP ở 3 chỗ: tick phát hiện
// điểm manh mối, tick hoàn thành explore (đích bai_farm cùng gốc lỗi), sổ đăng
// ký khám phá GĐ356 (mapId điểm -> map nhà để dấu bản đồ/sổ hiển thị đúng).
// Chân kiểm:
//  0) Boot: sổ đăng ký vẫn đủ manh_moi = 27.
//  1) Đối chứng âm: đứng ở quảng trường (1565,1252 — cách điểm gần nhất hid_004
//     165px, NGOÀI bán kính 150) + đứng trong vùng bãi farm ngoài bán kính mọi
//     điểm -> KHÔNG phát hiện oan (found không có mm_, progress = 0).
//  2-7) TỪNG điểm trong 6 điểm: nhân vật RIÊNG bay thẳng tới đúng tọa độ điểm
//     (cách đo từng điểm ghi trong comment tại chân tương ứng) -> notice phát
//     hiện + sổ soul.secrets có mm_<qid> (đúng điểm đó, không lẫn điểm khác)
//     + progress ach_kp_secrets = 1 + mục sổ ghi mapId 'lang_tan_thu' /
//     mapName 'Làng Tân Thủ'.
//  8) hid_006 TRỌN ĐƯỜNG: quest explore được vá sẵn state active -> tới điểm
//     manh mối (1700,1450) phát hiện cờ; tới đích explore (1700,1050) — cùng
//     lỗi mapId vùng ở nhánh targetPoint — quest chuyển 'done'.
//  9) Nguồn manh mối mới: nhân vật tươi thiền ở Đạo Quán -> manh mối thiền chọn
//     tất định điểm hợp cảnh đầu tiên theo thứ tự sổ = clue_mm_q127_hid_002
//     (điểm bãi farm đầu sổ, nay là điểm map nhà có manh mối).
// 10) Không hồi quy tại chỗ: điểm GĐ127 ở map thường (hid_010, Bích Ba) vẫn
//     phát hiện bình thường. (Chạy lại trọn p356 + p358 ở bước riêng.)
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
let serverProc = null, killTimer = null, CUR_PORT = 3724;
async function startServer(port, tag) {
  CUR_PORT = port;
  if (!(await portFree(port))) throw new Error('port ban ' + port);
  serverProc = spawn('node', ['server/index.js'], { cwd: ROOT, env: { ...process.env, PORT: String(port), TTT_STORAGE: 'file', TTT_CHAR_FILE: path.join(DIR, 'characters.json'), TTT_ACC_FILE: path.join(DIR, 'accounts.json'), TTT_WORLD_FILE: path.join(DIR, 'world.json'), TTT_SESS_FILE: path.join(DIR, 'sessions.json'), TTT_DAY_REAL_MS: '600000', TTT_TUVI_NEED: '5' }, stdio: ['ignore', 'pipe', 'pipe'] });
  serverProc.stderr.on('data', (d) => { try { fs.appendFileSync(path.join(DIR, 'srv_' + tag + '.log'), d); } catch (e) {} });
  serverProc.stdout.on('data', (d) => { try { fs.appendFileSync(path.join(DIR, 'srv_' + tag + '.log'), d); } catch (e) {} });
  killTimer = setTimeout(() => { try { serverProc.kill('SIGKILL'); } catch (e) {} }, 600000);
  const t0 = Date.now();
  while (Date.now() - t0 < 45000) { try { const r = await fetch(`http://127.0.0.1:${port}/api/status`); if (r.ok) { clearTimeout(killTimer); return; } } catch (e) {} await sleep(500); }
  throw new Error('server khong len');
}
async function stopServer() { if (!serverProc) return; const p = serverProc; serverProc = null; if (killTimer) { clearTimeout(killTimer); killTimer = null; } await new Promise((res) => { const t = setTimeout(() => { try { p.kill('SIGKILL'); } catch (e) {} res(); }, 4000); p.once('exit', () => { clearTimeout(t); res(); }); try { p.kill('SIGTERM'); } catch (e) { clearTimeout(t); res(); } }); const t0 = Date.now(); while (Date.now() - t0 < 10000 && !(await portFree(CUR_PORT))) await sleep(300); }
const STATS = { khiHuyet: 8000, vatCong: 400, vatPhong: 250, phapCong: 400, phapPhong: 250, tocDo: 60, minhMan: 100 };
const LC1 = { elements: ['kim'], main: 'kim', count: 1, mutations: [] };
function BASE(token, name, extra) {
  return Object.assign({ token, name, classId: 'kiemtu', gender: 'nam', race: null, geo175: 1, realm: 'kd', tier: 9, x: 1565, y: 1011, mapId: 'lang_tan_thu', hp: 99999, mp: 99999, lifespan: 500, birthDay: -5660, ageStart: 16, stats: { ...STATS }, statPoints: 0, freePoints: 0, tuVi: 99999, stones: 100000, stonesTrung: 0, stonesThuong: 0, stonesCuc: 0, inventory: {}, gearBag: {}, equipped: [], skills: [], job: null, job2: null, job3: null, linhCan: { ...LC1 }, affinity: {}, affV2: 1, bonds: {}, quests: {}, questsDone: {}, flags: {}, counters: {}, disciples: [], foundInvites: [], reformIn: [], sectTech: [], sectArts: [], sectArtsActive: [], mails: [], classRes: {}, food: 100, water: 100 }, extra || {});
}
let pass = 0, fail = 0;
function ok(name, cond, extra) { if (cond) { pass++; console.log('PASS | ' + name); } else { fail++; console.log('FAIL | ' + name + (extra ? ' | ' + extra : '')); } }
function connect(token) {
  const socket = io(`http://127.0.0.1:${CUR_PORT}`, { transports: ['websocket'] });
  const ctx = { socket, merger: createMerger(), state: null, welcome: null, needChar: false, syncs: [], errs: [], notices: [], dialogs: [], maps: [], marks: [], opened: [], infos: [], overviews: [], myName: null };
  socket.on('connect', () => socket.emit('hello', { token }));
  socket.on('welcome', (w) => { ctx.welcome = w; ctx.myName = (w.character || {}).name; });
  socket.on('need_character', () => { ctx.needChar = true; });
  socket.on('char_sync', (s) => ctx.syncs.push(s));
  socket.on('notice', (n) => ctx.notices.push(n.text || ''));
  socket.on('interact_error', (e) => ctx.errs.push(e.message || ''));
  socket.on('npc_dialog', (d) => ctx.dialogs.push(d));
  socket.on('map_enter', (m) => ctx.maps.push(m));
  socket.on('secret_marks', (m) => ctx.marks.push(m));
  socket.on('travel_info', (d) => ctx.infos.push(d));
  socket.on('overview_data', (d) => ctx.overviews.push(d));
  socket.on('chest_opened', (o) => ctx.opened.push(o));
  socket.on('server_tick', (t) => { const st = ctx.merger(t); if (st) ctx.state = st; });
  return ctx;
}
const lastChar = (c) => { for (let i = c.syncs.length - 1; i >= 0; i--) { if (c.syncs[i]) return c.syncs[i]; } return c.welcome ? c.welcome.character : null; };
const meOf = (c) => { const ps = (c.state && c.state.players) || []; return ps.find((p) => p.name === c.myName) || null; };
const foundList = (c) => { const ch = lastChar(c); const sv = ch && ch.soul && ch.soul.secretsView; return sv ? sv.found : []; };
const foundIds = (c) => foundList(c).map((f) => f.id);
const cluesOf = (c) => { const ch = lastChar(c); const sv = ch && ch.soul && ch.soul.secretsView; return sv ? sv.clues : []; };
const achProg = (c, id) => { const ch = lastChar(c); const l = ch && ch.achievements && ch.achievements.list; const a = l ? l.find((x) => x.id === id) : null; return a ? a.progress : -1; };
async function flyTo(c, tx, ty, tol) {
  c.socket.emit('fly_toggle', {});
  await sleep(400);
  const t0 = Date.now();
  while (Date.now() - t0 < 30000) {
    const me = meOf(c); if (!me) { await sleep(150); continue; }
    const dx = tx - me.x, dy = ty - me.y; const d = Math.hypot(dx, dy);
    if (d <= (tol || 60)) break;
    c.socket.emit('client_input', { vx: dx / d, vy: dy / d });
    await sleep(120);
  }
  c.socket.emit('client_input', { vx: 0, vy: 0 });
  c.socket.emit('fly_toggle', {});
  await sleep(400);
}
// 6 điểm bai_farm: [qid, x, y] — tọa độ lấy từ cluePoint trong quests_gd127.json
const SIX = [
  ['q127_hid_002', 1300, 1050],
  ['q127_hid_004', 1400, 1250],
  ['q127_hid_006', 1700, 1450],
  ['q127_hid_012', 1700, 650],
  ['q127_hid_014', 2000, 850],
  ['q127_hid_016', 2100, 1050],
];

(async () => {
  try {
    const chars = {};
    chars['tk359neg01'] = BASE('tk359neg01', 'P359DoiChung', { x: 1565, y: 1252 }); // quảng trường: cách hid_004 165px > r150
    SIX.forEach(([qid], i) => { const tk = 'tk359pt00' + (i + 1); chars[tk] = BASE(tk, 'P359Diem' + (i + 1)); });
    chars['tk359full1'] = BASE('tk359full1', 'P359TronDuong', { quests: { q127_hid_006: { progress: 0, state: 'active' } } });
    chars['tk359med01'] = BASE('tk359med01', 'P359Thien', { x: 1252, y: 900 });
    chars['tk359reg01'] = BASE('tk359reg01', 'P359HoiQuy', { mapId: 'bich_ba_thanh', x: 2100, y: 3250 });
    fs.writeFileSync(path.join(DIR, 'characters.json'), JSON.stringify(chars));
    fs.writeFileSync(path.join(DIR, 'accounts.json'), '{}');
    fs.writeFileSync(path.join(DIR, 'world.json'), JSON.stringify({ totalMinutes: 3360, savedAt: Date.now() }));
    fs.writeFileSync(path.join(DIR, 'sessions.json'), '{}');
    await startServer(3724, '359a');
    // sổ đăng ký dựng lười ở tick đầu có người chơi -> chờ dòng log xuất hiện thay vì đọc ngay
    const regLine = await waitFor(() => { try { return fs.readFileSync(path.join(DIR, 'srv_359a.log'), 'utf8').split('\n').find((l) => l.includes('[khám phá]')) || null; } catch (e) { return null; } }, 15000);
    console.log('boot:', (regLine || '').trim());
    ok('chân 0: sổ đăng ký vẫn đủ manh_moi = 27', !!regLine && /manh_moi:27/.test(regLine), (regLine || '').trim());

    // ---- Chân 1: đối chứng âm (không phát hiện oan theo vùng) ----
    const cN = connect('tk359neg01'); await waitFor(() => cN.welcome, 20000);
    await waitFor(() => meOf(cN), 8000);
    await sleep(4000); // đứng yên ở quảng trường, ngoài bán kính mọi điểm
    ok('chân 1a: đứng ở quảng trường (ngoài r150 của hid_004 đúng 165px) -> không phát hiện', foundIds(cN).filter((i) => i.startsWith('mm_')).length === 0, JSON.stringify(foundIds(cN)));
    ok('chân 1b: progress ach_kp_secrets = 0', achProg(cN, 'ach_kp_secrets') === 0, 'prog=' + achProg(cN, 'ach_kp_secrets'));
    ok('chân 1c: không có notice phát hiện manh mối', !cN.notices.some((t) => t.includes('phát hiện manh mối')), JSON.stringify(cN.notices.slice(-3)));
    // bay vào GIỮA vùng bãi farm nhưng ngoài bán kính mọi điểm: (1850,1150) cách hid_016 269px, hid_014 335px, hid_006 335px
    await flyTo(cN, 1850, 1150, 40);
    await sleep(2500);
    ok('chân 1d: đứng giữa vùng bãi farm ngoài bán kính mọi điểm -> vẫn không phát hiện oan', foundIds(cN).filter((i) => i.startsWith('mm_')).length === 0 && achProg(cN, 'ach_kp_secrets') === 0, JSON.stringify(foundIds(cN)));
    cN.socket.disconnect();

    // ---- Chân 2-7: từng điểm trong 6 điểm (nhân vật riêng, bay thẳng tới tọa độ điểm) ----
    for (let i = 0; i < SIX.length; i++) {
      const [qid, x, y] = SIX[i];
      const tk = 'tk359pt00' + (i + 1);
      const c = connect(tk); await waitFor(() => c.welcome, 20000);
      await waitFor(() => meOf(c), 8000);
      // cách đo: bay thẳng từ điểm nghỉ (1565,1011) tới đúng tọa độ cluePoint của điểm, dừng trong 40px
      await flyTo(c, x, y, 40);
      const got = await waitFor(() => (foundIds(c).includes('mm_' + qid) ? true : null), 8000);
      ok(`chân ${i + 2}a: tới điểm ${qid} (${x},${y}) -> ghi sổ mm_${qid}`, !!got, JSON.stringify(foundIds(c)));
      ok(`chân ${i + 2}b: notice 'phát hiện manh mối' của ${qid}`, c.notices.some((t) => t.includes('phát hiện manh mối')), JSON.stringify(c.notices.slice(-2)));
      const mmOnly = foundIds(c).filter((s) => s.startsWith('mm_'));
      ok(`chân ${i + 2}c: chỉ đúng 1 điểm mm được ghi (không lẫn điểm kề)`, mmOnly.length === 1 && mmOnly[0] === 'mm_' + qid, JSON.stringify(mmOnly));
      ok(`chân ${i + 2}d: progress ach_kp_secrets = 1`, achProg(c, 'ach_kp_secrets') === 1, 'prog=' + achProg(c, 'ach_kp_secrets'));
      const fe = foundList(c).find((f) => f.id === 'mm_' + qid);
      ok(`chân ${i + 2}e: mục sổ của ${qid} ghi map nhà (mapId lang_tan_thu, tên Làng Tân Thủ)`, !!fe && fe.mapId === 'lang_tan_thu' && fe.mapName === 'Làng Tân Thủ', JSON.stringify(fe));
      c.socket.disconnect();
      await sleep(300);
    }

    // ---- Chân 8: hid_006 trọn đường (điểm manh mối + đích explore cùng lỗi mapId vùng) ----
    const cF = connect('tk359full1'); await waitFor(() => cF.welcome, 20000);
    await waitFor(() => meOf(cF), 8000);
    await flyTo(cF, 1700, 1450, 40); // điểm manh mối hid_006
    const gotF = await waitFor(() => (foundIds(cF).includes('mm_q127_hid_006') ? true : null), 8000);
    ok('chân 8a: hid_006 — tới điểm manh mối (1700,1450) -> cờ + sổ', !!gotF, JSON.stringify(foundIds(cF)));
    await flyTo(cF, 1700, 1050, 40); // đích explore của chính quest hid_006 (targetPoint bai_farm)
    const doneF = await waitFor(() => { const ch = lastChar(cF); const q = ch && ch.quests && ch.quests.q127_hid_006; return q && q.state === 'done' ? true : null; }, 8000);
    ok('chân 8b: hid_006 — tới đích explore (1700,1050) -> quest done', !!doneF, JSON.stringify((lastChar(cF) || {}).quests));
    ok('chân 8c: notice hoàn thành nhiệm vụ ẩn hid_006', cF.notices.some((t) => t.includes('Hoàn thành')), JSON.stringify(cF.notices.slice(-3)));
    cF.socket.disconnect();

    // ---- Chân 9: nguồn thiền đã nối tới điểm bãi farm ----
    const cM = connect('tk359med01'); await waitFor(() => cM.welcome, 20000);
    cM.socket.emit('meditate_toggle', {});
    const medGot = await waitFor(() => (cluesOf(cM).length >= 1 ? cluesOf(cM)[0].id : null), 8000);
    ok('chân 9: thiền ở Đạo Quán -> nhận manh mối điểm bãi farm đầu sổ (clue_mm_q127_hid_002)', medGot === 'clue_mm_q127_hid_002', 'got=' + medGot + ' clues=' + JSON.stringify(cluesOf(cM).map((x) => x.id)));
    cM.socket.emit('meditate_toggle', {}); await sleep(300);
    cM.socket.disconnect();

    // ---- Chân 10: không hồi quy — điểm map thường ----
    const cR = connect('tk359reg01'); await waitFor(() => cR.welcome, 20000);
    let gotR = await waitFor(() => (foundIds(cR).includes('mm_q127_hid_010') ? true : null), 6000);
    if (!gotR) { await flyTo(cR, 2100, 3250, 40); gotR = await waitFor(() => (foundIds(cR).includes('mm_q127_hid_010') ? true : null), 8000); }
    ok('chân 10: điểm GĐ127 map thường (hid_010 Bích Ba) vẫn phát hiện bình thường', !!gotR, JSON.stringify(foundIds(cR)));
    cR.socket.disconnect();

    console.log(`\nKẾT QUẢ GĐ359: ${pass} PASS / ${fail} FAIL`);
    await stopServer();
    process.exit(fail ? 1 : 0);
  } catch (e) {
    console.log('PROBE ERROR:', e && e.stack || e);
    try { await stopServer(); } catch (e2) {}
    process.exit(2);
  }
})();
