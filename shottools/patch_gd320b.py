# GĐ320b: DUYEN NO hooks — nhiệm vụ/trò chuyện/giao dịch, ở gần nhau, cứu mạng, tông chiến,
# pet/đệ tử bị hạ, đau xót, chọn nhánh, tặng quà NPC. Chay: python3 shottools/patch_gd320b.py
import io
P = '/home/hatch/workspace/tap-tanh-tu-tien-mmo/server/index.js'
s = io.open(P, encoding='utf-8').read()
def rep(old, new, n=1):
    global s
    assert s.count(old) == n, 'anchor %dx: %s' % (s.count(old), old[:70])
    s = s.replace(old, new)

# --- 0) bondViewOf: bo qua khoa NPC trong vong bonds (tranh liet ke 2 lan) ---
rep("""  for (const [key, e] of Object.entries(p.bonds || {})) {
    out.push({ key, kind: 'player'""",
"""  for (const [key, e] of Object.entries(p.bonds || {})) {
    if (key.startsWith('n:')) continue; // nhánh của quan hệ NPC lưu nhờ trong bonds — liệt kê ở vòng affinity dưới
    out.push({ key, kind: 'player'""")

# --- 1) Nguon lap lai NPC: tro chuyen + giao dich danh dau repeatable (tran +15/ngay/cap) ---
rep("    if (npcId) addAffinity(socket, player, npcId, 1); // GĐ24: giao dịch quen mặt +1",
"    if (npcId) addAffinity(socket, player, npcId, 1, { repeatable: true }); // GĐ24 + GĐ320: giao dịch quen mặt +1 (nguồn lặp — trần ngày)")
rep("    if (gained) addAffinity(socket, player, npc.id, gained);",
"      if (gained) addAffinity(socket, player, npc.id, gained, { repeatable: true }); // GĐ320: trò chuyện là nguồn lặp (đã khóa 1 lần/ngày)")

# --- 2) Nhiem vu: nhan +10 (rieng), tra: rieng +25 / bang +10 ---
rep("""    // GĐ24: trả nhiệm vụ bảng → Trưởng Làng quý thêm +5; nhiệm vụ riêng → +10 với NPC đó
    if (def.npcId) addAffinity(socket, player, def.npcId, 10);
    else addAffinity(socket, player, 'npc_truonglang', 5);""",
"""    // GĐ320 (thay GĐ24): trả nhiệm vụ riêng → +25 với NPC đó; nhiệm vụ bảng → +10 Trưởng Làng
    if (def.npcId) addAffinity(socket, player, def.npcId, 25);
    else addAffinity(socket, player, 'npc_truonglang', 10);""")
# quest_accept: cong +10 sau khi nhan thanh cong — neo o cuoi handler: tim doan set quests[...] active gan nhat sau 'quest_accept'
i = s.index("socket.on('quest_accept'")
j = s.index("socket.on('quest_claim'")
seg = s[i:j]
assert "player.quests[data.questId] = " in seg or "quests[data.questId]" in seg, 'khong thay doan ghi nhiem vu trong quest_accept'
# chen vao ngay truoc dau dong handler: tim "  });\n" cuoi cung trong seg
k = seg.rfind("  });\n")
assert k > 0
seg2 = seg[:k] + """    if (def.npcId) addAffinity(socket, player, def.npcId, 10); // GĐ320: nhận nhiệm vụ riêng của NPC +10 thiện cảm
""" + seg[k:]
s = s[:i] + seg2 + s[j:]

# --- 3) O gan nhau: giet quai chung (+1, giang cach 10 phut game, tran ngay trong engine) ---
rep("function addBondPair(p, otherToken, delta, opts = {}) { // cộng điểm quan hệ NGƯỜI CHƠI–NGƯỜI CHƠI, gương hai phía",
"""function addBondPair(p, otherToken, delta, opts = {}) { // cộng điểm quan hệ NGƯỜI CHƠI–NGƯỜI CHƠI, gương hai phía
  if (opts.spacing && delta > 0) { // GĐ320: nguồn 'ở gần nhau' — mỗi 10 phút game mới tính 1 lần/cặp
    const e0 = p.bonds && p.bonds['p:' + otherToken];
    if (e0 && worldMinutes - (e0.pairMin ?? -99999) < 10) return 0;
  }""")
rep("""  const applied = bondGainApply(e, delta, opts);
  if (applied) {""",
"""  const applied = bondGainApply(e, delta, opts);
  if (opts.spacing && applied) e.pairMin = worldMinutes;
  if (applied) {""")
# hook trong onMonsterKilled: sau doan Tam dac/Linh te cua GĐ318/307 — neo theo dong addDiscipleTamDac hoac evoGrowth
import re
m = re.search(r"addDiscipleTamDac\(player, target\)[^\n]*\n", s)
if not m:
    m = re.search(r"[^\n]*Linh tê[^\n]*\n", s)
assert m, 'khong tim thay hook giet quai'
s = s[:m.end()] + """  // GĐ320: săn quái gần nhau (<=600px, cùng map, còn sống) -> +1 thiện cảm/cặp (giãn cách + trần ngày trong engine)
  for (const q of players.values()) { if (q === player || q.isCompanion || q.isBot || q.isOffline || (q.hp || 0) <= 0 || isDowned(q)) continue; if (mapOf(q) !== mapOf(player)) continue; if (Math.hypot(q.x - player.x, q.y - player.y) <= 600) addBondPair(player, q.token, 1, { spacing: true }); }
""" + s[m.end():]

# --- 4) Thien chung: trong khoi tGain linh khi (15472 cu) — chen ham quet vao engine + goi o ca 2 diem thien ---
rep("function bondViewOf(p) { // dữ liệu panel Duyên Nợ",
"""function bondProximityMeditate(p) { // GĐ320: thiền chung gần nhau (cả hai đang thiền, <=600px) -> +1 (giãn cách 10 phút game)
  const now = Date.now();
  if (now - (p._bondScanAt || 0) < 2000) return;
  p._bondScanAt = now;
  for (const q of players.values()) { if (q === p || q.isCompanion || q.isBot || q.isOffline || !q.meditating || (q.hp || 0) <= 0) continue; if (mapOf(q) !== mapOf(p)) continue; if (Math.hypot(q.x - p.x, q.y - p.y) <= 600) addBondPair(p, q.token, 1, { spacing: true }); }
}
function bondViewOf(p) { // dữ liệu panel Duyên Nợ""")
rep(" * raceMedMulOf(p) * (raceOf(p) === 'ma' ? 0.75 : 1) * discMedMulOf(p);",
" * raceMedMulOf(p) * (raceOf(p) === 'ma' ? 0.75 : 1) * discMedMulOf(p) * bondMedMulOf(p); bondProximityMeditate(p); // GĐ320: thiền theo Duyên Nợ (nhánh Tình) + thiền chung gần nhau")
rep("gained = Math.round(gained * tuviMulOf(p) * (1 + soulMedBonusOf(p)) * cultMulOf(p) * raceMedMulOf(p) * discMedMulOf(p));",
"gained = Math.round(gained * tuviMulOf(p) * (1 + soulMedBonusOf(p)) * cultMulOf(p) * raceMedMulOf(p) * discMedMulOf(p) * bondMedMulOf(p)); bondProximityMeditate(p); // GĐ320")

# --- 5) Cuu mang (y_revive): +50 su kien; ban doi cuu -> hoi day mau ---
rep("""    target.downedUntil = 0;
    target.downedSourceKind = null; target.downedSourceName = null;
    target.hp = Math.round(maxHpEff(target) * Y_REVIVE_HP_PCT);""",
"""    target.downedUntil = 0;
    target.downedSourceKind = null; target.downedSourceName = null;
    target.hp = Math.round(maxHpEff(target) * Y_REVIVE_HP_PCT);
    // GĐ320: DUYÊN NỢ — ân cứu mạng +50 (sự kiện); bạn đời (Phu thê/Tri âm) cứu nhau -> hồi ĐẦY máu thay vì một phần
    { const be = player.bonds && player.bonds['p:' + target.token]; const bt = be ? bondTierOf(be.score || 0, be.branch) : null;
      if (bt === 'phuthe' || bt === 'triam') target.hp = maxHpEff(target);
      if (target.token) addBondPair(player, target.token, 50, { event: true, announce: '💞 Ân cứu mạng — mối duyên thêm sâu nặng.' }); }""")

# --- 6) Tong chien ha nguoi: -100 ---
i = s.index("function warKillCredit(")
j = s.index("\n}", i)
seg = s[i:j]
assert 'warKillCredit' in seg
s = s[:j] + """  // GĐ320: hạ người trong tông chiến -> kết nợ -100 (sự kiện)
  { const killer = source && source.token && !source.isCompanion ? source : null; if (killer && victim && victim.token && killer.token !== victim.token) addBondPair(killer, victim.token, -100, { event: true }); }
""" + s[j:]

# --- 7) Pet/de tu bi NGUOI ha: -150 cho chu ---
rep("""  if (p.hp <= 0) {
    if (p.isCotVuong) { breakCotVuongCore(p); return; } // GĐ101: pet chết = vỡ Hạch Tâm, không hồi sinh kiểu người chơi""",
"""  if (p.hp <= 0) {
    // GĐ320: pet/đệ tử bị NGƯỜI chơi khác hạ -> chủ kết nợ với kẻ hạ -150 (sự kiện)
    if ((p.isCotVuong || p.isQuyHon || p.isTamed || p.isDisciple) && source && source.token && !source.isCompanion && p.ownerId) { const ow = players.get(p.ownerId); if (ow && ow.token && ow.token !== source.token) addBondPair(source, ow.token, -150, { event: true }); }
    if (p.isCotVuong) { breakCotVuongCore(p); return; } // GĐ101: pet chết = vỡ Hạch Tâm, không hồi sinh kiểu người chơi""")

# --- 8) Dau xot: vao enterDowned — tri ki bac cuoi o gan nhan +15% cong 30s ---
rep("""  io.to('map:' + mapOf(p)).emit('player_downed', { id: p.id, name: p.name, by: p.downedSourceName });""",
"""  io.to('map:' + mapOf(p)).emit('player_downed', { id: p.id, name: p.name, by: p.downedSourceName });
  // GĐ320: Đau xót — người bạn Huynh đệ/Tỷ muội (nhánh Thân bậc cuối) ở gần thấy bạn gục: +15% công 30s
  if (p.bonds) for (const q of players.values()) { if (q === p || q.isCompanion || q.isBot || q.isOffline || (q.hp || 0) <= 0) continue; if (mapOf(q) !== mapOf(p)) continue; if (Math.hypot(q.x - p.x, q.y - p.y) > 600) continue; const be = q.bonds && q.bonds['p:' + p.token]; if (be && bondTierOf(be.score || 0, be.branch) === 'huynhde') { q.bondGriefUntil = Date.now() + 30000; emitNoticeTo(q, '💔 Tri kỉ gục ngã ngay trước mắt — đau xót hóa thành sức mạnh (+15% công, 30 giây)!'); } }""")

# --- 9) Handler chon nhanh + tang qua NPC (chen truoc sect_invite nhu GĐ318) ---
anchor9 = "  socket.on('sect_invite', (data) => {"
assert s.count(anchor9) == 1
handlers = """  // ================= GĐ320: DUYÊN NỢ =================
  socket.on('bond_choose_branch', (data) => {
    if (!player || !data) return;
    const key = String(data.key || ''); const branch = String(data.branch || '');
    if (branch !== 'than' && branch !== 'tinh') return;
    if (key.startsWith('n:')) {
      const npcId = key.slice(2);
      if (!NPC_BY_ID[npcId]) return;
      if (affinityOf(player, npcId) < 300) { socket.emit('interact_error', { message: 'Phải đạt Bạn thân (300) mới chọn được hướng quan hệ.' }); return; }
      if (!player.bonds) player.bonds = {};
      const e = player.bonds[key] || (player.bonds[key] = { score: 0, branch: null, pick: null, gainDay: -1, gainAmt: 0, name: NPC_BY_ID[npcId].name });
      if (e.branch) { socket.emit('interact_error', { message: 'Quan hệ này đã khóa nhánh — không đổi được.' }); return; }
      e.branch = branch;
      persistPlayer(player); syncChar(socket, player);
      socket.emit('notice', { text: `💞 Bạn và ${NPC_BY_ID[npcId].name} từ đây đi theo hướng ${branch === 'than' ? 'Thân tình (Tri kỉ → Huynh đệ/Tỷ muội)' : 'Tình cảm (Động lòng → Tri âm)'}. Nhánh đã khóa, không đổi lại được.` });
      return;
    }
    if (key.startsWith('p:')) {
      const otherToken = key.slice(2);
      const e = bondEntryOf(player, key);
      if (!e || (e.score || 0) < 300) { socket.emit('interact_error', { message: 'Phải đạt Bạn thân (300) mới chọn được hướng quan hệ.' }); return; }
      if (e.branch) { socket.emit('interact_error', { message: 'Quan hệ này đã khóa nhánh — không đổi được.' }); return; }
      e.pick = branch;
      const other = playerByToken(otherToken); const otherRec = other || characters[otherToken];
      if (otherRec) {
        if (!otherRec.bonds) otherRec.bonds = {};
        const e2 = otherRec.bonds['p:' + player.token] || (otherRec.bonds['p:' + player.token] = { score: e.score || 0, branch: null, pick: null, gainDay: -1, gainAmt: 0, name: player.name });
        e2.theirPick = branch;
        if (e2.pick && e2.pick === branch) {
          e.branch = branch; e2.branch = branch; e.pick = null; e2.pick = null; e2.theirPick = null;
          persistPlayer(player); syncChar(socket, player);
          if (other) { persistPlayer(other); const os = io.sockets.sockets.get(other.id); if (os) syncChar(os, other); emitNoticeTo(other, `💞 ${player.name} và bạn đồng lòng chọn hướng ${branch === 'than' ? 'Thân tình' : 'Tình cảm'} — nhánh quan hệ đã khóa!`); }
          else saveCharacters();
          socket.emit('notice', { text: `💞 Hai bên đồng lòng — quan hệ với ${e.name} đi theo hướng ${branch === 'than' ? 'Thân tình (Tri kỉ → Huynh đệ/Tỷ muội)' : 'Tình cảm (Động lòng → Tri âm)'}. Nhánh đã khóa.` });
        } else {
          persistPlayer(player); syncChar(socket, player);
          if (other) { persistPlayer(other); const os = io.sockets.sockets.get(other.id); if (os) syncChar(os, other); emitNoticeTo(other, `💞 ${player.name} đã chọn hướng ${branch === 'than' ? 'Thân tình' : 'Tình cảm'} cho quan hệ của hai người — mở panel Duyên Nợ để chọn phía bạn (cả hai cùng chọn một hướng mới khóa được).`); }
          else saveCharacters();
          socket.emit('notice', { text: `💞 Đã ghi lựa chọn của bạn cho quan hệ với ${e.name} — chờ phía bên kia chọn cùng hướng.` });
        }
      } else { persistPlayer(player); syncChar(socket, player); }
    }
  });

  socket.on('npc_gift', (data) => {
    if (!player || !data) return;
    if (player.hp <= 0) return;
    const npc = NPC_BY_ID[String(data.npcId || '')];
    if (!npc) return;
    if (mapOf(player) !== HOME_MAP) { socket.emit('interact_error', { message: `${npc.name} ở làng — về làng mới tặng được.` }); return; }
    if (typeof npc.x !== 'number' || Math.hypot(player.x - npc.x, player.y - npc.y) > 160) { socket.emit('interact_error', { message: `Tới gần ${npc.name} để tặng quà.` }); return; }
    const itemId = String(data.itemId || '');
    if (!ITEMS[itemId] || (player.inventory[itemId] || 0) < 1) { socket.emit('interact_error', { message: 'Bạn không có món đó trong túi.' }); return; }
    player.inventory[itemId] -= 1;
    const liked = npcLikedItem(npc.id) === itemId;
    const gain = liked ? 15 : 3;
    addAffinity(socket, player, npc.id, gain);
    persistPlayer(player); syncChar(socket, player);
    socket.emit('notice', { text: liked ? `🎁 ${npc.name} nhận ${ITEMS[itemId].name} — đúng món đang thích, mắt sáng hẳn lên! (thiện cảm +${gain})` : `🎁 ${npc.name} nhận ${ITEMS[itemId].name} và cảm ơn bạn. (thiện cảm +${gain})` });
  });

"""
s = s.replace(anchor9, handlers + anchor9)

# --- 10) npcLikedItem vao engine (sau npcQuestGateOf) ---
rep("function npcQuestGateOf(def) { return (def.minAffinity ?? 50) * 2; } // GĐ320: cổng nhiệm vụ riêng theo thang mới (50 cũ -> 100 = Bạn bè)",
"""function npcQuestGateOf(def) { return (def.minAffinity ?? 50) * 2; } // GĐ320: cổng nhiệm vụ riêng theo thang mới (50 cũ -> 100 = Bạn bè)
const NPC_GIFT_POOL = ['linh_thao', 'thit_thu', 'dan_hoi_xuan', 'da_quy', 'nanh_soi', 'canh_doi', 'thanh_thao', 'xuong_thu'];
function npcLikedItem(npcId) { // GĐ320: món NPC thích — tất định theo id (khám phá bằng quan sát: gợi ý hiện trong hội thoại khi đã quen)
  let h = 0; const str = String(npcId); for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return NPC_GIFT_POOL[h % NPC_GIFT_POOL.length];
}""")

io.open(P, 'w', encoding='utf-8').write(s)
print('patch gd320b OK')
