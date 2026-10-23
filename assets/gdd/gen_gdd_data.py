"""Sinh dữ liệu GDD mở rộng (data-driven) từ tài liệu thiết kế mở rộng của người chơi.
Xuất: server/data/gdd/{MapData,MonsterData,SkillData,NPCData}.json
Nguyên tắc: mọi con số/tên lấy từ tài liệu; phần tài liệu chỉ cho số lượng/ví dụ
được sinh hệ thống và gắn cờ "generated": true để phân biệt với nội dung gốc."""
import json, os, random, itertools

OUT = os.path.expanduser('~/workspace/tap-tanh-tu-tien-mmo/server/data/gdd')
os.makedirs(OUT, exist_ok=True)
REALMS = ['pham', 'lk', 'tc', 'kd', 'na', 'ht']

# ---------------- MapData: 50 map theo tài liệu + 2 map hiện có của game ----------------
def m(id, name, cat, **kw):
    d = {'id': id, 'name': name, 'category': cat}
    d.update(kw)
    return d

maps = [
    m('lang_tan_thu', 'Làng Tân Thủ', 'current', safe=True, minRealm='pham', minTier=0,
      desc='Làng khởi đầu của bản Alpha hiện tại', existing=True),
    m('bai_farm', 'Bãi Farm Quanh Làng', 'current', safe=False, minRealm='pham', minTier=0,
      desc='Vòng farm quanh làng (5 vòng theo thiết kế gốc)', existing=True, monsterSet=['soi_xam', 'doi_den', 'thach_quai']),
    # 10 thành phố chính (an toàn)
    m('thanh_van_thanh', 'Thanh Vân Thành', 'city', safe=True, minRealm='lk', minTier=1, desc='Trung tâm, đấu giá', npcProfile='city'),
    m('vong_nguyet_lau', 'Vọng Nguyệt Lâu', 'city', safe=True, minRealm='lk', minTier=1, desc='Bán công pháp hiếm', npcProfile='city'),
    m('hac_phong_trai', 'Hắc Phong Trại', 'city', safe=True, minRealm='lk', minTier=1, desc='Chợ đen', npcProfile='city'),
    m('tang_kinh_cac', 'Tàng Kinh Các', 'city', safe=True, minRealm='lk', minTier=1, desc='Thư viện, tăng ngộ tính', npcProfile='city'),
    m('phong_van_tong', 'Phong Vân Tông', 'city', safe=True, minRealm='lk', minTier=1, desc='Tông môn', npcProfile='city'),
    m('thien_co_thanh', 'Thiên Cơ Thành', 'city', safe=True, minRealm='lk', minTier=1, desc='Chợ giao dịch', npcProfile='city'),
    m('long_mach_co_thanh', 'Long Mạch Cổ Thành', 'city', safe=True, minRealm='tc', minTier=1, desc='Nhiệm vụ truyền thừa', npcProfile='city'),
    m('thien_ngoai_phuong', 'Thiên Ngoại Phường', 'city', safe=True, minRealm='kd', minTier=1, desc='Chợ Kim Đan', npcProfile='city'),
    m('ma_vuc_thanh', 'Ma Vực Thành', 'city', safe=True, minRealm='kd', minTier=1, desc='Thành Ma tu', npcProfile='city'),
    m('tien_gioi_cac', 'Tiên Giới Các', 'city', safe=True, minRealm='kd', minTier=1, desc='Trạm Tiên nhân', npcProfile='city'),
]
# 15 map nghề phụ (3 map/nghề)
professions = [
    ('dansu', 'Đan Sư', [('duoc_coc', 'Dược Cốc'), ('luyen_dan_phong', 'Luyện Đan Phòng'), ('dan_thap', 'Đan Tháp')]),
    ('thusu', 'Thú Sư', [('van_thu_son', 'Vạn Thú Sơn'), ('linh_thu_vien', 'Linh Thú Viên'), ('ngu_thu_son_trang', 'Ngự Thú Sơn Trang')]),
    ('tranphap', 'Trận Pháp Sư', [('ky_mon_dong', 'Kỳ Môn Động'), ('tran_phap_cac', 'Trận Pháp Các'), ('bat_quai_tran_do', 'Bát Quái Trận Đồ')]),
    ('phusu', 'Phù Sư', [('linh_phu_dien', 'Linh Phù Điện'), ('chu_van_duong', 'Chú Văn Đường'), ('but_mac_hien', 'Bút Mặc Hiên')]),
    ('luyenkhisu', 'Luyện Khí Sư', [('hoa_lo_coc', 'Hỏa Lò Cốc'), ('thiet_coc', 'Thiết Cốc'), ('kiem_lo_son_trang', 'Kiếm Lô Sơn Trang')]),
]
for pid, pname, lst in professions:
    for mid, mname in lst:
        maps.append(m(mid, mname, 'profession', safe=True, minRealm='lk', minTier=1,
                      profession=pid, professionName=pname, npcProfile='city', desc=f'Map nghề {pname}'))
# 10 map farm LK & TC
farms = [
    ('bang_phong_coc', 'Băng Phong Cốc', 'lk', 7, 9), ('hoa_diem_son', 'Hỏa Diễm Sơn', 'lk', 7, 9),
    ('hac_phong_sa_mac', 'Hắc Phong Sa Mạc', 'lk', 7, 9),
    ('huyet_sac_rung', 'Huyết Sắc Rừng', 'tc', 1, 6), ('tu_vong_mo_dia', 'Tử Vong Mộ Địa', 'tc', 1, 6),
    ('van_thu_son_mach', 'Vạn Thú Sơn Mạch', 'tc', 1, 6),
    ('loi_dinh_son_coc', 'Lôi Đình Sơn Cốc', 'tc', 7, 9), ('hac_am_dam_lay', 'Hắc Ám Đầm Lầy', 'tc', 7, 9),
    ('co_chien_truong', 'Cổ Chiến Trường', 'tc', 7, 9),
    ('vo_tan_hu_khong', 'Vô Tận Hư Không', 'tc', 9, 9),
]
for mid, mname, realm, t0, t1 in farms:
    maps.append(m(mid, mname, 'farm', safe=False, minRealm=realm, minTier=t0,
                  realmBand={'realm': realm, 'tierFrom': t0, 'tierTo': t1},
                  desc='Map farm ' + ('đột phá' if mid == 'vo_tan_hu_khong' else f'{realm} {t0}-{t1}')))
# 15 map Ngũ Hành (Kim Đan)
elements = [
    ('Kim', [('kim_quang_dong', 'Kim Quáng Động'), ('kiem_trung', 'Kiếm Trủng'), ('thien_cuong_kim_son', 'Thiên Cương Kim Sơn')]),
    ('Mộc', [('thanh_moc_lam', 'Thanh Mộc Lâm'), ('u_minh_quy_lam', 'U Minh Quỷ Lâm'), ('co_thu_yeu_gioi', 'Cổ Thụ Yêu Giới')]),
    ('Thủy', [('thanh_tuyen_khe', 'Thanh Tuyền Khe'), ('han_bang_nguyen', 'Hàn Băng Nguyên'), ('tham_hai_bi_canh', 'Thâm Hải Bí Cảnh')]),
    ('Hỏa', [('hoa_diem_dong', 'Hỏa Diễm Động'), ('hoa_son_khau', 'Hỏa Sơn Khẩu'), ('dia_nguc_hoa_hai', 'Địa Ngục Hỏa Hải')]),
    ('Thổ', [('hoang_tho_coc', 'Hoàng Thổ Cốc'), ('thach_lam', 'Thạch Lâm'), ('thai_co_sa_mac', 'Thái Cổ Sa Mạc')]),
]
for el, lst in elements:
    for mid, mname in lst:
        maps.append(m(mid, mname, 'elemental', safe=False, minRealm='kd', minTier=1, element=el,
                      desc=f'Map Ngũ Hành hệ {el} — chỉ Kim Đan mới vào được'))
# quái theo map farm/ngũ hành: gán ở MonsterData qua field maps; ở đây để monsterSet trống = suy từ MonsterData
for mp in maps:
    mp.setdefault('monsterSet', [])
    mp.setdefault('connectsTo', ['thanh_van_thanh'] if mp['id'] not in ('lang_tan_thu', 'thanh_van_thanh') else ['lang_tan_thu'])

for _mp in maps:
    _mp['impl'] = 'live' if _mp.get('existing') else 'planned'
_lang = next(x for x in maps if x['id'] == 'lang_tan_thu')
_lang['liveNpcs'] = [
    {'id': 'npc_truonglang', 'name': 'Trưởng Làng', 'role': 'Trả nhiệm vụ'},
    {'id': 'npc_dan', 'name': 'Chủ Tiệm Đan', 'role': 'Shop đan dược'},
    {'id': 'npc_nguyenlieu', 'name': 'Chủ Tiệm Nguyên Liệu', 'role': 'Shop nguyên liệu'},
]

map_data = {
    'meta': {
        'version': 2, 'source': 'Tài liệu thiết kế mở rộng (người chơi, 22/10/2026), đã đối chiếu bản game hiện tại',
        'realms': REALMS,
        'realmNames': {'pham': 'Phàm nhân', 'lk': 'Luyện Khí', 'tc': 'Trúc Cơ', 'kd': 'Kim Đan', 'na': 'Nguyên Anh', 'ht': 'Hóa Thần'},
        'realmTiersPerRealm': 9,
        'globalStepNote': 'Tầng toàn cục: LK 1-9 = bước 1-9, TC = 10-18, Kim Đan = 19-27 (khớp tài liệu 1.1), NA = 28-36.',
        'realmFeatures': {
            'kd': [
                {'tierFrom': 1, 'tierTo': 3, 'phase': 'Sơ Kỳ', 'unlock': 'Ngự Kiếm Phi Hành: bay 50% tốc độ, bỏ qua địa hình'},
                {'tierFrom': 4, 'tierTo': 6, 'phase': 'Trung Kỳ', 'unlock': 'Thần Thức Ngoại Phóng: +20% tầm đánh, khóa mục tiêu xuyên vật cản'},
                {'tierFrom': 7, 'tierTo': 8, 'phase': 'Hậu Kỳ', 'unlock': 'Kim Đan Hộ Thể: tự tạo khiên hấp thụ sát thương khi HP < 30%'},
                {'tierFrom': 9, 'tierTo': 9, 'phase': 'Viên Mãn', 'unlock': 'Đối mặt Thiên Kiếp Lôi để đột phá Nguyên Anh'},
            ],
        },
        'hiddenPaths': [
            {'id': 'lk_vien_man', 'name': 'Luyện Khí Viên Mãn', 'fromRealm': 'lk', 'desc': 'Tu luyện thêm X năm ở Luyện Khí; mở con đường đặc biệt theo lớp (VD: La Hán lên Thánh Tăng). X = chờ chốt.'},
            {'id': 'luyen_hon', 'name': 'Luyện Hồn', 'fromRealm': 'lk', 'desc': 'Tu thêm Y năm; mở chỉ số ẩn (May mắn, Bạo kích); hồn phách xuất khiếu miễn nhiễm vật lý 3s. Y = chờ chốt.'},
            {'id': 'nhap_dao', 'name': 'Nhập Đạo', 'fromRealm': 'lk', 'desc': 'Tu thêm Z năm; tu thêm 1 loại tu khác (Tách = song tu độc lập / Luyện hóa = hợp nhất 1 Chính 1 Phụ); mở ô công pháp 8, 9, 10. Z = chờ chốt.'},
        ],
        'daoPaths': {
            'unlockRealm': 'na', 'note': 'Khóa đến Nguyên Anh, phải sống sót qua Thiên Kiếp (tài liệu 1.3)',
            'paths': [
                {'id': 'ma', 'name': 'Ma Đạo', 'desc': 'Sát thương cực cao, hút máu. Đột phá thất bại chỉ mất Tuổi thọ (không mất căn cơ).'},
                {'id': 'tien', 'name': 'Tiên Đạo', 'desc': 'Sát thương ổn định, nhiều buff/hồi máu. Đột phá chậm, thất bại có thể mất Căn cơ.'},
            ],
            'convert': 'Uống Tẩy Ma/Tẩy Tiên đan cực hiếm, xóa sạch tu vi cũ.',
        },
        'note': 'rank cảnh giới = chỉ số realm trong meta.realms × 9 + tầng. Mã realm dùng đúng mã server hiện tại (pham/lk/...). MapData gồm 50 map của tài liệu + 2 map hiện có (existing, impl=live).',
        'totalMaps': len(maps), 'expansionMaps': len(maps) - 2,
    },
    'maps': maps,
}
with open(os.path.join(OUT, 'MapData.json'), 'w', encoding='utf-8') as f:
    json.dump(map_data, f, ensure_ascii=False, indent=1)
print('MapData:', len(maps), 'maps')

# ---------------- MonsterData ----------------
def mon(id, name, realm, hp, atk, reward, map_ids, mech=None, src='placeholder'):
    return {'id': id, 'name': name, 'realm': realm, 'hp': hp, 'atk': atk, 'tuViReward': reward,
            'maps': map_ids, 'mechanics': mech or [], 'dodgeNote': 'Quái từ Luyện Khí trở đi có cơ chế né chiêu (theo tài liệu 3.1)',
            'statsSource': src}

monsters = [
    # Từ thiết kế gốc (số chuẩn trong docx) — statsSource = doc
    mon('soi_xam', 'Sói Xám', 'lk', 40, 5, 3, ['bai_farm', 'huyet_sac_rung'], src='doc'),
    mon('doi_den', 'Dơi Đen', 'lk', 20, 4, 3, ['bai_farm'], src='doc'),
    mon('thach_quai', 'Thạch Quái', 'lk', 140, 10, 8, ['bai_farm', 'thach_lam'], src='doc'),
    # LK bổ sung (tài liệu 3.1 chỉ liệt kê tên — chỉ số tạm, nội suy theo bậc LK)
    mon('doc_xa', 'Độc Xà', 'lk', 55, 7, 4, ['bai_farm', 'hac_am_dam_lay'], ['cắn độc theo thời gian']),
    mon('lam_tru', 'Lâm Trư', 'lk', 90, 6, 4, ['bai_farm', 'thanh_moc_lam'], ['húc lao thẳng']),
    mon('cot_binh', 'Cốt Binh', 'lk', 110, 9, 8, ['tu_vong_mo_dia', 'bai_farm'], ['hồi sinh 1 lần khi gần chết']),
    mon('thuy_trieu_tinh', 'Thủy Triều Tinh', 'lk', 70, 8, 4, ['thanh_tuyen_khe'], ['phun bọt nước làm chậm']),
    # Trúc Cơ (tên theo tài liệu 3.1 — chỉ số tạm theo bậc TC)
    mon('kiem_ma', 'Kiếm Ma', 'tc', 420, 26, 12, ['co_chien_truong', 'kiem_trung'], ['chém kiếm khí tầm xa']),
    mon('huyet_lang', 'Huyết Lang', 'tc', 350, 30, 12, ['huyet_sac_rung'], ['hồi máu khi cắn trúng']),
    mon('huyen_anh_mieu', 'Huyễn Ảnh Miêu', 'tc', 260, 24, 12, ['u_minh_quy_lam'], ['phân thân ảo ảnh', 'né chiêu cao']),
    mon('thach_khoi_loi', 'Thạch Khôi Lỗi', 'tc', 700, 22, 16, ['thach_lam', 'hoang_tho_coc'], ['giáp đá giảm sát thương vật lý']),
    mon('loi_dieu', 'Lôi Điểu', 'tc', 300, 28, 12, ['loi_dinh_son_coc'], ['phóng sét dây chuyền']),
    mon('dia_hanh_yeu', 'Địa Hành Yêu', 'tc', 520, 24, 16, ['hac_phong_sa_mac', 'thai_co_sa_mac'], ['độn thổ bất ngờ']),
    # Kim Đan — quái map Ngũ Hành (tài liệu 3.2, cơ chế chép nguyên văn; chỉ số tạm theo bậc Kim Đan)
    mon('huyen_diep', 'Huyễn Điệp', 'kd', 1200, 60, 40, ['thanh_moc_lam', 'u_minh_quy_lam'], ['Bướm độc, phân thân']),
    mon('kim_giap_te', 'Kim Giáp Tê', 'kd', 2600, 55, 45, ['kim_quang_dong', 'thien_cuong_kim_son'], ['Trâu bò, lao thẳng choáng']),
    mon('dan_ma', 'Đan Ma', 'kd', 1500, 66, 50, ['hoa_diem_dong'], ['Lò đan hỏng, ném độc đan, chết tự bạo']),
    mon('hap_huyet_quy', 'Hấp Huyết Quỷ', 'kd', 1350, 72, 50, ['u_minh_quy_lam'], ['Tàng hình, hút máu']),
    mon('bang_tinh_cu_nhan', 'Băng Tinh Cự Nhân', 'kd', 3200, 70, 60, ['han_bang_nguyen'], ['Dậm chân sóng băng']),
    mon('diem_hoa_phuong', 'Diễm Hỏa Phượng', 'kd', 1800, 80, 60, ['hoa_son_khau', 'dia_nguc_hoa_hai'], ['Bay lượn thả mưa lửa']),
    mon('thien_loi_thu', 'Thiên Lôi Thú', 'kd', 2000, 84, 60, ['thien_cuong_kim_son'], ['Triệu hồi sét']),
    mon('hon_don_thu', 'Hỗn Độn Thú', 'kd', 4500, 90, 120, ['vo_tan_hu_khong'], ['Boss nhỏ: tấn công ngẫu nhiên 5 hệ'], src='placeholder'),
]
MON_CLASS = {
    'soi_xam': 'weak', 'doi_den': 'weak', 'thach_quai': 'strong', 'doc_xa': 'medium', 'lam_tru': 'medium',
    'cot_binh': 'strong', 'thuy_trieu_tinh': 'medium',
    'kiem_ma': 'strong', 'huyet_lang': 'strong', 'huyen_anh_mieu': 'medium', 'thach_khoi_loi': 'elite',
    'loi_dieu': 'medium', 'dia_hanh_yeu': 'elite',
    'huyen_diep': 'medium', 'kim_giap_te': 'strong', 'dan_ma': 'strong', 'hap_huyet_quy': 'strong',
    'bang_tinh_cu_nhan': 'elite', 'diem_hoa_phuong': 'elite', 'thien_loi_thu': 'elite', 'hon_don_thu': 'boss',
}
REWARD_BASE = {'weak': 3, 'medium': 4, 'strong': 8, 'elite': 12, 'boss': 75}
REALM_FIRST_STEP = {'lk': 1, 'tc': 10, 'kd': 19}
for _mn in monsters:
    _cls = MON_CLASS[_mn['id']]
    _mn['rewardClass'] = _cls
    _mn['tuViReward'] = round(REWARD_BASE[_cls] * (1.12 ** (REALM_FIRST_STEP[_mn['realm']] - 1)))
    _mn['rewardSource'] = 'doc-formula'
    _mn['hpAtkSource'] = _mn.pop('statsSource')

monster_data = {
    'meta': {'version': 1, 'note': 'tuViReward theo công thức thiết kế gốc (nền Yếu 3/Trung 4/Mạnh 8/Tinh anh 12/Trùm 75 × 1.12^(bước đầu bậc −1)). hpAtkSource=doc: HP/ATK từ thiết kế gốc; placeholder: tài liệu mở rộng chỉ cho tên/cơ chế — HP/ATK nội suy, chờ chốt.', 'total': len(monsters)},
    'monsters': monsters,
}
with open(os.path.join(OUT, 'MonsterData.json'), 'w', encoding='utf-8') as f:
    json.dump(monster_data, f, ensure_ascii=False, indent=1)
print('MonsterData:', len(monsters), 'monsters')

# ---------------- SkillData ----------------
import re
ELEMENTS = ['Kim', 'Mộc', 'Thủy', 'Hỏa', 'Thổ']
# (classId, tên lớp, nhóm vũ khí, weaponIds, danh từ vũ khí, [mô tả 5 hệ theo tài liệu])
KD_GROUPS = [
    ('thetu', 'Thể Tu', 'Tay không', ['taykhong'], 'Quyền', ['Xuyên giáp', 'Hút máu', 'Đóng băng 2s', 'Cột lửa diện rộng', 'Choáng 4m']),
    ('thetu', 'Thể Tu', 'Đao/Phủ', ['daothe', 'chienphu'], 'Đao', ['Lưỡi đao 15m', 'Chém hút máu', 'Sóng nước', 'Dmg theo % HP mất', 'Hố sâu hút quái']),
    ('thetu', 'Thể Tu', 'Thương', ['thuongthe'], 'Thương', ['3 luồng xuyên', 'Trói chân', 'Rồng nước', 'Lửa lan', 'Gai đá']),
    ('thetu', 'Thể Tu', 'Thiết côn', ['thietcon'], 'Côn', ['Giảm giáp', 'Trói 5m', 'Sóng băng', 'Lốc lửa', 'Tường đất']),
    ('phattu', 'Phật Tu', 'Phật châu', ['phatchau'], 'Châu', ['Khiên phản 50%', 'Hồi máu + trói', 'Giải debuff', 'Cầu lửa nổ', 'Khiên đất vỡ choáng']),
    ('phattu', 'Phật Tu', 'Quyền trượng', ['quyentruong'], 'Trượng', ['Đập xuyên giáp', 'Rễ cây hồi máu', 'Sóng âm đóng băng', 'Quét lửa hồi máu', 'Núi ảo choáng 3s']),
    ('phattu', 'Phật Tu', 'Bình bát', ['binhbat'], 'Bát', ['Giảm 50% dmg quái', 'Cây hồi máu', 'Xoáy nước hút quái', 'Phun lửa', 'Mái vòm đất']),
    ('cottu', 'Cốt Tu', 'Cốt thuẫn', ['cotthuan'], 'Thuẫn', ['Bất hoại 5s', 'Gai độc', 'Nổ băng', 'Giáp cháy', 'Tường xương']),
    ('cottu', 'Cốt Tu', 'Cốt chùy', ['cotchuy'], 'Chùy', ['Đập nát giáp', 'Nổ xương hồi máu', 'Sóng băng', 'Biển lửa', 'Sóng đất']),
    ('phaptu', 'Pháp Tu', 'Phiến (Quạt)', ['phien'], 'Phiến', ['Bão lưỡi kim', 'Lá độc trói', 'Bão tuyết đóng băng', 'Phượng hoàng lửa', 'Bão cát']),
    ('phaptu', 'Pháp Tu', 'Pháp trượng', ['phaptruong'], 'Trượng', ['Tia sáng phá giáp', 'Rừng rút máu', 'Đóng băng vùng', 'Rồng lửa quét', 'Địa mạch nổ choáng']),
    ('phaptu', 'Pháp Tu', 'Sách phép', ['sachphep'], 'Phù', ['Mưa phù giảm giáp', 'Trận phù giam quái', 'Gom phù dmg lớn', 'Phù lửa trắng', 'Phù đất nổ']),
    ('quytu', 'Quỷ Tu', 'Cờ lệnh', ['colenh'], 'Lệnh', ['Quỷ tướng chém xuyên giáp', 'Rừng quỷ hút máu', 'Quỷ vương băng', 'Thu hồn tăng sức', 'Gọi quỷ binh đất']),
    ('quytu', 'Quỷ Tu', 'Lưỡi hái', ['luoihai'], 'Hái', ['Chém cung trăng', 'Gặt hồn hồi máu', 'Chém đóng băng', 'Lưỡi hái lửa', 'Mộ bia đập']),
    ('quytu', 'Quỷ Tu', 'Quỷ thương', ['quythuong'], 'Thương', ['Mưa thương kim', 'Rừng thương ma', 'Thương băng', 'Ném nổ lửa', 'Hóa quỷ vương']),
    ('satthu', 'Sát Thủ', 'Dao găm', ['daogam'], 'Dao', ['Ẩn thân chí mạng', 'Bóng độc', 'Đâm đóng băng', 'Lướt đâm lửa', 'Đâm choáng']),
    ('satthu', 'Sát Thủ', 'Song đao', ['songdao'], 'Đao', ['Hợp kích giảm giáp', 'Mưa lá đao', 'Xoáy băng', 'Vòng lửa', 'Chém núi']),
    ('satthu', 'Sát Thủ', 'Liêm ngắn', ['liemngan'], 'Liêm', ['Xoáy kim', 'Kéo quái', 'Xoáy băng', 'Lốc liêm lửa', 'Đập choáng']),
    ('satthu', 'Sát Thủ', 'Trảo', ['trao'], 'Trảo', ['Xé giáp', 'Rễ cây', 'Vuốt băng', 'Vuốt lửa', 'Choáng diện rộng']),
    ('kiemtu', 'Kiếm Tu', 'Kiếm', ['kiem'], 'Kiếm', ['Mưa kiếm khí', 'Rừng kiếm', 'Kiếm ý băng', 'Phi kiếm tự tìm', 'Trận kiếm đất']),
    ('kiemtu', 'Kiếm Tu', 'Song kiếm', ['songkiem'], 'Kiếm', ['Hai luồng xuyên giáp', 'Hai luồng mộc', 'Song long', 'Cánh lửa', 'Nện đất']),
    ('kiemtu', 'Kiếm Tu', 'Trọng kiếm', ['trongkiem'], 'Kiếm', ['Chém nặng giảm giáp', 'Rễ hồi máu', 'Chém đóng băng', 'Biển lửa', 'Nhảy đập choáng']),
    ('ytu', 'Y Tu', 'Phất trần', ['phattran'], 'Trần', ['Khiên kim', 'Vùng hồi máu', 'Vùng giảm dmg phép', 'Hồi sinh', 'Giáp đất']),
    ('ytu', 'Y Tu', 'Kim châm', ['kimcham'], 'Châm', ['Khóa mục tiêu', 'Độc lan', 'Đóng băng', 'Tự châm hồi máu', 'Giải khống chế']),
    ('ytu', 'Y Tu', 'Cổ cầm', ['cocam'], 'Cầm', ['Câm lặng', 'Hồi máu lớn', 'Sóng âm đóng băng', 'Tăng tốc hồi máu', 'Làm chậm']),
    ('nhotu', 'Nho Tu', 'Ngâm thơ', ['ngamtho'], 'Thơ', ['Kết giới câm lặng', 'Hồi máu + linh lực', 'Ru ngủ', 'Hồi máu giải khống chế', 'Giảm dmg diện rộng']),
    ('nhotu', 'Nho Tu', 'Bút phép', ['butphep'], 'Bút', ['Chữ hóa giáp', 'Vẽ rừng giam', 'Vẽ vùng băng', 'Chữ lửa nổ', 'Trận giáp đất']),
    ('nhotu', 'Nho Tu', 'Quyển trục', ['quyentruc'], 'Trục', ['Câm lặng', 'Buff hồi máu', 'Đổi vị trí', 'Tăng tốc', 'Choáng diện rộng']),
]
def slug(s):
    import unicodedata
    s = unicodedata.normalize('NFD', s.lower())
    s = ''.join(c for c in s if unicodedata.category(c) != 'Mn')
    s = s.replace('đ', 'd')
    return re.sub(r'[^a-z0-9]+', '_', s).strip('_')

kd_skills, used_names = [], set()
for gi, (cls, cls_name, group, wids, noun, descs) in enumerate(KD_GROUPS):
    for ei, (el, desc) in enumerate(zip(ELEMENTS, descs)):
        core = re.sub(r'\s*\d+\s*(s|m|%)?', '', desc).strip(' +')
        name = core if (len(core.split()) >= 3 or noun.lower() in core.lower()) else f'{core} {noun}'
        name = name[0].upper() + name[1:]
        if name in used_names:
            name = f'{el} {name}'
        used_names.add(name)
        RANGED_W = {'phatchau', 'quyentruong', 'binhbat', 'colenh', 'phien', 'phaptruong', 'sachphep',
                    'phattran', 'kimcham', 'cocam', 'ngamtho', 'butphep', 'quyentruc'}
        cd_s = 35 + ((gi + ei) % 4) * 5
        kd_skills.append({
            'id': 'kd_' + slug(cls + '_' + group + '_' + el), 'name': name,
            'classId': cls, 'className': cls_name, 'weaponGroup': group, 'weaponIds': wids, 'element': el,
            'desc': desc, 'quality': 'tien', 'minRealm': 'kd', 'tier': 'kd',
            'coef': 3.0, 'cost': 150 + ((gi + ei) % 3) * 50, 'cdMs': cd_s * 1000,
            'rangePx': 320 if any(w in RANGED_W for w in wids) else 70,
            'cooldownS': cd_s, 'damageTier': 'cực đại (theo tài liệu: hồi chiêu 35s-50s, sát thương cực đại)',
            'gameFrameNote': 'coef/cost theo khung Áo nghĩa của thiết kế gốc (3.0 / 150-250); CD theo tài liệu mở rộng (35-50s).',
            'generated': False,
        })

def combos(prefixes, suffixes, cat, desc_tpl):
    out = []
    for p, sfx in itertools.product(prefixes, suffixes):
        out.append({'id': slug(cat + '_' + p + '_' + sfx), 'name': f'{p} {sfx}', 'category': cat,
                    'desc': desc_tpl.format(p=p, s=sfx), 'generated': True})
    return out

utility = {}
utility['boPhap'] = combos(['Lăng Ba', 'Tật Phong', 'Lưu Vân', 'Hồi Quang', 'Ảnh Độn', 'Phi Vân', 'Kinh Hồng', 'Thiên La', 'Vô Ảnh', 'Đạp Tuyết'],
                           ['Vi Bộ', 'Thân Pháp', 'Quyết', 'Bộ', 'Thuật'], 'boPhap', 'Bộ pháp: di chuyển đặc biệt (lướt/lặn/tàng hình/nhảy/dịch chuyển).')
utility['boPhap'][0].update({'desc': 'Lướt 5m miễn sát thương (ví dụ trong tài liệu)', 'generated': False})
utility['phongThu'] = combos(['Kim Chung', 'Huyền Vũ', 'Thiết Bố', 'Ngọc Thanh', 'Địa Long'],
                              ['Tráo', 'Thuẫn', 'Sam', 'Giáp'], 'phongThu', 'Phòng thủ: tạo khiên/giảm sát thương/phản đòn/hóa đá.')
utility['phongThu'][0].update({'name': 'Kim Chung Tráo', 'desc': 'Khiên vàng hấp thụ 30% HP (ví dụ trong tài liệu)', 'generated': False})
utility['hoTroTuLuyen'] = combos(['Dẫn Tâm', 'Tụ Linh', 'Ngưng Thần', 'Hấp Tinh', 'Dưỡng Nguyên'],
                                  ['Thuật', 'Quyết'], 'hoTroTuLuyen', 'Hỗ trợ tu luyện: tăng tốc hấp thu Tu vi / tỷ lệ rơi đồ.')
utility['hoTroTuLuyen'][0].update({'desc': 'Thiền định tăng 20% Tu vi (ví dụ trong tài liệu)', 'generated': False})
utility['khongChe'] = combos(['Định Thân', 'Trấn Hồn', 'Phong Linh', 'Hàn Tỏa', 'Thúc Phược'],
                              ['Chú', 'Phù'], 'khongChe', 'Khống chế: choáng/trói/làm chậm diện rộng.')
utility['khongChe'][0].update({'name': 'Định Thân Chú', 'desc': 'Định thân mục tiêu (ví dụ trong tài liệu)', 'generated': False})
utility['sinhTon'] = combos(['Tạo Thực', 'Ngưng Lộ', 'Hồi Thành', 'Tầm Bảo', 'Dã Ngoại'],
                             ['Thuật', 'Quyết'], 'sinhTon', 'Sinh tồn: tạo thức ăn/nước uống, phát hiện rương ẩn, hồi thành.')

hidden_defs = [
    ('Vạn Kiếm Quy Tông', 'Mưa 100 phi kiếm', False), ('Thời Gian Nghịch Chuyển', 'Quay ngược thời gian 3s', False),
    ('Bất Diệt Kim Thân', 'Hồi máu 10%/giây', False),
    ('Thiên Nhãn Thông', 'Nhìn xuyên vật cản, phát hiện kẻ tàng hình và rương ẩn', True),
    ('Cửu Chuyển Hoàn Hồn Thuật', 'Hồi sinh bản thân 1 lần mỗi ngày với 50% HP', True),
    ('Đại La Thiên Võng', 'Kết giới giam mọi kẻ địch trong vùng 10s', True),
    ('Hư Không Phá Giới', 'Dịch chuyển tức thời xuyên map kèm sóng xung kích', True),
    ('Sinh Tử Luân Hồi Chưởng', 'Một chưởng đổi %HP với mục tiêu', True),
    ('Thái Cực Vô Song', 'Phản lại toàn bộ sát thương nhận trong 3s', True),
    ('Huyết Hải Thao Thiên', 'Sóng máu diện rộng, hút máu theo số kẻ địch trúng', True),
    ('Phật Quang Phổ Chiếu', 'Hồi máu + giải khống chế cho cả nhóm', True),
    ('Ma Vương Giáng Thế', 'Hóa thân Ma Vương 15s, toàn chỉ số tăng mạnh', True),
    ('Tinh Vẫn Đại Kiếp', 'Triệu hồi thiên thạch mưa xuống vùng chỉ định', True),
    ('Âm Dương Đảo Loạn', 'Đảo ngược buff/debuff trên người mục tiêu', True),
    ('Vô Tướng Thần Công', 'Sao chép chiêu cuối cùng mục tiêu vừa tung', True),
]
chain_templates = [
    [{'type': 'map', 'mapId': 'vo_tan_hu_khong'}, {'type': 'time', 'fromHour': 23, 'toHour': 1}],
    [{'type': 'item', 'itemId': 'tam_ma_dan', 'count': 1}, {'type': 'realm', 'realm': 'kd', 'tier': 1}],
    [{'type': 'map', 'mapId': 'long_mach_co_thanh'}, {'type': 'item', 'itemId': 'truyen_thua_lenh', 'count': 1}],
]
hidden = []
for i, (nm, dc, gen) in enumerate(hidden_defs):
    hidden.append({'id': 'hidden_' + slug(nm), 'name': nm, 'desc': dc, 'quality': 'than',
                   'exclusive': True, 'is_claimed': False, 'claimedBy': None,
                   'transferableTo': 2, 'inheritPowerPct': [70, 80],
                   'questChains': [{'chainId': f'chain_{i+1}_{j+1}', 'conditions': ct} for j, ct in enumerate(chain_templates)],
                   'generated': gen})

flawed_defs = [
    ('Băng Hỏa Lưỡng Cực', [('manh_dam_lua', 'Mảnh 1 — Đấm Lửa', 'Dùng lẻ: tự đốt HP'), ('manh_dam_bang', 'Mảnh 2 — Đấm Băng', 'Dùng lẻ: tự làm chậm')],
     'Sát thương hủy diệt, miễn nhiễm hệ Băng/Hỏa', False),
]
flawed_themes = [
    ('Lôi Phong Lưỡng Nghi', 'Phong', 'Lôi', 'Sấm sét cuốn theo cuồng phong'), ('Âm Dương Song Ngư', 'Âm', 'Dương', 'Hai khí âm dương luân chuyển'),
    ('Sinh Tử Luân Hồi Ấn', 'Sinh', 'Tử', 'Hồi máu đồng đội, đoạt sinh khí kẻ địch'), ('Quang Ám Giao Thoa', 'Quang', 'Ám', 'Sáng tối giao thoa gây mù + thiêu đốt'),
    ('Kim Mộc Tương Sinh', 'Kim', 'Mộc', 'Kiếm khí sinh sôi không dứt'), ('Thủy Hỏa Ký Tế', 'Thủy', 'Hỏa', 'Thủy hỏa cân bằng, nổ diện rộng'),
    ('Long Phượng Trình Tường', 'Long', 'Phượng', 'Song thú hộ thể'), ('Thiên Địa Đồng Lô', 'Thiên', 'Địa', 'Lò luyện thiên địa nung chảy giáp địch'),
    ('Nhật Nguyệt Song Huy', 'Nhật', 'Nguyệt', 'Hai vầng sáng xoay vòng tấn công'), ('Tinh Thần Đại Trận', 'Tinh', 'Thần', 'Trận sao trấn áp vùng rộng'),
    ('Huyền Vũ Trấn Hải', 'Huyền', 'Vũ', 'Khiên nước trấn hải, phản sóng'), ('Chu Tước Phần Thiên', 'Chu', 'Tước', 'Lửa thần thiêu rụi bầu trời'),
    ('Bạch Hổ Phá Quân', 'Bạch', 'Hổ', 'Sát khí phá vỡ hàng ngũ địch'), ('Thanh Long Ngâm', 'Thanh', 'Long', 'Tiếng rồng ngâm choáng + hồi mana'),
]
for nm, a, b, fused in flawed_themes:
    flawed_defs.append((nm, [(f'manh_{slug(a)}_{slug(nm)}', f'Mảnh {a}', 'Dùng lẻ: phản phệ nhẹ lên bản thân'),
                             (f'manh_{slug(b)}_{slug(nm)}', f'Mảnh {b}', 'Dùng lẻ: phản phệ nhẹ lên bản thân')], fused, True))
flawed = []
for nm, frags, fused, gen in flawed_defs:
    flawed.append({'id': 'flawed_' + slug(nm), 'name': nm, 'quality': 'bao',
                   'fragments': [{'itemId': fid, 'name': fnm, 'sideEffect': se} for fid, fnm, se in frags],
                   'fragmentCount': len(frags), 'fusedDesc': fused, 'generated': gen})

forbidden_defs = [
    ('Đại Thôn Phệ Thuật', 'Hút máu tăng vĩnh viễn Tu vi', 'Hiến tế vật liệu cực hiếm mỗi lần dùng', False),
    ('Thiên Lôi Hủy Diệt', 'Sét đánh toàn màn hình cả bạn lẫn quái', 'Đánh cả đồng đội và bản thân', False),
    ('Luân Hồi Chuyển Thế', 'Hồi sinh đồng đội nhưng bản thân mất 90% HP', 'Mất 90% HP khi thi triển', False),
    ('Huyết Tế Thiên Địa', 'Dâng máu đổi sức mạnh tạm thời cực lớn', 'Mất 50% HP tối đa trong 1 giờ', True),
    ('Nghịch Thiên Cải Mệnh', 'Đổi vận mệnh: reset 1 lần đột phá thất bại', 'Mất 10 năm tuổi thọ', True),
    ('Ma Thần Hàng Lâm', 'Mượn sức Ma Thần trong 30s', 'Sau khi hết hiệu lực, mất 50% Tu vi tầng hiện tại', True),
    ('Tận Thế Lôi Kiếp', 'Gọi lôi kiếp đánh xuống vùng rộng', 'Bản thân chịu 30% sát thương', True),
    ('Hồn Phi Phách Tán', 'Đánh tan hồn phách mục tiêu', 'Mất vĩnh viễn 5% Thần thức tối đa (tối đa 3 lần)', True),
    ('Thiên Ma Giải Thể', 'Bạo tăng tốc độ và sát thương', 'Sau 10s, HP còn 1', True),
    ('Vạn Quỷ Phệ Tâm', 'Gọi vạn quỷ cắn xé kẻ địch', 'Mỗi lần dùng giảm thiện cảm mọi NPC 20 điểm', True),
    ('Nhật Nguyệt Đảo Hành', 'Đảo ngày thành đêm trong khu vực', 'Cả server biết vị trí của bạn trong 1 giờ', True),
    ('Càn Khôn Điên Đảo', 'Đảo vị trí mọi đơn vị trong vùng', 'Không phân biệt địch/ta', True),
    ('Thập Tuyệt Trận', 'Dựng trận tuyệt sát 10 giây', 'Cần 10 người chơi cùng hiến tế 10% HP', True),
    ('Hỗn Độn Sơ Khai', 'Một đòn hỗn độn bỏ qua mọi phòng thủ', 'Hồi chiêu 7 ngày thật', True),
    ('Vô Lượng Kiếp', 'Gây sát thương theo số kiếp nạn đã tích lũy', 'Xóa toàn bộ tích lũy sau khi dùng', True),
]
forbidden = [{'id': 'forbidden_' + slug(nm), 'name': nm, 'desc': dc, 'quality': 'than',
              'cost': {'desc': cost}, 'generated': gen} for nm, dc, cost, gen in forbidden_defs]

skill_data = {
    'meta': {'version': 1, 'source': 'Tài liệu thiết kế mở rộng phần 2 (người chơi, 22/10/2026)',
             'note': 'generated=false: nội dung chép từ tài liệu. generated=true: tài liệu chỉ cho số lượng — tên sinh hệ thống để đủ số lượng, chờ người chơi chốt tên chính thức.'},
    'qualityTiers': [
        {'id': 'pham', 'name': 'Phàm Cấp', 'color': '#9e9e9e', 'desc': 'Đại trà'},
        {'id': 'linh', 'name': 'Linh Cấp', 'color': '#4caf50', 'desc': 'Khá'},
        {'id': 'bao', 'name': 'Bảo Cấp', 'color': '#9c27b0', 'desc': 'Xịn'},
        {'id': 'tien', 'name': 'Tiên Cấp', 'color': '#ff9800', 'desc': 'Kỹ năng Kim Đan'},
        {'id': 'than', 'name': 'Thần Cấp', 'color': '#f44336', 'desc': 'Ẩn/Cấm thuật'},
    ],
    'kimDanSkills': kd_skills,
    'utilitySkills': utility,
    'hiddenSkills': hidden,
    'flawedSets': flawed,
    'forbiddenSkills': forbidden,
}
with open(os.path.join(OUT, 'SkillData.json'), 'w', encoding='utf-8') as f:
    json.dump(skill_data, f, ensure_ascii=False, indent=1)
print('SkillData: kimDan', len(kd_skills), '| utility', sum(len(v) for v in utility.values()),
      '| hidden', len(hidden), '| flawed', len(flawed), '| forbidden', len(forbidden))

# ---------------- NPCData: 200 NPC × 25 map (10 thành phố + 15 nghề phụ) ----------------
FUNCTIONAL = (
    [('he_thong', r) for r in ['Chủ Tiệm Đan', 'Chủ Tiệm Vũ Khí', 'Chủ Tiệm Nguyên Liệu', 'Đấu Giá Viên', 'Thủ Quỹ Ngân Hàng',
                              'Người Đổi Tiền', 'Người Giao Nhiệm Vụ', 'Sứ Giả Chuyển Sinh', 'Thủ Kho', 'Người Giữ Cổng Dịch Chuyển']] +
    [('cot_truyen', r) for r in ['Trưởng Thành', 'Thư Ký Thành', 'Đội Trưởng Lính Gác', 'Người Áo Đen (Nhiệm Vụ Ẩn)',
                                'Sứ Giả Tông Môn', 'Thầy Đồ', 'Bà Mối', 'Người Kể Chuyện', 'Trưởng Lão', 'Tiểu Đồng Truyền Tin',
                                'Quan Khâm Sai', 'Nữ Hiệp Giang Hồ', 'Lão Ngư', 'Thợ Săn Già', 'Y Sư Thành', 'Đạo Sĩ Du Phương',
                                'Kiếm Khách Lang Thang', 'Thương Gia Bí Ẩn', 'Người Gác Đền', 'Hòa Thượng Khất Thực']] +
    [('nghe_phu', r) for r in ['Đại Sư Đan Sư', 'Đại Sư Thợ Rèn', 'Đại Sư Trận Pháp', 'Đại Sư Phù Chú', 'Đại Sư Thú Sư',
                              'Trợ Lý Đan Sư', 'Trợ Lý Thợ Rèn', 'Trợ Lý Trận Pháp', 'Trợ Lý Phù Chú', 'Trợ Lý Thú Sư']] +
    [('dac_biet', r) for r in ['Người Bán Công Pháp Hiếm', 'Người Bán Mảnh Công Pháp Ẩn', 'Người Tặng Quà', 'Thầy Bói',
                              'Người Đổi Linh Thạch', 'Sứ Giả Thiên Ngoại', 'Người Thu Mua Kỳ Vật', 'Lão Tổ Về Hưu',
                              'Tiểu Yêu Tinh Nghịch', 'Người Giữ Bí Mật']]
)
assert len(FUNCTIONAL) == 50, len(FUNCTIONAL)
AMBIENT_TYPES = [
    ('dan_thuong', 'Dân thường', ['Hôm nay trời đẹp nhỉ?', 'Năm nay lúa tốt, nhà nhà no ấm.', 'Nghe nói bãi farm ngoài thành có sói dữ lắm.', 'Con nhà tôi mới đo được linh căn tam phẩm!']),
    ('tu_si', 'Tu sĩ lữ hành', ['Ta vừa từ Thiên Cương Kim Sơn trở về, suýt mất mạng...', 'Đường tu tiên dài đằng đẵng, chớ vội vàng.', 'Ngươi có thấy linh khí hôm nay loãng hơn không?', 'Ta đang tìm một vị dược dẫn, ngươi có thấy không?']),
    ('thuong_nhan', 'Thương nhân rong', ['Hàng rẻ đây, xem thử đi!', 'Mua nhiều giảm giá, chỉ hôm nay thôi!', 'Ta đi khắp 10 thành, hàng của ta là tốt nhất.', 'Có kỳ vật gì muốn bán cho ta không?']),
    ('linh_gac', 'Lính gác', ['Cẩn thận quái ở map bên ngoài!', 'Xuất trình lệnh bài khi qua cổng đêm.', 'Trong thành cấm động thủ, nhớ đấy.', 'Đêm nay ta trực, quái nào dám bén mảng.']),
    ('dac_biet', 'Người ngắm cảnh', ['... (chỉ cười, không nói)', 'Đời người như giấc mộng, tỉnh dậy chỉ còn hư không.', 'Ngươi có nghe tiếng gió kể chuyện xưa không?', 'Đứng đây nhìn mây trôi, cũng là một cách tu luyện.']),
]
HO = ['Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Vũ', 'Đặng', 'Bùi', 'Đỗ', 'Hồ', 'Ngô', 'Dương', 'Lý', 'Trịnh', 'Đinh']
TEN = ['An', 'Bình', 'Cường', 'Dung', 'Đức', 'Hà', 'Hải', 'Hương', 'Khánh', 'Lan', 'Long', 'Mai', 'Minh', 'Ngọc', 'Phong',
       'Quân', 'Sơn', 'Tâm', 'Thanh', 'Thu', 'Tùng', 'Vân', 'Xuân', 'Yến', 'Tuấn', 'Hùng', 'Linh', 'Trang', 'Việt', 'Dũng']
DEM = ['Văn', 'Thị', 'Hữu', 'Đức', 'Thanh', 'Ngọc', 'Minh', 'Xuân', '']

def person_name(rng):
    return f"{rng.choice(HO)} {rng.choice(DEM)}{rng.choice(TEN)}".replace('  ', ' ').strip()

npc_maps = {}
for mp in maps:
    if mp.get('npcProfile') != 'city':
        continue
    rng = random.Random('npc-' + mp['id'])
    used = set()
    def uniq_name():
        for _ in range(50):
            n = person_name(rng)
            if n not in used:
                used.add(n)
                return n
        return person_name(rng) + ' ' + rng.choice(['Nhị', 'Tam', 'Tứ'])
    entries = []
    for i, (group, role) in enumerate(FUNCTIONAL):
        entries.append({'id': f"{mp['id']}_npc_{i+1:03d}", 'name': uniq_name(), 'kind': 'functional',
                        'group': group, 'role': role,
                        'dialogue': [f'Ta là {role} của {mp["name"]}. Ngươi cần gì?']})
    n = 50
    for tkey, tname, pool in AMBIENT_TYPES:
        for _ in range(30):
            n += 1
            entries.append({'id': f"{mp['id']}_npc_{n:03d}", 'name': uniq_name(), 'kind': 'ambient',
                            'group': tkey, 'role': tname, 'dialogue': [rng.choice(pool)]})
    assert len(entries) == 200, (mp['id'], len(entries))
    npc_maps[mp['id']] = {'mapName': mp['name'], 'functional': 50, 'ambient': 150, 'npcs': entries}

npc_data = {
    'meta': {'version': 1, 'source': 'Tài liệu thiết kế mở rộng phần 5 (người chơi, 22/10/2026)',
             'note': 'Mỗi map thành phố/nghề phụ: 200 NPC = 50 chính (10 hệ thống + 20 cốt truyện + 10 nghề phụ + 10 đặc biệt) + 150 phụ (5 nhóm × 30). Tên sinh xác định theo map (seed cố định); thoại phụ lấy từ mẫu trong tài liệu + biến thể.',
             'mapsWithNpc': len(npc_maps), 'npcPerMap': 200, 'totalNpc': sum(len(v['npcs']) for v in npc_maps.values())},
    'maps': npc_maps,
}
with open(os.path.join(OUT, 'NPCData.json'), 'w', encoding='utf-8') as f:
    json.dump(npc_data, f, ensure_ascii=False, indent=1)
print('NPCData:', len(npc_maps), 'maps × 200 =', npc_data['meta']['totalNpc'], 'NPC')
