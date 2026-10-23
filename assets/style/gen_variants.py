"""Sinh biến thể sprite từ bộ hero gốc (PixelLab) bằng thay bảng màu theo bậc sáng.
Giữ nguyên shading: mỗi màu gốc trong cụm được ánh xạ sang tông đích có cùng độ sáng tương đối.
Cụm áo teal -> đổi sắc (hue) giữ S/V. Cụm tóc -> Trưởng Làng hoá bạc. Thêm râu pixel cho Trưởng Làng."""
from PIL import Image
import colorsys, os, glob

SRC = '/home/hatch/workspace/tap-tanh-tu-tien-mmo/client/public/sprites/hero'
ROOT = '/home/hatch/workspace/tap-tanh-tu-tien-mmo/client/public/sprites'

TEALS = ['#164950', '#23585e', '#256a6c', '#2d797a', '#338383', '#3e928d', '#4da39a']
HAIRS = ['#21232b', '#32323c', '#41424d', '#525661', '#5f6674']
SKINS = ['#fcceba', '#f9baa4', '#f2a894', '#ea8676']

def hx2rgb(h): return tuple(int(h[i:i+2], 16) for i in (1, 3, 5))
def shift(rgb, hue=None, sat_mul=1.0, val_mul=1.0, sat_set=None, val_set=None):
    r, g, b = [x / 255 for x in rgb]
    h, s, v = colorsys.rgb_to_hsv(r, g, b)
    if hue is not None: h = hue
    s = s * sat_mul if sat_set is None else sat_set
    v = v * val_mul if val_set is None else val_set
    r, g, b = colorsys.hsv_to_rgb(h % 1.0, max(0, min(1, s)), max(0, min(1, v)))
    return (round(r * 255), round(g * 255), round(b * 255))

def build_map(robe_hue=None, robe_sat=1.0, silver_hair=False):
    m = {}
    if robe_hue is not None:
        for t in TEALS:
            m[hx2rgb(t)] = shift(hx2rgb(t), hue=robe_hue, sat_mul=robe_sat)
    if silver_hair:
        for t in HAIRS:
            r, g, b = [x / 255 for x in hx2rgb(t)]
            h, s, v = colorsys.rgb_to_hsv(r, g, b)
            m[hx2rgb(t)] = shift(hx2rgb(t), sat_set=0.06, val_set=min(1.0, 0.25 + v * 1.15))
    return m

def apply_map(im, m):
    px = im.load()
    for y in range(im.height):
        for x in range(im.width):
            p = px[x, y]
            if p[3] > 200 and p[:3] in m:
                px[x, y] = (*m[p[:3]], p[3])
    return im

BEARD_L = (198, 206, 211)  # bạc vừa — tách khỏi cổ áo trắng
BEARD_D = (158, 167, 173)  # bạc tối (bóng)

def add_beard(im, direction):
    """Vẽ râu dài phủ ngực cho hướng south/east/west: mảng pixel bạc bám dưới vùng da mặt."""
    px = im.load()
    skin_all = [(x, y) for y in range(im.height) for x in range(im.width)
                if px[x, y][3] > 200 and px[x, y][:3] in [hx2rgb(s) for s in SKINS]]
    if not skin_all: return im
    top = min(p[1] for p in skin_all)
    # chỉ lấy cụm da MẶT (gần đỉnh đầu nhất) — tránh lẫn tay cũng màu da
    skin_pts = [(x, y) for (x, y) in skin_all if y <= top + 24]
    xs = [p[0] for p in skin_pts]; ys = [p[1] for p in skin_pts]
    chin = max(ys); cx = (min(xs) + max(xs)) // 2
    if direction == 'south':
        rows = [(0, 3), (1, 4), (2, 4), (3, 4), (4, 3), (5, 3), (6, 2)]  # (dy, half-width) — râu thuôn dài
        for dy, hw in rows:
            for dx in range(-hw, hw + 1):
                x, y = cx + dx, chin + 1 + dy
                if 0 <= x < im.width and 0 <= y < im.height and px[x, y][3] > 200:
                    px[x, y] = (*(BEARD_D if abs(dx) == hw or dy >= 5 else BEARD_L), 255)
    elif direction in ('east', 'west'):
        front = max(xs) if direction == 'east' else min(xs)
        step = 1 if direction == 'east' else -1
        for dy in range(0, 6):
            for k in range(0, 3):
                x, y = front - step * k + (step if dy > 3 else 0) * 0, chin + 1 + dy
                x = front - step * k
                if 0 <= x < im.width and 0 <= y < im.height and px[x, y][3] > 200:
                    px[x, y] = (*(BEARD_D if k == 2 else BEARD_L), 255)
    return im

VARIANTS = {
    'elder':    dict(robe_hue=0.63, robe_sat=0.55, silver_hair=True, beard=True),   # Trưởng Làng: áo chàm trầm + tóc/râu bạc
    'shopdan':  dict(robe_hue=0.07, robe_sat=0.75),                                  # Chủ Tiệm Đan: áo nâu gỉ ấm
    'shopnl':   dict(robe_hue=0.23, robe_sat=0.65),                                  # Chủ Tiệm Nguyên Liệu: áo xanh ô-liu
    'villager-a': dict(robe_hue=0.58, robe_sat=0.45),                                # dân làng: xanh bụi
    'villager-b': dict(robe_hue=0.83, robe_sat=0.40),                                # dân làng: tím mận nhạt
    'villager-c': dict(robe_hue=0.11, robe_sat=0.55),                                # dân làng: nâu cát
    'envoy':    dict(robe_hue=0.12, robe_sat=0.95),                                  # GĐ42: Sứ Giả Tông Môn — áo vàng hổ phách trang trọng
    'merchant': dict(robe_hue=0.78, robe_sat=0.55),                                  # GĐ42: Thương Nhân Lưu Động — áo tím trầm
    'rival':    dict(robe_hue=0.0, robe_sat=0.80),                                   # GĐ42: Tu Sĩ Thù Địch — áo đỏ sẫm
}

for name, cfg in VARIANTS.items():
    outdir = os.path.join(ROOT, name)
    os.makedirs(outdir, exist_ok=True)
    m = build_map(cfg.get('robe_hue'), cfg.get('robe_sat', 1.0), cfg.get('silver_hair', False))
    for f in glob.glob(os.path.join(SRC, '*.png')):
        im = Image.open(f).convert('RGBA')
        im = apply_map(im, m)
        base = os.path.basename(f)
        if cfg.get('beard'):
            d = base.replace('idle-', '').replace('walk-', '').split('-')[0] if '-' in base else ''
            direction = base.split('-')[1].replace('.png', '') if base.startswith(('idle-', 'walk-')) else ''
            if direction in ('south', 'east', 'west'):
                im = add_beard(im, direction)
        im.save(os.path.join(outdir, base))
    print(name, 'done', len(os.listdir(outdir)))
