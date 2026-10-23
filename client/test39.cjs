// TEST KHÓI ĐA NGƯỜI CHƠI (chuẩn bị buổi bạn bè test):
// 3 client thật cùng vào 1 thế giới — thấy nhau trong snapshot; A hạ sói
// thì B thấy sói biến mất; rương A làm rơi, B mở được (cộng đồng); quái
// đối đầu của A không bị B kết liễu cướp công (nhiệm vụ của A vẫn nguyên).
const { io } = require('socket.io-client');
const { spawn } = require('child_process');
const fs = require('fs');
const { createMerger } = require('./worldmerge.cjs');
const { makeSteer } = require('./steer.cjs');

const PORT = 3053;
const URL = `http://localhost:${PORT}`;
const CHAR_FILE = `/tmp/ttt-t39-chars.json`;
const WORLD_FILE = `/tmp/ttt-t39-world.json`;
let failures = 0;
function ok(cond, label) { console.log(`${cond ? 'PASS' : 'FAIL'}  ${label}`); if (!cond) failures++; }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function startServer() {
  fs.writeFileSync(WORLD_FILE, JSON.stringify({ totalMinutes: 4 * 1440 + 600, savedAt: Date.now() }));
  const proc = spawn('node', ['../server/index.js'], {
    cwd: __dirname,
    env: { ...process.env, PORT: String(PORT), TTT_CHAR_FILE: CHAR_FILE, TTT_ACC_FILE: '/tmp/ttt-t39-acc.json', TTT_WORLD_FILE: WORLD_FILE, TTT_CHEST_FORCE_GRADE: 'C' },
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
function wire() {
  const s = io(URL, { transports: ['websocket'] });
  const apply = createMerger();
  const S = { tick: null, char: null, errors: [], opened: [] };
  s.on('server_tick', (t) => { const snap = apply(t); if (snap) S.tick = snap; });
  s.on('char_sync', (c) => { S.char = c; });
  s.on('welcome', (w) => { if (w.character) S.char = w.character; });
  s.on('interact_error', (e) => S.errors.push(e.message || ''));
  s.on('chest_opened', (d) => S.opened.push(d));
  return { s, S };
}
const meOf = (S) => () => { const m = S.tick?.players.find((p) => p.name === S.char?.name); return m ? { x: m.x, y: m.y } : null; };
function waitEv(s, ev, ms = 6000) { return new Promise((res, rej) => { const t = setTimeout(() => rej(new Error('timeout ' + ev)), ms); s.once(ev, (d) => { clearTimeout(t); res(d); }); }); }
async function waitFor(fn, ms, label) { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (fn()) return true; await sleep(120); } throw new Error('waitFor: ' + label); }

async function makePlayer(token, name, classId) {
  const P = wire();
  await new Promise((r) => P.s.on('connect', r));
  const needP = waitEv(P.s, 'need_character');
  P.s.emit('hello', { token });
  await needP;
  P.s.emit('request_roll');
  await waitEv(P.s, 'roll_result');
  const welP = waitEv(P.s, 'welcome');
  P.s.emit('create_character', { token, name, classId });
  await welP;
  await waitFor(() => !!P.S.tick, 6000, 'tick ' + name);
  const steer = makeSteer(P.s, P.S, meOf(P.S));
  await steer({ x: 700, y: 378 }, 50, 10000);
  P.s.emit('measure_linhcan');
  await waitFor(() => !!P.S.char.linhCan, 6000, 'linh căn ' + name);
  return { ...P, steer };
}

(async () => {
  fs.rmSync(CHAR_FILE, { force: true });
  let proc = await startServer();
  const A = await makePlayer('tok-t39a', 'Người A', 'phaptu'); // Pháp tu đánh xa — rương rơi không bị A đứng gần mở mất
  const B = await makePlayer('tok-t39b', 'Người B', 'phaptu');
  const C = await makePlayer('tok-t39c', 'Người C', 'thetu');
  A.s.disconnect(); B.s.disconnect(); C.s.disconnect();
  await sleep(300);
  await stopServer(proc);
  // Nâng chỉ số cả 3 để đánh nhanh
  const chars = JSON.parse(fs.readFileSync(CHAR_FILE, 'utf8'));
  for (const k of Object.keys(chars)) { for (const sk of Object.keys(chars[k].stats)) chars[k].stats[sk] = 40; chars[k].stones = 1000; }
  fs.writeFileSync(CHAR_FILE, JSON.stringify(chars, null, 2));
  proc = await startServer();

  async function join(token) {
    const P = wire();
    await new Promise((r) => P.s.on('connect', r));
    P.s.emit('hello', { token });
    await waitFor(() => !!P.S.char?.linhCan, 6000, 'join');
    const steer = makeSteer(P.s, P.S, meOf(P.S));
    return { ...P, steer };
  }
  const a = await join('tok-t39a');
  const b = await join('tok-t39b');
  const c = await join('tok-t39c');
  await waitFor(() => (a.S.tick?.players || []).filter((p) => ['Người A', 'Người B', 'Người C'].includes(p.name)).length === 3, 8000, 'A thấy đủ 3 người');
  ok(true, '3 người chơi cùng vào: A thấy cả B và C trong thế giới');

  async function killMonster(P, id, timeoutMs = 45000) {
    const t0 = Date.now();
    while (Date.now() - t0 < timeoutMs) {
      if (!(P.S.tick?.monsters || []).some((m) => m.id === id)) return true;
      await P.steer(() => { const t = (P.S.tick?.monsters || []).find((m) => m.id === id); return t ? { x: t.x, y: t.y } : null; }, 30, 6000, true);
      await sleep(200);
    }
    return false;
  }

  // A hạ sói TỪ XA bằng công pháp (đứng gần là rương tự mở ngay khi rơi —
  // đúng luật game) — B phải thấy sói biến mất + rương nằm lại trên đất
  async function killMonsterRanged(P, id, timeoutMs = 30000) {
    const t0 = Date.now();
    while (Date.now() - t0 < timeoutMs) {
      if (!(P.S.tick?.monsters || []).some((m) => m.id === id)) return true;
      await P.steer(() => { const t = (P.S.tick?.monsters || []).find((m) => m.id === id); return t ? { x: t.x, y: t.y } : null; }, 150, 4000);
      P.s.emit('cast_skill', { slot: 0 });
      await sleep(350);
    }
    return false;
  }
  let chestSeen = false;
  for (let i = 0; i < 4 && !chestSeen; i++) {
    const wolf = (a.S.tick.monsters || []).find((m) => m.kind === 'wolf');
    if (!wolf) { await sleep(800); continue; }
    ok(await killMonsterRanged(a, wolf.id), 'A hạ sói từ xa bằng công pháp');
    await a.steer({ x: 700, y: 560 }, 60, 8000); // A rút về quảng trường ngay, tránh đứng gần rương
    await waitFor(() => !(b.S.tick?.monsters || []).some((m) => m.id === wolf.id), 6000, 'B thấy sói biến mất');
    const t0 = Date.now();
    while (Date.now() - t0 < 2500) {
      if ((b.S.tick?.chests || []).length >= 1) { chestSeen = true; break; }
      await sleep(150);
    }
  }
  ok(chestSeen, 'B thấy rương rơi ra từ quái A hạ (nằm lại trên đất, chưa ai mở)');
  const chest = b.S.tick.chests[0];
  await b.steer({ x: chest.x, y: chest.y }, 20, 15000);
  await waitFor(() => b.S.opened.length >= 1, 6000, 'B mở rương');
  ok(true, `B mở được rương do A làm rơi (mở rương là của chung): nhận ${b.S.opened[0].loot.join(', ')}`);

  // Đối đầu của A: B đánh ké — nhiệm vụ của A KHÔNG được tính hộ
  await b.steer({ x: 800, y: 668 }, 55, 10000);
  b.s.emit('quest_accept', { questId: 'q_tusi' });
  await waitFor(() => b.S.char.quests?.q_tusi?.state === 'active', 5000, 'B nhận q_tusi');
  await c.steer({ x: 800, y: 668 }, 55, 10000);
  c.s.emit('quest_accept', { questId: 'q_tusi' });
  await waitFor(() => c.S.char.quests?.q_tusi?.state === 'active', 5000, 'C nhận q_tusi');
  await b.steer({ x: 200, y: 1020 }, 60, 15000);
  b.s.emit('start_duel', { questId: 'q_tusi' });
  await waitFor(() => (b.S.tick?.monsters || []).some((m) => m.trial === 'duel'), 6000, 'tu sĩ của B xuất hiện');
  const duel = (b.S.tick.monsters || []).find((m) => m.trial === 'duel');
  ok(await killMonster(c, duel.id, 90000), 'C (bạn) đánh ké hạ được tu sĩ của B (quái không khóa sát thương)');
  await sleep(600);
  ok(b.S.char.quests?.q_tusi?.state === 'active', 'Nhiệm vụ của B VẪN chưa xong (phải tự kết liễu mới tính) — không bị cướp công, không kẹt');
  await b.steer({ x: 200, y: 1020 }, 60, 15000); // B có thể đã bị tu sĩ hạ và hồi sinh ở làng — ra lại bãi farm
  b.s.emit('start_duel', { questId: 'q_tusi' });
  await waitFor(() => (b.S.tick?.monsters || []).some((m) => m.trial === 'duel'), 6000, 'B gọi lại tu sĩ');
  const duel2 = (b.S.tick.monsters || []).find((m) => m.trial === 'duel');
  ok(await killMonster(b, duel2.id, 90000), 'B tự tay hạ tu sĩ của mình');
  await waitFor(() => b.S.char.quests?.q_tusi?.state === 'done', 5000, 'q_tusi của B hoàn thành');

  // Bảng xếp hạng thấy cả 3 người
  b.s.emit('get_leaderboard');
  const lbD = await waitEv(b.s, 'leaderboard_data');
  const names = lbD.tuVi.map((r) => r.name);
  ok(['Người A', 'Người B', 'Người C'].every((n) => names.includes(n)), `Bảng Tu Vi có đủ 3 người chơi: ${names.join(', ')}`);

  a.s.disconnect(); b.s.disconnect(); c.s.disconnect();
  await sleep(300);
  await stopServer(proc);
  console.log(failures === 0 ? 'TEST39: ALL PASS' : `TEST39: ${failures} FAIL`);
  process.exit(failures ? 1 : 0);
})().catch(async (e) => { console.error('ERR', e.message); process.exit(1); });
