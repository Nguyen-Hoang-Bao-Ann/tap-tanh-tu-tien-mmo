// TEST GĐ30: Công trạng + Thư tiến cử + chiêu mộ tông môn (Thiên Kiếm / Huyền Thiên)
// Tự spawn server cổng 3023. Thế giới bắt đầu THÁNG 3 NĂM 1 (Thiên Kiếm đang mở);
// phase Huyền Thiên vá world.json sang NĂM 3 THÁNG 1 (đợt mở 60 ngày).
const { io } = require('socket.io-client');
const { spawn } = require('child_process');
const fs = require('fs');
const { createMerger } = require('./worldmerge.cjs');
const { makeSteer } = require('./steer.cjs');

const PORT = 3023;
const CHAR_FILE = '/tmp/chars-test28.json';
const ACC_FILE = '/tmp/acc-test28.json';
const WORLD_FILE = '/tmp/world-test28.json';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let pass = 0, fail = 0;
const ok = (cond, label) => { if (cond) { pass++; console.log('  PASS', label); } else { fail++; console.log('  FAIL', label); } };
const MONTH3_MIN = 60 * 1440 + 480; // tháng 3, 08:00
const YEAR3_MIN = 720 * 1440 + 480; // năm 3 tháng 1, 08:00

async function startServer(startMin) {
  const proc = spawn('node', ['../server/index.js'], {
    cwd: __dirname,
    env: { ...process.env, PORT: String(PORT), TTT_CHAR_FILE: CHAR_FILE, TTT_ACC_FILE: ACC_FILE, TTT_WORLD_FILE: WORLD_FILE, TTT_WORLD_START_MINUTES: String(startMin) },
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
function patchWorld(totalMinutes) {
  const w = fs.existsSync(WORLD_FILE) ? JSON.parse(fs.readFileSync(WORLD_FILE, 'utf8')) : {};
  w.totalMinutes = totalMinutes;
  w.savedAt = Date.now();
  fs.writeFileSync(WORLD_FILE, JSON.stringify(w, null, 1));
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
  const S = { tick: null, char: null, dialog: null, errors: [], joined: null };
  s.on('server_tick', (t) => { const snap = apply(t); if (snap) S.tick = snap; });
  s.on('char_sync', (c) => { S.char = c; });
  s.on('npc_dialog', (d) => { S.dialog = d; });
  s.on('interact_error', (e) => S.errors.push(e.message || ''));
  s.on('sect_joined', (d) => { S.joined = d; });
  s.on('welcome', (w) => { if (w.character) S.char = w.character; });
  return { s, S };
}
async function guestChar(token, name, classId) {
  const { s, S } = wire();
  await new Promise((r) => s.on('connect', r));
  const needP = waitEv(s, 'need_character');
  s.emit('hello', { token });
  await needP;
  s.emit('request_roll');
  await waitEv(s, 'roll_result');
  const welP = waitEv(s, 'welcome');
  s.emit('create_character', { token, name, classId });
  await welP;
  await waitFor(() => !!S.tick, 6000, 'tick đầu');
  return { s, S };
}
async function guestBack(token) {
  const { s, S } = wire();
  await new Promise((r) => s.on('connect', r));
  const welP = waitEv(s, 'welcome');
  s.emit('hello', { token });
  await welP;
  await waitFor(() => !!S.tick, 6000, 'tick đầu');
  return { s, S };
}
const meOf = (S) => () => (S.tick ? S.tick.players.find((p) => p.name === S.char?.name) : null);

(async () => {
  fs.rmSync(CHAR_FILE, { force: true }); fs.rmSync(ACC_FILE, { force: true }); fs.rmSync(WORLD_FILE, { force: true });
  patchWorld(MONTH3_MIN); // TTT_WORLD_START_MINUTES chỉ là phút-trong-ngày — đặt thẳng totalMinutes vào world.json
  let proc = await startServer(480);
  try {
    console.log('== GĐ30: sứ giả + cửa sổ Thiên Kiếm (tháng 3) ==');
    const A = await guestChar('tok-t28a', 'Ứng Viên Kiếm', 'kiemtu');
    const steerA = makeSteer(A.s, A.S, meOf(A.S));
    await steerA({ x: 762, y: 470 }, 40, 10000);
    const dlgP = waitEv(A.s, 'npc_dialog');
    A.s.emit('talk_npc', { npcId: 'npc_sugia' });
    const dlg = await dlgP;
    ok(!!dlg.sectInfo, 'Hộp thoại sứ giả có khối tông môn (sectInfo)');
    ok(dlg.sectInfo?.thienkiem?.open === true, 'Tháng 3: Thiên Kiếm Môn ĐANG MỞ chiêu mộ');
    ok(dlg.sectInfo?.huyenthien?.open === false, 'Năm 1: Huyền Thiên Tông đang đóng');
    ok(dlg.sectInfo?.thienkiem?.canJoin === false && dlg.sectInfo.thienkiem.missing.length >= 2,
      `Chưa đủ điều kiện thì không cho gia nhập (thiếu: ${dlg.sectInfo.thienkiem.missing.join('; ')})`);
    ok(dlg.sectInfo?.merit === 0, 'Công trạng khởi đầu = 0');
    A.s.disconnect(); await sleep(300);
    await stopServer(proc);

    console.log('== GĐ30: trả nhiệm vụ bảng → Công trạng + Thư Tiến Cử ở mốc 10 ==');
    patchChar('tok-t28a', (c) => {
      c.inventory = { nanh_soi: 30 };
      c.quests = { q_nanhsoi: { progress: 0, state: 'active' } };
      c.boardQuests = 9; c.merit = 99; c.stones = 500;
      c.x = 700; c.y = 560;
    });
    proc = await startServer(480);
    const B = await guestBack('tok-t28a');
    const steerB = makeSteer(B.s, B.S, meOf(B.S));
    // Tiệm tông môn chưa là đệ tử → bị chặn (đứng tại điểm sứ giả = điểm tiệm)
    await steerB({ x: 762, y: 470 }, 30, 10000);
    B.S.errors.length = 0;
    B.s.emit('shop_buy', { shopId: 'tiem_tong_mon', itemId: 'dan_tu_khi' });
    await sleep(700);
    ok(B.S.errors.some((m) => m.includes('chỉ bán cho đệ tử')), 'Chưa vào tông môn: mua ở Tiệm Tông Môn bị chặn');
    await steerB({ x: 387, y: 541 }, 40, 10000);
    const st0 = B.S.char.stones;
    B.s.emit('quest_claim', { questId: 'q_nanhsoi' });
    await waitFor(() => (B.S.char.merit || 0) === 100, 6000, 'công trạng 100');
    ok(B.S.char.stones === st0 + 20, `Trả nhiệm vụ bảng: +20 LT (${st0} → ${B.S.char.stones})`);
    ok((B.S.char.inventory?.thu_tien_cu || 0) === 1, 'Đủ 10 nhiệm vụ bảng → nhận THƯ TIẾN CỬ');
    ok((B.S.char.inventory?.nanh_soi || 0) === 27, 'Đã nộp đúng 3 Nanh Sói');
    B.s.disconnect(); await sleep(300);
    await stopServer(proc);

    console.log('== GĐ30: gia nhập Thiên Kiếm + tiệm tông + đổi Công trạng ==');
    patchChar('tok-t28a', (c) => { c.realm = 'lk'; c.tier = 7; c.tuVi = 10; c.x = 700; c.y = 560; });
    proc = await startServer(480);
    const C = await guestBack('tok-t28a');
    const steerC = makeSteer(C.s, C.S, meOf(C.S));
    await steerC({ x: 762, y: 470 }, 40, 10000);
    C.s.emit('talk_npc', { npcId: 'npc_sugia' });
    await waitFor(() => C.S.dialog?.sectInfo?.thienkiem?.canJoin === true, 6000, 'canJoin Thiên Kiếm');
    ok(true, 'Đủ LK7 + 100 Công trạng + Thư → canJoin = true');
    C.s.emit('join_sect', { sectId: 'thienkiem' });
    await waitFor(() => C.S.char.sect === 'thienkiem', 6000, 'đã vào Thiên Kiếm');
    ok(C.S.char.sectName === 'Thiên Kiếm Môn', 'Payload hiện tên tông môn');
    ok((C.S.char.inventory?.thu_tien_cu || 0) === 0, 'Thư Tiến Cử đã nộp khi gia nhập');
    const stC = C.S.char.stones; const fpC = C.S.char.freePoints || 0;
    C.s.emit('shop_buy', { shopId: 'tiem_tong_mon', itemId: 'dan_tu_khi' });
    await waitFor(() => (C.S.char.inventory?.dan_tu_khi || 0) >= 1, 6000, 'mua đan ở tiệm tông');
    ok(C.S.char.stones === stC - 25, `Đệ tử mua Đan Tụ Khí ở Tiệm Tông Môn giá 25 LT (${stC} → ${C.S.char.stones})`);
    C.s.emit('exchange_merit');
    await waitFor(() => C.S.char.merit === 50, 6000, 'đổi công trạng');
    ok((C.S.char.freePoints || 0) === fpC + 1, 'Đổi 50 Công trạng → +1 điểm chỉ số tự do');
    C.s.emit('join_sect', { sectId: 'huyenthien' });
    await sleep(700);
    ok(C.S.errors.some((m) => m.includes('chỉ thờ một tông')), 'Đã có tông môn: không vào thêm tông thứ hai');
    C.s.disconnect(); await sleep(300);
    await stopServer(proc);

    console.log('== GĐ30: Huyền Thiên Tông (năm 3) + Thử Thách Thú ==');
    patchWorld(YEAR3_MIN);
    proc = await startServer(480);
    const D = await guestChar('tok-t28b', 'Ứng Viên Tông', 'thetu');
    D.s.disconnect(); await sleep(300);
    await stopServer(proc);
    patchChar('tok-t28b', (c) => {
      c.realm = 'tc'; c.tier = 1; c.merit = 500; c.tuVi = 0;
      c.stats = { ...c.stats, vatCong: 300, khiHuyet: 40 };
      c.hp = 500; c.x = 700; c.y = 560;
    });
    proc = await startServer(480);
    const E = await guestBack('tok-t28b');
    const steerE = makeSteer(E.s, E.S, meOf(E.S));
    await steerE({ x: 762, y: 470 }, 40, 10000);
    E.s.emit('talk_npc', { npcId: 'npc_sugia' });
    await waitFor(() => E.S.dialog?.sectInfo?.huyenthien?.open === true, 6000, 'Huyền Thiên đang mở');
    ok(E.S.dialog.sectInfo.huyenthien.canJoin === false, 'Chưa thắng thử thách: chưa được vào Huyền Thiên');
    E.s.emit('start_sect_trial');
    await waitFor(() => (E.S.tick?.monsters || []).some((m) => m.kind === 'trial'), 8000, 'Thử Thách Thú xuất hiện');
    const boss = E.S.tick.monsters.find((m) => m.kind === 'trial');
    ok(boss && boss.maxHp === 1388, `Thử Thách Thú xuất hiện phía nam quảng trường (HP ${boss?.maxHp} = tinh anh bậc 9 ×4)`);
    const deadline = Date.now() + 60000;
    while (Date.now() < deadline) {
      const alive = (E.S.tick?.monsters || []).some((m) => m.kind === 'trial');
      if (!alive) break;
      await steerE(() => {
        const t = E.S.tick?.monsters.find((m) => m.kind === 'trial');
        const mp = meOf(E.S)();
        return t ? { x: t.x, y: t.y } : (mp ? { x: mp.x, y: mp.y } : { x: 700, y: 560 });
      }, 30, 5000, true).catch(() => {});
      await sleep(300);
    }
    ok(!(E.S.tick?.monsters || []).some((m) => m.kind === 'trial'), 'Đã hạ Thử Thách Thú');
    await steerE({ x: 762, y: 470 }, 40, 10000);
    E.s.emit('talk_npc', { npcId: 'npc_sugia' });
    await waitFor(() => E.S.dialog?.sectInfo?.huyenthien?.canJoin === true, 8000, 'canJoin Huyền Thiên sau thử thách');
    ok(true, 'Thắng thử thách → đủ tư cách vào Huyền Thiên Tông');
    E.s.emit('join_sect', { sectId: 'huyenthien' });
    await waitFor(() => E.S.char.sect === 'huyenthien', 6000, 'vào Huyền Thiên');
    ok(E.S.char.sectName === 'Huyền Thiên Tông', 'Gia nhập Huyền Thiên Tông thành công');
    E.s.disconnect(); await sleep(300);
  } catch (e) {
    fail++;
    console.log('  FAIL (exception):', e.message);
  } finally {
    await stopServer(proc);
  }
  console.log(`\nTEST28: ${pass} PASS, ${fail} FAIL`);
  process.exit(fail ? 1 : 0);
})();
