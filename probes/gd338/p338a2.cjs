// Probe GĐ338-A1b (gọn) — kháng chậm 50% của trận Linh Động.
// Giao thức: AM hạ cánh 130px cạnh thuy_trieu_tinh (trong tầm nó đuổi/đánh), chờ 250ms rồi bay thẳng về
// điểm cắm 300px trong vùng cờ, đứng yên cho tinh đuổi tới cắn tại chỗ -> notice cho % đã giảm.
// Ngoài vùng: đứng cạnh tinh ở nhà của nó -> notice 40%.
// Điều kiện chạy: boot nào tinh spawn <=800px từ cờ mới đo; không thì bỏ boot.
const path = require('path');
const { makeHarness, BASE, SECT, ART, writeWorld, makeOk, meOf, monsOf, flyTo, land, sleep, waitFor } = require('./lib338.cjs');
const PORT = 3621;
const DIR = __dirname;
const H = makeHarness(PORT, { TTT_WAR_DELAY_MS: '20000', TTT_WAR_LEN_MS: '480000' }, DIR);
const R = makeOk();
const FLAG = { x: 4248, y: 6223 };
const mySect = (c) => c.sect && c.sect.mySect;
async function refresh(c) { c.socket.emit('sect_get'); await sleep(400); }

(async () => {
  const chars = {
    p338a10001: BASE('p338a10001', ' ChuLinhDong', { mapId: 'bang_phong_coc', x: FLAG.x, y: FLAG.y }),
    p338a10002: BASE('p338a10002', ' DeLinhDong', { mapId: 'bang_phong_coc', x: FLAG.x, y: FLAG.y }),
    p338a20001: BASE('p338a20001', ' ChuTuHanh', { mapId: 'bang_phong_coc', x: FLAG.x + 30, y: FLAG.y + 30 }),
  };
  const sects = [
    SECT('s338a1', 'Linh Động Tông', [{ token: 'p338a10001', name: ' ChuLinhDong', role: 'chu', contrib: 999 }, { token: 'p338a10002', name: ' DeLinhDong', role: 'detu', contrib: 500 }], {
      warehouse: [{ itemId: 'da_quy', qty: 20 }],
      arts: [
        ART('a1ck1', 'Phong Ảnh Kích 1', { tam: 4, hieu: 3, sat: 1 }, 'f_cd', 'chienky', 'p338a10001'),
        ART('a1ck2', 'Phong Ảnh Kích 2', { tam: 4, hieu: 3, sat: 1 }, 'f_cd', 'chienky', 'p338a10001'),
        ART('a1ck3', 'Phong Ảnh Kích 3', { tam: 4, hieu: 3, sat: 1 }, 'f_cd', 'chienky', 'p338a10001'),
        ART('a1ck4', 'Phong Ảnh Kích 4', { tam: 4, hieu: 3, sat: 1 }, 'f_cd', 'chienky', 'p338a10001'),
        ART('a1tp1', 'Tật Phong Quyết 1', { toc: 4 }, 'f_cong', 'tamphap', 'p338a10001'),
        ART('a1tp2', 'Tật Phong Quyết 2', { toc: 4 }, 'f_cong', 'tamphap', 'p338a10001'),
        ART('a1tp3', 'Tật Phong Quyết 3', { toc: 4 }, 'f_cong', 'tamphap', 'p338a10001'),
        ART('a1tp4', 'Tật Phong Quyết 4', { toc: 4 }, 'f_cong', 'tamphap', 'p338a10001'),
      ],
    }),
    SECT('s338a2', 'Tu Hành Tông', [{ token: 'p338a20001', name: ' ChuTuHanh', role: 'chu', contrib: 999 }], {
      territories: ['lm_bang_phong'], warehouse: [{ itemId: 'da_quy', qty: 20 }],
      arts: [1, 2, 3, 4, 5].map((i) => ART('a2tp' + i, 'Thiền Định Kinh ' + i, { thien: 5 }, 'f_cong', 'tamphap', 'p338a20001')),
    }),
  ];
  writeWorld(DIR, chars, sects);
  await H.startServer();
  const AC = await H.connect('p338a10001');
  const AM = await H.connect('p338a10002');
  const DC = await H.connect('p338a20001');
  const findTinh = () => { const ts = monsOf(AM).filter((m) => m.kind === 'thuy_trieu_tinh'); if (!ts.length) return null; ts.sort((a, b) => Math.hypot(a.x - FLAG.x, a.y - FLAG.y) - Math.hypot(b.x - FLAG.x, b.y - FLAG.y)); return ts[0]; };
  // chờ tick quái ổn định
  await sleep(4000);
  let tinh = findTinh();
  const dSpawn = tinh ? Math.hypot(tinh.x - FLAG.x, tinh.y - FLAG.y) : 99999;
  R.note(`tinh gần cờ nhất: ${tinh ? `(${Math.round(tinh.x)},${Math.round(tinh.y)}) cách cờ ${Math.round(dSpawn)}px` : 'không thấy'}`);
  if (!tinh || dSpawn > 800) { R.ok('A1b điều kiện spawn tinh gần cờ (<=800px)', false, `d=${Math.round(dSpawn)}`); R.done('p338a2'); await H.stopServer(); process.exit(1); }

  AC.socket.emit('sect_war_declare', { pointId: 'lm_bang_phong' });
  await sleep(900);
  AC.socket.emit('sect_war_formation_set', {}); await sleep(700); await refresh(AC);
  R.ok('trận linhdong đã bày', mySect(AC)?.war?.myForm?.axis === 'linhdong', JSON.stringify(mySect(AC)?.war?.myForm));
  const act = await waitFor(() => { AC.socket.emit('sect_get'); return mySect(AC)?.war?.state === 'active' ? true : null; }, 40000);
  R.ok('chiến mở', !!act, '');

  const camp = { x: FLAG.x + (tinh.x - FLAG.x) / dSpawn * 300, y: FLAG.y + (tinh.y - FLAG.y) / dSpawn * 300 };
  AM.notices = [];
  let slowIn = null;
  const t0 = Date.now();
  while (Date.now() - t0 < 240000 && !slowIn) {
    const mm = meOf(AM); const t2 = findTinh();
    if (!t2 || !mm) { await sleep(400); continue; }
    const dFlag = Math.hypot(mm.x - FLAG.x, mm.y - FLAG.y);
    const hit = AM.notices.find((t) => t.includes('làm chậm'));
    if (hit) {
      if (dFlag <= 340) { slowIn = hit; R.note(`IN: nhận chậm tại ${Math.round(dFlag)}px từ cờ`); break; }
      R.note(`nhiễm ở ${Math.round(dFlag)}px — chờ hết chậm`); AM.notices = []; await sleep(5000); continue;
    }
    const dTinh = Math.hypot(t2.x - mm.x, t2.y - mm.y);
    const dCamp = Math.hypot(camp.x - mm.x, camp.y - mm.y);
    if (dCamp > 60) { await flyTo(AM, camp.x, camp.y, 30, 8000); await land(AM); }
    else if (dTinh > 500) { // ra câu: hạ cánh 130px cạnh tinh, 250ms rồi rút về cắm
      await flyTo(AM, t2.x, t2.y, 130, 8000); await land(AM); await sleep(250);
      await flyTo(AM, camp.x, camp.y, 30, 8000); await land(AM);
    }
    await sleep(500);
  }
  R.note(`A1b in-zone notice: ${slowIn || '(chưa bắt được)'}`);
  R.ok('A1b kháng chậm 50%: trong vùng 40% -> 20%', !!slowIn && /làm chậm 20%/.test(slowIn), slowIn || 'không có');

  let slowOut = null;
  if (slowIn) {
    // thoát ra xa tinh, chờ hết chậm, rồi đứng cạnh tinh tại nhà nó
    const t2 = findTinh(); const mm = meOf(AM);
    if (t2 && mm) { const dd = Math.hypot(mm.x - t2.x, mm.y - t2.y) || 1; await flyTo(AM, mm.x + (mm.x - t2.x) / dd * 800, mm.y + (mm.y - t2.y) / dd * 800, 60, 6000); await land(AM); }
    await sleep(6000); AM.notices = [];
    const t1 = Date.now();
    while (Date.now() - t1 < 90000 && !slowOut) {
      const hit = AM.notices.find((t) => t.includes('làm chậm'));
      if (hit) { slowOut = hit; break; }
      const t3 = findTinh(); const m3 = meOf(AM);
      if (!t3 || !m3) { await sleep(400); continue; }
      const dF3 = Math.hypot(m3.x - FLAG.x, m3.y - FLAG.y);
      const dT3 = Math.hypot(t3.x - m3.x, t3.y - m3.y);
      if (dF3 < 420 || dT3 > 90) { await flyTo(AM, t3.x, t3.y, 45, 8000); await land(AM); }
      await sleep(500);
    }
    R.note(`A1b out-zone notice: ${slowOut || '(chưa bắt được)'}`);
  }
  R.ok('A1b đối chứng ngoài vùng: làm chậm 40%', !!slowOut && /làm chậm 40%/.test(slowOut), slowOut || 'không có');
  R.done('p338a2');
  await H.stopServer();
  process.exit(R.fail ? 1 : 0);
})().catch(async (e) => { console.error('LOI', e); try { await H.stopServer(); } catch (_) {} process.exit(2); });
