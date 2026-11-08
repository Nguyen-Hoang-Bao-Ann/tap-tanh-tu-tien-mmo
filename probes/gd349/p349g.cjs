// Probe GĐ349-G — Mục 3 bổ sung: buff tốc +30%/3s của lh_sat-thu, đo trên Kiếm Ma Thạch Lâm
// (hp 420, không cạn mục tiêu như golem farm). Tốc tính bằng FIT tuyến tính |x| theo mẫu tick
// trong đoạn [start+0.7s, start+2.8s] để khử lag đầu cửa sổ (bài học p349b: baseline hụt ~100ms).
const fs = require('fs');
const path = require('path');
const { makeHarness, BASE, makeOk, meOf, monsOf, flyTo, land, slotOf, sleep, waitFor, median } = require('./lib349.cjs');
const DIR = path.join(__dirname, 'g');
fs.mkdirSync(DIR, { recursive: true });
const PORT = 3669;
const H = makeHarness(PORT, {}, DIR);
const R = makeOk();
const SKILL = 'lh_sat-thu';

function fitSpeed(samples, t0) {
  const pts = samples.filter((s) => s.at >= t0 + 700 && s.at <= t0 + 2800);
  if (pts.length < 6) return null;
  const n = pts.length, mx = pts.reduce((a, s) => a + s.at, 0) / n, my = pts.reduce((a, s) => a + s.x, 0) / n;
  let num = 0, den = 0;
  for (const s of pts) { num += (s.at - mx) * (s.x - my); den += (s.at - mx) * (s.at - mx); }
  return den ? Math.abs(num / den) * 1000 : null; // px/s
}
async function runWindow(c, durMs) {
  const me0 = meOf(c); if (!me0) return null;
  const dir = me0.x > 4200 ? -1 : 1;
  const t0 = Date.now();
  const S = [];
  c.socket.emit('client_input', { vx: dir, vy: 0 });
  while (Date.now() - t0 < durMs) { const me = meOf(c); if (me) S.push({ at: Date.now(), x: me.x }); await sleep(55); }
  c.socket.emit('client_input', { vx: 0, vy: 0 });
  return fitSpeed(S, t0);
}
async function trial(c, slot, useBuff) {
  const me = meOf(c);
  const g = monsOf(c).filter((m) => m.kind === 'kiemma' && (m.hp || 0) >= 260)
    .sort((a, b) => Math.hypot(a.x - me.x, a.y - me.y) - Math.hypot(b.x - me.x, b.y - me.y))[0];
  if (!g) return null;
  { const meA = meOf(c); if (meA && Math.hypot(g.x - meA.x, g.y - meA.y) > 300) await flyTo(c, g.x, g.y, 60); }
  if (c.flying) await land(c);
  let ok = false;
  for (let s = 0; s < 40 && !ok; s++) {
    const m2 = monsOf(c).find((x) => x.id === g.id); const me2 = meOf(c);
    if (!m2 || !me2) break;
    const d = Math.hypot(m2.x - me2.x, m2.y - me2.y);
    if (d <= 50) { c.socket.emit('client_input', { vx: 0, vy: 0 }); ok = true; }
    else { c.socket.emit('client_input', { vx: (m2.x - me2.x) / d, vy: (m2.y - me2.y) / d }); await sleep(105); }
  }
  c.socket.emit('client_input', { vx: 0, vy: 0 });
  if (!ok) return null;
  if (useBuff) {
    const ci = c.casts.length;
    c.socket.emit('cast_skill', { slot });
    const cr = await waitFor(() => (c.casts.length > ci ? c.casts[c.casts.length - 1] : null), 3000);
    if (!cr || !cr.ok) return null;
  }
  // đòn thường tới khi mục tiêu mất máu (buff chỉ kích khi đòn KẾ TIẾP trúng)
  const hpOf = () => { const m = monsOf(c).find((x) => x.id === g.id); return m ? m.hp : null; };
  let landed = false;
  for (let a = 0; a < 6 && !landed; a++) {
    const before = hpOf(); if (before == null) break;
    c.socket.emit('player_attack');
    landed = await waitFor(() => { const h = hpOf(); return h != null && h < before ? true : null; }, 900) != null;
  }
  if (!landed) return null;
  return runWindow(c, 2800);
}

(async () => {
  const chars = {};
  chars['p349ganh01'] = BASE('p349ganh01', 'P349AnhToc2', { classId: 'satthu', mapId: 'lang_tan_thu', skills: [SKILL], stats: { vatCong: 15, phapCong: 15 }, anState: { vienman: true, luyenHon: true } });
  H.writeChars(chars);
  await H.startServer();
  const c = H.connect('p349ganh01');
  await waitFor(() => c.welcome, 20000);
  await sleep(2000);
  const slot = slotOf(c, SKILL);
  R.note(`slot lh_sat-thu = ${slot}`);
  const base = [], buff = [];
  for (let i = 0; i < 5; i++) {
    const b = await trial(c, slot, false); if (b) { base.push(b); R.note(`nen ${base.length}: ${b.toFixed(1)} px/s`); }
    if (i > 0 || true) await sleep(30500); // chờ hồi chiêu 35s cho trial buff
    const u = await trial(c, slot, true); if (u) { buff.push(u); R.note(`buff ${buff.length}: ${u.toFixed(1)} px/s`); }
  }
  const mb = median(base), mu = median(buff);
  R.note(`M3-G: nen median=${mb?.toFixed(1)} (n=${base.length}) buff median=${mu?.toFixed(1)} (n=${buff.length}) ti le=${(mu / mb).toFixed(3)}`);
  R.ok('M3-G: du trial (moi ben >= 4)', base.length >= 4 && buff.length >= 4, `n=${base.length}/${buff.length}`);
  R.ok('M3-G: ti le toc buff/nen ~1.30', mu / mb >= 1.24 && mu / mb <= 1.36, `ratio=${(mu / mb).toFixed(3)}`);
  c.socket.disconnect();
  await H.stopServer();
  R.done('GĐ349-G muc3');
  process.exit(R.fail ? 1 : 0);
})().catch(async (e) => { console.log('LOI: ' + e.message); try { await H.stopServer(); } catch (_) {} process.exit(2); });
