// GĐ138 — THÀNH TỰU CHUNG (theo tài liệu thiết kế bản -2, phần "Thành tựu chung",
// thêm 27/10/2026, không thuộc bản chơi thử đầu).
// 109 loại / 11 nhóm, mỗi loại 3–10 bậc. Mỗi bậc thưởng: 1 danh hiệu (Tên gốc · Cấp)
// + 1 Rương Thành Tựu + Đạo Tích (bậc 1–3: 1, 4–6: 2, 7–9: 3, bậc 10: 4).
// Tổng Đạo Tích các def ĐANG BẬT = 799; 12 def đang tắt (enabled: false).
// (GĐ364/B1-10: số cũ "100 loại / 816" là của bản thiết kế gốc — đã rà lại bằng
// script đếm thật trên ACH138 sau các đợt GĐ306/GĐ360/GĐ362 hạ thang bậc.)
// Defs có enabled: false = hệ đo tương ứng chưa có trong MMO (thư viện sách,
// Tường Đá/Trận Bão, độ thân thiết pet...) — giữ đủ dữ liệu, ẩn khỏi panel, mở
// dần khi hệ đó ra. (Vườn thảo GĐ308, thú cưỡi, luân hồi GĐ314–317 đã có —
// def/perk tương ứng đã bật/nối dần; perk vườn thảo nối thật ở GĐ348.)
// progress đo bằng key: hàm progressFor() trong server/index.js ánh xạ key → số liệu thật.
const TITLE_LEVELS = [
  { name: 'Tập Sự', color: '#e8e8e8', chest: 'dong' },
  { name: 'Sơ Thành', color: '#7ed957', chest: 'dong' },
  { name: 'Tiểu Thành', color: '#6db3f2', chest: 'bac' },
  { name: 'Đại Thành', color: '#b678f0', chest: 'bac' },
  { name: 'Tinh Thông', color: '#9b30ff', chest: 'vang' },
  { name: 'Xuất Chúng', color: '#ffd94d', chest: 'vang' },
  { name: 'Tuyệt Thế', color: '#ff9d4d', chest: 'ngoc' },
  { name: 'Siêu Phàm', color: '#ffe9a8', chest: 'ngoc' },
  { name: 'Chí Tôn', color: '#fff3c4', chest: 'thien' },
  { name: 'Vô Thượng', color: '#ffd94d', chest: 'thien' },
];
function titleLevelFor(nTiers, tier) {
  if (tier <= 1) return 1;
  if (tier >= nTiers) return 10;
  return 1 + Math.round(((tier - 1) * 9) / (nTiers - 1));
}
function daoTichForTier(tier) {
  if (tier <= 3) return 1;
  if (tier <= 6) return 2;
  if (tier <= 9) return 3;
  return 4;
}
function chestGradeForLevel(level) { return TITLE_LEVELS[level - 1].chest; }
function titleText(base, level) { return `${base} · ${TITLE_LEVELS[level - 1].name}`; }
const CHEST_ITEM = {
  dong: 'ruong_thanh_tuu_dong', bac: 'ruong_thanh_tuu_bac', vang: 'ruong_thanh_tuu_vang',
  ngoc: 'ruong_thanh_tuu_ngoc', thien: 'ruong_thanh_tuu_thien',
};
const CHEST_NAME = {
  dong: 'Rương Thành Tựu Đồng', bac: 'Rương Thành Tựu Bạc', vang: 'Rương Thành Tựu Vàng',
  ngoc: 'Rương Thành Tựu Ngọc', thien: 'Rương Thành Tựu Thiên',
};
// GĐ119: thứ hạng phẩm trang bị (để tính "phẩm cao" cho thành tựu Trang bị: từ TIM trở lên).
const GEAR_RARITY_RANK = { TRANG: 0, XAM: 1, LUC: 2, LAM: 3, TIM: 4, CAM: 5, DO: 6, DEN: 7, VO: 8 };
const GROUP_NAMES = {
  tu_luyen: 'Tu luyện', chien_dau: 'Chiến đấu', cong_phap: 'Công pháp', nghe_phu: 'Nghề phụ',
  kham_pha: 'Khám phá', quai_trum: 'Quái và trùm', sinh_ton: 'Sinh tồn và thời gian',
  cua_cai: 'Của cải', nhan_duyen: 'Nhân duyên', linh_thu: 'Linh thú, thảo, đan', an: 'Ẩn',
};
// Mỗi def: id, group, name, desc, base (danh hiệu gốc), tiers (mốc từng bậc),
// key (khóa số liệu cho progressFor), hidden (nhóm Ẩn: hiện ??? tới khi đạt bậc 1),
// enabled (false = chưa có hệ đo, ẩn khỏi panel).
const ACH138 = [
  // Nhóm Tu luyện (10)
  { id: 'ach_tl_break', group: 'tu_luyen', name: 'Bước vào đạo', desc: 'Số lần đột phá thành công (mọi cảnh giới)', base: 'Người Đạo Tâm', tiers: [1, 5, 10, 20, 37], key: 'breakthroughs' },
  { id: 'ach_tl_realm', group: 'tu_luyen', name: 'Ngàn dặm khởi đầu', desc: 'Cảnh giới cao nhất từng đạt (1 Luyện Khí, 2 Trúc Cơ, 3 Kim Đan, 4 Nguyên Anh, 5 Hóa Thần, 6 Phản Hư, 7 Độ Kiếp, 8 Tiên Nhân/Địa Tiên)', base: 'Nguyên Anh Chân Nhân', tiers: [1, 2, 3, 4, 5, 6, 7, 8], key: 'realmMax' }, // GĐ216: + bậc Hóa Thần + Phản Hư; GĐ231: + Độ Kiếp (7) + Tiên Nhân/Địa Tiên (8)
  { id: 'ach_tl_phaptuong', group: 'tu_luyen', name: 'Pháp Tướng chân thân', desc: 'Giai đoạn Pháp Tướng cao nhất từng đạt (5 Viên Mãn, 9 Chân Ảnh)', base: 'Chân Thân Bán Thần', tiers: [1, 3, 5, 7, 9], key: 'ptStage' }, // GĐ216
  { id: 'ach_tl_bequan', group: 'tu_luyen', name: 'Bế quan khổ tu', desc: 'Tổng số ngày game bế quan', base: 'Khổ Tu Sĩ', tiers: [30, 100, 365, 1000, 3000, 10000, 20000, 40000], key: 'bequanDays' },
  { id: 'ach_tl_firstbreak', group: 'tu_luyen', name: 'Một hơi vào đạo', desc: 'Đột phá thành công ngay lần đầu, cộng dồn số lần', base: 'Thiên Tư', tiers: [1, 3, 5, 10, 20], key: 'firstBreaks' },
  { id: 'ach_tl_hardbreak', group: 'tu_luyen', name: 'Gió ngược dòng', desc: 'Đột phá thành công sau khi đã thất bại từ 3 lần trở lên', base: 'Bách Chiết', tiers: [1, 3, 5], key: 'hardBreaks' },
  { id: 'ach_tl_tuvi', group: 'tu_luyen', name: 'Tu vi dồn tích', desc: 'Tổng tu vi đã tích lũy qua mọi kiếp (đơn vị: nghìn)', base: 'Tu Vi Vô Lượng', tiers: [1, 10, 50, 200, 1000, 5000, 20000, 50000, 100000, 200000], key: 'tuviK' },
  { id: 'ach_tl_young', group: 'tu_luyen', name: 'Phá cảnh thần tốc', desc: 'Số cảnh giới đột phá khi tuổi nhân vật còn dưới 40', base: 'Thiếu Niên Thiên Tài', tiers: [1, 2, 3, 4], key: 'youngBreaks' },
  { id: 'ach_tl_age', group: 'tu_luyen', name: 'Trường sinh', desc: 'Tuổi cao nhất nhân vật từng đạt', base: 'Trường Sinh Giả', tiers: [60, 100, 150, 250, 400, 700], key: 'ageMax' },
  { id: 'ach_tl_tier9', group: 'tu_luyen', name: 'Luyện đủ tầng', desc: 'Số cảnh giới từng đạt đủ chín tầng', base: 'Cửu Tầng Viên Mãn', tiers: [1, 2, 3, 4], key: 'tier9Realms' },
  { id: 'ach_tl_support', group: 'tu_luyen', name: 'Hoàn thiện đạo thể', desc: 'Số loại công pháp bổ trợ tu luyện đã nhập môn (tâm pháp, thể thuật, thần thức)', base: 'Đạo Thể Hoàn Mỹ', tiers: [1, 3, 5, 8], key: 'supportSkills', enabled: false },
  // Nhóm Chiến đấu (12)
  { id: 'ach_cd_kills', group: 'chien_dau', name: 'Máu nhuộm đường tu', desc: 'Tổng số quái đã hạ', base: 'Sát Tinh', tiers: [10, 100, 500, 2000, 10000, 50000, 200000, 500000, 1000000, 2000000], key: 'kills' },
  { id: 'ach_cd_solo', group: 'chien_dau', name: 'Đơn thương độc mã', desc: 'Số trận hạ trùm khi chỉ có một mình', base: 'Độc Hành Giả', tiers: [1, 3, 10, 25, 60], key: 'soloBoss' },
  { id: 'ach_cd_dmg', group: 'chien_dau', name: 'Tổng sát thương', desc: 'Tổng sát thương đã gây (đơn vị: nghìn)', base: 'Lực Phá Sơn Hà', tiers: [10, 100, 1000, 10000, 100000, 500000, 2000000, 10000000], key: 'dmgK' },
  { id: 'ach_cd_crit', group: 'chien_dau', name: 'Chiêu chí mạng', desc: 'Số lần ra đòn chí mạng', base: 'Nhãn Thần', tiers: [50, 500, 3000, 15000, 60000, 200000, 500000, 1000000], key: 'crits' },
  { id: 'ach_cd_maxhit', group: 'chien_dau', name: 'Chiêu mạnh nhất', desc: 'Sát thương cao nhất trong một đòn', base: 'Một Kiếm Phá Thiên', tiers: [500, 2000, 10000, 50000, 200000, 1000000], key: 'maxHit' },
  { id: 'ach_cd_dodge', group: 'chien_dau', name: 'Né như gió', desc: 'Số lần né chiêu thành công (Né/Lướt hoặc tránh vùng cảnh báo)', base: 'Bất Dính Thân', tiers: [20, 200, 1000, 5000, 25000, 100000, 250000], key: 'dodges' },
  { id: 'ach_cd_nohit', group: 'chien_dau', name: 'Không dính đòn', desc: 'Hạ một trùm mà không bị trúng đòn nào', base: 'Vạn Pháp Bất Xâm', tiers: [1, 3, 7, 15, 30, 60, 120], key: 'nohitBoss' },
  { id: 'ach_cd_combo', group: 'chien_dau', name: 'Đánh liên hoàn', desc: 'Chuỗi đòn trúng liên tục cao nhất không gián đoạn', base: 'Liên Hoàn Vô Cực', tiers: [10, 25, 50, 100, 250], key: 'maxCombo' },
  { id: 'ach_cd_lowkill', group: 'chien_dau', name: 'Phản kích', desc: 'Số lần sống sót khi dưới 10% máu rồi hạ được mục tiêu', base: 'Tuyệt Cảnh Phản Kích', tiers: [1, 5, 15, 40], key: 'lowKills' },
  { id: 'ach_cd_highrealm', group: 'chien_dau', name: 'Hạ thượng cảnh', desc: 'Số quái hoặc kẻ địch có cảnh giới cao hơn mình đã hạ', base: 'Nghịch Thiên', tiers: [1, 5, 20, 60, 150], key: 'highRealmKills' },
  { id: 'ach_cd_godkill', group: 'chien_dau', name: 'Dùng cả thần thông', desc: 'Số lần dùng thần thông và hạ mục tiêu trong một trận', base: 'Thần Thông Quảng Đại', tiers: [5, 50, 300, 1500], key: 'godKills' },
  { id: 'ach_cd_fullhp', group: 'chien_dau', name: 'Chiến thắng vô thương', desc: 'Số trận kết thúc khi còn đủ trên 90% máu', base: 'Bất Bại Thân', tiers: [10, 50, 200, 800], key: 'fullHpKills' },
  // Nhóm Công pháp (8)
  { id: 'ach_cp_learned', group: 'cong_phap', name: 'Học rộng', desc: 'Số công pháp đã học', base: 'Bách Gia Tinh Thông', tiers: [3, 8, 14, 20, 26, 32, 38, 44, 50], key: 'skillsLearned' }, // GĐ362: hạ thang theo trần thật — thang cũ tới 600 là không đạt nổi. Trần đếm được của 1 nhân vật (set ach_skills): catalog vũ khí gốc 26 (Pháp tu 56–57) + catalog bản viên mãn vào được set 14/16 (2 chiêu cơ bản VM tự trao không qua achSet) + chiêu lớp bản cũ 2 (LK+TC) + thần thông lớp KD 1 + NA 1 + tuyệt kỹ VM 1 + tuyệt kỹ Hồn 1 + chiêu tông của tông mình 10–30 → trần bảo thủ lớp thường = 56, Pháp tu = 87. Bậc cao nhất 50 ≈ 89% trần thấp nhất: mọi lớp đều với tới được nhưng phải học gần như tất cả.
  { id: 'ach_cp_maxed', group: 'cong_phap', name: 'Luyện đến cùng', desc: 'Số công pháp đã luyện đến cấp tối đa', base: 'Chiêu Thức Đại Sư', tiers: [1, 3, 8, 20, 40], key: 'skillsMaxed' },
  { id: 'ach_cp_fusion', group: 'cong_phap', name: 'Dung hợp công pháp', desc: 'Số lần dung hợp thành công', base: 'Sáng Pháp Giả', tiers: [1, 3, 10, 25, 60], key: 'fusions' },
  { id: 'ach_cp_godskills', group: 'cong_phap', name: 'Thần thông đầu tiên', desc: 'Số thần thông đã lĩnh ngộ', base: 'Thần Thông Giả', tiers: [1], key: 'godSkills' }, // GĐ139: 1 char chỉ lĩnh ngộ được đúng 1 thần thông (của lớp mình) — bậc 3/6/9 cũ không bao giờ tới được,
  { id: 'ach_cp_weapons', group: 'cong_phap', name: 'Đủ bộ vũ khí', desc: 'Số loại vũ khí đã dùng đến cấp luyện thuần thục', base: 'Bách Binh', tiers: [1, 3, 5, 8, 12, 16], key: 'weaponsMastered', enabled: false }, // GĐ139: nới 4→6 bậc (+4 Đạo Tích) để tổng nhóm Công pháp khớp tài liệu (59) sau khi godskills về 1 bậc
  { id: 'ach_cp_paths', group: 'cong_phap', name: 'Đạo riêng', desc: 'Số mốc cơ chế riêng của hướng tu đã mở', base: 'Đạo Thống', tiers: [4, 8, 12, 16], key: 'pathMilestones', enabled: false },
  { id: 'ach_cp_xuatkhieu', group: 'cong_phap', name: 'Xuất khiếu', desc: 'Số lần xuất khiếu (Nguyên Anh) thành công', base: 'Nguyên Thần Du Hành', tiers: [1, 5, 20, 60], key: 'xuatKhieu' },
  { id: 'ach_cp_directions', group: 'cong_phap', name: 'Trải qua mọi hướng', desc: 'Số hướng tu đã từng chơi đến Trúc Cơ trở lên', base: 'Vạn Đạo Quy Nhất', tiers: [1, 3, 5, 7, 9], key: 'directions', enabled: true }, // GĐ139: TẠM ẨN — cần hệ đa nhân vật/đa hướng (1 tài khoản hiện chỉ 1 char),
  // Nhóm Nghề phụ (10)
  { id: 'ach_np_dan', group: 'nghe_phu', name: 'Luyện đan sư', desc: 'Số viên đan đã luyện thành công', base: 'Đan Sư', tiers: [10, 100, 500, 2000, 10000, 30000, 100000, 300000], key: 'danCrafts' },
  { id: 'ach_np_danpham', group: 'nghe_phu', name: 'Đan phẩm', desc: 'Số viên đan phẩm cao (từ Thượng phẩm) đã luyện', base: 'Đan Thánh', tiers: [1, 10, 50, 200], key: 'highPills', enabled: false },
  { id: 'ach_np_gear', group: 'nghe_phu', name: 'Luyện khí sư', desc: 'Số món pháp khí đã rèn', base: 'Khí Sư', tiers: [5, 30, 150, 600, 2500], key: 'gearForged' },
  { id: 'ach_np_array', group: 'nghe_phu', name: 'Trận pháp sư', desc: 'Số trận bàn đã chế và dùng', base: 'Trận Pháp Đại Sư', tiers: [3, 20, 100, 400], key: 'arraysPlaced' },
  { id: 'ach_np_cook', group: 'nghe_phu', name: 'Linh thực', desc: 'Số món linh thực đã nấu', base: 'Thực Thần', tiers: [10, 80, 400, 1500, 6000, 20000, 50000], key: 'cooks' },
  { id: 'ach_np_herb', group: 'nghe_phu', name: 'Làm vườn linh điền', desc: 'Số lần thu hoạch linh thảo', base: 'Điền Chủ', tiers: [10, 100, 500, 2000, 8000, 30000, 100000], key: 'herbGathers' },
  { id: 'ach_np_ore', group: 'nghe_phu', name: 'Khai khoáng', desc: 'Số mỏ hoặc mạch quặng đã đào', base: 'Quặng Vương', tiers: [10, 100, 500, 2000], key: 'oreGathers' },
  { id: 'ach_np_toprank', group: 'nghe_phu', name: 'Cấp nghề', desc: 'Số nghề phụ đã đạt cấp cao nhất', base: 'Bách Nghệ', tiers: [1, 2, 3], key: 'topRanks' }, // GĐ306: BẬT — đa nghề đã có từ GĐ142/160; progressFor đếm số nghề đạt cấp 14 (trần theo JOB_RANK_CRAFTS) · GĐ362: bỏ bậc 5/7 — nhân vật chỉ có đúng 3 ô nghề (job/job2/job3) nên trần đếm được là 3; thang cũ [1,2,3,5,7] có 2 bậc chết
  { id: 'ach_np_profstones', group: 'nghe_phu', name: 'Kiếm sống bằng nghề', desc: 'Linh thạch kiếm được từ bán sản phẩm nghề phụ (đơn vị: hạ phẩm)', base: 'Phú Thương', tiers: [1000, 10000, 100000, 1000000, 10000000, 100000000, 1000000000], key: 'profStones' },
  { id: 'ach_np_failthen', group: 'nghe_phu', name: 'Thất bại là mẹ', desc: 'Số lần chế tạo thất bại rồi chế lại thành công ngay', base: 'Bất Khuất Tượng Nhân', tiers: [3, 20, 100, 400], key: 'failThenSuccess' },
  // Nhóm Khám phá (10)
  { id: 'ach_kp_maps', group: 'kham_pha', name: 'Dấu chân', desc: 'Số khu vực bản đồ đã khám phá', base: 'Du Lịch Giả', tiers: [3, 8, 15, 30, 45, 60, 73, 100, 140, 200], key: 'mapsVisited' }, // GĐ216: thế giới nay 200 map (GĐ139: 74 map)
  { id: 'ach_kp_phmaps', group: 'kham_pha', name: 'Chân đạp hư không', desc: 'Số bản đồ cõi Phản Hư đã đặt chân tới', base: 'Hư Không Hành Giả', tiers: [1, 5, 15, 27], key: 'phMaps' }, // GĐ216; GĐ379: bậc cuối 30 → 27 (90% trần 30 map PH, theo luật bậc cao nhất ≈ 90% — Bảo chốt 10/11)
  { id: 'ach_kp_dist', group: 'kham_pha', name: 'Quãng đường', desc: 'Tổng quãng đường đã đi (đơn vị: km trong game)', base: 'Vạn Lý Hành', tiers: [10, 100, 500, 2000, 10000, 30000, 80000, 200000], key: 'distKm' },
  { id: 'ach_kp_dungeon', group: 'kham_pha', name: 'Bí cảnh', desc: 'Số lần hạ trùm ở Cửu U Bí Cảnh và vùng trùm Thạch Lâm', base: 'Bí Cảnh Chinh Phục', tiers: [1, 3, 6, 12, 25], key: 'dungeons' }, // GĐ362: sửa CHỮ cho khớp cách đếm thật (counter ach_dungeons chỉ tăng khi hạ trùm ở map cuu_u_bi_canh hoặc vùng REALM Thạch Lâm của map nhà) — KHÔNG đổi bộ đếm; mô tả cũ "số bí cảnh đã vào và hoàn thành" hứa hẹn sai thứ được đếm
  { id: 'ach_kp_hiddenchest', group: 'kham_pha', name: 'Tìm kho báu', desc: 'Số rương ẩn tìm thấy', base: 'Thợ Săn Kho Báu', tiers: [1, 5, 15, 40, 100], key: 'hiddenChests' }, // GĐ309: BẬT — hệ tương ứng đã có
  { id: 'ach_kp_secrets', group: 'kham_pha', name: 'Mọi ngóc ngách', desc: 'Số điểm bí mật trên bản đồ đã tìm ra', base: 'Người Biết Hết', tiers: [1, 5, 15, 40], key: 'secretPoints' }, // GĐ306: BẬT — điểm bí mật = điểm manh mối ẩn GĐ127/198 (27 điểm), progressFor đếm cờ đã tìm trong flags · GĐ358: + 15 điểm bí mật thuần -> tổng đếm được 42, bậc 40 KHẢ THI (trước GĐ358 trần 27 < 40)
  { id: 'ach_kp_chests', group: 'kham_pha', name: 'Mở rương', desc: 'Số rương đã mở (cấp C, B, A cộng dồn)', base: 'Rương Tinh', tiers: [10, 100, 500, 2000, 8000, 20000, 50000, 100000], key: 'chests' },
  { id: 'ach_kp_chestA', group: 'kham_pha', name: 'Rương cấp cao', desc: 'Số rương cấp A đã mở', base: 'Phúc Tinh', tiers: [1, 10, 40, 150, 500, 1500], key: 'chestsA' },
  { id: 'ach_kp_wall', group: 'kham_pha', name: 'Vượt tường đá', desc: 'Số lần vượt Tường Đá thành công', base: 'Thạch Môn Phá', tiers: [1, 10, 50, 200], key: 'wallCross', enabled: false },
  { id: 'ach_kp_storm', group: 'kham_pha', name: 'Qua bão', desc: 'Số lần vượt Trận Bão thành công', base: 'Phong Bạo Hành Giả', tiers: [1, 10, 50, 200], key: 'stormCross', enabled: false },
  { id: 'ach_kp_themes', group: 'kham_pha', name: 'Xuyên mọi khí hậu', desc: 'Số loại địa hình đã đi qua', base: 'Thiên Hạ Hành', tiers: [2, 4, 6, 8], key: 'themesVisited' },
  // Nhóm Quái và trùm (10)
  { id: 'ach_qt_boss', group: 'quai_trum', name: 'Thợ săn trùm', desc: 'Số trùm đã hạ (mọi loại)', base: 'Trùm Sát Thủ', tiers: [1, 3, 10, 25, 60, 150, 300, 600, 1000, 2000], key: 'bossKills' },
  { id: 'ach_qt_species', group: 'quai_trum', name: 'Từng loại quái', desc: 'Số loại quái khác nhau đã hạ ít nhất một lần', base: 'Bách Quái Đồ', tiers: [10, 35, 80, 130, 180], key: 'speciesKilled' }, // GĐ139: thang cũ tính theo 22 loài · GĐ362: đặt lại theo tổng loài thật hiện nay = 201 (MonsterData 201 mục, 6 alias về loài cứng → 201 kind phân biệt); bậc cao nhất 180 ≈ 90% tổng loài (TẠM — đích dài hơi xuyên mọi cõi). Người đã nhận bậc theo thang cũ giữ nguyên claimed/danh hiệu/Đạo Tích đã nhận (claimed lưu riêng, không tính lại)
  { id: 'ach_qt_elite', group: 'quai_trum', name: 'Tinh anh', desc: 'Số quái tinh anh đã hạ', base: 'Tinh Anh Chiến Sĩ', tiers: [5, 30, 150, 600, 2500, 8000, 20000, 50000], key: 'eliteKills' },
  { id: 'ach_qt_bounty', group: 'quai_trum', name: 'Mục Tiêu truy nã', desc: 'Số quái Mục Tiêu (truy nã) đã hạ', base: 'Thợ Săn Tiền Thưởng', tiers: [1, 5, 20, 60, 150], key: 'bountyKills' },
  { id: 'ach_qt_rare', group: 'quai_trum', name: 'Quái hiếm', desc: 'Số quái hiếm hoặc biến dị đã hạ', base: 'Kỳ Thú Săn Giả', tiers: [1, 5, 20, 60], key: 'rareKills' }, // GĐ309: BẬT — hệ tương ứng đã có
  { id: 'ach_qt_oneshot', group: 'quai_trum', name: 'Một chiêu hạ gục', desc: 'Số trùm hạ chỉ bằng một chiêu hoặc chuỗi thần thông ngắn (≤3 đòn)', base: 'Nhất Kích Tất Sát', tiers: [1, 3, 10, 25], key: 'oneShotBoss' },
  { id: 'ach_qt_speed', group: 'quai_trum', name: 'Trùm nhanh', desc: 'Hạ trùm trong ít hơn số giây cho trước (mốc giảm dần: 120, 90, 60, 40, 25)', base: 'Tốc Chiến', tiers: [1, 2, 3, 4, 5], key: 'speedKills' },
  { id: 'ach_qt_save', group: 'quai_trum', name: 'Bảo vệ đồng đội', desc: 'Số lần chắn đòn hoặc hồi máu cứu đồng đội', base: 'Hộ Pháp', tiers: [10, 100, 500, 2000], key: 'teammateSaves' },
  { id: 'ach_qt_kd', group: 'quai_trum', name: 'Đối thủ cảnh giới Kim Đan', desc: 'Số quái Kim Đan đã hạ', base: 'Kim Đan Sát', tiers: [10, 100, 500, 2000, 5000, 10000], key: 'kdKills' },
  { id: 'ach_qt_na', group: 'quai_trum', name: 'Đối thủ cảnh giới Nguyên Anh', desc: 'Số quái Nguyên Anh đã hạ', base: 'Nguyên Anh Sát', tiers: [5, 50, 300, 1000, 3000, 8000], key: 'naKills' },
  // Nhóm Sinh tồn và thời gian (8)
  { id: 'ach_st_hunger', group: 'sinh_ton', name: 'Đói khát', desc: 'Số lần vượt qua trạng thái sắp Kiệt sức rồi hồi phục', base: 'Sinh Tồn Giả', tiers: [3, 20, 100, 400], key: 'hungerRecovers' },
  { id: 'ach_st_lives', group: 'sinh_ton', name: 'Sống sót', desc: 'Số kiếp đã sống đến hết tuổi thọ (không chết bất đắc kỳ tử)', base: 'Thọ Chung Chính Tẩm', tiers: [1, 3, 5, 10, 20], key: 'fullLives', enabled: true },
  { id: 'ach_st_revive', group: 'sinh_ton', name: 'Hồi sinh', desc: 'Số lần hồi sinh sau khi bị hạ', base: 'Cửu Tử Nhất Sinh', tiers: [5, 30, 150, 600], key: 'revives' },
  { id: 'ach_st_nodeath', group: 'sinh_ton', name: 'Không chết', desc: 'Số ngày game liên tục không bị hạ gục (kỷ lục cao nhất)', base: 'Bất Tử Thân', tiers: [30, 100, 365, 1000, 3000, 10000, 30000], key: 'noDeathMax' },
  { id: 'ach_st_meals', group: 'sinh_ton', name: 'Ăn uống đúng bữa', desc: 'Số bữa ăn đúng giờ (thanh Thức ăn và Nước uống luôn trên 30%)', base: 'Tịch Cốc Hạnh Phúc', tiers: [30, 300, 2000, 10000], key: 'meals' },
  { id: 'ach_st_trap', group: 'sinh_ton', name: 'Chết oan', desc: 'Số lần chết do rơi vào bẫy hoặc môi trường (hài hước)', base: 'Đại Hiệp Chết Oan', tiers: [1, 5, 15], key: 'trapDeaths' }, // GĐ306: BẬT — hitPlayer đếm lần gục bởi 'hố lửa' (nguồn sát thương môi trường duy nhất)
  { id: 'ach_st_lifespan', group: 'sinh_ton', name: 'Tuổi thọ mở rộng', desc: 'Tổng tuổi thọ nhận thêm nhờ đột phá và đan dược', base: 'Thọ Tỉ Nam Sơn', tiers: [20, 100, 300, 800, 2000, 5000, 12000], key: 'lifespanBonus' },
  { id: 'ach_st_playtime', group: 'sinh_ton', name: 'Thời gian thật', desc: 'Tổng thời gian thật đã chơi (giờ)', base: 'Tu Sĩ Chân Chính', tiers: [1, 10, 50, 200, 500, 1000, 2000, 3500, 5000, 8000], key: 'playHours' },
  // Nhóm Của cải (8)
  { id: 'ach_cc_earned', group: 'cua_cai', name: 'Phú ông', desc: 'Tổng Linh thạch đã kiếm (quy ra hạ phẩm)', base: 'Linh Thạch Chi Vương', tiers: [1000, 10000, 100000, 1000000, 10000000, 100000000, 500000000, 2000000000, 10000000000, 50000000000], key: 'stonesEarned' },
  { id: 'ach_cc_spent', group: 'cua_cai', name: 'Tiêu xài', desc: 'Tổng Linh thạch đã tiêu (quy ra hạ phẩm)', base: 'Hào Phóng', tiers: [1000, 10000, 100000, 1000000, 10000000, 100000000, 1000000000, 5000000000], key: 'stonesSpent' },
  { id: 'ach_cc_cuc', group: 'cua_cai', name: 'Cực phẩm', desc: 'Số viên Linh thạch cực phẩm đang giữ cùng lúc', base: 'Cực Phẩm Chủ', tiers: [1, 5, 20, 100], key: 'cucHeld' },
  { id: 'ach_cc_trades', group: 'cua_cai', name: 'Mua bán', desc: 'Số giao dịch với NPC thương nhân', base: 'Thương Nhân', tiers: [10, 100, 500, 2500, 10000, 30000, 100000], key: 'trades' },
  { id: 'ach_cc_items', group: 'cua_cai', name: 'Túi đồ đầy', desc: 'Số loại vật phẩm khác nhau đã từng sở hữu', base: 'Sưu Tầm Gia', tiers: [5, 10, 15, 20, 25, 30, 32], key: 'itemsOwned' }, // GĐ139: 55 id vật phẩm nhưng char không nghề chỉ sở hữu được 32 loại (rơi/shop/rương/quest — còn lại là đồ nghề/lớp khác chế),
  { id: 'ach_cc_gear', group: 'cua_cai', name: 'Trang bị', desc: 'Số món trang bị phẩm cao đã sở hữu (từ Tiên phẩm trở lên)', base: 'Bảo Khí Chủ', tiers: [1, 5, 15, 40], key: 'gearHigh' },
  { id: 'ach_cc_carry', group: 'cua_cai', name: 'Chuyển kiếp giàu', desc: 'Số lần mang vật phẩm sang kiếp sau', base: 'Truyền Thừa Giả', tiers: [1, 3, 7, 12, 20], key: 'carryItems', enabled: true },
  { id: 'ach_cc_budget', group: 'cua_cai', name: 'Tiết kiệm', desc: 'Số lần hoàn thành mục tiêu mà không tiêu quá số Linh thạch đặt trước', base: 'Cần Kiệm', tiers: [1, 5, 20, 60], key: 'budgetGoals', enabled: false },
  // Nhóm Nhân duyên (10)
  { id: 'ach_nd_met', group: 'nhan_duyen', name: 'Quen biết', desc: 'Số NPC có tên đã làm quen', base: 'Giao Du Rộng', tiers: [3, 10, 25, 50, 100, 200, 400], key: 'npcsMet' },
  { id: 'ach_nd_maxaff', group: 'nhan_duyen', name: 'Thân thiết', desc: 'Số NPC đạt độ thiện cảm tối đa', base: 'Tri Kỷ', tiers: [1, 3, 8, 20], key: 'maxAffinity' },
  { id: 'ach_nd_quests', group: 'nhan_duyen', name: 'Nhiệm vụ', desc: 'Số nhiệm vụ đã hoàn thành', base: 'Nhiệm Vụ Vương', tiers: [5, 25, 100, 300, 500, 700, 850, 950, 1000, 1040], key: 'questsDone' }, // GĐ139: mốc trần theo tổng nhiệm vụ thời điểm đó — GĐ364/B1-10 rà lại: game nay có 1.328 nhiệm vụ (38 inline + 1.290 trong file data), bậc 1.040 vẫn khả thi, giữ nguyên thang.
  { id: 'ach_nd_fate', group: 'nhan_duyen', name: 'Nhiệm vụ ẩn', desc: 'Số nhiệm vụ ẩn đã hoàn thành', base: 'Phúc Duyên Thâm Hậu', tiers: [1, 5, 15, 40], key: 'hiddenQuests' }, // GĐ362: đổi tên/mô tả cho khớp thứ được đếm (counter ach_hiddenQuests = nhiệm vụ ẩn hoàn thành) — chữ "sự kiện cơ duyên" cũ là di sản bản thảo tiền-GĐ35, dễ làm người chơi tưởng game có sự kiện cơ duyên để gặp; "cơ duyên" theo nghĩa hiện hành (GĐ347) là kênh roll thêm món hiếm, không nuôi counter này
  { id: 'ach_nd_rival', group: 'nhan_duyen', name: 'Hóa giải ân oán', desc: 'Số mối thù đã hóa giải hoặc trả', base: 'Ân Oán Phân Minh', tiers: [1, 5, 15, 40], key: 'rivalWins' },
  { id: 'ach_nd_merit', group: 'nhan_duyen', name: 'Tông môn', desc: 'Số điểm cống hiến tông môn (nghìn)', base: 'Trụ Cột Tông Môn', tiers: [1, 10, 50, 200, 1000], key: 'meritK' },
  { id: 'ach_nd_disciple', group: 'nhan_duyen', name: 'Đệ tử', desc: 'Số đệ tử đã nhận hoặc dạy thành tài', base: 'Danh Sư', tiers: [1, 3, 10, 30], key: 'disciples', enabled: true },
  { id: 'ach_nd_master', group: 'nhan_duyen', name: 'Bái sư', desc: 'Số vị sư phụ hoặc tiền bối đã nhận chỉ điểm', base: 'Sư Đồ Thâm Tình', tiers: [1, 2, 3], key: 'masters' }, // GĐ306: BẬT — mỗi nghề một sư phụ (tối đa 3 vị từ GĐ142/160); progressFor đếm số nghề đã bái sư · GĐ362: bỏ bậc 6/12 — trần đếm được là 3 (đúng 3 ô nghề), thang cũ có 2 bậc chết
  { id: 'ach_nd_sworn', group: 'nhan_duyen', name: 'Kết bạn', desc: 'Số bạn hữu NPC đã kết nghĩa', base: 'Hào Kiệt', tiers: [1, 3, 8, 20], key: 'swornFriends', enabled: false },
  { id: 'ach_nd_help', group: 'nhan_duyen', name: 'Mời lên cảnh', desc: 'Số lần NPC giúp bạn đột phá cảnh giới khó (cảnh cao thất bại nhiều lần)', base: 'Quý Nhân Phù Trợ', tiers: [1, 3, 6, 12], key: 'npcBreakHelp', enabled: false },
  // Nhóm Linh thú, thảo, đan (8)
  { id: 'ach_lt_tame', group: 'linh_thu', name: 'Thuần thú', desc: 'Số linh thú đã thuần phục', base: 'Thú Sư', tiers: [1, 3, 8, 20, 50], key: 'tames' },
  { id: 'ach_lt_mount', group: 'linh_thu', name: 'Thú cưỡi', desc: 'Số loại thú cưỡi đã sở hữu', base: 'Kỵ Sĩ Vạn Thú', tiers: [1, 3, 6, 10], key: 'mounts', enabled: true }, // GĐ161: đã nối — GĐ364/B1-10 rà lại: MOUNT_SPECIES nay có 16 loài nên mốc 10 đã khả thi từ lâu.
  { id: 'ach_lt_evolve', group: 'linh_thu', name: 'Thú tiến hóa', desc: 'Số lần linh thú tiến hóa', base: 'Thú Hóa Tông Sư', tiers: [1, 5, 15, 40], key: 'petEvolves' }, // GĐ307: BẬT — hệ tiến hóa linh thú đã có (GĐ307)
  { id: 'ach_lt_herbtypes', group: 'linh_thu', name: 'Linh thảo quý', desc: 'Số loại linh thảo đã trồng thành công', base: 'Bách Thảo', tiers: [3, 5, 8, 10], key: 'herbTypesGrown' }, // GĐ308: BẬT — vườn thảo dược đã có · GĐ362: hạ thang theo trần thật — GARDEN_HERBS chỉ có 10 loại trồng được, thang cũ [3,10,20,40] có 2 bậc chết; bậc cao nhất 10 = trồng đủ mọi loại thảo
  { id: 'ach_lt_herb5', group: 'linh_thu', name: 'Linh thảo cấp 5', desc: 'Số cây linh thảo cấp 5 đã thu hoạch', base: 'Tiên Thảo Chủ', tiers: [1, 5, 20, 60], key: 'herbLv5' }, // GĐ308: BẬT — vườn thảo dược đã có
  { id: 'ach_lt_overdose', group: 'linh_thu', name: 'Đan độc', desc: 'Số lần dùng đan dược quá liều rồi khỏi', base: 'Bách Độc Bất Xâm', tiers: [1, 5, 20], key: 'overdoses', enabled: false },
  { id: 'ach_lt_pills', group: 'linh_thu', name: 'Bộ sưu tập đan', desc: 'Số loại đan dược khác nhau đã dùng', base: 'Bách Đan Phổ', tiers: [5, 10, 16, 22], key: 'pillsUsed' }, // GĐ362: hạ thang theo trần thật — toàn ITEMS chỉ có 22 id dan_* (counter chỉ ghi khi dùng id bắt đầu 'dan_'), thang cũ [5,15,30,50] có 2 bậc chết; bậc cao nhất 22 = dùng đủ mọi loại đan
  { id: 'ach_lt_loyal', group: 'linh_thu', name: 'Linh thú trung thành', desc: 'Số linh thú đã đạt độ thân thiết tối đa', base: 'Thú Tình Thâm', tiers: [1, 3, 8, 20], key: 'loyalPets', enabled: false },
  // Nhóm Ẩn (6) — hiện "???" tới khi đạt bậc 1
  { id: 'ach_an_firstfail', group: 'an', name: '???: lần đầu thất bại', desc: 'Thất bại đột phá ở lần đầu tiên của một kiếp (ẩn cho đến khi gặp)', base: 'Vấp Ngã Thành Đạo', tiers: [1, 3, 10], key: 'firstFails', hidden: true },
  { id: 'ach_an_divineart', group: 'an', name: '???: thần cách riêng', desc: 'Hoàn thiện Chân Ảnh — sinh Thần Thuật riêng theo hồ sơ chỉ số của chính mình (ẩn cho đến khi đạt)', base: 'Thần Cách', tiers: [1], key: 'hasArt', hidden: true }, // GĐ216
  { id: 'ach_nd_feststories', group: 'nhan_duyen', name: 'Dự đủ bốn mùa', desc: 'Khép cốt truyện lễ của các mùa (Xuân cây đào, Hạ người chài, Thu con thú, Đông người gác đền) — đủ 4 là Người Giữ Lễ', base: 'Người Giữ Lễ', tiers: [1, 2, 3, 4], key: 'festStories' }, // GĐ222
  { id: 'ach_nd_festquiz', group: 'nhan_duyen', name: 'Học rộng lễ làng', desc: 'Tổng số câu đố vui của Thầy Đồ trả lời đúng', base: 'Hiếu Học', tiers: [3, 10, 30, 90], key: 'festQuiz' }, // GĐ222
  { id: 'ach_nd_festhunt', group: 'nhan_duyen', name: 'Mắt tinh tìm lễ', desc: 'Tổng số vật lễ ẩn quanh làng đã nhặt trong các mùa lễ', base: 'Tầm Lễ Giả', tiers: [5, 20, 60], key: 'festHunt' }, // GĐ222
  { id: 'ach_an_festverse', group: 'an', name: '???: sưu tầm câu chúc', desc: 'Mở Bao Lì Xì trúng Mảnh Câu Chúc viết tay (ẩn cho đến khi đạt)', base: 'Người Giữ Chữ', tiers: [1, 6, 15], key: 'festVerse', hidden: true }, // GĐ222
  { id: 'ach_an_tandang', group: 'an', name: '???: đến cuối vẫn còn chăm chỉ', desc: 'Nguyên Anh tầng 9 không thăng cảnh, tu đến cuối thọ nguyên trên đường Tàn Đăng và thoát thai hoán cốt (ẩn cho đến khi đạt)', base: 'Tàn Đăng Bất Diệt', tiers: [1], key: 'tandang', hidden: true }, // GĐ180: tên thành tựu do Bảo đặt
  { id: 'ach_an_secret', group: 'an', name: '???: bí mật ẩn', desc: 'Hoàn thành chuỗi nhiệm vụ ẩn mở ra Đỏ sắc, Đen sắc hoặc Hư sắc (mở khóa thiên phú)', base: 'Cơ Duyên Thâm Hậu', tiers: [1, 2, 3], key: 'secretChains', hidden: true },
  { id: 'ach_an_dream', group: 'an', name: '???: giấc mơ kiếp trước', desc: 'Gặp ký ức kiếp trước (cần chơi nhiều kiếp)', base: 'Luân Hồi Giả', tiers: [1, 3, 5, 10], key: 'pastDreams', hidden: true, enabled: true },
  { id: 'ach_an_demon', group: 'an', name: '???: ma khí và chính đạo', desc: 'Giữ mức ma khí thấp suốt một kiếp (ẩn)', base: 'Chính Đạo', tiers: [1, 3, 5], key: 'lowDemonLives', hidden: true, enabled: true },
  { id: 'ach_an_souldef', group: 'an', name: '???: khiếm khuyết hồn thể', desc: 'Chết quá nhiều lần trong một kiếp — hồn khiếm khuyết, phải đi tìm lại 7 mảnh hồn (ẩn)', base: 'Khiếm Khuyết', tiers: [1], key: 'soulDeficient', hidden: true, enabled: true }, // GĐ315
  { id: 'ach_an_books', group: 'an', name: '???: đọc hết sách', desc: 'Đọc hết sách trong Thư viện, tìm ra bí tịch ẩn', base: 'Bác Học Giả', tiers: [1, 3, 6, 10], key: 'booksRead', hidden: true, enabled: false }, // GĐ360: khôi phục def từng bị comment // GĐ315 nuốt mất (trước đây không tồn tại trong mảng nạp) — vẫn TẮT, chờ hệ Thư viện sách
  { id: 'ach_an_cleanboss', group: 'an', name: '???: chiến thần', desc: 'Hạ trùm cuối bản đồ đầu tiên mà chưa dùng đan hay thần thông', base: 'Chiến Thần Tập Sự', tiers: [1, 3, 10], key: 'cleanBoss', hidden: true },
];
// GĐ139 — THƯỞNG MỐC NHÓM (tài liệu bản -2, bảng "Thưởng theo nhóm"):
// 3 mốc mỗi nhóm = 15% / 40% / 75% tổng Đạo Tích tối đa của nhóm, làm tròn 5.
// parked: true = perk trỏ tới hệ chưa có trong MMO (không bịa cơ chế — hiện rõ
// trong panel là "chưa có cơ chế", chỉ tính mốc khi hệ đó có thật).
const GROUP_MILESTONES = {
  tu_luyen: [10, 35, 60], chien_dau: [20, 50, 90], cong_phap: [10, 25, 45],
  nghe_phu: [15, 35, 65], kham_pha: [15, 35, 65], quai_trum: [15, 35, 70],
  sinh_ton: [10, 30, 55], cua_cai: [10, 35, 60], nhan_duyen: [10, 30, 55],
  linh_thu: [5, 15, 30], an: [5, 10, 15],
};
const GROUP_PERKS = {
  tu_luyen: [
    { text: '+3% Tu vi từ đánh quái', parked: true, why: 'MMO không cộng Tu vi khi giết quái' },
    { text: 'Bế quan +5% Tu vi', parked: false },
    { text: '−5% thời gian chờ thử lại sau đột phá thất bại', parked: true, why: 'MMO không có thời gian chờ thử lại đột phá' },
  ],
  chien_dau: [
    { text: '+2% sát thương lên quái', parked: false },
    { text: '+3% hồi máu từ mọi nguồn hồi máu', parked: false },
    { text: '+1 ô thanh kỹ năng dự bị', parked: true, why: 'MMO chỉ có 2 bảng chiêu cố định (chính + tiện ích)' },
  ],
  cong_phap: [
    { text: '−5% thời gian luyện công pháp', parked: false },
    { text: '+1 bộ xếp công pháp', parked: true, why: 'MMO chỉ có 2 bảng chiêu cố định' },
    { text: '−5% chân nguyên tiêu hao của mọi công pháp', parked: false },
  ],
  nghe_phu: [
    { text: '−5% thời gian chế tạo', parked: true, why: 'MMO chế tạo tức thời, không có thời gian chế' },
    { text: '+3% tỷ lệ thành công khi chế tạo', parked: false },
    { text: '+1 chỗ chế tạo cùng lúc', parked: true, why: 'MMO chế tạo tức thời, không có hàng chờ' },
  ],
  kham_pha: [
    { text: '−5% thời gian đi đường ngoài trận', parked: false },
    { text: 'Bản đồ hiện điểm bí mật trong phạm vi gần', parked: false, noBoost: true }, // GĐ356: đã nối thật — minimap hiện dấu điểm đã tìm; điểm chưa tìm nhưng ĐÃ CÓ MANH MỐI hiện dấu vùng mờ lệch tâm ~300px (server lọc theo quyền, tọa độ thật không rời server). noBoost: quyền dạng có/không, nhân đôi vô nghĩa
    { text: '−10% thức ăn/nước khi vượt Tường Đá hoặc Trận Bão', parked: true, why: 'MMO chưa có hệ vượt Tường Đá/Trận Bão' },
  ],
  quai_trum: [
    { text: '+5% tỷ lệ rơi nguyên liệu từ quái', parked: false },
    { text: 'Rương trùm mở thêm 1 ô chọn', parked: true, why: 'MMO mở rương tự động, không có giao diện chọn' },
    { text: '+10% Linh thạch rơi từ quái', parked: false },
  ],
  sinh_ton: [
    { text: 'Thức ăn/nước giảm chậm hơn 5%', parked: false },
    { text: '−20% thời gian hồi sinh', parked: false },
    { text: '+1 lần hồi sinh miễn phạt mỗi kiếp', parked: true, why: 'MMO chết không có hình phạt nào để miễn' },
  ],
  cua_cai: [
    { text: 'Bán đồ được thêm 5% giá', parked: false },
    { text: 'Mua đồ được giảm 5% giá', parked: false },
    { text: '+10 ô túi đồ', parked: true, why: 'MMO túi đồ không giới hạn ô' },
  ],
  nhan_duyen: [
    { text: 'NPC mới quen bắt đầu với +5 thiện cảm', parked: false },
    { text: 'Tăng tỷ lệ NPC chịu giúp đột phá khi thất bại nhiều', parked: true, why: 'MMO chưa có hệ NPC giúp đột phá' },
    { text: '+1 lần nhờ sư phụ/tiền bối chỉ điểm mỗi kiếp', parked: true, why: 'MMO đã có chỉ điểm (sư phụ chủ động chỉ điểm cho đệ tử, mỗi ngày 1 lần) — chưa có cơ chế đệ tử nhờ chỉ điểm tính theo kiếp' }, // GĐ348: sửa why cho đúng hiện trạng sư đồ GĐ318
  ],
  linh_thu: [
    { text: 'Linh thú tăng độ thân thiết nhanh hơn 10%', parked: true, why: 'MMO chưa có độ thân thiết pet' },
    { text: 'Linh thảo sinh trưởng nhanh hơn 5%', parked: false }, // GĐ348: đã nối thật — cây trong vườn của người đạt mốc sinh trưởng nhanh hơn 5% (achGardenMulOf ở server/index.js); nhân đôi được qua boost như các perk % anh em nên không gắn noBoost
    { text: 'Đan dược luyện ra có thêm 3% tỷ lệ phẩm cao', parked: true, why: 'MMO đan không có phẩm cao/thấp' },
  ],
  an: [
    { text: '+3% cơ duyên (cơ hội thêm món hiếm khi hạ quái và mở rương)', parked: false, noBoost: true }, // GĐ347: đã nối thật qua kênh cơ duyên F3 (kênh L hạ quái + kênh R mở rương, cùng định nghĩa với thiên phú Khí vận — xem achCoDuyenOf ở server/index.js); noBoost = không nhân đôi được (như mốc 2, tránh hứa hẹn +6%)
    { text: '+1 lần bốc lại thiên phú mỗi kiếp', parked: false, noBoost: true }, // GĐ341: đã nối thật (lượt bốc lại thiên phú ở kiếp mới); noBoost = không nhân đôi được (trần lượt đã cố định theo 3 điểm chờ)
    { text: 'Mỗi kiếp mở sẵn 1 manh mối bí cảnh ẩn', parked: false, noBoost: true }, // GĐ357: đã nối thật — tạo nhân vật kiếp mới tự mở đúng 1 manh mối theo ưu tiên cổng ẩn -> di vật -> điểm nhiệm vụ ẩn (pickLifeSeedClue ở server/index.js); noBoost = đúng 1 manh mối như văn bản, không nhân đôi
  ],
};
// GĐ139 — MỐC ĐẠO TÍCH VĨNH VIỄN (tài liệu bản -2, bảng cuối mục).
// GĐ348 (rà lại sau khi luân hồi GĐ314–317 ra đời): mốc 120 đã nối thật (GĐ341,
// bốc lại thiên phú); mốc 220/650 đã nối thật (thọ ban đầu mỗi kiếp +2/+4, áp
// tại create_character — daoLifeBonusFor ở server/index.js); mốc 780 nối một
// phần (danh hiệu + bốc lại). Chưa áp dụng: 20 (túi không giới hạn ô — perk vô
// nghĩa), 60 (chưa có vật phẩm Lệnh Tiết Thời), 350 (Hành trang chuyển kiếp cơ
// bản đã cho mọi hồn mang 3 loại — mốc không còn phần riêng). GĐ351: mốc 500 đã
// nối thật — giới hạn 4 loại đóng dấu vào bản ghi hồn (soul.carryMax) tại lúc gửi
// đồ, soulNorm đọc giới hạn đã lưu ở mọi điểm chuẩn hóa (không truyền Đạo Tích).
const DAO_MILESTONES = [
  { at: 20, text: '+1 ô túi đồ (vĩnh viễn)', active: false, why: 'MMO túi đồ không giới hạn ô' },
  { at: 60, text: '+1 Lệnh Tiết Thời mỗi kiếp (giảm 50% thời gian một hành động dài)', active: false, why: 'MMO chưa có Lệnh Tiết Thời' },
  { at: 120, text: 'Bốc lại thiên phú 1 lần ở mỗi kiếp mới', active: true }, // GĐ341: đã nối thật — kiếp mới được +1 lượt bốc lại thiên phú
  { at: 220, text: '+2 năm tuổi thọ tối đa ban đầu mỗi kiếp', active: true }, // GĐ348: đã nối thật — cộng vào thọ nền khi tạo nhân vật của kiếp mới, đọc Đạo Tích thừa hưởng theo hồn
  { at: 350, text: 'Mang 1 vật phẩm sang kiếp sau', active: false, why: 'Đã có sẵn cho mọi hồn: Hành trang chuyển kiếp mang được tối đa 3 loại vật phẩm (GĐ314) — mốc này không còn phần riêng để áp dụng' },
  { at: 500, text: '+1 chỗ mang vật phẩm sang kiếp sau', active: true }, // GĐ351: đã nối thật — giới hạn loại đồ chuyển kiếp đóng dấu vào bản ghi hồn (soul.carryMax) tại lúc gửi đồ ở soul_set_carry, soulNorm đọc giới hạn đã lưu thay vì hằng 3
  { at: 650, text: '+4 năm tuổi thọ tối đa ban đầu mỗi kiếp (cộng dồn mốc trước)', active: true }, // GĐ348: đã nối thật cùng điểm với mốc 220 — đủ cả hai mốc là +6 năm thọ ban đầu mỗi kiếp
  { at: 780, text: 'Danh hiệu “Vô Thượng Đạo Tích” (+1 bốc lại thiên phú mỗi kiếp — đang áp dụng; +2 ô túi đồ — phần này chưa áp dụng)', active: 'title' }, // GĐ341: phần bốc lại đã nối thật
];
module.exports = {
  TITLE_LEVELS, titleLevelFor, daoTichForTier, chestGradeForLevel, titleText,
  CHEST_ITEM, CHEST_NAME, GEAR_RARITY_RANK, GROUP_NAMES, ACH138,
  GROUP_MILESTONES, GROUP_PERKS, DAO_MILESTONES,
};
