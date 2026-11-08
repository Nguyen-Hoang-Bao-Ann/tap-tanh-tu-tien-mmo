// Probe GĐ342-D — Dạ Hành ban đêm chốt lại: so sát thương tài/trống TRONG CÙNG phiên đêm (6 mẫu/trung vị mỗi nhân vật).
// Bản B hụt vì mốc DS0 lấy từ phiên ban ngày khác boot (53 vs 58 — nhiễu xuyên phiên); luật đúng: tỉ lệ trong cùng phiên.
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
let serverProc = null, killTimer = null, CUR_PORT = 3632;
async function startServer(port, tag) {
  CUR_PORT = port;
  if (!(await portFree(port))) throw new Error('port ban ' + port);
  serverProc = spawn('node', ['server/index.js'], { cwd: ROOT, env: { ...process.env, PORT: String(port), TTT_STORAGE: 'file', TTT_CHAR_FILE: path.join(DIR, 'characters.json'), TTT_ACC_FILE: path.join(DIR, 'accounts.json'), TTT_WORLD_FILE: path.join(DIR, 'world.json'), TTT_SESS_FILE: path.join(DIR, 'sessions.json'), TTT_DAY_REAL_MS: '600000', TTT_TUVI_NEED: '5', TTT_WORLD_START_MINUTES: '1200' }, stdio: ['ignore', 'pipe', 'pipe'] });
  serverProc.stderr.on('data', (d) => { try { fs.appendFileSync(path.join(DIR, 'srv_' + tag + '.log'), d); } catch (e) {} });
  serverProc.stdout.on('data', (d) => { try { fs.appendFileSync(path.join(DIR, 'srv_' + tag + '.log'), d); } catch (e) {} });
  killTimer = setTimeout(() => { try { serverProc.kill('SIGKILL'); } catch (e) {} }, 240000);
  const t0 = Date.now();
  while (Date.now() - t0 < 45000) { try { const r = await fetch(`http://127.0.0.1:${port}/api/status`); if (r.ok) { clearTimeout(killTimer); return; } } catch (e) {} await sleep(500); }
  throw new Error('server khong len');
}
async function stopServer() { if (!serverProc) return; const p = serverProc; serverProc = null; await new Promise((res) => { const t = setTimeout(() => { try { p.kill('SIGKILL'); } catch (e) {} res(); }, 4000); p.once('exit', () => { clearTimeout(t); res(); }); try { p.kill('SIGTERM'); } catch (e) { clearTimeout(t); res(); } }); const t0 = Date.now(); while (Date.now() - t0 < 10000 && !(await portFree(CUR_PORT))) await sleep(300); }
const STATS = { khiHuyet: 500, vatCong: 100, vatPhong: 100, phapCong: 100, phapPhong: 100, tocDo: 60, minhMan: 100 };
function BASE(token, name, extra) {
  return Object.assign({ token, name, classId: 'satthu', gender: 'nam', race: null, geo175: 1, realm: 'kd', tier: 1, hp: 99999, lifespan: 500, birthDay: -5660, ageStart: 16, stats: { ...STATS }, statPoints: 0, freePoints: 0, tuVi: 0, stones: 0, stonesTrung: 0, stonesThuong: 0, stonesCuc: 0, inventory: {}, gearBag: {}, equipped: [], skills: [], job: null, job2: null, job3: null, linhCan: { elements: ['kim'], main: 'kim', count: 1, mutations: [] }, affinity: {}, affV2: 1, bonds: {}, quests: {}, questsDone: {}, flags: {}, counters: {}, disciples: [], foundInvites: [], reformIn: [], sectTech: [], sectArts: [], sectArtsActive: [], mails: [], classRes: {}, food: 100, water: 100 }, extra || {});
}
let pass = 0, fail = 0;
function ok(name, cond, extra) { if (cond) { pass++; console.log('PASS | ' + name); } else { fail++; console.log('FAIL | ' + name + (extra ? ' | ' + extra : '')); } }
function note(name, extra) { console.log('NOTE | ' + name + (extra ? ' | ' + extra : '')); }
function connect(token) {
  const socket = io(`http://127.0.0.1:${CUR_PORT}`, { transports: ['websocket'] });
  const ctx = { socket, merger: createMerger(), state: null, welcome: null };
  socket.on('connect', () => socket.emit('hello', { token }));
  socket.on('welcome', (w) => { ctx.welcome = w; ctx.myName = (w.character || {}).name; });
  socket.on('server_tick', (t) => { const st = ctx.merger(t); if (st) ctx.state = st; });
  return ctx;
}
const meOf = (c) => (c.state?.players || []).find((p) => p.name === c.myName) || null;
const monsOf = (c) => c.state?.monsters || [];
async function steer(c, tx, ty, tol, ms) {
  const t0 = Date.now();
  while (Date.now() - t0 < (ms || 20000)) { const me = meOf(c); if (!me) { await sleep(120); continue; } const dx = tx - me.x, dy = ty - me.y; const d = Math.hypot(dx, dy); if (d <= tol) break; c.socket.emit('client_input', { vx: dx / d, vy: dy / d }); await sleep(110); }
  c.socket.emit('client_input', { vx: 0, vy: 0 });
}
async function firstHitDrop(c) {
  const me = meOf(c); if (!me) return 0;
  const ws = monsOf(c).filter((m) => m.kind === 'wolf' && m.hp >= (m.maxHp || 9999) - 1).sort((a, b) => Math.hypot(a.x - me.x, a.y - me.y) - Math.hypot(b.x - me.x, b.y - me.y));
  const w = ws[0]; if (!w) return 0;
  await steer(c, w.x, w.y, 26, 25000);
  const live0 = monsOf(c).find((m) => m.id === w.id); if (!live0 || live0.hp < (live0.maxHp || 9999) - 1) return 0;
  const hp0 = live0.hp;
  c.socket.emit('player_attack');
  await sleep(700);
  const live1 = monsOf(c).find((m) => m.id === w.id);
  const hp1 = live1 ? live1.hp : 0;
  return hp0 - hp1;
}
const median = (a) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : 0; };

(async () => {
  const chars = {};
  chars['tk342dct04'] = BASE('tk342dct04', 'DCtD342', {});
  chars['tk342dah04'] = BASE('tk342dah04', 'DahanD342', { talent: { id: 'da_hanh', tier: 'den' } });
  fs.writeFileSync(path.join(DIR, 'characters.json'), JSON.stringify(chars, null, 1));
  fs.writeFileSync(path.join(DIR, 'accounts.json'), '{}');
  for (const f of ['world.json', 'sessions.json']) { try { fs.unlinkSync(path.join(DIR, f)); } catch (e) {} }
  await startServer(3632, '342n2');
  const dct = connect('tk342dct04'); const dah = connect('tk342dah04');
  await waitFor(() => dct.welcome && dah.welcome, 10000);
  await waitFor(() => meOf(dct) && monsOf(dct).length > 0, 15000);
  const sC = [], sT = [];
  for (let i = 0; i < 6; i++) { const d = await firstHitDrop(dct); if (d > 0) sC.push(d); await sleep(200); }
  for (let i = 0; i < 6; i++) { const d = await firstHitDrop(dah); if (d > 0) sT.push(d); await sleep(200); }
  const mC = median(sC), mT = median(sT);
  note('D mẫu đêm: ctrl=' + JSON.stringify(sC) + ' talent=' + JSON.stringify(sT));
  ok('D1 Dạ Hành ban đêm: sát thương +8% so đối chứng cùng phiên (tỉ lệ 1,04–1,12)', sC.length >= 4 && sT.length >= 4 && mC > 0 && (mT / mC) >= 1.04 && (mT / mC) <= 1.12, `median ctrl=${mC} talent=${mT} ratio=${mC ? (mT / mC).toFixed(3) : '?'}`);
  dct.socket.disconnect(); dah.socket.disconnect();
  await stopServer();
  console.log('=== TỔNG GĐ342-D: PASS=' + pass + ' FAIL=' + fail);
  process.exit(fail > 0 ? 1 : 0);
})().catch(async (e) => { console.error('PROBE ERROR', e); try { await stopServer(); } catch (x) {} process.exit(2); });
