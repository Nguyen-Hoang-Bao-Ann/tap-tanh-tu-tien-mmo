// Test bộ dữ liệu + module GDD mở rộng (MapData/MonsterData/SkillData/NPCData,
// MapManager, FragmentManager, HiddenQuestService)
const fs = require('fs');
const path = require('path');
const { MapManager } = require('./MapManager');
const { FragmentManager } = require('./FragmentManager');
const { HiddenQuestService } = require('./HiddenQuestService');
let pass = 0, fail = 0;
const ok = (c, l) => { if (c) { pass++; console.log('  PASS', l); } else { fail++; console.log('  FAIL', l); } };
const DATA = path.join(__dirname, '..', 'data', 'gdd');
const skillData = JSON.parse(fs.readFileSync(path.join(DATA, 'SkillData.json'), 'utf8'));

console.log('— Dữ liệu —');
ok(skillData.kimDanSkills.length === 140, 'SkillData: 140 công pháp Kim Đan (28 nhóm vũ khí × 5 hệ)');
ok(Object.values(skillData.utilitySkills).reduce((a, v) => a + v.length, 0) === 100, 'SkillData: 100 công pháp đa dụng');
ok(skillData.hiddenSkills.length === 15 && skillData.flawedSets.length === 15 && skillData.forbiddenSkills.length === 15, 'SkillData: 15 ẩn / 15 khiếm khuyết / 15 cấm thuật');

console.log('— MapManager —');
const mm = new MapManager(DATA);
ok(mm.listMaps().length === 52, 'MapData: 52 map (50 mở rộng + 2 hiện có)');
ok(mm.listMaps({ category: 'city' }).length === 10 && mm.listMaps({ category: 'elemental' }).length === 15, '10 thành phố + 15 map Ngũ Hành');
const lk = { realm: 'lk', tier: 1 };
const kd = { realm: 'kd', tier: 1 };
ok(mm.canEnter(lk, 'kim_quang_dong').ok === false && mm.canEnter(lk, 'kim_quang_dong').reason === 'realm_too_low', 'Luyện Khí bị chặn ở map Ngũ Hành (cần Kim Đan)');
ok(mm.canEnter(kd, 'kim_quang_dong').ok === true, 'Kim Đan vào được map Ngũ Hành');
const city = mm.enterMap(lk, 'thanh_van_thanh');
ok(city.ok && city.npcs.length === 200 && city.monsters.length === 0, 'Vào Thanh Vân Thành: 200 NPC, map an toàn không quái');
ok(city.npcs.filter((n) => n.kind === 'functional').length === 50, 'Đúng 50 NPC chính + 150 NPC phụ');
const farm = mm.enterMap(lk, 'bai_farm');
ok(farm.ok && farm.monsters.some((x) => x.id === 'soi_xam' && x.hp === 40 && x.tuViReward === 3), 'Bãi farm có Sói Xám HP 40, Tu vi +3 (số trong thiết kế gốc)');
const kdSkill = skillData.kimDanSkills[0];
ok(kdSkill.coef === 3.0 && kdSkill.cdMs >= 35000 && kdSkill.cdMs <= 50000 && kdSkill.cost >= 150 && kdSkill.cost <= 250 && kdSkill.minRealm === 'kd', 'Công pháp Kim Đan khớp khung game: hệ số 3.0, CD 35-50s, chi phí 150-250, mã realm kd');
ok(mm.getMap('kiem_lo_son_trang').professionName === 'Luyện Khí Sư' && mm.getMap('linh_phu_dien').professionName === 'Phù Sư', 'Tên nghề phụ khớp 5 nghề của game (Luyện Khí Sư / Phù Sư)');
ok(mm.getMap('lang_tan_thu').impl === 'live' && mm.getMap('lang_tan_thu').liveNpcs.length === 3, 'Làng Tân Thủ nối đúng 3 NPC thật đang chạy trong game');
const boss = mm.enterMap(kd, 'vo_tan_hu_khong');
ok(boss.ok && boss.monsters.some((x) => x.id === 'hon_don_thu'), 'Vô Tận Hư Không có boss Hỗn Độn Thú');
ok(boss.monsters.find((x) => x.id === 'hon_don_thu').tuViReward === 577, 'Tu vi boss Kim Đan theo công thức gốc: 75 × 1.12^18 ≈ 577');

console.log('— FragmentManager —');
const fm = new FragmentManager(skillData);
const inv = { manh_dam_lua: 1, manh_dam_bang: 1, linh_thach: 5 };
ok(fm.combinableSets(inv).includes('flawed_bang_hoa_luong_cuc'), 'Đủ 2 mảnh → Băng Hỏa Lưỡng Cực ghép được');
const res = fm.combine_fragments(inv, 'flawed_bang_hoa_luong_cuc');
ok(res.ok && res.skill.name === 'Băng Hỏa Lưỡng Cực', 'combine_fragments() tạo kỹ năng hoàn chỉnh');
ok(inv.manh_dam_lua === undefined && inv.manh_dam_bang === undefined && inv.linh_thach === 5, 'Mảnh lẻ bị xóa khỏi túi, đồ khác còn nguyên');
const res2 = fm.combine_fragments({ manh_dam_lua: 1 }, 'flawed_bang_hoa_luong_cuc');
ok(!res2.ok && res2.missing.includes('manh_dam_bang'), 'Thiếu mảnh → từ chối và báo mảnh thiếu');

console.log('— HiddenQuestService —');
const hq = new HiddenQuestService(skillData);
const p1 = { id: 'player-1', mapId: 'vo_tan_hu_khong', realm: 'kd', tier: 1, inventory: {} };
const trig = hq.check_hidden_quests(p1, { hour: 0 });
ok(trig.some((t) => t.skillId === 'hidden_van_kiem_quy_tong'), 'Ở Vô Tận Hư Không lúc nửa đêm → kích hoạt chuỗi Vạn Kiếm Quy Tông');
ok(hq.check_hidden_quests({ ...p1, id: 'player-x' }, { hour: 12 }).length === 0, 'Giữa trưa cùng map → không kích hoạt');
ok(hq.claim('hidden_van_kiem_quy_tong', 'player-1').ok === true, 'player-1 nhận quyền sở hữu');
const c2 = hq.claim('hidden_van_kiem_quy_tong', 'player-2');
ok(!c2.ok && c2.reason === 'already_claimed' && c2.claimedBy === 'player-1', 'player-2 bị từ chối: công pháp ẩn chỉ 1 chủ');
ok(hq.check_hidden_quests({ id: 'player-2', mapId: 'vo_tan_hu_khong', realm: 'kd', tier: 1, inventory: {} }, { hour: 0 })
  .every((t) => t.skillId !== 'hidden_van_kiem_quy_tong'), 'Đã có chủ → không kích hoạt chuỗi cho người khác nữa');
ok(hq.transfer('hidden_van_kiem_quy_tong', 'player-1', 'player-2').ok, 'Truyền thừa lần 1 OK');
ok(hq.transfer('hidden_van_kiem_quy_tong', 'player-1', 'player-3', 95).powerPct === 80, 'Truyền thừa lần 2: sức mạnh kẹp ở 80% (trần tài liệu)');
ok(hq.transfer('hidden_van_kiem_quy_tong', 'player-1', 'player-4').ok === false, 'Truyền thừa lần 3 bị chặn (tối đa 2 người)');

console.log(`\nKẾT QUẢ: ${pass} PASS / ${fail} FAIL`);
process.exit(fail ? 1 : 0);
