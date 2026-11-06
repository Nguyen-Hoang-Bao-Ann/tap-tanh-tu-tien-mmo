// Debug H: liệt kê mọi quái sp ở Lôi Đình, seed nợ -1000 cho MỌI loài sp,
// đặt H cách ~1500px, log vị trí trùm mỗi 2s trong 30s.
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const net = require('net');
const ROOT = path.join(__dirname, '..', '..');
const PORT = 3554;
const DIR = __dirname;
const { io } = require(path.join(ROOT, 'client/node_modules/socket.io-client'));
const { createMerger } = require(path.join(ROOT, 'client/worldmerge.cjs'));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function waitFor(fn, ms) { const t0 = Date.now(); while (Date.now() - t0 < ms) { const v = fn(); if (v) return v; await sleep(200); } return null; }
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
  return Object.assign({ token, name, classId: 'kiemtu', gender: 'nam', race: null, geo175: 1, realm: 'kd', tier: 1, x: 500, y: 500, mapId: 'loi_dinh_son_coc', hp: 99999, stats: { khiHuyet: 500, vatCong: 300, vatPhong: 300, phapCong: 100, phapPhong: 300, tocDo: 60, minhMan: 60 }, statPoints: 0, freePoints: 0, tuVi: 0, stones: 100000, stonesTrung: 0, stonesThuong: 0, stonesCuc: 0, inventory: {}, gearBag: {}, equipped: [], skills: [], job: null, job2: null, job3: null, linhCan: { element: 'kim', grade: 'trung', mult: 1.2 }, affinity: {}, affV2: 1, bonds: {}, quests: {}, questsDone: {}, flags: {}, counters: {}, disciples: [], foundInvites: [], reformIn: [] }, extra || {});
}
(async () => {
  // Boot A: scout kinds
  fs.writeFileSync(path.join(DIR, 'characters.json'), JSON.stringify({ p321sc0001: BASE('p321sc0001', 'Scout') }));
  fs.writeFileSync(path.join(DIR, 'world.json'), JSON.stringify({ totalMinutes: 100 * 1440, savedAt: Date.now(), sects: [] }));
  await startServer();
  async function connect(token) {
    const socket = io(`http://127.0.0.1:${PORT}`, { transports: ['websocket'] });
    const ctx = { socket, syncs: [], merger: createMerger(), state: null, welcome: null };
    socket.on('connect', () => socket.emit('hello', { token }));
    socket.on('welcome', (w) => { ctx.welcome = w; });
    socket.on('char_sync', (c) => ctx.syncs.push(c));
    socket.on('server_tick', (t) => { const st = ctx.merger(t); if (st) ctx.state = st; });
    await waitFor(() => ctx.welcome, 15000);
    return ctx;
  }
  let SC = await connect('p321sc0001');
  await waitFor(() => (SC.state?.monsters || []).some((m) => m.sp === 1), 15000);
  const sps = (SC.state?.monsters || []).filter((m) => m.sp === 1);
  console.log('SP MONSTERS:', sps.map((m) => `${m.kind}#${m.id} hp${m.maxHp} @${Math.round(m.x)},${Math.round(m.y)} hidden=${m.hidden} rare=${m.rare}`).join(' || '));
  const kinds = [...new Set(sps.map((m) => m.kind))];
  SC.socket.disconnect();
  await stopServer();
  // Boot B: H với nợ -1000 cho mọi loài sp
  const bonds = {}; for (const k of kinds) bonds['m:' + k] = { score: -1000, branch: null, pick: null, gainDay: -1, gainAmt: 0, name: k };
  fs.writeFileSync(path.join(DIR, 'characters.json'), JSON.stringify({ p321h00001: BASE('p321h00001', 'Ke Thu H', { bonds }) }));
  await startServer();
  let H = await connect('p321h00001');
  console.log('H welcome bonds:', JSON.stringify((H.welcome.character.bonds || []).filter((b) => b.key.startsWith('m:'))));
  const meOf = () => (H.state?.players || []).find((p) => p.id === H.welcome.id);
  const track = await waitFor(() => { const sp = (H.state?.monsters || []).filter((m) => m.sp === 1); return sp.length ? sp.reduce((a, b) => ((b.maxHp || 0) > (a.maxHp || 0) ? b : a)) : null; }, 15000);
  console.log('TRACK:', track.kind, track.id, 'at', Math.round(track.x), Math.round(track.y), 'me at', Math.round(meOf().x), Math.round(meOf().y));
  for (let i = 0; i < 15; i++) {
    const m = (H.state?.monsters || []).find((x) => x.id === track.id); const me = meOf();
    console.log('t+' + (i * 2) + 's boss=' + (m ? Math.round(m.x) + ',' + Math.round(m.y) : '?') + ' me=' + (me ? Math.round(me.x) + ',' + Math.round(me.y) : '?') + ' d=' + (m && me ? Math.round(Math.hypot(m.x - me.x, m.y - me.y)) : '?') + ' bossHp=' + (m ? m.hp : '?') + ' meHp=' + (me ? me.hp : '?'));
    await sleep(2000);
  }
  H.socket.disconnect();
  await stopServer();
  process.exit(0);
})();
