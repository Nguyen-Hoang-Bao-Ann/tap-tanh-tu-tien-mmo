// Probe GĐ356 — Hệ khám phá đợt 1: sổ đăng ký điểm bí mật + đồng bộ phát hiện + perk bản đồ.
// Chân kiểm:
//  0) Boot log [khám phá] khớp payload; số điểm đăng ký theo loại khớp nguồn (27/10/2 + rương/hang theo log boot).
//  1) Nhân vật tươi: secretsView có đủ counts, found rỗng, secretMarks rỗng.
//  2) Điểm manh mối (thành phố): đứng vào điểm -> ghi sổ đúng 1 lần (idempotent).
//  3) Di vật (Hoa ở cây cổ thụ): nhặt -> ghi sổ + sự kiện secret_marks đẩy dấu thật; idempotent.
//  4) Rương ẩn (hc_tc_farm): tới gần -> rương nảy + mở -> ghi sổ.
//  5) Cổng bí cảnh (Đối Ảnh, Viên Mãn): an_gate_enter -> ghi sổ.
//  6) Miệng hang: travel sang map farm -> cave_enter -> ghi sổ đúng id miệng.
//  7) Quét bù đăng nhập: cờ cũ/di vật cũ/cổng đã vào -> sổ có điểm; nhân vật không hồn nạp bình thường.
//  8) Payload bản đồ KHÔNG perk: có manh mối vẫn không có hints, không lộ tọa độ điểm chưa tìm.
//  9) Payload bản đồ CÓ perk mốc Khám phá 2: hints = 1 vùng mờ lệch 200–400px, không có tọa độ thật.
// 10) Restart + autosave offline 20s: soul.secrets còn nguyên trong file.
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const net = require('net');
const ROOT = path.join(__dirname, '..', '..');
const DIR = __dirname;
const { io } = require(path.join(ROOT, 'client/node_modules/socket.io-client'));
const { createMerger } = require(path.join(ROOT, 'client/worldmerge.cjs'));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function waitFor(fn, ms) { const t0 = Date.now(); while (Date.now() - t0 < ms) { const v = fn(); if (v) return v; await sleep(120); } return null; }
function portFree(port) { return new Promise((res) => { const s = net.createServer(); s.once('error', () => res(false)); s.listen(port, () => s.close(() => res(true))); }); }
let serverProc = null, killTimer = null, CUR_PORT = 3712;
async function startServer(port, tag) {
  CUR_PORT = port;
  if (!(await portFree(port))) throw new Error('port ban ' + port);
  serverProc = spawn('node', ['server/index.js'], { cwd: ROOT, env: { ...process.env, PORT: String(port), TTT_STORAGE: 'file', TTT_CHAR_FILE: path.join(DIR, 'characters.json'), TTT_ACC_FILE: path.join(DIR, 'accounts.json'), TTT_WORLD_FILE: path.join(DIR, 'world.json'), TTT_SESS_FILE: path.join(DIR, 'sessions.json'), TTT_DAY_REAL_MS: '600000', TTT_TUVI_NEED: '5' }, stdio: ['ignore', 'pipe', 'pipe'] });
  serverProc.stderr.on('data', (d) => { try { fs.appendFileSync(path.join(DIR, 'srv_' + tag + '.log'), d); } catch (e) {} });
  serverProc.stdout.on('data', (d) => { try { fs.appendFileSync(path.join(DIR, 'srv_' + tag + '.log'), d); } catch (e) {} });
  killTimer = setTimeout(() => { try { serverProc.kill('SIGKILL'); } catch (e) {} }, 600000);
  const t0 = Date.now();
  while (Date.now() - t0 < 45000) { try { const r = await fetch(`http://127.0.0.1:${port}/api/status`); if (r.ok) { clearTimeout(killTimer); return; } } catch (e) {} await sleep(500); }
  throw new Error('server khong len');
}
async function stopServer() { if (!serverProc) return; const p = serverProc; serverProc = null; await new Promise((res) => { const t = setTimeout(() => { try { p.kill('SIGKILL'); } catch (e) {} res(); }, 4000); p.once('exit', () => { clearTimeout(t); res(); }); try { p.kill('SIGTERM'); } catch (e) { clearTimeout(t); res(); } }); const t0 = Date.now(); while (Date.now() - t0 < 10000 && !(await portFree(CUR_PORT))) await sleep(300); }
const STATS = { khiHuyet: 8000, vatCong: 400, vatPhong: 250, phapCong: 400, phapPhong: 250, tocDo: 60, minhMan: 100 };
const LC1 = { elements: ['kim'], main: 'kim', count: 1, mutations: [] };
function BASE(token, name, extra) {
  return Object.assign({ token, name, classId: 'kiemtu', gender: 'nam', race: null, geo175: 1, realm: 'kd', tier: 9, x: 1565, y: 1011, mapId: 'lang_tan_thu', hp: 99999, mp: 99999, lifespan: 500, birthDay: -5660, ageStart: 16, stats: { ...STATS }, statPoints: 0, freePoints: 0, tuVi: 99999, stones: 100000, stonesTrung: 0, stonesThuong: 0, stonesCuc: 0, inventory: {}, gearBag: {}, equipped: [], skills: [], job: null, job2: null, job3: null, linhCan: { ...LC1 }, affinity: {}, affV2: 1, bonds: {}, quests: {}, questsDone: {}, flags: {}, counters: {}, disciples: [], foundInvites: [], reformIn: [], sectTech: [], sectArts: [], sectArtsActive: [], mails: [], classRes: {}, food: 100, water: 100 }, extra || {});
}
let pass = 0, fail = 0;
function ok(name, cond, extra) { if (cond) { pass++; console.log('PASS | ' + name); } else { fail++; console.log('FAIL | ' + name + (extra ? ' | ' + extra : '')); } }
function connect(token) {
  const socket = io(`http://127.0.0.1:${CUR_PORT}`, { transports: ['websocket'] });
  const ctx = { socket, merger: createMerger(), state: null, welcome: null, needChar: false, syncs: [], errs: [], notices: [], dialogs: [], maps: [], marks: [], opened: [], infos: [], overviews: [], myName: null };
  socket.on('connect', () => socket.emit('hello', { token }));
  socket.on('welcome', (w) => { ctx.welcome = w; ctx.myName = (w.character || {}).name; });
  socket.on('need_character', () => { ctx.needChar = true; });
  socket.on('char_sync', (s) => ctx.syncs.push(s));
  socket.on('notice', (n) => ctx.notices.push(n.text || ''));
  socket.on('interact_error', (e) => ctx.errs.push(e.message || ''));
  socket.on('npc_dialog', (d) => ctx.dialogs.push(d));
  socket.on('map_enter', (m) => ctx.maps.push(m));
  socket.on('secret_marks', (m) => ctx.marks.push(m));
  socket.on('travel_info', (d) => ctx.infos.push(d));
  socket.on('overview_data', (d) => ctx.overviews.push(d));
  socket.on('chest_opened', (o) => ctx.opened.push(o));
  socket.on('server_tick', (t) => { const st = ctx.merger(t); if (st) ctx.state = st; });
  return ctx;
}
const lastChar = (c) => { for (let i = c.syncs.length - 1; i >= 0; i--) { if (c.syncs[i]) return c.syncs[i]; } return c.welcome ? c.welcome.character : null; };
const meOf = (c) => { const ps = (c.state && c.state.players) || []; return ps.find((p) => p.name === c.myName) || null; };
const foundIds = (c) => { const ch = lastChar(c); const sv = ch && ch.soul && ch.soul.secretsView; return sv ? sv.found.map((f) => f.id) : []; };
async function flyTo(c, tx, ty, tol) {
  c.socket.emit('fly_toggle', {});
  await sleep(400);
  const t0 = Date.now();
  while (Date.now() - t0 < 30000) {
    const me = meOf(c); if (!me) { await sleep(150); continue; }
    const dx = tx - me.x, dy = ty - me.y; const d = Math.hypot(dx, dy);
    if (d <= (tol || 60)) break;
    c.socket.emit('client_input', { vx: dx / d, vy: dy / d });
    await sleep(120);
  }
  c.socket.emit('client_input', { vx: 0, vy: 0 });
  c.socket.emit('fly_toggle', {});
  await sleep(400);
}

(async () => {
  try {
    const chars = {};
    chars['tk356so001'] = BASE('tk356so001', 'P356SoSach');
    chars['tk356mm001'] = BASE('tk356mm001', 'P356ManhMoi', { mapId: 'bich_ba_thanh', x: 2100, y: 3250 });
    chars['tk356dv001'] = BASE('tk356dv001', 'P356DiVat', { x: 1200, y: 1990 });
    chars['tk356hc001'] = BASE('tk356hc001', 'P356RuongAn', { x: 7155, y: 627 });
    chars['tk356gt001'] = BASE('tk356gt001', 'P356Cong', { x: 1140, y: 2010, anState: { vienman: true } });
    chars['tk356cv001'] = BASE('tk356cv001', 'P356Hang', { x: 2415, y: 1342 });
    chars['tk356bc001'] = BASE('tk356bc001', 'P356BuCu', { flags: { hid_002: true, hid_004: true }, soul: { lives: 2, relics: { hoa: 1, ma: 1 } }, anState: { doiAnhDay: 5, doiAnhBest: 66 } });
    const g2 = BASE('tk356bc002', 'P356KhongHon'); delete g2.soul; chars['tk356bc002'] = g2;
    chars['tk356np001'] = BASE('tk356np001', 'P356KhongPerk', { soul: { clues: { clue_gate_uhon: { st: 1, life: 1 } } } });
    chars['tk356pk001'] = BASE('tk356pk001', 'P356CoPerk', { soul: { clues: { clue_gate_uhon: { st: 1, life: 1 } } }, achState: { tiers: { ach_kp_maps: 10, ach_kp_dist: 8 }, title: null, daoTich: 0, notified: {} } });
    fs.writeFileSync(path.join(DIR, 'characters.json'), JSON.stringify(chars));
    fs.writeFileSync(path.join(DIR, 'accounts.json'), '{}');
    fs.writeFileSync(path.join(DIR, 'world.json'), JSON.stringify({ totalMinutes: 3360, savedAt: Date.now() }));
    fs.writeFileSync(path.join(DIR, 'sessions.json'), '{}');
    await startServer(3712, '356a');
    const bootLog = fs.readFileSync(path.join(DIR, 'srv_356a.log'), 'utf8');
    const regLine = bootLog.split('\n').find((l) => l.includes('[khám phá]')) || '';
    const chestLine = bootLog.split('\n').find((l) => l.includes('[rương ẩn]')) || '';
    const caveLine = bootLog.split('\n').find((l) => l.includes('miệng hang THẬT')) || '';
    const nChestLog = parseInt((chestLine.match(/(\d+) điểm/) || [])[1] || '0', 10);
    const nCaveLog = parseInt((caveLine.match(/tổng (\d+)/) || [])[1] || '0', 10);
    console.log('boot:', regLine.trim(), '|', chestLine.trim(), '|', caveLine.trim());

    // ---- Chân 1: nhân vật tươi + số đăng ký ----
    const cA = connect('tk356so001'); await waitFor(() => cA.welcome, 20000);
    const svA = cA.welcome && cA.welcome.character.soul && cA.welcome.character.soul.secretsView;
    ok('chân 1a: vào game + có secretsView', !!svA);
    if (svA) {
      ok('chân 1b: đăng ký manh_moi = 27', svA.counts.manh_moi && svA.counts.manh_moi.total === 27, JSON.stringify(svA.counts));
      ok('chân 1c: đăng ký di_vat = 10', svA.counts.di_vat && svA.counts.di_vat.total === 10);
      ok('chân 1d: đăng ký cong_bi_canh = 2', svA.counts.cong_bi_canh && svA.counts.cong_bi_canh.total === 2);
      ok('chân 1e: đăng ký ruong_an khớp log boot (' + nChestLog + ')', svA.counts.ruong_an && svA.counts.ruong_an.total === nChestLog, 'payload=' + (svA.counts.ruong_an || {}).total);
      ok('chân 1f: đăng ký hang khớp log boot (' + nCaveLog + ')', svA.counts.hang && svA.counts.hang.total === nCaveLog, 'payload=' + (svA.counts.hang || {}).total);
      ok('chân 1g: sổ trống lúc đầu', svA.found.length === 0 && svA.clues.length === 0);
      const mkA = cA.welcome.character.secretMarks;
      ok('chân 1h: secretMarks rỗng cho người mới', !!mkA && mkA.found.length === 0 && mkA.hints.length === 0);
    }

    // ---- Chân 2: điểm manh mối thành phố (hid_010 + hid_018 dùng CHUNG 1 điểm theo dữ liệu GĐ127) ----
    const cB = connect('tk356mm001'); await waitFor(() => cB.welcome, 20000);
    let got = await waitFor(() => foundIds(cB).includes('mm_q127_hid_010') ? true : null, 6000);
    if (!got) { await flyTo(cB, 2100, 3250, 40); got = await waitFor(() => foundIds(cB).includes('mm_q127_hid_010') ? true : null, 8000); }
    ok('chân 2a: đứng vào điểm manh mối Bích Ba -> ghi sổ mm_q127_hid_010', !!got, JSON.stringify(foundIds(cB)));
    const mmSet1 = foundIds(cB).filter((i) => i.startsWith('mm_')).sort();
    await sleep(2500);
    const mmSet2 = foundIds(cB).filter((i) => i.startsWith('mm_')).sort();
    ok('chân 2b: điểm chung ghi đủ 2 nhiệm vụ (010+018) và không ghi trùng thêm (idempotent)', mmSet1.join() === 'mm_q127_hid_010,mm_q127_hid_018' && mmSet2.join() === mmSet1.join(), mmSet1.join() + ' -> ' + mmSet2.join());
    const fileB = JSON.parse(fs.readFileSync(path.join(DIR, 'characters.json'), 'utf8'))['tk356mm001'] || {};
    ok('chân 2c: cờ GĐ127 gốc vẫn được set trong file', !!(fileB.flags && fileB.flags.hid_010 && fileB.flags.hid_018), JSON.stringify(fileB.flags));

    // ---- Chân 3: di vật Hoa ----
    const cC = connect('tk356dv001'); await waitFor(() => cC.welcome, 20000);
    got = await waitFor(() => foundIds(cC).includes('dv_hoa') ? true : null, 6000);
    if (!got) { await flyTo(cC, 1140, 1945, 50); got = await waitFor(() => foundIds(cC).includes('dv_hoa') ? true : null, 8000); }
    ok('chân 3a: nhặt di vật Hoa -> ghi sổ dv_hoa', !!got, JSON.stringify(foundIds(cC)));
    const chC = lastChar(cC);
    ok('chân 3b: payload relics có hoa', !!chC && (chC.soul.relics || []).some((r) => r.race === 'hoa'));
    const evMark = cC.marks.find((m) => (m.found || []).some((f) => f.id === 'dv_hoa' && f.x === 1140 && f.y === 1945));
    ok('chân 3c: sự kiện secret_marks đẩy dấu tọa độ thật của điểm đã tìm', !!evMark, 'marks=' + cC.marks.length);
    await sleep(2500);
    ok('chân 3d: di_vat vẫn đúng 1 điểm (idempotent)', foundIds(cC).filter((i) => i.startsWith('dv_')).length === 1);

    // ---- Chân 4: rương ẩn hc_tc_farm ----
    const cD = connect('tk356hc001'); await waitFor(() => cD.welcome, 20000);
    got = await waitFor(() => foundIds(cD).includes('hc_tc_farm') ? true : null, 30000);
    ok('chân 4a: mở rương ẩn bãi farm Thạch Lâm -> ghi sổ hc_tc_farm', !!got, JSON.stringify(foundIds(cD)) + ' opened=' + cD.opened.length);

    // ---- Chân 5: cổng Đối Ảnh (handler vào cổng không phát char_sync -> kiểm qua map_enter + file + reconnect) ----
    const cE = connect('tk356gt001'); await waitFor(() => cE.welcome, 20000);
    cE.socket.emit('an_gate_enter', { canh: 'doianh' });
    const entered = await waitFor(() => cE.maps.some((m) => m.mapId === 'doi_anh_canh') ? true : null, 10000);
    const fileE = JSON.parse(fs.readFileSync(path.join(DIR, 'characters.json'), 'utf8'))['tk356gt001'] || {};
    const fileGate = !!(fileE.soul && fileE.soul.secrets && fileE.soul.secrets.gate_doianh);
    ok('chân 5a: vào Đối Ảnh Cảnh -> ghi sổ gate_doianh (map_enter + file)', !!entered && fileGate, 'entered=' + !!entered + ' file=' + JSON.stringify(fileE.soul && fileE.soul.secrets) + ' errs=' + JSON.stringify(cE.errs));
    cE.socket.disconnect();
    await sleep(600);
    const cE2 = connect('tk356gt001'); await waitFor(() => cE2.welcome, 20000);
    ok('chân 5b: reconnect thấy gate_doianh trong sổ', foundIds(cE2).includes('gate_doianh'), JSON.stringify(foundIds(cE2)));
    cE2.socket.disconnect();

    // ---- Chân 6: miệng hang (tuyến: làng -> Thanh Vân Thành -> map farm; travel là hành trình theo thời gian, không gửi input) ----
    const cF = connect('tk356cv001'); await waitFor(() => cF.welcome, 20000);
    async function journeyTo(c, mapId, ms) {
      // map_enter về lúc hành trình BẮT ĐẦU, server chốt map ở CUỐI hành trình -> phải chờ travel_info.from khớp đích mới được đi tiếp
      const m0 = c.maps.length;
      c.socket.emit('travel_to', { mapId });
      const me2 = await waitFor(() => { for (let i = m0; i < c.maps.length; i++) if (c.maps[i].mapId === mapId) return c.maps[i]; return null; }, ms || 60000);
      if (!me2) return null;
      const t0 = Date.now();
      while (Date.now() - t0 < 45000) {
        const i0 = c.infos.length;
        c.socket.emit('travel_list', {});
        const inf = await waitFor(() => (c.infos.length > i0 ? c.infos[c.infos.length - 1] : null), 5000);
        if (inf && inf.from === mapId) return me2;
        await sleep(1000);
      }
      return null;
    }
    let caveDone = null, caveMapUsed = null;
    cF.socket.emit('map_overview', {});
    const ov = await waitFor(() => (cF.overviews.length ? cF.overviews[cF.overviews.length - 1] : null), 8000);
    const caveParents = ov ? ov.maps.filter((d) => d.id.startsWith('hang_')).map((d) => d.id.slice(5)).filter((pid) => { const pd = ov.maps.find((x) => x.id === pid); return pd && pd.canEnter; }) : [];
    ok('chân 6a: overview liệt kê được map cha có hang mà nhân vật vào được (' + caveParents.length + ' map)', caveParents.length > 0, JSON.stringify(caveParents.slice(0, 5)));
    const hub = await journeyTo(cF, 'thanh_van_thanh', 60000);
    if (hub) {
      for (const dest of caveParents.slice(0, 4)) {
        const me2 = await journeyTo(cF, dest, 60000);
        if (!me2) continue;
        const caves = me2.caves || [];
        if (!caves.length) { await journeyTo(cF, 'thanh_van_thanh', 60000); continue; }
        await flyTo(cF, caves[0].x, caves[0].y, 30);
        cF.socket.emit('cave_enter', {});
        // cave_enter không phát char_sync -> đo qua sự kiện secret_marks (markSecretFound đẩy ngay khi ghi sổ)
        caveDone = await waitFor(() => cF.marks.some((m) => (m.found || []).some((f) => f.id === 'cave_' + dest + '_0')) ? ('cave_' + dest + '_0') : null, 15000);
        if (caveDone) { caveMapUsed = dest; break; }
        cF.socket.emit('cave_exit', {});
        await sleep(1500);
        await journeyTo(cF, 'thanh_van_thanh', 60000);
      }
    }
    ok('chân 6b: vào miệng hang -> ghi sổ cave_<map>_0', !!caveDone, 'map=' + caveMapUsed + ' found=' + JSON.stringify(foundIds(cF)) + ' errs=' + JSON.stringify(cF.errs.slice(-2)));

    // ---- Chân 7: quét bù ----
    const cG = connect('tk356bc001'); await waitFor(() => cG.welcome, 20000);
    const idsG = cG.welcome ? (cG.welcome.character.soul.secretsView.found.map((f) => f.id)) : [];
    ok('chân 7a: bù điểm manh mối từ cờ cũ', idsG.includes('mm_q127_hid_002') && idsG.includes('mm_q127_hid_004'), JSON.stringify(idsG));
    ok('chân 7b: bù di vật từ soul.relics cũ', idsG.includes('dv_hoa') && idsG.includes('dv_ma'));
    ok('chân 7c: bù cổng từ anState đã vào', idsG.includes('gate_doianh') && !idsG.includes('gate_uhon'));
    const cG2 = connect('tk356bc002'); await waitFor(() => cG2.welcome, 20000);
    const svG2 = cG2.welcome && cG2.welcome.character.soul && cG2.welcome.character.soul.secretsView;
    ok('chân 7d: nhân vật không field hồn nạp bình thường, sổ rỗng', !!cG2.welcome && !!svG2 && svG2.found.length === 0);

    // ---- Chân 8: payload không perk ----
    const cH = connect('tk356np001'); await waitFor(() => cH.welcome, 20000);
    const mkH = cH.welcome.character.secretMarks;
    ok('chân 8a: không perk -> hints rỗng dù có manh mối mở', !!mkH && mkH.hints.length === 0, JSON.stringify(mkH));
    ok('chân 8b: không lộ tọa độ cổng U Hồn (700,430)', !!mkH && ![...mkH.found, ...mkH.hints].some((e) => e.x === 700 && e.y === 430));

    // ---- Chân 9: payload có perk ----
    const cI = connect('tk356pk001'); await waitFor(() => cI.welcome, 20000);
    const mkI = cI.welcome.character.secretMarks;
    ok('chân 9a: có perk mốc 2 -> đúng 1 dấu mờ', !!mkI && mkI.hints.length === 1, JSON.stringify(mkI));
    if (mkI && mkI.hints.length === 1) {
      const h = mkI.hints[0];
      const dist = Math.hypot(h.x - 700, h.y - 430);
      ok('chân 9b: dấu mờ trên map nhà, lệch 200–400px khỏi điểm thật', h.mapId === 'lang_tan_thu' && dist >= 200 && dist <= 400, 'dist=' + Math.round(dist));
      ok('chân 9c: payload không chứa tọa độ thật (700,430)', ![...mkI.found, ...mkI.hints].some((e) => e.x === 700 && e.y === 430));
    }
    const svI = cI.welcome.character.soul.secretsView;
    ok('chân 9d: sổ hiện manh mối đang lần theo (văn bản, không tên điểm đích)', svI.clues.length === 1 && svI.clues[0].st === 1 && svI.clues[0].pointName === null && /nghĩa địa cổ/.test(svI.clues[0].text));

    // ---- Chân 10: restart + autosave offline ----
    cC.socket.disconnect();
    await sleep(500);
    await stopServer();
    await startServer(3712, '356b');
    const cC2 = connect('tk356dv001'); await waitFor(() => cC2.welcome, 20000);
    ok('chân 10a: sau restart sổ còn dv_hoa', foundIds(cC2).includes('dv_hoa'), JSON.stringify(foundIds(cC2)));
    cC2.socket.disconnect();
    await sleep(21000); // chờ autosave của diễn viên offline (15s) ghi file
    const fileChars = JSON.parse(fs.readFileSync(path.join(DIR, 'characters.json'), 'utf8'));
    const soulC = fileChars['tk356dv001'] && fileChars['tk356dv001'].soul;
    ok('chân 10b: file sau autosave offline giữ soul.secrets.dv_hoa', !!(soulC && soulC.secrets && soulC.secrets.dv_hoa), JSON.stringify(soulC && soulC.secrets));
    await stopServer();
  } catch (e) {
    console.log('PROBE-ERR', e && e.message);
    try { await stopServer(); } catch (e2) {}
    fail++;
  }
  console.log(`=== GĐ356: ${pass} PASS / ${fail} FAIL ===`);
  process.exit(fail ? 1 : 0);
})();
