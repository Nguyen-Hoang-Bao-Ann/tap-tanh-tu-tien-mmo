// Probe GĐ334-A — NGỌC GIẢN TRỐNG: tạo pháp thiếu giản bị chặn (không trừ gì), đủ giản trừ đúng theo cấp (Phàm 1 / Huyền 2), chế 1 giản từ 3 Đá Quý + 5 Tiên Linh Chi (Luyện Khí Sư).
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const net = require('net');
const ROOT = path.join(__dirname, '..', '..');
const PORT = 3574;
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
function SECT(id, name, members, extra) { return Object.assign({ id, name, intro: '', fund: 0, level: 1, uy: 0, members, applicants: [], activeQuests: [], territories: [], territory: null, warehouse: [], garden: [], depts: {}, tributeDay: 100, upkeepDay: 100, questDay: 100, artDay: 100, debtDays: 0, arts: [], honor: [] }, extra || {}); }
let pass = 0, fail = 0;
function ok(name, cond, extra) { if (cond) { pass++; console.log('PASS | ' + name); } else { fail++; console.log('FAIL | ' + name + (extra ? ' | ' + extra : '')); } }
async function connect(token) {
  const socket = io(`http://127.0.0.1:${PORT}`, { transports: ['websocket'] });
  const ctx = { socket, merger: createMerger(), state: null, welcome: null, sect: null, sync: null, errors: [], notices: [] };
  socket.on('connect', () => socket.emit('hello', { token }));
  socket.on('welcome', (w) => { ctx.welcome = w; });
  socket.on('server_tick', (t) => { const st = ctx.merger(t); if (st) ctx.state = st; });
  socket.on('sect_state', (st) => { ctx.sect = st; });
  socket.on('char_sync', (sy) => { ctx.sync = sy; });
  socket.on('interact_error', (e) => ctx.errors.push(e.message || ''));
  socket.on('notice', (n) => ctx.notices.push(n.text || ''));
  await waitFor(() => ctx.welcome, 20000);
  socket.emit('sect_get');
  await waitFor(() => ctx.sect, 10000);
  return ctx;
}
const mySect = (c) => c.sect && c.sect.mySect;
async function refresh(c) { c.socket.emit('sect_get'); await sleep(500); }
const invOf = (c) => (c.sync && c.sync.inventory) || (c.welcome && c.welcome.character && c.welcome.character.inventory) || {};
(async () => {
  const chars = {
    p334c10001: BASE('p334c10001', ' ChuA334', { inventory: { linh_thao: 20 } }), // Tông chủ — 0 Ngọc Giản (đủ nguyên liệu để cổng NGỌC GIẢN là cổng chặn cuối)
    p334p10001: BASE('p334p10001', ' PhoA334', { stonesTrung: 1000, inventory: { ngoc_gian_trong: 10, da_quy: 10, linh_thao: 20 } }), // Phó — 10 giản
    p334m10001: BASE('p334m10001', ' DeTuA334', { stones: 5000, inventory: { da_quy: 30, tien_linh_chi: 50 }, job: { jobId: 'luyenkhi', crafts: 999 } }),
  };
  fs.writeFileSync(path.join(DIR, 'characters.json'), JSON.stringify(chars));
  const sects = [SECT('sa', 'Tông Ngọc Giản', [
    { token: 'p334c10001', name: ' ChuA334', role: 'chu', contrib: 0 },
    { token: 'p334p10001', name: ' PhoA334', role: 'pho', contrib: 0 },
    { token: 'p334m10001', name: ' DeTuA334', role: 'detu', contrib: 500 },
  ], { fund: 100000, uy: 300, level: 5, hq: { mapId: 'huyet_sac_rung', x: 4248, y: 2900 }, buildings: [{ kind: 'tangkinh', name: 'Tàng Kinh Các', x: 4248, y: 3000, lv: 3 }] })];
  fs.writeFileSync(path.join(DIR, 'world.json'), JSON.stringify({ totalMinutes: 100 * 1440, savedAt: Date.now(), sects }));
  await startServer();
  const C = await connect('p334c10001'); const P = await connect('p334p10001'); const M = await connect('p334m10001');

  // A1: Tông chủ 0 giản tạo pháp Phàm -> bị chặn, không trừ gì, không có pháp nào
  C.errors = []; C.socket.emit('sect_art_create', { name: 'Pháp Chặn Giản', gradeId: 'pham', comps: { cong: 2 }, flawId: 'f_phong', kind: 'tamphap' }); await sleep(800); await refresh(C);
  ok('A1 thieu Ngoc Gian -> chan voi thong bao ro', C.errors.some((x) => x.includes('Ngọc Giản Trống')), C.errors.join(';'));
  ok('A1 khong tru gi + khong tao phap', (mySect(C).arts || []).length === 0 && mySect(C).fund === 100000, `arts=${(mySect(C).arts || []).length} fund=${mySect(C).fund}`);

  // A2: Phó có 10 giản tạo pháp Phàm (tốn 1) -> thành công, giản 10->9, quỹ -2000
  P.errors = []; P.socket.emit('sect_art_create', { name: 'Pháp Phàm Giản', gradeId: 'pham', comps: { cong: 2 }, flawId: 'f_phong', kind: 'tamphap' }); await sleep(800); await refresh(P);
  const artsA2 = mySect(P).arts || [];
  ok('A2 tao pham thanh cong + tru dung 1 Ngoc Gian (10->9)', artsA2.length === 1 && mySect(P).myJade === 9, `arts=${artsA2.length} jade=${mySect(P).myJade} err=${P.errors.join(';')}`);
  ok('A2 quy tru dung 2000 LT cua Pham cap', mySect(P).fund === 98000, `fund=${mySect(P).fund}`);

  // A3: Phó tạo pháp Huyền (tốn 2 giản, 800 Trung, 5 Đá Quý, quỹ 15000) -> giản 9->7
  P.errors = []; P.socket.emit('sect_art_create', { name: 'Pháp Huyền Giản', gradeId: 'huyen', comps: { cong: 3 }, flawId: 'f_toc', kind: 'tamphap' }); await sleep(800); await refresh(P);
  const artsA3 = mySect(P).arts || [];
  ok('A3 tao huyen thanh cong + tru dung 2 Ngoc Gian (9->7)', artsA3.length === 2 && mySect(P).myJade === 7, `arts=${artsA3.length} jade=${mySect(P).myJade} err=${P.errors.join(';')}`);
  ok('A3 quy tru dung 15000 LT cua Huyen cap', mySect(P).fund === 83000, `fund=${mySect(P).fund}`);

  // A4: chế Ngọc Giản Trống từ 3 Đá Quý + 5 Tiên Linh Chi (nghề Luyện Khí Sư, tỉ lệ 0,9 — thử tối đa 5 lần)
  let craftOk = false, craftInfo = '';
  for (let t = 0; t < 5 && !craftOk; t++) {
    const bq = invOf(M).da_quy || 0, bt = invOf(M).tien_linh_chi || 0, bj = invOf(M).ngoc_gian_trong || 0;
    M.errors = []; M.socket.emit('craft_item', { recipeId: 'rc_ngoc_gian_trong' }); await sleep(900);
    const aq = invOf(M).da_quy || 0, at = invOf(M).tien_linh_chi || 0, aj = invOf(M).ngoc_gian_trong || 0;
    craftInfo = `lan${t + 1}: da_quy ${bq}->${aq}, tien ${bt}->${at}, gian ${bj}->${aj}, err=${M.errors.join(';')}`;
    console.log('DBG craft', craftInfo);
    if (aj > bj) { craftOk = aq === bq - 3 && at === bt - 5; break; }
  }
  ok('A4 che duoc 1 Ngoc Gian tu 3 Da Quy + 5 Tien Linh Chi', craftOk, craftInfo);

  C.socket.disconnect(); P.socket.disconnect(); M.socket.disconnect();
  await stopServer();
  console.log(`\n== p334a: ${pass} PASS, ${fail} FAIL ==`);
  process.exit(fail ? 1 : 0);
})();
