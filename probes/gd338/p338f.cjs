// Probe GĐ338 — B11 (cơ duyên F3, kênh loot khi hạ quái) + B7 (Chiến thể, phía nhận đòn).
// B11: 3 thợ săn (CTL / khi_van / dai_khi_van) săn soi_xam (alias wolf — loot gốc không có món hồ bơi)
//   trên huyet_sac_rung, mỗi người 1 vùng. Đếm kill tự tay + món hồ bơi [da_quy, ngoc_gian_trong,
//   tien_linh_chi] trong túi: CTL kỳ vọng 0; KHI ~15% số kill; DAI ~30% số kill.
// B7: phaptu vatPhong 78 đứng cho kiemma (atk 26) cắn ở Thạch Lâm: CTL mỗi cắn 15
//   (round(26*100/178)=15), chien_the rawIn x0.95 -> 14 (round(24.7*100/178)=14). Lọc mẫu theo giá trị
//   (huyetlang atk 30 lẫn vào cho 17/16 — loại).
const path = require('path');
const { makeHarness, BASE, writeWorld, makeOk, meOf, monsOf, flyTo, land, sleep, waitFor, median } = require('./lib338.cjs');
const PORT = 3615;
const DIR = __dirname;
const H = makeHarness(PORT, {}, DIR);
const R = makeOk();
const POOL = ['da_quy', 'ngoc_gian_trong', 'tien_linh_chi'];
const poolCount = (c) => POOL.reduce((s, id) => s + ((c.sync?.inventory || {})[id] || 0), 0);

async function hunt(c, center, targetKills, tag) {
  let kills = 0;
  const t0 = Date.now();
  while (kills < targetKills && Date.now() - t0 < 12 * 60000) {
    const me = meOf(c);
    const ms = monsOf(c).filter((m) => m.kind === 'wolf'); // soi_xam alias -> kind tick là 'wolf'
    if (!me || !ms.length) { await sleep(500); continue; }
    ms.sort((a, b) => Math.hypot(a.x - me.x, a.y - me.y) - Math.hypot(b.x - me.x, b.y - me.y));
    const t = ms[0];
    if (Math.hypot(t.x - center.x, t.y - center.y) > 1600) { await sleep(400); continue; }
    await flyTo(c, t.x, t.y, 30, 12000);
    const before = (monsOf(c).find((m) => m.id === t.id) || {}).hp;
    if (before == null) continue;
    c.socket.emit('player_attack');
    const gone = await waitFor(() => !monsOf(c).some((m) => m.id === t.id) ? true : null, 1500);
    if (gone) { kills++; await sleep(350); } else await sleep(300);
  }
  await land(c);
  R.note(`${tag}: kills=${kills} pool=${poolCount(c)}`);
  return kills;
}

async function biteSamples(c, n, tag) {
  const drops = [];
  const t0 = Date.now();
  let lastHp = null;
  while (drops.length < n && Date.now() - t0 < 240000) {
    // tìm kiemma gần nhất, đứng sát nó
    const me = meOf(c);
    const ks = monsOf(c).filter((m) => m.kind === 'kiemma');
    if (!me || !ks.length) { await sleep(500); continue; }
    ks.sort((a, b) => Math.hypot(a.x - me.x, a.y - me.y) - Math.hypot(b.x - me.x, b.y - me.y));
    const k = ks[0];
    if (Math.hypot(k.x - me.x, k.y - me.y) > 50) { await flyTo(c, k.x, k.y, 35, 8000); await land(c); lastHp = null; continue; }
    const hp = (meOf(c) || {}).hp;
    if (hp != null) {
      if (lastHp != null && hp < lastHp) { const d = lastHp - hp; if (d >= 8 && d <= 22) drops.push(d); }
      lastHp = hp;
    }
    await sleep(150);
  }
  R.note(`${tag}: mẫu cắn (8..22) = ${JSON.stringify(drops)}`);
  return drops;
}

(async () => {
  const chars = {
    p338f10001: BASE('p338f10001', ' SanChuan', { mapId: 'huyet_sac_rung', x: 1500, y: 1500 }),
    p338f10002: BASE('p338f10002', ' SanKhiVan', { mapId: 'huyet_sac_rung', x: 4200, y: 3000, talent: { id: 'khi_van', tier: 'tim' } }),
    p338f10003: BASE('p338f10003', ' SanDaiVan', { mapId: 'huyet_sac_rung', x: 6800, y: 4500, talent: { id: 'dai_khi_van', tier: 'cam' } }),
    p338f20001: BASE('p338f20001', ' CanChuan', { mapId: 'lang_tan_thu', x: 6200, y: 900, classId: 'phaptu', vatCong: 10, stats: { khiHuyet: 500, vatCong: 10, vatPhong: 78, phapCong: 100, phapPhong: 78, tocDo: 60, minhMan: 60 } }),
    p338f20002: BASE('p338f20002', ' CanChienThe', { mapId: 'lang_tan_thu', x: 2800, y: 2000, classId: 'phaptu', stats: { khiHuyet: 500, vatCong: 10, vatPhong: 78, phapCong: 100, phapPhong: 78, tocDo: 60, minhMan: 60 }, talent: { id: 'chien_the', tier: 'cam' } }),
  };
  // char CanChuan cần lùi xa vùng Thạch Lâm lúc đầu (đỗ ở cổng làng) — sẽ flyTo sau
  writeWorld(DIR, chars, []);
  await H.startServer();
  const HC = await H.connect('p338f10001');
  const HK = await H.connect('p338f10002');
  const HD = await H.connect('p338f10003');
  const BC = await H.connect('p338f20001');
  const BT = await H.connect('p338f20002');

  const [kC, kK, kD] = await Promise.all([
    hunt(HC, { x: 1500, y: 1500 }, 45, 'B11-CTL'),
    hunt(HK, { x: 4200, y: 3000 }, 45, 'B11-KHI'),
    hunt(HD, { x: 6800, y: 4500 }, 45, 'B11-DAI'),
  ]);
  const pC = poolCount(HC), pK = poolCount(HK), pD = poolCount(HD);
  R.note(`B11: CTL kills=${kC} pool=${pC} | KHI kills=${kK} pool=${pK} (${kK ? (pK / kK).toFixed(2) : '—'}, kỳ vọng 0.15) | DAI kills=${kD} pool=${pD} (${kD ? (pD / kD).toFixed(2) : '—'}, kỳ vọng 0.30)`);
  R.ok('B11 đối chứng: không thiên phú = 0 món hồ bơi', pC === 0, `pool=${pC}`);
  R.ok('B11 Khí vận nhỏ: tỉ lệ rơi phụ ~15%', kK >= 35 && pK >= 3 && (pK / kK) >= 0.06 && (pK / kK) <= 0.28, `rate=${kK ? (pK / kK).toFixed(2) : '—'}`);
  R.ok('B11 Đại khí vận: tỉ lệ rơi phụ ~30%', kD >= 35 && pD >= 7 && (pD / kD) >= 0.16 && (pD / kD) <= 0.45, `rate=${kD ? (pD / kD).toFixed(2) : '—'}`);

  // ===== B7: lần lượt từng người (người còn lại đỗ xa 1500px) =====
  await flyTo(BT, 2800, 2000, 60); await land(BT); // BT đỗ xa Thạch Lâm
  const dC = await biteSamples(BC, 10, 'B7-CTL');
  await flyTo(BC, 2800, 2600, 60); await land(BC); // rút BC đi
  const dT = await biteSamples(BT, 10, 'B7-TAL');
  const kmC = dC.filter((d) => d === 15).length, kmT = dT.filter((d) => d === 14).length;
  R.note(`B7: CTL mẫu kiemma(15)=${kmC}/${dC.length} | TAL mẫu kiemma(14)=${kmT}/${dT.length} | median CTL=${median(dC)} TAL=${median(dT)}`);
  R.ok('B7 Chiến thể: sát thương nhận 15 -> 14 tại điểm gãy làm tròn (-5% rawIn)', kmC >= 6 && kmT >= 6, `ctl15=${kmC} tal14=${kmT}`);

  R.done('p338f');
  await H.stopServer();
  process.exit(R.fail ? 1 : 0);
})().catch(async (e) => { console.error('LOI', e); try { await H.stopServer(); } catch (_) {} process.exit(2); });
