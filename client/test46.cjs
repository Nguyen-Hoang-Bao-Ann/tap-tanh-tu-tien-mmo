// TEST GĐ59 — HỆ THỐNG NHIỀU BẢN ĐỒ (52 map GDD + Trận Dịch Chuyển):
// 1) Phàm nhân: danh sách đích có Thanh Vân Thành nhưng KHÓA (cần LK1); đi bị từ chối.
// 2) LK1: vào được Thanh Vân Thành (map_enter đúng: 2400×1800 — GĐ60 map siêu to, có decor), đồng bộ
//    CÁCH LY map (ở thành không thấy bot/người ở làng; làng không thấy người ở thành).
// 3) Từ thành: 49 đích; đất nghề LK1 mở, bãi săn LK7/TC/KD khóa đúng tầng.
// 4) Vào Dược Cốc (đất nghề, an toàn, không quái) → đích duy nhất là về thành.
// 5) LK7 bị chặn ở LK1 → LK9 vào được Băng Phong Cốc: có Thủy Triều Tinh, hạ được
//    (monster_killed + biến mất khỏi tick + cộng Tu vi).
// 6) Chết ở map săn → hồi sinh về LÀNG (map_enter home + quảng trường + máu đầy);
//    mapId được LƯU: đăng nhập lại vẫn ở map săn (trước khi chết).
// 7) Kim Đan: vào được Kim Quáng Động (theme metal) — có đúng Kim Giáp Tê; về lại làng.
const { io } = require('socket.io-client');
const { spawn } = require('child_process');
const fs = require('fs');
const { createMerger } = require('./worldmerge.cjs');

const PORT = 3074;
const URL = `http://localhost:${PORT}`;
const CHAR_FILE = '/tmp/ttt-t46-chars.json';
const ACC_FILE = '/tmp/ttt-t46-acc.json';
const WORLD_FILE = '/tmp/ttt-t46-world.json';
const TOKEN = 'tok-map46';
const NAME = 'Du Hanh Map';
const TOKEN_B = 'tok-map46-b';
const NAME_B = 'Quan Sat Map';
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
  const S = { tick: null, sync: null, mapEnters: [] };
  s.on('server_tick', (t) => { const snap = apply(t); if (snap) S.tick = snap; });
  s.on('char_sync', (c) => { S.sync = c; });
  s.on('map_enter', (d) => { S.mapEnters.push(d); });
  return S;
}
const me = (S, name = NAME) => S.tick?.players?.find((p) => p.name === name);
async function steerTo(s, S, x, y, tol = 16, ms = 30000, name = NAME) {
  const t0 = Date.now();
  let last = null, lastMove = Date.now(), sign = 1, wp = null;
  while (Date.now() - t0 < ms) {
    const p = me(S, name);
    if (!p) { await sleep(120); continue; }
    if (!last || Math.hypot(p.x - last.x, p.y - last.y) > 8) { last = { x: p.x, y: p.y }; lastMove = Date.now(); }
    const goal = wp || { x, y };
    const dx = goal.x - p.x, dy = goal.y - p.y;
    if (Math.hypot(dx, dy) <= tol) {
      if (wp) { wp = null; lastMove = Date.now(); continue; }
      s.emit('client_input', { vx: 0, vy: 0 });
      return p;
    }
    if (!wp && Date.now() - lastMove > 1200) {
      sign = -sign;
      wp = { x: p.x + 26, y: p.y + sign * 140 };
      lastMove = Date.now();
    }
    s.emit('client_input', { vx: Math.sign(dx) * Math.min(1, Math.abs(dx) / 40), vy: Math.sign(dy) * Math.min(1, Math.abs(dy) / 40) });
    await sleep(110);
  }
  s.emit('client_input', { vx: 0, vy: 0 });
  throw new Error(`steerTo timeout → (${x},${y}), đang ở (${me(S, name)?.x},${me(S, name)?.y})`);
}
async function joinGuest(token, name, classId) {
  const s = io(URL, { transports: ['websocket'] });
  const S = wireState(s); // gắn trước hello — map_enter đầu tiên đến cùng lúc welcome
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
  return { s, S };
}
function patchChar(fn) {
  const chars = JSON.parse(fs.readFileSync(CHAR_FILE, 'utf8'));
  const key = Object.keys(chars).find((k) => chars[k].name === NAME);
  fn(chars[key]);
  fs.writeFileSync(CHAR_FILE, JSON.stringify(chars));
  return chars[key];
}
async function travelTo(s, S, mapId) {
  const before = S.mapEnters.length;
  s.emit('travel_list');
  await waitEv(s, 'travel_info');
  s.emit('travel_to', { mapId });
  await waitFor(() => S.mapEnters.length > before, 6000, 'map_enter ' + mapId);
  return S.mapEnters[S.mapEnters.length - 1];
}
const STRONG = { khiHuyet: 60, vatCong: 60, vatPhong: 40, phapCong: 20, phapPhong: 20, tocDo: 30, thanThuc: 30 };

(async () => {
  for (const f of [CHAR_FILE, ACC_FILE]) fs.rmSync(f, { force: true });
  fs.writeFileSync(WORLD_FILE, JSON.stringify({ totalMinutes: 10 * 1440 + 600, savedAt: Date.now() }));
  let proc = await boot();
  process.on('exit', () => { try { proc.kill('SIGKILL'); } catch {} });

  // ---------- 1) Phàm nhân: thành khóa ----------
  let { s, S } = await joinGuest(TOKEN, NAME, 'kiemtu');
  await waitFor(() => !!me(S), 8000, 'thấy mình trong tick');
  ok(S.mapEnters.length >= 1 && S.mapEnters[0].isHome === true, 'đăng nhập: map_enter báo map nhà (Làng Tân Thủ)');
  await steerTo(s, S, 1080, 620, 18);
  s.emit('travel_list');
  let info = await waitEv(s, 'travel_info');
  const cityDest = info.list.find((d) => d.id === 'thanh_van_thanh');
  const realmDest = info.list.find((d) => d.id === 'thach_lam');
  ok(info.list.length === 2 && cityDest && cityDest.canEnter === false && /Luyện Khí/.test(cityDest.needText || ''), 'phàm nhân: Thanh Vân Thành khóa, ghi cần Luyện Khí tầng 1');
  ok(realmDest && realmDest.canEnter === false, 'phàm nhân: Thạch Lâm khóa (chưa phải đệ tử)');
  const errP = waitEv(s, 'interact_error').catch(() => null);
  s.emit('travel_to', { mapId: 'thanh_van_thanh' });
  const err = await errP;
  await sleep(400);
  ok(!!err && S.mapEnters.length === 1, 'phàm nhân: travel_to bị từ chối, vẫn ở làng');

  // ---------- Gán LK1 + chỉ số mạnh ----------
  s.disconnect();
  proc.kill('SIGKILL');
  await sleep(600);
  patchChar((c) => Object.assign(c, { realm: 'lk', tier: 1, stats: STRONG, hp: 700, stones: 100000, linhCan: { elements: ['kim'], main: 'kim', count: 1 } })); // GĐ60: dư Linh thạch để trả phí dịch chuyển
  proc = await boot();
  ({ s, S } = await joinGuest(TOKEN, NAME, 'kiemtu'));
  await waitFor(() => !!me(S), 8000, 'vào lại với LK1');
  const { s: sB, S: SB } = await joinGuest(TOKEN_B, NAME_B, 'phaptu');
  await waitFor(() => !!me(SB, NAME_B), 8000, 'người quan sát vào làng');

  // ---------- 2) LK1 vào Thanh Vân Thành + cách ly đồng bộ ----------
  await steerTo(s, S, 1080, 620, 18);
  const cityEnter = await travelTo(s, S, 'thanh_van_thanh');
  ok(cityEnter.mapId === 'thanh_van_thanh' && cityEnter.isHome === false && cityEnter.w === 2400 && cityEnter.h === 1800, 'vào Thanh Vân Thành: map_enter đúng kích thước 2400×1800 (GĐ60 siêu to)');
  ok(Array.isArray(cityEnter.decor) && cityEnter.decor.length >= 100, `thành có decor dày để vẽ (${cityEnter.decor?.length} vật)`);
  ok(Math.hypot(me(S).x - 1200, me(S).y - 1594) < 30, 'tới nơi: đứng ở cổng thành (1200,1594)');
  await sleep(700);
  const cityPlayers = S.tick?.players || [];
  ok(cityPlayers.length === 1 && cityPlayers[0].name === NAME, 'ở thành: tick chỉ có mình mình (không bot, không người làng)');
  ok((S.tick?.monsters || []).length === 0, 'ở thành (an toàn): không có quái');
  ok(!me(SB, NAME), 'ở làng: người quan sát KHÔNG thấy người đã sang thành');

  // ---------- 3) Danh sách đích từ thành ----------
  s.emit('travel_list');
  info = await waitEv(s, 'travel_info');
  ok(info.list.length === 50, `từ thành có 50 đích (thực tế ${info.list.length})`);
  const gate = (id) => info.list.find((d) => d.id === id)?.canEnter;
  ok(gate('duoc_coc') === true && gate('lang_tan_thu') === true, 'LK1: Dược Cốc + về làng mở');
  ok(gate('bang_phong_coc') === false && gate('huyet_sac_rung') === false && gate('vo_tan_hu_khong') === false && gate('kim_quang_dong') === false, 'LK1: bãi LK7/TC/TC9/KD đều khóa đúng tầng');

  // ---------- 4) Dược Cốc: an toàn, đích duy nhất là về thành ----------
  const gardenEnter = await travelTo(s, S, 'duoc_coc');
  ok(gardenEnter.theme === 'garden' && gardenEnter.safe === true && gardenEnter.w === 2200 && gardenEnter.h === 1650, 'vào Dược Cốc: theme garden, an toàn, 2200×1650 (GĐ60)');
  await sleep(500);
  ok((S.tick?.monsters || []).length === 0, 'Dược Cốc không có quái');
  s.emit('travel_list');
  info = await waitEv(s, 'travel_info');
  ok(info.list.length === 1 && info.list[0].id === 'thanh_van_thanh', 'từ Dược Cốc chỉ có đường về Thanh Vân Thành');
  await travelTo(s, S, 'thanh_van_thanh');

  // ---------- LK7 bị chặn khi mới LK1 ----------
  const err2P = waitEv(s, 'interact_error').catch(() => null);
  s.emit('travel_to', { mapId: 'bang_phong_coc' });
  const err2 = await err2P;
  ok(!!err2 && mapOfLast(S) === 'thanh_van_thanh', 'LK1 đi Băng Phong Cốc (LK7): bị từ chối, vẫn ở thành');
  function mapOfLast(Sx) { return Sx.mapEnters[Sx.mapEnters.length - 1]?.mapId; }

  // ---------- Gán LK9 ----------
  s.disconnect(); sB.disconnect();
  proc.kill('SIGKILL');
  await sleep(600);
  patchChar((c) => Object.assign(c, { tier: 9, hp: 700 }));
  proc = await boot();
  ({ s, S } = await joinGuest(TOKEN, NAME, 'kiemtu'));
  await waitFor(() => !!me(S), 8000, 'vào lại với LK9');
  ok(S.mapEnters[0]?.mapId === 'thanh_van_thanh', 'đăng nhập lại: vẫn ở Thanh Vân Thành (mapId đã lưu từ vòng trước)');
  const iceEnter = await travelTo(s, S, 'bang_phong_coc');
  ok(iceEnter.theme === 'ice' && iceEnter.safe === false && iceEnter.w === 3800 && iceEnter.h === 2850, 'vào Băng Phong Cốc: theme ice, nguy hiểm, 3800×2850 (GĐ60)');
  await sleep(500);
  const iceMons = (S.tick?.monsters || []).filter((m) => m.kind === 'thuy_trieu_tinh');
  ok(iceMons.length >= 3, `Băng Phong Cốc có Thủy Triều Tinh (${iceMons.length} con trong snapshot)`);

  // ---------- 5) Hạ 1 con Thủy Triều Tinh ----------
  const target = iceMons[0];
  const killedP = waitEv(s, 'monster_killed', 30000).catch(() => null);
  const tuViBefore = S.sync?.tuVi ?? 0;
  const t0 = Date.now();
  let killedInfo = null;
  while (Date.now() - t0 < 28000) {
    const mNow = (S.tick?.monsters || []).find((m) => m.id === target.id);
    if (!mNow) break;
    const mp = me(S);
    if (Math.hypot(mp.x - mNow.x, mp.y - mNow.y) > 38) { await steerTo(s, S, mNow.x, mNow.y, 26, 6000).catch(() => {}); }
    s.emit('player_attack');
    killedInfo = await Promise.race([killedP, sleep(450).then(() => null)]);
    if (killedInfo) break;
  }
  ok(!!killedInfo && killedInfo.monsterId === target.id, 'hạ được Thủy Triều Tinh ở Băng Phong Cốc');
  await sleep(600);
  ok(!(S.tick?.monsters || []).some((m) => m.id === target.id), 'quái đã hạ biến mất khỏi tick');
  ok((S.sync?.tuVi ?? 0) >= tuViBefore + 3, `cộng Tu vi khi hạ quái GDD (${tuViBefore} → ${S.sync?.tuVi})`);

  // ---------- 6) mapId được lưu + chết thì về làng ----------
  s.disconnect();
  proc.kill('SIGKILL');
  await sleep(600);
  const saved = patchChar((c) => Object.assign(c, { hp: 6 }));
  ok(saved.mapId === 'bang_phong_coc', 'mapId đã lưu trong hồ sơ: bang_phong_coc');
  proc = await boot();
  ({ s, S } = await joinGuest(TOKEN, NAME, 'kiemtu'));
  await waitFor(() => !!me(S), 8000, 'đăng nhập lại ở map săn');
  ok(S.mapEnters[0]?.mapId === 'bang_phong_coc', 'đăng nhập lại: vẫn ở Băng Phong Cốc');
  // Lại gần quái bằng xung input ngắn (120ms) để NGỪNG NGAY khi chết — tránh
  // steerTo chạy chồng sau khi hồi sinh làm nhân vật đi khỏi quảng trường.
  const t0d = Date.now();
  while (Date.now() - t0d < 25000 && !S.mapEnters.some((e) => e.isHome)) {
    const mp = me(S);
    const mm = (S.tick?.monsters || [])[0];
    if (!mp || !mm) { await sleep(150); continue; }
    const d = Math.hypot(mm.x - mp.x, mm.y - mp.y);
    if (d > 30) s.emit('client_input', { vx: Math.sign(mm.x - mp.x) * Math.min(1, Math.abs(mm.x - mp.x) / 40), vy: Math.sign(mm.y - mp.y) * Math.min(1, Math.abs(mm.y - mp.y) / 40) });
    else s.emit('client_input', { vx: 0, vy: 0 });
    await sleep(120);
  }
  s.emit('client_input', { vx: 0, vy: 0 });
  ok(S.mapEnters.some((e) => e.isHome), 'bị quái hạ ở map săn → được đưa về làng');
  await waitFor(() => { const p = me(S); return p && Math.hypot(p.x - 700, p.y - 560) < 140; }, 6000, 'đứng ở quảng trường');
  ok(me(S).hp >= 700, 'hồi sinh máu đầy');

  // ---------- 7) Kim Đan vào Kim Quáng Động ----------
  s.disconnect();
  proc.kill('SIGKILL');
  await sleep(600);
  patchChar((c) => Object.assign(c, { realm: 'kd', tier: 1, hp: 700 }));
  proc = await boot();
  ({ s, S } = await joinGuest(TOKEN, NAME, 'kiemtu'));
  await waitFor(() => !!me(S), 8000, 'vào lại với Kim Đan');
  await steerTo(s, S, 1080, 620, 18);
  await travelTo(s, S, 'thanh_van_thanh');
  const metalEnter = await travelTo(s, S, 'kim_quang_dong');
  ok(metalEnter.theme === 'metal' && metalEnter.safe === false, 'vào Kim Quáng Động: theme metal, nguy hiểm');
  await sleep(500);
  const metalMons = (S.tick?.monsters || []).filter((m) => m.kind === 'kim_giap_te');
  ok(metalMons.length === 6, `Kim Quáng Động có 6 Kim Giáp Tê — hạng strong ×6 theo GĐ60 (thấy ${metalMons.length})`);
  await travelTo(s, S, 'thanh_van_thanh');
  const homeEnter = await travelTo(s, S, 'lang_tan_thu');
  ok(homeEnter.isHome === true && Math.hypot(me(S).x - 1080, me(S).y - 664) < 30, 'về làng: map_enter home, đứng cạnh Trận Dịch Chuyển');

  s.disconnect();
  proc.kill('SIGKILL');
  console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAIL`);
  process.exit(failures ? 1 : 0);
})().catch((e) => { console.error('TEST ERROR', e); process.exit(2); });
