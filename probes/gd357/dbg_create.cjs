// Debug GĐ357: hello bằng token nhân vật đã tọa hóa -> server trả gì? + create_character chạy ra sao?
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const net = require('net');
const ROOT = path.join(__dirname, '..', '..');
const DIR = __dirname;
const { io } = require(path.join(ROOT, 'client/node_modules/socket.io-client'));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
function portFree(port) { return new Promise((res) => { const s = net.createServer(); s.once('error', () => res(false)); s.listen(port, () => s.close(() => res(true))); }); }
const PORT = 3717;
(async () => {
  if (!(await portFree(PORT))) { console.log('port ban'); process.exit(1); }
  const proc = spawn('node', ['server/index.js'], { cwd: ROOT, env: { ...process.env, PORT: String(PORT), TTT_STORAGE: 'file', TTT_CHAR_FILE: path.join(DIR, 'characters.json'), TTT_ACC_FILE: path.join(DIR, 'accounts.json'), TTT_WORLD_FILE: path.join(DIR, 'world.json'), TTT_SESS_FILE: path.join(DIR, 'sessions.json'), TTT_DAY_REAL_MS: '600000', TTT_TUVI_NEED: '5' }, stdio: ['ignore', 'pipe', 'pipe'] });
  proc.stderr.on('data', (d) => process.stderr.write('[srv] ' + d));
  const t0 = Date.now();
  while (Date.now() - t0 < 45000) { try { const r = await fetch(`http://127.0.0.1:${PORT}/api/status`); if (r.ok) break; } catch (e) {} await sleep(500); }
  const socket = io(`http://127.0.0.1:${PORT}`, { transports: ['websocket'] });
  const events = [];
  for (const ev of ['welcome', 'need_character', 'create_error', 'notice', 'char_sync', 'interact_error']) socket.on(ev, (d) => events.push(ev + ': ' + JSON.stringify(d).slice(0, 220)));
  socket.on('connect', () => { console.log('connected, hello tk357s1001'); socket.emit('hello', { token: 'tk357s1001' }); });
  await sleep(5000);
  console.log('--- after hello ---'); console.log(events.join('\n') || '(no events)');
  events.length = 0;
  console.log('emit create_character');
  socket.emit('create_character', { name: 'DbgKiepMoi', classId: 'kiemtu' });
  await sleep(6000);
  console.log('--- after create ---'); console.log(events.join('\n') || '(no events)');
  const f = JSON.parse(fs.readFileSync(path.join(DIR, 'characters.json'), 'utf8'))['tk357s1001'];
  console.log('file char:', JSON.stringify({ name: f.name, dead: f.dead, soulClues: f.soul && f.soul.clues, lifeLog: f.soul && f.soul.lifeLog }));
  socket.disconnect();
  proc.kill('SIGTERM');
  await sleep(1500);
  try { proc.kill('SIGKILL'); } catch (e) {}
  process.exit(0);
})();
