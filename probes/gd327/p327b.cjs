// Probe GĐ327b — GĐ320: cứu phu thê hồi ĐẦY máu, ân cứu mạng +50, buff đau xót huynh đệ +15% công (đo bằng sát thương).
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const net = require('net');
const ROOT = path.join(__dirname, '..', '..');
const PORT = 3564;
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
  serverProc.stderr.on('data', (d) => process.stderr.write('[srv] ' + d));
  killTimer = setTimeout(() => { try { serverProc.kill('SIGKILL'); } catch (e) {} }, 60000);
  const t0 = Date.now();
  while (Date.now() - t0 < 45000) { try { const r = await fetch(`http://127.0.0.1:${PORT}/api/status`); if (r.ok) { clearTimeout(killTimer); return; } } catch (e) {} await sleep(500); }
  throw new Error('server khong len');
}
async function stopServer() { if (!serverProc) return; const p = serverProc; serverProc = null; await new Promise((res) => { const t = setTimeout(() => { try { p.kill('SIGKILL'); } catch (e) {} res(); }, 4000); p.once('exit', () => { clearTimeout(t); res(); }); try { p.kill('SIGTERM'); } catch (e) { clearTimeout(t); res(); } }); const t0 = Date.now(); while (Date.now() - t0 < 10000 && !(await portFree(PORT))) await sleep(300); }
function BASE(token, name, extra) {
  return Object.assign({ token, name, classId: 'kiemtu', gender: 'nam', race: null, geo175: 1, realm: 'kd', tier: 1, x: 5702, y: 1232, mapId: 'lang_tan_thu', hp: 99999, stats: { khiHuyet: 500, vatCong: 300, vatPhong: 300, phapCong: 100, phapPhong: 300, tocDo: 60, minhMan: 60 }, statPoints: 0, freePoints: 0, tuVi: 0, stones: 0, stonesTrung: 0, stonesThuong: 0, stonesCuc: 0, inventory: {}, gearBag: {}, equipped: [], skills: [], job: null, job2: null, job3: null, linhCan: { element: 'kim', grade: 'trung', mult: 1.2 }, affinity: {}, affV2: 1, bonds: {}, quests: {}, questsDone: {}, flags: {}, counters: {}, disciples: [], foundInvites: [], reformIn: [], sectTech: [], mails: [], classRes: {} }, extra || {});
}
let pass = 0, fail = 0;
function ok(name, cond, extra) { if (cond) { pass++; console.log('PASS | ' + name); } else { fail++; console.log('FAIL | ' + name + (extra ? ' | ' + extra : '')); } }
async function connect(token) {
  const socket = io(`http://127.0.0.1:${PORT}`, { transports: ['websocket'] });
  const ctx = { socket, merger: createMerger(), state: null, welcome: null, downed: false, sync: null, notices: [] };
  socket.on('connect', () => socket.emit('hello', { token }));
  socket.on('welcome', (w) => { ctx.welcome = w; });
  socket.on('server_tick', (t) => { const st = ctx.merger(t); if (st) ctx.state = st; });
  socket.on('you_downed', () => { ctx.downed = true; });
  socket.on('char_sync', (sy) => { ctx.sync = sy; });
  socket.on('notice', (n) => ctx.notices.push(n.text || ''));
  await waitFor(() => ctx.welcome, 20000);
  return ctx;
}
const meOf = (c) => (c.state?.players || []).find((p) => p.id === c.welcome.id);
const monsOf = (c) => c.state?.monsters || [];
async function flyTo(c, x, y, tol) {
  c.socket.emit('fly_toggle', {}); await sleep(350);
  const t0 = Date.now();
  while (Date.now() - t0 < 30000) { const me = meOf(c); if (!me) { await sleep(120); continue; } const dx = x - me.x, dy = y - me.y; const d = Math.hypot(dx, dy); if (d <= (tol || 45)) break; c.socket.emit('client_input', { vx: dx / d, vy: dy / d }); await sleep(110); }
  c.socket.emit('client_input', { vx: 0, vy: 0 });
  c.socket.emit('fly_toggle', {}); await sleep(450);
}
// lấy mẫu sát thương: đánh 1 con sói huyết còn đầy máu, ghi các cú sụt máu do mình đánh
async function sampleHits(c, nHits) {
  const drops = [];
  const t0 = Date.now();
  let targetId = null, lastHp = null;
  while (Date.now() - t0 < 45000 && drops.length < nHits) {
    const ms = monsOf(c).filter((m) => m.kind === 'huyetlang' && (m.hp || 0) > 0);
    if (!targetId) { const full = ms.filter((m) => m.hp >= 340); if (!full.length) { await sleep(200); continue; } targetId = full[0].id; lastHp = full[0].hp; await flyTo(c, full[0].x, full[0].y, 40); }
    const t = ms.find((m) => m.id === targetId);
    if (!t) { targetId = null; continue; }
    const me = meOf(c); const d = Math.hypot(t.x - me.x, t.y - me.y);
    if (d > 62) { c.socket.emit('client_input', { vx: (t.x - me.x) / d, vy: (t.y - me.y) / d }); await sleep(110); continue; }
    c.socket.emit('client_input', { vx: 0, vy: 0 });
    if (t.hp < lastHp) { drops.push(lastHp - t.hp); lastHp = t.hp; }
    c.socket.emit('player_attack'); await sleep(950);
    const t2 = monsOf(c).find((m) => m.id === targetId);
    if (t2 && t2.hp < lastHp) { drops.push(lastHp - t2.hp); lastHp = t2.hp; }
    if (!t2) targetId = null;
  }
  return drops;
}
const median = (a) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : 0; };
(async () => {
  const BOND_PT = { score: 850, branch: 'tinh', pick: 'tinh', theirPick: 'tinh', name: 'x' };
  const BOND_HD = { score: 900, branch: 'than', pick: 'than', theirPick: 'than', name: 'x' };
  const chars = {
    p327v00001: BASE('p327v00001', ' NanNhan1', { stats: { khiHuyet: 10, vatCong: 50, vatPhong: 0, phapCong: 10, phapPhong: 0, tocDo: 60, minhMan: 60 }, bonds: { 'p:p327r00001': { ...BOND_PT } } }),
    p327r00001: BASE('p327r00001', ' YSu1', { classId: 'ytu', classRes: { yDuc: 600, yReviveUnlocked: true }, x: 5780, y: 1270, bonds: { 'p:p327v00001': { ...BOND_PT } } }),
    p327v00002: BASE('p327v00002', ' NanNhan2', { stats: { khiHuyet: 10, vatCong: 50, vatPhong: 0, phapCong: 10, phapPhong: 0, tocDo: 60, minhMan: 60 } }),
    p327r00002: BASE('p327r00002', ' YSu2', { classId: 'ytu', classRes: { yDuc: 600, yReviveUnlocked: true }, x: 5780, y: 1270 }),
    p327g00001: BASE('p327g00001', ' GucNga', { stats: { khiHuyet: 30, vatCong: 50, vatPhong: 0, phapCong: 10, phapPhong: 0, tocDo: 60, minhMan: 60 }, bonds: { 'p:p327g00002': { ...BOND_HD } } }),
    p327g00002: BASE('p327g00002', ' HuynhDe', { stats: { khiHuyet: 500, vatCong: 100, vatPhong: 300, phapCong: 100, phapPhong: 300, tocDo: 60, minhMan: 60 }, x: 6100, y: 1400, bonds: { 'p:p327g00001': { ...BOND_HD } } }),
  };
  fs.writeFileSync(path.join(DIR, 'characters.json'), JSON.stringify(chars));
  fs.writeFileSync(path.join(DIR, 'world.json'), JSON.stringify({ totalMinutes: 100 * 1440, savedAt: Date.now(), sects: [] }));
  await startServer();
  // ===== Chân 1: phu thê cứu nhau -> đầy máu + ân +50 =====
  const V = await connect('p327v00001');
  const maxHpV = V.welcome.character.maxHp;
  await waitFor(() => V.downed, 90000);
  ok('B1a nan nhan guc boi soi', V.downed);
  const R = await connect('p327r00001'); // y tu toi SAU khi nan nhan guc — trong tam cuu 300px, cua so guc 40s
  R.socket.emit('y_revive');
  const rev = await waitFor(() => { const me = meOf(V); return me && me.hp > 0 ? me : null; }, 10000);
  ok('B1b phu the cuu nhau -> hoi DAY mau', !!rev && rev.hp >= maxHpV - 1, `hp=${rev && rev.hp} max=${maxHpV}`);
  await waitFor(() => R.sync, 6000);
  const bScore = R.sync && R.sync.bonds ? ((R.sync.bonds.find ? (R.sync.bonds.find((b) => b.key === 'p:p327v00001') || {}).score : (R.sync.bonds['p:p327v00001'] || {}).score)) : null;
  ok('B1c an cuu mang: +50 danh nghia, o bac >=300 giam nua -> +25 that (850 -> 875, dung luat thiet ke muc 4)', bScore === 875, 'score=' + bScore);
  V.socket.disconnect(); R.socket.disconnect(); await sleep(800);
  // ===== Chân 2: người dưng cứu -> 50% máu =====
  const V2 = await connect('p327v00002'); const R2 = await connect('p327r00002');
  const maxHpV2 = V2.welcome.character.maxHp;
  await waitFor(() => V2.downed, 60000);
  R2.socket.emit('y_revive');
  const rev2 = await waitFor(() => { const me = meOf(V2); return me && me.hp > 0 ? me : null; }, 10000);
  ok('B2 nguoi dung cuu -> hoi 50% mau', !!rev2 && Math.abs(rev2.hp - Math.round(maxHpV2 * 0.5)) <= 2, `hp=${rev2 && rev2.hp} exp=${Math.round(maxHpV2 * 0.5)}`);
  await waitFor(() => R2.sync, 6000);
  const b2 = R2.sync && R2.sync.bonds ? ((R2.sync.bonds.find ? (R2.sync.bonds.find((b) => b.key === 'p:p327v00002') || {}).score : (R2.sync.bonds['p:p327v00002'] || {}).score)) : null;
  ok('B2b an cuu mang o bac thap: +50 tron (0 -> 50, khong giam nua, khong tinh tran ngay)', b2 === 50, 'score=' + b2);
  V2.socket.disconnect(); R2.socket.disconnect(); await sleep(800);
  // ===== Chân 3: đau xót huynh đệ +15% công =====
  const G2 = await connect('p327g00002');
  const pre = await sampleHits(G2, 7);
  ok('B3a lay mau sat thuong truoc (du 5 cu)', pre.length >= 5, 'n=' + pre.length + ' ' + JSON.stringify(pre));
  await flyTo(G2, 6000, 1232, 45); // vào vị trí cách điểm G1 sắp tới ~300px (trong vòng 600) TRƯỚC khi G1 xuất hiện
  const G1 = await connect('p327g00001'); // G1 chỉ bắt đầu bị sói cắn từ lúc này — khoảnh khắc gục chắc chắn nằm trong tầm 600px của G2
  const dwn = await waitFor(() => G1.downed, 90000);
  ok('B3b huynh de guc trong vong 600px', !!dwn);
  const griefNote = G2.notices.some((t) => t.includes('đau xót'));
  const post = await sampleHits(G2, 7);
  const ratio = pre.length && post.length ? median(post) / median(pre) : 0;
  ok('B3c buff dau xot: sat thuong tang ~15%', ratio >= 1.06, `preMed=${median(pre)} postMed=${median(post)} ratio=${ratio.toFixed(3)} notice=${griefNote} pre=${JSON.stringify(pre)} post=${JSON.stringify(post)}`);
  G1.socket.disconnect(); G2.socket.disconnect();
  await stopServer();
  console.log(`\n== p327b: ${pass} PASS, ${fail} FAIL ==`);
  process.exit(fail ? 1 : 0);
})();
