// Probe GĐ351 — NỐI MỐC 500 ĐẠO TÍCH "+1 loại vật phẩm mang sang kiếp sau" (3 → 4 loại).
// Mẫu an toàn: giới hạn là thuộc tính của HỒN (soul.carryMax đóng dấu tại soul_set_carry theo
// Đạo Tích hiện tại của chủ hồn); soulNorm đọc giới hạn đã lưu ở mọi điểm chuẩn hóa.
// Chân kiểm:
// 1) Panel: mốc 500 active=true, không còn why; daoTich 500 → reached=true.
// 2) HỒI QUY daoTich 0: gửi 5 loại → carryBag đúng 3, payload carryMax=3 (hành vi cũ nguyên vẹn).
// 3) BIÊN: daoTich 499 → 3 loại; daoTich 500 → 4 loại.
// 4) VÒNG ĐỜI THẬT (daoTich 500, nhân vật đang ân hạn): gửi 4 loại → tọa hóa (rebirth_now)
//    → tạo kiếp mới cùng token → đủ 4 loại vào túi kiếp mới với đúng số lượng; loại thứ 5 không theo.
// 5) CHÂN BỀN (quan trọng nhất): hồn mang 4 loại → RESTART server → chờ autosave 15s của diễn
//    viên offline ghi lại file → đọc THẲNG characters.json: carryBag vẫn 4 + carryMax=4;
//    nối lại → payload vẫn 4.
// 6) HỒN CŨ (fixture tiền-GĐ351, soul KHÔNG có field carryMax): nạp bình thường ở mức 3,
//    không lỗi — cả hồn sống (spawn) lẫn hồn chết (thừa hưởng lúc tạo kiếp mới).
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
let serverProc = null, killTimer = null, CUR_PORT = 3680;
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
  return Object.assign({ token, name, classId: 'kiemtu', gender: 'nam', race: null, geo175: 1, realm: 'lk', tier: 9, x: 1565, y: 1252, mapId: 'lang_tan_thu', hp: 99999, lifespan: 500, birthDay: -5660, ageStart: 16, stats: { ...STATS }, statPoints: 0, freePoints: 0, tuVi: 99999, stones: 0, stonesTrung: 0, stonesThuong: 0, stonesCuc: 0, inventory: {}, gearBag: {}, equipped: [], skills: [], job: null, job2: null, job3: null, linhCan: { ...LC1 }, affinity: {}, affV2: 1, bonds: {}, quests: {}, questsDone: {}, flags: {}, counters: {}, disciples: [], foundInvites: [], reformIn: [], sectTech: [], sectArts: [], sectArtsActive: [], mails: [], classRes: {}, food: 100, water: 100 }, extra || {});
}
const DAO = (daoTich) => ({ achState: { tiers: {}, title: null, daoTich, notified: {} } });
const ITEMS5 = ['linh_thao', 'tinh_huyet', 'da_quy', 'tien_linh_chi', 'huyet_tinh'];
const INV5 = { linh_thao: 11, tinh_huyet: 22, da_quy: 33, tien_linh_chi: 44, huyet_tinh: 55 };
let pass = 0, fail = 0;
function ok(name, cond, extra) { if (cond) { pass++; console.log('PASS | ' + name); } else { fail++; console.log('FAIL | ' + name + (extra ? ' | ' + extra : '')); } }
function connect(token) {
  const socket = io(`http://127.0.0.1:${CUR_PORT}`, { transports: ['websocket'] });
  const ctx = { socket, merger: createMerger(), state: null, welcome: null, needChar: false, syncs: [], errs: [], notices: [], died: null, createErr: null, myName: null, tstate: [] };
  socket.on('connect', () => socket.emit('hello', { token }));
  socket.on('welcome', (w) => { ctx.welcome = w; ctx.myName = (w.character || {}).name; });
  socket.on('talent_state', (s) => ctx.tstate.push(s));
  socket.on('need_character', () => { ctx.needChar = true; });
  socket.on('create_error', (e) => { ctx.createErr = e.message || ''; });
  socket.on('char_sync', (s) => ctx.syncs.push(s));
  socket.on('notice', (n) => ctx.notices.push(n.text || ''));
  socket.on('interact_error', (e) => ctx.errs.push(e.message || ''));
  socket.on('character_died', (d) => { ctx.died = d; });
  socket.on('server_tick', (t) => { const st = ctx.merger(t); if (st) ctx.state = st; });
  return ctx;
}
const lastSoul = (c) => { for (let i = c.syncs.length - 1; i >= 0; i--) { const s = c.syncs[i]; if (s && s.soul) return s.soul; } return c.welcome && c.welcome.character ? c.welcome.character.soul : null; };
const lastChar = (c) => { for (let i = c.syncs.length - 1; i >= 0; i--) { if (c.syncs[i]) return c.syncs[i]; } return c.welcome ? c.welcome.character : null; };
// Tạo kiếp mới đúng quy trình GĐ337: bốc/chọn thiên phú trước (bậc Vô chọn thẳng suc_luc), rồi mới create_character.
async function createKiep(c, name) {
  c.socket.emit('talent_pick', { tier: 'vo', id: 'suc_luc' });
  await waitFor(() => { for (let i = c.tstate.length - 1; i >= 0; i--) { const s = c.tstate[i]; if (s.pending && s.pending.result === 'suc_luc' && s.pending.locked) return s; } return null; }, 8000);
  c.socket.emit('create_character', { name, classId: 'kiemtu' });
  return waitFor(() => c.welcome, 20000);
}
async function setCarry(c, ids) {
  const n0 = c.syncs.length;
  c.socket.emit('soul_set_carry', { itemIds: ids });
  return waitFor(() => (c.syncs.length > n0 && lastSoul(c)) ? lastSoul(c) : null, 8000);
}

(async () => {
  const chars = {};
  // A: daoTich 0 (hồi quy) · B: 499 (biên dưới) · C: 500 + ân hạn (vòng đời thật) · D: 500 (chân bền/restart)
  chars['tk351reg0'] = BASE('tk351reg0', 'P351Reg0', { ...DAO(0), inventory: { ...INV5 } });
  chars['tk351edge499'] = BASE('tk351edge499', 'P351Edge499', { ...DAO(499), inventory: { ...INV5 } });
  // C: thọ 80, tuổi = 16 + (0 - (-25200))/360 = 86 → hết thọ, vào ân hạn ngay khi vào game
  chars['tk351life500'] = BASE('tk351life500', 'P351Life500', { ...DAO(500), inventory: { ...INV5 }, lifespan: 80, birthDay: -25200 });
  chars['tk351stay500'] = BASE('tk351stay500', 'P351Stay500', { ...DAO(500), inventory: { ...INV5 } });
  // E: hồn cũ tiền-GĐ351 — soul KHÔNG có carryMax, carryBag sẵn 3 loại (sống)
  chars['tk351old3'] = BASE('tk351old3', 'P351Old3', { ...DAO(0), soul: { lives: 1, fullLives: 1, carryCount: 1, carryBag: [{ itemId: 'linh_thao', qty: 7 }, { itemId: 'da_quy', qty: 8 }, { itemId: 'tinh_huyet', qty: 9 }], consumed: false } });
  // F: hồn chết cũ — carryBag 3 loại, không carryMax → tạo kiếp mới phải thừa hưởng đúng 3
  chars['tk351olddead'] = BASE('tk351olddead', 'P351OldDead', { ...DAO(0), dead: true, deadAt: '2026-11-08T00:00:00.000Z', soul: { lives: 2, fullLives: 1, carryCount: 1, carryBag: [{ itemId: 'linh_thao', qty: 5 }, { itemId: 'da_quy', qty: 6 }, { itemId: 'tien_linh_chi', qty: 7 }], consumed: false } });
  fs.writeFileSync(path.join(DIR, 'characters.json'), JSON.stringify(chars));
  fs.writeFileSync(path.join(DIR, 'accounts.json'), '{}');
  fs.writeFileSync(path.join(DIR, 'world.json'), '{}');

  await startServer(3680, '351a');

  // ---- Chân 1: panel mốc 500 ----
  const cA = connect('tk351reg0');
  const wA = await waitFor(() => cA.welcome, 20000);
  ok('chân 1a: nhân vật thường vào được game', !!wA);
  const ms500 = wA && wA.character && wA.character.achievements ? (wA.character.achievements.daoMilestones || []).find((m) => m.at === 500) : null;
  ok('chân 1b: mốc 500 active=true', !!ms500 && ms500.active === true, JSON.stringify(ms500));
  ok('chân 1c: mốc 500 không còn why "chưa áp dụng"', !!ms500 && !ms500.why, ms500 && ms500.why);
  ok('chân 1d: daoTich 0 → mốc 500 reached=false', !!ms500 && ms500.reached === false);

  // ---- Chân 2: hồi quy daoTich 0 → 3 loại ----
  const sA = await setCarry(cA, ITEMS5);
  ok('chân 2a: daoTich 0 gửi 5 loại → carryBag = 3', !!sA && (sA.carryBag || []).length === 3, sA && JSON.stringify(sA.carryBag));
  ok('chân 2b: daoTich 0 → payload carryMax = 3', !!sA && sA.carryMax === 3, sA && String(sA.carryMax));
  const invA = (lastChar(cA) || {}).inventory || {};
  ok('chân 2c: 3 loại đã gửi rời túi, 2 loại còn lại nguyên', invA.linh_thao === undefined && invA.tinh_huyet === undefined && invA.da_quy === undefined && invA.tien_linh_chi === 44 && invA.huyet_tinh === 55, JSON.stringify(invA));
  cA.socket.disconnect();

  // ---- Chân 3a: biên 499 → 3 ----
  const cB = connect('tk351edge499');
  await waitFor(() => cB.welcome, 20000);
  const sB = await setCarry(cB, ITEMS5);
  ok('chân 3a: daoTich 499 → carryBag = 3, carryMax = 3', !!sB && (sB.carryBag || []).length === 3 && sB.carryMax === 3, sB && JSON.stringify({ n: (sB.carryBag || []).length, m: sB.carryMax }));
  cB.socket.disconnect();

  // ---- Chân 6a: hồn cũ sống, không field carryMax → mức 3, không lỗi ----
  const cE = connect('tk351old3');
  const wE = await waitFor(() => cE.welcome, 20000);
  const sE = wE && wE.character ? wE.character.soul : null;
  ok('chân 6a: hồn cũ (không carryMax) nạp bình thường, carryMax=3, bag=3', !!sE && sE.carryMax === 3 && (sE.carryBag || []).length === 3, sE && JSON.stringify(sE));
  cE.socket.disconnect();

  // ---- Chân 6b: hồn chết cũ → thừa hưởng đúng 3 ----
  const cF = connect('tk351olddead');
  await waitFor(() => cF.needChar || cF.welcome, 20000);
  const wF = await createKiep(cF, 'Kiep351Old');
  const invF = wF && wF.character ? (wF.character.inventory || {}) : {};
  ok('chân 6b: kiếp mới từ hồn cũ nhận đúng 3 loại (5/6/7)', invF.linh_thao === 5 && invF.da_quy === 6 && invF.tien_linh_chi === 7 && invF.tinh_huyet === undefined && invF.huyet_tinh === undefined, JSON.stringify(invF));
  cF.socket.disconnect();

  // ---- Chân 3b + 4: daoTich 500 → 4 loại, đi hết vòng đời tọa hóa → kiếp mới ----
  const cC = connect('tk351life500');
  const wC = await waitFor(() => cC.welcome, 20000);
  ok('chân 4a: nhân vật daoTich 500 (ân hạn) vào được game', !!wC);
  const sC = await setCarry(cC, ITEMS5);
  ok('chân 3b: daoTich 500 gửi 5 loại → carryBag = 4', !!sC && (sC.carryBag || []).length === 4, sC && JSON.stringify(sC.carryBag));
  ok('chân 3c: daoTich 500 → payload carryMax = 4', !!sC && sC.carryMax === 4, sC && String(sC.carryMax));
  const bagC = (sC && sC.carryBag) || [];
  ok('chân 3d: 4 loại đầu theo thứ tự chọn, đúng số lượng (11/22/33/44)', bagC.length === 4 && bagC[0].itemId === 'linh_thao' && bagC[0].qty === 11 && bagC[1].qty === 22 && bagC[2].qty === 33 && bagC[3].itemId === 'tien_linh_chi' && bagC[3].qty === 44, JSON.stringify(bagC));
  // chờ ân hạn xuất hiện trong payload rồi tọa hóa
  const grace = await waitFor(() => { const ch = lastChar(cC); return ch && ch.graceDaysLeft !== null && ch.graceDaysLeft !== undefined ? ch.graceDaysLeft : null; }, 20000);
  ok('chân 4b: nhân vật vào ân hạn (graceDaysLeft hiện)', grace !== null && grace !== undefined, 'grace=' + grace);
  cC.socket.emit('rebirth_now', {});
  const died = await waitFor(() => cC.died, 15000);
  ok('chân 4c: tọa hóa thành công (character_died)', !!died, cC.errs.join(';'));
  cC.socket.disconnect();
  await sleep(600);
  const cC2 = connect('tk351life500');
  await waitFor(() => cC2.needChar || cC2.welcome, 20000);
  const wC2 = await createKiep(cC2, 'Kiep351New');
  const invC2 = wC2 && wC2.character ? (wC2.character.inventory || {}) : {};
  ok('chân 4d: kiếp mới nhận ĐỦ 4 loại với đúng số lượng (11/22/33/44)', invC2.linh_thao === 11 && invC2.tinh_huyet === 22 && invC2.da_quy === 33 && invC2.tien_linh_chi === 44, JSON.stringify(invC2));
  ok('chân 4e: loại thứ 5 (huyet_tinh) KHÔNG theo sang', invC2.huyet_tinh === undefined, JSON.stringify(invC2));
  const ms500b = wC2 && wC2.character && wC2.character.achievements ? (wC2.character.achievements.daoMilestones || []).find((m) => m.at === 500) : null;
  ok('chân 1e: kiếp thừa hưởng daoTich 500 → mốc 500 reached=true', !!ms500b && ms500b.reached === true);
  cC2.socket.disconnect();

  // ---- Chân 5 (bền): D gửi 4 loại → restart → autosave offline → đọc file ----
  const cD = connect('tk351stay500');
  await waitFor(() => cD.welcome, 20000);
  const sD = await setCarry(cD, ITEMS5);
  ok('chân 5a: (trước restart) daoTich 500 → carryBag = 4', !!sD && (sD.carryBag || []).length === 4, sD && JSON.stringify(sD.carryBag));
  cD.socket.disconnect();
  await sleep(800);
  await stopServer();
  await startServer(3681, '351b');
  // chờ > 15s để autosave của diễn viên offline ghi lại toàn bộ file nhân vật
  await sleep(20000);
  let disk = null;
  try { disk = JSON.parse(fs.readFileSync(path.join(DIR, 'characters.json'), 'utf8')); } catch (e) {}
  const dSoul = disk && disk['tk351stay500'] ? disk['tk351stay500'].soul : null;
  ok('chân 5b: SAU restart + autosave offline, file vẫn giữ carryBag = 4', !!dSoul && (dSoul.carryBag || []).length === 4, dSoul && JSON.stringify(dSoul.carryBag));
  ok('chân 5c: file giữ carryMax = 4', !!dSoul && dSoul.carryMax === 4, dSoul && String(dSoul.carryMax));
  const diskC = disk && disk['tk351life500'] ? disk['tk351life500'].soul : null;
  ok('chân 5d: hồn đã thừa hưởng của C trong file: carryBag đã rỗng (đã trao), carryMax vẫn 4', !!diskC && (diskC.carryBag || []).length === 0 && diskC.carryMax === 4, diskC && JSON.stringify(diskC));
  const cD2 = connect('tk351stay500');
  const wD2 = await waitFor(() => cD2.welcome, 20000);
  const sD2 = wD2 && wD2.character ? wD2.character.soul : null;
  ok('chân 5e: nối lại sau restart → payload carryBag = 4, carryMax = 4', !!sD2 && (sD2.carryBag || []).length === 4 && sD2.carryMax === 4, sD2 && JSON.stringify(sD2));
  cD2.socket.disconnect();

  await stopServer();
  console.log(`\nKẾT QUẢ GĐ351: ${pass} PASS / ${fail} FAIL`);
  process.exit(fail ? 1 : 0);
})().catch(async (e) => { console.error('PROBE ERROR', e); try { await stopServer(); } catch (_) {} process.exit(2); });
