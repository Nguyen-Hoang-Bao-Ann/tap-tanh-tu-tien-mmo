// Probe GĐ353 (B2) — Hồi 4–6 + Kiếp Đài Thủ MỚI ở Đài Kiếp + Quản Sự bản chính thống
// + phân giọng Tiên/Ma (Sứ Giả bản Ma / Thương Nhân bản Tiên) + điều kiện trải nghiệm (kính/vật phẩm ẩn).
// Vị trí Kiếp Đài Thủ: server tự đặt tại map kim_kiep_son (7050,5546) — đọc từ log boot [GĐ353].
// Chân kiểm (theo §B5 đợt B2):
//  1) Kiếp Đài Thủ hiện trong mapEnterPayload của kim_kiep_son + talk được tại chỗ; đoạn Hồi 1 (kdt_h1_kinh) nghe được.
//  2) Khóa theo cảnh tại Đài Kiếp: PH nghe kdt_h6_giatruyen ok; kdt_h6_diemdanh (Độ Kiếp) khóa. DK nghe được cả hai.
//  3) Điều kiện vật phẩm ẩn: không có Thái Nhất Thiên Mệnh Kính -> kdt_h1_mangkinh + kdt_h5_soi khóa;
//     có relic than (hồn) + Hóa Thần -> cả hai mở.
//  4) Quản Sự: KD nghe qs_h3_chinhthong ok; TC bị khóa.
//  5) Phân giọng Tiên/Ma KHÔNG RÒ: phe Ma nghe sg_h3_ma ở Sứ Giả, KHÔNG nghe được tn_h3_tien;
//     phe Tiên nghe tn_h3_tien ở Thương Nhân, KHÔNG nghe được sg_h3_ma; không phe -> cả hai khóa.
//  6) Hồi 4 cần reqHoi 3 + Nguyên Anh: KD (đã nghe Hồi 3) vẫn khóa vì thiếu cảnh; NA chưa nghe Hồi 3 cũng khóa;
//     NA + đã nghe Hồi 3 -> ab_h4_tiengso mở. Bản Quỷ (ab_h4_quy) chỉ Quỷ tu/Quỷ tộc.
//  7) Hồi 5: ck_h5_bong cần Hóa Thần + Luyện Hồn; ck_h5_chuky cần Thần Thuật (phapTuong.divineArt).
//  8) CHUỖI TRẢI NGHIỆM THẬT: nhân vật đứng trên map Đài Kiếp -> tick tự bật counters.storyDaiKiep (persist qua
//     disconnect) -> dời nhân vật về làng (vá file khi server dừng) -> nghe ck_h1_kinh lần đầu đã là BẢN RÕ.
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
let serverProc = null, killTimer = null, CUR_PORT = 3692;
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
const segsOf = (c) => { const ch = lastChar(c); return (ch && ch.soul && ch.soul.storySegs) || {}; };
const availOf = (c) => { const ch = lastChar(c); return (ch && ch.storyAvail) || {}; };
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
const NPC_QS = { x: 1252, y: 872 }, NPC_SG = { x: 1704, y: 1051 }, NPC_CK = { x: 1064, y: 1990 }, NPC_AB = { x: 760, y: 481 }, NPC_TN = { x: 1977, y: 1377 };
const KDT = { mapId: 'kim_kiep_son', x: 7050, y: 5546 };

(async () => {
  const chars = {};
  chars['tk353kdt1'] = BASE('tk353kdt1', 'P353KdtPh', { realm: 'ph', mapId: KDT.mapId, x: KDT.x, y: KDT.y });
  chars['tk353kdt2'] = BASE('tk353kdt2', 'P353KdtDk', { realm: 'dk', mapId: KDT.mapId, x: KDT.x, y: KDT.y, soul: { relics: { than: 1 } } });
  chars['tk353qs1'] = BASE('tk353qs1', 'P353QuanSu', {});
  chars['tk353qslow'] = BASE('tk353qslow', 'P353QuanSuLow', { realm: 'tc', race: 'dieu' });
  chars['tk353ma1'] = BASE('tk353ma1', 'P353PheMa', { branch: { side: 'ma', source: 'normal' } });
  chars['tk353tien'] = BASE('tk353tien', 'P353PheTien', { branch: { side: 'tien', source: 'normal' } });
  chars['tk353none'] = BASE('tk353none', 'P353KhongPhe', {});
  chars['tk353h41'] = BASE('tk353h41', 'P353Hoi4', { realm: 'na' });
  chars['tk353h4b'] = BASE('tk353h4b', 'P353Hoi4b', { realm: 'na' });
  chars['tk353h4quy'] = BASE('tk353h4quy', 'P353Hoi4Quy', { realm: 'na', classId: 'quytu', race: 'quy' });
  chars['tk353h51'] = BASE('tk353h51', 'P353Hoi5', { realm: 'ht', anState: { luyenHon: true } });
  chars['tk353h5no'] = BASE('tk353h5no', 'P353Hoi5No', { realm: 'ht' });
  chars['tk353h5pt'] = BASE('tk353h5pt', 'P353Hoi5Pt', { realm: 'ht', phapTuong: { stage: 9, divineArt: { name: 'Thử Thuật', mode: 'cong', desc: 'bản thử', signature: 'a>b' } } });
  chars['tk353visit'] = BASE('tk353visit', 'P353Visit', { realm: 'dk', mapId: KDT.mapId, x: KDT.x + 300, y: KDT.y + 300 });
  fs.writeFileSync(path.join(DIR, 'characters.json'), JSON.stringify(chars));
  fs.writeFileSync(path.join(DIR, 'accounts.json'), '{}');
  fs.writeFileSync(path.join(DIR, 'world.json'), JSON.stringify({ totalMinutes: 3360, savedAt: Date.now() }));

  await startServer(3692, '353a');
  const bootLog = fs.readFileSync(path.join(DIR, 'srv_353a.log'), 'utf8');
  ok('chân 1a: server đặt Kiếp Đài Thủ tại kim_kiep_son', /\[GĐ353\] NPC kể chuyện Kiếp Đài Thủ đứng tại kim_kiep_son/.test(bootLog), bootLog.split('\n').filter((l) => l.includes('GĐ353')).join(' '));

  // ---- Chân 1–3: Kiếp Đài Thủ ----
  const cK1 = connect('tk353kdt1'); await waitFor(() => cK1.welcome, 20000);
  const mapEnt = await waitFor(() => cK1.maps.find((m) => m.mapId === KDT.mapId) || null, 10000);
  const kdtNpc = mapEnt && (mapEnt.npcs || []).find((n) => n.id === 'npc_kiepdaithu');
  ok('chân 1b: mapEnterPayload của kim_kiep_son có Kiếp Đài Thủ tại (7050,5546)', !!kdtNpc && Math.hypot(kdtNpc.x - KDT.x, kdtNpc.y - KDT.y) <= 2, JSON.stringify(kdtNpc));
  const dlgK = await talk(cK1, 'npc_kiepdaithu');
  const ssK = (dlgK && dlgK.storySegs) || [];
  ok('chân 1c: hộp thoại Kiếp Đài Thủ có kdt_h1_kinh = new + kdt_h6_giatruyen = new (Phản Hư)', ssK.some((s) => s.id === 'kdt_h1_kinh' && s.state === 'new') && ssK.some((s) => s.id === 'kdt_h6_giatruyen' && s.state === 'new'), JSON.stringify(ssK.map((s) => s.id + ':' + s.state)));
  ok('chân 2a: kdt_h6_diemdanh khóa ở Phản Hư (cần Độ Kiếp)', ssK.some((s) => s.id === 'kdt_h6_diemdanh' && s.state === 'locked'));
  ok('chân 3a: chưa có kính -> kdt_h1_mangkinh + kdt_h5_soi khóa', ssK.some((s) => s.id === 'kdt_h1_mangkinh' && s.state === 'locked') && ssK.some((s) => s.id === 'kdt_h5_soi' && s.state === 'locked'));
  const rK1 = await listen(cK1, 'npc_kiepdaithu', 'kdt_h1_kinh');
  ok('chân 1d: nghe kdt_h1_kinh (Hồi 1) tại Đài Kiếp -> ok', !!rK1.read && rK1.read.segId === 'kdt_h1_kinh', JSON.stringify(rK1));
  const rK2 = await listen(cK1, 'npc_kiepdaithu', 'kdt_h6_giatruyen');
  ok('chân 2b: Phản Hư nghe kdt_h6_giatruyen -> ok', !!rK2.read, JSON.stringify(rK2));
  const rK3 = await listen(cK1, 'npc_kiepdaithu', 'kdt_h6_diemdanh');
  ok('chân 2c: Phản Hư nghe kdt_h6_diemdanh -> bị chặn', !!rK3.err, JSON.stringify(rK3));
  const rK4 = await listen(cK1, 'npc_kiepdaithu', 'kdt_h1_mangkinh');
  ok('chân 3b: không kính -> kdt_h1_mangkinh bị chặn', !!rK4.err, JSON.stringify(rK4));
  cK1.socket.disconnect();
  const cK2 = connect('tk353kdt2'); await waitFor(() => cK2.welcome, 20000);
  const rK5 = await listen(cK2, 'npc_kiepdaithu', 'kdt_h1_mangkinh');
  ok('chân 3c: có Thái Nhất Thiên Mệnh Kính (hồn) -> kdt_h1_mangkinh mở', !!rK5.read, JSON.stringify(rK5));
  const rK6 = await listen(cK2, 'npc_kiepdaithu', 'kdt_h5_soi');
  ok('chân 3d: Hóa Thần+ (Độ Kiếp) + có kính -> kdt_h5_soi mở', !!rK6.read, JSON.stringify(rK6));
  const rK7 = await listen(cK2, 'npc_kiepdaithu', 'kdt_h6_diemdanh');
  ok('chân 2d: Độ Kiếp nghe kdt_h6_diemdanh -> ok', !!rK7.read, JSON.stringify(rK7));
  cK2.socket.disconnect();

  // ---- Chân 4: Quản Sự ----
  const cQ = connect('tk353qs1'); await waitFor(() => cQ.welcome, 20000);
  await flyTo(cQ, NPC_QS.x, NPC_QS.y, 40);
  const rQ1 = await listen(cQ, 'npc_quansu', 'qs_h3_chinhthong');
  ok('chân 4a: KD nghe qs_h3_chinhthong (bản chính thống) -> ok', !!rQ1.read, JSON.stringify(rQ1));
  cQ.socket.disconnect();
  const cQL = connect('tk353qslow'); await waitFor(() => cQL.welcome, 20000);
  await flyTo(cQL, NPC_QS.x, NPC_QS.y, 40);
  const rQ2 = await listen(cQL, 'npc_quansu', 'qs_h3_chinhthong');
  ok('chân 4b: TC nghe qs_h3_chinhthong -> bị chặn (cần Kim Đan)', !!rQ2.err, JSON.stringify(rQ2));
  cQL.socket.disconnect();

  // ---- Chân 5: phân giọng Tiên/Ma ----
  const cM = connect('tk353ma1'); await waitFor(() => cM.welcome, 20000);
  await flyTo(cM, NPC_SG.x, NPC_SG.y, 40);
  const rM1 = await listen(cM, 'npc_sugia', 'sg_h3_ma');
  ok('chân 5a: phe Ma nghe sg_h3_ma ở Sứ Giả -> ok', !!rM1.read, JSON.stringify(rM1));
  await flyTo(cM, NPC_TN.x, NPC_TN.y, 40);
  const rM2 = await listen(cM, 'npc_thuongnhan', 'tn_h3_tien');
  ok('chân 5b: phe Ma xin bản Tiên (tn_h3_tien) -> bị chặn, không rò', !!rM2.err, JSON.stringify(rM2));
  cM.socket.disconnect();
  const cTi = connect('tk353tien'); await waitFor(() => cTi.welcome, 20000);
  await flyTo(cTi, NPC_TN.x, NPC_TN.y, 40);
  const rT1 = await listen(cTi, 'npc_thuongnhan', 'tn_h3_tien');
  ok('chân 5c: phe Tiên nghe tn_h3_tien ở Thương Nhân -> ok', !!rT1.read, JSON.stringify(rT1));
  await flyTo(cTi, NPC_SG.x, NPC_SG.y, 40);
  const rT2 = await listen(cTi, 'npc_sugia', 'sg_h3_ma');
  ok('chân 5d: phe Tiên xin bản Ma (sg_h3_ma) -> bị chặn, không rò', !!rT2.err, JSON.stringify(rT2));
  cTi.socket.disconnect();
  const cN = connect('tk353none'); await waitFor(() => cN.welcome, 20000);
  await flyTo(cN, NPC_SG.x, NPC_SG.y, 40);
  const rN1 = await listen(cN, 'npc_sugia', 'sg_h3_ma');
  ok('chân 5e: chưa chọn phe -> sg_h3_ma khóa', !!rN1.err, JSON.stringify(rN1));
  await flyTo(cN, NPC_TN.x, NPC_TN.y, 40);
  const rN2 = await listen(cN, 'npc_thuongnhan', 'tn_h3_tien');
  ok('chân 5f: chưa chọn phe -> tn_h3_tien khóa', !!rN2.err, JSON.stringify(rN2));
  cN.socket.disconnect();

  // ---- Chân 6: Hồi 4 — reqHoi 3 + Nguyên Anh + bản Quỷ ----
  const cH4 = connect('tk353h41'); await waitFor(() => cH4.welcome, 20000);
  await flyTo(cH4, NPC_AB.x, NPC_AB.y, 40);
  const rH0 = await listen(cH4, 'npc_amba', 'ab_h4_tiengso');
  ok('chân 6a: NA chưa nghe Hồi 3 -> ab_h4_tiengso khóa (reqHoi)', !!rH0.err, JSON.stringify(rH0));
  await flyTo(cH4, NPC_TN.x, NPC_TN.y, 40);
  await listen(cH4, 'npc_thuongnhan', 'tn_h3_lahau');
  await flyTo(cH4, NPC_AB.x, NPC_AB.y, 40);
  const rH1 = await listen(cH4, 'npc_amba', 'ab_h4_tiengso');
  ok('chân 6b: NA + đã nghe Hồi 3 -> ab_h4_tiengso mở', !!rH1.read, JSON.stringify(rH1));
  const rH2 = await listen(cH4, 'npc_amba', 'ab_h4_quy');
  ok('chân 6c: Kiếm tu thường -> ab_h4_quy (bản Quỷ) khóa', !!rH2.err, JSON.stringify(rH2));
  cH4.socket.disconnect();
  const cH4b = connect('tk353h4b'); await waitFor(() => cH4b.welcome, 20000);
  // nhân vật này KD về cảnh nghe Hồi 3 trước? — không: h4b là NA nhưng thử nghe Hồi 4 khi đã nghe Hồi 3 bằng đường KD không có; dùng chính h4b NA nghe Hồi 3 tại Quản Sự (qs cần KD, NA đạt) rồi quay lại
  await flyTo(cH4b, NPC_QS.x, NPC_QS.y, 40);
  await listen(cH4b, 'npc_quansu', 'qs_h3_chinhthong');
  await flyTo(cH4b, NPC_AB.x, NPC_AB.y, 40);
  const rH3 = await listen(cH4b, 'npc_amba', 'ab_h4_tiengso');
  ok('chân 6d: NA nghe Hồi 3 ở Quản Sự (đoạn chính khác) -> ab_h4_tiengso cũng mở (reqHoi tính mọi đoạn chính)', !!rH3.read, JSON.stringify(rH3));
  cH4b.socket.disconnect();
  const cHQ = connect('tk353h4quy'); await waitFor(() => cHQ.welcome, 20000);
  await flyTo(cHQ, NPC_TN.x, NPC_TN.y, 40);
  await listen(cHQ, 'npc_thuongnhan', 'tn_h3_lahau');
  await flyTo(cHQ, NPC_AB.x, NPC_AB.y, 40);
  const rH4 = await listen(cHQ, 'npc_amba', 'ab_h4_quy');
  ok('chân 6e: Quỷ tu NA -> ab_h4_quy mở', !!rH4.read, JSON.stringify(rH4));
  cHQ.socket.disconnect();

  // ---- Chân 7: Hồi 5 — Luyện Hồn + Thần Thuật ----
  const c5 = connect('tk353h51'); await waitFor(() => c5.welcome, 20000);
  await flyTo(c5, NPC_CK.x, NPC_CK.y, 40);
  const r51 = await listen(c5, 'npc_cuky', 'ck_h5_bong');
  ok('chân 7a: Hóa Thần + Luyện Hồn -> ck_h5_bong mở', !!r51.read, JSON.stringify(r51));
  const r52 = await listen(c5, 'npc_cuky', 'ck_h5_chuky');
  ok('chân 7b: chưa có Thần Thuật -> ck_h5_chuky khóa', !!r52.err, JSON.stringify(r52));
  c5.socket.disconnect();
  const c5n = connect('tk353h5no'); await waitFor(() => c5n.welcome, 20000);
  await flyTo(c5n, NPC_CK.x, NPC_CK.y, 40);
  const r53 = await listen(c5n, 'npc_cuky', 'ck_h5_bong');
  ok('chân 7c: Hóa Thần nhưng CHƯA Luyện Hồn -> ck_h5_bong khóa', !!r53.err, JSON.stringify(r53));
  c5n.socket.disconnect();
  const c5p = connect('tk353h5pt'); await waitFor(() => c5p.welcome, 20000);
  await flyTo(c5p, NPC_CK.x, NPC_CK.y, 40);
  const r54 = await listen(c5p, 'npc_cuky', 'ck_h5_chuky');
  ok('chân 7d: có Thần Thuật (divineArt) -> ck_h5_chuky mở', !!r54.read, JSON.stringify(r54));
  c5p.socket.disconnect();

  // ---- Chân 8: chuỗi trải nghiệm thật ở Đài Kiếp ----
  const cV = connect('tk353visit'); await waitFor(() => cV.welcome, 20000);
  await sleep(3500); // đứng trên map Đài Kiếp vài nhịp tick -> server tự bật counters.storyDaiKiep
  cV.socket.disconnect();
  await sleep(800);
  await stopServer();
  let disk = null;
  try { disk = JSON.parse(fs.readFileSync(path.join(DIR, 'characters.json'), 'utf8')); } catch (e) {}
  const vRec = disk && disk['tk353visit'];
  ok('chân 8a: đứng trên map Đài Kiếp -> counters.storyDaiKiep = 1 đã persist vào file', !!vRec && !!vRec.counters && vRec.counters.storyDaiKiep === 1, vRec && JSON.stringify(vRec.counters));
  if (vRec) { vRec.mapId = 'lang_tan_thu'; vRec.x = 1565; vRec.y = 1011; fs.writeFileSync(path.join(DIR, 'characters.json'), JSON.stringify(disk)); }
  await startServer(3693, '353b');
  const cV2 = connect('tk353visit'); await waitFor(() => cV2.welcome, 20000);
  await flyTo(cV2, NPC_CK.x, NPC_CK.y, 40);
  await listen(cV2, 'npc_cuky', 'ck_h1_nhanhoang');
  const rV = await listen(cV2, 'npc_cuky', 'ck_h1_kinh');
  ok('chân 8b: sau khi TỰ TỚI Đài Kiếp, nghe ck_h1_kinh lần đầu đã là BẢN RÕ', !!rV.read && rV.read.version === 'clear', JSON.stringify(rV));
  cV2.socket.disconnect();

  await stopServer();
  console.log(`\nKẾT QUẢ GĐ353: ${pass} PASS / ${fail} FAIL`);
  process.exit(fail ? 1 : 0);
})().catch(async (e) => { console.error('PROBE ERROR', e); try { await stopServer(); } catch (_) {} process.exit(2); });
