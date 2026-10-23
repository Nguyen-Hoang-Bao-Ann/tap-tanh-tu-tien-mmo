// TEST GĐ39 — HỆ THỐNG RƯƠNG:
// hạ quái rơi rương theo phẩm (ép phẩm qua env để kiểm định lượng);
// tới gần là mở, đồ vào túi; số mục theo phẩm (C 1–2, A 3–4);
// rương chưa mở hết hạn thì biến mất.
const { io } = require('socket.io-client');
const { spawn } = require('child_process');
const fs = require('fs');
const { createMerger } = require('./worldmerge.cjs');
const { makeSteer } = require('./steer.cjs');

const PORT = 3043;
const URL = `http://localhost:${PORT}`;
const CHAR_FILE = `/tmp/ttt-t36-chars.json`;
const WORLD_FILE = `/tmp/ttt-t36-world.json`;
let failures = 0;
function ok(cond, label) { console.log(`${cond ? 'PASS' : 'FAIL'}  ${label}`); if (!cond) failures++; }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function startServer(extraEnv = {}) {
  const proc = spawn('node', ['../server/index.js'], {
    cwd: __dirname,
    env: { ...process.env, PORT: String(PORT), TTT_CHAR_FILE: CHAR_FILE, TTT_ACC_FILE: '/tmp/ttt-t36-acc.json', TTT_WORLD_FILE: WORLD_FILE, TTT_DAY_REAL_MS: '6000', ...extraEnv },
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
  const S = { tick: null, char: null, opened: [] };
  s.on('server_tick', (t) => { const snap = apply(t); if (snap) S.tick = snap; });
  s.on('char_sync', (c) => { S.char = c; });
  s.on('welcome', (w) => { if (w.character) S.char = w.character; });
  s.on('chest_opened', (d) => S.opened.push(d));
  return { s, S };
}
const meOf = (S) => () => { const m = S.tick?.players.find((p) => p.name === S.char?.name); return m ? { x: m.x, y: m.y } : null; };
function waitEv(s, ev, ms = 6000) { return new Promise((res, rej) => { const t = setTimeout(() => rej(new Error('timeout ' + ev)), ms); s.once(ev, (d) => { clearTimeout(t); res(d); }); }); }
async function waitFor(fn, ms, label) { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (fn()) return true; await sleep(120); } throw new Error('waitFor: ' + label); }
const invSum = (c) => Object.values(c?.inventory || {}).reduce((a, b) => a + b, 0);

(async () => {
  fs.rmSync(CHAR_FILE, { force: true }); fs.rmSync(WORLD_FILE, { force: true });
  // --- Pha 1: ép rương C ---
  let proc = await startServer({ TTT_CHEST_FORCE_GRADE: 'C' });
  const A = wire();
  await new Promise((r) => A.s.on('connect', r));
  const needP = waitEv(A.s, 'need_character');
  A.s.emit('hello', { token: 'tok-t36x' });
  await needP;
  A.s.emit('request_roll');
  await waitEv(A.s, 'roll_result');
  const welP = waitEv(A.s, 'welcome');
  A.s.emit('create_character', { token: 'tok-t36x', name: 'Mở Rương', classId: 'phaptu' });
  await welP;
  await waitFor(() => !!A.S.tick, 6000, 'tick');
  ok(Array.isArray(A.S.tick.chests), 'Snapshot có mảng rương');
  const steerA = makeSteer(A.s, A.S, meOf(A.S));
  await steerA({ x: 700, y: 378 }, 50, 10000);
  A.s.emit('measure_linhcan');
  await waitFor(() => !!A.S.char.linhCan, 6000, 'đo linh căn');
  A.s.disconnect(); await sleep(300);
  await stopServer(proc);
  patchChar('tok-t36x', (c) => { for (const k of Object.keys(c.stats)) c.stats[k] = 40; });
  proc = await startServer({ TTT_CHEST_FORCE_GRADE: 'C' });

  const B = wire();
  await new Promise((r) => B.s.on('connect', r));
  B.s.emit('hello', { token: 'tok-t36x' });
  await waitFor(() => !!B.S.char?.linhCan, 6000, 'vào lại');
  const steerB = makeSteer(B.s, B.S, meOf(B.S));
  async function killMonster(id, timeoutMs = 40000) {
    const t0 = Date.now();
    while (Date.now() - t0 < timeoutMs) {
      if (!(B.S.tick?.monsters || []).some((m) => m.id === id)) return true;
      await steerB(() => { const t = (B.S.tick?.monsters || []).find((m) => m.id === id); return t ? { x: t.x, y: t.y } : null; }, 30, 6000, true);
      await sleep(200);
    }
    return false;
  }
  const wealth0 = (B.S.char.stones || 0) + invSum(B.S.char);
  const wolf = (B.S.tick.monsters || []).find((m) => m.kind === 'wolf');
  ok(await killMonster(wolf.id), 'Hạ sói (pha rương C)');
  await waitFor(() => B.S.opened.length > 0, 8000, 'mở rương C');
  const oc = B.S.opened[0];
  ok(oc.grade === 'C' && oc.loot.length >= 1 && oc.loot.length <= 2, `Rương C mở: ${oc.loot.length} mục (đúng khung 1–2) — ${oc.loot.join(', ')}`);
  await waitFor(() => (B.S.char.stones || 0) + invSum(B.S.char) > wealth0, 5000, 'nhận đồ rương C');
  ok((B.S.tick.chests || []).length === 0, 'Rương đã mở biến khỏi bản đồ');
  B.s.disconnect(); await sleep(300);
  await stopServer(proc);

  // --- Pha 2: ép rương A từ Thạch Quái ---
  proc = await startServer({ TTT_CHEST_FORCE_GRADE: 'A' });
  const C = wire();
  await new Promise((r) => C.s.on('connect', r));
  C.s.emit('hello', { token: 'tok-t36x' });
  await waitFor(() => !!C.S.char?.linhCan, 6000, 'vào C');
  const steerC = makeSteer(C.s, C.S, meOf(C.S));
  async function killMonsterC(id, timeoutMs = 60000) {
    const t0 = Date.now();
    while (Date.now() - t0 < timeoutMs) {
      if (!(C.S.tick?.monsters || []).some((m) => m.id === id)) return true;
      await steerC(() => { const t = (C.S.tick?.monsters || []).find((m) => m.id === id); return t ? { x: t.x, y: t.y } : null; }, 30, 6000, true);
      await sleep(200);
    }
    return false;
  }
  const golem = (C.S.tick.monsters || []).find((m) => m.kind === 'golem');
  ok(await killMonsterC(golem.id), 'Hạ Thạch Quái (pha rương A)');
  await waitFor(() => C.S.opened.length > 0, 8000, 'mở rương A');
  const oa = C.S.opened[0];
  ok(oa.grade === 'A' && oa.loot.length >= 3 && oa.loot.length <= 4, `Rương A mở: ${oa.loot.length} mục (đúng khung 3–4) — ${oa.loot.join(', ')}`);
  C.s.disconnect(); await sleep(300);
  await stopServer(proc);

  // --- Pha 3: rương hết hạn (TTL 1,5s), bắn từ xa không tới gần ---
  proc = await startServer({ TTT_CHEST_FORCE_GRADE: 'C', TTT_CHEST_TTL_MS: '1500' });
  const D = wire();
  await new Promise((r) => D.s.on('connect', r));
  D.s.emit('hello', { token: 'tok-t36x' });
  await waitFor(() => !!D.S.char?.linhCan, 6000, 'vào D');
  const steerD = makeSteer(D.s, D.S, meOf(D.S));
  const wolf2 = (D.S.tick.monsters || []).find((m) => m.kind === 'wolf');
  // Tới cách sói ~115px rồi bắn thường từ xa (pháp tu tầm 150) — không bước vào vùng mở rương
  await steerD(() => { const t = (D.S.tick?.monsters || []).find((m) => m.id === wolf2.id); return t ? { x: t.x, y: t.y } : null; }, 115, 15000);
  const t0 = Date.now();
  let sawChest = false;
  while (Date.now() - t0 < 30000) {
    if ((D.S.tick?.monsters || []).some((m) => m.id === wolf2.id)) D.s.emit('player_attack');
    if ((D.S.tick?.chests || []).length > 0) { sawChest = true; break; }
    if (!(D.S.tick?.monsters || []).some((m) => m.id === wolf2.id) && sawChest) break;
    await sleep(250);
  }
  ok(sawChest, 'Rương hiện trên bản đồ sau khi hạ quái từ xa');
  await sleep(2600);
  ok((D.S.tick?.chests || []).length === 0 && D.S.opened.length === 0, 'Rương chưa mở tự biến mất sau hạn 120s (test rút còn 1,5s)');
  D.s.disconnect(); await sleep(300);
  await stopServer(proc);

  console.log(failures === 0 ? 'TEST36: ALL PASS' : `TEST36: ${failures} FAIL`);
  process.exit(failures ? 1 : 0);
})().catch(async (e) => { console.error('ERR', e.message); process.exit(1); });
