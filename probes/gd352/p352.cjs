// Probe GĐ352 (B1) — THIÊN MỆNH KÝ TẦNG 3: khung + cơ chế nghe kể qua talk_npc + Hồi 1–3
// + 4 NPC đầu (Trưởng Làng, Cụ Ký MỚI, Âm Bà MỚI, Thương Nhân Lưu Động) + danh hiệu kỷ niệm.
// LƯU Ý HARNESS: diễn viên offline dời nhân vật về điểm nghỉ ngay khi boot — vị trí fixture
// chỉ giữ vài giây. Mọi nhân vật ở đây đều bay được (Kim Đan ngự kiếm / Bách Điểu từ Trúc Cơ)
// và flyTo tới đúng ô NPC trước mỗi cụm chân (mẫu p321).
// Chân kiểm (theo §B5 đợt B1):
//  1) Hộp thoại NPC kể chuyện có mục đoạn kể đúng trạng thái (new/locked) do SERVER trả.
//  2) Nghe đoạn -> storyRead đúng đoạn + đúng bản (clear); payload soul.storySegs ghi đúng.
//  3) Ghi ĐÚNG 1 LẦN: nghe lại đoạn đã nghe -> lỗi, không ghi trùng, không đổi giá trị.
//  4) Khóa theo cảnh: TC nghe đoạn Kim Đan (tn_h3_lahau) -> bị chặn, không ghi.
//  5) Chuỗi reqSegs: đoạn sau khóa cho tới khi nghe đoạn trước (tl_h1_cuahep, ck_h1_kinh).
//  6) Kể mơ hồ -> kể rõ: ck_h1_kinh vague khi chưa tới Đài Kiếp; có cờ trải nghiệm -> clear (giá trị 2).
//     tn_h3_muoimot: vague -> biếu thương nhân (npc_gift) -> clear.
//  7) Đoạn sâu theo điều kiện riêng: ab_h2_mangdi chỉ Quỷ tu / Luyện Hồn / duyên >= 100; ab_quy chỉ Quỷ tộc/Quỷ tu; ab_duyen chỉ duyên >= 100.
//  8) Không rò đoạn: xin nghe đoạn của NPC khác tại NPC này -> bị từ chối.
//  9) Danh hiệu "Người Nghe Chuyện Xưa": nghe trọn Hồi 1 (4 đoạn chính) -> title trên thẻ nhân vật.
// 10) NPC MỚI đứng ô thoáng: nhân vật nối NGAY khi boot đứng đúng ô NPC (trước khi diễn viên offline dời đi).
// 11) Bền: restart server -> storySegs của hồn còn nguyên trong payload.
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
let serverProc = null, killTimer = null, CUR_PORT = 3685;
async function startServer(port, tag) {
  CUR_PORT = port;
  if (!(await portFree(port))) throw new Error('port ban ' + port);
  serverProc = spawn('node', ['server/index.js'], { cwd: ROOT, env: { ...process.env, PORT: String(port), TTT_STORAGE: 'file', TTT_CHAR_FILE: path.join(DIR, 'characters.json'), TTT_ACC_FILE: path.join(DIR, 'accounts.json'), TTT_WORLD_FILE: path.join(DIR, 'world.json'), TTT_SESS_FILE: path.join(DIR, 'sessions.json'), TTT_DAY_REAL_MS: '600000', TTT_TUVI_NEED: '5', TTT_WORLD_START_MINUTES: '3360' }, stdio: ['ignore', 'pipe', 'pipe'] });
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
  const ctx = { socket, merger: createMerger(), state: null, welcome: null, needChar: false, syncs: [], errs: [], notices: [], dialogs: [], myName: null };
  socket.on('connect', () => socket.emit('hello', { token }));
  socket.on('welcome', (w) => { ctx.welcome = w; ctx.myName = (w.character || {}).name; });
  socket.on('need_character', () => { ctx.needChar = true; });
  socket.on('char_sync', (s) => ctx.syncs.push(s));
  socket.on('notice', (n) => ctx.notices.push(n.text || ''));
  socket.on('interact_error', (e) => ctx.errs.push(e.message || ''));
  socket.on('npc_dialog', (d) => ctx.dialogs.push(d));
  socket.on('server_tick', (t) => { const st = ctx.merger(t); if (st) ctx.state = st; });
  return ctx;
}
const lastChar = (c) => { for (let i = c.syncs.length - 1; i >= 0; i--) { if (c.syncs[i]) return c.syncs[i]; } return c.welcome ? c.welcome.character : null; };
const segsOf = (c) => { const ch = lastChar(c); return (ch && ch.soul && ch.soul.storySegs) || {}; };
const meOf = (c) => { const ps = (c.state && c.state.players) || []; return ps.find((p) => p.name === c.myName) || null; };
async function talk(c, npcId) { const n0 = c.dialogs.length; c.socket.emit('talk_npc', { npcId }); return waitFor(() => c.dialogs.length > n0 ? c.dialogs[c.dialogs.length - 1] : null, 8000); }
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
const NPC_TL = { x: 809, y: 1225 }, NPC_CK = { x: 1064, y: 1990 }, NPC_AB = { x: 760, y: 481 }, NPC_TN = { x: 1977, y: 1377 }; // tọa độ THÔ thật (HS175 = căn 5) — đọc từ tick npc của server

(async () => {
  const chars = {};
  chars['tk352lang'] = BASE('tk352lang', 'P352Lang', {});
  chars['tk352cuky'] = BASE('tk352cuky', 'P352Ky', {});
  chars['tk352ky2'] = BASE('tk352ky2', 'P352KyClear', { counters: { storyDaiKiep: 1 } });
  chars['tk352amba'] = BASE('tk352amba', 'P352Am', {});
  chars['tk352quy'] = BASE('tk352quy', 'P352Quy', { classId: 'quytu', race: 'quy' });
  chars['tk352duyen'] = BASE('tk352duyen', 'P352AmDuyen', { affinity: { npc_amba: 120 } });
  chars['tk352thuong'] = BASE('tk352thuong', 'P352Thuong', { inventory: { thit_thu: 2 } });
  chars['tk352title'] = BASE('tk352title', 'P352Title', { counters: { storyDaiKiep: 1 } });
  chars['tk352low'] = BASE('tk352low', 'P352Low', { realm: 'tc', race: 'dieu' });
  chars['tk352plky'] = BASE('tk352plky', 'P352PlaceKy', { x: NPC_CK.x, y: NPC_CK.y });
  chars['tk352plam'] = BASE('tk352plam', 'P352PlaceAm', { x: NPC_AB.x, y: NPC_AB.y });
  fs.writeFileSync(path.join(DIR, 'characters.json'), JSON.stringify(chars));
  fs.writeFileSync(path.join(DIR, 'accounts.json'), '{}');
  fs.writeFileSync(path.join(DIR, 'world.json'), JSON.stringify({ totalMinutes: 3360, savedAt: Date.now() })); // ngày thế giới 2 (dayIndex % 4 == 2) -> Thương Nhân chắc chắn có mặt ở làng

  await startServer(3685, '352a');

  // ---- Chân 10: NPC mới đứng ô thoáng (nối NGAY khi boot — trước khi diễn viên offline dời nhân vật) ----
  const cPK = connect('tk352plky'); const cPA = connect('tk352plam');
  await waitFor(() => cPK.welcome && cPA.welcome, 20000);
  ok('chân 10-0: hai nhân vật kiểm ô vào được game', !!(cPK.welcome && cPA.welcome), 'needChar ky=' + cPK.needChar + ' am=' + cPA.needChar);
  await waitFor(() => meOf(cPK) && meOf(cPA), 10000);
  const pk = meOf(cPK), pa = meOf(cPA);
  ok('chân 10a: ô Cụ Ký (1064,1990) thoáng — nhân vật đứng đúng ô NPC', !!pk && Math.hypot(pk.x - NPC_CK.x, pk.y - NPC_CK.y) <= 5, pk && (pk.x + ',' + pk.y));
  ok('chân 10b: ô Âm Bà (760,481) thoáng — nhân vật đứng đúng ô NPC', !!pa && Math.hypot(pa.x - NPC_AB.x, pa.y - NPC_AB.y) <= 5, pa && (pa.x + ',' + pa.y));
  cPK.socket.disconnect(); cPA.socket.disconnect();

  // ---- Chân 1–3, 5: Trưởng Làng ----
  const cA = connect('tk352lang'); await waitFor(() => cA.welcome, 20000);
  await flyTo(cA, NPC_TL.x, NPC_TL.y, 40);
  const dlgA = await talk(cA, 'npc_truonglang');
  const ssA = (dlgA && dlgA.storySegs) || [];
  ok('chân 1: hộp thoại Trưởng Làng có mục đoạn kể, tl_h1_tree = new', ssA.some((s) => s.id === 'tl_h1_tree' && s.state === 'new'), JSON.stringify(ssA.map((s) => s.id + ':' + s.state)));
  ok('chân 5a: tl_h1_cuahep khóa (chưa nghe đoạn trước)', ssA.some((s) => s.id === 'tl_h1_cuahep' && s.state === 'locked'));
  const rA1 = await listen(cA, 'npc_truonglang', 'tl_h1_tree');
  ok('chân 2a: nghe tl_h1_tree -> storyRead đúng đoạn, bản clear', !!rA1.read && rA1.read.segId === 'tl_h1_tree' && rA1.read.version === 'clear', JSON.stringify(rA1));
  await waitFor(() => segsOf(cA).tl_h1_tree, 6000);
  ok('chân 2b: payload soul.storySegs.tl_h1_tree = 2', segsOf(cA).tl_h1_tree === 2, JSON.stringify(segsOf(cA)));
  const rA2 = await listen(cA, 'npc_truonglang', 'tl_h1_tree');
  ok('chân 3: nghe lại đoạn đã nghe -> bị từ chối (ghi đúng 1 lần)', !!rA2.err, JSON.stringify(rA2));
  ok('chân 3b: giá trị ghi không đổi sau lần nghe lại', segsOf(cA).tl_h1_tree === 2);
  const rA3 = await listen(cA, 'npc_truonglang', 'tl_h1_cuahep');
  ok('chân 5b: nghe xong đoạn trước -> tl_h1_cuahep mở', !!rA3.read && rA3.read.segId === 'tl_h1_cuahep', JSON.stringify(rA3));
  cA.socket.disconnect();

  // ---- Chân 5–6: Cụ Ký (vague -> clear) ----
  const cB = connect('tk352cuky'); await waitFor(() => cB.welcome, 20000);
  await flyTo(cB, NPC_CK.x, NPC_CK.y, 40);
  const dlgB = await talk(cB, 'npc_cuky');
  const ssB = (dlgB && dlgB.storySegs) || [];
  ok('chân 1b: hộp thoại Cụ Ký có đoạn kể, ck_h1_nhanhoang = new', ssB.some((s) => s.id === 'ck_h1_nhanhoang' && s.state === 'new'), JSON.stringify(ssB.map((s) => s.id + ':' + s.state)));
  ok('chân 5c: ck_h1_kinh khóa khi chưa nghe Nhân Hoàng', ssB.some((s) => s.id === 'ck_h1_kinh' && s.state === 'locked'));
  const rB0 = await listen(cB, 'npc_cuky', 'ck_h1_kinh');
  ok('chân 5d: xin nghe ck_h1_kinh trước thứ tự -> bị chặn', !!rB0.err, JSON.stringify(rB0));
  const rB1 = await listen(cB, 'npc_cuky', 'ck_h1_nhanhoang');
  ok('chân 6a: nghe ck_h1_nhanhoang -> ok', !!rB1.read, JSON.stringify(rB1));
  const rB2 = await listen(cB, 'npc_cuky', 'ck_h1_kinh');
  ok('chân 6b: chưa tới Đài Kiếp -> ck_h1_kinh là bản MƠ HỒ (vague)', !!rB2.read && rB2.read.version === 'vague', JSON.stringify(rB2));
  await waitFor(() => segsOf(cB).ck_h1_kinh, 6000);
  ok('chân 6c: storySegs.ck_h1_kinh = 1 (mơ hồ)', segsOf(cB).ck_h1_kinh === 1, JSON.stringify(segsOf(cB)));
  const rB3 = await listen(cB, 'npc_cuky', 'ck_h1_kinh');
  ok('chân 6d: chưa có trải nghiệm mới -> không nghe lại được bản mơ hồ', !!rB3.err, JSON.stringify(rB3));
  cB.socket.disconnect();
  const cB2 = connect('tk352ky2'); await waitFor(() => cB2.welcome, 20000);
  await flyTo(cB2, NPC_CK.x, NPC_CK.y, 40);
  await listen(cB2, 'npc_cuky', 'ck_h1_nhanhoang');
  const rB4 = await listen(cB2, 'npc_cuky', 'ck_h1_kinh');
  ok('chân 6e: đã tới Đài Kiếp (cờ trải nghiệm) -> ck_h1_kinh là bản RÕ (clear)', !!rB4.read && rB4.read.version === 'clear', JSON.stringify(rB4));
  await waitFor(() => segsOf(cB2).ck_h1_kinh === 2, 6000);
  ok('chân 6f: storySegs.ck_h1_kinh = 2 (rõ)', segsOf(cB2).ck_h1_kinh === 2, JSON.stringify(segsOf(cB2)));
  cB2.socket.disconnect();

  // ---- Chân 7: Âm Bà — đoạn sâu theo điều kiện riêng ----
  const cE = connect('tk352amba'); await waitFor(() => cE.welcome, 20000);
  await flyTo(cE, NPC_AB.x, NPC_AB.y, 40);
  const rE1 = await listen(cE, 'npc_amba', 'ab_h2_sotb');
  ok('chân 7a: KD nghe ab_h2_sotb -> ok', !!rE1.read, JSON.stringify(rE1));
  const rE2 = await listen(cE, 'npc_amba', 'ab_h2_mangdi');
  ok('chân 7b: Kiếm tu thường (không Quỷ/Luyện Hồn/duyên) -> ab_h2_mangdi bị khóa', !!rE2.err, JSON.stringify(rE2));
  const rE3 = await listen(cE, 'npc_amba', 'ab_duyen');
  ok('chân 7c: duyên nợ 0 -> ab_duyen bị khóa', !!rE3.err, JSON.stringify(rE3));
  const rE4 = await listen(cE, 'npc_amba', 'ab_quy');
  ok('chân 7d: không phải Quỷ tộc/Quỷ tu -> ab_quy bị khóa', !!rE4.err, JSON.stringify(rE4));
  cE.socket.disconnect();
  const cF = connect('tk352quy'); await waitFor(() => cF.welcome, 20000);
  await flyTo(cF, NPC_AB.x, NPC_AB.y, 40);
  await listen(cF, 'npc_amba', 'ab_h2_sotb');
  const rF1 = await listen(cF, 'npc_amba', 'ab_h2_mangdi');
  ok('chân 7e: Quỷ tu -> ab_h2_mangdi mở', !!rF1.read, JSON.stringify(rF1));
  const rF2 = await listen(cF, 'npc_amba', 'ab_quy');
  ok('chân 7f: Quỷ tộc -> ab_quy mở', !!rF2.read, JSON.stringify(rF2));
  cF.socket.disconnect();
  const cG = connect('tk352duyen'); await waitFor(() => cG.welcome, 20000);
  await flyTo(cG, NPC_AB.x, NPC_AB.y, 40);
  await listen(cG, 'npc_amba', 'ab_h2_sotb');
  const rG1 = await listen(cG, 'npc_amba', 'ab_h2_mangdi');
  ok('chân 7g: duyên nợ 120 (>= 100) -> ab_h2_mangdi mở', !!rG1.read, JSON.stringify(rG1));
  const rG2 = await listen(cG, 'npc_amba', 'ab_duyen');
  ok('chân 7h: duyên nợ 120 -> ab_duyen mở', !!rG2.read, JSON.stringify(rG2));
  cG.socket.disconnect();

  // ---- Chân 4: khóa theo cảnh (TC Bách Điểu bay tới thương nhân, xin đoạn Kim Đan) ----
  const cL = connect('tk352low'); await waitFor(() => cL.welcome, 20000);
  await flyTo(cL, NPC_TN.x, NPC_TN.y, 40);
  const dlgL = await talk(cL, 'npc_thuongnhan');
  const ssL = (dlgL && dlgL.storySegs) || [];
  ok('chân 4a: TC gặp thương nhân, tn_h3_lahau hiện khóa trong hộp thoại', ssL.some((s) => s.id === 'tn_h3_lahau' && s.state === 'locked'), JSON.stringify(ssL.map((s) => s.id + ':' + s.state)));
  const rL = await listen(cL, 'npc_thuongnhan', 'tn_h3_lahau');
  ok('chân 4b: TC nghe đoạn Kim Đan -> bị chặn phía server', !!rL.err, JSON.stringify(rL));
  ok('chân 4c: đoạn bị khóa KHÔNG ghi vào hồn', !segsOf(cL).tn_h3_lahau, JSON.stringify(segsOf(cL)));
  cL.socket.disconnect();

  // ---- Chân 6 (tiếp) + 8: Thương Nhân — vague -> tặng quà -> clear; rò đoạn ----
  const cD = connect('tk352thuong'); await waitFor(() => cD.welcome, 20000);
  await flyTo(cD, NPC_TN.x, NPC_TN.y, 40);
  const dlgD = await talk(cD, 'npc_thuongnhan');
  ok('chân 8a: gặp được Thương Nhân (ngày thế giới 2 — thương nhân có mặt)', !!dlgD, 'dialogs=' + cD.dialogs.length + ' errs=' + cD.errs.join(';'));
  const rD1 = await listen(cD, 'npc_thuongnhan', 'tn_h3_lahau');
  ok('chân 8b: KD nghe tn_h3_lahau -> ok', !!rD1.read, JSON.stringify(rD1));
  const rD2 = await listen(cD, 'npc_thuongnhan', 'tn_h3_muoimot');
  ok('chân 6g: chưa biếu gì -> tn_h3_muoimot bản MƠ HỒ', !!rD2.read && rD2.read.version === 'vague', JSON.stringify(rD2));
  const e0 = cD.errs.length;
  cD.socket.emit('talk_npc', { npcId: 'npc_cuky', storySeg: 'tn_h3_lahau' });
  const leakErr = await waitFor(() => cD.errs.length > e0 ? cD.errs[cD.errs.length - 1] : null, 6000);
  ok('chân 8c: xin nghe đoạn của Thương Nhân tại Cụ Ký -> bị từ chối (không rò đoạn)', !!leakErr, 'err=' + leakErr);
  cD.socket.emit('npc_gift', { npcId: 'npc_thuongnhan', itemId: 'thit_thu' });
  await sleep(600);
  const dlgD2 = await talk(cD, 'npc_thuongnhan');
  const ssD2 = (dlgD2 && dlgD2.storySegs) || [];
  ok('chân 6h: biếu thịt thú -> tn_h3_muoimot thành "upgrade" (server đã ghi cờ biếu quà)', ssD2.some((s) => s.id === 'tn_h3_muoimot' && s.state === 'upgrade'), JSON.stringify(ssD2.map((s) => s.id + ':' + s.state)));
  const rD3 = await listen(cD, 'npc_thuongnhan', 'tn_h3_muoimot');
  ok('chân 6i: sau khi biếu -> tn_h3_muoimot bản RÕ', !!rD3.read && rD3.read.version === 'clear', JSON.stringify(rD3));
  await waitFor(() => segsOf(cD).tn_h3_muoimot === 2, 6000);
  ok('chân 6j: storySegs.tn_h3_muoimot nâng lên 2', segsOf(cD).tn_h3_muoimot === 2, JSON.stringify(segsOf(cD)));
  cD.socket.disconnect();

  // ---- Chân 9: danh hiệu khi nghe trọn Hồi 1 ----
  const cT = connect('tk352title'); await waitFor(() => cT.welcome, 20000);
  await flyTo(cT, NPC_TL.x, NPC_TL.y, 40);
  await listen(cT, 'npc_truonglang', 'tl_h1_tree');
  await listen(cT, 'npc_truonglang', 'tl_h1_cuahep');
  await flyTo(cT, NPC_CK.x, NPC_CK.y, 40);
  await listen(cT, 'npc_cuky', 'ck_h1_nhanhoang');
  const rT = await listen(cT, 'npc_cuky', 'ck_h1_kinh');
  ok('chân 9a: đoạn cuối Hồi 1 nghe được (bản rõ nhờ cờ Đài Kiếp)', !!rT.read && rT.read.version === 'clear', JSON.stringify(rT));
  const titleT = await waitFor(() => { const ch = lastChar(cT); return ch && ch.title === 'Người Nghe Chuyện Xưa' ? ch.title : null; }, 8000);
  ok('chân 9b: nghe trọn Hồi 1 -> danh hiệu "Người Nghe Chuyện Xưa" trên thẻ', !!titleT, 'title=' + (lastChar(cT) || {}).title);
  cT.socket.disconnect();

  // ---- Chân 11: bền qua restart ----
  const cB3 = connect('tk352cuky');
  await waitFor(() => cB3.welcome, 20000);
  ok('chân 11a: (trước restart) storySegs của P352Ky còn: ck_h1_kinh = 1', segsOf(cB3).ck_h1_kinh === 1, JSON.stringify(segsOf(cB3)));
  cB3.socket.disconnect();
  await sleep(800);
  await stopServer();
  await startServer(3686, '352b');
  const cB4 = connect('tk352cuky'); await waitFor(() => cB4.welcome, 20000);
  ok('chân 11b: SAU restart, storySegs vẫn nguyên (ck_h1_nhanhoang + ck_h1_kinh = 1)', segsOf(cB4).ck_h1_nhanhoang === 2 && segsOf(cB4).ck_h1_kinh === 1, JSON.stringify(segsOf(cB4)));
  cB4.socket.disconnect();

  await stopServer();
  console.log(`\nKẾT QUẢ GĐ352: ${pass} PASS / ${fail} FAIL`);
  process.exit(fail ? 1 : 0);
})().catch(async (e) => { console.error('PROBE ERROR', e); try { await stopServer(); } catch (_) {} process.exit(2); });
