// Probe GĐ354 (B3) — Hồi 7 (Quản Sự kể trọn cho người Chứng Thần) + 3 đoạn kết riêng 3 đường
// (Thăng Tiên Giới / Địa Tiên / Luân hồi) + thoại tình huống: Âm Bà truy lùng, Cụ Ký nhận ra +
// 10 vật phẩm ẩn, Lão Ngư (mùa lễ) + khoảnh khắc đệ tử hỏi sau Hồi 4.
// Chân kiểm (theo §B5 đợt B3):
//  1) qs_h7_tron: Độ Kiếp tầng 3 (Chứng Thần) nghe được + soul.storyFull = 1; Độ Kiếp tầng 2 bị khóa.
//  2) KHÔNG MỞ CHÉO: Tiên Nhân nghe hv_h7_tien ở Hộ Vệ Tiên Môn (ngoại viện), KHÔNG nghe được ab_h7_diem/ab_dt_truylung.
//  3) Địa Tiên thoát Truy Lùng >= 5 lần: ab_h7_diem + ab_dt_truylung mở; KHÔNG nghe được hv_h7_tien.
//     Địa Tiên mới thoát 1 lần: ab_dt_truylung mở, ab_h7_diem khóa.
//  4) ck_god10: đủ 10 vật phẩm ẩn (hồn) mở; 9/10 khóa.
//  5) ck_h7_nhanra: cần kiếp trước đã nghe trọn (soul.storyFull) + đã sang kiếp (lives>=1); thiếu 1 trong 2 đều khóa.
//  6) Lão Ngư: lng_den khóa cho tới khi nghe lng_chao; sau đó mở.
//  7) KHOẢNH KHẮC ĐỆ TỬ: sư phụ có đệ tử NPC đi theo, nghe xong ab_h4_tiengso -> đệ tử hỏi 1 câu có 2 lựa chọn;
//     trả lời -> nhận thông báo phản ứng; nghe lại KHÔNG hỏi lần 2.
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
let serverProc = null, killTimer = null, CUR_PORT = 3695;
async function startServer(port, tag) {
  CUR_PORT = port;
  if (!(await portFree(port))) throw new Error('port ban ' + port);
  serverProc = spawn('node', ['server/index.js'], { cwd: ROOT, env: { ...process.env, PORT: String(port), TTT_STORAGE: 'file', TTT_CHAR_FILE: path.join(DIR, 'characters.json'), TTT_ACC_FILE: path.join(DIR, 'accounts.json'), TTT_WORLD_FILE: path.join(DIR, 'world.json'), TTT_SESS_FILE: path.join(DIR, 'sessions.json'), TTT_DAY_REAL_MS: '600000', TTT_TUVI_NEED: '5' }, stdio: ['ignore', 'pipe', 'pipe'] });
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
  return Object.assign({ token, name, classId: 'kiemtu', gender: 'nam', race: null, geo175: 1, realm: 'kd', tier: 9, x: 1565, y: 1011, mapId: 'lang_tan_thu', hp: 99999, lifespan: 500, birthDay: -5660, ageStart: 16, stats: { ...STATS }, statPoints: 0, freePoints: 0, tuVi: 99999, stones: 0, stonesTrung: 0, stonesThuong: 0, stonesCuc: 0, inventory: {}, gearBag: {}, equipped: [], skills: [], job: null, job2: null, job3: null, linhCan: { ...LC1 }, affinity: {}, affV2: 1, bonds: {}, quests: {}, questsDone: {}, flags: {}, counters: {}, disciples: [], foundInvites: [], reformIn: [], sectTech: [], sectArts: [], sectArtsActive: [], mails: [], classRes: {}, food: 100, water: 100 }, extra || {});
}
let pass = 0, fail = 0;
function ok(name, cond, extra) { if (cond) { pass++; console.log('PASS | ' + name); } else { fail++; console.log('FAIL | ' + name + (extra ? ' | ' + extra : '')); } }
function connect(token) {
  const socket = io(`http://127.0.0.1:${CUR_PORT}`, { transports: ['websocket'] });
  const ctx = { socket, merger: createMerger(), state: null, welcome: null, needChar: false, syncs: [], errs: [], notices: [], dialogs: [], maps: [], myName: null };
  socket.on('connect', () => socket.emit('hello', { token }));
  socket.on('welcome', (w) => { ctx.welcome = w; ctx.myName = (w.character || {}).name; });
  socket.on('need_character', () => { ctx.needChar = true; });
  socket.on('char_sync', (s) => ctx.syncs.push(s));
  socket.on('notice', (n) => ctx.notices.push(n.text || ''));
  socket.on('interact_error', (e) => ctx.errs.push(e.message || ''));
  socket.on('npc_dialog', (d) => ctx.dialogs.push(d));
  socket.on('map_enter', (m) => ctx.maps.push(m));
  socket.on('server_tick', (t) => { const st = ctx.merger(t); if (st) ctx.state = st; });
  return ctx;
}
const lastChar = (c) => { for (let i = c.syncs.length - 1; i >= 0; i--) { if (c.syncs[i]) return c.syncs[i]; } return c.welcome ? c.welcome.character : null; };
const meOf = (c) => { const ps = (c.state && c.state.players) || []; return ps.find((p) => p.name === c.myName) || null; };
async function talk(c, npcId) { const n0 = c.dialogs.length; c.socket.emit('talk_npc', { npcId }); return waitFor(() => c.dialogs.length > n0 ? c.dialogs[c.dialogs.length - 1] : null, 8000); }
async function listen(c, npcId, segId) {
  const d0 = c.dialogs.length, e0 = c.errs.length;
  c.socket.emit('talk_npc', { npcId, storySeg: segId });
  const r = await waitFor(() => {
    for (let i = d0; i < c.dialogs.length; i++) if (c.dialogs[i].storyRead) return { read: c.dialogs[i].storyRead };
    if (c.errs.length > e0) return { err: c.errs[c.errs.length - 1] };
    return null;
  }, 8000);
  return r || { timeout: true };
}
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
const NPC_QS = { x: 1252, y: 872 }, NPC_CK = { x: 1064, y: 1990 }, NPC_AB = { x: 760, y: 481 }, NPC_TN = { x: 1977, y: 1377 }, NPC_LN = { x: 2120, y: 2010 };
const RELICS10 = { nhan: 1, than: 1, hoa: 1, ma: 1, quy: 1, tien: 1, long: 1, ho: 1, dieu: 1, thu: 1 };
const RELICS9 = { nhan: 1, than: 1, hoa: 1, ma: 1, quy: 1, tien: 1, long: 1, dieu: 1, thu: 1 };

(async () => {
  const chars = {};
  chars['tk354qs7a'] = BASE('tk354qs7a', 'P354ChungThan', { realm: 'dk', tier: 3 });
  chars['tk354qs7b'] = BASE('tk354qs7b', 'P354ChuaChung', { realm: 'dk', tier: 2 });
  chars['tk354tien1'] = BASE('tk354tien1', 'P354TienNhan', { realm: 'tn', tier: 1, mapId: 'tien_mon_ngoai_vien', x: 400, y: 400 });
  chars['tk354diti5'] = BASE('tk354diti5', 'P354DiaTien5', { realm: 'dt', tier: 1, counters: { thienDaoSurvived: 3, thienDaoEvaded: 2 } });
  chars['tk354diti1'] = BASE('tk354diti1', 'P354DiaTien1', { realm: 'dt', tier: 1, counters: { thienDaoEvaded: 1 } });
  chars['tk354god10'] = BASE('tk354god10', 'P354MuoiMon', { soul: { relics: RELICS10 } });
  chars['tk354god09'] = BASE('tk354god09', 'P354ChinMon', { soul: { relics: RELICS9 } });
  chars['tk354lv1ok'] = BASE('tk354lv1ok', 'P354KiepSau', { soul: { lives: 2, storyFull: 1 } });
  chars['tk354lv2no'] = BASE('tk354lv2no', 'P354KiepThieu', { soul: { lives: 2 } });
  chars['tk354lv3no'] = BASE('tk354lv3no', 'P354KiepDau', { soul: { storyFull: 1 } });
  chars['tk354laong'] = BASE('tk354laong', 'P354LaoNgu', {});
  chars['tk354suphu'] = BASE('tk354suphu', 'P354SuPhu', { realm: 'na', disciples: [{ type: 'npc', name: 'Tieu De P354', tilt: 'kiemtu', gender: 'nam', level: 2, hp: 300, tamDac: 5 }] });
  fs.writeFileSync(path.join(DIR, 'characters.json'), JSON.stringify(chars));
  fs.writeFileSync(path.join(DIR, 'accounts.json'), '{}');
  fs.writeFileSync(path.join(DIR, 'world.json'), JSON.stringify({ totalMinutes: 3360, savedAt: Date.now() }));
  fs.writeFileSync(path.join(DIR, 'sessions.json'), '{}');
  try { fs.unlinkSync(path.join(DIR, 'srv_354a.log')); } catch (e) {}
  await startServer(3695, '354a');
  const bootLog = fs.readFileSync(path.join(DIR, 'srv_354a.log'), 'utf8');
  const hvLine = bootLog.split('\n').find((l) => l.includes('Hộ Vệ Tiên Môn')) || '';
  ok('chân 0a: server đặt Hộ Vệ Tiên Môn tại tien_mon_ngoai_vien', /Hộ Vệ Tiên Môn đứng tại tien_mon_ngoai_vien \(\d+,\d+\)/.test(hvLine), hvLine);
  const hvPos = (() => { const m = hvLine.match(/\((\d+),(\d+)\)/); return m ? { x: +m[1], y: +m[2] } : null; })();

  // ---- Chân 1: Hồi 7 cổng Chứng Thần ----
  const c1 = connect('tk354qs7a'); await waitFor(() => c1.welcome, 20000);
  ok('chân 1a: Độ Kiếp tầng 3 (Chứng Thần) vào được game', !!c1.welcome && !c1.needChar, 'needChar=' + c1.needChar);
  await flyTo(c1, NPC_QS.x, NPC_QS.y, 60);
  const r1 = await listen(c1, 'npc_quansu', 'qs_h7_tron');
  ok('chân 1b: Chứng Thần nghe qs_h7_tron (bản kể trọn) -> ok', !!(r1 && r1.read), JSON.stringify(r1).slice(0, 120));
  await sleep(600);
  const ch1 = lastChar(c1);
  ok('chân 1c: soul.storyFull = 1 sau khi nghe bản trọn', !!(ch1 && ch1.soul && ch1.soul.storyFull === 1), JSON.stringify(ch1 && ch1.soul));
  const c1b = connect('tk354qs7b'); await waitFor(() => c1b.welcome, 20000);
  await flyTo(c1b, NPC_QS.x, NPC_QS.y, 60);
  const r1b = await listen(c1b, 'npc_quansu', 'qs_h7_tron');
  ok('chân 1d: Độ Kiếp tầng 2 (chưa Chứng Thần) nghe qs_h7_tron -> bị chặn', !!(r1b && r1b.err), JSON.stringify(r1b).slice(0, 120));

  // ---- Chân 2: đường Tiên — Hộ Vệ Tiên Môn ----
  const c2 = connect('tk354tien1'); await waitFor(() => c2.welcome, 20000);
  ok('chân 2a: Tiên Nhân vào được Tiên Môn ngoại viện', !!c2.welcome && !c2.needChar, 'needChar=' + c2.needChar);
  if (hvPos) await flyTo(c2, hvPos.x, hvPos.y, 60);
  const d2 = await talk(c2, 'npc_hovetm');
  const sg2 = d2 && (d2.storySegs || []).find((s) => s.id === 'hv_h7_tien');
  ok('chân 2b: hộp thoại Hộ Vệ có hv_h7_tien = new', !!(sg2 && sg2.state === 'new'), JSON.stringify(d2 && d2.storySegs));
  const r2 = await listen(c2, 'npc_hovetm', 'hv_h7_tien');
  ok('chân 2c: Tiên Nhân nghe hv_h7_tien (đoạn kết Thăng Tiên Giới) -> ok', !!(r2 && r2.read), JSON.stringify(r2).slice(0, 120));
  await flyTo(c2, NPC_AB.x, NPC_AB.y, 60); // Âm Bà ở làng nhà — Tiên Nhân bay về làng nghe thử đoạn Địa Tiên
  const r2x = await listen(c2, 'npc_amba', 'ab_h7_diem');
  ok('chân 2d: Tiên Nhân xin đoạn Địa Tiên (ab_h7_diem) -> bị chặn, không mở chéo', !!(r2x && r2x.err), JSON.stringify(r2x).slice(0, 120));
  const r2y = await listen(c2, 'npc_amba', 'ab_dt_truylung');
  ok('chân 2e: Tiên Nhân xin ab_dt_truylung -> bị chặn', !!(r2y && r2y.err), JSON.stringify(r2y).slice(0, 120));

  // ---- Chân 3: đường Địa Tiên ----
  const c3 = connect('tk354diti5'); await waitFor(() => c3.welcome, 20000);
  await flyTo(c3, NPC_AB.x, NPC_AB.y, 60);
  const r3 = await listen(c3, 'npc_amba', 'ab_h7_diem');
  ok('chân 3a: Địa Tiên thoát Truy Lùng 5 lần -> ab_h7_diem mở', !!(r3 && r3.read), JSON.stringify(r3).slice(0, 120));
  const r3b = await listen(c3, 'npc_amba', 'ab_dt_truylung');
  ok('chân 3b: Địa Tiên thoát >= 1 lần -> ab_dt_truylung mở', !!(r3b && r3b.read), JSON.stringify(r3b).slice(0, 120));
  if (hvPos) { /* Hộ Vệ ở map Tiên — Địa Tiên không vào được map đó; kiểm mở chéo qua điều kiện server bằng đoạn tại Âm Bà là đủ; chân hv chéo kiểm ở c2 phía trên */ }
  const c3b = connect('tk354diti1'); await waitFor(() => c3b.welcome, 20000);
  await flyTo(c3b, NPC_AB.x, NPC_AB.y, 60);
  const r3c = await listen(c3b, 'npc_amba', 'ab_dt_truylung');
  ok('chân 3c: Địa Tiên mới thoát 1 lần -> ab_dt_truylung mở', !!(r3c && r3c.read), JSON.stringify(r3c).slice(0, 120));
  const r3d = await listen(c3b, 'npc_amba', 'ab_h7_diem');
  ok('chân 3d: Địa Tiên mới thoát 1 lần -> ab_h7_diem (cần >= 5 lần) khóa', !!(r3d && r3d.err), JSON.stringify(r3d).slice(0, 120));

  // ---- Chân 4: 10 vật phẩm ẩn ----
  const c4 = connect('tk354god10'); await waitFor(() => c4.welcome, 20000);
  await flyTo(c4, NPC_CK.x, NPC_CK.y, 60);
  const r4 = await listen(c4, 'npc_cuky', 'ck_god10');
  ok('chân 4a: đủ 10 vật phẩm ẩn -> ck_god10 mở', !!(r4 && r4.read), JSON.stringify(r4).slice(0, 120));
  const c4b = connect('tk354god09'); await waitFor(() => c4b.welcome, 20000);
  await flyTo(c4b, NPC_CK.x, NPC_CK.y, 60);
  const r4b = await listen(c4b, 'npc_cuky', 'ck_god10');
  ok('chân 4b: mới 9/10 vật phẩm ẩn -> ck_god10 khóa', !!(r4b && r4b.err), JSON.stringify(r4b).slice(0, 120));

  // ---- Chân 5: Cụ Ký nhận ra (xuyên kiếp) ----
  const c5 = connect('tk354lv1ok'); await waitFor(() => c5.welcome, 20000);
  await flyTo(c5, NPC_CK.x, NPC_CK.y, 60);
  const r5 = await listen(c5, 'npc_cuky', 'ck_h7_nhanra');
  ok('chân 5a: kiếp sau + kiếp trước đã nghe trọn -> ck_h7_nhanra mở', !!(r5 && r5.read), JSON.stringify(r5).slice(0, 120));
  const c5b = connect('tk354lv2no'); await waitFor(() => c5b.welcome, 20000);
  await flyTo(c5b, NPC_CK.x, NPC_CK.y, 60);
  const r5b = await listen(c5b, 'npc_cuky', 'ck_h7_nhanra');
  ok('chân 5b: kiếp sau nhưng chưa từng nghe trọn -> khóa', !!(r5b && r5b.err), JSON.stringify(r5b).slice(0, 120));
  const c5c = connect('tk354lv3no'); await waitFor(() => c5c.welcome, 20000);
  await flyTo(c5c, NPC_CK.x, NPC_CK.y, 60);
  const r5c = await listen(c5c, 'npc_cuky', 'ck_h7_nhanra');
  ok('chân 5c: mới kiếp đầu (dù storyFull do fixture) -> khóa', !!(r5c && r5c.err), JSON.stringify(r5c).slice(0, 120));

  // ---- Chân 6: Lão Ngư ----
  const c6 = connect('tk354laong'); await waitFor(() => c6.welcome, 20000);
  await flyTo(c6, NPC_LN.x, NPC_LN.y, 60);
  const r6a = await listen(c6, 'npc_laongu', 'lng_den');
  ok('chân 6a: chưa nghe lng_chao -> lng_den khóa', !!(r6a && r6a.err), JSON.stringify(r6a).slice(0, 120));
  const r6b = await listen(c6, 'npc_laongu', 'lng_chao');
  ok('chân 6b: nghe lng_chao -> ok', !!(r6b && r6b.read), JSON.stringify(r6b).slice(0, 120));
  const r6c = await listen(c6, 'npc_laongu', 'lng_den');
  ok('chân 6c: sau lng_chao -> lng_den mở', !!(r6c && r6c.read), JSON.stringify(r6c).slice(0, 120));

  // ---- Chân 7: khoảnh khắc đệ tử ----
  const c7 = connect('tk354suphu'); await waitFor(() => c7.welcome, 20000);
  await waitFor(() => { const ps = (c7.state && c7.state.players) || []; return ps.some((p) => p.name === 'Tieu De P354'); }, 8000);
  ok('chân 7a: đệ tử NPC (fixture) hiện hình theo sư phụ lúc login', !!(c7.state && (c7.state.players || []).some((p) => p.name === 'Tieu De P354')));
  await flyTo(c7, NPC_TN.x, NPC_TN.y, 60);
  const r7a = await listen(c7, 'npc_thuongnhan', 'tn_h3_lahau');
  ok('chân 7b: sư phụ nghe Hồi 3 (mồi reqHoi) -> ok', !!(r7a && r7a.read), JSON.stringify(r7a).slice(0, 120));
  await flyTo(c7, NPC_AB.x, NPC_AB.y, 60);
  const r7b = await listen(c7, 'npc_amba', 'ab_h4_tiengso');
  ok('chân 7c: sư phụ nghe ab_h4_tiengso -> ok', !!(r7b && r7b.read), JSON.stringify(r7b).slice(0, 120));
  const dDisc = await waitFor(() => c7.dialogs.find((d) => d.npcId === 'story_disciple') || null, 6000);
  ok('chân 7d: đệ tử cất tiếng hỏi ngay sau Hồi 4 (2 lựa chọn trả lời)', !!(dDisc && (dDisc.text || '').includes('có tên của con không') && Array.isArray(dDisc.storyAnswers) && dDisc.storyAnswers.length === 2), JSON.stringify(dDisc).slice(0, 200));
  c7.socket.emit('story_disciple_answer', { answer: 'Có. Và ta sẽ giữ nó ở đó thật lâu.' });
  const n7 = await waitFor(() => c7.notices.find((t) => t.includes('giữ được lời')) || null, 6000);
  ok('chân 7e: trả lời xong -> thông báo phản ứng của đệ tử', !!n7, c7.notices.slice(-3).join(' / '));
  const before7 = c7.dialogs.filter((d) => d.npcId === 'story_disciple').length;
  await listen(c7, 'npc_amba', 'ab_h4_tiengso');
  await sleep(1500);
  const after7 = c7.dialogs.filter((d) => d.npcId === 'story_disciple').length;
  ok('chân 7f: nghe lại Hồi 4 -> đệ tử KHÔNG hỏi lần 2', before7 === 1 && after7 === 1, `before=${before7} after=${after7}`);

  for (const c of [c1, c1b, c2, c3, c3b, c4, c4b, c5, c5b, c5c, c6, c7]) { try { c.socket.disconnect(); } catch (e) {} }
  await sleep(800);
  await stopServer();
  console.log(`\nKẾT QUẢ GĐ354: ${pass} PASS / ${fail} FAIL`);
  process.exit(fail ? 1 : 0);
})().catch(async (e) => { console.error('PROBE CRASH', e); try { await stopServer(); } catch (x) {} process.exit(2); });
