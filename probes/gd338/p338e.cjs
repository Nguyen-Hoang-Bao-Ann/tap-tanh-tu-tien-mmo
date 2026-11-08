// Probe GĐ338 — phiên thiền tại Tụ Linh (1565,438), 3 kênh cùng lúc:
//   C2 Tụ Linh (tông pháp): MEDTL (sectTech tu_linh) vs MEDCTL — Tu vi tích lũy, kỳ vọng tỉ lệ ~1.05.
//   C5-thien: MEDART (pháp tự tạo thien:5 đang vận hành, x1.10 qua sectTechMedMulOf) vs MEDCTL — kỳ vọng ~1.10.
//   B3 Thân phục hồi nhanh: HEALTAL vs HEALCTL — dốc hồi hp khi thiền, kỳ vọng x2 (1% -> 2% maxHp/s).
// Đồng hồ ngày 90s thật để trần 15 Tu vi/ngày không cắn (mỗi ngày ~3 nhịp 30s). Đo 12.5 phút (~25 nhịp).
const path = require('path');
const { makeHarness, BASE, SECT, ART, writeWorld, makeOk, sleep, waitFor } = require('./lib338.cjs');
const PORT = 3614;
const DIR = __dirname;
const H = makeHarness(PORT, { TTT_DAY_REAL_MS: '90000' }, DIR);
const R = makeOk();
const TL = { x: 1565, y: 438 };

(async () => {
  const chars = {
    p338e10001: BASE('p338e10001', ' ThienChuan', { mapId: 'lang_tan_thu', x: TL.x, y: TL.y - 38 }),
    p338e10002: BASE('p338e10002', ' ThienTuLinh', { mapId: 'lang_tan_thu', x: TL.x + 85, y: TL.y, sectTech: ['tu_linh'] }),
    p338e10003: BASE('p338e10003', ' ThienPhapTu', { mapId: 'lang_tan_thu', x: TL.x - 85, y: TL.y, sectArts: ['eart1'], sectArtsActive: ['eart1'] }),
    p338e10004: BASE('p338e10004', ' HoiChuan', { mapId: 'lang_tan_thu', x: TL.x, y: TL.y + 82, hp: 2550 }),
    p338e10005: BASE('p338e10005', ' HoiThanPhuc', { mapId: 'lang_tan_thu', x: TL.x + 55, y: TL.y + 62, hp: 2550, talent: { id: 'than_phuc_hoi', tier: 'luc' } }),
  };
  const sects = [SECT('s338e1', 'Thiền Tông', [
    { token: 'p338e10002', name: ' ThienTuLinh', role: 'detu', contrib: 500 },
    { token: 'p338e10003', name: ' ThienPhapTu', role: 'detu', contrib: 500 },
  ], { fund: 0, arts: [ART('eart1', 'Tụ Thiền Kinh', { thien: 5 }, 'f_cong', 'tamphap', 'p338e10003')] })];
  writeWorld(DIR, chars, sects);
  await H.startServer();
  const CTL = await H.connect('p338e10001');
  const TLN = await H.connect('p338e10002');
  const ARTC = await H.connect('p338e10003');
  const HCTL = await H.connect('p338e10004');
  const HTAL = await H.connect('p338e10005');
  for (const c of [CTL, TLN, ARTC, HCTL, HTAL]) c.socket.emit('meditate_toggle');
  await sleep(1500);
  const tuvi = (c) => (c.sync && typeof c.sync.tuVi === 'number') ? c.sync.tuVi : (c.welcome?.character?.tuVi || 0);
  const hp = (c) => (c.sync && typeof c.sync.hp === 'number') ? c.sync.hp : null;
  const base = { ctl: tuvi(CTL), tl: tuvi(TLN), art: tuvi(ARTC) };
  const healSamples = []; // {t, ctl, tal}
  const t0 = Date.now();
  const DUR = 750000;
  while (Date.now() - t0 < DUR) {
    await sleep(5000);
    const t = (Date.now() - t0) / 1000;
    if (t <= 30) healSamples.push({ t, ctl: hp(HCTL), tal: hp(HTAL) });
    if (Math.round(t) % 60 < 6) R.note(`t=${Math.round(t)}s tuvi ctl=${tuvi(CTL) - base.ctl} tl=${tuvi(TLN) - base.tl} art=${tuvi(ARTC) - base.art} | hp ctl=${hp(HCTL)} tal=${hp(HTAL)}`);
  }
  const dCtl = tuvi(CTL) - base.ctl, dTl = tuvi(TLN) - base.tl, dArt = tuvi(ARTC) - base.art;
  R.note(`TU VI sau 750s: ctl=+${dCtl} tu_linh=+${dTl} (ti le ${(dCtl ? dTl / dCtl : 0).toFixed(3)}, ky vong 1.05) | art-thien5=+${dArt} (ti le ${(dCtl ? dArt / dCtl : 0).toFixed(3)}, ky vong 1.10)`);
  R.ok('C2 Tụ Linh thiền x1.05', dCtl >= 15 && dTl > dCtl && (dTl / dCtl) >= 1.02 && (dTl / dCtl) <= 1.09, `ctl=${dCtl} tl=${dTl}`);
  R.ok('C5-thien pháp tự tạo (thien:5 = +10%) thiền', dCtl >= 15 && dArt > dTl && (dArt / dCtl) >= 1.06 && (dArt / dCtl) <= 1.14, `ctl=${dCtl} art=${dArt}`);
  // B3: dốc hồi hp trong 25s đầu (trước khi đầy)
  const s0 = healSamples.find((s) => s.ctl != null && s.tal != null);
  const sN = healSamples.filter((s) => s.ctl != null && s.tal != null && s.tal < 5000).pop() || healSamples[healSamples.length - 1];
  if (s0 && sN && sN.t > s0.t) {
    const slopeCtl = (sN.ctl - s0.ctl) / (sN.t - s0.t), slopeTal = (sN.tal - s0.tal) / (sN.t - s0.t);
    R.note(`B3 dốc hồi: ctl=${slopeCtl.toFixed(1)} hp/s (kỳ vọng ~51 = 1% x 5100), talent=${slopeTal.toFixed(1)} hp/s (kỳ vọng ~102) — cửa sổ ${s0.t.toFixed(0)}s..${sN.t.toFixed(0)}s`);
    R.ok('B3 Thân phục hồi nhanh: thiền hồi máu x2', slopeCtl >= 35 && slopeCtl <= 70 && slopeTal >= 80 && slopeTal <= 125 && slopeTal / slopeCtl >= 1.7, `ctl=${slopeCtl.toFixed(1)} tal=${slopeTal.toFixed(1)}`);
  } else R.ok('B3 Thân phục hồi nhanh', false, 'thiếu mẫu hp');

  R.done('p338e');
  await H.stopServer();
  process.exit(R.fail ? 1 : 0);
})().catch(async (e) => { console.error('LOI', e); try { await H.stopServer(); } catch (_) {} process.exit(2); });
