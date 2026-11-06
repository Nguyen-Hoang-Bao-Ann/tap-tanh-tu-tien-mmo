// GĐ318 probe: Sư đồ — cổng tông môn, đệ tử NPC (cầu sư/Tâm đắc/truyền công/chết mất hẳn),
// đệ tử người chơi (mời/vĩnh viễn/trục xuất/truyền công), thành tài Kim Đan (2 đường).
process.env.NODE_PATH = process.env.HOME + '/workspace/tap-tanh-tu-tien-mmo/client/node_modules';
require('module').Module._initPaths();
const fs = require('fs'); const path = require('path'); const http = require('http');
const { spawn } = require('child_process'); const net = require('net');
const { io } = require('socket.io-client');
const { createMerger } = require(process.env.HOME + '/workspace/tap-tanh-tu-tien-mmo/client/worldmerge.cjs');
const DIR = __dirname; const PORT = 3530;
for (const f of ['characters.json', 'world.json', 'sessions.json', 'accounts.json']) { try { fs.unlinkSync(path.join(DIR, f)); } catch {} }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
function check(name, ok, extra = '') { results.push({ name, ok }); console.log((ok ? 'PASS' : 'FAIL') + ' | ' + name + (extra ? ' | ' + extra : '')); }
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
const STATS = (o = {}) => ({ khiHuyet: 30, vatCong: 30, vatPhong: 25, phapCong: 10, phapPhong: 20, tocDo: 20, minhMan: 20, ...o });
function fixture(token, over = {}) {
  const base = { token, name: 'P318' + token.slice(-3), classId: 'kiemtu', gender: 'nam', robe: '#3a6ea5', weaponId: 'kiem', realm: 'kd', tier: 1, tuVi: 100, hp: 99999, mp: 9999, x: 1750, y: 1252, mapId: 'lang_tan_thu', stats: STATS(), statPoints: 0, freePoints: 10, inventory: {}, stones: 0, skills: [], skillMastery: {}, counters: {}, achClaimed: [], geo175: 1, gearBag: {}, equipped: [], ageStart: 16, birthDay: 0, lifespan: 100, linhCan: { main: 'kim', subs: [], purity: 40, quality: 'trung', elements: { kim: 40 }, mutations: [] }, ...over };
  const store = {}; try { Object.assign(store, JSON.parse(fs.readFileSync(path.join(DIR, 'characters.json'), 'utf8'))); } catch {}
  store[token] = base; fs.writeFileSync(path.join(DIR, 'characters.json'), JSON.stringify(store));
}
function worldFixture() {
  const w = { totalMinutes: 480, savedAt: Date.now(), sects: [
    { id: 'sectA', name: 'Tông A', intro: '', fund: 0, applicants: [], members: [
      { token: 'p318mstr01', name: 'Su Phu Mot', role: 'truonglao' },
      { token: 'p318detu01', name: 'De Tu Tong', role: 'detu' } ] },
    { id: 'sectB', name: 'Tông B', intro: '', fund: 0, applicants: [], members: [
      { token: 'p318mstr02', name: 'Su Phu Hai', role: 'chu' } ] },
  ] };
  fs.writeFileSync(path.join(DIR, 'world.json'), JSON.stringify(w));
}
function connect(token) {
  return new Promise((resolve, reject) => {
    const socket = io('http://127.0.0.1:' + PORT, { transports: ['websocket'], reconnection: false });
    const c = { socket, merger: createMerger(), notices: [], syncs: [], died: [], errors: [], dialogs: [], mails: [] };
    socket.on('connect', () => socket.emit('hello', { token }));
    socket.on('welcome', (d) => { c.welcome = d; resolve(c); });
    socket.on('need_character', () => { c.needChar = true; resolve(c); });
    socket.on('server_tick', (t) => { try { c.state = c.merger(t); } catch {} });
    socket.on('notice', (d) => c.notices.push(d.text || ''));
    socket.on('char_sync', (d) => c.syncs.push(d.character || d));
    socket.on('character_died', (d) => c.died.push(d));
    socket.on('interact_error', (d) => c.errors.push(d.message || ''));
    socket.on('error_msg', (d) => c.errors.push(d.text || ''));
    socket.on('npc_dialog', (d) => c.dialogs.push(d));
    socket.on('mail_state', (d) => c.mails.push(d));
    setTimeout(() => reject(new Error('connect timeout')), 15000);
  });
}
const lastSync = (c) => c.syncs[c.syncs.length - 1] || c.welcome?.character;
async function waitFor(fn, ms = 10000, step = 200) { const t0 = Date.now(); while (Date.now() - t0 < ms) { const v = fn(); if (v) return v; await sleep(step); } return null; }
function myPlayer(c) { return c.state?.players?.find((p) => p.id === c.welcome?.id) || null; }
async function steerTo(c, tx, ty, tol = 30, ms = 20000) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    const me = myPlayer(c); if (!me) { await sleep(150); continue; }
    const d = Math.hypot(tx - me.x, ty - me.y);
    if (d <= tol) break;
    c.socket.emit('client_input', { vx: (tx - me.x) / d, vy: (ty - me.y) / d });
    await sleep(120);
  }
  c.socket.emit('client_input', { vx: 0, vy: 0 });
}
const NPCDISC = (name, o = {}) => ({ type: 'npc', name, tilt: 'kiemtu', gender: 'nam', level: 1, tamDac: 0, skills: [], lastPointDay: -1, medFrac: 0, hp: 0, ...o });

(async () => {
  // ===== Fixtures (truoc boot) =====
  fixture('p318nosect', { name: 'Nguoi Ngoai' });
  fixture('p318detu01', { name: 'De Tu Tong' });
  fixture('p318mstr01', { name: 'Su Phu Mot', skills: ['kiemtu_kiem_co1'] });
  fixture('p318mstr0B', { name: 'Su Phu B', stats: STATS({ vatCong: 45 }), disciples: [NPCDISC('De Tu B', { tamDac: 79 })] });
  fixture('p318mstr0C', { name: 'Su Phu C', skills: ['kiemtu_kiem_co1'], disciples: [NPCDISC('De Tu C', { level: 3, tamDac: 200 })] });
  fixture('p318mstr0D', { name: 'Su Phu D', realm: 'lk', stats: STATS({ khiHuyet: 5, vatCong: 5, vatPhong: 5, phapPhong: 5 }), disciples: [NPCDISC('De Tu D', { hp: 1 })] });
  fixture('p318dicip1', { name: 'De Tu Player', realm: 'lk', tier: 3, x: 1565, y: 1252 });
  fixture('p318mstr02', { name: 'Su Phu Hai', x: 1565, y: 1252, disciples: [{ type: 'player', key: 'p318grad01', name: 'De Tu Tot Nghiep', graduated: false, lastPointDay: -1 }] });
  fixture('p318gradkd', { name: 'De Tu Kim Dan', realm: 'kd', tier: 1, x: 1565, y: 1252 });
  fixture('p318grad01', { name: 'De Tu Tot Nghiep', realm: 'tc', tier: 9, tuVi: 999999, x: 1565, y: 1010, stats: STATS({ khiHuyet: 60, vatCong: 85, vatPhong: 60, tocDo: 40, minhMan: 40 }), inventory: { dan_ket_dan: 10 }, masterInfo: { key: 'p318mstr02', name: 'Su Phu Hai', graduated: false } });
  worldFixture();
  await startServer();
  try {
    // ===== CHAN A: cong tong mon + nhan de tu NPC =====
    let cOut = await connect('p318nosect');
    cOut.socket.emit('talk_npc', { npcId: 'disc_cand_s0' });
    const dlgA = await waitFor(() => cOut.dialogs.find((d) => d.discipleCandidate), 6000);
    check('A1 nguoi ngoai tong thay ung vien, eligible=false', !!dlgA && dlgA.discipleCandidate.eligible === false, JSON.stringify(dlgA?.discipleCandidate || null));
    cOut.socket.emit('disciple_accept_npc', { spotId: 's0' });
    await sleep(700);
    check('A2 nguoi ngoai tong bi chan nhan de tu', cOut.errors.some((e) => e.includes('Trưởng lão')), JSON.stringify(cOut.errors));
    cOut.socket.disconnect();
    let cDetu = await connect('p318detu01');
    cDetu.socket.emit('disciple_accept_npc', { spotId: 's0' });
    await sleep(700);
    check('A3 thanh vien vai De tu bi chan (can Truong lao+)', cDetu.errors.some((e) => e.includes('Trưởng lão')), JSON.stringify(cDetu.errors));
    cDetu.socket.disconnect();
    let cM1 = await connect('p318mstr01');
    cM1.socket.emit('disciple_accept_npc', { spotId: 's0' });
    const accA = await waitFor(() => { const sy = lastSync(cM1); return sy && (sy.disciples || []).length >= 1 ? sy : null; }, 6000);
    check('A4 Truong lao nhan de tu NPC thanh cong', !!accA && accA.disciples[0].type === 'npc', JSON.stringify(accA?.disciples || null));
    const entA = await waitFor(() => (cM1.state?.players || []).find((p) => p.disc === 'Su Phu Mot'), 6000);
    check('A5 entity de tu theo chu, nhan "de tu cua Su Phu Mot"', !!entA, entA ? entA.name : 'khong thay entity');
    // ===== CHAN B: Tam dac tu chien dau + len cap + chi diem =====
    let cB = await connect('p318mstr0B');
    await waitFor(() => myPlayer(cB) && (cB.state?.monsters || []).length > 0, 8000);
    const wolf = (cB.state?.monsters || []).find((mn) => mn.kind === 'wolf');
    check('B0 thay soi o bai farm', !!wolf, wolf ? wolf.x + ',' + wolf.y : '');
    if (wolf) await steerTo(cB, wolf.x, wolf.y, 60, 25000);
    const atkLoop = setInterval(() => { try { cB.socket.emit('player_attack', {}); } catch {} }, 900);
    const lvlB = await waitFor(() => { const sy = lastSync(cB); const d0 = sy?.disciples?.[0]; return d0 && d0.level >= 2 ? d0 : null; }, 60000);
    clearInterval(atkLoop);
    check('B1 de tu tich Tam dac tu tran -> len cap 2', !!lvlB, JSON.stringify(lvlB || lastSync(cB)?.disciples?.[0] || null));
    const tamBefore = lastSync(cB)?.disciples?.[0]?.tamDac || 0;
    cB.socket.emit('disciple_point', { idx: 0 });
    const ptB = await waitFor(() => { const d0 = lastSync(cB)?.disciples?.[0]; return d0 && d0.tamDac >= tamBefore + 25 ? d0 : null; }, 6000);
    check('B2 chi diem +25 Tam dac', !!ptB, 'tamDac=' + (ptB?.tamDac ?? lastSync(cB)?.disciples?.[0]?.tamDac));
    cB.socket.disconnect();
    // ===== CHAN C: truyen cong phap cho de tu NPC =====
    let cC = await connect('p318mstr0C');
    await sleep(600);
    cC.socket.emit('disciple_teach', { idx: 0, skillId: 'kiemtu_kiem_co1' });
    const tchC = await waitFor(() => { const d0 = lastSync(cC)?.disciples?.[0]; return d0 && (d0.skills || []).some((sk) => sk.id === 'kiemtu_kiem_co1') ? d0 : null; }, 6000);
    check('C1 truyen cong phap co ban cho de tu NPC cap 3', !!tchC, JSON.stringify(lastSync(cC)?.disciples?.[0]?.skills || null));
    cC.socket.emit('disciple_teach', { idx: 0, skillId: 'kiemtu_kiem_lu1' });
    await sleep(700);
    check('C2 truyen chieu su phu chua hoc -> bi chan', cC.errors.some((e) => e.includes('chưa học')), JSON.stringify(cC.errors));
    cC.socket.disconnect();
    // ===== CHAN D: de tu NPC chet = mat han =====
    let cD = await connect('p318mstr0D');
    await waitFor(() => myPlayer(cD) && (cD.state?.monsters || []).length > 0, 8000);
    const wolfD = (cD.state?.monsters || []).find((mn) => mn.kind === 'wolf');
    if (wolfD) await steerTo(cD, wolfD.x, wolfD.y, 50, 25000);
    const deadD = await waitFor(() => { const sy = lastSync(cD); return sy && (sy.disciples || []).length === 0 ? sy : null; }, 90000);
    check('D1 de tu NPC tu nan -> mat han khoi danh sach', !!deadD && cD.notices.some((n) => n.includes('tử nạn')), 'notices=' + cD.notices.filter((n) => n.includes('tử')).join(' / '));
    cD.socket.disconnect();
    // ===== CHAN E: de tu nguoi choi — moi, nhan loi, chi diem, truyen cong, truc xuat =====
    cM1 = await connect('p318mstr01');
    cM1.socket.emit('disciple_invite', { name: 'De Tu Player' });
    await sleep(500);
    let cP = await connect('p318dicip1');
    const invE = await waitFor(() => { const sy = lastSync(cP); return sy && (sy.discipleInvites || []).length >= 1 ? sy : null; }, 6000);
    check('E1 loi moi lam de tu toi nguoi choi (ca khi moi xong moi vao)', !!invE && invE.discipleInvites[0].fromName === 'Su Phu Mot', JSON.stringify(invE?.discipleInvites || null));
    cP.socket.emit('disciple_respond', { fromKey: 'p318mstr01', accept: true });
    const accE = await waitFor(() => { const sy = lastSync(cP); return sy && sy.masterInfo && sy.masterInfo.name === 'Su Phu Mot' ? sy : null; }, 6000);
    check('E2 nhan loi -> co su phu (quan he vinh vien)', !!accE, JSON.stringify(accE?.masterInfo || null));
    const mView = await waitFor(() => { const sy = lastSync(cM1); return sy && (sy.disciples || []).some((e) => e.type === 'player' && e.name === 'De Tu Player') ? sy : null; }, 6000);
    check('E3 su phu thay de tu nguoi choi trong danh sach', !!mView, JSON.stringify((mView?.disciples || []).map((e) => e.type + ':' + e.name)));
    const pIdx = (lastSync(cM1)?.disciples || []).findIndex((e) => e.type === 'player');
    cM1.socket.emit('disciple_point', { idx: pIdx });
    const ptE = await waitFor(() => cP.notices.find((n) => n.includes('chỉ điểm')), 6000);
    check('E4 chi diem mat doi mat -> de tu nhan buff thien', !!ptE, ptE || '');
    cM1.socket.emit('disciple_teach', { idx: pIdx, skillId: 'kiemtu_kiem_co1' });
    const tchE = await waitFor(() => { const sy = lastSync(cP); const cat = sy?.catalog || []; return cat.some((e2) => e2.id === 'kiemtu_kiem_co1' && e2.learned) ? sy : null; }, 6000);
    check('E5 truyen cong phap -> de tu nguoi choi hoc duoc ngay', !!tchE, '');
    cM1.socket.emit('disciple_expel', { idx: pIdx });
    const expE = await waitFor(() => { const sy = lastSync(cP); return sy && sy.masterInfo === null ? sy : null; }, 6000);
    check('E6 su phu truc xuat -> quan he cat dut', !!expE, '');
    cP.socket.disconnect(); cM1.socket.disconnect();
    // ===== CHAN F: thanh tai ngay khi nhan loi (da Kim Dan san) =====
    let cM2 = await connect('p318mstr02');
    cM2.socket.emit('disciple_invite', { name: 'De Tu Kim Dan' });
    await sleep(500);
    let cKD = await connect('p318gradkd');
    cKD.socket.emit('disciple_respond', { fromKey: 'p318mstr02', accept: true });
    const gradF = await waitFor(() => { const sy = lastSync(cM2); const e = (sy?.disciples || []).find((x) => x.type === 'player' && x.name === 'De Tu Kim Dan'); return e && e.graduated ? sy : null; }, 8000);
    check('F1 de tu da Kim Dan: nhan loi la thanh tai ngay', !!gradF, JSON.stringify((lastSync(cM2)?.disciples || []).map((e) => e.name + ':' + e.graduated)));
    cM2.socket.emit('mail_open', {});
    const mailF = await waitFor(() => cM2.mails.find((mm) => (mm.mails || []).some((x) => x.title && x.title.includes('thành tài'))), 6000);
    check('F2 su phu nhan thu qua thanh tai (500 LT, khong Tu vi)', !!mailF, mailF ? JSON.stringify(mailF.mails.filter((x) => x.title.includes('thành tài')).map((x) => x.stones)) : 'khong co thu');
    cKD.socket.disconnect(); cM2.socket.disconnect();
    // ===== CHAN G: dot pha Kim Dan giua chung -> thanh tai =====
    let cG = await connect('p318grad01');
    let gOk = false;
    for (let attempt = 0; attempt < 3 && !gOk; attempt++) {
      cG.socket.emit('start_trial', {});
      const boss = await waitFor(() => (cG.state?.monsters || []).find((mn) => mn.trial === 'kimdan'), 8000);
      if (!boss) continue;
      const t0 = Date.now();
      while (Date.now() - t0 < 90000) {
        const b = (cG.state?.monsters || []).find((mn) => mn.trial === 'kimdan');
        if (!b) break;
        const me = myPlayer(cG);
        if (me) { const d = Math.hypot(b.x - me.x, b.y - me.y); if (d > 40) cG.socket.emit('client_input', { vx: (b.x - me.x) / (d || 1), vy: (b.y - me.y) / (d || 1) }); else cG.socket.emit('client_input', { vx: 0, vy: 0 }); }
        cG.socket.emit('player_attack', {});
        await sleep(700);
      }
      cG.socket.emit('client_input', { vx: 0, vy: 0 });
      cG.socket.emit('breakthrough', {});
      const kd = await waitFor(() => { const sy = lastSync(cG); return sy && sy.realm === 'kd' ? sy : null; }, 6000);
      gOk = !!kd;
    }
    check('G1 de tu dot pha Kim Dan thanh cong', gOk, 'realm=' + (lastSync(cG)?.realm || '?'));
    cG.socket.disconnect();
    let cM2b = await connect('p318mstr02');
    const gradG = await waitFor(() => { const sy = lastSync(cM2b); const e = (sy?.disciples || []).find((x) => x.type === 'player' && x.name === 'De Tu Tot Nghiep'); return e && e.graduated ? sy : null; }, 8000);
    check('G2 su phu thay de tu danh dau da thanh tai', !!gradG, JSON.stringify((lastSync(cM2b)?.disciples || []).map((e) => e.name + ':' + e.graduated)));
    cM2b.socket.emit('mail_open', {});
    const mailG = await waitFor(() => cM2b.mails.find((mm) => (mm.mails || []).filter((x) => x.title && x.title.includes('thành tài')).length >= 2), 6000);
    check('G3 hai thu qua thanh tai (F + G) deu ve su phu', !!mailG, '');
    cM2b.socket.disconnect();
  } catch (err) {
    console.log('PROBE ERROR: ' + (err && err.stack || err));
  } finally {
    await stopServer();
    const pass = results.filter((r) => r.ok).length;
    console.log(`TONG KET: ${pass}/${results.length} PASS`);
    process.exit(pass === results.length ? 0 : 1);
  }
})();
