// TEST GĐ60 — KINH TẾ DI CHUYỂN + MAP SIÊU TO + HỘ TỐNG:
// A) LK nghèo (30 LT): dịch chuyển 50 LT bị từ chối (thiếu Linh thạch); ngự kiếm bị từ chối (chưa Kim Đan).
// B) TC9 giàu: kích thước map mới (thành 2400×1800, farm 3800×2850, elemental 4000×3000),
//    decor dày, hang băng ở map băng, núi lửa + hố lửa ở Hỏa Diệm Sơn (đứng vào hố mất máu),
//    rắn Độc Xà ẨN trong snapshot — tới gần <130px thì HIỆN hình; phí dịch chuyển trừ đúng
//    (đích LK 50 / TC 150; về thành & làng MIỄN PHÍ); map_overview đủ 51 map.
// C) Kim Đan: ngự kiếm miễn phí nhưng CHẬM (journey_started → một lúc sau mới tới; đi bộ là HỦY);
//    đảo biển: portal bị cấm, thuyền từ thành đi được 2 chiều, thuyền từ làng bị cấm (sai chặng);
//    rừng elemental decor ≥300.
// D) HỘ TỐNG: nhận việc ở Lái Buôn → thương nhân đi theo; C (KD) làm quan sát viên ở map đích:
//    lúc B tới nơi có 2 quái MỚI phục kích gần điểm đáp; đi qua Trận miễn phí; đưa thương nhân
//    tới điểm giao hàng giữa map → escort_done + thưởng; nhận chuyến mới rồi BỎ → thương nhân biến mất.
const { io } = require('socket.io-client');
const { spawn } = require('child_process');
const fs = require('fs');
const { createMerger } = require('./worldmerge.cjs');

const PORT = 3078;
const URL = `http://localhost:${PORT}`;
const CHAR_FILE = '/tmp/ttt-t47-chars.json';
const ACC_FILE = '/tmp/ttt-t47-acc.json';
const WORLD_FILE = '/tmp/ttt-t47-world.json';
const TOK_A = 'tok-g60-a', NAME_A = 'Linh Thach Ngheo';
const TOK_B = 'tok-g60-b', NAME_B = 'Ho Tong Vien';
const TOK_C = 'tok-g60-c', NAME_C = 'Kiem Tien KD';
let failures = 0;
function ok(cond, label) { console.log(`${cond ? 'PASS' : 'FAIL'}  ${label}`); if (!cond) failures++; }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function boot() {
  const proc = spawn('node', ['../server/index.js'], {
    cwd: __dirname,
    env: { ...process.env, PORT: String(PORT), TTT_CHAR_FILE: CHAR_FILE, TTT_ACC_FILE: ACC_FILE, TTT_WORLD_FILE: WORLD_FILE, TTT_JOURNEY_MS: '300' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  proc.stderr.on('data', (d) => process.stderr.write('[srv] ' + d));
  for (let i = 0; i < 60; i++) {
    try { const r = await fetch(`${URL}/api/status`); if (r.ok) return proc; } catch {}
    await sleep(300);
  }
  throw new Error('server không lên');
}
function waitEv(s, ev, ms = 9000) { return new Promise((res, rej) => { const t = setTimeout(() => rej(new Error('timeout ' + ev)), ms); s.once(ev, (d) => { clearTimeout(t); res(d); }); }); }
async function waitFor(fn, ms, label) { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (fn()) return true; await sleep(120); } throw new Error('waitFor: ' + label); }
function wireState(s) {
  const apply = createMerger();
  const S = { tick: null, sync: null, mapEnters: [] };
  s.on('server_tick', (t) => { const snap = apply(t); if (snap) S.tick = snap; });
  s.on('char_sync', (c) => { S.sync = c; });
  s.on('map_enter', (d) => { S.mapEnters.push(d); });
  return S;
}
const me = (S, name) => S.tick?.players?.find((p) => p.name === name);
const lastEnter = (S) => S.mapEnters[S.mapEnters.length - 1];
async function steerTo(s, S, x, y, tol = 16, ms = 45000, name) {
  const t0 = Date.now();
  let last = null, lastMove = Date.now(), sign = 1, wp = null;
  while (Date.now() - t0 < ms) {
    const p = me(S, name);
    if (!p) { await sleep(120); continue; }
    if (!last || Math.hypot(p.x - last.x, p.y - last.y) > 8) { last = { x: p.x, y: p.y }; lastMove = Date.now(); }
    const goal = wp || { x, y };
    const dx = goal.x - p.x, dy = goal.y - p.y;
    if (Math.hypot(dx, dy) <= tol) {
      if (wp) { wp = null; lastMove = Date.now(); continue; }
      s.emit('client_input', { vx: 0, vy: 0 });
      return p;
    }
    if (!wp && Date.now() - lastMove > 1200) { sign = -sign; wp = { x: p.x + 26, y: p.y + sign * 140 }; lastMove = Date.now(); }
    s.emit('client_input', { vx: Math.sign(dx) * Math.min(1, Math.abs(dx) / 40), vy: Math.sign(dy) * Math.min(1, Math.abs(dy) / 40) });
    await sleep(110);
  }
  s.emit('client_input', { vx: 0, vy: 0 });
  throw new Error(`steerTo timeout → (${x},${y})`);
}
async function joinGuest(token, name, classId) {
  const s = io(URL, { transports: ['websocket'] });
  const S = wireState(s);
  await new Promise((r) => s.on('connect', r));
  const needP = waitEv(s, 'need_character').catch(() => null);
  const welP = waitEv(s, 'welcome').catch(() => null);
  s.emit('hello', { token });
  const first = await Promise.race([needP.then(() => 'need'), welP.then(() => 'welcome')]);
  if (first === 'need') {
    s.emit('request_roll');
    await waitEv(s, 'roll_result');
    const w2 = waitEv(s, 'welcome');
    s.emit('create_character', { token, name, classId });
    await w2;
  }
  return { s, S };
}
function patchChar(name, fn) {
  const chars = JSON.parse(fs.readFileSync(CHAR_FILE, 'utf8'));
  const key = Object.keys(chars).find((k) => chars[k].name === name);
  fn(chars[key]);
  fs.writeFileSync(CHAR_FILE, JSON.stringify(chars));
}
async function travelTo(s, S, mapId, method = 'portal', ms = 8000) {
  const before = S.mapEnters.length;
  s.emit('travel_list');
  await waitEv(s, 'travel_info');
  s.emit('travel_to', { mapId, method });
  await waitFor(() => S.mapEnters.length > before, ms, 'map_enter ' + mapId);
  return lastEnter(S);
}
const STRONG = { khiHuyet: 60, vatCong: 60, vatPhong: 40, phapCong: 20, phapPhong: 20, tocDo: 30, thanThuc: 30 };
const LINH = { elements: ['kim'], main: 'kim', count: 1 };

(async () => {
  for (const f of [CHAR_FILE, ACC_FILE]) fs.rmSync(f, { force: true });
  fs.writeFileSync(WORLD_FILE, JSON.stringify({ totalMinutes: 10 * 1440 + 600, savedAt: Date.now() }));
  let proc = await boot();
  process.on('exit', () => { try { proc.kill('SIGKILL'); } catch {} });

  // Tạo 3 nhân vật rồi gán cảnh giới/tiền qua file (server dừng mới sửa được)
  let a = await joinGuest(TOK_A, NAME_A, 'kiemtu');
  let b = await joinGuest(TOK_B, NAME_B, 'kiemtu');
  let c = await joinGuest(TOK_C, NAME_C, 'kiemtu');
  a.s.disconnect(); b.s.disconnect(); c.s.disconnect();
  await sleep(1300);
  proc.kill('SIGKILL');
  await sleep(600);
  patchChar(NAME_A, (x) => Object.assign(x, { realm: 'lk', tier: 1, stats: STRONG, hp: 700, stones: 30, linhCan: LINH }));
  patchChar(NAME_B, (x) => Object.assign(x, { realm: 'tc', tier: 9, stats: STRONG, hp: 700, stones: 100000, linhCan: LINH }));
  patchChar(NAME_C, (x) => Object.assign(x, { realm: 'kd', tier: 1, stats: STRONG, hp: 700, stones: 100000, linhCan: LINH }));
  proc = await boot();
  a = await joinGuest(TOK_A, NAME_A, 'kiemtu');
  b = await joinGuest(TOK_B, NAME_B, 'kiemtu');
  c = await joinGuest(TOK_C, NAME_C, 'kiemtu');
  await waitFor(() => !!me(a.S, NAME_A) && !!me(b.S, NAME_B) && !!me(c.S, NAME_C), 9000, 'cả 3 vào làng');
  const { s: sA, S: SA } = a, { s: sB, S: SB } = b, { s: sC, S: SC } = c;

  // ---------- A) LK nghèo: thiếu Linh thạch + chưa Kim Đan ----------
  await steerTo(sA, SA, 1080, 620, 18, 30000, NAME_A);
  let errP = waitEv(sA, 'interact_error').catch(() => null);
  sA.emit('travel_to', { mapId: 'thanh_van_thanh', method: 'portal' });
  let err = await errP;
  ok(!!err && /Linh thạch/i.test(JSON.stringify(err)), `A: 30 LT < phí 50 → bị từ chối vì Linh thạch (${err ? 'có lỗi' : 'KHÔNG lỗi'})`);
  ok(lastEnter(SA).isHome === true, 'A: vẫn ở làng sau khi bị từ chối');
  errP = waitEv(sA, 'interact_error').catch(() => null);
  sA.emit('travel_to', { mapId: 'thanh_van_thanh', method: 'fly' });
  err = await errP;
  ok(!!err, 'A: Luyện Khí ngự kiếm → bị từ chối (chỉ Kim Đan)');
  sA.disconnect();

  // ---------- B) TC9: tham quan + giá + rắn ẩn + hố lửa ----------
  await steerTo(sB, SB, 1080, 620, 18, 30000, NAME_B);
  const cityE = await travelTo(sB, SB, 'thanh_van_thanh');
  ok(cityE.w === 2400 && cityE.h === 1800, 'B: Thanh Vân Thành 2400×1800');
  ok(SB.sync?.stones === 99950, `B: phí vào thành 50 LT (100000 → ${SB.sync?.stones})`);
  const iceE = await travelTo(sB, SB, 'bang_phong_coc');
  ok(iceE.w === 3800 && iceE.h === 2850, 'B: Băng Phong Cốc (farm) 3800×2850');
  ok(Array.isArray(iceE.features?.caves) && iceE.features.caves.length >= 1, `B: map băng có hang băng (${iceE.features?.caves?.length})`);
  await travelTo(sB, SB, 'thanh_van_thanh');
  ok(SB.sync?.stones === 99900, `B: đi tiếp 50 LT, về thành MIỄN PHÍ (→ ${SB.sync?.stones})`);
  const swampE = await travelTo(sB, SB, 'hac_am_dam_lay');
  ok(swampE.w === 3800 && swampE.h === 2850, 'B: Hắc Ám Đầm Lầy (farm) 3800×2850');
  ok(SB.sync?.stones === 99750, `B: phí map Trúc Cơ 150 LT (→ ${SB.sync?.stones})`);
  await sleep(600);
  const snakes = (SB.tick?.monsters || []).filter((m) => m.kind === 'doc_xa');
  ok(snakes.length >= 6, `B: đầm lầy có nhiều Độc Xà (${snakes.length})`);
  const hiddenSnake = snakes.filter((m) => m.hidden === 1)
    .sort((x, y) => Math.hypot(x.x - swampE.portal.x, x.y - swampE.portal.y) - Math.hypot(y.x - swampE.portal.x, y.y - swampE.portal.y))[0];
  ok(!!hiddenSnake, 'B: Độc Xà đang ẨN trong snapshot (phục kích)');
  if (hiddenSnake) {
    // lái tới cách rắn ~120px (bán kính hiện hình 130) — rừng đầm lầy dày, kẹt cây thì cũng đã đủ gần
    await steerTo(sB, SB, hiddenSnake.x, hiddenSnake.y, 118, 45000, NAME_B).catch(() => {});
    await waitFor(() => { const m = (SB.tick?.monsters || []).find((x) => x.id === hiddenSnake.id); return m && m.hidden === 0; }, 8000, 'rắn hiện hình');
    ok(true, 'B: tới gần <130px → Độc Xà HIỆN hình lao ra');
  }
  await steerTo(sB, SB, swampE.portal.x, swampE.portal.y - 56, 20, 60000, NAME_B); // về cổng mới dịch chuyển được
  await travelTo(sB, SB, 'thanh_van_thanh');
  const lavaE = await travelTo(sB, SB, 'hoa_diem_son');
  ok(!!lavaE.features?.volcano, 'B: Hỏa Diệm Sơn có NÚI LỬA');
  ok(Array.isArray(lavaE.hazards) && lavaE.hazards.length >= 5, `B: Hỏa Diệm Sơn có ${lavaE.hazards?.length} hố lửa`);
  const ovP = waitEv(sB, 'overview_data');
  sB.emit('map_overview');
  const ov = await ovP;
  ok(ov.maps.length === 51 && ov.current.mapId === 'hoa_diem_son' && ov.current.decor.length > 100, `B: map_overview đủ 51 map + chi tiết map hiện tại (decor ${ov.current.decor.length})`);
  if (lavaE.hazards?.length) {
    const meB = me(SB, NAME_B);
    const pit = lavaE.hazards.reduce((p, h) => (Math.hypot(h.x - meB.x, h.y - meB.y) < Math.hypot(p.x - meB.x, p.y - meB.y) ? h : p), lavaE.hazards[0]);
    await steerTo(sB, SB, pit.x, pit.y, 14, 60000, NAME_B);
    const hp0 = me(SB, NAME_B).hp;
    await sleep(3400);
    const hp1 = me(SB, NAME_B).hp;
    ok(hp1 <= hp0 - 9, `B: đứng trong hố lửa mất máu (${hp0} → ${hp1})`);
  }
  await steerTo(sB, SB, lavaE.portal.x, lavaE.portal.y - 56, 20, 60000, NAME_B);
  await travelTo(sB, SB, 'thanh_van_thanh');
  await travelTo(sB, SB, 'lang_tan_thu');
  ok(SB.sync?.stones === 99700, `B: tổng phí cả chuyến 300 LT, về làng miễn phí (→ ${SB.sync?.stones})`);

  // ---------- C) Kim Đan: ngự kiếm + thuyền + rừng dày ----------
  await steerTo(sC, SC, 1080, 620, 18, 30000, NAME_C);
  const journeyP = waitEv(sC, 'journey_started');
  const cityBefore = SC.mapEnters.length;
  sC.emit('travel_to', { mapId: 'thanh_van_thanh', method: 'fly' });
  const journey = await journeyP;
  ok(journey.method === 'fly', `C: ngự kiếm bắt đầu hành trình (báo ${journey.seconds}s — TTT_JOURNEY_MS=300 làm tròn xuống 0, bản thật 15s/chặng)`);
  await sleep(150);
  ok(SC.mapEnters.length === cityBefore, 'C: ngự kiếm CHẬM — sau 150ms vẫn chưa tới (đúng ý chậm hơn dịch chuyển)');
  await waitFor(() => SC.mapEnters.length > cityBefore, 5000, 'ngự kiếm tới thành');
  ok(lastEnter(SC).mapId === 'thanh_van_thanh' && SC.sync?.stones === 100000, `C: ngự kiếm tới thành, MIỄN PHÍ (map=${lastEnter(SC).mapId}, stones=${SC.sync?.stones})`);
  // hủy hành trình bằng cách di chuyển
  const journey2P = waitEv(sC, 'journey_started');
  sC.emit('travel_to', { mapId: 'hoa_diem_son', method: 'fly' });
  await journey2P;
  const cancelP = waitEv(sC, 'journey_cancelled').catch(() => null);
  sC.emit('client_input', { vx: 1, vy: 0 });
  const cancelled = await cancelP;
  sC.emit('client_input', { vx: 0, vy: 0 });
  await sleep(1500);
  ok(!!cancelled && lastEnter(SC).mapId === 'thanh_van_thanh', 'C: đang bay mà di chuyển → HỦY hành trình, vẫn ở thành');
  // rừng elemental: decor dày
  const forestE = await travelTo(sC, SC, 'thanh_moc_lam');
  ok(forestE.w === 4000 && forestE.h === 3000 && forestE.decor.length >= 300, `C: Thanh Mộc Lâm 4000×3000, decor dày (${forestE.decor.length} vật)`);
  ok(SC.sync?.stones === 99600, `C: phí map Kim Đan 400 LT (→ ${SC.sync?.stones})`);
  await travelTo(sC, SC, 'thanh_van_thanh');
  // đảo biển: portal cấm, thuyền được
  errP = waitEv(sC, 'interact_error').catch(() => null);
  sC.emit('travel_to', { mapId: 'tham_hai_bi_canh', method: 'portal' });
  err = await errP;
  ok(!!err && lastEnter(SC).mapId === 'thanh_van_thanh', 'C: Trận Dịch Chuyển KHÔNG tới được đảo biển');
  const boatP = waitEv(sC, 'journey_started');
  sC.emit('travel_to', { mapId: 'tham_hai_bi_canh', method: 'boat' });
  const boat = await boatP;
  ok(boat.method === 'boat', 'C: đi THUYỀN ra đảo — hành trình bắt đầu');
  await waitFor(() => lastEnter(SC).mapId === 'tham_hai_bi_canh', 6000, 'thuyền tới đảo');
  ok(true, 'C: thuyền cập đảo Thâm Hải Bí Cảnh');
  await travelTo(sC, SC, 'thanh_van_thanh', 'boat');
  ok(lastEnter(SC).mapId === 'thanh_van_thanh', 'C: thuyền về lại thành');
  await travelTo(sC, SC, 'lang_tan_thu');
  errP = waitEv(sC, 'interact_error').catch(() => null);
  sC.emit('travel_to', { mapId: 'tham_hai_bi_canh', method: 'boat' });
  err = await errP;
  ok(!!err && lastEnter(SC).isHome === true, 'C: thuyền từ LÀNG ra đảo bị cấm (thuyền chỉ chạy chặng thành ↔ đảo)');

  // ---------- D) HỘ TỐNG: B nhận việc, C làm quan sát viên ----------
  await steerTo(sB, SB, 1005, 545, 20, 30000, NAME_B);
  const dlgP = waitEv(sB, 'npc_dialog');
  sB.emit('talk_npc', { npcId: 'npc_laibuan' });
  const dlg = await dlgP;
  ok(!!dlg.escortInfo && Array.isArray(dlg.escortInfo.missions) && dlg.escortInfo.missions.length >= 3, `D: Lái Buôn có ${dlg.escortInfo?.missions?.length} chuyến hộ tống cho TC9`);
  const mission = dlg.escortInfo.missions[0];
  // C đi trước tới map đích, ghi lại id quái hiện có
  await steerTo(sC, SC, 1080, 620, 18, 30000, NAME_C);
  await travelTo(sC, SC, 'thanh_van_thanh');
  await travelTo(sC, SC, mission.id);
  await sleep(700);
  const idsBefore = new Set((SC.tick?.monsters || []).map((m) => m.id));
  ok(idsBefore.size >= 5, `D: quan sát viên C đã ở ${mission.name}, thấy ${idsBefore.size} quái`);
  // B nhận việc → thương nhân xuất hiện đi theo
  const startedP = waitEv(sB, 'escort_started');
  sB.emit('escort_accept', { mapId: mission.id });
  const started = await startedP;
  ok(started.dest === mission.id, `D: nhận hộ tống tới ${started.destName}`);
  await waitFor(() => (SB.tick?.players || []).some((p) => /Thương Nhân/.test(p.name)), 6000, 'thương nhân xuất hiện');
  ok(true, 'D: thương nhân xuất hiện cạnh B tại làng');
  ok(SB.sync?.escort?.dest === mission.id, 'D: char_sync có trạng thái hộ tống');
  // B đi qua Trận theo tuyến làng → thành → map đích: cả 2 chặng miễn phí + tới nơi có phục kích
  const stonesBeforeTrip = SB.sync.stones;
  await steerTo(sB, SB, 1080, 620, 18, 30000, NAME_B);
  await travelTo(sB, SB, 'thanh_van_thanh');
  ok(SB.sync?.stones === stonesBeforeTrip, 'D: chặng làng → thành MIỄN PHÍ khi đang hộ tống');
  const arrE = await travelTo(sB, SB, mission.id);
  ok(SB.sync?.stones === stonesBeforeTrip, 'D: chặng thành → map hộ tống MIỄN PHÍ');
  await sleep(900);
  const arrival = { x: arrE.portal.x, y: arrE.portal.y - 56 };
  const newMons = (SC.tick?.monsters || []).filter((m) => !idsBefore.has(m.id));
  const ambushNear = newMons.filter((m) => Math.hypot(m.x - arrival.x, m.y - arrival.y) < 300);
  ok(newMons.length >= 2 && ambushNear.length >= 1, `D: PHỤC KÍCH — ${newMons.length} quái mới xuất hiện khi đoàn tới, ${ambushNear.length} con ngay gần điểm đáp`);
  // đưa thương nhân tới điểm giao hàng (giữa map)
  const delivery = SB.sync?.escort?.delivery;
  ok(!!delivery, 'D: có điểm giao hàng trong char_sync');
  const doneP = waitEv(sB, 'escort_done', 90000).catch(() => null);
  await steerTo(sB, SB, delivery.x, delivery.y, 40, 75000, NAME_B);
  const done = await doneP;
  ok(!!done && done.stones === started.reward.stones, `D: giao hàng xong → escort_done, thưởng ${done?.stones} LT + ${done?.tuVi} Tu vi`);
  await waitFor(() => !SB.sync?.escort, 5000, 'hộ tống cleared');
  ok((SB.sync?.stones ?? 0) === stonesBeforeTrip + started.reward.stones, `D: Linh thạch tăng đúng thưởng (→ ${SB.sync?.stones})`);
  // nhận chuyến khác rồi bỏ giữa chừng
  await steerTo(sB, SB, arrE.portal.x, arrE.portal.y - 56, 20, 75000, NAME_B);
  await travelTo(sB, SB, 'thanh_van_thanh');
  await travelTo(sB, SB, 'lang_tan_thu');
  await steerTo(sB, SB, 1005, 545, 20, 30000, NAME_B);
  const started2P = waitEv(sB, 'escort_started');
  sB.emit('escort_accept', { mapId: mission.id });
  await started2P;
  await waitFor(() => (SB.tick?.players || []).some((p) => /Thương Nhân/.test(p.name)), 6000, 'thương nhân chuyến 2');
  sB.emit('escort_abandon');
  await waitFor(() => !SB.sync?.escort && !(SB.tick?.players || []).some((p) => /Thương Nhân/.test(p.name)), 6000, 'bỏ chuyến xong');
  ok(true, 'D: bỏ chuyến → thương nhân biến mất, trạng thái hộ tống xóa');

  sB.disconnect(); sC.disconnect();
  proc.kill('SIGKILL');
  console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAIL`);
  process.exit(failures ? 1 : 0);
})().catch((e) => { console.error('TEST ERROR', e); process.exit(2); });
