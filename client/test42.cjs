// TEST GĐ54 — CÔNG PHÁP TÔNG MÔN: danh sách tông (Trúc Cơ theo lớp + vũ
// khí đang cầm) trong sectInfo; học qua tông được GIẢM 5 điểm mỗi điều
// kiện chỉ số (đúng file thiết kế); người ngoài tông bị chặn; học thường
// vẫn phải đủ điều kiện gốc.
const { io } = require('socket.io-client');
const { spawn } = require('child_process');
const fs = require('fs');

const PORT = 3059;
const URL = `http://localhost:${PORT}`;
const CHAR_FILE = '/tmp/ttt-t42-chars.json';
const ACC_FILE = '/tmp/ttt-t42-acc.json';
const WORLD_FILE = '/tmp/ttt-t42-world.json';
const TOKEN = 'tok-sect42';
let failures = 0;
function ok(cond, label) { console.log(`${cond ? 'PASS' : 'FAIL'}  ${label}`); if (!cond) failures++; }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Chiêu mục tiêu: Vạn Kiếm Quy Tông — cần Vật công 40 + Tốc độ 30 (gốc).
const catalog = JSON.parse(fs.readFileSync('../server/data/skills_catalog.json', 'utf8'));
const KIEM_TC = catalog.kiemtu.kiem.filter((s) => s.tier === 'trucco');
const TARGET = KIEM_TC.find((s) => (s.cond || []).some((c) => c.stat === 'vatCong' && c.value === 40));
const LK_SKILL = catalog.kiemtu.kiem.find((s) => s.tier === 'luyenkhi');

async function boot() {
  const proc = spawn('node', ['../server/index.js'], {
    cwd: __dirname,
    env: { ...process.env, PORT: String(PORT), TTT_CHAR_FILE: CHAR_FILE, TTT_ACC_FILE: ACC_FILE, TTT_WORLD_FILE: WORLD_FILE, TTT_DAY_REAL_MS: '6000' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  proc.stderr.on('data', (d) => process.stderr.write('[srv] ' + d));
  for (let i = 0; i < 40; i++) {
    try { const r = await fetch(`${URL}/api/status`); if (r.ok) return proc; } catch {}
    await sleep(300);
  }
  throw new Error('server không lên');
}
async function kill(proc) { proc.kill('SIGKILL'); await sleep(700); }
function waitEv(s, ev, ms = 8000) { return new Promise((res, rej) => { const t = setTimeout(() => rej(new Error('timeout ' + ev)), ms); s.once(ev, (d) => { clearTimeout(t); res(d); }); }); }
async function connect() {
  const s = io(URL, { transports: ['websocket'] });
  await new Promise((r) => s.on('connect', r));
  return s;
}
function patchChar(mut) {
  const chars = JSON.parse(fs.readFileSync(CHAR_FILE, 'utf8'));
  const key = Object.keys(chars)[0];
  mut(chars[key]);
  fs.writeFileSync(CHAR_FILE, JSON.stringify(chars));
}

(async () => {
  ok(!!TARGET && !!LK_SKILL && KIEM_TC.length === 5, `dữ liệu: kiem có ${KIEM_TC.length} chiêu Trúc Cơ, mục tiêu = ${TARGET?.name}`);
  for (const f of [CHAR_FILE, ACC_FILE]) fs.rmSync(f, { force: true });
  fs.writeFileSync(WORLD_FILE, JSON.stringify({ totalMinutes: 10 * 1440 + 600, savedAt: Date.now() }));

  // --- Lượt 1: tạo nhân vật ---
  let proc = await boot();
  let s = await connect();
  const needP = waitEv(s, 'need_character');
  s.emit('hello', { token: TOKEN });
  await needP;
  s.emit('request_roll');
  await waitEv(s, 'roll_result');
  const welP = waitEv(s, 'welcome');
  s.emit('create_character', { token: TOKEN, name: 'Đệ Tử Test', classId: 'kiemtu' });
  await welP;
  s.disconnect();
  await kill(proc);

  // Vá nhân vật: Trúc Cơ, Vật công 37 + Tốc độ 27 (thiếu điều kiện GỐC
  // 40/30 nhưng đủ điều kiện ĐỆ TỬ 35/25), Thần thức 100 cho học nhanh.
  patchChar((c) => {
    c.realm = 'tc'; c.tier = 1; c.weaponId = 'kiem';
    c.linhCan = { elements: ['Kim'], main: 'Kim', count: 1 };
    c.stats = { khiHuyet: 10, vatCong: 37, vatPhong: 10, phapCong: 10, phapPhong: 10, tocDo: 27, thanThuc: 100 };
    c.skills = []; c.sect = null; c.merit = 600; c.learning = null;
    c.x = 740; c.y = 490;
  });

  // --- Lượt 2: chưa có tông ---
  proc = await boot();
  s = await connect();
  let lastErr = '';
  s.on('interact_error', (e) => { lastErr = e.message || ''; });
  async function waitErr(substr, ms = 5000) {
    const t0 = Date.now();
    while (Date.now() - t0 < ms) { if (lastErr.includes(substr)) return true; await sleep(100); }
    return false;
  }
  async function talkSugia() {
    const p = waitEv(s, 'npc_dialog');
    s.emit('talk_npc', { npcId: 'npc_sugia' });
    return p;
  }
  const wel2 = waitEv(s, 'welcome');
  s.emit('hello', { token: TOKEN });
  await wel2;
  await sleep(300);

  const d1 = await talkSugia();
  ok(d1.sectInfo && d1.sectInfo.skills === null, 'chưa có tông môn: sectInfo.skills = null');
  lastErr = '';
  s.emit('learn_skill', { skillId: TARGET.id, via: 'sect' });
  ok(await waitErr('Chỉ đệ tử tông môn'), 'người ngoài tông học qua tông → bị chặn');
  lastErr = '';
  s.emit('learn_skill', { skillId: TARGET.id });
  ok(await waitErr('Chưa đủ điều kiện'), 'học thường với chỉ số 37/27 < gốc 40/30 → bị chặn');
  s.disconnect();
  await kill(proc);

  // --- Lượt 3: đã là đệ tử Thiên Kiếm Môn ---
  patchChar((c) => { c.sect = 'thienkiem'; });
  proc = await boot();
  s = await connect();
  lastErr = '';
  s.on('interact_error', (e) => { lastErr = e.message || ''; });
  const wel3 = waitEv(s, 'welcome');
  s.emit('hello', { token: TOKEN });
  await wel3;
  await sleep(300);

  const d2 = await talkSugia();
  const list = d2.sectInfo?.skills || [];
  const entry = list.find((x) => x.id === TARGET.id);
  ok(list.length === 5, `đệ tử: danh sách tông có ${list.length} chiêu (kiếm, bậc Trúc Cơ)`);
  ok(!!entry && entry.canLearn === true && entry.learned === false,
    `mục tiêu "${TARGET.name}": canLearn=true nhờ giảm điều kiện`);
  ok(!!entry && entry.condText.includes('40') && entry.sectCondText.includes('35'),
    `hiển thị giảm điều kiện: gốc "${entry?.condText}" → đệ tử "${entry?.sectCondText}"`);

  lastErr = '';
  const learnedP = waitEv(s, 'skill_learned', 60000);
  s.emit('learn_skill', { skillId: TARGET.id, via: 'sect' });
  await sleep(900);
  ok(!lastErr, `học qua tông bắt đầu êm (lỗi nếu có: "${lastErr}")`);
  const learned = await learnedP;
  ok(learned.skill?.id === TARGET.id, `lĩnh ngộ xong qua tông: ${learned.skill?.name}`);

  const d3 = await talkSugia();
  const entry2 = (d3.sectInfo?.skills || []).find((x) => x.id === TARGET.id);
  ok(entry2?.learned === true, 'sau khi học: danh sách tông đánh dấu Đã lĩnh hội');

  lastErr = '';
  s.emit('learn_skill', { skillId: LK_SKILL.id, via: 'sect' });
  ok(await waitErr('không nằm trong danh sách công pháp tông môn'), 'chiêu Luyện Khí qua đường tông → bị chặn (tông chỉ dạy Trúc Cơ)');

  s.disconnect();
  await kill(proc);
  console.log(failures === 0 ? '\nTEST42 ALL PASS' : `\nTEST42 CÓ ${failures} FAIL`);
  process.exit(failures === 0 ? 0 : 1);
})().catch(async (e) => { console.error('TEST42 SẬP:', e.message); process.exit(2); });
