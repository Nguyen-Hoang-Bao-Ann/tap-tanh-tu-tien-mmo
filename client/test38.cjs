// TEST GĐ40+ — MỞ RỘNG NỘI DUNG SỐNG:
// thương nhân ghé thất thường theo ngày + kho/giá/số lượng theo ngày +
// đặt hàng nhận lần ghé sau; vụ án luân phiên (chưa mở bị chặn); vụ trộm
// điều tra bằng manh mối → chỉ đích danh (đúng: phá án; sai: khép vụ);
// vụ bắt cóc đối đầu cứu người; Bảng Vàng + Bảng Truy Nã.
const { io } = require('socket.io-client');
const { spawn } = require('child_process');
const fs = require('fs');
const { createMerger } = require('./worldmerge.cjs');
const { makeSteer } = require('./steer.cjs');

const PORT = 3049;
const URL = `http://localhost:${PORT}`;
const CHAR_FILE = `/tmp/ttt-t38-chars.json`;
const WORLD_FILE = `/tmp/ttt-t38-world.json`;
let failures = 0;
function ok(cond, label) { console.log(`${cond ? 'PASS' : 'FAIL'}  ${label}`); if (!cond) failures++; }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
// Sao chép đúng hàm băm của server để chọn ngày kiểm thử
function dayHash(n) { let x = (n + 1) * 2654435761; x = (x ^ (x >> 13)) * 1274126177; return Math.abs(x ^ (x >> 16)); }
const present = (d) => d % 4 === 2 || dayHash(d) % 100 < 30;
let DAY_A = -1;
for (let d = 0; d < 200; d++) { if (d % 7 === 3 && present(d)) { DAY_A = d; break; } }
let DAY_B = -1;
for (let d = DAY_A + 1; d < DAY_A + 60; d++) { if (!present(d)) { DAY_B = d; break; } }
let DAY_C = -1;
for (let d = DAY_A + 1; d < DAY_A + 60; d++) { if (present(d)) { DAY_C = d; break; } }

async function startServer(dayIndex) {
  fs.writeFileSync(WORLD_FILE, JSON.stringify({ totalMinutes: dayIndex * 1440 + 600, savedAt: Date.now() }));
  const proc = spawn('node', ['../server/index.js'], {
    cwd: __dirname,
    env: { ...process.env, PORT: String(PORT), TTT_CHAR_FILE: CHAR_FILE, TTT_ACC_FILE: '/tmp/ttt-t38-acc.json', TTT_WORLD_FILE: WORLD_FILE },
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
  const S = { tick: null, char: null, errors: [], dialogs: [], lb: null, notices: [] };
  s.on('server_tick', (t) => { const snap = apply(t); if (snap) S.tick = snap; });
  s.on('char_sync', (c) => { S.char = c; });
  s.on('welcome', (w) => { if (w.character) S.char = w.character; });
  s.on('interact_error', (e) => S.errors.push(e.message || ''));
  s.on('npc_dialog', (d) => S.dialogs.push(d));
  s.on('leaderboard_data', (d) => { S.lb = d; });
  s.on('notice', (n) => S.notices.push(n.text || ''));
  return { s, S };
}
const meOf = (S) => () => { const m = S.tick?.players.find((p) => p.name === S.char?.name); return m ? { x: m.x, y: m.y } : null; };
function waitEv(s, ev, ms = 6000) { return new Promise((res, rej) => { const t = setTimeout(() => rej(new Error('timeout ' + ev)), ms); s.once(ev, (d) => { clearTimeout(t); res(d); }); }); }
async function waitFor(fn, ms, label) { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (fn()) return true; await sleep(120); } throw new Error('waitFor: ' + label); }

(async () => {
  ok(DAY_A >= 0 && DAY_B > DAY_A && DAY_C > DAY_A, `Chọn được ngày kiểm thử: ghé=${DAY_A}, vắng=${DAY_B}, ghé lại=${DAY_C}`);
  fs.rmSync(CHAR_FILE, { force: true });
  let proc = await startServer(DAY_A);
  const A = wire();
  await new Promise((r) => A.s.on('connect', r));
  const needP = waitEv(A.s, 'need_character');
  A.s.emit('hello', { token: 'tok-t38x' });
  await needP;
  A.s.emit('request_roll');
  await waitEv(A.s, 'roll_result');
  const welP = waitEv(A.s, 'welcome');
  A.s.emit('create_character', { token: 'tok-t38x', name: 'Thám Tử Nhỏ', classId: 'phaptu' });
  await welP;
  await waitFor(() => !!A.S.tick, 6000, 'tick');
  const steerA = makeSteer(A.s, A.S, meOf(A.S));
  await steerA({ x: 700, y: 378 }, 50, 10000);
  A.s.emit('measure_linhcan');
  await waitFor(() => !!A.S.char.linhCan, 6000, 'đo linh căn');
  A.s.disconnect(); await sleep(300);
  await stopServer(proc);
  patchChar('tok-t38x', (c) => { for (const k of Object.keys(c.stats)) c.stats[k] = 40; c.stones = 5000; });
  proc = await startServer(DAY_A);

  const B = wire();
  await new Promise((r) => B.s.on('connect', r));
  B.s.emit('hello', { token: 'tok-t38x' });
  await waitFor(() => !!B.S.char?.linhCan, 6000, 'vào lại');
  const steerB = makeSteer(B.s, B.S, meOf(B.S));
  async function talk(npcId, x, y) {
    // Chủ Tiệm Nguyên Liệu đứng ở khe giữa 2 nhà — tiếp cận từ phía TÂY (đi vòng xuống nam rồi lên dọc x=250, vào khe từ phía tây)
    if (npcId === 'npc_nguyenlieu') { await steerB({ x: 250, y: 560 }, 40, 14000); await steerB({ x: 250, y: 388 }, 35, 10000); await steerB({ x: 350, y: 384 }, 30, 8000); }
    await steerB({ x, y }, 60, 12000);
    B.S.dialogs.length = 0;
    B.s.emit('talk_npc', { npcId });
    try {
      await waitFor(() => B.S.dialogs.length > 0, 5000, 'dialog ' + npcId);
    } catch (e) {
      const me = meOf(B.S)();
      console.log(`  [dbg] talk ${npcId} fail — vị trí nhân vật: ${JSON.stringify(me)}, đích (${x},${y}), lỗi server gần nhất: ${B.S.errors[B.S.errors.length - 1] || '(không)'}`);
      throw e;
    }
    return B.S.dialogs[B.S.dialogs.length - 1];
  }
  async function killMonster(id, timeoutMs = 60000) {
    const t0 = Date.now();
    while (Date.now() - t0 < timeoutMs) {
      if (!(B.S.tick?.monsters || []).some((m) => m.id === id)) return true;
      await steerB(() => { const t = (B.S.tick?.monsters || []).find((m) => m.id === id); return t ? { x: t.x, y: t.y } : null; }, 30, 6000, true);
      await sleep(200);
    }
    return false;
  }

  // --- Thương nhân CÓ MẶT ngày A ---
  ok((B.S.tick.npcs || []).some((n) => n.id === 'npc_thuongnhan'), 'Ngày ghé: thương nhân CÓ trong làng');
  const dlgM = await talk('npc_thuongnhan', 884, 616);
  ok(dlgM.merchantInfo && dlgM.merchantInfo.stock.length === 3 && !!dlgM.merchantInfo.hint, `Kho ngày: 3 món + hint (kho: ${dlgM.merchantInfo.stock.map((e) => e.itemId).join(', ')})`);
  const stockIds = dlgM.merchantInfo.stock.map((e) => e.itemId);
  const orderItem = dlgM.merchantInfo.catalog.find((c) => !stockIds.includes(c.itemId))?.itemId;
  B.s.emit('merchant_order', { itemId: orderItem });
  await waitFor(() => B.S.char.merchantOrder?.itemId === orderItem, 5000, 'đặt hàng');
  ok(true, `Đặt hàng món không có sẵn hôm nay: ${orderItem}`);
  B.s.emit('shop_buy', { shopId: 'luu_dong', itemId: stockIds[0] });
  await waitFor(() => (B.S.char.inventory[stockIds[0]] || 0) >= 1, 5000, 'mua hàng kho');
  ok(true, `Mua được món trong kho ngày: ${stockIds[0]}`);

  // --- Vụ án luân phiên: vụ chưa mở bị chặn ---
  ok(B.S.char.caseActive?.case_doi_pha === false, 'Payload báo vụ Bầy dơi phá kho CHƯA mở hôm nay');
  await steerB({ x: 800, y: 668 }, 55, 10000);
  B.S.errors.length = 0;
  B.s.emit('quest_accept', { questId: 'case_doi_pha' });
  await sleep(700);
  ok(B.S.errors.some((m) => m.includes('chưa mở')), 'Nhận vụ án chưa mở → bị chặn');

  // --- Vụ trộm: điều tra bằng manh mối ---
  B.s.emit('quest_accept', { questId: 'case_trom' });
  await waitFor(() => B.S.char.quests?.case_trom?.state === 'active', 5000, 'nhận case_trom');
  const clueTexts = [];
  for (const [npcId, x, y] of [['npc_truonglang', 362, 548], ['npc_dan', 985, 548], ['npc_nguyenlieu', 368, 379], ['npc_sugia', 762, 470]]) {
    const d = await talk(npcId, x, y);
    if (/Manh mối/.test(d.text)) clueTexts.push(d.text);
  }
  ok((B.S.char.quests?.case_trom?.progress || 0) === 3, `Thu đủ 3 manh mối (tiến độ ${B.S.char.quests?.case_trom?.progress}/3)`);
  const joined = clueTexts.join(' ');
  const culprit = /xanh lá/.test(joined) ? 'npc_dan' : /nâu/.test(joined) ? 'npc_nguyenlieu' : 'npc_thuongnhan';
  const dlgE = await talk('npc_truonglang', 362, 548);
  ok(Array.isArray(dlgE.accuse) && dlgE.accuse.length === 3, 'Đủ manh mối → Trưởng Làng cho chỉ đích danh 3 nghi phạm');
  B.s.emit('accuse_suspect', { npcId: culprit });
  await waitFor(() => B.S.char.quests?.case_trom?.state === 'done', 5000, 'phá án');
  ok(true, `Đọc manh mối → chỉ ĐÚNG thủ phạm (${culprit}) → vụ án hoàn thành`);
  B.s.emit('quest_claim', { questId: 'case_trom' });
  await waitFor(() => !B.S.char.quests?.case_trom, 5000, 'trả case_trom');
  // Làm lại vụ trộm và chỉ SAI để kiểm nhánh thất bại
  await steerB({ x: 800, y: 668 }, 55, 10000);
  B.s.emit('quest_accept', { questId: 'case_trom' });
  await waitFor(() => B.S.char.quests?.case_trom?.state === 'active', 5000, 'nhận lại case_trom');
  for (const [npcId, x, y] of [['npc_truonglang', 362, 548], ['npc_dan', 985, 548], ['npc_nguyenlieu', 368, 379], ['npc_sugia', 762, 470]]) {
    await talk(npcId, x, y);
  }
  await waitFor(() => (B.S.char.quests?.case_trom?.progress || 0) === 3, 8000, 'lại đủ 3 manh mối');
  const wrong = ['npc_dan', 'npc_nguyenlieu', 'npc_thuongnhan'].find((id) => id !== culprit);
  const affBefore = B.S.char.affinity?.npc_truonglang || 0;
  await steerB({ x: 387, y: 541 }, 55, 12000); // về đứng cạnh Trưởng Làng mới buộc tội được
  B.s.emit('accuse_suspect', { npcId: wrong });
  await waitFor(() => !B.S.char.quests?.case_trom, 5000, 'vụ khép lại');
  ok((B.S.char.affinity?.npc_truonglang || 0) < affBefore, `Chỉ SAI → vụ án khép lại + thiện cảm Trưởng Làng giảm (${affBefore} → ${B.S.char.affinity?.npc_truonglang})`);

  // --- Vụ bắt cóc: đối đầu cứu người ---
  await steerB({ x: 800, y: 668 }, 55, 10000);
  B.s.emit('quest_accept', { questId: 'case_batcoc' });
  await waitFor(() => B.S.char.quests?.case_batcoc?.state === 'active', 5000, 'nhận case_batcoc');
  await steerB({ x: 200, y: 1020 }, 60, 15000);
  B.s.emit('start_duel', { questId: 'case_batcoc' });
  await waitFor(() => (B.S.tick?.monsters || []).some((m) => m.trial === 'duel'), 6000, 'kẻ bắt cóc xuất hiện');
  const captor = (B.S.tick.monsters || []).find((m) => m.trial === 'duel');
  ok(captor.name === 'Kẻ Bắt Cóc', `Kẻ Bắt Cóc xuất hiện (HP ${captor.maxHp})`);
  ok(await killMonster(captor.id, 90000), 'Đánh bại Kẻ Bắt Cóc — cứu được dân làng');
  await waitFor(() => B.S.char.quests?.case_batcoc?.state === 'done', 5000, 'batcoc done');

  // --- Bảng Vàng + Truy Nã ---
  B.s.emit('get_leaderboard');
  await waitFor(() => !!B.S.lb, 5000, 'leaderboard');
  ok(B.S.lb.tuVi.some((r) => r.name === 'Thám Tử Nhỏ') && B.S.lb.truyNa.length === 4, `Bảng Vàng có tên mình; Bảng Truy Nã ${B.S.lb.truyNa.length} mục tiêu`);
  B.s.disconnect(); await sleep(300);
  await stopServer(proc);

  // --- Ngày B: thương nhân VẮNG ---
  proc = await startServer(DAY_B);
  const C = wire();
  await new Promise((r) => C.s.on('connect', r));
  C.s.emit('hello', { token: 'tok-t38x' });
  await waitFor(() => !!C.S.char, 6000, 'vào C');
  await waitFor(() => !!C.S.tick, 6000, 'tick C');
  ok(!(C.S.tick.npcs || []).some((n) => n.id === 'npc_thuongnhan'), 'Ngày vắng: thương nhân KHÔNG có trong làng');
  C.S.errors.length = 0;
  C.s.emit('talk_npc', { npcId: 'npc_thuongnhan' });
  await sleep(800);
  ok(C.S.errors.some((m) => m.includes('không có ở làng') || m.includes('Tới gần')), 'Tìm gặp lúc vắng → bị từ chối');
  C.s.disconnect(); await sleep(300);
  await stopServer(proc);

  // --- Ngày C: thương nhân ghé lại → giao đơn đặt ---
  proc = await startServer(DAY_C);
  const D = wire();
  await new Promise((r) => D.s.on('connect', r));
  D.s.emit('hello', { token: 'tok-t38x' });
  await waitFor(() => !!D.S.char, 6000, 'vào D');
  const steerD = makeSteer(D.s, D.S, meOf(D.S));
  const invBefore = D.S.char.inventory[orderItem] || 0;
  await steerD({ x: 884, y: 616 }, 60, 12000);
  D.s.emit('talk_npc', { npcId: 'npc_thuongnhan' });
  await waitFor(() => (D.S.char.inventory[orderItem] || 0) > invBefore, 6000, 'nhận hàng đặt');
  ok(!D.S.char.merchantOrder, `Đơn đặt được giao ở lần ghé sau (${orderItem} +1, đơn đã xóa)`);
  D.s.disconnect(); await sleep(300);
  await stopServer(proc);

  console.log(failures === 0 ? 'TEST38: ALL PASS' : `TEST38: ${failures} FAIL`);
  process.exit(failures ? 1 : 0);
})().catch(async (e) => { console.error('ERR', e.message); process.exit(1); });
