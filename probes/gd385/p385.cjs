// Probe GĐ385 — PHÁP BẢO ĐỢT 1 (Bảo chốt hết theo đề xuất 11/11/2026).
// Chân kiểm:
//  0) Tĩnh: ITEMS server = 171 (pháp bảo nằm ngoài túi, không tăng số loại item); icon chiêu dist/public = 1.360; FX = 85; marker ttt_intro_v1 còn; 6 icon pháp bảo có file.
//  1) Cổng cảnh: NA bị chặn chế/đeo/nâng (lỗi nhắc Hóa Thần); payload unlocked=false.
//  2) Chế đủ 6 món (char HT): trừ đúng 200 Thượng/món + nguyên liệu từng món; auto-đeo món đầu; bán tiệm bị chặn (lỗi bản mệnh); trade bị lọc khỏi bàn.
//  3) Nuôi cấp châu 1→10: trừ đúng Thượng từng cấp (tổng 9.000) + nguyên liệu + Cực ×1 ở cấp 8/9/10. Char không Cực: lên được cấp 8, cấp 9 bị chặn, không trừ gì.
//  4) Kích hoạt đo thật trên bãi farm / map Phản Hư:
//     - Hỗn Độn Châu cấp 1 + cấp 10: tỉ lệ proc/đòn, ICD ≥1,5s, extra = 40%×hệ số cấp của đòn (float).
//     - Giao Long Ấn: tỉ lệ proc/đòn, ICD ≥2s, MP trong file sau disconnect = proc × 3% maxMp.
//     - Kiếp Lôi Kiếm: proc mỗi ~6s khi đang giao tranh, ICD ≥6s, số sét float ≈ 60% công.
//     - Hư Không Chung: proc/bite trên 70s đứng cho sói cắn, ICD ≥4s, quái bị chậm (st='slow').
//     - Tinh Hà Phiến (map PH): đòn ≥10% maxHp → proc; đòn kế trong 5s bị khiên hấp thụ (drop nhỏ hơn rõ).
//     - Phượng Hoàng Linh (map PH): máu <20% → proc + máu nhảy lên; ICD 180s (kiểm nếu còn sống để qua lần 2).
//  5) Trần đóng góp: châu cấp 10 — dmg/đòn trung bình (float trên sói) có đeo vs tháo, lệch % báo số thật (mục tiêu ≤ ~12%).
//  6) Persist: relog thường + restart server (offline actor autosave 15s) — phapBao/cấp/ví còn nguyên.
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
  return Object.assign({ token, name, classId: 'kiemtu', gender: 'nam', race: null, geo175: 1, realm: 'ht', tier: 1, x: 1565, y: 1011, mapId: 'lang_tan_thu', hp: 999999, mp: 9999, lifespan: 500, birthDay: -5660, ageStart: 16, stats: { khiHuyet: 500, vatCong: 300, vatPhong: 200, phapCong: 300, phapPhong: 200, tocDo: 60, minhMan: 100 }, statPoints: 0, freePoints: 0, tuVi: 99999, stones: 100000, stonesTrung: 0, stonesThuong: 0, stonesCuc: 0, inventory: {}, gearBag: {}, equipped: [], skills: [], job: null, job2: null, job3: null, linhCan: { ...LC1 }, affinity: {}, affV2: 1, bonds: {}, quests: {}, questsDone: {}, flags: {}, counters: {}, disciples: [], foundInvites: [], reformIn: [], sectTech: [], sectArts: [], sectArtsActive: [], mails: [], classRes: {}, food: 100, water: 100 }, extra || {});
}
let pass = 0, fail = 0;
function ok(name, cond, extra) { if (cond) { pass++; console.log('PASS | ' + name); } else { fail++; console.log('FAIL | ' + name + (extra ? ' | ' + extra : '')); } }
function info(name, val) { console.log('INFO | ' + name + ' | ' + val); }
function connect(token) {
  const socket = io(`http://127.0.0.1:${CUR_PORT}`, { transports: ['websocket'] });
  const ctx = { socket, merger: createMerger(), state: null, welcome: null, syncs: [], errs: [], notices: [], floats: [], attacked: [], procs: [], results: [], tradeUpdates: [], myName: null, myId: null };
  socket.on('connect', () => socket.emit('hello', { token }));
  socket.on('welcome', (w) => { ctx.welcome = w; ctx.myName = (w.character || {}).name; ctx.myId = w.id; });
  socket.on('char_sync', (s) => ctx.syncs.push(s));
  socket.on('interact_error', (e) => ctx.errs.push({ t: Date.now(), msg: e.message || '' }));
  socket.on('notice', (n) => ctx.notices.push(n.text || ''));
  socket.on('dmg_float', (f) => { const t = Date.now(); for (const e of (f.list || [])) ctx.floats.push({ t, id: e.id, dmg: e.dmg }); });
  socket.on('player_attacked', (e) => { if (e.id === ctx.myId) ctx.attacked.push({ t: Date.now(), targetId: e.targetId }); });
  socket.on('phapbao_proc', (e) => { if (e.id === ctx.myId) ctx.procs.push({ t: Date.now(), art: e.art, targetId: e.targetId }); });
  socket.on('phapbao_result', (r) => ctx.results.push(r));
  socket.on('trade_update', (u) => ctx.tradeUpdates.push(u));
  socket.on('server_tick', (t) => { const st = ctx.merger(t); if (st) ctx.state = st; });
  return ctx;
}
const lastChar = (c) => { for (let i = c.syncs.length - 1; i >= 0; i--) { if (c.syncs[i]) return c.syncs[i]; } return c.welcome ? c.welcome.character : null; };
const invOf = (c, id) => { const ch = lastChar(c); return (ch && ch.inventory && ch.inventory[id]) || 0; };
const meOf = (c) => { if (!c.state || !c.state.players) return null; return c.state.players.find((p) => p.name === c.myName) || null; };
const monsOf = (c) => (c.state && c.state.monsters) || [];
const median = (a) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : 0; };
const minGap = (ts) => { let g = Infinity; for (let i = 1; i < ts.length; i++) g = Math.min(g, ts[i] - ts[i - 1]); return g === Infinity ? null : g; };
async function steerStep(c, tx, ty, tol) {
  const me = meOf(c); if (!me) return;
  const dx = tx - me.x, dy = ty - me.y; const d = Math.hypot(dx, dy);
  if (d <= tol) { c.socket.emit('client_input', { vx: 0, vy: 0 }); return; }
  c.socket.emit('client_input', { vx: dx / d, vy: dy / d });
}
// Vòng đánh thường: bám mục tiêu gần nhất còn sống, đánh mỗi 370ms, trong `sec` giây.
async function attackLoop(c, sec) {
  const t0 = Date.now();
  let lastAtk = 0, lastSteer = 0;
  while (Date.now() - t0 < sec * 1000) {
    const now = Date.now();
    const me = meOf(c);
    if (me && now - lastSteer > 400) {
      lastSteer = now;
      let best = null, bd = Infinity;
      for (const m of monsOf(c)) { if ((m.hp || 0) <= 0 || m.hidden) continue; const d = Math.hypot(m.x - me.x, m.y - me.y); if (d < bd) { bd = d; best = m; } }
      if (best) await steerStep(c, best.x, best.y, 40);
    }
    if (now - lastAtk >= 370) { lastAtk = now; c.socket.emit('player_attack'); }
    await sleep(90);
  }
  c.socket.emit('client_input', { vx: 0, vy: 0 });
}
// Đứng yên cho quái cắn: bám theo quái gần nhất tới tầm cắn rồi đứng; ghi chuỗi hp.
async function standAndSample(c, sec, sampleMs) {
  const samples = [];
  const t0 = Date.now();
  let lastSteer = 0;
  while (Date.now() - t0 < sec * 1000) {
    const me = meOf(c);
    if (me) {
      samples.push({ t: Date.now(), hp: me.hp });
      if (Date.now() - lastSteer > 2500) {
        lastSteer = Date.now();
        let best = null, bd = Infinity;
        for (const m of monsOf(c)) { if ((m.hp || 0) <= 0 || m.hidden) continue; const d = Math.hypot(m.x - me.x, m.y - me.y); if (d < bd) { bd = d; best = m; } }
        if (best && bd > 42) await steerStep(c, best.x, best.y, 38); else c.socket.emit('client_input', { vx: 0, vy: 0 });
      }
      if (me.hp <= 0) break;
    }
    await sleep(sampleMs || 150);
  }
  c.socket.emit('client_input', { vx: 0, vy: 0 });
  return samples;
}
function dropsOf(samples) { const out = []; for (let i = 1; i < samples.length; i++) { const d = samples[i - 1].hp - samples[i].hp; if (d !== 0) out.push({ t: samples[i].t, d }); } return out; }

(async () => {
  try {
    // ---------- Chân 0: tĩnh ----------
    const srvSrc = fs.readFileSync(path.join(ROOT, 'server/index.js'), 'utf8');
    const ii = srvSrc.indexOf('const ITEMS = {');
    let depth = 0, j = srvSrc.indexOf('{', ii); const istart = j;
    for (; j < srvSrc.length; j++) { if (srvSrc[j] === '{') depth++; else if (srvSrc[j] === '}') { depth--; if (!depth) break; } }
    const ITEMS = eval('(' + srvSrc.slice(istart, j + 1) + ')');
    ok('chân 0a: ITEMS server vẫn 171 loại (pháp bảo ngoài túi)', Object.keys(ITEMS).length === 171, 'dem=' + Object.keys(ITEMS).length);
    const iconCount = fs.readdirSync(path.join(ROOT, 'client/public/icons')).filter((f) => f.endsWith('.png')).length;
    const fxCount = fs.readdirSync(path.join(ROOT, 'client/public/sprites/fx')).length;
    ok('chân 0b: icon chiêu public = 1360', iconCount === 1360, 'dem=' + iconCount);
    ok('chân 0c: FX = 85 file', fxCount === 85, 'dem=' + fxCount);
    const cliSrc = fs.readFileSync(path.join(ROOT, 'client/src/main.ts'), 'utf8');
    ok('chân 0d: marker ttt_intro_v1 còn trong client', cliSrc.includes('ttt_intro_v1'));
    const PB_IDS = ['pb_hon_don_chau', 'pb_kiep_loi_kiem', 'pb_tinh_ha_phien', 'pb_hu_khong_chung', 'pb_giao_long_an', 'pb_phuong_hoang_linh'];
    ok('chân 0e: đủ 6 icon pháp bảo', PB_IDS.every((id) => fs.existsSync(path.join(ROOT, 'client/public/sprites/items', id + '.png'))));
    ok('chân 0f: server có đủ 6 món PHAP_BAO + handlers', PB_IDS.every((id) => srvSrc.includes(id)) && srvSrc.includes("socket.on('phapbao_craft'") && srvSrc.includes("socket.on('phapbao_upgrade'"));

    // ---------- Fixtures ----------
    const MATS50 = { hon_don_thach: 50, hu_khong_cot: 50, kiep_van_thach: 50, kiep_loi_tinh: 50, tinh_ha_thach: 50, loan_vu: 50, giao_chau: 50, kiep_tam_thao: 50, phuong_vu: 50, tam_ma_ket_tinh: 50 };
    const chars = {};
    chars['pb385gate01'] = BASE('pb385gate01', 'PB385Cong', { realm: 'na', tier: 9, x: 1605, y: 1011, stonesThuong: 5000, inventory: { ...MATS50 }, phapBao: { owned: { pb_giao_long_an: 3 }, equipped: null } });
    chars['pb385craft1'] = BASE('pb385craft1', 'PB385Che', { stonesThuong: 20000, stonesCuc: 5, inventory: { ...MATS50 } });
    chars['pb385nocuc1'] = BASE('pb385nocuc1', 'PB385NoCuc', { stonesThuong: 20000, stonesCuc: 0, inventory: { ...MATS50 } });
    const FARM = { khiHuyet: 5000, vatCong: 5, vatPhong: 5000, phapCong: 5, phapPhong: 5000, tocDo: 50, minhMan: 100 };
    chars['pb385chau01'] = BASE('pb385chau01', 'PB385Chau1', { stats: { ...FARM }, phapBao: { owned: { pb_hon_don_chau: 1 }, equipped: 'pb_hon_don_chau' } });
    chars['pb385chau10'] = BASE('pb385chau10', 'PB385Chau10', { stats: { ...FARM }, phapBao: { owned: { pb_hon_don_chau: 10 }, equipped: 'pb_hon_don_chau' } });
    chars['pb385kiem01'] = BASE('pb385kiem01', 'PB385Kiem', { stats: { ...FARM, vatCong: 1 }, phapBao: { owned: { pb_kiep_loi_kiem: 1 }, equipped: 'pb_kiep_loi_kiem' } });
    chars['pb385an0001'] = BASE('pb385an0001', 'PB385An', { stats: { ...FARM }, mp: 0, phapBao: { owned: { pb_giao_long_an: 1 }, equipped: 'pb_giao_long_an' } });
    chars['pb385chung1'] = BASE('pb385chung1', 'PB385Chung', { stats: { khiHuyet: 100, vatCong: 50, vatPhong: 0, phapCong: 50, phapPhong: 0, tocDo: 50, minhMan: 50 }, phapBao: { owned: { pb_hu_khong_chung: 1 }, equipped: 'pb_hu_khong_chung' } });
    chars['pb385phien1'] = BASE('pb385phien1', 'PB385Phien', { realm: 'ph', tier: 1, mapId: 'phan_hu_nguyen', x: 1000, y: 1000, stats: { khiHuyet: 1000, vatCong: 50, vatPhong: 0, phapCong: 50, phapPhong: 0, tocDo: 50, minhMan: 50 }, phapBao: { owned: { pb_tinh_ha_phien: 1 }, equipped: 'pb_tinh_ha_phien' } });
    chars['pb385phnx01'] = BASE('pb385phnx01', 'PB385Phuong', { realm: 'ph', tier: 1, mapId: 'phan_hu_nguyen', x: 3500, y: 3500, stats: { khiHuyet: 200, vatCong: 50, vatPhong: 0, phapCong: 50, phapPhong: 0, tocDo: 50, minhMan: 50 }, phapBao: { owned: { pb_phuong_hoang_linh: 1 }, equipped: 'pb_phuong_hoang_linh' } });
    for (const f of ['characters.json', 'accounts.json', 'world.json', 'sessions.json']) { try { fs.unlinkSync(path.join(DIR, f)); } catch (e) {} }
    fs.writeFileSync(path.join(DIR, 'characters.json'), JSON.stringify(chars));
    fs.writeFileSync(path.join(DIR, 'accounts.json'), JSON.stringify({}));
    await startServer(3851, 'a');
    const C = {};
    // 2 char map Phản Hư KHÔNG nối ngay: quái PH hạ chúng trong lúc chờ các chân khác,
    // tới lượt đo đã hồi sinh ở làng (bản chạy đầu: log server cho thấy khiên hấp thụ
    // đúng 1.212 = 12% maxHp và Phượng hồi đúng +525 = 25% — cơ chế đúng, chỉ sai thời điểm đo).
    const LAZY = ['pb385phien1', 'pb385phnx01'];
    for (const tk of Object.keys(chars)) if (!LAZY.includes(tk)) C[tk] = connect(tk);
    const ready = await waitFor(() => Object.values(C).every((c) => c.welcome && lastChar(c)), 40000);
    ok('boot 1 + 10 nhân vật vào được', !!ready);
    const sampleMon = monsOf(C['pb385chau01'])[0];
    if (sampleMon) info('mẫu field quái trong tick', Object.keys(sampleMon).join(','));

    // ---------- Chân 1: cổng cảnh ----------
    const gate = C['pb385gate01'];
    const g0 = gate.errs.length;
    gate.socket.emit('phapbao_craft', { id: 'pb_hon_don_chau' });
    gate.socket.emit('phapbao_equip', { id: 'pb_giao_long_an' });
    gate.socket.emit('phapbao_upgrade', { id: 'pb_giao_long_an' });
    await sleep(1200);
    const gErrs = gate.errs.slice(g0).map((e) => e.msg);
    ok('chân 1a: NA bị chặn chế/đeo/nâng với lỗi nhắc Hóa Thần', gErrs.filter((m) => m.includes('Hóa Thần')).length >= 3, JSON.stringify(gErrs));
    ok('chân 1b: payload NA unlocked=false', lastChar(gate).phapBao && lastChar(gate).phapBao.unlocked === false);
    ok('chân 1c: payload HT unlocked=true + catalog 6 món', lastChar(C['pb385craft1']).phapBao.unlocked === true && lastChar(C['pb385craft1']).phapBao.catalog.length === 6);

    // ---------- Chân 2: chế đủ 6 món + trừ đúng ----------
    const cr = C['pb385craft1'];
    const CRAFT = { pb_hon_don_chau: { hon_don_thach: 6, hu_khong_cot: 2 }, pb_kiep_loi_kiem: { kiep_van_thach: 4, kiep_loi_tinh: 2 }, pb_tinh_ha_phien: { tinh_ha_thach: 6, loan_vu: 2 }, pb_hu_khong_chung: { hon_don_thach: 3, hu_khong_cot: 3 }, pb_giao_long_an: { giao_chau: 2, kiep_tam_thao: 4 }, pb_phuong_hoang_linh: { phuong_vu: 2, tam_ma_ket_tinh: 1 } };
    for (const id of PB_IDS) { cr.socket.emit('phapbao_craft', { id }); await sleep(350); }
    await sleep(800);
    const crC = lastChar(cr);
    ok('chân 2a: chế đủ 6 món, mỗi món cấp 1', PB_IDS.every((id) => crC.phapBao.owned[id] === 1), JSON.stringify(crC.phapBao.owned));
    ok('chân 2b: trừ Thượng đúng 6×200 (20000→18800)', crC.stonesThuong === 18800, 'thuong=' + crC.stonesThuong);
    let matsOk = true; const matsDetail = [];
    for (const [id, mats] of Object.entries(CRAFT)) for (const [mid, n] of Object.entries(mats)) { /* cộng dồn dưới */ }
    const totalMats = {};
    for (const mats of Object.values(CRAFT)) for (const [mid, n] of Object.entries(mats)) totalMats[mid] = (totalMats[mid] || 0) + n;
    for (const [mid, n] of Object.entries(totalMats)) { const have = invOf(cr, mid); if (have !== 50 - n) { matsOk = false; matsDetail.push(mid + '=' + have + ' (mong ' + (50 - n) + ')'); } }
    ok('chân 2c: trừ nguyên liệu chế đúng từng loại', matsOk, matsDetail.join('; '));
    ok('chân 2d: món đầu tự đeo vào ô duy nhất', crC.phapBao.equipped === 'pb_hon_don_chau', 'eq=' + crC.phapBao.equipped);
    // bán tiệm bị chặn
    const s0 = cr.errs.length;
    cr.socket.emit('shop_sell', { shopId: 'tiem_nguyen_lieu', itemId: 'pb_hon_don_chau' });
    await sleep(800);
    ok('chân 2e: bán tiệm pháp bảo bị chặn (bản mệnh)', cr.errs.slice(s0).some((e) => e.msg.includes('bản mệnh')), JSON.stringify(cr.errs.slice(s0)));
    // trade bị lọc
    gate.socket.emit('client_input', { vx: 0, vy: 0 });
    cr.socket.emit('trade_request', { targetId: gate.myId });
    await sleep(700);
    gate.socket.emit('trade_accept', {});
    await sleep(700);
    cr.socket.emit('trade_set', { items: { pb_hon_don_chau: 1, nanh_soi: 0 }, stones: 0 });
    await sleep(900);
    const tu = gate.tradeUpdates[gate.tradeUpdates.length - 1];
    ok('chân 2f: trade — pháp bảo bị lọc khỏi bàn (theirs.items rỗng)', !!tu && Object.keys(tu.theirs.items || {}).length === 0, tu ? JSON.stringify(tu.theirs) : 'khong co trade_update');
    cr.socket.emit('trade_cancel', {});

    // ---------- Chân 3: nuôi cấp + Cực ----------
    // châu 1→10 trên char chế: Thượng −9.000, Cực −3, NL: L2 hon_don_thach−2, L3 kiep_van_thach−2, L4 tinh_ha_thach−2, L5-7 hu_khong_cot−6, L8-10 hu_khong_cot−9
    const before3 = { thuong: lastChar(cr).stonesThuong, cuc: lastChar(cr).stonesCuc, hdt: invOf(cr, 'hon_don_thach'), kvt: invOf(cr, 'kiep_van_thach'), tht: invOf(cr, 'tinh_ha_thach'), hkc: invOf(cr, 'hu_khong_cot') };
    for (let lv = 2; lv <= 10; lv++) { cr.socket.emit('phapbao_upgrade', { id: 'pb_hon_don_chau' }); await sleep(300); }
    await sleep(800);
    const af3 = lastChar(cr);
    ok('chân 3a: châu lên cấp 10', af3.phapBao.owned.pb_hon_don_chau === 10, 'lv=' + af3.phapBao.owned.pb_hon_don_chau);
    ok('chân 3b: tổng Thượng nuôi 1→10 đúng 9.000', before3.thuong - af3.stonesThuong === 9000, 'tru=' + (before3.thuong - af3.stonesThuong));
    ok('chân 3c: Cực trừ đúng ×1 ở cấp 8/9/10 (tổng −3)', before3.cuc - af3.stonesCuc === 3, 'tru=' + (before3.cuc - af3.stonesCuc));
    ok('chân 3d: NL nuôi trừ đúng (đá thường ×2×3 cấp; A4 châu −15)', before3.hdt - invOf(cr, 'hon_don_thach') === 2 && before3.kvt - invOf(cr, 'kiep_van_thach') === 2 && before3.tht - invOf(cr, 'tinh_ha_thach') === 2 && before3.hkc - invOf(cr, 'hu_khong_cot') === 15, `hdt=${before3.hdt - invOf(cr, 'hon_don_thach')} kvt=${before3.kvt - invOf(cr, 'kiep_van_thach')} tht=${before3.tht - invOf(cr, 'tinh_ha_thach')} hkc=${before3.hkc - invOf(cr, 'hu_khong_cot')}`);
    // char không Cực: lên được cấp 7; cấp 8 là cấp ĐẦU ăn Cực (bản thảo: "cấp 8–10 ăn
    // Cực ×1/cấp" — bản chạy đầu xác nhận server trừ Cực ở cấp đích 8/9/10, tổng −3 như chân 3c)
    const nc = C['pb385nocuc1'];
    nc.socket.emit('phapbao_craft', { id: 'pb_hu_khong_chung' });
    await sleep(500);
    for (let lv = 2; lv <= 7; lv++) { nc.socket.emit('phapbao_upgrade', { id: 'pb_hu_khong_chung' }); await sleep(250); }
    await sleep(600);
    const ncMid = lastChar(nc);
    const ncThuong7 = ncMid.stonesThuong;
    const e0 = nc.errs.length;
    nc.socket.emit('phapbao_upgrade', { id: 'pb_hu_khong_chung' });
    await sleep(800);
    const ncEnd = lastChar(nc);
    ok('chân 3e: không Cực vẫn lên được cấp 7', ncMid.phapBao.owned.pb_hu_khong_chung === 7, 'lv=' + ncMid.phapBao.owned.pb_hu_khong_chung);
    ok('chân 3f: cấp 8 thiếu Cực → chặn, cấp giữ 7, Thượng không trừ', ncEnd.phapBao.owned.pb_hu_khong_chung === 7 && ncEnd.stonesThuong === ncThuong7 && nc.errs.slice(e0).some((e) => e.msg.includes('CỰC')), JSON.stringify(nc.errs.slice(e0)));

    // ---------- Chân 4f: Tinh Hà Phiến (đo NGAY khi connect — quái PH rất mạnh) ----------
    const ph = connect('pb385phien1'); C['pb385phien1'] = ph;
    await waitFor(() => ph.welcome && lastChar(ph), 20000);
    const phSamples = await standAndSample(ph, 40, 150);
    const phDrops = dropsOf(phSamples).filter((d) => d.d > 0);
    const phProcs = ph.procs.filter((p) => p.art === 'pb_tinh_ha_phien');
    const maxHpPh = lastChar(ph) ? lastChar(ph).maxHp : 10100;
    let absorbOk = false; let absorbDetail = 'chua co proc';
    if (phProcs.length && phDrops.length >= 2) {
      const p0 = phProcs[0].t;
      const before = [...phDrops].reverse().find((d) => d.t <= p0);
      const after = phDrops.find((d) => d.t > p0 && d.t <= p0 + 5000);
      if (before && after) { absorbOk = after.d < before.d * 0.85; absorbDetail = `dropTruoc=${before.d} dropSau=${after.d}`; }
      else absorbDetail = 'thieu drop quanh proc';
    }
    info('phiến: drops/procs/maxHp', phDrops.length + '/' + phProcs.length + '/' + maxHpPh + ' drops=' + JSON.stringify(phDrops.slice(0, 8).map((d) => d.d)));
    ok('chân 4f1: phiến — đòn lớn (≥10% maxHp) kích khiên (có proc)', phProcs.length >= 1 && phDrops.some((d) => d.d >= maxHpPh * 0.10), 'procs=' + phProcs.length);
    ok('chân 4f2: phiến — đòn kế trong 5s bị khiên hấp thụ (drop nhỏ hơn ≥15%)', absorbOk, absorbDetail);
    const phGap = minGap(phProcs.map((p) => p.t));
    ok('chân 4f3: phiến — ICD ≥19,5s (nếu ≥2 proc)', phGap === null || phGap >= 19500, 'gap=' + phGap);
    ph.socket.disconnect();

    // ---------- Chân 4g: Phượng Hoàng Linh (đo NGAY khi connect) ----------
    const px = connect('pb385phnx01'); C['pb385phnx01'] = px;
    await waitFor(() => px.welcome && lastChar(px), 20000);
    const pxSamples = await standAndSample(px, 40, 150);
    const pxProcs = px.procs.filter((p) => p.art === 'pb_phuong_hoang_linh');
    const maxHpPx = lastChar(px) ? lastChar(px).maxHp : 2100;
    let pxHealOk = false; let pxDetail = 'chua co proc';
    if (pxProcs.length) {
      const p0 = pxProcs[0].t;
      const sBefore = [...pxSamples].reverse().find((s) => s.t <= p0);
      const sAfter = pxSamples.find((s) => s.t >= p0);
      if (sBefore && sAfter) { pxHealOk = sAfter.hp > sBefore.hp || (sAfter.hp >= maxHpPx * 0.20 && sBefore.hp < maxHpPx * 0.45); pxDetail = `hpTruoc=${sBefore.hp} hpSau=${sAfter.hp} maxHp=${maxHpPx}`; }
    }
    info('phượng: procs/maxHp', pxProcs.length + '/' + maxHpPx + ' ' + pxDetail);
    ok('chân 4g1: phượng — máu <20% kích hoạt (có proc)', pxProcs.length >= 1, 'procs=' + pxProcs.length);
    ok('chân 4g2: phượng — hồi 25% maxHp (máu sau proc bật lên bất chấp đòn vừa ăn)', pxHealOk, pxDetail);
    px.socket.disconnect();

    // ---------- Chân 4a: Hỗn Độn Châu cấp 1 ----------
    async function chauMeasure(c, expectRatio, label) {
      c.attacked.length = 0; c.floats.length = 0; c.procs.length = 0;
      await attackLoop(c, 170);
      const hits = c.attacked.length;
      const procs = c.procs.filter((p) => p.art === 'pb_hon_don_chau');
      const ratios = [];
      for (const p of procs) {
        const win = c.floats.filter((f) => f.id === p.targetId && f.t >= p.t - 350 && f.t <= p.t + 350);
        if (win.length >= 2) ratios.push(win[win.length - 1].dmg / win[0].dmg);
      }
      const ratio = median(ratios);
      const gap = minGap(procs.map((p) => p.t));
      info(label + ': hits/procs', hits + '/' + procs.length + ' rate=' + (procs.length / Math.max(1, hits)).toFixed(3) + ' ratioMedian=' + ratio.toFixed(3) + ' minGap=' + gap + 'ms windows=' + ratios.length);
      return { hits, procs: procs.length, ratio, gap };
    }
    const ch1 = await chauMeasure(C['pb385chau01'], 0.40, 'châu cấp 1');
    ok('chân 4a1: châu 1 — đủ 200+ đòn', ch1.hits >= 200, 'hits=' + ch1.hits);
    ok('chân 4a2: châu 1 — tỉ lệ proc/đòn trong [0,04–0,16] (kỳ vọng ~0,09 do ICD 1,5s)', ch1.procs / ch1.hits >= 0.04 && ch1.procs / ch1.hits <= 0.16, 'rate=' + (ch1.procs / ch1.hits).toFixed(3));
    ok('chân 4a3: châu 1 — ICD: khoảng cách proc ≥1,35s', ch1.gap === null || ch1.gap >= 1350, 'gap=' + ch1.gap);
    ok('chân 4a4: châu 1 — đòn nổ = 40% đòn chính (±0,07)', Math.abs(ch1.ratio - 0.40) <= 0.07, 'ratio=' + ch1.ratio.toFixed(3));

    // ---------- Chân 4b+5: châu cấp 10 + trần đóng góp ----------
    // Đóng góp đo ĐÚNG nghĩa: tổng float trên mục tiêu chính / đòn (gồm cả đòn nổ
    // của châu, KHÔNG tính lan sang quái phụ → số bảo thủ), pha đeo vs pha tháo.
    const perHitTotals = (c) => {
      const out = [];
      for (const a of c.attacked) { const fl = c.floats.filter((f) => f.id === a.targetId && f.t >= a.t && f.t <= a.t + 320); if (fl.length) out.push(fl.reduce((s, x) => s + x.dmg, 0)); }
      return out;
    };
    const cx = C['pb385chau10'];
    cx.attacked.length = 0; cx.floats.length = 0; cx.procs.length = 0;
    await attackLoop(cx, 130);
    const hitsA = cx.attacked.length;
    const totA = perHitTotals(cx);
    const procsA = cx.procs.filter((p) => p.art === 'pb_hon_don_chau');
    const ratiosA = [];
    for (const p of procsA) { const win = cx.floats.filter((f) => f.id === p.targetId && f.t >= p.t - 350 && f.t <= p.t + 350); if (win.length >= 2) ratiosA.push(win[win.length - 1].dmg / win[0].dmg); }
    const ratioA = median(ratiosA);
    info('châu cấp 10: hits/procs', hitsA + '/' + procsA.length + ' ratioMedian=' + ratioA.toFixed(3));
    ok('chân 4b1: châu 10 — đòn nổ = 40%×1,72 ≈ 68,8% (±0,08) → +8%/cấp đúng', Math.abs(ratioA - 0.688) <= 0.08, 'ratio=' + ratioA.toFixed(3));
    // tháo ra đo baseline: phải THOÁT giao tranh thật (chạy xa quái tới khi 6s không mất máu)
    {
      const t0 = Date.now(); let lastHp = null; let lastDropAt = Date.now();
      while (Date.now() - t0 < 30000) {
        const me = meOf(cx);
        if (me) { if (lastHp !== null && me.hp < lastHp) lastDropAt = Date.now(); lastHp = me.hp; await steerStep(cx, 1565, 1252, 30); if (Date.now() - lastDropAt >= 6000) break; }
        await sleep(300);
      }
      cx.socket.emit('client_input', { vx: 0, vy: 0 });
    }
    cx.socket.emit('phapbao_unequip', {});
    await sleep(700);
    ok('chân 5a: tháo pháp bảo được ngoài giao tranh', lastChar(cx).phapBao.equipped === null, 'eq=' + lastChar(cx).phapBao.equipped + ' errs=' + JSON.stringify(cx.errs.slice(-2)));
    cx.attacked.length = 0; cx.floats.length = 0;
    await attackLoop(cx, 130);
    const hitsB = cx.attacked.length;
    const totB = perHitTotals(cx);
    const avgA = totA.reduce((s, v) => s + v, 0) / Math.max(1, totA.length);
    const avgB = totB.reduce((s, v) => s + v, 0) / Math.max(1, totB.length);
    const contrib = (avgA / avgB - 1) * 100;
    info('TRẦN ĐÓNG GÓP châu cấp 10 (tổng dmg lên mục tiêu chính/đòn)', 'co đeo=' + avgA.toFixed(2) + ' thao=' + avgB.toFixed(2) + ' hitsA/B=' + hitsA + '/' + hitsB + ' → đóng góp ' + contrib.toFixed(2) + '% (chưa tính lan quái phụ)');
    ok('chân 5b: đo được đóng góp châu cấp 10 (≥120 đòn mỗi pha)', totA.length >= 120 && totB.length >= 120, 'mauA/B=' + totA.length + '/' + totB.length);
    ok('chân 5c: đóng góp châu cấp 10 ≤ ~12% (mục tiêu bản thảo)', contrib <= 12.5, 'contrib=' + contrib.toFixed(2) + '%');

    // ---------- Chân 4c: Giao Long Ấn ----------
    const an = C['pb385an0001'];
    an.attacked.length = 0; an.procs.length = 0;
    await attackLoop(an, 130);
    const anHits = an.attacked.length;
    const anProcs = an.procs.filter((p) => p.art === 'pb_giao_long_an');
    const anGap = minGap(anProcs.map((p) => p.t));
    info('ấn: hits/procs', anHits + '/' + anProcs.length + ' rate=' + (anProcs.length / Math.max(1, anHits)).toFixed(3) + ' minGap=' + anGap);
    ok('chân 4c1: ấn — tỉ lệ proc/đòn trong [0,03–0,15] (kỳ vọng ~0,08 do ICD 2s)', anProcs.length / Math.max(1, anHits) >= 0.03 && anProcs.length / Math.max(1, anHits) <= 0.15, 'rate=' + (anProcs.length / Math.max(1, anHits)).toFixed(3));
    ok('chân 4c2: ấn — ICD ≥1,85s', anGap === null || anGap >= 1850, 'gap=' + anGap);
    an.socket.disconnect();
    await sleep(2000);
    const fileAfterAn = JSON.parse(fs.readFileSync(path.join(DIR, 'characters.json'), 'utf8'));
    const anFileMp = fileAfterAn['pb385an0001'] ? fileAfterAn['pb385an0001'].mp : null;
    // maxMp = minhMan 100 × 10 = 1000; mỗi proc +30 (3% × cấp 1)
    ok('chân 4c3: ấn — MP hồi trong file ≈ proc × 30 (±35)', anFileMp !== null && Math.abs(anFileMp - Math.min(1000, anProcs.length * 30)) <= 35, 'mpFile=' + anFileMp + ' procs=' + anProcs.length);

    // ---------- Chân 4d: Kiếp Lôi Kiếm ----------
    const km = C['pb385kiem01'];
    km.attacked.length = 0; km.floats.length = 0; km.procs.length = 0;
    await attackLoop(km, 65);
    const kmProcs = km.procs.filter((p) => p.art === 'pb_kiep_loi_kiem');
    const kmGap = minGap(kmProcs.map((p) => p.t));
    const thunderDmg = [];
    for (const p of kmProcs) {
      // sét là float NHỎ NHẤT quanh proc (đòn thường của char công 1 = ~9-13, sét = 60% công ≈ 6-7)
      const near = km.floats.filter((f) => f.id === p.targetId && Math.abs(f.t - p.t) <= 300);
      if (near.length) thunderDmg.push(Math.min(...near.map((f) => f.dmg)));
    }
    info('kiếm: procs', kmProcs.length + ' minGap=' + kmGap + ' thunderDmgMedian=' + median(thunderDmg) + ' mau=' + JSON.stringify(thunderDmg.slice(0, 8)));
    ok('chân 4d1: kiếm — sét đánh đều khi giao tranh (≥6 lần/65s)', kmProcs.length >= 6, 'procs=' + kmProcs.length);
    ok('chân 4d2: kiếm — ICD ≥5,85s', kmGap === null || kmGap >= 5850, 'gap=' + kmGap);
    ok('chân 4d3: kiếm — sét ≈ 60% công (dmg 6–8 với công 1)', thunderDmg.length >= 3 && median(thunderDmg) >= 5 && median(thunderDmg) <= 9, 'median=' + median(thunderDmg));

    // ---------- Chân 4e: Hư Không Chung ----------
    // Sói/dơi cắn 3 dmg/cú (GĐ188) → số cú cắn = tổng máu mất / 3. Kiểm tra quái
    // bị chậm NGAY trong lúc đo (khung slow chỉ kéo 2s, chờ cuối mới xem là hết).
    const chg = C['pb385chung1'];
    chg.procs.length = 0;
    let slowSeen = false;
    const samples = [];
    {
      const t0 = Date.now(); let lastSteer = 0;
      while (Date.now() - t0 < 150000) {
        const me = meOf(chg);
        if (me) {
          samples.push({ t: Date.now(), hp: me.hp });
          for (const p of chg.procs) { if (Date.now() - p.t <= 1800 && p.targetId) { const m = monsOf(chg).find((x) => x.id === p.targetId); if (m && m.st === 'slow') slowSeen = true; } }
          if (Date.now() - lastSteer > 1200) {
            lastSteer = Date.now();
            let best = null, bd = Infinity;
            for (const m of monsOf(chg)) { if ((m.hp || 0) <= 0 || m.hidden) continue; const d = Math.hypot(m.x - me.x, m.y - me.y); if (d < bd) { bd = d; best = m; } }
            if (best && bd > 40) await steerStep(chg, best.x, best.y, 30); else chg.socket.emit('client_input', { vx: 0, vy: 0 });
          }
          if (me.hp <= 0) break;
        }
        await sleep(150);
      }
      chg.socket.emit('client_input', { vx: 0, vy: 0 });
    }
    const drops = dropsOf(samples).filter((d) => d.d > 0);
    const bites = Math.round(drops.reduce((s, d) => s + d.d, 0) / 3);
    const chgProcs = chg.procs.filter((p) => p.art === 'pb_hu_khong_chung');
    const chgGap = minGap(chgProcs.map((p) => p.t));
    info('chung: bites/procs', bites + '/' + chgProcs.length + ' rate=' + (chgProcs.length / Math.max(1, bites)).toFixed(3) + ' minGap=' + chgGap + ' hpCuoi=' + (meOf(chg) || {}).hp);
    ok('chân 4e1: chung — đủ 60+ cú cắn', bites >= 60, 'bites=' + bites);
    ok('chân 4e2: chung — tỉ lệ proc/cắn trong [0,03–0,32]', chgProcs.length / Math.max(1, bites) >= 0.03 && chgProcs.length / Math.max(1, bites) <= 0.32, 'rate=' + (chgProcs.length / Math.max(1, bites)).toFixed(3));
    ok('chân 4e3: chung — ICD ≥3,85s', chgGap === null || chgGap >= 3850, 'gap=' + chgGap);
    ok('chân 4e4: chung — quái cắn bị làm chậm (st=slow trong tick sau proc)', slowSeen);

    // ---------- Chân 6: persist ----------
    // relog thường
    const crStateBefore = JSON.stringify(lastChar(cr).phapBao.owned) + '|' + lastChar(cr).phapBao.equipped + '|' + lastChar(cr).stonesThuong + '|' + lastChar(cr).stonesCuc;
    cr.socket.disconnect();
    await sleep(2500);
    const cr2 = connect('pb385craft1');
    C['pb385craft1'] = cr2;
    await waitFor(() => cr2.welcome && lastChar(cr2), 20000);
    const crStateAfter = JSON.stringify(lastChar(cr2).phapBao.owned) + '|' + lastChar(cr2).phapBao.equipped + '|' + lastChar(cr2).stonesThuong + '|' + lastChar(cr2).stonesCuc;
    ok('chân 6a: relog — pháp bảo/cấp/ví còn nguyên', crStateBefore === crStateAfter, 'truoc=' + crStateBefore + ' sau=' + crStateAfter);
    // restart + offline autosave
    cr2.socket.disconnect();
    await sleep(2500);
    await stopServer();
    const fileBoot1 = JSON.parse(fs.readFileSync(path.join(DIR, 'characters.json'), 'utf8'))['pb385craft1'];
    ok('chân 6b: file sau disconnect có phapBao + restState (đủ điều kiện offline actor)', !!fileBoot1.phapBao && !!fileBoot1.restState, 'restState=' + (fileBoot1 && fileBoot1.restState));
    await startServer(3851, 'b');
    await sleep(17000); // qua 1 chu kỳ autosave 15s của offline actor
    const fileBoot2 = JSON.parse(fs.readFileSync(path.join(DIR, 'characters.json'), 'utf8'))['pb385craft1'];
    ok('chân 6c: restart + autosave offline — phapBao trong file còn nguyên', JSON.stringify(fileBoot2.phapBao) === JSON.stringify(fileBoot1.phapBao), 'file2=' + JSON.stringify(fileBoot2.phapBao));
    const cr3 = connect('pb385craft1');
    await waitFor(() => cr3.welcome && lastChar(cr3), 20000);
    const crStateBoot2 = JSON.stringify(lastChar(cr3).phapBao.owned) + '|' + lastChar(cr3).phapBao.equipped;
    ok('chân 6d: sau restart — payload pháp bảo còn nguyên', crStateBoot2 === JSON.stringify(fileBoot1.phapBao.owned) + '|' + fileBoot1.phapBao.equipped, 'sau=' + crStateBoot2);
    cr3.socket.disconnect();
    await stopServer();
    console.log(`\n==== PB385: ${pass} PASS / ${fail} FAIL ====`);
    process.exit(fail ? 1 : 0);
  } catch (e) {
    console.log('PROBE-ERR', e && e.stack || e);
    try { await stopServer(); } catch (e2) {}
    process.exit(2);
  }
})();
