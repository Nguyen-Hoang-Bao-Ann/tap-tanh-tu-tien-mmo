// Probe GĐ328 — Sáng tạo công pháp tông môn đợt 1: quyền tạo + Danh Dự, ngân sách, chi phí, ngộ pháp, học/vận hành, hiệu ứng đo bằng sát thương.
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const net = require('net');
const ROOT = path.join(__dirname, '..', '..');
const PORT = 3568;
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
  serverProc.stderr.on('data', (d) => process.stderr.write('[srv] ' + d));
  killTimer = setTimeout(() => { try { serverProc.kill('SIGKILL'); } catch (e) {} }, 60000);
  const t0 = Date.now();
  while (Date.now() - t0 < 45000) { try { const r = await fetch(`http://127.0.0.1:${PORT}/api/status`); if (r.ok) { clearTimeout(killTimer); return; } } catch (e) {} await sleep(500); }
  throw new Error('server khong len');
}
async function stopServer() { if (!serverProc) return; const p = serverProc; serverProc = null; await new Promise((res) => { const t = setTimeout(() => { try { p.kill('SIGKILL'); } catch (e) {} res(); }, 4000); p.once('exit', () => { clearTimeout(t); res(); }); try { p.kill('SIGTERM'); } catch (e) { clearTimeout(t); res(); } }); const t0 = Date.now(); while (Date.now() - t0 < 10000 && !(await portFree(PORT))) await sleep(300); }
function BASE(token, name, extra) {
  return Object.assign({ token, name, classId: 'kiemtu', gender: 'nam', race: null, geo175: 1, realm: 'kd', tier: 1, x: 4248, y: 2950, mapId: 'huyet_sac_rung', hp: 99999, lifespan: 500, birthDay: -5660, ageStart: 16, stats: { khiHuyet: 500, vatCong: 100, vatPhong: 100, phapCong: 100, phapPhong: 100, tocDo: 60, minhMan: 60 }, statPoints: 0, freePoints: 0, tuVi: 0, stones: 0, stonesTrung: 0, stonesThuong: 0, stonesCuc: 0, inventory: {}, gearBag: {}, equipped: [], skills: [], job: null, job2: null, job3: null, linhCan: { element: 'hoa', grade: 'trung', mult: 1.2 }, affinity: {}, affV2: 1, bonds: {}, quests: {}, questsDone: {}, flags: {}, counters: {}, disciples: [], foundInvites: [], reformIn: [], sectTech: [], sectArts: [], sectArtsActive: [], mails: [], classRes: {} }, extra || {});
}
function SECT(id, name, members, extra) { return Object.assign({ id, name, intro: '', fund: 0, level: 1, uy: 0, members, applicants: [], activeQuests: [], territories: [], territory: null, warehouse: [], garden: [], depts: {}, tributeDay: 100, upkeepDay: 100, questDay: 100, artDay: 100, debtDays: 0 }, extra || {}); }
let pass = 0, fail = 0;
function ok(name, cond, extra) { if (cond) { pass++; console.log('PASS | ' + name); } else { fail++; console.log('FAIL | ' + name + (extra ? ' | ' + extra : '')); } }
async function connect(token) {
  const socket = io(`http://127.0.0.1:${PORT}`, { transports: ['websocket'] });
  const ctx = { socket, merger: createMerger(), state: null, welcome: null, sect: null, sync: null, errors: [] };
  socket.on('connect', () => socket.emit('hello', { token }));
  socket.on('welcome', (w) => { ctx.welcome = w; });
  socket.on('server_tick', (t) => { const st = ctx.merger(t); if (st) ctx.state = st; });
  socket.on('sect_state', (st) => { ctx.sect = st; });
  socket.on('char_sync', (sy) => { ctx.sync = sy; });
  socket.on('interact_error', (e) => ctx.errors.push(e.message || ''));
  await waitFor(() => ctx.welcome, 20000);
  socket.emit('sect_get');
  await waitFor(() => ctx.sect, 10000);
  return ctx;
}
const mySect = (c) => c.sect && c.sect.mySect;
async function refresh(c) { c.socket.emit('sect_get'); await sleep(450); }
const meOf = (c) => (c.state?.players || []).find((p) => p.id === c.welcome.id);
const monsOf = (c) => c.state?.monsters || [];
async function flyTo(c, x, y, tol) {
  c.socket.emit('fly_toggle', {}); await sleep(350);
  const t0 = Date.now();
  while (Date.now() - t0 < 30000) { const me = meOf(c); if (!me) { await sleep(120); continue; } const dx = x - me.x, dy = y - me.y; const d = Math.hypot(dx, dy); if (d <= (tol || 45)) break; c.socket.emit('client_input', { vx: dx / d, vy: dy / d }); await sleep(110); }
  c.socket.emit('client_input', { vx: 0, vy: 0 });
  c.socket.emit('fly_toggle', {}); await sleep(450);
}
async function sampleDealt(c, n) {
  const drops = []; const t0 = Date.now(); let tid = null, last = null;
  while (Date.now() - t0 < 50000 && drops.length < n) {
    const ms = monsOf(c).filter((m) => m.kind === 'huyetlang' && (m.hp || 0) > 0);
    if (!tid) { const full = ms.filter((m) => m.hp >= (m.maxHp || 9999) - 1); if (!full.length) { await sleep(250); continue; } tid = full[0].id; last = full[0].hp; await flyTo(c, full[0].x, full[0].y, 40); continue; }
    const t = monsOf(c).find((m) => m.id === tid);
    if (!t) { tid = null; continue; }
    const me = meOf(c); const d = Math.hypot(t.x - me.x, t.y - me.y);
    if (d > 62) { c.socket.emit('client_input', { vx: (t.x - me.x) / d, vy: (t.y - me.y) / d }); await sleep(110); continue; }
    c.socket.emit('client_input', { vx: 0, vy: 0 });
    if (t.hp < last) { drops.push(last - t.hp); last = t.hp; }
    c.socket.emit('player_attack'); await sleep(950);
    const t2 = monsOf(c).find((m) => m.id === tid);
    if (t2 && t2.hp < last) { drops.push(last - t2.hp); last = t2.hp; }
    if (!t2) tid = null;
  }
  return drops;
}
const median = (a) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : 0; };
(async () => {
  const chars = {
    p328c00001: BASE('p328c00001', ' ChuTong328', { stonesTrung: 2000, inventory: { linh_thao: 60, da_quy: 10 } }),
    p328e00001: BASE('p328e00001', ' TruongLao328', { stonesTrung: 1000, inventory: { da_quy: 10, linh_thao: 50 } }),
    p328m00001: BASE('p328m00001', ' DeTu328', { inventory: { da_quy: 60, linh_thao: 200 } }),
    p328n00001: BASE('p328n00001', ' NgoaiMon328', {}),
  };
  fs.writeFileSync(path.join(DIR, 'characters.json'), JSON.stringify(chars));
  const sects = [SECT('sa', 'Tông Sáng Tạo', [
    { token: 'p328c00001', name: ' ChuTong328', role: 'chu', contrib: 0 },
    { token: 'p328e00001', name: ' TruongLao328', role: 'truonglao', contrib: 500 },
    { token: 'p328m00001', name: ' DeTu328', role: 'detu', contrib: 1000 },
    { token: 'p328n00001', name: ' NgoaiMon328', role: 'detu', contrib: 10 },
  ], { fund: 100000, uy: 100, level: 3, hq: { mapId: 'huyet_sac_rung', x: 4248, y: 2900 }, buildings: [{ kind: 'tangkinh', name: 'Tàng Kinh Các', x: 4248, y: 3000, lv: 2 }] })];
  fs.writeFileSync(path.join(DIR, 'world.json'), JSON.stringify({ totalMinutes: 100 * 1440, savedAt: Date.now(), sects }));
  await startServer();
  const C = await connect('p328c00001'); const E = await connect('p328e00001'); const M = await connect('p328m00001'); const N = await connect('p328n00001');
  // A1: đệ tử không có quyền tạo
  M.errors = []; M.socket.emit('sect_art_create', { name: 'Pháp Lậu', gradeId: 'pham', comps: { cong: 1 }, flawId: 'f_toc' }); await sleep(800);
  ok('A1 de tu khong duoc tao phap', M.errors.length > 0 && (mySect(M).arts || []).length === 0, M.errors.join(';'));
  // A2: phong Danh Dự cho trưởng lão -> có quyền tạo
  C.socket.emit('sect_honor_set', { token: 'p328e00001', on: true }); await sleep(600); await refresh(E);
  ok('A2 Truong Lao Danh Du duoc quyen sang tao', mySect(E).canCreateArt === true && (mySect(E).members.find((m) => m.token === 'p328e00001') || {}).honor === true, JSON.stringify(mySect(E).canCreateArt));
  // A3: vượt ngân sách -> chặn (Huyền 24+4=28; ghép 40)
  E.errors = []; E.socket.emit('sect_art_create', { name: 'Pháp Vỡ', gradeId: 'huyen', comps: { cong: 5, phong: 5, toc: 4, mau: 4 }, flawId: 'f_toc' }); await sleep(800); await refresh(E);
  ok('A3 vuot ngan sach bi chan, quy nguyen ven', E.errors.some((x) => x.includes('ngân sách')) && (mySect(E).arts || []).length === 0 && mySect(E).fund === 100000, E.errors.join(';'));
  // A4: tạo Huyền thành công + trừ đúng chi phí
  E.errors = []; E.socket.emit('sect_art_create', { name: 'Hỏa Vân Công', gradeId: 'huyen', comps: { cong: 5, thien: 2 }, flawId: 'f_phong' }); await sleep(800); await refresh(E);
  const art1 = (mySect(E).arts || [])[0] || {};
  ok('A4 tao phap Huyen thanh cong, dang ngo', art1.name === 'Hỏa Vân Công' && art1.status === 'researching' && art1.need === 500 && art1.creatorName === ' TruongLao328', JSON.stringify(art1).slice(0, 200));
  await waitFor(() => E.sync, 5000);
  const eChar = (E.sync && (E.sync.character || E.sync)) || {};
  ok('A5 chi phi tru dung: quy -15000, Trung cua nguoi tao -800, Da Quy -5', mySect(E).fund === 85000 && (eChar.stonesTrung === 200) && ((eChar.inventory || {}).da_quy === 5), `fund=${mySect(E).fund} trung=${eChar.stonesTrung} daquy=${(eChar.inventory || {}).da_quy}`);
  // A6: học khi đang ngộ -> chặn
  M.errors = []; M.socket.emit('sect_art_learn', { artId: art1.id }); await sleep(700);
  ok('A6 dang ngo chua hoc duoc', M.errors.some((x) => x.includes('đang ngộ')), M.errors.join(';'));
  // A7: góp ngộ bằng nộp đồ -> đủ 500 -> thành pháp
  M.socket.emit('sect_art_donate', { itemId: 'da_quy', qty: 60 }); await sleep(700);
  C.socket.emit('sect_art_donate', { itemId: 'linh_thao', qty: 20 }); await sleep(700); await refresh(M);
  const art1b = (mySect(M).arts || []).find((a) => a.id === art1.id) || {};
  ok('A7 nop do du 500 diem -> NGO THANH', art1b.status === 'done' && art1b.progress === 500, JSON.stringify(art1b).slice(0, 160));
  // A8: Ngoại Môn học -> chặn (hạng + Tông Cống)
  N.errors = []; N.socket.emit('sect_art_learn', { artId: art1.id }); await sleep(700);
  ok('A8 Ngoai Mon bi chan hoc phap tu tao', N.errors.length > 0, N.errors.join(';'));
  // A9: Nội Môn học được, trừ 500 Tông Cống
  M.errors = []; M.socket.emit('sect_art_learn', { artId: art1.id }); await sleep(700); await refresh(M);
  ok('A9 Noi Mon hoc duoc, Tong Cong 1000 -> 500', (M.sync && (M.sync.sectArts || []).includes(art1.id)) && mySect(M).myContrib === 500, `contrib=${mySect(M).myContrib} arts=${JSON.stringify(M.sync && M.sync.sectArts)}`);
  // A10: đo sát thương: chưa vận hành vs đang vận hành (+5% công)
  const pre = await sampleDealt(M, 8);
  M.socket.emit('sect_art_toggle', { artId: art1.id }); await sleep(600);
  console.log('DBG active sau bat:', JSON.stringify(M.sync && M.sync.sectArtsActive));
  const post = await sampleDealt(M, 8);
  const ratio = pre.length && post.length ? median(post) / median(pre) : 0;
  ok('A10 van hanh phap: sat thuong tang ~5% cong', ratio >= 1.03 && ratio <= 1.07, `pre=${median(pre)} post=${median(post)} ratio=${ratio.toFixed(3)} preAll=${JSON.stringify(pre)} postAll=${JSON.stringify(post)}`);
  M.socket.emit('sect_art_toggle', { artId: art1.id }); await sleep(500); // tắt lại để dành ô cho A11
  // A11: tạo thêm 2 pháp Phàm, học hết, vận hành pháp thứ 3 -> chặn trần 2
  async function makePham(name, donor, donorItem, donorQty) {
    C.errors = []; C.socket.emit('sect_art_create', { name, gradeId: 'pham', comps: { toc: 2 }, flawId: 'f_cong' }); await sleep(700);
    donor.errors = []; donor.socket.emit('sect_art_donate', { itemId: donorItem, qty: Math.ceil(donorQty / 2) }); await sleep(600);
    donor.socket.emit('sect_art_donate', { itemId: donorItem, qty: Math.ceil(donorQty / 2) }); await sleep(700);
    await refresh(M);
    console.log('DBG makePham', name, 'arts:', JSON.stringify((mySect(M).arts || []).map((a) => [a.name, a.status, a.progress])), 'Cerr:', C.errors.join(';'), 'Derr:', donor.errors.join(';'));
    return (mySect(M).arts || []).find((a) => a.name === name) || {};
  }
  const art2 = await makePham('Tật Phong Bộ', M, 'linh_thao', 100);
  const art3 = await makePham('Lưu Vân Bộ', M, 'linh_thao', 100);
  ok('A11a hai phap Pham ngo thanh', art2.status === 'done' && art3.status === 'done', `${art2.status}/${art3.status}`);
  await flyTo(M, 4248, 2960, 45); // về đứng cạnh Tàng Kinh Các mới học được (cổng khoảng cách 350px)
  for (const a of [art2, art3]) { M.errors = []; M.socket.emit('sect_art_learn', { artId: a.id }); await sleep(600); console.log('DBG learn', a.name, 'err:', M.errors.join(';'), 'arts:', JSON.stringify(M.sync && M.sync.sectArts)); }
  M.socket.emit('sect_art_toggle', { artId: art1.id }); await sleep(500);
  M.socket.emit('sect_art_toggle', { artId: art2.id }); await sleep(500);
  M.errors = []; M.socket.emit('sect_art_toggle', { artId: art3.id }); await sleep(600);
  ok('A11b van hanh toi da 2 phap — phap thu 3 bi chan', M.errors.some((x) => x.includes('tối đa 2')), M.errors.join(';'));
  // A12: phế pháp
  C.socket.emit('sect_art_delete', { artId: art3.id }); await sleep(700); await refresh(M);
  ok('A12 Tong chu phe phap -> mat khoi danh sach', !(mySect(M).arts || []).some((a) => a.id === art3.id) && (mySect(M).arts || []).length === 2, 'n=' + (mySect(M).arts || []).length);
  // A13: rời tông -> pháp mất hiệu lực (sát thương về gốc)
  M.socket.emit('sect_leave'); await sleep(800);
  const after = await sampleDealt(M, 5);
  ok('A13 roi tong: sat thuong ve muc goc (phap mat hieu luc)', after.length >= 4 && Math.abs(median(after) - median(pre)) <= 1, `pre=${median(pre)} after=${median(after)}`);
  for (const c of [C, E, M, N]) c.socket.disconnect();
  await stopServer();
  console.log(`\n== p328: ${pass} PASS, ${fail} FAIL ==`);
  process.exit(fail ? 1 : 0);
})();
