// GĐ336b — kiểm chứng KHUNG CK ỨNG VIÊN {pham 143, linh 250, huyen 350, dia 400, thien 410}
// + in PI/k (cũ -> mới) của đúng các bản ghép sẽ dùng trong probe p336.
const GRADES = [
  { id: 'pham', budget: 10 }, { id: 'linh', budget: 16 }, { id: 'huyen', budget: 24 }, { id: 'dia', budget: 34 }, { id: 'thien', budget: 46 },
];
const OLD_BAND = { pham: 100, linh: 160, huyen: 240, dia: 340, thien: 460 };
const NEW_BAND = { pham: 143, linh: 250, huyen: 350, dia: 400, thien: 410 };
const FLAW_BONUS = 4;
const COMPS = [
  { id: 'sat', w: 3, max: 5, pi: 45 }, { id: 'tam', w: 2, max: 4, pi: 18 }, { id: 'dien', w: 5, max: 1, pi: 55 }, { id: 'hieu', w: 3, max: 3, pi: 24 },
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
function piCK(c, flaw) {
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
function greedy(B, prio) { const c = {}; let left = B, moved = true; while (moved) { moved = false; for (const id of prio) { const cd = COMPS.find((x) => x.id === id); if ((c[id] || 0) < cd.max && cd.w <= left) { c[id] = (c[id] || 0) + 1; left -= cd.w; moved = true; break; } } } return c; }
function balanced(B) { const c = {}; let left = B, moved = true; const order = ['sat', 'tam', 'dien', 'hieu']; while (moved) { moved = false; for (const id of order) { const cd = COMPS.find((x) => x.id === id); if ((c[id] || 0) < cd.max && cd.w <= left) { c[id] = (c[id] || 0) + 1; left -= cd.w; moved = true; } } } return c; }
function bestFlaw(c) { let bf = null, bp = -1; for (const f of FLAWS) { const p = piCK(c, f); if (p > bp) { bp = p; bf = f; } } return { flaw: bf, pi: bp }; }

for (const g of GRADES) {
  const B = g.budget + FLAW_BONUS, band = NEW_BAND[g.id];
  const all = [];
  for (let sat = 0; sat <= 5; sat++) for (let tam = 0; tam <= 4; tam++) for (let dien = 0; dien <= 1; dien++) for (let hieu = 0; hieu <= 3; hieu++) {
    const c = {}; if (sat) c.sat = sat; if (tam) c.tam = tam; if (dien) c.dien = dien; if (hieu) c.hieu = hieu;
    if (!sat && !tam && !dien && !hieu) continue;
    if (weight(c) > B) continue;
    for (const f of FLAWS) all.push({ c, flaw: f, pi: piCK(c, f), w: weight(c) });
  }
  const inBand = all.filter((x) => kOf(x.pi, band) === 1).length;
  const clampUp = all.filter((x) => band / x.pi > 1.4).length;
  const clampDn = all.filter((x) => band / x.pi < 0.65).length;
  const arch = { 'don-sat': greedy(B, ['sat', 'dien', 'hieu', 'tam']), 'can-bang': balanced(B), 'tam+vung': greedy(B, ['dien', 'tam', 'sat', 'hieu']), 'sat+hieu': greedy(B, ['sat', 'hieu', 'dien', 'tam']) };
  console.log(`\n== ${g.id} khung CK moi ${band} (cu ${OLD_BAND[g.id]}): dung khung ${inBand}/${all.length} (${(100 * inBand / all.length).toFixed(0)}%) · kep 1,40: ${clampUp} (${(100 * clampUp / all.length).toFixed(0)}%) · kep 0,65: ${clampDn} (${(100 * clampDn / all.length).toFixed(0)}%)`);
  for (const [n, c] of Object.entries(arch)) { const bf = bestFlaw(c); console.log(`   ${n}: PI ${bf.pi} -> k cu ${kOf(bf.pi, OLD_BAND[g.id])} -> k moi ${kOf(bf.pi, band)}`); }
}
console.log('\n== CAC BAN GHEP PROBE p336 ==');
const probeBuilds = [
  ['A1 thien {sat5,dien1,tam2} f_cd (ca a)', 'thien', { sat: 5, dien: 1, tam: 2 }, 'f_cd'],
  ['A2 thien {sat5,dien1,hieu3} f_mp (ca d)', 'thien', { sat: 5, dien: 1, hieu: 3 }, 'f_mp'],
  ['A3 pham {sat4,tam1} f_mp (ca c cuc manh)', 'pham', { sat: 4, tam: 1 }, 'f_mp'],
  ['A4 pham {tam4} f_yeu (ca b yeu)', 'pham', { tam: 4 }, 'f_yeu'],
  ['B1 thien {sat5,dien1,tam2} f_cd (hoi to)', 'thien', { sat: 5, dien: 1, tam: 2 }, 'f_cd'],
  ['B3 linh {sat5,dien1} f_mp (hoi to)', 'linh', { sat: 5, dien: 1 }, 'f_mp'],
  ['X linh {sat3,tam2,hieu1} f_mp (yeu vua)', 'linh', { sat: 3, tam: 2, hieu: 1 }, 'f_mp'],
];
for (const [name, grade, c, f] of probeBuilds) {
  const pi = piCK(c, f);
  console.log(`${name}: PI=${pi} k_cu=${kOf(pi, OLD_BAND[grade])} k_moi=${kOf(pi, NEW_BAND[grade])}`);
}
