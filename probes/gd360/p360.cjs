// Probe GĐ360 — Vá đợt 1 từ sổ rà soát tổng thể 08/11:
//  A2-1: spawnOfflineActor thiếu 17 field của persistPlayer → autosave 15s sau
//        restart ghi đè mất mounts/ví Trung-Thượng-Cực/bạn bè... của nhân vật
//        đang nghỉ offline. Vá: chép đủ 17 field (đối chiếu spawnFromCharacter
//        vốn đã đủ 121/121).
//  A5-1: 3 dòng đăng nhập (hello/create_character/select_character) bị
//        // comment giữa dòng nuốt emit phía sau → festival_plants,
//        garden_plants, festival_lanterns, sect_state, guild_state, sect_hqs
//        không tới client lúc login. Vá: tách mỗi emit 1 dòng.
//  A2-2: bộ nạp CLOUD của world state thiếu discTaken → restart trên Render
//        reset điểm cầu sư đã nhận đệ tử trong ngày. Vá: thêm vào cloud loader
//        (snap lưu + bộ nạp file đã có sẵn). Đo bằng server-copy + stub
//        mongodb (driver thật cần Mongo thật — stub chỉ thay ở BẢN SAO /tmp).
//  B2-1: def ach_an_books bị // GĐ315 nuốt trong achievements.js → khôi phục
//        về đúng 1 dòng, vẫn enabled:false (chờ hệ Thư viện). Tổng def 108→109,
//        disabled 11→12.
// Chân kiểm:
//  0) Module achievements: 109 def, 12 disabled, ach_an_books có mặt + tắt.
//  A) DỮ LIỆU (quan trọng nhất): nhân vật OFFLINE (restState sleep) mang đủ
//     17 field giá trị khác mặc định → boot → KHÔNG login → chờ 22s (qua
//     autosave 15s) → stop → đọc file: mọi field nguyên vẹn. Lặp lại boot 2.
//  B) LOGIN EMIT: world fixture có cây vườn g360 + cây lễ f360 + đèn l360 +
//     tông có trụ sở sect360 → hello login → client nhận đủ 6 kênh:
//     garden_plants (có g360), festival_plants (có f360), festival_lanterns
//     (có l360), sect_hqs (có sect360), sect_state, guild_state.
//  C) Panel thành tựu: nhân vật cũ login bình thường; achievements.list = 97
//     def đang bật (books KHÔNG lọt vào list vì vẫn tắt — đúng thiết kế).
//  D) discTaken đối chứng (file mode, world KHÔNG có discTaken): talk_npc
//     disc_cand_s0 từ xa → lỗi 'Tới gần thiếu niên cầu sư' (không bị chặn).
//  E) discTaken CLOUD: server-copy + stub mongodb, cloud world doc có
//     discTaken {s0: dayIndex} còn file world KHÔNG có → talk_npc
//     disc_cand_s0 → lỗi 'đã được người khác nhận làm đệ tử rồi'.
//  F) Hồi quy nhẹ: boot sạch (không lỗi mới trong log), nhân vật vào game,
//     tick có mình + quái bãi farm, thiền bật được, đánh quái có
//     player_attacked.
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
let serverProc = null, killTimer = null, CUR_PORT = 3733;
async function startServer(port, tag, opts) {
  opts = opts || {};
  CUR_PORT = port;
  if (!(await portFree(port))) throw new Error('port ban ' + port);
  const env = { ...process.env, PORT: String(port), TTT_STORAGE: 'file', TTT_CHAR_FILE: opts.charFile || path.join(DIR, 'characters.json'), TTT_ACC_FILE: opts.accFile || path.join(DIR, 'accounts.json'), TTT_WORLD_FILE: opts.worldFile || path.join(DIR, 'world.json'), TTT_SESS_FILE: opts.sessFile || path.join(DIR, 'sessions.json'), TTT_DAY_REAL_MS: '600000', TTT_TUVI_NEED: '5' };
  if (opts.extraEnv) Object.assign(env, opts.extraEnv);
  serverProc = spawn('node', [opts.entry || 'server/index.js'], { cwd: opts.cwd || ROOT, env, stdio: ['ignore', 'pipe', 'pipe'] });
  serverProc.stderr.on('data', (d) => { try { fs.appendFileSync(path.join(DIR, 'srv_' + tag + '.log'), d); } catch (e) {} });
  serverProc.stdout.on('data', (d) => { try { fs.appendFileSync(path.join(DIR, 'srv_' + tag + '.log'), d); } catch (e) {} });
  killTimer = setTimeout(() => { try { serverProc.kill('SIGKILL'); } catch (e) {} }, 600000);
  const t0 = Date.now();
  while (Date.now() - t0 < 45000) { try { const r = await fetch(`http://127.0.0.1:${port}/api/status`); if (r.ok) { clearTimeout(killTimer); return; } } catch (e) {} await sleep(500); }
  throw new Error('server khong len');
}
async function stopServer() { if (!serverProc) return; const p = serverProc; serverProc = null; if (killTimer) { clearTimeout(killTimer); killTimer = null; } await new Promise((res) => { const t = setTimeout(() => { try { p.kill('SIGKILL'); } catch (e) {} res(); }, 4000); p.once('exit', () => { clearTimeout(t); res(); }); try { p.kill('SIGTERM'); } catch (e) { clearTimeout(t); res(); } }); const t0 = Date.now(); while (Date.now() - t0 < 10000 && !(await portFree(CUR_PORT))) await sleep(300); }
const STATS = { khiHuyet: 8000, vatCong: 400, vatPhong: 250, phapCong: 400, phapPhong: 250, tocDo: 60, minhMan: 100 };
const LC1 = { elements: ['kim'], main: 'kim', count: 1, mutations: [] };
function BASE(token, name, extra) {
  return Object.assign({ token, name, classId: 'kiemtu', gender: 'nam', race: null, geo175: 1, realm: 'kd', tier: 9, x: 1565, y: 1011, mapId: 'lang_tan_thu', hp: 99999, mp: 99999, lifespan: 500, birthDay: -5660, ageStart: 16, stats: { ...STATS }, statPoints: 0, freePoints: 0, tuVi: 99999, stones: 100000, stonesTrung: 0, stonesThuong: 0, stonesCuc: 0, inventory: {}, gearBag: {}, equipped: [], skills: [], job: null, job2: null, job3: null, linhCan: { ...LC1 }, affinity: {}, affV2: 1, bonds: {}, quests: {}, questsDone: {}, flags: {}, counters: {}, disciples: [], foundInvites: [], reformIn: [], sectTech: [], sectArts: [], sectArtsActive: [], mails: [], classRes: {}, food: 100, water: 100 }, extra || {});
}
let pass = 0, fail = 0;
function ok(name, cond, extra) { if (cond) { pass++; console.log('PASS | ' + name); } else { fail++; console.log('FAIL | ' + name + (extra ? ' | ' + extra : '')); } }
function connect(token) {
  const socket = io(`http://127.0.0.1:${CUR_PORT}`, { transports: ['websocket'] });
  const ctx = { socket, merger: createMerger(), state: null, welcome: null, syncs: [], errs: [], notices: [], ev: {} };
  socket.on('connect', () => socket.emit('hello', { token }));
  socket.on('welcome', (w) => { ctx.welcome = w; ctx.myName = (w.character || {}).name; });
  socket.on('char_sync', (s) => ctx.syncs.push(s));
  socket.on('notice', (n) => ctx.notices.push(n.text || ''));
  socket.on('interact_error', (e) => ctx.errs.push(e.message || ''));
  for (const ev of ['garden_plants', 'festival_plants', 'festival_lanterns', 'sect_hqs', 'sect_state', 'guild_state', 'player_attacked', 'meditate_state']) socket.on(ev, (d) => { (ctx.ev[ev] = ctx.ev[ev] || []).push(d); });
  socket.on('server_tick', (t) => { const st = ctx.merger(t); if (st) ctx.state = st; });
  return ctx;
}
const meOf = (c) => { const ps = (c.state && c.state.players) || []; return ps.find((p) => p.name === c.myName) || null; };
// ---- Fixture nhân vật OFFLINE mang đủ 17 field (A2-1) ----
const OFF_TOKEN = 'tk360off001';
const OFF_FIELDS = {
  mounts: [
    { uid: 'm360a', species: 'linh_ma', name: 'Linh Mã', speedMul: 1.5, source: 'shop', bornDay: 1 },
    { uid: 'm360b', species: 'soi', name: 'Sói Xám', speedMul: 1.4, source: 'tame', bornDay: 1 },
  ],
  mountComm: { species: 'huyet_lang', readyDay: 999 },
  mountEgg: { readyDay: 999 },
  stones: 555, stonesTrung: 12345, stonesThuong: 678, stonesCuc: 90,
  friends: ['Ban A 360', 'Ban B 360'], friendReqs: ['Ban C 360'],
  food: 37, water: 42,
  allocFree: { khiHuyet: 3 }, allocStat: { khiHuyet: 3 },
  tuViMedDay: 5, tuViMedGain: 321,
  rivalWins: 7, merchantRep: 9, benhlaClues: { clue_a: 1 },
};
function checkOffFields(tag) {
  const chars = JSON.parse(fs.readFileSync(path.join(DIR, 'characters.json'), 'utf8'));
  const c = chars[OFF_TOKEN];
  ok(tag + ': nhân vật còn trong file', !!c);
  if (!c) return;
  const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  ok(tag + ': mounts nguyên vẹn (2 con)', eq(c.mounts, OFF_FIELDS.mounts), JSON.stringify(c.mounts));
  ok(tag + ': mountComm nguyên vẹn', eq(c.mountComm, OFF_FIELDS.mountComm), JSON.stringify(c.mountComm));
  ok(tag + ': mountEgg nguyên vẹn', eq(c.mountEgg, OFF_FIELDS.mountEgg), JSON.stringify(c.mountEgg));
  ok(tag + ': stones 555', c.stones === 555, String(c.stones));
  ok(tag + ': stonesTrung 12345', c.stonesTrung === 12345, String(c.stonesTrung));
  ok(tag + ': stonesThuong 678', c.stonesThuong === 678, String(c.stonesThuong));
  ok(tag + ': stonesCuc 90', c.stonesCuc === 90, String(c.stonesCuc));
  ok(tag + ': friends nguyên vẹn', eq(c.friends, OFF_FIELDS.friends), JSON.stringify(c.friends));
  ok(tag + ': friendReqs nguyên vẹn', eq(c.friendReqs, OFF_FIELDS.friendReqs), JSON.stringify(c.friendReqs));
  ok(tag + ': food 37 / water 42', c.food === 37 && c.water === 42, c.food + '/' + c.water);
  ok(tag + ': allocFree/allocStat nguyên vẹn', eq(c.allocFree, OFF_FIELDS.allocFree) && eq(c.allocStat, OFF_FIELDS.allocStat), JSON.stringify(c.allocFree) + ' ' + JSON.stringify(c.allocStat));
  ok(tag + ': tuViMedDay 5 / tuViMedGain 321', c.tuViMedDay === 5 && c.tuViMedGain === 321, c.tuViMedDay + '/' + c.tuViMedGain);
  ok(tag + ': rivalWins 7 / merchantRep 9', c.rivalWins === 7 && c.merchantRep === 9, c.rivalWins + '/' + c.merchantRep);
  ok(tag + ': benhlaClues nguyên vẹn', eq(c.benhlaClues, OFF_FIELDS.benhlaClues), JSON.stringify(c.benhlaClues));
}

(async () => {
  try {
    // ---- Chân 0: module achievements (B2-1) ----
    const ACH = require(path.join(ROOT, 'server/achievements.js'));
    const defs = ACH.ACH138;
    ok('chân 0a: tổng def nạp = 109', defs.length === 109, String(defs.length));
    ok('chân 0b: số disabled = 12', defs.filter((d) => d.enabled === false).length === 12, String(defs.filter((d) => d.enabled === false).length));
    const books = defs.find((d) => d.id === 'ach_an_books');
    ok('chân 0c: ach_an_books tồn tại + vẫn TẮT (chờ Thư viện)', !!books && books.enabled === false && books.key === 'booksRead');

    // ---- Fixtures phase A/B/D/F ----
    const chars = {};
    chars[OFF_TOKEN] = BASE(OFF_TOKEN, 'P360NgoaiTuyen', { ...OFF_FIELDS, restState: 'sleep', meditation: false, x: 1565, y: 1011 });
    chars['tk360live01'] = BASE('tk360live01', 'P360TrucTuyen');
    fs.writeFileSync(path.join(DIR, 'characters.json'), JSON.stringify(chars));
    fs.writeFileSync(path.join(DIR, 'accounts.json'), '{}');
    fs.writeFileSync(path.join(DIR, 'sessions.json'), '{}');
    const nowMs = Date.now();
    fs.writeFileSync(path.join(DIR, 'world.json'), JSON.stringify({
      totalMinutes: 3360, savedAt: nowMs,
      gardenPlants: [{ id: 'g360', spotId: 0, herbId: 'linh_thao', ownerName: 'P360TrucTuyen', ownerToken: 'tk360live01', plantedAt: nowMs, water: 0 }],
      festPlants: [{ id: 'f360', spotId: 0, ownerId: 'tk360live01', ownerName: 'P360TrucTuyen', plantedDay: 2, water: 0 }],
      festLanterns: [{ id: 'l360', x: 1500, y: 1200, ownerName: 'P360TrucTuyen', wish: 'an lanh', big: false, bornAt: nowMs }],
      sects: [{ id: 'sect360', name: 'Tông Ba Sáu Mươi', founder: 'tk360live01', members: [], hq: { mapId: 'lang_tan_thu', x: 2000, y: 1500 }, buildings: [] }],
    }));

    // ---- Chân A vòng 1: boot, KHÔNG login nhân vật offline, chờ qua autosave ----
    // Bằng chứng actor tồn tại thật (không phải file nằm yên): nhân vật trực
    // tuyến nhìn thấy diễn viên offline đang nghỉ trong tick của map nhà.
    await startServer(3733, '360a');
    await sleep(22000);
    const cObs1 = connect('tk360live01');
    await waitFor(() => cObs1.welcome, 20000);
    const seenOff1 = await waitFor(() => { const ps = (cObs1.state && cObs1.state.players) || []; return ps.some((p) => p.name === 'P360NgoaiTuyen') ? true : null; }, 12000);
    ok('chân A0a: diễn viên offline HIỆN trong tick map nhà (actor có thật)', !!seenOff1);
    cObs1.socket.disconnect();
    await sleep(500);
    await stopServer();
    checkOffFields('chân A1 (sau restart 1 + autosave)');

    // ---- Chân A vòng 2: restart lần nữa trên chính file vừa bị autosave ghi ----
    await startServer(3733, '360a2');
    await sleep(22000);
    const cObs2 = connect('tk360live01');
    await waitFor(() => cObs2.welcome, 20000);
    const seenOff2 = await waitFor(() => { const ps = (cObs2.state && cObs2.state.players) || []; return ps.some((p) => p.name === 'P360NgoaiTuyen') ? true : null; }, 12000);
    ok('chân A0b: vòng 2 — diễn viên offline vẫn dựng lại từ file đã autosave', !!seenOff2);
    cObs2.socket.disconnect();
    await sleep(500);
    await stopServer();
    checkOffFields('chân A2 (sau restart 2 + autosave)');

    // ---- Chân B/C/D/F: boot lại, login nhân vật trực tuyến ----
    await startServer(3733, '360b');
    const cL = connect('tk360live01');
    await waitFor(() => cL.welcome, 20000);
    ok('chân B0: login được (welcome)', !!cL.welcome);
    await sleep(1500);
    const gp = (cL.ev['garden_plants'] || [])[0];
    ok('chân B1: nhận garden_plants lúc login, có cây g360', !!gp && (gp.plants || []).some((x) => x.id === 'g360'), JSON.stringify(cL.ev['garden_plants'] || null).slice(0, 160));
    const fp = (cL.ev['festival_plants'] || [])[0];
    ok('chân B2: nhận festival_plants lúc login, có cây f360', !!fp && (fp.plants || []).some((x) => x.id === 'f360'), JSON.stringify(cL.ev['festival_plants'] || null).slice(0, 160));
    const fl = (cL.ev['festival_lanterns'] || [])[0];
    ok('chân B3: nhận festival_lanterns lúc login, có đèn l360', !!fl && (fl.lanterns || []).some((x) => x.id === 'l360'), JSON.stringify(cL.ev['festival_lanterns'] || null).slice(0, 160));
    const sh = (cL.ev['sect_hqs'] || [])[0];
    ok('chân B4: nhận sect_hqs lúc login, có trụ sở sect360', !!sh && (sh.list || []).some((x) => x.sectId === 'sect360'), JSON.stringify(cL.ev['sect_hqs'] || null).slice(0, 160));
    ok('chân B5: nhận sect_state lúc login (pushSectState)', (cL.ev['sect_state'] || []).length >= 1);
    ok('chân B6: nhận guild_state lúc login (pushGuildState)', (cL.ev['guild_state'] || []).length >= 1);
    const achList = cL.welcome && cL.welcome.character && cL.welcome.character.achievements && cL.welcome.character.achievements.list;
    ok('chân C1: panel thành tựu nạp 97 def đang bật', Array.isArray(achList) && achList.length === 97, achList ? String(achList.length) : 'no list');
    ok('chân C2: ach_an_books KHÔNG lọt panel (vẫn tắt — đúng thiết kế)', Array.isArray(achList) && !achList.some((a) => a.id === 'ach_an_books'));
    // Chân D: đối chứng discTaken ở file mode (world không có discTaken)
    cL.errs.length = 0;
    cL.socket.emit('talk_npc', { npcId: 'disc_cand_s0' });
    const dErr = await waitFor(() => cL.errs.find((e) => e.includes('thiếu niên') || e.includes('Thiếu niên') || e.includes('Tới gần')) || null, 6000);
    ok('chân D: file mode không discTaken → chỉ lỗi khoảng cách, KHÔNG bị chặn nhận trùng', !!dErr && dErr.includes('Tới gần'), JSON.stringify(cL.errs));
    // Chân F: hồi quy — tick có mình + quái, thiền, đánh quái
    const stF = await waitFor(() => { const me = meOf(cL); const mons = (cL.state && cL.state.monsters) || []; return me && mons.length >= 3 ? { me, mons } : null; }, 15000);
    ok('chân F1: tick có mình + quái bãi farm (>=3)', !!stF, stF ? 'mons=' + stF.mons.length : 'none');
    cL.socket.emit('meditate_toggle', {});
    const med = await waitFor(() => (cL.ev['meditate_state'] || []).some((d) => d && d.on === true) ? true : null, 6000);
    ok('chân F2: thiền bật được (server phát meditate_state on=true)', !!med, JSON.stringify(cL.ev['meditate_state'] || null));
    cL.socket.emit('meditate_toggle', {});
    await sleep(600);
    if (stF) {
      const wolf = stF.mons[0];
      cL.socket.emit('fly_toggle', {});
      await sleep(300);
      const t0 = Date.now();
      while (Date.now() - t0 < 20000 && !(cL.ev['player_attacked'] || []).length) {
        const me = meOf(cL); const mons = (cL.state && cL.state.monsters) || []; const tg = mons.find((m) => m.id === wolf.id) || mons[0];
        if (me && tg) { const dx = tg.x - me.x, dy = tg.y - me.y; const d = Math.hypot(dx, dy); if (d > 45) cL.socket.emit('client_input', { vx: dx / d, vy: dy / d }); else { cL.socket.emit('client_input', { vx: 0, vy: 0 }); cL.socket.emit('player_attack', {}); } }
        await sleep(150);
      }
      cL.socket.emit('client_input', { vx: 0, vy: 0 });
      ok('chân F3: đánh quái có player_attacked', (cL.ev['player_attacked'] || []).length >= 1);
    }
    cL.socket.disconnect();
    await stopServer();
    const bootLogB = fs.readFileSync(path.join(DIR, 'srv_360b.log'), 'utf8');
    ok('chân F4: log boot B không lỗi mới (không ReferenceError/TypeError)', !/ReferenceError|TypeError/.test(bootLogB));

    // ---- Chân E: discTaken qua bộ nạp CLOUD (server-copy + stub mongodb) ----
    const CLOUD_DIR = '/tmp/gd360cloud';
    fs.rmSync(CLOUD_DIR, { recursive: true, force: true });
    fs.mkdirSync(CLOUD_DIR, { recursive: true });
    // sao server (trừ node_modules) sang /tmp
    spawn; // (noop giữ style)
    const cp = require('child_process');
    cp.execSync(`cp -r ${path.join(ROOT, 'server')}/. ${CLOUD_DIR}/`, { shell: '/bin/bash' });
    cp.execSync(`rm -rf ${CLOUD_DIR}/node_modules`, { shell: '/bin/bash' });
    fs.mkdirSync(path.join(CLOUD_DIR, 'node_modules'), { recursive: true });
    for (const ent of fs.readdirSync(path.join(ROOT, 'server', 'node_modules'))) {
      if (ent === 'mongodb') continue;
      fs.symlinkSync(path.join(ROOT, 'server', 'node_modules', ent), path.join(CLOUD_DIR, 'node_modules', ent), 'dir');
    }
    // stub mongodb: MongoClient dùng file JSON làm "cloud" (chỉ trong bản sao /tmp)
    const stubDir = path.join(CLOUD_DIR, 'node_modules', 'mongodb');
    fs.mkdirSync(stubDir, { recursive: true });
    fs.writeFileSync(path.join(stubDir, 'package.json'), JSON.stringify({ name: 'mongodb', version: '0.0.0-stub', main: 'index.js' }));
    fs.writeFileSync(path.join(stubDir, 'index.js'), `
const fs = require('fs');
const FILE = process.env.TTT_FAKE_MONGO_FILE;
function readAll() { try { return JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch (e) { return {}; } }
function writeAll(o) { fs.writeFileSync(FILE, JSON.stringify(o)); }
const coll = {
  async findOne(q) { const all = readAll(); const d = all[q._id]; return d ? { _id: q._id, data: d } : null; },
  async replaceOne(q, doc) { const all = readAll(); all[q._id] = doc.data; writeAll(all); return { acknowledged: true }; },
};
class MongoClient { constructor(uri, opts) {} async connect() { return this; } db() { return { collection() { return coll; } }; } }
module.exports = { MongoClient };
`);
    // seed cloud: world doc CÓ discTaken {s0: 2} (dayIndex của totalMinutes 3360 = 2)
    fs.writeFileSync(path.join(CLOUD_DIR, 'fakemongo.json'), JSON.stringify({ world: { totalMinutes: 3360, savedAt: Date.now(), discTaken: { s0: 2 } } }));
    // file tại chỗ của bản sao: world KHÔNG có discTaken (để tách bạch nguồn cloud)
    fs.writeFileSync(path.join(DIR, 'worldc.json'), JSON.stringify({ totalMinutes: 3360, savedAt: Date.now() }));
    fs.writeFileSync(path.join(DIR, 'charactersc.json'), JSON.stringify({ tk360cloud1: BASE('tk360cloud1', 'P360DamMay') }));
    fs.writeFileSync(path.join(DIR, 'accountsc.json'), '{}');
    fs.writeFileSync(path.join(DIR, 'sessionsc.json'), '{}');
    await startServer(3734, '360c', { cwd: CLOUD_DIR, entry: 'index.js', charFile: path.join(DIR, 'charactersc.json'), accFile: path.join(DIR, 'accountsc.json'), worldFile: path.join(DIR, 'worldc.json'), sessFile: path.join(DIR, 'sessionsc.json'), extraEnv: { MONGODB_URI: 'mongodb://stub-local', TTT_FAKE_MONGO_FILE: path.join(CLOUD_DIR, 'fakemongo.json'), TTT_STORAGE: '' } });
    const bootLogC = fs.readFileSync(path.join(DIR, 'srv_360c.log'), 'utf8');
    ok('chân E0: bản sao nối cloud stub thành công', bootLogC.includes('Đồng bộ cloud xong'), bootLogC.split('\n').filter((l) => l.includes('[storage]')).join(' ').slice(0, 160));
    const cC = connect('tk360cloud1');
    await waitFor(() => cC.welcome, 20000);
    ok('chân E1: login trên bản sao cloud', !!cC.welcome);
    cC.socket.emit('talk_npc', { npcId: 'disc_cand_s0' });
    const eErr = await waitFor(() => cC.errs.find((e) => e.includes('nhận làm đệ tử')) || null, 6000);
    ok('chân E2: discTaken từ CLOUD chặn nhận trùng s0 (điểm đã có đệ tử hôm nay)', !!eErr, JSON.stringify(cC.errs));
    cC.socket.disconnect();
    await stopServer();

    console.log(`\n=== GĐ360: ${pass} PASS / ${fail} FAIL ===`);
    process.exit(fail ? 1 : 0);
  } catch (e) {
    console.log('PROBE ERROR:', e && e.stack || e);
    try { await stopServer(); } catch (e2) {}
    console.log(`\n=== GĐ360 (loi): ${pass} PASS / ${fail} FAIL ===`);
    process.exit(1);
  }
})();
