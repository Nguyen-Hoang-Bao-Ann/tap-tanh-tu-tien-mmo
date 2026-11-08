// Probe GĐ338-B1 — Hiền hòa x1.3 delta Duyên Nợ dương (trước giảm nửa/trần ngày, đo ở điểm <300):
//   nói chuyện lần đầu ngày: +2 -> talent round(2 x 1.3) = +3 (nguồn lặp, qua affinity_changed.delta)
//   tặng quà ĐÚNG món thích (tất định theo hash id): +15 -> +20 (không lặp, không bị trần 15 nuốt)
//   tặng quà thường (ngoài hồ quà): +3 -> +4
const path = require('path');
const { makeHarness, BASE, writeWorld, makeOk, meOf, flyTo, land, sleep, waitFor } = require('./lib338.cjs');
const PORT = 3620;
const DIR = __dirname;
const H = makeHarness(PORT, {}, DIR);
const R = makeOk();
const POOL = ['linh_thao', 'thit_thu', 'dan_hoi_xuan', 'da_quy', 'nanh_soi', 'canh_doi', 'thanh_thao', 'xuong_thu'];
function likedOf(npcId) { let h = 0; for (let i = 0; i < npcId.length; i++) h = (h * 31 + npcId.charCodeAt(i)) >>> 0; return POOL[h % POOL.length]; }

(async () => {
  const inv = {}; for (const it of POOL) inv[it] = 3; inv.quang_sat = 3;
  const chars = {
    p338i10001: BASE('p338i10001', ' GiaoChuan', { mapId: 'lang_tan_thu', x: 1565, y: 1252, inventory: { ...inv } }),
    p338i10002: BASE('p338i10002', ' GiaoHienHoa', { mapId: 'lang_tan_thu', x: 1600, y: 1252, inventory: { ...inv }, talent: { id: 'hien_hoa', tier: 'bach' } }),
  };
  writeWorld(DIR, chars, []);
  await H.startServer();
  const CTL = await H.connect('p338i10001');
  const TAL = await H.connect('p338i10002');
  for (const c of [CTL, TAL]) { c.aff = []; c.socket.on('affinity_changed', (e) => c.aff.push(e)); }
  const liked = likedOf('npc_truonglang');
  R.note(`món thích của Trưởng Làng (theo hash): ${liked}`);
  // tìm vị trí NPC trong tick (npcs hoặc players)
  async function gotoNpc(c) {
    const st = c.state || {};
    const all = [...(st.npcs || []), ...(st.players || [])];
    const npc = all.find((p) => p.id === 'npc_truonglang' || p.name === 'Trưởng Làng');
    if (npc) { await flyTo(c, npc.x, npc.y, 60, 10000); await land(c); return true; }
    return false;
  }
  R.note(`tìm NPC: ctl=${await gotoNpc(CTL)} tal=${await gotoNpc(TAL)}`);
  async function doTalk(c) {
    c.aff = [];
    c.socket.emit('talk_npc', { npcId: 'npc_truonglang' });
    const e = await waitFor(() => c.aff.find((x) => x.npcId === 'npc_truonglang') || null, 4000);
    return e ? e.delta : null;
  }
  async function doGift(c, itemId) {
    c.aff = [];
    c.socket.emit('npc_gift', { npcId: 'npc_truonglang', itemId });
    const e = await waitFor(() => c.aff.find((x) => x.npcId === 'npc_truonglang') || null, 4000);
    return e ? e.delta : null;
  }
  const tC = await doTalk(CTL), tT = await doTalk(TAL);
  R.note(`B1 nói chuyện: CTL delta=${tC} (kỳ vọng 2) | HIỀN HÒA delta=${tT} (kỳ vọng 3)`);
  const gC = await doGift(CTL, liked), gT = await doGift(TAL, liked);
  R.note(`B1 tặng món thích: CTL delta=${gC} (kỳ vọng 15) | HIỀN HÒA delta=${gT} (kỳ vọng 20)`);
  const nC = await doGift(CTL, 'quang_sat'), nT = await doGift(TAL, 'quang_sat');
  R.note(`B1 tặng món thường: CTL delta=${nC} (kỳ vọng 3) | HIỀN HÒA delta=${nT} (kỳ vọng 4)`);
  R.ok('B1 Hiền hòa x1.3: nói chuyện 2 -> 3', tC === 2 && tT === 3, `ctl=${tC} tal=${tT}`);
  R.ok('B1 Hiền hòa x1.3: quà thích 15 -> 20', gC === 15 && gT === 20, `ctl=${gC} tal=${gT}`);
  R.ok('B1 Hiền hòa x1.3: quà thường 3 -> 4', nC === 3 && nT === 4, `ctl=${nC} tal=${nT}`);
  R.done('p338i');
  await H.stopServer();
  process.exit(R.fail ? 1 : 0);
})().catch(async (e) => { console.error('LOI', e); try { await H.stopServer(); } catch (_) {} process.exit(2); });
