// Probe GĐ364b — đo A3-3 + D-1 (chạy song song p364a, port + file dữ liệu riêng):
//  A3-3: hạ 90 Kiếm Ma/Huyết Lang thường ở Thạch Lâm (nền đá [3,8], farmNerf 0,7,
//        không bot chen) — ghi mọi cục đá rơi: trung bình phải ≈ 3,85 (0,7 × 5,5)
//        thay cho 4,00 của bản round cũ; cuối phiên đọc stoneFrac trong file ∈ [0,1).
//  D-1: char Đại Khí Vận (kênh R danh nghĩa 0,20) farm bãi nhà + mở mọi rương thấy
//        được cho tới 300 lần mở (chest_opened chỉ phát cho người mở nên không nhiễu
//        bot) — đếm dòng "cơ duyên" → tỉ lệ thật vs 0,20 (dải ±2σ).
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const net = require('net');
const ROOT = path.join(__dirname, '..', '..');
const PORT = 3795;
const DIR = __dirname;
const { io } = require(path.join(ROOT, 'client/node_modules/socket.io-client'));
const { createMerger } = require(path.join(ROOT, 'client/worldmerge.cjs'));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function waitFor(fn, ms) { const t0 = Date.now(); while (Date.now() - t0 < ms) { const v = fn(); if (v) return v; await sleep(150); } return null; }
function portFree(port) { return new Promise((res) => { const s = net.createServer(); s.once('error', () => res(false)); s.listen(port, () => s.close(() => res(true))); }); }
let serverProc = null, killTimer = null;
async function startServer() {
  if (!(await portFree(PORT))) throw new Error('port ban');
  serverProc = spawn('node', ['server/index.js'], { cwd: ROOT, env: { ...process.env, PORT: String(PORT), TTT_STORAGE: 'file', TTT_CHAR_FILE: path.join(DIR, 'charactersb.json'), TTT_ACC_FILE: path.join(DIR, 'accountsb.json'), TTT_WORLD_FILE: path.join(DIR, 'worldb.json'), TTT_SESS_FILE: path.join(DIR, 'sessionsb.json'), TTT_DAY_REAL_MS: '600000', TTT_TUVI_NEED: '5', TTT_CHEST_TTL_MS: '3600000' }, stdio: ['ignore', 'pipe', 'pipe'] });
  serverProc.stderr.on('data', (d) => process.stderr.write('[srv] ' + d));
  killTimer = setTimeout(() => { try { serverProc.kill('SIGKILL'); } catch (e) {} }, 3600000);
  const t0 = Date.now();
  while (Date.now() - t0 < 45000) { try { const r = await fetch(`http://127.0.0.1:${PORT}/api/status`); if (r.ok) { clearTimeout(killTimer); killTimer = null; return; } } catch (e) {} await sleep(500); }
  throw new Error('server khong len');
}
async function stopServer() { if (!serverProc) return; const p = serverProc; serverProc = null; if (killTimer) { clearTimeout(killTimer); killTimer = null; } await new Promise((res) => { const t = setTimeout(() => { try { p.kill('SIGKILL'); } catch (e) {} res(); }, 4000); p.once('exit', () => { clearTimeout(t); res(); }); try { p.kill('SIGTERM'); } catch (e) { clearTimeout(t); res(); } }); const t0 = Date.now(); while (Date.now() - t0 < 10000 && !(await portFree(PORT))) await sleep(300); }
function BASE(token, name, extra) {
  return Object.assign({ token, name, classId: 'kiemtu', gender: 'nam', race: null, geo175: 1, realm: 'kd', tier: 1, x: 1565, y: 1252, mapId: 'lang_tan_thu', hp: 99999, mp: 9999, stats: { khiHuyet: 500, vatCong: 400, vatPhong: 200, phapCong: 100, phapPhong: 78, tocDo: 60, minhMan: 100 }, statPoints: 0, freePoints: 0, tuVi: 0, stones: 0, stonesTrung: 0, stonesThuong: 0, stonesCuc: 0, inventory: {}, gearBag: {}, equipped: [], skills: [], job: null, job2: null, job3: null, linhCan: { element: 'kim', grade: 'trung', mult: 1.2 }, affinity: {}, affV2: 1, bonds: {}, quests: {}, questsDone: {}, flags: {}, counters: {}, disciples: [], foundInvites: [], reformIn: [], sectTech: [], sectArts: [], sectArtsActive: [], mails: [], classRes: {} }, extra || {});
}
let pass = 0, fail = 0;
function ok(name, cond, extra) { if (cond) { pass++; console.log('PASS | ' + name); } else { fail++; console.log('FAIL | ' + name + (extra ? ' | ' + extra : '')); } }
function note(t) { console.log('NOTE | ' + t); }
async function connect(token) {
  const socket = io(`http://127.0.0.1:${PORT}`, { transports: ['websocket'] });
  const ctx = { socket, merger: createMerger(), state: null, welcome: null, errors: [], chestEvents: [], casts: [], lastSync: null };
  socket.on('connect', () => socket.emit('hello', { token }));
  socket.on('welcome', (w) => { ctx.welcome = w; });
  socket.on('server_tick', (t) => { const st = ctx.merger(t); if (st) ctx.state = st; });
  socket.on('interact_error', (e) => ctx.errors.push(e));
  socket.on('chest_opened', (e) => ctx.chestEvents.push(e));
  socket.on('cast_result', (e) => ctx.casts.push(e));
  socket.on('char_sync', (s) => { ctx.lastSync = s; });
  await waitFor(() => ctx.welcome, 20000);
  return ctx;
}
const meOf = (c, name) => (c.state?.players || []).find((p) => p.name === name);
const monsOf = (c) => c.state?.monsters || [];
async function flyTo(c, name, x, y, tol, timeoutMs) {
  c.socket.emit('fly_toggle', {}); await sleep(300);
  const t0 = Date.now();
  while (Date.now() - t0 < (timeoutMs || 20000)) { const me = meOf(c, name); if (!me) { await sleep(120); continue; } const dx = x - me.x, dy = y - me.y; const d = Math.hypot(dx, dy); if (d <= (tol || 45)) break; c.socket.emit('client_input', { vx: dx / d, vy: dy / d }); await sleep(110); }
  c.socket.emit('client_input', { vx: 0, vy: 0 });
  c.socket.emit('fly_toggle', {}); await sleep(300);
}
async function killMonster(c, name, target, maxMs) {
  // Bay tới vị trí SỐNG của quái, đánh tới chết. Tick chỉ giữ quái trong tầm
  // nhìn (~1000px) nên quái ở xa bị merger loại khỏi state — KHÔNG được tính
  // là chết: chỉ xác nhận chết khi đã áp sát VÀ đã thấy máu nó sụt (engaged).
  // Trả về {dead, x, y} — x,y là vị trí sống cuối cùng.
  const t0 = Date.now();
  let lastM = { x: target.x, y: target.y };
  let engaged = false;
  const hp0 = target.hp || 0;
  while (Date.now() - t0 < (maxMs || 45000)) {
    const m = monsOf(c).find((x) => x.id === target.id);
    if (!m) return engaged ? { dead: true, ...lastM } : { dead: false, ...lastM };
    lastM = { x: m.x, y: m.y };
    if ((m.hp || 0) < hp0) engaged = true;
    if ((m.hp || 0) <= 0) return { dead: true, x: m.x, y: m.y };
    const me = meOf(c, name); if (!me) { await sleep(150); continue; }
    const d = Math.hypot(m.x - me.x, m.y - me.y);
    if (d > 40) { c.socket.emit('client_input', { vx: (m.x - me.x) / d, vy: (m.y - me.y) / d }); await sleep(110); continue; }
    c.socket.emit('client_input', { vx: 0, vy: 0 });
    c.socket.emit('player_attack', {});
    await sleep(320);
  }
  return null;
}

// Giết bằng chiêu tầm xa kiemtu_1 từ 70–118px (mẫu gd349d2): đứng ngay điểm
// chết thì cục đá bị nhặt tự động trong cùng tick, không kịp thấy ở state.
async function castKill(c, name, m0, slot) {
  const t0 = Date.now();
  let lastPos = { x: m0.x, y: m0.y };
  while (Date.now() - t0 < 20000) {
    const m = monsOf(c).find((x) => x.id === m0.id);
    if (!m) return { ok: false, lastPos };
    lastPos = { x: m.x, y: m.y };
    const me = meOf(c, name); if (!me) { await sleep(90); continue; }
    const d = Math.hypot(m.x - me.x, m.y - me.y);
    if (d > 118) { c.socket.emit('client_input', { vx: (m.x - me.x) / d, vy: (m.y - me.y) / d }); await sleep(100); continue; }
    c.socket.emit('client_input', { vx: 0, vy: 0 });
    if (d < 70) {
      c.socket.emit('client_input', { vx: -(m.x - me.x) / (d || 1), vy: -(m.y - me.y) / (d || 1) });
      await sleep(420); c.socket.emit('client_input', { vx: 0, vy: 0 }); continue;
    }
    const ci = c.casts.length;
    c.socket.emit('cast_skill', { slot });
    const cr = await waitFor(() => (c.casts.length > ci ? c.casts[c.casts.length - 1] : null), 1500);
    if (cr && cr.ok) {
      const gone = await waitFor(() => !monsOf(c).find((x) => x.id === m0.id) ? true : null, 1500);
      if (gone) return { ok: true, lastPos };
      // chưa chết: cast tiếp (vòng lặp) — nhưng nếu quái chỉ bị thương nặng thì cứ tiếp tục tới chết
      if ((cr.dmg || 0) > 0) continue;
    }
    await sleep(300);
  }
  return { ok: false, lastPos };
}

(async () => {
  const chars = {
    p364b00001: BASE('p364b00001', 'P364DoDa', { x: 5702, y: 1232, skills: ['kiemtu_1'] }),
    p364b00002: BASE('p364b00002', 'P364KhiVan', { talent: { id: 'dai_khi_van', tier: 'cam' } }),
  };
  fs.writeFileSync(path.join(DIR, 'charactersb.json'), JSON.stringify(chars));
  fs.writeFileSync(path.join(DIR, 'worldb.json'), JSON.stringify({ totalMinutes: 100 * 1440, savedAt: Date.now(), sects: [] }));
  fs.writeFileSync(path.join(DIR, 'accountsb.json'), JSON.stringify({}));
  fs.writeFileSync(path.join(DIR, 'sessionsb.json'), JSON.stringify({}));
  await startServer();

  // ================= D-1 =================
  const V = await connect('p364b00002');
  await waitFor(() => meOf(V, 'P364KhiVan'), 10000);
  const wc = (V.welcome || {}).character || {};
  note('D-1 payload: talent=' + JSON.stringify(wc.talent) + ' anBonus=' + JSON.stringify(wc.anBonus || null));
  const TARGET_OPENS = 300;
  const tD = Date.now();
  let guard = 0;
  while (V.chestEvents.length < TARGET_OPENS && Date.now() - tD < 22 * 60 * 1000 && guard++ < 4000) {
    const me = meOf(V, 'P364KhiVan'); if (!me) { await sleep(300); continue; }
    const chests = (V.state?.chests || []).slice().sort((a, b) => Math.hypot(a.x - me.x, a.y - me.y) - Math.hypot(b.x - me.x, b.y - me.y));
    if (chests.length) {
      const ch = chests[0];
      const before = V.chestEvents.length;
      await flyTo(V, 'P364KhiVan', ch.x, ch.y, 20, 15000);
      await waitFor(() => V.chestEvents.length > before, 2500);
      if (V.chestEvents.length > before && V.chestEvents.length % 25 === 0) note(`D-1 tien do: ${V.chestEvents.length} lan mo`);
      continue;
    }
    const cands = monsOf(V).filter((m) => ['wolf', 'bat', 'golem'].includes(m.kind) && !m.sp && (m.hp || 0) > 0)
      .sort((a, b) => Math.hypot(a.x - me.x, a.y - me.y) - Math.hypot(b.x - me.x, b.y - me.y));
    if (!cands.length) { await sleep(1200); continue; }
    // chỉ săn quái đã ở gần (trong tầm nhìn chắc chắn) cho khỏi đuổi theo bóng ma ngoài tầm
    const near = cands.filter((m) => Math.hypot(m.x - me.x, m.y - me.y) <= 700);
    if (!near.length) { await flyTo(V, 'P364KhiVan', cands[0].x, cands[0].y, 200, 12000); continue; }
    V.socket.emit('fly_toggle', {}); await sleep(250);
    await killMonster(V, 'P364KhiVan', near[0], 30000);
    V.socket.emit('fly_toggle', {});
    if (V.chestEvents.length % 50 === 0 && V.chestEvents.length > 0) note(`D-1: ${V.chestEvents.length} lần mở`);
  }
  const opens = V.chestEvents.length;
  const hits = V.chestEvents.filter((e) => (e.loot || []).some((l) => String(l).includes('cơ duyên'))).length;
  const rate = opens ? hits / opens : 0;
  const seR = opens ? Math.sqrt(0.2 * 0.8 / opens) : 0;
  note(`D-1: opens=${opens} coDuyen=${hits} rate=${rate.toFixed(4)} nominal=0.2000 se=${seR.toFixed(4)} 2σ band=[${(0.2 - 2 * seR).toFixed(3)}, ${(0.2 + 2 * seR).toFixed(3)}]`);
  ok('D-1: đủ mẫu lớn (≥280 lần mở)', opens >= 280, 'opens=' + opens);
  ok('D-1: tỉ lệ thêm món hiếm kênh R khớp danh nghĩa 0,20 trong ±2σ', Math.abs(rate - 0.2) <= 2 * seR, `rate=${rate.toFixed(4)} band=±${(2 * seR).toFixed(3)}`);
  V.socket.disconnect(); await sleep(600);
  await stopServer();
  console.log(`\n== p364c (D-1 chay not): ${pass} PASS, ${fail} FAIL ==`);
  process.exit(fail ? 1 : 0);
})().catch(async (e) => { console.error('LOI:', e); await stopServer(); process.exit(2); });
