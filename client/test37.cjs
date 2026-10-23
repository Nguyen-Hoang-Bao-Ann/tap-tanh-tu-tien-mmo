// TEST GĐ40 — NỘI DUNG SỐNG:
// 1) Thương nhân lưu động: thoại chào đúng kho luân phiên ngày; mua được
//    món có hàng, món ngoài kho bị chặn.
// 2) Vụ án bệnh lạ: chuỗi 2 phần tại Tiệm Đan — phần 2 ẩn cho tới khi
//    xong phần 1; trả phần 2 xong vụ án mở lại từ đầu.
// 3) Tu sĩ thù địch: nhận nhiệm vụ bảng → ra ngoài làng Khiêu chiến →
//    đấu tay đôi thắng → trả nhiệm vụ nhận thưởng + Công trạng.
const { io } = require('socket.io-client');
const { spawn } = require('child_process');
const fs = require('fs');
const { createMerger } = require('./worldmerge.cjs');
const { makeSteer } = require('./steer.cjs');

const PORT = 3047;
const URL = `http://localhost:${PORT}`;
const CHAR_FILE = `/tmp/ttt-t37-chars.json`;
const WORLD_FILE = `/tmp/ttt-t37-world.json`;
let failures = 0;
function ok(cond, label) { console.log(`${cond ? 'PASS' : 'FAIL'}  ${label}`); if (!cond) failures++; }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function startServer() {
  // GĐ40+: ghim ngày 2 (thương nhân chắc chắn ghé) + đồng hồ tốc độ thật cho ngày ổn định
  fs.writeFileSync(WORLD_FILE, JSON.stringify({ totalMinutes: 2 * 1440 + 600, savedAt: Date.now() }));
  const proc = spawn('node', ['../server/index.js'], {
    cwd: __dirname,
    env: { ...process.env, PORT: String(PORT), TTT_CHAR_FILE: CHAR_FILE, TTT_ACC_FILE: '/tmp/ttt-t37-acc.json', TTT_WORLD_FILE: WORLD_FILE },
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
  const S = { tick: null, char: null, errors: [], dialogs: [] };
  s.on('server_tick', (t) => { const snap = apply(t); if (snap) S.tick = snap; });
  s.on('char_sync', (c) => { S.char = c; });
  s.on('welcome', (w) => { if (w.character) S.char = w.character; });
  s.on('interact_error', (e) => S.errors.push(e.message || ''));
  s.on('npc_dialog', (d) => S.dialogs.push(d));
  return { s, S };
}
const meOf = (S) => () => { const m = S.tick?.players.find((p) => p.name === S.char?.name); return m ? { x: m.x, y: m.y } : null; };
function waitEv(s, ev, ms = 6000) { return new Promise((res, rej) => { const t = setTimeout(() => rej(new Error('timeout ' + ev)), ms); s.once(ev, (d) => { clearTimeout(t); res(d); }); }); }
async function waitFor(fn, ms, label) { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (fn()) return true; await sleep(120); } throw new Error('waitFor: ' + label); }

(async () => {
  fs.rmSync(CHAR_FILE, { force: true }); fs.rmSync(WORLD_FILE, { force: true });
  let proc = await startServer();
  const A = wire();
  await new Promise((r) => A.s.on('connect', r));
  const needP = waitEv(A.s, 'need_character');
  A.s.emit('hello', { token: 'tok-t37x' });
  await needP;
  A.s.emit('request_roll');
  await waitEv(A.s, 'roll_result');
  const welP = waitEv(A.s, 'welcome');
  A.s.emit('create_character', { token: 'tok-t37x', name: 'Thám Tử', classId: 'phaptu' });
  await welP;
  await waitFor(() => !!A.S.tick, 6000, 'tick');
  const steerA = makeSteer(A.s, A.S, meOf(A.S));
  await steerA({ x: 700, y: 378 }, 50, 10000);
  A.s.emit('measure_linhcan');
  await waitFor(() => !!A.S.char.linhCan, 6000, 'đo linh căn');
  A.s.disconnect(); await sleep(300);
  await stopServer(proc);
  patchChar('tok-t37x', (c) => { for (const k of Object.keys(c.stats)) c.stats[k] = 40; c.stones = 2000; });
  proc = await startServer();

  const B = wire();
  await new Promise((r) => B.s.on('connect', r));
  B.s.emit('hello', { token: 'tok-t37x' });
  await waitFor(() => !!B.S.char?.linhCan, 6000, 'vào lại');
  const steerB = makeSteer(B.s, B.S, meOf(B.S));
  async function talk(npcId, x, y) {
    await steerB({ x, y }, 60, 12000);
    B.S.dialogs.length = 0;
    B.s.emit('talk_npc', { npcId });
    await waitFor(() => B.S.dialogs.length > 0, 5000, 'dialog ' + npcId);
    return B.S.dialogs[B.S.dialogs.length - 1];
  }
  async function killMonster(id, timeoutMs = 45000) {
    const t0 = Date.now();
    while (Date.now() - t0 < timeoutMs) {
      if (!(B.S.tick?.monsters || []).some((m) => m.id === id)) return true;
      await steerB(() => { const t = (B.S.tick?.monsters || []).find((m) => m.id === id); return t ? { x: t.x, y: t.y } : null; }, 30, 6000, true);
      await sleep(200);
    }
    return false;
  }

  // --- 1) Thương nhân lưu động ---
  const dlgM = await talk('npc_thuongnhan', 884, 616);
  ok(dlgM.shopId === 'luu_dong' && /Hôm nay ta mang/.test(dlgM.text), `Thương nhân chào hàng theo ngày: "${dlgM.text.slice(0, 60)}…"`);
  // GĐ40+: kho/ngày đọc từ merchantInfo (3 món theo hạt giống ngày)
  const stockIds = (dlgM.merchantInfo?.stock || []).map((e) => e.itemId);
  const inStock = stockIds[0];
  B.s.emit('shop_buy', { shopId: 'luu_dong', itemId: inStock });
  await waitFor(() => (B.S.char.inventory[inStock] || 0) >= 1, 5000, 'mua món trong kho');
  ok(true, `Mua được món CÓ trong kho hôm nay (${inStock})`);
  const outStock = (dlgM.merchantInfo?.catalog || []).find((c) => !stockIds.includes(c.itemId))?.itemId;
  B.S.errors.length = 0;
  B.s.emit('shop_buy', { shopId: 'luu_dong', itemId: outStock });
  await sleep(700);
  ok(B.S.errors.some((m) => m.includes('không mang')), `Món NGOÀI kho hôm nay (${outStock}) bị chặn đúng câu chữ`);

  // --- 2) Vụ án bệnh lạ (chuỗi 2 phần) ---
  const dlg1 = await talk('npc_dan', 985, 548);
  const pq1 = (dlg1.personalQuests || []).find((q) => q.questId === 'q_benhla1');
  const pq2early = (dlg1.personalQuests || []).find((q) => q.questId === 'q_benhla2');
  ok(!!pq1 && pq1.state === 'available', 'Phần 1 vụ án hiện ở Tiệm Đan (không cần thiện cảm)');
  ok(!pq2early, 'Phần 2 ẨN cho tới khi xong phần 1');
  B.s.emit('quest_accept', { questId: 'q_benhla1' });
  await waitFor(() => B.S.char.quests?.q_benhla1?.state === 'active', 5000, 'nhận benhla1');
  let killed = 0;
  const killT0 = Date.now();
  while (killed < 8 && Date.now() - killT0 < 150000) {
    const bat = (B.S.tick?.monsters || []).find((m) => m.kind === 'bat');
    if (!bat) { await sleep(600); continue; }
    if (await killMonster(bat.id)) killed++;
    await sleep(200);
  }
  ok(killed >= 8 && B.S.char.quests?.q_benhla1?.state === 'done', `Hạ đủ 8 dơi → phần 1 hoàn thành (đã hạ ${killed})`);
  const dlg2 = await talk('npc_dan', 985, 548);
  ok((dlg2.claimable || []).some((c) => c.questId === 'q_benhla1'), 'Phần 1 sẵn sàng trả tại Tiệm Đan');
  B.s.emit('quest_claim', { questId: 'q_benhla1' });
  await waitFor(() => !B.S.char.quests?.q_benhla1, 5000, 'trả benhla1');
  const dlg3 = await talk('npc_dan', 985, 548);
  const pq2 = (dlg3.personalQuests || []).find((q) => q.questId === 'q_benhla2');
  ok(!!pq2 && pq2.state === 'available', 'Xong phần 1 → phần 2 MỞ ra');
  B.s.emit('quest_accept', { questId: 'q_benhla2' });
  await waitFor(() => B.S.char.quests?.q_benhla2?.state === 'active', 5000, 'nhận benhla2');
  // Mua 2 Hồi Xuân Đan ở Tiệm Đan rồi trả phần 2
  B.s.emit('shop_buy', { shopId: 'tiem_dan', itemId: 'dan_hoi_xuan' });
  await sleep(400);
  B.s.emit('shop_buy', { shopId: 'tiem_dan', itemId: 'dan_hoi_xuan' });
  await waitFor(() => (B.S.char.inventory.dan_hoi_xuan || 0) >= 2, 5000, 'có 2 hồi xuân đan');
  const tvBefore = B.S.char.tuVi || 0;
  B.s.emit('quest_claim', { questId: 'q_benhla2' });
  await waitFor(() => !B.S.char.quests?.q_benhla2, 5000, 'trả benhla2');
  ok((B.S.char.tuVi || 0) - tvBefore === 30, `Trả phần 2: +30 Tu vi (thực tế +${(B.S.char.tuVi || 0) - tvBefore})`);
  const dlg4 = await talk('npc_dan', 985, 548);
  ok((dlg4.personalQuests || []).some((q) => q.questId === 'q_benhla1' && q.state === 'available'), 'Vụ án MỞ LẠI từ đầu sau khi phá xong (nội dung lặp lại được)');

  // --- 3) Tu sĩ thù địch ---
  await steerB({ x: 800, y: 668 }, 55, 10000);
  B.s.emit('quest_accept', { questId: 'q_tusi' });
  await waitFor(() => B.S.char.quests?.q_tusi?.state === 'active', 5000, 'nhận q_tusi');
  B.S.errors.length = 0;
  B.s.emit('start_rival', {});
  await sleep(700);
  ok(B.S.errors.some((m) => m.includes('vùng an toàn')), 'Khiêu chiến trong làng bị chặn (phải ra ngoài)');
  await steerB({ x: 200, y: 1020 }, 60, 15000);
  B.s.emit('start_rival', {});
  await waitFor(() => (B.S.tick?.monsters || []).some((m) => m.trial === 'duel'), 6000, 'tu sĩ xuất hiện');
  const rival = (B.S.tick.monsters || []).find((m) => m.trial === 'duel');
  ok(rival.name === 'Tu Sĩ Thù Địch' && rival.maxHp > 40, `Tu Sĩ Thù Địch xuất hiện: HP ${rival.maxHp} (mạnh hơn quái thường)`);
  ok(await killMonster(rival.id, 90000), 'Đánh bại Tu Sĩ Thù Địch trong đấu tay đôi');
  await waitFor(() => B.S.char.quests?.q_tusi?.state === 'done', 5000, 'q_tusi done');
  const merit0 = B.S.char.merit || 0;
  await steerB({ x: 387, y: 541 }, 55, 12000);
  B.s.emit('quest_claim', { questId: 'q_tusi' });
  await waitFor(() => !B.S.char.quests?.q_tusi, 5000, 'trả q_tusi');
  ok((B.S.char.merit || 0) - merit0 === 3, `Trả nhiệm vụ đối đầu: +3 Công trạng (tổng ${B.S.char.merit})`);
  B.s.disconnect(); await sleep(300);
  await stopServer(proc);

  console.log(failures === 0 ? 'TEST37: ALL PASS' : `TEST37: ${failures} FAIL`);
  process.exit(failures ? 1 : 0);
})().catch(async (e) => { console.error('ERR', e.message); process.exit(1); });
