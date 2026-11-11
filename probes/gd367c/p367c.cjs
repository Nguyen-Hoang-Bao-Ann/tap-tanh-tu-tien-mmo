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
let serverProc = null, killTimer = null, CUR_PORT = 0;
async function startServer(port, tag, extraEnv) {
  CUR_PORT = port;
  if (!(await portFree(port))) throw new Error('port ban ' + port);
  serverProc = spawn('node', ['server/index.js'], { cwd: ROOT, env: { ...process.env, PORT: String(port), TTT_STORAGE: 'file', TTT_CHAR_FILE: path.join(DIR, 'characters.json'), TTT_ACC_FILE: path.join(DIR, 'accounts.json'), TTT_WORLD_FILE: path.join(DIR, 'world.json'), TTT_SESS_FILE: path.join(DIR, 'sessions.json'), TTT_DAY_REAL_MS: '600000', TTT_TUVI_NEED: '5', ...(extraEnv || {}) }, stdio: ['ignore', 'pipe', 'pipe'] });
  serverProc.stderr.on('data', (d) => { try { fs.appendFileSync(path.join(DIR, 'srv_' + tag + '.log'), d); } catch (e) {} });
  serverProc.stdout.on('data', (d) => { try { fs.appendFileSync(path.join(DIR, 'srv_' + tag + '.log'), d); } catch (e) {} });
  killTimer = setTimeout(() => { try { serverProc.kill('SIGKILL'); } catch (e) {} }, 1800000);
  const t0 = Date.now();
  while (Date.now() - t0 < 45000) { try { const r = await fetch(`http://127.0.0.1:${port}/api/status`); if (r.ok) { clearTimeout(killTimer); return; } } catch (e) {} await sleep(500); }
  throw new Error('server khong len');
}
async function stopServer() { if (!serverProc) return; const p = serverProc; serverProc = null; if (killTimer) { clearTimeout(killTimer); killTimer = null; } await new Promise((res) => { const t = setTimeout(() => { try { p.kill('SIGKILL'); } catch (e) {} res(); }, 4000); p.once('exit', () => { clearTimeout(t); res(); }); try { p.kill('SIGTERM'); } catch (e) { clearTimeout(t); res(); } }); const t0 = Date.now(); while (Date.now() - t0 < 10000 && !(await portFree(CUR_PORT))) await sleep(300); }
const STRONG = { khiHuyet: 20000, vatCong: 6000, vatPhong: 2000, phapCong: 400, phapPhong: 2000, tocDo: 80, minhMan: 100 };
const LC1 = { elements: ['kim'], main: 'kim', count: 1, mutations: [] };
function BASE(token, name, extra) {
  return Object.assign({ token, name, classId: 'kiemtu', gender: 'nam', race: null, geo175: 1, realm: 'tn', tier: 9, x: 1565, y: 1011, mapId: 'lang_tan_thu', hp: 999999, mp: 99999, lifespan: 500, birthDay: -5660, ageStart: 16, stats: { ...STRONG }, statPoints: 0, freePoints: 0, tuVi: 99999, stones: 100000, stonesTrung: 0, stonesThuong: 0, stonesCuc: 0, inventory: {}, gearBag: {}, equipped: [], skills: [], job: null, job2: null, job3: null, linhCan: { ...LC1 }, affinity: {}, affV2: 1, bonds: {}, quests: {}, questsDone: {}, flags: {}, counters: {}, disciples: [], foundInvites: [], reformIn: [], sectTech: [], sectArts: [], sectArtsActive: [], mails: [], classRes: {}, food: 100, water: 100 }, extra || {});
}
let pass = 0, fail = 0;
function ok(name, cond, extra) { if (cond) { pass++; console.log('PASS | ' + name); } else { fail++; console.log('FAIL | ' + name + (extra ? ' | ' + extra : '')); } }
function connect(token) {
  const socket = io(`http://127.0.0.1:${CUR_PORT}`, { transports: ['websocket'] });
  const ctx = { socket, merger: createMerger(), state: null, welcome: null, syncs: [], errs: [], notices: [], maps: [], killed: [], chestEvents: [], myName: null };
  socket.on('connect', () => socket.emit('hello', { token }));
  socket.on('welcome', (w) => { ctx.welcome = w; ctx.myName = (w.character || {}).name; });
  socket.on('char_sync', (s) => ctx.syncs.push(s));
  socket.on('notice', (n) => ctx.notices.push(n.text || ''));
  socket.on('interact_error', (e) => ctx.errs.push(e.message || ''));
  socket.on('map_enter', (m) => ctx.maps.push(m));
  socket.on('monster_killed', (k) => ctx.killed.push(k));
  socket.on('chest_opened', (e) => ctx.chestEvents.push(e));
  socket.on('server_tick', (t) => { const st = ctx.merger(t); if (st) ctx.state = st; });
  return ctx;
}
const lastChar = (c) => { for (let i = c.syncs.length - 1; i >= 0; i--) { if (c.syncs[i]) return c.syncs[i]; } return c.welcome ? c.welcome.character : null; };
const meOf = (c) => { const ps = (c.state && c.state.players) || []; return ps.find((p) => p.name === c.myName) || null; };
const mons = (c) => (c.state && c.state.monsters) || [];
const chestsOf = (c) => (c.state && c.state.chests) || [];
const achBossKills = (c) => { const ch = lastChar(c); return (ch && ch.counters && ch.counters.ach_bossKills) || 0; };
const stonesCucOf = (c) => { const ch = lastChar(c); return ch ? (ch.stonesCuc || 0) : -1; };
const isBossInd = (m) => m.sp === 1 && !m.rare; // cá thể đặc biệt KHÔNG hiếm -> với 18 loài đích (type không minChestGrade) chính là bản mapBoss
async function flyTo(c, tx, ty, tol, ms) {
  c.socket.emit('fly_toggle', {});
  await sleep(400);
  const t0 = Date.now();
  while (Date.now() - t0 < (ms || 60000)) {
    const me = meOf(c); if (!me) { await sleep(150); continue; }
    const dx = tx - me.x, dy = ty - me.y; const d = Math.hypot(dx, dy);
    if (d <= (tol || 60)) break;
    c.socket.emit('client_input', { vx: dx / d, vy: dy / d });
    await sleep(120);
  }
  c.socket.emit('client_input', { vx: 0, vy: 0 });
  c.socket.emit('fly_toggle', {});
  await sleep(400);
}
async function huntByPred(c, kind, pred, ms) {
  const t0 = Date.now(); let flying = false; let targetId = null;
  while (Date.now() - t0 < (ms || 180000)) {
    if (targetId && c.killed.some((k) => k.monsterId === targetId && k.byName === c.myName)) { if (flying) c.socket.emit('fly_toggle', {}); c.socket.emit('client_input', { vx: 0, vy: 0 }); return targetId; }
    const me = meOf(c); if (!me) { await sleep(200); continue; }
    const cands = mons(c).filter((m) => m.kind === kind && pred(m));
    if (!cands.length) { targetId = null; await sleep(300); continue; }
    cands.sort((a, b) => Math.hypot(a.x - me.x, a.y - me.y) - Math.hypot(b.x - me.x, b.y - me.y));
    const t = cands[0]; targetId = t.id;
    const d = Math.hypot(t.x - me.x, t.y - me.y);
    if (d > 58 && !flying) { c.socket.emit('fly_toggle', {}); flying = true; await sleep(300); continue; }
    if (d <= 58 && flying) { c.socket.emit('fly_toggle', {}); flying = false; await sleep(300); continue; }
    if (d > 52) { c.socket.emit('client_input', { vx: (t.x - me.x) / d, vy: (t.y - me.y) / d }); await sleep(120); continue; }
    c.socket.emit('client_input', { vx: 0, vy: 0 });
    c.socket.emit('player_attack', {}); await sleep(550);
  }
  if (flying) { try { c.socket.emit('fly_toggle', {}); } catch (e) {} }
  const me = meOf(c); const t = mons(c).filter((m) => m.kind === kind && pred(m))[0];
  console.log('  [diag hunt ' + kind + '] me=' + (me ? me.x + ',' + me.y + ' hp=' + me.hp : '?') + ' target=' + (t ? t.id + ' ' + t.x + ',' + t.y + ' hp=' + t.hp + '/' + t.maxHp : 'khong thay') + ' killed=' + JSON.stringify(c.killed.slice(-3)));
  return null;
}
async function waitStableKind(c, kind, ms) {
  const t0 = Date.now(); let last = -1, stable = 0;
  while (Date.now() - t0 < (ms || 45000)) {
    const n = mons(c).length;
    if (n === last && n > 0) { stable++; if (stable >= 3 && mons(c).some((m) => m.kind === kind)) return true; }
    else stable = 0;
    last = n;
    await sleep(1000);
  }
  return mons(c).some((m) => m.kind === kind);
}
// Đếm bản trùm của 1 loài trên map hiện tại của ctx (chờ tối đa ms cho đủ 1).
async function bossListOf(c, kind, ms) {
  const b = await waitFor(() => { const l = mons(c).filter((m) => m.kind === kind && isBossInd(m)); return l.length >= 1 ? l : null; }, ms || 20000);
  return b || mons(c).filter((m) => m.kind === kind && isBossInd(m));
}

// ===== GĐ367c: chân Duyên Nợ NA với vòng thử-lại áp sát (bản trùm đi lang thang) =====
(async () => {
  try {
    const chars = {};
    chars['c367kna1'] = BASE('c367kna1', 'P367CSanNA', { mapId: 'bang_nguyen_dai', x: 4250, y: 3200, job: { jobId: 'thusu', crafts: 10 }, inventory: { thit_thu: 5, thit_nuong: 5, linh_thao: 5, tien_linh_chi: 5, thanh_thao: 5, xuong_thu: 5 } });
    fs.writeFileSync(path.join(DIR, 'characters.json'), JSON.stringify(chars));
    fs.writeFileSync(path.join(DIR, 'accounts.json'), '{}');
    fs.writeFileSync(path.join(DIR, 'world.json'), JSON.stringify({ totalMinutes: 3360, savedAt: Date.now() }));
    fs.writeFileSync(path.join(DIR, 'sessions.json'), '{}');
    await startServer(3746, '367c');
    const k = connect('c367kna1');
    await waitFor(() => k.welcome, 20000);
    await waitStableKind(k, 'son_quan_ho', 90000);
    const bossL = await bossListOf(k, 'son_quan_ho', 30000);
    const boss = bossL[0] || null;
    ok('NA**: tìm thấy bản trùm Sơn Quân Hổ', !!boss);
    let fed = null;
    if (boss) {
      for (let attempt = 1; attempt <= 6 && !fed; attempt++) {
        const live = mons(k).find((m) => m.id === boss.id);
        if (!live) break;
        await flyTo(k, live.x, live.y, 90, 60000);
        const live2 = mons(k).find((m) => m.id === boss.id) || live;
        k.errs.length = 0;
        k.socket.emit('bond_feed', { monsterId: live2.id });
        fed = await waitFor(() => {
          const ch = lastChar(k); const arr = ch && ch.bonds;
          if (!Array.isArray(arr)) return null;
          const e = arr.find((x) => x.key === 'm:son_quan_ho');
          return e && e.score >= 15 ? e : null;
        }, 4000);
        console.log('  [feed attempt ' + attempt + '] errs=' + JSON.stringify(k.errs) + ' fed=' + !!fed);
      }
    }
    ok('NA** (Duyên Nợ): cho bản trùm ăn → bonds[m:son_quan_ho] = +15', !!fed, 'notices=' + JSON.stringify(k.notices.slice(-3)));
    if (boss) {
      const killedBoss = await huntByPred(k, 'son_quan_ho', (m) => m.id === boss.id, 300000);
      ok('NA**: hạ được bản trùm sau khi cho ăn', !!killedBoss && killedBoss === boss.id);
      await sleep(1500);
    }
    k.socket.disconnect();
    await stopServer();
    const saved = JSON.parse(fs.readFileSync(path.join(DIR, 'characters.json'), 'utf8'));
    const kc = saved['c367kna1'] || {};
    ok('FILE**: ach_bossKills = 1', !!(kc.counters && kc.counters.ach_bossKills === 1), 'counters=' + JSON.stringify(kc.counters || {}));
    ok('FILE**: Duyên Nợ loài = −385 (cho ăn +15, hạ cá thể đặc biệt −400)', !!(kc.bonds && kc.bonds['m:son_quan_ho'] && kc.bonds['m:son_quan_ho'].score === -385), 'bonds=' + JSON.stringify(kc.bonds || {}));
  } catch (e) {
    fail++; console.log('CRASH | ' + (e && e.stack || e));
    try { await stopServer(); } catch (_) {}
  }
  console.log('KẾT QUẢ GĐ367c: ' + pass + ' PASS / ' + fail + ' FAIL');
  process.exit(fail ? 1 : 0);
})();
