// Probe GĐ342-F — Hư Kiếm Ý chốt: mãng (phòng 3) mốc 107, xuyên -> 108. Lọc cô lập 55px, đứng 24px,
// 2 boot làm mới đàn mãng, tổng cast của tài < 90 (tránh lên cấp thông thạo làm trôi dmg), loại mẫu chí mạng (x2).
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
let serverProc = null, killTimer = null, CUR_PORT = 3637;
async function startServer(port, tag) {
  CUR_PORT = port;
  if (!(await portFree(port))) throw new Error('port ban ' + port);
  serverProc = spawn('node', ['server/index.js'], { cwd: ROOT, env: { ...process.env, PORT: String(port), TTT_STORAGE: 'file', TTT_CHAR_FILE: path.join(DIR, 'characters.json'), TTT_ACC_FILE: path.join(DIR, 'accounts.json'), TTT_WORLD_FILE: path.join(DIR, 'world.json'), TTT_SESS_FILE: path.join(DIR, 'sessions.json'), TTT_DAY_REAL_MS: '600000', TTT_TUVI_NEED: '5', TTT_WORLD_START_MINUTES: '600' }, stdio: ['ignore', 'pipe', 'pipe'] });
  serverProc.stderr.on('data', () => {});
  serverProc.stdout.on('data', () => {});
  killTimer = setTimeout(() => { try { serverProc.kill('SIGKILL'); } catch (e) {} }, 240000);
  const t0 = Date.now();
  while (Date.now() - t0 < 45000) { try { const r = await fetch(`http://127.0.0.1:${port}/api/status`); if (r.ok) { clearTimeout(killTimer); return; } } catch (e) {} await sleep(500); }
  throw new Error('server khong len');
}
async function stopServer() { if (!serverProc) return; const p = serverProc; serverProc = null; await new Promise((res) => { const t = setTimeout(() => { try { p.kill('SIGKILL'); } catch (e) {} res(); }, 4000); p.once('exit', () => { clearTimeout(t); res(); }); try { p.kill('SIGTERM'); } catch (e) { clearTimeout(t); res(); } }); const t0 = Date.now(); while (Date.now() - t0 < 10000 && !(await portFree(CUR_PORT))) await sleep(300); }
const STATS = { khiHuyet: 500, vatCong: 100, vatPhong: 100, phapCong: 100, phapPhong: 100, tocDo: 60, minhMan: 100 };
function BASE(token, name, extra) {
  return Object.assign({ token, name, classId: 'satthu', gender: 'nam', race: null, geo175: 1, realm: 'kd', tier: 1, x: 4248, y: 2950, mapId: 'huyet_sac_rung', hp: 99999, lifespan: 500, birthDay: -5660, ageStart: 16, stats: { ...STATS }, statPoints: 0, freePoints: 0, tuVi: 0, stones: 0, stonesTrung: 0, stonesThuong: 0, stonesCuc: 0, inventory: {}, gearBag: {}, equipped: [], skills: ['satthu_1'], equipped: ['satthu_1'], job: null, job2: null, job3: null, linhCan: { elements: ['kim'], main: 'kim', count: 1, mutations: [] }, affinity: {}, affV2: 1, bonds: {}, quests: {}, questsDone: {}, flags: {}, counters: {}, disciples: [], foundInvites: [], reformIn: [], sectTech: [], sectArts: [], sectArtsActive: [], mails: [], classRes: {}, food: 100, water: 100 }, extra || {});
}
let pass = 0, fail = 0;
function ok(name, cond, extra) { if (cond) { pass++; console.log('PASS | ' + name); } else { fail++; console.log('FAIL | ' + name + (extra ? ' | ' + extra : '')); } }
function note(name, extra) { console.log('NOTE | ' + name + (extra ? ' | ' + extra : '')); }
function connect(token) {
  const socket = io(`http://127.0.0.1:${CUR_PORT}`, { transports: ['websocket'] });
  const ctx = { socket, merger: createMerger(), state: null, welcome: null, casts: [] };
  socket.on('connect', () => socket.emit('hello', { token }));
  socket.on('welcome', (w) => { ctx.welcome = w; ctx.myName = (w.character || {}).name; });
  socket.on('cast_result', (r) => ctx.casts.push(r));
  socket.on('server_tick', (t) => { const st = ctx.merger(t); if (st) ctx.state = st; });
  return ctx;
}
const meOf = (c) => (c.state?.players || []).find((p) => p.name === c.myName) || null;
const monsOf = (c) => c.state?.monsters || [];
async function waitStableMons(c, ms) { let last = -1, stable = 0; const t0 = Date.now(); while (Date.now() - t0 < (ms || 20000)) { const n = monsOf(c).length; if (n > 0 && n === last) { stable++; if (stable >= 3) return n; } else stable = 0; last = n; await sleep(400); } return last; }
async function flyTo(c, x, y, tol) {
  if (!c.flying) { c.socket.emit('fly_toggle', {}); c.flying = true; await sleep(350); }
  const t0 = Date.now();
  while (Date.now() - t0 < 30000) { const me = meOf(c); if (!me) { await sleep(120); continue; } const dx = x - me.x, dy = y - me.y; const d = Math.hypot(dx, dy); if (d <= tol) break; c.socket.emit('client_input', { vx: dx / d, vy: dy / d }); await sleep(110); }
  c.socket.emit('client_input', { vx: 0, vy: 0 });
}
async function castIsolated(c) {
  const all = monsOf(c);
  const used = c.usedMang || (c.usedMang = new Set());
  const cands = all.filter((m) => m.kind === 'sam_lam_cu_mang' && m.hp >= (m.maxHp || 9999) - 1 && !used.has(m.id) && !all.some((o) => o.id !== m.id && Math.hypot(o.x - m.x, o.y - m.y) < 55));
  const me = meOf(c); if (!me || !cands.length) return null;
  cands.sort((a, b) => Math.hypot(a.x - me.x, a.y - me.y) - Math.hypot(b.x - me.x, b.y - me.y));
  const w = cands[0];
  used.add(w.id);
  await flyTo(c, w.x, w.y, 24);
  const i1 = c.casts.length;
  c.socket.emit('cast_skill', { slot: 0 });
  const res = await waitFor(() => c.casts.length > i1 && c.casts[c.casts.length - 1], 3500);
  if (!res || !res.ok) return null;
  const tm = monsOf(c).find((m) => m.id === res.targetId);
  if (!tm || tm.kind !== 'sam_lam_cu_mang') return null;
  return res.dmg;
}

(async () => {
  const chars = {};
  chars['tk342hky08'] = BASE('tk342hky08', 'HkyF342', { talent: { id: 'hu_kiem_y', tier: 'hu' } });
  chars['tk342sct08'] = BASE('tk342sct08', 'SCtF342', {});
  fs.writeFileSync(path.join(DIR, 'characters.json'), JSON.stringify(chars, null, 1));
  fs.writeFileSync(path.join(DIR, 'accounts.json'), '{}');
  for (const f of ['world.json', 'sessions.json']) { try { fs.unlinkSync(path.join(DIR, f)); } catch (e) {} }
  const allH = [];
  let totalCasts = 0;
  for (let boot = 0; boot < 2; boot++) {
    await startServer(3637 + boot, '342f' + boot);
    const hky = connect('tk342hky08');
    const sct = boot === 0 ? connect('tk342sct08') : null;
    await waitFor(() => hky.welcome && (!sct || sct.welcome), 10000);
    await waitStableMons(hky);
    if (sct) {
      const sC = [];
      for (let i = 0; i < 8 && sC.length < 6; i++) { const d = await castIsolated(sct); if (d) sC.push(d); await sleep(150); }
      const nc = sC.filter((d) => d < 182);
      ok('F1 đối chứng mãng: mốc 107', nc.length >= 4 && nc.every((d) => d === 107), JSON.stringify(sC));
      sct.socket.disconnect();
    }
    let dry = 0;
    while (allH.filter((d) => d < 182).length < 24 && totalCasts < 85 && dry < 22) {
      const d = await castIsolated(hky);
      if (d) { allH.push(d); totalCasts++; dry = 0; } else dry++;
      await sleep(150);
    }
    note('boot ' + boot + ': mẫu tài lũy kế = ' + allH.length + ' casts=' + totalCasts);
    hky.socket.disconnect();
    await stopServer();
    if (allH.filter((d) => d < 182).length >= 24) break;
  }
  const nc = allH.filter((d) => d < 182);
  const pierced = nc.filter((d) => d === 108).length;
  const other = nc.filter((d) => d !== 107 && d !== 108).length;
  ok('F2 Hư Kiếm Ý: xuyên phòng (dmg 108) ~20% mẫu không chí mạng (2–10 trong >=20 mẫu, không mức lạ)', nc.length >= 20 && pierced >= 2 && pierced <= 10 && other === 0, `n=${nc.length} pierced=${pierced} other=${other} vals=${JSON.stringify([...new Set(allH)])}`);
  console.log('=== TỔNG GĐ342-F: PASS=' + pass + ' FAIL=' + fail);
  process.exit(fail > 0 ? 1 : 0);
})().catch(async (e) => { console.error('PROBE ERROR', e); try { await stopServer(); } catch (x) {} process.exit(2); });
