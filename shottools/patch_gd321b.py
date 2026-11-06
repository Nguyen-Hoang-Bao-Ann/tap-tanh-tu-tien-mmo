# GĐ321b: reformIn bền 4 nơi + payload + cảm ứng + handlers (kết lại/tha/cho ăn)
# + móc giết -400 / bị hạ -50 / truy lùng -1000 + cờ sp trong tick.
import io
P = 'server/index.js'
s = io.open(P, encoding='utf-8').read()
def rep(old, new, n=1):
    global s
    assert s.count(old) == n, 'anchor %dx: %s' % (s.count(old), old[:70])
    s = s.replace(old, new)

# 1) reformIn bền: persistPlayer + payload + 2 spawn literals
rep("""  c.foundInvites = Array.isArray(p.foundInvites) ? p.foundInvites : []; // GĐ319: thiếp mời đang chờ ta""",
    """  c.foundInvites = Array.isArray(p.foundInvites) ? p.foundInvites : []; // GĐ319: thiếp mời đang chờ ta
  c.reformIn = Array.isArray(p.reformIn) ? p.reformIn : []; // GĐ321: lời hẹn kết lại duyên xưa đang chờ ta""")
rep("""    foundInvites: Array.isArray(p.foundInvites) ? p.foundInvites : [], // GĐ319""",
    """    foundInvites: Array.isArray(p.foundInvites) ? p.foundInvites : [], // GĐ319
    reformIn: Array.isArray(p.reformIn) ? p.reformIn : [], // GĐ321""")
rep("""foundInvites: Array.isArray(char.foundInvites) ? char.foundInvites : [], foundSlipFor: char.foundSlipFor || null, // GĐ319""",
    """foundInvites: Array.isArray(char.foundInvites) ? char.foundInvites : [], foundSlipFor: char.foundSlipFor || null, reformIn: Array.isArray(char.reformIn) ? char.reformIn : [], // GĐ319 + GĐ321""", n=2)
# payload: pastBonds + (reformIn đã thêm ở trên cùng cụm payload)
rep("""    bonds: bondViewOf(p), // GĐ320: panel Duyên Nợ""",
    """    bonds: bondViewOf(p), // GĐ320: panel Duyên Nợ
    pastBonds: pastBondsViewOf(p), // GĐ321: sổ Duyên Nợ kiếp trước""")

# 2) tick: cờ sp (quái đặc biệt) cho client hiện nút Tha/Cho ăn
rep("""hidden: m.hidden ? 1 : 0, rare: m.rare ? 1 : 0, // GĐ309: quái hiếm (client nhuộm vàng)""",
    """hidden: m.hidden ? 1 : 0, rare: m.rare ? 1 : 0, sp: (m.kind !== 'trial' && (m.rare || m.mapBoss || m.minChestGrade || (MONSTER_TYPES[m.kind] && MONSTER_TYPES[m.kind].minChestGrade))) ? 1 : 0, // GĐ321: cá thể đặc biệt (client hiện nút Tha mạng/Cho ăn)""")

# 3) móc giết quái đặc biệt: -400 (sau nhánh ảo ảnh, trước trùm thử thách)
rep("""  // GĐ19: trùm thử thách — không rơi đồ/Tu vi; thắng trùm chính → mở khóa đột phá tương ứng""",
    """  // GĐ321: kết liễu cá thể đặc biệt (trùm/quái hiếm) -> KẾT NỢ với loài đó (-400)
  if (isSpecialMonster(target)) { const d321 = addBondMonster(player, target, -400, {}); persistPlayer(player); syncPlayerSocket(player); emitNoticeTo(player, `🥀 Bạn đã kết liễu ${target.name} — một cá thể đặc biệt. Món nợ với loài này sâu thêm (${d321} điểm).`); }
  // GĐ19: trùm thử thách — không rơi đồ/Tu vi; thắng trùm chính → mở khóa đột phá tương ứng""")

# 4) bị quái đặc biệt hạ gục: -50/lần, nguồn này trần -200 (cạnh hook khaQuan trong hitPlayer)
old_hook = """if (source && source.kind === 'trial' && source.trialKind === 'khaquan' && source.ownerId === p.id && !p.isCompanion) { p.foundFailDay = worldClock().dayIndex; persistPlayer(p); emitNoticeTo(p, `⚔️ Bạn đã thua Khảo Quan Ảnh. Quầy Quản Lý ghi sổ: chờ 6 ngày game nữa mới thi lại được, lần thi sau tốn 4.000 Linh thạch Trung phẩm lệ phí.`); } // GĐ319-phụ"""
assert s.count(old_hook) == 1, 'khaquan hook %d' % s.count(old_hook)
s = s.replace(old_hook, old_hook + """ if (source && isSpecialMonster(source) && !p.isCompanion) { const e321 = bondEntryMonster(p, source.kind, source.name); const room321 = -200 - (e321.downDebt || 0); if (room321 < 0) { const dd321 = Math.max(-50, room321); e321.downDebt = (e321.downDebt || 0) + dd321; e321.score = Math.max(-1000, (e321.score || 0) + dd321); persistPlayer(p); } } // GĐ321: bị quái đặc biệt hạ gục -> nợ sâu thêm""")

# 5) TRUY LÙNG ở -1000: sau khối taunt của pet, trước if (stunned)
rep("""  if (stunned) { // GĐ34: bị choáng → đứng yên; GĐ70: khống chế ngắt luôn chiêu đang vận (dậm băng / lao)""",
    """  // GĐ321: NỢ SÂU NHẤT (-1000, 1 mất 1 còn) — cá thể đặc biệt TRUY LÙNG kẻ thù khắp map (như Thiên Đạo truy lùng thu nhỏ)
  m.hunting = false;
  if (isSpecialMonster(m)) {
    for (const p of players.values()) {
      if (p.isOffline || p.isCompanion || p.isBot || p.hp <= 0 || mapOf(p) !== mapOf(m)) continue;
      const be = p.bonds && p.bonds['m:' + m.kind];
      if (!be || (be.score || 0) > -1000) continue;
      if (mapOf(m) === HOME_MAP) { if (isSafeZone(p.x, p.y)) continue; if (insideRealm(p.x, p.y) !== insideRealm(m.x, m.y)) continue; }
      else { const rtH = MAP_RUNTIME.get(mapOf(m)); if (rtH && Math.hypot(p.x - rtH.portal.x, p.y - rtH.portal.y) < 130) continue; }
      nearest = p; nearestDist = Math.hypot(p.x - m.x, p.y - m.y); m.hunting = true;
      break;
    }
  }
  if (stunned) { // GĐ34: bị choáng → đứng yên; GĐ70: khống chế ngắt luôn chiêu đang vận (dậm băng / lao)""")
rep("""  if (nearest && nearestDist <= MONSTER_AGGRO_RANGE && nearestDist > Math.max(26, m.atkRange || WOLF.atkRange)) {""",
    """  if (nearest && (nearestDist <= MONSTER_AGGRO_RANGE || m.hunting) && nearestDist > Math.max(26, m.atkRange || WOLF.atkRange)) { // GĐ321: đang truy lùng thì bỏ qua tầm thù hận""")
rep("""  } else if (!nearest || nearestDist > MONSTER_AGGRO_RANGE) {""",
    """  } else if (!nearest || (nearestDist > MONSTER_AGGRO_RANGE && !m.hunting)) { // GĐ321""")

# 6) nhịp cảm ứng 2s (cạnh nhịp tổ đội 4s)
rep("""setInterval(() => { for (const party of parties.values()) pushPartyUpdate(party); }, 4000);""",
    """setInterval(() => { for (const party of parties.values()) pushPartyUpdate(party); }, 4000);

// GĐ321: nhịp CẢM ỨNG duyên nợ kiếp trước — tới gần đúng đối tượng, hồn khẽ động (chỉ gợi ý, không hiện số)
setInterval(() => {
  for (const p of players.values()) {
    if (p.isCompanion || p.isBot || p.isOffline || (p.hp || 0) <= 0) continue;
    const sl = p.soul; if (!sl || !Array.isArray(sl.pastBonds)) continue;
    for (const e of sl.pastBonds) {
      if (e.sensed) continue;
      let near = false;
      if (e.kind === 'player') { const o = playerByToken(e.key.slice(2)); if (o && !o.isCompanion && mapOf(o) === mapOf(p) && Math.hypot(o.x - p.x, o.y - p.y) <= 320) near = true; }
      else if (e.kind === 'npc') { if (mapOf(p) === HOME_MAP) { const def = NPC_BY_ID[e.key.slice(2)]; if (def && Math.hypot(p.x - def.x, p.y - def.y) <= 220) near = true; } }
      else if (e.kind === 'monster') { for (const m of monsters.values()) { if (m.kind === e.key.slice(2) && isSpecialMonster(m) && mapOf(m) === mapOf(p) && Math.hypot(m.x - p.x, m.y - p.y) <= 500) { near = true; break; } } }
      if (near) { e.sensed = true; persistPlayer(p); const sk = io.sockets.sockets.get(p.id); if (sk) syncChar(sk, p); emitNoticeTo(p, e.score >= 0 ? '💞 Ánh mắt này… quen thuộc lạ thường. (Mở 💞 Duyên Nợ — Sổ kiếp trước)' : '🥀 Ánh mắt này… quen thuộc lạ thường — một món nợ cũ chưa trả. (Mở 💞 Duyên Nợ — Sổ kiếp trước)'); }
    }
  }
}, 2000);""")

io.open(P, 'w', encoding='utf-8').write(s)
print('gd321b part1 OK')
