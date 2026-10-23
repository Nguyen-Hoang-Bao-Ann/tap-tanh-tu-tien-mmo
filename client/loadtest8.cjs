// Đo tải 100 CCU — server đã có FULL logic game (GĐ6–8: nhân vật + công thức file,
// combat sói server-side, Tu vi/đột phá, NPC + rơi đồ + Linh thạch + shop + nhiệm vụ).
//
// Phase A (so sánh trực tiếp với bài đo GĐ3): 100 client, chỉ di chuyển liên tục 12s.
// Phase B (logic game thật): 100 client CÓ nhân vật thật (bốc chỉ số + chọn lớp ngẫu nhiên),
//   tự ra bãi farm đánh sói + tung chiêu slot 0, 20s.
// Đo: khoảng cách tick (mục tiêu 10/s), payload bytes/tick, CPU% + RAM của tiến trình server.
//
// Chạy:  node client/loadtest8.cjs [--url http://localhost:3001] [--phase A|B|AB]
//        [--clients 100] [--dry]   (--dry = 2 client, vài giây, để kiểm tra script)
//
// LƯU Ý: chỉ chạy phase đủ 100 client KHI server đang ở bản ổn định (không ai đang test/sửa),
// vì 100 client cùng lúc sẽ làm nhiễu mọi bài test socket khác đang chạy song song.
const { io } = require('socket.io-client');
const { createMerger } = require('./worldmerge.cjs');
const { execSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf(k); return i >= 0 && argv[i + 1] ? argv[i + 1] : d; };
const has = (k) => argv.includes(k);
const TARGET = arg('--url', 'http://localhost:3001');
const DRY = has('--dry');
const NCLIENTS = DRY ? 2 : Number(arg('--clients', '100'));
const PHASES = (arg('--phase', 'AB') || 'AB').toUpperCase();
const DUR_A = DRY ? 3 : 12;   // giây — phase A
const DUR_B = DRY ? 6 : 20;   // giây — phase B
const RUN_TS = Date.now().toString(36);
const TOKEN_PREFIX = `loadtest-${RUN_TS}-`;

const CLASSES = ['thetu', 'phattu', 'cottu', 'satthu', 'kiemtu', 'phaptu', 'quytu', 'ytu', 'nhotu'];
// Điểm farm phía đông/đông-nam bản đồ (ngoài làng, trong vùng sói sinh — xem preview5-farm)
const FARM_POINTS = [
  [1150, 300], [1350, 420], [1500, 560], [1300, 700],
  [1100, 850], [1450, 900], [1200, 450], [1400, 650],
];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const now = () => Date.now();

// ---------- Đo CPU/RAM tiến trình server qua /proc ----------
// Tìm PID theo cổng đang listen (chính xác instance, không lẫn với instance test khác)
function findServerPid() {
  try {
    const port = new (require("url").URL)(TARGET).port || '80';
    const out = execSync('ss -ltnp 2>/dev/null', { stdio: ['ignore', 'pipe', 'ignore'] }).toString();
    for (const line of out.split('\n')) {
      if (!line.includes(':' + port)) continue;
      const m = line.match(/pid=(\d+)/);
      if (m) return Number(m[1]);
    }
    return null;
  } catch { return null; }
}
function procSample(pid) {
  try {
    const raw = fs.readFileSync(`/proc/${pid}/stat`, 'utf8');
    const rest = raw.slice(raw.lastIndexOf(')') + 1).trim().split(/\s+/);
    const rssKb = Number(fs.readFileSync(`/proc/${pid}/status`, 'utf8').match(/VmRSS:\s+(\d+)/)[1]);
    return { cpu: Number(rest[11]) + Number(rest[12]), rssMb: rssKb / 1024, t: now() };
  } catch { return null; }
}
function cpuPct(a, b) {
  if (!a || !b) return null;
  const dt = (b.t - a.t) / 1000;
  if (dt <= 0) return null;
  return (((b.cpu - a.cpu) / 100) / dt / os.cpus().length) * 100;
}

// ---------- Client đo ----------
function makeClient(i, withChar) {
  const s = io(TARGET, { transports: ['websocket'], reconnection: false, timeout: 5000 });
  const st = {
    sock: s, id: null, tick: null, kills: 0, castsOk: 0,
    tickTimes: [], tickBytes: [], bytes: 0,
    wp: FARM_POINTS[i % FARM_POINTS.length].slice(),
    dirA: Math.random() * Math.PI * 2, dirT: 0, lastCast: 0, ready: false,
  };
  const mergeTick = createMerger();
  s.on('server_tick', (t) => {
    const ts = now();
    st.tick = mergeTick(t);
    if (i === 0) { st.tickTimes.push(ts); st.tickBytes.push(JSON.stringify(t).length); }
  });
  s.on('welcome', (w) => { st.id = w.id; st.ready = true; });
  s.on('monster_killed', () => { st.kills++; });
  s.on('cast_result', (r) => { if (r && r.ok) st.castsOk++; });
  s.on('linhcan_result', () => { st.linhcanDone = true; });
  s.on('you_died', () => { /* hồi sinh ở làng — vòng lái sẽ tự đi ra farm lại */ });
  if (withChar) {
    const token = TOKEN_PREFIX + i;
    const cls = CLASSES[i % CLASSES.length];
    s.on('need_character', () => s.emit('request_roll'));
    s.on('roll_result', () => s.emit('create_character', { token, name: `Tai ${i}`, classId: cls }));
    s.on('connect', () => s.emit('hello', { token }));
  } else {
    s.on('connect', () => s.emit('hello', { token: TOKEN_PREFIX + 'anon-' + i }));
  }
  s.on('connect_error', () => { /* đếm ở cuối qua st.ready */ });
  return st;
}
const meOf = (st) => st.tick && st.id ? st.tick.players.find((p) => p.id === st.id) : null;

function driveA(st) {
  // Phase A: di chuyển ngẫu nhiên liên tục (giống bài đo GĐ3)
  return setInterval(() => {
    if (now() - st.dirT > 1200 + Math.random() * 1500) { st.dirA = Math.random() * Math.PI * 2; st.dirT = now(); }
    st.sock.emit('client_input', { vx: Math.cos(st.dirA), vy: Math.sin(st.dirA) });
  }, 100);
}
function driveB(st) {
  // Phase B: đo linh căn ở Đạo Quán (700,378) → ra farm, gặp sói trong 60px thì đánh + tung chiêu
  const DAO = { x: 700, y: 378 };
  return setInterval(() => {
    const p = meOf(st);
    if (!p || !st.tick) return;
    if (!st.linhcanDone) {
      const d = Math.hypot(DAO.x - p.x, DAO.y - p.y);
      if (d <= 70) { st.sock.emit('measure_linhcan'); return; }
      st.sock.emit('client_input', { vx: (DAO.x - p.x) / d, vy: (DAO.y - p.y) / d });
      return;
    }
    let best = null, bd = Infinity;
    for (const m of (st.tick.monsters || [])) {
      const d = Math.hypot(m.x - p.x, m.y - p.y);
      if (d < bd) { bd = d; best = m; }
    }
    if (best && bd < 60) {
      if (bd <= 44) { st.sock.emit('client_input', { vx: 0, vy: 0 }); st.sock.emit('player_attack'); }
      else st.sock.emit('client_input', { vx: (best.x - p.x) / bd, vy: (best.y - p.y) / bd });
      if (now() - st.lastCast > 1600) { st.lastCast = now(); st.sock.emit('cast_skill', { slot: 0 }); }
      return;
    }
    const [wx, wy] = st.wp;
    const d = Math.hypot(wx - p.x, wy - p.y);
    if (d < 80) st.wp = FARM_POINTS[Math.floor(Math.random() * FARM_POINTS.length)].slice();
    else st.sock.emit('client_input', { vx: (wx - p.x) / d, vy: (wy - p.y) / d });
  }, 120);
}
function disconnectAll(clients) { for (const c of clients) { try { c.sock.disconnect(); } catch {} } }

function tickStats(c0, durSec) {
  const ts = c0.tickTimes;
  const iv = [];
  for (let i = 1; i < ts.length; i++) iv.push(ts[i] - ts[i - 1]);
  iv.sort((a, b) => a - b);
  const avg = iv.length ? iv.reduce((a, b) => a + b, 0) / iv.length : 0;
  const p99 = iv.length ? iv[Math.min(iv.length - 1, Math.floor(iv.length * 0.99))] : 0;
  const mx = iv.length ? iv[iv.length - 1] : 0;
  const bytes = c0.tickBytes.length ? c0.tickBytes.reduce((a, b) => a + b, 0) / c0.tickBytes.length : 0;
  return { ticks: ts.length, expect: Math.round(durSec * 10), avgMs: avg, p99Ms: p99, maxMs: mx, bytesPerTick: bytes };
}
function printPhase(label, c0, durSec, extra) {
  const s = tickStats(c0, durSec);
  console.log(`\n===== ${label} =====`);
  console.log(`Tick nhận: ${s.ticks}/${s.expect} (kỳ vọng) | khoảng cách: TB ${s.avgMs.toFixed(1)}ms, p99 ${s.p99Ms.toFixed(1)}ms, max ${s.maxMs.toFixed(1)}ms`);
  console.log(`Payload: ~${(s.bytesPerTick / 1024).toFixed(2)}KB/tick | mỗi client tải ~${(s.bytesPerTick * 10 / 1024).toFixed(1)}KB/s | server phát tổng ~${(s.bytesPerTick * 10 * NCLIENTS / 1024 / 1024).toFixed(2)}MB/s`);
  if (extra) console.log(extra);
}

async function runPhase(label, durSec, withChar) {
  console.log(`\n>>> ${label}: kết nối ${NCLIENTS} client → ${TARGET} ...`);
  const clients = Array.from({ length: NCLIENTS }, (_, i) => makeClient(i, withChar));
  await sleep(2500); // chờ hello/welcome + tạo nhân vật (phase B)
  const connected = clients.filter((c) => c.sock.connected).length;
  const ready = clients.filter((c) => c.ready).length;
  console.log(`Kết nối ok: ${connected}/${NCLIENTS}${withChar ? ` | có nhân vật: ${ready}/${NCLIENTS}` : ''}`);
  const pid = findServerPid();
  console.log(pid ? `Tiến trình server: PID ${pid}` : 'Không tìm thấy tiến trình server qua pgrep — bỏ qua đo CPU/RAM');
  const drivers = clients.map((c) => (withChar ? driveB : driveA)(c));
  const c0 = clients[0];
  c0.tickTimes = []; c0.tickBytes = []; // reset sau warmup — chỉ đo đúng cửa sổ durSec
  const cpu0 = pid ? procSample(pid) : null;
  const rss0 = cpu0 ? cpu0.rssMb : null;
  await sleep(durSec * 1000);
  const cpu1 = pid ? procSample(pid) : null;
  for (const d of drivers) clearInterval(d);
  const cpu = cpuPct(cpu0, cpu1);
  let extra = null;
  if (withChar) {
    const kills = clients.reduce((a, c) => a + c.kills, 0);
    const casts = clients.reduce((a, c) => a + c.castsOk, 0);
    const linhcan = clients.filter((c) => c.linhcanDone).length;
    extra = `Tu luyện: ${linhcan}/${NCLIENTS} đo linh căn xong | Combat: ${kills} sói bị hạ, ${casts} lượt tung chiêu thành công`;
  }
  printPhase(label, c0, durSec, extra);
  if (cpu !== null && cpu1) console.log(`Server: CPU ${cpu.toFixed(1)}% (${os.cpus().length} core) | RAM ${rss0.toFixed(0)}MB → ${cpu1.rssMb.toFixed(0)}MB`);
  else console.log('Không đo được CPU/RAM server (không đọc được /proc của tiến trình).');
  disconnectAll(clients);
  await sleep(800);
}

function cleanupChars() {
  // Xóa nhân vật test khỏi file lưu (theo token prefix của lần chạy này)
  const charFile = arg('--char-file', process.env.TTT_CHAR_FILE
    || path.join(__dirname, '..', 'server', 'data', 'characters.json'));
  try {
    if (!fs.existsSync(charFile)) return;
    const data = JSON.parse(fs.readFileSync(charFile, 'utf8'));
    let n = 0;
    for (const k of Object.keys(data)) if (k.startsWith(TOKEN_PREFIX)) { delete data[k]; n++; }
    if (n) { fs.writeFileSync(charFile, JSON.stringify(data, null, 2)); console.log(`Đã dọn ${n} nhân vật test khỏi ${charFile}`); }
  } catch (e) { console.log('Dọn characters.json thất bại (không nghiêm trọng): ' + e.message); }
}

(async () => {
  console.log('=== ĐO TẢI 100 CCU — full logic game (GĐ6–8) ===');
  console.log(`URL: ${TARGET} | clients: ${NCLIENTS} | phase: ${PHASES}${DRY ? ' | DRY-RUN' : ''}`);
  if (TARGET.includes('3001') && !DRY) {
    console.log('!! Đang đo trên server CHÍNH :3001 — đảm bảo không ai đang test/sửa song song.');
  }
  if (PHASES.includes('A')) await runPhase(`PHASE A — di chuyển thuần (${DUR_A}s)`, DUR_A, false);
  if (PHASES.includes('B')) {
    await runPhase(`PHASE B — farm sói + tung chiêu (${DUR_B}s)`, DUR_B, true);
    cleanupChars();
  }
  console.log('\nXong.');
  process.exit(0);
})().catch((e) => { console.error('Lỗi:', e); process.exit(1); });
