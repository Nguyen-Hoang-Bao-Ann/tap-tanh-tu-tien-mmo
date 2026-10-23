// Dò lỗi GĐ8: dùng lại nhân vật test8, lái tới cửa Trưởng Làng + Tiệm Nguyên Liệu, in vị trí thật + lỗi server trả
const fs = require('fs');
const { io } = require('socket.io-client');
const chars = JSON.parse(fs.readFileSync('/tmp/chars-test8.json', 'utf8'));
const entry = Object.entries(chars).find(([, c]) => c.name === 'Kinh Tế Tử');
if (!entry) { console.log('KHONG THAY NHAN VAT'); process.exit(1); }
const TOKEN = entry[0];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const S = { id: null, tick: null, char: null, errs: [] };
const s = io('http://localhost:3004', { transports: ['websocket'] });
s.on('server_tick', (t) => { S.tick = t; });
s.on('welcome', (w) => { S.id = w.id; S.char = w.character; });
s.on('char_sync', (c) => { S.char = c; });
s.on('interact_error', (e) => { S.errs.push(e.message); console.log('  [server error]', e.message); });
s.on('notice', (n) => console.log('  [notice]', n.text));
const me = () => S.tick?.players.find((p) => p.id === S.id);
async function steerTo(target, stopDist, timeoutMs = 25000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    const p = me();
    if (!p) { await sleep(130); continue; }
    const dx = target.x - p.x, dy = target.y - p.y;
    const d = Math.hypot(dx, dy);
    if (d <= stopDist) { s.emit('client_input', { vx: 0, vy: 0 }); return true; }
    let vx = 0, vy = 0;
    if (Math.abs(dx) >= Math.abs(dy) && Math.abs(dx) > 6) vx = Math.sign(dx);
    else if (Math.abs(dy) > 6) vy = Math.sign(dy);
    else if (Math.abs(dx) > 6) vx = Math.sign(dx);
    s.emit('client_input', { vx, vy });
    await sleep(130);
  }
  s.emit('client_input', { vx: 0, vy: 0 });
  return false;
}
(async () => {
  await new Promise((r) => s.on('connect', r));
  s.emit('hello', { token: TOKEN });
  await sleep(800);
  console.log('char:', S.char?.name, 'stones=', S.char?.stones, 'quests=', JSON.stringify(S.char?.quests), 'pos=', me()?.x, me()?.y);
  for (const [label, pt] of [['Trưởng Làng', { x: 387, y: 541 }], ['Tiệm Nguyên Liệu', { x: 392, y: 396 }], ['Tiệm Đan', { x: 1012, y: 541 }]]) {
    const ok = await steerTo(pt, 40);
    const p = me();
    const d = p ? Math.hypot(p.x - pt.x, p.y - pt.y) : -1;
    console.log(`${label}: steer=${ok} pos=(${p?.x},${p?.y}) dist tới điểm = ${d.toFixed(1)} (server cần ≤80)`);
    if (label === 'Trưởng Làng') { s.emit('quest_claim', { questId: 'q_nanhsoi' }); await sleep(600); }
    if (label === 'Tiệm Nguyên Liệu') { s.emit('shop_buy', { shopId: 'tiem_nguyen_lieu', itemId: 'nanh_soi' }); await sleep(600); console.log('  stones sau mua thử:', S.char?.stones); }
  }
  s.disconnect();
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(2); });
