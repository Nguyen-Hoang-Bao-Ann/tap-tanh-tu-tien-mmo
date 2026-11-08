// Probe GĐ341 — THIÊN PHÚ ĐỢT 2: bốc lại mỗi kiếp + gỡ 3 điểm chờ.
// A) Nguồn lượt theo mốc biên: Đạo Tích 119/120/779/780, nhóm Ẩn mốc 2, gộp = 3; hồn đã consumed -> 0; không achState -> 0.
// B) Luồng: tiêu lượt NGAY khi bắt đầu (mở lại panel: lượt đã giảm, kết quả giữ nguyên); tạo nhân vật giữa lượt bị chặn;
//    so sánh 2 thẻ: bốc tệ hơn -> giữ cũ được; bốc tốt hơn -> lấy mới được; hết lượt khóa.
// C) Hiệu ứng: thiên phú chốt qua bốc lại áp đúng kênh (the_chat -> maxHp +30; giữ cũ suc_luc -> không +30).
// D) Bền: talent của nhân vật kiếp mới qua restart + 1 chu kỳ autosave offline; achState thừa hưởng nguyên vẹn.
// E) Hồi quy: tạo mới kiếp đầu (0 lượt) như GĐ337; bốc bù nhân vật cũ chạy, KHÔNG có lượt bốc lại.
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const net = require('net');
const ROOT = path.join(__dirname, '..', '..');
const DIR = __dirname;
const { io } = require(path.join(ROOT, 'client/node_modules/socket.io-client'));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function waitFor(fn, ms) { const t0 = Date.now(); while (Date.now() - t0 < ms) { const v = fn(); if (v) return v; await sleep(150); } return null; }
function portFree(port) { return new Promise((res) => { const s = net.createServer(); s.once('error', () => res(false)); s.listen(port, () => s.close(() => res(true))); }); }
let serverProc = null, killTimer = null, CUR_PORT = 3622;
async function startServer(port, tag) {
  CUR_PORT = port;
  if (!(await portFree(port))) throw new Error('port ban ' + port);
  serverProc = spawn('node', ['server/index.js'], { cwd: ROOT, env: { ...process.env, PORT: String(port), TTT_STORAGE: 'file', TTT_CHAR_FILE: path.join(DIR, 'characters.json'), TTT_ACC_FILE: path.join(DIR, 'accounts.json'), TTT_WORLD_FILE: path.join(DIR, 'world.json'), TTT_SESS_FILE: path.join(DIR, 'sessions.json'), TTT_DAY_REAL_MS: '600000', TTT_TUVI_NEED: '5' }, stdio: ['ignore', 'pipe', 'pipe'] });
  serverProc.stderr.on('data', (d) => { try { fs.appendFileSync(path.join(DIR, 'srv_' + tag + '.log'), d); } catch (e) {} });
  serverProc.stdout.on('data', (d) => { try { fs.appendFileSync(path.join(DIR, 'srv_' + tag + '.log'), d); } catch (e) {} });
  killTimer = setTimeout(() => { try { serverProc.kill('SIGKILL'); } catch (e) {} }, 90000);
  const t0 = Date.now();
  while (Date.now() - t0 < 45000) { try { const r = await fetch(`http://127.0.0.1:${port}/api/status`); if (r.ok) { clearTimeout(killTimer); return; } } catch (e) {} await sleep(500); }
  throw new Error('server khong len');
}
async function stopServer() { if (!serverProc) return; const p = serverProc; serverProc = null; await new Promise((res) => { const t = setTimeout(() => { try { p.kill('SIGKILL'); } catch (e) {} res(); }, 4000); p.once('exit', () => { clearTimeout(t); res(); }); try { p.kill('SIGTERM'); } catch (e) { clearTimeout(t); res(); } }); const t0 = Date.now(); while (Date.now() - t0 < 10000 && !(await portFree(CUR_PORT))) await sleep(300); }
const STATS = { khiHuyet: 500, vatCong: 100, vatPhong: 100, phapCong: 100, phapPhong: 100, tocDo: 60, minhMan: 100 };
const LC1 = { elements: ['kim'], main: 'kim', count: 1, mutations: [] };
function BASE(token, name, extra) {
  return Object.assign({ token, name, classId: 'kiemtu', gender: 'nam', race: null, geo175: 1, realm: 'kd', tier: 1, x: 4248, y: 2950, mapId: 'huyet_sac_rung', hp: 99999, lifespan: 500, birthDay: -5660, ageStart: 16, stats: { ...STATS }, statPoints: 0, freePoints: 0, tuVi: 0, stones: 0, stonesTrung: 0, stonesThuong: 0, stonesCuc: 0, inventory: {}, gearBag: {}, equipped: [], skills: [], job: null, job2: null, job3: null, linhCan: { ...LC1 }, affinity: {}, affV2: 1, bonds: {}, quests: {}, questsDone: {}, flags: {}, counters: {}, disciples: [], foundInvites: [], reformIn: [], sectTech: [], sectArts: [], sectArtsActive: [], mails: [], classRes: {} }, extra || {});
}
const AN_TIERS = { ach_an_dream: 4, ach_an_firstfail: 3, ach_an_secret: 3 }; // Đạo Tích nhóm Ẩn = 5+3+3 = 11 -> mốc 2 (10) đạt, mốc 3 (15) chưa
function DEAD(token, name, daoTich, tiers, extra) {
  const e = { dead: true, deadAt: '2026-11-07T00:00:00.000Z', soul: { lives: 2, fullLives: 1, consumed: false } };
  if (daoTich !== null && daoTich !== undefined) e.achState = { tiers: tiers || {}, title: null, daoTich, notified: {} };
  return BASE(token, name, Object.assign(e, extra || {}));
}
let pass = 0, fail = 0;
function ok(name, cond, extra) { if (cond) { pass++; console.log('PASS | ' + name); } else { fail++; console.log('FAIL | ' + name + (extra ? ' | ' + extra : '')); } }
function connect(token) {
  const socket = io(`http://127.0.0.1:${CUR_PORT}`, { transports: ['websocket'] });
  const ctx = { socket, welcome: null, needChar: false, died: false, createErr: null, tstate: [], catalog: null, notices: [] };
  socket.on('connect', () => socket.emit('hello', { token }));
  socket.on('welcome', (w) => { ctx.welcome = w; });
  socket.on('need_character', () => { ctx.needChar = true; });
  socket.on('character_died', () => { ctx.died = true; });
  socket.on('create_error', (e) => { ctx.createErr = e.message; });
  socket.on('talent_catalog', (c) => { ctx.catalog = c; });
  socket.on('talent_state', (s) => ctx.tstate.push(s));
  socket.on('notice', (n) => ctx.notices.push(n.text || ''));
  return ctx;
}
function waitTalent(c, pred, ms) { return waitFor(() => { for (let i = c.tstate.length - 1; i >= 0; i--) { if (pred(c.tstate[i])) return c.tstate[i]; } return null; }, ms || 6000); }
function waitTalentFrom(c, fromIdx, pred, ms) { return waitFor(() => { for (let i = c.tstate.length - 1; i >= fromIdx; i--) { if (pred(c.tstate[i])) return c.tstate[i]; } return null; }, ms || 6000); }
const lastPend = (c) => { const s = c.tstate[c.tstate.length - 1]; return s ? s.pending : null; };
function writeChars(chars, acc) {
  fs.writeFileSync(path.join(DIR, 'characters.json'), JSON.stringify(chars, null, 1));
  fs.writeFileSync(path.join(DIR, 'accounts.json'), JSON.stringify(acc || {}, null, 1));
  for (const f of ['world.json', 'sessions.json']) { try { fs.unlinkSync(path.join(DIR, f)); } catch (e) {} }
}
let A_TIM_ID = null; // kết quả Tím chốt ở Ca A (để đối chiếu bền + payload sau restart)

(async () => {
  // ================= PHIÊN 1 (3622): nguồn lượt + luồng bốc lại =================
  const chars = {};
  chars['tk341d119'] = DEAD('tk341d119', 'D341A', 119, {});
  chars['tk341d120'] = DEAD('tk341d120', 'D341B', 120, {});
  chars['tk341d779'] = DEAD('tk341d779', 'D341C', 779, {});
  chars['tk341d780'] = DEAD('tk341d780', 'D341D', 780, {});
  chars['tk341dan2'] = DEAD('tk341dan2', 'D341E', 0, { ...AN_TIERS });
  chars['tk341dall'] = DEAD('tk341dall', 'D341F', 780, { ...AN_TIERS });
  chars['tk341duse'] = DEAD('tk341duse', 'D341G', 999, {}, { soul: { lives: 2, fullLives: 1, consumed: true } });
  chars['tk341dnoa'] = DEAD('tk341dnoa', 'D341H', null, null);
  chars['tk341d120b'] = DEAD('tk341d120b', 'D341I', 120, {});
  writeChars(chars);
  await startServer(3622, '341a');

  // ---- A) nguồn lượt theo mốc biên ----
  const grantCases = [
    ['tk341d119', 0, 'A1 Đạo Tích 119 -> 0 lượt'],
    ['tk341d120', 1, 'A2 Đạo Tích 120 -> 1 lượt'],
    ['tk341d779', 1, 'A3 Đạo Tích 779 -> 1 lượt (chỉ mốc 120)'],
    ['tk341d780', 2, 'A4 Đạo Tích 780 -> 2 lượt'],
    ['tk341dan2', 1, 'A5 nhóm Ẩn mốc 2 (Đạo Tích nhóm 11) -> 1 lượt'],
    ['tk341dall', 3, 'A6 780 + nhóm Ẩn mốc 2 -> 3 lượt (trần)'],
    ['tk341duse', 0, 'A7 hồn đã consumed -> 0 lượt dù Đạo Tích 999'],
    ['tk341dnoa', 0, 'A8 chết không achState -> 0 lượt'],
  ];
  for (const [tk, expect, label] of grantCases) {
    const c = connect(tk);
    await waitFor(() => c.needChar, 20000);
    c.socket.emit('talent_catalog_get');
    const st = await waitTalent(c, (s) => !!s.pending, 8000);
    ok(label, !!st && st.pending.rerollTotal === expect && st.pending.rerollLeft === expect, JSON.stringify(st && st.pending));
    c.socket.disconnect();
    await sleep(200);
  }

  // ---- B) Ca A: luồng đầy đủ 3 lượt trên tk341dall ----
  {
    const c = connect('tk341dall');
    await waitFor(() => c.needChar, 20000);
    c.socket.emit('talent_catalog_get'); await waitFor(() => c.catalog, 5000);
    let st = await waitTalent(c, (s) => !!s.pending && s.pending.rerollTotal === 3);
    ok('B0 seed: rerollTotal=3, rerollLeft=3', !!st && st.pending.rerollLeft === 3, JSON.stringify(st && st.pending));
    c.socket.emit('talent_pick', { tier: 'vo', id: 'suc_luc' });
    st = await waitTalent(c, (s) => s.pending && s.pending.result === 'suc_luc' && s.pending.locked === true);
    ok('B1 gốc: pick suc_luc chốt, còn 3 lượt', !!st && st.pending.rerollLeft === 3, JSON.stringify(st && st.pending));
    c.socket.emit('talent_reroll_start');
    st = await waitTalent(c, (s) => s.pending && s.pending.rerolling === true);
    ok('B2 bắt đầu bốc lại: rerollLeft 3->2 NGAY, heldId=suc_luc, result=null', !!st && st.pending.rerollLeft === 2 && st.pending.heldId === 'suc_luc' && !st.pending.result, JSON.stringify(st && st.pending));
    c.socket.emit('talent_catalog_get'); // đóng/mở lại panel giữa lượt
    await sleep(700);
    const pMid = lastPend(c);
    ok('B3 mở lại panel giữa lượt: lượt KHÔNG hoàn (vẫn 2), kết quả giữ nguyên (heldId=suc_luc)', !!pMid && pMid.rerollLeft === 2 && pMid.rerolling === true && pMid.heldId === 'suc_luc', JSON.stringify(pMid));
    c.socket.emit('create_character', { name: 'GiuaLuot341', classId: 'kiemtu' });
    await waitFor(() => c.createErr, 5000);
    ok('B4 tạo nhân vật giữa lượt bốc lại -> create_error', !!c.createErr && /bốc lại/i.test(c.createErr), c.createErr || '');
    c.createErr = null;
    c.socket.emit('talent_pick', { tier: 'vo', id: 'the_chat' });
    st = await waitTalent(c, (s) => s.pending && s.pending.comparing === true);
    ok('B5 pick trong lượt -> so sánh: result=the_chat (mới), heldId=suc_luc (cũ)', !!st && st.pending.result === 'the_chat' && st.pending.heldId === 'suc_luc', JSON.stringify(st && st.pending));
    const idxB6 = c.tstate.length;
    c.socket.emit('talent_reroll_choose', { which: 'held' });
    st = await waitTalentFrom(c, idxB6, (s) => s.pending && s.pending.comparing === false && s.pending.result === 'suc_luc');
    ok('B6 bốc tệ hơn -> GIỮ CŨ được: result=suc_luc, còn 2 lượt', !!st && st.pending.rerollLeft === 2 && st.pending.locked === true, JSON.stringify(st && st.pending));
    c.socket.emit('talent_reroll_start');
    st = await waitTalent(c, (s) => s.pending && s.pending.rerolling === true && s.pending.rerollLeft === 1);
    ok('B7 bốc lại lần 2: rerollLeft 2->1, heldId=suc_luc', !!st && st.pending.heldId === 'suc_luc', JSON.stringify(st && st.pending));
    c.socket.emit('talent_pick', { tier: 'vo', id: 'the_chat' });
    st = await waitTalent(c, (s) => s.pending && s.pending.comparing === true && s.pending.result === 'the_chat');
    c.socket.emit('talent_reroll_choose', { which: 'new' });
    st = await waitTalent(c, (s) => s.pending && s.pending.comparing === false && s.pending.result === 'the_chat');
    ok('B8 bốc tốt hơn -> LẤY MỚI được: result=the_chat, còn 1 lượt', !!st && st.pending.rerollLeft === 1, JSON.stringify(st && st.pending));
    c.socket.emit('talent_reroll_start');
    st = await waitTalent(c, (s) => s.pending && s.pending.rerolling === true && s.pending.rerollLeft === 0);
    ok('B9 bốc lại lần 3: rerollLeft 1->0, heldId=the_chat', !!st && st.pending.heldId === 'the_chat', JSON.stringify(st && st.pending));
    c.socket.emit('talent_roll', { tier: 'tim' });
    st = await waitTalent(c, (s) => s.pending && s.pending.comparing === true && s.pending.tier === 'tim');
    A_TIM_ID = st && st.pending && st.pending.result;
    ok('B10 roll Tím trong lượt: chốt ngay + sang so sánh', !!A_TIM_ID, JSON.stringify(st && st.pending));
    c.socket.emit('talent_reroll_choose', { which: 'new' });
    st = await waitTalent(c, (s) => s.pending && s.pending.comparing === false && s.pending.result === A_TIM_ID);
    ok('B11 chọn mới (Tím): result khớp, hết lượt', !!st && st.pending.rerollLeft === 0, JSON.stringify(st && st.pending));
    c.socket.emit('talent_reroll_start');
    await sleep(800);
    const pEnd = lastPend(c);
    ok('B12 hết lượt: bốc lại bị từ chối (state giữ nguyên)', !!pEnd && pEnd.rerollLeft === 0 && pEnd.rerolling === false && pEnd.result === A_TIM_ID, JSON.stringify(pEnd));
    c.socket.emit('create_character', { name: 'KiepMoi341A', classId: 'kiemtu' });
    await waitFor(() => c.welcome, 20000);
    ok('B13 tạo kiếp mới xong: talent = kết quả Tím đã chọn qua bốc lại', !!c.welcome && !!c.welcome.character.talent && c.welcome.character.talent.id === A_TIM_ID, JSON.stringify(c.welcome && c.welcome.character.talent) + ' tim=' + A_TIM_ID);
    c.socket.disconnect();
    const fileNow = JSON.parse(fs.readFileSync(path.join(DIR, 'characters.json'), 'utf8'));
    ok('B14 achState thừa hưởng nguyên vẹn (daoTich=780) + talent ghi file', !!fileNow.tk341dall && !!fileNow.tk341dall.achState && fileNow.tk341dall.achState.daoTich === 780 && !!fileNow.tk341dall.talent && fileNow.tk341dall.talent.id === A_TIM_ID, JSON.stringify(fileNow.tk341dall && { dao: fileNow.tk341dall.achState && fileNow.tk341dall.achState.daoTich, tal: fileNow.tk341dall.talent }));
  }

  // ---- C) Ca B: choose-new + đo hiệu ứng the_chat (tk341d120, 1 lượt) ----
  {
    const c = connect('tk341d120');
    await waitFor(() => c.needChar, 20000);
    c.socket.emit('talent_catalog_get'); await waitFor(() => c.catalog, 5000);
    c.socket.emit('talent_pick', { tier: 'vo', id: 'suc_luc' });
    await waitTalent(c, (s) => s.pending && s.pending.result === 'suc_luc' && s.pending.locked === true);
    c.socket.emit('talent_reroll_start');
    await waitTalent(c, (s) => s.pending && s.pending.rerolling === true);
    c.socket.emit('talent_pick', { tier: 'vo', id: 'the_chat' });
    await waitTalent(c, (s) => s.pending && s.pending.comparing === true);
    c.socket.emit('talent_reroll_choose', { which: 'new' });
    await waitTalent(c, (s) => s.pending && s.pending.comparing === false && s.pending.result === 'the_chat');
    c.socket.emit('create_character', { name: 'KiepMoi341B', classId: 'kiemtu' });
    await waitFor(() => c.welcome, 20000);
    const wc = c.welcome.character;
    ok('C1 choose-new: talent=the_chat', !!wc.talent && wc.talent.id === 'the_chat' && wc.talent.active === true, JSON.stringify(wc.talent));
    ok('C2 hiệu ứng áp đúng: maxHp = 100 + khiHuyet*10 + 30', wc.maxHp === 100 + wc.stats.khiHuyet * 10 + 30, `maxHp=${wc.maxHp} khiHuyet=${wc.stats.khiHuyet}`);
    c.socket.disconnect();
  }

  // ---- C) Ca C: choose-held + đo hiệu ứng GIỮ CŨ (tk341d120b, 1 lượt) ----
  {
    const c = connect('tk341d120b');
    await waitFor(() => c.needChar, 20000);
    c.socket.emit('talent_catalog_get'); await waitFor(() => c.catalog, 5000);
    c.socket.emit('talent_pick', { tier: 'vo', id: 'suc_luc' });
    await waitTalent(c, (s) => s.pending && s.pending.result === 'suc_luc' && s.pending.locked === true);
    c.socket.emit('talent_reroll_start');
    await waitTalent(c, (s) => s.pending && s.pending.rerolling === true);
    c.socket.emit('talent_pick', { tier: 'vo', id: 'the_chat' });
    await waitTalent(c, (s) => s.pending && s.pending.comparing === true);
    c.socket.emit('talent_reroll_choose', { which: 'held' });
    await waitTalent(c, (s) => s.pending && s.pending.comparing === false && s.pending.result === 'suc_luc');
    c.socket.emit('create_character', { name: 'KiepMoi341C', classId: 'kiemtu' });
    await waitFor(() => c.welcome, 20000);
    const wc = c.welcome.character;
    ok('C3 choose-held: talent=suc_luc (cũ)', !!wc.talent && wc.talent.id === 'suc_luc', JSON.stringify(wc.talent));
    ok('C4 hiệu ứng theo CŨ: maxHp = 100 + khiHuyet*10 (KHÔNG +30 của the_chat)', wc.maxHp === 100 + wc.stats.khiHuyet * 10, `maxHp=${wc.maxHp} khiHuyet=${wc.stats.khiHuyet}`);
    c.socket.disconnect();
  }

  // ---- E) Hồi quy kiếp đầu: token mới tinh, 0 lượt (tk341new1) ----
  {
    const c = connect('tk341new1');
    await waitFor(() => c.needChar, 20000);
    c.socket.emit('talent_catalog_get'); await waitFor(() => c.catalog, 5000);
    const st = await waitTalent(c, (s) => !!s.pending, 8000);
    ok('E1 kiếp đầu: rerollTotal=0 (không có nút/dòng bốc lại)', !!st && (st.pending.rerollTotal || 0) === 0 && (st.pending.rerollLeft || 0) === 0, JSON.stringify(st && st.pending));
    c.socket.emit('talent_pick', { tier: 'vo', id: 'the_chat' });
    await waitTalent(c, (s) => s.pending && s.pending.result === 'the_chat' && s.pending.locked === true);
    c.socket.emit('talent_reroll_start');
    await sleep(700);
    const p = lastPend(c);
    ok('E2 kiếp đầu: reroll_start bị từ chối (không rerolling)', !!p && p.rerolling === false && p.result === 'the_chat', JSON.stringify(p));
    c.socket.emit('create_character', { name: 'KiepDau341', classId: 'kiemtu' });
    await waitFor(() => c.welcome, 20000);
    const wc = c.welcome.character;
    ok('E3 tạo mới thường chạy như GĐ337: talent the_chat + maxHp +30', !!wc.talent && wc.talent.id === 'the_chat' && wc.maxHp === 100 + wc.stats.khiHuyet * 10 + 30, `talent=${JSON.stringify(wc.talent)} maxHp=${wc.maxHp}`);
    c.socket.disconnect();
  }
  await stopServer();

  // ================= PHIÊN 2 (3622): bền qua restart + autosave + hồi quy bốc bù =================
  const filePre = JSON.parse(fs.readFileSync(path.join(DIR, 'characters.json'), 'utf8'));
  filePre['tk341old1'] = BASE('tk341old1', 'Cu341Old', { realm: 'lk', tier: 1, mapId: 'lang_tan_thu', x: 1565, y: 1252, lifespan: 90, birthDay: 0 });
  delete filePre['tk341old1'].talent;
  fs.writeFileSync(path.join(DIR, 'characters.json'), JSON.stringify(filePre, null, 1));
  await startServer(3622, '341b');
  await sleep(17000); // >1 chu kỳ autosave 15s của diễn viên offline
  {
    const fileChars = JSON.parse(fs.readFileSync(path.join(DIR, 'characters.json'), 'utf8'));
    ok('D1 bền qua restart + autosave offline: talent kiếp mới còn nguyên trong file', !!fileChars.tk341dall && !!fileChars.tk341dall.talent && fileChars.tk341dall.talent.id === A_TIM_ID, JSON.stringify(fileChars.tk341dall && fileChars.tk341dall.talent) + ' expect=' + A_TIM_ID);
    const c = connect('tk341dall');
    await waitFor(() => c.welcome, 20000);
    ok('D2 sau restart: payload talent của kiếp mới đúng', !!c.welcome && !!c.welcome.character.talent && c.welcome.character.talent.id === A_TIM_ID, JSON.stringify(c.welcome && c.welcome.character.talent));
    c.socket.disconnect();
  }
  {
    const c = connect('tk341old1');
    await waitFor(() => c.welcome, 20000);
    ok('D3 hồi quy bốc bù: nhân vật cũ talent=null + được mời bốc', c.welcome.character.talent === null && c.notices.some((x) => /chưa có thiên phú/i.test(x)), JSON.stringify(c.welcome.character.talent));
    c.socket.emit('talent_catalog_get'); await waitFor(() => c.catalog, 5000);
    c.socket.emit('talent_pick', { tier: 'bach', id: 'tho_dai' });
    const done = await waitTalent(c, (s) => !!s.done, 8000);
    ok('D4 bốc bù chọn tho_dai -> done', !!done && done.done && done.done.id === 'tho_dai', JSON.stringify(done && done.done));
    const anyReroll = c.tstate.some((s) => s.pending && (s.pending.rerollTotal || 0) > 0);
    ok('D5 bốc bù KHÔNG có lượt bốc lại (mọi state rerollTotal=0)', !anyReroll, JSON.stringify(c.tstate.map((s) => s.pending && s.pending.rerollTotal)));
    c.socket.disconnect();
  }
  await stopServer();
  console.log(`\n=== GĐ341 PROBE: PASS ${pass} / FAIL ${fail} ===`);
  process.exit(fail ? 1 : 0);
})().catch(async (e) => { console.error('PROBE ERROR', e); try { await stopServer(); } catch (x) {} process.exit(2); });
