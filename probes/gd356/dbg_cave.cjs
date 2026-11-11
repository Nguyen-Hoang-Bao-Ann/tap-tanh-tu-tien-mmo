// Debug riêng chân hang GĐ356: làng -> TVT -> map farm -> cave_enter.
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
let serverProc = null, CUR_PORT = 3714;
async function startServer(port) {
  CUR_PORT = port;
  serverProc = spawn('node', ['server/index.js'], { cwd: ROOT, env: { ...process.env, PORT: String(port), TTT_STORAGE: 'file', TTT_CHAR_FILE: path.join(DIR, 'characters.json'), TTT_ACC_FILE: path.join(DIR, 'accounts.json'), TTT_WORLD_FILE: path.join(DIR, 'world.json'), TTT_SESS_FILE: path.join(DIR, 'sessions.json'), TTT_DAY_REAL_MS: '600000', TTT_TUVI_NEED: '5' }, stdio: ['ignore', 'pipe', 'pipe'] });
  serverProc.stdout.on('data', () => {}); serverProc.stderr.on('data', () => {});
  const t0 = Date.now();
  while (Date.now() - t0 < 45000) { try { const r = await fetch(`http://127.0.0.1:${port}/api/status`); if (r.ok) return; } catch (e) {} await sleep(500); }
  throw new Error('server khong len');
}
async function stopServer() { if (!serverProc) return; const p = serverProc; serverProc = null; await new Promise((res) => { const t = setTimeout(() => { try { p.kill('SIGKILL'); } catch (e) {} res(); }, 4000); p.once('exit', () => { clearTimeout(t); res(); }); try { p.kill('SIGTERM'); } catch (e) { clearTimeout(t); res(); } }); const t0 = Date.now(); while (Date.now() - t0 < 10000 && !(await portFree(CUR_PORT))) await sleep(300); }
const STATS = { khiHuyet: 8000, vatCong: 400, vatPhong: 250, phapCong: 400, phapPhong: 250, tocDo: 60, minhMan: 100 };
function BASE(token, name, extra) { return Object.assign({ token, name, classId: 'kiemtu', gender: 'nam', race: null, geo175: 1, realm: 'kd', tier: 9, x: 2415, y: 1342, mapId: 'lang_tan_thu', hp: 99999, mp: 99999, lifespan: 500, birthDay: -5660, ageStart: 16, stats: { ...STATS }, statPoints: 0, freePoints: 0, tuVi: 99999, stones: 100000, stonesTrung: 0, stonesThuong: 0, stonesCuc: 0, inventory: {}, gearBag: {}, equipped: [], skills: [], job: null, job2: null, job3: null, linhCan: { elements: ['kim'], main: 'kim', count: 1, mutations: [] }, affinity: {}, affV2: 1, bonds: {}, quests: {}, questsDone: {}, flags: {}, counters: {}, disciples: [], foundInvites: [], reformIn: [], sectTech: [], sectArts: [], sectArtsActive: [], mails: [], classRes: {}, food: 100, water: 100 }, extra || {}); }
(async () => {
  try {
    fs.writeFileSync(path.join(DIR, 'characters.json'), JSON.stringify({ tk356dbg02: BASE('tk356dbg02', 'DbgCave') }));
    await startServer(3714);
    const socket = io('http://127.0.0.1:3714', { transports: ['websocket'] });
    const ctx = { maps: [], errs: [], infos: [], syncs: [], merger: createMerger(), state: null, myName: 'DbgCave' };
    let welcome = null;
    socket.on('connect', () => socket.emit('hello', { token: 'tk356dbg02' }));
    socket.on('welcome', (w) => { welcome = w; });
    socket.on('travel_info', (d) => ctx.infos.push(d));
    socket.on('map_enter', (m) => ctx.maps.push(m));
    socket.on('interact_error', (e) => ctx.errs.push(e.message));
    socket.on('char_sync', (s) => ctx.syncs.push(s));
    socket.on('server_tick', (t) => { const st = ctx.merger(t); if (st) ctx.state = st; });
    await waitFor(() => welcome, 20000);
    const meOf = () => { const ps = (ctx.state && ctx.state.players) || []; return ps.find((p) => p.name === 'DbgCave') || null; };
    async function journeyTo(mapId) {
      const m0 = ctx.maps.length;
      socket.emit('travel_to', { mapId });
      const me2 = await waitFor(() => { for (let i = m0; i < ctx.maps.length; i++) if (ctx.maps[i].mapId === mapId) return ctx.maps[i]; return null; }, 60000);
      if (!me2) { console.log('journey FAIL (no map_enter)', mapId, 'errs:', JSON.stringify(ctx.errs)); return null; }
      const t0 = Date.now();
      while (Date.now() - t0 < 45000) {
        const i0 = ctx.infos.length;
        socket.emit('travel_list', {});
        const inf = await waitFor(() => (ctx.infos.length > i0 ? ctx.infos[ctx.infos.length - 1] : null), 5000);
        if (inf && inf.from === mapId) { console.log('arrived', mapId, 'caves:', JSON.stringify(me2.caves || [])); return me2; }
        await sleep(1000);
      }
      console.log('journey FAIL (from never matches)', mapId, 'lastFrom:', ctx.infos.length ? ctx.infos[ctx.infos.length - 1].from : null);
      return null;
    }
    await journeyTo('thanh_van_thanh');
    const dests = ['huyet_sac_rung', 'bang_phong_coc', 'hoa_diem_son', 'thanh_phong_lam', 'kim_ke_son', 'hoang_tho_coc', 'duoc_coc', 'thiet_coc'];
    for (const dest of dests) {
      const me2 = await journeyTo(dest);
      if (!me2) { await journeyTo('thanh_van_thanh'); continue; }
      const caves = me2.caves || [];
      if (!caves.length) { console.log(dest, ': khong co hang'); await journeyTo('thanh_van_thanh'); continue; }
      // bay tới miệng hang 0
      socket.emit('fly_toggle', {});
      await sleep(400);
      const t0 = Date.now();
      while (Date.now() - t0 < 30000) {
        const me = meOf(); if (!me) { await sleep(150); continue; }
        const dx = caves[0].x - me.x, dy = caves[0].y - me.y; const d = Math.hypot(dx, dy);
        if (d <= 30) break;
        socket.emit('client_input', { vx: dx / d, vy: dy / d });
        await sleep(120);
      }
      socket.emit('client_input', { vx: 0, vy: 0 });
      socket.emit('fly_toggle', {});
      await sleep(400);
      const meA = meOf();
      console.log(dest, ': đứng ở', meA ? Math.round(meA.x) + ',' + Math.round(meA.y) : '?', 'miệng:', JSON.stringify(caves[0]));
      socket.emit('cave_enter', {});
      await sleep(2500);
      const file = JSON.parse(fs.readFileSync(path.join(DIR, 'characters.json'), 'utf8'))['tk356dbg02'] || {};
      console.log(dest, ': secrets trong file =', JSON.stringify(file.soul && file.soul.secrets), 'errs:', JSON.stringify(ctx.errs.slice(-2)));
      break;
    }
    socket.disconnect();
    await stopServer();
  } catch (e) { console.log('ERR', e.message); try { await stopServer(); } catch (e2) {} }
  process.exit(0);
})();
