// Probe GĐ391 — bảng thông báo đợt 1: loại tin + ghim + cờ "mới" + tin bảo trì.
// Chân 0: kiểm tĩnh (node --check, dist chứa tin mới, bundle chứa id tin mới)
// Chân 1: boot 4579 quái
// Chân 2 (desktop 1100x800, từ splash): nút Thông báo có chấm "mới" (hasNew);
//   mở bảng: tab Cập nhật hiện tin 'Chọn máy chủ' với icon 📝; bấm tin -> đánh
//   dấu đã đọc (localStorage ttt_notices_read_v1); tab Thông báo: tin ghim
//   'Vạn Hoa Hội sắp hết' lên đầu, có 📌 + 🎉; đọc hết mọi tin -> chấm "mới"
//   mất; reload -> vẫn nhớ đã đọc (chấm không quay lại).
// Chân 3 (trong game, khách): menuNewsBtn mở được bảng thông báo.
// Chân 4: bảo trì (vá tạm servers.ts + build lại bằng esbuild): tab Thông báo
//   tự sinh tin '🛠 Bảo trì: Tinh Túc Mệnh 1' ghim đầu, nội dung hiện lý do +
//   giờ mở lại '20:00 12/11'; khôi phục servers.ts byte-identical + build lại.
// Chân 5 (mobile 390x844): bảng vừa khung; chụp.
// LƯU Ý MÔI TRƯỜNG: đợt chặn ghi EPERM của sandbox tới theo cơn — build dùng
// esbuild xuất stdout rồi ghi qua cat, thử lại dày (buildEsbuild); Chrome
// headless cũng chết theo cơn (SIGTRAP) — chân browser nào không chạy được
// thì ghi rõ, không bịa kết quả.
const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const net = require('net');
const ROOT = path.join(__dirname, '..', '..');
const DIR = __dirname;
const puppeteer = require('/home/hatch/workspace/shottools/node_modules/puppeteer');
const PORT = 3942;
const URL = 'http://127.0.0.1:' + PORT;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function waitFor(fn, ms) { const t0 = Date.now(); while (Date.now() - t0 < ms) { const v = await fn(); if (v) return v; await sleep(150); } return null; }
function portFree(port) { return new Promise((res) => { const s = net.createServer(); s.once('error', () => res(false)); s.listen(port, () => s.close(() => res(true))); }); }
let serverProc = null, killTimer = null;
async function startServer(tag) {
  if (!(await portFree(PORT))) throw new Error('port ban ' + PORT);
  serverProc = spawn('node', ['server/index.js'], { cwd: ROOT, env: { ...process.env, PORT: String(PORT), TTT_STORAGE: 'file', TTT_CHAR_FILE: path.join(DIR, 'characters.json'), TTT_ACC_FILE: path.join(DIR, 'accounts.json'), TTT_WORLD_FILE: path.join(DIR, 'world.json'), TTT_SESS_FILE: path.join(DIR, 'sessions.json'), TTT_DAY_REAL_MS: '600000', TTT_TUVI_NEED: '5' }, stdio: ['ignore', 'pipe', 'pipe'] });
  serverProc.stderr.on('data', (d) => { try { fs.appendFileSync(path.join(DIR, 'srv_' + tag + '.log'), d); } catch (e) {} });
  serverProc.stdout.on('data', (d) => { try { fs.appendFileSync(path.join(DIR, 'srv_' + tag + '.log'), d); } catch (e) {} });
  killTimer = setTimeout(() => { try { serverProc.kill('SIGKILL'); } catch (e) {} }, 900000);
  const t0 = Date.now();
  while (Date.now() - t0 < 90000) { try { const r = await fetch(URL + '/api/status'); if (r.ok) { clearTimeout(killTimer); killTimer = null; return; } } catch (e) {} await sleep(400); }
  throw new Error('server khong len');
}
async function stopServer() {
  if (!serverProc) return;
  const p = serverProc; serverProc = null;
  if (killTimer) { clearTimeout(killTimer); killTimer = null; }
  await new Promise((res) => { const t = setTimeout(() => { try { p.kill('SIGKILL'); } catch (e) {} res(); }, 4000); p.once('exit', () => { clearTimeout(t); res(); }); try { p.kill('SIGTERM'); } catch (e) { clearTimeout(t); res(); } });
  const t0 = Date.now(); while (Date.now() - t0 < 10000 && !(await portFree(PORT))) await sleep(300);
}
// GĐ391: build bằng esbuild (không qua vite — vite kẹt ở bước bundle config
// trong đợt chặn EPERM) + ghi bundle qua cat (ghi trực tiếp từ tiến trình
// node hay bị chặn). Thử dày tới khi sóng chặn xuống.
function buildEsbuild() {
  const clientDir = path.join(ROOT, 'client');
  const tmpBundle = '/tmp/bundle391_probe.js';
  const tmpHtml = '/tmp/index391_probe.html';
  for (let i = 0; i < 60; i++) {
    try { fs.unlinkSync(tmpBundle); } catch (e) {}
    try {
      execSync(`./node_modules/.bin/esbuild src/main.ts --bundle --format=esm --minify --define:import.meta.env.PROD=true 2>/dev/null | cat > ${tmpBundle}`, { cwd: clientDir, stdio: 'pipe', timeout: 60000 });
    } catch (e) { Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 8000); continue; }
    let sz = 0; try { sz = fs.statSync(tmpBundle).size; } catch (e) {}
    if (sz < 1000000) { Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 8000); continue; }
    const crypto = require('crypto');
    const h = crypto.createHash('md5').update(fs.readFileSync(tmpBundle)).digest('hex').slice(0, 8);
    const assetsDir = path.join(clientDir, 'dist', 'assets');
    const oldFiles = fs.readdirSync(assetsDir).filter((f) => f.startsWith('index-') && f.endsWith('.js'));
    for (let j = 0; j < 12; j++) {
      try {
        fs.copyFileSync(tmpBundle, path.join(assetsDir, `index-${h}.js`));
        for (const f of oldFiles) { if (f !== `index-${h}.js`) { try { fs.unlinkSync(path.join(assetsDir, f)); } catch (e) {} } }
        const htmlPath = path.join(clientDir, 'dist', 'index.html');
        const html = fs.readFileSync(htmlPath, 'utf8').replace(/\/assets\/index-[A-Za-z0-9]+\.js/, `/assets/index-${h}.js`);
        fs.writeFileSync(tmpHtml, html);
        fs.copyFileSync(tmpHtml, htmlPath);
        return h;
      } catch (e) { Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 8000); }
    }
  }
  throw new Error('buildEsbuild: khong build duoc sau 60 lan thu (EPERM)');
}
function writeRetry(p, data) {
  try { if (fs.readFileSync(p, 'utf8') === data) return; } catch (e) {}
  for (let i = 0; i < 12; i++) {
    try { fs.writeFileSync(p, data); return; }
    catch (e) { if (i === 11) throw e; Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 10000); }
  }
}
const LC1 = { elements: ['kim'], main: 'kim', count: 1, mutations: [] };
function BASE(token, name, extra) {
  return Object.assign({ token, name, classId: 'cottu', gender: 'nam', race: null, geo175: 1, realm: 'kd', tier: 1, x: 2415, y: 1400, mapId: 'lang_tan_thu', hp: 999999, mp: 9999, lifespan: 500, birthDay: -5660, ageStart: 16, stats: { khiHuyet: 500, vatCong: 300, vatPhong: 200, phapCong: 300, phapPhong: 200, tocDo: 60, minhMan: 100 }, statPoints: 0, freePoints: 0, tuVi: 99999, stones: 100000, stonesTrung: 0, stonesThuong: 0, stonesCuc: 0, inventory: {}, gearBag: {}, equipped: [], skills: [], job: null, job2: null, job3: null, linhCan: { ...LC1 }, affinity: {}, affV2: 1, bonds: {}, quests: {}, questsDone: {}, flags: {}, counters: {}, disciples: [], foundInvites: [], reformIn: [], sectTech: [], sectArts: [], sectArtsActive: [], mails: [], classRes: {}, food: 100, water: 100 }, extra || {});
}
let pass = 0, fail = 0;
function ok(name, cond, extra) { if (cond) { pass++; console.log('PASS | ' + name); } else { fail++; console.log('FAIL | ' + name + (extra ? ' | ' + extra : '')); } }
const vis = (page, id) => page.evaluate((i) => { const el = document.getElementById(i); return !!el && el.style.display !== 'none'; }, id);
const clickBtn = (page, sel) => page.evaluate((s) => { const b = document.querySelector(s); if (!b) return false; b.click(); return true; }, sel);
async function waitPanel(page, id, ms) { return waitFor(async () => (await vis(page, id)) ? true : null, ms || 15000); }
async function boardState(page) {
  return page.evaluate(() => {
    const items = Array.from(document.querySelectorAll('#noticeList .nItem')).map((b) => ({ text: b.textContent, unread: b.classList.contains('unread'), sel: b.classList.contains('sel') }));
    const content = document.getElementById('noticeContent');
    const b2 = document.getElementById('btnNews2');
    return {
      items,
      content: content ? content.textContent : '',
      contentHtml: content ? content.innerHTML : '',
      hasNew: b2 ? b2.classList.contains('hasNew') : null,
      read: JSON.parse(localStorage.getItem('ttt_notices_read_v1') || '[]'),
    };
  });
}
async function clickNoticeByText(page, sub) {
  return page.evaluate((s) => {
    const b = Array.from(document.querySelectorAll('#noticeList .nItem')).find((x) => x.textContent.includes(s));
    if (!b) return false; b.click(); return true;
  }, sub);
}

(async () => {
  ok('0a node --check server sach', (() => { try { execSync('node --check server/index.js', { cwd: ROOT, stdio: 'ignore' }); return true; } catch (e) { return false; } })());
  ok('0b tsc --noEmit sach', (() => { try { execSync('./node_modules/.bin/tsc --noEmit', { cwd: path.join(ROOT, 'client'), stdio: 'ignore' }); return true; } catch (e) { return false; } })());
  ok('0c dist bundle chua tin moi GĐ391', (() => {
    try {
      const js = fs.readdirSync(path.join(ROOT, 'client/dist/assets')).filter((f) => f.endsWith('.js')).map((f) => fs.readFileSync(path.join(ROOT, 'client/dist/assets', f), 'utf8')).join('\n');
      return js.includes('Vạn Hoa Hội sắp hết') && js.includes('Chọn máy chủ') && js.includes('ttt_notices_read_v1');
    } catch (e) { return false; }
  })());
  fs.mkdirSync(path.join(DIR, 'shot'), { recursive: true });
  const chars = { g391guest1: BASE('g391guest1', 'Khach391') };
  writeRetry(path.join(DIR, 'characters.json'), JSON.stringify(chars));
  writeRetry(path.join(DIR, 'accounts.json'), '{}');
  writeRetry(path.join(DIR, 'world.json'), '{}');
  writeRetry(path.join(DIR, 'sessions.json'), '{}');

  await startServer('main');
  const st = await (await fetch(URL + '/api/status')).json();
  ok('1a boot: 4579 quai', st.monsters === 4579, 'monsters=' + st.monsters);

  let browser = null;
  const serversPath = path.join(ROOT, 'client/src/servers.ts');
  const serversOrig = fs.readFileSync(serversPath, 'utf8');
  try {
    browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-crashpad', '--disable-crash-reporter', '--no-crashpad', '--disable-dev-shm-usage'] });

    // ---------- Chân 2: desktop, bảng từ splash ----------
    const ctx = await browser.createBrowserContext();
    const page = await ctx.newPage();
    await page.setCacheEnabled(false);
    await page.setViewport({ width: 1100, height: 800 });
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    ok('2a man chon hien ngay khi mo trang', await waitPanel(page, 'serverPanel', 20000));
    ok('2b bam nut Vao duoc', await clickBtn(page, '#btnEnterServer'));
    ok('2c man dang nhap hien sau khi chon', await waitPanel(page, 'splashMain', 10000));
    const dot0 = await page.evaluate(() => { const b = document.getElementById('btnNews2'); return b ? b.classList.contains('hasNew') : null; });
    ok('2d nut Thong bao co cham "moi" khi chua doc tin nao', dot0 === true, 'hasNew=' + dot0);
    ok('2e bam nut Thong bao mo duoc bang', await clickBtn(page, '#btnNews2') && await waitPanel(page, 'noticeBoard', 10000));
    await sleep(400);
    let bs = await boardState(page);
    console.log('BOARD capnhat:', JSON.stringify(bs.items.map((i) => i.text.slice(0, 60))));
    ok('2f tab Cap nhat: tin Chon may chu len dau, co icon 📝, chua doc (cham do)', bs.items.length >= 5 && bs.items[0].text.includes('Chọn máy chủ') && bs.items[0].text.includes('📝') && bs.items[0].unread === true, JSON.stringify(bs.items[0] || null));
    ok('2g bam tin Chon may chu -> da doc (het cham do, luu localStorage)', await clickNoticeByText(page, 'Chọn máy chủ') && await waitFor(async () => { const s = await boardState(page); return s.read.includes('gd391-server') ? s : null; }, 5000));
    bs = await boardState(page);
    ok('2h noi dung tin Chon may chu hien dung', bs.content.includes('Tinh Túc Mệnh 1') && bs.content.includes('thế giới riêng'), bs.content.slice(0, 120));
    await clickBtn(page, '#ntabThongbao');
    await sleep(400);
    bs = await boardState(page);
    console.log('BOARD thongbao:', JSON.stringify(bs.items.map((i) => i.text.slice(0, 60))));
    ok('2i tab Thong bao: tin ghim Van Hoa Hoi len dau, co 📌 + 🎉', bs.items.length >= 3 && bs.items[0].text.includes('Vạn Hoa Hội sắp hết') && bs.items[0].text.includes('📌') && bs.items[0].text.includes('🎉'), JSON.stringify(bs.items[0] || null));
    ok('2j bam tin ghim -> noi dung hien badge ghim + ngay het 16/11', await clickNoticeByText(page, 'Vạn Hoa Hội sắp hết') && await waitFor(async () => { const s = await boardState(page); return s.content.includes('16/11') ? s : null; }, 5000));
    await page.screenshot({ path: path.join(DIR, 'shot/notice_desktop_thongbao_v1.png') });
    // Đọc hết mọi tin còn lại ở cả 2 tab -> chấm "mới" phải mất
    for (const tab of ['#ntabCapnhat', '#ntabThongbao']) {
      await clickBtn(page, tab); await sleep(300);
      const titles = await page.evaluate(() => Array.from(document.querySelectorAll('#noticeList .nItem .nT')).map((e) => e.textContent));
      for (const t of titles) { await clickNoticeByText(page, t.slice(0, 25)); await sleep(150); }
    }
    bs = await boardState(page);
    ok('2k doc het moi tin -> nut Thong bao het cham "moi"', bs.hasNew === false, 'hasNew=' + bs.hasNew + ' read=' + JSON.stringify(bs.read));
    await page.reload({ waitUntil: 'domcontentloaded' });
    await sleep(500);
    const dotAfterReload = await page.evaluate(() => { const b = document.getElementById('btnNews2'); return b ? b.classList.contains('hasNew') : null; });
    ok('2l reload: van nho da doc (cham "moi" khong quay lai)', dotAfterReload === false, 'hasNew=' + dotAfterReload);
    await page.screenshot({ path: path.join(DIR, 'shot/notice_desktop_capnhat_v1.png') });
    await ctx.close();

    // ---------- Chân 3: trong game (khách) ----------
    const ctx3 = await browser.createBrowserContext();
    const p3 = await ctx3.newPage();
    await p3.setCacheEnabled(false);
    await p3.setViewport({ width: 1100, height: 800 });
    await p3.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitPanel(p3, 'serverPanel', 20000);
    await clickBtn(p3, '#btnEnterServer');
    await waitPanel(p3, 'splashMain', 10000);
    await p3.evaluate(() => localStorage.setItem('ttt_token_v1', 'g391guest1'));
    await p3.reload({ waitUntil: 'domcontentloaded' });
    await waitPanel(p3, 'splashMain', 20000);
    await clickBtn(p3, '#btnGuest');
    const inGame = await waitFor(async () => p3.evaluate(() => document.body.classList.contains('ingame')), 60000);
    ok('3a khach vao game binh thuong', !!inGame);
    ok('3b trong game: menuNewsBtn mo duoc bang thong bao', await clickBtn(p3, '#menuNewsBtn') && await waitPanel(p3, 'noticeBoard', 10000));
    await ctx3.close();

    // ---------- Chân 4: bảo trì — tin tự sinh từ bảng SERVERS ----------
    const maintSrc = serversOrig.replace(
      "{ id: 'tinh-tuc-menh-1', name: 'Tinh Túc Mệnh 1', origin: '' },",
      "{ id: 'tinh-tuc-menh-1', name: 'Tinh Túc Mệnh 1', origin: '', status: 'maintenance', maintReason: 'Nâng cấp máy chủ', maintUntil: '20:00 12/11' },"
    );
    if (maintSrc === serversOrig) throw new Error('khong va duoc servers.ts cho chan bao tri');
    fs.writeFileSync(serversPath, maintSrc);
    buildEsbuild();
    const ctxM = await browser.createBrowserContext();
    const pm = await ctxM.newPage();
    await pm.setCacheEnabled(false);
    await pm.setViewport({ width: 1100, height: 800 });
    await pm.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitPanel(pm, 'serverPanel', 20000);
    // Server đang bảo trì nên không qua được màn chọn — nhưng nút Thông báo
    // vẫn bấm được qua DOM (openNoticeBoard không cần đăng nhập): kiểm tin
    // bảo trì tự sinh hiện thật trong bảng.
    ok('4a bao tri: bam nut Thong bao (DOM) mo duoc bang', await clickBtn(pm, '#btnNews2') && await waitPanel(pm, 'noticeBoard', 10000));
    await clickBtn(pm, '#ntabThongbao');
    await sleep(400);
    const bm = await boardState(pm);
    console.log('BOARD maint:', JSON.stringify(bm.items.map((i) => i.text.slice(0, 60))));
    ok('4b bao tri: tin tu sinh "Bảo trì: Tinh Túc Mệnh 1" ghim dau, co 🛠 + 📌', bm.items.length >= 1 && bm.items[0].text.includes('Bảo trì: Tinh Túc Mệnh 1') && bm.items[0].text.includes('🛠') && bm.items[0].text.includes('📌'), JSON.stringify(bm.items[0] || null));
    ok('4c bao tri: bam tin -> noi dung hien ly do + gio mo lai 20:00 12/11', await clickNoticeByText(pm, 'Bảo trì: Tinh Túc Mệnh 1') && await waitFor(async () => { const s = await boardState(pm); return s.content.includes('Nâng cấp máy chủ') && s.content.includes('20:00 12/11') ? s : null; }, 5000));
    await pm.screenshot({ path: path.join(DIR, 'shot/notice_maint_v1.png') });
    await ctxM.close();
    fs.writeFileSync(serversPath, serversOrig);
    buildEsbuild();
    ok('4d khoi phuc servers.ts byte-identical', fs.readFileSync(serversPath, 'utf8') === serversOrig);

    // ---------- Chân 5: mobile 390px ----------
    const ctx5 = await browser.createBrowserContext();
    const p5 = await ctx5.newPage();
    await p5.setCacheEnabled(false);
    await p5.setViewport({ width: 390, height: 844, isMobile: true });
    await p5.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitPanel(p5, 'serverPanel', 20000);
    await clickBtn(p5, '#btnEnterServer');
    await waitPanel(p5, 'splashMain', 10000);
    ok('5a mobile: nut Thong bao co cham "moi"', await p5.evaluate(() => { const b = document.getElementById('btnNews2'); return b ? b.classList.contains('hasNew') : null; }) === true);
    ok('5b mobile: mo duoc bang thong bao, vua khung', await clickBtn(p5, '#btnNews2') && await waitPanel(p5, 'noticeBoard', 10000));
    await sleep(400);
    const m5 = await p5.evaluate(() => { const c = document.querySelector('.noticeCard'); if (!c) return null; const r = c.getBoundingClientRect(); return { w: Math.round(r.width), vw: window.innerWidth, fits: r.right <= window.innerWidth + 1 }; });
    ok('5c mobile: the bang nam gon trong man hinh', !!m5 && m5.fits === true, JSON.stringify(m5));
    await p5.screenshot({ path: path.join(DIR, 'shot/notice_mobile_v1.png') });
    await ctx5.close();
  } finally {
    if (browser) { try { await browser.close(); } catch (e) {} }
    try { if (fs.readFileSync(serversPath, 'utf8') !== serversOrig) { fs.writeFileSync(serversPath, serversOrig); buildEsbuild(); } } catch (e) {}
  }
  await stopServer();
  console.log(`KET QUA: ${pass} PASS / ${fail} FAIL`);
  process.exit(fail ? 1 : 0);
})().catch(async (e) => { console.error('LOI PROBE:', e); try { await stopServer(); } catch (_) {} process.exit(2); });
