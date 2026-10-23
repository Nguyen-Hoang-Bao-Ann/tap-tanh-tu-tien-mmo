// Bot hỗ trợ chụp ảnh đồ rơi: đo linh căn, hạ sói bằng chiêu tầm xa (giữ ≥80px),
// KHÔNG nhặt đồ — ghi tọa độ đồ rơi ra /tmp/dropflag.json rồi rút về làng.
const fs = require('fs');
const { io } = require('socket.io-client');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const S = { id: null, tick: null, char: null };
const s = io('http://localhost:3004', { transports: ['websocket'] });
s.on('server_tick', (t) => { S.tick = t; });
s.on('welcome', (w) => { S.id = w.id; S.char = w.character; });
s.on('char_sync', (c) => { S.char = c; });
s.on('need_character', () => s.emit('request_roll'));
s.on('roll_result', () => s.emit('create_character', { name: 'Thợ Săn Ảnh', classId: 'kiemtu' }));
const me = () => S.tick?.players.find((p) => p.id === S.id);
const { makeSteer } = require('/home/hatch/workspace/tap-tanh-tu-tien-mmo/client/steer.cjs');
const steerTo = makeSteer(s, S, me);
(async () => {
  await new Promise((r) => s.on('connect', r));
  s.emit('hello', { token: 'bot-shot-' + Date.now() });
  await sleep(700);
  await steerTo({ x: 700, y: 470 }, 25);
  await steerTo({ x: 700, y: 384 }, 18);
  s.emit('measure_linhcan');
  await sleep(800);
  console.log('linhcan:', !!S.char?.linhCan, 'skills:', (S.char?.skills || []).length);
  // Tìm sói gần (1350,560) nhất
  const wolves = S.tick?.monsters || [];
  let target = null, bd = Infinity;
  for (const m of wolves) { const d = Math.hypot(m.x - 1350, m.y - 560); if (d < bd) { bd = d; target = m; } }
  console.log('wolf target:', target?.id, 'at', target?.x, target?.y);
  const wolfId = target.id;
  // Kite: giữ 85–112px, cast ô 1 mỗi 1,2s
  let lastCast = 0;
  const t0 = Date.now();
  let killed = false;
  while (Date.now() - t0 < 90000 && !killed) {
    const t = S.tick;
    killed = !(t?.monsters || []).some((m) => m.id === wolfId);
    if (killed) break;
    const w = (t?.monsters || []).find((m) => m.id === wolfId);
    const p = me();
    if (!w || !p) { await sleep(120); continue; }
    const d = Math.hypot(w.x - p.x, w.y - p.y);
    if (d > 112) await steerTo(() => w, 105, 400);
    else if (d < 85) {
      // Lùi thẳng ra xa sói 1 nhịp (phát lệnh trực tiếp — KHÔNG gọi steerTo với
      // stopDist vô cực, vòng lặp sẽ quay tít không nghỉ làm tràn bộ nhớ)
      let vx = 0, vy = 0;
      const dx = p.x - w.x, dy = p.y - w.y;
      if (Math.abs(dx) >= Math.abs(dy)) vx = Math.sign(dx) || 1; else vy = Math.sign(dy) || 1;
      s.emit('client_input', { vx, vy });
      await sleep(350);
    } else {
      s.emit('client_input', { vx: 0, vy: 0 });
      await sleep(120);
    }
    if (d <= 118 && Date.now() - lastCast > 1200) {
      lastCast = Date.now();
      s.emit('cast_skill', { slot: 0 });
    }
  }
  console.log('killed:', killed);
  await sleep(500);
  const drops = S.tick?.drops || [];
  console.log('drops:', JSON.stringify(drops));
  if (drops.length) fs.writeFileSync('/tmp/dropflag.json', JSON.stringify(drops));
  // Rút về làng (không đi qua vị trí đồ rơi)
  await steerTo({ x: 700, y: 560 }, 60, 20000);
  s.disconnect();
  process.exit(drops.length ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(2); });
