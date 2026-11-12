// Probe GĐ387 (vi mô) — 1 char / 1 map / 1 trùm / 1 rương mỗi boot, lặp nhiều boot.
// Mục đích: loại mọi nhiễu của phép đo lớn (trần rương toàn cục, mở hộ, sót sự kiện) —
// mỗi vòng chỉ tồn tại đúng 1 rương trùm Phản Hư (Hỗn Độn Phượng ở phan_hu_nguyen),
// đếm chest_opened có "Diên Thọ Đan" hay không. Đối chiếu tỉ lệ cài đặt 12%.
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
let serverProc = null, killTimer = null;
const PORT = 4005;
async function startServer(round) {
  if (!(await portFree(PORT))) throw new Error('port ban');
  serverProc = spawn('node', ['server/index.js'], { cwd: ROOT, env: { ...process.env, PORT: String(PORT), TTT_STORAGE: 'file', TTT_CHAR_FILE: path.join(DIR, 'characters.json'), TTT_ACC_FILE: path.join(DIR, 'accounts.json'), TTT_WORLD_FILE: path.join(DIR, 'world.json'), TTT_SESS_FILE: path.join(DIR, 'sessions.json'), TTT_DAY_REAL_MS: '600000', TTT_TUVI_NEED: '5', TTT_CHEST_TTL_MS: '600000' }, stdio: ['ignore', 'pipe', 'pipe'] });
  serverProc.stderr.on('data', (d) => { try { fs.appendFileSync(path.join(DIR, 'srv_micro.log'), d); } catch (e) {} });
  serverProc.stdout.on('data', (d) => { try { fs.appendFileSync(path.join(DIR, 'srv_micro.log'), d); } catch (e) {} });
  killTimer = setTimeout(() => { try { serverProc.kill('SIGKILL'); } catch (e) {} }, 300000);
  const t0 = Date.now();
  while (Date.now() - t0 < 90000) { try { const r = await fetch(`http://127.0.0.1:${PORT}/api/status`); if (r.ok) { clearTimeout(killTimer); return; } } catch (e) {} await sleep(400); }
  throw new Error('server khong len');
}
async function stopServer() { if (!serverProc) return; const p = serverProc; serverProc = null; if (killTimer) { clearTimeout(killTimer); killTimer = null; } await new Promise((res) => { const t = setTimeout(() => { try { p.kill('SIGKILL'); } catch (e) {} res(); }, 4000); p.once('exit', () => { clearTimeout(t); res(); }); try { p.kill('SIGTERM'); } catch (e) { clearTimeout(t); res(); } }); const t0 = Date.now(); while (Date.now() - t0 < 10000 && !(await portFree(PORT))) await sleep(300); }
const LC1 = { elements: ['kim'], main: 'kim', count: 1, mutations: [] };
function fixture() {
  return { micro387: { token: 'micro387', name: 'Micro387', classId: 'phaptu', gender: 'nam', race: null, geo175: 1, realm: 'tn', tier: 9, x: 1000, y: 1000, mapId: 'phan_hu_nguyen', hp: 9999999, mp: 999999, lifespan: 900, birthDay: -5660, ageStart: 16, stats: { khiHuyet: 200000, vatCong: 5000000, vatPhong: 3000, phapCong: 5000000, phapPhong: 3000, tocDo: 80, minhMan: 100 }, statPoints: 0, freePoints: 0, tuVi: 99999, stones: 100000, stonesTrung: 0, stonesThuong: 0, stonesCuc: 0, inventory: {}, gearBag: {}, equipped: [], skills: [], job: null, job2: null, job3: null, linhCan: { ...LC1 }, affinity: {}, affV2: 1, bonds: {}, quests: {}, questsDone: {}, flags: {}, counters: {}, disciples: [], foundInvites: [], reformIn: [], sectTech: [], sectArts: [], sectArtsActive: [], mails: [], classRes: {}, food: 100, water: 100 } };
}
async function oneRound(round) {
  for (const f of ['characters.json', 'accounts.json', 'world.json', 'sessions.json']) { try { fs.unlinkSync(path.join(DIR, f)); } catch (e) {} }
  fs.writeFileSync(path.join(DIR, 'characters.json'), JSON.stringify(fixture()));
  fs.writeFileSync(path.join(DIR, 'accounts.json'), JSON.stringify({}));
  await startServer(round);
  const merger = createMerger();
  const ctx = { state: null, welcome: null, chestEvents: [], myName: 'Micro387' };
  const socket = io(`http://127.0.0.1:${PORT}`, { transports: ['websocket'] });
  socket.on('connect', () => socket.emit('hello', { token: 'micro387' }));
  socket.on('welcome', (w) => { ctx.welcome = w; });
  socket.on('chest_opened', (o) => ctx.chestEvents.push(o));
  socket.on('server_tick', (t) => { const st = merger(t); if (st) ctx.state = st; });
  let result = 'LOI';
  try {
    await waitFor(() => ctx.welcome && ctx.state && ctx.state.monsters.length > 0, 30000);
    let lastN = -1, stable = 0;
    for (let i = 0; i < 12 && stable < 3; i++) { const n = ctx.state.monsters.length; if (n === lastN) stable++; else { stable = 0; lastN = n; } await sleep(1000); }
    socket.emit('fly_toggle');
    await sleep(500);
    const meOf = () => ctx.state.players.find((p) => p.name === 'Micro387');
    const boss = ctx.state.monsters.find((m) => m.sp === 1 && m.rare !== 1);
    if (!boss) { result = 'KHONG_THAY_TRUM'; }
    else {
      const tid = boss.id;
      let dead = false; const t0 = Date.now();
      while (Date.now() - t0 < 45000) {
        const cur = ctx.state.monsters.find((m) => m.id === tid);
        if (!cur || cur.hp <= 0) { dead = true; break; }
        const me = meOf(); if (!me || me.hp <= 0) break;
        const d = Math.hypot(cur.x - me.x, cur.y - me.y);
        if (d > 130) socket.emit('client_input', { vx: (cur.x - me.x) / d, vy: (cur.y - me.y) / d });
        else { socket.emit('client_input', { vx: 0, vy: 0 }); socket.emit('player_attack'); }
        await sleep(160);
      }
      socket.emit('client_input', { vx: 0, vy: 0 });
      if (!dead) result = 'KHONG_HA_DUOC';
      else {
        const chest = await waitFor(() => (ctx.state.chests || []).find((x) => !x.hidden), 7000);
        if (!chest) result = 'KHONG_CO_RUONG';
        else {
          const before = ctx.chestEvents.length;
          const t1 = Date.now();
          while (Date.now() - t1 < 20000 && ctx.chestEvents.length <= before) {
            const me = meOf(); if (!me) { await sleep(120); continue; }
            const d = Math.hypot(chest.x - me.x, chest.y - me.y);
            if (d <= 18) break;
            socket.emit('client_input', { vx: (chest.x - me.x) / d, vy: (chest.y - me.y) / d });
            await sleep(110);
          }
          socket.emit('client_input', { vx: 0, vy: 0 });
          const ev = await waitFor(() => ctx.chestEvents.length > before ? ctx.chestEvents[ctx.chestEvents.length - 1] : null, 7000);
          if (!ev) result = 'KHONG_MO_DUOC';
          else result = (ev.loot || []).some((l) => String(l).includes('Diên Thọ Đan')) ? 'TRUNG' : 'TRUOT';
        }
      }
    }
  } catch (e) { result = 'LOI: ' + (e && e.message || e); }
  try { socket.disconnect(); } catch (e) {}
  await stopServer();
  return result;
}
(async () => {
  const ROUNDS = 24;
  let trung = 0, mo = 0; const tally = {};
  for (let r = 1; r <= ROUNDS; r++) {
    const res = await oneRound(r);
    tally[res] = (tally[res] || 0) + 1;
    if (res === 'TRUNG') { trung++; mo++; }
    if (res === 'TRUOT') mo++;
    console.log(`vong ${r}: ${res} | tong mo=${mo} trung=${trung}`);
  }
  const rate = mo ? trung / mo : 0;
  const se = mo ? Math.sqrt(rate * (1 - rate) / mo) : 0;
  console.log(`=== GĐ387 VI MÔ: mở=${mo} trúng=${trung} tỉ lệ=${(rate * 100).toFixed(1)}% (±${(1.96 * se * 100).toFixed(1)}% CI95) | chi tiet: ${JSON.stringify(tally)} ===`);
  process.exit(0);
})();
