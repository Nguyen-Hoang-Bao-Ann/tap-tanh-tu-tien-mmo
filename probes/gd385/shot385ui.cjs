// Shot UI GĐ385-sửaUI — panel Pháp bảo NỔI (sau khi Bảo chê bản nở trong thẻ):
// viewport HẸP 480x1000 + touch (như ảnh Bảo gửi) và viewport THƯỜNG 1100x800.
// Kiểm: panel gọn trong màn hình, không đè chat/dock, mô tả trọn câu, nút trọn chữ,
// dòng Pháp Tướng không còn "undefined" (payload server đã sửa comment nuốt field).
const fs = require('fs'); const { spawn } = require('child_process');
const puppeteer = require('/home/hatch/workspace/shottools/node_modules/puppeteer');
const ROOT = '/home/hatch/workspace/tap-tanh-tu-tien-mmo'; const DIR = __dirname + '/shot';
const PORT = 3853; const URL = 'http://127.0.0.1:' + PORT;
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
function assert(cond, msg) { if (!cond) throw new Error(msg); console.log('  ok:', msg); }
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
    // ===== VIEWPORT HẸP (như ảnh Bảo) =====
    let page = await browser.newPage();
    await page.setViewport({ width: 480, height: 1000 }); // cửa sổ desktop hẹp — đúng môi trường ảnh Bảo gửi (ô chat 'Nhấn Enter', không lớp phủ xoay ngang)
    await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
    if (!await enterGame(page, 'pb385shot1')) throw new Error('khong vao duoc game (HT)');
    const line = await page.waitForFunction(() => { const el = document.querySelector('#hudPhapBao'); return el && el.textContent.includes('Hỗn Độn Châu') ? el.textContent : null; }, { timeout: 30000 }).then((h) => h.jsonValue()).catch(() => null);
    assert(!!line, 'dòng pháp bảo HT hiện: ' + line);
    const ptLine = await page.evaluate(() => document.querySelector('#hudPhapTuong')?.textContent || '');
    console.log('dòng Pháp Tướng:', ptLine);
    assert(!ptLine.includes('undefined'), 'dòng Pháp Tướng KHÔNG còn undefined');
    assert(ptLine.includes('hệ kim') && ptLine.includes('Tu dưỡng 0'), 'dòng Pháp Tướng có hệ + tu dưỡng thật');
    await page.evaluate(() => { const b = document.querySelector('#btnPhapBao'); if (b) b.click(); });
    const det = await page.waitForFunction(() => { const el = document.querySelector('#phapBaoPanel'); const body = document.querySelector('#phapBaoBody'); return el && getComputedStyle(el).display !== 'none' && body && body.textContent.includes('Nuôi cấp 8') ? body.textContent.slice(0, 100) : null; }, { timeout: 20000 }).then((h) => h.jsonValue()).catch(() => null);
    assert(!!det, 'panel pháp bảo mở: ' + det);
    await sleep(900);
    const geo = await page.evaluate(() => {
      const R = (s) => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height, right: r.right, bottom: r.bottom }; };
      const btns = [...document.querySelectorAll('#phapBaoBody .pbtn')].map((b) => ({ t: b.textContent.trim(), cut: b.scrollWidth > b.clientWidth + 1 || b.scrollHeight > b.clientHeight + 14 }));
      const fx = document.querySelector('#phapBaoBody .pbItem .pbFx');
      return { vw: innerWidth, vh: innerHeight, panel: R('#phapBaoPanel'), chat: R('#chatBox'), log: R('#gameLog'), btns, fxW: fx ? fx.getBoundingClientRect().width : 0, fxText: fx ? fx.textContent : '' };
    });
    console.log('panel:', JSON.stringify(geo.panel), '| chat:', JSON.stringify(geo.chat));
    assert(geo.panel.x >= 0 && geo.panel.right <= geo.vw + 1, 'panel gọn trong bề ngang màn hình hẹp');
    assert(geo.panel.bottom <= geo.vh - 8, 'panel không tràn đáy màn hình');
    assert(!(geo.panel.x < geo.chat.right && geo.chat.x < geo.panel.right && geo.panel.y < geo.chat.bottom && geo.chat.y < geo.panel.bottom), 'panel KHÔNG đè ô chat');
    assert(geo.btns.length > 0 && geo.btns.every((b) => !b.cut), 'mọi nút trong panel trọn chữ: ' + geo.btns.map((b) => b.t).join(' | '));
    assert(geo.fxW > 180, 'mô tả hiệu ứng có bề ngang tử tế (' + Math.round(geo.fxW) + 'px): ' + geo.fxText);
    await page.screenshot({ path: DIR + '/pb_detail_he_v2.png' });
    // đóng bằng ✕
    await page.evaluate(() => { const b = document.querySelector('#phapBaoClose'); if (b) b.click(); });
    await sleep(500);
    const closed = await page.evaluate(() => getComputedStyle(document.querySelector('#phapBaoPanel')).display === 'none');
    assert(closed, 'nút ✕ đóng panel được');
    // ===== VIEWPORT THƯỜNG =====
    await page.close().catch(() => {});
    const page3 = await (await browser.createBrowserContext()).newPage();
    await page3.setViewport({ width: 1100, height: 800 });
    await page3.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
    if (!await enterGame(page3, 'pb385shot1')) throw new Error('khong vao duoc game (HT, rong)');
    await page3.waitForFunction(() => { const el = document.querySelector('#hudPhapBao'); return el && el.textContent.includes('Hỗn Độn Châu'); }, { timeout: 30000 });
    await page3.evaluate(() => { const b = document.querySelector('#btnPhapBao'); if (b) b.click(); });
    await page3.waitForFunction(() => { const el = document.querySelector('#phapBaoPanel'); return el && getComputedStyle(el).display !== 'none'; }, { timeout: 20000 });
    await sleep(900);
    await page3.screenshot({ path: DIR + '/pb_detail_rong_v2.png' });
    console.log('  ok: chụp viewport thường xong');
    // ===== NA khoá (viewport hẹp) =====
    await page3.close().catch(() => {});
    const page2 = await (await browser.createBrowserContext()).newPage();
    await page2.setViewport({ width: 480, height: 1000 });
    await page2.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
    if (!await enterGame(page2, 'pb385shot2')) throw new Error('khong vao duoc game (NA)');
    const line2 = await page2.waitForFunction(() => { const el = document.querySelector('#hudPhapBao'); return el && el.textContent.includes('Hóa Thần mở') ? el.textContent : null; }, { timeout: 30000 }).then((h) => h.jsonValue()).catch(() => null);
    assert(!!line2, 'dòng khoá NA: ' + line2);
    await sleep(700);
    await page2.screenshot({ path: DIR + '/pb_locked_v2.png' });
    console.log('SHOT385UI PASS');
  } finally {
    if (browser) { try { await browser.close(); } catch {} }
    await stopServer(srv);
  }
})().catch((e) => { console.error('FAIL', e.message); process.exit(1); });
