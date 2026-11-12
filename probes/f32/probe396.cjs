// GĐ396 — PROBE TRONG GAME: 14 bộ f32 + biến thể từng NPC có hiện đúng không.
// Boot server staging (port 3973, fixture probes/f32), mở game bằng puppeteer
// trong máy ảo, login guest token f32tok01 (F32Kiem, thanh_van_thanh), đọc NPC
// đang render từ window.__tttScene.cityNpcObjects (npcData + npcWalk + texture
// key thật), đối chiếu role → pool, chụp ảnh dải phố SAU (HUD giữ nguyên như
// ảnh TRƯỚC kiem-game-f32-truoc-v1.png).
// Chạy: node probes/f32/probe396.cjs   (tự start + stop server)
const fs = require('fs'); const path = require('path'); const { spawn } = require('child_process');
const puppeteer = require('/home/hatch/workspace/shottools/node_modules/puppeteer');
const ROOT = '/home/hatch/workspace/tap-tanh-tu-tien-mmo';
const DIR = path.join(ROOT, 'probes', 'f32');
const PORT = 3973; const URL = 'http://127.0.0.1:' + PORT;
const OUT = '/home/hatch/workspace/mau-f1/kiem-game-f32-sau-v1.png';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const token = 'f32tok01';

// role → pool (bảng gán vai GĐ396, từ cityNpcPool trong client/src/main.ts)
const POOL = {
  'Sứ Giả': ['envoy'], 'Sứ Giả Chuyển Sinh': ['envoy'], 'Sứ Giả Tông Môn': ['envoy'], 'Sứ Giả Thiên Ngoại': ['envoy'],
  'Chủ Tiệm Đan': ['shopdan'], 'Chủ Tiệm Nguyên Liệu': ['shopnl'],
  'Chủ Tiệm Thảo Dược': ['npc-thaoduoc'], 'Dược Sư': ['npc-thaoduoc'], 'Đại Sư Đan Sư': ['npc-thaoduoc'], 'Trợ Lý Đan Sư': ['npc-thaoduoc'], 'Đan Sư': ['npc-thaoduoc'],
  'Thủ Tàng': ['city-d'], 'Thầy Đồ': ['city-d'], 'Thư Ký Thành': ['city-d'], 'Trợ Lý Trận Pháp': ['city-d'], 'Trợ Lý Phù Chú': ['city-d'],
  'Thương nhân rong': ['merchant'], 'Thương Gia Bí Ẩn': ['merchant'],
  'Trưởng Thành': ['elder'], 'Trưởng Lão': ['elder'], 'Lão Tổ Về Hưu': ['elder'], 'Đại Sư Trận Pháp': ['elder'], 'Đại Sư Phù Chú': ['elder'], 'Đại Sư Thú Sư': ['elder'], 'Trợ Lý Thú Sư': ['elder'], 'Phù Sư': ['elder'], 'Trận Sư': ['elder'],
  'Lính gác': ['city-e'], 'Đội Trưởng Lính Gác': ['city-e'],
  'Thợ Rèn': ['blacksmith'], 'Đại Sư Thợ Rèn': ['blacksmith'], 'Thợ Rèn Bậc Thầy': ['blacksmith'], 'Trợ Lý Thợ Rèn': ['blacksmith'], 'Chủ Tiệm Vũ Khí': ['blacksmith'],
  'Chủ Quán Ăn': ['f32-quanan'], 'Chủ Tiệm Tạp Hóa': ['f32-taphoa'],
  'Người Áo Đen (Nhiệm Vụ Ẩn)': ['f32-aoden'], 'Người Giữ Bí Mật': ['f32-aoden'],
  'Bà Mối': ['f32-bamoi'], 'Thầy Bói': ['f32-thayboi'], 'Lão Ngư': ['f32-laongu'], 'Thợ Săn Già': ['f32-thosan'],
  'Kiếm Khách Lang Thang': ['f32-kiemkhach'], 'Hòa Thượng Khất Thực': ['f32-hoathuong'], 'Nữ Hiệp Giang Hồ': ['f32-nuhiep'], 'Đạo Sĩ Du Phương': ['f32-daosi'], 'Tiểu Yêu Tinh Nghịch': ['f32-tieuyeu'],
  'Dân thường': ['city-a', 'city-b', 'city-c', 'city-d', 'city-e', 'villager-a', 'villager-b', 'villager-c', 'f32-dannu', 'f32-laodan'],
  'Người ngắm cảnh': ['city-b', 'city-c', 'city-d'],
};
const OLD_SETS = ['city-a', 'city-b', 'city-c', 'city-d', 'city-e', 'villager-a', 'villager-b', 'villager-c'];
const F32 = ['f32-quanan', 'f32-taphoa', 'f32-aoden', 'f32-bamoi', 'f32-thayboi', 'f32-laongu', 'f32-thosan', 'f32-kiemkhach', 'f32-hoathuong', 'f32-nuhiep', 'f32-daosi', 'f32-tieuyeu', 'f32-dannu', 'f32-laodan'];

async function portFree(port) { return new Promise((res) => { const s = require('net').connect(port, '127.0.0.1'); s.on('connect', () => { s.destroy(); res(false); }); s.on('error', () => res(true)); }); }
let killTimer = null;
function startServer() {
  return new Promise(async (resolve, reject) => {
    if (!(await portFree(PORT))) return reject(new Error('CỔNG BẬN'));
    const srv = spawn('node', ['server/index.js'], { cwd: ROOT, env: { ...process.env, PORT: String(PORT), TTT_CHAR_FILE: DIR + '/characters.json', TTT_ACC_FILE: DIR + '/accounts.json', TTT_WORLD_FILE: DIR + '/world.json', TTT_SESS_FILE: DIR + '/sessions.json', TTT_STORAGE: 'file', TTT_DAY_REAL_MS: '600000', TTT_TUVI_NEED: '5' } });
    const lf = fs.createWriteStream('/tmp/srv_f32probe.log'); lf.on('error', () => {});
    srv.stdout.pipe(lf); srv.stderr.pipe(lf);
    killTimer = setTimeout(() => { try { srv.kill('SIGKILL'); } catch {} }, 600000);
    const t0 = Date.now();
    const iv = setInterval(async () => {
      try { const r = await fetch(URL + '/api/status'); if (r.ok) { clearInterval(iv); if (killTimer) { clearTimeout(killTimer); killTimer = null; } resolve(srv); } } catch {}
      if (Date.now() - t0 > 90000) { clearInterval(iv); if (killTimer) { clearTimeout(killTimer); killTimer = null; } reject(new Error('server khong len')); }
    }, 700);
  });
}
async function stopServer(srv) { if (!srv) return; if (killTimer) { clearTimeout(killTimer); killTimer = null; } try { srv.kill('SIGTERM'); } catch {} await sleep(1500); for (let i = 0; i < 12; i++) { if (await portFree(PORT)) return; await sleep(600); } try { srv.kill('SIGKILL'); } catch {} await sleep(800); }
function waitFor(page, fn, timeout = 60000, step = 500) {
  const t0 = Date.now();
  const go = async () => { while (Date.now() - t0 < timeout) { const r = await page.evaluate(fn); if (r) return r; await sleep(step); } return null; };
  return go();
}

(async () => {
  const srv = await startServer();
  console.log('INFO | server len cong ' + PORT);
  let fail = 0;
  const ok = (name, cond, extra) => { console.log((cond ? 'PASS | ' : 'FAIL | ') + name + (extra ? ' | ' + extra : '')); if (!cond) fail++; };
  try {
    const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-crashpad', '--disable-crash-reporter', '--no-crashpad', '--disable-dev-shm-usage'] });
    try {
      const page = await browser.newPage();
      await page.setViewport({ width: 1280, height: 800 });
      page.on('pageerror', (e) => console.log('PAGEERROR:', String(e).slice(0, 200)));
      await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await page.evaluate((t) => localStorage.setItem('ttt_token_v1', t), token);
      await page.reload({ waitUntil: 'domcontentloaded', timeout: 60000 });
      const booted = await waitFor(page, () => { const b = document.querySelector('#btnGuest'); return !!(window.__tttScene && window.tttSocket && b && typeof b.onclick === 'function'); }, 150000);
      ok('boot game', !!booted);
      if (!booted) throw new Error('khong boot duoc game');
      let inGame = false;
      for (let i = 0; i < 70; i++) {
        inGame = await page.evaluate(() => document.body.classList.contains('ingame'));
        if (inGame) break;
        await page.evaluate(() => {
          const es = document.querySelector('#btnEnterServer');
          if (es && !es.disabled) es.click();
          const b = document.querySelector('#btnGuest');
          if (b) b.click();
        });
        await sleep(700);
      }
      ok('vao game', !!inGame);
      if (!inGame) throw new Error('khong vao duoc game');
      await sleep(15000); // chờ map thành phố + NPC về
      const dump = await page.evaluate(() => {
        const sc = window.__tttScene;
        if (!sc) return null;
        // GĐ396-sửa: sc.myPlayer KHÔNG tồn tại (script shot_f32_v2.cjs cũ
        // dùng sai tên, chưa từng chạy thành công) — NV là actors.get(myId).
        const me = sc.actors ? sc.actors.get(sc.myId) : null;
        const p = me && me.container ? { x: me.container.x, y: me.container.y } : null;
        const tex = {};
        for (const s of ['f32-quanan', 'f32-taphoa', 'f32-aoden', 'f32-bamoi', 'f32-thayboi', 'f32-laongu', 'f32-thosan', 'f32-kiemkhach', 'f32-hoathuong', 'f32-nuhiep', 'f32-daosi', 'f32-tieuyeu', 'f32-dannu', 'f32-laodan']) {
          tex[s] = {
            idleSouth: sc.textures.exists(s + '-idle-south'),
            idleNorth: sc.textures.exists(s + '-idle-north'),
            idleEast: sc.textures.exists(s + '-idle-east'),
            walkSouth0: sc.textures.exists(s + '-walk-south-0'),
          };
        }
        let variantKeys = 0;
        try { variantKeys = sc.textures.getTextureKeys().filter((k) => /-v[1-7]-/.test(k)).length; } catch (e) { variantKeys = -1; }
        const npcs = (sc.cityNpcObjects || []).map((c) => {
          const d = c.npcData || {}; const w = c.npcWalk || {};
          let texKey = null;
          try { texKey = w.sprite ? w.sprite.texture.key : null; } catch (e) {}
          return { id: d.id, name: d.name, role: d.role, kind: d.kind, x: Math.round(c.x), y: Math.round(c.y), set: w.set, variant: w.variant, texKey };
        });
        return { px: p ? Math.round(p.x) : null, py: p ? Math.round(p.y) : null, tex, variantKeys, npcs };
      });
      ok('doc duoc scene NPC', !!dump, dump ? ('npcs=' + dump.npcs.length + ' px=' + dump.px + ',' + dump.py) : '');
      if (!dump) throw new Error('khong doc duoc scene');
      console.log('INFO | vi tri NV: ' + dump.px + ',' + dump.py + ' | NPC tren map: ' + dump.npcs.length);
      // 1. texture 14 bộ f32 có đủ
      const missing = [];
      for (const s of F32) { const t = dump.tex[s] || {}; if (!t.idleSouth || !t.idleNorth || !t.idleEast || !t.walkSouth0) missing.push(s + JSON.stringify(t)); }
      ok('14 bo f32 du texture (idle S/N/E + walk S0)', missing.length === 0, missing.length ? missing.join('; ') : 'du');
      // 2. NPC chức năng gần NV (<=600px) đúng pool
      const near = dump.npcs.filter((n) => n.x != null && dump.px != null && Math.hypot(n.x - dump.px, n.y - dump.py) <= 600);
      console.log('INFO | NPC gan NV (<=600px): ' + near.length);
      let wrongPool = [];
      for (const n of near) {
        const pool = POOL[n.role];
        if (pool) { if (!pool.includes(n.set)) wrongPool.push(n.name + '/' + n.role + ' -> ' + n.set + ' (pool ' + pool.join(',') + ')'); }
        else if (!OLD_SETS.includes(n.set)) wrongPool.push(n.name + '/' + n.role + ' -> ' + n.set + ' (vai giu cu, la ra khoi city/villager)');
        console.log('  NPC | ' + n.name + ' | ' + n.role + ' | ' + n.kind + ' | set=' + n.set + ' v' + n.variant + ' | tex=' + n.texKey + ' | d=' + Math.round(Math.hypot(n.x - dump.px, n.y - dump.py)) + 'px');
      }
      ok('NPC chuc nang gan NV dung pool vai', wrongPool.length === 0, wrongPool.length ? wrongPool.join('; ') : near.filter((n) => n.kind === 'functional').length + ' chuc nang gan NV');
      // 3. có NPC dùng bộ f32
      const f32users = dump.npcs.filter((n) => n.set && n.set.startsWith('f32-'));
      ok('co NPC dung bo f32 moi', f32users.length > 0, f32users.length + ' NPC / ' + dump.npcs.length);
      const f32setsUsed = [...new Set(f32users.map((n) => n.set))].sort();
      console.log('INFO | bo f32 dang dung tren map: ' + f32setsUsed.join(', '));
      // 4. dân thường trộn nhiều bộ
      const civ = dump.npcs.filter((n) => n.role === 'Dân thường');
      const civSets = [...new Set(civ.map((n) => n.set))].sort();
      ok('dan thuong tron >=5 bo', civSets.length >= 5, civSets.length + ' bo: ' + civSets.join(',') + ' (' + civ.length + ' dan)');
      // 5. 2 NPC cùng vai kề nhau khác nhau
      let adjDiff = null;
      for (let i = 0; i < dump.npcs.length && !adjDiff; i++) {
        for (let j = i + 1; j < dump.npcs.length && !adjDiff; j++) {
          const a = dump.npcs[i], b = dump.npcs[j];
          if (a.role === b.role && a.texKey && b.texKey && a.texKey !== b.texKey) {
            const d = Math.hypot(a.x - b.x, a.y - b.y);
            if (d <= 200) adjDiff = { role: a.role, a: a.name + '/' + a.texKey, b: b.name + '/' + b.texKey, d: Math.round(d) };
          }
        }
      }
      ok('2 NPC cung vai ke nhau (<=200px) khac nhau', !!adjDiff, adjDiff ? JSON.stringify(adjDiff) : 'khong tim thay cap');
      // 6. biến thể màu đang chạy (có texture -vN- được sinh)
      ok('co texture bien the -vN- duoc sinh', dump.variantKeys > 0, dump.variantKeys + ' texture bien the');
      const withVariant = dump.npcs.filter((n) => (n.variant || 0) > 0).length;
      console.log('INFO | NPC co variant>0: ' + withVariant + '/' + dump.npcs.length);
      // 7. ảnh dải phố SAU (HUD giữ nguyên như ảnh TRƯỚC)
      await sleep(1200);
      await page.screenshot({ path: OUT });
      console.log('INFO | da chup ' + OUT);
      ok('anh sau da chup', fs.existsSync(OUT) && fs.statSync(OUT).size > 10000, fs.existsSync(OUT) ? fs.statSync(OUT).size + ' byte' : 'khong co file');
    } finally { await browser.close(); }
  } catch (e) { console.log('FAIL | exception | ' + (e && e.message)); fail++; }
  await stopServer(srv);
  console.log(fail ? 'PROBE396: ' + fail + ' FAIL' : 'PROBE396: TAT CA PASS');
  process.exit(fail ? 1 : 0);
})();
