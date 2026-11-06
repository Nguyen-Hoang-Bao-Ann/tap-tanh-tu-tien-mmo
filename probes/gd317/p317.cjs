// GĐ317 probe: Cách 1 — chủng tộc + vật phẩm ẩn + Hoán Vu Kiếp Hồn + Thiên Đạo Môn.
process.env.NODE_PATH = process.env.HOME + '/workspace/tap-tanh-tu-tien-mmo/client/node_modules';
require('module').Module._initPaths();
const fs = require('fs'); const path = require('path'); const http = require('http');
const { spawn } = require('child_process'); const net = require('net');
const { io } = require('socket.io-client');
const { createMerger } = require(process.env.HOME + '/workspace/tap-tanh-tu-tien-mmo/client/worldmerge.cjs');
const DIR = __dirname; const PORT = 3528;
for (const f of ['characters.json', 'world.json', 'sessions.json', 'accounts.json']) { try { fs.unlinkSync(path.join(DIR, f)); } catch {} }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
function check(name, ok, extra = '') { results.push({ name, ok }); console.log((ok ? 'PASS' : 'FAIL') + ' | ' + name + (extra ? ' | ' + extra : '')); }
function portFree(port) { return new Promise((res) => { const s = net.createServer(); s.once('error', () => res(false)); s.once('listening', () => s.close(() => res(true))); s.listen(port, '127.0.0.1'); }); }
function waitStatus(tries = 90) { return new Promise((resolve, reject) => { let n = 0; const tick = () => { const req = http.get({ host: '127.0.0.1', port: PORT, path: '/api/status', timeout: 1500 }, (r) => { let b = ''; r.on('data', (c) => b += c); r.on('end', () => { try { resolve(JSON.parse(b)); } catch { again(); } }); }); req.on('error', again); req.on('timeout', () => { req.destroy(); again(); }); }; const again = () => { if (++n >= tries) reject(new Error('server khong len')); else setTimeout(tick, 700); }; tick(); }); }
let serverProc = null;
async function startServer() {
  if (!await portFree(PORT)) throw new Error('port ban');
  const env = { ...process.env, PORT: String(PORT), TTT_STORAGE: 'file', TTT_CHAR_FILE: path.join(DIR, 'characters.json'), TTT_WORLD_FILE: path.join(DIR, 'world.json'), TTT_SESS_FILE: path.join(DIR, 'sessions.json'), TTT_ACC_FILE: path.join(DIR, 'accounts.json'), TTT_DAY_REAL_MS: '600000', TTT_TUVI_NEED: '5' };
  serverProc = spawn('node', ['server/index.js'], { cwd: process.env.HOME + '/workspace/tap-tanh-tu-tien-mmo', env, stdio: ['ignore', 'pipe', 'pipe'] });
  let killTimer = setTimeout(() => { try { serverProc.kill('SIGKILL'); } catch {} }, 60000);
  serverProc.on('exit', () => clearTimeout(killTimer));
  await waitStatus(); clearTimeout(killTimer);
}
async function stopServer() {
  if (!serverProc) return; const p = serverProc; serverProc = null;
  await new Promise((res) => { const t = setTimeout(() => { try { p.kill('SIGKILL'); } catch {} res(); }, 5000); p.once('exit', () => { clearTimeout(t); res(); }); try { p.kill('SIGTERM'); } catch { clearTimeout(t); res(); } });
  for (let i = 0; i < 40; i++) { if (await portFree(PORT)) return; await sleep(250); }
}
const STATS = (kh = 20) => ({ khiHuyet: kh, vatCong: 30, vatPhong: 5, phapCong: 5, phapPhong: 5, tocDo: 10, minhMan: 10 });
function fixture(token, over = {}) {
  const base = { token, name: 'P317' + token.slice(-3), classId: 'kiemtu', gender: 'nam', robe: '#3a6ea5', weaponId: 'kiem', realm: 'lk', tier: 1, tuVi: 100, hp: 99999, mp: 9999, x: 1565, y: 1252, mapId: 'lang_tan_thu', stats: STATS(), statPoints: 0, freePoints: 10, inventory: {}, stones: 0, skills: [], skillMastery: {}, counters: {}, achClaimed: [], geo175: 1, gearBag: {}, equipped: [], ageStart: 16, birthDay: 0, lifespan: 80, linhCan: { main: 'kim', subs: [], purity: 40, quality: 'trung', elements: { kim: 40 } }, ...over };
  const store = {}; try { Object.assign(store, JSON.parse(fs.readFileSync(path.join(DIR, 'characters.json'), 'utf8'))); } catch {}
  store[token] = base; fs.writeFileSync(path.join(DIR, 'characters.json'), JSON.stringify(store));
}
function connect(token) {
  return new Promise((resolve, reject) => {
    const socket = io('http://127.0.0.1:' + PORT, { transports: ['websocket'], reconnection: false });
    const c = { socket, merger: createMerger(), notices: [], syncs: [], died: [], errors: [], results: {}, flyStates: [], casts: [] };
    socket.on('connect', () => socket.emit('hello', { token }));
    socket.on('welcome', (d) => { c.welcome = d; resolve(c); });
    socket.on('need_character', () => { c.needChar = true; resolve(c); });
    socket.on('server_tick', (t) => { try { c.state = c.merger(t); } catch {} });
    socket.on('notice', (d) => c.notices.push(d.text || ''));
    socket.on('char_sync', (d) => c.syncs.push(d.character || d));
    socket.on('character_died', (d) => c.died.push(d));
    socket.on('interact_error', (d) => c.errors.push(d.message || ''));
    socket.on('fly_state', (d) => c.flyStates.push(d));
    socket.on('skill_cast', (d) => c.casts.push(d));
    socket.on('branch_choose_result', (d) => { c.results.branch = d; });
    setTimeout(() => reject(new Error('connect timeout')), 15000);
  });
}
const lastSync = (c) => c.syncs[c.syncs.length - 1] || c.welcome?.character;
async function waitFor(fn, ms = 10000, step = 200) { const t0 = Date.now(); while (Date.now() - t0 < ms) { const v = fn(); if (v) return v; await sleep(step); } return null; }
function myPlayer(c) { return c.state?.players?.find((p) => p.id === c.welcome?.id) || null; }

(async () => {
  // ===== Gom fixture truoc khi boot (server nap characters.json luc khoi dong) =====
  fixture('p317long01', { race: 'long', realm: 'kd', tier: 1, hp: 405 });
  fixture('p317dieu01', { race: 'dieu', realm: 'tc', tier: 1 });
  fixture('p317pham01', { realm: 'tc', tier: 1 });
  fixture('p317hoa001', { x: 1140, y: 2010 });
  fixture('p317hvcd01', { soul: { lives: 2, hoanVu: { learned: 1, lastUseYear: 0 } } });
  fixture('p317hv0001', { stones: 1000, soul: { lives: 3, fullLives: 1, hoanVu: { learned: 1, lastUseYear: -100000 } } });
  fixture('p317than01', { race: 'than', realm: 'kd', tier: 1 });
  fixture('p317hoa002', { race: 'hoa', realm: 'lk', tier: 1, hp: 4, x: 1140, y: 2010 });
  await startServer();
  // ===== Chân A: Long tộc — maxHp x1.35 + payload tộc =====
  let cA = await connect('p317long01');
  const wA = cA.welcome.character;
  check('A1 payload co raceName Long toc', wA.raceName === 'Long tộc' && wA.race === 'long', JSON.stringify({ r: wA.race, rn: wA.raceName }));
  check('A2 maxHp Long = 405 (300 x 1.35)', Math.abs((wA.maxHp || 0) - 405) <= 2, 'maxHp=' + wA.maxHp);
  // Long Tức: 5 đòn thường vào golem — chờ sự kiện skill_cast long_tuc
  await waitFor(() => myPlayer(cA) && (cA.state?.monsters || []).length > 0, 8000);
  const golem = () => (cA.state?.monsters || []).filter((m) => m.kind === 'golem' && m.hp > 0).sort((a, b) => Math.hypot(a.x - myPlayer(cA).x, a.y - myPlayer(cA).y) - Math.hypot(b.x - myPlayer(cA).x, b.y - myPlayer(cA).y))[0];
  for (let i = 0; i < 150 && !cA.casts.some((x) => x.skillId === 'long_tuc'); i++) {
    const me = myPlayer(cA); const g = golem(); if (!me || !g) { await sleep(300); continue; }
    const dx = g.x - me.x, dy = g.y - me.y, d = Math.hypot(dx, dy) || 1;
    if (d > 40) cA.socket.emit('client_input', { vx: dx / d, vy: dy / d });
    else { cA.socket.emit('client_input', { vx: 0, vy: 0 }); cA.socket.emit('player_attack', {}); await sleep(850); }
    await sleep(120);
  }
  cA.socket.emit('client_input', { vx: 0, vy: 0 });
  check('A3 Long Tuc phun o don thu 5', cA.casts.some((x) => x.skillId === 'long_tuc'), 'casts=' + cA.casts.map((x) => x.skillId).join(','));
  cA.socket.disconnect();

  // ===== Chân B: Điểu bay từ Trúc Cơ + đối chứng phàm nhân bị chặn =====
  let cB = await connect('p317dieu01');
  cB.socket.emit('fly_toggle', {});
  const fb = await waitFor(() => cB.flyStates.find((f) => f.on === true), 5000);
  check('B1 Dieu toc bay duoc o Truc Co', !!fb, JSON.stringify(cB.flyStates));
  cB.socket.disconnect();
  let cB2 = await connect('p317pham01');
  cB2.socket.emit('fly_toggle', {});
  await sleep(1200);
  check('B2 pham nhan Truc Co bi chan bay', cB2.flyStates.every((f) => f.on !== true) && cB2.errors.some((e) => e.includes('Kim Đan')), JSON.stringify(cB2.errors));
  cB2.socket.disconnect();

  // ===== Chân C: vật phẩm ẩn Hoa tộc tại cây cổ thụ =====
  let cC = await connect('p317hoa001');
  const gotRelic = await waitFor(() => { const sy = lastSync(cC); return sy?.soul?.relics?.some((e) => e.race === 'hoa') ? sy : null; }, 12000);
  check('C1 dung gan cay co thu -> nhan Xuan Sinh Chung', !!gotRelic, 'relics=' + JSON.stringify(lastSync(cC)?.soul?.relics || []));
  check('C2 co thong bao bao vat hien hinh', cC.notices.some((n) => n.includes('BẢO VẬT HIỆN HÌNH')), cC.notices.slice(-2).join(' | '));
  cC.socket.disconnect();

  // ===== Chân D: Hoán Vu — CD + dùng + chọn tộc ở Thiên Đạo Môn =====
  let cD0 = await connect('p317hvcd01');
  cD0.socket.emit('soul_use_hoanvu', {});
  await sleep(1200);
  check('D1 Hoan Vu dang hoi chieu -> bi chan', cD0.errors.some((e) => e.includes('năm nữa mới hồi')), JSON.stringify(cD0.errors));
  cD0.socket.disconnect();
  let cD = await connect('p317hv0001');
  cD.socket.emit('soul_use_hoanvu', {});
  const diedD = await waitFor(() => cD.died.find((d) => d.raceChoice === true), 8000);
  check('D2 dung Hoan Vu -> chet voi co chon toc', !!diedD, JSON.stringify(cD.died));
  cD.socket.disconnect();
  let cD2 = await connect('p317hv0001'); // hello lại -> need_character (đã chết)
  await sleep(600);
  cD2.socket.emit('create_character', { token: 'p317hv0001', name: 'P317HvNew', classId: 'kiemtu', gender: 'nam', robe: '#3a6ea5', weaponId: 'kiem', path: 'solo', race: 'long' });
  const wD = await waitFor(() => (cD2.welcome?.character?.race === 'long' ? cD2.welcome.character : null), 10000);
  check('D3 nhan vat moi mang toc Long', !!wD, JSON.stringify({ race: cD2.welcome?.character?.race }));
  if (wD) {
    const tot = Object.values(wD.stats || {}).reduce((a, b) => a + b, 0);
    check('D4 tong chi so goc = 148 (Long)', tot === 148, 'total=' + tot + ' stats=' + JSON.stringify(wD.stats));
    check('D5 tho = 180 (Long)', wD.lifespan === 180, 'lifespan=' + wD.lifespan);
    check('D6 linh thach ke thua 30% = 300', wD.stones === 300, 'stones=' + wD.stones);
    check('D7 lifeLog ghi 1 kiep path hoanvu', (wD.soul?.lifeLog || []).some((e) => e.path === 'hoanvu'), JSON.stringify(wD.soul?.lifeLog || []));
  }
  cD2.socket.disconnect();

  // ===== Chân E: Thần tộc bị cấm phe Ma =====
  let cE = await connect('p317than01');
  cE.socket.emit('branch_choose', { side: 'ma' });
  await sleep(1200);
  check('E1 Than toc chon phe Ma bi chan', cE.errors.some((e) => e.includes('Thần tộc')), JSON.stringify(cE.errors));
  cE.socket.emit('branch_choose', { side: 'tien' });
  const brOk = await waitFor(() => cE.results.branch?.ok === true, 5000);
  check('E2 Than toc chon phe Tien OK', !!brOk, JSON.stringify(cE.results.branch || {}));
  cE.socket.disconnect();

  // ===== Chân F: Hoa tộc Xuân Sinh — không gục ở đòn chí tử đầu tiên trong ngày =====
  let cF = await connect('p317hoa002');
  // đánh nhau với sói gần bãi farm: lái về phía sói gần nhất cho nó cắn tới khi Xuân Sinh kích hoạt hoặc gục
  const fT0 = Date.now(); let sprung = null;
  while (Date.now() - fT0 < 45000) {
    if (cF.notices.some((n) => n.includes('Xuân Phong Xuy Hựu Sinh'))) { sprung = myPlayer(cF); break; }
    const me = myPlayer(cF); if (!me) { await sleep(300); continue; }
    if (me.hp <= 0) break;
    const wolf = (cF.state?.monsters || []).filter((m) => m.kind === 'wolf' && m.hp > 0).sort((a, b) => Math.hypot(a.x - me.x, a.y - me.y) - Math.hypot(b.x - me.x, b.y - me.y))[0];
    if (wolf) { const dx = wolf.x - me.x, dy = wolf.y - me.y, d = Math.hypot(dx, dy) || 1; cF.socket.emit('client_input', { vx: d > 30 ? dx / d : 0, vy: d > 30 ? dy / d : 0 }); }
    await sleep(200);
  }
  cF.socket.emit('client_input', { vx: 0, vy: 0 });
  const meF = myPlayer(cF);
  check('F1 Xuan Sinh cuu Hoa toc khoi guc nga', !!sprung && !!meF && meF.hp > 0, 'hp=' + (meF?.hp ?? '?') + ' notices=' + cF.notices.filter((n) => n.includes('Xuân')).join(''));
  cF.socket.disconnect();

  await stopServer();
  const fails = results.filter((r) => !r.ok);
  console.log('TONG KET: ' + (results.length - fails.length) + '/' + results.length + ' PASS');
  process.exit(fails.length ? 1 : 0);
})().catch(async (e) => { console.error('LOI:', e.message); await stopServer(); process.exit(2); });
