// Probe GĐ338 — A5 (Ngọc Giản từ rương ẩn, kênh gốc 20%) + B11-kênh-rương (Đại khí vận: +20% roll phụ "cơ duyên thiên phú").
// C1 (không thiên phú) đứng tại hc_tc_farm (7155,627); C2 (dai_khi_van) đứng tại hc_tc_boss (6105,1230).
// Rương ẩn spawn khi người chơi <=260px, tự mở khi <=42px — char đứng ngay điểm nên mở tức thì; hồi rương 60s (env).
// Phân biệt 2 kênh qua dòng loot: gốc = "Ngọc Giản Trống ×1"; cơ duyên = "<món> ×1 — cơ duyên thiên phú!".
const path = require('path');
const { makeHarness, BASE, writeWorld, makeOk, sleep, waitFor } = require('./lib338.cjs');
const PORT = 3613;
const DIR = __dirname;
const H = makeHarness(PORT, { TTT_HIDDEN_RESPAWN_MS: '60000' }, DIR);
const R = makeOk();

(async () => {
  const chars = {
    p338d10001: BASE('p338d10001', ' MoRuongThuong', { mapId: 'lang_tan_thu', x: 7155, y: 627 }),
    p338d20001: BASE('p338d20001', ' MoRuongVan', { mapId: 'lang_tan_thu', x: 6105, y: 1230, talent: { id: 'dai_khi_van', tier: 'cam' } }),
  };
  writeWorld(DIR, chars, []);
  await H.startServer();
  const C1 = await H.connect('p338d10001');
  const C2 = await H.connect('p338d20001');
  const opens = { c1: [], c2: [] };
  C1.socket.on('chest_opened', (e) => opens.c1.push(e));
  C2.socket.on('chest_opened', (e) => opens.c2.push(e));
  R.note('bắt đầu chu kỳ rương (mỗi ~60s/lượt/điểm)...');
  const t0 = Date.now();
  let lastPrint = 0;
  while (Date.now() - t0 < 11 * 60000) {
    await sleep(5000);
    if (opens.c1.length + opens.c2.length !== lastPrint) { lastPrint = opens.c1.length + opens.c2.length; R.note(`tiến độ: C1 mở=${opens.c1.length} C2 mở=${opens.c2.length} (t=${Math.round((Date.now() - t0) / 1000)}s)`); }
    if (opens.c1.length >= 10 && opens.c2.length >= 8) break;
  }
  const lines1 = opens.c1.flatMap((e) => e.loot || []);
  const lines2 = opens.c2.flatMap((e) => e.loot || []);
  const jadeBase1 = lines1.filter((l) => l === 'Ngọc Giản Trống ×1').length;
  const jadeBase2 = lines2.filter((l) => l === 'Ngọc Giản Trống ×1').length;
  const luck2 = lines2.filter((l) => l.includes('cơ duyên thiên phú')).length;
  const luckJade2 = lines2.filter((l) => l.includes('cơ duyên thiên phú') && l.includes('Ngọc Giản')).length;
  const inv1 = (C1.sync?.inventory || {}).ngoc_gian_trong || 0;
  const inv2 = (C2.sync?.inventory || {}).ngoc_gian_trong || 0;
  R.note(`A5: C1 mở ${opens.c1.length} rương — Ngọc Giản kênh gốc: ${jadeBase1} lần (túi: ${inv1})`);
  R.note(`B11-rương: C2 mở ${opens.c2.length} rương — cơ duyên nổ ${luck2} lần (trong đó Ngọc Giản ${luckJade2}); Ngọc Giản kênh gốc của C2: ${jadeBase2} (túi C2: ${inv2})`);
  R.ok('A5 rương ẩn rơi Ngọc Giản Trống (kênh 20%) — thấy rơi thật >= 1 lần', jadeBase1 >= 1 && inv1 >= 1, `opens=${opens.c1.length} jade=${jadeBase1}`);
  R.ok('B11 kênh rương: Đại khí vận nổ "cơ duyên thiên phú" >= 1 lần', luck2 >= 1, `opens=${opens.c2.length} luck=${luck2}`);

  R.done('p338d');
  await H.stopServer();
  process.exit(R.fail ? 1 : 0);
})().catch(async (e) => { console.error('LOI', e); try { await H.stopServer(); } catch (_) {} process.exit(2); });
