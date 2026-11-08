// Probe GĐ347 — GỠ PARKED perk nhóm Ẩn mốc 1 "+3% cơ duyên" (điểm treo cuối của hệ thiên phú/thành tựu).
// Bề mặt đo: welcome.character.anBonus.coDuyen {loot, chest} = đầu ra của coDuyenEffOf() — HÀM DUY NHẤT
// mà cả 2 điểm roll thật (kênh L hạ quái ở dropMonsterLoot, kênh R mở rương) đều dùng để roll, nên đo
// payload = đo đúng giá trị đưa vào roll (không đo tần suất thống kê vì 3% cần hàng nghìn mẫu).
// 1) Chưa đạt mốc 1 nhóm Ẩn -> coDuyen {0,0}; kênh luck Luyện Hồn không đổi (anBonus.luck = 1).
// 2) Đạt mốc 1 (Đạo Tích nhóm Ẩn = 6) -> {0.03, 0.03}; cộng dồn với thiên phú Khí vận nhỏ -> {0.18, 0.18}.
// 3) noBoost: nhóm Ẩn đã hoàn thành -> ach_choose_boost perk 1 bị chặn "không nhân đôi được" (perk 2 cũng vậy);
//    đối chứng nhóm Quái và trùm perk 1 nhân đôi ĐƯỢC -> cơ chế boost vẫn sống, chỉ riêng perk noBoost bị chặn.
// 4) Panel: perks[0] của nhóm Ẩn không còn parked, có noBoost, text nhắc cơ duyên, không còn why; milestoneReached đúng.
// 5) Hồi quy GĐ341: hồn chết có nhóm Ẩn mốc 2 -> vẫn đúng 1 lượt bốc lại; hồn chỉ mốc 1 -> 0 lượt (mốc 1 không cho lượt).
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
let serverProc = null, killTimer = null, CUR_PORT = 3650;
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
function ACH(tiers, extra) { return { achState: Object.assign({ tiers: tiers || {}, title: null, daoTich: 0, notified: {} }, extra || {}) }; }
// Đạo Tích nhóm Ẩn từ bậc ĐÃ NHẬN (daoTichForTier: bậc 1-3 = 1/bậc): mốc 1 cần >= 5, mốc 2 >= 10, mốc 3 >= 15.
const TIERS_M1 = { ach_an_secret: 3, ach_an_firstfail: 3 }; // 3 + 3 = 6 -> mốc 1 (chưa mốc 2)
const TIERS_M2 = { ach_an_dream: 4, ach_an_firstfail: 3, ach_an_secret: 3 }; // 5 + 3 + 3 = 11 -> mốc 2
const TIERS_FULL = { ach_an_firstfail: 3, ach_an_divineart: 1, ach_an_festverse: 3, ach_an_tandang: 1, ach_an_secret: 3, ach_an_dream: 4, ach_an_demon: 3, ach_an_souldef: 1, ach_an_cleanboss: 3 }; // 23 -> đủ 3 mốc + hoàn thành nhóm
function DEAD(token, name, tiers) {
  return BASE(token, name, { dead: true, deadAt: '2026-11-08T00:00:00.000Z', soul: { lives: 2, fullLives: 1, consumed: false }, achState: { tiers: tiers || {}, title: null, daoTich: 0, notified: {} } });
}
let pass = 0, fail = 0;
function ok(name, cond, extra) { if (cond) { pass++; console.log('PASS | ' + name); } else { fail++; console.log('FAIL | ' + name + (extra ? ' | ' + extra : '')); } }
function connect(token) {
  const socket = io(`http://127.0.0.1:${CUR_PORT}`, { transports: ['websocket'] });
  const ctx = { socket, welcome: null, needChar: false, tstate: [], syncs: [], errs: [], boosts: [] };
  socket.on('connect', () => socket.emit('hello', { token }));
  socket.on('welcome', (w) => { ctx.welcome = w; });
  socket.on('need_character', () => { ctx.needChar = true; });
  socket.on('talent_state', (s) => ctx.tstate.push(s));
  socket.on('char_sync', (s) => ctx.syncs.push(s));
  socket.on('interact_error', (e) => ctx.errs.push(e.message || ''));
  socket.on('ach_boost_result', (r) => ctx.boosts.push(r));
  return ctx;
}
const grpAn = (ch) => (((ch || {}).achievements || {}).groups || []).find((g) => g.id === 'an');
const grpQt = (ch) => (((ch || {}).achievements || {}).groups || []).find((g) => g.id === 'quai_trum');

(async () => {
  const chars = {};
  chars['tk347none'] = BASE('tk347none', 'P347None', ACH({}));
  chars['tk347m1x'] = BASE('tk347m1x', 'P347M1', ACH({ ...TIERS_M1 }));
  chars['tk347m1kv'] = BASE('tk347m1kv', 'P347M1KV', Object.assign(ACH({ ...TIERS_M1 }), { talent: { id: 'khi_van', tier: 'tim' } }));
  chars['tk347full'] = BASE('tk347full', 'P347Full', ACH({ ...TIERS_FULL }, { groupComplete: { an: true, quai_trum: true } }));
  chars['tk347dead1'] = DEAD('tk347dead1', 'P347Dead1', { ...TIERS_M2 });
  chars['tk347dead2'] = DEAD('tk347dead2', 'P347Dead2', { ...TIERS_M1 });
  fs.writeFileSync(path.join(DIR, 'characters.json'), JSON.stringify(chars, null, 1));
  fs.writeFileSync(path.join(DIR, 'accounts.json'), JSON.stringify({}, null, 1));
  for (const f of ['world.json', 'sessions.json']) { try { fs.unlinkSync(path.join(DIR, f)); } catch (e) {} }
  await startServer(3650, '347');

  // ---- 1) chưa đạt mốc: coDuyen = 0 ----
  {
    const c = connect('tk347none');
    await waitFor(() => c.welcome, 20000);
    const ch = c.welcome.character;
    const cd = ch.anBonus && ch.anBonus.coDuyen;
    ok('1a chưa mốc nào: anBonus.coDuyen = {loot:0, chest:0}', !!cd && cd.loot === 0 && cd.chest === 0, JSON.stringify(cd));
    ok('1b hồi quy kênh luck: anBonus.luck = 1 (không Luyện Hồn, không đổi)', ch.anBonus && ch.anBonus.luck === 1, JSON.stringify(ch.anBonus && ch.anBonus.luck));
    const g = grpAn(ch);
    ok('4a panel (chưa mốc): perks[0] parked=false (đã có cơ chế) + noBoost=true + không why', !!g && g.perks && g.perks[0] && g.perks[0].parked === false && g.perks[0].noBoost === true && !g.perks[0].why, JSON.stringify(g && g.perks && g.perks[0]));
    ok('4b panel (chưa mốc): milestoneReached = 0', !!g && g.milestoneReached === 0, JSON.stringify(g && g.milestoneReached));
    c.socket.disconnect();
  }

  // ---- 2) đạt mốc 1: +0.03; cộng dồn thiên phú ----
  {
    const c = connect('tk347m1x');
    await waitFor(() => c.welcome, 20000);
    const ch = c.welcome.character;
    const cd = ch.anBonus && ch.anBonus.coDuyen;
    ok('2a đạt mốc 1 (Đạo Tích nhóm 6): coDuyen = {loot:0.03, chest:0.03}', !!cd && cd.loot === 0.03 && cd.chest === 0.03, JSON.stringify(cd));
    const g = grpAn(ch);
    ok('4c panel (mốc 1): milestoneReached = 1', !!g && g.milestoneReached === 1, JSON.stringify(g && g.milestoneReached));
    ok('4d panel (mốc 1): perks[0].text nhắc cơ duyên, không còn chữ "sự kiện"', !!g && /cơ duyên/i.test(g.perks[0].text) && !/sự kiện/i.test(g.perks[0].text), g && g.perks[0].text);
    c.socket.disconnect();
  }
  {
    const c = connect('tk347m1kv');
    await waitFor(() => c.welcome, 20000);
    const cd = c.welcome.character.anBonus && c.welcome.character.anBonus.coDuyen;
    ok('2b cộng dồn: mốc 1 (+0.03) + Khí vận nhỏ (0.15) = {loot:0.18, chest:0.18}', !!cd && cd.loot === 0.18 && cd.chest === 0.18, JSON.stringify(cd));
    c.socket.disconnect();
  }

  // ---- 3) noBoost: chặn nhân đôi perk 1 (và 2), đối chứng nhóm khác vẫn nhân đôi được ----
  {
    const c = connect('tk347full');
    await waitFor(() => c.welcome, 20000);
    const cd0 = c.welcome.character.anBonus.coDuyen;
    ok('3a full nhóm Ẩn (Đạo Tích nhóm 23): coDuyen vẫn đúng 0.03', !!cd0 && cd0.loot === 0.03 && cd0.chest === 0.03, JSON.stringify(cd0));
    c.socket.emit('ach_choose_boost', { groupId: 'an', perk: 1 });
    const e1 = await waitFor(() => c.errs.find((m) => /không nhân đôi được/.test(m)), 6000);
    ok('3b boost perk 1 nhóm Ẩn -> bị chặn "không nhân đôi được", không có ach_boost_result', !!e1 && c.boosts.length === 0, JSON.stringify({ errs: c.errs, boosts: c.boosts }));
    c.socket.emit('ach_choose_boost', { groupId: 'an', perk: 2 });
    await sleep(900);
    const e2 = c.errs.filter((m) => /không nhân đôi được/.test(m)).length;
    ok('3c boost perk 2 nhóm Ẩn (mốc bốc lại) -> cũng bị chặn như cũ', e2 >= 2 && c.boosts.length === 0, JSON.stringify({ errs: c.errs, boosts: c.boosts }));
    c.socket.emit('ach_choose_boost', { groupId: 'quai_trum', perk: 1 });
    const b = await waitFor(() => c.boosts.find((r) => r.ok && r.groupId === 'quai_trum' && r.perk === 1), 6000);
    ok('3d đối chứng: boost perk 1 nhóm Quái và trùm -> THÀNH CÔNG (cơ chế boost vẫn sống)', !!b, JSON.stringify(c.boosts));
    const sync = await waitFor(() => { const s = c.syncs[c.syncs.length - 1]; return s && grpQt(s) && grpQt(s).boost === 1 ? s : null; }, 6000);
    ok('3e sau boost: payload nhóm Ẩn boost=null (không bị nhân đôi lén), Quái và trùm boost=1', !!sync && grpAn(sync).boost === null && grpQt(sync).boost === 1, JSON.stringify(sync && { an: grpAn(sync).boost, qt: grpQt(sync).boost }));
    const cd1 = sync && sync.anBonus && sync.anBonus.coDuyen;
    ok('3f sau mọi lần boost: coDuyen của full vẫn 0.03 (không thành 0.06)', !!cd1 && cd1.loot === 0.03 && cd1.chest === 0.03, JSON.stringify(cd1));
    c.socket.disconnect();
  }

  // ---- 5) hồi quy bốc lại GĐ341 ----
  for (const [tk, expect, label] of [
    ['tk347dead1', 1, '5a hồn mốc 2 nhóm Ẩn (Đạo Tích nhóm 11, Đạo Tích tổng 0) -> rerollTotal = 1 (không đổi)'],
    ['tk347dead2', 0, '5b hồn chỉ mốc 1 nhóm Ẩn (Đạo Tích nhóm 6) -> rerollTotal = 0 (mốc 1 không cho lượt)'],
  ]) {
    const c = connect(tk);
    await waitFor(() => c.needChar, 20000);
    c.socket.emit('talent_catalog_get');
    const st = await waitFor(() => { for (let i = c.tstate.length - 1; i >= 0; i--) { if (c.tstate[i].pending) return c.tstate[i]; } return null; }, 8000);
    ok(label, !!st && st.pending.rerollTotal === expect && st.pending.rerollLeft === expect, JSON.stringify(st && st.pending));
    c.socket.disconnect();
    await sleep(200);
  }

  await stopServer();
  console.log(`\n=== GĐ347 PROBE: PASS ${pass} / FAIL ${fail} ===`);
  process.exit(fail ? 1 : 0);
})().catch(async (e) => { console.error('PROBE ERROR', e); try { await stopServer(); } catch (x) {} process.exit(2); });
