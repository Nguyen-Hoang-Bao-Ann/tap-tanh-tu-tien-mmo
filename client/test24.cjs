// Test GĐ24: THIỆN CẢM NPC (file B11: −100..100, bắt đầu 0).
// - Trò chuyện mỗi ngày +2 (lặp lại trong ngày không cộng nữa).
// - Mua/bán tại tiệm +1/lần; trả nhiệm vụ bảng cho Trưởng Làng +5.
// - ≥50: giảm giá MUA 10% + mở NHIỆM VỤ RIÊNG (nhận/trả tại NPC, xong +10).
// - ≤−50: chủ tiệm TỪ CHỐI giao dịch.
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const { io } = require('socket.io-client');
const { createMerger } = require('./worldmerge.cjs');
const { makeSteer } = require('./steer.cjs');
const URL = 'http://localhost:3013';
const CHAR_FILE = '/tmp/chars-test24.json';
const WORLD_FILE = '/tmp/world-test24.json';
const TOK = 'tok-test24-' + Date.now().toString(36);
let pass = 0, fail = 0;
const ok = (c, l) => { if (c) { pass++; console.log('  PASS', l); } else { fail++; console.log('  FAIL', l); } };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let serverProc = null;

async function startServer() {
  serverProc = spawn('node', ['server/index.js'], {
    cwd: path.join(__dirname, '..'),
    env: {
      ...process.env, PORT: '3013', TTT_TUVI_NEED: '1',
      TTT_CHAR_FILE: CHAR_FILE, TTT_ACC_FILE: '/tmp/acc-test24.json',
      TTT_DAY_REAL_MS: '6000', TTT_WORLD_FILE: WORLD_FILE, TTT_WORLD_START_MINUTES: '600',
    },
    stdio: 'ignore',
  });
  for (let i = 0; i < 40; i++) {
    try { const r = await fetch(URL + '/api/status'); if (r.ok) return; } catch { /* chưa lên */ }
    await sleep(400);
  }
  throw new Error('server test không lên');
}
async function stopServer() {
  if (serverProc) { serverProc.kill('SIGTERM'); serverProc = null; await sleep(700); }
}
function patchChar(mut) {
  const data = JSON.parse(fs.readFileSync(CHAR_FILE, 'utf8'));
  mut(data[TOK]);
  fs.writeFileSync(CHAR_FILE, JSON.stringify(data, null, 1));
}
function connect() {
  return new Promise((resolve) => {
    const s = io(URL, { transports: ['websocket'] });
    s.on('connect', () => resolve(s));
  });
}
function waitEvent(s, ev, timeout = 12000) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('timeout chờ ' + ev)), timeout);
    s.once(ev, (d) => { clearTimeout(t); resolve(d); });
  });
}
async function waitFor(fn, timeout = 30000, label = '') {
  const t0 = Date.now();
  while (Date.now() - t0 < timeout) {
    const v = await fn();
    if (v) return v;
    await sleep(200);
  }
  throw new Error('waitFor timeout: ' + label);
}
function wire(s) {
  const apply = createMerger();
  const S = { tick: null, char: null };
  s.on('server_tick', (t) => { const snap = apply(t); if (snap) S.tick = snap; });
  s.on('char_sync', (c) => { S.char = c; });
  s.on('welcome', (w) => { if (w.character) S.char = w.character; });
  return S;
}
async function huntWolves(s, S, me, count, isDone) {
  const steer = makeSteer(s, S, me);
  const deadline = Date.now() + 150000;
  while (Date.now() < deadline && !isDone()) {
    const wolf = S.tick?.monsters.find((m) => m.kind === 'wolf');
    if (!wolf) { await sleep(400); continue; }
    await steer(() => {
      const t = S.tick?.monsters.find((m) => m.id === wolf.id);
      const mp = me();
      return t ? { x: t.x, y: t.y } : (mp ? { x: mp.x, y: mp.y } : { x: 700, y: 560 });
    }, 34, 5000).catch(() => {});
    for (let i = 0; i < 6 && S.tick?.monsters.some((m) => m.id === wolf.id) && !isDone(); i++) {
      s.emit('player_attack');
      await sleep(360);
    }
  }
}

async function main() {
  fs.rmSync(CHAR_FILE, { force: true });
  fs.rmSync(WORLD_FILE, { force: true });
  await startServer();

  // ---------- Tạo nhân vật + trò chuyện ----------
  const s = await connect();
  const S = wire(s);
  const welP = waitEvent(s, 'welcome');
  s.emit('hello', { token: TOK });
  await waitEvent(s, 'need_character');
  s.emit('request_roll');
  await waitEvent(s, 'roll_result');
  s.emit('create_character', { token: TOK, name: 'Thiện Cảm Giả', classId: 'kiemtu', weaponId: 'kiem', robe: '#a8c8ec' });
  const wel = await welP;
  const me = () => (S.tick ? S.tick.players.find((p) => p.id === wel.id) : null);
  const steer = makeSteer(s, S, me);
  ok((S.char.affinity?.npc_dan || 0) === 0, 'Thiện cảm bắt đầu ở 0 (đúng file)');
  await steer({ x: 985, y: 560 }, 25);
  const dlgP = waitEvent(s, 'npc_dialog');
  s.emit('talk_npc', { npcId: 'npc_dan' });
  const dlg = await dlgP;
  ok(dlg.gained === 2 && dlg.affinity === 2 && dlg.personalQuest?.state === 'locked',
    `Trò chuyện lần đầu trong ngày: +2 thiện cảm (hiện ${dlg.affinity}), nhiệm vụ riêng còn khóa`);
  const dlg2P = waitEvent(s, 'npc_dialog');
  s.emit('talk_npc', { npcId: 'npc_dan' });
  const dlg2 = await dlg2P;
  ok(dlg2.gained === 0 && dlg2.affinity === 2, 'Trò chuyện lặp lại trong ngày: không cộng thêm');

  // ---------- Vá: có tiền + thiện cảm 49 với tiệm đan + nhiệm vụ nanh đang chờ trả ----------
  s.disconnect();
  await stopServer();
  patchChar((c) => {
    c.stones = 500;
    c.affinity = { npc_dan: 49 };
    c.inventory = { nanh_soi: 5 };
    c.quests = { q_nanhsoi: { progress: 0, state: 'active' } };
  });
  await startServer();
  const s2 = await connect();
  const S2 = wire(s2);
  const wel2P = waitEvent(s2, 'welcome');
  s2.emit('hello', { token: TOK });
  const wel2 = await wel2P;
  const me2 = () => (S2.tick ? S2.tick.players.find((p) => p.id === wel2.id) : null);
  const steer2 = makeSteer(s2, S2, me2);
  // Trả nhiệm vụ bảng cho Trưởng Làng → +5 thiện cảm Trưởng Làng
  await steer2({ x: 387, y: 545 }, 25);
  s2.emit('quest_claim', { questId: 'q_nanhsoi' });
  await waitFor(() => (S2.char?.affinity?.npc_truonglang || 0) === 5, 8000, 'thiện cảm Trưởng Làng +5');
  ok(true, 'Trả nhiệm vụ bảng → thiện cảm Trưởng Làng +5');
  ok((S2.char.inventory?.nanh_soi || 0) === 2, 'Đã nộp 3/5 Nanh Sói cho nhiệm vụ bảng');
  // Mua đan ở thiện cảm 49 (chưa giảm giá) → giao dịch +1 = 50
  await steer2({ x: 1012, y: 545 }, 25);
  const stones0 = S2.char.stones;
  s2.emit('shop_buy', { shopId: 'tiem_dan', itemId: 'dan_hoi_xuan' });
  await waitFor(() => (S2.char?.affinity?.npc_dan || 0) === 50, 8000, 'thiện cảm tiệm đan lên 50');
  ok(S2.char.stones === stones0 - 15, `Mua ở thiện cảm 49: giá gốc 15 LT (trừ ${stones0 - S2.char.stones})`);
  // Mua tiếp ở thiện cảm 50 → giảm 10%: 15 → 14
  const stones1 = S2.char.stones;
  s2.emit('shop_buy', { shopId: 'tiem_dan', itemId: 'dan_hoi_xuan' });
  await waitFor(() => (S2.char?.inventory?.dan_hoi_xuan || 0) >= 2, 8000, 'mua viên thứ hai');
  ok(S2.char.stones === stones1 - 14, `Mua ở thiện cảm ≥50: giảm 10% còn 14 LT (trừ ${stones1 - S2.char.stones})`);
  // Nhiệm vụ riêng của tiệm đan đã mở
  await steer2({ x: 985, y: 560 }, 25);
  const dlg3P = waitEvent(s2, 'npc_dialog');
  s2.emit('talk_npc', { npcId: 'npc_dan' });
  const dlg3 = await dlg3P;
  ok(dlg3.personalQuest?.state === 'available', 'Thiện cảm ≥50 → nhiệm vụ riêng MỞ');
  s2.emit('quest_accept', { questId: 'pq_dan' });
  await waitFor(() => S2.char?.quests?.pq_dan?.state === 'active', 8000, 'nhận nhiệm vụ riêng');
  ok(true, 'Nhận được nhiệm vụ riêng “Đan phường thiếu tay” (hạ 10 sói)');
  await huntWolves(s2, S2, me2, 10, () => S2.char?.quests?.pq_dan?.state === 'done');
  ok(S2.char.quests.pq_dan.state === 'done', 'Hoàn thành 10/10 sói cho nhiệm vụ riêng');
  const danTuKhi0 = S2.char.inventory?.dan_tu_khi || 0;
  const affBefore = S2.char.affinity.npc_dan;
  await steer2({ x: 985, y: 560 }, 25);
  s2.emit('quest_claim', { questId: 'pq_dan' });
  await waitFor(() => !S2.char?.quests?.pq_dan, 8000, 'trả xong nhiệm vụ riêng');
  ok((S2.char.inventory?.dan_tu_khi || 0) === danTuKhi0 + 1, 'Trả nhiệm vụ riêng: nhận thêm 1 Đan Tụ Khí');
  ok(S2.char.affinity.npc_dan === affBefore + 10, `Hoàn thành nhiệm vụ riêng: thiện cảm +10 (${affBefore} → ${S2.char.affinity.npc_dan})`);

  // ---------- Thiện cảm −60 → bị từ chối giao dịch ----------
  s2.disconnect();
  await stopServer();
  patchChar((c) => { c.affinity = { npc_dan: -60 }; });
  await startServer();
  const s3 = await connect();
  const S3 = wire(s3);
  const wel3P = waitEvent(s3, 'welcome');
  s3.emit('hello', { token: TOK });
  await wel3P;
  const me3 = () => (S3.tick ? S3.tick.players.find((p) => p.id === s3.id || p.name === 'Thiện Cảm Giả') : null);
  const steer3 = makeSteer(s3, S3, () => (S3.tick ? S3.tick.players.find((p) => p.name === 'Thiện Cảm Giả') : null));
  await steer3({ x: 1012, y: 545 }, 25);
  let refuseErr = null;
  s3.once('interact_error', (d) => { refuseErr = d; });
  const stonesR = S3.char.stones;
  s3.emit('shop_buy', { shopId: 'tiem_dan', itemId: 'dan_hoi_xuan' });
  await sleep(900);
  ok(!!refuseErr && /từ chối/.test(refuseErr.message || ''), `Thiện cảm −60: chủ tiệm TỪ CHỐI bán (${refuseErr?.message || ''})`);
  ok(S3.char.stones === stonesR, 'Giao dịch bị từ chối → Linh thạch không đổi');
  s3.disconnect();
  await stopServer();

  console.log(`\nTEST24: ${pass} PASS, ${fail} FAIL`);
  process.exit(fail ? 1 : 0);
}

main().catch(async (e) => { console.error('TEST LỖI:', e.message); await stopServer(); process.exit(1); });
