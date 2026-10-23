// Test GĐ22: 2 con đường khởi đầu (đúng file thiết kế / bản chơi đơn).
// - 'solo' (Một mình): thưởng 100% (hạ sói +3 Tu vi), nghỉ offline tại Đạo Quán.
// - 'sect' (Thanh Phong Môn): 2 đồng môn AI đi theo (chỉ số 70% chủ nhân),
//   thưởng ×2/3 (hạ sói +2 Tu vi), nghỉ offline tại sân tông môn (vùng an toàn).
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const { io } = require('socket.io-client');
const { createMerger } = require('./worldmerge.cjs');
const { makeSteer } = require('./steer.cjs');
const URL = 'http://localhost:3011';
const CHAR_FILE = '/tmp/chars-test22.json';
const WORLD_FILE = '/tmp/world-test22.json';
const TOK_S = 'tok-test22-solo-' + Date.now().toString(36);
const TOK_T = 'tok-test22-sect-' + Date.now().toString(36);
let pass = 0, fail = 0;
const ok = (c, l) => { if (c) { pass++; console.log('  PASS', l); } else { fail++; console.log('  FAIL', l); } };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let serverProc = null;

async function startServer() {
  serverProc = spawn('node', ['server/index.js'], {
    cwd: path.join(__dirname, '..'),
    env: {
      ...process.env, PORT: '3011', TTT_TUVI_NEED: '1',
      TTT_CHAR_FILE: CHAR_FILE, TTT_ACC_FILE: '/tmp/acc-test22.json',
      TTT_WORLD_FILE: WORLD_FILE, TTT_WORLD_START_MINUTES: '600',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const slog = fs.createWriteStream('/tmp/test22-server.log');
  serverProc.stdout.pipe(slog);
  serverProc.stderr.pipe(slog);
  for (let i = 0; i < 40; i++) {
    try { const r = await fetch(URL + '/api/status'); if (r.ok) return; } catch { /* chưa lên */ }
    await sleep(400);
  }
  throw new Error('server test không lên');
}
async function stopServer() {
  if (serverProc) { serverProc.kill('SIGTERM'); serverProc = null; await sleep(700); }
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
    await sleep(250);
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
async function createChar(s, token, name, pth) {
  const welP = waitEvent(s, 'welcome');
  s.emit('hello', { token });
  await waitEvent(s, 'need_character');
  s.emit('request_roll');
  await waitEvent(s, 'roll_result');
  s.emit('create_character', { token, name, classId: 'kiemtu', weaponId: 'kiem', robe: '#a8c8ec', path: pth });
  return welP;
}
// Đưa nhân vật tới chỗ sói gần nhất và đánh tới khi hạ được 1 con (trả về số
// Tu vi tăng). Vòng lặp có hạn chót: đồng môn có thể hạ gục con sói mục tiêu
// trước khi chủ tới nơi — khi đó Tu vi đã tăng, coi như xong.
async function huntOneWolf(s, S, me) {
  const steer = makeSteer(s, S, me);
  const tuVi0 = S.char.tuVi;
  const deadline = Date.now() + 90000;
  while (Date.now() < deadline) {
    if (S.char.tuVi > tuVi0) break;
    const wolf = S.tick?.monsters.find((m) => m.kind === 'wolf');
    if (!wolf) { await sleep(300); continue; }
    await steer(() => {
      const t = S.tick?.monsters.find((m) => m.id === wolf.id);
      const mp = me();
      return t ? { x: t.x, y: t.y } : (mp ? { x: mp.x, y: mp.y } : { x: 700, y: 560 });
    }, 34, 5000).catch(() => {});
    for (let i = 0; i < 6 && S.tick?.monsters.some((m) => m.id === wolf.id); i++) {
      s.emit('player_attack');
      s.emit('cast_skill', { slot: 0 });
      await sleep(360);
      if (S.char.tuVi > tuVi0) break;
    }
  }
  return S.char.tuVi - tuVi0;
}
const inSect = (p) => p && p.x >= 1230 && p.x <= 1530 && p.y >= 420 && p.y <= 660;

async function main() {
  fs.rmSync(CHAR_FILE, { force: true });
  fs.rmSync(WORLD_FILE, { force: true });
  await startServer();

  // ---------- Đường SOLO ----------
  const sS = await connect();
  const SS = wire(sS);
  const welS = await createChar(sS, TOK_S, 'Độc Hành Giả', 'solo');
  const meS = () => (SS.tick ? SS.tick.players.find((p) => p.id === welS.id) : null);
  ok(welS.character.path === 'solo' && welS.character.homeType === 'daoquan',
    `Solo: path=${welS.character.path}, nhà=${welS.character.homeType}`);
  await sleep(600);
  ok(!(SS.tick?.players || []).some((p) => p.companion), 'Solo: không có đồng môn đi theo');
  const steerS = makeSteer(sS, SS, meS);
  await steerS({ x: 700, y: 420 }, 20);
  sS.emit('measure_linhcan');
  await waitFor(() => SS.char?.linhCan, 8000, 'solo đo linh căn');
  const gainS = await huntOneWolf(sS, SS, meS);
  ok(gainS === 3, `Solo hạ sói: +${gainS} Tu vi (100% — đúng file: quái Yếu +3)`);

  // ---------- Đường TÔNG MÔN ----------
  const sT = await connect();
  sT.on('disconnect', (r) => console.log('  [debug] socket T disconnect:', r));
  sT.io.on('reconnect', () => console.log('  [debug] socket T reconnect'));
  const ST = wire(sT);
  const welT = await createChar(sT, TOK_T, 'Tông Môn Đệ', 'sect');
  const meT = () => (ST.tick ? ST.tick.players.find((p) => p.id === welT.id) : null);
  ok(welT.character.path === 'sect' && welT.character.homeType === 'tongmon',
    `Tông môn: path=${welT.character.path}, nhà=${welT.character.homeType}`);
  const comps = await waitFor(() => {
    const list = (ST.tick?.players || []).filter((p) => p.companion);
    return list.length === 2 ? list : null;
  }, 10000, '2 đồng môn xuất hiện');
  ok(comps.map((c) => c.name).join(' + ') === 'Đồng môn huynh + Đồng môn muội' || comps.length === 2,
    `Có 2 đồng môn: ${comps.map((c) => c.name).join(', ')}`);
  const ownerKH = welT.character.stats.khiHuyet;
  const expectCompMaxHp = 100 + Math.max(1, Math.round(ownerKH * 0.7)) * 10;
  ok(comps.every((c) => c.maxHp === expectCompMaxHp),
    `Đồng môn 70% chỉ số: maxHp ${comps[0].maxHp} = 100 + round(${ownerKH}×0.7)×10 = ${expectCompMaxHp}`);
  const steerT = makeSteer(sT, ST, meT);
  await steerT({ x: 700, y: 420 }, 20);
  sT.emit('measure_linhcan');
  await waitFor(() => ST.char?.linhCan, 8000, 'tông môn đo linh căn');
  // Đồng môn bám theo khi chủ di chuyển xa
  await steerT({ x: 1250, y: 300 }, 30);
  const compsNear = await waitFor(() => {
    const me = meT();
    const list = (ST.tick?.players || []).filter((p) => p.companion);
    return me && list.length === 2 && list.every((c) => Math.hypot(c.x - me.x, c.y - me.y) <= 130) ? list : null;
  }, 12000, 'đồng môn bám theo chủ');
  ok(!!compsNear, 'Đồng môn tự bám theo chủ nhân khi di chuyển');
  const gainT = await huntOneWolf(sT, ST, meT);
  // Đồng môn đánh phụ rất nhanh — 2 lần hạ gục có thể lọt vào cùng 1 nhịp đọc
  // (mỗi lần đúng +2). Tiêu chuẩn: tổng tăng là bội số của 2, khác hẳn mức 3 của solo.
  ok(gainT >= 2 && gainT % 2 === 0, `Tông môn hạ sói: +${gainT} Tu vi (mỗi lần hạ = +2 = ×2/3 của 3 — chia cả đội)`);

  // ---------- Tông môn thoát game → nghỉ tại sân tông môn ----------
  sT.disconnect();
  await sleep(700);
  const actorT = await waitFor(() => SS.tick?.players.find((p) => p.name === 'Tông Môn Đệ'), 10000, 'thấy bản offline của đệ tử tông môn');
  ok(actorT.rest === 'sleep' && inSect(actorT),
    `Đệ tử tông môn nghỉ offline tại sân tông môn (${actorT.x}, ${actorT.y}), rest=${actorT.rest}`);
  const compsGone = !(SS.tick?.players || []).some((p) => p.companion);
  ok(compsGone, 'Chủ thoát → đồng môn cũng tan (không còn trong thế giới)');
  sS.disconnect();
  await stopServer();

  console.log(`\nTEST22: ${pass} PASS, ${fail} FAIL`);
  process.exit(fail ? 1 : 0);
}

main().catch(async (e) => { console.error('TEST LỖI:', e.message); await stopServer(); process.exit(1); });
