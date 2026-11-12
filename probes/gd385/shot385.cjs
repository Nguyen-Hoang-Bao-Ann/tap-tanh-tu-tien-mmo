// Shot UI GĐ385 — Pháp bảo trên thẻ nhân vật: dòng nhỏ + nút ▸ Pháp bảo + chi tiết.
// 2 nhân vật: HT đeo châu cấp 7 (mở được chi tiết) + NA (dòng mờ "Pháp bảo — Hóa Thần mở").
const fs = require('fs'); const { spawn } = require('child_process');
const puppeteer = require('/home/hatch/workspace/shottools/node_modules/puppeteer');
const ROOT = '/home/hatch/workspace/tap-tanh-tu-tien-mmo'; const DIR = __dirname + '/shot';
const PORT = 3852; const URL = 'http://127.0.0.1:' + PORT;
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
  return Object.assign({ token, name, classId: 'kiemtu', gender: 'nam', race: null, geo175: 1, realm: 'ht', tier: 1, x: 1565, y: 1011, mapId: 'lang_tan_thu', hp: 999999, mp: 9999, lifespan: 500, birthDay: -5660, ageStart: 16, stats: { khiHuyet: 500, vatCong: 300, vatPhong: 200, phapCong: 300, phapPhong: 200, tocDo: 60, minhMan: 100 }, statPoints: 0, freePoints: 0, tuVi: 99999, stones: 100000, stonesTrung: 0, stonesThuong: 5000, stonesCuc: 2, inventory: { hon_don_thach: 9, hu_khong_cot: 9 }, gearBag: {}, equipped: [], skills: [], job: null, job2: null, job3: null, linhCan: { ...LC1 }, affinity: {}, affV2: 1, bonds: {}, quests: {}, questsDone: {}, flags: {}, counters: {}, disciples: [], foundInvites: [], reformIn: [], sectTech: [], sectArts: [], sectArtsActive: [], mails: [], classRes: {}, food: 100, water: 100 }, extra || {});
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
(async () => {
  fs.mkdirSync(DIR, { recursive: true });
  const chars = {};
  chars['pb385shot1'] = BASE('pb385shot1', 'ShotPhapBao', { phapBao: { owned: { pb_hon_don_chau: 7 }, equipped: 'pb_hon_don_chau' } });
  chars['pb385shot2'] = BASE('pb385shot2', 'ShotKhoa', { realm: 'na', tier: 9 });
  fs.writeFileSync(DIR + '/characters.json', JSON.stringify(chars));
  fs.writeFileSync(DIR + '/accounts.json', '{}'); fs.writeFileSync(DIR + '/world.json', '{}'); fs.writeFileSync(DIR + '/sessions.json', '{}');
  const srv = await startServer();
  let browser = null;
  try {
    browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
    let page = await browser.newPage(); await page.setViewport({ width: 1100, height: 800 });
    await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
    if (!await enterGame(page, 'pb385shot1')) throw new Error('khong vao duoc game (HT)');
    const line = await page.waitForFunction(() => { const el = document.querySelector('#hudPhapBao'); return el && el.textContent.includes('Hỗn Độn Châu') ? el.textContent : null; }, { timeout: 30000 }).then((h) => h.jsonValue()).catch(() => null);
    console.log('dòng pháp bảo (HT):', line);
    if (!line) throw new Error('dòng pháp bảo HT không hiện tên món + cấp');
    await sleep(1200);
    await page.screenshot({ path: DIR + '/pb_card_v1.png', clip: { x: 0, y: 0, width: 430, height: 560 } });
    await page.evaluate(() => { const b = document.querySelector('#btnPhapBao'); if (b) b.click(); });
    const det = await page.waitForFunction(() => { const el = document.querySelector('#hudPhapBaoDetail'); return el && getComputedStyle(el).display !== 'none' && el.textContent.includes('Nuôi cấp') ? el.textContent.slice(0, 120) : null; }, { timeout: 20000 }).then((h) => h.jsonValue()).catch(() => null);
    console.log('chi tiết pháp bảo:', det);
    if (!det) throw new Error('panel chi tiết pháp bảo không mở');
    await sleep(800);
    await page.screenshot({ path: DIR + '/pb_detail_v1.png', clip: { x: 0, y: 0, width: 430, height: 800 } });
    // nhân vật NA: dòng khóa mờ — mở context MỚI (page cũ giữ phiên token HT)
    const page2 = await (await browser.createBrowserContext()).newPage();
    await page2.setViewport({ width: 1100, height: 800 });
    await page2.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
    if (!await enterGame(page2, 'pb385shot2')) throw new Error('khong vao duoc game (NA)');
    page = page2;
    const line2 = await page.waitForFunction(() => { const el = document.querySelector('#hudPhapBao'); return el && el.textContent.includes('Hóa Thần mở') ? el.textContent : null; }, { timeout: 30000 }).then((h) => h.jsonValue()).catch(() => null);
    console.log('dòng pháp bảo (NA):', line2);
    if (!line2) throw new Error('dòng khóa NA không hiện');
    await sleep(800);
    await page.screenshot({ path: DIR + '/pb_locked_v1.png', clip: { x: 0, y: 0, width: 430, height: 560 } });
    console.log('SHOT385 PASS');
  } finally {
    if (browser) { try { await browser.close(); } catch {} }
    await stopServer(srv);
  }
})().catch((e) => { console.error('FAIL', e.message); process.exit(1); });
