// Shot GĐ389 — nhân vật cầm Cốt Cung / Cốt Nhận (gốc + Viên Mãn) trong game.
// 4 token fixture trên map nhà (2415,1400): 2 đường gốc + 2 đường VM
// (anState.vienman → server tự tiến hoá vũ khí lúc login, đã đo ở p389).
// Mỗi phiên: vào game, chờ texture, quay mặt phải (vũ khí lộ rõ), chụp
// toàn cảnh + bản cắt phóng quanh nhân vật.
const fs = require('fs'); const { spawn } = require('child_process');
const puppeteer = require('/home/hatch/workspace/shottools/node_modules/puppeteer');
const ROOT = '/home/hatch/workspace/tap-tanh-tu-tien-mmo'; const DIR = __dirname + '/shot';
const PORT = 3921; const URL = 'http://127.0.0.1:' + PORT;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function portFree(port) { return new Promise((res) => { const s = require('net').connect(port, '127.0.0.1'); s.on('connect', () => { s.destroy(); res(false); }); s.on('error', () => res(true)); }); }
function startServer() {
  return new Promise(async (resolve, reject) => {
    if (!(await portFree(PORT))) return reject(new Error('CỔNG BẬN'));
    const srv = spawn('node', ['server/index.js'], { cwd: ROOT, env: { ...process.env, PORT: String(PORT), TTT_CHAR_FILE: DIR + '/characters.json', TTT_ACC_FILE: DIR + '/accounts.json', TTT_WORLD_FILE: DIR + '/world.json', TTT_SESS_FILE: DIR + '/sessions.json', TTT_STORAGE: 'file', TTT_DAY_REAL_MS: '600000', TTT_TUVI_NEED: '5' } });
    const kt = setTimeout(() => { try { srv.kill('SIGKILL'); } catch {} }, 600000);
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
  return Object.assign({ token, name, classId: 'cottu', gender: 'nam', race: null, geo175: 1, realm: 'kd', tier: 1, x: 2415, y: 1400, mapId: 'lang_tan_thu', hp: 999999, mp: 9999, lifespan: 500, birthDay: -5660, ageStart: 16, stats: { khiHuyet: 500, vatCong: 300, vatPhong: 200, phapCong: 300, phapPhong: 200, tocDo: 60, minhMan: 100 }, statPoints: 0, freePoints: 0, tuVi: 99999, stones: 100000, stonesTrung: 0, stonesThuong: 0, stonesCuc: 0, inventory: {}, gearBag: {}, equipped: [], skills: [], job: null, job2: null, job3: null, linhCan: { ...LC1 }, affinity: {}, affV2: 1, bonds: {}, quests: {}, questsDone: {}, flags: {}, counters: {}, disciples: [], foundInvites: [], reformIn: [], sectTech: [], sectArts: [], sectArtsActive: [], mails: [], classRes: {}, food: 100, water: 100 }, extra || {});
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
  const chars = {
    shot389c01: BASE('shot389c01', 'AnhCung389', { weaponId: 'cotcung' }),
    shot389n01: BASE('shot389n01', 'AnhNhan389', { weaponId: 'cotnhan' }),
    shot389cv1: BASE('shot389cv1', 'AnhCungVm389', { weaponId: 'cotcung', realm: 'na', anState: { vienman: true } }),
    shot389nv1: BASE('shot389nv1', 'AnhNhanVm389', { weaponId: 'cotnhan', realm: 'na', anState: { vienman: true } }),
  };
  fs.writeFileSync(DIR + '/characters.json', JSON.stringify(chars));
  fs.writeFileSync(DIR + '/accounts.json', '{}'); fs.writeFileSync(DIR + '/world.json', '{}'); fs.writeFileSync(DIR + '/sessions.json', '{}');
  const srv = await startServer();
  let browser = null;
  const shots = [
    ['shot389c01', 'cotcung_base_v1.png'],
    ['shot389n01', 'cotnhan_base_v1.png'],
    ['shot389cv1', 'cotcung_vm_v1.png'],
    ['shot389nv1', 'cotnhan_vm_v1.png'],
  ];
  try {
    browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
    const page = await browser.newPage();
    await page.setViewport({ width: 1100, height: 800 });
    await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
    for (const [token, file] of shots) {
      if (!await enterGame(page, token)) throw new Error('khong vao duoc game: ' + token);
      await sleep(6000); // chờ texture vũ khí nạp
      await page.keyboard.down('KeyD'); await sleep(260); await page.keyboard.up('KeyD');
      await sleep(500);
      await page.screenshot({ path: DIR + '/' + file });
      console.log('  ok:', file);
      // đăng xuất về màn hình chính để đổi token sạch
      await page.evaluate(() => { localStorage.removeItem('ttt_token_v1'); location.reload(); });
      await sleep(2500);
    }
    console.log('SHOT GĐ389: PASS');
  } finally {
    if (browser) await browser.close().catch(() => {});
    await stopServer(srv);
  }
})().catch((e) => { console.error('SHOT FAIL', e.message); process.exit(1); });
