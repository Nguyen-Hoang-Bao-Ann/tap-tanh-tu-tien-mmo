// Probe GĐ342 — THIÊN PHÚ ĐỢT 3: 15 thiên phú ẩn Đỏ/Đen/Hư (mở theo bậc ach_an_secret của hồn).
// S1 (3623, ngày): cổng mở theo secretChains 0/1/2/3 ở bước tạo + bốc bù; roll bị chặn khi chưa mở; bốc lại vào bậc ẩn; hồi quy GĐ337.
// S4 (3626): khởi động lại trên cùng file S1 — thiên phú ẩn bền qua restart.
// S2 (3624, ngày): đo hiệu ứng + GIÁ từng thiên phú (đòn thường/cast_result.dmg tất định; mẫu thống kê cho xác suất).
// S3 (3625, đêm 20:00): Dạ Hành ban đêm (đối chứng ban ngày ở S2).
// S5 (3627): Thiên Cơ Mông Lung — mẫu nhỏ nhiều nhân vật (mỗi nhân vật 1 lần đột phá Đại, trialReady tiêu theo lần).
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
async function startServer(port, tag, startMin) {
  CUR_PORT = port;
  if (!(await portFree(port))) throw new Error('port ban ' + port);
  const env = { ...process.env, PORT: String(port), TTT_STORAGE: 'file', TTT_CHAR_FILE: path.join(DIR, 'characters.json'), TTT_ACC_FILE: path.join(DIR, 'accounts.json'), TTT_WORLD_FILE: path.join(DIR, 'world.json'), TTT_SESS_FILE: path.join(DIR, 'sessions.json'), TTT_DAY_REAL_MS: '600000', TTT_TUVI_NEED: '5' };
  if (startMin != null) env.TTT_WORLD_START_MINUTES = String(startMin);
  serverProc = spawn('node', ['server/index.js'], { cwd: ROOT, env, stdio: ['ignore', 'pipe', 'pipe'] });
  serverProc.stderr.on('data', (d) => { try { fs.appendFileSync(path.join(DIR, 'srv_' + tag + '.log'), d); } catch (e) {} });
  serverProc.stdout.on('data', (d) => { try { fs.appendFileSync(path.join(DIR, 'srv_' + tag + '.log'), d); } catch (e) {} });
  killTimer = setTimeout(() => { try { serverProc.kill('SIGKILL'); } catch (e) {} }, 240000);
  const t0 = Date.now();
  while (Date.now() - t0 < 45000) { try { const r = await fetch(`http://127.0.0.1:${port}/api/status`); if (r.ok) { clearTimeout(killTimer); return; } } catch (e) {} await sleep(500); }
  throw new Error('server khong len');
}
async function stopServer() { if (!serverProc) return; const p = serverProc; serverProc = null; await new Promise((res) => { const t = setTimeout(() => { try { p.kill('SIGKILL'); } catch (e) {} res(); }, 4000); p.once('exit', () => { clearTimeout(t); res(); }); try { p.kill('SIGTERM'); } catch (e) { clearTimeout(t); res(); } }); const t0 = Date.now(); while (Date.now() - t0 < 10000 && !(await portFree(CUR_PORT))) await sleep(300); }
const STATS = { khiHuyet: 500, vatCong: 100, vatPhong: 100, phapCong: 100, phapPhong: 100, tocDo: 60, minhMan: 100 };
const LC1 = { elements: ['kim'], main: 'kim', count: 1, mutations: [] };
function BASE(token, name, extra) {
  return Object.assign({ token, name, classId: 'kiemtu', gender: 'nam', race: null, geo175: 1, realm: 'kd', tier: 1, x: 4248, y: 2950, mapId: 'huyet_sac_rung', hp: 99999, lifespan: 500, birthDay: -5660, ageStart: 16, stats: { ...STATS }, statPoints: 0, freePoints: 0, tuVi: 0, stones: 0, stonesTrung: 0, stonesThuong: 0, stonesCuc: 0, inventory: {}, gearBag: {}, equipped: [], skills: [], job: null, job2: null, job3: null, linhCan: { ...LC1 }, affinity: {}, affV2: 1, bonds: {}, quests: {}, questsDone: {}, flags: {}, counters: {}, disciples: [], foundInvites: [], reformIn: [], sectTech: [], sectArts: [], sectArtsActive: [], mails: [], classRes: {}, food: 100, water: 100 }, extra || {});
}
function DEAD(token, name, chains, extra) {
  return BASE(token, name, Object.assign({ dead: true, deadAt: '2026-11-07T00:00:00.000Z', soul: { lives: 2, fullLives: 1, consumed: false }, counters: { ach_secretChains: chains }, achState: { tiers: {}, title: null, daoTich: 0, notified: {} } }, extra || {}));
}
let pass = 0, fail = 0;
function ok(name, cond, extra) { if (cond) { pass++; console.log('PASS | ' + name); } else { fail++; console.log('FAIL | ' + name + (extra ? ' | ' + extra : '')); } }
function note(name, extra) { console.log('NOTE | ' + name + (extra ? ' | ' + extra : '')); }
function connect(token) {
  const socket = io(`http://127.0.0.1:${CUR_PORT}`, { transports: ['websocket'] });
  const ctx = { socket, merger: createMerger(), state: null, welcome: null, needChar: false, createErr: null, tstate: [], catalog: null, notices: [], casts: [], sync: null, brkFail: [], brkOk: false, downed: false, died: false, errors: [] };
  socket.on('connect', () => socket.emit('hello', { token }));
  socket.on('welcome', (w) => { ctx.welcome = w; ctx.myName = (w.character || {}).name; });
  socket.on('need_character', () => { ctx.needChar = true; });
  socket.on('create_error', (e) => { ctx.createErr = e.message; });
  socket.on('talent_catalog', (c) => { ctx.catalog = c; });
  socket.on('talent_state', (s) => ctx.tstate.push(s));
  socket.on('notice', (n) => ctx.notices.push(n.text || ''));
  socket.on('cast_result', (r) => ctx.casts.push(r));
  socket.on('char_sync', (sy) => { ctx.sync = sy; });
  socket.on('server_tick', (t) => { const st = ctx.merger(t); if (st) ctx.state = st; });
  socket.on('breakthrough_fail', (r) => ctx.brkFail.push(r));
  socket.on('breakthrough_ok', () => { ctx.brkOk = true; });
  socket.on('player_downed', () => { ctx.downed = true; });
  socket.on('character_died', () => { ctx.died = true; });
  socket.on('interact_error', (e) => ctx.errors.push(e.message || ''));
  return ctx;
}
const lastPend = (c) => { const s = c.tstate[c.tstate.length - 1]; return s ? s.pending : null; };
function waitTalent(c, pred, ms) { return waitFor(() => { for (let i = c.tstate.length - 1; i >= 0; i--) { if (pred(c.tstate[i])) return c.tstate[i]; } return null; }, ms || 6000); }
function writeChars(chars, acc) {
  fs.writeFileSync(path.join(DIR, 'characters.json'), JSON.stringify(chars, null, 1));
  fs.writeFileSync(path.join(DIR, 'accounts.json'), JSON.stringify(acc || {}, null, 1));
  for (const f of ['world.json', 'sessions.json']) { try { fs.unlinkSync(path.join(DIR, f)); } catch (e) {} }
}
const meOf = (c) => (c.state?.players || []).find((p) => p.name === c.myName) || null;
const monsOf = (c) => c.state?.monsters || [];
const myChar = (c) => (c.sync && c.sync.character) || (c.welcome && c.welcome.character) || {};
async function waitStableMons(c, ms) { // chờ số quái ổn định 3 nhịp (bài học probe: tick đầu snapshot về từng phần)
  let last = -1, stable = 0; const t0 = Date.now();
  while (Date.now() - t0 < (ms || 20000)) { const n = monsOf(c).length; if (n > 0 && n === last) { stable++; if (stable >= 3) return n; } else stable = 0; last = n; await sleep(400); }
  return last;
}
async function flyTo(c, x, y, tol) {
  if (!c.flying) { c.socket.emit('fly_toggle', {}); c.flying = true; await sleep(350); }
  const t0 = Date.now();
  while (Date.now() - t0 < 30000) { const me = meOf(c); if (!me) { await sleep(120); continue; } const dx = x - me.x, dy = y - me.y; const d = Math.hypot(dx, dy); if (d <= (tol || 45)) break; c.socket.emit('client_input', { vx: dx / d, vy: dy / d }); await sleep(110); }
  c.socket.emit('client_input', { vx: 0, vy: 0 });
}
async function land(c) { if (c.flying) { c.socket.emit('fly_toggle', {}); c.flying = false; await sleep(450); } }
async function firstHitDrop(c, kind) { // đòn thường đầu tiên lên 1 con nguyên vẹn của loài kind; trả về máu rơi (0 = không đo được)
  const me = meOf(c); if (!me) return 0;
  const ws = monsOf(c).filter((m) => m.kind === kind && m.hp >= (m.maxHp || 9999) - 1).sort((a, b) => Math.hypot(a.x - me.x, a.y - me.y) - Math.hypot(b.x - me.x, b.y - me.y));
  const w = ws[0]; if (!w) return 0;
  for (let t = 0; t < 5; t++) {
    const live = monsOf(c).find((m) => m.id === w.id); if (!live) return 0;
    await flyTo(c, live.x, live.y, 30); await land(c);
    const before = (monsOf(c).find((m) => m.id === w.id) || {}).hp;
    if (before == null) return 0;
    c.socket.emit('player_attack'); await sleep(650);
    const after = (monsOf(c).find((m) => m.id === w.id) || {}).hp;
    if (after == null) return before;
    if (after < before) return before - after;
  }
  return 0;
}
async function castAt(c, slot, kind, tol) { // bay tới 1 con nguyên vẹn loài kind, tung chiêu ở slot; trả cast_result (kèm kind đích thật)
  const me = meOf(c); if (!me) return null;
  const ws = monsOf(c).filter((m) => m.kind === kind && m.hp >= (m.maxHp || 9999) - 1).sort((a, b) => Math.hypot(a.x - me.x, a.y - me.y) - Math.hypot(b.x - me.x, b.y - me.y));
  const w = ws[0]; if (!w) return null;
  await flyTo(c, w.x, w.y, tol || 100);
  const castAtIdx = c.casts.length;
  c.socket.emit('cast_skill', { slot });
  let res = await waitFor(() => c.casts.length > castAtIdx && c.casts[c.casts.length - 1], 3500);
  if (!res || !res.ok) { await land(c); const i2 = c.casts.length; c.socket.emit('cast_skill', { slot }); res = await waitFor(() => c.casts.length > i2 && c.casts[c.casts.length - 1], 3500); }
  if (!res || !res.ok) return null;
  const tm = monsOf(c).find((m) => m.id === res.targetId);
  return { res, kind: tm ? tm.kind : null, targetId: res.targetId };
}
const median = (a) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : 0; };
const HIDDEN_IDS = ['huyet_dung', 'huyet_kiem_tam', 'viem_huyet', 'bat_diet', 'huyet_anh_bo', 'am_hon_an', 'huyet_te', 'da_hanh', 'tham_tuong', 'ma_tam_tran', 'hu_khong_bo', 'thoi_gian_lech', 'hu_anh', 'thien_co', 'hu_kiem_y'];

(async () => {
  // ================= S1 (3623): CỔNG MỞ BẬC ẨN + LUỒNG TẠO/BỐC BÙ/BỐC LẠI =================
  {
    const chars = {};
    chars['tk342c00'] = DEAD('tk342c00', 'C0S342', 0);
    chars['tk342c01'] = DEAD('tk342c01', 'C1S342', 1);
    chars['tk342c02'] = DEAD('tk342c02', 'C2S342', 2);
    chars['tk342c03'] = DEAD('tk342c03', 'C3S342', 3);
    chars['tk342c03r'] = DEAD('tk342c03r', 'C3RS342', 3, { achState: { tiers: {}, title: null, daoTich: 120, notified: {} } });
    chars['tk342pln'] = BASE('tk342pln', 'PlS342', { dead: true, deadAt: '2026-11-07T00:00:00.000Z', soul: { lives: 2, fullLives: 1, consumed: false } });
    chars['tk342m02'] = BASE('tk342m02', 'M2S342', { counters: { ach_secretChains: 2 } });
    chars['tk342m00'] = BASE('tk342m00', 'M0S342', { counters: { ach_secretChains: 0 } });
    writeChars(chars);
    await startServer(3623, '342a', 600);
    // --- chains 0: catalog sạch ẩn; roll bậc ẩn bị chặn; luồng thường vẫn chạy
    const c0 = connect('tk342c00'); await sleep(600); c0.socket.emit('talent_catalog_get');
    await waitFor(() => c0.catalog, 6000);
    const tiers0 = (c0.catalog.tiers || []).map((t) => t.id);
    ok('S1.1 chains=0: catalog chỉ có 6 bậc thường', JSON.stringify(tiers0) === JSON.stringify(['vo', 'bach', 'luc', 'lam', 'tim', 'cam']), tiers0.join(','));
    ok('S1.2 chains=0: danh sách 33 thiên phú thường, KHÔNG có thiên phú ẩn nào', c0.catalog.list.length === 33 && !c0.catalog.list.some((t) => HIDDEN_IDS.includes(t.id)), 'list=' + c0.catalog.list.length);
    for (const t of ['do', 'den', 'hu']) { const idx = c0.tstate.length; c0.socket.emit('talent_roll', { tier: t }); await sleep(700); const p = lastPend(c0); ok('S1.3 chains=0: roll bậc ' + t + ' bị server chặn (không có kết quả)', !p || !p.result, JSON.stringify(p)); }
    c0.socket.emit('talent_roll', { tier: 'luc' });
    const st0 = await waitTalent(c0, (s) => s.pending && s.pending.result && s.pending.tier === 'luc');
    ok('S1.4 chains=0: roll Lục vẫn chạy (hồi quy GĐ337)', !!st0, '');
    c0.socket.emit('talent_keep', {}); await sleep(300);
    c0.socket.emit('create_character', { name: 'C0S342', classId: 'kiemtu' });
    await waitFor(() => c0.welcome, 8000);
    ok('S1.5 chains=0: tạo nhân vật xong, thiên phú thuộc bậc thường', !!c0.welcome && !!c0.welcome.character.talent && c0.welcome.character.talent.tier === 'luc', JSON.stringify(c0.welcome && c0.welcome.character.talent));
    c0.socket.disconnect();
    // --- chains 1: + Đỏ
    const c1 = connect('tk342c01'); await sleep(600); c1.socket.emit('talent_catalog_get');
    await waitFor(() => c1.catalog, 6000);
    const tiers1 = (c1.catalog.tiers || []).map((t) => t.id);
    ok('S1.6 chains=1: catalog có thêm bậc Đỏ, chưa có Đen/Hư', tiers1.includes('do') && !tiers1.includes('den') && !tiers1.includes('hu'), tiers1.join(','));
    ok('S1.7 chains=1: danh sách có 5 thiên phú Đỏ, không có Đen/Hư', c1.catalog.list.filter((t) => t.tier === 'do').length === 5 && !c1.catalog.list.some((t) => t.tier === 'den' || t.tier === 'hu'), '');
    c1.socket.emit('talent_roll', { tier: 'do' });
    const st1 = await waitTalent(c1, (s) => s.pending && s.pending.result && s.pending.tier === 'do');
    ok('S1.8 chains=1: roll Đỏ ra thiên phú Đỏ (1 lượt, tự chốt)', !!st1 && HIDDEN_IDS.slice(0, 5).includes(st1.pending.result) && st1.pending.locked === true, JSON.stringify(st1 && st1.pending));
    c1.socket.emit('create_character', { name: 'C1S342', classId: 'thetu' });
    await waitFor(() => c1.welcome, 8000);
    ok('S1.9 chains=1: nhân vật mới mang thiên phú bậc Đỏ', !!c1.welcome && c1.welcome.character.talent && c1.welcome.character.talent.tier === 'do', JSON.stringify(c1.welcome && c1.welcome.character.talent));
    c1.socket.disconnect();
    // --- chains 2: + Đen (có GIÁ trong catalog)
    const c2 = connect('tk342c02'); await sleep(600); c2.socket.emit('talent_catalog_get');
    await waitFor(() => c2.catalog, 6000);
    const tiers2 = (c2.catalog.tiers || []).map((t) => t.id);
    const denList = c2.catalog.list.filter((t) => t.tier === 'den');
    ok('S1.10 chains=2: catalog có Đỏ+Đen, chưa có Hư', tiers2.includes('do') && tiers2.includes('den') && !tiers2.includes('hu'), tiers2.join(','));
    ok('S1.11 chains=2: 5 thiên phú Đen đều mang trường GIÁ (cost); thiên phú Đỏ cost trống', denList.length === 5 && denList.every((t) => !!t.cost) && c2.catalog.list.filter((t) => t.tier === 'do').every((t) => !t.cost), JSON.stringify(denList.map((t) => t.cost)));
    c2.socket.emit('talent_roll', { tier: 'hu' }); await sleep(700);
    ok('S1.12 chains=2: roll Hư (chưa mở) bị chặn', !lastPend(c2) || !lastPend(c2).result, JSON.stringify(lastPend(c2)));
    c2.socket.emit('talent_roll', { tier: 'den' });
    const st2 = await waitTalent(c2, (s) => s.pending && s.pending.result && s.pending.tier === 'den');
    ok('S1.13 chains=2: roll Đen ra thiên phú Đen', !!st2, JSON.stringify(st2 && st2.pending));
    c2.socket.emit('create_character', { name: 'C2S342', classId: 'phaptu' });
    await waitFor(() => c2.welcome, 8000);
    ok('S1.14 chains=2: nhân vật mới mang thiên phú Đen + payload hiện GIÁ', !!c2.welcome && c2.welcome.character.talent && c2.welcome.character.talent.tier === 'den' && !!c2.welcome.character.talent.cost, JSON.stringify(c2.welcome && c2.welcome.character.talent));
    c2.socket.disconnect();
    // --- chains 3: đủ 9 bậc
    const c3 = connect('tk342c03'); await sleep(600); c3.socket.emit('talent_catalog_get');
    await waitFor(() => c3.catalog, 6000);
    const tiers3 = (c3.catalog.tiers || []).map((t) => t.id);
    ok('S1.15 chains=3: catalog đủ 9 bậc, 48 thiên phú', tiers3.length === 9 && tiers3.includes('hu') && c3.catalog.list.length === 48, tiers3.join(',') + ' list=' + c3.catalog.list.length);
    c3.socket.disconnect();
    // --- chains 3 + Đạo Tích 120: bốc lại vào bậc Hư (tương thích đợt 2)
    const c3r = connect('tk342c03r'); await sleep(600); c3r.socket.emit('talent_catalog_get');
    await waitFor(() => c3r.catalog, 6000);
    c3r.socket.emit('talent_pick', { tier: 'vo', id: 'suc_luc' });
    await waitTalent(c3r, (s) => s.pending && s.pending.locked && s.pending.result === 'suc_luc');
    c3r.socket.emit('talent_reroll_start', {});
    await waitTalent(c3r, (s) => s.pending && s.pending.rerolling === true);
    c3r.socket.emit('talent_roll', { tier: 'hu' });
    const st3r = await waitTalent(c3r, (s) => s.pending && s.pending.comparing === true && s.pending.result);
    ok('S1.16 bốc lại: roll vào bậc Hư được, sang bước so sánh giữ cũ/mới', !!st3r && (c3r.catalog.list.find((t) => t.id === st3r.pending.result) || {}).tier === 'hu', JSON.stringify(st3r && st3r.pending));
    c3r.socket.emit('talent_reroll_choose', { which: 'new' });
    await waitTalent(c3r, (s) => s.pending && !s.pending.comparing && s.pending.locked);
    c3r.socket.emit('create_character', { name: 'C3RS342', classId: 'kiemtu' });
    await waitFor(() => c3r.welcome, 8000);
    ok('S1.17 bốc lại giữ kết quả Hư: nhân vật mang thiên phú Hư', !!c3r.welcome && c3r.welcome.character.talent && c3r.welcome.character.talent.tier === 'hu', JSON.stringify(c3r.welcome && c3r.welcome.character.talent));
    c3r.socket.disconnect();
    // --- hồi quy: kiếp đầu không achState — pick Vô như GĐ337
    const cp = connect('tk342pln'); await sleep(600); cp.socket.emit('talent_catalog_get');
    await waitFor(() => cp.catalog, 6000);
    cp.socket.emit('talent_pick', { tier: 'vo', id: 'the_chat' });
    await waitTalent(cp, (s) => s.pending && s.pending.result === 'the_chat');
    cp.socket.emit('create_character', { name: 'PlS342', classId: 'kiemtu' });
    await waitFor(() => cp.welcome, 8000);
    ok('S1.18 hồi quy GĐ337: pick Vô + tạo nhân vật bình thường', !!cp.welcome && cp.welcome.character.talent && cp.welcome.character.talent.id === 'the_chat', JSON.stringify(cp.welcome && cp.welcome.character.talent));
    cp.socket.disconnect();
    // --- bốc bù: nhân vật sống chains=2 (có Đen, không Hư); chains=0 (sạch ẩn)
    const m2 = connect('tk342m02'); await waitFor(() => m2.welcome, 8000); m2.socket.emit('talent_catalog_get');
    await waitFor(() => m2.catalog, 6000);
    const m2tiers = (m2.catalog.tiers || []).map((t) => t.id);
    ok('S1.19 bốc bù chains=2: catalog có Đen, không có Hư', m2tiers.includes('den') && !m2tiers.includes('hu'), m2tiers.join(','));
    m2.socket.emit('talent_roll', { tier: 'den' });
    const stm2 = await waitTalent(m2, (s) => s.done && s.done.tier === 'den', 8000);
    ok('S1.20 bốc bù chains=2: roll Đen chốt ngay vào nhân vật đang sống', !!stm2, JSON.stringify(stm2 && stm2.done));
    m2.socket.disconnect();
    const m0 = connect('tk342m00'); await waitFor(() => m0.welcome, 8000); m0.socket.emit('talent_catalog_get');
    await waitFor(() => m0.catalog, 6000);
    const m0tiers = (m0.catalog.tiers || []).map((t) => t.id);
    m0.socket.emit('talent_roll', { tier: 'do' }); await sleep(800);
    ok('S1.21 bốc bù chains=0: catalog 6 bậc + roll Đỏ bị chặn, nhân vật vẫn chưa có thiên phú', m0tiers.length === 6 && !myChar(m0).talent, m0tiers.join(','));
    m0.socket.disconnect();
    await stopServer();
  }
  // ================= S4 (3626): RESTART TRÊN FILE S1 — thiên phú ẩn bền =================
  {
    await startServer(3626, '342d', 600);
    const c1 = connect('tk342c01'); await waitFor(() => c1.welcome, 10000);
    ok('S4.1 sau restart: nhân vật kiếp mới vẫn giữ thiên phú bậc Đỏ', !!c1.welcome && c1.welcome.character.talent && c1.welcome.character.talent.tier === 'do', JSON.stringify(c1.welcome && c1.welcome.character.talent));
    const c3r = connect('tk342c03r'); await waitFor(() => c3r.welcome, 10000);
    ok('S4.2 sau restart: thiên phú Hư bốc lại vẫn còn', !!c3r.welcome && c3r.welcome.character.talent && c3r.welcome.character.talent.tier === 'hu', JSON.stringify(c3r.welcome && c3r.welcome.character.talent));
    c1.socket.disconnect(); c3r.socket.disconnect();
    await stopServer();
  }
  console.log('--- S1+S4 xong: PASS=' + pass + ' FAIL=' + fail);
  // ================= S2 (3624, NGÀY): ĐO HIỆU ỨNG + GIÁ TỪNG THIÊN PHÚ ẨN =================
  let D0 = 0, P0 = 0, SD = 0; // mốc chuẩn dùng chung: đòn thường def-0 / cast def-0 / tốc bay ban ngày
  {
    const VILL = { mapId: 'lang_tan_thu', x: 809, y: 1225 };
    const SHOPPT = { mapId: 'lang_tan_thu', x: 2263, y: 1210 };
    const chars = {};
    chars['tk342bdi01'] = BASE('tk342bdi01', 'BDi342', { classId: 'thetu', talent: { id: 'bat_diet', tier: 'do' }, hp: 30, stats: { ...STATS, vatPhong: 0 } });
    chars['tk342bdims'] = BASE('tk342bdims', 'BMis342', { classId: 'phaptu', talent: { id: 'bat_diet', tier: 'do' }, hp: 30, stats: { ...STATS, vatPhong: 0 } });
    chars['tk342hdlow'] = BASE('tk342hdlow', 'HdLow342', { classId: 'thetu', talent: { id: 'huyet_dung', tier: 'do' }, hp: 200 });
    chars['tk342mtt01'] = BASE('tk342mtt01', 'Mtt342', { talent: { id: 'ma_tam_tran', tier: 'den' }, hp: 500, ...VILL });
    chars['tk342medct'] = BASE('tk342medct', 'MedCt342', { hp: 500, ...VILL });
    chars['tk342actrl'] = BASE('tk342actrl', 'ACtrl342', { skills: ['kiemtu_1'], equipped: ['kiemtu_1'] });
    chars['tk342hdful'] = BASE('tk342hdful', 'HdFul342', { classId: 'thetu', talent: { id: 'huyet_dung', tier: 'do' } });
    chars['tk342aha01'] = BASE('tk342aha01', 'Aha342', { talent: { id: 'am_hon_an', tier: 'den' } });
    chars['tk342hte01'] = BASE('tk342hte01', 'Hte342', { classId: 'phaptu', talent: { id: 'huyet_te', tier: 'den' }, skills: ['phaptu_1'], equipped: ['phaptu_1'] });
    chars['tk342pctrl'] = BASE('tk342pctrl', 'PCtrl342', { classId: 'phaptu', skills: ['phaptu_1'], equipped: ['phaptu_1'] });
    chars['tk342vht01'] = BASE('tk342vht01', 'Vht342', { classId: 'phaptu', talent: { id: 'viem_huyet', tier: 'do' }, skills: ['phaptu_1', 'phaptu_2'], equipped: ['phaptu_1', 'phaptu_2'], linhCan: { elements: ['hoa'], main: 'hoa', count: 1, mutations: [] } });
    chars['tk342tgl01'] = BASE('tk342tgl01', 'Tgl342', { talent: { id: 'thoi_gian_lech', tier: 'hu' }, skills: ['kiemtu_1'], equipped: ['kiemtu_1'] });
    chars['tk342hky01'] = BASE('tk342hky01', 'Hky342', { classId: 'satthu', talent: { id: 'hu_kiem_y', tier: 'hu' }, skills: ['satthu_1'], equipped: ['satthu_1'] });
    chars['tk342sctrl'] = BASE('tk342sctrl', 'SCtrl342', { classId: 'satthu', skills: ['satthu_1'], equipped: ['satthu_1'] });
    chars['tk342hkt01'] = BASE('tk342hkt01', 'Hkt342', { talent: { id: 'huyet_kiem_tam', tier: 'do' }, stats: { ...STATS, vatCong: 40, vatPhong: 1000 } });
    chars['tk342cctrl'] = BASE('tk342cctrl', 'CCtrl342', { stats: { ...STATS, vatCong: 40, vatPhong: 1000 } });
    chars['tk342ttu01'] = BASE('tk342ttu01', 'Ttu342', { talent: { id: 'tham_tuong', tier: 'den' } });
    chars['tk342ttuct'] = BASE('tk342ttuct', 'TtuCt342', {});
    chars['tk342hua01'] = BASE('tk342hua01', 'Hua342', { talent: { id: 'hu_anh', tier: 'hu' }, stats: { ...STATS, vatPhong: 1000 } });
    chars['tk342dah01'] = BASE('tk342dah01', 'Dah342', { classId: 'satthu', talent: { id: 'da_hanh', tier: 'den' } });
    chars['tk342dgct1'] = BASE('tk342dgct1', 'DgCt342', { ...VILL });
    chars['tk342dghab'] = BASE('tk342dghab', 'DgHab342', { talent: { id: 'huyet_anh_bo', tier: 'do' }, ...VILL });
    chars['tk342dghkb'] = BASE('tk342dghkb', 'DgHkb342', { talent: { id: 'hu_khong_bo', tier: 'hu' }, ...VILL });
    chars['tk342ttusl'] = BASE('tk342ttusl', 'TtuSl342', { talent: { id: 'tham_tuong', tier: 'den' }, inventory: { dan_truc_co: 1 }, ...SHOPPT });
    chars['tk342sellct'] = BASE('tk342sellct', 'SellCt342', { inventory: { dan_truc_co: 1 }, ...SHOPPT });
    const POOL342 = ['linh_thao', 'thit_thu', 'dan_hoi_xuan', 'da_quy', 'nanh_soi', 'canh_doi', 'thanh_thao', 'xuong_thu'];
    let h342 = 0; for (const ch of 'npc_truonglang') h342 = (h342 * 31 + ch.charCodeAt(0)) >>> 0;
    const LIKED342 = POOL342[h342 % POOL342.length];
    chars['tk342ahagf'] = BASE('tk342ahagf', 'AhaGf342', { talent: { id: 'am_hon_an', tier: 'den' }, inventory: { [LIKED342]: 1 }, ...VILL });
    chars['tk342ctlgf'] = BASE('tk342ctlgf', 'CtlGf342', { inventory: { [LIKED342]: 1 }, ...VILL });
    writeChars(chars);
    await startServer(3624, '342b', 600);
    // -- nối sớm các nhân vật "máu vá sẵn" (tránh diễn viên offline ghi đè sau 15s) + làng an toàn
    const bdi = connect('tk342bdi01'); const bdims = connect('tk342bdims'); const hdlow = connect('tk342hdlow');
    const mtt = connect('tk342mtt01'); const medct = connect('tk342medct');
    await waitFor(() => bdi.welcome && bdims.welcome && hdlow.welcome && mtt.welcome, 12000);
    hdlow.socket.emit('fly_toggle', {}); hdlow.flying = true; // treo trên không chờ tới lượt đo — tránh bị quái gặm chết trước (máu vá 200)
    // S2.1 Bất Diệt Huyết Mạch: đòn chí tử lần 1 -> sống ở 15% máu; lần 2 cùng ngày -> gục thật
    {
      await flyTo(bdi, 4248, 2950, 10); // đứng giữa bãi quái gần điểm spawn
      const lang = monsOf(bdi).filter((m) => m.kind === 'huyetlang').sort((a, b) => Math.hypot(a.x - 4248, a.y - 2950) - Math.hypot(b.x - 4248, b.y - 2950))[0];
      if (lang) { await flyTo(bdi, lang.x, lang.y, 25); await land(bdi); }
      const maxHp = myChar(bdi).maxHp || 0;
      const saved = await waitFor(() => { const hp = myChar(bdi).hp; return (hp != null && maxHp > 0 && Math.abs(hp - Math.round(maxHp * 0.15)) <= 2 && !bdi.downed) ? hp : null; }, 45000);
      ok('S2.1a Bất Diệt: đòn chí tử lần 1 -> sống sót ở đúng 15% máu tối đa', !!saved, 'hp=' + myChar(bdi).hp + ' maxHp=' + maxHp);
      ok('S2.1b Bất Diệt: có thông báo kích hoạt', bdi.notices.some((t) => t.includes('Bất Diệt Huyết Mạch')), bdi.notices.slice(-3).join(' / '));
      const down2 = await waitFor(() => (bdi.downed || myChar(bdi).hp === 0) ? true : null, 90000);
      ok('S2.1c Bất Diệt: đòn chí tử lần 2 trong cùng ngày game -> gục thật (chỉ cứu 1 lần/ngày)', !!down2, 'hp=' + myChar(bdi).hp + ' downed=' + bdi.downed);
      bdi.socket.disconnect();
    }
    // S2.2 Lệch lớp ở bậc ẩn: Phật tu mang Bất Diệt (chỉ Thể/Cốt/Phật... phaptu KHÔNG hợp) -> chết thật, không cứu
    {
      const lang = monsOf(bdims).filter((m) => m.kind === 'huyetlang')[0];
      if (lang) { await flyTo(bdims, lang.x, lang.y, 25); await land(bdims); }
      const down = await waitFor(() => (bdims.downed || myChar(bdims).hp === 0) ? true : null, 60000);
      ok('S2.2 Lệch lớp bậc ẩn: Pháp tu mang Bất Diệt Huyết Mạch -> gục ngay đòn chí tử, không được cứu', !!down && !bdims.notices.some((t) => t.includes('Bất Diệt')), 'downed=' + bdims.downed);
      bdims.socket.disconnect();
    }
    // -- nối nhóm chiến đấu còn lại
    const actrl = connect('tk342actrl'); const hdful = connect('tk342hdful'); const aha = connect('tk342aha01');
    const hte = connect('tk342hte01'); const pctrl = connect('tk342pctrl'); const vht = connect('tk342vht01');
    const tgl = connect('tk342tgl01'); const hky = connect('tk342hky01'); const sctrl = connect('tk342sctrl');
    const hkt = connect('tk342hkt01'); const cctrl = connect('tk342cctrl'); const ttu = connect('tk342ttu01');
    const ttuct = connect('tk342ttuct'); const hua = connect('tk342hua01'); const dah = connect('tk342dah01');
    await waitFor(() => actrl.welcome && hua.welcome && dah.welcome, 12000);
    await waitStableMons(actrl);
    // S2.3 Huyết Dũng hai ngưỡng + Ám Hồn Ấn (đòn thường lên Huyết Lang phòng 0)
    D0 = await firstHitDrop(actrl, 'huyetlang');
    const dFull = await firstHitDrop(hdful, 'huyetlang');
    const dLow = await firstHitDrop(hdlow, 'huyetlang');
    const dAha = await firstHitDrop(aha, 'huyetlang');
    ok('S2.3a mốc chuẩn đòn thường (không thiên phú) đo được', D0 > 0, 'D0=' + D0);
    ok('S2.3b Huyết Dũng máu đầy: sát thương +6% (dải 1.03–1.10 × chuẩn)', dFull > D0 && dFull <= Math.ceil(D0 * 1.10) && dFull >= Math.floor(D0 * 1.03), `full=${dFull} D0=${D0}`);
    ok('S2.3c Huyết Dũng máu <30%: sát thương +12% (dải 1.08–1.16 × chuẩn, cao hơn mức máu đầy)', dLow > dFull && dLow >= Math.floor(D0 * 1.08) && dLow <= Math.ceil(D0 * 1.16), `low=${dLow} full=${dFull} D0=${D0}`);
    ok('S2.3d Ám Hồn Ấn: sát thương +12% (dải 1.08–1.16 × chuẩn)', dAha >= Math.floor(D0 * 1.08) && dAha <= Math.ceil(D0 * 1.16), `aha=${dAha} D0=${D0}`);
    // S2.4 Thời Gian Lệch: cdMs trong cast_result
    const cc0 = await castAt(actrl, 0, 'huyetlang', 100);
    const cc1 = await castAt(tgl, 0, 'huyetlang', 100);
    ok('S2.4 Thời Gian Lệch: hồi chiêu chiêu ×0,92', !!cc0 && !!cc1 && cc1.res.cdMs < cc0.res.cdMs && (cc1.res.cdMs / cc0.res.cdMs) >= 0.88 && (cc1.res.cdMs / cc0.res.cdMs) <= 0.95, `ctrl=${cc0 && cc0.res.cdMs} tgl=${cc1 && cc1.res.cdMs}`);
    // S2.5 Huyết Tế Tâm: chiêu +15% + GIÁ 4% máu tối đa mỗi cast
    const cp0 = await castAt(pctrl, 0, 'huyetlang', 130); P0 = cp0 ? cp0.res.dmg : 0;
    const hpB = myChar(hte).hp, maxHpT = myChar(hte).maxHp || 0;
    const cp1 = await castAt(hte, 0, 'huyetlang', 130);
    const hpA = await waitFor(() => { const hp = myChar(hte).hp; return (hp != null && hp !== hpB) ? hp : null; }, 3000);
    ok('S2.5a mốc chuẩn cast (không thiên phú) đo được', P0 > 0, 'P0=' + P0);
    ok('S2.5b Huyết Tế Tâm: sát thương chiêu +15% (dải 1.11–1.19 × chuẩn)', !!cp1 && cp1.res.dmg >= Math.floor(P0 * 1.11) && cp1.res.dmg <= Math.ceil(P0 * 1.19), `hte=${cp1 && cp1.res.dmg} P0=${P0}`);
    ok('S2.5c GIÁ Huyết Tế Tâm: mỗi cast tốn đúng 4% máu tối đa', hpA != null && maxHpT > 0 && Math.abs((hpB - hpA) - Math.round(maxHpT * 0.04)) <= 1, `hpB=${hpB} hpA=${hpA} maxHp=${maxHpT} expect=${Math.round(maxHpT * 0.04)}`);
    // S2.6 Viêm Huyết Tâm: chiêu Hỏa +12%, chiêu Băng không đổi
    const cv1 = await castAt(vht, 0, 'huyetlang', 130);
    const cv2 = await castAt(vht, 1, 'huyetlang', 130);
    ok('S2.6a Viêm Huyết Tâm: chiêu hệ Hỏa +12% (dải 1.08–1.16 × chuẩn)', !!cv1 && cv1.res.dmg >= Math.floor(P0 * 1.08) && cv1.res.dmg <= Math.ceil(P0 * 1.16), `hoa=${cv1 && cv1.res.dmg} P0=${P0}`);
    ok('S2.6b Viêm Huyết Tâm: chiêu hệ Băng KHÔNG được cộng (bằng chuẩn ±3%)', !!cv2 && Math.abs(cv2.res.dmg - P0) <= Math.max(2, P0 * 0.03), `bang=${cv2 && cv2.res.dmg} P0=${P0}`);
    // S2.7 Hư Kiếm Ý: 32 cast lên Kiếm Ma (phòng 3) — mẫu xuyên phòng ~20%; đối chứng 16 cast chỉ 1 mức dmg
    async function pierceSamples(c, n) {
      const out = [];
      let guard = 0;
      while (out.length < n && guard++ < n * 4) {
        const r = await castAt(c, 0, 'kiemma', 30);
        if (r && r.kind === 'kiemma' && r.res.dmg > 0) out.push(r.res.dmg);
        await sleep(120);
      }
      return out;
    }
    const sCtrl = await pierceSamples(sctrl, 16);
    const sHky = await pierceSamples(hky, 32);
    const v0 = median(sCtrl);
    const ctrlSingle = sCtrl.length >= 12 && sCtrl.every((d) => d === v0);
    const pierced = sHky.filter((d) => d > v0).length;
    ok('S2.7a đối chứng xuyên phòng: 16 cast chỉ 1 mức sát thương', ctrlSingle, JSON.stringify(sCtrl));
    ok('S2.7b Hư Kiếm Ý: xuất hiện mức dmg xuyên phòng, tỉ lệ ~20% (2–13/32)', sHky.length >= 26 && pierced >= 2 && pierced <= 13 && sHky.every((d) => d === v0 || d > v0), `n=${sHky.length} pierced=${pierced} v0=${v0} vals=${JSON.stringify([...new Set(sHky)])}`);
    // S2.8 Huyết Kiếm Tâm: tỉ lệ chí mạng ~5% (nền 0% — có chí mạng là có kênh); đối chứng 0 chí mạng
    async function attackDrops(c, n) {
      const drops = [];
      let targetId = null;
      for (let i = 0; i < n; i++) {
        let t = targetId && monsOf(c).find((m) => m.id === targetId && m.hp > 0);
        if (!t) { const me = meOf(c); const cand = monsOf(c).filter((m) => m.kind === 'huyetlang' && m.hp > 100).sort((a, b) => Math.hypot(a.x - me.x, a.y - me.y) - Math.hypot(b.x - me.x, b.y - me.y))[0]; if (!cand) { await sleep(1500); continue; } targetId = cand.id; await flyTo(c, cand.x, cand.y, 28); await land(c); t = monsOf(c).find((m) => m.id === targetId); if (!t) continue; }
        const before = new Map(monsOf(c).map((m) => [m.id, m.hp]));
        c.socket.emit('player_attack');
        await sleep(820);
        for (const m of monsOf(c)) { const b = before.get(m.id); if (b != null && m.hp < b) { drops.push(b - m.hp); break; } }
      }
      return drops;
    }
    const critDrops = await attackDrops(hkt, 90);
    const critBase = median(critDrops);
    const crits = critDrops.filter((d) => d >= critBase * 1.7).length;
    ok('S2.8a Huyết Kiếm Tâm: có chí mạng ~5% (1–14/90, nền vốn 0%)', critDrops.length >= 70 && crits >= 1 && crits <= 14, `n=${critDrops.length} crits=${crits} base=${critBase}`);
    const ctrlDrops = await attackDrops(cctrl, 50);
    const ctrlBase = median(ctrlDrops);
    const ctrlCrits = ctrlDrops.filter((d) => d >= ctrlBase * 1.7).length;
    ok('S2.8b đối chứng chí mạng: 0 chí mạng khi không có thiên phú (tỉ lệ nền đúng 0)', ctrlDrops.length >= 35 && ctrlCrits === 0, `n=${ctrlDrops.length} crits=${ctrlCrits} base=${ctrlBase}`);
    // S2.9 Hư Ảnh: đứng giữa bầy Huyết Lang chờ né + đòn kế +20%
    {
      const lang = monsOf(hua).filter((m) => m.kind === 'huyetlang')[0];
      if (lang) { await flyTo(hua, lang.x, lang.y, 25); await land(hua); }
      const idxN = hua.notices.length;
      const procced = await waitFor(() => hua.notices.slice(idxN).some((t) => t.includes('Hư Ảnh')) ? true : null, 120000);
      ok('S2.9a Hư Ảnh: né trọn đòn quái (thông báo Hư Ảnh xuất hiện)', !!procced, 'notices=' + hua.notices.slice(idxN).length);
      let boosted = 0;
      if (procced) {
        for (let t = 0; t < 4 && !boosted; t++) {
          const before = new Map(monsOf(hua).map((m) => [m.id, m.hp]));
          hua.socket.emit('player_attack'); await sleep(700);
          for (const m of monsOf(hua)) { const b = before.get(m.id); if (b != null && m.hp < b) { boosted = b - m.hp; break; } }
        }
      }
      ok('S2.9b Hư Ảnh: đòn kế tiếp sau né +20% (dải 1.14–1.26 × chuẩn)', boosted >= Math.floor(D0 * 1.14) && boosted <= Math.ceil(D0 * 1.26), `boosted=${boosted} D0=${D0}`);
      ok('S2.9c đối chứng: nhân vật thường đứng giữa bầy quái không có thông báo Hư Ảnh', !actrl.notices.some((t) => t.includes('Hư Ảnh')), '');
      hua.socket.disconnect();
    }
    // S2.10 Dạ Hành BAN NGÀY (đối chứng cho S3 ban đêm): đòn thường = chuẩn, tốc bay = mốc SD
    const dDay = await firstHitDrop(dah, 'huyetlang');
    ok('S2.10a Dạ Hành ban ngày: sát thương KHÔNG được cộng (bằng chuẩn)', Math.abs(dDay - D0) <= Math.max(2, D0 * 0.03), `day=${dDay} D0=${D0}`);
    async function flySpeed(c) {
      if (!c.flying) { c.socket.emit('fly_toggle', {}); c.flying = true; await sleep(400); }
      const samples = [];
      const t0 = Date.now();
      c.socket.emit('client_input', { vx: 1, vy: 0 });
      while (Date.now() - t0 < 3200) { const me = meOf(c); if (me) samples.push({ t: Date.now() - t0, x: me.x }); await sleep(100); }
      c.socket.emit('client_input', { vx: 0, vy: 0 });
      const a = samples.find((s) => s.t >= 700); const b = samples[samples.length - 1];
      return (a && b && b.t > a.t) ? (b.x - a.x) / ((b.t - a.t) / 1000) : 0;
    }
    SD = await flySpeed(dah);
    ok('S2.10b Dạ Hành ban ngày: đo được tốc bay mốc', SD > 100, 'SD=' + Math.round(SD));
    dah.socket.disconnect();
    // S2.11 Ma Tâm Trấn — GIÁ: thiền hồi máu ×0,7 (cùng điểm, cùng điều kiện)
    {
      const hpC0 = myChar(medct).hp, hpT0 = myChar(mtt).hp;
      medct.socket.emit('meditate_toggle'); mtt.socket.emit('meditate_toggle');
      await sleep(15000);
      const gC = (myChar(medct).hp || 0) - (hpC0 || 0);
      const gT = (myChar(mtt).hp || 0) - (hpT0 || 0);
      medct.socket.emit('meditate_toggle'); mtt.socket.emit('meditate_toggle');
      ok('S2.11 GIÁ Ma Tâm Trấn: hồi máu khi thiền = 70% của đối chứng (dải 0,60–0,80)', gC > 20 && gT > 0 && (gT / gC) >= 0.60 && (gT / gC) <= 0.80, `gainCtrl=${gC} gainTalent=${gT}`);
      note('S2.11b Ma Tâm Trấn kháng khống chế +20%: kênh resistCC dùng chung trần 75% với Ý Chí (kiểm ở điểm code — quái bãi farm không có đòn choáng/chậm ổn định để đo thống kê)', '');
    }
    // S2.12 Né: khoảng Né + hồi chiêu Né (Huyết Ảnh Bộ / Hư Không Bộ)
    const dgct = connect('tk342dgct1'); const dghab = connect('tk342dghab'); const dghkb = connect('tk342dghkb');
    await waitFor(() => dgct.welcome && dghab.welcome && dghkb.welcome, 10000);
    await waitFor(() => meOf(dgct) && meOf(dghab) && meOf(dghkb), 8000);
    const DIRS = [{ vx: 1, vy: 0 }, { vx: -1, vy: 0 }, { vx: 0, vy: 1 }, { vx: 0, vy: -1 }];
    async function dodgeDisp(c, dir) {
      const p0 = meOf(c); if (!p0) return 0;
      c.socket.emit('dodge', { vx: dir.vx, vy: dir.vy });
      await sleep(750);
      const p1 = meOf(c); if (!p1) return 0;
      return (p1.x - p0.x) * dir.vx + (p1.y - p0.y) * dir.vy;
    }
    async function bestDir(c) { let best = DIRS[0], bv = -1; for (const d of DIRS) { const v = await dodgeDisp(c, d); if (v > bv) { bv = v; best = d; } await sleep(2700); } return { dir: best, disp: bv }; }
    const bdCt = await bestDir(dgct); const bdHab = await bestDir(dghab); const bdHkb = await bestDir(dghkb);
    ok('S2.12a khoảng Né chuẩn ≈ 99px (dải 75–125)', bdCt.disp >= 75 && bdCt.disp <= 125, 'ct=' + Math.round(bdCt.disp));
    ok('S2.12b Hư Không Bộ: khoảng Né +40% (lớn hơn chuẩn ít nhất 25px)', bdHkb.disp >= bdCt.disp + 25, `hkb=${Math.round(bdHkb.disp)} ct=${Math.round(bdCt.disp)}`);
    ok('S2.12c Huyết Ảnh Bộ: khoảng Né như chuẩn (75–125)', bdHab.disp >= 75 && bdHab.disp <= 125, 'hab=' + Math.round(bdHab.disp));
    async function dodgeCd(c, dir) {
      const p0 = meOf(c); if (!p0) return 0;
      const t0 = Date.now();
      c.socket.emit('dodge', { vx: dir.vx, vy: dir.vy });
      let lastX = p0.x, lastY = p0.y, jumped = false;
      await sleep(500);
      while (Date.now() - t0 < 3600) {
        c.socket.emit('dodge', { vx: dir.vx, vy: dir.vy });
        const tA = Date.now();
        while (Date.now() - tA < 130) { const p = meOf(c); if (p) { const d = Math.abs(p.x - lastX) + Math.abs(p.y - lastY); if (d >= 34 && Date.now() - t0 > 700) { jumped = true; break; } lastX = p.x; lastY = p.y; } await sleep(45); }
        if (jumped) return Date.now() - t0;
      }
      return 0;
    }
    const cdCt = await dodgeCd(dgct, bdCt.dir); const cdHab = await dodgeCd(dghab, bdHab.dir); const cdHkb = await dodgeCd(dghkb, bdHkb.dir);
    ok('S2.12d hồi chiêu Né chuẩn ≈ 2,5s (dải 2,15–3,05s)', cdCt >= 2150 && cdCt <= 3050, 'ct=' + cdCt);
    ok('S2.12e Huyết Ảnh Bộ: hồi chiêu Né −30% ≈ 1,75s (dải 1,45–2,15s)', cdHab >= 1450 && cdHab <= 2150 && cdHab < cdCt, 'hab=' + cdHab);
    ok('S2.12f Hư Không Bộ: hồi chiêu Né −20% ≈ 2,0s (dải 1,70–2,40s)', cdHkb >= 1700 && cdHkb <= 2400 && cdHkb < cdCt, 'hkb=' + cdHkb);
    // S2.12g Huyết Ảnh Bộ: sau Né +10% tốc chạy 2s — tổng quãng đường Né+chạy 2s so với đối chứng
    async function dodgeRunDisp(c, dir) {
      const p0 = meOf(c); if (!p0) return 0;
      c.socket.emit('dodge', { vx: dir.vx, vy: dir.vy });
      c.socket.emit('client_input', { vx: dir.vx, vy: dir.vy });
      await sleep(2000);
      c.socket.emit('client_input', { vx: 0, vy: 0 });
      const p1 = meOf(c); if (!p1) return 0;
      return (p1.x - p0.x) * dir.vx + (p1.y - p0.y) * dir.vy;
    }
    await sleep(2800);
    const drCt = Math.max(await dodgeRunDisp(dgct, bdCt.dir), 0); await sleep(2800);
    const drHab = Math.max(await dodgeRunDisp(dghab, bdHab.dir), 0);
    ok('S2.12g Huyết Ảnh Bộ: quãng Né+chạy 2s dài hơn đối chứng (buff +10% tốc sau Né)', drHab >= drCt + 18, `hab=${Math.round(drHab)} ct=${Math.round(drCt)}`);
    dgct.socket.disconnect(); dghab.socket.disconnect(); dghkb.socket.disconnect();
    // S2.13 Tham Tượng — GIÁ bán NPC −10% (dan_truc_co giá thu mua 320)
    const sellct = connect('tk342sellct'); const ttusl = connect('tk342ttusl');
    await waitFor(() => sellct.welcome && ttusl.welcome, 10000);
    async function sellOne(c) {
      const s0 = myChar(c).stones || 0;
      c.socket.emit('shop_sell', { shopId: 'tiem_dan', itemId: 'dan_truc_co' });
      const g = await waitFor(() => { const s = myChar(c).stones; return (s != null && s !== s0) ? s - s0 : null; }, 4000);
      return g;
    }
    let gainSellC = await sellOne(sellct);
    if (gainSellC == null) { await flyTo(sellct, 1012, 541, 20); await land(sellct); gainSellC = await sellOne(sellct); }
    let gainSellT = await sellOne(ttusl);
    if (gainSellT == null) { await flyTo(ttusl, 1012, 541, 20); await land(ttusl); gainSellT = await sellOne(ttusl); }
    ok('S2.13a đối chứng bán NPC: nhận đủ 320 Linh thạch', gainSellC === 320, 'gain=' + gainSellC);
    ok('S2.13b GIÁ Tham Tượng: bán NPC chỉ nhận 288 (−10%)', gainSellT === 288, 'gain=' + gainSellT);
    sellct.socket.disconnect(); ttusl.socket.disconnect();
    // S2.14 Tham Tượng: Linh thạch rơi từ quái +25% (trung bình 8 lần hạ Huyết Lang)
    async function stoneDeltas(c, n) {
      const out = [];
      for (let k = 0; k < n; k++) {
        const s0 = myChar(c).stones || 0;
        const me = meOf(c); if (!me) break;
        const t0 = monsOf(c).filter((m) => m.kind === 'huyetlang').sort((a, b) => Math.hypot(a.x - me.x, a.y - me.y) - Math.hypot(b.x - me.x, b.y - me.y))[0];
        if (!t0) { await sleep(2000); continue; }
        await flyTo(c, t0.x, t0.y, 26); await land(c);
        let deathPos = { x: t0.x, y: t0.y };
        let dead = false;
        for (let att = 0; att < 14 && !dead; att++) {
          const live = monsOf(c).find((m) => m.id === t0.id);
          if (!live) { dead = true; break; }
          deathPos = { x: live.x, y: live.y };
          c.socket.emit('player_attack'); await sleep(800);
          if (!monsOf(c).find((m) => m.id === t0.id)) dead = true;
        }
        if (!dead) continue;
        await flyTo(c, deathPos.x, deathPos.y, 8); await land(c);
        const got = await waitFor(() => { const s = myChar(c).stones; return (s != null && s > s0) ? s - s0 : null; }, 3500);
        if (got != null) out.push(got);
      }
      return out;
    }
    const stC = await stoneDeltas(ttuct, 6);
    const stT = await stoneDeltas(ttu, 6);
    const meanC = stC.length ? stC.reduce((a, b) => a + b, 0) / stC.length : 0;
    const meanT = stT.length ? stT.reduce((a, b) => a + b, 0) / stT.length : 0;
    ok('S2.14 Tham Tượng: Linh thạch rơi từ quái trung bình +25% (dải tỉ lệ 1,05–1,50)', stC.length >= 4 && stT.length >= 4 && meanT > meanC && (meanT / meanC) >= 1.05 && (meanT / meanC) <= 1.50, `ctrl=${JSON.stringify(stC)} mean=${meanC.toFixed(1)} | talent=${JSON.stringify(stT)} mean=${meanT.toFixed(1)}`);
    ttuct.socket.disconnect(); ttu.socket.disconnect();
    // S2.15 Ám Hồn Ấn — GIÁ: thiện cảm dương từ NPC ×0,75 (tặng đúng món thích +15 -> 11)
    const ahagf = connect('tk342ahagf'); const ctlgf = connect('tk342ctlgf');
    await waitFor(() => ahagf.welcome && ctlgf.welcome, 10000);
    ahagf.socket.emit('npc_gift', { npcId: 'npc_truonglang', itemId: LIKED342 });
    ctlgf.socket.emit('npc_gift', { npcId: 'npc_truonglang', itemId: LIKED342 });
    await sleep(1500);
    ahagf.socket.disconnect(); ctlgf.socket.disconnect();
    for (const c of [actrl, hdful, aha, hte, pctrl, vht, tgl, hky, sctrl, hkt, cctrl]) { try { c.socket.disconnect(); } catch (e) {} }
    await stopServer();
    const savedChars = JSON.parse(fs.readFileSync(path.join(DIR, 'characters.json'), 'utf8'));
    const affC = (savedChars['tk342ctlgf'] && savedChars['tk342ctlgf'].affinity && savedChars['tk342ctlgf'].affinity['npc_truonglang']) || 0;
    const affT = (savedChars['tk342ahagf'] && savedChars['tk342ahagf'].affinity && savedChars['tk342ahagf'].affinity['npc_truonglang']) || 0;
    ok('S2.15a đối chứng tặng quà: thiện cảm +15', affC === 15, 'aff=' + affC);
    ok('S2.15b GIÁ Ám Hồn Ấn: thiện cảm dương từ NPC chỉ +11 (×0,75)', affT === 11, 'aff=' + affT);
    console.log('--- S2 xong: PASS=' + pass + ' FAIL=' + fail);
    // ================= S3 (3625, ĐÊM 20:00): DẠ HÀNH BAN ĐÊM =================
    const chars3 = {};
    chars3['tk342dah01'] = BASE('tk342dah01', 'Dah342', { classId: 'satthu', talent: { id: 'da_hanh', tier: 'den' } });
    writeChars(chars3);
    await startServer(3625, '342c', 1200);
    const dahN = connect('tk342dah01');
    await waitFor(() => dahN.welcome, 10000);
    await waitStableMons(dahN);
    const dNight = await firstHitDrop(dahN, 'huyetlang');
    ok('S3.1 Dạ Hành ban đêm: sát thương +8% (dải 1,04–1,12 × chuẩn ngày)', dNight >= Math.floor(D0 * 1.04) && dNight <= Math.ceil(D0 * 1.12), `night=${dNight} D0=${D0}`);
    async function flySpeedN(c) {
      if (!c.flying) { c.socket.emit('fly_toggle', {}); c.flying = true; await sleep(400); }
      const samples = [];
      const t0 = Date.now();
      c.socket.emit('client_input', { vx: 1, vy: 0 });
      while (Date.now() - t0 < 3200) { const me = meOf(c); if (me) samples.push({ t: Date.now() - t0, x: me.x }); await sleep(100); }
      c.socket.emit('client_input', { vx: 0, vy: 0 });
      const a = samples.find((s) => s.t >= 700); const b = samples[samples.length - 1];
      return (a && b && b.t > a.t) ? (b.x - a.x) / ((b.t - a.t) / 1000) : 0;
    }
    const SN = await flySpeedN(dahN);
    ok('S3.2 Dạ Hành ban đêm: tốc chạy +12% so với ban ngày (dải tỉ lệ 1,05–1,20)', SN > SD && (SN / SD) >= 1.05 && (SN / SD) <= 1.20, `night=${Math.round(SN)} day=${Math.round(SD)}`);
    dahN.socket.disconnect();
    await stopServer();
    console.log('--- S3 xong: PASS=' + pass + ' FAIL=' + fail);
  }
  // ================= S5 (3627): THIÊN CƠ MÔNG LUNG — mẫu nhỏ nhiều nhân vật =================
  {
    const chars5 = {};
    const mkTc = (token, name, talent) => BASE(token, name, { realm: 'lk', tier: 9, trialReady: 'dai', inventory: { dan_truc_co: 3 }, tuVi: 100000, lifespan: 5000, stats: { khiHuyet: 500, vatCong: 10, vatPhong: 100, phapCong: 10, phapPhong: 100, tocDo: 60, minhMan: 10 }, linhCan: { elements: ['kim', 'moc', 'thuy', 'hoa', 'tho'], main: 'kim', count: 5, mutations: [] }, talent: talent || undefined });
    for (let i = 0; i < 60; i++) chars5['tk342tc' + String(i).padStart(3, '0')] = mkTc('tk342tc' + String(i).padStart(3, '0'), 'TC' + String(i).padStart(3, '0'), { id: 'thien_co', tier: 'hu' });
    for (let i = 0; i < 20; i++) chars5['tk342tx' + String(i).padStart(3, '0')] = mkTc('tk342tx' + String(i).padStart(3, '0'), 'TX' + String(i).padStart(3, '0'), null);
    writeChars(chars5);
    await startServer(3627, '342e', 600);
    async function brkRun(prefix, n) {
      let saved = 0, lost = 0, other = 0, okN = 0;
      for (let i = 0; i < n; i++) {
        const c = connect(prefix + String(i).padStart(3, '0'));
        const w = await waitFor(() => c.welcome, 9000);
        if (!w) { other++; try { c.socket.disconnect(); } catch (e) {} continue; }
        c.socket.emit('breakthrough');
        const r = await waitFor(() => (c.brkFail.length ? c.brkFail[c.brkFail.length - 1] : (c.brkOk ? 'OK' : null)), 4000);
        if (r === 'OK') okN++;
        else if (r && r.message) { const m = r.message.match(/mất (\d+) Tu vi/); if (m) { if (Number(m[1]) === 0) saved++; else lost++; } else other++; }
        else other++;
        try { c.socket.disconnect(); } catch (e) {}
        await sleep(120);
      }
      return { saved, lost, other, okN };
    }
    const rT = await brkRun('tk342tc', 60);
    const rC = await brkRun('tk342tx', 20);
    const tot = rT.saved + rT.lost;
    const share = tot > 0 ? rT.saved / tot : 0;
    ok('S5.1 Thiên Cơ Mông Lung: trong các lần thua nhánh mất Tu vi, tỉ lệ được giữ Tu vi ~50% (dải 0,25–0,75, mẫu >= 8)', tot >= 8 && rT.saved >= 3 && rT.lost >= 3 && share >= 0.25 && share <= 0.75, JSON.stringify(rT) + ' share=' + share.toFixed(2));
    ok('S5.2 đối chứng Thiên Cơ: nhân vật thường KHÔNG bao giờ được giữ Tu vi khi thua nhánh này', rC.saved === 0 && rC.lost >= 2, JSON.stringify(rC));
    await stopServer();
    console.log('--- S5 xong: PASS=' + pass + ' FAIL=' + fail);
  }
  console.log('=== TỔNG GĐ342: PASS=' + pass + ' FAIL=' + fail);
  process.exit(fail > 0 ? 1 : 0);
})().catch(async (e) => { console.error('PROBE ERROR', e); try { await stopServer(); } catch (x) {} process.exit(2); });
