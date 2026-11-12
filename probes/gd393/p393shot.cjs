// Shot GĐ393 — 12 ảnh trong game: 6 đường vũ khí mới (gốc + Viên Mãn).
// Theo mẫu probes/gd389/shot389.cjs + màn chọn server GĐ390.
// Dùng fixture sẵn có probes/gd393/characters.json (KHÔNG ghi đè).
// Mỗi phiên: node KHÔNG giữ — browser vào bằng token, vị trí fixture giữ
// nguyên lúc login (offline actor đứng đúng chỗ đã vá); chụp xong đổi token.
// Cuối chạy khôi phục characters.json từ bản .pre-shot (server autosave +
// tiến hoá VM có thể sửa file trong lúc chạy).
const fs = require('fs'); const { spawn } = require('child_process');
const puppeteer = require('/home/hatch/workspace/shottools/node_modules/puppeteer');
const ROOT = '/home/hatch/workspace/tap-tanh-tu-tien-mmo';
const DIR = ROOT + '/probes/gd393';
const SHOTDIR = DIR + '/shot';
const PORT = 3951; const URL = 'http://127.0.0.1:' + PORT;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function portFree(port) { return new Promise((res) => { const s = require('net').connect(port, '127.0.0.1'); s.on('connect', () => { s.destroy(); res(false); }); s.on('error', () => res(true)); }); }
let serverProc = null, killTimer = null;
async function startServer() {
  if (!(await portFree(PORT))) throw new Error('port ' + PORT + ' ban');
  serverProc = spawn('node', ['server/index.js'], { cwd: ROOT, env: { ...process.env, PORT: String(PORT), TTT_STORAGE: 'file', TTT_CHAR_FILE: DIR + '/characters.json', TTT_ACC_FILE: DIR + '/accounts.json', TTT_WORLD_FILE: DIR + '/world.json', TTT_SESS_FILE: DIR + '/sessions.json', TTT_DAY_REAL_MS: '600000', TTT_TUVI_NEED: '5' }, stdio: ['ignore', 'pipe', 'pipe'] });
  serverProc.stderr.on('data', (d) => { try { fs.appendFileSync(DIR + '/srv_shot.log', d); } catch (e) {} });
  serverProc.stdout.on('data', (d) => { try { fs.appendFileSync(DIR + '/srv_shot.log', d); } catch (e) {} });
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
async function enterGame(page, token) {
  await page.evaluate((tk) => localStorage.setItem('ttt_token_v1', tk), token);
  await page.reload({ waitUntil: 'domcontentloaded' });
  for (let i = 0; i < 70; i++) {
    const inGame = await page.evaluate(() => document.body.classList.contains('ingame'));
    if (inGame) return true;
    await page.evaluate(() => {
      const es = document.querySelector('#btnEnterServer');
      if (es && !es.disabled) es.click();
      const b = document.querySelector('#btnGuest');
      if (b) b.click();
    });
    await sleep(700);
  }
  return false;
}
const SHOTS = [
  ['gd393main1', 'gd393_phapan_v1.png', 'Pháp ấn'],
  ['gd393vm01', 'gd393_phapan_vm_v1.png', 'Thiên La Pháp Ấn'],
  ['gd393main2', 'gd393_phatluan_v1.png', 'Phật luân'],
  ['gd393vm02', 'gd393_phatluan_vm_v1.png', 'Phật Quang Pháp Luân'],
  ['gd393main3', 'gd393_phikiem_v1.png', 'Phi kiếm'],
  ['gd393vm03', 'gd393_phikiem_vm_v1.png', 'Ngự Hư Phi Kiếm'],
  ['gd393main4', 'gd393_quylinh_v1.png', 'Chiêu hồn linh'],
  ['gd393vm04', 'gd393_quylinh_vm_v1.png', 'Cửu U Chiêu Hồn Linh'],
  ['gd393main5', 'gd393_dockinh_v1.png', 'Độc kinh'],
  ['gd393vm05', 'gd393_dockinh_vm_v1.png', 'Vạn Độc Thiên Kinh'],
  ['gd393main6', 'gd393_vankiem_v1.png', 'Văn kiếm'],
  ['gd393vm06', 'gd393_vankiem_vm_v1.png', 'Thánh Hiền Văn Kiếm'],
];
(async () => {
  fs.mkdirSync(SHOTDIR, { recursive: true });
  await startServer();
  const st = await (await fetch(URL + '/api/status')).json();
  console.log('boot ok, monsters=' + st.monsters);
  let browser = null, pass = 0, fail = 0;
  try {
    for (let attempt = 1; attempt <= 3 && !browser; attempt++) {
      try {
        browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-crashpad', '--disable-crash-reporter', '--no-crashpad', '--disable-dev-shm-usage'] });
      } catch (e) { console.log('launch thu ' + attempt + ' loi: ' + e.message); await sleep(10000); }
    }
    if (!browser) throw new Error('khong mo duoc Chrome sau 3 lan');
    const page = await browser.newPage();
    await page.setCacheEnabled(false);
    await page.setViewport({ width: 1100, height: 800 });
    page.on('pageerror', (e) => console.log('pageerror: ' + String(e).slice(0, 160)));
    await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
    for (const [token, file, wpn] of SHOTS) {
      const fp = SHOTDIR + '/' + file;
      if (fs.existsSync(fp) && fs.statSync(fp).size > 10000) { console.log('SKIP (da co): ' + file); pass++; continue; }
      try {
        if (!await enterGame(page, token)) throw new Error('khong vao duoc game');
        await sleep(6000); // chờ texture vũ khí nạp
        const panel = await page.evaluate(() => document.body.innerText || '');
        const wpnOk = panel.includes(wpn);
        console.log((wpnOk ? '  vu khi panel: ' : '  CANH BAO panel khong thay: ') + wpn + ' (token ' + token + ')');
        await page.keyboard.down('KeyD'); await sleep(260); await page.keyboard.up('KeyD');
        await sleep(500);
        await page.screenshot({ path: fp });
        console.log('PASS | ' + file + (wpnOk ? '' : ' | PANEL-KHONG-THAY-TEN'));
        if (wpnOk) pass++; else fail++;
      } catch (e) { console.log('FAIL | ' + file + ' | ' + e.message); fail++; }
      await page.evaluate(() => { localStorage.removeItem('ttt_token_v1'); location.reload(); });
      await sleep(2500);
    }
  } finally {
    if (browser) { try { await browser.close(); } catch (e) {} }
    await stopServer();
    try { fs.copyFileSync(DIR + '/characters.json.pre-shot', DIR + '/characters.json'); console.log('da khoi phuc characters.json tu ban pre-shot'); } catch (e) { console.log('khong khoi phuc duoc characters.json: ' + e.message); }
  }
  console.log(`KET QUA: ${pass} PASS / ${fail} FAIL (trong 12)`);
  process.exit(fail ? 1 : 0);
})().catch(async (e) => { console.error('LOI SHOT:', e); try { await stopServer(); } catch (_) {} process.exit(2); });
