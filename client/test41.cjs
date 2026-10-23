// TEST GĐ53 — VA CHẠM: thân cây chặn người (trước đây đi xuyên), khung
// nhà nở theo mái hiên (không lọt vào nóc/hông), mặt tiền giữ nguyên.
const { io } = require('socket.io-client');
const { spawn } = require('child_process');
const fs = require('fs');
const { createMerger } = require('./worldmerge.cjs');

const PORT = 3058;
const URL = `http://localhost:${PORT}`;
const CHAR_FILE = '/tmp/ttt-t41-chars.json';
const WORLD_FILE = '/tmp/ttt-t41-world.json';
let failures = 0;
function ok(cond, label) { console.log(`${cond ? 'PASS' : 'FAIL'}  ${label}`); if (!cond) failures++; }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function startServer() {
  for (const f of [CHAR_FILE, WORLD_FILE, '/tmp/ttt-t41-acc.json']) fs.rmSync(f, { force: true });
  fs.writeFileSync(WORLD_FILE, JSON.stringify({ totalMinutes: 4 * 1440 + 600, savedAt: Date.now() }));
  const proc = spawn('node', ['../server/index.js'], {
    cwd: __dirname,
    env: { ...process.env, PORT: String(PORT), TTT_CHAR_FILE: CHAR_FILE, TTT_ACC_FILE: '/tmp/ttt-t41-acc.json', TTT_WORLD_FILE: WORLD_FILE },
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
    s.emit('hello', { token: 'tok-col41' });
    await needP;
    s.emit('request_roll');
    await waitEv(s, 'roll_result');
    const welP = waitEv(s, 'welcome');
    s.emit('create_character', { token: 'tok-col41', name: 'Va Chạm', classId: 'thetu' });
    await welP;
    await waitFor(() => !!S.tick, 6000, 'tick');
    const me = () => S.tick.players.find((p) => p.name === 'Va Chạm');
    await waitFor(() => !!me(), 6000, 'thấy mình');

    async function steer(tx, ty, r = 12, ms = 12000) {
      const t0 = Date.now();
      while (Date.now() - t0 < ms) {
        const p = me();
        const dx = tx - p.x, dy = ty - p.y;
        if (Math.hypot(dx, dy) <= r) break;
        const len = Math.hypot(dx, dy) || 1;
        s.emit('client_input', { vx: dx / len, vy: dy / len });
        await sleep(100);
      }
      s.emit('client_input', { vx: 0, vy: 0 });
      await sleep(150);
    }
    async function hold(vx, vy, ms, track) {
      const t0 = Date.now();
      s.emit('client_input', { vx, vy });
      while (Date.now() - t0 < ms) { if (track) track(me()); await sleep(45); }
      s.emit('client_input', { vx: 0, vy: 0 });
      await sleep(150);
    }

    // A: đi thẳng vào thân cây (520,300) từ phía nam.
    // Vùng chặn kết thúc ở y=332; mỗi tick đi ~26px + bước nửa → dừng trong (332, 346].
    await steer(520, 430);
    let minY = Infinity;
    await hold(0, -1, 2600, (p) => { minY = Math.min(minY, p.y); });
    ok(minY >= 330 && me().y <= 348, `A thân cây chặn: dừng y=${me().y.toFixed(0)} (min ${minY.toFixed(0)}, mép chặn 332)`);

    // B: đi vào nóc Đạo Quán từ phía bắc
    await steer(700, 150);
    let maxY = -Infinity;
    await hold(0, 1, 2600, (p) => { maxY = Math.max(maxY, p.y); });
    ok(maxY <= 224, `B nóc nhà chặn sớm: dừng y=${me().y.toFixed(0)} (max ${maxY.toFixed(0)}, chặn ~215)`);

    // C: mặt tiền Đạo Quán — áp sát như cũ (mép chặn 374, dừng trong (374, 388]).
    // Phải vòng qua phía đông vì đường thẳng từ phía bắc bị chính tòa nhà chặn.
    await steer(880, 460);
    await steer(700, 460);
    await hold(0, -1, 2000);
    ok(me().y >= 368 && me().y <= 390, `C mặt tiền áp sát: dừng y=${me().y.toFixed(0)} (kỳ vọng ~374-388)`);

    // D: vòng quanh cây (520,300) — không kẹt, không xuyên
    await steer(520, 430);
    let minD = Infinity;
    const watcher = setInterval(() => { const p = me(); if (p) minD = Math.min(minD, Math.hypot(p.x - 520, p.y - 312)); }, 40);
    await steer(462, 352, 10);
    await steer(462, 272, 10);
    await steer(578, 272, 10);
    await steer(578, 352, 10);
    clearInterval(watcher);
    ok(minD >= 15, `D vòng quanh cây: gần nhất tâm thân ${minD.toFixed(0)}px, không xuyên/kẹt`);

    s.disconnect();
  } finally {
    try { proc.kill('SIGKILL'); } catch {}
  }
  console.log(failures === 0 ? 'ALL PASS' : `${failures} FAIL`);
  process.exit(failures === 0 ? 0 : 1);
})();
