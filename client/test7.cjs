// Test GĐ7 (chạy trên instance test cổng 3002, TTT_TUVI_NEED=5):
// linh căn + công pháp + Tu vi + đột phá + cộng điểm + học chiêu + lưu trữ
const { io } = require('socket.io-client');
const { createMerger } = require('./worldmerge.cjs');
const URL = 'http://localhost:3002';
const TOKEN = 'tok-test7-' + Date.now().toString(36);
const ELEMENTS = ['Kim', 'Mộc', 'Thủy', 'Hỏa', 'Thổ'];
const DOOR = { x: 700, y: 378 };
let failures = 0;
const check = (name, ok, extra = '') => { console.log((ok ? 'PASS' : 'FAIL') + ' | ' + name + (extra ? ' | ' + extra : '')); if (!ok) failures++; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const s = io(URL, { transports: ['websocket'] });
const S = { tick: null, char: null, hint: 0, errors: [], linhcan: null, learned: null, breakthrough: null, casts: [] };
const mergeTick = createMerger();
s.on('server_tick', (t) => { S.tick = mergeTick(t); });
s.on('welcome', (w) => { S.char = w.character; });
s.on('char_sync', (c) => { S.char = c; });
s.on('no_linhcan_hint', () => { S.hint++; });
s.on('interact_error', (e) => S.errors.push(e.message));
s.on('linhcan_result', (r) => { S.linhcan = r.linhCan; });
s.on('skill_learned', (r) => { S.learned = r.skill; });
s.on('breakthrough_ok', (r) => { S.breakthrough = r; });
s.on('cast_result', (r) => S.casts.push(r));
const me = () => S.tick?.players.find((p) => p.id === s.id);
const distTo = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

// Điều hướng: chạy về phía điểm/mồi, dừng khi đủ gần; tấn công nếu asked
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
const nearestWolf = () => {
  const p = me();
  if (!p || !S.tick) return null;
  let best = null, bd = Infinity;
  for (const m of S.tick.monsters) { const d = distTo(p, m); if (d < bd) { bd = d; best = m; } }
  return best;
};
async function killWolf(timeoutMs = 30000) {
  const before = new Set((S.tick?.monsters || []).map((m) => m.id));
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    const killed = (S.tick?.monsters || []).length < before.size &&
      [...before].some((id) => !(S.tick?.monsters || []).some((m) => m.id === id));
    if (killed) return true;
    await steerTo(nearestWolf, 40, 900, true);
    await sleep(150); // nghỉ giữa các vòng, tránh quay tít nghẽn socket
  }
  return false;
}

(async () => {
  await sleep(500);
  // Tạo nhân vật Kiếm tu
  s.on('need_character', () => s.emit('request_roll'));
  s.on('roll_result', () => s.emit('create_character', { token: TOKEN, name: 'Tu Vi Tử', classId: 'kiemtu' }));
  s.emit('hello', { token: TOKEN });
  await sleep(900);
  check('Khởi đầu: Phàm nhân, chưa linh căn, chưa có chiêu', !!S.char && S.char.realm === 'pham' && S.char.linhCan === null && S.char.skills.length === 0 && S.char.tuViNeed === null);
  const st = S.char.stats;

  // Phàm nhân hạ sói → KHÔNG được Tu vi, nhận gợi ý đo linh căn
  const killed0 = await killWolf(40000);
  await sleep(400);
  check('Phàm nhân vẫn hạ được sói', killed0);
  check('Phàm nhân hạ sói: Tu vi vẫn 0 + có gợi ý linh căn', S.char.tuVi === 0 && S.hint >= 1, `tuVi=${S.char.tuVi} hint=${S.hint}`);

  // Đo linh căn từ xa → bị từ chối; tới nơi → thành công
  S.errors = [];
  s.emit('measure_linhcan');
  await sleep(400);
  check('Đo linh căn từ xa bị từ chối', S.errors.length >= 1);
  await steerTo(() => DOOR, 40, 15000);
  s.emit('measure_linhcan');
  await sleep(600);
  const lc = S.linhcan;
  check('Đo linh căn thành công', !!lc && lc.count >= 1 && lc.count <= 5 && lc.main === lc.elements[0] && lc.elements.every((e) => ELEMENTS.includes(e)) && new Set(lc.elements).size === lc.count,
    lc ? `${lc.elements.join('+')} (${lc.count} hệ)` : 'không có kết quả');
  check('Lên Luyện Khí 1 + nhận 2 công pháp Cơ bản', !!S.char && S.char.realm === 'lk' && S.char.tier === 1 && S.char.skills.length === 2 && S.char.tuViNeed === 5,
    S.char ? `skills=${S.char.skills.map((x) => x.name).join(', ')}` : '');

  // Tung chiêu khi không có quái trong tầm → lỗi range, không tốn Chân nguyên
  await steerTo(() => ({ x: 700, y: 560 }), 30, 15000);
  const mpFull = S.char.maxMp;
  S.casts = [];
  s.emit('cast_skill', { slot: 0 });
  await sleep(500);
  check('Tung chiêu ngoài tầm: báo range', S.casts.length === 1 && !S.casts[0].ok && S.casts[0].reason === 'range');

  // Tới gần sói, tung chiêu 1: sát thương = 1.0×(Vật công+10), tốn 8 Chân nguyên, rồi hồi chiêu
  const expDmg = Math.round(1.0 * (st.vatCong + 10));
  await steerTo(nearestWolf, 45, 20000); // GĐ33: chiêu Cơ bản của Kiếm là chém gần (tầm 60) — phải áp sát
  const wolfBefore = nearestWolf();
  S.casts = [];
  s.emit('cast_skill', { slot: 0 });
  await sleep(600);
  const cast1 = S.casts[0];
  const wolfAfter = S.tick?.monsters.find((m) => m.id === wolfBefore?.id);
  // GĐ34: Trảm Kiếm có thêm đốt theo thời gian → HP sói tụt NHIỀU HƠN sát thương đòn đầu
  check('Tung Kiếm Khí Trảm: trúng + đúng sát thương công thức', !!cast1 && cast1.ok && cast1.dmg === expDmg && !!wolfAfter && wolfAfter.hp <= wolfBefore.hp - expDmg,
    `dmg=${cast1?.dmg} expected=${expDmg}`);
  // GĐ32: tốn chân nguyên nhân hệ số lớp của file — Kiếm tu ×0.8 → chiêu gốc 8 tốn 6
  check('Trừ đúng 6 Chân nguyên (8 gốc × hệ số Kiếm tu 0.8)', S.char.mp >= mpFull - 7 && S.char.mp <= mpFull - 5, `mp=${S.char.mp}/${mpFull}`);
  S.casts = [];
  s.emit('cast_skill', { slot: 0 });
  await sleep(400);
  check('Tung lại ngay: dính hồi chiêu', S.casts.length === 1 && !S.casts[0].ok && S.casts[0].reason === 'cooldown');

  // Farm: hạ sói → +3 Tu vi/con; đủ 5 → đột phá
  const tuViBefore = S.char.tuVi;
  const killed1 = await killWolf(40000);
  await sleep(400);
  check('Hạ sói sau linh căn: +3 Tu vi', killed1 && S.char.tuVi === tuViBefore + 3, `tuVi=${S.char.tuVi}`);
  while (S.char.tuVi < 5) { if (!await killWolf(40000)) break; await sleep(300); }
  check('Farm đủ ngưỡng đột phá (test: 5)', S.char.tuVi >= 5, `tuVi=${S.char.tuVi}`);
  const tuViPreBreak = S.char.tuVi;
  s.emit('breakthrough');
  await sleep(600);
  check('Đột phá → Luyện Khí tầng 2', !!S.breakthrough && S.breakthrough.tier === 2 && S.char.tier === 2);
  check('Đột phá: trừ đúng nhu cầu, nhận 2–5 điểm chỉ số', S.char.tuVi === tuViPreBreak - 5 && S.char.statPoints >= 2 && S.char.statPoints <= 5 && S.char.tuViNeed === 6,
    `tuVi=${S.char.tuVi} points=${S.char.statPoints} needNext=${S.char.tuViNeed}`);
  S.errors = [];
  s.emit('breakthrough');
  await sleep(400);
  check('Đột phá tiếp khi thiếu Tu vi → bị từ chối', S.errors.length >= 1 && S.char.tier === 2);

  // Cộng điểm: điểm đột phá +2, điểm tự do +1
  const khBefore = S.char.stats.khiHuyet, hpBefore = S.char.maxHp, ptsBefore = S.char.statPoints;
  s.emit('allocate_stat', { pool: 'stat', stat: 'khiHuyet' });
  await sleep(500);
  check('Cộng điểm đột phá: Khí huyết +2, HP tối đa +20', S.char.stats.khiHuyet === khBefore + 2 && S.char.maxHp === hpBefore + 20 && S.char.statPoints === ptsBefore - 1);
  const vcBefore = S.char.stats.vatCong;
  s.emit('allocate_stat', { pool: 'free', stat: 'vatCong' });
  await sleep(500);
  check('Cộng điểm tự do: Vật công +1, còn 9 điểm', S.char.stats.vatCong === vcBefore + 1 && S.char.freePoints === 9);

  // Học công pháp Luyện Khí: tầng 2 bị từ chối; lên tầng 3 thì học được
  await steerTo(() => DOOR, 40, 15000);
  S.errors = [];
  s.emit('learn_skill');
  await sleep(400);
  check('Học chiêu Luyện Khí ở tầng 2 → bị từ chối (cần tầng 3)', S.errors.length >= 1 && S.char.skills.length === 2);
  while (S.char.tuVi < 6) { if (!await killWolf(40000)) break; await sleep(300); }
  s.emit('breakthrough');
  await sleep(600);
  check('Đột phá → tầng 3', S.char.tier === 3, `tuVi=${S.char.tuVi}`);
  await steerTo(() => DOOR, 40, 15000);
  s.emit('learn_skill');
  await sleep(600);
  // GĐ31: học công pháp TỐN THỜI GIAN — tầng 3 chỉ mới BẮT ĐẦU lĩnh ngộ (1 ngày game), chưa có chiêu ngay
  // GĐ32: lĩnh ngộ theo phút game — chiêu LK cần < 720 phút gốc (nửa ngày, rút ngắn theo Thần thức)
  check('Tầng 3: bắt đầu lĩnh ngộ Ngự Kiếm Quyết (chưa học ngay)', !!S.char.learning && S.char.learning.skillId === 'kiemtu_3' && S.char.learning.needMin > 0 && S.char.learning.needMin <= 720 && S.char.skills.length === 2);

  // Lưu trữ: vào lại còn nguyên tiến trình
  s.disconnect();
  await sleep(400);
  const s2 = io(URL, { transports: ['websocket'] });
  let char2 = null;
  s2.on('welcome', (w) => { char2 = w.character; });
  await sleep(500);
  s2.emit('hello', { token: TOKEN });
  await sleep(800);
  check('Vào lại: còn nguyên cảnh giới/chỉ số/chiêu + đang lĩnh ngộ dở', !!char2 && char2.tier === 3 && char2.skills.length === 2 && !!char2.learning && char2.stats.khiHuyet === khBefore + 2 && char2.stats.vatCong === vcBefore + 1 && !!char2.linhCan);
  s2.disconnect();

  console.log(failures === 0 ? 'ALL PASS' : failures + ' FAILURES');
  process.exit(failures === 0 ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(1); });
