// Probe GĐ334-F — RƠI NGỌC GIẢN TRỐNG: giết Thạch Khôi Lỗi (loài boss-class: MONSTER_TYPES.minChestGrade = 'B') qua combat thật trên map hoang_tho_coc.
// Tỉ lệ thiết kế 25%/con (đường ngoài LOOT_NERF) — săn nhiều con qua tối đa 4 lần boot server; nhặt đồ rơi bằng cách đi tới chỗ quái gục, đọc túi qua char_sync.
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const net = require('net');
const ROOT = path.join(__dirname, '..', '..');
const PORT = 3580;
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
  serverProc.stderr.on('data', (d) => { try { fs.appendFileSync(path.join(DIR, 'srv_f.log'), d); } catch (e) {} });
  killTimer = setTimeout(() => { try { serverProc.kill('SIGKILL'); } catch (e) {} }, 60000);
  const t0 = Date.now();
  while (Date.now() - t0 < 45000) { try { const r = await fetch(`http://127.0.0.1:${PORT}/api/status`); if (r.ok) { clearTimeout(killTimer); return; } } catch (e) {} await sleep(500); }
  throw new Error('server khong len');
}
async function stopServer() { if (!serverProc) return; const p = serverProc; serverProc = null; await new Promise((res) => { const t = setTimeout(() => { try { p.kill('SIGKILL'); } catch (e) {} res(); }, 4000); p.once('exit', () => { clearTimeout(t); res(); }); try { p.kill('SIGTERM'); } catch (e) { clearTimeout(t); res(); } }); const t0 = Date.now(); while (Date.now() - t0 < 10000 && !(await portFree(PORT))) await sleep(300); }
function BASE(token, name, jade) {
  return { token, name, classId: 'kiemtu', gender: 'nam', race: null, geo175: 1, realm: 'kd', tier: 1, x: 1000, y: 1000, mapId: 'hoang_tho_coc', hp: 99999, lifespan: 500, birthDay: -5660, ageStart: 16, stats: { khiHuyet: 500, vatCong: 3000, vatPhong: 500, phapCong: 100, phapPhong: 100, tocDo: 60, minhMan: 0 }, statPoints: 0, freePoints: 0, tuVi: 0, stones: 0, stonesTrung: 0, stonesThuong: 0, stonesCuc: 0, inventory: { ngoc_gian_trong: jade }, gearBag: {}, equipped: [], skills: [], job: null, job2: null, job3: null, linhCan: { element: 'hoa', grade: 'trung', mult: 1.2 }, affinity: {}, affV2: 1, bonds: {}, quests: {}, questsDone: {}, flags: {}, counters: {}, disciples: [], foundInvites: [], reformIn: [], sectTech: [], sectArts: [], sectArtsActive: [], mails: [], classRes: {} };
}
async function connect(token) {
  const socket = io(`http://127.0.0.1:${PORT}`, { transports: ['websocket'] });
  const ctx = { socket, merger: createMerger(), state: null, welcome: null, sync: null, errors: [] };
  socket.on('connect', () => socket.emit('hello', { token }));
  socket.on('welcome', (w) => { ctx.welcome = w; ctx.myName = (w.character || {}).name; });
  socket.on('server_tick', (t) => { const st = ctx.merger(t); if (st) ctx.state = st; });
  socket.on('char_sync', (sy) => { ctx.sync = sy; });
  socket.on('interact_error', (e) => ctx.errors.push(e.message || ''));
  await waitFor(() => ctx.welcome, 20000);
  return ctx;
}
const meOf = (c) => (c.state?.players || []).find((p) => p.name === c.myName) || (c.state?.players || []).find((p) => p.id === c.welcome.id); // dò theo TÊN: socket reconnect làm welcome.id cũ
const monsOf = (c) => c.state?.monsters || [];
const jadeOf = (c) => (((c.sync || {}).inventory) || ((c.welcome || {}).character || {}).inventory || {}).ngoc_gian_trong || 0;
async function flyTo(c, x, y, tol) {
  c.socket.emit('fly_toggle', {}); await sleep(300);
  const t0 = Date.now();
  while (Date.now() - t0 < 40000) { const me = meOf(c); if (!me) { await sleep(120); continue; } const dx = x - me.x, dy = y - me.y; const d = Math.hypot(dx, dy); if (d <= (tol || 45)) break; c.socket.emit('client_input', { vx: dx / d, vy: dy / d }); await sleep(110); }
  c.socket.emit('client_input', { vx: 0, vy: 0 });
  c.socket.emit('fly_toggle', {}); await sleep(400);
}
(async () => {
  let totalKills = 0, jade = 0, boots = 0;
  for (let b = 0; b < 4 && (totalKills < 10 || jade === 0) && jade === 0; b++) {
    boots++;
    fs.writeFileSync(path.join(DIR, 'characters.json'), JSON.stringify({ p334k60001: BASE('p334k60001', ' ThoSan334', jade) }));
    fs.writeFileSync(path.join(DIR, 'world.json'), JSON.stringify({ totalMinutes: 100 * 1440, savedAt: Date.now(), sects: [] }));
    await startServer();
    const K = await connect('p334k60001');
    // chờ danh sách quái ổn định (tick đầu về từng phần)
    let lastN = -1, stable = 0;
    const t0 = Date.now();
    while (Date.now() - t0 < 40000 && stable < 3) { const n = monsOf(K).length; if (n === lastN && n > 0) stable++; else { stable = 0; lastN = n; } await sleep(1000); }
    const bosses = monsOf(K).filter((m) => m.kind === 'khoiloi');
    console.log(`boot ${b + 1}: ${monsOf(K).length} quai, ${bosses.length} Thach Khoi Loi`);
    for (const boss of bosses) {
      if (jade > 0) break;
      const target = monsOf(K).find((m) => m.id === boss.id);
      if (!target) continue;
      await flyTo(K, target.x, target.y, 35);
      let dead = false, deathPos = { x: target.x, y: target.y };
      for (let h = 0; h < 8 && !dead; h++) {
        const m = monsOf(K).find((x) => x.id === boss.id);
        if (!m) { dead = true; break; }
        deathPos = { x: m.x, y: m.y };
        K.socket.emit('player_attack'); await sleep(950);
        if (!monsOf(K).find((x) => x.id === boss.id)) dead = true;
      }
      if (!dead) { console.log('  khong ha duoc', boss.id); continue; }
      totalKills++;
      await flyTo(K, deathPos.x, deathPos.y, 15); // đứng lên chỗ rơi đồ để nhặt
      await sleep(1500);
      jade = jadeOf(K);
      console.log(`  kill #${totalKills} ${boss.id} -> Ngoc Gian trong tui: ${jade}`);
    }
    K.socket.disconnect();
    await stopServer();
    if (jade > 0) break;
  }
  const pass = jade > 0;
  console.log(`\n== p334f: ${pass ? 'PASS' : 'FAIL'} | tong so Thach Khoi Loi da ha: ${totalKills} qua ${boots} boot | Ngoc Gian nhat duoc: ${jade} (ti le thiet ke 25%/con) ==`);
  process.exit(pass ? 0 : 1);
})();
