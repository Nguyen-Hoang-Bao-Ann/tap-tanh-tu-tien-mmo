// Probe GĐ387 — DIÊN THỌ ĐAN (Bảo chốt hết theo đề xuất 11/11 20:30, THIET_KE_DIEN_THO_DAN):
// +2 năm/viên · trần 3 viên/kiếp · không khóa cảnh · chỉ rơi rương trùm Phản Hư+ (12%)
// · chặn bán tiệm · cho trade người–người.
// Chân kiểm:
//  0) Tĩnh: ITEMS = 172; icon chiêu = 1.360; FX = 85; marker intro còn; dan_dien_tho có
//     ITEMS + ITEM_INFO + icon file; KHÔNG có trong SHOPS (mua/bán) và RECIPES (không chế);
//     server có DIEN_THO_* + nhánh use_item + stamp dienThoBoss; zip 385 không đổi md5.
//  1) Dùng đan: viên 1/2/3 → lifespan +2/viên, dienThoUsed tăng, ach_lifeBonus +2/viên;
//     viên 4 → chặn "đủ 3 viên", KHÔNG trừ đan, lifespan giữ nguyên. File sau disconnect khớp.
//  2) Ân hạn: char thọ ≤ 0 đang ân hạn (graceStartDay=0) vào game không tọa hóa; ăn 1 viên
//     → thọ dương, ân hạn hủy (payload graceDaysLeft=null + sự kiện lifespan_grace null +
//     notice THOÁT ân hạn); file: graceStartDay=null, lifespan đã cộng.
//  3) Bán tiệm bị chặn tường minh "tiệm không thu mua", ví + túi nguyên vẹn.
//  4) Trade người–người: đan LÊN được bàn trade (không bị lọc) + confirm 2 phía → chuyển thật.
//  5) Persist: dùng 1 viên → disconnect → restart → relog còn nguyên; offline actor qua
//     1 chu kỳ autosave 15s → file vẫn nguyên dienThoUsed/lifespan (luật bền GĐ89/95).
//  6) Kiếp mới: char đã tọa hóa (dead + soul, dienThoUsed=3, ach_lifeBonus=6) → tạo nhân
//     vật mới thừa hưởng hồn: dienThoUsed về 0 (đếm theo kiếp reset), ach_lifeBonus VẪN
//     theo counters sang (6); viên đan mang theo qua carryBag dùng được ngay (+2, used=1).
//  7) Rương: xem p387chest.cjs (đo riêng, nhiều boot).
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const net = require('net');
const crypto = require('crypto');
const ROOT = path.join(__dirname, '..', '..');
const DIR = __dirname;
const { io } = require(path.join(ROOT, 'client/node_modules/socket.io-client'));
const { createMerger } = require(path.join(ROOT, 'client/worldmerge.cjs'));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function waitFor(fn, ms) { const t0 = Date.now(); while (Date.now() - t0 < ms) { const v = fn(); if (v) return v; await sleep(120); } return null; }
function portFree(port) { return new Promise((res) => { const s = net.createServer(); s.once('error', () => res(false)); s.listen(port, () => s.close(() => res(true))); }); }
let serverProc = null, killTimer = null, CUR_PORT = 0;
async function startServer(port, tag, extraEnv) {
  CUR_PORT = port;
  if (!(await portFree(port))) throw new Error('port ban ' + port);
  serverProc = spawn('node', ['server/index.js'], { cwd: ROOT, env: { ...process.env, PORT: String(port), TTT_STORAGE: 'file', TTT_CHAR_FILE: path.join(DIR, 'characters.json'), TTT_ACC_FILE: path.join(DIR, 'accounts.json'), TTT_WORLD_FILE: path.join(DIR, 'world.json'), TTT_SESS_FILE: path.join(DIR, 'sessions.json'), TTT_DAY_REAL_MS: '600000', TTT_TUVI_NEED: '5', ...(extraEnv || {}) }, stdio: ['ignore', 'pipe', 'pipe'] });
  serverProc.stderr.on('data', (d) => { try { fs.appendFileSync(path.join(DIR, 'srv_' + tag + '.log'), d); } catch (e) {} });
  serverProc.stdout.on('data', (d) => { try { fs.appendFileSync(path.join(DIR, 'srv_' + tag + '.log'), d); } catch (e) {} });
  killTimer = setTimeout(() => { try { serverProc.kill('SIGKILL'); } catch (e) {} }, 1500000);
  const t0 = Date.now();
  while (Date.now() - t0 < 90000) { try { const r = await fetch(`http://127.0.0.1:${port}/api/status`); if (r.ok) { clearTimeout(killTimer); return; } } catch (e) {} await sleep(400); }
  throw new Error('server khong len');
}
async function stopServer() { if (!serverProc) return; const p = serverProc; serverProc = null; if (killTimer) { clearTimeout(killTimer); killTimer = null; } await new Promise((res) => { const t = setTimeout(() => { try { p.kill('SIGKILL'); } catch (e) {} res(); }, 4000); p.once('exit', () => { clearTimeout(t); res(); }); try { p.kill('SIGTERM'); } catch (e) { clearTimeout(t); res(); } }); const t0 = Date.now(); while (Date.now() - t0 < 10000 && !(await portFree(CUR_PORT))) await sleep(300); }
const LC1 = { elements: ['kim'], main: 'kim', count: 1, mutations: [] };
function BASE(token, name, extra) {
  return Object.assign({ token, name, classId: 'kiemtu', gender: 'nam', race: null, geo175: 1, realm: 'lk', tier: 1, x: 1000, y: 1000, mapId: 'lang_tan_thu', hp: 999999, mp: 9999, lifespan: 500, birthDay: -5660, ageStart: 16, stats: { khiHuyet: 500, vatCong: 300, vatPhong: 200, phapCong: 300, phapPhong: 200, tocDo: 60, minhMan: 100 }, statPoints: 0, freePoints: 0, tuVi: 99999, stones: 100000, stonesTrung: 0, stonesThuong: 0, stonesCuc: 0, inventory: {}, gearBag: {}, equipped: [], skills: [], job: null, job2: null, job3: null, linhCan: { ...LC1 }, affinity: {}, affV2: 1, bonds: {}, quests: {}, questsDone: {}, flags: {}, counters: {}, disciples: [], foundInvites: [], reformIn: [], sectTech: [], sectArts: [], sectArtsActive: [], mails: [], classRes: {}, food: 100, water: 100 }, extra || {});
}
let pass = 0, fail = 0;
function ok(name, cond, extra) { if (cond) { pass++; console.log('PASS | ' + name); } else { fail++; console.log('FAIL | ' + name + (extra ? ' | ' + extra : '')); } }
function info(name, val) { console.log('INFO | ' + name + ' | ' + val); }
function connect(token) {
  const socket = io(`http://127.0.0.1:${CUR_PORT}`, { transports: ['websocket'] });
  const ctx = { socket, merger: createMerger(), state: null, welcome: null, syncs: [], errs: [], notices: [], tradeUpdates: [], tradeDone: 0, graceEvents: [], needChar: false, diedMsg: null, talentCat: null, talentState: null, createErr: null, myName: null, myId: null };
  socket.on('connect', () => socket.emit('hello', { token }));
  socket.on('welcome', (w) => { ctx.welcome = w; ctx.myName = (w.character || {}).name; ctx.myId = w.id; });
  socket.on('need_character', () => { ctx.needChar = true; });
  socket.on('character_died', (d) => { ctx.diedMsg = d; });
  socket.on('talent_catalog', (d) => { ctx.talentCat = d; });
  socket.on('talent_state', (d) => { ctx.talentState = d; });
  socket.on('create_error', (d) => { ctx.createErr = d; });
  socket.on('char_sync', (s) => ctx.syncs.push(s));
  socket.on('interact_error', (e) => ctx.errs.push({ t: Date.now(), msg: e.message || '' }));
  socket.on('notice', (n) => ctx.notices.push(n.text || ''));
  socket.on('trade_update', (u) => ctx.tradeUpdates.push(u));
  socket.on('trade_done', () => { ctx.tradeDone++; });
  socket.on('lifespan_grace', (g) => ctx.graceEvents.push(g));
  socket.on('server_tick', (t) => { const st = ctx.merger(t); if (st) ctx.state = st; });
  return ctx;
}
const lastChar = (c) => { for (let i = c.syncs.length - 1; i >= 0; i--) { if (c.syncs[i]) return c.syncs[i]; } return c.welcome ? c.welcome.character : null; };
const invOf = (c, id) => { const ch = lastChar(c); return (ch && ch.inventory && ch.inventory[id]) || 0; };
function writeStore(chars) {
  for (const f of ['characters.json', 'accounts.json', 'world.json', 'sessions.json']) { try { fs.unlinkSync(path.join(DIR, f)); } catch (e) {} }
  fs.writeFileSync(path.join(DIR, 'characters.json'), JSON.stringify(chars));
  fs.writeFileSync(path.join(DIR, 'accounts.json'), JSON.stringify({}));
}
const readCharFile = (token) => JSON.parse(fs.readFileSync(path.join(DIR, 'characters.json'), 'utf8'))[token];
function extractBlock(src, marker) {
  const i = src.indexOf(marker); if (i < 0) return '';
  let depth = 0, j = src.indexOf('{', i); const s = j;
  for (; j < src.length; j++) { if (src[j] === '{') depth++; else if (src[j] === '}') { depth--; if (!depth) break; } }
  return src.slice(s, j + 1);
}

(async () => {
  try {
    // ---------- Chân 0: tĩnh ----------
    const srvSrc = fs.readFileSync(path.join(ROOT, 'server/index.js'), 'utf8');
    const ITEMS = eval('(' + extractBlock(srvSrc, 'const ITEMS = {') + ')');
    ok('chân 0a: ITEMS server = 172 loại', Object.keys(ITEMS).length === 172, 'dem=' + Object.keys(ITEMS).length);
    ok('chân 0b: ITEMS có dan_dien_tho (Diên Thọ Đan)', !!ITEMS.dan_dien_tho && ITEMS.dan_dien_tho.name === 'Diên Thọ Đan');
    const iconCount = fs.readdirSync(path.join(ROOT, 'client/public/icons')).filter((f) => f.endsWith('.png')).length;
    ok('chân 0c: icon chiêu public = 1360', iconCount === 1360, 'dem=' + iconCount);
    const fxCount = fs.readdirSync(path.join(ROOT, 'client/public/sprites/fx')).length;
    ok('chân 0d: FX = 85', fxCount === 85, 'dem=' + fxCount);
    const cliSrc = fs.readFileSync(path.join(ROOT, 'client/src/main.ts'), 'utf8');
    ok('chân 0e: marker ttt_intro_v1 còn trong client', cliSrc.includes('ttt_intro_v1'));
    ok('chân 0f: client ITEM_INFO có dan_dien_tho + nối động dienThoUsed ở renderInv', cliSrc.includes("dan_dien_tho: { name: 'Diên Thọ Đan'") && cliSrc.includes('descExtra387'));
    ok('chân 0g: icon item dan_dien_tho.png đã cài (96x96)', (() => { try { const b = fs.readFileSync(path.join(ROOT, 'client/public/sprites/items/dan_dien_tho.png')); return b.length > 1000 && b.readUInt32BE(16) === 96 && b.readUInt32BE(20) === 96; } catch (e) { return false; } })());
    const shopsBlock = extractBlock(srvSrc, 'const SHOPS = {');
    ok('chân 0h: dan_dien_tho KHÔNG có trong SHOPS (không bán/không thu mua theo bảng giá)', !shopsBlock.includes('dan_dien_tho'));
    const recipesBlock = extractBlock(srvSrc, 'const RECIPES = {');
    ok('chân 0i: dan_dien_tho KHÔNG có công thức chế (không trong RECIPES)', !recipesBlock.includes('dan_dien_tho'));
    ok('chân 0j: server đủ cơ chế GĐ387 (hằng số + use_item + stamp rương + chặn bán)', srvSrc.includes('DIEN_THO_CHEST_RATE') && srvSrc.includes("id === 'dan_dien_tho'") && srvSrc.includes('chc.dienThoBoss = 1') && srvSrc.includes('tiệm không thu mua'));
    const zipPath = path.join(ROOT, '..', 'tap-tanh-tu-tien-mmo_GD235-385.zip');
    const zipMd5 = crypto.createHash('md5').update(fs.readFileSync(zipPath)).digest('hex');
    ok('chân 0k: zip GD235-385 nguyên vẹn (md5 khớp)', zipMd5 === '66d4e90e6c97549a688bd5f21b78753e', zipMd5);

    // ---------- Boot A: dùng đan / ân hạn / bán / trade ----------
    writeStore({
      dung387a: BASE('dung387a', 'DungTho387', { inventory: { dan_dien_tho: 4 } }),
      grace387a: BASE('grace387a', 'AnHan387', { inventory: { dan_dien_tho: 1 }, lifespan: 30, graceStartDay: 0 }),
      ban387aa: BASE('ban387aa', 'BanTho387', { inventory: { dan_dien_tho: 2 }, stones: 5000 }),
      trade387a: BASE('trade387a', 'TradeA387', { inventory: { dan_dien_tho: 2 } }),
      trade387b: BASE('trade387b', 'TradeB387', {}),
    });
    await startServer(3997, 'main');
    const st = await fetch(`http://127.0.0.1:3997/api/status`).then((r) => r.json()).catch(() => null);
    ok('boot A: /api/status 4.579 quái', !!st && st.monsters === 4579, st ? 'monsters=' + st.monsters : 'no status');

    // ----- Chân 1: dùng đan + trần -----
    const ca = connect('dung387a');
    await waitFor(() => ca.welcome && lastChar(ca), 20000);
    const c0 = lastChar(ca);
    ok('chân 1a: payload ban đầu lifespan=500, dienThoUsed=0', c0.lifespan === 500 && (c0.dienThoUsed || 0) === 0, `lifespan=${c0.lifespan} used=${c0.dienThoUsed}`);
    ca.socket.emit('use_item', { itemId: 'dan_dien_tho' });
    const u1 = await waitFor(() => { const ch = lastChar(ca); return ch && ch.dienThoUsed === 1 ? ch : null; }, 8000);
    ok('chân 1b: viên 1 → lifespan 502 (+2), thọ còn +2, túi còn 3', !!u1 && u1.lifespan === 502 && u1.lifespanLeft === (c0.lifespanLeft + 2) && invOf(ca, 'dan_dien_tho') === 3, u1 ? `lifespan=${u1.lifespan} left=${u1.lifespanLeft}` : 'no sync');
    ok('chân 1c: notice "+2 năm thọ ... đã dùng 1/3"', ca.notices.some((t) => t.includes('Diên Thọ Đan: +2 năm thọ') && t.includes('đã dùng 1/3')), ca.notices.slice(-3).join(' | '));
    ca.socket.emit('use_item', { itemId: 'dan_dien_tho' });
    await waitFor(() => { const ch = lastChar(ca); return ch && ch.dienThoUsed === 2 ? ch : null; }, 8000);
    ca.socket.emit('use_item', { itemId: 'dan_dien_tho' });
    const u3 = await waitFor(() => { const ch = lastChar(ca); return ch && ch.dienThoUsed === 3 ? ch : null; }, 8000);
    ok('chân 1d: đủ 3 viên → lifespan 506 (+6), túi còn 1', !!u3 && u3.lifespan === 506 && invOf(ca, 'dan_dien_tho') === 1, u3 ? `lifespan=${u3.lifespan}` : 'no sync');
    const e1 = ca.errs.length;
    ca.socket.emit('use_item', { itemId: 'dan_dien_tho' });
    const capErr = await waitFor(() => ca.errs.slice(e1).find((e) => e.msg.includes('đủ 3 viên')), 8000);
    await sleep(600);
    const u4 = lastChar(ca);
    ok('chân 1e: viên 4 bị chặn "đủ 3 viên"', !!capErr, JSON.stringify(ca.errs.slice(e1)));
    ok('chân 1f: viên 4 KHÔNG trừ đan (túi vẫn 1), lifespan giữ 506, used giữ 3', invOf(ca, 'dan_dien_tho') === 1 && u4.lifespan === 506 && u4.dienThoUsed === 3, `inv=${invOf(ca, 'dan_dien_tho')} lifespan=${u4.lifespan}`);
    ca.socket.disconnect();
    await sleep(900);
    const fileA = readCharFile('dung387a');
    ok('chân 1g: file — lifespan 506 + dienThoUsed 3 + ach_lifeBonus 6', !!fileA && fileA.lifespan === 506 && fileA.dienThoUsed === 3 && fileA.counters && fileA.counters.ach_lifeBonus === 6, fileA ? `lifespan=${fileA.lifespan} used=${fileA.dienThoUsed} bonus=${(fileA.counters || {}).ach_lifeBonus}` : 'no file');

    // ----- Chân 2: ân hạn -----
    const cg = connect('grace387a');
    const gw = await waitFor(() => cg.welcome && lastChar(cg), 20000);
    ok('chân 2a: char hết thọ đang ân hạn vào game được (không tọa hóa)', !!gw && !cg.diedMsg, cg.diedMsg ? JSON.stringify(cg.diedMsg) : '');
    const g0 = lastChar(cg);
    ok('chân 2b: payload — thọ còn ≤ 0, còn ngày ân hạn (graceDaysLeft > 0)', !!g0 && g0.lifespanLeft <= 0 && typeof g0.graceDaysLeft === 'number' && g0.graceDaysLeft > 0, g0 ? `left=${g0.lifespanLeft} grace=${g0.graceDaysLeft}` : 'no sync');
    cg.socket.emit('use_item', { itemId: 'dan_dien_tho' });
    const g1 = await waitFor(() => { const ch = lastChar(cg); return ch && ch.graceDaysLeft === null ? ch : null; }, 8000);
    ok('chân 2c: ăn 1 viên → thọ dương (+1), ân hạn hủy (graceDaysLeft=null)', !!g1 && g1.lifespan === 32 && g1.lifespanLeft === 1 && (g1.dienThoUsed || 0) === 1, g1 ? `lifespan=${g1.lifespan} left=${g1.lifespanLeft}` : 'no sync');
    ok('chân 2d: notice có "THOÁT ân hạn tọa hóa"', cg.notices.some((t) => t.includes('THOÁT ân hạn')), cg.notices.slice(-3).join(' | '));
    ok('chân 2e: sự kiện lifespan_grace {graceDaysLeft: null} đã phát', cg.graceEvents.some((g) => g && g.graceDaysLeft === null), JSON.stringify(cg.graceEvents));
    cg.socket.disconnect();
    await sleep(900);
    const fileG = readCharFile('grace387a');
    ok('chân 2f: file — graceStartDay=null, lifespan 32, dienThoUsed 1', !!fileG && fileG.graceStartDay === null && fileG.lifespan === 32 && fileG.dienThoUsed === 1, fileG ? `grace=${fileG.graceStartDay} lifespan=${fileG.lifespan}` : 'no file');

    // ----- Chân 3: bán tiệm -----
    const cs = connect('ban387aa');
    const csW = await waitFor(() => cs.welcome && lastChar(cs), 20000);
    if (!csW) throw new Error('BanTho387 khong vao duoc game');
    const sErr0 = cs.errs.length;
    cs.socket.emit('shop_sell', { shopId: 'tiem_dan', itemId: 'dan_dien_tho' });
    const sellErr = await waitFor(() => cs.errs.slice(sErr0).find((e) => e.msg.includes('tiệm không thu mua')), 8000);
    await sleep(500);
    const sC = lastChar(cs);
    ok('chân 3a: bán tiệm bị chặn tường minh "tiệm không thu mua"', !!sellErr, JSON.stringify(cs.errs.slice(sErr0)));
    ok('chân 3b: túi còn nguyên 2 viên, ví không đổi (5000)', invOf(cs, 'dan_dien_tho') === 2 && sC.stones === 5000, `inv=${invOf(cs, 'dan_dien_tho')} stones=${sC.stones}`);
    cs.socket.disconnect();

    // ----- Chân 4: trade -----
    const t1 = connect('trade387a');
    const t2 = connect('trade387b');
    await waitFor(() => t1.welcome && t2.welcome && lastChar(t1) && lastChar(t2), 20000);
    t1.socket.emit('trade_request', { targetId: t2.myId });
    await sleep(800);
    t2.socket.emit('trade_accept', {});
    await sleep(800);
    t1.socket.emit('trade_set', { items: { dan_dien_tho: 1 }, stones: 0 });
    const tu = await waitFor(() => { const u = t2.tradeUpdates[t2.tradeUpdates.length - 1]; return u && u.theirs && (u.theirs.items || {}).dan_dien_tho === 1 ? u : null; }, 8000);
    ok('chân 4a: đan LÊN được bàn trade (không bị lọc như pháp bảo)', !!tu, JSON.stringify(t2.tradeUpdates.map((u) => u.theirs)));
    t1.socket.emit('trade_confirm', { on: true });
    await sleep(500);
    t2.socket.emit('trade_confirm', { on: true });
    const done = await waitFor(() => t1.tradeDone > 0 && t2.tradeDone > 0, 8000);
    await sleep(700);
    ok('chân 4b: confirm 2 phía → trade_done 2 bên', !!done, `done=${t1.tradeDone}/${t2.tradeDone}`);
    ok('chân 4c: đan chuyển thật — A còn 1, B có 1', invOf(t1, 'dan_dien_tho') === 1 && invOf(t2, 'dan_dien_tho') === 1, `A=${invOf(t1, 'dan_dien_tho')} B=${invOf(t2, 'dan_dien_tho')}`);
    t1.socket.disconnect(); t2.socket.disconnect();
    await stopServer();
  } catch (e) {
    console.log('PROBE ERROR: ' + (e && e.stack || e));
    fail++;
    try { await stopServer(); } catch (e2) {}
  }
  console.log(`=== GĐ387 PROBE (phần chính): ${pass} PASS / ${fail} FAIL ===`);
  process.exit(fail ? 1 : 0);
})();
