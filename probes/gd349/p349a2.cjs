// Probe GĐ349-A2 — bổ sung mẫu Mục 2 cho cấu hình P3 (Nhập Đạo): p349a chỉ bắt được 1 mẫu
// (2.66s, trong dải nhưng thiếu n>=2). Chạy riêng char P3, 4 lần cast lên golem farm còn đầy máu.
const fs = require('fs');
const path = require('path');
const { makeHarness, BASE, makeOk, meOf, monsOf, flyTo, land, slotOf, sleep, waitFor, median } = require('./lib349.cjs');
const DIR = path.join(__dirname, 'a2');
fs.mkdirSync(DIR, { recursive: true });
const PORT = 3667;
const H = makeHarness(PORT, {}, DIR);
const R = makeOk();
const SKILL = 'lh_phat-tu';

async function measureStun(c, slot, tries) {
  const durs = [];
  for (let i = 0; i < tries; i++) {
    const me = meOf(c);
    const g = monsOf(c).filter((m) => m.kind === 'golem' && (m.hp || 0) >= 130)
      .sort((a, b) => Math.hypot(a.x - me.x, a.y - me.y) - Math.hypot(b.x - me.x, b.y - me.y))[0];
    if (!g) { R.note('khong con golem day mau'); break; }
    if (c.flying) await land(c);
    // đứng sát golem (tầm chiêu 170)
    let ok = false;
    for (let s = 0; s < 40 && !ok; s++) {
      const m2 = monsOf(c).find((x) => x.id === g.id); const me2 = meOf(c);
      if (!m2 || !me2) break;
      const d = Math.hypot(m2.x - me2.x, m2.y - me2.y);
      if (d <= 130) { c.socket.emit('client_input', { vx: 0, vy: 0 }); ok = true; }
      else { c.socket.emit('client_input', { vx: (m2.x - me2.x) / d, vy: (m2.y - me2.y) / d }); await sleep(110); }
    }
    c.socket.emit('client_input', { vx: 0, vy: 0 });
    if (!ok) { R.note('khong tiep can duoc golem'); continue; }
    const ci = c.casts.length;
    const castAt = Date.now();
    c.socket.emit('cast_skill', { slot });
    const cr = await waitFor(() => (c.casts.length > ci ? c.casts[c.casts.length - 1] : null), 3000);
    if (!cr || !cr.ok) { R.note('cast fail: ' + JSON.stringify(cr)); await sleep(2000); continue; }
    const tid = cr.targetId;
    let first = null, last = null;
    const tEnd = Date.now() + 4500;
    while (Date.now() < tEnd) {
      const m = monsOf(c).find((x) => x.id === tid);
      if (m && m.st === 'stun') { const now = Date.now(); if (!first) first = now; last = now; }
      else if (first && !m) break;
      else if (first && m && m.st !== 'stun' && Date.now() - last > 350) break;
      await sleep(50);
    }
    if (first && last) { const dur = (last - castAt + 100) / 1000; durs.push(dur); R.note(`cast ${i + 1}: stun ${dur.toFixed(2)}s tren ${tid}`); }
    else R.note(`cast ${i + 1}: khong bat duoc stun tren ${tid}`);
    if (i < tries - 1) await sleep(40500);
  }
  return durs;
}

(async () => {
  const chars = {};
  chars['p349apht03'] = BASE('p349apht03', 'P349Phat3', { classId: 'phattu', skills: [SKILL], stats: { vatCong: 12, phapCong: 12 }, anState: { vienman: true, luyenHon: true, nhapDao: true } });
  H.writeChars(chars);
  await H.startServer();
  const c = H.connect('p349apht03');
  await waitFor(() => c.welcome, 20000);
  await sleep(2000);
  const slot = slotOf(c, SKILL);
  R.note(`P3 slot = ${slot}`);
  const durs = await measureStun(c, slot, 4);
  const med = median(durs);
  R.note(`P3 tong hop (ke ca mau p349a 2.66): durs moi=[${durs.map((d) => d.toFixed(2)).join(',')}]`);
  const all = [...durs, 2.66];
  const medAll = median(all);
  R.ok('M2 P3-nhapdao (tong mau >= 2, median trong [2.25, 2.85]s)', all.length >= 2 && medAll >= 2.25 && medAll <= 2.85, `median=${medAll.toFixed(2)} n=${all.length}`);
  c.socket.disconnect();
  await H.stopServer();
  R.done('GĐ349-A2 muc2-P3');
  process.exit(R.fail ? 1 : 0);
})().catch(async (e) => { console.log('LOI: ' + e.message); try { await H.stopServer(); } catch (_) {} process.exit(2); });
