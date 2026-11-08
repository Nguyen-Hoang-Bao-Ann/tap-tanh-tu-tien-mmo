// Probe GĐ338 — B9 (Bước chân nhẹ x1.05 tốc chạy, nhân thẳng ở dòng di chuyển) + C1 (Cấp Hành +3% tocDo qua speedOf bão hòa).
// Đo trên map farm trống góc: chạy thẳng mặt đất, lấy median tốc từng khoảng 100ms (chỉ khoảng dịch >5px).
// Kỳ vọng: BUOC/CTL ~1.05 (dải 1.02–1.08); CAP/CTL ~1.0013 theo công thức speedOf(61.8)/speedOf(60) — dưới ngưỡng phân giải dịch chuyển.
const path = require('path');
const { makeHarness, BASE, SECT, writeWorld, makeOk, meOf, flyTo, land, runLine, sleep, waitFor, median } = require('./lib338.cjs');
const PORT = 3616;
const DIR = __dirname;
const H = makeHarness(PORT, {}, DIR);
const R = makeOk();

async function speedOfChar(c, tag) {
  for (const yOff of [0, -260, 260, -520, 520]) {
    await flyTo(c, 900, 900 + yOff, 50, 15000); await land(c);
    const { speeds } = await runLine(c, 1, 0, 9000);
    const med = median(speeds);
    R.note(`${tag} yOff=${yOff}: n=${speeds.length} median=${med.toFixed(1)}px/s`);
    if (speeds.length >= 40 && med > 150) return med;
  }
  return 0;
}
(async () => {
  const chars = {
    p338s10001: BASE('p338s10001', ' ChayChuan', { mapId: 'huyet_sac_rung', x: 900, y: 900 }),
    p338s10002: BASE('p338s10002', ' ChayBuocNhe', { mapId: 'huyet_sac_rung', x: 900, y: 900, talent: { id: 'buoc_chan', tier: 'luc' } }),
    p338s10003: BASE('p338s10003', ' ChayCapHanh', { mapId: 'huyet_sac_rung', x: 900, y: 900, sectTech: ['cap_hanh'] }),
  };
  const sects = [SECT('s338s1', 'Tốc Tông', [{ token: 'p338s10003', name: ' ChayCapHanh', role: 'detu', contrib: 500 }], { fund: 0 })];
  writeWorld(DIR, chars, sects);
  await H.startServer();
  const CTL = await H.connect('p338s10001');
  const BUOC = await H.connect('p338s10002');
  const CAP = await H.connect('p338s10003');
  const sC = await speedOfChar(CTL, 'CTL');
  const sB = await speedOfChar(BUOC, 'BUOC');
  const sH = await speedOfChar(CAP, 'CAPHANH');
  if (sC && sB) {
    const r = sB / sC;
    R.note(`B9: CTL=${sC.toFixed(1)} BUOC=${sB.toFixed(1)} tỉ lệ=${r.toFixed(3)} (kỳ vọng 1.05)`);
    R.ok('B9 Bước chân nhẹ x1.05 tốc chạy', r >= 1.02 && r <= 1.08, `ratio=${r.toFixed(3)}`);
  } else R.ok('B9 Bước chân nhẹ x1.05 tốc chạy', false, `sC=${sC} sB=${sB}`);
  if (sC && sH) {
    const r = sH / sC;
    R.note(`C1: CTL=${sC.toFixed(1)} CAP_HANH=${sH.toFixed(1)} tỉ lệ=${r.toFixed(4)} (công thức dự đoán 1.0013 — +3% tocDo qua speedOf bão hòa)`);
    R.ok('C1 Cấp Hành: dịch chuyển khớp dự đoán công thức (<= +0.5%, không phải +3%)', r >= 0.99 && r <= 1.008, `ratio=${r.toFixed(4)}`);
  } else R.ok('C1 Cấp Hành', false, `sC=${sC} sH=${sH}`);
  R.done('p338g');
  await H.stopServer();
  process.exit(R.fail ? 1 : 0);
})().catch(async (e) => { console.error('LOI', e); try { await H.stopServer(); } catch (_) {} process.exit(2); });
