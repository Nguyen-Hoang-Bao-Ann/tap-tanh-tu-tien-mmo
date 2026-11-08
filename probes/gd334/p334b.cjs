// Probe GĐ334-B — CHUẨN HÓA TỰ ĐỘNG: pháp lệch mạnh k<1 (PI/k trên payload + máu tối đa sau chuẩn hóa đo thật),
// pháp yếu k>1 (hệ số chiến kỹ trên payload + sát thương đòn thường của tâm pháp), pháp trong biên k=1, không định hình phong khi tổng trục < 30.
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const net = require('net');
const ROOT = path.join(__dirname, '..', '..');
const PORT = 3575;
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
  serverProc.stderr.on('data', (d) => { try { fs.appendFileSync(path.join(DIR, 'srv_b.log'), d); } catch (e) {} });
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
const meOf = (c) => (c.state?.players || []).find((p) => p.name === c.myName) || (c.state?.players || []).find((p) => p.id === c.welcome.id); // dò theo TÊN: socket reconnect làm welcome.id cũ
const monsOf = (c) => c.state?.monsters || [];
async function flyTo(c, x, y, tol) {
  c.socket.emit('fly_toggle', {}); await sleep(350);
  const t0 = Date.now();
  while (Date.now() - t0 < 30000) { const me = meOf(c); if (!me) { await sleep(120); continue; } const dx = x - me.x, dy = y - me.y; const d = Math.hypot(dx, dy); if (d <= (tol || 45)) break; c.socket.emit('client_input', { vx: dx / d, vy: dy / d }); await sleep(110); }
  c.socket.emit('client_input', { vx: 0, vy: 0 });
  c.socket.emit('fly_toggle', {}); await sleep(450);
}
// đòn thường ĐẦU TIÊN lên 1 con Huyết Lang nguyên vẹn; trả về lượng máu rơi (0 = hụt/không đo được)
async function firstHitDrop(c) { // sói nguyên vẹn GẦN NHẤT; bám vị trí sống, đánh lại tới khi trúng (đòn thường tầm gần rất dễ hụt khi quái di chuyển)
  const me = meOf(c); if (!me) return 0;
  const ws = monsOf(c).filter((m) => m.kind === 'huyetlang' && m.hp >= (m.maxHp || 9999) - 1).sort((a, b) => Math.hypot(a.x - me.x, a.y - me.y) - Math.hypot(b.x - me.x, b.y - me.y));
  const w = ws[0]; if (!w) return 0;
  for (let t = 0; t < 5; t++) {
    const live = monsOf(c).find((m) => m.id === w.id); if (!live) return 0;
    await flyTo(c, live.x, live.y, 30);
    const before = (monsOf(c).find((m) => m.id === w.id) || {}).hp;
    if (before == null) return 0;
    c.socket.emit('player_attack'); await sleep(650);
    const after = (monsOf(c).find((m) => m.id === w.id) || {}).hp;
    if (after == null) return before;
    if (after < before) return before - after;
  }
  return 0;
}
const median = (a) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : 0; };
async function castAndMeasure(c, slot) { // GĐ334: cast_result của server mang sẵn dmg của đòn — đo trực tiếp theo đích, không diff toàn map
  const castAt = c.casts.length;
  c.socket.emit('cast_skill', { slot });
  const res = await waitFor(() => c.casts.length > castAt && c.casts[c.casts.length - 1], 4000);
  if (!res || !res.ok) return { res, drop: 0 };
  return { res, drop: res.dmg || 0 };
}
(async () => {
  const chars = {
    p334c20001: BASE('p334c20001', ' ChuB334', { realm: 'ht', stonesThuong: 1000, inventory: { ngoc_gian_trong: 10, da_quy: 10, tien_linh_chi: 5, linh_thao: 40 } }),
    p334m20001: BASE('p334m20001', ' DeTuB334', { stats: { khiHuyet: 500, vatCong: 100, vatPhong: 100, phapCong: 100, phapPhong: 100, tocDo: 60, minhMan: 60 }, inventory: { da_quy: 300 }, skills: ['kiemtu_1'], equipped: ['kiemtu_1'] }),
  };
  fs.writeFileSync(path.join(DIR, 'characters.json'), JSON.stringify(chars));
  const sects = [SECT('sb', 'Tông Chuẩn Hóa', [
    { token: 'p334c20001', name: ' ChuB334', role: 'chu', contrib: 0 },
    { token: 'p334m20001', name: ' DeTuB334', role: 'detu', contrib: 5000 },
  ], { fund: 200000, uy: 300, level: 5, hq: { mapId: 'huyet_sac_rung', x: 4248, y: 2900 }, buildings: [{ kind: 'tangkinh', name: 'Tàng Kinh Các', x: 4248, y: 3000, lv: 3 }] })];
  fs.writeFileSync(path.join(DIR, 'world.json'), JSON.stringify({ totalMinutes: 100 * 1440, savedAt: Date.now(), sects }));
  await startServer();
  const C = await connect('p334c20001'); const M = await connect('p334m20001');
  async function createAndFinish(name, gradeId, comps, flawId, kind, daQuyDonate) {
    C.errors = []; C.socket.emit('sect_art_create', { name, gradeId, comps, flawId, kind }); await sleep(700);
    if (C.errors.length) return { err: C.errors.join(';') };
    for (const q of daQuyDonate) { M.socket.emit('sect_art_donate', { itemId: 'da_quy', qty: q }); await sleep(450); }
    await refresh(M);
    return { art: (mySect(M).arts || []).find((a) => a.name === name) || {} };
  }
  // B1: pháp Địa LỆCH MẠNH (dồn Công/Máu/Thiền/Tốc tối đa) — PI 416 > khung 340 -> k = 0,82
  const r1 = await createAndFinish('Địa Lệch Mạnh', 'dia', { cong: 5, mau: 4, thien: 5, toc: 3 }, 'f_che', 'tamphap', [99, 26]);
  ok('B1 phap lech manh: PI 416, k = 0,82 (payload co pi/k)', r1.art.status === 'done' && r1.art.pi === 416 && r1.art.k === 0.82, JSON.stringify(r1));
  // B2: chiến kỹ YẾU (chỉ Tầm, khuyết Thế Yếu) — PI 29 -> k chạm trần 1,40; hệ số 0,6 x 1,4 = 0,84
  const r2 = await createAndFinish('Kỹ Yếu Tầm Xa', 'pham', { tam: 4 }, 'f_yeu', 'chienky', [13]);
  ok('B2 chien ky yeu: PI 29, k = 1,40, he so sau chuan hoa 0,84', r2.art.status === 'done' && r2.art.pi === 29 && r2.art.k === 1.4 && r2.art.skill && r2.art.skill.coef === 0.84, JSON.stringify(r2.art && { pi: r2.art.pi, k: r2.art.k, skill: r2.art.skill }));
  // B3: pháp Phàm TRONG BIÊN — PI 110 (khung 90–110) -> k = 1
  const r3 = await createAndFinish('Phàm Trong Biên', 'pham', { cong: 4, mau: 2 }, 'f_toc', 'tamphap', [13]);
  ok('B3 phap trong bien: PI 110, k = 1 (dung khung)', r3.art.status === 'done' && r3.art.pi === 110 && r3.art.k === 1, JSON.stringify(r3.art && { pi: r3.art.pi, k: r3.art.k }));
  // B4: pháp Phàm YẾU (PI thô âm -> sàn 5) -> k = 1,40
  const r4 = await createAndFinish('Phàm Rất Yếu', 'pham', { mau: 2 }, 'f_cong', 'tamphap', [13]);
  ok('B4 phap rat yeu: PI san 5, k = 1,40', r4.art.status === 'done' && r4.art.pi === 5 && r4.art.k === 1.4, JSON.stringify(r4.art && { pi: r4.art.pi, k: r4.art.k }));
  // B5: tổng trục 28,34 < 30 -> Tông Phong CHƯA định hình
  await refresh(M);
  ok('B5 tong truc < 30 -> phong chua dinh hinh', mySect(M).phong && mySect(M).phong.formed === false && Math.abs((mySect(M).phong.total || 0) - 28.3) < 0.2, JSON.stringify(mySect(M).phong));
  // B6: đo MÁU TỐI ĐA — vận hành pháp Địa (Máu 4 bậc): chưa chuẩn hóa sẽ +4,00%, sau chuẩn hóa +3,28%
  M.socket.emit('sect_art_learn', { artId: r1.art.id }); await sleep(700);
  const h0 = (M.sync || {}).maxHp;
  M.socket.emit('sect_art_toggle', { artId: r1.art.id }); await sleep(800);
  const h1 = (M.sync || {}).maxHp;
  const expN = Math.round(h0 * 1.0328), expRaw = Math.round(h0 * 1.04);
  ok('B6 mau toi da sau chuan hoa +3,28% (khong phai +4% tho)', Math.abs(h1 - expN) <= 1 && h1 !== expRaw, `H0=${h0} H1=${h1} expChuan=${expN} expTho=${expRaw}`);
  M.socket.emit('sect_art_toggle', { artId: r1.art.id }); await sleep(600);
  // B7: đo MÁU TỐI ĐA — vận hành pháp yếu (Máu 2 bậc, k 1,4): +2,8% thay vì +2,0% (kênh tất định qua char_sync, như B6; kênh sát thương bị nhiễu Ngộ Kiếm)
  M.socket.emit('sect_art_learn', { artId: r4.art.id }); await sleep(700);
  const g0 = (M.sync || {}).maxHp;
  M.socket.emit('sect_art_toggle', { artId: r4.art.id }); await sleep(800);
  const g1 = (M.sync || {}).maxHp;
  const expG = Math.round(g0 * 1.028), expGRaw = Math.round(g0 * 1.02);
  ok('B7 mau toi da phap yeu sau chuan hoa +2,8% (khong phai +2,0% tho)', Math.abs(g1 - expG) <= 1 && g1 !== expGRaw, `G0=${g0} G1=${g1} expChuan=${expG} expTho=${expGRaw}`);
  M.socket.emit('sect_art_toggle', { artId: r4.art.id }); await sleep(500);
  // B8: chiến kỹ yếu tung thật — sát thương ~0,84 chiêu cơ bản
  M.socket.emit('sect_art_learn', { artId: r2.art.id }); await sleep(700);
  M.socket.emit('equip_skill', { skillId: 'art:' + r2.art.id }); await sleep(800);
  const skList = (M.sync && M.sync.skills) || [];
  const baseSlot = skList.findIndex((x) => x.id === 'kiemtu_1');
  const artSlot = skList.findIndex((x) => x.id === 'art:' + r2.art.id);
  console.log('DBG B8 slots:', JSON.stringify({ baseSlot, artSlot, skills: skList.map((x) => x.id) }));
  async function castFresh(slot) {
    const me = meOf(M); if (!me) return { res: null, drop: 0 };
    const ws = monsOf(M).filter((m) => m.kind === 'huyetlang' && m.hp >= (m.maxHp || 9999) - 1).sort((a, b) => Math.hypot(a.x - me.x, a.y - me.y) - Math.hypot(b.x - me.x, b.y - me.y));
    const w = ws[0]; if (!w) return { res: null, drop: 0 };
    await flyTo(M, w.x, w.y, 55);
    return castAndMeasure(M, slot);
  }
  const cb = []; for (let i = 0; i < 2; i++) { const r = await castFresh(baseSlot); if (r.drop > 0) cb.push(r.drop); await sleep(1300); }
  const ca = []; for (let i = 0; i < 2; i++) { const r = await castFresh(artSlot); console.log('DBG B8 art cast:', JSON.stringify(r.res)); if (r.drop > 0) ca.push(r.drop); await sleep(6500); }
  const ratio8 = cb.length && ca.length ? Math.min(...ca) / Math.min(...cb) : 0;
  ok('B8 chien ky yeu danh that ~0,84 chieu co ban', ratio8 >= 0.72 && ratio8 <= 0.97, `base=${JSON.stringify(cb)} art=${JSON.stringify(ca)} ratio=${ratio8.toFixed(2)}`);
  C.socket.disconnect(); M.socket.disconnect();
  await stopServer();
  console.log(`\n== p334b: ${pass} PASS, ${fail} FAIL ==`);
  process.exit(fail ? 1 : 0);
})();
