// TEST GĐ37 — 2 BẢNG CÔNG PHÁP + Ô ĐA DỤNG:
// ô phụ chỉ chứa chiêu hỗ trợ, tung được bằng area 'util'; 2 bảng độc lập,
// đổi qua lại giữ nguyên sắp xếp; chiêu không lắp chéo 2 khu trong 1 bảng.
const { io } = require('socket.io-client');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const { createMerger } = require('./worldmerge.cjs');
const { makeSteer } = require('./steer.cjs');

const PORT = 3035;
const URL = `http://localhost:${PORT}`;
const CHAR_FILE = `/tmp/ttt-t34-chars.json`;
const WORLD_FILE = `/tmp/ttt-t34-world.json`;
let failures = 0;
function ok(cond, label) { console.log(`${cond ? 'PASS' : 'FAIL'}  ${label}`); if (!cond) failures++; }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function startServer() {
  const proc = spawn('node', ['../server/index.js'], {
    cwd: __dirname,
    env: { ...process.env, PORT: String(PORT), TTT_CHAR_FILE: CHAR_FILE, TTT_ACC_FILE: '/tmp/ttt-t34-acc.json', TTT_WORLD_FILE: WORLD_FILE, TTT_DAY_REAL_MS: '6000' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  proc.stderr.on('data', (d) => process.stderr.write('[srv] ' + d));
  for (let i = 0; i < 30; i++) {
    try { const r = await fetch(`${URL}/api/status`); if (r.ok) return proc; } catch {}
    await sleep(400);
  }
  throw new Error('server không lên');
}
async function stopServer(proc) { try { proc.kill('SIGKILL'); } catch {} await sleep(350); }
function patchChar(key, fn) {
  const chars = JSON.parse(fs.readFileSync(CHAR_FILE, 'utf8'));
  fn(chars[key]);
  fs.writeFileSync(CHAR_FILE, JSON.stringify(chars, null, 2));
}
function wire() {
  const s = io(URL, { transports: ['websocket'] });
  const apply = createMerger();
  const S = { tick: null, char: null, errors: [], casts: [] };
  s.on('server_tick', (t) => { const snap = apply(t); if (snap) S.tick = snap; });
  s.on('char_sync', (c) => { S.char = c; });
  s.on('welcome', (w) => { if (w.character) S.char = w.character; });
  s.on('interact_error', (e) => S.errors.push(e.message || ''));
  s.on('cast_result', (r) => S.casts.push(r));
  return { s, S };
}
const meOf = (S) => () => { const m = S.tick?.players.find((p) => p.name === S.char?.name); return m ? { x: m.x, y: m.y } : null; };
function waitEv(s, ev, ms = 6000) { return new Promise((res, rej) => { const t = setTimeout(() => rej(new Error('timeout ' + ev)), ms); s.once(ev, (d) => { clearTimeout(t); res(d); }); }); }
async function waitFor(fn, ms, label) { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (fn()) return true; await sleep(120); } throw new Error('waitFor: ' + label); }
const CO1 = 'thetu_taykhong_co1'; // Liên Hoàn Quyền — KHÔNG phải chiêu hỗ trợ
const CO2 = 'thetu_taykhong_co2'; // Hộ Thể Công — hỗ trợ (giảm sát thương + phản)
const LU1 = 'thetu_taykhong_lu1'; // Kim Cương Bất Hoại — hỗ trợ (giảm 40%)

(async () => {
  fs.rmSync(CHAR_FILE, { force: true }); fs.rmSync(WORLD_FILE, { force: true });
  let proc = await startServer();
  const A = wire();
  await new Promise((r) => A.s.on('connect', r));
  const needP = waitEv(A.s, 'need_character');
  A.s.emit('hello', { token: 'tok-t34x' });
  await needP;
  A.s.emit('request_roll');
  await waitEv(A.s, 'roll_result');
  const welP = waitEv(A.s, 'welcome');
  A.s.emit('create_character', { token: 'tok-t34x', name: 'Bảng Chiêu', classId: 'thetu' });
  await welP;
  await waitFor(() => !!A.S.tick, 6000, 'tick');
  const steerA = makeSteer(A.s, A.S, meOf(A.S));
  await steerA({ x: 700, y: 378 }, 50, 10000);
  A.s.emit('measure_linhcan');
  await waitFor(() => !!A.S.char.linhCan, 6000, 'đo linh căn');
  ok(A.S.char.activeBoard === 0 && (A.S.char.utilSkills || []).length === 0, 'Ban đầu: Bảng 1, ô đa dụng trống');
  A.s.disconnect(); await sleep(300);
  await stopServer(proc);
  patchChar('tok-t34x', (c) => { for (const k of Object.keys(c.stats)) c.stats[k] = 40; });
  proc = await startServer();

  const B = wire();
  await new Promise((r) => B.s.on('connect', r));
  B.s.emit('hello', { token: 'tok-t34x' });
  await waitFor(() => !!B.S.char?.linhCan, 6000, 'vào lại');
  const cat = () => B.S.char.catalog || [];
  // Tháo Hộ Thể Công khỏi ô chính → lắp vào ô đa dụng
  B.s.emit('unequip_skill', { skillId: CO2, area: 'main' });
  await waitFor(() => (B.S.char.skills || []).length === 1, 5000, 'tháo co2 ô chính');
  B.s.emit('equip_skill', { skillId: CO2, area: 'util' });
  await waitFor(() => (B.S.char.utilSkills || []).some((k) => k.id === CO2), 5000, 'lắp co2 ô phụ');
  ok(cat().find((e) => e.id === CO2)?.equippedUtil === true, 'Hộ Thể Công nằm ở ô đa dụng của Bảng 1');
  // Tung chiêu từ ô đa dụng
  const steerB = makeSteer(B.s, B.S, meOf(B.S));
  await steerB({ x: 180, y: 1020 }, 60, 15000);
  await waitFor(() => (B.S.tick?.monsters || []).some((m) => m.kind === 'wolf'), 8000, 'có sói');
  const wolf = (B.S.tick.monsters || []).find((m) => m.kind === 'wolf');
  await steerB(() => { const w = (B.S.tick?.monsters || []).find((m) => m.id === wolf.id); return w ? { x: w.x, y: w.y } : null; }, 34, 12000);
  B.S.casts.length = 0;
  B.s.emit('cast_skill', { slot: 0, area: 'util' });
  await waitFor(() => B.S.casts.length > 0, 5000, 'cast util');
  ok(B.S.casts[0].ok === true && B.S.casts[0].area === 'util' && B.S.casts[0].skillId === CO2, 'Tung chiêu từ ô đa dụng → trúng');
  // Chiêu thuần công không vào được ô đa dụng
  B.s.emit('unequip_skill', { skillId: CO1, area: 'main' });
  await waitFor(() => (B.S.char.skills || []).length === 0, 5000, 'tháo co1');
  B.S.errors.length = 0;
  B.s.emit('equip_skill', { skillId: CO1, area: 'util' });
  await sleep(600);
  ok(B.S.errors.some((m) => m.includes('Ô đa dụng chỉ chứa')), 'Chiêu thuần công lắp ô đa dụng → bị từ chối');
  B.s.emit('equip_skill', { skillId: CO1, area: 'main' });
  await waitFor(() => (B.S.char.skills || []).length === 1, 5000, 'lắp lại co1');
  // Bảng 2 độc lập
  B.s.emit('switch_board', { board: 1 });
  await waitFor(() => B.S.char.activeBoard === 1, 5000, 'sang bảng 2');
  ok((B.S.char.skills || []).length === 2 && (B.S.char.utilSkills || []).length === 0, 'Bảng 2 khởi đầu là BẢN SAO của Bảng 1 (2 chiêu Cơ bản) để tùy chỉnh tiếp');
  B.s.emit('unequip_skill', { skillId: CO1, area: 'main' });
  await waitFor(() => (B.S.char.skills || []).length === 1, 5000, 'bảng 2 tháo co1 — độc lập với bảng 1');
  B.s.emit('switch_board', { board: 0 });
  await waitFor(() => B.S.char.activeBoard === 0, 5000, 'về bảng 1');
  ok((B.S.char.skills || []).map((k) => k.id).join() === CO1 && (B.S.char.utilSkills || []).map((k) => k.id).join() === CO2, 'Về Bảng 1: sắp xếp cũ nguyên vẹn (chính: Liên Hoàn Quyền · phụ: Hộ Thể Công)');
  // Học Kim Cương Bất Hoại → tự lắp ô chính Bảng 1; lắp chéo sang ô phụ bị chặn
  await steerB({ x: 700, y: 378 }, 50, 12000);
  B.s.emit('learn_skill', { skillId: LU1 });
  await waitFor(() => cat().some((e) => e.id === LU1 && e.learned), 20000, 'học xong lu1');
  ok((B.S.char.skills || []).some((k) => k.id === LU1), 'Chiêu mới học tự lắp ô chính Bảng 1');
  B.S.errors.length = 0;
  B.s.emit('equip_skill', { skillId: LU1, area: 'util' });
  await sleep(600);
  ok(B.S.errors.some((m) => m.includes('đang lắp ở ô chính')), 'Chiêu đang ở ô chính lắp thêm ô phụ → bị chặn');
  B.s.disconnect(); await sleep(300);
  await stopServer(proc);

  // Đăng nhập lại: bảng + sắp xếp còn nguyên
  proc = await startServer();
  const C = wire();
  await new Promise((r) => C.s.on('connect', r));
  C.s.emit('hello', { token: 'tok-t34x' });
  await waitFor(() => !!C.S.char, 6000, 'vào C');
  ok(C.S.char.activeBoard === 0 && C.S.char.boardsInfo?.[0]?.main === 2 && C.S.char.boardsInfo?.[0]?.util === 1 && C.S.char.boardsInfo?.[1]?.main === 1 && C.S.char.boardsInfo?.[1]?.util === 0,
    `Lưu bền: Bảng 1 (2 chính · 1 phụ), Bảng 2 (1 chính) — thực tế ${JSON.stringify(C.S.char.boardsInfo)}`);
  C.s.disconnect(); await sleep(300);
  await stopServer(proc);

  console.log(failures === 0 ? 'TEST34: ALL PASS' : `TEST34: ${failures} FAIL`);
  process.exit(failures ? 1 : 0);
})().catch(async (e) => { console.error('ERR', e.message); process.exit(1); });
