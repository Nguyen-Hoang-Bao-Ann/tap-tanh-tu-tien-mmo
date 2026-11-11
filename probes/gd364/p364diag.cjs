// Diagnostic D-1: vì sao chest_opened không tới client probe? Lắng nghe onAny,
// đếm histogram sự kiện + ach_chests qua char_sync + state.chests theo thời gian.
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const net = require('net');
const ROOT = path.join(__dirname, '..', '..');
const PORT = 3796;
const DIR = __dirname;
const { io } = require(path.join(ROOT, 'client/node_modules/socket.io-client'));
const { createMerger } = require(path.join(ROOT, 'client/worldmerge.cjs'));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function waitFor(fn, ms) { const t0 = Date.now(); while (Date.now() - t0 < ms) { const v = fn(); if (v) return v; await sleep(150); } return null; }
function portFree(port) { return new Promise((res) => { const s = net.createServer(); s.once('error', () => res(false)); s.listen(port, () => s.close(() => res(true))); }); }
let serverProc = null, killTimer = null;
async function startServer() {
  if (!(await portFree(PORT))) throw new Error('port ban');
  serverProc = spawn('node', ['server/index.js'], { cwd: ROOT, env: { ...process.env, PORT: String(PORT), TTT_STORAGE: 'file', TTT_CHAR_FILE: path.join(DIR, 'charactersd.json'), TTT_ACC_FILE: path.join(DIR, 'accountsd.json'), TTT_WORLD_FILE: path.join(DIR, 'worldd.json'), TTT_SESS_FILE: path.join(DIR, 'sessionsd.json'), TTT_DAY_REAL_MS: '600000', TTT_TUVI_NEED: '5', TTT_CHEST_TTL_MS: '3600000' }, stdio: ['ignore', 'pipe', 'pipe'] });
  serverProc.stderr.on('data', (d) => process.stderr.write('[srv-err] ' + d));
  serverProc.stdout.on('data', () => {});
  killTimer = setTimeout(() => { try { serverProc.kill('SIGKILL'); } catch (e) {} }, 900000);
  const t0 = Date.now();
  while (Date.now() - t0 < 45000) { try { const r = await fetch(`http://127.0.0.1:${PORT}/api/status`); if (r.ok) { clearTimeout(killTimer); killTimer = null; return; } } catch (e) {} await sleep(500); }
  throw new Error('server khong len');
}
async function stopServer() { if (!serverProc) return; const p = serverProc; serverProc = null; if (killTimer) { clearTimeout(killTimer); killTimer = null; } await new Promise((res) => { const t = setTimeout(() => { try { p.kill('SIGKILL'); } catch (e) {} res(); }, 4000); p.once('exit', () => { clearTimeout(t); res(); }); try { p.kill('SIGTERM'); } catch (e) { clearTimeout(t); res(); } }); const t0 = Date.now(); while (Date.now() - t0 < 10000 && !(await portFree(PORT))) await sleep(300); }
function BASE(token, name, extra) {
  return Object.assign({ token, name, classId: 'kiemtu', gender: 'nam', race: null, geo175: 1, realm: 'kd', tier: 1, x: 1565, y: 1252, mapId: 'lang_tan_thu', hp: 99999, mp: 9999, stats: { khiHuyet: 500, vatCong: 400, vatPhong: 200, phapCong: 100, phapPhong: 78, tocDo: 60, minhMan: 100 }, statPoints: 0, freePoints: 0, tuVi: 0, stones: 0, stonesTrung: 0, stonesThuong: 0, stonesCuc: 0, inventory: {}, gearBag: {}, equipped: [], skills: [], job: null, job2: null, job3: null, linhCan: { element: 'kim', grade: 'trung', mult: 1.2 }, affinity: {}, affV2: 1, bonds: {}, quests: {}, questsDone: {}, flags: {}, counters: {}, disciples: [], foundInvites: [], reformIn: [], sectTech: [], sectArts: [], sectArtsActive: [], mails: [], classRes: {} }, extra || {});
}

(async () => {
  const chars = { p364d00001: BASE('p364d00001', 'P364Diag', { talent: { id: 'dai_khi_van', tier: 'cam' } }) };
  fs.writeFileSync(path.join(DIR, 'charactersd.json'), JSON.stringify(chars));
  fs.writeFileSync(path.join(DIR, 'worldd.json'), JSON.stringify({ totalMinutes: 100 * 1440, savedAt: Date.now(), sects: [] }));
  fs.writeFileSync(path.join(DIR, 'accountsd.json'), JSON.stringify({}));
  fs.writeFileSync(path.join(DIR, 'sessionsd.json'), JSON.stringify({}));
  await startServer();

  const socket = io(`http://127.0.0.1:${PORT}`, { transports: ['websocket'] });
  const merger = createMerger();
  const hist = {};
  const chestPayloads = [];
  let state = null, welcome = null, lastSync = null, syncCount = 0;
  socket.onAny((ev, a) => { hist[ev] = (hist[ev] || 0) + 1; if (ev === 'chest_opened') chestPayloads.push(a); });
  socket.on('connect', () => socket.emit('hello', { token: 'p364d00001' }));
  socket.on('welcome', (w) => { welcome = w; });
  socket.on('char_sync', (s) => { lastSync = s; syncCount++; });
  socket.on('server_tick', (t) => { const st = merger(t); if (st) state = st; });
  await waitFor(() => welcome, 20000);
  console.log('welcome ok; char name =', (welcome.character || {}).name);
  const meOf = () => (state?.players || []).find((p) => p.name === 'P364Diag');
  await waitFor(() => meOf(), 10000);

  async function flyTo(x, y, tol, timeoutMs) {
    socket.emit('fly_toggle', {}); await sleep(300);
    const t0 = Date.now();
    while (Date.now() - t0 < (timeoutMs || 15000)) { const me = meOf(); if (!me) { await sleep(120); continue; } const dx = x - me.x, dy = y - me.y; const d = Math.hypot(dx, dy); if (d <= (tol || 45)) break; socket.emit('client_input', { vx: dx / d, vy: dy / d }); await sleep(110); }
    socket.emit('client_input', { vx: 0, vy: 0 });
    socket.emit('fly_toggle', {}); await sleep(300);
  }
  async function killMonster(target, maxMs) {
    const t0 = Date.now();
    while (Date.now() - t0 < (maxMs || 30000)) {
      const m = (state?.monsters || []).find((x) => x.id === target.id);
      if (!m) return true;
      if ((m.hp || 0) <= 0) return true;
      const me = meOf(); if (!me) { await sleep(150); continue; }
      const d = Math.hypot(m.x - me.x, m.y - me.y);
      if (d > 40) { socket.emit('client_input', { vx: (m.x - me.x) / d, vy: (m.y - me.y) / d }); await sleep(110); continue; }
      socket.emit('client_input', { vx: 0, vy: 0 });
      socket.emit('player_attack', {});
      await sleep(320);
    }
    return false;
  }

  const t0 = Date.now();
  let lastPrint = 0;
  while (Date.now() - t0 < 150 * 1000) {
    const me = meOf(); if (!me) { await sleep(300); continue; }
    const chests = (state?.chests || []).slice().sort((a, b) => Math.hypot(a.x - me.x, a.y - me.y) - Math.hypot(b.x - me.x, b.y - me.y));
    if (chests.length) { await flyTo(chests[0].x, chests[0].y, 20, 12000); await sleep(600); }
    else {
      const cands = (state?.monsters || []).filter((m) => ['wolf', 'bat', 'golem'].includes(m.kind) && !m.sp && (m.hp || 0) > 0)
        .sort((a, b) => Math.hypot(a.x - me.x, a.y - me.y) - Math.hypot(b.x - me.x, b.y - me.y));
      if (!cands.length) { await sleep(1000); continue; }
      const near = cands.filter((m) => Math.hypot(m.x - me.x, m.y - me.y) <= 700);
      if (!near.length) { await flyTo(cands[0].x, cands[0].y, 200, 12000); continue; }
      socket.emit('fly_toggle', {}); await sleep(250);
      await killMonster(near[0], 30000);
      socket.emit('fly_toggle', {});
    }
    if (Date.now() - lastPrint > 20000) {
      lastPrint = Date.now();
      const ach = lastSync && lastSync.counters ? lastSync.counters.ach_chests : undefined;
      console.log(`[diag +${Math.round((Date.now() - t0) / 1000)}s] chestEvents=${chestPayloads.length} ach_chests(sync)=${ach} syncCount=${syncCount} chestsInState=${(state?.chests || []).length}`);
    }
  }
  const achF = lastSync && lastSync.counters ? lastSync.counters.ach_chests : undefined;
  console.log('FINAL chestEvents =', chestPayloads.length, '| ach_chests(sync) =', achF, '| syncCount =', syncCount);
  console.log('HIST =', JSON.stringify(hist));
  if (chestPayloads.length) console.log('SAMPLE payload =', JSON.stringify(chestPayloads[0]));
  socket.disconnect(); await sleep(600);
  await stopServer();
  process.exit(0);
})().catch(async (e) => { console.error('LOI:', e); await stopServer(); process.exit(2); });
