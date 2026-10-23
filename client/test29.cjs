// TEST GĐ31 (bản cũ) → đã thay bằng kiểm tra CHUYỂN ĐỔI HỒ SƠ: nhân vật còn
// trạng thái lĩnh ngộ kiểu cũ {skillId, readyDay} (đếm ngày thụ động) khi vào
// game bản GĐ31-SỬA: quá hạn → trao chiêu luôn; chưa tới hạn → chuyển sang
// tiến độ phút 0 (học lại theo kiểu ngồi lĩnh ngộ). Cơ chế học mới nằm ở test30.
const { io } = require('socket.io-client');
const { spawn } = require('child_process');
const fs = require('fs');
const { createMerger } = require('./worldmerge.cjs');
const { makeSteer } = require('./steer.cjs');

const PORT = 3025;
const CHAR_FILE = '/tmp/chars-test29.json';
const ACC_FILE = '/tmp/acc-test29.json';
const WORLD_FILE = '/tmp/world-test29.json';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let pass = 0, fail = 0;
const ok = (cond, label) => { if (cond) { pass++; console.log('  PASS', label); } else { fail++; console.log('  FAIL', label); } };

async function startServer() {
  const proc = spawn('node', ['../server/index.js'], {
    cwd: __dirname,
    env: { ...process.env, PORT: String(PORT), TTT_CHAR_FILE: CHAR_FILE, TTT_ACC_FILE: ACC_FILE, TTT_WORLD_FILE: WORLD_FILE },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  proc.stderr.on('data', (d) => process.stderr.write('[srv] ' + d));
  for (let i = 0; i < 30; i++) {
    try { const r = await fetch(`http://localhost:${PORT}/api/status`); if (r.ok) return proc; } catch {}
    await sleep(400);
  }
  throw new Error('server không lên');
}
async function stopServer(proc) { if (!proc) return; proc.kill('SIGTERM'); await sleep(800); }
function patchChar(token, fn) {
  const data = JSON.parse(fs.readFileSync(CHAR_FILE, 'utf8'));
  fn(data[token]);
  fs.writeFileSync(CHAR_FILE, JSON.stringify(data, null, 1));
}
const waitEv = (s, ev, timeout = 8000) => new Promise((resolve, reject) => {
  const t = setTimeout(() => reject(new Error('timeout ' + ev)), timeout);
  s.once(ev, (d) => { clearTimeout(t); resolve(d); });
});
async function waitFor(fn, timeout, label) {
  const end = Date.now() + timeout;
  while (Date.now() < end) { if (fn()) return; await sleep(200); }
  throw new Error('waitFor timeout: ' + label);
}
function wire() {
  const s = io(`http://localhost:${PORT}`, { transports: ['websocket'] });
  const apply = createMerger();
  const S = { tick: null, char: null, learned: null };
  s.on('server_tick', (t) => { const snap = apply(t); if (snap) S.tick = snap; });
  s.on('char_sync', (c) => { S.char = c; });
  s.on('skill_learned', (d) => { S.learned = d.skill; });
  s.on('welcome', (w) => { if (w.character) S.char = w.character; });
  return { s, S };
}
const meOf = (S) => () => (S.tick ? S.tick.players.find((p) => p.name === S.char?.name) : null);
const hasSkill = (S, id) => (S.char?.skills || []).some((x) => (x.id || x) === id);

(async () => {
  fs.rmSync(CHAR_FILE, { force: true }); fs.rmSync(ACC_FILE, { force: true }); fs.rmSync(WORLD_FILE, { force: true });
  let proc = await startServer();
  try {
    const A = wire();
    await new Promise((r) => A.s.on('connect', r));
    const needP = waitEv(A.s, 'need_character');
    A.s.emit('hello', { token: 'tok-t29x' });
    await needP;
    A.s.emit('request_roll');
    await waitEv(A.s, 'roll_result');
    const welP = waitEv(A.s, 'welcome');
    A.s.emit('create_character', { token: 'tok-t29x', name: 'Học Trò', classId: 'phaptu' });
    await welP;
    await waitFor(() => !!A.S.tick, 6000, 'tick');
    const steerA = makeSteer(A.s, A.S, meOf(A.S));
    await steerA({ x: 700, y: 378 }, 50, 10000);
    A.s.emit('measure_linhcan');
    await waitFor(() => !!A.S.char.linhCan, 6000, 'đo linh căn');
    ok((A.S.char.skills || []).length === 2, 'Đo linh căn: nhận ngay 2 chiêu Cơ bản (phần khởi đầu)');
    A.s.disconnect(); await sleep(300);
    await stopServer(proc);

    console.log('== Chuyển đổi hồ sơ lĩnh ngộ kiểu cũ ==');
    // Quá hạn (readyDay 0) → vào game nhận chiêu luôn
    patchChar('tok-t29x', (c) => { c.learning = { skillId: 'phaptu_3', readyDay: 0 }; });
    proc = await startServer();
    const B = wire();
    await new Promise((r) => B.s.on('connect', r));
    const welB = waitEv(B.s, 'welcome');
    B.s.emit('hello', { token: 'tok-t29x' });
    await welB;
    await waitFor(() => hasSkill(B.S, 'phaptu_3'), 8000, 'nhận chiêu từ hồ sơ cũ quá hạn');
    ok(true, 'Hồ sơ cũ QUÁ HẠN → trao chiêu Luyện Khí ngay khi vào game');
    ok(B.S.char.learning === null, 'Trạng thái lĩnh ngộ cũ đã xóa');
    B.s.disconnect(); await sleep(300);
    await stopServer(proc);
    // Chưa tới hạn (readyDay rất xa) → chuyển sang tiến độ phút 0, chưa có chiêu TC
    patchChar('tok-t29x', (c) => { c.realm = 'tc'; c.tier = 1; c.learning = { skillId: 'phaptu_4', readyDay: 99999 }; });
    proc = await startServer();
    const C = wire();
    await new Promise((r) => C.s.on('connect', r));
    const welC = waitEv(C.s, 'welcome');
    C.s.emit('hello', { token: 'tok-t29x' });
    await welC;
    await waitFor(() => !!C.S.char.learning, 6000, 'trạng thái đã chuyển đổi');
    ok(C.S.char.learning.skillId === 'phaptu_4' && (C.S.char.learning.progressMin || 0) === 0, 'Hồ sơ cũ CHƯA tới hạn → chuyển sang tiến độ 0% (ngồi học lại theo luật mới)');
    ok(!hasSkill(C.S, 'phaptu_4'), 'Chưa học được chiêu TC');
    C.s.disconnect(); await sleep(300);
  } catch (e) {
    fail++;
    console.log('  FAIL (exception):', e.message);
  } finally {
    await stopServer(proc);
  }
  console.log(`\nTEST29: ${pass} PASS, ${fail} FAIL`);
  process.exit(fail ? 1 : 0);
})();
