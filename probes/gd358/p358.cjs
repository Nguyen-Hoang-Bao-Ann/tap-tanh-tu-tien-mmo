// Probe GĐ358 — Hệ khám phá đợt 3: 15 điểm bí mật thuần + chuỗi manh mối 2 nấc + bộ đếm ach_kp_secrets.
// Chân kiểm:
//  1) Sổ đăng ký: tổng 104 điểm, loại thuan = 15 (log boot + payload).
//  2) Bộ đếm ach_kp_secrets: fixture đủ cờ 27 điểm manh mối + 15 điểm thuần -> progress 42 (>= 40, bậc 4 chạm được).
//  3) Phát hiện điểm thuần A1 (Dấu chân khổng lồ): ghi sổ + lore trong sổ + cờ file + progress +1 + mở manh mối chuỗi nấc 2;
//     idempotent khi đứng yên tại điểm.
//  4) Perk bản đồ: điểm đích chuỗi (chưa tìm, có manh mối) chỉ hiện dấu mờ lệch 200–400px trên payload, không lộ tọa độ thật.
//  5) Tới điểm đích chuỗi B (Mộ kiếm gãy): ghi sổ + manh mối chuỗi TỰ KHÉP (st=2).
//  6) Điểm đích chuỗi khác (Mộ cổ khóc) tìm được TỰ DO khi chưa hề có manh mối (không khóa khám phá).
//  7) Không perk + có manh mối mở: payload không có hints, không lộ điểm chưa phát hiện.
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
let serverProc = null, killTimer = null, CUR_PORT = 3720;
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
  const ctx = { socket, merger: createMerger(), state: null, welcome: null, needChar: false, syncs: [], errs: [], notices: [], dialogs: [], maps: [], marks: [], infos: [], myName: null };
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
  socket.on('server_tick', (t) => { const st = ctx.merger(t); if (st) ctx.state = st; });
  return ctx;
}
const lastChar = (c) => { for (let i = c.syncs.length - 1; i >= 0; i--) { if (c.syncs[i]) return c.syncs[i]; } return c.welcome ? c.welcome.character : null; };
const meOf = (c) => { const ps = (c.state && c.state.players) || []; return ps.find((p) => p.name === c.myName) || null; };
const foundList = (c) => { const ch = lastChar(c); const sv = ch && ch.soul && ch.soul.secretsView; return sv ? sv.found : []; };
const foundIds = (c) => foundList(c).map((f) => f.id);
const cluesOf = (c) => { const ch = lastChar(c); const sv = ch && ch.soul && ch.soul.secretsView; return sv ? sv.clues : []; };
const clueSt = (c, id) => { const cl = cluesOf(c).find((x) => x.id === id); return cl ? cl.st : 0; };
const achProg = (c, id) => { const ch = lastChar(c); const l = ch && ch.achievements && ch.achievements.list; const a = l ? l.find((x) => x.id === id) : null; return a ? a.progress : -1; };
const achTier = (c, id) => { const ch = lastChar(c); const l = ch && ch.achievements && ch.achievements.list; const a = l ? l.find((x) => x.id === id) : null; return a ? a.tier : -1; };
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
async function journeyTo(c, mapId, ms) {
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

(async () => {
  try {
    const chars = {};
    chars['tk358reg01'] = BASE('tk358reg01', 'P358DangKy', { soul: { clues: { clue_kp_mo_kiemtrung: { st: 1, life: 1 } } } });
    const mmFlags = {}; for (let n = 2; n <= 50; n += 2) mmFlags['hid_' + String(n).padStart(3, '0')] = true; mmFlags.tb_clue1 = true; mmFlags.xe_clue = true;
    const kpIds = ['kp_gieng_duoc', 'kp_mo_bangphong', 'kp_bia_hoadiem', 'kp_dauchan_huyet', 'kp_hoc_tuvong', 'kp_cotmoc_cochien', 'kp_khe_thanh_tuyen', 'kp_mo_kiemtrung', 'kp_gieng_hanbang', 'kp_bia_thienkiem', 'kp_daitich_vandang', 'kp_moco_quykhoc', 'kp_phien_hont', 'kp_cot_co_than', 'kp_sau_thienloi'];
    const allFlags = { ...mmFlags }; for (const id of kpIds) allFlags['secret_' + id] = true;
    chars['tk358max01'] = BASE('tk358max01', 'P358DemMax', { flags: allFlags });
    chars['tk358chn01'] = BASE('tk358chn01', 'P358Chuoi', { mapId: 'huyet_sac_rung', x: 100, y: 100, achState: { tiers: { ach_kp_maps: 10, ach_kp_dist: 8 }, title: null, daoTich: 0, notified: {} } });
    chars['tk358fre01'] = BASE('tk358fre01', 'P358TuDo', { realm: 'na', mapId: 'quy_khoc_lam', x: 100, y: 100 });
    fs.writeFileSync(path.join(DIR, 'characters.json'), JSON.stringify(chars));
    fs.writeFileSync(path.join(DIR, 'accounts.json'), '{}');
    fs.writeFileSync(path.join(DIR, 'world.json'), JSON.stringify({ totalMinutes: 3360, savedAt: Date.now() }));
    fs.writeFileSync(path.join(DIR, 'sessions.json'), '{}');
    await startServer(3720, '358a');

    // ---- Chân 1: đăng ký ----
    const cR = connect('tk358reg01'); await waitFor(() => cR.welcome, 20000);
    // dòng log đăng ký in LƯỜI ở lần đăng nhập đầu tiên (secretRegistry memoized) -> đọc log sau khi có người vào
    const bootLog = fs.readFileSync(path.join(DIR, 'srv_358a.log'), 'utf8');
    const regLine = (bootLog.split('\n').find((l) => l.includes('[khám phá]')) || '').trim();
    console.log('boot:', regLine);
    const svR = cR.welcome && cR.welcome.character.soul && cR.welcome.character.soul.secretsView;
    ok('chân 1a: log boot đăng ký 104 điểm, thuan:15', /104 điểm/.test(regLine) && /thuan:15/.test(regLine), regLine);
    ok('chân 1b: payload counts.thuan.total = 15, tổng các loại = 104', !!svR && svR.counts.thuan && svR.counts.thuan.total === 15 && Object.values(svR.counts).reduce((n, c) => n + c.total, 0) === 104, JSON.stringify(svR && svR.counts));

    // ---- Chân 7 (làm sớm khi cR còn kết nối): không perk ----
    const mkR = cR.welcome.character.secretMarks;
    ok('chân 7: KHÔNG perk + có manh mối chuỗi mở -> hints rỗng, không dấu nào trên kiem_trung', !!mkR && mkR.hints.length === 0 && !mkR.found.some((f) => f.mapId === 'kiem_trung'), JSON.stringify(mkR));

    // ---- Chân 2: bộ đếm tối đa ----
    const cMax = connect('tk358max01'); await waitFor(() => cMax.welcome, 20000);
    ok('chân 2a: đủ cờ 27 + 15 -> progress ach_kp_secrets = 42 (>= 40)', achProg(cMax, 'ach_kp_secrets') === 42, 'prog=' + achProg(cMax, 'ach_kp_secrets'));
    ok('chân 2b: bậc 4 (40) chạm được', achTier(cMax, 'ach_kp_secrets') >= 4, 'tier=' + achTier(cMax, 'ach_kp_secrets'));

    // ---- Chân 3+4+5: chuỗi A ----
    const cC = connect('tk358chn01'); await waitFor(() => cC.welcome, 20000);
    const meHuyet = cC.maps[cC.maps.length - 1];
    ok('chân 3a: spawn được trên Huyết Sắc Rừng, có cổng trong map_enter', !!meHuyet && meHuyet.mapId === 'huyet_sac_rung' && !!meHuyet.portal, JSON.stringify(meHuyet && meHuyet.mapId));
    const p0 = achProg(cC, 'ach_kp_secrets');
    const A1 = { x: meHuyet.portal.x + 170, y: meHuyet.portal.y + 190 };
    await flyTo(cC, A1.x, A1.y, 40);
    const gotA1 = await waitFor(() => foundIds(cC).includes('kp_dauchan_huyet') ? true : null, 10000);
    ok('chân 3b: tới điểm Dấu chân khổng lồ -> ghi sổ kp_dauchan_huyet', !!gotA1, JSON.stringify(foundIds(cC)));
    const fA1 = foundList(cC).find((f) => f.id === 'kp_dauchan_huyet');
    ok('chân 3c: sổ kèm lore của điểm thuần', !!fA1 && !!fA1.lore && fA1.lore.includes('dấu chân'), JSON.stringify(fA1));
    ok('chân 3d: notice phát hiện điểm bí mật đã hiện', cC.notices.some((t) => t.includes('Phát hiện điểm bí mật')), JSON.stringify(cC.notices.slice(-3)));
    await waitFor(() => clueSt(cC, 'clue_kp_mo_kiemtrung') === 1, 6000);
    ok('chân 3e: phát hiện A1 -> mở manh mối chuỗi nấc 2 (Mộ kiếm gãy, st=1)', clueSt(cC, 'clue_kp_mo_kiemtrung') === 1, JSON.stringify(cluesOf(cC).map((x) => x.id)));
    // progress tăng: cần char_sync mới — achievements đi kèm payload đồng bộ; chờ sync có progress mới
    const progUp = await waitFor(() => (achProg(cC, 'ach_kp_secrets') === p0 + 1 ? true : null), 8000);
    ok('chân 3f: progress ach_kp_secrets tăng đúng +1 (' + p0 + ' -> ' + (p0 + 1) + ')', !!progUp, 'now=' + achProg(cC, 'ach_kp_secrets'));
    const nFoundA1 = foundIds(cC).filter((i) => i === 'kp_dauchan_huyet').length;
    await sleep(3000);
    ok('chân 3g: đứng yên tại điểm 3s -> không ghi trùng (idempotent)', foundIds(cC).filter((i) => i === 'kp_dauchan_huyet').length === nFoundA1 && nFoundA1 === 1, 'n=' + foundIds(cC).filter((i) => i === 'kp_dauchan_huyet').length);
    const fC = JSON.parse(fs.readFileSync(path.join(DIR, 'characters.json'), 'utf8'))['tk358chn01'];
    ok('chân 3h: cờ secret_kp_dauchan_huyet + soul.secrets trong file', !!(fC && fC.flags && fC.flags.secret_kp_dauchan_huyet && fC.soul && fC.soul.secrets && fC.soul.secrets.kp_dauchan_huyet), JSON.stringify(fC && fC.flags && Object.keys(fC.flags)));

    // về cổng Huyết Sắc Rừng rồi đi Kiếm Trủng qua Thanh Vân Thành
    await flyTo(cC, meHuyet.portal.x, meHuyet.portal.y, 40);
    const hub = await journeyTo(cC, 'thanh_van_thanh', 60000);
    ok('chân 4a: về được Thanh Vân Thành', !!hub, JSON.stringify(cC.errs.slice(-2)));
    const meKiem = hub ? await journeyTo(cC, 'kiem_trung', 60000) : null;
    ok('chân 4b: tới được Kiếm Trủng', !!meKiem, JSON.stringify(cC.errs.slice(-2)));
    if (meKiem) {
      const B = { x: meKiem.portal.x - 230, y: meKiem.portal.y + 80 };
      const lastMarks = cC.marks[cC.marks.length - 1] || cC.welcome.character.secretMarks;
      const hintK = (lastMarks.hints || []).find((h) => h.mapId === 'kiem_trung');
      const dHint = hintK ? Math.hypot(hintK.x - B.x, hintK.y - B.y) : -1;
      ok('chân 4c: CÓ perk + manh mối mở -> hints có dấu mờ trên kiem_trung, lệch 200–400px khỏi điểm thật', !!hintK && dHint >= 200 && dHint <= 400, 'd=' + dHint + ' hints=' + JSON.stringify(lastMarks.hints));
      ok('chân 4d: payload không chứa tọa độ thật của điểm đích', !(lastMarks.hints || []).some((h) => h.x === B.x && h.y === B.y) && !(lastMarks.found || []).some((f) => f.id === 'kp_mo_kiemtrung'), JSON.stringify(lastMarks));
      await flyTo(cC, B.x, B.y, 40);
      const gotB = await waitFor(() => foundIds(cC).includes('kp_mo_kiemtrung') ? true : null, 10000);
      ok('chân 5a: tới Mộ kiếm gãy -> ghi sổ kp_mo_kiemtrung', !!gotB, JSON.stringify(foundIds(cC)));
      await waitFor(() => clueSt(cC, 'clue_kp_mo_kiemtrung') === 2, 6000);
      ok('chân 5b: manh mối chuỗi TỰ KHÉP (st=2) khi tìm ra điểm đích', clueSt(cC, 'clue_kp_mo_kiemtrung') === 2, JSON.stringify(cluesOf(cC).map((x) => x.id + ':' + x.st)));
    }

    // ---- Chân 6: tự do tìm điểm đích chuỗi khi chưa có manh mối ----
    const cF = connect('tk358fre01'); await waitFor(() => cF.welcome, 20000);
    const meQuy = cF.maps[cF.maps.length - 1];
    ok('chân 6a: spawn được trên Quỷ Khốc Lâm', !!meQuy && meQuy.mapId === 'quy_khoc_lam' && !!meQuy.portal, JSON.stringify(meQuy && meQuy.mapId));
    ok('chân 6b: nhân vật chưa hề có manh mối Mộ cổ khóc', clueSt(cF, 'clue_kp_moco_quykhoc') === 0);
    if (meQuy && meQuy.portal) {
      await flyTo(cF, meQuy.portal.x - 190, meQuy.portal.y + 200, 40);
      const gotFree = await waitFor(() => foundIds(cF).includes('kp_moco_quykhoc') ? true : null, 10000);
      ok('chân 6c: không manh mối vẫn tìm ra Mộ cổ khóc (khám phá không bị khóa)', !!gotFree, JSON.stringify(foundIds(cF)));
    }

    for (const c of [cR, cMax, cC, cF]) { try { c.socket.disconnect(); } catch (e) {} }
    await sleep(600);
    await stopServer();
    console.log(`=== GĐ358: ${pass} PASS / ${fail} FAIL ===`);
    process.exit(fail ? 1 : 0);
  } catch (e) { console.error('PROBE CRASH', e); try { await stopServer(); } catch (e2) {} process.exit(2); }
})();
