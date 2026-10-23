// Test GĐ27: THÀNH TỰU CƠ BẢN.
// - Payload có danh sách thành tựu với tiến độ thật.
// - Đạt mốc → claim_achievement cộng đúng Linh thạch thưởng; nhận trùng không cộng nữa.
// - Chưa đạt mốc thì bị từ chối.
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const { io } = require('socket.io-client');
const { createMerger } = require('./worldmerge.cjs');
const { makeSteer } = require('./steer.cjs');
const URL = 'http://localhost:3019';
const CHAR_FILE = '/tmp/chars-test27.json';
const WORLD_FILE = '/tmp/world-test27.json';
const TOK = 'tok-test27-' + Date.now().toString(36);
let pass = 0, fail = 0;
const ok = (c, l) => { if (c) { pass++; console.log('  PASS', l); } else { fail++; console.log('  FAIL', l); } };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let serverProc = null;

async function startServer() {
  serverProc = spawn('node', ['server/index.js'], {
    cwd: path.join(__dirname, '..'),
    env: { ...process.env, PORT: '3019', TTT_CHAR_FILE: CHAR_FILE, TTT_ACC_FILE: '/tmp/acc-test27.json', TTT_WORLD_FILE: WORLD_FILE },
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
function patchChar(mut) {
  const data = JSON.parse(fs.readFileSync(CHAR_FILE, 'utf8'));
  mut(data[TOK]);
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
    await sleep(200);
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
const achOf = (S, id) => (S.char?.achievements || []).find((a) => a.id === id);

async function main() {
  fs.rmSync(CHAR_FILE, { force: true });
  fs.rmSync(WORLD_FILE, { force: true });
  await startServer();
  const s = await connect();
  const S = wire(s);
  const welP = waitEvent(s, 'welcome');
  s.emit('hello', { token: TOK });
  await waitEvent(s, 'need_character');
  s.emit('request_roll');
  await waitEvent(s, 'roll_result');
  s.emit('create_character', { token: TOK, name: 'Thành Tựu Tử', classId: 'kiemtu', weaponId: 'kiem', robe: '#a8c8ec' });
  const wel = await welP;
  ok((S.char.achievements || []).length === 10, 'Payload có đủ 10 thành tựu cơ bản');
  ok(achOf(S, 'ach_lk1')?.done === false, 'Phàm nhân: thành tựu Luyện Khí chưa đạt');

  // Nhận mốc chưa đạt → bị từ chối
  let err = null;
  s.once('interact_error', (d) => { err = d; });
  s.emit('claim_achievement', { achId: 'ach_wolf50' });
  await sleep(700);
  ok(!!err, 'Nhận thưởng mốc chưa đạt: bị từ chối');

  // Đo linh căn → ach_lk1 đạt → nhận +20 LT; nhận lại lần nữa không cộng
  const me = () => (S.tick ? S.tick.players.find((p) => p.id === wel.id) : null);
  const steer = makeSteer(s, S, me);
  await steer({ x: 700, y: 420 }, 20);
  s.emit('measure_linhcan');
  await waitFor(() => S.char?.linhCan, 8000, 'đo linh căn');
  await waitFor(() => achOf(S, 'ach_lk1')?.done === true, 8000, 'ach_lk1 đạt');
  ok(true, 'Đạt Luyện Khí → thành tựu “Sơ Nhập Tiên Đồ” sáng');
  const st0 = S.char.stones;
  s.emit('claim_achievement', { achId: 'ach_lk1' });
  await waitFor(() => achOf(S, 'ach_lk1')?.claimed === true, 8000, 'nhận thưởng ach_lk1');
  ok(S.char.stones === st0 + 20, `Nhận thưởng ach_lk1: +20 LT (${st0} → ${S.char.stones})`);
  const st1 = S.char.stones;
  s.emit('claim_achievement', { achId: 'ach_lk1' });
  await sleep(700);
  ok(S.char.stones === st1, 'Nhận trùng thành tựu: không cộng thêm');

  // Vá số liệu tích lũy → nhiều mốc đạt cùng lúc
  s.disconnect();
  await stopServer();
  patchChar((c) => {
    c.counters = { wolfKills: 50, crafts: 50, questsDone: 10, breakthroughs: 1, totalTuVi: 300, bequanMin: 1500 };
    c.stones = 500;
  });
  await startServer();
  const s2 = await connect();
  const S2 = wire(s2);
  const wel2P = waitEvent(s2, 'welcome');
  s2.emit('hello', { token: TOK });
  await wel2P;
  for (const id of ['ach_wolf50', 'ach_craft50', 'ach_quest10', 'ach_break1', 'ach_rich', 'ach_bequan']) {
    ok(achOf(S2, id)?.done === true, `Mốc ${id} đạt theo số liệu thật (tiến độ ${achOf(S2, id)?.progress}/${achOf(S2, id)?.target})`);
  }
  const stA = S2.char.stones;
  s2.emit('claim_achievement', { achId: 'ach_wolf50' });
  await waitFor(() => achOf(S2, 'ach_wolf50')?.claimed === true, 8000, 'nhận ach_wolf50');
  ok(S2.char.stones === stA + 50, `Nhận thưởng ach_wolf50: +50 LT (${stA} → ${S2.char.stones})`);
  ok(achOf(S2, 'ach_wolf200')?.done === false && achOf(S2, 'ach_wolf200')?.progress === 50, 'Mốc 200 sói: tiến độ 50/200, chưa đạt');

  s2.disconnect();
  await stopServer();
  console.log(`\nTEST27: ${pass} PASS, ${fail} FAIL`);
  process.exit(fail ? 1 : 0);
}

main().catch(async (e) => { console.error('TEST LỖI:', e.message); await stopServer(); process.exit(1); });
