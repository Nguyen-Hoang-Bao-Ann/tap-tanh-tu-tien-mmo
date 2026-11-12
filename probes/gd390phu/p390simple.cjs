// Probe GĐ390-sửa select lần 2 — màn chọn server CHỈ tên + trạng thái.
// Chân 1: boot 4579 quái
// Chân 2 (desktop 1100x800): select 1 lựa chọn '🟢 Tinh Túc Mệnh 1' (KHÔNG số người, KHÔNG ms);
//   dòng chi tiết '🟢 Đang hoạt động'; bấm "Vào" → splashMain; serverMode gỡ
// Chân 3: nhớ lựa chọn sau reload; khách vào game bình thường qua server đã chọn
// Chân 4: bảo trì (vá tạm servers.ts + build lại): lựa chọn vẫn hiện '🔴 … — Đang bảo trì',
//   nút "Vào" khóa + hiện lý do/giờ mở lại; khôi phục file byte-identical + build lại
// Chân 5 (mobile 390x844): select + chi tiết + nút Vào vừa khung; chụp
const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const net = require('net');
const ROOT = path.join(__dirname, '..', '..');
const DIR = __dirname;
const puppeteer = require('/home/hatch/workspace/shottools/node_modules/puppeteer');
const PORT = 3941;
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
const LC1 = { elements: ['kim'], main: 'kim', count: 1, mutations: [] };
function BASE(token, name, extra) {
  return Object.assign({ token, name, classId: 'cottu', gender: 'nam', race: null, geo175: 1, realm: 'kd', tier: 1, x: 2415, y: 1400, mapId: 'lang_tan_thu', hp: 999999, mp: 9999, lifespan: 500, birthDay: -5660, ageStart: 16, stats: { khiHuyet: 500, vatCong: 300, vatPhong: 200, phapCong: 300, phapPhong: 200, tocDo: 60, minhMan: 100 }, statPoints: 0, freePoints: 0, tuVi: 99999, stones: 100000, stonesTrung: 0, stonesThuong: 0, stonesCuc: 0, inventory: {}, gearBag: {}, equipped: [], skills: [], job: null, job2: null, job3: null, linhCan: { ...LC1 }, affinity: {}, affV2: 1, bonds: {}, quests: {}, questsDone: {}, flags: {}, counters: {}, disciples: [], foundInvites: [], reformIn: [], sectTech: [], sectArts: [], sectArtsActive: [], mails: [], classRes: {}, food: 100, water: 100 }, extra || {});
}
let pass = 0, fail = 0;
function ok(name, cond, extra) { if (cond) { pass++; console.log('PASS | ' + name); } else { fail++; console.log('FAIL | ' + name + (extra ? ' | ' + extra : '')); } }
const vis = (page, id) => page.evaluate((i) => { const el = document.getElementById(i); return !!el && el.style.display !== 'none'; }, id);
const clickBtn = (page, sel) => page.evaluate((s) => { const b = document.querySelector(s); if (!b) return false; b.click(); return true; }, sel);
async function waitPanel(page, id, ms) { return waitFor(async () => (await vis(page, id)) ? true : null, ms || 15000); }
async function selectState(page) {
  return page.evaluate(() => {
    const sel = document.getElementById('serverSelect');
    const det = document.getElementById('serverDetail');
    const btn = document.getElementById('btnEnterServer');
    const p = document.getElementById('serverPanel');
    if (!sel || !det || !btn || !p) return null;
    const r = p.getBoundingClientRect();
    return {
      options: Array.from(sel.options).map((o) => o.textContent),
      value: sel.value,
      detail: det.textContent,
      enterDisabled: btn.disabled,
      enterText: btn.textContent,
      panelH: Math.round(r.height), panelCenterY: Math.round(r.top + r.height / 2), vh: window.innerHeight,
      serverMode: document.getElementById('splashScreen').classList.contains('serverMode'),
    };
  });
}
// GĐ390-sửa select lần 2: build chống đợt chặn ghi EPERM của sandbox —
// vite build thường chết EPERM ngẫu nhiên khi copy public/ vào dist.
// Workaround: build bundle bằng config tạm publicDir:false + emptyOutDir:false,
// rồi rsync public/ → dist/ (lặp tới khi sạch), xong xóa config tạm.
function buildClient() {
  const cfg = path.join(ROOT, 'client', 'vite.config.nopublic.ts');
  fs.writeFileSync(cfg, "import { defineConfig } from 'vite';\nexport default defineConfig({ publicDir: false, build: { emptyOutDir: false } });\n");
  try {
    execSync('./node_modules/.bin/vite build --config vite.config.nopublic.ts', { cwd: path.join(ROOT, 'client'), stdio: 'pipe' });
    for (let i = 0; i < 6; i++) {
      try { execSync('rsync -a --ignore-existing public/ dist/', { cwd: path.join(ROOT, 'client'), stdio: 'pipe' }); break; }
      catch (e) { if (i === 5) throw e; Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 20000); }
    }
  } finally { try { fs.unlinkSync(cfg); } catch (e) {} }
}

(async () => {
  ok('0a node --check server sach', (() => { try { execSync('node --check server/index.js', { cwd: ROOT, stdio: 'ignore' }); return true; } catch (e) { return false; } })());
  ok('0b dist co serverSelect, khong con id serverList', (() => { const d = fs.readFileSync(path.join(ROOT, 'client/dist/index.html'), 'utf8'); return d.includes('id="serverSelect"') && !d.includes('id="serverList"'); })());
  ok('0c bundle co "Dang hoat dong", khong con "nguoi dang choi"', (() => {
    const js = fs.readdirSync(path.join(ROOT, 'client/dist/assets')).filter((f) => f.endsWith('.js')).map((f) => fs.readFileSync(path.join(ROOT, 'client/dist/assets', f), 'utf8')).join('\n');
    return js.includes('Đang hoạt động') && !js.includes('người đang chơi');
  })());
  fs.mkdirSync(path.join(DIR, 'shot'), { recursive: true });
  // GĐ390-sửa select lần 2: đợt chặn ghi EPERM của sandbox tới theo cơn —
  // ghi fixture cũng phải thử lại, không chết ngay lần đầu.
  function writeRetry(p, data) {
    // Bỏ qua ghi nếu nội dung đã đúng (đỡ dính đợt chặn EPERM theo cơn)
    try { if (fs.readFileSync(p, 'utf8') === data) return; } catch (e) {}
    for (let i = 0; i < 12; i++) {
      try { fs.writeFileSync(p, data); return; }
      catch (e) { if (i === 11) throw e; Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 10000); }
    }
  }
  const chars = { g390pguest1: BASE('g390pguest1', 'Khach390P') };
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
    // GĐ390-sửa select lần 2: đợt chặn ghi EPERM của sandbox làm crashpad của
    // Chrome chết lúc khởi động — tắt crash reporter + dùng /tmp làm thư mục tạm.
    browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-crashpad', '--disable-crash-reporter', '--no-crashpad', '--disable-dev-shm-usage'] });

    // ---------- Chân 2: desktop ----------
    const ctx = await browser.createBrowserContext();
    const page = await ctx.newPage();
    await page.setCacheEnabled(false);
    await page.setViewport({ width: 1100, height: 800 });
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    ok('2a man chon hien ngay khi mo trang', await waitPanel(page, 'serverPanel', 20000));
    const st2 = await waitFor(async () => { const s = await selectState(page); return s && /Đang hoạt động/.test(s.detail) ? s : null; }, 20000);
    console.log('STATE desktop:', JSON.stringify(st2));
    ok('2b select co dung 1 lua chon, nhan chi ten + trang thai', !!st2 && st2.options.length === 1 && st2.options[0] === '🟢 Tinh Túc Mệnh 1', st2 ? JSON.stringify(st2.options) : 'null');
    ok('2c lua chon mac dinh la server da nho/dau tien', !!st2 && st2.value === 'tinh-tuc-menh-1', st2 ? st2.value : 'null');
    ok('2d dong chi tiet chi "Dang hoat dong", khong so nguoi/do tre', !!st2 && st2.detail === '🟢 Đang hoạt động', st2 ? st2.detail : 'null');
    ok('2e nut Vao bat (khong khoa)', !!st2 && st2.enterDisabled === false && st2.enterText === 'Vào', st2 ? `disabled=${st2.enterDisabled} text=${st2.enterText}` : 'null');
    ok('2f panel gon (< 40vh) + nam giua man hinh', !!st2 && st2.panelH < 0.40 * st2.vh && Math.abs(st2.panelCenterY - st2.vh / 2) <= 150, st2 ? `h=${st2.panelH} centerY=${st2.panelCenterY} vh=${st2.vh}` : 'null');
    // Bấm ô select để xổ danh sách (native picker) — chụp lúc xổ
    const box = await page.evaluate(() => { const s = document.getElementById('serverSelect'); const r = s.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
    await page.mouse.click(box.x, box.y);
    await sleep(700);
    await page.screenshot({ path: path.join(DIR, 'shot/server_select_simple_open_desktop_v1.png') });
    await page.keyboard.press('Escape');
    await sleep(300);
    await page.screenshot({ path: path.join(DIR, 'shot/server_select_simple_desktop_v1.png') });

    // ---------- Chân 3: Vào → nhớ lựa chọn → khách vào game ----------
    ok('3a bam nut Vao duoc', await clickBtn(page, '#btnEnterServer'));
    ok('3b man dang nhap hien sau khi chon', await waitPanel(page, 'splashMain', 10000));
    const g3 = await page.evaluate(() => { const s = document.getElementById('splashScreen'); return { serverMode: s.classList.contains('serverMode'), alignItems: getComputedStyle(s).alignItems }; });
    ok('3c roi man chon: serverMode go, splash ve don day (flex-end)', g3.serverMode === false && g3.alignItems === 'flex-end', JSON.stringify(g3));
    ok('3d localStorage nho dung server', await page.evaluate(() => localStorage.getItem('ttt_server_v1') === 'tinh-tuc-menh-1'));
    await page.evaluate(() => localStorage.setItem('ttt_token_v1', 'g390pguest1'));
    await page.reload({ waitUntil: 'domcontentloaded' });
    ok('3e sau dat token: thang man dang nhap (da nho server)', await waitFor(async () => (await vis(page, 'splashMain')) && !(await vis(page, 'serverPanel')), 20000));
    await clickBtn(page, '#btnGuest');
    const inGame = await waitFor(async () => page.evaluate(() => document.body.classList.contains('ingame')), 60000);
    ok('3f khach vao game binh thuong qua server da chon', !!inGame);
    await ctx.close();

    // ---------- Chân 4: bảo trì ----------
    const maintSrc = serversOrig.replace(
      "{ id: 'tinh-tuc-menh-1', name: 'Tinh Túc Mệnh 1', origin: '' },",
      "{ id: 'tinh-tuc-menh-1', name: 'Tinh Túc Mệnh 1', origin: '', status: 'maintenance', maintReason: 'Nâng cấp máy chủ', maintUntil: '20:00 12/11' },"
    );
    if (maintSrc === serversOrig) throw new Error('khong va duoc servers.ts cho chan bao tri');
    fs.writeFileSync(serversPath, maintSrc);
    buildClient();
    const ctxM2 = await browser.createBrowserContext();
    const mp2 = await ctxM2.newPage();
    await mp2.setCacheEnabled(false);
    await mp2.setViewport({ width: 1100, height: 800 });
    await mp2.goto(URL, { waitUntil: 'domcontentloaded' });
    ok('4a bao tri: man chon hien', await waitPanel(mp2, 'serverPanel', 20000));
    const st4 = await waitFor(async () => { const s = await selectState(mp2); return s && /Đang bảo trì/.test(s.detail) ? s : null; }, 15000);
    console.log('STATE maint:', JSON.stringify(st4));
    ok('4b bao tri: lua chon van hien trong danh sach, chi ten + trang thai', !!st4 && st4.options.length === 1 && st4.options[0] === '🔴 Tinh Túc Mệnh 1 — Đang bảo trì', st4 ? JSON.stringify(st4.options) : 'null');
    ok('4c bao tri: dong chi tiet hien ly do + gio mo lai', !!st4 && /Nâng cấp máy chủ/.test(st4.detail) && /20:00 12\/11/.test(st4.detail), st4 ? st4.detail : 'null');
    ok('4d bao tri: nut Vao khoa, ghi Bao tri', !!st4 && st4.enterDisabled === true && st4.enterText === 'Bảo trì', st4 ? `disabled=${st4.enterDisabled} text=${st4.enterText}` : 'null');
    await clickBtn(mp2, '#btnEnterServer');
    await sleep(500);
    ok('4e bao tri: bam nut khoa khong vao duoc (van o man chon)', await vis(mp2, 'serverPanel'));
    await mp2.screenshot({ path: path.join(DIR, 'shot/server_select_simple_maint_v1.png') });
    await ctxM2.close();
    // Khôi phục servers.ts byte-identical + build lại
    fs.writeFileSync(serversPath, serversOrig);
    buildClient();
    ok('4f khoi phuc servers.ts byte-identical', fs.readFileSync(serversPath, 'utf8') === serversOrig);

    // ---------- Chân 5: mobile 390px ----------
    const ctxM = await browser.createBrowserContext();
    const mp = await ctxM.newPage();
    await mp.setCacheEnabled(false);
    await mp.setViewport({ width: 390, height: 844, isMobile: true });
    await mp.goto(URL, { waitUntil: 'domcontentloaded' });
    ok('5a mobile: man chon hien', await waitPanel(mp, 'serverPanel', 20000));
    const st5 = await waitFor(async () => { const s = await selectState(mp); return s && /Đang hoạt động/.test(s.detail) ? s : null; }, 20000);
    console.log('STATE mobile:', JSON.stringify(st5));
    ok('5b mobile: select 1 lua chon + nut Vao bat, khong so nguoi/do tre', !!st5 && st5.options.length === 1 && st5.options[0] === '🟢 Tinh Túc Mệnh 1' && st5.enterDisabled === false, st5 ? JSON.stringify(st5) : 'null');
    ok('5c mobile: panel gon + nam giua man hinh', !!st5 && st5.panelH < 0.40 * st5.vh && Math.abs(st5.panelCenterY - st5.vh / 2) <= 150, st5 ? `h=${st5.panelH} centerY=${st5.panelCenterY} vh=${st5.vh}` : 'null');
    const boxM = await mp.evaluate(() => { const s = document.getElementById('serverSelect'); const r = s.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
    await mp.touchscreen.tap(boxM.x, boxM.y);
    await sleep(700);
    await mp.screenshot({ path: path.join(DIR, 'shot/server_select_simple_open_mobile_v1.png') });
    await mp.keyboard.press('Escape');
    await sleep(300);
    await mp.screenshot({ path: path.join(DIR, 'shot/server_select_simple_mobile_v1.png') });
    await ctxM.close();
  } finally {
    if (browser) { try { await browser.close(); } catch (e) {} }
    // An toàn: đảm bảo servers.ts luôn được khôi phục dù probe lỗi giữa chừng
    try { if (fs.readFileSync(serversPath, 'utf8') !== serversOrig) { fs.writeFileSync(serversPath, serversOrig); buildClient(); } } catch (e) {}
  }
  await stopServer();
  console.log(`KET QUA: ${pass} PASS / ${fail} FAIL`);
  process.exit(fail ? 1 : 0);
})().catch(async (e) => { console.error('LOI PROBE:', e); try { await stopServer(); } catch (_) {} process.exit(2); });
