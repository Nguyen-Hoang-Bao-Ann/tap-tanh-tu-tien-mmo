// Probe GĐ388-phụ — SỬA 2 TỒN ĐỌNG SAU GĐ388 (Bảo chốt 11/11 22:24):
//  TD1: vòng nhặt đồ rơi chỉ NGƯỜI CHƠI THẬT mới nhặt (trước: chỉ bỏ qua isBot →
//       pet/đồng hành đi qua đồ rơi làm tick văng TypeError 'Cannot read
//       properties of undefined' + nhặt linh thạch vào hư vô; bằng chứng cũ ở
//       probes/gd388/srv_main.log: "[nhặt đồ] Sói Đánh388 nhặt 4 Linh thạch" +
//       CRASH-GUARD TypeError reading 'ngoc_gian_trong').
//       Nay: pet đứng trong tầm nhặt 34px của đồ rơi (cả item lẫn đá) → đồ
//       PHẢI còn nguyên ≥2s; log server không TypeError, không dòng pet nhặt;
//       chủ đi qua nhặt bình thường (đá + item).
//  TD2: RECIPES (server) ↔ RECIPE_INFO (client) — trước lệch 46 id (32 GĐ384 +
//       14 cũ); nay phải 83 ↔ 83, lệch 0, trường khớp nguyên văn.
//  Kiểm phụ: ITEMS 177 · icon chiêu 1360 · FX 85 · marker intro · zip 385 nguyên.
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const net = require('net');
const crypto = require('crypto');
const ROOT = path.join(__dirname, '..', '..');
const DIR = __dirname;
const { io } = require(path.join(ROOT, 'client/node_modules/socket.io-client'));
const { createMerger } = require(path.join(ROOT, 'client/worldmerge.cjs'));
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
  while (Date.now() - t0 < 90000) { try { const r = await fetch(`http://127.0.0.1:${port}/api/status`); if (r.ok) { clearTimeout(killTimer); return await r.json(); } } catch (e) {} await sleep(400); }
  throw new Error('server khong len');
}
async function stopServer() { if (!serverProc) return; const p = serverProc; serverProc = null; if (killTimer) { clearTimeout(killTimer); killTimer = null; } await new Promise((res) => { const t = setTimeout(() => { try { p.kill('SIGKILL'); } catch (e) {} res(); }, 4000); p.once('exit', () => { clearTimeout(t); res(); }); try { p.kill('SIGTERM'); } catch (e) { clearTimeout(t); res(); } }); const t0 = Date.now(); while (Date.now() - t0 < 10000 && !(await portFree(CUR_PORT))) await sleep(300); }
const LC1 = { elements: ['kim'], main: 'kim', count: 1, mutations: [] };
function BASE(token, name, extra) {
  return Object.assign({ token, name, classId: 'kiemtu', gender: 'nam', race: null, geo175: 1, realm: 'kd', tier: 1, x: 2236, y: 1400, mapId: 'lang_tan_thu', hp: 999999, mp: 9999, lifespan: 500, birthDay: -5660, ageStart: 16, stats: { khiHuyet: 500, vatCong: 300, vatPhong: 200, phapCong: 300, phapPhong: 200, tocDo: 60, minhMan: 100 }, statPoints: 0, freePoints: 0, tuVi: 99999, stones: 100000, stonesTrung: 0, stonesThuong: 0, stonesCuc: 0, inventory: {}, gearBag: {}, equipped: [], skills: [], job: null, job2: null, job3: null, linhCan: { ...LC1 }, affinity: {}, affV2: 1, bonds: {}, quests: {}, questsDone: {}, flags: {}, counters: {}, disciples: [], foundInvites: [], reformIn: [], sectTech: [], sectArts: [], sectArtsActive: [], mails: [], classRes: {}, food: 100, water: 100 }, extra || {});
}
const THUSU = { jobId: 'thusu', crafts: 5000 };
const tamedWolf = (name, atk, hp, maxHp) => ({ active: true, kind: 'wolf', name, atk, def: 0, maxHp, hp, evo: 0, growth: 0 });
let pass = 0, fail = 0;
function ok(name, cond, extra) { if (cond) { pass++; console.log('PASS | ' + name); } else { fail++; console.log('FAIL | ' + name + (extra ? ' | ' + extra : '')); } }
function info(name, val) { console.log('INFO | ' + name + ' | ' + val); }
function connect(token) {
  const socket = io(`http://127.0.0.1:${CUR_PORT}`, { transports: ['websocket'] });
  const ctx = { socket, merger: createMerger(), state: null, welcome: null, syncs: [], errs: [], notices: [], pickups: [], myName: null };
  socket.on('connect', () => socket.emit('hello', { token }));
  socket.on('welcome', (w) => { ctx.welcome = w; ctx.myName = (w.character || {}).name; });
  socket.on('char_sync', (s) => ctx.syncs.push(s));
  socket.on('interact_error', (e) => ctx.errs.push({ t: Date.now(), msg: e.message || '' }));
  socket.on('notice', (n) => ctx.notices.push({ t: Date.now(), text: n.text || '' }));
  socket.on('pickup_note', (n) => ctx.pickups.push({ t: Date.now(), text: n.text || '' }));
  socket.on('server_tick', (t) => { const st = ctx.merger(t); if (st) ctx.state = st; });
  return ctx;
}
const lastChar = (c) => { for (let i = c.syncs.length - 1; i >= 0; i--) { if (c.syncs[i]) return c.syncs[i]; } return c.welcome ? c.welcome.character : null; };
const invOf = (c, id) => { const ch = lastChar(c); return (ch && ch.inventory && ch.inventory[id]) || 0; };
const meOf = (c) => { if (!c.state || !c.state.players) return null; return c.state.players.find((p) => p.name === c.myName) || null; };
const petOf = (c, petName) => { if (!c.state || !c.state.players) return null; return c.state.players.find((p) => p.tamed === 1 && p.name === petName) || null; };
const monsOf = (c) => (c.state && c.state.monsters) || [];
const dropsOf = (c) => (c.state && c.state.drops) || [];
function writeStore(chars) {
  for (const f of ['characters.json', 'accounts.json', 'world.json', 'sessions.json']) { try { fs.unlinkSync(path.join(DIR, f)); } catch (e) {} }
  fs.writeFileSync(path.join(DIR, 'characters.json'), JSON.stringify(chars));
  fs.writeFileSync(path.join(DIR, 'accounts.json'), JSON.stringify({}));
}
function extractBlock(src, marker) {
  const i = src.indexOf(marker); if (i < 0) return '';
  let depth = 0, j = src.indexOf('= {', i) + 2; const s = j; // bắt đầu ở '{' của phép gán (né '{' trong type annotation của client)
  for (; j < src.length; j++) { const ch = src[j]; if (ch === '{') depth++; else if (ch === '}') { depth--; if (!depth) break; } }
  return src.slice(s, j + 1);
}
async function steerStep(c, tx, ty, tol) {
  const me = meOf(c); if (!me) return;
  const dx = tx - me.x, dy = ty - me.y; const d = Math.hypot(dx, dy);
  if (d <= tol) { c.socket.emit('client_input', { vx: 0, vy: 0 }); return; }
  c.socket.emit('client_input', { vx: dx / d, vy: dy / d });
}
async function steerTo(c, tx, ty, tol, timeoutMs) {
  const t0 = Date.now();
  while (Date.now() - t0 < (timeoutMs || 30000)) {
    const me = meOf(c); if (!me) { await sleep(120); continue; }
    if (Math.hypot(tx - me.x, ty - me.y) <= tol) break;
    await steerStep(c, tx, ty, tol);
    await sleep(130);
  }
  c.socket.emit('client_input', { vx: 0, vy: 0 });
}

(async () => {
  const PET_NAME = 'Sói Phụ388';
  try {
    // ---------- Chân 0: tĩnh ----------
    const srvSrc = fs.readFileSync(path.join(ROOT, 'server/index.js'), 'utf8');
    const ITEMS = eval('(' + extractBlock(srvSrc, 'const ITEMS = {') + ')');
    ok('TD-phụ 0a: ITEMS server = 177 loại', Object.keys(ITEMS).length === 177, 'dem=' + Object.keys(ITEMS).length);
    const iconCount = fs.readdirSync(path.join(ROOT, 'client/public/icons')).filter((f) => f.endsWith('.png')).length;
    ok('TD-phụ 0b: icon chiêu public = 1360', iconCount === 1360, 'dem=' + iconCount);
    const fxCount = fs.readdirSync(path.join(ROOT, 'client/public/sprites/fx')).length;
    ok('TD-phụ 0c: FX = 85', fxCount === 85, 'dem=' + fxCount);
    const cliSrc = fs.readFileSync(path.join(ROOT, 'client/src/main.ts'), 'utf8');
    ok('TD-phụ 0d: marker ttt_intro_v1 còn trong client', cliSrc.includes('ttt_intro_v1'));
    const zipPath = path.join(ROOT, '..', 'tap-tanh-tu-tien-mmo_GD235-385.zip');
    const zipMd5 = crypto.createHash('md5').update(fs.readFileSync(zipPath)).digest('hex');
    ok('TD-phụ 0e: zip GD235-385 nguyên vẹn (không đụng)', zipMd5 === '66d4e90e6c97549a688bd5f21b78753e', zipMd5);
    // TD2: đối chiếu RECIPES ↔ RECIPE_INFO
    const srvR = eval('(' + extractBlock(srvSrc, 'const RECIPES = {') + ')');
    const cliR = eval('(' + extractBlock(cliSrc, 'const RECIPE_INFO') + ')');
    const sIds = Object.keys(srvR), cIds = Object.keys(cliR);
    const missing = sIds.filter((id) => !(id in cliR));
    ok('TD2 0f: RECIPES server = 83, RECIPE_INFO client = 83, lệch 0', sIds.length === 83 && cIds.length === 83 && missing.length === 0, `srv=${sIds.length} cli=${cIds.length} missing=${missing.join(',')}`);
    let fieldBad = 0;
    for (const id of sIds) { const a = srvR[id], b = cliR[id]; if (!b) continue; for (const k of ['jobId', 'name', 'stones', 'output', 'rate', 'minRank']) { if (JSON.stringify(a[k]) !== JSON.stringify(b[k]) && !(id.startsWith('rc_kiem_') && k === 'output')) fieldBad++; } if (JSON.stringify(a.inputs) !== JSON.stringify(b.inputs)) fieldBad++; }
    ok('TD2 0g: trường 46 mục mới mirror khớp nguyên văn server (trừ shape rc_kiem_* có sẵn từ trước)', fieldBad === 0, 'diff=' + fieldBad);
    const g384ids = ['rc_dan_hon_don_luc', 'rc_dan_kiep_luc', 'rc_dan_tien_luc', 'rc_dan_ho_kiep', 'rc_phu_thien_kiep', 'rc_canh_hu_khong', 'rc_tra_tien_linh'];
    ok('TD2 0h: mẫu công thức GĐ384 hiện trong RECIPE_INFO (panel chế liệt kê được)', g384ids.every((id) => id in cliR), g384ids.filter((id) => !(id in cliR)).join(','));

    // ---------- Boot + fixture ----------
    writeStore({
      phu388aa: BASE('phu388aa', 'ChuPhu388', { job: { ...THUSU }, classRes: { tamed: tamedWolf(PET_NAME, 100, 3000, 3000) } }),
    });
    const status = await startServer(3995, 'phu');
    ok('TD-phụ 0i: boot /api/status quái = 4579', status && (status.monsters === 4579 || status.monsterCount === 4579 || status.counts?.monsters === 4579), JSON.stringify(status).slice(0, 200));
    const c = connect('phu388aa');
    const ready = await waitFor(() => meOf(c) && petOf(c, PET_NAME) && monsOf(c).length > 0, 30000);
    ok('TD1 1a: chủ + pet hiện trong tick, có quái farm', !!ready);
    await sleep(1500); // ổn định tick đầu (bài học merger gom dần)

    // ---------- Chân TD1: pet hạ sói, đồ rơi phải còn nguyên dù pet đứng trong tầm nhặt ----------
    const tracked = new Map(); // dropId -> {kind,itemId,amount,x,y,firstSeen,lastSeen,minPetDist}
    let tracking = true;
    const trackLoop = (async () => {
      while (tracking) {
        const pet = petOf(c, PET_NAME);
        const now = Date.now();
        for (const d of dropsOf(c)) {
          let t = tracked.get(d.id);
          if (!t) { t = { kind: d.kind, itemId: d.itemId, amount: d.amount, x: d.x, y: d.y, firstSeen: now, lastSeen: now, minPetDist: Infinity }; tracked.set(d.id, t); }
          t.lastSeen = now;
          if (pet) t.minPetDist = Math.min(t.minPetDist, Math.hypot(pet.x - d.x, pet.y - d.y));
        }
        await sleep(120);
      }
    })();
    const proofFor = (kind) => { for (const t of tracked.values()) { if (t.kind === kind && t.minPetDist <= 34 && (t.lastSeen - t.firstSeen) >= 2000) return t; } return null; };
    let kills = 0;
    const tKill0 = Date.now();
    while (Date.now() - tKill0 < 300000 && !(proofFor('stones') && proofFor('item'))) {
      const me = meOf(c); if (!me) { await sleep(200); continue; }
      let target = null, td = Infinity;
      for (const m of monsOf(c)) { if (m.kind !== 'wolf' || m.hp <= 0) continue; const d = Math.hypot(m.x - me.x, m.y - me.y); if (d < td) { td = d; target = m; } }
      if (!target) { await sleep(500); continue; }
      if (td > 60) await steerTo(c, target.x, target.y, 50, 15000);
      const tid = target.id;
      const died = await waitFor(() => { const m = monsOf(c).find((x) => x.id === tid); return !m || m.hp <= 0; }, 25000);
      if (died) { kills++; await sleep(4200); } // cửa sổ mẫu: pet về cạnh chủ, đi qua vùng đồ rơi
    }
    tracking = false; await trackLoop;
    info('TD1: số sói pet đã hạ', kills);
    const pStones = proofFor('stones');
    const pItem = proofFor('item');
    ok('TD1 1b: đồ rơi LINH THẠCH còn nguyên ≥2s dù pet đã đứng trong tầm nhặt 34px', !!pStones, pStones ? `minPetDist=${Math.round(pStones.minPetDist)} song=${pStones.lastSeen - pStones.firstSeen}ms` : 'chua co mau');
    ok('TD1 1c: đồ rơi VẬT PHẨM còn nguyên ≥2s dù pet đã đứng trong tầm nhặt 34px (không còn TypeError nuốt đồ)', !!pItem, pItem ? `item=${pItem.itemId} minPetDist=${Math.round(pItem.minPetDist)} song=${pItem.lastSeen - pItem.firstSeen}ms` : 'chua co mau');

    // ---------- Chủ nhặt bình thường ----------
    // Nhặt đá: tìm 1 drop stones đang còn sống trên sân (TTL 120s)
    let sDrop = dropsOf(c).find((d) => d.kind === 'stones');
    if (!sDrop) { // hạ thêm 1 sói gần chủ để có đá mới
      const me = meOf(c); let target = null, td = Infinity;
      for (const m of monsOf(c)) { if (m.kind !== 'wolf' || m.hp <= 0) continue; const d = Math.hypot(m.x - me.x, m.y - me.y); if (d < td) { td = d; target = m; } }
      if (target) { if (td > 60) await steerTo(c, target.x, target.y, 50, 15000); const tid = target.id; await waitFor(() => { const m = monsOf(c).find((x) => x.id === tid); return !m || m.hp <= 0; }, 25000); await sleep(600); sDrop = dropsOf(c).find((d) => d.kind === 'stones'); }
    }
    if (sDrop) {
      const stones0 = (lastChar(c) || {}).stones || 0;
      const pk0 = c.pickups.length;
      await steerTo(c, sDrop.x, sDrop.y, 8, 20000);
      const got = await waitFor(() => (((lastChar(c) || {}).stones || 0) > stones0) || c.pickups.length > pk0, 6000);
      ok('TD1 1d: chủ đi qua nhặt LINH THẠCH bình thường (đá tăng + có pickup_note)', !!got, `stones ${stones0} -> ${(lastChar(c) || {}).stones}`);
    } else ok('TD1 1d: chủ đi qua nhặt LINH THẠCH bình thường', false, 'khong tim thay drop stones con song');
    // Nhặt vật phẩm: dùng drop item đã theo dõi còn sống, hoặc tìm trên sân
    let iDrop = dropsOf(c).find((d) => d.kind === 'item');
    if (iDrop) {
      const inv0 = invOf(c, iDrop.itemId);
      await steerTo(c, iDrop.x, iDrop.y, 8, 20000);
      const got = await waitFor(() => invOf(c, iDrop.itemId) > inv0, 6000);
      ok('TD1 1e: chủ đi qua nhặt VẬT PHẨM bình thường (túi +' + iDrop.itemId + ')', !!got, `inv ${inv0} -> ${invOf(c, iDrop.itemId)}`);
    } else info('TD1 1e: bỏ qua (không còn drop item sống trên sân lúc nhặt — đã có bằng chứng 1c)');

    // ---------- Log server ----------
    await sleep(1200);
    await stopServer();
    const log = fs.readFileSync(path.join(DIR, 'srv_phu.log'), 'utf8');
    ok('TD1 1f: log server KHÔNG còn TypeError/Cannot read properties', !/TypeError|Cannot read properties/.test(log));
    ok('TD1 1g: log KHÔNG có dòng pet nhặt đồ (đá không vào hư vô)', !log.includes('[nhặt đồ] ' + PET_NAME));
    const pickupLines = log.split('\n').filter((l) => l.includes('[nhặt đồ]'));
    const foreign = pickupLines.filter((l) => !l.includes('[nhặt đồ] ChuPhu388'));
    ok('TD1 1h: mọi dòng [nhặt đồ] đều của người chơi thật ChuPhu388 (bot demo không nhặt — hành vi isBot không đổi)', foreign.length === 0 && pickupLines.length > 0, 'foreign=' + foreign.slice(0, 3).join(' ;; ') + ' tong=' + pickupLines.length);
  } catch (e) {
    fail++; console.log('FAIL | NGOẠI LỆ: ' + (e && e.stack || e));
    try { await stopServer(); } catch (e2) {}
  }
  console.log(`\n=== GĐ388-phụ: ${pass} PASS / ${fail} FAIL ===`);
  process.exit(fail ? 1 : 0);
})();
