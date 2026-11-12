// Probe GĐ389c — đo lại 2 chân: 3b (quá tầm xa không trúng) + 7a (nhịp đòn
// Cốt Nhận 0,5s). Rút kinh nghiệm p389b: sói luôn lao về phía người chơi
// nên khoảng cách "đứng yên" không tồn tại — 3b phải ra đòn NGAY khi
// khoảng cách sống đi qua dải [160,260] trong lúc bay tiếp cận; 7a phải
// đứng sát bầy sói trước khi spam đòn (quảng trường làng không có quái
// trong 65px → đòn hụt không phát player_attacked).
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
  const PORT = 3914;
  const chars = {
    gd389cung1: BASE('gd389cung1', 'Cung389', { weaponId: 'cotcung', skills: IDS('cotcung'), equipped: ['cottu_cotcung_co1'] }),
    gd389nhan1: BASE('gd389nhan1', 'Nhan389', { weaponId: 'cotnhan', skills: IDS('cotnhan'), equipped: ['cottu_cotnhan_co1'], stats: { khiHuyet: 5000, vatCong: 300, vatPhong: 1500, phapCong: 300, phapPhong: 1500, tocDo: 60, minhMan: 100 } }),
  };
  writeStore(chars);
  try {
    await startServer(PORT, 'd');
    // ---- 3b: bắn ngay khi khoảng cách sống qua dải [160,260] ----
    const A = connect('gd389cung1');
    await waitFor(() => A.welcome, 20000); await waitStableMons(A, 10);
    let r3b = null;
    for (let t = 0; t < 5 && !r3b; t++) {
      const w = pickMon(A, 'wolf', 0.6, true) || pickMon(A, 'wolf', 0.6, false); if (!w) break;
      A.socket.emit('fly_toggle', {}); await sleep(350);
      let fired = null;
      const t0 = Date.now();
      while (Date.now() - t0 < 25000 && !fired) {
        const live = monsOf(A).find((m) => m.id === w.id); const me = meOf(A);
        if (!live || !me) break;
        const dist = Math.hypot(live.x - me.x, live.y - me.y);
        if (dist >= 160 && dist <= 260) { A.socket.emit('player_attack'); fired = { dist, before: live.hp, id: w.id }; break; }
        const tx = live.x + 240, ty = live.y; const d2 = Math.hypot(tx - me.x, ty - me.y);
        if (d2 > 12) A.socket.emit('client_input', { vx: (tx - me.x) / d2, vy: (ty - me.y) / d2 }); else A.socket.emit('client_input', { vx: 0, vy: 0 });
        await sleep(90);
      }
      A.socket.emit('client_input', { vx: 0, vy: 0 });
      if (fired) {
        await sleep(1500);
        const cur = monsOf(A).find((m) => m.id === fired.id);
        info('3b fired', `dist=${fired.dist.toFixed(0)} before=${fired.before} after=${cur ? cur.hp : 'dead'}`);
        if (cur && cur.hp >= fired.before) r3b = fired;
      }
      A.socket.emit('fly_toggle', {}); await sleep(500);
    }
    ok('3b don thuong Cot Cung o 160–260px KHONG trung (tam 150)', !!r3b, JSON.stringify(r3b));
    A.socket.disconnect();

    // ---- 7a: đứng sát sói rồi spam đòn, đo player_attacked của chính mình ----
    const B = connect('gd389nhan1');
    await waitFor(() => B.welcome, 20000); await waitStableMons(B, 10);
    const meB = await waitFor(() => meOf(B), 8000); const myId = meB && meB.id;
    // tiếp cận 1 con sói khoẻ, đứng sát 30px (đi bộ thường, không bay)
    {
      const w = pickMon(B, 'wolf', 0.5, false);
      if (w) {
        const t0 = Date.now();
        while (Date.now() - t0 < 25000) {
          const live = monsOf(B).find((m) => m.id === w.id); const me = meOf(B);
          if (!live || !me) break;
          const d = Math.hypot(live.x - me.x, live.y - me.y);
          if (d <= 34) break;
          B.socket.emit('client_input', { vx: (live.x - me.x) / d, vy: (live.y - me.y) / d });
          await sleep(110);
        }
        B.socket.emit('client_input', { vx: 0, vy: 0 });
      }
    }
    await sleep(300);
    B.atkEv.length = 0;
    const spam = setInterval(() => { B.socket.emit('player_attack'); }, 110);
    // trong lúc spam: nếu không còn quái nào trong 70px quá 1,2s thì đi tiếp cận lại con gần nhất
    const tEnd = Date.now() + 7000; let lastNear = Date.now();
    while (Date.now() < tEnd) {
      const me = meOf(B);
      const near = me && monsOf(B).some((m) => Math.hypot(m.x - me.x, m.y - me.y) <= 70);
      if (near) lastNear = Date.now();
      else if (Date.now() - lastNear > 1200 && me) {
        const w = monsOf(B).filter((m) => m.hp > 0).sort((a, b) => Math.hypot(a.x - me.x, a.y - me.y) - Math.hypot(b.x - me.x, b.y - me.y))[0];
        if (w) { const d = Math.hypot(w.x - me.x, w.y - me.y); if (d > 1) B.socket.emit('client_input', { vx: (w.x - me.x) / d, vy: (w.y - me.y) / d }); }
      } else if (me) B.socket.emit('client_input', { vx: 0, vy: 0 });
      await sleep(150);
    }
    clearInterval(spam); B.socket.emit('client_input', { vx: 0, vy: 0 });
    const times = B.atkEv.filter((e) => e.id === myId).map((e) => e.t);
    const ivs = []; for (let i = 1; i < times.length; i++) ivs.push((times[i] - times[i - 1]) / 1000);
    const med = median(ivs);
    info('7a events', `mine=${times.length} intervals=${JSON.stringify(ivs)} med=${med}`);
    { const meEnd = meOf(B); info('7a B state', 'hp=' + (meEnd && meEnd.hp) + '/' + (meEnd && meEnd.maxHp) + ' pos=' + (meEnd && Math.round(meEnd.x)) + ',' + (meEnd && Math.round(meEnd.y)) + ' monsGan=' + monsOf(B).length); }
    ok('7a nhip don Cot Nhan ≈0.5s (0.40–0.72)', ivs.length >= 4 && med >= 0.40 && med <= 0.72, `n=${ivs.length} med=${med}`);
    B.socket.disconnect();
  } catch (e) {
    console.log('PROBE ERROR | ' + (e && e.stack || e)); fail++;
  } finally {
    await stopServer();
    console.log(`\n== GD389c PROBE: PASS ${pass} / FAIL ${fail} ==`);
    process.exit(fail ? 1 : 0);
  }
})();
