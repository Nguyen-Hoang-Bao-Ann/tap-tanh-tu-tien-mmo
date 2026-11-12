// Probe GĐ387 (phần 3) — ĐO TỈ LỆ RƠI Diên Thọ Đan từ RƯƠNG TRÙM.
// Cơ chế: quái boss-class (loài minChestGrade hoặc cờ mapBoss — tick lộ qua field `boss`)
// cõi Phản Hư+ khi gục đóng dấu rương (dienThoBoss); mở rương roll 12% ra 1 viên.
// Cách đo (theo tiền lệ p384b): nhiều BOOT server — mỗi boot trùm hồi sinh đủ; mỗi map
// cõi cao đóng sẵn 1 char cực mạnh (bay ngự kiếm, đọc vị trí trùm sống trong tick),
// hạ trùm → đi mở rương của chính nó → đếm chest_opened có dòng "Diên Thọ Đan".
// Nhóm ÂM TÍNH: map kd/tc có trùm — mở rương trùm ở đó PHẢI ra 0 viên.
// Rương ẩn (hidden=1 / dòng "Rương ẩn") bị loại khỏi mẫu — không phải rương trùm.
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
async function startServer(port, tag) {
  CUR_PORT = port;
  if (!(await portFree(port))) throw new Error('port ban ' + port);
  serverProc = spawn('node', ['server/index.js'], { cwd: ROOT, env: { ...process.env, PORT: String(port), TTT_STORAGE: 'file', TTT_CHAR_FILE: path.join(DIR, 'characters.json'), TTT_ACC_FILE: path.join(DIR, 'accounts.json'), TTT_WORLD_FILE: path.join(DIR, 'world.json'), TTT_SESS_FILE: path.join(DIR, 'sessions.json'), TTT_DAY_REAL_MS: '600000', TTT_TUVI_NEED: '5', TTT_CHEST_TTL_MS: '600000' }, stdio: ['ignore', 'pipe', 'pipe'] });
  serverProc.stderr.on('data', (d) => { try { fs.appendFileSync(path.join(DIR, 'srv_' + tag + '.log'), d); } catch (e) {} });
  serverProc.stdout.on('data', (d) => { try { fs.appendFileSync(path.join(DIR, 'srv_' + tag + '.log'), d); } catch (e) {} });
  killTimer = setTimeout(() => { try { serverProc.kill('SIGKILL'); } catch (e) {} }, 1500000);
  const t0 = Date.now();
  while (Date.now() - t0 < 90000) { try { const r = await fetch(`http://127.0.0.1:${port}/api/status`); if (r.ok) { clearTimeout(killTimer); return; } } catch (e) {} await sleep(400); }
  throw new Error('server khong len');
}
async function stopServer() { if (!serverProc) return; const p = serverProc; serverProc = null; if (killTimer) { clearTimeout(killTimer); killTimer = null; } await new Promise((res) => { const t = setTimeout(() => { try { p.kill('SIGKILL'); } catch (e) {} res(); }, 4000); p.once('exit', () => { clearTimeout(t); res(); }); try { p.kill('SIGTERM'); } catch (e) { clearTimeout(t); res(); } }); const t0 = Date.now(); while (Date.now() - t0 < 10000 && !(await portFree(CUR_PORT))) await sleep(300); }
const LC1 = { elements: ['kim'], main: 'kim', count: 1, mutations: [] };
function BASE(token, name, mapId) {
  return { token, name, classId: 'phaptu', gender: 'nam', race: null, geo175: 1, realm: 'tn', tier: 9, x: 1000, y: 1000, mapId, hp: 9999999, mp: 999999, lifespan: 900, birthDay: -5660, ageStart: 16, stats: { khiHuyet: 200000, vatCong: 5000000, vatPhong: 3000, phapCong: 5000000, phapPhong: 3000, tocDo: 80, minhMan: 100 }, statPoints: 0, freePoints: 0, tuVi: 99999, stones: 100000, stonesTrung: 0, stonesThuong: 0, stonesCuc: 0, inventory: {}, gearBag: {}, equipped: [], skills: [], job: null, job2: null, job3: null, linhCan: { ...LC1 }, affinity: {}, affV2: 1, bonds: {}, quests: {}, questsDone: {}, flags: {}, counters: {}, disciples: [], foundInvites: [], reformIn: [], sectTech: [], sectArts: [], sectArtsActive: [], mails: [], classRes: {}, food: 100, water: 100 };
}
function connect(token) {
  const socket = io(`http://127.0.0.1:${CUR_PORT}`, { transports: ['websocket'] });
  const ctx = { socket, merger: createMerger(), state: null, welcome: null, chestEvents: [], myName: null };
  socket.on('connect', () => socket.emit('hello', { token }));
  socket.on('welcome', (w) => { ctx.welcome = w; ctx.myName = (w.character || {}).name; });
  socket.on('chest_opened', (o) => ctx.chestEvents.push(o));
  socket.on('server_tick', (t) => { const st = ctx.merger(t); if (st) ctx.state = st; });
  return ctx;
}
const meOf = (c) => { if (!c.state || !c.state.players) return null; return c.state.players.find((p) => p.name === c.myName) || null; };
const monsOf = (c) => (c.state && c.state.monsters) || [];
async function steerTo(c, x, y, tol, ms) {
  const t0 = Date.now();
  while (Date.now() - t0 < (ms || 30000)) { const me = meOf(c); if (!me) { await sleep(120); continue; } const dx = x - me.x, dy = y - me.y; const d = Math.hypot(dx, dy); if (d <= (tol || 45)) break; c.socket.emit('client_input', { vx: dx / d, vy: dy / d }); await sleep(110); }
  c.socket.emit('client_input', { vx: 0, vy: 0 });
}
async function huntChar(c) {
  const res = { opens: 0, hits: 0, kills: 0, noChest: 0, bossesSeen: 0 };
  await waitFor(() => c.welcome && meOf(c) && monsOf(c).length > 0, 30000);
  // chờ số quái ổn định 3 nhịp 1s (snapshot tick đầu có thể thiếu — bài học probe trùm)
  let lastN = -1, stable = 0;
  for (let i = 0; i < 12 && stable < 3; i++) { const n = monsOf(c).length; if (n === lastN) stable++; else { stable = 0; lastN = n; } await sleep(1000); }
  c.socket.emit('fly_toggle');
  await sleep(500);
  const seenChests = new Set(((c.state && c.state.chests) || []).map((x) => x.id));
  // Tick KHÔNG gửi field boss/br (bị comment nuốt trong monsterSyncState từ lâu) —
  // nhận diện trùm qua sp=1 + rare=0: sp gồm (hiếm ✦ | trùm map | loài minChestGrade),
  // rare=0 lọc hết cá thể hiếm → còn đúng 2 nguồn trùm mà server đóng dấu rương.
  const targets = monsOf(c).filter((m) => m.sp === 1 && m.rare !== 1).map((m) => m.id);
  res.bossesSeen = targets.length;
  for (const tid of targets.slice(0, 4)) {
    let dead = false; const t0 = Date.now();
    while (Date.now() - t0 < 45000) {
      const cur = monsOf(c).find((m) => m.id === tid);
      if (!cur || cur.hp <= 0) { dead = true; break; }
      const me = meOf(c); if (!me || me.hp <= 0) break;
      const d = Math.hypot(cur.x - me.x, cur.y - me.y);
      if (d > 130) c.socket.emit('client_input', { vx: (cur.x - me.x) / d, vy: (cur.y - me.y) / d });
      else { c.socket.emit('client_input', { vx: 0, vy: 0 }); c.socket.emit('player_attack'); }
      await sleep(160);
    }
    c.socket.emit('client_input', { vx: 0, vy: 0 });
    if (!dead) continue;
    res.kills++;
    const chest = await waitFor(() => ((c.state && c.state.chests) || []).find((x) => !seenChests.has(x.id) && !x.hidden), 7000);
    if (!chest) { res.noChest++; continue; }
    seenChests.add(chest.id);
    const before = c.chestEvents.length;
    await steerTo(c, chest.x, chest.y, 18, 20000);
    const ev = await waitFor(() => c.chestEvents.length > before ? c.chestEvents[c.chestEvents.length - 1] : null, 7000);
    if (ev) {
      if ((ev.loot || []).some((l) => String(l).includes('Rương ẩn'))) continue; // rương ẩn lọt vào — loại khỏi mẫu
      res.opens++;
      if ((ev.loot || []).some((l) => String(l).includes('Diên Thọ Đan'))) res.hits++;
    }
  }
  return res;
}
const PH_MAPS = ['phan_hu_nguyen', 'thoi_gian_hanh_lang', 'khong_gian_loi', 'van_co_chien_truong', 'hon_don_thien_ho', 'dao_nguoc_son', 'cuc_han_bang_vuc', 'tam_ma_canh', 'kim_kiep_son', 'loi_kiep_nguyen', 'phong_kiep_coc', 'dia_kiep_uyen', 'thuy_kiep_trach', 'tien_linh_nguyen', 'van_hai_tien', 'ky_lan_nguyen'];
const LOW_MAPS = ['thanh_moc_lam', 'kiem_trung', 'huyet_sac_rung', 'loi_dinh_son_coc'];
(async () => {
  let phOpens = 0, phHits = 0, lowOpens = 0, lowHits = 0, kills = 0, noChest = 0, boot = 0;
  try {
    while (boot < 9 && phOpens < 200) {
      boot++;
      const chars = {};
      const roster = [];
      PH_MAPS.forEach((m, i) => { const tk = 'ch387p' + String(i).padStart(2, '0'); chars[tk] = BASE(tk, 'SanPH' + i, m); roster.push({ tk, group: 'ph', map: m }); });
      LOW_MAPS.forEach((m, i) => { const tk = 'ch387l' + String(i).padStart(2, '0'); chars[tk] = BASE(tk, 'SanLow' + i, m); roster.push({ tk, group: 'low', map: m }); });
      for (const f of ['characters.json', 'accounts.json', 'world.json', 'sessions.json']) { try { fs.unlinkSync(path.join(DIR, f)); } catch (e) {} }
      fs.writeFileSync(path.join(DIR, 'characters.json'), JSON.stringify(chars));
      fs.writeFileSync(path.join(DIR, 'accounts.json'), JSON.stringify({}));
      await startServer(3998, 'chest' + boot);
      const ctxs = roster.map((r) => ({ ...r, ctx: connect(r.tk) }));
      const results = await Promise.all(ctxs.map(async (r) => {
        try { const res = await huntChar(r.ctx); return { ...r, res }; }
        catch (e) { return { ...r, res: { opens: 0, hits: 0, kills: 0, noChest: 0, bossesSeen: -1 } }; }
        finally { try { r.ctx.socket.disconnect(); } catch (e) {} }
      }));
      await stopServer();
      for (const r of results) {
        kills += r.res.kills; noChest += r.res.noChest;
        if (r.group === 'ph') { phOpens += r.res.opens; phHits += r.res.hits; }
        else { lowOpens += r.res.opens; lowHits += r.res.hits; }
        if (boot === 1) console.log(`  boot1 ${r.map}: trum thay=${r.res.bossesSeen} ha=${r.res.kills} mo=${r.res.opens} trungDan=${r.res.hits} khongRuong=${r.res.noChest}`);
      }
      console.log(`boot ${boot}: PH+ mo=${phOpens} trung=${phHits} | duoiPH mo=${lowOpens} trung=${lowHits} | tongHa=${kills} khongRuong=${noChest}`);
    }
  } catch (e) { console.log('LOI:', e && e.stack || e); try { await stopServer(); } catch (e2) {} }
  const rate = phOpens ? phHits / phOpens : 0;
  const se = phOpens ? Math.sqrt(rate * (1 - rate) / phOpens) : 0;
  console.log(`=== GĐ387 RƯƠNG: PH+ mở=${phOpens} trúng=${phHits} tỉ lệ=${(rate * 100).toFixed(1)}% (±${(1.96 * se * 100).toFixed(1)}% CI95) | dưới PH mở=${lowOpens} trúng=${lowHits} ===`);
  const passRate = phOpens >= 150 && rate >= 0.06 && rate <= 0.20;
  const passLow = lowOpens >= 30 && lowHits === 0;
  console.log((passRate ? 'PASS' : 'CHECK') + ' | tỉ lệ PH+ trong khoảng kỳ vọng quanh 12% với mẫu ≥150');
  console.log((passLow ? 'PASS' : 'CHECK') + ' | rương trùm dưới Phản Hư ra 0 viên (mẫu ≥30)');
  process.exit(0);
})();
