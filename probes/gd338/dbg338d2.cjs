// Debug rương ẩn: char đứng tại điểm hc_tc_farm — vị trí sống + chest trong tick?
const path = require('path');
const { makeHarness, BASE, writeWorld, meOf, sleep } = require('./lib338.cjs');
const PORT = 3627;
const DIR = __dirname;
const H = makeHarness(PORT, { TTT_HIDDEN_RESPAWN_MS: '60000' }, DIR);
(async () => {
  const chars = {
    p338dbg101: BASE('p338dbg101', ' DbgRuong1', { mapId: 'lang_tan_thu', x: 7155, y: 627 }),
    p338dbg102: BASE('p338dbg102', ' DbgRuong2', { mapId: 'lang_tan_thu', x: 6105, y: 1230 }),
  };
  writeWorld(DIR, chars, []);
  await H.startServer();
  const C1 = await H.connect('p338dbg101');
  const C2 = await H.connect('p338dbg102');
  let opens = 0;
  C1.socket.on('disconnect', (r) => console.log('C1 DISCONNECT', r)); C1.socket.on('chest_opened', (e) => { opens++; console.log('C1 MỞ RƯƠNG:', JSON.stringify(e.loot)); });
  C2.socket.on('disconnect', (r) => console.log('C2 DISCONNECT', r)); C2.socket.on('chest_opened', (e) => { opens++; console.log('C2 MỞ RƯƠNG:', JSON.stringify(e.loot)); });
  for (let i = 0; i < 50; i++) {
    await sleep(4000);
    const m1 = meOf(C1), m2 = meOf(C2);
    console.log(`t=${(i + 1) * 4}s C1@${m1 ? Math.round(m1.x) + ',' + Math.round(m1.y) : '?'} C2@${m2 ? Math.round(m2.x) + ',' + Math.round(m2.y) : '?'} chests=${(C1.state?.chests || []).length}/${(C2.state?.chests || []).length} opens=${opens}`);
  }
  await H.stopServer();
  process.exit(0);
})().catch(async (e) => { console.error('LOI', e); try { await H.stopServer(); } catch (_) {} process.exit(2); });
