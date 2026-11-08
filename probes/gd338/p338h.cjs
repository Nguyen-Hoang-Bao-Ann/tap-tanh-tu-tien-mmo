// Probe GĐ338 — phiên chế tạo + học tập:
//   B10 Tay nghề khéo: craft_result.rate 0.90 (chuẩn) vs 0.95 (tay_nghe) — kênh tất định.
//   C3 Đan Phòng cấp 1/2/3 tại trụ sở: rate rc_hoi_nguyen 0.60 -> 0.65 / 0.68 / 0.72.
//   C5-che: pháp tự tạo {che:4} vận hành -> rate 0.90 + 0.08 = 0.98. C5-mau: {mau:4} -> maxHp 5100 x1.04 = 5304.
//   B8 Linh thể: maxMp minhMan100: 1000 vs 1150.
//   B5 điểm luyện: cast chiến kỹ tông 15 lần, skillMastery tỉ lệ 1 : 1.15 : 1.30.
//   B6 Áo nghĩa: learnNeedMinFor chiêu trucco (kiemtu_4): thien_tai x0.8 so chuẩn.
const path = require('path');
const { makeHarness, BASE, SECT, ART, writeWorld, makeOk, meOf, monsOf, flyTo, land, sleep, waitFor } = require('./lib338.cjs');
const PORT = 3617;
const DIR = __dirname;
const H = makeHarness(PORT, {}, DIR);
const R = makeOk();
const danJob = { job: { jobId: 'dansu', crafts: 999 } };

async function craftN(c, recipeId, n) {
  const rates = []; let oks = 0;
  c.craftResults = [];
  for (let i = 0; i < n; i++) {
    const before = c.craftResults.length;
    c.socket.emit('craft_item', { recipeId });
    const r = await waitFor(() => c.craftResults.length > before ? c.craftResults[c.craftResults.length - 1] : null, 3000);
    if (r) { rates.push(r.rate); if (r.ok) oks++; }
    await sleep(150);
  }
  return { rates, oks };
}
function hookCraft(c) { c.craftResults = []; c.socket.on('craft_result', (r) => c.craftResults.push(r)); }

(async () => {
  const chars = {
    p338h10001: BASE('p338h10001', ' CheChuan', { mapId: 'lang_tan_thu', x: 1565, y: 1252, inventory: { nanh_soi: 500 }, stones: 100000, ...danJob }),
    p338h10002: BASE('p338h10002', ' CheTayNghe', { mapId: 'lang_tan_thu', x: 1650, y: 1252, inventory: { nanh_soi: 500 }, stones: 100000, talent: { id: 'tay_nghe', tier: 'bach' }, ...danJob }),
    p338h20001: BASE('p338h20001', ' CheTruSo1', { mapId: 'huyet_sac_rung', x: 2000, y: 2150, inventory: { nanh_soi: 500 }, stones: 100000, ...danJob }),
    p338h20002: BASE('p338h20002', ' CheTruSo2', { mapId: 'huyet_sac_rung', x: 4200, y: 2150, inventory: { nanh_soi: 500 }, stones: 100000, ...danJob }),
    p338h20003: BASE('p338h20003', ' CheTruSo3', { mapId: 'huyet_sac_rung', x: 6400, y: 2150, inventory: { nanh_soi: 500 }, stones: 100000, ...danJob }),
    p338h30001: BASE('p338h30001', ' ChePhapTu', { mapId: 'lang_tan_thu', x: 1750, y: 1252, inventory: { nanh_soi: 500 }, stones: 100000, sectArts: ['hart1', 'hart2'], sectArtsActive: ['hart1', 'hart2'], ...danJob }),
    p338h40001: BASE('p338h40001', ' MpChuan', { mapId: 'lang_tan_thu', x: 1565, y: 1400, stats: { khiHuyet: 500, vatCong: 100, vatPhong: 100, phapCong: 100, phapPhong: 100, tocDo: 60, minhMan: 100 } }),
    p338h40002: BASE('p338h40002', ' MpLinhThe', { mapId: 'lang_tan_thu', x: 1650, y: 1400, stats: { khiHuyet: 500, vatCong: 100, vatPhong: 100, phapCong: 100, phapPhong: 100, tocDo: 60, minhMan: 100 }, talent: { id: 'linh_the', tier: 'tim' } }),
    p338h50001: BASE('p338h50001', ' LuyenChuan', { mapId: 'huyet_sac_rung', x: 1500, y: 1500, sectArts: ['mart1'] }),
    p338h50002: BASE('p338h50002', ' LuyenNgoKha', { mapId: 'huyet_sac_rung', x: 4200, y: 3000, sectArts: ['mart2'], talent: { id: 'ngo_tinh_kha', tier: 'luc' } }),
    p338h50003: BASE('p338h50003', ' LuyenThienTai', { mapId: 'huyet_sac_rung', x: 6800, y: 4500, sectArts: ['mart3'], talent: { id: 'thien_tai', tier: 'cam' } }),
    p338h60001: BASE('p338h60001', ' HocChuan', { mapId: 'lang_tan_thu', x: 1565, y: 438, realm: 'tc', tier: 9, stones: 10000 }),
    p338h60002: BASE('p338h60002', ' HocThienTai', { mapId: 'lang_tan_thu', x: 1600, y: 470, realm: 'tc', tier: 9, stones: 10000, talent: { id: 'thien_tai', tier: 'cam' } }),
  };
  const sects = [
    SECT('s338h1', 'Đan Phòng Một', [{ token: 'p338h20001', name: ' CheTruSo1', role: 'detu', contrib: 500 }], { fund: 0, hq: { mapId: 'huyet_sac_rung', x: 2000, y: 2000 }, buildings: [{ kind: 'danphong', name: 'Đan Phòng', x: 2000, y: 2060, lv: 1 }] }),
    SECT('s338h2', 'Đan Phòng Hai', [{ token: 'p338h20002', name: ' CheTruSo2', role: 'detu', contrib: 500 }], { fund: 0, hq: { mapId: 'huyet_sac_rung', x: 4200, y: 2000 }, buildings: [{ kind: 'danphong', name: 'Đan Phòng', x: 4200, y: 2060, lv: 2 }] }),
    SECT('s338h3', 'Đan Phòng Ba', [{ token: 'p338h20003', name: ' CheTruSo3', role: 'detu', contrib: 500 }], { fund: 0, hq: { mapId: 'huyet_sac_rung', x: 6400, y: 2000 }, buildings: [{ kind: 'danphong', name: 'Đan Phòng', x: 6400, y: 2060, lv: 3 }] }),
    SECT('s338h4', 'Pháp Tự Tạo', [{ token: 'p338h30001', name: ' ChePhapTu', role: 'detu', contrib: 500 }], { fund: 0, arts: [ART('hart1', 'Khéo Chế Kinh', { che: 4 }, 'f_cong', 'tamphap', 'p338h30001'), ART('hart2', 'Hậu Thể Kinh', { mau: 4 }, 'f_cong', 'tamphap', 'p338h30001')] }),
    SECT('s338h5', 'Luyện Chiêu A', [{ token: 'p338h50001', name: ' LuyenChuan', role: 'detu', contrib: 500 }], { fund: 0, arts: [ART('mart1', 'Kích A', { sat: 1 }, 'f_cd', 'chienky', 'p338h50001')] }),
    SECT('s338h6', 'Luyện Chiêu B', [{ token: 'p338h50002', name: ' LuyenNgoKha', role: 'detu', contrib: 500 }], { fund: 0, arts: [ART('mart2', 'Kích B', { sat: 1 }, 'f_cd', 'chienky', 'p338h50002')] }),
    SECT('s338h7', 'Luyện Chiêu C', [{ token: 'p338h50003', name: ' LuyenThienTai', role: 'detu', contrib: 500 }], { fund: 0, arts: [ART('mart3', 'Kích C', { sat: 1 }, 'f_cd', 'chienky', 'p338h50003')] }),
  ];
  writeWorld(DIR, chars, sects);
  await H.startServer();
  const CC = await H.connect('p338h10001'); hookCraft(CC);
  const CT = await H.connect('p338h10002'); hookCraft(CT);
  const H1 = await H.connect('p338h20001'); hookCraft(H1);
  const H2 = await H.connect('p338h20002'); hookCraft(H2);
  const H3 = await H.connect('p338h20003'); hookCraft(H3);
  const CA = await H.connect('p338h30001'); hookCraft(CA);
  const MPC = await H.connect('p338h40001');
  const MPT = await H.connect('p338h40002');
  R.note('sync keys mẫu: ' + Object.keys(CC.sync || {}).filter((k) => /hp|mp/i.test(k)).join(','));

  // B10
  const rC = await craftN(CC, 'rc_hoi_xuan', 8);
  const rT = await craftN(CT, 'rc_hoi_xuan', 8);
  R.note(`B10: CTL rates=${JSON.stringify(rC.rates)} ok=${rC.oks}/8 | TAY rates=${JSON.stringify(rT.rates)} ok=${rT.oks}/8`);
  R.ok('B10 Tay nghề khéo +5%: rate 0.90 -> 0.95', rC.rates.every((r) => Math.abs(r - 0.90) < 0.001) && rT.rates.every((r) => Math.abs(r - 0.95) < 0.001), `ctl=${rC.rates[0]} tay=${rT.rates[0]}`);
  // C3
  const q1 = await craftN(H1, 'rc_hoi_nguyen', 3);
  const q2 = await craftN(H2, 'rc_hoi_nguyen', 3);
  const q3 = await craftN(H3, 'rc_hoi_nguyen', 3);
  R.note(`C3: Đan Phòng lv1=${JSON.stringify(q1.rates)} lv2=${JSON.stringify(q2.rates)} lv3=${JSON.stringify(q3.rates)} (gốc 0.60)`);
  R.ok('C3 tỉ lệ chế theo cấp Đan Phòng 5%/8%/12%', Math.abs(q1.rates[0] - 0.65) < 0.001 && Math.abs(q2.rates[0] - 0.68) < 0.001 && Math.abs(q3.rates[0] - 0.72) < 0.001, `lv1=${q1.rates[0]} lv2=${q2.rates[0]} lv3=${q3.rates[0]}`);
  // C5-che + C5-mau
  const rA = await craftN(CA, 'rc_hoi_xuan', 3);
  const maxHpA = CA.sync?.maxHp;
  R.note(`C5: art rates=${JSON.stringify(rA.rates)} (kỳ vọng 0.98) | maxHp=${maxHpA} (kỳ vọng 5304)`);
  R.ok('C5-che pháp tự tạo {che:4} = +8% tỉ lệ chế', rA.rates.every((r) => Math.abs(r - 0.98) < 0.001), `rate=${rA.rates[0]}`);
  R.ok('C5-mau pháp tự tạo {mau:4} = +4% maxHp', maxHpA === 5304, `maxHp=${maxHpA}`);
  // B8
  const mpC = MPC.sync?.maxMp ?? MPC.welcome?.character?.maxMp;
  const mpT = MPT.sync?.maxMp ?? MPT.welcome?.character?.maxMp;
  R.note(`B8: maxMp CTL=${mpC} LINH_THỂ=${mpT} (kỳ vọng 1000 / 1150)`);
  R.ok('B8 Linh thể dồi dào: maxMp x1.15', mpC === 1000 && mpT === 1150, `ctl=${mpC} tal=${mpT}`);

  // B5: cast chiến kỹ 15 lần/người (song song 3 vùng)
  async function castLoop(c, artId, tag) {
    c.socket.emit('equip_skill', { skillId: 'art:' + artId });
    await sleep(900);
    const slot = () => ((c.sync?.skills) || []).findIndex((x) => x.id === 'art:' + artId);
    let casts = 0;
    const t0 = Date.now();
    while (casts < 15 && Date.now() - t0 < 300000) {
      const me = meOf(c); const ms = monsOf(c);
      if (!me || !ms.length) { await sleep(500); continue; }
      ms.sort((a, b) => Math.hypot(a.x - me.x, a.y - me.y) - Math.hypot(b.x - me.x, b.y - me.y));
      const t = ms[0];
      if (Math.hypot(t.x - me.x, t.y - me.y) > 130) { await flyTo(c, t.x, t.y, 60, 10000); await land(c); }
      if (slot() < 0) { await sleep(400); continue; }
      const before = (c.sync?.skillMastery || {})['art:' + artId] || 0;
      c.socket.emit('cast_skill', { slot: slot() });
      const grew = await waitFor(() => (((c.sync?.skillMastery || {})['art:' + artId] || 0) > before) ? true : null, 2500);
      if (grew) casts++;
      await sleep(5900); // chờ hồi chiêu 5800ms
    }
    const total = (c.sync?.skillMastery || {})['art:' + artId] || 0;
    R.note(`${tag}: casts=${casts} mastery tổng=${total} (${casts ? (total / casts).toFixed(3) : '—'}/lần)`);
    return { casts, total };
  }
  const MC = await H.connect('p338h50001');
  const MN = await H.connect('p338h50002');
  const MT = await H.connect('p338h50003');
  const [mC, mN, mT] = await Promise.all([castLoop(MC, 'mart1', 'B5-CTL'), castLoop(MN, 'mart2', 'B5-NGO'), castLoop(MT, 'mart3', 'B5-TAI')]);
  if (mC.casts >= 12 && mN.casts >= 12 && mT.casts >= 12) {
    const rN = (mN.total / mN.casts) / (mC.total / mC.casts), rT = (mT.total / mT.casts) / (mC.total / mC.casts);
    R.note(`B5 tỉ lệ: ngo/ctl=${rN.toFixed(3)} (kỳ vọng 1.15) tai/ctl=${rT.toFixed(3)} (kỳ vọng 1.30)`);
    R.ok('B5 điểm luyện: Ngộ tính khá x1.15, Thiên tài x1.30', rN >= 1.10 && rN <= 1.20 && rT >= 1.24 && rT <= 1.36, `ngo=${rN.toFixed(3)} tai=${rT.toFixed(3)}`);
  } else R.ok('B5 điểm luyện', false, `casts=${mC.casts}/${mN.casts}/${mT.casts}`);

  // B6: học chiêu trucco
  const LC = await H.connect('p338h60001');
  const LT = await H.connect('p338h60002');
  async function learnNeed(c) {
    for (const spot of [[1565, 438], [1565, 845], [1565, 1252]]) {
      await flyTo(c, spot[0], spot[1], 40, 12000); await land(c);
      c.errors = [];
      c.socket.emit('learn_skill', { skillId: 'kiemtu_4' });
      await sleep(900);
      const lrn = c.sync?.learning;
      if (lrn && lrn.needMin) return lrn.needMin;
    }
    return null;
  }
  const nC = await learnNeed(LC);
  const nT = await learnNeed(LT);
  R.note(`B6: needMin CTL=${nC} THIÊN_TÀI=${nT} (tỉ lệ ${nC && nT ? (nT / nC).toFixed(3) : '—'}, kỳ vọng 0.80) | errors mẫu=${JSON.stringify(LC.errors.slice(0, 2))}`);
  R.ok('B6 Áo nghĩa của Thiên tài ngộ đạo: phút lĩnh ngộ x0.8', !!nC && !!nT && nT < nC && (nT / nC) >= 0.76 && (nT / nC) <= 0.84, `ctl=${nC} tai=${nT}`);

  R.done('p338h');
  await H.stopServer();
  process.exit(R.fail ? 1 : 0);
})().catch(async (e) => { console.error('LOI', e); try { await H.stopServer(); } catch (_) {} process.exit(2); });
