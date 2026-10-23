// Test GĐ11: vũ khí khởi đầu theo lớp + đánh thường theo tốc độ/tầm vũ khí
// + bảng màu áo pastel mới. Server test riêng:
// PORT=3006 TTT_CHAR_FILE=/tmp/chars-test11.json TTT_ACC_FILE=/tmp/acc-test11.json node server/index.js
const { io } = require('socket.io-client');
const { createMerger } = require('./worldmerge.cjs');
const { makeSteer } = require('./steer.cjs');
const URL = process.env.TEST_URL || 'http://localhost:3006';
let pass = 0, fail = 0;
const ok = (cond, label) => { if (cond) { pass++; console.log('  PASS', label); } else { fail++; console.log('  FAIL', label); } };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function connect() {
  return new Promise((resolve) => {
    const s = io(URL, { transports: ['websocket'] });
    s.on('connect', () => resolve(s));
  });
}
function waitEvent(s, ev, timeout = 5000) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('timeout chờ ' + ev)), timeout);
    s.once(ev, (d) => { clearTimeout(t); resolve(d); });
  });
}
async function makeGuestChar(weaponId, classId, robe) {
  const s = await connect();
  const token = 'tok-test11-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
  const apply = createMerger();
  const S = { tick: null };
  s.on('server_tick', (t) => { const snap = apply(t); if (snap) S.tick = snap; });
  const welP = waitEvent(s, 'welcome');
  s.emit('hello', { token });
  await waitEvent(s, 'need_character');
  s.emit('request_roll');
  await waitEvent(s, 'roll_result');
  s.emit('create_character', { token, name: 'Test Vũ Khí', classId, weaponId, robe });
  const wel = await welP;
  const me = () => (S.tick ? S.tick.players.find((p) => p.id === wel.id) : null);
  const steerTo = makeSteer(s, S, me);
  return { s, wel, S, me, steerTo };
}
function nearestWolf(S, p) {
  let best = null, bd = Infinity;
  for (const m of (S.tick ? S.tick.monsters : [])) {
    const d = Math.hypot(m.x - p.x, m.y - p.y);
    if (d < bd) { bd = d; best = m; }
  }
  return { wolf: best, dist: bd };
}
function wolfById(S, id) {
  return S.tick ? S.tick.monsters.find((m) => m.id === id) : null;
}

(async () => {
  // 1) Tạo nhân vật Pháp tu + Sách phép (tầm xa) + màu pastel mới
  const a = await makeGuestChar('sachphep', 'phaptu', '#e8a0a0');
  ok(a.wel.character.weaponName === 'Sách phép' && a.wel.character.weaponId === 'sachphep', 'welcome có vũ khí Sách phép');
  ok(a.wel.character.robe === '#e8a0a0', 'màu áo pastel mới được chấp nhận');

  // 2) Màu chói cũ không còn trong danh sách → set_robe bị bỏ qua
  let syncOld = null;
  a.s.once('char_sync', (d) => { syncOld = d; });
  a.s.emit('set_robe', { robe: '#c22e35' });
  await sleep(400);
  ok(syncOld === null, 'màu cũ #c22e35 không còn được nhận (đã thay bằng pastel)');

  // 3) Vũ khí không thuộc lớp → server tự lấy vũ khí đầu của lớp
  const b = await makeGuestChar('phien', 'kiemtu');
  ok(b.wel.character.weaponId === 'kiem' && b.wel.character.weaponName === 'Kiếm', 'vũ khí sai lớp → tự về Kiếm (đầu danh sách Kiếm tu)');
  b.s.disconnect();

  // 4) Tầm xa: Pháp tu đứng cách sói ~120px vẫn đánh trúng bằng đánh thường.
  //    Sói sẽ đuổi theo nên bám mục tiêu động: dừng ở vòng 120px quanh sói.
  await sleep(300);
  let p = a.me();
  let { wolf } = nearestWolf(a.S, p);
  ok(!!wolf, 'thấy sói trên tick');
  const wolfId = wolf.id;
  await a.steerTo((tick, me2) => {
    const w = tick.monsters.find((m) => m.id === wolfId);
    return w ? { x: w.x - 120, y: w.y } : me2;
  }, 10, 25000);
  p = a.me();
  const wNow = wolfById(a.S, wolfId);
  const distNow = Math.hypot(wNow.x - p.x, wNow.y - p.y);
  const hpBefore = wNow.hp;
  a.s.emit('player_attack');
  await sleep(500);
  const wAfter = wolfById(a.S, wolfId);
  ok(distNow > 55 && distNow <= 155, `đứng ở khoảng cách tầm xa (${Math.round(distNow)}px)`);
  ok(!!wAfter && wAfter.hp < hpBefore, `đánh thường tầm xa trúng: HP sói ${hpBefore} → ${wAfter ? wAfter.hp : '?'}`);
  a.s.disconnect();

  // 5) Cận chiến: Kiếm tu + Trọng kiếm — đứng ~120px đánh hụt; áp sát trúng;
  //    đòn thứ 2 ngay sau đó bị hồi chiêu vũ khí Chậm chặn.
  const c = await makeGuestChar('trongkiem', 'kiemtu');
  await sleep(300);
  p = c.me();
  ({ wolf } = nearestWolf(c.S, p));
  const wolfId2 = wolf.id;
  // Tới vòng 120px quanh sói rồi đánh ngay 1 đòn
  await c.steerTo((tick, me2) => {
    const w = tick.monsters.find((m) => m.id === wolfId2);
    return w ? { x: w.x - 120, y: w.y } : me2;
  }, 10, 25000);
  const wFar = wolfById(c.S, wolfId2);
  const hpFar = wFar.hp;
  c.s.emit('player_attack');
  await sleep(400);
  const wFar2 = wolfById(c.S, wolfId2);
  ok(!!wFar2 && wFar2.hp === hpFar, 'vũ khí cận chiến đứng ~120px đánh hụt');
  // Áp sát vào tầm 30px (sói đuổi theo nên mục tiêu động), chờ hết CD đòn hụt
  await sleep(700);
  await c.steerTo((tick, me2) => {
    const w = tick.monsters.find((m) => m.id === wolfId2);
    return w || me2;
  }, 30, 25000);
  const wNear = wolfById(c.S, wolfId2);
  const hpNear = wNear.hp;
  c.s.emit('player_attack');
  await sleep(350);
  const w1 = wolfById(c.S, wolfId2);
  ok(!w1 || w1.hp < hpNear, `áp sát đánh trúng bằng Trọng kiếm (HP ${hpNear} → ${w1 ? w1.hp : 'chết'})`);
  if (w1) {
    const hp1 = w1.hp;
    c.s.emit('player_attack'); // ngay lập tức: CD chậm ~600ms phải chặn
    await sleep(300);
    const w2 = wolfById(c.S, wolfId2);
    ok(!!w2 && w2.hp === hp1, 'đòn thứ 2 bị hồi chiêu vũ khí Chậm chặn');
  } else {
    ok(true, 'sói chết ngay đòn đầu (bỏ qua kiểm tra hồi chiêu)');
  }
  c.s.disconnect();

  console.log(`\nKẾT QUẢ: ${pass} PASS / ${fail} FAIL`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error('LỖI TEST:', e.message); process.exit(1); });
