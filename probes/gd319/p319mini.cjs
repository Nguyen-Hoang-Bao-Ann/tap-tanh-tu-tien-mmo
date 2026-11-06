// Mini debug GĐ319: dialog quansu + fight gate K
process.env.NODE_PATH = process.env.HOME + '/workspace/tap-tanh-tu-tien-mmo/client/node_modules';
require('module').Module._initPaths();
const fs = require('fs'); const path = require('path'); const http = require('http');
const { spawn } = require('child_process'); const net = require('net');
const { io } = require('socket.io-client');
const { createMerger } = require(process.env.HOME + '/workspace/tap-tanh-tu-tien-mmo/client/worldmerge.cjs');
const DIR = __dirname; const PORT = 3547;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
function portFree(port) { return new Promise((res) => { const s = net.createServer(); s.once('error', () => res(false)); s.once('listening', () => s.close(() => res(true))); s.listen(port, '127.0.0.1'); }); }
function waitStatus(tries = 90) { return new Promise((resolve, reject) => { let n = 0; const tick = () => { const req = http.get({ host: '127.0.0.1', port: PORT, path: '/api/status', timeout: 1500 }, (r) => { let b = ''; r.on('data', (c) => b += c); r.on('end', () => { try { resolve(JSON.parse(b)); } catch { again(); } }); }); req.on('error', again); req.on('timeout', () => { req.destroy(); again(); }); }; const again = () => { if (++n >= tries) reject(new Error('no server')); else setTimeout(tick, 700); }; tick(); }); }
let serverProc = null;
async function startServer() {
  const env = { ...process.env, PORT: String(PORT), TTT_STORAGE: 'file', TTT_CHAR_FILE: path.join(DIR, 'characters.json'), TTT_WORLD_FILE: path.join(DIR, 'world.json'), TTT_SESS_FILE: path.join(DIR, 'sessions.json'), TTT_ACC_FILE: path.join(DIR, 'accounts.json'), TTT_DAY_REAL_MS: '600000', TTT_TUVI_NEED: '5' };
  serverProc = spawn('node', ['server/index.js'], { cwd: process.env.HOME + '/workspace/tap-tanh-tu-tien-mmo', env, stdio: ['ignore', 'pipe', 'pipe'] });
  serverProc.stderr.on('data', (d) => process.stdout.write('[srv] ' + d));
  let killTimer = setTimeout(() => { try { serverProc.kill('SIGKILL'); } catch {} }, 60000);
  serverProc.on('exit', () => clearTimeout(killTimer));
  await waitStatus(); clearTimeout(killTimer);
}
async function stopServer() { if (!serverProc) return; const p = serverProc; serverProc = null; await new Promise((res) => { const t = setTimeout(() => { try { p.kill('SIGKILL'); } catch {} res(); }, 5000); p.once('exit', () => { clearTimeout(t); res(); }); try { p.kill('SIGTERM'); } catch { clearTimeout(t); res(); } }); for (let i = 0; i < 40; i++) { if (await portFree(PORT)) return; await sleep(250); } }
function connect(token) {
  return new Promise((resolve, reject) => {
    const socket = io('http://127.0.0.1:' + PORT, { transports: ['websocket'], reconnection: false });
    const c = { socket, merger: createMerger(), errors: [], dialogs: [], syncs: [] };
    socket.on('connect', () => socket.emit('hello', { token }));
    socket.on('welcome', (d) => { c.welcome = d; resolve(c); });
    socket.on('server_tick', (t) => { try { c.state = c.merger(t); } catch {} });
    socket.on('interact_error', (d) => c.errors.push(d.message || ''));
    socket.on('npc_dialog', (d) => c.dialogs.push(d));
    socket.on('char_sync', (d) => c.syncs.push(d.character || d));
    setTimeout(() => reject(new Error('timeout')), 15000);
  });
}
const BASE = (token, name, over = {}) => ({ token, name, classId: 'kiemtu', gender: 'nam', robe: '#3a6ea5', weaponId: 'kiem', realm: 'lk', tier: 1, tuVi: 100, hp: 99999, mp: 9999, x: 1252, y: 880, mapId: 'lang_tan_thu', stats: { khiHuyet: 30, vatCong: 30, vatPhong: 25, phapCong: 10, phapPhong: 20, tocDo: 20, minhMan: 20 }, statPoints: 0, freePoints: 10, inventory: {}, stones: 0, skills: [], skillMastery: {}, counters: {}, achClaimed: [], geo175: 1, gearBag: {}, equipped: [], ageStart: 16, birthDay: 0, lifespan: 100, affV2: 1, linhCan: { main: 'kim', subs: [], purity: 40, quality: 'trung', elements: { kim: 40 }, mutations: [] }, ...over });
(async () => {
  const store = {
    p3190a01: BASE('p3190a01', 'Lanh Chu A', { realm: 'na', stonesTrung: 100000 }),
    p3190k01: BASE('p3190k01', 'Thieu Canh K', { realm: 'kd', x: 1252, y: 950 }),
  };
  fs.writeFileSync(path.join(DIR, 'characters.json'), JSON.stringify(store));
  fs.writeFileSync(path.join(DIR, 'world.json'), JSON.stringify({ totalMinutes: 480, savedAt: Date.now(), sects: [] }));
  await startServer();
  try {
    const A = await connect('p3190a01'); const K = await connect('p3190k01');
    await sleep(1500);
    const npcs = (A.state?.npcs || []).map((n) => n.id + '@' + Math.round(n.x) + ',' + Math.round(n.y));
    console.log('NPCS in tick:', npcs.filter((x) => x.includes('quansu') || x.includes('master')).join(' | ') || '(none matched)');
    console.log('A pos:', JSON.stringify((A.state?.players || []).find((p) => p.id === A.welcome.id)));
    A.socket.emit('talk_npc', { npcId: 'npc_quansu' });
    await sleep(1500);
    const d = A.dialogs.find((x) => x.npcId === 'npc_quansu');
    console.log('dialog found:', !!d, 'sectFoundInfo:', JSON.stringify(d && d.sectFoundInfo));
    K.socket.emit('sect_found_fight');
    await sleep(1500);
    console.log('K errors:', JSON.stringify(K.errors));
    A.socket.disconnect(); K.socket.disconnect();
  } catch (e) { console.log('ERR', e); }
  await stopServer();
  process.exit(0);
})();
