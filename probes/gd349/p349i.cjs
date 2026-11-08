// Probe GĐ349-I — Mục 3 lần 4 (rút kinh nghiệm p349b/h/h2/h3): buff trial chỉ dùng golem
// ĐẦY máu (140), đứng sát 25px (cast không bị sói cướp đích), kiểm cast_result.targetId == golem
// + golem còn sống sau cast, đòn kế tiếp phải làm golem mất máu, chạy về phía làng (đất trống),
// tốc = fit tuyến tính đoạn [0.7s, 2.8s]. Buff trước, nền sau mỗi vòng.
const fs = require('fs');
const path = require('path');
const { makeHarness, BASE, makeOk, meOf, monsOf, flyTo, land, slotOf, sleep, waitFor, median } = require('./lib349.cjs');
const DIR = path.join(__dirname, 'i');
fs.mkdirSync(DIR, { recursive: true });
const PORT = 3673;
const H = makeHarness(PORT, {}, DIR);
const R = makeOk();
const SKILL = 'lh_sat-thu';

function fitSpeed(S, t0) {
  const pts = S.filter((s) => s.at >= t0 + 700 && s.at <= t0 + 2800);
  if (pts.length < 6) return null;
  const n = pts.length, mx = pts.reduce((a, s) => a + s.at, 0) / n, my = pts.reduce((a, s) => a + s.x, 0) / n;
  let num = 0, den = 0;
  for (const s of pts) { num += (s.at - mx) * (s.x - my); den += (s.at - mx) * (s.at - mx); }
  return den ? Math.abs(num / den) * 1000 : null;
}
async function runWindow(c) {
  const me0 = meOf(c); if (!me0) return null;
  const dir = me0.x > 2000 ? -1 : 1;
  const t0 = Date.now(); const S = [];
  c.socket.emit('client_input', { vx: dir, vy: 0 });
  while (Date.now() - t0 < 2800) { const me = meOf(c); if (me) S.push({ at: Date.now(), x: me.x }); await sleep(55); }
  c.socket.emit('client_input', { vx: 0, vy: 0 });
  return fitSpeed(S, t0);
}
async function approach(c, g) {
  await flyTo(c, g.x, g.y, 25); await land(c);
  for (let s = 0; s < 24; s++) {
    const m2 = monsOf(c).find((x) => x.id === g.id); const me2 = meOf(c);
    if (!m2 || !me2) return false;
    const d = Math.hypot(m2.x - me2.x, m2.y - me2.y);
    if (d <= 45) { c.socket.emit('client_input', { vx: 0, vy: 0 }); return true; }
    c.socket.emit('client_input', { vx: (m2.x - me2.x) / d, vy: (m2.y - me2.y) / d }); await sleep(100);
  }
  c.socket.emit('client_input', { vx: 0, vy: 0 });
  return false;
}
const hpOf = (c, id) => { const m = monsOf(c).find((x) => x.id === id); return m ? m.hp : null; };
async function attackLanded(c, id) {
  for (let a = 0; a < 6; a++) {
    const before = hpOf(c, id); if (before == null) return false;
    c.socket.emit('player_attack');
    // trúng đòn = máu giảm HOẶC quái gục hẳn (đòn x4 của lh_sat-thu thường kết liễu luôn golem đã bị cast bào máu)
    const ok = await waitFor(() => { const h = hpOf(c, id); return (h == null || h < before) ? true : null; }, 900);
    if (ok) return true;
  }
  return false;
}
async function buffTrial(c, slot) {
  const me = meOf(c);
  const g = monsOf(c).filter((m) => m.kind === 'golem' && (m.hp || 0) >= 140)
    .sort((a, b) => Math.hypot(a.x - me.x, a.y - me.y) - Math.hypot(b.x - me.x, b.y - me.y))[0];
  if (!g) { R.note('buffTrial: khong co golem day mau'); return null; }
  if (!(await approach(c, g))) { R.note('buffTrial: approach fail'); return null; }
  const ci = c.casts.length;
  c.socket.emit('cast_skill', { slot });
  const cr = await waitFor(() => (c.casts.length > ci ? c.casts[c.casts.length - 1] : null), 3000);
  if (!cr || !cr.ok || cr.targetId !== g.id) { R.note(`buffTrial: cast fail/sai dich cr=${JSON.stringify(cr)} golem=${g.id}`); return null; }
  if (hpOf(c, g.id) == null) { R.note(`buffTrial: cast ha luon golem (dmg=${cr.dmg})`); return null; }
  if (!(await attackLanded(c, g.id))) { R.note(`buffTrial: don ke khong trung golem (hp sau cast=${hpOf(c, g.id)})`); return null; }
  return runWindow(c);
}
async function baseTrial(c) {
  const me = meOf(c);
  const g = monsOf(c).filter((m) => m.kind === 'golem' && (m.hp || 0) >= 45)
    .sort((a, b) => Math.hypot(a.x - me.x, a.y - me.y) - Math.hypot(b.x - me.x, b.y - me.y))[0];
  if (!g) return null;
  if (!(await approach(c, g))) return null;
  if (!(await attackLanded(c, g.id))) return null;
  return runWindow(c);
}

(async () => {
  const chars = {};
  chars['p349ianh01'] = BASE('p349ianh01', 'P349AnhToc4', { classId: 'satthu', skills: [SKILL], stats: { khiHuyet: 8000, vatCong: 15, vatPhong: 250, phapCong: 15, phapPhong: 250, tocDo: 60, minhMan: 100 }, anState: { vienman: true, luyenHon: true } });
  H.writeChars(chars);
  await H.startServer();
  const c = H.connect('p349ianh01');
  await waitFor(() => c.welcome, 20000);
  await sleep(2000);
  const slot = slotOf(c, SKILL);
  R.note(`slot = ${slot}`);
  const base = [], buff = [];
  const deadline = Date.now() + 13 * 60 * 1000;
  let first = true;
  while ((base.length < 5 || buff.length < 5) && Date.now() < deadline) {
    if (buff.length < 5) {
      if (!first) await sleep(30000);
      first = false;
      const u = await buffTrial(c, slot); if (u) { buff.push(u); R.note(`buff ${buff.length}: ${u.toFixed(1)} px/s`); }
    }
    if (base.length < 5) { await sleep(3500); const b = await baseTrial(c); if (b) { base.push(b); R.note(`nen ${base.length}: ${b.toFixed(1)} px/s`); } }
    await sleep(1200);
  }
  const mb = median(base), mu = median(buff);
  R.note(`M3-I: nen median=${mb?.toFixed(1)} (n=${base.length}) buff median=${mu?.toFixed(1)} (n=${buff.length}) ti le=${(mu / mb).toFixed(3)}`);
  R.ok('M3-I: du trial (moi ben >= 4)', base.length >= 4 && buff.length >= 4, `n=${base.length}/${buff.length}`);
  R.ok('M3-I: ti le toc buff/nen ~1.30', mu / mb >= 1.24 && mu / mb <= 1.36, `ratio=${(mu / mb).toFixed(3)}`);
  c.socket.disconnect();
  await H.stopServer();
  R.done('GĐ349-I muc3');
  process.exit(R.fail ? 1 : 0);
})().catch(async (e) => { console.log('LOI: ' + e.message); try { await H.stopServer(); } catch (_) {} process.exit(2); });
