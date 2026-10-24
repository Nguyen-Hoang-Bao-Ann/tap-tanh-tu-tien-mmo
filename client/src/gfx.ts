// ============================================================
// GFX — Lớp đồ họa chuyển từ bản chơi đơn (Canvas 2D minh họa mềm)
// sang bản Client–Server (GĐ9). Các hàm vẽ dưới đây được chuyển
// gần như nguyên văn từ artifact Tập Tành Tu Tiên (drawPerson,
// drawWeaponShape, drawBearPawShape, drawWolf...) — chỉ khác ở
// cách dùng: thay vì vẽ trực tiếp mỗi khung, client NƯỚNG sẵn
// thành texture Phaser lúc khởi động (bake) rồi phát lại khung.
// - Bóng đổ: bản cũ đậm/nhạt theo giờ trong game; bản online chưa
//   có đồng hồ ngày đêm → cố định mức ban trưa.
// - Màu hệ khi kết ấn: bản cũ lấy player.mainElem; ở đây truyền
//   qua opts.elem.
// ============================================================

/* eslint-disable @typescript-eslint/no-explicit-any */

// GĐ71: id chiêu nào có icon thật (game-icons.net, CC BY 3.0) trong
// client/public/icons/ — sinh bởi shottools/gen_skill_icons.py.
import { SKILL_ICON_IDS } from './skill_icons';

export const GFX_CONFIG = {
  palette: { paper: '#efe8d8', ink: '#2e2a26', moss: '#5f7f52', mossDeep: '#42563a', earth: '#a98f66', vermilion: '#c0392b', gold: '#d6b26a' },
  elements: { Kim: '#e8c85a', 'Mộc': '#69a84f', 'Thủy': '#4a90c2', 'Hỏa': '#d84b35', 'Thổ': '#a9805a' } as Record<string, string>,
  gait: { baseStep: 30, stepPerSpeed: 0.045, minStep: 34, maxStep: 52, bobAmp: 1.5 },
  style: { pixel: 3, outline: '#171208', outlineW: 2, sat: 1.18, headScale: 1.3, weaponScale: 1.45, iconPx: 3 }, // GĐ11: sat 1.35 → 1.18 giảm chói màu áo theo phản hồi người chơi
  form: { color: '#7fe3d0', glyphs: ['☰', '☱', '☲', '☳', '☴', '☵', '☶', '☷'], rot: 0.055, rotIn: -0.085, particles: 26 },
  env: { tufts: 900, flowers: 320, stones: 200, shrooms: 80, litter: 150 },
};

// ctx đang nướng — các hàm vẽ của bản cũ dùng biến toàn cục này.
let ctx: CanvasRenderingContext2D;

const _vividCache: Record<string, string> = {};
export function vivid(hex: string): string {
  if (!hex || hex.charAt(0) !== '#' || hex.length < 7) return hex;
  if (_vividCache[hex]) return _vividCache[hex];
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  const mid = (Math.max(r, g, b) + Math.min(r, g, b)) / 2, f = GFX_CONFIG.style.sat;
  const ch = (c: number) => Math.round(Math.max(0, Math.min(255, mid + (c - mid) * f)));
  const out = `rgb(${ch(r)},${ch(g)},${ch(b)})`;
  _vividCache[hex] = out;
  return out;
}

export function shadeHex(hex: string, f: number): string {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.min(255, Math.max(0, Math.round(((n >> 16) & 255) * f)));
  const g = Math.min(255, Math.max(0, Math.round(((n >> 8) & 255) * f)));
  const b = Math.min(255, Math.max(0, Math.round((n & 255) * f)));
  return `rgb(${r},${g},${b})`;
}

// Bóng đổ cố định mức ban trưa (bản online chưa có chu kỳ ngày đêm)
export function shadowAlpha(rgb: string, base: number): string {
  return `rgba(${rgb},${base.toFixed(3)})`;
}

export function roundRect(x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// ---------------- NẮM ĐẤM GẤU (vũ khí tay của Thể tu) ----------------
export function drawBearPawShape(cx: number, cy: number, sc: number): void {
  const OUT = GFX_CONFIG.style.outline;
  const fur = '#8a5a26', furL = '#a9743a', furD = '#6e4519';
  const pad = '#e59a6d', padHi = '#f2b98c', padEdge = '#b96f42';
  function ell(ex: number, ey: number, rx: number, ry: number, col: string, oc: string | null) {
    if (oc) { ctx.fillStyle = oc; ctx.beginPath(); ctx.ellipse(ex, ey, rx + 1.3 * sc, ry + 1.3 * sc, 0, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = col; ctx.beginPath(); ctx.ellipse(ex, ey, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
  }
  function claw(tx: number, ty: number) {
    ctx.fillStyle = OUT;
    ctx.beginPath(); ctx.moveTo(tx - 1.8 * sc, ty + 1.5 * sc); ctx.lineTo(tx + 1.8 * sc, ty + 1.5 * sc); ctx.lineTo(tx, ty - 2.7 * sc); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#f7f3e6';
    ctx.beginPath(); ctx.moveTo(tx - 1 * sc, ty + 1.2 * sc); ctx.lineTo(tx + 1 * sc, ty + 1.2 * sc); ctx.lineTo(tx, ty - 1.9 * sc); ctx.closePath(); ctx.fill();
  }
  const toeX = [-5.3, -1.8, 1.8, 5.3];
  const toeY = [-4.4, -5.3, -5.3, -4.4];
  for (let ci = 0; ci < 4; ci++) claw(cx + toeX[ci] * sc, cy + (toeY[ci] - 1.1) * sc);
  ell(cx, cy + 1.3 * sc, 7 * sc, 5.7 * sc, fur, OUT);
  ell(cx - 1.5 * sc, cy - 0.4 * sc, 4.6 * sc, 3.5 * sc, furL, null);
  for (let ti = 0; ti < 4; ti++) {
    ell(cx + toeX[ti] * sc, cy + toeY[ti] * sc, 1.95 * sc, 1.75 * sc, fur, OUT);
    ell(cx + toeX[ti] * sc, cy + (toeY[ti] + 0.25) * sc, 1.02 * sc, 0.88 * sc, pad, null);
  }
  ell(cx, cy + 2.5 * sc, 3.15 * sc, 2.55 * sc, pad, padEdge);
  ell(cx - 0.85 * sc, cy + 1.8 * sc, 1.25 * sc, 0.95 * sc, padHi, null);
  ctx.fillStyle = OUT; ctx.fillRect(Math.round(cx - 3.5 * sc), Math.round(cy + 6.3 * sc), Math.round(7 * sc), Math.max(2, Math.round(2.7 * sc)));
  ctx.fillStyle = furD; ctx.fillRect(Math.round(cx - 2.9 * sc), Math.round(cy + 6.7 * sc), Math.round(5.8 * sc), Math.max(1, Math.round(1.8 * sc)));
}

// ---------------- VŨ KHÍ CẦM TAY (20 nhóm hình theo loại) ----------------
export function drawWeaponShape(x: number, y: number, cat: string, face: number, wname?: string, accent?: string): void {
  const hx = x + face * 11, hy = y + 2;
  const OUT = GFX_CONFIG.style.outline;
  const ACC = accent || '#ffd83a';
  const steel = '#e9eff8', steelD = '#8fa3bd', wood = '#96622c', woodD = '#5e3c1c', gold = '#ffd83a';
  const F = face;
  function line(x1: number, y1: number, x2: number, y2: number, w: number, col: string) {
    ctx.lineCap = 'round';
    ctx.strokeStyle = OUT; ctx.lineWidth = w + 2.6;
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    ctx.strokeStyle = col; ctx.lineWidth = w;
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    ctx.lineCap = 'butt';
  }
  function blk(bx: number, by: number, bw: number, bh: number, col: string) {
    ctx.fillStyle = OUT; ctx.fillRect(bx - 1.4, by - 1.4, bw + 2.8, bh + 2.8);
    ctx.fillStyle = col; ctx.fillRect(bx, by, bw, bh);
  }
  function dot(cx2: number, cy2: number, r: number, col: string) {
    ctx.fillStyle = OUT; ctx.beginPath(); ctx.arc(cx2, cy2, r + 1.3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = col; ctx.beginPath(); ctx.arc(cx2, cy2, r, 0, Math.PI * 2); ctx.fill();
  }
  if (cat === 'fist') {
    drawBearPawShape(hx, hy + 1, 1.05);
  } else if (cat === 'sword') {
    if (wname === 'Cự kiếm' || wname === 'Trọng kiếm') {
      line(hx, hy, hx + F * 24, hy - 15, wname === 'Trọng kiếm' ? 7 : 5.6, wname === 'Trọng kiếm' ? '#aeb9c9' : steel);
      line(hx + F * 6, hy - 3.7, hx + F * 20, hy - 12.7, 1.4, 'rgba(30,36,48,0.55)');
      line(hx - F * 3.4, hy + 2.2, hx + F * 3.4, hy - 2.2, 3, gold);
      line(hx, hy, hx - F * 5, hy + 4.6, 3.2, woodD);
    } else if (wname === 'Đao') {
      line(hx, hy, hx + F * 15, hy - 10, 5, steel);
      line(hx + F * 13, hy - 9, hx + F * 21, hy - 13, 4, steel);
      line(hx, hy - 1.6, hx + F * 15, hy - 11.6, 1.6, steelD);
      line(hx - F * 3, hy + 2, hx + F * 3, hy - 2, 2.8, '#c22e2e');
      line(hx, hy, hx - F * 4.4, hy + 4, 3, woodD);
    } else {
      line(hx, hy, hx + F * 21, hy - 12.5, 3.6, steel);
      line(hx - F * 3.2, hy + 2, hx + F * 3.2, hy - 2, 2.8, gold);
      line(hx, hy, hx - F * 4.6, hy + 4.2, 3, woodD);
      dot(hx - F * 1.6, hy + 1, 1.7, ACC);
    }
  } else if (cat === 'dagger') {
    line(hx, hy, hx + F * 14, hy - 8.5, 3, steel);
    line(hx - F * 2.6, hy + 1.8, hx + F * 2.6, hy - 1.8, 2.4, gold);
    line(hx, hy, hx - F * 4, hy + 3.6, 2.6, '#26221e');
    dot(hx + F * 14, hy - 8.5, 1.5, ACC);
  } else if (cat === 'dual') {
    line(hx, hy, hx + F * 17, hy - 10.5, 3.2, steel);
    line(x - F * 11, hy, x - F * 24, hy - 9, 3.2, steelD);
    line(hx - F * 2.6, hy + 1.8, hx + F * 2.6, hy - 1.8, 2.4, gold);
    line(x - F * 8.4, hy + 1.8, x - F * 13.6, hy - 1.8, 2.4, gold);
  } else if (cat === 'axe') {
    line(hx - F * 3, hy + 10, hx + F * 7, hy - 11, 3.4, wood);
    const ax0 = F > 0 ? hx + F * 5 : hx + F * 5 - 12;
    blk(ax0, hy - 16, 12, 8.5, steel);
    blk(ax0 + 2, hy - 14, 8, 3, steelD);
    dot(hx + F * 7, hy - 11.5, 1.8, ACC);
  } else if (cat === 'spear') {
    const darkSp = wname === 'Quỷ thương';
    line(hx - F * 8, hy + 11, hx + F * 15, hy - 12, 3, darkSp ? '#3a2438' : wood);
    line(hx + F * 15, hy - 12, hx + F * 22, hy - 17.5, 3.6, darkSp ? '#c95bff' : steel);
    const ts0 = F > 0 ? hx + F * 11 : hx + F * 11 - 4.4;
    blk(ts0, hy - 8, 4.4, 4.4, darkSp ? '#241d24' : '#d8342a');
  } else if (cat === 'staff') {
    if (wname === 'Thiết côn') {
      line(hx, hy + 13, hx + F * 3, hy - 16, 4.6, '#7a7a70');
      line(hx + F * 0.8, hy - 4, hx + F * 1.8, hy - 10, 5.4, gold);
      line(hx + F * 0.2, hy + 6, hx + F * 1, hy + 1, 5.4, gold);
    } else if (wname === 'Quyền trượng') {
      line(hx, hy + 12, hx + F * 2, hy - 12, 3.4, wood);
      dot(hx + F * 2, hy - 15.5, 4.6, gold);
      dot(hx + F * 2, hy - 15.5, 2.2, '#fff6e0');
    } else {
      line(hx, hy + 12, hx + F * 2, hy - 13, 3.4, wood);
      dot(hx + F * 2, hy - 16, 5, ACC);
      dot(hx + F * 2, hy - 16, 2.2, '#fff6e0');
    }
  } else if (cat === 'beads') {
    for (let bi = 0; bi < 7; bi++) { const ba = (bi / 7) * Math.PI * 2; dot(hx + Math.cos(ba) * 6, hy + Math.sin(ba) * 6, 2, '#d89a2d'); }
    line(hx, hy + 6, hx, hy + 11, 2, ACC);
  } else if (cat === 'bowl') {
    blk(hx - 7.5, hy - 3, 15, 3, '#d5dae2');
    blk(hx - 6, hy, 12, 4.6, '#9aa2ae');
    blk(hx - 3, hy + 4.6, 6, 2, '#7d838e');
    dot(hx, hy - 4.6, 1.8, gold);
  } else if (cat === 'shield') {
    blk(hx - 2, hy - 11, 12, 20, '#e8e2d0');
    blk(hx + F * 3.4, hy - 11, 2.2, 20, '#b0a892');
    blk(hx - 2, hy - 11, 12, 3, '#fffaf0');
    dot(hx + F * 3.4 + 1, hy - 1, 2.2, ACC);
  } else if (cat === 'club') {
    line(hx, hy + 7, hx + F * 8, hy - 8, 4.4, '#e8e2d0');
    const cb0 = F > 0 ? hx + F * 6 : hx + F * 6 - 8;
    blk(cb0, hy - 13, 8, 7.5, '#e8e2d0');
    blk(cb0 + 1.6, hy - 11.4, 4.6, 3, '#b0a892');
  } else if (cat === 'fan') {
    if (wname === 'Phất trần') {
      line(hx, hy + 5, hx + F * 3, hy - 3, 3, woodD);
      line(hx + F * 3, hy - 3, hx + F * 13, hy - 11, 2.2, '#f4f1e6');
      line(hx + F * 3, hy - 3, hx + F * 14, hy - 6, 2.2, '#f4f1e6');
      line(hx + F * 3, hy - 3, hx + F * 12, hy - 1.5, 2.2, '#e2ddca');
    } else {
      ctx.fillStyle = 'rgba(216,52,42,0.9)';
      ctx.beginPath(); ctx.moveTo(hx, hy + 5); ctx.lineTo(hx + F * 14, hy - 10); ctx.lineTo(hx + F * 5, hy - 13.5); ctx.lineTo(hx - F * 5, hy - 9); ctx.closePath(); ctx.fill();
      line(hx, hy + 5, hx + F * 13, hy - 9, 1.8, woodD);
      line(hx, hy + 5, hx + F * 4, hy - 12, 1.8, woodD);
      line(hx, hy + 5, hx - F * 4, hy - 8, 1.8, woodD);
      dot(hx + F * 5, hy - 6, 1.9, ACC);
    }
  } else if (cat === 'book') {
    blk(hx - 5.5, hy - 8.5, 12, 16, '#7a3fa0');
    blk(hx - 3.5, hy - 6.5, 8.6, 12, '#f2ead8');
    blk(hx + 0.8, hy - 6.5, 1.2, 12, '#c9bfa8');
    dot(hx + 1.4, hy - 0.5, 2, ACC);
  } else if (cat === 'scroll') {
    if (wname === 'Quyển trục') {
      blk(hx - 3, hy - 11, 6.5, 21, '#f2ead8');
      blk(hx - 3, hy - 11, 6.5, 3.4, '#d8cba6'); blk(hx - 3, hy + 7.6, 6.5, 3.4, '#d8cba6');
      blk(hx - 3.8, hy - 1, 8, 2.4, '#c22e2e');
    } else {
      blk(hx - 10, hy - 6, 20, 11, '#f2ead8');
      blk(hx - 11.4, hy - 7.4, 3, 13.6, wood); blk(hx + 8.6, hy - 7.4, 3, 13.6, wood);
      blk(hx - 6.5, hy - 3.4, 12, 1.8, ACC); blk(hx - 6.5, hy + 0.4, 9, 1.8, '#8a8272');
    }
  } else if (cat === 'flag') {
    line(hx, hy + 12, hx, hy - 16, 3.2, woodD);
    const fl0 = F > 0 ? hx : hx - 14;
    blk(fl0, hy - 16, 14, 9, '#7a2f8f');
    blk(fl0, hy - 16, 14, 2.6, ACC);
    dot(hx + F * 7, hy - 11.4, 2.2, gold);
  } else if (cat === 'sickle') {
    const bigSk = wname === 'Lưỡi hái';
    line(hx, hy + 8, hx + F * (bigSk ? 6 : 4), hy - (bigSk ? 12 : 7), 3.2, wood);
    ctx.lineCap = 'round';
    ctx.strokeStyle = OUT; ctx.lineWidth = (bigSk ? 4.6 : 3.6) + 2.4;
    ctx.beginPath(); ctx.arc(hx + F * (bigSk ? 13 : 9), hy - (bigSk ? 10 : 5), bigSk ? 7.5 : 5, Math.PI * 0.8, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = steel; ctx.lineWidth = bigSk ? 4.6 : 3.6;
    ctx.beginPath(); ctx.arc(hx + F * (bigSk ? 13 : 9), hy - (bigSk ? 10 : 5), bigSk ? 7.5 : 5, Math.PI * 0.8, Math.PI * 2); ctx.stroke();
    ctx.lineCap = 'butt';
  } else if (cat === 'claw') {
    line(hx, hy + 2, hx + F * 9, hy - 5, 2.2, steel);
    line(hx, hy + 3.4, hx + F * 10, hy - 1.5, 2.2, steel);
    line(hx, hy + 4.8, hx + F * 9, hy + 2.4, 2.2, steelD);
    blk(hx - 3, hy + 0.5, 5.5, 5.5, '#5e4632');
  } else if (cat === 'needle') {
    line(hx - F * 3, hy + 4, hx + F * 13, hy - 7, 1.5, steel);
    line(hx - F * 2, hy + 5.4, hx + F * 14, hy - 3.4, 1.5, steel);
    line(hx - F * 3.6, hy + 2.6, hx + F * 11, hy - 10, 1.5, steelD);
    dot(hx + F * 13, hy - 7, 1.9, ACC); dot(hx + F * 14, hy - 3.4, 1.6, gold);
  } else if (cat === 'lute') {
    const lu0 = F > 0 ? hx + F * 2 - 6 : hx + F * 2 - 5;
    blk(lu0, hy - 4, 11, 13, '#a05c28');
    blk(lu0 + 2, hy - 2, 7, 9, '#7a4318');
    line(hx + F * 5, hy - 3, hx + F * 11, hy - 12, 2.8, woodD);
    dot(hx + F * 11, hy - 12.6, 2, gold);
    line(hx + F * 0.5, hy - 2, hx + F * 0.5, hy + 7, 0.9, '#f2ead8');
    line(hx + F * 3, hy - 2, hx + F * 3, hy + 7, 0.9, '#f2ead8');
  } else if (cat === 'brush') {
    blk(hx - 1.8, hy - 12, 3.8, 10, '#c22e2e');
    blk(hx - 1.8, hy - 2.4, 3.8, 2.2, gold);
    ctx.fillStyle = OUT;
    ctx.beginPath(); ctx.moveTo(hx - 2.8, hy); ctx.lineTo(hx + 2.8, hy); ctx.lineTo(hx, hy + 6.4); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#26221e';
    ctx.beginPath(); ctx.moveTo(hx - 1.8, hy + 0.4); ctx.lineTo(hx + 1.8, hy + 0.4); ctx.lineTo(hx, hy + 5.2); ctx.closePath(); ctx.fill();
  }
}

/** Gán ctx nướng hiện tại (dùng nội bộ khi bake). */
export function _setCtx(c: CanvasRenderingContext2D): void {
  ctx = c;
}

// ---------------- NGƯỜI — minh họa 2D mềm (chuyển nguyên văn) ----------------
const _robeGradCache: Record<string, CanvasGradient> = {};
function robeGradient(robe: string): CanvasGradient {
  if (_robeGradCache[robe]) return _robeGradCache[robe];
  const g = ctx.createLinearGradient(0, -40, 0, 0);
  g.addColorStop(0, shadeHex(robe, 1.22));
  g.addColorStop(0.45, vivid(robe));
  g.addColorStop(1, shadeHex(robe, 0.58));
  _robeGradCache[robe] = g;
  return g;
}
let _skinGrad: CanvasGradient | null = null;
function skinGradient(): CanvasGradient {
  if (_skinGrad) return _skinGrad;
  const g = ctx.createRadialGradient(-3, -49, 2, 0, -45, 11);
  g.addColorStop(0, '#ffe9c9'); g.addColorStop(0.6, '#f2d3ac'); g.addColorStop(1, '#dfae7f');
  _skinGrad = g;
  return g;
}

export interface PersonOpts {
  dir?: string;
  castAnim?: { t0: number; dur: number; kind: string; ang?: number; alt?: boolean } | null;
  belt?: string;
  hat?: string;
  gender?: string;
  acc?: string;
  talk?: boolean;
  weaponCat?: string;
  weaponName?: string;
  weaponAccent?: string;
  elem?: string; // hệ chính của người tung chiêu (màu khi kết ấn)
}

export function drawPerson(x: number, y: number, robe: string, face: number, walkPhase: number, moving: boolean, isPlayer: boolean, opts: PersonOpts = {}): void {
  const dir = opts.dir || (face >= 0 ? 'right' : 'left');
  const fS = dir === 'left' ? -1 : dir === 'right' ? 1 : face >= 0 ? 1 : -1;
  const tNow = performance.now() / 1000;
  const bob = moving ? Math.abs(Math.sin(walkPhase)) * GFX_CONFIG.gait.bobAmp : Math.sin(tNow * 1.7 + x * 0.05) * 0.7;
  const top = y - bob;
  const robeC = vivid(robe), robeD = shadeHex(robe, 0.6), robeDD = shadeHex(robe, 0.42);
  const skin = '#f2d3ac', hair = '#33241a';
  const swing = moving ? Math.sin(walkPhase) : 0;
  let ca = opts.castAnim || null;
  let caP = 1;
  if (ca) { caP = (tNow - ca.t0) / ca.dur; if (caP >= 1) { ca = null; caP = 1; } }
  const caExt = ca ? Math.sin(Math.min(1, caP) * Math.PI) : 0;
  const belt = opts.belt || (isPlayer ? '#d6b26a' : 'rgba(0,0,0,0.35)');
  const hat = opts.hat || 'bun';
  const female = opts.gender === 'Nữ';
  const acc = opts.acc || '';
  const side = dir === 'left' || dir === 'right';
  const leanX = moving && side ? fS * 1.9 : 0;
  const leanY = moving && dir === 'down' ? 1 : moving && dir === 'up' ? -1 : 0;
  const OUTS = 'rgba(43,30,20,0.5)';

  ctx.fillStyle = shadowAlpha('10,14,6', 0.32);
  ctx.beginPath(); ctx.ellipse(x + 4, y + 3, 12.5, 4, 0, 0, Math.PI * 2); ctx.fill();

  ctx.save();
  ctx.translate(x + leanX, top + leanY);
  const shY = -37, waistY = -26, hemY = -2, cy = -45;
  const hRx = 8.8, hRy = 9.3;
  const wf = side ? 0.8 : 1;
  const hemK = side ? 0.86 : 1;

  const shBack = side ? { x: -fS * 4.4, y: shY + 1.6 } : { x: -8.4, y: shY + 1 };
  const shFront = side ? { x: fS * 4.4, y: shY + 0.6 } : { x: 8.4, y: shY + 1 };
  function hangHand(sh: { x: number; y: number }, ph: number, isBack: boolean) {
    const sw = moving ? Math.sin(walkPhase + ph) : Math.sin(tNow * 1.5 + x * 0.07 + ph) * 0.5;
    if (side) return { hx: sh.x + (isBack ? -fS * 8.8 : fS * 8.4) + sw * fS * 1.5, hy: shY + 13.5 };
    return { hx: sh.x + (sh.x < 0 ? -2.9 : 2.9) + sw * 0.6, hy: shY + 13.5 };
  }
  type Arm = { sh: { x: number; y: number }; hand: { hx: number; hy: number }; dark: boolean; pawSc?: number; ang?: number };
  const armB: Arm = { sh: shBack, hand: hangHand(shBack, Math.PI, true), dark: true };
  const armF: Arm = { sh: shFront, hand: hangHand(shFront, 0, false), dark: false };
  const armL = fS > 0 ? armB : armF, armR = fS > 0 ? armF : armB;
  if (dir === 'up' && !ca) {
    armB.hand.hx -= Math.sign(armB.hand.hx) * 1.1;
    armF.hand.hx -= Math.sign(armF.hand.hx) * 1.1;
    armB.hand.hy += 2.4; armF.hand.hy += 2.4;
    armB.pawSc = 0.52; armF.pawSc = 0.52;
  }
  if (opts.talk) {
    armL.hand = { hx: armL.sh.x + (armL.sh.x < 0 ? -3 : 3), hy: shY - 1 + Math.sin(tNow * 5.3) * 2.2 };
    armR.hand = { hx: armR.sh.x + (armR.sh.x < 0 ? -3 : 3), hy: shY - 1 + Math.sin(tNow * 4.1 + 1.3) * 2.2 };
  }
  if (ca) {
    if (ca.kind === 'punch') {
      const sArm = ca.alt ? armL : armR;
      const oArm = ca.alt ? armR : armL;
      if (side) {
        sArm.hand = { hx: fS * (12.5 + 9 * caExt), hy: shY + 3 - 2 * caExt };
        oArm.hand = { hx: oArm.hand.hx - fS * 3 * caExt, hy: oArm.hand.hy - 1.5 * caExt };
      } else if (dir === 'down') {
        sArm.hand = { hx: sArm.sh.x * 1.25, hy: shY + 14 + 7 * caExt };
        sArm.pawSc = 0.62 + 0.22 * caExt;
        oArm.hand = { hx: oArm.hand.hx, hy: oArm.hand.hy - 2.5 * caExt };
      } else {
        sArm.hand = { hx: sArm.sh.x * 1.2, hy: shY + 4 - 9.5 * caExt };
        oArm.hand = { hx: oArm.hand.hx, hy: oArm.hand.hy - 1.5 * caExt };
      }
    } else if (ca.kind === 'guard') {
      if (dir === 'down') { armB.hand = { hx: -6, hy: -23 }; armF.hand = { hx: 6, hy: -23 }; }
      else if (dir === 'up') { armB.hand = { hx: -13.8, hy: shY - 4.5 }; armF.hand = { hx: 13.8, hy: shY - 1.5 }; }
      else { armF.hand = { hx: fS * 12.4, hy: shY - 3 }; armB.hand = { hx: -fS * 13.6, hy: shY - 1.5 }; }
    } else if (ca.kind === 'cast' || ca.kind === 'slash') {
      const wArm = armR;
      const aH = ca.kind === 'slash' ? (ca.ang || 0) + (-1.05 + 1.75 * Math.min(1, caP * 1.25)) : (ca.ang || 0);
      wArm.hand = { hx: Math.cos(aH) * 13.5, hy: shY + 2 + Math.sin(aH) * 13.5 };
      wArm.ang = aH;
    }
  }
  const bearHands = opts.weaponCat === 'fist';
  function drawArm(a: Arm, fistC?: string | null) {
    const wSl = acc === 'sleeve' ? 8.8 : 6.2;
    ctx.strokeStyle = a.dark ? robeD : robeC;
    ctx.lineWidth = wSl; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(a.sh.x, a.sh.y); ctx.lineTo(a.hand.hx, a.hand.hy); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,248,225,0.32)'; ctx.lineWidth = wSl * 0.55;
    ctx.beginPath();
    ctx.moveTo(a.sh.x + (a.hand.hx - a.sh.x) * 0.8, a.sh.y + (a.hand.hy - a.sh.y) * 0.8);
    ctx.lineTo(a.hand.hx, a.hand.hy); ctx.stroke();
    if (bearHands) { drawBearPawShape(a.hand.hx, a.hand.hy - 1, a.pawSc || 0.62); return; }
    ctx.fillStyle = fistC || skin;
    ctx.beginPath(); ctx.arc(a.hand.hx, a.hand.hy, 2.8, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = OUTS; ctx.lineWidth = 0.8; ctx.stroke();
    if (fistC) {
      ctx.strokeStyle = 'rgba(255,246,224,0.85)'; ctx.lineWidth = 1.1;
      ctx.beginPath(); ctx.moveTo(a.hand.hx - 2, a.hand.hy - 0.4); ctx.lineTo(a.hand.hx + 2, a.hand.hy - 0.4); ctx.stroke();
    }
  }

  ctx.fillStyle = '#33291f';
  const stA = moving ? swing * 2.8 : 0, stB = -stA;
  if (side) {
    ctx.beginPath(); ctx.ellipse(-2 + stB, -1.2, 3.4, 1.7, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(2 + stA, -1.2, 3.4, 1.7, 0, 0, Math.PI * 2); ctx.fill();
  } else {
    ctx.beginPath(); ctx.ellipse(-5.4, -1.2 - Math.max(0, -swing) * 1.1, 3.3, 1.7, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(5.4, -1.2 - Math.max(0, swing) * 1.1, 3.3, 1.7, 0, 0, Math.PI * 2); ctx.fill();
  }

  if (female && dir !== 'down') {
    ctx.fillStyle = hair;
    ctx.beginPath();
    if (dir === 'up') {
      ctx.moveTo(-8.6, cy - 3); ctx.lineTo(8.6, cy - 3);
      ctx.quadraticCurveTo(9.8, -15, 6.6, -13.4);
      ctx.quadraticCurveTo(0, -11, -6.6, -13.4);
      ctx.quadraticCurveTo(-9.8, -15, -8.6, cy - 3);
    } else {
      ctx.ellipse(-fS * 5.2, -27, 5.2, 15.5, 0, 0, Math.PI * 2);
    }
    ctx.fill();
  }
  if (dir === 'up') { drawArm(armB); drawArm(armF, (ca && ca.kind === 'punch') || acc === 'wrap' ? '#d8342a' : null); }
  else drawArm(armB);
  if (dir === 'up' && opts.weaponCat && opts.weaponCat !== 'fist' && !ca) drawWeaponShape(0, -25, opts.weaponCat, face, opts.weaponName, opts.weaponAccent);
  ctx.fillStyle = '#e3b98d';
  ctx.fillRect(-2.1, cy + hRy - 3.4, 4.2, 5);

  const hemSway = moving ? Math.sin(walkPhase) * 1.7 : Math.sin(tNow * 1.3 + x * 0.05) * 0.5;
  ctx.beginPath();
  ctx.moveTo(-7.8 * wf, shY);
  ctx.quadraticCurveTo(-8.8 * wf, -31, -7 * wf, waistY);
  ctx.quadraticCurveTo(-10.6 * wf, -13, (-14.6 + hemSway) * hemK, hemY);
  ctx.quadraticCurveTo(hemSway * 0.4, hemY + 4.4, (14.6 + hemSway) * hemK, hemY);
  ctx.quadraticCurveTo(10.6 * wf, -13, 7 * wf, waistY);
  ctx.quadraticCurveTo(8.8 * wf, -31, 7.8 * wf, shY);
  ctx.quadraticCurveTo(0, shY - 2.8, -7.8 * wf, shY);
  ctx.closePath();
  ctx.fillStyle = robeGradient(robe); ctx.fill();
  ctx.strokeStyle = OUTS; ctx.lineWidth = 1.3; ctx.stroke();
  ctx.fillStyle = 'rgba(20,12,24,0.10)';
  ctx.beginPath();
  ctx.moveTo(2.5 * wf, shY - 1);
  ctx.quadraticCurveTo(8.6 * wf, -20, (12 + hemSway) * hemK, hemY - 0.5);
  ctx.quadraticCurveTo(6 * wf, hemY + 2.6, 1 * wf, hemY + 1);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(30,20,14,0.15)'; ctx.lineWidth = 1;
  [-4.5, 0.2, 4.9].forEach((fx2) => {
    ctx.beginPath(); ctx.moveTo(fx2 * 0.45, waistY + 3);
    ctx.quadraticCurveTo(fx2 * 0.8, -13, fx2 * 1.55 + hemSway * 0.7, hemY - 1); ctx.stroke();
  });
  ctx.fillStyle = belt;
  roundRect(-7.15 * wf, waistY - 2, 14.3 * wf, 3.8, 1.8); ctx.fill();
  ctx.beginPath(); ctx.arc(0, waistY, 1.9, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = belt; ctx.lineWidth = 1.6; ctx.lineCap = 'round';
  const tsw = Math.sin(tNow * 2.1 + x * 0.05) * 1.1 + hemSway * 0.4;
  ctx.beginPath(); ctx.moveTo(-1.4, waistY + 1.4); ctx.quadraticCurveTo(-2.2 + tsw * 0.4, waistY + 6, -2.8 + tsw, waistY + 10.5); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(1.4, waistY + 1.4); ctx.quadraticCurveTo(2.2 + tsw * 0.4, waistY + 6, 2.8 + tsw, waistY + 10.5); ctx.stroke();
  if (dir === 'down') {
    ctx.fillStyle = 'rgba(246,238,220,0.92)';
    ctx.beginPath(); ctx.moveTo(-3.1, shY + 0.6); ctx.lineTo(3.1, shY + 0.6); ctx.lineTo(0, -29.6); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = robeDD; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(-3.4, shY + 0.2); ctx.lineTo(0.4, -29.2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(3.4, shY + 0.2); ctx.lineTo(-0.4, -29.2); ctx.stroke();
  } else if (dir === 'up') {
    ctx.fillStyle = robeD;
    roundRect(-4.6, shY - 0.6, 9.2, 3.2, 1.6); ctx.fill();
    ctx.strokeStyle = 'rgba(30,20,14,0.25)'; ctx.lineWidth = 1.1;
    ctx.beginPath(); ctx.moveTo(0, shY + 3); ctx.lineTo(0, hemY - 3); ctx.stroke();
    ctx.save(); ctx.translate(0, -30); ctx.rotate(Math.PI / 4);
    ctx.strokeStyle = belt; ctx.lineWidth = 1.2; ctx.strokeRect(-2.7, -2.7, 5.4, 5.4); ctx.restore();
  } else {
    ctx.fillStyle = robeD;
    ctx.beginPath(); ctx.moveTo(fS * 2.2, shY - 0.4); ctx.lineTo(fS * 5.4, shY + 1.4); ctx.lineTo(fS * 1.8, -30.4); ctx.closePath(); ctx.fill();
  }
  if (acc === 'beads' && dir !== 'up') {
    ctx.fillStyle = '#7a4a1f';
    [-4.6, -2.3, 0, 2.3, 4.6].forEach((bo) => { ctx.beginPath(); ctx.arc(bo * 0.85, -32.6 + Math.abs(bo) * 0.42, 1.55, 0, Math.PI * 2); ctx.fill(); });
    ctx.fillStyle = '#ffd83a'; ctx.beginPath(); ctx.arc(0, -29.9, 1.9, 0, Math.PI * 2); ctx.fill();
  }
  if (acc === 'bone') {
    ctx.fillStyle = '#e8e2d0';
    [-1, 1].forEach((sg) => {
      ctx.beginPath(); ctx.ellipse(sg * 8.8 * wf, shY + 0.6, 3.9, 2.7, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.moveTo(sg * 8.8 * wf - 1.2, shY - 1.2); ctx.lineTo(sg * 8.8 * wf, shY - 4.6); ctx.lineTo(sg * 8.8 * wf + 1.2, shY - 1.2); ctx.closePath(); ctx.fill();
    });
    ctx.strokeStyle = 'rgba(120,110,90,0.55)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(-11.5 * wf, shY + 2.6); ctx.lineTo(-6.5 * wf, shY + 2.6); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(6.5 * wf, shY + 2.6); ctx.lineTo(11.5 * wf, shY + 2.6); ctx.stroke();
  }
  if (acc === 'gold' && dir === 'down') {
    ctx.strokeStyle = '#ffd83a'; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(-3.4, shY + 0.2); ctx.lineTo(0, -29.4); ctx.lineTo(3.4, shY + 0.2); ctx.stroke();
    ctx.fillStyle = '#ffd83a';
    ctx.beginPath(); ctx.arc(-6.9 * wf, shY + 0.4, 1.3, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(6.9 * wf, shY + 0.4, 1.3, 0, Math.PI * 2); ctx.fill();
  }
  if (acc === 'talisman' && dir !== 'up') {
    ctx.save(); ctx.translate(3.4, -33.5); ctx.rotate(0.1);
    ctx.fillStyle = '#f5c93c'; ctx.fillRect(-2.3, -4, 4.6, 8.4);
    ctx.fillStyle = '#c22e2e'; ctx.fillRect(-1.2, -2.6, 2.4, 1.3); ctx.fillRect(-1.2, -0.4, 2.4, 1.3);
    ctx.restore();
  }
  if (acc === 'pouch' && dir !== 'up') {
    ctx.fillStyle = '#14632e';
    roundRect(-14.6, -19.5, 6.6, 7.6, 2); ctx.fill();
    ctx.fillStyle = '#f2ead8';
    ctx.fillRect(-12.9, -17.4, 3.2, 1.4); ctx.fillRect(-12, -18.3, 1.4, 3.2);
  }
  if (acc === 'collar' && dir === 'down') {
    ctx.fillStyle = 'rgba(246,238,220,0.95)';
    ctx.beginPath(); ctx.moveTo(-4.6, shY + 0.4); ctx.lineTo(4.6, shY + 0.4); ctx.lineTo(0, -28.2); ctx.closePath(); ctx.fill();
    ctx.fillRect(-1.1, -28.4, 2.2, 3.2);
  }

  ctx.beginPath(); ctx.ellipse(0, cy, hRx, hRy, 0, 0, Math.PI * 2);
  ctx.fillStyle = skinGradient(); ctx.fill();
  ctx.strokeStyle = 'rgba(122,82,50,0.4)'; ctx.lineWidth = 1; ctx.stroke();
  if (hat === 'hood') {
    ctx.fillStyle = robeD;
    ctx.beginPath(); ctx.ellipse(side ? -fS * 1 : 0, cy - 0.8, hRx + 2.7, hRy + 2.2, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(0, cy + 0.4, hRx - 1.2, hRy - 1.6, 0, 0, Math.PI * 2);
    ctx.fillStyle = skinGradient(); ctx.fill();
  } else if (dir === 'up') {
    ctx.fillStyle = hair;
    ctx.beginPath(); ctx.ellipse(0, cy - 0.6, hRx + 0.7, hRy + 0.5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(240,220,190,0.20)'; ctx.lineWidth = 1.1;
    ctx.beginPath(); ctx.ellipse(-2.6, cy - 2.6, 4.6, 5.6, -0.4, Math.PI * 1.05, Math.PI * 1.6); ctx.stroke();
  } else if (hat !== 'bald') {
    ctx.fillStyle = hair;
    if (dir === 'down') {
      ctx.beginPath();
      ctx.moveTo(-hRx - 0.6, cy + 0.8);
      ctx.quadraticCurveTo(-hRx - 1, cy - hRy - 1.6, 0, cy - hRy - 1.4);
      ctx.quadraticCurveTo(hRx + 1, cy - hRy - 1.6, hRx + 0.6, cy + 0.8);
      ctx.quadraticCurveTo(hRx * 0.45, cy - 3.4, 0, cy - 2.6);
      ctx.quadraticCurveTo(-hRx * 0.45, cy - 3.4, -hRx - 0.6, cy + 0.8);
      ctx.closePath(); ctx.fill();
    } else {
      ctx.beginPath(); ctx.ellipse(-fS * 2.8, cy - 0.8, hRx - 1.6, hRy + 0.3, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(-fS * 1.2, cy - 4.2, hRx - 0.8, 5.2, 0, 0, Math.PI * 2); ctx.fill();
    }
  } else {
    ctx.fillStyle = hair;
    ctx.beginPath(); ctx.ellipse(0, cy - hRy + 0.8, 2.2, 1.3, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.ellipse(-2.8, cy - 3, 3.6, 4.6, -0.4, Math.PI * 1.1, Math.PI * 1.55); ctx.stroke();
  }
  if (dir === 'down') {
    ctx.strokeStyle = 'rgba(74,48,28,0.85)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(-4.9, cy - 2.2); ctx.quadraticCurveTo(-3.3, cy - 3.1, -1.7, cy - 2.3); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(1.7, cy - 2.3); ctx.quadraticCurveTo(3.3, cy - 3.1, 4.9, cy - 2.2); ctx.stroke();
    ctx.fillStyle = '#2a1a10';
    ctx.beginPath(); ctx.ellipse(-3.3, cy + 0.7, 1.2, 2, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(3.3, cy + 0.7, 1.2, 2, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff8ea';
    ctx.beginPath(); ctx.arc(-3.7, cy + 0.1, 0.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(3, cy + 0.1, 0.5, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(160,100,60,0.7)'; ctx.lineWidth = 0.9;
    ctx.beginPath(); ctx.moveTo(0.4, cy + 2.6); ctx.quadraticCurveTo(0.9, cy + 3.6, 0.2, cy + 4.1); ctx.stroke();
    ctx.strokeStyle = 'rgba(168,72,50,0.9)'; ctx.lineWidth = 1.1;
    ctx.beginPath(); ctx.moveTo(-1.3, cy + 5.9); ctx.quadraticCurveTo(0, cy + 6.7, 1.3, cy + 5.9); ctx.stroke();
    ctx.fillStyle = 'rgba(236,120,95,0.30)';
    ctx.beginPath(); ctx.ellipse(-5.7, cy + 3.9, 1.9, 1.1, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(5.7, cy + 3.9, 1.9, 1.1, 0, 0, Math.PI * 2); ctx.fill();
  } else if (side) {
    ctx.fillStyle = '#2a1a10';
    ctx.beginPath(); ctx.ellipse(fS * 4.4, cy + 0.6, 1.05, 1.85, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff8ea';
    ctx.beginPath(); ctx.arc(fS * 4.1, cy, 0.45, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(74,48,28,0.85)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(fS * 2.9, cy - 2.3); ctx.quadraticCurveTo(fS * 4.4, cy - 3, fS * 5.9, cy - 2.3); ctx.stroke();
    ctx.fillStyle = '#eecfae';
    ctx.beginPath(); ctx.ellipse(fS * (hRx + 0.5), cy + 2.4, 1.5, 1.1, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(168,72,50,0.85)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(fS * (hRx - 1.7), cy + 5.6); ctx.lineTo(fS * (hRx - 0.3), cy + 5.6); ctx.stroke();
    ctx.fillStyle = 'rgba(236,120,95,0.28)';
    ctx.beginPath(); ctx.ellipse(fS * 2.2, cy + 3.9, 1.7, 1, 0, 0, Math.PI * 2); ctx.fill();
  }
  if (female && dir === 'down') {
    ctx.fillStyle = hair;
    [-1, 1].forEach((sg) => {
      ctx.beginPath();
      ctx.moveTo(sg * (hRx + 0.2), cy + 0.5);
      ctx.quadraticCurveTo(sg * (hRx + 1.7), -30, sg * (hRx - 0.6), -24.5);
      ctx.quadraticCurveTo(sg * (hRx - 2.4), -31, sg * (hRx - 2.8), cy + 1.5);
      ctx.closePath(); ctx.fill();
    });
  }
  if (hat === 'bun') {
    const bx = side ? -fS * 3.4 : 0, byy = cy - hRy - (side ? 0.8 : 1.2);
    ctx.fillStyle = hair;
    ctx.beginPath(); ctx.arc(bx, byy, 3.3, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(240,220,190,0.25)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(bx, byy, 3.3, Math.PI * 1.1, Math.PI * 1.6); ctx.stroke();
    ctx.strokeStyle = '#d6b26a'; ctx.lineWidth = 1.3; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(bx - 4.6, byy - 1.2); ctx.lineTo(bx + 4.6, byy + 0.9); ctx.stroke();
    ctx.fillStyle = '#d6b26a';
    ctx.beginPath(); ctx.arc(bx - 4.6, byy - 1.2, 0.9, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(bx + 4.6, byy + 0.9, 0.9, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#c0392b'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(bx + 4.6, byy + 0.9); ctx.lineTo(bx + 4.9, byy + 3.4); ctx.stroke();
    ctx.fillStyle = '#c0392b';
    ctx.beginPath(); ctx.arc(bx + 4.9, byy + 3.9, 1, 0, Math.PI * 2); ctx.fill();
  } else if (hat === 'point') {
    ctx.fillStyle = shadeHex(robe, 0.72);
    ctx.beginPath();
    ctx.moveTo(-6.2, cy - hRy + 2.2);
    ctx.quadraticCurveTo(-5, cy - hRy - 7.5, -1.8, cy - hRy - 9.4);
    ctx.lineTo(1.8, cy - hRy - 9.4);
    ctx.quadraticCurveTo(5, cy - hRy - 7.5, 6.2, cy - hRy + 2.2);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#d6b26a'; ctx.lineWidth = 1.3;
    ctx.beginPath(); ctx.moveTo(-5.9, cy - hRy + 1.4); ctx.lineTo(5.9, cy - hRy + 1.4); ctx.stroke();
    ctx.fillStyle = robeD;
    ctx.beginPath(); ctx.arc(0, cy - hRy - 10.2, 1.7, 0, Math.PI * 2); ctx.fill();
  } else if (hat === 'scholar') {
    ctx.fillStyle = '#3a3f52';
    [-1, 1].forEach((sg) => {
      ctx.save(); ctx.translate(sg * (hRx + 0.6), cy - 1); ctx.rotate(-sg * 0.15);
      roundRect(-1.3, -1, 2.6, 5.6, 1.2); ctx.fill(); ctx.restore();
    });
    ctx.beginPath();
    ctx.moveTo(-hRx - 0.4, cy - 0.6);
    ctx.quadraticCurveTo(-hRx - 0.6, cy - hRy - 1.8, 0, cy - hRy - 1.6);
    ctx.quadraticCurveTo(hRx + 0.6, cy - hRy - 1.8, hRx + 0.4, cy - 0.6);
    ctx.quadraticCurveTo(0, cy - 3.4, -hRx - 0.4, cy - 0.6);
    ctx.closePath(); ctx.fill();
    roundRect(-2, cy - hRy - 3.4, 4, 3, 1); ctx.fill();
  }
  if (acc === 'mask' && dir === 'down') {
    ctx.fillStyle = '#20242c';
    ctx.beginPath(); ctx.ellipse(0, cy + 5.2, 7.2, 3.9, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(-6.4, cy + 3.4); ctx.lineTo(6.4, cy + 3.4); ctx.stroke();
  }
  if (acc === 'mask' && side) {
    ctx.fillStyle = '#20242c';
    ctx.beginPath(); ctx.ellipse(fS * 4.6, cy + 4.9, 4.4, 3.7, 0, 0, Math.PI * 2); ctx.fill();
  }

  if (dir !== 'up') drawArm(armF, (ca && ca.kind === 'punch') || acc === 'wrap' ? '#d8342a' : null);
  if (ca && ca.kind === 'punch' && side && (ca.alt ? armL : armR) === armB) drawArm(armB, '#d8342a');
  if (ca && ca.kind === 'guard' && dir === 'down') drawArm(armB, acc === 'wrap' ? '#d8342a' : null);
  if (ca && ca.kind === 'slash') {
    const aS = armR.ang != null ? armR.ang : (ca.ang || 0);
    ctx.strokeStyle = `rgba(255,252,240,${(0.75 * (1 - caP)).toFixed(2)})`; ctx.lineWidth = 2.6; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(0, shY + 2, 21, (ca.ang || 0) - 1.05, aS); ctx.stroke();
    ctx.strokeStyle = '#dfe4ea'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(armR.hand.hx, armR.hand.hy); ctx.lineTo(armR.hand.hx + Math.cos(aS) * 15, armR.hand.hy + Math.sin(aS) * 15); ctx.stroke();
    ctx.strokeStyle = '#8a6a34'; ctx.lineWidth = 3.4;
    ctx.beginPath(); ctx.moveTo(armR.hand.hx, armR.hand.hy); ctx.lineTo(armR.hand.hx + Math.cos(aS) * 4, armR.hand.hy + Math.sin(aS) * 4); ctx.stroke();
  } else if (ca && ca.kind === 'cast') {
    const ecA = opts.elem ? GFX_CONFIG.elements[opts.elem] || '#ffd873' : '#ffd873';
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = ecA; ctx.globalAlpha = 0.4 + 0.3 * Math.sin(tNow * 16);
    ctx.beginPath(); ctx.arc(armR.hand.hx, armR.hand.hy, 5.2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,252,240,0.95)';
    ctx.beginPath(); ctx.arc(armR.hand.hx, armR.hand.hy, 2, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    if (opts.weaponCat) {
      ctx.strokeStyle = '#c8ccd4'; ctx.lineWidth = 2.6; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(armR.hand.hx, armR.hand.hy); ctx.lineTo(armR.hand.hx + Math.cos(ca.ang || 0) * 10, armR.hand.hy + Math.sin(ca.ang || 0) * 10); ctx.stroke();
    }
  } else if (ca && ca.kind === 'guard') {
    ctx.strokeStyle = `rgba(159,232,176,${(0.85 * (1 - caP)).toFixed(2)})`; ctx.lineWidth = 2.4;
    ctx.beginPath(); ctx.arc(0, -20, 15 + caP * 9, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = `rgba(255,252,240,${(0.5 * (1 - caP)).toFixed(2)})`; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.arc(0, -20, 11 + caP * 7, 0, Math.PI * 2); ctx.stroke();
  } else if (opts.weaponCat && opts.weaponCat !== 'fist' && dir !== 'up') {
    drawWeaponShape(0, -25, opts.weaponCat, face, opts.weaponName, opts.weaponAccent);
  }

  ctx.restore();

  if (isPlayer) {
    ctx.strokeStyle = 'rgba(214,178,106,0.55)';
    ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.ellipse(x, y + 3, 13, 4.6, 0, 0, Math.PI * 2); ctx.stroke();
  }
}

// ---------------- STYLE THEO LỚP (từ CLASS_STYLE bản cũ) ----------------
// Vũ khí mặc định = vũ khí khởi đầu đặc trưng của lớp trong file thiết kế
// (bản online chưa có hệ thống vũ khí riêng — mỗi lớp mang vũ khí biểu tượng).
export interface PersonStyleDef {
  robe: string;
  belt: string;
  hat: string;
  acc: string;
  weaponCat?: string;
  weaponName?: string;
  castKind: 'punch' | 'slash' | 'cast';
  gender?: string; // GĐ10: 'nam' | 'nu' — đổi kiểu tóc trong drawPerson
}

export const CLASS_STYLE_BY_ID: Record<string, PersonStyleDef> = {
  thetu: { robe: '#0f8a7d', belt: '#ffb52e', hat: 'bun', acc: 'wrap', weaponCat: 'fist', castKind: 'punch' },
  phattu: { robe: '#e89b1c', belt: '#7a4a1f', hat: 'bald', acc: 'beads', weaponCat: 'beads', weaponName: 'Phật châu', castKind: 'cast' },
  cottu: { robe: '#78808e', belt: '#e8e2d0', hat: 'hood', acc: 'bone', weaponCat: 'club', weaponName: 'Cốt chùy', castKind: 'slash' },
  satthu: { robe: '#23272e', belt: '#c22e2e', hat: 'hood', acc: 'mask', weaponCat: 'dagger', weaponName: 'Dao găm', castKind: 'slash' },
  kiemtu: { robe: '#2470e0', belt: '#f2ead8', hat: 'bun', acc: 'gold', weaponCat: 'sword', weaponName: 'Kiếm', castKind: 'slash' },
  phaptu: { robe: '#8a3fd1', belt: '#ffd83a', hat: 'point', acc: 'sleeve', weaponCat: 'fan', weaponName: 'Phiến', castKind: 'cast' },
  quytu: { robe: '#a01e38', belt: '#241d24', hat: 'hood', acc: 'talisman', weaponCat: 'flag', weaponName: 'Cờ lệnh', castKind: 'cast' },
  ytu: { robe: '#1fa84f', belt: '#e8f2d8', hat: 'bun', acc: 'pouch', weaponCat: 'needle', weaponName: 'Kim châm', castKind: 'cast' },
  nhotu: { robe: '#2e4bb8', belt: '#d6b26a', hat: 'scholar', acc: 'collar', weaponCat: 'brush', weaponName: 'Bút phép', castKind: 'cast' },
};

export const NPC_STYLE_BY_ID: Record<string, PersonStyleDef> = {
  npc_truonglang: { robe: '#8a5a2b', belt: '#e8e2d0', hat: 'bun', acc: '', castKind: 'cast' },
  npc_dan: { robe: '#3f7355', belt: '#e8e2d0', hat: 'bun', acc: '', castKind: 'cast' },
  npc_nguyenlieu: { robe: '#7a6a55', belt: '#e8e2d0', hat: 'bun', acc: '', castKind: 'cast' },
  npc_thuongnhan: { robe: '#6a4a8a', belt: '#e8c95a', hat: 'scholar', acc: '', castKind: 'cast' }, // GĐ40: áo tím đai vàng
  rivalmonk: { robe: '#7a2430', belt: '#2b2b30', hat: 'bun', acc: '', castKind: 'cast' }, // GĐ40: tu sĩ thù địch áo đỏ sẫm
};

export function npcStyleKey(id: string): string {
  return NPC_STYLE_BY_ID[id] ? id : 'villager0';
}

// Dân làng (bot đi dạo) — áo thôn dân theo mẫu dân làng bản cũ
export const VILLAGER_STYLES: PersonStyleDef[] = [
  { robe: '#8a5a2b', belt: '#e8e2d0', hat: 'bun', acc: '', castKind: 'cast' },
  { robe: '#4a7a9c', belt: '#e8e2d0', hat: 'bun', acc: '', castKind: 'cast' },
  { robe: '#b8622f', belt: '#e8e2d0', hat: 'bun', acc: '', castKind: 'cast' },
  { robe: '#5d7a8c', belt: '#e8e2d0', hat: 'bald', acc: '', castKind: 'cast' },
  { robe: '#3f7355', belt: '#e8e2d0', hat: 'scholar', acc: '', castKind: 'cast' },
];

export function personStyleKeyForPlayer(id: string, classId: string, isBot: boolean): string {
  if (isBot) {
    let h = 0;
    for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
    return 'villager' + (h % VILLAGER_STYLES.length);
  }
  return CLASS_STYLE_BY_ID[classId] ? classId : 'thetu';
}

// GĐ10: style tùy chỉnh của người chơi (màu áo + giới tính tự chọn) —
// đăng ký lúc chạy khi gặp người chơi có robe khác mặc định của lớp.
// GĐ11: mở rộng thêm VŨ KHÍ đang cầm (mỗi tổ hợp nướng lười 1 lần khi gặp).
const CUSTOM_PERSON_STYLES: Record<string, PersonStyleDef> = {};
export interface PersonVariantOpts {
  robe?: string | null;
  gender?: string;
  weaponCat?: string;
  weaponName?: string;
}
export function ensurePersonVariant(scene: Phaser.Scene, classId: string, opts: PersonVariantOpts): string {
  const base = CLASS_STYLE_BY_ID[classId] || CLASS_STYLE_BY_ID.thetu;
  const robe = opts.robe || base.robe;
  const weaponCat = opts.weaponCat !== undefined ? opts.weaponCat : base.weaponCat || '';
  const weaponName = opts.weaponName !== undefined ? opts.weaponName : base.weaponName;
  const key =
    `v_${classId}_${robe.replace('#', '')}_${opts.gender === 'nu' ? 'f' : 'm'}` +
    `_${weaponCat || 'none'}_${(weaponName || '').replace(/\s+/g, '')}`;
  if (!CUSTOM_PERSON_STYLES[key]) {
    // drawPerson của bản cũ nhận giới tính dạng 'Nữ' / 'Nam'
    CUSTOM_PERSON_STYLES[key] = {
      ...base,
      robe,
      gender: opts.gender === 'nu' ? 'Nữ' : 'Nam',
      weaponCat,
      weaponName,
    };
  }
  for (const dir of PERSON_DIRS) {
    for (const frame of PERSON_FRAMES) {
      bakeOnePersonFrame(scene, key, dir, frame);
    }
  }
  return key;
}
export function ensureCustomPersonTextures(scene: Phaser.Scene, classId: string, robe: string, gender?: string): string {
  return ensurePersonVariant(scene, classId, { robe, gender });
}

export function personStyleDef(styleKey: string): PersonStyleDef {
  if (CUSTOM_PERSON_STYLES[styleKey]) return CUSTOM_PERSON_STYLES[styleKey];
  if (CLASS_STYLE_BY_ID[styleKey]) return CLASS_STYLE_BY_ID[styleKey];
  if (NPC_STYLE_BY_ID[styleKey]) return NPC_STYLE_BY_ID[styleKey];
  if (styleKey.startsWith('villager')) return VILLAGER_STYLES[Number(styleKey.slice(8)) || 0];
  return CLASS_STYLE_BY_ID.thetu;
}

// ---------------- NƯỚNG TEXTURE NHÂN VẬT ----------------
// Khung ảo 150×160 (chân tại 75,148), nướng ở độ phân giải ×2.
export const PERSON_TEX = { w: 150, h: 160, res: 2, feetX: 75, feetY: 148, originX: 0.5, originY: 148 / 160, scale: 0.52 };
export const PERSON_DIRS = ['down', 'up', 'left', 'right'] as const;
export const PERSON_FRAMES = ['idle', 'w0', 'w1', 'w2', 'w3', 'cast'] as const;
const WALK_PHASES = [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2];
const DIR_ANG: Record<string, number> = { down: Math.PI / 2, up: -Math.PI / 2, left: Math.PI, right: 0 };

export function personTexKey(styleKey: string, dir: string, frame: string): string {
  return `person-${styleKey}-${dir}-${frame}`;
}

// GĐ12: từng thử pixel-hoá bản vẽ code (mỗi "pixel" = 3 đơn vị + NEAREST) —
// người chơi chê "thô xấu" nên đã TẮT (về 1 = nét mượt) từ GĐ13, khi nhân
// vật người chơi chuyển sang dùng sprite pixel thật do người chơi cung cấp.
// NPC/dân làng vẫn vẽ bằng code (nét mượt như GĐ11).
export const PERSON_PIXEL = 1;

function bakeOnePersonFrame(scene: Phaser.Scene, styleKey: string, dir: string, frame: string): void {
  const key = personTexKey(styleKey, dir, frame);
  if (scene.textures.exists(key)) return;
  const st = personStyleDef(styleKey);
  const small = document.createElement('canvas');
  small.width = Math.ceil(PERSON_TEX.w / PERSON_PIXEL);
  small.height = Math.ceil(PERSON_TEX.h / PERSON_PIXEL);
  const sc = small.getContext('2d');
  if (!sc) return;
  sc.scale(small.width / PERSON_TEX.w, small.height / PERSON_TEX.h);
  _setCtx(sc);
  const c = sc;
  const face = dir === 'left' ? -1 : 1;
  const baseOpts: PersonOpts = {
    dir,
    belt: st.belt,
    hat: st.hat,
    acc: st.acc,
    weaponCat: st.weaponCat,
    weaponName: st.weaponName,
    gender: st.gender,
  };
  if (frame === 'idle') {
    drawPerson(PERSON_TEX.feetX, PERSON_TEX.feetY, st.robe, face, 0, false, false, baseOpts);
  } else if (frame === 'cast') {
    const castAnim = {
      t0: performance.now() / 1000 - 0.14,
      dur: 0.28,
      kind: st.castKind,
      ang: DIR_ANG[dir],
      alt: false,
    };
    drawPerson(PERSON_TEX.feetX, PERSON_TEX.feetY, st.robe, face, 0, false, false, { ...baseOpts, castAnim });
  } else {
    const idx = Number(frame.slice(1)) || 0;
    drawPerson(PERSON_TEX.feetX, PERSON_TEX.feetY, st.robe, face, WALK_PHASES[idx], true, false, baseOpts);
  }
  // Phóng to bản độ phân giải thấp lên khổ texture chuẩn, tắt làm mịn +
  // khóa bộ lọc NEAREST phía Phaser để ô pixel không bị nhòe khi hiển thị.
  const canvas = document.createElement('canvas');
  canvas.width = PERSON_TEX.w * PERSON_TEX.res;
  canvas.height = PERSON_TEX.h * PERSON_TEX.res;
  const fc = canvas.getContext('2d');
  if (!fc) return;
  fc.imageSmoothingEnabled = false;
  fc.drawImage(small, 0, 0, canvas.width, canvas.height);
  scene.textures.addCanvas(key, canvas);
  scene.textures.get(key).setFilter(1); // 1 = NEAREST
}

export function bakePersonTextures(scene: Phaser.Scene): void {
  const keys = [
    ...Object.keys(CLASS_STYLE_BY_ID),
    ...Object.keys(NPC_STYLE_BY_ID),
    ...VILLAGER_STYLES.map((_, i) => 'villager' + i),
  ];
  for (const styleKey of keys) {
    for (const dir of PERSON_DIRS) {
      for (const frame of PERSON_FRAMES) {
        bakeOnePersonFrame(scene, styleKey, dir, frame);
      }
    }
  }
}

// ---------------- NHÀ — 2,5D: mái ngói 2 dốc, tường gỗ, biển tên ----------------
export interface BuildingDef { x: number; y: number; w: number; h: number; body: string; roof: string; name: string }

export function drawBuilding(bd: BuildingDef): void {
  const x = bd.x, y = bd.y, w = bd.w, h = bd.h;
  const cx = x + w / 2;
  const wallTop = y + h * 0.34;
  const sdx = 18, sdy = 13;
  const eaveY = wallTop + 4, ox = 13;
  const ridgeY = y - 22, ridgeHalf = w * 0.30;
  const flick = 0.5 + 0.5 * Math.sin(performance.now() / 260 + x * 0.05);
  ctx.fillStyle = 'rgba(20,26,14,0.26)';
  ctx.beginPath(); ctx.ellipse(cx + 12, y + h + 7, w * 0.58, 11, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = shadeHex(bd.body, 0.7);
  ctx.beginPath();
  ctx.moveTo(x + w, wallTop);
  ctx.lineTo(x + w + sdx, wallTop - sdy);
  ctx.lineTo(x + w + sdx, y + h - sdy);
  ctx.lineTo(x + w, y + h);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#57452a';
  ctx.beginPath();
  ctx.moveTo(x + w + 3, wallTop + h * 0.16);
  ctx.lineTo(x + w + sdx - 2, wallTop - sdy + h * 0.16);
  ctx.lineTo(x + w + sdx - 2, wallTop - sdy + h * 0.16 + 15);
  ctx.lineTo(x + w + 3, wallTop + h * 0.16 + 15);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(255,214,130,0.85)';
  ctx.beginPath();
  ctx.moveTo(x + w + 4.5, wallTop + h * 0.16 + 2);
  ctx.lineTo(x + w + sdx - 3.5, wallTop - sdy + h * 0.16 + 2);
  ctx.lineTo(x + w + sdx - 3.5, wallTop - sdy + h * 0.16 + 13);
  ctx.lineTo(x + w + 4.5, wallTop + h * 0.16 + 13);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = vivid(bd.body);
  ctx.fillRect(x, wallTop, w, y + h - wallTop);
  ctx.strokeStyle = 'rgba(23,18,8,0.6)'; ctx.lineWidth = 2;
  ctx.strokeRect(x, wallTop, w, y + h - wallTop);
  ctx.fillStyle = 'rgba(255,248,224,0.13)';
  ctx.fillRect(x, wallTop, w * 0.52, y + h - wallTop);
  ctx.fillStyle = 'rgba(24,16,8,0.10)';
  ctx.fillRect(x + w * 0.82, wallTop, w * 0.18, y + h - wallTop);
  ctx.fillStyle = 'rgba(0,0,0,0.20)';
  ctx.fillRect(x, wallTop, w, 7);
  ctx.fillStyle = 'rgba(0,0,0,0.13)';
  ctx.fillRect(x, y + h - 7, w, 7);
  ctx.strokeStyle = 'rgba(96,72,40,0.16)'; ctx.lineWidth = 1;
  for (let wg = 1; wg < 7; wg++) {
    const wxg = x + (w / 7) * wg;
    ctx.beginPath(); ctx.moveTo(wxg, wallTop + 9); ctx.lineTo(wxg, y + h - 8); ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(96,72,40,0.10)';
  for (let wg2 = 1; wg2 < 4; wg2++) {
    const wyg = wallTop + ((y + h - wallTop) / 4) * wg2;
    ctx.beginPath(); ctx.moveTo(x + 6, wyg); ctx.lineTo(x + w - 6, wyg); ctx.stroke();
  }
  ctx.fillStyle = '#6e5133';
  ctx.fillRect(x, wallTop, 5, y + h - wallTop);
  ctx.fillRect(x + w - 5, wallTop, 5, y + h - wallTop);
  ctx.fillRect(x, wallTop + 6, w, 5);
  ctx.fillStyle = shadeHex(bd.roof, 0.68);
  ctx.beginPath();
  ctx.moveTo(cx + ridgeHalf, ridgeY);
  ctx.lineTo(x + w + ox, eaveY);
  ctx.lineTo(x + w + ox + sdx, eaveY - sdy);
  ctx.lineTo(cx + ridgeHalf + sdx, ridgeY - sdy);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = vivid(bd.roof);
  ctx.beginPath();
  ctx.moveTo(x - ox, eaveY);
  ctx.lineTo(cx - ridgeHalf, ridgeY);
  ctx.lineTo(cx + ridgeHalf, ridgeY);
  ctx.lineTo(x + w + ox, eaveY);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(255,244,214,0.10)';
  ctx.beginPath();
  ctx.moveTo(x - ox, eaveY); ctx.lineTo(cx - ridgeHalf, ridgeY); ctx.lineTo(cx, ridgeY); ctx.lineTo(cx, eaveY);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(10,6,20,0.13)';
  ctx.beginPath();
  ctx.moveTo(cx, ridgeY); ctx.lineTo(cx + ridgeHalf, ridgeY); ctx.lineTo(x + w + ox, eaveY); ctx.lineTo(cx, eaveY);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(20,10,24,0.20)'; ctx.lineWidth = 1.4;
  for (let ti = 1; ti <= 3; ti++) {
    const tf = ti / 4, ly = ridgeY + (eaveY - ridgeY) * tf;
    const lx0 = cx - ridgeHalf + (x - ox - (cx - ridgeHalf)) * tf;
    const lx1 = cx + ridgeHalf + (x + w + ox - (cx + ridgeHalf)) * tf;
    ctx.beginPath(); ctx.moveTo(lx0, ly); ctx.lineTo(lx1, ly); ctx.stroke();
  }
  for (let vi = 1; vi < 8; vi++) {
    const vf = vi / 8;
    const bx2 = x - ox + (w + ox * 2) * vf;
    const tx2 = cx + (vf - 0.5) * 2 * ridgeHalf;
    ctx.beginPath(); ctx.moveTo(bx2, eaveY); ctx.lineTo(tx2, ridgeY); ctx.stroke();
  }
  ctx.strokeStyle = shadeHex(bd.roof, 0.72); ctx.lineWidth = 5; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(cx - ridgeHalf, ridgeY); ctx.lineTo(cx + ridgeHalf, ridgeY); ctx.stroke();
  ctx.lineWidth = 3.4;
  ctx.beginPath(); ctx.moveTo(cx - ridgeHalf, ridgeY); ctx.lineTo(cx - ridgeHalf - 5, ridgeY - 5); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx + ridgeHalf, ridgeY); ctx.lineTo(cx + ridgeHalf + 5, ridgeY - 5); ctx.stroke();
  ctx.strokeStyle = shadeHex(bd.roof, 0.8); ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(x - ox, eaveY); ctx.lineTo(x + w + ox, eaveY); ctx.stroke();
  ctx.lineCap = 'butt';
  const dw = 30, dh = h * 0.42, dTop = y + h - dh;
  ctx.fillStyle = '#43301d';
  ctx.fillRect(cx - dw / 2 - 3, dTop - 4, dw + 6, dh + 4);
  ctx.fillStyle = '#6b4a2c';
  ctx.fillRect(cx - dw / 2, dTop, dw / 2 - 1, dh);
  ctx.fillRect(cx + 1, dTop, dw / 2 - 1, dh);
  ctx.fillStyle = 'rgba(255,240,200,0.10)';
  ctx.fillRect(cx - dw / 2, dTop, dw / 2 - 1, dh);
  ctx.fillStyle = '#2e2013';
  ctx.fillRect(cx - 1, dTop, 2, dh);
  ctx.fillStyle = '#c8a24a';
  ctx.beginPath(); ctx.arc(cx - 4.5, dTop + dh * 0.52, 1.8, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(cx + 4.5, dTop + dh * 0.52, 1.8, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#9a958a'; ctx.fillRect(cx - dw / 2 - 5, y + h - 3, dw + 10, 5);
  ctx.fillStyle = 'rgba(0,0,0,0.15)'; ctx.fillRect(cx - dw / 2 - 5, y + h + 1, dw + 10, 1.6);
  [cx - w * 0.33, cx + w * 0.33].forEach((wxp) => {
    const ww2 = 21, wh2 = 17, wy = wallTop + h * 0.22;
    ctx.fillStyle = '#4c3a22'; ctx.fillRect(wxp - ww2 / 2 - 2, wy - 2, ww2 + 4, wh2 + 4);
    ctx.fillStyle = `rgba(255,205,110,${(0.75 + 0.2 * flick).toFixed(2)})`;
    ctx.fillRect(wxp - ww2 / 2, wy, ww2, wh2);
    ctx.strokeStyle = '#4c3a22'; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(wxp, wy); ctx.lineTo(wxp, wy + wh2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(wxp - ww2 / 2, wy + wh2 / 2); ctx.lineTo(wxp + ww2 / 2, wy + wh2 / 2); ctx.stroke();
  });
  [-1, 1].forEach((sgn) => {
    const lxp = cx + sgn * (dw / 2 + 22), lyt = eaveY + 3;
    ctx.strokeStyle = 'rgba(40,26,14,0.8)'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(lxp, lyt); ctx.lineTo(lxp, lyt + 6); ctx.stroke();
    ctx.fillStyle = `rgba(255,130,60,${(0.20 + 0.08 * flick).toFixed(2)})`;
    ctx.beginPath(); ctx.arc(lxp, lyt + 12, 9.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#c0452c';
    ctx.beginPath(); ctx.ellipse(lxp, lyt + 12, 5.6, 6.8, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = `rgba(255,220,150,${(0.55 + 0.3 * flick).toFixed(2)})`;
    ctx.beginPath(); ctx.ellipse(lxp - 1.2, lyt + 11, 2.2, 3.6, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#5a2c1c'; ctx.fillRect(lxp - 3, lyt + 4.6, 6, 2.2); ctx.fillRect(lxp - 3, lyt + 17.2, 6, 2.2);
  });
  ctx.font = "700 12.5px 'Segoe UI', system-ui, sans-serif"; ctx.textAlign = 'center';
  const sw = ctx.measureText(bd.name).width + 20, sh = 20;
  const sxp = cx - sw / 2, syp = eaveY + 12;
  ctx.strokeStyle = 'rgba(40,26,14,0.85)'; ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.moveTo(sxp + 5, eaveY + 1); ctx.lineTo(sxp + 5, syp); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(sxp + sw - 5, eaveY + 1); ctx.lineTo(sxp + sw - 5, syp); ctx.stroke();
  ctx.fillStyle = '#3a2a18'; ctx.fillRect(sxp, syp, sw, sh);
  ctx.strokeStyle = 'rgba(214,178,106,0.9)'; ctx.lineWidth = 1.4; ctx.strokeRect(sxp + 0.7, syp + 0.7, sw - 1.4, sh - 1.4);
  ctx.strokeStyle = 'rgba(214,178,106,0.22)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(sxp + 4, syp + 6.5); ctx.lineTo(sxp + sw - 4, syp + 6.5); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(sxp + 4, syp + sh - 5); ctx.lineTo(sxp + sw - 4, syp + sh - 5); ctx.stroke();
  ctx.fillStyle = '#ffe9b0';
  ctx.fillText(bd.name, cx, syp + 14.5);
  [-1, 1].forEach((sgn) => {
    const mxp = sxp + (sgn < 0 ? 6 : sw - 6), myp = syp + sh + 1;
    ctx.strokeStyle = 'rgba(40,26,14,0.8)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(mxp, myp - 3); ctx.lineTo(mxp, myp + 1.5); ctx.stroke();
    ctx.fillStyle = `rgba(255,130,60,${(0.16 + 0.07 * flick).toFixed(2)})`;
    ctx.beginPath(); ctx.arc(mxp, myp + 5.5, 6.4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#c0452c';
    ctx.beginPath(); ctx.ellipse(mxp, myp + 5.5, 3.7, 4.5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = `rgba(255,220,150,${(0.6 + 0.3 * flick).toFixed(2)})`;
    ctx.beginPath(); ctx.ellipse(mxp - 0.8, myp + 5, 1.4, 2.4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#5a2c1c'; ctx.fillRect(mxp - 2, myp + 0.4, 4, 1.4); ctx.fillRect(mxp - 2, myp + 9.2, 4, 1.4);
  });
}

// ---------------- CÂY — thân + tán 3 lớp (chuyển nguyên văn) ----------------
export function drawTree(t: { x: number; y: number; s: number }): void {
  const s = t.s, r = 24 * s;
  ctx.fillStyle = shadowAlpha('20,26,14', 0.22);
  ctx.beginPath(); ctx.ellipse(t.x + 8, t.y + 10, r * 0.72, 5.5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#6f5138';
  ctx.beginPath();
  ctx.moveTo(t.x - 4.6, t.y + 11);
  ctx.lineTo(t.x - 2.4, t.y - 22 * s);
  ctx.lineTo(t.x + 2.4, t.y - 22 * s);
  ctx.lineTo(t.x + 4.6, t.y + 11);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.beginPath();
  ctx.moveTo(t.x + 0.4, t.y - 22 * s);
  ctx.lineTo(t.x + 2.4, t.y - 22 * s);
  ctx.lineTo(t.x + 4.6, t.y + 11);
  ctx.lineTo(t.x + 1.2, t.y + 11);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(255,240,200,0.20)';
  ctx.fillRect(t.x - 3.4, t.y - 20 * s, 1.3, 26 * s);
  ctx.fillStyle = '#63503a';
  ctx.beginPath(); ctx.moveTo(t.x - 4.6, t.y + 11); ctx.lineTo(t.x - 8, t.y + 12.5); ctx.lineTo(t.x - 3, t.y + 12.5); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(t.x + 4.6, t.y + 11); ctx.lineTo(t.x + 8, t.y + 12.5); ctx.lineTo(t.x + 3, t.y + 12.5); ctx.closePath(); ctx.fill();
  const layers = [
    { dx: 0, dy: -27, rr: 1.0, c: '#2e7d2a' },
    { dx: -5, dy: -41, rr: 0.78, c: '#3fa33c' },
    { dx: 3, dy: -53, rr: 0.55, c: '#66c24e' },
  ];
  layers.forEach((L) => {
    const lx = t.x + L.dx * s, ly = t.y + L.dy * s, lr = r * L.rr;
    ctx.fillStyle = L.c;
    ctx.beginPath(); ctx.arc(lx, ly, lr, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(16,26,10,0.6)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(lx, ly, lr, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = 'rgba(0,0,0,0.10)';
    ctx.beginPath(); ctx.ellipse(lx, ly + lr * 0.45, lr * 0.85, lr * 0.5, 0, 0, Math.PI); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,214,0.13)';
    ctx.beginPath(); ctx.ellipse(lx - lr * 0.32, ly - lr * 0.38, lr * 0.42, lr * 0.26, -0.4, 0, Math.PI * 2); ctx.fill();
  });
  ctx.fillStyle = 'rgba(20,52,18,0.35)';
  ctx.beginPath(); ctx.ellipse(t.x + 7 * s, t.y - 24 * s, r * 0.62, r * 0.4, 0.3, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(140,220,100,0.20)';
  ctx.beginPath(); ctx.ellipse(t.x - 10 * s, t.y - 46 * s, r * 0.4, r * 0.24, -0.4, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(38,54,32,0.42)';
  [[-14, -34], [6, -30], [-2, -46], [13, -38], [-17, -24]].forEach((p) => { ctx.beginPath(); ctx.ellipse(t.x + p[0] * s, t.y + p[1] * s, 4.6 * s, 3.6 * s, 0.5, 0, Math.PI * 2); ctx.fill(); });
  ctx.fillStyle = 'rgba(214,235,180,0.30)';
  [[-8, -52], [9, -44]].forEach((p) => { ctx.beginPath(); ctx.ellipse(t.x + p[0] * s, t.y + p[1] * s, 3.4 * s, 2.6 * s, -0.4, 0, Math.PI * 2); ctx.fill(); });
  ctx.fillStyle = 'rgba(230,255,205,0.55)';
  [[-9, -58], [4, -63], [11, -50]].forEach((p) => {
    ctx.beginPath(); ctx.arc(t.x + p[0] * s, t.y + p[1] * s, 1.6, 0, Math.PI * 2); ctx.fill();
  });
}

// ---------------- THẾ GIỚI: hình học + nướng nền/nhà/cây ----------------
// GĐ51: vị trí 8 trụ đèn trụ đá (đầu tinh thể ở y−34) — dùng chung cho
// phần nướng môi trường và lớp quầng sáng ban đêm phía client.
export const LAMP_POSITIONS: [number, number][] = [
  [668, 386], [732, 386], [668, 742], [732, 742],
  [420, 528], [980, 528], [420, 596], [980, 596],
];

export const WORLD_GEO = {
  W: 1600,
  H: 1200,
  village: { x: 240, y: 180, w: 920, h: 760 },
  plaza: { x: 700, y: 560 },
  realm: { x: 1760, y: 240, w: 880, h: 720 }, // GĐ57: Bí Cảnh Thạch Lâm (nướng ở texture riêng 'realm-bg' vì giới hạn cỡ texture)
  pond: { x: 990, y: 890, rx: 75, ry: 45 },
  houses: [
    { name: 'Đạo Quán', x: 605, y: 245, w: 190, h: 115, body: '#e9dcbc', roof: '#8a4b2a' },
    { name: 'Nhà Trưởng Làng', x: 320, y: 425, w: 135, h: 100, body: '#eadfc6', roof: '#b5502f' },
    { name: 'Tiệm Đan Dược', x: 945, y: 425, w: 135, h: 100, body: '#eadfc6', roof: '#b5502f' },
    { name: 'Tiệm Rèn', x: 930, y: 695, w: 140, h: 105, body: '#e6d9c0', roof: '#a34a30' },
    { name: 'Quán Ăn', x: 455, y: 725, w: 140, h: 100, body: '#eadfc6', roof: '#b5502f' },
    { name: 'Tiệm Nguyên Liệu', x: 330, y: 262, w: 125, h: 95, body: '#eadfc6', roof: '#b5502f' },
    { name: 'Thanh Phong Môn', x: 1300, y: 440, w: 170, h: 110, body: '#e2ecd9', roof: '#2e6f6a' }, // GĐ22: môn phái nhỏ
  ] as Array<{ name: string; x: number; y: number; w: number; h: number; body: string; roof: string }>,
  trees: [
    [280, 220], [1120, 220], [280, 900], [1120, 905], [520, 300], [880, 300],
    [520, 860], [880, 640], [280, 400], [1120, 400], [640, 215], [760, 905],
    [150, 150], [1450, 150], [150, 1050], [1450, 1050], [120, 600], [1480, 600],
    [800, 80], [80, 80],
    // GĐ57: dải rừng ngăn phía đông + cây trong bí cảnh — KHỚP TREE_TRUNKS phía server
    [1680, 150], [1692, 330], [1676, 520], [1690, 700], [1680, 880], [1694, 1050],
    [1900, 340], [2150, 320], [2450, 360], [1980, 880], [2280, 890], [2520, 860],
    [2050, 560], [2400, 660],
  ] as Array<readonly [number, number]>,
};
export const HOUSE_TEX = { padX: 32, padY: 34 };
// GĐ73: Đạo Quán dùng canvas nướng riêng lớn hơn khung chuẩn để chứa
// sprite 320×138 — đặt ảnh ở (h.x − padX, h.y − padY) như nhà thường.
// Sprite vẽ tại (dx, dy): đáy ở canvas 149 → world 360 (đáy hộp),
// đỉnh ở world 222 — tâm Tụ Linh Trận (700,196) vẫn nhìn thấy.
export const DAOQUAN_TEX = { padX: 81, w: 352, h: 160, dx: 16, dy: 11, dw: 320, dh: 138 };
export const TREE_TEX = { w: 140, h: 160, originX: 0.5, originY: 130 / 160 };
export const FORM_TEX = { size: 160 }; // vòng trận pháp: ảnh 160×160 đặt giữa quảng trường

function makeCanvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  return [canvas, canvas.getContext('2d') as CanvasRenderingContext2D];
}

// Hạt giống cố định kiểu bản cũ — nền không đổi giữa các lần mở
function seededRand(seed0: number): () => number {
  let seed = seed0;
  return () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
}

// ---- GĐ15: pixel hoá theo bảng màu cho đồ họa môi trường/quái ----
// Thu texture đã nướng (nét vector mượt) về lưới pixel thật rồi BẮT mọi màu
// về bảng màu giới hạn suy từ style sprite gốc → nhà/cây/sói/gà ăn khớp với
// nhân vật pixel. Bảng màu từng nhóm được chọn tay theo vật liệu.
type RGB3 = [number, number, number];
const _hex2rgb3 = (h: string): RGB3 => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const _pal = (hexes: string[]): RGB3[] => hexes.map(_hex2rgb3);
const PAL_ENV = _pal([
  '#2f6628', '#3f7d33', '#4c8f3c', '#58a447', '#6cb457', '#86c06c', '#a8d88f',
  '#1b5e20', '#2e7d32', '#43a047', '#66bb6a', '#81c784',
  '#8a6f4d', '#a98f66', '#9d8f70', '#b7a888', '#c2b494',
  '#543a20', '#6e4f30', '#86643c', '#a07a4a',
  '#5f646b', '#767b82', '#8d9299', '#a8adb3', '#bfc3c7',
  '#4789ad', '#5aa7c7', '#79bede', '#a8d4e8',
  '#e86a92', '#f2d13c', '#e1a344', '#f0b250', '#7fe7dc', '#eafffa',
  '#20301c', '#101408',
]);
const PAL_HOUSE = _pal([
  '#8c3222', '#a03d2a', '#b84a30', '#c85a3a', '#d4694a',
  '#543a20', '#6e4f30', '#86643c', '#a07a4a', '#5d4037', '#4a332a',
  '#d8c8a4', '#e8dcc0', '#efe3c8', '#f2e8d0', '#f3e5c0',
  '#5f646b', '#767b82', '#8d9299', '#a8adb3',
  '#c0392b', '#e5484d', '#e1a344', '#f0b250', '#f8f8f8',
  '#2e7d32', '#43a047', '#171208', '#8a6844', '#6e5133',
]);
const PAL_WOLF = _pal(['#33373d', '#4b5058', '#62676f', '#7a7f87', '#989ea6', '#b4bac1', '#d3d8de', '#efe9db', '#8a6844', '#d3382c', '#1a1d21']);
const PAL_BAT = _pal(['#241f33', '#3a3352', '#554a73', '#7768a0', '#a294c7', '#d3382c', '#101408']);
const PAL_GOLEM = _pal(['#5d5f52', '#74766a', '#8f9084', '#acaea0', '#cfcfc2', '#6f9a48', '#3c6030', '#232a18']);
const PAL_BIRD = _pal(['#f4f1e6', '#e8e2d0', '#d8cba8', '#ffffff', '#f0b250', '#e1a344', '#d3382c', '#e86a92', '#2e7d32', '#171208', '#8a6844']);

function pixelSnap(scene: Phaser.Scene, key: string, factor: number, palette: RGB3[]): void {
  const tex = scene.textures.get(key);
  if (!tex) return;
  const src = tex.getSourceImage() as HTMLCanvasElement;
  if (!src || !src.width || !src.height) return;
  const sw = Math.max(1, Math.round(src.width / factor));
  const sh = Math.max(1, Math.round(src.height / factor));
  const small = document.createElement('canvas');
  small.width = sw; small.height = sh;
  const sc = small.getContext('2d');
  if (!sc) return;
  sc.imageSmoothingEnabled = true;
  sc.drawImage(src, 0, 0, sw, sh);
  const img = sc.getImageData(0, 0, sw, sh);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const a = d[i + 3];
    if (a < 70) { d[i + 3] = 0; continue; }
    const r = d[i], g = d[i + 1], b = d[i + 2];
    let best = palette[0], bd = Infinity;
    for (const p of palette) {
      const dr = r - p[0], dg = g - p[1], db = b - p[2];
      const dist = dr * dr * 0.3 + dg * dg * 0.59 + db * db * 0.11;
      if (dist < bd) { bd = dist; best = p; }
    }
    d[i] = best[0]; d[i + 1] = best[1]; d[i + 2] = best[2];
  }
  sc.putImageData(img, 0, 0);
  const out = document.createElement('canvas');
  out.width = src.width; out.height = src.height;
  const oc = out.getContext('2d');
  if (!oc) return;
  oc.imageSmoothingEnabled = false;
  oc.drawImage(small, 0, 0, out.width, out.height);
  scene.textures.remove(key);
  scene.textures.addCanvas(key, out);
  scene.textures.get(key).setFilter(1);
}

export function bakeWorldTextures(scene: Phaser.Scene): void {
  if (scene.textures.exists('world-bg')) return;
  const G = WORLD_GEO;
  const rnd = seededRand(12345);

  // ---------- NỀN ĐẤT TOÀN BẢN ĐỒ ----------
  // GĐ28: nướng nền ở độ phân giải 2× (supersample) — pixelSnap ×2 cho texel 1px thế giới, nét như sprite nhân vật
  const [bgC, b] = makeCanvas(G.W * 2, G.H * 2);
  b.scale(2, 2);
  b.fillStyle = '#58a447';
  b.fillRect(0, 0, G.W, G.H);
  for (let wb = 0; wb < 30; wb++) {
    const wx = rnd() * G.W, wy = rnd() * G.H, wr = 260 + rnd() * 620;
    b.fillStyle = wb % 2 ? 'rgba(52,72,40,0.05)' : 'rgba(246,240,214,0.05)';
    b.beginPath(); b.ellipse(wx, wy, wr, wr * 0.62, rnd() * 3, 0, Math.PI * 2); b.fill();
  }
  const pxTones = ['rgba(30,84,28,0.16)', 'rgba(190,235,140,0.13)', 'rgba(140,105,50,0.12)'];
  for (let pi = 0; pi < 11000; pi++) {
    const px = Math.floor(rnd() * (G.W / 16)) * 16, py = Math.floor(rnd() * (G.H / 16)) * 16;
    b.fillStyle = pxTones[pi % 3];
    b.fillRect(px, py, 16, 16);
  }
  const pxDet = ['rgba(24,74,24,0.20)', 'rgba(168,230,120,0.16)', 'rgba(240,220,90,0.10)'];
  for (let pd = 0; pd < 5200; pd++) {
    const px = Math.floor(rnd() * (G.W / 8)) * 8, py = Math.floor(rnd() * (G.H / 8)) * 8;
    b.fillStyle = pxDet[pd % 3];
    b.fillRect(px, py, 8, 8);
  }
  for (let i = 0; i < 4200; i++) {
    b.fillStyle = rnd() > 0.5 ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,220,0.05)';
    b.fillRect(rnd() * G.W, rnd() * G.H, 3, 5);
  }
  // Nền làng sáng hơn nền farm
  b.fillStyle = 'rgba(216,234,174,0.15)';
  b.fillRect(G.village.x, G.village.y, G.village.w, G.village.h);

  // ---------- ĐƯỜNG ĐÁ CUỘI ----------
  const paintRoad = (x: number, y: number, w: number, h: number) => {
    b.fillStyle = '#a98f66';
    b.fillRect(x, y, w, h);
    b.fillStyle = 'rgba(0,0,0,0.10)';
    if (w > h) { b.fillRect(x, y + h - 5, w, 5); } else { b.fillRect(x + w - 5, y, 5, h); }
    const slabTones = ['#b7a888', '#9d8f70', '#c2b494'];
    const horiz = w > h;
    const n = Math.floor((horiz ? w : h) / 24);
    for (let si = 0; si < n; si++) {
      for (let sj = 0; sj < 2; sj++) {
        const off = si * 24 + (sj % 2) * 7 + rnd() * 3;
        const sx = horiz ? x + off : x + 3 + sj * 13 + rnd() * 2;
        const sy = horiz ? y + 3 + sj * 13 + rnd() * 2 : y + off;
        b.fillStyle = slabTones[(si + sj) % 3];
        b.beginPath();
        const rw = horiz ? 19 : 10, rh = horiz ? 10 : 19;
        b.roundRect(sx, sy, rw, rh, 3);
        b.fill();
      }
    }
    b.strokeStyle = 'rgba(70,55,30,0.35)'; b.lineWidth = 2;
    b.strokeRect(x + 1, y + 1, w - 2, h - 2);
  };
  // GĐ18: nền làng phủ đất nện + sỏi nhỏ — tách khỏi cỏ hoang bên ngoài hàng rào
  {
    const V0 = G.village;
    b.fillStyle = 'rgba(196, 172, 118, 0.13)';
    b.fillRect(V0.x, V0.y, V0.w, V0.h);
    for (let si = 0; si < 700; si++) {
      const px = V0.x + rnd() * V0.w, py = V0.y + rnd() * V0.h;
      if (Math.hypot(px - G.plaza.x, py - G.plaza.y) < 158) continue;
      b.fillStyle = rnd() > 0.5 ? 'rgba(120,100,60,0.12)' : 'rgba(230,220,190,0.10)';
      b.fillRect(px, py, 3.5, 2.2);
    }
  }
  // GĐ23: TỤ LINH TRẬN ở Thiền Phòng phía sau Đạo Quán (700,196) — vòng trận
  // phát sáng ngọc lục, nơi người chơi đứng vào BẾ QUAN (+3 Tu vi/ngày)
  {
    const TX = 700, TY = 196;
    b.fillStyle = 'rgba(150,160,150,0.30)';
    b.beginPath(); b.arc(TX, TY, 52, 0, Math.PI * 2); b.fill();
    b.strokeStyle = 'rgba(46,180,160,0.75)';
    b.lineWidth = 3;
    b.beginPath(); b.arc(TX, TY, 46, 0, Math.PI * 2); b.stroke();
    b.strokeStyle = 'rgba(120,230,205,0.55)';
    b.lineWidth = 2;
    b.beginPath(); b.arc(TX, TY, 32, 0, Math.PI * 2); b.stroke();
    b.fillStyle = 'rgba(160,255,225,0.85)';
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2;
      b.beginPath(); b.arc(TX + Math.cos(a) * 39, TY + Math.sin(a) * 39, 3, 0, Math.PI * 2); b.fill();
    }
    b.beginPath(); b.arc(TX, TY, 4.5, 0, Math.PI * 2); b.fill();
  }
  // GĐ22: sân Thanh Phong Môn — nền đất nện riêng phía đông làng (vùng an toàn)
  {
    const SX = 1230, SY = 420, SW = 300, SH = 240;
    b.fillStyle = 'rgba(186, 178, 128, 0.20)';
    b.fillRect(SX, SY, SW, SH);
    b.strokeStyle = 'rgba(90, 80, 50, 0.35)';
    b.lineWidth = 3;
    b.strokeRect(SX + 2, SY + 2, SW - 4, SH - 4);
    for (let si = 0; si < 260; si++) {
      const px = SX + rnd() * SW, py = SY + rnd() * SH;
      b.fillStyle = rnd() > 0.5 ? 'rgba(110,95,55,0.13)' : 'rgba(235,228,195,0.11)';
      b.fillRect(px, py, 3.5, 2.2);
    }
  }
  paintRoad(0, 545, G.W, 30);
  paintRoad(685, 0, 30, G.H);

  // ---------- QUẢNG TRƯỜNG ĐÁ ----------
  const P = G.plaza;
  b.fillStyle = '#b3ac9c';
  b.beginPath(); b.arc(P.x, P.y, 150, 0, Math.PI * 2); b.fill();
  b.fillStyle = '#bcb6a8';
  b.beginPath(); b.arc(P.x, P.y, 108, 0, Math.PI * 2); b.fill();
  // GĐ18: lát đá cuội toàn quảng trường (viên bo tròn, mạch vữa tối, lệch hàng)
  {
    b.save();
    b.beginPath(); b.arc(P.x, P.y, 148, 0, Math.PI * 2); b.clip();
    const tones = ['#bdb6a6', '#b0a996', '#c6c0b2', '#a89f8d', '#bab2a0'];
    const sw = 30, sh = 22;
    let row = 0;
    for (let yy = P.y - 152; yy < P.y + 150; yy += sh, row++) {
      const off = (row % 2) * (sw / 2);
      for (let xx = P.x - 152 - sw; xx < P.x + 150; xx += sw) {
        b.fillStyle = tones[Math.floor(rnd() * tones.length)];
        b.beginPath(); b.roundRect(xx + off + 1.5, yy + 1.5, sw - 3, sh - 3, 5); b.fill();
        b.fillStyle = 'rgba(255,255,250,0.10)';
        b.beginPath(); b.roundRect(xx + off + 4, yy + 3.5, sw - 10, 5, 2); b.fill();
      }
    }
    b.restore();
  }
  b.strokeStyle = 'rgba(90,84,70,0.5)'; b.lineWidth = 3;
  b.beginPath(); b.arc(P.x, P.y, 150, 0, Math.PI * 2); b.stroke();
  b.beginPath(); b.arc(P.x, P.y, 108, 0, Math.PI * 2); b.stroke();
  b.strokeStyle = 'rgba(90,84,70,0.18)'; b.lineWidth = 2;
  for (let si = 0; si < 12; si++) {
    const a = (si / 12) * Math.PI * 2;
    b.beginPath();
    b.moveTo(P.x + Math.cos(a) * 108, P.y + Math.sin(a) * 108);
    b.lineTo(P.x + Math.cos(a) * 150, P.y + Math.sin(a) * 150);
    b.stroke();
  }
  for (let si = 0; si < 300; si++) {
    const a = rnd() * Math.PI * 2, rr = Math.sqrt(rnd()) * 146;
    b.fillStyle = rnd() > 0.5 ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,246,0.06)';
    b.fillRect(P.x + Math.cos(a) * rr, P.y + Math.sin(a) * rr, 5, 3);
  }

  // ---------- AO SEN ----------
  const PD = G.pond;
  b.fillStyle = '#cfc39f';
  b.beginPath(); b.ellipse(PD.x, PD.y, PD.rx + 7, PD.ry + 7, 0, 0, Math.PI * 2); b.fill();
  const wg = b.createRadialGradient(PD.x - 18, PD.y - 10, 8, PD.x, PD.y, PD.rx);
  wg.addColorStop(0, '#93cfeb'); wg.addColorStop(1, '#5ea8cf');
  b.fillStyle = wg;
  b.beginPath(); b.ellipse(PD.x, PD.y, PD.rx, PD.ry, 0, 0, Math.PI * 2); b.fill();
  b.strokeStyle = '#d8d2c0'; b.lineWidth = 3;
  b.beginPath(); b.ellipse(PD.x, PD.y, PD.rx, PD.ry, 0, 0, Math.PI * 2); b.stroke();
  b.fillStyle = '#3f9e4d';
  [[955, 875, 9], [1010, 905, 10], [985, 865, 8], [1030, 880, 8], [948, 902, 7]].forEach(([lx, ly, lr]) => {
    b.beginPath(); b.arc(lx, ly, lr, 0, Math.PI * 2); b.fill();
    b.fillStyle = '#359145';
    b.beginPath(); b.arc(lx - 2, ly - 2, lr * 0.55, 0, Math.PI * 2); b.fill();
    b.fillStyle = '#3f9e4d';
  });
  b.fillStyle = '#f2a7c3';
  [[965, 880], [1015, 900]].forEach(([lx, ly]) => { b.beginPath(); b.arc(lx, ly, 4, 0, Math.PI * 2); b.fill(); });
  b.fillStyle = 'rgba(255,255,255,0.55)';
  for (let si = 0; si < 9; si++) { b.fillRect(PD.x - 60 + rnd() * 120, PD.y - 32 + rnd() * 64, 3, 1.6); }

  // ---------- HÀNG RÀO + CỔNG ----------
  const V = G.village;
  const posts: Array<[number, number]> = [];
  for (let x = V.x; x <= V.x + V.w; x += 34) {
    if (Math.abs(x - 700) > 26) { posts.push([x, V.y]); posts.push([x, V.y + V.h]); }
  }
  for (let y = V.y; y <= V.y + V.h; y += 34) {
    if (Math.abs(y - 560) > 26) { posts.push([V.x, y]); posts.push([V.x + V.w, y]); }
  }
  b.strokeStyle = 'rgba(122,90,52,0.85)'; b.lineWidth = 3;
  const postSet = new Set(posts.map(([x, y]) => x + ',' + y));
  for (const [x, y] of posts) {
    for (const [nx, ny] of [[x + 34, y], [x, y + 34]] as const) {
      if (postSet.has(nx + ',' + ny)) {
        b.beginPath(); b.moveTo(x, y - 2); b.lineTo(nx, ny - 2); b.stroke();
        b.beginPath(); b.moveTo(x, y + 3); b.lineTo(nx, ny + 3); b.stroke();
      }
    }
  }
  for (const [x, y] of posts) {
    b.fillStyle = '#8a6844';
    b.beginPath(); b.roundRect(x - 3.5, y - 6, 7, 13, 2); b.fill();
    b.fillStyle = '#a37c50';
    b.fillRect(x - 3.5, y - 6, 7, 3);
  }

  // ---------- CỘT ĐÈN TRỤ ĐÁ + TINH THỂ ----------
  const lamp = (lx: number, ly: number) => {
    const glow = b.createRadialGradient(lx, ly - 34, 2, lx, ly - 34, 17);
    glow.addColorStop(0, 'rgba(170,235,245,0.5)'); glow.addColorStop(1, 'rgba(170,235,245,0)');
    b.fillStyle = glow;
    b.beginPath(); b.arc(lx, ly - 34, 17, 0, Math.PI * 2); b.fill();
    b.fillStyle = '#7d7d74';
    b.beginPath(); b.moveTo(lx - 6, ly); b.lineTo(lx + 6, ly); b.lineTo(lx + 4, ly - 26); b.lineTo(lx - 4, ly - 26); b.closePath(); b.fill();
    b.fillStyle = '#8f8f86'; b.fillRect(lx - 7, ly - 29, 14, 4);
    b.fillStyle = '#5c5c56'; b.fillRect(lx - 8, ly - 2, 16, 3);
    b.fillStyle = '#cfeef2';
    b.beginPath(); b.moveTo(lx, ly - 43); b.lineTo(lx + 4.6, ly - 34); b.lineTo(lx, ly - 25); b.lineTo(lx - 4.6, ly - 34); b.closePath(); b.fill();
    b.fillStyle = '#ffffff';
    b.beginPath(); b.moveTo(lx, ly - 40); b.lineTo(lx + 2.2, ly - 34); b.lineTo(lx, ly - 28); b.lineTo(lx - 2.2, ly - 34); b.closePath(); b.fill();
  };
  LAMP_POSITIONS.forEach(([lx, ly]) => lamp(lx, ly));

  // ---------- TRANG TRÍ MẶT ĐẤT (né đường/quảng trường/nhà/ao) ----------
  const blocked = (px: number, py: number): boolean => {
    if (Math.abs(py - 560) < 25 || Math.abs(px - 700) < 25) return true;
    if (Math.hypot(px - P.x, py - P.y) < 168) return true;
    const pdx = (px - PD.x) / (PD.rx + 18), pdy = (py - PD.y) / (PD.ry + 18);
    if (pdx * pdx + pdy * pdy < 1) return true;
    for (const hs of G.houses) if (px > hs.x - 12 && px < hs.x + hs.w + 12 && py > hs.y - 30 && py < hs.y + hs.h + 14) return true;
    if (px > 742 && px < 858 && py > 600 && py < 686) return true;
    return false;
  };
  const TUFT_COLS = ['#3e7d2c', '#57a047', '#2e6624'];
  const FLOWER_COLS = ['#e86a8a', '#f2d13c', '#ffffff', '#c95bf0', '#e5484d'];
  const place = (n: number, draw: (x: number, y: number, c: number) => void) => {
    let put = 0, tries = 0;
    while (put < n && tries < n * 14) {
      tries++;
      const px = 12 + rnd() * (G.W - 24), py = 12 + rnd() * (G.H - 24);
      if (blocked(px, py)) continue;
      draw(px, py, (rnd() * 5) | 0);
      put++;
    }
  };
  place(700, (x, y, c) => {
    b.strokeStyle = TUFT_COLS[c % 3]; b.lineWidth = 1.6; b.lineCap = 'round';
    b.beginPath();
    b.moveTo(x - 3, y); b.quadraticCurveTo(x - 3.4, y - 5, x - 4.4, y - 8.4);
    b.moveTo(x, y); b.quadraticCurveTo(x, y - 6, x, y - 10);
    b.moveTo(x + 3, y); b.quadraticCurveTo(x + 3.4, y - 5, x + 4.4, y - 8);
    b.stroke();
  });
  place(170, (x, y, c) => {
    b.strokeStyle = '#4d7a34'; b.lineWidth = 1.4;
    b.beginPath(); b.moveTo(x, y); b.quadraticCurveTo(x, y - 4, x, y - 7.6); b.stroke();
    b.fillStyle = FLOWER_COLS[c % 5];
    const hy = y - 8.6;
    b.beginPath();
    b.arc(x - 2.2, hy, 1.9, 0, Math.PI * 2); b.arc(x + 2.2, hy, 1.9, 0, Math.PI * 2);
    b.arc(x, hy - 2.2, 1.9, 0, Math.PI * 2); b.arc(x, hy + 2.2, 1.9, 0, Math.PI * 2);
    b.fill();
    b.fillStyle = '#fff3c9';
    b.beginPath(); b.arc(x, hy, 1.3, 0, Math.PI * 2); b.fill();
  });
  place(110, (x, y) => {
    b.fillStyle = 'rgba(90,88,80,0.5)';
    b.beginPath(); b.ellipse(x, y, 3.6, 2.4, 0, 0, Math.PI * 2); b.fill();
    b.fillStyle = 'rgba(200,198,188,0.5)';
    b.beginPath(); b.ellipse(x - 1, y - 0.8, 1.8, 1.1, 0, 0, Math.PI * 2); b.fill();
  });
  place(26, (x, y) => {
    b.fillStyle = '#e8e2d0'; b.fillRect(x - 1.2, y - 4, 2.4, 4.4);
    b.fillStyle = '#c0392b';
    b.beginPath(); b.arc(x, y - 4.4, 3.6, Math.PI, Math.PI * 2); b.fill();
    b.fillStyle = '#fff3c9';
    b.beginPath(); b.arc(x - 1.4, y - 5.8, 0.7, 0, Math.PI * 2); b.arc(x + 1.6, y - 6.4, 0.6, 0, Math.PI * 2); b.fill();
  });
  place(70, (x, y, c) => {
    b.strokeStyle = c % 2 ? 'rgba(146,106,52,0.55)' : 'rgba(110,84,40,0.5)'; b.lineWidth = 1.3;
    const a = rnd() * Math.PI;
    b.beginPath(); b.moveTo(x - Math.cos(a) * 3.4, y - Math.sin(a) * 2); b.lineTo(x + Math.cos(a) * 3.4, y + Math.sin(a) * 2); b.stroke();
  });

  // ---------- VÒNG TRẬN PHÁP: phần tĩnh ----------
  const fc = GFX_CONFIG.form.color;
  const fglow = b.createRadialGradient(P.x, P.y, 6, P.x, P.y, 90);
  fglow.addColorStop(0, 'rgba(127,227,208,0.20)'); fglow.addColorStop(1, 'rgba(127,227,208,0)');
  b.fillStyle = fglow;
  b.beginPath(); b.arc(P.x, P.y, 90, 0, Math.PI * 2); b.fill();
  const FR = 66;
  b.strokeStyle = fc; b.globalAlpha = 0.16; b.lineWidth = 5;
  b.beginPath(); b.arc(P.x, P.y, FR, 0, Math.PI * 2); b.stroke();
  b.globalAlpha = 0.34; b.lineWidth = 2;
  b.beginPath(); b.arc(P.x, P.y, FR * 0.9, 0, Math.PI * 2); b.stroke();
  b.globalAlpha = 0.88; b.lineWidth = 1.4;
  b.beginPath(); b.arc(P.x, P.y, FR, 0, Math.PI * 2); b.stroke();
  b.beginPath(); b.arc(P.x, P.y, FR * 0.9, 0, Math.PI * 2); b.stroke();
  b.globalAlpha = 0.8;
  b.beginPath(); b.arc(P.x, P.y, FR * 0.17, 0, Math.PI * 2); b.stroke();
  b.globalAlpha = 1; b.fillStyle = '#eafffa';
  b.beginPath(); b.arc(P.x, P.y, 2.4, 0, Math.PI * 2); b.fill();
  // GĐ57: vòng cổng BÍ CẢNH ở sân Thanh Phong Môn (1470,600) — vẽ cùng
  // ngôn ngữ với vòng trận pháp quảng trường nhưng tông tím huyền bí
  {
    const pg = b.createRadialGradient(1470, 600, 6, 1470, 600, 74);
    pg.addColorStop(0, 'rgba(190,160,255,0.22)'); pg.addColorStop(1, 'rgba(190,160,255,0)');
    b.fillStyle = pg;
    b.beginPath(); b.arc(1470, 600, 74, 0, Math.PI * 2); b.fill();
    b.strokeStyle = 'rgba(168,140,250,0.85)'; b.lineWidth = 2;
    b.beginPath(); b.arc(1470, 600, 44, 0, Math.PI * 2); b.stroke();
    b.strokeStyle = 'rgba(127,231,220,0.7)'; b.lineWidth = 1.4;
    b.beginPath(); b.arc(1470, 600, 36, 0, Math.PI * 2); b.stroke();
    b.fillStyle = '#efe9ff';
    b.beginPath(); b.arc(1470, 600, 2.6, 0, Math.PI * 2); b.fill();
  }
  // Viền bản đồ
  b.strokeStyle = 'rgba(24,46,24,0.5)'; b.lineWidth = 10;
  b.strokeRect(5, 5, G.W - 10, G.H - 10);
  scene.textures.addCanvas('world-bg', bgC);

  // ---------- GĐ57: NỀN PHÍA ĐÔNG (dải rừng ngăn + BÍ CẢNH THẠCH LÂM) ----------
  // Texture riêng cho x∈[1600,2800] — gộp vào world-bg sẽ quá 4096px,
  // nhiều GPU điện thoại không nạp nổi. Tọa độ vẽ = tọa độ thế giới,
  // canvas tự tịnh tiến −1600.
  {
    const [rC, r] = makeCanvas(1200 * 2, G.H * 2);
    r.scale(2, 2);
    r.translate(-1600, 0);
    const rrnd = seededRand(4242);
    r.fillStyle = '#4a7d3e';
    r.fillRect(1600, 0, 1200, G.H);
    for (let i = 0; i < 5200; i++) {
      r.fillStyle = pxDet[i % 3];
      r.fillRect(1600 + Math.floor(rrnd() * 150) * 8, Math.floor(rrnd() * 150) * 8, 8, 8);
    }
    // Dải rừng ngăn 1600–1760: nền tối rậm
    r.fillStyle = 'rgba(24,52,24,0.45)';
    r.fillRect(1600, 0, 160, G.H);
    for (let i = 0; i < 260; i++) {
      const cx = 1604 + rrnd() * 152, cy = rrnd() * G.H;
      r.fillStyle = `rgba(18,44,18,${0.12 + rrnd() * 0.15})`;
      r.beginPath(); r.ellipse(cx, cy, 16 + rrnd() * 22, 12 + rrnd() * 16, 0, 0, Math.PI * 2); r.fill();
    }
    // Nền bí cảnh: cỏ lạnh pha đá
    const RM = G.realm;
    r.fillStyle = 'rgba(58,88,84,0.38)';
    r.fillRect(RM.x, RM.y, RM.w, RM.h);
    r.fillStyle = 'rgba(30,60,58,0.20)';
    r.fillRect(RM.x + 14, RM.y + 14, RM.w - 28, RM.h - 28);
    for (let i = 0; i < 2400; i++) {
      const px = RM.x + Math.floor(rrnd() * (RM.w / 8)) * 8, py = RM.y + Math.floor(rrnd() * (RM.h / 8)) * 8;
      r.fillStyle = pxDet[i % 3];
      r.fillRect(px, py, 8, 8);
    }
    for (let i = 0; i < 300; i++) { // sỏi đá trong bí cảnh
      const px = RM.x + rrnd() * RM.w, py = RM.y + rrnd() * RM.h;
      r.fillStyle = rrnd() > 0.5 ? 'rgba(140,148,150,0.25)' : 'rgba(52,72,70,0.25)';
      r.fillRect(px, py, 3 + rrnd() * 4, 2 + rrnd() * 3);
    }
    // Hàng đá viền bí cảnh (khớp vòng tường vô hình phía server)
    const rockAt = (x: number, y: number, s: number) => {
      r.fillStyle = 'rgba(0,0,0,0.18)';
      r.beginPath(); r.ellipse(x, y + 5 * s, 13 * s, 4 * s, 0, 0, Math.PI * 2); r.fill();
      r.fillStyle = '#767b82';
      r.beginPath(); r.ellipse(x, y, 12 * s, 9 * s, 0, 0, Math.PI * 2); r.fill();
      r.fillStyle = '#a8adb3';
      r.beginPath(); r.ellipse(x - 3 * s, y - 3 * s, 6 * s, 4 * s, 0, 0, Math.PI * 2); r.fill();
    };
    for (let x = RM.x + 6; x <= RM.x + RM.w - 6; x += 42) { rockAt(x, RM.y + 4, 0.9 + rrnd() * 0.4); rockAt(x, RM.y + RM.h - 4, 0.9 + rrnd() * 0.4); }
    for (let y = RM.y + 40; y <= RM.y + RM.h - 40; y += 42) { rockAt(RM.x + 4, y, 0.9 + rrnd() * 0.4); rockAt(RM.x + RM.w - 4, y, 0.9 + rrnd() * 0.4); }
    // Tinh thể ngọc rải trong bí cảnh (trang trí)
    const crystalAt = (x: number, y: number, s: number) => {
      r.fillStyle = 'rgba(127,231,220,0.85)';
      r.beginPath(); r.moveTo(x, y - 16 * s); r.lineTo(x + 6 * s, y); r.lineTo(x, y + 4 * s); r.lineTo(x - 6 * s, y); r.closePath(); r.fill();
      r.fillStyle = 'rgba(234,255,250,0.9)';
      r.beginPath(); r.moveTo(x, y - 16 * s); r.lineTo(x + 3 * s, y - 2 * s); r.lineTo(x, y + 2 * s); r.lineTo(x - 3 * s, y - 2 * s); r.closePath(); r.fill();
    };
    const crys: Array<[number, number]> = [[1960, 430], [2320, 420], [2560, 520], [2020, 780], [2480, 800], [2180, 900], [2560, 900], [1900, 700]];
    for (const [cx, cy] of crys) { crystalAt(cx, cy, 0.8 + rrnd() * 0.5); crystalAt(cx + 14, cy + 4, 0.55); }
    // Đàn đá — nơi Thạch Khôi Lỗi trấn giữ (2200,600)
    {
      r.fillStyle = 'rgba(126,130,124,0.45)';
      r.beginPath(); r.arc(2200, 600, 86, 0, Math.PI * 2); r.fill();
      r.strokeStyle = 'rgba(190,196,188,0.5)'; r.lineWidth = 3;
      r.beginPath(); r.arc(2200, 600, 74, 0, Math.PI * 2); r.stroke();
      for (let k = 0; k < 6; k++) {
        const a = (k / 6) * Math.PI * 2;
        rockAt(2200 + Math.cos(a) * 74, 600 + Math.sin(a) * 74, 1.15);
      }
      crystalAt(2200 - 52, 600 - 40, 1.0); crystalAt(2200 + 52, 600 - 40, 1.0);
      crystalAt(2200 - 52, 600 + 44, 1.0); crystalAt(2200 + 52, 600 + 44, 1.0);
    }
    // Vòng cổng TRỞ VỀ trong bí cảnh (1832,600)
    {
      const pg = r.createRadialGradient(1832, 600, 6, 1832, 600, 74);
      pg.addColorStop(0, 'rgba(190,160,255,0.22)'); pg.addColorStop(1, 'rgba(190,160,255,0)');
      r.fillStyle = pg;
      r.beginPath(); r.arc(1832, 600, 74, 0, Math.PI * 2); r.fill();
      r.strokeStyle = 'rgba(168,140,250,0.85)'; r.lineWidth = 2;
      r.beginPath(); r.arc(1832, 600, 44, 0, Math.PI * 2); r.stroke();
      r.strokeStyle = 'rgba(127,231,220,0.7)'; r.lineWidth = 1.4;
      r.beginPath(); r.arc(1832, 600, 36, 0, Math.PI * 2); r.stroke();
    }
    scene.textures.addCanvas('realm-bg', rC);
  }

  // ---------- VÒNG QUẺ XOAY (8 quẻ + vòng tick) ----------
  const [triC, tc] = makeCanvas(FORM_TEX.size * 2, FORM_TEX.size * 2);
  tc.scale(2, 2);
  tc.translate(FORM_TEX.size / 2, FORM_TEX.size / 2);
  tc.font = `${Math.round(FR * 0.27)}px 'Segoe UI Symbol', 'Noto Sans Symbols 2', serif`;
  tc.textAlign = 'center'; tc.textBaseline = 'middle';
  tc.fillStyle = fc; tc.globalAlpha = 0.92;
  for (let gi = 0; gi < 8; gi++) {
    tc.save(); tc.rotate((gi * Math.PI) / 4); tc.translate(0, -FR * 0.815);
    tc.fillText(GFX_CONFIG.form.glyphs[gi], 0, 0); tc.restore();
  }
  tc.globalAlpha = 0.55;
  for (let tk = 0; tk < 24; tk++) {
    const ta = (tk / 24) * Math.PI * 2;
    tc.fillRect(Math.cos(ta) * FR * 0.7 - 0.8, Math.sin(ta) * FR * 0.7 - 0.8, 1.6, 1.6);
  }
  scene.textures.addCanvas('form-trigram', triC);

  // ---------- SAO NGŨ HÀNH XOAY NGƯỢC ----------
  const [starC, sc2] = makeCanvas(FORM_TEX.size * 2, FORM_TEX.size * 2);
  sc2.scale(2, 2);
  sc2.translate(FORM_TEX.size / 2, FORM_TEX.size / 2);
  const elemKeys = ['Kim', 'Mộc', 'Thủy', 'Hỏa', 'Thổ'];
  const pts: Array<{ x: number; y: number }> = [];
  for (let ei = 0; ei < 5; ei++) {
    const ea = -Math.PI / 2 + (ei * Math.PI * 2) / 5;
    pts.push({ x: Math.cos(ea) * FR * 0.5, y: Math.sin(ea) * FR * 0.5 });
  }
  sc2.strokeStyle = fc; sc2.globalAlpha = 0.6; sc2.lineWidth = 1.1;
  sc2.beginPath();
  [0, 2, 4, 1, 3, 0].forEach((pi2, ix) => { if (ix === 0) sc2.moveTo(pts[pi2].x, pts[pi2].y); else sc2.lineTo(pts[pi2].x, pts[pi2].y); });
  sc2.stroke();
  sc2.globalAlpha = 0.95;
  for (let ej = 0; ej < 5; ej++) {
    sc2.fillStyle = GFX_CONFIG.elements[elemKeys[ej]];
    sc2.beginPath(); sc2.arc(pts[ej].x, pts[ej].y, 2.6, 0, Math.PI * 2); sc2.fill();
  }
  scene.textures.addCanvas('form-star', starC);

  // ---------- NHÀ (mỗi nhà 1 texture, đặt theo chiều sâu) ----------
  G.houses.forEach((h, i) => {
    // GĐ28: nướng 2× — chữ biển hiệu 12.5px sống sót qua pixelSnap, không còn nhòe
    // GĐ73: Đạo Quán dùng canvas riêng lớn hơn (DAOQUAN_TEX) để chứa
    // sprite 320×138 — khung chuẩn (w+64) không đủ rộng.
    const isDaoQuan = h.name === 'Đạo Quán' && scene.textures.exists('dao-quan-01');
    const cw = isDaoQuan ? DAOQUAN_TEX.w : h.w + 64;
    const ch = isDaoQuan ? DAOQUAN_TEX.h : h.h + 64;
    const [c2, cx2] = makeCanvas(cw * 2, ch * 2);
    cx2.scale(2, 2);
    _setCtx(cx2);
    if (isDaoQuan) {
      // Sprite cắt nền 338×146 (lề 23px): vẽ 320×138, đáy chạm đáy
      // hộp (world 360), đỉnh ở world 222 — tâm Tụ Linh Trận (196)
      // vẫn nhìn thấy. Va chạm/vị trí/depth không đổi. Biển tên vẽ
      // code (drawBuilding) mất theo — sprite có biển vàng trống.
      const dq = scene.textures.get('dao-quan-01').getSourceImage() as unknown as CanvasImageSource;
      cx2.drawImage(dq, 23, 23, 338, 146, DAOQUAN_TEX.dx, DAOQUAN_TEX.dy, DAOQUAN_TEX.dw, DAOQUAN_TEX.dh);
    } else {
      // GĐ72: nhà nhỏ dùng sprite PixelLab (giữ nguyên khung đặt/va chạm — chỉ
      // đổi mặt tiền trong texture). Thanh Phong Môn giữ vẽ code.
      // Sprite 192×128 vẽ vừa chiều ngang hộp nhà, giữ đúng tỉ lệ; load lỗi
      // thì rơi về vẽ code như cũ.
      const smallHouse = h.name !== 'Đạo Quán' && h.name !== 'Thanh Phong Môn';
      const spriteImg = smallHouse && scene.textures.exists('house-village-01')
        ? scene.textures.get('house-village-01').getSourceImage() as unknown as CanvasImageSource
        : null;
      if (spriteImg) {
        const cx = HOUSE_TEX.padX + h.w / 2;
        // GĐ72c: to thêm xíu theo feedback — 1.3× → 1.45× (vừa khung
        // nướng: nhà 140px có x = 0.5px, không cắt).
        // GĐ72d: BỎ bóng đất của nhà sprite theo feedback user — bóng
        // bầu dục dưới nhà nhìn như nhà đang bay; chân đế đá của
        // sprite tự nó đã đủ neo nhà xuống đất.
        const dw = h.w * 1.45, dh = (dw * 109) / 168;
        cx2.drawImage(spriteImg, 12, 9, 168, 109, cx - dw / 2, HOUSE_TEX.padY + h.h - dh, dw, dh);
      } else {
        drawBuilding({ x: HOUSE_TEX.padX, y: HOUSE_TEX.padY, w: h.w, h: h.h, body: h.body, roof: h.roof, name: h.name });
      }
    }
    scene.textures.addCanvas('house-' + i, c2);
  });

  // ---------- CÂY (mỗi cây 1 texture) ----------
  const trnd = seededRand(777);
  G.trees.forEach((t, i) => {
    const [c3, cx3] = makeCanvas(TREE_TEX.w * 2, TREE_TEX.h * 2);
    cx3.scale(2, 2);
    _setCtx(cx3);
    // GĐ73: cây làng dùng sprite PixelLab (vùng thấy được 102×114,
    // lề 13/8/13/6). Giữ độ lệch kích cỡ cũ (s 0.9–1.3, cùng 1 lượt
    // trnd mỗi cây như trước), đáy neo ở điểm đất (canvas y=130),
    // cây lẻ lật ngang cho đỡ giống nhau. Load lỗi thì vẽ code.
    const treeImg = scene.textures.exists('tree-village-01')
      ? scene.textures.get('tree-village-01').getSourceImage() as unknown as CanvasImageSource
      : null;
    const s = 0.9 + trnd() * 0.4;
    if (treeImg) {
      const th = Math.min(114 * s, 128), tw = (th * 102) / 114;
      cx3.save();
      cx3.translate(70, 0);
      if (i % 2 === 1) cx3.scale(-1, 1);
      cx3.drawImage(treeImg, 13, 8, 102, 114, -tw / 2, 130 - th, tw, th);
      cx3.restore();
    } else {
      drawTree({ x: 70, y: 118, s });
    }
    scene.textures.addCanvas('tree-' + i, c3);
  });

  // ---------- BẢNG TREO THƯỞNG ----------
  const [bdC, bx] = makeCanvas(240, 168);
  bx.scale(2, 2);
  bx.fillStyle = 'rgba(20,26,14,0.22)';
  bx.beginPath(); bx.ellipse(60, 78, 34, 5, 0, 0, Math.PI * 2); bx.fill();
  bx.fillStyle = '#5d4037';
  bx.fillRect(29, 40, 7, 38); bx.fillRect(84, 40, 7, 38);
  bx.fillStyle = '#4a332a';
  bx.fillRect(29, 40, 7, 5); bx.fillRect(84, 40, 7, 5);
  bx.fillStyle = '#8a6844'; bx.fillRect(19, 14, 82, 36);
  bx.strokeStyle = '#5d4037'; bx.lineWidth = 3; bx.strokeRect(19, 14, 82, 36);
  bx.fillStyle = '#6e5133'; bx.fillRect(15, 8, 90, 7);
  bx.fillStyle = '#f3e5c0'; bx.fillRect(27, 20, 66, 24);
  bx.strokeStyle = '#c9bfa8'; bx.lineWidth = 1; bx.strokeRect(27, 20, 66, 24);
  bx.strokeStyle = '#e5484d'; bx.lineWidth = 2;
  bx.beginPath(); bx.moveTo(33, 27); bx.lineTo(87, 27); bx.stroke();
  bx.strokeStyle = '#7a6a55'; bx.lineWidth = 1.4;
  bx.beginPath(); bx.moveTo(33, 34); bx.lineTo(79, 34); bx.stroke();
  bx.beginPath(); bx.moveTo(33, 40); bx.lineTo(71, 40); bx.stroke();
  scene.textures.addCanvas('board', bdC);

  // GĐ29 (thay GĐ15/GĐ28): BỎ pixelSnap cho môi trường — người chơi cần NÉT.
  // Texture đã nướng 2× (GĐ28) nên giữ nguyên độ phân giải cao + lọc LINEAR:
  // chữ biển hiệu và chi tiết nhà sắc như ảnh gốc, không còn bậc pixel làm mờ.
  // (Quái/gà vịt vẫn giữ pixelSnap riêng ở bake của chúng.)
  for (const key of ['world-bg', 'board', ...G.houses.map((h, i) => 'house-' + i), ...G.trees.map((t, i) => 'tree-' + i)]) {
    const tx = scene.textures.get(key);
    if (tx) tx.setFilter(0); // 0 = LINEAR
  }
}

// ---------------- QUÁI: sói / dơi / thạch quái (chuyển nguyên văn, bỏ nhãn + thanh máu) ----------------
export interface MobDraw {
  x: number; y: number; state: string; walkPhase: number; face: number;
  atkT: number; atkAng: number; phase: number; slowT: number; burnT: number;
}
let bakeNowSec = 0; // thay performance.now() khi nướng dơi/thạch quái cho từng khung đứng yên

export function drawWolf(m: MobDraw): void {
  const moving = m.state === 'chase' || m.state === 'return';
  const bob = moving ? Math.abs(Math.sin(m.walkPhase)) * 1.3 : 0;
  const f = m.face;
  let x = m.x;
  let y = m.y - bob;
  const atkP = m.atkT > 0 ? Math.sin(((0.3 - m.atkT) / 0.3) * Math.PI) : 0;
  if (atkP > 0) { x += Math.cos(m.atkAng || 0) * atkP * 7; y += Math.sin(m.atkAng || 0) * atkP * 3; }
  ctx.fillStyle = shadowAlpha('0,0,0', 0.25);
  ctx.beginPath(); ctx.ellipse(m.x + 5, m.y + 11, 14, 4, 0, 0, Math.PI * 2); ctx.fill();
  const leg2D = (lx: number, ph: number, hind: boolean) => {
    const sw = moving ? Math.sin(m.walkPhase + ph) * 3 : 0;
    if (hind) {
      ctx.fillStyle = '#6a7994';
      ctx.beginPath(); ctx.ellipse(x + lx, y + 1.5, 4.4, 6.2, 0, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = '#5f6d87';
    ctx.beginPath();
    ctx.moveTo(x + lx - 2, y + 3); ctx.lineTo(x + lx + 2, y + 3);
    ctx.lineTo(x + lx + sw + 1.2, y + 11.5); ctx.lineTo(x + lx + sw - 1.2, y + 11.5);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#c9c2ae';
    ctx.beginPath(); ctx.ellipse(x + lx + sw + f * 0.8, y + 11.8, 2.6, 1.5, 0, 0, Math.PI * 2); ctx.fill();
  };
  leg2D(-f * 10, Math.PI, true); leg2D(f * 10, Math.PI, false);
  leg2D(-f * 5, 0, true); leg2D(f * 5, 0, false);
  const tw = Math.sin(m.walkPhase * 0.7) * 1.5;
  ctx.fillStyle = '#66738c';
  ctx.beginPath();
  ctx.moveTo(x - f * 13, y - 8);
  ctx.quadraticCurveTo(x - f * 22, y - 6, x - f * 20, y + 3 + tw);
  ctx.quadraticCurveTo(x - f * 17.5, y + 6.5 + tw, x - f * 15.5, y + 0.5);
  ctx.quadraticCurveTo(x - f * 13.5, y - 3, x - f * 13, y - 8);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#565a60';
  ctx.beginPath(); ctx.ellipse(x - f * 19.3, y + 3.6 + tw, 2.7, 2.1, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#8494ad';
  ctx.beginPath(); ctx.ellipse(x, y - 2, 15.5, 9, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = GFX_CONFIG.style.outline; ctx.lineWidth = 2.2;
  ctx.beginPath(); ctx.ellipse(x, y - 2, 15.5, 9, 0, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = '#55637c';
  ctx.beginPath(); ctx.ellipse(x - f * 1, y - 5.6, 13, 5.4, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(227,220,203,0.55)';
  ctx.beginPath(); ctx.ellipse(x + 1, y + 3.1, 11.5, 3.6, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(227,220,203,0.7)';
  ctx.beginPath(); ctx.ellipse(x + f * 11.5, y + 0.5, 4.4, 5.4, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(255,246,220,0.35)'; ctx.lineWidth = 1.3;
  ctx.beginPath(); ctx.ellipse(x, y - 2, 15.5, 9, 0, Math.PI * 1.05, Math.PI * 1.55); ctx.stroke();
  ctx.strokeStyle = 'rgba(52,62,84,0.5)'; ctx.lineWidth = 1.2;
  for (let wf = 0; wf < 5; wf++) {
    const wfx = x - 9 + wf * 4.4, wfy = y - 8.6 + (wf % 2) * 2.2;
    ctx.beginPath(); ctx.moveTo(wfx, wfy); ctx.lineTo(wfx + f * 2.6, wfy + 1.8); ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(210,220,235,0.30)';
  for (let wf2 = 0; wf2 < 4; wf2++) {
    const wfx2 = x - 7 + wf2 * 4.6, wfy2 = y - 3.4 + (wf2 % 2) * 2.4;
    ctx.beginPath(); ctx.moveTo(wfx2, wfy2); ctx.lineTo(wfx2 + f * 2.4, wfy2 + 1.6); ctx.stroke();
  }
  const hx = x + f * 15, hy = y - 8;
  ctx.fillStyle = '#71819c';
  ctx.beginPath(); ctx.ellipse(hx - f * 3.5, hy + 1, 5.4, 6.4, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(hx, hy, 7.2, 6.3, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(227,220,203,0.85)';
  ctx.beginPath(); ctx.ellipse(hx - f * 0.5, hy + 3, 5.4, 3.6, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#6d7177';
  ctx.beginPath();
  ctx.moveTo(hx - f * 3.4, hy - 4.6); ctx.lineTo(hx - f * 1.2, hy - 10.6); ctx.lineTo(hx + f * 0.8, hy - 4.2);
  ctx.closePath(); ctx.fill();
  ctx.beginPath();
  ctx.moveTo(hx + f * 1.8, hy - 5); ctx.lineTo(hx + f * 4.6, hy - 10.8); ctx.lineTo(hx + f * 6.2, hy - 4.4);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#c9c2ae';
  ctx.beginPath();
  ctx.moveTo(hx + f * 3.1, hy - 5.4); ctx.lineTo(hx + f * 4.6, hy - 9); ctx.lineTo(hx + f * 5.4, hy - 5);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#687691';
  ctx.beginPath();
  ctx.moveTo(hx + f * 2, hy - 3);
  ctx.lineTo(hx + f * 11, hy - 0.6);
  ctx.quadraticCurveTo(hx + f * 12.6, hy + 0.6, hx + f * 11, hy + 2.1);
  ctx.lineTo(hx + f * 2.5, hy + 3.2);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#5d6167';
  ctx.beginPath(); ctx.ellipse(hx + f * 6.8, hy - 1.7, 4.6, 1.5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#e3dccb';
  ctx.beginPath(); ctx.ellipse(hx + f * 6.4, hy + 2.9, 4.4, 1.3, 0, 0, Math.PI * 2); ctx.fill();
  if (atkP > 0.25) {
    ctx.fillStyle = '#8c3a30';
    ctx.beginPath(); ctx.ellipse(hx + f * 7.2, hy + 5.4, 4.2, 1.9, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#f2ead8';
    ctx.fillRect(hx + f * 9.6 - 1, hy + 3.2, 2, 2.8);
    ctx.fillRect(hx + f * 5.8 - 1, hy + 3.2, 2, 2.3);
  }
  ctx.fillStyle = '#241d16';
  ctx.beginPath(); ctx.ellipse(hx + f * 11.9, hy + 0.6, 1.9, 1.4, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = m.state === 'idle' ? '#ff9d0a' : '#ff2e2e';
  ctx.beginPath(); ctx.arc(hx + f * 3.4, hy - 1.6, 2.1, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#17110a';
  ctx.beginPath(); ctx.arc(hx + f * 3.7, hy - 1.6, 0.75, 0, Math.PI * 2); ctx.fill();
}

export function drawBat(m: MobDraw): void {
  const t = bakeNowSec;
  let fy = m.y - 17 - Math.sin(t * 3 + m.phase) * 3;
  if (m.atkT > 0) fy += Math.sin(((0.3 - m.atkT) / 0.3) * Math.PI) * 9;
  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  ctx.beginPath(); ctx.ellipse(m.x + 4, m.y + 9, 9, 3.2, 0, 0, Math.PI * 2); ctx.fill();
  const flap = Math.sin(t * 16 + m.phase) * 7;
  ctx.fillStyle = '#6a3fb5';
  ctx.beginPath();
  ctx.moveTo(m.x - 3, fy);
  ctx.quadraticCurveTo(m.x - 12, fy - 8 - flap, m.x - 19, fy - 2 - flap);
  ctx.quadraticCurveTo(m.x - 12, fy + 3, m.x - 4, fy + 4);
  ctx.closePath(); ctx.fill();
  ctx.beginPath();
  ctx.moveTo(m.x + 3, fy);
  ctx.quadraticCurveTo(m.x + 12, fy - 8 - flap, m.x + 19, fy - 2 - flap);
  ctx.quadraticCurveTo(m.x + 12, fy + 3, m.x + 4, fy + 4);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(30,14,54,0.55)'; ctx.lineWidth = 1.1;
  ctx.beginPath(); ctx.moveTo(m.x - 3, fy); ctx.quadraticCurveTo(m.x - 11, fy - 4 - flap * 0.7, m.x - 17, fy - 1 - flap); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(m.x + 3, fy); ctx.quadraticCurveTo(m.x + 11, fy - 4 - flap * 0.7, m.x + 17, fy - 1 - flap); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(m.x - 3, fy + 2); ctx.quadraticCurveTo(m.x - 10, fy + 1, m.x - 15, fy + 2 - flap * 0.5); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(m.x + 3, fy + 2); ctx.quadraticCurveTo(m.x + 10, fy + 1, m.x + 15, fy + 2 - flap * 0.5); ctx.stroke();
  ctx.fillStyle = '#43297a';
  ctx.beginPath(); ctx.ellipse(m.x, fy + 1, 6.4, 7.6, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = GFX_CONFIG.style.outline; ctx.lineWidth = 1.8;
  ctx.beginPath(); ctx.ellipse(m.x, fy + 1, 6.4, 7.6, 0, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.10)';
  ctx.beginPath(); ctx.ellipse(m.x - 2.2, fy - 0.5, 2.8, 5.2, -0.3, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(m.x, fy - 6, 4.6, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.moveTo(m.x - 4, fy - 9); ctx.lineTo(m.x - 3, fy - 14); ctx.lineTo(m.x - 1, fy - 9.5); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(m.x + 4, fy - 9); ctx.lineTo(m.x + 3, fy - 14); ctx.lineTo(m.x + 1, fy - 9.5); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#ff2e63';
  ctx.beginPath(); ctx.arc(m.x - 2.1, fy - 5.5, 1.6, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(m.x + 2.3, fy - 5.5, 1.6, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#fff0f4';
  ctx.beginPath(); ctx.arc(m.x - 2.5, fy - 6, 0.55, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(m.x + 1.9, fy - 6, 0.55, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#f8f4e8';
  ctx.fillRect(m.x - 2.2, fy - 0.6, 1.5, 2.4);
  ctx.fillRect(m.x + 0.9, fy - 0.6, 1.5, 2.4);
}

export function drawGolem(m: MobDraw): void {
  const moving = m.state === 'chase' || m.state === 'return';
  const bob = moving ? Math.abs(Math.sin(m.walkPhase)) * 1.2 : 0;
  const x = m.x, y = m.y - bob;
  ctx.fillStyle = shadowAlpha('0,0,0', 0.3);
  ctx.beginPath(); ctx.ellipse(m.x + 6, m.y + 16, 22, 6, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#5d5d55';
  const lp = moving ? Math.sin(m.walkPhase) * 2.5 : 0;
  roundRect(x - 13, y + 6, 9, 11 + lp, 3); ctx.fill();
  roundRect(x + 4, y + 6, 9, 11 - lp, 3); ctx.fill();
  ctx.fillStyle = '#8f8f83';
  ctx.beginPath();
  ctx.moveTo(x - 19, y + 9); ctx.lineTo(x - 21, y - 8); ctx.lineTo(x - 12, y - 19);
  ctx.lineTo(x + 10, y - 21); ctx.lineTo(x + 20, y - 9); ctx.lineTo(x + 18, y + 9);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = GFX_CONFIG.style.outline; ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(x - 19, y + 9); ctx.lineTo(x - 21, y - 8); ctx.lineTo(x - 12, y - 19);
  ctx.lineTo(x + 10, y - 21); ctx.lineTo(x + 20, y - 9); ctx.lineTo(x + 18, y + 9);
  ctx.closePath(); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.13)';
  ctx.beginPath(); ctx.moveTo(x - 12, y - 19); ctx.lineTo(x + 10, y - 21); ctx.lineTo(x + 4, y - 6); ctx.lineTo(x - 8, y - 5); ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,0.14)';
  ctx.beginPath(); ctx.moveTo(x + 4, y - 6); ctx.lineTo(x + 10, y - 21); ctx.lineTo(x + 20, y - 9); ctx.lineTo(x + 18, y + 9); ctx.lineTo(x + 6, y + 9); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(40,40,36,0.55)'; ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.moveTo(x - 6, y - 17); ctx.lineTo(x - 2, y - 10); ctx.lineTo(x - 5, y - 4); ctx.lineTo(x - 1, y + 3); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x + 11, y - 15); ctx.lineTo(x + 8, y - 8); ctx.lineTo(x + 12, y - 1); ctx.stroke();
  ctx.strokeStyle = 'rgba(255,250,230,0.20)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(x - 4.6, y - 16.4); ctx.lineTo(x - 0.8, y - 9.6); ctx.lineTo(x - 3.8, y - 3.8); ctx.stroke();
  ctx.strokeStyle = 'rgba(255,248,225,0.28)'; ctx.lineWidth = 1.6;
  ctx.beginPath(); ctx.moveTo(x - 19, y + 9); ctx.lineTo(x - 21, y - 8); ctx.lineTo(x - 12, y - 19); ctx.stroke();
  ctx.fillStyle = '#4fbf3a';
  ctx.beginPath(); ctx.ellipse(x - 13, y - 16, 6, 3, -0.4, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(x + 13, y - 13, 4.5, 2.4, 0.4, 0, Math.PI * 2); ctx.fill();
  const gAtk = m.atkT > 0 ? Math.sin(((0.3 - m.atkT) / 0.3) * Math.PI) : 0;
  ctx.fillStyle = '#6f6f66';
  roundRect(x - 25, y - 8, 7, 18, 3); ctx.fill();
  roundRect(x + 18, y - 8 + gAtk * 7, 7, 18 + gAtk * 6, 3); ctx.fill();
  if (gAtk > 0.3) {
    ctx.fillStyle = '#5d5d55';
    roundRect(x + 16.5, y + 8 + gAtk * 13, 10, 8, 3); ctx.fill();
  }
  ctx.fillStyle = '#82827a';
  ctx.beginPath(); ctx.moveTo(x - 8, y - 19); ctx.lineTo(x - 7, y - 29); ctx.lineTo(x + 7, y - 30); ctx.lineTo(x + 8, y - 19); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = GFX_CONFIG.style.outline; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(x - 8, y - 19); ctx.lineTo(x - 7, y - 29); ctx.lineTo(x + 7, y - 30); ctx.lineTo(x + 8, y - 19); ctx.closePath(); ctx.stroke();
  ctx.fillStyle = m.state === 'idle' ? '#ffd873' : '#ff7a4d';
  ctx.beginPath(); ctx.arc(x - 3.5, y - 23.7, 1.7, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(x + 3.9, y - 23.7, 1.7, 0, Math.PI * 2); ctx.fill();
  ctx.save(); ctx.translate(x, y - 6); ctx.rotate(Math.PI / 4);
  ctx.fillStyle = '#d24dff'; ctx.fillRect(-3.8, -3.8, 7.6, 7.6);
  ctx.fillStyle = '#fff6ff'; ctx.fillRect(-1.6, -1.6, 3.2, 3.2); ctx.restore();
  if (m.slowT > 0) { ctx.fillStyle = 'rgba(140,200,255,0.35)'; ctx.beginPath(); ctx.arc(x, y - 6, 24, 0, Math.PI * 2); ctx.fill(); }
  if (m.burnT > 0) { ctx.fillStyle = 'rgba(255,120,50,0.4)'; ctx.beginPath(); ctx.arc(x - 8, y - 16, 5, 0, Math.PI * 2); ctx.fill(); }
}

export const WOLF_TEX = { w: 160, h: 110, res: 2, scale: 0.55 };
export const BAT_TEX = { scale: 0.55 };
export const GOLEM_TEX = { scale: 0.6 };

export function wolfTexKey(face: number, frame: string): string {
  return `wolf-${face < 0 ? 'l' : 'r'}-${frame}`;
}

export function bakeMonsterTextures(scene: Phaser.Scene): void {
  if (scene.textures.exists('wolf-r-idle')) return;
  const base: MobDraw = { x: 0, y: 0, state: 'idle', walkPhase: 0, face: 1, atkT: 0, atkAng: 0, phase: 0, slowT: 0, burnT: 0 };
  // Sói: 2 hướng mặt × (đứng / 4 khung đi / vồ)
  for (const face of [1, -1]) {
    const frames: Array<[string, Partial<MobDraw>]> = [
      ['idle', { state: 'idle', walkPhase: 0.6 }],
      ['w0', { state: 'chase', walkPhase: 0 }],
      ['w1', { state: 'chase', walkPhase: Math.PI / 2 }],
      ['w2', { state: 'chase', walkPhase: Math.PI }],
      ['w3', { state: 'chase', walkPhase: (3 * Math.PI) / 2 }],
      ['lunge', { state: 'chase', walkPhase: 0.8, atkT: 0.15, atkAng: face === 1 ? 0 : Math.PI }],
    ];
    for (const [fname, over] of frames) {
      const [c, cx2] = makeCanvas(WOLF_TEX.w * WOLF_TEX.res, WOLF_TEX.h * WOLF_TEX.res);
      cx2.scale(WOLF_TEX.res, WOLF_TEX.res);
      _setCtx(cx2);
      drawWolf({ ...base, x: 80, y: 55, face, ...over });
      scene.textures.addCanvas(wolfTexKey(face, fname), c);
    }
  }
  // Dơi: 4 khung vỗ cánh (chưa có quái dơi trên server — nướng sẵn cho giai đoạn sau)
  for (let i = 0; i < 4; i++) {
    const [c, cx2] = makeCanvas(140, 120);
    cx2.scale(2, 2);
    _setCtx(cx2);
    bakeNowSec = i * 0.098;
    drawBat({ ...base, x: 35, y: 38 });
    scene.textures.addCanvas('bat-f' + i, c);
  }
  bakeNowSec = 0;
  // Thạch quái: đứng / 4 khung đi / đập tay (nướng sẵn)
  const gFrames: Array<[string, Partial<MobDraw>]> = [
    ['idle', { state: 'idle' }],
    ['w0', { state: 'chase', walkPhase: 0 }],
    ['w1', { state: 'chase', walkPhase: Math.PI / 2 }],
    ['w2', { state: 'chase', walkPhase: Math.PI }],
    ['w3', { state: 'chase', walkPhase: (3 * Math.PI) / 2 }],
    ['slam', { state: 'chase', walkPhase: 0.4, atkT: 0.15 }],
  ];
  for (const [fname, over] of gFrames) {
    const [c, cx2] = makeCanvas(150, 120);
    cx2.scale(2, 2);
    _setCtx(cx2);
    drawGolem({ ...base, x: 37, y: 32, ...over });
    scene.textures.addCanvas('golem-' + fname, c);
  }
  // GĐ15: pixel hoá theo bảng màu cho quái
  for (const face of [1, -1]) {
    for (const fname of ['idle', 'w0', 'w1', 'w2', 'w3', 'lunge']) pixelSnap(scene, wolfTexKey(face, fname), 5, PAL_WOLF);
  }
  for (let i = 0; i < 4; i++) pixelSnap(scene, 'bat-f' + i, 4, PAL_BAT);
  for (const fname of ['idle', 'w0', 'w1', 'w2', 'w3', 'slam']) pixelSnap(scene, 'golem-' + fname, 4, PAL_GOLEM);
}

// ---------------- ĐỒ RƠI: linh thạch + nanh sói (phong cách bản cũ) ----------------
// GĐ39: rương báu 3 phẩm — C gỗ nâu, B thép bạc, A vàng; vẽ 1 lần dùng chung
export function bakeChestTextures(scene: Phaser.Scene): void {
  if (scene.textures.exists('chest-C')) return;
  const styles: Record<string, { body: string; lid: string; band: string; glow: string }> = {
    C: { body: '#8a6844', lid: '#a37c50', band: '#5d4a33', glow: 'rgba(190,150,90,0.35)' },
    B: { body: '#7d8aa0', lid: '#9fb0c4', band: '#4c5a70', glow: 'rgba(170,200,240,0.40)' },
    A: { body: '#b8860b', lid: '#e8b23a', band: '#7a5a10', glow: 'rgba(255,210,90,0.50)' },
  };
  for (const [grade, st] of Object.entries(styles)) {
    const [c, cx2] = makeCanvas(96, 96);
    cx2.scale(2, 2);
    cx2.translate(24, 26);
    const g = cx2.createRadialGradient(0, 0, 2, 0, 0, 20);
    g.addColorStop(0, st.glow); g.addColorStop(1, 'rgba(0,0,0,0)');
    cx2.fillStyle = g;
    cx2.beginPath(); cx2.arc(0, 0, 20, 0, Math.PI * 2); cx2.fill();
    cx2.fillStyle = 'rgba(0,0,0,0.25)';
    cx2.beginPath(); cx2.ellipse(0, 13, 15, 4.5, 0, 0, Math.PI * 2); cx2.fill();
    cx2.strokeStyle = GFX_CONFIG.style.outline; cx2.lineWidth = 1.6;
    // Thân rương
    cx2.fillStyle = st.body; cx2.fillRect(-15, -2, 30, 14); cx2.strokeRect(-15, -2, 30, 14);
    // Nắp cong
    cx2.fillStyle = st.lid;
    cx2.beginPath(); cx2.moveTo(-15, -2); cx2.quadraticCurveTo(0, -15, 15, -2); cx2.closePath(); cx2.fill(); cx2.stroke();
    // Đai kim loại + khóa
    cx2.fillStyle = st.band; cx2.fillRect(-2.5, -11, 5, 23);
    cx2.fillStyle = grade === 'A' ? '#ffe9a8' : '#e8e4da';
    cx2.beginPath(); cx2.arc(0, 2, 3.4, 0, Math.PI * 2); cx2.fill(); cx2.stroke();
    scene.textures.addCanvas('chest-' + grade, c);
  }
}

export function bakeDropTextures(scene: Phaser.Scene): void {
  if (scene.textures.exists('drop-stone')) return;
  {
    const [c, cx2] = makeCanvas(88, 88);
    cx2.scale(2, 2);
    cx2.translate(22, 22);
    const g = cx2.createRadialGradient(0, 0, 2, 0, 0, 13);
    g.addColorStop(0, 'rgba(127,227,208,0.30)'); g.addColorStop(1, 'rgba(127,227,208,0)');
    cx2.fillStyle = g;
    cx2.beginPath(); cx2.arc(0, 0, 13, 0, Math.PI * 2); cx2.fill();
    cx2.fillStyle = 'rgba(0,0,0,0.22)';
    cx2.beginPath(); cx2.ellipse(0, 8, 8, 3, 0, 0, Math.PI * 2); cx2.fill();
    cx2.save(); cx2.rotate(Math.PI / 4);
    cx2.fillStyle = '#57d8c3'; cx2.fillRect(-4.5, -4.5, 9, 9);
    cx2.fillStyle = 'rgba(255,255,255,0.55)'; cx2.fillRect(-3, -3, 3.5, 3.5);
    cx2.restore();
    scene.textures.addCanvas('drop-stone', c);
  }
  {
    const [c, cx2] = makeCanvas(88, 88);
    cx2.scale(2, 2);
    cx2.translate(22, 22);
    const g = cx2.createRadialGradient(0, 0, 2, 0, 0, 13);
    g.addColorStop(0, 'rgba(255,216,115,0.30)'); g.addColorStop(1, 'rgba(255,216,115,0)');
    cx2.fillStyle = g;
    cx2.beginPath(); cx2.arc(0, 0, 13, 0, Math.PI * 2); cx2.fill();
    cx2.fillStyle = 'rgba(0,0,0,0.22)';
    cx2.beginPath(); cx2.ellipse(0, 8, 8, 3, 0, 0, Math.PI * 2); cx2.fill();
    // Nanh cong trắng ngà, gốc nâu, viền đậm
    cx2.fillStyle = '#f5efdd';
    cx2.strokeStyle = GFX_CONFIG.style.outline; cx2.lineWidth = 1.4;
    cx2.beginPath();
    cx2.moveTo(-3.5, -7);
    cx2.quadraticCurveTo(4.5, -2, 2.2, 8.5);
    cx2.quadraticCurveTo(0.6, 9.6, 0.2, 7.5);
    cx2.quadraticCurveTo(-1.8, 0, -4.6, -4.5);
    cx2.closePath(); cx2.fill(); cx2.stroke();
    cx2.fillStyle = '#a9805a';
    cx2.beginPath(); cx2.ellipse(-3.4, -6.4, 3.4, 2, -0.5, 0, Math.PI * 2); cx2.fill();
    scene.textures.addCanvas('drop-fang', c);
  }
}

// ---------------- GÀ / VỊT AMBIENT (chuyển nguyên văn drawBird của bản cũ) ----------------
export interface BirdDraw {
  kind: 'chicken' | 'duck'; x: number; y: number; face: number;
  state: string; walkPhase: number; col: string; seed: number;
}

export function drawBird(b: BirdDraw): void {
  const t = bakeNowSec;
  const f = b.face, walking = b.state === 'walk', duck = b.kind === 'duck';
  const bobB = walking ? Math.abs(Math.sin(b.walkPhase)) * 1.1 : Math.sin(t * 2 + b.seed) * 0.3;
  const by = b.y - bobB;
  ctx.fillStyle = shadowAlpha('10,14,6', 0.3);
  ctx.beginPath(); ctx.ellipse(b.x + 1.5, b.y + 2.5, 7.5, 2.4, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#c9862e'; ctx.lineWidth = 1.1;
  const lp1 = walking ? Math.sin(b.walkPhase) * 2.2 : 0;
  ctx.beginPath(); ctx.moveTo(b.x - 1.5, by - 3); ctx.lineTo(b.x - 1.5 + lp1, by + 2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(b.x + 1.8, by - 3); ctx.lineTo(b.x + 1.8 - lp1, by + 2); ctx.stroke();
  ctx.fillStyle = duck ? '#dfe3d8' : shadeHex(b.col, 0.82);
  ctx.beginPath();
  if (duck) ctx.ellipse(b.x - f * 7.6, by - 6.2, 3.6, 1.9, -f * 0.35, 0, Math.PI * 2);
  else {
    ctx.moveTo(b.x - f * 5.2, by - 6);
    ctx.quadraticCurveTo(b.x - f * 10.5, by - 12.5, b.x - f * 7.4, by - 13.4);
    ctx.quadraticCurveTo(b.x - f * 5.6, by - 10, b.x - f * 4, by - 7.2);
    ctx.closePath();
  }
  ctx.fill();
  ctx.fillStyle = b.col;
  ctx.beginPath(); ctx.ellipse(b.x, by - 5.6, 8, 5.6, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(120,90,40,0.12)';
  ctx.beginPath(); ctx.ellipse(b.x, by - 3.2, 7.2, 3.3, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = duck ? '#cfd6c8' : shadeHex(b.col, 0.88);
  ctx.beginPath(); ctx.ellipse(b.x - f * 0.6, by - 5.8, 4.9, 3.4, -f * 0.25, 0, Math.PI * 2); ctx.fill();
  const peck = b.state === 'peck' ? Math.max(0, Math.sin(t * 7 + b.seed)) * 4.2 : 0;
  const hx = b.x + f * 7.2, hy = by - 11.4 + peck;
  if (duck) {
    ctx.fillStyle = '#3e7d46';
    ctx.beginPath(); ctx.arc(hx, hy, 3.7, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#f2f2ea'; ctx.fillRect(hx - 3.2, hy + 2, 6.4, 1.5);
    ctx.fillStyle = '#f0a13a';
    ctx.beginPath(); ctx.ellipse(hx + f * 4.6, hy + 0.8, 2.9, 1.3, 0, 0, Math.PI * 2); ctx.fill();
  } else {
    ctx.fillStyle = b.col;
    ctx.beginPath(); ctx.arc(hx, hy, 3.6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#d23c2a';
    ctx.beginPath(); ctx.arc(hx - 1.5, hy - 3.3, 1.25, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(hx, hy - 4, 1.35, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(hx + 1.5, hy - 3.3, 1.25, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#f0a13a';
    ctx.beginPath(); ctx.moveTo(hx + f * 3.2, hy - 0.6); ctx.lineTo(hx + f * 5.6, hy + 0.5); ctx.lineTo(hx + f * 3.2, hy + 1.4); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#d23c2a';
    ctx.beginPath(); ctx.ellipse(hx + f * 2.2, hy + 2.6, 1.1, 1.7, 0, 0, Math.PI * 2); ctx.fill();
  }
  ctx.fillStyle = '#241a10';
  ctx.beginPath(); ctx.arc(hx + f * 1.5, hy - 0.7, 0.85, 0, Math.PI * 2); ctx.fill();
}

export const BIRD_COLORS = ['#f5efe0', '#c98d54', '#b8b0a0'];
export const BIRD_TEX = { scale: 0.55 };

export function birdTexKey(kind: string, ci: number, face: number, frame: string): string {
  return `bird-${kind}-${ci}-${face < 0 ? 'l' : 'r'}-${frame}`;
}

export function bakeBirdTextures(scene: Phaser.Scene): void {
  if (scene.textures.exists('bird-chicken-0-r-idle')) return;
  const kinds: Array<{ kind: 'chicken' | 'duck'; cols: string[] }> = [
    { kind: 'chicken', cols: BIRD_COLORS },
    { kind: 'duck', cols: ['#eef0e8'] },
  ];
  for (const { kind, cols } of kinds) {
    cols.forEach((col, ci) => {
      for (const face of [1, -1]) {
        const frames: Array<[string, Partial<BirdDraw>]> = [
          ['idle', { state: 'idle', walkPhase: 0 }],
          ['w0', { state: 'walk', walkPhase: 0.4 }],
          ['w1', { state: 'walk', walkPhase: 0.4 + Math.PI }],
          ['peck', { state: 'peck', walkPhase: 0 }],
        ];
        for (const [fname, over] of frames) {
          const [c, cx2] = makeCanvas(128, 104);
          cx2.scale(2, 2);
          _setCtx(cx2);
          bakeNowSec = fname === 'peck' ? 0.22 : 0.5; // peck: sin(7t+seed) dương rõ — đầu chúc xuống
          drawBird({ kind, x: 32, y: 36, face, state: 'idle', walkPhase: 0, col, seed: 1.3, ...over });
          scene.textures.addCanvas(birdTexKey(kind, ci, face, fname), c);
        }
      }
    });
  }
  bakeNowSec = 0;
  // GĐ15: pixel hoá theo bảng màu cho gà/vịt
  for (const { kind, cols } of kinds) {
    cols.forEach((col, ci) => {
      for (const face of [1, -1]) {
        for (const fname of ['idle', 'w0', 'w1', 'peck']) pixelSnap(scene, birdTexKey(kind, ci, face, fname), 4, PAL_BIRD);
      }
    });
  }
}

// ---------------- HIỆU ỨNG: viên đạn chiêu theo hệ (hào quang + lõi sáng + tia sao) ----------------
export const FX_ELEMS = ['Kim', 'Mộc', 'Thủy', 'Hỏa', 'Thổ', 'neutral'];

export function fxOrbKey(elem: string): string {
  return 'fx-orb-' + (FX_ELEMS.includes(elem) ? elem : 'neutral');
}

export function bakeFxTextures(scene: Phaser.Scene): void {
  if (scene.textures.exists('fx-orb-neutral')) return;
  for (const key of FX_ELEMS) {
    const col = key === 'neutral' ? '#ffd873' : GFX_CONFIG.elements[key];
    const [c, cx2] = makeCanvas(96, 96);
    cx2.scale(2, 2);
    cx2.translate(24, 24);
    const g = cx2.createRadialGradient(0, 0, 2, 0, 0, 22);
    g.addColorStop(0, col + 'aa'); g.addColorStop(0.45, col + '44'); g.addColorStop(1, col + '00');
    cx2.fillStyle = g;
    cx2.beginPath(); cx2.arc(0, 0, 22, 0, Math.PI * 2); cx2.fill();
    // tia sao 4 cánh sau lõi
    cx2.strokeStyle = 'rgba(255,255,255,0.75)'; cx2.lineWidth = 1.3; cx2.lineCap = 'round';
    cx2.beginPath();
    cx2.moveTo(-11, 0); cx2.lineTo(11, 0);
    cx2.moveTo(0, -11); cx2.lineTo(0, 11);
    cx2.stroke();
    cx2.fillStyle = col;
    cx2.beginPath(); cx2.arc(0, 0, 7, 0, Math.PI * 2); cx2.fill();
    cx2.strokeStyle = GFX_CONFIG.style.outline; cx2.lineWidth = 1.2;
    cx2.beginPath(); cx2.arc(0, 0, 7, 0, Math.PI * 2); cx2.stroke();
    cx2.fillStyle = '#ffffff';
    cx2.beginPath(); cx2.arc(-1.5, -1.5, 2.8, 0, Math.PI * 2); cx2.fill();
    scene.textures.addCanvas('fx-orb-' + key, c);
  }
}

// GĐ10: vẽ xem trước nhân vật (đứng, hướng xuống) lên 1 canvas 2D thường —
// dùng ở màn hình tạo nhân vật / tùy chỉnh để người chơi thấy ngay lựa chọn.
export function drawPersonPreview(
  canvas: HTMLCanvasElement,
  classId: string,
  robe: string | null,
  gender?: string,
  weapon?: { cat: string; name: string } | null,
): void {
  const c = canvas.getContext('2d');
  if (!c) return;
  const base = CLASS_STYLE_BY_ID[classId] || CLASS_STYLE_BY_ID.thetu;
  // Vẽ vào canvas nhỏ (độ phân giải pixel) rồi phóng to không làm mịn —
  // khớp đúng kiểu pixel trong game (GĐ12).
  const pw = Math.max(24, Math.round(canvas.width / PERSON_PIXEL));
  const ph = Math.max(24, Math.round(canvas.height / PERSON_PIXEL));
  const small = document.createElement('canvas');
  small.width = pw;
  small.height = ph;
  const sc = small.getContext('2d');
  if (!sc) return;
  const s = Math.min(pw / 88, ph / 76);
  sc.translate(pw / 2, ph * 0.93);
  sc.scale(s, s);
  _setCtx(sc);
  drawPerson(0, 0, robe || base.robe, 1, 0, false, true, {
    dir: 'down',
    belt: base.belt,
    hat: base.hat,
    acc: base.acc,
    weaponCat: weapon ? weapon.cat : base.weaponCat,
    weaponName: weapon ? weapon.name : base.weaponName,
    gender: gender === 'nu' ? 'Nữ' : 'Nam',
  });
  c.clearRect(0, 0, canvas.width, canvas.height);
  c.imageSmoothingEnabled = false;
  c.drawImage(small, 0, 0, canvas.width, canvas.height);
}

// ================= GĐ59: NỀN CHO CÁC MAP MỚI (vẽ theo THEME + decor từ server) =================
// Mỗi map mới được server gửi: kích thước, theme, điểm cổng + danh sách decor
// (kèm vật cản). Client nướng 1 texture 2× cho cả map: nền đất theo tông
// theme, sân đá + vòng trận dịch chuyển ở điểm cổng, decor vẽ bằng hình
// khối đơn giản đúng tông (cây/đá/tinh thể/mộ/lò...). Hạt giống theo id map
// để chi tiết nền ổn định giữa các lần vào.
export interface MapDecorItem { k: string; x: number; y: number; s: number }
export interface MapHazard { x: number; y: number; r: number }
export interface MapFeatures { volcano: { x: number; y: number; r: number } | null; caves: Array<{ x: number; y: number }> }
export interface MapEnterData {
  mapId: string; isHome?: boolean; name: string; category?: string; safe?: boolean;
  w: number; h: number; theme?: string; portal: { x: number; y: number };
  decor?: MapDecorItem[]; desc?: string;
  hazards?: MapHazard[]; features?: MapFeatures | null; // GĐ60
}
interface ThemeStyle { g1: string; g2: string; accent: string; leaf: string; leaf2: string; rock: string; plaza: string }
const MAP_THEME_STYLE: Record<string, ThemeStyle> = {
  city: { g1: '#8f9779', g2: '#7e8a6c', accent: '#ffd94d', leaf: '#4e7d3a', leaf2: '#639450', rock: '#9a958a', plaza: '#b3a58c' },
  garden: { g1: '#5da24c', g2: '#4c8f3e', accent: '#8be9c9', leaf: '#3f7d33', leaf2: '#559548', rock: '#8a8578', plaza: '#a98f66' },
  beast: { g1: '#63a34b', g2: '#548f3f', accent: '#f2d24b', leaf: '#4e7d3a', leaf2: '#639450', rock: '#8a8578', plaza: '#a98f66' },
  array: { g1: '#7d8474', g2: '#6b7263', accent: '#7fe3d0', leaf: '#4e7d3a', leaf2: '#639450', rock: '#9a958a', plaza: '#a39a86' },
  script: { g1: '#6f8a5f', g2: '#5f7a50', accent: '#ffe9a8', leaf: '#476e38', leaf2: '#5d8a49', rock: '#8a8578', plaza: '#a98f66' },
  forge: { g1: '#6e5a4a', g2: '#5d4a3c', accent: '#f08a3c', leaf: '#5d6e42', leaf2: '#71855a', rock: '#4a4038', plaza: '#7a6a58' },
  ice: { g1: '#cfe6f2', g2: '#bcd8ea', accent: '#7fd1e8', leaf: '#dceef7', leaf2: '#c4e0f0', rock: '#aebfd0', plaza: '#e6f2fa' },
  lava: { g1: '#4a3230', g2: '#3c2826', accent: '#f0643c', leaf: '#5d4a3a', leaf2: '#6e5a48', rock: '#2e2126', plaza: '#5d4038' },
  desert: { g1: '#d9b878', g2: '#cda95f', accent: '#f2d24b', leaf: '#5d8f4e', leaf2: '#6fa55e', rock: '#b09468', plaza: '#e3c98d' },
  blood_forest: { g1: '#4c3a3a', g2: '#3f2f31', accent: '#d84f4f', leaf: '#7d3038', leaf2: '#93505a', rock: '#5d4a4a', plaza: '#5d4a44' },
  graveyard: { g1: '#5c6152', g2: '#4c5142', accent: '#b8c4a8', leaf: '#3f4a3a', leaf2: '#4f5c49', rock: '#8a8d80', plaza: '#6e7264' },
  mountain: { g1: '#5da24c', g2: '#4c8f3e', accent: '#ffd94d', leaf: '#3f7d33', leaf2: '#559548', rock: '#8a8578', plaza: '#a98f66' },
  storm: { g1: '#4f5a68', g2: '#424c5a', accent: '#b678f0', leaf: '#3f5642', leaf2: '#4f6b52', rock: '#6e7684', plaza: '#5d6672' },
  swamp: { g1: '#4a5d3a', g2: '#3d4f30', accent: '#a8c47f', leaf: '#5d7a45', leaf2: '#6f9157', rock: '#5d6050', plaza: '#55663f' },
  battlefield: { g1: '#7a6a52', g2: '#685a44', accent: '#d8c9a8', leaf: '#5d6e42', leaf2: '#71855a', rock: '#6e6252', plaza: '#86755c' },
  void: { g1: '#241f3d', g2: '#1b1730', accent: '#9a86ff', leaf: '#3a3260', leaf2: '#4a4280', rock: '#453d6e', plaza: '#2e2752' },
  metal: { g1: '#8a8578', g2: '#767165', accent: '#f0c84b', leaf: '#5d7a45', leaf2: '#6f9157', rock: '#9a958a', plaza: '#9d968a' },
  swords: { g1: '#5f6b5a', g2: '#505c4c', accent: '#cfd8dc', leaf: '#476e38', leaf2: '#5d8a49', rock: '#7d8474', plaza: '#6e7a66' },
  deep_forest: { g1: '#3e6b34', g2: '#33592c', accent: '#8be9c9', leaf: '#2f5227', leaf2: '#43703a', rock: '#5d6050', plaza: '#4c7040' },
  ghost_forest: { g1: '#3a4048', g2: '#31363e', accent: '#9fd8c9', leaf: '#45403f', leaf2: '#54484a', rock: '#5d6068', plaza: '#454a52' },
  stream: { g1: '#57a047', g2: '#4a8c3c', accent: '#7fd1e8', leaf: '#3f7d33', leaf2: '#559548', rock: '#8a8578', plaza: '#a9c4a0' },
  ice_plain: { g1: '#d4e9f5', g2: '#c2dcef', accent: '#7fd1e8', leaf: '#e2f1fa', leaf2: '#cfe6f5', rock: '#aebfd0', plaza: '#eaf5fc' },
  deep_sea: { g1: '#1f4a66', g2: '#183c55', accent: '#7fe3d0', leaf: '#2a6a7d', leaf2: '#358295', rock: '#2c5a74', plaza: '#26506a' },
  badland: { g1: '#b08c58', g2: '#9d7a4a', accent: '#e8c98a', leaf: '#7a8a4e', leaf2: '#8c9c60', rock: '#8a6f4c', plaza: '#bb9a68' },
};
function hashStrTs(s: string): number { let h = 2166136261; for (let i = 0; i < s.length; i++) { h = Math.imul(h ^ s.charCodeAt(i), 16777619); } return h >>> 0; }

// ============ GĐ60: HIỂN THỊ MAP SIÊU TO (nền lưới ô + decor texture) ============
// Map nay tới 4000×3000 — nướng 1 texture cho cả map sẽ vỡ trần GPU. Cách
// mới: nền cắt thành Ô 1024×1024 (vẽ tỉ lệ 1), mỗi loại decor nướng 1
// texture nhỏ dùng chung rồi đóng dấu theo tọa độ server gửi. Núi lửa /
// hang băng / hố lửa / sân cổng là texture đặc sản riêng.
function drawDecorItem(b: CanvasRenderingContext2D, st: ThemeStyle, k: string, x: number, y: number, s: number): void {
  const poly = (pts: Array<[number, number]>) => { b.beginPath(); b.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) b.lineTo(pts[i][0], pts[i][1]); b.closePath(); b.fill(); };
  b.save(); b.translate(x, y); b.scale(s, s);
  const leafy = (r1: number, r2: number) => {
    b.fillStyle = '#6e5136'; b.fillRect(-3, -2, 6, 16);
    b.fillStyle = st.leaf; b.beginPath(); b.arc(0, -16, r1, 0, Math.PI * 2); b.fill();
    b.fillStyle = st.leaf2; b.beginPath(); b.arc(-r1 * 0.55, -9, r2, 0, Math.PI * 2); b.arc(r1 * 0.55, -10, r2 * 0.9, 0, Math.PI * 2); b.fill();
  };
  switch (k) {
    case 'tree': leafy(17, 12); break;
    case 'tree_big': b.scale(1.5, 1.5); leafy(17, 12); break;
    case 'blood_tree': leafy(17, 12); break;
    case 'pine':
      b.fillStyle = '#5d4630'; b.fillRect(-3, -2, 6, 14);
      b.fillStyle = st.leaf; poly([[-15, 2], [15, 2], [0, -16]]); poly([[-12, -9], [12, -9], [0, -25]]); poly([[-9, -19], [9, -19], [0, -34]]);
      break;
    case 'dead_tree':
      b.strokeStyle = '#4c4038'; b.lineWidth = 4; b.beginPath(); b.moveTo(0, 14); b.lineTo(0, -14); b.moveTo(0, -6); b.lineTo(-11, -17); b.moveTo(0, -10); b.lineTo(10, -20); b.stroke();
      break;
    case 'swamp_tree':
      b.fillStyle = '#4f4436'; b.fillRect(-4, -2, 8, 16);
      b.strokeStyle = st.leaf; b.lineWidth = 3;
      for (const dx of [-13, -5, 5, 13]) { b.beginPath(); b.moveTo(dx * 0.4, -13); b.quadraticCurveTo(dx, -6, dx, 4); b.stroke(); }
      break;
    case 'rock': b.fillStyle = st.rock; poly([[-16, 10], [-10, -8], [2, -13], [14, -4], [17, 10]]); b.fillStyle = 'rgba(255,255,255,0.14)'; poly([[-10, -8], [2, -13], [6, -2], [-4, 0]]); break;
    case 'stone': b.fillStyle = st.rock; poly([[-9, 6], [-5, -5], [4, -7], [9, 2], [8, 6]]); break;
    case 'ice_shard':
      b.fillStyle = '#cfeaf8'; poly([[-13, 10], [-6, -20], [1, 10]]); poly([[-1, 10], [6, -30], [13, 10]]);
      b.strokeStyle = 'rgba(255,255,255,0.8)'; b.lineWidth = 1.4; b.beginPath(); b.moveTo(6, -30); b.lineTo(6, 8); b.stroke();
      break;
    case 'lava_rock':
      b.fillStyle = '#33262a'; poly([[-16, 10], [-10, -9], [3, -14], [15, -3], [17, 10]]);
      b.fillStyle = '#f0643c'; b.beginPath(); b.arc(-4, 0, 2.6, 0, Math.PI * 2); b.arc(7, 4, 2, 0, Math.PI * 2); b.fill();
      break;
    case 'crystal': case 'crystal_gold':
      b.fillStyle = st.accent; poly([[-12, 10], [-6, -16], [0, 10]]); poly([[-2, 10], [5, -26], [12, 10]]);
      b.fillStyle = 'rgba(255,255,255,0.4)'; poly([[3, -14], [5, -26], [8, 4]]);
      break;
    case 'coral':
      b.strokeStyle = st.accent; b.lineWidth = 3.4; b.beginPath(); b.moveTo(0, 12); b.lineTo(0, -8); b.moveTo(0, -2); b.lineTo(-9, -13); b.moveTo(0, -5); b.lineTo(9, -16); b.moveTo(-9, -13); b.lineTo(-12, -20); b.stroke();
      break;
    case 'cactus':
      b.fillStyle = st.leaf; b.fillRect(-5, -22, 10, 34);
      b.fillRect(-14, -14, 5, 12); b.fillRect(-14, -14, 9, 5); b.fillRect(9, -17, 5, 14); b.fillRect(5, -17, 9, 5);
      break;
    case 'tomb':
      b.fillStyle = st.rock; b.beginPath(); b.moveTo(-11, 12); b.lineTo(-11, -6); b.arc(0, -6, 11, Math.PI, 0); b.lineTo(11, 12); b.closePath(); b.fill();
      b.strokeStyle = 'rgba(0,0,0,0.3)'; b.lineWidth = 2; b.strokeRect(-5, -6, 10, 11);
      break;
    case 'sword_stone':
      b.fillStyle = st.rock; poly([[-14, 11], [-9, -4], [4, -8], [13, 0], [14, 11]]);
      b.strokeStyle = '#e8eef2'; b.lineWidth = 3.4; b.beginPath(); b.moveTo(1, -26); b.lineTo(1, -6); b.stroke();
      b.lineWidth = 2.6; b.beginPath(); b.moveTo(-6, -9); b.lineTo(8, -9); b.stroke();
      break;
    case 'pillar':
      b.fillStyle = st.rock; b.fillRect(-7, -26, 14, 38); b.fillRect(-10, -30, 20, 6); b.fillRect(-10, 10, 20, 5);
      b.fillStyle = 'rgba(0,0,0,0.18)'; b.fillRect(2, -26, 5, 38);
      break;
    case 'lamp':
      b.fillStyle = '#3d3630'; b.fillRect(-2, -20, 4, 30);
      b.fillStyle = st.accent; b.beginPath(); b.arc(0, -24, 5.4, 0, Math.PI * 2); b.fill();
      b.fillStyle = 'rgba(255,240,190,0.25)'; b.beginPath(); b.arc(0, -24, 11, 0, Math.PI * 2); b.fill();
      break;
    case 'banner':
      b.fillStyle = '#4c4038'; b.fillRect(-2, -30, 4, 42);
      b.fillStyle = st.accent; poly([[2, -30], [20, -24], [2, -17]]);
      break;
    case 'herb':
      b.strokeStyle = st.leaf2; b.lineWidth = 2.4;
      for (const dx of [-8, -3, 3, 8]) { b.beginPath(); b.moveTo(dx, 8); b.quadraticCurveTo(dx + 2, -2, dx + 4, -7); b.stroke(); }
      break;
    case 'furnace': case 'forge':
      b.fillStyle = '#4a4038'; b.fillRect(-15, -12, 30, 24); b.fillRect(-5, -24, 10, 12);
      b.fillStyle = '#f0643c'; b.fillRect(-8, -3, 16, 9);
      b.fillStyle = 'rgba(240,150,60,0.3)'; b.beginPath(); b.arc(0, 1, 14, 0, Math.PI * 2); b.fill();
      break;
    case 'fence':
      b.fillStyle = '#7a6248'; b.fillRect(-20, -8, 4, 16); b.fillRect(-2, -8, 4, 16); b.fillRect(16, -8, 4, 16); b.fillRect(-22, -5, 44, 3.4); b.fillRect(-22, 2, 44, 3.4);
      break;
    case 'hay': b.fillStyle = '#e3c96a'; b.beginPath(); b.ellipse(0, 4, 15, 8, 0, 0, Math.PI * 2); b.fill(); b.strokeStyle = 'rgba(0,0,0,0.15)'; b.lineWidth = 1.6; b.beginPath(); b.moveTo(-13, 2); b.lineTo(13, 2); b.moveTo(-11, 6); b.lineTo(11, 6); b.stroke(); break;
    case 'desk': b.fillStyle = '#7a5c3e'; b.fillRect(-14, -6, 28, 12); b.fillStyle = '#f2ecd8'; b.fillRect(-8, -4, 13, 8); break;
    case 'anvil': b.fillStyle = '#3d4148'; poly([[-13, -4], [13, -4], [5, 2], [5, 9], [-5, 9], [-5, 2]]); break;
    case 'bone':
      b.strokeStyle = '#e8e2d2'; b.lineWidth = 3; b.beginPath(); b.arc(0, 0, 9, 0.4, Math.PI - 0.4); b.stroke();
      b.fillStyle = '#e8e2d2'; b.beginPath(); b.arc(-9, -3, 3.4, 0, Math.PI * 2); b.arc(9, -3, 3.4, 0, Math.PI * 2); b.fill();
      break;
    case 'mushroom':
      b.fillStyle = '#e8e2d2'; b.fillRect(-3, -4, 6, 12);
      b.fillStyle = '#c4453c'; b.beginPath(); b.arc(0, -4, 11, Math.PI, 0); b.fill();
      b.fillStyle = 'rgba(255,255,255,0.75)'; b.beginPath(); b.arc(-4, -8, 2, 0, Math.PI * 2); b.arc(4, -10, 1.7, 0, Math.PI * 2); b.fill();
      break;
    case 'reed':
      b.strokeStyle = st.leaf2; b.lineWidth = 2.2;
      for (const dx of [-9, -3, 3, 9]) { b.beginPath(); b.moveTo(dx, 10); b.lineTo(dx + (dx > 0 ? 2 : -2), -12); b.stroke(); }
      break;
    // ---- GĐ68: asset môi trường mới ----
    case 'bamboo': // tre/trúc: chùm thân đốt + lá nhọn
      for (const [dx, hgt] of [[-11, 40], [-4, 48], [3, 44], [10, 38]] as Array<[number, number]>) {
        b.strokeStyle = '#3e7d33'; b.lineWidth = 3.4;
        b.beginPath(); b.moveTo(dx, 14); b.lineTo(dx + 1, 14 - hgt); b.stroke();
        b.strokeStyle = 'rgba(230,255,220,0.5)'; b.lineWidth = 1;
        for (let yy = 14 - 8; yy > 14 - hgt; yy -= 8) { b.beginPath(); b.moveTo(dx - 1.6, yy); b.lineTo(dx + 1.8, yy); b.stroke(); }
        b.fillStyle = '#559548';
        b.beginPath(); b.ellipse(dx + 5, 14 - hgt + 4, 6, 2.6, -0.5, 0, Math.PI * 2); b.fill();
        b.beginPath(); b.ellipse(dx - 5, 14 - hgt + 9, 5, 2.2, 0.5, 0, Math.PI * 2); b.fill();
      }
      break;
    case 'blossom': // đào: thân + tán hồng + cánh rơi
      b.fillStyle = '#5d4630'; b.fillRect(-3, -2, 6, 16);
      b.fillStyle = '#f2a8c0';
      b.beginPath(); b.arc(-10, -18, 11, 0, Math.PI * 2); b.arc(10, -18, 11, 0, Math.PI * 2); b.arc(0, -27, 12, 0, Math.PI * 2); b.fill();
      b.fillStyle = '#f7c8d8';
      b.beginPath(); b.arc(-5, -22, 7, 0, Math.PI * 2); b.arc(6, -20, 6, 0, Math.PI * 2); b.fill();
      b.fillStyle = '#f2a8c0';
      for (const [px, py] of [[-19, -8], [18, -12], [15, 2], [-16, 6]] as Array<[number, number]>) { b.beginPath(); b.arc(px, py, 2.4, 0, Math.PI * 2); b.fill(); }
      break;
    case 'willow': // liễu: tán + cành rủ
      b.fillStyle = '#5d4630'; b.fillRect(-3, -2, 6, 16);
      b.fillStyle = st.leaf2; b.beginPath(); b.arc(0, -16, 13, 0, Math.PI * 2); b.fill();
      b.strokeStyle = st.leaf; b.lineWidth = 2.2; b.lineCap = 'round';
      for (const dx of [-16, -10, -4, 3, 9, 15]) { b.beginPath(); b.moveTo(dx * 0.7, -20); b.quadraticCurveTo(dx, -2, dx * 0.85, 10); b.stroke(); }
      break;
    case 'palm': // dừa đảo biển: thân nghiêng + tàu lá + quả
      b.strokeStyle = '#7a5c3e'; b.lineWidth = 5; b.lineCap = 'round';
      b.beginPath(); b.moveTo(-6, 14); b.quadraticCurveTo(0, -6, 8, -22); b.stroke();
      b.strokeStyle = st.leaf; b.lineWidth = 3;
      for (const [ex, ey] of [[-18, -32], [-6, -40], [20, -34], [26, -20], [-22, -20]] as Array<[number, number]>) {
        b.beginPath(); b.moveTo(8, -22); b.quadraticCurveTo((8 + ex) / 2, -30, ex, ey); b.stroke();
      }
      b.fillStyle = '#6e4f30';
      b.beginPath(); b.arc(5, -20, 3, 0, Math.PI * 2); b.arc(11, -19, 3, 0, Math.PI * 2); b.fill();
      break;
    case 'house': // nhà gỗ mái ngói: tường + mái + cửa + cửa sổ sáng
      b.fillStyle = '#e8dcc0'; b.fillRect(-20, -12, 40, 26);
      b.fillStyle = '#8c3222'; poly([[-25, -12], [25, -12], [14, -30], [-14, -30]]);
      b.fillStyle = 'rgba(255,255,255,0.18)'; poly([[-25, -12], [-14, -30], [-6, -30], [-17, -12]]);
      b.fillStyle = '#5d4037'; b.fillRect(-5, -2, 10, 16);
      b.fillStyle = '#ffd94d'; b.fillRect(-15, -6, 7, 7); b.fillRect(8, -6, 7, 7);
      b.strokeStyle = 'rgba(0,0,0,0.25)'; b.lineWidth = 1.6; b.strokeRect(-20, -12, 40, 26);
      break;
    case 'hut': // lều tranh: vách tối + mái rạ
      b.fillStyle = '#3d3226'; b.beginPath(); b.moveTo(-12, 14); b.lineTo(-12, -2); b.lineTo(12, -2); b.lineTo(12, 14); b.closePath(); b.fill();
      b.fillStyle = '#c9a45c'; poly([[-20, -2], [20, -2], [0, -26]]);
      b.strokeStyle = 'rgba(0,0,0,0.2)'; b.lineWidth = 1.4;
      b.beginPath(); b.moveTo(-13, -10); b.lineTo(13, -10); b.moveTo(-7, -18); b.lineTo(7, -18); b.stroke();
      break;
    case 'pavilion': // đình/lầu: mái cong + cột + sàn
      b.fillStyle = '#8c3222'; poly([[-22, -18], [22, -18], [14, -32], [-14, -32]]);
      b.fillStyle = '#ffd94d'; b.fillRect(-22, -20, 44, 3);
      b.fillStyle = '#7a5c3e'; b.fillRect(-16, -18, 4, 32); b.fillRect(12, -18, 4, 32);
      b.fillStyle = '#5d4037'; b.fillRect(-16, 12, 32, 2);
      b.fillStyle = '#e8dcc0'; b.beginPath(); b.arc(0, -26, 3, 0, Math.PI * 2); b.fill();
      break;
    case 'mountain': // núi: 2 mặt sáng/tối
      b.fillStyle = st.rock; poly([[-32, 14], [-8, -30], [6, -12], [20, -26], [32, 14]]);
      b.fillStyle = 'rgba(255,255,255,0.16)'; poly([[-8, -30], [0, -18], [-4, -8], [-14, -14]]);
      b.fillStyle = 'rgba(0,0,0,0.18)'; poly([[6, -12], [20, -26], [32, 14], [14, 14]]);
      break;
    case 'mountain_snow': // núi tuyết: chóp trắng
      b.fillStyle = st.rock; poly([[-32, 14], [-8, -30], [6, -12], [20, -26], [32, 14]]);
      b.fillStyle = '#ffffff'; poly([[-8, -30], [-2, -20], [-8, -14], [-14, -20]]);
      b.fillStyle = '#ffffff'; poly([[20, -26], [24, -18], [18, -14], [14, -20]]);
      b.fillStyle = 'rgba(0,0,0,0.18)'; poly([[6, -12], [20, -26], [32, 14], [14, 14]]);
      break;
    case 'cave': // hang đá: vòm đá + miệng tối (bản thường, khác hang băng)
      b.fillStyle = st.rock; poly([[-26, 14], [-20, -14], [-8, -24], [10, -24], [22, -12], [26, 14]]);
      b.fillStyle = 'rgba(255,255,255,0.14)'; poly([[-20, -14], [-8, -24], [-2, -14], [-12, -10]]);
      b.fillStyle = '#0d1622'; b.beginPath(); b.ellipse(0, 6, 12, 10, 0, 0, Math.PI * 2); b.fill();
      b.fillStyle = '#04090f'; b.beginPath(); b.ellipse(0, 8, 7, 6, 0, 0, Math.PI * 2); b.fill();
      break;
    case 'pond': // ao/hồ: mặt nước + ánh + lau ven bờ
      b.fillStyle = '#5aa7c7'; b.beginPath(); b.ellipse(0, 6, 28, 9, 0, 0, Math.PI * 2); b.fill();
      b.fillStyle = '#79bede'; b.beginPath(); b.ellipse(-6, 4, 16, 5, 0, 0, Math.PI * 2); b.fill();
      b.strokeStyle = 'rgba(255,255,255,0.65)'; b.lineWidth = 1.4;
      b.beginPath(); b.ellipse(4, 8, 10, 2.4, 0, 0.2, Math.PI - 0.2); b.stroke();
      b.strokeStyle = st.leaf2; b.lineWidth = 2;
      for (const [rx, ry] of [[-25, 0], [25, 2]] as Array<[number, number]>) { b.beginPath(); b.moveTo(rx, ry + 6); b.lineTo(rx, ry - 4); b.stroke(); }
      break;
    case 'wave': // sóng biển: bọt trắng 2 lớp
      b.strokeStyle = '#eaf7ff'; b.lineWidth = 2.6; b.lineCap = 'round';
      b.beginPath(); b.moveTo(-28, 6); b.quadraticCurveTo(-14, -2, 0, 6); b.quadraticCurveTo(14, 14, 28, 6); b.stroke();
      b.strokeStyle = 'rgba(234,247,255,0.55)'; b.lineWidth = 1.8;
      b.beginPath(); b.moveTo(-20, 12); b.quadraticCurveTo(-8, 6, 4, 12); b.quadraticCurveTo(14, 17, 24, 12); b.stroke();
      break;
    case 'grass': // bụi cỏ: cụm lá cong
      b.strokeStyle = st.leaf2; b.lineWidth = 2.2; b.lineCap = 'round';
      for (const [dx, hgt, lean] of [[-10, 12, -3], [-4, 16, -1], [2, 14, 2], [8, 11, 4]] as Array<[number, number, number]>) {
        b.beginPath(); b.moveTo(dx, 12); b.quadraticCurveTo(dx + lean * 0.4, 12 - hgt * 0.6, dx + lean, 12 - hgt); b.stroke();
      }
      break;
    case 'flower': // hoa dại: cọng + bông 4 màu
      b.strokeStyle = st.leaf2; b.lineWidth = 2;
      for (const [dx, hgt] of [[-8, 10], [0, 13], [8, 9]] as Array<[number, number]>) {
        b.beginPath(); b.moveTo(dx, 12); b.lineTo(dx, 12 - hgt); b.stroke();
      }
      for (const [dx, hgt, col] of [[-8, 10, '#f2d13c'], [0, 13, '#e86a92'], [8, 9, '#f08a3c']] as Array<[number, number, string]>) {
        b.fillStyle = col; b.beginPath(); b.arc(dx, 12 - hgt - 2, 3, 0, Math.PI * 2); b.fill();
        b.fillStyle = '#ffffff'; b.beginPath(); b.arc(dx, 12 - hgt - 2, 1.2, 0, Math.PI * 2); b.fill();
      }
      break;
    case 'grass_tall': // cỏ khô cao: cọng vàng dài
      b.strokeStyle = '#c9a45c'; b.lineWidth = 2.2; b.lineCap = 'round';
      for (const [dx, hgt, lean] of [[-9, 24, -4], [-3, 28, -1], [3, 25, 2], [9, 21, 5]] as Array<[number, number, number]>) {
        b.beginPath(); b.moveTo(dx, 12); b.quadraticCurveTo(dx + lean * 0.4, 12 - hgt * 0.6, dx + lean, 12 - hgt); b.stroke();
      }
      b.strokeStyle = '#e3c96a'; b.lineWidth = 1.6;
      b.beginPath(); b.moveTo(-3, 12); b.lineTo(-4, -16); b.stroke();
      break;
    default: b.fillStyle = st.rock; poly([[-9, 6], [-5, -5], [4, -7], [9, 2], [8, 6]]); break;
  }
  b.restore();
}

function themeStyleOf(def: MapEnterData): ThemeStyle {
  return MAP_THEME_STYLE[def.theme || 'mountain'] || MAP_THEME_STYLE.mountain;
}
function decorTexture(scene: Phaser.Scene, theme: string, st: ThemeStyle, kind: string): string {
  const key = `decor-${theme}-${kind}`;
  if (scene.textures.exists(key)) return key;
  const BOX = 96;
  const [cv, b] = makeCanvas(BOX * 2, BOX * 2);
  b.scale(2, 2);
  drawDecorItem(b, st, kind, BOX / 2, BOX * 0.68, 1);
  scene.textures.addCanvas(key, cv);
  // GĐ68: decor vẽ vector mượt ở 2× — dùng LINEAR như map nhà (GĐ29), NEAREST
  // làm viền răng cưa/rung khi camera di chuyển (đó là chỗ "mờ" còn lại).
  scene.textures.get(key).setFilter(0); // GĐ68
  return key;
}
function plazaTexture(scene: Phaser.Scene, theme: string, st: ThemeStyle): string {
  const key = `plaza-${theme}`;
  if (scene.textures.exists(key)) return key;
  const [cv, b] = makeCanvas(440, 440);
  b.scale(2, 2);
  const px = 110, py = 110;
  b.fillStyle = st.plaza;
  b.beginPath(); b.arc(px, py, 100, 0, Math.PI * 2); b.fill();
  b.strokeStyle = 'rgba(0,0,0,0.22)'; b.lineWidth = 3;
  b.beginPath(); b.arc(px, py, 100, 0, Math.PI * 2); b.stroke();
  b.strokeStyle = st.accent; b.lineWidth = 3.4;
  b.beginPath(); b.arc(px, py, 62, 0, Math.PI * 2); b.stroke();
  b.lineWidth = 2;
  b.beginPath(); b.arc(px, py, 45, 0, Math.PI * 2); b.stroke();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    b.fillStyle = st.accent;
    b.beginPath(); b.arc(px + Math.cos(a) * 53, py + Math.sin(a) * 53, 3.2, 0, Math.PI * 2); b.fill();
  }
  scene.textures.addCanvas(key, cv);
  scene.textures.get(key).setFilter(0); // GĐ68: LINEAR như decor
  return key;
}
function volcanoTexture(scene: Phaser.Scene): string {
  const key = 'feat-volcano';
  if (scene.textures.exists(key)) return key;
  const [cv, b] = makeCanvas(620, 520);
  b.scale(2, 2);
  const poly = (pts: Array<[number, number]>) => { b.beginPath(); b.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) b.lineTo(pts[i][0], pts[i][1]); b.closePath(); b.fill(); };
  b.fillStyle = 'rgba(0,0,0,0.25)'; b.beginPath(); b.ellipse(155, 238, 140, 20, 0, 0, Math.PI * 2); b.fill();
  b.fillStyle = '#3a2b2e'; poly([[25, 240], [120, 60], [140, 34], [170, 34], [190, 60], [285, 240]]);
  b.fillStyle = '#4c3638'; poly([[120, 60], [140, 34], [155, 240], [25, 240]]);
  b.fillStyle = '#f0643c'; b.beginPath(); b.ellipse(155, 40, 34, 11, 0, 0, Math.PI * 2); b.fill();
  b.fillStyle = '#ffb03a'; b.beginPath(); b.ellipse(155, 40, 19, 6, 0, 0, Math.PI * 2); b.fill();
  b.strokeStyle = 'rgba(240,100,60,0.85)'; b.lineWidth = 5; b.lineCap = 'round';
  b.beginPath(); b.moveTo(146, 48); b.quadraticCurveTo(132, 110, 142, 168); b.quadraticCurveTo(148, 205, 140, 236); b.stroke();
  b.beginPath(); b.moveTo(166, 48); b.quadraticCurveTo(182, 120, 172, 190); b.stroke();
  b.strokeStyle = 'rgba(255,176,58,0.7)'; b.lineWidth = 2.4;
  b.beginPath(); b.moveTo(155, 48); b.quadraticCurveTo(150, 130, 158, 220); b.stroke();
  b.fillStyle = '#2e2126'; poly([[38, 240], [52, 214], [74, 240]]); poly([[238, 240], [254, 210], [272, 240]]);
  scene.textures.addCanvas(key, cv);
  scene.textures.get(key).setFilter(0); // GĐ68: LINEAR như decor
  return key;
}
function caveTexture(scene: Phaser.Scene, st: ThemeStyle): string {
  const key = 'feat-icecave';
  if (scene.textures.exists(key)) return key;
  const [cv, b] = makeCanvas(560, 400);
  b.scale(2, 2);
  b.fillStyle = 'rgba(20,40,60,0.20)'; b.beginPath(); b.ellipse(140, 178, 128, 16, 0, 0, Math.PI * 2); b.fill();
  drawDecorItem(b, st, 'ice_shard', 30, 168, 1.6);
  drawDecorItem(b, st, 'ice_shard', 66, 158, 2.1);
  drawDecorItem(b, st, 'rock', 104, 150, 1.5);
  drawDecorItem(b, st, 'rock', 178, 150, 1.5);
  drawDecorItem(b, st, 'ice_shard', 216, 158, 2.1);
  drawDecorItem(b, st, 'ice_shard', 250, 168, 1.6);
  drawDecorItem(b, st, 'ice_shard', 140, 118, 2.3);
  // cửa hang tối hun hút
  b.fillStyle = '#0d1622'; b.beginPath(); b.ellipse(140, 158, 56, 38, 0, 0, Math.PI * 2); b.fill();
  b.fillStyle = '#04090f'; b.beginPath(); b.ellipse(140, 162, 40, 27, 0, 0, Math.PI * 2); b.fill();
  // măng băng rủ trên cửa hang
  b.fillStyle = '#eaf7ff';
  for (const dx of [-38, -20, -4, 14, 30]) {
    b.beginPath(); b.moveTo(140 + dx - 5, 128); b.lineTo(140 + dx + 5, 128); b.lineTo(140 + dx, 146); b.closePath(); b.fill();
  }
  scene.textures.addCanvas(key, cv);
  scene.textures.get(key).setFilter(0); // GĐ68: LINEAR như decor
  return key;
}
function firepitTexture(scene: Phaser.Scene): string {
  const key = 'feat-firepit';
  if (scene.textures.exists(key)) return key;
  const [cv, b] = makeCanvas(360, 360);
  b.scale(2, 2);
  b.fillStyle = '#1c1414'; b.beginPath(); b.ellipse(90, 96, 80, 58, 0, 0, Math.PI * 2); b.fill();
  b.fillStyle = '#3c1e12'; b.beginPath(); b.ellipse(90, 96, 60, 42, 0, 0, Math.PI * 2); b.fill();
  b.fillStyle = '#f0643c'; b.beginPath(); b.ellipse(90, 96, 42, 28, 0, 0, Math.PI * 2); b.fill();
  b.fillStyle = '#ffb03a'; b.beginPath(); b.ellipse(90, 96, 24, 15, 0, 0, Math.PI * 2); b.fill();
  b.fillStyle = '#ffe9a8'; b.beginPath(); b.ellipse(90, 96, 10, 6, 0, 0, Math.PI * 2); b.fill();
  b.strokeStyle = 'rgba(240,100,60,0.55)'; b.lineWidth = 2;
  b.beginPath(); b.moveTo(30, 80); b.lineTo(58, 92); b.moveTo(150, 76); b.lineTo(124, 90); b.moveTo(96, 140); b.lineTo(90, 118); b.stroke();
  scene.textures.addCanvas(key, cv);
  scene.textures.get(key).setFilter(0); // GĐ68: LINEAR như decor
  return key;
}

const GROUND_TILE = 1024;
function groundTileTexture(scene: Phaser.Scene, def: MapEnterData, st: ThemeStyle, tx: number, ty: number): string {
  const key = `gt-${def.mapId}-${tx}-${ty}`;
  if (scene.textures.exists(key)) return key;
  const ox = tx * GROUND_TILE, oy = ty * GROUND_TILE;
  const w = Math.min(GROUND_TILE, def.w - ox), h = Math.min(GROUND_TILE, def.h - oy);
  const [cv, b] = makeCanvas(w, h);
  const rnd = seededRand(hashStrTs(`${def.mapId}:${tx}:${ty}`));
  b.fillStyle = st.g1; b.fillRect(0, 0, w, h);
  for (let i = 0; i < 6; i++) {
    b.fillStyle = i % 2 ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,235,0.05)';
    b.beginPath(); b.ellipse(rnd() * w, rnd() * h, 130 + rnd() * 300, 90 + rnd() * 200, rnd() * 3, 0, Math.PI * 2); b.fill();
  }
  for (let i = 0; i < 460; i++) {
    b.fillStyle = i % 3 ? st.g2 : 'rgba(0,0,0,0.10)';
    b.globalAlpha = 0.16;
    b.fillRect(Math.floor(rnd() * (w / 16)) * 16, Math.floor(rnd() * (h / 16)) * 16, 16, 16);
  }
  b.globalAlpha = 1;
  if (def.theme === 'void') {
    for (let i = 0; i < 42; i++) { b.fillStyle = 'rgba(230,230,255,0.5)'; b.fillRect(rnd() * w, rnd() * h, 2.4, 2.4); }
  } else if (def.theme === 'lava') {
    for (let i = 0; i < 30; i++) { b.fillStyle = 'rgba(240,100,60,0.35)'; b.beginPath(); b.arc(rnd() * w, rnd() * h, 1.6 + rnd() * 2.4, 0, Math.PI * 2); b.fill(); }
  } else if (def.theme === 'ice' || def.theme === 'ice_plain' || def.theme === 'deep_sea') {
    for (let i = 0; i < 34; i++) { b.fillStyle = 'rgba(255,255,255,0.4)'; b.fillRect(rnd() * w, rnd() * h, 2.2, 2.2); }
  }
  // viền biên thế giới chỉ vẽ ở ô chạm biên
  b.strokeStyle = 'rgba(0,0,0,0.45)'; b.lineWidth = 12;
  b.beginPath();
  if (tx === 0) { b.moveTo(6, 0); b.lineTo(6, h); }
  if (ty === 0) { b.moveTo(0, 6); b.lineTo(w, 6); }
  if (ox + w >= def.w) { b.moveTo(w - 6, 0); b.lineTo(w - 6, h); }
  if (oy + h >= def.h) { b.moveTo(0, h - 6); b.lineTo(w, h - 6); }
  b.stroke();
  scene.textures.addCanvas(key, cv);
  scene.textures.get(key).setFilter(0); // GĐ68: LINEAR như decor
  return key;
}

export interface BuiltMap {
  objects: Phaser.GameObjects.GameObject[];
  hazardImages: Phaser.GameObjects.Image[];
  tileKeys: string[];
}
export function buildMapObjects(scene: Phaser.Scene, def: MapEnterData): BuiltMap {
  const st = themeStyleOf(def);
  const theme = def.theme || 'mountain';
  const objects: Phaser.GameObjects.GameObject[] = [];
  const hazardImages: Phaser.GameObjects.Image[] = [];
  const tileKeys: string[] = [];
  const nx = Math.ceil(def.w / GROUND_TILE), ny = Math.ceil(def.h / GROUND_TILE);
  for (let tx = 0; tx < nx; tx++) for (let ty = 0; ty < ny; ty++) {
    const key = groundTileTexture(scene, def, st, tx, ty);
    tileKeys.push(key);
    const w = Math.min(GROUND_TILE, def.w - tx * GROUND_TILE), h = Math.min(GROUND_TILE, def.h - ty * GROUND_TILE);
    objects.push(scene.add.image(tx * GROUND_TILE + w / 2, ty * GROUND_TILE + h / 2, key).setDepth(-100));
  }
  objects.push(scene.add.image(def.portal.x, def.portal.y, plazaTexture(scene, theme, st)).setDepth(-99));
  for (const hz of def.hazards || []) {
    const img = scene.add.image(hz.x, hz.y, firepitTexture(scene)).setDepth(-99);
    img.setDisplaySize(hz.r * 2.5, hz.r * 2.5);
    hazardImages.push(img); objects.push(img);
  }
  if (def.features?.volcano) {
    objects.push(scene.add.image(def.features.volcano.x, def.features.volcano.y, volcanoTexture(scene)).setOrigin(0.5, 0.86).setDepth(-99));
  }
  for (const c of def.features?.caves || []) {
    objects.push(scene.add.image(c.x, c.y, caveTexture(scene, st)).setOrigin(0.5, 0.72).setDepth(-99));
  }
  for (const d of def.decor || []) {
    const img = scene.add.image(d.x, d.y, decorTexture(scene, theme, st, d.k)).setOrigin(0.5, 0.68).setDepth(-99);
    if (d.s && d.s !== 1) img.setScale(d.s);
    objects.push(img);
  }
  return { objects, hazardImages, tileKeys };
}
export function destroyBuiltMap(scene: Phaser.Scene, built: BuiltMap | null): void {
  if (!built) return;
  if (built.hazardImages.length) scene.tweens.killTweensOf(built.hazardImages);
  for (const o of built.objects) o.destroy();
  for (const k of built.tileKeys) if (scene.textures.exists(k)) scene.textures.remove(k);
}

// ============ GĐ68: ICON CÔNG PHÁP (vẽ thủ tục — đủ cho cả 511 chiêu) ============
// Mỗi chiêu có 1 icon duy nhất từ 3 dữ kiện sẵn có trong catalog: hệ (màu nền),
// bậc (khung) và vũ khí (hình glyph). Chiêu hỗ trợ thêm vành lam nhạt.
// "Theo linh căn" = màu trung tính duy nhất (GĐ69 bỏ vành 5 màu theo ý
// người chơi; vẽ tay từng chiêu để sau, chưa gấp).
// Vẽ bằng Canvas 2D thuần (không cần Phaser) để dùng trực tiếp trong DOM:
// hàng Sổ công pháp + nút chiêu cảm ứng. Cache theo key để không vẽ lại.
export const SKILL_ELEMENT_COLOR: Record<string, string> = {
  Kim: '#dfe7ee', Hỏa: '#f0643c', Mộc: '#58a447', Thủy: '#5aa7c7', Thổ: '#c9a45c',
};
const SKILL_TIER_FRAME: Record<string, string> = {
  coban: '#b08a4a', luyenkhi: '#3fae8e', trucco: '#e8b93a',
};
export function skillGlyphFamily(weaponId: string): string {
  switch (weaponId) {
    case 'cukiem': case 'daothe': case 'songdao': case 'liemngan': case 'daogam':
    case 'kiem': case 'songkiem': case 'trongkiem': return 'blade';
    case 'thuongthe': case 'quythuong': case 'kimcham': return 'spear';
    case 'chienphu': return 'axe';
    case 'thietcon': case 'cotthuan': case 'cotchuy': return 'staff';
    case 'phaptruong': case 'quyentruong': case 'phatchau': case 'colenh': case 'phattran': return 'orb';
    case 'phien': case 'binhbat': return 'fan';
    case 'sachphep': case 'butphep': case 'ngamtho': case 'quyentruc': return 'book';
    case 'luoihai': return 'chain';
    case 'cocam': return 'zither';
    default: return 'fist'; // taykhong, trao (trảo) + vũ khí lạ → nắm đấm
  }
}
const _skillIconCache = new Map<string, string>();
export function skillIconURL(skill: { id?: string; element?: string; tier?: string; weaponId?: string; utility?: boolean }): string {
  // GĐ71: chiêu có icon thật (game-icons) -> file SVG tĩnh; chưa map -> vẽ
  // procedural như cũ (màu hệ + khung bậc + glyph vũ khí).
  if (skill.id && SKILL_ICON_IDS[skill.id]) return `/icons/${skill.id}.svg`;
  const el = skill.element || '';
  const tier = skill.tier || '';
  const fam = skillGlyphFamily(skill.weaponId || '');
  const key = `${el}|${tier}|${fam}|${skill.utility ? 'u' : ''}`;
  const hit = _skillIconCache.get(key);
  if (hit) return hit;
  const S = 96;
  const cv = document.createElement('canvas');
  cv.width = S; cv.height = S;
  const b = cv.getContext('2d');
  if (!b) return '';
  const frame = SKILL_TIER_FRAME[tier] || '#8a8f96';
  const fill = SKILL_ELEMENT_COLOR[el] || '#3fae8e';
  const cx = S / 2, cy = S / 2;
  // Nền: bậc Cơ bản = vuông bo, Luyện Khí = thoi, Trúc Cơ = lục giác, lạ = tròn
  b.fillStyle = '#10160f';
  b.beginPath();
  if (tier === 'luyenkhi') { b.moveTo(cx, 4); b.lineTo(S - 4, cy); b.lineTo(cx, S - 4); b.lineTo(4, cy); }
  else if (tier === 'trucco') {
    for (let i = 0; i < 6; i++) { const a = Math.PI / 3 * i - Math.PI / 6; const px = cx + 42 * Math.cos(a), py = cy + 42 * Math.sin(a); if (i === 0) b.moveTo(px, py); else b.lineTo(px, py); }
  }
  else if (tier === 'coban') { b.roundRect(6, 6, S - 12, S - 12, 16); }
  else { b.arc(cx, cy, 42, 0, Math.PI * 2); }
  b.closePath(); b.fill();
  b.lineWidth = 5; b.strokeStyle = frame; b.stroke();
  // Ruột: 1 màu đặc theo hệ — GĐ69 bỏ vành 5 màu của "Theo linh căn"
  if (el === 'Theo linh căn' || !SKILL_ELEMENT_COLOR[el]) {
    b.fillStyle = '#8fa3bd';
    b.beginPath(); b.arc(cx, cy, 31, 0, Math.PI * 2); b.fill();
    b.fillStyle = 'rgba(255,255,255,0.28)';
    b.beginPath(); b.arc(cx - 8, cy - 10, 12, 0, Math.PI * 2); b.fill();
  } else {
    b.fillStyle = fill;
    b.beginPath(); b.arc(cx, cy, 31, 0, Math.PI * 2); b.fill();
    b.fillStyle = 'rgba(255,255,255,0.28)';
    b.beginPath(); b.arc(cx - 8, cy - 10, 12, 0, Math.PI * 2); b.fill();
  }
  // Glyph vũ khí — nét đậm, đọc được ở 28–40px
  b.strokeStyle = '#14100a'; b.fillStyle = '#14100a'; b.lineCap = 'round'; b.lineJoin = 'round';
  const drawGlyph = () => {
    switch (fam) {
      case 'blade':
        b.lineWidth = 6; b.beginPath(); b.moveTo(cx - 14, cy + 16); b.lineTo(cx + 12, cy - 14); b.stroke();
        b.lineWidth = 4; b.beginPath(); b.moveTo(cx + 2, cy + 2); b.lineTo(cx + 16, cy + 16); b.stroke();
        b.lineWidth = 3; b.beginPath(); b.moveTo(cx + 6, cy - 2); b.lineTo(cx + 16, cy + 8); b.stroke();
        break;
      case 'spear':
        b.lineWidth = 5; b.beginPath(); b.moveTo(cx, cy + 20); b.lineTo(cx, cy - 14); b.stroke();
        b.beginPath(); b.moveTo(cx, cy - 20); b.lineTo(cx - 7, cy - 8); b.lineTo(cx, cy - 12); b.lineTo(cx + 7, cy - 8); b.closePath(); b.fill();
        break;
      case 'axe':
        b.lineWidth = 5; b.beginPath(); b.moveTo(cx - 2, cy - 18); b.lineTo(cx - 2, cy + 20); b.stroke();
        b.beginPath(); b.arc(cx + 6, cy - 6, 12, -Math.PI / 2, Math.PI / 2); b.lineTo(cx - 2, cy + 6); b.closePath(); b.fill();
        break;
      case 'staff':
        b.lineWidth = 6; b.beginPath(); b.moveTo(cx - 12, cy + 18); b.lineTo(cx + 12, cy - 18); b.stroke();
        b.fillStyle = '#ffd94d'; b.beginPath(); b.arc(cx + 14, cy - 20, 5, 0, Math.PI * 2); b.fill();
        break;
      case 'orb':
        b.lineWidth = 4; b.beginPath(); b.arc(cx, cy, 13, 0, Math.PI * 2); b.stroke();
        b.fillStyle = '#ffd94d'; b.beginPath(); b.arc(cx, cy, 6, 0, Math.PI * 2); b.fill();
        b.lineWidth = 2.5; b.beginPath(); b.moveTo(cx - 20, cy); b.lineTo(cx - 15, cy); b.moveTo(cx + 15, cy); b.lineTo(cx + 20, cy); b.stroke();
        break;
      case 'fan':
        b.lineWidth = 4;
        for (const a of [-0.9, -0.45, 0, 0.45, 0.9]) {
          b.beginPath(); b.moveTo(cx, cy + 16); b.lineTo(cx + Math.sin(a) * 20, cy + 16 - Math.cos(a) * 20); b.stroke();
        }
        break;
      case 'book':
        b.lineWidth = 4; b.strokeRect(cx - 13, cy - 14, 26, 28);
        b.lineWidth = 2.5; b.beginPath(); b.moveTo(cx, cy - 14); b.lineTo(cx, cy + 14); b.stroke();
        break;
      case 'chain':
        b.lineWidth = 4;
        for (const [ox, oy] of [[-10, -8], [0, 0], [10, 8]] as Array<[number, number]>) {
          b.beginPath(); b.ellipse(cx + ox, cy + oy, 6, 4, 0.6, 0, Math.PI * 2); b.stroke();
        }
        break;
      case 'zither': // cổ cầm: thân ngang + dây
        b.lineWidth = 4; b.strokeRect(cx - 16, cy - 8, 32, 14);
        b.lineWidth = 1.8;
        for (const oy of [-3, 1, 5]) { b.beginPath(); b.moveTo(cx - 14, cy + oy); b.lineTo(cx + 14, cy + oy); b.stroke(); }
        break;
      default: // fist
        b.beginPath(); b.arc(cx, cy + 2, 13, 0, Math.PI * 2); b.fill();
        b.fillStyle = '#10160f';
        for (const dx of [-7, 0, 7]) { b.beginPath(); b.arc(cx + dx, cy - 12, 3.4, 0, Math.PI * 2); b.fill(); }
        break;
    }
  };
  drawGlyph();
  // Chiêu hỗ trợ: vành lam nhạt ngoài khung
  if (skill.utility) {
    b.lineWidth = 3; b.strokeStyle = 'rgba(139,233,201,0.9)';
    b.beginPath(); b.arc(cx, cy, 45, 0, Math.PI * 2); b.stroke();
  }
  const url = cv.toDataURL();
  _skillIconCache.set(key, url);
  return url;
}
