// Probe GĐ389 — B6 đợt 1: CỐT CUNG + CỐT NHẬN (2 đường vũ khí Cốt Tu mới).
// Chân: 0 boot 4579 · 1 tạo nhân vật chọn đường mới (+chặn chọn _vm lúc tạo)
// · 2 Cốt Cung: sổ 26 chiêu + thần thông tự lĩnh ngộ · 3 tầm xa 150px trúng /
// quá tầm hụt · 4 sát thương đòn thường ngang đường mẫu colenh · 5 cast
// lu1/kd1 tỉ lệ hệ số · 6 Cốt Nhận: sổ 26 · 7 nhịp đòn 0,5s + cận chiến 65px
// · 8 sát thương ngang songdao · 9 rèn COT_CUNG/COT_NHAN · 10 rương khoá
// đường GĐ165 · 11 Viên Mãn: tiến hoá vũ khí + sổ 16 chiêu VM cả 2 đường.
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const net = require('net');
const ROOT = path.join(__dirname, '..', '..');
const DIR = __dirname;
const { io } = require(path.join(ROOT, 'client/node_modules/socket.io-client'));
const { createMerger } = require(path.join(ROOT, 'client/worldmerge.cjs'));
const CAT = JSON.parse(fs.readFileSync(path.join(ROOT, 'server/data/skills_catalog.json'), 'utf8'));
const IDS = (w) => (CAT.cottu[w] || []).map((s) => s.id);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function waitFor(fn, ms) { const t0 = Date.now(); while (Date.now() - t0 < ms) { const v = fn(); if (v) return v; await sleep(100); } return null; }
function portFree(port) { return new Promise((res) => { const s = net.createServer(); s.once('error', () => res(false)); s.listen(port, () => s.close(() => res(true))); }); }
let serverProc = null, killTimer = null, CUR_PORT = 0;
async function startServer(port, tag) {
  CUR_PORT = port;
  if (!(await portFree(port))) throw new Error('port ban ' + port);
  serverProc = spawn('node', ['server/index.js'], { cwd: ROOT, env: { ...process.env, PORT: String(port), TTT_STORAGE: 'file', TTT_CHAR_FILE: path.join(DIR, 'characters.json'), TTT_ACC_FILE: path.join(DIR, 'accounts.json'), TTT_WORLD_FILE: path.join(DIR, 'world.json'), TTT_SESS_FILE: path.join(DIR, 'sessions.json'), TTT_DAY_REAL_MS: '600000', TTT_TUVI_NEED: '5' }, stdio: ['ignore', 'pipe', 'pipe'] });
  serverProc.stderr.on('data', (d) => { try { fs.appendFileSync(path.join(DIR, 'srv_' + tag + '.log'), d); } catch (e) {} });
  serverProc.stdout.on('data', (d) => { try { fs.appendFileSync(path.join(DIR, 'srv_' + tag + '.log'), d); } catch (e) {} });
  killTimer = setTimeout(() => { try { serverProc.kill('SIGKILL'); } catch (e) {} }, 1500000);
  const t0 = Date.now();
  while (Date.now() - t0 < 90000) { try { const r = await fetch(`http://127.0.0.1:${port}/api/status`); if (r.ok) { clearTimeout(killTimer); killTimer = null; return; } } catch (e) {} await sleep(400); }
  throw new Error('server khong len');
}
async function stopServer() { if (!serverProc) return; const p = serverProc; serverProc = null; if (killTimer) { clearTimeout(killTimer); killTimer = null; } await new Promise((res) => { const t = setTimeout(() => { try { p.kill('SIGKILL'); } catch (e) {} res(); }, 4000); p.once('exit', () => { clearTimeout(t); res(); }); try { p.kill('SIGTERM'); } catch (e) { clearTimeout(t); res(); } }); const t0 = Date.now(); while (Date.now() - t0 < 10000 && !(await portFree(CUR_PORT))) await sleep(300); }
const LC1 = { elements: ['kim'], main: 'kim', count: 1, mutations: [] };
function BASE(token, name, extra) {
  return Object.assign({ token, name, classId: 'cottu', gender: 'nam', race: null, geo175: 1, realm: 'kd', tier: 1, x: 2415, y: 1400, mapId: 'lang_tan_thu', hp: 999999, mp: 9999, lifespan: 500, birthDay: -5660, ageStart: 16, stats: { khiHuyet: 500, vatCong: 300, vatPhong: 200, phapCong: 300, phapPhong: 200, tocDo: 60, minhMan: 100 }, statPoints: 0, freePoints: 0, tuVi: 99999, stones: 100000, stonesTrung: 0, stonesThuong: 0, stonesCuc: 0, inventory: {}, gearBag: {}, equipped: [], skills: [], job: null, job2: null, job3: null, linhCan: { ...LC1 }, affinity: {}, affV2: 1, bonds: {}, quests: {}, questsDone: {}, flags: {}, counters: {}, disciples: [], foundInvites: [], reformIn: [], sectTech: [], sectArts: [], sectArtsActive: [], mails: [], classRes: {}, food: 100, water: 100 }, extra || {});
}
const LK_JOB = { jobId: 'luyenkhi', crafts: 5000 };
let pass = 0, fail = 0;
function ok(name, cond, extra) { if (cond) { pass++; console.log('PASS | ' + name); } else { fail++; console.log('FAIL | ' + name + (extra ? ' | ' + extra : '')); } }
function info(name, val) { console.log('INFO | ' + name + ' | ' + val); }
function connect(token) {
  const socket = io(`http://127.0.0.1:${CUR_PORT}`, { transports: ['websocket'] });
  const ctx = { socket, merger: createMerger(), state: null, welcome: null, syncs: [], errs: [], casts: [], chests: [], needChar: false, createErr: null, tstate: [], tcat: null, myName: null };
  socket.on('connect', () => socket.emit('hello', { token }));
  socket.on('welcome', (w) => { ctx.welcome = w; ctx.myName = (w.character || {}).name; });
  socket.on('need_character', () => { ctx.needChar = true; });
  socket.on('create_error', (e) => { ctx.createErr = e.message; });
  socket.on('talent_catalog', (c) => { ctx.tcat = c; });
  socket.on('talent_state', (s) => ctx.tstate.push(s));
  socket.on('char_sync', (s) => ctx.syncs.push(s));
  socket.on('interact_error', (e) => ctx.errs.push(e.message || ''));
  socket.on('cast_result', (r) => ctx.casts.push(r));
  socket.on('chest_opened', (o) => ctx.chests.push(o));
  socket.on('server_tick', (t) => { const st = ctx.merger(t); if (st) ctx.state = st; });
  return ctx;
}
const lastSync = (c) => c.syncs.length ? c.syncs[c.syncs.length - 1] : (c.welcome ? c.welcome.character : null);
const meOf = (c) => { if (!c.state || !c.state.players) return null; return c.state.players.find((p) => p.name === c.myName) || null; };
const monsOf = (c) => (c.state && c.state.monsters) || [];
const median = (a) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : 0; };
async function waitStableMons(c, min) {
  let last = -1, stable = 0;
  const t0 = Date.now();
  while (Date.now() - t0 < 25000) {
    const n = monsOf(c).length;
    if (n >= (min || 10) && n === last) { stable++; if (stable >= 3) return n; } else stable = 0;
    last = n; await sleep(1000);
  }
  return last;
}
async function flyTo(c, x, y, tol) {
  c.socket.emit('fly_toggle', {}); await sleep(350);
  const t0 = Date.now();
  while (Date.now() - t0 < 30000) { const me = meOf(c); if (!me) { await sleep(120); continue; } const dx = x - me.x, dy = y - me.y; const d = Math.hypot(dx, dy); if (d <= (tol || 45)) break; c.socket.emit('client_input', { vx: dx / d, vy: dy / d }); await sleep(110); }
  c.socket.emit('client_input', { vx: 0, vy: 0 });
  c.socket.emit('fly_toggle', {}); await sleep(450);
}
async function steerTo(c, tx, ty, tol, timeoutMs) {
  const t0 = Date.now();
  while (Date.now() - t0 < (timeoutMs || 30000)) {
    const me = meOf(c); if (!me) { await sleep(120); continue; }
    const dx = tx - me.x, dy = ty - me.y; const d = Math.hypot(dx, dy);
    if (d <= tol) break;
    c.socket.emit('client_input', { vx: dx / d, vy: dy / d });
    await sleep(130);
  }
  c.socket.emit('client_input', { vx: 0, vy: 0 });
}
function freshMon(c, kind, minDist) {
  const me = meOf(c); if (!me) return null;
  return monsOf(c).filter((m) => m.kind === kind && m.hp >= (m.maxHp || 1e9) - 1 && Math.hypot(m.x - me.x, m.y - me.y) >= (minDist || 0))
    .sort((a, b) => Math.hypot(a.x - me.x, a.y - me.y) - Math.hypot(b.x - me.x, b.y - me.y))[0] || null;
}
// Đứng cách quái 1 khoảng offset (về phía +x), đánh 1 đòn thường, trả {dist, drop}
async function attackAtOffset(c, monId, offset, waitMs) {
  const m0 = monsOf(c).find((m) => m.id === monId); if (!m0) return null;
  await flyTo(c, m0.x + offset, m0.y, 7);
  const live = monsOf(c).find((m) => m.id === monId); if (!live) return null;
  const me = meOf(c); const dist = Math.hypot(live.x - me.x, live.y - me.y);
  const before = live.hp;
  c.socket.emit('player_attack');
  const t0 = Date.now(); let drop = 0;
  while (Date.now() - t0 < (waitMs || 1400)) {
    const cur = monsOf(c).find((m) => m.id === monId);
    if (!cur) { drop = before; break; }
    if (cur.hp < before) { drop = before - cur.hp; break; }
    await sleep(110);
  }
  return { dist, drop };
}
async function firstHitDrop(c, kind) {
  for (let t = 0; t < 6; t++) {
    const w = freshMon(c, kind, 0); if (!w) return 0;
    const r = await attackAtOffset(c, w.id, 25, 1200);
    if (r && r.drop > 0) return r.drop;
    await sleep(300);
  }
  return 0;
}
async function castDmg(c, skillId) {
  const sy = lastSync(c); const slot = ((sy && sy.skills) || []).findIndex((x) => x.id === skillId);
  if (slot < 0) return { slot, dmg: 0, okFlag: false };
  const at = c.casts.length;
  c.socket.emit('cast_skill', { slot });
  const res = await waitFor(() => c.casts.length > at ? c.casts[c.casts.length - 1] : null, 5000);
  return { slot, dmg: (res && res.dmg) || 0, okFlag: !!(res && res.ok), res };
}
function writeStore(chars) {
  for (const f of ['characters.json', 'accounts.json', 'world.json', 'sessions.json']) { try { fs.unlinkSync(path.join(DIR, f)); } catch (e) {} }
  fs.writeFileSync(path.join(DIR, 'characters.json'), JSON.stringify(chars));
  fs.writeFileSync(path.join(DIR, 'accounts.json'), JSON.stringify({}));
}

(async () => {
  const PORT = 3911;
  const cungIds = IDS('cotcung'), nhanIds = IDS('cotnhan');
  const chars = {
    gd389cung1: BASE('gd389cung1', 'Cung389', { weaponId: 'cotcung', skills: cungIds, equipped: ['cottu_cotcung_co1', 'cottu_cotcung_lu1', 'cottu_cotcung_kd1', 'cottu_cotcung_na1', 'cottu_cotcung_co2', 'cottu_cotcung_lu3'], job: LK_JOB, inventory: { quang_sat: 60 } }),
    gd389nhan1: BASE('gd389nhan1', 'Nhan389', { weaponId: 'cotnhan', skills: nhanIds, equipped: ['cottu_cotnhan_co1', 'cottu_cotnhan_lu3', 'cottu_cotnhan_kd1', 'cottu_cotnhan_na1'], job: LK_JOB, inventory: { quang_sat: 60 } }),
    gd389lenh1: BASE('gd389lenh1', 'Lenh389', { classId: 'quytu', weaponId: 'colenh' }),
    gd389dao01: BASE('gd389dao01', 'Dao389', { classId: 'satthu', weaponId: 'songdao' }),
    gd389vmc01: BASE('gd389vmc01', 'VmCung389', { weaponId: 'cotcung', realm: 'na', anState: { vienman: true } }),
    gd389vmn01: BASE('gd389vmn01', 'VmNhan389', { weaponId: 'cotnhan', realm: 'na', anState: { vienman: true } }),
  };
  writeStore(chars);
  try {
    await startServer(PORT, 'main');
    const st = await (await fetch(`http://127.0.0.1:${PORT}/api/status`)).json();
    ok('0 boot: 4579 quai', st.monsters === 4579, JSON.stringify(st).slice(0, 160));

    // ---- Chân 1: tạo nhân vật qua luồng thật ----
    async function createFlow(token, name, weaponId) {
      const c = connect(token);
      await waitFor(() => c.needChar, 20000);
      c.socket.emit('talent_catalog_get'); await waitFor(() => c.tcat, 6000);
      c.socket.emit('talent_pick', { tier: 'vo', id: 'suc_luc' });
      await waitFor(() => { const s = c.tstate[c.tstate.length - 1]; return s && s.pending && s.pending.result === 'suc_luc'; }, 6000);
      c.socket.emit('create_character', { name, classId: 'cottu', weaponId });
      const w = await waitFor(() => c.welcome, 15000);
      c.socket.disconnect();
      return w ? w.character : null;
    }
    const nc1 = await createFlow('gd389newc1', 'TaoCung389', 'cotcung');
    ok('1a tao Cot Tu + Cot Cung: weaponId=cotcung', !!nc1 && nc1.weaponId === 'cotcung', JSON.stringify(nc1 && { w: nc1.weaponId, c: nc1.classId }));
    const nc2 = await createFlow('gd389newn1', 'TaoNhan389', 'cotnhan');
    ok('1b tao Cot Tu + Cot Nhan: weaponId=cotnhan', !!nc2 && nc2.weaponId === 'cotnhan', JSON.stringify(nc2 && { w: nc2.weaponId }));
    const nc3 = await createFlow('gd389newv1', 'TaoVm389', 'cotcung_vm');
    ok('1c chan chon _vm luc tao: lui ve cotthuan', !!nc3 && nc3.weaponId === 'cotthuan', JSON.stringify(nc3 && { w: nc3.weaponId }));

    // ---- Chân 2: Cốt Cung — sổ chiêu + thần thông ----
    const A = connect('gd389cung1');
    await waitFor(() => A.welcome, 20000);
    await waitFor(() => lastSync(A) && lastSync(A).catalog, 10000);
    await waitStableMons(A, 10);
    const catA = (lastSync(A).catalog || []).filter((s) => s.weaponId === 'cotcung');
    ok('2a Cot Cung: welcome weaponId=cotcung', A.welcome.character.weaponId === 'cotcung', A.welcome.character.weaponId);
    ok('2b Cot Cung: so catalog dung 26 chieu', catA.length === 26, 'count=' + catA.length);
    const godA = ['cottu_cotcung_kd1', 'cottu_cotcung_kd2', 'cottu_cotcung_kd3', 'cottu_cotcung_na1', 'cottu_cotcung_na2', 'cottu_cotcung_na3'];
    ok('2c than thong KD/NA tu linh ngo du 6', godA.every((id) => { const e = catA.find((s) => s.id === id); return e && e.learned; }), JSON.stringify(catA.filter((s) => godA.includes(s.id)).map((s) => [s.id, s.learned])));

    // ---- Chân 3: tầm xa ----
    let rIn = null;
    for (let t = 0; t < 4 && !rIn; t++) { const w = freshMon(A, 'wolf', 300); if (!w) break; const r = await attackAtOffset(A, w.id, 138, 1500); if (r && r.dist >= 110 && r.dist <= 155) rIn = r; }
    ok('3a don thuong xa ~140px TRUNG (tam 150)', !!rIn && rIn.drop > 0, JSON.stringify(rIn));
    let rOut = null;
    for (let t = 0; t < 4 && !rOut; t++) { const w = freshMon(A, 'wolf', 300); if (!w) break; const r = await attackAtOffset(A, w.id, 215, 400); if (r && r.dist >= 180) { await sleep(1300); const cur = monsOf(A).find((m) => m.id === w.id); rOut = { dist: r.dist, hpAfter: cur ? cur.hp : 0, maxHp: w.maxHp }; if (cur && cur.hp >= (w.maxHp || 1e9) - 1) break; rOut = null; } }
    ok('3b don thuong xa ~215px KHONG trung', !!rOut, JSON.stringify(rOut));

    // ---- Chân 4: sát thương ngang colenh ----
    const dropsA = []; for (let i = 0; i < 3; i++) { const d = await firstHitDrop(A, 'wolf'); if (d) dropsA.push(d); }
    const C0 = connect('gd389lenh1'); await waitFor(() => C0.welcome, 20000); await waitStableMons(C0, 10);
    const dropsC = []; for (let i = 0; i < 3; i++) { const d = await firstHitDrop(C0, 'wolf'); if (d) dropsC.push(d); }
    const mA = median(dropsA), mC = median(dropsC);
    info('4 dmg cotcung vs colenh', `cung=${JSON.stringify(dropsA)} med=${mA} · lenh=${JSON.stringify(dropsC)} med=${mC}`);
    ok('4 sat thuong cotcung trong dai colenh (0.7–1.4)', mA > 0 && mC > 0 && mA / mC >= 0.7 && mA / mC <= 1.4, `ratio=${mC ? (mA / mC).toFixed(2) : '?'}`);
    C0.socket.disconnect();

    // ---- Chân 5: cast lu1 + kd1 ----
    async function castOnWolf(c, skillId) {
      for (let t = 0; t < 4; t++) {
        const w = freshMon(c, 'wolf', 200); if (!w) return { dmg: 0 };
        await flyTo(c, w.x + 120, w.y, 10); await sleep(200);
        const r = await castDmg(c, skillId);
        if (r.okFlag && r.dmg > 0) return r;
        await sleep(600);
      }
      return { dmg: 0 };
    }
    const lu1 = await castOnWolf(A, 'cottu_cotcung_lu1');
    const kd1 = await castOnWolf(A, 'cottu_cotcung_kd1');
    info('5 cast dmg', `lu1=${lu1.dmg} kd1=${kd1.dmg}`);
    ok('5a cast lu1 co sat thuong', lu1.dmg > 0, JSON.stringify(lu1.res || {}).slice(0, 120));
    ok('5b cast kd1/lu1 ≈ 3.0/1.6 (1.5–2.3)', kd1.dmg > 0 && lu1.dmg > 0 && kd1.dmg / lu1.dmg >= 1.5 && kd1.dmg / lu1.dmg <= 2.3, `ratio=${lu1.dmg ? (kd1.dmg / lu1.dmg).toFixed(2) : '?'}`);

    // ---- Chân 6+7+8: Cốt Nhận ----
    const B = connect('gd389nhan1');
    await waitFor(() => B.welcome, 20000);
    await waitFor(() => lastSync(B) && lastSync(B).catalog, 10000);
    await waitStableMons(B, 10);
    const catB = (lastSync(B).catalog || []).filter((s) => s.weaponId === 'cotnhan');
    ok('6a Cot Nhan: welcome weaponId=cotnhan', B.welcome.character.weaponId === 'cotnhan', B.welcome.character.weaponId);
    ok('6b Cot Nhan: so catalog dung 26 chieu', catB.length === 26, 'count=' + catB.length);
    // nhịp đòn trên golem (máu cao, chậm)
    let intervals = [];
    {
      const g = freshMon(B, 'golem', 0);
      if (g) {
        await flyTo(B, g.x + 25, g.y, 8);
        const times = []; let prevHp = null;
        const t0 = Date.now();
        const iv = setInterval(() => { B.socket.emit('player_attack'); }, 110);
        while (Date.now() - t0 < 6000) {
          const cur = monsOf(B).find((m) => m.id === g.id);
          if (!cur) break;
          if (prevHp != null && cur.hp < prevHp) times.push(Date.now());
          prevHp = cur.hp;
          // bám theo golem nếu nó di chuyển
          const me = meOf(B); if (me && Math.hypot(cur.x - me.x, cur.y - me.y) > 45) { B.socket.emit('client_input', { vx: (cur.x - me.x) / Math.hypot(cur.x - me.x, cur.y - me.y), vy: (cur.y - me.y) / Math.hypot(cur.x - me.x, cur.y - me.y) }); }
          await sleep(90);
        }
        clearInterval(iv); B.socket.emit('client_input', { vx: 0, vy: 0 });
        for (let i = 1; i < times.length; i++) intervals.push((times[i] - times[i - 1]) / 1000);
      }
    }
    const medIv = median(intervals);
    info('7 nhip don cotnhan', `hits intervals=${JSON.stringify(intervals)} med=${medIv}`);
    ok('7a nhip don Cot Nhan ≈0.5s (0.40–0.72)', intervals.length >= 3 && medIv >= 0.40 && medIv <= 0.72, `n=${intervals.length} med=${medIv}`);
    let rMelee = null;
    for (let t = 0; t < 3 && !rMelee; t++) { const g = freshMon(B, 'golem', 250); if (!g) break; const r = await attackAtOffset(B, g.id, 125, 500); if (r && r.dist >= 100) rMelee = r; }
    ok('7b can chien: 125px KHONG trung (tam 65)', !!rMelee && rMelee.drop === 0, JSON.stringify(rMelee));
    const dropsB = []; for (let i = 0; i < 3; i++) { const d = await firstHitDrop(B, 'wolf'); if (d) dropsB.push(d); }
    const D0 = connect('gd389dao01'); await waitFor(() => D0.welcome, 20000); await waitStableMons(D0, 10);
    const dropsD = []; for (let i = 0; i < 3; i++) { const d = await firstHitDrop(D0, 'wolf'); if (d) dropsD.push(d); }
    const mB = median(dropsB), mD = median(dropsD);
    info('8 dmg cotnhan vs songdao', `nhan=${JSON.stringify(dropsB)} med=${mB} · dao=${JSON.stringify(dropsD)} med=${mD}`);
    ok('8 sat thuong cotnhan trong dai songdao (0.7–1.4)', mB > 0 && mD > 0 && mB / mD >= 0.7 && mB / mD <= 1.4, `ratio=${mD ? (mB / mD).toFixed(2) : '?'}`);
    D0.socket.disconnect();

    // ---- Chân 9: rèn ----
    async function forge(c, gearId) {
      for (let t = 0; t < 6; t++) {
        const before = Object.keys((lastSync(c) || {}).gearBag || {}).length;
        c.errs.length = 0;
        c.socket.emit('forge_gear', { slot: 'WEAPON', rarity: 'TRANG', weapon: gearId });
        const got = await waitFor(() => { const gb = (lastSync(c) || {}).gearBag || {}; return Object.values(gb).find((it) => it.slot === 'WEAPON' && it.weapon === gearId) || null; }, 5000);
        if (got) return got;
        if (c.errs.length) return { error: c.errs.join(';') };
        if (Object.keys((lastSync(c) || {}).gearBag || {}).length > before) return { error: 'ren ra mon khac?' };
        await sleep(400);
      }
      return null;
    }
    const fA = await forge(A, 'COT_CUNG');
    ok('9a ren COT_CUNG thanh cong, khoa dung duong', !!fA && fA.weapon === 'COT_CUNG', JSON.stringify(fA || {}).slice(0, 160));
    if (fA && fA.unique) info('9a unique group', JSON.stringify(fA.unique));
    const fB = await forge(B, 'COT_NHAN');
    ok('9b ren COT_NHAN thanh cong, khoa dung duong', !!fB && fB.weapon === 'COT_NHAN', JSON.stringify(fB || {}).slice(0, 160));
    if (fB && fB.unique) info('9b unique group', JSON.stringify(fB.unique));

    // ---- Chân 10: rương khoá đường ----
    {
      const seenChests = new Set(((A.state && A.state.chests) || []).map((x) => x.id));
      let opens = 0; const t0 = Date.now();
      while (opens < 10 && Date.now() - t0 < 300000) {
        const chest = ((A.state && A.state.chests) || []).find((x) => !seenChests.has(x.id) && !x.hidden);
        if (chest) {
          seenChests.add(chest.id);
          const beforeEv = A.chests.length;
          await steerTo(A, chest.x, chest.y, 16, 25000);
          const ev = await waitFor(() => A.chests.length > beforeEv ? A.chests[A.chests.length - 1] : null, 6000);
          if (ev) opens++;
          continue;
        }
        // chưa có rương: đi hạ sói gần nhất
        const me = meOf(A); const w = monsOf(A).filter((m) => m.hp > 0).sort((a, b) => Math.hypot(a.x - me.x, a.y - me.y) - Math.hypot(b.x - me.x, b.y - me.y))[0];
        if (!w) { await sleep(800); continue; }
        const wid = w.id; const t1 = Date.now();
        while (Date.now() - t1 < 12000) {
          const cur = monsOf(A).find((m) => m.id === wid); if (!cur) break;
          const me2 = meOf(A); const d = Math.hypot(cur.x - me2.x, cur.y - me2.y);
          if (d > 110) A.socket.emit('client_input', { vx: (cur.x - me2.x) / d, vy: (cur.y - me2.y) / d });
          else { A.socket.emit('client_input', { vx: 0, vy: 0 }); A.socket.emit('player_attack'); }
          await sleep(130);
        }
        A.socket.emit('client_input', { vx: 0, vy: 0 });
        await sleep(600);
      }
      const gb = Object.values((lastSync(A) || {}).gearBag || {});
      const wpns = gb.filter((it) => it.slot === 'WEAPON');
      info('10 ruong', `opens=${opens} gearTong=${gb.length} vuKhi=${wpns.length} weapons=${JSON.stringify(wpns.map((i) => i.weapon))}`);
      ok('10 ruong khoa duong: moi vu khi roi = COT_CUNG', wpns.length >= 1 && wpns.every((i) => i.weapon === 'COT_CUNG'), `n=${wpns.length}`);
    }

    // ---- Chân 11: Viên Mãn ----
    const V = connect('gd389vmc01');
    await waitFor(() => V.welcome, 20000);
    await waitFor(() => lastSync(V) && lastSync(V).catalog, 10000); await sleep(800);
    const wV = (lastSync(V) || {}).weaponId || V.welcome.character.weaponId;
    const catV = (lastSync(V).catalog || []).filter((s) => s.weaponId === 'cotcung_vm');
    ok('11a VM Cot Cung: vu khi tien hoa cotcung_vm', wV === 'cotcung_vm', 'w=' + wV);
    ok('11b VM Cot Cung: so catalog dung 16 chieu VM', catV.length === 16, 'count=' + catV.length);
    const coVm = catV.find((s) => s.id === 'cottu_cotcung_vm_co1');
    ok('11c VM Cot Cung: co1 VM da linh ngo (evolve cap)', !!coVm && coVm.learned === true, JSON.stringify(coVm && coVm.learned));
    V.socket.disconnect();
    const W = connect('gd389vmn01');
    await waitFor(() => W.welcome, 20000);
    await waitFor(() => lastSync(W) && lastSync(W).catalog, 10000); await sleep(800);
    const wW = (lastSync(W) || {}).weaponId || W.welcome.character.weaponId;
    const catW = (lastSync(W).catalog || []).filter((s) => s.weaponId === 'cotnhan_vm');
    ok('11d VM Cot Nhan: vu khi tien hoa cotnhan_vm', wW === 'cotnhan_vm', 'w=' + wW);
    ok('11e VM Cot Nhan: so catalog dung 16 chieu VM', catW.length === 16, 'count=' + catW.length);
    W.socket.disconnect();

    A.socket.disconnect(); B.socket.disconnect();
  } catch (e) {
    console.log('PROBE ERROR | ' + (e && e.stack || e));
    fail++;
  } finally {
    await stopServer();
    console.log(`\n== GD389 PROBE: PASS ${pass} / FAIL ${fail} ==`);
    process.exit(fail ? 1 : 0);
  }
})();
