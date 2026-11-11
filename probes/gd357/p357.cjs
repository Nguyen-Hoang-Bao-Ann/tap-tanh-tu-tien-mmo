// Probe GĐ357 — Hệ khám phá đợt 2: nguồn manh mối (kể chuyện / thiền / bia khắc) + perk đầu kiếp (Ẩn mốc 3).
// Chân kiểm:
//  1) Nghe đoạn BẢN RÕ của Cụ Ký -> nhận đúng 2 manh mối (idempotent khi nghe lại).
//  2) Nghe BẢN MỜ (đoạn có điều kiện chưa đạt) -> KHÔNG nhận manh mối.
//  3) Trưởng Làng -> manh mối di vật Hoa (st=1); tới nhặt di vật -> manh mối TỰ KHÉP (st=2) + nhận thêm manh mối chuỗi về di vật khác.
//  4) Điểm đã tìm TRƯỚC khi có manh mối -> manh mối vào sổ ở st=2 (kỷ niệm).
//  5) Thiền ở Đạo Quán: đúng 1 manh mối/ngày game, chọn tất định điểm đầu tiên hợp cảnh; thiền lại cùng ngày không thêm.
//  6) Bia khắc: map_enter có steles; đọc bia tại chỗ -> manh mối + từ khóa trong notice; đọc lại không trùng; đọc từ xa bị chặn.
//  7) Perk đầu kiếp 3 tình huống ưu tiên (cổng -> di vật theo tộc -> điểm nhiệm vụ ẩn) + hồn dưới mốc Ẩn 3 -> 0 manh mối;
//     manh mối kiếp trước giữ nguyên qua kiếp (F5); Kiếp Ký có dòng ghi chú trong file.
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
let serverProc = null, killTimer = null, CUR_PORT = 3716;
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
async function stopServer() { if (!serverProc) return; const p = serverProc; serverProc = null; await new Promise((res) => { const t = setTimeout(() => { try { p.kill('SIGKILL'); } catch (e) {} res(); }, 4000); p.once('exit', () => { clearTimeout(t); res(); }); try { p.kill('SIGTERM'); } catch (e) { clearTimeout(t); res(); } }); const t0 = Date.now(); while (Date.now() - t0 < 10000 && !(await portFree(CUR_PORT))) await sleep(300); }
const STATS = { khiHuyet: 8000, vatCong: 400, vatPhong: 250, phapCong: 400, phapPhong: 250, tocDo: 60, minhMan: 100 };
const LC1 = { elements: ['kim'], main: 'kim', count: 1, mutations: [] };
function BASE(token, name, extra) {
  return Object.assign({ token, name, classId: 'kiemtu', gender: 'nam', race: null, geo175: 1, realm: 'kd', tier: 9, x: 1565, y: 1011, mapId: 'lang_tan_thu', hp: 99999, mp: 99999, lifespan: 500, birthDay: -5660, ageStart: 16, stats: { ...STATS }, statPoints: 0, freePoints: 0, tuVi: 99999, stones: 100000, stonesTrung: 0, stonesThuong: 0, stonesCuc: 0, inventory: {}, gearBag: {}, equipped: [], skills: [], job: null, job2: null, job3: null, linhCan: { ...LC1 }, affinity: {}, affV2: 1, bonds: {}, quests: {}, questsDone: {}, flags: {}, counters: {}, disciples: [], foundInvites: [], reformIn: [], sectTech: [], sectArts: [], sectArtsActive: [], mails: [], classRes: {}, food: 100, water: 100 }, extra || {});
}
const AN_FULL = { tiers: { ach_an_dream: 4, ach_an_secret: 3, ach_an_firstfail: 3, ach_an_festverse: 3, ach_an_demon: 3 }, title: null, daoTich: 0, notified: {} }; // Đạo tích nhóm Ẩn = 5+3+3+3+3 = 17 >= 15 -> mốc 3
let pass = 0, fail = 0;
function ok(name, cond, extra) { if (cond) { pass++; console.log('PASS | ' + name); } else { fail++; console.log('FAIL | ' + name + (extra ? ' | ' + extra : '')); } }
function connect(token) {
  const socket = io(`http://127.0.0.1:${CUR_PORT}`, { transports: ['websocket'] });
  const ctx = { socket, merger: createMerger(), state: null, welcome: null, needChar: false, syncs: [], errs: [], notices: [], dialogs: [], maps: [], marks: [], overviews: [], myName: null, createErr: null };
  socket.on('connect', () => socket.emit('hello', { token }));
  socket.on('welcome', (w) => { ctx.welcome = w; ctx.myName = (w.character || {}).name; });
  socket.on('need_character', () => { ctx.needChar = true; });
  socket.on('create_error', (e) => { ctx.createErr = e.message || ''; });
  socket.on('char_sync', (s) => ctx.syncs.push(s));
  socket.on('notice', (n) => ctx.notices.push(n.text || ''));
  socket.on('interact_error', (e) => ctx.errs.push(e.message || ''));
  socket.on('npc_dialog', (d) => ctx.dialogs.push(d));
  socket.on('map_enter', (m) => ctx.maps.push(m));
  socket.on('secret_marks', (m) => ctx.marks.push(m));
  socket.on('overview_data', (d) => ctx.overviews.push(d));
  socket.on('server_tick', (t) => { const st = ctx.merger(t); if (st) ctx.state = st; });
  return ctx;
}
const lastChar = (c) => { for (let i = c.syncs.length - 1; i >= 0; i--) { if (c.syncs[i]) return c.syncs[i]; } return c.welcome ? c.welcome.character : null; };
const meOf = (c) => { const ps = (c.state && c.state.players) || []; return ps.find((p) => p.name === c.myName) || null; };
const cluesOf = (c) => { const ch = lastChar(c); const sv = ch && ch.soul && ch.soul.secretsView; return sv ? sv.clues : []; };
const clueSt = (c, id) => { const cl = cluesOf(c).find((x) => x.id === id); return cl ? cl.st : 0; };
async function listen(c, npcId, segId) {
  const d0 = c.dialogs.length, e0 = c.errs.length;
  c.socket.emit('talk_npc', { npcId, storySeg: segId });
  const r = await waitFor(() => {
    for (let i = d0; i < c.dialogs.length; i++) if (c.dialogs[i].storyRead) return { read: c.dialogs[i].storyRead };
    if (c.errs.length > e0) return { err: c.errs[c.errs.length - 1] };
    return null;
  }, 8000);
  return r || { timeout: true };
}
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

(async () => {
  try {
    const chars = {};
    chars['tk357ke001'] = BASE('tk357ke001', 'P357KeChuyen', { x: 1064, y: 1990 });
    chars['tk357ke002'] = BASE('tk357ke002', 'P357DongManh', { x: 810, y: 1225 });
    chars['tk357ke003'] = BASE('tk357ke003', 'P357KhepSan', { x: 810, y: 1225, soul: { lives: 1, relics: { hoa: 1 } } });
    chars['tk357med01'] = BASE('tk357med01', 'P357Thien', { x: 1252, y: 900 });
    chars['tk357bia01'] = BASE('tk357bia01', 'P357BiaKhac', { x: 1006, y: 2052 });
    // perk đầu kiếp: nhân vật đã tọa hóa, hồn đạt mốc Ẩn 3
    const DV_ALL = { gate_uhon: 2, gate_doianh: 2, dv_nhan: 2, dv_than: 2, dv_hoa: 2, dv_ma: 2, dv_quy: 2, dv_tien: 2, dv_long: 2, dv_ho: 2, dv_dieu: 2, dv_thu: 2, mm_q198_thu1: 2 };
    chars['tk357s1001'] = BASE('tk357s1001', 'P357KiepCu1', { dead: true, deadAt: '2026-11-08T00:00:00.000Z', achState: JSON.parse(JSON.stringify(AN_FULL)), soul: { lives: 1, secrets: {}, clues: { clue_dv_hoa: { st: 1, life: 1 } } } });
    chars['tk357s2001'] = BASE('tk357s2001', 'P357KiepCu2', { dead: true, deadAt: '2026-11-08T00:00:00.000Z', achState: JSON.parse(JSON.stringify(AN_FULL)), soul: { lives: 1, raceChoicePending: true, secrets: { gate_uhon: 2, gate_doianh: 2 }, clues: {} } });
    chars['tk357s3001'] = BASE('tk357s3001', 'P357KiepCu3', { dead: true, deadAt: '2026-11-08T00:00:00.000Z', achState: JSON.parse(JSON.stringify(AN_FULL)), soul: { lives: 1, secrets: { ...DV_ALL }, clues: {} } });
    chars['tk357s0001'] = BASE('tk357s0001', 'P357KiepCu0', { dead: true, deadAt: '2026-11-08T00:00:00.000Z', achState: { tiers: { ach_an_secret: 1 }, title: null, daoTich: 0, notified: {} }, soul: { lives: 1, secrets: {}, clues: {} } });
    fs.writeFileSync(path.join(DIR, 'characters.json'), JSON.stringify(chars));
    fs.writeFileSync(path.join(DIR, 'accounts.json'), '{}');
    fs.writeFileSync(path.join(DIR, 'world.json'), JSON.stringify({ totalMinutes: 3360, savedAt: Date.now() }));
    fs.writeFileSync(path.join(DIR, 'sessions.json'), '{}');
    await startServer(3716, '357a');

    // ---- Chân 1+2: kể chuyện bản rõ / bản mờ ----
    const cK = connect('tk357ke001'); await waitFor(() => cK.welcome, 20000);
    const r1 = await listen(cK, 'npc_cuky', 'ck_h1_nhanhoang');
    ok('chân 1a: nghe được đoạn Cụ Ký (bản rõ)', !!r1.read, JSON.stringify(r1));
    await waitFor(() => clueSt(cK, 'clue_dv_nhan') === 1, 6000);
    ok('chân 1b: bản rõ gắn manh mối di vật Nhân (st=1)', clueSt(cK, 'clue_dv_nhan') === 1, JSON.stringify(cluesOf(cK).map((x) => x.id)));
    ok('chân 1c: bản rõ gắn manh mối bia đá Chu Văn Đường (st=1)', clueSt(cK, 'clue_mm_q127_hid_048') === 1);
    const nClues1 = cluesOf(cK).length;
    const r1b = await listen(cK, 'npc_cuky', 'ck_h1_nhanhoang');
    await sleep(1200);
    // đoạn đã nghe BẢN RÕ thì storyAvailOf trả null -> server từ chối nghe lại (đúng thiết kế GĐ352); dù bị từ chối hay nghe lại được, số manh mối không đổi = không trùng
    ok('chân 1d: nghe lại không trùng manh mối', !!(r1b.read || r1b.err) && cluesOf(cK).length === nClues1, 'before=' + nClues1 + ' after=' + cluesOf(cK).length + ' r=' + JSON.stringify(r1b));
    const r2 = await listen(cK, 'npc_cuky', 'ck_h1_kinh');
    await sleep(1200);
    ok('chân 2: nghe BẢN MỜ (chưa đạt điều kiện) KHÔNG nhận manh mối của đoạn', !!r2.read && clueSt(cK, 'clue_dv_than') === 0 && clueSt(cK, 'clue_mm_q127_hid_038') === 0, JSON.stringify(r2.read || r2));

    // ---- Chân 3: manh mối tự khép + chuỗi di vật ----
    const cD = connect('tk357ke002'); await waitFor(() => cD.welcome, 20000);
    await listen(cD, 'npc_truonglang', 'tl_h1_tree');
    await waitFor(() => clueSt(cD, 'clue_dv_hoa') === 1, 6000);
    ok('chân 3a: Trưởng Làng gắn manh mối di vật Hoa (st=1) + đoàn xe làng', clueSt(cD, 'clue_dv_hoa') === 1 && clueSt(cD, 'clue_mm_q199_xe1') === 1, JSON.stringify(cluesOf(cD).map((x) => x.id + ':' + x.st)));
    await flyTo(cD, 1140, 1945, 40);
    const closed = await waitFor(() => clueSt(cD, 'clue_dv_hoa') === 2 ? true : null, 10000);
    ok('chân 3b: nhặt di vật Hoa -> manh mối TỰ KHÉP (st=2)', !!closed, JSON.stringify(cluesOf(cD).map((x) => x.id + ':' + x.st)));
    ok('chân 3c: nhặt di vật -> nhận thêm manh mối chuỗi về di vật khác (Nhân)', clueSt(cD, 'clue_dv_nhan') === 1, JSON.stringify(cluesOf(cD).map((x) => x.id)));

    // ---- Chân 4: điểm tìm trước -> manh mối vào st=2 ----
    const cS = connect('tk357ke003'); await waitFor(() => cS.welcome, 20000);
    await listen(cS, 'npc_truonglang', 'tl_h1_tree');
    await waitFor(() => clueSt(cS, 'clue_dv_hoa') === 2, 6000);
    ok('chân 4: di vật đã có sẵn -> manh mối Trưởng Làng vào sổ ở st=2 (kỷ niệm)', clueSt(cS, 'clue_dv_hoa') === 2, JSON.stringify(cluesOf(cS).map((x) => x.id + ':' + x.st)));

    // ---- Chân 5: thiền ----
    const cM = connect('tk357med01'); await waitFor(() => cM.welcome, 20000);
    cM.socket.emit('map_overview', {});
    const ovM = await waitFor(() => (cM.overviews.length ? cM.overviews[cM.overviews.length - 1] : null), 8000);
    const MM_ORDER = [['clue_mm_q127_hid_008', 'bat_quai_tran_do'], ['clue_mm_q127_hid_010', 'bich_ba_thanh'], ['clue_mm_q127_hid_018', 'bich_ba_thanh'], ['clue_mm_q127_hid_020', 'bich_ba_thanh'], ['clue_mm_q127_hid_022', 'bich_ba_thanh'], ['clue_mm_q127_hid_024', 'bich_ba_thanh'], ['clue_mm_q127_hid_026', 'but_mac_hien'], ['clue_mm_q127_hid_028', 'but_mac_hien']];
    const expectMed = ovM ? (MM_ORDER.find(([cid, mid]) => { const d = ovM.maps.find((x) => x.id === mid); return d && d.canEnter; }) || [])[0] : null;
    cM.socket.emit('meditate_toggle', {});
    const medGot = await waitFor(() => (cluesOf(cM).length === 1 ? cluesOf(cM)[0].id : null), 8000);
    ok('chân 5a: thiền ở Đạo Quán -> nhận đúng 1 manh mối, là điểm hợp cảnh đầu tiên theo thứ tự sổ (' + expectMed + ')', !!medGot && medGot === expectMed, 'got=' + medGot + ' expect=' + expectMed);
    cM.socket.emit('meditate_toggle', {}); await sleep(600); // dừng thiền
    cM.socket.emit('meditate_toggle', {}); await sleep(1500); // thiền lại cùng ngày
    ok('chân 5b: thiền lại cùng ngày game -> không thêm manh mối (trần 1/ngày)', cluesOf(cM).length === 1, 'n=' + cluesOf(cM).length);
    const fMed = JSON.parse(fs.readFileSync(path.join(DIR, 'characters.json'), 'utf8'))['tk357med01'];
    ok('chân 5c: cờ medClueDay đã ghi trong file', !!(fMed && fMed.flags && typeof fMed.flags.medClueDay === 'number'), JSON.stringify(fMed && fMed.flags && fMed.flags.medClueDay));

    // ---- Chân 6: bia khắc ----
    const cB = connect('tk357bia01'); await waitFor(() => cB.welcome, 20000);
    const meHome = cB.maps[cB.maps.length - 1];
    ok('chân 6a: map_enter map nhà có 2 bia khắc (cổ thụ + nghĩa địa)', !!meHome && Array.isArray(meHome.steles) && meHome.steles.some((s) => s.id === 'stele_cothu') && meHome.steles.some((s) => s.id === 'stele_nghiadia'), JSON.stringify(meHome && meHome.steles));
    const e0 = cB.errs.length;
    cB.socket.emit('clue_stele_read', { id: 'stele_nghiadia' }); // đang đứng ở bia cổ thụ, cách bia nghĩa địa ~1550px
    await sleep(1000);
    ok('chân 6b: đọc bia từ xa bị chặn (lỗi khoảng cách, không có manh mối)', cB.errs.length > e0 && clueSt(cB, 'clue_dv_quy') === 0, JSON.stringify(cB.errs.slice(-1)));
    cB.socket.emit('clue_stele_read', { id: 'stele_cothu' });
    // handler đọc bia không kéo char_sync -> bằng chứng chính là FILE (grantClue persist ngay) + payload khi nối lại
    const biaFile1 = await waitFor(() => { const f = JSON.parse(fs.readFileSync(path.join(DIR, 'characters.json'), 'utf8'))['tk357bia01']; return f && f.soul && f.soul.clues && f.soul.clues.clue_dv_ma ? f.soul.clues.clue_dv_ma : null; }, 6000);
    ok('chân 6c: đọc bia cổ thụ -> manh mối di vật Ma ghi vào hồn (st=1, trong file)', !!biaFile1 && biaFile1.st === 1, JSON.stringify(biaFile1));
    ok('chân 6d: notice hiện từ khóa khắc trên bia (THIÊN MỆNH)', cB.notices.some((t) => t.includes('THIÊN MỆNH')), JSON.stringify(cB.notices.slice(-3)));
    cB.socket.emit('clue_stele_read', { id: 'stele_cothu' });
    await sleep(1200);
    const fBia2 = JSON.parse(fs.readFileSync(path.join(DIR, 'characters.json'), 'utf8'))['tk357bia01'];
    ok('chân 6e: đọc lại bia không trùng manh mối + notice báo đã có trong sổ', !!fBia2 && !!fBia2.soul && Object.keys(fBia2.soul.clues || {}).filter((k) => k === 'clue_dv_ma').length === 1 && cB.notices.some((t) => t.includes('đã nằm trong sổ')), 'clues=' + JSON.stringify(fBia2 && fBia2.soul && Object.keys(fBia2.soul.clues || {})));
    cB.socket.disconnect(); await sleep(500);
    const cB2 = connect('tk357bia01'); await waitFor(() => cB2.welcome, 20000);
    ok('chân 6f: nối lại -> secretsView hiện manh mối bia (st=1)', clueSt(cB2, 'clue_dv_ma') === 1, JSON.stringify(cluesOf(cB2).map((x) => x.id)));
    cB2.socket.disconnect();

    // ---- Chân 7: perk đầu kiếp ----
    async function createLife(token, name, extraData) {
      const c = connect(token);
      await waitFor(() => c.needChar, 20000);
      c.socket.emit('talent_pick', { tier: 'vo', id: 'suc_luc' }); // GĐ337: phải định thiên phú trước khi tạo nhân vật
      await sleep(400);
      c.socket.emit('create_character', Object.assign({ name, classId: 'kiemtu' }, extraData || {}));
      await waitFor(() => c.welcome, 20000);
      return c;
    }
    const c1 = await createLife('tk357s1001', 'P357KiepMoi1');
    const cl1 = c1.welcome ? cluesOf(c1) : [];
    ok('chân 7a: S1 còn cổng chưa tìm -> seed = manh mối cổng U Hồn (st=1)', cl1.some((x) => x.id === 'clue_gate_uhon' && x.st === 1), JSON.stringify(cl1.map((x) => x.id)));
    ok('chân 7b: S1 manh mối kiếp trước (Hoa) GIỮ NGUYÊN qua kiếp (F5), tổng đúng 2 manh mối', cl1.length === 2 && cl1.some((x) => x.id === 'clue_dv_hoa'), JSON.stringify(cl1.map((x) => x.id)));
    const f1 = JSON.parse(fs.readFileSync(path.join(DIR, 'characters.json'), 'utf8'))['tk357s1001'];
    ok('chân 7c: S1 Kiếp Ký trong file có dòng ghi chú manh mối đầu kiếp', !!(f1 && f1.soul && Array.isArray(f1.soul.lifeLog) && f1.soul.lifeLog.some((e) => e.note && e.note.includes('manh mối'))), JSON.stringify(f1 && f1.soul && f1.soul.lifeLog));
    ok('chân 7d: S1 nhận được notice manh mối đầu kiếp', c1.notices.some((t) => t.includes('manh mối chưa khép')), JSON.stringify(c1.notices.slice(-3)));
    const c2 = await createLife('tk357s2001', 'P357KiepMoi2', { race: 'long' });
    const cl2 = c2.welcome ? cluesOf(c2) : [];
    ok('chân 7e: S2 hết cổng + chọn tộc Long -> seed = manh mối di vật Long (ưu tiên tộc kiếp mới)', cl2.length === 1 && cl2[0].id === 'clue_dv_long', JSON.stringify(cl2.map((x) => x.id)) + ' race=' + (c2.welcome && c2.welcome.character.race));
    const c3 = await createLife('tk357s3001', 'P357KiepMoi3');
    const cl3 = c3.welcome ? cluesOf(c3) : [];
    c3.socket.emit('map_overview', {});
    const ov3 = await waitFor(() => (c3.overviews.length ? c3.overviews[c3.overviews.length - 1] : null), 8000);
    const MM_ALL = [['clue_mm_q127_hid_008', 'mm_q127_hid_008', 'bat_quai_tran_do'], ['clue_mm_q127_hid_010', 'mm_q127_hid_010', 'bich_ba_thanh'], ['clue_mm_q127_hid_018', 'mm_q127_hid_018', 'bich_ba_thanh'], ['clue_mm_q127_hid_020', 'mm_q127_hid_020', 'bich_ba_thanh'], ['clue_mm_q127_hid_022', 'mm_q127_hid_022', 'bich_ba_thanh'], ['clue_mm_q127_hid_024', 'mm_q127_hid_024', 'bich_ba_thanh'], ['clue_mm_q127_hid_026', 'mm_q127_hid_026', 'but_mac_hien'], ['clue_mm_q127_hid_028', 'mm_q127_hid_028', 'but_mac_hien'], ['clue_mm_q127_hid_030', 'mm_q127_hid_030', 'but_mac_hien'], ['clue_mm_q127_hid_032', 'mm_q127_hid_032', 'but_mac_hien'], ['clue_mm_q127_hid_034', 'mm_q127_hid_034', 'bach_lo_thanh'], ['clue_mm_q127_hid_036', 'mm_q127_hid_036', 'bach_lo_thanh'], ['clue_mm_q127_hid_038', 'mm_q127_hid_038', 'bach_lo_thanh'], ['clue_mm_q127_hid_040', 'mm_q127_hid_040', 'bach_lo_thanh'], ['clue_mm_q127_hid_044', 'mm_q127_hid_044', 'bach_ho_thanh'], ['clue_mm_q127_hid_046', 'mm_q127_hid_046', 'chu_van_duong'], ['clue_mm_q127_hid_048', 'mm_q127_hid_048', 'chu_van_duong'], ['clue_mm_q127_hid_050', 'mm_q127_hid_050', 'bach_lo_thanh'], ['clue_mm_q127_hid_042', 'mm_q127_hid_042', 'bach_ho_thanh'], ['clue_mm_q198_thu1', 'mm_q198_thu1', 'lang_tan_thu'], ['clue_mm_q199_xe1', 'mm_q199_xe1', 'lang_tan_thu']];
    const expectS3 = ov3 ? (MM_ALL.find(([cid, pid, mid]) => { if (DV_ALL[pid]) return false; if (mid === 'lang_tan_thu') return true; const d = ov3.maps.find((x) => x.id === mid); return d && d.canEnter; }) || [])[0] : null;
    ok('chân 7f: S3 hết cổng + hết di vật -> seed = điểm nhiệm vụ ẩn hợp cảnh đầu tiên (' + expectS3 + ')', cl3.length === 1 && cl3[0].id === expectS3, 'got=' + JSON.stringify(cl3.map((x) => x.id)) + ' expect=' + expectS3);
    const c0 = await createLife('tk357s0001', 'P357KiepMoi0');
    const cl0 = c0.welcome ? cluesOf(c0) : [];
    ok('chân 7g: S0 hồn DƯỚI mốc Ẩn 3 -> 0 manh mối đầu kiếp', !!c0.welcome && cl0.length === 0, JSON.stringify(cl0.map((x) => x.id)));

    for (const c of [cK, cD, cS, cM, cB, c1, c2, c3, c0]) { try { c.socket.disconnect(); } catch (e) {} }
    await sleep(600);
    await stopServer();
    console.log(`=== GĐ357: ${pass} PASS / ${fail} FAIL ===`);
    process.exit(fail ? 1 : 0);
  } catch (e) { console.error('PROBE CRASH', e); try { await stopServer(); } catch (e2) {} process.exit(2); }
})();
