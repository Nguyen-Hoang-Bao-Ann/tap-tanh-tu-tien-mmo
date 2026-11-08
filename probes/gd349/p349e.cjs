// GĐ349-E — đo LẠI A3 Xảo Nghệ của p338b (lượt chạy lại 08/11: in=4010ms đúng kỳ vọng x0.85
// nhưng OUT=null nên cặp tỉ lệ fail). Bản này: OUT chọn quái maxHp CAO NHẤT trong 2600px,
// khi spam cast thì bám theo mục tiêu (giữ tầm), ghi lý do cast fail + hp caster, thử lại 1 lần.
const path = require('path');
const { makeHarness, BASE, SECT, ART, writeWorld, makeOk, meOf, monsOf, flyTo, land, sleep, waitFor, median } = require('../gd338/lib338.cjs');
const PORT = 3665;
const DIR = path.join(__dirname, '..', 'gd338');
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

  async function measureCd(tag, followId) {
    CS.castResults = [];
    const slot = slotOf();
    if (slot < 0) return null;
    CS.socket.emit('cast_skill', { slot });
    const first = await waitFor(() => CS.castResults.find((r) => r.ok), 4000);
    if (!first) { R.note(tag + ': cast đầu không ok ' + JSON.stringify(CS.castResults)); return null; }
    const t0 = first.t;
    CS.castResults = [];
    const tEnd = Date.now() + 10000;
    let second = null, lastSteer = 0;
    while (Date.now() < tEnd && !second) {
      CS.socket.emit('cast_skill', { slot });
      if (followId && Date.now() - lastSteer > 360) {
        lastSteer = Date.now();
        const m = monsOf(CS).find((x) => x.id === followId); const me = meOf(CS);
        if (m && me) { const d = Math.hypot(m.x - me.x, m.y - me.y); if (d > 95) CS.socket.emit('client_input', { vx: (m.x - me.x) / d, vy: (m.y - me.y) / d }); else CS.socket.emit('client_input', { vx: 0, vy: 0 }); }
      }
      await sleep(120);
      second = CS.castResults.find((r) => r.ok) || null;
    }
    CS.socket.emit('client_input', { vx: 0, vy: 0 });
    if (!second) { const errs = {}; for (const r of CS.castResults) { const k = r.ok ? 'ok' : (r.error || r.msg || 'fail?'); errs[k] = (errs[k] || 0) + 1; } R.note(tag + ': không có cast ok thứ 2; kết quả spam: ' + JSON.stringify(errs) + ' | hp caster=' + (meOf(CS)?.hp)); return null; }
    return second.t - t0;
  }
  await flyTo(CS, FLAG.x + 40, FLAG.y + 20, 25); await land(CS);
  const cdIn = await measureCd('IN');
  const payloadCd = ((CS.sync?.skills) || []).find((x) => x.id === 'art:b1ck')?.cdMs;
  R.note(`A3 in-zone CD = ${cdIn}ms | payload cdMs = ${payloadCd}; trong vùng kỳ vọng x0.85 = ~${Math.round(payloadCd * 0.85)}`);
  await flyTo(CS, FLAG.x - 1500, FLAG.y - 1200, 60);
  await sleep(6500);
  const pickTarget = () => { const me = meOf(CS); const ms = monsOf(CS).filter((m) => m.name !== 'Thủ Lĩnh Chiến Kỳ' && m.name !== 'Trận Nhãn' && (m.maxHp || 0) >= 300 && Math.hypot(m.x - me.x, m.y - me.y) <= 2600); if (!me || !ms.length) return null; ms.sort((a, b) => (b.maxHp || 0) - (a.maxHp || 0)); return ms[0]; };
  let cdOut = null;
  for (let attempt = 1; attempt <= 2 && !cdOut; attempt++) {
    const nm = pickTarget();
    if (!nm) { R.note('OUT: không có quái đủ trâu trong 2600px'); break; }
    await flyTo(CS, nm.x, nm.y, 60); await land(CS);
    R.note(`OUT attempt ${attempt}: target ${nm.kind} maxHp=${nm.maxHp} tai (${Math.round(nm.x)},${Math.round(nm.y)}) hpCaster=${meOf(CS)?.hp}`);
    cdOut = await measureCd('OUT' + attempt, nm.id);
    if (!cdOut) await sleep(5000);
  }
  R.note(`A3 out-zone CD = ${cdOut}ms (kỳ vọng ~${payloadCd} = payload, không giảm)`);
  if (cdIn && cdOut) {
    const ratio = cdIn / cdOut;
    R.note(`A3 tỉ lệ in/out = ${ratio.toFixed(3)} (kỳ vọng 0.85)`);
    R.ok('A3 trận Xảo Nghệ: CD chiến kỹ trong vùng x0.85', ratio >= 0.79 && ratio <= 0.91 && cdIn < cdOut, `in=${cdIn} out=${cdOut} ratio=${ratio.toFixed(3)}`);
  } else R.ok('A3 trận Xảo Nghệ: CD chiến kỹ trong vùng x0.85', false, `in=${cdIn} out=${cdOut}`);
  R.done('GĐ349-E (do lai p338b)');
  await H.stopServer();
  process.exit(R.fail ? 1 : 0);
})().catch(async (e) => { console.error('LOI', e); try { await H.stopServer(); } catch (_) {} process.exit(2); });
