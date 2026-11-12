// Probe GĐ387 (phần 2) — PERSIST + RESET THEO KIẾP của Diên Thọ Đan.
// Chân 5) Persist: dùng 1 viên → disconnect → restart server → relog còn nguyên;
//   offline actor qua 1 chu kỳ autosave 15s → file vẫn nguyên (luật bền GĐ89/95 —
//   field dienThoUsed phải có ở persistPlayer + spawnFromCharacter + spawnOfflineActor).
// Chân 6) Kiếp mới: char đã tọa hóa (dead, có hồn, dienThoUsed=3, counters.ach_lifeBonus=6,
//   soul.carryBag có 1 viên đan) → hello nhận character_died + need_character → đi luồng
//   tạo nhân vật (request_roll → talent_pick bậc Vô → create_character) → nhân vật mới:
//   payload dienThoUsed = 0 (reset theo kiếp), file counters.ach_lifeBonus = 6 (kênh thành
//   tựu theo counters vẫn sang như đột phá), túi có 1 viên từ carryBag và DÙNG ĐƯỢC ngay
//   (lifespan +2, dienThoUsed = 1) — chứng minh trần kiếp mới độc lập.
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
let serverProc = null, killTimer = null, CUR_PORT = 0;
async function startServer(port, tag) {
  CUR_PORT = port;
  if (!(await portFree(port))) throw new Error('port ban ' + port);
  serverProc = spawn('node', ['server/index.js'], { cwd: ROOT, env: { ...process.env, PORT: String(port), TTT_STORAGE: 'file', TTT_CHAR_FILE: path.join(DIR, 'characters.json'), TTT_ACC_FILE: path.join(DIR, 'accounts.json'), TTT_WORLD_FILE: path.join(DIR, 'world.json'), TTT_SESS_FILE: path.join(DIR, 'sessions.json'), TTT_DAY_REAL_MS: '600000', TTT_TUVI_NEED: '5' }, stdio: ['ignore', 'pipe', 'pipe'] });
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
  const ctx = { socket, merger: createMerger(), state: null, welcome: null, syncs: [], errs: [], notices: [], needChar: false, diedMsg: null, talentCat: null, talentState: null, createErr: null, myName: null, myId: null };
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
  socket.on('server_tick', (t) => { const st = ctx.merger(t); if (st) ctx.state = st; });
  return ctx;
}
const lastChar = (c) => { for (let i = c.syncs.length - 1; i >= 0; i--) { if (c.syncs[i]) return c.syncs[i]; } return c.welcome ? c.welcome.character : null; };
const invOf = (c, id) => { const ch = lastChar(c); return (ch && ch.inventory && ch.inventory[id]) || 0; };
function writeStore(chars, keepWorld) {
  for (const f of ['characters.json', 'accounts.json', 'sessions.json']) { try { fs.unlinkSync(path.join(DIR, f)); } catch (e) {} }
  if (!keepWorld) { try { fs.unlinkSync(path.join(DIR, 'world.json')); } catch (e) {} }
  fs.writeFileSync(path.join(DIR, 'characters.json'), JSON.stringify(chars));
  fs.writeFileSync(path.join(DIR, 'accounts.json'), JSON.stringify({}));
}
const readStore = () => JSON.parse(fs.readFileSync(path.join(DIR, 'characters.json'), 'utf8'));
const readCharFile = (token) => readStore()[token];

(async () => {
  try {
    // ---------- Chân 5: persist ----------
    writeStore({ per387aa: BASE('per387aa', 'Persist387', { inventory: { dan_dien_tho: 2 } }) });
    await startServer(3999, 'per1');
    const cp = connect('per387aa');
    await waitFor(() => cp.welcome && lastChar(cp), 20000);
    cp.socket.emit('use_item', { itemId: 'dan_dien_tho' });
    const pu = await waitFor(() => { const ch = lastChar(cp); return ch && ch.dienThoUsed === 1 ? ch : null; }, 8000);
    ok('chân 5a: dùng 1 viên (mồi persist) — used=1, lifespan 502', !!pu && pu.lifespan === 502, pu ? `lifespan=${pu.lifespan}` : 'no sync');
    cp.socket.disconnect();
    await sleep(2500);
    await stopServer();
    const f1 = readCharFile('per387aa');
    ok('chân 5b: file sau disconnect — dienThoUsed=1, lifespan=502', !!f1 && f1.dienThoUsed === 1 && f1.lifespan === 502, f1 ? `used=${f1.dienThoUsed} lifespan=${f1.lifespan}` : 'no file');
    await startServer(3999, 'per2');
    const cp2 = connect('per387aa');
    const rw = await waitFor(() => cp2.welcome && lastChar(cp2), 20000);
    const rc = lastChar(cp2);
    ok('chân 5c: restart + relog — payload dienThoUsed=1, lifespan=502', !!rw && rc.dienThoUsed === 1 && rc.lifespan === 502, rc ? `used=${rc.dienThoUsed} lifespan=${rc.lifespan}` : 'no sync');
    cp2.socket.disconnect();
    await sleep(2500);
    await sleep(17000); // qua 1 chu kỳ autosave 15s của offline actor
    const f2 = readCharFile('per387aa');
    ok('chân 5d: autosave offline — file VẪN dienThoUsed=1, lifespan=502 (spawnOfflineActor chép đủ)', !!f2 && f2.dienThoUsed === 1 && f2.lifespan === 502, f2 ? `used=${f2.dienThoUsed} lifespan=${f2.lifespan}` : 'no file');
    await stopServer();

    // ---------- Chân 6: kiếp mới ----------
    const deadChar = BASE('chev387dead', 'KiepCu387', {
      dead: true, deadReason: 'toa_hoa', dienThoUsed: 3, lifespan: 506,
      counters: { ach_lifeBonus: 6 },
      soul: { lives: 1, fullLives: 1, carryBag: [{ itemId: 'dan_dien_tho', qty: 1 }] },
    });
    writeStore({ chev387dead: deadChar });
    await startServer(4001, 'rebirth');
    const cr = connect('chev387dead');
    const gotNeed = await waitFor(() => cr.needChar, 20000);
    ok('chân 6a: hello token char đã tọa hóa → character_died + need_character', !!gotNeed && !!cr.diedMsg, cr.diedMsg ? (cr.diedMsg.message || '').slice(0, 60) : 'no died msg');
    cr.socket.emit('request_roll');
    cr.socket.emit('talent_catalog_get');
    const cat = await waitFor(() => cr.talentCat, 20000);
    const voList = ((cat && cat.list) || []).filter((t) => t.tier === 'vo');
    ok('chân 6b: lấy được talent_catalog, có thiên phú bậc Vô', voList.length > 0, 'vo=' + voList.length);
    if (!voList.length) throw new Error('khong co thien phu bac vo — dung chan 6');
    cr.socket.emit('talent_pick', { id: voList[0].id, tier: 'vo' });
    const tst = await waitFor(() => cr.talentState && cr.talentState.pending && cr.talentState.pending.result, 20000);
    ok('chân 6c: talent_pick xong (có pending.result)', !!tst, JSON.stringify(cr.talentState || {}).slice(0, 120));
    cr.socket.emit('create_character', { token: 'chev387dead', name: 'KiepMoi387', classId: 'kiemtu', gender: 'nam', robe: null, path: 'solo' });
    const cw = await waitFor(() => cr.welcome, 30000);
    ok('chân 6d: tạo nhân vật kiếp mới thành công (welcome)', !!cw && !cr.createErr, cr.createErr ? JSON.stringify(cr.createErr) : '');
    const nc = lastChar(cr);
    ok('chân 6e: payload kiếp mới — dienThoUsed = 0 (RESET theo kiếp)', !!nc && (nc.dienThoUsed || 0) === 0, nc ? `used=${nc.dienThoUsed}` : 'no sync');
    ok('chân 6f: túi kiếp mới có 1 viên đan từ carryBag của hồn', invOf(cr, 'dan_dien_tho') === 1, 'inv=' + invOf(cr, 'dan_dien_tho'));
    const ls0 = nc ? nc.lifespan : null;
    cr.socket.emit('use_item', { itemId: 'dan_dien_tho' });
    const nu = await waitFor(() => { const ch = lastChar(cr); return ch && ch.dienThoUsed === 1 ? ch : null; }, 8000);
    ok('chân 6g: kiếp mới DÙNG ĐƯỢC viên đầu (không bị trần kiếp cũ khóa) — lifespan +2, used=1', !!nu && ls0 !== null && nu.lifespan === ls0 + 2, nu ? `lifespan ${ls0} -> ${nu.lifespan}` : 'no sync');
    cr.socket.disconnect();
    await sleep(1200);
    const fN = readCharFile('chev387dead');
    ok('chân 6h: file kiếp mới — dienThoUsed=1; counters.ach_lifeBonus = 8 (6 mang sang + 2 viên mới)', !!fN && fN.dienThoUsed === 1 && fN.counters && fN.counters.ach_lifeBonus === 8, fN ? `used=${fN.dienThoUsed} bonus=${(fN.counters || {}).ach_lifeBonus}` : 'no file');
    await stopServer();
  } catch (e) {
    console.log('PROBE ERROR: ' + (e && e.stack || e));
    fail++;
    try { await stopServer(); } catch (e2) {}
  }
  console.log(`=== GĐ387 PROBE (persist + kiếp mới): ${pass} PASS / ${fail} FAIL ===`);
  process.exit(fail ? 1 : 0);
})();
