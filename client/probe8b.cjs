// Dò đường tới Tiệm Nguyên Liệu: in vị trí mỗi giây + kết quả bán thử
const fs = require('fs');
const { io } = require('socket.io-client');
const chars = JSON.parse(fs.readFileSync('/tmp/chars-test8.json', 'utf8'));
const entry = Object.entries(chars).sort((a, b) => (a[1].createdAt < b[1].createdAt ? 1 : -1))[0];
const TOKEN = entry[0];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const S = { id: null, tick: null, char: null };
const s = io('http://localhost:3004', { transports: ['websocket'] });
s.on('server_tick', (t) => { S.tick = t; });
s.on('welcome', (w) => { S.id = w.id; S.char = w.character; });
s.on('char_sync', (c) => { S.char = c; });
s.on('interact_error', (e) => console.log('  [server error]', e.message));
s.on('notice', (n) => console.log('  [notice]', n.text));
const me = () => S.tick?.players.find((p) => p.id === S.id);
const { makeSteer } = require('./steer.cjs');
const steerToBase = makeSteer(s, S, me);
async function steerTo(target, stopDist, timeoutMs = 30000) {
  const r = await steerToBase(target, stopDist, timeoutMs);
  const p = me();
  console.log(`  → steer=${r} pos=(${p?.x},${p?.y})`);
  return r;
}
(async () => {
  await new Promise((r) => s.on('connect', r));
  s.emit('hello', { token: TOKEN });
  await sleep(800);
  console.log('char:', S.char?.name, 'stones=', S.char?.stones, 'fangs=', S.char?.inventory?.nanh_soi, 'start pos=', me()?.x, me()?.y);
  const pt = { x: 392, y: 373 };
  const ok = await steerTo(pt, 40);
  const p = me();
  console.log(`Tiệm Nguyên Liệu: steer=${ok} pos=(${p?.x},${p?.y}) dist=${p ? Math.hypot(p.x - pt.x, p.y - pt.y).toFixed(1) : '?'}`);
  s.emit('shop_sell', { shopId: 'tiem_nguyen_lieu', itemId: 'nanh_soi' });
  await sleep(700);
  console.log('sau bán thử: stones=', S.char?.stones, 'fangs=', S.char?.inventory?.nanh_soi);
  s.disconnect();
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(2); });
