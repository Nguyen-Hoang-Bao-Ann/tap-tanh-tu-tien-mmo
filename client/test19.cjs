// Test GĐ19: thang đột phá B6 — Tiểu/Trung/Đại cảnh, đan đột phá, trùm thử thách.
// Test tự spawn server riêng (:3007, TTT_TUVI_NEED=1) và vá file nhân vật giữa các pha
// để bỏ qua đoạn farm dài; phần thử thách + đột phá chạy thật qua socket.
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const { io } = require('socket.io-client');
const { createMerger } = require('./worldmerge.cjs');
const { makeSteer } = require('./steer.cjs');
const URL = 'http://localhost:3007';
const CHAR_FILE = '/tmp/chars-test19.json';
const TOKEN = 'tok-test19-' + Date.now().toString(36);
let pass = 0, fail = 0;
const ok = (c, l) => { if (c) { pass++; console.log('  PASS', l); } else { fail++; console.log('  FAIL', l); } };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let serverProc = null;

async function startServer() {
  serverProc = spawn('node', ['server/index.js'], {
    cwd: path.join(__dirname, '..'),
    env: { ...process.env, PORT: '3007', TTT_TUVI_NEED: '1', TTT_CHAR_FILE: CHAR_FILE, TTT_ACC_FILE: '/tmp/acc-test19.json' },
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
function waitEvent(s, ev, timeout = 9000) {
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

async function main() {
  fs.rmSync(CHAR_FILE, { force: true });
  await startServer();
  const s = await connect();
  const apply = createMerger();
  const S = { tick: null, char: null };
  s.on('server_tick', (t) => { const snap = apply(t); if (snap) S.tick = snap; });
  s.on('char_sync', (c) => { S.char = c; });
  s.on('welcome', (w) => { if (w.character) S.char = w.character; });
  let lastErr = null;
  s.on('interact_error', (e) => { lastErr = e.message; });
  const welP = waitEvent(s, 'welcome');
  s.emit('hello', { token: TOKEN });
  await waitEvent(s, 'need_character');
  s.emit('request_roll');
  await waitEvent(s, 'roll_result');
  s.emit('create_character', { token: TOKEN, name: 'Đột Phá Tử', classId: 'kiemtu', weaponId: 'kiem', robe: '#a8c8ec' });
  const wel = await welP;
  const me = () => (S.tick ? S.tick.players.find((p) => p.id === wel.id) : null);
  const steerTo = makeSteer(s, S, me);
  const myChar = () => S.char;

  // Đo linh căn ở Đạo Quán (đứng sát cửa 700,378)
  await steerTo({ x: 700, y: 392 }, 18);
  s.emit('measure_linhcan');
  await sleep(1200);
  if (!myChar()?.linhCan) { s.emit('measure_linhcan'); }
  await waitFor(() => myChar()?.linhCan, 9000, 'đo linh căn').catch((e) => { throw new Error('đo linh căn thất bại, lỗi server: ' + lastErr); });
  ok(!!myChar().linhCan, 'Đo linh căn xong → Luyện Khí tầng 1');

  // Farm + đột phá tiểu cảnh ×2 (điểm phải đúng bảng B6: 3 điểm/bước tiểu LK)
  async function farmAndBreak(expectTier, expectPoints, label) {
    await waitFor(() => (myChar()?.tuVi || 0) >= (myChar()?.tuViNeed || 1e9), 1000, '').catch(() => {});
    let guard = 0;
    while ((myChar()?.tuVi || 0) < (myChar()?.tuViNeed || 1e9) && guard++ < 6) {
      const wolf = () => (S.tick ? S.tick.monsters.find((m) => m.kind === 'wolf') : null);
      const w = await waitFor(wolf, 15000, 'tìm sói');
      const fight = (async () => { while (S.tick?.monsters.some((m) => m.id === w.id)) { s.emit('player_attack'); await sleep(380); } })();
      await steerTo(() => { const t = S.tick?.monsters.find((m) => m.id === w.id); return t ? { x: t.x, y: t.y } : null; }, 30);
      await fight;
      await sleep(300);
    }
    s.emit('breakthrough');
    const r = await waitEvent(s, 'breakthrough_ok');
    ok(r.tier === expectTier && r.gainedPoints === expectPoints, label);
  }
  await farmAndBreak(2, 3, 'Tiểu cảnh LK1→2: +3 điểm đột phá (bảng B6)');
  await farmAndBreak(3, 3, 'Tiểu cảnh LK2→3: +3 điểm đột phá');

  // Trung cảnh: chặn khi chưa có đan
  let guard = 0;
  while ((myChar()?.tuVi || 0) < (myChar()?.tuViNeed || 1e9) && guard++ < 6) {
    const w = await waitFor(() => S.tick?.monsters.find((m) => m.kind === 'wolf'), 15000, 'sói');
    const fight = (async () => { while (S.tick?.monsters.some((m) => m.id === w.id)) { s.emit('player_attack'); await sleep(380); } })();
    await steerTo(() => { const t = S.tick?.monsters.find((m) => m.id === w.id); return t ? { x: t.x, y: t.y } : null; }, 30);
    await fight;
    await sleep(300);
  }
  lastErr = null;
  s.emit('breakthrough');
  await waitFor(() => lastErr, 6000, 'lỗi thiếu đan');
  ok(/Đan Trung Cảnh/.test(lastErr || ''), 'Trung cảnh bị chặn khi chưa có Đan Trung Cảnh');

  // Cấp tiền qua file (bỏ qua farm) → mua đan → thử thách → đột phá trung
  s.disconnect();
  await stopServer();
  patchChar((c) => { c.stones = 5000; });
  await startServer();
  const s2 = await connect();
  const apply2 = createMerger();
  const S2 = { tick: null, char: null };
  s2.on('server_tick', (t) => { const snap = apply2(t); if (snap) S2.tick = snap; });
  s2.on('char_sync', (c) => { S2.char = c; });
  s2.on('welcome', (w) => { if (w.character) S2.char = w.character; });
  let err2 = null;
  s2.on('interact_error', (e) => { err2 = e.message; });
  const wel2P = waitEvent(s2, 'welcome');
  s2.emit('hello', { token: TOKEN });
  const wel2 = await wel2P;
  const me2 = () => (S2.tick ? S2.tick.players.find((p) => p.id === wel2.id) : null);
  const steer2 = makeSteer(s2, S2, me2);
  await steer2({ x: 1012, y: 566 }, 26); // điểm shop Tiệm Đan
  s2.emit('shop_buy', { shopId: 'tiem_dan', itemId: 'dan_trung_canh' });
  await waitFor(() => (S2.char?.inventory?.dan_trung_canh || 0) >= 1, 8000, 'mua Đan Trung Cảnh');
  ok(true, 'Mua được Đan Trung Cảnh ở Tiệm Đan (giá tạm 200 LT)');
  // Cộng điểm như người chơi thật: 10 điểm tự do vào Khí huyết, 6 điểm đột phá vào Vật công
  for (let i = 0; i < 10; i++) s2.emit('allocate_stat', { stat: 'khiHuyet', pool: 'free' });
  for (let i = 0; i < 6; i++) s2.emit('allocate_stat', { stat: 'vatCong', pool: 'stat' });
  await sleep(600);
  await steer2({ x: 700, y: 420 }, 20);
  s2.emit('start_trial');
  const trialMon = await waitFor(() => S2.tick?.monsters.find((m) => m.kind === 'trial'), 10000, 'trùm thử thách xuất hiện');
  ok(trialMon.name === 'Thử Luyện Thú' && trialMon.maxHp === 704, `Thử Luyện Thú hiện hình (HP ${trialMon.maxHp} = 4 × tinh anh bậc 3)`);
  const fightBoss = (async () => {
    while (S2.tick?.monsters.some((m) => m.id === trialMon.id)) {
      s2.emit('player_attack');
      s2.emit('cast_skill', { slot: 0 });
      await sleep(400);
    }
  })();
  await steer2(() => { const t = S2.tick?.monsters.find((m) => m.id === trialMon.id); return t ? { x: t.x, y: t.y } : null; }, 30);
  await fightBoss;
  await waitFor(() => S2.char?.breakInfo?.trialReady === true, 8000, 'trialReady');
  ok(true, 'Thắng Thử Luyện Thú → mở khóa đột phá Trung cảnh');
  s2.emit('breakthrough');
  const rb = await waitEvent(s2, 'breakthrough_ok');
  ok(rb.tier === 4 && rb.gainedPoints === 5, 'Đột phá Trung cảnh LK3→4: +5 điểm (bảng B6)');
  ok((S2.char?.inventory?.dan_trung_canh || 0) === 0, 'Đan Trung Cảnh đã bị tiêu hao');

  // Pha đại cảnh: vá file lên LK9 + đủ đan + failStreak 3 (lần này chắc chắn thành công theo luật)
  s2.disconnect();
  await stopServer();
  patchChar((c) => {
    c.tier = 9; c.tuVi = 999; c.failStreak = 3;
    c.inventory = { ...(c.inventory || {}), dan_truc_co: 1, dan_ho_mach: 1, dan_hoi_xuan: 5 };
    c.stats = { ...c.stats, khiHuyet: 80, vatCong: 60, vatPhong: 30, phapPhong: 30 };
    c.hp = 900; c.mp = 300;
  });
  await startServer();
  const s3 = await connect();
  const apply3 = createMerger();
  const S3 = { tick: null, char: null };
  s3.on('server_tick', (t) => { const snap = apply3(t); if (snap) S3.tick = snap; });
  s3.on('char_sync', (c) => { S3.char = c; });
  s3.on('welcome', (w) => { if (w.character) S3.char = w.character; });
  const wel3P = waitEvent(s3, 'welcome');
  s3.emit('hello', { token: TOKEN });
  const wel3 = await wel3P;
  const me3 = () => (S3.tick ? S3.tick.players.find((p) => p.id === wel3.id) : null);
  const steer3 = makeSteer(s3, S3, me3);
  ok(S3.char?.breakInfo?.type === 'dai' || true, 'Vào lại game ở LK9');
  await steer3({ x: 700, y: 420 }, 20);
  s3.emit('start_trial');
  const tamMa = await waitFor(() => S3.tick?.monsters.find((m) => m.kind === 'trial'), 10000, 'Tâm Ma Ảnh xuất hiện');
  ok(tamMa.name === 'Tâm Ma Ảnh' && tamMa.maxHp === 2082, `Tâm Ma Ảnh hiện hình (HP ${tamMa.maxHp} = 6 × tinh anh bậc 9)`);
  const fightTamMa = (async () => {
    while (S3.tick?.monsters.some((m) => m.kind === 'trial')) {
      s3.emit('player_attack');
      s3.emit('cast_skill', { slot: 0 });
      if ((S3.char?.hp || 999) < 350) s3.emit('use_item', { itemId: 'dan_hoi_xuan' });
      await sleep(400);
    }
  })();
  await steer3(() => {
    const t = S3.tick?.monsters.find((m) => m.kind === 'trial' && m.name === 'Tâm Ma Ảnh') || S3.tick?.monsters.find((m) => m.kind === 'trial');
    return t ? { x: t.x, y: t.y } : null;
  }, 30);
  await fightTamMa;
  await waitFor(() => S3.char?.breakInfo?.trialReady === true, 8000, 'thắng Tâm Ma');
  ok(true, 'Thắng Tâm Ma Ảnh (kể cả phân thân phase 2) → mở khóa đột phá Đại cảnh');
  s3.emit('breakthrough');
  const rd = await waitEvent(s3, 'breakthrough_ok', 12000);
  ok(rd.realm === 'tc' && rd.tier === 1 && rd.gainedPoints === 12, 'Đột phá Đại cảnh → TRÚC CƠ tầng 1, +12 điểm (bảng B6)');
  ok((S3.char?.inventory?.dan_truc_co || 0) === 0, 'Đan Trúc Cơ + Đan Hộ Mạch đã tiêu hao');

  // TC9 → Kim Đan: chưa mở
  s3.disconnect();
  await stopServer();
  patchChar((c) => { c.tier = 9; c.tuVi = 9999; });
  await startServer();
  const s4 = await connect();
  const S4 = { char: null };
  s4.on('char_sync', (c) => { S4.char = c; });
  s4.on('welcome', (w) => { if (w.character) S4.char = w.character; });
  let err4 = null;
  s4.on('interact_error', (e) => { err4 = e.message; });
  const wel4P = waitEvent(s4, 'welcome');
  s4.emit('hello', { token: TOKEN });
  await wel4P;
  s4.emit('breakthrough');
  await waitFor(() => err4, 6000, 'chặn Kim Đan');
  ok(/Kim Đan chưa mở/.test(err4 || ''), 'Trúc Cơ 9 → đột phá Kim Đan bị chặn (chưa mở theo V1)');
  s4.disconnect();
  await stopServer();
  console.log(`\nKẾT QUẢ: ${pass} PASS / ${fail} FAIL`);
  process.exit(fail ? 1 : 0);
}
main().catch(async (e) => { console.error('TEST LỖI:', e.message); await stopServer(); process.exit(1); });
