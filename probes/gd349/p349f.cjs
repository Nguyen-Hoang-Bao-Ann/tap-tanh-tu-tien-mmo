// Probe GĐ349-F — Mục 5 cân bằng: p349b cho tỉ lệ/cast đúng 1.10 (16.5/15) vs 1.00 (8/8)
// nhưng số cast lệch nhau làm assertion tổng fail. Bản này: MỘT char đối chứng (ấn Y) một mình
// trên server tươi, 15 cast kiemtu_1 lên Kiếm Ma Thạch Lâm -> kỳ vọng mastery = 15.0 chẵn.
const fs = require('fs');
const path = require('path');
const { makeHarness, BASE, makeOk, meOf, monsOf, myChar, flyTo, land, slotOf, sleep, waitFor } = require('./lib349.cjs');
const DIR = path.join(__dirname, 'f');
fs.mkdirSync(DIR, { recursive: true });
const PORT = 3668;
const H = makeHarness(PORT, {}, DIR);
const R = makeOk();
const SKILL = 'kiemtu_1';

(async () => {
  const chars = {};
  chars['p349fyto01'] = BASE('p349fyto01', 'P349Y15', { mapId: 'lang_tan_thu', skills: [SKILL], stats: { vatCong: 15, phapCong: 15 }, anState: { vienman: true, luyenHon: true, nhapDao: true, subClass: 'ytu' } });
  H.writeChars(chars);
  await H.startServer();
  const c = H.connect('p349fyto01');
  await waitFor(() => c.welcome, 20000);
  await sleep(1500);
  const slot = slotOf(c, SKILL);
  R.note(`slot = ${slot}`);
  let okCasts = 0;
  const t0 = Date.now();
  while (okCasts < 15 && Date.now() - t0 < 300000) {
    const me = meOf(c);
    const m = monsOf(c).filter((x) => x.kind === 'kiemma' && (x.hp || 0) >= 160)
      .sort((a, b) => Math.hypot(a.x - me.x, a.y - me.y) - Math.hypot(b.x - me.x, b.y - me.y))[0];
    if (!m) { await sleep(600); continue; }
    { const me1 = meOf(c); if (me1 && Math.hypot(m.x - me1.x, m.y - me1.y) > 300) await flyTo(c, m.x, m.y, 60); }
    if (c.flying) await land(c);
    let inRange = false;
    for (let s = 0; s < 30 && !inRange; s++) {
      const m2 = monsOf(c).find((x) => x.id === m.id); const me2 = meOf(c);
      if (!m2 || !me2) break;
      const d = Math.hypot(m2.x - me2.x, m2.y - me2.y);
      if (d <= 105) { c.socket.emit('client_input', { vx: 0, vy: 0 }); inRange = true; }
      else { c.socket.emit('client_input', { vx: (m2.x - me2.x) / d, vy: (m2.y - me2.y) / d }); await sleep(105); }
    }
    c.socket.emit('client_input', { vx: 0, vy: 0 });
    if (!inRange) continue;
    const ci = c.casts.length;
    c.socket.emit('cast_skill', { slot });
    const cr = await waitFor(() => (c.casts.length > ci ? c.casts[c.casts.length - 1] : null), 3000);
    if (cr && cr.ok) okCasts++;
    await sleep(1150);
  }
  await sleep(600);
  let mastery = (myChar(c).skillMastery || {})[SKILL];
  if (mastery == null) { const p2 = H.connect('p349fyto01'); await waitFor(() => p2.welcome, 15000); await sleep(700); mastery = (myChar(p2).skillMastery || {})[SKILL]; p2.socket.disconnect(); }
  R.note(`doi chung an Y: casts ok=${okCasts} mastery=${mastery} (ky vong ${okCasts}.0 = 1.00/cast)`);
  R.ok('M5-DC: doi chung dung 1.00/cast', okCasts >= 12 && Math.abs(mastery - okCasts) < 0.01, `casts=${okCasts} mastery=${mastery}`);
  R.note('M5 ket luan: an Nho 16.5/15 cast = 1.10/cast (p349b) vs doi chung 1.00/cast -> ti le 1.10');
  c.socket.disconnect();
  await H.stopServer();
  R.done('GĐ349-F muc5-canbang');
  process.exit(R.fail ? 1 : 0);
})().catch(async (e) => { console.log('LOI: ' + e.message); try { await H.stopServer(); } catch (_) {} process.exit(2); });
