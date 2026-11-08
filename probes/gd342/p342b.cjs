// Probe GĐ342-B — ĐO BỔ SUNG các ca bản chính đo hụt vì PHƯƠNG PHÁP (không phải lỗi game):
// - hp đọc qua TICK (char_sync đến muộn/không đến khi không có hành động) cho Bất Diệt, GIÁ Huyết Tế, thiền Ma Tâm Trấn.
// - Mốc chuẩn CÙNG LỚP cho Huyết Dũng (Thể tu) và Dạ Hành (Ảnh tu) — đòn thường mỗi lớp hệ số khác nhau, bản chính so chéo lớp.
// - Hư Kiếm Ý: khám phá loài có mặt thật trên map lúc chạy (bản chính nhắm Kiếm Ma — map này không có Kiếm Ma) rồi lấy mẫu theo loài đó.
// - Bán NPC: bay tới đúng điểm tiệm (đã scale) trước khi bán — nhân vật nối muộn bị diễn viên offline dời chỗ.
// - Linh thạch rơi: ép char_sync bằng sect_get trước khi đọc stones.
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
async function startServer(port, tag, startMin) {
  CUR_PORT = port;
  if (!(await portFree(port))) throw new Error('port ban ' + port);
  const env = { ...process.env, PORT: String(port), TTT_STORAGE: 'file', TTT_CHAR_FILE: path.join(DIR, 'characters.json'), TTT_ACC_FILE: path.join(DIR, 'accounts.json'), TTT_WORLD_FILE: path.join(DIR, 'world.json'), TTT_SESS_FILE: path.join(DIR, 'sessions.json'), TTT_DAY_REAL_MS: '600000', TTT_TUVI_NEED: '5' };
  if (startMin != null) env.TTT_WORLD_START_MINUTES = String(startMin);
  serverProc = spawn('node', ['server/index.js'], { cwd: ROOT, env, stdio: ['ignore', 'pipe', 'pipe'] });
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
  const ctx = { socket, merger: createMerger(), state: null, welcome: null, notices: [], casts: [], sync: null, downed: false, errors: [] };
  socket.on('connect', () => socket.emit('hello', { token }));
  socket.on('welcome', (w) => { ctx.welcome = w; ctx.myName = (w.character || {}).name; });
  socket.on('notice', (n) => ctx.notices.push(n.text || ''));
  socket.on('cast_result', (r) => ctx.casts.push(r));
  socket.on('char_sync', (sy) => { ctx.sync = sy; });
  socket.on('server_tick', (t) => { const st = ctx.merger(t); if (st) ctx.state = st; });
  socket.on('player_downed', () => { ctx.downed = true; });
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
async function firstHitDrop(c, kind) {
  const me = meOf(c); if (!me) return 0;
  const ws = monsOf(c).filter((m) => m.kind === kind && m.hp >= (m.maxHp || 9999) - 1).sort((a, b) => Math.hypot(a.x - me.x, a.y - me.y) - Math.hypot(b.x - me.x, b.y - me.y));
  const w = ws[0]; if (!w) return 0;
  for (let t = 0; t < 5; t++) {
    const live = monsOf(c).find((m) => m.id === w.id); if (!live) return 0;
    await flyTo(c, live.x, live.y, 30); await land(c);
    const before = (monsOf(c).find((m) => m.id === w.id) || {}).hp;
    if (before == null) return 0;
    c.socket.emit('player_attack'); await sleep(650);
    const after = (monsOf(c).find((m) => m.id === w.id) || {}).hp;
    if (after == null) return before;
    if (after < before) return before - after;
  }
  return 0;
}
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
let DS0 = 0; // mốc đòn thường Ảnh tu (ngày, không thiên phú)

(async () => {
  // ================= F1 (3628, NGÀY) =================
  {
    const VILL = { mapId: 'lang_tan_thu', x: 809, y: 1225 };
    const chars = {};
    chars['tk342bdi02'] = BASE('tk342bdi02', 'BDiB342', { classId: 'thetu', talent: { id: 'bat_diet', tier: 'do' }, hp: 30, stats: { ...STATS, vatPhong: 0 } });
    chars['tk342hdl02'] = BASE('tk342hdl02', 'HdLowB342', { classId: 'thetu', talent: { id: 'huyet_dung', tier: 'do' }, hp: 250, stats: { ...STATS, vatPhong: 300 } });
    chars['tk342mtt02'] = BASE('tk342mtt02', 'MttB342', { talent: { id: 'ma_tam_tran', tier: 'den' }, hp: 500, ...VILL });
    chars['tk342med02'] = BASE('tk342med02', 'MedB342', { hp: 500, ...VILL });
    chars['tk342thct2'] = BASE('tk342thct2', 'ThCtB342', { classId: 'thetu' });
    chars['tk342hdf02'] = BASE('tk342hdf02', 'HdFulB342', { classId: 'thetu', talent: { id: 'huyet_dung', tier: 'do' } });
    chars['tk342hte02'] = BASE('tk342hte02', 'HteB342', { classId: 'phaptu', talent: { id: 'huyet_te', tier: 'den' }, skills: ['phaptu_1'], equipped: ['phaptu_1'] });
    chars['tk342hky02'] = BASE('tk342hky02', 'HkyB342', { classId: 'satthu', talent: { id: 'hu_kiem_y', tier: 'hu' }, skills: ['satthu_1'], equipped: ['satthu_1'] });
    chars['tk342sct02'] = BASE('tk342sct02', 'SCtB342', { classId: 'satthu', skills: ['satthu_1'], equipped: ['satthu_1'] });
    chars['tk342hkt02'] = BASE('tk342hkt02', 'HktB342', { talent: { id: 'huyet_kiem_tam', tier: 'do' }, stats: { ...STATS, vatCong: 40, vatPhong: 1000 } });
    chars['tk342cct02'] = BASE('tk342cct02', 'CCtB342', { stats: { ...STATS, vatCong: 40, vatPhong: 1000 } });
    chars['tk342ttu02'] = BASE('tk342ttu02', 'TtuB342', { talent: { id: 'tham_tuong', tier: 'den' } });
    chars['tk342ttc02'] = BASE('tk342ttc02', 'TtuCtB342', {});
    chars['tk342dah02'] = BASE('tk342dah02', 'DahB342', { classId: 'satthu', talent: { id: 'da_hanh', tier: 'den' } });
    chars['tk342sel02'] = BASE('tk342sel02', 'SelB342', { talent: { id: 'tham_tuong', tier: 'den' }, inventory: { dan_truc_co: 1 }, ...VILL });
    chars['tk342slc02'] = BASE('tk342slc02', 'SelCtB342', { inventory: { dan_truc_co: 1 }, ...VILL });
    fs.writeFileSync(path.join(DIR, 'characters.json'), JSON.stringify(chars, null, 1));
    fs.writeFileSync(path.join(DIR, 'accounts.json'), '{}');
    for (const f of ['world.json', 'sessions.json']) { try { fs.unlinkSync(path.join(DIR, f)); } catch (e) {} }
    await startServer(3628, '342f', 600);
    const bdi = connect('tk342bdi02'); const hdlow = connect('tk342hdl02'); const mtt = connect('tk342mtt02'); const medct = connect('tk342med02');
    await waitFor(() => bdi.welcome && hdlow.welcome && mtt.welcome && medct.welcome, 12000);
    hdlow.socket.emit('fly_toggle', {}); hdlow.flying = true;
    await waitFor(() => meOf(mtt) && meOf(bdi), 8000);
    // F1.1 thiền Ma Tâm Trấn (làm sớm, đọc hp qua tick)
    {
      const hpC0 = tickHp(medct), hpT0 = tickHp(mtt);
      note('F1.1 mốc hp đầu: ctrl=' + hpC0 + ' talent=' + hpT0);
      medct.socket.emit('meditate_toggle'); mtt.socket.emit('meditate_toggle');
      await sleep(15000);
      const gC = (tickHp(medct) || 0) - (hpC0 || 0);
      const gT = (tickHp(mtt) || 0) - (hpT0 || 0);
      medct.socket.emit('meditate_toggle'); mtt.socket.emit('meditate_toggle');
      ok('F1.1 GIÁ Ma Tâm Trấn: hồi máu khi thiền = 70% đối chứng (dải 0,60–0,80)', hpC0 != null && hpC0 < 4000 && gC > 20 && gT > 0 && (gT / gC) >= 0.60 && (gT / gC) <= 0.80, `hp0=${hpC0} gainCtrl=${gC} gainTalent=${gT}`);
      mtt.socket.disconnect(); medct.socket.disconnect();
    }
    // F1.2 Bất Diệt (đọc tick)
    {
      const lang = monsOf(bdi).filter((m) => m.kind === 'huyetlang')[0];
      if (lang) { await flyTo(bdi, lang.x, lang.y, 25); await land(bdi); }
      const maxHp = (meOf(bdi) || {}).maxHp || 5100;
      const saved = await waitFor(() => { const hp = tickHp(bdi); return (hp != null && Math.abs(hp - Math.round(maxHp * 0.15)) <= 3 && !bdi.downed) ? hp : null; }, 60000);
      ok('F1.2a Bất Diệt Huyết Mạch: đòn chí tử lần 1 -> sống ở 15% máu (đọc tick)', !!saved, 'hp=' + tickHp(bdi) + ' maxHp=' + maxHp);
      ok('F1.2b Bất Diệt: thông báo kích hoạt', bdi.notices.some((t) => t.includes('Bất Diệt Huyết Mạch')), '');
      const down2 = await waitFor(() => (bdi.downed || tickHp(bdi) === 0) ? true : null, 90000);
      ok('F1.2c Bất Diệt: chí tử lần 2 cùng ngày -> gục thật', !!down2, 'hp=' + tickHp(bdi));
      bdi.socket.disconnect();
    }
    // F1.3 Huyết Dũng cùng lớp Thể tu (hdlow đang treo trên không, đo ngay)
    const thct = connect('tk342thct2'); const hdful = connect('tk342hdf02');
    await waitFor(() => thct.welcome && hdful.welcome, 10000);
    await waitStableMons(thct);
    const dLow = await firstHitDrop(hdlow, 'huyetlang');
    const dTh = await firstHitDrop(thct, 'huyetlang');
    const dFull = await firstHitDrop(hdful, 'huyetlang');
    ok('F1.3a mốc Thể tu (không thiên phú) đo được', dTh > 0, 'dTh=' + dTh);
    ok('F1.3b Huyết Dũng máu đầy: +6% (dải 1,03–1,10)', dFull > dTh && dFull >= Math.floor(dTh * 1.03) && dFull <= Math.ceil(dTh * 1.10), `full=${dFull} th=${dTh}`);
    ok('F1.3c Huyết Dũng máu <30%: +12% (dải 1,08–1,16, cao hơn máu đầy)', dLow > dFull && dLow >= Math.floor(dTh * 1.08) && dLow <= Math.ceil(dTh * 1.16), `low=${dLow} full=${dFull} th=${dTh}`);
    hdlow.socket.disconnect(); thct.socket.disconnect(); hdful.socket.disconnect();
    // F1.4 GIÁ Huyết Tế Tâm qua tick hp
    const hte = connect('tk342hte02');
    await waitFor(() => hte.welcome, 10000);
    {
      const hpB = tickHp(hte); const maxHp = (meOf(hte) || {}).maxHp || 0;
      const r = await castAt(hte, 0, 'huyetlang', 130);
      const hpA = await waitFor(() => { const hp = tickHp(hte); return (hp != null && hpB != null && hp < hpB) ? hp : null; }, 4000);
      ok('F1.4 GIÁ Huyết Tế Tâm: cast tốn đúng 4% máu tối đa (đọc tick)', !!r && hpA != null && maxHp > 0 && Math.abs((hpB - hpA) - Math.round(maxHp * 0.04)) <= 2, `hpB=${hpB} hpA=${hpA} maxHp=${maxHp} expect=${Math.round(maxHp * 0.04)}`);
      hte.socket.disconnect();
    }
    // F1.5 Hư Kiếm Ý — khám phá loài trên map
    const hky = connect('tk342hky02'); const sctrl = connect('tk342sct02');
    await waitFor(() => hky.welcome && sctrl.welcome, 10000);
    await waitStableMons(sctrl);
    const hist = {};
    for (const m of monsOf(sctrl)) hist[m.kind] = (hist[m.kind] || 0) + 1;
    note('F1.5 loài trên map: ' + JSON.stringify(hist));
    const K = Object.keys(hist).filter((k) => k !== 'huyetlang').sort((a, b) => hist[b] - hist[a])[0];
    async function pierceSamples(c, n, kind) {
      const out = []; let guard = 0;
      while (out.length < n && guard++ < n * 4) { const r = await castAt(c, 0, kind, 30); if (r && r.kind === kind && r.res.dmg > 0) out.push(r.res.dmg); await sleep(120); }
      return out;
    }
    const sCtrl = await pierceSamples(sctrl, 16, K);
    const sHky = await pierceSamples(hky, 32, K);
    const v0 = median(sCtrl);
    const ctrlSingle = sCtrl.length >= 12 && sCtrl.every((d) => d === v0);
    const pierced = sHky.filter((d) => d > v0).length;
    ok('F1.5a đối chứng xuyên phòng (loài ' + K + '): 16 cast 1 mức dmg', ctrlSingle, JSON.stringify(sCtrl));
    ok('F1.5b Hư Kiếm Ý: có mức dmg xuyên phòng ~20% (2–13/32)', sHky.length >= 26 && pierced >= 2 && pierced <= 13 && sHky.every((d) => d === v0 || d > v0), `n=${sHky.length} pierced=${pierced} v0=${v0} vals=${JSON.stringify([...new Set(sHky)])}`);
    // F1.6 Dạ Hành ngày: Ảnh tu chuẩn + talent ngày (dùng sctrl làm mốc)
    DS0 = await firstHitDrop(sctrl, 'huyetlang');
    const dah = connect('tk342dah02');
    await waitFor(() => dah.welcome, 10000);
    const dDay = await firstHitDrop(dah, 'huyetlang');
    ok('F1.6 Dạ Hành ban ngày: sát thương bằng mốc Ảnh tu (không cộng)', DS0 > 0 && Math.abs(dDay - DS0) <= Math.max(2, DS0 * 0.03), `day=${dDay} DS0=${DS0}`);
    dah.socket.disconnect(); hky.socket.disconnect();
    // F1.7 chí mạng (ngưỡng mẫu thực tế)
    const hkt = connect('tk342hkt02'); const cctrl = connect('tk342cct02');
    await waitFor(() => hkt.welcome && cctrl.welcome, 10000);
    async function attackDrops(c, n) {
      const drops = []; let targetId = null;
      for (let i = 0; i < n; i++) {
        let t = targetId && monsOf(c).find((m) => m.id === targetId && m.hp > 0);
        if (!t) { const me = meOf(c); const cand = monsOf(c).filter((m) => m.kind === 'huyetlang' && m.hp > 100).sort((a, b) => Math.hypot(a.x - me.x, a.y - me.y) - Math.hypot(b.x - me.x, b.y - me.y))[0]; if (!cand) { await sleep(1500); continue; } targetId = cand.id; await flyTo(c, cand.x, cand.y, 28); await land(c); t = monsOf(c).find((m) => m.id === targetId); if (!t) continue; }
        const before = new Map(monsOf(c).map((m) => [m.id, m.hp]));
        c.socket.emit('player_attack');
        await sleep(820);
        for (const m of monsOf(c)) { const b = before.get(m.id); if (b != null && m.hp < b) { drops.push(b - m.hp); break; } }
      }
      return drops;
    }
    const critDrops = await attackDrops(hkt, 60);
    const critBase = median(critDrops);
    const crits = critDrops.filter((d) => d >= critBase * 1.7).length;
    ok('F1.7a Huyết Kiếm Tâm: chí mạng ~5% (1–12 trong mẫu, nền 0%)', critDrops.length >= 40 && crits >= 1 && crits <= 12, `n=${critDrops.length} crits=${crits} base=${critBase}`);
    const ctrlDrops = await attackDrops(cctrl, 40);
    const ctrlBase = median(ctrlDrops);
    const ctrlCrits = ctrlDrops.filter((d) => d >= ctrlBase * 1.7).length;
    ok('F1.7b đối chứng chí mạng: 0 chí mạng', ctrlDrops.length >= 28 && ctrlCrits === 0, `n=${ctrlDrops.length} crits=${ctrlCrits}`);
    hkt.socket.disconnect(); cctrl.socket.disconnect(); sctrl.socket.disconnect();
    // F1.8 bán NPC (bay tới điểm tiệm đã scale trước)
    const selct = connect('tk342slc02'); const sel = connect('tk342sel02');
    await waitFor(() => selct.welcome && sel.welcome, 10000);
    await waitFor(() => meOf(selct) && meOf(sel), 8000);
    async function sellOne(c) {
      await flyTo(c, 2263, 1210, 15); await land(c);
      c.socket.emit('sect_get'); await sleep(400);
      const s0 = c.sync && c.sync.character ? c.sync.character.stones : null;
      c.socket.emit('shop_sell', { shopId: 'tiem_dan', itemId: 'dan_truc_co' });
      const g = await waitFor(() => { const s = c.sync && c.sync.character ? c.sync.character.stones : null; return (s != null && s0 != null && s !== s0) ? s - s0 : null; }, 4000);
      return { g, s0 };
    }
    const rC = await sellOne(selct);
    const rT = await sellOne(sel);
    ok('F1.8a đối chứng bán NPC: +320', rC.g === 320, JSON.stringify(rC) + ' err=' + selct.errors.join(';'));
    ok('F1.8b GIÁ Tham Tượng: bán NPC +288 (−10%)', rT.g === 288, JSON.stringify(rT) + ' err=' + sel.errors.join(';'));
    selct.socket.disconnect(); sel.socket.disconnect();
    // F1.9 Linh thạch rơi từ quái (ép sync bằng sect_get khi đọc)
    const ttu = connect('tk342ttu02'); const ttuct = connect('tk342ttc02');
    await waitFor(() => ttu.welcome && ttuct.welcome, 10000);
    async function stonesOf(c) { c.socket.emit('sect_get'); await sleep(450); return c.sync && c.sync.character ? (c.sync.character.stones || 0) : 0; }
    async function stoneDeltas(c, n) {
      const out = [];
      for (let k = 0; k < n; k++) {
        const s0 = await stonesOf(c);
        const me = meOf(c); if (!me) break;
        const t0 = monsOf(c).filter((m) => m.kind === 'huyetlang').sort((a, b) => Math.hypot(a.x - me.x, a.y - me.y) - Math.hypot(b.x - me.x, b.y - me.y))[0];
        if (!t0) { await sleep(2000); continue; }
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
        await flyTo(c, deathPos.x, deathPos.y, 6); await land(c);
        for (const [vx, vy] of [[1, 0], [0, 1], [-1, 0], [0, -1]]) { c.socket.emit('client_input', { vx, vy }); await sleep(260); }
        c.socket.emit('client_input', { vx: 0, vy: 0 });
        const got = await waitFor(async () => 0, 10).catch(() => null);
        let delta = null;
        for (let w = 0; w < 8 && delta == null; w++) { const s = await stonesOf(c); if (s > s0) delta = s - s0; else await sleep(400); }
        if (delta != null) out.push(delta);
      }
      return out;
    }
    const stC = await stoneDeltas(ttuct, 6);
    const stT = await stoneDeltas(ttu, 6);
    const meanC = stC.length ? stC.reduce((a, b) => a + b, 0) / stC.length : 0;
    const meanT = stT.length ? stT.reduce((a, b) => a + b, 0) / stT.length : 0;
    ok('F1.9 Tham Tượng: Linh thạch rơi từ quái +25% (tỉ lệ trung bình 1,05–1,50)', stC.length >= 4 && stT.length >= 4 && meanT > meanC && (meanT / meanC) >= 1.05 && (meanT / meanC) <= 1.50, `ctrl=${JSON.stringify(stC)} mean=${meanC.toFixed(1)} | talent=${JSON.stringify(stT)} mean=${meanT.toFixed(1)}`);
    ttuct.socket.disconnect(); ttu.socket.disconnect();
    await stopServer();
    console.log('--- F1 xong: PASS=' + pass + ' FAIL=' + fail);
  }
  // ================= F2 (3629, ĐÊM 20:00): DẠ HÀNH =================
  {
    const chars = {};
    chars['tk342dah02'] = BASE('tk342dah02', 'DahB342', { classId: 'satthu', talent: { id: 'da_hanh', tier: 'den' } });
    chars['tk342sct02'] = BASE('tk342sct02', 'SCtB342', { classId: 'satthu', skills: ['satthu_1'], equipped: ['satthu_1'] });
    fs.writeFileSync(path.join(DIR, 'characters.json'), JSON.stringify(chars, null, 1));
    fs.writeFileSync(path.join(DIR, 'accounts.json'), '{}');
    for (const f of ['world.json', 'sessions.json']) { try { fs.unlinkSync(path.join(DIR, f)); } catch (e) {} }
    await startServer(3629, '342g', 1200);
    const dah = connect('tk342dah02'); const sct = connect('tk342sct02');
    await waitFor(() => dah.welcome && sct.welcome, 10000);
    await waitStableMons(dah);
    const dNC = await firstHitDrop(sct, 'huyetlang');
    const dN1 = await firstHitDrop(dah, 'huyetlang');
    const dN2 = await firstHitDrop(dah, 'huyetlang');
    const dNight = median([dN1, dN2].filter((x) => x > 0));
    ok('F2.1 đối chứng đêm: Ảnh tu thường đánh như ban ngày', DS0 > 0 && Math.abs(dNC - DS0) <= Math.max(2, DS0 * 0.03), `nightCtrl=${dNC} DS0=${DS0}`);
    ok('F2.2 Dạ Hành ban đêm: sát thương +8% (dải 1,04–1,12 × mốc)', dNight >= Math.floor(DS0 * 1.04) && dNight <= Math.ceil(DS0 * 1.12), `night=${dNight} (mẫu ${dN1},${dN2}) DS0=${DS0}`);
    dah.socket.disconnect(); sct.socket.disconnect();
    await stopServer();
  }
  console.log('=== TỔNG GĐ342-B: PASS=' + pass + ' FAIL=' + fail);
  process.exit(fail > 0 ? 1 : 0);
})().catch(async (e) => { console.error('PROBE ERROR', e); try { await stopServer(); } catch (x) {} process.exit(2); });
