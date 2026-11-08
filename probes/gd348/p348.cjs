// Probe GĐ348 — SỬA CHỮ SAI SỰ THẬT + NỐI PERK VƯỜN THẢO (Bảo duyệt 08/11/2026).
// 1) Panel/payload: mốc Đạo Tích 220/650 active=true không why; 350 why mới (Hành trang chuyển kiếp),
//    500 why mới (soulNorm); KHÔNG mốc nào còn chữ "không có kiếp sau"; perk vườn linh_thu[1] parked=false;
//    perk nhân duyên[2] why mới nhắc "đã có chỉ điểm".
// 2) Vườn (TTT_GARDEN_PT_MS=1000 → 1 điểm lớn/1s ở hệ số 1.0; ngưỡng giai đoạn 2/3/4 = 12/22/35 điểm):
//    bề mặt đo = sự kiện 'garden_plants' (gardenView → gardenStage thật, phát mỗi tick 100ms khi đổi giai đoạn).
//    Đối chứng 4 chủ cây trồng cùng lúc: A không mốc (×1.00), B mốc 2 Linh Thú (×1.05), C mốc 2 + boost (×1.10),
//    D chỉ mốc 1 (×1.00 — biên: perk cần mốc >= 2). Kỳ vọng tới giai đoạn 3: A/D ≈ 22.0s, B ≈ 20.95s, C ≈ 20.0s.
// 3) Boost: perk vườn KHÔNG gắn noBoost → ach_choose_boost linh_thu/2 THÀNH CÔNG (khác perk cơ duyên GĐ347).
// 4) Thọ mốc Đạo Tích: hồn chết (raceChoicePending) với daoTich 219/220/649/650/800 → tạo kiếp mới chọn tộc Nhân
//    (thọ nền 80, thiên phú suc_luc không cộng thọ) → lifespan = 80 / 82 / 82 / 86 / 86.
// 5) Hồi quy: mốc 120/780 bốc lại thiên phú không đổi (daoTich 220 → 1 lượt; 800 → 2 lượt);
//    thu hoạch vườn của người không mốc chạy bình thường (+3 thảo).
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
let serverProc = null, killTimer = null, CUR_PORT = 3655;
async function startServer(port, tag) {
  CUR_PORT = port;
  if (!(await portFree(port))) throw new Error('port ban ' + port);
  serverProc = spawn('node', ['server/index.js'], { cwd: ROOT, env: { ...process.env, PORT: String(port), TTT_STORAGE: 'file', TTT_CHAR_FILE: path.join(DIR, 'characters.json'), TTT_ACC_FILE: path.join(DIR, 'accounts.json'), TTT_WORLD_FILE: path.join(DIR, 'world.json'), TTT_SESS_FILE: path.join(DIR, 'sessions.json'), TTT_DAY_REAL_MS: '600000', TTT_TUVI_NEED: '5', TTT_GARDEN_PT_MS: '1000', TTT_GARDEN_WATER_CD_MS: '0' }, stdio: ['ignore', 'pipe', 'pipe'] });
  serverProc.stderr.on('data', (d) => { try { fs.appendFileSync(path.join(DIR, 'srv_' + tag + '.log'), d); } catch (e) {} });
  serverProc.stdout.on('data', (d) => { try { fs.appendFileSync(path.join(DIR, 'srv_' + tag + '.log'), d); } catch (e) {} });
  killTimer = setTimeout(() => { try { serverProc.kill('SIGKILL'); } catch (e) {} }, 420000);
  const t0 = Date.now();
  while (Date.now() - t0 < 45000) { try { const r = await fetch(`http://127.0.0.1:${port}/api/status`); if (r.ok) { clearTimeout(killTimer); return; } } catch (e) {} await sleep(500); }
  throw new Error('server khong len');
}
async function stopServer() { if (!serverProc) return; const p = serverProc; serverProc = null; await new Promise((res) => { const t = setTimeout(() => { try { p.kill('SIGKILL'); } catch (e) {} res(); }, 4000); p.once('exit', () => { clearTimeout(t); res(); }); try { p.kill('SIGTERM'); } catch (e) { clearTimeout(t); res(); } }); const t0 = Date.now(); while (Date.now() - t0 < 10000 && !(await portFree(CUR_PORT))) await sleep(300); }
const STATS = { khiHuyet: 8000, vatCong: 400, vatPhong: 250, phapCong: 400, phapPhong: 250, tocDo: 60, minhMan: 100 };
const LC1 = { elements: ['kim'], main: 'kim', count: 1, mutations: [] };
function BASE(token, name, extra) {
  return Object.assign({ token, name, classId: 'kiemtu', gender: 'nam', race: null, geo175: 1, realm: 'lk', tier: 9, x: 1565, y: 1252, mapId: 'lang_tan_thu', hp: 99999, lifespan: 500, birthDay: -5660, ageStart: 16, stats: { ...STATS }, statPoints: 0, freePoints: 0, tuVi: 99999, stones: 0, stonesTrung: 0, stonesThuong: 0, stonesCuc: 0, inventory: {}, gearBag: {}, equipped: [], skills: [], job: null, job2: null, job3: null, linhCan: { ...LC1 }, affinity: {}, affV2: 1, bonds: {}, quests: {}, questsDone: {}, flags: {}, counters: {}, disciples: [], foundInvites: [], reformIn: [], sectTech: [], sectArts: [], sectArtsActive: [], mails: [], classRes: {}, food: 100, water: 100 }, extra || {});
}
function ACH(tiers, extra) { return { achState: Object.assign({ tiers: tiers || {}, title: null, daoTich: 0, notified: {} }, extra || {}) }; }
// Đạo Tích nhóm linh_thu từ bậc ĐÃ NHẬN (daoTichForTier: bậc 1-3 = 1, bậc 4 = 2):
// ach_lt_tame nhận 5 bậc = 7, ach_lt_mount 4 bậc = 5, ach_lt_herbtypes 4 bậc = 5.
const TIERS_LT_M1 = { ach_lt_tame: 5, ach_lt_mount: 4 }; // 12 -> mốc 1 (perk vườn cần mốc >= 2 nên CHƯA có)
const TIERS_LT_M2 = { ach_lt_tame: 5, ach_lt_mount: 4, ach_lt_herbtypes: 4 }; // 17 -> mốc 2 (perk vườn mở)
function DEAD(token, name, daoTich) {
  return BASE(token, name, { dead: true, deadAt: '2026-11-08T00:00:00.000Z', soul: { lives: 2, fullLives: 1, consumed: false, raceChoicePending: true }, achState: { tiers: {}, title: null, daoTich, notified: {} } });
}
let pass = 0, fail = 0;
function ok(name, cond, extra) { if (cond) { pass++; console.log('PASS | ' + name); } else { fail++; console.log('FAIL | ' + name + (extra ? ' | ' + extra : '')); } }
function connect(token) {
  const socket = io(`http://127.0.0.1:${CUR_PORT}`, { transports: ['websocket'] });
  const ctx = { socket, merger: createMerger(), state: null, welcome: null, needChar: false, tstate: [], syncs: [], errs: [], boosts: [], notices: [], gplants: [], createErr: null, myName: null };
  socket.on('connect', () => socket.emit('hello', { token }));
  socket.on('welcome', (w) => { ctx.welcome = w; ctx.myName = (w.character || {}).name; });
  socket.on('need_character', () => { ctx.needChar = true; });
  socket.on('create_error', (e) => { ctx.createErr = e.message || ''; });
  socket.on('talent_state', (s) => ctx.tstate.push(s));
  socket.on('char_sync', (s) => ctx.syncs.push(s));
  socket.on('notice', (n) => ctx.notices.push(n.text || ''));
  socket.on('interact_error', (e) => ctx.errs.push(e.message || ''));
  socket.on('ach_boost_result', (r) => ctx.boosts.push(r));
  socket.on('garden_plants', (d) => ctx.gplants.push({ at: Date.now(), plants: d.plants || [] }));
  socket.on('server_tick', (t) => { const st = ctx.merger(t); if (st) ctx.state = st; });
  return ctx;
}
const meOf = (c) => (c.state?.players || []).find((p) => p.name === c.myName) || null;
async function steerTo(c, x, y, tol) {
  const t0 = Date.now();
  while (Date.now() - t0 < 25000) { const me = meOf(c); if (!me) { await sleep(120); continue; } const dx = x - me.x, dy = y - me.y; const d = Math.hypot(dx, dy); if (d <= (tol || 45)) break; c.socket.emit('client_input', { vx: dx / d, vy: dy / d }); await sleep(110); }
  c.socket.emit('client_input', { vx: 0, vy: 0 });
}
const grpOf = (ch, id) => (((ch || {}).achievements || {}).groups || []).find((g) => g.id === id);
const SPOTS = [{ id: 0, x: 900, y: 1800 }, { id: 1, x: 1030, y: 1800 }, { id: 2, x: 1160, y: 1800 }, { id: 3, x: 1290, y: 1800 }];

(async () => {
  const chars = {};
  chars['tk348panel'] = BASE('tk348panel', 'P348Panel', ACH({}));
  chars['tk348gardA'] = BASE('tk348gardA', 'P348CtrlA', Object.assign(ACH({}), { x: SPOTS[0].x, y: SPOTS[0].y, inventory: { thao_duoc: 3 } }));
  chars['tk348gardB'] = BASE('tk348gardB', 'P348PerkB', Object.assign(ACH({ ...TIERS_LT_M2 }), { x: SPOTS[1].x, y: SPOTS[1].y, inventory: { thao_duoc: 3 } }));
  chars['tk348gardC'] = BASE('tk348gardC', 'P348BoostC', Object.assign(ACH({ ...TIERS_LT_M2 }, { groupComplete: { linh_thu: true } }), { x: SPOTS[2].x, y: SPOTS[2].y, inventory: { thao_duoc: 3 } }));
  chars['tk348gardD'] = BASE('tk348gardD', 'P348M1D', Object.assign(ACH({ ...TIERS_LT_M1 }), { x: SPOTS[3].x, y: SPOTS[3].y, inventory: { thao_duoc: 3 } }));
  chars['tk348d219'] = DEAD('tk348d219', 'P348Dead219', 219);
  chars['tk348d220'] = DEAD('tk348d220', 'P348Dead220', 220);
  chars['tk348d649'] = DEAD('tk348d649', 'P348Dead649', 649);
  chars['tk348d650'] = DEAD('tk348d650', 'P348Dead650', 650);
  chars['tk348d800'] = DEAD('tk348d800', 'P348Dead800', 800);
  fs.writeFileSync(path.join(DIR, 'characters.json'), JSON.stringify(chars, null, 1));
  fs.writeFileSync(path.join(DIR, 'accounts.json'), JSON.stringify({}, null, 1));
  for (const f of ['world.json', 'sessions.json']) { try { fs.unlinkSync(path.join(DIR, f)); } catch (e) {} }
  await startServer(3655, '348');

  // ---- 1) Panel/payload: chữ mốc + perk ----
  {
    const c = connect('tk348panel');
    await waitFor(() => c.welcome, 20000);
    const ch = c.welcome.character;
    const dm = (ch.achievements || {}).daoMilestones || [];
    const m = (at) => dm.find((x) => x.at === at);
    ok('1a payload có daoMilestones đủ 8 mốc', dm.length === 8, JSON.stringify(dm.map((x) => x.at)));
    ok('1b mốc 220: active=true, không why', !!m(220) && m(220).active === true && !m(220).why, JSON.stringify(m(220)));
    ok('1c mốc 650: active=true, không why', !!m(650) && m(650).active === true && !m(650).why, JSON.stringify(m(650)));
    ok('1d mốc 350: why mới nhắc Hành trang chuyển kiếp, hết chữ "không có kiếp sau"', !!m(350) && /Hành trang chuyển kiếp/.test(m(350).why || '') && !/không có kiếp sau/.test(m(350).why || ''), JSON.stringify(m(350)));
    ok('1e mốc 500: why mới nhắc soulNorm/chuẩn hóa hồn', !!m(500) && /soulNorm|chuẩn hóa hồn/.test(m(500).why || ''), JSON.stringify(m(500)));
    ok('1f KHÔNG mốc nào còn why chứa "không có kiếp sau"', dm.every((x) => !/không có kiếp sau/.test(x.why || '')), JSON.stringify(dm.filter((x) => /không có kiếp sau/.test(x.why || ''))));
    const lt = grpOf(ch, 'linh_thu');
    ok('1g perk vườn (linh_thu mốc 2): parked=false, không why, text đúng', !!lt && lt.perks && lt.perks[1] && lt.perks[1].parked === false && !lt.perks[1].why && /sinh trưởng nhanh hơn 5%/.test(lt.perks[1].text), JSON.stringify(lt && lt.perks && lt.perks[1]));
    const nd = grpOf(ch, 'nhan_duyen');
    ok('1h perk chỉ điểm (nhan_duyen mốc 3): vẫn parked nhưng why mới nhắc "đã có chỉ điểm"', !!nd && nd.perks && nd.perks[2] && nd.perks[2].parked === true && /đã có chỉ điểm/.test(nd.perks[2].why || ''), JSON.stringify(nd && nd.perks && nd.perks[2]));
    c.socket.disconnect();
  }

  // ---- 2+3+5b) Vườn: 4 chủ cây, boost, thu hoạch hồi quy ----
  {
    const owners = [
      { tk: 'tk348gardA', spot: SPOTS[0], label: 'A không mốc x1.00' },
      { tk: 'tk348gardB', spot: SPOTS[1], label: 'B mốc 2 x1.05' },
      { tk: 'tk348gardC', spot: SPOTS[2], label: 'C mốc 2 + boost x1.10' },
      { tk: 'tk348gardD', spot: SPOTS[3], label: 'D mốc 1 x1.00' },
    ];
    const ctxs = {};
    for (const o of owners) { const c = connect(o.tk); ctxs[o.tk] = c; await waitFor(() => c.welcome, 20000); await waitFor(() => meOf(c), 15000); }
    const cC = ctxs['tk348gardC'];
    cC.socket.emit('ach_choose_boost', { groupId: 'linh_thu', perk: 2 });
    const bOk = await waitFor(() => cC.boosts.find((r) => r.ok && r.groupId === 'linh_thu' && r.perk === 2), 6000);
    ok('3a boost perk vườn (linh_thu/2) THÀNH CÔNG — perk không gắn noBoost, cơ chế boost chọn được', !!bOk, JSON.stringify({ boosts: cC.boosts, errs: cC.errs }));
    const syncC = await waitFor(() => { const s = cC.syncs[cC.syncs.length - 1]; return s && grpOf(s, 'linh_thu') && grpOf(s, 'linh_thu').boost === 2 ? s : null; }, 6000);
    ok('3b payload sau boost: nhóm linh_thu boost=2', !!syncC, JSON.stringify(syncC && grpOf(syncC, 'linh_thu') && grpOf(syncC, 'linh_thu').boost));
    for (const o of owners) await steerTo(ctxs[o.tk], o.spot.x, o.spot.y, 45);
    const t0s = {};
    for (const o of owners) { t0s[o.tk] = Date.now(); ctxs[o.tk].socket.emit('garden_plant', { spotId: o.spot.id, herbId: 'thao_duoc' }); await sleep(60); }
    const rec = ctxs['tk348gardA'];
    const allPlanted = await waitFor(() => { const last = rec.gplants[rec.gplants.length - 1]; return last && owners.every((o) => last.plants.some((p) => p.spotId === o.spot.id)) ? last : null; }, 8000);
    ok('2a cả 4 chủ cây trồng được (kể cả người không mốc)', !!allPlanted, JSON.stringify(rec.gplants.length));
    const plantId = {};
    if (allPlanted) for (const o of owners) plantId[o.tk] = (allPlanted.plants.find((p) => p.spotId === o.spot.id) || {}).id;
    const tStage = {}; // tStage[tk][k] = ms từ lúc trồng tới lần đầu stage >= k
    const deadline = Date.now() + 50000;
    while (Date.now() < deadline) {
      for (const o of owners) {
        tStage[o.tk] = tStage[o.tk] || {};
        for (const k of [3, 4]) {
          if (tStage[o.tk][k] == null) {
            const ev = rec.gplants.find((e) => { const p = e.plants.find((x) => x.id === plantId[o.tk]); return p && p.stage >= k; });
            if (ev) tStage[o.tk][k] = ev.at - t0s[o.tk];
          }
        }
      }
      const allThree = owners.every((o) => tStage[o.tk] && tStage[o.tk][3] != null);
      const abFour = tStage['tk348gardA'][4] != null && tStage['tk348gardB'][4] != null;
      if (allThree && abFour) break;
      await sleep(150);
    }
    const tA = tStage['tk348gardA'][3], tB = tStage['tk348gardB'][3], tC = tStage['tk348gardC'][3], tD = tStage['tk348gardD'][3];
    ok('2b mọi cây đều tới được giai đoạn 3 (đo được bề mặt garden_plants)', [tA, tB, tC, tD].every((v) => typeof v === 'number'), JSON.stringify(tStage));
    if ([tA, tB, tC, tD].every((v) => typeof v === 'number')) {
      ok(`2c mốc 2 (x1.05) nhanh hơn không mốc ở giai đoạn 3: B=${tB}ms < A=${tA}ms ít nhất 600ms (kỳ vọng ~1050ms)`, tB <= tA - 600, `A=${tA} B=${tB}`);
      ok(`2d tỉ lệ B/A vào [0.90, 0.99] (kỳ vọng 0.952)`, tB / tA >= 0.90 && tB / tA <= 0.99, (tB / tA).toFixed(3));
      ok(`2e boost (x1.10) nhanh hơn mốc 2 thường: C=${tC}ms < B=${tB}ms ít nhất 500ms (kỳ vọng ~950ms)`, tC <= tB - 500, `B=${tB} C=${tC}`);
      ok(`2f tỉ lệ C/A vào [0.85, 0.96] (kỳ vọng 0.909)`, tC / tA >= 0.85 && tC / tA <= 0.96, (tC / tA).toFixed(3));
      ok(`2g biên mốc 1 (chưa đủ mốc 2): D=${tD}ms ~ A=${tA}ms (lệch <= 600ms, cùng hệ số 1.00)`, Math.abs(tD - tA) <= 600, `A=${tA} D=${tD}`);
    }
    const tA4 = tStage['tk348gardA'][4], tB4 = tStage['tk348gardB'][4];
    ok(`2h giai đoạn 4 (chín): B=${tB4}ms < A=${tA4}ms ít nhất 1000ms (kỳ vọng ~1670ms)`, typeof tA4 === 'number' && typeof tB4 === 'number' && tB4 <= tA4 - 1000, `A4=${tA4} B4=${tB4}`);
    // Hồi quy thu hoạch: A (không mốc) hái cây chín của mình
    const cA = ctxs['tk348gardA'];
    cA.socket.emit('garden_harvest', { plantId: plantId['tk348gardA'] });
    const hv = await waitFor(() => cA.notices.find((n) => /Thu hoạch/.test(n)), 6000);
    ok('5b-i thu hoạch bình thường (người không mốc): có notice Thu hoạch', !!hv, JSON.stringify({ notices: cA.notices, errs: cA.errs }));
    const syncA = await waitFor(() => { const s = cA.syncs[cA.syncs.length - 1]; return s && s.inventory && s.inventory.thao_duoc === 5 ? s : null; }, 6000);
    ok('5b-ii túi sau thu hoạch: thao_duoc = 5 (3 ban đầu - 1 giống + 3 hái)', !!syncA, JSON.stringify(syncA && syncA.inventory));
    for (const o of owners) ctxs[o.tk].socket.disconnect();
  }

  // ---- 4+5a) Thọ mốc Đạo Tích qua tạo kiếp mới + hồi quy lượt bốc lại ----
  for (const [tk, dao, expectLife, expectReroll] of [
    ['tk348d219', 219, 80, null],
    ['tk348d220', 220, 82, 1],
    ['tk348d649', 649, 82, null],
    ['tk348d650', 650, 86, null],
    ['tk348d800', 800, 86, 2],
  ]) {
    const c = connect(tk);
    await waitFor(() => c.needChar, 20000);
    if (expectReroll != null) {
      c.socket.emit('talent_catalog_get');
      const st = await waitFor(() => { for (let i = c.tstate.length - 1; i >= 0; i--) { if (c.tstate[i].pending) return c.tstate[i]; } return null; }, 8000);
      ok(`5a hồi quy bốc lại: daoTich=${dao} -> rerollTotal=${expectReroll} (mốc 120/780 không đổi)`, !!st && st.pending.rerollTotal === expectReroll, JSON.stringify(st && st.pending));
    }
    c.socket.emit('talent_pick', { tier: 'vo', id: 'suc_luc' });
    await waitFor(() => { for (let i = c.tstate.length - 1; i >= 0; i--) { const s = c.tstate[i]; if (s.pending && s.pending.result === 'suc_luc' && s.pending.locked) return s; } return null; }, 8000);
    c.socket.emit('create_character', { name: 'Kiep348_' + dao, classId: 'kiemtu', race: 'nhan' });
    await waitFor(() => c.welcome, 20000);
    const life = c.welcome && c.welcome.character && c.welcome.character.lifespan;
    ok(`4 daoTich=${dao}: thọ kiếp mới (tộc Nhân nền 80) = ${expectLife}`, life === expectLife, `lifespan=${life} createErr=${c.createErr || ''}`);
    c.socket.disconnect();
    await sleep(200);
  }

  await stopServer();
  console.log(`\n=== GĐ348 PROBE: PASS ${pass} / FAIL ${fail} ===`);
  process.exit(fail ? 1 : 0);
})().catch(async (e) => { console.error('PROBE ERROR', e); try { await stopServer(); } catch (x) {} process.exit(2); });
