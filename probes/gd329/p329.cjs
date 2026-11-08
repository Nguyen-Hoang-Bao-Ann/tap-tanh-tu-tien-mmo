// Probe GĐ329 — Chiến kỹ tự tạo đợt 2: tạo CK, học, lắp ô chiêu, cast thật (hệ số/tầm/hồi chiêu), gỡ, rời tông.
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const net = require('net');
const ROOT = path.join(__dirname, '..', '..');
const PORT = 3570;
const DIR = __dirname;
const { io } = require(path.join(ROOT, 'client/node_modules/socket.io-client'));
const { createMerger } = require(path.join(ROOT, 'client/worldmerge.cjs'));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function waitFor(fn, ms) { const t0 = Date.now(); while (Date.now() - t0 < ms) { const v = fn(); if (v) return v; await sleep(150); } return null; }
function portFree(port) { return new Promise((res) => { const s = net.createServer(); s.once('error', () => res(false)); s.listen(port, () => s.close(() => res(true))); }); }
let serverProc = null, killTimer = null;
async function startServer() {
  if (!(await portFree(PORT))) throw new Error('port ban');
  serverProc = spawn('node', ['server/index.js'], { cwd: ROOT, env: { ...process.env, PORT: String(PORT), TTT_STORAGE: 'file', TTT_CHAR_FILE: path.join(DIR, 'characters.json'), TTT_ACC_FILE: path.join(DIR, 'accounts.json'), TTT_WORLD_FILE: path.join(DIR, 'world.json'), TTT_SESS_FILE: path.join(DIR, 'sessions.json'), TTT_DAY_REAL_MS: '600000', TTT_TUVI_NEED: '5' }, stdio: ['ignore', 'pipe', 'pipe'] });
  serverProc.stderr.on('data', (d) => process.stderr.write('[srv] ' + d));
  killTimer = setTimeout(() => { try { serverProc.kill('SIGKILL'); } catch (e) {} }, 60000);
  const t0 = Date.now();
  while (Date.now() - t0 < 45000) { try { const r = await fetch(`http://127.0.0.1:${PORT}/api/status`); if (r.ok) { clearTimeout(killTimer); return; } } catch (e) {} await sleep(500); }
  throw new Error('server khong len');
}
async function stopServer() { if (!serverProc) return; const p = serverProc; serverProc = null; await new Promise((res) => { const t = setTimeout(() => { try { p.kill('SIGKILL'); } catch (e) {} res(); }, 4000); p.once('exit', () => { clearTimeout(t); res(); }); try { p.kill('SIGTERM'); } catch (e) { clearTimeout(t); res(); } }); const t0 = Date.now(); while (Date.now() - t0 < 10000 && !(await portFree(PORT))) await sleep(300); }
function BASE(token, name, extra) {
  return Object.assign({ token, name, classId: 'kiemtu', gender: 'nam', race: null, geo175: 1, realm: 'kd', tier: 1, x: 4248, y: 2950, mapId: 'huyet_sac_rung', hp: 99999, lifespan: 500, birthDay: -5660, ageStart: 16, stats: { khiHuyet: 500, vatCong: 100, vatPhong: 100, phapCong: 100, phapPhong: 100, tocDo: 60, minhMan: 60 }, statPoints: 0, freePoints: 0, tuVi: 0, stones: 0, stonesTrung: 0, stonesThuong: 0, stonesCuc: 0, inventory: {}, gearBag: {}, equipped: [], skills: [], job: null, job2: null, job3: null, linhCan: { element: 'hoa', grade: 'trung', mult: 1.2 }, affinity: {}, affV2: 1, bonds: {}, quests: {}, questsDone: {}, flags: {}, counters: {}, disciples: [], foundInvites: [], reformIn: [], sectTech: [], sectArts: [], sectArtsActive: [], mails: [], classRes: {} }, extra || {});
}
function SECT(id, name, members, extra) { return Object.assign({ id, name, intro: '', fund: 0, level: 1, uy: 0, members, applicants: [], activeQuests: [], territories: [], territory: null, warehouse: [], garden: [], depts: {}, tributeDay: 100, upkeepDay: 100, questDay: 100, artDay: 100, debtDays: 0 }, extra || {}); }
let pass = 0, fail = 0;
function ok(name, cond, extra) { if (cond) { pass++; console.log('PASS | ' + name); } else { fail++; console.log('FAIL | ' + name + (extra ? ' | ' + extra : '')); } }
async function connect(token) {
  const socket = io(`http://127.0.0.1:${PORT}`, { transports: ['websocket'] });
  const ctx = { socket, merger: createMerger(), state: null, welcome: null, sect: null, sync: null, errors: [], casts: [] };
  socket.on('connect', () => socket.emit('hello', { token }));
  socket.on('welcome', (w) => { ctx.welcome = w; });
  socket.on('server_tick', (t) => { const st = ctx.merger(t); if (st) ctx.state = st; });
  socket.on('sect_state', (st) => { ctx.sect = st; });
  socket.on('char_sync', (sy) => { ctx.sync = sy; });
  socket.on('interact_error', (e) => ctx.errors.push(e.message || ''));
  socket.on('cast_result', (r) => ctx.casts.push(r));
  await waitFor(() => ctx.welcome, 20000);
  socket.emit('sect_get');
  await waitFor(() => ctx.sect, 10000);
  return ctx;
}
const mySect = (c) => c.sect && c.sect.mySect;
async function refresh(c) { c.socket.emit('sect_get'); await sleep(450); }
const meOf = (c) => (c.state?.players || []).find((p) => p.id === c.welcome.id);
const monsOf = (c) => c.state?.monsters || [];
async function flyTo(c, x, y, tol) {
  c.socket.emit('fly_toggle', {}); await sleep(350);
  const t0 = Date.now();
  while (Date.now() - t0 < 30000) { const me = meOf(c); if (!me) { await sleep(120); continue; } const dx = x - me.x, dy = y - me.y; const d = Math.hypot(dx, dy); if (d <= (tol || 45)) break; c.socket.emit('client_input', { vx: dx / d, vy: dy / d }); await sleep(110); }
  c.socket.emit('client_input', { vx: 0, vy: 0 });
  c.socket.emit('fly_toggle', {}); await sleep(450);
}
async function castAndMeasure(c, slot) {
  const snap = {}; for (const m of monsOf(c)) snap[m.id] = m.hp;
  const castAt = c.casts.length;
  c.socket.emit('cast_skill', { slot });
  const res = await waitFor(() => c.casts.length > castAt && c.casts[c.casts.length - 1], 4000);
  if (!res || !res.ok) return { res, drop: 0 };
  const t0 = Date.now(); let drop = 0;
  while (Date.now() - t0 < 2500) {
    let best = 0;
    for (const m of monsOf(c)) { const b = snap[m.id]; if (b != null && m.hp < b) best = Math.max(best, b - m.hp); }
    for (const id of Object.keys(snap)) if (!monsOf(c).some((m) => m.id === id)) best = Math.max(best, snap[id]);
    if (best > 0) { drop = best; break; }
    await sleep(120);
  }
  return { res, drop };
}
const median = (a) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : 0; };
(async () => {
  const chars = {
    p329c00001: BASE('p329c00001', ' Chu329', { inventory: { linh_thao: 60 } }),
    p329m00001: BASE('p329m00001', ' DeTu329', { inventory: { linh_thao: 300 }, skills: ['kiemtu_1'], equipped: ['kiemtu_1'] }),
  };
  fs.writeFileSync(path.join(DIR, 'characters.json'), JSON.stringify(chars));
  const sects = [SECT('sa', 'Tông Chiến Kỹ', [
    { token: 'p329c00001', name: ' Chu329', role: 'chu', contrib: 0 },
    { token: 'p329m00001', name: ' DeTu329', role: 'detu', contrib: 1000 },
  ], { fund: 100000, uy: 100, level: 3, hq: { mapId: 'huyet_sac_rung', x: 4248, y: 2900 }, buildings: [{ kind: 'tangkinh', name: 'Tàng Kinh Các', x: 4248, y: 3000, lv: 2 }] })];
  fs.writeFileSync(path.join(DIR, 'world.json'), JSON.stringify({ totalMinutes: 100 * 1440, savedAt: Date.now(), sects }));
  await startServer();
  const C = await connect('p329c00001'); const M = await connect('p329m00001');
  console.log('DBG me keys:', meOf(M) ? Object.keys(meOf(M)).join(',') : 'no-me', 'mp=', meOf(M) && meOf(M).mp);
  // B1: tạo chiến kỹ
  C.errors = []; C.socket.emit('sect_art_create', { name: 'Hỏa Lôi Phá', gradeId: 'pham', comps: { sat: 3, tam: 1, hieu: 1 }, flawId: 'f_mp', kind: 'chienky' }); await sleep(800); await refresh(C);
  const art = (mySect(C).arts || [])[0] || {};
  ok('B1 tao chien ky: he so tran Pham 1,6 — chan nguyen 92 (khuyet Hao Nguyen x1,5) — tam 200', art.kind === 'chienky' && art.skill && art.skill.coef === 1.6 && art.skill.mana === 92 && art.skill.range === 200, JSON.stringify(art.skill));
  // B2: ngộ thành
  M.socket.emit('sect_art_donate', { itemId: 'linh_thao', qty: 50 }); await sleep(600);
  M.socket.emit('sect_art_donate', { itemId: 'linh_thao', qty: 50 }); await sleep(700); await refresh(M);
  const artB = (mySect(M).arts || []).find((a) => a.id === art.id) || {};
  ok('B2 chien ky ngo thanh', artB.status === 'done', artB.status);
  // B3: toggle chiến kỹ -> bị từ chối, phải lắp ô chiêu
  M.errors = []; M.socket.emit('sect_art_toggle', { artId: art.id }); await sleep(600);
  ok('B3 chien ky khong van hanh kieu tam phap', M.errors.some((x) => x.includes('ô chiêu')), M.errors.join(';'));
  // B4: học + lắp ô chiêu -> hiện trên thanh chiêu + Sổ
  M.socket.emit('sect_art_learn', { artId: art.id }); await sleep(700);
  M.errors = []; M.socket.emit('equip_skill', { skillId: 'art:' + art.id }); await sleep(800);
  const skList = (M.sync && M.sync.skills) || [];
  const catEntry = ((M.sync && M.sync.catalog) || []).find((x) => x.id === 'art:' + art.id) || {};
  ok('B4 lap o chieu: thanh chieu + So deu co chien ky', skList.some((x) => x.name === 'Hỏa Lôi Phá' && x.coef === 1.6) && catEntry.learned === true && catEntry.equipped === true, `skills=${JSON.stringify(skList.map((x) => x.id))} cat=${JSON.stringify(catEntry.equipped)} err=${M.errors.join(';')}`);
  const artSlot = skList.findIndex((x) => x.id === 'art:' + art.id);
  const baseSlot = skList.findIndex((x) => x.id === 'kiemtu_1');
  console.log('DBG slots: base=', baseSlot, 'art=', artSlot, 'board=', JSON.stringify(skList.map((x) => x.id)));
  // B5: cast — mỗi mẫu 1 sói NGUYÊN VẸN riêng (tránh sói chết/hồi máu làm nhiễu); lấy MIN làm ước lượng không-chí-mạng
  async function castFresh(c, slot) {
    const w = await waitFor(() => { const ws = monsOf(c).filter((m) => m.kind === 'huyetlang' && m.hp >= (m.maxHp || 9999) - 1); return ws.length ? ws[0] : null; }, 15000);
    if (!w) return { res: null, drop: 0 };
    await flyTo(c, w.x, w.y, 55);
    return castAndMeasure(c, slot);
  }
  const d1 = []; for (let i = 0; i < 3; i++) { const r = await castFresh(M, baseSlot); if (r.drop > 0) d1.push(r.drop); await sleep(1400); }
  const d2 = []; let firstArtCastAt = 0;
  for (let i = 0; i < 2; i++) { const r = await castFresh(M, artSlot); if (r.drop > 0) d2.push(r.drop); if (i === 0) { firstArtCastAt = M.casts.length;
    // B6 ngay tại đây: tung lại lập tức khi vừa cast xong -> phải dính hồi chiêu
    M.socket.emit('cast_skill', { slot: artSlot });
    const r6 = await waitFor(() => M.casts.length > firstArtCastAt && M.casts[M.casts.length - 1], 3000);
    ok('B6 hoi chieu chan tung lien tuc', !!r6 && r6.ok === false && r6.reason === 'cooldown', JSON.stringify(r6));
  } await sleep(8400); }
  const ratio = d1.length && d2.length ? Math.min(...d2) / Math.min(...d1) : 0;
  ok('B5 chien ky danh that: sat thuong ~x1,6 chieu co ban', ratio >= 1.4 && ratio <= 1.85, `d1=${JSON.stringify(d1)} d2=${JSON.stringify(d2)} ratio=${ratio.toFixed(2)}`);
  // B7: tầm 200 vs cơ bản 120 — giữ khoảng cách 130–195px: cơ bản hụt tầm, chiến kỹ trúng (thử lại vài lần vì sói di chuyển)
  let b7ok = false, b7info = '';
  for (let t = 0; t < 5 && !b7ok; t++) {
    const w7 = await waitFor(() => { const me = meOf(M); const ws = monsOf(M).filter((m) => m.kind === 'huyetlang' && m.hp >= (m.maxHp || 9999) - 1 && Math.hypot(m.x - me.x, m.y - me.y) > 450); return ws.length ? ws[0] : null; }, 12000);
    if (!w7) break;
    await flyTo(M, w7.x + 175, w7.y, 20);
    const meNow = meOf(M); const wNow = monsOf(M).find((m) => m.id === w7.id); // đọc khoảng cách ngay khi vừa hạ cánh
    if (!wNow || !meNow) continue;
    const dist = Math.hypot(wNow.x - meNow.x, wNow.y - meNow.y);
    b7info = 'dist=' + Math.round(dist);
    if (dist <= 125 || dist > 198) continue;
    const cAt = M.casts.length;
    M.socket.emit('cast_skill', { slot: baseSlot });
    const ra = await waitFor(() => M.casts.length > cAt && M.casts[M.casts.length - 1], 2500);
    if (!ra || ra.ok !== false || ra.reason !== 'range') { b7info += ' coBan=' + JSON.stringify(ra); continue; }
    const rb = await castAndMeasure(M, artSlot);
    b7info += ' ck=' + JSON.stringify(rb.res) + ' drop=' + rb.drop;
    if (rb.res && rb.res.ok === true && rb.drop > 0) b7ok = true;
    await sleep(8400);
  }
  ok('B7 tam chien ky 200 > co ban 120', b7ok, b7info);
  // B8: gỡ ô chiêu -> thanh chiêu mất chiến kỹ
  M.socket.emit('unequip_skill', { skillId: 'art:' + art.id }); await sleep(800);
  const catAfter = ((M.sync && M.sync.catalog) || []).find((x) => x.id === 'art:' + art.id) || {};
  ok('B8 go o chieu: thanh chieu + So mat trang thai lap', !((M.sync && M.sync.skills) || []).some((x) => x.id === 'art:' + art.id) && catAfter.equipped === false, `catEq=${catAfter.equipped}`);
  // B9: rời tông -> lắp lại bị chặn + ô chiêu bị gỡ sạch khi chuẩn hoá (ép 1 lần sync bằng tháo chiêu khác)
  M.socket.emit('equip_skill', { skillId: 'art:' + art.id }); await sleep(700);
  M.socket.emit('sect_leave'); await sleep(800);
  M.errors = []; M.socket.emit('equip_skill', { skillId: 'art:' + art.id }); await sleep(700);
  M.socket.emit('unequip_skill', { skillId: 'kiemtu_kiem_kd1' }); await sleep(800);
  ok('B9 roi tong: khong lap lai duoc chien ky + bi go khoi bang', M.errors.some((x) => x.includes('Chưa học')) && !((M.sync && M.sync.skills) || []).some((x) => x.id === 'art:' + art.id), `err=${M.errors.join(';')} skills=${JSON.stringify(((M.sync && M.sync.skills) || []).map((x) => x.id))}`);
  C.socket.disconnect(); M.socket.disconnect();
  await stopServer();
  console.log(`\n== p329: ${pass} PASS, ${fail} FAIL ==`);
  process.exit(fail ? 1 : 0);
})();
