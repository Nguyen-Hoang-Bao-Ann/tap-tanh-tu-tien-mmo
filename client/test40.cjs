// TEST GĐ46 — NÉ (dash): vọt nhanh hơn đi bộ rõ rệt, hồi chiêu chặn
// lần né thứ hai ngay lập tức, hết 2,5s thì né lại được.
const { io } = require('socket.io-client');
const { spawn } = require('child_process');
const fs = require('fs');
const { createMerger } = require('./worldmerge.cjs');

const PORT = 3057;
const URL = `http://localhost:${PORT}`;
const CHAR_FILE = '/tmp/ttt-t40-chars.json';
const WORLD_FILE = '/tmp/ttt-t40-world.json';
let failures = 0;
function ok(cond, label) { console.log(`${cond ? 'PASS' : 'FAIL'}  ${label}`); if (!cond) failures++; }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function startServer() {
  for (const f of [CHAR_FILE, WORLD_FILE, '/tmp/ttt-t40-acc.json']) fs.rmSync(f, { force: true });
  fs.writeFileSync(WORLD_FILE, JSON.stringify({ totalMinutes: 4 * 1440 + 600, savedAt: Date.now() }));
  const proc = spawn('node', ['../server/index.js'], {
    cwd: __dirname,
    env: { ...process.env, PORT: String(PORT), TTT_CHAR_FILE: CHAR_FILE, TTT_ACC_FILE: '/tmp/ttt-t40-acc.json', TTT_WORLD_FILE: WORLD_FILE },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  proc.stderr.on('data', (d) => process.stderr.write('[srv] ' + d));
  for (let i = 0; i < 30; i++) {
    try { const r = await fetch(`${URL}/api/status`); if (r.ok) return proc; } catch {}
    await sleep(400);
  }
  throw new Error('server không lên');
}
function waitEv(s, ev, ms = 6000) { return new Promise((res, rej) => { const t = setTimeout(() => rej(new Error('timeout ' + ev)), ms); s.once(ev, (d) => { clearTimeout(t); res(d); }); }); }
async function waitFor(fn, ms, label) { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (fn()) return true; await sleep(120); } throw new Error('waitFor: ' + label); }

(async () => {
  const proc = await startServer();
  try {
    const s = io(URL, { transports: ['websocket'] });
    const apply = createMerger();
    const S = { tick: null, char: null };
    s.on('server_tick', (t) => { const snap = apply(t); if (snap) S.tick = snap; });
    s.on('welcome', (w) => { if (w.character) S.char = w.character; });
    await new Promise((r) => s.on('connect', r));
    const needP = waitEv(s, 'need_character');
    s.emit('hello', { token: 'tok-dodge1' });
    await needP;
    s.emit('request_roll');
    await waitEv(s, 'roll_result');
    const welP = waitEv(s, 'welcome');
    s.emit('create_character', { token: 'tok-dodge1', name: 'Né Thử', classId: 'thetu' });
    await welP;
    await waitFor(() => !!S.tick, 6000, 'tick');
    const me = () => S.tick.players.find((p) => p.name === 'Né Thử');
    await waitFor(() => !!me(), 6000, 'thấy mình');
    const p0 = { ...me() };
    // Đi bộ về đông 500ms
    s.emit('client_input', { vx: 1, vy: 0 });
    await sleep(500);
    s.emit('client_input', { vx: 0, vy: 0 });
    await sleep(200);
    const p1 = { ...me() };
    const walkDist = p1.x - p0.x;
    ok(walkDist > 25, `đi bộ 500ms đi được ${walkDist.toFixed(0)}px`);
    // Né về đông: vọt ~99px trong 190ms
    s.emit('dodge', { vx: 1, vy: 0 });
    await sleep(420);
    const p2 = { ...me() };
    const dashDist = p2.x - p1.x;
    ok(dashDist >= 65, `né vọt được ${dashDist.toFixed(0)}px (kỳ vọng ~99)`);
    const walkSpeed = walkDist / 0.5;
    const dashSpeed = dashDist / 0.19;
    ok(dashSpeed > walkSpeed * 1.7, `tốc độ né ${dashSpeed.toFixed(0)}px/s nhanh hơn hẳn đi bộ ${walkSpeed.toFixed(0)}px/s`);
    // Né ngay lần nữa → bị hồi chiêu chặn, đứng yên
    s.emit('dodge', { vx: 1, vy: 0 });
    await sleep(380);
    const p3 = { ...me() };
    ok(Math.abs(p3.x - p2.x) <= 6, `né lần 2 bị chặn bởi hồi chiêu (xê dịch ${Math.abs(p3.x - p2.x).toFixed(0)}px)`);
    // Chờ hết hồi 2,5s → né lại được
    await sleep(2300);
    s.emit('dodge', { vx: 1, vy: 0 });
    await sleep(420);
    const p4 = { ...me() };
    ok(p4.x - p3.x >= 65, `hết hồi thì né lại được (${(p4.x - p3.x).toFixed(0)}px)`);
    s.disconnect();
  } finally {
    try { proc.kill('SIGKILL'); } catch {}
  }
  console.log(failures === 0 ? 'ALL PASS' : `${failures} FAIL`);
  process.exit(failures === 0 ? 0 : 1);
})();
