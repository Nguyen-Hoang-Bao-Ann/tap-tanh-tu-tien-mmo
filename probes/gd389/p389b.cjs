// Probe GĐ389b — đo lại 4 chân của p389 bị nhiễu bởi bot demo + sói đuổi theo:
//  3a tầm xa trúng ~140px · 3b quá tầm 150px không trúng · 7a nhịp đòn Cốt
//  Nhận qua sự kiện player_attacked (chỉ phát khi đòn được chấp nhận) ·
//  7b cận chiến 125px không trúng. Phương pháp: bay tới KHÔNG tắt bay, ra
//  đòn ngay tại thời điểm đo khoảng cách; mục tiêu ưu tiên phía đông bãi
//  farm (xa bầy bot), hp > 60% (không đòi nguyên vẹn).
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
function BASE(token, name, extra) {
  return Object.assign({ token, name, classId: 'cottu', gender: 'nam', race: null, geo175: 1, realm: 'kd', tier: 1, x: 2415, y: 1400, mapId: 'lang_tan_thu', hp: 999999, mp: 9999, lifespan: 500, birthDay: -5660, ageStart: 16, stats: { khiHuyet: 500, vatCong: 300, vatPhong: 200, phapCong: 300, phapPhong: 200, tocDo: 60, minhMan: 100 }, statPoints: 0, freePoints: 0, tuVi: 99999, stones: 100000, stonesTrung: 0, stonesThuong: 0, stonesCuc: 0, inventory: {}, gearBag: {}, equipped: [], skills: [], job: null, job2: null, job3: null, linhCan: { ...LC1 }, affinity: {}, affV2: 1, bonds: {}, quests: {}, questsDone: {}, flags: {}, counters: {}, disciples: [], foundInvites: [], reformIn: [], sectTech: [], sectArts: [], sectArtsActive: [], mails: [], classRes: {}, food: 100, water: 100 }, extra || {});
}
let pass = 0, fail = 0;
function ok(name, cond, extra) { if (cond) { pass++; console.log('PASS | ' + name); } else { fail++; console.log('FAIL | ' + name + (extra ? ' | ' + extra : '')); } }
function info(name, val) { console.log('INFO | ' + name + ' | ' + val); }
function connect(token) {
  const socket = io(`http://127.0.0.1:${CUR_PORT}`, { transports: ['websocket'] });
  const ctx = { socket, merger: createMerger(), state: null, welcome: null, syncs: [], atkEv: [], myName: null };
  socket.on('connect', () => socket.emit('hello', { token }));
  socket.on('welcome', (w) => { ctx.welcome = w; ctx.myName = (w.character || {}).name; });
  socket.on('char_sync', (s) => ctx.syncs.push(s));
  socket.on('player_attacked', (e) => ctx.atkEv.push({ t: Date.now(), id: e.id, targetId: e.targetId }));
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
// Bay tới điểm (KHÔNG tắt bay ở cuối — ra đòn ngay khi vừa tới)
async function flyArrive(c, x, y, tol) {
  c.socket.emit('fly_toggle', {}); await sleep(350);
  const t0 = Date.now();
  while (Date.now() - t0 < 30000) { const me = meOf(c); if (!me) { await sleep(110); continue; } const dx = x - me.x, dy = y - me.y; const d = Math.hypot(dx, dy); if (d <= (tol || 8)) break; c.socket.emit('client_input', { vx: dx / d, vy: dy / d }); await sleep(100); }
  c.socket.emit('client_input', { vx: 0, vy: 0 });
}
async function flyOff(c) { c.socket.emit('fly_toggle', {}); await sleep(400); }
function pickMon(c, kind, minHpRatio, east) {
  const me = meOf(c); if (!me) return null;
  return monsOf(c).filter((m) => m.kind === kind && m.hp > (m.maxHp || 0) * minHpRatio && (!east || m.x > 2900))
    .sort((a, b) => Math.hypot(a.x - me.x, a.y - me.y) - Math.hypot(b.x - me.x, b.y - me.y))[0] || null;
}
function writeStore(chars) {
  for (const f of ['characters.json', 'accounts.json', 'world.json', 'sessions.json']) { try { fs.unlinkSync(path.join(DIR, f)); } catch (e) {} }
  fs.writeFileSync(path.join(DIR, 'characters.json'), JSON.stringify(chars));
  fs.writeFileSync(path.join(DIR, 'accounts.json'), JSON.stringify({}));
}
(async () => {
  const PORT = 3912;
  const chars = {
    gd389cung1: BASE('gd389cung1', 'Cung389', { weaponId: 'cotcung', skills: IDS('cotcung'), equipped: ['cottu_cotcung_co1'] }),
    gd389nhan1: BASE('gd389nhan1', 'Nhan389', { weaponId: 'cotnhan', skills: IDS('cotnhan'), equipped: ['cottu_cotnhan_co1'] }),
  };
  writeStore(chars);
  try {
    await startServer(PORT, 'b');
    const A = connect('gd389cung1');
    await waitFor(() => A.welcome, 20000); await waitStableMons(A, 10);

    // ---- 3a: đòn xa ~140px trúng ----
    let r3a = null;
    for (let t = 0; t < 6 && !r3a; t++) {
      const w = pickMon(A, 'wolf', 0.6, true) || pickMon(A, 'wolf', 0.6, false); if (!w) break;
      await flyArrive(A, w.x + 140, w.y, 6);
      const live = monsOf(A).find((m) => m.id === w.id); const me = meOf(A);
      if (!live || !me) { continue; }
      const dist = Math.hypot(live.x - me.x, live.y - me.y); const before = live.hp;
      A.socket.emit('player_attack');
      let drop = 0; const t0 = Date.now();
      while (Date.now() - t0 < 1500) { const cur = monsOf(A).find((m) => m.id === w.id); if (!cur) { drop = before; break; } if (cur.hp < before) { drop = before - cur.hp; break; } await sleep(90); }
      await flyOff(A);
      info('3a attempt', `dist=${dist.toFixed(0)} drop=${drop}`);
      if (dist >= 100 && dist <= 158 && drop > 0) r3a = { dist, drop };
      await sleep(500);
    }
    ok('3a don thuong Cot Cung ~140px TRUNG (tam 150)', !!r3a, JSON.stringify(r3a));

    // ---- 3b: đòn xa ~218px không trúng ----
    let r3b = null;
    for (let t = 0; t < 6 && !r3b; t++) {
      const w = pickMon(A, 'wolf', 0.6, true) || pickMon(A, 'wolf', 0.6, false); if (!w) break;
      await flyArrive(A, w.x + 218, w.y, 6);
      const live = monsOf(A).find((m) => m.id === w.id); const me = meOf(A);
      if (!live || !me) { continue; }
      const dist = Math.hypot(live.x - me.x, live.y - me.y); const before = live.hp;
      A.socket.emit('player_attack');
      await sleep(1500);
      const cur = monsOf(A).find((m) => m.id === w.id);
      await flyOff(A);
      info('3b attempt', `dist=${dist.toFixed(0)} before=${before} after=${cur ? cur.hp : 'dead'}`);
      if (dist >= 175 && cur && cur.hp >= before) r3b = { dist, before, after: cur.hp };
      await sleep(500);
    }
    ok('3b don thuong Cot Cung ~218px KHONG trung (qua tam 150)', !!r3b, JSON.stringify(r3b));
    A.socket.disconnect();

    // ---- 7a: nhịp đòn Cốt Nhận qua player_attacked ----
    const B = connect('gd389nhan1');
    await waitFor(() => B.welcome, 20000); await waitStableMons(B, 10);
    const meB = await waitFor(() => meOf(B), 8000);
    const myId = meB && meB.id;
    B.atkEv.length = 0;
    const spam = setInterval(() => { B.socket.emit('player_attack'); }, 110);
    await sleep(6500);
    clearInterval(spam);
    const times = B.atkEv.filter((e) => e.id === myId).map((e) => e.t);
    const ivs = []; for (let i = 1; i < times.length; i++) ivs.push((times[i] - times[i - 1]) / 1000);
    const med = median(ivs);
    info('7a events', `mine=${times.length} intervals=${JSON.stringify(ivs)} med=${med}`);
    ok('7a nhip don Cot Nhan ≈0.5s (0.40–0.72)', ivs.length >= 4 && med >= 0.40 && med <= 0.72, `n=${ivs.length} med=${med}`);

    // ---- 7b: cận chiến 125px không trúng ----
    let r7b = null;
    for (let t = 0; t < 6 && !r7b; t++) {
      const g = pickMon(B, 'golem', 0.6, true) || pickMon(B, 'golem', 0.6, false); if (!g) break;
      await flyArrive(B, g.x + 125, g.y, 6);
      const live = monsOf(B).find((m) => m.id === g.id); const me = meOf(B);
      if (!live || !me) { continue; }
      const dist = Math.hypot(live.x - me.x, live.y - me.y); const before = live.hp;
      B.socket.emit('player_attack');
      await sleep(1300);
      const cur = monsOf(B).find((m) => m.id === g.id);
      await flyOff(B);
      info('7b attempt', `dist=${dist.toFixed(0)} before=${before} after=${cur ? cur.hp : 'dead'}`);
      if (dist >= 100 && cur && cur.hp >= before) r7b = { dist, before, after: cur.hp };
      await sleep(500);
    }
    ok('7b Cot Nhan 125px KHONG trung (tam can chien 65)', !!r7b, JSON.stringify(r7b));
    B.socket.disconnect();
  } catch (e) {
    console.log('PROBE ERROR | ' + (e && e.stack || e)); fail++;
  } finally {
    await stopServer();
    console.log(`\n== GD389b PROBE: PASS ${pass} / FAIL ${fail} ==`);
    process.exit(fail ? 1 : 0);
  }
})();
