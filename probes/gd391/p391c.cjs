// Probe GĐ391c — CHỈ chân 4 (tin bảo trì tự sinh), KHÔNG build trong probe.
// Dùng dist đã dựng sẵn bằng esbuild từ servers.ts đang ở trạng thái
// maintenance (xem nhật ký GĐ391). Sau khi chạy xong phải khôi phục
// servers.ts + build lại dist bằng vite (bước ngoài probe).
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const net = require('net');
const ROOT = path.join(__dirname, '..', '..');
const DIR = __dirname;
const puppeteer = require('/home/hatch/workspace/shottools/node_modules/puppeteer');
const PORT = 3944;
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
  await startServer('c');
  const st = await (await fetch(URL + '/api/status')).json();
  ok('1a boot: 4579 quai', st.monsters === 4579, 'monsters=' + st.monsters);
  let browser = null;
  try {
    browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-crashpad', '--disable-crash-reporter', '--no-crashpad', '--disable-dev-shm-usage'] });
    const ctx = await browser.createBrowserContext();
    const page = await ctx.newPage();
    const errs = [];
    page.on('pageerror', (e) => errs.push('pageerror: ' + String(e).slice(0, 200)));
    page.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text().slice(0, 200)); });
    await page.setCacheEnabled(false);
    await page.setViewport({ width: 1100, height: 800 });
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    ok('4a0 man chon hien (bao tri)', await waitFor(() => visComputed(page, 'serverPanel'), 60000));
    await sleep(800);
    const selText = await page.evaluate(() => { const s = document.getElementById('serverSelect'); return s ? s.options[s.selectedIndex]?.text : null; });
    ok('4a1 o select hien server dang bao tri', selText && selText.includes('Đang bảo trì'), selText);
    ok('4a bam nut Thong bao mo duoc bang (computed)', await clickBtn(page, '#btnNews2') && await waitFor(() => visComputed(page, 'noticeBoard'), 10000));
    await sleep(600);
    await clickBtn(page, '#ntabThongbao');
    await sleep(600);
    const bm = await boardState(page);
    console.log('BOARD thongbao (bao tri):', JSON.stringify(bm.items.map((i) => i.text.slice(0, 60))));
    ok('4b tin tu sinh "Bảo trì: Tinh Túc Mệnh 1" GHIM DAU, co 🛠 + 📌', bm.items.length >= 1 && bm.items[0].text.includes('Bảo trì: Tinh Túc Mệnh 1') && bm.items[0].text.includes('🛠') && bm.items[0].text.includes('📌'), JSON.stringify(bm.items[0] || null));
    ok('4c bam tin -> noi dung hien ly do + gio mo lai 20:00 12/11', await clickNoticeByText(page, 'Bảo trì: Tinh Túc Mệnh 1') && await waitFor(async () => { const s = await boardState(page); return s.content.includes('Nâng cấp máy chủ') && s.content.includes('20:00 12/11') ? s : null; }, 5000));
    await page.screenshot({ path: path.join(DIR, 'shot/notice_maint_v3.png') });
    console.log('LOI TRANG (chan 4):', JSON.stringify(errs.slice(0, 8)));
    await ctx.close();
  } finally {
    if (browser) { try { await browser.close(); } catch (e) {} }
  }
  await stopServer();
  console.log(`KET QUA: ${pass} PASS / ${fail} FAIL`);
  process.exit(fail ? 1 : 0);
})().catch(async (e) => { console.error('LOI PROBE:', e); try { await stopServer(); } catch (_) {} process.exit(2); });
