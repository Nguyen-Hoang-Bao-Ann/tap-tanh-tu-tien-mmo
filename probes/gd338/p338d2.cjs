// Probe GĐ338-B11 kênh rương (bản 2) — Đại khí vận mở rương ẩn: roll phụ 20% ra dòng "cơ duyên thiên phú".
// DAI đứng điểm farm (7155,627 — an toàn); CTL đứng điểm boss (6105,1230) góp thêm mẫu A5 (có watchdog bay về nếu chết/lệch).
const path = require('path');
const { makeHarness, BASE, writeWorld, makeOk, meOf, flyTo, land, sleep } = require('./lib338.cjs');
const PORT = 3628;
const DIR = __dirname;
const H = makeHarness(PORT, { TTT_HIDDEN_RESPAWN_MS: '60000' }, DIR);
const R = makeOk();
const SPOT_DAI = { x: 7155, y: 627 };
const SPOT_CTL = { x: 6105, y: 1230 };

(async () => {
  const chars = {
    p338d21001: BASE('p338d21001', ' MoRuongVan2', { mapId: 'lang_tan_thu', x: SPOT_DAI.x, y: SPOT_DAI.y, talent: { id: 'dai_khi_van', tier: 'cam' } }),
    p338d21002: BASE('p338d21002', ' MoRuongThuong2', { mapId: 'lang_tan_thu', x: SPOT_CTL.x, y: SPOT_CTL.y }),
  };
  writeWorld(DIR, chars, []);
  await H.startServer();
  const DAI = await H.connect('p338d21001');
  const CTL = await H.connect('p338d21002');
  const opensD = [], opensC = [];
  DAI.socket.on('chest_opened', (e) => opensD.push(e));
  CTL.socket.on('chest_opened', (e) => opensC.push(e));
  const t0 = Date.now();
  let lastPrint = -1;
  while (Date.now() - t0 < 11 * 60000) {
    await sleep(5000);
    // watchdog: lệch điểm >300px thì bay về
    for (const [c, spot] of [[DAI, SPOT_DAI], [CTL, SPOT_CTL]]) {
      const me = meOf(c);
      if (me && Math.hypot(me.x - spot.x, me.y - spot.y) > 300) { await flyTo(c, spot.x, spot.y, 30, 15000); await land(c); }
    }
    const tot = opensD.length + opensC.length;
    if (tot !== lastPrint) { lastPrint = tot; R.note(`t=${Math.round((Date.now() - t0) / 1000)}s DAI mở=${opensD.length} CTL mở=${opensC.length}`); }
    if (opensD.length >= 10) break;
  }
  const linesD = opensD.flatMap((e) => e.loot || []);
  const luck = linesD.filter((l) => l.includes('cơ duyên thiên phú'));
  const linesC = opensC.flatMap((e) => e.loot || []);
  const jadeC = linesC.filter((l) => l === 'Ngọc Giản Trống ×1').length;
  R.note(`B11-rương: DAI mở ${opensD.length} rương — cơ duyên nổ ${luck.length} lần: ${JSON.stringify(luck)}`);
  R.note(`A5 bổ sung: CTL mở ${opensC.length} rương — Ngọc Giản kênh gốc ${jadeC} lần`);
  R.ok('B11 kênh rương: Đại khí vận nổ "cơ duyên thiên phú" (kỳ vọng ~20%/lần mở)', opensD.length >= 8 && luck.length >= 1, `opens=${opensD.length} luck=${luck.length}`);
  R.done('p338d2');
  await H.stopServer();
  process.exit(R.fail ? 1 : 0);
})().catch(async (e) => { console.error('LOI', e); try { await H.stopServer(); } catch (_) {} process.exit(2); });
