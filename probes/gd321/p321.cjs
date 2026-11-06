// Probe GĐ321: Duyên Nợ xuyên kiếp + quái đặc biệt.
// Boot 1: cho ăn lỗi/cho ăn +15 trần ngày/tha mạng +300 (boss Huyết Sắc Rừng),
// giết trùm -400 (Tử Vong Mộ Địa), bị trùm hạ -50 (Vạn Thú Sơn Mạch),
// cảm ứng + kết lại NPC (850 -> 750), cảm ứng + kết lại người chơi 2 phía (650 -> 550),
// snapshot sổ hồn qua Hoán Vu. Boot 2: truy lùng ở -1000 (Lôi Đình Sơn Cốc).
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const net = require('net');
const ROOT = path.join(__dirname, '..', '..');
const PORT = 3551;
const DIR = __dirname;
const { io } = require(path.join(ROOT, 'client/node_modules/socket.io-client'));
const { createMerger } = require(path.join(ROOT, 'client/worldmerge.cjs'));

let pass = 0, fail = 0;
function ok(name, cond, extra) { if (cond) { pass++; console.log('PASS | ' + name); } else { fail++; console.log('FAIL | ' + name + (extra ? ' | ' + extra : '')); } }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function waitFor(fn, ms) { const t0 = Date.now(); while (Date.now() - t0 < ms) { const v = fn(); if (v) return v; await sleep(200); } return null; }
function portFree(port) { return new Promise((res) => { const s = net.createServer(); s.once('error', () => res(false)); s.listen(port, () => s.close(() => res(true))); }); }

let serverProc = null, killTimer = null;
async function startServer() {
  if (!(await portFree(PORT))) throw new Error('port ' + PORT + ' dang ban');
  serverProc = spawn('node', ['server/index.js'], { cwd: ROOT, env: { ...process.env, PORT: String(PORT), TTT_STORAGE: 'file', TTT_CHAR_FILE: path.join(DIR, 'characters.json'), TTT_ACC_FILE: path.join(DIR, 'accounts.json'), TTT_WORLD_FILE: path.join(DIR, 'world.json'), TTT_SESS_FILE: path.join(DIR, 'sessions.json'), TTT_DAY_REAL_MS: '600000', TTT_TUVI_NEED: '5' }, stdio: ['ignore', 'pipe', 'pipe'] });
  serverProc.stderr.on('data', (d) => process.stderr.write('[srv] ' + d));
  killTimer = setTimeout(() => { try { serverProc.kill('SIGKILL'); } catch (e) {} }, 60000);
  const t0 = Date.now();
  while (Date.now() - t0 < 45000) {
    try { const r = await fetch(`http://127.0.0.1:${PORT}/api/status`); if (r.ok) { clearTimeout(killTimer); return; } } catch (e) {}
    await sleep(500);
  }
  throw new Error('server khong len');
}
async function stopServer() {
  if (!serverProc) return;
  const p = serverProc; serverProc = null;
  await new Promise((res) => { const t = setTimeout(() => { try { p.kill('SIGKILL'); } catch (e) {} res(); }, 4000); p.once('exit', () => { clearTimeout(t); res(); }); try { p.kill('SIGTERM'); } catch (e) { clearTimeout(t); res(); } });
  const t0 = Date.now(); while (Date.now() - t0 < 10000 && !(await portFree(PORT))) await sleep(300);
}

function BASE(token, name, extra) {
  return Object.assign({
    token, name, classId: 'kiemtu', gender: 'nam', race: null, geo175: 1,
    realm: 'na', tier: 1, x: 1565, y: 1252, mapId: 'lang_tan_thu', hp: 99999,
    stats: { khiHuyet: 300, vatCong: 500, vatPhong: 200, phapCong: 100, phapPhong: 200, tocDo: 60, minhMan: 60 },
    statPoints: 0, freePoints: 0, tuVi: 0, stones: 100000, stonesTrung: 0, stonesThuong: 0, stonesCuc: 0,
    inventory: {}, gearBag: {}, equipped: [], skills: [], job: null, job2: null, job3: null,
    linhCan: { element: 'kim', grade: 'trung', mult: 1.2 }, affinity: {}, affV2: 1, bonds: {},
    quests: {}, questsDone: {}, flags: {}, counters: {}, disciples: [], foundInvites: [], reformIn: [],
  }, extra || {});
}
const FOODS = { thit_thu: 2, thit_nuong: 2, linh_thao: 2, tien_linh_chi: 2, thanh_thao: 2, xuong_thu: 2 };
const FOOD_NAME = { thit_thu: 'Thịt Thú', thit_nuong: 'Thịt Nướng', linh_thao: 'Linh Thảo', tien_linh_chi: 'Tiên Linh Chi', thanh_thao: 'Thánh Thảo', xuong_thu: 'Xương Thú' };
function likedFood(kind) { let h = 0; for (let i = 0; i < kind.length; i++) h = (h * 31 + kind.charCodeAt(i)) >>> 0; return ['thit_thu', 'thit_nuong', 'linh_thao', 'tien_linh_chi', 'thanh_thao', 'xuong_thu'][h % 6]; }

function writeChars(obj) { fs.writeFileSync(path.join(DIR, 'characters.json'), JSON.stringify(obj)); fs.writeFileSync(path.join(DIR, 'world.json'), JSON.stringify({ totalMinutes: 100 * 1440, savedAt: Date.now(), sects: [] })); }

const conns = [];
function connectChar(token) {
  return new Promise((resolve, reject) => {
    const socket = io(`http://127.0.0.1:${PORT}`, { transports: ['websocket'] });
    const ctx = { socket, token, syncs: [], notices: [], errors: [], died: [], welcome: null, merger: createMerger(), state: null };
    socket.on('connect', () => socket.emit('hello', { token }));
    socket.on('welcome', (w) => { ctx.welcome = w; });
    socket.on('char_sync', (c) => ctx.syncs.push(c));
    socket.on('notice', (n) => ctx.notices.push(n.text || ''));
    socket.on('interact_error', (e) => ctx.errors.push(e.message || ''));
    socket.on('character_died', (d) => ctx.died.push(d || {}));
    socket.on('server_tick', (t) => { const st = ctx.merger(t); if (st) ctx.state = st; });
    conns.push(ctx);
    const to = setTimeout(() => reject(new Error('connect timeout ' + token)), 20000);
    (async () => { const w = await waitFor(() => ctx.welcome, 18000); clearTimeout(to); if (w) resolve(ctx); else reject(new Error('no welcome ' + token)); })();
  });
}
const lastSync = (c) => c.syncs[c.syncs.length - 1];
const meOf = (c) => (c.state && c.state.players || []).find((p) => p.id === (c.welcome && c.welcome.id));
const mons = (c) => (c.state && c.state.monsters) || [];
const bossOf = (c) => { const sp = mons(c).filter((m) => m.sp === 1); if (!sp.length) return null; return sp.reduce((a, b) => ((b.maxHp || 0) > (a.maxHp || 0) ? b : a)); }; // merger khong giu field boss — chon con sp mau cao nhat
async function approach(c, id, tol) { // bay tới vị trí SỐNG của quái (nó đi lang thang — đọc lại mỗi vòng)
  for (let i = 0; i < 5; i++) {
    const m = mons(c).find((x) => x.id === id); const me = meOf(c);
    if (!m || !me) { await sleep(300); continue; }
    if (Math.hypot(m.x - me.x, m.y - me.y) <= (tol || 120)) return true;
    await flyTo(c, m.x, m.y, 60);
  }
  const m = mons(c).find((x) => x.id === id); const me = meOf(c);
  return !!(m && me && Math.hypot(m.x - me.x, m.y - me.y) <= 220);
}
function connectRaw(token) { // cho nhân vật đã chết: hello -> need_character, không có welcome
  return new Promise((resolve) => {
    const socket = io(`http://127.0.0.1:${PORT}`, { transports: ['websocket'] });
    const ctx = { socket, token, syncs: [], notices: [], errors: [], died: [], welcome: null, merger: createMerger(), state: null };
    socket.on('connect', () => socket.emit('hello', { token }));
    socket.on('welcome', (w) => { ctx.welcome = w; });
    socket.on('char_sync', (cx) => ctx.syncs.push(cx));
    socket.on('notice', (n) => ctx.notices.push(n.text || ''));
    socket.on('interact_error', (e) => ctx.errors.push(e.message || ''));
    socket.on('character_died', (d) => ctx.died.push(d || {}));
    socket.on('server_tick', (t) => { const st = ctx.merger(t); if (st) ctx.state = st; });
    conns.push(ctx);
    setTimeout(() => resolve(ctx), 1500);
  });
}
const bondScore = (c, key) => { const b = (lastSync(c)?.bonds || []).find((x) => x.key === key); return b ? b.score : null; };
async function stabilize(c) { // tick đầu có thể THIẾU quái (snapshot về từng phần) — chờ số quái ổn định 3 nhịp mới chọn trùm/loài
  let lastN = -1, stable = 0; const t0 = Date.now();
  while (Date.now() - t0 < 25000) { const n = mons(c).length; if (n === lastN && n > 0) { stable++; if (stable >= 3) return; } else stable = 0; lastN = n; await sleep(1000); }
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
  c.socket.emit('fly_toggle', {}); // hạ đất
  await sleep(400);
}
async function attackUntil(c, pred, ms) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) { if (pred()) return true; c.socket.emit('player_attack', {}); await sleep(900); }
  return pred();
}

(async () => {
  // ============ BOOT 1 ============
  writeChars({
    p321a10001: BASE('p321a10001', 'Tha Loi A1', { mapId: 'huyet_sac_rung', x: 4248, y: 6150 }),
    p321a20001: BASE('p321a20001', 'Tha Mang A2', { mapId: 'huyet_sac_rung', x: 4350, y: 6150, inventory: { ...FOODS } }),
    p321a30001: BASE('p321a30001', 'Giet Truc A3', { mapId: 'tu_vong_mo_dia', x: 500, y: 500 }),
    p321a40001: BASE('p321a40001', 'Danh Mem A2b', { mapId: 'huyet_sac_rung', x: 4350, y: 6050, stats: { khiHuyet: 300, vatCong: 40, vatPhong: 200, phapCong: 10, phapPhong: 200, tocDo: 60, minhMan: 60 } }),
    p321w00001: BASE('p321w00001', 'Yeu Sinh W', { realm: 'kd', mapId: 'van_thu_son_mach', x: 6600, y: 1400, stats: { khiHuyet: 20, vatCong: 50, vatPhong: 0, phapCong: 10, phapPhong: 0, tocDo: 60, minhMan: 30 } }), // spawn sat o trum Huyết Lang (6742,1387 do o probe debug)
    p321sc0001: BASE('p321sc0001', 'Trinh Sat SC', { realm: 'kd', mapId: 'loi_dinh_son_coc', x: 500, y: 500 }),
    p321p00001: BASE('p321p00001', 'Duyen Xua P', { realm: 'lk', x: 900, y: 1250, soul: { pastBonds: [{ key: 'n:npc_truonglang', kind: 'npc', name: 'Trưởng Làng', score: 850, branch: 'tinh' }] } }),
    p321q10001: BASE('p321q10001', 'Ket Lai Q1', { realm: 'lk', x: 1500, y: 1250, soul: { pastBonds: [{ key: 'p:p321q20001', kind: 'player', name: 'Ket Lai Q2', score: 650, branch: 'tinh' }] } }),
    p321q20001: BASE('p321q20001', 'Ket Lai Q2', { realm: 'lk', x: 1630, y: 1250, soul: { pastBonds: [{ key: 'p:p321q10001', kind: 'player', name: 'Ket Lai Q1', score: 650, branch: 'tinh' }] } }),
    p321s00001: BASE('p321s00001', 'So Hon S', { realm: 'lk', x: 1700, y: 1400, affinity: { npc_dan: 350 }, bonds: { 'p:p321q10001': { score: 400, branch: 'than', pick: null, gainDay: -1, gainAmt: 0, name: 'Ket Lai Q1' } }, soul: { hoanVu: { learned: true, lastUseYear: -99999 } } }),
  });
  await startServer();
  try {
    // --- Quái đặc biệt: cho ăn lỗi -> cho ăn -> tha mạng ---
    let A1 = await connectChar('p321a10001');
    const b1 = await waitFor(() => bossOf(A1), 15000);
    ok('M0 thay trum dac biet o Huyet Sac Rung (co co sp)', !!b1, 'mons=' + mons(A1).length);
    const kind1 = b1.kind; const food1 = likedFood(kind1);
    await approach(A1, b1.id, 120);
    A1.socket.emit('bond_feed', { monsterId: b1.id });
    const eFeed = await waitFor(() => A1.errors.find((e) => e.includes(FOOD_NAME[food1])), 6000);
    ok('M1 A1 khong co mon an -> loi goi y dung mon no thich (' + FOOD_NAME[food1] + ')', !!eFeed, A1.errors.join(' | '));

    let A2 = await connectChar('p321a20001');
    const b1b = bossOf(A2);
    await approach(A2, b1b.id, 120);
    A2.socket.emit('bond_feed', { monsterId: b1b.id });
    const fed = await waitFor(() => { const m = mons(A2).find((x) => x.id === b1b.id); return bondScore(A2, 'm:' + kind1) === 15 ? true : null; }, 8000);
    ok('M2 A2 cho an -> +15 thien cam (tran lap ngay)', !!fed, 'score=' + bondScore(A2, 'm:' + kind1));
    // A2b danh mem (cong 40) gon mau trum xuong <=10% — A2 danh manh se vuot cua chet
    let A2b = await connectChar('p321a40001');
    const b1c = bossOf(A2b);
    await approach(A2b, b1c.id, 70);
    const hurt = await attackUntil(A2b, () => { const m = mons(A2b).find((x) => x.id === b1c.id); return !m || m.hp <= m.maxHp * 0.1; }, 120000);
    const mNow = mons(A2).find((x) => x.id === b1b.id) || mons(A2b).find((x) => x.id === b1c.id);
    ok('M3 danh trum xuong duoi 10% mau (con song)', !!hurt && !!mNow, mNow ? ('hp=' + mNow.hp + '/' + mNow.maxHp) : 'trum bien mat');
    A2b.socket.disconnect();
    if (mNow) {
      await approach(A2, mNow.id, 120);
      A2.socket.emit('bond_spare', { monsterId: mNow.id });
      const spared = await waitFor(() => !mons(A2).find((x) => x.id === mNow.id) && bondScore(A2, 'm:' + kind1) === 315, 8000);
      ok('M4 THA MANG: trum rut lui, thien cam 15 + 300 = 315', !!spared, 'score=' + bondScore(A2, 'm:' + kind1) + ' conTrum=' + !!mons(A2).find((x) => x.id === mNow.id));
    }
    A1.socket.disconnect(); A2.socket.disconnect();

    // --- Giết trùm: -400 ---
    let A3 = await connectChar('p321a30001');
    const b2 = await waitFor(() => bossOf(A3), 15000);
    ok('K0 thay trum o Tu Vong Mo Dia', !!b2);
    const kind2 = b2.kind;
    await approach(A3, b2.id, 80);
    const killed = await attackUntil(A3, () => !mons(A3).find((x) => x.id === b2.id), 150000);
    ok('K1 ha guc trum', !!killed);
    const kScore = await waitFor(() => bondScore(A3, 'm:' + kind2) === -400, 8000);
    ok('K2 giet trum dac biet -> ket no -400', !!kScore, 'score=' + bondScore(A3, 'm:' + kind2));
    A3.socket.disconnect();

    // --- Bị trùm hạ gục: -50 ---
    let W = await connectChar('p321w00001');
    const b3 = await waitFor(() => bossOf(W), 15000);
    ok('D0 thay trum o Van Thu Son Mach', !!b3);
    const kind3 = b3.kind;
    await approach(W, b3.id, 60);
    const downedBond = await waitFor(() => bondScore(W, 'm:' + kind3) === -50, 45000);
    if (!downedBond) { // đọc thẳng file char (server đã persist lúc gục)
      await sleep(1500);
      let fb = null; try { const fc = JSON.parse(fs.readFileSync(path.join(DIR, 'characters.json'), 'utf8')); fb = (fc.p321w00001?.bonds || {})['m:' + kind3]; } catch (e) {}
      ok('D1 bi trum ha guc -> no -50 (doc file char)', !!fb && fb.score === -50, 'fileBond=' + JSON.stringify(fb));
    } else ok('D1 bi trum ha guc -> no -50', true);
    W.socket.disconnect();

    // --- Scout loài trùm Lôi Đình cho boot 2 ---
    let SC = await connectChar('p321sc0001');
    await stabilize(SC);
    const spList = mons(SC).filter((m) => m.sp === 1);
    const b4 = spList.find((m) => !m.rare) || spList[0] || null; // trùm map (không phải quái hiếm ngẫu nhiên — boot sau chắc chắn còn)
    const kind4 = b4 ? b4.kind : null;
    ok('H0 scout duoc loai trum Loi Dinh Son Coc', !!kind4, 'kind=' + kind4);
    SC.socket.disconnect();

    // --- Xuyên kiếp NPC ---
    let P = await connectChar('p321p00001');
    const sensed = await waitFor(() => (lastSync(P)?.pastBonds || []).find((e) => e.key === 'n:npc_truonglang' && e.sensed), 10000);
    ok('X1 dung gan Truong Lang -> CAM UNG (sensed)', !!sensed && P.notices.some((n) => n.includes('Ánh mắt này')), P.notices.join(' | '));
    P.socket.emit('bond_reform', { key: 'n:npc_truonglang' });
    const ref = await waitFor(() => (lastSync(P)?.affinity || {}).npc_truonglang === 750, 8000);
    const pBond = (lastSync(P)?.bonds || []).find((x) => x.key === 'n:npc_truonglang');
    ok('X2 ket lai NPC: Phu the 850 -> Hen ho giua bac 750, nhanh tinh giu', !!ref && !!pBond && pBond.branch === 'tinh', 'aff=' + (lastSync(P)?.affinity || {}).npc_truonglang + ' bond=' + JSON.stringify(pBond));
    ok('X3 so kiep truoc xoa muc da ket lai', ((lastSync(P)?.pastBonds || []).length === 0));
    P.socket.disconnect();

    // --- Xuyên kiếp người chơi 2 phía ---
    let Q1 = await connectChar('p321q10001');
    let Q2 = await connectChar('p321q20001');
    const qSensed = await waitFor(() => (lastSync(Q1)?.pastBonds || []).some((e) => e.sensed) && (lastSync(Q2)?.pastBonds || []).some((e) => e.sensed), 10000);
    ok('Q1 hai ben dung gan -> cung cam ung', !!qSensed);
    Q1.socket.emit('bond_reform', { key: 'p:p321q20001' });
    const reqIn = await waitFor(() => (lastSync(Q2)?.reformIn || []).some((r) => r.fromKey === 'p321q10001'), 8000);
    ok('Q2 Q1 gui loi ket lai -> Q2 nhan reformIn', !!reqIn, JSON.stringify(lastSync(Q2)?.reformIn || []));
    Q2.socket.emit('bond_reform_respond', { fromKey: 'p321q10001', accept: true });
    const qDone = await waitFor(() => bondScore(Q1, 'p:p321q20001') === 550 && bondScore(Q2, 'p:p321q10001') === 550, 8000);
    const q1b = (lastSync(Q1)?.bonds || []).find((x) => x.key === 'p:p321q20001');
    ok('Q3 ca hai dong y -> khoi phuc 650 -> 550 (Dong long), nhanh tinh', !!qDone && !!q1b && q1b.branch === 'tinh', 'Q1=' + bondScore(Q1, 'p:p321q20001') + ' Q2=' + bondScore(Q2, 'p:p321q10001'));
    ok('Q4 so kiep truoc hai ben deu xoa muc', (lastSync(Q1)?.pastBonds || []).length === 0 && (lastSync(Q2)?.pastBonds || []).length === 0);
    Q1.socket.disconnect(); Q2.socket.disconnect();

    // --- Snapshot lúc tọa hóa (Hoán Vu) ---
    let S = await connectChar('p321s00001');
    S.socket.emit('soul_use_hoanvu', {});
    const diedS = await waitFor(() => S.died.find((d) => d.raceChoice === true || d.raceChoice === undefined) || S.died.length, 10000);
    ok('S1 Hoan Vu -> toa hoa', !!diedS && S.died.length > 0, JSON.stringify(S.died));
    S.socket.disconnect();
    let S2 = await connectRaw('p321s00001');
    await sleep(600);
    S2.socket.emit('create_character', { token: 'p321s00001', name: 'So Hon S2', classId: 'kiemtu', gender: 'nam', robe: '#3a6ea5', weaponId: 'kiem', path: 'solo', race: 'nhan' });
    const wS = await waitFor(() => (S2.welcome?.character?.pastBonds ? S2.welcome.character : null), 12000);
    const pbs = (wS && wS.pastBonds) || [];
    ok('S2 so hon ghi 2 moi sau: nguoi choi 400 + NPC Dan 350', pbs.some((e) => e.key === 'p:p321q10001' && e.score === 400) && pbs.some((e) => e.key === 'n:npc_dan' && e.score === 350), JSON.stringify(pbs));
    S2.socket.disconnect();

    // ============ BOOT 2: truy lùng -1000 ============
    if (kind4) {
      for (const c of conns) { try { c.socket.disconnect(); } catch (e) {} }
      await stopServer();
      writeChars({
        p321h00001: BASE('p321h00001', 'Ke Thu H', { realm: 'kd', mapId: 'loi_dinh_son_coc', x: 500, y: 500, stats: { khiHuyet: 500, vatCong: 300, vatPhong: 300, phapCong: 100, phapPhong: 300, tocDo: 60, minhMan: 60 }, bonds: { ['m:' + kind4]: { score: -1000, branch: null, pick: null, gainDay: -1, gainAmt: 0, name: 'Trùm Lôi Đình' } } }),
      });
      await startServer();
      let H = await connectChar('p321h00001');
      await stabilize(H);
      const near1 = () => { const me = meOf(H); if (!me) return null; const cands = mons(H).filter((m) => m.sp === 1 && m.kind === kind4); if (!cands.length) return null; cands.sort((a, b) => Math.hypot(a.x - me.x, a.y - me.y) - Math.hypot(b.x - me.x, b.y - me.y)); return cands[0]; };
      const first = near1();
      ok('H1 thay ca the dac biet cua loai thu o Loi Dinh', !!first, first ? (first.kind + ' @' + Math.round(first.x) + ',' + Math.round(first.y)) : '');
      if (first) {
        // đậu cách nó 900px về phía bắc (ngoài tầm thù hận thường ~300-500) — nó phải TỰ truy lùng tới nơi
        await flyTo(H, first.x, Math.max(150, first.y - 900), 70);
        const tid = first.id;
        const mL = mons(H).find((x) => x.id === tid); const meL = meOf(H);
        const dStart = mL && meL ? Math.hypot(mL.x - meL.x, mL.y - meL.y) : -1;
        console.log('INFO | H dau cach trum: ' + Math.round(dStart));
        const hunt = await waitFor(() => { const m = mons(H).find((x) => x.id === tid); const me = meOf(H); if (!m || !me) return null; const d = Math.hypot(m.x - me.x, m.y - me.y); return d <= 250 ? d : null; }, 45000);
        ok('H2 no -1000: TRUY LUNG tu ~900px toi tan noi (<=250)', hunt !== null, 'dStart=' + Math.round(dStart));
      }
      H.socket.disconnect();
    } else ok('H2 bo qua truy lung (khong scout duoc loai)', false, 'kind4 null');
  } catch (e) {
    console.log('PROBE ERROR', e && e.stack || e);
    fail++;
  } finally {
    for (const c of conns) { try { c.socket.disconnect(); } catch (e) {} }
    await stopServer();
  }
  console.log(`\n== p321: ${pass} PASS, ${fail} FAIL ==`);
  process.exit(fail ? 1 : 0);
})();
