// Probe GĐ349-B — Mục 5 (phụ ấn Nho: thông thạo x1.1) + Mục 3 (Đường Ảnh: buff tốc +30%/3s sau đòn kế).
// MỤC 5: addMastery (server/index.js:2784): điểm/cast = 1 x (1+ngoTinh*0.03) x learnMulOf x
//   talentMasteryMulOf x (subSealOf=='nhotu' ? 1.1 : 1). Hai char giống hệt trừ lớp phụ
//   (nhotu vs ytu) -> tỉ lệ tổng thông thạo kiemtu_1 sau 15 cast ĐẠT phải = 1.10.
//   Bề mặt đọc: skillMastery trong payload (welcome khi nối lại / char_sync / file sau khi dừng).
// MỤC 3: cast lh_sat-thu dat lhSpeedPending (server/index.js:13184); đòn thường KẾ TIẾP gây dmg>0
//   -> spdBuffPct=30 trong 3s (server/index.js:12228), nhân thẳng vào tốc tick (x1.30).
//   Đo: quãng đường chạy trong cửa sổ 2.8s kể từ đòn trúng (quan sát máu golem tụt), so với
//   cửa sổ nền cùng char không cast. Kỳ vọng tỉ lệ ~1.30.
const fs = require('fs');
const path = require('path');
const { makeHarness, BASE, makeOk, meOf, monsOf, flyTo, land, steerTo, slotOf, myChar, waitStableMons, sleep, waitFor, median } = require('./lib349.cjs');
const DIR = path.join(__dirname, 'b');
fs.mkdirSync(DIR, { recursive: true });
const PORT = 3661;
const H = makeHarness(PORT, {}, DIR);
const R = makeOk();

// ---------- MỤC 5 ----------
async function castTimes(c, slot, targetKind, n) {
  let done = 0, guard = 0;
  while (done < n && guard++ < n * 4) {
    const me = meOf(c);
    const t = monsOf(c).filter((m) => m.kind === targetKind).sort((a, b) => Math.hypot(a.x - me.x, a.y - me.y) - Math.hypot(b.x - me.x, b.y - me.y))[0];
    if (!t) { await sleep(1500); continue; }
    if (Math.hypot(t.x - me.x, t.y - me.y) > 105) { await steerTo(c, t.x, t.y, 55, 9000); }
    const ci = c.casts.length;
    c.socket.emit('cast_skill', { slot });
    const res = await waitFor(() => (c.casts.length > ci ? c.casts[c.casts.length - 1] : null), 3500);
    if (res && res.ok) done++;
    await sleep(1150);
  }
  return done;
}
function masteryOf(c, skillId) {
  const ch = myChar(c);
  if (ch && ch.skillMastery && typeof ch.skillMastery[skillId] === 'number') return ch.skillMastery[skillId];
  const w = (c.welcome || {}).character || {};
  if (w.skillMastery && typeof w.skillMastery[skillId] === 'number') return w.skillMastery[skillId];
  return null;
}

// ---------- MỤC 3 ----------
async function runWindow(c, dirX, durMs) {
  // trả quãng đường |dx| trong cửa sổ durMs kể từ lúc bắt đầu chạy
  const samples = [];
  const t0 = Date.now();
  c.socket.emit('client_input', { vx: dirX, vy: 0 });
  while (Date.now() - t0 < durMs + 400) { const me = meOf(c); if (me) samples.push({ at: Date.now(), x: me.x }); await sleep(50); }
  c.socket.emit('client_input', { vx: 0, vy: 0 });
  const end = samples.filter((s) => s.at <= t0 + durMs).pop() || samples[samples.length - 1];
  const start = samples[0];
  return { dist: Math.abs(end.x - start.x), startX: start.x };
}
async function buffTrial(c, slot, withBuff) {
  // chọn golem máu >= 120 cho trial buff, >= 40 cho nền
  const me = meOf(c);
  const need = withBuff ? 120 : 40;
  const g = monsOf(c).filter((m) => m.kind === 'golem' && m.hp >= need).sort((a, b) => Math.hypot(a.x - me.x, a.y - me.y) - Math.hypot(b.x - me.x, b.y - me.y))[0];
  if (!g) return null;
  await flyTo(c, g.x, g.y, 45); await land(c);
  const live = monsOf(c).find((m) => m.id === g.id); if (!live) return null;
  const meN = meOf(c);
  if (Math.hypot(live.x - meN.x, live.y - meN.y) > 55) await steerTo(c, live.x, live.y, 45, 8000);
  const dirX = (meOf(c).x > 4200) ? -1 : 1;
  if (withBuff) {
    const ci = c.casts.length;
    c.socket.emit('cast_skill', { slot });
    const res = await waitFor(() => (c.casts.length > ci ? c.casts[c.casts.length - 1] : null), 4000);
    if (!res || !res.ok) return null;
  }
  // đánh thường tới khi máu golem tụt (đòn trúng có dmg) — tối đa 5 đòn
  let landed = false;
  for (let i = 0; i < 5 && !landed; i++) {
    const before = (monsOf(c).find((m) => m.id === g.id) || {}).hp;
    if (before == null) { landed = true; break; } // golem chết vì đòn đánh = đòn trúng có dmg
    c.socket.emit('player_attack');
    landed = await waitFor(() => { const h = (monsOf(c).find((m) => m.id === g.id) || {}).hp; return h == null || h < before ? true : null; }, 1100) ? true : false;
  }
  if (!landed) return null;
  return runWindow(c, dirX, 2800);
}

(async () => {
  const chars = {};
  const ANFULL = { vienman: true, luyenHon: true, nhapDao: true };
  chars['p349bnho01'] = BASE('p349bnho01', 'P349AnNho', { anState: { ...ANFULL, subClass: 'nhotu' }, skills: ['kiemtu_1'], stats: { khiHuyet: 8000, vatCong: 15, vatPhong: 250, phapCong: 15, phapPhong: 250, tocDo: 60, minhMan: 100 } });
  chars['p349bytu01'] = BASE('p349bytu01', 'P349AnY', { anState: { ...ANFULL, subClass: 'ytu' }, skills: ['kiemtu_1'], stats: { khiHuyet: 8000, vatCong: 15, vatPhong: 250, phapCong: 15, phapPhong: 250, tocDo: 60, minhMan: 100 } });
  chars['p349banh01'] = BASE('p349banh01', 'P349AnhToc', { classId: 'satthu', skills: ['lh_sat-thu'], stats: { khiHuyet: 8000, vatCong: 15, vatPhong: 250, phapCong: 15, phapPhong: 250, tocDo: 60, minhMan: 100 } });
  H.writeChars(chars);
  await H.startServer();

  // ===== MỤC 5 =====
  const results5 = {};
  for (const tok of ['p349bnho01', 'p349bytu01']) {
    const c = H.connect(tok);
    await waitFor(() => c.welcome, 20000); await waitStableMons(c);
    const slot = slotOf(c, 'kiemtu_1');
    if (slot < 0) { R.ok(`M5 ${tok}: co slot kiemtu_1`, false, ''); c.socket.disconnect(); continue; }
    const n = await castTimes(c, slot, 'kiemma', 15);
    await sleep(600);
    let mv = masteryOf(c, 'kiemtu_1');
    if (mv == null) { // nối lại đọc welcome
      c.socket.disconnect(); await sleep(1200);
      const c2 = H.connect(tok);
      await waitFor(() => c2.welcome, 20000); await sleep(500);
      mv = masteryOf(c2, 'kiemtu_1');
      results5[tok] = mv; c2.socket.disconnect();
    } else { results5[tok] = mv; c.socket.disconnect(); }
    R.note(`M5 ${tok}: casts ok=${n} mastery kiemtu_1 = ${mv}`);
    await sleep(800);
  }
  const mNho = results5['p349bnho01'], mY = results5['p349bytu01'];
  if (typeof mNho === 'number' && typeof mY === 'number' && mY > 0) {
    const ratio = mNho / mY;
    R.note(`M5: nho=${mNho} y=${mY} ti le=${ratio.toFixed(4)} (ky vong 1.10)`);
    R.ok('M5: phu an Nho thong thạo x1.1', Math.abs(ratio - 1.1) < 0.02, `ratio=${ratio.toFixed(4)}`);
  } else R.ok('M5: doc duoc thong thạo 2 phia', false, JSON.stringify(results5));

  // ===== MỤC 3 =====
  const A = H.connect('p349banh01');
  await waitFor(() => A.welcome, 20000); await waitStableMons(A);
  const slotA = slotOf(A, 'lh_sat-thu');
  R.note(`M3: slot lh_sat-thu = ${slotA}`);
  const buffD = [], baseD = [];
  if (slotA >= 0) {
    for (let i = 0; i < 5; i++) {
      const b = await buffTrial(A, slotA, false);
      if (b) { baseD.push(b.dist); R.note(`M3 nen ${i + 1}: ${Math.round(b.dist)}px/2.8s`); }
      const u = await buffTrial(A, slotA, true);
      if (u) { buffD.push(u.dist); R.note(`M3 buff ${i + 1}: ${Math.round(u.dist)}px/2.8s`); }
      if (i < 4) await sleep(30000); // chờ hồi chiêu lh 35s
    }
  }
  const medB = median(baseD), medU = median(buffD);
  const ratio3 = medB ? medU / medB : 0;
  R.note(`M3: nen median=${Math.round(medB)}px (n=${baseD.length}) buff median=${Math.round(medU)}px (n=${buffD.length}) ti le=${ratio3.toFixed(3)} (ky vong 1.30)`);
  R.ok('M3: du trial (nen >= 4, buff >= 4)', baseD.length >= 4 && buffD.length >= 4, `n=${baseD.length}/${buffD.length}`);
  R.ok('M3: buff toc Anh sau don ke = +30% (ti le 1.22-1.38)', ratio3 >= 1.22 && ratio3 <= 1.38, `ratio=${ratio3.toFixed(3)}`);
  A.socket.disconnect();

  await H.stopServer();
  R.done('GĐ349-B muc5+muc3');
  process.exit(R.fail ? 1 : 0);
})().catch(async (e) => { console.log('LOI: ' + e.message); try { await H.stopServer(); } catch (_) {} process.exit(2); });
