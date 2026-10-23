// Test GĐ5: spawn quảng trường + làng an toàn + va chạm nhà + combat ngoài làng
const { io } = require('socket.io-client');
const { createMerger } = require('./worldmerge.cjs');
const URL = 'http://localhost:3001';
const VILLAGE = { x: 240, y: 180, w: 920, h: 760 };
const DAO_QUAN = { x: 605, y: 245, w: 190, h: 115 };
const inRect = (x, y, r, pad = 0) => x >= r.x - pad && x <= r.x + r.w + pad && y >= r.y - pad && y <= r.y + r.h + pad;
let failures = 0;
const check = (name, ok, extra = '') => { console.log((ok ? 'PASS' : 'FAIL') + ' | ' + name + (extra ? ' | ' + extra : '')); if (!ok) failures++; };

const me = io(URL, { transports: ['websocket'] });
let myId = null;
let lastTick = null;
const killedEvents = [];
const firstSeen = new Map(); // id quái -> vị trí lần đầu quan sát được (≈ điểm sinh)
me.on('connect', () => { myId = me.id; });
const mergeTick5 = createMerger();
me.on('server_tick', (t) => {
  lastTick = mergeTick5(t);
  for (const m of lastTick.monsters) if (!firstSeen.has(m.id)) firstSeen.set(m.id, { x: m.x, y: m.y });
});
me.on('monster_killed', (e) => killedEvents.push(e));
const myPos = () => lastTick?.players.find((p) => p.id === myId);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  // GĐ6: bắt tay tạo nhân vật trước khi vào thế giới
  const TOKEN = 'tok-test5-' + Date.now().toString(36);
  let welcomed = false;
  me.on('need_character', async () => {
    me.emit('request_roll');
  });
  me.on('roll_result', () => {
    me.emit('create_character', { token: TOKEN, name: 'Người Test Làng', classId: 'thetu' });
  });
  me.on('welcome', () => { welcomed = true; });
  await sleep(400);
  me.emit('hello', { token: TOKEN });
  const tW = Date.now();
  while (Date.now() - tW < 6000 && !welcomed) await sleep(150);
  if (!welcomed) { console.log('FAIL | Không vào được thế giới (welcome)'); process.exit(1); }
  await sleep(400);
  const p0 = myPos();
  check('Spawn tại quảng trường làng', !!p0 && Math.hypot(p0.x - 700, p0.y - 560) <= 100, p0 ? `pos=(${p0.x},${p0.y})` : 'no pos');

  // Làng an toàn: đứng yên trong làng 2.5s, quái không con nào lọt vào làng
  let monsterInvaded = false;
  const t0 = Date.now();
  while (Date.now() - t0 < 2500) {
    if (lastTick) {
      for (const m of lastTick.monsters) {
        if (inRect(m.x, m.y, VILLAGE, 0)) monsterInvaded = true;
      }
    }
    await sleep(120);
  }
  check('Đứng trong làng: không quái nào vào làng', !monsterInvaded, `monsters=${lastTick?.monsters.length}`);

  // Va chạm nhà: đi thẳng lên vào Đạo Quán → phải bị chặn ở mép dưới nhà
  me.emit('client_input', { vx: 0, vy: -1 });
  let minY = Infinity;
  let enteredHouse = false;
  const t1 = Date.now();
  while (Date.now() - t1 < 3500) {
    const p = myPos();
    if (p) {
      minY = Math.min(minY, p.y);
      if (inRect(p.x, p.y, DAO_QUAN, 0)) enteredHouse = true;
    }
    await sleep(100);
  }
  me.emit('client_input', { vx: 0, vy: 0 });
  const pStop = myPos();
  check('Không đi xuyên qua Đạo Quán', !enteredHouse, `minY=${minY}`);
  check('Bị chặn sát mép dưới Đạo Quán', !!pStop && pStop.y > 374 && pStop.y < 430, pStop ? `stop=(${pStop.x},${pStop.y})` : '');

  // Combat ngoài làng: ra bãi farm hạ 1 sói (kế thừa kiểm chứng GĐ4)
  let killed = null;
  const steer = setInterval(() => {
    const p = myPos();
    if (!p || !lastTick || !lastTick.monsters.length) return;
    let best = null, bd = Infinity;
    for (const m of lastTick.monsters) { const d = Math.hypot(m.x - p.x, m.y - p.y); if (d < bd) { bd = d; best = m; } }
    if (!best) return;
    if (bd <= 42) {
      me.emit('client_input', { vx: 0, vy: 0 });
      me.emit('player_attack');
    } else {
      me.emit('client_input', { vx: Math.sign(best.x - p.x), vy: Math.sign(best.y - p.y) });
    }
  }, 120);
  const t2 = Date.now();
  while (Date.now() - t2 < 45000) {
    if (killedEvents.length) { killed = killedEvents[0]; break; }
    await sleep(200);
  }
  clearInterval(steer);
  me.emit('client_input', { vx: 0, vy: 0 });
  check('Ra farm hạ được sói (combat vẫn chạy)', !!killed && killed.by === myId, killed ? killed.monsterId : 'không có sự kiện hạ quái trong 45s');

  // Điểm sinh quái: con mới hồi sinh sau khi bị hạ phải xuất hiện NGOÀI làng
  if (killed) {
    const beforeIds = new Set(lastTick ? lastTick.monsters.map((m) => m.id) : []);
    let respawnPos = null;
    const t3 = Date.now();
    while (Date.now() - t3 < 8000) {
      if (lastTick) {
        for (const m of lastTick.monsters) {
          if (!beforeIds.has(m.id) && m.id !== killed.monsterId) {
            respawnPos = firstSeen.get(m.id) || { x: m.x, y: m.y };
            break;
          }
        }
      }
      if (respawnPos) break;
      await sleep(150);
    }
    check('Quái hồi sinh ngoài làng', !!respawnPos && !inRect(respawnPos.x, respawnPos.y, VILLAGE, 20), respawnPos ? `spawn=(${respawnPos.x},${respawnPos.y})` : 'chưa thấy quái mới');
  }

  console.log(failures === 0 ? 'ALL PASS' : failures + ' FAILURES');
  process.exit(failures === 0 ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(1); });
