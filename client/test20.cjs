// Test GĐ20: đồng hồ thế giới — 1 ngày = 24 phút thật (test rút còn 6 giây),
// ngày 06:00–18:00 chạy chậm (2/3 chu kỳ), đêm 18:00–06:00 nhanh gấp đôi (1/3).
// Kiểm: tốc độ ngày vs đêm, qua ngày +1 Tu vi + sự kiện world_day, cộng dồn
// Tu vi lúc offline, tuổi/thọ lúc tạo nhân vật, đột phá Trung cảnh +5 năm thọ.
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const { io } = require('socket.io-client');
const { createMerger } = require('./worldmerge.cjs');
const { makeSteer } = require('./steer.cjs');
const URL = 'http://localhost:3008';
const CHAR_FILE = '/tmp/chars-test20.json';
const WORLD_FILE = '/tmp/world-test20.json';
const WORLD_FILE_NIGHT = '/tmp/world-test20-night.json';
const TOKEN = 'tok-test20-' + Date.now().toString(36);
let pass = 0, fail = 0;
const ok = (c, l) => { if (c) { pass++; console.log('  PASS', l); } else { fail++; console.log('  FAIL', l); } };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let serverProc = null;

async function startServer(extraEnv) {
  serverProc = spawn('node', ['server/index.js'], {
    cwd: path.join(__dirname, '..'),
    env: {
      ...process.env, PORT: '3008', TTT_TUVI_NEED: '1',
      TTT_CHAR_FILE: CHAR_FILE, TTT_ACC_FILE: '/tmp/acc-test20.json',
      TTT_DAY_REAL_MS: '6000', ...extraEnv,
    },
    stdio: 'ignore',
  });
  for (let i = 0; i < 40; i++) {
    try { const r = await fetch(URL + '/api/status'); if (r.ok) return; } catch { /* chưa lên */ }
    await sleep(400);
  }
  throw new Error('server test không lên');
}
async function stopServer() {
  if (serverProc) { serverProc.kill('SIGTERM'); serverProc = null; await sleep(700); }
}
async function statusWorld() {
  const r = await fetch(URL + '/api/status');
  const j = await r.json();
  return j.world;
}
function patchChar(mut) {
  const data = JSON.parse(fs.readFileSync(CHAR_FILE, 'utf8'));
  const c = data[TOKEN];
  if (!c) throw new Error('không thấy nhân vật trong file');
  mut(c);
  fs.writeFileSync(CHAR_FILE, JSON.stringify(data, null, 1));
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

async function main() {
  fs.rmSync(CHAR_FILE, { force: true });
  fs.rmSync(WORLD_FILE, { force: true });
  fs.rmSync(WORLD_FILE_NIGHT, { force: true });

  // ---------- Pha A: ban ngày (bắt đầu 10:00) ----------
  await startServer({ TTT_WORLD_FILE: WORLD_FILE, TTT_WORLD_START_MINUTES: '600' });
  const w0 = await statusWorld();
  ok(w0 && w0.day === 1 && w0.month === 1 && w0.year === 1 && w0.hour === 10 && !w0.isNight && w0.canh === 'Tỵ',
    `Đồng hồ khởi tạo: ngày ${w0?.day}/${w0?.month}/${w0?.year} giờ ${w0?.hour} canh ${w0?.canh}`);
  const m1 = (await statusWorld()).minuteOfDay + (await statusWorld()).dayIndex * 1440;
  await sleep(1000);
  const m2 = (await statusWorld()).minuteOfDay + (await statusWorld()).dayIndex * 1440;
  const dayRate = m2 - m1; // kỳ vọng ~180 phút game / 1 giây thật (ngày test: 720 phút / 4 giây)
  ok(dayRate >= 120 && dayRate <= 250, `Tốc độ BAN NGÀY: ~${dayRate} phút game/giây thật (kỳ vọng ~180)`);

  const s = await connect();
  const S = wire(s);
  let dayEvent = null;
  s.on('world_day', (d) => { dayEvent = d; });
  const welP = waitEvent(s, 'welcome');
  s.emit('hello', { token: TOKEN });
  await waitEvent(s, 'need_character');
  s.emit('request_roll');
  await waitEvent(s, 'roll_result');
  s.emit('create_character', { token: TOKEN, name: 'Thời Gian Tử', classId: 'kiemtu', weaponId: 'kiem', robe: '#a8c8ec' });
  const wel = await welP;
  const c0 = wel.character;
  ok(c0.age >= 10 && c0.age <= 25, `Tuổi khởi đầu ${c0.age} (đúng khoảng file 10–25)`);
  ok(c0.lifespan >= 50 && c0.lifespan <= 100 && c0.lifespanLeft === c0.lifespan - c0.age,
    `Tuổi thọ ${c0.lifespan} (đúng khoảng file 50–100), còn ${c0.lifespanLeft} năm`);
  ok(!!c0.world && c0.world.day === 1, 'Payload nhân vật kèm đồng hồ thế giới');

  // Qua ngày mới: từ 10:00 → 00:00 mất ~4,7 giây (test)
  const tuViBefore = S.char.tuVi;
  await waitFor(() => dayEvent, 20000, 'sự kiện world_day');
  ok(dayEvent.day === 2 && dayEvent.month === 1, `Sự kiện ngày mới: ngày ${dayEvent.day} tháng ${dayEvent.month}`);
  await waitFor(() => S.char && S.char.tuVi >= tuViBefore + 1, 6000, '+1 Tu vi ngày mới');
  ok(true, `Qua ngày mới: người online +1 Tu vi (${tuViBefore} → ${S.char.tuVi})`);
  const tuViAtDisconnect = S.char.tuVi;

  // ---------- Offline: vắng mặt hơn 1 ngày game rồi quay lại ----------
  s.disconnect();
  const wDisc = await statusWorld();
  await waitFor(async () => {
    const w = await statusWorld();
    return w.dayIndex >= wDisc.dayIndex + 1 ? w : null;
  }, 25000, 'thêm 1 ngày trôi qua lúc offline');
  const s2 = await connect();
  const S2 = wire(s2);
  const wel2P = waitEvent(s2, 'welcome');
  s2.emit('hello', { token: TOKEN });
  const wel2 = await wel2P;
  const grant = wel2.character.offlineTuViGrant || 0;
  // GĐ21 (luật mới của người chơi): nhân vật này CHƯA học Tọa Thiền → lúc
  // offline chỉ NGỦ, không hấp thụ linh khí → grant = 0 (thay luật GĐ20 +1/ngày).
  ok(grant === 0 && wel2.character.restSummary?.state === 'sleep',
    `Offline chưa học Tọa Thiền → ngủ, grant ${grant} (luật GĐ21)`);
  ok(wel2.character.tuVi === tuViAtDisconnect + grant,
    `Tu vi khớp: ${tuViAtDisconnect} + ${grant} = ${wel2.character.tuVi}`);
  s2.disconnect();

  // ---------- Pha B: đột phá Trung cảnh cộng +5 năm thọ ----------
  await stopServer();
  patchChar((c) => {
    c.realm = 'lk'; c.tier = 3; c.tuVi = 999; c.stones = 0;
    c.linhCan = { elements: ['Kim'], main: 'Kim', count: 1 };
    c.skills = ['kiemtu_1', 'kiemtu_2', 'kiemtu_3'];
    c.inventory = { dan_trung_canh: 1 };
    c.stats = { ...c.stats, khiHuyet: 60, vatCong: 50 };
    c.hp = 700; c.mp = 300; c.statPoints = 6;
    c.x = 700; c.y = 560;
  });
  await startServer({ TTT_WORLD_FILE: WORLD_FILE });
  const s3 = await connect();
  const S3 = wire(s3);
  const wel3P = waitEvent(s3, 'welcome');
  s3.emit('hello', { token: TOKEN });
  const wel3 = await wel3P;
  const life0 = S3.char.lifespan;
  const me3 = () => (S3.tick ? S3.tick.players.find((p) => p.id === wel3.id) : null);
  const steer3 = makeSteer(s3, S3, me3);
  for (let i = 0; i < 10; i++) s3.emit('allocate_stat', { stat: 'khiHuyet', pool: 'free' });
  for (let i = 0; i < 6; i++) s3.emit('allocate_stat', { stat: 'vatCong', pool: 'stat' });
  await sleep(600);
  await steer3({ x: 700, y: 420 }, 20);
  s3.emit('start_trial');
  const trialMon = await waitFor(() => S3.tick?.monsters.find((m) => m.kind === 'trial'), 10000, 'Thử Luyện Thú xuất hiện');
  const fightBoss = (async () => {
    while (S3.tick?.monsters.some((m) => m.id === trialMon.id)) {
      s3.emit('player_attack');
      s3.emit('cast_skill', { slot: 0 });
      await sleep(400);
    }
  })();
  await steer3(() => { const t = S3.tick?.monsters.find((m) => m.id === trialMon.id); return t ? { x: t.x, y: t.y } : null; }, 30);
  await fightBoss;
  await waitFor(() => S3.char?.breakInfo?.trialReady === true, 8000, 'trialReady');
  ok(S3.char.breakInfo.lifespanGain === 5, 'breakInfo báo trước: Trung cảnh +5 năm thọ');
  s3.emit('breakthrough');
  const rb = await waitEvent(s3, 'breakthrough_ok');
  ok(rb.tier === 4 && rb.lifespanGain === 5 && S3.char.lifespan === life0 + 5,
    `Đột phá Trung cảnh LK3→4: tuổi thọ ${life0} → ${S3.char.lifespan} (+5 năm đúng B6)`);
  s3.disconnect();
  await stopServer();

  // ---------- Pha C: ban đêm trôi nhanh gấp đôi ----------
  await startServer({ TTT_WORLD_FILE: WORLD_FILE_NIGHT, TTT_WORLD_START_MINUTES: '1200' });
  const wn = await statusWorld();
  // Đồng hồ test chạy rất nhanh (6 giờ game/giây đêm) nên giờ đọc được có thể đã
  // qua 20:00 — chỉ cần chắc chắn đang trong đoạn đêm 18:00–06:00 là đúng.
  ok(wn.isNight && wn.minuteOfDay >= 1080, `Ban đêm: giờ ${wn.hour}, canh ${wn.canh}, isNight=${wn.isNight}`);
  const n1 = (await statusWorld()).minuteOfDay + (await statusWorld()).dayIndex * 1440;
  await sleep(1000);
  const n2 = (await statusWorld()).minuteOfDay + (await statusWorld()).dayIndex * 1440;
  const nightRate = n2 - n1; // kỳ vọng ~360 phút game / 1 giây thật
  ok(nightRate >= 260 && nightRate <= 480, `Tốc độ BAN ĐÊM: ~${nightRate} phút game/giây thật (kỳ vọng ~360)`);
  ok(nightRate > dayRate * 1.5, `Đêm nhanh hơn ngày rõ rệt (${nightRate} vs ${dayRate} phút/giây)`);
  await stopServer();

  console.log(`\nTEST20: ${pass} PASS, ${fail} FAIL`);
  process.exit(fail ? 1 : 0);
}

main().catch(async (e) => { console.error('TEST LỖI:', e.message); await stopServer(); process.exit(1); });
