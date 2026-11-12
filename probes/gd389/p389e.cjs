// Probe GĐ389e — NHỊP ĐÒN theo TỈ LỆ tốc độ vũ khí (chân 7a đo lại đúng
// cơ chế): cd_server = 350ms × speedK × (1 − cdrOf), speedK = NHANH 0,625 /
// TRUNG 1,0. Kỳ vọng: cotnhan ≈ songdao (cùng nhanh), cotnhan ≈ 0,625 ×
// cotcung (trung). Cả 3 nhân vật cùng chỉ số (tocDo 60 → cdrOf 0,15):
// cd kỳ vọng nhanh ≈ 186ms, trung ≈ 298ms (cộng độ hạt tick/mạng khi đo).
// Cách đo: đứng yên giữa bầy sói (không rượt theo quái — sói tự vây lấy
// người), spam player_attack, gom player_attacked của CHÍNH mình.
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const net = require('net');
const ROOT = path.join(__dirname, '..', '..');
const DIR = __dirname;
const { io } = require(path.join(ROOT, 'client/node_modules/socket.io-client'));
const { createMerger } = require(path.join(ROOT, 'client/worldmerge.cjs'));
const CAT = JSON.parse(fs.readFileSync(path.join(ROOT, 'server/data/skills_catalog.json'), 'utf8'));
const IDS = (w) => (CAT.cottu[w] || []).map((s) => s.id);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function waitFor(fn, ms) { const t0 = Date.now(); while (Date.now() - t0 < ms) { const v = fn(); if (v) return v; await sleep(80); } return null; }
function portFree(port) { return new Promise((res) => { const s = net.createServer(); s.once('error', () => res(false)); s.listen(port, () => s.close(() => res(true))); }); }
let serverProc = null, killTimer = null, CUR_PORT = 0;
async function startServer(port, tag) {
  CUR_PORT = port;
  if (!(await portFree(port))) throw new Error('port ban ' + port);
  serverProc = spawn('node', ['server/index.js'], { cwd: ROOT, env: { ...process.env, PORT: String(port), TTT_STORAGE: 'file', TTT_CHAR_FILE: path.join(DIR, 'characters.json'), TTT_ACC_FILE: path.join(DIR, 'accounts.json'), TTT_WORLD_FILE: path.join(DIR, 'world.json'), TTT_SESS_FILE: path.join(DIR, 'sessions.json'), TTT_DAY_REAL_MS: '600000', TTT_TUVI_NEED: '5' }, stdio: ['ignore', 'pipe', 'pipe'] });
  serverProc.stderr.on('data', (d) => { try { fs.appendFileSync(path.join(DIR, 'srv_' + tag + '.log'), d); } catch (e) {} });
  serverProc.stdout.on('data', (d) => { try { fs.appendFileSync(path.join(DIR, 'srv_' + tag + '.log'), d); } catch (e) {} });
  killTimer = setTimeout(() => { try { serverProc.kill('SIGKILL'); } catch (e) {} }, 900000);
  const t0 = Date.now();
  while (Date.now() - t0 < 90000) { try { const r = await fetch(`http://127.0.0.1:${port}/api/status`); if (r.ok) { clearTimeout(killTimer); killTimer = null; return; } } catch (e) {} await sleep(400); }
  throw new Error('server khong len');
}
async function stopServer() { if (!serverProc) return; const p = serverProc; serverProc = null; if (killTimer) { clearTimeout(killTimer); killTimer = null; } await new Promise((res) => { const t = setTimeout(() => { try { p.kill('SIGKILL'); } catch (e) {} res(); }, 4000); p.once('exit', () => { clearTimeout(t); res(); }); try { p.kill('SIGTERM'); } catch (e) { clearTimeout(t); res(); } }); const t0 = Date.now(); while (Date.now() - t0 < 10000 && !(await portFree(CUR_PORT))) await sleep(300); }
const LC1 = { elements: ['kim'], main: 'kim', count: 1, mutations: [] };
const TANK = { khiHuyet: 5000, vatCong: 300, vatPhong: 1500, phapCong: 300, phapPhong: 1500, tocDo: 60, minhMan: 100 };
function BASE(token, name, extra) {
  return Object.assign({ token, name, classId: 'cottu', gender: 'nam', race: null, geo175: 1, realm: 'kd', tier: 1, x: 2415, y: 1400, mapId: 'lang_tan_thu', hp: 999999, mp: 9999, lifespan: 500, birthDay: -5660, ageStart: 16, stats: { ...TANK }, statPoints: 0, freePoints: 0, tuVi: 99999, stones: 100000, stonesTrung: 0, stonesThuong: 0, stonesCuc: 0, inventory: {}, gearBag: {}, equipped: [], skills: [], job: null, job2: null, job3: null, linhCan: { ...LC1 }, affinity: {}, affV2: 1, bonds: {}, quests: {}, questsDone: {}, flags: {}, counters: {}, disciples: [], foundInvites: [], reformIn: [], sectTech: [], sectArts: [], sectArtsActive: [], mails: [], classRes: {}, food: 100, water: 100 }, extra || {});
}
let pass = 0, fail = 0;
function ok(name, cond, extra) { if (cond) { pass++; console.log('PASS | ' + name); } else { fail++; console.log('FAIL | ' + name + (extra ? ' | ' + extra : '')); } }
function info(name, val) { console.log('INFO | ' + name + ' | ' + val); }
function connect(token) {
  const socket = io(`http://127.0.0.1:${CUR_PORT}`, { transports: ['websocket'] });
  const ctx = { socket, merger: createMerger(), state: null, welcome: null, atkEv: [], myName: null };
  socket.on('connect', () => socket.emit('hello', { token }));
  socket.on('welcome', (w) => { ctx.welcome = w; ctx.myName = (w.character || {}).name; });
  socket.on('player_attacked', (e) => ctx.atkEv.push({ t: Date.now(), id: e.id }));
  socket.on('server_tick', (t) => { const st = ctx.merger(t); if (st) ctx.state = st; });
  return ctx;
}
const meOf = (c) => { if (!c.state || !c.state.players) return null; return c.state.players.find((p) => p.name === c.myName) || null; };
const monsOf = (c) => (c.state && c.state.monsters) || [];
const median = (a) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : 0; };
async function waitStableMons(c, min) {
  let last = -1, stable = 0; const t0 = Date.now();
  while (Date.now() - t0 < 25000) { const n = monsOf(c).length; if (n >= (min || 10) && n === last) { stable++; if (stable >= 3) return n; } else stable = 0; last = n; await sleep(1000); }
  return last;
}
async function measureCadence(c, label) {
  const me0 = await waitFor(() => meOf(c), 8000); const myId = me0 && me0.id;
  // đi tới con sói gần nhất, đứng sát 30px
  const w = monsOf(c).filter((m) => m.kind === 'wolf' && m.hp > 0).sort((a, b) => Math.hypot(a.x - me0.x, a.y - me0.y) - Math.hypot(b.x - me0.x, b.y - me0.y))[0];
  if (w) {
    const t0 = Date.now();
    while (Date.now() - t0 < 25000) {
      const live = monsOf(c).find((m) => m.id === w.id); const me = meOf(c);
      if (!live || !me) break;
      const d = Math.hypot(live.x - me.x, live.y - me.y);
      if (d <= 32) break;
      c.socket.emit('client_input', { vx: (live.x - me.x) / d, vy: (live.y - me.y) / d });
      await sleep(110);
    }
    c.socket.emit('client_input', { vx: 0, vy: 0 });
  }
  await sleep(400);
  c.atkEv.length = 0;
  const spam = setInterval(() => { c.socket.emit('player_attack'); }, 100);
  await sleep(8000);
  clearInterval(spam);
  const times = c.atkEv.filter((e) => e.id === myId).map((e) => e.t);
  const ivs = []; for (let i = 1; i < times.length; i++) ivs.push((times[i] - times[i - 1]) / 1000);
  // loại khoảng chết người (mất mục tiêu > 2 nhịp): giữ các khoảng <= 0.9s để tính nhịp thuần
  const tight = ivs.filter((v) => v <= 0.9);
  info(label, `events=${times.length} all=${JSON.stringify(ivs.map((v) => +v.toFixed(3)))} tightMed=${median(tight)}`);
  return { n: times.length, med: median(tight), tightN: tight.length };
}
function writeStore(chars) {
  for (const f of ['characters.json', 'accounts.json', 'world.json', 'sessions.json']) { try { fs.unlinkSync(path.join(DIR, f)); } catch (e) {} }
  fs.writeFileSync(path.join(DIR, 'characters.json'), JSON.stringify(chars));
  fs.writeFileSync(path.join(DIR, 'accounts.json'), JSON.stringify({}));
}
(async () => {
  const PORT = 3915;
  const chars = {
    gd389nhan1: BASE('gd389nhan1', 'Nhan389', { weaponId: 'cotnhan', skills: IDS('cotnhan'), equipped: ['cottu_cotnhan_co1'] }),
    gd389dao01: BASE('gd389dao01', 'Dao389', { classId: 'satthu', weaponId: 'songdao' }),
    gd389cung1: BASE('gd389cung1', 'Cung389', { weaponId: 'cotcung', skills: IDS('cotcung'), equipped: ['cottu_cotcung_co1'] }),
  };
  writeStore(chars);
  try {
    await startServer(PORT, 'e');
    const B = connect('gd389nhan1'); await waitFor(() => B.welcome, 20000); await waitStableMons(B, 10);
    const rB = await measureCadence(B, 'cotnhan (nhanh)');
    B.socket.disconnect(); await sleep(600);
    const D = connect('gd389dao01'); await waitFor(() => D.welcome, 20000); await waitStableMons(D, 10);
    const rD = await measureCadence(D, 'songdao (nhanh)');
    D.socket.disconnect(); await sleep(600);
    const A = connect('gd389cung1'); await waitFor(() => A.welcome, 20000); await waitStableMons(A, 10);
    const rA = await measureCadence(A, 'cotcung (trung)');
    A.socket.disconnect();
    ok('7a1 Cot Nhan du mau (≥8 don chap nhan)', rB.tightN >= 8, `tightN=${rB.tightN}`);
    ok('7a2 Cot Nhan ≈ Song Dao (ti le 0.85–1.18)', rB.med > 0 && rD.med > 0 && rB.med / rD.med >= 0.85 && rB.med / rD.med <= 1.18, `nhan=${rB.med} dao=${rD.med} ratio=${rD.med ? (rB.med / rD.med).toFixed(3) : '?'}`);
    ok('7a3 Cot Nhan/Cot Cung ≈ 0.625 (0.50–0.78)', rB.med > 0 && rA.med > 0 && rB.med / rA.med >= 0.50 && rB.med / rA.med <= 0.78, `nhan=${rB.med} cung=${rA.med} ratio=${rA.med ? (rB.med / rA.med).toFixed(3) : '?'}`);
    ok('7a4 nhip tuyet doi nhanh ≈186ms (0.14–0.26s)', rB.med >= 0.14 && rB.med <= 0.26, `med=${rB.med}`);
  } catch (e) {
    console.log('PROBE ERROR | ' + (e && e.stack || e)); fail++;
  } finally {
    await stopServer();
    console.log(`\n== GD389e PROBE: PASS ${pass} / FAIL ${fail} ==`);
    process.exit(fail ? 1 : 0);
  }
})();
