// GĐ320 probe bổ sung: 4 chân fail ở p320 — N4a (điểm tiệm đã scale + từ chối), P2 (trần giao dịch),
// P1 (săn chung — hook đã chuyển đúng chỗ), P5 (buff thiền Hẹn hò với cảnh cao cho hệ số lớn).
process.env.NODE_PATH = process.env.HOME + '/workspace/tap-tanh-tu-tien-mmo/client/node_modules';
require('module').Module._initPaths();
const fs = require('fs'); const path = require('path'); const http = require('http');
const { spawn } = require('child_process'); const net = require('net');
const { io } = require('socket.io-client');
const { createMerger } = require(process.env.HOME + '/workspace/tap-tanh-tu-tien-mmo/client/worldmerge.cjs');
const DIR = __dirname; const PORT = 3542;
for (const f of ['characters_b.json', 'world_b.json', 'sessions_b.json', 'accounts_b.json']) { try { fs.unlinkSync(path.join(DIR, f)); } catch {} }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
function portFree(port) { return new Promise((res) => { const s = net.createServer(); s.once('error', () => res(false)); s.once('listening', () => s.close(() => res(true))); s.listen(port, '127.0.0.1'); }); }
function waitStatus(tries = 90) { return new Promise((resolve, reject) => { let n = 0; const tick = () => { const req = http.get({ host: '127.0.0.1', port: PORT, path: '/api/status', timeout: 1500 }, (r) => { let b = ''; r.on('data', (c) => b += c); r.on('end', () => { try { resolve(JSON.parse(b)); } catch { again(); } }); }); req.on('error', again); req.on('timeout', () => { req.destroy(); again(); }); }; const again = () => { if (++n >= tries) reject(new Error('server khong len')); else setTimeout(tick, 700); }; tick(); }); }
let serverProc = null;
async function startServer() {
  if (!await portFree(PORT)) throw new Error('port ban');
  const env = { ...process.env, PORT: String(PORT), TTT_STORAGE: 'file', TTT_CHAR_FILE: path.join(DIR, 'characters_b.json'), TTT_WORLD_FILE: path.join(DIR, 'world_b.json'), TTT_SESS_FILE: path.join(DIR, 'sessions_b.json'), TTT_ACC_FILE: path.join(DIR, 'accounts_b.json'), TTT_DAY_REAL_MS: '600000', TTT_TUVI_NEED: '5' };
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
    const c = { socket, merger: createMerger(), notices: [], syncs: [], errors: [] };
    socket.on('connect', () => socket.emit('hello', { token }));
    socket.on('welcome', (d) => { c.welcome = d; resolve(c); });
    socket.on('need_character', () => { c.needChar = true; resolve(c); });
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
let pass = 0, fail = 0;
function ok(name, cond, extra = '') { if (cond) { pass++; console.log('PASS | ' + name); } else { fail++; console.log('FAIL | ' + name + ' | ' + extra); } }
const BASE = (token, name, over = {}) => ({ token, name, classId: 'kiemtu', gender: 'nam', robe: '#3a6ea5', weaponId: 'kiem', realm: 'kd', tier: 1, tuVi: 100, hp: 99999, mp: 9999, x: 1565, y: 1252, mapId: 'lang_tan_thu', stats: { khiHuyet: 30, vatCong: 30, vatPhong: 25, phapCong: 10, phapPhong: 20, tocDo: 20, minhMan: 20 }, statPoints: 0, freePoints: 10, inventory: {}, stones: 0, skills: [], skillMastery: {}, counters: {}, achClaimed: [], geo175: 1, gearBag: {}, equipped: [], ageStart: 16, birthDay: 0, lifespan: 100, affV2: 1, linhCan: { main: 'kim', subs: [], purity: 40, quality: 'trung', elements: { kim: 40 }, mutations: [] }, ...over });
const SHOPPT = { x: 2263, y: 1210 }; // điểm client của Tiệm Đan (hs175(1012,541))
const bondSeed = (score, branch = null) => ({ score, branch, pick: null, gainDay: -1, gainAmt: 0, name: '' });
(async () => {
  const store = {
    p3200a03: BASE('p3200a03', 'Khach A3', { x: SHOPPT.x, y: SHOPPT.y, affinity: { npc_dan: -700 }, stones: 5000 }),
    p3200a06: BASE('p3200a06', 'Khach A6', { x: SHOPPT.x, y: SHOPPT.y, stones: 99999 }),
    p3200b01: BASE('p3200b01', 'Ban B1', { x: 3702, y: 687, stats: { khiHuyet: 60, vatCong: 200, vatPhong: 60, phapCong: 10, phapPhong: 40, tocDo: 30, minhMan: 30 } }),
    p3200b02: BASE('p3200b02', 'Ban B2', { x: 3850, y: 700 }),
    p3200e01: BASE('p3200e01', 'Thien E1', { x: 1500, y: 438, realm: 'ht', tier: 9, bonds: { 'p:p3200e02': { ...bondSeed(700, 'tinh'), name: 'Thien E2' } } }),
    p3200e02: BASE('p3200e02', 'Thien E2', { x: 1580, y: 438, realm: 'ht', tier: 9, bonds: { 'p:p3200e01': { ...bondSeed(700, 'tinh'), name: 'Thien E1' } } }),
    p3200e03: BASE('p3200e03', 'Thien E3', { x: 1565, y: 438, realm: 'ht', tier: 9 }),
  };
  fs.writeFileSync(path.join(DIR, 'characters_b.json'), JSON.stringify(store));
  fs.writeFileSync(path.join(DIR, 'world_b.json'), JSON.stringify({ totalMinutes: 480, savedAt: Date.now(), sects: [] }));
  await startServer();
  try {
    // N4a': dung dung diem tiem (da scale) + no -700 -> tu choi
    const a3 = await connect('p3200a03');
    a3.socket.emit('shop_buy', { shopId: 'tiem_dan', itemId: 'dan_hoi_xuan' });
    await sleep(800);
    ok('N4a tiem tu choi giao dich tai dung diem tiem', a3.errors.some((e) => e.includes('từ chối giao dịch')), JSON.stringify(a3.errors));
    a3.socket.disconnect();
    // P2': mua 20 lan -> tran +15
    const a6 = await connect('p3200a06');
    for (let i = 0; i < 20; i++) { a6.socket.emit('shop_buy', { shopId: 'tiem_dan', itemId: 'dan_hoi_xuan' }); await sleep(160); }
    await waitFor(() => { const sy = lastSync(a6); return sy && (sy.affinity?.npc_dan || 0) >= 15 ? sy : null; }, 8000);
    await sleep(800);
    ok('P2 mua duoc o tiem lang (diem da scale) + tran lap lai dung 15', (lastSync(a6)?.affinity?.npc_dan || 0) === 15, 'aff=' + lastSync(a6)?.affinity?.npc_dan + ' err=' + JSON.stringify(a6.errors.slice(0, 2)));
    a6.socket.disconnect();
    // P1': san chung
    const b1 = await connect('p3200b01'); const b2 = await connect('p3200b02');
    await waitFor(() => b1.state && (b1.state.monsters || []).length > 0, 8000);
    let killed = false;
    const t0 = Date.now();
    while (Date.now() - t0 < 60000 && !killed) {
      const me = myPlayer(b1); const b2p = myPlayer(b2);
      const wolves = (b1.state?.monsters || []).filter((mn) => mn.kind === 'wolf' && b2p && Math.hypot(mn.x - b2p.x, mn.y - b2p.y) <= 520);
      if (!me || !wolves.length) { await sleep(400); continue; }
      const w = wolves[0];
      const d = Math.hypot(w.x - me.x, w.y - me.y);
      if (d > 40) b1.socket.emit('client_input', { vx: (w.x - me.x) / (d || 1), vy: (w.y - me.y) / (d || 1) });
      else {
        b1.socket.emit('client_input', { vx: 0, vy: 0 });
        b1.socket.emit('player_attack', {});
        await sleep(900);
        if (!(b1.state?.monsters || []).some((mn) => mn.id === w.id)) killed = true;
      }
      await sleep(250);
    }
    ok('P0 B1 ha soi canh B2', killed);
    const s9 = await waitFor(() => { const sy = lastSync(b1); const b = (sy?.bonds || []).find((x) => x.key === 'p:p3200b02'); return b && b.score >= 1 ? b : null; }, 6000);
    const s10 = await waitFor(() => { const sy = lastSync(b2); const b = (sy?.bonds || []).find((x) => x.key === 'p:p3200b01'); return b && b.score >= 1 ? b : null; }, 6000);
    ok('P1 san chung +1 ca hai phia (guong)', !!s9 && !!s10, 'b1=' + JSON.stringify((lastSync(b1)?.bonds || [])) + ' b2=' + JSON.stringify((lastSync(b2)?.bonds || [])));
    b1.socket.disconnect(); b2.socket.disconnect();
    // P5': thien — canh Hoa Than cho he so lon, thien 45s (qua 1 moc 30s)
    async function medGain(tok) {
      const c = await connect(tok);
      await sleep(1500);
      const pos = myPlayer(c);
      const before = lastSync(c)?.tuVi || 0;
      c.socket.emit('meditate_toggle', {});
      await sleep(45000);
      c.socket.emit('meditate_toggle', {});
      await sleep(1200);
      const after = lastSync(c)?.tuVi || 0;
      console.log(tok + ' spawn=(' + (pos ? Math.round(pos.x) + ',' + Math.round(pos.y) : '?') + ') tuVi ' + before + ' -> ' + after);
      c.socket.disconnect();
      return after - before;
    }
    const e2 = await connect('p3200e02');
    const gBond = await medGain('p3200e01');
    e2.socket.disconnect();
    const gSolo = await medGain('p3200e03');
    console.log('thien: co ban doi +' + gBond + ' | mot minh +' + gSolo);
    ok('P5 thien gan ban doi Hen ho (+10%) lon hon mot minh', gSolo > 0 && gBond > gSolo && gBond / gSolo >= 1.03 && gBond / gSolo <= 1.3, 'bond=' + gBond + ' solo=' + gSolo);
  } catch (e) { console.log('ERR ' + (e && e.stack || e)); }
  finally { await stopServer(); console.log('TONG KET B: ' + pass + ' PASS, ' + fail + ' FAIL'); process.exit(fail ? 1 : 0); }
})();
