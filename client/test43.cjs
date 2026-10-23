// TEST GĐ55 — CỘNG ĐIỂM HÀNG LOẠT (allocate_stats): client chọn trước
// bằng +/− rồi OK mới gửi; server kiểm tổng điểm từng bể, áp một lần.
// Cộng quá điểm → từ chối + nạp lại số thật. Sự kiện cũ allocate_stat
// vẫn hoạt động (tương thích ngược).
const { io } = require('socket.io-client');
const { spawn } = require('child_process');
const fs = require('fs');

const PORT = 3062;
const URL = `http://localhost:${PORT}`;
const CHAR_FILE = '/tmp/ttt-t43-chars.json';
const ACC_FILE = '/tmp/ttt-t43-acc.json';
const WORLD_FILE = '/tmp/ttt-t43-world.json';
const TOKEN = 'tok-alloc43';
let failures = 0;
function ok(cond, label) { console.log(`${cond ? 'PASS' : 'FAIL'}  ${label}`); if (!cond) failures++; }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function boot() {
  const proc = spawn('node', ['../server/index.js'], {
    cwd: __dirname,
    env: { ...process.env, PORT: String(PORT), TTT_CHAR_FILE: CHAR_FILE, TTT_ACC_FILE: ACC_FILE, TTT_WORLD_FILE: WORLD_FILE },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  proc.stderr.on('data', (d) => process.stderr.write('[srv] ' + d));
  for (let i = 0; i < 40; i++) {
    try { const r = await fetch(`${URL}/api/status`); if (r.ok) return proc; } catch {}
    await sleep(300);
  }
  throw new Error('server không lên');
}
async function kill(proc) { proc.kill('SIGKILL'); await sleep(700); }
function waitEv(s, ev, ms = 8000) { return new Promise((res, rej) => { const t = setTimeout(() => rej(new Error('timeout ' + ev)), ms); s.once(ev, (d) => { clearTimeout(t); res(d); }); }); }

(async () => {
  for (const f of [CHAR_FILE, ACC_FILE]) fs.rmSync(f, { force: true });
  fs.writeFileSync(WORLD_FILE, JSON.stringify({ totalMinutes: 10 * 1440 + 600, savedAt: Date.now() }));

  let proc = await boot();
  let s = io(URL, { transports: ['websocket'] });
  await new Promise((r) => s.on('connect', r));
  const needP = waitEv(s, 'need_character');
  s.emit('hello', { token: TOKEN });
  await needP;
  s.emit('request_roll');
  await waitEv(s, 'roll_result');
  const welP = waitEv(s, 'welcome');
  s.emit('create_character', { token: TOKEN, name: 'Cộng Điểm', classId: 'kiemtu' });
  await welP;
  s.disconnect();
  await kill(proc);

  const chars = JSON.parse(fs.readFileSync(CHAR_FILE, 'utf8'));
  const c0 = chars[Object.keys(chars)[0]];
  c0.stats = { khiHuyet: 10, vatCong: 10, vatPhong: 10, phapCong: 10, phapPhong: 10, tocDo: 10, thanThuc: 10 };
  c0.freePoints = 12; c0.statPoints = 3;
  fs.writeFileSync(CHAR_FILE, JSON.stringify(chars));

  proc = await boot();
  s = io(URL, { transports: ['websocket'] });
  let sync = null; let lastErr = '';
  s.on('char_sync', (d) => { sync = d; });
  s.on('interact_error', (e) => { lastErr = e.message || ''; });
  await new Promise((r) => s.on('connect', r));
  const wel2 = waitEv(s, 'welcome');
  s.emit('hello', { token: TOKEN });
  const w2 = await wel2;
  sync = w2.character;
  ok(sync.freePoints === 12 && sync.statPoints === 3 && sync.stats.vatCong === 10, 'nạp nhân vật: 12 điểm tự do, 3 điểm đột phá, Vật công 10');
  async function waitSync(pred, label, ms = 5000) {
    const t0 = Date.now();
    while (Date.now() - t0 < ms) { if (sync && pred(sync)) return true; await sleep(100); }
    throw new Error('waitSync: ' + label);
  }

  // 1) Cộng hàng loạt hợp lệ: free {Vật công 5, Tốc độ 2}, stat {Vật công 1}
  s.emit('allocate_stats', { free: { vatCong: 5, tocDo: 2 }, stat: { vatCong: 1 } });
  await waitSync((d) => d.stats.vatCong === 17, 'sau cộng hàng loạt');
  ok(sync.stats.tocDo === 12 && sync.freePoints === 5 && sync.statPoints === 2,
    `áp đúng một lần: Vật công 17 (5×1 + 1×2), Tốc độ 12, còn 5 tự do / 2 đột phá`);

  // 2) Cộng quá điểm → từ chối, số không đổi
  lastErr = '';
  s.emit('allocate_stats', { free: { vatCong: 99 } });
  await waitSync((d) => d.stats.vatCong === 17 && lastErr.includes('vượt quá'), 'chặn cộng quá điểm');
  ok(sync.freePoints === 5, 'bị từ chối: điểm tự do vẫn 5');

  // 3) Số âm / rác → bỏ qua, không đổi gì
  s.emit('allocate_stats', { free: { vatCong: -3 }, stat: { tocDo: 0 } });
  await sleep(700);
  ok(sync.stats.vatCong === 17 && sync.stats.tocDo === 12, 'số âm/0 bị bỏ qua, chỉ số không đổi');

  // 4) Số thập phân → lấy phần nguyên
  s.emit('allocate_stats', { free: { khiHuyet: 2.7 } });
  await waitSync((d) => d.stats.khiHuyet === 12, 'thập phân lấy phần nguyên');
  ok(sync.freePoints === 3, 'trừ đúng 2 điểm tự do (12 → 3 sau các bước)');

  // 5) Sự kiện cũ allocate_stat (+1 từng phát) vẫn chạy
  s.emit('allocate_stat', { pool: 'free', stat: 'khiHuyet' });
  await waitSync((d) => d.stats.khiHuyet === 13, 'allocate_stat cũ');
  ok(sync.freePoints === 2, 'sự kiện cũ vẫn trừ điểm đúng');

  s.disconnect();
  await kill(proc);
  console.log(failures === 0 ? '\nTEST43 ALL PASS' : `\nTEST43 CÓ ${failures} FAIL`);
  process.exit(failures === 0 ? 0 : 1);
})().catch((e) => { console.error('TEST43 SẬP:', e.message); process.exit(2); });
