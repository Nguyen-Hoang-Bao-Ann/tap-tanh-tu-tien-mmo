// Chẩn đoán 1 trial buff của p349h: log từng bước (ứng viên golem, cast_result, landed, runWindow).
const fs = require('fs');
const path = require('path');
const { makeHarness, BASE, makeOk, meOf, monsOf, flyTo, land, slotOf, sleep, waitFor } = require('./lib349.cjs');
const DIR = path.join(__dirname, 'h2');
fs.mkdirSync(DIR, { recursive: true });
const PORT = 3671;
const H = makeHarness(PORT, {}, DIR);
const R = makeOk();
const SKILL = 'lh_sat-thu';

(async () => {
  const chars = {};
  chars['p349hanh01'] = BASE('p349hanh01', 'P349AnhToc3', { classId: 'satthu', skills: [SKILL], stats: { vatCong: 15, phapCong: 15 }, anState: { vienman: true, luyenHon: true } });
  H.writeChars(chars);
  await H.startServer();
  const c = H.connect('p349hanh01');
  await waitFor(() => c.welcome, 20000);
  await sleep(2000);
  const slot = slotOf(c, SKILL);
  const ch = (c.sync && c.sync.skills) || [];
  R.note(`slot=${slot} skills=${JSON.stringify(ch.map((s) => ({ id: s.id, cdMs: s.cdMs, cost: s.cost })))} mp=${meOf(c)?.mp}/${meOf(c)?.maxMp}`);
  const gs = monsOf(c).filter((m) => m.kind === 'golem').map((m) => `${m.id}:hp${m.hp}@${Math.round(m.x)},${Math.round(m.y)}`);
  R.note(`golems: ${gs.join(' | ')}`);
  const g = monsOf(c).filter((m) => m.kind === 'golem').sort((a, b) => (b.hp || 0) - (a.hp || 0))[0];
  await flyTo(c, g.x, g.y, 25); await land(c);
  for (let s = 0; s < 30; s++) {
    const m2 = monsOf(c).find((x) => x.id === g.id); const me2 = meOf(c);
    if (!m2 || !me2) break;
    const d = Math.hypot(m2.x - me2.x, m2.y - me2.y);
    if (d <= 50) { R.note(`tiep can ok d=${Math.round(d)}`); break; }
    c.socket.emit('client_input', { vx: (m2.x - me2.x) / d, vy: (m2.y - me2.y) / d }); await sleep(105);
  }
  c.socket.emit('client_input', { vx: 0, vy: 0 });
  const ci = c.casts.length;
  c.socket.emit('cast_skill', { slot });
  const cr = await waitFor(() => (c.casts.length > ci ? c.casts[c.casts.length - 1] : null), 3000);
  R.note(`cast_result: ${JSON.stringify(cr)}`);
  const hpOf = () => { const m = monsOf(c).find((x) => x.id === g.id); return m ? m.hp : null; };
  let landed = false;
  for (let a = 0; a < 6 && !landed; a++) {
    const before = hpOf();
    c.socket.emit('player_attack');
    landed = await waitFor(() => { const h = hpOf(); return h != null && h < before ? true : null; }, 900) != null;
    R.note(`attack ${a + 1}: before=${before} after=${hpOf()} landed=${landed}`);
  }
  // chạy thử 2.8s
  const me0 = meOf(c); const t0 = Date.now(); const S = [];
  c.socket.emit('client_input', { vx: 1, vy: 0 });
  while (Date.now() - t0 < 2800) { const me = meOf(c); if (me) S.push({ at: Date.now(), x: me.x, y: me.y }); await sleep(55); }
  c.socket.emit('client_input', { vx: 0, vy: 0 });
  R.note(`run: start=(${Math.round(me0.x)},${Math.round(me0.y)}) samples=${S.length} dx=${S.length ? Math.round(S[S.length - 1].x - S[0].x) : 0} lastFew=${S.slice(-3).map((s) => Math.round(s.x) + ',' + Math.round(s.y)).join(' ')}`);
  c.socket.disconnect();
  await H.stopServer();
  R.done('GĐ349-H2 chan doan');
  process.exit(0);
})().catch(async (e) => { console.log('LOI: ' + e.message); try { await H.stopServer(); } catch (_) {} process.exit(2); });
