// TEST GĐ32: danh mục công pháp (lớp × vũ khí) + điều kiện học theo file +
// học offline (thoát game → về chỗ an toàn học tiếp, xong báo khi đăng nhập).
const { io } = require('socket.io-client');
const { spawn } = require('child_process');
const fs = require('fs');
const { createMerger } = require('./worldmerge.cjs');
const { makeSteer } = require('./steer.cjs');

const PORT = 3029;
const CHAR_FILE = '/tmp/chars-test31.json';
const ACC_FILE = '/tmp/acc-test31.json';
const WORLD_FILE = '/tmp/world-test31.json';
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
function patchWorld(fn) {
  const w = fs.existsSync(WORLD_FILE) ? JSON.parse(fs.readFileSync(WORLD_FILE, 'utf8')) : { totalMinutes: 480 };
  fn(w);
  w.savedAt = Date.now();
  fs.writeFileSync(WORLD_FILE, JSON.stringify(w, null, 1));
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
  const S = { tick: null, char: null, errors: [], learned: null, notices: [] };
  s.on('server_tick', (t) => { const snap = apply(t); if (snap) S.tick = snap; });
  s.on('char_sync', (c) => { S.char = c; });
  s.on('interact_error', (e) => S.errors.push(e.message || ''));
  s.on('skill_learned', (d) => { S.learned = d.skill; });
  s.on('notice', (d) => S.notices.push(d.text || ''));
  s.on('welcome', (w) => { if (w.character) S.char = w.character; });
  return { s, S };
}
const meOf = (S) => () => (S.tick ? S.tick.players.find((p) => p.name === S.char?.name) : null);
// GĐ36: payload skills = ô đã lắp; "đã học" phải kiểm qua catalog.learned
const hasSkill = (S, id) => (S.char?.catalog || []).some((e) => e.id === id && e.learned) || (S.char?.skills || []).some((x) => (x.id || x) === id);

(async () => {
  fs.rmSync(CHAR_FILE, { force: true }); fs.rmSync(ACC_FILE, { force: true }); fs.rmSync(WORLD_FILE, { force: true });
  let proc = await startServer();
  try {
    const A = wire();
    await new Promise((r) => A.s.on('connect', r));
    const needP = waitEv(A.s, 'need_character');
    A.s.emit('hello', { token: 'tok-t31x' });
    await needP;
    A.s.emit('request_roll');
    await waitEv(A.s, 'roll_result');
    const welP = waitEv(A.s, 'welcome');
    A.s.emit('create_character', { token: 'tok-t31x', name: 'Pháp Sinh', classId: 'phaptu' });
    await welP;
    await waitFor(() => !!A.S.tick, 6000, 'tick');
    const steerA = makeSteer(A.s, A.S, meOf(A.S));
    await steerA({ x: 700, y: 378 }, 50, 10000);
    A.s.emit('measure_linhcan');
    await waitFor(() => !!A.S.char.linhCan, 6000, 'đo linh căn');
    A.s.disconnect(); await sleep(300);
    await stopServer(proc);
    // Chỉ số cao → đủ mọi điều kiện học LK theo file (1 chỉ số 15–30 / 2 chỉ số 15–20)
    patchChar('tok-t31x', (c) => { for (const k of Object.keys(c.stats)) c.stats[k] = 40; });
    proc = await startServer();

    console.log('== Danh mục công pháp + điều kiện học ==');
    const B = wire();
    await new Promise((r) => B.s.on('connect', r));
    const welB = waitEv(B.s, 'welcome');
    B.s.emit('hello', { token: 'tok-t31x' });
    await welB;
    await waitFor(() => !!B.S.tick, 6000, 'tick');
    const cat = B.S.char.catalog || [];
    ok(cat.length === 19, `Danh mục có 19 chiêu (2 lớp + 2 CB + 10 LK + 5 TC của vũ khí) — thực tế ${cat.length}`);
    const lk1 = cat.find((e) => e.id === 'phaptu_phien_lu1');
    ok(!!lk1 && lk1.condMet === true, `Chiêu vũ khí LK1 đủ điều kiện (cần: ${lk1?.condText})`);
    ok(cat.filter((e) => e.tier === 'trucco').every((e) => e.condMet === false), 'Chiêu TC bị khóa khi chưa đạt Trúc Cơ');
    ok(lk1.name === 'Ngũ Khí Phiến' && lk1.cost === Math.round(50 * 1.2), `Dữ liệu thật từ file: Ngũ Khí Phiến, chân nguyên gốc 50 × hệ số Pháp tu 1.2 = ${lk1.cost}`);
    B.S.errors.length = 0;
    B.s.emit('learn_skill', { skillId: 'phaptu_phien_tr1' });
    await sleep(600);
    ok(B.S.errors.some((m) => m.includes('Trúc Cơ')), 'Học chiêu TC khi Luyện Khí → bị chặn');
    B.S.errors.length = 0;
    B.s.emit('learn_skill', { skillId: 'phaptu_phien_lu1' }); // đang ở quảng trường
    await sleep(600);
    ok(B.S.errors.some((m) => m.includes('Đạo Quán')), 'Học chiêu LK ngoài Đạo Quán → bị chặn');
    const steerB = makeSteer(B.s, B.S, meOf(B.S));
    await steerB({ x: 700, y: 378 }, 50, 10000);
    B.s.emit('learn_skill', { skillId: 'phaptu_phien_lu1' });
    await waitFor(() => B.S.char.learning?.active === true, 6000, 'ngồi học chiêu danh mục');
    ok(B.S.char.learning.skillId === 'phaptu_phien_lu1', 'Đang lĩnh ngộ chiêu theo vũ khí');
    ok(B.S.char.learning.needMin < 720, `Lĩnh hội theo Thần thức 40: cần ${B.S.char.learning.needMin} phút (< 720 gốc nửa ngày)`);
    await waitFor(() => hasSkill(B.S, 'phaptu_phien_lu1'), 20000, 'học xong lk1');
    ok(true, 'Học xong chiêu danh mục LK1');

    console.log('== Thoát game → học tiếp offline ở nơi an toàn ==');
    B.s.emit('learn_skill', { skillId: 'phaptu_phien_lu2' });
    await waitFor(() => B.S.char.learning?.active === true, 6000, 'ngồi học lk2');
    B.s.disconnect(); await sleep(600);
    await stopServer(proc);
    const rec = JSON.parse(fs.readFileSync(CHAR_FILE, 'utf8'))['tok-t31x'];
    ok(rec.restState === 'learn', `Thoát game khi đang học → trạng thái nghỉ là 'learn' (thực tế: ${rec.restState})`);
    ok(rec.learning && rec.learning.skillId === 'phaptu_phien_lu2', 'Tiến độ học được giữ trong hồ sơ');
    patchWorld((w) => { w.totalMinutes += 2880; }); // +2 ngày game lúc server tắt
    proc = await startServer();
    const C = wire();
    await new Promise((r) => C.s.on('connect', r));
    const welC = waitEv(C.s, 'welcome');
    C.s.emit('hello', { token: 'tok-t31x' });
    await welC;
    await waitFor(() => hasSkill(C.S, 'phaptu_phien_lu2'), 8000, 'học xong offline');
    ok(true, 'Vào lại: chiêu LK2 đã học xong trong lúc offline');
    ok(C.S.char.learning === null, 'Trạng thái lĩnh ngộ đã hoàn tất');
    ok(C.S.notices.some((t) => t.includes('vắng mặt')), 'Có thông báo học xong lúc vắng mặt');
    ok(C.S.learned?.id === 'phaptu_phien_lu2', 'Sự kiện skill_learned phát khi đăng nhập');
    C.s.disconnect(); await sleep(300);
  } catch (e) {
    fail++;
    console.log('  FAIL (exception):', e.message);
  } finally {
    await stopServer(proc);
  }
  console.log(`\nTEST31: ${pass} PASS, ${fail} FAIL`);
  process.exit(fail ? 1 : 0);
})();
