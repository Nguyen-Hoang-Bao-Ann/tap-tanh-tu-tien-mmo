// Probe GĐ349-C — Mục 4: phụ ấn Ảnh +3% tốc chạy.
// Code (server/index.js:17597): tốc tick = speedOf(...) x ... x (subSealOf=='satthu' ? 1.03 : 1)
// — hệ số NHÂN THẲNG (không qua chỉ số) nên tỉ lệ quãng đường phải đúng 1.03.
// Cách đo ít nhiễu: 2 char giống hệt (chỉ khác lớp phụ satthu vs ytu) BAY song song cùng quãng
// (bay x1.5 cho cả hai nên tỉ lệ giữ nguyên, và bay bỏ qua vật cản), 16 giây/hiệp, 5 hiệp đổi chiều.
// Lấy |dx| theo cửa sổ riêng của từng char từ mẫu tick; tỉ lệ từng hiệp -> median.
const fs = require('fs');
const path = require('path');
const { makeHarness, BASE, makeOk, meOf, flyTo, waitStableMons, sleep, waitFor, median } = require('./lib349.cjs');
const DIR = path.join(__dirname, 'c');
fs.mkdirSync(DIR, { recursive: true });
const PORT = 3662;
const H = makeHarness(PORT, {}, DIR);
const R = makeOk();

async function pairedRun(c1, c2, dirX, durMs) {
  // đưa 2 char về cùng x xuất phát (giữ nguyên y hiện tại của từng char)
  const t0 = Date.now();
  c1.socket.emit('client_input', { vx: dirX, vy: 0 });
  c2.socket.emit('client_input', { vx: dirX, vy: 0 });
  const S = { [c1.myName]: [], [c2.myName]: [] };
  while (Date.now() - t0 < durMs + 300) {
    for (const c of [c1, c2]) { const me = meOf(c); if (me) S[c.myName].push({ at: Date.now(), x: me.x }); }
    await sleep(55);
  }
  c1.socket.emit('client_input', { vx: 0, vy: 0 });
  c2.socket.emit('client_input', { vx: 0, vy: 0 });
  const dist = {};
  for (const c of [c1, c2]) {
    const arr = S[c.myName].filter((s) => s.at <= t0 + durMs);
    dist[c.myName] = arr.length > 2 ? Math.abs(arr[arr.length - 1].x - arr[0].x) : 0;
  }
  return dist;
}

(async () => {
  const ANFULL = { vienman: true, luyenHon: true, nhapDao: true };
  const chars = {};
  chars['p349canh01'] = BASE('p349canh01', 'P349TocAn', { anState: { ...ANFULL, subClass: 'satthu' }, mapId: 'huyet_sac_rung', x: 700, y: 3000 });
  chars['p349cyto01'] = BASE('p349cyto01', 'P349TocY', { anState: { ...ANFULL, subClass: 'ytu' }, mapId: 'huyet_sac_rung', x: 700, y: 3400 });
  H.writeChars(chars);
  await H.startServer();
  const S1 = H.connect('p349canh01');
  const S2 = H.connect('p349cyto01');
  await waitFor(() => S1.welcome && S2.welcome, 20000);
  await waitStableMons(S1);
  // bật bay cho cả hai + về điểm xuất phát
  for (const c of [S1, S2]) { if (!c.flying) { c.socket.emit('fly_toggle', {}); await sleep(400); } }
  await flyTo(S1, 700, 3000, 40); await flyTo(S2, 700, 3400, 40);
  const ratios = [];
  let dirX = 1;
  for (let i = 0; i < 5; i++) {
    const d = await pairedRun(S1, S2, dirX, 16000);
    const dA = d['P349TocAn'], dY = d['P349TocY'];
    if (dA > 4000 && dY > 4000) { const r = dA / dY; ratios.push(r); R.note(`hiep ${i + 1} dir=${dirX}: An=${Math.round(dA)}px Y=${Math.round(dY)}px ti le=${r.toFixed(4)}`); }
    else R.note(`hiep ${i + 1}: quãng ngắn bất thường An=${Math.round(dA)} Y=${Math.round(dY)} — bỏ hiệp`);
    dirX = -dirX;
    await sleep(600);
  }
  const med = median(ratios);
  R.note(`M4: ti le median = ${med.toFixed(4)} (ky vong 1.03), n=${ratios.length}`);
  R.ok('M4: du hiep do (n >= 4)', ratios.length >= 4, `n=${ratios.length}`);
  R.ok('M4: phu an Anh toc chay x1.03', med >= 1.015 && med <= 1.045, `median=${med.toFixed(4)}`);
  S1.socket.disconnect(); S2.socket.disconnect();
  await H.stopServer();
  R.done('GĐ349-C muc4');
  process.exit(R.fail ? 1 : 0);
})().catch(async (e) => { console.log('LOI: ' + e.message); try { await H.stopServer(); } catch (_) {} process.exit(2); });
