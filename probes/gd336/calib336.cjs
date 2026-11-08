// GĐ336 — HIỆU CHUẨN khung PI riêng cho CHIẾN KỸ: liệt kê toàn bộ cách ghép hợp lệ theo từng cấp,
// tính PI bằng đúng công thức sectArtPI (bản chienky) trong server/index.js, xuất min / phân vị /
// mẫu ghép điển hình / max + k theo khung CŨ để thấy vấn đề kẹp trần 1,40.
const GRADES = [
  { id: 'pham', budget: 10 },
  { id: 'linh', budget: 16 },
  { id: 'huyen', budget: 24 },
  { id: 'dia', budget: 34 },
  { id: 'thien', budget: 46 },
];
const OLD_BAND = { pham: 100, linh: 160, huyen: 240, dia: 340, thien: 460 };
const FLAW_BONUS = 4;
const COMPS = [ // id, trọng số ngân sách w, trần bậc, PI mỗi bậc
  { id: 'sat', w: 3, max: 5, pi: 45 },
  { id: 'tam', w: 2, max: 4, pi: 18 },
  { id: 'dien', w: 5, max: 1, pi: 55 },
  { id: 'hieu', w: 3, max: 3, pi: 24 },
];
const FLAWS = ['f_yeu', 'f_cd', 'f_mp'];
function rawCdMana(c, flaw) {
  const sat = c.sat || 0, tam = c.tam || 0, dien = c.dien || 0, hieu = c.hieu || 0;
  let mana = 20 + 10 * sat + 5 * tam + 12 * dien + 6 * hieu;
  if (flaw === 'f_mp') mana = Math.round(mana * 1.5);
  let cdMs = 5000 + 800 * sat + 2000 * dien + 500 * hieu;
  if (flaw === 'f_cd') cdMs = Math.round(cdMs * 1.5);
  return { mana, cdMs };
}
function piCK(c, flaw) { // sao y sectArtPI nhánh chienky (server/index.js)
  let pi = 0;
  for (const cd of COMPS) pi += cd.pi * (c[cd.id] || 0);
  if (flaw === 'f_yeu') pi -= 45;
  if (flaw === 'f_cd') pi -= 16;
  if (flaw === 'f_mp') pi -= 12;
  const rm = rawCdMana(c, flaw);
  pi += Math.min(12, Math.max(0, (rm.cdMs - 5000) / 500));
  pi += Math.min(8, Math.max(0, Math.floor((rm.mana - 20) / 10)));
  return Math.max(5, Math.round(pi));
}
const kOf = (pi, band) => (pi >= band * 0.9 && pi <= band * 1.1) ? 1 : Math.round(Math.max(0.65, Math.min(1.4, band / pi)) * 100) / 100;
const weight = (c) => COMPS.reduce((s, cd) => s + cd.w * (c[cd.id] || 0), 0);
function greedy(B, prio) { // tiêu ngân sách theo thứ tự ưu tiên cho tới khi không nhét thêm được bậc nào
  const c = {};
  let left = B;
  let moved = true;
  while (moved) {
    moved = false;
    for (const id of prio) {
      const cd = COMPS.find((x) => x.id === id);
      if ((c[id] || 0) < cd.max && cd.w <= left) { c[id] = (c[id] || 0) + 1; left -= cd.w; moved = true; break; }
    }
  }
  return c;
}
function balanced(B) { // vòng tròn đều 4 thành phần
  const c = {};
  let left = B;
  let moved = true;
  const order = ['sat', 'tam', 'dien', 'hieu'];
  while (moved) {
    moved = false;
    for (const id of order) {
      const cd = COMPS.find((x) => x.id === id);
      if ((c[id] || 0) < cd.max && cd.w <= left) { c[id] = (c[id] || 0) + 1; left -= cd.w; moved = true; }
    }
  }
  return c;
}
function bestFlaw(c) { let bf = null, bp = -1; for (const f of FLAWS) { const p = piCK(c, f); if (p > bp) { bp = p; bf = f; } } return { flaw: bf, pi: bp }; }
const pct = (arr, q) => arr[Math.min(arr.length - 1, Math.floor(q * arr.length))];

for (const g of GRADES) {
  const B = g.budget + FLAW_BONUS;
  const all = []; // {c, flaw, pi, w}
  for (let sat = 0; sat <= 5; sat++) for (let tam = 0; tam <= 4; tam++) for (let dien = 0; dien <= 1; dien++) for (let hieu = 0; hieu <= 3; hieu++) {
    const c = {}; if (sat) c.sat = sat; if (tam) c.tam = tam; if (dien) c.dien = dien; if (hieu) c.hieu = hieu;
    const w = weight(c);
    if (!sat && !tam && !dien && !hieu) continue;
    if (w > B) continue;
    for (const f of FLAWS) all.push({ c, flaw: f, pi: piCK(c, f), w });
  }
  const pis = all.map((x) => x.pi).sort((a, b) => a - b);
  // nhóm "tiêu gần hết ngân sách" (w >= B-4): mặt bằng của người ghép nghiêm túc
  const full = all.filter((x) => x.w >= B - 4);
  const fullPis = full.map((x) => x.pi).sort((a, b) => a - b);
  const arch = {
    'don-sat (sat>dien>hieu>tam)': greedy(B, ['sat', 'dien', 'hieu', 'tam']),
    'can-bang (vong tron)': balanced(B),
    'tam+vung (dien>tam>sat>hieu)': greedy(B, ['dien', 'tam', 'sat', 'hieu']),
    'don-hieu-sat (sat>hieu>dien>tam)': greedy(B, ['sat', 'hieu', 'dien', 'tam']),
  };
  console.log(`\n===== ${g.id.toUpperCase()} — ngân sách ${g.budget}+${FLAW_BONUS}=${B} | khung CŨ ${OLD_BAND[g.id]} =====`);
  console.log(`tong so cach ghep hop le (x3 khuyet): ${all.length} | PI min ${pis[0]} · p10 ${pct(pis, 0.1)} · p25 ${pct(pis, 0.25)} · trung vi ${pct(pis, 0.5)} · p75 ${pct(pis, 0.75)} · p90 ${pct(pis, 0.9)} · max ${pis[pis.length - 1]}`);
  console.log(`nhom tieu >= ${B - 4} trong so (${full.length} cach): PI min ${fullPis[0]} · p25 ${pct(fullPis, 0.25)} · trung vi ${pct(fullPis, 0.5)} · p75 ${pct(fullPis, 0.75)} · max ${fullPis[fullPis.length - 1]}`);
  for (const [name, c] of Object.entries(arch)) {
    const bf = bestFlaw(c);
    console.log(`  mau ${name}: comps=${JSON.stringify(c)} w=${weight(c)} khuyet tot nhat=${bf.flaw} PI=${bf.pi} -> k khung cu = ${kOf(bf.pi, OLD_BAND[g.id])}`);
  }
  const maxRow = all.reduce((a, b) => (b.pi > a.pi ? b : a));
  console.log(`  PI MAX tuyet doi: ${maxRow.pi} comps=${JSON.stringify(maxRow.c)} khuyet=${maxRow.flaw} w=${maxRow.w} -> k khung cu = ${kOf(maxRow.pi, OLD_BAND[g.id])}`);
  const inBandFull = full.filter((x) => kOf(x.pi, OLD_BAND[g.id]) === 1).length;
  const clampFull = full.filter((x) => OLD_BAND[g.id] / x.pi > 1.4).length;
  console.log(`  nhom tieu gan het: dung khung cu ${inBandFull}/${full.length} (${(100 * inBandFull / full.length).toFixed(0)}%) · bi kep tran nang 1,40: ${clampFull}/${full.length} (${(100 * clampFull / full.length).toFixed(0)}%)`);
}
