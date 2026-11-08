// Probe GĐ349-A — Mục 1 (Ma Tâm Trấn kháng khống chế) + Mục 2 (choáng Phổ Độ Hồn Ấn).
// MỤC 1: resistCC (server/index.js:2785): tỉ lệ kháng = min(0.75, yChi*0.02 + (ma_tam_tran ? 0.20 : 0)).
//   Nguồn CC kiểm soát được: thuy_trieu_tinh slowOnHit {40%, 3s} — MỌI đòn trúng đều gọi
//   applyPlayerStatus -> resistCC('chậm') (server/index.js:9743). Kháng thành công -> notice
//   "Ma Tâm Trấn kháng chậm!" luôn phát; trúng đòn -> máu tụt (atk 8, def 10 -> 7 máu/đòn, tất định).
//   Đếm: số đòn = số lần máu tụt trong tick khi quanh mình chỉ có thuy trong 130px; tỉ lệ = kháng/đòn.
//   Đối chứng không thiên phú (yChi = 0, hiddenStats rỗng): kỳ vọng 0 lần kháng.
// MỤC 2: Phổ Độ Hồn Ấn lh_phat-tu fx.stun = 1.5s; đường Thánh tăng (vmOf = anState.vienman)
//   cộng +1s tại applyFxToMonster (server/index.js:9278, bossK = 1 với quái thường).
//   Đo qua trường 'st' của quái trong tick (='stun' khi choáng): P0 không đường -> ~1.5s;
//   P2 Luyện Hồn (có Viên Mãn) -> ~2.5s; P3 Nhập Đạo -> ~2.5s (nấc 3 giữ +1s, không cộng thêm).
const fs = require('fs');
const path = require('path');
const { makeHarness, BASE, makeOk, meOf, monsOf, flyTo, land, steerTo, slotOf, waitStableMons, sleep, waitFor, median } = require('./lib349.cjs');
const DIR = path.join(__dirname, 'a');
fs.mkdirSync(DIR, { recursive: true });
const PORT = 3660;
const H = makeHarness(PORT, {}, DIR);
const R = makeOk();

// ---------- MỤC 1 ----------
async function campThuy(c, targetHits, timeoutMs, tag) {
  // tìm thuy cô lập nhất (quái khác gần nhất càng xa càng tốt)
  let best = null, bestScore = -1;
  for (const m of monsOf(c)) {
    if (m.kind !== 'thuy_trieu_tinh') continue;
    let dMin = 1e9;
    for (const o of monsOf(c)) { if (o.id === m.id) continue; dMin = Math.min(dMin, Math.hypot(o.x - m.x, o.y - m.y)); }
    if (dMin > bestScore) { bestScore = dMin; best = m; }
  }
  if (!best) return null;
  R.note(`${tag}: thuy ${best.id} tai (${Math.round(best.x)},${Math.round(best.y)}), quái khác gần nhất ${Math.round(bestScore)}px`);
  await flyTo(c, best.x, best.y, 30);
  await land(c);
  const me0 = meOf(c);
  const t0 = Date.now();
  let prevHp = me0 ? me0.hp : null, hits = 0, foreign = 0;
  const noticeStart = c.noticeLog.length;
  while (Date.now() - t0 < timeoutMs && hits < targetHits) {
    await sleep(90);
    const me = meOf(c); if (!me || prevHp == null) { if (me) prevHp = me.hp; continue; }
    if (me.hp < prevHp) {
      const near = monsOf(c).filter((m) => Math.hypot(m.x - me.x, m.y - me.y) <= 130);
      if (near.length === 1 && near[0].kind === 'thuy_trieu_tinh') hits++; else foreign++;
      prevHp = me.hp;
    } else if (me.hp > prevHp) prevHp = me.hp;
  }
  const resists = c.noticeLog.slice(noticeStart).filter((n) => n.text.includes('kháng chậm')).length;
  const appliedNotes = c.noticeLog.slice(noticeStart).filter((n) => n.text.includes('bị làm chậm')).length;
  return { hits, foreign, resists, appliedNotes, secs: Math.round((Date.now() - t0) / 1000) };
}

// ---------- MỤC 2 ----------
async function measureStun(c, slot, tag) {
  const durs = [];
  for (let i = 0; i < 3; i++) {
    // golem còn sống, gần nhất
    const me = meOf(c);
    const g = monsOf(c).filter((m) => m.kind === 'golem').sort((a, b) => Math.hypot(a.x - me.x, a.y - me.y) - Math.hypot(b.x - me.x, b.y - me.y))[0];
    if (!g) { R.note(`${tag} cast ${i + 1}: khong thay golem`); await sleep(3000); continue; }
    await flyTo(c, g.x, g.y, 60); await land(c);
    const live = monsOf(c).find((m) => m.id === g.id);
    if (!live) continue;
    const meNow = meOf(c);
    if (Math.hypot(live.x - meNow.x, live.y - meNow.y) > 150) { await steerTo(c, live.x, live.y, 60, 8000); }
    const ci = c.casts.length;
    const castAt = Date.now();
    c.socket.emit('cast_skill', { slot });
    const res = await waitFor(() => (c.casts.length > ci ? c.casts[c.casts.length - 1] : null), 4000);
    if (!res || !res.ok) { R.note(`${tag} cast ${i + 1}: cast that bai ${JSON.stringify(res)}`); await sleep(2000); continue; }
    const tid = res.targetId;
    let first = null, last = null;
    const tEnd = Date.now() + 4200;
    while (Date.now() < tEnd) {
      const tm = monsOf(c).find((m) => m.id === tid);
      if (tm && tm.st === 'stun') { const now = Date.now(); if (!first) first = now; last = now; }
      await sleep(45);
    }
    if (first) { const dur = (last - castAt + 100) / 1000; durs.push(dur); R.note(`${tag} cast ${i + 1}: stun ${(dur).toFixed(2)}s (first+${first - castAt}ms)`); }
    else R.note(`${tag} cast ${i + 1}: khong bat duoc stun tren target ${tid}`);
    // chờ hồi chiêu 40s (trừ lần cuối)
    if (i < 2) await sleep(40500);
  }
  return durs;
}

(async () => {
  const chars = {};
  const LOWATK = { vatCong: 12, phapCong: 12 };
  chars['p349ares01'] = BASE('p349ares01', 'P349Resist', { talent: { id: 'ma_tam_tran', tier: 'den' }, mapId: 'thanh_tuyen_khe', x: 4248, y: 6223, stats: { khiHuyet: 8000, vatCong: 400, vatPhong: 10, phapCong: 400, phapPhong: 250, tocDo: 60, minhMan: 100 } });
  chars['p349actl01'] = BASE('p349actl01', 'P349KhongTal', { mapId: 'thanh_tuyen_khe', x: 4248, y: 6223, stats: { khiHuyet: 8000, vatCong: 400, vatPhong: 10, phapCong: 400, phapPhong: 250, tocDo: 60, minhMan: 100 } });
  chars['p349apht00'] = BASE('p349apht00', 'P349Phat0', { classId: 'phattu', skills: ['lh_phat-tu'], stats: { khiHuyet: 8000, vatPhong: 250, phapPhong: 250, tocDo: 60, minhMan: 100, ...LOWATK } });
  chars['p349apht02'] = BASE('p349apht02', 'P349Phat2', { classId: 'phattu', skills: ['lh_phat-tu'], anState: { vienman: true, luyenHon: true }, stats: { khiHuyet: 8000, vatPhong: 250, phapPhong: 250, tocDo: 60, minhMan: 100, ...LOWATK } });
  chars['p349apht03'] = BASE('p349apht03', 'P349Phat3', { classId: 'phattu', skills: ['lh_phat-tu'], anState: { vienman: true, luyenHon: true, nhapDao: true }, stats: { khiHuyet: 8000, vatPhong: 250, phapPhong: 250, tocDo: 60, minhMan: 100, ...LOWATK } });
  H.writeChars(chars);
  await H.startServer();

  // ===== MỤC 1 =====
  const RT = H.connect('p349ares01');
  await waitFor(() => RT.welcome, 20000); await waitStableMons(RT);
  const meRT = meOf(RT);
  R.note(`Resist spawn tai (${meRT ? Math.round(meRT.x) : '?'},${meRT ? Math.round(meRT.y) : '?'}) map view mons=${monsOf(RT).length}`);
  const rRT = await campThuy(RT, 120, 9 * 60 * 1000, 'RT');
  if (rRT) {
    const rate = rRT.hits ? rRT.resists / rRT.hits : 0;
    const se = rRT.hits ? Math.sqrt(rate * (1 - rate) / rRT.hits) : 0;
    R.note(`RT: hits=${rRT.hits} foreign=${rRT.foreign} resists=${rRT.resists} appliedNotes=${rRT.appliedNotes} rate=${rate.toFixed(3)} CI95=[${(rate - 1.96 * se).toFixed(3)},${(rate + 1.96 * se).toFixed(3)}] (${rRT.secs}s)`);
    R.ok('M1: du mau don (hits >= 100)', rRT.hits >= 100, `hits=${rRT.hits}`);
    R.ok('M1: ti le khang Ma Tam Tran ~0.20 (CI chua 0.20, chan duoi > 0.05)', rRT.hits >= 100 && (rate - 1.96 * se) <= 0.20 && 0.20 <= (rate + 1.96 * se) && (rate - 1.96 * se) > 0.05, `rate=${rate.toFixed(3)}`);
  } else R.ok('M1: tim duoc thuy', false, 'khong thay thuy_trieu_tinh');
  RT.socket.disconnect();
  await sleep(800);
  const CT = H.connect('p349actl01');
  await waitFor(() => CT.welcome, 20000); await waitStableMons(CT);
  const rCT = await campThuy(CT, 60, 6 * 60 * 1000, 'CT');
  if (rCT) {
    R.note(`CT: hits=${rCT.hits} foreign=${rCT.foreign} resists=${rCT.resists} (${rCT.secs}s)`);
    R.ok('M1-DC: du mau don doi chung (hits >= 50)', rCT.hits >= 50, `hits=${rCT.hits}`);
    R.ok('M1-DC: doi chung 0 lan khang (yChi=0, khong thien phu)', rCT.resists === 0, `resists=${rCT.resists}`);
  } else R.ok('M1-DC: tim duoc thuy', false, '');
  CT.socket.disconnect();
  await sleep(800);

  // ===== MỤC 2 =====
  for (const [tok, tag, lo, hi] of [['p349apht00', 'P0-khongduong', 1.25, 1.85], ['p349apht02', 'P2-luyenhon', 2.25, 2.85], ['p349apht03', 'P3-nhapdao', 2.25, 2.85]]) {
    const c = H.connect(tok);
    await waitFor(() => c.welcome, 20000); await waitStableMons(c);
    const slot = slotOf(c, 'lh_phat-tu');
    R.note(`${tag}: slot lh_phat-tu = ${slot}`);
    if (slot < 0) { R.ok(`M2 ${tag}: co slot chiêu`, false, 'khong thay lh_phat-tu trong bang chiêu'); c.socket.disconnect(); continue; }
    const durs = await measureStun(c, slot, tag);
    const med = median(durs);
    R.note(`${tag}: durs=${JSON.stringify(durs.map((d) => +d.toFixed(2)))} median=${med.toFixed(2)}s`);
    R.ok(`M2 ${tag}: thoi luong choang trong [${lo}, ${hi}]s`, durs.length >= 2 && med >= lo && med <= hi, `median=${med.toFixed(2)} n=${durs.length}`);
    c.socket.disconnect();
    await sleep(800);
  }

  await H.stopServer();
  R.done('GĐ349-A muc1+muc2');
  process.exit(R.fail ? 1 : 0);
})().catch(async (e) => { console.log('LOI: ' + e.message); try { await H.stopServer(); } catch (_) {} process.exit(2); });
