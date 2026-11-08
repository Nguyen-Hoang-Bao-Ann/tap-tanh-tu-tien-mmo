// Probe GĐ355 (C) — 10 chương theo chủng tộc (Nhập Tộc / Thử Thách / Truyền Thừa).
// Chân kiểm (theo §B5 đợt C):
//  1) CHỈ MỞ TRONG ĐÚNG KIẾP TỘC: Nhân nghe chương Hoa -> bị chặn (cổng tộc phía server).
//  2) Điều kiện từng chương chạy đúng: Nhân cần đứng học Văn Uyển (storyStudy); Hoa _3 cần đã hồi sinh;
//     Ma cần phe Ma; Quỷ _2/_3 đi đường Luyện Hồn HOẶC đủ cảnh; Hồ cần mốc thiện cảm Thương Nhân 100/200/300;
//     Long cần thượng nguồn; Điểu cần đỉnh băng; Thú cần rừng thú + số thú thuần hóa; Thần cần đứng Đài Kiếp.
//  3) Chuỗi 1->2->3 khóa theo reqSegs (chưa nghe _1 thì _2 khóa).
//  4) TRẠNG THÁI THEO HỒN: nghe chương ghi soul.storyRace (payload); kiếp khác (Long) mang storyRace của Nhân = 3
//     trong payload (đọc lại được) nhưng KHÔNG mở tiếp được chương Nhân (server chặn theo tộc hiện tại).
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
let serverProc = null, killTimer = null, CUR_PORT = 3700;
async function startServer(port, tag) {
  CUR_PORT = port;
  if (!(await portFree(port))) throw new Error('port ban ' + port);
  serverProc = spawn('node', ['server/index.js'], { cwd: ROOT, env: { ...process.env, PORT: String(port), TTT_STORAGE: 'file', TTT_CHAR_FILE: path.join(DIR, 'characters.json'), TTT_ACC_FILE: path.join(DIR, 'accounts.json'), TTT_WORLD_FILE: path.join(DIR, 'world.json'), TTT_SESS_FILE: path.join(DIR, 'sessions.json'), TTT_DAY_REAL_MS: '600000', TTT_TUVI_NEED: '5' }, stdio: ['ignore', 'pipe', 'pipe'] });
  serverProc.stderr.on('data', (d) => { try { fs.appendFileSync(path.join(DIR, 'srv_' + tag + '.log'), d); } catch (e) {} });
  serverProc.stdout.on('data', (d) => { try { fs.appendFileSync(path.join(DIR, 'srv_' + tag + '.log'), d); } catch (e) {} });
  killTimer = setTimeout(() => { try { serverProc.kill('SIGKILL'); } catch (e) {} }, 420000);
  const t0 = Date.now();
  while (Date.now() - t0 < 45000) { try { const r = await fetch(`http://127.0.0.1:${port}/api/status`); if (r.ok) { clearTimeout(killTimer); return; } } catch (e) {} await sleep(500); }
  throw new Error('server khong len');
}
async function stopServer() { if (!serverProc) return; const p = serverProc; serverProc = null; await new Promise((res) => { const t = setTimeout(() => { try { p.kill('SIGKILL'); } catch (e) {} res(); }, 4000); p.once('exit', () => { clearTimeout(t); res(); }); try { p.kill('SIGTERM'); } catch (e) { clearTimeout(t); res(); } }); const t0 = Date.now(); while (Date.now() - t0 < 10000 && !(await portFree(CUR_PORT))) await sleep(300); }
const STATS = { khiHuyet: 8000, vatCong: 400, vatPhong: 250, phapCong: 400, phapPhong: 250, tocDo: 60, minhMan: 100 };
const LC1 = { elements: ['kim'], main: 'kim', count: 1, mutations: [] };
function BASE(token, name, extra) {
  return Object.assign({ token, name, classId: 'kiemtu', gender: 'nam', race: null, geo175: 1, realm: 'kd', tier: 9, x: 1565, y: 1011, mapId: 'lang_tan_thu', hp: 99999, lifespan: 500, birthDay: -5660, ageStart: 16, stats: { ...STATS }, statPoints: 0, freePoints: 0, tuVi: 99999, stones: 0, stonesTrung: 0, stonesThuong: 0, stonesCuc: 0, inventory: {}, gearBag: {}, equipped: [], skills: [], job: null, job2: null, job3: null, linhCan: { ...LC1 }, affinity: {}, affV2: 1, bonds: {}, quests: {}, questsDone: {}, flags: {}, counters: {}, disciples: [], foundInvites: [], reformIn: [], sectTech: [], sectArts: [], sectArtsActive: [], mails: [], classRes: {}, food: 100, water: 100 }, extra || {});
}
let pass = 0, fail = 0;
function ok(name, cond, extra) { if (cond) { pass++; console.log('PASS | ' + name); } else { fail++; console.log('FAIL | ' + name + (extra ? ' | ' + extra : '')); } }
function connect(token) {
  const socket = io(`http://127.0.0.1:${CUR_PORT}`, { transports: ['websocket'] });
  const ctx = { socket, merger: createMerger(), state: null, welcome: null, needChar: false, syncs: [], errs: [], notices: [], dialogs: [], maps: [], myName: null };
  socket.on('connect', () => socket.emit('hello', { token }));
  socket.on('welcome', (w) => { ctx.welcome = w; ctx.myName = (w.character || {}).name; });
  socket.on('need_character', () => { ctx.needChar = true; });
  socket.on('char_sync', (s) => ctx.syncs.push(s));
  socket.on('notice', (n) => ctx.notices.push(n.text || ''));
  socket.on('interact_error', (e) => ctx.errs.push(e.message || ''));
  socket.on('npc_dialog', (d) => ctx.dialogs.push(d));
  socket.on('map_enter', (m) => ctx.maps.push(m));
  socket.on('server_tick', (t) => { const st = ctx.merger(t); if (st) ctx.state = st; });
  return ctx;
}
const lastChar = (c) => { for (let i = c.syncs.length - 1; i >= 0; i--) { if (c.syncs[i]) return c.syncs[i]; } return c.welcome ? c.welcome.character : null; };
const meOf = (c) => { const ps = (c.state && c.state.players) || []; return ps.find((p) => p.name === c.myName) || null; };
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
const NPC_CK = { x: 1064, y: 1990 }, NPC_AB = { x: 760, y: 481 }, NPC_TN = { x: 1977, y: 1377 }, NPC_LN = { x: 2120, y: 2010 }, NPC_TO = { x: 1699, y: 1051 }, NPC_TL = { x: 2236, y: 872 };
const KDT = { mapId: 'kim_kiep_son', x: 7050, y: 5546 };

(async () => {
  const chars = {};
  chars['tk355nhan1'] = BASE('tk355nhan1', 'P355NhanHoc', { race: 'nhan', counters: { storyStudy: 1 } });
  chars['tk355nhan2'] = BASE('tk355nhan2', 'P355NhanMu', { race: 'nhan' });
  chars['tk355hoa01'] = BASE('tk355hoa01', 'P355HoaSong', { race: 'hoa', realm: 'tc' });
  chars['tk355hoa02'] = BASE('tk355hoa02', 'P355HoaChet', { race: 'hoa', realm: 'tc', counters: { storyHoaRevive: 1 } });
  chars['tk355ma001'] = BASE('tk355ma001', 'P355MaPhe', { race: 'ma', realm: 'na', branch: { side: 'ma', source: 'normal' } });
  chars['tk355ma002'] = BASE('tk355ma002', 'P355MaLac', { race: 'ma', realm: 'na' });
  chars['tk355quy01'] = BASE('tk355quy01', 'P355QuyTc', { race: 'quy', realm: 'tc', classId: 'quytu' });
  chars['tk355quy02'] = BASE('tk355quy02', 'P355QuyKd', { race: 'quy', classId: 'quytu' });
  chars['tk355quy03'] = BASE('tk355quy03', 'P355QuyLh', { race: 'quy', realm: 'tc', classId: 'quytu', anState: { luyenHon: true } });
  chars['tk355ho001'] = BASE('tk355ho001', 'P355HoThan', { race: 'ho', affinity: { npc_thuongnhan: 150 } });
  chars['tk355ho002'] = BASE('tk355ho002', 'P355HoThan2', { race: 'ho', affinity: { npc_thuongnhan: 320 } });
  chars['tk355long1'] = BASE('tk355long1', 'P355LongNguon', { race: 'long', counters: { storyThuongNguon: 1 } });
  chars['tk355dieu1'] = BASE('tk355dieu1', 'P355DieuBang', { race: 'dieu', realm: 'tc', counters: { storyDinhBang: 1 } });
  chars['tk355thu01'] = BASE('tk355thu01', 'P355ThuRung', { race: 'thu', counters: { storyRungThu: 1, ach_tames: 3 } });
  chars['tk355thu02'] = BASE('tk355thu02', 'P355ThuThieu', { race: 'thu', counters: { storyRungThu: 1 } });
  chars['tk355than1'] = BASE('tk355than1', 'P355ThanDai', { race: 'than', realm: 'ht', mapId: KDT.mapId, x: KDT.x, y: KDT.y, counters: { storyDaiKiep: 1 } });
  chars['tk355tien1'] = BASE('tk355tien1', 'P355TienChuong', { race: 'tien', realm: 'tn', tier: 1, mapId: 'tien_mon_ngoai_vien', x: 400, y: 400 });
  chars['tk355xdoc1'] = BASE('tk355xdoc1', 'P355LongDoc', { race: 'long', soul: { storyRace: { nhan: 3 } } });
  fs.writeFileSync(path.join(DIR, 'characters.json'), JSON.stringify(chars));
  fs.writeFileSync(path.join(DIR, 'accounts.json'), '{}');
  fs.writeFileSync(path.join(DIR, 'world.json'), JSON.stringify({ totalMinutes: 3360, savedAt: Date.now() }));
  fs.writeFileSync(path.join(DIR, 'sessions.json'), '{}');
  await startServer(3700, '355a');
  const bootLog = fs.readFileSync(path.join(DIR, 'srv_355a.log'), 'utf8');
  const hvLine = bootLog.split('\n').find((l) => l.includes('Hộ Vệ Tiên Môn')) || '';
  const hvPos = (() => { const m = hvLine.match(/\((\d+),(\d+)\)/); return m ? { x: +m[1], y: +m[2] } : null; })();
  ok('chân 0a: Hộ Vệ Tiên Môn có mặt tại ngoại viện (cho chương Tiên)', !!hvPos, hvLine);

  // ---- Nhân ----
  const cN1 = connect('tk355nhan1'); await waitFor(() => cN1.welcome, 20000);
  ok('chân 1a: Nhân tộc vào game', !!cN1.welcome && !cN1.needChar, 'needChar=' + cN1.needChar);
  await flyTo(cN1, NPC_CK.x, NPC_CK.y, 60);
  let r = await listen(cN1, 'npc_cuky', 'rc_nhan_1');
  ok('chân 1b: Nhân + đã học Văn Uyển -> rc_nhan_1 mở', !!(r && r.read), JSON.stringify(r).slice(0, 100));
  r = await listen(cN1, 'npc_cuky', 'rc_nhan_2');
  ok('chân 1c: rc_nhan_2 (Trúc Cơ+) mở tiếp', !!(r && r.read), JSON.stringify(r).slice(0, 100));
  r = await listen(cN1, 'npc_cuky', 'rc_nhan_3');
  ok('chân 1d: rc_nhan_3 (Kim Đan + học) mở — trọn chương Nhân', !!(r && r.read), JSON.stringify(r).slice(0, 100));
  await sleep(500);
  const chN = lastChar(cN1);
  ok('chân 1e: soul.storyRace.nhan = 3 trong payload', !!(chN && chN.soul && chN.soul.storyRace && chN.soul.storyRace.nhan === 3), JSON.stringify(chN && chN.soul && chN.soul.storyRace));
  r = await listen(cN1, 'npc_cuky', 'rc_hoa_1');
  ok('chân 1f: Nhân xin chương Hoa -> BỊ CHẶN (cổng tộc)', !!(r && r.err), JSON.stringify(r).slice(0, 100));
  const cN2 = connect('tk355nhan2'); await waitFor(() => cN2.welcome, 20000);
  await flyTo(cN2, NPC_CK.x, NPC_CK.y, 60);
  r = await listen(cN2, 'npc_cuky', 'rc_nhan_1');
  ok('chân 1g: Nhân CHƯA học Văn Uyển -> rc_nhan_1 khóa', !!(r && r.err), JSON.stringify(r).slice(0, 100));
  r = await listen(cN2, 'npc_cuky', 'rc_nhan_2');
  ok('chân 1h: chưa nghe _1 -> rc_nhan_2 khóa (reqSegs)', !!(r && r.err), JSON.stringify(r).slice(0, 100));

  // ---- Hoa ----
  const cH1 = connect('tk355hoa01'); await waitFor(() => cH1.welcome, 20000);
  await flyTo(cH1, NPC_CK.x, NPC_CK.y, 60);
  r = await listen(cH1, 'npc_cuky', 'rc_hoa_1');
  ok('chân 2a: Hoa -> rc_hoa_1 mở (không điều kiện thêm)', !!(r && r.read), JSON.stringify(r).slice(0, 100));
  r = await listen(cH1, 'npc_cuky', 'rc_hoa_2');
  ok('chân 2b: Hoa Trúc Cơ -> rc_hoa_2 mở', !!(r && r.read), JSON.stringify(r).slice(0, 100));
  r = await listen(cH1, 'npc_cuky', 'rc_hoa_3');
  ok('chân 2c: Hoa CHƯA từng hồi sinh -> rc_hoa_3 khóa', !!(r && r.err), JSON.stringify(r).slice(0, 100));
  const cH2 = connect('tk355hoa02'); await waitFor(() => cH2.welcome, 20000);
  await flyTo(cH2, NPC_CK.x, NPC_CK.y, 60);
  await listen(cH2, 'npc_cuky', 'rc_hoa_1'); await listen(cH2, 'npc_cuky', 'rc_hoa_2');
  r = await listen(cH2, 'npc_cuky', 'rc_hoa_3');
  ok('chân 2d: Hoa đã hồi sinh 1 lần -> rc_hoa_3 (Truyền Thừa) mở', !!(r && r.read), JSON.stringify(r).slice(0, 100));

  // ---- Ma ----
  const cM1 = connect('tk355ma001'); await waitFor(() => cM1.welcome, 20000);
  await flyTo(cM1, NPC_AB.x, NPC_AB.y, 60);
  r = await listen(cM1, 'npc_amba', 'rc_ma_1');
  ok('chân 3a: Ma tộc + phe Ma -> rc_ma_1 mở', !!(r && r.read), JSON.stringify(r).slice(0, 100));
  r = await listen(cM1, 'npc_amba', 'rc_ma_2');
  ok('chân 3b: rc_ma_2 (Kim Đan+) mở', !!(r && r.read), JSON.stringify(r).slice(0, 100));
  r = await listen(cM1, 'npc_amba', 'rc_ma_3');
  ok('chân 3c: rc_ma_3 (Nguyên Anh + phe Ma) mở', !!(r && r.read), JSON.stringify(r).slice(0, 100));
  const cM2 = connect('tk355ma002'); await waitFor(() => cM2.welcome, 20000);
  await flyTo(cM2, NPC_AB.x, NPC_AB.y, 60);
  r = await listen(cM2, 'npc_amba', 'rc_ma_1');
  ok('chân 3d: Ma tộc CHƯA chọn phe -> rc_ma_1 khóa', !!(r && r.err), JSON.stringify(r).slice(0, 100));

  // ---- Quỷ ----
  const cQ1 = connect('tk355quy01'); await waitFor(() => cQ1.welcome, 20000);
  await flyTo(cQ1, NPC_AB.x, NPC_AB.y, 60);
  r = await listen(cQ1, 'npc_amba', 'rc_quy_1');
  ok('chân 4a: Quỷ Trúc Cơ -> rc_quy_1 mở', !!(r && r.read), JSON.stringify(r).slice(0, 100));
  r = await listen(cQ1, 'npc_amba', 'rc_quy_2');
  ok('chân 4b: Quỷ Trúc Cơ, chưa Luyện Hồn -> rc_quy_2 khóa', !!(r && r.err), JSON.stringify(r).slice(0, 100));
  const cQ2 = connect('tk355quy02'); await waitFor(() => cQ2.welcome, 20000);
  await flyTo(cQ2, NPC_AB.x, NPC_AB.y, 60);
  await listen(cQ2, 'npc_amba', 'rc_quy_1');
  r = await listen(cQ2, 'npc_amba', 'rc_quy_2');
  ok('chân 4c: Quỷ Kim Đan (đường cảnh) -> rc_quy_2 mở', !!(r && r.read), JSON.stringify(r).slice(0, 100));
  r = await listen(cQ2, 'npc_amba', 'rc_quy_3');
  ok('chân 4d: Quỷ Kim Đan -> rc_quy_3 khóa (cần Nguyên Anh hoặc Luyện Hồn)', !!(r && r.err), JSON.stringify(r).slice(0, 100));
  const cQ3 = connect('tk355quy03'); await waitFor(() => cQ3.welcome, 20000);
  await flyTo(cQ3, NPC_AB.x, NPC_AB.y, 60);
  await listen(cQ3, 'npc_amba', 'rc_quy_1'); await listen(cQ3, 'npc_amba', 'rc_quy_2');
  r = await listen(cQ3, 'npc_amba', 'rc_quy_3');
  ok('chân 4e: Quỷ Luyện Hồn (Trúc Cơ) -> rc_quy_3 mở theo đường Luyện Hồn', !!(r && r.read), JSON.stringify(r).slice(0, 100));

  // ---- Hồ ----
  const cHo1 = connect('tk355ho001'); await waitFor(() => cHo1.welcome, 20000);
  await flyTo(cHo1, NPC_TN.x, NPC_TN.y, 60);
  r = await listen(cHo1, 'npc_thuongnhan', 'rc_ho_1');
  ok('chân 5a: Hồ + thiện cảm Thương Nhân 150 -> rc_ho_1 mở', !!(r && r.read), JSON.stringify(r).slice(0, 100));
  r = await listen(cHo1, 'npc_thuongnhan', 'rc_ho_2');
  ok('chân 5b: thiện cảm 150 < 200 -> rc_ho_2 khóa', !!(r && r.err), JSON.stringify(r).slice(0, 100));
  const cHo2 = connect('tk355ho002'); await waitFor(() => cHo2.welcome, 20000);
  await flyTo(cHo2, NPC_TN.x, NPC_TN.y, 60);
  await listen(cHo2, 'npc_thuongnhan', 'rc_ho_1'); await listen(cHo2, 'npc_thuongnhan', 'rc_ho_2');
  r = await listen(cHo2, 'npc_thuongnhan', 'rc_ho_3');
  ok('chân 5c: thiện cảm 320 >= 300 -> rc_ho_3 mở trọn chương Hồ', !!(r && r.read), JSON.stringify(r).slice(0, 100));

  // ---- Long / Điểu / Thú / Thần / Tiên ----
  const cL1 = connect('tk355long1'); await waitFor(() => cL1.welcome, 20000);
  await flyTo(cL1, NPC_LN.x, NPC_LN.y, 60);
  r = await listen(cL1, 'npc_laongu', 'rc_long_1');
  ok('chân 6a: Long + đã lên thượng nguồn -> rc_long_1 mở (Lão Ngư kể)', !!(r && r.read), JSON.stringify(r).slice(0, 100));
  await listen(cL1, 'npc_laongu', 'rc_long_2');
  r = await listen(cL1, 'npc_laongu', 'rc_long_3');
  ok('chân 6b: rc_long_3 mở trọn chương Long', !!(r && r.read), JSON.stringify(r).slice(0, 100));
  const cD1 = connect('tk355dieu1'); await waitFor(() => cD1.welcome, 20000);
  await flyTo(cD1, NPC_TO.x, NPC_TO.y, 60);
  r = await listen(cD1, 'npc_tuyetong', 'rc_dieu_1');
  ok('chân 6c: Bách Điểu + đã lên đỉnh băng -> rc_dieu_1 mở (Tuyết Ông kể)', !!(r && r.read), JSON.stringify(r).slice(0, 100));
  await listen(cD1, 'npc_tuyetong', 'rc_dieu_2');
  r = await listen(cD1, 'npc_tuyetong', 'rc_dieu_3');
  ok('chân 6d: rc_dieu_3 mở trọn chương Bách Điểu', !!(r && r.read), JSON.stringify(r).slice(0, 100));
  const cT1 = connect('tk355thu01'); await waitFor(() => cT1.welcome, 20000);
  await flyTo(cT1, NPC_TL.x, NPC_TL.y, 60);
  r = await listen(cT1, 'npc_master_thusu', 'rc_thu_1');
  ok('chân 6e: Vạn Thú + đã vào rừng thú -> rc_thu_1 mở (Thú Lão kể)', !!(r && r.read), JSON.stringify(r).slice(0, 100));
  await listen(cT1, 'npc_master_thusu', 'rc_thu_2');
  r = await listen(cT1, 'npc_master_thusu', 'rc_thu_3');
  ok('chân 6f: thuần hóa 3 thú -> rc_thu_3 mở trọn chương Vạn Thú', !!(r && r.read), JSON.stringify(r).slice(0, 100));
  const cT2 = connect('tk355thu02'); await waitFor(() => cT2.welcome, 20000);
  await flyTo(cT2, NPC_TL.x, NPC_TL.y, 60);
  await listen(cT2, 'npc_master_thusu', 'rc_thu_1');
  r = await listen(cT2, 'npc_master_thusu', 'rc_thu_2');
  ok('chân 6g: Vạn Thú chưa thuần hóa con nào -> rc_thu_2 khóa', !!(r && r.err), JSON.stringify(r).slice(0, 100));
  const cTh = connect('tk355than1'); await waitFor(() => cTh.welcome, 20000);
  ok('chân 6h: Thần tộc Hóa Thần vào game tại Đài Kiếp', !!cTh.welcome && !cTh.needChar, 'needChar=' + cTh.needChar);
  r = await listen(cTh, 'npc_kiepdaithu', 'rc_than_1');
  ok('chân 6i: Thần + đã đứng Đài Kiếp -> rc_than_1 mở', !!(r && r.read), JSON.stringify(r).slice(0, 100));
  await listen(cTh, 'npc_kiepdaithu', 'rc_than_2');
  r = await listen(cTh, 'npc_kiepdaithu', 'rc_than_3');
  ok('chân 6j: rc_than_3 mở trọn chương Thần', !!(r && r.read), JSON.stringify(r).slice(0, 100));
  const cTi = connect('tk355tien1'); await waitFor(() => cTi.welcome, 20000);
  if (hvPos) await flyTo(cTi, hvPos.x, hvPos.y, 60);
  r = await listen(cTi, 'npc_hovetm', 'rc_tien_1');
  ok('chân 6k: Tiên tộc tại Tiên Môn -> rc_tien_1 mở', !!(r && r.read), JSON.stringify(r).slice(0, 100));
  await listen(cTi, 'npc_hovetm', 'rc_tien_2');
  r = await listen(cTi, 'npc_hovetm', 'rc_tien_3');
  ok('chân 6l: rc_tien_3 mở trọn chương Tiên', !!(r && r.read), JSON.stringify(r).slice(0, 100));

  // ---- Đọc lại xuyên kiếp ----
  const cX = connect('tk355xdoc1'); await waitFor(() => cX.welcome, 20000);
  const chX = lastChar(cX);
  ok('chân 7a: kiếp Long mang storyRace.nhan = 3 từ hồn (payload — đọc lại được)', !!(chX && chX.soul && chX.soul.storyRace && chX.soul.storyRace.nhan === 3), JSON.stringify(chX && chX.soul && chX.soul.storyRace));
  await flyTo(cX, NPC_CK.x, NPC_CK.y, 60);
  r = await listen(cX, 'npc_cuky', 'rc_nhan_1');
  ok('chân 7b: kiếp Long KHÔNG mở tiếp được chương Nhân (chỉ đọc lại)', !!(r && r.err), JSON.stringify(r).slice(0, 100));

  for (const c of [cN1, cN2, cH1, cH2, cM1, cM2, cQ1, cQ2, cQ3, cHo1, cHo2, cL1, cD1, cT1, cT2, cTh, cTi, cX]) { try { c.socket.disconnect(); } catch (e) {} }
  await sleep(800);
  await stopServer();
  console.log(`\nKẾT QUẢ GĐ355: ${pass} PASS / ${fail} FAIL`);
  process.exit(fail ? 1 : 0);
})().catch(async (e) => { console.error('PROBE CRASH', e); try { await stopServer(); } catch (x) {} process.exit(2); });
