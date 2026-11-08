// Probe GĐ346 — PHỤ ẤN (Luyện hóa mức phụ, F4-A): chọn/đổi lớp phụ tại Đạo Quán (lần đầu free, đổi 1.000 LT Hạ),
// lớp chính nguyên vẹn, 9 hiệu ứng phụ ấn đo trên kênh thật: Thể +5% maxHp · Cốt +5% phòng (đòn cắn) ·
// Kiếm sư/Nho thánh đạo tử (tên riêng) · Phật thiền độ người · Pháp 10% cast miễn phí (thống kê) ·
// Quỷ hạ quái hồi máu · Y đan dược +20% · Kiếm crit +3% (đọc qua anBonus.crit).
// Thiết kế: THIET_KE_PHAN_THUONG_AN.md §5.1/§7 đợt 4 (Bảo duyệt 08/11).
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
let serverProc = null, killTimer = null, CUR_PORT = 0;
async function startServer(port, tag) {
  CUR_PORT = port;
  if (!(await portFree(port))) throw new Error('port ban ' + port);
  const env = { ...process.env, PORT: String(port), TTT_STORAGE: 'file', TTT_CHAR_FILE: path.join(DIR, 'characters.json'), TTT_ACC_FILE: path.join(DIR, 'accounts.json'), TTT_WORLD_FILE: path.join(DIR, 'world.json'), TTT_SESS_FILE: path.join(DIR, 'sessions.json'), TTT_DAY_REAL_MS: '600000', TTT_TUVI_NEED: '5' };
  serverProc = spawn('node', ['server/index.js'], { cwd: ROOT, env, stdio: ['ignore', 'pipe', 'pipe'] });
  serverProc.stderr.on('data', (d) => { try { fs.appendFileSync(path.join(DIR, 'srv_' + tag + '.log'), d); } catch (e) {} });
  serverProc.stdout.on('data', (d) => { try { fs.appendFileSync(path.join(DIR, 'srv_' + tag + '.log'), d); } catch (e) {} });
  killTimer = setTimeout(() => { try { serverProc.kill('SIGKILL'); } catch (e) {} }, 480000);
  const t0 = Date.now();
  while (Date.now() - t0 < 45000) { try { const r = await fetch(`http://127.0.0.1:${port}/api/status`); if (r.ok) { clearTimeout(killTimer); return; } } catch (e) {} await sleep(500); }
  throw new Error('server khong len');
}
async function stopServer() { if (!serverProc) return; const p = serverProc; serverProc = null; await new Promise((res) => { const t = setTimeout(() => { try { p.kill('SIGKILL'); } catch (e) {} res(); }, 4000); p.once('exit', () => { clearTimeout(t); res(); }); try { p.kill('SIGTERM'); } catch (e) { clearTimeout(t); res(); } }); const t0 = Date.now(); while (Date.now() - t0 < 10000 && !(await portFree(CUR_PORT))) await sleep(300); }
const LC1 = { elements: ['kim'], main: 'kim', count: 1, mutations: [] };
const AN = (vm, lh, nd, extra) => Object.assign({ lkDays: 0, kdDays: 0, lkLastDay: -1, kdLastDay: -1, vienman: !!vm, luyenHon: !!lh, nhapDao: !!nd }, extra || {});
function BASE(token, name, extra) {
  return Object.assign({ token, name, classId: 'kiemtu', gender: 'nam', race: null, geo175: 1, realm: 'kd', tier: 9, x: 1252, y: 920, mapId: 'lang_tan_thu', hp: 99999, lifespan: 500, birthDay: -5660, ageStart: 16, stats: { khiHuyet: 500, vatCong: 100, vatPhong: 100, phapCong: 100, phapPhong: 100, tocDo: 60, minhMan: 100 }, statPoints: 0, freePoints: 0, tuVi: 99999, stones: 5000, stonesTrung: 0, stonesThuong: 0, stonesCuc: 0, inventory: {}, gearBag: {}, equipped: [], skills: [], job: null, job2: null, job3: null, linhCan: { ...LC1 }, affinity: {}, affV2: 1, bonds: {}, quests: {}, questsDone: {}, flags: {}, counters: {}, disciples: [], foundInvites: [], reformIn: [], sectTech: [], sectArts: [], sectArtsActive: [], mails: [], classRes: {}, food: 100, water: 100, branch: null, branchQi: 0, anState: AN(1, 1, 1) }, extra || {});
}
let pass = 0, fail = 0;
function ok(name, cond, extra) { if (cond) { pass++; console.log('PASS | ' + name); } else { fail++; console.log('FAIL | ' + name + (extra ? ' | ' + extra : '')); } }
function note(name, extra) { console.log('NOTE | ' + name + (extra ? ' | ' + extra : '')); }
function connect(token) {
  const socket = io(`http://127.0.0.1:${CUR_PORT}`, { transports: ['websocket'] });
  const ctx = { socket, merger: createMerger(), state: null, welcome: null, notices: [], sync: null, errors: [], casts: [] };
  socket.on('connect', () => socket.emit('hello', { token }));
  socket.on('welcome', (w) => { ctx.welcome = w; ctx.myName = (w.character || {}).name; });
  socket.on('notice', (n) => ctx.notices.push(n.text || ''));
  socket.on('char_sync', (sy) => { ctx.sync = sy; });
  socket.on('cast_result', (r) => ctx.casts.push(r));
  socket.on('server_tick', (t) => { const st = ctx.merger(t); if (st) ctx.state = st; });
  socket.on('interact_error', (e) => ctx.errors.push(e.message || ''));
  return ctx;
}
function writeChars(chars) {
  fs.writeFileSync(path.join(DIR, 'characters.json'), JSON.stringify(chars, null, 1));
  fs.writeFileSync(path.join(DIR, 'accounts.json'), JSON.stringify({}, null, 1));
  for (const f of ['world.json', 'sessions.json']) { try { fs.unlinkSync(path.join(DIR, f)); } catch (e) {} }
}
const meOf = (c) => (c.state?.players || []).find((p) => p.name === c.myName) || null;
const monsOf = (c) => c.state?.monsters || [];
const myChar = (c) => (c.sync && typeof c.sync.hp === 'number' ? c.sync : null) || (c.welcome && c.welcome.character) || {};
const ab = (c) => myChar(c).anBonus || {};
const skillIds = (c) => (myChar(c).skills || []).map((s) => (typeof s === 'string' ? s : s.id));
async function walkTo(c, x, y, tol, ms) {
  const t0 = Date.now();
  while (Date.now() - t0 < (ms || 25000)) { const me = meOf(c); if (!me) { await sleep(120); continue; } const dx = x - me.x, dy = y - me.y; const d = Math.hypot(dx, dy); if (d <= (tol || 45)) break; c.socket.emit('client_input', { vx: dx / d, vy: dy / d }); await sleep(110); }
  c.socket.emit('client_input', { vx: 0, vy: 0 });
}
const median = (a) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : 0; };
// Đo các cú rơi HP do bị cắn khi đứng cạnh 1 con quái (HP đọc qua tick — meOf)
async function biteDrops(c, kind, secs) {
  const me = meOf(c); if (!me) return [];
  const t = monsOf(c).filter((m) => m.kind === kind && m.hp > 0).sort((a, b) => Math.hypot(a.x - me.x, a.y - me.y) - Math.hypot(b.x - me.x, b.y - me.y))[0];
  if (!t) return [];
  await walkTo(c, t.x, t.y, 38, 20000);
  const drops = [];
  let last = (meOf(c) || {}).hp;
  const t0 = Date.now();
  while (Date.now() - t0 < secs * 1000 && drops.length < 14) {
    await sleep(180);
    const hp = (meOf(c) || {}).hp;
    if (hp != null && last != null && hp < last) drops.push(last - hp);
    if (hp != null) last = hp;
  }
  return drops;
}
(async () => {
  const TKA = 'p346tokenA123456', TKB = 'p346tokenB123456', TKP = 'p346tokenP123456', TKC = 'p346tokenC123456', TKD = 'p346tokenD123456', TKE = 'p346tokenE123456', TKF = 'p346tokenF123456', TKG = 'p346tokenG123456', TKH1 = 'p346tokenH1123456', TKH2 = 'p346tokenH2123456';
  writeChars({
    [TKA]: BASE(TKA, 'P346 KiemA'),
    [TKB]: BASE(TKB, 'P346 NhoB', { classId: 'nhotu', x: 1252, y: 1000 }),
    [TKP]: BASE(TKP, 'P346 BenhP', { hp: 2000, x: 1330, y: 1000, anState: AN(0, 0, 0) }),
    [TKC]: BASE(TKC, 'P346 ThuongC', { anState: AN(1, 1, 0) }),
    [TKD]: BASE(TKD, 'P346 TheD', { classId: 'thetu', mapId: 'huyet_sac_rung', x: 4248, y: 2950, skills: ['thetu_1'], anState: AN(1, 1, 1, { subClass: 'phaptu' }), stats: { khiHuyet: 800, vatCong: 30, vatPhong: 250, phapCong: 30, phapPhong: 250, tocDo: 60, minhMan: 400 } }),
    [TKE]: BASE(TKE, 'P346 QuyE', { hp: 3000 }),
    [TKF]: BASE(TKF, 'P346 YF', { hp: 2000, inventory: { dan_hoi_xuan: 1 } }),
    [TKG]: BASE(TKG, 'P346 ThuongG', { hp: 2000, inventory: { dan_hoi_xuan: 1 } }),
    [TKH1]: BASE(TKH1, 'P346 PhongH1', { mapId: 'huyet_sac_rung', x: 4248, y: 2950, realm: 'tc', tier: 1, anState: AN(1, 0, 0), stats: { khiHuyet: 2000, vatCong: 50, vatPhong: 60, phapCong: 50, phapPhong: 60, tocDo: 60, minhMan: 50 } }),
    [TKH2]: BASE(TKH2, 'P346 CotH2', { mapId: 'huyet_sac_rung', x: 4248, y: 2900, realm: 'tc', tier: 1, anState: AN(1, 0, 0, { subClass: 'cottu' }), stats: { khiHuyet: 2000, vatCong: 50, vatPhong: 60, phapCong: 50, phapPhong: 60, tocDo: 60, minhMan: 50 } }),
  });
  await startServer(3649, 'p346');
  try {
    // ---------- Chân C: chưa Nhập Đạo → không chọn được ----------
    const cC = connect(TKC);
    await waitFor(() => cC.welcome, 15000);
    await waitFor(() => meOf(cC), 15000);
    cC.socket.emit('an_subclass_choose', { classId: 'thetu' });
    const errC = await waitFor(() => cC.errors.find((e) => e.includes('chỉ mở khi đã Nhập Đạo')), 6000);
    ok('C: chưa Nhập Đạo bị chặn chọn phụ ấn', !!errC, JSON.stringify(cC.errors));
    cC.socket.disconnect();

    // ---------- Chân A: chọn/đổi/phí/tên riêng/lớp chính nguyên vẹn ----------
    const cA = connect(TKA);
    await waitFor(() => cA.welcome, 15000);
    await waitFor(() => meOf(cA), 15000);
    await waitFor(() => myChar(cA).maxHp > 0, 8000);
    const maxHp0 = myChar(cA).maxHp, stonesA0 = myChar(cA).stones;
    ok('A: ban đầu chưa có phụ ấn', !ab(cA).subClass, JSON.stringify(ab(cA)));
    cA.socket.emit('an_subclass_choose', { classId: 'kiemtu' });
    const errOwn = await waitFor(() => cA.errors.find((e) => e.includes('khác lớp chính')), 6000);
    ok('A: chọn đúng lớp chính bị chặn', !!errOwn, JSON.stringify(cA.errors));
    cA.socket.emit('an_subclass_choose', { classId: 'thetu' });
    const okA1 = await waitFor(() => ab(cA).subClass === 'thetu', 8000);
    ok('A: chọn phụ Thể thành công (lần đầu)', !!okA1, JSON.stringify(ab(cA)));
    ok('A: tên hiển thị "Kiếm tu · phụ Thể tu"', ab(cA).subName === 'Kiếm tu · phụ Thể tu', ab(cA).subName);
    const maxHp1 = myChar(cA).maxHp;
    note('A: maxHp trước/sau phụ Thể', maxHp0 + ' → ' + maxHp1);
    ok('A: phụ Thể +5% máu tối đa', Math.abs(maxHp1 - Math.round(maxHp0 * 1.05)) <= 2, maxHp0 + '→' + maxHp1);
    ok('A: lần đầu chọn KHÔNG tốn phí', myChar(cA).stones === stonesA0, 'stones=' + myChar(cA).stones);
    ok('A: lớp chính nguyên vẹn — không học chiêu Thể', !skillIds(cA).some((id) => String(id).startsWith('thetu_')), JSON.stringify(skillIds(cA)));
    const errA2n = cA.errors.length;
    cA.socket.emit('an_subclass_choose', { classId: 'thetu' });
    const errSame = await waitFor(() => cA.errors.slice(errA2n).find((e) => e.includes('mang phụ ấn lớp này')), 6000);
    ok('A: chọn lại đúng lớp phụ đang mang bị chặn', !!errSame, JSON.stringify(cA.errors.slice(errA2n)));
    cA.socket.emit('an_subclass_choose', { classId: 'cottu' });
    const okA2 = await waitFor(() => ab(cA).subClass === 'cottu', 8000);
    ok('A: đổi sang phụ Cốt thành công', !!okA2, JSON.stringify(ab(cA)));
    ok('A: đổi lớp phụ trừ đúng 1.000 LT Hạ', myChar(cA).stones === stonesA0 - 1000, 'stones=' + myChar(cA).stones);
    ok('A: bỏ phụ Thể thì maxHp về như cũ', Math.abs(myChar(cA).maxHp - maxHp0) <= 2, 'maxHp=' + myChar(cA).maxHp);
    cA.socket.emit('an_subclass_choose', { classId: 'phaptu' });
    const okA3 = await waitFor(() => ab(cA).subClass === 'phaptu', 8000);
    ok('A: đổi sang phụ Pháp thành công', !!okA3, JSON.stringify(ab(cA)));
    ok('A: Kiếm + Pháp = tên riêng "Kiếm sư"', ab(cA).subName === 'Kiếm sư', ab(cA).subName);
    ok('A: phí đổi lần 2 trừ thêm 1.000', myChar(cA).stones === stonesA0 - 2000, 'stones=' + myChar(cA).stones);
    cA.socket.disconnect();

    // ---------- Chân H1/H2: phụ Cốt giảm đòn cắn (phòng +5%) ----------
    const cH1 = connect(TKH1);
    await waitFor(() => cH1.welcome, 15000);
    await waitFor(() => meOf(cH1), 15000);
    await waitFor(() => monsOf(cH1).length > 0, 15000);
    const drops1 = await biteDrops(cH1, 'huyetlang', 16);
    note('H1: các cú cắn (không phụ ấn)', JSON.stringify(drops1));
    const cH2 = connect(TKH2);
    await waitFor(() => cH2.welcome, 15000);
    await waitFor(() => meOf(cH2), 15000);
    const drops2 = await biteDrops(cH2, 'huyetlang', 16);
    note('H2: các cú cắn (phụ Cốt)', JSON.stringify(drops2));
    ok('H: phụ Cốt +5% phòng → đòn cắn giảm (19 → 18)', median(drops1) === 19 && median(drops2) === 18, 'H1=' + median(drops1) + ' H2=' + median(drops2));
    cH1.socket.disconnect(); cH2.socket.disconnect();

    // ---------- Chân B + P: Nho + Phật = Nho thánh đạo tử; thiền độ người ----------
    const cP = connect(TKP);
    await waitFor(() => cP.welcome, 15000);
    await waitFor(() => meOf(cP), 15000);
    const cB = connect(TKB);
    await waitFor(() => cB.welcome, 15000);
    await waitFor(() => meOf(cB), 15000);
    cB.socket.emit('an_subclass_choose', { classId: 'phattu' });
    const okB = await waitFor(() => ab(cB).subClass === 'phattu', 8000);
    ok('B: Nho chọn phụ Phật thành công', !!okB, JSON.stringify(ab(cB)));
    ok('B: Nho + Phật = tên riêng "Nho thánh đạo tử"', ab(cB).subName === 'Nho thánh đạo tử', ab(cB).subName);
    const pHp0 = (meOf(cP) || {}).hp, pMax = myChar(cP).maxHp;
    note('P: HP bệnh nhân trước thiền độ', pHp0 + '/' + pMax);
    cB.socket.emit('meditate_toggle');
    await sleep(12000);
    const pHp1 = (meOf(cP) || {}).hp;
    note('P: HP sau 12s được thiền độ', pHp0 + ' → ' + pHp1);
    ok('B: phụ Phật — thiền độ người trong 300px hồi ≥1% máu tối đa', pHp1 - pHp0 >= Math.round(pMax * 0.01) - 1, 'delta=' + (pHp1 - pHp0) + ' need≈' + Math.round(pMax * 0.01));
    cB.socket.emit('meditate_toggle');
    // B đổi sang phụ Kiếm: crit qua anBonus.crit (critChanceOf) 0,10 → 0,13, phí 1.000
    const critB0 = ab(cB).crit, stonesB0 = myChar(cB).stones;
    cB.socket.emit('an_subclass_choose', { classId: 'kiemtu' });
    const okBk = await waitFor(() => ab(cB).subClass === 'kiemtu', 8000);
    ok('B: đổi sang phụ Kiếm thành công', !!okBk, JSON.stringify(ab(cB)));
    note('B: crit trước/sau phụ Kiếm', critB0 + ' → ' + ab(cB).crit);
    ok('B: phụ Kiếm +3% bạo kích qua critChanceOf', Math.abs((ab(cB).crit || 0) - ((critB0 || 0) + 0.03)) < 0.0011, critB0 + '→' + ab(cB).crit);
    ok('B: phí đổi trừ đúng 1.000', myChar(cB).stones === stonesB0 - 1000, 'stones=' + myChar(cB).stones);
    cB.socket.disconnect(); cP.socket.disconnect();

    // ---------- Chân D: phụ Pháp — thống kê cast miễn phí (ấn đặt sẵn qua fixture; kênh chọn đã đo ở A/B/E/F) ----------
    const cD = connect(TKD);
    await waitFor(() => cD.welcome, 15000);
    await waitFor(() => meOf(cD), 15000);
    await waitFor(() => monsOf(cD).length > 0, 15000);
    ok('D: phụ Pháp đã mang sẵn (fixture)', ab(cD).subClass === 'phaptu', JSON.stringify(ab(cD)));
    const slotD = skillIds(cD).findIndex((id) => id === 'thetu_1');
    ok('D: có chiêu thetu_1 để cast', slotD >= 0, JSON.stringify(skillIds(cD)));
    let castsOk = 0, freeCasts = 0, paidCost = null, paidOk = true;
    for (let i = 0; i < 110 && castsOk < 36 && slotD >= 0; i++) {
      const me = meOf(cD);
      const ws = monsOf(cD).filter((m) => m.kind === 'huyetlang' && m.hp > 0).sort((a, b) => Math.hypot(a.x - me.x, a.y - me.y) - Math.hypot(b.x - me.x, b.y - me.y));
      if (!ws.length) { await sleep(1500); continue; }
      await walkTo(cD, ws[0].x, ws[0].y, 40, 8000);
      const mpBefore = myChar(cD).mp;
      const ci = cD.casts.length;
      cD.socket.emit('cast_skill', { slot: slotD });
      const res = await waitFor(() => cD.casts.length > ci && cD.casts[cD.casts.length - 1], 3000);
      if (!res || !res.ok) { await sleep(400); continue; }
      castsOk++;
      // chờ sync mp: tụt 6 = trả phí; giữ nguyên sau 1,4s = cast miễn phí
      const dropped = await waitFor(() => myChar(cD).mp < mpBefore, 1400);
      if (!dropped) freeCasts++;
      else { const dc = mpBefore - myChar(cD).mp; if (paidCost === null) paidCost = dc; else if (dc !== paidCost) paidOk = false; }
      await sleep(250);
    }
    note('D: cast thống kê', castsOk + ' cast trúng, ' + freeCasts + ' lần miễn phí, phí/lần = ' + paidCost);
    ok('D: có ít nhất 35 cast thành công để thống kê', castsOk >= 35, 'casts=' + castsOk);
    ok('D: phụ Pháp — xuất hiện cast KHÔNG tốn chân nguyên (kỳ vọng ~10%)', freeCasts >= 1, 'free=' + freeCasts + '/' + castsOk);
    ok('D: các cast trả phí tốn một mức cố định như nhau (6 danh nghĩa × giảm mana thành tựu = ' + paidCost + ')', paidOk && paidCost > 0, 'paidCost=' + paidCost);
    cD.socket.disconnect();

    // ---------- Chân E: phụ Quỷ — hạ quái hồi máu ----------
    const cE = connect(TKE);
    await waitFor(() => cE.welcome, 15000);
    await waitFor(() => meOf(cE), 15000);
    cE.socket.emit('an_subclass_choose', { classId: 'quytu' });
    const okE = await waitFor(() => ab(cE).subClass === 'quytu', 8000);
    ok('E: chọn phụ Quỷ thành công', !!okE, JSON.stringify(ab(cE)));
    // đi tới bãi farm phía đông map nhà tìm sói
    const wolf = await waitFor(() => monsOf(cE).find((m) => m.kind === 'wolf'), 8000);
    note('E: sói trên map nhà', wolf ? ('@' + wolf.x + ',' + wolf.y) : 'không thấy trong tick (đi tìm bằng waypoint)');
    await walkTo(cE, 3000, 1250, 70, 40000); // waypoint qua quảng trường ra hướng đông (tránh kẹt nhà làng)
    const maxE = myChar(cE).maxHp;
    let killed = false, hpE0 = null;
    for (let tries = 0; tries < 6 && !killed; tries++) {
      const me = meOf(cE);
      const ws = monsOf(cE).filter((m) => m.kind === 'wolf' && m.hp > 0).sort((a, b) => Math.hypot(a.x - me.x, a.y - me.y) - Math.hypot(b.x - me.x, b.y - me.y));
      if (!ws.length) { await sleep(1500); continue; }
      const w = ws[0];
      await walkTo(cE, w.x, w.y, 35, 30000);
      const idW = w.id;
      hpE0 = (meOf(cE) || {}).hp; // mốc ngay trước khi ra đòn hạ (đã tới sát sói)
      for (let a = 0; a < 8; a++) { cE.socket.emit('player_attack'); await sleep(620); if (!monsOf(cE).find((m) => m.id === idW)) { killed = true; break; } }
    }
    ok('E: hạ được 1 sói bãi farm', killed);
    await sleep(400);
    const hpE1 = (meOf(cE) || {}).hp;
    note('E: HP quanh cú hạ sói', hpE0 + ' → ' + hpE1 + ' (max ' + maxE + ')');
    ok('E: phụ Quỷ — hạ quái hồi ~1% máu tối đa (trừ hao đòn cắn)', hpE1 - hpE0 >= Math.round(maxE * 0.01) - 15, 'delta=' + (hpE1 - hpE0));
    cE.socket.disconnect();

    // ---------- Chân F/G: phụ Y — đan dược hồi +20% ----------
    const cF = connect(TKF);
    await waitFor(() => cF.welcome, 15000);
    await waitFor(() => meOf(cF), 15000);
    cF.socket.emit('an_subclass_choose', { classId: 'ytu' });
    await waitFor(() => ab(cF).subClass === 'ytu', 8000);
    const fHp0 = (meOf(cF) || {}).hp, fMax = myChar(cF).maxHp;
    cF.socket.emit('use_item', { itemId: 'dan_hoi_xuan' });
    await waitFor(() => (meOf(cF) || {}).hp > fHp0, 6000);
    const fHeal = (meOf(cF) || {}).hp - fHp0;
    note('F: hồi bằng Hồi Xuân Đan (phụ Y)', fHeal + ' / max ' + fMax + ' (kỳ vọng 60%)');
    ok('F: phụ Y — đan hồi 60% máu tối đa (50% × 1,2)', Math.abs(fHeal - Math.round(fMax * 0.6)) <= 3, 'heal=' + fHeal);
    cF.socket.disconnect();
    const cG = connect(TKG);
    await waitFor(() => cG.welcome, 15000);
    await waitFor(() => meOf(cG), 15000);
    const gHp0 = (meOf(cG) || {}).hp, gMax = myChar(cG).maxHp;
    cG.socket.emit('use_item', { itemId: 'dan_hoi_xuan' });
    await waitFor(() => (meOf(cG) || {}).hp > gHp0, 6000);
    const gHeal = (meOf(cG) || {}).hp - gHp0;
    note('G: hồi bằng Hồi Xuân Đan (không phụ ấn)', gHeal + ' / max ' + gMax + ' (kỳ vọng 50%)');
    ok('G: đối chứng không phụ ấn — đan hồi đúng 50%', Math.abs(gHeal - Math.round(gMax * 0.5)) <= 3, 'heal=' + gHeal);
    cG.socket.disconnect();
  } finally {
    await stopServer();
  }
  console.log(`\nKẾT QUẢ GĐ346: ${pass} PASS / ${fail} FAIL`);
  process.exit(fail ? 1 : 0);
})().catch(async (e) => { console.error('PROBE CRASH', e); await stopServer(); process.exit(2); });
