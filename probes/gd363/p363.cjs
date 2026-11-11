// Probe GĐ363 — B3-1b: sinh bản TRÙM RIÊNG cho 4 loài (Bảo chốt hướng 08/11/2026).
// Vá: MAP_BOSSES nối tay thêm lam_tru@thanh_moc_lam, doc_xa@huyet_sac_rung,
// loi_dieu@loi_dinh_son_coc (trùm THÊM — trùm auto cũ giữ nguyên) + kiemma &
// huyetlang @HOME_MAP (Thạch Lâm); spawnMonster nhánh map nhà nhận opts.mapBoss;
// ALTAR_BOSSES lọc entry map nhà (đàn tế giữ nguyên phạm vi cũ).
// Cơ chế trùm map hiện hành (đã đọc code): cờ mapBoss — KHÔNG nhân chỉ số
// (máu/công = số gốc của loài), rương chắc chắn phẩm >= B + đá Cực + Ngọc Giản
// 25%, hồi sinh 600s giữ số theo MAP_BOSSES, thanh máu trùm (cờ tick boss/sp).
// Baseline trước vá (log gd362): 42 entry MAP_BOSSES, tổng 2925 quái.
// Kỳ vọng sau vá: 47 entry, tổng 2930 quái (+5).
// Chân kiểm (1 boot, env thường, port 3743):
//  0) Boot log + /api/status: 47 entry trùm, tổng quái 2930.
//  1) Thạch Lâm: kiemma + huyetlang mỗi loài đúng 1 cá thể sp=1 KHÔNG hiếm (bản
//     trùm mới); khoiloi (trùm cũ) vẫn sp=1; cá thể thường sp=0. Ghi maxHp.
//  2) Duyên Nợ: cho bản trùm Kiếm Ma ăn Thanh Thảo (món ưa thích tất định theo
//     loài) -> notice +25 thiện cảm (hệ quái đặc biệt nhận diện trùm mới).
//  3) Đối chứng: hạ kiemma THƯỜNG với quest boss_013 active -> progress GIỮ 0.
//  4) Hạ bản trùm kiemma -> boss_013 done (ghi mốc T0 cho chân hồi sinh).
//  5) Hạ bản trùm huyetlang -> hid_008 done.
//  6) Trọn đường claim boss_013 tại tien_gioi_cac_npc_007 -> +975 LT.
//  7) thanh_moc_lam: lam_tru đúng 1 bản trùm (maxHp 90); trùm cũ sam_lam_cu_mang
//     còn nguyên 1 bản; đàn tế vẫn gọi Sâm Lâm Cự Mãng; hạ trùm lam_tru ->
//     adv_san_trum_3 done.
//  8) huyet_sac_rung: doc_xa đúng 1 bản trùm (maxHp 55), thường sp=0; trùm cũ
//     huyetlang của map còn nguyên; hạ trùm doc_xa -> boss_008 progress = 1/2.
//  9) loi_dinh_son_coc: loi_dieu đúng 1 bản trùm (maxHp 300); trùm cũ
//     huyen_anh_mieu còn nguyên; hạ trùm loi_dieu -> hid_050 done -> claim
//     tại vo_cuc_thanh_npc_007 -> +975 LT (trọn đường quest thứ 2).
// 10) Hồi sinh: sau T0 + 600s, bản trùm kiemma xuất hiện lại đúng 1 cá thể.
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
  killTimer = setTimeout(() => { try { serverProc.kill('SIGKILL'); } catch (e) {} }, 1800000);
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
let pass = 0, fail = 0;
function ok(name, cond, extra) { if (cond) { pass++; console.log('PASS | ' + name); } else { fail++; console.log('FAIL | ' + name + (extra ? ' | ' + extra : '')); } }
function connect(token) {
  const socket = io(`http://127.0.0.1:${CUR_PORT}`, { transports: ['websocket'] });
  const ctx = { socket, merger: createMerger(), state: null, welcome: null, syncs: [], errs: [], notices: [], maps: [], killed: [], altars: [], myName: null };
  socket.on('connect', () => socket.emit('hello', { token }));
  socket.on('welcome', (w) => { ctx.welcome = w; ctx.myName = (w.character || {}).name; });
  socket.on('char_sync', (s) => ctx.syncs.push(s));
  socket.on('notice', (n) => ctx.notices.push(n.text || ''));
  socket.on('interact_error', (e) => ctx.errs.push(e.message || ''));
  socket.on('map_enter', (m) => ctx.maps.push(m));
  socket.on('monster_killed', (k) => ctx.killed.push(k));
  socket.on('altar_info', (a) => ctx.altars.push(a));
  socket.on('server_tick', (t) => { const st = ctx.merger(t); if (st) ctx.state = st; });
  return ctx;
}
const lastChar = (c) => { for (let i = c.syncs.length - 1; i >= 0; i--) { if (c.syncs[i]) return c.syncs[i]; } return c.welcome ? c.welcome.character : null; };
const meOf = (c) => { const ps = (c.state && c.state.players) || []; return ps.find((p) => p.name === c.myName) || null; };
const mons = (c) => (c.state && c.state.monsters) || [];
const questOf = (c, qid) => { const ch = lastChar(c); return ch && ch.quests ? ch.quests[qid] : null; };
const stonesOf = (c) => { const ch = lastChar(c); return ch ? (ch.stones || 0) : -1; };
const isBossInd = (m) => m.sp === 1 && !m.rare; // cá thể đặc biệt KHÔNG phải hiếm ✦ -> với 5 loài đích (type không minChestGrade) chính là bản mapBoss
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
// Săn ĐÚNG 1 cá thể theo pred (theo id): bay tới sát mới hạ cánh, đánh tới khi
// monster_killed ghi đúng id đó và công của mình. Đòn thường trúng quái gần
// nhất nên nếu cá thể khác chết thay, vòng lặp săn tiếp cá thể đích.
async function huntByPred(c, kind, pred, ms) {
  const t0 = Date.now(); let flying = false; let targetId = null;
  while (Date.now() - t0 < (ms || 180000)) {
    if (targetId && c.killed.some((k) => k.monsterId === targetId && k.byName === c.myName)) { if (flying) c.socket.emit('fly_toggle', {}); c.socket.emit('client_input', { vx: 0, vy: 0 }); return targetId; }
    const me = meOf(c); if (!me) { await sleep(200); continue; }
    const cands = mons(c).filter((m) => m.kind === kind && pred(m));
    if (!cands.length) { targetId = null; await sleep(300); continue; }
    cands.sort((a, b) => Math.hypot(a.x - me.x, a.y - me.y) - Math.hypot(b.x - me.x, b.y - me.y));
    const t = cands[0]; targetId = t.id;
    const d = Math.hypot(t.x - me.x, t.y - me.y);
    if (d > 58 && !flying) { c.socket.emit('fly_toggle', {}); flying = true; await sleep(300); continue; }
    if (d <= 58 && flying) { c.socket.emit('fly_toggle', {}); flying = false; await sleep(300); continue; }
    if (d > 52) { c.socket.emit('client_input', { vx: (t.x - me.x) / d, vy: (t.y - me.y) / d }); await sleep(120); continue; }
    c.socket.emit('client_input', { vx: 0, vy: 0 });
    c.socket.emit('player_attack', {}); await sleep(550);
  }
  if (flying) { try { c.socket.emit('fly_toggle', {}); } catch (e) {} }
  const me = meOf(c); const t = mons(c).filter((m) => m.kind === kind && pred(m))[0];
  console.log('  [diag hunt ' + kind + '] me=' + (me ? me.x + ',' + me.y + ' hp=' + me.hp : '?') + ' target=' + (t ? t.id + ' ' + t.x + ',' + t.y + ' hp=' + t.hp + '/' + t.maxHp : 'khong thay') + ' killed=' + JSON.stringify(c.killed.slice(-3)));
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
    const chars = {};
    chars['tk363scout1'] = BASE('tk363scout1', 'P363TrinhNha', { inventory: { thanh_thao: 5 } });
    chars['tk363main01'] = BASE('tk363main01', 'P363SanKiem', { realm: 'tn', quests: { q127_boss_013: { progress: 0, state: 'active' }, q127_hid_008: { progress: 0, state: 'active' } }, flags: { hid_008: true } });
    chars['tk363lam001'] = BASE('tk363lam001', 'P363SanLam', { mapId: 'thanh_moc_lam', x: 400, y: 400, quests: { q127_adv_san_trum_3: { progress: 0, state: 'active' } }, flags: { adv_san_trum_t2: true } });
    chars['tk363doc001'] = BASE('tk363doc001', 'P363SanDoc', { mapId: 'huyet_sac_rung', x: 4248, y: 2950, quests: { q127_boss_008: { progress: 0, state: 'active' } } });
    chars['tk363loi001'] = BASE('tk363loi001', 'P363SanLoi', { realm: 'kd', mapId: 'loi_dinh_son_coc', x: 2400, y: 3000, quests: { q127_hid_050: { progress: 0, state: 'active' } }, flags: { hid_050: true } });
    fs.writeFileSync(path.join(DIR, 'characters.json'), JSON.stringify(chars));
    fs.writeFileSync(path.join(DIR, 'accounts.json'), '{}');
    fs.writeFileSync(path.join(DIR, 'world.json'), JSON.stringify({ totalMinutes: 3360, savedAt: Date.now() }));
    fs.writeFileSync(path.join(DIR, 'sessions.json'), '{}');
    await startServer(3743, '363a');

    // ---- Chân 0: boot log + /api/status ----
    const bootLog = fs.readFileSync(path.join(DIR, 'srv_363a.log'), 'utf8');
    const spawnLine = bootLog.split('\n').find((l) => l.includes('Đã sinh quái')) || '';
    ok('chân 0a: boot log — 47 entry trùm, tổng 2930 quái (trước vá 42/2925)', spawnLine.includes('47 map có trùm') && spawnLine.includes('tổng 2930 quái'), spawnLine.trim());
    const st0 = await (await fetch(`http://127.0.0.1:${CUR_PORT}/api/status`)).json();
    ok('chân 0b: /api/status monsters = 2930 (+5 bản trùm mới)', st0.monsters === 2930, 'monsters=' + st0.monsters);

    // ---- Chân 1: Thạch Lâm — bản trùm kiemma + huyetlang, trùm cũ khoiloi ----
    const cS = connect('tk363scout1'); await waitFor(() => cS.welcome, 20000);
    await waitFor(() => meOf(cS), 8000);
    await waitStableKind(cS, 'kiemma', 60000);
    const km = mons(cS).filter((m) => m.kind === 'kiemma');
    const kmBoss = km.filter(isBossInd);
    ok('chân 1a: Thạch Lâm có đúng 1 bản trùm Kiếm Ma (sp=1, không hiếm)', kmBoss.length === 1, 'tong kiemma=' + km.length + ' sp=' + JSON.stringify(km.map((m) => [m.sp, !!m.rare, m.maxHp])));
    ok('chân 1b: bản trùm Kiếm Ma maxHp = 420 (số gốc loài — cơ chế trùm map không nhân chỉ số)', kmBoss.length === 1 && kmBoss[0].maxHp === 420, kmBoss.length ? 'maxHp=' + kmBoss[0].maxHp : 'khong thay');
    const hl = mons(cS).filter((m) => m.kind === 'huyetlang');
    const hlBoss = hl.filter(isBossInd);
    ok('chân 1c: Thạch Lâm có đúng 1 bản trùm Huyết Lang (sp=1, không hiếm), maxHp = 350', hlBoss.length === 1 && hlBoss[0].maxHp === 350, 'tong huyetlang=' + hl.length + ' sp=' + JSON.stringify(hl.map((m) => [m.sp, !!m.rare, m.maxHp])));
    const kl = mons(cS).filter((m) => m.kind === 'khoiloi');
    ok('chân 1d: trùm cũ Thạch Khôi Lỗi vẫn còn (sp=1)', kl.length >= 1 && kl.some(isBossInd), 'khoiloi=' + JSON.stringify(kl.map((m) => [m.sp, m.maxHp])));
    ok('chân 1e: cá thể thường kiemma/huyetlang vẫn sp=0 (trừ cá thể hiếm ✦ tự nhiên)', km.filter((m) => !isBossInd(m)).every((m) => m.sp === 0 || !!m.rare) && hl.filter((m) => !isBossInd(m)).every((m) => m.sp === 0 || !!m.rare), '');

    // ---- Chân 2: Duyên Nợ — cho bản trùm Kiếm Ma ăn món ưa thích (thanh_thao) ----
    let fed = null;
    {
      const t0 = Date.now();
      while (Date.now() - t0 < 90000 && !fed) {
        const boss = mons(cS).find((m) => m.kind === 'kiemma' && isBossInd(m));
        const me = meOf(cS);
        if (!boss || !me) { await sleep(300); continue; }
        const d = Math.hypot(boss.x - me.x, boss.y - me.y);
        if (d > 200) { await flyTo(cS, boss.x, boss.y, 150, 30000); continue; }
        cS.socket.emit('bond_feed', { monsterId: boss.id });
        fed = await waitFor(() => cS.notices.some((x) => x.includes('+25')) ? boss : null, 5000);
        if (!fed) await sleep(500);
      }
    }
    ok('chân 2 (Duyên Nợ): cho bản trùm Kiếm Ma ăn -> +25 thiện cảm (quái đặc biệt nhận diện trùm mới)', !!fed && cS.notices.some((x) => x.includes('tha') === false && x.includes('+25')), JSON.stringify(cS.notices.slice(-3)) + ' errs=' + JSON.stringify(cS.errs.slice(-2)));
    cS.socket.disconnect();

    // ---- Chân 3+4+5: đối chứng thường -> hạ trùm kiemma (T0) -> hạ trùm huyetlang ----
    const cA = connect('tk363main01'); await waitFor(() => cA.welcome, 20000);
    await waitFor(() => meOf(cA), 8000);
    const killedNorm = await huntByPred(cA, 'kiemma', (m) => !m.sp, 180000);
    ok('chân 3a: hạ được kiemma thường', !!killedNorm, JSON.stringify(cA.killed.slice(-2)));
    await sleep(2500);
    const qCtl = questOf(cA, 'q127_boss_013');
    ok('chân 3b (đối chứng): quest trùm kiemma GIỮ progress=0 sau khi hạ cá thể thường', !!qCtl && qCtl.progress === 0 && qCtl.state === 'active', JSON.stringify(qCtl));
    const killedBossKm = await huntByPred(cA, 'kiemma', isBossInd, 180000);
    const T0 = Date.now();
    ok('chân 4a: hạ được bản trùm Kiếm Ma ở Thạch Lâm', !!killedBossKm, JSON.stringify(cA.killed.slice(-2)));
    const doneKm = await waitFor(() => { const q = questOf(cA, 'q127_boss_013'); return q && q.state === 'done' ? true : null; }, 8000);
    ok('chân 4b: q127_boss_013 chuyển done sau khi hạ bản trùm', !!doneKm, JSON.stringify(questOf(cA, 'q127_boss_013')));
    const killedBossHl = await huntByPred(cA, 'huyetlang', isBossInd, 180000);
    ok('chân 5a: hạ được bản trùm Huyết Lang ở Thạch Lâm', !!killedBossHl, JSON.stringify(cA.killed.slice(-2)));
    const doneHl = await waitFor(() => { const q = questOf(cA, 'q127_hid_008'); return q && q.state === 'done' ? true : null; }, 8000);
    ok('chân 5b: q127_hid_008 chuyển done (3 quest huyetlang cùng hồ sơ nay đi đường trùm Thạch Lâm)', !!doneHl, JSON.stringify(questOf(cA, 'q127_hid_008')));

    // ---- Chân 6: claim trọn boss_013 ở Tiên Giới Các (+975) ----
    await flyTo(cA, 2415, 1342, 60, 60000);
    cA.socket.emit('travel_to', { mapId: 'thanh_van_thanh' });
    const arrTV = await waitFor(() => cA.maps.some((m) => m.mapId === 'thanh_van_thanh') ? true : null, 15000);
    ok('chân 6a: dịch chuyển tới Thanh Vân Thành', !!arrTV, JSON.stringify(cA.errs.slice(-2)));
    cA.socket.emit('travel_to', { mapId: 'tien_gioi_cac' });
    const mapTG = await waitFor(() => cA.maps.find((m) => m.mapId === 'tien_gioi_cac') || null, 15000);
    const npcTG = mapTG && (mapTG.npcs || []).find((n) => n.id === 'tien_gioi_cac_npc_007');
    ok('chân 6b: tới Tiên Giới Các + thấy NPC tien_gioi_cac_npc_007', !!npcTG, JSON.stringify(cA.errs.slice(-2)));
    if (npcTG) await flyTo(cA, npcTG.x, npcTG.y, 50, 90000);
    const stonesB6 = stonesOf(cA);
    cA.socket.emit('quest_claim', { questId: 'q127_boss_013' });
    await sleep(2500);
    const stonesA6 = stonesOf(cA);
    ok('chân 6c (trọn đường): claim q127_boss_013 -> +975 LT', stonesA6 - stonesB6 === 975, 'truoc=' + stonesB6 + ' sau=' + stonesA6 + ' errs=' + JSON.stringify(cA.errs.slice(-2)));
    cA.socket.disconnect();

    // ---- Chân 7: thanh_moc_lam — trùm lam_tru mới + trùm cũ + đàn tế ----
    const cL = connect('tk363lam001'); await waitFor(() => cL.welcome, 20000);
    await waitFor(() => meOf(cL), 8000);
    await waitStableKind(cL, 'lam_tru', 60000);
    const lt = mons(cL).filter((m) => m.kind === 'lam_tru');
    const ltBoss = lt.filter(isBossInd);
    ok('chân 7a: thanh_moc_lam có đúng 1 bản trùm Lâm Trư (maxHp 90)', ltBoss.length === 1 && ltBoss[0].maxHp === 90, 'tong lam_tru=' + lt.length + ' sp=' + JSON.stringify(lt.map((m) => [m.sp, !!m.rare, m.maxHp])));
    const slcm = mons(cL).filter((m) => m.kind === 'sam_lam_cu_mang');
    ok('chân 7b: trùm cũ Sâm Lâm Cự Mãng còn nguyên đúng 1 bản (sp=1, không hiếm)', slcm.filter(isBossInd).length === 1, 'tong=' + slcm.length + ' sp=' + JSON.stringify(slcm.map((m) => [m.sp, !!m.rare])));
    const portalL = (cL.maps[0] && cL.maps[0].portal) || null;
    if (portalL) await flyTo(cL, portalL.x, portalL.y - 160, 60, 60000);
    cL.socket.emit('altar_info', {});
    const altarL = await waitFor(() => cL.altars.find((a) => a.mapId === 'thanh_moc_lam') || null, 8000);
    ok('chân 7c: đàn tế thanh_moc_lam vẫn gọi trùm cũ Sâm Lâm Cự Mãng (không đổi chủ)', !!altarL && altarL.bossName === 'Sâm Lâm Cự Mãng' && altarL.bossCount === 1, JSON.stringify(altarL) + ' errs=' + JSON.stringify(cL.errs.slice(-2)));
    const killedLt = await huntByPred(cL, 'lam_tru', isBossInd, 180000);
    ok('chân 7d: hạ được bản trùm Lâm Trư', !!killedLt, JSON.stringify(cL.killed.slice(-2)));
    const doneLt = await waitFor(() => { const q = questOf(cL, 'q127_adv_san_trum_3'); return q && q.state === 'done' ? true : null; }, 8000);
    ok('chân 7e: q127_adv_san_trum_3 done (thang Săn Trùm cấp 3 mở đường thường)', !!doneLt, JSON.stringify(questOf(cL, 'q127_adv_san_trum_3')));
    cL.socket.disconnect();

    // ---- Chân 8: huyet_sac_rung — trùm doc_xa mới + trùm cũ huyetlang của map ----
    const cD = connect('tk363doc001'); await waitFor(() => cD.welcome, 20000);
    await waitFor(() => meOf(cD), 8000);
    await waitStableKind(cD, 'doc_xa', 60000);
    const dx = mons(cD).filter((m) => m.kind === 'doc_xa');
    const dxBoss = dx.filter(isBossInd);
    ok('chân 8a: huyet_sac_rung có đúng 1 bản trùm Độc Xà (maxHp 55), cá thể thường sp=0', dxBoss.length === 1 && dxBoss[0].maxHp === 55 && dx.filter((m) => !isBossInd(m)).every((m) => m.sp === 0 || !!m.rare), 'tong doc_xa=' + dx.length + ' sp1nonRare=' + dxBoss.length);
    const hlMap = mons(cD).filter((m) => m.kind === 'huyetlang');
    ok('chân 8b: trùm cũ của huyet_sac_rung (Huyết Lang) còn nguyên đúng 1 bản', hlMap.filter(isBossInd).length === 1, 'tong huyetlang=' + hlMap.length + ' sp=' + JSON.stringify(hlMap.map((m) => [m.sp, !!m.rare])));
    const killedDx = await huntByPred(cD, 'doc_xa', isBossInd, 240000);
    ok('chân 8c: hạ được bản trùm Độc Xà', !!killedDx, JSON.stringify(cD.killed.slice(-2)));
    const progDx = await waitFor(() => { const q = questOf(cD, 'q127_boss_008'); return q && q.progress === 1 ? true : null; }, 8000);
    const qDx = questOf(cD, 'q127_boss_008');
    ok('chân 8d: q127_boss_008 progress = 1/2 sau 1 lần hạ bản trùm (target 2)', !!progDx && qDx.state === 'active', JSON.stringify(qDx));
    cD.socket.disconnect();

    // ---- Chân 9: loi_dinh_son_coc — trùm loi_dieu mới + trùm cũ + claim trọn ----
    const cLo = connect('tk363loi001'); await waitFor(() => cLo.welcome, 20000);
    await waitFor(() => meOf(cLo), 8000);
    await waitStableKind(cLo, 'loi_dieu', 60000);
    const ld = mons(cLo).filter((m) => m.kind === 'loi_dieu');
    const ldBoss = ld.filter(isBossInd);
    ok('chân 9a: loi_dinh_son_coc có đúng 1 bản trùm Lôi Điểu (maxHp 300)', ldBoss.length === 1 && ldBoss[0].maxHp === 300, 'tong loi_dieu=' + ld.length + ' sp=' + JSON.stringify(ld.map((m) => [m.sp, !!m.rare, m.maxHp])));
    const ham = mons(cLo).filter((m) => m.kind === 'huyen_anh_mieu');
    ok('chân 9b: trùm cũ Huyễn Ảnh Miêu còn nguyên đúng 1 bản', ham.filter(isBossInd).length === 1, 'tong=' + ham.length);
    const killedLd = await huntByPred(cLo, 'loi_dieu', isBossInd, 240000);
    ok('chân 9c: hạ được bản trùm Lôi Điểu', !!killedLd, JSON.stringify(cLo.killed.slice(-2)));
    const doneLd = await waitFor(() => { const q = questOf(cLo, 'q127_hid_050'); return q && q.state === 'done' ? true : null; }, 8000);
    ok('chân 9d: q127_hid_050 chuyển done', !!doneLd, JSON.stringify(questOf(cLo, 'q127_hid_050')));
    const portalLo = (cLo.maps[0] && cLo.maps[0].portal) || null;
    if (portalLo) await flyTo(cLo, portalLo.x, portalLo.y, 60, 90000);
    cLo.socket.emit('travel_to', { mapId: 'thanh_van_thanh' });
    const arrTV9 = await waitFor(() => cLo.maps.some((m) => m.mapId === 'thanh_van_thanh') ? true : null, 15000);
    ok('chân 9e: từ loi_dinh_son_coc dịch chuyển về Thanh Vân Thành', !!arrTV9, JSON.stringify(cLo.errs.slice(-2)));
    cLo.socket.emit('travel_to', { mapId: 'vo_cuc_thanh' });
    const mapVC = await waitFor(() => cLo.maps.find((m) => m.mapId === 'vo_cuc_thanh') || null, 15000);
    const npcVC = mapVC && (mapVC.npcs || []).find((n) => n.id === 'vo_cuc_thanh_npc_007');
    ok('chân 9f: tới Vô Cực Thành + thấy NPC vo_cuc_thanh_npc_007', !!npcVC, JSON.stringify(cLo.errs.slice(-2)));
    if (npcVC) await flyTo(cLo, npcVC.x, npcVC.y, 50, 90000);
    const stonesB9 = stonesOf(cLo);
    cLo.socket.emit('quest_claim', { questId: 'q127_hid_050' });
    await sleep(2500);
    const stonesA9 = stonesOf(cLo);
    ok('chân 9g (trọn đường): claim q127_hid_050 -> +975 LT', stonesA9 - stonesB9 === 975, 'truoc=' + stonesB9 + ' sau=' + stonesA9 + ' errs=' + JSON.stringify(cLo.errs.slice(-2)));
    cLo.socket.disconnect();

    // ---- Chân 10: hồi sinh bản trùm kiemma sau 600s kể từ T0 ----
    const remainMs = T0 + 600000 + 30000 - Date.now();
    console.log('  [respawn] chờ thêm ' + Math.max(0, Math.round(remainMs / 1000)) + 's tới mốc T0+630s');
    const cR = connect('tk363scout1'); await waitFor(() => cR.welcome, 20000);
    await waitFor(() => meOf(cR), 8000);
    const respawned = await waitFor(() => { const b = mons(cR).filter((m) => m.kind === 'kiemma' && isBossInd(m)); return b.length === 1 ? b[0] : null; }, Math.max(60000, remainMs + 120000));
    ok('chân 10: bản trùm Kiếm Ma hồi sinh sau ~600s, vẫn đúng 1 cá thể (sp=1, không hiếm)', !!respawned, 'kiemma sp=' + JSON.stringify(mons(cR).filter((m) => m.kind === 'kiemma').map((m) => [m.sp, !!m.rare])));
    cR.socket.disconnect();

    console.log(`\nKẾT QUẢ GĐ363: ${pass} PASS / ${fail} FAIL`);
    await stopServer();
    process.exit(fail ? 1 : 0);
  } catch (e) {
    console.log('PROBE ERROR:', e && e.stack || e);
    try { await stopServer(); } catch (e2) {}
    process.exit(2);
  }
})();
