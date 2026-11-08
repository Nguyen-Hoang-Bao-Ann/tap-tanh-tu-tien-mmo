// Probe GĐ344 — Đối Ảnh Cảnh (bí cảnh ẩn đợt 2): cổng bia đá sau cây cổ thụ (chỉ Viên Mãn),
// 3 đợt ảo ảnh + Ảnh Vương, quà % 33/66/100, +5 điểm tự do lần đầu 100%, khóa 1 lần/ngày game,
// ảo ảnh không rơi đồ, gục giữa chừng → ra cổng giữ % + ngày vẫn bị khóa.
// Thiết kế: THIET_KE_PHAN_THUONG_AN.md §4.2/§7 đợt 2 (Bảo duyệt 08/11).
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
  killTimer = setTimeout(() => { try { serverProc.kill('SIGKILL'); } catch (e) {} }, 420000);
  const t0 = Date.now();
  while (Date.now() - t0 < 45000) { try { const r = await fetch(`http://127.0.0.1:${port}/api/status`); if (r.ok) { clearTimeout(killTimer); return; } } catch (e) {} await sleep(500); }
  throw new Error('server khong len');
}
async function stopServer() { if (!serverProc) return; const p = serverProc; serverProc = null; await new Promise((res) => { const t = setTimeout(() => { try { p.kill('SIGKILL'); } catch (e) {} res(); }, 4000); p.once('exit', () => { clearTimeout(t); res(); }); try { p.kill('SIGTERM'); } catch (e) { clearTimeout(t); res(); } }); const t0 = Date.now(); while (Date.now() - t0 < 10000 && !(await portFree(CUR_PORT))) await sleep(300); }
const LC1 = { elements: ['kim'], main: 'kim', count: 1, mutations: [] };
const AN = (vm, lh, nd) => ({ lkDays: 0, kdDays: 0, lkLastDay: -1, kdLastDay: -1, vienman: !!vm, luyenHon: !!lh, nhapDao: !!nd });
function BASE(token, name, extra) {
  return Object.assign({ token, name, classId: 'kiemtu', gender: 'nam', race: null, geo175: 1, realm: 'lk', tier: 9, x: 1140, y: 2050, mapId: 'lang_tan_thu', hp: 99999, lifespan: 500, birthDay: -5660, ageStart: 16, stats: { khiHuyet: 8000, vatCong: 400, vatPhong: 250, phapCong: 400, phapPhong: 250, tocDo: 60, minhMan: 100 }, statPoints: 0, freePoints: 0, tuVi: 99999, stones: 0, stonesTrung: 0, stonesThuong: 0, stonesCuc: 0, inventory: {}, gearBag: {}, equipped: [], skills: [], job: null, job2: null, job3: null, linhCan: { ...LC1 }, affinity: {}, affV2: 1, bonds: {}, quests: {}, questsDone: {}, flags: {}, counters: {}, disciples: [], foundInvites: [], reformIn: [], sectTech: [], sectArts: [], sectArtsActive: [], mails: [], classRes: {}, food: 100, water: 100, anState: AN(1, 0, 0) }, extra || {});
}
let pass = 0, fail = 0;
function ok(name, cond, extra) { if (cond) { pass++; console.log('PASS | ' + name); } else { fail++; console.log('FAIL | ' + name + (extra ? ' | ' + extra : '')); } }
function note(name, extra) { console.log('NOTE | ' + name + (extra ? ' | ' + extra : '')); }
function connect(token) {
  const socket = io(`http://127.0.0.1:${CUR_PORT}`, { transports: ['websocket'] });
  const ctx = { socket, merger: createMerger(), state: null, welcome: null, notices: [], sync: null, errors: [], mapEnters: [] };
  socket.on('connect', () => socket.emit('hello', { token }));
  socket.on('welcome', (w) => { ctx.welcome = w; ctx.myName = (w.character || {}).name; });
  socket.on('notice', (n) => ctx.notices.push(n.text || ''));
  socket.on('char_sync', (sy) => { ctx.sync = sy; });
  socket.on('server_tick', (t) => { const st = ctx.merger(t); if (st) ctx.state = st; });
  socket.on('interact_error', (e) => ctx.errors.push(e.message || ''));
  socket.on('map_enter', (d) => ctx.mapEnters.push(d));
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
const curMap = (c) => (c.mapEnters.length ? c.mapEnters[c.mapEnters.length - 1].mapId : null);
const illusions = (c) => monsOf(c).filter((m) => m.trial === 'doianh');
async function flyTo(c, x, y, tol) {
  if (!c.flying) { c.socket.emit('fly_toggle', {}); c.flying = true; await sleep(350); }
  const t0 = Date.now();
  while (Date.now() - t0 < 20000) { const me = meOf(c); if (!me) { await sleep(120); continue; } const dx = x - me.x, dy = y - me.y; const d = Math.hypot(dx, dy); if (d <= (tol || 45)) break; c.socket.emit('client_input', { vx: dx / d, vy: dy / d }); await sleep(110); }
  c.socket.emit('client_input', { vx: 0, vy: 0 });
}
async function land(c) { if (c.flying) { c.socket.emit('fly_toggle', {}); c.flying = false; await sleep(450); } }
// Đuổi theo + đánh thường cho tới khi toàn bộ ảo ảnh của đợt chết (ảo ảnh tự đuổi theo chủ nhân)
async function killWave(c, timeoutMs) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    const alive = illusions(c).filter((m) => m.hp > 0);
    if (!alive.length) return true;
    const me = meOf(c); if (!me) { await sleep(200); continue; }
    const t = alive.sort((a, b) => Math.hypot(a.x - me.x, a.y - me.y) - Math.hypot(b.x - me.x, b.y - me.y))[0];
    const d = Math.hypot(t.x - me.x, t.y - me.y);
    if (d > 55) { await flyTo(c, t.x, t.y, 40); await land(c); }
    c.socket.emit('player_attack');
    await sleep(620);
  }
  return illusions(c).filter((m) => m.hp > 0).length === 0;
}
(async () => {
  const TKA = 'p344tokenA123456', TKB = 'p344tokenB123456', TKC = 'p344tokenC123456';
  writeChars({
    [TKA]: BASE(TKA, 'P344 AnhA'),
    [TKB]: BASE(TKB, 'P344 ThuongB', { anState: AN(0, 0, 0) }),
    [TKC]: BASE(TKC, 'P344 YeuC', { stats: { khiHuyet: 300, vatCong: 10, vatPhong: 0, phapCong: 10, phapPhong: 0, tocDo: 60, minhMan: 10 } }),
  });
  await startServer(3644, 'p344');
  try {
    // ---------- Chân B: chưa Viên Mãn → cổng không mở ----------
    const cB = connect(TKB);
    await waitFor(() => cB.welcome, 15000);
    await waitFor(() => meOf(cB), 15000);
    cB.socket.emit('an_gate_enter', { canh: 'doianh' });
    const errB = await waitFor(() => cB.errors.find((e) => e.includes('im lìm')), 6000);
    ok('B: chưa Viên Mãn bị cổng từ chối (bia đá im lìm)', !!errB, JSON.stringify(cB.errors));
    ok('B: vẫn ở map nhà sau khi bị từ chối', curMap(cB) === 'lang_tan_thu' || curMap(cB) === null, curMap(cB));
    cB.socket.disconnect();

    // ---------- Chân A: Viên Mãn chạy trọn 3 đợt ----------
    const cA = connect(TKA);
    await waitFor(() => cA.welcome, 15000);
    await waitFor(() => meOf(cA), 15000);
    const homeEnter = cA.mapEnters.find((d) => d.mapId === 'lang_tan_thu');
    ok('A: payload map nhà có cổng doianh', !!(homeEnter && (homeEnter.anGates || []).some((g) => g.canh === 'doianh')), JSON.stringify(homeEnter?.anGates));
    cA.socket.emit('an_gate_enter', { canh: 'doianh' });
    const inCanh = await waitFor(() => cA.mapEnters.some((d) => d.mapId === 'doi_anh_canh'), 8000);
    ok('A: vào được Đối Ảnh Cảnh', !!inCanh, JSON.stringify(cA.mapEnters.map((d) => d.mapId)));
    const canhEnter = cA.mapEnters.find((d) => d.mapId === 'doi_anh_canh');
    ok('A: payload cảnh có anCanh + caveExit (cổng ra)', !!(canhEnter && canhEnter.anCanh === 'doi_anh_canh' && canhEnter.caveExit), JSON.stringify({ anCanh: canhEnter?.anCanh, caveExit: !!canhEnter?.caveExit }));
    const w1 = await waitFor(() => illusions(cA).length >= 3, 15000);
    ok('A: đợt 1 có 3 ảo ảnh đồng môn', !!w1, 'count=' + illusions(cA).length);
    const stones0 = myChar(cA).stones || 0;
    const killed1 = await killWave(cA, 90000);
    ok('A: dọn sạch đợt 1', killed1);
    const n33 = await waitFor(() => cA.notices.find((n) => n.includes('Qua đợt 1 (33%)')), 8000);
    ok('A: qua đợt 1 = 33%', !!n33, JSON.stringify(cA.notices.slice(-3)));
    ok('A: ảo ảnh không rơi đồ (stones/túi chưa đổi sau đợt 1)', (myChar(cA).stones || 0) === stones0 && Object.keys(myChar(cA).inventory || {}).length === 0, 'stones=' + myChar(cA).stones);
    const w2 = await waitFor(() => illusions(cA).length >= 5, 20000);
    ok('A: đợt 2 có 5 ảo ảnh', !!w2, 'count=' + illusions(cA).length);
    const killed2 = await killWave(cA, 120000);
    ok('A: dọn sạch đợt 2', killed2);
    const n66 = await waitFor(() => cA.notices.find((n) => n.includes('Qua đợt 2 (66%)')), 8000);
    ok('A: qua đợt 2 = 66%', !!n66, JSON.stringify(cA.notices.slice(-3)));
    const boss = await waitFor(() => illusions(cA).find((m) => m.name === 'Ảnh Vương'), 20000);
    ok('A: đợt 3 Ảnh Vương hiện hình', !!boss, 'mons=' + illusions(cA).map((m) => m.name).join(','));
    if (boss) note('A: Ảnh Vương HP', 'maxHp=' + boss.maxHp + ' (HP người vào ≈ ' + (myChar(cA).maxHp || '?') + ')');
    const killed3 = await killWave(cA, 150000);
    ok('A: hạ Ảnh Vương', killed3);
    const done = await waitFor(() => cA.notices.find((n) => n.includes('HOÀN THÀNH 100%')), 8000);
    ok('A: hoàn thành 100%', !!done, JSON.stringify(cA.notices.slice(-4)));
    await waitFor(() => (myChar(cA).anState || {}).doiAnhBest === 100, 8000);
    const stA = myChar(cA).anState || {};
    ok('A: anState ghi doiAnhBest=100 + doiAnhFirst=true', stA.doiAnhBest === 100 && stA.doiAnhFirst === true, JSON.stringify(stA));
    ok('A: quà 100% = +2.000 LT Hạ', (myChar(cA).stones || 0) === stones0 + 2000, 'stones=' + myChar(cA).stones);
    ok('A: F3 lần đầu 100% → +5 điểm chỉ số tự do', (myChar(cA).freePoints || 0) === 5, 'freePoints=' + myChar(cA).freePoints);
    // Ra cổng rồi vào lại cùng ngày → bị khóa ngày
    const portal = (canhEnter && canhEnter.portal) || { x: 1312, y: 1837 };
    await flyTo(cA, portal.x, portal.y, 60); await land(cA);
    cA.socket.emit('an_gate_exit');
    const back = await waitFor(() => cA.mapEnters[cA.mapEnters.length - 1]?.mapId === 'lang_tan_thu' && cA.mapEnters.length > 2, 8000);
    ok('A: ra cổng về lại map nhà', !!back, JSON.stringify(cA.mapEnters.map((d) => d.mapId)));
    const meA = meOf(cA);
    if (meA) await flyTo(cA, 1140, 2010, 60), await land(cA);
    const errN = cA.errors.length;
    cA.socket.emit('an_gate_enter', { canh: 'doianh' });
    const lockErr = await waitFor(() => cA.errors.slice(errN).find((e) => e.includes('chỉ mở 1 lần mỗi ngày')), 6000);
    ok('A: vào lại cùng ngày bị khóa (1 lần/ngày game)', !!lockErr, JSON.stringify(cA.errors.slice(errN)));
    cA.socket.disconnect();

    // ---------- Chân C: yếu, gục giữa chừng → ra cổng, giữ %, ngày vẫn khóa ----------
    const cC = connect(TKC);
    await waitFor(() => cC.welcome, 15000);
    await waitFor(() => meOf(cC), 15000);
    cC.socket.emit('an_gate_enter', { canh: 'doianh' });
    await waitFor(() => cC.mapEnters.some((d) => d.mapId === 'doi_anh_canh'), 8000);
    const w1c = await waitFor(() => illusions(cC).length >= 3, 15000);
    ok('C: vào cảnh, đợt 1 hiện hình', !!w1c);
    // đứng yên chịu đòn tới khi bị kéo ra cổng
    const outC = await waitFor(() => cC.notices.find((n) => n.includes('gục trong Đối Ảnh Cảnh')), 90000);
    ok('C: gục → nhận thông báo bị bia đá kéo ra', !!outC, JSON.stringify(cC.notices.slice(-3)));
    await waitFor(() => curMap(cC) === 'lang_tan_thu', 8000);
    ok('C: sau gục đang ở map nhà', curMap(cC) === 'lang_tan_thu', curMap(cC));
    const chC = myChar(cC);
    ok('C: hồi phục đầy máu sau khi bị kéo ra', chC.hp > 0 && chC.hp >= (chC.maxHp || 1) * 0.99, 'hp=' + chC.hp + '/' + chC.maxHp);
    ok('C: ngày đã bị khóa dù gục sớm (doiAnhDay = hôm nay, best 0)', (chC.anState || {}).doiAnhDay >= 0 && (chC.anState || {}).doiAnhBest === 0, JSON.stringify(chC.anState));
    const meC = meOf(cC);
    if (meC && Math.hypot(meC.x - 1140, meC.y - 2010) > 120) { await flyTo(cC, 1140, 2010, 60); await land(cC); }
    const errNC = cC.errors.length;
    cC.socket.emit('an_gate_enter', { canh: 'doianh' });
    const lockC = await waitFor(() => cC.errors.slice(errNC).find((e) => e.includes('chỉ mở 1 lần mỗi ngày')), 6000);
    ok('C: gục rồi vẫn không vào lại được trong ngày', !!lockC, JSON.stringify(cC.errors.slice(errNC)));
    cC.socket.disconnect();
  } finally {
    await stopServer();
  }
  console.log(`\nKẾT QUẢ GĐ344: ${pass} PASS / ${fail} FAIL`);
  process.exit(fail ? 1 : 0);
})().catch(async (e) => { console.error('PROBE CRASH', e); await stopServer(); process.exit(2); });
