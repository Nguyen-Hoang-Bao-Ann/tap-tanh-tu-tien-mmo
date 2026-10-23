// Test GĐ8: NPC + rơi đồ + Linh thạch + cửa hàng + nhiệm vụ — instance test :3004
const { io } = require('socket.io-client');
const { createMerger } = require('./worldmerge.cjs');
const URL = 'http://localhost:3004';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let pass = 0, fail = 0;
function check(name, cond, extra = '') {
  if (cond) { pass++; console.log(`PASS | ${name}${extra ? ' | ' + extra : ''}`); }
  else { fail++; console.log(`FAIL | ${name}${extra ? ' | ' + extra : ''}`); }
}
const TOKEN = 'test8-' + Date.now();
const S = { id: null, tick: null, char: null, err: null };
const s = io(URL, { transports: ['websocket'] });
const mergeTick = createMerger();
s.on('server_tick', (t) => { S.tick = mergeTick(t); });
s.on('welcome', (w) => { S.id = w.id; S.char = w.character; });
s.on('char_sync', (c) => { S.char = c; });
s.on('interact_error', (e) => { S.err = e.message; });
s.on('need_character', () => s.emit('request_roll'));
s.on('roll_result', () => s.emit('create_character', { name: 'Kinh Tế Tử', classId: 'phaptu' }));
const me = () => S.tick?.players.find((p) => p.id === S.id);
const { makeSteer } = require('./steer.cjs');
const steerTo = makeSteer(s, S, me);
function nearestWolf(t, p) {
  let best = null, bd = Infinity;
  for (const m of t?.monsters || []) { const d = Math.hypot(m.x - p.x, m.y - p.y); if (d < bd) { bd = d; best = m; } }
  return best;
}
// Tới Tiệm Nguyên Liệu theo điểm mốc qua hành lang trống phía tây (né cụm nhà tây-bắc)
async function goToNguyenLieu() {
  await steerTo({ x: 700, y: 600 }, 60, 20000);
  await steerTo({ x: 285, y: 600 }, 25, 20000);
  await steerTo({ x: 285, y: 390 }, 16, 15000);
  await steerTo({ x: 392, y: 373 }, 40, 15000);
}
// Hạ 1 sói rồi đi nhặt TOÀN BỘ đồ nó rơi (Linh thạch + nanh nếu có)
async function killAndCollect() {
  const idsBefore = new Set((S.tick?.monsters || []).map((m) => m.id));
  const t0 = Date.now();
  let killed = false;
  while (Date.now() - t0 < 40000 && !killed) {
    killed = [...idsBefore].some((id) => !(S.tick?.monsters || []).some((m) => m.id === id));
    if (!killed) { await steerTo(nearestWolf, 40, 900, true); await sleep(150); }
  }
  if (!killed) return false;
  await sleep(400); // chờ server_tick mang danh sách đồ rơi mới
  const myDrops = (S.tick?.drops || []).slice();
  for (const d of myDrops) {
    // đi tới vị trí đồ rơi; đồ tự nhặt khi đủ gần (hoặc đã nhặt ngay lúc hạ)
    await steerTo({ x: d.x, y: d.y }, 12, 8000);
    await sleep(250);
  }
  return true;
}
async function farmUntil(cond, maxKills = 14) {
  let kills = 0;
  while (!cond() && kills < maxKills) {
    if (!(await killAndCollect())) break;
    kills++;
    await sleep(300);
  }
  return cond();
}
(async () => {
  await new Promise((r) => s.on('connect', r));
  s.emit('hello', { token: TOKEN });
  await sleep(700);
  check('Tạo nhân vật: Phàm nhân, 0 Linh thạch', !!S.char && S.char.stones === 0 && !S.char.linhCan, `stones=${S.char?.stones}`);
  check('Tick có 3 NPC làng', (S.tick?.npcs || []).length === 3, (S.tick?.npcs || []).map((n) => n.name).join(', '));

  await steerTo({ x: 700, y: 470 }, 25);
  await steerTo({ x: 700, y: 384 }, 18);
  s.emit('measure_linhcan');
  await sleep(700);
  check('Đo linh căn xong', !!S.char?.linhCan);

  // Nhận cả 2 nhiệm vụ ở Bảng treo thưởng
  await steerTo({ x: 800, y: 668 }, 40);
  s.emit('quest_accept', { questId: 'q_dietsoi' });
  await sleep(400);
  s.emit('quest_accept', { questId: 'q_nanhsoi' });
  await sleep(500);
  check('Nhận đủ 2 nhiệm vụ tại bảng', !!S.char?.quests?.q_dietsoi && !!S.char?.quests?.q_nanhsoi);

  // Farm: đủ 5 sói cho nhiệm vụ + tối thiểu 1 Nanh Sói rơi và nhặt được
  const okFarm = await farmUntil(
    () => S.char?.quests?.q_dietsoi?.state === 'done' && (S.char?.inventory?.nanh_soi || 0) >= 1,
    14,
  );
  check('Nhiệm vụ diệt sói: đạt 5/5 → trạng thái done', S.char?.quests?.q_dietsoi?.state === 'done', `progress=${S.char?.quests?.q_dietsoi?.progress}`);
  check('Nhặt được Linh thạch từ đồ rơi (≥15 = 5 con × tối thiểu 3)', (S.char?.stones || 0) >= 15, `stones=${S.char?.stones}`);
  check('Nhặt được ít nhất 1 Nanh Sói rơi', (S.char?.inventory?.nanh_soi || 0) >= 1, `nanh=${S.char?.inventory?.nanh_soi || 0}`);
  check('Farm đạt điều kiện tổng', okFarm);

  // Trả nhiệm vụ diệt sói ở Trưởng Làng: +25 LT
  const sBefore = S.char.stones;
  await steerTo({ x: 387, y: 541 }, 40);
  s.emit('quest_claim', { questId: 'q_dietsoi' });
  await sleep(600);
  check('Trả nhiệm vụ diệt sói: +25 Linh thạch', S.char?.stones === sBefore + 25 && !S.char?.quests?.q_dietsoi, `stones=${S.char?.stones}`);

  // Mua đan ở Tiệm Đan
  await steerTo({ x: 1012, y: 541 }, 40);
  const sBuy = S.char.stones;
  s.emit('shop_buy', { shopId: 'tiem_dan', itemId: 'dan_tu_khi' });
  await sleep(600);
  check('Mua Đan Tụ Khí: −30 LT, vào túi', S.char?.stones === sBuy - 30 && (S.char?.inventory?.dan_tu_khi || 0) === 1, `stones=${S.char?.stones}`);
  const tuViBefore = S.char.tuVi;
  s.emit('use_item', { itemId: 'dan_tu_khi' });
  await sleep(600);
  check('Dùng Đan Tụ Khí: +50 Tu vi đúng luật', S.char?.tuVi === tuViBefore + 50 && (S.char?.inventory?.dan_tu_khi || 0) === 0, `tuVi=${S.char?.tuVi}`);

  // Hồi Xuân Đan: bị cắn mất máu → về làng dùng đan → hồi đúng 50% HP tối đa
  await farmUntil(() => false, 0); // no-op giữ cấu trúc
  const okHurt = await (async () => {
    const t0 = Date.now();
    while (Date.now() - t0 < 30000) {
      const p = me();
      if (p && p.hp < p.maxHp) return true;
      await steerTo(nearestWolf, 40, 900, false);
      await sleep(150);
    }
    return false;
  })();
  check('Bị sói cắn mất máu', okHurt, `hp=${me()?.hp}/${me()?.maxHp}`);
  await steerTo({ x: 1012, y: 541 }, 40);
  if ((S.char?.stones || 0) < 15) await farmUntil(() => (S.char?.stones || 0) >= 15, 4);
  s.emit('shop_buy', { shopId: 'tiem_dan', itemId: 'dan_hoi_xuan' });
  await sleep(600);
  check('Mua Hồi Xuân Đan: −15 LT', (S.char?.inventory?.dan_hoi_xuan || 0) === 1, `stones=${S.char?.stones}`);
  const hpBefore = me()?.hp ?? 0, maxHp = me()?.maxHp ?? 1;
  s.emit('use_item', { itemId: 'dan_hoi_xuan' });
  await sleep(700);
  const hpAfter = me()?.hp ?? 0;
  const expectHp = Math.min(maxHp, hpBefore + Math.round(maxHp * 0.5));
  check('Dùng Hồi Xuân Đan: hồi đúng 50% HP tối đa', hpAfter === expectHp, `hp ${hpBefore} → ${hpAfter} (kỳ vọng ${expectHp})`);

  // Tiệm Nguyên Liệu: bán 1 nanh (+5), mua đủ 3 nanh (−12/cái) rồi trả nhiệm vụ nanh
  await goToNguyenLieu();
  const sSell = S.char.stones, fSell = S.char.inventory?.nanh_soi || 0;
  s.emit('shop_sell', { shopId: 'tiem_nguyen_lieu', itemId: 'nanh_soi' });
  await sleep(600);
  check('Bán Nanh Sói: +5 LT (≈40% giá mua 12)', S.char?.stones === sSell + 5 && (S.char?.inventory?.nanh_soi || 0) === fSell - 1, `stones=${S.char?.stones}`);
  const need = 3 - (S.char?.inventory?.nanh_soi || 0);
  if (need > 0) {
    if ((S.char?.stones || 0) < need * 12) await farmUntil(() => (S.char?.stones || 0) >= need * 12, 5);
    await goToNguyenLieu();
    const sBuyF = S.char.stones, fBuyF = S.char?.inventory?.nanh_soi || 0;
    for (let i = 0; i < need; i++) { s.emit('shop_buy', { shopId: 'tiem_nguyen_lieu', itemId: 'nanh_soi' }); await sleep(350); }
    await sleep(500);
    check(`Mua ${need} Nanh Sói: −${need * 12} LT`, S.char?.stones === sBuyF - need * 12 && (S.char?.inventory?.nanh_soi || 0) === fBuyF + need, `nanh=${S.char?.inventory?.nanh_soi}`);
  } else {
    check('Đã sẵn ≥3 Nanh Sói, không cần mua', true);
  }
  const sClaim = S.char.stones, fClaim = S.char?.inventory?.nanh_soi || 0;
  await steerTo({ x: 387, y: 541 }, 40);
  s.emit('quest_claim', { questId: 'q_nanhsoi' });
  await sleep(600);
  check('Trả nhiệm vụ nanh: +20 LT, trừ 3 nanh, hết nhiệm vụ', S.char?.stones === sClaim + 20 && (S.char?.inventory?.nanh_soi || 0) === fClaim - 3 && !S.char?.quests?.q_nanhsoi, `stones=${S.char?.stones}`);

  // Lưu trữ: nối lại cùng token
  const finalStones = S.char.stones;
  s.disconnect();
  await sleep(600);
  const s2 = io(URL, { transports: ['websocket'] });
  const got = await new Promise((resolve) => {
    s2.on('connect', () => s2.emit('hello', { token: TOKEN }));
    s2.on('welcome', (w) => resolve(w.character));
    setTimeout(() => resolve(null), 6000);
  });
  check('Vào lại: còn nguyên Linh thạch sau mọi giao dịch', !!got && got.stones === finalStones, `stones=${got?.stones} vs ${finalStones}`);
  s2.disconnect();
  console.log(fail === 0 ? 'ALL PASS' : `FAILURES: ${fail}`);
  process.exit(fail === 0 ? 0 : 1);
})().catch((e) => { console.error('TEST ERROR', e); process.exit(2); });
