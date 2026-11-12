// Probe GĐ391b — tái kiểm chân 4 (tin bảo trì tự sinh) + chân 2a/2c/3a với
// chờ dài hơn, kèm bắt lỗi console/pageerror để phân biệt lỗi game vs chậm.
// Chân 4 cần bundle với servers.ts ở trạng thái maintenance -> vá tạm +
// build vite thật (npm run build, thử lại dày khi dính EPERM), xong khôi phục.
const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const net = require('net');
const ROOT = path.join(__dirname, '..', '..');
const DIR = __dirname;
const puppeteer = require('/home/hatch/workspace/shottools/node_modules/puppeteer');
const PORT = 3943;
const URL = 'http://127.0.0.1:' + PORT;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function waitFor(fn, ms) { const t0 = Date.now(); while (Date.now() - t0 < ms) { const v = await fn(); if (v) return v; await sleep(200); } return null; }
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
function viteBuild() {
  for (let i = 0; i < 10; i++) {
    try { execSync('npm run build 2>&1 | tail -2', { cwd: path.join(ROOT, 'client'), stdio: 'pipe', timeout: 120000 }); } catch (e) { Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 10000); continue; }
    const assets = path.join(ROOT, 'client/dist/assets');
    try { if (fs.readdirSync(assets).some((f) => f.startsWith('index-') && f.endsWith('.js'))) return true; } catch (e) {}
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 10000);
  }
  throw new Error('vite build khong xong sau 10 lan');
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
const visComputed = (page, id) => page.evaluate((i) => { const el = document.getElementById(i); if (!el) return false; const cs = getComputedStyle(el); return cs.display !== 'none' && cs.visibility !== 'hidden'; }, id);
const clickBtn = (page, sel) => page.evaluate((s) => { const b = document.querySelector(s); if (!b) return false; b.click(); return true; }, sel);
async function boardState(page) {
  return page.evaluate(() => {
    const b = document.getElementById('noticeBoard');
    const items = Array.from(document.querySelectorAll('#noticeList .nItem')).map((x) => ({ text: x.textContent, unread: x.classList.contains('unread') }));
    const content = document.getElementById('noticeContent');
    return { boardDisplay: b ? getComputedStyle(b).display : 'missing', items, content: content ? content.textContent : '' };
  });
}
async function clickNoticeByText(page, sub) {
  return page.evaluate((s) => { const b = Array.from(document.querySelectorAll('#noticeList .nItem')).find((x) => x.textContent.includes(s)); if (!b) return false; b.click(); return true; }, sub);
}

(async () => {
  const chars = { g391guest1: BASE('g391guest1', 'Khach391') };
  writeRetry(path.join(DIR, 'characters.json'), JSON.stringify(chars));
  writeRetry(path.join(DIR, 'accounts.json'), '{}');
  writeRetry(path.join(DIR, 'world.json'), '{}');
  writeRetry(path.join(DIR, 'sessions.json'), '{}');
  await startServer('b');
  const st = await (await fetch(URL + '/api/status')).json();
  ok('1a boot: 4579 quai', st.monsters === 4579, 'monsters=' + st.monsters);

  const serversPath = path.join(ROOT, 'client/src/servers.ts');
  const serversOrig = fs.readFileSync(serversPath, 'utf8');
  let browser = null;
  try {
    browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-crashpad', '--disable-crash-reporter', '--no-crashpad', '--disable-dev-shm-usage'] });

    // ---------- Chân 2 (chờ dài): splash -> chọn server -> bảng ----------
    const ctx = await browser.createBrowserContext();
    const page = await ctx.newPage();
    const errs = [];
    page.on('pageerror', (e) => errs.push('pageerror: ' + String(e).slice(0, 200)));
    page.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text().slice(0, 200)); });
    await page.setCacheEnabled(false);
    await page.setViewport({ width: 1100, height: 800 });
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    ok('2a man chon hien (computed, cho 60s)', await waitFor(() => visComputed(page, 'serverPanel'), 60000));
    ok('2b bam nut Vao duoc', await clickBtn(page, '#btnEnterServer'));
    ok('2c man dang nhap hien (computed, cho 30s)', await waitFor(() => visComputed(page, 'splashMain'), 30000));
    ok('2d nut Thong bao co cham "moi"', await page.evaluate(() => { const b = document.getElementById('btnNews2'); return b ? b.classList.contains('hasNew') : null; }) === true);
    ok('2e mo bang thong bao', await clickBtn(page, '#btnNews2') && await waitFor(() => visComputed(page, 'noticeBoard'), 10000));
    await sleep(500);
    let bs = await boardState(page);
    ok('2f tab Cap nhat co tin Chon may chu', bs.items.length >= 5 && bs.items[0].text.includes('Chọn máy chủ'), JSON.stringify(bs.items[0] || null));
    console.log('LOI TRANG (chan 2):', JSON.stringify(errs.slice(0, 5)));
    await ctx.close();

    // ---------- Chân 3 (chờ dài): khách vào game ----------
    const ctx3 = await browser.createBrowserContext();
    const p3 = await ctx3.newPage();
    const errs3 = [];
    p3.on('pageerror', (e) => errs3.push('pageerror: ' + String(e).slice(0, 200)));
    await p3.setCacheEnabled(false);
    await p3.setViewport({ width: 1100, height: 800 });
    await p3.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitFor(() => visComputed(p3, 'serverPanel'), 60000);
    await clickBtn(p3, '#btnEnterServer');
    await waitFor(() => visComputed(p3, 'splashMain'), 30000);
    await p3.evaluate(() => localStorage.setItem('ttt_token_v1', 'g391guest1'));
    await p3.reload({ waitUntil: 'domcontentloaded' });
    await waitFor(() => visComputed(p3, 'splashMain'), 30000);
    await clickBtn(p3, '#btnGuest');
    const inGame = await waitFor(async () => p3.evaluate(() => document.body.classList.contains('ingame')), 120000);
    ok('3a khach vao game (cho 120s)', !!inGame);
    ok('3b trong game: menuNewsBtn mo duoc bang', await clickBtn(p3, '#menuNewsBtn') && await waitFor(() => visComputed(p3, 'noticeBoard'), 15000));
    console.log('LOI TRANG (chan 3):', JSON.stringify(errs3.slice(0, 5)));
    await ctx3.close();

    // ---------- Chân 4: bảo trì ----------
    const maintSrc = serversOrig.replace(
      "{ id: 'tinh-tuc-menh-1', name: 'Tinh Túc Mệnh 1', origin: '' },",
      "{ id: 'tinh-tuc-menh-1', name: 'Tinh Túc Mệnh 1', origin: '', status: 'maintenance', maintReason: 'Nâng cấp máy chủ', maintUntil: '20:00 12/11' },"
    );
    if (maintSrc === serversOrig) throw new Error('khong va duoc servers.ts cho chan bao tri');
    fs.writeFileSync(serversPath, maintSrc);
    viteBuild();
    const ctxM = await browser.createBrowserContext();
    const pm = await ctxM.newPage();
    const errsM = [];
    pm.on('pageerror', (e) => errsM.push('pageerror: ' + String(e).slice(0, 200)));
    pm.on('console', (m) => { if (m.type() === 'error') errsM.push('console: ' + m.text().slice(0, 200)); });
    await pm.setCacheEnabled(false);
    await pm.setViewport({ width: 1100, height: 800 });
    await pm.goto(URL, { waitUntil: 'domcontentloaded' });
    ok('4a0 man chon hien (bao tri)', await waitFor(() => visComputed(pm, 'serverPanel'), 60000));
    await sleep(1000);
    const before = await boardState(pm);
    console.log('BOARD truoc khi bam Thong bao:', JSON.stringify({ display: before.boardDisplay, n: before.items.length }));
    ok('4a bam nut Thong bao mo duoc bang (computed)', await clickBtn(pm, '#btnNews2') && await waitFor(() => visComputed(pm, 'noticeBoard'), 10000));
    await sleep(600);
    let bm0 = await boardState(pm);
    console.log('BOARD sau khi mo (tab mac dinh):', JSON.stringify(bm0.items.map((i) => i.text.slice(0, 50))));
    await clickBtn(pm, '#ntabThongbao');
    await sleep(600);
    const bm = await boardState(pm);
    console.log('BOARD thongbao (bao tri):', JSON.stringify(bm.items.map((i) => i.text.slice(0, 60))));
    ok('4b tin tu sinh "Bảo trì: Tinh Túc Mệnh 1" ghim dau, co 🛠 + 📌', bm.items.length >= 1 && bm.items[0].text.includes('Bảo trì: Tinh Túc Mệnh 1') && bm.items[0].text.includes('🛠') && bm.items[0].text.includes('📌'), JSON.stringify(bm.items[0] || null));
    ok('4c bam tin -> noi dung hien ly do + gio mo lai 20:00 12/11', await clickNoticeByText(pm, 'Bảo trì: Tinh Túc Mệnh 1') && await waitFor(async () => { const s = await boardState(pm); return s.content.includes('Nâng cấp máy chủ') && s.content.includes('20:00 12/11') ? s : null; }, 5000));
    await pm.screenshot({ path: path.join(DIR, 'shot/notice_maint_v2.png') });
    console.log('LOI TRANG (chan 4):', JSON.stringify(errsM.slice(0, 8)));
    await ctxM.close();
    fs.writeFileSync(serversPath, serversOrig);
    viteBuild();
    ok('4d khoi phuc servers.ts byte-identical + build lai', fs.readFileSync(serversPath, 'utf8') === serversOrig);
  } finally {
    if (browser) { try { await browser.close(); } catch (e) {} }
    try { if (fs.readFileSync(serversPath, 'utf8') !== serversOrig) { fs.writeFileSync(serversPath, serversOrig); viteBuild(); } } catch (e) {}
  }
  await stopServer();
  console.log(`KET QUA: ${pass} PASS / ${fail} FAIL`);
  process.exit(fail ? 1 : 0);
})().catch(async (e) => { console.error('LOI PROBE:', e); try { await stopServer(); } catch (_) {} process.exit(2); });
