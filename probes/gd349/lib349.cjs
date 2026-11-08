// Harness dùng chung probes GĐ349 (mẫu p348/gd338): server file-store riêng trong thư mục probe,
// cổng tươi, vá char chỉ khi server đã dừng, store khóa bằng TOKEN.
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const net = require('net');
const ROOT = path.join(__dirname, '..', '..');
const { io } = require(path.join(ROOT, 'client/node_modules/socket.io-client'));
const { createMerger } = require(path.join(ROOT, 'client/worldmerge.cjs'));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function waitFor(fn, ms) { const t0 = Date.now(); while (Date.now() - t0 < ms) { const v = fn(); if (v) return v; await sleep(120); } return null; }
function portFree(port) { return new Promise((res) => { const s = net.createServer(); s.once('error', () => res(false)); s.listen(port, () => s.close(() => res(true))); }); }
function median(a) { if (!a.length) return 0; const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; }

function makeHarness(PORT, extraEnv, DIR) {
  let serverProc = null, killTimer = null;
  async function startServer() {
    if (!(await portFree(PORT))) throw new Error('port ban ' + PORT);
    serverProc = spawn('node', ['server/index.js'], { cwd: ROOT, env: { ...process.env, PORT: String(PORT), TTT_STORAGE: 'file', TTT_CHAR_FILE: path.join(DIR, 'characters.json'), TTT_ACC_FILE: path.join(DIR, 'accounts.json'), TTT_WORLD_FILE: path.join(DIR, 'world.json'), TTT_SESS_FILE: path.join(DIR, 'sessions.json'), TTT_DAY_REAL_MS: '600000', TTT_TUVI_NEED: '5', ...(extraEnv || {}) }, stdio: ['ignore', 'pipe', 'pipe'] });
    serverProc.stderr.on('data', (d) => { try { fs.appendFileSync(path.join(DIR, 'srv.log'), d); } catch (e) {} });
    serverProc.stdout.on('data', (d) => { try { fs.appendFileSync(path.join(DIR, 'srv.log'), d); } catch (e) {} });
    killTimer = setTimeout(() => { try { serverProc.kill('SIGKILL'); } catch (e) {} }, 1500000);
    const t0 = Date.now();
    while (Date.now() - t0 < 60000) { try { const r = await fetch(`http://127.0.0.1:${PORT}/api/status`); if (r.ok) { clearTimeout(killTimer); return; } } catch (e) {} await sleep(500); }
    throw new Error('server khong len');
  }
  async function stopServer() {
    if (!serverProc) return; const p = serverProc; serverProc = null;
    await new Promise((res) => { const t = setTimeout(() => { try { p.kill('SIGKILL'); } catch (e) {} res(); }, 4000); p.once('exit', () => { clearTimeout(t); res(); }); try { p.kill('SIGTERM'); } catch (e) { clearTimeout(t); res(); } });
    const t0 = Date.now(); while (Date.now() - t0 < 10000 && !(await portFree(PORT))) await sleep(300);
  }
  function writeChars(chars) { fs.writeFileSync(path.join(DIR, 'characters.json'), JSON.stringify(chars)); }
  function connect(token) {
    const socket = io(`http://127.0.0.1:${PORT}`, { transports: ['websocket'] });
    const ctx = { socket, merger: createMerger(), state: null, welcome: null, needChar: false, syncs: [], errs: [], notices: [], noticeLog: [], casts: [], attacks: [], createErr: null, myName: null, flying: false };
    socket.on('connect', () => socket.emit('hello', { token }));
    socket.on('welcome', (w) => { ctx.welcome = w; ctx.myName = (w.character || {}).name; });
    socket.on('need_character', () => { ctx.needChar = true; });
    socket.on('create_error', (e) => { ctx.createErr = e.message || ''; });
    socket.on('char_sync', (s) => ctx.syncs.push(s));
    socket.on('notice', (n) => { const t = n.text || ''; ctx.notices.push(t); ctx.noticeLog.push({ at: Date.now(), text: t }); });
    socket.on('interact_error', (e) => ctx.errs.push(e.message || ''));
    socket.on('cast_result', (r) => ctx.casts.push(r));
    socket.on('player_attacked', (r) => ctx.attacks.push(r));
    socket.on('fly_state', (s) => { ctx.flying = !!s.on; });
    socket.on('server_tick', (t) => { const st = ctx.merger(t); if (st) ctx.state = st; });
    return ctx;
  }
  return { startServer, stopServer, writeChars, connect, PORT };
}

const STATS = { khiHuyet: 8000, vatCong: 400, vatPhong: 250, phapCong: 400, phapPhong: 250, tocDo: 60, minhMan: 100 };
const LC1 = { elements: ['kim'], main: 'kim', count: 1, mutations: [] };
function BASE(token, name, extra) {
  return Object.assign({ token, name, classId: 'kiemtu', gender: 'nam', race: null, geo175: 1, realm: 'kd', tier: 9, x: 1565, y: 1252, mapId: 'lang_tan_thu', hp: 99999, lifespan: 500, birthDay: -5660, ageStart: 16, stats: { ...STATS }, statPoints: 0, freePoints: 0, tuVi: 99999, stones: 0, stonesTrung: 0, stonesThuong: 0, stonesCuc: 0, inventory: {}, gearBag: {}, equipped: [], skills: [], job: null, job2: null, job3: null, linhCan: { ...LC1 }, affinity: {}, affV2: 1, bonds: {}, quests: {}, questsDone: {}, flags: {}, counters: {}, disciples: [], foundInvites: [], reformIn: [], sectTech: [], sectArts: [], sectArtsActive: [], mails: [], classRes: {}, food: 100, water: 100 }, extra || {});
}
function makeOk() { const r = { pass: 0, fail: 0 }; r.ok = (name, cond, extra) => { if (cond) { r.pass++; console.log('PASS | ' + name); } else { r.fail++; console.log('FAIL | ' + name + (extra ? ' | ' + extra : '')); } }; r.note = (s) => console.log('NOTE | ' + s); r.done = (tag) => console.log(`KET QUA ${tag}: ${r.pass} PASS / ${r.fail} FAIL`); return r; }
const meOf = (c) => (c.state?.players || []).find((p) => p.name === c.myName) || null;
const monsOf = (c) => c.state?.monsters || [];
const dropsOf = (c) => c.state?.drops || [];
const myChar = (c) => (c.syncs.length ? c.syncs[c.syncs.length - 1] : (c.welcome || {}).character) || {};
async function waitStableMons(c, ms) { let last = -1, stable = 0; const t0 = Date.now(); while (Date.now() - t0 < (ms || 20000)) { const n = monsOf(c).length; if (n > 0 && n === last) { stable++; if (stable >= 3) return n; } else stable = 0; last = n; await sleep(400); } return last; }
async function steerTo(c, x, y, tol, timeoutMs) {
  const t0 = Date.now();
  while (Date.now() - t0 < (timeoutMs || 25000)) { const me = meOf(c); if (!me) { await sleep(120); continue; } const dx = x - me.x, dy = y - me.y; const d = Math.hypot(dx, dy); if (d <= (tol || 45)) break; c.socket.emit('client_input', { vx: dx / d, vy: dy / d }); await sleep(110); }
  c.socket.emit('client_input', { vx: 0, vy: 0 });
}
async function flyTo(c, x, y, tol, timeoutMs) {
  if (!c.flying) { c.socket.emit('fly_toggle', {}); await sleep(350); }
  const t0 = Date.now();
  while (Date.now() - t0 < (timeoutMs || 30000)) { const me = meOf(c); if (!me) { await sleep(120); continue; } const dx = x - me.x, dy = y - me.y; const d = Math.hypot(dx, dy); if (d <= (tol || 45)) break; c.socket.emit('client_input', { vx: dx / d, vy: dy / d }); await sleep(110); }
  c.socket.emit('client_input', { vx: 0, vy: 0 });
}
async function land(c) { if (c.flying) { c.socket.emit('fly_toggle', {}); await sleep(450); } }
function slotOf(c, skillId) { const eq = myChar(c).skills || []; return eq.findIndex((s) => (typeof s === 'string' ? s : s.id) === skillId); }

module.exports = { makeHarness, BASE, STATS, makeOk, meOf, monsOf, dropsOf, myChar, waitStableMons, steerTo, flyTo, land, slotOf, sleep, waitFor, median };
