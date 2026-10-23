// TEST GĐ31-SỬA: NGỒI LĨNH NGỘ công pháp.
// - Chiêu Luyện Khí: chỉ học ở Đạo Quán, ngồi yên tiến độ chạy (1 ngày game).
// - Di chuyển → dừng, GIỮ tiến độ. Học tiếp được đến khi hoàn tất.
// - Chiêu Trúc Cơ: học ở MỌI NƠI; BỊ SÓI CẮN → tiến độ VỀ 0, phải học lại.
// Server test: ngày game 6 giây (TTT_DAY_REAL_MS=6000) → LK ≈ 6s, TC ≈ 18s ngồi.
const { io } = require('socket.io-client');
const { spawn } = require('child_process');
const fs = require('fs');
const { createMerger } = require('./worldmerge.cjs');
const { makeSteer } = require('./steer.cjs');

const PORT = 3027;
const CHAR_FILE = '/tmp/chars-test30.json';
const ACC_FILE = '/tmp/acc-test30.json';
const WORLD_FILE = '/tmp/world-test30.json';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let pass = 0, fail = 0;
const ok = (cond, label) => { if (cond) { pass++; console.log('  PASS', label); } else { fail++; console.log('  FAIL', label); } };

async function startServer() {
  const proc = spawn('node', ['../server/index.js'], {
    cwd: __dirname,
    env: { ...process.env, PORT: String(PORT), TTT_CHAR_FILE: CHAR_FILE, TTT_ACC_FILE: ACC_FILE, TTT_WORLD_FILE: WORLD_FILE, TTT_DAY_REAL_MS: '6000' },
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
  while (Date.now() < end) { if (fn()) return true; await sleep(200); }
  throw new Error('waitFor timeout: ' + label);
}
function wire() {
  const s = io(`http://localhost:${PORT}`, { transports: ['websocket'] });
  const apply = createMerger();
  const S = { tick: null, char: null, errors: [], learned: null };
  s.on('server_tick', (t) => { const snap = apply(t); if (snap) S.tick = snap; });
  s.on('char_sync', (c) => { S.char = c; });
  s.on('interact_error', (e) => S.errors.push(e.message || ''));
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
    A.s.emit('hello', { token: 'tok-t30x' });
    await needP;
    A.s.emit('request_roll');
    await waitEv(A.s, 'roll_result');
    const welP = waitEv(A.s, 'welcome');
    A.s.emit('create_character', { token: 'tok-t30x', name: 'Đạo Sinh', classId: 'kiemtu' });
    await welP;
    await waitFor(() => !!A.S.tick, 6000, 'tick');
    const steerA = makeSteer(A.s, A.S, meOf(A.S));
    await steerA({ x: 700, y: 378 }, 50, 10000);
    A.s.emit('measure_linhcan');
    await waitFor(() => !!A.S.char.linhCan, 6000, 'đo linh căn');
    A.s.disconnect(); await sleep(300);
    await stopServer(proc);
    patchChar('tok-t30x', (c) => { c.tier = 3; });
    proc = await startServer();

    console.log('== LK: chỉ học ở Đạo Quán + ngồi yên mới chạy tiến độ ==');
    const B = wire();
    await new Promise((r) => B.s.on('connect', r));
    const welB = waitEv(B.s, 'welcome');
    B.s.emit('hello', { token: 'tok-t30x' });
    await welB;
    await waitFor(() => !!B.S.tick, 6000, 'tick');
    ok((B.S.char.catalog || []).some((e) => e.id === 'kiemtu_3' && e.condMet === true), 'Danh mục báo chiêu LK sẵn sàng học');
    B.S.errors.length = 0;
    B.s.emit('learn_skill'); // đang ở quảng trường — xa Đạo Quán
    await sleep(600);
    ok(B.S.errors.some((m) => m.includes('Đạo Quán')), 'Học chiêu LK ở quảng trường → bị từ chối (phải đến Đạo Quán)');
    ok(!B.S.char.learning, 'Chưa bắt đầu lĩnh ngộ');
    const steerB = makeSteer(B.s, B.S, meOf(B.S));
    await steerB({ x: 700, y: 378 }, 50, 10000);
    B.s.emit('learn_skill');
    await waitFor(() => B.S.char.learning?.active === true, 6000, 'ngồi học tại Đạo Quán');
    ok(B.S.char.learning.skillId === 'kiemtu_3', 'Đang lĩnh ngộ Ngự Kiếm Quyết');
    await sleep(2500);
    const prog1 = B.S.char.learning?.progressMin || 0;
    ok(prog1 > 0 && !hasSkill(B.S, 'kiemtu_3'), `Ngồi yên: tiến độ chạy (${Math.floor(prog1)} phút game), chưa xong`);
    // Di chuyển → phá buổi, tiến độ VỀ 0 (luật GĐ32: tự dừng cũng về 0)
    await steerB({ x: 760, y: 420 }, 30, 6000);
    await sleep(400);
    ok(B.S.char.learning && B.S.char.learning.active === false, 'Di chuyển → dừng buổi học');
    ok((B.S.char.learning?.progressMin || 0) === 0, 'Tiến độ VỀ 0 khi tự ý di chuyển (học lại từ đầu)');
    // Học tiếp đến hoàn tất
    await steerB({ x: 700, y: 378 }, 50, 10000);
    B.s.emit('learn_skill');
    await waitFor(() => hasSkill(B.S, 'kiemtu_3'), 20000, 'lĩnh ngộ hoàn tất');
    ok(true, 'Học tiếp → hoàn tất Ngự Kiếm Quyết');
    ok(B.S.char.learning === null, 'Xóa trạng thái lĩnh ngộ sau khi xong');
    ok(B.S.learned?.id === 'kiemtu_3', 'Sự kiện skill_learned phát khi hoàn tất');
    B.s.disconnect(); await sleep(300);
    await stopServer(proc);
    patchChar('tok-t30x', (c) => { c.realm = 'tc'; c.tier = 1; });
    proc = await startServer();

    console.log('== TC: học mọi nơi + bị quái cắn là VỀ 0 ==');
    const C = wire();
    await new Promise((r) => C.s.on('connect', r));
    const welC = waitEv(C.s, 'welcome');
    C.s.emit('hello', { token: 'tok-t30x' });
    await welC;
    await waitFor(() => !!C.S.tick, 6000, 'tick');
    ok((C.S.char.catalog || []).some((e) => e.id === 'kiemtu_4' && e.tier === 'trucco' && e.condMet === true), 'Danh mục báo chiêu TC (Thiên Kiếm Vô Song) đủ điều kiện');
    const steerC = makeSteer(C.s, C.S, meOf(C.S));
    C.s.emit('learn_skill'); // ngay tại quảng trường
    await waitFor(() => C.S.char.learning?.active === true, 6000, 'ngồi học TC ở quảng trường');
    ok(C.S.char.learning.skillId === 'kiemtu_4', 'Chiêu TC học được ở mọi nơi (không cần Đạo Quán)');
    C.s.emit('learn_skill'); // bấm nữa = dừng → về 0 (GĐ32)
    await sleep(500);
    ok(C.S.char.learning?.active === false && (C.S.char.learning?.progressMin || 0) === 0, 'Bấm dừng giữa chừng → tiến độ về 0');
    // Ra bãi farm, ngồi học cạnh sói → bị cắn → về 0
    const wolfOf = () => (C.S.tick.monsters || []).find((m) => m.kind === 'wolf');
    await waitFor(() => !!wolfOf(), 6000, 'có sói trên map');
    await steerC(() => { const w = wolfOf(); return w ? { x: w.x, y: w.y } : { x: 1300, y: 900 }; }, 55, 15000);
    C.s.emit('learn_skill');
    await waitFor(() => C.S.char.learning?.active === true, 6000, 'ngồi học ở bãi farm');
    await sleep(1200);
    const progFarm = C.S.char.learning?.progressMin || 0;
    // Sói áp sát rất nhanh: hoặc tiến độ đã chạy, hoặc nó đã cắn trước khi kịp đo
    ok(progFarm > 0 || C.S.char.learning?.active === false, `Ngồi học ở bãi farm (tiến độ đo được ${Math.floor(progFarm)} phút game, hoặc sói đã cắn trước)`);
    await waitFor(() => C.S.char.learning && C.S.char.learning.active === false && (C.S.char.learning.progressMin || 0) === 0, 12000, 'bị sói cắn → về 0');
    ok(true, 'BỊ SÓI CẮN → văng khỏi lĩnh ngộ, tiến độ VỀ 0 (học lại từ đầu)');
    // Về nơi an toàn học lại từ đầu đến xong (TC = 3 ngày game ≈ 18s test)
    await steerC({ x: 700, y: 560 }, 40, 15000);
    C.s.emit('learn_skill');
    await waitFor(() => hasSkill(C.S, 'kiemtu_4'), 40000, 'học TC hoàn tất');
    ok(true, 'Học lại từ đầu ở nơi an toàn → hoàn tất Thiên Kiếm Vô Song');
    C.s.disconnect(); await sleep(300);
  } catch (e) {
    fail++;
    console.log('  FAIL (exception):', e.message);
  } finally {
    await stopServer(proc);
  }
  console.log(`\nTEST30: ${pass} PASS, ${fail} FAIL`);
  process.exit(fail ? 1 : 0);
})();
