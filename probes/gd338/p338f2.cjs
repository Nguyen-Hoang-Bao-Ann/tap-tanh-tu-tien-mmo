// Probe GĐ338-B4 — Nhãn lực tinh tường: kênh thu thập (+10% cơ hội +1 nguyên liệu mỗi lần gather).
// 2 char (CTL / nhan_luc) cùng 2 nghề (haithuoc + daokhoang) vòng 12 node làng; ngày game 20s thật
// để khóa "1 node/ngày" mở liên tục. Kỳ vọng chênh lệch sản lượng/người: +0.10 món/lần gather.
const path = require('path');
const { makeHarness, BASE, writeWorld, makeOk, meOf, flyTo, land, sleep, waitFor } = require('./lib338.cjs');
const PORT = 3619;
const DIR = __dirname;
const H = makeHarness(PORT, { TTT_DAY_REAL_MS: '20000' }, DIR);
const R = makeOk();
const hs = (v) => Math.round(v * 2.23607);
const NODES = [
  ...[2050, 2150, 2000, 2180, 1700, 1850].map((x, i) => ({ id: `node-lang_tan_thu-${i}`, x: hs(x), y: hs([200, 500, 800, 1000, 300, 900][i]), item: 'quang_sat' })),
  ...[1700, 1800, 1900, 1750, 2050, 1650].map((x, i) => ({ id: `node-lang_tan_thu-${6 + i}`, x: hs(x), y: hs([200, 400, 650, 850, 950, 550][i]), item: 'thao_duoc' })),
];
async function gatherCycle(c, results) {
  let okCount = 0;
  for (const n of NODES) {
    await flyTo(c, n.x, n.y, 60, 10000); await land(c);
    const before = results.length;
    c.socket.emit('gather_node', { nodeId: n.id });
    const r = await waitFor(() => results.length > before ? results[results.length - 1] : null, 2500);
    if (r && r.ok) okCount++;
    await sleep(120);
  }
  return okCount;
}
(async () => {
  const jobSet = { job: { jobId: 'haithuoc', crafts: 0 }, job2: { jobId: 'daokhoang', crafts: 0 } };
  const chars = {
    p338g10001: BASE('p338g10001', ' HaiChuan', { mapId: 'lang_tan_thu', x: 3801, y: 447, ...jobSet }),
    p338g10002: BASE('p338g10002', ' HaiNhanLuc', { mapId: 'lang_tan_thu', x: 3801, y: 447, talent: { id: 'nhan_luc', tier: 'tim' }, ...jobSet }),
  };
  writeWorld(DIR, chars, []);
  await H.startServer();
  const CTL = await H.connect('p338g10001');
  const TAL = await H.connect('p338g10002');
  const resC = [], resT = [];
  CTL.socket.on('gather_result', (r) => resC.push(r));
  TAL.socket.on('gather_result', (r) => resT.push(r));
  const inv = (c) => ((c.sync?.inventory || {}).quang_sat || 0) + ((c.sync?.inventory || {}).thao_duoc || 0);
  const CYCLES = 13;
  let okC = 0, okT = 0;
  for (let i = 0; i < CYCLES; i++) {
    const [a, b] = await Promise.all([gatherCycle(CTL, resC), gatherCycle(TAL, resT)]);
    okC += a; okT += b;
    R.note(`chu kỳ ${i + 1}: ctl ok=${okC} đồ=${inv(CTL)} | tal ok=${okT} đồ=${inv(TAL)}`);
    // chờ sang ngày mới (khóa node theo ngày) — ngày 20s, 1 chu kỳ bay ~12 node mất ~15-20s nên thường đã sang ngày
    await sleep(3000);
  }
  const perC = okC ? inv(CTL) / okC : 0, perT = okT ? inv(TAL) / okT : 0;
  R.note(`B4: CTL ${okC} lần -> ${inv(CTL)} món (${perC.toFixed(3)}/lần) | TAL ${okT} lần -> ${inv(TAL)} món (${perT.toFixed(3)}/lần) | chênh ${(perT - perC).toFixed(3)} (kỳ vọng +0.10)`);
  R.ok('B4 Nhãn lực: sản lượng thu thập tăng ~+0.10/lần', okC >= 120 && okT >= 120 && (perT - perC) >= 0.03 && (perT - perC) <= 0.18, `diff=${(perT - perC).toFixed(3)} n=${okC}/${okT}`);
  R.done('p338f2');
  await H.stopServer();
  process.exit(R.fail ? 1 : 0);
})().catch(async (e) => { console.error('LOI', e); try { await H.stopServer(); } catch (_) {} process.exit(2); });
