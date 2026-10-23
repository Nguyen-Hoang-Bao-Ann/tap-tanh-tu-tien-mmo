"""Vũ khí pixel bản hoàn thiện cao v2: khổ 64x80, điểm cầm (32, 66).
Mỗi món 3-4 tông màu/chất liệu, viền chọn lọc, chi tiết trang trí."""
from PIL import Image, ImageDraw
import math, os

OUT = '/home/hatch/workspace/tap-tanh-tu-tien-mmo/client/public/sprites/weapons'
W, H, GX, GY = 64, 80, 32, 66
OL = (26, 20, 10, 255)
STEEL = (186, 193, 201, 255); STEEL_L = (232, 236, 240, 255); STEEL_D = (110, 116, 124, 255); STEEL_DD = (74, 79, 86, 255)
IRON = (88, 92, 100, 255); IRON_L = (128, 133, 141, 255)
WOOD = (122, 88, 52, 255); WOOD_L = (150, 112, 68, 255); WOOD_D = (84, 58, 32, 255)
GOLD = (225, 163, 68, 255); GOLD_L = (246, 196, 96, 255); GOLD_D = (166, 116, 38, 255)
BONE = (236, 230, 214, 255); BONE_D = (203, 208, 190, 255); BONE_DD = (164, 170, 150, 255)
RED = (198, 62, 46, 255); RED_D = (146, 32, 24, 255); RED_L = (228, 100, 80, 255)
PAPER = (244, 231, 196, 255); PAPER_D = (206, 196, 170, 255)
JADE = (94, 220, 200, 255); JADE_D = (46, 156, 146, 255)
PURPLE = (156, 82, 220, 255); PURPLE_L = (205, 150, 248, 255); PURPLE_D = (104, 44, 158, 255)
GEM_R = (232, 64, 84, 255); GEM_B = (84, 160, 240, 255)

def new():
    im = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    return im, ImageDraw.Draw(im)

def grip(d, y0=GY - 9, y1=GY + 2, color=WOOD_D, wrap=RED_D):
    d.rectangle([GX - 3, y0, GX + 2, y1], fill=color, outline=OL)
    for yy in range(y0 + 1, y1 - 1, 3):  # chỉ quấn chéo
        d.line([GX - 3, yy, GX + 2, yy + 2], fill=wrap, width=1)
    d.rectangle([GX - 3, y1 - 1, GX + 2, y1 + 1], fill=GOLD_D)  # núm đuôi
    d.rectangle([GX - 1, y1, GX, y1], fill=GOLD_L)

def blade_grad(d, x0, x1, top, base, gem=True):
    """Lưỡi kiếm thẳng: thân + sống sáng giữa + mép tối 2 bên + mũi."""
    mid = (x0 + x1) // 2
    d.polygon([(x0, base), (x0, top + 7), (mid, top), (x1, top + 7), (x1, base)], fill=STEEL, outline=OL)
    d.polygon([(mid - 1, base - 1), (mid - 1, top + 8), (mid, top + 1)], fill=STEEL_L)
    d.polygon([(x1 - 2, base - 1), (x1 - 1, top + 8), (x1, top + 7), (x1, base)], fill=STEEL_D)
    d.rectangle([x0 - 2, base, x1 + 2, base + 3], fill=GOLD, outline=OL)  # chắn tay
    d.rectangle([x0 - 2, base, x1 + 2, base + 1], fill=GOLD_L)
    if gem:
        d.rectangle([mid - 1, base + 1, mid + 1, base + 2], fill=GEM_R)

def sword(blade_w=5, blade_l=38, heavy=False, gem=True):
    im, d = new()
    bw = blade_w + (4 if heavy else 0)
    blade_grad(d, GX - bw // 2, GX + bw // 2, GY - 12 - blade_l, GY - 12, gem)
    if heavy:  # vân khắc trên lưỡi trọng kiếm
        for yy in range(GY - 44, GY - 18, 7):
            d.rectangle([GX, yy, GX + 1, yy + 2], fill=STEEL_D)
    grip(d)
    return im

def dao():
    im, d = new()
    top = GY - 46
    d.polygon([(GX - 3, GY - 12), (GX - 2, top + 10), (GX + 1, top), (GX + 10, top + 2), (GX + 7, top + 10), (GX + 3, GY - 12)], fill=STEEL, outline=OL)
    d.polygon([(GX - 1, GY - 14), (GX, top + 11), (GX + 2, top + 2), (GX + 7, top + 4), (GX + 2, GY - 13)], fill=STEEL_L)
    d.polygon([(GX + 6, top + 3), (GX + 9, top + 4), (GX + 9, top + 8), (GX + 4, GY - 12), (GX + 3, GY - 12)], fill=STEEL_D)
    d.rectangle([GX - 5, GY - 12, GX + 5, GY - 9], fill=GOLD, outline=OL)
    grip(d)
    d.ellipse([GX - 2, GY + 3, GX + 2, GY + 7], outline=GOLD_D, width=1)  # vòng đuôi đao
    return im

def axe():
    im, d = new()
    # cán gỗ có đai sắt
    d.rectangle([GX - 2, 20, GX + 1, GY + 2], fill=WOOD, outline=OL)
    d.rectangle([GX - 2, 20, GX - 1, GY + 2], fill=WOOD_L)
    for yy in (30, 48):
        d.rectangle([GX - 2, yy, GX + 1, yy + 2], fill=IRON)
    # đầu rìu: khối gắn cán + lưỡi trăng lưỡi liềm xòe phải
    d.rectangle([GX - 4, 20, GX + 4, 30], fill=IRON, outline=OL)
    d.rectangle([GX - 4, 20, GX + 4, 22], fill=IRON_L)
    d.polygon([(GX + 3, 21), (GX + 14, 22), (GX + 19, 27), (GX + 19, 34), (GX + 14, 40), (GX + 3, 38)], fill=STEEL, outline=OL)
    d.polygon([(GX + 5, 24), (GX + 13, 25), (GX + 16, 29), (GX + 13, 36), (GX + 5, 35)], fill=STEEL_L)
    d.polygon([(GX + 14, 26), (GX + 18, 30), (GX + 17, 34), (GX + 13, 38), (GX + 12, 33)], fill=STEEL_D)
    # mặt trái: ngạnh búa
    d.polygon([(GX - 4, 23), (GX - 10, 25), (GX - 10, 33), (GX - 4, 34)], fill=STEEL_D, outline=OL)
    # mũi nhọn đỉnh cán
    d.polygon([(GX - 2, 20), (GX, 12), (GX + 2, 20)], fill=STEEL, outline=OL)
    d.rectangle([GX - 1, 15, GX, 19], fill=STEEL_L)
    # đinh vàng trang trí đầu rìu
    d.rectangle([GX - 1, 24, GX + 1, 26], fill=GOLD)
    grip(d, GY - 7, GY + 2)
    return im

def spear(tip_col=STEEL, tip_l=STEEL_L, flame=False):
    im, d = new()
    d.rectangle([GX - 2, 22, GX + 1, GY + 3], fill=WOOD, outline=OL)
    d.rectangle([GX - 2, 22, GX - 1, GY + 3], fill=WOOD_L)
    # tua đỏ xòe dưới mũi
    for dx, ln in ((-4, 10), (-2, 13), (0, 14), (2, 12), (4, 9)):
        d.line([GX + dx // 2, 24, GX + dx, 24 + ln], fill=RED if dx % 4 == 0 else RED_D, width=1)
    d.rectangle([GX - 4, 20, GX + 3, 23], fill=GOLD, outline=OL)
    # mũi lá liễu có sống giữa
    d.polygon([(GX - 4, 21), (GX - 3, 9), (GX, 3), (GX + 3, 9), (GX + 3, 21)], fill=tip_col, outline=OL)
    d.polygon([(GX - 1, 20), (GX - 1, 9), (GX, 4), (GX, 20)], fill=tip_l)
    d.polygon([(GX + 2, 20), (GX + 2, 10), (GX + 3, 9), (GX + 3, 20)], fill=STEEL_D if not flame else JADE_D)
    if flame:  # quỷ thương: lửa ngọc quấn mũi
        d.polygon([(GX + 5, 18), (GX + 9, 11), (GX + 7, 6), (GX + 11, 10), (GX + 8, 20)], fill=JADE)
        d.polygon([(GX - 6, 16), (GX - 9, 10), (GX - 6, 14)], fill=JADE_D)
    d.rectangle([GX - 2, GY + 1, GX + 1, GY + 4], fill=GOLD_D)
    return im

def staff(head='orb'):
    im, d = new()
    d.rectangle([GX - 2, 20, GX + 1, GY + 2], fill=WOOD, outline=OL)
    d.rectangle([GX - 2, 20, GX - 1, GY + 2], fill=WOOD_L)
    for yy in (34, 50):
        d.rectangle([GX - 2, yy, GX + 1, yy + 1], fill=GOLD_D)
    if head == 'orb':
        for dx in (-5, 5):  # 2 ngạnh giữ ngọc
            d.line([GX + dx, 20, GX + int(dx * 0.5), 12], fill=GOLD_D, width=2)
        d.ellipse([GX - 6, 2, GX + 6, 14], fill=GOLD, outline=OL)
        d.ellipse([GX - 3, 4, GX + 1, 8], fill=GOLD_L)
        d.rectangle([GX + 2, 10, GX + 4, 12], fill=GOLD_D)
    elif head == 'crystal':
        for dx in (-6, 6):
            d.polygon([(GX + dx, 21), (GX + int(dx * 0.4), 13), (GX + dx + (2 if dx > 0 else -2), 12)], fill=GOLD_D, outline=OL)
        d.polygon([(GX, 0), (GX + 5, 7), (GX + 3, 16), (GX - 3, 16), (GX - 5, 7)], fill=PURPLE, outline=OL)
        d.polygon([(GX - 1, 3), (GX + 2, 7), (GX - 1, 13)], fill=PURPLE_L)
        d.polygon([(GX + 3, 8), (GX + 4, 7), (GX + 2, 15), (GX + 1, 15)], fill=PURPLE_D)
        d.rectangle([GX - 1, 17, GX + 1, 19], fill=GOLD)
    elif head == 'rings':
        d.ellipse([GX - 6, 1, GX + 6, 13], outline=GOLD, width=2)
        d.ellipse([GX - 6, 1, GX + 6, 13], outline=GOLD_L, width=1)
        for dx in (-9, -3, 3, 9):
            d.ellipse([GX + dx - 2, 12, GX + dx + 2, 18], outline=GOLD_D, width=1)
        d.rectangle([GX - 2, 13, GX + 1, 21], fill=GOLD_D, outline=OL)
    grip(d, GY - 8, GY + 2)
    return im

def rod():
    im, d = new()
    d.rectangle([GX - 3, 10, GX + 2, GY + 2], fill=IRON, outline=OL)
    d.rectangle([GX - 3, 10, GX - 2, GY + 2], fill=IRON_L)
    for yy in (10, 26, 42, GY - 4):
        d.rectangle([GX - 3, yy, GX + 2, yy + 2], fill=GOLD_D)
    d.rectangle([GX - 3, 8, GX + 2, 10], fill=GOLD)
    return im

def beads():
    im, d = new()
    for i in range(11):
        a = i / 11 * 2 * math.pi
        x, y = GX + int(11 * math.sin(a)), 24 + int(12 * math.cos(a))
        d.ellipse([x - 3, y - 3, x + 2, y + 2], fill=WOOD, outline=OL)
        d.rectangle([x - 2, y - 2, x - 1, y - 1], fill=WOOD_L)
    d.ellipse([GX - 3, 37, GX + 3, 43], fill=RED, outline=OL)
    d.rectangle([GX - 1, 38, GX, 40], fill=RED_L)
    for dx in (-2, 0, 2):
        d.line([GX + dx, 43, GX + dx * 2, 52], fill=RED_D, width=1)
    return im

def bowl():
    im, d = new()
    cy = GY - 18
    d.rectangle([GX - 13, cy + 1, GX + 13, cy + 4], fill=GOLD_L, outline=OL)  # vành bát
    d.rectangle([GX - 13, cy + 2, GX + 13, cy + 3], fill=GOLD)
    d.pieslice([GX - 12, cy - 8, GX + 12, cy + 14], 0, 180, fill=GOLD, outline=OL)
    d.pieslice([GX - 9, cy - 6, GX + 9, cy + 10], 0, 180, fill=GOLD_D)
    d.rectangle([GX - 8, cy + 1, GX - 5, cy + 6], fill=GOLD_L)
    d.rectangle([GX - 5, cy + 12, GX + 5, cy + 15], fill=GOLD_D, outline=OL)  # chân đế
    return im

def shield():
    im, d = new()
    d.polygon([(GX - 14, 12), (GX + 14, 12), (GX + 12, 34), (GX, 50), (GX - 12, 34)], fill=BONE, outline=OL)
    d.polygon([(GX - 10, 16), (GX + 10, 16), (GX + 9, 32), (GX, 44), (GX - 9, 32)], fill=BONE_D)
    d.polygon([(GX - 6, 20), (GX + 6, 20), (GX + 5, 30), (GX, 39), (GX - 5, 30)], fill=BONE)
    d.ellipse([GX - 4, 23, GX + 4, 31], fill=BONE_DD, outline=OL)  # núm xương
    d.rectangle([GX - 1, 25, GX + 1, 29], fill=BONE)
    for (x0, y0, x1, y1) in ((-9, 18, -6, 24), (8, 20, 6, 27), (-4, 38, -2, 42)):  # vết nứt
        d.line([GX + x0, y0, GX + x1, y1], fill=BONE_DD, width=1)
    return im

def club():
    im, d = new()
    d.polygon([(GX - 3, GY), (GX - 6, 22), (GX - 5, 12), (GX + 5, 12), (GX + 6, 22), (GX + 3, GY)], fill=BONE, outline=OL)
    d.polygon([(GX - 3, GY), (GX - 4, 22), (GX - 4, 14), (GX - 1, 14), (GX - 1, GY)], fill=(246, 241, 226, 255))
    for yy in (20, 30, 40, 50):
        d.rectangle([GX - 6 + (1 if yy > 30 else 0), yy, GX + 5, yy + 2], fill=BONE_D)
    d.ellipse([GX - 5, 6, GX + 5, 14], fill=BONE, outline=OL)
    d.ellipse([GX - 2, 8, GX + 1, 11], fill=BONE_D)
    grip(d, GY - 6, GY + 2, color=BONE_DD, wrap=RED_D)
    return im

def flag():
    im, d = new()
    d.rectangle([GX - 8, 8, GX - 7, GY + 3], fill=WOOD_D, outline=OL)
    d.polygon([(GX - 8, 3), (GX - 4, 8), (GX - 8, 13)], fill=STEEL, outline=OL)  # mũi cờ
    # lá cờ bay sóng
    d.polygon([(GX - 6, 10), (GX + 12, 12), (GX + 16, 17), (GX + 12, 22), (GX + 15, 28), (GX - 6, 30)], fill=RED, outline=OL)
    d.polygon([(GX - 6, 10), (GX + 12, 12), (GX + 14, 16), (GX - 6, 17)], fill=RED_L)
    d.polygon([(GX - 6, 24), (GX + 13, 24), (GX + 15, 28), (GX - 6, 30)], fill=RED_D)
    # chữ "LỆNH" giả bằng nét vàng
    d.rectangle([GX + 1, 15, GX + 8, 17], fill=GOLD)
    d.rectangle([GX + 4, 13, GX + 5, 23], fill=GOLD)
    d.rectangle([GX + 2, 20, GX + 7, 22], fill=GOLD)
    for dx in range(-4, 14, 4):  # tua dưới cờ
        d.line([GX + dx, 30, GX + dx, 34], fill=GOLD_D, width=1)
    return im

def scythe():
    im, d = new()
    d.line([GX - 10, GY + 3, GX + 2, 18], fill=WOOD_D, width=3)
    d.line([GX - 9, GY + 2, GX + 3, 19], fill=WOOD, width=1)
    # lưỡi cong lớn
    d.polygon([(GX + 1, 19), (GX + 8, 8), (GX + 20, 3), (GX + 30, 6), (GX + 31, 10), (GX + 20, 9), (GX + 10, 13), (GX + 3, 22)], fill=STEEL, outline=OL)
    d.polygon([(GX + 8, 9), (GX + 19, 5), (GX + 27, 7), (GX + 19, 7), (GX + 10, 11)], fill=STEEL_L)
    d.polygon([(GX + 20, 8), (GX + 29, 9), (GX + 28, 10), (GX + 19, 9)], fill=STEEL_D)
    d.rectangle([GX - 1, 17, GX + 4, 22], fill=GOLD_D, outline=OL)
    d.rectangle([GX - 12, GY - 8, GX - 8, GY - 3], fill=WOOD_D, outline=OL)  # tay cầm phụ
    return im

def sickle():
    im, d = new()
    d.rectangle([GX - 2, GY - 20, GX + 2, GY + 2], fill=WOOD_D, outline=OL)
    for yy in range(GY - 18, GY, 4):
        d.line([GX - 2, yy, GX + 2, yy + 2], fill=RED_D, width=1)
    d.polygon([(GX + 1, GY - 18), (GX + 4, GY - 30), (GX + 12, GY - 35), (GX + 18, GY - 33), (GX + 19, GY - 29), (GX + 10, GY - 26), (GX + 4, GY - 16)], fill=STEEL, outline=OL)
    d.polygon([(GX + 5, GY - 28), (GX + 12, GY - 32), (GX + 16, GY - 31), (GX + 10, GY - 27)], fill=STEEL_L)
    return im

def claw():
    im, d = new()
    d.rectangle([GX - 7, GY - 10, GX + 7, GY + 1], fill=IRON, outline=OL)
    d.rectangle([GX - 7, GY - 10, GX + 7, GY - 8], fill=IRON_L)
    for dx in (-5, 0, 5):
        d.polygon([(GX + dx - 2, GY - 10), (GX + dx - 1, GY - 26), (GX + dx + 1, GY - 28), (GX + dx + 2, GY - 10)], fill=STEEL, outline=OL)
        d.polygon([(GX + dx - 1, GY - 12), (GX + dx, GY - 24), (GX + dx + 1, GY - 12)], fill=STEEL_L)
    return im

def dagger():
    im, d = new()
    d.polygon([(GX - 3, GY - 14), (GX - 2, GY - 30), (GX, GY - 34), (GX + 3, GY - 30), (GX + 3, GY - 14)], fill=STEEL, outline=OL)
    d.polygon([(GX - 1, GY - 15), (GX - 1, GY - 29), (GX, GY - 32), (GX, GY - 15)], fill=STEEL_L)
    d.rectangle([GX - 6, GY - 14, GX + 5, GY - 11], fill=GOLD, outline=OL)
    d.rectangle([GX - 1, GY - 13, GX, GY - 12], fill=GEM_B)
    grip(d, GY - 11, GY + 2)
    return im

def fan():
    im, d = new()
    cx, cy = GX, GY - 12
    for i in range(9):  # giấy quạt xòe có viền đỏ + mặt trời
        a0 = math.radians(180 + i * 22.5)
    d.pieslice([cx - 22, cy - 22, cx + 22, cy + 22], 180, 360, fill=PAPER, outline=OL)
    d.pieslice([cx - 22, cy - 22, cx + 22, cy + 22], 180, 360, outline=RED_D)
    d.ellipse([cx - 6, cy - 17, cx + 6, cy - 5], fill=RED)  # mặt trời đỏ
    d.ellipse([cx - 6, cy - 17, cx + 6, cy - 5], outline=RED_D)
    for i in range(9):
        a = math.radians(180 + i * 22.5 + 11)
        d.line([cx, cy, cx + int(21 * math.cos(a)), cy + int(21 * math.sin(a))], fill=GOLD_D, width=1)
    d.rectangle([cx - 2, cy - 1, cx + 2, GY + 2], fill=WOOD_D, outline=OL)
    d.rectangle([cx - 1, GY, cx + 1, GY + 2], fill=GOLD)
    return im

def whisk():
    im, d = new()
    d.rectangle([GX - 2, GY - 22, GX + 2, GY + 2], fill=RED_D, outline=OL)
    d.rectangle([GX - 2, GY - 22, GX + 2, GY - 19], fill=GOLD)
    d.rectangle([GX - 2, GY - 8, GX + 2, GY - 6], fill=GOLD_D)
    for i, dx in enumerate(range(-9, 10, 2)):  # chùm lông 2 tông, cong ra 2 bên
        tone = (242, 240, 233, 255) if i % 2 == 0 else (214, 212, 200, 255)
        top_y = GY - 52 + abs(dx) * 1.6
        d.line([GX, GY - 22, GX + dx, top_y], fill=tone, width=1)
        d.line([GX + dx, top_y, GX + dx + (1 if dx >= 0 else -1), top_y + 5], fill=tone, width=1)
    return im

def book():
    im, d = new()
    d.rectangle([GX - 12, GY - 34, GX + 11, GY - 6], fill=(128, 46, 34, 255), outline=OL)
    d.rectangle([GX - 10, GY - 32, GX + 9, GY - 8], fill=PAPER, outline=OL)
    d.rectangle([GX - 1, GY - 32, GX, GY - 8], fill=PAPER_D)
    for yy in (GY - 28, GY - 23, GY - 18, GY - 13):
        d.line([GX - 7, yy, GX - 3, yy], fill=STEEL_D, width=1)
        d.line([GX + 3, yy, GX + 7, yy], fill=STEEL_D, width=1)
    for (cx, cy) in ((GX - 12, GY - 34), (GX + 11, GY - 34), (GX - 12, GY - 6), (GX + 11, GY - 6)):
        d.rectangle([cx - 1, cy - 1, cx + 1, cy + 1], fill=GOLD)
    d.rectangle([GX + 8, GY - 22, GX + 11, GY - 18], fill=GOLD_D, outline=OL)  # khóa sách
    return im

def needle():
    im, d = new()
    d.line([GX, GY - 6, GX, GY - 56], fill=STEEL_L, width=1)
    d.line([GX + 1, GY - 6, GX + 1, GY - 52], fill=STEEL_D, width=1)
    d.rectangle([GX, GY - 58, GX, GY - 56], fill=STEEL_L)  # đầu kim
    d.ellipse([GX - 3, GY - 6, GX + 3, GY], fill=GOLD, outline=OL)
    # chỉ đỏ xoắn
    for i, (dx, yy) in enumerate(((3, 2), (5, 6), (3, 10), (5, 14))):
        d.line([GX, GY + i * 0, GX, GY])  # noop giữ cấu trúc
        d.line([GX + 1, GY - 2 + i * 4, GX + dx, GY + yy - 8], fill=RED, width=1)
    return im

def lute():
    im, d = new()
    d.polygon([(GX - 5, 4), (GX + 5, 4), (GX + 9, 28), (GX + 7, 48), (GX, 56), (GX - 7, 48), (GX - 9, 28)], fill=WOOD, outline=OL)
    d.polygon([(GX - 3, 6), (GX + 3, 6), (GX + 6, 28), (GX + 4, 46), (GX, 52), (GX - 4, 46), (GX - 6, 28)], fill=WOOD_L)
    d.ellipse([GX - 3, 30, GX + 3, 38], fill=WOOD_D, outline=OL)  # lỗ âm
    for dx in (-3, -1, 1, 3):
        d.line([GX + dx, 6, GX + dx, 50], fill=PAPER_D, width=1)
    d.rectangle([GX - 5, 1, GX + 5, 4], fill=WOOD_D, outline=OL)
    for dx in (-4, 0, 4):
        d.rectangle([GX + dx - 1, 0, GX + dx + 1, 2], fill=GOLD_D)
    return im

def brush():
    im, d = new()
    d.rectangle([GX - 3, GY - 44, GX + 2, GY - 10], fill=RED_D, outline=OL)
    d.rectangle([GX - 3, GY - 44, GX - 2, GY - 10], fill=RED_L)
    for yy in (GY - 44, GY - 30, GY - 16):
        d.rectangle([GX - 3, yy, GX + 2, yy + 1], fill=GOLD_D)
    d.rectangle([GX - 4, GY - 12, GX + 3, GY - 8], fill=GOLD, outline=OL)  # đai đồng
    d.polygon([(GX - 4, GY - 8), (GX + 3, GY - 8), (GX + 2, GY + 2), (GX, GY + 5), (GX - 2, GY + 2)], fill=(42, 40, 46, 255), outline=OL)
    d.rectangle([GX - 1, GY - 6, GX, GY], fill=(84, 80, 90, 255))
    return im

def scroll():
    im, d = new()
    d.rectangle([GX - 4, GY - 42, GX + 3, GY - 4], fill=PAPER, outline=OL)
    d.rectangle([GX - 4, GY - 42, GX - 3, GY - 4], fill=PAPER_D)
    d.ellipse([GX - 4, GY - 46, GX + 3, GY - 39], fill=PAPER_D, outline=OL)
    d.ellipse([GX - 2, GY - 44, GX + 1, GY - 41], fill=(176, 164, 138, 255))
    d.rectangle([GX - 5, GY - 26, GX + 4, GY - 23], fill=RED, outline=OL)  # dây buộc
    d.line([GX + 4, GY - 24, GX + 7, GY - 18], fill=RED_D, width=1)
    d.rectangle([GX - 5, GY - 5, GX + 4, GY - 2], fill=WOOD_D, outline=OL)
    d.rectangle([GX - 2, GY - 2, GX + 1, GY + 1], fill=GOLD_D)
    return im

WEAPONS = {
    'chienphu': axe, 'cukiem': lambda: sword(5, 40, heavy=True), 'daothe': dao,
    'thuongthe': lambda: spear(), 'thietcon': rod,
    'phatchau': beads, 'quyentruong': lambda: staff('rings'), 'binhbat': bowl,
    'cotthuan': shield, 'cotchuy': club,
    'colenh': flag, 'luoihai': scythe, 'quythuong': lambda: spear(JADE, (150, 240, 226, 255), flame=True),
    'daogam': dagger, 'songdao': dao, 'liemngan': sickle, 'trao': claw,
    'kiem': lambda: sword(), 'songkiem': lambda: sword(4, 36), 'trongkiem': lambda: sword(6, 38, heavy=True),
    'phien': fan, 'phaptruong': lambda: staff('crystal'), 'sachphep': book,
    'phattran': whisk, 'kimcham': needle, 'cocam': lute,
    'butphep': brush, 'quyentruc': scroll,
}
import sys
for wid, fn in WEAPONS.items():
    fn().save(os.path.join(OUT, wid + '.png'))
print('đã vẽ lại', len(WEAPONS), 'vũ khí (64x80)')
cols = 7
rows = (len(WEAPONS) + cols - 1) // cols
sheet = Image.new('RGBA', (cols * W, rows * H), (44, 44, 44, 255))
for i, wid in enumerate(WEAPONS):
    sheet.alpha_composite(Image.open(os.path.join(OUT, wid + '.png')), ((i % cols) * W, (i // cols) * H))
sheet = sheet.resize((cols * W * 2, rows * H * 2), Image.NEAREST)
sheet.save('/tmp/weapons_sheet2.png')
print('sheet ok')
