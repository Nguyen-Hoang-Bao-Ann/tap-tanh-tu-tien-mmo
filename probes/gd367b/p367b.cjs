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
async function startServer(port, tag, extraEnv) {
  CUR_PORT = port;
  if (!(await portFree(port))) throw new Error('port ban ' + port);
  serverProc = spawn('node', ['server/index.js'], { cwd: ROOT, env: { ...process.env, PORT: String(port), TTT_STORAGE: 'file', TTT_CHAR_FILE: path.join(DIR, 'characters.json'), TTT_ACC_FILE: path.join(DIR, 'accounts.json'), TTT_WORLD_FILE: path.join(DIR, 'world.json'), TTT_SESS_FILE: path.join(DIR, 'sessions.json'), TTT_DAY_REAL_MS: '600000', TTT_TUVI_NEED: '5', ...(extraEnv || {}) }, stdio: ['ignore', 'pipe', 'pipe'] });
  serverProc.stderr.on('data', (d) => { try { fs.appendFileSync(path.join(DIR, 'srv_' + tag + '.log'), d); } catch (e) {} });
  serverProc.stdout.on('data', (d) => { try { fs.appendFileSync(path.join(DIR, 'srv_' + tag + '.log'), d); } catch (e) {} });
  killTimer = setTimeout(() => { try { serverProc.kill('SIGKILL'); } catch (e) {} }, 1800000);
  const t0 = Date.now();
  while (Date.now() - t0 < 45000) { try { const r = await fetch(`http://127.0.0.1:${port}/api/status`); if (r.ok) { clearTimeout(killTimer); return; } } catch (e) {} await sleep(500); }
  throw new Error('server khong len');
}
async function stopServer() { if (!serverProc) return; const p = serverProc; serverProc = null; if (killTimer) { clearTimeout(killTimer); killTimer = null; } await new Promise((res) => { const t = setTimeout(() => { try { p.kill('SIGKILL'); } catch (e) {} res(); }, 4000); p.once('exit', () => { clearTimeout(t); res(); }); try { p.kill('SIGTERM'); } catch (e) { clearTimeout(t); res(); } }); const t0 = Date.now(); while (Date.now() - t0 < 10000 && !(await portFree(CUR_PORT))) await sleep(300); }
const STRONG = { khiHuyet: 20000, vatCong: 6000, vatPhong: 2000, phapCong: 400, phapPhong: 2000, tocDo: 80, minhMan: 100 };
const LC1 = { elements: ['kim'], main: 'kim', count: 1, mutations: [] };
function BASE(token, name, extra) {
  return Object.assign({ token, name, classId: 'kiemtu', gender: 'nam', race: null, geo175: 1, realm: 'tn', tier: 9, x: 1565, y: 1011, mapId: 'lang_tan_thu', hp: 999999, mp: 99999, lifespan: 500, birthDay: -5660, ageStart: 16, stats: { ...STRONG }, statPoints: 0, freePoints: 0, tuVi: 99999, stones: 100000, stonesTrung: 0, stonesThuong: 0, stonesCuc: 0, inventory: {}, gearBag: {}, equipped: [], skills: [], job: null, job2: null, job3: null, linhCan: { ...LC1 }, affinity: {}, affV2: 1, bonds: {}, quests: {}, questsDone: {}, flags: {}, counters: {}, disciples: [], foundInvites: [], reformIn: [], sectTech: [], sectArts: [], sectArtsActive: [], mails: [], classRes: {}, food: 100, water: 100 }, extra || {});
}
let pass = 0, fail = 0;
function ok(name, cond, extra) { if (cond) { pass++; console.log('PASS | ' + name); } else { fail++; console.log('FAIL | ' + name + (extra ? ' | ' + extra : '')); } }
function connect(token) {
  const socket = io(`http://127.0.0.1:${CUR_PORT}`, { transports: ['websocket'] });
  const ctx = { socket, merger: createMerger(), state: null, welcome: null, syncs: [], errs: [], notices: [], maps: [], killed: [], chestEvents: [], myName: null };
  socket.on('connect', () => socket.emit('hello', { token }));
  socket.on('welcome', (w) => { ctx.welcome = w; ctx.myName = (w.character || {}).name; });
  socket.on('char_sync', (s) => ctx.syncs.push(s));
  socket.on('notice', (n) => ctx.notices.push(n.text || ''));
  socket.on('interact_error', (e) => ctx.errs.push(e.message || ''));
  socket.on('map_enter', (m) => ctx.maps.push(m));
  socket.on('monster_killed', (k) => ctx.killed.push(k));
  socket.on('chest_opened', (e) => ctx.chestEvents.push(e));
  socket.on('server_tick', (t) => { const st = ctx.merger(t); if (st) ctx.state = st; });
  return ctx;
}
const lastChar = (c) => { for (let i = c.syncs.length - 1; i >= 0; i--) { if (c.syncs[i]) return c.syncs[i]; } return c.welcome ? c.welcome.character : null; };
const meOf = (c) => { const ps = (c.state && c.state.players) || []; return ps.find((p) => p.name === c.myName) || null; };
const mons = (c) => (c.state && c.state.monsters) || [];
const chestsOf = (c) => (c.state && c.state.chests) || [];
const achBossKills = (c) => { const ch = lastChar(c); return (ch && ch.counters && ch.counters.ach_bossKills) || 0; };
const stonesCucOf = (c) => { const ch = lastChar(c); return ch ? (ch.stonesCuc || 0) : -1; };
const isBossInd = (m) => m.sp === 1 && !m.rare; // cá thể đặc biệt KHÔNG hiếm -> với 18 loài đích (type không minChestGrade) chính là bản mapBoss
async function flyTo(c, tx, ty, tol, ms) {
  c.socket.emit('fly_toggle', {});
  await sleep(400);
  const t0 = Date.now();
  while (Date.now() - t0 < (ms || 60000)) {
    const me = meOf(c); if (!me) { await sleep(150); continue; }
    const dx = tx - me.x, dy = ty - me.y; const d = Math.hypot(dx, dy);
    if (d <= (tol || 60)) break;
    c.socket.emit('client_input', { vx: dx / d, vy: dy / d });
    await sleep(120);
  }
  c.socket.emit('client_input', { vx: 0, vy: 0 });
  c.socket.emit('fly_toggle', {});
  await sleep(400);
}
async function huntByPred(c, kind, pred, ms) {
  const t0 = Date.now(); let flying = false; let targetId = null;
  while (Date.now() - t0 < (ms || 180000)) {
    if (targetId && c.killed.some((k) => k.monsterId === targetId && k.byName === c.myName)) { if (flying) c.socket.emit('fly_toggle', {}); c.socket.emit('client_input', { vx: 0, vy: 0 }); return targetId; }
    const me = meOf(c); if (!me) { await sleep(200); continue; }
    const cands = mons(c).filter((m) => m.kind === kind && pred(m));
    if (!cands.length) { targetId = null; await sleep(300); continue; }
    cands.sort((a, b) => Math.hypot(a.x - me.x, a.y - me.y) - Math.hypot(b.x - me.x, b.y - me.y));
    const t = cands[0]; targetId = t.id;
    const d = Math.hypot(t.x - me.x, t.y - me.y);
    if (d > 58 && !flying) { c.socket.emit('fly_toggle', {}); flying = true; await sleep(300); continue; }
    if (d <= 58 && flying) { c.socket.emit('fly_toggle', {}); flying = false; await sleep(300); continue; }
    if (d > 52) { c.socket.emit('client_input', { vx: (t.x - me.x) / d, vy: (t.y - me.y) / d }); await sleep(120); continue; }
    c.socket.emit('client_input', { vx: 0, vy: 0 });
    c.socket.emit('player_attack', {}); await sleep(550);
  }
  if (flying) { try { c.socket.emit('fly_toggle', {}); } catch (e) {} }
  const me = meOf(c); const t = mons(c).filter((m) => m.kind === kind && pred(m))[0];
  console.log('  [diag hunt ' + kind + '] me=' + (me ? me.x + ',' + me.y + ' hp=' + me.hp : '?') + ' target=' + (t ? t.id + ' ' + t.x + ',' + t.y + ' hp=' + t.hp + '/' + t.maxHp : 'khong thay') + ' killed=' + JSON.stringify(c.killed.slice(-3)));
  return null;
}
async function waitStableKind(c, kind, ms) {
  const t0 = Date.now(); let last = -1, stable = 0;
  while (Date.now() - t0 < (ms || 45000)) {
    const n = mons(c).length;
    if (n === last && n > 0) { stable++; if (stable >= 3 && mons(c).some((m) => m.kind === kind)) return true; }
    else stable = 0;
    last = n;
    await sleep(1000);
  }
  return mons(c).some((m) => m.kind === kind);
}
// Đếm bản trùm của 1 loài trên map hiện tại của ctx (chờ tối đa ms cho đủ 1).
async function bossListOf(c, kind, ms) {
  const b = await waitFor(() => { const l = mons(c).filter((m) => m.kind === kind && isBossInd(m)); return l.length >= 1 ? l : null; }, ms || 20000);
  return b || mons(c).filter((m) => m.kind === kind && isBossInd(m));
}

// ===== GĐ367b: chân kiểm bổ sung (kênh đọc ĐÚNG) =====
// 11 map mà bản trùm roll trúng NHÁNH (GĐ207) ở p367: khẳng định lại bằng TẬP
// giá trị nhánh. Chân NA đầy đủ: bonds đọc qua MẢNG bondViewOf trong char_sync;
// ach_bossKills + điểm Duyên Nợ cuối đọc từ FILE nhân vật sau khi dừng server.
const TARGETS11 = [
  ['bang_nguyen_dai', 'son_quan_ho'], ['minh_ha_co', 'coi_am_sat_thu'], ['hac_thuy_dam', 'thiet_giap_te'],
  ['ngu_hanh_thien_cung', 'loi_linh'], ['van_dang_son', 'hoa_vu_phuong_anh'], ['chu_thien_chien_truong', 'tu_la_chien_ma'],
  ['kim_than_nguyen', 'ky_lan_than_anh'], ['thien_diem_hai', 'thien_hoa_su'], ['thuy_than_dam', 'thuy_than_ngu'],
  ['khong_gian_loi', 'khong_gian_xa'], ['nghich_luu_sa_mac', 'hon_don_khoi'],
];
const MD = JSON.parse(fs.readFileSync(path.join(ROOT, 'server/data/gdd/MonsterData.json'), 'utf8'));
function branchHpSet(kind) {
  const g = MD.monsters.find((x) => x.id === kind);
  const s = new Set([g.hp]);
  for (const b of (g.branches || [])) s.add(Math.max(1, Math.round(g.hp * (b.hpMul || 1))));
  return s;
}
const FOOD_POOL = ['thit_thu', 'thit_nuong', 'linh_thao', 'tien_linh_chi', 'thanh_thao', 'xuong_thu'];
function hash31(s) { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return Math.abs(h); }
const likedFood = (kind) => FOOD_POOL[hash31(kind) % 6];

(async () => {
  try {
    const chars = {};
    TARGETS11.forEach(([mid], i) => { const tk = 'b367c' + String(i + 1).padStart(3, '0'); chars[tk] = BASE(tk, 'P367BDem' + String(i + 1).padStart(2, '0'), { mapId: mid, x: 4250, y: 3200 }); });
    chars['b367kna1'] = BASE('b367kna1', 'P367BSanNA', { mapId: 'bang_nguyen_dai', x: 4250, y: 3200, job: { jobId: 'thusu', crafts: 10 }, inventory: { thit_thu: 5, thit_nuong: 5, linh_thao: 5, tien_linh_chi: 5, thanh_thao: 5, xuong_thu: 5 } });
    fs.writeFileSync(path.join(DIR, 'characters.json'), JSON.stringify(chars));
    fs.writeFileSync(path.join(DIR, 'accounts.json'), '{}');
    fs.writeFileSync(path.join(DIR, 'world.json'), JSON.stringify({ totalMinutes: 3360, savedAt: Date.now() }));
    fs.writeFileSync(path.join(DIR, 'sessions.json'), '{}');
    await startServer(3745, '367b');
    const bootLog = fs.readFileSync(path.join(DIR, 'srv_367b.log'), 'utf8');
    ok('boot*: 65 entry trùm / tổng 2948 quái', /65 map có trùm/.test(bootLog) && /tổng 2948 quái/.test(bootLog), (bootLog.match(/.*trùm map.*/) || [''])[0]);

    for (let i = 0; i < TARGETS11.length; i++) {
      const [mid, kind] = TARGETS11[i];
      const c = connect('b367c' + String(i + 1).padStart(3, '0'));
      await waitFor(() => c.welcome, 20000);
      await waitStableKind(c, kind, 90000);
      const boss = await bossListOf(c, kind, 30000);
      const all = mons(c).filter((m) => m.kind === kind);
      const set = branchHpSet(kind);
      ok('Đếm* ' + mid + ': đúng 1 bản trùm ' + kind + ', maxHp ∈ tập nhánh {' + [...set].join(',') + '}',
        boss.length === 1 && set.has(boss[0].maxHp),
        'sp=' + JSON.stringify(all.map((m) => [m.sp, !!m.rare, m.maxHp])));
      ok('Đếm* ' + mid + ': cá thể thường ' + kind + ' còn nguyên', all.some((m) => m.sp === 0), 'tong=' + all.length);
      c.socket.disconnect();
    }

    // ---- Chân NA đầy đủ ----
    const k = connect('b367kna1');
    await waitFor(() => k.welcome, 20000);
    await waitStableKind(k, 'son_quan_ho', 90000);
    const bossL = await bossListOf(k, 'son_quan_ho', 30000);
    const boss = bossL[0] || null;
    ok('NA*: tìm thấy bản trùm Sơn Quân Hổ', !!boss);
    if (boss) {
      await flyTo(k, boss.x, boss.y, 150, 60000);
      const live = mons(k).find((m) => m.id === boss.id) || boss;
      k.socket.emit('bond_feed', { monsterId: live.id, itemId: likedFood('son_quan_ho') });
      const fed = await waitFor(() => {
        const ch = lastChar(k); const arr = ch && ch.bonds;
        if (!Array.isArray(arr)) return null;
        const e = arr.find((x) => x.key === 'm:son_quan_ho');
        return e && e.score >= 15 ? e : null;
      }, 10000);
      ok('NA* (Duyên Nợ): cho trùm ăn → bonds[m:son_quan_ho] = +15 (đọc qua mảng bondViewOf)', !!fed, 'notices=' + JSON.stringify(k.notices.slice(-3)));
      k.errs.length = 0;
      k.socket.emit('tame_beast', { monsterId: live.id });
      const tameErr = await waitFor(() => k.errs.find((t) => t.includes('Không thuần hóa được trùm')) || null, 8000);
      ok('NA*: thuần hóa bản trùm bị chặn "Không thuần hóa được trùm."', !!tameErr, 'errs=' + JSON.stringify(k.errs));
      const evBefore = k.chestEvents.length;
      const killedBoss = await huntByPred(k, 'son_quan_ho', (m) => m.id === live.id, 300000);
      ok('NA*: hạ được bản trùm', !!killedBoss && killedBoss === live.id, 'killed=' + JSON.stringify(k.killed.slice(-2)));
      const opened = await waitFor(() => k.chestEvents.length > evBefore ? k.chestEvents[k.chestEvents.length - 1] : null, 20000);
      ok('NA*: rương trùm mở tại chỗ hạ (sự kiện chest_opened sau cú hạ)', !!opened, opened ? 'loot=' + JSON.stringify(opened.loot) : 'không có sự kiện trong 20s');
      await sleep(1500);
    }
    k.socket.disconnect();
    await stopServer();
    const saved = JSON.parse(fs.readFileSync(path.join(DIR, 'characters.json'), 'utf8'));
    const kc = saved['b367kna1'] || {};
    ok('FILE*: ach_bossKills = 1 sau khi hạ bản trùm mới', !!(kc.counters && kc.counters.ach_bossKills === 1), 'counters=' + JSON.stringify(kc.counters || {}));
    ok('FILE*: Duyên Nợ loài = −385 (cho ăn +15 rồi hạ cá thể đặc biệt −400)', !!(kc.bonds && kc.bonds['m:son_quan_ho'] && kc.bonds['m:son_quan_ho'].score === -385), 'bonds=' + JSON.stringify(kc.bonds || {}));
    console.log('  [FILE*] stonesCuc của thợ săn NA sau khi mở rương trùm = ' + (kc.stonesCuc || 0) + ' (số đá trong rương là roll — chỉ ghi nhận)');
  } catch (e) {
    fail++; console.log('CRASH | ' + (e && e.stack || e));
    try { await stopServer(); } catch (_) {}
  }
  console.log('KẾT QUẢ GĐ367b: ' + pass + ' PASS / ' + fail + ' FAIL');
  process.exit(fail ? 1 : 0);
})();
