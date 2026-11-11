// Debug: liệt kê đích dịch chuyển từ làng + Thanh Vân Thành, và map nào có hang (qua map_enter thử vài map farm).
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
let serverProc = null, CUR_PORT = 3713;
async function startServer(port) {
  CUR_PORT = port;
  serverProc = spawn('node', ['server/index.js'], { cwd: ROOT, env: { ...process.env, PORT: String(port), TTT_STORAGE: 'file', TTT_CHAR_FILE: path.join(DIR, 'characters.json'), TTT_ACC_FILE: path.join(DIR, 'accounts.json'), TTT_WORLD_FILE: path.join(DIR, 'world.json'), TTT_SESS_FILE: path.join(DIR, 'sessions.json'), TTT_DAY_REAL_MS: '600000', TTT_TUVI_NEED: '5' }, stdio: ['ignore', 'pipe', 'pipe'] });
  serverProc.stdout.on('data', () => {}); serverProc.stderr.on('data', (d) => process.stderr.write(d));
  const t0 = Date.now();
  while (Date.now() - t0 < 45000) { try { const r = await fetch(`http://127.0.0.1:${port}/api/status`); if (r.ok) return; } catch (e) {} await sleep(500); }
  throw new Error('server khong len');
}
async function stopServer() { if (!serverProc) return; const p = serverProc; serverProc = null; await new Promise((res) => { const t = setTimeout(() => { try { p.kill('SIGKILL'); } catch (e) {} res(); }, 4000); p.once('exit', () => { clearTimeout(t); res(); }); try { p.kill('SIGTERM'); } catch (e) { clearTimeout(t); res(); } }); const t0 = Date.now(); while (Date.now() - t0 < 10000 && !(await portFree(CUR_PORT))) await sleep(300); }
const STATS = { khiHuyet: 8000, vatCong: 400, vatPhong: 250, phapCong: 400, phapPhong: 250, tocDo: 60, minhMan: 100 };
function BASE(token, name, extra) { return Object.assign({ token, name, classId: 'kiemtu', gender: 'nam', race: null, geo175: 1, realm: 'kd', tier: 9, x: 2415, y: 1342, mapId: 'lang_tan_thu', hp: 99999, mp: 99999, lifespan: 500, birthDay: -5660, ageStart: 16, stats: { ...STATS }, statPoints: 0, freePoints: 0, tuVi: 99999, stones: 100000, stonesTrung: 0, stonesThuong: 0, stonesCuc: 0, inventory: {}, gearBag: {}, equipped: [], skills: [], job: null, job2: null, job3: null, linhCan: { elements: ['kim'], main: 'kim', count: 1, mutations: [] }, affinity: {}, affV2: 1, bonds: {}, quests: {}, questsDone: {}, flags: {}, counters: {}, disciples: [], foundInvites: [], reformIn: [], sectTech: [], sectArts: [], sectArtsActive: [], mails: [], classRes: {}, food: 100, water: 100 }, extra || {}); }
(async () => {
  try {
    fs.writeFileSync(path.join(DIR, 'characters.json'), JSON.stringify({ tk356dbg01: BASE('tk356dbg01', 'DbgTravel') }));
    await startServer(3713);
    const socket = io('http://127.0.0.1:3713', { transports: ['websocket'] });
    const ctx = { infos: [], maps: [], errs: [] };
    let welcome = null;
    socket.on('connect', () => socket.emit('hello', { token: 'tk356dbg01' }));
    socket.on('welcome', (w) => { welcome = w; });
    socket.on('travel_info', (d) => ctx.infos.push(d));
    socket.on('map_enter', (m) => ctx.maps.push(m));
    socket.on('interact_error', (e) => ctx.errs.push(e.message));
    await waitFor(() => welcome, 20000);
    socket.emit('travel_list', {});
    const info0 = await waitFor(() => ctx.infos.length ? ctx.infos[ctx.infos.length - 1] : null, 8000);
    console.log('FROM HOME:', JSON.stringify((info0.list || []).map((d) => d.id + (d.canEnter ? '' : '(no)'))));
    socket.emit('travel_to', { mapId: 'thanh_van_thanh' });
    const hub = await waitFor(() => ctx.maps.find((m) => m.mapId === 'thanh_van_thanh') || null, 60000);
    console.log('HUB ARRIVE:', !!hub, 'errs:', JSON.stringify(ctx.errs));
    socket.emit('travel_list', {});
    await sleep(800);
    const info1 = ctx.infos[ctx.infos.length - 1];
    const ids = (info1.list || []).map((d) => d.id);
    console.log('FROM TVT total:', ids.length);
    console.log('farm-ish:', JSON.stringify(ids.filter((i) => /rung|coc|son|lam|dong|dao|hai| giang|nguyen/.test(i)).slice(0, 40)));
    console.log('has huyet_sac_rung:', ids.includes('huyet_sac_rung'));
    socket.disconnect();
    await stopServer();
  } catch (e) { console.log('ERR', e.message); try { await stopServer(); } catch (e2) {} }
  process.exit(0);
})();
