// TEST GĐ34 — hiệu ứng đặc biệt của công pháp:
// chiêu cơ bản mang fx (chậm + đốt theo thời gian), buff thủ + phản sát
// thương. (Phần sự kiện đầu tháng GĐ35 đã bị gỡ theo ý người chơi 23/10 —
// cuối test có kiểm tra xác nhận không còn dấu vết.)
const { io } = require('socket.io-client');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const { createMerger } = require('./worldmerge.cjs');
const { makeSteer } = require('./steer.cjs');

const PORT = 3031;
const URL = `http://localhost:${PORT}`;
const CHAR_FILE = `/tmp/ttt-t32-chars.json`;
const WORLD_FILE = `/tmp/ttt-t32-world.json`;
let failures = 0;
function ok(cond, label) { console.log(`${cond ? 'PASS' : 'FAIL'}  ${label}`); if (!cond) failures++; }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function startServer() {
  return new Promise((resolve) => {
    const proc = spawn('node', ['server/index.js'], {
      cwd: path.join(__dirname, '..'),
      env: { ...process.env, PORT: String(PORT), TTT_CHAR_FILE: CHAR_FILE, TTT_ACC_FILE: '/tmp/ttt-t32-acc.json', TTT_WORLD_FILE: WORLD_FILE, TTT_DAY_REAL_MS: '6000' },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    proc.stdout.on('data', (d) => { if (String(d).includes('dang chay')) resolve(proc); });
    proc.stderr.on('data', (d) => process.stderr.write('[server-err] ' + d));
  });
}
async function stopServer(proc) { try { proc.kill('SIGKILL'); } catch {} await sleep(350); }
function patchChar(key, fn) {
  const chars = JSON.parse(fs.readFileSync(CHAR_FILE, 'utf8'));
  fn(chars[key]);
  fs.writeFileSync(CHAR_FILE, JSON.stringify(chars, null, 2));
}
function readChar(key) { return JSON.parse(fs.readFileSync(CHAR_FILE, 'utf8'))[key]; }

function wire() {
  const s = io(URL, { transports: ['websocket'] });
  const apply = createMerger();
  const S = { tick: null, char: null, errors: [], notices: [] };
  s.on('server_tick', (t) => { S.tick = apply(t); });
  s.on('char_sync', (c) => { S.char = c; });
  s.on('interact_error', (e) => S.errors.push(e.message));
  s.on('create_error', (e) => S.errors.push(e.message));
  s.on('notice', (n) => S.notices.push(n.text));
  s.on('welcome', (w) => { if (w.character) S.char = w.character; });
  return { s, S };
}
const meOf = (S) => () => { const m = S.tick?.players.find((p) => p.name === S.char?.name); return m ? { x: m.x, y: m.y } : null; };
function waitEv(s, ev, ms = 6000) { return new Promise((res, rej) => { const t = setTimeout(() => rej(new Error('timeout ' + ev)), ms); s.once(ev, (d) => { clearTimeout(t); res(d); }); }); }
async function waitFor(fn, ms, label) { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (fn()) return true; await sleep(120); } throw new Error('waitFor: ' + label); }
const wolfOf = (S) => (S.tick?.monsters || []).filter((m) => m.kind === 'wolf');

(async () => {
  try { fs.unlinkSync(CHAR_FILE); } catch {}
  try { fs.unlinkSync(WORLD_FILE); } catch {}
  let proc = await startServer();

  // ============ GĐ34: HIỆU ỨNG CÔNG PHÁP ============
  const A = wire();
  await new Promise((r) => A.s.on('connect', r));
  const needP = waitEv(A.s, 'need_character');
  A.s.emit('hello', { token: 'tok-t32a' });
  await needP;
  A.s.emit('request_roll');
  await waitEv(A.s, 'roll_result');
  const welP = waitEv(A.s, 'welcome');
  A.s.emit('create_character', { token: 'tok-t32a', name: 'Thể Sinh', classId: 'thetu' });
  await welP;
  await waitFor(() => !!A.S.tick, 6000, 'tick');
  const steerA = makeSteer(A.s, A.S, meOf(A.S));
  await steerA({ x: 700, y: 378 }, 50, 10000);
  A.s.emit('measure_linhcan');
  await waitFor(() => !!A.S.char.linhCan, 6000, 'đo linh căn');
  const skills = A.S.char.skills || [];
  const slotLHQ = skills.findIndex((k) => k.id === 'thetu_taykhong_co1'); // Liên Hoàn Quyền: chậm + đốt
  const slotHTC = skills.findIndex((k) => k.id === 'thetu_taykhong_co2'); // Hộ Thể Công: giảm st + phản
  ok(slotLHQ >= 0 && slotHTC >= 0, `Đo linh căn nhận 2 chiêu Tay không (slots ${slotLHQ}/${slotHTC})`);
  const cat = A.S.char.catalog || [];
  const eLHQ = cat.find((e) => e.id === 'thetu_taykhong_co1');
  ok(!!eLHQ && /Chậm/.test(eLHQ.fxText || '') && /Đốt/.test(eLHQ.fxText || ''), `Panel hiện hiệu ứng: "${eLHQ?.fxText}"`);

  // Ra bãi farm tìm sói
  await steerA({ x: 180, y: 1020 }, 60, 15000);
  await waitFor(() => wolfOf(A.S).length > 0, 8000, 'có sói gần');
  const w1 = wolfOf(A.S)[0];
  await steerA(() => { const w = (A.S.tick?.monsters || []).find((m) => m.id === w1.id); return w ? { x: w.x, y: w.y } : null; }, 34, 12000);
  A.s.emit('cast_skill', { slot: slotLHQ });
  await waitFor(() => { const w = (A.S.tick?.monsters || []).find((m) => m.id === w1.id); return w && (w.st === 'slow' || w.st === 'dot'); }, 4000, 'sói dính trạng thái');
  const wst = (A.S.tick.monsters || []).find((m) => m.id === w1.id);
  ok(!!wst, `Sói dính hiệu ứng sau Liên Hoàn Quyền (st=${wst?.st})`);
  const hpAfterCast = wst.hp;
  await sleep(1500); // đứng yên — chỉ DoT gây thêm sát thương
  const wAfter = (A.S.tick?.monsters || []).find((m) => m.id === w1.id);
  ok(!!wAfter && wAfter.hp < hpAfterCast, `Đốt theo thời gian tự trừ máu sói: ${hpAfterCast} → ${wAfter?.hp}`);

  // Hộ Thể Công → phản sát thương: sói cắn trúng thì tự mất máu
  const w2 = wolfOf(A.S).find((m) => m.id !== w1.id) || wAfter;
  if (w2) {
    await steerA(() => { const w = (A.S.tick?.monsters || []).find((m) => m.id === w2.id); return w ? { x: w.x, y: w.y } : null; }, 32, 12000);
    A.s.emit('cast_skill', { slot: slotHTC });
    await sleep(250);
    const wB = (A.S.tick?.monsters || []).find((m) => m.id === w2.id);
    const hpBuffHit = wB ? wB.hp : 0;
    await sleep(2200); // sói cắn ~2 lần trong lúc buff phản còn hiệu lực (3s)
    const wC = (A.S.tick?.monsters || []).find((m) => m.id === w2.id);
    ok(!!wC && wC.hp < hpBuffHit, `Phản sát thương: sói tự mất máu khi cắn người có Hộ Thể Công (${hpBuffHit} → ${wC?.hp})`);
  } else ok(false, 'Không còn sói thứ hai để test phản sát thương');
  A.s.disconnect(); await sleep(300);

  // ============ Gỡ GĐ35: sự kiện đầu tháng ĐÃ BỊ BỎ (người chơi chốt 23/10) ============
  const D = wire();
  await new Promise((r) => D.s.on('connect', r));
  D.s.emit('hello', { token: 'tok-t32a' });
  await waitFor(() => !!D.S.char, 6000, 'vào game D');
  await sleep(800);
  ok(D.S.char.merchantOffer === undefined && D.S.char.sickDaysLeft === undefined, 'Payload không còn trường sự kiện (đã gỡ)');
  ok(!D.S.notices.some((t) => t.includes('Đầu tháng')), 'Đăng nhập không còn tung sự kiện đầu tháng');
  D.s.disconnect(); await sleep(300);
  await stopServer(proc);

  console.log(failures === 0 ? 'ALL PASS' : `${failures} FAIL`);
  process.exit(failures ? 1 : 0);
})().catch(async (e) => { console.error('ERR', e.message); process.exit(1); });
