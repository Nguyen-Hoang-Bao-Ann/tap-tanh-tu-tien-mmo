// Probe GĐ338-B11 (bản đếm drop) — cơ duyên F3 kênh loot: đếm MÓN HỒ BƠI XUẤT HIỆN tại xác quái mình hạ
// (qua tick drops, không phụ thuộc nhặt đồ). Map chia 3 dải y: CTL <2200, KHI 2200–4300, DAI >4300.
const path = require('path');
const { makeHarness, BASE, writeWorld, makeOk, meOf, monsOf, flyTo, land, sleep, waitFor } = require('./lib338.cjs');
const PORT = 3625;
const DIR = __dirname;
const H = makeHarness(PORT, {}, DIR);
const R = makeOk();
const POOL = ['da_quy', 'ngoc_gian_trong', 'tien_linh_chi'];
const dropsOf = (c) => c.state?.drops || [];

async function hunt(c, band, targetKills, tag) {
  let kills = 0, poolDrops = 0;
  const seenDrops = new Set((dropsOf(c) || []).map((d) => d.id));
  const t0 = Date.now();
  const WPS = [[1200, band[0] + 400], [4200, band[0] + 700], [7000, band[0] + 400], [4200, band[1] - 400], [1500, band[1] - 700]];
  let wp = 0;
  while (kills < targetKills && Date.now() - t0 < 8 * 60000) {
    const me = meOf(c);
    const ms = monsOf(c).filter((m) => m.kind === 'wolf' && !m.rare && m.y >= band[0] && m.y <= band[1]); // loại quái hiếm ✦ (tự rơi Ngọc Giản 25% theo GĐ334 — nhiễu kênh)
    if (!me) { await sleep(400); continue; }
    if (!ms.length) { const [x, y] = WPS[wp++ % WPS.length]; await flyTo(c, x, y, 150, 15000); continue; }
    ms.sort((a, b) => Math.hypot(a.x - me.x, a.y - me.y) - Math.hypot(b.x - me.x, b.y - me.y));
    const t = ms[0];
    if (Math.hypot(t.x - me.x, t.y - me.y) > 55) await flyTo(c, t.x, t.y, 35, 6000);
    const cur = monsOf(c).find((m) => m.id === t.id);
    if (!cur) continue;
    const kx = cur.x, ky = cur.y;
    c.socket.emit('player_attack');
    const gone = await waitFor(() => !monsOf(c).some((m) => m.id === t.id) ? true : null, 1200);
    if (gone) {
      kills++;
      // quét drop mới quanh xác trong 1.4s
      const tEnd = Date.now() + 1400;
      while (Date.now() < tEnd) {
        for (const d of dropsOf(c)) {
          if (seenDrops.has(d.id)) continue;
          seenDrops.add(d.id);
          if (POOL.includes(d.itemId) && Math.hypot(d.x - kx, d.y - ky) <= 170) poolDrops++;
        }
        await sleep(150);
      }
    } else await sleep(200);
  }
  await land(c);
  R.note(`${tag}: kills=${kills} poolDropsTạiXác=${poolDrops}`);
  return { kills, poolDrops };
}
(async () => {
  const chars = {
    p338f51001: BASE('p338f51001', ' SanChuan3', { mapId: 'huyet_sac_rung', x: 1500, y: 1200 }),
    p338f51002: BASE('p338f51002', ' SanKhiVan3', { mapId: 'huyet_sac_rung', x: 4200, y: 3200, talent: { id: 'khi_van', tier: 'tim' } }),
    p338f51003: BASE('p338f51003', ' SanDaiVan3', { mapId: 'huyet_sac_rung', x: 6800, y: 5200, talent: { id: 'dai_khi_van', tier: 'cam' } }),
  };
  writeWorld(DIR, chars, []);
  await H.startServer();
  const HC = await H.connect('p338f51001');
  const HK = await H.connect('p338f51002');
  const HD = await H.connect('p338f51003');
  const [rC, rK, rD] = await Promise.all([hunt(HC, [0, 2200], 40, 'B11e-CTL'), hunt(HK, [2200, 4300], 40, 'B11e-KHI'), hunt(HD, [4300, 6373], 40, 'B11e-DAI')]);
  R.note(`B11-drop: CTL ${rC.poolDrops}/${rC.kills} (kỳ vọng 0) | KHI ${rK.poolDrops}/${rK.kills} (${rK.kills ? (rK.poolDrops / rK.kills).toFixed(2) : '—'}, kỳ vọng 0.15) | DAI ${rD.poolDrops}/${rD.kills} (${rD.kills ? (rD.poolDrops / rD.kills).toFixed(2) : '—'}, kỳ vọng 0.30)`);
  R.ok('B11 đối chứng: 0 drop hồ bơi ở xác quái của người không thiên phú', rC.poolDrops === 0 && rC.kills >= 25, `pool=${rC.poolDrops} kills=${rC.kills}`);
  R.ok('B11 Khí vận nhỏ: tỉ lệ drop phụ ~15%', rK.kills >= 25 && (rK.poolDrops / rK.kills) >= 0.05 && (rK.poolDrops / rK.kills) <= 0.30, `rate=${rK.kills ? (rK.poolDrops / rK.kills).toFixed(2) : '—'}`);
  R.ok('B11 Đại khí vận: tỉ lệ drop phụ ~30%', rD.kills >= 25 && (rD.poolDrops / rD.kills) >= 0.15 && (rD.poolDrops / rD.kills) <= 0.48, `rate=${rD.kills ? (rD.poolDrops / rD.kills).toFixed(2) : '—'}`);
  R.done('p338f5');
  await H.stopServer();
  process.exit(R.fail ? 1 : 0);
})().catch(async (e) => { console.error('LOI', e); try { await H.stopServer(); } catch (_) {} process.exit(2); });
