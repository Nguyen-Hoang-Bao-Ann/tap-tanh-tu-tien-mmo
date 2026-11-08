// Probe GĐ349-D2 — Mục 6 v2: ĐẠI KHÍ VẬN kênh loot, ĐO LẠI bằng kết liễu TẦM XA.
// Bài học dbg/dbg2: kết liễu cận chiến — quái chết trong 34px thì đồ (kể cả 'stones' chắc chắn rơi)
// bị nhặt TỨC THÌ trong cùng tick, không kịp vào tick snapshot -> đếm thiếu hệ thống (~1/3 kill mất dấu).
// Cách mới: kết liễu bằng kiemtu_1 (tầm 120) từ khoảng cách ~110px -> đồ rơi cách người >= 90px,
// không nhặt tức thì; poller 50ms ghi MỌI drop từng xuất hiện; canary stones phải ~100% kill.
// Pha A: char dai_khi_van, mục tiêu 300 kill. Pha B: đối chứng không thiên phú, 150 kill, kỳ vọng pool = 0.
const fs = require('fs');
const path = require('path');
const { makeHarness, BASE, makeOk, meOf, monsOf, dropsOf, flyTo, land, myChar, sleep, waitFor } = require('./lib349.cjs');
const DIR = path.join(__dirname, 'd2');
fs.mkdirSync(DIR, { recursive: true });
const PORT = 3666;
const H = makeHarness(PORT, {}, DIR);
const R = makeOk();
const POOL = ['da_quy', 'ngoc_gian_trong', 'tien_linh_chi'];
const SKILL = 'kiemtu_1';
const seen = new Map();
let polling = false;
function startPoll(c) { polling = true; (async () => { while (polling) { for (const d of dropsOf(c)) if (!seen.has(d.id)) seen.set(d.id, { at: Date.now(), kind: d.kind, itemId: d.itemId, x: d.x, y: d.y }); await sleep(50); } })(); }

async function castKill(c, m0, slot) {
  // tiếp cận tới ~110px (đất) rồi cast; xác nhận qua cast_result ok + quái biến mất + tấn công đúng id
  const t0 = Date.now();
  let lastPos = { x: m0.x, y: m0.y };
  while (Date.now() - t0 < 15000) {
    const m = monsOf(c).find((x) => x.id === m0.id);
    if (!m) return { ok: false, lastPos };
    lastPos = { x: m.x, y: m.y };
    const me = meOf(c); if (!me) { await sleep(90); continue; }
    const d = Math.hypot(m.x - me.x, m.y - me.y);
    if (d > 118) { c.socket.emit('client_input', { vx: (m.x - me.x) / d, vy: (m.y - me.y) / d }); await sleep(100); continue; }
    c.socket.emit('client_input', { vx: 0, vy: 0 });
    if (d < 70) { // quá gần: lùi ra trước khi cast để tránh nhặt tức thì
      c.socket.emit('client_input', { vx: -(m.x - me.x) / (d || 1), vy: -(m.y - me.y) / (d || 1) });
      await sleep(420); c.socket.emit('client_input', { vx: 0, vy: 0 }); continue;
    }
    const ci = c.casts.length;
    c.socket.emit('cast_skill', { slot });
    const cr = await waitFor(() => (c.casts.length > ci ? c.casts[c.casts.length - 1] : null), 1500);
    if (cr && cr.ok && cr.targetId === m0.id) {
      const gone = await waitFor(() => !monsOf(c).find((x) => x.id === m0.id) ? true : null, 1500);
      if (gone) return { ok: true, lastPos };
      return { ok: false, lastPos }; // cast trúng nhưng quái chưa chết (không tính)
    }
    await sleep(300);
  }
  return { ok: false, lastPos };
}

async function hunt(c, label, targetKills, deadlineMs) {
  const slot = (() => { const ch = myChar(c); const sk = ch && ch.skills ? ch.skills : ((c.sync && c.sync.skills) || []); return sk.findIndex((s) => s && s.id === SKILL); })();
  if (slot < 0) { R.note(label + ': không tìm thấy ô ' + SKILL); return null; }
  let kills = 0, pool = { da_quy: 0, ngoc_gian_trong: 0, tien_linh_chi: 0 }, stonesOk = 0, attempts = 0;
  const wp = [[1565, 2100], [1100, 1700], [2100, 1700], [900, 2500], [2300, 2500], [1565, 1500]];
  let wpi = 0;
  const tEnd = Date.now() + deadlineMs;
  while (kills < targetKills && Date.now() < tEnd) {
    const me = meOf(c); if (!me) { await sleep(400); continue; }
    const others = (c.state?.players || []).filter((p) => p.name !== c.myName);
    const cand = monsOf(c).filter((m) => (m.kind === 'wolf' || m.kind === 'bat') && !m.sp)
      .filter((m) => !others.some((p) => Math.hypot(p.x - m.x, p.y - m.y) < 300))
      .sort((a, b) => Math.hypot(a.x - me.x, a.y - me.y) - Math.hypot(b.x - me.x, b.y - me.y))[0];
    if (!cand) { const w = wp[wpi++ % wp.length]; if (c.flying) await flyTo(c, w[0], w[1], 120); else { c.socket.emit('client_input', { vx: Math.sign(w[0] - me.x), vy: Math.sign(w[1] - me.y) }); await sleep(700); c.socket.emit('client_input', { vx: 0, vy: 0 }); } continue; }
    attempts++;
    if (c.flying) await land(c);
    const engStart = Date.now();
    const res = await castKill(c, cand, slot);
    if (!res.ok) continue;
    kills++;
    await sleep(700);
    const near = [...seen.values()].filter((v) => v.at >= engStart - 100 && Math.hypot(v.x - res.lastPos.x, v.y - res.lastPos.y) <= 170);
    if (near.some((v) => v.kind === 'stones')) stonesOk++;
    for (const v of near) if (v.kind === 'item' && POOL.includes(v.itemId)) pool[v.itemId]++;
    if (kills % 25 === 0) console.log(`PROGRESS2 ${label}: kills=${kills} stones=${stonesOk} pool=${JSON.stringify(pool)} attempts=${attempts}`);
  }
  return { kills, stonesOk, pool, attempts };
}

(async () => {
  const chars = {};
  chars['p349dvan01'] = BASE('p349dvan01', 'P349KhiVan', { talent: { id: 'dai_khi_van', tier: 'cam' }, skills: [SKILL], stats: { vatCong: 400, phapCong: 400 } });
  chars['p349dctl01'] = BASE('p349dctl01', 'P349DoiChung', { skills: [SKILL], stats: { vatCong: 400, phapCong: 400 } });
  H.writeChars(chars);
  await H.startServer();
  const A = H.connect('p349dvan01');
  await waitFor(() => A.welcome, 20000);
  const wc = (A.welcome || {}).character || {};
  R.note(`A payload: talent=${JSON.stringify(wc.talent)} anBonus.coDuyen=${JSON.stringify((wc.anBonus || {}).coDuyen)}`);
  await sleep(2000); startPoll(A);
  const ra = await hunt(A, 'A', 300, 45 * 60 * 1000);
  polling = false;
  A.socket.disconnect();
  await sleep(600);
  const Bc = H.connect('p349dctl01');
  await waitFor(() => Bc.welcome, 20000);
  await sleep(2000);
  seen.clear(); startPoll(Bc);
  const rb = await hunt(Bc, 'B', 150, 25 * 60 * 1000);
  polling = false;
  if (ra) {
    const tot = ra.pool.da_quy + ra.pool.ngoc_gian_trong + ra.pool.tien_linh_chi;
    const p = ra.kills ? tot / ra.kills : 0;
    const se = ra.kills ? Math.sqrt(Math.max(0.0001, p * (1 - p)) / ra.kills) : 0;
    R.note(`M6-A: kills=${ra.kills} stonesCanary=${ra.stonesOk} (${(100 * ra.stonesOk / Math.max(1, ra.kills)).toFixed(0)}%) pool=${JSON.stringify(ra.pool)} tong=${tot} rate=${p.toFixed(3)} CI95=[${(p - 1.96 * se).toFixed(3)},${(p + 1.96 * se).toFixed(3)}]`);
    R.ok('M6: canary stones >= 90% kill (do tin cay cach dem)', ra.stonesOk >= 0.9 * ra.kills, `${ra.stonesOk}/${ra.kills}`);
    R.ok('M6: du mau A (kills >= 250)', ra.kills >= 250, `kills=${ra.kills}`);
    R.ok('M6: ti le Dai khi van CI95 chua 0.30', (p - 1.96 * se) <= 0.30 && 0.30 <= (p + 1.96 * se), `rate=${p.toFixed(3)} CI=[${(p - 1.96 * se).toFixed(3)},${(p + 1.96 * se).toFixed(3)}]`);
  } else R.ok('M6: chay duoc pha A', false, 'hunt tra null');
  if (rb) {
    const totB = rb.pool.da_quy + rb.pool.ngoc_gian_trong + rb.pool.tien_linh_chi;
    R.note(`M6-B doi chung: kills=${rb.kills} stonesCanary=${rb.stonesOk} poolTong=${totB} ${JSON.stringify(rb.pool)}`);
    R.ok('M6-DC: doi chung 0 do pool', totB === 0, `pool=${totB}`);
  } else R.ok('M6: chay duoc pha B', false, 'hunt tra null');
  Bc.socket.disconnect();
  await H.stopServer();
  R.done('GĐ349-D2 muc6');
  process.exit(R.fail ? 1 : 0);
})().catch(async (e) => { console.log('LOI: ' + e.message); try { await H.stopServer(); } catch (_) {} process.exit(2); });
