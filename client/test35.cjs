// TEST GĐ38 — BÃI FARM ĐA LOÀI:
// bản đồ có Sói (40/5) + Dơi Đen (20/4) + Thạch Quái (140/10, def 8);
// hạ dơi +3 Tu vi, hạ thạch quái +8 Tu vi; thạch quái chịu đòn NHẸ hơn sói
// (def); nhiệm vụ Diệt Dơi chỉ tính dơi (không tính sói); nhiệm vụ bảng mới
// trả thưởng Tu vi theo file.
const { io } = require('socket.io-client');
const { spawn } = require('child_process');
const fs = require('fs');
const { createMerger } = require('./worldmerge.cjs');
const { makeSteer } = require('./steer.cjs');

const PORT = 3039;
const URL = `http://localhost:${PORT}`;
const CHAR_FILE = `/tmp/ttt-t35-chars.json`;
const WORLD_FILE = `/tmp/ttt-t35-world.json`;
let failures = 0;
function ok(cond, label) { console.log(`${cond ? 'PASS' : 'FAIL'}  ${label}`); if (!cond) failures++; }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function startServer() {
  const proc = spawn('node', ['../server/index.js'], {
    cwd: __dirname,
    env: { ...process.env, PORT: String(PORT), TTT_CHAR_FILE: CHAR_FILE, TTT_ACC_FILE: '/tmp/ttt-t35-acc.json', TTT_WORLD_FILE: WORLD_FILE, TTT_DAY_REAL_MS: '6000' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  proc.stderr.on('data', (d) => process.stderr.write('[srv] ' + d));
  for (let i = 0; i < 30; i++) {
    try { const r = await fetch(`${URL}/api/status`); if (r.ok) return proc; } catch {}
    await sleep(400);
  }
  throw new Error('server không lên');
}
async function stopServer(proc) { try { proc.kill('SIGKILL'); } catch {} await sleep(350); }
function patchChar(key, fn) {
  const chars = JSON.parse(fs.readFileSync(CHAR_FILE, 'utf8'));
  fn(chars[key]);
  fs.writeFileSync(CHAR_FILE, JSON.stringify(chars, null, 2));
}
function wire() {
  const s = io(URL, { transports: ['websocket'] });
  const apply = createMerger();
  const S = { tick: null, char: null };
  s.on('server_tick', (t) => { const snap = apply(t); if (snap) S.tick = snap; });
  s.on('char_sync', (c) => { S.char = c; });
  s.on('welcome', (w) => { if (w.character) S.char = w.character; });
  return { s, S };
}
const meOf = (S) => () => { const m = S.tick?.players.find((p) => p.name === S.char?.name); return m ? { x: m.x, y: m.y } : null; };
function waitEv(s, ev, ms = 6000) { return new Promise((res, rej) => { const t = setTimeout(() => rej(new Error('timeout ' + ev)), ms); s.once(ev, (d) => { clearTimeout(t); res(d); }); }); }
async function waitFor(fn, ms, label) { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (fn()) return true; await sleep(120); } throw new Error('waitFor: ' + label); }

(async () => {
  fs.rmSync(CHAR_FILE, { force: true }); fs.rmSync(WORLD_FILE, { force: true });
  let proc = await startServer();
  const A = wire();
  await new Promise((r) => A.s.on('connect', r));
  const needP = waitEv(A.s, 'need_character');
  A.s.emit('hello', { token: 'tok-t35x' });
  await needP;
  A.s.emit('request_roll');
  await waitEv(A.s, 'roll_result');
  const welP = waitEv(A.s, 'welcome');
  A.s.emit('create_character', { token: 'tok-t35x', name: 'Thợ Săn', classId: 'kiemtu' });
  await welP;
  await waitFor(() => !!A.S.tick, 6000, 'tick');
  const steerA = makeSteer(A.s, A.S, meOf(A.S));
  await steerA({ x: 700, y: 378 }, 50, 10000);
  A.s.emit('measure_linhcan');
  await waitFor(() => !!A.S.char.linhCan, 6000, 'đo linh căn');
  // Kiểm tra 3 loài trên bản đồ với chỉ số đúng file
  const kinds = {};
  for (const m of A.S.tick.monsters) kinds[m.kind] = m;
  ok(!!kinds.wolf && kinds.wolf.maxHp === 40, `Có Sói Xám HP 40 (thấy ${kinds.wolf?.maxHp})`);
  ok(!!kinds.bat && kinds.bat.maxHp === 20, `Có Dơi Đen HP 20 (thấy ${kinds.bat?.maxHp})`);
  ok(!!kinds.golem && kinds.golem.maxHp === 140, `Có Thạch Quái HP 140 (thấy ${kinds.golem?.maxHp})`);
  A.s.disconnect(); await sleep(300);
  await stopServer(proc);
  // Công = 8 (đòn yếu, đo được def), các chỉ số khác 40 (nhanh + trâu)
  patchChar('tok-t35x', (c) => { for (const k of Object.keys(c.stats)) c.stats[k] = 40; c.stats.vatCong = 8; c.stats.phapCong = 8; });
  proc = await startServer();

  const B = wire();
  await new Promise((r) => B.s.on('connect', r));
  B.s.emit('hello', { token: 'tok-t35x' });
  await waitFor(() => !!B.S.char?.linhCan, 6000, 'vào lại');
  const steerB = makeSteer(B.s, B.S, meOf(B.S));
  // Nhận nhiệm vụ Diệt Dơi ở bảng, rồi giết 1 SÓI — tiến độ dơi phải đứng yên
  await steerB({ x: 800, y: 668 }, 55, 10000);
  B.s.emit('quest_accept', { questId: 'q_dietdoi' });
  await waitFor(() => B.S.char.quests?.q_dietdoi?.state === 'active', 5000, 'nhận q_dietdoi');
  // So sánh def: 1 lần TUNG CHIÊU duy nhất vào từng loài, đo HP tụt
  B.s.on('cast_result', (r) => { B.S.lastCast = r; });
  async function hitOnce(kind) {
    const target = (B.S.tick.monsters || []).find((m) => m.kind === kind);
    if (!target) throw new Error('không thấy ' + kind);
    await steerB(() => { const t = (B.S.tick?.monsters || []).find((m) => m.id === target.id); return t ? { x: t.x, y: t.y } : null; }, 18, 15000);
    // Tung chiêu tới khi TRÚNG ĐÚNG con này (quái khác chen vào có thể hứng
    // thay) — đứng SÁT hơn tầm đứng cắn của quái khác (26px) để nó gần nhất
    for (let attempt = 0; attempt < 10; attempt++) {
      const before = (B.S.tick.monsters || []).find((m) => m.id === target.id);
      if (!before) return { dmg: target.maxHp, maxHp: target.maxHp }; // đã chết
      B.S.lastCast = null;
      B.s.emit('cast_skill', { slot: 0 });
      await waitFor(() => !!B.S.lastCast, 5000, 'cast ' + kind);
      if (!B.S.lastCast.ok) throw new Error('cast hụt ' + kind + ': ' + B.S.lastCast.reason);
      if (B.S.lastCast.targetId === target.id) {
        await sleep(250);
        const after = (B.S.tick.monsters || []).find((m) => m.id === target.id);
        return { dmg: before.hp - (after ? after.hp : 0), maxHp: target.maxHp };
      }
      await sleep(2200); // chờ hồi chiêu rồi thử lại
      await steerB(() => { const t = (B.S.tick?.monsters || []).find((m) => m.id === target.id); return t ? { x: t.x, y: t.y } : null; }, 18, 8000);
    }
    throw new Error('cast không trúng đúng ' + kind);
  }
  async function killMonster(id, timeoutMs = 40000) {
    const t0 = Date.now();
    while (Date.now() - t0 < timeoutMs) {
      if (!(B.S.tick?.monsters || []).some((m) => m.id === id)) return true;
      await steerB(() => { const t = (B.S.tick?.monsters || []).find((m) => m.id === id); return t ? { x: t.x, y: t.y } : null; }, 30, 6000, true);
      await sleep(200); // nghỉ giữa các lượt — vòng lặp dồn dập làm nghẽn socket (bài học harness)
    }
    return !(B.S.tick?.monsters || []).some((m) => m.id === id);
  }
  const tv0 = B.S.char.tuVi || 0;
  // Hạ 1 dơi: ghi lại BƯỚC NHẢY Tu vi đầu tiên (tránh nhiễu sói lang thang bị đánh ké)
  let firstJump = 0;
  let prevTv = tv0;
  const jumpTimer = setInterval(() => { const cur = B.S.char.tuVi || 0; const d = cur - prevTv; prevTv = cur; if (d >= 3 && !firstJump) firstJump = d; }, 60); // nhảy ≥3 = thưởng hạ quái (cộng ngày chỉ +1)
  const bat = (B.S.tick.monsters || []).find((m) => m.kind === 'bat');
  ok(await killMonster(bat.id, 40000), 'Hạ được Dơi Đen');
  await waitFor(() => firstJump > 0, 5000, 'cộng tu vi dơi');
  clearInterval(jumpTimer);
  ok(firstJump === 4 || firstJump === 5, `Hạ Dơi Đen +4 Tu vi — hạng Trung (bước nhảy hạ quái +${firstJump}${firstJump === 5 ? ', gộp +1 ngày' : ''})`);
  ok(B.S.char.quests?.q_dietdoi?.progress === 1, `Nhiệm vụ Diệt Dơi: tiến độ 1/10 (thực tế ${B.S.char.quests?.q_dietdoi?.progress})`);
  // Giết 1 sói → tiến độ dơi KHÔNG tăng
  const wolf1 = (B.S.tick.monsters || []).find((m) => m.kind === 'wolf');
  ok(await killMonster(wolf1.id, 40000), 'Hạ được Sói Xám');
  await sleep(400);
  ok(B.S.char.quests?.q_dietdoi?.progress === 1, 'Hạ sói KHÔNG tính vào nhiệm vụ Diệt Dơi');
  // Def thạch quái: 1 đòn thường vào thạch quái trừ ÍT HP hơn vào sói
  const wHit = await hitOnce('wolf').catch(() => null);
  const gHit = await hitOnce('golem').catch(() => null);
  if (wHit && gHit) {
    const wDmg = wHit.dmg;
    const gDmg = gHit.dmg;
    ok(gDmg < wDmg && gDmg > 0, `Thạch Quái cứng hơn: 1 chiêu trừ ${gDmg} HP vs sói ${wDmg} HP (def 8)`);
  } else ok(false, 'Không đo được sát thương so sánh def');
  // Hạ thạch quái → +8 Tu vi: đo bằng bước nhảy (≥8 không thể là cộng ngày)
  const tv1 = B.S.char.tuVi || 0;
  let golemJump = 0;
  let prevTv2 = tv1;
  const jumpTimer2 = setInterval(() => { const cur = B.S.char.tuVi || 0; const d = cur - prevTv2; prevTv2 = cur; if (d >= 8 && !golemJump) golemJump = d; }, 60);
  const g0 = (B.S.tick.monsters || []).find((m) => m.kind === 'golem');
  ok(await killMonster(g0.id, 60000), 'Hạ được Thạch Quái');
  await waitFor(() => golemJump > 0, 5000, 'cộng tu vi thạch');
  clearInterval(jumpTimer2);
  ok(golemJump === 8 || golemJump === 9, `Hạ Thạch Quái +8 Tu vi (bước nhảy +${golemJump}${golemJump === 9 ? ', gộp +1 ngày' : ''})`);
  B.s.disconnect(); await sleep(300);
  await stopServer(proc);

  console.log(failures === 0 ? 'TEST35: ALL PASS' : `TEST35: ${failures} FAIL`);
  process.exit(failures ? 1 : 0);
})().catch(async (e) => { console.error('ERR', e.message); process.exit(1); });
