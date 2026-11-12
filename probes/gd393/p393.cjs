// Probe GĐ393 — B6 đợt 2: 6 đường vũ khí mới (phapan/phatluan/phikiem/quylinh/dockinh/vankiem).
// Chân: 0 boot 4579 · 1 tạo nhân vật qua luồng thật 6 đường (+chặn _vm lúc tạo)
// · 2 sổ 26 chiêu + thần thông KD/NA 6 đường · 3 tầm (xa 150 trúng/hụt, cận chiến 65)
// · 4 sát thương đòn thường ngang đường mẫu cùng nấc · 5 cast lu1/kd1 tỉ lệ 1.875
// · 6 nhịp đòn nhanh/trung tỉ lệ speedK · 7 rèn 6 đường · 8 rương khoá đường GĐ165
// · 9 Viên Mãn: tiến hoá + sổ 16 chiêu VM 6 đường.
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const net = require('net');
const ROOT = path.join(__dirname, '..', '..');
const DIR = __dirname;
const { io } = require(path.join(ROOT, 'client/node_modules/socket.io-client'));
const { createMerger } = require(path.join(ROOT, 'client/worldmerge.cjs'));
const GEAR = require(path.join(ROOT, 'server/gear.js')); // GD393-8u: unit test khoa duong truc tiep
const CAT = JSON.parse(fs.readFileSync(path.join(ROOT, 'server/data/skills_catalog.json'), 'utf8'));
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
  killTimer = setTimeout(() => { try { serverProc.kill('SIGKILL'); } catch (e) {} }, 3600000);
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
  const ctx = { socket, merger: createMerger(), state: null, welcome: null, syncs: [], errs: [], casts: [], chests: [], attackedEvents: [], needChar: false, createErr: null, tstate: [], tcat: null, myName: null };
  socket.on('connect', () => socket.emit('hello', { token }));
  socket.on('welcome', (w) => { ctx.welcome = w; ctx.myName = (w.character || {}).name; });
  socket.on('need_character', () => { ctx.needChar = true; });
  socket.on('create_error', (e) => { ctx.createErr = e.message; });
  socket.on('talent_catalog', (c) => { ctx.tcat = c; });
  socket.on('talent_state', (s) => ctx.tstate.push(s));
  socket.on('char_sync', (s) => ctx.syncs.push(s));
  socket.on('interact_error', (e) => ctx.errs.push(e.message || ''));
  socket.on('cast_result', (r) => ctx.casts.push(r));
  socket.on('player_attacked', (e) => { if (e && e.targetId) { ctx.attackedEvents.push({ id: e.id, targetId: e.targetId, at: Date.now() }); if (ctx.attackedEvents.length > 1000) ctx.attackedEvents.shift(); } });
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
async function flyTo(c, x, y, tol, timeoutMs) {
  c.socket.emit('fly_toggle', {}); await sleep(350);
  const t0 = Date.now();
  while (Date.now() - t0 < (timeoutMs || 30000)) { const me = meOf(c); if (!me) { await sleep(120); continue; } const dx = x - me.x, dy = y - me.y; const d = Math.hypot(dx, dy); if (d <= (tol || 45)) break; c.socket.emit('client_input', { vx: dx / d, vy: dy / d }); await sleep(110); }
  c.socket.emit('client_input', { vx: 0, vy: 0 });
  c.socket.emit('fly_toggle', {}); await sleep(450);
}
// Bay theo mục tiêu SỐNG (tính lại đích mỗi nhịp — quái lang thang/truy đuổi).
async function flyToLive(c, getPos, tol, timeoutMs) {
  c.socket.emit('fly_toggle', {}); await sleep(350);
  const t0 = Date.now();
  while (Date.now() - t0 < (timeoutMs || 12000)) {
    const me = meOf(c); const tp = getPos(); if (!me || !tp) { await sleep(120); continue; }
    const dx = tp.x - me.x, dy = tp.y - me.y; const d = Math.hypot(dx, dy);
    if (d <= (tol || 20)) break;
    c.socket.emit('client_input', { vx: dx / d, vy: dy / d }); await sleep(110);
  }
  c.socket.emit('client_input', { vx: 0, vy: 0 });
  c.socket.emit('fly_toggle', {}); await sleep(150);
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
async function attackAtOffset(c, monId, offset, waitMs) {
  const m0 = monsOf(c).find((m) => m.id === monId); if (!m0) return null;
  // Bay theo vị trí sống của quái (+offset về phía +x), dung sai 20px, tối đa 12s.
  await flyToLive(c, () => { const m = monsOf(c).find((x) => x.id === monId); return m ? { x: m.x + offset, y: m.y } : null; }, 20, 12000);
  const live = monsOf(c).find((m) => m.id === monId); if (!live) return null;
  const me = meOf(c); if (!me) return null;
  const dist = Math.hypot(live.x - me.x, live.y - me.y);
  // GĐ95: player_attack trúng quái GẦN NHẤT mọi loài — nếu đích không còn là
  // gần nhất (bị dơi/sói khác chen vào) thì lần này không tính, gọi lại.
  const nearest = monsOf(c).filter((m) => m.hp > 0).sort((a, b) => Math.hypot(a.x - me.x, a.y - me.y) - Math.hypot(b.x - me.x, b.y - me.y))[0];
  if (!nearest || nearest.id !== monId) return { dist, drop: -1, blocked: true };
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
// Danh 1 don tu offset cua quai song; quy don ve dung nguoi danh qua
// player_attacked {id, targetId} (GD95: don trung quai GAN NHAT moi loai —
// doi chen vao van hien dung dich, khong can chan truoc bang nearest-check).
// Danh 1 don tu offset cua quai song; quy don ve dung nguoi danh qua
// player_attacked {id, targetId} (GD95: don trung quai GAN NHAT moi loai).
// GD393-phu: soi duoi 100px/s — sleep sau khi bay toi la tu sat (lat B1:
// nham 138px nhung don roi o 41-100px). Khong sleep nua: neu co band thi
// cho khoang cach SONG vao band roi danh ngay; neu khong co band (test hut)
// thi danh sau 100ms.
async function attackForRange(c, monId, offset, bandLo, bandHi) {
  const m0 = monsOf(c).find((m) => m.id === monId && m.hp > 0);
  if (!m0) return { drop: 0, dist: null, gone: true };
  await flyToLive(c, () => { const m = monsOf(c).find((x) => x.id === monId); return m ? { x: m.x + offset, y: m.y } : null; }, 20, 12000);
  const me0 = meOf(c);
  const mA = monsOf(c).find((x) => x.id === monId && x.hp > 0);
  if (!me0 || !mA) return { drop: 0, dist: null, gone: true };
  let targetDist = Math.hypot(mA.x - me0.x, mA.y - me0.y);
  if (bandLo != null && bandHi != null) {
    // Cho soi duoi vao band (toi da 3s); no di qua band thi danh ngay.
    const tW = Date.now();
    while ((targetDist < bandLo || targetDist > bandHi) && Date.now() - tW < 3000) {
      await sleep(90);
      const me = meOf(c); const m = monsOf(c).find((x) => x.id === monId && x.hp > 0);
      if (!me || !m) return { drop: 0, dist: null, gone: true };
      targetDist = Math.hypot(m.x - me.x, m.y - me.y);
      if (targetDist < bandLo) return { drop: 0, dist: null, tooClose: true, targetDist };
    }
    if (targetDist < bandLo || targetDist > bandHi) return { drop: 0, dist: null, timeout: true, targetDist };
  } else {
    await sleep(100);
    const me = meOf(c); const m = monsOf(c).find((x) => x.id === monId && x.hp > 0);
    if (!me || !m) return { drop: 0, dist: null, gone: true };
    targetDist = Math.hypot(m.x - me.x, m.y - me.y);
  }
  const me = meOf(c);
  if (!me) return { drop: 0, dist: null, gone: true };
  const before = new Map(monsOf(c).map((x) => [x.id, { hp: x.hp, x: x.x, y: x.y, kind: x.kind }]));
  const pid = me.id || (c.welcome && c.welcome.id);
  const tEmit = Date.now();
  c.socket.emit('player_attack');
  let ev = null;
  const t0 = Date.now();
  while (Date.now() - t0 < 1500) {
    await sleep(80);
    ev = (c.attackedEvents || []).find((e) => (e.id === pid || (c.welcome && e.id === c.welcome.id)) && e.at >= tEmit);
    if (ev) break;
  }
  if (!ev) return { drop: 0, dist: null, noEvent: true, targetDist };
  const b = before.get(ev.targetId);
  const kind = (b && b.kind) || String(ev.targetId).split('-')[0];
  const me2 = meOf(c);
  const live = monsOf(c).find((x) => x.id === ev.targetId);
  if (live) {
    const dist = me2 ? Math.hypot(live.x - me2.x, live.y - me2.y) : null;
    return { drop: b ? Math.max(0, b.hp - live.hp) : 0, dist, kind, targetId: ev.targetId, dodged: !b || live.hp >= b.hp };
  }
  // Dich da chet/roi tick sau don (soi 40 mau an 1 don la chet) — coi la trung,
  // khoang cach lay luc truoc don (quai duoi ~100px/s nen lech toi da ~20px).
  return { drop: b ? b.hp : 0, dist: b && me ? Math.hypot(b.x - me.x, b.y - me.y) : null, kind, targetId: ev.targetId, killed: true };
}
async function waitFreshMon(c, kind, minDist, waitMs) {
  const t0 = Date.now();
  while (Date.now() - t0 < (waitMs || 20000)) {
    const w = freshMon(c, kind, minDist);
    if (w) return w;
    await sleep(2000);
  }
  return null;
}
// Sói đầy máu, cách người >= minDist, và không có quái khác trong 180px quanh nó.
function freshMonIso(c, kind, minDist, isoDist) {
  const me = meOf(c); if (!me) return null;
  const all = monsOf(c);
  return all.filter((m) => m.kind === kind && m.hp >= (m.maxHp || 1e9) - 1 && Math.hypot(m.x - me.x, m.y - me.y) >= (minDist || 0)
    && !all.some((o) => o.id !== m.id && o.hp > 0 && Math.hypot(o.x - m.x, o.y - m.y) < (isoDist || 180)))
    .sort((a, b) => Math.hypot(a.x - me.x, a.y - me.y) - Math.hypot(b.x - me.x, b.y - me.y))[0] || null;
}
async function waitFreshMonIso(c, kind, minDist, waitMs, isoDist) {
  const t0 = Date.now();
  while (Date.now() - t0 < (waitMs || 20000)) {
    const w = freshMonIso(c, kind, minDist, isoDist);
    if (w) return w;
    await sleep(2000);
  }
  return null;
}
async function firstHitDrop(c, kind) {
  for (let t = 0; t < 8; t++) {
    const w = await waitFreshMonIso(c, kind, 0, 15000, 140); if (!w) return 0;
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
async function castOnWolf(c, skillId) {
  for (let t = 0; t < 6; t++) {
    const w = await waitFreshMon(c, 'wolf', 200, 15000); if (!w) return { dmg: 0, kind: null };
    await flyTo(c, w.x + 120, w.y, 10, 12000); await sleep(200);
    // Cast tự chọn đích gần nhất — chỉ cast khi sói đích vẫn là gần nhất.
    const me = meOf(c);
    const nearest = me && monsOf(c).filter((m) => m.hp > 0).sort((a, b) => Math.hypot(a.x - me.x, a.y - me.y) - Math.hypot(b.x - me.x, b.y - me.y))[0];
    if (!nearest || nearest.id !== w.id) { await sleep(400); continue; }
    const r = await castDmg(c, skillId);
    if (r.okFlag && r.dmg > 0) {
      // cast_result.targetId = '<kind>-<n>' — xac minh loai that su trung
      // (doi chen vao sau luc kiem lam lech so do kd1 o lat A: 651 thay vi 930).
      const kind = r.res ? String(r.res.targetId).split('-')[0] : null;
      if (kind === 'wolf') return { ...r, kind };
      info('cast trung loai khac', skillId + ' -> ' + kind + ' dmg=' + r.dmg);
      await sleep(600); continue;
    }
    await sleep(600);
  }
  return { dmg: 0, kind: null };
}
// Nhip don: dung canh golem, spam don thuong, ghi thoi diem BAT KY quai nao
// gan nguoi choi (<170px) roi mau — don trung quai gan nhat moi loai nen chi
// theo doi 1 con golem la bo sot het (lat A ra [] du don van trung doi/soi).
// Nhip don: dung canh golem, spam don thuong, do khoang cach giua cac
// player_attacked CUA MINH (server xac nhan don da ra). Do hp drop tren tick
// khong do duoc: soi/doi 1 don la chet va bien khoi tick truoc khi poll thay,
// golem thi khong bao gio la gan nhat (lat A + B2 deu ra []).
// Nhip don: bay theo quai gan nhat suot cua so do, spam don thuong, do
// khoang cach giua cac player_attacked CUA MINH (server xac nhan don da ra).
// Dung yen 1 cho la chet do: golem neo chet/bo di la het dich trong tam
// suot 10s (lat B2c: phikiem []); do hp drop cung khong duoc vi soi/doi
// 1 don la chet va bien khoi tick truoc khi poll thay.
// Nhip don: dung yen canh golem, spam don thuong, do khoang cach giua cac
// player_attacked CUA MINH (server xac nhan don da ra). Dung yen cho khoang
// 1 chu ky sach (B2b: 0.198/0.331); bay ruot quai lam lech (B2d: toan boi
// so chu ky). Het dich trong tam >2s thi bay toi quai gan nhat roi dung yen.
// Khoang giua 2 don = k x hoi chieu + nhieu (k=1,2,... khi lo chu ky) nen
// thong ke dung la MINIMUM, khong phai median.
async function measureIntervals(c) {
  const g = freshMon(c, 'golem', 0);
  if (!g) return [];
  await flyToLive(c, () => { const m = monsOf(c).find((x) => x.id === g.id); return m ? { x: m.x + 25, y: m.y } : null; }, 20, 12000);
  const tStart = Date.now();
  const iv = setInterval(() => { c.socket.emit('player_attack'); }, 110);
  let emptySince = 0;
  const tEnd = Date.now() + 15000;
  while (Date.now() < tEnd) {
    const me = meOf(c);
    const anyNear = me && monsOf(c).some((m) => m.hp > 0 && Math.hypot(m.x - me.x, m.y - me.y) <= 160);
    if (!anyNear) {
      if (!emptySince) emptySince = Date.now();
      if (Date.now() - emptySince > 2000) {
        const near = me && monsOf(c).filter((m) => m.hp > 0).sort((a, b) => Math.hypot(a.x - me.x, a.y - me.y) - Math.hypot(b.x - me.x, b.y - me.y))[0];
        if (near) { await flyToLive(c, () => { const m = monsOf(c).find((x) => x.id === near.id); return m ? { x: m.x + 30, y: m.y } : null; }, 20, 8000); }
        emptySince = 0;
      }
    } else emptySince = 0;
    await sleep(500);
  }
  clearInterval(iv); c.socket.emit('client_input', { vx: 0, vy: 0 });
  const tEnd2 = Date.now();
  const mine = (c.attackedEvents || []).filter((e) => (e.id === (meOf(c) || {}).id || (c.welcome && e.id === c.welcome.id)) && e.at >= tStart && e.at <= tEnd2).map((e) => e.at);
  const out = [];
  for (let i = 1; i < mine.length; i++) out.push((mine[i] - mine[i - 1]) / 1000);
  return out;
}
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
async function openChests(c, gear, nOpens) {
  const seenChests = new Set(((c.state && c.state.chests) || []).map((x) => x.id));
  let opens = 0; const t0 = Date.now();
  while (opens < nOpens && Date.now() - t0 < 300000) {
    const chest = ((c.state && c.state.chests) || []).find((x) => !seenChests.has(x.id) && !x.hidden);
    if (chest) {
      seenChests.add(chest.id);
      const beforeEv = c.chests.length;
      await steerTo(c, chest.x, chest.y, 16, 25000);
      const ev = await waitFor(() => c.chests.length > beforeEv ? c.chests[c.chests.length - 1] : null, 6000);
      if (ev) opens++;
      continue;
    }
    const me = meOf(c); if (!me) { await sleep(800); continue; }
    const w = monsOf(c).filter((m) => m.hp > 0).sort((a, b) => Math.hypot(a.x - me.x, a.y - me.y) - Math.hypot(b.x - me.x, b.y - me.y))[0];
    if (!w) { await sleep(800); continue; }
    const wid = w.id; const t1 = Date.now();
    while (Date.now() - t1 < 12000) {
      const cur = monsOf(c).find((m) => m.id === wid); if (!cur) break;
      const me2 = meOf(c); const d = Math.hypot(cur.x - me2.x, cur.y - me2.y);
      if (d > 110) c.socket.emit('client_input', { vx: (cur.x - me2.x) / d, vy: (cur.y - me2.y) / d });
      else { c.socket.emit('client_input', { vx: 0, vy: 0 }); c.socket.emit('player_attack'); }
      await sleep(130);
    }
    c.socket.emit('client_input', { vx: 0, vy: 0 });
    await sleep(600);
  }
  const gb = Object.values((lastSync(c) || {}).gearBag || {});
  const wpns = gb.filter((it) => it.slot === 'WEAPON');
  return { opens, wpns };
}
function writeStore(chars) {
  for (const f of ['characters.json', 'accounts.json', 'world.json', 'sessions.json']) { try { fs.unlinkSync(path.join(DIR, f)); } catch (e) {} }
  fs.writeFileSync(path.join(DIR, 'characters.json'), JSON.stringify(chars));
  fs.writeFileSync(path.join(DIR, 'accounts.json'), JSON.stringify({}));
}

const PATHS = [
  { cls: 'phaptu', w: 'phapan', gear: 'PHAP_AN', ranged: true, fast: false, cmp: { cls: 'quytu', w: 'colenh', tok: 'gd393cmp01', name: 'Lenh393' } },
  { cls: 'phattu', w: 'phatluan', gear: 'PHAT_LUAN', ranged: true, fast: false, cmp: { cls: 'phattu', w: 'quyentruong', tok: 'gd393cmp02', name: 'Truong393' } },
  { cls: 'kiemtu', w: 'phikiem', gear: 'PHI_KIEM', ranged: true, fast: true, cmp: { cls: 'quytu', w: 'colenh', tok: 'gd393cmp01', name: 'Lenh393' } },
  { cls: 'quytu', w: 'quylinh', gear: 'QUY_LINH', ranged: true, fast: true, cmp: { cls: 'phattu', w: 'phatchau', tok: 'gd393cmp03', name: 'Chau393' } },
  { cls: 'ytu', w: 'dockinh', gear: 'DOC_KINH', ranged: true, fast: false, cmp: { cls: 'phattu', w: 'quyentruong', tok: 'gd393cmp02', name: 'Truong393' } },
  { cls: 'nhotu', w: 'vankiem', gear: 'VAN_KIEM', ranged: false, fast: false, cmp: { cls: 'cottu', w: 'cotchuy', tok: 'gd393cmp04', name: 'Chuy393' } },
];
const sid = (p, slot) => `${p.cls}_${p.w}_${slot}`;
const NAMES = ['An393', 'Luan393', 'Kiem393', 'Linh393', 'Doc393', 'Van393'];
const LEGS = new Set((process.env.LEGS || '0,1,2,3,4,5,6,7,8,9').split(',').map((x) => Number(x)));
const ONLY = process.env.ONLY ? new Set(process.env.ONLY.split(',')) : null;
const PATHW = process.env.PATHW ? new Set(process.env.PATHW.split(',')) : null;
const SPAWNS = [[2415, 1400], [2800, 1500], [2100, 1600], [2600, 1200], [3000, 1300], [1900, 1400]]; // GĐ393: tách 6 đường ra để khỏi chen chúc 1 điểm farm (bầy dơi/sói bu vào làm nhiễu đo tầm)

(async () => {
  const PORT = 3931;
  const chars = {};
  PATHS.forEach((p, i) => {
    const ids = (CAT[p.cls][p.w] || []).map((s) => s.id);
    chars['gd393main' + (i + 1)] = BASE('gd393main' + (i + 1), NAMES[i], { classId: p.cls, weaponId: p.w, x: SPAWNS[i][0], y: SPAWNS[i][1], skills: ids, equipped: [sid(p, 'co1'), sid(p, 'lu1'), sid(p, 'kd1'), sid(p, 'na1')], job: LK_JOB, inventory: { quang_sat: 300 } });
    chars['gd393vm0' + (i + 1)] = BASE('gd393vm0' + (i + 1), 'Vm' + NAMES[i], { classId: p.cls, weaponId: p.w, realm: 'na', anState: { vienman: true } });
  });
  for (const p of PATHS) {
    const c = p.cmp;
    if (!chars[c.tok]) chars[c.tok] = BASE(c.tok, c.name, { classId: c.cls, weaponId: c.w });
  }
  writeStore(chars);
  try {
    await startServer(PORT, 'main');
    const st = await (await fetch(`http://127.0.0.1:${PORT}/api/status`)).json();
    ok('0 boot: 4579 quai', st.monsters === 4579, JSON.stringify(st).slice(0, 160));

    // ---- Chân 1: tạo nhân vật qua luồng thật ----
    async function createFlow(token, name, classId, weaponId) {
      const c = connect(token);
      await waitFor(() => c.needChar, 20000);
      c.socket.emit('talent_catalog_get'); await waitFor(() => c.tcat, 6000);
      c.socket.emit('talent_pick', { tier: 'vo', id: 'suc_luc' });
      await waitFor(() => { const s = c.tstate[c.tstate.length - 1]; return s && s.pending && s.pending.result === 'suc_luc'; }, 6000);
      c.socket.emit('create_character', { name, classId, weaponId });
      const w = await waitFor(() => c.welcome, 15000);
      c.socket.disconnect();
      return w ? w.character : null;
    }
    if (LEGS.has(1)) {
      for (let i = 0; i < PATHS.length; i++) {
        const p = PATHS[i];
        const nc = await createFlow('gd393new0' + (i + 1), 'Tao' + NAMES[i], p.cls, p.w);
        ok(`1${String.fromCharCode(97 + i)} tao ${p.cls} + ${p.w}`, !!nc && nc.weaponId === p.w, JSON.stringify(nc && { w: nc.weaponId, c: nc.classId }));
      }
      const nvm = await createFlow('gd393newv1', 'TaoVm393', 'phaptu', 'phapan_vm');
      ok('1g chan chon _vm luc tao: lui ve phien', !!nvm && nvm.weaponId === 'phien', JSON.stringify(nvm && { w: nvm.weaponId }));
    }

    // ---- Chân 2: sổ chiêu + thần thông (nối 6 đường) ----
    const mains = {};
    if ([2, 3, 4, 5, 6, 7, 8].some((n) => LEGS.has(n))) {
      for (let i = 0; i < PATHS.length; i++) {
        const p = PATHS[i];
        const c = connect('gd393main' + (i + 1));
        mains[p.w] = c;
        await waitFor(() => c.welcome, 20000);
        await waitFor(() => lastSync(c) && lastSync(c).catalog, 10000);
        if (i === 0 && [3, 4, 5, 6, 8].some((n) => LEGS.has(n))) await waitStableMons(c, 10);
      }
    }
    if (LEGS.has(2)) for (let i = 0; i < PATHS.length; i++) {
      const p = PATHS[i];
      const c = mains[p.w];
      const cat = (lastSync(c).catalog || []).filter((s) => s.weaponId === p.w);
      ok(`2${String.fromCharCode(97 + i)} ${p.w}: welcome + so 26`, c.welcome.character.weaponId === p.w && cat.length === 26, `w=${c.welcome.character.weaponId} count=${cat.length}`);
      const god = ['kd1', 'kd2', 'kd3', 'na1', 'na2', 'na3'].map((s) => sid(p, s));
      ok(`2${String.fromCharCode(97 + i)}b ${p.w}: than thong KD/NA du 6`, god.every((id) => { const e = cat.find((s) => s.id === id); return e && e.learned; }), JSON.stringify(cat.filter((s) => god.includes(s.id)).map((s) => [s.id, s.learned])));
    }

    // ---- Chân 3: tầm ----
    if (LEGS.has(3)) for (const p of PATHS.filter((x) => !PATHW || PATHW.has(x.w))) {
      const c = mains[p.w];
      if (p.ranged) {
        let rIn = null;
        for (let t = 0; t < 8 && !rIn; t++) { const w = await waitFreshMonIso(c, 'wolf', 0, 20000, 140); if (!w) { if (process.env.DBG) console.log('DBG 3 ' + p.w + ' hit try' + t + ' NO-ISO-WOLF'); break; } const r = await attackForRange(c, w.id, 180, 115, 150); if (process.env.DBG) console.log('DBG 3 ' + p.w + ' hit try' + t + ' ' + JSON.stringify(r)); if (r && r.drop > 0 && r.dist !== null && r.dist >= 110 && r.dist <= 155) rIn = r; await sleep(300); }
        ok(`3 ${p.w}: xa ~140px TRUNG (tam 150)`, !!rIn && rIn.drop > 0, JSON.stringify(rIn));
        let rOut = null;
        for (let t = 0; t < 8 && !rOut; t++) { const w = await waitFreshMonIso(c, 'wolf', 0, 20000, 140); if (!w) { if (process.env.DBG) console.log('DBG 3 ' + p.w + ' miss try' + t + ' NO-ISO-WOLF'); break; } const r = await attackForRange(c, w.id, 280); if (process.env.DBG) console.log('DBG 3 ' + p.w + ' miss try' + t + ' ' + JSON.stringify(r)); if (r && r.noEvent && r.targetDist >= 180 && r.targetDist <= 320) rOut = r; await sleep(300); }
        ok(`3b ${p.w}: xa ~215px KHONG trung`, !!rOut, JSON.stringify(rOut));
      } else {
        let rHit = null;
        for (let t = 0; t < 8 && !rHit; t++) { const w = await waitFreshMonIso(c, 'wolf', 0, 20000, 140); if (!w) { if (process.env.DBG) console.log('DBG 3 ' + p.w + ' melee try' + t + ' NO-ISO-WOLF'); break; } const r = await attackForRange(c, w.id, 45, 12, 60); if (process.env.DBG) console.log('DBG 3 ' + p.w + ' melee try' + t + ' ' + JSON.stringify(r)); if (r && r.drop > 0 && r.dist !== null && r.dist >= 10 && r.dist <= 60) rHit = r; await sleep(300); }
        ok(`3 ${p.w}: can chien 25px TRUNG`, !!rHit && rHit.drop > 0, JSON.stringify(rHit));
        let rMiss = null;
        for (let t = 0; t < 8 && !rMiss; t++) { const g = await waitFreshMonIso(c, 'golem', 0, 20000, 140); if (!g) { if (process.env.DBG) console.log('DBG 3 ' + p.w + ' meleemiss try' + t + ' NO-ISO-GOLEM'); break; } const r = await attackForRange(c, g.id, 125); if (process.env.DBG) console.log('DBG 3 ' + p.w + ' meleemiss try' + t + ' ' + JSON.stringify(r)); if (r && r.noEvent && r.targetDist >= 100 && r.targetDist <= 140) rMiss = r; await sleep(300); }
        ok(`3b ${p.w}: can chien 125px KHONG trung (tam 65)`, !!rMiss, JSON.stringify(rMiss));
      }
    }

    // ---- Chân 4: sát thương đòn thường ngang đường mẫu ----
    if (LEGS.has(4)) { const cmpCtx = {};
    const cmpMed = {};
    async function cmpMedian(cmp) {
      if (cmpMed[cmp.tok] != null) return cmpMed[cmp.tok];
      let c = cmpCtx[cmp.tok];
      if (!c) { c = connect(cmp.tok); cmpCtx[cmp.tok] = c; await waitFor(() => c.welcome, 20000); await waitStableMons(c, 10); }
      const drops = []; for (let i = 0; drops.length < 3 && i < 10; i++) { const d = await firstHitDrop(c, 'wolf'); if (d) drops.push(d); }
      cmpMed[cmp.tok] = median(drops);
      info('4 cmp ' + cmp.w, JSON.stringify(drops) + ' med=' + cmpMed[cmp.tok]);
      return cmpMed[cmp.tok];
    }
    for (const p of PATHS) {
      const c = mains[p.w];
      const drops = []; for (let i = 0; drops.length < 3 && i < 10; i++) { const d = await firstHitDrop(c, 'wolf'); if (d) drops.push(d); }
      const m = median(drops), mc = await cmpMedian(p.cmp);
      info(`4 dmg ${p.w} vs ${p.cmp.w}`, `${JSON.stringify(drops)} med=${m} · cmp med=${mc}`);
      ok(`4 ${p.w}: dmg trong dai ${p.cmp.w} (0.7–1.4)`, m > 0 && mc > 0 && m / mc >= 0.7 && m / mc <= 1.4, `ratio=${mc ? (m / mc).toFixed(2) : '?'}`);
    }
    for (const c of Object.values(cmpCtx)) c.socket.disconnect(); }

    // ---- Chân 5: cast lu1/kd1 ----
    if (LEGS.has(5)) for (const p of PATHS) {
      const c = mains[p.w];
      const lu1 = await castOnWolf(c, sid(p, 'lu1'));
      ok(`5 ${p.w}: cast lu1 co sat thuong`, lu1.dmg > 0, JSON.stringify(lu1.res || {}).slice(0, 100));
      if (p.w === 'phapan' || p.w === 'dockinh') {
        const kd1 = await castOnWolf(c, sid(p, 'kd1'));
        info(`5 cast ${p.w}`, `lu1=${lu1.dmg}(${lu1.kind}) kd1=${kd1.dmg}(${kd1.kind})`);
        ok(`5b ${p.w}: kd1/lu1 ≈ 1.3125 (1.1–1.6) [aoe x0.7 GD34]`, kd1.dmg > 0 && lu1.dmg > 0 && kd1.dmg / lu1.dmg >= 1.1 && kd1.dmg / lu1.dmg <= 1.6, `ratio=${lu1.dmg ? (kd1.dmg / lu1.dmg).toFixed(2) : '?'}`);
      }
    }

    // ---- Chân 6: nhịp đòn nhanh vs trung ----
    if (LEGS.has(6)) {
      const fastIv = await measureIntervals(mains.phikiem);
      const medIv = await measureIntervals(mains.phapan);
      const mFast = fastIv.length ? Math.min(...fastIv) : 0, mMed = medIv.length ? Math.min(...medIv) : 0;
      info('6 nhip don', `phikiem(nhanh)=${JSON.stringify(fastIv)} min=${mFast} · phapan(trung)=${JSON.stringify(medIv)} min=${mMed}`);
      ok('6a nhip nhanh/trung ≈ speedK 0.625 (0.45–0.9)', mFast > 0 && mMed > 0 && mFast / mMed >= 0.45 && mFast / mMed <= 0.9, `ratio=${mMed ? (mFast / mMed).toFixed(2) : '?'} n=${fastIv.length}/${medIv.length}`);
      ok('6b nhip don < 0.9s (khong ket)', mFast < 0.9 && mMed < 0.9, `fast=${mFast} med=${mMed}`);
    }

    // ---- Chân 7: rèn ----
    if (LEGS.has(7)) for (const p of PATHS) {
      const f = await forge(mains[p.w], p.gear);
      ok(`7 ${p.w}: ren ${p.gear} thanh cong`, !!f && f.weapon === p.gear, JSON.stringify(f || {}).slice(0, 160));
      if (f && f.unique) info(`7 ${p.w} unique`, JSON.stringify(f.unique));
    }

    // ---- Chân 8: rương khoá đường (GĐ165) ----
    // Ti le that: ruong C 10% / B 20% ra do x 1/9 o WEAPON = ~1-2% vu khi/ruong
    // -> 6 lan mo thi ~90% la 0 vu khi (chay D: 32 mo, 1 vu khi dung duong).
    // Doi >=1 vu khi/6 mo la xo so, khong phai kiem chung. Khoa duong that su
    // chi nam o 1 cho: GEAR.gearWeaponFor(p) = GAME_WEAPON_TO_GEAR[p.weaponId]
    // (randomGearFor dung no khi o ra WEAPON) -> kiem bang unit test xac dinh
    // (8u) cho ca 6 duong + hoi quy 2 duong GD389; live chi kiem "khong roi
    // sai duong" + mau song PHAT_LUAN o chay D chung chuoi ruong->gear con song.
    if (LEGS.has(8)) {
      for (const p of PATHS) {
        const got = GEAR.gearWeaponFor({ weaponId: p.w });
        ok(`8u lock ${p.w} -> ${p.gear}`, got === p.gear, 'got=' + got);
      }
      ok('8u lock hoi quy cotcung -> COT_CUNG', GEAR.gearWeaponFor({ weaponId: 'cotcung' }) === 'COT_CUNG', 'got=' + GEAR.gearWeaponFor({ weaponId: 'cotcung' }));
      ok('8u lock hoi quy cotnhan -> COT_NHAN', GEAR.gearWeaponFor({ weaponId: 'cotnhan' }) === 'COT_NHAN', 'got=' + GEAR.gearWeaponFor({ weaponId: 'cotnhan' }));
      let totW = 0;
      for (const p of PATHS.filter((p) => !ONLY || ONLY.has(p.w))) {
        const r = await openChests(mains[p.w], p.gear, 6);
        totW += r.wpns.length;
        info(`8 ruong ${p.w}`, `opens=${r.opens} vuKhi=${r.wpns.length} weapons=${JSON.stringify(r.wpns.map((i) => i.weapon))}`);
        ok(`8 ${p.w}: ruong khong roi sai duong (khoa ${p.gear})`, r.wpns.every((i) => i.weapon === p.gear), `n=${r.wpns.length}`);
      }
      info('8 tong vu khi live', 'tong=' + totW + ' (chay D: 1x PHAT_LUAN dung duong)');
    }

    // ---- Chân 9: Viên Mãn ----
    if (LEGS.has(9)) for (let i = 0; i < PATHS.length; i++) {
      const p = PATHS[i];
      const V = connect('gd393vm0' + (i + 1));
      await waitFor(() => V.welcome, 20000);
      await waitFor(() => lastSync(V) && lastSync(V).catalog, 10000); await sleep(800);
      const wV = (lastSync(V) || {}).weaponId || V.welcome.character.weaponId;
      const catV = (lastSync(V).catalog || []).filter((s) => s.weaponId === p.w + '_vm');
      ok(`9${String.fromCharCode(97 + i)} VM ${p.w}: tien hoa ${p.w}_vm`, wV === p.w + '_vm', 'w=' + wV);
      ok(`9${String.fromCharCode(97 + i)}b VM ${p.w}: so 16 chieu VM`, catV.length === 16, 'count=' + catV.length);
      const coVm = catV.find((s) => s.id === `${p.cls}_${p.w}_vm_co1`);
      ok(`9${String.fromCharCode(97 + i)}c VM ${p.w}: co1 VM linh ngo`, !!coVm && coVm.learned === true, JSON.stringify(coVm && coVm.learned));
      V.socket.disconnect();
    }

    for (const c of Object.values(mains)) c.socket.disconnect();
  } catch (e) {
    console.log('PROBE ERROR | ' + (e && e.stack || e));
    fail++;
  } finally {
    await stopServer();
    console.log(`\n== GD393 PROBE: PASS ${pass} / FAIL ${fail} ==`);
    process.exit(fail ? 1 : 0);
  }
})();
