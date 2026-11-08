// Probe GĐ338-A3 — TRẬN XẢO NGHỆ: chiến kỹ của tông tung TRONG vùng trận -> hồi chiêu x0.85; ngoài vùng không giảm.
// Pháp CK fixture {sat:1}: cdMs gốc = 5000+800 = 5800ms, mana 30. Trong vùng kỳ vọng ~4930ms, ngoài vùng ~5800ms.
// Đo bằng cách spam cast_skill mỗi 120ms, ghi mốc cast_result ok đầu tiên sau lần cast thành công trước.
// Mục tiêu cast = Thủ Lĩnh Chiến Kỳ (def, hp 20000) trong vùng; ngoài vùng dùng quái farm gần điểm đứng.
const path = require('path');
const { makeHarness, BASE, SECT, ART, writeWorld, makeOk, meOf, monsOf, flyTo, land, sleep, waitFor, median } = require('./lib338.cjs');
const PORT = 3611;
const DIR = __dirname;
const H = makeHarness(PORT, { TTT_WAR_DELAY_MS: '9000', TTT_WAR_LEN_MS: '300000' }, DIR);
const R = makeOk();
const FLAG = { x: 4248, y: 6223 };
const mySect = (c) => c.sect && c.sect.mySect;
async function refresh(c) { c.socket.emit('sect_get'); await sleep(500); }

(async () => {
  const chars = {
    p338b10001: BASE('p338b10001', ' ChuXaoNghe', { mapId: 'huyet_sac_rung', x: FLAG.x, y: FLAG.y }),
    p338b10002: BASE('p338b10002', ' PhapSuXao', { mapId: 'huyet_sac_rung', x: FLAG.x, y: FLAG.y, vatCong: 200 }),
    p338b20001: BASE('p338b20001', ' ChuThuDia', { mapId: 'huyet_sac_rung', x: FLAG.x + 30, y: FLAG.y + 30 }),
  };
  const sects = [
    SECT('s338b1', 'Xảo Nghệ Tông', [{ token: 'p338b10001', name: ' ChuXaoNghe', role: 'chu', contrib: 999 }, { token: 'p338b10002', name: ' PhapSuXao', role: 'detu', contrib: 500 }], {
      warehouse: [{ itemId: 'da_quy', qty: 20 }],
      arts: [
        ART('b1ck', 'Xảo Kích', { sat: 1 }, 'f_mp', 'chienky', 'p338b10001'),
        ...Array.from({ length: 8 }, (_, i) => ART('b1tp' + i, 'Khéo Tay Kinh ' + i, { che: 4 }, 'f_cong', 'tamphap', 'p338b10001')),
      ],
    }),
    SECT('s338b2', 'Thủ Địa Tông', [{ token: 'p338b20001', name: ' ChuThuDia', role: 'chu', contrib: 999 }], { territories: ['lm_huyet_sac'], warehouse: [{ itemId: 'da_quy', qty: 20 }] }),
  ];
  chars.p338b10002.sectArts = ['b1ck'];
  writeWorld(DIR, chars, sects);
  await H.startServer();
  const AC = await H.connect('p338b10001');
  const CS = await H.connect('p338b10002');
  const DC = await H.connect('p338b20001');
  await refresh(AC);
  R.ok('B0 phong atk = xaonghe', mySect(AC)?.phong?.main === 'xaonghe', JSON.stringify(mySect(AC)?.phong));

  // học/lắp chiến kỹ trước chiến
  CS.castResults = [];
  CS.socket.on('cast_result', (r) => CS.castResults.push({ t: Date.now(), ...r }));
  CS.socket.emit('equip_skill', { skillId: 'art:b1ck' });
  await sleep(900);
  const slotOf = () => ((CS.sync && CS.sync.skills) || []).findIndex((x) => x.id === 'art:b1ck');
  R.ok('B0b lắp được chiến kỹ tông', slotOf() >= 0, JSON.stringify((CS.sync?.skills || []).map((s) => s.id)));

  AC.socket.emit('sect_war_declare', { pointId: 'lm_huyet_sac' });
  await sleep(900); await refresh(AC);
  AC.socket.emit('sect_war_formation_set', {}); await sleep(800); await refresh(AC);
  R.ok('B0c bày trận xảo nghệ', mySect(AC)?.war?.myForm?.axis === 'xaonghe', JSON.stringify(mySect(AC)?.war?.myForm));
  const act = await waitFor(() => { AC.socket.emit('sect_get'); return mySect(AC)?.war?.state === 'active' ? true : null; }, 30000);
  R.ok('B0d chiến mở', !!act, '');

  async function measureCd(tag) {
    // cast 1 lần cho ok, rồi spam cast mỗi 120ms tới khi ok lần nữa -> hiệu thời gian
    CS.castResults = [];
    const slot = slotOf();
    if (slot < 0) return null;
    CS.socket.emit('cast_skill', { slot });
    const first = await waitFor(() => CS.castResults.find((r) => r.ok), 4000);
    if (!first) { R.note(tag + ': cast đầu không ok ' + JSON.stringify(CS.castResults)); return null; }
    const t0 = first.t;
    CS.castResults = [];
    const tEnd = Date.now() + 9000;
    let second = null;
    while (Date.now() < tEnd && !second) {
      CS.socket.emit('cast_skill', { slot });
      await sleep(120);
      second = CS.castResults.find((r) => r.ok) || null;
    }
    if (!second) return null;
    return second.t - t0;
  }
  // TRONG VÙNG: đứng cạnh Thủ Lĩnh (cờ +70,+40)
  const guardian = () => monsOf(CS).find((m) => m.name === 'Thủ Lĩnh Chiến Kỳ');
  let g = guardian();
  R.note('guardian: ' + (g ? `(${Math.round(g.x)},${Math.round(g.y)}) hp=${g.hp}` : 'không thấy'));
  await flyTo(CS, FLAG.x + 40, FLAG.y + 20, 25); await land(CS);
  const cdIn = await measureCd('IN');
  const payloadCd = ((CS.sync?.skills) || []).find((x) => x.id === 'art:b1ck')?.cdMs;
  R.note(`A3 in-zone CD đo = ${cdIn}ms | cdMs hiệu dụng theo payload = ${payloadCd} (5800 gốc x (1-cdrOf 0.15) x (1-minhCdr 0.06) = 4634); trong vùng kỳ vọng x0.85 = ~3939`);
  // NGOÀI VÙNG: bay ra xa cờ 700px, tìm quái gần đó làm mục tiêu
  await flyTo(CS, FLAG.x - 1500, FLAG.y - 1200, 60);
  // chờ hồi chiêu xong từ lần cast trong vùng (tối đa ~6s) rồi tìm mục tiêu
  await sleep(6500);
  const nearMon = () => { const me = meOf(CS); const ms = monsOf(CS).filter((m) => m.name !== 'Thủ Lĩnh Chiến Kỳ' && m.name !== 'Trận Nhãn' && (m.maxHp || 0) >= 300); if (!me || !ms.length) return null; ms.sort((a, b) => Math.hypot(a.x - me.x, a.y - me.y) - Math.hypot(b.x - me.x, b.y - me.y)); return ms[0]; };
  let nm = nearMon();
  if (nm) { await flyTo(CS, nm.x, nm.y, 60); await land(CS); }
  R.note('out-zone target: ' + (nm ? `${nm.kind} (${Math.round(nm.x)},${Math.round(nm.y)})` : 'không có quái gần'));
  const cdOut = await measureCd('OUT');
  R.note(`A3 out-zone CD đo = ${cdOut}ms (kỳ vọng ~4634 = payload, không giảm)`);
  if (cdIn && cdOut) {
    const ratio = cdIn / cdOut;
    R.note(`A3 tỉ lệ in/out = ${ratio.toFixed(3)} (kỳ vọng 0.85)`);
    R.ok('A3 trận Xảo Nghệ: CD chiến kỹ trong vùng x0.85', ratio >= 0.79 && ratio <= 0.91 && cdIn < cdOut, `in=${cdIn} out=${cdOut} ratio=${ratio.toFixed(3)}`);
  } else R.ok('A3 trận Xảo Nghệ: CD chiến kỹ trong vùng x0.85', false, `in=${cdIn} out=${cdOut}`);

  R.done('p338b');
  await H.stopServer();
  process.exit(R.fail ? 1 : 0);
})().catch(async (e) => { console.error('LOI', e); try { await H.stopServer(); } catch (_) {} process.exit(2); });
