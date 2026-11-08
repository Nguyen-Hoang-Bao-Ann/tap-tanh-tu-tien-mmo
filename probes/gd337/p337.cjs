// Probe GĐ337 — THIÊN PHÚ đợt 1 + bốc bù:
// 1) Tạo mới: cổng chưa bốc -> create_error; chọn Vô (the_chat) -> talent ghi đúng + maxHp +30 (kênh Khí huyết +3);
//    Bạch tho_dai -> lifespanLeft >= 60 (roll 50..100 + 10)
// 2) Roll: Lục 3 lượt (giữ/chốt đúng luật, server từ chối quá lượt); Tím 1 lượt chốt ngay
// 3) Lệch lớp: kiemtu+ua_kiem (hợp, dmg cast x1,08) vs phaptu+ua_kiem (lệch, dmg không đổi + payload active=false)
// 4) Đo số: mana tiet_kiem -8% · cd nhanh_nhay x0,95 (payload) · đột phá tam_tinh chance 70 -> 75 (đọc từ breakthrough_fail/notice)
// 5) Thông linh: reroll -> 2 bộ chờ chọn, chọn giữ bộ 2; không Thông linh -> 1 bộ như cũ
// 6) Bốc bù (phiên riêng 3601): không field talent -> mời bốc; Để sau -> login lại vẫn mời; bốc xong -> hết mời; bền qua restart + autosave offline
// 7) Hồi quy: payload.stats GIỮ NGUYÊN chỉ số gốc (talent không lọt vào stats), maxHp vẫn cộng qua trần
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const net = require('net');
const ROOT = path.join(__dirname, '..', '..');
const DIR = __dirname;
const { io } = require(path.join(ROOT, 'client/node_modules/socket.io-client'));
const { createMerger } = require(path.join(ROOT, 'client/worldmerge.cjs'));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function waitFor(fn, ms) { const t0 = Date.now(); while (Date.now() - t0 < ms) { const v = fn(); if (v) return v; await sleep(150); } return null; }
function portFree(port) { return new Promise((res) => { const s = net.createServer(); s.once('error', () => res(false)); s.listen(port, () => s.close(() => res(true))); }); }
let serverProc = null, killTimer = null, CUR_PORT = 3600;
async function startServer(port, tag) {
  CUR_PORT = port;
  if (!(await portFree(port))) throw new Error('port ban ' + port);
  serverProc = spawn('node', ['server/index.js'], { cwd: ROOT, env: { ...process.env, PORT: String(port), TTT_STORAGE: 'file', TTT_CHAR_FILE: path.join(DIR, 'characters.json'), TTT_ACC_FILE: path.join(DIR, 'accounts.json'), TTT_WORLD_FILE: path.join(DIR, 'world.json'), TTT_SESS_FILE: path.join(DIR, 'sessions.json'), TTT_DAY_REAL_MS: '600000', TTT_TUVI_NEED: '5' }, stdio: ['ignore', 'pipe', 'pipe'] });
  serverProc.stderr.on('data', (d) => { try { fs.appendFileSync(path.join(DIR, 'srv_' + tag + '.log'), d); } catch (e) {} });
  serverProc.stdout.on('data', (d) => { try { fs.appendFileSync(path.join(DIR, 'srv_' + tag + '.log'), d); } catch (e) {} });
  killTimer = setTimeout(() => { try { serverProc.kill('SIGKILL'); } catch (e) {} }, 90000);
  const t0 = Date.now();
  while (Date.now() - t0 < 45000) { try { const r = await fetch(`http://127.0.0.1:${port}/api/status`); if (r.ok) { clearTimeout(killTimer); return; } } catch (e) {} await sleep(500); }
  throw new Error('server khong len');
}
async function stopServer() { if (!serverProc) return; const p = serverProc; serverProc = null; await new Promise((res) => { const t = setTimeout(() => { try { p.kill('SIGKILL'); } catch (e) {} res(); }, 4000); p.once('exit', () => { clearTimeout(t); res(); }); try { p.kill('SIGTERM'); } catch (e) { clearTimeout(t); res(); } }); const t0 = Date.now(); while (Date.now() - t0 < 10000 && !(await portFree(CUR_PORT))) await sleep(300); }
const STATS = { khiHuyet: 500, vatCong: 100, vatPhong: 100, phapCong: 100, phapPhong: 100, tocDo: 60, minhMan: 100 };
const LC1 = { elements: ['kim'], main: 'kim', count: 1, mutations: [] };
function BASE(token, name, extra) {
  return Object.assign({ token, name, classId: 'kiemtu', gender: 'nam', race: null, geo175: 1, realm: 'kd', tier: 1, x: 4248, y: 2950, mapId: 'huyet_sac_rung', hp: 99999, lifespan: 500, birthDay: -5660, ageStart: 16, stats: { ...STATS }, statPoints: 0, freePoints: 0, tuVi: 0, stones: 0, stonesTrung: 0, stonesThuong: 0, stonesCuc: 0, inventory: {}, gearBag: {}, equipped: [], skills: [], job: null, job2: null, job3: null, linhCan: { ...LC1 }, affinity: {}, affV2: 1, bonds: {}, quests: {}, questsDone: {}, flags: {}, counters: {}, disciples: [], foundInvites: [], reformIn: [], sectTech: [], sectArts: [], sectArtsActive: [], mails: [], classRes: {} }, extra || {});
}
let pass = 0, fail = 0;
let LIFE_AFTER_MAKEUP = -1;
function ok(name, cond, extra) { if (cond) { pass++; console.log('PASS | ' + name); } else { fail++; console.log('FAIL | ' + name + (extra ? ' | ' + extra : '')); } }
function connect(token) {
  const socket = io(`http://127.0.0.1:${CUR_PORT}`, { transports: ['websocket'] });
  const ctx = { socket, merger: createMerger(), state: null, welcome: null, sync: null, syncLog: [], errors: [], casts: [], notices: [], tstate: [], catalog: null, needChar: false, createErr: null, reroll: [], brkFail: null, brkOk: false };
  socket.on('connect', () => socket.emit('hello', { token }));
  socket.on('welcome', (w) => { ctx.welcome = w; ctx.myName = (w.character || {}).name; });
  socket.on('need_character', () => { ctx.needChar = true; });
  socket.on('create_error', (e) => { ctx.createErr = e.message; });
  socket.on('server_tick', (t) => { const st = ctx.merger(t); if (st) ctx.state = st; });
  socket.on('char_sync', (sy) => { ctx.sync = sy; ctx.syncLog.push({ at: Date.now(), mp: sy.mp }); if (ctx.syncLog.length > 200) ctx.syncLog.shift(); });
  socket.on('interact_error', (e) => ctx.errors.push(e.message || ''));
  socket.on('cast_result', (r) => ctx.casts.push(r));
  socket.on('notice', (n) => ctx.notices.push(n.text || ''));
  socket.on('talent_catalog', (c) => { ctx.catalog = c; });
  socket.on('talent_state', (s) => ctx.tstate.push(s));
  socket.on('gear_reroll_result', (r) => ctx.reroll.push(r));
  socket.on('breakthrough_fail', (r) => { ctx.brkFail = r; });
  socket.on('breakthrough_ok', () => { ctx.brkOk = true; });
  return ctx;
}
const meOf = (c) => (c.state?.players || []).find((p) => p.name === c.myName);
const monsOf = (c) => c.state?.monsters || [];
async function flyTo(c, x, y, tol) {
  c.socket.emit('fly_toggle', {}); await sleep(350);
  const t0 = Date.now();
  while (Date.now() - t0 < 25000) { const me = meOf(c); if (!me) { await sleep(120); continue; } const dx = x - me.x, dy = y - me.y; const d = Math.hypot(dx, dy); if (d <= (tol || 45)) break; c.socket.emit('client_input', { vx: dx / d, vy: dy / d }); await sleep(110); }
  c.socket.emit('client_input', { vx: 0, vy: 0 });
  c.socket.emit('fly_toggle', {}); await sleep(450);
}
async function castAtMonster(c, skillId) {
  // chờ quái ổn định, bay tới con gần nhất, cast, đo hp rơi của đúng con đó + cast_result
  await waitFor(() => monsOf(c).length > 0, 15000);
  const me = meOf(c);
  const ms = monsOf(c).slice().sort((a, b) => Math.hypot(a.x - me.x, a.y - me.y) - Math.hypot(b.x - me.x, b.y - me.y));
  const tgt = ms[0];
  await flyTo(c, tgt.x, tgt.y, 40);
  await sleep(300);
  const cur = monsOf(c).find((m) => m.id === tgt.id) || tgt;
  const hp0 = cur.hp;
  const slot = (c.welcome.character.skills || []).findIndex((s) => s.id === skillId);
  if (slot < 0) return { ok: false, why: 'no slot ' + skillId };
  const castAt = c.casts.length;
  c.socket.emit('cast_skill', { slot });
  const res = await waitFor(() => c.casts.length > castAt && c.casts[c.casts.length - 1], 5000);
  await sleep(250);
  const after = monsOf(c).find((m) => m.id === tgt.id);
  const drop = after ? hp0 - after.hp : hp0;
  return { ok: !!(res && res.ok), res, drop, kind: tgt.kind };
}
function waitTalent(c, pred, ms) { return waitFor(() => { for (let i = c.tstate.length - 1; i >= 0; i--) { if (pred(c.tstate[i])) return c.tstate[i]; } return null; }, ms || 6000); }
async function castDmgMedian(c, skillId, n) {
  const dmgs = [];
  for (let i = 0; i < (n || 5); i++) {
    const r = await castAtMonster(c, skillId);
    if (r.ok && r.res && typeof r.res.dmg === 'number') dmgs.push(r.res.dmg);
    await sleep(1300); // chờ hồi chiêu
  }
  const use = dmgs.slice(1); // bỏ đòn đầu (đòn đầu lên quái mới đọc cao — bài học probe cũ)
  const arr = (use.length ? use : dmgs).slice().sort((a, b) => a - b);
  return arr.length ? arr[Math.floor(arr.length / 2)] : 0;
}
function writeChars(chars, acc) {
  fs.writeFileSync(path.join(DIR, 'characters.json'), JSON.stringify(chars, null, 1));
  fs.writeFileSync(path.join(DIR, 'accounts.json'), JSON.stringify(acc || {}, null, 1));
  for (const f of ['world.json', 'sessions.json']) { try { fs.unlinkSync(path.join(DIR, f)); } catch (e) {} }
}
const GEAR_ITEM = { uid: 'g337', path: 'KIEM_TU', element: 'kim', rarity: 'TIM', slot: 'WEAPON', weapon: null, name: 'Kiếm Tím Test', prefix: 'Tím', tokenRank: null, tokenRankName: null, baseStats: {}, talents: [{ name: 'Sắc Bén', stat: 'vatCong', bonusPct: 0.05, kind: 'thuong' }] };

(async () => {
  // ================= PHIÊN 1 (3600): fixture + tạo mới =================
  const chars = {};
  chars['tk337f01'] = BASE('tk337f01', 'K337H', { talent: { id: 'ua_kiem', tier: 'luc' }, skills: ['kiemtu_1'] });
  chars['tk337f02'] = BASE('tk337f02', 'K337C', { skills: ['kiemtu_1'] });
  chars['tk337f03'] = BASE('tk337f03', 'P337H', { classId: 'phaptu', talent: { id: 'ua_kiem', tier: 'luc' }, skills: ['phaptu_1'], linhCan: { elements: ['hoa'], main: 'hoa', count: 1, mutations: [] } });
  chars['tk337f04'] = BASE('tk337f04', 'P337C', { classId: 'phaptu', skills: ['phaptu_1'], linhCan: { elements: ['hoa'], main: 'hoa', count: 1, mutations: [] } });
  chars['tk337f05'] = BASE('tk337f05', 'M337T', { talent: { id: 'tiet_kiem', tier: 'luc' }, skills: ['kiemtu_3'] });
  chars['tk337f06'] = BASE('tk337f06', 'M337C', { skills: ['kiemtu_3'] });
  chars['tk337f07'] = BASE('tk337f07', 'N337N', { talent: { id: 'nhanh_nhay', tier: 'tim' }, skills: ['kiemtu_1'] });
  chars['tk337f08'] = BASE('tk337f08', 'N337C', { skills: ['kiemtu_1'] });
  const brk = { realm: 'lk', tier: 9, tuVi: 99999, mapId: 'lang_tan_thu', x: 1565, y: 1252, inventory: { dan_truc_co: 3 }, trialReady: 'dai', stats: { khiHuyet: 100, vatCong: 100, vatPhong: 100, phapCong: 100, phapPhong: 100, tocDo: 60, minhMan: 100 } };
  chars['tk337f09'] = BASE('tk337f09', 'B337T', { ...brk, talent: { id: 'tam_tinh', tier: 'lam' } });
  chars['tk337f10'] = BASE('tk337f10', 'B337C', { ...brk });
  const forge = { classId: 'thetu', mapId: 'lang_tan_thu', x: 1386, y: 1252, stones: 5000, gearBag: { g337: JSON.parse(JSON.stringify(GEAR_ITEM)) } };
  chars['tk337f11'] = BASE('tk337f11', 'G337T', { ...forge, talent: { id: 'thong_linh', tier: 'cam' } });
  chars['tk337f12'] = BASE('tk337f12', 'G337C', { ...forge });
  chars['tk337f15'] = BASE('tk337f15', 'R337R', { talent: { id: 'the_chat', tier: 'vo' }, stats: { khiHuyet: 50, vatCong: 10, vatPhong: 10, phapCong: 10, phapPhong: 10, tocDo: 10, minhMan: 10 } });
  writeChars(chars);
  await startServer(3600, '337a');

  // ---- Chân 1+2: tạo mới qua socket ----
  {
    const g = connect('tk337n01');
    await waitFor(() => g.needChar, 20000);
    ok('1.0 khách mới -> need_character', g.needChar);
    g.socket.emit('create_character', { name: 'ChuaBoc337', classId: 'kiemtu' });
    await waitFor(() => g.createErr, 5000);
    ok('1.1 chưa bốc thiên phú -> create_error', !!g.createErr && /thiên phú/i.test(g.createErr), g.createErr || '');
    g.socket.emit('talent_catalog_get');
    await waitFor(() => g.catalog, 5000);
    ok('1.2 catalog 6 bậc / 33 thiên phú', !!g.catalog && g.catalog.tiers.length === 6 && g.catalog.list.length === 33, g.catalog ? `tiers=${g.catalog.tiers.length} list=${g.catalog.list.length}` : 'no catalog');
    g.socket.emit('talent_pick', { tier: 'vo', id: 'the_chat' });
    const st = await waitTalent(g, (s) => s.pending && s.pending.result === 'the_chat');
    ok('1.3 chọn thẳng Vô -> chốt the_chat', !!st && st.pending.locked === true, JSON.stringify(st && st.pending));
    g.socket.emit('create_character', { name: 'TaoMoi337', classId: 'kiemtu' });
    await waitFor(() => g.welcome, 20000);
    const wc = g.welcome.character;
    ok('1.4 tạo xong: talent = the_chat (Vô sắc)', !!wc.talent && wc.talent.id === 'the_chat' && wc.talent.active === true, JSON.stringify(wc.talent));
    ok('1.5 kênh chỉ số: maxHp = 100 + khiHuyet*10 + 30 (Thể chất +3)', wc.maxHp === 100 + wc.stats.khiHuyet * 10 + 30, `maxHp=${wc.maxHp} khiHuyet=${wc.stats.khiHuyet}`);
    g.socket.disconnect();
  }
  {
    // 12 nhân vật tho_dai: lifespan lưu file phải >= 60 hết (roll gốc 50-100 + 10) — kiểm thống kê ở chân 1.6b sau khi tắt server
    for (let i = 0; i < 12; i++) {
      const g = connect('tk337n1' + i);
      await waitFor(() => g.needChar, 20000);
      g.socket.emit('talent_catalog_get'); await waitFor(() => g.catalog, 5000);
      g.socket.emit('talent_pick', { tier: 'bach', id: 'tho_dai' });
      await waitTalent(g, (s) => s.pending && s.pending.result === 'tho_dai', 5000);
      g.socket.emit('create_character', { name: 'ThoDai' + i, classId: 'thetu' });
      await waitFor(() => g.welcome, 20000);
      g.socket.disconnect();
    }
    ok('1.6a tạo 12 nhân vật Bạch tho_dai xong', true);
  }
  {
    const g = connect('tk337n03');
    await waitFor(() => g.needChar, 20000);
    g.socket.emit('talent_catalog_get'); await waitFor(() => g.catalog, 5000);
    g.socket.emit('talent_roll', { tier: 'luc' });
    let st = await waitTalent(g, (s) => s.pending && s.pending.tier === 'luc' && s.pending.rollsLeft === 2);
    ok('2.1 Lục lượt 1: rollsLeft=2, chưa chốt', !!st && st.pending.locked === false && !!st.pending.result, JSON.stringify(st && st.pending));
    g.socket.emit('talent_roll', { tier: 'luc' });
    st = await waitTalent(g, (s) => s.pending && s.pending.tier === 'luc' && s.pending.rollsLeft === 1);
    ok('2.2 Lục lượt 2: rollsLeft=1', !!st, '');
    g.socket.emit('talent_roll', { tier: 'luc' });
    st = await waitTalent(g, (s) => s.pending && s.pending.tier === 'luc' && s.pending.rollsLeft === 0 && s.pending.locked === true);
    const lastResult = st && st.pending && st.pending.result;
    ok('2.3 Lục lượt 3: rollsLeft=0 + tự chốt', !!lastResult, JSON.stringify(st && st.pending));
    g.socket.emit('talent_roll', { tier: 'luc' });
    await sleep(900);
    const stAfter = g.tstate[g.tstate.length - 1];
    ok('2.4 quá lượt: server từ chối (rollsLeft vẫn 0, kết quả giữ nguyên)', stAfter.pending && stAfter.pending.rollsLeft === 0 && stAfter.pending.result === lastResult, JSON.stringify(stAfter.pending));
    g.socket.emit('create_character', { name: 'Luc337', classId: 'phaptu' });
    await waitFor(() => g.welcome, 20000);
    ok('2.5 nhân vật mang đúng thiên phú Lục đã chốt', g.welcome.character.talent && g.welcome.character.talent.id === lastResult && g.welcome.character.talent.tier === 'luc', JSON.stringify(g.welcome.character.talent));
    g.socket.disconnect();
  }
  {
    const g = connect('tk337n04');
    await waitFor(() => g.needChar, 20000);
    g.socket.emit('talent_catalog_get'); await waitFor(() => g.catalog, 5000);
    g.socket.emit('talent_roll', { tier: 'tim' });
    const st = await waitTalent(g, (s) => s.pending && s.pending.tier === 'tim');
    ok('2.6 Tím: đúng 1 lượt, bốc xong chốt ngay', !!st && st.pending.rollsLeft === 0 && st.pending.locked === true && !!st.pending.result, JSON.stringify(st && st.pending));
    g.socket.disconnect();
  }

  // ---- Chân 3+4: fixture đo số ----
  const F = {};
  for (const tk of ['tk337f01', 'tk337f02', 'tk337f03', 'tk337f04', 'tk337f05', 'tk337f06', 'tk337f07', 'tk337f08', 'tk337f11', 'tk337f12', 'tk337f15']) {
    const c = connect(tk);
    await waitFor(() => c.welcome, 20000);
    F[tk] = c;
  }
  // Hồi quy (chân 7): stats gốc nguyên vẹn + maxHp qua trần
  {
    const wc = F['tk337f15'].welcome.character;
    ok('7.1 payload.stats.khiHuyet = 50 (GỐC, thiên phú không lọt vào)', wc.stats.khiHuyet === 50, `stats=${JSON.stringify(wc.stats)}`);
    ok('7.2 maxHp = 630 (100 + 50*10 + 30 thiên phú qua trần)', wc.maxHp === 630, `maxHp=${wc.maxHp}`);
  }
  // Nhanh nhạy qua payload cdMs
  {
    const cdT = (F['tk337f07'].welcome.character.skills || [])[0];
    const cdC = (F['tk337f08'].welcome.character.skills || [])[0];
    const ratio = cdT && cdC ? cdT.cdMs / cdC.cdMs : 0;
    ok('4.1 Nhanh nhạy: cdMs payload x0,95', cdT && cdC && ratio > 0.93 && ratio < 0.97, `cdT=${cdT && cdT.cdMs} cdC=${cdC && cdC.cdMs} ratio=${ratio.toFixed(3)}`);
  }
  // Lệch lớp: payload active + dmg
  {
    ok('3.1 payload: kiemtu+ua_kiem active=true', F['tk337f01'].welcome.character.talent.active === true);
    ok('3.2 payload: phaptu+ua_kiem active=false (lệch lớp)', F['tk337f03'].welcome.character.talent.active === false);
    const kH = await castDmgMedian(F['tk337f01'], 'kiemtu_1', 6);
    const kC = await castDmgMedian(F['tk337f02'], 'kiemtu_1', 6);
    const pH = await castDmgMedian(F['tk337f03'], 'phaptu_1', 6);
    const pC = await castDmgMedian(F['tk337f04'], 'phaptu_1', 6);
    const rK = kH && kC ? kH / kC : 0;
    const rP = pH && pC ? pH / pC : 0;
    ok('3.3 hợp lớp: dmg cast kiemtu x~1,08 (median cast_result.dmg)', rK > 1.04 && rK < 1.12, `dmgH=${kH} dmgC=${kC} ratio=${rK.toFixed(3)}`);
    ok('3.4 lệch lớp: dmg cast phaptu KHÔNG đổi (x~1,00)', rP > 0.96 && rP < 1.04, `dmgH=${pH} dmgC=${pC} ratio=${rP.toFixed(3)}`);
  }
  // Mana tiet_kiem: mp đọc từ welcome (chính xác tuyệt đối — ngoài thiền mp không tự hồi, GĐ76).
  // Cast xong ngắt kết nối ngay (persist ghi mp), nối lại đọc welcome.mp.
  {
    for (const tk of ['tk337f05', 'tk337f06']) { try { F[tk].socket.disconnect(); } catch (e) {} }
    await sleep(800);
    const castAndRead = async (tk) => {
      let c = connect(tk);
      await waitFor(() => c.welcome, 20000);
      const mpFull = c.welcome.character.mp;
      await waitFor(() => monsOf(c).length > 0, 15000);
      const t0 = Date.now();
      while (Date.now() - t0 < 25000) {
        const me = meOf(c); const ms = monsOf(c);
        if (!me || !ms.length) { await sleep(150); continue; }
        const tgt = ms.slice().sort((a2, b2) => Math.hypot(a2.x - me.x, a2.y - me.y) - Math.hypot(b2.x - me.x, b2.y - me.y))[0];
        const d = Math.hypot(tgt.x - me.x, tgt.y - me.y);
        if (d <= 140) break;
        c.socket.emit('client_input', { vx: (tgt.x - me.x) / d, vy: (tgt.y - me.y) / d });
        await sleep(110);
      }
      c.socket.emit('client_input', { vx: 0, vy: 0 });
      await sleep(250);
      const slot = (c.welcome.character.skills || []).findIndex((s) => s.id === 'kiemtu_3');
      const castAt = c.casts.length;
      c.socket.emit('cast_skill', { slot });
      const res = await waitFor(() => c.casts.length > castAt && c.casts[c.casts.length - 1], 5000);
      c.socket.disconnect();
      await sleep(900);
      c = connect(tk);
      await waitFor(() => c.welcome, 20000);
      const mpAfter = c.welcome.character.mp;
      c.socket.disconnect();
      return { ok: !!(res && res.ok), drop: mpFull - mpAfter };
    };
    const a = await castAndRead('tk337f05');
    const b = await castAndRead('tk337f06');
    // cost THẬT của kiemtu_3 cho Kiếm tu = 30 x CLASS_MANA_FACTOR 0,8 = 24; Tiết kiệm -8% -> round(24x0,92) = 22
    ok('4.2 Tiết kiệm chân nguyên: mana tốn 22 thay vì 24 (-8%)', a.ok && b.ok && b.drop === 24 && a.drop === 22, `dropT=${a.drop} dropC=${b.drop}`);
  }
  // Thông linh
  {
    const t = F['tk337f11'];
    await flyTo(t, 1386, 1252, 30);
    t.socket.emit('gear_reroll', { uid: 'g337' });
    const rr = await waitFor(() => t.reroll.length && t.reroll[t.reroll.length - 1], 6000);
    ok('5.1 Thông linh: reroll trả choices = 2 bộ', !!rr && Array.isArray(rr.choices) && rr.choices.length === 2, rr ? `choices=${rr.choices && rr.choices.length}` : 'no result; errors=' + t.errors.join(' | '));
    if (rr && rr.choices) {
      const syncItem = (t.sync && t.sync.gearBag && t.sync.gearBag.g337) || null;
      ok('5.2 chưa chọn: talents trong túi vẫn là bộ CŨ', !!syncItem && JSON.stringify(syncItem.talents) === JSON.stringify(GEAR_ITEM.talents), syncItem ? JSON.stringify(syncItem.talents) : 'no sync item');
      const want = JSON.stringify(rr.choices[1].talents);
      t.socket.emit('gear_reroll_pick', { idx: 1 });
      const rr2 = await waitFor(() => t.reroll.length >= 2 && t.reroll[t.reroll.length - 1], 6000);
      await sleep(400);
      const syncItem2 = (t.sync && t.sync.gearBag && t.sync.gearBag.g337) || null;
      ok('5.3 chọn bộ 2: item áp đúng bộ 2, bộ 1 mất', !!rr2 && JSON.stringify(rr2.item.talents) === want && !!syncItem2 && JSON.stringify(syncItem2.talents) === want, `pick=${rr2 && JSON.stringify(rr2.item.talents)} want=${want}`);
    }
    const cc = F['tk337f12'];
    await flyTo(cc, 1386, 1252, 30);
    cc.socket.emit('gear_reroll', { uid: 'g337' });
    const rc = await waitFor(() => cc.reroll.length && cc.reroll[cc.reroll.length - 1], 6000);
    ok('5.4 không Thông linh: reroll 1 bộ như cũ (không choices)', !!rc && !rc.choices && Array.isArray(rc.item.talents), rc ? `choices=${rc.choices}` : 'no result; errors=' + cc.errors.join(' | '));
  }
  // Đột phá tam_tinh: chance đọc từ fail event / notice thành công
  for (const tk of ['tk337f09', 'tk337f10']) { const c = connect(tk); await waitFor(() => c.welcome, 20000); F[tk] = c; }
  {
    const attempt = async (c) => {
      c.socket.emit('breakthrough', {});
      const r = await waitFor(() => c.brkFail || c.brkOk, 8000);
      if (c.brkFail) return c.brkFail.chance;
      const n = c.notices.find((x) => /tỉ lệ (\d+)%/.test(x));
      const m = n && n.match(/tỉ lệ (\d+)%/);
      return m ? Number(m[1]) : null;
    };
    const chT = await attempt(F['tk337f09']);
    const chC = await attempt(F['tk337f10']);
    ok('4.3 Tâm tĩnh như nước: tỉ lệ đột phá Đại 75% vs 70% (+5đ)', chT === 75 && chC === 70, `chanceT=${chT} chanceC=${chC}`);
  }
  for (const k of Object.keys(F)) { try { F[k].socket.disconnect(); } catch (e) {} }
  await stopServer();
  {
    const fc = JSON.parse(fs.readFileSync(path.join(DIR, 'characters.json'), 'utf8'));
    const lifes = [];
    for (let i = 0; i < 12; i++) { const ch = fc['tk337n1' + i]; if (ch && typeof ch.lifespan === 'number') lifes.push(ch.lifespan); }
    const min = Math.min(...lifes); const mean = lifes.reduce((a, b) => a + b, 0) / Math.max(1, lifes.length);
    ok('1.6b Bạch Thọ nguyên dài (file, 12 mẫu): mọi lifespan >= 60 và trung bình >= 82 (roll 50-100 + 10)', lifes.length === 12 && min >= 60 && mean >= 82, `n=${lifes.length} min=${min} mean=${mean.toFixed(1)}`);
  }

  // ================= PHIÊN 2 (3601): bốc bù =================
  const mk1 = BASE('tk337m01', 'MK337A', { realm: 'lk', tier: 1, mapId: 'lang_tan_thu', x: 1565, y: 1252, lifespan: 90, birthDay: 0 });
  delete mk1.talent;
  const mk2 = BASE('tk337m02', 'MK337B', { realm: 'lk', tier: 1, mapId: 'lang_tan_thu', x: 1565, y: 1252, lifespan: 90, birthDay: 0 });
  delete mk2.talent;
  const chars2 = { tk337m01: mk1, tk337m02: mk2 };
  writeChars(chars2);
  await startServer(3601, '337b');
  {
    let c = connect('tk337m01');
    await waitFor(() => c.welcome, 20000);
    ok('6.1 nhân vật cũ không field talent: payload talent = null', c.welcome.character.talent === null, JSON.stringify(c.welcome.character.talent));
    ok('6.2 đăng nhập được mời bốc bù (notice)', c.notices.some((x) => /chưa có thiên phú/i.test(x)), c.notices.join(' | ').slice(0, 120));
    c.socket.disconnect(); // "Để sau": thoát mà không bốc
    await sleep(600);
    c = connect('tk337m01');
    await waitFor(() => c.welcome, 20000);
    ok('6.3 Để sau -> đăng nhập lại VẪN mời + talent vẫn null', c.welcome.character.talent === null && c.notices.some((x) => /chưa có thiên phú/i.test(x)));
    const life0 = c.welcome.character.lifespanLeft;
    c.socket.emit('talent_catalog_get'); await waitFor(() => c.catalog, 5000);
    c.socket.emit('talent_pick', { tier: 'bach', id: 'tho_dai' });
    const done = await waitTalent(c, (s) => !!s.done);
    ok('6.4 bốc bù chọn Bạch tho_dai -> done', !!done && done.done && done.done.id === 'tho_dai', JSON.stringify(done && done.done) + ' states=' + c.tstate.length);
    await sleep(500);
    const wc = (c.sync || c.welcome.character);
    LIFE_AFTER_MAKEUP = wc.lifespanLeft;
    ok('6.5 thọ cộng vào lifespan HIỆN TẠI: +10 năm', wc.lifespanLeft === life0 + 10, `before=${life0} after=${wc.lifespanLeft}`);
    c.socket.disconnect();
    await sleep(600);
    c = connect('tk337m01');
    await waitFor(() => c.welcome, 20000);
    ok('6.6 bốc xong -> đăng nhập lại KHÔNG mời nữa + talent còn', !!c.welcome.character.talent && c.welcome.character.talent.id === 'tho_dai' && !c.notices.some((x) => /chưa có thiên phú/i.test(x)));
    c.socket.disconnect();
  }
  {
    const c = connect('tk337m02');
    await waitFor(() => c.welcome, 20000);
    c.socket.emit('talent_catalog_get'); await waitFor(() => c.catalog, 5000);
    c.socket.emit('talent_roll', { tier: 'luc' });
    await waitTalent(c, (s) => s.pending && s.pending.tier === 'luc' && !!s.pending.result, 5000);
    c.socket.emit('talent_keep', {});
    const done = await waitTalent(c, (s) => !!s.done);
    ok('6.7 bốc bù roll Lục + GIỮ -> chốt thiên phú Lục', !!done && done.done && done.done.tierName === 'Lục sắc', JSON.stringify(done && done.done));
    c.socket.disconnect();
  }
  await stopServer();
  // Restart: bền qua autosave của diễn viên offline (chờ >15s rồi đọc file)
  await startServer(3601, '337c');
  await sleep(17000);
  {
    const fileChars = JSON.parse(fs.readFileSync(path.join(DIR, 'characters.json'), 'utf8'));
    ok('6.8 bền qua restart + autosave offline: file vẫn còn talent tho_dai', !!fileChars.tk337m01 && !!fileChars.tk337m01.talent && fileChars.tk337m01.talent.id === 'tho_dai', JSON.stringify(fileChars.tk337m01 && fileChars.tk337m01.talent));
    const c = connect('tk337m01');
    await waitFor(() => c.welcome, 20000);
    ok('6.9 sau restart: payload talent tho_dai, lifespanLeft khớp mốc sau bốc bù', !!c.welcome.character.talent && c.welcome.character.talent.id === 'tho_dai' && c.welcome.character.lifespanLeft === LIFE_AFTER_MAKEUP, `talent=${JSON.stringify(c.welcome.character.talent)} life=${c.welcome.character.lifespanLeft} expect=${LIFE_AFTER_MAKEUP}`);
    c.socket.disconnect();
  }
  await stopServer();
  console.log(`\n=== GĐ337 PROBE: PASS ${pass} / FAIL ${fail} ===`);
  process.exit(fail ? 1 : 0);
})().catch(async (e) => { console.error('PROBE ERROR', e); try { await stopServer(); } catch (x) {} process.exit(2); });
