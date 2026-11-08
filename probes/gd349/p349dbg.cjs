// Chẩn đoán GĐ349-D: vì sao p349d đếm thấp? Theo dõi LIÊN TỤC state.drops (poll 50ms) quanh
// từng engagement ở bãi farm nhà; ghi: đòn của mình (player_attacked), quái biến mất, MỌI drop
// mới trong 200px quanh vị trí quái chết (mọi itemId), người chơi khác gần nhất lúc kill.
const fs = require('fs');
const path = require('path');
const { makeHarness, BASE, makeOk, meOf, monsOf, dropsOf, flyTo, land, sleep, waitFor } = require('./lib349.cjs');
const DIR = path.join(__dirname, 'dbg');
fs.mkdirSync(DIR, { recursive: true });
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
  await sleep(2500);

  // poller liên tục: ghi mọi drop id từng xuất hiện + vị trí + thời điểm đầu thấy
  const seen = new Map();
  let polling = true;
  (async () => { while (polling) { for (const d of dropsOf(A)) if (!seen.has(d.id)) seen.set(d.id, { at: Date.now(), kind: d.kind, itemId: d.itemId, x: d.x, y: d.y }); await sleep(50); } })();

  let verified = 0, stolen = 0, poolSeen = 0;
  for (let e = 0; e < 14 && verified < 12; e++) {
    const me = meOf(A);
    const others = (A.state?.players || []).filter((p) => p.name !== A.myName);
    const cand = monsOf(A).filter((m) => (m.kind === 'wolf' || m.kind === 'bat') && !m.sp)
      .sort((a, b) => Math.hypot(a.x - me.x, a.y - me.y) - Math.hypot(b.x - me.x, b.y - me.y))[0];
    if (!cand) { await sleep(1500); continue; }
    const nearOther = Math.min(...others.map((p) => Math.hypot(p.x - cand.x, p.y - cand.y)), 9999);
    if (A.flying) await land(A);
    // đuổi theo vị trí SỐNG
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
    if (!vanishedAt) { R.note(`eng ${e}: quái không chết sau 20s`); continue; }
    await sleep(900); // chờ drop xuất hiện đủ
    const newDrops = [...seen.entries()].filter(([, v]) => v.at >= t0 && Math.hypot(v.x - lastPos.x, v.y - lastPos.y) <= 200 && v.kind === 'item');
    const poolDrops = newDrops.filter(([, v]) => POOL.includes(v.itemId));
    if (myHit) { verified++; poolSeen += poolDrops.length; } else stolen++;
    R.note(`eng ${e}: myHit=${myHit} nearOther=${Math.round(nearOther)}px drops=[${newDrops.map(([, v]) => v.itemId).join(',')}] pool=${poolDrops.length}`);
  }
  polling = false;
  R.note(`TONG: verifiedKills=${verified} stolenOrUnverified=${stolen} poolDropsTrenVerified=${poolSeen} rate=${verified ? (poolSeen / verified).toFixed(3) : 'n/a'}`);
  A.socket.disconnect();
  await H.stopServer();
  R.done('GĐ349-DBG');
  process.exit(0);
})().catch(async (e) => { console.log('LOI: ' + e.message); try { await H.stopServer(); } catch (_) {} process.exit(2); });
