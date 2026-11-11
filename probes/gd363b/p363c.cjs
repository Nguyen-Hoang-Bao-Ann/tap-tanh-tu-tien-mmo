// Tái hiện: nạp đúng 5 fixture của p363, nối scout, in inventory ở welcome + sau 20s.
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const net = require('net');
const ROOT = path.join(__dirname, '..', '..');
const DIR = __dirname;
const { io } = require(path.join(ROOT, 'client/node_modules/socket.io-client'));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
function portFree(port) { return new Promise((res) => { const s = net.createServer(); s.once('error', () => res(false)); s.listen(port, () => s.close(() => res(true))); }); }
const STRONG = { khiHuyet: 20000, vatCong: 6000, vatPhong: 2000, phapCong: 400, phapPhong: 2000, tocDo: 80, minhMan: 100 };
const LC1 = { elements: ['kim'], main: 'kim', count: 1, mutations: [] };
function BASE(token, name, extra) {
  return Object.assign({ token, name, classId: 'kiemtu', gender: 'nam', race: null, geo175: 1, realm: 'ht', tier: 9, x: 1565, y: 1011, mapId: 'lang_tan_thu', hp: 999999, mp: 99999, lifespan: 500, birthDay: -5660, ageStart: 16, stats: { ...STRONG }, statPoints: 0, freePoints: 0, tuVi: 99999, stones: 100000, stonesTrung: 0, stonesThuong: 0, stonesCuc: 0, inventory: {}, gearBag: {}, equipped: [], skills: [], job: null, job2: null, job3: null, linhCan: { ...LC1 }, affinity: {}, affV2: 1, bonds: {}, quests: {}, questsDone: {}, flags: {}, counters: {}, disciples: [], foundInvites: [], reformIn: [], sectTech: [], sectArts: [], sectArtsActive: [], mails: [], classRes: {}, food: 100, water: 100 }, extra || {});
}
(async () => {
  const PORT = 3749;
  const chars = {};
  chars['tk363scout1'] = BASE('tk363scout1', 'P363TrinhNha', { inventory: { thanh_thao: 5 } });
  chars['tk363main01'] = BASE('tk363main01', 'P363SanKiem', { realm: 'tn', quests: { q127_boss_013: { progress: 0, state: 'active' }, q127_hid_008: { progress: 0, state: 'active' } }, flags: { hid_008: true } });
  chars['tk363lam001'] = BASE('tk363lam001', 'P363SanLam', { mapId: 'thanh_moc_lam', x: 400, y: 400, quests: { q127_adv_san_trum_3: { progress: 0, state: 'active' } }, flags: { adv_san_trum_t2: true } });
  chars['tk363doc001'] = BASE('tk363doc001', 'P363SanDoc', { mapId: 'huyet_sac_rung', x: 4248, y: 2950, quests: { q127_boss_008: { progress: 0, state: 'active' } } });
  chars['tk363loi001'] = BASE('tk363loi001', 'P363SanLoi', { realm: 'kd', mapId: 'loi_dinh_son_coc', x: 2400, y: 3000, quests: { q127_hid_050: { progress: 0, state: 'active' } }, flags: { hid_050: true } });
  fs.writeFileSync(path.join(DIR, 'characters.json'), JSON.stringify(chars));
  fs.writeFileSync(path.join(DIR, 'accounts.json'), '{}');
  fs.writeFileSync(path.join(DIR, 'world.json'), JSON.stringify({ totalMinutes: 3360, savedAt: Date.now() }));
  fs.writeFileSync(path.join(DIR, 'sessions.json'), '{}');
  if (!(await portFree(PORT))) { console.log('port ban'); process.exit(2); }
  const proc = spawn('node', ['server/index.js'], { cwd: ROOT, env: { ...process.env, PORT: String(PORT), TTT_STORAGE: 'file', TTT_CHAR_FILE: path.join(DIR, 'characters.json'), TTT_ACC_FILE: path.join(DIR, 'accounts.json'), TTT_WORLD_FILE: path.join(DIR, 'world.json'), TTT_SESS_FILE: path.join(DIR, 'sessions.json'), TTT_DAY_REAL_MS: '600000', TTT_TUVI_NEED: '5' }, stdio: ['ignore', 'pipe', 'pipe'] });
  proc.stderr.on('data', (d) => { try { fs.appendFileSync(path.join(DIR, 'srv2.log'), d); } catch (e) {} });
  proc.stdout.on('data', (d) => { try { fs.appendFileSync(path.join(DIR, 'srv2.log'), d); } catch (e) {} });
  const t0 = Date.now();
  let up = false;
  while (Date.now() - t0 < 45000) { try { const r = await fetch(`http://127.0.0.1:${PORT}/api/status`); if (r.ok) { up = true; break; } } catch (e) {} await sleep(500); }
  if (!up) { console.log('server khong len'); proc.kill('SIGKILL'); process.exit(2); }
  const socket = io(`http://127.0.0.1:${PORT}`, { transports: ['websocket'] });
  let lastSync = null;
  socket.on('char_sync', (s) => { lastSync = s; });
  const welcome = await new Promise((res) => { socket.on('connect', () => socket.emit('hello', { token: 'tk363scout1' })); socket.on('welcome', (w) => res(w)); setTimeout(() => res(null), 20000); });
  console.log('welcome inventory =', JSON.stringify(welcome && welcome.character && welcome.character.inventory));
  await sleep(20000);
  console.log('sync inventory sau 20s =', JSON.stringify(lastSync && lastSync.inventory));
  socket.disconnect();
  proc.kill('SIGTERM');
  await sleep(1500);
  try { proc.kill('SIGKILL'); } catch (e) {}
  process.exit(0);
})();
