// Test GĐ21+GĐ22: nghỉ offline + Tọa Thiền là CÔNG PHÁP TIỆN ÍCH phải kiếm học.
// - Đạo Quán KHÔNG còn dạy Tọa Thiền miễn phí (sự kiện cũ learn_meditation đã gỡ).
// - Học bằng SÁCH TỌA THIỀN (rơi từ sói; ở đây vá file cho có sách để test nhanh):
//   dùng sách khi đã có linh căn → học được, sách bị tiêu hao.
// - Thoát game: nhân vật tự về sân Đạo Quán; đã học thiền → ngồi thiền
//   (+3 Tu vi/ngày như bế quan); chưa học → ngủ (+0). Người khác nhìn thấy
//   bản offline với trường `rest` trong tick.
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const { io } = require('socket.io-client');
const { createMerger } = require('./worldmerge.cjs');
const { makeSteer } = require('./steer.cjs');
const URL = 'http://localhost:3010';
const CHAR_FILE = '/tmp/chars-test21.json';
const WORLD_FILE = '/tmp/world-test21.json';
const TOK_A = 'tok-test21-a-' + Date.now().toString(36);
const TOK_B = 'tok-test21-b-' + Date.now().toString(36);
let pass = 0, fail = 0;
const ok = (c, l) => { if (c) { pass++; console.log('  PASS', l); } else { fail++; console.log('  FAIL', l); } };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let serverProc = null;

async function startServer() {
  serverProc = spawn('node', ['server/index.js'], {
    cwd: path.join(__dirname, '..'),
    env: {
      ...process.env, PORT: '3010', TTT_TUVI_NEED: '1',
      TTT_CHAR_FILE: CHAR_FILE, TTT_ACC_FILE: '/tmp/acc-test21.json',
      TTT_DAY_REAL_MS: '6000', TTT_WORLD_FILE: WORLD_FILE, TTT_WORLD_START_MINUTES: '600',
    },
    stdio: 'ignore',
  });
  for (let i = 0; i < 40; i++) {
    try { const r = await fetch(URL + '/api/status'); if (r.ok) return; } catch { /* chưa lên */ }
    await sleep(400);
  }
  throw new Error('server test không lên');
}
async function stopServer() {
  if (serverProc) { serverProc.kill('SIGTERM'); serverProc = null; await sleep(700); }
}
async function statusWorld() {
  const r = await fetch(URL + '/api/status');
  return (await r.json()).world;
}
function patchChar(token, mut) {
  const data = JSON.parse(fs.readFileSync(CHAR_FILE, 'utf8'));
  const c = data[token];
  if (!c) throw new Error('không thấy nhân vật trong file');
  mut(c);
  fs.writeFileSync(CHAR_FILE, JSON.stringify(data, null, 1));
}
function connect() {
  return new Promise((resolve) => {
    const s = io(URL, { transports: ['websocket'] });
    s.on('connect', () => resolve(s));
  });
}
function waitEvent(s, ev, timeout = 12000) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('timeout chờ ' + ev)), timeout);
    s.once(ev, (d) => { clearTimeout(t); resolve(d); });
  });
}
async function waitFor(fn, timeout = 30000, label = '') {
  const t0 = Date.now();
  while (Date.now() - t0 < timeout) {
    const v = await fn();
    if (v) return v;
    await sleep(250);
  }
  throw new Error('waitFor timeout: ' + label);
}
function wire(s) {
  const apply = createMerger();
  const S = { tick: null, char: null };
  s.on('server_tick', (t) => { const snap = apply(t); if (snap) S.tick = snap; });
  s.on('char_sync', (c) => { S.char = c; });
  s.on('welcome', (w) => { if (w.character) S.char = w.character; });
  return S;
}
async function createChar(s, token, name) {
  const welP = waitEvent(s, 'welcome');
  s.emit('hello', { token });
  await waitEvent(s, 'need_character');
  s.emit('request_roll');
  await waitEvent(s, 'roll_result');
  s.emit('create_character', { token, name, classId: 'kiemtu', weaponId: 'kiem', robe: '#a8c8ec' });
  return welP;
}
const nearRestSpot = (p) => p && Math.abs(p.x - 700) <= 90 && p.y >= 420 && p.y <= 520;

async function main() {
  fs.rmSync(CHAR_FILE, { force: true });
  fs.rmSync(WORLD_FILE, { force: true });
  await startServer();

  // ---------- A: đo linh căn xong vẫn KHÔNG học được Tọa Thiền ở Đạo Quán ----------
  const sA = await connect();
  const SA = wire(sA);
  const welA = await createChar(sA, TOK_A, 'Thiền Tử');
  const meA = () => (SA.tick ? SA.tick.players.find((p) => p.id === welA.id) : null);
  const steerA = makeSteer(sA, SA, meA);
  ok(SA.char.meditation === false, 'Nhân vật mới: chưa học Tọa Thiền');
  await steerA({ x: 700, y: 420 }, 20);
  sA.emit('measure_linhcan');
  await waitFor(() => SA.char?.linhCan, 8000, 'đo linh căn');
  sA.emit('learn_meditation'); // sự kiện cũ của GĐ21 — server đã gỡ, phải không có tác dụng
  await sleep(800);
  ok(SA.char.meditation === false, 'Đạo Quán không còn dạy Tọa Thiền miễn phí (đúng chỉnh sửa GĐ22)');

  // ---------- A: kiếm được Sách Tọa Thiền → dùng sách để học ----------
  sA.disconnect();
  await stopServer();
  patchChar(TOK_A, (c) => { c.inventory = { ...(c.inventory || {}), sach_toa_thien: 1 }; });
  await startServer();
  const sA1 = await connect();
  const SA1 = wire(sA1);
  const welA1P = waitEvent(sA1, 'welcome');
  sA1.emit('hello', { token: TOK_A });
  const welA1 = await welA1P;
  ok((SA1.char.inventory?.sach_toa_thien || 0) === 1, 'Trong túi có Sách Tọa Thiền (kiếm được từ sói)');
  sA1.emit('use_item', { itemId: 'sach_toa_thien' });
  await waitEvent(sA1, 'meditation_learned');
  // meditation_learned bay tới trước char_sync — chờ bản đồng bộ mới nhất
  await waitFor(() => SA1.char?.meditation === true, 6000, 'char_sync báo đã học thiền');
  ok(true, 'Dùng sách → học được Tọa Thiền (công pháp tiện ích)');
  ok((SA1.char.inventory?.sach_toa_thien || 0) === 0, 'Sách bị tiêu hao sau khi học');
  const tuViA0 = SA1.char.tuVi;
  const meA1 = () => (SA1.tick ? SA1.tick.players.find((p) => p.id === welA1.id) : null);
  const steerA1 = makeSteer(sA1, SA1, meA1);
  await steerA1({ x: 1400, y: 300 }, 30);
  ok(!nearRestSpot(meA1()), 'Trước khi thoát: nhân vật đang ở bãi farm xa làng');
  sA1.disconnect();
  await sleep(700);

  // ---------- B (người quan sát) ----------
  const sB = await connect();
  const SB = wire(sB);
  const welB = await createChar(sB, TOK_B, 'Quan Sát Viên');
  const actorA = await waitFor(() => SB.tick?.players.find((p) => p.name === 'Thiền Tử'), 10000, 'thấy bản offline của A');
  ok(actorA.rest === 'meditate', `Bản offline của A: rest = ${actorA.rest} (ngồi thiền 🧘)`);
  ok(nearRestSpot(actorA), `Bản offline đã tự về sân Đạo Quán (${actorA.x}, ${actorA.y})`);

  const w0 = await statusWorld();
  await waitFor(async () => {
    const w = await statusWorld();
    return w.dayIndex >= w0.dayIndex + 1 ? w : null;
  }, 25000, 'qua thêm 1 ngày');
  const sA2 = await connect();
  const SA2 = wire(sA2);
  const welA2P = waitEvent(sA2, 'welcome');
  sA2.emit('hello', { token: TOK_A });
  const welA2 = await welA2P;
  const rsA = welA2.character.restSummary;
  ok(rsA && rsA.state === 'meditate' && rsA.days >= 1 && rsA.grant >= 3,
    `Tổng kết nghỉ của A: thiền ${rsA?.days} ngày, +${rsA?.grant} Tu vi`);
  ok(welA2.character.tuVi >= tuViA0 + (rsA?.grant || 0) && (rsA?.grant || 0) % 3 === 0,
    `Tu vi của A: ${welA2.character.tuVi} (gốc ${tuViA0} + thiền ${rsA?.grant}, đúng tỉ lệ +3/ngày)`);
  const actorA2 = await waitFor(() => {
    const list = (SB.tick?.players || []).filter((p) => p.name === 'Thiền Tử');
    return list.find((p) => !p.rest) || null;
  }, 8000, 'B thấy A trở lại');
  ok(!actorA2.rest, 'A online trở lại: hết trạng thái nghỉ');

  // ---------- B: chưa học Tọa Thiền → ngủ, không hấp thụ ----------
  const tuViB0 = SB.char.tuVi;
  sB.disconnect();
  await sleep(700);
  const actorB = await waitFor(() => SA2.tick?.players.find((p) => p.name === 'Quan Sát Viên'), 10000, 'thấy bản offline của B');
  ok(actorB.rest === 'sleep', `Bản offline của B: rest = ${actorB.rest} (ngủ 💤 — chưa học Tọa Thiền)`);
  ok(nearRestSpot(actorB), `Bản offline của B cũng về sân Đạo Quán (${actorB.x}, ${actorB.y})`);
  const w1 = await statusWorld();
  await waitFor(async () => {
    const w = await statusWorld();
    return w.dayIndex >= w1.dayIndex + 1 ? w : null;
  }, 25000, 'qua thêm 1 ngày nữa');
  const sB2 = await connect();
  const SB2 = wire(sB2);
  const welB2P = waitEvent(sB2, 'welcome');
  sB2.emit('hello', { token: TOK_B });
  const welB2 = await welB2P;
  const rsB = welB2.character.restSummary;
  ok(rsB && rsB.state === 'sleep' && rsB.grant === 0,
    `Tổng kết nghỉ của B: ngủ ${rsB?.days} ngày, +${rsB?.grant} Tu vi`);
  ok(welB2.character.tuVi === tuViB0, `Tu vi của B không đổi (${tuViB0}) — ngủ không hấp thụ linh khí`);
  sB2.disconnect();
  sA2.disconnect();
  await stopServer();

  console.log(`\nTEST21: ${pass} PASS, ${fail} FAIL`);
  process.exit(fail ? 1 : 0);
}

main().catch(async (e) => { console.error('TEST LỖI:', e.message); await stopServer(); process.exit(1); });
