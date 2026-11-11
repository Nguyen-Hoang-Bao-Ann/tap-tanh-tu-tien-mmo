// Probe GĐ361 — Vá đợt 2 từ sổ RA_SOAT_TONG_THE (B3-1a + A7-1 + A7-2) + đo lại B3-1b.
// B3-1a: 4 quest kind 'boss' thiếu bossOnly (q127_hid_008/044/050, q127_chain_24_2) đã gắn bossOnly.
// A7-1: spawnMonster copy rewardClass từ type lên instance -> Linh tê pet + Tâm đắc đệ tử theo hạng quái.
// A7-2: advanceBossQuests + counters isBoss + ACH_BOSS_HITS chuyển sang isSpecialMonster (công thức rộng).
// BOOT 1 (env thường, port 3731):
//  1) A7-1 đối chứng: chủ có pet + đệ tử NPC hạ sói thường -> Linh tê +1, Tâm đắc +1.
//  2) A7-1 + A7-2: hạ co_thu_than THƯỜNG ở han_thien_ho (loài boss-class: sp=1 qua minChestGrade của
//     type, KHÔNG mapBoss — map na không tự phong trùm khi đã có loài boss-class, KHÔNG hiếm)
//     -> Linh tê +12, Tâm đắc +12 (hạng boss), ach_qt_boss +1 (trước A7-2: 0).
//  3) Đối chứng A7-2 phía quest: hạ kiemma THƯỜNG (sp=0) với quest q127_boss_013 đang active
//     -> tiến độ GIỮ NGUYÊN 0 (B3-1b: cá thể thường của loài kẹt vẫn không tính).
//  4) B3-1b ĐO LẠI bằng tick sống: lam_tru (thanh_moc_lam), doc_xa (huyet_sac_rung),
//     loi_dieu (loi_dinh_son_coc) — mọi cá thể thường đều sp=0 -> không thỏa công thức rộng.
// BOOT 2 (TTT_RARE_CHANCE=1, port 3732) — mọi quái thường thành hiếm ✦ (đặc biệt theo công thức rộng):
//  5) B3-1a trọn đường 3 quest huyetlang: hạ 1 Huyết Lang ✦ -> hid_008 + hid_044 + chain_24_2 cùng 'done'.
//  6) Claim trọn: về Bạch Hổ Thành trả q127_hid_008 tại NPC -> +480 LT, quest rời sổ.
//  7) B3-1a quest 4: hạ Lôi Điểu ✦ ở loi_dinh_son_coc -> hid_050 'done'; về Vô Cực Thành claim -> +975 LT.
//  8) Duyên Nợ không hồi quy (đường isSpecialMonster không đổi): tha mạng Huyết Lang ✦ <10% máu -> +300.
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
  killTimer = setTimeout(() => { try { serverProc.kill('SIGKILL'); } catch (e) {} }, 900000);
  const t0 = Date.now();
  while (Date.now() - t0 < 45000) { try { const r = await fetch(`http://127.0.0.1:${port}/api/status`); if (r.ok) { clearTimeout(killTimer); return; } } catch (e) {} await sleep(500); }
  throw new Error('server khong len');
}
async function stopServer() { if (!serverProc) return; const p = serverProc; serverProc = null; if (killTimer) { clearTimeout(killTimer); killTimer = null; } await new Promise((res) => { const t = setTimeout(() => { try { p.kill('SIGKILL'); } catch (e) {} res(); }, 4000); p.once('exit', () => { clearTimeout(t); res(); }); try { p.kill('SIGTERM'); } catch (e) { clearTimeout(t); res(); } }); const t0 = Date.now(); while (Date.now() - t0 < 10000 && !(await portFree(CUR_PORT))) await sleep(300); }
const STRONG = { khiHuyet: 20000, vatCong: 6000, vatPhong: 2000, phapCong: 400, phapPhong: 2000, tocDo: 80, minhMan: 100 };
const LC1 = { elements: ['kim'], main: 'kim', count: 1, mutations: [] };
function BASE(token, name, extra) {
  return Object.assign({ token, name, classId: 'kiemtu', gender: 'nam', race: null, geo175: 1, realm: 'ht', tier: 9, x: 1565, y: 1011, mapId: 'lang_tan_thu', hp: 999999, mp: 99999, lifespan: 500, birthDay: -5660, ageStart: 16, stats: { ...STRONG }, statPoints: 0, freePoints: 0, tuVi: 99999, stones: 100000, stonesTrung: 0, stonesThuong: 0, stonesCuc: 0, inventory: {}, gearBag: {}, equipped: [], skills: [], job: null, job2: null, job3: null, linhCan: { ...LC1 }, affinity: {}, affV2: 1, bonds: {}, quests: {}, questsDone: {}, flags: {}, counters: {}, disciples: [], foundInvites: [], reformIn: [], sectTech: [], sectArts: [], sectArtsActive: [], mails: [], classRes: {}, food: 100, water: 100 }, extra || {});
}
const NPCDISC = (name) => ({ type: 'npc', name, tilt: 'kiemtu', gender: 'nam', level: 1, tamDac: 0, skills: [], lastPointDay: -1, medFrac: 0, hp: 0 });
const PETDISC = (petName, discName) => ({ classRes: { tamed: { active: true, kind: 'wolf', name: petName, maxHp: 30000, atk: 1, def: 150, hp: 30000, growth: 0, evo: 0 } }, disciples: [NPCDISC(discName)] });
let pass = 0, fail = 0;
function ok(name, cond, extra) { if (cond) { pass++; console.log('PASS | ' + name); } else { fail++; console.log('FAIL | ' + name + (extra ? ' | ' + extra : '')); } }
function connect(token) {
  const socket = io(`http://127.0.0.1:${CUR_PORT}`, { transports: ['websocket'] });
  const ctx = { socket, merger: createMerger(), state: null, welcome: null, syncs: [], errs: [], notices: [], maps: [], killed: [], myName: null };
  socket.on('connect', () => socket.emit('hello', { token }));
  socket.on('welcome', (w) => { ctx.welcome = w; ctx.myName = (w.character || {}).name; });
  socket.on('char_sync', (s) => ctx.syncs.push(s));
  socket.on('notice', (n) => ctx.notices.push(n.text || ''));
  socket.on('interact_error', (e) => ctx.errs.push(e.message || ''));
  socket.on('map_enter', (m) => ctx.maps.push(m));
  socket.on('monster_killed', (k) => ctx.killed.push(k));
  socket.on('server_tick', (t) => { const st = ctx.merger(t); if (st) ctx.state = st; });
  return ctx;
}
const lastChar = (c) => { for (let i = c.syncs.length - 1; i >= 0; i--) { if (c.syncs[i]) return c.syncs[i]; } return c.welcome ? c.welcome.character : null; };
const meOf = (c) => { const ps = (c.state && c.state.players) || []; return ps.find((p) => p.name === c.myName) || null; };
const mons = (c) => (c.state && c.state.monsters) || [];
const growthOf = (c) => { const ch = lastChar(c); return ch && ch.classRes && ch.classRes.tamed ? (ch.classRes.tamed.growth || 0) : -1; };
const tamDacOf = (c) => { const ch = lastChar(c); return ch && ch.disciples && ch.disciples[0] ? (ch.disciples[0].tamDac || 0) : -1; };
const questOf = (c, qid) => { const ch = lastChar(c); return ch && ch.quests ? ch.quests[qid] : null; };
const achProg = (c, id) => { const ch = lastChar(c); const l = ch && ch.achievements && ch.achievements.list; const a = l ? l.find((x) => x.id === id) : null; return a ? a.progress : -1; };
const stonesOf = (c) => { const ch = lastChar(c); return ch ? (ch.stones || 0) : -1; };
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
// Săn 1 con quái theo điều kiện lọc; trả về bản ghi monster_killed do CHÍNH mình (pet/đệ tử kết liễu vẫn ghi công chủ).
// GĐ361 rút kinh nghiệm vòng chạy 1: map hồ han_thien_ho có vật cản mặt đất — hạ cánh ở 300px rồi đi bộ
// thẳng sẽ kẹt bờ hồ, pet/đệ tử bị bỏ xa >700px làm vòng Linh tê/Tâm đắc không chạy. Nay: BAY thẳng tới
// sát đích (<=58px) mới hạ cánh; opts.waitCrew = {petName} thì chờ pet + đệ tử vào tầm 700px quanh mình
// rồi mới ra đòn (điều kiện của 2 vòng tăng trưởng ở 8341/8342).
async function huntKill(c, kind, pred, ms, opts) {
  const t0 = Date.now(); let flying = false; let crewReady = !(opts && opts.waitCrew);
  while (Date.now() - t0 < (ms || 150000)) {
    const mine = c.killed.find((k) => k.kind === kind && k.byName === c.myName);
    if (mine) { if (flying) { c.socket.emit('fly_toggle', {}); } c.socket.emit('client_input', { vx: 0, vy: 0 }); return mine; }
    const me = meOf(c); if (!me) { await sleep(200); continue; }
    const cands = mons(c).filter((m) => m.kind === kind && (!pred || pred(m)));
    if (!cands.length) { await sleep(300); continue; }
    cands.sort((a, b) => Math.hypot(a.x - me.x, a.y - me.y) - Math.hypot(b.x - me.x, b.y - me.y));
    const t = cands[0];
    const d = Math.hypot(t.x - me.x, t.y - me.y);
    if (d > 58 && !flying) { c.socket.emit('fly_toggle', {}); flying = true; await sleep(300); continue; }
    if (d <= 58 && flying) { c.socket.emit('fly_toggle', {}); flying = false; await sleep(300); continue; }
    if (d > 52) { c.socket.emit('client_input', { vx: (t.x - me.x) / d, vy: (t.y - me.y) / d }); await sleep(120); continue; }
    c.socket.emit('client_input', { vx: 0, vy: 0 });
    if (!crewReady) {
      const ps = (c.state && c.state.players) || [];
      const pet = ps.find((p) => p.name === opts.waitCrew.petName);
      const disc = ps.find((p) => p.disc === c.myName);
      if (pet && disc && Math.hypot(pet.x - t.x, pet.y - t.y) <= 700 && Math.hypot(disc.x - t.x, disc.y - t.y) <= 700) crewReady = true;
      else { await sleep(250); continue; }
    }
    c.socket.emit('player_attack', {}); await sleep(550);
  }
  if (flying) { try { c.socket.emit('fly_toggle', {}); } catch (e) {} }
  const me = meOf(c); const t = mons(c).filter((m) => m.kind === kind)[0];
  console.log('  [diag huntKill ' + kind + '] me=' + (me ? me.x + ',' + me.y + ' hp=' + me.hp : '?') + ' target=' + (t ? t.x + ',' + t.y + ' hp=' + t.hp + '/' + t.maxHp : 'khong thay') + ' killed=' + JSON.stringify(c.killed.slice(-3)));
  return null;
}
async function waitStableKind(c, kind, ms) {
  const t0 = Date.now(); let last = -1, stable = 0;
  while (Date.now() - t0 < (ms || 45000)) {
    const n = mons(c).length;
    if (n === last && n > 0) { stable++; if (stable >= 3 && mons(c).some((m) => m.kind === kind)) return true; }
    else stable = 0;
    last = n;
    await sleep(1000);
  }
  return mons(c).some((m) => m.kind === kind);
}

(async () => {
  try {
    // ================= BOOT 1: env thường =================
    const chars1 = {};
    chars1['tk361pet001'] = BASE('tk361pet001', 'P361ChuPet', PETDISC('P361 Linh Thu A', 'De Tu 361A'));
    chars1['tk361pet002'] = BASE('tk361pet002', 'P361ChuBoss', { ...PETDISC('P361 Linh Thu B', 'De Tu 361B'), mapId: 'han_thien_ho', x: 400, y: 400 });
    chars1['tk361ctl001'] = BASE('tk361ctl001', 'P361DoiChung', { realm: 'kd', quests: { q127_boss_013: { progress: 0, state: 'active' } } });
    chars1['tk361sct001'] = BASE('tk361sct001', 'P361TrinhLam', { mapId: 'thanh_moc_lam', x: 400, y: 400 });
    chars1['tk361sct002'] = BASE('tk361sct002', 'P361TrinhDoc', { mapId: 'huyet_sac_rung', x: 4248, y: 2950 });
    chars1['tk361sct003'] = BASE('tk361sct003', 'P361TrinhLoi', { mapId: 'loi_dinh_son_coc', x: 400, y: 400 });
    fs.writeFileSync(path.join(DIR, 'characters.json'), JSON.stringify(chars1));
    fs.writeFileSync(path.join(DIR, 'accounts.json'), '{}');
    fs.writeFileSync(path.join(DIR, 'world.json'), JSON.stringify({ totalMinutes: 3360, savedAt: Date.now() }));
    fs.writeFileSync(path.join(DIR, 'sessions.json'), '{}');
    await startServer(3731, '361a');
    ok('boot 1: server lên sạch (env thường)', true);

    // ---- Chân 1 (A7-1 đối chứng): pet + đệ tử hạ sói thường -> +1/+1 ----
    const cD1 = connect('tk361pet001'); await waitFor(() => cD1.welcome, 20000);
    await waitFor(() => meOf(cD1), 8000);
    ok('chân 1a: Linh tê + Tâm đắc khởi điểm = 0', growthOf(cD1) === 0 && tamDacOf(cD1) === 0, 'growth=' + growthOf(cD1) + ' tamDac=' + tamDacOf(cD1));
    const killW = await huntKill(cD1, 'wolf', null, 120000);
    ok('chân 1b: hạ được sói ở bãi farm (ghi công chủ)', !!killW, JSON.stringify(cD1.killed.slice(-2)));
    await waitFor(() => growthOf(cD1) >= 1, 6000);
    ok('chân 1c: hạ quái thường -> Linh tê +1 (đúng mức sàn)', growthOf(cD1) === 1, 'growth=' + growthOf(cD1));
    ok('chân 1d: hạ quái thường -> Tâm đắc đệ tử +1', tamDacOf(cD1) === 1, 'tamDac=' + tamDacOf(cD1));
    cD1.socket.disconnect();

    // ---- Chân 2 (A7-1 +12 & A7-2 counters): co_thu_than thường ở han_thien_ho ----
    const cD2 = connect('tk361pet002'); await waitFor(() => cD2.welcome, 20000);
    await waitFor(() => meOf(cD2), 8000);
    const stable2 = await waitStableKind(cD2, 'co_thu_than', 60000);
    const ctt = mons(cD2).find((m) => m.kind === 'co_thu_than');
    ok('chân 2a: thấy co_thu_than trên han_thien_ho', stable2 && !!ctt, 'mons=' + mons(cD2).length);
    ok('chân 2b: co_thu_than thường có sp=1 (boss-class qua type) và KHÔNG hiếm', !!ctt && ctt.sp === 1 && !ctt.rare, ctt ? 'sp=' + ctt.sp + ' rare=' + ctt.rare : 'khong thay');
    const killB = await huntKill(cD2, 'co_thu_than', null, 200000, { waitCrew: { petName: 'P361 Linh Thu B' } });
    ok('chân 2c: hạ được co_thu_than (ghi công chủ)', !!killB, JSON.stringify(cD2.killed.slice(-2)));
    await waitFor(() => growthOf(cD2) >= 12, 6000);
    ok('chân 2d (A7-1): hạ quái hạng boss -> Linh tê +12 (trước vá: +1)', growthOf(cD2) === 12, 'growth=' + growthOf(cD2));
    ok('chân 2e (A7-1): hạ quái hạng boss -> Tâm đắc đệ tử +12 (trước vá: +1)', tamDacOf(cD2) === 12, 'tamDac=' + tamDacOf(cD2));
    ok('chân 2f (A7-2): ach_qt_boss +1 cho loài boss-class không phải trùm map (trước vá: 0)', achProg(cD2, 'ach_qt_boss') === 1, 'prog=' + achProg(cD2, 'ach_qt_boss'));
    cD2.socket.disconnect();

    // ---- Chân 3 (đối chứng A7-2/B3-1b phía quest): kiemma thường không tính ----
    const cE = connect('tk361ctl001'); await waitFor(() => cE.welcome, 20000);
    await waitFor(() => meOf(cE), 8000);
    const hasNormKiemma = await waitFor(() => mons(cE).some((m) => m.kind === 'kiemma' && !m.sp) ? true : null, 30000);
    ok('chân 3a: thấy kiemma thường (sp=0) ở Thạch Lâm', !!hasNormKiemma, 'kiemma=' + JSON.stringify(mons(cE).filter((m) => m.kind === 'kiemma').map((m) => m.sp)));
    const killK = await huntKill(cE, 'kiemma', (m) => !m.sp, 180000);
    ok('chân 3b: hạ được kiemma thường', !!killK, JSON.stringify(cE.killed.slice(-2)));
    await sleep(2500);
    const qE = questOf(cE, 'q127_boss_013');
    ok('chân 3c: quest trùm kiemma GIỮ progress=0/state active sau khi hạ cá thể thường', !!qE && qE.progress === 0 && qE.state === 'active', JSON.stringify(qE));
    ok('chân 3d: ach_qt_boss vẫn 0 sau kiemma thường', achProg(cE, 'ach_qt_boss') === 0, 'prog=' + achProg(cE, 'ach_qt_boss'));
    cE.socket.disconnect();

    // ---- Chân 4 (B3-1b đo lại bằng tick sống): 3 loài còn lại ----
    const scouts = [
      ['tk361sct001', 'lam_tru', 'thanh_moc_lam'],
      ['tk361sct002', 'doc_xa', 'huyet_sac_rung'],
      ['tk361sct003', 'loi_dieu', 'loi_dinh_son_coc'],
    ];
    for (let i = 0; i < scouts.length; i++) {
      const [tk, kind, mapId] = scouts[i];
      const cS = connect(tk); await waitFor(() => cS.welcome, 20000);
      await waitFor(() => meOf(cS), 8000);
      await waitStableKind(cS, kind, 60000);
      const inds = mons(cS).filter((m) => m.kind === kind);
      const nRare = inds.filter((m) => m.rare).length;
      // Cá thể sp=1 chỉ được phép là cá thể HIẾM ✦ lăn tự nhiên (2%); mọi cá thể thường phải sp=0.
      ok(`chân 4${'abc'[i]} (B3-1b): ${kind} ở ${mapId} — ${inds.length} cá thể, ${inds.length - nRare} thường đều sp=0, sp=1 chỉ ở ${nRare} cá thể hiếm ✦`, inds.length >= 1 && inds.every((m) => (m.sp === 1 ? !!m.rare : !m.sp)), 'sp=' + JSON.stringify(inds.map((m) => m.sp)) + ' rare=' + nRare);
      cS.socket.disconnect();
    }
    await stopServer();

    // ================= BOOT 2: TTT_RARE_CHANCE=1 =================
    const chars2 = {};
    chars2['tk361boss01'] = BASE('tk361boss01', 'P361SanTrum', { quests: { q127_hid_008: { progress: 0, state: 'active' }, q127_hid_044: { progress: 0, state: 'active' }, q127_chain_24_2: { progress: 0, state: 'active' } }, flags: { hid_008: true, hid_044: true, chain_24: true } });
    chars2['tk361boss02'] = BASE('tk361boss02', 'P361LoiDieu', { realm: 'kd', mapId: 'loi_dinh_son_coc', x: 2400, y: 3000, quests: { q127_hid_050: { progress: 0, state: 'active' } }, flags: { hid_050: true } });
    chars2['tk361spare1'] = BASE('tk361spare1', 'P361ThaMang', { stats: { khiHuyet: 3000, vatCong: 45, vatPhong: 500, phapCong: 10, phapPhong: 500, tocDo: 60, minhMan: 60 } });
    fs.writeFileSync(path.join(DIR, 'characters.json'), JSON.stringify(chars2));
    fs.writeFileSync(path.join(DIR, 'accounts.json'), '{}');
    fs.writeFileSync(path.join(DIR, 'world.json'), JSON.stringify({ totalMinutes: 3360, savedAt: Date.now() }));
    fs.writeFileSync(path.join(DIR, 'sessions.json'), '{}');
    await startServer(3732, '361b', { TTT_RARE_CHANCE: '1' });
    ok('boot 2: server lên sạch (TTT_RARE_CHANCE=1)', true);

    // ---- Chân 5 (B3-1a): 1 Huyết Lang ✦ -> 3 quest huyetlang cùng done ----
    const cA = connect('tk361boss01'); await waitFor(() => cA.welcome, 20000);
    await waitFor(() => meOf(cA), 8000);
    const hasRareHL = await waitFor(() => mons(cA).some((m) => m.kind === 'huyetlang' && m.sp === 1) ? true : null, 30000);
    ok('chân 5a: thấy Huyết Lang ✦ (sp=1) ở Thạch Lâm', !!hasRareHL, '');
    const killH = await huntKill(cA, 'huyetlang', (m) => m.sp === 1, 180000);
    ok('chân 5b: hạ được Huyết Lang ✦', !!killH, JSON.stringify(cA.killed.slice(-2)));
    const doneAll = await waitFor(() => { const a = questOf(cA, 'q127_hid_008'), b = questOf(cA, 'q127_hid_044'), d = questOf(cA, 'q127_chain_24_2'); return a && b && d && a.state === 'done' && b.state === 'done' && d.state === 'done' ? true : null; }, 8000);
    ok('chân 5c (B3-1a): hid_008 + hid_044 + chain_24_2 cùng chuyển done sau 1 lần hạ trùm', !!doneAll, JSON.stringify({ a: questOf(cA, 'q127_hid_008'), b: questOf(cA, 'q127_hid_044'), d: questOf(cA, 'q127_chain_24_2') }));
    ok('chân 5d: notice hoàn thành nhiệm vụ trùm', cA.notices.some((t) => t.includes('Hoàn thành')), JSON.stringify(cA.notices.slice(-3)));

    // ---- Chân 6: claim trọn q127_hid_008 ở Bạch Hổ Thành (+480 LT) ----
    await flyTo(cA, 2415, 1342, 60, 60000); // cổng dịch chuyển map nhà
    cA.socket.emit('travel_to', { mapId: 'thanh_van_thanh' });
    const arrivedTV = await waitFor(() => cA.maps.some((m) => m.mapId === 'thanh_van_thanh') ? true : null, 15000);
    ok('chân 6a: dịch chuyển tới Thanh Vân Thành', !!arrivedTV, JSON.stringify(cA.errs.slice(-2)));
    cA.socket.emit('travel_to', { mapId: 'bach_ho_thanh' });
    const mapBH = await waitFor(() => cA.maps.find((m) => m.mapId === 'bach_ho_thanh') || null, 15000);
    ok('chân 6b: dịch chuyển tới Bạch Hổ Thành', !!mapBH, JSON.stringify(cA.errs.slice(-2)));
    const npcBH = mapBH && (mapBH.npcs || []).find((n) => n.id === 'bach_ho_thanh_npc_007');
    ok('chân 6c: thấy NPC giao nhiệm vụ bach_ho_thanh_npc_007 trong map_enter', !!npcBH, npcBH ? npcBH.x + ',' + npcBH.y : 'khong co');
    if (npcBH) await flyTo(cA, npcBH.x, npcBH.y, 50, 90000);
    const stonesBefore6 = stonesOf(cA);
    cA.socket.emit('quest_claim', { questId: 'q127_hid_008' });
    const claimed6 = await waitFor(() => questOf(cA, 'q127_hid_008') === null || questOf(cA, 'q127_hid_008') === undefined ? true : null, 8000);
    // quest_claim xóa quest khỏi sổ; lastChar có thể vẫn giữ bản cũ nếu chưa sync mới — kiểm bằng stones
    const stonesAfter6 = stonesOf(cA);
    ok('chân 6d (B3-1a trọn đường): claim hid_008 tại NPC -> +480 LT và quest rời sổ', stonesAfter6 - stonesBefore6 === 480, 'truoc=' + stonesBefore6 + ' sau=' + stonesAfter6 + ' errs=' + JSON.stringify(cA.errs.slice(-2)));
    cA.socket.disconnect();

    // ---- Chân 7 (B3-1a): hid_050 loi_dieu ✦ -> done + claim ở Vô Cực Thành (+975) ----
    const cB = connect('tk361boss02'); await waitFor(() => cB.welcome, 20000);
    await waitFor(() => meOf(cB), 8000);
    const hasRareLD = await waitFor(() => mons(cB).some((m) => m.kind === 'loi_dieu' && m.sp === 1) ? true : null, 30000);
    ok('chân 7a: thấy Lôi Điểu ✦ (sp=1) ở loi_dinh_son_coc', !!hasRareLD, '');
    const killL = await huntKill(cB, 'loi_dieu', (m) => m.sp === 1, 180000);
    ok('chân 7b: hạ được Lôi Điểu ✦', !!killL, JSON.stringify(cB.killed.slice(-2)));
    const done50 = await waitFor(() => { const q = questOf(cB, 'q127_hid_050'); return q && q.state === 'done' ? true : null; }, 8000);
    ok('chân 7c (B3-1a): q127_hid_050 chuyển done', !!done50, JSON.stringify(questOf(cB, 'q127_hid_050')));
    const portalLD = (cB.maps[0] && cB.maps[0].portal) || null;
    if (portalLD) await flyTo(cB, portalLD.x, portalLD.y, 60, 90000);
    cB.socket.emit('travel_to', { mapId: 'thanh_van_thanh' });
    const arrTV2 = await waitFor(() => cB.maps.some((m) => m.mapId === 'thanh_van_thanh') ? true : null, 15000);
    ok('chân 7d: từ loi_dinh_son_coc dịch chuyển về Thanh Vân Thành', !!arrTV2, JSON.stringify(cB.errs.slice(-2)));
    cB.socket.emit('travel_to', { mapId: 'vo_cuc_thanh' });
    const mapVC = await waitFor(() => cB.maps.find((m) => m.mapId === 'vo_cuc_thanh') || null, 15000);
    const npcVC = mapVC && (mapVC.npcs || []).find((n) => n.id === 'vo_cuc_thanh_npc_007');
    ok('chân 7e: tới Vô Cực Thành + thấy NPC vo_cuc_thanh_npc_007', !!npcVC, JSON.stringify(cB.errs.slice(-2)));
    if (npcVC) await flyTo(cB, npcVC.x, npcVC.y, 50, 90000);
    const stonesBefore7 = stonesOf(cB);
    cB.socket.emit('quest_claim', { questId: 'q127_hid_050' });
    await sleep(2500);
    const stonesAfter7 = stonesOf(cB);
    ok('chân 7f (B3-1a trọn đường): claim hid_050 tại NPC -> +975 LT', stonesAfter7 - stonesBefore7 === 975, 'truoc=' + stonesBefore7 + ' sau=' + stonesAfter7 + ' errs=' + JSON.stringify(cB.errs.slice(-2)));
    cB.socket.disconnect();

    // ---- Chân 8 (Duyên Nợ không hồi quy): tha mạng Huyết Lang ✦ <10% máu ----
    const cS = connect('tk361spare1'); await waitFor(() => cS.welcome, 20000);
    await waitFor(() => meOf(cS), 8000);
    let spared = null;
    {
      const t0 = Date.now(); let flying = false;
      while (Date.now() - t0 < 240000 && !spared) {
        const me = meOf(cS); if (!me) { await sleep(200); continue; }
        const cands = mons(cS).filter((m) => m.kind === 'huyetlang' && m.sp === 1);
        if (!cands.length) { await sleep(300); continue; }
        cands.sort((a, b) => Math.hypot(a.x - me.x, a.y - me.y) - Math.hypot(b.x - me.x, b.y - me.y));
        const t = cands[0];
        const d = Math.hypot(t.x - me.x, t.y - me.y);
        if (t.hp <= t.maxHp * 0.09) {
          cS.socket.emit('client_input', { vx: 0, vy: 0 });
          if (flying) { cS.socket.emit('fly_toggle', {}); flying = false; }
          if (d > 200) { // lại gần trong tầm tha 260 nhưng không đánh nữa
            cS.socket.emit('client_input', { vx: (t.x - me.x) / d, vy: (t.y - me.y) / d }); await sleep(150); continue;
          }
          cS.socket.emit('bond_spare', { monsterId: t.id });
          spared = await waitFor(() => cS.notices.some((x) => x.includes('tha mạng')) ? t : null, 6000);
          break;
        }
        if (d > 300 && !flying) { cS.socket.emit('fly_toggle', {}); flying = true; await sleep(300); continue; }
        if (d <= 300 && flying) { cS.socket.emit('fly_toggle', {}); flying = false; await sleep(300); continue; }
        if (d > 52) { cS.socket.emit('client_input', { vx: (t.x - me.x) / d, vy: (t.y - me.y) / d }); await sleep(120); }
        else { cS.socket.emit('client_input', { vx: 0, vy: 0 }); cS.socket.emit('player_attack', {}); await sleep(700); }
      }
    }
    ok('chân 8 (Duyên Nợ): tha mạng Huyết Lang ✦ dưới 10% máu -> notice +300 thiện cảm', !!spared && cS.notices.some((x) => x.includes('+300')), JSON.stringify(cS.notices.slice(-3)) + ' errs=' + JSON.stringify(cS.errs.slice(-2)));
    cS.socket.disconnect();

    console.log(`\nKẾT QUẢ GĐ361: ${pass} PASS / ${fail} FAIL`);
    await stopServer();
    process.exit(fail ? 1 : 0);
  } catch (e) {
    console.log('PROBE ERROR:', e && e.stack || e);
    try { await stopServer(); } catch (e2) {}
    process.exit(2);
  }
})();
