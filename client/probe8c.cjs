// Tái hiện khâu mua 3 Nanh Sói của test8: lái tới tiệm rồi mua 3 lần cách nhau 350ms
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
const steerTo = makeSteer(s, S, me);
// Tới Tiệm Nguyên Liệu theo điểm mốc qua hành lang trống (né hẳn cụm nhà phía tây-bắc)
async function goToNguyenLieu() {
  await steerTo({ x: 700, y: 600 }, 60, 20000);
  await steerTo({ x: 285, y: 600 }, 25, 20000);
  await steerTo({ x: 285, y: 390 }, 16, 15000);
  await steerTo({ x: 392, y: 373 }, 40, 15000);
}
(async () => {
  await new Promise((r) => s.on('connect', r));
  s.emit('hello', { token: TOKEN });
  await sleep(800);
  console.log('start: stones=', S.char?.stones, 'fangs=', S.char?.inventory?.nanh_soi, 'pos=', me()?.x, me()?.y);
  const ok = await goToNguyenLieu();
  const p = me();
  console.log(`steer=${ok} pos=(${p?.x},${p?.y}) dist=${p ? Math.hypot(p.x - 392, p.y - 373).toFixed(1) : '?'}`);
  for (let i = 0; i < 3; i++) {
    s.emit('shop_buy', { shopId: 'tiem_nguyen_lieu', itemId: 'nanh_soi' });
    await sleep(350);
    console.log(`  sau mua ${i + 1}: stones=${S.char?.stones} fangs=${S.char?.inventory?.nanh_soi}`);
  }
  s.disconnect();
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(2); });
