// ============================================================
// Tập Tành Tu Tiên — Frontend (Phaser 3 + TypeScript + Vite)
//
// GIAI ĐOẠN 7 — CÔNG PHÁP + TU VI + CẢNH GIỚI:
// - Panel nhân vật có thêm: cảnh giới (Phàm nhân / Luyện Khí
//   tầng), dòng linh căn, thanh TU VI và nút ĐỘT PHÁ phát sáng
//   khi đủ Tu vi; 7 chỉ số có nút cộng điểm (+1 điểm tự do,
//   +2 điểm đột phá) — mọi thay đổi do server quyết và đồng bộ
//   qua sự kiện 'char_sync'.
// - Thanh công pháp dưới màn hình: mỗi ô hiện tên chiêu + tốn
//   Chân nguyên + lớp phủ hồi chiêu; phím 1/2/3 tung chiêu
//   ('cast_skill'), server kiểm tra tầm/hồi chiêu/Chân nguyên.
// - Đứng trước cửa Đạo Quán hiện gợi ý phím E: đo linh căn
//   (lần đầu) hoặc học công pháp Luyện Khí (từ tầng 3).
// - Nền tảng cũ giữ nguyên: nhân vật + lưu server (GĐ6), làng
//   + camera (GĐ5), quái + combat (GĐ4), sprite 4 hướng (GĐ3),
//   input WASD (GĐ2), LERP hiển thị (GĐ1).
// ============================================================

import Phaser from 'phaser';
import { io, Socket } from 'socket.io-client';
import { bakePersonTextures, personTexKey, personStyleKeyForPlayer, npcStyleKey, PERSON_TEX, bakeWorldTextures, WORLD_GEO, HOUSE_TEX, DAOQUAN_TEX, TREE_TEX, bakeMonsterTextures, bakeDropTextures, bakeChestTextures, wolfTexKey, WOLF_TEX, bakeBirdTextures, birdTexKey, BIRD_TEX, bakeFxTextures, fxOrbKey, ensurePersonVariant, drawPersonPreview, buildMapObjects, destroyBuiltMap, skillIconURL } from './gfx';
import type { MapEnterData, BuiltMap } from './gfx';

// Gộp 1 địa chỉ (GĐ5): bản dựng chạy từ chính server cổng 3001 →
// kết nối cùng origin; khi dev bằng Vite (5173) thì trỏ sang 3001.
const SERVER_URL = window.location.port === '5173' ? 'http://localhost:3001' : '';
const WORLD_W = 2800; // GĐ57: + phía đông cho Bí Cảnh Thạch Lâm (nền vẽ ở 2 texture riêng)
const WORLD_H = 1200;
type Direction = 'left' | 'right' | 'up' | 'down';


// ---------------- Dữ liệu từ server ----------------
interface StatsData {
  khiHuyet: number;
  vatCong: number;
  vatPhong: number;
  phapCong: number;
  phapPhong: number;
  tocDo: number;
  thanThuc: number;
}

interface SkillData {
  id: string;
  name: string;
  tier: string;
  coef: number;
  cdMs: number;
  cost: number;
  range: number;
}

interface LinhCanData {
  elements: string[];
  main: string;
  count: number;
}

interface QuestStateData {
  progress: number;
  state: string; // 'active' | 'done'
}

// GĐ20: đồng hồ thế giới do server giữ (dùng chung mọi người chơi)
interface WorldClockData {
  dayIndex: number;
  minuteOfDay: number;
  hour: number;
  minute: number;
  day: number;
  month: number;
  year: number;
  canh: string;
  isNight: boolean;
}

interface CharacterData {
  name: string;
  classId: string;
  className: string;
  stats: StatsData;
  freePoints: number;
  statPoints: number;
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  linhCan: LinhCanData | null;
  realm: string;
  tier: number;
  tuVi: number;
  tuViNeed: number | null;
  // GĐ19: thông tin đột phá kế tiếp (loại tiểu/trung/đại, đan cần, đã thắng thử thách chưa)
  breakInfo: { type: string; pillName: string | null; trialReady: boolean; failStreak: number; lifespanGain?: number } | null;
  // GĐ20: tuổi + thọ nguyên + đồng hồ thế giới
  age: number;
  lifespan: number;
  lifespanLeft: number;
  offlineTuViGrant: number;
  world: WorldClockData;
  // GĐ21: Tọa Thiền + tổng kết quãng nghỉ offline
  meditation: boolean;
  restSummary: { state: string | null; days: number; grant: number } | null;
  // GĐ22: con đường khởi đầu
  path: string;
  homeType: string;
  // GĐ23: đang bế quan hay không
  bequan: boolean;
  // GĐ24: thiện cảm theo NPC
  affinity: Record<string, number>;
  // GĐ25: ngày ân hạn tọa hóa còn lại (null = thọ chưa tận)
  graceDaysLeft: number | null;
  skillSlots?: { used: number; max: number; utilUsed?: number; utilMax?: number }; // GĐ36+37
  utilSkills?: SkillData[]; // GĐ37: ô đa dụng của bảng đang dùng
  activeBoard?: number; // GĐ37
  caseActive?: Record<string, boolean>; // GĐ40+: vụ án mở hôm nay
  merchantOrder?: { itemId: string; day?: number } | null; // GĐ40+
  boardsInfo?: { main: number; util: number }[]; // GĐ37
  // GĐ35: sự kiện đầu tháng
  // GĐ26: nghề phụ
  job: { jobId: string; jobName: string; crafts: number; rank: number; rankName: string } | null;
  // GĐ27: thành tựu (server tính sẵn trạng thái)
  achievements: Array<{ id: string; name: string; desc: string; target: number; progress: number; reward: number; done: boolean; claimed: boolean }>;
  // GĐ30: Công trạng + tông môn
  merit: number;
  sect: string | null;
  sectName: string | null;
  // GĐ31-sửa: công pháp đang lĩnh ngộ (ngồi học chủ động, tiến độ theo phút game)
  learning: { skillId: string; name: string; tier: string; progressMin: number; needMin: number; pct: number; active: boolean } | null;
  // GĐ32: danh mục công pháp LK+TC của (lớp × vũ khí) cho panel học
  catalog: CatalogEntry[];
  skills: SkillData[];
  // GĐ8
  stones: number;
  stonesTrung?: number; // GĐ67: ví Trung phẩm (rương TC+)
  stonesThuong?: number; // GĐ67: ví Thượng phẩm (rương KD hậu+)
  stonesCuc?: number; // GĐ69: ví Cực phẩm (rương boss)
  escort?: { dest: string; destName: string; delivery: { x: number; y: number }; reward: { stones: number; tuVi: number } } | null; // GĐ60
  inventory: Record<string, number>;
  quests: Record<string, QuestStateData>;
  // GĐ10
  robe: string | null;
  gender: string;
  account: string | null;
  // GĐ11
  weaponId: string | null;
  weaponName: string | null;
}

interface NpcState {
  id: string;
  name: string;
  role: string;
  x: number;
  y: number;
  direction: Direction;
}

interface DropState {
  id: string;
  kind: string; // 'stones' | 'item'
  itemId: string | null;
  amount: number;
  x: number;
  y: number;
}

interface ChestState {
  id: string;
  x: number;
  y: number;
  grade: string; // 'C' | 'B' | 'A'
}

// ---- Kinh tế + nhiệm vụ (GĐ8): bản tham chiếu phía client, server là chuẩn ----
const ITEM_INFO: Record<string, { name: string; desc?: string }> = {
  nanh_soi: { name: 'Nanh Sói', desc: 'Nguyên liệu — bán ở Tiệm Nguyên Liệu' },
  canh_doi: { name: 'Cánh Dơi', desc: 'Cánh của Dơi Đen — bán ở Tiệm Nguyên Liệu, dùng trả nhiệm vụ' }, // GĐ38
  da_quy: { name: 'Đá Quý', desc: 'Rơi từ Thạch Quái — bán được giá cao' }, // GĐ38
  dan_hoi_nguyen: { name: 'Đan Hồi Nguyên', desc: 'Dùng: hồi 50% Chân nguyên tối đa' },
  dan_hoi_xuan: { name: 'Hồi Xuân Đan', desc: 'Dùng: hồi 50% HP tối đa' },
  // GĐ84: đan đột phá (trước đây thiếu ở ITEM_INFO → hàng tiệm tông môn hiện "undefined")
  dan_trung_canh: { name: 'Đan Trung Cảnh', desc: 'Đan bắt buộc để đột phá Trung cảnh (tầng 3→4, 6→7)' },
  dan_truc_co: { name: 'Đan Trúc Cơ', desc: 'Đan bắt buộc để đột phá Đại cảnh Luyện Khí 9 → Trúc Cơ' },
  dan_ho_mach: { name: 'Đan Hộ Mạch', desc: 'Dùng khi đột phá Đại cảnh: +10% tỉ lệ thành công (tự tiêu hao)' },
  sach_toa_thien: { name: 'Sách Tọa Thiền', desc: 'Công pháp tiện ích (Hỗ trợ tu luyện) — Dùng để học Tọa Thiền' },
  thu_tien_cu: { name: 'Thư Tiến Cử', desc: 'Vé vào Thiên Kiếm Môn — nộp cho Sứ Giả khi gia nhập (xong 10 nhiệm vụ bảng thì được trao)' },
  // GĐ26: sản phẩm nghề phụ
  phu_ho_than: { name: 'Phù Hộ Thân', desc: 'Dùng: hồi 40% HP tối đa (Phù Sư chế)' },
  phu_tu_linh: { name: 'Phù Tụ Linh', desc: 'Dùng: +20 Tu vi (Phù Sư chế)' },
  nanh_tinh: { name: 'Nanh Sói Tinh Luyện', desc: 'Nguyên liệu tinh luyện — bán Tiệm Nguyên Liệu 30 LT (Luyện Khí Sư chế)' },
  tran_ky: { name: 'Trận Kỳ Dịch Chuyển', desc: 'Dùng: dịch chuyển về quảng trường làng (Trận Pháp Sư chế)' },
  banh_thit: { name: 'Bánh Thịt Thú', desc: 'Dùng: hồi 25% HP tối đa + 30 thức ăn (Thú Sư chế)' },
  da_soi: { name: 'Da Sói Khô', desc: 'Bán Tiệm Nguyên Liệu 22 LT (Thú Sư thuộc)' },
  // GĐ78: đồ ăn / thức uống — chỉ hồi thanh đói/khát
  com_nam: { name: 'Cơm Nắm', desc: 'Dùng: +35 thức ăn (mua ở Tửu Lâu)' },
  thit_nuong: { name: 'Thịt Nướng', desc: 'Dùng: +60 thức ăn (mua ở Tửu Lâu)' },
  luong_kho: { name: 'Lương Khô', desc: 'Dùng: +25 thức ăn (thương nhân lưu động bán)' },
  nuoc_loc: { name: 'Nước Lọc', desc: 'Dùng: +40 nước uống (mua ở Tửu Lâu / thương nhân lưu động)' },
  tra_thao_moc: { name: 'Trà Thảo Mộc', desc: 'Dùng: +60 nước uống (mua ở Tửu Lâu)' },
  ruou_gao: { name: 'Rượu Gạo', desc: 'Dùng: +30 nước uống (mua ở Tửu Lâu)' },
};
// GĐ26: nghề phụ (mirror server) — nghề + công thức + cấp nghề
const JOB_INFO: Record<string, { name: string; icon: string }> = {
  dansu: { name: 'Đan Sư', icon: '⚗️' },
  luyenkhi: { name: 'Luyện Khí Sư', icon: '🔨' },
  tranphap: { name: 'Trận Pháp Sư', icon: '🧭' },
  phusu: { name: 'Phù Sư', icon: '🧧' },
  thusu: { name: 'Thú Sư', icon: '🐾' },
};
const JOB_RANK_NAMES_CLIENT: Record<number, string> = { 1: 'Nhập môn', 2: 'Thợ nghề', 3: 'Sư phụ' };
const RECIPE_INFO: Record<string, { jobId: string; name: string; inputs: Record<string, number>; stones: number; output: string; rate: number; minRank: number }> = {
  rc_hoi_xuan: { jobId: 'dansu', name: 'Luyện Hồi Xuân Đan', inputs: { nanh_soi: 2 }, stones: 5, output: 'dan_hoi_xuan', rate: 0.9, minRank: 1 },
  rc_hoi_nguyen: { jobId: 'dansu', name: 'Luyện Đan Hồi Nguyên', inputs: { nanh_soi: 5 }, stones: 10, output: 'dan_hoi_nguyen', rate: 0.6, minRank: 2 },
  // GĐ84: đan đột phá (mirror server)
  rc_trung_canh: { jobId: 'dansu', name: 'Luyện Đan Trung Cảnh', inputs: { nanh_soi: 10 }, stones: 20, output: 'dan_trung_canh', rate: 0.7, minRank: 1 },
  rc_truc_co: { jobId: 'dansu', name: 'Luyện Đan Trúc Cơ', inputs: { nanh_soi: 20, da_quy: 2 }, stones: 50, output: 'dan_truc_co', rate: 0.6, minRank: 2 },
  rc_ho_mach: { jobId: 'dansu', name: 'Luyện Đan Hộ Mạch', inputs: { nanh_soi: 8, canh_doi: 2 }, stones: 15, output: 'dan_ho_mach', rate: 0.75, minRank: 2 },
  rc_nanh_tinh: { jobId: 'luyenkhi', name: 'Tinh luyện Nanh Sói', inputs: { nanh_soi: 3 }, stones: 0, output: 'nanh_tinh', rate: 0.85, minRank: 1 },
  rc_tran_ky: { jobId: 'tranphap', name: 'Khắc Trận Kỳ Dịch Chuyển', inputs: { nanh_soi: 4 }, stones: 10, output: 'tran_ky', rate: 0.75, minRank: 1 },
  rc_phu_ho_than: { jobId: 'phusu', name: 'Vẽ Phù Hộ Thân', inputs: { nanh_soi: 3 }, stones: 8, output: 'phu_ho_than', rate: 0.8, minRank: 1 },
  rc_phu_tu_linh: { jobId: 'phusu', name: 'Vẽ Phù Tụ Linh', inputs: { nanh_soi: 5 }, stones: 12, output: 'phu_tu_linh', rate: 0.65, minRank: 2 },
  rc_banh_thit: { jobId: 'thusu', name: 'Nướng Bánh Thịt Thú', inputs: { nanh_soi: 2 }, stones: 4, output: 'banh_thit', rate: 0.9, minRank: 1 },
  rc_da_soi: { jobId: 'thusu', name: 'Thuộc Da Sói', inputs: { nanh_soi: 2 }, stones: 0, output: 'da_soi', rate: 0.9, minRank: 1 },
};
const SHOP_INFO: Record<string, { name: string; sell: Record<string, number>; buy: Record<string, number> }> = {
  tiem_dan: {
    name: 'Tiệm Đan Dược',
    // GĐ84: trước đây mirror thiếu 3 đan đột phá nên UI tiệm không hiện
    // hàng dù server vẫn bán — đồng bộ đúng giá server (số TẠM).
    sell: { dan_hoi_nguyen: 30, dan_hoi_xuan: 15, dan_trung_canh: 200, dan_truc_co: 800, dan_ho_mach: 300 },
    buy: { dan_hoi_nguyen: 12, dan_hoi_xuan: 6, dan_trung_canh: 80, dan_truc_co: 320, dan_ho_mach: 120 },
  },
  tiem_nguyen_lieu: {
    name: 'Tiệm Nguyên Liệu',
    sell: { nanh_soi: 12 },
    buy: { nanh_soi: 5, nanh_tinh: 30, da_soi: 22, canh_doi: 8, da_quy: 45 }, // GĐ38: đồng bộ với server
  },
  tiem_tong_mon: { // GĐ30: chỉ đệ tử tông môn (server kiểm tra)
    name: 'Tiệm Tông Môn',
    sell: { dan_hoi_nguyen: 25, dan_hoi_xuan: 12, dan_trung_canh: 170, dan_truc_co: 680, dan_ho_mach: 255 },
    buy: { dan_hoi_nguyen: 10, dan_hoi_xuan: 5, dan_trung_canh: 68, dan_truc_co: 272, dan_ho_mach: 102 },
  },
  luu_dong: { // GĐ40: thương nhân lưu động — mỗi ngày chỉ bán 3 món luân phiên (server chốt)
    name: 'Thương Nhân Lưu Động (hàng đổi mỗi ngày)',
    sell: { dan_hoi_nguyen: 45, dan_hoi_xuan: 22, dan_trung_canh: 300, dan_ho_mach: 340, sach_toa_thien: 500, da_quy: 68, nanh_tinh: 40, phu_ho_than: 60, luong_kho: 10, nuoc_loc: 8 }, // GĐ78: + lương khô, nước lọc
    buy: { da_quy: 45, nanh_tinh: 30, canh_doi: 8 },
  },
  tuu_lau: { // GĐ78: tiệm đồ ăn thức uống ở cửa Quán Ăn
    name: 'Tửu Lâu',
    sell: { com_nam: 8, thit_nuong: 15, nuoc_loc: 5, tra_thao_moc: 12, ruou_gao: 10 },
    buy: { com_nam: 3, thit_nuong: 6, nuoc_loc: 2, tra_thao_moc: 5, ruou_gao: 4 },
  },
};
const QUEST_INFO: Record<string, { name: string; desc: string; target: number; reward: number; kind?: string; itemId?: string; npcId?: string; duel?: string; laCase?: boolean }> = {
  q_dietsoi: { name: 'Trừ khử Sói Xám', desc: 'Hạ 5 con Sói Xám ngoài làng', target: 5, reward: 25, kind: 'kill' },
  q_nanhsoi: { name: 'Thu thập Nanh Sói', desc: 'Mang theo 3 Nanh Sói tới trả', target: 3, reward: 20, kind: 'item', itemId: 'nanh_soi' },
  q_dietdoi: { name: 'Diệt Dơi Đen', desc: 'Hạ 10 con Dơi Đen ngoài làng (+20 Tu vi)', target: 10, reward: 80, kind: 'kill' }, // GĐ38
  q_dietthach: { name: 'Diệt Thạch Quái', desc: 'Hạ 5 con Thạch Quái ở góc đông bắc (+30 Tu vi)', target: 5, reward: 150, kind: 'kill' }, // GĐ38
  q_canhdoi: { name: 'Thu thập Cánh Dơi', desc: 'Mang theo 5 Cánh Dơi tới trả', target: 5, reward: 60, kind: 'item', itemId: 'canh_doi' }, // GĐ38
  // GĐ24: nhiệm vụ riêng của NPC (mở khi thiện cảm ≥ 50) — nhận/trả tại NPC qua hộp thoại trò chuyện
  pq_truonglang: { name: 'Tâm nguyện của Trưởng Làng', desc: 'Mang 5 Nanh Sói cho Trưởng Làng', target: 5, reward: 80, kind: 'item', itemId: 'nanh_soi', npcId: 'npc_truonglang' },
  pq_dan: { name: 'Đan phường thiếu tay', desc: 'Hạ 10 Sói Xám giúp Chủ Tiệm Đan', target: 10, reward: 50, kind: 'kill', npcId: 'npc_dan' },
  pq_nguyenlieu: { name: 'Nguyên liệu cho tiệm', desc: 'Mang 5 Nanh Sói cho Chủ Tiệm Nguyên Liệu', target: 5, reward: 70, kind: 'item', itemId: 'nanh_soi', npcId: 'npc_nguyenlieu' },
  q_tusi: { name: 'Đối đầu Tu Sĩ Thù Địch', desc: 'Ra ngoài làng, bấm ⚔ Đối đầu ở đây để đấu tay đôi với tu sĩ thù địch', target: 1, reward: 100, kind: 'kill', duel: 'Tu Sĩ Thù Địch' }, // GĐ40
  case_soi_du: { name: '🔍 Vụ án: Đàn sói dữ', desc: 'Hạ 12 con Sói Xám (vụ án luân phiên theo ngày)', target: 12, reward: 130, kind: 'kill', laCase: true }, // GĐ40+
  case_doi_pha: { name: '🔍 Vụ án: Bầy dơi phá kho', desc: 'Hạ 12 con Dơi Đen (+25 Tu vi, vụ án luân phiên)', target: 12, reward: 150, kind: 'kill', laCase: true }, // GĐ40+
  case_thach_chan: { name: '🔍 Vụ án: Thạch quái chặn đường', desc: 'Hạ 4 con Thạch Quái (+30 Tu vi, vụ án luân phiên)', target: 4, reward: 200, kind: 'kill', laCase: true }, // GĐ40+
  case_batcoc: { name: '🔍 Vụ án: Dân làng mất tích', desc: 'Ra ngoài làng bấm ⚔ Đối đầu để cứu dân làng bị bắt cóc (vụ án luân phiên)', target: 1, reward: 180, kind: 'kill', laCase: true, duel: 'Kẻ Bắt Cóc' }, // GĐ40+
  case_trom: { name: '🔍 Vụ án: Kẻ trộm trong làng', desc: 'Trò chuyện với dân làng lấy 3 manh mối, rồi chỉ đích danh thủ phạm chỗ Trưởng Làng (vụ án luân phiên)', target: 3, reward: 150, kind: 'clues', laCase: true }, // GĐ40+
  q_benhla1: { name: 'Bệnh lạ ở bãi dơi (1/2)', desc: 'Hạ 8 con Dơi Đen để chặn nguồn bệnh lạ', target: 8, reward: 60, kind: 'kill', npcId: 'npc_dan' }, // GĐ40
  q_benhla2: { name: 'Bệnh lạ ở bãi dơi (2/2)', desc: 'Mang 2 Hồi Xuân Đan cho Chủ Tiệm Đan cứu người bệnh (+30 Tu vi)', target: 2, reward: 120, kind: 'item', itemId: 'dan_hoi_xuan', npcId: 'npc_dan' }, // GĐ40
};
// GĐ24: ánh xạ phía client cho thiện cảm
const NPC_NAME_CLIENT: Record<string, string> = {
  npc_truonglang: 'Trưởng Làng',
  npc_dan: 'Chủ Tiệm Đan',
  npc_nguyenlieu: 'Chủ Tiệm Nguyên Liệu',
  npc_sugia: 'Sứ Giả Tông Môn',
  npc_thuongnhan: 'Thương Nhân Lưu Động', // GĐ40
};
const SHOP_NPC_CLIENT: Record<string, string> = { tiem_dan: 'npc_dan', tiem_nguyen_lieu: 'npc_nguyenlieu', luu_dong: 'npc_thuongnhan' }; // GĐ40
// Các điểm tương tác phím E (điểm đầu tiên là cửa Đạo Quán có từ GĐ7)
const INTERACTS: Array<{ type: string; x: number; y: number; shopId?: string }> = [
  { type: 'daoquan', x: 700, y: 378 },
  { type: 'tulinh', x: 700, y: 196 }, // GĐ23: Tụ Linh Trận (Thiền Phòng sau Đạo Quán) — bế quan
  { type: 'board', x: 800, y: 668 },
  { type: 'bangvang', x: 856, y: 668 }, // GĐ40+: Bảng Vàng + Bảng Truy Nã
  { type: 'elder', x: 387, y: 541 },
  { type: 'shop', shopId: 'tiem_dan', x: 1012, y: 541 },
  { type: 'shop', shopId: 'tiem_nguyen_lieu', x: 392, y: 373 },
  { type: 'shop', shopId: 'tuu_lau', x: 525, y: 841 }, // GĐ78: Tửu Lâu — cửa Quán Ăn (phía nam nhà)
  { type: 'sugia', x: 762, y: 470 }, // GĐ30: Sứ Giả Tông Môn ở quảng trường
  { type: 'bicanh_in', x: 1470, y: 600 }, // GĐ57: cổng vào Bí Cảnh Thạch Lâm (sân Thanh Phong Môn)
  { type: 'bicanh_out', x: 1832, y: 600 }, // GĐ57: cổng trở về trong bí cảnh
  { type: 'laibuan', x: 1005, y: 545 }, // GĐ60: Lái Buôn — nhận việc hộ tống thương nhân
];

// GĐ59: hình cho các loài GDD mới — mượn khung sẵn có + nhuộm màu + tỉ lệ
// (loài cũ wolf/bat/golem/kiemma/huyetlang/khoiloi giữ hình riêng như trước)
const GDD_MONSTER_VISUAL: Record<string, { base: 'wolf' | 'bat' | 'golem' | 'rival'; tint: number; scale: number }> = {
  doc_xa: { base: 'wolf', tint: 0x7fae5a, scale: 0.8 },
  lam_tru: { base: 'golem', tint: 0xa9814f, scale: 0.9 },
  cot_binh: { base: 'rival', tint: 0xd8d4c4, scale: 1 },
  thuy_trieu_tinh: { base: 'bat', tint: 0x7fd1e8, scale: 1.05 },
  huyen_anh_mieu: { base: 'wolf', tint: 0xa678d8, scale: 0.85 },
  loi_dieu: { base: 'bat', tint: 0xf2d24b, scale: 1.25 },
  dia_hanh_yeu: { base: 'golem', tint: 0xd8b878, scale: 1.15 },
  huyen_diep: { base: 'bat', tint: 0xb678f0, scale: 1.3 },
  kim_giap_te: { base: 'golem', tint: 0xf0c84b, scale: 1.35 },
  dan_ma: { base: 'rival', tint: 0xd84f4f, scale: 1.15 },
  hap_huyet_quy: { base: 'rival', tint: 0x8e2f3f, scale: 1.05 },
  bang_tinh_cu_nhan: { base: 'golem', tint: 0xbfe6f5, scale: 1.6 },
  diem_hoa_phuong: { base: 'bat', tint: 0xf08a3c, scale: 1.5 },
  thien_loi_thu: { base: 'wolf', tint: 0x9a86f0, scale: 1.4 },
  hon_don_thu: { base: 'golem', tint: 0x6a5aa8, scale: 1.7 },
};

// GĐ59: một đích trong danh sách Trận Dịch Chuyển (server gửi qua travel_info)
// GĐ60: dữ liệu panel Bản đồ thế giới (server trả qua overview_data)
interface OverviewData {
  current: {
    mapId: string; name: string; theme: string; w: number; h: number;
    portal: { x: number; y: number };
    hazards: Array<{ x: number; y: number; r: number }>;
    features: { volcano: { x: number; y: number; r: number } | null; caves: Array<{ x: number; y: number }> } | null;
    decor: Array<{ k: string; x: number; y: number; s: number }>;
    monsters: Array<{ name: string; count: number }>;
    npcs?: Array<{ x: number; y: number; name: string }>;
    zones?: Array<{ x: number; y: number; w: number; h: number; label: string }>;
  };
  maps: Array<{
    id: string; name: string; category: string; safe: boolean; minRealm: string; minTier: number;
    theme: string; boatOnly: boolean; canEnter: boolean; needText: string; cost: number; reachable: boolean;
    monsters: Array<{ name: string; count: number }>;
  }>;
}

interface TravelDest {
  id: string;
  name: string;
  category: string;
  safe: boolean;
  canEnter: boolean;
  needText: string;
  cost?: number; // GĐ60: Linh thạch cho Trận Dịch Chuyển
  boatOnly?: boolean; // GĐ60: đảo biển — chỉ thuyền / ngự kiếm
  flySec?: number; // GĐ60: giây ngự kiếm (chỉ Kim Đan)
  boatSec?: number; // GĐ60: giây đi thuyền
}

interface PlayerState {
  id: string;
  x: number;
  y: number;
  direction: Direction;
  name: string;
  classId: string;
  realm: string;
  tier: number;
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  robe: string | null; // GĐ10: màu áo tùy chỉnh (null = mặc định theo lớp)
  gender: string;
  weaponId: string | null; // GĐ11
  rest?: string | null; // GĐ21: 'meditate' | 'sleep' khi nhân vật đang nghỉ offline
  companion?: number; // GĐ22: 1 = đồng môn AI (không phải người chơi thật)
  bequan?: number; // GĐ23: 1 = đang bế quan tại Tụ Linh Trận
  learning?: number; // GĐ31-sửa: 1 = đang ngồi lĩnh ngộ công pháp
  meditating?: number; // GĐ76: 1 = đang ngồi thiền (online)
  food?: number; // GĐ78: thức ăn 0–100
  water?: number; // GĐ78: nước uống 0–100
}

// GĐ32: một dòng trong danh mục công pháp (panel 📖 Công pháp)
interface CatalogEntry {
  id: string;
  name: string;
  tier: string;
  coef: number;
  cdMs: number;
  cost: number;
  range: number;
  element: string;
  weaponId?: string; // GĐ68: để vẽ icon chiêu theo vũ khí
  condText: string;
  condMet: boolean;
  desc?: string;
  fxText?: string;
  equipped?: boolean; // GĐ36: đang lắp ô chính
  equippedUtil?: boolean; // GĐ37: đang lắp ô đa dụng
  utility?: boolean; // GĐ37: chiêu hỗ trợ (lắp được ô đa dụng)
  learned: boolean;
  isLearning: boolean;
}

// GĐ10: tóm tắt nhân vật trong danh sách chọn nhân vật của tài khoản
interface CharSummary {
  charId: string;
  name: string;
  classId: string;
  className: string;
  realm: string;
  tier: number;
  linhCanMain: string | null;
  robe: string | null;
  gender: string;
  weaponId: string | null;
  weaponName: string | null;
}

// GĐ10: bảng màu áo người chơi tự chọn (khớp ROBE_CHOICES phía server)
// GĐ11: đổi sang tông NHẠT pastel (bảng cũ bị chê quá chói)
const ROBE_COLORS = ['#e8a0a0', '#eebd93', '#a3d9a5', '#a5c8e8', '#c3aee0', '#e8b4d0', '#e8e2d0', '#a8b0bc'];

// GĐ11: vũ khí khởi đầu theo hướng tu — khớp WEAPONS phía server (đúng 2 bảng
// vũ khí của file thiết kế). speed: nhanh/trung/cham; ranged: đánh xa.
interface WeaponDef {
  id: string;
  name: string;
  cat: string;
  speed: 'nhanh' | 'trung' | 'cham';
  dmg: string;
  mana: string;
  ranged: boolean;
  note: string;
}
const WEAPONS_BY_CLASS: Record<string, WeaponDef[]> = {
  thetu: [
    { id: 'taykhong', name: 'Tay không', cat: 'fist', speed: 'nhanh', dmg: 'Thấp', mana: 'Ít', ranged: false, note: 'Đánh liên hoàn, hợp diệt quái nhỏ' },
    { id: 'chienphu', name: 'Chiến phủ', cat: 'axe', speed: 'cham', dmg: 'Cao', mana: 'Ít', ranged: false, note: 'Quét vòng, hợp đập quái lớn' },
    { id: 'cukiem', name: 'Cự kiếm', cat: 'sword', speed: 'cham', dmg: 'Cao', mana: 'Ít', ranged: false, note: 'Quét vòng, hợp đập quái lớn' },
    { id: 'daothe', name: 'Đao', cat: 'sword', speed: 'cham', dmg: 'Cao', mana: 'Ít', ranged: false, note: 'Quét vòng, hợp đập quái lớn' },
    { id: 'thuongthe', name: 'Thương', cat: 'spear', speed: 'trung', dmg: 'Trung bình', mana: 'Ít', ranged: false, note: 'Đâm thẳng, tầm đánh dài' },
    { id: 'thietcon', name: 'Thiết côn', cat: 'staff', speed: 'trung', dmg: 'Trung bình', mana: 'Ít', ranged: false, note: 'Tầm đánh dài hơn tay không' },
  ],
  phattu: [
    { id: 'phatchau', name: 'Phật châu', cat: 'beads', speed: 'nhanh', dmg: 'Thấp', mana: 'Ít', ranged: true, note: 'Phối hợp đánh và thủ, có thể đánh xa' },
    { id: 'quyentruong', name: 'Quyền trượng', cat: 'staff', speed: 'cham', dmg: 'Cao', mana: 'Ít', ranged: true, note: 'Đánh chậm, có thể đánh xa' },
    { id: 'binhbat', name: 'Bình bát', cat: 'bowl', speed: 'trung', dmg: 'Thấp', mana: 'Ít', ranged: true, note: 'Ném ra đánh xa rồi thu về' },
  ],
  cottu: [
    { id: 'cotthuan', name: 'Cốt thuẫn', cat: 'shield', speed: 'cham', dmg: 'Thấp', mana: 'Ít', ranged: false, note: 'Khiên xương, đỡ đòn và đẩy lùi quái' },
    { id: 'cotchuy', name: 'Cốt chùy', cat: 'club', speed: 'trung', dmg: 'Trung bình', mana: 'Ít', ranged: false, note: 'Chùy xương, vừa đỡ vừa đánh' },
  ],
  quytu: [
    { id: 'colenh', name: 'Cờ lệnh', cat: 'flag', speed: 'trung', dmg: 'Trung bình', mana: 'Trung bình', ranged: true, note: 'Gọi quỷ hồn đánh thay' },
    { id: 'luoihai', name: 'Lưỡi hái', cat: 'sickle', speed: 'cham', dmg: 'Cao', mana: 'Ít', ranged: false, note: 'Chém quét vòng cung' },
    { id: 'quythuong', name: 'Quỷ thương', cat: 'spear', speed: 'trung', dmg: 'Trung bình', mana: 'Ít', ranged: false, note: 'Vũ khí dài, đâm xa cận chiến' },
  ],
  satthu: [
    { id: 'daogam', name: 'Dao găm', cat: 'dagger', speed: 'nhanh', dmg: 'Thấp', mana: 'Ít', ranged: false, note: 'Độ chính xác cao' },
    { id: 'songdao', name: 'Song đao', cat: 'dual', speed: 'nhanh', dmg: 'Thấp', mana: 'Ít', ranged: false, note: 'Đánh liên tục' },
    { id: 'liemngan', name: 'Liềm ngắn', cat: 'sickle', speed: 'trung', dmg: 'Thấp', mana: 'Ít', ranged: false, note: 'Móc kéo kẻ địch lại gần' },
    { id: 'trao', name: 'Trảo', cat: 'claw', speed: 'nhanh', dmg: 'Thấp', mana: 'Ít', ranged: false, note: 'Móng vuốt, đánh liên tục' },
  ],
  kiemtu: [
    { id: 'kiem', name: 'Kiếm', cat: 'sword', speed: 'trung', dmg: 'Cao', mana: 'Trung bình', ranged: false, note: 'Mạnh, nhanh, nhưng khó luyện' },
    { id: 'songkiem', name: 'Song kiếm', cat: 'dual', speed: 'nhanh', dmg: 'Thấp', mana: 'Ít', ranged: false, note: 'Cận chiến linh hoạt' },
    { id: 'trongkiem', name: 'Trọng kiếm', cat: 'sword', speed: 'cham', dmg: 'Cao', mana: 'Trung bình', ranged: false, note: 'Chém nặng, hắt lùi' },
  ],
  phaptu: [
    { id: 'phien', name: 'Phiến', cat: 'fan', speed: 'nhanh', dmg: 'Thấp', mana: 'Ít', ranged: true, note: 'Niệm nhanh, đánh liên tục' },
    { id: 'phaptruong', name: 'Pháp trượng', cat: 'staff', speed: 'cham', dmg: 'Cao', mana: 'Trung bình', ranged: true, note: 'Niệm lâu nhưng đau' },
    { id: 'sachphep', name: 'Sách phép', cat: 'book', speed: 'nhanh', dmg: 'Cao', mana: 'Nhiều', ranged: true, note: 'Mạnh nhất nhưng cạn linh lực nhanh' },
  ],
  ytu: [
    { id: 'phattran', name: 'Phất trần', cat: 'fan', speed: 'trung', dmg: 'Thấp', mana: 'Ít', ranged: true, note: 'Buff, debuff, hồi máu, khống chế' },
    { id: 'kimcham', name: 'Kim châm', cat: 'needle', speed: 'nhanh', dmg: 'Thấp', mana: 'Ít', ranged: true, note: 'Tầm xa, chính xác, gây debuff' },
    { id: 'cocam', name: 'Cổ cầm', cat: 'lute', speed: 'cham', dmg: 'Thấp', mana: 'Trung bình', ranged: true, note: 'Gảy đàn tạo vùng hồi máu, buff' },
  ],
  nhotu: [
    { id: 'ngamtho', name: 'Ngâm thơ', cat: '', speed: 'nhanh', dmg: 'Thấp', mana: 'Trung bình', ranged: true, note: 'Đọc thơ, chữ phép tạo vùng ảnh hưởng' },
    { id: 'butphep', name: 'Bút phép', cat: 'brush', speed: 'nhanh', dmg: 'Thấp', mana: 'Trung bình', ranged: true, note: 'Viết chữ phép tầm xa' },
    { id: 'quyentruc', name: 'Quyển trục', cat: 'scroll', speed: 'cham', dmg: 'Thấp', mana: 'Trung bình', ranged: true, note: 'Mở quyển tạo vùng ảnh hưởng lớn' },
  ],
};
const SPEED_LABEL: Record<string, string> = { nhanh: 'Nhanh', trung: 'Trung bình', cham: 'Chậm' };
function weaponById(classId: string, weaponId: string | null): WeaponDef | null {
  const list = WEAPONS_BY_CLASS[classId] || [];
  return list.find((w) => w.id === weaponId) || list[0] || null;
}

// Tick delta (tối ưu băng thông A+B): entity mới → đủ trường; entity cũ → chỉ
// trường thay đổi; biến mất → nằm trong mảng *Gone. Bản đầu tiên có full: true.
interface TickPayload {
  v?: number;
  full?: boolean;
  players?: Array<Partial<PlayerState> & { id: string }>;
  playersGone?: string[];
  monsters?: Array<Partial<MonsterState> & { id: string }>;
  monstersGone?: string[];
  npcs?: NpcState[];
  drops?: Array<Partial<DropState> & { id: string }>;
  chests?: Array<Partial<ChestState> & { id: string }>; // GĐ39
  chestsGone?: string[];
  dropsGone?: string[];
  world?: WorldClockData; // GĐ20: chỉ kèm khi giờ đổi (hoặc bản FULL)
}

interface MonsterState {
  id: string;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  direction: Direction;
  // GĐ19: trùm thử thách đột phá
  kind?: string;
  name?: string | null;
  trial?: string | null;
  ownerId?: string | null;
  st?: string | null; // GĐ34: trạng thái khống chế (stun/root/slow/dot) để nhuộm màu quái
  hidden?: number; // GĐ60: quái phục kích đang ẩn nấp (1 = đang ẩn)
  boss?: number; // GĐ61: trùm / quái thử thách → hiện thanh máu trùm giữa trên
}

interface Actor {
  container: Phaser.GameObjects.Container;
  sprite: Phaser.GameObjects.Sprite;
  barFg: Phaser.GameObjects.Rectangle;
  label: Phaser.GameObjects.Text; // GĐ21: nhãn tên (thêm 🧘/💤 khi nghỉ offline)
  nameText: string;
  restShown: string | null;
  dir: Direction;
  // GĐ9: hoạt ảnh từ texture nướng sẵn
  styleKey: string;
  curTex: string;
  walkPhase: number;
  castUntil: number;
  lastX: number;
  lastY: number;
  spriteSet: string | null; // GĐ13/14: bộ sprite pixel thật (hero/elder/shopdan/...) hoặc null = bản vẽ code
  // GĐ16: lớp phủ vũ khí cầm tay
  weaponImg: Phaser.GameObjects.Image | null;
  weaponImg2: Phaser.GameObjects.Image | null;
  weaponId: string | null;
  classId: string;
  wpnBehind: boolean;
}

// GĐ13: sprite nhân vật pixel thật do người chơi cung cấp (PixelLab export,
// đã chuẩn hoá về khổ 96×96, chân ở y=94). GĐ14: thêm các bộ biến thể suy ra
// từ bộ gốc bằng thay bảng màu (assets/style/gen_variants.py): Trưởng Làng
// tóc/râu bạc áo chàm, 2 chủ tiệm, 3 dân làng — NPC và bot dùng các bộ này.
const HERO_DIRS: Record<string, string> = { down: 'south', up: 'north', left: 'west', right: 'east' };
const HERO_SCALE = 0.84; // nhân vật ~68px gốc → ~57px trên màn hình, ngang bản vẽ cũ
const HERO_ORIGIN_Y = 94 / 96;
const SPRITE_SETS = [
  'hero', 'elder', 'shopdan', 'shopnl', 'villager-a', 'villager-b', 'villager-c',
  'envoy', 'merchant', 'rival', // GĐ42: Sứ Giả / Thương Nhân / Tu Sĩ Thù Địch — hết dùng hình vẽ code cũ
  // GĐ16: bộ theo từng lớp (màu áo đặc trưng của lớp)
  'cls-thetu', 'cls-phattu', 'cls-cottu', 'cls-satthu', 'cls-kiemtu', 'cls-phaptu', 'cls-quytu', 'cls-ytu', 'cls-nhotu',
];
// GĐ16: vũ khí pixel vẽ riêng từng loại (client/public/sprites/weapons/<id>.png),
// cầm trên tay nhân vật dưới dạng lớp phủ — vung/đâm/nâng theo nhóm cơ chế.
const WEAPON_IDS = [
  'chienphu', 'cukiem', 'daothe', 'thuongthe', 'thietcon',
  'phatchau', 'quyentruong', 'binhbat', 'cotthuan', 'cotchuy',
  'colenh', 'luoihai', 'quythuong',
  'daogam', 'songdao', 'liemngan', 'trao',
  'kiem', 'songkiem', 'trongkiem',
  'phien', 'phaptruong', 'sachphep',
  'phattran', 'kimcham', 'cocam',
  'butphep', 'quyentruc',
];
const DUAL_WEAPON_IDS = ['songkiem', 'songdao'];
const WPN_ANCHOR: Record<string, [number, number]> = { down: [10, -23], up: [-10, -23], left: [-12, -21], right: [12, -21] };
const WPN_REST: Record<string, number> = { down: 2.5, up: -0.6, left: -2.5, right: 2.0 };
const WPN_THRUST_ROT: Record<string, number> = { down: 3.0, up: 0.1, left: -1.45, right: 1.45 };
const DIR_VEC: Record<string, [number, number]> = { down: [0, 1], up: [0, -1], left: [-1, 0], right: [1, 0] };
function weaponMotion(cat: string): 'swing' | 'thrust' | 'raise' | 'guard' {
  if (cat === 'spear' || cat === 'dagger' || cat === 'needle') return 'thrust';
  if (cat === 'shield') return 'guard';
  if (cat === 'sword' || cat === 'axe' || cat === 'club' || cat === 'sickle' || cat === 'fan' || cat === 'claw') return 'swing';
  return 'raise'; // staff, beads, bowl, flag, book, scroll, brush, lute...
}
const NPC_SPRITE_SET: Record<string, string> = {
  npc_truonglang: 'elder',
  npc_dan: 'shopdan',
  npc_nguyenlieu: 'shopnl',
  npc_sugia: 'envoy', // GĐ42
  npc_thuongnhan: 'merchant', // GĐ42
};
const BOT_SPRITE_SETS = ['villager-a', 'villager-b', 'villager-c'];
function spriteTexKey(set: string, dir: string, frame: string): string {
  const hd = HERO_DIRS[dir] || 'south';
  if (frame === 'idle') return `${set}-idle-${hd}`;
  if (frame === 'cast') return `${set}-walk-${hd}-1`; // chưa có khung tung chiêu riêng → dùng khung bước
  return `${set}-walk-${hd}-${frame.slice(1)}`; // w0..w3
}

// ---- Tạo nhân vật (GĐ6): 9 lớp + nhãn 7 chỉ số, khớp server ----
// GĐ11: bỏ nhãn "Vật công / Pháp công" — ô hướng tu chỉ hiện TÊN + LOẠI VŨ KHÍ
// của hướng đó (vũ khí lấy từ WEAPONS_BY_CLASS bên dưới).
const CLASS_LIST: Array<{ id: string; name: string }> = [
  { id: 'thetu', name: 'Thể tu' },
  { id: 'phattu', name: 'Phật tu' },
  { id: 'cottu', name: 'Cốt tu' },
  { id: 'satthu', name: 'Sát thủ' },
  { id: 'kiemtu', name: 'Kiếm tu' },
  { id: 'phaptu', name: 'Pháp tu' },
  { id: 'quytu', name: 'Quỷ tu' },
  { id: 'ytu', name: 'Y tu' },
  { id: 'nhotu', name: 'Nho tu' },
];
const STAT_LABELS: Array<[keyof StatsData, string]> = [
  ['khiHuyet', 'Khí huyết'],
  ['vatCong', 'Vật công'],
  ['vatPhong', 'Vật phòng'],
  ['phapCong', 'Pháp công'],
  ['phapPhong', 'Pháp phòng'],
  ['tocDo', 'Tốc độ'],
  ['thanThuc', 'Thần thức'],
];

// Gà/vịt ambient phía client (thuần hiển thị như bản cũ)
interface BirdSim {
  img: Phaser.GameObjects.Image;
  kind: 'chicken' | 'duck';
  ci: number;
  x: number; y: number; hx: number; hy: number;
  face: 1 | -1;
  state: 'idle' | 'walk' | 'peck';
  t: number;
  tx: number; ty: number;
  walkPhase: number;
  curTex: string;
}

interface MonsterActor {
  hiddenShown?: boolean; // GĐ60: trạng thái ẩn của quái phục kích đang hiển thị
  container: Phaser.GameObjects.Container;
  sprite: Phaser.GameObjects.Image;
  barFg: Phaser.GameObjects.Rectangle;
  dir: Direction;
  trial?: string | null; // GĐ19: loại thử thách (trung/dai) nếu là trùm thử thách
  rivalSet?: boolean; // GĐ42: tu sĩ thù địch dùng bộ sprite 'rival' (thay hình vẽ code cũ)
  kind?: string; // GĐ38: loài quái (wolf/bat/golem) để chọn hình + hoạt ảnh
  base?: string; // GĐ59: họ hình dùng cho hoạt ảnh ('wolf' | 'bat' | 'golem' | 'rival')
  tintN?: number | null; // GĐ59: màu nhuộm cố định của loài GDD (khôi phục sau nháy trúng đòn)
  stShown?: string | null; // GĐ34: trạng thái khống chế đang hiển thị
  // GĐ9: hoạt ảnh sói từ texture nướng sẵn
  face: 1 | -1;
  curTex: string;
  walkPhase: number;
  lastX: number;
  lastY: number;
  lastHp: number;
  flashUntil: number;
  lungeUntil: number;
  nextLunge: number;
}

// GĐ24: dữ liệu hộp thoại trò chuyện với NPC (server gửi)
interface SectWindowInfo {
  id: string; name: string; open: boolean; windowText: string; needText: string;
  canJoin: boolean; missing: string[]; trialPassed?: boolean;
}
// GĐ54: một công pháp trong danh sách tông môn (server tính sẵn điều kiện đã giảm)
interface SectSkillData {
  id: string; name: string; coef: number; cdMs: number; cost: number;
  fxText: string; desc: string; condText: string; sectCondText: string;
  learned: boolean; isLearning: boolean; canLearn: boolean; missingText: string;
  sectSkill?: boolean; // GĐ80: chiêu tông riêng (không phải danh sách Trúc Cơ chung)
}
interface SectInfoData {
  merit: number; boardQuests: number; letter: boolean;
  sect: string | null; sectName: string | null;
  skills: SectSkillData[] | null; // GĐ54: null khi chưa có tông môn
  clock: { day: number; month: number; year: number };
  thienkiem: SectWindowInfo; huyenthien: SectWindowInfo;
  sectSkills?: boolean; // GĐ80: tông mới → skills là công pháp riêng
  list?: Array<{ id: string; name: string; size: string; sizeText: string; homeCity: string; homeCityName: string; needText: string; open: boolean; canJoin: boolean; missing: string[] }>; // GĐ79: 30 tông mới
}
interface NpcDialogData {
  npcId: string;
  name: string;
  personality: string;
  shopId: string | null;
  affinity: number;
  gained: number;
  text: string;
  personalQuest: {
    questId: string; name: string; desc: string; target: number; rewardStones: number;
    state: string; progress: number; ready: boolean;
  } | null;
  personalQuests?: Array<{
    questId: string; name: string; desc: string; target: number; rewardStones: number;
    state: string; progress: number; ready: boolean;
  }>; // GĐ40: NPC có thể có nhiều nhiệm vụ (chuỗi vụ án)
  claimable: Array<{ questId: string; name: string; rewardStones: number }>;
  sectInfo: SectInfoData | null; // GĐ30: chỉ có khi nói chuyện với Sứ Giả Tông Môn
  realmInfo?: { dir: 'enter' | 'exit'; member: boolean; canEnter: boolean; sectName: string | null; missingText: string } | null; // GĐ57: cổng bí cảnh
  escortInfo?: { active: { dest: string; destName: string } | null; missions: Array<{ id: string; name: string; category: string; reward: { stones: number; tuVi: number } }> } | null; // GĐ60: việc hộ tống của Lái Buôn
  accuse?: Array<{ npcId: string; name: string }> | null; // GĐ40+: chỉ đích danh thủ phạm
  merchantInfo?: {
    stock: Array<{ itemId: string; price: number; qty: number }>;
    catalog: Array<{ itemId: string; orderPrice: number }>;
    hint: string;
    order: { itemId: string } | null;
  } | null; // GĐ40+
}

class GameScene extends Phaser.Scene {
  private socket!: Socket;
  private actors = new Map<string, Actor>();
  private targets = new Map<string, { x: number; y: number }>();
  private monsterActors = new Map<string, MonsterActor>();
  private monsterTargets = new Map<string, { x: number; y: number }>();
  private myId = '';
  private myContainer: Phaser.GameObjects.Container | null = null;
  private myChar: CharacterData | null = null;
  private lastMyHp: number | null = null;
  private uiBound = false;
  private selectedClass = 'kiemtu';
  private currentRoll: StatsData | null = null;
  private skillCdEnds = new Map<string, number>(); // "main:0"/"util:0" -> thời điểm hết hồi (ms) (GĐ37)
  private dodgeCdEnd = 0; // GĐ46: mốc hết hồi Né (khớp DODGE_CD_MS phía server)
  private moonSheens: Phaser.GameObjects.Image[] = []; // GĐ52: vệt sáng trăng (data 'base'; 'pond' = mặt nước)

  private lastFailToastAt = 0;
  private lastHintCheck = 0;
  // GĐ17: điều khiển cảm ứng + HUD phụ (banner/minimap/avatar)
  private touchVec = { x: 0, y: 0 };
  // GĐ66: nút ⚔ kiêm nút tương tác (E) trên cảm ứng + id thuốc nhanh
  private touchInteract = false;
  private quickPotionId: string | null = null;
  private lastHudExtra = 0;
  private avatarKey = '';
  // GĐ8: NPC + đồ rơi + panel đang mở
  private birds: BirdSim[] = [];
  // GĐ59: trạng thái bản đồ hiện tại + vật thể chỉ thuộc map nhà (để ẩn khi đi map khác)
  private mapState: MapEnterData | null = null;
  private mapBg: Phaser.GameObjects.Image | null = null;
  private builtMap: BuiltMap | null = null; // GĐ60: cảnh của map hiện tại (lưới ô + decor)
  private spotObjects: Phaser.GameObjects.GameObject[] = []; // GĐ76: dấu điểm linh mạch
  private altarObjects: Phaser.GameObjects.GameObject[] = []; // GĐ85: dấu đàn tế
  private myMeditating = false; // GĐ76: mình có đang ngồi thiền không (từ tick)
  private lastCombatLocal = 0; // GĐ76: ước lượng giao tranh phía client (để hiện nút thiền)
  private prevOwnHp = -1; // GĐ76: phát hiện bị đánh qua tick
  private bossShown: { id: string; name: string; hp: number; maxHp: number; dist: number; at: number } | null = null; // GĐ61
  private journeyUntil = 0; // GĐ60: mốc hết hành trình ngự kiếm/thuyền (đếm ngược hiển thị)
  private journeyText = '';
  private homeObjects: Phaser.GameObjects.GameObject[] = [];
  // Trạng thái thế giới đầy đủ phía client — gộp từ các tick delta (A+B)
  private worldPlayers = new Map<string, PlayerState>();
  private worldMonsters = new Map<string, MonsterState>();
  private worldDrops = new Map<string, DropState>();
  private worldChests = new Map<string, ChestState>(); // GĐ39
  private chestActors = new Map<string, Phaser.GameObjects.Container>(); // GĐ39
  private worldNpcs: NpcState[] = [];
  private npcActors = new Map<string, Phaser.GameObjects.Container>();
  private dropActors = new Map<string, Phaser.GameObjects.Container>();
  private openPanel: 'shop' | 'quest' | 'inv' | 'job' | 'ach' | 'learn' | 'bangvang' | 'stones' | 'altar' | null = null;
  private currentShop = '';
  private lastMerchantInfo: NpcDialogData['merchantInfo'] = null; // GĐ40+
  private questMode: 'board' | 'elder' = 'board';
  private formTrig!: Phaser.GameObjects.Image;
  private formStar!: Phaser.GameObjects.Image;
  private hud!: Phaser.GameObjects.Text;
  private toast!: Phaser.GameObjects.Text;
  private keys!: Record<'W' | 'A' | 'S' | 'D' | 'UP' | 'DOWN' | 'LEFT' | 'RIGHT', Phaser.Input.Keyboard.Key>;
  private lastSent = { vx: 0, vy: 0 };
  // GĐ10: luồng vào game — màn hình chờ / tài khoản / tùy chỉnh
  private guestToken = '';
  private session = '';
  private accountName = '';
  private pendingMode: 'session' | 'guest' | null = null; // hello sẽ gửi khi socket nối xong
  // GĐ56: phiên hello gần nhất + nhân vật đang chơi — khi socket nối LẠI
  // (rớt mạng, chuyển WiFi/4G, server chập chờn) client tự hello lại và
  // tự chọn lại đúng nhân vật cũ, không phải tải lại trang.
  private helloPayload: { session: string } | { token: string } | null = null;
  private activeCharId: string | null = null; // charId nhân vật (tài khoản) đang chơi
  private wantsRejoin = false; // vừa rớt kết nối GIỮA LÚC đang trong game
  private inGame = false;
  private authMode: 'login' | 'register' = 'login';
  private selGender = 'nam';
  private selRobe: string | null = null;
  private selWeapon = 'kiem'; // GĐ11: vũ khí khởi đầu đang chọn (mặc định = vũ khí đầu của Kiếm tu)
  private selPath = 'solo'; // GĐ22: con đường khởi đầu — 'solo' | 'sect'
  private heroImg: HTMLImageElement | null = null; // GĐ13: ảnh sprite thật cho xem trước
  private heroImgReady = false;
  private clsImgs = new Map<string, HTMLImageElement>(); // GĐ16: ảnh thân theo lớp cho xem trước
  private wpnImgs = new Map<string, HTMLImageElement>(); // GĐ16: ảnh vũ khí cho xem trước
  private charListCache: CharSummary[] = [];
  private loadPct = 0;

  constructor() {
    super('game');
  }

  // GĐ13/14: nạp các bộ sprite pixel thật (client/public/sprites/<bộ>/)
  preload(): void {
    for (const set of SPRITE_SETS) {
      for (const hd of ['south', 'north', 'east', 'west']) {
        this.load.image(`${set}-idle-${hd}`, `/sprites/${set}/idle-${hd}.png`);
        for (let i = 0; i < 4; i++) {
          this.load.image(`${set}-walk-${hd}-${i}`, `/sprites/${set}/walk-${hd}-${i}.png`);
        }
      }
    }
    // GĐ16: vũ khí pixel từng loại
    for (const wid of WEAPON_IDS) {
      this.load.image(`wpn-${wid}`, `/sprites/weapons/${wid}.png`);
    }
    // GĐ72: nhà làng PixelLab (nhà nhỏ dùng sprite, nhà lớn giữ vẽ code)
    this.load.image('house-village-01', '/sprites/house_village_01.png');
    // GĐ73: Đạo Quán + cây làng PixelLab
    this.load.image('dao-quan-01', '/sprites/dao_quan_01.png');
    this.load.image('tree-village-01', '/sprites/tree_village_01.png');
  }

  create(): void {
    // ---------- Thế giới GĐ9: nền/nhà/cây/vòng trận/bảng nướng từ đồ họa bản cũ ----------
    bakeWorldTextures(this);
    const WG = WORLD_GEO;
    // GĐ28: texture môi trường nướng 2× → hiển thị scale 0.5 (texel 1px, nét như sprite)
    this.homeObjects.push(this.add.image(0, 0, 'world-bg').setOrigin(0, 0).setScale(0.5).setDepth(-100));
    this.homeObjects.push(this.add.image(1600, 0, 'realm-bg').setOrigin(0, 0).setScale(0.5).setDepth(-100)); // GĐ57: nền dải rừng + bí cảnh
    WG.houses.forEach((h, i) => {
      // GĐ73: Đạo Quán nướng canvas riêng nên padX riêng — điều kiện
      // phải khớp y hệt bên bake (kẻo load lỗi là lệch vị trí).
      const dqPadX = h.name === 'Đạo Quán' && this.textures.exists('dao-quan-01') ? DAOQUAN_TEX.padX : HOUSE_TEX.padX;
      this.homeObjects.push(
        this.add
          .image(h.x - dqPadX, h.y - HOUSE_TEX.padY, 'house-' + i)
          .setOrigin(0, 0)
          .setScale(0.5)
          .setDepth(h.y + h.h),
      );
    });
    WG.trees.forEach((t, i) => {
      this.homeObjects.push(
        this.add
          .image(t[0], t[1] + 12, 'tree-' + i)
          .setOrigin(TREE_TEX.originX, TREE_TEX.originY)
          .setScale(0.5)
          .setDepth(t[1] + 12),
      );
    });
    // Vòng trận pháp Bát Quái: lớp quẻ xoay thuận + sao Ngũ Hành xoay ngược
    this.formTrig = this.add.image(WG.plaza.x, WG.plaza.y, 'form-trigram').setDepth(-97);
    this.formStar = this.add.image(WG.plaza.x, WG.plaza.y, 'form-star').setDepth(-97);
    this.homeObjects.push(this.formTrig, this.formStar);
    // Hạt linh khí bốc lên từ vòng trận (như bản cũ)
    for (let i = 0; i < 10; i++) {
      const ang = Math.random() * Math.PI * 2;
      const rad = 16 + Math.random() * 46;
      const px = WG.plaza.x + Math.cos(ang) * rad;
      const py = WG.plaza.y + Math.sin(ang) * rad;
      const dot = this.add.circle(px, py, 1.6 + Math.random() * 1.4, 0x7fe3d0, 0.75).setDepth(-96);
      this.homeObjects.push(dot);
      this.tweens.add({
        targets: dot,
        y: py - 42 - Math.random() * 26,
        alpha: 0,
        duration: 2400 + Math.random() * 1400,
        delay: Math.random() * 2600,
        repeat: -1,
        ease: 'Sine.InOut',
      });
    }
    // Bảng treo thưởng (GĐ8): nhận nhiệm vụ, cạnh quảng trường
    this.homeObjects.push(this.add.image(740, 606, 'board').setOrigin(0, 0).setScale(0.5).setDepth(660));
    const boardLbl = this.add
      .text(800, 612, 'Bảng Treo Thưởng', {
        fontFamily: 'Palatino, Georgia, serif',
        fontSize: '12px',
        color: '#ffe9a8',
        backgroundColor: 'rgba(20,30,20,0.55)',
        padding: { x: 6, y: 3 },
      })
      .setOrigin(0.5, 1)
      .setDepth(668);
    this.homeObjects.push(boardLbl);

    // Camera: giới hạn trong bản đồ, bám theo nhân vật khi spawn
    this.cameras.main.setBounds(0, 0, WORLD_W, WORLD_H);
    this.cameras.main.setBackgroundColor('#1c2b1e');

    // GĐ9: nướng toàn bộ texture nhân vật từ lớp đồ họa bản cũ (gfx.ts)
    bakePersonTextures(this);
    bakeMonsterTextures(this);
    bakeDropTextures(this);
    bakeChestTextures(this); // GĐ39
    bakeBirdTextures(this);
    bakeFxTextures(this);
    // Gà đi dạo quanh sân nhà, vịt quanh bờ ao sen — thuần hiển thị phía client
    const birdHomes: Array<{ kind: 'chicken' | 'duck'; x: number; y: number }> = [
      { kind: 'chicken', x: 500, y: 420 }, { kind: 'chicken', x: 880, y: 470 },
      { kind: 'chicken', x: 520, y: 690 }, { kind: 'chicken', x: 1050, y: 660 },
      { kind: 'chicken', x: 640, y: 235 }, { kind: 'chicken', x: 420, y: 860 },
      { kind: 'duck', x: 900, y: 848 }, { kind: 'duck', x: 1082, y: 862 }, { kind: 'duck', x: 985, y: 836 },
    ];
    birdHomes.forEach((h, i) => {
      const ci = h.kind === 'chicken' ? i % 3 : 0;
      const key = birdTexKey(h.kind, ci, 1, 'idle');
      const img = this.add.image(h.x, h.y, key).setOrigin(0.5, 0.74).setScale(BIRD_TEX.scale).setDepth(h.y);
      this.birds.push({
        img, kind: h.kind, ci, x: h.x, y: h.y, hx: h.x, hy: h.y,
        face: 1, state: 'idle', t: 1 + i * 0.6, tx: h.x, ty: h.y,
        walkPhase: i * 1.3, curTex: key,
      });
    });

    // HUD + thông báo tiêu diệt — cố định theo màn hình (không trôi theo camera)
    // GĐ49: vị trí tính theo kích thước khung hình THẬT (EXPAND mở rộng
    // bề ngang theo màn hình) + tự căn lại khi xoay/thay đổi kích thước.
    this.hud = this.add
      .text(this.scale.width / 2, this.scale.height - 88, 'Đang kết nối tới server…', {
        fontFamily: 'Palatino, Georgia, serif',
        fontSize: '12px',
        color: '#cfe3d4',
      })
      .setOrigin(0.5, 1)
      .setScrollFactor(0)
      .setDepth(10000);
    this.toast = this.add
      .text(this.scale.width / 2, 44, '', {
        fontFamily: 'Palatino, Georgia, serif',
        fontSize: '16px',
        color: '#ffd94d',
      })
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(10001)
      .setAlpha(0);
    this.scale.on('resize', (gameSize: Phaser.Structs.Size) => {
      if (this.hud) this.hud.setPosition(gameSize.width / 2, gameSize.height - 88);
      if (this.toast) this.toast.setX(gameSize.width / 2);
    });

    // ---- GĐ52: ánh sáng tự nhiên của ánh trăng ----
    // Đêm không còn nguồn sáng nhân tạo (đèn đã gỡ quầng ở GĐ51b): các
    // khoảng trống (quảng trường, sân tông môn, bãi farm, góc thạch quái)
    // hứng một lớp sáng trăng bạc RẤT nhẹ, blend thường (không ADD để
    // khỏi chói), độ sáng theo pha trăng 29 ngày; mặt ao lấp lánh hơn.
    {
      const ct = this.textures.createCanvas('moonGlow', 256, 256);
      if (ct) {
        const g = ct.getContext();
        const grad = g.createRadialGradient(128, 128, 0, 128, 128, 128);
        grad.addColorStop(0, 'rgba(255,255,255,0.85)');
        grad.addColorStop(0.4, 'rgba(255,255,255,0.38)');
        grad.addColorStop(0.75, 'rgba(255,255,255,0.12)');
        grad.addColorStop(1, 'rgba(255,255,255,0)');
        g.fillStyle = grad;
        g.fillRect(0, 0, 256, 256);
        ct.refresh();
      }
      const sheen = (x: number, y: number, w: number, h: number, base: number, tint: number, pond = false) => {
        const s = this.add
          .image(x, y, 'moonGlow')
          .setDisplaySize(w, h)
          .setTint(tint)
          .setDepth(6)
          .setAlpha(0)
          .setData('base', base);
        if (pond) s.setData('pond', 1);
        this.moonSheens.push(s);
      };
      sheen(700, 560, 880, 620, 0.085, 0xaecbf5); // quảng trường + quảng trường phụ
      sheen(1385, 530, 500, 370, 0.075, 0xaecbf5); // sân Thanh Phong Môn
      sheen(250, 950, 580, 400, 0.07, 0xaecbf5); // bãi farm sói (tây nam)
      sheen(1330, 215, 540, 350, 0.07, 0xaecbf5); // góc thạch quái (đông bắc)
      sheen(990, 890, 165, 100, 0.13, 0xdceaff, true); // ánh trăng trên mặt ao
    }

    // GĐ59: TRẬN DỊCH CHUYỂN ở mép đông quảng trường làng (1080,600) — cổng đi các bản đồ khác
    {
      const stone = this.add.image(1080, 600, 'moonGlow').setScale(0.55).setAlpha(0.5).setTint(0x57c98b).setDepth(598);
      this.tweens.add({ targets: stone, alpha: 0.28, scale: 0.44, duration: 1300, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
      const stoneLbl = this.add
        .text(1080, 570, 'Trận Dịch Chuyển', {
          fontFamily: 'Palatino, Georgia, serif', fontSize: '12px', color: '#a9e8c9',
          backgroundColor: 'rgba(20,30,20,0.55)', padding: { x: 6, y: 3 },
        })
        .setOrigin(0.5, 1)
        .setDepth(601);
      this.homeObjects.push(stone, stoneLbl);
    }

    // ---- Bàn phím: WASD + mũi tên + SPACE tấn công ----
    const kb = this.input.keyboard;
    if (kb) {
      this.keys = kb.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT') as typeof this.keys;
      // KHÔNG capture SPACE: để gõ được tên có dấu cách trong ô nhập liệu
      kb.addCapture(['W', 'A', 'S', 'D', 'UP', 'DOWN', 'LEFT', 'RIGHT']);
      // GĐ46: Space = NÉ (khớp bản chơi đơn người chơi đã chốt); đánh thường = phím J hoặc bấm nút ⚔
      kb.on('keydown-SPACE', () => this.doDodge());
      kb.on('keydown-J', () => this.doAttack());
      kb.on('keydown-M', () => this.toggleMeditate()); // GĐ76: ngồi thiền / đứng dậy
      // GĐ7: phím 1/2/3 tung công pháp theo ô; GĐ8: E tương tác theo điểm gần nhất, I mở túi đồ
      kb.on('keydown-ONE', () => this.castSlot(0));
      kb.on('keydown-TWO', () => this.castSlot(1));
      kb.on('keydown-THREE', () => this.castSlot(2));
      kb.on('keydown-FOUR', () => this.castSlot(3));
      kb.on('keydown-FIVE', () => this.castSlot(4));
      kb.on('keydown-SIX', () => this.castSlot(0, 'util'));
      kb.on('keydown-SEVEN', () => this.castSlot(1, 'util'));
      kb.on('keydown-EIGHT', () => this.castSlot(2, 'util'));
      kb.on('keydown-NINE', () => this.castSlot(3, 'util'));
      kb.on('keydown-I', () => this.toggleInv());
      // GĐ10: Esc mở/đóng menu trong game
      kb.on('keydown-ESC', () => this.toggleGameMenu());
      kb.on('keydown-E', () => this.doInteract());
    }

    // GĐ17: dùng chung cho phím + nút cảm ứng
    this.setupTouchUI();

    // Nút đóng/mở các panel (GĐ8)
    const wire = (id: string, fn: () => void) => {
      const el = document.getElementById(id);
      if (el) el.onclick = fn;
    };
    wire('altarClose', () => this.closePanels()); // GĐ85
    wire('shopClose', () => this.closePanels());
    wire('questClose', () => this.closePanels());
    wire('boardClose', () => this.closePanels()); // GĐ40+
    wire('invClose', () => this.closePanels());
    wire('stonesClose', () => this.closePanels());
    wire('invBtn', () => this.toggleInv());

    // ---- Kết nối Socket.io tới Backend ----
    this.socket = SERVER_URL ? io(SERVER_URL) : io();
    // Tay cầm gỡ lỗi/kiểm chứng tự động (server vẫn là chuẩn, không ảnh hưởng luật chơi)
    (window as unknown as { tttSocket?: Socket }).tttSocket = this.socket;

    // GĐ10: định danh có 2 lớp — token trình duyệt (chơi nhanh/khách) và
    // phiên đăng nhập tài khoản (session). Mở game KHÔNG vào thẳng nữa:
    // hiện màn hình chờ trước, người chơi chọn đăng nhập / chơi nhanh.
    try {
      this.guestToken = window.localStorage.getItem('ttt_token_v1') || '';
      if (!this.guestToken) {
        this.guestToken = 'tok-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
        window.localStorage.setItem('ttt_token_v1', this.guestToken);
      }
      this.session = window.localStorage.getItem('ttt_session_v1') || '';
    } catch {
      this.guestToken = 'tok-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
    }
    this.setupSplashUI();
    this.setLoadProgress(55, 'Đang kết nối tới server…');
    // Có sẵn phiên đăng nhập → khôi phục thẳng tới danh sách nhân vật
    if (this.session) this.pendingMode = 'session';

    this.socket.on('connect', () => {
      this.myId = this.socket.id ?? '';
      this.lastSent = { vx: 0, vy: 0 };
      this.setLoadProgress(100, 'Đã kết nối — sẵn sàng!');
      // GĐ56: nối LẠI sau khi rớt → hello lại bằng phiên cũ để vào thẳng
      // game. Trước đây pendingMode bị xóa sau lần nối đầu nên hello không
      // bao giờ được gửi lại — đây là gốc của lỗi "chơi chút là đứng
      // disconnect, phải tải lại trang" bạn bè báo ở buổi test 23/10.
      if (this.helloPayload) {
        this.socket.emit('hello', this.helloPayload);
      } else if (this.pendingMode === 'session' && this.session) {
        this.helloPayload = { session: this.session };
        this.socket.emit('hello', this.helloPayload);
      } else if (this.pendingMode === 'guest') {
        this.helloPayload = { token: this.guestToken };
        this.socket.emit('hello', this.helloPayload);
      }
      this.pendingMode = null;
    });

    // Chưa có nhân vật → hiện màn hình tạo nhân vật + tự bốc chỉ số lượt đầu
    this.socket.on('need_character', () => {
      this.showCreateScreen();
    });

    // ---- GĐ10: sự kiện tài khoản / danh sách nhân vật ----
    this.socket.on('auth_result', (r: { session: string; username: string }) => {
      this.session = r.session;
      this.accountName = r.username;
      try {
        window.localStorage.setItem('ttt_session_v1', r.session);
      } catch { /* bỏ qua */ }
      const err = document.getElementById('authErr');
      if (err) err.textContent = '';
    });
    this.socket.on('auth_error', (e: { message: string }) => {
      const authErr = document.getElementById('authErr');
      const charErr = document.getElementById('charErr');
      const authVisible = document.getElementById('authPanel')?.style.display !== 'none';
      if (authVisible && authErr) authErr.textContent = e.message;
      else if (charErr) charErr.textContent = e.message;
    });
    this.socket.on('auth_expired', () => {
      this.session = '';
      this.accountName = '';
      try {
        window.localStorage.removeItem('ttt_session_v1');
      } catch { /* bỏ qua */ }
      this.showSplashPanel('main');
      const err = document.getElementById('authErr');
      if (err) err.textContent = 'Phiên đăng nhập đã hết hạn — vui lòng đăng nhập lại.';
    });
    this.socket.on('char_list', (r: { username: string; maxChars: number; characters: CharSummary[] }) => {
      this.accountName = r.username;
      this.charListCache = r.characters;
      // GĐ56: đang tự vào lại sau khi rớt mạng → chọn lại đúng nhân vật cũ
      // ngay, không dừng ở màn hình chọn nhân vật.
      if (this.wantsRejoin && this.activeCharId && r.characters.some((ch) => ch.charId === this.activeCharId)) {
        this.socket.emit('select_character', { charId: this.activeCharId });
        return;
      }
      this.renderCharList(r.maxChars);
    });

    this.socket.on('roll_result', (r: { stats: StatsData; rollsUsed: number; rollsLeft: number }) => {
      this.currentRoll = r.stats;
      this.renderRollStats(r.stats);
      const btn = document.getElementById('rollBtn') as HTMLButtonElement | null;
      if (btn) {
        btn.disabled = r.rollsLeft <= 0;
        btn.textContent = r.rollsLeft > 0 ? `🎲 Bốc lại (còn ${r.rollsLeft} lượt)` : '🎲 Đã hết lượt bốc';
      }
    });

    this.socket.on('create_error', (e: { message: string }) => {
      const err = document.getElementById('createErr');
      if (err) err.textContent = e.message;
    });

    // Vào thế giới với nhân vật (mới tạo hoặc đã lưu)
    this.socket.on('welcome', (w: { id: string; character: CharacterData }) => {
      this.myId = w.id;
      this.myChar = w.character;
      this.lastMyHp = w.character.hp;
      this.inGame = true;
      this.wantsRejoin = false; // GĐ56: đã vào lại thành công (nếu là lần vào lại)
      (window as unknown as { tttChar?: CharacterData }).tttChar = w.character;
      const scr = document.getElementById('createScreen');
      if (scr) scr.style.display = 'none';
      const splash = document.getElementById('splashScreen');
      if (splash) splash.style.display = 'none';
      const hudChar = document.getElementById('hudChar');
      if (hudChar) hudChar.style.display = 'block';
      document.body.classList.add('ingame'); // GĐ17: hiện banner/minimap/cột nút
      const menuBtn = document.getElementById('menuBtn');
      if (menuBtn) menuBtn.style.display = 'block';
      const invBtn = document.getElementById('invBtn');
      if (invBtn) invBtn.style.display = '';
      if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
      this.renderHudCharStatic();
      this.renderSkillBar();
      // GĐ20: đồng hồ ngay khi vào game. GĐ21: tổng kết quãng nghỉ offline
      if (w.character.world) this.updateWorldClock(w.character.world);
      const rs = w.character.restSummary;
      if (rs && rs.days > 0) {
        const homeName = w.character.homeType === 'tongmon' ? 'Thanh Phong Môn' : 'Đạo Quán';
        if (rs.state === 'meditate') {
          this.showToast(`🧘 Bạn đã tọa thiền ${rs.days} ngày tại ${homeName} — hấp thụ linh khí +${rs.grant} Tu vi (bế quan +3/ngày)`);
        } else if (rs.state === 'sleep') {
          this.showToast(`💤 Bạn đã ngủ ${rs.days} ngày tại ${homeName} — chưa học Tọa Thiền nên không hấp thụ được linh khí. Hãy kiếm Sách Tọa Thiền (rơi từ sói) để học!`);
        } else if (rs.grant > 0) {
          this.showToast(`📅 Thời gian vẫn trôi lúc bạn vắng mặt — nhận +${rs.grant} Tu vi`);
        }
      }
      console.log('[client] Chao mung', w.character.name, '-', w.character.className);
    });

    // GĐ20: ngày mới (server phát lúc 00:00 giờ game)
    this.socket.on('world_day', (d: { day: number; month: number; year: number }) => {
      this.showToast(`🌅 Ngày mới — Ngày ${d.day} Tháng ${d.month} Năm ${d.year} · +1 Tu vi tu luyện`);
    });

    // GĐ21: học Tọa Thiền thành công
    this.socket.on('meditation_learned', () => {
      this.showToast('🧘 Đã học TỌA THIỀN! Từ nay khi thoát game, nhân vật sẽ tự về nơi an toàn ngồi thiền hấp thụ linh khí (+3 Tu vi/ngày).');
    });

    // GĐ31-sửa: trạng thái ngồi lĩnh ngộ (toast chi tiết đã đi theo notice)
    this.socket.on('learning_state', () => { /* HUD tự cập nhật qua char_sync */ });

    // GĐ23: bật/tắt bế quan tại Tụ Linh Trận
    this.socket.on('bequan_state', (d: { on: boolean }) => {
      this.showToast(d.on
        ? '🧘 Bắt đầu BẾ QUAN tại Tụ Linh Trận — hấp thụ linh khí +3 Tu vi/ngày. Di chuyển hoặc ra đòn sẽ dừng bế quan.'
        : 'Đã dừng bế quan.');
    });

    // GĐ25: TỌA HÓA vĩnh viễn (hết thọ + hết ân hạn) → báo + về màn hình chờ
    this.socket.on('character_died', (d: { name: string; message: string }) => {
      this.showToast(`☠ ${d.message}`);
      window.setTimeout(() => {
        this.leaveToSplash();
        window.setTimeout(() => this.showToast(`☠ ${d.message}`), 400);
      }, 1200);
    });
    // GĐ25: ân hạn thọ nguyên bắt đầu / được cứu
    this.socket.on('lifespan_grace', (d: { graceDaysLeft: number | null; lifespanLeft: number }) => {
      if (d.graceDaysLeft !== null && d.graceDaysLeft !== undefined) {
        this.showToast(`⚠ THỌ NGUYÊN ĐÃ TẬN! Ân hạn còn ${d.graceDaysLeft} ngày game — hãy Đột phá (Trung cảnh +5/+10 năm, Đại cảnh +50 năm thọ) để tự cứu trước khi tọa hóa!`);
      }
    });

    // GĐ24: thiện cảm NPC thay đổi + hộp thoại trò chuyện
    this.socket.on('affinity_changed', (d: { npcId: string; name: string; value: number; delta: number }) => {
      this.showToast(`${d.delta > 0 ? '💛' : '💔'} Thiện cảm với ${d.name}: ${d.delta > 0 ? '+' : ''}${d.delta} (hiện ${d.value})`);
    });
    this.socket.on('npc_dialog', (d: NpcDialogData) => this.openNpcDialog(d));
    // GĐ59: server báo vào map (lúc đăng nhập + mỗi lần dịch chuyển)
    this.socket.on('map_enter', (d: MapEnterData) => this.onMapEnter(d));
    this.socket.on('travel_info', (d: { from: string; list: TravelDest[] }) => this.openTravelDialog(d));
    // GĐ85: đàn tế — xem trạng thái / kết quả triệu hồi
    this.socket.on('altar_info', (d: { mapId: string; mapName: string; bossName: string; bossCount: number; live: number; missing: number; cost: number; usedToday: boolean; canSummon: boolean; reason: string }) => this.openAltarPanel(d));
    this.socket.on('altar_result', () => this.closePanels());
    // GĐ60: hành trình ngự kiếm / đi thuyền — thanh tiến trình trên đầu màn hình
    this.socket.on('journey_started', (d: { dest: string; name: string; method: string; seconds: number }) => {
      this.journeyUntil = Date.now() + d.seconds * 1000;
      this.journeyText = d.method === 'boat' ? `⛵ Đang đi thuyền tới ${d.name}` : `🗡 Đang ngự kiếm tới ${d.name}`;
      const bar = document.getElementById('journeyBar');
      if (bar) { bar.style.display = 'block'; bar.textContent = `${this.journeyText}… ${d.seconds}s (di chuyển là hủy)`; }
    });
    this.socket.on('journey_cancelled', () => {
      this.journeyUntil = 0;
      const bar = document.getElementById('journeyBar');
      if (bar) bar.style.display = 'none';
    });
    this.socket.on('overview_data', (d: OverviewData) => this.renderWorldMap(d));
    document.getElementById('minimapWrap')?.addEventListener('click', () => {
      if (this.inGame) this.socket.emit('map_overview');
    });
    // GĐ40+: dữ liệu Bảng Vàng + Truy Nã
    this.socket.on('leaderboard_data', (d: { tuVi: Array<{ name: string; realm: string; tier: number; tuVi: number }>; tuLuyen: Array<{ name: string; totalTuVi: number }>; truyNa: Array<{ name: string; bounty: string; how: string }> }) => this.renderBoardPanel(d));

    // ---- Tu luyện (GĐ7): đồng bộ nhân vật + các sự kiện ----
    this.socket.on('char_sync', (c: CharacterData) => {
      this.myChar = c;
      (window as unknown as { tttChar?: CharacterData }).tttChar = c;
      this.renderHudCharStatic();
      this.renderSkillBar();
      this.refreshPanels();
    });

    // Thông báo chung từ server (mua bán / nhiệm vụ / dùng đồ — GĐ8)
    this.socket.on('notice', (n: { text: string }) => { this.showToast(n.text); this.pushLog(n.text); });
    // GĐ39: báo nội dung rương vừa mở
    this.socket.on('chest_opened', (d: { grade: string; loot: string[] }) => {
      this.showToast(`🎁 Mở rương cấp ${d.grade}: ${d.loot.join(' · ')}`);
      this.pushLog(`🎁 Mở rương cấp ${d.grade}: ${d.loot.join(' · ')}`);
    });

    this.socket.on('linhcan_result', (r: { linhCan: LinhCanData }) => {
      const lc = r.linhCan;
      this.showToast(
        `✦ Linh căn: ${lc.elements.join(' · ')} (${lc.count} hệ, chính: ${lc.main}) — bước vào Luyện Khí tầng 1, nhận 2 công pháp Cơ bản!`,
      );
      this.cameras.main.flash(250, 60, 200, 160);
    });

    this.socket.on('skill_learned', (r: { skill: SkillData; equipped?: boolean; slot?: number }) => {
      this.showToast(r.equipped && r.slot
        ? `📖 Đã học công pháp ${r.skill.name} — lắp ở ô ${r.slot} (phím ${r.slot})`
        : `📖 Đã học công pháp ${r.skill.name} — ô đã đầy, mở panel Công pháp để lắp`);
    });

    this.socket.on('cast_result', (r: { ok: boolean; slot: number; area?: string; reason?: string; cdMs?: number; targetId?: string }) => {
      if (r.ok) {
        this.skillCdEnds.set(`${r.area || 'main'}:${r.slot}`, Date.now() + (r.cdMs || 0));
        const meA = this.actors.get(this.myId);
        if (meA) meA.castUntil = this.time.now + 260; // GĐ9: tư thế tung chiêu
        // GĐ9: viên đạn chiêu bay từ tay mình tới quái trúng đòn (màu = hệ linh căn chính)
        if (r.targetId) this.spawnProjectile(this.myId, r.targetId, this.myChar?.linhCan?.main || 'neutral');
      } else {
        const now = Date.now();
        if (now - this.lastFailToastAt > 1200) {
          this.lastFailToastAt = now;
          if (r.reason === 'mana') this.showToast('Không đủ Chân nguyên!');
          else if (r.reason === 'range') this.showToast('Không có quái trong tầm chiêu');
        }
      }
    });

    // GĐ9: người chơi khác tung chiêu / đánh thường → phát tư thế trên máy mình
    this.socket.on('skill_cast', (r: { id: string; targetId?: string }) => {
      const a = this.actors.get(r.id);
      if (a && r.id !== this.myId) {
        a.castUntil = this.time.now + 260;
        // Đạn của người khác: chưa biết linh căn của họ → màu vàng trung tính
        if (r.targetId) this.spawnProjectile(r.id, r.targetId, 'neutral');
      }
    });
    this.socket.on('player_attacked', (r: { id: string; targetId?: string }) => {
      const a = this.actors.get(r.id);
      if (a && r.id !== this.myId) a.castUntil = this.time.now + 230;
      // GĐ11: đánh thường bằng vũ khí TẦM XA có đạn bay như chiêu
      if (r.targetId) {
        const st = this.worldPlayers.get(r.id);
        const w = st ? weaponById(st.classId, st.weaponId) : null;
        if (w && w.ranged) {
          const elem = r.id === this.myId ? this.myChar?.linhCan?.main || 'neutral' : 'neutral';
          this.spawnProjectile(r.id, r.targetId, elem);
        }
      }
    });

    this.socket.on('no_linhcan_hint', () => {
      const now = Date.now();
      if (now - this.lastFailToastAt > 15000) {
        this.lastFailToastAt = now;
        this.showToast('Chưa có linh căn nên chưa tích được Tu vi — tới Đạo Quán (đứng trước cửa, bấm E) để đo linh căn');
      }
    });

    this.socket.on('breakthrough_ok', (r: { tier: number; realm?: string; gainedPoints: number; type?: string; lifespanGain?: number }) => {
      this.cameras.main.flash(300, 255, 215, 77);
      const realmName = r.realm === 'tc' ? 'Trúc Cơ' : 'Luyện Khí';
      const thoTxt = r.lifespanGain ? ` · +${r.lifespanGain} năm tuổi thọ` : '';
      this.showToast(`✦ ĐỘT PHÁ THÀNH CÔNG → ${realmName} tầng ${r.tier}! Nhận ${r.gainedPoints} điểm đột phá (mỗi điểm +2)${thoTxt}`);
    });

    // GĐ19: đột phá Đại cảnh thất bại — hiện rõ hậu quả
    this.socket.on('breakthrough_fail', (r: { message: string }) => {
      this.showToast(r.message);
    });

    this.socket.on('player_breakthrough', (info: { id: string; name: string; tier: number; realm?: string }) => {
      if (info.id !== this.myId)
        this.showToast(`✦ ${info.name} vừa đột phá lên ${info.realm === 'tc' ? 'Trúc Cơ' : 'Luyện Khí'} tầng ${info.tier}!`);
    });

    this.socket.on('interact_error', (e: { message: string }) => {
      this.showToast(e.message);
    });

    this.socket.on('player_died', (info: { name: string; by: string }) => {
      this.showToast(`☠ ${info.name} đã gục ngã trước ${info.by} và hồi sinh tại làng`);
    });

    this.socket.on('you_died', () => {
      this.cameras.main.flash(350, 160, 20, 20);
      this.showToast('☠ Bạn đã gục ngã! Hồi sinh tại quảng trường làng, máu đầy trở lại');
    });

    // ---- Nhận tick DELTA (v2): gộp vào trạng thái đầy đủ rồi mới đồng bộ ----
    this.socket.on('server_tick', (w: TickPayload) => {
      if (w.world) this.updateWorldClock(w.world); // GĐ20
      const world = this.mergeTick(w);
      (window as unknown as { tttTick?: unknown }).tttTick = world;
      this.syncPlayers(world.players);
      this.updateMeditateBtn(); // GĐ76: nút thiền theo trạng thái giao tranh (10 tick/s)
      this.syncMonsters(world.monsters);
      this.syncNpcs(world.npcs);
      this.syncDrops(world.drops);
      this.syncChests(world.chests);
    });

    // GĐ76: server báo trạng thái thiền (ngồi / bị ngắt) — cập nhật nút ngay
    this.socket.on('meditate_state', (d: { on: boolean }) => {
      this.myMeditating = !!d.on;
      this.updateMeditateBtn();
    });

    // ---- Broadcast tiêu diệt quái ----
    this.socket.on('monster_killed', (info: { monsterId: string; kind: string; by: string; byName?: string }) => {
      const killer = info.by === this.myId ? 'BẠN' : info.byName || (info.by.startsWith('bot-') ? info.by : info.by.slice(0, 6) + '…');
      this.showToast(`⚔ Sói ${info.monsterId} đã bị tiêu diệt bởi ${killer}!`);
    });

    this.socket.on('disconnect', () => {
      if (this.inGame) this.wantsRejoin = true; // GĐ56: rớt GIỮA game → tự vào lại khi nối được
      this.hud.setText('Mất kết nối server — đang thử lại…');
    });

    // Vòng cập nhật hồi chiêu trên thanh công pháp
    this.startSkillCdLoop();
  }

  // Gộp 1 tick delta vào trạng thái đầy đủ (bản full thì xóa làm lại từ đầu)
  private mergeTick(w: TickPayload): { players: PlayerState[]; monsters: MonsterState[]; npcs: NpcState[]; drops: DropState[]; chests: ChestState[] } {
    if (w.full) {
      this.worldPlayers.clear();
      this.worldMonsters.clear();
      this.worldDrops.clear();
      this.worldChests.clear();
      this.worldNpcs = w.npcs || [];
    }
    const mergeInto = <T extends { id: string }>(map: Map<string, T>, list?: Array<Partial<T> & { id: string }>) => {
      for (const e of list || []) {
        const prev = map.get(e.id);
        map.set(e.id, { ...(prev as T), ...(e as T) });
      }
    };
    mergeInto(this.worldPlayers, w.players);
    mergeInto(this.worldMonsters, w.monsters);
    mergeInto(this.worldDrops, w.drops);
    mergeInto(this.worldChests, w.chests);
    for (const id of w.playersGone || []) this.worldPlayers.delete(id);
    for (const id of w.monstersGone || []) this.worldMonsters.delete(id);
    for (const id of w.dropsGone || []) this.worldDrops.delete(id);
    for (const id of w.chestsGone || []) this.worldChests.delete(id);
    if (w.npcs && !w.full) this.worldNpcs = w.npcs;
    return {
      players: Array.from(this.worldPlayers.values()),
      monsters: Array.from(this.worldMonsters.values()),
      npcs: this.worldNpcs,
      drops: Array.from(this.worldDrops.values()),
      chests: Array.from(this.worldChests.values()),
    };
  }

  // ---------------- Đồng bộ người chơi ----------------
  private syncPlayers(players: PlayerState[]): void {
    const seen = new Set<string>();
    let realCount = 0;

    for (const p of players) {
      seen.add(p.id);
      // GĐ76: theo dõi trạng thái thiền + bị đánh của chính mình (cho nút thiền)
      if (p.id === this.myId) {
        this.myMeditating = !!p.meditating;
        if (this.prevOwnHp >= 0 && p.hp < this.prevOwnHp) this.lastCombatLocal = Date.now();
        this.prevOwnHp = p.hp;
      }
      this.targets.set(p.id, { x: p.x, y: p.y });
      const isBot = p.id.startsWith('bot-');
      if (!isBot && !p.rest && !p.companion) realCount++; // GĐ21/22: offline + đồng môn AI không tính "trực tuyến"

      let actor = this.actors.get(p.id);
      if (!actor) {
        actor = this.spawnActor(p, isBot);
        this.actors.set(p.id, actor);
      }
      if (actor.dir !== p.direction) {
        actor.dir = p.direction;
      }
      // GĐ10/11: đổi màu áo / vũ khí giữa game → nạp lại style cho actor
      const wantStyle = this.styleKeyForState(p, p.id.startsWith('bot-'));
      if (wantStyle !== actor.styleKey) {
        actor.styleKey = wantStyle;
        actor.curTex = '';
      }
      // GĐ16: đồng bộ vũ khí cầm tay
      if (actor.weaponId !== p.weaponId) this.setActorWeapon(actor, p.weaponId);
      // GĐ21: nhãn trạng thái nghỉ offline (🧘 thiền / 💤 ngủ) + hơi mờ thân
      // GĐ23: đang bế quan (online) cũng mang nhãn 🧘 · GĐ31-sửa: lĩnh ngộ 📖
      // GĐ76: đang ngồi thiền (online) cũng mang nhãn 🧘
      const restNow = p.meditating ? 'meditating' : (p.rest ?? (p.bequan ? 'bequan' : p.learning ? 'learning' : null));
      if (actor.restShown !== restNow) {
        actor.restShown = restNow;
        actor.label.setText(
          restNow === 'sleep'
            ? `${actor.nameText} 💤`
            : restNow === 'learning' || restNow === 'learn'
              ? `${actor.nameText} 📖`
              : restNow
                ? `${actor.nameText} 🧘`
                : actor.nameText,
        );
        actor.container.setAlpha(p.rest ? 0.88 : isBot ? 0.9 : 1);
      }
      // Thanh máu nhỏ trên đầu mọi người chơi
      const frac = Math.max(0, p.hp) / Math.max(1, p.maxHp);
      actor.barFg.width = 32 * frac;
      actor.barFg.fillColor = frac > 0.5 ? 0x53d769 : frac > 0.25 ? 0xf5a524 : 0xe5484d;

      if (p.id === this.myId) {
        // Mất máu → nháy đỏ nhẹ để biết đang bị quái cắn
        if (this.lastMyHp !== null && p.hp < this.lastMyHp) {
          this.cameras.main.flash(90, 140, 10, 10);
        }
        this.lastMyHp = p.hp;
        this.updateHudBars(p);
      }
    }

    for (const id of Array.from(this.actors.keys())) {
      if (!seen.has(id)) {
        this.actors.get(id)?.container.destroy();
        this.actors.delete(id);
        this.targets.delete(id);
      }
    }

    this.hud.setText(`Người chơi trực tuyến: ${realCount}`);
  }

  // GĐ11: style hiển thị của 1 người chơi = lớp + màu áo + giới tính + VŨ KHÍ
  private styleKeyForState(p: PlayerState, isBot: boolean): string {
    if (isBot) return personStyleKeyForPlayer(p.id, p.classId, true);
    const w = weaponById(p.classId, p.weaponId);
    return ensurePersonVariant(this, p.classId, {
      robe: p.robe,
      gender: p.gender,
      weaponCat: w ? w.cat : undefined,
      weaponName: w ? w.name : undefined,
    });
  }

  private spawnActor(p: PlayerState, isBot: boolean): Actor {
    const isMe = p.id === this.myId;
    const styleKey = this.styleKeyForState(p, isBot);
    // GĐ13/14/16: người chơi thật dùng bộ sprite THEO LỚP (cls-<lớp>), thiếu
    // thì lùi về bộ hero; bot dân làng dùng các bộ biến thể villager-*.
    let spriteSet: string | null = null;
    if (!isBot) {
      const clsSet = `cls-${p.classId}`;
      if (this.textures.exists(`${clsSet}-idle-south`)) spriteSet = clsSet;
      else if (this.textures.exists('hero-idle-south')) spriteSet = 'hero';
    } else if (isBot) {
      const idx = Number(p.id.replace('bot-', '')) || 0;
      const cand = BOT_SPRITE_SETS[Math.abs(idx) % BOT_SPRITE_SETS.length];
      if (this.textures.exists(`${cand}-idle-south`)) spriteSet = cand;
    }

    const sprite = spriteSet
      ? this.add
          .sprite(0, 0, spriteTexKey(spriteSet, p.direction, 'idle'))
          .setOrigin(0.5, HERO_ORIGIN_Y)
          .setScale(HERO_SCALE)
      : this.add
          .sprite(0, 0, personTexKey(styleKey, p.direction, 'idle'))
          .setOrigin(PERSON_TEX.originX, PERSON_TEX.originY)
          .setScale(PERSON_TEX.scale);

    // Nhãn = TÊN NHÂN VẬT (GĐ6) thay cho ID rút gọn
    const label = this.add
      .text(0, -66, p.name || p.id, {
        fontFamily: 'Palatino, Georgia, serif',
        fontSize: '11px',
        color: isMe ? '#ffd94d' : '#d7e8dd',
      })
      .setOrigin(0.5, 1);

    // Thanh máu trên đầu
    const barBg = this.add.rectangle(0, -54, 34, 5, 0x101418).setAlpha(0.55);
    const barFg = this.add.rectangle(-16, -54, 32, 3, 0x53d769).setOrigin(0, 0.5);

    // GĐ16: lớp phủ vũ khí — chỉ cho người chơi thật dùng sprite (bản vẽ code
    // đã có vũ khí trong hình; bot/NPC không cầm vũ khí)
    let weaponImg: Phaser.GameObjects.Image | null = null;
    let weaponImg2: Phaser.GameObjects.Image | null = null;
    if (spriteSet && !isBot) {
      weaponImg = this.add.image(0, 0, '__MISSING').setOrigin(0.5, 66 / 80).setScale(0.9).setVisible(false);
      weaponImg2 = this.add.image(0, 0, '__MISSING').setOrigin(0.5, 66 / 80).setScale(0.9).setVisible(false);
      weaponImg2.setFlipX(true);
    }

    const parts: Phaser.GameObjects.GameObject[] = [];
    if (isMe) {
      const ring = this.add.ellipse(0, 2, 34, 11);
      ring.setStrokeStyle(2, 0xffffff, 0.55);
      parts.push(ring);
    }
    parts.push(sprite);
    if (weaponImg) parts.push(weaponImg);
    if (weaponImg2) parts.push(weaponImg2);
    parts.push(barBg, barFg, label);

    const container = this.add.container(p.x, p.y, parts);
    container.setDepth(p.y);
    if (isBot) container.setAlpha(0.9);

    if (isMe) {
      this.myContainer = container;
      this.cameras.main.startFollow(container, true, 0.12, 0.12);
    }
    return {
      container,
      sprite,
      barFg,
      label,
      nameText: p.name || p.id,
      restShown: null,
      dir: p.direction,
      styleKey,
      curTex: spriteSet ? spriteTexKey(spriteSet, p.direction, 'idle') : personTexKey(styleKey, p.direction, 'idle'),
      walkPhase: 0,
      castUntil: 0,
      lastX: p.x,
      lastY: p.y,
      spriteSet,
      weaponImg,
      weaponImg2,
      weaponId: null,
      classId: p.classId,
      wpnBehind: false,
    };
  }

  // GĐ16: gán/đổi vũ khí cho actor (ẩn nếu tay không/ngâm thơ/không có hình)
  private setActorWeapon(actor: Actor, weaponId: string | null): void {
    actor.weaponId = weaponId;
    if (!actor.weaponImg) return;
    const show = !!weaponId && WEAPON_IDS.includes(weaponId) && this.textures.exists(`wpn-${weaponId}`);
    actor.weaponImg.setVisible(show);
    if (show) actor.weaponImg.setTexture(`wpn-${weaponId}`);
    const dual = show && DUAL_WEAPON_IDS.includes(weaponId as string);
    if (actor.weaponImg2) {
      actor.weaponImg2.setVisible(dual);
      if (dual) actor.weaponImg2.setTexture(`wpn-${weaponId}`);
    }
  }

  // ---------------- GĐ20: đồng hồ thế giới + chu kỳ sáng/tối ----------------
  private worldState: WorldClockData | null = null;

  private updateWorldClock(w: WorldClockData): void {
    this.worldState = w;
    (window as unknown as { tttWorld?: WorldClockData }).tttWorld = w;
    // GĐ52: pha trăng theo chu kỳ 29 ngày (0 = trăng non, 0.5 = rằm)
    const moonFrac = (w.dayIndex % 29) / 29;
    const moonLight = 0.45 + 0.55 * (0.5 - 0.5 * Math.cos(2 * Math.PI * moonFrac));
    const MOON_ICONS = ['🌑', '🌒', '🌓', '🌔', '🌕', '🌖', '🌗', '🌘'];
    const moonIcon = MOON_ICONS[Math.floor(moonFrac * 8) % 8];
    const el = document.getElementById('hudClock');
    if (el) {
      const hh = String(w.hour).padStart(2, '0');
      const mm = String(w.minute).padStart(2, '0');
      el.textContent = `${w.isNight ? moonIcon : '☀️'} Ngày ${w.day} · Tháng ${w.month} · Năm ${w.year} — Giờ ${w.canh} (${hh}:${mm})`;
    }
    // Độ tối theo phút trong ngày: đêm sâu 0.34 (22:00–04:30), rạng đông/chạng
    // vạng chuyển dần trong ~2 giờ game, ban ngày trong suốt.
    const m = w.minuteOfDay;
    let dark = 0;
    if (m < 270) dark = 0.34;
    else if (m < 390) dark = 0.34 * (1 - (m - 270) / 120);
    else if (m < 1020) dark = 0;
    else if (m < 1140) dark = 0.34 * ((m - 1020) / 120);
    else dark = 0.34;
    const ov = document.getElementById('nightOverlay');
    if (ov) ov.style.opacity = dark.toFixed(3);
    // GĐ52: vệt sáng trăng hiện theo độ tối × độ sáng của pha trăng;
    // mặt ao lấp lánh nhẹ theo thời gian
    const nf = dark / 0.34;
    const shimmer = 0.92 + 0.08 * Math.sin(Date.now() / 1100);
    for (const s of this.moonSheens) {
      const a = (s.getData('base') as number) * nf * moonLight * (s.getData('pond') ? shimmer : 1);
      s.setAlpha(a);
      s.setVisible(a > 0.004);
    }
  }

  // ---------------- Giao diện nhân vật (DOM) ----------------
  private showToast(text: string): void {
    this.toast.setText(text);
    this.tweens.killTweensOf(this.toast);
    this.toast.setAlpha(1);
    this.tweens.add({ targets: this.toast, alpha: 0, duration: 2400, ease: 'Power1' });
  }

  // Hiện màn hình tạo nhân vật (ẩn splash) + tự bốc chỉ số lượt đầu
  private showCreateScreen(): void {
    this.setupCreationUI();
    const splash = document.getElementById('splashScreen');
    if (splash) splash.style.display = 'none';
    const scr = document.getElementById('createScreen');
    if (scr) scr.style.display = 'block';
    this.refreshPreview();
    this.socket.emit('request_roll');
  }

  private wpnImg(id: string): HTMLImageElement | null {
    let img = this.wpnImgs.get(id);
    if (!img) {
      img = new Image();
      img.src = `/sprites/weapons/${id}.png`;
      this.wpnImgs.set(id, img);
    }
    return img.complete && img.naturalWidth > 0 ? img : null;
  }

  // GĐ13/16: xem trước nhân vật — thân sprite THEO LỚP + vũ khí cầm tay đúng
  // loại đang chọn; chưa nạp được ảnh thì lùi về bản vẽ code.
  private drawCharPreview(canvas: HTMLCanvasElement, classId: string, robe: string | null, gender: string, weapon: WeaponDef | null): void {
    const bodyImg = this.clsImgs.get(classId) || (this.heroImgReady ? this.heroImg : null);
    if (bodyImg && bodyImg.complete && bodyImg.naturalWidth > 0) {
      const c = canvas.getContext('2d');
      if (!c) return;
      c.clearRect(0, 0, canvas.width, canvas.height);
      c.imageSmoothingEnabled = true;
      const destH = canvas.height * (96 / 76);
      const destW = destH;
      const dx = (canvas.width - destW) / 2;
      const dy = canvas.height * 0.93 - destH * (94 / 96);
      c.drawImage(bodyImg, dx, dy, destW, destH);
      // Vũ khí cầm tay phải, tư thế nghỉ hướng nam như trong game
      if (weapon && WEAPON_IDS.includes(weapon.id)) {
        const wimg = this.wpnImg(weapon.id);
        if (wimg) {
          const k = destH / 96; // px hiển thị / 1 đơn vị sprite
          const s = (68 * k) / 57; // tỉ lệ so với cỡ trong game
          c.save();
          c.translate(dx + destW / 2 + 10 * s, dy + destH * (94 / 96) - 23 * s);
          c.rotate(WPN_REST.down);
          c.scale(0.95 * s, 0.95 * s);
          c.drawImage(wimg, -32, -66);
          c.restore();
          if (DUAL_WEAPON_IDS.includes(weapon.id)) {
            c.save();
            c.translate(dx + destW / 2 - 10 * s, dy + destH * (94 / 96) - 23 * s);
            c.rotate(-WPN_REST.down);
            c.scale(-0.95 * s, 0.95 * s);
            c.drawImage(wimg, -32, -66);
            c.restore();
          }
        }
      }
      return;
    }
    drawPersonPreview(canvas, classId, robe, gender, weapon ? { cat: weapon.cat, name: weapon.name } : null);
  }

  private refreshPreview(): void {
    const canvas = document.getElementById('charPreview') as HTMLCanvasElement | null;
    if (!canvas) return;
    const w = weaponById(this.selectedClass, this.selWeapon);
    this.drawCharPreview(canvas, this.selectedClass, this.selRobe, this.selGender, w);
  }

  // GĐ11: dựng lưới chọn vũ khí theo hướng tu đang chọn
  private renderWeaponGrid(): void {
    const grid = document.getElementById('weaponGrid');
    if (!grid) return;
    grid.innerHTML = '';
    for (const w of WEAPONS_BY_CLASS[this.selectedClass] || []) {
      const el = document.createElement('div');
      el.className = 'cls' + (w.id === this.selWeapon ? ' sel' : '');
      el.innerHTML =
        `${w.name}<small>${SPEED_LABEL[w.speed]} · Đòn ${w.dmg} · Linh lực ${w.mana} · ${w.ranged ? 'Tầm xa' : 'Cận chiến'}<br />${w.note}</small>`;
      el.onclick = () => {
        this.selWeapon = w.id;
        grid.querySelectorAll('.cls').forEach((n) => n.classList.remove('sel'));
        el.classList.add('sel');
        this.refreshPreview();
      };
      grid.appendChild(el);
    }
  }

  // Dựng hàng nút chọn màu áo (gồm ô "mặc định theo lớp") vào 1 container
  private buildRobeSwatches(container: HTMLElement, current: string | null, onPick: (robe: string | null) => void): void {
    container.innerHTML = '';
    const mk = (robe: string | null) => {
      const el = document.createElement('div');
      el.className = 'sw' + (robe === null ? ' def' : '') + (current === robe ? ' sel' : '');
      if (robe !== null) el.style.background = robe;
      else el.textContent = 'Gốc';
      el.title = robe === null ? 'Màu mặc định theo lớp' : 'Màu áo ' + robe;
      el.onclick = () => {
        onPick(robe);
        container.querySelectorAll('.sw').forEach((n) => n.classList.remove('sel'));
        el.classList.add('sel');
      };
      container.appendChild(el);
    };
    mk(null);
    for (const c of ROBE_COLORS) mk(c);
  }

  private setupCreationUI(): void {
    if (this.uiBound) return;
    this.uiBound = true;
    // Gõ phím trong ô tên không được lọt xuống game (di chuyển/tấn công)
    const nameEl = document.getElementById('charName');
    if (nameEl) {
      nameEl.addEventListener('keydown', (e) => e.stopPropagation());
      nameEl.addEventListener('keyup', (e) => e.stopPropagation());
    }
    const grid = document.getElementById('classGrid');
    if (grid) {
      grid.innerHTML = '';
      for (const c of CLASS_LIST) {
        const el = document.createElement('div');
        el.className = 'cls' + (c.id === this.selectedClass ? ' sel' : '');
        const wnames = (WEAPONS_BY_CLASS[c.id] || []).map((w) => w.name).join(' · ');
        el.innerHTML = `${c.name}<small>Vũ khí: ${wnames}</small>`;
        el.onclick = () => {
          this.selectedClass = c.id;
          // Đổi hướng tu → vũ khí chọn lại từ đầu danh sách của hướng mới
          this.selWeapon = (WEAPONS_BY_CLASS[c.id] || [])[0]?.id || '';
          grid.querySelectorAll('.cls').forEach((n) => n.classList.remove('sel'));
          el.classList.add('sel');
          this.renderWeaponGrid();
          this.refreshPreview();
        };
        grid.appendChild(el);
      }
    }
    this.renderWeaponGrid();
    // GĐ10: giới tính + màu áo + xem trước
    const gNam = document.getElementById('genderNam');
    const gNu = document.getElementById('genderNu');
    const setGender = (g: string) => {
      this.selGender = g;
      gNam?.classList.toggle('sel', g === 'nam');
      gNu?.classList.toggle('sel', g === 'nu');
      this.refreshPreview();
    };
    if (gNam) gNam.onclick = () => setGender('nam');
    if (gNu) gNu.onclick = () => setGender('nu');
    const sw = document.getElementById('robeSwatches');
    if (sw) {
      this.buildRobeSwatches(sw, this.selRobe, (robe) => {
        this.selRobe = robe;
        this.refreshPreview();
      });
    }
    // GĐ22: chọn con đường khởi đầu (Một mình / Thanh Phong Môn)
    const pSolo = document.getElementById('pathSolo');
    const pSect = document.getElementById('pathSect');
    const setPath = (p: string) => {
      this.selPath = p;
      pSolo?.classList.toggle('sel', p === 'solo');
      pSect?.classList.toggle('sel', p === 'sect');
    };
    if (pSolo) pSolo.onclick = () => setPath('solo');
    if (pSect) pSect.onclick = () => setPath('sect');
    const back = document.getElementById('createBack');
    if (back) back.onclick = () => this.leaveToSplash();
    const rollBtn = document.getElementById('rollBtn') as HTMLButtonElement | null;
    if (rollBtn) {
      rollBtn.onclick = () => this.socket.emit('request_roll');
    }
    const enterBtn = document.getElementById('enterBtn') as HTMLButtonElement | null;
    if (enterBtn) {
      enterBtn.onclick = () => {
        const nameInput = document.getElementById('charName') as HTMLInputElement | null;
        const name = (nameInput?.value || '').trim();
        const err = document.getElementById('createErr');
        if (name.length < 2) {
          if (err) err.textContent = 'Tên nhân vật cần ít nhất 2 ký tự.';
          return;
        }
        if (err) err.textContent = '';
        this.socket.emit('create_character', {
          token: this.guestToken,
          name,
          classId: this.selectedClass,
          gender: this.selGender,
          robe: this.selRobe,
          weaponId: this.selWeapon,
          path: this.selPath, // GĐ22
        });
      };
    }
  }

  // ---------------- GĐ10: Màn hình chờ / tài khoản / menu ----------------
  private setLoadProgress(pct: number, label: string): void {
    this.loadPct = Math.max(this.loadPct, pct);
    const fill = document.getElementById('loadfill');
    const lab = document.getElementById('loadlabel');
    if (fill) fill.style.width = `${this.loadPct}%`;
    if (lab) lab.textContent = label.replace('…', `… ${this.loadPct}%`).replace('!', ` — ${this.loadPct}%`);
    if (this.loadPct >= 100) {
      const wrap = document.getElementById('loadwrap');
      if (wrap) setTimeout(() => (wrap.style.display = 'none'), 450);
      // Chưa có phiên sẵn → mở panel chính của splash
      if (!this.session && document.getElementById('splashMain')?.style.display === 'none') {
        this.showSplashPanel('main');
      }
    }
  }

  private showSplashPanel(which: 'main' | 'auth' | 'chars' | 'exit'): void {
    const splash = document.getElementById('splashScreen');
    if (splash) splash.style.display = 'flex';
    const map: Record<string, string> = { main: 'splashMain', auth: 'authPanel', chars: 'charPanel', exit: 'exitPanel' };
    for (const [k, id] of Object.entries(map)) {
      const el = document.getElementById(id);
      if (el) el.style.display = k === which ? 'block' : 'none';
    }
  }

  private renderCharList(maxChars: number): void {
    const user = document.getElementById('splashUser');
    if (user) user.textContent = `Xin chào, ${this.accountName} — chọn nhân vật để vào game`;
    const list = document.getElementById('charList');
    if (list) {
      list.innerHTML = '';
      if (this.charListCache.length === 0) {
        list.innerHTML = '<p class="splash-note">Tài khoản chưa có nhân vật nào — tạo nhân vật đầu tiên để bắt đầu tu luyện.</p>';
      }
      for (const c of this.charListCache) {
        const card = document.createElement('div');
        card.className = 'charCard';
        const cv = document.createElement('canvas');
        cv.width = 90;
        cv.height = 96;
        const info = document.createElement('div');
        info.className = 'cinfo';
        const realmTxt = !c.linhCanMain ? 'Phàm nhân' : c.realm === 'kd' ? `Kim Đan tầng ${c.tier}` : c.realm === 'tc' ? `Trúc Cơ tầng ${c.tier}` : `Luyện Khí tầng ${c.tier}`; // GĐ59: gọi đúng cảnh giới (trước đây TC/KD đều hiện Luyện Khí)
        info.innerHTML = `<div class="cname"></div><div class="cmeta">${c.className}${c.weaponName ? ' · ' + c.weaponName : ''} · ${realmTxt}${c.linhCanMain ? ' · Linh căn ' + c.linhCanMain : ''} · ${c.gender === 'nu' ? 'Nữ' : 'Nam'}</div>`;
        (info.querySelector('.cname') as HTMLElement).textContent = c.name;
        const play = document.createElement('button');
        play.className = 'pbtn gold';
        play.type = 'button';
        play.textContent = 'Vào game';
        play.onclick = () => { this.activeCharId = c.charId; this.socket.emit('select_character', { charId: c.charId }); };
        const del = document.createElement('button');
        del.className = 'delBtn';
        del.type = 'button';
        del.textContent = 'Xóa';
        del.onclick = () => {
          if (window.confirm(`Xóa hẳn nhân vật "${c.name}"? Không khôi phục được.`)) {
            this.socket.emit('delete_character', { charId: c.charId });
          }
        };
        card.append(cv, info, play, del);
        list.appendChild(card);
        const cw = weaponById(c.classId, c.weaponId);
        this.drawCharPreview(cv, c.classId, c.robe, c.gender, cw);
      }
    }
    const createBtn = document.getElementById('btnCreateChar');
    if (createBtn) createBtn.style.display = this.charListCache.length < maxChars ? 'block' : 'none';
    this.showSplashPanel('chars');
  }

  private setupSplashUI(): void {
    const byId = <T extends HTMLElement>(id: string) => document.getElementById(id) as T | null;
    // GĐ13: nạp ảnh sprite thật cho khung xem trước
    if (!this.heroImg) {
      const img = new Image();
      img.onload = () => {
        this.heroImgReady = true;
        if (document.getElementById('createScreen')?.style.display === 'block') this.refreshPreview();
      };
      img.src = '/sprites/hero/idle-south.png';
      this.heroImg = img;
    }
    // GĐ16: nạp ảnh thân theo từng lớp cho khung xem trước
    if (this.clsImgs.size === 0) {
      for (const cl of CLASS_LIST) {
        const img = new Image();
        img.onload = () => {
          if (document.getElementById('createScreen')?.style.display === 'block') this.refreshPreview();
        };
        img.src = `/sprites/cls-${cl.id}/idle-south.png`;
        this.clsImgs.set(cl.id, img);
      }
    }
    // Nút túi đồ chỉ hiện khi đã vào game
    const invBtn0 = byId('invBtn');
    if (invBtn0) invBtn0.style.display = 'none';
    // Thanh tải giả lập theo tiến trình dựng thế giới (create chạy trước khi nối socket)
    this.setLoadProgress(30, 'Đang dựng Làng Tân Thủ…');
    const showAuth = (mode: 'login' | 'register') => {
      this.authMode = mode;
      const t = byId('authTitle');
      if (t) t.textContent = mode === 'login' ? 'Đăng nhập' : 'Đăng ký tài khoản mới';
      const s = byId<HTMLButtonElement>('authSubmit');
      if (s) s.textContent = mode === 'login' ? 'Đăng nhập' : 'Đăng ký và vào chọn nhân vật';
      this.showSplashPanel('auth');
      byId<HTMLInputElement>('authUser')?.focus();
    };
    const loginBtn = byId('btnShowLogin');
    if (loginBtn) loginBtn.onclick = () => showAuth('login');
    const regBtn = byId('btnShowRegister');
    if (regBtn) regBtn.onclick = () => showAuth('register');
    const backBtn = byId('authBack');
    if (backBtn) backBtn.onclick = () => this.showSplashPanel('main');
    const submit = () => {
      const username = (byId<HTMLInputElement>('authUser')?.value || '').trim();
      const password = byId<HTMLInputElement>('authPass')?.value || '';
      const err = byId('authErr');
      if (username.length < 3 || password.length < 6) {
        if (err) err.textContent = 'Tên tài khoản cần ≥3 ký tự, mật khẩu ≥6 ký tự.';
        return;
      }
      if (err) err.textContent = '';
      this.ensureConnected(this.session ? 'session' : null);
      this.socket.emit(this.authMode === 'login' ? 'auth_login' : 'auth_register', { username, password });
    };
    const submitBtn = byId('authSubmit');
    if (submitBtn) submitBtn.onclick = submit;
    const passEl = byId<HTMLInputElement>('authPass');
    if (passEl) {
      passEl.addEventListener('keydown', (e) => {
        e.stopPropagation();
        if (e.key === 'Enter') submit();
      });
      passEl.addEventListener('keyup', (e) => e.stopPropagation());
    }
    const userEl = byId<HTMLInputElement>('authUser');
    if (userEl) {
      userEl.addEventListener('keydown', (e) => e.stopPropagation());
      userEl.addEventListener('keyup', (e) => e.stopPropagation());
    }
    const guestBtn = byId('btnGuest');
    if (guestBtn) {
      guestBtn.onclick = () => {
        this.ensureConnected('guest');
        if (this.socket.connected) { this.helloPayload = { token: this.guestToken }; this.socket.emit('hello', this.helloPayload); }
      };
    }
    const exitBtn = byId('btnExit');
    if (exitBtn) exitBtn.onclick = () => this.showSplashPanel('exit');
    const backExit = byId('btnBackFromExit');
    if (backExit) backExit.onclick = () => this.showSplashPanel(this.session ? 'chars' : 'main');
    const createBtn = byId('btnCreateChar');
    if (createBtn) createBtn.onclick = () => this.showCreateScreen();
    const logoutBtn = byId('btnLogout');
    if (logoutBtn) logoutBtn.onclick = () => this.logout();
    // Menu trong game
    const menuBtn = byId('menuBtn');
    const gameMenu = byId('gameMenu');
    if (menuBtn && gameMenu) {
      menuBtn.onclick = () => {
        const open = gameMenu.style.display !== 'block';
        gameMenu.style.display = open ? 'block' : 'none';
        if (open) this.refreshMenuSwatches();
      };
    }
    const menuClose = byId('menuClose');
    if (menuClose && gameMenu) menuClose.onclick = () => (gameMenu.style.display = 'none');
    const menuExit = byId('menuExitBtn');
    if (menuExit) menuExit.onclick = () => this.leaveToSplash();
    const menuLogout = byId('menuLogoutBtn');
    if (menuLogout) menuLogout.onclick = () => this.logout();
  }

  private refreshMenuSwatches(): void {
    const box = document.getElementById('menuRobeSwatches');
    if (!box || !this.myChar) return;
    this.buildRobeSwatches(box, this.myChar.robe, (robe) => {
      this.socket.emit('set_robe', { robe });
    });
  }

  // Đảm bảo socket đang nối; mode quyết định hello gửi ngay khi 'connect' bắn
  private ensureConnected(mode: 'guest' | 'session' | null): void {
    if (mode) this.pendingMode = mode;
    if (!this.socket.connected) this.socket.connect();
  }

  // Dọn sạch hình ảnh thế giới phía client khi rời game về màn hình chờ
  private cleanupWorldView(): void {
    for (const a of this.actors.values()) a.container.destroy();
    this.actors.clear();
    this.targets.clear();
    for (const a of this.monsterActors.values()) a.container.destroy();
    this.monsterActors.clear();
    this.monsterTargets.clear();
    for (const c of this.npcActors.values()) c.destroy();
    this.npcActors.clear();
    for (const c of this.dropActors.values()) c.destroy();
    this.dropActors.clear();
    this.worldPlayers.clear();
    this.worldMonsters.clear();
    this.worldDrops.clear();
    this.worldNpcs = [];
    this.myChar = null;
    this.inGame = false;
    this.myContainer = null;
    this.cameras.main.stopFollow();
    const hide = (id: string) => {
      const el = document.getElementById(id);
      if (el) el.style.display = 'none';
    };
    hide('hudChar');
    hide('skillBar');
    hide('interactHint');
    document.body.classList.remove('ingame'); // GĐ17
    hide('menuBtn');
    hide('gameMenu');
    hide('createScreen');
    this.closePanels();
    const invBtn = document.getElementById('invBtn');
    if (invBtn) invBtn.style.display = 'none';
  }

  // Thoát game → về màn hình chờ (giữ phiên đăng nhập nếu có)
  private leaveToSplash(): void {
    const hadSession = !!this.session;
    if (this.socket.connected) this.socket.disconnect();
    this.cleanupWorldView();
    if (hadSession) {
      // Nối lại để lấy danh sách nhân vật mới nhất
      this.pendingMode = 'session';
      this.socket.connect();
      this.showSplashPanel('chars');
    } else {
      this.showSplashPanel('main');
    }
  }

  private logout(): void {
    if (this.socket.connected) this.socket.emit('auth_logout', { session: this.session });
    this.session = '';
    this.accountName = '';
    try {
      window.localStorage.removeItem('ttt_session_v1');
    } catch { /* bỏ qua */ }
    this.leaveToSplash();
  }

  private renderRollStats(stats: StatsData): void {
    const grid = document.getElementById('statGrid');
    if (grid) {
      grid.innerHTML = STAT_LABELS.map(
        ([k, label]) => `<div>${label}<span class="sv">${stats[k]}</span></div>`,
      ).join('');
    }
    const total = document.getElementById('statTotal');
    if (total) {
      const sum = STAT_LABELS.reduce((a, [k]) => a + stats[k], 0);
      total.textContent = `Tổng chỉ số: ${sum} · HP tối đa ${100 + stats.khiHuyet * 10} · Chân nguyên tối đa ${stats.thanThuc * 10}`;
    }
  }

  // GĐ55: điểm chỉ số CHỌN TRƯỚC trên thẻ nhân vật — cộng/trừ tại chỗ (giữ
  // nút để tăng nhanh), bấm OK mới gửi server qua 'allocate_stats'.
  private statStage: { pool: 'free' | 'stat'; free: Record<string, number>; stat: Record<string, number> } = {
    pool: 'free', free: {}, stat: {},
  };

  // GĐ55: nút +/− đang được GIỮ — nhịp lặp do updateHudBars (theo tick
  // 10 lần/giây) điều khiển, bền hơn setInterval khi máy yếu/đang tải nặng.
  private statHold: { stat: keyof StatsData; dir: number; since: number; btn: HTMLElement } | null = null;

  // GĐ55: vẽ lại riêng phần số của bảng chỉ số — không dựng lại DOM để
  // nhịp giữ nút không đứt.
  private paintStats(): void {
    const c = this.myChar;
    const stats = document.getElementById('hudStats');
    if (!c || !stats) return;
    const st = this.statStage;
    const usedOf = (m: Record<string, number>) => Object.values(m).reduce((a, b) => a + b, 0);
    stats.querySelectorAll<HTMLElement>('[data-srow]').forEach((row) => {
      const k = row.dataset.srow as keyof StatsData;
      const g = (st.free[k] || 0) + (st.stat[k] || 0) * 2;
      const svv = row.querySelector('.svv');
      if (svv) svv.innerHTML = `${c.stats[k]}${g ? ` <b class="staged">+${g}</b>` : ''}`;
    });
    const rf = document.getElementById('remFree');
    if (rf) rf.textContent = String((c.freePoints || 0) - usedOf(st.free));
    const rs = document.getElementById('remStat');
    if (rs) rs.textContent = String((c.statPoints || 0) - usedOf(st.stat));
    const sum = document.getElementById('allocSummary');
    if (sum) {
      const t = usedOf(st.free) + usedOf(st.stat);
      sum.innerHTML = t > 0
        ? `Đang chọn: <b>+${usedOf(st.free) + usedOf(st.stat) * 2}</b> chỉ số (tốn ${usedOf(st.free)} điểm tự do, ${usedOf(st.stat)} điểm đột phá)`
        : 'Chạm + để chọn điểm — GIỮ nút + để tăng nhanh, − để sửa lại';
    }
  }

  private stageStep(stat: keyof StatsData, dir: number): void {
    const c = this.myChar;
    if (!c) return;
    const st = this.statStage;
    const usedF = Object.values(st.free).reduce((a, b) => a + b, 0);
    const usedS = Object.values(st.stat).reduce((a, b) => a + b, 0);
    if (dir > 0) {
      if (st.pool === 'free') { if (usedF < (c.freePoints || 0)) st.free[stat] = (st.free[stat] || 0) + 1; }
      else if (usedS < (c.statPoints || 0)) st.stat[stat] = (st.stat[stat] || 0) + 1;
    } else {
      const other = st.pool === 'free' ? 'stat' : 'free';
      if ((st[st.pool][stat] || 0) > 0) st[st.pool][stat] -= 1;
      else if ((st[other][stat] || 0) > 0) st[other][stat] -= 1;
    }
  }

  private renderHudCharStatic(): void {
    if (!this.myChar) return;
    const c = this.myChar;
    const name = document.getElementById('hudName');
    const cls = document.getElementById('hudClass');
    const realm = document.getElementById('hudRealm');
    const linhCan = document.getElementById('hudLinhCan');
    const stats = document.getElementById('hudStats');
    if (name) name.textContent = c.name;
    if (cls) {
      const base = c.weaponName ? `${c.className} · ${c.weaponName}` : c.className;
      cls.textContent = c.path === 'sect' ? `${base} · 🏯 Thanh Phong Môn` : base;
    }
    if (realm) {
      // GĐ59: thêm Kim Đan (map KD vào được rồi — thẻ phải gọi đúng cảnh giới)
      realm.textContent = !c.linhCan
        ? 'Phàm nhân'
        : c.realm === 'kd'
          ? `Kim Đan tầng ${c.tier}`
          : c.realm === 'tc'
            ? c.tier >= 9
              ? 'Trúc Cơ tầng 9 · Viên mãn'
              : `Trúc Cơ tầng ${c.tier}`
            : c.tier >= 9
              ? 'Luyện Khí tầng 9 · Viên mãn'
              : `Luyện Khí tầng ${c.tier}`;
    }
    if (linhCan) {
      linhCan.textContent = c.linhCan
        ? `Linh căn: ${c.linhCan.elements.join(' · ')} (chính: ${c.linhCan.main})${c.meditation ? ' · 🧘 Đã học Tọa Thiền' : ' · Chưa học Tọa Thiền (kiếm Sách Tọa Thiền — rơi từ sói)'}${c.learning ? ` · 📖 Lĩnh ngộ ${c.learning.name}: ${c.learning.pct}%${c.learning.active ? ' (đang ngồi học)' : ' (thoát game sẽ học tiếp ở nơi an toàn)'}` : ''}`
        : 'Chưa đo linh căn — tới Đạo Quán bấm E';
    }
    // GĐ20: dòng Tuổi + Thọ nguyên (đỏ khi sắp cạn)
    // GĐ25: đang trong ÂN HẠN thì hiện đếm ngược tọa hóa nổi bật
    const age = document.getElementById('hudAge');
    // GĐ66: thẻ thu gọn trên cảm ứng vẫn phải thấy cảnh báo Ân hạn tọa hóa
    document.getElementById('hudChar')?.classList.toggle('grace', c.graceDaysLeft !== null && c.graceDaysLeft !== undefined);
    if (age && typeof c.age === 'number') {
      if (c.graceDaysLeft !== null && c.graceDaysLeft !== undefined) {
        age.innerHTML = `☠ Thọ nguyên ĐÃ TẬN · <span class="warn">ÂN HẠN TỌA HÓA: còn ${c.graceDaysLeft} ngày game</span> — đột phá để tự cứu!`;
      } else {
        const warn = c.lifespanLeft <= 5;
        age.innerHTML = `🎂 Tuổi ${c.age} · Thọ nguyên: <span class="${warn ? 'warn' : ''}">còn ${c.lifespanLeft} năm</span>`;
      }
    }
    // GĐ30: dòng Công trạng + tông môn
    const sectEl = document.getElementById('hudSect');
    if (sectEl) {
      sectEl.textContent = `⚜️ Công trạng: ${c.merit || 0}${c.sectName ? ` · 🏯 Đệ tử ${c.sectName}` : ''}`;
    }
    // GĐ66: dòng 📖 Công pháp trong thẻ BỎ HẲN — thay bằng chấm đỏ có số
    // trên nút Công pháp (số chiêu đủ điều kiện chỉ số, chưa học, chưa
    // đang lĩnh ngộ). Bấm nút Công pháp vẫn mở Sổ công pháp như cũ.
    const lrn = document.getElementById('hudLearn') as HTMLButtonElement | null;
    if (lrn) lrn.style.display = 'none';
    const skillBadge = document.getElementById('skillBadge');
    if (skillBadge) {
      const n = (c.catalog || []).filter((e) => !e.learned && !e.isLearning && e.condMet).length;
      skillBadge.style.display = n > 0 ? 'block' : 'none';
      if (n > 0) skillBadge.textContent = String(n);
    }
    // Thanh Tu vi + nút Đột phá
    const tvFill = document.getElementById('hudTuViFill') as HTMLElement | null;
    const tvText = document.getElementById('hudTuViText');
    const brk = document.getElementById('hudBreak') as HTMLButtonElement | null;
    if (c.tuViNeed !== null) {
      if (tvFill) tvFill.style.width = `${Math.min(100, (c.tuVi / c.tuViNeed) * 100)}%`;
      if (tvText) tvText.textContent = `Tu vi ${c.tuVi} / ${c.tuViNeed}`;
      if (brk) {
        // GĐ19: nút đổi nhãn/hành vi theo loại đột phá (tiểu/trung/đại)
        const bi = c.breakInfo;
        brk.style.display = c.tuVi >= c.tuViNeed ? 'block' : 'none';
        if (bi && bi.type === 'trung') {
          brk.textContent = bi.trialReady ? '✦ Đột phá Trung cảnh ✦' : '⚔ Thử thách: Thử Luyện Thú';
          brk.onclick = () => this.socket.emit(bi.trialReady ? 'breakthrough' : 'start_trial');
        } else if (bi && bi.type === 'dai') {
          brk.textContent = bi.trialReady ? '✦ ĐỘT PHÁ TRÚC CƠ ✦' : '⚔ Thử thách: Tâm Ma Ảnh';
          brk.onclick = () => this.socket.emit(bi.trialReady ? 'breakthrough' : 'start_trial');
        } else {
          brk.textContent = '✦ Đột phá Tiểu cảnh ✦';
          brk.onclick = () => this.socket.emit('breakthrough');
        }
      }
    } else {
      if (tvFill) tvFill.style.width = c.linhCan ? '100%' : '0%';
      if (tvText) tvText.textContent = c.linhCan ? `Tu vi ${c.tuVi} (viên mãn)` : 'Tu vi —';
      if (brk) brk.style.display = 'none';
    }
    // GĐ55: 7 chỉ số + cộng điểm kiểu CHỌN TRƯỚC (feedback buổi test: bấm
    // +1 từng phát rất mỏi tay và trên điện thoại bấm là thẻ thu lại).
    // Nay: chọn bể điểm → bấm +/− hoặc GIỮ nút để tăng nhanh → bấm OK mới
    // áp vào server. Mọi thao tác trong bảng đều chặn lan sự kiện lên thẻ.
    if (stats) {
      const s = c.stats;
      const st = this.statStage;
      const usedOf = (m: Record<string, number>) => Object.values(m).reduce((a, b) => a + b, 0);
      // Kẹp phần đã chọn theo điểm thật (phòng khi điểm đổi từ nguồn khác)
      const trim = (m: Record<string, number>, avail: number) => {
        let used = usedOf(m);
        for (const k of Object.keys(m)) while (used > avail && m[k] > 0) { m[k] -= 1; used -= 1; }
      };
      trim(st.free, c.freePoints || 0);
      trim(st.stat, c.statPoints || 0);
      const stagedGain = () => usedOf(st.free) + usedOf(st.stat) * 2;
      const hasPoints = (c.freePoints || 0) + (c.statPoints || 0) > 0;
      const rows = STAT_LABELS.map(([k, label]) => {
        const g = (st.free[k] || 0) + (st.stat[k] || 0) * 2;
        const ctl = hasPoints
          ? `<span class="sctl"><button class="allocBtn minus" data-adj="-1" data-stat="${k}" title="Giảm (giữ để giảm nhanh)">−</button><button class="allocBtn plus" data-adj="1" data-stat="${k}" title="Tăng (giữ để tăng nhanh)">+</button></span>`
          : '';
        return `<div class="statRow" data-srow="${k}"><span class="sl">${label}</span><span class="svv">${s[k]}${g ? ` <b class="staged">+${g}</b>` : ''}</span>${ctl}</div>`;
      }).join('');
      const summaryHtml = () => {
        const t = usedOf(st.free) + usedOf(st.stat);
        return t > 0
          ? `Đang chọn: <b>+${stagedGain()}</b> chỉ số (tốn ${usedOf(st.free)} điểm tự do, ${usedOf(st.stat)} điểm đột phá)`
          : 'Chạm + để chọn điểm — GIỮ nút + để tăng nhanh, − để sửa lại';
      };
      stats.innerHTML =
        rows +
        (hasPoints
          ? `<div class="poolRow">
               <button class="poolChip ${st.pool === 'free' ? 'on' : ''}" data-poolchip="free">Điểm tự do (+1) · còn <span id="remFree">${(c.freePoints || 0) - usedOf(st.free)}</span></button>
               <button class="poolChip ${st.pool === 'stat' ? 'on' : ''}" data-poolchip="stat">Điểm đột phá (+2) · còn <span id="remStat">${(c.statPoints || 0) - usedOf(st.stat)}</span></button>
             </div>
             <div class="allocBar"><span id="allocSummary">${summaryHtml()}</span>
               <button class="allocReset" id="allocReset">Hoàn lại</button>
               <button class="allocOk" id="allocOk">✔ OK</button>
             </div>`
          : `<div style="margin-top:3px">Điểm tự do: <b>0</b> · Điểm đột phá: <b>0</b></div>`)
        // GĐ74: reset chỉ số bằng Linh thạch (100 LT Hạ phẩm, phí TẠM) —
        // hoàn điểm đã cộng về bể điểm. Server kiểm tra số dư + sổ điểm.
        + `<div style="margin-top:6px;display:flex;gap:6px;align-items:center"><button class="allocReset" id="statResetBtn">↺ Reset chỉ số (100 LT)</button><span style="font-size:11px;color:#a9cbb6">Hoàn điểm đã cộng về bể điểm</span></div>`;
      // GĐ55: bấm +/− = 1 điểm ngay; GIỮ = lặp theo tick qua statHold
      // (updateHudBars điều khiển) — vẽ lại bằng paintStats, không dựng lại DOM.
      stats.querySelectorAll<HTMLButtonElement>('[data-adj]').forEach((b) => {
        const stat = b.dataset.stat as keyof StatsData;
        const dir = Number(b.dataset.adj);
        b.addEventListener('pointerdown', (e) => {
          e.preventDefault();
          e.stopPropagation();
          this.statHold = { stat, dir, since: performance.now(), btn: b };
          this.stageStep(stat, dir);
          this.paintStats();
        });
        const release = () => {
          if (this.statHold?.btn === b) { this.statHold = null; this.renderHudCharStatic(); }
        };
        b.addEventListener('pointerup', release);
        b.addEventListener('pointercancel', release);
        b.addEventListener('click', (e) => { e.stopPropagation(); e.preventDefault(); });
      });
      stats.querySelectorAll<HTMLButtonElement>('[data-poolchip]').forEach((b) => {
        b.addEventListener('click', (e) => {
          e.stopPropagation();
          st.pool = b.dataset.poolchip === 'stat' ? 'stat' : 'free';
          this.renderHudCharStatic();
        });
      });
      const okB = document.getElementById('allocOk') as HTMLButtonElement | null;
      if (okB) okB.addEventListener('click', (e) => {
        e.stopPropagation();
        const nz = (m: Record<string, number>) => Object.fromEntries(Object.entries(m).filter(([, v]) => v > 0));
        this.socket.emit('allocate_stats', { free: nz(st.free), stat: nz(st.stat) });
        st.free = {}; st.stat = {};
        this.renderHudCharStatic();
      });
      const rsB = document.getElementById('allocReset') as HTMLButtonElement | null;
      if (rsB) rsB.addEventListener('click', (e) => {
        e.stopPropagation();
        st.free = {}; st.stat = {};
        this.renderHudCharStatic();
      });
      const srB = document.getElementById('statResetBtn') as HTMLButtonElement | null;
      if (srB) srB.addEventListener('click', (e) => {
        e.stopPropagation();
        this.socket.emit('reset_stats');
      });
    }
    // GĐ42b: nhãn nút "Chỉ số" — hướng mở/đóng + nhắc khi còn điểm chưa cộng
    const dbtn = document.getElementById('hudDetailBtn');
    if (dbtn) {
      const open = document.getElementById('hudChar')?.classList.contains('expanded');
      const pts = (c.freePoints || 0) + (c.statPoints || 0);
      dbtn.textContent = `${open ? '▾' : '▸'} Chỉ số${pts > 0 ? ` · còn ${pts} điểm chưa cộng` : ''}`;
    }
    // GĐ66: trên cảm ứng, dòng Chỉ số trong thẻ ẩn đi (CSS) — thay bằng
    // chấm đỏ có số trên góc avatar; chạm thẻ vẫn mở bảng như cũ (GĐ55).
    const abadge = document.getElementById('hudAvatarBadge');
    if (abadge) {
      const pts = (c.freePoints || 0) + (c.statPoints || 0);
      const show = document.body.classList.contains('touch') && pts > 0;
      abadge.style.display = show ? 'block' : 'none';
      if (show) abadge.textContent = String(pts);
    }
    // GĐ8: ví Linh thạch + dòng theo dõi nhiệm vụ
    // GĐ75: pill chỉ ghi "Linh thạch" + số của phẩm NHIỀU NHẤT, kèm ảnh
    // đá Linh thạch lấy từ bản game đơn cũ (assets/items, đủ 4 phẩm);
    // bằng nhau thì ưu tiên phẩm cao hơn. Bấm pill vẫn mở panel ví.
    const stones = document.getElementById('hudStones');
    if (stones) {
      const grades = [
        { img: '/items/linh_thach_cuc.png', n: c.stonesCuc ?? 0 },
        { img: '/items/linh_thach_thuong.png', n: c.stonesThuong ?? 0 },
        { img: '/items/linh_thach_trung.png', n: c.stonesTrung ?? 0 },
        { img: '/items/linh_thach_ha.png', n: c.stones ?? 0 },
      ];
      let dom = grades[3];
      for (const g of grades) if (g.n > dom.n) dom = g;
      stones.innerHTML = `<img src="${dom.img}" alt=""> Linh thạch: ${dom.n}`;
    }
    if (this.openPanel === 'stones') this.renderStonesPanel();
    const tracker = document.getElementById('questTracker');
    if (tracker) {
      const lines = Object.entries(c.quests || {}).map(([qid, q]) => {
        const info = QUEST_INFO[qid];
        if (!info) return '';
        const st = q.state === 'done' ? ' ✓ Trả tại Bảng/Trưởng Làng' : '';
        return `📜 ${info.name}: ${q.progress}/${info.target}${st}`;
      });
      const itemQ = c.quests?.q_nanhsoi;
      tracker.innerHTML =
        lines.join('<br>') +
        (itemQ && itemQ.progress >= QUEST_INFO.q_nanhsoi.target && itemQ.state === 'active'
          ? '<br>📜 Thu thập Nanh Sói: đủ 3 — về Trưởng Làng trả ✓'
          : '');
    }
  }

  // GĐ83: số ô chính theo cảnh giới — mirror slotCountFor phía server.
  private slotCountForChar(c: { realm: string; tier: number }): number {
    if (c.realm === 'lk') return c.tier >= 7 ? 4 : 3;
    if (c.realm === 'tc') return c.tier >= 7 ? 5 : 4;
    if (c.realm === 'kd' || c.realm === 'na' || c.realm === 'ht') return 5;
    return 3;
  }

  // ---------------- Thanh công pháp (GĐ7) ----------------
  private renderSkillBar(): void {
    const bar = document.getElementById('skillBar');
    if (!bar || !this.myChar) return;
    const skills = this.myChar.skills;
    const utils = this.myChar.utilSkills || [];
    // GĐ44: thanh chiêu LUÔN hiện đủ khung (nút ⚔ + 5 ô chính + 4 ô phụ) —
    // ô chưa có chiêu thì mờ/trống nhưng vẫn thấy số phím, bấm chuột được.
    bar.style.display = 'flex';
    const mainSlots = Array.from({ length: 5 }, (_, i) => {
      const s = skills[i];
      return s
        ? `<div class="slot" data-cast="${i}" title="${s.name} — bấm hoặc phím ${i + 1}"><span class="key">${i + 1}</span><img class="skicon-desk" src="${skillIconURL(s)}" alt=""><div class="cdov" id="cdov${i}"></div><span class="cdnum" id="cdnum${i}"></span></div>`
        : `<div class="slot empty" title="Ô chiêu ${i + 1} — chưa lắp công pháp (phím ${i + 1})"><span class="key">${i + 1}</span></div>`;
    }).join('');
    const utilSlots = Array.from({ length: 4 }, (_, i) => {
      const s = utils[i];
      return s
        ? `<div class="slot util" data-ucast="${i}" title="${s.name} — bấm hoặc phím ${i + 6}"><span class="key">Đ${i + 1}</span><img class="skicon-desk" src="${skillIconURL(s)}" alt=""><div class="cdov" id="cduov${i}"></div><span class="cdnum" id="cdunum${i}"></span></div>`
        : `<div class="slot util empty" title="Ô đa dụng ${i + 1} — chưa lắp (phím ${i + 6})"><span class="key">Đ${i + 1}</span></div>`;
    }).join('');
    bar.innerHTML =
      `<div class="slot atk" id="atkSlot" title="Đánh thường — bấm hoặc phím J"><div class="sname">⚔</div><span class="scost">J</span></div>` +
      `<div class="slot dodge" id="dodgeSlot" title="Né — bấm hoặc phím Space"><div class="sname">💨</div><span class="scost">Space</span><div class="cdov" id="dodgeCdov"></div></div>` +
      mainSlots +
      utilSlots;
    bar.querySelectorAll<HTMLDivElement>('[data-cast]').forEach((el) => {
      el.onclick = () => this.castSlot(Number(el.dataset.cast), 'main');
    });
    bar.querySelectorAll<HTMLDivElement>('[data-ucast]').forEach((el) => {
      el.onclick = () => this.castSlot(Number(el.dataset.ucast), 'util');
    });
    const atk = document.getElementById('atkSlot');
    if (atk) atk.onclick = () => this.doAttack();
    const dge = document.getElementById('dodgeSlot');
    if (dge) dge.onclick = () => this.doDodge();
    // GĐ83 (theo yêu cầu người chơi — hiện lại nút chiêu): fan cảm ứng
    // hiện đủ SỐ Ô của nhân vật (Phàm/LK 3, LK7+ 4, TC 4, TC7+ 5, KD+ 5
    // — như slotCountFor phía server); ô trống chỉ hiện số phím + mờ,
    // không ghi "Chiêu n" như skill thật. GĐ68: ô có chiêu hiện ICON;
    // tên chiêu giữ trong title.
    const slotCount = this.slotCountForChar(this.myChar);
    for (let i = 0; i < 5; i++) {
      const tb = document.getElementById('tSkill' + i);
      if (!tb) continue;
      if (i >= slotCount) { tb.style.display = 'none'; continue; }
      tb.style.display = 'flex';
      if (skills[i]) {
        tb.innerHTML = `<img class="skicon-touch" src="${skillIconURL(skills[i])}" alt="">`;
        tb.title = skills[i].name;
        tb.classList.remove('empty');
      } else {
        tb.textContent = String(i + 1);
        tb.title = '';
        tb.classList.add('empty');
      }
    }
    // GĐ66: ô ĐA DỤNG LUÔN HIỆN — có chiêu thì tên chiêu, trống thì
    // "Đ1..Đ4" viền đứt (bấm ô trống mở Sổ công pháp để lắp chiêu hỗ trợ).
    for (let i = 0; i < 4; i++) {
      const tb = document.getElementById('tUtil' + i);
      if (!tb) continue;
      if (utils[i]) {
        tb.innerHTML = `<img class="skicon-touch" src="${skillIconURL(utils[i])}" alt="">`;
        tb.title = utils[i].name;
        tb.classList.remove('empty');
      } else {
        tb.textContent = 'Đ' + (i + 1);
        tb.classList.add('empty');
        tb.style.opacity = '';
      }
      tb.style.display = 'flex';
    }
    // GĐ66: nút bình thuốc nhanh (cảm ứng) — GĐ76: chọn theo NHU CẦU:
    // thiếu máu → Hồi Xuân Đan, thiếu chân nguyên → Đan Hồi Nguyên,
    // rồi mới tới vật phẩm dùng được khác; không có gì thì nút mờ.
    const pot = document.getElementById('tPotion');
    if (pot) {
      const inv = this.myChar.inventory || {};
      const maxHp = 100 + (this.myChar.stats?.khiHuyet ?? 0) * 10;
      const maxMp = (this.myChar.stats?.thanThuc ?? 0) * 10;
      const hpNeed = (this.myChar.hp ?? maxHp) < maxHp;
      const mpNeed = (this.myChar.mp ?? maxMp) < maxMp;
      let pick: string | null = null;
      if (hpNeed && (inv['dan_hoi_xuan'] || 0) > 0) pick = 'dan_hoi_xuan';
      else if (mpNeed && (inv['dan_hoi_nguyen'] || 0) > 0) pick = 'dan_hoi_nguyen';
      else pick = ['dan_hoi_xuan', 'dan_hoi_nguyen', 'banh_thit', 'phu_ho_than', 'phu_tu_linh'].find((id) => (inv[id] || 0) > 0) || null;
      this.quickPotionId = pick;
      pot.textContent = pick ? `💊${inv[pick]}` : '💊';
      pot.title = pick ? (ITEM_INFO[pick]?.name || pick) : 'Túi đồ (chưa có thuốc)';
      pot.classList.toggle('empty', !pick);
    }
  }

  private castSlot(slot: number, area: 'main' | 'util' = 'main'): void {
    if (!this.socket?.connected || !this.myChar) return;
    const list = area === 'util' ? this.myChar.utilSkills || [] : this.myChar.skills;
    if (!list[slot]) return;
    if (Date.now() < (this.skillCdEnds.get(`${area}:${slot}`) || 0)) return;
    this.lastCombatLocal = Date.now(); // GĐ76: tung chiêu = giao tranh (ẩn nút thiền)
    this.socket.emit('cast_skill', { slot, area });
    // GĐ61: hô tên chiêu giữa màn hình như ảnh mẫu (chiêu từ Luyện Khí trở lên)
    const sk = list[slot];
    if (sk && sk.tier && sk.tier !== 'coban') this.announceSkill(sk.name);
  }

  private announceSkill(name: string): void {
    const el = document.getElementById('skillAnnounce');
    if (!el) return;
    el.textContent = `${name}!`;
    el.classList.remove('show');
    void (el as HTMLElement).offsetWidth; // khởi động lại hoạt ảnh
    el.classList.add('show');
  }

  // GĐ61: nhật ký thông báo góc trái dưới (tối đa 5 dòng, tự mờ sau 14s)
  private pushLog(text: string): void {
    const box = document.getElementById('gameLog');
    if (!box || !text) return;
    const line = document.createElement('div');
    line.className = 'logLine';
    line.textContent = text;
    box.appendChild(line);
    while (box.children.length > 5) box.removeChild(box.firstChild as Node);
    window.setTimeout(() => { line.style.opacity = '0'; }, 14000);
    window.setTimeout(() => { line.remove(); }, 15500);
  }

  // Vòng cập nhật lớp phủ hồi chiêu trên thanh công pháp
  private startSkillCdLoop(): void {
    window.setInterval(() => {
      if (!this.myChar) return;
      const now = Date.now();
      this.myChar.skills.forEach((s, i) => {
        const el = document.getElementById('cdov' + i);
        const end = this.skillCdEnds.get(`main:${i}`) || 0;
        const remain = end - now;
        if (el) el.style.height = remain > 0 ? `${Math.min(100, (remain / s.cdMs) * 100)}%` : '0%';
        const num = document.getElementById('cdnum' + i); // GĐ77: số giây hồi chiêu còn lại
        if (num) num.textContent = remain > 0 ? String(Math.ceil(remain / 1000)) : '';
        const tb = document.getElementById('tSkill' + i); // GĐ17: mờ nút cảm ứng khi hồi chiêu
        if (tb) {
          tb.style.opacity = remain > 0 ? '0.5' : '1';
          let ns = tb.querySelector('.cdnum') as HTMLElement | null; // GĐ77: số giây trên nút cảm ứng
          if (!ns) { ns = document.createElement('span'); ns.className = 'cdnum'; tb.appendChild(ns); }
          ns.textContent = remain > 0 ? String(Math.ceil(remain / 1000)) : '';
        }
      });
      (this.myChar.utilSkills || []).forEach((s, i) => {
        const el = document.getElementById('cduov' + i);
        const end = this.skillCdEnds.get(`util:${i}`) || 0;
        const remain = end - now;
        if (el) el.style.height = remain > 0 ? `${Math.min(100, (remain / s.cdMs) * 100)}%` : '0%';
        const num = document.getElementById('cdunum' + i); // GĐ77: số giây hồi chiêu còn lại (ô phụ)
        if (num) num.textContent = remain > 0 ? String(Math.ceil(remain / 1000)) : '';
        const tb = document.getElementById('tUtil' + i); // nút cảm ứng ô phụ cũng mờ khi hồi chiêu
        if (tb) {
          tb.style.opacity = remain > 0 ? '0.5' : '1';
          let ns = tb.querySelector('.cdnum') as HTMLElement | null; // GĐ77: số giây trên nút cảm ứng ô phụ
          if (!ns) { ns = document.createElement('span'); ns.className = 'cdnum'; tb.appendChild(ns); }
          ns.textContent = remain > 0 ? String(Math.ceil(remain / 1000)) : '';
        }
      });
      // GĐ46: lớp phủ hồi chiêu Né (khay desktop + nút cảm ứng)
      const dRemain = this.dodgeCdEnd - now;
      const dov = document.getElementById('dodgeCdov');
      if (dov) dov.style.height = dRemain > 0 ? `${Math.min(100, (dRemain / 2500) * 100)}%` : '0%';
      const tDg = document.getElementById('tDodge');
      if (tDg) tDg.style.opacity = dRemain > 0 ? '0.5' : '1';
    }, 100);
  }

  // ---------------- GĐ17: thao tác dùng chung + HUD phụ + cảm ứng ----------------
  private doAttack(): void {
    if (!this.socket?.connected) return;
    this.lastCombatLocal = Date.now(); // GĐ76: ra đòn = giao tranh (ẩn nút thiền)
    this.socket.emit('player_attack');
    const meA = this.actors.get(this.myId);
    if (meA) meA.castUntil = this.time.now + 230;
  }

  // GĐ76: ngồi thiền / đứng dậy (nút 🧘 + phím M). Server kiểm tra điều
  // kiện thật (5s ngoài giao tranh, không bế quan/lĩnh ngộ); client chỉ
  // quyết định HIỆN nút (ước lượng từ lần đánh/bị đánh gần nhất).
  private toggleMeditate(): void {
    if (!this.socket?.connected) return;
    this.socket.emit('meditate_toggle', {});
  }

  private updateMeditateBtn(): void {
    const btn = document.getElementById('meditateBtn');
    if (!btn) return;
    const show = document.body.classList.contains('ingame') && !!this.myChar
      && (this.myMeditating || Date.now() - this.lastCombatLocal >= 5000);
    btn.classList.toggle('show', show);
    btn.classList.toggle('active', this.myMeditating);
    const sp = btn.querySelector('span');
    if (sp) sp.textContent = this.myMeditating ? 'Đứng dậy' : 'Thiền';
  }

  // GĐ46: NÉ — vọt theo hướng đang di chuyển (lastSent); đứng yên thì
  // gửi vector 0 để server dùng hướng nhân vật đang quay mặt.
  private doDodge(): void {
    if (!this.socket?.connected || !this.myChar) return;
    if (Date.now() < this.dodgeCdEnd) return;
    this.dodgeCdEnd = Date.now() + 2500;
    this.socket.emit('dodge', { vx: this.lastSent.vx, vy: this.lastSent.vy });
  }

  private doInteract(): void {
    if (!this.socket?.connected || !this.myChar) return;
    const near = this.nearestInteract();
    if (!near) return;
    if (near.type === 'daoquan') {
      if (!this.myChar.linhCan) this.socket.emit('measure_linhcan');
      else this.toggleLearnPanel(); // GĐ32: mở panel Công pháp (chiêu LK học tại Đạo Quán)
    } else if (near.type === 'tulinh') {
      this.socket.emit('toggle_bequan'); // GĐ23
    } else if (near.type === 'board') {
      this.openQuestPanel('board');
    } else if (near.type === 'bangvang') {
      this.openBoardPanel(); // GĐ40+
    } else if (near.type === 'elder') {
      // GĐ24: gặp Trưởng Làng = trò chuyện (mở hộp thoại: thiện cảm + trả nhiệm vụ)
      this.socket.emit('talk_npc', { npcId: 'npc_truonglang' });
    } else if (near.type === 'sugia') {
      // GĐ30: Sứ Giả Tông Môn — hộp thoại chiêu mộ
      this.socket.emit('talk_npc', { npcId: 'npc_sugia' });
    } else if (near.type === 'bicanh_in') {
      // GĐ57: cổng vào bí cảnh — hộp thoại cổng (nút Vào bí cảnh cho đệ tử)
      this.socket.emit('talk_npc', { npcId: 'npc_bicanh_in' });
    } else if (near.type === 'bicanh_out') {
      // GĐ57: cổng trở về làng
      this.socket.emit('talk_npc', { npcId: 'npc_bicanh_out' });
    } else if (near.type === 'laibuan') {
      // GĐ60: Lái Buôn — nhận việc hộ tống thương nhân
      this.socket.emit('talk_npc', { npcId: 'npc_laibuan' });
    } else if (near.type === 'shop' && near.shopId) {
      this.openShop(near.shopId);
    } else if (near.type === 'travel') {
      this.socket.emit('travel_list'); // GĐ59: mở danh sách đích dịch chuyển
    } else if (near.type === 'altar') {
      this.socket.emit('altar_info'); // GĐ85: mở hộp thoại đàn tế
    }
  }

  private toggleGameMenu(): void {
    if (!this.inGame) return;
    const gm = document.getElementById('gameMenu');
    if (gm) {
      const open = gm.style.display !== 'block';
      gm.style.display = open ? 'block' : 'none';
      if (open) this.refreshMenuSwatches();
    }
  }

  private setupTouchUI(): void {
    if ('ontouchstart' in window || navigator.maxTouchPoints > 0) document.body.classList.add('touch');
    const bind = (id: string, fn: () => void) => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('pointerdown', (e) => { e.preventDefault(); fn(); });
    };
    // GĐ66: nút ⚔ kiêm nút tương tác — gần chỗ tương tác được thì bấm
    // là tương tác (nút hiện E), còn không thì vẫn đánh thường.
    bind('tAtk', () => { if (this.touchInteract) this.doInteract(); else this.doAttack(); });
    bind('tDodge', () => this.doDodge()); // GĐ46: nút Né cảm ứng
    bind('tSkill0', () => this.castSlot(0));
    bind('tSkill1', () => this.castSlot(1));
    bind('tSkill2', () => this.castSlot(2));
    bind('tSkill3', () => this.castSlot(3)); // GĐ47: ô chính 4
    bind('tSkill4', () => this.castSlot(4)); // GĐ47: ô chính 5
    // GĐ66: ô đa dụng trống thì bấm mở Sổ công pháp để lắp chiêu hỗ trợ
    const utilTap = (i: number) => {
      if ((this.myChar?.utilSkills || [])[i]) this.castSlot(i, 'util');
      else this.toggleLearnPanel();
    };
    bind('tUtil0', () => utilTap(0));
    bind('tUtil1', () => utilTap(1));
    bind('tUtil2', () => utilTap(2));
    bind('tUtil3', () => utilTap(3));
    bind('tPotion', () => {
      if (this.quickPotionId) this.socket?.emit('use_item', { itemId: this.quickPotionId });
      else this.toggleInv();
    });
    bind('meditateBtn', () => this.toggleMeditate()); // GĐ76: nút ngồi thiền
    bind('tAct', () => this.doInteract());
    bind('sideBag', () => this.toggleInv());
    // GĐ66 sửa nhỏ (2): bấm pill Linh thạch mở panel ví. Chặn click lan
    // lên thẻ — nếu không, trên cảm ứng chạm pill sẽ làm thẻ nở/thu
    // bảng chỉ số (handler chạm thẻ nằm ở #hudChar cha của pill).
    const stonesEl = document.getElementById('hudStones');
    if (stonesEl) stonesEl.addEventListener('click', (e) => { e.stopPropagation(); this.toggleStonesPanel(); });
    const sideQuest = document.getElementById('sideQuest');
    if (sideQuest) sideQuest.addEventListener('click', () => this.openQuestPanel('board'));
    const sideSkills = document.getElementById('sideSkills');
    if (sideSkills) sideSkills.addEventListener('click', () => this.toggleLearnPanel());
    // GĐ26/GĐ27: panel nghề phụ + thành tựu
    const sideJob = document.getElementById('sideJob');
    if (sideJob) sideJob.addEventListener('click', () => this.toggleJobPanel());
    const sideAch = document.getElementById('sideAch');
    if (sideAch) sideAch.addEventListener('click', () => this.toggleAchPanel());
    const sideMenu = document.getElementById('sideMenu');
    if (sideMenu) sideMenu.addEventListener('click', () => this.toggleGameMenu());
    // Điện thoại: chạm khung nhân vật để mở/thu bảng chỉ số
    const hudChar = document.getElementById('hudChar');
    if (hudChar) hudChar.addEventListener('click', (e) => {
      // GĐ55: thao tác TRONG bảng chỉ số (cộng điểm, chuyển bể…) không được
      // làm thẻ thu lại — trước đây bấm + trên điện thoại là bảng tắt luôn.
      if ((e.target as HTMLElement).closest('#hudDetails')) return;
      if (document.body.classList.contains('touch')) hudChar.classList.toggle('expanded');
    });
    // GĐ42b: nút "Chỉ số" riêng trong thẻ — bấm để xem/thu bảng chỉ số (mọi thiết bị)
    const detailBtn = document.getElementById('hudDetailBtn');
    if (detailBtn && hudChar) {
      detailBtn.addEventListener('click', (e) => {
        e.stopPropagation(); // tránh chạm thẻ trên mobile lật 2 lần
        hudChar.classList.toggle('expanded');
        const open = hudChar.classList.contains('expanded');
        const pts = (this.myChar?.freePoints || 0) + (this.myChar?.statPoints || 0);
        detailBtn.textContent = `${open ? '▾' : '▸'} Chỉ số${pts > 0 ? ` · còn ${pts} điểm chưa cộng` : ''}`;
      });
    }
    // Joystick ảo: kéo để di chuyển (vector analog −1..1, server đã hỗ trợ)
    const joy = document.getElementById('joy');
    const knob = document.getElementById('joyKnob');
    if (!joy || !knob) return;
    let pid: number | null = null;
    const setKnob = (dx: number, dy: number) => {
      knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
    };
    const onMove = (e: PointerEvent) => {
      if (pid === null || e.pointerId !== pid) return;
      const r = joy.getBoundingClientRect();
      let dx = e.clientX - (r.left + r.width / 2);
      let dy = e.clientY - (r.top + r.height / 2);
      const len = Math.hypot(dx, dy);
      const max = 38; // GĐ42: vòng joystick nhỏ lại (106px) nên hành trình núm rút theo
      if (len > max) { dx = (dx / len) * max; dy = (dy / len) * max; }
      setKnob(dx, dy);
      this.touchVec = len < 6 ? { x: 0, y: 0 } : { x: dx / max, y: dy / max };
    };
    joy.addEventListener('pointerdown', (e) => { pid = e.pointerId; joy.setPointerCapture(pid); onMove(e); });
    joy.addEventListener('pointermove', onMove);
    const end = (e: PointerEvent) => {
      if (e.pointerId !== pid) return;
      pid = null;
      this.touchVec = { x: 0, y: 0 };
      setKnob(0, 0);
    };
    joy.addEventListener('pointerup', end);
    joy.addEventListener('pointercancel', end);
  }

  // Banner khu vực + minimap + avatar trong khung nhân vật (gọi ~3 lần/giây)
  private refreshHudExtra(): void {
    // GĐ61: thanh máu trùm giữa trên (giữ 1.2s sau tick cuối cho đỡ nhấp nháy)
    const bb = document.getElementById('bossBar');
    if (bb) {
      const bs = this.bossShown;
      if (bs && Date.now() - bs.at < 1200 && bs.hp > 0) {
        bb.classList.add('on');
        const nm = document.getElementById('bossName');
        if (nm && nm.textContent !== bs.name) nm.textContent = bs.name;
        const fill = document.getElementById('bossHpFill');
        if (fill) fill.style.width = `${Math.max(0, (bs.hp / bs.maxHp) * 100)}%`;
        const tx = document.getElementById('bossHpText');
        if (tx) tx.textContent = `${Math.ceil(bs.hp)} / ${bs.maxHp}`;
      } else bb.classList.remove('on');
    }
    // GĐ60: đếm ngược ngự kiếm / thuyền
    if (this.journeyUntil > 0) {
      const bar = document.getElementById('journeyBar');
      const left = Math.max(0, Math.ceil((this.journeyUntil - Date.now()) / 1000));
      if (bar) { bar.style.display = 'block'; bar.textContent = `${this.journeyText}… còn ${left}s (di chuyển là hủy)`; }
    }
    if (this.myChar) {
      const key = this.myChar.classId;
      if (this.avatarKey !== key) {
        const cv = document.getElementById('hudAvatar') as HTMLCanvasElement | null;
        const img = this.clsImgs.get(key) || this.heroImg;
        if (cv && img) {
          const c = cv.getContext('2d');
          if (c) {
            c.clearRect(0, 0, 52, 52);
            c.imageSmoothingEnabled = false;
            c.drawImage(img, 24, 14, 48, 42, 0, 0, 52, 52);
            this.avatarKey = key; // chỉ chốt khi vẽ thành công (tránh kẹt nếu ảnh chưa tải)
          }
        }
      }
    }
    const me = this.myId ? this.worldPlayers.get(this.myId) : undefined;
    if (!me) return;
    // GĐ59: đang ở MAP KHÁC — banner + minimap theo bản đồ hiện tại
    if (this.mapState && !this.mapState.isHome) {
      const ms = this.mapState;
      const zb2 = document.getElementById('zoneBanner');
      if (zb2) {
        const txt = `${ms.safe ? '🏯' : '⚔'} ${ms.name} · ${ms.safe ? 'An toàn' : 'Nguy hiểm'}`;
        if (zb2.textContent !== txt) zb2.textContent = txt;
        zb2.classList.toggle('danger', !ms.safe);
      }
      const mm2 = document.getElementById('minimap') as HTMLCanvasElement | null;
      const c2 = mm2?.getContext('2d');
      if (mm2 && c2) {
        const SX2 = mm2.width / ms.w;
        const SY2 = mm2.height / ms.h;
        c2.fillStyle = '#22312a';
        c2.fillRect(0, 0, mm2.width, mm2.height);
        c2.strokeStyle = 'rgba(139,233,201,0.5)';
        c2.lineWidth = 2;
        c2.strokeRect(3, 3, mm2.width - 6, mm2.height - 6);
        const dot2 = (x: number, y: number, col: string, r: number) => {
          c2.beginPath();
          c2.arc(x * SX2, y * SY2, r, 0, Math.PI * 2);
          c2.fillStyle = col;
          c2.fill();
          c2.strokeStyle = 'rgba(0,0,0,0.65)';
          c2.lineWidth = 2;
          c2.stroke();
        };
        dot2(ms.portal.x, ms.portal.y, '#57c98b', 5);
        if (this.myChar?.escort && this.myChar.escort.dest === ms.mapId) dot2(this.myChar.escort.delivery.x, this.myChar.escort.delivery.y, '#ffd94d', 6); // GĐ60: điểm giao hàng hộ tống
        for (const m of this.monsterTargets.values()) dot2(m.x, m.y, '#ff6b5e', 4.5);
        for (const [id, pl] of this.worldPlayers) if (id !== this.myId) dot2(pl.x, pl.y, '#e8f2ea', 3.6);
        dot2(me.x, me.y, '#ffe14d', 6.5);
        c2.strokeStyle = '#fff2b0';
        c2.lineWidth = 2.5;
        c2.beginPath();
        c2.arc(me.x * SX2, me.y * SY2, 10, 0, Math.PI * 2);
        c2.stroke();
      }
      return;
    }
    const v = WORLD_GEO.village;
    const inVillage = me.x >= v.x && me.x <= v.x + v.w && me.y >= v.y && me.y <= v.y + v.h;
    // GĐ22: sân Thanh Phong Môn (khớp SECT phía server) cũng là vùng an toàn
    const inSect = me.x >= 1230 && me.x <= 1530 && me.y >= 420 && me.y <= 660;
    // GĐ23: quanh Tụ Linh Trận sau Đạo Quán cũng an toàn
    const inTulinh = Math.hypot(me.x - 700, me.y - 196) <= 78;
    // GĐ57: trong Bí Cảnh Thạch Lâm
    const rm0 = WORLD_GEO.realm;
    const inRealm = me.x >= rm0.x && me.x <= rm0.x + rm0.w && me.y >= rm0.y && me.y <= rm0.y + rm0.h;
    const zb = document.getElementById('zoneBanner');
    if (zb) {
      const txt = inRealm ? '🌀 Bí Cảnh Thạch Lâm · Nguy hiểm' : inSect ? '🏯 Thanh Phong Môn · An toàn' : inTulinh ? '🧘 Thiền Phòng · Tụ Linh Trận · An toàn' : inVillage ? '📍 Làng Tân Thủ · An toàn' : '⚔ Bãi Săn Sói · Nguy hiểm';
      if (zb.textContent !== txt) zb.textContent = txt;
      zb.classList.toggle('danger', inRealm || (!inVillage && !inSect && !inTulinh));
    }
    const mm = document.getElementById('minimap') as HTMLCanvasElement | null;
    const c = mm?.getContext('2d');
    if (!mm || !c) return;
    const SX = mm.width / WORLD_W;
    const SY = mm.height / WORLD_H;
    c.fillStyle = '#274a2b';
    c.fillRect(0, 0, mm.width, mm.height);
    c.fillStyle = '#40603a';
    c.fillRect(v.x * SX, v.y * SY, v.w * SX, v.h * SY);
    // GĐ46: viền làng + chấm TO có viền tối tương phản — minimap phải nhìn rõ
    c.strokeStyle = 'rgba(255,217,77,0.55)';
    c.lineWidth = 2;
    c.strokeRect(v.x * SX, v.y * SY, v.w * SX, v.h * SY);
    // GĐ57: viền bí cảnh ngọc bích trên minimap
    const rm = WORLD_GEO.realm;
    c.fillStyle = 'rgba(64,110,100,0.5)';
    c.fillRect(rm.x * SX, rm.y * SY, rm.w * SX, rm.h * SY);
    c.strokeStyle = 'rgba(127,231,220,0.65)';
    c.strokeRect(rm.x * SX, rm.y * SY, rm.w * SX, rm.h * SY);
    const p = WORLD_GEO.pond;
    c.fillStyle = '#7fb2d9';
    c.beginPath();
    c.ellipse(p.x * SX, p.y * SY, p.rx * SX, p.ry * SY, 0, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#a08050';
    for (const h of WORLD_GEO.houses) c.fillRect(h.x * SX, h.y * SY, Math.max(7, h.w * SX), Math.max(7, h.h * SY));
    const dot = (x: number, y: number, col: string, r: number) => {
      c.beginPath();
      c.arc(x * SX, y * SY, r, 0, Math.PI * 2);
      c.fillStyle = col;
      c.fill();
      c.strokeStyle = 'rgba(0,0,0,0.65)';
      c.lineWidth = 2;
      c.stroke();
    };
    for (const cont of this.npcActors.values()) dot(cont.x, cont.y, '#ffd94d', 4.5);
    for (const m of this.monsterTargets.values()) dot(m.x, m.y, '#ff6b5e', 4.5);
    for (const [id, pl] of this.worldPlayers) if (id !== this.myId) dot(pl.x, pl.y, '#e8f2ea', 3.6);
    dot(me.x, me.y, '#ffe14d', 6.5);
    c.strokeStyle = '#fff2b0';
    c.lineWidth = 2.5;
    c.beginPath();
    c.arc(me.x * SX, me.y * SY, 10, 0, Math.PI * 2);
    c.stroke();
  }

  // ---------------- GĐ8: NPC + đồ rơi + panel ----------------
  private nearestInteract(): { type: string; x: number; y: number; shopId?: string } | null {
    if (!this.myContainer) return null;
    // GĐ59: ở map khác thì chỉ còn Trận Dịch Chuyển; ở làng có thêm các điểm cũ
    const isHome = !this.mapState || this.mapState.isHome;
    const cands: Array<{ type: string; x: number; y: number; shopId?: string }> = isHome ? [...INTERACTS] : [];
    const portal = this.mapState?.portal || { x: 1080, y: 600 };
    cands.push({ type: 'travel', x: portal.x, y: portal.y });
    // GĐ85: đàn tế trên map có trùm (server gửi vị trí theo map_enter)
    if (!isHome && this.mapState?.altar) cands.push({ type: 'altar', x: this.mapState.altar.x, y: this.mapState.altar.y });
    let best: { type: string; x: number; y: number; shopId?: string } | null = null;
    let bd = Infinity;
    for (const it of cands) {
      const d = Math.hypot(this.myContainer.x - it.x, this.myContainer.y - it.y);
      if (d < bd) {
        bd = d;
        best = it;
      }
    }
    return best && bd <= 70 ? best : null;
  }

  private syncNpcs(npcs: NpcState[]): void {
    // GĐ40+: NPC không còn trong danh sách (thương nhân rời làng) → gỡ hình
    const seenNpc = new Set(npcs.map((n) => n.id));
    for (const [id, c] of this.npcActors) {
      if (!seenNpc.has(id)) {
        c.destroy();
        this.npcActors.delete(id);
      }
    }
    for (const n of npcs) {
      if (this.npcActors.has(n.id)) continue;
      // GĐ57: CỔNG BÍ CẢNH không phải người — vẽ vòng sáng tím-ngọc đập nhịp
      // (hình tĩnh của cổng đã nướng sẵn vào nền ở đúng vị trí này)
      if (n.id.startsWith('npc_bicanh')) {
        const glow = this.add.image(0, -4, 'moonGlow').setScale(0.5).setAlpha(0.5).setTint(0x9a86ff);
        this.tweens.add({ targets: glow, alpha: 0.22, scale: 0.4, duration: 1300, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
        const plabel = this.add
          .text(0, -66, `${n.name}\n${n.role}`, {
            fontFamily: 'Palatino, Georgia, serif',
            fontSize: '11px',
            color: '#e6dcff',
            align: 'center',
            backgroundColor: 'rgba(16,12,34,0.6)',
            padding: { x: 5, y: 2 },
          })
          .setOrigin(0.5, 1);
        const pc = this.add.container(n.x, n.y, [glow, plabel]);
        pc.setDepth(n.y);
        this.npcActors.set(n.id, pc);
        continue;
      }
      // GĐ14: NPC dùng bộ sprite pixel biến thể theo vai trò (Trưởng Làng =
      // elder tóc râu bạc...); nạp lỗi thì lùi về hình vẽ code của GĐ9.
      const npcSet = NPC_SPRITE_SET[n.id];
      const sprite =
        npcSet && this.textures.exists(`${npcSet}-idle-south`)
          ? this.add
              .sprite(0, 0, spriteTexKey(npcSet, n.direction, 'idle'))
              .setOrigin(0.5, HERO_ORIGIN_Y)
              .setScale(HERO_SCALE)
          : this.add
              .sprite(0, 0, personTexKey(npcStyleKey(n.id), n.direction, 'idle'))
              .setOrigin(PERSON_TEX.originX, PERSON_TEX.originY)
              .setScale(PERSON_TEX.scale);
      const label = this.add
        .text(0, -66, `${n.name}\n${n.role}`, {
          fontFamily: 'Palatino, Georgia, serif',
          fontSize: '11px',
          color: '#dff5e6',
          align: 'center',
          backgroundColor: 'rgba(10,22,16,0.55)',
          padding: { x: 5, y: 2 },
        })
        .setOrigin(0.5, 1);
      const c = this.add.container(n.x, n.y, [sprite, label]);
      c.setDepth(n.y);
      this.npcActors.set(n.id, c);
    }
  }

  private syncDrops(drops: DropState[]): void {
    const seen = new Set<string>();
    for (const d of drops) {
      seen.add(d.id);
      if (this.dropActors.has(d.id)) continue;
      let c: Phaser.GameObjects.Container;
      if (d.kind === 'stones') {
        const img = this.add.image(0, 0, 'drop-stone');
        const t = this.add
          .text(0, 12, String(d.amount), { fontFamily: 'monospace', fontSize: '10px', color: '#cffafe' })
          .setOrigin(0.5, 0);
        c = this.add.container(d.x, d.y, [img, t]);
        this.tweens.add({ targets: img, y: -3, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
      } else {
        const img = this.add.image(0, 0, 'drop-fang');
        const t = this.add
          .text(0, 12, ITEM_INFO[d.itemId || '']?.name || 'Vật phẩm', { fontFamily: 'monospace', fontSize: '9px', color: '#e2e8f0' })
          .setOrigin(0.5, 0);
        c = this.add.container(d.x, d.y, [img, t]);
        this.tweens.add({ targets: img, y: -3, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
      }
      c.setDepth(d.y - 1);
      this.dropActors.set(d.id, c);
    }
    for (const [id, c] of this.dropActors) {
      if (!seen.has(id)) {
        c.destroy();
        this.dropActors.delete(id);
      }
    }
  }

  // GĐ39: rương báu trên mặt đất — hình theo phẩm + nhãn cấp, nhấp nháy nhẹ
  private syncChests(chests: ChestState[]): void {
    const seen = new Set<string>();
    for (const ch of chests) {
      seen.add(ch.id);
      if (this.chestActors.has(ch.id)) continue;
      const img = this.add.image(0, 0, 'chest-' + (ch.grade || 'C'));
      const t = this.add
        .text(0, 14, 'Rương ' + ch.grade, { fontFamily: 'monospace', fontSize: '9px', color: ch.grade === 'A' ? '#ffd873' : ch.grade === 'B' ? '#cfe2ff' : '#e8d9bd' })
        .setOrigin(0.5, 0);
      const c = this.add.container(ch.x, ch.y, [img, t]);
      this.tweens.add({ targets: img, y: -3, duration: 800, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
      c.setDepth(ch.y - 1);
      this.chestActors.set(ch.id, c);
    }
    for (const [id, c] of this.chestActors) {
      if (!seen.has(id)) {
        c.destroy();
        this.chestActors.delete(id);
      }
    }
  }

  private closePanels(): void {
    this.openPanel = null;
    for (const id of ['shopPanel', 'questPanel', 'invPanel', 'npcDialog', 'jobPanel', 'achPanel', 'learnPanel', 'boardPanel', 'stonesPanel', 'altarPanel']) {
      const el = document.getElementById(id);
      if (el) el.style.display = 'none';
    }
  }

  // GĐ26: panel NGHỀ PHỤ — chưa có nghề thì chọn học; có nghề thì chế tạo
  private toggleJobPanel(): void {
    if (!this.myChar) return;
    if (this.openPanel === 'job') { this.closePanels(); return; }
    this.closePanels();
    this.openPanel = 'job';
    const p = document.getElementById('jobPanel');
    if (p) p.style.display = 'block';
    const close = document.getElementById('jobClose');
    if (close) close.onclick = () => this.closePanels();
    this.renderJobPanel();
  }

  private renderJobPanel(): void {
    if (!this.myChar) return;
    const mc = this.myChar;
    const sub = document.getElementById('jobSub');
    const body = document.getElementById('jobBody');
    if (!body) return;
    const job = mc.job;
    if (!job) {
      if (sub) sub.textContent = mc.linhCan
        ? 'Chọn 1 nghề phụ để học (bản này mỗi nhân vật 1 nghề). Chế tạo tốn Nanh Sói + Linh thạch, thất bại mất nguyên liệu.'
        : 'Cần đo linh căn ở Đạo Quán trước khi học nghề phụ.';
      body.innerHTML = Object.entries(JOB_INFO).map(([jobId, j]) =>
        `<div class="prow"><span class="pname">${j.icon} ${j.name}<span class="pdesc">${Object.values(RECIPE_INFO).filter((r) => r.jobId === jobId).map((r) => r.name).join(' · ')}</span></span><button class="pbtn gold" data-learn="${jobId}" ${mc.linhCan ? '' : 'disabled'}>Học nghề</button></div>`,
      ).join('');
      body.querySelectorAll<HTMLButtonElement>('[data-learn]').forEach((b) => {
        b.onclick = () => this.socket.emit('learn_job', { jobId: b.dataset.learn });
      });
      return;
    }
    const nextAt = job.rank === 1 ? 50 : job.rank === 2 ? 200 : null;
    if (sub) sub.textContent = `${JOB_INFO[job.jobId].icon} ${job.jobName} · Cấp: ${job.rankName} · Đã chế thành công ${job.crafts} lần${nextAt ? ` (còn ${nextAt - job.crafts} lần nữa lên ${JOB_RANK_NAMES_CLIENT[job.rank + 1]}${job.rank === 2 ? ' — và cần đạt Trúc Cơ' : ''})` : ' — cấp cao nhất'}`;
    let html = '';
    const invNow = mc.inventory;
    for (const [rid, r] of Object.entries(RECIPE_INFO)) {
      if (r.jobId !== job.jobId) continue;
      const inputs = Object.entries(r.inputs).map(([iid, n]) => `${ITEM_INFO[iid]?.name || iid} ×${n} (có ${invNow[iid] || 0})`).join(' + ') + (r.stones ? ` + ${r.stones} LT` : '');
      const locked = job.rank < r.minRank;
      html += `<div class="prow"><span class="pname">${r.name}<span class="pdesc">${inputs} → ${ITEM_INFO[r.output]?.name || r.output} · Tỉ lệ thành công ${Math.round(r.rate * 100)}%${r.minRank > 1 ? ` · Cần cấp ${JOB_RANK_NAMES_CLIENT[r.minRank]}` : ''}</span></span><button class="pbtn" data-craft="${rid}" ${locked ? 'disabled' : ''}>${locked ? '🔒 Chưa đủ cấp' : 'Chế tạo'}</button></div>`;
    }
    body.innerHTML = html;
    body.querySelectorAll<HTMLButtonElement>('[data-craft]').forEach((b) => {
      b.onclick = () => this.socket.emit('craft_item', { recipeId: b.dataset.craft });
    });
  }

  // GĐ32: panel CÔNG PHÁP — toàn bộ chiêu Luyện Khí + Trúc Cơ của lớp × vũ khí
  private toggleLearnPanel(): void {
    if (!this.myChar) return;
    if (this.openPanel === 'learn') { this.closePanels(); return; }
    this.closePanels();
    this.openPanel = 'learn';
    const p = document.getElementById('learnPanel');
    if (p) p.style.display = 'block';
    const close = document.getElementById('learnClose');
    if (close) close.onclick = () => this.closePanels();
    this.renderLearnPanel();
  }

  private renderLearnPanel(): void {
    if (!this.myChar) return;
    const mc = this.myChar;
    const sub = document.getElementById('learnSub');
    const body = document.getElementById('learnBody');
    if (!body) return;
    if (sub) {
      sub.textContent = mc.learning
        ? `Đang lĩnh ngộ: ${mc.learning.name} · ${mc.learning.pct}%${mc.learning.active ? ' — đang ngồi học, ĐỪNG di chuyển/ra đòn (về 0 đấy!)' : ' — bấm Ngồi học để học tiếp; thoát game nhân vật tự về nơi an toàn học tiếp'}.`
        : 'Ngồi yên học một mạch tới khi xong: đứng dậy, di chuyển, ra đòn hay bị đánh trúng đều làm tiến độ VỀ 0. Chỉ thoát game là an toàn (nhân vật tự về chỗ an toàn học tiếp). Chiêu Luyện Khí học ở Đạo Quán; Trúc Cơ học ở mọi nơi.';
      if (mc.skillSlots) sub.textContent += ` Bảng ${((mc.activeBoard || 0) + 1)}: ô chính ${mc.skillSlots.used}/${mc.skillSlots.max} (phím 1–${mc.skillSlots.max}) · ô đa dụng ${mc.skillSlots.utilUsed || 0}/${mc.skillSlots.utilMax || 4} (phím 6–9, chỉ chứa chiêu HỖ TRỢ). Đổi bảng ở tab phía trên.`;
    }
    const row = (e: CatalogEntry) => {
      const tierName = e.tier === 'coban' ? 'Cơ bản' : e.tier === 'luyenkhi' ? 'Luyện Khí' : 'Trúc Cơ';
      // GĐ68: icon chiêu vẽ thủ tục (hệ + bậc + vũ khí) — mọi chiêu đều có icon
      const ic = `<img class="skicon" src="${skillIconURL(e)}" alt="" title="${e.name}">`;
      const meta = `Hệ ${e.element} · Hệ số ${e.coef} · Hồi chiêu ${(e.cdMs / 1000).toFixed(1)}s · Tốn ${e.cost} chân nguyên${e.fxText ? ` · ⚡ ${e.fxText}` : ''}${e.desc ? ` · ${e.desc.slice(0, 90)}${e.desc.length > 90 ? '…' : ''}` : ''}`;
      if (e.learned) {
        const full = (mc.skillSlots?.used || 0) >= (mc.skillSlots?.max || 0);
        const utilFull = (mc.skillSlots?.utilUsed || 0) >= (mc.skillSlots?.utilMax || 4);
        const mainBtn = e.equipped
          ? `<button class="pbtn" data-unequip="${e.id}" data-area="main">Tháo</button>`
          : e.equippedUtil
            ? ''
            : `<button class="pbtn gold" data-equip="${e.id}" data-area="main" ${full ? 'disabled title="Ô đã đầy"' : ''}>${full ? 'Ô đầy' : 'Lắp vào ô'}</button>`;
        const utilBtn = !e.utility
          ? ''
          : e.equippedUtil
            ? `<button class="pbtn" data-unequip="${e.id}" data-area="util">Tháo ô phụ</button>`
            : e.equipped
              ? ''
              : `<button class="pbtn gold" data-equip="${e.id}" data-area="util" ${utilFull ? 'disabled title="Ô đa dụng đã đầy"' : ''}>${utilFull ? 'Ô phụ đầy' : 'Lắp ô phụ'}</button>`;
        const marks = `${e.equipped ? ' <span style="color:#ffd98a">◆ ô chính</span>' : ''}${e.equippedUtil ? ' <span style="color:#8be9c9">◆ ô đa dụng</span>' : ''}`;
        return `<div class="prow">${ic}<span class="pname">✅ ${e.name}${marks}<span class="pdesc">${tierName} · ${meta}</span></span><span style="display:flex;gap:4px">${mainBtn}${utilBtn}</span></div>`;
      }
      if (e.isLearning) {
        const btn = mc.learning?.active
          ? `<button class="pbtn" data-stop="1">⏸ Dừng (về 0)</button>`
          : `<button class="pbtn gold" data-learn="${e.id}">▶ Ngồi học tiếp</button>`;
        return `<div class="prow">${ic}<span class="pname">📖 ${e.name} · ${mc.learning?.pct || 0}%<span class="pdesc">${tierName} · ${meta}</span></span>${btn}</div>`;
      }
      const btn = e.condMet
        ? `<button class="pbtn gold" data-learn="${e.id}">${e.tier === 'coban' ? 'Học ngay' : 'Ngồi học'}</button>`
        : `<button class="pbtn" disabled>🔒 ${e.condText}</button>`;
      return `<div class="prow">${ic}<span class="pname">${e.name}<span class="pdesc">${tierName} · ${meta} · Cần: ${e.condText}${e.tier === 'luyenkhi' ? ' · Học tại Đạo Quán' : ''}</span></span>${btn}</div>`;
    };
    const cb = (mc.catalog || []).filter((e) => e.tier === 'coban');
    const lk = (mc.catalog || []).filter((e) => e.tier === 'luyenkhi');
    const tc = (mc.catalog || []).filter((e) => e.tier === 'trucco');
    // GĐ58: hint để DÒNG RIÊNG dưới hàng tab — trước đây hint nằm cùng hàng flex, bị ép hẹp
    // nên quấn thành cột cao, kéo 2 nút tab giãn thành oval khổng lồ (lỗi bạn bè chụp được 23/10).
    const tabs = `<div style="display:flex;gap:6px;margin-bottom:2px;align-items:center">${[0, 1]
      .map(
        (b) =>
          `<button class="pbtn ${((mc.activeBoard || 0) === b) ? 'gold' : ''}" style="flex:0 0 auto" data-board="${b}">Bảng ${b + 1}${mc.boardsInfo?.[b] ? ` (${mc.boardsInfo[b].main} chính · ${mc.boardsInfo[b].util} phụ)` : ''}</button>`,
      )
      .join('')}</div><div class="pdesc" style="margin-bottom:6px">Đổi bảng để thay cả bộ chiêu (vd: farm quái ↔ tu luyện)</div>`;
    body.innerHTML =
      tabs +
      (cb.length ? `<div class="panelSub" style="margin-top:2px">— Công pháp Cơ bản (tự có, học ngay) —</div>` + cb.map(row).join('') : '') +
      (lk.length ? `<div class="panelSub" style="margin-top:6px">— Công pháp Luyện Khí (học tại Đạo Quán, nửa ngày game) —</div>` + lk.map(row).join('') : '') +
      (tc.length ? `<div class="panelSub" style="margin-top:6px">— Công pháp Trúc Cơ (học ở mọi nơi, 2 ngày game) —</div>` + tc.map(row).join('') : '');
    body.querySelectorAll<HTMLButtonElement>('[data-learn]').forEach((b) => {
      b.onclick = () => { this.socket.emit('learn_skill', { skillId: b.dataset.learn }); this.closePanels(); };
    });
    body.querySelectorAll<HTMLButtonElement>('[data-stop]').forEach((b) => {
      b.onclick = () => { this.socket.emit('learn_skill', {}); this.closePanels(); };
    });
    body.querySelectorAll<HTMLButtonElement>('[data-equip]').forEach((b) => {
      b.onclick = () => this.socket.emit('equip_skill', { skillId: b.dataset.equip, area: b.dataset.area || 'main' });
    });
    body.querySelectorAll<HTMLButtonElement>('[data-unequip]').forEach((b) => {
      b.onclick = () => this.socket.emit('unequip_skill', { skillId: b.dataset.unequip, area: b.dataset.area || 'main' });
    });
    body.querySelectorAll<HTMLButtonElement>('[data-board]').forEach((b) => {
      b.onclick = () => this.socket.emit('switch_board', { board: Number(b.dataset.board) });
    });
  }

  // GĐ27: panel THÀNH TỰU
  private toggleAchPanel(): void {
    if (!this.myChar) return;
    if (this.openPanel === 'ach') { this.closePanels(); return; }
    this.closePanels();
    this.openPanel = 'ach';
    const p = document.getElementById('achPanel');
    if (p) p.style.display = 'block';
    const close = document.getElementById('achClose');
    if (close) close.onclick = () => this.closePanels();
    this.renderAchPanel();
  }

  private renderAchPanel(): void {
    if (!this.myChar) return;
    const body = document.getElementById('achBody');
    if (!body) return;
    const list = this.myChar.achievements || [];
    body.innerHTML = list.map((a) =>
      `<div class="prow"><span class="pname">${a.claimed ? '✅' : a.done ? '🏆' : '▫️'} ${a.name}<span class="pdesc">${a.desc} · Tiến độ ${a.progress}/${a.target} · Thưởng ${a.reward} LT</span></span>${a.claimed ? '<span style="color:#8be98b">Đã nhận</span>' : a.done ? `<button class="pbtn gold" data-ach="${a.id}">Nhận thưởng</button>` : `<span>${a.progress}/${a.target}</span>`}</div>`,
    ).join('') || '<div class="prow">Chưa có dữ liệu thành tựu.</div>';
    body.querySelectorAll<HTMLButtonElement>('[data-ach]').forEach((b) => {
      b.onclick = () => this.socket.emit('claim_achievement', { achId: b.dataset.ach });
    });
  }

  // GĐ24: hộp thoại trò chuyện với NPC (lời thoại + thiện cảm + nhiệm vụ riêng)
  // GĐ59: vào một bản đồ — ẩn/hiện cảnh làng, dựng nền map mới, đặt biên camera
  // GĐ74: banner tên map chỉ hiện 2,5s khi vào map / đăng nhập (feedback 25/10).
  private zoneBannerTimer: number | null = null;
  private showZoneBanner(text: string, danger: boolean): void {
    const zb = document.getElementById('zoneBanner');
    if (!zb) return;
    zb.textContent = text;
    zb.classList.toggle('danger', danger);
    zb.classList.add('show');
    if (this.zoneBannerTimer) window.clearTimeout(this.zoneBannerTimer);
    this.zoneBannerTimer = window.setTimeout(() => zb.classList.remove('show'), 2500);
  }

  private onMapEnter(def: MapEnterData): void {
    this.mapState = def;
    const isHome = !!def.isHome;
    for (const o of this.homeObjects) (o as Phaser.GameObjects.Image).setVisible(isHome);
    for (const s of this.moonSheens) s.setVisible(isHome);
    for (const b of this.birds) b.img.setVisible(isHome);
    if (isHome) {
      if (this.mapBg) this.mapBg.setVisible(false);
      destroyBuiltMap(this, this.builtMap);
      this.builtMap = null;
      this.cameras.main.setBounds(0, 0, WORLD_W, WORLD_H);
      this.showZoneBanner('📍 Làng Tân Thủ · An toàn', false);
    } else {
      destroyBuiltMap(this, this.builtMap);
      this.builtMap = buildMapObjects(this, def);
      // GĐ60: hố lửa nhấp nháy cảnh báo
      for (const img of this.builtMap.hazardImages) {
        this.tweens.add({ targets: img, alpha: 0.7, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      }
      // GĐ60: đang hộ tống tới đúng map này → cột sáng vàng ở điểm giao hàng
      if (this.myChar?.escort && this.myChar.escort.dest === def.mapId) {
        const dl = this.myChar.escort.delivery;
        const beacon = this.add.image(dl.x, dl.y, 'moonGlow').setTint(0xffd94d).setScale(1.6).setDepth(-98).setAlpha(0.9);
        this.tweens.add({ targets: beacon, scale: 2.3, alpha: 0.45, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
        this.builtMap.objects.push(beacon);
      }
      this.cameras.main.setBounds(0, 0, def.w, def.h);
      this.showZoneBanner(`${def.safe ? '🏯' : '⚔'} ${def.name} · ${def.safe ? 'An toàn' : 'Nguy hiểm'}`, !def.safe);
    }
    // GĐ60: sang map mới = hành trình (nếu có) đã xong — tắt thanh đếm ngược
    this.journeyUntil = 0;
    const jbar = document.getElementById('journeyBar');
    if (jbar) jbar.style.display = 'none';
    const lbl = document.getElementById('minimapLabel');
    if (lbl) lbl.textContent = def.name.toUpperCase();
    // GĐ76: điểm linh mạch — quầng sáng + nhãn ✦, hủy dấu cũ khi đổi map
    for (const o of this.spotObjects) o.destroy();
    this.spotObjects = [];
    for (const s of def.spots || []) {
      const glow = this.add.image(s.x, s.y, 'moonGlow').setTint(0x6ff2d8).setScale(0.55).setDepth(-98).setAlpha(0.85);
      const tag = this.add.text(s.x, s.y - 26, '✦ Linh mạch', { fontSize: '11px', color: '#7df2dc' }).setOrigin(0.5, 0.5).setDepth(-98).setAlpha(0.9);
      this.spotObjects.push(glow, tag);
    }
    // GĐ85: đàn tế — quầng lửa + nhãn, hủy dấu cũ khi đổi map
    for (const o of this.altarObjects) o.destroy();
    this.altarObjects = [];
    if (def.altar) {
      const glow = this.add.image(def.altar.x, def.altar.y, 'moonGlow').setTint(0xff6a3d).setScale(0.55).setDepth(-98).setAlpha(0.85);
      const tag = this.add.text(def.altar.x, def.altar.y - 26, '🕯️ Đàn Tế', { fontSize: '11px', color: '#ffb08a' }).setOrigin(0.5, 0.5).setDepth(-98).setAlpha(0.9);
      this.altarObjects.push(glow, tag);
    }
  }

  // GĐ85: hộp thoại Đàn Tế — nút triệu hồi chỉ bật khi server báo đủ điều kiện
  private openAltarPanel(d: { mapId: string; mapName: string; bossName: string; bossCount: number; live: number; missing: number; cost: number; usedToday: boolean; canSummon: boolean; reason: string }): void {
    this.closePanels();
    this.openPanel = 'altar';
    const p = document.getElementById('altarPanel');
    if (p) p.style.display = 'block';
    const sub = document.getElementById('altarSub');
    if (sub) sub.textContent = `Map: ${d.mapName} — Trùm: ${d.bossName} (${d.live}/${d.bossCount} con còn sống)`;
    const body = document.getElementById('altarBody');
    if (body) {
      body.innerHTML = `<div class="prow"><span class="pname">Triệu hồi ${d.missing > 0 ? `${d.missing} trùm còn thiếu` : 'trùm'}<span class="pdesc">${d.usedToday ? 'Hôm nay đã tế ở map này rồi — mai hãy quay lại.' : d.reason || `Tốn ${d.cost} Linh thạch Hạ phẩm — trùm xuất hiện ngay trong map, rương như trùm thường.`}</span></span></div>`
        + `<div class="prow"><button class="pbtn" id="altarSummonBtn" type="button" ${d.canSummon ? '' : 'disabled'}>🕯️ Tế ${d.cost} LT — triệu hồi</button></div>`;
      const btn = document.getElementById('altarSummonBtn');
      if (btn) btn.onclick = () => this.socket?.emit('altar_summon');
    }
  }

  // GĐ59: hộp thoại Trận Dịch Chuyển — danh sách đích từ server (đích khóa hiện điều kiện)
  private openTravelDialog(d: { from: string; list: TravelDest[] }): void {
    const p = document.getElementById('npcDialog');
    if (!p) return;
    this.closePanels();
    p.style.display = 'block';
    const title = document.getElementById('npcDlgTitle');
    if (title) title.textContent = '🌀 Trận Dịch Chuyển';
    const affEl = document.getElementById('npcDlgAff');
    const stones = this.myChar?.stones ?? 0;
    if (affEl) affEl.textContent = `Đang ở: ${this.mapState?.name || 'Làng Tân Thủ'} · 💠 Linh thạch: ${stones}`;
    const textEl = document.getElementById('npcDlgText');
    if (textEl) textEl.textContent = 'Dịch chuyển tức thì nhưng tốn Linh thạch (về làng/thành miễn phí). Kim Đan có thể ngự kiếm — miễn phí nhưng chậm. Đảo ngoài biển chỉ đi thuyền từ Thanh Vân Thành. Thiếu Linh thạch thì gặp Lái Buôn nhận việc hộ tống.';
    const btns = document.getElementById('npcDlgBtns');
    if (!btns) return;
    const CAT_LABEL: Record<string, string> = { city: 'Thành thị', profession: 'Đất nghề', farm: 'Bãi săn', elemental: 'Vùng ngũ hành', current: 'Làng' };
    const canFly = (this.myChar?.realm === 'kd' || this.myChar?.realm === 'na' || this.myChar?.realm === 'ht');
    let html = '';
    for (const t of d.list) {
      const meta = `${CAT_LABEL[t.category] || t.category} · ${t.safe ? 'An toàn' : 'Nguy hiểm'}`;
      if (!t.canEnter) {
        html += `<div class="prow"><span class="pname">🔒 ${t.name}<span class="pdesc">${meta} · ${t.needText}</span></span><button class="pbtn" disabled>Chưa mở</button></div>`;
        continue;
      }
      if (t.id === 'thach_lam') {
        html += `<div class="prow"><span class="pname">${t.name}<span class="pdesc">${meta} · qua cổng tông môn</span></span><button class="pbtn gold" data-travel="${t.id}">Đi</button></div>`;
        continue;
      }
      const btnsHtml: string[] = [];
      if (t.boatOnly) {
        btnsHtml.push(`<button class="pbtn gold" data-travel="${t.id}" data-method="boat">⛵ Thuyền ~${t.boatSec ?? '?'}s</button>`);
      } else {
        const cost = t.cost ?? 0;
        const poor = stones < cost;
        btnsHtml.push(cost > 0
          ? `<button class="pbtn gold" data-travel="${t.id}" data-method="portal" ${poor ? 'disabled' : ''}>🌀 ${cost} LT${poor ? ' (thiếu)' : ''}</button>`
          : `<button class="pbtn gold" data-travel="${t.id}" data-method="portal">🌀 Miễn phí</button>`);
        if (this.mapState?.mapId === 'tham_hai_bi_canh' && t.id === 'thanh_van_thanh') { // đang ở đảo → thêm lựa chọn về bằng thuyền
          btnsHtml.push(`<button class="pbtn" data-travel="${t.id}" data-method="boat">⛵ Thuyền ~${t.boatSec ?? '?'}s</button>`);
        }
      }
      if (canFly) btnsHtml.push(`<button class="pbtn" data-travel="${t.id}" data-method="fly">🗡 Kiếm ~${t.flySec ?? '?'}s</button>`);
      html += `<div class="prow"><span class="pname">${t.name}<span class="pdesc">${meta}${t.boatOnly ? ' · Đảo ngoài biển' : ''}</span></span><span style="display:flex;gap:4px;flex-wrap:wrap;justify-content:flex-end">${btnsHtml.join('')}</span></div>`;
    }
    btns.innerHTML = html || '<div class="panelSub">Không có đường đi nào từ đây.</div>';
    btns.querySelectorAll<HTMLButtonElement>('[data-travel]').forEach((btn) => {
      btn.onclick = () => {
        this.socket.emit('travel_to', { mapId: btn.dataset.travel, method: btn.dataset.method || 'portal' });
        p.style.display = 'none';
      };
    });
  }

  // GĐ60: panel BẢN ĐỒ THẾ GIỚI (bấm vào minimap) — chi tiết map hiện tại
  // (canvas to: cổng, hố lửa, đặc sản, vật trang trí, điểm giao hàng) + sổ
  // mọi map: quái gì, khóa cổng ra sao, đi hết bao nhiêu Linh thạch.
  private renderWorldMap(d: OverviewData): void {
    const p = document.getElementById('worldMapPanel');
    if (!p) return;
    this.closePanels();
    p.style.display = 'block';
    const title = document.getElementById('wmTitle');
    if (title) title.textContent = `🗺 ${d.current.name}`;
    const cv = document.getElementById('wmCanvas') as HTMLCanvasElement | null;
    const ctx = cv?.getContext('2d');
    if (cv && ctx) {
      // GĐ64: chiều cao canvas theo ĐÚNG tỉ lệ map (hết dải đen thừa trên/dưới)
      const wantH = Math.max(170, Math.min(430, Math.round(cv.width * (d.current.h / Math.max(1, d.current.w)))));
      if (cv.height !== wantH) cv.height = wantH;
      const W = cv.width, H = cv.height;
      const sc = Math.min(W / d.current.w, H / d.current.h);
      const ox = (W - d.current.w * sc) / 2, oy = (H - d.current.h * sc) / 2;
      // GĐ65: nền gradient + lưới thưa/mờ hơn (400px, alpha 0.04) cho đỡ rối
      const grad = ctx.createLinearGradient(0, 0, 0, H);
      grad.addColorStop(0, '#1b2f24'); grad.addColorStop(1, '#0e1c15');
      ctx.fillStyle = grad; ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = 'rgba(255,255,255,0.04)'; ctx.lineWidth = 1;
      for (let gx = 0; gx <= d.current.w; gx += 400) { ctx.beginPath(); ctx.moveTo(ox + gx * sc, oy); ctx.lineTo(ox + gx * sc, oy + d.current.h * sc); ctx.stroke(); }
      for (let gy = 0; gy <= d.current.h; gy += 400) { ctx.beginPath(); ctx.moveTo(ox, oy + gy * sc); ctx.lineTo(ox + d.current.w * sc, oy + gy * sc); ctx.stroke(); }
      // GĐ65: hộp nhãn đã đặt — nhãn mới (vùng/NPC) phải tránh đè lên chúng
      const placed: Array<{ l: number; t: number; r: number; b: number }> = [];
      const boxHits = (b: { l: number; t: number; r: number; b: number }, m = 3) => placed.some((p) => b.l < p.r + m && b.r > p.l - m && b.t < p.b + m && b.b > p.t - m);
      const pill = (text: string, cx: number, cy: number, fg: string, border: string) => {
        ctx.font = '10px sans-serif';
        const w = ctx.measureText(text).width + 12, h = 17;
        const l = Math.max(2, Math.min(W - w - 2, cx - w / 2)), t = Math.max(2, Math.min(H - h - 2, cy - h / 2));
        ctx.beginPath(); ctx.roundRect(l, t, w, h, 5);
        ctx.fillStyle = 'rgba(6,14,10,0.88)'; ctx.fill();
        ctx.strokeStyle = border; ctx.lineWidth = 1; ctx.stroke();
        ctx.fillStyle = fg; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(text, l + w / 2, t + h / 2 + 0.5);
        ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
        return { l, t, r: l + w, b: t + h };
      };
      // khung vùng (làng / tông môn / bí cảnh ở map nhà): nền rất nhạt + nhãn pill
      for (const z of d.current.zones || []) {
        const zx = ox + z.x * sc, zy = oy + z.y * sc, zw = z.w * sc, zh = z.h * sc;
        ctx.fillStyle = 'rgba(87,201,139,0.05)'; ctx.fillRect(zx, zy, zw, zh);
        ctx.strokeStyle = 'rgba(87,201,139,0.35)'; ctx.lineWidth = 1.2; ctx.strokeRect(zx, zy, zw, zh);
        ctx.font = '10px sans-serif';
        const tw = ctx.measureText(z.label).width + 12;
        placed.push(pill(z.label, zx + 5 + tw / 2, zy + 13.5, 'rgba(215,255,228,0.9)', 'rgba(87,201,139,0.4)'));
      }
      ctx.strokeStyle = 'rgba(139,233,201,0.55)'; ctx.lineWidth = 2;
      ctx.strokeRect(ox, oy, d.current.w * sc, d.current.h * sc);
      const dot = (x: number, y: number, col: string, r: number) => { ctx.beginPath(); ctx.arc(ox + x * sc, oy + y * sc, r, 0, Math.PI * 2); ctx.fillStyle = col; ctx.fill(); };
      for (const it of d.current.decor) dot(it.x, it.y, 'rgba(230,240,230,0.22)', 1.5);
      for (const hz of d.current.hazards) dot(hz.x, hz.y, '#f0643c', Math.max(3, hz.r * sc));
      if (d.current.features?.volcano) dot(d.current.features.volcano.x, d.current.features.volcano.y, '#e5484d', 8);
      for (const c of d.current.features?.caves || []) dot(c.x, c.y, '#7fd1e8', 7);
      // GĐ65: NPC — chấm vàng viền tối + nhãn pill. Thử 4 vị trí (phải/trái/
      // trên/dưới); vị trí nào cũng đè thì xếp chồng xuống dưới kèm đường
      // nối mảnh từ chấm tới nhãn — hết cảnh tên đè lên nhau ở giữa làng.
      const placeNpc = (n: { x: number; y: number; name: string }) => {
        const sx = ox + n.x * sc, sy = oy + n.y * sc;
        ctx.font = '10px sans-serif';
        const w = ctx.measureText(n.name).width + 12, h = 17;
        const cands = [
          { l: sx + 9, t: sy - h / 2 },
          { l: sx - 9 - w, t: sy - h / 2 },
          { l: sx - w / 2, t: sy - 9 - h },
          { l: sx - w / 2, t: sy + 9 },
        ];
        let box = cands.find((c) => c.l >= 2 && c.t >= 2 && c.l + w <= W - 2 && c.t + h <= H - 2 && !boxHits({ l: c.l, t: c.t, r: c.l + w, b: c.t + h }));
        if (!box) {
          const below = placed.filter((p) => p.l < sx + 30 && p.r > sx - 30 && p.t >= sy - 20).reduce((m, p) => Math.max(m, p.b), sy + 9);
          box = { l: Math.max(2, Math.min(W - w - 2, sx - w / 2)), t: below + 3 };
        }
        const b = { l: box.l, t: box.t, r: box.l + w, b: box.t + h };
        const nx = Math.max(b.l, Math.min(sx, b.r)), ny = Math.max(b.t, Math.min(sy, b.b));
        ctx.strokeStyle = 'rgba(255,217,77,0.45)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(nx, ny); ctx.stroke();
        placed.push(pill(n.name, b.l + w / 2, b.t + h / 2, '#ffe9a8', 'rgba(255,217,77,0.4)'));
        dot(n.x, n.y, '#ffd94d', 4);
        ctx.beginPath(); ctx.arc(sx, sy, 5.5, 0, Math.PI * 2); ctx.strokeStyle = 'rgba(6,14,10,0.9)'; ctx.lineWidth = 1.4; ctx.stroke();
      };
      for (const n of d.current.npcs || []) placeNpc(n);
      // cổng dịch chuyển: hình thoi xanh lá (khác hẳn chấm tròn của NPC)
      const px = ox + d.current.portal.x * sc, py = oy + d.current.portal.y * sc;
      ctx.beginPath(); ctx.moveTo(px, py - 7); ctx.lineTo(px + 7, py); ctx.lineTo(px, py + 7); ctx.lineTo(px - 7, py); ctx.closePath();
      ctx.fillStyle = '#57c98b'; ctx.fill(); ctx.strokeStyle = 'rgba(6,14,10,0.9)'; ctx.lineWidth = 1.2; ctx.stroke();
      if (this.myChar?.escort && this.myChar.escort.dest === d.current.mapId) dot(this.myChar.escort.delivery.x, this.myChar.escort.delivery.y, '#ffd94d', 6);
      const me = this.myContainer;
      if (me) {
        dot(me.x, me.y, '#ffffff', 4.5);
        ctx.beginPath(); ctx.arc(ox + me.x * sc, oy + me.y * sc, 7.5, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(20,26,22,0.9)'; ctx.lineWidth = 1.6; ctx.stroke();
      }
    }
    const body = document.getElementById('wmBody');
    if (!body) return;
    const cur = d.current;
    const featTxt = [cur.features?.volcano ? '🌋 Núi lửa' : '', (cur.features?.caves?.length ? '🧊 Hang băng' : ''), (cur.hazards.length ? `🔥 ${cur.hazards.length} hố lửa (đứng vào bị thiêu!)` : '')].filter(Boolean).join(' · ');
    let html = `<div class="prow"><span class="pname">Đang ở: ${cur.name}<span class="pdesc">${cur.theme === 'village' ? 'Làng quê' : 'Chủ đề: ' + cur.theme} · Cổng dịch chuyển có vòng tròn xanh lá${featTxt ? ' · ' + featTxt : ''}<br/>Quái ở đây: ${cur.monsters.map((m) => `${m.name} ×${m.count}`).join(', ') || 'không có'}</span></span></div>`;
    html += '<div class="wmLegend"><span>⚪ Vị trí của bạn</span><span>◆ Cổng dịch chuyển</span>' + (cur.npcs?.length ? '<span>🟡 NPC (tên trong khung vàng)</span>' : '') + '<span>chấm mờ = cây / nhà</span></div>';
    html += '<div class="panelSub" style="margin-top:6px">TẤT CẢ BẢN ĐỒ — bấm Đi nếu đang đứng cạnh Trận Dịch Chuyển của map hiện tại:</div>';
    const CATL: Record<string, string> = { city: '🏯 Thành thị', profession: '🛠 Đất nghề', farm: '⚔ Bãi săn', elemental: '🌋 Vùng ngũ hành', current: '🏡 Làng' };
    let lastCat = '';
    for (const m of d.maps) {
      if (m.category !== lastCat) { lastCat = m.category; html += `<div class="panelSub" style="margin-top:8px">${CATL[m.category] || m.category}</div>`; }
      const right = !m.canEnter
        ? `<span style="color:#c9a0a0">🔒 ${m.needText}</span>`
        : m.reachable
          ? `<button class="pbtn gold" data-wm-travel="${m.id}">Đi</button>`
          : '<span style="color:#9fb8a8">Qua Thanh Vân Thành</span>';
      html += `<div class="prow"><span class="pname">${m.name}${m.boatOnly ? ' 🏝' : ''}<span class="pdesc">${m.safe ? 'An toàn' : 'Nguy hiểm'}${m.boatOnly ? ' · Đảo biển (thuyền/ngự kiếm)' : ` · Dịch chuyển ${m.cost > 0 ? m.cost + ' LT' : 'miễn phí'}`}<br/>Quái: ${m.monsters.map((x) => `${x.name} ×${x.count}`).join(', ') || '—'}</span></span>${right}</div>`;
    }
    body.innerHTML = html;
    body.querySelectorAll<HTMLButtonElement>('[data-wm-travel]').forEach((b) => {
      b.onclick = () => {
        p.style.display = 'none';
        this.socket.emit('travel_to', { mapId: b.dataset.wmTravel, method: 'portal' });
      };
    });
    const close = document.getElementById('wmClose');
    if (close) close.onclick = () => { p.style.display = 'none'; };
  }

  private openNpcDialog(d: NpcDialogData): void {
    const p = document.getElementById('npcDialog');
    if (!p) return;
    this.closePanels();
    p.style.display = 'block';
    const title = document.getElementById('npcDlgTitle');
    if (title) title.textContent = `${d.name} · Tính cách: ${d.personality}`;
    const affEl = document.getElementById('npcDlgAff');
    if (affEl) {
      const tier = d.affinity >= 50
        ? ' — Rất thân thiết: giảm giá mua 10% (nếu là chủ tiệm) + đã mở nhiệm vụ riêng'
        : d.affinity <= -50
          ? ' — NPC này từ chối giao dịch với bạn!'
          : ' — Thiện cảm ≥ 50 mở nhiệm vụ riêng + giảm giá 10%';
      affEl.textContent = `💛 Thiện cảm: ${d.affinity}/100${d.gained ? ` (+${d.gained} vì trò chuyện hôm nay)` : ''}${tier}`;
    }
    const textEl = document.getElementById('npcDlgText');
    if (textEl) textEl.textContent = `“${d.text}”`;
    const btns = document.getElementById('npcDlgBtns');
    if (!btns) return;
    let html = '';
    for (const c of d.claimable) {
      html += `<div class="prow"><span class="pname">✔ ${c.name}<span class="pdesc">Đã hoàn thành — trả ngay tại đây</span></span><button class="pbtn gold" data-claim="${c.questId}">Trả +${c.rewardStones} LT</button></div>`;
    }
    // GĐ40: duyệt DANH SÁCH nhiệm vụ riêng (chuỗi vụ án có 2 phần)
    const pqList = d.personalQuests || (d.personalQuest ? [d.personalQuest] : []);
    for (const pq of pqList) {
      if (pq.state === 'available') {
        html += `<div class="prow"><span class="pname">⭐ ${pq.name} (nhiệm vụ riêng)<span class="pdesc">${pq.desc} · Thưởng ${pq.rewardStones} LT</span></span><button class="pbtn gold" data-accept="${pq.questId}">Nhận</button></div>`;
      } else if (pq.state === 'locked') {
        html += `<div class="prow"><span class="pname">🔒 Nhiệm vụ riêng<span class="pdesc">Mở khi thiện cảm với ${d.name} đạt 50 (hiện ${d.affinity}) — trò chuyện mỗi ngày, mua bán và trả nhiệm vụ để tăng</span></span></div>`;
      } else if (!pq.ready) {
        html += `<div class="prow"><span class="pname">⭐ ${pq.name} (nhiệm vụ riêng)<span class="pdesc">${pq.desc} · Tiến độ ${pq.progress}/${pq.target}</span></span></div>`;
      }
    }
    if (d.shopId) {
      html += `<div class="prow"><span class="pname">🛒 Mua bán<span class="pdesc">Vào tiệm của ${d.name}</span></span><button class="pbtn" data-shop="${d.shopId}">Vào tiệm</button></div>`;
    }
    // GĐ40+: khối CHỈ ĐÍCH DANH thủ phạm (vụ trộm — đủ 3 manh mối)
    if (d.accuse && d.accuse.length) {
      html += `<div class="prow"><span class="pname">🔍 Vụ án Kẻ Trộm<span class="pdesc">Bạn đã có đủ 3 manh mối. Chỉ đích danh thủ phạm — CHỈ SAI là vụ án khép lại và mất thiện cảm!</span></span></div>`;
      for (const s of d.accuse) {
        html += `<div class="prow"><span class="pname">👤 ${s.name}</span><button class="pbtn gold" data-accuse="${s.npcId}">Chỉ đích danh</button></div>`;
      }
    }
    // GĐ40+: thương nhân — hint thế giới + trạng thái đơn đặt hàng
    if (d.merchantInfo) {
      this.lastMerchantInfo = d.merchantInfo;
      html += `<div class="prow"><span class="pname">🗞️ Tin đồn thương nhân kể<span class="pdesc">${d.merchantInfo.hint}</span></span></div>`;
      if (d.merchantInfo.order) {
        html += `<div class="prow"><span class="pname">📦 Đơn đang đặt: ${ITEM_INFO[d.merchantInfo.order.itemId]?.name || d.merchantInfo.order.itemId}<span class="pdesc">Lần ghé SAU của thương nhân, quay lại đây nhận hàng</span></span></div>`;
      }
    }
    // GĐ30: khối TÔNG MÔN trong hộp thoại Sứ Giả
    const si = d.sectInfo;
    if (si) {
      html += `<div class="prow"><span class="pname">⚜️ Công trạng của bạn: ${si.merit}<span class="pdesc">Nhiệm vụ bảng đã xong: ${si.boardQuests}/10${si.letter ? ' · ✉️ Đã có Thư Tiến Cử' : ''} · Nay là tháng ${si.clock.month} năm ${si.clock.year}${si.sectName ? ` · 🏯 Bạn là đệ tử ${si.sectName}` : ''}</span></span></div>`;
      for (const w of [si.thienkiem, si.huyenthien]) {
        const status = si.sect
          ? 'Bạn đã có tông môn — một người chỉ thờ một tông.'
          : w.open
            ? (w.canJoin ? 'Đợt chiêu mộ ĐANG MỞ và bạn ĐỦ điều kiện!' : `Đợt chiêu mộ ĐANG MỞ — còn thiếu: ${w.missing.join('; ')}`)
            : `Đang đóng — ${w.windowText}`;
        html += `<div class="prow"><span class="pname">🏯 ${w.name}<span class="pdesc">${w.needText}<br/>${status}</span></span>${!si.sect && w.canJoin ? `<button class="pbtn gold" data-join="${w.id}">Gia nhập</button>` : ''}</div>`;
        if (w.id === 'huyenthien' && !si.sect && w.open && !w.trialPassed) {
          html += `<div class="prow"><span class="pname">⚔️ Thử Thách Thú<span class="pdesc">Thắng nó mới đủ tư cách vào Huyền Thiên Tông (cần Trúc Cơ + 500 Công trạng)</span></span><button class="pbtn" data-trial="1">Nhận thử thách</button></div>`;
        }
      }
      // GĐ79: 30 tông mới — nhóm theo cỡ, mỗi tông ghi trụ sở (thành phố)
      if (si.list && si.list.length) {
        const groups: Array<[string, string]> = [
          ['lon', '🏯 Tông lớn — chiêu mộ từ Kim Đan'],
          ['vua', '🏯 Tông vừa — chiêu mộ từ Trúc Cơ'],
          ['nho', '🏯 Tông nhỏ — chiêu mộ từ Luyện Khí'],
        ];
        for (const [size, header] of groups) {
          const rows = si.list.filter((s) => s.size === size);
          if (!rows.length) continue;
          html += `<div class="prow"><span class="pname">${header}</span></div>`;
          for (const w of rows) {
            const status = si.sect
              ? 'Bạn đã có tông môn — một người chỉ thờ một tông.'
              : w.canJoin
                ? 'Đợt chiêu mộ ĐANG MỞ và bạn ĐỦ điều kiện!'
                : `Còn thiếu: ${w.missing.join('; ')}`;
            html += `<div class="prow"><span class="pname">🏯 ${w.name}<span class="pdesc">Trụ sở: ${w.homeCityName} · ${w.needText}<br/>${status}</span></span>${!si.sect && w.canJoin ? `<button class="pbtn gold" data-join="${w.id}">Gia nhập</button>` : ''}</div>`;
          }
        }
      }
      if (si.sect) {
        html += `<div class="prow"><span class="pname">🏪 Tiệm Tông Môn + Kho Đan<span class="pdesc">Giá ưu đãi cho đệ tử — đan đột phá rẻ hơn Tiệm Đan Dược</span></span><button class="pbtn" data-shop="tiem_tong_mon">Vào tiệm</button></div>`;
        html += `<div class="prow"><span class="pname">⚜️ Đổi Công trạng<span class="pdesc">50 Công trạng → +1 điểm chỉ số tự do (tỉ lệ tạm)</span></span><button class="pbtn" data-exchange="1">Đổi 50</button></div>`;
        // GĐ54: danh sách CÔNG PHÁP TÔNG MÔN — bậc Trúc Cơ theo lớp + vũ khí đang cầm, điều kiện đã giảm 5 điểm
        // GĐ80: tông mới → danh sách là CÔNG PHÁP RIÊNG của tông (mọi bậc, chỉ đệ tử tông đó)
        if (si.skills) {
          html += `<div class="prow"><span class="pname">📜 Công pháp ${si.sectName}<span class="pdesc">${si.sectSkills ? `Công pháp riêng của tông — ${si.skills.length} chiêu, chỉ đệ tử tông mới học được (học tại Sứ Giả).` : 'Công pháp riêng của tông — bậc Trúc Cơ theo lớp và vũ khí bạn đang cầm. Đệ tử học tại tông được GIẢM 5 điểm mỗi điều kiện chỉ số (theo lệ tông môn).'}</span></span></div>`;
          if (!si.skills.length) html += `<div class="prow"><span class="pname">${si.sectSkills ? '— Tông này chưa có công pháp riêng —' : '— Vũ khí này chưa có công pháp tông —'}</span></div>`;
          for (const sk of si.skills) {
            const right = sk.learned
              ? `<span class="pdesc">✅ Đã lĩnh hội</span>`
              : sk.isLearning
                ? `<span class="pdesc">🧘 Đang lĩnh ngộ…</span>`
                : sk.canLearn
                  ? `<button class="pbtn gold" data-sectlearn="${sk.id}">Học</button>`
                  : `<span class="pdesc">${sk.missingText}</span>`;
            const condLine = sk.sectSkill
              ? `Điều kiện: ${sk.condText}`
              : `Điều kiện gốc: ${sk.condText || '—'} → đệ tử chỉ cần: ${sk.sectCondText || '—'}`;
            html += `<div class="prow"><span class="pname">${sk.name}<span class="pdesc">Hệ số ${sk.coef} · Hồi ${sk.cdMs / 1000}s · Chân nguyên ${sk.cost}${sk.fxText ? ` · ${sk.fxText}` : ''}<br/>${condLine}</span></span>${right}</div>`;
          }
        }
      }
    }
    // GĐ60: LÁI BUÔN — việc hộ tống thương nhân (đi lại + kiếm Linh thạch)
    const ei = d.escortInfo;
    if (ei) {
      if (ei.active) {
        html += `<div class="prow"><span class="pname">🧳 Đang hộ tống tới ${ei.active.destName}<span class="pdesc">Đưa thương nhân tới điểm giao hàng (cột sáng vàng) ở giữa bản đồ đích. Bỏ chuyến thì thương nhân tự về làng an toàn.</span></span><button class="pbtn" data-escort-abandon="1">Bỏ chuyến</button></div>`;
      } else {
        html += `<div class="prow"><span class="pname">🧳 Việc hộ tống<span class="pdesc">Đưa thương nhân tới giữa bản đồ đích — đi qua Trận Dịch Chuyển miễn phí cho chuyến này, tới nơi được thưởng Linh thạch + Tu vi. Quái sẽ phục kích lúc đoàn tới nơi!</span></span></div>`;
        for (const m of ei.missions) {
          html += `<div class="prow"><span class="pname">${m.name}<span class="pdesc">Thưởng ${m.reward.stones} Linh thạch + ${m.reward.tuVi} Tu vi</span></span><button class="pbtn gold" data-escort="${m.id}">Nhận hộ tống</button></div>`;
        }
        if (!ei.missions.length) html += '<div class="prow">Cảnh giới của bạn chưa đủ cho chuyến nào — hãy tu luyện thêm.</div>';
      }
    }
    // GĐ57: CỔNG BÍ CẢNH — nút qua cổng (đệ tử mới vào được; cổng ra ai cũng qua)
    const ri = d.realmInfo;
    if (ri) {
      if (ri.dir === 'enter') {
        html += `<div class="prow"><span class="pname">🌀 Bí Cảnh Thạch Lâm<span class="pdesc">${ri.canEnter ? `Cổng nhận ra ấn ký đệ tử ${ri.sectName} — phía trong có Kiếm Ma, Huyết Lang và Thạch Khôi Lỗi (bậc Trúc Cơ), rương theo hạng Mạnh.` : ri.missingText}</span></span>${ri.canEnter ? '<button class="pbtn gold" data-realm="enter">Vào bí cảnh</button>' : ''}</div>`;
      } else {
        html += `<div class="prow"><span class="pname">🌀 Cổng Trở Về<span class="pdesc">Qua cổng là về sân Thanh Phong Môn, Làng Tân Thủ.</span></span><button class="pbtn gold" data-realm="exit">Về làng</button></div>`;
      }
    }
    btns.innerHTML = html || '<div class="prow">Không có việc gì thêm lúc này.</div>';
    btns.querySelectorAll<HTMLButtonElement>('[data-claim]').forEach((b) => {
      b.onclick = () => { this.socket.emit('quest_claim', { questId: b.dataset.claim }); this.closePanels(); };
    });
    btns.querySelectorAll<HTMLButtonElement>('[data-accept]').forEach((b) => {
      b.onclick = () => { this.socket.emit('quest_accept', { questId: b.dataset.accept }); this.closePanels(); };
    });
    btns.querySelectorAll<HTMLButtonElement>('[data-shop]').forEach((b) => {
      b.onclick = () => { this.closePanels(); if (b.dataset.shop) this.openShop(b.dataset.shop); };
    });
    // GĐ30: các nút tông môn — bấm xong KHÔNG đóng hộp thoại (server trả lỗi/kết quả qua toast; mở lại hộp thoại để xem trạng thái mới)
    btns.querySelectorAll<HTMLButtonElement>('[data-join]').forEach((b) => {
      b.onclick = () => { this.socket.emit('join_sect', { sectId: b.dataset.join }); setTimeout(() => this.socket.emit('talk_npc', { npcId: 'npc_sugia' }), 350); };
    });
    btns.querySelectorAll<HTMLButtonElement>('[data-trial]').forEach((b) => {
      b.onclick = () => { this.socket.emit('start_sect_trial'); this.closePanels(); };
    });
    btns.querySelectorAll<HTMLButtonElement>('[data-exchange]').forEach((b) => {
      b.onclick = () => { this.socket.emit('exchange_merit'); setTimeout(() => this.socket.emit('talk_npc', { npcId: 'npc_sugia' }), 350); };
    });
    // GĐ54: học công pháp tông môn — bắt đầu lĩnh ngộ như học thường (đóng hộp thoại, nhân vật ngồi học tại chỗ)
    btns.querySelectorAll<HTMLButtonElement>('[data-sectlearn]').forEach((b) => {
      b.onclick = () => { this.socket.emit('learn_skill', { skillId: b.dataset.sectlearn, via: 'sect' }); this.closePanels(); };
    });
    // GĐ57: qua cổng bí cảnh — server dịch chuyển + nạp lại toàn cảnh, đóng hộp thoại
    btns.querySelectorAll<HTMLButtonElement>('[data-realm]').forEach((b) => {
      b.onclick = () => { this.socket.emit('realm_portal', { action: b.dataset.realm }); this.closePanels(); };
    });
    // GĐ60: nhận / bỏ việc hộ tống — nhận xong đóng hộp thoại, thương nhân xuất hiện cạnh người chơi
    btns.querySelectorAll<HTMLButtonElement>('[data-escort]').forEach((b) => {
      b.onclick = () => { this.socket.emit('escort_accept', { mapId: b.dataset.escort }); this.closePanels(); };
    });
    btns.querySelectorAll<HTMLButtonElement>('[data-escort-abandon]').forEach((b) => {
      b.onclick = () => { this.socket.emit('escort_abandon'); this.closePanels(); };
    });
    // GĐ40+: nút chỉ đích danh — bấm xong mở lại hộp thoại Trưởng Làng xem kết quả
    btns.querySelectorAll<HTMLButtonElement>('[data-accuse]').forEach((b) => {
      b.onclick = () => { this.socket.emit('accuse_suspect', { npcId: b.dataset.accuse }); setTimeout(() => this.socket.emit('talk_npc', { npcId: 'npc_truonglang' }), 400); };
    });
    const close = document.getElementById('npcDlgClose');
    if (close) close.onclick = () => this.closePanels();
  }

  private refreshPanels(): void {
    if (this.openPanel === 'shop') this.renderShop();
    else if (this.openPanel === 'quest') this.renderQuestPanel();
    else if (this.openPanel === 'inv') this.renderInv();
    else if (this.openPanel === 'job') this.renderJobPanel();
    else if (this.openPanel === 'ach') this.renderAchPanel();
    else if (this.openPanel === 'learn') this.renderLearnPanel();
  }

  private openShop(shopId: string): void {
    this.currentShop = shopId;
    this.openPanel = 'shop';
    const p = document.getElementById('shopPanel');
    if (p) p.style.display = 'block';
    const q = document.getElementById('questPanel');
    if (q) q.style.display = 'none';
    this.renderShop();
  }

  private renderShop(): void {
    if (!this.myChar) return;
    const shop = SHOP_INFO[this.currentShop];
    if (!shop) return;
    const title = document.getElementById('shopTitle');
    if (title) title.textContent = shop.name;
    const stones = document.getElementById('shopStones');
    if (stones) stones.textContent = `💠 Linh thạch của bạn: ${this.myChar.stones}`;
    // GĐ24: thiện cảm với chủ tiệm → giảm giá mua 10% khi ≥50; nút trò chuyện
    const npcId = SHOP_NPC_CLIENT[this.currentShop];
    const aff = npcId ? (this.myChar.affinity?.[npcId] || 0) : 0;
    const discounted = !!npcId && aff >= 50;
    const affEl = document.getElementById('shopAff');
    if (affEl && npcId) {
      affEl.innerHTML = `💛 Thiện cảm với ${NPC_NAME_CLIENT[npcId]}: <b>${aff}</b>${discounted ? ' — đang GIẢM GIÁ MUA 10%!' : aff <= -50 ? ' — chủ tiệm TỪ CHỐI giao dịch!' : ' (≥50: giảm giá 10% + nhiệm vụ riêng)'} <button class="pbtn" id="shopTalkBtn" type="button">💬 Trò chuyện</button>`;
      const tb = document.getElementById('shopTalkBtn');
      if (tb) tb.onclick = () => this.socket.emit('talk_npc', { npcId });
    }
    const body = document.getElementById('shopBody');
    if (!body) return;
    // GĐ40+: tiệm THƯƠNG NHÂN chạy theo kho ngày: giá dao động + số lượng
    // ít + đặt hàng món không có (dữ liệu từ hộp thoại thương nhân)
    if (this.currentShop === 'luu_dong' && this.lastMerchantInfo) {
      const mi = this.lastMerchantInfo;
      let h = '';
      if (mi.order) h += `<div class="prow"><span class="pname">📦 Đang đặt: ${ITEM_INFO[mi.order.itemId]?.name || mi.order.itemId}<span class="pdesc">Nhận hàng ở lần ghé sau (trò chuyện với thương nhân)</span></span></div>`;
      for (const e of mi.stock) {
        const n = this.myChar.inventory[e.itemId] || 0;
        h += `<div class="prow"><span class="pname">${ITEM_INFO[e.itemId]?.name || e.itemId}<span class="pdesc">Hàng hôm nay — còn ${e.qty} · đang có ${n}</span></span><span>${e.price} LT</span><button class="pbtn" data-act="buy" data-item="${e.itemId}" ${e.qty <= 0 ? 'disabled' : ''}>${e.qty <= 0 ? 'Hết hàng' : 'Mua'}</button></div>`;
      }
      const inStock = new Set(mi.stock.filter((e) => e.qty > 0).map((e) => e.itemId));
      for (const c of mi.catalog) {
        if (inStock.has(c.itemId)) continue;
        h += `<div class="prow"><span class="pname">${ITEM_INFO[c.itemId]?.name || c.itemId}<span class="pdesc">Hôm nay không có — đặt trước, lần ghé sau nhận (giá đã gồm phí 10%)</span></span><span>${c.orderPrice} LT</span><button class="pbtn" data-order="${c.itemId}" ${mi.order ? 'disabled' : ''}>Đặt hàng</button></div>`;
      }
      for (const [itemId, price] of Object.entries(shop.buy)) {
        const n = this.myChar.inventory[itemId] || 0;
        h += `<div class="prow"><span class="pname">Bán ${ITEM_INFO[itemId]?.name || itemId}<span class="pdesc">đang có ${n}</span></span><span>+${price} LT</span><button class="pbtn" data-act="sell" data-item="${itemId}" ${n < 1 ? 'disabled' : ''}>Bán</button></div>`;
      }
      body.innerHTML = h;
      body.querySelectorAll<HTMLButtonElement>('.pbtn').forEach((b) => {
        b.onclick = () => {
          if (b.dataset.order) this.socket.emit('merchant_order', { itemId: b.dataset.order });
          else this.socket.emit(b.dataset.act === 'buy' ? 'shop_buy' : 'shop_sell', { shopId: this.currentShop, itemId: b.dataset.item });
        };
      });
      return;
    }
    let html = '';
    for (const [itemId, price0] of Object.entries(shop.sell)) {
      const price = discounted ? Math.ceil(price0 * 0.9) : price0;
      const n = this.myChar.inventory[itemId] || 0;
      html += `<div class="prow"><span class="pname">${ITEM_INFO[itemId].name}<span class="pdesc">${ITEM_INFO[itemId].desc || ''} · đang có ${n}</span></span><span>${discounted ? `<s style="opacity:.55">${price0}</s> ` : ''}${price} LT</span><button class="pbtn" data-act="buy" data-item="${itemId}">Mua</button></div>`;
    }
    for (const [itemId, price] of Object.entries(shop.buy)) {
      const n = this.myChar.inventory[itemId] || 0;
      html += `<div class="prow"><span class="pname">Bán ${ITEM_INFO[itemId].name}<span class="pdesc">đang có ${n}</span></span><span>+${price} LT</span><button class="pbtn" data-act="sell" data-item="${itemId}" ${n < 1 ? 'disabled' : ''}>Bán</button></div>`;
    }
    body.innerHTML = html;
    body.querySelectorAll<HTMLButtonElement>('.pbtn').forEach((b) => {
      b.onclick = () =>
        this.socket.emit(b.dataset.act === 'buy' ? 'shop_buy' : 'shop_sell', {
          shopId: this.currentShop,
          itemId: b.dataset.item,
        });
    });
  }

  // GĐ40+: Bảng Vàng (xếp hạng) + Bảng Truy Nã — điểm đá cạnh Bảng treo thưởng
  private openBoardPanel(): void {
    this.closePanels();
    this.openPanel = 'bangvang';
    const p = document.getElementById('boardPanel');
    if (p) p.style.display = 'block';
    const body = document.getElementById('boardBody');
    if (body) body.innerHTML = '<div class="prow">Đang tải bảng…</div>';
    this.socket.emit('get_leaderboard');
  }

  private renderBoardPanel(d: { tuVi: Array<{ name: string; realm: string; tier: number; tuVi: number }>; tuLuyen: Array<{ name: string; totalTuVi: number }>; truyNa: Array<{ name: string; bounty: string; how: string }> }): void {
    const body = document.getElementById('boardBody');
    if (!body) return;
    const realmName = (r: string, t: number) => (r === 'lk' ? `Luyện Khí tầng ${t}` : r === 'tc' ? `Trúc Cơ tầng ${t}` : r === 'kd' ? `Kim Đan tầng ${t}` : 'Phàm Nhân');
    let html = '<div class="panelSub">🏆 BẢNG TU VI — cảnh giới cao nhất toàn server</div>';
    html += d.tuVi.length
      ? d.tuVi.map((r, i) => `<div class="prow"><span class="pname">${i + 1}. ${r.name}<span class="pdesc">${realmName(r.realm, r.tier)} · ${r.tuVi} Tu vi hiện có</span></span></div>`).join('')
      : '<div class="prow">Chưa có ai trên bảng.</div>';
    html += '<div class="panelSub" style="margin-top:8px">🧘 BẢNG TU LUYỆN — tổng Tu vi tích lũy cả đời (không mất khi đột phá)</div>';
    html += d.tuLuyen.map((r, i) => `<div class="prow"><span class="pname">${i + 1}. ${r.name}<span class="pdesc">Đã tích lũy ${r.totalTuVi} Tu vi</span></span></div>`).join('');
    html += '<div class="panelSub" style="margin-top:8px">🎯 BẢNG TRUY NÃ — mục tiêu đối đầu & vụ án</div>';
    html += d.truyNa.map((r) => `<div class="prow"><span class="pname">☠️ ${r.name}<span class="pdesc">Thưởng: ${r.bounty}<br/>${r.how}</span></span></div>`).join('');
    body.innerHTML = html;
  }

  private openQuestPanel(mode: 'board' | 'elder'): void {
    this.questMode = mode;
    this.openPanel = 'quest';
    const p = document.getElementById('questPanel');
    if (p) p.style.display = 'block';
    const s = document.getElementById('shopPanel');
    if (s) s.style.display = 'none';
    this.renderQuestPanel();
  }

  private renderQuestPanel(): void {
    if (!this.myChar) return;
    const title = document.getElementById('questTitle');
    if (title) title.textContent = this.questMode === 'board' ? '📋 Bảng Treo Thưởng' : '👴 Trưởng Làng — Trả nhiệm vụ';
    const body = document.getElementById('questBody');
    if (!body) return;
    let html = '';
    for (const [qid, info] of Object.entries(QUEST_INFO)) {
      const q = this.myChar.quests[qid];
      const ready = !!q && q.state === 'active' && info.kind === 'item' && q.progress >= info.target;
      const npcName = info.npcId ? NPC_NAME_CLIENT[info.npcId] : 'Trưởng Làng';
      let right = '';
      if (this.questMode === 'board') {
        if (info.npcId) {
          // GĐ24: nhiệm vụ riêng — nhận/trả tại NPC qua trò chuyện, không qua bảng
          if (!q) right = `<span style="color:#9db8a4">🔒 Nhiệm vụ riêng của ${npcName} (thiện cảm ≥ 50)</span>`;
          else if (q.state === 'done' || ready) right = `<span style="color:#8be98b">✓ Xong — tới ${npcName} trả</span>`;
          else right = `<span>${q.progress}/${info.target}</span>`;
        }
        else if (!q) right = info.laCase && this.myChar.caseActive?.[qid] === false
          ? '<span style="color:#9db8a4">🔍 Vụ án chưa mở hôm nay — xem lại bảng ngày khác</span>'
          : `<button class="pbtn gold" data-accept="${qid}">Nhận</button>`;
        // GĐ74: nhiệm vụ bảng trả được ngay tại bảng (server chấp nhận cả
        // bảng lẫn Nhà Trưởng Làng) — trước đây bảng chỉ hiện chữ bảo đi
        // gặp Trưởng Làng nên bạn bè tưởng ấn trả không được.
        else if (q.state === 'done' || ready) right = `<button class="pbtn gold" data-claim="${qid}">Trả +${info.reward} LT</button>`;
        else if (info.duel) right = `<span>${q.progress}/${info.target}</span> <button class="pbtn gold" data-duel="${qid}">⚔ Đối đầu ${info.duel}</button>`; // GĐ40+
        else right = `<span>${q.progress}/${info.target}</span>`;
      } else {
        if (!q) right = info.npcId
          ? `<span style="color:#9db8a4">Chưa nhận (gặp ${npcName} khi thiện cảm ≥ 50)</span>`
          : '<span style="color:#9db8a4">Chưa nhận (ra Bảng treo thưởng)</span>';
        else if ((q.state === 'done' || ready) && info.npcId && info.npcId !== 'npc_truonglang') right = `<span style="color:#8be98b">✓ Xong — tới ${npcName} trả</span>`;
        else if (q.state === 'done' || ready) right = `<button class="pbtn gold" data-claim="${qid}">Trả +${info.reward} LT</button>`;
        else right = `<span>Đang làm ${q.progress}/${info.target}</span>`;
      }
      html += `<div class="prow"><span class="pname">${info.name}<span class="pdesc">${info.desc} · Thưởng ${info.reward} Linh thạch</span></span>${right}</div>`;
    }
    if (this.questMode === 'elder') html += '<div class="panelSub" style="margin-top:8px">Nhận nhiệm vụ mới tại Bảng treo thưởng giữa quảng trường.</div>';
    body.innerHTML = html;
    body.querySelectorAll<HTMLButtonElement>('[data-accept]').forEach((b) => {
      b.onclick = () => this.socket.emit('quest_accept', { questId: b.dataset.accept });
    });
    body.querySelectorAll<HTMLButtonElement>('[data-claim]').forEach((b) => {
      b.onclick = () => this.socket.emit('quest_claim', { questId: b.dataset.claim });
    });
    body.querySelectorAll<HTMLButtonElement>('[data-duel]').forEach((b) => {
      b.onclick = () => this.socket.emit('start_duel', { questId: b.dataset.duel }); // GĐ40+
    });
  }

  private toggleInv(): void {
    if (!this.myChar) return;
    if (this.openPanel === 'inv') {
      this.closePanels();
      return;
    }
    this.openPanel = 'inv';
    const p = document.getElementById('invPanel');
    if (p) p.style.display = 'block';
    this.renderInv();
  }

  // GĐ66 sửa nhỏ (2): panel Ví Linh thạch — liệt kê 4 phẩm theo file
  // thiết kế. MMO hiện chỉ có 1 số dư thật (Hạ phẩm = c.stones, mọi
  // giao dịch đều dùng nó); 3 phẩm cao chưa có cách kiếm/đổi trong
  // code nên hiện 0 kèm ghi chú, KHÔNG bịa số.
  private toggleStonesPanel(): void {
    if (!this.myChar) return;
    if (this.openPanel === 'stones') { this.closePanels(); return; }
    this.closePanels();
    this.openPanel = 'stones';
    const p = document.getElementById('stonesPanel');
    if (p) p.style.display = 'block';
    this.renderStonesPanel();
  }

  private renderStonesPanel(): void {
    const body = document.getElementById('stonesBody');
    if (!body || !this.myChar) return;
    // GĐ67: 4 phẩm, không dòng mô tả (theo ý người chơi) — Trung/Thượng
    // là số thật từ rương (TC+ / KD hậu+); GĐ69: Cực phẩm từ rương boss.
    const row = (name: string, n: number) =>
      `<div class="prow"><span class="pname">${name}</span><b>${n}</b></div>`;
    body.innerHTML =
      row('💠 Hạ phẩm', this.myChar.stones ?? 0) +
      row('🔷 Trung phẩm', this.myChar.stonesTrung ?? 0) +
      row('🔶 Thượng phẩm', this.myChar.stonesThuong ?? 0) +
      row('🟣 Cực phẩm', this.myChar.stonesCuc ?? 0);
  }

  private renderInv(): void {
    if (!this.myChar) return;
    const stones = document.getElementById('invStones');
    if (stones) stones.textContent = `💠 Linh thạch hạ phẩm: ${this.myChar.stones}`;
    const body = document.getElementById('invBody');
    if (!body) return;
    const entries = Object.entries(this.myChar.inventory).filter(([, n]) => n > 0);
    if (!entries.length) {
      body.innerHTML = '<div class="prow">Túi trống — hạ quái ngoài làng để nhặt Linh thạch và nguyên liệu.</div>';
      return;
    }
    body.innerHTML = entries
      .map(([itemId, n]) => {
        const usable = itemId === 'dan_hoi_nguyen' || itemId === 'dan_hoi_xuan' || itemId === 'sach_toa_thien'
          || itemId === 'phu_ho_than' || itemId === 'phu_tu_linh' || itemId === 'tran_ky' || itemId === 'banh_thit'
          || itemId === 'com_nam' || itemId === 'thit_nuong' || itemId === 'luong_kho'
          || itemId === 'nuoc_loc' || itemId === 'tra_thao_moc' || itemId === 'ruou_gao'; // GĐ26; GĐ78: + đồ ăn thức uống
        return `<div class="prow"><span class="pname">${ITEM_INFO[itemId]?.name || itemId} ×${n}<span class="pdesc">${ITEM_INFO[itemId]?.desc || ''}</span></span>${usable ? `<button class="pbtn" data-use="${itemId}">Dùng</button>` : ''}</div>`;
      })
      .join('');
    body.querySelectorAll<HTMLButtonElement>('[data-use]').forEach((b) => {
      b.onclick = () => this.socket.emit('use_item', { itemId: b.dataset.use });
    });
  }

  private updateHudBars(p: PlayerState): void {
    // GĐ55: nhịp lặp khi GIỮ nút cộng/trừ điểm chỉ số (theo tick 10 lần/s)
    const hold = this.statHold;
    if (hold) {
      if (!document.body.contains(hold.btn) || performance.now() - hold.since > 30000) this.statHold = null;
      else if (performance.now() - hold.since > 350) { this.stageStep(hold.stat, hold.dir); this.paintStats(); }
    }
    const hpFill = document.getElementById('hudHpFill') as HTMLElement | null;
    const hpText = document.getElementById('hudHpText');
    const mpFill = document.getElementById('hudMpFill') as HTMLElement | null;
    const mpText = document.getElementById('hudMpText');
    if (hpFill) hpFill.style.width = `${Math.max(0, (p.hp / Math.max(1, p.maxHp)) * 100)}%`;
    if (hpText) hpText.textContent = `HP ${p.hp} / ${p.maxHp}`;
    if (mpFill) mpFill.style.width = `${Math.max(0, (p.mp / Math.max(1, p.maxMp)) * 100)}%`;
    if (mpText) mpText.textContent = `Chân nguyên ${p.mp} / ${p.maxMp}`;
    // GĐ62: bản cảm ứng có cụm thanh riêng ở giữa dưới màn hình
    const hpFillT = document.getElementById('hudHpFillT') as HTMLElement | null;
    const hpTextT = document.getElementById('hudHpTextT');
    const mpFillT = document.getElementById('hudMpFillT') as HTMLElement | null;
    const mpTextT = document.getElementById('hudMpTextT');
    if (hpFillT) hpFillT.style.width = `${Math.max(0, (p.hp / Math.max(1, p.maxHp)) * 100)}%`;
    if (hpTextT) hpTextT.textContent = `HP ${p.hp} / ${p.maxHp}`;
    if (mpFillT) mpFillT.style.width = `${Math.max(0, (p.mp / Math.max(1, p.maxMp)) * 100)}%`;
    if (mpTextT) mpTextT.textContent = `Chân nguyên ${p.mp} / ${p.maxMp}`;
    // GĐ78: thanh thức ăn / nước uống (Kim Đan+ tịch cốc → ẩn)
    const needsEl = document.getElementById('hudNeeds');
    const isKd = ['kd', 'na', 'ht'].includes(p.realm || '');
    if (needsEl) needsEl.style.display = isKd ? 'none' : 'block';
    if (!isKd) {
      const food = p.food ?? 100, water = p.water ?? 100;
      const ff = document.getElementById('hudFoodFill') as HTMLElement | null;
      const ft = document.getElementById('hudFoodText');
      const wf = document.getElementById('hudWaterFill') as HTMLElement | null;
      const wt = document.getElementById('hudWaterText');
      if (ff) ff.style.width = `${Math.max(0, Math.min(100, food))}%`;
      if (ft) { ft.textContent = `🍖 Thức ăn ${food}/100`; ft.style.color = food <= 20 ? '#ff7a6b' : ''; }
      if (wf) wf.style.width = `${Math.max(0, Math.min(100, water))}%`;
      if (wt) { wt.textContent = `💧 Nước uống ${water}/100`; wt.style.color = water <= 20 ? '#ff7a6b' : ''; }
    }
  }

  // ---------------- Đồng bộ quái vật ----------------
  private syncMonsters(monsters: MonsterState[]): void {
    const seen = new Set<string>();

    for (const m of monsters) {
      seen.add(m.id);
      // GĐ60: quái đang ẩn nấp không lên minimap (giữ bất ngờ phục kích)
      if (m.hidden) this.monsterTargets.delete(m.id);
      else this.monsterTargets.set(m.id, { x: m.x, y: m.y });

      let actor = this.monsterActors.get(m.id);
      if (!actor) {
        actor = this.spawnMonsterActor(m);
        this.monsterActors.set(m.id, actor);
      }
      // GĐ61: ghi nhận trùm đang giao chiến gần nhất cho thanh máu trùm
      if ((m.boss || m.trial) && m.hp > 0 && m.hp < m.maxHp && this.myContainer) {
        const dd = Math.hypot(m.x - this.myContainer.x, m.y - this.myContainer.y);
        if (dd < 950 && (!this.bossShown || this.bossShown.id === m.id || dd < this.bossShown.dist)) {
          this.bossShown = { id: m.id, name: m.name || m.kind || 'Trùm', hp: m.hp, maxHp: m.maxHp, dist: dd, at: Date.now() };
        }
      }
      // GĐ60: ẩn/hiện hình quái phục kích — vừa hiện hình thì nảy hình vồ mồi
      const hid = !!m.hidden;
      if (actor.hiddenShown !== hid) {
        actor.hiddenShown = hid;
        actor.container.setVisible(!hid);
        if (!hid) {
          const bs = actor.sprite.scaleX;
          actor.sprite.setScale(bs * 1.35);
          this.tweens.add({ targets: actor.sprite, scale: bs, duration: 240, ease: 'Back.easeOut' });
        }
      }
      // Thanh máu: độ dài + màu theo % HP còn lại
      const frac = Math.max(0, m.hp) / m.maxHp;
      actor.barFg.width = 36 * frac;
      actor.barFg.fillColor = frac > 0.5 ? 0x53d769 : frac > 0.25 ? 0xf5a524 : 0xe5484d;
      // GĐ34: nhuộm màu quái theo trạng thái khống chế
      const stNow = m.st ?? null;
      if (actor.stShown !== stNow) {
        actor.stShown = stNow;
        if (stNow === 'stun') actor.sprite.setTint(0x7fb2ff);
        else if (stNow === 'slow') actor.sprite.setTint(0x9fe8ff);
        else if (stNow === 'root') actor.sprite.setTint(0xd8d8d8);
        else if (stNow === 'dot') actor.sprite.setTint(0xffa040);
        else if (stNow === 'windup') actor.sprite.setTint(0xff5040); // GĐ70: đang vận dậm băng → nhuộm đỏ cảnh báo
        else actor.sprite.clearTint();
      }
      // GĐ9: hướng mới nhất (vòng update lo mặt trái/phải) + nháy khi mất máu
      actor.dir = m.direction;
      if (m.hp < actor.lastHp) actor.flashUntil = this.time.now + 130;
      actor.lastHp = m.hp;
    }

    for (const id of Array.from(this.monsterActors.keys())) {
      if (!seen.has(id)) {
        this.monsterActors.get(id)?.container.destroy();
        this.monsterActors.delete(id);
        this.monsterTargets.delete(id);
      }
    }
  }

  // GĐ9: viên đạn chiêu bay từ người tung tới quái, chạm đích thì lóe sáng
  private spawnProjectile(casterId: string, targetId: string, elem: string): void {
    const from = this.actors.get(casterId)?.container;
    const to = this.monsterActors.get(targetId)?.container;
    if (!from || !to) return;
    const key = fxOrbKey(elem);
    const orb = this.add.image(from.x, from.y - 30, key).setDepth(to.y + 60);
    const dist = Math.hypot(to.x - from.x, to.y - from.y);
    const dur = Phaser.Math.Clamp(dist * 0.55, 110, 240);
    this.tweens.add({
      targets: orb,
      x: to.x,
      y: to.y - 8,
      duration: dur,
      ease: 'Quad.In',
      onComplete: () => {
        const flash = this.add.image(to.x, to.y - 8, key).setDepth(to.y + 61).setScale(1.7).setAlpha(0.85);
        this.tweens.add({
          targets: flash,
          scale: 3.1,
          alpha: 0,
          duration: 170,
          ease: 'Quad.Out',
          onComplete: () => flash.destroy(),
        });
        orb.destroy();
      },
    });
  }

  private spawnMonsterActor(m: MonsterState): MonsterActor {
    const face = (m.direction === 'left' ? -1 : 1) as 1 | -1;
    // GĐ19: trùm thử thách dùng hình Thạch Quái lớn + nhãn tên; Tâm Ma nhuộm tím
    const isTrial = !!m.trial;
    const isRival = m.trial === 'rival' || m.kind === 'kiemma'; // GĐ40: tu sĩ thù địch là NGƯỜI · GĐ57: Kiếm Ma cũng hình người (kiếm khách ma)
    // GĐ59: loài GDD mới mượn họ hình sẵn có (base) + nhuộm màu (tint) + tỉ lệ (scale)
    const vis = GDD_MONSTER_VISUAL[m.kind || ''];
    const base: 'wolf' | 'bat' | 'golem' | 'rival' = isTrial
      ? 'golem'
      : vis
        ? vis.base
        : isRival
          ? 'rival'
          : m.kind === 'golem' || m.kind === 'khoiloi'
            ? 'golem'
            : m.kind === 'bat'
              ? 'bat'
              : 'wolf';
    // GĐ42: tu sĩ thù địch dùng bộ sprite pixel 'rival'; nạp lỗi mới lùi về hình vẽ code cũ
    const rivalSet = base === 'rival' && this.textures.exists('rival-idle-south');
    // GĐ38: hình theo LOÀI — dơi dùng khung vỗ cánh, thạch quái hình đá
    const key = base === 'rival'
      ? rivalSet ? spriteTexKey('rival', m.direction, 'idle') : personTexKey('rivalmonk', m.direction, 'idle')
      : base === 'golem' ? 'golem-idle' : base === 'bat' ? 'bat-f0' : wolfTexKey(face, 'idle');
    const baseScale = base === 'rival' ? PERSON_TEX.scale : isTrial ? 1.2 : m.kind === 'khoiloi' ? 1.15 : base === 'golem' || base === 'bat' ? 1 : WOLF_TEX.scale;
    const sprite = rivalSet
      ? this.add.sprite(0, 0, key).setOrigin(0.5, HERO_ORIGIN_Y).setScale(HERO_SCALE * (vis?.scale ?? 1))
      : this.add.image(0, 0, key).setScale(baseScale * (vis?.scale ?? 1));
    if (isTrial && m.trial === 'dai') sprite.setTint(0x9a86d8);
    if (m.kind === 'khoiloi') sprite.setTint(0xa8c4de); // GĐ57: khôi lỗi đá xanh xám, khác Thạch Quái thường
    if (m.kind === 'huyetlang') sprite.setTint(0xe58a8a); // GĐ57: Huyết Lang nhuộm đỏ
    if (vis) sprite.setTint(vis.tint); // GĐ59
    const tintN: number | null = vis ? vis.tint : m.kind === 'khoiloi' ? 0xa8c4de : m.kind === 'huyetlang' ? 0xe58a8a : isTrial && m.trial === 'dai' ? 0x9a86d8 : null;
    const barY = base === 'rival' ? (rivalSet ? -62 : -48) : base === 'golem' ? -56 : -30;
    const barBg = this.add.rectangle(0, barY, 38, 7, 0x101418).setAlpha(0.6);
    const barFg = this.add.rectangle(-18, barY, 36, 5, 0x53d769).setOrigin(0, 0.5);
    const parts: Phaser.GameObjects.GameObject[] = [sprite, barBg, barFg];
    if (m.name) {
      parts.push(
        this.add
          .text(0, barY - 6, m.name, { fontSize: isTrial ? '12px' : '11px', color: isTrial ? '#ffd9d9' : '#e8f0e9', fontStyle: 'bold' })
          .setOrigin(0.5, 1)
          .setShadow(1, 1, '#000', 2),
      );
    }
    const container = this.add.container(m.x, m.y, parts);
    container.setDepth(m.y);
    return {
      container, sprite, barFg, dir: m.direction, face, curTex: key, trial: m.trial || null, kind: m.kind, rivalSet, base, tintN, // GĐ59
      // (gán tiếp các trường còn lại ở dòng dưới của return gốc)
      walkPhase: 0, lastX: m.x, lastY: m.y, lastHp: m.hp,
      flashUntil: 0, lungeUntil: 0, nextLunge: 0,
    };
  }

  update(_time: number, delta: number): void {
    // Vòng quẻ của trận pháp xoay chậm liên tục
    if (this.formTrig) this.formTrig.rotation += delta * 0.00012;
    if (this.formStar) this.formStar.rotation -= delta * 0.00018;

    // Gợi ý tương tác theo điểm gần nhất (GĐ8) — kiểm tra 4 lần/giây
    if (this.myContainer && this.myChar && _time - this.lastHintCheck > 250) {
      this.lastHintCheck = _time;
      const hint = document.getElementById('interactHint');
      if (hint) {
        let text = '';
        const near = this.nearestInteract();
        if (near && this.myChar) {
          // Ngưỡng 70 < tầm server (80) để gợi ý hiện là bấm E chắc chắn ăn
          if (near.type === 'daoquan') {
            if (!this.myChar.linhCan) text = '✦ Bấm E — Đo linh căn';
            else if (this.myChar.realm === 'lk' && this.myChar.tier >= 3 && this.myChar.skills.length < 3)
              text = '✦ Bấm E — Học công pháp Luyện Khí';
          } else if (near.type === 'tulinh') {
            text = this.myChar.bequan
              ? '🧘 Đang BẾ QUAN tại Tụ Linh Trận (+3 Tu vi/ngày) — di chuyển để dừng'
              : '✦ Bấm E — Bế quan tại Tụ Linh Trận (+3 Tu vi/ngày)';
          } else if (near.type === 'board') {
            text = '✦ Bấm E — Bảng treo thưởng (nhận/trả nhiệm vụ)';
          } else if (near.type === 'bangvang') {
            text = '✦ Bấm E — Bảng Vàng (xếp hạng) · Bảng Truy Nã';
          } else if (near.type === 'elder') {
            const done = Object.values(this.myChar.quests || {}).some((q) => q.state === 'done');
            const itemReady = (this.myChar.inventory?.nanh_soi || 0) >= 3 && !!this.myChar.quests?.q_nanhsoi;
            text = done || itemReady
              ? '✦ Bấm E — Trả nhiệm vụ cho Trưởng Làng'
              : '✦ Trưởng Làng — nhận nhiệm vụ tại Bảng treo thưởng giữa làng';
          } else if (near.type === 'shop' && near.shopId) {
            text = `✦ Bấm E — Vào ${SHOP_INFO[near.shopId].name}`;
          } else if (near.type === 'sugia') {
            text = '✦ Bấm E — Sứ Giả Tông Môn (chiêu mộ đệ tử)';
          } else if (near.type === 'bicanh_in') {
            text = '✦ Bấm E — Cổng Bí Cảnh Thạch Lâm';
          } else if (near.type === 'bicanh_out') {
            text = '✦ Bấm E — Cổng Trở Về làng';
          } else if (near.type === 'laibuan') {
            text = '✦ Bấm E — Lái Buôn (nhận việc hộ tống thương nhân)';
          } else if (near.type === 'travel') {
            text = '✦ Bấm E — Trận Dịch Chuyển (đi bản đồ khác)';
          } else if (near.type === 'altar') {
            text = '🕯️ Bấm E — Đàn Tế (triệu hồi trùm map, 200 LT)';
          }
        }
        hint.textContent = text;
        hint.style.display = text ? 'block' : 'none';
        // GĐ66: bỏ nút E riêng — tích hợp vào nút ⚔: gần chỗ tương tác
        // được thì nút đánh thường hiện E (bấm là tương tác), còn không
        // thì vẫn là ⚔ đánh thường.
        this.touchInteract = !!text;
        const tAtk = document.getElementById('tAtk');
        if (tAtk) {
          const label = text ? 'E' : '⚔';
          if (tAtk.textContent !== label) tAtk.textContent = label;
          tAtk.classList.toggle('isInteract', !!text);
        }
      }
    }
    // GĐ17: banner khu vực + minimap + avatar (~3 lần/giây)
    if (this.inGame && _time - this.lastHudExtra > 300) {
      this.lastHudExtra = _time;
      this.refreshHudExtra();
    }

    // ---- INPUT: vector từ phím → gửi server khi thay đổi ----
    if (this.keys && this.socket?.connected) {
      let vx = 0;
      let vy = 0;
      if (this.keys.A.isDown || this.keys.LEFT.isDown) vx -= 1;
      if (this.keys.D.isDown || this.keys.RIGHT.isDown) vx += 1;
      if (this.keys.W.isDown || this.keys.UP.isDown) vy -= 1;
      if (this.keys.S.isDown || this.keys.DOWN.isDown) vy += 1;
      if (vx !== 0 && vy !== 0) {
        vx *= Math.SQRT1_2;
        vy *= Math.SQRT1_2;
      }
      // GĐ17: joystick cảm ứng (analog) ghi đè khi đang kéo
      if (this.touchVec.x !== 0 || this.touchVec.y !== 0) {
        vx = this.touchVec.x;
        vy = this.touchVec.y;
      }
      if (vx !== this.lastSent.vx || vy !== this.lastSent.vy) {
        this.lastSent = { vx, vy };
        this.socket.emit('client_input', this.lastSent);
      }
    }

    // ---- LERP hiển thị: người chơi + quái ----
    const k = 1 - Math.pow(0.0001, delta / 1000);
    for (const [id, actor] of this.actors) {
      const target = this.targets.get(id);
      if (!target) continue;
      const c = actor.container;
      c.x = Phaser.Math.Linear(c.x, target.x, k);
      c.y = Phaser.Math.Linear(c.y, target.y, k);
      c.setDepth(c.y);
      // GĐ9: hoạt ảnh đi / đứng / tung chiêu từ quãng đường đã trôi
      const moved = Math.hypot(c.x - actor.lastX, c.y - actor.lastY);
      actor.lastX = c.x;
      actor.lastY = c.y;
      const moving = moved > 0.08;
      if (moving) actor.walkPhase += moved / 7; // 1 vòng bước ≈ 44px như nhịp bản cũ
      const frame =
        _time < actor.castUntil
          ? 'cast'
          : moving
            ? 'w' + (Math.floor(actor.walkPhase / (Math.PI / 2)) % 4)
            : 'idle';
      const key = actor.spriteSet ? spriteTexKey(actor.spriteSet, actor.dir, frame) : personTexKey(actor.styleKey, actor.dir, frame);
      if (key !== actor.curTex) {
        actor.curTex = key;
        actor.sprite.setTexture(key);
      }
      // GĐ16: tư thế vũ khí cầm tay — nghỉ / đi (lắc nhẹ) / ra đòn theo nhóm
      if (actor.weaponImg && actor.weaponImg.visible) {
        const dir = actor.dir;
        const [ax, ay] = WPN_ANCHOR[dir] || WPN_ANCHOR.down;
        const rest = WPN_REST[dir] ?? 2.5;
        const wdef = weaponById(actor.classId, actor.weaponId);
        const motion = wdef ? weaponMotion(wdef.cat) : 'swing';
        let x = ax, y = ay, rot = rest;
        // Lắc nhẹ khi đi / thở khi đứng
        if (moving) y += Math.sin(actor.walkPhase) * 1.4;
        else rot += Math.sin(_time * 0.0022 + c.x * 0.05) * 0.035;
        if (_time < actor.castUntil) {
          const p = Math.min(1, Math.max(0, 1 - (actor.castUntil - _time) / 260));
          const s = Math.sin(p * Math.PI);
          const faceSign = dir === 'left' ? -1 : 1;
          if (motion === 'swing') {
            rot = rest + faceSign * (p < 0.25 ? -2.1 * (p / 0.25) : -2.1 + 3.0 * ((p - 0.25) / 0.75));
          } else if (motion === 'thrust') {
            const [vx2, vy2] = DIR_VEC[dir] || [0, 1];
            x += vx2 * s * 12; y += vy2 * s * 12;
            rot = WPN_THRUST_ROT[dir] ?? 3.0;
          } else if (motion === 'raise') {
            y -= s * 9;
            rot = rest + (0.2 * faceSign - rest) * Math.min(1, p * 1.6);
          } else {
            // guard (khiên): đưa ra trước một chút
            const [vx2, vy2] = DIR_VEC[dir] || [0, 1];
            x += vx2 * s * 3; y += vy2 * s * 3;
          }
          // Tay phụ (song kiếm/song đao): vung trễ nửa nhịp, phía đối diện
          if (actor.weaponImg2 && actor.weaponImg2.visible) {
            const p2 = Math.min(1, Math.max(0, p - 0.18));
            const rest2 = -rest;
            actor.weaponImg2.setPosition(-ax, ay + (moving ? Math.sin(actor.walkPhase + 1) * 1.4 : 0));
            actor.weaponImg2.setRotation(
              motion === 'swing' ? rest2 + -faceSign * (p2 < 0.25 ? -2.1 * (p2 / 0.25) : -2.1 + 3.0 * ((p2 - 0.25) / 0.75)) : rest2,
            );
          }
        } else if (actor.weaponImg2 && actor.weaponImg2.visible) {
          actor.weaponImg2.setPosition(-ax, ay + (moving ? Math.sin(actor.walkPhase + 1) * 1.4 : 0));
          actor.weaponImg2.setRotation(-rest + Math.sin(_time * 0.0022 + c.x * 0.05) * 0.035);
        }
        actor.weaponImg.setPosition(x, y);
        actor.weaponImg.setRotation(rot);
        // Quay lưng (hướng lên): vũ khí nằm sau lưng nhân vật
        const behind = dir === 'up';
        if (behind !== actor.wpnBehind) {
          actor.wpnBehind = behind;
          if (behind) actor.container.moveBelow(actor.weaponImg, actor.sprite);
          else actor.container.moveAbove(actor.weaponImg, actor.sprite);
          if (actor.weaponImg2) {
            if (behind) actor.container.moveBelow(actor.weaponImg2, actor.sprite);
            else actor.container.moveAbove(actor.weaponImg2, actor.sprite);
          }
        }
      }
    }
    for (const [id, actor] of this.monsterActors) {
      const target = this.monsterTargets.get(id);
      if (!target) continue;
      const c = actor.container;
      c.x = Phaser.Math.Linear(c.x, target.x, k);
      c.y = Phaser.Math.Linear(c.y, target.y, k);
      c.setDepth(c.y);
      // GĐ9: sói 2D — mặt theo hướng ngang gần nhất, chân bước theo quãng đường
      if (actor.dir === 'left') actor.face = -1;
      else if (actor.dir === 'right') actor.face = 1;
      const moved = Math.hypot(c.x - actor.lastX, c.y - actor.lastY);
      actor.lastX = c.x;
      actor.lastY = c.y;
      const moving = moved > 0.08;
      if (moving) actor.walkPhase += moved / 6; // 1 vòng bước ≈ 38px
      // Vồ cắn: đứng sát người chơi + hết nhịp chờ → khung vồ 260ms (khớp nhịp cắn server ~1s)
      if (_time >= actor.nextLunge) {
        let nearPlayer = false;
        for (const t of this.targets.values()) {
          if (Math.hypot(t.x - c.x, t.y - c.y) < 52) { nearPlayer = true; break; }
        }
        if (nearPlayer && !moving) {
          actor.lungeUntil = _time + 260;
          actor.nextLunge = _time + 1000;
        } else {
          actor.nextLunge = _time + (nearPlayer ? 200 : 300);
        }
      }
      const frame =
        _time < actor.lungeUntil
          ? 'lunge'
          : moving
            ? 'w' + (Math.floor(actor.walkPhase / (Math.PI / 2)) % 4)
            : 'idle';
      // GĐ19: trùm thử thách dùng khung hình Thạch Quái (slam khi vồ)
      // GĐ38: dơi vỗ cánh liên tục (4 khung), thạch quái thường đi như trùm
      // GĐ40: tu sĩ thù địch dùng khung NGƯỜI (đi bộ / kết ấn khi vồ)
      const key = actor.base === 'rival' // GĐ59: chọn khung theo họ hình đã chốt lúc dựng actor
        ? actor.rivalSet
          ? spriteTexKey('rival', actor.dir, _time < actor.lungeUntil ? 'cast' : frame === 'lunge' ? 'cast' : frame)
          : personTexKey('rivalmonk', actor.dir, _time < actor.lungeUntil ? 'cast' : frame === 'lunge' ? 'cast' : frame)
        : actor.base === 'golem'
        ? _time < actor.lungeUntil
          ? 'golem-slam'
          : moving
            ? 'golem-w' + (Math.floor(actor.walkPhase / (Math.PI / 2)) % 4)
            : 'golem-idle'
        : actor.base === 'bat'
          ? 'bat-f' + (Math.floor(_time / 110) % 4)
          : wolfTexKey(actor.face, frame);
      if (actor.base === 'bat') actor.sprite.setFlipX(actor.dir === 'left');
      if (key !== actor.curTex) {
        actor.curTex = key;
        actor.sprite.setTexture(key);
      }
      // Nháy sáng khi vừa trúng đòn
      if (_time < actor.flashUntil) actor.sprite.setTintFill(0xffe9e9);
      else if (actor.sprite.tintFill) {
        actor.sprite.clearTint();
        if (actor.tintN != null) actor.sprite.setTint(actor.tintN); // GĐ59: màu cố định của loài (GDD/khôi lỗi/huyết lang/Tâm Ma)
        if (actor.trial === 'dai') actor.sprite.setTint(0x9a86d8);
        if (actor.kind === 'khoiloi') actor.sprite.setTint(0xa8c4de); // GĐ57
        if (actor.kind === 'huyetlang') actor.sprite.setTint(0xe58a8a); // GĐ57
      }
    }

    // ---- Gà/vịt ambient: đi dạo quanh nhà, mổ thóc, né người chơi (như bản cũ) ----
    const dt = Math.min(delta, 100) / 1000;
    for (const b of this.birds) {
      b.t -= dt;
      let fleeing = false;
      for (const t of this.targets.values()) {
        const dp = Math.hypot(t.x - b.x, t.y - b.y);
        if (dp < 30 && dp > 0.01) {
          const ax = b.x + ((b.x - t.x) / dp) * 30, ay = b.y + ((b.y - t.y) / dp) * 30;
          if (this.birdSpotFree(ax, ay)) { b.tx = ax; b.ty = ay; b.state = 'walk'; fleeing = true; }
          break;
        }
      }
      if (b.state === 'walk') {
        const dx = b.tx - b.x, dy = b.ty - b.y, d = Math.hypot(dx, dy);
        if (d < 3) {
          b.state = Math.random() < 0.55 ? 'peck' : 'idle';
          b.t = 1.2 + Math.random() * 2.6;
        } else {
          b.face = dx >= 0 ? 1 : -1;
          b.x += (dx / d) * 17 * dt;
          b.y += (dy / d) * 17 * dt;
          b.walkPhase += dt * 9;
        }
      } else if (b.t <= 0 && !fleeing) {
        let picked = false;
        for (let tries = 0; tries < 8 && !picked; tries++) {
          const tx = b.hx + (Math.random() - 0.5) * 220, ty = b.hy + (Math.random() - 0.5) * 220;
          if (this.birdSpotFree(tx, ty)) { b.tx = tx; b.ty = ty; picked = true; }
        }
        if (picked) b.state = 'walk';
        else { b.state = 'idle'; b.t = 1 + Math.random() * 2; }
      }
      const frame =
        b.state === 'walk' ? 'w' + (Math.floor(b.walkPhase / Math.PI) % 2) : b.state === 'peck' ? 'peck' : 'idle';
      const key = birdTexKey(b.kind, b.ci, b.face, frame);
      if (key !== b.curTex) {
        b.curTex = key;
        b.img.setTexture(key);
      }
      b.img.x = b.x;
      b.img.y = b.y;
      b.img.setDepth(b.y);
    }
  }

  // Điểm gà/vịt được tới: trong làng, không dẫm quảng trường/vòng trận, không xuống ao, không xuyên nhà
  private birdSpotFree(x: number, y: number): boolean {
    if (x < 252 || x > 1148 || y < 192 || y > 928) return false;
    if (Math.hypot(x - 700, y - 560) < 178) return false;
    const pdx = (x - 990) / 87, pdy = (y - 890) / 57;
    if (pdx * pdx + pdy * pdy < 1) return false;
    for (const h of WORLD_GEO.houses) {
      if (x > h.x - 10 && x < h.x + h.w + 10 && y > h.y - 26 && y < h.y + h.h + 10) return false;
    }
    return true;
  }
}

new Phaser.Game({
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  scale: { mode: Phaser.Scale.EXPAND, autoCenter: Phaser.Scale.CENTER_BOTH }, // GĐ49: EXPAND — phủ kín màn hình, camera mở rộng tầm nhìn thay vì 2 dải đen (trước là FIT ở GĐ17)
  parent: 'wrap',
  scene: GameScene,
  backgroundColor: '#22391b', // GĐ49: tông cỏ tối — vùng ngoài bản đồ (màn siêu rộng/dọc) đọc như bóng rừng, không phải đen
  pixelArt: true, // GĐ16: khóa lọc NEAREST + làm tròn điểm ảnh toàn cục → hình pixel nét, không rung
});
