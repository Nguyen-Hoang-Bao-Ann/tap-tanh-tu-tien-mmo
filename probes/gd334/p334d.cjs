// Probe GĐ334-D — TRẬN PHÁP TÔNG CHIẾN (boot chính): bày sai vị trí bị chặn; bày đúng pha/tại cờ trừ đúng Quỹ 10.000 + 5 Đá Quý kho;
// Thủ Lĩnh +2.000 máu nhờ trận Thủ Ngự của bên thủ; Công Phá +8% công trong vùng (đo sát thương lên Thủ Lĩnh trước/sau khi trận nhà bị phá);
// Thủ Ngự -8% sát thương nhận (đo PvP trước/sau khi phá Trận Nhãn địch); phá Trận Nhãn -> trận tắt + Thủ Lĩnh mất máu cộng thêm.
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const net = require('net');
const ROOT = path.join(__dirname, '..', '..');
const PORT = 3577;
const DIR = __dirname;
const { io } = require(path.join(ROOT, 'client/node_modules/socket.io-client'));
const { createMerger } = require(path.join(ROOT, 'client/worldmerge.cjs'));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function waitFor(fn, ms) { const t0 = Date.now(); while (Date.now() - t0 < ms) { const v = fn(); if (v) return v; await sleep(150); } return null; }
function portFree(port) { return new Promise((res) => { const s = net.createServer(); s.once('error', () => res(false)); s.listen(port, () => s.close(() => res(true))); }); }
let serverProc = null, killTimer = null;
async function startServer() {
  if (!(await portFree(PORT))) throw new Error('port ban');
  serverProc = spawn('node', ['server/index.js'], { cwd: ROOT, env: { ...process.env, PORT: String(PORT), TTT_STORAGE: 'file', TTT_CHAR_FILE: path.join(DIR, 'characters.json'), TTT_ACC_FILE: path.join(DIR, 'accounts.json'), TTT_WORLD_FILE: path.join(DIR, 'world.json'), TTT_SESS_FILE: path.join(DIR, 'sessions.json'), TTT_DAY_REAL_MS: '600000', TTT_TUVI_NEED: '5', TTT_WAR_DELAY_MS: '9000', TTT_WAR_LEN_MS: '240000' }, stdio: ['ignore', 'pipe', 'pipe'] });
  serverProc.stderr.on('data', (d) => process.stderr.write('[srv] ' + d));
  killTimer = setTimeout(() => { try { serverProc.kill('SIGKILL'); } catch (e) {} }, 60000);
  const t0 = Date.now();
  while (Date.now() - t0 < 45000) { try { const r = await fetch(`http://127.0.0.1:${PORT}/api/status`); if (r.ok) { clearTimeout(killTimer); return; } } catch (e) {} await sleep(500); }
  throw new Error('server khong len');
}
async function stopServer() { if (!serverProc) return; const p = serverProc; serverProc = null; await new Promise((res) => { const t = setTimeout(() => { try { p.kill('SIGKILL'); } catch (e) {} res(); }, 4000); p.once('exit', () => { clearTimeout(t); res(); }); try { p.kill('SIGTERM'); } catch (e) { clearTimeout(t); res(); } }); const t0 = Date.now(); while (Date.now() - t0 < 10000 && !(await portFree(PORT))) await sleep(300); }
const FLAG = { x: 4248, y: 6223 }; // cổng map huyet_sac_rung = điểm cờ lm_huyet_sac
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
const meOf = (c) => (c.state?.players || []).find((p) => p.name === c.myName) || (c.state?.players || []).find((p) => p.id === c.welcome.id); // dò theo TÊN: socket reconnect làm welcome.id cũ
const monsOf = (c) => c.state?.monsters || [];
const playerOf = (c, id) => (c.state?.players || []).find((p) => p.id === id);
async function flyTo(c, x, y, tol) {
  c.socket.emit('fly_toggle', {}); await sleep(300);
  const t0 = Date.now();
  while (Date.now() - t0 < 25000) { const me = meOf(c); if (!me) { await sleep(120); continue; } const dx = x - me.x, dy = y - me.y; const d = Math.hypot(dx, dy); if (d <= (tol || 45)) break; c.socket.emit('client_input', { vx: dx / d, vy: dy / d }); await sleep(110); }
  c.socket.emit('client_input', { vx: 0, vy: 0 });
  c.socket.emit('fly_toggle', {}); await sleep(400);
}
// n đòn thường lên 1 thực thể quái theo id (đứng sát vị trí sống của nó); trả về mảng lượng máu rơi từng đòn
async function hitMonsterN(c, monId, n) {
  const drops = [];
  for (let i = 0; i < n; i++) {
    const m = monsOf(c).find((x) => x.id === monId);
    if (!m) break;
    await flyTo(c, m.x, m.y, 30);
    const before = (monsOf(c).find((x) => x.id === monId) || {}).hp;
    if (before == null) break;
    c.socket.emit('player_attack');
    const got = await waitFor(() => { const mm = monsOf(c).find((x) => x.id === monId); return !mm || mm.hp < before ? true : null; }, 1600);
    const after = (monsOf(c).find((x) => x.id === monId) || {}).hp;
    if (got) drops.push(after == null ? before : before - after);
    await sleep(250);
  }
  return drops;
}
// n đòn PvP lên 1 người chơi (đứng cạnh người đó); trả về mảng máu rơi của nạn nhân (chỉ đếm đòn rơi 100–500)
async function hitPlayerN(c, targetCtx, n) { // dò người bị đánh theo TÊN trong tick của KẺ ĐÁNH (id socket cũ sau reconnect — bài học p334b)
  const drops = [];
  const byName = () => (c.state?.players || []).find((p) => p.name === targetCtx.myName);
  for (let i = 0; i < n; i++) {
    const tp = byName();
    if (!tp) break;
    await flyTo(c, tp.x + 25, tp.y, 20);
    const before = (byName() || {}).hp;
    if (before == null) break;
    c.socket.emit('player_attack');
    const got = await waitFor(() => { const pp = byName(); return pp && pp.hp < before ? true : null; }, 1600);
    const after = (byName() || {}).hp;
    if (got && after != null) { const d = before - after; if (d >= 100 && d <= 500) drops.push(d); }
    await sleep(250);
  }
  return drops;
}
const median = (a) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : 0; };
(async () => {
  const chars = {
    p334c40001: BASE('p334c40001', ' ChuCong334', {}),
    p334m40001: BASE('p334m40001', ' QuanCong334', { x: FLAG.x + 60, y: FLAG.y + 30 }),
    p334c40002: BASE('p334c40002', ' ChuThu334', {}),
    p334m40002: BASE('p334m40002', ' QuanThu334', { x: FLAG.x - 150, y: FLAG.y, stats: { khiHuyet: 500, vatCong: 500, vatPhong: 100, phapCong: 100, phapPhong: 100, tocDo: 60, minhMan: 0 } }),
  };
  fs.writeFileSync(path.join(DIR, 'characters.json'), JSON.stringify(chars));
  const sects = [
    SECT('atk1', 'Tông Công Phá', [
      { token: 'p334c40001', name: ' ChuCong334', role: 'chu', contrib: 0 },
      { token: 'p334m40001', name: ' QuanCong334', role: 'detu', contrib: 500 },
    ], { fund: 100000, uy: 100, level: 5, warehouse: [{ itemId: 'da_quy', qty: 10 }], arts: [
      ART('da1', 'Phá Quân Tâm', 'pham', { cong: 5, mau: 4 }, 'f_toc', 'tamphap', 'p334c40001'),
      ART('da2', 'Lôi Phá Kỹ', 'linh', { sat: 5, dien: 1, tam: 2 }, 'f_mp', 'chienky', 'p334c40001'),
      ART('da3', 'Dưỡng Tâm Thiền', 'pham', { thien: 5, che: 2 }, 'f_cong', 'tamphap', 'p334c40001'),
      ART('da4', 'Tật Phong Quyết', 'pham', { cong: 5, toc: 2 }, 'f_mau', 'tamphap', 'p334c40001'),
    ] }),
    SECT('def1', 'Tông Thủ Ngự', [
      { token: 'p334c40002', name: ' ChuThu334', role: 'chu', contrib: 0 },
      { token: 'p334m40002', name: ' QuanThu334', role: 'detu', contrib: 500 },
    ], { fund: 50000, uy: 100, level: 5, territories: ['lm_huyet_sac'], territory: 'lm_huyet_sac', warehouse: [{ itemId: 'da_quy', qty: 8 }], arts: [
      ART('dd1', 'Hộ Thể Tâm', 'pham', { phong: 5, mau: 4 }, 'f_toc', 'tamphap', 'p334c40002'),
      ART('dd2', 'Kim Cang Thể', 'pham', { phong: 5, mau: 3 }, 'f_cong', 'tamphap', 'p334c40002'),
      ART('dd3', 'Huyền Vũ Quyết', 'pham', { mau: 4, phong: 3 }, 'f_thien', 'tamphap', 'p334c40002'),
      ART('dd4', 'Tĩnh Tâm Thiền', 'pham', { thien: 5 }, 'f_che', 'tamphap', 'p334c40002'),
      ART('dd5', 'Sơ Phá Quyền', 'pham', { cong: 2 }, 'f_mau', 'tamphap', 'p334c40002'),
    ] }),
  ];
  fs.writeFileSync(path.join(DIR, 'world.json'), JSON.stringify({ totalMinutes: 100 * 1440, savedAt: Date.now(), sects }));
  await startServer();
  const LA = await connect('p334c40001'); const MA = await connect('p334m40001');
  const LD = await connect('p334c40002'); const MD = await connect('p334m40002');
  await refresh(LA);
  ok('D0 ca 2 tong da dinh hinh phong (Cong Pha / Thu Ngu)', mySect(LA).phong && mySect(LA).phong.main === 'congpha' && mySect(LD).phong && mySect(LD).phong && (await refresh(LD), mySect(LD).phong.main === 'thungu'), JSON.stringify({ a: mySect(LA).phong, d: mySect(LD).phong }));
  // D1: tuyên chiến -> pending; bày trận XA cờ bị chặn
  LA.socket.emit('sect_war_declare', { pointId: 'lm_huyet_sac' }); await sleep(900); await refresh(LA);
  ok('D1 tuyen chien thanh cong (quy 100000-5000 cuoc)', mySect(LA).war && mySect(LA).war.state === 'pending' && mySect(LA).fund === 95000, `war=${JSON.stringify(mySect(LA).war)} fund=${mySect(LA).fund}`);
  await flyTo(LA, FLAG.x, FLAG.y - 320, 40); // trong vùng 350 nhưng XA điểm cờ (>90)
  LA.errors = []; LA.socket.emit('sect_war_formation_set', {}); await sleep(700);
  ok('D1 bay tran xa diem co bi chan', LA.errors.some((x) => x.includes('ĐIỂM CỜ')), LA.errors.join(';'));
  // D2: đứng tại cờ bày trận Công Phá -> trừ đúng 10.000 quỹ + 5 Đá Quý kho
  await flyTo(LA, FLAG.x, FLAG.y, 25);
  LA.errors = []; LA.socket.emit('sect_war_formation_set', {}); await sleep(800); await refresh(LA);
  const whA = (mySect(LA).warehouse || []).find((w) => w.itemId === 'da_quy') || { qty: 0 };
  ok('D2 bay tran Cong Pha thanh cong: quy -10000 (95000->85000), kho Da Quy 10->5', mySect(LA).fund === 85000 && whA.qty === 5 && mySect(LA).war && mySect(LA).war.myForm && mySect(LA).war.myForm.axis === 'congpha', `fund=${mySect(LA).fund} gems=${whA.qty} form=${JSON.stringify(mySect(LA).war && mySect(LA).war.myForm)} err=${LA.errors.join(';')}`);
  // D3: bên thủ bày trận Thủ Ngự
  LD.errors = []; LD.socket.emit('sect_war_formation_set', {}); await sleep(800); await refresh(LD);
  const whD = (mySect(LD).warehouse || []).find((w) => w.itemId === 'da_quy') || { qty: 0 };
  ok('D3 ben thu bay tran Thu Ngu: quy 50000->40000, kho Da Quy 8->3', mySect(LD).fund === 40000 && whD.qty === 3 && mySect(LD).war && mySect(LD).war.myForm && mySect(LD).war.myForm.axis === 'thungu', `fund=${mySect(LD).fund} gems=${whD.qty} err=${LD.errors.join(';')}`);
  // chờ chiến mở
  const warActive = await waitFor(() => mySect(MA).war && mySect(MA).war.state === 'active' ? true : (MA.socket.emit('sect_get'), null), 20000);
  await refresh(MA);
  ok('D4 chien da mo', !!(mySect(MA).war && mySect(MA).war.state === 'active'), JSON.stringify(mySect(MA).war));
  const guardian = await waitFor(() => monsOf(MA).find((m) => m.name === 'Thủ Lĩnh Chiến Kỳ') || null, 10000);
  ok('D4 Thu Linh +2000 mau nho tran Thu Ngu ben thu (22000)', !!guardian && guardian.maxHp === 22000, guardian ? `maxHp=${guardian.maxHp}` : 'khong thay Thu Linh');
  const eyes = monsOf(MA).filter((m) => m.name === 'Trận Nhãn');
  ok('D4 dung 2 Tran Nhan, mau 3000', eyes.length === 2 && eyes.every((e) => e.maxHp === 3000), JSON.stringify(eyes.map((e) => ({ id: e.id, maxHp: e.maxHp }))));
  const eyeDef = eyes.find((e) => e.id.endsWith('-def'));
  const eyeAtk = eyes.find((e) => e.id.endsWith('-atk'));
  // D5: Công Phá — đo trên TRẬN NHÃN bên thủ (đứng yên, def 0, công thức damageWarEye tất định; đánh Thủ Lĩnh bị sói hoang chen mục tiêu). Giới hạn số đòn: nhãn 3000 máu phải SỐNG sót cho D6.
  const a1 = await hitMonsterN(MA, eyeDef.id, 4);
  const a1m = median(a1.filter((d) => d > 50));
  await hitMonsterN(MD, eyeAtk.id, 14); // MD phá Trận Nhãn của bên CÔNG
  await refresh(MA);
  ok('D5 Tran Nhan ben cong bi pha -> tran tat (myForm null)', !!(mySect(MA).war && !mySect(MA).war.myForm), JSON.stringify(mySect(MA).war && mySect(MA).war.myForm));
  const a2 = await hitMonsterN(MA, eyeDef.id, 2);
  const a2m = median(a2.filter((d) => d > 50));
  const ratioA = a2m > 0 ? a1m / a2m : 0;
  ok('D5 Cong Pha +8%: sat thuong len Tran Nhan khi co tran / mat tran ~1,08', ratioA >= 1.03 && ratioA <= 1.13, `coTran=${JSON.stringify(a1)} med=${a1m} | matTran=${JSON.stringify(a2)} med=${a2m} ratio=${ratioA.toFixed(3)}`);
  // D6: Thủ Ngự — MA đánh MD khi trận thủ còn vs sau khi phá Trận Nhãn thủ
  const b1 = await hitPlayerN(MA, MD, 7);
  const b1m = median(b1);
  await hitMonsterN(MA, eyeDef.id, 14); // MA phá Trận Nhãn của bên THỦ
  await refresh(LD);
  const guardian3 = monsOf(MA).find((m) => m.name === 'Thủ Lĩnh Chiến Kỳ');
  ok('D6 pha Tran Nhan thu: tran thu tat + Thu Linh mat +2000 (ve 20000)', !!(mySect(LD).war && !mySect(LD).war.myForm) && !!guardian3 && guardian3.maxHp === 20000, `form=${JSON.stringify(mySect(LD).war && mySect(LD).war.myForm)} guardianMaxHp=${guardian3 && guardian3.maxHp}`);
  const b2 = await hitPlayerN(MA, MD, 7);
  const b2m = median(b2);
  const ratioB = b1m > 0 ? b2m / b1m : 0;
  ok('D6 Thu Ngu -8%: sat thuong nhan sau khi mat tran / khi co tran ~1,087', ratioB >= 1.04 && ratioB <= 1.14, `coTran=${JSON.stringify(b1)} med=${b1m} | matTran=${JSON.stringify(b2)} med=${b2m} ratio=${ratioB.toFixed(3)}`);
  LA.socket.disconnect(); MA.socket.disconnect(); LD.socket.disconnect(); MD.socket.disconnect();
  await stopServer();
  console.log(`\n== p334d: ${pass} PASS, ${fail} FAIL ==`);
  process.exit(fail ? 1 : 0);
})();
