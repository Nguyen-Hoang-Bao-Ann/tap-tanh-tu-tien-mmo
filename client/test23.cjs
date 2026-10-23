// Test GĐ23: BẾ QUAN chủ động tại Tụ Linh Trận (Thiền Phòng sau Đạo Quán).
// - Phải có linh căn + đứng trong trận mới bế quan được.
// - Đang bế quan: +1 Tu vi mỗi 480 phút game (= +3/ngày đúng file), và ngày
//   mới KHÔNG cộng thêm +1 thường (không trùng).
// - Di chuyển hoặc ra đòn là dừng bế quan.
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const { io } = require('socket.io-client');
const { createMerger } = require('./worldmerge.cjs');
const { makeSteer } = require('./steer.cjs');
const URL = 'http://localhost:3012';
const CHAR_FILE = '/tmp/chars-test23.json';
const WORLD_FILE = '/tmp/world-test23.json';
const TOK = 'tok-test23-' + Date.now().toString(36);
let pass = 0, fail = 0;
const ok = (c, l) => { if (c) { pass++; console.log('  PASS', l); } else { fail++; console.log('  FAIL', l); } };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let serverProc = null;

async function startServer() {
  serverProc = spawn('node', ['server/index.js'], {
    cwd: path.join(__dirname, '..'),
    env: {
      ...process.env, PORT: '3012', TTT_TUVI_NEED: '1',
      TTT_CHAR_FILE: CHAR_FILE, TTT_ACC_FILE: '/tmp/acc-test23.json',
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
async function worldAbsMin() {
  const r = await fetch(URL + '/api/status');
  const w = (await r.json()).world;
  return w.dayIndex * 1440 + w.minuteOfDay;
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
    await sleep(200);
  }
  throw new Error('waitFor timeout: ' + label);
}

async function main() {
  fs.rmSync(CHAR_FILE, { force: true });
  fs.rmSync(WORLD_FILE, { force: true });
  await startServer();
  const s = await connect();
  const apply = createMerger();
  const S = { tick: null, char: null };
  s.on('server_tick', (t) => { const snap = apply(t); if (snap) S.tick = snap; });
  s.on('char_sync', (c) => { S.char = c; });
  s.on('welcome', (w) => { if (w.character) S.char = w.character; });
  const welP = waitEvent(s, 'welcome');
  s.emit('hello', { token: TOK });
  await waitEvent(s, 'need_character');
  s.emit('request_roll');
  await waitEvent(s, 'roll_result');
  s.emit('create_character', { token: TOK, name: 'Bế Quan Giả', classId: 'kiemtu', weaponId: 'kiem', robe: '#a8c8ec' });
  const wel = await welP;
  const me = () => (S.tick ? S.tick.players.find((p) => p.id === wel.id) : null);
  const steer = makeSteer(s, S, me);

  // Chưa có linh căn → bế quan bị từ chối
  let err = null;
  s.once('interact_error', (d) => { err = d; });
  s.emit('toggle_bequan');
  await sleep(700);
  ok(!!err && S.char.bequan === false, 'Chưa có linh căn: bế quan bị từ chối');

  // Đo linh căn, rồi ra bãi farm thử bế quan → sai chỗ, bị từ chối
  await steer({ x: 700, y: 420 }, 20);
  s.emit('measure_linhcan');
  await waitFor(() => S.char?.linhCan, 8000, 'đo linh căn');
  await steer({ x: 1300, y: 300 }, 30);
  err = null;
  s.once('interact_error', (d) => { err = d; });
  s.emit('toggle_bequan');
  await sleep(700);
  ok(!!err && S.char.bequan === false, 'Đứng ngoài Tụ Linh Trận: bế quan bị từ chối');

  // Tới Thiền Phòng sau Đạo Quán (700,196) → bế quan thành công
  await steer({ x: 700, y: 205 }, 14, 45000);
  const mp = me();
  ok(mp && Math.hypot(mp.x - 700, mp.y - 196) <= 90, `Đã đứng trong Tụ Linh Trận (${mp?.x}, ${mp?.y})`);
  const stP = waitEvent(s, 'bequan_state');
  s.emit('toggle_bequan');
  const st = await stP;
  // bequan_state bay tới trước char_sync/tick — chờ bản đồng bộ mới nhất
  await waitFor(() => S.char?.bequan === true, 6000, 'char_sync báo đang bế quan');
  ok(st.on === true, 'Bế quan BẬT tại Tụ Linh Trận');
  const actorMe = () => S.tick?.players.find((p) => p.id === wel.id);
  const seenBequan = await waitFor(() => (actorMe()?.bequan === 1 ? actorMe() : null), 6000, 'tick có cờ bequan');
  ok(!!seenBequan, 'Tick phát trạng thái bequan cho người khác thấy');

  // Trôi đúng 1 ngày game trong lúc bế quan → kỳ vọng +3 (không +1 thường, không nhân đôi)
  const tuVi0 = S.char.tuVi;
  const w0 = await worldAbsMin();
  await waitFor(async () => (await worldAbsMin()) >= w0 + 1440, 20000, 'trôi 1 ngày game');
  await sleep(400);
  const delta = S.char.tuVi - tuVi0;
  ok(delta >= 2 && delta <= 4, `Bế quan 1 ngày game: +${delta} Tu vi (đúng tỉ lệ +3/ngày, dung sai biên ±1)`);
  ok(S.char.bequan === true, 'Vẫn đang bế quan sau 1 ngày (không tự hủy)');

  // Di chuyển → dừng bế quan
  const offP = waitEvent(s, 'bequan_state');
  s.emit('client_input', { vx: 1, vy: 0 });
  const off = await offP;
  ok(off.on === false, 'Di chuyển → dừng bế quan');
  s.emit('client_input', { vx: 0, vy: 0 });
  await waitFor(() => S.char?.bequan === false, 6000, 'char_sync hết bế quan');

  // Ra đòn cũng dừng bế quan
  const onP2 = waitEvent(s, 'bequan_state');
  s.emit('toggle_bequan');
  await onP2;
  const offP2 = waitEvent(s, 'bequan_state');
  s.emit('player_attack');
  const off2 = await offP2;
  ok(off2.on === false, 'Ra đòn → dừng bế quan');

  s.disconnect();
  await stopServer();
  console.log(`\nTEST23: ${pass} PASS, ${fail} FAIL`);
  process.exit(fail ? 1 : 0);
}

main().catch(async (e) => { console.error('TEST LỖI:', e.message); await stopServer(); process.exit(1); });
