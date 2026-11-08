// Probe GĐ349-H — Mục 3 lần 3: buff +30%/3s của lh_sat-thu trên GOLEM FARM (bề mặt đã chạy
// được ở p349b), nâng cấp: (a) tốc = FIT tuyến tính |x| trên đoạn [start+0.7s, start+2.8s]
// khử lag đầu cửa sổ; (b) trial fail thì chờ 6s thử lại (golem hồi sinh), mục tiêu 5+5 mẫu.
const fs = require('fs');
const path = require('path');
const { makeHarness, BASE, makeOk, meOf, monsOf, flyTo, land, slotOf, sleep, waitFor, median } = require('./lib349.cjs');
const DIR = path.join(__dirname, 'h');
fs.mkdirSync(DIR, { recursive: true });
const PORT = 3670;
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
  const dir = me0.x > 2400 ? -1 : 1;
  const t0 = Date.now(); const S = [];
  c.socket.emit('client_input', { vx: dir, vy: 0 });
  while (Date.now() - t0 < 2800) { const me = meOf(c); if (me) S.push({ at: Date.now(), x: me.x }); await sleep(55); }
  c.socket.emit('client_input', { vx: 0, vy: 0 });
  return fitSpeed(S, t0);
}
async function trial(c, slot, useBuff) {
  const minHp = useBuff ? 100 : 45;
  const me = meOf(c);
  let g = monsOf(c).filter((m) => m.kind === 'golem' && (m.hp || 0) >= minHp)
    .sort((a, b) => useBuff ? (b.hp || 0) - (a.hp || 0) : (a.hp || 0) - (b.hp || 0))[0];
  if (!g && useBuff) {
    // không còn golem đủ trâu: hạ nốt con đầy nhất cho nó hồi sinh đầy máu rồi chọn lại
    const full = monsOf(c).filter((m) => m.kind === 'golem').sort((a, b) => (b.hp || 0) - (a.hp || 0))[0];
    if (full) {
      await flyTo(c, full.x, full.y, 25); await land(c);
      for (let a = 0; a < 25; a++) { if (!monsOf(c).find((x) => x.id === full.id)) break; c.socket.emit('player_attack'); await sleep(420); }
      await sleep(6500);
      g = monsOf(c).filter((m) => m.kind === 'golem' && (m.hp || 0) >= minHp).sort((a, b) => (b.hp || 0) - (a.hp || 0))[0];
    }
  }
  if (!g) return null;
  await flyTo(c, g.x, g.y, 25); await land(c);
  // ghì sát golem (nó có thể đã đi khỏi điểm bay tới)
  for (let s = 0; s < 30; s++) {
    const m2 = monsOf(c).find((x) => x.id === g.id); const me2 = meOf(c);
    if (!m2 || !me2) break;
    const d = Math.hypot(m2.x - me2.x, m2.y - me2.y);
    if (d <= 50) break;
    c.socket.emit('client_input', { vx: (m2.x - me2.x) / d, vy: (m2.y - me2.y) / d }); await sleep(105);
  }
  c.socket.emit('client_input', { vx: 0, vy: 0 });
  if (useBuff) {
    const ci = c.casts.length;
    c.socket.emit('cast_skill', { slot });
    const cr = await waitFor(() => (c.casts.length > ci ? c.casts[c.casts.length - 1] : null), 3000);
    if (!cr || !cr.ok) return null;
  }
  const hpOf = () => { const m = monsOf(c).find((x) => x.id === g.id); return m ? m.hp : null; };
  let landed = false;
  for (let a = 0; a < 6 && !landed; a++) {
    const before = hpOf(); if (before == null) break;
    c.socket.emit('player_attack');
    landed = await waitFor(() => { const h = hpOf(); return h != null && h < before ? true : null; }, 900) != null;
  }
  if (!landed) return null;
  return runWindow(c);
}

(async () => {
  const chars = {};
  chars['p349hanh01'] = BASE('p349hanh01', 'P349AnhToc3', { classId: 'satthu', skills: [SKILL], stats: { vatCong: 15, phapCong: 15 }, anState: { vienman: true, luyenHon: true } });
  H.writeChars(chars);
  await H.startServer();
  const c = H.connect('p349hanh01');
  await waitFor(() => c.welcome, 20000);
  await sleep(2000);
  const slot = slotOf(c, SKILL);
  R.note(`slot = ${slot}`);
  const base = [], buff = [];
  const deadline = Date.now() + 14 * 60 * 1000;
  let round = 0;
  while ((base.length < 5 || buff.length < 5) && Date.now() < deadline) {
    round++;
    if (base.length < 5) { const b = await trial(c, slot, false); if (b) { base.push(b); R.note(`nen ${base.length}: ${b.toFixed(1)} px/s`); } }
    if (buff.length < 5) {
      await sleep(30500);
      const u = await trial(c, slot, true); if (u) { buff.push(u); R.note(`buff ${buff.length}: ${u.toFixed(1)} px/s`); }
    }
    if (round % 3 === 0) R.note(`vong ${round}: nen=${base.length} buff=${buff.length}`);
    await sleep(1500);
  }
  const mb = median(base), mu = median(buff);
  R.note(`M3-H: nen median=${mb?.toFixed(1)} (n=${base.length}) buff median=${mu?.toFixed(1)} (n=${buff.length}) ti le=${(mu / mb).toFixed(3)}`);
  R.ok('M3-H: du trial (moi ben >= 4)', base.length >= 4 && buff.length >= 4, `n=${base.length}/${buff.length}`);
  R.ok('M3-H: ti le toc buff/nen ~1.30', mu / mb >= 1.24 && mu / mb <= 1.36, `ratio=${(mu / mb).toFixed(3)}`);
  c.socket.disconnect();
  await H.stopServer();
  R.done('GĐ349-H muc3');
  process.exit(R.fail ? 1 : 0);
})().catch(async (e) => { console.log('LOI: ' + e.message); try { await H.stopServer(); } catch (_) {} process.exit(2); });
