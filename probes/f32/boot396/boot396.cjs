// GĐ396 chân 2 — BOOT KIỂM: server lên, /api/status monsters = 4579,
// log GĐ89 (số map + số NPC thành phố) đối chiếu tổng script đếm
// probes/f32/f32_count_396.cjs (14490). Không đụng fixture probes/f32/* cũ:
// dùng thư mục riêng probes/f32/boot396/.
// Chạy: node probes/f32/boot396/boot396.cjs   (tự start + stop server, port 3591)
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const net = require('net');
const ROOT = path.join(__dirname, '..', '..', '..');
const PORT = 3591;
const DIR = __dirname;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
function portFree(port) { return new Promise((res) => { const s = net.createServer(); s.once('error', () => res(false)); s.listen(port, () => s.close(() => res(true))); }); }
let serverProc = null, killTimer = null;
const logLines = [];
async function startServer() {
  if (!(await portFree(PORT))) throw new Error('port ban');
  serverProc = spawn('node', ['server/index.js'], { cwd: ROOT, env: { ...process.env, PORT: String(PORT), TTT_STORAGE: 'file', TTT_CHAR_FILE: path.join(DIR, 'characters.json'), TTT_ACC_FILE: path.join(DIR, 'accounts.json'), TTT_WORLD_FILE: path.join(DIR, 'world.json'), TTT_SESS_FILE: path.join(DIR, 'sessions.json') }, stdio: ['ignore', 'pipe', 'pipe'] });
  serverProc.stdout.on('data', (d) => { const t = String(d); logLines.push(t); if (t.includes('GĐ89') || t.includes('GĐ353')) process.stdout.write('[SRV] ' + t); });
  serverProc.stderr.on('data', (d) => { logLines.push(String(d)); });
  killTimer = setTimeout(() => { try { serverProc.kill('SIGKILL'); } catch (e) {} }, 120000);
  const t0 = Date.now();
  while (Date.now() - t0 < 90000) {
    try { const r = await fetch(`http://127.0.0.1:${PORT}/api/status`); if (r.ok) { clearTimeout(killTimer); killTimer = null; return await r.json(); } } catch (e) {}
    await sleep(500);
  }
  throw new Error('server khong len');
}
async function stopServer() {
  if (!serverProc) return;
  const p = serverProc; serverProc = null;
  if (killTimer) { clearTimeout(killTimer); killTimer = null; }
  await new Promise((res) => { const t = setTimeout(() => { try { p.kill('SIGKILL'); } catch (e) {} res(); }, 5000); p.once('exit', () => { clearTimeout(t); res(); }); try { p.kill('SIGTERM'); } catch (e) { clearTimeout(t); res(); } });
  const t0 = Date.now();
  while (Date.now() - t0 < 10000 && !(await portFree(PORT))) await sleep(300);
  if (!(await portFree(PORT))) throw new Error('port chua nha sau stop');
}
(async () => {
  let fail = 0;
  const ok = (name, cond, extra) => { console.log((cond ? 'PASS | ' : 'FAIL | ') + name + (extra ? ' | ' + extra : '')); if (!cond) fail++; };
  try {
    const st = await startServer();
    ok('server len + /api/status ok', !!st);
    ok('monsters = 4579', st.monsters === 4579, 'got ' + st.monsters);
    ok('players = 8 (DEMO_BOTS, 0 nguoi that)', st.players === 8, 'got ' + st.players);
    const g89 = logLines.join('').match(/\[GĐ89\][^\n]*/);
    console.log('GĐ89 log:', g89 ? g89[0] : '(khong thay)');
    const m = g89 ? g89[0].match(/(\d+) map, (\d+) NPC/) : null;
    if (m) {
      // GĐ89 log in TRUOC khi 2 NPC ke chuyen GĐ353 duoc push (xem server/index.js:19756-57)
      // va dem ca van_uyen (entry rong, chi co Thu Tang) nen: map 158 = 157 map gop + van_uyen;
      // NPC 14488 + 2 ke chuyen = 14490 = tong f32_count_396.cjs.
      ok('GĐ89 map = 158 (157 gop + van_uyen)', Number(m[1]) === 158, 'got ' + m[1]);
      ok('GĐ89 NPC = 14488 (+2 ke chuyen = 14490)', Number(m[2]) === 14488, 'got ' + m[2]);
      ok('tong live = 14490 (khop f32_count_396)', Number(m[2]) + 2 === 14490, 'got ' + (Number(m[2]) + 2));
    } else { ok('GĐ89 log parse duoc', false); }
  } catch (e) { console.log('FAIL | exception | ' + (e && e.message)); fail++; }
  try { await stopServer(); console.log('server da dung, port da nha'); } catch (e) { console.log('FAIL | stopServer | ' + (e && e.message)); fail++; }
  console.log(fail === 0 ? 'BOOT396: TAT CA PASS' : `BOOT396: ${fail} FAIL`);
  process.exit(fail === 0 ? 0 : 1);
})();
