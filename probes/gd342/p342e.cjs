// Probe GĐ342-E — 2 ca chốt: (1) Hư Kiếm Ý: chỉ cast vào Sâm Lâm Cự Mãng CÔ LẬP (không quái khác trong 75px)
// để cast không bị cướp mục tiêu; loại mẫu chí mạng Sát Khí trước khi đếm xuyên phòng.
// (2) Tham Tượng Linh thạch rơi: hạ 8 Huyết Lang/người + nhặt, tổng kết bằng FILE nhân vật sau khi dừng server.
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
let serverProc = null, killTimer = null, CUR_PORT = 3636;
async function startServer(port, tag) {
  CUR_PORT = port;
  if (!(await portFree(port))) throw new Error('port ban ' + port);
  serverProc = spawn('node', ['server/index.js'], { cwd: ROOT, env: { ...process.env, PORT: String(port), TTT_STORAGE: 'file', TTT_CHAR_FILE: path.join(DIR, 'characters.json'), TTT_ACC_FILE: path.join(DIR, 'accounts.json'), TTT_WORLD_FILE: path.join(DIR, 'world.json'), TTT_SESS_FILE: path.join(DIR, 'sessions.json'), TTT_DAY_REAL_MS: '600000', TTT_TUVI_NEED: '5', TTT_WORLD_START_MINUTES: '600' }, stdio: ['ignore', 'pipe', 'pipe'] });
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
  return Object.assign({ token, name, classId: 'kiemtu', gender: 'nam', race: null, geo175: 1, realm: 'kd', tier: 1, x: 4248, y: 2950, mapId: 'huyet_sac_rung', hp: 99999, lifespan: 500, birthDay: -5660, ageStart: 16, stats: { ...STATS }, statPoints: 0, freePoints: 0, tuVi: 0, stones: 0, stonesTrung: 0, stonesThuong: 0, stonesCuc: 0, inventory: {}, gearBag: {}, equipped: [], skills: [], job: null, job2: null, job3: null, linhCan: { elements: ['kim'], main: 'kim', count: 1, mutations: [] }, affinity: {}, affV2: 1, bonds: {}, quests: {}, questsDone: {}, flags: {}, counters: {}, disciples: [], foundInvites: [], reformIn: [], sectTech: [], sectArts: [], sectArtsActive: [], mails: [], classRes: {}, food: 100, water: 100 }, extra || {});
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
  while (Date.now() - t0 < 30000) { const me = meOf(c); if (!me) { await sleep(120); continue; } const dx = x - me.x, dy = y - me.y; const d = Math.hypot(dx, dy); if (d <= (tol || 45)) break; c.socket.emit('client_input', { vx: dx / d, vy: dy / d }); await sleep(110); }
  c.socket.emit('client_input', { vx: 0, vy: 0 });
}
async function land(c) { if (c.flying) { c.socket.emit('fly_toggle', {}); c.flying = false; await sleep(450); } }
async function castIsolated(c, kind) {
  const all = monsOf(c);
  const cands = all.filter((m) => m.kind === kind && m.hp >= (m.maxHp || 9999) - 1 && !all.some((o) => o.id !== m.id && Math.hypot(o.x - m.x, o.y - m.y) < 75));
  const me = meOf(c); if (!me || !cands.length) return null;
  cands.sort((a, b) => Math.hypot(a.x - me.x, a.y - me.y) - Math.hypot(b.x - me.x, b.y - me.y));
  const w = cands[0];
  await flyTo(c, w.x, w.y, 30);
  const i1 = c.casts.length;
  c.socket.emit('cast_skill', { slot: 0 });
  const res = await waitFor(() => c.casts.length > i1 && c.casts[c.casts.length - 1], 3500);
  if (!res || !res.ok) return null;
  const tm = monsOf(c).find((m) => m.id === res.targetId);
  if (!tm || tm.kind !== kind) return null;
  return res.dmg;
}
const median = (a) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : 0; };

(async () => {
  const chars = {};
  chars['tk342hky07'] = BASE('tk342hky07', 'HkyE342', { classId: 'satthu', talent: { id: 'hu_kiem_y', tier: 'hu' }, skills: ['satthu_1'], equipped: ['satthu_1'] });
  chars['tk342sct07'] = BASE('tk342sct07', 'SCtE342', { classId: 'satthu', skills: ['satthu_1'], equipped: ['satthu_1'] });
  chars['tk342ttu07'] = BASE('tk342ttu07', 'TtuE342', { talent: { id: 'tham_tuong', tier: 'den' } });
  chars['tk342ttc07'] = BASE('tk342ttc07', 'TtuCtE342', {});
  fs.writeFileSync(path.join(DIR, 'characters.json'), JSON.stringify(chars, null, 1));
  fs.writeFileSync(path.join(DIR, 'accounts.json'), '{}');
  for (const f of ['world.json', 'sessions.json']) { try { fs.unlinkSync(path.join(DIR, f)); } catch (e) {} }
  await startServer(3636, '342e');
  const sctrl = connect('tk342sct07'); const hky = connect('tk342hky07');
  await waitFor(() => sctrl.welcome && hky.welcome, 10000);
  await waitStableMons(sctrl);
  // E1 xuyên phòng trên mãng cô lập
  async function samples(c, want, maxTry) {
    const out = []; let tries = 0;
    while (out.length < want && tries++ < maxTry) { const d = await castIsolated(c, 'sam_lam_cu_mang'); if (d && d > 0) out.push(d); await sleep(150); }
    return out;
  }
  const sC = await samples(sctrl, 12, 40);
  const v0 = median(sC.filter((d) => d < 190));
  const cNc = sC.filter((d) => d < v0 * 1.7);
  ok('E1a đối chứng mãng cô lập: mẫu không chí mạng 1 mức dmg', cNc.length >= 8 && cNc.every((d) => d === v0), JSON.stringify(sC));
  const sH = await samples(hky, 30, 80);
  const hNc = sH.filter((d) => d < v0 * 1.7);
  const pierced = hNc.filter((d) => d > v0).length;
  note('E1 mẫu tài: ' + JSON.stringify(sH));
  ok('E1b Hư Kiếm Ý: xuyên phòng ~20% mẫu không chí mạng (2–11, mọi mẫu hoặc bằng mốc hoặc cao hơn)', hNc.length >= 20 && pierced >= 2 && pierced <= 11 && hNc.every((d) => d === v0 || d > v0), `nonCrit=${hNc.length} pierced=${pierced} v0=${v0} vals=${JSON.stringify([...new Set(sH)])}`);
  sctrl.socket.disconnect(); hky.socket.disconnect();
  // E2 Linh thạch rơi — tổng kết bằng file
  const ttuct = connect('tk342ttc07'); const ttu = connect('tk342ttu07');
  await waitFor(() => ttuct.welcome && ttu.welcome, 10000);
  await waitFor(() => meOf(ttuct) && meOf(ttu), 8000);
  async function killLangs(c, n) {
    let kills = 0;
    for (let k = 0; k < n; k++) {
      const me = meOf(c); if (!me) break;
      const t0 = monsOf(c).filter((m) => m.kind === 'huyetlang').sort((a, b) => Math.hypot(a.x - me.x, a.y - me.y) - Math.hypot(b.x - me.x, b.y - me.y))[0];
      if (!t0) { await sleep(2500); continue; }
      await flyTo(c, t0.x, t0.y, 26); await land(c);
      let deathPos = { x: t0.x, y: t0.y }; let dead = false;
      for (let att = 0; att < 14 && !dead; att++) {
        const live = monsOf(c).find((m) => m.id === t0.id);
        if (!live) { dead = true; break; }
        deathPos = { x: live.x, y: live.y };
        c.socket.emit('player_attack'); await sleep(800);
        if (!monsOf(c).find((m) => m.id === t0.id)) dead = true;
      }
      if (!dead) continue;
      kills++;
      await flyTo(c, deathPos.x, deathPos.y, 6); await land(c);
      for (const [vx, vy] of [[1, 0], [0, 1], [-1, 0], [0, -1]]) { c.socket.emit('client_input', { vx, vy }); await sleep(260); }
      c.socket.emit('client_input', { vx: 0, vy: 0 });
      await sleep(600);
    }
    return kills;
  }
  const kC = await killLangs(ttuct, 8);
  const kT = await killLangs(ttu, 8);
  ttuct.socket.disconnect(); ttu.socket.disconnect();
  await stopServer();
  const saved = JSON.parse(fs.readFileSync(path.join(DIR, 'characters.json'), 'utf8'));
  const totC = (saved['tk342ttc07'] || {}).stones || 0;
  const totT = (saved['tk342ttu07'] || {}).stones || 0;
  ok('E2 Tham Tượng: tổng Linh thạch từ 8 lần hạ Huyết Lang cao hơn đối chứng ~25% (tỉ lệ 1,05–1,50)', kC >= 7 && kT >= 7 && totC > 0 && totT > totC && (totT / totC) >= 1.05 && (totT / totC) <= 1.50, `kills ctrl=${kC} talent=${kT} | tong ctrl=${totC} talent=${totT}`);
  console.log('=== TỔNG GĐ342-E: PASS=' + pass + ' FAIL=' + fail);
  process.exit(fail > 0 ? 1 : 0);
})().catch(async (e) => { console.error('PROBE ERROR', e); try { await stopServer(); } catch (x) {} process.exit(2); });
