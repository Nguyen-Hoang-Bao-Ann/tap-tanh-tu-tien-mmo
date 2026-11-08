// Probe GĐ338-B11 (bản roaming) — cơ duyên F3 kênh loot hạ quái: 3 thợ săn roaming toàn map huyet_sac_rung
// săn wolf (loot gốc sạch), đếm kill + món hồ bơi. Gộp với mẫu phiên trước (CTL 0/11, KHI 2/7, DAI 5/14).
const path = require('path');
const { makeHarness, BASE, writeWorld, makeOk, meOf, monsOf, flyTo, land, sleep, waitFor } = require('./lib338.cjs');
const PORT = 3623;
const DIR = __dirname;
const H = makeHarness(PORT, {}, DIR);
const R = makeOk();
const POOL = ['da_quy', 'ngoc_gian_trong', 'tien_linh_chi'];
const poolCount = (c) => POOL.reduce((s, id) => s + ((c.sync?.inventory || {})[id] || 0), 0);
const WAYPOINTS = [[1500, 1500], [4200, 1500], [6800, 3000], [4200, 4800], [1500, 4500], [6800, 1200], [4200, 3000], [2400, 5600]];

async function hunt(c, startIdx, targetKills, tag) {
  let kills = 0, wp = startIdx;
  const t0 = Date.now();
  while (kills < targetKills && Date.now() - t0 < 9 * 60000) {
    const me = meOf(c);
    const ms = monsOf(c).filter((m) => m.kind === 'wolf');
    if (!me) { await sleep(400); continue; }
    if (!ms.length) { const [x, y] = WAYPOINTS[wp++ % WAYPOINTS.length]; await flyTo(c, x, y, 120, 15000); continue; }
    ms.sort((a, b) => Math.hypot(a.x - me.x, a.y - me.y) - Math.hypot(b.x - me.x, b.y - me.y));
    const t = ms[0];
    const d = Math.hypot(t.x - me.x, t.y - me.y);
    if (d > 55) { await flyTo(c, t.x, t.y, 35, 6000); }
    const before = (monsOf(c).find((m) => m.id === t.id) || {}).hp;
    if (before == null) continue;
    c.socket.emit('player_attack');
    const gone = await waitFor(() => !monsOf(c).some((m) => m.id === t.id) ? true : null, 1200);
    if (gone) { kills++; await sleep(250); } else await sleep(200);
  }
  await land(c);
  R.note(`${tag}: kills=${kills} pool=${poolCount(c)}`);
  return kills;
}
(async () => {
  const chars = {
    p338f31001: BASE('p338f31001', ' SanChuan2', { mapId: 'huyet_sac_rung', x: 1500, y: 1500 }),
    p338f31002: BASE('p338f31002', ' SanKhiVan2', { mapId: 'huyet_sac_rung', x: 4200, y: 3000, talent: { id: 'khi_van', tier: 'tim' } }),
    p338f31003: BASE('p338f31003', ' SanDaiVan2', { mapId: 'huyet_sac_rung', x: 6800, y: 4500, talent: { id: 'dai_khi_van', tier: 'cam' } }),
  };
  writeWorld(DIR, chars, []);
  await H.startServer();
  const HC = await H.connect('p338f31001');
  const HK = await H.connect('p338f31002');
  const HD = await H.connect('p338f31003');
  const [kC, kK, kD] = await Promise.all([hunt(HC, 0, 30, 'B11r-CTL'), hunt(HK, 3, 30, 'B11r-KHI'), hunt(HD, 5, 30, 'B11r-DAI')]);
  const pC = poolCount(HC), pK = poolCount(HK), pD = poolCount(HD);
  // gộp 2 phiên
  const TC = kC + 11, PC = pC + 0, TK = kK + 7, PK = pK + 2, TD = kD + 14, PD = pD + 5;
  R.note(`B11 GỘP: CTL ${PC}/${TC} | KHI ${PK}/${TK} (${TK ? (PK / TK).toFixed(2) : '—'}, kỳ vọng 0.15) | DAI ${PD}/${TD} (${TD ? (PD / TD).toFixed(2) : '—'}, kỳ vọng 0.30)`);
  R.ok('B11 đối chứng gộp: không thiên phú = 0 món hồ bơi', PC === 0 && TC >= 25, `pool=${PC} kills=${TC}`);
  R.ok('B11 Khí vận nhỏ gộp: tỉ lệ ~15%', TK >= 25 && (PK / TK) >= 0.05 && (PK / TK) <= 0.30, `rate=${TK ? (PK / TK).toFixed(2) : '—'} (${PK}/${TK})`);
  R.ok('B11 Đại khí vận gộp: tỉ lệ ~30%', TD >= 25 && (PD / TD) >= 0.15 && (PD / TD) <= 0.48, `rate=${TD ? (PD / TD).toFixed(2) : '—'} (${PD}/${TD})`);
  R.done('p338f3');
  await H.stopServer();
  process.exit(R.fail ? 1 : 0);
})().catch(async (e) => { console.error('LOI', e); try { await H.stopServer(); } catch (_) {} process.exit(2); });
