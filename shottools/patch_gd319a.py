# GĐ319a: Quầy Quản Lý Đạo Quán + 3 bài kiểm tra + Thiếp Đồng Sáng Lập + đăng ký khai tông (phí TP)
# + Lệnh Bài/Trận Pháp. Chay: python3 shottools/patch_gd319a.py
import io
P = '/home/hatch/workspace/tap-tanh-tu-tien-mmo/server/index.js'
s = io.open(P, encoding='utf-8').read()
def rep(old, new, n=1):
    global s
    assert s.count(old) == n, 'anchor %dx: %s' % (s.count(old), old[:70])
    s = s.replace(old, new)

# --- 1) Hai vat pham moi trong ITEMS ---
rep("  dan_cuu_chuyen: { name: 'Cửu Chuyển Đan', desc: 'Dùng: hồi 100% HP và 50% Chân nguyên' },",
"""  dan_cuu_chuyen: { name: 'Cửu Chuyển Đan', desc: 'Dùng: hồi 100% HP và 50% Chân nguyên' },
  lenh_bai_tong_mon: { name: 'Lệnh Bài Tông Môn', desc: 'Lệnh bài trắng do Quầy Quản Lý Đạo Quán cấp khi khai tông. Mang tới vùng đất muốn đặt trụ sở và DÙNG — lệnh bài sẽ hóa thành Tông Môn Thạch Bia khắc tên tông. Không bán được.' }, // GĐ319
  tran_phap_khai_son: { name: 'Trận Pháp Khai Sơn', desc: 'Trận pháp dùng 1 lần: đứng cạnh Tông Môn Thạch Bia của tông mình và DÙNG để dựng 7 công trình cơ bản quanh bia (Sơn Môn, Đại Điện, Đan Phòng, Khí Phòng, Dược Viên, Tàng Kinh Các, Luyện Công Trường).' }, // GĐ319""")

# --- 2) NPC Quan Su Dao Quan (hang su phu, san Dao Quan) ---
rep("  { id: 'npc_truonglang', name: 'Trưởng Làng', role: 'Trả nhiệm vụ', personality: 'Hiền hòa', x: hs175(362), y: hs175(548), direction: 'down' },",
"""  { id: 'npc_truonglang', name: 'Trưởng Làng', role: 'Trả nhiệm vụ', personality: 'Hiền hòa', x: hs175(362), y: hs175(548), direction: 'down' },
  { id: 'npc_quansu', name: 'Quản Sự Đạo Quán', role: 'Quầy Quản Lý', personality: 'Nghiêm cẩn', x: hs175(560), y: hs175(390), direction: 'down' }, // GĐ319: đầu mối khai tông""")

# --- 3) Truong ben nhan vat: foundTestPassed/foundSlip/foundInvites/foundSlipFor (3 noi) ---
rep("  c.bonds = p.bonds || {}; // GĐ320: quan hệ Duyên Nợ với người chơi (+ nhánh của quan hệ NPC)",
"""  c.bonds = p.bonds || {}; // GĐ320: quan hệ Duyên Nợ với người chơi (+ nhánh của quan hệ NPC)
  c.foundTestPassed = p.foundTestPassed ? 1 : 0; // GĐ319: đã thắng Khảo Quan Ảnh
  c.foundSlip = p.foundSlip || null; // GĐ319: thiếp đồng sáng lập của ta {accepted:[token], names:{token:name}}
  c.foundInvites = Array.isArray(p.foundInvites) ? p.foundInvites : []; // GĐ319: thiếp mời đang chờ ta
  c.foundSlipFor = p.foundSlipFor || null; // GĐ319: token người lập mà ta đã đồng ý đồng sáng lập""")
rep("    bonds: char.bonds && typeof char.bonds === 'object' ? char.bonds : {}, // GĐ320\n    affV2: char.affV2 ? 1 : 0, affDay: char.affDay || null, // GĐ320",
"""    bonds: char.bonds && typeof char.bonds === 'object' ? char.bonds : {}, // GĐ320
    affV2: char.affV2 ? 1 : 0, affDay: char.affDay || null, // GĐ320
    foundTestPassed: char.foundTestPassed ? 1 : 0, foundSlip: char.foundSlip || null, foundInvites: Array.isArray(char.foundInvites) ? char.foundInvites : [], foundSlipFor: char.foundSlipFor || null, // GĐ319""", 2)

# --- 4) Payload nhan vat: thong tin khai tong cho client ---
rep("    bonds: bondViewOf(p), // GĐ320: panel Duyên Nợ",
"""    bonds: bondViewOf(p), // GĐ320: panel Duyên Nợ
    foundTestPassed: !!p.foundTestPassed, // GĐ319
    foundSlip: p.foundSlip ? { count: (p.foundSlip.accepted || []).length, names: (p.foundSlip.accepted || []).map((t) => (p.foundSlip.names || {})[t] || t) } : null, // GĐ319
    foundInvites: Array.isArray(p.foundInvites) ? p.foundInvites : [], // GĐ319
    foundSlipFor: p.foundSlipFor || null, // GĐ319""")

# --- 5) Engine khai tong (chen truoc SECT_CREATE_COST) ---
rep("const SECT_CREATE_COST = 5000; // TẠM: linh thạch Hạ để lập tông (chống tạo bừa)",
"""// ================= GĐ319: KHAI TÔNG QUA QUẦY QUẢN LÝ ĐẠO QUÁN =================
const FOUND_FEE_GROUP = 30000; // Linh thạch TRUNG PHẨM khi đủ >=5 người đồng sáng lập (số của Bảo)
const FOUND_FEE_SOLO = 70000; // Linh thạch TRUNG PHẨM khi lập một mình (số của Bảo)
const FOUND_SLIP_NEED = 5;
function foundFeeOf(p) { return ((p.foundSlip && p.foundSlip.accepted) || []).length >= FOUND_SLIP_NEED ? FOUND_FEE_GROUP : FOUND_FEE_SOLO; }
function sectFoundInfoFor(p) {
  const slip = p.foundSlip || { accepted: [], names: {} };
  return {
    inSect: !!sectOfToken(p.token),
    realmOk: (REALM_ORDER[p.realm] ?? 0) >= 4, realmName: (REALMS[p.realm] || {}).name || p.realm,
    fightPassed: !!p.foundTestPassed,
    slipCount: (slip.accepted || []).length, slipNames: (slip.accepted || []).map((t) => (slip.names || {})[t] || t),
    feeNow: foundFeeOf(p), feeGroup: FOUND_FEE_GROUP, feeSolo: FOUND_FEE_SOLO, slipNeed: FOUND_SLIP_NEED,
    stonesTrung: p.stonesTrung || 0,
    canRegister: !sectOfToken(p.token) && (REALM_ORDER[p.realm] ?? 0) >= 4 && !!p.foundTestPassed && (p.stonesTrung || 0) >= foundFeeOf(p),
  };
}
const SECT_CREATE_COST = 5000; // GĐ319: chỉ còn là số cũ — đường lập tông trực tiếp đã đóng, khai tông qua Quầy Quản Lý Đạo Quán""")

# --- 6) Giet Khao Quan Anh -> dat Bai 1 ---
rep("""    if (target.isTrialBoss && target.ownerId === player.id) {
      // GĐ30: thắng Thử Thách Thú của tông môn → đủ tư cách vào Huyền Thiên Tông
      if (target.trialKind === 'sect') {""",
"""    if (target.isTrialBoss && target.ownerId === player.id) {
      if (target.trialKind === 'khaquan') { // GĐ319: thắng Khảo Quan Ảnh — đạt Bài 1 khai tông
        player.foundTestPassed = true;
        persistPlayer(player);
        if (socket) { socket.emit('notice', { text: '✔ Đã thắng Khảo Quan Ảnh! Bài kiểm tra TU VI đạt — quay lại Quầy Quản Lý để hoàn tất khai tông.' }); syncChar(socket, player); }
        console.log(`[khai tông] ${player.name} thắng Khảo Quan Ảnh`);
        return;
      }
      // GĐ30: thắng Thử Thách Thú của tông môn → đủ tư cách vào Huyền Thiên Tông
      if (target.trialKind === 'sect') {""")

# --- 7) sect_create cu -> chuyen huong ve Quay Quan Ly ---
i = s.index("  socket.on('sect_create', (data) => {")
j = s.index("  socket.on('sect_apply', (data) => {")
s = s[:i] + """  socket.on('sect_create', (data) => { // GĐ319: đóng đường lập tông trực tiếp — khai tông phải qua Quầy Quản Lý Đạo Quán
    if (!player) return;
    socket.emit('interact_error', { message: 'Từ nay khai tông phải qua Quầy Quản Lý ở sân Đạo Quán: gặp Quản Sự Đạo Quán, qua 3 bài kiểm tra (tu vi — đấu Khảo Quan Ảnh · tài nguyên — Linh thạch Trung phẩm · số người — Thiếp Đồng Sáng Lập) rồi mới đăng ký được.' });
  });

""" + s[j:]

# --- 8) Cac handler khai tong (chen truoc handler sect_create) ---
anchor8 = "  socket.on('sect_create', (data) => { // GĐ319: đóng đường lập tông trực tiếp"
assert s.count(anchor8) == 1
handlers = """  // ================= GĐ319: KHAI TÔNG — bài kiểm tra + thiếp + đăng ký =================
  socket.on('sect_found_fight', () => {
    if (!player) return;
    const npc = NPC_BY_ID['npc_quansu'];
    if (Math.hypot(player.x - npc.x, player.y - npc.y) > 140) { socket.emit('interact_error', { message: 'Tới Quầy Quản Lý ở sân Đạo Quán để thi khảo hạch.' }); return; }
    if ((REALM_ORDER[player.realm] ?? 0) < 4) { socket.emit('interact_error', { message: `Bài TU VI cần cảnh giới Nguyên Anh trở lên (đang ${(REALMS[player.realm] || {}).name || player.realm}).` }); return; }
    if (player.foundTestPassed) { socket.emit('interact_error', { message: 'Bạn đã thắng Khảo Quan Ảnh rồi — bài TU VI đã đạt.' }); return; }
    if ([...monsters.values()].some((m) => m.kind === 'trial' && m.ownerId === player.id && m.isTrialBoss)) { socket.emit('interact_error', { message: 'Ải thử thách của bạn đang diễn ra!' }); return; }
    const step = globalStep(player.realm, player.tier);
    const boss = {
      id: 'trial-' + ++monsterSeq, kind: 'trial', trialKind: 'khaquan', isTrialBoss: true, ownerId: player.id,
      mapId: mapOf(player), name: 'Khảo Quan Ảnh', x: hs175(640), y: hs175(430), hp: eliteHpAt(step) * 4, maxHp: eliteHpAt(step) * 4, atk: eliteAtkAt(step),
      vx: 0, vy: 0, direction: 'down', lastAttackAt: 0, lastSkillAt: 0, bornAt: Date.now(), phase2: false,
    };
    monsters.set(boss.id, boss);
    io.emit('trial_started', { ownerId: player.id, ownerName: player.name, name: boss.name, monsterId: boss.id });
    notice('⚔️ Khảo Quan Ảnh hiện hình ở sân Đạo Quán — chỉ mình bạn đánh được và bị nó đánh. Thắng là đạt Bài 1; thua không mất gì, thi lại ngay được.');
    console.log(`[khai tông] ${player.name} thi Khảo Quan Ảnh (HP ${boss.hp})`);
  });

  socket.on('sect_found_invite', (data) => {
    if (!player || !data) return;
    if (sectOfToken(player.token)) { socket.emit('interact_error', { message: 'Bạn đã có tông môn — không gửi Thiếp Đồng Sáng Lập được.' }); return; }
    const name = String(data.name || '').trim();
    const key = charKeyByName(name) || Object.keys(characters).find((k) => characters[k] && String(characters[k].name || '').toLowerCase() === name.toLowerCase());
    if (!key) { socket.emit('interact_error', { message: `Không tìm thấy nhân vật "${name}".` }); return; }
    if (key === player.token) { socket.emit('interact_error', { message: 'Không thể tự gửi thiếp cho mình.' }); return; }
    const rec = characters[key];
    if (!rec || rec.dead) { socket.emit('interact_error', { message: `${name} không còn tại thế.` }); return; }
    if (sectOfToken(key)) { socket.emit('interact_error', { message: `${rec.name} đã ở trong một tông môn rồi.` }); return; }
    if (rec.foundSlipFor && rec.foundSlipFor !== player.token) { socket.emit('interact_error', { message: `${rec.name} đã đồng ý đồng sáng lập cho người khác rồi.` }); return; }
    if (!player.foundSlip) player.foundSlip = { accepted: [], names: {} };
    if ((player.foundSlip.accepted || []).includes(key)) { socket.emit('interact_error', { message: `${rec.name} đã ghi danh đồng sáng lập cho bạn rồi.` }); return; }
    const tp = playerByToken(key);
    const list = tp ? (tp.foundInvites = tp.foundInvites || []) : (rec.foundInvites = Array.isArray(rec.foundInvites) ? rec.foundInvites : []);
    if (list.some((v) => v.fromKey === player.token)) { socket.emit('interact_error', { message: `Đã có thiếp chờ ${rec.name} hồi âm.` }); return; }
    list.push({ fromKey: player.token, fromName: player.name, at: Date.now() });
    if (tp) { persistPlayer(tp); const ts = io.sockets.sockets.get(tp.id); if (ts) { syncChar(ts, tp); ts.emit('notice', { text: `🏯 ${player.name} gửi bạn THIẾP ĐỒNG SÁNG LẬP — đồng ý là bạn sẽ thành thành viên sáng lập khi tông của họ thành lập. Xem ở panel Tông môn.` }); } }
    else saveCharacters();
    persistPlayer(player); syncChar(socket, player);
    socket.emit('notice', { text: `🏯 Đã gửi Thiếp Đồng Sáng Lập tới ${rec.name}. Đủ ${FOUND_SLIP_NEED} người đồng ý thì phí khai tông giảm còn ${FOUND_FEE_GROUP} Linh thạch Trung phẩm.` });
  });

  socket.on('sect_found_respond', (data) => {
    if (!player || !data) return;
    const fromKey = String(data.fromKey || '');
    player.foundInvites = (player.foundInvites || []).filter((v) => v.fromKey !== fromKey);
    if (data.accept) {
      if (sectOfToken(player.token)) { socket.emit('interact_error', { message: 'Bạn đã có tông môn — không đồng sáng lập được nữa.' }); persistPlayer(player); syncChar(socket, player); return; }
      if (player.foundSlipFor && player.foundSlipFor !== fromKey) { socket.emit('interact_error', { message: 'Bạn đã đồng ý đồng sáng lập cho người khác rồi.' }); persistPlayer(player); syncChar(socket, player); return; }
      const fp = playerByToken(fromKey); const frec = fp || characters[fromKey];
      if (!frec || sectOfToken(fromKey)) { socket.emit('interact_error', { message: 'Người gửi thiếp không còn khai tông được nữa.' }); persistPlayer(player); syncChar(socket, player); return; }
      if (!frec.foundSlip) frec.foundSlip = { accepted: [], names: {} };
      if (!frec.foundSlip.accepted.includes(player.token)) { frec.foundSlip.accepted.push(player.token); frec.foundSlip.names[player.token] = player.name; }
      player.foundSlipFor = fromKey;
      if (fp) { persistPlayer(fp); const fs2 = io.sockets.sockets.get(fp.id); if (fs2) { syncChar(fs2, fp); fs2.emit('notice', { text: `🏯 ${player.name} đã ĐỒNG Ý đồng sáng lập! (${frec.foundSlip.accepted.length}/${FOUND_SLIP_NEED} người)` }); } }
      else saveCharacters();
      socket.emit('notice', { text: `🏯 Bạn đã đồng ý đồng sáng lập cùng ${frec.name || fromKey}. Khi tông thành lập bạn sẽ là thành viên mang dấu Sáng Lập.` });
    } else {
      socket.emit('notice', { text: 'Đã từ chối Thiếp Đồng Sáng Lập.' });
    }
    persistPlayer(player); syncChar(socket, player);
  });

  socket.on('sect_found_withdraw', () => {
    if (!player || !player.foundSlipFor) return;
    const fromKey = player.foundSlipFor;
    player.foundSlipFor = null;
    const fp = playerByToken(fromKey); const frec = fp || characters[fromKey];
    if (frec && frec.foundSlip) {
      frec.foundSlip.accepted = (frec.foundSlip.accepted || []).filter((t) => t !== player.token);
      if (fp) { persistPlayer(fp); const fs2 = io.sockets.sockets.get(fp.id); if (fs2) syncChar(fs2, fp); }
      else saveCharacters();
    }
    persistPlayer(player); syncChar(socket, player);
    socket.emit('notice', { text: 'Đã rút đồng ý đồng sáng lập.' });
  });

  socket.on('sect_found_register', (data) => {
    if (!player || !data) return;
    const npc = NPC_BY_ID['npc_quansu'];
    if (Math.hypot(player.x - npc.x, player.y - npc.y) > 140) { socket.emit('interact_error', { message: 'Tới Quầy Quản Lý ở sân Đạo Quán để đăng ký khai tông.' }); return; }
    if (sectOfToken(player.token)) { socket.emit('interact_error', { message: 'Bạn đã ở trong một tông môn rồi.' }); return; }
    if ((REALM_ORDER[player.realm] ?? 0) < 4) { socket.emit('interact_error', { message: 'Bài TU VI chưa đạt: cần cảnh giới Nguyên Anh trở lên.' }); return; }
    if (!player.foundTestPassed) { socket.emit('interact_error', { message: 'Bài TU VI chưa đạt: hãy thắng Khảo Quan Ảnh đã.' }); return; }
    const name = String(data.name || '').replace(/\\s+/g, ' ').trim();
    if (name.length < 3 || name.length > 24) { socket.emit('interact_error', { message: 'Tên tông phải từ 3–24 ký tự.' }); return; }
    if (sects.some((g) => g.name.toLowerCase() === name.toLowerCase())) { socket.emit('interact_error', { message: 'Tên tông này đã có người dùng.' }); return; }
    const fee = foundFeeOf(player);
    if ((player.stonesTrung || 0) < fee) { socket.emit('interact_error', { message: `Bài TÀI NGUYÊN chưa đạt: phí khai tông ${fee} Linh thạch Trung phẩm (đang có ${player.stonesTrung || 0}). Đủ ${FOUND_SLIP_NEED} người đồng sáng lập thì phí còn ${FOUND_FEE_GROUP}.` }); return; }
    player.stonesTrung -= fee;
    const members = [{ token: player.token, name: player.name, role: 'chu' }];
    const accepted = ((player.foundSlip && player.foundSlip.accepted) || []).slice();
    for (const tk of accepted) {
      if (sectOfToken(tk)) continue; // đã vào tông khác trong lúc chờ — bỏ qua
      const tp = playerByToken(tk); const rec = tp || characters[tk];
      if (!rec || rec.dead) continue;
      members.push({ token: tk, name: rec.name, role: 'detu', founder: true });
      rec.foundSlipFor = null;
      rec.foundInvites = (rec.foundInvites || []).filter((v) => v.fromKey !== player.token);
      if (tp) { persistPlayer(tp); const ts = io.sockets.sockets.get(tp.id); if (ts) { syncChar(ts, tp); ts.emit('notice', { text: `🏯 Tông môn "${name}" đã thành lập — bạn là thành viên SÁNG LẬP!` }); } }
    }
    const g = { id: 'sect' + Date.now().toString(36) + Math.floor(Math.random() * 999), name, intro: String(data.intro || '').slice(0, 120), members, applicants: [] };
    sects.push(g);
    player.foundSlip = null; player.foundTestPassed = false;
    player.inventory = player.inventory || {};
    player.inventory['lenh_bai_tong_mon'] = (player.inventory['lenh_bai_tong_mon'] || 0) + 1;
    player.inventory['tran_phap_khai_son'] = (player.inventory['tran_phap_khai_son'] || 0) + 1;
    saveWorld(); saveCharacters(); persistPlayer(player); syncChar(socket, player);
    socket.emit('notice', { text: `🏯 KHAI TÔNG LẬP PHÁI: "${name}" ra đời! (−${fee} Linh thạch Trung phẩm) Quầy Quản Lý trao bạn LỆNH BÀI TÔNG MÔN và TRẬN PHÁP KHAI SƠN — mang Lệnh Bài tới vùng đất muốn đặt trụ sở và dùng tại đó.` });
    pushSectState(player); pushSectMembers(g);
    console.log(`[khai tông] ${player.name} lập "${name}" (phí ${fee} TP, ${members.length} thành viên sáng lập)`);
  });

"""
s = s.replace(anchor8, handlers + anchor8)

# --- 9) Dialog Quan Su: truong sectFoundInfo ---
rep("      bondTierName: bondTierNameFor(player, 'n:' + npc.id, aff,",
"""      sectFoundInfo: npc.id === 'npc_quansu' ? sectFoundInfoFor(player) : null, // GĐ319: quy trình khai tông ở Quầy Quản Lý
      bondTierName: bondTierNameFor(player, 'n:' + npc.id, aff,""")

io.open(P, 'w', encoding='utf-8').write(s)
print('patch gd319a OK')
