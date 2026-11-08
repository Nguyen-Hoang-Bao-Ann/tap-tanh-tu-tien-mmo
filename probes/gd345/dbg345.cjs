// Debug GĐ345: vì sao hồn đợt 2 (anGhost) không hiện qua tick mà run vẫn tiến?
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
let serverProc = null, CUR_PORT = 3646;
async function startServer(port) {
  CUR_PORT = port;
  if (!(await portFree(port))) throw new Error('port ban');
  const env = { ...process.env, PORT: String(port), TTT_STORAGE: 'file', TTT_CHAR_FILE: path.join(DIR, 'characters.json'), TTT_ACC_FILE: path.join(DIR, 'accounts.json'), TTT_WORLD_FILE: path.join(DIR, 'world.json'), TTT_SESS_FILE: path.join(DIR, 'sessions.json'), TTT_DAY_REAL_MS: '600000', TTT_TUVI_NEED: '5' };
  serverProc = spawn('node', ['server/index.js'], { cwd: ROOT, env, stdio: ['ignore', 'pipe', 'pipe'] });
  serverProc.stderr.on('data', (d) => { try { fs.appendFileSync(path.join(DIR, 'srv_dbg.log'), d); } catch (e) {} });
  serverProc.stdout.on('data', (d) => { try { fs.appendFileSync(path.join(DIR, 'srv_dbg.log'), d); } catch (e) {} });
  const t0 = Date.now();
  while (Date.now() - t0 < 45000) { try { const r = await fetch(`http://127.0.0.1:${port}/api/status`); if (r.ok) return; } catch (e) {} await sleep(500); }
  throw new Error('server khong len');
}
async function stopServer() { if (!serverProc) return; const p = serverProc; serverProc = null; await new Promise((res) => { const t = setTimeout(() => { try { p.kill('SIGKILL'); } catch (e) {} res(); }, 4000); p.once('exit', () => { clearTimeout(t); res(); }); try { p.kill('SIGTERM'); } catch (e) { clearTimeout(t); res(); } }); }
const LC1 = { elements: ['kim'], main: 'kim', count: 1, mutations: [] };
const TK = 'dbg345token1234567';
const T0 = Date.now();
const log = (...a) => console.log(((Date.now() - T0) / 1000).toFixed(1) + 's', ...a);
(async () => {
  const ch = { token: TK, name: 'DBG Hon', classId: 'kiemtu', gender: 'nam', race: null, geo175: 1, realm: 'lk', tier: 9, x: 700, y: 480, mapId: 'lang_tan_thu', hp: 99999, lifespan: 500, birthDay: -5660, ageStart: 16, stats: { khiHuyet: 8000, vatCong: 5000, vatPhong: 250, phapCong: 400, phapPhong: 250, tocDo: 60, minhMan: 100 }, statPoints: 0, freePoints: 0, tuVi: 99999, stones: 0, stonesTrung: 0, stonesThuong: 0, stonesCuc: 0, inventory: {}, gearBag: {}, equipped: [], skills: [], job: null, job2: null, job3: null, linhCan: { ...LC1 }, affinity: {}, affV2: 1, bonds: {}, quests: {}, questsDone: {}, flags: {}, counters: {}, disciples: [], foundInvites: [], reformIn: [], sectTech: [], sectArts: [], sectArtsActive: [], mails: [], classRes: {}, food: 100, water: 100, branch: null, branchQi: 0, anState: { lkDays: 0, kdDays: 0, lkLastDay: -1, kdLastDay: -1, vienman: true, luyenHon: true, nhapDao: false } };
  fs.writeFileSync(path.join(DIR, 'characters.json'), JSON.stringify({ [TK]: ch }, null, 1));
  fs.writeFileSync(path.join(DIR, 'accounts.json'), '{}');
  for (const f of ['world.json', 'sessions.json']) { try { fs.unlinkSync(path.join(DIR, f)); } catch (e) {} }
  await startServer(CUR_PORT);
  const socket = io(`http://127.0.0.1:${CUR_PORT}`, { transports: ['websocket'] });
  const merger = createMerger();
  let state = null;
  socket.on('connect', () => socket.emit('hello', { token: TK }));
  socket.on('server_tick', (t) => {
    const st = merger(t); if (st) state = st;
    const ms = (t.monsters || []).filter((m) => m.trial === 'uhon');
    if (ms.length) log('RAW tick monsters:', JSON.stringify(ms));
    const gone = (t.monstersGone || []);
    if (gone.length) log('RAW monstersGone:', JSON.stringify(gone));
  });
  socket.on('monster_killed', (d) => log('monster_killed:', JSON.stringify(d)));
  socket.on('notice', (n) => log('NOTICE:', n.text));
  socket.on('interact_error', (e) => log('ERR:', e.message));
  socket.on('map_enter', (d) => log('MAP_ENTER:', d.mapId));
  await waitFor(() => state && state.players && state.players.length, 20000);
  socket.emit('an_gate_enter', { canh: 'uhon' });
  const ghosts = () => (state?.monsters || []).filter((m) => m.trial === 'uhon');
  await waitFor(() => ghosts().length >= 4, 15000);
  log('wave1 seen:', ghosts().length);
  // giết đợt 1: đứng yên spam attack (hồn tự đuổi tới)
  const t0 = Date.now();
  while (Date.now() - t0 < 30000 && ghosts().filter((m) => m.hp > 0).length) { socket.emit('player_attack'); await sleep(400); }
  log('wave1 cleared, merged ghosts now:', ghosts().length);
  log('--- theo dõi 45s quanh đợt 2 ---');
  for (let i = 0; i < 45; i++) { await sleep(1000); log('merged uhon count =', ghosts().length, 'hp=', ghosts().map((m) => m.hp).join(','), 'hidden=', ghosts().map((m) => m.hidden).join(',')); }
  socket.disconnect();
  await stopServer();
  process.exit(0);
})().catch(async (e) => { console.error('DBG CRASH', e); await stopServer(); process.exit(2); });
