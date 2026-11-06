# GĐ319-phụ (lệnh Bảo 06/11 15:04): thua Khảo Quan Ảnh -> chờ 3 ngày game + thi lại tốn 3.000 LT Hạ
# (chống lập tông bừa). Lần thi đầu miễn phí. Chay: python3 shottools/patch_gd319f.py
import io
P = '/home/hatch/workspace/tap-tanh-tu-tien-mmo/server/index.js'
s = io.open(P, encoding='utf-8').read()
def rep(old, new, n=1):
    global s
    assert s.count(old) == n, 'anchor %dx: %s' % (s.count(old), old[:70])
    s = s.replace(old, new)

# --- 1) Hang so + thong tin dialog ---
rep("""const FOUND_FEE_GROUP = 30000; // Linh thạch TRUNG PHẨM khi đủ >=5 người đồng sáng lập (số của Bảo)
const FOUND_FEE_SOLO = 70000; // Linh thạch TRUNG PHẨM khi lập một mình (số của Bảo)""",
"""const FOUND_FEE_GROUP = 30000; // Linh thạch TRUNG PHẨM khi đủ >=5 người đồng sáng lập (số của Bảo)
const FOUND_FEE_SOLO = 70000; // Linh thạch TRUNG PHẨM khi lập một mình (số của Bảo)
const FOUND_RETRY_DAYS = 3; // TẠM (Bảo 06/11): thua Khảo Quan Ảnh phải chờ 3 NGÀY GAME mới thi lại
const FOUND_RETRY_FEE = 3000; // TẠM (Bảo 06/11): mỗi lần thi lại tốn 3.000 Linh thạch Hạ ("vài ngàn") — lần đầu miễn phí""")
rep("""    stonesTrung: p.stonesTrung || 0,
    canRegister: !sectOfToken(p.token) && (REALM_ORDER[p.realm] ?? 0) >= 4 && !!p.foundTestPassed && (p.stonesTrung || 0) >= foundFeeOf(p),
  };""",
"""    stonesTrung: p.stonesTrung || 0,
    canRegister: !sectOfToken(p.token) && (REALM_ORDER[p.realm] ?? 0) >= 4 && !!p.foundTestPassed && (p.stonesTrung || 0) >= foundFeeOf(p),
    failWait: (p.foundFailDay ?? -1) >= 0 ? Math.max(0, p.foundFailDay + FOUND_RETRY_DAYS - worldClock().dayIndex) : 0, // GĐ319-phụ: số ngày game còn phải chờ thi lại
    retryFee: (p.foundAttempts || 0) > 0 ? FOUND_RETRY_FEE : 0, attempts: p.foundAttempts || 0, retryDays: FOUND_RETRY_DAYS,
  };""")

# --- 2) Truong ben nhan vat (3 noi) + payload ---
rep("""  c.foundSlipFor = p.foundSlipFor || null; // GĐ319: token người lập mà ta đã đồng ý đồng sáng lập""",
"""  c.foundSlipFor = p.foundSlipFor || null; // GĐ319: token người lập mà ta đã đồng ý đồng sáng lập
  c.foundFailDay = p.foundFailDay ?? -1; c.foundAttempts = p.foundAttempts || 0; // GĐ319-phụ: ngày thua khảo hạch gần nhất + số lần đã thi""")
rep("    foundTestPassed: char.foundTestPassed ? 1 : 0, foundSlip: char.foundSlip || null, foundInvites: Array.isArray(char.foundInvites) ? char.foundInvites : [], foundSlipFor: char.foundSlipFor || null, // GĐ319",
"""    foundTestPassed: char.foundTestPassed ? 1 : 0, foundSlip: char.foundSlip || null, foundInvites: Array.isArray(char.foundInvites) ? char.foundInvites : [], foundSlipFor: char.foundSlipFor || null, // GĐ319
    foundFailDay: char.foundFailDay ?? -1, foundAttempts: char.foundAttempts || 0, // GĐ319-phụ""", 2)
rep("""    foundSlipFor: p.foundSlipFor || null, // GĐ319""",
"""    foundSlipFor: p.foundSlipFor || null, // GĐ319
    foundFailDay: p.foundFailDay ?? -1, foundAttempts: p.foundAttempts || 0, // GĐ319-phụ""")

# --- 3) Cong cho + phi thi lai trong sect_found_fight ---
rep("""    if (player.foundTestPassed) { socket.emit('interact_error', { message: 'Bạn đã thắng Khảo Quan Ảnh rồi — bài TU VI đã đạt.' }); return; }
    if ([...monsters.values()].some((m) => m.kind === 'trial' && m.ownerId === player.id && m.isTrialBoss)) { socket.emit('interact_error', { message: 'Ải thử thách của bạn đang diễn ra!' }); return; }""",
"""    if (player.foundTestPassed) { socket.emit('interact_error', { message: 'Bạn đã thắng Khảo Quan Ảnh rồi — bài TU VI đã đạt.' }); return; }
    if ([...monsters.values()].some((m) => m.kind === 'trial' && m.ownerId === player.id && m.isTrialBoss)) { socket.emit('interact_error', { message: 'Ải thử thách của bạn đang diễn ra!' }); return; }
    // GĐ319-phụ (Bảo 06/11): thua thì CHỜ 3 ngày game + thi lại TỐN 3.000 LT Hạ — chống thi/lập tông bừa
    const dayNow319 = worldClock().dayIndex;
    if ((player.foundFailDay ?? -1) >= 0 && dayNow319 < player.foundFailDay + FOUND_RETRY_DAYS) { socket.emit('interact_error', { message: `Bạn vừa thua Khảo Quan Ảnh — Quầy Quản Lý bắt chờ ${FOUND_RETRY_DAYS} ngày game mới được thi lại (còn ${player.foundFailDay + FOUND_RETRY_DAYS - dayNow319} ngày). Đỡ tốn công vô ích: mạnh lên hẳn rồi hẵng quay lại.` }); return; }
    const retryFee319 = (player.foundAttempts || 0) > 0 ? FOUND_RETRY_FEE : 0;
    if (retryFee319 && (player.stones || 0) < retryFee319) { socket.emit('interact_error', { message: `Thi lại Khảo Quan Ảnh tốn ${FOUND_RETRY_FEE} Linh thạch (đang có ${player.stones || 0}).` }); return; }
    if (retryFee319) player.stones -= retryFee319;
    player.foundAttempts = (player.foundAttempts || 0) + 1;""")
rep("""    monsters.set(boss.id, boss);
    io.emit('trial_started', { ownerId: player.id, ownerName: player.name, name: boss.name, monsterId: boss.id });
    notice('⚔️ Khảo Quan Ảnh hiện hình ở sân Đạo Quán — chỉ mình bạn đánh được và bị nó đánh. Thắng là đạt Bài 1; thua không mất gì, thi lại ngay được.');""",
"""    monsters.set(boss.id, boss);
    persistPlayer(player); syncChar(socket, player);
    io.emit('trial_started', { ownerId: player.id, ownerName: player.name, name: boss.name, monsterId: boss.id });
    notice(`⚔️ Khảo Quan Ảnh hiện hình ở sân Đạo Quán — chỉ mình bạn đánh được và bị nó đánh. Thắng là đạt Bài 1; THUA thì phải chờ ${FOUND_RETRY_DAYS} ngày game và lần thi sau tốn ${FOUND_RETRY_FEE} Linh thạch${retryFee319 ? ` (đã thu ${retryFee319} LT lệ phí thi lại)` : ''}.`);""")

# --- 4) Ghi nhan THUA khi bi Khao Quan Anh ha guc (handlePlayerDeath, nhanh don trial) ---
rep("""  if (source && source.kind === 'trial') {
    for (const mm of [...monsters.values()]) {
      if (mm.kind === 'trial' && mm.ownerId === p.id) monsters.delete(mm.id);""",
"""  if (source && source.kind === 'trial') {
    if (source.trialKind === 'khaquan') { p.foundFailDay = worldClock().dayIndex; persistPlayer(p); const ps319 = io.sockets.sockets.get(p.id); if (ps319) ps319.emit('notice', { text: `⚔️ Bạn đã thua Khảo Quan Ảnh. Quầy Quản Lý ghi sổ: chờ ${FOUND_RETRY_DAYS} ngày game nữa mới thi lại được, lần thi sau tốn ${FOUND_RETRY_FEE} Linh thạch lệ phí.` }); } // GĐ319-phụ
    for (const mm of [...monsters.values()]) {
      if (mm.kind === 'trial' && mm.ownerId === p.id) monsters.delete(mm.id);""")

io.open(P, 'w', encoding='utf-8').write(s)
print('patch gd319f OK')
