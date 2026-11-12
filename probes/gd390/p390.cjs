// Probe GĐ390 — KHUNG CHỌN SERVER (1 server Tinh Túc Mệnh 1).
// Chân 0: tĩnh (ITEMS 177 · icon png 1444 · FX 85 · marker intro · zip 385 nguyên)
// Chân 1: boot 4579 quái + /api/status có header CORS cho khung chọn gọi chéo origin
// Chân 2 (browser desktop): màn chọn hiện TRƯỚC đăng nhập; 1 dòng Tinh Túc Mệnh 1;
//   số online khớp /api/status (có 1 socket node đang nối để số ≠ 0); độ trễ hiện số ms
// Chân 3: chọn server → vào game khách bình thường; reload → nhớ lựa chọn (không hiện màn chọn)
// Chân 4: đăng ký tài khoản qua UI → charPanel; reload → nhớ server + nhớ phiên (charPanel thẳng)
// Chân 5: Đổi máy chủ → về màn chọn, lựa chọn bị xóa
// Chân 6 (mobile 390px): màn chọn hiển thị đủ
// Chân 7: bảo trì (vá servers.ts + rebuild) → dòng khóa + lý do + giờ mở lại, bấm không vào
//   được; khôi phục + rebuild → lại vào được
const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const net = require('net');
const crypto = require('crypto');
const ROOT = path.join(__dirname, '..', '..');
const DIR = __dirname;
const { io } = require(path.join(ROOT, 'client/node_modules/socket.io-client'));
const puppeteer = require('/home/hatch/workspace/shottools/node_modules/puppeteer');
const PORT = 3940;
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
  killTimer = setTimeout(() => { try { serverProc.kill('SIGKILL'); } catch (e) {} }, 1500000);
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
function extractBlock(src, start) {
  const i = src.indexOf(start); if (i < 0) throw new Error('khong thay ' + start);
  let d = 0, j = src.indexOf('{', i);
  for (; j < src.length; j++) { const c = src[j]; if (c === '{') d++; else if (c === '}') { d--; if (d === 0) break; } }
  return src.slice(src.indexOf('{', i), j + 1);
}
const LC1 = { elements: ['kim'], main: 'kim', count: 1, mutations: [] };
function BASE(token, name, extra) {
  return Object.assign({ token, name, classId: 'cottu', gender: 'nam', race: null, geo175: 1, realm: 'kd', tier: 1, x: 2415, y: 1400, mapId: 'lang_tan_thu', hp: 999999, mp: 9999, lifespan: 500, birthDay: -5660, ageStart: 16, stats: { khiHuyet: 500, vatCong: 300, vatPhong: 200, phapCong: 300, phapPhong: 200, tocDo: 60, minhMan: 100 }, statPoints: 0, freePoints: 0, tuVi: 99999, stones: 100000, stonesTrung: 0, stonesThuong: 0, stonesCuc: 0, inventory: {}, gearBag: {}, equipped: [], skills: [], job: null, job2: null, job3: null, linhCan: { ...LC1 }, affinity: {}, affV2: 1, bonds: {}, quests: {}, questsDone: {}, flags: {}, counters: {}, disciples: [], foundInvites: [], reformIn: [], sectTech: [], sectArts: [], sectArtsActive: [], mails: [], classRes: {}, food: 100, water: 100 }, extra || {});
}
let pass = 0, fail = 0;
function ok(name, cond, extra) { if (cond) { pass++; console.log('PASS | ' + name); } else { fail++; console.log('FAIL | ' + name + (extra ? ' | ' + extra : '')); } }
const vis = (page, id) => page.evaluate((i) => { const el = document.getElementById(i); return !!el && el.style.display !== 'none'; }, id);
const clickBtn = (page, sel) => page.evaluate((s) => { const b = document.querySelector(s); if (!b) return false; b.click(); return true; }, sel);
const lsGet = (page, k) => page.evaluate((key) => window.localStorage.getItem(key), k);
async function waitPanel(page, id, ms) { return waitFor(async () => (await vis(page, id)) ? true : null, ms || 15000); }

(async () => {
  // ---------- Chân 0: tĩnh ----------
  const srvSrc = fs.readFileSync(path.join(ROOT, 'server/index.js'), 'utf8');
  const ITEMS = eval('(' + extractBlock(srvSrc, 'const ITEMS = {') + ')');
  ok('0a ITEMS server = 177 loai', Object.keys(ITEMS).length === 177, 'dem=' + Object.keys(ITEMS).length);
  const iconCount = fs.readdirSync(path.join(ROOT, 'client/public/icons')).filter((f) => f.endsWith('.png')).length;
  ok('0b icon chieu public = 1444 png', iconCount === 1444, 'dem=' + iconCount);
  const fxCount = fs.readdirSync(path.join(ROOT, 'client/public/sprites/fx')).length;
  ok('0c FX = 85', fxCount === 85, 'dem=' + fxCount);
  const cliSrc = fs.readFileSync(path.join(ROOT, 'client/src/main.ts'), 'utf8');
  ok('0d marker ttt_intro_v1 con trong client', cliSrc.includes('ttt_intro_v1'));
  ok('0e servers.ts co 1 server Tinh Tuc Menh 1', fs.readFileSync(path.join(ROOT, 'client/src/servers.ts'), 'utf8').includes("name: 'Tinh Túc Mệnh 1'"));
  const zipPath = path.join(ROOT, '..', 'tap-tanh-tu-tien-mmo_GD235-385.zip');
  const zipMd5 = crypto.createHash('md5').update(fs.readFileSync(zipPath)).digest('hex');
  ok('0f zip GD235-385 nguyen ven (khong dung)', zipMd5 === '66d4e90e6c97549a688bd5f21b78753e', zipMd5);
  ok('0g node --check server sach', (() => { try { execSync('node --check server/index.js', { cwd: ROOT, stdio: 'ignore' }); return true; } catch (e) { return false; } })());

  // ---------- Fixture ----------
  fs.mkdirSync(path.join(DIR, 'shot'), { recursive: true });
  const chars = {
    g390guest01: BASE('g390guest01', 'Khach390'),
    g390dem001: BASE('g390dem001', 'Dem390'),
  };
  fs.writeFileSync(path.join(DIR, 'characters.json'), JSON.stringify(chars));
  fs.writeFileSync(path.join(DIR, 'accounts.json'), '{}');
  fs.writeFileSync(path.join(DIR, 'world.json'), '{}');
  fs.writeFileSync(path.join(DIR, 'sessions.json'), '{}');

  // ---------- Chân 1: boot ----------
  await startServer('main');
  const st = await (await fetch(URL + '/api/status')).json();
  ok('1a boot: 4579 quai', st.monsters === 4579, JSON.stringify(st).slice(0, 120));
  const corsRes = await fetch(URL + '/api/status', { headers: { Origin: 'http://example.com' } });
  ok('1b /api/status co header CORS * (khung chon goi cheo origin)', corsRes.headers.get('access-control-allow-origin') === '*', String(corsRes.headers.get('access-control-allow-origin')));

  // 1 socket node nối sẵn để số online ≠ 0 khi kiểm màn chọn
  const demSock = io(URL, { transports: ['websocket'] });
  const demReady = await new Promise((res) => {
    demSock.on('connect', () => demSock.emit('hello', { token: 'g390dem001' }));
    demSock.on('welcome', () => res(true));
    setTimeout(() => res(false), 15000);
  });
  ok('1c socket dem noi san (players>0)', demReady);
  const st2 = await (await fetch(URL + '/api/status')).json();
  ok('1d /api/status players = 9 (8 bot demo + 1 socket dem)', st2.players === 9, 'players=' + st2.players);

  let browser = null;
  try {
    browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });

    // ---------- Chân 2: màn chọn hiện trước đăng nhập ----------
    const ctx = await browser.createBrowserContext();
    const page = await ctx.newPage();
    await page.setViewport({ width: 1100, height: 800 });
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    ok('2a man chon hien ngay khi mo trang', await waitPanel(page, 'serverPanel', 20000));
    ok('2b man dang nhap chua hien', !(await vis(page, 'splashMain')));
    const listTxt = await page.evaluate(() => document.getElementById('serverList')?.innerText || '');
    ok('2c chi 1 dong Tinh Tuc Menh 1', (listTxt.match(/Tinh Túc Mệnh 1/g) || []).length === 1, JSON.stringify(listTxt));
    const metaTxt = await waitFor(async () => {
      const t = await page.evaluate(() => document.querySelector('.serverMeta')?.textContent || '');
      return /người đang chơi/.test(t) ? t : null;
    }, 15000);
    ok('2d so online hien tren dong server', !!metaTxt, String(metaTxt));
    const panelPlayers = metaTxt ? Number((metaTxt.match(/(\d+) người/) || [])[1]) : -1;
    const st3 = await (await fetch(URL + '/api/status')).json();
    ok('2e so online khop /api/status', panelPlayers === st3.players, `panel=${panelPlayers} api=${st3.players}`);
    ok('2f do tre hien dang ~ms (uoc luong HTTP)', /~\d+ms/.test(metaTxt || ''), String(metaTxt));
    await page.screenshot({ path: path.join(DIR, 'shot/server_desktop_v1.png') });

    // ---------- Chân 3: chọn server → vào game khách; reload nhớ lựa chọn ----------
    ok('3a bam Vao duoc', await clickBtn(page, '[data-server-enter="tinh-tuc-menh-1"]'));
    ok('3b man dang nhap hien sau khi chon', await waitPanel(page, 'splashMain', 10000));
    ok('3c man chon an sau khi chon', !(await vis(page, 'serverPanel')));
    ok('3d lua chon nho o localStorage', (await lsGet(page, 'ttt_server_v1')) === 'tinh-tuc-menh-1');
    // GĐ390: token khách phải đặt TRƯỚC khi game đọc (game đọc ttt_token_v1 lúc
    // mở trang) — đặt xong tải lại trang rồi mới bấm Chơi nhanh.
    await page.evaluate(() => localStorage.setItem('ttt_token_v1', 'g390guest01'));
    await page.reload({ waitUntil: 'domcontentloaded' });
    ok('3d2 sau dat token: thang man dang nhap (da nho server)', await waitFor(async () => (await vis(page, 'splashMain')) && !(await vis(page, 'serverPanel')), 20000));
    await clickBtn(page, '#btnGuest');
    const inGame = await waitFor(async () => page.evaluate(() => document.body.classList.contains('ingame')), 60000);
    ok('3e khach vao game binh thuong qua server da chon', !!inGame);
    await page.reload({ waitUntil: 'domcontentloaded' });
    ok('3f reload: khong hien man chon (da nho)', await waitFor(async () => (await vis(page, 'splashMain')) && !(await vis(page, 'serverPanel')), 20000));
    ok('3g reload: lua chon van con', (await lsGet(page, 'ttt_server_v1')) === 'tinh-tuc-menh-1');

    // ---------- Chân 4: đăng ký tài khoản qua UI; reload nhớ server + phiên ----------
    ok('4a mo form dang ky', await clickBtn(page, '#btnShowRegister') && await waitPanel(page, 'authPanel', 10000));
    await page.type('#authUser', 'acc390x');
    await page.type('#authPass', 'matkhau390');
    await clickBtn(page, '#authSubmit');
    ok('4b dang ky xong hien danh sach nhan vat', await waitPanel(page, 'charPanel', 20000));
    const splashUser = await page.evaluate(() => document.getElementById('splashUser')?.textContent || '');
    ok('4c splashUser dung ten tai khoan moi', splashUser.includes('acc390x'), splashUser);
    await page.reload({ waitUntil: 'domcontentloaded' });
    ok('4d reload: thang charPanel (nho server + nho phien)', await waitFor(async () => (await vis(page, 'charPanel')) && !(await vis(page, 'serverPanel')), 25000));

    // ---------- Chân 5: Đổi máy chủ ----------
    ok('5a bam Doi may chu tu charPanel', await clickBtn(page, '#btnChangeServer2') && await waitPanel(page, 'serverPanel', 10000));
    ok('5b lua chon bi xoa khoi localStorage', (await lsGet(page, 'ttt_server_v1')) === null);
    ok('5c phien tai khoan van con (doi server khong dang xuat tai khoan)', (await lsGet(page, 'ttt_session_v1')) !== null);
    await ctx.close();

    // ---------- Chân 6: mobile 390px ----------
    const ctxM = await browser.createBrowserContext();
    const mp = await ctxM.newPage();
    await mp.setViewport({ width: 390, height: 844, isMobile: true });
    await mp.goto(URL, { waitUntil: 'domcontentloaded' });
    ok('6a mobile: man chon hien', await waitPanel(mp, 'serverPanel', 20000));
    const rowW = await mp.evaluate(() => { const r = document.querySelector('.serverRow'); return r ? r.getBoundingClientRect().width : -1; });
    ok('6b mobile: dong server vua khung 390px', rowW > 0 && rowW <= 390, 'w=' + rowW);
    await mp.screenshot({ path: path.join(DIR, 'shot/server_mobile_v1.png') });
    await ctxM.close();
  } finally {
    if (browser) { try { await browser.close(); } catch (e) {} }
  }
  try { demSock.disconnect(); } catch (e) {}
  await stopServer();

  // ---------- Chân 7: bảo trì (vá tạm servers.ts + rebuild, rồi khôi phục) ----------
  const srvFile = path.join(ROOT, 'client/src/servers.ts');
  const srvOrig = fs.readFileSync(srvFile, 'utf8');
  const srvMaint = srvOrig.replace(
    "{ id: 'tinh-tuc-menh-1', name: 'Tinh Túc Mệnh 1', origin: '' },",
    "{ id: 'tinh-tuc-menh-1', name: 'Tinh Túc Mệnh 1', origin: '', status: 'maintenance', maintReason: 'Nâng cấp máy chủ', maintUntil: '20:00 12/11' },",
  );
  if (srvMaint === srvOrig) { ok('7x va tam servers.ts sang bao tri', false, 'khong thay dong can va'); }
  else {
    try {
      fs.writeFileSync(srvFile, srvMaint);
      execSync('npm run build', { cwd: path.join(ROOT, 'client'), stdio: 'ignore' });
      await startServer('maint');
      let browser2 = null;
      try {
        browser2 = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
        const ctx2 = await browser2.createBrowserContext();
        const page2 = await ctx2.newPage();
        await page2.setViewport({ width: 1100, height: 800 });
        await page2.goto(URL, { waitUntil: 'domcontentloaded' });
        ok('7a bao tri: man chon van hien', await waitPanel(page2, 'serverPanel', 20000));
        const metaM = await waitFor(async () => {
          const t = await page2.evaluate(() => document.querySelector('.serverMeta')?.textContent || '');
          return /Nâng cấp máy chủ/.test(t) ? t : null;
        }, 10000);
        ok('7b bao tri: hien ly do + gio mo lai', !!metaM && metaM.includes('Nâng cấp máy chủ') && metaM.includes('20:00 12/11'), String(metaM));
        const btnState = await page2.evaluate(() => { const b = document.querySelector('[data-server-enter]'); return b ? { disabled: b.disabled, text: b.textContent } : null; });
        ok('7c bao tri: nut Vao bi khoa', !!btnState && btnState.disabled === true && btnState.text === 'Bảo trì', JSON.stringify(btnState));
        await page2.evaluate(() => { const b = document.querySelector('[data-server-enter]'); if (b) b.click(); });
        await sleep(2000);
        ok('7d bao tri: bam nut khoa khong vao duoc', !(await vis(page2, 'splashMain')) && (await vis(page2, 'serverPanel')));
        await page2.screenshot({ path: path.join(DIR, 'shot/server_maint_v1.png') });
        await ctx2.close();
      } finally {
        if (browser2) { try { await browser2.close(); } catch (e) {} }
      }
      await stopServer();
    } finally {
      // GĐ390: khôi phục servers.ts + build lại bằng mọi giá (cây phải sạch)
      fs.writeFileSync(srvFile, srvOrig);
      execSync('npm run build', { cwd: path.join(ROOT, 'client'), stdio: 'ignore' });
    }
    ok('7e servers.ts da khoi phuc ve online', fs.readFileSync(srvFile, 'utf8') === srvOrig);
    // Kiểm lại sau khôi phục: dòng online + bấm vào được
    await startServer('restored');
    let browser3 = null;
    try {
      browser3 = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
      const ctx3 = await browser3.createBrowserContext();
      const page3 = await ctx3.newPage();
      await page3.setViewport({ width: 1100, height: 800 });
      await page3.goto(URL, { waitUntil: 'domcontentloaded' });
      ok('7f sau khoi phuc: man chon hien', await waitPanel(page3, 'serverPanel', 20000));
      const metaR = await waitFor(async () => {
        const t = await page3.evaluate(() => document.querySelector('.serverMeta')?.textContent || '');
        return /người đang chơi/.test(t) ? t : null;
      }, 15000);
      ok('7g sau khoi phuc: dong online tro lai', !!metaR, String(metaR));
      ok('7h sau khoi phuc: bam Vao duoc', await clickBtn(page3, '[data-server-enter="tinh-tuc-menh-1"]') && await waitPanel(page3, 'splashMain', 10000));
      await ctx3.close();
    } finally {
      if (browser3) { try { await browser3.close(); } catch (e) {} }
    }
    await stopServer();
  }

  console.log(`\nKET QUA: ${pass} PASS / ${fail} FAIL`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error('PROBE CRASH:', e); process.exit(2); });
