// GĐ385b — đo riêng Tinh Hà Phiến với fixture maxHp 4.100 (khiHuyet 400):
// ngưỡng kích 10% = 410 < công quái PH (460–1.879) → cú cắn nào cũng kích được;
// khiên = 12% × 4.100 = 492 → cú cắn kế tiếp bị trừ ~492 (đo rõ qua mẫu máu tick).
// Harness copy đúng p385.cjs (worldmerge merger).
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const net = require('net');
const ROOT = path.join(__dirname, '..', '..');
const DIR = path.join(__dirname, 'fixtures_b');
const { io } = require(path.join(ROOT, 'client/node_modules/socket.io-client'));
const { createMerger } = require(path.join(ROOT, 'client/worldmerge.cjs'));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function waitFor(fn, ms) { const t0 = Date.now(); while (Date.now() - t0 < ms) { const v = fn(); if (v) return v; await sleep(120); } return null; }
function portFree(port) { return new Promise((res) => { const s = net.createServer(); s.once('error', () => res(false)); s.listen(port, () => s.close(() => res(true))); }); }
let serverProc = null, killTimer = null; const CUR_PORT = 3853;
async function startServer() {
  if (!(await portFree(CUR_PORT))) throw new Error('port ban ' + CUR_PORT);
  serverProc = spawn('node', ['server/index.js'], { cwd: ROOT, env: { ...process.env, PORT: String(CUR_PORT), TTT_STORAGE: 'file', TTT_CHAR_FILE: path.join(DIR, 'characters.json'), TTT_ACC_FILE: path.join(DIR, 'accounts.json'), TTT_WORLD_FILE: path.join(DIR, 'world.json'), TTT_SESS_FILE: path.join(DIR, 'sessions.json'), TTT_DAY_REAL_MS: '600000', TTT_TUVI_NEED: '5' }, stdio: ['ignore', 'pipe', 'pipe'] });
  serverProc.stderr.on('data', (d) => { try { fs.appendFileSync(path.join(DIR, 'srv.log'), d); } catch (e) {} });
  serverProc.stdout.on('data', (d) => { try { fs.appendFileSync(path.join(DIR, 'srv.log'), d); } catch (e) {} });
  killTimer = setTimeout(() => { try { serverProc.kill('SIGKILL'); } catch (e) {} }, 300000);
  const t0 = Date.now();
  while (Date.now() - t0 < 90000) { try { const r = await fetch(`http://127.0.0.1:${CUR_PORT}/api/status`); if (r.ok) { clearTimeout(killTimer); return; } } catch (e) {} await sleep(400); }
  throw new Error('server khong len');
}
async function stopServer() { if (!serverProc) return; const p = serverProc; serverProc = null; if (killTimer) { clearTimeout(killTimer); killTimer = null; } await new Promise((res) => { const t = setTimeout(() => { try { p.kill('SIGKILL'); } catch (e) {} res(); }, 4000); p.once('exit', () => { clearTimeout(t); res(); }); try { p.kill('SIGTERM'); } catch (e) { clearTimeout(t); res(); } }); const t0 = Date.now(); while (Date.now() - t0 < 10000 && !(await portFree(CUR_PORT))) await sleep(300); }
let pass = 0, fail = 0;
function ok(name, cond, extra) { if (cond) { pass++; console.log('PASS | ' + name); } else { fail++; console.log('FAIL | ' + name + (extra ? ' | ' + extra : '')); } }
function connect(token) {
  const socket = io(`http://127.0.0.1:${CUR_PORT}`, { transports: ['websocket'] });
  const ctx = { socket, merger: createMerger(), state: null, welcome: null, syncs: [], procs: [], myName: null, myId: null };
  socket.on('connect', () => socket.emit('hello', { token }));
  socket.on('welcome', (w) => { ctx.welcome = w; ctx.myName = (w.character || {}).name; ctx.myId = w.id; });
  socket.on('char_sync', (s) => ctx.syncs.push(s));
  socket.on('phapbao_proc', (e) => { if (e.id === ctx.myId) ctx.procs.push({ t: Date.now(), art: e.art, targetId: e.targetId }); });
  socket.on('server_tick', (t) => { const st = ctx.merger(t); if (st) ctx.state = st; });
  return ctx;
}
const lastChar = (c) => c.syncs[c.syncs.length - 1] || (c.welcome && c.welcome.character) || null;
const meOf = (c) => { const st = c.state; if (!st || !st.players) return null; return st.players.find((p) => p.id === c.myId) || st.players.find((p) => p.name === c.myName) || null; };
const monsOf = (c) => (c.state && c.state.monsters) || [];
async function steerStep(c, tx, ty, tol) {
  const me = meOf(c); if (!me) return false;
  const dx = tx - me.x, dy = ty - me.y, d = Math.hypot(dx, dy);
  if (d <= tol) { c.socket.emit('client_input', { vx: 0, vy: 0 }); return true; }
  c.socket.emit('client_input', { vx: dx / d, vy: dy / d }); return false;
}
(async () => {
  try {
    fs.mkdirSync(DIR, { recursive: true });
    const LC1 = { elements: ['kim'], main: 'kim', count: 1, mutations: [] };
    const char = { token: 'pb385phien2', name: 'PB385Phien2', classId: 'kiemtu', gender: 'nam', race: null, geo175: 1, realm: 'ph', tier: 1, x: 3500, y: 3500, mapId: 'phan_hu_nguyen', hp: 999999, mp: 9999, lifespan: 500, birthDay: -5660, ageStart: 16, stats: { khiHuyet: 400, vatCong: 10, vatPhong: 0, phapCong: 10, phapPhong: 0, tocDo: 60, minhMan: 100 }, statPoints: 0, freePoints: 0, tuVi: 99999, stones: 100000, stonesTrung: 0, stonesThuong: 5000, stonesCuc: 0, inventory: { tinh_ha_thach: 9, loan_vu: 9 }, gearBag: {}, equipped: [], skills: [], job: null, job2: null, job3: null, linhCan: { ...LC1 }, affinity: {}, affV2: 1, bonds: {}, quests: {}, questsDone: {}, flags: {}, counters: {}, disciples: [], foundInvites: [], reformIn: [], sectTech: [], sectArts: [], sectArtsActive: [], mails: [], classRes: {}, food: 100, water: 100, phapBao: { owned: { pb_tinh_ha_phien: 1 }, equipped: 'pb_tinh_ha_phien' } };
    fs.writeFileSync(DIR + '/characters.json', JSON.stringify({ pb385phien2: char }));
    fs.writeFileSync(DIR + '/accounts.json', '{}'); fs.writeFileSync(DIR + '/world.json', '{}'); fs.writeFileSync(DIR + '/sessions.json', '{}');
    await startServer();
    const c = connect('pb385phien2');
    await waitFor(() => c.welcome && lastChar(c) && meOf(c), 30000);
    const samples = [];
    const t0 = Date.now(); let lastSteer = 0;
    while (Date.now() - t0 < 35000) {
      const me = meOf(c);
      if (me) {
        samples.push({ t: Date.now(), hp: me.hp });
        if (Date.now() - lastSteer > 1500) {
          lastSteer = Date.now();
          let best = null, bd = Infinity;
          for (const m of monsOf(c)) { if ((m.hp || 0) <= 0 || m.hidden) continue; const d = Math.hypot(m.x - me.x, m.y - me.y); if (d < bd) { bd = d; best = m; } }
          if (best && bd > 42) await steerStep(c, best.x, best.y, 40); else c.socket.emit('client_input', { vx: 0, vy: 0 });
        }
        if (me.hp <= 0) break;
      }
      await sleep(150);
    }
    c.socket.emit('client_input', { vx: 0, vy: 0 });
    const maxHp = (lastChar(c) || {}).maxHp || 4100;
    const drops = [];
    for (let i = 1; i < samples.length; i++) { const d = samples[i - 1].hp - samples[i].hp; if (d > 0) drops.push({ t: samples[i].t, d }); }
    const procs = c.procs;
    console.log('INFO | maxHp=' + maxHp + ' nguong10%=' + Math.round(maxHp * 0.10) + ' mau=' + samples.length + ' drops=' + JSON.stringify(drops.slice(0, 10)) + ' procs=' + procs.length);
    ok('phiến-B1: đòn ≥10% maxHp kích khiên (có proc)', procs.length >= 1 && drops.some((d) => d.d >= maxHp * 0.10), 'procs=' + procs.length);
    // B2 đo qua LOG SERVER (số từng cú cắn chính xác, không qua mẫu tick):
    // tìm 1 quái có cú cắn bị giảm đúng ~khiên (492) so với cú cắn đầy đủ của chính nó.
    c.socket.disconnect();
    await sleep(600);
    let absorbOk = false; let absorbDetail = 'khong doc duoc log';
    try {
      const log = fs.readFileSync(path.join(DIR, 'srv.log'), 'utf8');
      const bites = [];
      for (const line of log.split('\n')) { const m = line.match(/(\S+) cắn PB385Phien2: -(\d+) HP/); if (m) bites.push({ mon: m[1], dmg: parseInt(m[2], 10) }); }
      const shield = Math.round(maxHp * 0.12);
      const byMon = {};
      for (const b of bites) (byMon[b.mon] = byMon[b.mon] || []).push(b.dmg);
      for (const [mon, ds] of Object.entries(byMon)) {
        const full = Math.max(...ds);
        const idx = ds.findIndex((d, i) => i > 0 && Math.abs((full - d) - shield) <= 60);
        if (idx > 0) { absorbOk = true; absorbDetail = `${mon}: day=${full} giam=${ds[idx]} (lech ${(full - ds[idx])} ≈ khien ${shield})`; break; }
      }
      if (!absorbOk) absorbDetail = 'bites=' + JSON.stringify(byMon) + ' khien=' + shield;
    } catch (e) { absorbDetail = e.message; }
    ok('phiến-B2: cú cắn kế bị khiên 12% maxHp hấp thụ (log server: giảm ≈ 492)', absorbOk, absorbDetail);
  } catch (e) { console.log('LỖI:', e.message); fail++; }
  finally { await stopServer(); }
  console.log('\n==== PB385B: ' + pass + ' PASS / ' + fail + ' FAIL ====');
  process.exit(fail ? 1 : 0);
})();
