// TEST GĐ56 — VÀO LẠI SAU KHI RỚT KẾT NỐI (phía server):
// 1) Rớt hẳn rồi nối lại bằng socket mới + hello token cũ → vào lại được,
//    nhân vật di chuyển tiếp bình thường.
// 2) Nối lại khi phiên cũ CHƯA timeout (socket cũ còn treo): phiên mới
//    tiếp quản, thế giới chỉ có ĐÚNG 1 bản của nhân vật; khi socket cũ
//    ngắt hẳn, nhân vật KHÔNG bị kéo đi nghỉ offline (phiên mới còn chơi).
const { io } = require('socket.io-client');
const { spawn } = require('child_process');
const fs = require('fs');
const { createMerger } = require('./worldmerge.cjs');

const PORT = 3065;
const URL = `http://localhost:${PORT}`;
const CHAR_FILE = '/tmp/ttt-t44-chars.json';
const ACC_FILE = '/tmp/ttt-t44-acc.json';
const WORLD_FILE = '/tmp/ttt-t44-world.json';
const TOKEN = 'tok-rejoin44';
const NAME = 'Tái Kết Nối';
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
function waitEv(s, ev, ms = 8000) { return new Promise((res, rej) => { const t = setTimeout(() => rej(new Error('timeout ' + ev)), ms); s.once(ev, (d) => { clearTimeout(t); res(d); }); }); }
async function waitFor(fn, ms, label) { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (fn()) return true; await sleep(120); } throw new Error('waitFor: ' + label); }
async function joinGuest(token, name, classId) {
  const s = io(URL, { transports: ['websocket'] });
  await new Promise((r) => s.on('connect', r));
  const needP = waitEv(s, 'need_character').catch(() => null);
  const welP = waitEv(s, 'welcome').catch(() => null);
  s.emit('hello', { token });
  const first = await Promise.race([needP.then(() => 'need'), welP.then(() => 'welcome')]);
  if (first === 'need') {
    s.emit('request_roll');
    await waitEv(s, 'roll_result');
    const w2 = waitEv(s, 'welcome');
    s.emit('create_character', { token, name, classId });
    await w2;
  }
  return s;
}

(async () => {
  for (const f of [CHAR_FILE, ACC_FILE]) fs.rmSync(f, { force: true });
  fs.writeFileSync(WORLD_FILE, JSON.stringify({ totalMinutes: 10 * 1440 + 600, savedAt: Date.now() }));
  const proc = await boot();
  try {
    // Observer: một người chơi khác nhìn thế giới
    const obs = await joinGuest('tok-obs44', 'Quan Sát', 'phaptu');
    const apply = createMerger();
    const S = { tick: null };
    obs.on('server_tick', (t) => { const snap = apply(t); if (snap) S.tick = snap; });
    await waitFor(() => !!S.tick, 6000, 'observer có tick');
    const copies = () => (S.tick?.players || []).filter((p) => p.name === NAME);
    const onlineCopy = () => copies().find((p) => !p.rest);

    // Người chơi chính vào game
    const a = await joinGuest(TOKEN, NAME, 'kiemtu');
    await waitFor(() => !!onlineCopy(), 6000, 'thấy nhân vật online');
    ok(true, 'vào game lần đầu: observer thấy nhân vật online');

    // --- Pha 1: rớt hẳn → nối lại ---
    a.disconnect();
    await waitFor(() => copies().length >= 1 && copies().every((p) => !!p.rest), 6000, 'sau khi rớt: nhân vật chuyển nghỉ offline');
    ok(true, 'rớt kết nối: nhân vật về nghỉ offline (không biến mất)');
    const a2 = await joinGuest(TOKEN, NAME, 'kiemtu');
    await waitFor(() => !!onlineCopy(), 6000, 'vào lại: online trở lại');
    const x0 = onlineCopy().x;
    a2.emit('client_input', { vx: 1, vy: 0 });
    await sleep(1300);
    a2.emit('client_input', { vx: 0, vy: 0 });
    await waitFor(() => onlineCopy() && onlineCopy().x > x0 + 15, 5000, 'vào lại: di chuyển được');
    ok(true, `vào lại bằng socket mới: nhân vật online và di chuyển được (x ${x0} → ${onlineCopy().x})`);

    // --- Pha 2: nối lại khi phiên cũ còn treo ---
    const a3 = await joinGuest(TOKEN, NAME, 'kiemtu'); // a2 vẫn đang nối!
    await waitFor(() => copies().length === 1 && !!onlineCopy(), 6000, 'tiếp quản: đúng 1 bản online');
    ok(true, 'phiên mới tiếp quản khi phiên cũ còn treo: thế giới chỉ có 1 bản của nhân vật');
    a2.disconnect(); // socket cũ ngắt hẳn — KHÔNG được kéo nhân vật đi offline
    await sleep(1500);
    ok(copies().length === 1 && !!onlineCopy(), 'socket cũ ngắt hẳn: nhân vật vẫn online với phiên mới (không bị kéo đi nghỉ)');
    const x1 = onlineCopy().x;
    a3.emit('client_input', { vx: -1, vy: 0 });
    await sleep(1300);
    a3.emit('client_input', { vx: 0, vy: 0 });
    await waitFor(() => onlineCopy() && onlineCopy().x < x1 - 15, 5000, 'phiên mới vẫn điều khiển được');
    ok(true, 'phiên mới vẫn điều khiển nhân vật bình thường sau khi phiên cũ chết hẳn');

    a3.disconnect();
    obs.disconnect();
  } finally {
    proc.kill('SIGKILL');
  }
  console.log(failures === 0 ? '\nTEST44 ALL PASS' : `\nTEST44 CÓ ${failures} FAIL`);
  process.exit(failures === 0 ? 0 : 1);
})().catch((e) => { console.error('TEST44 SẬP:', e.message); process.exit(2); });
