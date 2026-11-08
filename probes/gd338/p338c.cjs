// Probe GĐ338 — A4 (Ngọc Giản từ việc 'special' trên Bảng) + C4 (trần kho tông theo cấp).
// A4: tông có sẵn activeQuest {type:'special', monsterKind:'khoiloi', target:1}; thành viên hạ Thạch Khôi Lỗi
//   (loài boss-class, minChestGrade B) ở Thạch Lâm -> completeActiveQuest -> kho tông +1 ngoc_gian_trong.
// C4: tông cấp 1 (trần 60 ô) nạp sẵn 59 ô rác -> nạp món mới OK (=60), nạp món khác nữa bị chặn đúng câu lỗi;
//   tông cấp 3 (uy 700, trần 120 ô) nạp sẵn 119 ô -> OK (=120) -> bị chặn.
const path = require('path');
const { makeHarness, BASE, SECT, writeWorld, makeOk, meOf, monsOf, flyTo, land, sleep, waitFor } = require('./lib338.cjs');
const PORT = 3612;
const DIR = __dirname;
const H = makeHarness(PORT, {}, DIR);
const R = makeOk();
const mySect = (c) => c.sect && c.sect.mySect;
async function refresh(c) { c.socket.emit('sect_get'); await sleep(500); }
const junk = (n) => Array.from({ length: n }, (_, i) => ({ itemId: 'rac338_' + String(i).padStart(3, '0'), qty: 1 }));

(async () => {
  const chars = {
    p338c10001: BASE('p338c10001', ' SatKhoiLoi', { mapId: 'lang_tan_thu', x: 6105, y: 1230 }),
    p338c20001: BASE('p338c20001', ' GiuKhoMot', { mapId: 'lang_tan_thu', x: 1565, y: 1252, inventory: { nanh_soi: 3, canh_doi: 3 } }),
    p338c30001: BASE('p338c30001', ' GiuKhoBa', { mapId: 'lang_tan_thu', x: 1565, y: 1252, inventory: { nanh_soi: 3, canh_doi: 3 } }),
  };
  const sects = [
    SECT('s338c1', 'Truy Lùng Tông', [{ token: 'p338c10001', name: ' SatKhoiLoi', role: 'chu', contrib: 999 }], {
      warehouse: [], activeQuests: [{ type: 'special', monsterKind: 'khoiloi', target: 1, progress: 0, title: 'Truy lùng Thạch Khôi Lỗi', giver: 'Bảng Ủy Thác', rewardFund: 500, rewardUy: 10, expiresDay: 999999 }],
    }),
    SECT('s338c2', 'Kho Cấp Một', [{ token: 'p338c20001', name: ' GiuKhoMot', role: 'detu', contrib: 500 }], { warehouse: junk(59) }),
    SECT('s338c3', 'Kho Cấp Ba', [{ token: 'p338c30001', name: ' GiuKhoBa', role: 'detu', contrib: 500 }], { uy: 700, level: 3, warehouse: junk(119) }),
  ];
  writeWorld(DIR, chars, sects);
  await H.startServer();
  const K = await H.connect('p338c10001');
  const D1 = await H.connect('p338c20001');
  const D2 = await H.connect('p338c30001');
  await refresh(K); await refresh(D1); await refresh(D2);
  const jadeOf = (c) => ((mySect(c)?.warehouse || []).find((w) => w.itemId === 'ngoc_gian_trong') || {}).qty || 0;
  R.ok('C0 kho ban đầu: c1=0 ngọc, c2=59 ô, c3=119 ô', jadeOf(K) === 0 && (mySect(D1)?.warehouse || []).length === 59 && (mySect(D2)?.warehouse || []).length === 119, `jade=${jadeOf(K)} len2=${(mySect(D1)?.warehouse || []).length} len3=${(mySect(D2)?.warehouse || []).length} cap3=${mySect(D2)?.warehouseCap}`);

  // ===== C4 cấp 1 =====
  D1.errors = []; D1.socket.emit('sect_store_put', { itemId: 'nanh_soi', qty: 1 }); await sleep(700); await refresh(D1);
  const lenAfter1 = (mySect(D1)?.warehouse || []).length;
  D1.socket.emit('sect_store_put', { itemId: 'canh_doi', qty: 1 }); await sleep(700);
  const blocked1 = D1.errors.some((e) => e.includes('Kho chung đã đầy ô') && e.includes('60'));
  R.note(`C4-cấp1: sau nạp 1: ${lenAfter1} ô; nạp tiếp bị chặn=${blocked1} | errors=${JSON.stringify(D1.errors)}`);
  R.ok('C4 trần kho cấp 1 = 60 ô, chặn đúng số', lenAfter1 === 60 && blocked1, `len=${lenAfter1} blocked=${blocked1}`);

  // ===== C4 cấp 3 =====
  D2.errors = []; D2.socket.emit('sect_store_put', { itemId: 'nanh_soi', qty: 1 }); await sleep(700); await refresh(D2);
  const lenAfter3 = (mySect(D2)?.warehouse || []).length;
  D2.socket.emit('sect_store_put', { itemId: 'canh_doi', qty: 1 }); await sleep(700);
  const blocked3 = D2.errors.some((e) => e.includes('Kho chung đã đầy ô') && e.includes('120'));
  R.note(`C4-cấp3: sau nạp 1: ${lenAfter3} ô; nạp tiếp bị chặn=${blocked3} | errors=${JSON.stringify(D2.errors)}`);
  R.ok('C4 trần kho cấp 3 = 120 ô, chặn đúng số', lenAfter3 === 120 && blocked3, `len=${lenAfter3} blocked=${blocked3}`);

  // ===== A4: hạ khoiloi =====
  // chờ tick ổn định rồi tìm khoiloi
  let boss = null;
  const t0 = Date.now();
  while (Date.now() - t0 < 30000 && !boss) { boss = monsOf(K).find((m) => m.kind === 'khoiloi') || null; if (!boss) await sleep(600); }
  R.ok('A4-0 thấy Thạch Khôi Lỗi', !!boss, boss ? `(${Math.round(boss.x)},${Math.round(boss.y)}) hp=${boss.hp}` : 'không có');
  if (boss) {
    let killed = false;
    const t1 = Date.now();
    while (Date.now() - t1 < 60000 && !killed) {
      const b = monsOf(K).find((m) => m.kind === 'khoiloi');
      if (!b) { killed = true; break; }
      await flyTo(K, b.x, b.y, 30);
      K.socket.emit('player_attack');
      await sleep(700);
    }
    await land(K);
    await sleep(800); await refresh(K);
    const j = jadeOf(K);
    const questGone = !(mySect(K)?.activeQuests || []).some((q) => q.type === 'special');
    R.note(`A4: killed=${killed} ngọc trong kho=${j} quest còn=${!questGone} fund=${mySect(K)?.fund}`);
    R.ok('A4 hoàn thành việc special -> kho tông +1 Ngọc Giản Trống', killed && j === 1, `jade=${j}`);
  } else R.ok('A4 hoàn thành việc special', false, 'không có trùm');

  R.done('p338c');
  await H.stopServer();
  process.exit(R.fail ? 1 : 0);
})().catch(async (e) => { console.error('LOI', e); try { await H.stopServer(); } catch (_) {} process.exit(2); });
