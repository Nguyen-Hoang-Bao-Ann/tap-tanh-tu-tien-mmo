// Probe GĐ362 — Vá đợt 3 "chữ/số trung thực" từ sổ RA_SOAT_TONG_THE (B1-1..B1-6, B1-8, C-3, C-4, C-5, C-8).
// Chân kiểm (boot 1, port 3737):
//  0) Boot sạch + panel thành tựu đầy đủ: số def bật khớp module achievements, tổng daoTichMax = 799, mốc nhóm còn với tới.
//  1) Char A (biên trên): herbTypes 8 -> bậc 3, next 10 · pillsUsed 22 (trần thật) -> bậc 4 max ·
//     skills 50 -> bậc 9 max · killKinds 179 -> bậc 4, next 180 · masters 3 -> bậc 3 max · topRanks 3 -> bậc 3 max.
//     LƯU Ý: counters.ach_skills trong fixture đặt THẤP HƠN 6 so với tiến độ kỳ vọng — đăng nhập char cảnh
//     Kim Đan+ tự được grantPathGodSkills trao 6 thần thông KD/NA của vũ khí đang cầm (vào ach_skills).
//     A đặt 44 -> tiến độ 50 · B đặt 43 -> 49 · C đặt 114 -> 120.
//  2) Chữ đã sửa trong payload: ach_nd_fate tên/mô tả mới · ach_kp_dungeon mô tả mới, tiers giữ nguyên.
//  3) Claim theo thang mới (herbTypes bậc 1..3) -> claimed tăng + Đạo Tích +1/bậc.
//  4) Char B (biên dưới/giữa): herbTypes 2 -> bậc 0 · pills 9 -> bậc 1 · skills 49 -> bậc 8 · killKinds 180 -> bậc 5 max.
//  5) Char C (di sản): claimed species 5 (thang cũ) + killKinds 22 -> claimed GIỮ 5, danh hiệu bậc 5 còn, không lỗi;
//     herbTypes 15 (vượt trần) -> bậc 4 capped · skills 120 -> bậc 9, nạp bình thường.
//  6) Tĩnh sau build: bundle chứa 9 tên vật phẩm C-5 + desc Phù Cuồng Bạo mới; KHÔNG còn "sát thương ×1,5";
//     notices động (có "Giang Đăng Hội", không còn câu tĩnh "Vạn Hoa Hội đang diễn ra (02/11 – 16/11)").
//  7) Tĩnh nguồn: ITEM_INFO client đủ 127/127 id của ITEMS server.
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const net = require('net');
const ROOT = path.join(__dirname, '..', '..');
const DIR = __dirname;
const { io } = require(path.join(ROOT, 'client/node_modules/socket.io-client'));
const { createMerger } = require(path.join(ROOT, 'client/worldmerge.cjs'));
const ACH = require(path.join(ROOT, 'server/achievements'));
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
  killTimer = setTimeout(() => { try { serverProc.kill('SIGKILL'); } catch (e) {} }, 900000);
  const t0 = Date.now();
  while (Date.now() - t0 < 45000) { try { const r = await fetch(`http://127.0.0.1:${port}/api/status`); if (r.ok) { clearTimeout(killTimer); return; } } catch (e) {} await sleep(500); }
  throw new Error('server khong len');
}
async function stopServer() { if (!serverProc) return; const p = serverProc; serverProc = null; if (killTimer) { clearTimeout(killTimer); killTimer = null; } await new Promise((res) => { const t = setTimeout(() => { try { p.kill('SIGKILL'); } catch (e) {} res(); }, 4000); p.once('exit', () => { clearTimeout(t); res(); }); try { p.kill('SIGTERM'); } catch (e) { clearTimeout(t); res(); } }); const t0 = Date.now(); while (Date.now() - t0 < 10000 && !(await portFree(CUR_PORT))) await sleep(300); }
const STRONG = { khiHuyet: 20000, vatCong: 6000, vatPhong: 2000, phapCong: 400, phapPhong: 2000, tocDo: 80, minhMan: 100 };
const LC1 = { elements: ['kim'], main: 'kim', count: 1, mutations: [] };
function BASE(token, name, extra) {
  return Object.assign({ token, name, classId: 'kiemtu', gender: 'nam', race: null, geo175: 1, realm: 'ht', tier: 9, x: 1565, y: 1011, mapId: 'lang_tan_thu', hp: 999999, mp: 99999, lifespan: 500, birthDay: -5660, ageStart: 16, stats: { ...STRONG }, statPoints: 0, freePoints: 0, tuVi: 99999, stones: 100000, stonesTrung: 0, stonesThuong: 0, stonesCuc: 0, inventory: {}, gearBag: {}, equipped: [], skills: [], job: null, job2: null, job3: null, linhCan: { ...LC1 }, affinity: {}, affV2: 1, bonds: {}, quests: {}, questsDone: {}, flags: {}, counters: {}, disciples: [], foundInvites: [], reformIn: [], sectTech: [], sectArts: [], sectArtsActive: [], mails: [], classRes: {}, food: 100, water: 100 }, extra || {});
}
const setOf = (prefix, n, real) => { const o = {}; for (let i = 0; i < n; i++) o[(real && real[i]) || (prefix + '_' + (i + 1))] = 1; return o; };
const DAN22 = ['dan_hoi_nguyen', 'dan_hoi_xuan', 'dan_bao_luc', 'dan_thiet_bich', 'dan_huyet_khi', 'dan_nguyen_linh', 'dan_than_toc', 'dan_trung_canh', 'dan_truc_co', 'dan_ket_dan', 'dan_hoa_anh', 'dan_dai_hoi_xuan', 'dan_dai_hoi_nguyen', 'dan_nguyen_than', 'dan_huyen_giap', 'dan_than_huyet', 'dan_than_nguyen', 'dan_phong_than', 'dan_cuu_chuyen', 'dan_thien_luc', 'dan_thien_giap', 'dan_ho_mach'];
const HERBS10 = ['thao_duoc', 'linh_thao', 'tien_thao', 'than_thao', 'thanh_thao', 'hu_khong_thao', 'kiep_tam_thao', 'tien_linh_chi', 'lua_linh', 'hat_sen_linh'];
let pass = 0, fail = 0;
function ok(name, cond, extra) { if (cond) { pass++; console.log('PASS | ' + name); } else { fail++; console.log('FAIL | ' + name + (extra ? ' | ' + extra : '')); } }
function connect(token) {
  const socket = io(`http://127.0.0.1:${CUR_PORT}`, { transports: ['websocket'] });
  const ctx = { socket, merger: createMerger(), state: null, welcome: null, syncs: [], errs: [], claims: [], myName: null };
  socket.on('connect', () => socket.emit('hello', { token }));
  socket.on('welcome', (w) => { ctx.welcome = w; ctx.myName = (w.character || {}).name; });
  socket.on('char_sync', (s) => ctx.syncs.push(s));
  socket.on('interact_error', (e) => ctx.errs.push(e.message || ''));
  socket.on('ach_claim_result', (r) => ctx.claims.push(r));
  socket.on('server_tick', (t) => { const st = ctx.merger(t); if (st) ctx.state = st; });
  return ctx;
}
const lastChar = (c) => { for (let i = c.syncs.length - 1; i >= 0; i--) { if (c.syncs[i]) return c.syncs[i]; } return c.welcome ? c.welcome.character : null; };
const achOf = (c, id) => { const ch = lastChar(c); const l = ch && ch.achievements && ch.achievements.list; return l ? l.find((x) => x.id === id) : null; };

(async () => {
  try {
    // ---------- Chân 6+7: kiểm tĩnh nguồn + bundle (không cần server) ----------
    const cliSrc = fs.readFileSync(path.join(ROOT, 'client/src/main.ts'), 'utf8');
    const ci = cliSrc.indexOf('const ITEM_INFO');
    const block = cliSrc.slice(ci, cliSrc.indexOf('};', ci));
    const cliIds = new Set([...block.matchAll(/^\s{2}([a-z0-9_]+):\s*\{ name:/gm)].map((m) => m[1]));
    const srvSrc = fs.readFileSync(path.join(ROOT, 'server/index.js'), 'utf8');
    const ii = srvSrc.indexOf('const ITEMS = {');
    let depth = 0, j = srvSrc.indexOf('{', ii); const istart = j;
    for (; j < srvSrc.length; j++) { if (srvSrc[j] === '{') depth++; else if (srvSrc[j] === '}') { depth--; if (!depth) break; } }
    const ITEMS = eval('(' + srvSrc.slice(istart, j + 1) + ')');
    const missing = Object.keys(ITEMS).filter((id) => !cliIds.has(id));
    ok('chân 7: ITEM_INFO client đủ 127/127 id ITEMS server', missing.length === 0 && cliIds.size >= 127, 'thieu: ' + missing.join(','));
    const distDir = path.join(ROOT, 'client/dist/assets');
    const bundle = fs.readdirSync(distDir).filter((f) => f.endsWith('.js')).map((f) => fs.readFileSync(path.join(distDir, f), 'utf8')).join('\n');
    const nineNames = ['Ngọc Giản Trống', 'Trứng Linh Thú', 'Phong Thần Đan', 'Thần Huyết Đan', 'Thần Nguyên Đan', 'Phù Thiên Cang', 'Phù Vạn Lý', 'Phù Ẩn Thân', 'Phù Thiên Lôi'];
    ok('chân 6a: bundle chứa đủ 9 tên vật phẩm C-5', nineNames.every((n) => bundle.includes(n)), nineNames.filter((n) => !bundle.includes(n)).join(','));
    ok('chân 6b: bundle chứa desc Phù Cuồng Bạo mới (+50% chỉ số)', bundle.includes('+50% chỉ số Vật công và Pháp công trong 60 giây'));
    ok('chân 6c: bundle KHÔNG còn "sát thương ×1,5"', !bundle.includes('sát thương ×1,5') && !srvSrc.includes('sát thương ×1,5'));
    ok('chân 6d: notices động — có Giang Đăng Hội + không còn câu tĩnh Vạn Hoa Hội 02/11–16/11', bundle.includes('Giang Đăng Hội') && bundle.includes('đang diễn ra') && !bundle.includes('Vạn Hoa Hội đang diễn ra (02/11 – 16/11)'));
    ok('chân 6e: notices có mục cập nhật gói mới (gd235-362)', bundle.includes('Gói lớn: Thiên Phú'));

    // ---------- Fixtures ----------
    const chars = {};
    chars['tk362aa001'] = BASE('tk362aa001', 'P362BienTren', {
      counters: {
        ach_herbTypes: setOf('herb', 8, HERBS10),
        ach_pillsUsed: setOf('dan', 22, DAN22),
        ach_skills: setOf('sk', 44),
        ach_killKinds: setOf('kind', 179),
        ach_hiddenQuests: 5,
        ach_dungeons: 6,
      },
      job: { jobId: 'dansu', crafts: 100000, master: 'npc_su1' },
      job2: { jobId: 'luyenkhi', crafts: 100000, master: 'npc_su2' },
      job3: { jobId: 'phusu', crafts: 100000, master: 'npc_su3' },
      inventory: { ngoc_gian_trong: 2, dan_phong_than: 1, trung_linh_thu: 1, phu_thien_cang: 1 },
    });
    chars['tk362bb001'] = BASE('tk362bb001', 'P362BienDuoi', {
      counters: {
        ach_herbTypes: setOf('herb', 2, HERBS10),
        ach_pillsUsed: setOf('dan', 9, DAN22),
        ach_skills: setOf('sk', 43),
        ach_killKinds: setOf('kind', 180),
      },
    });
    chars['tk362cc001'] = BASE('tk362cc001', 'P362DiSan', {
      counters: {
        ach_herbTypes: setOf('herb', 15, HERBS10),
        ach_skills: setOf('sk', 114),
        ach_killKinds: setOf('kind', 22),
      },
      achState: { tiers: { ach_qt_species: 5, ach_np_toprank: 3 }, title: null, daoTich: 10, notified: {} },
    });
    fs.writeFileSync(path.join(DIR, 'characters.json'), JSON.stringify(chars));
    fs.writeFileSync(path.join(DIR, 'accounts.json'), '{}');
    fs.writeFileSync(path.join(DIR, 'world.json'), JSON.stringify({ totalMinutes: 3360, savedAt: Date.now() }));
    fs.writeFileSync(path.join(DIR, 'sessions.json'), '{}');
    await startServer(3737, '362a');

    // ---------- Chân 0: panel đầy đủ ----------
    const cA = connect('tk362aa001'); await waitFor(() => cA.welcome, 20000);
    ok('chân 0a: boot sạch, vào game được', !!cA.welcome);
    const achA = cA.welcome && cA.welcome.character.achievements;
    const enabledCount = ACH.ACH138.filter((d) => d.enabled !== false).length;
    ok('chân 0b: panel có đủ def đang bật (' + enabledCount + ')', !!achA && achA.list.length === enabledCount, achA && String(achA.list.length));
    let daoMax = 0; for (const d of ACH.ACH138) { if (d.enabled === false) continue; for (let t = 1; t <= d.tiers.length; t++) daoMax += ACH.daoTichForTier(t); }
    const grpMaxOk = achA && achA.groups.every((g) => { const mx = achA.list.filter((x) => x.group === g.id).reduce((s, x) => s + x.tiers.reduce((a2, _t, ix) => a2 + ACH.daoTichForTier(ix + 1), 0), 0); return g.milestones[2] <= mx; });
    ok('chân 0c: tổng daoTichMax = 799 (>= 780) + mốc 3 mọi nhóm còn với tới', daoMax === 799 && !!grpMaxOk, 'daoMax=' + daoMax);
    const invA = cA.welcome.character.inventory || {};
    ok('chân 0d: túi chứa 4 món C-5 mẫu (server giữ id)', invA.ngoc_gian_trong === 2 && invA.dan_phong_than === 1 && invA.trung_linh_thu === 1 && invA.phu_thien_cang === 1);

    // ---------- Chân 1: biên trên ----------
    const herb = achOf(cA, 'ach_lt_herbtypes');
    ok('chân 1a: herbTypes prog 8 -> bậc 3, next 10, tiers [3,5,8,10]', !!herb && herb.progress === 8 && herb.tier === 3 && herb.next === 10 && JSON.stringify(herb.tiers) === '[3,5,8,10]', JSON.stringify(herb));
    const pills = achOf(cA, 'ach_lt_pills');
    ok('chân 1b: pillsUsed prog 22 (trần) -> bậc 4 max, next null', !!pills && pills.progress === 22 && pills.tier === 4 && pills.next === null, JSON.stringify(pills));
    const learned = achOf(cA, 'ach_cp_learned');
    ok('chân 1c: skills prog 50 -> bậc 9 max theo thang mới', !!learned && learned.progress === 50 && learned.tier === 9 && learned.next === null && JSON.stringify(learned.tiers) === '[3,8,14,20,26,32,38,44,50]', JSON.stringify(learned && { p: learned.progress, t: learned.tier }));
    const species = achOf(cA, 'ach_qt_species');
    ok('chân 1d: killKinds 179 -> bậc 4, next 180, tiers [10,35,80,130,180]', !!species && species.progress === 179 && species.tier === 4 && species.next === 180, JSON.stringify(species && { p: species.progress, t: species.tier, n: species.next }));
    const masters = achOf(cA, 'ach_nd_master');
    ok('chân 1e: masters 3/3 -> bậc 3 max (thang [1,2,3])', !!masters && masters.progress === 3 && masters.tier === 3 && masters.next === null, JSON.stringify(masters && { p: masters.progress, t: masters.tier }));
    const toprank = achOf(cA, 'ach_np_toprank');
    ok('chân 1f: topRanks 3/3 -> bậc 3 max (thang [1,2,3])', !!toprank && toprank.progress === 3 && toprank.tier === 3 && toprank.next === null, JSON.stringify(toprank && { p: toprank.progress, t: toprank.tier }));

    // ---------- Chân 2: chữ đã sửa ----------
    const fate = achOf(cA, 'ach_nd_fate');
    ok('chân 2a: ach_nd_fate tên "Nhiệm vụ ẩn" + desc khớp bộ đếm', !!fate && fate.name === 'Nhiệm vụ ẩn' && fate.desc === 'Số nhiệm vụ ẩn đã hoàn thành' && fate.progress === 5 && fate.tier === 2, JSON.stringify(fate && { n: fate.name, d: fate.desc }));
    const dung = achOf(cA, 'ach_kp_dungeon');
    ok('chân 2b: ach_kp_dungeon desc mới + tiers giữ [1,3,6,12,25] + prog từ counter', !!dung && dung.desc === 'Số lần hạ trùm ở Cửu U Bí Cảnh và vùng trùm Thạch Lâm' && JSON.stringify(dung.tiers) === '[1,3,6,12,25]' && dung.progress === 6, JSON.stringify(dung && { d: dung.desc, p: dung.progress }));

    // ---------- Chân 3: claim theo thang mới ----------
    const dao0 = (lastChar(cA).achievements || {}).daoTich || 0;
    for (let i = 0; i < 3; i++) { cA.socket.emit('claim_ach_tier', { achId: 'ach_lt_herbtypes' }); await sleep(300); }
    const herbAfter = await waitFor(() => { const h = achOf(cA, 'ach_lt_herbtypes'); return h && h.claimed === 3 ? h : null; }, 6000);
    ok('chân 3a: claim herbTypes 3 bậc theo thang mới', !!herbAfter, JSON.stringify(achOf(cA, 'ach_lt_herbtypes')));
    const dao1 = (lastChar(cA).achievements || {}).daoTich || 0;
    ok('chân 3b: Đạo Tích +3 sau 3 claim bậc 1-3', dao1 - dao0 === 3, dao0 + '->' + dao1);
    ok('chân 3c: 3 ach_claim_result ok', cA.claims.filter((r) => r.ok && r.achId === 'ach_lt_herbtypes').length >= 3, String(cA.claims.length));

    // ---------- Chân 4: biên dưới/giữa ----------
    const cB = connect('tk362bb001'); await waitFor(() => cB.welcome, 20000);
    const herbB = achOf(cB, 'ach_lt_herbtypes');
    ok('chân 4a: herbTypes 2 -> bậc 0, next 3', !!herbB && herbB.progress === 2 && herbB.tier === 0 && herbB.next === 3, JSON.stringify(herbB && { p: herbB.progress, t: herbB.tier }));
    const pillsB = achOf(cB, 'ach_lt_pills');
    ok('chân 4b: pills 9 -> bậc 1, next 10', !!pillsB && pillsB.progress === 9 && pillsB.tier === 1 && pillsB.next === 10, JSON.stringify(pillsB && { p: pillsB.progress, t: pillsB.tier }));
    const learnB = achOf(cB, 'ach_cp_learned');
    ok('chân 4c: skills 49 -> bậc 8, next 50', !!learnB && learnB.progress === 49 && learnB.tier === 8 && learnB.next === 50, JSON.stringify(learnB && { p: learnB.progress, t: learnB.tier }));
    const specB = achOf(cB, 'ach_qt_species');
    ok('chân 4d: killKinds 180 -> bậc 5 max thang mới', !!specB && specB.progress === 180 && specB.tier === 5 && specB.next === null, JSON.stringify(specB && { p: specB.progress, t: specB.tier }));

    // ---------- Chân 5: di sản thang cũ ----------
    const cC = connect('tk362cc001'); await waitFor(() => cC.welcome, 20000);
    ok('chân 5a: char di sản nạp bình thường', !!cC.welcome);
    const specC = achOf(cC, 'ach_qt_species');
    ok('chân 5b: species claimed GIỮ 5 (thang cũ), tier reached theo thang mới = 1, không tụt claimed', !!specC && specC.claimed === 5 && specC.tier === 1 && specC.progress === 22, JSON.stringify(specC && { c: specC.claimed, t: specC.tier, p: specC.progress }));
    const titlesC = (lastChar(cC).achievements || {}).ownedTitles || [];
    ok('chân 5c: danh hiệu species bậc 5 (Vô Thượng) còn trong ownedTitles', titlesC.some((t) => t.achId === 'ach_qt_species' && t.tier === 5), JSON.stringify(titlesC.filter((t) => t.achId === 'ach_qt_species').map((t) => t.tier)));
    const herbC = achOf(cC, 'ach_lt_herbtypes');
    ok('chân 5d: herbTypes 15 (vượt trần thật) -> bậc 4 capped, không lỗi', !!herbC && herbC.progress === 15 && herbC.tier === 4 && herbC.next === null, JSON.stringify(herbC && { p: herbC.progress, t: herbC.tier }));
    const learnC = achOf(cC, 'ach_cp_learned');
    ok('chân 5e: skills 120 -> bậc 9 max, nạp bình thường', !!learnC && learnC.progress === 120 && learnC.tier === 9, JSON.stringify(learnC && { p: learnC.progress, t: learnC.tier }));
    const topC = achOf(cC, 'ach_np_toprank');
    ok('chân 5f: topRanks claimed cũ 3 vẫn khớp thang mới (progress 0 do không nghề) — claimed giữ 3', !!topC && topC.claimed === 3, JSON.stringify(topC && { c: topC.claimed, p: topC.progress }));

    await stopServer();
    console.log(`\n== GĐ362: ${pass} PASS / ${fail} FAIL ==`);
    process.exit(fail ? 1 : 0);
  } catch (e) {
    console.log('LOI PROBE:', e && e.message);
    try { await stopServer(); } catch (_) {}
    process.exit(2);
  }
})();
