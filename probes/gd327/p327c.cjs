// Probe GĐ327c — tông chiến thật (env rút ngắn): hạ pet địch −150 Duyên Nợ (GĐ327 mở khóa), hạ người −100,
// thắng chiến: +50 Tông Uy / thua +10 / lãnh địa chuyển tay / cược về bên thắng (GĐ302 + GĐ320 + GĐ322).
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const net = require('net');
const ROOT = path.join(__dirname, '..', '..');
const PORT = 3565;
const DIR = __dirname;
const { io } = require(path.join(ROOT, 'client/node_modules/socket.io-client'));
const { createMerger } = require(path.join(ROOT, 'client/worldmerge.cjs'));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function waitFor(fn, ms) { const t0 = Date.now(); while (Date.now() - t0 < ms) { const v = fn(); if (v) return v; await sleep(150); } return null; }
function portFree(port) { return new Promise((res) => { const s = net.createServer(); s.once('error', () => res(false)); s.listen(port, () => s.close(() => res(true))); }); }
let serverProc = null, killTimer = null;
async function startServer() {
  if (!(await portFree(PORT))) throw new Error('port ban');
  serverProc = spawn('node', ['server/index.js'], { cwd: ROOT, env: { ...process.env, PORT: String(PORT), TTT_STORAGE: 'file', TTT_CHAR_FILE: path.join(DIR, 'characters.json'), TTT_ACC_FILE: path.join(DIR, 'accounts.json'), TTT_WORLD_FILE: path.join(DIR, 'world.json'), TTT_SESS_FILE: path.join(DIR, 'sessions.json'), TTT_DAY_REAL_MS: '600000', TTT_TUVI_NEED: '5', TTT_WAR_DELAY_MS: '4000', TTT_WAR_LEN_MS: '40000' }, stdio: ['ignore', 'pipe', 'pipe'] });
  serverProc.stderr.on('data', (d) => process.stderr.write('[srv] ' + d));
  serverProc.stdout.on('data', (d) => { try { fs.appendFileSync(path.join(DIR, 'srv_c.log'), d); } catch (e) {} });
  killTimer = setTimeout(() => { try { serverProc.kill('SIGKILL'); } catch (e) {} }, 60000);
  const t0 = Date.now();
  while (Date.now() - t0 < 45000) { try { const r = await fetch(`http://127.0.0.1:${PORT}/api/status`); if (r.ok) { clearTimeout(killTimer); return; } } catch (e) {} await sleep(500); }
  throw new Error('server khong len');
}
async function stopServer() { if (!serverProc) return; const p = serverProc; serverProc = null; await new Promise((res) => { const t = setTimeout(() => { try { p.kill('SIGKILL'); } catch (e) {} res(); }, 4000); p.once('exit', () => { clearTimeout(t); res(); }); try { p.kill('SIGTERM'); } catch (e) { clearTimeout(t); res(); } }); const t0 = Date.now(); while (Date.now() - t0 < 10000 && !(await portFree(PORT))) await sleep(300); }
function BASE(token, name, extra) {
  return Object.assign({ token, name, classId: 'kiemtu', gender: 'nam', race: null, geo175: 1, realm: 'kd', tier: 1, x: 4248, y: 6223, mapId: 'huyet_sac_rung', hp: 99999, stats: { khiHuyet: 500, vatCong: 300, vatPhong: 300, phapCong: 100, phapPhong: 300, tocDo: 60, minhMan: 60 }, statPoints: 0, freePoints: 0, tuVi: 0, stones: 0, stonesTrung: 0, stonesThuong: 0, stonesCuc: 0, inventory: {}, gearBag: {}, equipped: [], skills: [], job: null, job2: null, job3: null, linhCan: { element: 'kim', grade: 'trung', mult: 1.2 }, affinity: {}, affV2: 1, bonds: {}, quests: {}, questsDone: {}, flags: {}, counters: {}, disciples: [], foundInvites: [], reformIn: [], sectTech: [], mails: [], classRes: {} }, extra || {});
}
function SECT(id, name, members, extra) { return Object.assign({ id, name, intro: '', fund: 0, level: 1, uy: 0, members, applicants: [], activeQuests: [], territories: [], territory: null, warehouse: [], garden: [], depts: {}, tributeDay: 100, upkeepDay: 100, questDay: 100, debtDays: 0 }, extra || {}); }
let pass = 0, fail = 0;
function ok(name, cond, extra) { if (cond) { pass++; console.log('PASS | ' + name); } else { fail++; console.log('FAIL | ' + name + (extra ? ' | ' + extra : '')); } }
async function connect(token) {
  const socket = io(`http://127.0.0.1:${PORT}`, { transports: ['websocket'] });
  const ctx = { socket, merger: createMerger(), state: null, welcome: null, sect: null, sync: null, downed: false, errors: [] };
  socket.on('connect', () => socket.emit('hello', { token }));
  socket.on('welcome', (w) => { ctx.welcome = w; });
  socket.on('server_tick', (t) => { const st = ctx.merger(t); if (st) ctx.state = st; });
  socket.on('sect_state', (st) => { ctx.sect = st; });
  socket.on('char_sync', (sy) => { ctx.sync = sy; });
  socket.on('you_downed', () => { ctx.downed = true; });
  socket.on('interact_error', (e) => ctx.errors.push(e.message || ''));
  await waitFor(() => ctx.welcome, 20000);
  socket.emit('sect_get');
  await waitFor(() => ctx.sect, 10000);
  return ctx;
}
const playersOf = (c) => c.state?.players || [];
function bondScore(c, otherToken) { const bs = (c.sync && c.sync.bonds) || []; const e = Array.isArray(bs) ? bs.find((b) => b.key === 'p:' + otherToken) : bs['p:' + otherToken]; return e ? e.score : null; }
(async () => {
  const chars = {
    p327a00001: BASE('p327a00001', ' CongTong', { x: 4290, y: 6255 }),
    p327d00001: BASE('p327d00001', ' ThuTong', { x: 4260, y: 6223, stats: { khiHuyet: 10, vatCong: 50, vatPhong: 0, phapCong: 10, phapPhong: 0, tocDo: 60, minhMan: 60 }, classRes: { tamed: { active: true, kind: 'wolf', name: 'Sói Cưng', maxHp: 60, atk: 5, def: 0, hp: 60 } } }),
  };
  fs.writeFileSync(path.join(DIR, 'characters.json'), JSON.stringify(chars));
  const sects = [
    SECT('wa', 'Tông Công', [{ token: 'p327a00001', name: ' CongTong', role: 'chu', contrib: 0 }], { fund: 10000 }),
    SECT('wd', 'Tông Thủ', [{ token: 'p327d00001', name: ' ThuTong', role: 'chu', contrib: 0 }], { fund: 3000, territories: ['lm_huyet_sac'], territory: 'lm_huyet_sac' }),
  ];
  fs.writeFileSync(path.join(DIR, 'world.json'), JSON.stringify({ totalMinutes: 100 * 1440, savedAt: Date.now(), sects }));
  await startServer();
  const A = await connect('p327a00001'); const B = await connect('p327d00001');
  await sleep(1200);
  const pet0 = playersOf(A).find((p) => String(p.id).startsWith('tamed-'));
  ok('W0 pet cua ben thu xuat hien trong tick', !!pet0, JSON.stringify(playersOf(A).map((p) => [p.id, p.name])));
  A.socket.emit('sect_war_declare', { pointId: 'lm_huyet_sac' });
  const warOn = await waitFor(() => A.sect && A.sect.mySect && A.sect.mySect.war && A.sect.mySect.war.state === 'active', 30000);
  ok('W1 chien mo sau 4s (env rut ngan)', !!warOn, JSON.stringify(A.sect.mySect && A.sect.mySect.war) + ' err=' + A.errors.join(';'));
  // A tấn công liên tục; bám theo mục tiêu gần nhất còn sống (B hoặc pet)
  const meA = () => playersOf(A).find((p) => p.id === A.welcome.id);
  const bondSeen = [];
  let petDead = false, bDown = false;
  const t0 = Date.now();
  while (Date.now() - t0 < 26000 && (!petDead || !bDown)) {
    const ps = playersOf(A);
    const pet = ps.find((p) => String(p.id).startsWith('tamed-'));
    if (!pet && !petDead) { petDead = true; await sleep(1500); const sc = bondScore(A, 'p327d00001'); bondSeen.push(['pet', sc]); }
    if (B.downed && !bDown) { bDown = true; await sleep(1500); const sc = bondScore(A, 'p327d00001'); bondSeen.push(['nguoi', sc]); }
    // chọn mục tiêu: ưu tiên kẻ còn sống ở gần nhất trong B/pet
    const me = meA(); if (!me) { await sleep(150); continue; }
    const cands = ps.filter((p) => (String(p.id).startsWith('tamed-') || p.id === B.welcome.id) && (p.hp || 0) > 0);
    if (!cands.length) { await sleep(200); continue; }
    cands.sort((x, y) => Math.hypot(x.x - me.x, x.y - me.y) - Math.hypot(y.x - me.x, y.y - me.y));
    const t = cands[0]; const d = Math.hypot(t.x - me.x, t.y - me.y);
    if (d > 55) { A.socket.emit('client_input', { vx: (t.x - me.x) / d, vy: (t.y - me.y) / d }); await sleep(110); continue; }
    A.socket.emit('client_input', { vx: 0, vy: 0 });
    A.socket.emit('player_attack');
    await sleep(950);
  }
  A.socket.emit('client_input', { vx: 0, vy: 0 });
  ok('W2 pet dich bi ha trong vung chien', petDead, JSON.stringify(bondSeen));
  ok('W3 nguoi dich bi ha guc trong vung chien', bDown, JSON.stringify(bondSeen));
  const first = bondSeen[0] || []; const second = bondSeen[1] || [];
  ok('W4 duyen no theo tung cuoc ha: pet -150 / nguoi -100 (tong -250)', (Math.abs(first[1]) === 150 || Math.abs(first[1]) === 100) && second[1] === -250, JSON.stringify(bondSeen));
  // chờ chiến kết thúc (LEN 40s từ lúc mở) rồi đọc kết quả
  const ended = await waitFor(() => { A.socket.emit('sect_get'); return A.sect && A.sect.mySect && !A.sect.mySect.war ? true : null; }, 45000);
  B.socket.emit('sect_get'); await sleep(700);
  const myA = A.sect.mySect; const myB = B.sect.mySect;
  ok('W5 chien ket thuc', !!ended);
  ok('W6 ben thang +50 Tong Uy, ben thua +10', myA.uy === 50 && myB.uy === 10, `uyA=${myA.uy} uyB=${myB.uy}`);
  ok('W7 lanh dia chuyen ve ben thang', (myA.territories || []).some((t) => t.pointId === 'lm_huyet_sac') && !(myB.territories || []).some((t) => t.pointId === 'lm_huyet_sac'), JSON.stringify([myA.territories, myB.territories]));
  ok('W8 cuoc 5000 ve ben thang (quy A tro lai 10000)', myA.fund === 10000, 'fundA=' + myA.fund);
  A.socket.disconnect(); B.socket.disconnect();
  await stopServer();
  console.log(`\n== p327c: ${pass} PASS, ${fail} FAIL ==`);
  process.exit(fail ? 1 : 0);
})();
