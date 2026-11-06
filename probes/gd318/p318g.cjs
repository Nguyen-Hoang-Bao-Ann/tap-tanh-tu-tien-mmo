// GĐ318-G retest: đệ tử đột phá Kim Đan giữa chừng -> thành tài (thư + dấu graduated cho sư phụ).
process.env.NODE_PATH = process.env.HOME + '/workspace/tap-tanh-tu-tien-mmo/client/node_modules';
require('module').Module._initPaths();
const fs = require('fs'); const path = require('path'); const http = require('http');
const { spawn } = require('child_process'); const net = require('net');
const { io } = require('socket.io-client');
const { createMerger } = require(process.env.HOME + '/workspace/tap-tanh-tu-tien-mmo/client/worldmerge.cjs');
const DIR = __dirname; const PORT = 3537;
for (const f of ['characters.json', 'world.json', 'sessions.json', 'accounts.json']) { try { fs.unlinkSync(path.join(DIR, f)); } catch {} }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
function portFree(port) { return new Promise((res) => { const s = net.createServer(); s.once('error', () => res(false)); s.once('listening', () => s.close(() => res(true))); s.listen(port, '127.0.0.1'); }); }
function waitStatus(tries = 90) { return new Promise((resolve, reject) => { let n = 0; const tick = () => { const req = http.get({ host: '127.0.0.1', port: PORT, path: '/api/status', timeout: 1500 }, (r) => { let b = ''; r.on('data', (c) => b += c); r.on('end', () => { try { resolve(JSON.parse(b)); } catch { again(); } }); }); req.on('error', again); req.on('timeout', () => { req.destroy(); again(); }); }; const again = () => { if (++n >= tries) reject(new Error('server khong len')); else setTimeout(tick, 700); }; tick(); }); }
let serverProc = null;
async function startServer() {
  if (!await portFree(PORT)) throw new Error('port ban');
  const env = { ...process.env, PORT: String(PORT), TTT_STORAGE: 'file', TTT_CHAR_FILE: path.join(DIR, 'characters.json'), TTT_WORLD_FILE: path.join(DIR, 'world.json'), TTT_SESS_FILE: path.join(DIR, 'sessions.json'), TTT_ACC_FILE: path.join(DIR, 'accounts.json'), TTT_DAY_REAL_MS: '600000', TTT_TUVI_NEED: '5' };
  serverProc = spawn('node', ['server/index.js'], { cwd: process.env.HOME + '/workspace/tap-tanh-tu-tien-mmo', env, stdio: ['ignore', 'pipe', 'pipe'] });
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
    const c = { socket, merger: createMerger(), notices: [], syncs: [], errors: [], mails: [] };
    socket.on('connect', () => socket.emit('hello', { token }));
    socket.on('welcome', (d) => { c.welcome = d; resolve(c); });
    socket.on('need_character', () => { c.needChar = true; resolve(c); });
    socket.on('server_tick', (t) => { try { c.state = c.merger(t); } catch {} });
    socket.on('notice', (d) => c.notices.push(d.text || ''));
    socket.on('char_sync', (d) => c.syncs.push(d.character || d));
    socket.on('interact_error', (d) => c.errors.push(d.message || ''));
    socket.on('error_msg', (d) => c.errors.push(d.text || ''));
    socket.on('mail_state', (d) => c.mails.push(d));
    setTimeout(() => reject(new Error('connect timeout')), 15000);
  });
}
const lastSync = (c) => c.syncs[c.syncs.length - 1] || c.welcome?.character;
async function waitFor(fn, ms = 10000, step = 200) { const t0 = Date.now(); while (Date.now() - t0 < ms) { const v = fn(); if (v) return v; await sleep(step); } return null; }
function myPlayer(c) { return c.state?.players?.find((p) => p.id === c.welcome?.id) || null; }
const BASE = (token, name, over = {}) => ({ token, name, classId: 'kiemtu', gender: 'nam', robe: '#3a6ea5', weaponId: 'kiem', realm: 'kd', tier: 1, tuVi: 100, hp: 99999, mp: 9999, x: 1565, y: 1252, mapId: 'lang_tan_thu', stats: { khiHuyet: 30, vatCong: 30, vatPhong: 25, phapCong: 10, phapPhong: 20, tocDo: 20, minhMan: 20 }, statPoints: 0, freePoints: 10, inventory: {}, stones: 0, skills: [], skillMastery: {}, counters: {}, achClaimed: [], geo175: 1, gearBag: {}, equipped: [], ageStart: 16, birthDay: 0, lifespan: 100, linhCan: { main: 'kim', subs: [], purity: 40, quality: 'trung', elements: { kim: 40 }, mutations: [] }, ...over });
(async () => {
  const store = {
    p318mstr02: BASE('p318mstr02', 'Su Phu Hai', { disciples: [{ type: 'player', key: 'p318grad01', name: 'De Tu Tot Nghiep', graduated: false, lastPointDay: -1 }] }),
    p318grad01: BASE('p318grad01', 'De Tu Tot Nghiep', { realm: 'tc', tier: 9, tuVi: 999999, x: 1565, y: 1010, stats: { khiHuyet: 80, vatCong: 200, vatPhong: 80, phapCong: 10, phapPhong: 60, tocDo: 40, minhMan: 40 }, inventory: { dan_ket_dan: 10 }, masterInfo: { key: 'p318mstr02', name: 'Su Phu Hai', graduated: false } }),
  };
  fs.writeFileSync(path.join(DIR, 'characters.json'), JSON.stringify(store));
  fs.writeFileSync(path.join(DIR, 'world.json'), JSON.stringify({ totalMinutes: 480, savedAt: Date.now(), sects: [{ id: 'sectB', name: 'Tông B', intro: '', fund: 0, applicants: [], members: [{ token: 'p318mstr02', name: 'Su Phu Hai', role: 'chu' }] }] }));
  await startServer();
  let g1 = false, g2 = false, g3 = false;
  try {
    const cG = await connect('p318grad01');
    for (let attempt = 0; attempt < 3 && !g1; attempt++) {
      cG.socket.emit('start_trial', {});
      const boss = await waitFor(() => (cG.state?.monsters || []).find((mn) => mn.trial === 'kimdan'), 8000);
      console.log('attempt ' + attempt + ' boss=' + (boss ? boss.hp + 'hp @' + boss.x + ',' + boss.y : 'KHONG CO'));
      if (!boss) { console.log('errors:', JSON.stringify(cG.errors)); continue; }
      const t0 = Date.now(); let lastLog = 0;
      while (Date.now() - t0 < 90000) {
        const b = (cG.state?.monsters || []).find((mn) => mn.trial === 'kimdan');
        if (!b) break;
        if (Date.now() - lastLog > 10000) { lastLog = Date.now(); console.log('  boss hp=' + b.hp); }
        const me = myPlayer(cG);
        if (me) { const d = Math.hypot(b.x - me.x, b.y - me.y); if (d > 40) cG.socket.emit('client_input', { vx: (b.x - me.x) / (d || 1), vy: (b.y - me.y) / (d || 1) }); else cG.socket.emit('client_input', { vx: 0, vy: 0 }); }
        cG.socket.emit('player_attack', {});
        await sleep(700);
      }
      cG.socket.emit('client_input', { vx: 0, vy: 0 });
      cG.socket.emit('breakthrough', {});
      const kd = await waitFor(() => { const sy = lastSync(cG); return sy && sy.realm === 'kd' ? sy : null; }, 6000);
      g1 = !!kd;
      console.log('attempt ' + attempt + ' -> realm=' + (lastSync(cG)?.realm || '?') + ' errors=' + JSON.stringify(cG.errors.slice(-2)));
    }
    console.log(g1 ? 'PASS | G1 dot pha Kim Dan' : 'FAIL | G1 dot pha Kim Dan');
    cG.socket.disconnect();
    const cM = await connect('p318mstr02');
    const gradG = await waitFor(() => { const sy = lastSync(cM); const e = (sy?.disciples || []).find((x) => x.type === 'player' && x.name === 'De Tu Tot Nghiep'); return e && e.graduated ? sy : null; }, 8000);
    g2 = !!gradG;
    console.log(g2 ? 'PASS | G2 su phu thay de tu da thanh tai' : 'FAIL | G2 | ' + JSON.stringify((lastSync(cM)?.disciples || []).map((e) => e.name + ':' + e.graduated)));
    cM.socket.emit('mail_open', {});
    const mailG = await waitFor(() => cM.mails.find((mm) => (mm.mails || []).some((x) => x.title && x.title.includes('thành tài'))), 6000);
    g3 = !!mailG;
    console.log(g3 ? 'PASS | G3 thu qua thanh tai ve su phu' : 'FAIL | G3 thu qua');
    cM.socket.disconnect();
  } catch (e) { console.log('ERR ' + (e && e.stack || e)); }
  finally { await stopServer(); process.exit(g1 && g2 && g3 ? 0 : 1); }
})();
