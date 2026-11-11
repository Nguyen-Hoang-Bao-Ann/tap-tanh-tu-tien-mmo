// Probe GĐ364a — vá đợt 4 (sổ rà soát tổng thể 08/11):
//  S) tĩnh: B3-2 mirror 119 quest khớp def server · parity persist 129 field ·
//     vệ sinh dữ liệu (connectsTo/monsterSet/impl đã xóa, meta.total=201,
//     server/gdd đã xóa, van_uyen còn nguyên) · F1-6b có mặt ở source client.
//  1) E-2: use_item thiếu vật + craft_item recipe lạ → interact_error + char_sync.
//  2) A6-2: overview_data zones khớp tọa độ hs175 hiện tại.
//  3) A6-1: vào cổng bí cảnh → ra cổng đáp đúng REALM_RETURN đã scale (3216,1449).
//  4) B3-2 runtime: quest_accept q198_thu1 (gd198) + qx_kiep_van_tri_1 (gd265) lọt char_sync.
//  5) A3-1: Kiếm Ma cắn phòng 78 → 15; +Hộ Thể → 14 (mốc GĐ327 giữ nguyên);
//     công lớn 400 +Chiến Ý → đánh Kiếm Ma rơi đúng 400 (không lệch);
//     công nhỏ 16 +Chiến Ý +pháp tông Công 3 bậc → đánh sói (phòng 0) rơi 17 thay vì 16.
//  6) A3-2: Pháp Tướng hiện hình giao chiến — nạp tiến độ đúng ~6/s (bản cũ ~10/s).
//  7) A2-3: bộ tích lẻ đã vá trong file → qua restart + autosave offline vẫn nguyên;
//     qua login/logout (spawnFrom) vẫn nguyên.
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const net = require('net');
const ROOT = path.join(__dirname, '..', '..');
const PORT = 3793;
const DIR = __dirname;
const { io } = require(path.join(ROOT, 'client/node_modules/socket.io-client'));
const { createMerger } = require(path.join(ROOT, 'client/worldmerge.cjs'));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function waitFor(fn, ms) { const t0 = Date.now(); while (Date.now() - t0 < ms) { const v = fn(); if (v) return v; await sleep(150); } return null; }
function portFree(port) { return new Promise((res) => { const s = net.createServer(); s.once('error', () => res(false)); s.listen(port, () => s.close(() => res(true))); }); }
let serverProc = null, killTimer = null;
async function startServer(extraEnv) {
  if (!(await portFree(PORT))) throw new Error('port ban');
  serverProc = spawn('node', ['server/index.js'], { cwd: ROOT, env: { ...process.env, PORT: String(PORT), TTT_STORAGE: 'file', TTT_CHAR_FILE: path.join(DIR, 'characters.json'), TTT_ACC_FILE: path.join(DIR, 'accounts.json'), TTT_WORLD_FILE: path.join(DIR, 'world.json'), TTT_SESS_FILE: path.join(DIR, 'sessions.json'), TTT_DAY_REAL_MS: '600000', TTT_TUVI_NEED: '5', ...(extraEnv || {}) }, stdio: ['ignore', 'pipe', 'pipe'] });
  serverProc.stderr.on('data', (d) => process.stderr.write('[srv] ' + d));
  killTimer = setTimeout(() => { try { serverProc.kill('SIGKILL'); } catch (e) {} }, 900000);
  const t0 = Date.now();
  while (Date.now() - t0 < 45000) { try { const r = await fetch(`http://127.0.0.1:${PORT}/api/status`); if (r.ok) { clearTimeout(killTimer); killTimer = null; return; } } catch (e) {} await sleep(500); }
  throw new Error('server khong len');
}
async function stopServer() { if (!serverProc) return; const p = serverProc; serverProc = null; if (killTimer) { clearTimeout(killTimer); killTimer = null; } await new Promise((res) => { const t = setTimeout(() => { try { p.kill('SIGKILL'); } catch (e) {} res(); }, 4000); p.once('exit', () => { clearTimeout(t); res(); }); try { p.kill('SIGTERM'); } catch (e) { clearTimeout(t); res(); } }); const t0 = Date.now(); while (Date.now() - t0 < 10000 && !(await portFree(PORT))) await sleep(300); }
function BASE(token, name, extra) {
  return Object.assign({ token, name, classId: 'kiemtu', gender: 'nam', race: null, geo175: 1, realm: 'kd', tier: 1, x: 1565, y: 1252, mapId: 'lang_tan_thu', hp: 99999, mp: 9999, stats: { khiHuyet: 500, vatCong: 100, vatPhong: 78, phapCong: 100, phapPhong: 78, tocDo: 60, minhMan: 60 }, statPoints: 0, freePoints: 0, tuVi: 0, stones: 0, stonesTrung: 0, stonesThuong: 0, stonesCuc: 0, inventory: {}, gearBag: {}, equipped: [], skills: [], job: null, job2: null, job3: null, linhCan: { element: 'kim', grade: 'trung', mult: 1.2 }, affinity: {}, affV2: 1, bonds: {}, quests: {}, questsDone: {}, flags: {}, counters: {}, disciples: [], foundInvites: [], reformIn: [], sectTech: [], sectArts: [], sectArtsActive: [], mails: [], classRes: {} }, extra || {});
}
function SECT(id, name, members, extra) { return Object.assign({ id, name, intro: '', fund: 100000, level: 1, uy: 0, members, applicants: [], activeQuests: [], territories: [], territory: null, warehouse: [], garden: [], depts: {}, tributeDay: 100, upkeepDay: 100, questDay: 100, debtDays: 0, arts: [] }, extra || {}); }
let pass = 0, fail = 0;
function ok(name, cond, extra) { if (cond) { pass++; console.log('PASS | ' + name); } else { fail++; console.log('FAIL | ' + name + (extra ? ' | ' + extra : '')); } }
async function connect(token) {
  const socket = io(`http://127.0.0.1:${PORT}`, { transports: ['websocket'] });
  const ctx = { socket, merger: createMerger(), state: null, welcome: null, errors: [], syncs: [], notices: [], mapEnter: null };
  socket.on('connect', () => socket.emit('hello', { token }));
  socket.on('welcome', (w) => { ctx.welcome = w; });
  socket.on('map_enter', (m) => { ctx.mapEnter = m; }); // NPC thành phố nằm ở payload map_enter (tick chỉ gửi NPC làng)
  socket.on('server_tick', (t) => { const st = ctx.merger(t); if (st) ctx.state = st; });
  socket.on('interact_error', (e) => ctx.errors.push(e));
  socket.on('char_sync', (s) => { ctx.syncs.push(s); ctx.lastSync = s; });
  socket.on('notice', (n) => ctx.notices.push(n));
  await waitFor(() => ctx.welcome, 20000);
  return ctx;
}
const meOf = (c, name) => (c.state?.players || []).find((p) => p.name === name);
const monsOf = (c) => c.state?.monsters || [];
async function flyTo(c, name, x, y, tol) {
  c.socket.emit('fly_toggle', {}); await sleep(350);
  const t0 = Date.now();
  while (Date.now() - t0 < 30000) { const me = meOf(c, name); if (!me) { await sleep(120); continue; } const dx = x - me.x, dy = y - me.y; const d = Math.hypot(dx, dy); if (d <= (tol || 45)) break; c.socket.emit('client_input', { vx: dx / d, vy: dy / d }); await sleep(110); }
  c.socket.emit('client_input', { vx: 0, vy: 0 });
  c.socket.emit('fly_toggle', {}); await sleep(450);
}
const median = (a) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : 0; };
const hs175 = (v) => Math.round(v * Math.sqrt(5));

async function sampleBites(c, name, secs) {
  // Đứng cạnh 1 Kiếm Ma (lái theo vị trí SỐNG) rồi ghi MỌI cú sụt máu.
  // Quy kết theo GIÁ TRỊ (đo kiểm chứng bằng debug riêng): với phòng 78/80,
  // cú cắn đơn của Kiếm Ma = 15/14, Huyết Lang = 17, Thạch Khôi Lỗi = 12 —
  // 3 số phân biệt hẳn; cú cắn đôi trong cùng nhịp poll luôn ≥ 12+14 = 26.
  // Lọc drops == giá trị kỳ vọng của Kiếm Ma là quy kết sạch tuyệt đối.
  const drops = []; const t0 = Date.now();
  let target = null;
  while (Date.now() - t0 < 40000 && !target) { const ks = monsOf(c).filter((m) => m.kind === 'kiemma' && (m.hp || 0) > 0 && !m.sp); if (ks.length) target = ks[0]; else await sleep(300); }
  if (!target) return drops;
  // lái theo vị trí sống tới khi áp sát
  c.socket.emit('fly_toggle', {}); await sleep(300);
  const tA = Date.now();
  while (Date.now() - tA < 25000) {
    const m = monsOf(c).find((x) => x.id === target.id); const me = meOf(c, name);
    if (!m || !me) { await sleep(120); continue; }
    const d = Math.hypot(m.x - me.x, m.y - me.y);
    if (d <= 48) break;
    c.socket.emit('client_input', { vx: (m.x - me.x) / d, vy: (m.y - me.y) / d });
    await sleep(110);
  }
  c.socket.emit('client_input', { vx: 0, vy: 0 });
  c.socket.emit('fly_toggle', {}); await sleep(300);
  let last = null;
  const t1 = Date.now();
  while (Date.now() - t1 < (secs || 60) * 1000) {
    const me = meOf(c, name); if (!me) { await sleep(120); continue; }
    if (last === null) { last = me.hp; await sleep(120); continue; }
    if (me.hp < last) { drops.push(last - me.hp); last = me.hp; }
    await sleep(120);
  }
  return drops;
}
// Đánh 1 quái tới khi thấy máu nó sụt — trả về lượng sụt của cú trúng đầu tiên.
async function firstHitDrop(c, name, kind, secs) {
  const t0 = Date.now();
  while (Date.now() - t0 < (secs || 30) * 1000) {
    const ms = monsOf(c).filter((m) => m.kind === kind && (m.hp || 0) > 0);
    if (!ms.length) { await sleep(300); continue; }
    const me = meOf(c, name); if (!me) { await sleep(200); continue; }
    ms.sort((a, b) => Math.hypot(a.x - me.x, a.y - me.y) - Math.hypot(b.x - me.x, b.y - me.y));
    const t = ms[0];
    await flyTo(c, name, t.x, t.y, 30);
    const before = (monsOf(c).find((m) => m.id === t.id) || {}).hp;
    if (before == null) continue;
    c.socket.emit('player_attack', {});
    const hit = await waitFor(() => { const m = monsOf(c).find((x) => x.id === t.id); return m && m.hp < before ? before - m.hp : null; }, 2500);
    if (hit) return hit;
  }
  return null;
}

(async () => {
  // ================= S) KIỂM TĨNH =================
  {
    const parseInfo = (f) => { const src = fs.readFileSync(path.join(ROOT, 'client/src', f), 'utf8'); return eval('(' + src.slice(src.indexOf('{')).replace(/;\s*$/, '') + ')'); };
    let bad = 0, total = 0;
    for (const [srv, cli] of [['quests_gd198.json', 'quests_gd198_info.ts'], ['quests_gd265.json', 'quests_gd265_info.ts']]) {
      const S = JSON.parse(fs.readFileSync(path.join(ROOT, 'server/data', srv), 'utf8'));
      const C = parseInfo(cli);
      for (const [id, q] of Object.entries(S)) { total++; const c = C[id]; if (!c || c.name !== q.name || c.desc !== q.desc || c.target !== q.target || c.reward !== q.rewardStones || c.kind !== q.kind || c.npcId !== q.npcId) bad++; }
      for (const id of Object.keys(C)) if (!S[id]) bad++;
    }
    ok('S1 B3-2: mirror client khớp 119/119 quest gd198+gd265 với def server', total === 119 && bad === 0, `total=${total} bad=${bad}`);
    const mainTs = fs.readFileSync(path.join(ROOT, 'client/src/main.ts'), 'utf8');
    ok('S2 B3-2: main.ts import + spread 2 file info, QUEST_INFO có cờ gd198/gd265, panel làng bỏ qua gd198/gd265 (giữ hành vi bảng)', mainTs.includes('QUEST_INFO_GD198') && mainTs.includes('QUEST_INFO_GD265') && mainTs.includes('gd198?: boolean') && mainTs.includes('info.gd198 || info.gd265'));
    ok('S3 F1-6b: client có trạng thái npcWalk + đổi khung bước/hướng trong applyNpcMoves + trả idle khi ngừng', mainTs.includes('npcWalk') && mainTs.includes('applyNpcMoves') && mainTs.includes("'w' + (Math.floor(this.time.now / 130) % 4)"));
    const dist = fs.readFileSync(path.join(ROOT, 'client/dist/assets', fs.readdirSync(path.join(ROOT, 'client/dist/assets')).find((f) => f.endsWith('.js'))), 'utf8');
    ok('S4 bundle dist chứa tên quest gd198 + gd265 (tracker bản build đọc được info)', dist.includes('Phong Thư Không Tên') && dist.includes('Kiếp Vân Trì'));
    const src = fs.readFileSync(path.join(ROOT, 'server/index.js'), 'utf8');
    const bodyOf = (name) => { const i = src.indexOf('function ' + name); const st = src.indexOf('{', i); let d = 0, j = st; for (; j < src.length; j++) { const ch = src[j]; if (ch === '{') d++; else if (ch === '}') { d--; if (!d) break; } } return src.slice(st, j + 1); };
    const persist = bodyOf('persistPlayer'), sF = bodyOf('spawnFromCharacter'), sO = bodyOf('spawnOfflineActor');
    const cFields = new Set(); for (const m of persist.matchAll(/\bc\.([A-Za-z_][A-Za-z0-9_]*)\s*=/g)) cFields.add(m[1]);
    const miss = [...cFields].filter((f) => { const rn = f === 'craftFrac' ? '_craftFrac' : f; return !(sF.includes(rn + ':') || sF.includes('char.' + f)) || !(sO.includes(rn + ':') || sO.includes('char.' + f)); });
    ok('S5 A2-3: parity persist <-> 2 đường spawn đủ 100% (129 field, gồm 8 field tích lẻ mới)', cFields.size === 129 && miss.length === 0, `n=${cFields.size} miss=${JSON.stringify(miss)}`);
    const md = JSON.parse(fs.readFileSync(path.join(ROOT, 'server/data/gdd/MapData.json'), 'utf8'));
    const anyField = (k) => md.maps.some((m) => k in m);
    ok('S6 vệ sinh: MapData 255 map không còn connectsTo/monsterSet/impl; map van_uyen còn nguyên', md.maps.length === 255 && !anyField('connectsTo') && !anyField('monsterSet') && !anyField('impl') && md.maps.some((m) => m.id === 'van_uyen'));
    const mon = JSON.parse(fs.readFileSync(path.join(ROOT, 'server/data/gdd/MonsterData.json'), 'utf8'));
    ok('S7 vệ sinh: MonsterData meta.total = số loài thật; thư mục code chết server/gdd đã xóa', mon.meta.total === mon.monsters.length && mon.monsters.length === 201 && !fs.existsSync(path.join(ROOT, 'server/gdd')));
  }

  // ================= BOOT 1: các chân làng + chỉ số =================
  const ART = { id: 'art364', name: 'Phap Do 364', status: 'done', comps: { cong: 3 }, flaw: 'f_mau', k: 1, grade: 1 };
  const chars = {
    p364a00001: BASE('p364a00001', 'P364Chinh'),
    p364a00002: BASE('p364a00002', 'P364Cong', { x: hs175(1470), y: hs175(600), sect: 'thienkiem' }),
    p364a00003: BASE('p364a00003', 'P364Thu198', { x: hs175(762) + 30, y: hs175(470), flags: { tb_clue1: true } }),
    p364a00004: BASE('p364a00004', 'P364Quest265', { realm: 'tn', tier: 1, mapId: 'kiep_van_tri', x: 3000, y: 3000 }),
    p364a00005: BASE('p364a00005', 'P364KhongPhap', { x: 5702, y: 1232 }),
    p364a00006: BASE('p364a00006', 'P364CoHoThe', { x: 5702, y: 1232, sectTech: ['ho_the'] }),
    p364a00007: BASE('p364a00007', 'P364CongNho', { stats: { khiHuyet: 500, vatCong: 16, vatPhong: 78, phapCong: 100, phapPhong: 78, tocDo: 60, minhMan: 60 } }),
    p364a00008: BASE('p364a00008', 'P364CongNhoBuff', { stats: { khiHuyet: 500, vatCong: 16, vatPhong: 78, phapCong: 100, phapPhong: 78, tocDo: 60, minhMan: 60 }, sectTech: ['chien_y'], sectArts: ['art364'], sectArtsActive: ['art364'] }),
    p364a00009: BASE('p364a00009', 'P364CongLon', { x: 5702, y: 1232, stats: { khiHuyet: 500, vatCong: 400, vatPhong: 78, phapCong: 100, phapPhong: 78, tocDo: 60, minhMan: 100 }, sectTech: ['chien_y'] }),
    p364a00010: BASE('p364a00010', 'P364PhapTuong', { realm: 'ht', tier: 1, x: 5702, y: 1232, stats: { khiHuyet: 5000, vatCong: 50, vatPhong: 200, phapCong: 100, phapPhong: 78, tocDo: 60, minhMan: 100 }, phapTuong: { stage: 1, progress: 0, element: 'kim', mutation: null } }),
  };
  fs.writeFileSync(path.join(DIR, 'characters.json'), JSON.stringify(chars));
  const sects = [SECT('st364', 'Tong Do 364', [
    { token: 'p364a00006', name: 'P364CoHoThe', role: 'detu', contrib: 0 },
    { token: 'p364a00008', name: 'P364CongNhoBuff', role: 'detu', contrib: 0 },
    { token: 'p364a00009', name: 'P364CongLon', role: 'detu', contrib: 0 },
  ], { arts: [ART] })];
  fs.writeFileSync(path.join(DIR, 'world.json'), JSON.stringify({ totalMinutes: 100 * 1440, savedAt: Date.now(), sects }));
  fs.writeFileSync(path.join(DIR, 'accounts.json'), JSON.stringify({}));
  fs.writeFileSync(path.join(DIR, 'sessions.json'), JSON.stringify({}));
  await startServer();

  // ---- 1) E-2 + A6-2 trên cùng 1 char làng ----
  {
    const A = await connect('p364a00001');
    ok('1a char chính vào được làng', !!A.welcome);
    A.errors.length = 0; const nSync = A.syncs.length;
    A.socket.emit('use_item', { itemId: 'dan_khong_ton_tai_364' });
    const e1 = await waitFor(() => A.errors.find((e) => /không có vật phẩm/.test(e.message || '')), 4000);
    ok('1b E-2: use_item thiếu vật → interact_error rõ ràng', !!e1, JSON.stringify(A.errors));
    ok('1c E-2: nhánh bị chặn có gửi char_sync (túi không kẹt hiển thị cũ)', A.syncs.length > nSync, `syncs ${nSync}->${A.syncs.length}`);
    A.errors.length = 0;
    A.socket.emit('craft_item', { recipeId: 'recipe_la_364' });
    const e2 = await waitFor(() => A.errors.find((e) => /Không tìm thấy công thức/.test(e.message || '')), 4000);
    ok('1d E-2: craft_item recipeId lạ → interact_error rõ ràng', !!e2, JSON.stringify(A.errors));
    const ovP = new Promise((res) => A.socket.once('overview_data', res));
    A.socket.emit('map_overview', {});
    const ov = await ovP;
    const z = (ov.current && ov.current.zones) || [];
    const exp = [[240, 180, 920, 760], [1230, 420, 300, 240]].map(([x, y, w, h]) => ({ x: hs175(x), y: hs175(y), w: hs175(w), h: hs175(h) }));
    ok('2 A6-2: 2 khung vùng overview khớp tọa độ hs175 hiện tại', z.length >= 2 && z[0].x === exp[0].x && z[0].y === exp[0].y && z[0].w === exp[0].w && z[0].h === exp[0].h && z[1].x === exp[1].x && z[1].y === exp[1].y && z[1].w === exp[1].w && z[1].h === exp[1].h, JSON.stringify(z.slice(0, 2)) + ' exp=' + JSON.stringify(exp));
    A.socket.disconnect(); await sleep(600);
  }

  // ---- 3) A6-1: cổng bí cảnh ----
  {
    const B = await connect('p364a00002');
    await waitFor(() => meOf(B, 'P364Cong'), 8000);
    B.socket.emit('realm_portal', { action: 'enter' });
    const inPos = await waitFor(() => { const me = meOf(B, 'P364Cong'); return me && Math.abs(me.x - hs175(2505)) <= 3 && Math.abs(me.y - hs175(640)) <= 3 ? me : null; }, 6000);
    ok('3a A6-1: qua cổng vào đáp đúng điểm trong bí cảnh', !!inPos, JSON.stringify(inPos && { x: inPos.x, y: inPos.y }));
    await flyTo(B, 'P364Cong', hs175(2432), hs175(600), 40);
    B.socket.emit('realm_portal', { action: 'exit' });
    const outPos = await waitFor(() => { const me = meOf(B, 'P364Cong'); return me && Math.abs(me.x - hs175(1438)) <= 3 && Math.abs(me.y - hs175(648)) <= 3 ? me : null; }, 6000);
    ok('3b A6-1: ra bí cảnh đáp đúng REALM_RETURN đã scale (3216,1449) trước cổng trong làng', !!outPos, JSON.stringify(outPos && { x: outPos.x, y: outPos.y }));
    B.socket.disconnect(); await sleep(600);
  }

  // ---- 4) B3-2 runtime ----
  {
    const C = await connect('p364a00003');
    await waitFor(() => meOf(C, 'P364Thu198'), 8000);
    C.socket.emit('quest_accept', { questId: 'q198_thu1' });
    const got = await waitFor(() => { const s = C.lastSync; return s && s.quests && s.quests.q198_thu1 ? s.quests.q198_thu1 : null; }, 6000);
    ok('4a B3-2: nhận q198_thu1 (gd198) qua Sứ Giả — trạng thái lọt char_sync như cũ', !!got, JSON.stringify(C.errors));
    C.socket.disconnect(); await sleep(600);
    const D = await connect('p364a00004');
    const npc = await waitFor(() => ((D.mapEnter && D.mapEnter.npcs) || []).find((n) => n.id === 'kiep_van_tri_npc_049'), 10000);
    ok('4b B3-2: thấy Người Giao Nhiệm Vụ Kiếp Vân Trì trong payload map_enter', !!npc, JSON.stringify(((D.mapEnter && D.mapEnter.npcs) || []).length));
    if (npc) {
      await flyTo(D, 'P364Quest265', npc.x, npc.y, 60);
      D.socket.emit('quest_accept', { questId: 'qx_kiep_van_tri_1' });
      const got2 = await waitFor(() => { const s = D.lastSync; return s && s.quests && s.quests.qx_kiep_van_tri_1 ? s.quests.qx_kiep_van_tri_1 : null; }, 6000);
      ok('4c B3-2: nhận qx_kiep_van_tri_1 (gd265) tại thành — trạng thái lọt char_sync như cũ', !!got2, JSON.stringify(D.errors));
    } else ok('4c B3-2: nhận qx_kiep_van_tri_1 (gd265)', false, 'không thấy NPC');
    D.socket.disconnect(); await sleep(600);
  }

  // ---- 5) A3-1 ----
  {
    const E1 = await connect('p364a00005');
    const bitesA = await sampleBites(E1, 'P364KhongPhap', 60);
    E1.socket.disconnect(); await sleep(600);
    const E2 = await connect('p364a00006');
    const bitesB = await sampleBites(E2, 'P364CoHoThe', 60);
    E2.socket.disconnect(); await sleep(600);
    const nA15 = bitesA.filter((d) => d === 15).length, nB14 = bitesB.filter((d) => d === 14).length;
    const nA14 = bitesA.filter((d) => d === 14).length, nB15 = bitesB.filter((d) => d === 15).length;
    ok('5a A3-1 mốc GĐ327: đủ mẫu cắn Kiếm Ma quy kết theo giá trị (A có >=5 cú 15, B có >=5 cú 14)', nA15 >= 5 && nB14 >= 5, `A=${JSON.stringify(bitesA)} B=${JSON.stringify(bitesB)}`);
    ok('5b A3-1 mốc GĐ327: phòng 78 → cắn 15; +Hộ Thể +3% → 14, không lẫn chéo (A không có cú 14 nào, B không có cú 15 nào)', nA14 === 0 && nB15 === 0, `nA15=${nA15} nB14=${nB14} nA14=${nA14} nB15=${nB15}`);
    // Công thức đòn thường thật: hurtMonster(BASIC_COEF 0,85 × (công hiệu dụng + 10), phòng quái).
    // Sói phòng 0: công 16 → round(0,85×26) = 22; công hiệu dụng 17 → round(0,85×27) = 23.
    // Kiếm Ma phòng 3: công hiệu dụng 412 → damageThrough(round(0,85×422)=359, 3) = 348.
    const L = await connect('p364a00009');
    const bigHit = await firstHitDrop(L, 'P364CongLon', 'kiemma', 40);
    ok('5c A3-1: công lớn 400 + Chiến Ý +3% = 412 → đánh Kiếm Ma rơi đúng 348 theo công thức (không lệch so với trước vá)', bigHit === 348, 'hit=' + bigHit);
    L.socket.disconnect(); await sleep(600);
    const S1 = await connect('p364a00007');
    const hit1 = await firstHitDrop(S1, 'P364CongNho', 'wolf', 40);
    S1.socket.disconnect(); await sleep(600);
    const S2 = await connect('p364a00008');
    const hit2 = await firstHitDrop(S2, 'P364CongNhoBuff', 'wolf', 40);
    S2.socket.disconnect(); await sleep(600);
    ok('5d A3-1: công nhỏ 16 đánh sói phòng 0 rơi đúng 22 theo công thức (đối chứng)', hit1 === 22, 'hit=' + hit1);
    ok('5e A3-1: công nhỏ 16 + 2 lớp +3% chồng nhau → công hiệu dụng 17 → rơi 23 (trước vá bị nuốt: vẫn 22)', hit2 === 23, 'hit=' + hit2);
  }

  // ---- 6) A3-2: nạp Pháp Tướng khi giao chiến ----
  // LƯU Ý ĐO: payload char_sync.phapTuong hiện KHÔNG mang progress/active (phát
  // hiện phụ ngoài phạm vi GĐ364: comment // giữa dòng 6295 nuốt 5 field) —
  // chân này đo qua cờ ptActive trong tick + progress/ptFeedFrac trong FILE sau persist.
  {
    const P = await connect('p364a00010');
    await waitFor(() => meOf(P, 'P364PhapTuong'), 8000);
    P.socket.emit('phaptuong_toggle', {});
    const on = await waitFor(() => { const me = meOf(P, 'P364PhapTuong'); return me && me.ptActive === 1 ? me : null; }, 6000);
    ok('6a A3-2: bật được Pháp Tướng hiện hình (cờ ptActive trong tick)', !!on, JSON.stringify(P.errors));
    const t0 = Date.now();
    while (Date.now() - t0 < 10000) { P.socket.emit('player_attack', {}); await sleep(1400); }
    P.socket.disconnect(); await sleep(1800); // chờ persist khi disconnect
    const pc = JSON.parse(fs.readFileSync(path.join(DIR, 'characters.json'), 'utf8')).p364a00010;
    const gained = (pc.phapTuong || {}).progress || 0;
    ok('6b A3-2: 10s giao chiến hiện hình nạp ~6/s (dải 40–82; bản cũ ~10/s ≈ 100)', gained >= 40 && gained <= 82, 'progress=' + gained);
    ok('6c A3-2: ptFeedFrac lưu bền trong file, nằm trong [0,1)', typeof pc.ptFeedFrac === 'number' && pc.ptFeedFrac >= 0 && pc.ptFeedFrac < 1, 'ptFeedFrac=' + pc.ptFeedFrac);
  }
  await stopServer();

  // ================= BOOT 2+3: A2-3 round-trip =================
  {
    const ACC = { meditAcc: 7.5, bequanFrac: 0.42, achBequanFrac: 0.11, branchTuviFrac: 0.25, ptFeedFrac: 0.63, stoneFrac: 0.31, craftFrac: 0.8, anQuestDay: 4242, stonesThuong: 12345, mounts: [{ uid: 'm364', species: 'ngu', level: 1 }] };
    const r = BASE('p364a00901', 'P364TichLe', { ...ACC, restState: 'sleep', meditation: false, x: 1565, y: 1011 });
    fs.writeFileSync(path.join(DIR, 'characters.json'), JSON.stringify({ p364a00901: r }));
    fs.writeFileSync(path.join(DIR, 'world.json'), JSON.stringify({ totalMinutes: 100 * 1440, savedAt: Date.now(), sects: [] }));
    const readBack = () => JSON.parse(fs.readFileSync(path.join(DIR, 'characters.json'), 'utf8')).p364a00901;
    const checkAcc = (tag) => { const c = readBack(); const badF = ['meditAcc', 'bequanFrac', 'achBequanFrac', 'branchTuviFrac', 'ptFeedFrac', 'stoneFrac', 'craftFrac', 'anQuestDay', 'stonesThuong'].filter((k) => c[k] !== ACC[k]); ok(tag, badF.length === 0 && Array.isArray(c.mounts) && c.mounts.length === 1, 'sai: ' + badF.map((k) => k + '=' + c[k]).join(',')); };
    await startServer();
    await sleep(22000); // chờ autosave của diễn viên offline (15s)
    await stopServer();
    checkAcc('7a A2-3 + hồi quy GĐ360: bộ tích lẻ + ví/thú nguyên vẹn sau restart + autosave offline');
    await startServer();
    const R = await connect('p364a00901');
    ok('7b A2-3: nhân vật tích lẻ đăng nhập bình thường', !!R.welcome);
    R.socket.disconnect(); await sleep(1500);
    await stopServer();
    checkAcc('7c A2-3: bộ tích lẻ nguyên vẹn sau vòng login/logout (đường spawnFromCharacter)');
  }

  console.log(`\n== p364a: ${pass} PASS, ${fail} FAIL ==`);
  process.exit(fail ? 1 : 0);
})().catch(async (e) => { console.error('LOI:', e); await stopServer(); process.exit(2); });
