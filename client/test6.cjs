// Test GĐ6: tạo nhân vật + bốc chỉ số + công thức sát thương + sói cắn + chết/hồi sinh + lưu server
const { io } = require('socket.io-client');
const { createMerger } = require('./worldmerge.cjs');
const URL = 'http://localhost:3001';
const TOKEN = 'tok-test6-' + Date.now().toString(36);
const STAT_KEYS = ['khiHuyet', 'vatCong', 'vatPhong', 'phapCong', 'phapPhong', 'tocDo', 'thanThuc'];
let failures = 0;
const check = (name, ok, extra = '') => { console.log((ok ? 'PASS' : 'FAIL') + ' | ' + name + (extra ? ' | ' + extra : '')); if (!ok) failures++; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function connect() {
  const s = io(URL, { transports: ['websocket'] });
  s.state = { tick: null, welcome: null, needChar: false, died: false, killed: [] };
  const mergeT = createMerger();
  s.on('server_tick', (t) => { s.state.tick = mergeT(t); });
  s.on('welcome', (w) => { s.state.welcome = w; });
  s.on('need_character', () => { s.state.needChar = true; });
  s.on('you_died', () => { s.state.died = true; });
  s.on('monster_killed', (e) => s.state.killed.push(e));
  return s;
}
const myPos = (s) => s.state.tick?.players.find((p) => p.id === s.id);

(async () => {
  // --- 1. Kết nối mới → phải tạo nhân vật ---
  const s = connect();
  await sleep(500);
  s.emit('hello', { token: TOKEN });
  await sleep(600);
  check('Token mới → server yêu cầu tạo nhân vật', s.state.needChar && !s.state.welcome);

  // --- 2. Bốc chỉ số 3 lượt ---
  const rolls = [];
  const rollOnce = () => new Promise((res) => { s.once('roll_result', res); s.emit('request_roll'); });
  for (let i = 0; i < 3; i++) rolls.push(await rollOnce());
  const inRange = rolls.every((r) => STAT_KEYS.every((k) => r.stats[k] >= 1 && r.stats[k] <= 10));
  check('3 lượt bốc: mỗi chỉ số 1–10', inRange, JSON.stringify(rolls.map((r) => r.rollsLeft)));
  check('Số lượt còn lại đi đúng 2→1→0', rolls[0].rollsLeft === 2 && rolls[1].rollsLeft === 1 && rolls[2].rollsLeft === 0);
  const total3 = STAT_KEYS.reduce((a, k) => a + rolls[2].stats[k], 0);
  check('Lượt bốc 3: tổng ≥ 10 (luật file)', total3 >= 10, 'tổng=' + total3);
  let fourthAnswered = false;
  s.once('roll_result', () => { fourthAnswered = true; });
  s.emit('request_roll');
  await sleep(500);
  check('Bốc lần 4 bị từ chối (tối đa 3 lượt)', !fourthAnswered);

  // --- 3. Tạo nhân vật Kiếm tu ---
  s.emit('create_character', { token: TOKEN, name: 'Lăng Vân Tử', classId: 'kiemtu' });
  await sleep(700);
  const w = s.state.welcome;
  check('Tạo nhân vật → welcome', !!w);
  const st = rolls[2].stats;
  const expMaxHp = 100 + st.khiHuyet * 10;
  const expMaxMp = st.thanThuc * 10;
  check('Chỉ số nhân vật = lượt bốc cuối (server giữ)', !!w && STAT_KEYS.every((k) => w.character.stats[k] === st[k]));
  check('HP tối đa = 100 + Khí huyết×10', !!w && w.character.maxHp === expMaxHp, w ? `${w.character.maxHp} (KH=${st.khiHuyet})` : '');
  check('Chân nguyên tối đa = Thần thức×10', !!w && w.character.maxMp === expMaxMp, w ? `${w.character.maxMp} (TT=${st.thanThuc})` : '');
  check('Có 10 điểm tự do chưa cộng', !!w && w.character.freePoints === 10);

  // --- 4. Tick mang tên + HP thật ---
  await sleep(400);
  const me0 = myPos(s);
  check('Tick hiện tên nhân vật + HP đầy', !!me0 && me0.name === 'Lăng Vân Tử' && me0.hp === expMaxHp && me0.maxHp === expMaxHp, me0 ? `hp=${me0.hp}/${me0.maxHp}` : '');

  // --- 5. Sát thương đánh thường đúng công thức 0.85×(Vật công+10) ---
  const expDmg = Math.max(1, Math.round(0.85 * (st.vatCong + 10)));
  let firstDrop = null;
  const wolfHp = new Map();
  const steer = setInterval(() => {
    const p = myPos(s);
    if (!p || !s.state.tick) return;
    for (const m of s.state.tick.monsters) {
      const prev = wolfHp.get(m.id);
      if (prev !== undefined && m.hp < prev && firstDrop === null) firstDrop = prev - m.hp;
      wolfHp.set(m.id, m.hp);
    }
    let best = null, bd = Infinity;
    for (const m of s.state.tick.monsters) { const d = Math.hypot(m.x - p.x, m.y - p.y); if (d < bd) { bd = d; best = m; } }
    if (!best) return;
    if (bd <= 42) { s.emit('client_input', { vx: 0, vy: 0 }); s.emit('player_attack'); }
    else s.emit('client_input', { vx: Math.sign(best.x - p.x), vy: Math.sign(best.y - p.y) });
  }, 130);
  const tA = Date.now();
  while (Date.now() - tA < 25000 && firstDrop === null) await sleep(150);
  check('Đòn đầu trừ đúng 0.85×(Vật công+10)', firstDrop === expDmg, `drop=${firstDrop} expected=${expDmg} (VC=${st.vatCong})`);

  // --- 6. Sói cắn: trừ HP theo Vật phòng ---
  const expBite = Math.max(1, Math.round((5 * 100) / (100 + st.vatPhong)));
  let biteDrop = null;
  let lastHp = myPos(s)?.hp;
  const tB = Date.now();
  while (Date.now() - tB < 8000 && biteDrop === null) {
    const hp = myPos(s)?.hp;
    if (hp !== undefined && lastHp !== undefined && hp < lastHp) biteDrop = lastHp - hp;
    if (hp !== undefined) lastHp = hp;
    await sleep(110);
  }
  check('Sói cắn trừ đúng 5×100/(100+Vật phòng)', biteDrop === expBite, `drop=${biteDrop} expected=${expBite} (VP=${st.vatPhong})`);

  // --- 7. Đứng chịu đòn tới chết → hồi sinh ở quảng trường, máu đầy ---
  const tC = Date.now();
  while (Date.now() - tC < 80000 && !s.state.died) {
    // chạy về điểm giữa 2 con sói gần nhất để bị cắn nhanh hơn
    const p = myPos(s);
    if (p && s.state.tick && s.state.tick.monsters.length >= 2) {
      const sorted = [...s.state.tick.monsters].sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y));
      const mx = (sorted[0].x + sorted[1].x) / 2, my = (sorted[0].y + sorted[1].y) / 2;
      const dx = mx - p.x, dy = my - p.y;
      s.emit('client_input', { vx: Math.abs(dx) > 18 ? Math.sign(dx) : 0, vy: Math.abs(dy) > 18 ? Math.sign(dy) : 0 });
    }
    await sleep(400);
  }
  clearInterval(steer);
  s.emit('client_input', { vx: 0, vy: 0 });
  check('Bị hạ → nhận sự kiện you_died', s.state.died);
  await sleep(600);
  const meAfter = myPos(s);
  check('Hồi sinh tại quảng trường, máu đầy', !!meAfter && Math.hypot(meAfter.x - 700, meAfter.y - 560) <= 135 && meAfter.hp === expMaxHp,
    meAfter ? `pos=(${meAfter.x},${meAfter.y}) hp=${meAfter.hp}/${expMaxHp}` : '');

  // --- 8. Lưu server: ngắt rồi vào lại bằng cùng token ---
  s.disconnect();
  await sleep(400);
  const s2 = connect();
  await sleep(500);
  s2.emit('hello', { token: TOKEN });
  await sleep(700);
  const w2 = s2.state.welcome;
  check('Vào lại: nhận welcome ngay, không bắt tạo mới', !!w2 && !s2.state.needChar);
  check('Nhân vật được khôi phục nguyên vẹn', !!w2 && w2.character.name === 'Lăng Vân Tử' && w2.character.classId === 'kiemtu' && STAT_KEYS.every((k) => w2.character.stats[k] === st[k]));
  s2.disconnect();

  console.log(failures === 0 ? 'ALL PASS' : failures + ' FAILURES');
  process.exit(failures === 0 ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(1); });
