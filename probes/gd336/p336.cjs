// Probe GĐ336 — KHUNG PI RIÊNG CHO CHIẾN KỸ (SECT_ART_PI_BAND_CK {pham 143, linh 250, huyen 350, dia 400, thien 410}):
// A) tạo mới: (a) CK Thiên ghép tốt PI 319 — k cũ kẹp 1,40 -> k mới 1,29 (không kẹp) · (d) CK Thiên PI 360 -> k 1,14 + đo dmg cast thật ~x3,19
//    (c) CK Phàm cực mạnh PI 199 -> k 0,72 (kéo xuống theo công thức, khung cũ kẹp 0,65) · (b) CK Phàm rất yếu PI 29 -> vẫn nâng k 1,40 (quá yếu thì vẫn kẹp trần)
//    (e) Tâm pháp Phàm PI 110 -> k 1, band 100 (khung TÂM PHÁP không đổi) · (f) payload band CK = 410 · Tông Phong tính theo k mới
// B) hồi tố: tông fixture có sẵn CK k-cũ (Thiên 1,40 / Linh 0,65) + TP k 0,82 -> nạp lại: CK tính lại (1,29 / 0,87), TP GIỮ NGUYÊN 0,82, phong khớp k mới
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const net = require('net');
const ROOT = path.join(__dirname, '..', '..');
const PORT = 3590;
const DIR = __dirname;
const { io } = require(path.join(ROOT, 'client/node_modules/socket.io-client'));
const { createMerger } = require(path.join(ROOT, 'client/worldmerge.cjs'));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function waitFor(fn, ms) { const t0 = Date.now(); while (Date.now() - t0 < ms) { const v = fn(); if (v) return v; await sleep(150); } return null; }
function portFree(port) { return new Promise((res) => { const s = net.createServer(); s.once('error', () => res(false)); s.listen(port, () => s.close(() => res(true))); }); }
let serverProc = null, killTimer = null;
async function startServer() {
  if (!(await portFree(PORT))) throw new Error('port ban');
  serverProc = spawn('node', ['server/index.js'], { cwd: ROOT, env: { ...process.env, PORT: String(PORT), TTT_STORAGE: 'file', TTT_CHAR_FILE: path.join(DIR, 'characters.json'), TTT_ACC_FILE: path.join(DIR, 'accounts.json'), TTT_WORLD_FILE: path.join(DIR, 'world.json'), TTT_SESS_FILE: path.join(DIR, 'sessions.json'), TTT_DAY_REAL_MS: '600000', TTT_TUVI_NEED: '5' }, stdio: ['ignore', 'pipe', 'pipe'] });
  serverProc.stderr.on('data', (d) => { try { fs.appendFileSync(path.join(DIR, 'srv_336.log'), d); } catch (e) {} });
  killTimer = setTimeout(() => { try { serverProc.kill('SIGKILL'); } catch (e) {} }, 60000);
  const t0 = Date.now();
  while (Date.now() - t0 < 45000) { try { const r = await fetch(`http://127.0.0.1:${PORT}/api/status`); if (r.ok) { clearTimeout(killTimer); return; } } catch (e) {} await sleep(500); }
  throw new Error('server khong len');
}
async function stopServer() { if (!serverProc) return; const p = serverProc; serverProc = null; await new Promise((res) => { const t = setTimeout(() => { try { p.kill('SIGKILL'); } catch (e) {} res(); }, 4000); p.once('exit', () => { clearTimeout(t); res(); }); try { p.kill('SIGTERM'); } catch (e) { clearTimeout(t); res(); } }); const t0 = Date.now(); while (Date.now() - t0 < 10000 && !(await portFree(PORT))) await sleep(300); }
function BASE(token, name, extra) {
  return Object.assign({ token, name, classId: 'kiemtu', gender: 'nam', race: null, geo175: 1, realm: 'kd', tier: 1, x: 4248, y: 2950, mapId: 'huyet_sac_rung', hp: 99999, lifespan: 500, birthDay: -5660, ageStart: 16, stats: { khiHuyet: 500, vatCong: 100, vatPhong: 100, phapCong: 100, phapPhong: 100, tocDo: 60, minhMan: 60 }, statPoints: 0, freePoints: 0, tuVi: 0, stones: 0, stonesTrung: 0, stonesThuong: 0, stonesCuc: 0, inventory: {}, gearBag: {}, equipped: [], skills: [], job: null, job2: null, job3: null, linhCan: { element: 'hoa', grade: 'trung', mult: 1.2 }, affinity: {}, affV2: 1, bonds: {}, quests: {}, questsDone: {}, flags: {}, counters: {}, disciples: [], foundInvites: [], reformIn: [], sectTech: [], sectArts: [], sectArtsActive: [], mails: [], classRes: {} }, extra || {});
}
function SECT(id, name, members, extra) { return Object.assign({ id, name, intro: '', fund: 0, level: 1, uy: 0, members, applicants: [], activeQuests: [], territories: [], territory: null, warehouse: [], garden: [], depts: {}, tributeDay: 100, upkeepDay: 100, questDay: 100, artDay: 100, debtDays: 0, arts: [], honor: [] }, extra || {}); }
let pass = 0, fail = 0;
function ok(name, cond, extra) { if (cond) { pass++; console.log('PASS | ' + name); } else { fail++; console.log('FAIL | ' + name + (extra ? ' | ' + extra : '')); } }
async function connect(token) {
  const socket = io(`http://127.0.0.1:${PORT}`, { transports: ['websocket'] });
  const ctx = { socket, merger: createMerger(), state: null, welcome: null, sect: null, sync: null, errors: [], casts: [] };
  socket.on('connect', () => socket.emit('hello', { token }));
  socket.on('welcome', (w) => { ctx.welcome = w; ctx.myName = (w.character || {}).name; });
  socket.on('server_tick', (t) => { const st = ctx.merger(t); if (st) ctx.state = st; });
  socket.on('sect_state', (st) => { ctx.sect = st; });
  socket.on('char_sync', (sy) => { ctx.sync = sy; });
  socket.on('interact_error', (e) => ctx.errors.push(e.message || ''));
  socket.on('cast_result', (r) => ctx.casts.push(r));
  await waitFor(() => ctx.welcome, 20000);
  socket.emit('sect_get');
  await waitFor(() => ctx.sect, 10000);
  return ctx;
}
const mySect = (c) => c.sect && c.sect.mySect;
async function refresh(c) { c.socket.emit('sect_get'); await sleep(500); }
const meOf = (c) => (c.state?.players || []).find((p) => p.name === c.myName) || (c.state?.players || []).find((p) => p.id === c.welcome.id);
const monsOf = (c) => c.state?.monsters || [];
async function flyTo(c, x, y, tol) {
  c.socket.emit('fly_toggle', {}); await sleep(350);
  const t0 = Date.now();
  while (Date.now() - t0 < 30000) { const me = meOf(c); if (!me) { await sleep(120); continue; } const dx = x - me.x, dy = y - me.y; const d = Math.hypot(dx, dy); if (d <= (tol || 45)) break; c.socket.emit('client_input', { vx: dx / d, vy: dy / d }); await sleep(110); }
  c.socket.emit('client_input', { vx: 0, vy: 0 });
  c.socket.emit('fly_toggle', {}); await sleep(450);
}
async function castAndMeasure(c, slot) {
  const castAt = c.casts.length;
  c.socket.emit('cast_skill', { slot });
  const res = await waitFor(() => c.casts.length > castAt && c.casts[c.casts.length - 1], 4000);
  if (!res || !res.ok) return { res, drop: 0 };
  return { res, drop: res.dmg || 0 };
}
(async () => {
  const chars = {
    p336c10001: BASE('p336c10001', ' ChuA336', { realm: 'ht', stonesThuong: 3000, inventory: { ngoc_gian_trong: 20, da_quy: 100, tien_linh_chi: 20, linh_thao: 40 } }),
    p336m10001: BASE('p336m10001', ' DeTuA336', { inventory: { da_quy: 3000 }, skills: ['kiemtu_1'], equipped: ['kiemtu_1'] }),
    p336c20002: BASE('p336c20002', ' ChuB336', { realm: 'ht' }),
    p336m20002: BASE('p336m20002', ' DeTuB336', {}),
  };
  fs.writeFileSync(path.join(DIR, 'characters.json'), JSON.stringify(chars));
  const hqB = { mapId: 'huyet_sac_rung', x: 4248, y: 2900 };
  const tkB = [{ kind: 'tangkinh', name: 'Tàng Kinh Các', x: 4248, y: 3000, lv: 3 }];
  const sects = [
    SECT('sa336', 'Tông Khung Riêng', [
      { token: 'p336c10001', name: ' ChuA336', role: 'chu', contrib: 0 },
      { token: 'p336m10001', name: ' DeTuA336', role: 'detu', contrib: 5000 },
    ], { fund: 500000, uy: 300, level: 5, hq: hqB, buildings: tkB }),
    SECT('sb336', 'Tông Hồi Tố', [
      { token: 'p336c20002', name: ' ChuB336', role: 'chu', contrib: 0 },
      { token: 'p336m20002', name: ' DeTuB336', role: 'detu', contrib: 5000 },
    ], { fund: 100000, uy: 300, level: 5, hq: hqB, buildings: tkB, _gd334init: true, arts: [
      { id: 'b336a1', name: 'Thiên Hồi Tố', grade: 'thien', gradeName: 'Thiên cấp', creator: 'p336c20002', creatorName: ' ChuB336', element: 'hoa', comps: { sat: 5, dien: 1, tam: 2 }, flaw: 'f_cd', kind: 'chienky', status: 'done', progress: 2000, need: 2000, k: 1.4, day: 1 },
      { id: 'b336a2', name: 'Địa Tâm Hồi Tố', grade: 'dia', gradeName: 'Địa cấp', creator: 'p336c20002', creatorName: ' ChuB336', element: 'hoa', comps: { cong: 5, mau: 4, thien: 5, toc: 3 }, flaw: 'f_che', kind: 'tamphap', status: 'done', progress: 1000, need: 1000, k: 0.82, day: 1 },
      { id: 'b336a3', name: 'Linh Hồi Tố', grade: 'linh', gradeName: 'Linh cấp', creator: 'p336c20002', creatorName: ' ChuB336', element: 'hoa', comps: { sat: 5, dien: 1 }, flaw: 'f_mp', kind: 'chienky', status: 'done', progress: 250, need: 250, k: 0.65, day: 1 },
    ] }),
  ];
  fs.writeFileSync(path.join(DIR, 'world.json'), JSON.stringify({ totalMinutes: 100 * 1440, savedAt: Date.now(), sects }));
  await startServer();

  // ===== PHẦN B: HỒI TỐ (nạp tông có sẵn k cũ) =====
  const MB = await connect('p336m20002');
  await refresh(MB);
  const bArts = (mySect(MB).arts || []);
  const b1 = bArts.find((a) => a.id === 'b336a1') || {};
  const b2 = bArts.find((a) => a.id === 'b336a2') || {};
  const b3 = bArts.find((a) => a.id === 'b336a3') || {};
  ok('B1 hoi to CK Thien: PI 319, k 1,40 -> 1,29, band 410', b1.pi === 319 && b1.k === 1.29 && b1.band === 410, JSON.stringify({ pi: b1.pi, k: b1.k, band: b1.band }));
  ok('B2 hoi to TP Dia: PI 416, k GIU NGUYEN 0,82, band 340 (khung tam phap)', b2.pi === 416 && b2.k === 0.82 && b2.band === 340, JSON.stringify({ pi: b2.pi, k: b2.k, band: b2.band }));
  ok('B3 hoi to CK Linh: PI 288, k 0,65 -> 0,87, band 250', b3.pi === 288 && b3.k === 0.87 && b3.band === 250, JSON.stringify({ pi: b3.pi, k: b3.k, band: b3.band }));
  const phB = mySect(MB).phong || {};
  ok('B4 Tong Phong hoi to khop k moi: congpha 17,1 · tong 29,5', Math.abs((phB.axes || {}).congpha - 17.1) <= 0.15 && Math.abs((phB.total || 0) - 29.5) <= 0.15, JSON.stringify(phB));
  MB.socket.disconnect();

  // ===== PHẦN A: TẠO MỚI =====
  const C = await connect('p336c10001'); const M = await connect('p336m10001');
  async function createAndFinish(name, gradeId, comps, flawId, kind, daQuyDonate) {
    C.errors = []; C.socket.emit('sect_art_create', { name, gradeId, comps, flawId, kind }); await sleep(700);
    if (C.errors.length) return { err: C.errors.join(';') };
    for (const q of daQuyDonate) { M.socket.emit('sect_art_donate', { itemId: 'da_quy', qty: q }); await sleep(450); }
    await refresh(M);
    return { art: (mySect(M).arts || []).find((a) => a.name === name) || {} };
  }
  // A1 (ca a + f): CK Thiên ghép tốt {sat5,dien1,tam2} f_cd — PI 319: khung cũ 460/319 = 1,44 kẹp 1,40; khung CK 410 -> k 1,29
  const r1 = await createAndFinish('Thiên Điển Hình', 'thien', { sat: 5, dien: 1, tam: 2 }, 'f_cd', 'chienky', [99, 99, 52]);
  ok('A1 CK Thien dien hinh: PI 319, k = 1,29 (het kep 1,40), band 410, coef 3,61', r1.art.status === 'done' && r1.art.pi === 319 && r1.art.k === 1.29 && r1.art.band === 410 && r1.art.skill && r1.art.skill.coef === 3.61, JSON.stringify(r1.art && { pi: r1.art.pi, k: r1.art.k, band: r1.art.band, coef: r1.art.skill && r1.art.skill.coef, err: r1.err }));
  // A2 (ca d): CK Thiên {sat5,dien1,hieu3} f_mp — PI 360 -> k 1,14; coef 2,8 x 1,14 = 3,19
  const r2 = await createAndFinish('Thiên Đo Dmg', 'thien', { sat: 5, dien: 1, hieu: 3 }, 'f_mp', 'chienky', [99, 99, 52]);
  ok('A2 CK Thien: PI 360, k = 1,14, coef 3,19', r2.art.status === 'done' && r2.art.pi === 360 && r2.art.k === 1.14 && r2.art.skill && r2.art.skill.coef === 3.19, JSON.stringify(r2.art && { pi: r2.art.pi, k: r2.art.k, coef: r2.art.skill && r2.art.skill.coef, err: r2.err }));
  // A3 (ca c): CK Phàm CỰC MẠNH {sat4,tam1} f_mp — PI 199 > khung CK 143x1,1: k = 143/199 = 0,72 (khung cũ kẹp sàn 0,65)
  const r3 = await createAndFinish('Phàm Cực Mạnh', 'pham', { sat: 4, tam: 1 }, 'f_mp', 'chienky', [13]);
  ok('A3 CK Pham cuc manh: PI 199, k = 0,72 (keo xuong theo cong thuc), coef 1,15', r3.art.status === 'done' && r3.art.pi === 199 && r3.art.k === 0.72 && r3.art.skill && r3.art.skill.coef === 1.15, JSON.stringify(r3.art && { pi: r3.art.pi, k: r3.art.k, coef: r3.art.skill && r3.art.skill.coef, err: r3.err }));
  // A4 (ca b): CK Phàm RẤT YẾU {tam4} f_yeu — PI 29: vẫn được nâng, k 1,40 (quá yếu nên vẫn kẹp trần — đúng thiết kế, ghi nhận)
  const r4 = await createAndFinish('Phàm Rất Yếu 336', 'pham', { tam: 4 }, 'f_yeu', 'chienky', [13]);
  ok('A4 CK Pham rat yeu: PI 29, k = 1,40 (van nang toi da), coef 0,84', r4.art.status === 'done' && r4.art.pi === 29 && r4.art.k === 1.4 && r4.art.skill && r4.art.skill.coef === 0.84, JSON.stringify(r4.art && { pi: r4.art.pi, k: r4.art.k, coef: r4.art.skill && r4.art.skill.coef, err: r4.err }));
  // A5 (ca e): TÂM PHÁP Phàm {cong4,mau2} f_toc — PI 110, khung TP cũ 100 -> trong biên, k = 1, band 100
  const r5 = await createAndFinish('Phàm Tâm Hồi Quy', 'pham', { cong: 4, mau: 2 }, 'f_toc', 'tamphap', [13]);
  ok('A5 TP Pham hoi quy: PI 110, k = 1, band 100 (khung tam phap KHONG doi)', r5.art.status === 'done' && r5.art.pi === 110 && r5.art.k === 1 && r5.art.band === 100, JSON.stringify(r5.art && { pi: r5.art.pi, k: r5.art.k, band: r5.art.band, err: r5.err }));
  // A6: Tông Phong của tông A tính theo k MỚI: congpha 21,5 · tổng 35,8 (k cũ sẽ ra congpha 22,7)
  await refresh(M);
  const phA = mySect(M).phong || {};
  ok('A6 Tong Phong theo k moi: congpha 21,5 · tong 35,8 · da dinh hinh', phA.formed === true && Math.abs((phA.axes || {}).congpha - 21.5) <= 0.15 && Math.abs((phA.total || 0) - 35.8) <= 0.15, JSON.stringify(phA));
  // A7 (ca d — đo thật): học + lắp CK A2, cast lên Huyết Lang nguyên vẹn, so cast_result.dmg với chiêu cơ bản (coef 1,0): kỳ vọng tỉ lệ ~3,19
  M.socket.emit('sect_art_learn', { artId: r2.art.id }); await sleep(700);
  M.socket.emit('equip_skill', { skillId: 'art:' + r2.art.id }); await sleep(800);
  const skList = (M.sync && M.sync.skills) || [];
  const baseSlot = skList.findIndex((x) => x.id === 'kiemtu_1');
  const artSlot = skList.findIndex((x) => x.id === 'art:' + r2.art.id);
  console.log('DBG A7 slots:', JSON.stringify({ baseSlot, artSlot }));
  async function castFresh(slot) {
    const me = meOf(M); if (!me) return { res: null, drop: 0 };
    const ws = monsOf(M).filter((m) => m.kind === 'huyetlang' && m.hp >= (m.maxHp || 9999) - 1).sort((a, b) => Math.hypot(a.x - me.x, a.y - me.y) - Math.hypot(b.x - me.x, b.y - me.y));
    const w = ws[0]; if (!w) return { res: null, drop: 0 };
    await flyTo(M, w.x, w.y, 55);
    return castAndMeasure(M, slot);
  }
  const cb = []; for (let i = 0; i < 2; i++) { const r = await castFresh(baseSlot); if (r.drop > 0) cb.push(r.drop); await sleep(1300); }
  const ca = []; for (let i = 0; i < 2; i++) { const r = await castFresh(artSlot); console.log('DBG A7 art cast:', JSON.stringify(r.res)); if (r.drop > 0) ca.push(r.drop); await sleep(13000); }
  const ratio = cb.length && ca.length ? Math.min(...ca) / Math.min(...cb) : 0;
  ok('A7 dmg cast that CK A2 ~3,19 lan chieu co ban (coef sau chuan hoa)', ratio >= 2.8 && ratio <= 3.6, `base=${JSON.stringify(cb)} art=${JSON.stringify(ca)} ratio=${ratio.toFixed(2)}`);
  C.socket.disconnect(); M.socket.disconnect();
  await stopServer();
  console.log(`\n== p336: ${pass} PASS, ${fail} FAIL ==`);
  process.exit(fail ? 1 : 0);
})().catch(async (e) => { console.error('PROBE CRASH', e); try { await stopServer(); } catch (x) {} process.exit(2); });
