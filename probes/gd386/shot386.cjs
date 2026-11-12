// Shot GĐ386 — Văn Uyển PA2: NPC Thủ Tàng (Trầm Mặc) trong game + hội thoại có khối đọc sách.
// Tọa độ từ probe p386 (seed map tất định): cổng/điểm đọc (5367,7900), Thủ Tàng (5497,7850).
// Nhân vật đứng tại (5464,7863): cách Thủ Tàng ~35px (điểm E gần nhất = NPC), cách cổng 104px.
const fs = require('fs'); const { spawn } = require('child_process');
const puppeteer = require('/home/hatch/workspace/shottools/node_modules/puppeteer');
const ROOT = '/home/hatch/workspace/tap-tanh-tu-tien-mmo'; const DIR = __dirname + '/shot';
const PORT = 3997; const URL = 'http://127.0.0.1:' + PORT;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function portFree(port) { return new Promise((res) => { const s = require('net').connect(port, '127.0.0.1'); s.on('connect', () => { s.destroy(); res(false); }); s.on('error', () => res(true)); }); }
function startServer() {
  return new Promise(async (resolve, reject) => {
    if (!(await portFree(PORT))) return reject(new Error('CỔNG BẬN'));
    const srv = spawn('node', ['server/index.js'], { cwd: ROOT, env: { ...process.env, PORT: String(PORT), TTT_CHAR_FILE: DIR + '/characters.json', TTT_ACC_FILE: DIR + '/accounts.json', TTT_WORLD_FILE: DIR + '/world.json', TTT_SESS_FILE: DIR + '/sessions.json', TTT_STORAGE: 'file', TTT_DAY_REAL_MS: '600000', TTT_TUVI_NEED: '5' } });
    const kt = setTimeout(() => { try { srv.kill('SIGKILL'); } catch {} }, 240000);
    const t0 = Date.now();
    const iv = setInterval(async () => {
      try { const r = await fetch(URL + '/api/status'); if (r.ok) { clearInterval(iv); clearTimeout(kt); resolve(srv); } } catch {}
      if (Date.now() - t0 > 60000) { clearInterval(iv); clearTimeout(kt); reject(new Error('server khong len')); }
    }, 700);
  });
}
async function stopServer(srv) { if (!srv) return; try { srv.kill('SIGTERM'); } catch {} await sleep(1500); for (let i = 0; i < 12; i++) { if (await portFree(PORT)) return; await sleep(600); } try { srv.kill('SIGKILL'); } catch {} await sleep(800); }
const LC1 = { elements: ['kim'], main: 'kim', count: 1, mutations: [] };
function BASE(token, name, extra) {
  return Object.assign({ token, name, classId: 'kiemtu', gender: 'nam', race: null, geo175: 1, realm: 'lk', tier: 1, x: 5464, y: 7863, mapId: 'van_uyen', hp: 999999, mp: 9999, lifespan: 500, birthDay: -5660, ageStart: 16, stats: { khiHuyet: 500, vatCong: 300, vatPhong: 200, phapCong: 300, phapPhong: 200, tocDo: 60, minhMan: 100 }, statPoints: 0, freePoints: 0, tuVi: 99999, stones: 100000, stonesTrung: 0, stonesThuong: 0, stonesCuc: 0, inventory: {}, gearBag: {}, equipped: [], skills: [], job: null, job2: null, job3: null, linhCan: { ...LC1 }, affinity: {}, affV2: 1, bonds: {}, quests: {}, questsDone: {}, flags: {}, counters: {}, disciples: [], foundInvites: [], reformIn: [], sectTech: [], sectArts: [], sectArtsActive: [], mails: [], classRes: {}, food: 100, water: 100 }, extra || {});
}
async function enterGame(page, token) {
  await page.evaluate((tk) => localStorage.setItem('ttt_token_v1', tk), token);
  await page.reload({ waitUntil: 'domcontentloaded' });
  for (let i = 0; i < 60; i++) {
    const inGame = await page.evaluate(() => document.body.classList.contains('ingame'));
    if (inGame) return true;
    await page.evaluate(() => { const b = document.querySelector('#btnGuest'); if (b) b.click(); });
    await sleep(700);
  }
  return false;
}
function assert(cond, msg) { if (!cond) throw new Error(msg); console.log('  ok:', msg); }
(async () => {
  fs.mkdirSync(DIR, { recursive: true });
  const chars = {};
  chars['shot386lib'] = BASE('shot386lib', 'DocAnh386');
  fs.writeFileSync(DIR + '/characters.json', JSON.stringify(chars));
  fs.writeFileSync(DIR + '/accounts.json', '{}'); fs.writeFileSync(DIR + '/world.json', '{}'); fs.writeFileSync(DIR + '/sessions.json', '{}');
  const srv = await startServer();
  let browser = null;
  try {
    browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
    const page = await browser.newPage();
    await page.setViewport({ width: 1100, height: 800 });
    await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
    if (!await enterGame(page, 'shot386lib')) throw new Error('khong vao duoc game');
    await sleep(6000); // chờ texture NPC nạp
    await page.screenshot({ path: DIR + '/vu_thutang_v1.png' });
    console.log('  ok: chụp cảnh Văn Uyển (nhân vật + Thủ Tàng)');
    // Bấm E — điểm tương tác gần nhất là Thủ Tàng → mở hội thoại
    let dlg = null;
    for (let i = 0; i < 6 && !dlg; i++) {
      await page.keyboard.press('KeyE');
      await sleep(1200);
      dlg = await page.evaluate(() => {
        const p = document.getElementById('npcDialog');
        if (!p || getComputedStyle(p).display === 'none') return null;
        const t = document.getElementById('npcDlgTitle');
        const b = document.getElementById('npcDlgBtns');
        return { title: t ? t.textContent : '', btns: b ? b.textContent : '' };
      }).catch(() => null);
    }
    assert(!!dlg, 'hội thoại NPC mở được bằng phím E');
    console.log('  title:', dlg.title);
    assert(dlg.title.includes('Trầm Mặc'), 'hội thoại đúng Thủ Tàng Trầm Mặc');
    assert(dlg.btns.includes('Đọc sách ở Tàng Kinh Các'), 'hội thoại có khối đọc sách');
    assert(dlg.btns.includes('Vào đọc sách'), 'có nút Vào đọc sách');
    await sleep(600);
    await page.screenshot({ path: DIR + '/vu_thutang_dialog_v1.png' });
    console.log('  ok: chụp hội thoại Thủ Tàng');
    console.log('SHOT GĐ386: PASS');
  } finally {
    if (browser) await browser.close().catch(() => {});
    await stopServer(srv);
  }
})().catch((e) => { console.error('SHOT FAIL:', e.message); process.exit(1); });
