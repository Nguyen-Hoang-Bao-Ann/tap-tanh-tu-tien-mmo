// Probe GĐ327d — tông pháp GĐ326 đo số thật: Chiến Ý +3% công (qua sát thương đánh ra), Hộ Thể +3% phòng (qua sát thương ăn vào).
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const net = require('net');
const ROOT = path.join(__dirname, '..', '..');
const PORT = 3566;
const DIR = __dirname;
const { io } = require(path.join(ROOT, 'client/node_modules/socket.io-client'));
const { createMerger } = require(path.join(ROOT, 'client/worldmerge.cjs'));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function waitFor(fn, ms) { const t0 = Date.now(); while (Date.now() - t0 < ms) { const v = fn(); if (v) return v; await sleep(150); } return null; }
function portFree(port) { return new Promise((res) => { const s = net.createServer(); s.once('error', () => res(false)); s.listen(port, () => s.close(() => res(true))); }); }
let serverProc = null, killTimer = null;
async function startServer() {
  if (!(await portFree(PORT))) throw new Error('port ban');
  serverProc = spawn('node', ['server/index.js'], { cwd: ROOT, env: { ...process.env, PORT: String(PORT), TTT_STORAGE: 'file', TTT_CHAR_FILE: path.join(DIR, 'characters.json'), TTT_ACC_FILE: path.join(DIR, 'accounts.json'), TTT_WORLD_FILE: path.join(DIR, 'world.json'), TTT_SESS_FILE: path.join(DIR, 'sessions.json'), TTT_DAY_REAL_MS: '600000', TTT_TUVI_NEED: '5' }, stdio: ['ignore', 'pipe', 'pipe'] });
  serverProc.stderr.on('data', (d) => process.stderr.write('[srv] ' + d));
  killTimer = setTimeout(() => { try { serverProc.kill('SIGKILL'); } catch (e) {} }, 60000);
  const t0 = Date.now();
  while (Date.now() - t0 < 45000) { try { const r = await fetch(`http://127.0.0.1:${PORT}/api/status`); if (r.ok) { clearTimeout(killTimer); return; } } catch (e) {} await sleep(500); }
  throw new Error('server khong len');
}
async function stopServer() { if (!serverProc) return; const p = serverProc; serverProc = null; await new Promise((res) => { const t = setTimeout(() => { try { p.kill('SIGKILL'); } catch (e) {} res(); }, 4000); p.once('exit', () => { clearTimeout(t); res(); }); try { p.kill('SIGTERM'); } catch (e) { clearTimeout(t); res(); } }); const t0 = Date.now(); while (Date.now() - t0 < 10000 && !(await portFree(PORT))) await sleep(300); }
function BASE(token, name, extra) {
  return Object.assign({ token, name, classId: 'kiemtu', gender: 'nam', race: null, geo175: 1, realm: 'kd', tier: 1, x: 4248, y: 2950, mapId: 'huyet_sac_rung', hp: 99999, stats: { khiHuyet: 500, vatCong: 100, vatPhong: 100, phapCong: 100, phapPhong: 100, tocDo: 60, minhMan: 60 }, statPoints: 0, freePoints: 0, tuVi: 0, stones: 0, stonesTrung: 0, stonesThuong: 0, stonesCuc: 0, inventory: {}, gearBag: {}, equipped: [], skills: [], job: null, job2: null, job3: null, linhCan: { element: 'kim', grade: 'trung', mult: 1.2 }, affinity: {}, affV2: 1, bonds: {}, quests: {}, questsDone: {}, flags: {}, counters: {}, disciples: [], foundInvites: [], reformIn: [], sectTech: [], mails: [], classRes: {} }, extra || {});
}
function SECT(id, name, members, extra) { return Object.assign({ id, name, intro: '', fund: 0, level: 1, uy: 0, members, applicants: [], activeQuests: [], territories: [], territory: null, warehouse: [], garden: [], depts: {}, tributeDay: 100, upkeepDay: 100, questDay: 100, debtDays: 0 }, extra || {}); }
let pass = 0, fail = 0;
function ok(name, cond, extra) { if (cond) { pass++; console.log('PASS | ' + name); } else { fail++; console.log('FAIL | ' + name + (extra ? ' | ' + extra : '')); } }
async function connect(token) {
  const socket = io(`http://127.0.0.1:${PORT}`, { transports: ['websocket'] });
  const ctx = { socket, merger: createMerger(), state: null, welcome: null, sync: null, errors: [] };
  socket.on('connect', () => socket.emit('hello', { token }));
  socket.on('welcome', (w) => { ctx.welcome = w; });
  socket.on('server_tick', (t) => { const st = ctx.merger(t); if (st) ctx.state = st; });
  socket.on('char_sync', (sy) => { ctx.sync = sy; });
  socket.on('interact_error', (e) => ctx.errors.push(e.message || ''));
  await waitFor(() => ctx.welcome, 20000);
  return ctx;
}
const meOf = (c) => (c.state?.players || []).find((p) => p.id === c.welcome.id);
const monsOf = (c) => c.state?.monsters || [];
async function flyTo(c, x, y, tol) {
  c.socket.emit('fly_toggle', {}); await sleep(350);
  const t0 = Date.now();
  while (Date.now() - t0 < 30000) { const me = meOf(c); if (!me) { await sleep(120); continue; } const dx = x - me.x, dy = y - me.y; const d = Math.hypot(dx, dy); if (d <= (tol || 45)) break; c.socket.emit('client_input', { vx: dx / d, vy: dy / d }); await sleep(110); }
  c.socket.emit('client_input', { vx: 0, vy: 0 });
  c.socket.emit('fly_toggle', {}); await sleep(450);
}
// đánh 1 con quái đầy máu cùng loài, ghi các cú sụt máu
async function sampleDealt(c, kindRef, n) {
  const drops = []; const t0 = Date.now(); let tid = null, last = null;
  while (Date.now() - t0 < 50000 && drops.length < n) {
    const ms = monsOf(c).filter((m) => (m.hp || 0) > 0 && (!kindRef.kind || m.kind === kindRef.kind));
    if (!tid) { const full = ms.filter((m) => m.hp >= (m.maxHp || 9999) - 1 && m.maxHp >= 250); if (!full.length) { await sleep(250); continue; } kindRef.kind = full[0].kind; tid = full[0].id; last = full[0].hp; await flyTo(c, full[0].x, full[0].y, 40); continue; }
    const t = monsOf(c).find((m) => m.id === tid);
    if (!t) { tid = null; continue; }
    const me = meOf(c); const d = Math.hypot(t.x - me.x, t.y - me.y);
    if (d > 62) { c.socket.emit('client_input', { vx: (t.x - me.x) / d, vy: (t.y - me.y) / d }); await sleep(110); continue; }
    c.socket.emit('client_input', { vx: 0, vy: 0 });
    if (t.hp < last) { drops.push(last - t.hp); last = t.hp; }
    c.socket.emit('player_attack'); await sleep(950);
    const t2 = monsOf(c).find((m) => m.id === tid);
    if (t2 && t2.hp < last) { drops.push(last - t2.hp); last = t2.hp; }
    if (!t2) tid = null;
  }
  return drops;
}
// đứng yên cho 1 con cùng loài cắn, ghi các cú sụt máu của mình
async function sampleTaken(c, kind, n) {
  // chọn cá thể CÔ LẬP nhất của loài (xa các quái khác nhất) để không bị loài yếu cắn xen; chỉ tính cú sụt >= 10 (cú cắn thật của loài đích)
  const drops = []; const t0 = Date.now(); let last = null;
  const all = monsOf(c).filter((x) => (x.hp || 0) > 0);
  const cands = all.filter((x) => x.kind === kind);
  let best = null, bestScore = -1;
  for (const m of cands) { let dmin = 1e9; for (const o of all) { if (o.id === m.id) continue; dmin = Math.min(dmin, Math.hypot(o.x - m.x, o.y - m.y)); } if (dmin > bestScore) { bestScore = dmin; best = m; } }
  if (best) await flyTo(c, best.x + 40, best.y, 40);
  // dọn sạch quái KHÁC loài quanh mình (~240px) để chỉ còn loài đích cắn — tránh nhiễu như vòng 1 (cú sụt 1 điểm của loài yếu)
  { const tc0 = Date.now();
    while (Date.now() - tc0 < 25000) {
      const me = meOf(c); if (!me) break;
      const foes = monsOf(c).filter((x) => (x.hp || 0) > 0 && x.kind !== kind && Math.hypot(x.x - me.x, x.y - me.y) <= 240);
      if (!foes.length) break;
      foes.sort((a, b) => Math.hypot(a.x - me.x, a.y - me.y) - Math.hypot(b.x - me.x, b.y - me.y));
      const f = foes[0]; const d = Math.hypot(f.x - me.x, f.y - me.y);
      if (d > 62) { c.socket.emit('client_input', { vx: (f.x - me.x) / d, vy: (f.y - me.y) / d }); await sleep(110); continue; }
      c.socket.emit('client_input', { vx: 0, vy: 0 }); c.socket.emit('player_attack'); await sleep(950);
    }
    c.socket.emit('client_input', { vx: 0, vy: 0 });
    // quay lại cạnh cá thể đích
    const tgt = monsOf(c).filter((x) => x.kind === kind && (x.hp || 0) > 0)[0];
    if (tgt) { const me = meOf(c); const d = Math.hypot(tgt.x - me.x, tgt.y - me.y); if (d > 55) await flyTo(c, tgt.x + 40, tgt.y, 40); }
  }
  while (Date.now() - t0 < 70000 && drops.length < n) {
    const me = meOf(c); if (!me) { await sleep(150); continue; }
    if (last === null) { last = me.hp; await sleep(150); continue; }
    if (me.hp < last) { const d = last - me.hp; if (d >= 10) drops.push(d); last = me.hp; }
    await sleep(150);
  }
  return drops;
}
const median = (a) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : 0; };
(async () => {
  const chars = { p327t00001: BASE('p327t00001', ' HocPhapSo') };
  fs.writeFileSync(path.join(DIR, 'characters.json'), JSON.stringify(chars));
  const sects = [SECT('st', 'Tông Pháp', [{ token: 'p327t00001', name: ' HocPhapSo', role: 'detu', contrib: 999 }], { hq: { mapId: 'huyet_sac_rung', x: 4248, y: 2900 }, buildings: [{ kind: 'tangkinh', name: 'Tàng Kinh Các', x: 4248, y: 3000, lv: 1 }] })];
  fs.writeFileSync(path.join(DIR, 'world.json'), JSON.stringify({ totalMinutes: 100 * 1440, savedAt: Date.now(), sects }));
  await startServer();
  const T = await connect('p327t00001');
  const kindRef = { kind: null };
  const preDealt = await sampleDealt(T, kindRef, 6);
  const preTaken = await sampleTaken(T, kindRef.kind, 6);
  ok('D1 mau truoc: danh ra + an vao du mau', preDealt.length >= 4 && preTaken.length >= 4, `kind=${kindRef.kind} dealt=${JSON.stringify(preDealt)} taken=${JSON.stringify(preTaken)}`);
  await flyTo(T, 4248, 2960, 40);
  T.socket.emit('sect_tech_learn', { techId: 'chien_y' }); await sleep(1000);
  T.socket.emit('sect_tech_learn', { techId: 'ho_the' }); await sleep(1000);
  const learned = (T.sync && T.sync.sectTech) || [];
  ok('D2 hoc duoc Chien Y + Ho The tai Tang Kinh Cac', learned.includes('chien_y') && learned.includes('ho_the'), JSON.stringify(learned) + ' err=' + T.errors.join(';'));
  const postDealt = await sampleDealt(T, kindRef, 6);
  const postTaken = await sampleTaken(T, kindRef.kind, 6);
  const rDealt = preDealt.length && postDealt.length ? median(postDealt) / median(preDealt) : 0;
  ok('D3 Chien Y +3% cong: sat thuong danh ra tang ~2-3%', rDealt >= 1.015 && rDealt <= 1.05, `pre=${median(preDealt)} post=${median(postDealt)} ratio=${rDealt.toFixed(3)}`);
  const rTaken = preTaken.length && postTaken.length ? median(postTaken) / median(preTaken) : 1;
  const preLow = preTaken.filter((x) => x <= median(preTaken) - 1).length;
  const postLow = postTaken.filter((x) => x <= median(preTaken) - 1).length;
  ok('D4 Ho The +3% phong: sat thuong an vao giam (trung vi xuong hoac xuat hien cu thap hon muc nen)', (rTaken < 1 && rTaken >= 0.85) || (preLow === 0 && postLow >= 2), `pre=${median(preTaken)} post=${median(postTaken)} ratio=${rTaken.toFixed(3)} preLow=${preLow} postLow=${postLow} preAll=${JSON.stringify(preTaken)} postAll=${JSON.stringify(postTaken)}`);
  T.socket.disconnect();
  await stopServer();
  console.log(`\n== p327d: ${pass} PASS, ${fail} FAIL ==`);
  process.exit(fail ? 1 : 0);
})();
