// Probe GĐ350 — Sửa nhãn "+% tốc độ" cho khớp cơ chế (CHỈ đổi chữ, không đổi số).
// Chân 1 (loại A — Đan Thần Tốc): buff nhân vào CHỈ SỐ tocDo qua effStatsOf (index.js:1293-95),
//   nên tốc chạy cuối chỉ tăng theo đường cong speedOf: tocDo 60 -> 72 cho tỉ lệ
//   speedOf(72)/speedOf(60) = 1,0837/1,075 ≈ 1,0082 — KHÔNG phải 1,20. Đo tỉ lệ tốc thật
//   trước/sau uống đan: phải nằm sát 1,008 và quyết định < 1,10 (loại trừ nhãn cũ "+20% tốc độ").
// Chân 2 (loại B — nhãn giữ nguyên): talent_catalog (Bước Chân Nhẹ/Dạ Hành) + anBonus.subTxt
//   (phụ ấn Ảnh "+3% tốc độ chạy", hệ số nhân thẳng đã đo 1,0301 ở GĐ349) vẫn nguyên văn.
// Chân 3 (tĩnh): chuỗi nhãn mới có mặt trong server/index.js + tài liệu thiết kế đã đồng bộ.
const fs = require('fs');
const path = require('path');
const { makeHarness, BASE, makeOk, meOf, flyTo, waitStableMons, sleep, waitFor, median, myChar } = require('../gd349/lib349.cjs');
const DIR = path.join(__dirname, 'run');
fs.mkdirSync(DIR, { recursive: true });
const PORT = 3675;
const H = makeHarness(PORT, {}, DIR);
const R = makeOk();
const ROOT = path.join(__dirname, '..', '..');

async function runSpeed(c, dirX, durMs) {
  const t0 = Date.now();
  const S = [];
  c.socket.emit('client_input', { vx: dirX, vy: 0 });
  while (Date.now() - t0 < durMs + 300) { const me = meOf(c); if (me) S.push({ at: Date.now() - t0, x: me.x }); await sleep(55); }
  c.socket.emit('client_input', { vx: 0, vy: 0 });
  const w = S.filter((s) => s.at >= 1200 && s.at <= durMs - 800);
  if (w.length < 5) return 0;
  return Math.abs(w[w.length - 1].x - w[0].x) / ((w[w.length - 1].at - w[0].at) / 1000);
}

(async () => {
  const chars = {};
  chars['p350pill01'] = BASE('p350pill01', 'P350DanToc', { mapId: 'huyet_sac_rung', x: 700, y: 3000, inventory: { dan_than_toc: 1 } });
  chars['p350seal01'] = BASE('p350seal01', 'P350AnAnh', { anState: { vienman: true, luyenHon: true, nhapDao: true, subClass: 'satthu' }, mapId: 'huyet_sac_rung', x: 700, y: 3400 });
  H.writeChars(chars);
  await H.startServer();
  const S1 = H.connect('p350pill01');
  const S2 = H.connect('p350seal01');
  await waitFor(() => S1.welcome && S2.welcome, 20000);
  await waitStableMons(S1);

  // --- Chân 2a: talent_catalog — nhãn loại B giữ nguyên ---
  const catP = new Promise((res) => { S1.socket.once('talent_catalog', res); });
  S1.socket.emit('talent_catalog_get', {});
  const cat = await Promise.race([catP, sleep(6000).then(() => null)]);
  const flat = JSON.stringify(cat || {});
  R.ok('catalog: Bước Chân Nhẹ vẫn "+5%" (loại B)', flat.includes('Tốc độ chạy +5%'));
  // Dạ Hành là thiên phú bậc ĐEN (ẩn) — catalog lọc theo bậc ach_an_secret của phiên (GĐ342)
  // nên phiên thường không thấy; kiểm nhãn loại B của nó ở nguồn server + cơ chế ×1,12 nhân thẳng (index.js:17597).
  const srvSrc = fs.readFileSync(path.join(ROOT, 'server/index.js'), 'utf8');
  R.ok('nguồn: Dạ Hành vẫn "tốc chạy +12%" (loại B, bậc ẩn không có trong catalog phiên thường)', srvSrc.includes("id: 'da_hanh'") && srvSrc.includes('tốc chạy +12%'));

  // --- Chân 2b: phụ ấn Ảnh — nhãn loại B giữ nguyên qua payload ---
  const ab = (myChar(S2).anBonus) || {};
  R.ok('payload anBonus.subTxt phụ ấn Ảnh = "+3% tốc độ chạy" (loại B, giữ nguyên)', ab.subTxt === '+3% tốc độ chạy', JSON.stringify(ab));

  // --- Chân 1: Đan Thần Tốc — đo tốc trước/sau ---
  if (!S1.flying) { S1.socket.emit('fly_toggle', {}); await sleep(400); }
  const base = [];
  for (let i = 0; i < 4; i++) { await flyTo(S1, 700, 3000, 40); const v = await runSpeed(S1, 1, 12000); if (v > 200) base.push(v); R.note(`nen ${i + 1}: ${v.toFixed(1)} px/s`); }
  S1.socket.emit('use_item', { itemId: 'dan_than_toc' });
  const buffOn = await waitFor(() => { const b = myChar(S1).buffs || []; return Array.isArray(b) && b.some((x) => x.key === 'spd'); }, 8000);
  R.ok('uống Thần Tốc Đan: buff spd có mặt trong payload', !!buffOn);
  const after = [];
  for (let i = 0; i < 4; i++) { await flyTo(S1, 700, 3000, 40); const v = await runSpeed(S1, 1, 12000); if (v > 200) after.push(v); R.note(`dan ${i + 1}: ${v.toFixed(1)} px/s`); }
  const mb = median(base), ma = median(after), ratio = mb > 0 ? ma / mb : 0;
  R.note(`toc nen median=${mb.toFixed(1)} · sau dan median=${ma.toFixed(1)} · ti le=${ratio.toFixed(4)} (ky vong ly thuyet loai A ≈ 1,0082; loai B neu nhan cu dung se la 1,20)`);
  R.ok('tỉ lệ tốc sau đan KHÔNG phải 1,20 (quyết định < 1,10) → +20% là của CHỈ SỐ, nhãn mới đúng', ratio > 0.97 && ratio < 1.10, 'ratio=' + ratio.toFixed(4));
  R.ok('tỉ lệ tốc sát lý thuyết loại A (0,99–1,03)', ratio >= 0.99 && ratio <= 1.03, 'ratio=' + ratio.toFixed(4));

  // --- Chân 3: chuỗi tĩnh ---
  const srv = fs.readFileSync(path.join(ROOT, 'server/index.js'), 'utf8');
  R.ok('server: desc Thần Tốc Đan đã ghi "(chỉ số Tốc Độ)"', srv.includes("desc: 'Dùng: +20% tốc độ (chỉ số Tốc Độ) trong 30 phút'"));
  R.ok('server: desc Phong Thần Đan đã ghi "(chỉ số Tốc Độ)"', srv.includes("desc: 'Dùng: +35% tốc độ (chỉ số Tốc Độ) trong 30 phút'"));
  R.ok('server: Cấp Hành giữ nguyên mẫu chuẩn', srv.includes("desc: '+3% tốc độ (chỉ số Tốc Độ).'"));
  R.ok('server: không còn desc đan tốc dạng cũ', !srv.includes('Tốc độ +20% trong 30 phút') && !srv.includes('Tốc độ +35% trong 30 phút'));
  const doc = fs.readFileSync(path.join(ROOT, '..', 'THIET_KE_SANG_TAO_CONG_PHAP.md'), 'utf8');
  R.ok('tài liệu: Linh Động trận đã ghi "(chỉ số Tốc Độ)"', doc.includes('**Linh Động trận**: +8% tốc độ (chỉ số Tốc Độ)'));
  R.ok('tài liệu: bảng thành phần Tốc đã ghi "(chỉ số Tốc Độ)"', doc.includes('| Tốc | +1% tốc độ (chỉ số Tốc Độ) |'));

  R.done('GĐ350');
  await H.stopServer();
  process.exit(R.fail ? 1 : 0);
})().catch(async (e) => { console.error('LOI', e); try { await H.stopServer(); } catch (_) {} process.exit(2); });
