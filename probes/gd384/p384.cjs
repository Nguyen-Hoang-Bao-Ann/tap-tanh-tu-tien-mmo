// Probe Nhóm A (11/11/2026) — 44 vật phẩm mới (DE_XUAT_VAT_PHAM, Bảo duyệt cả nhóm A).
// Chân kiểm (boot 1, port 3841):
//  0) Tĩnh: ITEM_INFO client đủ 171/171 id ITEMS server; ITEMS = 171 (127 cũ + 44 mới).
//  1) Tiệm (nguồn mua): mua dan_hon_don_luc (300.000 Hạ = 30 Thượng quy đổi GĐ367) + dan_ho_kiep (600.000) ở tiem_dan; bán hon_tinh +600.
//  2) Chế (nguồn chế): 8 công thức đại diện 5 nhóm (A1/A2-ĐK/A2-Tiên/A6/A3×2/A5×2) — chế tới thành công, output vào túi, nguyên liệu bị trừ.
//  3) Đan hồi 70%: hp/mp tăng đúng round(max×0,7).
//  4) Đan trần HP/MP: control dan_than_huyet (hp2 +800 — nhãn cũ) + hp4 +2.500 + hp5 +6.000 + hp6 +12.000; mp4/mp5/mp6 tương tự — đo maxHp/maxMp qua char_sync.
//  5) Thức ăn A5: 8 món — delta hp/mp đúng % bản thảo.
//  6) Đan buff công atk4/atk5/atk6: tỉ lệ sát thương đòn thường qua dmg_float ≈ ×2,1 / ×2,5 / ×3,0; buff hiện trong char_sync.buffs.
//  7) Phù sát thương A3: số trong notice == đúng số phẳng bản thảo (mục tiêu def 0) — 25.000/60.000/100.000/180.000.
//  8) Char Phản Hư trên phan_hu_nguyen: cắn đối chứng → Đan Giáp (phòng ×2,1) → Phù Hư Không Thuẫn (×0,2 raw) → Phù Định Hồn (quái đứng yên ≥3,5s) → farm vo_hinh_quy tìm Hồn Tinh rơi (A4).
//  9) A6: cổng kiếp dokiep1 (ph9 + trialReady loikiep) TỰ tiêu hao Đan Hộ Kiếp + notice; cổng tienmon (dk3 + tienPath thang) KHÔNG tiêu hao.
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
  while (Date.now() - t0 < 60000) { try { const r = await fetch(`http://127.0.0.1:${port}/api/status`); if (r.ok) { clearTimeout(killTimer); return; } } catch (e) {} await sleep(400); }
  throw new Error('server khong len');
}
async function stopServer() { if (!serverProc) return; const p = serverProc; serverProc = null; if (killTimer) { clearTimeout(killTimer); killTimer = null; } await new Promise((res) => { const t = setTimeout(() => { try { p.kill('SIGKILL'); } catch (e) {} res(); }, 4000); p.once('exit', () => { clearTimeout(t); res(); }); try { p.kill('SIGTERM'); } catch (e) { clearTimeout(t); res(); } }); const t0 = Date.now(); while (Date.now() - t0 < 10000 && !(await portFree(CUR_PORT))) await sleep(300); }
const LC1 = { elements: ['kim'], main: 'kim', count: 1, mutations: [] };
function BASE(token, name, extra) {
  return Object.assign({ token, name, classId: 'kiemtu', gender: 'nam', race: null, geo175: 1, realm: 'kd', tier: 1, x: 1565, y: 1011, mapId: 'lang_tan_thu', hp: 99999, mp: 9999, lifespan: 500, birthDay: -5660, ageStart: 16, stats: { khiHuyet: 500, vatCong: 300, vatPhong: 200, phapCong: 300, phapPhong: 200, tocDo: 60, minhMan: 100 }, statPoints: 0, freePoints: 0, tuVi: 99999, stones: 100000, stonesTrung: 0, stonesThuong: 0, stonesCuc: 0, inventory: {}, gearBag: {}, equipped: [], skills: [], job: null, job2: null, job3: null, linhCan: { ...LC1 }, affinity: {}, affV2: 1, bonds: {}, quests: {}, questsDone: {}, flags: {}, counters: {}, disciples: [], foundInvites: [], reformIn: [], sectTech: [], sectArts: [], sectArtsActive: [], mails: [], classRes: {}, food: 100, water: 100 }, extra || {});
}
let pass = 0, fail = 0;
function ok(name, cond, extra) { if (cond) { pass++; console.log('PASS | ' + name); } else { fail++; console.log('FAIL | ' + name + (extra ? ' | ' + extra : '')); } }
function connect(token) {
  const socket = io(`http://127.0.0.1:${CUR_PORT}`, { transports: ['websocket'] });
  const ctx = { socket, merger: createMerger(), state: null, welcome: null, syncs: [], errs: [], notices: [], floats: [], attacked: [], crafts: [], myName: null, myId: null };
  socket.on('connect', () => socket.emit('hello', { token }));
  socket.on('welcome', (w) => { ctx.welcome = w; ctx.myName = (w.character || {}).name; ctx.myId = w.id; });
  socket.on('char_sync', (s) => ctx.syncs.push(s));
  socket.on('interact_error', (e) => ctx.errs.push(e.message || ''));
  socket.on('notice', (n) => ctx.notices.push(n.text || ''));
  socket.on('dmg_float', (f) => { for (const e of (f.list || [])) ctx.floats.push(e); });
  socket.on('player_attacked', (e) => ctx.attacked.push(e));
  socket.on('craft_result', (r) => ctx.crafts.push(r));
  socket.on('server_tick', (t) => { const st = ctx.merger(t); if (st) ctx.state = st; });
  return ctx;
}
const lastChar = (c) => { for (let i = c.syncs.length - 1; i >= 0; i--) { if (c.syncs[i]) return c.syncs[i]; } return c.welcome ? c.welcome.character : null; };
const invOf = (c, id) => { const ch = lastChar(c); return (ch && ch.inventory && ch.inventory[id]) || 0; };
const meOf = (c) => { if (!c.state || !c.state.players) return null; return c.state.players.find((p) => p.name === c.myName) || null; };
const monsOf = (c) => (c.state && c.state.monsters) || [];
async function steerTo(c, x, y, tol, ms) {
  const t0 = Date.now();
  while (Date.now() - t0 < (ms || 30000)) { const me = meOf(c); if (!me) { await sleep(120); continue; } const dx = x - me.x, dy = y - me.y; const d = Math.hypot(dx, dy); if (d <= (tol || 45)) break; c.socket.emit('client_input', { vx: dx / d, vy: dy / d }); await sleep(110); }
  c.socket.emit('client_input', { vx: 0, vy: 0 });
}
const median = (a) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : 0; };

(async () => {
  try {
    // ---------- Chân 0: tĩnh ----------
    const cliSrc = fs.readFileSync(path.join(ROOT, 'client/src/main.ts'), 'utf8');
    const ci = cliSrc.indexOf('const ITEM_INFO');
    const block = cliSrc.slice(ci, cliSrc.indexOf('};', ci));
    const cliIds = new Set([...block.matchAll(/^\s{2}([a-z0-9_]+):\s*\{ name:/gm)].map((m) => m[1]));
    const srvSrc = fs.readFileSync(path.join(ROOT, 'server/index.js'), 'utf8');
    const ii = srvSrc.indexOf('const ITEMS = {');
    let depth = 0, j = srvSrc.indexOf('{', ii); const istart = j;
    for (; j < srvSrc.length; j++) { if (srvSrc[j] === '{') depth++; else if (srvSrc[j] === '}') { depth--; if (!depth) break; } }
    const ITEMS = eval('(' + srvSrc.slice(istart, j + 1) + ')');
    const itemIds = Object.keys(ITEMS);
    const missing = itemIds.filter((id) => !cliIds.has(id));
    ok('chân 0a: ITEMS server = 171 loại (127 cũ + 44 mới)', itemIds.length === 171, 'dem duoc ' + itemIds.length);
    ok('chân 0b: ITEM_INFO client đủ 171/171', missing.length === 0, 'thieu: ' + missing.join(','));

    // ---------- Fixtures ----------
    const SMALL = { khiHuyet: 100, vatCong: 50, vatPhong: 50, phapCong: 50, phapPhong: 50, tocDo: 50, minhMan: 100 };
    const chars = {};
    chars['pa384craft01'] = BASE('pa384craft01', 'PA384Che', {
      realm: 'dk', tier: 2, x: 2202, y: 1225, stones: 60000000,
      job: { jobId: 'dansu', crafts: 100000, master: 'npc_su1' },
      job2: { jobId: 'phusu', crafts: 100000, master: 'npc_su2' },
      job3: { jobId: 'thusu', crafts: 100000, master: 'npc_su3' },
      inventory: { hon_don_thach: 400, hu_khong_thao: 800, hu_khong_cot: 200, linh_thuy: 100, thanh_thao: 100, tien_thao: 120, kiep_van_thach: 400, kiep_tam_thao: 800, kiep_loi_tinh: 400, tam_ma_ket_tinh: 60, tinh_ha_thach: 400, tien_linh_chi: 300, phuong_vu: 40, ky_lan_giac: 40, long_lan: 40, thu_vuong_tinh_huyet: 40, giao_chau: 40, bang_vu: 40, dia_mach_tinh: 40, loan_vu: 40, hon_tinh: 20, da_quy: 60, thit_thu: 200 },
    });
    const ATKSTATS = { khiHuyet: 5000, vatCong: 600, vatPhong: 500, phapCong: 600, phapPhong: 500, tocDo: 50, minhMan: 50 };
    chars['pa384atk401'] = BASE('pa384atk401', 'PA384Cong4', { classId: 'phaptu', realm: 'na', stats: { ...ATKSTATS }, inventory: { dan_hon_don_luc: 2 } });
    chars['pa384atk501'] = BASE('pa384atk501', 'PA384Cong5', { classId: 'phaptu', realm: 'na', stats: { ...ATKSTATS }, inventory: { dan_kiep_luc: 2 } });
    chars['pa384atk601'] = BASE('pa384atk601', 'PA384Cong6', { classId: 'phaptu', realm: 'na', stats: { ...ATKSTATS }, inventory: { dan_tien_luc: 2 } });
    chars['pa384def001'] = BASE('pa384def001', 'PA384Phong', {
      realm: 'ph', tier: 1, mapId: 'phan_hu_nguyen', x: 1000, y: 1000,
      stats: { khiHuyet: 100000, vatCong: 300000, vatPhong: 200, phapCong: 300000, phapPhong: 200, tocDo: 80, minhMan: 100 },
      inventory: { dan_hon_don_giap: 2, phu_hu_khong_thuan: 2, phu_dinh_hon: 2 },
    });
    chars['pa384heal01'] = BASE('pa384heal01', 'PA384Hoi', { stats: { ...SMALL }, hp: 100, mp: 10, inventory: { dan_hon_don_hoi_xuan: 1, dan_hon_don_hoi_nguyen: 1 } });
    chars['pa384bhp001'] = BASE('pa384bhp001', 'PA384Tran', { stats: { ...SMALL }, hp: 100, mp: 10, inventory: { dan_than_huyet: 1, dan_hon_don_huyet: 1, dan_kiep_huyet: 1, dan_tien_huyet: 1, dan_hon_don_nguyen: 1, dan_kiep_nguyen: 1, dan_tien_nguyen: 1 } });
    const FOODS = [['pa384food01', 'PA384An1', 'canh_hu_khong'], ['pa384food02', 'PA384An2', 'thit_hon_don_nuong'], ['pa384food03', 'PA384An3', 'canh_kiep_tam'], ['pa384food04', 'PA384An4', 'banh_tinh_ha'], ['pa384food05', 'PA384An5', 'tiec_phuong_vu'], ['pa384food06', 'PA384An6', 'tra_tien_linh']];
    for (const [tk, nm, food] of FOODS) chars[tk] = BASE(tk, nm, { stats: { ...SMALL }, hp: 100, mp: 10, inventory: { [food]: 1 } });
    chars['pa384food07'] = BASE('pa384food07', 'PA384An7', { stats: { ...SMALL }, hp: 100, mp: 10, inventory: { sup_hon_tinh: 1, canh_giao_chau: 1 } });
    chars['pa384tal001'] = BASE('pa384tal001', 'PA384Phu', { classId: 'phaptu', realm: 'na', stats: { ...ATKSTATS }, inventory: { phu_hon_don_loi: 1, phu_kiep_loi: 1, phu_thien_kiep: 1, phu_tinh_ha: 1 } });
    chars['pa384kiep01'] = BASE('pa384kiep01', 'PA384Kiep', { realm: 'ph', tier: 9, tuVi: 9999999, trialReady: 'loikiep', inventory: { dan_ho_kiep: 2 } });
    chars['pa384tien01'] = BASE('pa384tien01', 'PA384Tien', { realm: 'dk', tier: 3, tuVi: 9999999, trialReady: 'tienmon', flags: { tienPath: 'thang' }, inventory: { dan_ho_kiep: 2 } });
    for (const f of ['characters.json', 'accounts.json', 'world.json', 'sessions.json']) { try { fs.unlinkSync(path.join(DIR, f)); } catch (e) {} }
    fs.writeFileSync(path.join(DIR, 'characters.json'), JSON.stringify(chars));
    fs.writeFileSync(path.join(DIR, 'accounts.json'), JSON.stringify({}));
    await startServer(3841, 'a');
    const C = {};
    for (const tk of Object.keys(chars)) C[tk] = connect(tk);
    const ready = await waitFor(() => Object.values(C).every((c) => c.welcome && lastChar(c)), 30000);
    ok('boot + 16 nhân vật vào được', !!ready);
    // ---------- Chân 8: char Phản Hư — cắn/giáp/khiên/định hồn/farm ----------
    {
      const c = C['pa384def001'];
      const hpNow = () => { const me = meOf(c); return me ? me.hp : null; };
      async function nextBite(bandLo, bandHi, ms) {
        let prev = hpNow(); const t0 = Date.now();
        while (Date.now() - t0 < ms) {
          await sleep(150);
          const h = hpNow(); if (h == null || prev == null) { prev = h; continue; }
          if (h < prev) { const d = prev - h; prev = h; if (d >= bandLo && d <= bandHi) return d; }
          else prev = h;
        }
        return null;
      }
      // tới gần 1 vo_hinh_quy đơn độc
      const findQui = () => { const me = meOf(c); if (!me) return null; const ms = monsOf(c).filter((m) => m.kind === 'vo_hinh_quy' && m.hp > 0); if (!ms.length) return null; ms.sort((a, b) => Math.hypot(a.x - me.x, a.y - me.y) - Math.hypot(b.x - me.x, b.y - me.y)); return ms[0]; };
      let q = await waitFor(() => findQui(), 20000);
      ok('chân 8a: char vào được map phan_hu_nguyen, thấy vo_hinh_quy', !!q, 'state=' + (c.state ? 'co' : 'khong'));
      if (q) { await steerTo(c, q.x, q.y, 45, 20000); }
      const D0 = await nextBite(150, 650, 70000);
      ok('chân 8b: đo được cú cắn đối chứng của quái Phản Hư (phòng 200)', D0 != null, 'D0=' + D0);
      c.socket.emit('use_item', { itemId: 'dan_hon_don_giap' });
      await sleep(800);
      const chB = lastChar(c);
      ok('chân 8c: Hỗn Độn Giáp Đan cho buff def4', (chB.buffs || []).some((x) => x.key === 'def4'), (chB.buffs || []).map((x) => x.key).join(','));
      const D1 = await nextBite(50, 500, 70000);
      ok('chân 8d: cắn sau Đan Giáp giảm còn ~×0,58 (phòng 200→420)', D1 != null && D0 && D1 <= D0 * 0.9 && D1 >= D0 * 0.3, `D0=${D0} D1=${D1} ti le=${D0 ? (D1 / D0).toFixed(3) : '?'}`);
      c.socket.emit('use_item', { itemId: 'phu_hu_khong_thuan' });
      await sleep(800);
      const chS = lastChar(c);
      ok('chân 8e: Phù Hư Không Thuẫn cho buff taldef3', (chS.buffs || []).some((x) => x.key === 'taldef3'), (chS.buffs || []).map((x) => x.key).join(','));
      const D2 = await nextBite(1, 300, 70000);
      ok('chân 8f: cắn khi có Hư Không Thuẫn giảm còn ~×0,2 so với khi không khiên', D2 != null && D1 && D2 <= D1 * 0.42, `D1=${D1} D2=${D2} ti le=${D1 ? (D2 / D1).toFixed(3) : '?'}`);
      // Định Hồn: tìm quái đang tiến tới
      let rootOk = false, rootInfo = '';
      for (let attempt = 0; attempt < 2 && !rootOk; attempt++) {
        const q2 = findQui(); const me = meOf(c);
        if (!q2 || !me) break;
        await steerTo(c, q2.x, q2.y, 240, 15000);
        let moved = 0; let lastPos = null;
        for (let i = 0; i < 6; i++) { const cur = monsOf(c).find((m) => m.id === q2.id); if (!cur) break; if (lastPos) moved = Math.max(moved, Math.hypot(cur.x - lastPos.x, cur.y - lastPos.y)); lastPos = { x: cur.x, y: cur.y }; await sleep(220); }
        const cur2 = monsOf(c).find((m) => m.id === q2.id);
        if (!cur2) { rootInfo = 'quai bien mat'; continue; }
        const distC = Math.hypot(cur2.x - me.x, cur2.y - me.y);
        rootInfo = `moved=${moved.toFixed(0)} dist=${distC.toFixed(0)}`;
        if (distC > 420) { rootInfo += ' (xa hon tam phu)'; continue; }
        c.socket.emit('use_item', { itemId: 'phu_dinh_hon' });
        await sleep(300);
        const p0 = (() => { const t = monsOf(c).find((m) => m.id === q2.id); return t ? { x: t.x, y: t.y } : null; })();
        if (!p0) { rootInfo += ' mat muc tieu sau khi dung'; continue; }
        let maxDisp = 0;
        for (let i = 0; i < 10; i++) { await sleep(350); const t = monsOf(c).find((m) => m.id === q2.id); if (!t) { maxDisp = -1; break; } maxDisp = Math.max(maxDisp, Math.hypot(t.x - p0.x, t.y - p0.y)); }
        rootOk = maxDisp >= 0 && maxDisp <= 8;
        rootInfo += ` dispSauDung=${maxDisp}`;
      }
      ok('chân 8g: Phù Định Hồn — quái đứng yên 8s (lệch vị trí ≤8px trong 3,5s sau khi dùng)', rootOk, rootInfo);
      // Farm Hồn Tinh
      const A4 = new Set(['hon_tinh', 'hu_khong_cot', 'kiep_loi_tinh', 'tam_ma_ket_tinh', 'giao_chau', 'phuong_vu', 'ky_lan_giac', 'long_lan', 'bang_vu', 'loan_vu', 'thu_vuong_tinh_huyet', 'dia_mach_tinh']);
      const seenDrops = new Map();
      let kills = 0;
      const farmT0 = Date.now();
      while (kills < 60 && Date.now() - farmT0 < 360000) {
        const me = meOf(c); if (!me) { await sleep(400); continue; }
        if (me.hp <= 0) break;
        for (const d of ((c.state && c.state.drops) || [])) if (A4.has(d.itemId)) seenDrops.set(d.id, d.itemId);
        const t = findQui(); if (!t) { await sleep(800); continue; }
        await steerTo(c, t.x, t.y, 45, 12000);
        const tId = t.id; const k0 = Date.now();
        while (Date.now() - k0 < 9000) {
          const cur = monsOf(c).find((m) => m.id === tId);
          if (!cur) { kills++; break; }
          if (cur.hp <= 0) { kills++; break; }
          c.socket.emit('player_attack');
          await sleep(700);
          for (const d of ((c.state && c.state.drops) || [])) if (A4.has(d.itemId)) seenDrops.set(d.id, d.itemId);
        }
      }
      for (const d of ((c.state && c.state.drops) || [])) if (A4.has(d.itemId)) seenDrops.set(d.id, d.itemId);
      await steerTo(c, meOf(c) ? meOf(c).x : 0, meOf(c) ? meOf(c).y : 0, 10, 1000).catch(() => {});
      c.socket.emit('craft_item', { recipeId: 'rc_khong_ton_tai' }); // ép char_sync để đọc túi
      await sleep(900);
      const honTinhInv = invOf(c, 'hon_tinh');
      const honDrops = [...seenDrops.values()].filter((v) => v === 'hon_tinh').length;
      const allA4 = [...seenDrops.values()];
      ok(`chân 8h (A4): vo_hinh_quy rơi Hồn Tinh thật (hạ ${kills} con)`, kills >= 20 && (honDrops >= 1 || honTinhInv >= 1), `kills=${kills} honTinhRoiThay=${honDrops} honTinhTrongTui=${honTinhInv} cacDropA4=${JSON.stringify(allA4)}`);
    }


    // ---------- Chân 1: tiệm ----------
    {
      const a = C['pa384craft01'];
      const st0 = lastChar(a).stones;
      a.socket.emit('shop_buy', { shopId: 'tiem_dan', itemId: 'dan_hon_don_luc' });
      await waitFor(() => invOf(a, 'dan_hon_don_luc') >= 1, 6000);
      const st1 = lastChar(a).stones;
      ok('chân 1a: mua Hỗn Độn Lực Đan ở Tiệm Đan — vào túi, trừ đúng 300.000 Hạ (= 30 Thượng × 10.000)', invOf(a, 'dan_hon_don_luc') === 1 && st0 - st1 === 300000, `inv=${invOf(a, 'dan_hon_don_luc')} tru=${st0 - st1} loi=${a.errs.join(';')}`);
      a.socket.emit('shop_buy', { shopId: 'tiem_dan', itemId: 'dan_ho_kiep' });
      await waitFor(() => invOf(a, 'dan_ho_kiep') >= 1, 6000);
      const st2 = lastChar(a).stones;
      ok('chân 1b: mua Đan Hộ Kiếp — trừ đúng 600.000 Hạ (= 60 Thượng)', invOf(a, 'dan_ho_kiep') === 1 && st1 - st2 === 600000, `inv=${invOf(a, 'dan_ho_kiep')} tru=${st1 - st2}`);
      await steerTo(a, 876, 834, 60, 30000); // điểm Tiệm Nguyên Liệu sau scale hs175 (392,373)×√5 ≈ (876,834)
      const stB = lastChar(a).stones; const htB = invOf(a, 'hon_tinh');
      a.socket.emit('shop_sell', { shopId: 'tiem_nguyen_lieu', itemId: 'hon_tinh' });
      await waitFor(() => invOf(a, 'hon_tinh') < htB, 5000);
      const stA = lastChar(a).stones;
      ok('chân 1c: bán Hồn Tinh (A4) ở Tiệm Nguyên Liệu — tiệm thu mua đúng 600 Hạ', invOf(a, 'hon_tinh') === htB - 1 && stA - stB === 600, `hon_tinh ${htB}->${invOf(a, 'hon_tinh')} stones +${stA - stB} errs=${a.errs.slice(-2).join(';')}`);
    }

    // ---------- Chân 2: chế tạo ----------
    {
      const a = C['pa384craft01'];
      const tryCraft = async (recipeId, outId) => {
        const before = invOf(a, outId);
        for (let i = 0; i < 60; i++) {
          const n0 = a.crafts.length; const e0 = a.errs.length;
          a.socket.emit('craft_item', { recipeId });
          const r = await waitFor(() => (a.crafts.length > n0 && a.crafts[a.crafts.length - 1]) || (a.errs.length > e0 && /Thiếu|Không đủ/.test(a.errs[a.errs.length - 1]) ? 'HET' : null), 4000);
          if (!r || r === 'HET') return false;
          if (r.ok) return invOf(a, outId) > before;
          await sleep(120);
        }
        return false;
      };
      const hd0 = invOf(a, 'hon_don_thach');
      ok('chân 2a (A1): chế Hỗn Độn Lực Đan từ Hỗn Độn Thạch + Hư Không Thảo', await tryCraft('rc_dan_hon_don_luc', 'dan_hon_don_luc'), 'errs=' + a.errs.slice(-2).join(';'));
      ok('chân 2a2: nguyên liệu Hỗn Độn Thạch bị trừ khi chế', invOf(a, 'hon_don_thach') < hd0, `truoc=${hd0} sau=${invOf(a, 'hon_don_thach')}`);
      ok('chân 2b (A2-ĐK): chế Kiếp Giáp Đan', await tryCraft('rc_dan_kiep_giap', 'dan_kiep_giap'));
      ok('chân 2c (A2-Tiên): chế Tiên Nguyên Đan (ăn Giao Châu)', await tryCraft('rc_dan_tien_nguyen', 'dan_tien_nguyen'));
      ok('chân 2d (A6): chế Đan Hộ Kiếp (Kiếp Tâm Thảo ×6 + Hỗn Độn Thạch ×2)', await tryCraft('rc_dan_ho_kiep', 'dan_ho_kiep'));
      ok('chân 2e (A3): chế Phù Hỗn Độn Lôi', await tryCraft('rc_phu_hon_don_loi', 'phu_hon_don_loi'));
      ok('chân 2f (A3): chế Phù Thiên Kiếp (tỉ lệ thấp 0,35)', await tryCraft('rc_phu_thien_kiep', 'phu_thien_kiep'));
      ok('chân 2g (A5): nấu Canh Hư Không (Hư Không Thảo + Thịt Thú)', await tryCraft('rc_canh_hu_khong', 'canh_hu_khong'));
      ok('chân 2h (A5): nấu Tiệc Phượng Vũ (Phượng Vũ + Tiên Linh Chi)', await tryCraft('rc_tiec_phuong_vu', 'tiec_phuong_vu'));
    }

    // ---------- Chân 3: đan hồi 70% ----------
    {
      const h = C['pa384heal01'];
      const c0 = lastChar(h);
      ok('chân 3a: fixture máu thấp còn nguyên khi vào (hp=100/1100)', c0.hp === 100 && c0.maxHp === 1100, `hp=${c0.hp} maxHp=${c0.maxHp}`);
      h.socket.emit('use_item', { itemId: 'dan_hon_don_hoi_xuan' });
      const s1 = await waitFor(() => { const ch = lastChar(h); return ch && ch.hp > 100 ? ch : null; }, 5000);
      ok('chân 3b: Hỗn Độn Hồi Xuân Đan hồi đúng 70% HP (100 → 870)', s1 && s1.hp === 870, `hp=${s1 && s1.hp}`);
      const M = c0.maxMp;
      h.socket.emit('use_item', { itemId: 'dan_hon_don_hoi_nguyen' });
      const s2 = await waitFor(() => { const ch = lastChar(h); return ch && ch.mp > 10 ? ch : null; }, 5000);
      ok('chân 3c: Hỗn Độn Hồi Nguyên Đan hồi đúng 70% Chân nguyên', s2 && s2.mp === Math.min(M, 10 + Math.round(M * 0.7)), `mp=${s2 && s2.mp} maxMp=${M}`);
    }

    // ---------- Chân 4: đan trần HP/MP (control hp2 + bậc 4/5/6) ----------
    {
      const b = C['pa384bhp001'];
      const c0 = lastChar(b);
      const base = c0.maxHp, baseM = c0.maxMp;
      const step = async (item, expectHp, expectMp, label) => {
        b.socket.emit('use_item', { itemId: item });
        const s = await waitFor(() => { const ch = lastChar(b); return ch && (ch.maxHp !== (expectHp.prev ?? ch.maxHp) || true) ? ch : null; }, 800);
        await sleep(500);
        const ch = lastChar(b);
        ok(label, ch.maxHp - base === expectHp && ch.maxMp - baseM === expectMp, `maxHp=${ch.maxHp} (base ${base}, +${ch.maxHp - base}) maxMp=${ch.maxMp} (base ${baseM}, +${ch.maxMp - baseM}) buffs=${(ch.buffs || []).map((x) => x.key).join(',')}`);
      };
      await step('dan_than_huyet', 800, 0, 'chân 4a (CONTROL món cũ): Thần Huyết Đan cho đúng +800 maxHp như nhãn (hp2)');
      await step('dan_hon_don_huyet', 3300, 0, 'chân 4b (A1): + Hỗn Độn Huyết Đan → tổng +3.300 (thêm +2.500)');
      await step('dan_kiep_huyet', 9300, 0, 'chân 4c (A2): + Kiếp Huyết Đan → tổng +9.300 (thêm +6.000)');
      await step('dan_tien_huyet', 21300, 0, 'chân 4d (A2): + Tiên Huyết Đan → tổng +21.300 (thêm +12.000)');
      await step('dan_hon_don_nguyen', 21300, 2500, 'chân 4e (A1): Hỗn Độn Nguyên Đan +2.500 maxMp');
      await step('dan_kiep_nguyen', 21300, 8500, 'chân 4f (A2): Kiếp Nguyên Đan → tổng +8.500 maxMp');
      await step('dan_tien_nguyen', 21300, 20500, 'chân 4g (A2): Tiên Nguyên Đan → tổng +20.500 maxMp');
    }

    // ---------- Chân 5: thức ăn A5 ----------
    {
      const FOOD_SPEC = { canh_hu_khong: [0.4, 0], thit_hon_don_nuong: [0.45, 0], canh_kiep_tam: [0.55, 0], banh_tinh_ha: [0.65, 0], tiec_phuong_vu: [0.8, 0], tra_tien_linh: [0.35, 0.35] };
      for (const [tk, , food] of FOODS) {
        const c = C[tk]; const c0 = lastChar(c); const [ph, pm] = FOOD_SPEC[food];
        c.socket.emit('use_item', { itemId: food });
        await sleep(700);
        const ch = lastChar(c);
        const eHp = Math.min(c0.maxHp, 100 + Math.round(c0.maxHp * ph));
        const eMp = Math.min(c0.maxMp, 10 + Math.round(c0.maxMp * pm));
        ok(`chân 5: ${food} hồi đúng ${Math.round(ph * 100)}% HP${pm ? ' + ' + Math.round(pm * 100) + '% MP' : ''}`, ch.hp === eHp && ch.mp === eMp, `hp=${ch.hp}/${eHp} mp=${ch.mp}/${eMp} errs=${c.errs.join(';')}`);
      }
      const c7 = C['pa384food07']; const c70 = lastChar(c7);
      c7.socket.emit('use_item', { itemId: 'sup_hon_tinh' });
      await sleep(700);
      const m1 = lastChar(c7).mp;
      ok('chân 5: Súp Hồn Tinh hồi đúng 30% Chân nguyên', m1 === Math.min(c70.maxMp, 10 + Math.round(c70.maxMp * 0.3)), `mp=${m1} maxMp=${c70.maxMp}`);
      c7.socket.emit('use_item', { itemId: 'canh_giao_chau' });
      await sleep(700);
      const m2 = lastChar(c7).mp;
      ok('chân 5: Canh Giao Châu hồi đúng 50% Chân nguyên', m2 === Math.min(c70.maxMp, m1 + Math.round(c70.maxMp * 0.5)), `mp=${m2}`);
    }

    // ---------- Chân 6: đan buff công (dmg_float, mục tiêu def 0) ----------
    async function atkMedian(c, hits) {
      const vals = [];
      let guard = 0;
      while (vals.length < hits && guard++ < 40) {
        const me = meOf(c); if (!me) { await sleep(300); continue; }
        const ms = monsOf(c).filter((m) => (m.kind === 'wolf' || m.kind === 'bat') && m.hp > 0);
        if (!ms.length) { await sleep(600); continue; }
        ms.sort((a, b) => Math.hypot(a.x - me.x, a.y - me.y) - Math.hypot(b.x - me.x, b.y - me.y));
        const t = ms[0];
        await steerTo(c, t.x, t.y, 90, 9000);
        const f0 = c.floats.length; const a0 = c.attacked.length;
        c.socket.emit('player_attack');
        const atkEv = await waitFor(() => c.attacked.slice(a0).find((e) => e.id === c.myId), 2500);
        if (!atkEv) { await sleep(300); continue; }
        const fl = await waitFor(() => c.floats.slice(f0).find((e) => e.id === atkEv.targetId && e.t === 'm'), 2500);
        if (fl) vals.push(fl.dmg);
        await sleep(300);
      }
      return vals;
    }
    for (const [tk, pill, key, mul] of [['pa384atk401', 'dan_hon_don_luc', 'atk4', 2.1], ['pa384atk501', 'dan_kiep_luc', 'atk5', 2.5], ['pa384atk601', 'dan_tien_luc', 'atk6', 3.0]]) {
      const c = C[tk];
      const pre = await atkMedian(c, 5);
      const d0 = median(pre);
      c.socket.emit('use_item', { itemId: pill });
      await sleep(800);
      const ch = lastChar(c);
      const hasBuff = (ch.buffs || []).some((x) => x.key === key);
      const post = await atkMedian(c, 5);
      const d1 = median(post);
      const ratio = d0 > 0 ? d1 / d0 : 0;
      ok(`chân 6: ${pill} (${key}) — buff hiện + sát thương ×${mul} kỳ vọng`, hasBuff && ratio >= mul - 0.2 && ratio <= mul + 0.2, `pre=${pre.join('/')} post=${post.join('/')} ti le=${ratio.toFixed(3)} buff=${hasBuff}`);
    }

    // ---------- Chân 7: phù sát thương phẳng ----------
    {
      const c = C['pa384tal001'];
      for (const [item, spec] of [['phu_hon_don_loi', 25000], ['phu_kiep_loi', 60000], ['phu_thien_kiep', 100000], ['phu_tinh_ha', 180000]]) {
        let done = false;
        for (let attempt = 0; attempt < 16 && !done; attempt++) {
          const me = meOf(c); if (!me) { await sleep(400); continue; }
          const ms = monsOf(c).filter((m) => m.hp > 0);
          ms.sort((a, b) => Math.hypot(a.x - me.x, a.y - me.y) - Math.hypot(b.x - me.x, b.y - me.y));
          const near = ms[0];
          if (!near) { await sleep(600); continue; }
          // chỉ bắn khi quái GẦN NHẤT là sói/dơi (def 0 — số phẳng đọc nguyên vẹn; golem có def riêng theo đường vật lý nên tránh)
          if (near.kind !== 'wolf' && near.kind !== 'bat') {
            const wb = ms.find((m) => m.kind === 'wolf' || m.kind === 'bat');
            if (wb) await steerTo(c, wb.x, wb.y, 90, 9000); else await sleep(600);
            continue;
          }
          if (Math.hypot(near.x - me.x, near.y - me.y) > 200) { await steerTo(c, near.x, near.y, 90, 9000); continue; }
          const n0 = c.notices.length;
          c.socket.emit('use_item', { itemId: item });
          const nt = await waitFor(() => c.notices.slice(n0).find((t) => t.includes(ITEMS[item].name)), 4000);
          if (!nt) { await sleep(400); continue; }
          const m = nt.match(/-(\d+) máu/);
          const dmg = m ? parseInt(m[1], 10) : -1;
          const expected = spec; // mục tiêu sói/dơi def 0 → số phẳng nguyên vẹn như Phù Thiên Lôi
          ok(`chân 7: ${item} đánh đúng ${spec} sát thương phẳng (mục tiêu ${near.kind})`, dmg === expected, `notice="${nt}" dmg=${dmg} ky vong=${expected}`);
          done = true;
        }
        if (!done) ok(`chân 7: ${item} đánh đúng ${spec} sát thương phẳng`, false, 'khong dung duoc phu (het luot thu)');
      }
    }

    // ---------- Chân 9: Đan Hộ Kiếp ----------
    {
      const g = C['pa384kiep01'];
      const n0 = g.notices.length;
      g.socket.emit('breakthrough');
      const nt = await waitFor(() => g.notices.slice(n0).find((t) => t.includes('Đan Hộ Kiếp')), 9000);
      g.socket.emit('craft_item', { recipeId: 'rc_khong_ton_tai' });
      await sleep(900);
      ok('chân 9a (A6): qua Cổng Kiếp dokiep1 — Đan Hộ Kiếp tự tiêu hao + có notice +15%', !!nt && invOf(g, 'dan_ho_kiep') === 1, `notice=${nt || '(khong)'} conLai=${invOf(g, 'dan_ho_kiep')} errs=${g.errs.slice(-2).join(';')}`);
      const h = C['pa384tien01'];
      const m0 = h.notices.length;
      h.socket.emit('breakthrough');
      await sleep(3500);
      h.socket.emit('craft_item', { recipeId: 'rc_khong_ton_tai' });
      await sleep(900);
      const used = h.notices.slice(m0).some((t) => t.includes('Đan Hộ Kiếp'));
      ok('chân 9b (A6): cổng TIÊN MÔN không tiêu hao Đan Hộ Kiếp (chỉ áp dokiep1/2/3)', !used && invOf(h, 'dan_ho_kiep') === 2, `dung=${used} conLai=${invOf(h, 'dan_ho_kiep')} errs=${h.errs.slice(-2).join(';')}`);
    }

    console.log(`\nTONG KET PROBE NHOM A: PASS=${pass} FAIL=${fail}`);
    for (const c of Object.values(C)) { try { c.socket.disconnect(); } catch (e) {} }
    await stopServer();
    process.exit(fail ? 1 : 0);
  } catch (e) {
    console.log('PROBE LOI:', e && e.stack || e);
    console.log(`\nTONG KET PROBE NHOM A (dung giua chung): PASS=${pass} FAIL=${fail}`);
    try { await stopServer(); } catch (e2) {}
    process.exit(2);
  }
})();
