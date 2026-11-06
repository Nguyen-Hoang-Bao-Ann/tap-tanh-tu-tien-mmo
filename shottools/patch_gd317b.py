# -*- coding: utf-8 -*-
# GĐ317b: nối hiệu ứng tộc vào các hệ sẵn có (chạy sau patch_gd317.py).
import io
P = '/home/hatch/workspace/tap-tanh-tu-tien-mmo/server/index.js'
s = io.open(P, encoding='utf-8').read()
def rep(old, new, cnt=1):
    global s
    assert s.count(old) == cnt, 'ANCHOR x%d: %s' % (s.count(old), old[:90])
    s = s.replace(old, new)

# raceCdMulOf (Tiên -5%, Long +15%) — thêm cạnh raceSpeedMulOf (GĐ317 part 1)
rep("function raceSpeedMulOf(p) {",
    "function raceCdMulOf(p) { const r = raceOf(p); return r === 'tien' ? 0.95 : r === 'long' ? 1.15 : 1; }\nfunction raceSpeedMulOf(p) {")

# --- 3 điểm gây sát thương lên quái: nhân hệ số tộc ---
rep("* blessDmgMulOf(player) + rageBonus) * (1 + achDmgBonus(player)) * branchDmgMulOf(player) * factionVsMulOf(player, target), target.def ?? WOLF.def, atk.type",
    "* blessDmgMulOf(player) + rageBonus) * (1 + achDmgBonus(player)) * branchDmgMulOf(player) * factionVsMulOf(player, target) * raceDmgMulOf(player, false, atk.type), target.def ?? WOLF.def, atk.type") # GĐ317: hệ số tộc vào đòn thường
rep("* blessDmgMulOf(player) + rageBonus) * (1 + achDmgBonus(player)) * branchDmgMulOf(player) * factionVsMulOf(player, target);",
    "* blessDmgMulOf(player) + rageBonus) * (1 + achDmgBonus(player)) * branchDmgMulOf(player) * factionVsMulOf(player, target) * raceDmgMulOf(player, false, atk.type);") # GĐ317: đòn phụ Thể tu
rep("* vmMulOf(player, t, true) * blessDmgMulOf(player), effDef, atk.type",
    "* vmMulOf(player, t, true) * blessDmgMulOf(player) * raceDmgMulOf(player, true, atk.type), effDef, atk.type") # GĐ317: hệ số tộc vào chiêu
# Long Tức: đòn thường thứ 5 phun diện rộng (sau đòn thường, trước xử lý quái chết)
rep("    if (player.classId === 'kiemtu') addNgoKiem(player, NGOKIEM_HIT); // GĐ99: đánh trúng tích Ngộ Kiếm",
    """    if (player.race === 'long' && dmg > 0) { // GĐ317: LONG TỨC — mỗi đòn thường thứ 5 phun long tức diện rộng 60%
      player._atkSeq = (player._atkSeq || 0) + 1;
      if (player._atkSeq % 5 === 0) {
        for (const m of [...monsters.values()]) {
          if (m === target || m.hp <= 0 || m.hidden || mapOf(m) !== mapOf(player)) continue;
          if (Math.hypot(m.x - player.x, m.y - player.y) <= 150) hurtMonster(m, Math.max(1, Math.round(dmg * 0.6)), m.def, 'magic');
        }
        io.to('map:' + mapOf(player)).emit('skill_cast', { id: player.id, name: player.name, skillId: 'long_tuc', skillName: 'Long Tức', element: 'Hỏa' });
      }
    }
    if (player.classId === 'kiemtu') addNgoKiem(player, NGOKIEM_HIT); // GĐ99: đánh trúng tích Ngộ Kiếm""")

# --- Hồi chiêu theo tộc (chiêu thường + chiêu Pháp Tướng) ---
rep("const cdMs = Math.round(skill.cdMs * (1 - cdrOf(effStatsOf(player))) * (1 - minhCdrOf(effStatsOf(player))) * (vmOf(player) && player.classId === 'phattu' ? 0.75 : 1));",
    "const cdMs = Math.round(skill.cdMs * (1 - cdrOf(effStatsOf(player))) * (1 - minhCdrOf(effStatsOf(player))) * (vmOf(player) && player.classId === 'phattu' ? 0.75 : 1) * raceCdMulOf(player)); // GĐ317: Tiên -5% / Long +15% hồi chiêu")
rep("player.skillReadyAt[skill.id] = now + Math.round(skill.cdMs * (1 - GEAR.uniqueFxOf(player).cdrPct)); // GĐ192: cả chiêu pháp tướng cũng ăn giảm hồi chiêu độc nhất",
    "player.skillReadyAt[skill.id] = now + Math.round(skill.cdMs * (1 - GEAR.uniqueFxOf(player).cdrPct) * raceCdMulOf(player)); // GĐ192 + GĐ317: cả chiêu pháp tướng cũng ăn giảm hồi chiêu độc nhất + hệ số tộc")

# --- Ma tộc: hút máu 6% sát thương chiêu (qua applySelfFx, tôn trọng chặn hồi khi hiện hình PT) ---
rep("  if (fx.lifesteal && totalDealt > 0) heal += Math.round((totalDealt * fx.lifesteal) / 100);",
    "  if (fx.lifesteal && totalDealt > 0) heal += Math.round((totalDealt * fx.lifesteal) / 100);\n  if (p.race === 'ma' && totalDealt > 0) heal += Math.round(totalDealt * 0.06); // GĐ317: Ma tộc — chiêu hút 6% máu")

# --- Quỷ tộc: tích Hồn Khí +60% (Quỷ tu) ---
rep("  if (vmOf(p)) n = Math.ceil(n * 1.5); // GĐ312: Minh Thần Đế — thu hồn nhanh hơn 50%",
    "  if (vmOf(p)) n = Math.ceil(n * 1.5); // GĐ312: Minh Thần Đế — thu hồn nhanh hơn 50%\n  if (raceOf(p) === 'quy') n = Math.ceil(n * 1.6); // GĐ317: Quỷ tộc — tích Hồn Khí +60%")

# --- Vạn Thú: linh thú +30% (trong spawnTamed) ---
rep("  const evoMul = EVO_MUL[evoOf(tm)]; // GĐ307",
    "  const evoMul = EVO_MUL[evoOf(tm)] * (raceOf(owner) === 'thu' ? 1.3 : 1); // GĐ307 + GĐ317: Vạn Thú tộc — linh thú theo mình mạnh +30%")

# --- Thuần hóa: Vạn Thú +40% tỉ lệ ---
rep("    const rate = Math.min(1, TAME_RATE + (jobOf(player, 'thusu')?.master ? TAME_APPRENTICE_BONUS : 0));",
    "    const rate = Math.min(1, (TAME_RATE + (jobOf(player, 'thusu')?.master ? TAME_APPRENTICE_BONUS : 0)) * (player.race === 'thu' ? 1.4 : 1)); // GĐ317: Vạn Thú tộc thuần phục +40%")

# --- Bán đồ: Hồ tộc +20% giá ---
rep("    const sellGain = Math.round(price * (1 + achSellBonus(player))); // GĐ139: mốc Của cải 1 +5% giá bán",
    "    const sellGain = Math.round(price * (1 + achSellBonus(player)) * (player.race === 'ho' ? 1.2 : 1)); // GĐ139 + GĐ317: Hồ tộc bán đồ lời +20%")

# --- hitPlayer: né theo tộc + Ảo Ảnh Hồ + khiên Tiên + Hỏa khắc Hoa ---
rep("""  // GĐ31/GĐ32: đang ngồi lĩnh ngộ mà BỊ ĐÁNH TRÚNG → văng, tiến độ VỀ 0
  breakLearning(p, true);""",
"""  // GĐ317: né tránh theo tộc (chỉ với đòn từ quái) + Cửu Vĩ Ảo Ảnh của Hồ tộc
  if (source && source.kind) {
    const rd317 = p.race === 'quy' ? 10 : p.race === 'dieu' ? 15 : p.race === 'ho' ? 6 : 0;
    if (rd317 && Math.random() * 100 < rd317) { p.dodgeCount = (p.dodgeCount || 0) + 1; p.lastCombatAt = Date.now(); return; }
    if (p.race === 'ho' && Math.random() < 0.15) { p.foxHasteUntil = Date.now() + 2000; p.lastCombatAt = Date.now(); emitNoticeTo(p, '🦊 Cửu Vĩ Ảo Ảnh — đòn đánh chỉ trúng ảo ảnh!'); return; }
  }
  // GĐ31/GĐ32: đang ngồi lĩnh ngộ mà BỊ ĐÁNH TRÚNG → văng, tiến độ VỀ 0
  breakLearning(p, true);""")
rep("  let dmg = damageThrough(rawIn, def);",
    "  let dmg = damageThrough(rawIn, def);\n  if (p.race === 'hoa' && source && source.kind) { raceKindSets(); if (FIRE_KINDS.has(source.kind)) dmg = Math.round(dmg * 1.4); } // GĐ317: Hoa tộc sợ lửa — nhận +40% từ quái hệ Hỏa\n  if (p.raceShield > 0 && dmg > 0) { const ab317 = Math.min(p.raceShield, dmg); p.raceShield -= ab317; dmg -= ab317; } // GĐ317: Tiên Khí Hộ Thể hấp thụ trước máu")

# --- enterDowned: Hoa tộc Xuân Sinh (mỗi ngày 1 lần không gục) ---
rep("function enterDowned(p, source) {",
    """function enterDowned(p, source) {
  // GĐ317: Hoa tộc — XUÂN PHONG XUY HỰU SINH: mỗi ngày game 1 lần, máu về 0 thì hồi 30% thay vì gục
  if (p.race === 'hoa' && !p.isBot && !p.isOffline && !p.isCompanion && p.springDay !== worldClock().dayIndex) {
    p.springDay = worldClock().dayIndex;
    p.hp = Math.max(1, Math.round(maxHpEff(p) * 0.3));
    emitNoticeTo(p, '🌸 Xuân Phong Xuy Hựu Sinh — mầm xuân bừng dậy, bạn hồi 30% máu thay vì gục ngã! (1 lần/ngày)');
    return;
  }""")

# --- AI quái: Quỷ tàng hình tầm 60% + Vạn Thú Triều Bái (thú nguyên máu không chủ động) ---
rep("    const d = Math.hypot(p.x - m.x, p.y - m.y);\n    if (d < nearestDist) {",
    "    if (p.race === 'thu' && !m.mapBoss && !m.isTrialBoss && !m.trial) { raceKindSets(); if (BEAST_KINDS.has(m.kind) && (m.hp || 0) >= (m.maxHp || 1)) continue; } // GĐ317: Vạn Thú Triều Bái — thú nguyên vẹn không chủ động tấn công\n    const d = Math.hypot(p.x - m.x, p.y - m.y) * (p.race === 'quy' ? 1 / 0.6 : 1); // GĐ317: Quỷ tộc Vô Hình Thể — quái cảm nhận như xa hơn (tầm hiệu dụng 60%)\n    if (d < nearestDist) {")
# nearestDist lúc này là khoảng cách ĐÃ nhân hệ số cho riêng Quỷ — cổng đuổi/cắn ở
# dưới dùng MONSTER_AGGRO_RANGE/atkRange so với nearestDist: với Quỷ, d ảo lớn
# hơn thật nên quái chỉ đuổi khi thật <= 60% tầm, cắn khi thật*1.67 <= atkRange
# (hẹp hơn) — cắn vẫn trúng khi áp sát thật <= atkRange*0.6. Chấp nhận TẠM.

# --- Bay: Bách Điểu từ Trúc Cơ ---
rep("if ((REALM_ORDER[player.realm || 'pham'] ?? 0) < 3) { socket.emit('interact_error', { message: 'Chỉ tu sĩ Kim Đan mới ngự kiếm phi hành được.' }); return; }",
    "    if ((REALM_ORDER[player.realm || 'pham'] ?? 0) < (player.race === 'dieu' ? 2 : 3)) { socket.emit('interact_error', { message: player.race === 'dieu' ? 'Bách Điểu tộc cũng phải tới Trúc Cơ mới bay được.' : 'Chỉ tu sĩ Kim Đan mới ngự kiếm phi hành được.' }); return; } // GĐ317: Bách Điểu bay sớm từ Trúc Cơ", 2)

# --- Phe Ma: Thần tộc bị cấm ---
rep("    if (player.branch) { socket.emit('interact_error', { message: 'Bạn đã chọn phe rồi.' }); return; }",
    "    if (player.branch) { socket.emit('interact_error', { message: 'Bạn đã chọn phe rồi.' }); return; }\n    if (player.race === 'than' && side === 'ma') { socket.emit('interact_error', { message: 'Thần tộc mang thiên mệnh — không thể cúi đầu trước bóng tối (không theo phe Ma được).' }); return; } // GĐ317")

# --- Đột phá: Long tốn Tu vi x1,3 (chỉ handler đột phá chính, neo theo câu báo lỗi riêng) ---
rep("""    const need = tuViNeedStep(globalStep(player.realm, player.tier));
    if (player.tuVi < need) {
      socket.emit('interact_error', { message: `Chưa đủ Tu vi để thử thách: ${player.tuVi}/${need}.` });""",
"""    const need = Math.round(tuViNeedStep(globalStep(player.realm, player.tier)) * (player.race === 'long' ? 1.3 : 1)); // GĐ317: Long tộc — long mạch khó thông, đột phá tốn Tu vi x1,3
    if (player.tuVi < need) {
      socket.emit('interact_error', { message: `Chưa đủ Tu vi để thử thách: ${player.tuVi}/${need}.` });""")

# --- Tốc độ chạy theo tộc (dòng chuyển động chính) ---
rep("* (p.xuatKhieu ? 1.8 : 1); // GĐ191: + tốc độ từ dòng độc nhất",
    "* (p.xuatKhieu ? 1.8 : 1) * raceSpeedMulOf(p); // GĐ191: + tốc độ từ dòng độc nhất // GĐ317: + tốc độ tộc (Điểu x1.18, Hồ ảo ảnh tăng tốc)")

# --- Thiền: hệ số tộc ---
rep("* ((p.flags && p.flags.ruouQueUntil > worldMinutes) ? 1.3 : 1);",
    "* ((p.flags && p.flags.ruouQueUntil > worldMinutes) ? 1.3 : 1) * raceMedMulOf(p) * (raceOf(p) === 'ma' ? 0.75 : 1); // GĐ317: Thần x0.8 / Tiên x1.2; riêng Ma ở nơi linh khí x0.75")
rep("gained = Math.round(gained * tuviMulOf(p) * (1 + soulMedBonusOf(p)) * cultMulOf(p));",
    "gained = Math.round(gained * tuviMulOf(p) * (1 + soulMedBonusOf(p)) * cultMulOf(p) * raceMedMulOf(p)); // GĐ317")
rep("const grant = Math.round(grant0 * tuviMulOf(player) * (1 + soulMedBonusOf(player)) * cultMulOf(player));",
    "const grant = Math.round(grant0 * tuviMulOf(player) * (1 + soulMedBonusOf(player)) * cultMulOf(player) * raceMedMulOf(player)); // GĐ317")

# --- Hồi máu khi thiền: Hoa x2 ---
rep("const medMul193 = (1 + GEAR.uniqueFxOf(p).medPct) * ((p.flags && p.flags.daoFoodUntil > worldMinutes) ? 1.5 : 1); // GĐ193 + GĐ218: Bánh Hoa Đào +50% hồi khi thiền",
    "const medMul193 = (1 + GEAR.uniqueFxOf(p).medPct) * ((p.flags && p.flags.daoFoodUntil > worldMinutes) ? 1.5 : 1) * (raceOf(p) === 'hoa' ? 2 : 1); // GĐ193 + GĐ218 + GĐ317: Hoa tộc hồi tự nhiên x2")

# --- Thiên Đạo: Thần tộc miễn nhiễm (chèn sau khi lấy td) ---
rep("        const td = p.flags && p.flags.thienDao;",
    "        const td = p.flags && p.flags.thienDao;\n        if (td && p.race === 'than') { td.nextAt = worldMinutes + THIENDAO_CYCLE_MIN; td.warned = false; } // GĐ317: Thần tộc — Thiên Khiển Miễn Nhiễm (đẩy mốc truy lùng ra xa mãi)")

# --- Tick: khiên Tiên tự hồi 60s + Điểu hồi phục khi bay ---
rep("""      if (p.hp > 0) {
        const ufx = GEAR.uniqueFxOf(p);""",
"""      if (p.race === 'tien' && p.hp > 0 && Date.now() >= (p.raceShieldAt || 0)) { p.raceShield = Math.max(p.raceShield || 0, Math.round(maxHpEff(p) * 0.12)); p.raceShieldAt = Date.now() + 60000; } // GĐ317: Tiên Khí Hộ Thể — khiên 12% máu, tự đầy lại mỗi 60s
      if (p.race === 'dieu' && p.flying && p.hp > 0 && !p.meditating) { p.hp = Math.min(maxHpEff(p), p.hp + maxHpEff(p) * MEDITATE_HP_PCT_PER_S * 2 * dt); p.mp = Math.min(maxMpEff(p), p.mp + mpRegenOf(p.stats) * 2 * dt); } // GĐ317: Thiên Không Ưu Thế — đang bay hồi phục x2
      if (p.hp > 0) {
        const ufx = GEAR.uniqueFxOf(p);""")

# --- Đạo Quán: Nhân tộc ngưỡng -30% ---
rep("  const hours = d.min / 60;\n  for (let i = d.tier; i < DAO_QUAN_TIERS.length; i++) {",
    "  const hours = d.min / 60 / (raceOf(p) === 'nhan' ? 0.7 : 1); // GĐ317: Nhân tộc Thất Khiếu Linh Lung — ngưỡng chỉ số ẩn -30%\n  for (let i = d.tier; i < DAO_QUAN_TIERS.length; i++) {")

# --- Nghề: Nhân +20% lượt chế (2 điểm cộng crafts) ---
rep("      if (craftJob) craftJob.crafts = (craftJob.crafts || 0) + 1; else if (player.job) player.job.crafts = (player.job.crafts || 0) + 1; // GĐ142: lượt chế vào nghề khớp",
    "      if (craftJob) craftJob.crafts = (craftJob.crafts || 0) + craftGainOf(player); else if (player.job) player.job.crafts = (player.job.crafts || 0) + craftGainOf(player); // GĐ142 + GĐ317: Nhân tộc học nghề +20%")
rep("      const forgeJob = jobOf(player, 'luyenkhi'); if (forgeJob) forgeJob.crafts = (forgeJob.crafts || 0) + 1; // GĐ142: lượt rèn vào nghề khớp",
    "      const forgeJob = jobOf(player, 'luyenkhi'); if (forgeJob) forgeJob.crafts = (forgeJob.crafts || 0) + craftGainOf(player); // GĐ142 + GĐ317")

# --- Đan dược: Hoa tộc +50% hiệu quả (5 điểm hồi trong use_item) ---
rep("      player.hp = Math.min(maxHpEff(player), player.hp + Math.round(maxHpEff(player) * 0.25));\n      player.mp = Math.min(maxMpEff(player), player.mp + Math.round(maxMpEff(player) * 0.25));",
    "      player.hp = Math.min(maxHpEff(player), player.hp + Math.round(maxHpEff(player) * 0.25 * (player.race === 'hoa' ? 1.5 : 1)));\n      player.mp = Math.min(maxMpEff(player), player.mp + Math.round(maxMpEff(player) * 0.25 * (player.race === 'hoa' ? 1.5 : 1))); // GĐ317: Hoa tộc — đan dược +50%", 2)
rep("      if (!player.phapTuongActive) player.hp = Math.min(maxHpEff(player), player.hp + Math.round(maxHpEff(player) * 0.15));",
    "      if (!player.phapTuongActive) player.hp = Math.min(maxHpEff(player), player.hp + Math.round(maxHpEff(player) * 0.15 * (player.race === 'hoa' ? 1.5 : 1))); // GĐ317")
rep("      player.hp = Math.min(maxHpEff(player), player.hp + Math.round(maxHpEff(player) * 0.30));",
    "      player.hp = Math.min(maxHpEff(player), player.hp + Math.round(maxHpEff(player) * 0.30 * (player.race === 'hoa' ? 1.5 : 1))); // GĐ317")
rep("      player.hp = Math.min(maxHpEff(player), player.hp + Math.round(maxHpEff(player) * 0.10));",
    "      player.hp = Math.min(maxHpEff(player), player.hp + Math.round(maxHpEff(player) * 0.10 * (player.race === 'hoa' ? 1.5 : 1))); // GĐ317")

io.open(P, 'w', encoding='utf-8').write(s)
print('gd317 part2 OK')
