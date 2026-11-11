// GĐ367 phần 2 — probe: faucet NA (rương hỗn hợp Trung/Thượng) · đổi đá 1 chiều
// xuống (CHỈ Trung→Hạ ×100 + Thượng→Hạ ×10.000 — Bảo chốt 09/11 BỎ Thượng→Trung)
// · giá dịch chuyển theo phẩm (HT 400 · PH 600 · DK 1.000 · TN 1.700 Thượng)
// · hộ tống bậc 6–8 giữ Hạ · hồi quy tổng quái 2.948.
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
async function startServer(port, tag, extraEnv) {
  CUR_PORT = port;
  if (!(await portFree(port))) throw new Error('port ban ' + port);
  serverProc = spawn('node', ['server/index.js'], { cwd: ROOT, env: { ...process.env, PORT: String(port), TTT_STORAGE: 'file', TTT_CHAR_FILE: path.join(DIR, 'characters.json'), TTT_ACC_FILE: path.join(DIR, 'accounts.json'), TTT_WORLD_FILE: path.join(DIR, 'world.json'), TTT_SESS_FILE: path.join(DIR, 'sessions.json'), TTT_DAY_REAL_MS: '600000', TTT_TUVI_NEED: '5', ...(extraEnv || {}) }, stdio: ['ignore', 'pipe', 'pipe'] });
  serverProc.stderr.on('data', (d) => { try { fs.appendFileSync(path.join(DIR, 'srv_' + tag + '.log'), d); } catch (e) {} });
  serverProc.stdout.on('data', (d) => { try { fs.appendFileSync(path.join(DIR, 'srv_' + tag + '.log'), d); } catch (e) {} });
  killTimer = setTimeout(() => { try { serverProc.kill('SIGKILL'); } catch (e) {} }, 2400000);
  const t0 = Date.now();
  while (Date.now() - t0 < 45000) { try { const r = await fetch(`http://127.0.0.1:${port}/api/status`); if (r.ok) { clearTimeout(killTimer); return await (await fetch(`http://127.0.0.1:${port}/api/status`)).json(); } } catch (e) {} await sleep(500); }
  throw new Error('server khong len');
}
async function stopServer() { if (!serverProc) return; const p = serverProc; serverProc = null; if (killTimer) { clearTimeout(killTimer); killTimer = null; } await new Promise((res) => { const t = setTimeout(() => { try { p.kill('SIGKILL'); } catch (e) {} res(); }, 4000); p.once('exit', () => { clearTimeout(t); res(); }); try { p.kill('SIGTERM'); } catch (e) { clearTimeout(t); res(); } }); const t0 = Date.now(); while (Date.now() - t0 < 10000 && !(await portFree(CUR_PORT))) await sleep(300); }
const STRONG = { khiHuyet: 20000, vatCong: 6000, vatPhong: 2000, phapCong: 400, phapPhong: 2000, tocDo: 80, minhMan: 100 };
const LC1 = { elements: ['kim'], main: 'kim', count: 1, mutations: [] };
function BASE(token, name, extra) {
  return Object.assign({ token, name, classId: 'kiemtu', gender: 'nam', race: null, geo175: 1, realm: 'tn', tier: 9, x: 1890, y: 1050, mapId: 'lang_tan_thu', hp: 999999, mp: 99999, lifespan: 500, birthDay: -5660, ageStart: 16, stats: { ...STRONG }, statPoints: 0, freePoints: 0, tuVi: 99999, stones: 0, stonesTrung: 0, stonesThuong: 0, stonesCuc: 0, inventory: {}, gearBag: {}, equipped: [], skills: [], job: null, job2: null, job3: null, linhCan: { ...LC1 }, affinity: {}, affV2: 1, bonds: {}, quests: {}, questsDone: {}, flags: {}, counters: {}, disciples: [], foundInvites: [], reformIn: [], sectTech: [], sectArts: [], sectArtsActive: [], mails: [], classRes: {}, food: 100, water: 100 }, extra || {});
}
let pass = 0, fail = 0;
function ok(name, cond, extra) { if (cond) { pass++; console.log('PASS | ' + name); } else { fail++; console.log('FAIL | ' + name + (extra ? ' | ' + extra : '')); } }
function connect(token) {
  const socket = io(`http://127.0.0.1:${CUR_PORT}`, { transports: ['websocket'] });
  const ctx = { socket, merger: createMerger(), state: null, welcome: null, syncs: [], errs: [], notices: [], maps: [], killed: [], chestEvents: [], escortStarted: [], overview: null, myName: null };
  socket.on('connect', () => socket.emit('hello', { token }));
  socket.on('welcome', (w) => { ctx.welcome = w; ctx.myName = (w.character || {}).name; });
  socket.on('char_sync', (s) => ctx.syncs.push(s));
  socket.on('notice', (n) => ctx.notices.push(n.text || ''));
  socket.on('interact_error', (e) => ctx.errs.push(e.message || ''));
  socket.on('map_enter', (m) => ctx.maps.push(m));
  socket.on('monster_killed', (k) => ctx.killed.push(k));
  socket.on('chest_opened', (e) => ctx.chestEvents.push(e));
  socket.on('escort_started', (e) => ctx.escortStarted.push(e));
  socket.on('overview_data', (d) => { ctx.overview = d; });
  socket.on('server_tick', (t) => { const st = ctx.merger(t); if (st) ctx.state = st; });
  return ctx;
}
const lastChar = (c) => { for (let i = c.syncs.length - 1; i >= 0; i--) { if (c.syncs[i]) return c.syncs[i]; } return c.welcome ? c.welcome.character : null; };
const meOf = (c) => { const ps = (c.state && c.state.players) || []; return ps.find((p) => p.name === c.myName) || null; };
const mons = (c) => (c.state && c.state.monsters) || [];
const chestsOf = (c) => (c.state && c.state.chests) || [];
const myKills = (c) => c.killed.filter((k) => k.byName === c.myName).length;
const curMap = (c) => (c.maps.length ? c.maps[c.maps.length - 1].mapId : null);
async function flyTo(c, tx, ty, tol, ms) {
  c.socket.emit('fly_toggle', {});
  await sleep(400);
  const t0 = Date.now();
  while (Date.now() - t0 < (ms || 60000)) {
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
// Mở mọi rương trong vòng 600px quanh mình (rương rơi tại chỗ quái mình hạ).
async function openNearbyChests(c, ms) {
  const t0 = Date.now();
  while (Date.now() - t0 < (ms || 25000)) {
    const me = meOf(c); if (!me) { await sleep(200); continue; }
    const near = chestsOf(c).filter((ch) => Math.hypot(ch.x - me.x, ch.y - me.y) <= 600);
    if (!near.length) return;
    near.sort((a, b) => Math.hypot(a.x - me.x, a.y - me.y) - Math.hypot(b.x - me.x, b.y - me.y));
    const before = c.chestEvents.length;
    await flyTo(c, near[0].x, near[0].y, 16, 30000);
    await waitFor(() => c.chestEvents.length > before || !chestsOf(c).some((ch) => ch.id === near[0].id), 6000);
  }
}
// Săn quái farm (không sp/không hiếm; kinds = giới hạn loài nếu cần) tới đủ số mạng.
async function farmKills(c, wantKills, kinds, ms) {
  const t0 = Date.now(); const startK = myKills(c); let flying = false;
  while (Date.now() - t0 < (ms || 600000)) {
    if (myKills(c) - startK >= wantKills) break;
    const me = meOf(c); if (!me) { await sleep(200); continue; }
    const cands = mons(c).filter((m) => m.sp !== 1 && !m.rare && (!kinds || kinds.includes(m.kind)));
    if (!cands.length) { await sleep(300); continue; }
    cands.sort((a, b) => Math.hypot(a.x - me.x, a.y - me.y) - Math.hypot(b.x - me.x, b.y - me.y));
    const t = cands[0];
    const d = Math.hypot(t.x - me.x, t.y - me.y);
    const kBefore = myKills(c);
    if (d > 58 && !flying) { c.socket.emit('fly_toggle', {}); flying = true; await sleep(300); continue; }
    if (d <= 58 && flying) { c.socket.emit('fly_toggle', {}); flying = false; await sleep(300); continue; }
    if (d > 52) { c.socket.emit('client_input', { vx: (t.x - me.x) / d, vy: (t.y - me.y) / d }); await sleep(120); continue; }
    c.socket.emit('client_input', { vx: 0, vy: 0 });
    c.socket.emit('player_attack', {});
    await sleep(550);
    if (myKills(c) > kBefore) { if (flying) { c.socket.emit('fly_toggle', {}); flying = false; } await openNearbyChests(c); }
  }
  if (flying) { try { c.socket.emit('fly_toggle', {}); } catch (e) {} }
  return myKills(c) - startK;
}
async function waitStable(c, ms) {
  const t0 = Date.now(); let last = -1, stable = 0;
  while (Date.now() - t0 < (ms || 60000)) {
    const n = mons(c).length;
    if (n === last && n > 0) { stable++; if (stable >= 3) return true; } else stable = 0;
    last = n; await sleep(1000);
  }
  return mons(c).length > 0;
}
// Cộng dồn đá từ các sự kiện chest_opened (bỏ sự kiện có Cực phẩm = rương trùm/boss-class lạc vào).
function tallyChests(c) {
  let trung = 0, thuong = 0, ha = 0, cucEvents = 0, stoneEvents = 0, badSplit = 0;
  for (const e of c.chestEvents) {
    const lines = e.loot || [];
    if (lines.some((l) => l.includes('Cực phẩm'))) { cucEvents++; continue; }
    let t = 0, th = 0, hasStone = false;
    for (const l of lines) {
      let m = l.match(/(\d+) Linh thạch Trung phẩm/); if (m) { t += Number(m[1]); hasStone = true; }
      m = l.match(/(\d+) Linh thạch Thượng phẩm/); if (m) { th += Number(m[1]); hasStone = true; }
      m = l.match(/(\d+) Linh thạch Hạ phẩm/); if (m) { ha += Number(m[1]); hasStone = true; }
    }
    if (hasStone) { stoneEvents++; if (t > 0 && th > t) badSplit++; }
    trung += t; thuong += th;
  }
  return { trung, thuong, ha, cucEvents, stoneEvents, badSplit };
}
const wallets = (c) => { const ch = lastChar(c); return ch ? { ha: ch.stones || 0, trung: ch.stonesTrung || 0, thuong: ch.stonesThuong || 0, cuc: ch.stonesCuc || 0 } : null; };
async function waitWallet(c, pred, ms) { return waitFor(() => { const w = wallets(c); return w && pred(w) ? w : null; }, ms || 8000); }

(async () => {
  let status0 = null;
  try {
    const chars = {};
    chars['d367na01'] = BASE('d367na01', 'P367DNa', { realm: 'na', mapId: 'bang_nguyen_dai', x: 4250, y: 3200 });
    chars['d367ht01'] = BASE('d367ht01', 'P367DHt', { realm: 'ht', mapId: 'thuy_than_dam', x: 3000, y: 2400 });
    chars['d367tc01'] = BASE('d367tc01', 'P367DTc', { realm: 'tc', mapId: 'huyet_sac_rung', x: 4248, y: 6167 });
    chars['d367ex01'] = BASE('d367ex01', 'P367DEx', { stones: 1000, stonesTrung: 500, stonesThuong: 5000, stonesCuc: 50 });
    chars['d367poor'] = BASE('d367poor', 'P367DPoor', { mapId: 'thanh_van_thanh', x: 800, y: 600, stones: 0, stonesThuong: 100 });
    chars['d367esc1'] = BASE('d367esc1', 'P367DEsc', { x: 1759, y: 954 });
    fs.writeFileSync(path.join(DIR, 'characters.json'), JSON.stringify(chars));
    fs.writeFileSync(path.join(DIR, 'accounts.json'), '{}');
    fs.writeFileSync(path.join(DIR, 'world.json'), JSON.stringify({ totalMinutes: 3360, savedAt: Date.now() }));
    fs.writeFileSync(path.join(DIR, 'sessions.json'), '{}');
    status0 = await startServer(3751, '367d');
    await sleep(6000); // chờ spawn quái đủ rồi mới đọc lại status (lần fetch đầu chỉ để biết server đã lên)
    try { status0 = await (await fetch('http://127.0.0.1:3751/api/status')).json(); } catch (e) {}
    ok('HỒI QUY: tổng quái lúc boot = 2.948 (phần 1 không vỡ)', status0 && status0.monsters === 2948, 'status=' + JSON.stringify(status0 && { monsters: status0.monsters }));

    // ===== A. FAUCET NA: rương loài Nguyên Anh = Trung chính + Thượng phụ =====
    const na = connect('d367na01');
    await waitFor(() => na.welcome, 20000);
    await waitStable(na, 90000);
    // Săn theo đợt tới khi đủ mẫu rương đá (≥10) — bản chạy đầu chỉ được 7 rương đá / 30 mạng vì tỉ lệ rơi rương < 100%.
    let naKills = 0, naT = tallyChests(na);
    for (let batch = 0; batch < 5 && naT.stoneEvents < 10; batch++) {
      naKills += await farmKills(na, 12, null, 480000);
      await openNearbyChests(na);
      naT = tallyChests(na);
      console.log(`  [NA] đợt ${batch + 1}: kills+=${naKills} stoneEvents=${naT.stoneEvents}`);
    }
    console.log(`  [NA] kills=${naKills} chestEvents=${na.chestEvents.length} stoneEvents=${naT.stoneEvents} cucEvents=${naT.cucEvents} trung=${naT.trung} thuong=${naT.thuong} ha=${naT.ha}`);
    ok('NA: săn đủ ≥30 mạng farm', naKills >= 30, 'kills=' + naKills);
    ok('NA: có ≥8 rương chứa đá để kết luận', naT.stoneEvents >= 8, 'stoneEvents=' + naT.stoneEvents);
    ok('NA: Trung là dòng chính — tổng Trung ≥ tổng Thượng', naT.trung >= naT.thuong, `trung=${naT.trung} thuong=${naT.thuong}`);
    const ratio = naT.thuong > 0 ? naT.trung / naT.thuong : 99;
    ok('NA: tỉ lệ Trung/Thượng tổng trong [1.8, 5.0] (kỳ vọng 3.0)', ratio >= 1.8 && ratio <= 5.0, 'ratio=' + ratio.toFixed(2));
    const pkT = naT.trung / Math.max(1, naKills), pkTh = naT.thuong / Math.max(1, naKills);
    ok('NA: Trung/mạng trong [3.5, 11] (kỳ vọng ~6.6)', pkT >= 3.5 && pkT <= 11, 'pk=' + pkT.toFixed(2));
    ok('NA: Thượng/mạng trong [0.4, 3.6] (kỳ vọng ~2.2)', pkTh >= 0.4 && pkTh <= 3.6, 'pk=' + pkTh.toFixed(2));
    ok('NA: từng rương có đá — phần Trung luôn ≥ phần Thượng (không rương nào lệch)', naT.badSplit === 0, 'badSplit=' + naT.badSplit);
    ok('NA: rương farm không ra Hạ phẩm', naT.ha === 0, 'ha=' + naT.ha);
    na.socket.disconnect();
    await sleep(1500);

    // ===== B. HỒI QUY HT: rương vẫn Thượng chính, không Trung =====
    const ht = connect('d367ht01');
    await waitFor(() => ht.welcome, 20000);
    await waitStable(ht, 90000);
    const htKills = await farmKills(ht, 12, null, 480000);
    await openNearbyChests(ht);
    const htT = tallyChests(ht);
    console.log(`  [HT] kills=${htKills} stoneEvents=${htT.stoneEvents} trung=${htT.trung} thuong=${htT.thuong}`);
    ok('HT: săn đủ ≥10 mạng', htKills >= 10, 'kills=' + htKills);
    ok('HT: rương vẫn ra Thượng (tổng > 0)', htT.thuong > 0, 'thuong=' + htT.thuong);
    ok('HT: rương KHÔNG ra Trung (giữ nguyên như trước GĐ367)', htT.trung === 0, 'trung=' + htT.trung);
    ht.socket.disconnect();
    await sleep(1500);

    // ===== C. HỒI QUY TC: quái map TC (Huyết Sắc Rừng) vẫn ra Trung, không Thượng =====
    // (Bản đầu dùng Kiếm Ma ở Thạch Lâm: vùng bí cảnh tông môn không hiện quái cho
    // người ngoài tông — kills=0. Đổi sang map TC thật, cùng cơ chế rương theo loài.)
    const tc = connect('d367tc01');
    await waitFor(() => tc.welcome, 20000);
    await waitStable(tc, 90000);
    // Chỉ săn Huyết Lang (loài TC stage 'trung' trong MONSTER_TYPES → rương ra Trung).
    // Bản chạy đầu farm lẫn Sói Xám/Độc Xà (loài LK cùng map, rương ra Hạ) + mẫu quá nhỏ → trung=0 oan.
    const tcKills = await farmKills(tc, 15, ['huyetlang'], 720000);
    await openNearbyChests(tc);
    const tcT = tallyChests(tc);
    console.log(`  [TC] kills=${tcKills} stoneEvents=${tcT.stoneEvents} trung=${tcT.trung} thuong=${tcT.thuong} ha=${tcT.ha} cucEv=${tcT.cucEvents}`);
    ok('TC: hạ đủ ≥12 Huyết Lang', tcKills >= 12, 'kills=' + tcKills);
    ok('TC: có ≥3 rương chứa đá để kết luận', tcT.stoneEvents >= 3, 'stoneEvents=' + tcT.stoneEvents);
    ok('TC: rương vẫn ra Trung (tổng > 0)', tcT.trung > 0, 'trung=' + tcT.trung);
    ok('TC: rương KHÔNG ra Thượng (giữ nguyên)', tcT.thuong === 0, 'thuong=' + tcT.thuong);
    tc.socket.disconnect();
    await sleep(1500);

    // ===== D. ĐỔI ĐÁ 1 CHIỀU + DỊCH CHUYỂN THEO PHẨM =====
    const ex = connect('d367ex01');
    await waitFor(() => ex.welcome, 20000);
    await sleep(1000);
    const w0 = wallets(ex);
    ok('EX: ví khởi đầu đúng fixture (1000/500/5000/50)', !!w0 && w0.ha === 1000 && w0.trung === 500 && w0.thuong === 5000 && w0.cuc === 50, JSON.stringify(w0));
    const doEx = async (payload) => { ex.errs.length = 0; ex.socket.emit('exchange_stones', payload); await sleep(700); };
    await doEx({ from: 'thuong', to: 'trung', qty: 10 });
    let w = wallets(ex);
    ok('ĐỔI: Thượng→Trung BỊ TỪ CHỐI (Bảo chốt bỏ chiều này) — ví không đổi', ex.errs.length > 0 && !!w && w.thuong === 5000 && w.trung === 500, JSON.stringify(ex.errs) + ' ' + JSON.stringify(w));
    await doEx({ from: 'trung', to: 'ha', qty: 5 });
    w = await waitWallet(ex, (x) => x.trung === 495 && x.ha === 1500, 6000);
    ok('ĐỔI: 5 Trung → +500 Hạ (×100)', !!w, JSON.stringify(wallets(ex)));
    await doEx({ from: 'thuong', to: 'ha', qty: 2 });
    w = await waitWallet(ex, (x) => x.thuong === 4998 && x.ha === 21500, 6000);
    ok('ĐỔI: 2 Thượng → +20.000 Hạ (×10.000)', !!w, JSON.stringify(wallets(ex)));
    await doEx({ from: 'thuong', to: 'ha', qty: 50000 }); // dưới trần 100.000/lần nhưng vượt ví 4.998 → phải chạm nhánh "Không đủ"
    ok('ĐỔI: thiếu ví nguồn bị chặn + báo không đủ', ex.errs.some((e) => e.includes('Không đủ')), JSON.stringify(ex.errs));
    w = wallets(ex);
    ok('ĐỔI: sau lần chặn, ví không đổi (4998/495)', !!w && w.thuong === 4998 && w.trung === 495, JSON.stringify(w));
    await doEx({ from: 'ha', to: 'thuong', qty: 1 });
    ok('ĐỔI: chiều LÊN Hạ→Thượng bị từ chối', ex.errs.length > 0, JSON.stringify(ex.errs));
    await doEx({ from: 'trung', to: 'thuong', qty: 1 });
    ok('ĐỔI: chiều LÊN Trung→Thượng bị từ chối', ex.errs.length > 0, JSON.stringify(ex.errs));
    await doEx({ from: 'ha', to: 'trung', qty: 1 });
    ok('ĐỔI: chiều LÊN Hạ→Trung bị từ chối', ex.errs.length > 0, JSON.stringify(ex.errs));
    await doEx({ from: 'cuc', to: 'ha', qty: 1 });
    w = wallets(ex);
    ok('ĐỔI: Cực phẩm KHÔNG đổi được (parked) — ví Cực giữ 50', ex.errs.length > 0 && !!w && w.cuc === 50, JSON.stringify(ex.errs) + ' ' + JSON.stringify(w));
    await doEx({ from: 'trung', to: 'ha', qty: 0 });
    ok('ĐỔI: qty = 0 bị từ chối', ex.errs.length > 0, JSON.stringify(ex.errs));
    await doEx({ from: 'thuong', to: 'ha', qty: -3 });
    ok('ĐỔI: qty âm bị từ chối', ex.errs.length > 0, JSON.stringify(ex.errs));
    w = wallets(ex);
    ok('ĐỔI: chốt ví sau mọi lần đổi (Hạ 21500 · Trung 495 · Thượng 4998 · Cực 50)', !!w && w.ha === 21500 && w.trung === 495 && w.thuong === 4998 && w.cuc === 50, JSON.stringify(w));

    // Tổng quan bản đồ: bảng giá kèm phẩm
    ex.socket.emit('map_overview', {});
    const ov = await waitFor(() => ex.overview, 8000);
    const costOf = (id) => { const m = ov && ov.maps.find((x) => x.id === id); return m ? { cost: m.cost, grade: m.costGrade } : null; };
    const cHT = costOf('hon_don_nguyen'), cPH = costOf('phan_hu_nguyen'), cDK = costOf('loi_kiep_nguyen'), cTN = costOf('tien_linh_nguyen'), cNA = costOf('thien_moc_lam'), cTC = costOf('huyet_sac_rung');
    console.log('  [OV] ht=' + JSON.stringify(cHT) + ' ph=' + JSON.stringify(cPH) + ' dk=' + JSON.stringify(cDK) + ' tn=' + JSON.stringify(cTN) + ' na=' + JSON.stringify(cNA) + ' tc=' + JSON.stringify(cTC));
    ok('GIÁ (overview): HT = 400 Thượng', !!cHT && cHT.cost === 400 && cHT.grade === 'thuong', JSON.stringify(cHT));
    ok('GIÁ (overview): PH = 600 Thượng', !!cPH && cPH.cost === 600 && cPH.grade === 'thuong', JSON.stringify(cPH));
    ok('GIÁ (overview): DK = 1.000 Thượng', !!cDK && cDK.cost === 1000 && cDK.grade === 'thuong', JSON.stringify(cDK));
    ok('GIÁ (overview): TN = 1.700 Thượng', !!cTN && cTN.cost === 1700 && cTN.grade === 'thuong', JSON.stringify(cTN));
    ok('GIÁ (overview): NA = 900 Hạ (giữ)', !!cNA && cNA.cost === 900 && cNA.grade === 'ha', JSON.stringify(cNA));
    ok('GIÁ (overview): TC = 150 Hạ (giữ)', !!cTC && cTC.cost === 150 && cTC.grade === 'ha', JSON.stringify(cTC));

    // Hành trình dịch chuyển: trừ đúng ví theo phẩm
    const travel = async (dest) => { const mb = ex.maps.length; ex.socket.emit('travel_to', { mapId: dest, method: 'portal' }); const r = await waitFor(() => ex.maps.length > mb && curMap(ex) === dest, 10000); await sleep(600); return r; };
    await flyTo(ex, 2415, 1342, 60, 60000); // diễn viên offline có thể đã dời nhân vật khỏi tọa độ file — về đúng cổng làng HOME_PORTAL = hs175(1080,600) = (2415,1342), HS175 = √5 (bản chạy đầu bay tới (1890,1050) theo scale 1,75 cũ → cách cổng ~600px, bị chặn khoảng cách)
    let r = await travel('thanh_van_thanh');
    w = wallets(ex);
    ok('ĐI: làng → thành trừ 50 Hạ (21500 → 21450)', !!r && !!w && w.ha === 21450, JSON.stringify(w));
    r = await travel('hon_don_nguyen');
    w = wallets(ex);
    ok('ĐI: thành → map HT trừ 400 THƯỢNG, Hạ không đụng (Thượng 4998 → 4598)', !!r && !!w && w.thuong === 4598 && w.ha === 21450, JSON.stringify(w));
    r = await travel('thanh_van_thanh');
    w = wallets(ex);
    ok('ĐI: map xa → thành miễn phí (ví không đổi)', !!r && !!w && w.thuong === 4598 && w.ha === 21450, JSON.stringify(w));
    r = await travel('phan_hu_nguyen');
    w = wallets(ex);
    ok('ĐI: thành → map PH trừ 600 Thượng (→ 3998)', !!r && !!w && w.thuong === 3998, JSON.stringify(w));
    await travel('thanh_van_thanh');
    r = await travel('loi_kiep_nguyen');
    w = wallets(ex);
    ok('ĐI: thành → map DK trừ 1.000 Thượng (→ 2998)', !!r && !!w && w.thuong === 2998, JSON.stringify(w));
    await travel('thanh_van_thanh');
    r = await travel('tien_linh_nguyen');
    w = wallets(ex);
    ok('ĐI: thành → map TN trừ 1.700 Thượng (→ 1298)', !!r && !!w && w.thuong === 1298, JSON.stringify(w));
    await travel('thanh_van_thanh');
    r = await travel('thien_moc_lam');
    w = wallets(ex);
    ok('ĐI: thành → map NA trừ 900 HẠ, Thượng giữ nguyên (Hạ → 20550)', !!r && !!w && w.ha === 20550 && w.thuong === 1298, JSON.stringify(w));
    ex.socket.disconnect();
    await sleep(1500);

    // ===== E. THIẾU THƯỢNG: bị chặn + báo đúng phẩm =====
    const poor = connect('d367poor');
    await waitFor(() => poor.welcome, 20000);
    await waitFor(() => poor.maps.length > 0, 8000);
    const cityPortal = poor.maps[poor.maps.length - 1].portal;
    if (cityPortal) await flyTo(poor, cityPortal.x, cityPortal.y, 50, 30000);
    poor.errs.length = 0; const poorMapsBefore = poor.maps.length;
    poor.socket.emit('travel_to', { mapId: 'hon_don_nguyen', method: 'portal' });
    const poorErr = await waitFor(() => poor.errs.find((e) => e.includes('Thượng phẩm')), 8000);
    ok('ĐI (thiếu): tới map HT với 100 Thượng bị chặn, lỗi nêu đúng "Thượng phẩm" + cần 400', !!poorErr && poorErr.includes('400'), JSON.stringify(poor.errs));
    await sleep(800);
    ok('ĐI (thiếu): không rời thành (không có map_enter mới)', poor.maps.length === poorMapsBefore, 'maps=' + poor.maps.length + ' before=' + poorMapsBefore);
    const wp = wallets(poor);
    ok('ĐI (thiếu): ví Thượng giữ nguyên 100, Hạ giữ 0', !!wp && wp.thuong === 100 && wp.ha === 0, JSON.stringify(wp));
    poor.socket.disconnect();
    await sleep(1500);

    // ===== F. HỘ TỐNG BẬC 6–8 =====
    const esc = connect('d367esc1');
    await waitFor(() => esc.welcome, 20000);
    await sleep(1000);
    await flyTo(esc, 2247, 1219, 60, 60000); // về đúng chỗ Lái Buôn = hs175(1005,545) = (2247,1219), HS175 = √5 (bản chạy đầu dùng scale 1,75 → (1759,954), cách NPC ~555px > 110px cho phép)
    const accept = async (mapId) => { const b = esc.escortStarted.length; esc.errs.length = 0; esc.socket.emit('escort_accept', { mapId }); const e = await waitFor(() => esc.escortStarted.length > b ? esc.escortStarted[esc.escortStarted.length - 1] : null, 8000); if (e) { esc.socket.emit('escort_abandon', {}); await sleep(600); } return e; };
    let ea = await accept('hon_don_nguyen');
    ok('HỘ TỐNG: đích HT vẫn bậc 5 = 600 Hạ (hồi quy)', !!ea && ea.reward.stones === 600, JSON.stringify(ea) + ' errs=' + JSON.stringify(esc.errs));
    ea = await accept('phan_hu_nguyen');
    ok('HỘ TỐNG: đích PH = bậc 6 → 900 Hạ (không rơi về 80)', !!ea && ea.reward.stones === 900, JSON.stringify(ea) + ' errs=' + JSON.stringify(esc.errs));
    ea = await accept('loi_kiep_nguyen');
    ok('HỘ TỐNG: đích DK = bậc 7 → 1.300 Hạ', !!ea && ea.reward.stones === 1300, JSON.stringify(ea) + ' errs=' + JSON.stringify(esc.errs));
    ea = await accept('tien_linh_nguyen');
    ok('HỘ TỐNG: đích TN = bậc 8 → 1.800 Hạ', !!ea && ea.reward.stones === 1800, JSON.stringify(ea) + ' errs=' + JSON.stringify(esc.errs));
    esc.socket.disconnect();
    await sleep(1000);

    await stopServer();

    // ===== ĐỐI CHIẾU FILE (độc lập với kênh sync) =====
    const saved = JSON.parse(fs.readFileSync(path.join(DIR, 'characters.json'), 'utf8'));
    const fNA = saved['d367na01'] || {};
    ok('FILE: ví Trung của thợ săn NA khớp tổng rương đã đếm (±2)', Math.abs((fNA.stonesTrung || 0) - naT.trung) <= 2, `file=${fNA.stonesTrung} events=${naT.trung}`);
    ok('FILE: ví Thượng của thợ săn NA khớp tổng rương đã đếm (±2)', Math.abs((fNA.stonesThuong || 0) - naT.thuong) <= 2, `file=${fNA.stonesThuong} events=${naT.thuong}`);
    const fEX = saved['d367ex01'] || {};
    ok('FILE: ví nhân vật đổi/đi khớp kỳ vọng cuối (Hạ 20550 · Thượng 1298)', (fEX.stones || 0) === 20550 && (fEX.stonesThuong || 0) === 1298, JSON.stringify({ stones: fEX.stones, trung: fEX.stonesTrung, thuong: fEX.stonesThuong, cuc: fEX.stonesCuc }));
    const srvLog = fs.readFileSync(path.join(DIR, 'srv_367d.log'), 'utf8');
    ok('HỒI QUY: log server không có CRASH-GUARD', !srvLog.includes('CRASH-GUARD'), '');
  } catch (e) {
    fail++; console.log('CRASH | ' + (e && e.stack || e));
    try { await stopServer(); } catch (_) {}
  }
  console.log('KẾT QUẢ GĐ367d: ' + pass + ' PASS / ' + fail + ' FAIL');
  process.exit(fail ? 1 : 0);
})();
