// Probe bổ sung Nhóm A — đường RƠI của Phù Thiên Kiếp từ TRÙM cõi Độ Kiếp (10%, ngoài LOOT_NERF).
// van_kiep_than_thu (boss-class, minChestGrade 'B' qua rewardClass 'boss') spawn 1 con/map ở tam_ma_canh + kim_kiep_son.
// Mỗi boot: 2 char cực mạnh đóng sẵn 2 map, mỗi char hạ trùm của map mình, nhặt đồ rơi, ghi lại.
// 4 boot = 8 mạng trùm: P(ít nhất 1 Phù Thiên Kiếp) = 1-0,9^8 ≈ 57%; kèm Tâm Ma Kết Tinh 20%/mạng (cụm A4 của chính loài này).
// Kết quả thực tế (số mạng + số lần rơi thấy) được ghi ra để báo cáo trung thực, không ép PASS theo may rủi:
// PASS cứng duy nhất = trùm hạ được + cơ chế rơi A4 (tam_ma_ket_tinh) hoặc phu_thien_kiep xuất hiện ít nhất 1 lần trong 8 mạng.
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const net = require('net');
const ROOT = path.join(__dirname, '..', '..');
const DIR = __dirname;
const { io } = require(path.join(ROOT, 'client/node_modules/socket.io-client'));
const { createMerger } = require(path.join(ROOT, 'client/worldmerge.cjs'));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function waitFor(fn, ms) { const t0 = Date.now(); while (Date.now() - t0 < ms) { const v = fn(); if (v) return v; await sleep(120); } return null; }
function portFree(port) { return new Promise((res) => { const s = net.createServer(); s.once('error', () => res(false)); s.listen(port, () => s.close(() => res(true))); }); }
let serverProc = null, killTimer = null, CUR_PORT = 0;
async function startServer(port, tag) {
  CUR_PORT = port;
  if (!(await portFree(port))) throw new Error('port ban ' + port);
  serverProc = spawn('node', ['server/index.js'], { cwd: ROOT, env: { ...process.env, PORT: String(port), TTT_STORAGE: 'file', TTT_CHAR_FILE: path.join(DIR, 'characters.json'), TTT_ACC_FILE: path.join(DIR, 'accounts.json'), TTT_WORLD_FILE: path.join(DIR, 'world.json'), TTT_SESS_FILE: path.join(DIR, 'sessions.json'), TTT_DAY_REAL_MS: '600000', TTT_TUVI_NEED: '5' }, stdio: ['ignore', 'pipe', 'pipe'] });
  serverProc.stderr.on('data', (d) => { try { fs.appendFileSync(path.join(DIR, 'srv_' + tag + '.log'), d); } catch (e) {} });
  serverProc.stdout.on('data', (d) => { try { fs.appendFileSync(path.join(DIR, 'srv_' + tag + '.log'), d); } catch (e) {} });
  killTimer = setTimeout(() => { try { serverProc.kill('SIGKILL'); } catch (e) {} }, 600000);
  const t0 = Date.now();
  while (Date.now() - t0 < 60000) { try { const r = await fetch(`http://127.0.0.1:${port}/api/status`); if (r.ok) { clearTimeout(killTimer); return; } } catch (e) {} await sleep(400); }
  throw new Error('server khong len');
}
async function stopServer() { if (!serverProc) return; const p = serverProc; serverProc = null; if (killTimer) { clearTimeout(killTimer); killTimer = null; } await new Promise((res) => { const t = setTimeout(() => { try { p.kill('SIGKILL'); } catch (e) {} res(); }, 4000); p.once('exit', () => { clearTimeout(t); res(); }); try { p.kill('SIGTERM'); } catch (e) { clearTimeout(t); res(); } }); const t0 = Date.now(); while (Date.now() - t0 < 10000 && !(await portFree(CUR_PORT))) await sleep(300); }
const LC1 = { elements: ['kim'], main: 'kim', count: 1, mutations: [] };
function BASE(token, name, extra) {
  return Object.assign({ token, name, classId: 'phaptu', gender: 'nam', race: null, geo175: 1, realm: 'dk', tier: 2, x: 1000, y: 1000, mapId: 'tam_ma_canh', hp: 999999, mp: 99999, lifespan: 500, birthDay: -5660, ageStart: 16, stats: { khiHuyet: 20000, vatCong: 5000000, vatPhong: 3000, phapCong: 5000000, phapPhong: 3000, tocDo: 80, minhMan: 100 }, statPoints: 0, freePoints: 0, tuVi: 99999, stones: 100000, stonesTrung: 0, stonesThuong: 0, stonesCuc: 0, inventory: {}, gearBag: {}, equipped: [], skills: [], job: null, job2: null, job3: null, linhCan: { ...LC1 }, affinity: {}, affV2: 1, bonds: {}, quests: {}, questsDone: {}, flags: {}, counters: {}, disciples: [], foundInvites: [], reformIn: [], sectTech: [], sectArts: [], sectArtsActive: [], mails: [], classRes: {}, food: 100, water: 100 }, extra || {});
}
function connect(token) {
  const socket = io(`http://127.0.0.1:${CUR_PORT}`, { transports: ['websocket'] });
  const ctx = { socket, merger: createMerger(), state: null, welcome: null, syncs: [], myName: null };
  socket.on('connect', () => socket.emit('hello', { token }));
  socket.on('welcome', (w) => { ctx.welcome = w; ctx.myName = (w.character || {}).name; });
  socket.on('char_sync', (s) => ctx.syncs.push(s));
  socket.on('server_tick', (t) => { const st = ctx.merger(t); if (st) ctx.state = st; });
  return ctx;
}
const lastChar = (c) => { for (let i = c.syncs.length - 1; i >= 0; i--) { if (c.syncs[i]) return c.syncs[i]; } return c.welcome ? c.welcome.character : null; };
const invOf = (c, id) => { const ch = lastChar(c); return (ch && ch.inventory && ch.inventory[id]) || 0; };
const meOf = (c) => { if (!c.state || !c.state.players) return null; return c.state.players.find((p) => p.name === c.myName) || null; };
const monsOf = (c) => (c.state && c.state.monsters) || [];
async function steerTo(c, x, y, tol, ms) {
  const t0 = Date.now();
  while (Date.now() - t0 < (ms || 30000)) { const me = meOf(c); if (!me) { await sleep(120); continue; } const dx = x - me.x, dy = y - me.y; const d = Math.hypot(dx, dy); if (d <= (tol || 45)) break; c.socket.emit('client_input', { vx: dx / d, vy: dy / d }); await sleep(110); }
  c.socket.emit('client_input', { vx: 0, vy: 0 });
}
(async () => {
  let totalKills = 0, thienKiepDrops = 0, tamMaDrops = 0; const dropSeen = [];
  try {
    for (let boot = 1; boot <= 4; boot++) {
      const chars = {};
      chars['pb384x001'] = BASE('pb384x001', 'PB384TamMa', { mapId: 'tam_ma_canh' });
      chars['pb384y001'] = BASE('pb384y001', 'PB384KimKiep', { mapId: 'kim_kiep_son' });
      for (const f of ['characters.json', 'accounts.json', 'world.json', 'sessions.json']) { try { fs.unlinkSync(path.join(DIR, f)); } catch (e) {} }
      fs.writeFileSync(path.join(DIR, 'characters.json'), JSON.stringify(chars));
      fs.writeFileSync(path.join(DIR, 'accounts.json'), JSON.stringify({}));
      await startServer(3842, 'b' + boot);
      const CX = connect('pb384x001'); const CY = connect('pb384y001');
      await waitFor(() => CX.welcome && CY.welcome && meOf(CX) && meOf(CY), 30000);
      for (const c of [CX, CY]) {
        const seen = new Map();
        const boss = await waitFor(() => monsOf(c).find((m) => m.kind === 'van_kiep_than_thu' && m.hp > 0), 30000);
        if (!boss) { console.log(`boot ${boot} ${c.myName}: KHONG thay trum`); continue; }
        await steerTo(c, boss.x, boss.y, 120, 25000);
        const tId = boss.id; const t0 = Date.now(); let dead = false;
        while (Date.now() - t0 < 60000) {
          for (const d of ((c.state && c.state.drops) || [])) seen.set(d.id, d.itemId);
          const cur = monsOf(c).find((m) => m.id === tId);
          if (!cur || cur.hp <= 0) { dead = true; break; }
          const me = meOf(c); if (!me || me.hp <= 0) break;
          if (Math.hypot(cur.x - me.x, cur.y - me.y) > 150) await steerTo(c, cur.x, cur.y, 120, 5000);
          c.socket.emit('player_attack');
          await sleep(700);
        }
        if (dead) {
          totalKills++;
          await sleep(700);
          for (const d of ((c.state && c.state.drops) || [])) seen.set(d.id, d.itemId);
          // đi nhặt: bước qua các điểm rơi A4
          for (const [did, iid] of [...seen.entries()]) {
            if (iid !== 'phu_thien_kiep' && iid !== 'tam_ma_ket_tinh') continue;
            const d = ((c.state && c.state.drops) || []).find((x) => x.id === did);
            if (d) await steerTo(c, d.x, d.y, 12, 6000);
          }
          await sleep(600);
          c.socket.emit('craft_item', { recipeId: 'rc_khong_ton_tai' });
          await sleep(900);
          const tk = invOf(c, 'phu_thien_kiep'); const tm = invOf(c, 'tam_ma_ket_tinh');
          const seenTk = [...seen.values()].filter((v) => v === 'phu_thien_kiep').length;
          const seenTm = [...seen.values()].filter((v) => v === 'tam_ma_ket_tinh').length;
          thienKiepDrops += Math.max(seenTk, tk); tamMaDrops += Math.max(seenTm, tm);
          dropSeen.push(`boot${boot}/${c.myName}: roiThay thien_kiep=${seenTk} tam_ma=${seenTm} | tui thien_kiep=${tk} tam_ma=${tm} | tatCaRoi=${JSON.stringify([...seen.values()])}`);
        } else {
          dropSeen.push(`boot${boot}/${c.myName}: KHONG ha duoc trum trong 60s`);
        }
        try { c.socket.disconnect(); } catch (e) {}
      }
      await stopServer();
      console.log(`boot ${boot} xong: kills=${totalKills} thienKiep=${thienKiepDrops} tamMa=${tamMaDrops}`);
    }
  } catch (e) { console.log('LOI:', e && e.stack || e); try { await stopServer(); } catch (e2) {} }
  for (const s of dropSeen) console.log('  ' + s);
  const hard = totalKills >= 6 && (thienKiepDrops >= 1 || tamMaDrops >= 1);
  console.log(`TONG: kills=${totalKills}/8 | phu_thien_kiep roi=${thienKiepDrops} | tam_ma_ket_tinh roi=${tamMaDrops}`);
  console.log(hard ? 'PASS | duong roi trum DK chay that (it nhat 1 trong 2 mon muc tieu roi)' : 'CHECK | chua thay mon muc tieu roi — doc so lieu o tren de bao cao');
  process.exit(0);
})();
