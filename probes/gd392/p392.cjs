// Probe GĐ392 (B5) — 3 phù % máu: Thiên Hư Phù (PH) / Kiếp Vân Phù (ĐK) / Vãng Tiên Phù (Tiên).
// Chân kiểm (boot 1, port 3921):
//  0) Tĩnh: ITEMS server = 180 (177 + 3); ITEM_INFO client + RECIPE_INFO client đủ 3 id mới;
//     RECIPES server đủ 3 rc_; icon PNG 3 món tồn tại (96x96); công thức trần (node): min(round(1.196.000*0,4),360.000)=360.000.
//  1) Boot: /api/status = 4.579 quái.
//  2) Chế: 3 công thức Phù Sư (minRank 12/13/14) — chế tới thành công, output vào túi.
//  3) Farm (sói def 0, maxHp 40): % đúng round(40*0,4)=16; dùng phù % thứ 2 ngay → chặn hồi chiêu chung
//     (interact_error + túi không trừ); phù phẳng vẫn dùng được trong lúc hồi chiêu (25.000);
//     chờ 31s → phù % thứ 2 dùng được, đúng 16.
//  4) Phản Hư (phan_hu_nguyen, Hỗn Độn Phượng base 77.767, rewardClass boss → def 30 theo bảng giáp theo cảnh
//     GĐ233): % đúng damageThrough(round(maxHp*0,4), 30) qua notice + diff HP tick — trên cá thể base:
//     % raw 31.107 → 23.928; crossover: phẳng raw 25.000 → 19.231 < % 23.928 trên cùng cá thể;
//     phù % thứ 2 dùng ngay → chặn hồi chiêu chung; chờ 31s → Vãng Tiên Phù dùng được, đúng 40%.
//     CHỈ test crossover trên cá thể maxHp > 62.500 (nhánh Non 54.437 nằm DƯỚI crossover — % thua phẳng là đúng).
//  5) Đếm: icon chiêu 1.444; FX 85 file; marker ttt_intro_v1 còn trong dist (nếu dist có).
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
async function stopServer() { if (!serverProc) return; const p = serverProc; serverProc = null; if (killTimer) { clearTimeout(killTimer); killTimer = null; } await new Promise((res) => { const t = setTimeout(() => { try { p.kill('SIGKILL'); } catch (e) {} res(); }, 4000); p.once('exit', () => { clearTimeout(t); res(); }); try { p.kill('SIGTERM'); } catch (e) {} }); const t0 = Date.now(); while (Date.now() - t0 < 10000 && !(await portFree(CUR_PORT))) await sleep(300); }
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
// Dùng 1 phù lên quái gần nhất, trả {dmg (notice), drop (diff HP tick), targetKind, maxHp} hoặc null.
async function useTalismanOnNearest(c, itemId, ms) {
  const before = new Map(monsOf(c).map((m) => [m.id, { hp: m.hp, maxHp: m.maxHp, kind: m.kind }]));
  const n0 = c.notices.length;
  c.socket.emit('use_item', { itemId });
  const nt = await waitFor(() => c.notices.slice(n0).find((t) => t.includes('máu lên quái gần nhất')), ms || 6000);
  if (!nt) return null;
  const m = nt.match(/-(\d+) máu/);
  const dmg = m ? parseInt(m[1], 10) : -1;
  await sleep(1200);
  let drop = null, targetKind = null, maxHp = null;
  for (const mo of monsOf(c)) {
    const b = before.get(mo.id);
    if (b && mo.hp < b.hp) { drop = b.hp - mo.hp; targetKind = b.kind; maxHp = b.maxHp; break; }
  }
  return { dmg, drop, targetKind, maxHp, notice: nt };
}

(async () => {
  try {
    // ---------- Chân 0: tĩnh ----------
    const srvSrc = fs.readFileSync(path.join(ROOT, 'server/index.js'), 'utf8');
    const cliSrc = fs.readFileSync(path.join(ROOT, 'client/src/main.ts'), 'utf8');
    const itemsBlock = srvSrc.slice(srvSrc.indexOf('const ITEMS'), srvSrc.indexOf('const JOBS')); // JOBS/TALENTS nằm giữa ITEMS và RECIPES — cắt ở JOBS mới đúng
    const itemIds = [...itemsBlock.matchAll(/^  ([a-z0-9_]+): \{ name:/gm)].map((m) => m[1]);
    ok('chân 0a: ITEMS server = 180 (177 + 3 phù %)', itemIds.length === 180, 'dem=' + itemIds.length);
    const NEW3 = ['phu_huyet_hon_don', 'phu_kiep_huyet', 'phu_diet_than_huyet'];
    ok('chân 0b: 3 phù % có trong ITEMS server', NEW3.every((id) => itemIds.includes(id)));
    const ci = cliSrc.indexOf('const ITEM_INFO');
    const ciBlock = cliSrc.slice(ci, cliSrc.indexOf('};', ci));
    ok('chân 0c: 3 phù % có trong ITEM_INFO client', NEW3.every((id) => ciBlock.includes(id + ':')));
    const rcSrv = [...srvSrc.matchAll(/rc_phu_(huyet_hon_don|kiep_huyet|diet_than_huyet)/g)].map((m) => m[0]);
    ok('chân 0d: 3 công thức rc_ phù % có trong RECIPES server', rcSrv.length === 3, 'tim=' + rcSrv.join(','));
    const ri = cliSrc.indexOf('const RECIPE_INFO');
    const riBlock = cliSrc.slice(ri, cliSrc.indexOf('};', ri));
    ok('chân 0e: 3 công thức phù % có trong RECIPE_INFO client', NEW3.every((id) => riBlock.includes('rc_' + id)));
    ok('chân 0f: icon PNG 3 phù % tồn tại (96x96)', NEW3.every((id) => fs.existsSync(path.join(ROOT, 'client/public/sprites/items', id + '.png'))));
    ok('chân 0g: trần % (kiểm công thức): min(1.196.000*0,4; 360.000)=360.000; min(183.000*0,4; 50.000)=50.000',
      Math.min(Math.round(1196000 * 0.4), 360000) === 360000 && Math.min(Math.round(183000 * 0.4), 50000) === 50000);
    const skSrc = fs.readFileSync(path.join(ROOT, 'client/src/skill_icons.ts'), 'utf8');
    const pngIds = (skSrc.match(/"([a-z0-9_-]+)": 1,/g) || []).length; // gồm 9 lh_xxx có gạch nối (lh_cot-tu...)
    ok('chân 0h: icon chiêu 1.444', pngIds === 1444, 'dem=' + pngIds);
    ok('chân 0i: FX 85 file', fs.readdirSync(path.join(ROOT, 'client/public/sprites/fx')).length === 85);

    // ---------- Fixtures ----------
    const chars = {};
    chars['pa392craft01'] = BASE('pa392craft01', 'PA392Che', {
      realm: 'dk', tier: 2, x: 2202, y: 1225, stones: 60000000,
      job: { jobId: 'dansu', crafts: 100000, master: 'npc_su1' },
      job2: { jobId: 'phusu', crafts: 100000, master: 'npc_su2' },
      job3: { jobId: 'thusu', crafts: 100000, master: 'npc_su3' },
      inventory: { hon_don_thach: 40, hon_tinh: 40, hu_khong_thao: 40, kiep_loi_tinh: 40, tam_ma_ket_tinh: 40, kiep_van_thach: 40, loan_vu: 40, tinh_ha_thach: 40, phuong_vu: 40 },
    });
    const ATKSTATS = { khiHuyet: 5000, vatCong: 600, vatPhong: 500, phapCong: 600, phapPhong: 500, tocDo: 50, minhMan: 50 };
    chars['pa392farm001'] = BASE('pa392farm001', 'PA392Farm', { classId: 'phaptu', realm: 'na', stats: { ...ATKSTATS }, inventory: { phu_huyet_hon_don: 2, phu_kiep_huyet: 1, phu_hon_don_loi: 1 } });
    chars['pa392ph00001'] = BASE('pa392ph00001', 'PA392PH', {
      realm: 'ph', tier: 1, mapId: 'phan_hu_nguyen', x: 1000, y: 1000,
      stats: { khiHuyet: 100000, vatCong: 300000, vatPhong: 200, phapCong: 300000, phapPhong: 200, tocDo: 80, minhMan: 100 },
      inventory: { phu_huyet_hon_don: 1, phu_diet_than_huyet: 1, phu_hon_don_loi: 2 },
    });
    for (const f of ['characters.json', 'accounts.json', 'world.json', 'sessions.json']) { try { fs.unlinkSync(path.join(DIR, f)); } catch (e) {} }
    fs.writeFileSync(path.join(DIR, 'characters.json'), JSON.stringify(chars));
    fs.writeFileSync(path.join(DIR, 'accounts.json'), JSON.stringify({}));
    await startServer(3921, 'a');
    const st = await fetch(`http://127.0.0.1:${CUR_PORT}/api/status`).then((r) => r.json());
    ok('chân 1: boot 4.579 quái', st.monsters === 4579, 'quai=' + st.monsters);
    const C = {};
    for (const tk of Object.keys(chars)) C[tk] = connect(tk);
    const ready = await waitFor(() => Object.values(C).every((c) => c.welcome && lastChar(c)), 30000);
    ok('boot + 3 nhân vật vào được', !!ready);

    // ---------- Chân 2: chế 3 công thức ----------
    {
      const a = C['pa392craft01'];
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
      ok('chân 2a: chế Thiên Hư Phù (Phù Sư bậc 12)', await tryCraft('rc_phu_huyet_hon_don', 'phu_huyet_hon_don'), 'errs=' + a.errs.slice(-2).join(';'));
      ok('chân 2b: chế Kiếp Vân Phù (Phù Sư bậc 13)', await tryCraft('rc_phu_kiep_huyet', 'phu_kiep_huyet'), 'errs=' + a.errs.slice(-2).join(';'));
      ok('chân 2c: chế Vãng Tiên Phù (Phù Sư bậc 14)', await tryCraft('rc_phu_diet_than_huyet', 'phu_diet_than_huyet'), 'errs=' + a.errs.slice(-2).join(';'));
    }

    // ---------- Chân 3: farm — sói def 0, maxHp 40 → % đúng 8 ----------
    let pctDmgWolf = null;
    {
      const c = C['pa392farm001'];
      // tới gần 1 sói
      const findWolf = () => { const me = meOf(c); if (!me) return null; const ms = monsOf(c).filter((m) => m.kind === 'wolf' && m.hp > 0); if (!ms.length) return null; ms.sort((a, b) => Math.hypot(a.x - me.x, a.y - me.y) - Math.hypot(b.x - me.x, b.y - me.y)); return ms[0]; };
      let w = await waitFor(() => findWolf(), 20000);
      ok('chân 3a: thấy sói ở bãi farm', !!w);
      if (w) await steerTo(c, w.x, w.y, 90, 15000);
      const r1 = await useTalismanOnNearest(c, 'phu_huyet_hon_don', 6000);
      pctDmgWolf = r1 ? r1.dmg : null;
      ok('chân 3b: Thiên Hư Phù đúng 40% máu sói (40 → 16)', r1 && r1.dmg === 16 && r1.drop === 16, JSON.stringify(r1));
      // dùng phù % thứ 2 ngay → phải chặn hồi chiêu chung, túi không trừ
      const invBefore = invOf(c, 'phu_kiep_huyet');
      const e0 = c.errs.length;
      c.socket.emit('use_item', { itemId: 'phu_kiep_huyet' });
      const blocked = await waitFor(() => c.errs.length > e0 && /hồi chiêu/.test(c.errs[c.errs.length - 1]), 4000);
      await sleep(800);
      ok('chân 3c: dùng phù % thứ 2 ngay bị chặn hồi chiêu chung, túi không trừ', !!blocked && invOf(c, 'phu_kiep_huyet') === invBefore, 'err=' + (c.errs[c.errs.length - 1] || '') + ' inv=' + invOf(c, 'phu_kiep_huyet'));
      // phù phẳng vẫn dùng được trong lúc hồi chiêu %
      const r2 = await useTalismanOnNearest(c, 'phu_hon_don_loi', 6000);
      ok('chân 3d: phù phẳng vẫn dùng được trong lúc hồi chiêu % (25.000)', r2 && r2.dmg === 25000, JSON.stringify(r2));
      // chờ hết 30s → phù % thứ 2 dùng được
      await sleep(31000);
      let w2 = await waitFor(() => findWolf(), 20000);
      if (w2) await steerTo(c, w2.x, w2.y, 90, 15000);
      const r3 = await useTalismanOnNearest(c, 'phu_kiep_huyet', 6000);
      // Sửa 12/11 (đổi tên): sói bãi farm KHÔNG cố định 40 máu (gặp sói 80 máu) — kỳ vọng phải tính từ maxHp thật như chân 4c, không hardcode 16.
      ok('chân 3e: hết 30s hồi chiêu → Kiếp Vân Phù dùng được, đúng 40% maxHp thật', r3 && r3.dmg === Math.round(r3.maxHp * 0.4), JSON.stringify(r3));
    }

    // ---------- Chân 4: Phản Hư — Hỗn Độn Phượng (base 77.767, boss → def 30) ----------
    // Thứ tự: phẳng TRƯỚC để suy def thật từ số đo (25000 → dmg), rồi % với kỳ vọng damageThrough(raw, def).
    // Chỉ test crossover trên cá thể maxHp > 62.500 (nhánh Non 54.437 nằm dưới crossover — % thua phẳng là đúng).
    {
      const c = C['pa392ph00001'];
      const dmgThrough = (raw, def) => Math.max(1, Math.round(raw * 100 / (100 + def)));
      const findPhuong = (minHp) => { const me = meOf(c); if (!me) return null; const ms = monsOf(c).filter((m) => m.kind === 'hon_don_phuong' && m.hp > 0 && m.maxHp > (minHp || 0)); if (!ms.length) return null; ms.sort((a, b) => Math.hypot(a.x - me.x, a.y - me.y) - Math.hypot(b.x - me.x, b.y - me.y)); return ms[0]; };
      let q = await waitFor(() => findPhuong(62500), 60000);
      ok('chân 4a: thấy Hỗn Độn Phượng maxHp > 62.500 ở phan_hu_nguyen', !!q, 'state=' + (c.state ? 'co' : 'khong'));
      if (q) {
        await steerTo(c, q.x, q.y, 90, 20000);
        // 4b: phẳng trước → suy def
        let flatDmg = null, def = null, targetId = null, targetMaxHp = null;
        for (let attempt = 0; attempt < 3 && flatDmg == null; attempt++) {
          const r = await useTalismanOnNearest(c, 'phu_hon_don_loi', 6000);
          if (r && r.targetKind === 'hon_don_phuong') { flatDmg = r.dmg; def = Math.round(25000 * 100 / flatDmg) - 100; targetMaxHp = r.maxHp; }
          else { const nq = findPhuong(62500); if (nq) await steerTo(c, nq.x, nq.y, 90, 15000); }
        }
        ok('chân 4b: phù phẳng lên Hỗn Độn Phượng → suy được def (kỳ vọng 30, boss PH)', def === 30, `flatDmg=${flatDmg} def=${def} maxHp=${targetMaxHp}`);
        // 4c: % trên cùng cá thể — kỳ vọng damageThrough(round(maxHp*0,4), def)
        let pctDmg = null;
        if (def != null) {
          let pq = findPhuong(62500);
          if (pq) await steerTo(c, pq.x, pq.y, 90, 20000);
          const r1 = await useTalismanOnNearest(c, 'phu_huyet_hon_don', 6000);
          const expected = r1 && r1.maxHp ? dmgThrough(Math.round(r1.maxHp * 0.4), def) : null;
          pctDmg = r1 ? r1.dmg : null;
          ok('chân 4c: Thiên Hư Phù đúng 40% máu tối đa (qua giáp)', r1 && r1.dmg === expected && r1.drop === expected, `dmg=${r1 && r1.dmg} kyVong=${expected} raw40%=${r1 && Math.round(r1.maxHp * 0.4)} maxHp=${r1 && r1.maxHp} def=${def}`);
          ok('chân 4d: crossover — phù % thắng phù phẳng trên cùng cá thể Hỗn Độn Phượng', pctDmg != null && flatDmg != null && pctDmg > flatDmg, `pct=${pctDmg} flat=${flatDmg} maxHp=${r1 && r1.maxHp}`);
        } else {
          ok('chân 4c: Thiên Hư Phù đúng 40% máu tối đa (qua giáp)', false, 'khong suy duoc def');
          ok('chân 4d: crossover — phù % thắng phù phẳng trên cùng cá thể Hỗn Độn Phượng', false, 'khong suy duoc def');
        }
        // 4e: dùng phù % thứ 2 ngay → chặn hồi chiêu chung
        const e0 = c.errs.length;
        c.socket.emit('use_item', { itemId: 'phu_diet_than_huyet' });
        const blocked = await waitFor(() => c.errs.length > e0 && /hồi chiêu/.test(c.errs[c.errs.length - 1]), 4000);
        ok('chân 4e: phù % thứ 2 trên Phản Hư bị chặn hồi chiêu chung', !!blocked, 'err=' + (c.errs[c.errs.length - 1] || ''));
        // 4f: chờ hết 30s → Vãng Tiên Phù dùng được, đúng 40% (qua giáp, cùng def đã suy).
        // Quái lang thang trong 31s chờ nên phải xác nhận TRƯỚC khi dùng: quái GẦN NHẤT đúng là phượng >62.500,
        // nếu không thì lái lại (dùng nhầm đích = mất phù mà đo sai — vòng trước dính quái nhỏ 3.613 máu).
        await sleep(31000);
        let locked = false;
        for (let attempt = 0; attempt < 5 && !locked; attempt++) {
          const q3 = await waitFor(() => findPhuong(62500), 20000);
          if (!q3) break;
          await steerTo(c, q3.x, q3.y, 60, 20000);
          await sleep(400);
          const me = meOf(c);
          if (!me) continue;
          const near = monsOf(c).filter((m) => m.hp > 0).map((m) => ({ m, d: Math.hypot(m.x - me.x, m.y - me.y) })).sort((a, b) => a.d - b.d);
          locked = near.length > 0 && near[0].m.id === q3.id && near[0].d < 200;
        }
        ok('chân 4f-a: khóa được phượng >62.500 làm quái gần nhất trước khi dùng', locked);
        const r3 = locked ? await useTalismanOnNearest(c, 'phu_diet_than_huyet', 6000) : null;
        const exp3 = r3 && r3.maxHp && def != null ? dmgThrough(Math.round(r3.maxHp * 0.4), def) : null;
        ok('chân 4f: hết hồi chiêu → Vãng Tiên Phù đúng 40% máu tối đa (qua giáp)', r3 && r3.targetKind === 'hon_don_phuong' && r3.dmg === exp3 && r3.drop === exp3, `dmg=${r3 && r3.dmg} kyVong=${exp3} maxHp=${r3 && r3.maxHp} loai=${r3 && r3.targetKind} def=${def}`);
      } else {
        for (const n of ['4b', '4c', '4d', '4e', '4f']) ok('chân ' + n, false, 'khong thay phuong maxHp>62500');
      }
    }

    // ---------- Chân 5: đếm phụ ----------
    {
      const distFiles = fs.existsSync(path.join(ROOT, 'client/dist')) ? fs.readdirSync(path.join(ROOT, 'client/dist/assets')).filter((f) => f.endsWith('.js')) : [];
      let marker = false;
      for (const f of distFiles) { try { if (fs.readFileSync(path.join(ROOT, 'client/dist/assets', f), 'utf8').includes('ttt_intro_v1')) { marker = true; break; } } catch (e) {} }
      ok('chân 5: marker ttt_intro_v1 còn trong dist', marker, distFiles.length ? 'dist co ' + distFiles.length + ' js' : 'khong co dist');
    }

    console.log(`\nKET QUA: ${pass} PASS / ${fail} FAIL`);
    await stopServer();
    process.exit(fail ? 1 : 0);
  } catch (e) {
    console.log('LOI PROBE:', e);
    await stopServer();
    process.exit(2);
  }
})();
