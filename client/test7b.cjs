// Test GĐ7b (instance sạch cổng 3003, TTT_TUVI_NEED=3): chạy trọn luồng
// linh căn → tung chiêu → farm → đột phá ×2 → học chiêu LK → cộng điểm → lưu trữ
const { io } = require('socket.io-client');
const { createMerger } = require('./worldmerge.cjs');
const URL = 'http://localhost:3003';
const TOKEN = 'tok-test7b-' + Date.now().toString(36);
const DOOR = { x: 700, y: 378 };
let failures = 0;
const check = (name, ok, extra = '') => { console.log((ok ? 'PASS' : 'FAIL') + ' | ' + name + (extra ? ' | ' + extra : '')); if (!ok) failures++; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const s = io(URL, { transports: ['websocket'] });
const S = { tick: null, char: null, errors: [], linhcan: null, learned: null, breakthrough: null, casts: [] };
const mergeTick = createMerger();
s.on('server_tick', (t) => { S.tick = mergeTick(t); });
s.on('welcome', (w) => { S.char = w.character; });
s.on('char_sync', (c) => { S.char = c; });
s.on('interact_error', (e) => S.errors.push(e.message));
s.on('linhcan_result', (r) => { S.linhcan = r.linhCan; });
s.on('skill_learned', (r) => { S.learned = r.skill; });
s.on('breakthrough_ok', (r) => { S.breakthrough = r; });
s.on('cast_result', (r) => S.casts.push(r));
const me = () => S.tick?.players.find((p) => p.id === s.id);
const distTo = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const nearestWolf = () => {
  const p = me();
  if (!p || !S.tick) return null;
  let best = null, bd = Infinity;
  for (const m of S.tick.monsters) { const d = distTo(p, m); if (d < bd) { bd = d; best = m; } }
  return best;
};
async function steerTo(getTarget, stopDist, timeoutMs, attack = false) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    const p = me();
    const tgt = getTarget();
    if (!p || !tgt) { await sleep(120); continue; }
    const d = distTo(p, tgt);
    if (d <= stopDist) {
      s.emit('client_input', { vx: 0, vy: 0 });
      if (attack) s.emit('player_attack');
      return true;
    }
    s.emit('client_input', { vx: Math.sign(tgt.x - p.x), vy: Math.sign(tgt.y - p.y) });
    if (attack && d <= 48) s.emit('player_attack');
    await sleep(120);
  }
  s.emit('client_input', { vx: 0, vy: 0 });
  return false;
}
async function killWolf(timeoutMs = 45000) {
  const ids = new Set((S.tick?.monsters || []).map((m) => m.id));
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    if ([...ids].some((id) => !(S.tick?.monsters || []).some((m) => m.id === id))) return true;
    await steerTo(nearestWolf, 40, 900, true);
    await sleep(150); // QUAN TRỌNG: nghỉ giữa các vòng, tránh quay tít nghẽn socket
  }
  return false;
}

(async () => {
  await sleep(500);
  s.on('need_character', () => s.emit('request_roll'));
  s.on('roll_result', () => s.emit('create_character', { token: TOKEN, name: 'Chứng Nghiệm Tử', classId: 'kiemtu' }));
  s.emit('hello', { token: TOKEN });
  await sleep(900);
  check('Tạo nhân vật: Phàm nhân', !!S.char && S.char.realm === 'pham' && S.char.skills.length === 0);
  const st = { ...S.char.stats };

  // Linh căn tại Đạo Quán
  await steerTo(() => DOOR, 40, 15000);
  s.emit('measure_linhcan');
  await sleep(600);
  check('Đo linh căn → Luyện Khí 1, 2 công pháp, nhu cầu tầng 1 = 3 (env test)',
    !!S.linhcan && S.char.realm === 'lk' && S.char.tier === 1 && S.char.skills.length === 2 && S.char.tuViNeed === 3,
    S.linhcan ? S.linhcan.elements.join('+') : '');

  // Tung chiêu: ngoài tầm (ở quảng trường) → range; tới gần → trúng đúng công thức + tốn CN + hồi chiêu
  await steerTo(() => ({ x: 700, y: 560 }), 30, 15000);
  S.casts = [];
  s.emit('cast_skill', { slot: 0 });
  await sleep(450);
  check('Chiêu ngoài tầm → range, không tốn CN', S.casts.length === 1 && !S.casts[0].ok && S.casts[0].reason === 'range' && S.char.mp === S.char.maxMp);
  const expDmg = Math.round(1.0 * (st.vatCong + 10));
  await steerTo(nearestWolf, 110, 20000);
  const wBefore = nearestWolf();
  S.casts = [];
  s.emit('cast_skill', { slot: 0 });
  await sleep(600);
  const wAfter = S.tick?.monsters.find((m) => m.id === wBefore?.id);
  check('Kiếm Khí Trảm trúng đúng công thức', !!S.casts[0] && S.casts[0].ok && S.casts[0].dmg === expDmg && !!wAfter && wAfter.hp === wBefore.hp - expDmg,
    `dmg=${S.casts[0]?.dmg} exp=${expDmg}`);
  check('Tốn đúng 8 Chân nguyên', S.char.mp >= S.char.maxMp - 9 && S.char.mp <= S.char.maxMp - 7, `mp=${S.char.mp}/${S.char.maxMp}`);
  S.casts = [];
  s.emit('cast_skill', { slot: 0 });
  await sleep(400);
  check('Tung lại dính hồi chiêu', S.casts.length === 1 && !S.casts[0].ok && S.casts[0].reason === 'cooldown');

  // Farm 1 con → tuVi 3 → đột phá tầng 2
  check('Hạ sói được +3 Tu vi', (await killWolf()) && S.char.tuVi === 3, `tuVi=${S.char.tuVi}`);
  s.emit('breakthrough');
  await sleep(600);
  check('Đột phá tầng 2: tuVi về 0, nhận 2–5 điểm, nhu cầu kế = 3',
    !!S.breakthrough && S.char.tier === 2 && S.char.tuVi === 0 && S.char.statPoints >= 2 && S.char.statPoints <= 5 && S.char.tuViNeed === 3,
    `points=${S.char.statPoints}`);

  // Cộng điểm đột phá (+2 Khí huyết)
  const kh = S.char.stats.khiHuyet, maxHp = S.char.maxHp;
  s.emit('allocate_stat', { pool: 'stat', stat: 'khiHuyet' });
  await sleep(500);
  check('Cộng điểm: Khí huyết +2 → HP tối đa +20', S.char.stats.khiHuyet === kh + 2 && S.char.maxHp === maxHp + 20);

  // Farm tiếp → đột phá tầng 3 → học Ngự Kiếm Quyết tại Đạo Quán
  check('Farm đủ tu vi tầng 3', (await killWolf()) && S.char.tuVi >= 3, `tuVi=${S.char.tuVi}`);
  s.emit('breakthrough');
  await sleep(600);
  check('Đột phá tầng 3', S.char.tier === 3);
  await steerTo(() => DOOR, 40, 15000);
  s.emit('learn_skill');
  await sleep(600);
  check('Học được Ngự Kiếm Quyết (ô 3, hệ số 1.6)', !!S.learned && S.learned.id === 'kiemtu_3' && S.char.skills.length === 3 && S.char.skills[2].coef === 1.6);

  // Tung thử chiêu Luyện Khí: sát thương = 1.6×(VC+10)
  const expDmg3 = Math.round(1.6 * (S.char.stats.vatCong + 10));
  await steerTo(nearestWolf, 150, 20000);
  const w3 = nearestWolf();
  S.casts = [];
  s.emit('cast_skill', { slot: 2 });
  await sleep(600);
  const w3After = S.tick?.monsters.find((m) => m.id === w3?.id);
  check('Ngự Kiếm Quyết trừ đúng 1.6×(Vật công+10)', !!S.casts[0] && S.casts[0].ok && S.casts[0].dmg === expDmg3 && !!w3After && w3After.hp === w3.hp - expDmg3,
    `dmg=${S.casts[0]?.dmg} exp=${expDmg3}`);

  // Lưu trữ tiến trình
  s.disconnect();
  await sleep(400);
  const s2 = io(URL, { transports: ['websocket'] });
  let char2 = null;
  s2.on('welcome', (w) => { char2 = w.character; });
  await sleep(500);
  s2.emit('hello', { token: TOKEN });
  await sleep(800);
  check('Vào lại: còn nguyên tầng 3 + 3 chiêu + linh căn + chỉ số đã cộng',
    !!char2 && char2.tier === 3 && char2.skills.length === 3 && !!char2.linhCan && char2.stats.khiHuyet === kh + 2);
  s2.disconnect();

  console.log(failures === 0 ? 'ALL PASS' : failures + ' FAILURES');
  process.exit(failures === 0 ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(1); });
