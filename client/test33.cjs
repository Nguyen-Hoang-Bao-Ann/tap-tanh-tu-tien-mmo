// TEST GĐ36 — Ô CÔNG PHÁP theo file, kiểu A (lắp/tháo thủ công trong panel):
// LK 3 ô (tầng 7+ → 4); chỉ chiêu ĐANG LẮP mới tung được; học thêm khi ô
// đầy → chiêu nằm chờ; tháo ra lắp chiêu khác vào; lên tầng 7 → mở ô 4.
const { io } = require('socket.io-client');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const { createMerger } = require('./worldmerge.cjs');
const { makeSteer } = require('./steer.cjs');

const PORT = 3033;
const URL = `http://localhost:${PORT}`;
const CHAR_FILE = `/tmp/ttt-t33-chars.json`;
const WORLD_FILE = `/tmp/ttt-t33-world.json`;
let failures = 0;
function ok(cond, label) { console.log(`${cond ? 'PASS' : 'FAIL'}  ${label}`); if (!cond) failures++; }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function startServer() {
  const proc = spawn('node', ['../server/index.js'], {
    cwd: __dirname,
    env: { ...process.env, PORT: String(PORT), TTT_CHAR_FILE: CHAR_FILE, TTT_ACC_FILE: '/tmp/ttt-t33-acc.json', TTT_WORLD_FILE: WORLD_FILE, TTT_DAY_REAL_MS: '6000' },
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
const equippedIds = (S) => (S.char?.skills || []).map((k) => k.id);
const learnedIds = (S) => (S.char?.catalog || []).filter((e) => e.learned).map((e) => e.id);

(async () => {
  fs.rmSync(CHAR_FILE, { force: true }); fs.rmSync(WORLD_FILE, { force: true });
  let proc = await startServer();
  const A = wire();
  await new Promise((r) => A.s.on('connect', r));
  const needP = waitEv(A.s, 'need_character');
  A.s.emit('hello', { token: 'tok-t33x' });
  await needP;
  A.s.emit('request_roll');
  await waitEv(A.s, 'roll_result');
  const welP = waitEv(A.s, 'welcome');
  A.s.emit('create_character', { token: 'tok-t33x', name: 'Ô Chiêu', classId: 'thetu' });
  await welP;
  await waitFor(() => !!A.S.tick, 6000, 'tick');
  const steerA = makeSteer(A.s, A.S, meOf(A.S));
  await steerA({ x: 700, y: 378 }, 50, 10000);
  A.s.emit('measure_linhcan');
  await waitFor(() => !!A.S.char.linhCan, 6000, 'đo linh căn');
  ok(A.S.char.skillSlots?.max === 3 && A.S.char.skillSlots?.used === 2, `Luyện Khí 1: 3 ô, 2 chiêu Cơ bản tự lắp (used/max = ${A.S.char.skillSlots?.used}/${A.S.char.skillSlots?.max})`);
  ok(equippedIds(A.S).length === 2, 'Thanh chiêu = đúng 2 chiêu đang lắp');
  A.s.disconnect(); await sleep(300);
  await stopServer(proc);
  patchChar('tok-t33x', (c) => { for (const k of Object.keys(c.stats)) c.stats[k] = 40; });
  proc = await startServer();

  const B = wire();
  await new Promise((r) => B.s.on('connect', r));
  B.s.emit('hello', { token: 'tok-t33x' });
  await waitFor(() => !!B.S.char?.linhCan, 6000, 'vào lại');
  const steerB = makeSteer(B.s, B.S, meOf(B.S));
  await steerB({ x: 700, y: 378 }, 50, 10000);
  // Học LK1 (Kim Cương Bất Hoại) → ô còn trống → tự lắp, đủ 3/3
  B.s.emit('learn_skill', { skillId: 'thetu_taykhong_lu1' });
  await waitFor(() => learnedIds(B.S).includes('thetu_taykhong_lu1'), 20000, 'học xong lu1');
  ok(B.S.char.skillSlots.used === 3 && equippedIds(B.S).includes('thetu_taykhong_lu1'), 'Học chiêu LK thứ 3 → tự lắp vào ô cuối (3/3)');
  // Học LK2 (Tinh Cương Quyền) → ô đầy → nằm chờ, chưa lắp
  B.s.emit('learn_skill', { skillId: 'thetu_taykhong_lu2' });
  await waitFor(() => learnedIds(B.S).includes('thetu_taykhong_lu2'), 20000, 'học xong lu2');
  const eLu2 = (B.S.char.catalog || []).find((e) => e.id === 'thetu_taykhong_lu2');
  ok(B.S.char.skillSlots.used === 3 && eLu2.learned && !eLu2.equipped, 'Ô đầy: chiêu mới học nằm chờ (learned ✓, equipped ✗)');
  // Lắp khi đầy → bị từ chối
  B.S.errors.length = 0;
  B.s.emit('equip_skill', { skillId: 'thetu_taykhong_lu2' });
  await sleep(600);
  ok(B.S.errors.some((m) => m.includes('đầy')), 'Lắp thêm khi ô đầy → bị từ chối');
  // Tháo LK1 → lắp LK2 vào được
  B.s.emit('unequip_skill', { skillId: 'thetu_taykhong_lu1' });
  await waitFor(() => B.S.char.skillSlots.used === 2, 5000, 'tháo lu1');
  B.s.emit('equip_skill', { skillId: 'thetu_taykhong_lu2' });
  await waitFor(() => equippedIds(B.S).includes('thetu_taykhong_lu2'), 5000, 'lắp lu2');
  ok(true, 'Tháo chiêu cũ → lắp chiêu chờ vào ô thành công');
  // Ô trống ở giữa: slot 2 giờ là lu2. Tung thử ở bãi farm
  await steerB({ x: 180, y: 1020 }, 60, 15000);
  await waitFor(() => (B.S.tick?.monsters || []).some((m) => m.kind === 'wolf'), 8000, 'có sói');
  const wolf = (B.S.tick.monsters || []).find((m) => m.kind === 'wolf');
  await steerB(() => { const w = (B.S.tick?.monsters || []).find((m) => m.id === wolf.id); return w ? { x: w.x, y: w.y } : null; }, 34, 12000);
  B.S.casts.length = 0;
  B.s.emit('cast_skill', { slot: 2 }); // ô 3 = Tinh Cương Quyền vừa lắp
  await waitFor(() => B.S.casts.length > 0, 5000, 'cast_result');
  ok(B.S.casts[0].ok === true && B.S.casts[0].skillId === 'thetu_taykhong_lu2', 'Tung chiêu vừa lắp ở ô 3 → trúng');
  // Tháo hết ô 3 rồi tung slot 2 → không có chiêu
  B.s.emit('unequip_skill', { skillId: 'thetu_taykhong_lu2' });
  await waitFor(() => B.S.char.skillSlots.used === 2, 5000, 'tháo lu2');
  B.S.casts.length = 0;
  B.s.emit('cast_skill', { slot: 2 });
  await sleep(700);
  ok(B.S.casts.length === 0, 'Ô trống → tung chiêu không có tác dụng (không cast_result)');
  B.s.disconnect(); await sleep(300);
  await stopServer(proc);

  // Lên Luyện Khí tầng 7 → mở ô thứ 4
  patchChar('tok-t33x', (c) => { c.tier = 7; });
  proc = await startServer();
  const C = wire();
  await new Promise((r) => C.s.on('connect', r));
  C.s.emit('hello', { token: 'tok-t33x' });
  await waitFor(() => !!C.S.char, 6000, 'vào C');
  ok(C.S.char.skillSlots?.max === 4, `Luyện Khí tầng 7 → tối đa 4 ô (max = ${C.S.char.skillSlots?.max})`);
  C.s.emit('equip_skill', { skillId: 'thetu_taykhong_lu1' });
  await waitFor(() => (C.S.char.skillSlots?.used || 0) === 3, 5000, 'lắp ô 3');
  C.s.emit('equip_skill', { skillId: 'thetu_taykhong_lu2' });
  await waitFor(() => (C.S.char.skillSlots?.used || 0) === 4, 5000, 'lắp ô 4');
  ok(true, 'Lắp đủ 4 chiêu vào 4 ô ở tầng 7');
  C.s.disconnect(); await sleep(300);
  await stopServer(proc);

  console.log(failures === 0 ? 'TEST33: ALL PASS' : `TEST33: ${failures} FAIL`);
  process.exit(failures ? 1 : 0);
})().catch(async (e) => { console.error('ERR', e.message); process.exit(1); });
