# GĐ318b: noi cac hook — persist/spawn/payload/progress/thien/kill/tick/npcs/talk/dot pha
import io
P = '/home/hatch/workspace/tap-tanh-tu-tien-mmo/server/index.js'
s = io.open(P, encoding='utf-8').read()
def rep(old, new, n=1):
    global s
    assert s.count(old) == n, 'anchor %dx: %s' % (s.count(old), old[:70])
    s = s.replace(old, new)

# 1) persistPlayer
rep("  c.mails = Array.isArray(p.mails) ? p.mails : []; // GĐ304: hộp thư cá nhân",
"  c.mails = Array.isArray(p.mails) ? p.mails : []; // GĐ304: hộp thư cá nhân\n  c.disciples = disciplesOf(p); // GĐ318: đệ tử (NPC + người chơi)\n  c.masterInfo = p.masterInfo || null; // GĐ318: sư phụ người chơi của mình\n  c.discipleInvites = Array.isArray(p.discipleInvites) ? p.discipleInvites : []; // GĐ318: lời mời làm đệ tử đang chờ\n  c.chiDiemUntilMin = p.chiDiemUntilMin || 0; // GĐ318: hạn buff chỉ điểm (phút thế giới)")
# 2) spawnFromChar literal
rep("    mails: Array.isArray(char.mails) ? char.mails : undefined, // GĐ304: hộp thư (undefined = chưa từng có -> hello tặng thư chào mừng)",
"    mails: Array.isArray(char.mails) ? char.mails : undefined, // GĐ304: hộp thư (undefined = chưa từng có -> hello tặng thư chào mừng)\n    disciples: Array.isArray(char.disciples) ? char.disciples : [], // GĐ318\n    masterInfo: char.masterInfo || null, // GĐ318\n    discipleInvites: Array.isArray(char.discipleInvites) ? char.discipleInvites : [], // GĐ318\n    chiDiemUntilMin: char.chiDiemUntilMin || 0, // GĐ318")
# 3) spawnOfflineActor literal
rep("    mails: Array.isArray(char.mails) ? char.mails : [], // GĐ304: hộp thư đi theo bản offline (autosave không ghi đè mất thư)",
"    mails: Array.isArray(char.mails) ? char.mails : [], // GĐ304: hộp thư đi theo bản offline (autosave không ghi đè mất thư)\n    disciples: Array.isArray(char.disciples) ? char.disciples : [], // GĐ318: giữ đệ tử qua restart (autosave không ghi đè mất)\n    masterInfo: char.masterInfo || null, // GĐ318\n    discipleInvites: Array.isArray(char.discipleInvites) ? char.discipleInvites : [], // GĐ318\n    chiDiemUntilMin: char.chiDiemUntilMin || 0, // GĐ318")
# 4) characterPayload: khoi de tu sau dong race
rep("    classId: p.classId, race: raceOf(p), raceName: raceOf(p) ? RACES[p.race].name : null, // GĐ317: chủng tộc",
"    classId: p.classId, race: raceOf(p), raceName: raceOf(p) ? RACES[p.race].name : null, // GĐ317: chủng tộc\n    disciples: disciplesOf(p).map((e, i) => e.type === 'npc' ? { idx: i, type: 'npc', name: e.name, tilt: e.tilt, tiltName: CLASSES[e.tilt]?.name || e.tilt, level: e.level, levelName: DISC_LEVEL_NAMES[e.level], tamDac: e.tamDac || 0, nextNeed: e.level >= 5 ? DISC_GRAD_NEED : DISC_NEED[e.level - 1], skills: (e.skills || []).map((id) => ({ id, name: SKILL_BY_ID[id]?.name || id })), hp: Math.round(discipleEntityOf(p, i)?.hp ?? e.hp ?? 0), maxHp: discipleStatsFor(p, e).maxHpOverride, canPoint: e.lastPointDay !== worldClock().dayIndex, canGraduate: e.level >= 5 && (e.tamDac || 0) >= DISC_GRAD_NEED } : { idx: i, type: 'player', key: e.key, name: e.name, graduated: !!e.graduated, canPoint: e.lastPointDay !== worldClock().dayIndex }), // GĐ318\n    masterInfo: p.masterInfo ? { name: p.masterInfo.name, graduated: !!p.masterInfo.graduated } : null, // GĐ318\n    discipleInvites: (p.discipleInvites || []).map((v) => ({ fromKey: v.fromKey, fromName: v.fromName })), // GĐ318\n    discipleEligible: discipleMasterEligible(p), discipleSlots: DISC_MAX - discipleActiveCount(p), // GĐ318\n    mySkills: (p.skills || []).map((id) => ({ id, name: SKILL_BY_ID[id]?.name || id })), // GĐ318: để panel chọn công pháp truyền")
# 5) progressFor
rep("    case 'pastDreams': return c.pastDreams || 0; // GĐ314",
"    case 'pastDreams': return c.pastDreams || 0; // GĐ314\n    case 'disciples': return c.disciples || 0; // GĐ318: đã nhận + dạy thành tài (đếm ở counters.disciples)")
# 6) learnMulOf: co su phu nguoi choi +5%
rep("function learnMulOf(p) { const r = raceOf(p); return cultMulOf(p) * (blessingActiveOf(p) && p.blessing === 'tien' ? 1.05 : 1) * (r === 'nhan' ? 1.2 : r === 'thu' ? 0.75 : 1); }",
"function learnMulOf(p) { const r = raceOf(p); return cultMulOf(p) * (blessingActiveOf(p) && p.blessing === 'tien' ? 1.05 : 1) * (r === 'nhan' ? 1.2 : r === 'thu' ? 0.75 : 1) * (p.masterInfo ? 1.05 : 1); } // GĐ318: có sư phụ người chơi chỉ dạy -> học/luyện +5%")
# 7) thien: 2 diem cong Tu vi nhan buff de tu
rep("gained = Math.round(gained * tuviMulOf(p) * (1 + soulMedBonusOf(p)) * cultMulOf(p) * raceMedMulOf(p));",
"gained = Math.round(gained * tuviMulOf(p) * (1 + soulMedBonusOf(p)) * cultMulOf(p) * raceMedMulOf(p) * discMedMulOf(p)); // GĐ318: buff sư đồ khi thiền")
rep("* raceMedMulOf(p) * (raceOf(p) === 'ma' ? 0.75 : 1); // GĐ317: Thần x0.8 / Tiên x1.2; riêng Ma ở nơi linh khí x0.75",
"* raceMedMulOf(p) * (raceOf(p) === 'ma' ? 0.75 : 1) * discMedMulOf(p); // GĐ317: Thần x0.8 / Tiên x1.2; riêng Ma ở nơi linh khí x0.75 // GĐ318: buff sư đồ")
# 8) kill hook: Tam dac cho de tu NPC o gan tran (canh dong Linh te pet 6841 cu)
rep("{ const pet307 = tamedPetOf(player); if (pet307 && mapOf(pet307) === mapOf(target) && Math.hypot(pet307.x - target.x, pet307.y - target.y) <= 700) { const tm307 = tamedOf(player); tm307.growth = (tm307.growth || 0) + (EVO_GROWTH[target.rewardClass] || 1); } } // GĐ307: thú còn sống + ở gần trận -> tích Linh tê theo hạng quái",
"{ const pet307 = tamedPetOf(player); if (pet307 && mapOf(pet307) === mapOf(target) && Math.hypot(pet307.x - target.x, pet307.y - target.y) <= 700) { const tm307 = tamedOf(player); tm307.growth = (tm307.growth || 0) + (EVO_GROWTH[target.rewardClass] || 1); } } // GĐ307: thú còn sống + ở gần trận -> tích Linh tê theo hạng quái\n    for (const q of players.values()) { if (q.isDisciple && q.ownerId === player.id && mapOf(q) === mapOf(target) && Math.hypot(q.x - target.x, q.y - target.y) <= 700) { const de = disciplesOf(player)[q.discIdx]; if (de) addDiscipleTamDac(player, de, EVO_GROWTH[target.rewardClass] || 1); } } // GĐ318: đệ tử NPC theo đánh cùng tích Tâm đắc như Linh tê")
# 9) tick dispatch
rep("    if (p.isCompanion) { updateCompanion(p, dt); continue; } // GĐ22: đồng môn AI",
"    if (p.isDisciple) { updateDisciple(p, dt); continue; } // GĐ318: đệ tử NPC AI\n    if (p.isCompanion) { updateCompanion(p, dt); continue; } // GĐ22: đồng môn AI")
# 10) npcsForWorld: + ung vien cau su
rep("function npcsForWorld() {\n  return NPCS.filter(",
"function npcsForWorld() {\n  return [...NPCS.filter(")
rep("&& (n.id !== 'npc_thaydo' || festivalActive())); // GĐ217–GĐ222: NPC mùa chỉ ở làng đúng mùa lễ của mình\n}",
"&& (n.id !== 'npc_thaydo' || festivalActive())), ...candidateNpcs()]; // GĐ217–GĐ222: NPC mùa // GĐ318: + thiếu niên cầu sư\n}")
# 11) talk_npc: hook ung vien truoc khi tra NPC_BY_ID
rep("    const npc = NPC_BY_ID[data.npcId];\n    if (!npc) return;",
"    if (typeof data.npcId === 'string' && data.npcId.startsWith('disc_cand_')) { emitDiscipleCandidateDialog(socket, player, data.npcId); return; } // GĐ318\n    const npc = NPC_BY_ID[data.npcId];\n    if (!npc) return;")
# 12) dot pha: de tu nguoi choi thanh tai
rep("      // GĐ88: đột phá Kim Đan → tự lĩnh ngộ thần thông riêng của lớp",
"      discipleGraduateCheck(player); // GĐ318: đệ tử người chơi đạt Kim Đan -> thành tài\n      // GĐ88: đột phá Kim Đan → tự lĩnh ngộ thần thông riêng của lớp")
# 13) hello: spawn de tu NPC theo chu
rep("  spawnTamed(player); // GĐ137: thú thuần hóa còn sống thì hiện lại theo chủ",
"    spawnTamed(player); // GĐ137: thú thuần hóa còn sống thì hiện lại theo chủ\n    spawnDisciples(player); // GĐ318: đệ tử NPC hiện lại theo sư phụ")
# 14) playerSyncState: nhan de tu cua ai
rep("    psectx: (() => { const g = sectOfToken(p.token); return g ? g.name : ''; })(), // GĐ302: tên tông NGƯỜI CHƠI (hiện trên tên nhân vật)",
"    psectx: (() => { const g = sectOfToken(p.token); return g ? g.name : ''; })(), // GĐ302: tên tông NGƯỜI CHƠI (hiện trên tên nhân vật)\n    disc: p.isDisciple ? (players.get(p.ownerId)?.name || '') : '', // GĐ318: đệ tử NPC của ai (client hiện dưới tên)")
# 15) thien cung: de tu NPC tich Tam dac khi thien canh su phu (trong updateDisciple)
rep("  c.meditating = !!(owner.meditating && Math.hypot(owner.x - c.x, owner.y - c.y) <= 220);",
"  c.meditating = !!(owner.meditating && Math.hypot(owner.x - c.x, owner.y - c.y) <= 220);\n  if (c.meditating) { e.medFrac = (e.medFrac || 0) + dt; if (e.medFrac >= 30) { e.medFrac = 0; addDiscipleTamDac(owner, e, 1); if (players.get(c.id) !== c) return; } } // GĐ318: thiền cùng sư phụ +1 Tâm đắc / 30s")
io.open(P, 'w', encoding='utf-8').write(s)

# achievements.js: bat ach_nd_disciple
P2 = '/home/hatch/workspace/tap-tanh-tu-tien-mmo/server/achievements.js'
s2 = io.open(P2, encoding='utf-8').read()
old = "{ id: 'ach_nd_disciple', group: 'nhan_duyen', name: 'Đệ tử', desc: 'Số đệ tử đã nhận hoặc dạy thành tài', base: 'Danh Sư', tiers: [1, 3, 10, 30], key: 'disciples', enabled: false }"
assert s2.count(old) == 1
s2 = s2.replace(old, old.replace('enabled: false', 'enabled: true'))
io.open(P2, 'w', encoding='utf-8').write(s2)
print('gd318b OK')
