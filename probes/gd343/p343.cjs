// Probe GĐ343 — GÓI PHẦN THƯỞNG CẢNH GIỚI ẨN, ĐỢT 1: đường nấc 2 (tuyệt kỹ Hồn) + nấc 3 (nội tại chín) + ô 7 Nhập Đạo + panel.
// Thiết kế: THIET_KE_PHAN_THUONG_AN.md §3.3/§3.4/§5.2/§7 đợt 1 (F1-B, F5-A — Bảo duyệt 08/11).
// Đợt này tuyệt kỹ Hồn tạm lĩnh ngộ khi mở Luyện Hồn (grant ở countAnDay + bù đăng nhập); GĐ345 đổi sang hạ Hồn Vương.
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
async function startServer(port, tag, startMin) {
  CUR_PORT = port;
  if (!(await portFree(port))) throw new Error('port ban ' + port);
  const env = { ...process.env, PORT: String(port), TTT_STORAGE: 'file', TTT_CHAR_FILE: path.join(DIR, 'characters.json'), TTT_ACC_FILE: path.join(DIR, 'accounts.json'), TTT_WORLD_FILE: path.join(DIR, 'world.json'), TTT_SESS_FILE: path.join(DIR, 'sessions.json'), TTT_DAY_REAL_MS: '600000', TTT_TUVI_NEED: '5' };
  if (startMin != null) env.TTT_WORLD_START_MINUTES = String(startMin);
  serverProc = spawn('node', ['server/index.js'], { cwd: ROOT, env, stdio: ['ignore', 'pipe', 'pipe'] });
  serverProc.stderr.on('data', (d) => { try { fs.appendFileSync(path.join(DIR, 'srv_' + tag + '.log'), d); } catch (e) {} });
  serverProc.stdout.on('data', (d) => { try { fs.appendFileSync(path.join(DIR, 'srv_' + tag + '.log'), d); } catch (e) {} });
  killTimer = setTimeout(() => { try { serverProc.kill('SIGKILL'); } catch (e) {} }, 240000);
  const t0 = Date.now();
  while (Date.now() - t0 < 45000) { try { const r = await fetch(`http://127.0.0.1:${port}/api/status`); if (r.ok) { clearTimeout(killTimer); return; } } catch (e) {} await sleep(500); }
  throw new Error('server khong len');
}
async function stopServer() { if (!serverProc) return; const p = serverProc; serverProc = null; await new Promise((res) => { const t = setTimeout(() => { try { p.kill('SIGKILL'); } catch (e) {} res(); }, 4000); p.once('exit', () => { clearTimeout(t); res(); }); try { p.kill('SIGTERM'); } catch (e) { clearTimeout(t); res(); } }); const t0 = Date.now(); while (Date.now() - t0 < 10000 && !(await portFree(CUR_PORT))) await sleep(300); }
const STATS = { khiHuyet: 500, vatCong: 100, vatPhong: 100, phapCong: 100, phapPhong: 100, tocDo: 60, minhMan: 100 };
const LC1 = { elements: ['kim'], main: 'kim', count: 1, mutations: [] };
const AN = (vm, lh, nd) => ({ lkDays: 0, kdDays: 0, lkLastDay: -1, kdLastDay: -1, vienman: !!vm, luyenHon: !!lh, nhapDao: !!nd });
function BASE(token, name, extra) {
  return Object.assign({ token, name, classId: 'kiemtu', gender: 'nam', race: null, geo175: 1, realm: 'kd', tier: 1, x: 4248, y: 2950, mapId: 'huyet_sac_rung', hp: 99999, lifespan: 500, birthDay: -5660, ageStart: 16, stats: { ...STATS }, statPoints: 0, freePoints: 0, tuVi: 0, stones: 0, stonesTrung: 0, stonesThuong: 0, stonesCuc: 0, inventory: {}, gearBag: {}, equipped: [], skills: [], job: null, job2: null, job3: null, linhCan: { ...LC1 }, affinity: {}, affV2: 1, bonds: {}, quests: {}, questsDone: {}, flags: {}, counters: {}, disciples: [], foundInvites: [], reformIn: [], sectTech: [], sectArts: [], sectArtsActive: [], mails: [], classRes: {}, food: 100, water: 100, anState: AN(0, 0, 0) }, extra || {});
}
let pass = 0, fail = 0;
function ok(name, cond, extra) { if (cond) { pass++; console.log('PASS | ' + name); } else { fail++; console.log('FAIL | ' + name + (extra ? ' | ' + extra : '')); } }
function note(name, extra) { console.log('NOTE | ' + name + (extra ? ' | ' + extra : '')); }
function connect(token) {
  const socket = io(`http://127.0.0.1:${CUR_PORT}`, { transports: ['websocket'] });
  const ctx = { socket, merger: createMerger(), state: null, welcome: null, notices: [], casts: [], sync: null, errors: [] };
  socket.on('connect', () => socket.emit('hello', { token }));
  socket.on('welcome', (w) => { ctx.welcome = w; ctx.myName = (w.character || {}).name; });
  socket.on('notice', (n) => ctx.notices.push(n.text || ''));
  socket.on('cast_result', (r) => ctx.casts.push(r));
  socket.on('char_sync', (sy) => { ctx.sync = sy; });
  socket.on('server_tick', (t) => { const st = ctx.merger(t); if (st) ctx.state = st; });
  socket.on('interact_error', (e) => ctx.errors.push(e.message || ''));
  return ctx;
}
function writeChars(chars, acc) {
  fs.writeFileSync(path.join(DIR, 'characters.json'), JSON.stringify(chars, null, 1));
  fs.writeFileSync(path.join(DIR, 'accounts.json'), JSON.stringify(acc || {}, null, 1));
  for (const f of ['world.json', 'sessions.json']) { try { fs.unlinkSync(path.join(DIR, f)); } catch (e) {} }
}
const meOf = (c) => (c.state?.players || []).find((p) => p.name === c.myName) || null;
const monsOf = (c) => c.state?.monsters || [];
const myChar = (c) => (c.sync && typeof c.sync.hp === 'number' ? c.sync : null) || (c.welcome && c.welcome.character) || {}; // char_sync mang characterPayload trực tiếp (không bọc .character)
async function waitStableMons(c, ms) {
  let last = -1, stable = 0; const t0 = Date.now();
  while (Date.now() - t0 < (ms || 20000)) { const n = monsOf(c).length; if (n > 0 && n === last) { stable++; if (stable >= 3) return n; } else stable = 0; last = n; await sleep(400); }
  return last;
}
async function flyTo(c, x, y, tol) {
  if (!c.flying) { c.socket.emit('fly_toggle', {}); c.flying = true; await sleep(350); }
  const t0 = Date.now();
  while (Date.now() - t0 < 30000) { const me = meOf(c); if (!me) { await sleep(120); continue; } const dx = x - me.x, dy = y - me.y; const d = Math.hypot(dx, dy); if (d <= (tol || 45)) break; c.socket.emit('client_input', { vx: dx / d, vy: dy / d }); await sleep(110); }
  c.socket.emit('client_input', { vx: 0, vy: 0 });
}
async function land(c) { if (c.flying) { c.socket.emit('fly_toggle', {}); c.flying = false; await sleep(450); } }
function slotOf(c, skillId) { const eq = (myChar(c).skills || []); return eq.findIndex((s) => s.id === skillId); }
async function firstHitDrop(c, kind) {
  const me = meOf(c); if (!me) return 0;
  const ws = monsOf(c).filter((m) => m.kind === kind && m.hp >= (m.maxHp || 9999) - 1).sort((a, b) => Math.hypot(a.x - me.x, a.y - me.y) - Math.hypot(b.x - me.x, b.y - me.y));
  const w = ws[0]; if (!w) return 0;
  for (let t = 0; t < 5; t++) {
    const live = monsOf(c).find((m) => m.id === w.id); if (!live) return 0;
    await flyTo(c, live.x, live.y, 30); await land(c);
    const before = (monsOf(c).find((m) => m.id === w.id) || {}).hp;
    if (before == null) return 0;
    c.socket.emit('player_attack'); await sleep(650);
    const after = (monsOf(c).find((m) => m.id === w.id) || {}).hp;
    if (after == null) return before;
    if (after < before) return before - after;
  }
  return 0;
}
async function castAt(c, slot, kind, tol) {
  const me = meOf(c); if (!me) return null;
  const ws = monsOf(c).filter((m) => m.kind === kind && m.hp >= (m.maxHp || 9999) - 1).sort((a, b) => Math.hypot(a.x - me.x, a.y - me.y) - Math.hypot(b.x - me.x, b.y - me.y));
  const w = ws[0]; if (!w) return null;
  await flyTo(c, w.x, w.y, tol || 100);
  const idx = c.casts.length;
  c.socket.emit('cast_skill', { slot });
  let res = await waitFor(() => c.casts.length > idx && c.casts[c.casts.length - 1], 3500);
  if (!res || !res.ok) { await land(c); const i2 = c.casts.length; c.socket.emit('cast_skill', { slot }); res = await waitFor(() => c.casts.length > i2 && c.casts[c.casts.length - 1], 3500); }
  if (!res || !res.ok) return null;
  const tm = monsOf(c).find((m) => m.id === res.targetId);
  return { res, kind: tm ? tm.kind : null, targetId: res.targetId };
}
const median = (a) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : 0; };
// Đòn thường đo theo MỌI quái (đòn thường đánh quái gần nhất — bám 1 con cố định dễ bị quái khác chen, bài học gd342):
// đứng cạnh 1 con nguyên vẹn, snapshot toàn bản đồ, ra đòn, lấy cú rơi đầu tiên quan sát được.
async function anyDropAttack(c, kind) {
  const me = meOf(c); if (!me) return 0;
  const ws = monsOf(c).filter((m) => m.kind === kind && m.hp >= (m.maxHp || 9999) - 1).sort((a, b) => Math.hypot(a.x - me.x, a.y - me.y) - Math.hypot(b.x - me.x, b.y - me.y));
  const w = ws[0]; if (!w) return 0;
  await flyTo(c, w.x, w.y, 30); await land(c);
  for (let t = 0; t < 4; t++) {
    const snap = new Map(monsOf(c).map((m) => [m.id, m.hp]));
    c.socket.emit('player_attack');
    await sleep(650);
    for (const m of monsOf(c)) { const b = snap.get(m.id); if (b != null && m.hp < b) return b - m.hp; }
    await sleep(200);
  }
  return 0;
}

(async () => {
  const chars = {};
  // Nhân vật có máu vá sẵn — nối NGAY khi server lên (tránh diễn viên offline ghi đè sau 15s)
  chars['tk343q01'] = BASE('tk343q01', 'Quy343', { classId: 'quytu', anState: AN(1, 1, 0), hp: 2000 });
  chars['tk343y08'] = BASE('tk343y08', 'Y2S343', { classId: 'ytu', anState: AN(1, 1, 0), hp: 250, skills: ['kd_y-tu'], x: 4248, y: 1200 });
  chars['tk343y09'] = BASE('tk343y09', 'Y3S343', { classId: 'ytu', anState: AN(1, 1, 1), hp: 250, skills: ['kd_y-tu'], x: 4248, y: 1200 });
  chars['tk343y10'] = BASE('tk343y10', 'YLH343', { classId: 'ytu', anState: AN(0, 1, 0), hp: 250, skills: ['kd_y-tu'], x: 4248, y: 1200 });
  chars['tk343p02'] = BASE('tk343p02', 'Phat2343', { classId: 'phattu', anState: AN(1, 1, 0) });
  chars['tk343p03'] = BASE('tk343p03', 'Phat3343', { classId: 'phattu', anState: AN(1, 1, 1) });
  chars['tk343a04'] = BASE('tk343a04', 'Anh343', { classId: 'satthu', anState: AN(1, 1, 0), stats: { ...STATS, vatCong: 20 } });
  chars['tk343a05'] = BASE('tk343a05', 'AnhCt343', { classId: 'satthu', anState: AN(1, 0, 0), stats: { ...STATS, vatCong: 20 } });
  chars['tk343k06'] = BASE('tk343k06', 'Kiem2343', { classId: 'kiemtu', anState: AN(1, 1, 0), stats: { ...STATS, vatCong: 500 }, skills: ['kiemtu_1'] });
  chars['tk343k07'] = BASE('tk343k07', 'Kiem3343', { classId: 'kiemtu', anState: AN(1, 1, 1), stats: { ...STATS, vatCong: 500 }, skills: ['kiemtu_1'] });
  chars['tk343s11'] = BASE('tk343s11', 'SlotND343', { classId: 'kiemtu', anState: AN(0, 0, 1), skills: ['kiemtu_1', 'kiemtu_2', 'kiemtu_3', 'kiemtu_4'] });
  chars['tk343s12'] = BASE('tk343s12', 'SlotKD343', { classId: 'kiemtu', anState: AN(0, 0, 0), skills: ['kiemtu_1', 'kiemtu_2', 'kiemtu_3', 'kiemtu_4'] });
  chars['tk343s13'] = BASE('tk343s13', 'SlotNA343', { classId: 'kiemtu', realm: 'na', anState: AN(0, 0, 0), skills: ['kiemtu_1', 'kiemtu_2', 'kiemtu_3', 'kiemtu_4'] });
  chars['tk343g14'] = BASE('tk343g14', 'GateVM343', { classId: 'kiemtu', anState: AN(1, 0, 0) });
  chars['tk343g15'] = BASE('tk343g15', 'Gate0343', { classId: 'kiemtu', anState: AN(0, 0, 0) });
  writeChars(chars);
  await startServer(3640, '343a', 600);
  // Nối sớm nhóm máu vá
  const q01 = connect('tk343q01'); const y08 = connect('tk343y08'); const y09 = connect('tk343y09'); const y10 = connect('tk343y10');
  await waitFor(() => q01.welcome && y08.welcome && y09.welcome && y10.welcome, 12000);
  for (const cy of [y08, y09, y10]) { cy.socket.emit('fly_toggle', {}); cy.flying = true; } // treo trên không giữ máu vá 250 tới lượt đo (bài học gd342)
  const p02 = connect('tk343p02'); const p03 = connect('tk343p03');
  const a04 = connect('tk343a04'); const a05 = connect('tk343a05');
  const k06 = connect('tk343k06'); const k07 = connect('tk343k07');
  const s11 = connect('tk343s11'); const s12 = connect('tk343s12'); const s13 = connect('tk343s13');
  const g14 = connect('tk343g14'); const g15 = connect('tk343g15');
  await waitFor(() => g15.welcome && s13.welcome, 12000);
  await sleep(800);
  await waitStableMons(q01);

  // ---- 1. CỔNG LĨNH NGỘ + PANEL (anBonus) ----
  {
    const cq = myChar(q01);
    ok('1.1 Luyện Hồn: tuyệt kỹ Hồn tự lĩnh ngộ khi đăng nhập (tạm GĐ343)', (cq.skills && cq.skills.some((s) => s.id === 'lh_quy-tu')) || (cq.catalog || []).some((e) => e.id === 'lh_quy-tu' && e.learned), JSON.stringify((cq.catalog || []).filter((e) => e.id.startsWith('lh_')).map((e) => [e.id, e.learned])));
    ok('1.2 Sổ công pháp có tuyệt kỹ Hồn với learned=true', (cq.catalog || []).some((e) => e.id === 'lh_quy-tu' && e.learned), '');
    ok('1.3 anBonus.pathTier: Luyện Hồn = 2, có lhName', cq.anBonus && cq.anBonus.pathTier === 2 && cq.anBonus.lhName === 'Phệ Hồn Đại Pháp', JSON.stringify(cq.anBonus));
    const cg = myChar(g14);
    ok('1.4 Chỉ Viên Mãn (chưa Luyện Hồn): KHÔNG có tuyệt kỹ Hồn, pathTier = 1, lhName trống', !(cg.catalog || []).some((e) => e.id === 'lh_kiem-tu' && e.learned) && cg.anBonus && cg.anBonus.pathTier === 1 && !cg.anBonus.lhName, JSON.stringify(cg.anBonus));
    const c0 = myChar(g15);
    ok('1.5 Chưa mở ẩn: pathTier = 0', c0.anBonus && c0.anBonus.pathTier === 0, JSON.stringify(c0.anBonus));
    const cp3 = myChar(p03);
    ok('1.6 Nhập Đạo: pathTier = 3', cp3.anBonus && cp3.anBonus.pathTier === 3, JSON.stringify(cp3.anBonus));
  }
  // ---- 2. QUỶ TU: Phệ Hồn Đại Pháp — hút máu 75% + Hồn Khí +25 ----
  {
    const slot = slotOf(q01, 'lh_quy-tu');
    ok('2.0 tuyệt kỹ Hồn đã lắp vào ô chiêu', slot >= 0, 'slot=' + slot);
    const hk0 = (myChar(q01).classRes || {}).honKhi || 0;
    const hp0 = myChar(q01).hp, maxHp = myChar(q01).maxHp || 0;
    const r = await castAt(q01, slot, 'huyetlang', 100);
    ok('2.1 cast Phệ Hồn Đại Pháp thành công, có sát thương', !!r && r.res.dmg > 0, JSON.stringify(r && r.res));
    const hk1 = await waitFor(() => { const v = (myChar(q01).classRes || {}).honKhi || 0; return v > hk0 ? v : null; }, 3000);
    ok('2.2 Hồn Khí tăng ít nhất +28 (+25 Phệ Hồn + 3 đòn trúng)', hk1 != null && hk1 - hk0 >= 28, `hk ${hk0} -> ${hk1}`);
    const hp1 = await waitFor(() => { const v = myChar(q01).hp; return (v != null && v > hp0) ? v : null; }, 3000);
    ok('2.3 Hút máu 75%: HP tăng sau cast (đang thiếu máu)', hp1 != null && r && Math.abs((hp1 - hp0) - Math.round(r.res.dmg * 0.75)) <= Math.max(30, r.res.dmg * 0.25), `hp ${hp0} -> ${hp1}, dmg=${r && r.res.dmg}, maxHp=${maxHp}`);
  }
  // ---- 3. Y TU: hồi máu nấc 2 (×1,6) vs nấc 3 (×1,8) qua kd_y-tu (healPct 50); Hồi Hồn Thần Châm healPct 90 không nội tại ----
  {
    async function healMeasure(c, skillId) {
      const slot = slotOf(c, skillId);
      if (slot < 0) return null;
      for (let attempt = 0; attempt < 2; attempt++) {
        const maxHp = myChar(c).maxHp || 0;
        const hp0 = myChar(c).hp;
        if (hp0 == null || hp0 <= 0) return null;
        const r = await castAt(c, slot, 'huyetlang', 100);
        if (!r) { await sleep(1500); continue; }
        const hp1 = await waitFor(() => { const v = myChar(c).hp; return (v != null && v > hp0 + 10) ? v : null; }, 3000);
        if (hp1 != null) return { gain: hp1 - hp0, maxHp, hp0, hp1 };
        return null; // cast đã trúng mà không thấy hồi -> lỗi thật, không retry (hồi chiêu dài)
      }
      return null;
    }
    const h2 = await healMeasure(y08, 'kd_y-tu');
    ok('3.1 Thần y nấc 2: kd_y-tu hồi = 50% × 1,6 = 80% máu tối đa (±4%)', !!h2 && Math.abs(h2.gain / h2.maxHp - 0.80) <= 0.04, JSON.stringify(h2));
    const h3 = await healMeasure(y09, 'kd_y-tu');
    ok('3.2 Thần y nấc 3: kd_y-tu hồi = 50% × 1,8 = 90% máu tối đa (±4%)', !!h3 && Math.abs(h3.gain / h3.maxHp - 0.90) <= 0.04, JSON.stringify(h3));
    const hL = await healMeasure(y10, 'lh_y-tu');
    ok('3.3 Hồi Hồn Thần Châm (không Viên Mãn): hồi đúng 90% máu tối đa (±4%)', !!hL && Math.abs(hL.gain / hL.maxHp - 0.90) <= 0.04, JSON.stringify(hL));
  }
  // ---- 4. PHẬT TU: tuyệt kỹ Hồn (aoe choáng) + niệm nhanh nấc 3 qua cdMs ----
  {
    const slotLh = slotOf(p02, 'lh_phat-tu');
    const r = await castAt(p02, slotLh, 'huyetlang', 100);
    ok('4.1 cast Phổ Độ Hồn Ấn (aoe) thành công', !!r && r.res.ok && r.res.dmg > 0, JSON.stringify(r && r.res));
    const slotVm2 = slotOf(p02, 'vm_phat-tu');
    const slotVm3 = slotOf(p03, 'vm_phat-tu');
    // Cast bám quái gần nhất bất kỳ (không đòi nguyên máu) — tránh nhiễu phân bố quái như castAt
    async function castNearest(c, slot) {
      for (let t = 0; t < 3; t++) {
        const me = meOf(c); if (!me) return null;
        const w = monsOf(c).filter((m) => m.hp > 0).sort((a, b) => Math.hypot(a.x - me.x, a.y - me.y) - Math.hypot(b.x - me.x, b.y - me.y))[0];
        if (!w) { await sleep(1200); continue; }
        await flyTo(c, w.x, w.y, 80);
        const idx = c.casts.length;
        c.socket.emit('cast_skill', { slot });
        const res = await waitFor(() => c.casts.length > idx && c.casts[c.casts.length - 1], 3000);
        if (res && res.ok) return { res };
        await sleep(500);
      }
      return null;
    }
    const r2 = await castNearest(p02, slotVm2);
    const r3 = await castNearest(p03, slotVm3);
    ok('4.2 hồi chiêu Đại Nhật Như Lai Ấn đo được ở cả 2 nấc', !!r2 && !!r3, `cd2=${r2 && r2.res.cdMs} cd3=${r3 && r3.res.cdMs}`);
    ok('4.3 nấc 3 niệm nhanh hơn: cdMs tỉ lệ ≈ 0,65/0,75 = 0,867 (dải 0,82–0,91)', !!r2 && !!r3 && (r3.res.cdMs / r2.res.cdMs) >= 0.82 && (r3.res.cdMs / r2.res.cdMs) <= 0.91, `ratio=${r2 && r3 ? (r3.res.cdMs / r2.res.cdMs).toFixed(3) : '?'}`);
    note('4.4 choáng của Phổ Độ Hồn Ấn = 1,5s + 1s nội tại Thánh tăng (áp ở applyFxToMonster) — kiểm ở điểm code, không đo thời lượng trực tiếp', '');
  }
  // ---- 5. ẢNH TU: Hồn Ảnh Thiên La — đòn kế tiếp ×4 ----
  {
    // Công 20: đòn thường ~38, boost ×4 ~153, kể cả chí mạng ~306 < 350 máu Huyết Lang -> quái sống để đọc drop.
    // Đối chứng lấy median 3 mẫu chống chí mạng; boost lệch dải thì chờ hồi chiêu cast lại 1 lần.
    const ctrlSamples = [];
    for (let i = 0; i < 3; i++) { const d = await firstHitDrop(a05, 'huyetlang'); if (d > 0) ctrlSamples.push(d); }
    const dCtrl = median(ctrlSamples);
    const slot = slotOf(a04, 'lh_sat-thu');
    let rc = await castAt(a04, slot, 'huyetlang', 100);
    ok('5.1 cast Hồn Ảnh Thiên La thành công', !!rc && rc.res.ok, JSON.stringify(rc && rc.res));
    let dBoost = await firstHitDrop(a04, 'huyetlang');
    const ratioOf = (b) => (dCtrl > 0 && b > 0) ? b / dCtrl : 0;
    if (rc && (ratioOf(dBoost) > 4.7 || (dBoost > 0 && ratioOf(dBoost) < 3.3))) { await sleep(30000); rc = await castAt(a04, slot, 'huyetlang', 100); if (rc) dBoost = await firstHitDrop(a04, 'huyetlang'); }
    ok('5.2 mốc chuẩn Ảnh tu (Viên Mãn, phủ đầu) đo được', dCtrl > 0, 'Dctrl=' + dCtrl);
    ok('5.3 đòn kế tiếp sau Thiên La ×4 (dải tỉ lệ 3,3–4,7 so với đối chứng)', dCtrl > 0 && dBoost > 0 && (dBoost / dCtrl) >= 3.3 && (dBoost / dCtrl) <= 4.7, `boost=${dBoost} ctrl=${dCtrl} ratio=${dCtrl ? (dBoost / dCtrl).toFixed(2) : '?'}`);
    note('5.4 tăng tốc +30%/3s sau đòn kế tiếp (lhSpeedPending -> spdBuff) — kiểm ở điểm code; đo tốc chạy qua tick dễ nhiễu bởi quái đuổi', '');
  }
  // ---- 6. KIẾM TU nấc 3: trần dmg theo công 80% -> 100% (+ chỉ số Nhập Đạo ×1,2) ----
  // Đo bằng cast_result.dmg của kiemtu_1 (giá trị công thức, không bị trần bởi máu quái — đòn thường 1 phát chết sói nên không dùng drop).
  // Xen kẽ 2 nhân vật để Ngộ Kiếm tích lũy như nhau; median chống chí mạng 10% của Luyện Hồn.
  {
    const slotA = slotOf(k06, 'kiemtu_1') >= 0 ? slotOf(k06, 'kiemtu_1') : 0;
    const slotB = slotOf(k07, 'kiemtu_1') >= 0 ? slotOf(k07, 'kiemtu_1') : 0;
    // Vòng cast riêng: bám sói GẦN NHẤT (không đòi nguyên máu — dmg là số công thức), lại gần 80px, fail thì định vị lại.
    async function castSample(c, slot) {
      for (let t = 0; t < 3; t++) {
        const me = meOf(c); if (!me) return 0;
        const w = monsOf(c).filter((m) => m.kind === 'huyetlang' && m.hp > 0).sort((a, b) => Math.hypot(a.x - me.x, a.y - me.y) - Math.hypot(b.x - me.x, b.y - me.y))[0];
        if (!w) { await sleep(1200); continue; }
        await flyTo(c, w.x, w.y, 80);
        const idx = c.casts.length;
        c.socket.emit('cast_skill', { slot });
        const res = await waitFor(() => c.casts.length > idx && c.casts[c.casts.length - 1], 3000);
        if (res && res.ok && res.dmg > 0) return res.dmg;
        await sleep(500);
      }
      return 0;
    }
    const s2 = [], s3 = [];
    for (let i = 0; i < 10; i++) {
      const dA = await castSample(k06, slotA); if (dA > 0) s2.push(dA);
      const dB = await castSample(k07, slotB); if (dB > 0) s3.push(dB);
      await sleep(250);
    }
    const m2 = median(s2), m3 = median(s3);
    ok('6.1 đo được mẫu cast cả 2 nấc Kiếm tu (mỗi nấc >= 6 mẫu)', s2.length >= 6 && s3.length >= 6, `n2=${s2.length} n3=${s3.length}`);
    ok('6.2 nấc 3 mạnh hơn nấc 2: tỉ lệ median ≈ 1,33 (dải 1,20–1,45)', m2 > 0 && (m3 / m2) >= 1.20 && (m3 / m2) <= 1.45, `med2=${m2} med3=${m3} ratio=${m2 ? (m3 / m2).toFixed(3) : '?'}`);
  }
  // ---- 7. Ô CÔNG PHÁP: Nhập Đạo mở ô 7 ngay tại Kim Đan ----
  {
    const c11 = myChar(s11), c12 = myChar(s12), c13 = myChar(s13);
    ok('7.1 KD + Nhập Đạo: skillSlots.max = 7', c11.skillSlots && c11.skillSlots.max === 7, JSON.stringify(c11.skillSlots));
    ok('7.2 KD + Nhập Đạo: lắp được 7 chiêu vào bảng chính', (c11.skills || []).length === 7, 'n=' + (c11.skills || []).length);
    ok('7.3 KD thường: skillSlots.max = 6, bảng chính 6 chiêu', c12.skillSlots && c12.skillSlots.max === 6 && (c12.skills || []).length === 6, JSON.stringify(c12.skillSlots) + ' n=' + (c12.skills || []).length);
    ok('7.4 Nguyên Anh (không Nhập Đạo): vẫn 7 ô như cũ', c13.skillSlots && c13.skillSlots.max === 7, JSON.stringify(c13.skillSlots));
  }
  for (const c of [q01, y08, y09, y10, p02, p03, a04, a05, k06, k07, s11, s12, s13, g14, g15]) { try { c.socket.disconnect(); } catch (e) {} }
  await stopServer();
  console.log('=== TỔNG GĐ343: PASS=' + pass + ' FAIL=' + fail);
  process.exit(fail > 0 ? 1 : 0);
})().catch(async (e) => { console.error('PROBE ERROR', e); try { await stopServer(); } catch (x) {} process.exit(2); });
