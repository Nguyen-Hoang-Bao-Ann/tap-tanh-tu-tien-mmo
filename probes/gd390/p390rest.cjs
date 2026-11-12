// Bổ sung GĐ390 — kiểm lại riêng chân 7f-7h (sau khôi phục) vì lần chạy 2 sập
// trình duyệt ở đúng đoạn này (nhiễu môi trường). Dùng lại server + dist đã build.
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const net = require('net');
const ROOT = path.join(__dirname, '..', '..');
const DIR = __dirname;
const puppeteer = require('/home/hatch/workspace/shottools/node_modules/puppeteer');
const PORT = 3940;
const URL = 'http://127.0.0.1:' + PORT;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function waitFor(fn, ms) { const t0 = Date.now(); while (Date.now() - t0 < ms) { const v = await fn(); if (v) return v; await sleep(150); } return null; }
function portFree(port) { return new Promise((res) => { const s = net.createServer(); s.once('error', () => res(false)); s.listen(port, () => s.close(() => res(true))); }); }
let pass = 0, fail = 0;
function ok(name, cond, extra) { if (cond) { pass++; console.log('PASS | ' + name); } else { fail++; console.log('FAIL | ' + name + (extra ? ' | ' + extra : '')); } }
(async () => {
  if (!(await portFree(PORT))) throw new Error('port ban');
  const srv = spawn('node', ['server/index.js'], { cwd: ROOT, env: { ...process.env, PORT: String(PORT), TTT_STORAGE: 'file', TTT_CHAR_FILE: path.join(DIR, 'characters.json'), TTT_ACC_FILE: path.join(DIR, 'accounts.json'), TTT_WORLD_FILE: path.join(DIR, 'world.json'), TTT_SESS_FILE: path.join(DIR, 'sessions.json'), TTT_DAY_REAL_MS: '600000', TTT_TUVI_NEED: '5' }, stdio: 'ignore' });
  const kt = setTimeout(() => { try { srv.kill('SIGKILL'); } catch (e) {} }, 600000);
  try {
    const t0 = Date.now();
    while (Date.now() - t0 < 90000) { try { const r = await fetch(URL + '/api/status'); if (r.ok) break; } catch (e) {} await sleep(400); }
    clearTimeout(kt);
    const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
    try {
      const ctx = await browser.createBrowserContext();
      const page = await ctx.newPage();
      await page.setViewport({ width: 1100, height: 800 });
      await page.goto(URL, { waitUntil: 'domcontentloaded' });
      const vis = (id) => page.evaluate((i) => { const el = document.getElementById(i); return !!el && el.style.display !== 'none'; }, id);
      ok('7f sau khoi phuc: man chon hien', await waitFor(async () => (await vis('serverPanel')) ? true : null, 20000));
      const metaR = await waitFor(async () => {
        const t = await page.evaluate(() => document.querySelector('.serverMeta')?.textContent || '');
        return /người đang chơi/.test(t) ? t : null;
      }, 15000);
      ok('7g sau khoi phuc: dong online tro lai', !!metaR, String(metaR));
      const clicked = await page.evaluate(() => { const b = document.querySelector('[data-server-enter="tinh-tuc-menh-1"]'); if (!b) return false; b.click(); return true; });
      ok('7h sau khoi phuc: bam Vao duoc', clicked && await waitFor(async () => (await vis('splashMain')) ? true : null, 10000));
      await ctx.close();
    } finally { await browser.close(); }
  } finally {
    clearTimeout(kt);
    srv.kill('SIGTERM');
    await sleep(1200);
    if (!(await portFree(PORT))) srv.kill('SIGKILL');
  }
  console.log(`\nKET QUA: ${pass} PASS / ${fail} FAIL`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error('PROBE CRASH:', e); process.exit(2); });
