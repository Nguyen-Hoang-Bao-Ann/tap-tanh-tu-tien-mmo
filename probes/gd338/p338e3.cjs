// Probe GĐ338-B3 (bản đo lại) — Thân phục hồi nhanh: thiền hồi máu x2.
// Hai char hp 2550/5100 thiền tại Tụ Linh; lấy mẫu hp TỪ TICK (state.players) mỗi 500ms trong 90s,
// khớp dốc trên đoạn tăng (2600..5000). Kỳ vọng: ctl ~51 hp/s (1%/s), talent ~102 hp/s.
const path = require('path');
const { makeHarness, BASE, writeWorld, makeOk, meOf, sleep } = require('./lib338.cjs');
const PORT = 3629;
const DIR = __dirname;
const H = makeHarness(PORT, {}, DIR);
const R = makeOk();
const TL = { x: 1565, y: 438 };

function slopeOf(samples) {
  // samples: [{t(s), hp}] — đoạn tăng liên tục từ lần đầu hp>2560 tới khi hp>=5050
  const seg = samples.filter((s) => s.hp != null && s.hp > 2560 && s.hp < 5050);
  if (seg.length < 5) return null;
  const a = seg[0], b = seg[seg.length - 1];
  if (b.t - a.t < 3) return null;
  return (b.hp - a.hp) / (b.t - a.t);
}

(async () => {
  const chars = {
    p338e31001: BASE('p338e31001', ' HoiChuan3', { mapId: 'lang_tan_thu', x: TL.x - 40, y: TL.y + 60, hp: 2550 }),
    p338e31002: BASE('p338e31002', ' HoiThanPhuc3', { mapId: 'lang_tan_thu', x: TL.x + 40, y: TL.y + 60, hp: 2550, talent: { id: 'than_phuc_hoi', tier: 'luc' } }),
  };
  writeWorld(DIR, chars, []);
  await H.startServer();
  const CTL = await H.connect('p338e31001');
  const TAL = await H.connect('p338e31002');
  CTL.socket.emit('meditate_toggle');
  TAL.socket.emit('meditate_toggle');
  const sCtl = [], sTal = [], sCtlSync = [], sTalSync = [];
  const t0 = Date.now();
  while (Date.now() - t0 < 90000) {
    const t = (Date.now() - t0) / 1000;
    const mc = meOf(CTL), mt = meOf(TAL);
    sCtl.push({ t, hp: mc ? mc.hp : null });
    sTal.push({ t, hp: mt ? mt.hp : null });
    sCtlSync.push({ t, hp: CTL.sync && typeof CTL.sync.hp === 'number' ? CTL.sync.hp : null });
    sTalSync.push({ t, hp: TAL.sync && typeof TAL.sync.hp === 'number' ? TAL.sync.hp : null });
    if (mc && mt && mc.hp >= 5100 && mt.hp >= 5100 && t > 55) break;
    await sleep(500);
  }
  let sc = slopeOf(sCtl), st = slopeOf(sTal), src = 'tick';
  if (sc == null || st == null) { sc = slopeOf(sCtlSync); st = slopeOf(sTalSync); src = 'sync'; }
  const fullC = sCtl.find((s) => s.hp >= 5100), fullT = sTal.find((s) => s.hp >= 5100);
  R.note(`B3 (${src}): dốc ctl=${sc ? sc.toFixed(1) : 'n/a'} hp/s (kỳ vọng ~51), talent=${st ? st.toFixed(1) : 'n/a'} hp/s (kỳ vọng ~102) | đầy máu: ctl@${fullC ? fullC.t.toFixed(0) : '?'}s talent@${fullT ? fullT.t.toFixed(0) : '?'}s`);
  R.ok('B3 Thân phục hồi nhanh: thiền hồi máu x2', sc != null && st != null && sc >= 38 && sc <= 68 && st >= 78 && st <= 130 && st / sc >= 1.7 && st / sc <= 2.3, `ctl=${sc} tal=${st}`);
  R.done('p338e3');
  await H.stopServer();
  process.exit(R.fail ? 1 : 0);
})().catch(async (e) => { console.error('LOI', e); try { await H.stopServer(); } catch (_) {} process.exit(2); });
