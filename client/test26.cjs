// Test GĐ26: NGHỀ PHỤ cơ bản.
// - Học nghề cần linh căn; mỗi nhân vật 1 nghề.
// - Chế tạo trừ đúng nguyên liệu + LT; thành công ra sản phẩm + đếm lượt;
//   công thức cấp 2 bị khóa khi cấp nghề chưa đủ.
// - Dùng sản phẩm nghề (Phù Hộ Thân hồi máu) chạy thật.
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const { io } = require('socket.io-client');
const { createMerger } = require('./worldmerge.cjs');
const { makeSteer } = require('./steer.cjs');
const URL = 'http://localhost:3018';
const CHAR_FILE = '/tmp/chars-test26.json';
const WORLD_FILE = '/tmp/world-test26.json';
const TOK = 'tok-test26-' + Date.now().toString(36);
let pass = 0, fail = 0;
const ok = (c, l) => { if (c) { pass++; console.log('  PASS', l); } else { fail++; console.log('  FAIL', l); } };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let serverProc = null;

async function startServer() {
  serverProc = spawn('node', ['server/index.js'], {
    cwd: path.join(__dirname, '..'),
    env: { ...process.env, PORT: '3018', TTT_CHAR_FILE: CHAR_FILE, TTT_ACC_FILE: '/tmp/acc-test26.json', TTT_WORLD_FILE: WORLD_FILE },
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
  s.emit('create_character', { token: TOK, name: 'Thợ Nghề Tử', classId: 'kiemtu', weaponId: 'kiem', robe: '#a8c8ec' });
  const wel = await welP;
  const me = () => (S.tick ? S.tick.players.find((p) => p.id === wel.id) : null);
  const steer = makeSteer(s, S, me);

  // Chưa có linh căn → học nghề bị từ chối
  let err = null;
  s.once('interact_error', (d) => { err = d; });
  s.emit('learn_job', { jobId: 'phusu' });
  await sleep(700);
  ok(!!err && !S.char.job, 'Chưa có linh căn: học nghề bị từ chối');

  // Đo linh căn → học Phù Sư; học nghề thứ hai bị chặn
  await steer({ x: 700, y: 420 }, 20);
  s.emit('measure_linhcan');
  await waitFor(() => S.char?.linhCan, 8000, 'đo linh căn');
  s.emit('learn_job', { jobId: 'phusu' });
  await waitFor(() => S.char?.job?.jobId === 'phusu', 8000, 'học Phù Sư');
  ok(S.char.job.rank === 1 && S.char.job.rankName === 'Nhập môn', 'Học Phù Sư: cấp Nhập môn');
  err = null;
  s.once('interact_error', (d) => { err = d; });
  s.emit('learn_job', { jobId: 'dansu' });
  await sleep(700);
  ok(!!err && S.char.job.jobId === 'phusu', 'Học nghề thứ hai: bị chặn (1 người 1 nghề)');

  // Công thức cấp 2 (Phù Tụ Linh) bị khóa ở cấp 1
  err = null;
  s.once('interact_error', (d) => { err = d; });
  s.emit('craft_item', { recipeId: 'rc_phu_tu_linh' });
  await sleep(700);
  ok(!!err && /cấp/.test(err.message || ''), `Công thức cấp 2 bị khóa ở cấp 1 (${err?.message || ''})`);

  // Vá nguyên liệu rồi chế Phù Hộ Thân tới khi thành công (tỉ lệ 80%)
  s.disconnect();
  await stopServer();
  patchChar((c) => { c.inventory = { nanh_soi: 40 }; c.stones = 200; });
  await startServer();
  const s2 = await connect();
  const S2 = wire(s2);
  const wel2P = waitEvent(s2, 'welcome');
  s2.emit('hello', { token: TOK });
  await wel2P;
  let tries = 0;
  while (tries < 10 && !(S2.char?.inventory?.phu_ho_than > 0)) {
    const nanh0 = S2.char.inventory.nanh_soi;
    const st0 = S2.char.stones;
    const resP = waitEvent(s2, 'craft_result', 6000);
    s2.emit('craft_item', { recipeId: 'rc_phu_ho_than' });
    const res = await resP;
    tries++;
    // craft_result bay tới trước char_sync — chờ bản đồng bộ mới nhất rồi mới đo
    await waitFor(() => S2.char.inventory.nanh_soi === nanh0 - 3, 5000, 'char_sync sau chế');
    ok(S2.char.stones === st0 - 8,
      `Lần chế ${tries}: trừ đúng 3 Nanh Sói + 8 LT (${res.ok ? 'thành công' : 'thất bại'})`);
    if (res.ok) break;
  }
  ok((S2.char.inventory?.phu_ho_than || 0) >= 1, 'Chế thành công: có Phù Hộ Thân trong túi');
  ok((S2.char.job?.crafts || 0) >= 1, `Lượt chế thành công đã đếm (${S2.char.job.crafts})`);
  const achCraft = (S2.char.achievements || []).find((a) => a.id === 'ach_craft50');
  ok((achCraft?.progress || 0) >= 1, `Bộ đếm thành tựu crafts cũng tăng (tiến độ ach_craft50 = ${achCraft?.progress})`);

  // Bị sói cắn tụt máu rồi dùng Phù Hộ Thân hồi 40%
  // (HP trực tiếp đọc ở tick — char_sync không phát khi bị cắn)
  const me2 = () => (S2.tick ? S2.tick.players.find((p) => p.name === 'Thợ Nghề Tử') : null);
  const steer2 = makeSteer(s2, S2, me2);
  const hpMax = S2.char.maxHp;
  const deadline = Date.now() + 90000;
  while (Date.now() < deadline && (me2()?.hp ?? hpMax) > hpMax - 30) {
    const wolf = S2.tick?.monsters.find((m) => m.kind === 'wolf');
    if (!wolf) { await sleep(400); continue; }
    await steer2(() => {
      const t = S2.tick?.monsters.find((m) => m.id === wolf.id);
      const mp = me2();
      return t ? { x: t.x, y: t.y } : (mp ? { x: mp.x, y: mp.y } : { x: 700, y: 560 });
    }, 30, 5000).catch(() => {});
    await sleep(600);
  }
  const hpBefore = me2()?.hp ?? S2.char.hp;
  ok(hpBefore < hpMax, `Đã bị sói cắn tụt máu (${hpBefore}/${hpMax})`);
  s2.emit('use_item', { itemId: 'phu_ho_than' });
  // Chờ đúng bản char_sync CỦA LẦN DÙNG NÀY (phù về 0) — tránh đọc payload cũ
  await waitFor(() => (S2.char.inventory?.phu_ho_than || 0) === 0, 8000, 'phù tiêu hao trong char_sync');
  ok(S2.char.hp >= Math.min(hpMax, hpBefore + Math.round(hpMax * 0.4)) - 12 && S2.char.hp <= hpMax,
    `Dùng Phù Hộ Thân: hồi ~40% HP (${hpBefore} → ${S2.char.hp}/${hpMax})`);
  ok(true, 'Phù đã tiêu hao sau khi dùng');

  s2.disconnect();
  await stopServer();
  console.log(`\nTEST26: ${pass} PASS, ${fail} FAIL`);
  process.exit(fail ? 1 : 0);
}

main().catch(async (e) => { console.error('TEST LỖI:', e.message); await stopServer(); process.exit(1); });
