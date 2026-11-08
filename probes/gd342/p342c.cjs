// Probe GĐ342-C — 3 ca cuối: (1) Huyết Dũng đo bằng CAST Thể tu (đòn thường Thể tu dính rageBonus theo Nộ + 50% Vật phòng
// khi Nộ đầy — kênh riêng của lớp, làm nhiễu mốc; cast không qua kênh đó, chỉ qua atkMulOf như thiết kế).
// (2) GIÁ Huyết Tế Tâm: cast trên mặt đất, in toàn bộ diễn biến hp + kết quả cast để chốt số.
// (3) Hư Kiếm Ý trên 'sam_lam_cu_mang' (loài GDD trên map Huyết Sắc — phòng theo thang cảnh TC, khác 0).
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
let serverProc = null, killTimer = null, CUR_PORT = 3631;
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
  const ctx = { socket, merger: createMerger(), state: null, welcome: null, notices: [], casts: [], sync: null, errors: [] };
  socket.on('connect', () => socket.emit('hello', { token }));
  socket.on('welcome', (w) => { ctx.welcome = w; ctx.myName = (w.character || {}).name; });
  socket.on('notice', (n) => ctx.notices.push(n.text || ''));
  socket.on('cast_result', (r) => ctx.casts.push(r));
  socket.on('char_sync', (sy) => { ctx.sync = sy; });
  socket.on('server_tick', (t) => { const st = ctx.merger(t); if (st) ctx.state = st; });
  socket.on('interact_error', (e) => ctx.errors.push(e.message || ''));
  return ctx;
}
const meOf = (c) => (c.state?.players || []).find((p) => p.name === c.myName) || null;
const monsOf = (c) => c.state?.monsters || [];
const tickHp = (c) => { const me = meOf(c); return me ? me.hp : null; };
async function waitStableMons(c, ms) { let last = -1, stable = 0; const t0 = Date.now(); while (Date.now() - t0 < (ms || 20000)) { const n = monsOf(c).length; if (n > 0 && n === last) { stable++; if (stable >= 3) return n; } else stable = 0; last = n; await sleep(400); } return last; }
async function flyTo(c, x, y, tol) {
  if (!c.flying) { c.socket.emit('fly_toggle', {}); c.flying = true; await sleep(350); }
  const t0 = Date.now();
  while (Date.now() - t0 < 30000) { const me = meOf(c); if (!me) { await sleep(120); continue; } const dx = x - me.x, dy = y - me.y; const d = Math.hypot(dx, dy); if (d <= (tol || 45)) break; c.socket.emit('client_input', { vx: dx / d, vy: dy / d }); await sleep(110); }
  c.socket.emit('client_input', { vx: 0, vy: 0 });
}
async function land(c) { if (c.flying) { c.socket.emit('fly_toggle', {}); c.flying = false; await sleep(450); } }
async function castAt(c, slot, kind, tol) {
  const me = meOf(c); if (!me) return null;
  const ws = monsOf(c).filter((m) => m.kind === kind && m.hp >= (m.maxHp || 9999) - 1).sort((a, b) => Math.hypot(a.x - me.x, a.y - me.y) - Math.hypot(b.x - me.x, b.y - me.y));
  const w = ws[0]; if (!w) return null;
  await flyTo(c, w.x, w.y, tol || 100);
  const i1 = c.casts.length;
  c.socket.emit('cast_skill', { slot });
  let res = await waitFor(() => c.casts.length > i1 && c.casts[c.casts.length - 1], 3500);
  if (!res || !res.ok) { await land(c); const i2 = c.casts.length; c.socket.emit('cast_skill', { slot }); res = await waitFor(() => c.casts.length > i2 && c.casts[c.casts.length - 1], 3500); }
  if (!res || !res.ok) return null;
  const tm = monsOf(c).find((m) => m.id === res.targetId);
  return { res, kind: tm ? tm.kind : null };
}
const median = (a) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : 0; };

(async () => {
  const chars = {};
  chars['tk342thc03'] = BASE('tk342thc03', 'ThCtC342', { classId: 'thetu', skills: ['thetu_1'], equipped: ['thetu_1'] });
  chars['tk342hdf03'] = BASE('tk342hdf03', 'HdFulC342', { classId: 'thetu', talent: { id: 'huyet_dung', tier: 'do' }, skills: ['thetu_1'], equipped: ['thetu_1'] });
  chars['tk342hdl03'] = BASE('tk342hdl03', 'HdLowC342', { classId: 'thetu', talent: { id: 'huyet_dung', tier: 'do' }, hp: 250, skills: ['thetu_1'], equipped: ['thetu_1'] });
  chars['tk342hte03'] = BASE('tk342hte03', 'HteC342', { classId: 'phaptu', talent: { id: 'huyet_te', tier: 'den' }, skills: ['phaptu_1'], equipped: ['phaptu_1'] });
  chars['tk342hky03'] = BASE('tk342hky03', 'HkyC342', { classId: 'satthu', talent: { id: 'hu_kiem_y', tier: 'hu' }, skills: ['satthu_1'], equipped: ['satthu_1'] });
  chars['tk342sct03'] = BASE('tk342sct03', 'SCtC342', { classId: 'satthu', skills: ['satthu_1'], equipped: ['satthu_1'] });
  const VILL = { mapId: 'lang_tan_thu', x: 809, y: 1225 };
  chars['tk342sel03'] = BASE('tk342sel03', 'SelC342', { talent: { id: 'tham_tuong', tier: 'den' }, inventory: { dan_truc_co: 1 }, ...VILL });
  chars['tk342slc03'] = BASE('tk342slc03', 'SelCtC342', { inventory: { dan_truc_co: 1 }, ...VILL });
  chars['tk342ttu03'] = BASE('tk342ttu03', 'TtuC342', { talent: { id: 'tham_tuong', tier: 'den' } });
  chars['tk342ttc03'] = BASE('tk342ttc03', 'TtuCtC342', {});
  fs.writeFileSync(path.join(DIR, 'characters.json'), JSON.stringify(chars, null, 1));
  fs.writeFileSync(path.join(DIR, 'accounts.json'), '{}');
  for (const f of ['world.json', 'sessions.json']) { try { fs.unlinkSync(path.join(DIR, f)); } catch (e) {} }
  await startServer(3631, '342h');
  const hdlow = connect('tk342hdl03');
  await waitFor(() => hdlow.welcome, 10000);
  hdlow.socket.emit('fly_toggle', {}); hdlow.flying = true;
  const thct = connect('tk342thc03'); const hdful = connect('tk342hdf03'); const hte = connect('tk342hte03'); const hky = connect('tk342hky03'); const sctrl = connect('tk342sct03');
  await waitFor(() => thct.welcome && hdful.welcome && hte.welcome && sctrl.welcome, 10000);
  await waitStableMons(thct);
  // C1 Huyết Dũng qua cast Thể tu (thetu_1 hệ số 1,0 — lang phòng 0)
  const cLow = await castAt(hdlow, 0, 'huyetlang', 30);
  const cTh = await castAt(thct, 0, 'huyetlang', 30);
  const cFull = await castAt(hdful, 0, 'huyetlang', 30);
  const dTh = cTh ? cTh.res.dmg : 0, dFull = cFull ? cFull.res.dmg : 0, dLow = cLow ? cLow.res.dmg : 0;
  ok('C1a mốc cast Thể tu đo được', dTh > 0, 'dTh=' + dTh);
  ok('C1b Huyết Dũng máu đầy: cast +6% (dải 1,03–1,10)', dFull > dTh && dFull >= Math.floor(dTh * 1.03) && dFull <= Math.ceil(dTh * 1.10), `full=${dFull} th=${dTh}`);
  ok('C1c Huyết Dũng máu <30%: cast +12% (dải 1,08–1,16, cao hơn máu đầy)', dLow > dFull && dLow >= Math.floor(dTh * 1.08) && dLow <= Math.ceil(dTh * 1.16), `low=${dLow} full=${dFull} th=${dTh} hpLow=${tickHp(hdlow)}`);
  hdlow.socket.disconnect(); thct.socket.disconnect(); hdful.socket.disconnect();
  // C2 GIÁ Huyết Tế Tâm: cast trên mặt đất cạnh Huyết Lang, theo dõi hp tick từng 150ms
  {
    const lang = monsOf(hte).filter((m) => m.kind === 'huyetlang')[0];
    if (lang) { await flyTo(hte, lang.x, lang.y, 60); await land(hte); }
    const hpB = tickHp(hte); const maxHp = (meOf(hte) || {}).maxHp || 0;
    const i1 = hte.casts.length;
    hte.socket.emit('cast_skill', { slot: 0 });
    const res = await waitFor(() => hte.casts.length > i1 && hte.casts[hte.casts.length - 1], 4000);
    const series = [];
    for (let i = 0; i < 14; i++) { series.push(tickHp(hte)); await sleep(150); }
    const hpMin = Math.min(...series.filter((x) => x != null));
    note('C2 diễn biến: hpB=' + hpB + ' res=' + JSON.stringify(res) + ' series=' + JSON.stringify(series));
    ok('C2 GIÁ Huyết Tế Tâm: sau cast hp tụt đúng 4% máu tối đa', !!res && res.ok && hpB != null && maxHp > 0 && Math.abs((hpB - hpMin) - Math.round(maxHp * 0.04)) <= 2, `hpB=${hpB} hpMin=${hpMin} maxHp=${maxHp} expect=${Math.round(maxHp * 0.04)}`);
    hte.socket.disconnect();
  }
  // C3 Hư Kiếm Ý trên sam_lam_cu_mang
  async function pierceSamples(c, n, kind) {
    const out = []; let guard = 0;
    while (out.length < n && guard++ < n * 4) { const r = await castAt(c, 0, kind, 30); if (r && r.kind === kind && r.res.dmg > 0) out.push(r.res.dmg); await sleep(120); }
    return out;
  }
  const sCtrl = await pierceSamples(sctrl, 16, 'sam_lam_cu_mang');
  const sHky = await pierceSamples(hky, 32, 'sam_lam_cu_mang');
  // Ảnh tu cast có CHÍ MẠNG theo Sát Khí (dmg ×2 — thấy ở bản F1.5) -> loại mẫu chí mạng (>= 1,7 x mốc) trước khi đếm xuyên phòng
  const v0 = median(sCtrl.filter((d) => d < 200));
  const ctrlNc = sCtrl.filter((d) => d < v0 * 1.7);
  const hkyNc = sHky.filter((d) => d < v0 * 1.7);
  const ctrlSingle = ctrlNc.length >= 10 && ctrlNc.every((d) => d === v0);
  const pierced = hkyNc.filter((d) => d > v0).length;
  ok('C3a đối chứng xuyên phòng (Sâm Lâm Cự Mãng): mẫu không chí mạng chỉ 1 mức dmg', ctrlSingle, JSON.stringify(sCtrl));
  ok('C3b Hư Kiếm Ý: mức dmg xuyên phòng ~20% mẫu không chí mạng (2–11)', hkyNc.length >= 20 && pierced >= 2 && pierced <= 11 && hkyNc.every((d) => d === v0 || d > v0), `n=${sHky.length} nonCrit=${hkyNc.length} pierced=${pierced} v0=${v0} vals=${JSON.stringify([...new Set(sHky)])}`);
  // C4 bán NPC: bay tới điểm tiệm đã scale, bán, đọc stones qua char_sync SAU bán (handler có syncChar) + chốt bằng file
  const selct = connect('tk342slc03'); const sel = connect('tk342sel03');
  await waitFor(() => selct.welcome && sel.welcome, 10000);
  await waitFor(() => meOf(selct) && meOf(sel), 8000);
  async function sellOne(c) {
    await flyTo(c, 2263, 1210, 15); await land(c);
    const s0 = (c.welcome && c.welcome.character && c.welcome.character.stones) || 0;
    c.socket.emit('shop_sell', { shopId: 'tiem_dan', itemId: 'dan_truc_co' });
    const g = await waitFor(() => { const s = c.sync && c.sync.character ? c.sync.character.stones : null; return (s != null && s !== s0) ? s - s0 : null; }, 4000);
    return g;
  }
  const gC = await sellOne(selct);
  const gT = await sellOne(sel);
  ok('C4a đối chứng bán NPC: +320 Linh thạch', gC === 320, 'gain=' + gC + ' err=' + selct.errors.join(';'));
  ok('C4b GIÁ Tham Tượng: bán NPC chỉ +288 (−10%)', gT === 288, 'gain=' + gT + ' err=' + sel.errors.join(';'));
  selct.socket.disconnect(); sel.socket.disconnect();
  // C5 Linh thạch rơi: mỗi nhân vật hạ đúng 8 Huyết Lang + nhặt tại điểm chết; tổng kết bằng file sau khi dừng server
  const ttu = connect('tk342ttu03'); const ttuct = connect('tk342ttc03');
  await waitFor(() => ttu.welcome && ttuct.welcome, 10000);
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
  const totC = (saved['tk342ttc03'] || {}).stones || 0;
  const totT = (saved['tk342ttu03'] || {}).stones || 0;
  ok('C5 Tham Tượng: tổng Linh thạch nhặt từ 8 lần hạ quái cao hơn đối chứng ~25% (tỉ lệ 1,05–1,50)', kC >= 7 && kT >= 7 && totC > 0 && totT > totC && (totT / totC) >= 1.05 && (totT / totC) <= 1.50, `kills ctrl=${kC} talent=${kT} | tong ctrl=${totC} talent=${totT}`);
  console.log('=== TỔNG GĐ342-C: PASS=' + pass + ' FAIL=' + fail);
  process.exit(fail > 0 ? 1 : 0);
})().catch(async (e) => { console.error('PROBE ERROR', e); try { await stopServer(); } catch (x) {} process.exit(2); });
