// Debug: tick quái ở huyet_sac_rung mang field gì (kind/tên)?
const path = require('path');
const { makeHarness, BASE, writeWorld, meOf, monsOf, sleep } = require('./lib338.cjs');
const PORT = 3622;
const DIR = __dirname;
const H = makeHarness(PORT, {}, DIR);
(async () => {
  const chars = { p338dbg001: BASE('p338dbg001', ' DbgSan', { mapId: 'huyet_sac_rung', x: 4200, y: 3000 }) };
  writeWorld(DIR, chars, []);
  await H.startServer();
  const C = await H.connect('p338dbg001');
  await sleep(5000);
  const ms = monsOf(C);
  console.log('tổng quái trong tick:', ms.length);
  const byKind = {};
  for (const m of ms) byKind[m.kind] = (byKind[m.kind] || 0) + 1;
  console.log('theo kind:', JSON.stringify(byKind));
  console.log('mẫu 1 quái:', JSON.stringify(ms[0]));
  const me = meOf(C);
  const near = ms.filter((m) => me && Math.hypot(m.x - me.x, m.y - me.y) < 1200).map((m) => `${m.kind}@${Math.round(Math.hypot(m.x - me.x, m.y - me.y))}px hp=${m.hp}/${m.maxHp}`);
  console.log('quái gần <=1200px:', JSON.stringify(near));
  await H.stopServer();
  process.exit(0);
})().catch(async (e) => { console.error('LOI', e); try { await H.stopServer(); } catch (_) {} process.exit(2); });
