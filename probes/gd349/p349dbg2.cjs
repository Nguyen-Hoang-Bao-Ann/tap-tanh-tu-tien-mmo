// Chẩn đoán 2: in anBonus.coDuyen của char dai_khi_van + đếm canary 'stones' (mọi kill chạy
// dropMonsterLoot đều sinh đúng 1 stones drop) cùng pool trên 30 kill xác thực ở bãi farm.
const fs = require('fs');
const path = require('path');
const { makeHarness, BASE, makeOk, meOf, monsOf, dropsOf, land, sleep, waitFor } = require('./lib349.cjs');
const DIR = path.join(__dirname, 'dbg');
const PORT = 3664;
const H = makeHarness(PORT, {}, DIR);
const R = makeOk();
const POOL = ['da_quy', 'ngoc_gian_trong', 'tien_linh_chi'];

(async () => {
  const chars = {};
  chars['p349dvan01'] = BASE('p349dvan01', 'P349KhiVan', { talent: { id: 'dai_khi_van', tier: 'cam' } });
  H.writeChars(chars);
  await H.startServer();
  const A = H.connect('p349dvan01');
  await waitFor(() => A.welcome, 20000);
  await sleep(1500);
  const wc = (A.welcome || {}).character || {};
  R.note(`payload: talent=${JSON.stringify(wc.talent)} anBonus.coDuyen=${JSON.stringify((wc.anBonus || {}).coDuyen)}`);
  const seen = new Map();
  let polling = true;
  (async () => { while (polling) { for (const d of dropsOf(A)) if (!seen.has(d.id)) seen.set(d.id, { at: Date.now(), kind: d.kind, itemId: d.itemId, x: d.x, y: d.y }); await sleep(50); } })();
  let verified = 0, stonesSeen = 0, poolSeen = 0;
  for (let e = 0; e < 34 && verified < 30; e++) {
    const me = meOf(A);
    const cand = monsOf(A).filter((m) => (m.kind === 'wolf' || m.kind === 'bat') && !m.sp)
      .sort((a, b) => Math.hypot(a.x - me.x, a.y - me.y) - Math.hypot(b.x - me.x, b.y - me.y))[0];
    if (!cand) { await sleep(1200); continue; }
    if (A.flying) await land(A);
    let myHit = false, lastPos = { x: cand.x, y: cand.y }, vanishedAt = null;
    const t0 = Date.now();
    while (Date.now() - t0 < 20000) {
      const m = monsOf(A).find((x) => x.id === cand.id);
      if (!m) { vanishedAt = Date.now(); break; }
      lastPos = { x: m.x, y: m.y };
      const me2 = meOf(A); if (!me2) { await sleep(90); continue; }
      const d = Math.hypot(m.x - me2.x, m.y - me2.y);
      if (d <= 58) {
        A.socket.emit('client_input', { vx: 0, vy: 0 });
        const ai = A.attacks.length;
        A.socket.emit('player_attack');
        const hit = await waitFor(() => (A.attacks.length > ai ? A.attacks[A.attacks.length - 1] : null), 1200);
        if (hit && hit.targetId === cand.id) myHit = true;
        await sleep(250);
      } else { A.socket.emit('client_input', { vx: (m.x - me2.x) / d, vy: (m.y - me2.y) / d }); await sleep(110); }
    }
    A.socket.emit('client_input', { vx: 0, vy: 0 });
    if (!vanishedAt || !myHit) continue;
    verified++;
    await sleep(900);
    const near = [...seen.values()].filter((v) => v.at >= t0 && Math.hypot(v.x - lastPos.x, v.y - lastPos.y) <= 200);
    const st = near.filter((v) => v.kind === 'stones').length;
    const pl = near.filter((v) => v.kind === 'item' && POOL.includes(v.itemId)).length;
    stonesSeen += st > 0 ? 1 : 0; poolSeen += pl;
    if (e < 6 || st === 0) R.note(`kill ${verified}: stones=${st} pool=${pl} items=[${near.filter((v) => v.kind === 'item').map((v) => v.itemId).join(',')}]`);
  }
  polling = false;
  R.note(`TONG2: verified=${verified} killsCoStones=${stonesSeen} pool=${poolSeen} rate=${verified ? (poolSeen / verified).toFixed(3) : 'n/a'}`);
  A.socket.disconnect();
  await H.stopServer();
  R.done('GĐ349-DBG2');
  process.exit(0);
})().catch(async (e) => { console.log('LOI: ' + e.message); try { await H.stopServer(); } catch (_) {} process.exit(2); });
