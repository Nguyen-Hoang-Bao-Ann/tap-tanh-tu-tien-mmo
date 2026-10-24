// TEST GĐ57 — BÍ CẢNH THẠCH LÂM:
// 1) Chưa có tông môn: cổng báo realmInfo.canEnter=false, realm_portal bị từ chối.
// 2) Đệ tử Thiên Kiếm: qua cổng vào được (vị trí nhảy vào vùng bí cảnh).
// 3) Quái: đủ Kiếm Ma + Huyết Lang + đúng 1 Thạch Khôi Lỗi, tất cả trong
//    vùng; quái farm cũ không con nào lọt sang phía đông.
// 4) Vách ngăn: trong bí cảnh đi hướng tây không xuyên ra được.
// 5) Hạ Thạch Khôi Lỗi → rương phẩm B/A (minChestGrade B).
// 6) Cổng trở về: về đúng sân Thanh Phong Môn.
const { io } = require('socket.io-client');
const { spawn } = require('child_process');
const fs = require('fs');
const { createMerger } = require('./worldmerge.cjs');

const PORT = 3067;
const URL = `http://localhost:${PORT}`;
const CHAR_FILE = '/tmp/ttt-t45-chars.json';
const ACC_FILE = '/tmp/ttt-t45-acc.json';
const WORLD_FILE = '/tmp/ttt-t45-world.json';
const TOKEN = 'tok-realm45';
const NAME = 'Thám Bí Cảnh';
let failures = 0;
function ok(cond, label) { console.log(`${cond ? 'PASS' : 'FAIL'}  ${label}`); if (!cond) failures++; }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function boot() {
  const proc = spawn('node', ['../server/index.js'], {
    cwd: __dirname,
    env: { ...process.env, PORT: String(PORT), TTT_CHAR_FILE: CHAR_FILE, TTT_ACC_FILE: ACC_FILE, TTT_WORLD_FILE: WORLD_FILE },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  proc.stderr.on('data', (d) => process.stderr.write('[srv] ' + d));
  for (let i = 0; i < 40; i++) {
    try { const r = await fetch(`${URL}/api/status`); if (r.ok) return proc; } catch {}
    await sleep(300);
  }
  throw new Error('server không lên');
}
function waitEv(s, ev, ms = 9000) { return new Promise((res, rej) => { const t = setTimeout(() => rej(new Error('timeout ' + ev)), ms); s.once(ev, (d) => { clearTimeout(t); res(d); }); }); }
async function waitFor(fn, ms, label) { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (fn()) return true; await sleep(120); } throw new Error('waitFor: ' + label); }
function wireState(s) {
  const apply = createMerger();
  const S = { tick: null, sync: null };
  s.on('server_tick', (t) => { const snap = apply(t); if (snap) S.tick = snap; });
  s.on('char_sync', (c) => { S.sync = c; });
  return S;
}
const me = (S) => S.tick?.players?.find((p) => p.name === NAME);
async function steerTo(s, S, x, y, tol = 16, ms = 30000) {
  const t0 = Date.now();
  let last = null, lastMove = Date.now(), sign = 1, wp = null;
  while (Date.now() - t0 < ms) {
    const p = me(S);
    if (!p) { await sleep(120); continue; }
    if (!last || Math.hypot(p.x - last.x, p.y - last.y) > 8) { last = { x: p.x, y: p.y }; lastMove = Date.now(); }
    const goal = wp || { x, y };
    const dx = goal.x - p.x, dy = goal.y - p.y;
    if (Math.hypot(dx, dy) <= tol) {
      if (wp) { wp = null; lastMove = Date.now(); continue; }
      s.emit('client_input', { vx: 0, vy: 0 });
      return p;
    }
    // Kẹt vật cản (cây/nhà) quá 1,2s → vòng tránh sang bên ±140px rồi đi tiếp
    if (!wp && Date.now() - lastMove > 1200) {
      sign = -sign;
      wp = { x: p.x + 26, y: p.y + sign * 140 };
      lastMove = Date.now();
    }
    s.emit('client_input', { vx: Math.sign(dx) * Math.min(1, Math.abs(dx) / 40), vy: Math.sign(dy) * Math.min(1, Math.abs(dy) / 40) });
    await sleep(110);
  }
  s.emit('client_input', { vx: 0, vy: 0 });
  throw new Error(`steerTo timeout → (${x},${y}), đang ở (${me(S)?.x},${me(S)?.y})`);
}
async function joinGuest(token, name, classId) {
  const s = io(URL, { transports: ['websocket'] });
  await new Promise((r) => s.on('connect', r));
  const needP = waitEv(s, 'need_character').catch(() => null);
  const welP = waitEv(s, 'welcome').catch(() => null);
  s.emit('hello', { token });
  const first = await Promise.race([needP.then(() => 'need'), welP.then(() => 'welcome')]);
  if (first === 'need') {
    s.emit('request_roll');
    await waitEv(s, 'roll_result');
    const w2 = waitEv(s, 'welcome');
    s.emit('create_character', { token, name, classId });
    await w2;
  }
  return s;
}
const inRealm = (x, y) => x >= 1760 && x <= 2640 && y >= 240 && y <= 960;

(async () => {
  for (const f of [CHAR_FILE, ACC_FILE]) fs.rmSync(f, { force: true });
  fs.writeFileSync(WORLD_FILE, JSON.stringify({ totalMinutes: 10 * 1440 + 600, savedAt: Date.now() }));
  let proc = await boot();
  let s = await joinGuest(TOKEN, NAME, 'kiemtu');
  let S = wireState(s);
  await waitFor(() => !!me(S), 8000, 'thấy mình trong tick');

  // ---------- 1) Chưa tông môn: cổng từ chối ----------
  await steerTo(s, S, 1438, 648, 18);
  let dlg = (s.emit('talk_npc', { npcId: 'npc_bicanh_in' }), await waitEv(s, 'npc_dialog'));
  ok(dlg.realmInfo && dlg.realmInfo.canEnter === false, 'chưa tông môn: hộp thoại cổng báo không vào được');
  const errP = waitEv(s, 'interact_error').catch(() => null);
  s.emit('realm_portal', { action: 'enter' });
  const err = await errP;
  await sleep(400);
  ok(!!err && !inRealm(me(S).x, me(S).y), 'chưa tông môn: realm_portal bị từ chối, người vẫn ở làng');

  // ---------- Gán đệ tử Thiên Kiếm + chỉ số mạnh (sửa file, khởi động lại) ----------
  s.disconnect();
  proc.kill('SIGKILL');
  await sleep(600);
  const chars = JSON.parse(fs.readFileSync(CHAR_FILE, 'utf8'));
  const key = Object.keys(chars).find((k) => chars[k].name === NAME);
  Object.assign(chars[key], {
    sect: 'thienkiem', realm: 'lk', tier: 9,
    // GĐ59b: chỉ số của một đệ tử MẠNH sắp lên Trúc Cơ (đối tượng thật của
    // bí cảnh Trúc Cơ) — bộ số cũ {60,60,40}/700HP chết hội đồng trước khi
    // chạm được trùm khi quái sinh không may mắn (GĐ57 qua được nhờ quái
    // sinh thưa phía tây); test kiểm HỆ THỐNG cổng/quái/rương, không kiểm
    // cân bằng số.
    stats: { khiHuyet: 80, vatCong: 90, vatPhong: 55, phapCong: 20, phapPhong: 20, tocDo: 30, thanThuc: 30 },
    hp: 900,
  });
  fs.writeFileSync(CHAR_FILE, JSON.stringify(chars));
  proc = await boot();
  s = await joinGuest(TOKEN, NAME, 'kiemtu');
  S = wireState(s);
  await waitFor(() => !!me(S), 8000, 'vào lại sau khi gán tông môn');

  // ---------- 2) Đệ tử: qua cổng ----------
  await steerTo(s, S, 1438, 648, 18);
  dlg = (s.emit('talk_npc', { npcId: 'npc_bicanh_in' }), await waitEv(s, 'npc_dialog'));
  ok(dlg.realmInfo && dlg.realmInfo.canEnter === true, 'đệ tử Thiên Kiếm: cổng cho qua');
  s.emit('realm_portal', { action: 'enter' });
  await waitFor(() => me(S) && inRealm(me(S).x, me(S).y), 8000, 'vị trí nhảy vào bí cảnh');
  ok(true, `qua cổng: đang ở trong bí cảnh (${me(S).x},${me(S).y})`);

  // ---------- 3) Quái trong vùng ----------
  await waitFor(() => (S.tick?.monsters || []).length > 0, 8000, 'có danh sách quái');
  const mons = S.tick.monsters;
  const km = mons.filter((m) => m.kind === 'kiemma');
  const hl = mons.filter((m) => m.kind === 'huyetlang');
  const kl = mons.filter((m) => m.kind === 'khoiloi');
  ok(km.length >= 1 && hl.length >= 1 && kl.length === 1, `đủ 3 loài bí cảnh (Kiếm Ma ${km.length}, Huyết Lang ${hl.length}, Khôi Lỗi ${kl.length})`);
  ok([...km, ...hl, ...kl].every((m) => inRealm(m.x, m.y)), 'mọi quái bí cảnh đều ở trong vùng');
  ok(mons.filter((m) => ['wolf', 'bat', 'golem'].includes(m.kind)).every((m) => m.x < 1600), 'quái farm cũ không lọt sang phía đông');

  // ---------- 4) Vách ngăn phía tây ----------
  await steerTo(s, S, 1830, 700, 14);
  s.emit('client_input', { vx: -1, vy: 0 });
  await sleep(2500);
  s.emit('client_input', { vx: 0, vy: 0 });
  await sleep(200);
  ok(me(S).x >= 1734, `đi tây 2,5s vẫn trong bí cảnh (x=${me(S).x}) — vách ngăn chặn được`);

  // ---------- 5) Hạ Thạch Khôi Lỗi → rương B/A ----------
  let chestOpened = null;
  s.on('chest_opened', (c) => { chestOpened = c; });
  const boss = () => (S.tick?.monsters || []).find((m) => m.kind === 'khoiloi');
  const t0 = Date.now();
  let lastBossPos = null;
  while (Date.now() - t0 < 90000) {
    const bb = boss();
    if (!bb) break;
    lastBossPos = { x: bb.x, y: bb.y };
    const p = me(S);
    const d = Math.hypot(bb.x - p.x, bb.y - p.y);
    if (d > 40) {
      s.emit('client_input', { vx: Math.sign(bb.x - p.x), vy: Math.sign(bb.y - p.y) });
    } else {
      s.emit('client_input', { vx: 0, vy: 0 });
      s.emit('player_attack');
    }
    await sleep(160);
  }
  s.emit('client_input', { vx: 0, vy: 0 });
  ok(!boss(), 'hạ được Thạch Khôi Lỗi');
  await sleep(400);
  const chest = (S.tick?.chests || []).find((c) => lastBossPos && Math.hypot(c.x - lastBossPos.x, c.y - lastBossPos.y) < 90);
  if (chestOpened) {
    // GĐ59b: rương tự mở ngay khi rơi vì người giết đứng trong tầm 42px
    // (CHEST_OPEN_RANGE) — biến mất khỏi tick trước cả khi kịp kiểm 400ms.
    ok(chestOpened.grade === 'B' || chestOpened.grade === 'A', `rương của trùm là phẩm ${chestOpened.grade} (tối thiểu B)`);
    ok(true, 'mở rương trùm thành công (tự mở khi đứng gần)');
  } else if (chest) {
    ok(chest.grade === 'B' || chest.grade === 'A', `rương của trùm là phẩm ${chest.grade} (tối thiểu B)`);
    await steerTo(s, S, chest.x, chest.y, 20, 15000);
    await waitFor(() => !!chestOpened, 6000, 'mở được rương trùm');
    ok(true, 'mở rương trùm thành công');
  } else {
    ok(false, 'không thấy rương sau khi trùm gục (chests trong tick: ' + JSON.stringify((S.tick?.chests || []).map((c) => c.grade)) + ')');
  }

  // ---------- 6) Cổng trở về ----------
  await steerTo(s, S, 1846, 640, 18);
  dlg = (s.emit('talk_npc', { npcId: 'npc_bicanh_out' }), await waitEv(s, 'npc_dialog'));
  ok(dlg.realmInfo && dlg.realmInfo.dir === 'exit', 'cổng trong bí cảnh là cổng trở về');
  s.emit('realm_portal', { action: 'exit' });
  await waitFor(() => me(S) && me(S).x < 1600, 8000, 'về lại phía làng');
  ok(Math.hypot(me(S).x - 1438, me(S).y - 648) < 30, `trở về đúng sân Thanh Phong Môn (${me(S).x},${me(S).y})`);

  s.disconnect();
  proc.kill('SIGKILL');
  console.log(failures === 0 ? '\nTEST45 ALL PASS' : `\nTEST45 CÓ ${failures} FAIL`);
  process.exit(failures === 0 ? 0 : 1);
})().catch((e) => { console.error('TEST45 SẬP:', e.message); process.exit(2); });
