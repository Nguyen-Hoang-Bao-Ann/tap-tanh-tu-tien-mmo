// GĐ320 probe: DUYÊN NỢ lõi — NPC (nói chuyện/tặng quà/nhiệm vụ/từ chối/chuyển thang/chọn nhánh/trần giao dịch)
// + người chơi (săn chung, chọn nhánh 2 phía, cứu mạng, buff thiền khi gần).
process.env.NODE_PATH = process.env.HOME + '/workspace/tap-tanh-tu-tien-mmo/client/node_modules';
require('module').Module._initPaths();
const fs = require('fs'); const path = require('path'); const http = require('http');
const { spawn } = require('child_process'); const net = require('net');
const { io } = require('socket.io-client');
const { createMerger } = require(process.env.HOME + '/workspace/tap-tanh-tu-tien-mmo/client/worldmerge.cjs');
const DIR = __dirname; const PORT = 3538;
for (const f of ['characters.json', 'world.json', 'sessions.json', 'accounts.json']) { try { fs.unlinkSync(path.join(DIR, f)); } catch {} }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
function portFree(port) { return new Promise((res) => { const s = net.createServer(); s.once('error', () => res(false)); s.once('listening', () => s.close(() => res(true))); s.listen(port, '127.0.0.1'); }); }
function waitStatus(tries = 90) { return new Promise((resolve, reject) => { let n = 0; const tick = () => { const req = http.get({ host: '127.0.0.1', port: PORT, path: '/api/status', timeout: 1500 }, (r) => { let b = ''; r.on('data', (c) => b += c); r.on('end', () => { try { resolve(JSON.parse(b)); } catch { again(); } }); }); req.on('error', again); req.on('timeout', () => { req.destroy(); again(); }); }; const again = () => { if (++n >= tries) reject(new Error('server khong len')); else setTimeout(tick, 700); }; tick(); }); }
let serverProc = null;
async function startServer() {
  if (!await portFree(PORT)) throw new Error('port ban');
  const env = { ...process.env, PORT: String(PORT), TTT_STORAGE: 'file', TTT_CHAR_FILE: path.join(DIR, 'characters.json'), TTT_WORLD_FILE: path.join(DIR, 'world.json'), TTT_SESS_FILE: path.join(DIR, 'sessions.json'), TTT_ACC_FILE: path.join(DIR, 'accounts.json'), TTT_DAY_REAL_MS: '600000', TTT_TUVI_NEED: '5' };
  serverProc = spawn('node', ['server/index.js'], { cwd: process.env.HOME + '/workspace/tap-tanh-tu-tien-mmo', env, stdio: ['ignore', 'pipe', 'pipe'] });
  let killTimer = setTimeout(() => { try { serverProc.kill('SIGKILL'); } catch {} }, 60000);
  serverProc.on('exit', () => clearTimeout(killTimer));
  await waitStatus(); clearTimeout(killTimer);
}
async function stopServer() {
  if (!serverProc) return; const p = serverProc; serverProc = null;
  await new Promise((res) => { const t = setTimeout(() => { try { p.kill('SIGKILL'); } catch {} res(); }, 5000); p.once('exit', () => { clearTimeout(t); res(); }); try { p.kill('SIGTERM'); } catch { clearTimeout(t); res(); } });
  for (let i = 0; i < 40; i++) { if (await portFree(PORT)) return; await sleep(250); }
}
function connect(token) {
  return new Promise((resolve, reject) => {
    const socket = io('http://127.0.0.1:' + PORT, { transports: ['websocket'], reconnection: false });
    const c = { socket, merger: createMerger(), notices: [], syncs: [], errors: [], downed: false, revived: false };
    socket.on('connect', () => socket.emit('hello', { token }));
    socket.on('welcome', (d) => { c.welcome = d; resolve(c); });
    socket.on('need_character', () => { c.needChar = true; resolve(c); });
    socket.on('server_tick', (t) => { try { c.state = c.merger(t); } catch {} });
    socket.on('notice', (d) => c.notices.push(d.text || ''));
    socket.on('char_sync', (d) => c.syncs.push(d.character || d));
    socket.on('interact_error', (d) => c.errors.push(d.message || ''));
    socket.on('error_msg', (d) => c.errors.push(d.text || ''));
    socket.on('you_downed', () => { c.downed = true; });
    socket.on('you_revived', () => { c.revived = true; });
    setTimeout(() => reject(new Error('connect timeout')), 15000);
  });
}
const lastSync = (c) => c.syncs[c.syncs.length - 1] || c.welcome?.character;
async function waitFor(fn, ms = 10000, step = 200) { const t0 = Date.now(); while (Date.now() - t0 < ms) { const v = fn(); if (v) return v; await sleep(step); } return null; }
function myPlayer(c) { return c.state?.players?.find((p) => p.id === c.welcome?.id) || null; }
let pass = 0, fail = 0;
function ok(name, cond, extra = '') { if (cond) { pass++; console.log('PASS | ' + name); } else { fail++; console.log('FAIL | ' + name + ' | ' + extra); } }
const BASE = (token, name, over = {}) => ({ token, name, classId: 'kiemtu', gender: 'nam', robe: '#3a6ea5', weaponId: 'kiem', realm: 'kd', tier: 1, tuVi: 100, hp: 99999, mp: 9999, x: 1565, y: 1252, mapId: 'lang_tan_thu', stats: { khiHuyet: 30, vatCong: 30, vatPhong: 25, phapCong: 10, phapPhong: 20, tocDo: 20, minhMan: 20 }, statPoints: 0, freePoints: 10, inventory: {}, stones: 0, skills: [], skillMastery: {}, counters: {}, achClaimed: [], geo175: 1, gearBag: {}, equipped: [], ageStart: 16, birthDay: 0, lifespan: 100, affV2: 1, linhCan: { main: 'kim', subs: [], purity: 40, quality: 'trung', elements: { kim: 40 }, mutations: [] }, ...over });
const POOL = ['linh_thao', 'thit_thu', 'dan_hoi_xuan', 'da_quy', 'nanh_soi', 'canh_doi', 'thanh_thao', 'xuong_thu'];
function likedOf(npcId) { let h = 0; for (let i = 0; i < npcId.length; i++) h = (h * 31 + npcId.charCodeAt(i)) >>> 0; return POOL[h % POOL.length]; }
const TL = { x: 809, y: 1225 }, DAN = { x: 2202, y: 1225 };
(async () => {
  const giftInv = {}; for (const id of POOL) giftInv[id] = 3;
  const bondSeed = (score, branch = null) => ({ score, branch, pick: null, gainDay: -1, gainAmt: 0, name: '' });
  const store = {
    p3200a01: BASE('p3200a01', 'Khach A1', { x: TL.x, y: TL.y, inventory: { ...giftInv } }),
    p3200a02: BASE('p3200a02', 'Khach A2', { x: TL.x, y: TL.y, affinity: { npc_truonglang: 120 }, inventory: { nanh_soi: 5 } }),
    p3200a03: BASE('p3200a03', 'Khach A3', { x: DAN.x, y: DAN.y, affinity: { npc_dan: -700 }, stones: 5000 }),
    p3200a04: BASE('p3200a04', 'Khach A4', { affinity: { npc_truonglang: 50 }, affV2: 0 }),
    p3200a05: BASE('p3200a05', 'Khach A5', { x: DAN.x, y: DAN.y, affinity: { npc_dan: 350 } }),
    p3200a06: BASE('p3200a06', 'Khach A6', { x: DAN.x, y: DAN.y, stones: 99999 }),
    p3200b01: BASE('p3200b01', 'Ban B1', { x: 3702, y: 687, stats: { khiHuyet: 60, vatCong: 200, vatPhong: 60, phapCong: 10, phapPhong: 40, tocDo: 30, minhMan: 30 } }),
    p3200b02: BASE('p3200b02', 'Ban B2', { x: 3850, y: 700 }),
    p3200c01: BASE('p3200c01', 'Ban C1', { bonds: { 'p:p3200c02': { ...bondSeed(320), name: 'Ban C2' } } }),
    p3200c02: BASE('p3200c02', 'Ban C2', { bonds: { 'p:p3200c01': { ...bondSeed(320), name: 'Ban C1' } } }),
    p3200d01: BASE('p3200d01', 'Yeu D1', { stats: { khiHuyet: 2, vatCong: 5, vatPhong: 0, phapCong: 5, phapPhong: 0, tocDo: 20, minhMan: 10 }, realm: 'lk', tier: 1 }),
    p3200d02: BASE('p3200d02', 'Y Tu D2', { classId: 'ytu', classRes: { yDuc: 600 }, stats: { khiHuyet: 80, vatCong: 30, vatPhong: 80, phapCong: 30, phapPhong: 60, tocDo: 30, minhMan: 30 } }),
    p3200e01: BASE('p3200e01', 'Thien E1', { x: 1500, y: 438, bonds: { 'p:p3200e02': { ...bondSeed(700, 'tinh'), name: 'Thien E2' } } }),
    p3200e02: BASE('p3200e02', 'Thien E2', { x: 1580, y: 438, bonds: { 'p:p3200e01': { ...bondSeed(700, 'tinh'), name: 'Thien E1' } } }),
    p3200e03: BASE('p3200e03', 'Thien E3', { x: 1565, y: 438 }),
  };
  fs.writeFileSync(path.join(DIR, 'characters.json'), JSON.stringify(store));
  fs.writeFileSync(path.join(DIR, 'world.json'), JSON.stringify({ totalMinutes: 480, savedAt: Date.now(), sects: [] }));
  await startServer();
  try {
    // S1 NPC: noi chuyen + tang qua
    const a1 = await connect('p3200a01');
    a1.socket.emit('talk_npc', { npcId: 'npc_truonglang' });
    const s1 = await waitFor(() => { const sy = lastSync(a1); return sy && (sy.affinity?.npc_truonglang || 0) >= 2 ? sy : null; }, 6000);
    ok('N1 tro chuyen moi ngay +2', !!s1, JSON.stringify(lastSync(a1)?.affinity));
    const liked = likedOf('npc_truonglang'); const other = POOL.find((x) => x !== liked);
    a1.socket.emit('npc_gift', { npcId: 'npc_truonglang', itemId: liked });
    const s2 = await waitFor(() => { const sy = lastSync(a1); return sy && sy.affinity?.npc_truonglang === 17 ? sy : null; }, 6000);
    ok('N2a tang dung mon thich +15', !!s2, 'aff=' + lastSync(a1)?.affinity?.npc_truonglang + ' liked=' + liked);
    a1.socket.emit('npc_gift', { npcId: 'npc_truonglang', itemId: other });
    const s3 = await waitFor(() => { const sy = lastSync(a1); return sy && sy.affinity?.npc_truonglang === 20 ? sy : null; }, 6000);
    ok('N2b tang mon khac +3', !!s3, 'aff=' + lastSync(a1)?.affinity?.npc_truonglang);
    a1.socket.disconnect();
    // S2 nhiem vu rieng: nhan +10, tra +25
    const a2 = await connect('p3200a02');
    a2.socket.emit('quest_accept', { questId: 'pq_truonglang' });
    const s4 = await waitFor(() => { const sy = lastSync(a2); return sy && sy.affinity?.npc_truonglang === 130 ? sy : null; }, 6000);
    ok('N3a nhan nhiem vu rieng +10', !!s4, 'aff=' + lastSync(a2)?.affinity?.npc_truonglang + ' err=' + JSON.stringify(a2.errors));
    a2.socket.emit('quest_claim', { questId: 'pq_truonglang' });
    const s5 = await waitFor(() => { const sy = lastSync(a2); return sy && sy.affinity?.npc_truonglang === 155 ? sy : null; }, 6000);
    ok('N3b tra nhiem vu rieng +25', !!s5, 'aff=' + lastSync(a2)?.affinity?.npc_truonglang + ' err=' + JSON.stringify(a2.errors));
    a2.socket.disconnect();
    // S3 tu choi phuc vu o -700
    const a3 = await connect('p3200a03');
    a3.socket.emit('shop_buy', { shopId: 'tiem_dan', itemId: 'dan_hoi_xuan' });
    await sleep(700);
    ok('N4a tiem tu choi giao dich (no -700)', a3.errors.some((e) => e.includes('từ chối')), JSON.stringify(a3.errors));
    a3.socket.emit('quest_accept', { questId: 'pq_dan' });
    await sleep(700);
    ok('N4b NPC tu choi giao nhiem vu', a3.errors.some((e) => e.includes('không muốn gặp')), JSON.stringify(a3.errors));
    a3.socket.disconnect();
    // S4 chuyen thang x3
    const a4 = await connect('p3200a04');
    const s6 = await waitFor(() => { const sy = lastSync(a4); return sy && sy.affinity?.npc_truonglang === 150 ? sy : null; }, 6000);
    ok('N5 di cu thien cam cu x3 (50 -> 150)', !!s6, 'aff=' + lastSync(a4)?.affinity?.npc_truonglang);
    a4.socket.disconnect();
    // S5 chon nhanh NPC + khoa
    const a5 = await connect('p3200a05');
    a5.socket.emit('bond_choose_branch', { key: 'n:npc_dan', branch: 'tinh' });
    const s7 = await waitFor(() => { const sy = lastSync(a5); const b = (sy?.bonds || []).find((x) => x.kind === 'npc' && x.key === 'n:npc_dan'); return b && b.branch === 'tinh' ? b : null; }, 6000);
    ok('N6 chon nhanh Tinh cam cho NPC o Ban than', !!s7, JSON.stringify((lastSync(a5)?.bonds || []).filter((x) => x.kind === 'npc')));
    a5.errors.length = 0;
    a5.socket.emit('bond_choose_branch', { key: 'n:npc_dan', branch: 'than' });
    await sleep(700);
    ok('N6b doi nhanh bi chan (da khoa)', a5.errors.some((e) => e.includes('đã khóa')), JSON.stringify(a5.errors));
    a5.socket.disconnect();
    // S6 tran giao dich +15/ngay
    const a6 = await connect('p3200a06');
    for (let i = 0; i < 20; i++) { a6.socket.emit('shop_buy', { shopId: 'tiem_dan', itemId: 'dan_hoi_xuan' }); await sleep(160); }
    const s8 = await waitFor(() => { const sy = lastSync(a6); return sy && (sy.affinity?.npc_dan || 0) >= 15 ? sy : null; }, 8000);
    await sleep(800);
    ok('P2 tran nguon lap: mua 20 lan chi +15 thien cam', (lastSync(a6)?.affinity?.npc_dan || 0) === 15, 'aff=' + lastSync(a6)?.affinity?.npc_dan);
    a6.socket.disconnect();
    // S7 san quai chung
    const b1 = await connect('p3200b01'); const b2 = await connect('p3200b02');
    await waitFor(() => b1.state && (b1.state.monsters || []).length > 0, 8000);
    let killed = false;
    const t0 = Date.now();
    while (Date.now() - t0 < 60000 && !killed) {
      const me = myPlayer(b1); const b2p = myPlayer(b2);
      const wolves = (b1.state?.monsters || []).filter((mn) => mn.kind === 'wolf' && b2p && Math.hypot(mn.x - b2p.x, mn.y - b2p.y) <= 520);
      if (!me || !wolves.length) { await sleep(400); continue; }
      const w = wolves[0];
      const d = Math.hypot(w.x - me.x, w.y - me.y);
      if (d > 40) b1.socket.emit('client_input', { vx: (w.x - me.x) / (d || 1), vy: (w.y - me.y) / (d || 1) });
      else {
        b1.socket.emit('client_input', { vx: 0, vy: 0 });
        const before = (b1.state?.monsters || []).some((mn) => mn.id === w.id);
        b1.socket.emit('player_attack', {});
        await sleep(900);
        const gone = !(b1.state?.monsters || []).some((mn) => mn.id === w.id);
        if (before && gone) killed = true;
      }
      await sleep(250);
    }
    ok('P0 B1 ha duoc soi canh B2', killed);
    const s9 = await waitFor(() => { const sy = lastSync(b1); const b = (sy?.bonds || []).find((x) => x.key === 'p:p3200b02'); return b && b.score >= 1 ? b : null; }, 6000);
    const s10 = await waitFor(() => { const sy = lastSync(b2); const b = (sy?.bonds || []).find((x) => x.key === 'p:p3200b01'); return b && b.score >= 1 ? b : null; }, 6000);
    ok('P1 san chung +1 ca hai phia (guong)', !!s9 && !!s10, 'b1=' + JSON.stringify((lastSync(b1)?.bonds || [])) + ' b2=' + JSON.stringify((lastSync(b2)?.bonds || [])));
    b1.socket.disconnect(); b2.socket.disconnect();
    // S8 chon nhanh 2 phia
    const c1 = await connect('p3200c01'); const c2 = await connect('p3200c02');
    c1.socket.emit('bond_choose_branch', { key: 'p:p3200c02', branch: 'than' });
    const s11 = await waitFor(() => { const sy = lastSync(c1); const b = (sy?.bonds || []).find((x) => x.key === 'p:p3200c02'); return b && b.pick === 'than' && !b.branch ? b : null; }, 6000);
    ok('P3a mot phia chon Than — chua khoa', !!s11, JSON.stringify((lastSync(c1)?.bonds || [])));
    c2.socket.emit('bond_choose_branch', { key: 'p:p3200c01', branch: 'tinh' });
    await sleep(900);
    const notLocked = (lastSync(c1)?.bonds || []).find((x) => x.key === 'p:p3200c02');
    ok('P3b phia kia chon khac nhanh — van chua khoa', !!notLocked && !notLocked.branch, JSON.stringify(notLocked));
    c2.socket.emit('bond_choose_branch', { key: 'p:p3200c01', branch: 'than' });
    const s12 = await waitFor(() => { const sy = lastSync(c1); const b = (sy?.bonds || []).find((x) => x.key === 'p:p3200c02'); return b && b.branch === 'than' ? b : null; }, 6000);
    const s13 = await waitFor(() => { const sy = lastSync(c2); const b = (sy?.bonds || []).find((x) => x.key === 'p:p3200c01'); return b && b.branch === 'than' ? b : null; }, 6000);
    ok('P3c ca hai cung chon Than — khoa nhanh 2 phia', !!s12 && !!s13, 'c1=' + JSON.stringify((lastSync(c1)?.bonds || [])) + ' c2=' + JSON.stringify((lastSync(c2)?.bonds || [])));
    c1.socket.disconnect(); c2.socket.disconnect();
    // S9 cuu mang +50
    const d1 = await connect('p3200d01'); const d2 = await connect('p3200d02');
    await waitFor(() => d1.state && (d1.state.monsters || []).some((mn) => mn.kind === 'golem'), 9000);
    const g = (d1.state?.monsters || []).find((mn) => mn.kind === 'golem');
    console.log('golem tai ' + (g ? g.x + ',' + g.y : 'KHONG THAY'));
    if (g) {
      // dua D1 toi canh golem, D2 dung cach 240px
      const t1 = Date.now();
      while (Date.now() - t1 < 15000) {
        const me = myPlayer(d1); if (!me) break;
        const gg = (d1.state?.monsters || []).find((mn) => mn.kind === 'golem'); if (!gg) break;
        const dd = Math.hypot(gg.x - me.x, gg.y - me.y);
        if (dd <= 45) { d1.socket.emit('client_input', { vx: 0, vy: 0 }); break; }
        d1.socket.emit('client_input', { vx: (gg.x - me.x) / (dd || 1), vy: (gg.y - me.y) / (dd || 1) });
        await sleep(250);
      }
      const t2 = Date.now();
      while (Date.now() - t2 < 20000) {
        const me2 = myPlayer(d2); const d1p = (d2.state?.players || []).find((p) => p.id === d1.welcome?.id);
        if (me2 && d1p) { const dd = Math.hypot(d1p.x - me2.x, d1p.y - me2.y); if (dd > 240) d2.socket.emit('client_input', { vx: (d1p.x - me2.x) / (dd || 1), vy: (d1p.y - me2.y) / (dd || 1) }); else d2.socket.emit('client_input', { vx: 0, vy: 0 }); }
        await sleep(300);
      }
      const downedOk = await waitFor(() => d1.downed ? true : null, 45000, 300);
      ok('P4a D1 guc ngua boi golem', !!downedOk);
      if (downedOk) {
        d2.socket.emit('client_input', { vx: 0, vy: 0 });
        d2.socket.emit('y_revive', {});
        const rev = await waitFor(() => d1.revived ? true : null, 8000, 250);
        ok('P4b Y Tu cuu day duoc', !!rev, JSON.stringify(d2.errors));
        const s14 = await waitFor(() => { const sy = lastSync(d2); const b = (sy?.bonds || []).find((x) => x.key === 'p:p3200d01'); return b && b.score === 50 ? b : null; }, 6000);
        const s15 = await waitFor(() => { const sy = lastSync(d1); const b = (sy?.bonds || []).find((x) => x.key === 'p:p3200d02'); return b && b.score === 50 ? b : null; }, 6000);
        ok('P4c an cuu mang +50 ca hai phia', !!s14 && !!s15, 'd2=' + JSON.stringify((lastSync(d2)?.bonds || [])) + ' d1=' + JSON.stringify((lastSync(d1)?.bonds || [])));
      }
    } else { ok('P4a D1 guc ngua boi golem', false, 'khong thay golem'); }
    d1.socket.disconnect(); d2.socket.disconnect();
    // S10 buff thien khi gan (nhanh Tinh bac Hen ho: thien +10%)
    async function medGain(tok) {
      const c = await connect(tok);
      await sleep(1500);
      const before = lastSync(c)?.tuVi || 0;
      c.socket.emit('meditate_toggle', {});
      await sleep(30000);
      c.socket.emit('meditate_toggle', {});
      const after = lastSync(c)?.tuVi || 0;
      c.socket.disconnect();
      return after - before;
    }
    const e2 = await connect('p3200e02'); // ban doi dung gan E1
    const gBond = await medGain('p3200e01');
    e2.socket.disconnect();
    const gSolo = await medGain('p3200e03');
    console.log('thien: co ban doi +' + gBond + ' | mot minh +' + gSolo);
    ok('P5 thien gan ban doi (Hen ho) nhanh hon mot minh', gBond > gSolo && gBond >= Math.round(gSolo * 1.04), 'bond=' + gBond + ' solo=' + gSolo);
  } catch (e) { console.log('ERR ' + (e && e.stack || e)); }
  finally { await stopServer(); console.log('TONG KET: ' + pass + ' PASS, ' + fail + ' FAIL'); process.exit(fail ? 1 : 0); }
})();
