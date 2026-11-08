// Probe GĐ338-B2 — Thuận linh khí (Tu vi từ BẾ QUAN +15%): BQTAL vs BQCTL bế quan tại Tụ Linh.
// Đồng hồ ngày 60s thật: 480 phút game/điểm -> 1 sự kiện tu vi mỗi ~20s thật, gained = 1 điểm/sự kiện.
// Nghi vấn (trước vá): gained = Math.round(1 x 1.15) = 1 -> thiên phú bị làm tròn nuốt sạch.
// Chạy 2 chế độ: mặc định = tái hiện (kỳ vọng tal == ctl nếu còn lỗi); EXPECT_FIXED=1 = sau vá (kỳ vọng tal > ctl, ~x1.15).
const path = require('path');
const { makeHarness, BASE, writeWorld, makeOk, sleep } = require('./lib338.cjs');
const PORT = 3618;
const DIR = __dirname;
const H = makeHarness(PORT, { TTT_DAY_REAL_MS: '60000' }, DIR);
const R = makeOk();
const FIXED = process.env.EXPECT_FIXED === '1';

(async () => {
  const chars = {
    p338e20001: BASE('p338e20001', ' BeQuanChuan', { mapId: 'lang_tan_thu', x: 1565, y: 438 }),
    p338e20002: BASE('p338e20002', ' BeQuanThuan', { mapId: 'lang_tan_thu', x: 1600, y: 470, talent: { id: 'thuan_linh_khi', tier: 'lam' } }),
  };
  writeWorld(DIR, chars, []);
  await H.startServer();
  const CTL = await H.connect('p338e20001');
  const TAL = await H.connect('p338e20002');
  const tuvi = (c) => (c.sync && typeof c.sync.tuVi === 'number') ? c.sync.tuVi : (c.welcome?.character?.tuVi || 0);
  CTL.socket.emit('toggle_bequan'); TAL.socket.emit('toggle_bequan');
  await sleep(1500);
  R.note(`trạng thái bequan: ctl errors=${JSON.stringify(CTL.errors)} tal errors=${JSON.stringify(TAL.errors)}`);
  const b0 = tuvi(CTL), b1 = tuvi(TAL);
  const t0 = Date.now();
  while (Date.now() - t0 < 175000) { await sleep(10000); R.note(`t=${Math.round((Date.now() - t0) / 1000)}s ctl=+${tuvi(CTL) - b0} tal=+${tuvi(TAL) - b1}`); }
  const dC = tuvi(CTL) - b0, dT = tuvi(TAL) - b1;
  R.note(`BẾ QUAN 175s: ctl=+${dC} thuan_linh_khi=+${dT} (tỉ lệ ${dC ? (dT / dC).toFixed(3) : '—'}, kỳ vọng đúng = 1.15)`);
  if (!FIXED) R.ok('B2 tái hiện: hệ số x1.15 bị nuốt ở gained=1 (tal == ctl)', dC >= 5 && dT === dC, `ctl=${dC} tal=${dT}`);
  else R.ok('B2 sau vá: Thuận linh khí cho +~15% Tu vi bế quan', dC >= 5 && dT > dC && (dT / dC) >= 1.08 && (dT / dC) <= 1.22, `ctl=${dC} tal=${dT}`);
  R.done('p338e2' + (FIXED ? '-fixed' : ''));
  await H.stopServer();
  process.exit(R.fail ? 1 : 0);
})().catch(async (e) => { console.error('LOI', e); try { await H.stopServer(); } catch (_) {} process.exit(2); });
