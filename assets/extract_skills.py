# Trích TOÀN BỘ bảng công pháp từ file thiết kế docx (bảng 7 cột theo lớp × vũ khí)
# → server/data/skills_catalog.json. Chạy lại khi file thiết kế thay đổi.
# Nguồn: ~/workspace/user/files/Thiet_ke_game_tu_tien_ban_hoan_chinh.docx
import re, json, zipfile
from xml.etree import ElementTree as ET

DOCX = '/home/hatch/workspace/user/files/Thiet_ke_game_tu_tien_ban_hoan_chinh.docx'
OUT = '/home/hatch/workspace/tap-tanh-tu-tien-mmo/server/data/skills_catalog.json'
NS = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
W = '{http://schemas.openxmlformats.org/wordprocessingml/2006/main}'

xml = zipfile.ZipFile(DOCX).read('word/document.xml')
body = ET.fromstring(xml).find('w:body', NS)

def cell_text(tc):
    return ''.join(t.text or '' for t in tc.iter(W + 't')).strip()
def para_text(p):
    return ''.join(t.text or '' for t in p.iter(W + 't')).strip()

CLASS_ID = {'Thể tu': 'thetu', 'Phật tu': 'phattu', 'Cốt tu': 'cottu', 'Pháp tu': 'phaptu',
            'Quỷ tu': 'quytu', 'Sát thủ': 'satthu', 'Kiếm tu': 'kiemtu', 'Y tu': 'ytu', 'Nho tu': 'nhotu'}
# Tên vũ khí trong mục lục của file → weaponId trong game (theo lớp)
WEAPON_ID = {
    'thetu': {'Tay không': ['taykhong'], 'Chiến phủ / Cự kiếm / Đao': ['chienphu', 'cukiem', 'daothe'],
              'Thương': ['thuongthe'], 'Thiết côn': ['thietcon']},
    'phattu': {'Phật châu': ['phatchau'], 'Quyền trượng': ['quyentruong'], 'Bình bát': ['binhbat']},
    'cottu': {'Cốt thuẫn': ['cotthuan'], 'Cốt chùy': ['cotchuy']},
    'phaptu': {'Phiến (quạt)': ['phien'], 'Pháp trượng': ['phaptruong'], 'Sách phép': ['sachphep']},
    'quytu': {'Cờ lệnh': ['colenh'], 'Lưỡi hái': ['luoihai'], 'Quỷ thương': ['quythuong']},
    'satthu': {'Dao găm': ['daogam'], 'Song đao': ['songdao'], 'Liềm ngắn': ['liemngan'], 'Trảo': ['trao']},
    'kiemtu': {'Kiếm': ['kiem'], 'Song kiếm': ['songkiem'], 'Trọng kiếm': ['trongkiem']},
    'ytu': {'Phất trần': ['phattran'], 'Kim châm': ['kimcham'], 'Cổ cầm': ['cocam']},
    'nhotu': {'Ngâm thơ (đọc bằng miệng)': ['ngamtho'], 'Bút phép': ['butphep'], 'Quyển trục': ['quyentruc']},
}
STAT_ID = {'Khí huyết': 'khiHuyet', 'Vật công': 'vatCong', 'Vật phòng': 'vatPhong',
           'Pháp công': 'phapCong', 'Pháp phòng': 'phapPhong', 'Tốc độ': 'tocDo', 'Thần thức': 'thanThuc'}
TIER_ID = {'Cơ bản': 'coban', 'Luyện Khí': 'luyenkhi', 'Trúc Cơ': 'trucco'}
TIER_COEF = {'coban': 1.0, 'luyenkhi': 1.6, 'trucco': 2.2}

def parse_cond(text):
    text = (text or '').strip()
    if not text or text == 'Không':
        return []
    text = text.replace('Trúc Cơ +', '').replace('Trúc Cơ', '').strip(' +')
    out = []
    for m in re.finditer(r'(Khí huyết|Vật công|Vật phòng|Pháp công|Pháp phòng|Tốc độ|Thần thức)\s*(\d+)', text):
        out.append({'stat': STAT_ID[m.group(1)], 'value': int(m.group(2))})
    return out

# ===== GĐ34: bóc HIỆU ỨNG ĐẶC BIỆT từ mô tả (tùy chỉnh theo engine của game) =====
# Engine hỗ trợ: choáng (stun), đóng băng (stun mạnh), trói (root — không di
# chuyển), làm chậm (slow), thiêu đốt/độc (dot), hút máu (lifesteal), đẩy lùi
# (knock), xuyên phòng (pierce), giảm sát thương nhận (defBuff), tăng công
# (atkBuff / đòn kế tiếp), phản sát thương (reflect), hồi máu (heal), đánh
# nhiều lần (hits), đánh vùng (aoe), địch yếu đi (vuln — nhận thêm sát thương).
def _num(pat, text, default=None, flags=re.I):
    m = re.search(pat, text, flags)
    return float(m.group(1)) if m else default

def parse_fx(desc, tier, name=""):
    t = desc or ''
    fx = {}
    stun = _num(r'choáng\s*(?:trong\s*)?([\d.]+)\s*s', t)
    if stun is None and 'choáng' in t: stun = 1.0
    if 'đóng băng' in t: stun = max(stun or 0, 1.2)
    if stun: fx['stun'] = min(2.0, stun)
    root = _num(r'trói[^.;:]*?([\d.]+)\s*s', t)
    if root is None and 'trói' in t: root = 1.0
    if root: fx['root'] = min(2.0, root)
    sm = re.search(r'làm chậm\s*(\d+)\s*%[^.;:]*?(\d+(?:\.\d+)?)\s*s', t)
    if sm: fx['slowPct'] = min(60, int(sm.group(1))); fx['slowSec'] = float(sm.group(2))
    elif 'làm chậm' in t:
        p = _num(r'làm chậm\s*(\d+)\s*%', t)
        fx['slowPct'] = min(60, int(p)) if p else 20; fx['slowSec'] = 2.0
    dm = re.search(r'(\d+)\s*sát thương/giây trong\s*(\d+)\s*s', t)
    if dm: fx['dotDps'] = min(25, int(dm.group(1))); fx['dotSec'] = int(dm.group(2))
    elif 'thiêu đốt' in t or 'gây độc' in t or 'nhiễm độc' in t or 'mang độc' in t or 'trúng độc' in t:
        # Nhắc tới đốt/độc mà không ghi số → mức mặc định theo bậc
        fx['dotDps'] = 3 if tier == 'coban' else 5; fx['dotSec'] = 3
    ls = _num(r'hồi\s*(\d+)\s*%\s*sát thương', t)
    if ls is None and 'hút máu' in t: ls = 10
    if ls: fx['lifesteal'] = min(20, int(ls))
    if 'đẩy lùi' in t: fx['knock'] = 70 if 'đẩy lùi mạnh' in t else 46
    pi = _num(r'bỏ qua\s*(\d+)\s*%', t)
    if pi is None and 'xuyên giáp' in t: pi = 15
    if pi: fx['pierce'] = min(50, int(pi))
    db = re.search(r'giảm\s*(\d+)\s*%\s*sát thương nhận[^.;:]*?(\d+(?:\.\d+)?)\s*s', t)
    if db: fx['defPct'] = int(db.group(1)); fx['defSec'] = float(db.group(2))
    elif 'giảm sát thương nhận' in t or 'hấp thụ sát thương' in t:
        fx['defPct'] = 30 if 'hấp thụ' in t else 25; fx['defSec'] = 3.0
    if 'đòn kế tiếp mạnh hơn' in t: fx['nextMul'] = 1.5
    ab = _num(r'tăng\s*(\d+)\s*%\s*sát thương', t)
    if ab: fx['atkPct'] = int(ab); fx['atkSec'] = 4.0
    rf = _num(r'phản\s*(\d+)\s*%\s*sát thương', t)
    if rf is None and 'phản một phần sát thương' in t: rf = 20
    if rf: fx['reflect'] = int(rf); fx['reflectSec'] = 4.0
    hm = re.search(r'(\d+)\s*lần liên tiếp', t)
    if hm: fx['hits'] = min(3, int(hm.group(1))); fx['hitGrowth'] = 0.2
    hp = _num(r'hồi\s*(\d+)\s*%\s*máu', t)
    if hp is None: hp = _num(r'hồi phục\s*(\d+)\s*%', t)
    if hp is None and 'hồi nhẹ máu' in t: hp = 5
    if hp is None and 'hồi máu theo thời gian' in t: hp = 8
    if hp: fx['healPct'] = int(hp)
    vd = re.search(r'giảm\s*(\d+)\s*%\s*(?:Vật phòng|Pháp phòng)', t)
    if vd: fx['vuln'] = int(vd.group(1)); fx['vulnSec'] = 4.0
    cong = t.split(';')[0]
    if re.search(r'vùng|quét vòng|sóng|nổ|xung quanh|tất cả kẻ', cong): fx['aoe'] = 85
    # GĐ34 chỉnh theo game: chiêu CƠ BẢN — mô tả liệt kê biến thể của CẢ 5 hệ
    # nên nếu lấy hợp nhất sẽ thành chiêu "ôm đồm" 4–5 hiệu ứng. Giới hạn tối
    # đa 2 hiệu ứng, ưu tiên theo bản sắc chiêu (tên có "Hộ" → thiên thủ).
    if tier == 'coban':
        main_keys = [k for k in fx if k not in ('slowSec', 'dotSec', 'defSec', 'atkSec', 'reflectSec', 'vulnSec', 'hitGrowth')]
        if len(main_keys) > 2:
            if 'Hộ' in (name or ''):
                prio = ['defPct', 'reflect', 'healPct', 'nextMul', 'stun', 'root', 'slowPct']
            else:
                prio = ['stun', 'root', 'dotDps', 'pierce', 'slowPct', 'knock', 'healPct', 'lifesteal', 'aoe', 'vuln', 'atkPct', 'hits']
            keep = [k for k in prio if k in fx][:2]
            companions = {'slowPct': 'slowSec', 'dotDps': 'dotSec', 'defPct': 'defSec', 'atkPct': 'atkSec', 'reflect': 'reflectSec', 'vuln': 'vulnSec', 'hits': 'hitGrowth'}
            allowed = set(keep) | {companions[k] for k in keep if k in companions}
            fx = {k: v for k, v in fx.items() if k in allowed}
    return fx

def fx_text(fx):
    parts = []
    if fx.get('stun'): parts.append(f"Choáng {fx['stun']}s")
    if fx.get('root'): parts.append(f"Trói {fx['root']}s")
    if fx.get('slowPct'): parts.append(f"Chậm {fx['slowPct']}%/{fx['slowSec']}s")
    if fx.get('dotDps'): parts.append(f"Đốt/độc {fx['dotDps']}/s×{fx['dotSec']}s")
    if fx.get('lifesteal'): parts.append(f"Hút máu {fx['lifesteal']}%")
    if fx.get('knock'): parts.append('Đẩy lùi')
    if fx.get('pierce'): parts.append(f"Xuyên phòng {fx['pierce']}%")
    if fx.get('defPct'): parts.append(f"Giảm {fx['defPct']}% sát thương nhận/{fx['defSec']}s")
    if fx.get('atkPct'): parts.append(f"+{fx['atkPct']}% công/{fx['atkSec']}s")
    if fx.get('nextMul'): parts.append('Đòn kế ×1.5')
    if fx.get('reflect'): parts.append(f"Phản {fx['reflect']}%")
    if fx.get('hits'): parts.append(f"Đánh {fx['hits']} lần")
    if fx.get('healPct'): parts.append(f"Hồi {fx['healPct']}% máu")
    if fx.get('vuln'): parts.append(f"Địch yếu +{fx['vuln']}% sát thương nhận")
    if fx.get('aoe'): parts.append('Đánh vùng')
    return ' · '.join(parts)

catalog = {}
counters = {}
section = None  # (classId, [weaponIds])
unmapped = []
total = 0
for child in body:
    tag = child.tag.split('}')[1]
    if tag == 'p':
        t = para_text(child)
        m = re.match(r'^(Thể tu|Phật tu|Cốt tu|Pháp tu|Quỷ tu|Sát thủ|Kiếm tu|Y tu|Nho tu):\s*(.+)$', t)
        if m:
            cid = CLASS_ID[m.group(1)]
            wname = m.group(2).strip()
            wids = WEAPON_ID.get(cid, {}).get(wname)
            if wids:
                section = (cid, wids)
            else:
                unmapped.append(t)
                section = None
    elif tag == 'tbl':
        rows = [[cell_text(tc) for tc in tr.findall('w:tc', NS)] for tr in child.findall('w:tr', NS)]
        if not rows or not rows[0] or rows[0][0].strip() != 'Công pháp' or not section:
            continue
        cid, wids = section
        for r in rows[1:]:
            if len(r) < 7:
                continue
            name, element, bac, cond_text, cd_text, cost_text, desc = [c.strip() for c in r[:7]]
            tier = TIER_ID.get(bac)
            if not tier or not name:
                continue
            m = re.match(r'([\d.]+)s', cd_text)
            cd_ms = int(float(m.group(1)) * 1000) if m else 1000
            cost = int(re.sub(r'\D', '', cost_text) or 0)
            for wid in wids:
                key = (cid, wid, tier)
                counters[key] = counters.get(key, 0) + 1
                sid = f"{cid}_{wid}_{tier[:2]}{counters[key]}"
                fx = parse_fx(desc, tier, name)
                catalog.setdefault(cid, {}).setdefault(wid, []).append({
                    'id': sid, 'name': name, 'element': element, 'tier': tier,
                    'coef': TIER_COEF[tier], 'cdMs': cd_ms, 'cost': cost,
                    'cond': parse_cond(cond_text), 'condText': cond_text,
                    'desc': desc, 'weaponId': wid,
                    'fx': fx, 'fxText': fx_text(fx),
                })
                total += 1

json.dump(catalog, open(OUT, 'w'), ensure_ascii=False, indent=1)
by_tier = {}
for cid, byw in catalog.items():
    for wid, lst in byw.items():
        for s in lst:
            by_tier[s['tier']] = by_tier.get(s['tier'], 0) + 1
print('sections unmapped:', unmapped)
print('total skill entries (gồm vũ khí dùng chung bảng):', total)
print('by tier:', by_tier)
print('weapons covered:', sum(len(v) for v in catalog.values()))
