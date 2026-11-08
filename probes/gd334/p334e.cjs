// Probe GĐ334-E — TRẬN PHÁP (boot 2): tông CHƯA định hình phong bị chặn khi bày trận; hết cửa sổ chiến -> trận + Trận Nhãn + Thủ Lĩnh tự gỡ.
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const net = require('net');
const ROOT = path.join(__dirname, '..', '..');
const PORT = 3578;
const DIR = __dirname;
const { io } = require(path.join(ROOT, 'client/node_modules/socket.io-client'));
const { createMerger } = require(path.join(ROOT, 'client/worldmerge.cjs'));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function waitFor(fn, ms) { const t0 = Date.now(); while (Date.now() - t0 < ms) { const v = fn(); if (v) return v; await sleep(150); } return null; }
function portFree(port) { return new Promise((res) => { const s = net.createServer(); s.once('error', () => res(false)); s.listen(port, () => s.close(() => res(true))); }); }
let serverProc = null, killTimer = null;
async function startServer() {
  if (!(await portFree(PORT))) throw new Error('port ban');
  serverProc = spawn('node', ['server/index.js'], { cwd: ROOT, env: { ...process.env, PORT: String(PORT), TTT_STORAGE: 'file', TTT_CHAR_FILE: path.join(DIR, 'characters.json'), TTT_ACC_FILE: path.join(DIR, 'accounts.json'), TTT_WORLD_FILE: path.join(DIR, 'world.json'), TTT_SESS_FILE: path.join(DIR, 'sessions.json'), TTT_DAY_REAL_MS: '600000', TTT_TUVI_NEED: '5', TTT_WAR_DELAY_MS: '6000', TTT_WAR_LEN_MS: '16000' }, stdio: ['ignore', 'pipe', 'pipe'] });
  serverProc.stderr.on('data', (d) => process.stderr.write('[srv] ' + d));
  killTimer = setTimeout(() => { try { serverProc.kill('SIGKILL'); } catch (e) {} }, 60000);
  const t0 = Date.now();
  while (Date.now() - t0 < 45000) { try { const r = await fetch(`http://127.0.0.1:${PORT}/api/status`); if (r.ok) { clearTimeout(killTimer); return; } } catch (e) {} await sleep(500); }
  throw new Error('server khong len');
}
async function stopServer() { if (!serverProc) return; const p = serverProc; serverProc = null; await new Promise((res) => { const t = setTimeout(() => { try { p.kill('SIGKILL'); } catch (e) {} res(); }, 4000); p.once('exit', () => { clearTimeout(t); res(); }); try { p.kill('SIGTERM'); } catch (e) { clearTimeout(t); res(); } }); const t0 = Date.now(); while (Date.now() - t0 < 10000 && !(await portFree(PORT))) await sleep(300); }
const FLAG = { x: 4248, y: 6223 };
function BASE(token, name, extra) {
  return Object.assign({ token, name, classId: 'kiemtu', gender: 'nam', race: null, geo175: 1, realm: 'kd', tier: 1, x: FLAG.x, y: FLAG.y, mapId: 'huyet_sac_rung', hp: 99999, lifespan: 500, birthDay: -5660, ageStart: 16, stats: { khiHuyet: 500, vatCong: 500, vatPhong: 100, phapCong: 100, phapPhong: 100, tocDo: 60, minhMan: 0 }, statPoints: 0, freePoints: 0, tuVi: 0, stones: 0, stonesTrung: 0, stonesThuong: 0, stonesCuc: 0, inventory: {}, gearBag: {}, equipped: [], skills: [], job: null, job2: null, job3: null, linhCan: { element: 'hoa', grade: 'trung', mult: 1.2 }, affinity: {}, affV2: 1, bonds: {}, quests: {}, questsDone: {}, flags: {}, counters: {}, disciples: [], foundInvites: [], reformIn: [], sectTech: [], sectArts: [], sectArtsActive: [], mails: [], classRes: {} }, extra || {});
}
function SECT(id, name, members, extra) { return Object.assign({ id, name, intro: '', fund: 0, level: 1, uy: 0, members, applicants: [], activeQuests: [], territories: [], territory: null, warehouse: [], garden: [], depts: {}, tributeDay: 100, upkeepDay: 100, questDay: 100, artDay: 100, debtDays: 0, arts: [], honor: [] }, extra || {}); }
function ART(id, name, grade, comps, flaw, kind, creator) { return { id, name, grade, gradeName: grade, creator, creatorName: creator, element: 'hoa', comps, flaw, kind, status: 'done', progress: 0, need: 100, k: 1, day: 100 }; }
let pass = 0, fail = 0;
function ok(name, cond, extra) { if (cond) { pass++; console.log('PASS | ' + name); } else { fail++; console.log('FAIL | ' + name + (extra ? ' | ' + extra : '')); } }
async function connect(token) {
  const socket = io(`http://127.0.0.1:${PORT}`, { transports: ['websocket'] });
  const ctx = { socket, merger: createMerger(), state: null, welcome: null, sect: null, sync: null, errors: [], notices: [] };
  socket.on('connect', () => socket.emit('hello', { token }));
  socket.on('welcome', (w) => { ctx.welcome = w; ctx.myName = (w.character || {}).name; });
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
const monsOf = (c) => c.state?.monsters || [];
(async () => {
  const chars = {
    p334c50001: BASE('p334c50001', ' ChuChuaPhong334', {}),
    p334c50002: BASE('p334c50002', ' ChuThuE334', {}),
  };
  fs.writeFileSync(path.join(DIR, 'characters.json'), JSON.stringify(chars));
  const sects = [
    SECT('atk2', 'Tông Chưa Phong', [
      { token: 'p334c50001', name: ' ChuChuaPhong334', role: 'chu', contrib: 0 },
    ], { fund: 100000, uy: 100, level: 5, warehouse: [{ itemId: 'da_quy', qty: 10 }], arts: [
      ART('ee1', 'Pháp Lẻ Tẻ', 'pham', { cong: 2 }, 'f_phong', 'tamphap', 'p334c50001'), // tổng trục 2 << 30 -> chưa định hình
    ] }),
    SECT('def2', 'Tông Thủ Ngự E', [
      { token: 'p334c50002', name: ' ChuThuE334', role: 'chu', contrib: 0 },
    ], { fund: 50000, uy: 100, level: 5, territories: ['lm_huyet_sac'], territory: 'lm_huyet_sac', warehouse: [{ itemId: 'da_quy', qty: 8 }], arts: [
      ART('ed1', 'Hộ Thể Tâm', 'pham', { phong: 5, mau: 4 }, 'f_toc', 'tamphap', 'p334c50002'),
      ART('ed2', 'Kim Cang Thể', 'pham', { phong: 5, mau: 3 }, 'f_cong', 'tamphap', 'p334c50002'),
      ART('ed3', 'Huyền Vũ Quyết', 'pham', { mau: 4, phong: 3 }, 'f_thien', 'tamphap', 'p334c50002'),
      ART('ed4', 'Tĩnh Tâm Thiền', 'pham', { thien: 5 }, 'f_che', 'tamphap', 'p334c50002'),
      ART('ed5', 'Sơ Phá Quyền', 'pham', { cong: 2 }, 'f_mau', 'tamphap', 'p334c50002'),
    ] }),
  ];
  fs.writeFileSync(path.join(DIR, 'world.json'), JSON.stringify({ totalMinutes: 100 * 1440, savedAt: Date.now(), sects }));
  await startServer();
  const LC = await connect('p334c50001'); const LD = await connect('p334c50002');
  await refresh(LC);
  ok('E0 tong cong chua dinh hinh phong (tong truc 2)', mySect(LC).phong && mySect(LC).phong.formed === false, JSON.stringify(mySect(LC).phong));
  LC.socket.emit('sect_war_declare', { pointId: 'lm_huyet_sac' }); await sleep(900); await refresh(LC);
  ok('E1 tuyen chien thanh cong', !!(mySect(LC).war && mySect(LC).war.state === 'pending'), JSON.stringify(mySect(LC).war));
  LC.errors = []; LC.socket.emit('sect_war_formation_set', {}); await sleep(700); await refresh(LC);
  ok('E1 tong chua dinh hinh -> bay tran bi chan, khong tru quy/da', LC.errors.some((x) => x.includes('TÔNG PHONG')) && mySect(LC).fund === 95000 && ((mySect(LC).warehouse || []).find((w) => w.itemId === 'da_quy') || {}).qty === 10, `err=${LC.errors.join(';')} fund=${mySect(LC).fund}`);
  // Bên thủ bày trận Thủ Ngự bình thường
  LD.errors = []; LD.socket.emit('sect_war_formation_set', {}); await sleep(800); await refresh(LD);
  ok('E2 ben thu (da co phong) bay tran duoc', !!(mySect(LD).war && mySect(LD).war.myForm && mySect(LD).war.myForm.axis === 'thungu'), `err=${LD.errors.join(';')} form=${JSON.stringify(mySect(LD).war && mySect(LD).war.myForm)}`);
  // Chiến mở: Trận Nhãn thủ xuất hiện; hết 16s cửa sổ -> tự gỡ tất cả
  const eyeSeen = await waitFor(() => monsOf(LD).find((m) => m.name === 'Trận Nhãn') || null, 15000);
  ok('E3 chien mo: Tran Nhan ben thu xuat hien', !!eyeSeen, eyeSeen ? eyeSeen.id : 'khong thay');
  const warDone = await waitFor(() => { LD.socket.emit('sect_get'); return mySect(LD).war === null ? true : null; }, 45000);
  await sleep(1500); await refresh(LD);
  const leftovers = monsOf(LD).filter((m) => m.name === 'Trận Nhãn' || m.name === 'Thủ Lĩnh Chiến Kỳ');
  ok('E3 het cua so chien: war ket thuc + Tran Nhan/Thu Linh tu go sach', !!warDone && leftovers.length === 0, `warDone=${!!warDone} leftovers=${JSON.stringify(leftovers.map((m) => m.name))}`);
  LC.socket.disconnect(); LD.socket.disconnect();
  await stopServer();
  console.log(`\n== p334e: ${pass} PASS, ${fail} FAIL ==`);
  process.exit(fail ? 1 : 0);
})();
