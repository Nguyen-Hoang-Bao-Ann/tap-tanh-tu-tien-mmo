// Harness chung GĐ338 — theo mẫu p334d (port guard 2 chiều, kill-timer clear khi server lên,
// dò người chơi theo TÊN, flyTo bằng fly_toggle + client_input, waitFor dùng >=).
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const net = require('net');
const ROOT = path.join(__dirname, '..', '..');
const { io } = require(path.join(ROOT, 'client/node_modules/socket.io-client'));
const { createMerger } = require(path.join(ROOT, 'client/worldmerge.cjs'));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function waitFor(fn, ms) { const t0 = Date.now(); while (Date.now() - t0 < ms) { const v = fn(); if (v) return v; await sleep(150); } return null; }
function portFree(port) { return new Promise((res) => { const s = net.createServer(); s.once('error', () => res(false)); s.listen(port, () => s.close(() => res(true))); }); }
const median = (a) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : 0; };

function makeHarness(PORT, extraEnv, dir) {
  const DIR = dir || __dirname;
  let serverProc = null, killTimer = null;
  async function startServer() {
    if (!(await portFree(PORT))) throw new Error('port ban ' + PORT);
    const env = { ...process.env, PORT: String(PORT), TTT_STORAGE: 'file', TTT_CHAR_FILE: path.join(DIR, 'characters.json'), TTT_ACC_FILE: path.join(DIR, 'accounts.json'), TTT_WORLD_FILE: path.join(DIR, 'world.json'), TTT_SESS_FILE: path.join(DIR, 'sessions.json'), TTT_DAY_REAL_MS: '600000', TTT_TUVI_NEED: '5', TTT_WAR_DELAY_MS: '9000', TTT_WAR_LEN_MS: '240000', ...(extraEnv || {}) };
    serverProc = spawn('node', ['server/index.js'], { cwd: ROOT, env, stdio: ['ignore', 'pipe', 'pipe'] });
    serverProc.stdout.on('data', () => {}); // xả stdout chống nghẽn pipe khi phiên dài
    serverProc.stderr.on('data', (d) => process.stderr.write('[srv] ' + d));
    killTimer = setTimeout(() => { try { serverProc.kill('SIGKILL'); } catch (e) {} }, 90000);
    const t0 = Date.now();
    while (Date.now() - t0 < 45000) { try { const r = await fetch(`http://127.0.0.1:${PORT}/api/status`); if (r.ok) { clearTimeout(killTimer); return; } } catch (e) {} await sleep(500); }
    throw new Error('server khong len');
  }
  async function stopServer() { if (!serverProc) return; const p = serverProc; serverProc = null; await new Promise((res) => { const t = setTimeout(() => { try { p.kill('SIGKILL'); } catch (e) {} res(); }, 4000); p.once('exit', () => { clearTimeout(t); res(); }); try { p.kill('SIGTERM'); } catch (e) { clearTimeout(t); res(); } }); const t0 = Date.now(); while (Date.now() - t0 < 10000 && !(await portFree(PORT))) await sleep(300); }
  async function connect(token) {
    const socket = io(`http://127.0.0.1:${PORT}`, { transports: ['websocket'] });
    const ctx = { socket, merger: createMerger(), state: null, welcome: null, sect: null, sync: null, errors: [], notices: [], extra: {} };
    socket.on('connect', () => socket.emit('hello', { token }));
    socket.on('welcome', (w) => { ctx.welcome = w; ctx.myName = (w.character || {}).name; });
    socket.on('server_tick', (t) => { const st = ctx.merger(t); if (st) ctx.state = st; });
    socket.on('sect_state', (st) => { ctx.sect = st; });
    socket.on('char_sync', (sy) => { ctx.sync = sy; });
    socket.on('interact_error', (e) => ctx.errors.push(e.message || ''));
    socket.on('notice', (n) => ctx.notices.push(n.text || ''));
    await waitFor(() => ctx.welcome, 20000);
    socket.emit('sect_get');
    await waitFor(() => ctx.sect, 10000);
    return ctx;
  }
  return { startServer, stopServer, connect, sleep, waitFor, DIR };
}

function BASE(token, name, extra) {
  return Object.assign({ token, name, classId: 'kiemtu', gender: 'nam', race: null, geo175: 1, realm: 'kd', tier: 1, x: 4248, y: 6223, mapId: 'huyet_sac_rung', hp: 99999, lifespan: 500, birthDay: -5660, ageStart: 16, stats: { khiHuyet: 500, vatCong: 500, vatPhong: 100, phapCong: 100, phapPhong: 100, tocDo: 60, minhMan: 60 }, statPoints: 0, freePoints: 0, tuVi: 0, stones: 0, stonesTrung: 0, stonesThuong: 0, stonesCuc: 0, inventory: {}, gearBag: {}, equipped: [], skills: [], job: null, job2: null, job3: null, linhCan: { element: 'hoa', grade: 'trung', mult: 1.2 }, affinity: {}, affV2: 1, bonds: {}, quests: {}, questsDone: {}, flags: {}, counters: {}, disciples: [], foundInvites: [], reformIn: [], sectTech: [], sectArts: [], sectArtsActive: [], mails: [], classRes: {} }, extra || {});
}
function SECT(id, name, members, extra) { return Object.assign({ id, name, intro: '', fund: 100000, level: 1, uy: 0, members, applicants: [], activeQuests: [], territories: [], territory: null, warehouse: [], garden: [], depts: {}, tributeDay: 100, upkeepDay: 100, questDay: 100, artDay: 100, debtDays: 0, arts: [], honor: [] }, extra || {}); }
function ART(id, name, comps, flaw, kind, creator) { return { id, name, grade: 'pham', gradeName: 'pham', creator, creatorName: creator, element: 'hoa', comps, flaw, kind, status: 'done', progress: 0, need: 100, k: 1, day: 100 }; }
function writeWorld(dir, chars, sects, totalMinutes) {
  fs.writeFileSync(path.join(dir, 'characters.json'), JSON.stringify(chars, null, 1));
  fs.writeFileSync(path.join(dir, 'world.json'), JSON.stringify({ totalMinutes: totalMinutes || 100 * 1440, savedAt: Date.now(), sects: sects || [] }, null, 1));
}
function makeOk() { const r = { pass: 0, fail: 0 }; r.ok = (name, cond, extra) => { if (cond) { r.pass++; console.log('PASS | ' + name); } else { r.fail++; console.log('FAIL | ' + name + (extra ? ' | ' + extra : '')); } }; r.note = (s) => console.log('NOTE | ' + s); r.done = (tag) => console.log(`KET QUA ${tag}: ${r.pass} PASS / ${r.fail} FAIL`); return r; }
const meOf = (c) => (c.state?.players || []).find((p) => p.name === c.myName) || (c.state?.players || []).find((p) => p.id === c.welcome?.id);
const monsOf = (c) => c.state?.monsters || [];
async function flyTo(c, x, y, tol, timeoutMs) {
  const me0 = meOf(c); if (!me0) return false;
  if (!c._flying) { c.socket.emit('fly_toggle', {}); c._flying = true; await sleep(250); }
  const t0 = Date.now();
  while (Date.now() - t0 < (timeoutMs || 25000)) { const me = meOf(c); if (!me) { await sleep(120); continue; } const dx = x - me.x, dy = y - me.y; const d = Math.hypot(dx, dy); if (d <= (tol || 45)) break; c.socket.emit('client_input', { vx: dx / d, vy: dy / d }); await sleep(110); }
  c.socket.emit('client_input', { vx: 0, vy: 0 });
  return true;
}
async function land(c) { if (c._flying) { c.socket.emit('fly_toggle', {}); c._flying = false; await sleep(350); } }
// Chạy thẳng 1 hướng trên mặt đất trong durMs, lấy mẫu vị trí mỗi ~100ms từ tick của chính chủ.
// Trả về {samples:[{t,x,y}], speeds:[px/s từng khoảng]} — chỉ tính khoảng có dịch chuyển > 5px.
async function runLine(c, vx, vy, durMs) {
  const samples = [];
  const t0 = Date.now();
  c.socket.emit('client_input', { vx, vy });
  while (Date.now() - t0 < durMs) { const me = meOf(c); if (me) samples.push({ t: Date.now() - t0, x: me.x, y: me.y }); await sleep(100); }
  c.socket.emit('client_input', { vx: 0, vy: 0 });
  const speeds = [];
  for (let i = 1; i < samples.length; i++) { const dt = (samples[i].t - samples[i - 1].t) / 1000; const d = Math.hypot(samples[i].x - samples[i - 1].x, samples[i].y - samples[i - 1].y); if (dt > 0.03 && d > 5) speeds.push(d / dt); }
  return { samples, speeds };
}
module.exports = { makeHarness, BASE, SECT, ART, writeWorld, makeOk, meOf, monsOf, flyTo, land, runLine, sleep, waitFor, median };
