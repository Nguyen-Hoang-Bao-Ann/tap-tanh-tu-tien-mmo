// Test GĐ25: HẾT THỌ → TỌA HÓA theo phương án B (người chơi chốt):
// - Thọ ≤ 0 → ÂN HẠN 30 ngày game bắt đầu khi đăng nhập (graceDaysLeft = 30).
// - Trong ân hạn, thọ dương trở lại (đột phá cộng thọ) → ân hạn HỦY (được cứu).
// - Qua 30 ngày ân hạn mà thọ vẫn ≤ 0 → TỌA HÓA vĩnh viễn: character_died,
//   hồ sơ ghi dead, vào lại chỉ nhận need_character, tạo nhân vật mới được.
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const { io } = require('socket.io-client');
const { createMerger } = require('./worldmerge.cjs');
const URL = 'http://localhost:3017';
const CHAR_FILE = '/tmp/chars-test25.json';
const WORLD_FILE = '/tmp/world-test25.json';
const TOK = 'tok-test25-' + Date.now().toString(36);
let pass = 0, fail = 0;
const ok = (c, l) => { if (c) { pass++; console.log('  PASS', l); } else { fail++; console.log('  FAIL', l); } };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let serverProc = null;

async function startServer() {
  serverProc = spawn('node', ['server/index.js'], {
    cwd: path.join(__dirname, '..'),
    env: { ...process.env, PORT: '3017', TTT_CHAR_FILE: CHAR_FILE, TTT_ACC_FILE: '/tmp/acc-test25.json', TTT_WORLD_FILE: WORLD_FILE },
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
let cachedDayIndex = 0;
async function dayIndexNow() {
  try {
    const r = await fetch(URL + '/api/status');
    cachedDayIndex = (await r.json()).world.dayIndex;
  } catch { /* server đang tắt → dùng giá trị đã biết */ }
  return cachedDayIndex;
}
function patchChar(mut, tok = TOK) {
  const data = JSON.parse(fs.readFileSync(CHAR_FILE, 'utf8'));
  mut(data[tok]);
  fs.writeFileSync(CHAR_FILE, JSON.stringify(data, null, 1));
}
function readChar(tok = TOK) {
  return JSON.parse(fs.readFileSync(CHAR_FILE, 'utf8'))[tok];
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
function wire(s) {
  const apply = createMerger();
  const S = { tick: null, char: null };
  s.on('server_tick', (t) => { const snap = apply(t); if (snap) S.tick = snap; });
  s.on('char_sync', (c) => { S.char = c; });
  s.on('welcome', (w) => { if (w.character) S.char = w.character; });
  return S;
}
async function createChar(tok, name) {
  const s = await connect();
  const S = wire(s);
  const welP = waitEvent(s, 'welcome');
  s.emit('hello', { token: tok });
  await waitEvent(s, 'need_character');
  s.emit('request_roll');
  await waitEvent(s, 'roll_result');
  s.emit('create_character', { token: tok, name, classId: 'kiemtu', weaponId: 'kiem', robe: '#a8c8ec' });
  await welP;
  return { s, S };
}

async function main() {
  fs.rmSync(CHAR_FILE, { force: true });
  fs.rmSync(WORLD_FILE, { force: true });
  await startServer();
  const { s } = await createChar(TOK, 'Thọ Tận Tử');
  const day0 = await dayIndexNow();
  s.disconnect();
  await stopServer();

  // Vá: tuổi 20, thọ 20, sinh đúng ngày đầu thế giới → thọ vừa tận (left = 0)
  patchChar((c) => { c.ageStart = 20; c.lifespan = 20; c.birthDay = day0; });
  await startServer();
  const s2 = await connect();
  const S2 = wire(s2);
  let graceEvt = null;
  s2.on('lifespan_grace', (d) => { graceEvt = d; });
  const wel2P = waitEvent(s2, 'welcome');
  s2.emit('hello', { token: TOK });
  const wel2 = await wel2P;
  ok(!!wel2.character, 'Thọ vừa tận: vẫn vào game được (ân hạn, chưa chết)');
  ok(wel2.character.graceDaysLeft === 30, `Ân hạn bắt đầu: còn ${wel2.character.graceDaysLeft} ngày game`);
  ok(!!graceEvt && graceEvt.graceDaysLeft === 30, 'Nhận sự kiện lifespan_grace khi đăng nhập');
  ok(!readChar().dead, 'Hồ sơ chưa ghi dead');
  s2.disconnect();
  await stopServer();

  // Vá: thọ được cộng thêm (mô phỏng đột phá cứu) → đăng nhập lại: ân hạn hủy
  patchChar((c) => { c.lifespan = 35; });
  await startServer();
  const s3 = await connect();
  wire(s3);
  const wel3P = waitEvent(s3, 'welcome');
  s3.emit('hello', { token: TOK });
  const wel3 = await wel3P;
  ok(wel3.character.graceDaysLeft === null, 'Thọ dương trở lại → ân hạn HỦY (được cứu)');
  ok(readChar().graceStartDay === null, 'File đã xóa mốc ân hạn');
  s3.disconnect();
  await stopServer();

  // Vá lại thọ tận + ân hạn bắt đầu từ 31 ngày trước → TỌA HÓA
  patchChar((c) => { c.lifespan = 20; c.graceStartDay = day0 - 31; });
  await startServer();
  const s4 = await connect();
  wire(s4);
  const diedP = waitEvent(s4, 'character_died');
  s4.emit('hello', { token: TOK });
  const died = await diedP;
  ok(/TỌA HÓA/.test(died.message || ''), `Qua ân hạn: nhận character_died (${(died.message || '').slice(0, 40)}...)`);
  ok(readChar().dead === true, 'Hồ sơ đã ghi dead (tọa hóa vĩnh viễn)');
  // Tạo nhân vật mới trên cùng token → được (đè hồ sơ cũ)
  s4.emit('request_roll');
  await waitEvent(s4, 'roll_result');
  const wel4P = waitEvent(s4, 'welcome');
  s4.emit('create_character', { token: TOK, name: 'Kiếp Mới Tử', classId: 'phaptu', robe: '#f3d9e8' });
  const wel4 = await wel4P;
  ok(wel4.character.name === 'Kiếp Mới Tử' && !readChar().dead, 'Tạo nhân vật mới sau tọa hóa: thành công, hồ sơ sống lại');
  s4.disconnect();
  await stopServer();

  console.log(`\nTEST25: ${pass} PASS, ${fail} FAIL`);
  process.exit(fail ? 1 : 0);
}

main().catch(async (e) => { console.error('TEST LỖI:', e.message); await stopServer(); process.exit(1); });
