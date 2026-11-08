// Probe GĐ334-C — TÔNG PHONG: phong đơn (trục đầu hơn nhì >= 20%) + tên phong; Song Phong (chênh < 20%);
// cộng hưởng: học pháp trục chính -20% Tông Cống, trục phụ Song Phong -12%; +1 bậc thành phần (đo sát thương); chiến kỹ trục phong hồi chiêu x0,9.
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const net = require('net');
const ROOT = path.join(__dirname, '..', '..');
const PORT = 3576;
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
  serverProc.stderr.on('data', (d) => { try { fs.appendFileSync(path.join(DIR, 'srv_c.log'), d); } catch (e) {} });
  killTimer = setTimeout(() => { try { serverProc.kill('SIGKILL'); } catch (e) {} }, 60000);
  const t0 = Date.now();
  while (Date.now() - t0 < 45000) { try { const r = await fetch(`http://127.0.0.1:${PORT}/api/status`); if (r.ok) { clearTimeout(killTimer); return; } } catch (e) {} await sleep(500); }
  throw new Error('server khong len');
}
async function stopServer() { if (!serverProc) return; const p = serverProc; serverProc = null; await new Promise((res) => { const t = setTimeout(() => { try { p.kill('SIGKILL'); } catch (e) {} res(); }, 4000); p.once('exit', () => { clearTimeout(t); res(); }); try { p.kill('SIGTERM'); } catch (e) { clearTimeout(t); res(); } }); const t0 = Date.now(); while (Date.now() - t0 < 10000 && !(await portFree(PORT))) await sleep(300); }
function BASE(token, name, extra) {
  return Object.assign({ token, name, classId: 'kiemtu', gender: 'nam', race: null, geo175: 1, realm: 'kd', tier: 1, x: 4248, y: 2950, mapId: 'huyet_sac_rung', hp: 99999, lifespan: 500, birthDay: -5660, ageStart: 16, stats: { khiHuyet: 500, vatCong: 100, vatPhong: 100, phapCong: 100, phapPhong: 100, tocDo: 60, minhMan: 0 }, statPoints: 0, freePoints: 0, tuVi: 0, stones: 0, stonesTrung: 0, stonesThuong: 0, stonesCuc: 0, inventory: {}, gearBag: {}, equipped: [], skills: [], job: null, job2: null, job3: null, linhCan: { element: 'hoa', grade: 'trung', mult: 1.2 }, affinity: {}, affV2: 1, bonds: {}, quests: {}, questsDone: {}, flags: {}, counters: {}, disciples: [], foundInvites: [], reformIn: [], sectTech: [], sectArts: [], sectArtsActive: [], mails: [], classRes: {} }, extra || {});
}
function SECT(id, name, members, extra) { return Object.assign({ id, name, intro: '', fund: 0, level: 1, uy: 0, members, applicants: [], activeQuests: [], territories: [], territory: null, warehouse: [], garden: [], depts: {}, tributeDay: 100, upkeepDay: 100, questDay: 100, artDay: 100, debtDays: 0, arts: [], honor: [] }, extra || {}); }
function ART(id, name, grade, comps, flaw, kind, creator) { return { id, name, grade, gradeName: grade, creator, creatorName: creator, element: 'hoa', comps, flaw, kind, status: 'done', progress: 0, need: 100, k: 1, day: 100 }; }
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
  socket.on('cast_result', (r) => ctx.casts.push({ ...r, at: Date.now() }));
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
async function firstHitDrop(c) { // sói nguyên vẹn GẦN NHẤT; bám vị trí sống, đánh lại tới khi trúng
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
(async () => {
  const chars = {
    p334c30001: BASE('p334c30001', ' ChuC334', {}),
    p334m30001: BASE('p334m30001', ' DeTuC334', { stats: { khiHuyet: 500, vatCong: 200, vatPhong: 100, phapCong: 100, phapPhong: 100, tocDo: 60, minhMan: 60 }, skills: ['kiemtu_1'], equipped: ['kiemtu_1'] }),
    p334c30002: BASE('p334c30002', ' ChuSong334', {}),
    p334m30002: BASE('p334m30002', ' DeTuSong334', {}),
  };
  fs.writeFileSync(path.join(DIR, 'characters.json'), JSON.stringify(chars));
  const sects = [
    SECT('sc1', 'Tông Phong Đơn', [
      { token: 'p334c30001', name: ' ChuC334', role: 'chu', contrib: 0 },
      { token: 'p334m30001', name: ' DeTuC334', role: 'detu', contrib: 1000 },
    ], { fund: 50000, uy: 100, level: 5, hq: { mapId: 'huyet_sac_rung', x: 4248, y: 2900 }, buildings: [{ kind: 'tangkinh', name: 'Tàng Kinh Các', x: 4248, y: 3000, lv: 3 }], arts: [
      ART('ca1', 'Phá Quân Tâm', 'pham', { cong: 5, mau: 4 }, 'f_toc', 'tamphap', 'p334c30001'),
      ART('ca2', 'Lôi Phá Kỹ', 'linh', { sat: 5, dien: 1, tam: 2 }, 'f_mp', 'chienky', 'p334c30001'),
      ART('ca3', 'Dưỡng Tâm Thiền', 'pham', { thien: 5, che: 2 }, 'f_cong', 'tamphap', 'p334c30001'),
      ART('ca4', 'Tật Phong Quyết', 'pham', { cong: 4, toc: 2 }, 'f_mau', 'tamphap', 'p334c30001'),
    ] }),
    SECT('sc2', 'Tông Song Phong', [
      { token: 'p334c30002', name: ' ChuSong334', role: 'chu', contrib: 0 },
      { token: 'p334m30002', name: ' DeTuSong334', role: 'detu', contrib: 1000 },
    ], { fund: 50000, uy: 100, level: 5, hq: { mapId: 'huyet_sac_rung', x: 4248, y: 2900 }, buildings: [{ kind: 'tangkinh', name: 'Tàng Kinh Các', x: 4248, y: 3000, lv: 3 }], arts: [
      ART('cb1', 'Phong Hành Quyết', 'pham', { cong: 5, toc: 1 }, 'f_mau', 'tamphap', 'p334c30002'),
      ART('cb2', 'Hộ Thể Tâm', 'pham', { phong: 5, mau: 2 }, 'f_toc', 'tamphap', 'p334c30002'),
      ART('cb3', 'Phá Trận Kỹ', 'pham', { sat: 5, tam: 1 }, 'f_cd', 'chienky', 'p334c30002'),
      ART('cb4', 'Kim Cang Thể', 'pham', { phong: 4, mau: 4 }, 'f_cong', 'tamphap', 'p334c30002'),
      ART('cb5', 'Liên Hoa Kiếm Ý', 'linh', { cong: 4, thien: 2 }, 'f_phong', 'tamphap', 'p334c30002'),
    ] }),
  ];
  fs.writeFileSync(path.join(DIR, 'world.json'), JSON.stringify({ totalMinutes: 100 * 1440, savedAt: Date.now(), sects }));
  await startServer();
  const M = await connect('p334m30001'); const M2 = await connect('p334m30002');
  // C1: phong đơn — Công Phá 15 / Tu Hành 5 / Thủ Ngự 4 / Linh Động 4 / Xảo Nghệ 2 = 30 điểm
  await refresh(M);
  const ph1 = mySect(M).phong || {};
  ok('C1 phong don: dinh hinh, truc chinh Cong Pha, khong truc phu, ten "Hoa Cong Pha Phong"', ph1.formed === true && ph1.main === 'congpha' && !ph1.sub && ph1.name === 'Hỏa Công Phá Phong' && ph1.total === 30, JSON.stringify(ph1));
  // C2: học pháp trục chính (Phàm 150) -> trừ đúng 120 (giảm 20%)
  const a1 = (mySect(M).arts || []).find((a) => a.id === 'ca1') || {};
  ok('C2 payload learnCost truc chinh = 120 (150 x 0,8)', a1.learnCost === 120, `learnCost=${a1.learnCost}`);
  M.socket.emit('sect_art_learn', { artId: 'ca1' }); await sleep(700); await refresh(M);
  ok('C2 hoc phap truc chinh tru dung 120 Tong Cong (1000->880)', mySect(M).myContrib === 880, `contrib=${mySect(M).myContrib}`);
  // C3: +1 bậc thành phần — vận hành ca4 (Công 4 bậc, trục Công Phá): có phong thành +5% thay vì +4%. Đo bằng cast_result.dmg của chiêu cơ bản (tất định tuyệt đối; lấy MIN của 3 lần để gạt crit)
  M.socket.emit('sect_art_learn', { artId: 'ca4' }); await sleep(700); await refresh(M);
  const skB = (M.sync && M.sync.skills) || [];
  const baseSlot = skB.findIndex((x) => x.id === 'kiemtu_1');
  async function castBase() {
    for (let t = 0; t < 3; t++) {
      const me = meOf(M); const ws = monsOf(M).filter((m) => m.kind === 'huyetlang' && m.hp >= (m.maxHp || 9999) - 1).sort((a, b) => Math.hypot(a.x - me.x, a.y - me.y) - Math.hypot(b.x - me.x, b.y - me.y));
      if (!ws.length) return 0;
      await flyTo(M, ws[0].x, ws[0].y, 55);
      const cm = M.casts.length;
      M.socket.emit('cast_skill', { slot: baseSlot });
      const r = await waitFor(() => M.casts.length > cm && M.casts[M.casts.length - 1], 4000);
      if (r && r.ok && String(r.targetId || '').startsWith('huyetlang')) return r.dmg || 0;
      await sleep(1500);
    }
    return 0;
  }
  const offs = []; for (let i = 0; i < 3; i++) { const d = await castBase(); if (d > 0) offs.push(d); await sleep(1300); }
  M.socket.emit('sect_art_toggle', { artId: 'ca4' }); await sleep(800);
  const ons = []; for (let i = 0; i < 3; i++) { const d = await castBase(); if (d > 0) ons.push(d); await sleep(1300); }
  const dOffMin = offs.length ? Math.min(...offs) : 0, dOnMin = ons.length ? Math.min(...ons) : 0;
  ok('C3 cong huong +1 bac Cong: dmg chieu co ban 210 -> ~220 (khong phong chi 218)', dOffMin > 0 && (dOnMin - dOffMin) >= 10, `off=${JSON.stringify(offs)} on=${JSON.stringify(ons)}`);
  M.socket.emit('sect_art_toggle', { artId: 'ca4' }); await sleep(500);
  await flyTo(M, 4248, 3000, 30); // về cạnh Tàng Kinh Các cho C4
  // C4: học chiến kỹ trục chính (Linh 300 -> 240) + hồi chiêu x0,9 (cd thô 11,0s -> 9,9s): tung lại ở 8,8s phải bị chặn, ở 10,6s phải được
  const a2 = (mySect(M).arts || []).find((a) => a.id === 'ca2') || {};
  ok('C4 payload learnCost chien ky truc chinh = 240 (300 x 0,8)', a2.learnCost === 240, `learnCost=${a2.learnCost}`);
  M.socket.emit('sect_art_learn', { artId: 'ca2' }); await sleep(700); await refresh(M);
  ok('C4 hoc chien ky tru dung 240 Tong Cong (760->520)', mySect(M).myContrib === 520, `contrib=${mySect(M).myContrib}`);
  M.socket.emit('equip_skill', { skillId: 'art:ca2' }); await sleep(800);
  const skList = (M.sync && M.sync.skills) || [];
  const artSlot = skList.findIndex((x) => x.id === 'art:ca2');
  ok('C4 lap duoc chien ky vao o chieu', artSlot >= 0, JSON.stringify(skList.map((x) => x.id)));
  const w = await waitFor(() => { const me = meOf(M); const ws = monsOf(M).filter((m) => m.kind === 'huyetlang' && m.hp >= (m.maxHp || 9999) - 1).sort((a, b) => Math.hypot(a.x - me.x, a.y - me.y) - Math.hypot(b.x - me.x, b.y - me.y)); return ws.length ? ws[0] : null; }, 15000);
  await flyTo(M, w.x, w.y, 55);
  const castMark = M.casts.length;
  M.socket.emit('cast_skill', { slot: artSlot });
  const r0 = await waitFor(() => M.casts.length > castMark && M.casts[M.casts.length - 1], 4000);
  ok('C4 tung chien ky lan dau thanh cong', !!r0 && r0.ok === true, JSON.stringify(r0));
  const t0 = r0 ? r0.at : Date.now();
  const cdEff = r0 ? (r0.cdMs || 9900) : 9900; // cd hiệu dụng server trả (đã gồm giảm hồi chiêu của Minh Mẫn × cộng hưởng phong 0,9)
  ok('C4 cdMs hieu dung ~7,9s = 11s x CDR minh man x 0,9 phong (khong phong ~8,8s)', cdEff >= 7500 && cdEff <= 8300, `cdMs=${cdEff}`);
  while (Date.now() - t0 < 6800) await sleep(200);
  const mark1 = M.casts.length; M.socket.emit('cast_skill', { slot: artSlot });
  const r1 = await waitFor(() => M.casts.length > mark1 && M.casts[M.casts.length - 1], 2500);
  ok('C4 truoc moc cd van bi hoi chieu chan', !!r1 && r1.ok === false && r1.reason === 'cooldown', JSON.stringify(r1));
  const w2 = await waitFor(() => { const me = meOf(M); const ws = monsOf(M).filter((m) => m.kind === 'huyetlang' && m.hp >= (m.maxHp || 9999) - 1).sort((a, b) => Math.hypot(a.x - me.x, a.y - me.y) - Math.hypot(b.x - me.x, b.y - me.y)); return ws.length ? ws[0] : null; }, 8000);
  if (w2) await flyTo(M, w2.x, w2.y, 55);
  while (Date.now() - t0 < cdEff + 700) await sleep(200);
  const mark2 = M.casts.length; M.socket.emit('cast_skill', { slot: artSlot });
  const r2 = await waitFor(() => M.casts.length > mark2 && M.casts[M.casts.length - 1], 3000);
  ok('C4 qua moc cd tung lai duoc (cd da giam nho cong huong phong)', !!r2 && r2.ok === true, JSON.stringify(r2));
  // C5: Song Phong — Thủ Ngự 15 / Công Phá 14 (chênh < 20%) -> main thungu + sub congpha; học pháp trục phụ (Linh 300) -> 264
  await refresh(M2);
  const ph2 = mySect(M2).phong || {};
  ok('C5 Song Phong: main Thu Ngu, sub Cong Pha, ten chua "Song Phong", tong 33', ph2.formed === true && ph2.main === 'thungu' && ph2.sub === 'congpha' && (ph2.name || '').includes('Song Phong') && ph2.total === 33, JSON.stringify(ph2));
  const b5 = (mySect(M2).arts || []).find((a) => a.id === 'cb5') || {};
  ok('C5 payload learnCost truc phu = 264 (300 x 0,88)', b5.learnCost === 264, `learnCost=${b5.learnCost}`);
  M2.socket.emit('sect_art_learn', { artId: 'cb5' }); await sleep(700); await refresh(M2);
  ok('C5 hoc phap truc phu tru dung 264 Tong Cong (1000->736)', mySect(M2).myContrib === 736, `contrib=${mySect(M2).myContrib}`);
  M.socket.disconnect(); M2.socket.disconnect();
  await stopServer();
  console.log(`\n== p334c: ${pass} PASS, ${fail} FAIL ==`);
  process.exit(fail ? 1 : 0);
})();
