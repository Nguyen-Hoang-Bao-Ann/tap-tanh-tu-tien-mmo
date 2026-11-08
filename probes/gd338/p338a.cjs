// Probe GĐ338-A (phiên 1) — TRẬN LINH ĐỘNG (A1) + TRẬN TU HÀNH (A2) tại bang_phong_coc (lm_bang_phong).
// A1a: tốc dịch chuyển trong vùng trận lúc ACTIVE vs lúc PREP (cùng nhân vật, cùng đường chạy) — kỳ vọng theo code:
//   effStats tocDo x1.08 -> speedOf bão hòa: 279.5 -> 280.4 px/s (ti le ~1.0034 o tocDo 60). Do ca trong/ngoai vung.
// A1b: kháng chậm — thuy_trieu_tinh slowOnHit 40%: trong vùng trận nhận "làm chậm 20%", ngoài vùng 40% (notice tất định).
// A2: def member (trận tuhanh) đứng trong vùng lúc ACTIVE: hp +0.5% maxHp/s (maxHp 5100 -> +25.5/s); PREP: hp không tăng.
const path = require('path');
const { makeHarness, BASE, SECT, ART, writeWorld, makeOk, meOf, monsOf, flyTo, land, runLine, sleep, waitFor, median } = require('./lib338.cjs');
const PORT = 3610;
const DIR = __dirname;
const H = makeHarness(PORT, { TTT_WAR_DELAY_MS: '75000', TTT_WAR_LEN_MS: '480000' }, DIR);
const R = makeOk();
const FLAG = { x: 4248, y: 6223 };
const inZone = (p) => Math.hypot(p.x - FLAG.x, p.y - FLAG.y) <= 340;
const mySect = (c) => c.sect && c.sect.mySect;
async function refresh(c) { c.socket.emit('sect_get'); await sleep(500); }

(async () => {
  const chars = {
    p338a10001: BASE('p338a10001', ' ChuLinhDong', { mapId: 'bang_phong_coc', x: FLAG.x, y: FLAG.y }),
    p338a10002: BASE('p338a10002', ' DeLinhDong', { mapId: 'bang_phong_coc', x: FLAG.x, y: FLAG.y }),
    p338a20001: BASE('p338a20001', ' ChuTuHanh', { mapId: 'bang_phong_coc', x: FLAG.x + 30, y: FLAG.y + 30 }),
    p338a20002: BASE('p338a20002', ' DeTuHanh', { mapId: 'bang_phong_coc', x: FLAG.x + 30, y: FLAG.y + 30, hp: 2000 }),
  };
  const sects = [
    SECT('s338a1', 'Linh Động Tông', [{ token: 'p338a10001', name: ' ChuLinhDong', role: 'chu', contrib: 999 }, { token: 'p338a10002', name: ' DeLinhDong', role: 'detu', contrib: 500 }], {
      warehouse: [{ itemId: 'da_quy', qty: 20 }],
      arts: [
        ART('a1ck1', 'Phong Ảnh Kích 1', { tam: 4, hieu: 3, sat: 1 }, 'f_cd', 'chienky', 'p338a10001'),
        ART('a1ck2', 'Phong Ảnh Kích 2', { tam: 4, hieu: 3, sat: 1 }, 'f_cd', 'chienky', 'p338a10001'),
        ART('a1ck3', 'Phong Ảnh Kích 3', { tam: 4, hieu: 3, sat: 1 }, 'f_cd', 'chienky', 'p338a10001'),
        ART('a1tp1', 'Tật Phong Quyết 1', { toc: 4 }, 'f_cong', 'tamphap', 'p338a10001'),
        ART('a1tp2', 'Tật Phong Quyết 2', { toc: 4 }, 'f_cong', 'tamphap', 'p338a10001'),
        ART('a1ck4', 'Phong Ảnh Kích 4', { tam: 4, hieu: 3, sat: 1 }, 'f_cd', 'chienky', 'p338a10001'),
        ART('a1tp3', 'Tật Phong Quyết 3', { toc: 4 }, 'f_cong', 'tamphap', 'p338a10001'),
        ART('a1tp4', 'Tật Phong Quyết 4', { toc: 4 }, 'f_cong', 'tamphap', 'p338a10001'),
      ],
    }),
    SECT('s338a2', 'Tu Hành Tông', [{ token: 'p338a20001', name: ' ChuTuHanh', role: 'chu', contrib: 999 }, { token: 'p338a20002', name: ' DeTuHanh', role: 'detu', contrib: 500 }], {
      territories: ['lm_bang_phong'], warehouse: [{ itemId: 'da_quy', qty: 20 }],
      arts: [
        ART('a2tp1', 'Thiền Định Kinh 1', { thien: 5 }, 'f_cong', 'tamphap', 'p338a20001'),
        ART('a2tp2', 'Thiền Định Kinh 2', { thien: 5 }, 'f_cong', 'tamphap', 'p338a20001'),
        ART('a2tp3', 'Thiền Định Kinh 3', { thien: 5 }, 'f_cong', 'tamphap', 'p338a20001'),
        ART('a2tp4', 'Thiền Định Kinh 4', { thien: 5 }, 'f_cong', 'tamphap', 'p338a20001'),
        ART('a2tp5', 'Thiền Định Kinh 5', { thien: 5 }, 'f_cong', 'tamphap', 'p338a20001'),
        ART('a2tp6', 'Thiền Định Kinh 6', { thien: 5, che: 1 }, 'f_cong', 'tamphap', 'p338a20001'),
      ],
    }),
  ];
  writeWorld(DIR, chars, sects);
  await H.startServer();
  const AC = await H.connect('p338a10001');
  const AM = await H.connect('p338a10002');
  const DC = await H.connect('p338a20001');
  const DM = await H.connect('p338a20002');
  await refresh(AC); await refresh(DC);
  R.ok('A0 phong: atk=linhdong, def=tuhanh', mySect(AC)?.phong?.main === 'linhdong' && mySect(DC)?.phong?.main === 'tuhanh', JSON.stringify({ a: mySect(AC)?.phong, d: mySect(DC)?.phong }));

  AC.socket.emit('sect_war_declare', { pointId: 'lm_bang_phong' });
  await sleep(900); await refresh(AC);
  R.ok('A0b tuyên chiến pending', mySect(AC)?.war?.state === 'pending', JSON.stringify(mySect(AC)?.war));
  AC.errors = []; AC.socket.emit('sect_war_formation_set', {}); await sleep(800); await refresh(AC);
  DC.errors = []; DC.socket.emit('sect_war_formation_set', {}); await sleep(800); await refresh(DC);
  R.ok('A0c bày trận 2 bên xong', mySect(AC)?.war?.myForm?.axis === 'linhdong' && mySect(DC)?.war?.myForm?.axis === 'tuhanh', JSON.stringify({ fa: mySect(AC)?.war?.myForm, fd: mySect(DC)?.war?.myForm, eA: AC.errors, eD: DC.errors }));

  // ===== PREP: A1 baseline speed (AM chạy ngang qua vùng lúc chưa có trận) =====
  async function speedRun(tag) {
    for (const yOff of [-160, -60, 130, 230]) {
      await flyTo(AM, FLAG.x + 330, FLAG.y + yOff, 40); await land(AM);
      AM.notices = [];
      const { samples, speeds } = await runLine(AM, -1, 0, 6500);
      const inS = [], outS = [];
      for (let i = 1; i < samples.length; i++) {
        const dt = (samples[i].t - samples[i - 1].t) / 1000; const d = Math.hypot(samples[i].x - samples[i - 1].x, samples[i].y - samples[i - 1].y);
        if (dt <= 0.03 || d <= 5) continue;
        (inZone(samples[i]) ? inS : outS).push(d / dt);
      }
      const slowed = AM.notices.some((t) => t.includes('làm chậm'));
      R.note(`${tag} yOff=${yOff} in=${inS.length} out=${outS.length} medIn=${median(inS).toFixed(1)} medOut=${median(outS).toFixed(1)} slowed=${slowed}`);
      if (inS.length >= 12 && !slowed) return { inMed: median(inS), outMed: median(outS), inN: inS.length };
    }
    return null;
  }
  const pre = await speedRun('PREP');
  R.ok('A1-pre đo được tốc nền trong vùng (prep)', !!pre, '');

  // ===== PREP: A2 control — DM đứng yên trong vùng, hp không được tăng =====
  const dmHp = async () => (meOf(DM) || {}).hp;
  let hp0 = await dmHp();
  let hpMaxSeen = hp0, hpMinSeen = hp0;
  for (let i = 0; i < 20; i++) { await sleep(500); const h = await dmHp(); if (h != null) { hpMaxSeen = Math.max(hpMaxSeen, h); hpMinSeen = Math.min(hpMinSeen, h); } }
  R.note(`A2-prep: hp0=${hp0} max=${hpMaxSeen} min=${hpMinSeen} (10s đứng yên, pha chuẩn bị)`);
  R.ok('A2-prep: không hồi máu khi chưa mở chiến', hpMaxSeen <= hp0, `max-hp0=${hpMaxSeen - hp0}`);

  // ===== chờ ACTIVE =====
  const act = await waitFor(() => { AC.socket.emit('sect_get'); return mySect(AC)?.war?.state === 'active' ? true : null; }, 100000);
  R.ok('A-chiến mở (active)', !!act, JSON.stringify(mySect(AC)?.war?.state));

  // ===== ACTIVE: A1 tốc trong vùng =====
  const actRun = await speedRun('ACTIVE');
  if (pre && actRun) {
    const ratioIn = actRun.inMed / pre.inMed;
    R.note(`A1: PRE in-zone=${pre.inMed.toFixed(1)}px/s ACTIVE in-zone=${actRun.inMed.toFixed(1)}px/s ti le=${ratioIn.toFixed(4)} (code du doan 1.0034: tocDo 60->64.8 qua speedOf bao hoa)`);
    R.ok('A1 tốc trong vùng trận khớp kênh chỉ số (+8% tocDo, dịch chuyển +~0.3%)', ratioIn >= 0.995 && ratioIn <= 1.012, `ratio=${ratioIn.toFixed(4)}`);
    if (actRun.outMed && pre.outMed) R.note(`A1 ngoài vùng: PRE=${pre.outMed.toFixed(1)} ACTIVE=${actRun.outMed.toFixed(1)} ti le=${(actRun.outMed / pre.outMed).toFixed(4)} (kỳ vọng ~1.000 — ngoài vùng không ăn trận)`);
  } else R.ok('A1 tốc trong vùng trận', false, 'không đo được run');

  // ===== ACTIVE: A2 hồi máu Tu Hành =====
  let prev = await dmHp(); const base = prev;
  const gains = []; let bites = 0;
  for (let i = 0; i < 30; i++) { await sleep(500); const h = await dmHp(); if (h == null || prev == null) { prev = h; continue; } const d = h - prev; if (d > 0) gains.push(d); else if (d < 0) bites++; prev = h; }
  const medGain = median(gains);
  R.note(`A2: hp đầu=${base} cuối=${prev} net=${prev - base} | mẫu tăng: n=${gains.length} median/mẫu dương=${medGain} | số nhịp bị cắn=${bites} (regen chạy tick 1s: kỳ vọng +25.5/tick = 0.5% x 5100, net 15s ~ +382)`);
  R.ok('A2 trận Tu Hành hồi 0.5% maxHp/s trong vùng', medGain >= 20 && medGain <= 32 && (prev - base) >= 250, `median=${medGain} net=${prev - base}`);

  // ===== ACTIVE: A1b kháng chậm =====
  // Tìm thuy_trieu_tinh gần nhất theo tick của AM
  const findTinh = () => { const me = meOf(AM); const ts = monsOf(AM).filter((m) => m.kind === 'thuy_trieu_tinh'); if (!me || !ts.length) return null; ts.sort((a, b) => Math.hypot(a.x - me.x, a.y - me.y) - Math.hypot(b.x - me.x, b.y - me.y)); return ts[0]; };
  AM.notices = [];
  let tinh = findTinh();
  R.note(`A1b: tinh gần nhất: ${tinh ? `(${Math.round(tinh.x)},${Math.round(tinh.y)}) hp=${tinh.hp}` : 'KHÔNG THẤY'}`);
  // Air-drag: AM không hạ cánh gần tinh (tầm đánh + tol của flyTo làm bị cắn sớm). Bay treo:
  // seek = áp sát tới 230px cho tinh đuổi; drag = lùi từng đoạn ngắn về điểm cắm, treo chờ tinh theo kịp.
  // Bị cắn khi AM >330px từ cờ = nhiễm: bay thoát 600px, chờ 5s hết chậm rồi kéo lại.
  async function dragTo(camp, budgetMs, label, accept) {
    let mode = 'seek';
    const t0 = Date.now();
    while (Date.now() - t0 < budgetMs) {
      const mm = meOf(AM); const t2 = findTinh();
      if (!t2 || !mm) { await sleep(350); continue; }
      const dFlag = Math.hypot(mm.x - FLAG.x, mm.y - FLAG.y);
      const hit = AM.notices.find((t) => t.includes('làm chậm'));
      if (hit) {
        if (accept(dFlag)) { R.note(`${label}: nhận chậm tại ${Math.round(dFlag)}px từ cờ`); return hit; }
        R.note(`${label} nhiễm: bị cắn ở ${Math.round(dFlag)}px từ cờ -> bay thoát + chờ hết chậm`);
        AM.notices = [];
        const ax = mm.x + (mm.x - t2.x) / (Math.hypot(mm.x - t2.x, mm.y - t2.y) || 1) * 600, ay = mm.y + (mm.y - t2.y) / (Math.hypot(mm.x - t2.x, mm.y - t2.y) || 1) * 600;
        await flyTo(AM, ax, ay, 60, 6000); await sleep(5000); mode = 'seek'; continue;
      }
      const dTinh = Math.hypot(t2.x - mm.x, t2.y - mm.y);
      const dCamp = Math.hypot(camp.x - mm.x, camp.y - mm.y);
      if (mode === 'seek') {
        if (dTinh <= 230) mode = 'drag';
        else await flyTo(AM, t2.x, t2.y, 205, 5000);
      } else {
        if (dCamp <= 45) {
          await land(AM);
          if (dTinh > 300) mode = 'seek';
        } else if (dTinh > 340) await sleep(450); // treo chờ tinh theo kịp
        else await flyTo(AM, camp.x, camp.y, 40, 650);
      }
      await sleep(250);
    }
    return null;
  }
  let slowIn = null;
  if (tinh) {
    const d0 = Math.hypot(tinh.x - FLAG.x, tinh.y - FLAG.y) || 1;
    const campIn = { x: FLAG.x + (tinh.x - FLAG.x) / d0 * 250, y: FLAG.y + (tinh.y - FLAG.y) / d0 * 250 };
    slowIn = await dragTo(campIn, 280000, 'A1b-IN', (d) => d <= 330);
  }
  R.note(`A1b in-zone notice: ${slowIn || '(chưa bắt được)'}`);
  let slowOut = null;
  if (slowIn) {
    // thoát khỏi tinh + chờ hết chậm (nó có thể đang đứng trong vùng và cắn tiếp 20% im lặng)
    const t2 = findTinh(); const mm = meOf(AM);
    if (t2 && mm) { const dd = Math.hypot(mm.x - t2.x, mm.y - t2.y) || 1; await flyTo(AM, mm.x + (mm.x - t2.x) / dd * 700, mm.y + (mm.y - t2.y) / dd * 700, 60, 6000); }
    await sleep(6000); AM.notices = [];
    const t3 = findTinh();
    if (t3) {
      const d3 = Math.hypot(t3.x - FLAG.x, t3.y - FLAG.y) || 1;
      const campOut = { x: FLAG.x + (t3.x - FLAG.x) / d3 * 620, y: FLAG.y + (t3.y - FLAG.y) / d3 * 620 };
      slowOut = await dragTo(campOut, 200000, 'A1b-OUT', (d) => d >= 380);
    }
    R.note(`A1b out-zone notice: ${slowOut || '(chưa bắt được)'}`);
  }
  R.ok('A1b kháng chậm 50%: trong vùng 40% -> 20%', !!slowIn && /làm chậm 20%/.test(slowIn), slowIn || 'không có notice trong vùng');
  R.ok('A1b đối chứng ngoài vùng: làm chậm 40%', !!slowOut && /làm chậm 40%/.test(slowOut), slowOut || 'không có notice ngoài vùng');

  R.done('p338a');
  await H.stopServer();
  process.exit(R.fail ? 1 : 0);
})().catch(async (e) => { console.error('LOI', e); try { await H.stopServer(); } catch (_) {} process.exit(2); });
