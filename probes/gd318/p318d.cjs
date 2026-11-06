// GĐ318-D retest: đệ tử NPC (hp 1) đứng gần golem nhất -> golem cắn đệ tử -> tử nạn mất hẳn.
process.env.NODE_PATH = process.env.HOME + '/workspace/tap-tanh-tu-tien-mmo/client/node_modules';
require('module').Module._initPaths();
const fs = require('fs'); const path = require('path'); const http = require('http');
const { spawn } = require('child_process'); const net = require('net');
const { io } = require('socket.io-client');
const { createMerger } = require(process.env.HOME + '/workspace/tap-tanh-tu-tien-mmo/client/worldmerge.cjs');
const DIR = __dirname; const PORT = 3536;
for (const f of ['characters.json', 'world.json', 'sessions.json', 'accounts.json']) { try { fs.unlinkSync(path.join(DIR, f)); } catch {} }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
function portFree(port) { return new Promise((res) => { const s = net.createServer(); s.once('error', () => res(false)); s.once('listening', () => s.close(() => res(true))); s.listen(port, '127.0.0.1'); }); }
function waitStatus(tries = 90) { return new Promise((resolve, reject) => { let n = 0; const tick = () => { const req = http.get({ host: '127.0.0.1', port: PORT, path: '/api/status', timeout: 1500 }, (r) => { let b = ''; r.on('data', (c) => b += c); r.on('end', () => { try { resolve(JSON.parse(b)); } catch { again(); } }); }); req.on('error', again); req.on('timeout', () => { req.destroy(); again(); }); }; const again = () => { if (++n >= tries) reject(new Error('server khong len')); else setTimeout(tick, 700); }; tick(); }); }
let serverProc = null;
async function startServer() {
  if (!await portFree(PORT)) throw new Error('port ban');
  const env = { ...process.env, PORT: String(PORT), TTT_STORAGE: 'file', TTT_CHAR_FILE: path.join(DIR, 'characters.json'), TTT_WORLD_FILE: path.join(DIR, 'world.json'), TTT_SESS_FILE: path.join(DIR, 'sessions.json'), TTT_ACC_FILE: path.join(DIR, 'accounts.json'), TTT_DAY_REAL_MS: '600000', TTT_TUVI_NEED: '5', TTT_DISC_DEBUG: '1' };
  serverProc = spawn('node', ['server/index.js'], { cwd: process.env.HOME + '/workspace/tap-tanh-tu-tien-mmo', env, stdio: 'inherit' });
  let killTimer = setTimeout(() => { try { serverProc.kill('SIGKILL'); } catch {} }, 60000);
  serverProc.on('exit', () => clearTimeout(killTimer));
  await waitStatus(); clearTimeout(killTimer);
}
async function stopServer() {
  if (!serverProc) return; const p = serverProc; serverProc = null;
  await new Promise((res) => { const t = setTimeout(() => { try { p.kill('SIGKILL'); } catch {} res(); }, 5000); p.once('exit', () => { clearTimeout(t); res(); }); try { p.kill('SIGTERM'); } catch { clearTimeout(t); res(); } });
  for (let i = 0; i < 40; i++) { if (await portFree(PORT)) return; await sleep(250); }
}
function connect(token) {
  return new Promise((resolve, reject) => {
    const socket = io('http://127.0.0.1:' + PORT, { transports: ['websocket'], reconnection: false });
    const c = { socket, merger: createMerger(), notices: [], syncs: [], errors: [] };
    socket.on('connect', () => socket.emit('hello', { token }));
    socket.on('welcome', (d) => { c.welcome = d; resolve(c); });
    socket.on('server_tick', (t) => { try { c.state = c.merger(t); } catch {} });
    socket.on('notice', (d) => c.notices.push(d.text || ''));
    socket.on('char_sync', (d) => c.syncs.push(d.character || d));
    socket.on('interact_error', (d) => c.errors.push(d.message || ''));
    setTimeout(() => reject(new Error('connect timeout')), 15000);
  });
}
const lastSync = (c) => c.syncs[c.syncs.length - 1] || c.welcome?.character;
async function waitFor(fn, ms = 10000, step = 200) { const t0 = Date.now(); while (Date.now() - t0 < ms) { const v = fn(); if (v) return v; await sleep(step); } return null; }
function myPlayer(c) { return c.state?.players?.find((p) => p.id === c.welcome?.id) || null; }
(async () => {
  const char = { token: 'p318dd006', name: 'Su Phu D3', classId: 'kiemtu', gender: 'nam', robe: '#3a6ea5', weaponId: 'kiem', realm: 'kd', tier: 1, tuVi: 100, hp: 99999, mp: 9999, x: 5702, y: 1232, mapId: 'lang_tan_thu', stats: { khiHuyet: 30, vatCong: 30, vatPhong: 25, phapCong: 10, phapPhong: 20, tocDo: 20, minhMan: 20 }, statPoints: 0, freePoints: 10, inventory: {}, stones: 0, skills: [], skillMastery: {}, counters: {}, achClaimed: [], geo175: 1, gearBag: {}, equipped: [], ageStart: 16, birthDay: 0, lifespan: 100, linhCan: { main: 'kim', subs: [], purity: 40, quality: 'trung', elements: { kim: 40 }, mutations: [] }, disciples: [{ type: 'npc', name: 'De Tu D3', tilt: 'kiemtu', gender: 'nam', level: 1, tamDac: 0, skills: [], lastPointDay: -1, medFrac: 0, hp: 1 }] };
  fs.writeFileSync(path.join(DIR, 'characters.json'), JSON.stringify({ p318dd006: char }));
  fs.writeFileSync(path.join(DIR, 'world.json'), JSON.stringify({ totalMinutes: 480, savedAt: Date.now(), sects: [] }));
  await startServer();
  let ok = false;
  try {
    const c = await connect('p318dd006');
    await waitFor(() => myPlayer(c) && (c.state?.monsters || []).length > 0, 8000);
    console.log('cho de tu danh huyet lang o Thach Lam...');
    const t1 = Date.now();
    while (Date.now() - t1 < 60000) {
      const ent = (c.state?.players || []).find((p) => p.disc === 'Su Phu D3');
      const allD = (c.state?.players || []).filter((p) => p.disc === 'Su Phu D3');
      if (allD.length !== 1) console.log('  SO ENTITY DE TU: ' + allD.length + ' -> ' + allD.map((p) => p.id + '@hp' + p.hp).join(' | '));
      const me2 = myPlayer(c);
      const g2 = (c.state?.monsters || []).find((mn) => mn.kind === 'huyetlang');
      const sy = lastSync(c);
      console.log('t+' + Math.round((Date.now() - t1) / 1000) + 's me=' + (me2 ? Math.round(me2.x) + ',' + Math.round(me2.y) : '?') + ' detu=' + (ent ? Math.round(ent.x) + ',' + Math.round(ent.y) + ' hp=' + ent.hp : 'MAT') + ' hl=' + (g2 ? Math.round(g2.x) + ',' + Math.round(g2.y) + ' hp=' + g2.hp : 'CHET') + ' syncCount=' + (sy?.disciples || []).length);
      if (sy && (sy.disciples || []).length === 0) { ok = true; break; }
      await sleep(2000);
    }
    console.log('notices:', JSON.stringify(c.notices.filter((n) => n.includes('tử'))));
    console.log(ok ? 'PASS | D1r de tu NPC tu nan mat han' : 'FAIL | D1r de tu van song');
    c.socket.disconnect();
  } catch (e) { console.log('ERR ' + (e && e.stack || e)); }
  finally { await stopServer(); process.exit(ok ? 0 : 1); }
})();
