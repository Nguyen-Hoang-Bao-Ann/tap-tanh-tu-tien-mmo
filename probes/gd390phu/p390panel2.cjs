// Probe GĐ390-sửa panel lần 2 — panel GỌN như bản đầu, chỉ căn giữa màn hình theo chiều dọc.
// Chân 1: boot 4579 quái
// Chân 2 (desktop 1100x800): đo hình học #serverPanel — cao ≥ 55vh, tâm panel gần tâm màn hình,
//   class serverMode có trên #splashScreen; chụp server_desktop_v3.png
// Chân 3: bấm Vào → splashMain; class serverMode gỡ (panel khác vẫn dồn đáy); khách vào game bình thường
// Chân 4 (mobile 390x844): đo hình học tương tự; chụp server_mobile_v3.png
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
async function panelGeo(page) {
  return page.evaluate(() => {
    const p = document.getElementById('serverPanel');
    const s = document.getElementById('splashScreen');
    if (!p || !s) return null;
    const r = p.getBoundingClientRect();
    const cs = getComputedStyle(s);
    return { top: r.top, height: r.height, bottom: r.bottom, centerY: r.top + r.height / 2, vh: window.innerHeight, vw: window.innerWidth, serverMode: s.classList.contains('serverMode'), alignItems: cs.alignItems, display: getComputedStyle(p).display };
  });
}
function checkGeo(g, tag) {
  ok(tag + ': panel gon (< 40vh, cao bang noi dung)', g.height < 0.40 * g.vh, `h=${Math.round(g.height)} vh=${g.vh}`);
  ok(tag + ': panel khong qua thap (> 120px)', g.height > 120, `h=${Math.round(g.height)}`);
  ok(tag + ': tam panel gan tam man hinh (lech <= 150px)', Math.abs(g.centerY - g.vh / 2) <= 150, `centerY=${Math.round(g.centerY)} tam=${g.vh / 2}`);
  ok(tag + ': panel nam tron trong man hinh', g.top >= 0 && g.bottom <= g.vh, `top=${Math.round(g.top)} bottom=${Math.round(g.bottom)}`);
  ok(tag + ': splashScreen co class serverMode', g.serverMode === true, 'serverMode=' + g.serverMode);
  ok(tag + ': splashScreen can giua (align-items center)', g.alignItems === 'center', g.alignItems);
  ok(tag + ': panel hien dang flex column', g.display === 'flex', g.display);
}

(async () => {
  ok('0a node --check server sach', (() => { try { execSync('node --check server/index.js', { cwd: ROOT, stdio: 'ignore' }); return true; } catch (e) { return false; } })());
  ok('0b dist co CSS moi (serverMode, khong con min-height 62vh)', (() => { const d = fs.readFileSync(path.join(ROOT, 'client/dist/index.html'), 'utf8'); return d.includes('serverMode') && !d.includes('min-height: 62vh'); })());
  fs.mkdirSync(path.join(DIR, 'shot'), { recursive: true });
  const chars = { g390pguest1: BASE('g390pguest1', 'Khach390P') };
  fs.writeFileSync(path.join(DIR, 'characters.json'), JSON.stringify(chars));
  fs.writeFileSync(path.join(DIR, 'accounts.json'), '{}');
  fs.writeFileSync(path.join(DIR, 'world.json'), '{}');
  fs.writeFileSync(path.join(DIR, 'sessions.json'), '{}');

  await startServer('main');
  const st = await (await fetch(URL + '/api/status')).json();
  ok('1a boot: 4579 quai', st.monsters === 4579, 'monsters=' + st.monsters);

  let browser = null;
  try {
    browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });

    // ---------- Chân 2: desktop ----------
    const ctx = await browser.createBrowserContext();
    const page = await ctx.newPage();
    await page.setViewport({ width: 1100, height: 800 });
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    ok('2a man chon hien ngay khi mo trang', await waitPanel(page, 'serverPanel', 20000));
    await waitFor(async () => { const t = await page.evaluate(() => document.querySelector('.serverMeta')?.textContent || ''); return /người đang chơi/.test(t) ? true : null; }, 15000);
    const g2 = await panelGeo(page);
    console.log('GEO desktop:', JSON.stringify(g2));
    checkGeo(g2, '2b desktop');
    await page.screenshot({ path: path.join(DIR, 'shot/server_desktop_v3.png') });

    // ---------- Chân 3: chọn server → khách vào game ----------
    ok('3a bam Vao duoc', await clickBtn(page, '[data-server-enter="tinh-tuc-menh-1"]'));
    ok('3b man dang nhap hien sau khi chon', await waitPanel(page, 'splashMain', 10000));
    const g3 = await page.evaluate(() => { const s = document.getElementById('splashScreen'); return { serverMode: s.classList.contains('serverMode'), alignItems: getComputedStyle(s).alignItems }; });
    ok('3c roi man chon: serverMode go, splash ve don day (flex-end)', g3.serverMode === false && g3.alignItems === 'flex-end', JSON.stringify(g3));
    await page.evaluate(() => localStorage.setItem('ttt_token_v1', 'g390pguest1'));
    await page.reload({ waitUntil: 'domcontentloaded' });
    ok('3d sau dat token: thang man dang nhap (da nho server)', await waitFor(async () => (await vis(page, 'splashMain')) && !(await vis(page, 'serverPanel')), 20000));
    await clickBtn(page, '#btnGuest');
    const inGame = await waitFor(async () => page.evaluate(() => document.body.classList.contains('ingame')), 60000);
    ok('3e khach vao game binh thuong qua server da chon', !!inGame);
    await ctx.close();

    // ---------- Chân 4: mobile 390px ----------
    const ctxM = await browser.createBrowserContext();
    const mp = await ctxM.newPage();
    await mp.setViewport({ width: 390, height: 844, isMobile: true });
    await mp.goto(URL, { waitUntil: 'domcontentloaded' });
    ok('4a mobile: man chon hien', await waitPanel(mp, 'serverPanel', 20000));
    await waitFor(async () => { const t = await mp.evaluate(() => document.querySelector('.serverMeta')?.textContent || ''); return /người đang chơi/.test(t) ? true : null; }, 15000);
    const g4 = await panelGeo(mp);
    console.log('GEO mobile:', JSON.stringify(g4));
    checkGeo(g4, '4b mobile');
    await mp.screenshot({ path: path.join(DIR, 'shot/server_mobile_v3.png') });
    await ctxM.close();
  } finally {
    if (browser) { try { await browser.close(); } catch (e) {} }
  }
  await stopServer();
  console.log(`KET QUA: ${pass} PASS / ${fail} FAIL`);
  process.exit(fail ? 1 : 0);
})().catch(async (e) => { console.error('LOI PROBE:', e); try { await stopServer(); } catch (_) {} process.exit(2); });
