// Probe GĐ349-D — Mục 6: ĐẠI KHÍ VẬN (kênh L cơ duyên, ngoài LOOT_NERF).
// Code (server/index.js ~7744): hạ quái -> roll coDuyenEffOf(player).loot; dai_khi_van = 0.30
// -> rơi THÊM 1 món từ pool [da_quy, ngoc_gian_trong, tien_linh_chi].
// Loài đếm: wolf + bat ở bãi farm nhà — loot THƯỜNG của 2 loài này KHÔNG chứa món nào trong pool
// (wolf: nanh_soi/sach/thit/xuong/manh_xuong; bat: canh_doi/thit/xuong/manh_xuong) -> mọi drop pool
// quan sát được gần xác = cơ duyên. Quái hiếm ✦ (tick có cờ sp) bị LOẠI khỏi mẫu (chúng rơi
// ngoc_gian_trong 25% theo kênh trùm/hiếm). Sau mỗi kill lùi 70px khỏi xác (PICKUP_RANGE=34)
// để drop không bị nhặt trước khi đếm. Đối chứng: char không thiên phú, kỳ vọng 0 drop pool.
const fs = require('fs');
const path = require('path');
const { makeHarness, BASE, makeOk, meOf, monsOf, dropsOf, flyTo, land, sleep, waitFor } = require('./lib349.cjs');
const DIR = path.join(__dirname, 'd');
fs.mkdirSync(DIR, { recursive: true });
const PORT = 3663;
const H = makeHarness(PORT, {}, DIR);
const R = makeOk();
const POOL = ['da_quy', 'ngoc_gian_trong', 'tien_linh_chi'];

async function chaseKill(c, id) {
  const t0 = Date.now();
  while (Date.now() - t0 < 25000) {
    const m = monsOf(c).find((x) => x.id === id);
    if (!m) return true;
    const me = meOf(c); if (!me) { await sleep(100); continue; }
    const d = Math.hypot(m.x - me.x, m.y - me.y);
    if (d <= 58) {
      c.socket.emit('client_input', { vx: 0, vy: 0 });
      const ai = c.attacks.length;
      c.socket.emit('player_attack');
      const hit = await waitFor(() => (c.attacks.length > ai ? c.attacks[c.attacks.length - 1] : null), 1300);
      if (hit && hit.targetId === id) {
        const gone = await waitFor(() => !monsOf(c).find((x) => x.id === id), 1300);
        if (gone) return true;
      }
    } else {
      c.socket.emit('client_input', { vx: (m.x - me.x) / d, vy: (m.y - me.y) / d });
      await sleep(110);
    }
  }
  c.socket.emit('client_input', { vx: 0, vy: 0 });
  return false;
}

async function hunt(c, targetKills, deadlineMs, tag) {
  let kills = 0; const pool = { da_quy: 0, ngoc_gian_trong: 0, tien_linh_chi: 0 };
  const counted = new Set();
  const t0 = Date.now();
  const WANDER = [[1565, 2100], [1100, 1700], [2100, 1700], [900, 2500], [2300, 2500], [1565, 1500]];
  let wi = 0;
  while (kills < targetKills && Date.now() - t0 < deadlineMs) {
    const me = meOf(c);
    if (!me) { await sleep(300); continue; }
    const others = (c.state?.players || []).filter((p) => p.name !== c.myName);
    const cand = monsOf(c)
      .filter((m) => (m.kind === 'wolf' || m.kind === 'bat') && !m.sp)
      .filter((m) => !others.some((p) => Math.hypot(p.x - m.x, p.y - m.y) <= 350))
      .sort((a, b) => Math.hypot(a.x - me.x, a.y - me.y) - Math.hypot(b.x - me.x, b.y - me.y))[0];
    if (!cand) { const w = WANDER[wi++ % WANDER.length]; await flyTo(c, w[0], w[1], 80, 12000); await land(c); continue; }
    if (c.flying) await land(c);
    const corpse = { x: cand.x, y: cand.y };
    const okKill = await chaseKill(c, cand.id);
    if (!okKill) continue;
    kills++;
    // lùi 70px khỏi xác (tránh PICKUP_RANGE 34) rồi quan sát drop mới trong 1.3s
    const me2 = meOf(c);
    if (me2) { const dx = me2.x - corpse.x, dy = me2.y - corpse.y; const len = Math.hypot(dx, dy) || 1; c.socket.emit('client_input', { vx: dx / len, vy: dy / len }); await sleep(330); c.socket.emit('client_input', { vx: 0, vy: 0 }); }
    const tEnd = Date.now() + 1300;
    while (Date.now() < tEnd) {
      for (const d of dropsOf(c)) {
        if (d.kind === 'item' && POOL.includes(d.itemId) && !counted.has(d.id) && Math.hypot(d.x - corpse.x, d.y - corpse.y) <= 110) { counted.add(d.id); pool[d.itemId]++; }
      }
      await sleep(90);
    }
    if (kills % 25 === 0) console.log(`PROGRESS ${tag}: kills=${kills} pool=${pool.da_quy + pool.ngoc_gian_trong + pool.tien_linh_chi} (${JSON.stringify(pool)})`);
  }
  return { kills, pool, total: pool.da_quy + pool.ngoc_gian_trong + pool.tien_linh_chi };
}

(async () => {
  const chars = {};
  chars['p349dvan01'] = BASE('p349dvan01', 'P349KhiVan', { talent: { id: 'dai_khi_van', tier: 'cam' } });
  chars['p349dctl01'] = BASE('p349dctl01', 'P349DoiChung', {});
  H.writeChars(chars);
  await H.startServer();
  // ===== Pha A: có Đại khí vận — 300 kill =====
  const A = H.connect('p349dvan01');
  await waitFor(() => A.welcome, 20000);
  await sleep(2500);
  const visA = monsOf(A).filter((m) => m.kind === 'wolf' || m.kind === 'bat').length;
  R.note(`Pha A: thay ${visA} soi/doi trong tick tu quang truong`);
  const resA = await hunt(A, 300, 45 * 60 * 1000, 'A');
  const rateA = resA.kills ? resA.total / resA.kills : 0;
  const seA = resA.kills ? Math.sqrt(rateA * (1 - rateA) / resA.kills) : 0;
  R.note(`A: kills=${resA.kills} pool=${resA.total} ${JSON.stringify(resA.pool)} rate=${rateA.toFixed(4)} SE=${seA.toFixed(4)} CI95=[${(rateA - 1.96 * seA).toFixed(3)}, ${(rateA + 1.96 * seA).toFixed(3)}]`);
  R.ok('A: du mau >= 250 kill', resA.kills >= 250, `n=${resA.kills}`);
  R.ok('A: CI95 chua danh nghia 0.30', resA.kills >= 250 && (rateA - 1.96 * seA) <= 0.30 && 0.30 <= (rateA + 1.96 * seA), `rate=${rateA.toFixed(3)} CI=[${(rateA - 1.96 * seA).toFixed(3)},${(rateA + 1.96 * seA).toFixed(3)}]`);
  A.socket.disconnect();
  await sleep(1000);
  // ===== Pha B: đối chứng không thiên phú — 150 kill, kỳ vọng 0 pool =====
  const B = H.connect('p349dctl01');
  await waitFor(() => B.welcome, 20000);
  await sleep(2500);
  const resB = await hunt(B, 150, 25 * 60 * 1000, 'B');
  R.note(`B: kills=${resB.kills} pool=${resB.total} ${JSON.stringify(resB.pool)}`);
  R.ok('B: du mau >= 120 kill', resB.kills >= 120, `n=${resB.kills}`);
  R.ok('B: doi chung 0 drop pool (loot thuong wolf/bat sach)', resB.total === 0, `pool=${resB.total}`);
  B.socket.disconnect();
  await H.stopServer();
  R.done('GĐ349-D dai-khi-van');
  process.exit(R.fail ? 1 : 0);
})().catch(async (e) => { console.log('LOI: ' + e.message); try { await H.stopServer(); } catch (_) {} process.exit(2); });
