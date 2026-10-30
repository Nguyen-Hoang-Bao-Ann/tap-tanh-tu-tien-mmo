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
import { QUEST_INFO_CITY } from './city_quests_info'; // GĐ90: mirror nhiệm vụ thành phố (sinh bởi gen_city_quests.py)
import { QUEST_INFO_GD127 } from './quests_gd127_info'; // GĐ127: mirror nhiệm vụ mở rộng (sinh bởi gen_quests_gd127.py)
import { QUEST_INFO_GD129 } from './quests_gd129_info'; // GĐ129: mirror nhiệm vụ Cổ Thụ Yêu Giới (6 quest)
import { QUEST_INFO_GD130 } from './quests_gd130_info'; // GĐ130: mirror nhiệm vụ Cửu U Bí Cảnh (8 quest)
import { QUEST_INFO_GD131 } from './quests_gd131_info'; // GĐ131: mirror nhiệm vụ nghề phụ (15 quest)
import { QUEST_INFO_GD132 } from './quests_gd132_info'; // GĐ132: mirror nhiệm vụ nghề thu thập (6 quest)
import { QUEST_INFO_GD143 } from './quests_gd143_info'; // GĐ143: mirror nhiệm vụ Tiên/Ma (4 quest)
import { QUEST_INFO_GD145 } from './quests_gd145_info'; // GĐ145: mirror nhiệm vụ khảo hạch (6 quest)
import { io, Socket } from 'socket.io-client';
import { sound } from './sound'; // GĐ167: nhạc nền generative + hiệu ứng WebAudio
import { bakePersonTextures, personTexKey, personStyleKeyForPlayer, npcStyleKey, PERSON_TEX, bakeWorldTextures, WORLD_GEO, HOUSE_TEX, DAOQUAN_TEX, TREE_TEX, bakeMonsterTextures, bakeDropTextures, bakeChestTextures, wolfTexKey, WOLF_TEX, bakeBirdTextures, birdTexKey, BIRD_TEX, bakeFxTextures, fxOrbKey, ensurePersonVariant, drawPersonPreview, buildMapObjects, destroyBuiltMap, skillIconURL } from './gfx';
import type { MapEnterData, BuiltMap } from './gfx';
import { npcTalkLines, hashStr } from './npc_lines'; // GĐ150: lời thoại liên tục của NPC

// Gộp 1 địa chỉ (GĐ5): bản dựng chạy từ chính server cổng 3001 →
// kết nối cùng origin; khi dev bằng Vite (5173) thì trỏ sang 3001.
const SERVER_URL = window.location.port === '5173' ? 'http://localhost:3001' : '';
const HS175 = Math.sqrt(5); // GĐ175: diện tích ×5 (mỗi chiều ×√5) — khớp server
const hs175 = (v: number) => Math.round(v * HS175);
const WORLD_W = hs175(3400); // GĐ126: + phía đông cho làng mở rộng + Bí Cảnh Thạch Lâm dời đông (nền vẽ ở 2 texture riêng)
const WORLD_H = hs175(1200);
type Direction = 'left' | 'right' | 'up' | 'down';


// ---------------- Dữ liệu từ server ----------------
interface StatsData {
  khiHuyet: number;
  vatCong: number;
  vatPhong: number;
  phapCong: number;
  phapPhong: number;
  tocDo: number;
  minhMan: number;
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
  mutations?: string[]; // GĐ154: hệ biến dị roll lúc đo (chỉ Pháp Tu mới có phần tử)
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
  hiddenStats?: Record<string, number>; // GĐ144: chỉ số ẩn
  daoQuan?: { min: number; tier: number }; // GĐ144: giờ Đạo Quán + cấp thành tựu ẩn
  skillMastery?: Record<string, number>; // GĐ144: am hiểu từng chiêu
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  linhCan: LinhCanData | null;
  bienDi?: string | null; // GĐ100: hệ Biến Dị Pháp Tu (null = không có)
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
  // GĐ26: nghề phụ — GĐ131: kèm danh hiệu đầy đủ + sư phụ
  job: { jobId: string; jobName: string; crafts: number; rank: number; rankName: string; title?: string; master?: string | null } | null;
  job2: { jobId: string; jobName: string; crafts: number; rank: number; rankName: string; title?: string; master?: string | null } | null; // GĐ142: nghề thứ hai từ Nhập Đạo
  job3: { jobId: string; jobName: string; crafts: number; rank: number; rankName: string; title?: string; master?: string | null } | null; // GĐ160: nghề thứ ba từ Nguyên Anh
  // GĐ138: thành tựu chung — server tính sẵn trạng thái (bậc đạt, bậc đã nhận, danh hiệu, Đạo Tích)
  achievements: {
    daoTich: number;
    title: { achId: string; tier: number; text: string; level: number; color: string } | null;
    ownedTitles: Array<{ achId: string; tier: number; text: string; level: number; color: string }>;
    groups: Array<{ id: string; name: string; daoTich: number; daoTichMax: number; tiers: number; tiersMax: number; milestones: number[]; milestoneReached: number; complete: boolean; boost: number | null; boostAvailable: boolean; perks: Array<{ text: string; parked: boolean; why?: string }> }>;
    list: Array<{ id: string; group: string; name: string; desc: string; base: string; tiers: number[]; tier: number; claimed: number; progress: number; next: number | null; nextTitle: string | null; nextLevel: number | null; nextChest: string | null; nextDao: number; claimable: boolean }>;
    daoMilestones: Array<{ at: number; text: string; active: boolean | string; why?: string; reached: boolean }>;
    daoTitle: { text: string; unlocked: boolean; equipped: boolean };
  } | null;
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
  // GĐ133: buff đan dược đang còn hạn (server gửi trong welcome/char_sync)
  buffs?: Array<{ key: string; name: string; icon: string; until: number }>;
  teleportArray?: { mapId: string; x: number; y: number } | null; // GĐ135: Trận Dịch Chuyển (cho nút Gọi về)
  // GĐ119: trang bị (server gửi trong welcome/char_sync)
  gearBag?: Record<string, GearItem>;
  gear?: Record<string, string>;
  gearStats?: { attack: number; defense: number; hp: number; mp: number; speed: number; crit: number };
  gearOrders?: GearOrder[];
}

interface GearTalent {
  id: string;
  name: string;
  kind: string; // 'tot' | 'phe' | 'docnhat' (GĐ191: dòng nội tại độc nhất)
  stat: string;
  level: number;
  bonusPct: number;
  desc: string;
  fx?: Record<string, number>; // GĐ191: hiệu ứng riêng của dòng độc nhất
}

interface GearItem {
  uid: string;
  path: string;
  element: string;
  rarity: string;
  slot: string;
  weapon: string | null;
  name: string;
  prefix: string;
  tokenRank: number | null;
  tokenRankName: string | null;
  baseStats: Record<string, number>;
  talents: GearTalent[];
}

// GĐ194/GĐ195: xã hội — bạn bè / tổ đội / thẻ người chơi / bảng xếp hạng
interface FriendRow { name: string; online: boolean; classId: string; realm: string; tier: number; mapId: string | null }
interface PartyMemberRow { id: string; name: string; classId: string; realm: string; tier: number; hp: number; maxHp: number; mapId: string }
interface PartyState { id: string; leaderId: string; members: PartyMemberRow[] }
interface BoardRow { name: string; classId: string; realm: string; tier: number; score: number; tuVi?: number; mountCount?: number; bestMul?: number; stage?: number; progress?: number }
interface PlayerCard { name: string; classId: string; weaponId: string; realm: string; tier: number; online: boolean; mapId: string | null; sect: string | null; branch: string | null; power: number; gearScore: number; gear: Array<{ name: string; rarity: string; slot: string; band: string | null; unique: string[] }>; mounts: string[]; phapTuong: { stage: number; element: string | null } | null; achCount: number; friendCount: number; isFriend: boolean; isSelf: boolean }
const SOC_REALM: Record<string, string> = { pham: 'Phàm nhân', lk: 'Luyện Khí', tc: 'Trúc Cơ', kd: 'Kim Đan', na: 'Nguyên Anh', ht: 'Hóa Thần', ph: 'Phản Hư' };
const SOC_CLASS: Record<string, string> = { thetu: 'Thể Tu', phattu: 'Phật Tu', cottu: 'Cốt Tu', quytu: 'Quỷ Tu', satthu: 'Ảnh Tu', kiemtu: 'Kiếm Tu', phaptu: 'Pháp Tu', ytu: 'Y Tu', nhotu: 'Nho Tu' };
const socEsc = (t: string): string => String(t || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));

interface GearOrder {
  id: string;
  path: string;
  element: string;
  rarity: string;
  slot: string;
  weapon: string | null;
  tokenRank: number | null;
  createdDay: number;
  readyDay: number;
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
  ruong_thanh_tuu_dong: { name: 'Rương Thành Tựu Đồng', desc: 'Mở: nhận 1 vật phẩm thường (GĐ138)' },
  ruong_thanh_tuu_bac: { name: 'Rương Thành Tựu Bạc', desc: 'Mở: nhận 2 vật phẩm (GĐ138)' },
  ruong_thanh_tuu_vang: { name: 'Rương Thành Tựu Vàng', desc: 'Mở: nhận 2 vật phẩm, chắc chắn 1 món hiếm (GĐ138)' },
  ruong_thanh_tuu_ngoc: { name: 'Rương Thành Tựu Ngọc', desc: 'Mở: nhận 3 vật phẩm, chắc chắn 1 món hiếm (GĐ138)' },
  ruong_thanh_tuu_thien: { name: 'Rương Thành Tựu Thiên', desc: 'Mở: nhận 3 vật phẩm, chắc chắn 1 món rất hiếm (GĐ138)' },
  canh_doi: { name: 'Cánh Dơi', desc: 'Cánh của Dơi Đen — bán ở Tiệm Nguyên Liệu, dùng trả nhiệm vụ' }, // GĐ38
  da_quy: { name: 'Đá Quý', desc: 'Rơi từ Thạch Quái — bán được giá cao' }, // GĐ38
  quang_sat: { name: 'Quặng Sắt', desc: 'Nguyên liệu đào khoáng — dùng rèn, luyện khí' }, // GĐ132
  quang_dong: { name: 'Quặng Đồng', desc: 'Nguyên liệu đào khoáng — dùng rèn, luyện khí' }, // GĐ132
  quang_bac: { name: 'Quặng Bạc', desc: 'Nguyên liệu đào khoáng — dùng rèn, luyện khí' }, // GĐ132
  thao_duoc: { name: 'Thảo Dược', desc: 'Nguyên liệu hái thuốc — dùng luyện đan; mua bán ở Tiệm Thảo Dược' }, // GĐ132, GĐ140
  linh_thao: { name: 'Linh Thảo', desc: 'Nguyên liệu hái thuốc — dùng luyện đan; mua bán ở Tiệm Thảo Dược' }, // GĐ132, GĐ140
  tien_thao: { name: 'Tiên Thảo', desc: 'Nguyên liệu hái thuốc — dùng luyện đan cao cấp; mua bán ở Tiệm Thảo Dược' }, // GĐ132, GĐ140
  dan_hoi_nguyen: { name: 'Đan Hồi Nguyên', desc: 'Dùng: hồi 50% Chân nguyên tối đa' },
  dan_hoi_xuan: { name: 'Hồi Xuân Đan', desc: 'Dùng: hồi 50% HP tối đa' },
  dan_bao_luc: { name: 'Bạo Lực Đan', desc: 'Dùng: Vật công + Pháp công +30% trong 30 phút' }, // GĐ133
  dan_thiet_bich: { name: 'Thiết Bích Đan', desc: 'Dùng: Vật phòng + Pháp phòng +30% trong 30 phút' }, // GĐ133
  dan_huyet_khi: { name: 'Huyết Khí Đan', desc: 'Dùng: HP tối đa +200 trong 60 phút' }, // GĐ133
  dan_nguyen_linh: { name: 'Nguyên Linh Đan', desc: 'Dùng: Chân nguyên tối đa +200 trong 60 phút' }, // GĐ133
  dan_than_toc: { name: 'Thần Tốc Đan', desc: 'Dùng: Tốc độ +20% trong 30 phút' }, // GĐ133
  // GĐ84: đan đột phá (trước đây thiếu ở ITEM_INFO → hàng tiệm tông môn hiện "undefined")
  dan_trung_canh: { name: 'Đan Trung Cảnh', desc: 'Đan bắt buộc để đột phá Trung cảnh (tầng 3→4, 6→7)' },
  dan_truc_co: { name: 'Đan Trúc Cơ', desc: 'Đan bắt buộc để đột phá Đại cảnh Luyện Khí 9 → Trúc Cơ' },
  dan_ket_dan: { name: 'Đan Kết Đan', desc: 'Đan bắt buộc để đột phá Kim Đan (Trúc Cơ 9 → Kim Đan)' },
  dan_ho_mach: { name: 'Đan Hộ Mạch', desc: 'Dùng khi đột phá Đại cảnh: +10% tỉ lệ thành công (tự tiêu hao)' },
  sach_toa_thien: { name: 'Sách Tọa Thiền', desc: 'Công pháp tiện ích (Hỗ trợ tu luyện) — Dùng để học Tọa Thiền' },
  thu_tien_cu: { name: 'Thư Tiến Cử', desc: 'Vé vào Thiên Kiếm Môn — nộp cho Sứ Giả khi gia nhập (xong 10 nhiệm vụ bảng thì được trao)' },
  // GĐ26: sản phẩm nghề phụ
  phu_ho_than: { name: 'Phù Hộ Thân', desc: 'Dùng: hồi 40% HP tối đa (Phù Sư chế)' },
  phu_tu_linh: { name: 'Phù Tụ Linh', desc: 'Dùng: +20 Tu vi (Phù Sư chế)' },
  // GĐ136: 5 bùa Phù Sư
  phu_don_tho: { name: 'Phù Độn Thổ', desc: 'Dùng: dịch chuyển về cổng map đang đứng (Phù Sư chế)' },
  phu_cuong_bao: { name: 'Phù Cuồng Bạo', desc: 'Dùng: sát thương ×1,5 trong 60 giây (Phù Sư chế)' },
  phu_kim_cang: { name: 'Phù Kim Cang', desc: 'Dùng: sát thương nhận ×0,5 trong 60 giây (Phù Sư chế)' },
  phu_dinh_than: { name: 'Phù Định Thân', desc: 'Dùng: quái gần nhất (300px) đứng yên 5 giây (Phù Sư chế)' },
  phu_loi_kich: { name: 'Phù Lôi Kích', desc: 'Dùng: sét đánh quái gần nhất (300px), 100 sát thương phép (Phù Sư chế)' },
  nanh_tinh: { name: 'Nanh Sói Tinh Luyện', desc: 'Nguyên liệu tinh luyện — bán Tiệm Nguyên Liệu 30 LT (Luyện Khí Sư chế)' },
  tran_ky: { name: 'Trận Kỳ Dịch Chuyển', desc: 'Dùng: dịch chuyển về quảng trường làng (Trận Pháp Sư chế)' },
  banh_thit: { name: 'Bánh Thịt Thú', desc: 'Dùng: hồi 25% HP tối đa + 30 thức ăn (Thú Sư chế)' },
  // GĐ96: Tẩm bổ Thể Tu
  thit_thu: { name: 'Thịt Thú', desc: 'Nguyên liệu Tẩm bổ — săn từ quái' },
  xuong_thu: { name: 'Xương Thú', desc: 'Nguyên liệu Tẩm bổ — săn từ quái' },
  thit_ham_tam_bo: { name: 'Thịt Hầm Tẩm Bổ', desc: 'Dùng (Thể Tu): HP tối đa vĩnh viễn +10, +30 thức ăn (tối đa +100 HP)' },
  canh_xuong_tam_bo: { name: 'Canh Xương Tẩm Bổ', desc: 'Dùng (Thể Tu): Vật phòng vĩnh viễn +2, +30 thức ăn (tối đa +20 phòng)' },
  // GĐ98: Chế độc Ảnh Tu — Nọc Rắn + 2 lọ độc bôi vũ khí (chỉ Ảnh Tu dùng được)
  noc_ran: { name: 'Nọc Rắn', desc: 'Nọc độc lấy từ Độc Xà — nguyên liệu Chế độc (Ảnh Tu)' },
  quang: { name: 'Quặng', desc: 'Quặng thô lấy từ thạch quái — nguyên liệu Dưỡng Kiếm (Kiếm Tu)' },
  tinh_huyet: { name: 'Tinh Huyết', desc: 'Tinh huyết quái thú — nguyên liệu Dưỡng Kiếm (Kiếm Tu)' },
  manh_xuong: { name: 'Mảnh Xương', desc: 'Mảnh xương quái thú — nguyên liệu Luyện Khôi Lõi (Cốt Tu)' },
  khoi_loi: { name: 'Khôi Lõi Xương', desc: 'Dùng (Cốt Tu): triệu hồi Cốt Vương vĩnh viễn — chuyên đỡ đòn cho chủ' },
  lo_doc_ria_mau: { name: 'Độc Rỉa Máu', desc: 'Dùng (Ảnh Tu): bôi lên vũ khí — 10 đòn, đòn trúng bôi độc rỉa 5 máu/giây trong 5 giây' },
  lo_doc_kich_thich: { name: 'Độc Kích Thích', desc: 'Dùng (Ảnh Tu): bôi lên vũ khí — 10 đòn, đòn trúng +5 Sát Khí thêm' },
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
  daokhoang: { name: 'Linh Khoáng Sư', icon: '⛏️' }, // GĐ132
  haithuoc: { name: 'Thải Dược Sư', icon: '🌿' }, // GĐ132
};
const JOB_RANK_NAMES_CLIENT: Record<number, string> = { 1: 'Nhất Phẩm', 2: 'Nhị Phẩm', 3: 'Tam Phẩm', 4: 'Tứ Phẩm', 5: 'Ngũ Phẩm', 6: 'Lục Phẩm', 7: 'Thất Phẩm', 8: 'Bát Phẩm', 9: 'Cửu Phẩm', 10: 'Thập Phẩm', 11: 'Thập Nhất Phẩm', 12: 'Thập Nhị Phẩm', 13: 'Đế Sư', 14: 'Thánh Sư' }; // GĐ131: thang 14 cấp
const SWORD_INFO: Record<string, { name: string; desc: string }> = {
  thanh_phong: { name: 'Thanh Phong Kiếm', desc: 'Đánh nhanh hơn 20%' },
  huyet_sat: { name: 'Huyết Sát Kiếm', desc: 'Hút 20% sát thương thành máu' },
  kim_cuong: { name: 'Kim Cương Kiếm', desc: 'Phản 30% sát thương nhận về quái' },
  bang_suong: { name: 'Băng Sương Kiếm', desc: 'Đòn trúng đóng băng quái 2s' },
  liet_hoa: { name: 'Liệt Hỏa Kiếm', desc: 'Đòn trúng đốt quái 5 máu/s trong 5s' },
};
const RECIPE_INFO: Record<string, { jobId: string; name: string; inputs: Record<string, number>; stones: number; output: string; rate: number; minRank: number; tambo?: boolean; docduoc?: boolean; duongkiem?: boolean; cotloi?: boolean; sword?: string }> = {
  rc_hoi_xuan: { jobId: 'dansu', name: 'Luyện Hồi Xuân Đan', inputs: { nanh_soi: 2 }, stones: 5, output: 'dan_hoi_xuan', rate: 0.9, minRank: 1 },
  rc_hoi_nguyen: { jobId: 'dansu', name: 'Luyện Đan Hồi Nguyên', inputs: { nanh_soi: 5 }, stones: 10, output: 'dan_hoi_nguyen', rate: 0.6, minRank: 3 },
  // GĐ84: đan đột phá (mirror server)
  rc_trung_canh: { jobId: 'dansu', name: 'Luyện Đan Trung Cảnh', inputs: { nanh_soi: 10 }, stones: 20, output: 'dan_trung_canh', rate: 0.7, minRank: 1 },
  rc_truc_co: { jobId: 'dansu', name: 'Luyện Đan Trúc Cơ', inputs: { nanh_soi: 20, da_quy: 2 }, stones: 50, output: 'dan_truc_co', rate: 0.6, minRank: 3 },
  rc_ket_dan: { jobId: 'dansu', name: 'Luyện Đan Kết Đan', inputs: { nanh_soi: 30, da_quy: 5 }, stones: 200, output: 'dan_ket_dan', rate: 0.5, minRank: 3 },
  rc_ho_mach: { jobId: 'dansu', name: 'Luyện Đan Hộ Mạch', inputs: { nanh_soi: 8, canh_doi: 2 }, stones: 15, output: 'dan_ho_mach', rate: 0.75, minRank: 3 },
  // GĐ133: đan buff có thời hạn (mirror server)
  rc_huyet_khi: { jobId: 'dansu', name: 'Luyện Huyết Khí Đan', inputs: { thao_duoc: 3, nanh_soi: 2 }, stones: 15, output: 'dan_huyet_khi', rate: 0.85, minRank: 3 },
  rc_nguyen_linh: { jobId: 'dansu', name: 'Luyện Nguyên Linh Đan', inputs: { thao_duoc: 3, canh_doi: 2 }, stones: 15, output: 'dan_nguyen_linh', rate: 0.85, minRank: 3 },
  rc_bao_luc: { jobId: 'dansu', name: 'Luyện Bạo Lực Đan', inputs: { linh_thao: 2, nanh_soi: 2 }, stones: 20, output: 'dan_bao_luc', rate: 0.8, minRank: 2 },
  rc_thiet_bich: { jobId: 'dansu', name: 'Luyện Thiết Bích Đan', inputs: { linh_thao: 2, da_quy: 1 }, stones: 20, output: 'dan_thiet_bich', rate: 0.8, minRank: 2 },
  rc_than_toc: { jobId: 'dansu', name: 'Luyện Thần Tốc Đan', inputs: { tien_thao: 2, canh_doi: 2 }, stones: 30, output: 'dan_than_toc', rate: 0.75, minRank: 4 },
  rc_nanh_tinh: { jobId: 'luyenkhi', name: 'Tinh luyện Nanh Sói', inputs: { nanh_soi: 3 }, stones: 0, output: 'nanh_tinh', rate: 0.85, minRank: 1 },
  rc_tran_ky: { jobId: 'tranphap', name: 'Khắc Trận Kỳ Dịch Chuyển', inputs: { nanh_soi: 4 }, stones: 10, output: 'tran_ky', rate: 0.75, minRank: 1 },
  rc_phu_ho_than: { jobId: 'phusu', name: 'Vẽ Phù Hộ Thân', inputs: { nanh_soi: 3 }, stones: 8, output: 'phu_ho_than', rate: 0.8, minRank: 1 },
  rc_phu_tu_linh: { jobId: 'phusu', name: 'Vẽ Phù Tụ Linh', inputs: { nanh_soi: 5 }, stones: 12, output: 'phu_tu_linh', rate: 0.65, minRank: 3 },
  // GĐ136: 5 bùa mới
  rc_phu_don_tho: { jobId: 'phusu', name: 'Vẽ Phù Độn Thổ', inputs: { da_quy: 1, nanh_soi: 2 }, stones: 30, output: 'phu_don_tho', rate: 0.8, minRank: 2 },
  rc_phu_cuong_bao: { jobId: 'phusu', name: 'Vẽ Phù Cuồng Bạo', inputs: { canh_doi: 2 }, stones: 15, output: 'phu_cuong_bao', rate: 0.85, minRank: 1 },
  rc_phu_kim_cang: { jobId: 'phusu', name: 'Vẽ Phù Kim Cang', inputs: { da_quy: 1, canh_doi: 2 }, stones: 20, output: 'phu_kim_cang', rate: 0.8, minRank: 2 },
  rc_phu_dinh_than: { jobId: 'phusu', name: 'Vẽ Phù Định Thân', inputs: { canh_doi: 2, da_quy: 1 }, stones: 25, output: 'phu_dinh_than', rate: 0.8, minRank: 2 },
  rc_phu_loi_kich: { jobId: 'phusu', name: 'Vẽ Phù Lôi Kích', inputs: { nanh_soi: 3 }, stones: 20, output: 'phu_loi_kich', rate: 0.85, minRank: 1 },
  rc_banh_thit: { jobId: 'thusu', name: 'Nướng Bánh Thịt Thú', inputs: { nanh_soi: 2 }, stones: 4, output: 'banh_thit', rate: 0.9, minRank: 1 },
  rc_da_soi: { jobId: 'thusu', name: 'Thuộc Da Sói', inputs: { nanh_soi: 2 }, stones: 0, output: 'da_soi', rate: 0.9, minRank: 1 },
  // GĐ96: Tẩm bổ Thể Tu — tambo: true = hiện ở mục riêng cho Thể Tu, không cần nghề
  rc_thit_ham_tam_bo: { jobId: 'thusu', tambo: true, name: 'Hầm Thịt Tẩm Bổ', inputs: { thit_thu: 3 }, stones: 10, output: 'thit_ham_tam_bo', rate: 0.9, minRank: 1 },
  rc_canh_xuong_tam_bo: { jobId: 'thusu', tambo: true, name: 'Nấu Canh Xương Tẩm Bổ', inputs: { xuong_thu: 3 }, stones: 10, output: 'canh_xuong_tam_bo', rate: 0.9, minRank: 1 },
  // GĐ98: Chế độc Ảnh Tu — docduoc: true = hiện ở mục riêng cho Ảnh Tu, không cần nghề
  rc_doc_ria_mau: { jobId: 'thusu', docduoc: true, name: 'Chế Độc Rỉa Máu', inputs: { noc_ran: 3 }, stones: 10, output: 'lo_doc_ria_mau', rate: 0.9, minRank: 1 },
  rc_doc_kich_thich: { jobId: 'thusu', docduoc: true, name: 'Chế Độc Kích Thích', inputs: { noc_ran: 2, canh_doi: 2 }, stones: 10, output: 'lo_doc_kich_thich', rate: 0.9, minRank: 1 },
  // GĐ99: Dưỡng Kiếm (mirror server) — rèn xong trang bị ngay, không qua túi.
  rc_kiem_thanh_phong: { jobId: 'thusu', duongkiem: true, sword: 'thanh_phong', name: 'Rèn Thanh Phong Kiếm', inputs: { quang: 3, tinh_huyet: 3 }, stones: 10, output: 'thanh_phong', rate: 0.9, minRank: 1 },
  rc_kiem_huyet_sat: { jobId: 'thusu', duongkiem: true, sword: 'huyet_sat', name: 'Rèn Huyết Sát Kiếm', inputs: { quang: 3, tinh_huyet: 3 }, stones: 10, output: 'huyet_sat', rate: 0.9, minRank: 1 },
  rc_kiem_kim_cuong: { jobId: 'thusu', duongkiem: true, sword: 'kim_cuong', name: 'Rèn Kim Cương Kiếm', inputs: { quang: 3, tinh_huyet: 3 }, stones: 10, output: 'kim_cuong', rate: 0.9, minRank: 1 },
  rc_kiem_bang_suong: { jobId: 'thusu', duongkiem: true, sword: 'bang_suong', name: 'Rèn Băng Sương Kiếm', inputs: { quang: 3, tinh_huyet: 3 }, stones: 10, output: 'bang_suong', rate: 0.9, minRank: 1 },
  rc_kiem_liet_hoa: { jobId: 'thusu', duongkiem: true, sword: 'liet_hoa', name: 'Rèn Liệt Hỏa Kiếm', inputs: { quang: 3, tinh_huyet: 3 }, stones: 10, output: 'liet_hoa', rate: 0.9, minRank: 1 },
  // GĐ101: Luyện Khôi Lõi (mirror server).
  rc_cot_khoi_loi: { jobId: 'thusu', cotloi: true, name: 'Luyện Khôi Lõi Xương', inputs: { manh_xuong: 5 }, stones: 10, output: 'khoi_loi', rate: 0.9, minRank: 1 },
};
// GĐ119: bảng hiển thị trang bị (mirror server/data/gear_data.json — chỉ để hiển thị, server vẫn kiểm tra thật).
const GEAR_RARITY_NAME: Record<string, string> = { TRANG: 'Phàm', XAM: 'Sơ', LUC: 'Linh', LAM: 'Bảo', TIM: 'Tiên', CAM: 'Thần', DO: 'Huyết', DEN: 'Ma', VO: 'Vô Cực' };
const GEAR_RARITY_COLOR: Record<string, string> = { TRANG: '#c8c8c8', XAM: '#b8c4b0', LUC: '#7dd87d', LAM: '#7db8e8', TIM: '#c07dd8', CAM: '#f0a050', DO: '#e05050', DEN: '#a080c0', VO: '#ffd94d' };
const GEAR_ELEMENT_NAME: Record<string, string> = { KIM: 'Kim', MOC: 'Mộc', THUY: 'Thủy', HOA: 'Hỏa', THO: 'Thổ', VO: 'Vô', LOI: 'Lôi', PHONG: 'Phong', BANG: 'Băng', NHAM: 'Nham', DOC: 'Độc', QUANG: 'Quang', AM: 'Ám', HUYET: 'Huyết', THOI_GIAN: 'Thời Gian', KHONG_GIAN: 'Không Gian' };
const GEAR_SLOT_NAME: Record<string, string> = { WEAPON: 'Vũ khí', ARMOR: 'Áo', PANTS: 'Quần', HAT: 'Mũ', CLOAK: 'Choàng', SHOES: 'Giày', BROOCH: 'Bội', RING: 'Nhẫn', TOKEN: 'Lệnh bài' };
const GEAR_REROLL_FEE: Record<string, number> = { TIM: 100, CAM: 300, DO: 800, DEN: 2000, VO: 5000 };
const GEAR_SLOT_ORDER = ['WEAPON', 'ARMOR', 'PANTS', 'HAT', 'CLOAK', 'SHOES', 'BROOCH', 'RING', 'TOKEN'];
// GĐ120: icon trang bị — ô giáp dùng sprites/gear/<SLOT>.png (vẽ bằng code);
// vũ khí dùng lại sprites/weapons GĐ16 (tên file = spec id thường bỏ gạch dưới,
// trừ 2 ngoại lệ DAO→daothe, THUONG→thuongthe; TAY_KHONG không có hình).
const GEAR_WEAPON_FILE: Record<string, string | null> = { TAY_KHONG: null, DAO: 'daothe', THUONG: 'thuongthe' };
function gearIconSrc(it: { slot: string; weapon?: string | null }): string | null {
  if (it.slot === 'WEAPON') {
    if (!it.weapon) return null;
    return `/sprites/weapons/${GEAR_WEAPON_FILE[it.weapon] ?? it.weapon.toLowerCase().replace(/_/g, '')}.png`;
  }
  return ['ARMOR', 'PANTS', 'HAT', 'CLOAK', 'SHOES', 'BROOCH', 'RING', 'TOKEN'].includes(it.slot) ? `/sprites/gear/${it.slot}.png` : null;
}
function gearIconHtml(it: { slot: string; weapon?: string | null; rarity: string }, size = 32): string {
  const src = gearIconSrc(it);
  if (!src) return '';
  const color = GEAR_RARITY_COLOR[it.rarity] || '#888';
  return `<img src="${src}" alt="" style="width:${size}px;height:${size}px;object-fit:contain;image-rendering:pixelated;border:2px solid ${color};border-radius:4px;vertical-align:middle;margin-right:6px;flex:none;">`;
}
const SHOP_INFO: Record<string, { name: string; sell: Record<string, number>; buy: Record<string, number> }> = {
  tiem_dan: {
    name: 'Tiệm Đan Dược',
    // GĐ84: trước đây mirror thiếu 3 đan đột phá nên UI tiệm không hiện
    // hàng dù server vẫn bán — đồng bộ đúng giá server (số TẠM).
    sell: { dan_hoi_nguyen: 30, dan_hoi_xuan: 15, dan_trung_canh: 200, dan_truc_co: 800, dan_ho_mach: 300, dan_ket_dan: 2000 },
    buy: { dan_hoi_nguyen: 12, dan_hoi_xuan: 6, dan_trung_canh: 80, dan_truc_co: 320, dan_ho_mach: 120, dan_ket_dan: 800 },
  },
  tiem_nguyen_lieu: {
    name: 'Tiệm Nguyên Liệu',
    sell: { nanh_soi: 12 },
    buy: { nanh_soi: 5, nanh_tinh: 30, da_soi: 22, canh_doi: 8, da_quy: 45 }, // GĐ38: đồng bộ với server
  },
  tiem_thao_duoc: { // GĐ140: đồng bộ với server (giá TẠM trừ thảo dược thường 5 LT theo tài liệu)
    name: 'Tiệm Thảo Dược',
    sell: { thao_duoc: 5, linh_thao: 20, tien_thao: 40 },
    buy: { thao_duoc: 2, linh_thao: 8, tien_thao: 16 },
  },
  // GĐ89: tiệm ở thành phố — cùng bảng giá với tiệm làng (server kiểm tra vị trí NPC)
  city_dan: {
    name: 'Tiệm Đan Dược',
    sell: { dan_hoi_nguyen: 30, dan_hoi_xuan: 15, dan_trung_canh: 200, dan_truc_co: 800, dan_ho_mach: 300, dan_ket_dan: 2000 },
    buy: { dan_hoi_nguyen: 12, dan_hoi_xuan: 6, dan_trung_canh: 80, dan_truc_co: 320, dan_ho_mach: 120, dan_ket_dan: 800 },
  },
  city_nguyenlieu: {
    name: 'Tiệm Nguyên Liệu',
    sell: { nanh_soi: 12 },
    buy: { nanh_soi: 5, nanh_tinh: 30, da_soi: 22, canh_doi: 8, da_quy: 45 },
  },
  city_thao_duoc: { // GĐ151: đồng bộ với server — cùng bảng giá với tiệm làng
    name: 'Tiệm Thảo Dược',
    sell: { thao_duoc: 5, linh_thao: 20, tien_thao: 40 },
    buy: { thao_duoc: 2, linh_thao: 8, tien_thao: 16 },
  },
  tiem_tong_mon: { // GĐ30: chỉ đệ tử tông môn (server kiểm tra)
    name: 'Tiệm Tông Môn',
    sell: { dan_hoi_nguyen: 25, dan_hoi_xuan: 12, dan_trung_canh: 170, dan_truc_co: 680, dan_ho_mach: 255, dan_ket_dan: 1700 },
    buy: { dan_hoi_nguyen: 10, dan_hoi_xuan: 5, dan_trung_canh: 68, dan_truc_co: 272, dan_ho_mach: 102, dan_ket_dan: 680 },
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
const QUEST_INFO: Record<string, { name: string; desc: string; target: number; reward: number; kind?: string; itemId?: string; npcId?: string; targetNpcId?: string; destMap?: string; duel?: string; laCase?: boolean; cityName?: string; gd127?: boolean; gd129?: boolean; gd130?: boolean; gd131?: boolean; gd132?: boolean; gd143?: boolean }> = {
  q_dietsoi: { name: 'Trừ khử Sói Xám', desc: 'Hạ 5 con Sói Xám ngoài làng', target: 5, reward: 25, kind: 'kill' },
  q_nanhsoi: { name: 'Thu thập Nanh Sói', desc: 'Mang theo 3 Nanh Sói tới trả', target: 3, reward: 20, kind: 'item', itemId: 'nanh_soi' },
  q_dietdoi: { name: 'Diệt Dơi Đen', desc: 'Hạ 10 con Dơi Đen ngoài làng (+20 Tu vi)', target: 10, reward: 80, kind: 'kill' }, // GĐ38
  q_dietthach: { name: 'Diệt Thạch Quái', desc: 'Hạ 5 con Thạch Quái ở góc đông bắc (+30 Tu vi)', target: 5, reward: 150, kind: 'kill' }, // GĐ38
  q_canhdoi: { name: 'Thu thập Cánh Dơi', desc: 'Mang theo 5 Cánh Dơi tới trả', target: 5, reward: 60, kind: 'item', itemId: 'canh_doi' }, // GĐ38
  // GĐ24: nhiệm vụ riêng của NPC (mở khi thiện cảm ≥ 50) — nhận/trả tại NPC qua hộp thoại trò chuyện
  pq_truonglang: { name: 'Tâm nguyện của Trưởng Làng', desc: 'Mang 5 Nanh Sói cho Trưởng Làng', target: 5, reward: 80, kind: 'item', itemId: 'nanh_soi', npcId: 'npc_truonglang' },
  pq_dan: { name: 'Đan phường thiếu tay', desc: 'Hạ 10 Sói Xám giúp Chủ Tiệm Đan', target: 10, reward: 50, kind: 'kill', npcId: 'npc_dan' },
  pq_nguyenlieu: { name: 'Nguyên liệu cho tiệm', desc: 'Mang 5 Nanh Sói cho Chủ Tiệm Nguyên Liệu', target: 5, reward: 70, kind: 'item', itemId: 'nanh_soi', npcId: 'npc_nguyenlieu' },
  q_tusi: { name: 'Đối đầu Tu Sĩ Thù Địch', desc: 'Ra ngoài làng, bấm ⚔ Đối đầu ở đây để đấu tay đôi — thắng rồi hắn còn quay lại mạnh hơn, thưởng cũng tăng theo', target: 1, reward: 100, kind: 'kill', duel: 'Tu Sĩ Thù Địch' }, // GĐ40, GĐ86: thang cừu hận
  case_soi_du: { name: '🔍 Vụ án: Đàn sói dữ', desc: 'Hạ 12 con Sói Xám (vụ án luân phiên theo ngày)', target: 12, reward: 130, kind: 'kill', laCase: true }, // GĐ40+
  case_doi_pha: { name: '🔍 Vụ án: Bầy dơi phá kho', desc: 'Hạ 12 con Dơi Đen (+25 Tu vi, vụ án luân phiên)', target: 12, reward: 150, kind: 'kill', laCase: true }, // GĐ40+
  case_thach_chan: { name: '🔍 Vụ án: Thạch quái chặn đường', desc: 'Hạ 4 con Thạch Quái (+30 Tu vi, vụ án luân phiên)', target: 4, reward: 200, kind: 'kill', laCase: true }, // GĐ40+
  case_batcoc: { name: '🔍 Vụ án: Dân làng mất tích', desc: 'Ra ngoài làng bấm ⚔ Đối đầu để cứu dân làng bị bắt cóc (vụ án luân phiên)', target: 1, reward: 180, kind: 'kill', laCase: true, duel: 'Kẻ Bắt Cóc' }, // GĐ40+
  case_trom: { name: '🔍 Vụ án: Kẻ trộm trong làng', desc: 'Trò chuyện với dân làng lấy 3 manh mối, rồi chỉ đích danh thủ phạm chỗ Trưởng Làng (vụ án luân phiên)', target: 3, reward: 150, kind: 'clues', laCase: true }, // GĐ40+
  q_benhla1: { name: 'Bệnh lạ ở bãi dơi (1/2)', desc: 'Thu thập 3 manh mối bệnh lạ từ dân làng trước, rồi hạ 8 con Dơi Đen để chặn nguồn bệnh', target: 8, reward: 60, kind: 'kill', npcId: 'npc_dan' }, // GĐ40, GĐ86: cần điều tra trước
  q_benhla2: { name: 'Bệnh lạ ở bãi dơi (2/2)', desc: 'Mang 2 Hồi Xuân Đan cho Chủ Tiệm Đan cứu người bệnh (+30 Tu vi)', target: 2, reward: 120, kind: 'item', itemId: 'dan_hoi_xuan', npcId: 'npc_dan' }, // GĐ40
  // GĐ90: nhiệm vụ bảng cao cấp (mirror server QUESTS — nhận/trả tại Bảng làng)
  bq_kiemma: { name: 'Diệt Kiếm Ma (Trúc Cơ)', desc: 'Hạ 15 Kiếm Ma ở Cổ Chiến Trường (cần Trúc Cơ tầng 7 trở lên mới vào được, +60 Tu vi)', target: 15, reward: 350, kind: 'kill' },
  bq_huyetlang: { name: 'Diệt Huyết Lang (Trúc Cơ)', desc: 'Hạ 15 Huyết Lang ở Huyết Sắc Rừng (+60 Tu vi)', target: 15, reward: 350, kind: 'kill' },
  bq_diahanh: { name: 'Diệt Địa Hành Yêu (Trúc Cơ)', desc: 'Hạ 5 Địa Hành Yêu ở Hắc Phong Sa Mạc (+60 Tu vi)', target: 5, reward: 350, kind: 'kill' },
  bq_daquy_tc: { name: 'Thu thập Đá Quý (Trúc Cơ)', desc: 'Mang theo 10 Đá Quý tới trả (+50 Tu vi)', target: 10, reward: 300, kind: 'item', itemId: 'da_quy' },
  bq_kimgiap: { name: 'Diệt Kim Giáp Tê (Kim Đan)', desc: 'Hạ 8 Kim Giáp Tê ở Kim Quáng Động hoặc Thiên Cương Kim Sơn (+100 Tu vi)', target: 8, reward: 700, kind: 'kill' },
  bq_thienloi: { name: 'Diệt Thiên Lôi Thú (Kim Đan)', desc: 'Hạ 5 Thiên Lôi Thú ở Thiên Cương Kim Sơn (+120 Tu vi)', target: 5, reward: 800, kind: 'kill' },
  bq_hondon: { name: 'Diệt Hỗn Độn Thú (Kim Đan)', desc: 'Hạ 1 Hỗn Độn Thú ở Vô Tận Hư Không (+150 Tu vi)', target: 1, reward: 1200, kind: 'kill' },
  bq_daquy_kd: { name: 'Thu thập Đá Quý (Kim Đan)', desc: 'Mang theo 15 Đá Quý tới trả (+80 Tu vi)', target: 15, reward: 500, kind: 'item', itemId: 'da_quy' },
  ...QUEST_INFO_CITY, // GĐ90: 60 nhiệm vụ thành phố — chỉ hiện ở tracker, bảng làng bỏ qua (nhận/trả qua hộp thoại Người Giao Nhiệm Vụ)
  ...QUEST_INFO_GD127, // GĐ127: 950 nhiệm vụ mở rộng — chỉ hiện ở tracker, bảng làng bỏ qua (nhận/trả qua hộp thoại người giao)
  ...QUEST_INFO_GD129, // GĐ129: 6 nhiệm vụ Cổ Thụ — như GĐ127 (tracker only, không qua bảng)
  ...QUEST_INFO_GD130, // GĐ130: 8 nhiệm vụ Cửu U — như GĐ129 (tracker only, không qua bảng)
  ...QUEST_INFO_GD131, // GĐ131: 15 nhiệm vụ nghề phụ — nhận/trả qua hộp thoại sư phụ, không qua bảng
  ...QUEST_INFO_GD132, // GĐ132: 6 nhiệm vụ nghề thu thập — nhận/trả qua hộp thoại sư phụ, không qua bảng
  ...QUEST_INFO_GD143, // GĐ143: 4 nhiệm vụ Tiên/Ma — nhận/trả qua Sứ Giả, không qua bảng
  ...QUEST_INFO_GD145, // GĐ145: 6 nhiệm vụ khảo hạch — nhận/trả qua Sứ Giả, chỉ hiện khi đủ cấp Đạo Quán
};
// GĐ24: ánh xạ phía client cho thiện cảm
const NPC_NAME_CLIENT: Record<string, string> = {
  npc_truonglang: 'Trưởng Làng',
  npc_dan: 'Chủ Tiệm Đan',
  npc_nguyenlieu: 'Chủ Tiệm Nguyên Liệu',
  npc_thaoduoc: 'Chủ Tiệm Thảo Dược', // GĐ140
  npc_sugia: 'Sứ Giả Tông Môn',
  npc_thuongnhan: 'Thương Nhân Lưu Động', // GĐ40
  npc_laibuan: 'Lái Buôn', // GĐ127: tracker quest từ Lái Buôn (trước đây rơi về 'người giao')
  npc_ren: 'Thợ Rèn', // GĐ127: tracker quest từ Thợ Rèn
};
const SHOP_NPC_CLIENT: Record<string, string> = { tiem_dan: 'npc_dan', tiem_nguyen_lieu: 'npc_nguyenlieu', luu_dong: 'npc_thuongnhan', tiem_thao_duoc: 'npc_thaoduoc' }; // GĐ40, GĐ140
// Các điểm tương tác phím E (điểm đầu tiên là cửa Đạo Quán có từ GĐ7)
const INTERACTS: Array<{ type: string; x: number; y: number; shopId?: string }> = [
  { type: 'daoquan', x: hs175(700), y: hs175(378) },
  { type: 'tulinh', x: hs175(700), y: hs175(196) }, // GĐ23: Tụ Linh Trận (Thiền Phòng sau Đạo Quán) — bế quan
  { type: 'board', x: hs175(800), y: hs175(668) },
  { type: 'bangvang', x: hs175(856), y: hs175(668) }, // GĐ40+: Bảng Vàng + Bảng Truy Nã
  { type: 'elder', x: hs175(387), y: hs175(541) },
  { type: 'shop', shopId: 'tiem_dan', x: hs175(1012), y: hs175(541) },
  { type: 'shop', shopId: 'tiem_nguyen_lieu', x: hs175(392), y: hs175(373) },
  { type: 'shop', shopId: 'tiem_thao_duoc', x: hs175(724), y: hs175(654) }, // GĐ140: Tiệm Thảo Dược (Chủ Tiệm Thảo Dược ở 700,660)
  { type: 'shop', shopId: 'tuu_lau', x: hs175(525), y: hs175(841) }, // GĐ78: Tửu Lâu — cửa Quán Ăn (phía nam nhà)
  { type: 'sugia', x: hs175(762), y: hs175(470) }, // GĐ30: Sứ Giả Tông Môn ở quảng trường
  { type: 'bicanh_in', x: hs175(1470), y: hs175(600) }, // GĐ57: cổng vào Bí Cảnh Thạch Lâm (sân Thanh Phong Môn)
  { type: 'bicanh_out', x: hs175(2432), y: hs175(600) }, // GĐ57, GĐ126: cổng trở về trong bí cảnh (dời đông 600)
  { type: 'laibuan', x: hs175(1005), y: hs175(545) }, // GĐ60: Lái Buôn — nhận việc hộ tống thương nhân
  { type: 'thuongnhan', x: hs175(884), y: hs175(616) }, // GĐ86: Thương Nhân Lưu Động — trước đây không có điểm E nên hộp thoại/tiệm của ông không vào được
  { type: 'forge', x: hs175(620), y: hs175(560) }, // GĐ119 bước 5: Tiệm Rèn (Thợ Rèn ở quảng trường làng)
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
  tuyet_ho: { base: 'wolf', tint: 0xdff2ff, scale: 0.85 },
  bang_xa: { base: 'wolf', tint: 0xbfe6f5, scale: 0.8 },
  hoa_thu: { base: 'wolf', tint: 0xf0643c, scale: 0.55 },
  sa_mac_hat: { base: 'wolf', tint: 0xd8b878, scale: 0.7 },
  sam_lam_cu_mang: { base: 'wolf', tint: 0x4e7a3a, scale: 1.3 },
  thuy_yeu_ngu: { base: 'wolf', tint: 0x3a6ea8, scale: 1.0 },
  loi_xa: { base: 'wolf', tint: 0xf2d24b, scale: 0.85 },
  dia_kim_thu: { base: 'wolf', tint: 0xf0c84b, scale: 0.7 },
  dung_nham_cua: { base: 'golem', tint: 0x8a4a2f, scale: 1.1 },
  diem_hoa_phuong: { base: 'bat', tint: 0xf08a3c, scale: 1.5 },
  thien_loi_thu: { base: 'wolf', tint: 0x9a86f0, scale: 1.4 },
  hon_don_thu: { base: 'golem', tint: 0x6a5aa8, scale: 1.7 },
};

// GĐ159: TỈ LỆ THẬT (Bảo yêu cầu 29/10) — quái nhỏ lại theo cỡ thật so với
// người chơi (hiện ~57px): sói ~38px, dơi ~30px, thạch quái ~80px, quái hình
// người ~57px. MON_BASE_H = chiều cao KHUNG quy đổi theo họ hình; chiều cao
// hiện thật = MON_BASE_H × hệ số họ × tỉ lệ loài (vis) × phần nội dung của
// từng sprite ÷ 128. Trùm thử thách giữ hình vẽ code lớn như cũ.
const MON_BASE_H: Record<'wolf' | 'bat' | 'golem' | 'rival', number> = { wolf: 77, bat: 49, golem: 92, rival: 65 };
function monSpriteScale(base: 'wolf' | 'bat' | 'golem' | 'rival', kind: string | undefined, imgH: number): number {
  const vis = GDD_MONSTER_VISUAL[kind || ''];
  const baseSc = base === 'wolf' ? WOLF_TEX.scale : 1;
  const kindSc = kind === 'khoiloi' ? 1.15 : 1;
  return (MON_BASE_H[base] * baseSc * kindSc * (vis?.scale ?? 1)) / (imgH || 128);
}
function monBaseForKind(kind: string): 'wolf' | 'bat' | 'golem' | 'rival' {
  const vis = GDD_MONSTER_VISUAL[kind];
  if (vis) return vis.base;
  if (kind === 'golem' || kind === 'khoiloi') return 'golem';
  if (kind === 'bat') return 'bat';
  if (kind === 'kiemma') return 'rival';
  return 'wolf';
}

// GĐ118: sprite quái PixelLab (21 loài, chốt 24/10) — kind trong tick →
// file sprite. Trùm thử thách không dùng bảng này (giữ hình thạch quái).
// GĐ161: thú cưỡi — loài → texture + bề rộng hiển thị (px). Loài trại bán
// dùng sprite riêng trong sprites/mounts/; loài hoang dùng lại sprite quái.
const MOUNT_TEX: Record<string, string> = {
  linh_ma: 'mount-linh_ma', thanh_van_hac: 'mount-thanh_van_hac', huyen_quy: 'mount-huyen_quy',
  soi: 'mon-wolf', huyet_lang: 'mon-huyetlang', lam_tru: 'mon-lam_tru', thien_loi_thu: 'mon-thien_loi_thu',
  tuyet_ho: 'mon-tuyet_ho', hoa_thu: 'mon-hoa_thu', sa_mac_hat: 'mon-sa_mac_hat', dia_kim_thu: 'mon-dia_kim_thu', // GĐ203
};
const MOUNT_H: Record<string, number> = { linh_ma: 64, thanh_van_hac: 78, huyen_quy: 56, soi: 44, huyet_lang: 46, lam_tru: 44, thien_loi_thu: 52, tuyet_ho: 44, hoa_thu: 38, sa_mac_hat: 40, dia_kim_thu: 38 }; // chiều cao hiển thị (px); GĐ203: + 4 loài (TẠM theo cỡ sprite)
const MOUNT_LIFT: Record<string, number> = { linh_ma: -36, thanh_van_hac: -40, huyen_quy: -40, soi: -26, huyet_lang: -27, lam_tru: -26, thien_loi_thu: -30, tuyet_ho: -26, hoa_thu: -22, sa_mac_hat: -24, dia_kim_thu: -22 }; // độ nâng thân người khi cưỡi từng loài; GĐ203: + 4 loài
// GĐ203: màu vệt/hào quang khi cưỡi theo hệ của loài (bụi đất thường = xám ấm)
const MOUNT_FX_COLOR: Record<string, string> = { thien_loi_thu: '#c792ff', thanh_van_hac: '#bfeaff', hoa_thu: '#ff8a4d', tuyet_ho: '#eaf6ff', huyet_lang: '#ff7a7a', dia_kim_thu: '#ffd75e', sa_mac_hat: '#e8c98a', linh_ma: '#ffe9a8', huyen_quy: '#9fd8c9', soi: '#d8d8d8', lam_tru: '#d8c9a8' };
// GĐ161: bảng giá phía client (chỉ để hiển thị — server MOUNT_SPECIES là luật thật)
const MOUNT_SHOP_CLIENT: { species: string; name: string; speed: number; price: number }[] = [
  { species: 'huyen_quy', name: 'Huyền Quy', speed: 1.3, price: 15000 },
  { species: 'linh_ma', name: 'Linh Mã', speed: 1.5, price: 30000 },
  { species: 'thanh_van_hac', name: 'Thanh Vân Hạc', speed: 1.75, price: 80000 },
];
const MOUNT_TAME_CLIENT: { species: string; name: string; speed: number; fee: number; days: number }[] = [
  { species: 'lam_tru', name: 'Lâm Trư', speed: 1.35, fee: 7000, days: 1 },
  { species: 'soi', name: 'Sói Xám', speed: 1.4, fee: 8000, days: 1 },
  { species: 'huyet_lang', name: 'Huyết Lang', speed: 1.5, fee: 18000, days: 2 },
  { species: 'thien_loi_thu', name: 'Thiên Lôi Thú', speed: 1.65, fee: 35000, days: 3 },
  { species: 'dia_kim_thu', name: 'Địa Kim Thử', speed: 1.35, fee: 12000, days: 1 },
  { species: 'sa_mac_hat', name: 'Sa Mạc Hạt', speed: 1.4, fee: 16000, days: 1 },
  { species: 'hoa_thu', name: 'Hỏa Thử', speed: 1.45, fee: 20000, days: 2 },
  { species: 'tuyet_ho', name: 'Tuyết Hồ', speed: 1.6, fee: 28000, days: 2 },
];
const MOUNT_SPECIES_NAME: Record<string, string> = Object.fromEntries([...MOUNT_SHOP_CLIENT, ...MOUNT_TAME_CLIENT].map((s) => [s.species, s.name]));

const MON_SPRITE: Record<string, string> = {
  wolf: 'soi_xam', bat: 'doi_den', golem: 'thach_quai', khoiloi: 'thach_khoi_loi',
  huyetlang: 'huyet_lang', kiemma: 'kiem_ma', doc_xa: 'doc_xa', lam_tru: 'lam_tru',
  cot_binh: 'cot_binh', thuy_trieu_tinh: 'thuy_trieu_tinh', huyen_anh_mieu: 'huyen_anh_mieu',
  loi_dieu: 'loi_dieu', dia_hanh_yeu: 'dia_hanh_yeu', huyen_diep: 'huyen_diep',
  kim_giap_te: 'kim_giap_te', dan_ma: 'dan_ma', hap_huyet_quy: 'hap_huyet_quy',
  bang_tinh_cu_nhan: 'bang_tinh_cu_nhan', diem_hoa_phuong: 'diem_hoa_phuong',
  thien_loi_thu: 'thien_loi_thu', hon_don_thu: 'hon_don_thu',
  cuu_u_ma_quan: 'kiem_ma', // GĐ130: Ma Quân dùng lại sprite kiếm khách quỷ (PixelLab hết lượt, không vẽ mới)
  tuyet_ho: 'tuyet_ho', bang_xa: 'bang_xa', hoa_thu: 'hoa_thu', sa_mac_hat: 'sa_mac_hat',
  sam_lam_cu_mang: 'sam_lam_cu_mang', thuy_yeu_ngu: 'thuy_yeu_ngu', loi_xa: 'loi_xa',
  dia_kim_thu: 'dia_kim_thu', dung_nham_cua: 'dung_nham_cua', // GĐ166: 9 loài mới, sprite vẽ bằng công cụ của Muse
  // GĐ158: sprite bạn đồng hành của Cốt/Quỷ Tu (không có quái hoang cùng kind —
  // chỉ nạp texture để petMon dùng; vẽ bằng công cụ của Muse sau khi PixelLab hết lượt)
  cot_vuong: 'cot_vuong', quy_hon: 'quy_hon',
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
  cotVuong?: number; // GĐ101: 1 = Cốt Vương (pet xương của Cốt Tu)
  quyHon?: number; // GĐ102: 1 = Quỷ Hồn (pet ma của Quỷ Tu)
  honKhi?: number; // GĐ102: Hồn Khí Quỷ Tu (0–100)
  congDuc?: number; // GĐ103: Công Đức Phật Tu (không cap)
  phatTier?: number; // GĐ103: Tầng Thức Phật Tu (0–5)
  preaching?: number; // GĐ103: 1 = đang Thuyết Pháp
  yDuc?: number; // GĐ104: Y Đức Y Tu (không cap)
  yGift?: number; // GĐ104: 1 = đã mở Cố Bản Bồi Nguyên
  yRevive?: number; // GĐ104: 1 = đã mở Hồi Dương Cứu Nghịch
  downed?: number; // GĐ104: 1 = đang gục ngã chờ cứu
  downedLeft?: number; // GĐ104: giây gục còn lại
  haoNhien?: number; // GĐ105: Hạo Nhiên Nho Tu (0–100)
  nhoStudy?: number; // GĐ105: tổng giây đọc sách Nho Tu
  nhoChuong?: string; // GĐ105: Chương đã mở, dạng "1,2"
  studying?: number; // GĐ105: 1 = đang đọc sách
  nhoZoneChuong?: number; // GĐ105: Ý Cảnh đang mở (0 = không có)
  nhoZoneX?: number; // GĐ105: tâm vùng Ý Cảnh
  nhoZoneY?: number; // GĐ105
  nhoZoneLeft?: number; // GĐ105: giây vùng còn lại
  tranBuff?: number; // GĐ135: Trận Cường Công đang mở (1 = có)
  tranBuffX?: number; tranBuffY?: number;
  tranDebuff?: number; // GĐ135: Trận Suy Nhược đang mở
  tranDebuffX?: number; tranDebuffY?: number;
  tranSeal?: number; // GĐ135: Cấm Chế Trận đang mở
  tranSealX?: number; tranSealY?: number;
  tranTeleport?: number; // GĐ135: Trận Dịch Chuyển trên map này
  tranTeleportX?: number; tranTeleportY?: number;
  petHp?: string | null; // GĐ101: máu pet của chủ, dạng "hp/maxHp" (null = không có pet)
  tamed?: number; // GĐ137: 1 = actor này là thú thuần hóa
  tamedKind?: string; // GĐ137: loài thú thuần hóa (để vẽ sprite quái)
  petIsTamed?: number; // GĐ137: 1 = pet đang hiện của chủ là thú thuần hóa
  petName?: string; // GĐ137: tên thú thuần hóa (để HUD ghi đúng tên)
  achTitle?: string; // GĐ138: danh hiệu đang đeo (hiện dưới tên)
  achTitleColor?: string; // GĐ138: màu danh hiệu theo cấp
  achTitleLevel?: number; // GĐ139: cấp danh hiệu (để vẽ hiệu ứng động cấp 8–10)
  bequan?: number; // GĐ23: 1 = đang bế quan tại Tụ Linh Trận
  learning?: number; // GĐ31-sửa: 1 = đang ngồi lĩnh ngộ công pháp
  meditating?: number; // GĐ76: 1 = đang ngồi thiền (online)
  food?: number; // GĐ78: thức ăn 0–100
  water?: number; // GĐ78: nước uống 0–100
  flying?: number; // GĐ88: 1 = đang ngự kiếm bay
  hoThe?: number; // GĐ88: 1 = Kim Đan Hộ Thể đang bật
  rage?: number; // GĐ95: Nộ Khí Thể Tu (0–100)
  unyield?: number; // GĐ95: 1 = Bất khuất đang bật
  satKhi?: number; // GĐ97: Sát Khí Ảnh Tu (0–100)
  ult?: number; // GĐ97: 1 = Siêu Giác Quan đang bật
  ngoKiem?: number; // GĐ99: Ngộ Kiếm Kiếm Tu (0–100)
  sword?: string | null; // GĐ99: Bản Mệnh Kiếm đang trang bị (null = chưa rèn)
  kiemVuc?: number; // GĐ99: 1 = Kiếm Vực đang bật
  kiemUlt?: number; // GĐ99: 1 = Nhân Kiếm Hợp Nhất đang bật
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
  bienDi?: string | null; // GĐ100: hệ Biến Dị Pháp Tu (null = không có)
  robe: string | null;
  gender: string;
  weaponId: string | null;
  weaponName: string | null;
}

// GĐ119 bước 5: kiểu dữ liệu Tiệm Rèn (khai báo 1 chỗ cho cả field lẫn handler socket)
type ForgeStock = Array<{ index: number; name: string; rarity: string; element: string; slot: string; weapon: string | null; price: number; sold: boolean }> | null;
type ForgeMeta = { rarities: Record<string, { name: string }>; elements: Record<string, string>; paths: string[]; pathNames: Record<string, string>; slots: string[]; weapons: Record<string, Array<{ id: string; name: string }>>; forgeDays: Record<string, number>; forgeMaterials: Record<string, Record<string, number>> } | null;

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
  npcMoves?: Array<{ id: string; x: number; y: number }>; // GĐ156: NPC thành phố đang di chuyển (nghe Thuyết Pháp / trở về)
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
  aoeR?: number; // GĐ171: bán kính chiêu quái đang vận (0 = không có)
  wuEnd?: number; // GĐ171: mốc epoch hết vận chiêu
  wuDur?: number; // GĐ171: tổng thời gian vận chiêu (ms)
}

// GĐ171: màu hiệu ứng nổ theo hệ linh căn
const FX_ELEM_COLORS: Record<string, string> = { Kim: '#f2c14e', Mộc: '#53d769', Thủy: '#4db2ff', Hỏa: '#ff7043', Thổ: '#c98d4b', neutral: '#ffd873' };

// GĐ170: một phía của bàn giao dịch (server gửi)
interface TradeOffer {
  items: Record<string, number>;
  stones: number;
  mounts: Array<{ uid: string; name: string; species: string; speedMul: number }>;
  gear: Array<{ uid: string; name: string; rarity: string; slot: string; band: string | null; unique: string[] }>; // GĐ200
}

// GĐ184: màu phát sáng của Pháp Tướng theo hệ đã khóa
const PT_EL_TINT: Record<string, number> = { Kim: 0xffd75e, 'Mộc': 0x7dd87d, 'Thủy': 0x6ab8ff, 'Hỏa': 0xff7a4d, 'Thổ': 0xc9a06a, 'Lôi': 0xc792ff, 'Băng': 0xbfeaff, 'Độc': 0x9dff57, Phong: 0xa8e6cf, Nham: 0xb08968, Quang: 0xfff6bf, 'Ám': 0x8a7dff, 'Huyết': 0xff4d5e, 'Thời Gian': 0xe8e8f0, 'Không Gian': 0xb46aff };

interface Actor {
  container: Phaser.GameObjects.Container;
  sprite: Phaser.GameObjects.Sprite | Phaser.GameObjects.Image; // thú thuần hóa (GĐ137) dùng Image tĩnh thay vì Sprite
  barFg: Phaser.GameObjects.Rectangle;
  label: Phaser.GameObjects.Text; // GĐ21: nhãn tên (thêm 🧘/💤 khi nghỉ offline)
  nameText: string;
  titleLabel: Phaser.GameObjects.Text; // GĐ138: danh hiệu dưới tên
  titleShown: string | null;
  restShown: string | null;
  dir: Direction;
  // GĐ9: hoạt ảnh từ texture nướng sẵn
  styleKey: string;
  curTex: string;
  walkPhase: number;
  castUntil: number;
  comboIdx: number; // GĐ188: nhịp combo đòn thường (0/1/2 luân phiên cho đỡ "nhựa")
  wasPosing: boolean; // GĐ188: đang trong tư thế ra đòn (để bắt nhịp bắt đầu)
  lastPoseAt: number; // GĐ188: mốc ra đòn gần nhất (quá 2,5s thì combo về nhịp 0)
  lastX: number;
  lastY: number;
  spriteSet: string | null; // GĐ13/14: bộ sprite pixel thật (hero/elder/shopdan/...) hoặc null = bản vẽ code
  petSprite?: boolean; // GĐ122: pet dùng sprite quái tạm (1 khung tĩnh, không đổi khung đi bộ)
  // GĐ16: lớp phủ vũ khí cầm tay
  weaponImg: Phaser.GameObjects.Image | null;
  weaponImg2: Phaser.GameObjects.Image | null;
  weaponId: string | null;
  classId: string;
  wpnBehind: boolean;
  mountImg: Phaser.GameObjects.Image | null; // GĐ161: hình thú cưỡi dưới người
  swordImg: Phaser.GameObjects.Image; // GĐ171: thanh phi kiếm dưới chân khi ngự kiếm bay
  lungeUntil: number; // GĐ171: chặn spam hoạt ảnh lao vào khi đánh thường (người khác/pet)
  mountShown: string; // GĐ161: loài đang hiện ('' = không cưỡi)
  mountFxAt?: number; // GĐ203: lần cuối nhả vệt cưỡi
  lastFxX?: number; lastFxY?: number; // GĐ203: vị trí render lần trước (đo di chuyển)
  bubble: Phaser.GameObjects.Text; // GĐ168: bong bóng chat trên đầu
  ptImg?: Phaser.GameObjects.Image; // GĐ184: hình Pháp Tướng khổng lồ sau lưng
  bubbleUntil: number; // GĐ168: mốc ẩn bong bóng (Phaser time)
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
  'blacksmith', // GĐ158: Thợ Rèn có sprite riêng (1 ảnh mặt trước dùng cho mọi khung — NPC đứng yên tại lò rèn)
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
  if (cat === 'spear' || cat === 'dagger' || cat === 'needle' || cat === 'fist') return 'thrust'; // GĐ189: tay không = đấm (nhóm đâm)
  if (cat === 'shield') return 'guard';
  if (cat === 'sword' || cat === 'axe' || cat === 'club' || cat === 'sickle' || cat === 'fan' || cat === 'claw' || cat === 'dual') return 'swing'; // GĐ189: song kiếm/song đao = chém (trước rơi nhầm vào 'raise', tay phụ đứng yên)
  return 'raise'; // staff, beads, bowl, flag, book, scroll, brush, lute...
}
// GĐ190: COMBO ĐẶC TRƯNG TỪNG VŨ KHÍ — mỗi món có 3 nhịp riêng (không
// còn dùng chung theo nhóm). Thông số: flip = quét ngược chiều; chop =
// bổ trên xuống; sweep = quét ngang (nhóm đâm); arc = biên độ quét;
// ext = độ vươn (px); tilt = nghiêng; dip = chúc xuống; lift = giơ cao;
// spin = xoay vòng; osc = rung (gảy/vẩy). Thiếu món nào thì lùi về
// combo theo nhóm (defaultMoveFor) như GĐ188.
interface WpnMove { m: 'swing' | 'thrust' | 'raise' | 'guard'; flip?: boolean; chop?: boolean; sweep?: boolean; arc?: number; ext?: number; tilt?: number; dip?: number; lift?: number; spin?: number; osc?: number }
const WPN_COMBOS: Record<string, [WpnMove, WpnMove, WpnMove]> = {
  // Thể Tu
  taykhong: [{ m: 'thrust', ext: 8, tilt: 0.45 }, { m: 'thrust', ext: 8, tilt: -0.45 }, { m: 'thrust', ext: 15 }], // đấm liên hoàn: móc trái, móc phải, đấm thẳng nặng
  chienphu: [{ m: 'swing', arc: 1.25 }, { m: 'swing', flip: true, arc: 1.25 }, { m: 'swing', chop: true, arc: 1.2 }], // rìu: quét vòng 2 chiều rồi bổ
  cukiem: [{ m: 'swing', arc: 1.45 }, { m: 'swing', flip: true, arc: 1.45 }, { m: 'swing', chop: true, arc: 1.3 }], // cự kiếm: quét cực rộng
  daothe: [{ m: 'swing' }, { m: 'swing', flip: true }, { m: 'swing', chop: true }], // đao: chém xuôi, ngược, bổ
  thuongthe: [{ m: 'thrust' }, { m: 'thrust', sweep: true }, { m: 'thrust', ext: 9, tilt: 0.9, dip: 6 }], // thương: đâm, quét ngang, bổ dọc
  thietcon: [{ m: 'swing', arc: 0.9 }, { m: 'swing', flip: true, arc: 0.9 }, { m: 'thrust', ext: 13 }], // côn: quét 2 chiều rồi đâm
  // Phật Tu
  phatchau: [{ m: 'raise' }, { m: 'raise', tilt: 0.55 }, { m: 'raise', spin: 1 }], // phật châu: giơ, chếch, XOAY CHÂU
  quyentruong: [{ m: 'raise' }, { m: 'thrust', ext: 10 }, { m: 'raise', lift: 14 }], // quyền trượng: giơ, điểm trượng, giơ cao
  binhbat: [{ m: 'raise' }, { m: 'raise', ext: 9 }, { m: 'raise', lift: 12, tilt: -0.4 }], // bình bát: nâng, đẩy bát ra, nâng cao
  // Cốt Tu
  cotthuan: [{ m: 'guard', ext: 4 }, { m: 'guard', ext: 6, tilt: 0.3 }, { m: 'guard', ext: 11 }], // khiên: đỡ, đỡ chếch, HÚC khiên
  cotchuy: [{ m: 'swing', arc: 1.15 }, { m: 'swing', chop: true, arc: 1.2 }, { m: 'swing', flip: true, arc: 1.15 }], // chùy: quét, bổ nặng, quét ngược
  colenh: [{ m: 'swing', arc: 1.1 }, { m: 'swing', flip: true, arc: 1.1 }, { m: 'raise', lift: 12 }], // cờ lệnh: phất 2 chiều rồi dựng cờ
  luoihai: [{ m: 'swing', dip: 4 }, { m: 'swing', flip: true, dip: 4 }, { m: 'swing', chop: true }], // lưỡi hái: gặt thấp 2 chiều, bổ
  // Quỷ Tu
  quythuong: [{ m: 'thrust', ext: 14 }, { m: 'thrust', sweep: true, arc: 1.25 }, { m: 'thrust', ext: 16, spin: 0.5 }], // quỷ thương: đâm xa, quét rộng, đâm XOAY
  // Ảnh Tu
  daogam: [{ m: 'thrust', ext: 8 }, { m: 'thrust', ext: 8, tilt: 0.7 }, { m: 'swing', arc: 0.6 }], // dao găm: đâm nhanh, đâm chéo, cứa
  songdao: [{ m: 'swing', arc: 0.95 }, { m: 'swing', flip: true, arc: 0.95 }, { m: 'swing', chop: true, arc: 0.9 }], // song đao: chém lệch nhịp 2 tay
  liemngan: [{ m: 'swing', arc: 0.7, dip: 2 }, { m: 'swing', flip: true, arc: 0.7, dip: 2 }, { m: 'thrust', ext: 9, tilt: 0.6 }], // liềm ngắn: móc thấp nhanh, đâm móc
  trao: [{ m: 'swing', arc: 0.65 }, { m: 'swing', flip: true, arc: 0.65 }, { m: 'swing', chop: true, arc: 0.7 }], // trảo: cào xé liên tiếp
  // Kiếm Tu
  kiem: [{ m: 'swing' }, { m: 'thrust', ext: 13 }, { m: 'swing', flip: true }], // kiếm: chém, ĐÂM, chém ngược (đúng kiếm pháp)
  songkiem: [{ m: 'swing', arc: 1.05 }, { m: 'swing', flip: true, arc: 1.05 }, { m: 'thrust', ext: 12 }], // song kiếm: chém đôi rồi đâm
  trongkiem: [{ m: 'swing', arc: 1.5 }, { m: 'swing', chop: true, arc: 1.35 }, { m: 'swing', flip: true, arc: 1.5 }], // trọng kiếm: mỗi đòn đều nặng và rộng
  // Pháp Tu
  phien: [{ m: 'swing', arc: 0.9 }, { m: 'swing', flip: true, arc: 1.15 }, { m: 'swing', arc: 1.3 }], // phiến: quạt nhẹ, quạt quét (đạn cong), quạt mạnh (đạn to)
  phaptruong: [{ m: 'raise' }, { m: 'raise', tilt: 0.5 }, { m: 'raise', lift: 13, spin: 0.5 }], // pháp trượng: giơ, chếch, giơ cao xoay nhẹ
  sachphep: [{ m: 'raise' }, { m: 'raise', ext: 8 }, { m: 'raise', osc: 0.22 }], // sách phép: giơ, đẩy sách, LẬT TRANG (rung)
  // Y Tu
  phattran: [{ m: 'swing', arc: 0.85 }, { m: 'swing', flip: true, arc: 0.85 }, { m: 'swing', arc: 1.1 }], // phất trần: phất mềm 2 chiều, phất rộng
  kimcham: [{ m: 'thrust', ext: 6 }, { m: 'thrust', ext: 6, tilt: 0.4 }, { m: 'thrust', ext: 11 }], // kim châm: châm nhanh chính xác, đòn cuối sâu
  // Nho Tu
  cocam: [{ m: 'raise', osc: 0.3 }, { m: 'raise', tilt: 0.5, osc: 0.2 }, { m: 'raise', lift: 12 }], // cổ cầm: GẢY đàn (rung), gảy chếch, nâng đàn
  ngamtho: [{ m: 'raise' }, { m: 'raise', tilt: 0.55 }, { m: 'raise', lift: 13 }], // ngâm thơ: kết ấn 3 nhịp
  butphep: [{ m: 'swing', arc: 0.6 }, { m: 'swing', flip: true, arc: 0.6 }, { m: 'thrust', ext: 10 }], // bút phép: vẩy bút 2 chiều, CHẤM bút
  quyentruc: [{ m: 'raise' }, { m: 'swing', arc: 1.1 }, { m: 'raise', lift: 12, tilt: -0.4 }], // quyển trục: giơ, MỞ TRỤC quét, giơ cao
};
function defaultMoveFor(motion: 'swing' | 'thrust' | 'raise' | 'guard', cv: number): WpnMove {
  if (motion === 'swing') return cv === 1 ? { m: 'swing', flip: true } : cv === 2 ? { m: 'swing', chop: true } : { m: 'swing' };
  if (motion === 'thrust') return cv === 1 ? { m: 'thrust', sweep: true } : cv === 2 ? { m: 'thrust', ext: 9, tilt: 0.9, dip: 6 } : { m: 'thrust' };
  if (motion === 'raise') return cv === 1 ? { m: 'raise', tilt: 0.55 } : cv === 2 ? { m: 'raise', tilt: -0.55 } : { m: 'raise' };
  return cv === 0 ? { m: 'guard', ext: 3 } : cv === 1 ? { m: 'guard', ext: 5, tilt: 0.3 } : { m: 'guard', ext: 5, tilt: -0.3 };
}
const NPC_SPRITE_SET: Record<string, string> = {
  npc_truonglang: 'elder',
  npc_dan: 'shopdan',
  npc_nguyenlieu: 'shopnl',
  npc_sugia: 'envoy', // GĐ42
  npc_thuongnhan: 'merchant', // GĐ42
  npc_laibuan: 'merchant', // GĐ124: Lái Buôn cùng nghề thương nhân — dùng chung bộ merchant
  npc_ren: 'blacksmith', // GĐ158: sprite Thợ Rèn riêng (trước GĐ124 dùng tạm dân làng áo nâu)
  npc_master_dansu: 'elder', // GĐ131: sư phụ dạy nghề — tạm dùng lại bộ sprite dân làng (chờ sprite riêng)
  npc_master_luyenkhi: 'villager-c',
  npc_master_tranphap: 'envoy',
  npc_master_phusu: 'villager-a',
  npc_master_thusu: 'villager-b',
  npc_master_daokhoang: 'merchant', // GĐ132: sư phụ thu thập — tạm dùng lại bộ sprite sẵn có (chờ sprite riêng)
  npc_master_haithuoc: 'shopdan', // GĐ132: sư phụ thu thập — tạm dùng lại bộ sprite sẵn có (chờ sprite riêng)
  npc_thaoduoc: 'villager-b', // GĐ140: tạm dùng dân làng (chờ sprite riêng)
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
  { id: 'satthu', name: 'Ảnh tu' },
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
  ['minhMan', 'Minh Mẫn'],
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
  aoeR?: number; // GĐ171: dữ liệu vòng báo trước chiêu quái
  wuEnd?: number;
  wuDur?: number;
  teleRing?: Phaser.GameObjects.Arc; // GĐ171: vòng đỏ báo trước trên mặt đất
  maxHp?: number; // GĐ169: máu tối đa (để cỡ chữ số sát thương nổi)
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
  monSprite?: boolean; // GĐ118: dùng sprite PixelLab (đứng yên, không đổi khung đi bộ)
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
  envoySect?: {
    id: string; name: string; sizeText: string; needText: string; open: boolean;
    canJoin: boolean; missing: string[]; isMember: boolean;
    skills: Array<{ id: string; name: string; coef: number; cdMs: number; cost: number; fxText?: string; condText?: string; sectCondText?: string; sectSkill?: boolean; learned?: boolean; isLearning?: boolean; canLearn?: boolean; missingText?: string }> | null;
  } | null; // GĐ89: sứ giả trụ sở tông tại thành phố
  merchantInfo?: {
    stock: Array<{ itemId: string; price: number; qty: number }>;
    catalog: Array<{ itemId: string; orderPrice: number }>;
    hint: string;
    order: { itemId: string } | null;
    rep?: number;
    repDiscount?: number;
  } | null; // GĐ40+, GĐ86: khách quen
  masterInfo?: {
    jobId: string; jobName: string;
    hasJob: boolean; hasOtherJob: boolean; otherJobName: string | null;
    isApprentice: boolean; guide: string;
  } | null; // GĐ131: sư phụ dạy nghề
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
  private tameTargetId: string | null = null; // GĐ137: thú yếu gần nhất để nút Thuần Hóa nhắm tới
  private tameTargetDist: number | null = null; // GĐ137: khoảng cách tới thú đó
  private dodgeCdEnd = 0; // GĐ46: mốc hết hồi Né (khớp DODGE_CD_MS phía server)
  private sndPrevInvTotal: number | null = null; // GĐ167: tổng số vật phẩm lần sync trước (phát hiện nhặt đồ)
  private chatOpen = false; // GĐ168: đang gõ trong ô chat (khóa phím game)
  private chatCh: 'near' | 'world' | 'party' = 'near'; // GĐ168: kênh chat hiện tại; GĐ194: thêm kênh Tổ đội
  // GĐ170: giao dịch người chơi
  private tradeNearId: string | null = null;
  // GĐ194: trạng thái xã hội phía client
  private nearPlayerId: string | null = null;
  private nearPlayerName = '';
  private friendState: { friends: FriendRow[]; reqs: string[] } = { friends: [], reqs: [] };
  private myParty: PartyState | null = null;
  private socialInvite: { kind: 'friend' | 'party'; fromName: string } | null = null;
  private socialInviteTimer = 0;
  private boardCur = 'tuvi';
  private tradeInviteFromId: string | null = null;
  private tradeInviteTimer: number | null = null;
  private tradeState: { partnerName: string; mine: TradeOffer; theirs: TradeOffer; myConf: boolean; theirConf: boolean } | null = null;
  private tradeLocal: { items: Record<string, number>; stones: number; mounts: string[]; gear: string[] } = { items: {}, stones: 0, mounts: [], gear: [] };
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
  private portalObjects: Phaser.GameObjects.GameObject[] = []; // GĐ128: dấu Trận Dịch Chuyển trên map GDD
  private studyObjects: Phaser.GameObjects.GameObject[] = []; // GĐ105: dấu điểm đọc sách Văn Uyển
  private nodeObjects: Phaser.GameObjects.GameObject[] = []; // GĐ132: quầng điểm tài nguyên
  private nodeLabels: Array<{ label: Phaser.GameObjects.Text; x: number; y: number }> = []; // GĐ132: nhãn điểm tài nguyên (chỉ hiện khi gần, như NPC thành phố)
  private cityNpcObjects: Phaser.GameObjects.Container[] = []; // GĐ89: dân thành phố
  private cityNpcById = new Map<string, Phaser.GameObjects.Container>(); // GĐ156: tra NPC thành phố theo id để dời vị trí (Thuyết Pháp)
  private cityNpcLabels: Array<{ label: Phaser.GameObjects.Text; x: number; y: number; c?: Phaser.GameObjects.Container }> = []; // GĐ89: nhãn chức năng (chỉ hiện khi gần); GĐ156: + thùng chứa để lấy vị trí sống
  private lastNpcDialogId = 'npc_sugia'; // GĐ89: hộp thoại NPC đang mở (nút Gia nhập mở lại đúng NPC)
  private myMeditating = false; // GĐ76: mình có đang ngồi thiền không (từ tick)
  private lastCombatLocal = 0; // GĐ76: ước lượng giao tranh phía client (để hiện nút thiền)
  private prevOwnHp = -1; // GĐ76: phát hiện bị đánh qua tick
  private bossShown: { id: string; name: string; hp: number; maxHp: number; dist: number; at: number } | null = null; // GĐ61
  private journeyUntil = 0; // GĐ60: mốc hết hành trình ngự kiếm/thuyền (đếm ngược hiển thị)
  private journeyText = '';
  private homeObjects: Phaser.GameObjects.GameObject[] = [];
  private boardLabel: Phaser.GameObjects.Text | null = null; // GĐ174: nhãn Bảng Treo Thưởng (hiện theo tầm gần)
  private portalHomeLabel: Phaser.GameObjects.Text | null = null; // GĐ174: nhãn Trận Dịch Chuyển ở làng
  private proxLabels: Array<{ t: Phaser.GameObjects.Text; x: number; y: number }> = []; // GĐ174: nhãn điểm đặc biệt theo map (đàn tế/cổng/điểm đọc sách)
  // Trạng thái thế giới đầy đủ phía client — gộp từ các tick delta (A+B)
  private worldPlayers = new Map<string, PlayerState>();
  private worldMonsters = new Map<string, MonsterState>();
  private worldDrops = new Map<string, DropState>();
  private worldChests = new Map<string, ChestState>(); // GĐ39
  private chestActors = new Map<string, Phaser.GameObjects.Container>(); // GĐ39
  private worldNpcs: NpcState[] = [];
  private npcActors = new Map<string, Phaser.GameObjects.Container>();
  // GĐ150: trạng thái hội thoại liên tục của NPC (câu hiện tại, lịch nói tiếp)
  private dialogueState = new Map<string, { idx: number; nextAt: number; until: number }>();
  private lastDialogueCheck = 0;
  private dropActors = new Map<string, Phaser.GameObjects.Container>();
  private openPanel: 'shop' | 'quest' | 'inv' | 'job' | 'ach' | 'learn' | 'bangvang' | 'stones' | 'altar' | 'forge' | 'hint' | 'mount' | null = null;
  private mountShopMode = false; // GĐ161: panel thú cưỡi mở từ trại (hiện mục mua bán) hay từ Menu (chỉ chuồng của mình)
  private currentShop = '';
  private invTab: 'items' | 'gear' = 'items'; // GĐ119: tab Túi đồ đang mở
  private forgeStock: ForgeStock = null; // GĐ119 bước 5: entry kho dạng phẳng (không lồng .item)
  private forgeDay: number | null = null; // GĐ119 bước 5: ngày của kho đang hiển thị
  private forgeMeta: ForgeMeta = null; // GĐ119 bước 5
  private lastMerchantInfo: NpcDialogData['merchantInfo'] = null; // GĐ40+
  private questMode: 'board' | 'elder' = 'board';
  private formTrig!: Phaser.GameObjects.Image;
  private formStar!: Phaser.GameObjects.Image;
  private hud!: Phaser.GameObjects.Text;
  private toast!: Phaser.GameObjects.Text;
  private keys!: Record<'W' | 'A' | 'S' | 'D' | 'UP' | 'DOWN' | 'LEFT' | 'RIGHT', Phaser.Input.Keyboard.Key>;
  private lastSent = { vx: 0, vy: 0 };
  private amDowned = false; // GĐ128: chính mình đang gục ngã (linh thể) — chặn đánh/né/chiêu/tương tác ở client
  private downedWarned5 = false; // GĐ128: đã báo "còn 5s hồi sinh" trong lần gục này
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
    // GĐ111: sprite ngoại cảnh PixelLab (sheet A–E, cắt nền trong suốt) —
    // 41 loại decor, load lỗi thì decorTexture rơi về vẽ code như cũ.
    for (const dk of ['anvil','bamboo','banner','blood_tree','blossom','bone','cactus','cave','coral','crystal','crystal_gold','dead_tree','desk','fence','flower','forge','furnace','grass','grass_tall','hay','herb','hut','ice_crystal','ice_shard','lamp','lava_pool','lava_rock','mountain','mountain_snow','mushroom','palm','pavilion','pillar','pine','pond','reed','rock','stone','swamp_tree','sword_stone','tomb','wave','willow','dune']) {
      this.load.image(`decor-spr-${dk}`, `/sprites/decor/${dk}.png`);
    }
    // GĐ116: sprite dãy núi tuyết liền 1 mảng.
    this.load.image('ridge-snow', '/sprites/ridge_snow.png');
    // GĐ118: sprite quái PixelLab (21 loài) — load lỗi thì quái lùi về
    // họ hình vẽ code như cũ (kiểm tra textures.exists lúc dựng actor).
    for (const [kind, file] of Object.entries(MON_SPRITE)) {
      this.load.image('mon-' + kind, '/sprites/monsters/' + file + '.png');
    }
    // GĐ161: sprite thú cưỡi bán ở Trại Ngự Thú (loài hoang thuần hóa hộ /
    // nở từ trứng dùng lại sprite quái mon-* qua bảng MOUNT_TEX).
    for (const sp of ['linh_ma', 'thanh_van_hac', 'huyen_quy']) {
      this.load.image('mount-' + sp, '/sprites/mounts/' + sp + '.png');
    }
  }

  create(): void {
    // ---------- Thế giới GĐ9: nền/nhà/cây/vòng trận/bảng nướng từ đồ họa bản cũ ----------
    bakeWorldTextures(this);
    const WG = WORLD_GEO;
    // GĐ28: texture môi trường nướng 2× → hiển thị scale 0.5 (texel 1px, nét như sprite)
    this.homeObjects.push(this.add.image(0, 0, 'world-bg').setOrigin(0, 0).setDepth(-100)); // GĐ175: nền nướng 1× nên không scale
    this.homeObjects.push(this.add.image(hs175(1600), 0, 'realm-bg').setOrigin(0, 0).setDepth(-100)); // GĐ57: nền dải rừng + bí cảnh; GĐ175: điểm cắt mới
    WG.houses.forEach((h, i) => {
      // GĐ73: Đạo Quán nướng canvas riêng nên padX riêng — điều kiện
      // phải khớp y hệt bên bake (kẻo load lỗi là lệch vị trí).
      const dqPadX = h.name === 'Đạo Quán' && this.textures.exists('dao-quan-01') ? DAOQUAN_TEX.padX : HOUSE_TEX.padX;
      this.homeObjects.push(
        this.add
          .image(h.x - dqPadX, h.y - HOUSE_TEX.padY, 'house-' + i)
          .setOrigin(0, 0)
          .setScale(0.5)
          .setDepth(-90),
      );
    });
    WG.trees.forEach((t, i) => {
      this.homeObjects.push(
        this.add
          .image(t[0], t[1] + 12, 'tree-' + i)
          .setOrigin(TREE_TEX.originX, TREE_TEX.originY)
          .setScale(0.5)
          .setDepth(-90),
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
    this.homeObjects.push(this.add.image(hs175(740), hs175(606), 'board').setOrigin(0, 0).setScale(0.5).setDepth(-90)); // GĐ175
    const boardLbl = this.add
      .text(hs175(800), hs175(612), 'Bảng Treo Thưởng', { // GĐ175
        fontFamily: 'Palatino, Georgia, serif',
        fontSize: '12px',
        color: '#ffe9a8',
        stroke: '#0a1410', strokeThickness: 3,
      })
      .setOrigin(0.5, 1)
      .setDepth(10000);
    this.homeObjects.push(boardLbl);
    this.boardLabel = boardLbl; // GĐ174

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
    // GĐ171: thanh phi kiếm (vẽ canvas: lưỡi bạc + cán vàng/nâu) hiện
    // dưới chân người đang ngự kiếm bay thay cho dấu 🕊️ cũ
    if (!this.textures.exists('flysword')) {
      const cv = this.textures.createCanvas('flysword', 48, 16);
      if (cv) {
        const cx = cv.getContext();
        cx.fillStyle = '#5a3d22'; cx.fillRect(4, 6.5, 7, 3); // cán
        cx.fillStyle = '#e8b13c'; cx.fillRect(11, 4, 3.5, 8); // chắn tay
        cx.beginPath(); cx.moveTo(14, 8); cx.lineTo(42, 5.2); cx.lineTo(47, 8); cx.lineTo(42, 10.8); cx.lineTo(14, 10); cx.closePath(); // lưỡi
        const grd = cx.createLinearGradient(14, 5, 14, 11);
        grd.addColorStop(0, '#f4f9ff'); grd.addColorStop(0.5, '#c7d6e4'); grd.addColorStop(1, '#93a9bd');
        cx.fillStyle = grd; cx.fill();
        cx.fillStyle = '#e8b13c'; cx.beginPath(); cx.arc(3.2, 8, 1.8, 0, Math.PI * 2); cx.fill(); // chuôi tròn
        cv.refresh();
      }
    }
    // GĐ172: texture cột sáng đột phá (vàng, mờ 2 mép)
    if (!this.textures.exists('beampillar')) {
      const bv = this.textures.createCanvas('beampillar', 64, 256);
      if (bv) {
        const bx = bv.getContext();
        const grd = bx.createLinearGradient(0, 0, 64, 0);
        grd.addColorStop(0, 'rgba(255,216,115,0)');
        grd.addColorStop(0.5, 'rgba(255,226,150,0.95)');
        grd.addColorStop(1, 'rgba(255,216,115,0)');
        bx.fillStyle = grd;
        bx.fillRect(0, 0, 64, 256);
        bv.refresh();
      }
    }
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
      sheen(hs175(250), hs175(950), 580, 400, 0.07, 0xaecbf5); // bãi farm sói (tây nam)
      sheen(hs175(1330), hs175(215), 540, 350, 0.07, 0xaecbf5); // góc thạch quái (đông bắc)
      sheen(hs175(990), hs175(890), 165, 100, 0.13, 0xdceaff, true); // ánh trăng trên mặt ao
    }

    // GĐ59: TRẬN DỊCH CHUYỂN ở mép đông quảng trường làng (1080,600) — cổng đi các bản đồ khác
    {
      const stone = this.add.image(hs175(1080), hs175(600), 'moonGlow').setScale(0.55).setAlpha(0.5).setTint(0x57c98b).setDepth(598); // GĐ175
      this.tweens.add({ targets: stone, alpha: 0.28, scale: 0.44, duration: 1300, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
      const stoneLbl = this.add
        .text(hs175(1080), hs175(570), 'Trận Dịch Chuyển', { // GĐ175
          fontFamily: 'Palatino, Georgia, serif', fontSize: '12px', color: '#a9e8c9',
          stroke: '#0a1410', strokeThickness: 3,
        })
        .setOrigin(0.5, 1)
        .setDepth(601);
      this.homeObjects.push(stone, stoneLbl);
      this.portalHomeLabel = stoneLbl; // GĐ174
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
      kb.on('keydown-F', () => this.toggleFly()); // GĐ88: ngự kiếm bay / hạ xuống (Kim Đan)
      kb.on('keydown-ZERO', () => this.castSlot(5)); // GĐ88: ô chiêu thứ 6 (Kim Đan) — phím 0
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
    wire('hintClose', () => this.closePanels()); // GĐ150
    wire('boardClose', () => this.closePanels()); // GĐ40+
    wire('invClose', () => this.closePanels());
    wire('forgeClose', () => this.closePanels()); // GĐ119 bước 5: Tiệm Rèn
    wire('mountClose', () => this.closePanels()); // GĐ161: Trại Thú Cưỡi
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
      this.socket.emit('friend_list'); // GĐ194: lấy danh sách bạn + số lời mời chờ (huy hiệu trên nút Xã hội)
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
      sound.setMeditating(!!d.on); // GĐ167
      this.showToast(d.on
        ? '🧘 Bắt đầu BẾ QUAN tại Tụ Linh Trận — hấp thụ linh khí +3 Tu vi/ngày. Di chuyển hoặc ra đòn sẽ dừng bế quan.'
        : 'Đã dừng bế quan.');
    });

    // GĐ25: TỌA HÓA vĩnh viễn (hết thọ + hết ân hạn) → báo + về màn hình chờ
    this.socket.on('character_died', (d: { name: string; message: string }) => {
      sound.play('death'); // GĐ167
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
      // GĐ167: tổng vật phẩm tăng = vừa nhặt/mới nhận đồ -> tiếng nhặt
      const invTotal = Object.values(c.inventory || {}).reduce((a, b) => a + (b || 0), 0);
      if (this.sndPrevInvTotal !== null && invTotal > this.sndPrevInvTotal) sound.play('pickup');
      this.sndPrevInvTotal = invTotal;
      this.myChar = c;
      (window as unknown as { tttChar?: CharacterData }).tttChar = c;
      this.renderHudCharStatic();
      this.renderSkillBar();
      this.refreshPanels();
    });

    // Thông báo chung từ server (mua bán / nhiệm vụ / dùng đồ — GĐ8)
    this.socket.on('notice', (n: { text: string }) => {
      // GĐ185: thông báo THÀNH TỰU (mở đầu bằng 🏆) → sang chồng thông
      // báo mép PHẢI như hạ gục/nhặt đồ (Bảo chốt 30/10), không vào
      // toast giữa + nhật ký trái nữa cho đỡ rối.
      if (n.text && n.text.startsWith('🏆')) { this.sideNote(n.text); return; }
      this.showToast(n.text); this.pushLog(n.text);
    });
    // GĐ168: tin chat người chơi -> dòng trong ô chat + bong bóng trên đầu
    this.socket.on('chat_msg', (m: { id: string; name: string; text: string; ch: string }) => {
      this.appendChatLine(m);
      this.showChatBubble(m.id, m.text);
    });
    // GĐ169: SỐ SÁT THƯƠNG NỔI (server gom theo tick, số thật từ công thức)
    this.socket.on('dmg_float', (d: { list: Array<{ id: string; dmg: number; t: string; c?: number }> }) => {
      for (const e of d.list || []) this.spawnDmgFloat(e.id, e.dmg, e.t, !!e.c);
    });
    // ===== GĐ170: giao dịch người chơi =====
    this.socket.on('trade_invite', (d: { fromId: string; fromName: string }) => {
      this.tradeInviteFromId = d.fromId;
      const body = document.getElementById('tradeInviteBody');
      if (body) body.textContent = `${d.fromName} muốn giao dịch với bạn. Lời mời hết hạn sau 30 giây.`;
      const panel = document.getElementById('tradeInvite');
      if (panel) panel.style.display = 'block';
      sound.play('learn');
      if (this.tradeInviteTimer) window.clearTimeout(this.tradeInviteTimer);
      this.tradeInviteTimer = window.setTimeout(() => { if (panel) panel.style.display = 'none'; this.tradeInviteFromId = null; }, 30000);
    });
    // ===== GĐ194/GĐ195: xã hội =====
    this.socket.on('friend_state', (d: { friends: FriendRow[]; reqs: string[] }) => {
      this.friendState = d || { friends: [], reqs: [] };
      const bdg = document.getElementById('socialBdg');
      if (bdg) { bdg.style.display = this.friendState.reqs.length ? 'block' : 'none'; bdg.textContent = String(this.friendState.reqs.length); }
      this.renderFriends();
    });
    this.socket.on('friend_request_in', (d: { from: string }) => this.showSocialInvite('friend', d.from));
    this.socket.on('party_invite_in', (d: { fromId: string; fromName: string }) => this.showSocialInvite('party', d.fromName));
    this.socket.on('party_update', (d: { party: PartyState | null }) => { this.myParty = d.party; this.renderParty(); });
    this.socket.on('player_card', (card: PlayerCard) => this.renderPlayerCard(card));
    this.socket.on('leaderboard_data', (d: { board: string; top: BoardRow[]; me: (BoardRow & { rank: number }) | null }) => this.renderBoard(d));
    this.socket.on('trade_open', () => {
      this.tradeLocal = { items: {}, stones: 0, mounts: [], gear: [] };
      const panel = document.getElementById('tradePanel');
      if (panel) panel.style.display = 'block';
      const inv = document.getElementById('tradeInvite');
      if (inv) inv.style.display = 'none';
    });
    this.socket.on('trade_update', (d: { partnerName: string; mine: TradeOffer; theirs: TradeOffer; myConf: boolean; theirConf: boolean }) => {
      this.tradeState = d;
      // đồng bộ bản nháp theo bản server đã kiểm (số bị kẹp về đúng túi)
      this.tradeLocal = { items: { ...d.mine.items }, stones: d.mine.stones, mounts: d.mine.mounts.map((m) => m.uid), gear: (d.mine.gear || []).map((g) => g.uid) };
      this.renderTrade();
    });
    this.socket.on('trade_done', (d: { text: string }) => { this.showToast(d.text); sound.play('chest'); });
    // GĐ172: luyện chế có hiệu ứng tại người (lò bùng lửa khi thành
    // công, khói xám khi hỏng) — chữ thông báo server đã gửi qua notice
    this.socket.on('craft_result', (r: { ok: boolean }) => {
      const meA = this.actors.get(this.myId);
      if (!meA) return;
      if (r.ok) {
        sound.play('coin');
        this.impactFx(meA.container.x, meA.container.y - 8, '#ffb02e', 54);
        this.time.delayedCall(170, () => { if (meA.container.active) this.impactFx(meA.container.x, meA.container.y - 14, '#ffd873', 38); });
      } else {
        sound.play('dodge');
        this.impactFx(meA.container.x, meA.container.y - 8, '#8a8f98', 36);
      }
    });
    this.socket.on('trade_closed', (d: { reason: string }) => {
      const panel = document.getElementById('tradePanel');
      if (panel) panel.style.display = 'none';
      this.tradeState = null;
      if (d.reason && d.reason !== 'done') this.showToast(`🤝 ${d.reason}`);
    });
    // GĐ39: báo nội dung rương vừa mở
    this.socket.on('chest_opened', (d: { grade: string; loot: string[] }) => {
      sound.play('chest'); // GĐ167
      this.sideNote(`🎁 Rương cấp ${d.grade}: ${d.loot.join(' · ')}`); // GĐ178: loot về chồng mép phải
      this.pushLog(`🎁 Mở rương cấp ${d.grade}: ${d.loot.join(' · ')}`);
    });

    this.socket.on('linhcan_result', (r: { linhCan: LinhCanData }) => {
      sound.play('learn'); // GĐ167
      const lc = r.linhCan;
      this.showToast(
        `✦ Linh căn: ${lc.elements.join(' · ')} (${lc.count} hệ, chính: ${lc.main})${lc.mutations && lc.mutations.length ? ` — ✦ BIẾN DỊ: ${lc.mutations.join(', ')}!` : ''} — bước vào Luyện Khí tầng 1, nhận 2 công pháp Cơ bản!`,
      );
      this.cameras.main.flash(250, 60, 200, 160);
    });

    this.socket.on('skill_learned', (r: { skill: SkillData; equipped?: boolean; slot?: number }) => {
      sound.play('learn'); // GĐ167
      this.showToast(r.equipped && r.slot
        ? `📖 Đã học công pháp ${r.skill.name} — lắp ở ô ${r.slot} (phím ${r.slot})`
        : `📖 Đã học công pháp ${r.skill.name} — ô đã đầy, mở panel Công pháp để lắp`);
    });

    this.socket.on('cast_result', (r: { ok: boolean; slot: number; area?: string; reason?: string; cdMs?: number; targetId?: string }) => {
      if (r.ok) {
        sound.noteAction(); sound.play('cast'); // GĐ167
        this.skillCdEnds.set(`${r.area || 'main'}:${r.slot}`, Date.now() + (r.cdMs || 0));
        const meA = this.actors.get(this.myId);
        if (meA) meA.castUntil = this.time.now + 260; // GĐ9: tư thế tung chiêu
        // GĐ9: viên đạn chiêu bay từ tay mình tới quái trúng đòn (màu = hệ linh căn chính)
        if (r.targetId) { this.spawnProjectile(this.myId, r.targetId, this.myChar?.linhCan?.main || 'neutral'); if (meA) this.impactFx(meA.container.x, meA.container.y - 10, FX_ELEM_COLORS[this.myChar?.linhCan?.main || 'neutral'] || '#ffd873', 30); } // GĐ177: chớp sáng lúc tung chiêu
        else if (meA) this.impactFx(meA.container.x, meA.container.y - 6, FX_ELEM_COLORS[this.myChar?.linhCan?.main || 'neutral'] || '#ffd873', 44); // GĐ171: chiêu buff/hồi không mục tiêu cũng có vòng sáng
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
        if (r.targetId) { this.spawnProjectile(r.id, r.targetId, 'neutral'); this.impactFx(a.container.x, a.container.y - 10, '#ffd873', 28); } // GĐ177: chớp tung chiêu của người khác
        else this.impactFx(a.container.x, a.container.y - 6, '#ffd873', 40); // GĐ171
      }
    });
    this.socket.on('player_attacked', (r: { id: string; targetId?: string }) => {
      if (r.id === this.myId) { sound.noteAction(); sound.play('swing'); } // GĐ167
      const a = this.actors.get(r.id);
      if (a && r.id !== this.myId) a.castUntil = this.time.now + 230;
      // GĐ171: người chơi khác / pet / đồng hành lao người vào mục tiêu khi đánh
      if (a && r.id !== this.myId && r.targetId && this.time.now > a.lungeUntil) {
        const toC = this.monsterActors.get(r.targetId)?.container || this.actors.get(r.targetId)?.container;
        if (toC) {
          a.lungeUntil = this.time.now + 320;
          const dx = (Math.sign(toC.x - a.container.x) || 1) * 11;
          this.tweens.add({ targets: a.sprite, x: dx, duration: 85, yoyo: true, ease: 'Quad.Out', onComplete: () => a.sprite.setX(0) });
        }
      }
      // GĐ11: đánh thường bằng vũ khí TẦM XA có đạn bay như chiêu
      if (r.targetId) {
        const st = this.worldPlayers.get(r.id);
        const w = st ? weaponById(st.classId, st.weaponId) : null;
        if (w && w.ranged) {
          const elem = r.id === this.myId ? this.myChar?.linhCan?.main || 'neutral' : 'neutral';
          this.spawnProjectile(r.id, r.targetId, elem, a?.comboIdx || 0); // GĐ189: đạn đòn thường theo nhịp combo của người bắn
        } else if (r.id === this.myId) {
          // GĐ171: đòn gần của mình chạm đích có tia nổ nhỏ
          const tc = this.monsterActors.get(r.targetId)?.container;
          if (tc) this.impactFx(tc.x, tc.y - 10, '#ffe9a8', 32);
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
      sound.play('breakOk'); // GĐ167
      this.cameras.main.flash(300, 255, 215, 77);
      // GĐ172: hiệu ứng theo cỡ đột phá — Đại/Kim Đan/Nguyên Anh có LÔI KIẾP
      const lvl = r.type === 'dai' || r.type === 'kimdan' || r.type === 'nguyenanh' || r.type === 'hoathan' ? 2 : r.type === 'trung' ? 1 : 0; // GĐ181: Hóa Thần cũng lôi kiếp
      this.breakthroughFx(this.myId, lvl);
      const realmName = ({ lk: 'Luyện Khí', tc: 'Trúc Cơ', kd: 'Kim Đan', na: 'Nguyên Anh', ht: 'Hóa Thần', ph: 'Phản Hư' } as Record<string, string>) // GĐ183: bỏ Vô Danh[r.realm || 'lk'] || 'Luyện Khí';
      const thoTxt = r.lifespanGain ? ` · +${r.lifespanGain} năm tuổi thọ` : '';
      this.showToast(`✦ ĐỘT PHÁ THÀNH CÔNG → ${realmName} tầng ${r.tier}! Nhận ${r.gainedPoints} điểm đột phá (mỗi điểm +2)${thoTxt}`);
    });

    // GĐ19: đột phá Đại cảnh thất bại — hiện rõ hậu quả
    this.socket.on('breakthrough_fail', (r: { message: string }) => {
      sound.play('breakFail'); // GĐ167
      this.showToast(r.message);
    });

    this.socket.on('player_breakthrough', (info: { id: string; name: string; tier: number; realm?: string; type?: string }) => {
      if (info.id !== this.myId) {
        const rn = ({ lk: 'Luyện Khí', tc: 'Trúc Cơ', kd: 'Kim Đan', na: 'Nguyên Anh', ht: 'Hóa Thần', ph: 'Phản Hư' } as Record<string, string>) // GĐ183: bỏ Vô Danh[info.realm || 'lk'] || 'Luyện Khí';
        this.showToast(`✦ ${info.name} vừa đột phá lên ${rn} tầng ${info.tier}!`);
        // GĐ172: người xung quanh cũng thấy cột sáng / lôi kiếp của họ
        const lvl = info.type === 'dai' || info.type === 'kimdan' || info.type === 'nguyenanh' || info.type === 'hoathan' ? 2 : info.type === 'trung' || info.type === 'tandang10' ? 1 : 0; // GĐ181
        this.breakthroughFx(info.id, lvl);
      }
    });

    this.socket.on('interact_error', (e: { message: string }) => {
      this.showToast(e.message);
    });

    // GĐ119 bước 5: Tiệm Rèn — meta/kho về thì vẽ lại; mua/đặt/nhận xong thì
    // xin lại kho (cờ đã mua) + char_sync vẽ lại đơn chờ.
    this.socket.on('gear_meta_result', (r: { meta: ForgeMeta }) => {
      this.forgeMeta = r.meta;
      if (this.openPanel === 'forge') this.renderForge();
    });
    this.socket.on('gear_shop_stock_result', (r: { dayIndex: number; stock: ForgeStock }) => {
      this.forgeDay = r.dayIndex;
      this.forgeStock = r.stock;
      if (this.openPanel === 'forge') this.renderForge();
    });
    this.socket.on('gear_shop_buy_result', () => { sound.play('coin'); this.socket.emit('gear_shop_stock'); }); // GĐ167: tiếng mua đồ
    this.socket.on('gear_order_result', () => { this.socket.emit('gear_shop_stock'); });
    this.socket.on('gear_claim_result', () => { this.socket.emit('gear_shop_stock'); });

    this.socket.on('player_died', (info: { name: string; by: string }) => {
      this.showToast(`☠ ${info.name} đã gục ngã trước ${info.by} và hồi sinh tại làng`);
    });

    this.socket.on('you_died', () => {
      sound.play('death'); // GĐ167
      this.cameras.main.flash(350, 160, 20, 20);
      this.showToast('☠ Bạn đã gục ngã! Hồi sinh tại quảng trường làng, máu đầy trở lại');
    });
    // GĐ104: gục ngã chờ cứu + được cứu dậy.
    this.socket.on('you_downed', (info: { by: string; leftSec: number }) => {
      sound.play('death'); // GĐ167
      this.showToast(`💀 Bạn đã gục ngã trước ${info.by}! Chờ đồng đội hồi sinh trong ${info.leftSec}s`);
    });
    this.socket.on('you_revived', (info: { by: string }) => {
      sound.play('revive'); // GĐ167
      this.showToast(`💚 ${info.by} đã dùng Hồi Dương Cứu Nghịch cứu bạn dậy!`);
    });
    this.socket.on('player_downed', (info: { name: string; by: string }) => {
      this.showToast(`💀 ${info.name} đã gục ngã trước ${info.by} — Y Tu mau cứu!`);
    });
    this.socket.on('player_revived', (info: { name: string; by: string }) => {
      this.showToast(`💚 ${info.by} đã cứu ${info.name} dậy!`);
    });

    // ---- Nhận tick DELTA (v2): gộp vào trạng thái đầy đủ rồi mới đồng bộ ----
    this.socket.on('server_tick', (w: TickPayload) => {
      if (w.world) this.updateWorldClock(w.world); // GĐ20
      const world = this.mergeTick(w);
      (window as unknown as { tttTick?: unknown }).tttTick = world;
      sound.observeTick(world.players, world.monsters, this.myId); // GĐ167: tự suy tiếng trúng đòn/bị thương/quái vận đòn
      this.syncPlayers(world.players);
      // GĐ168: ẩn bong bóng chat đã hết hạn
      for (const a of this.actors.values()) if (a.bubble.visible && this.time.now > a.bubbleUntil) a.bubble.setVisible(false);
      // GĐ170: nút Giao dịch hiện khi có NGƯỜI CHƠI THẬT khác ở gần (<=220px)
      {
        const meP = world.players.find((p) => p.id === this.myId);
        let nearId: string | null = null;
        if (meP) {
          let bestD = 220;
          for (const p of world.players) {
            if (p.id === this.myId || p.companion || p.cotVuong || p.quyHon || p.tamed || (p as unknown as { isBody?: number }).isBody) continue; // GĐ202: thân xác xuất khiếu không phải người thật để tương tác
            const dd = Math.hypot(p.x - meP.x, p.y - meP.y);
            if (dd < bestD) { bestD = dd; nearId = p.id; }
          }
        }
        this.tradeNearId = nearId;
        const tBtn = document.getElementById('tradeBtn');
        if (tBtn) {
          tBtn.classList.toggle('show', !!nearId);
          const nm = nearId ? (world.players.find((p) => p.id === nearId)?.name || '') : '';
          tBtn.title = nearId ? `Mời giao dịch ${nm}` : '';
        }
        // GĐ194: nút tương tác (xem/kết bạn/mời đội) với người thật gần nhất
        this.nearPlayerId = nearId;
        this.nearPlayerName = nearId ? (world.players.find((p) => p.id === nearId)?.name || '') : '';
        const nBtn = document.getElementById('nearBtn');
        if (nBtn) {
          nBtn.classList.toggle('show', !!nearId);
          const nmEl = document.getElementById('nearBtnName');
          if (nmEl) nmEl.textContent = this.nearPlayerName || 'Người chơi';
        }
      }
      this.syncNhoZones(world.players); // GĐ105: vòng Ý Cảnh
      this.syncTranArrays(world.players); // GĐ135: vòng trận pháp
      this.updateMeditateBtn(); // GĐ76: nút thiền theo trạng thái giao tranh (10 tick/s)
      this.syncMonsters(world.monsters);
      this.syncNpcs(world.npcs);
      this.applyNpcMoves(world.npcMoves); // GĐ156: NPC thành phố đi nghe Thuyết Pháp / trở về chỗ cũ
      this.syncDrops(world.drops);
      this.syncChests(world.chests);
    });

    // GĐ76: server báo trạng thái thiền (ngồi / bị ngắt) — cập nhật nút ngay
    this.socket.on('meditate_state', (d: { on: boolean }) => {
      sound.setMeditating(!!d.on); // GĐ167
      this.myMeditating = !!d.on;
      this.updateMeditateBtn();
    });
    // GĐ88: trạng thái bay hiển thị qua tick (p.flying) — không cần listener riêng;
    // server vẫn gửi notice + fly_state khi bật/tắt.

    // ---- Broadcast tiêu diệt quái ----
    // GĐ178 (Bảo chốt): bỏ banner to giữa màn hình — chỉ NGƯỜI HẠ thấy
    // một dòng trắng nhỏ sát mép phải "Bạn đã hạ gục 1 <tên loài>".
    this.socket.on('monster_killed', (info: { monsterId: string; kind: string; name?: string; by: string; byName?: string }) => {
      if (info.by === this.myId) {
        sound.play('kill'); // GĐ167
        this.sideNote(`Bạn đã hạ gục 1 ${info.name || info.kind}`);
      }
    });
    // GĐ178: nhặt được đồ rơi → cùng chồng thông báo mép phải
    this.socket.on('pickup_note', (n: { text: string }) => { if (n && n.text) this.sideNote(n.text); });
    // GĐ180: LÔI KIẾP THOÁT THAI HOÁN CỐT — server báo khi kiếp giáng:
    // cả map thấy cột sáng + 3 tia sét; chính chủ thêm màn hoạt ảnh chữ.
    this.socket.on('rebirth_begin', (d: { id: string; name: string; x: number; y: number }) => {
      const nowMs = Date.now(); // GĐ180: server bắn 2 đường (phòng map + thẳng) — chống chơi FX 2 lần
      if ((this as unknown as { lastRebirthFxAt?: number }).lastRebirthFxAt && nowMs - ((this as unknown as { lastRebirthFxAt?: number }).lastRebirthFxAt || 0) < 3000) return;
      (this as unknown as { lastRebirthFxAt?: number }).lastRebirthFxAt = nowMs;
      this.breakthroughFx(d.id, 2);
      if (d.id === this.myId) {
        const ov = document.getElementById('rebirthOverlay');
        if (ov) {
          ov.classList.add('show');
          window.setTimeout(() => ov.classList.add('on1'), 350);
          window.setTimeout(() => ov.classList.add('on2'), 2100);
          window.setTimeout(() => { ov.classList.remove('show', 'on1', 'on2'); }, 6800);
        }
      } else {
        this.showToast(`🕯 ${d.name} đang đón lôi kiếp thoát thai hoán cốt!`);
      }
    });

    this.socket.on('disconnect', () => {
      if (this.inGame) this.wantsRejoin = true; // GĐ56: rớt GIỮA game → tự vào lại khi nối được
      this.hud.setText('Mất kết nối server — đang thử lại…');
    });

    // Vòng cập nhật hồi chiêu trên thanh công pháp
    this.startSkillCdLoop();
  }

  // Gộp 1 tick delta vào trạng thái đầy đủ (bản full thì xóa làm lại từ đầu)
  private mergeTick(w: TickPayload): { players: PlayerState[]; monsters: MonsterState[]; npcs: NpcState[]; npcMoves: Array<{ id: string; x: number; y: number }>; drops: DropState[]; chests: ChestState[] } {
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
      npcMoves: w.npcMoves || [], // GĐ156: chuyển động của tick này (không gộp dồn)
      drops: Array.from(this.worldDrops.values()),
      chests: Array.from(this.worldChests.values()),
    };
  }

  // GĐ156: dời hình NPC thành phố theo vị trí server gửi (đi nghe Thuyết
  // Pháp / trở về chỗ cũ) — lướt 120ms cho mượt thay vì nhảy từng tick.
  private applyNpcMoves(moves: Array<{ id: string; x: number; y: number }> | undefined): void {
    if (!moves || !moves.length) return;
    for (const mv of moves) {
      const c = this.cityNpcById.get(mv.id);
      if (!c) continue;
      this.tweens.killTweensOf(c);
      this.tweens.add({ targets: c, x: mv.x, y: mv.y, duration: 120, ease: 'Linear' });
      c.setDepth(mv.y);
    }
  }

  // ---------------- Đồng bộ người chơi ----------------
  private syncPlayers(players: PlayerState[]): void {
    const seen = new Set<string>();
    let realCount = 0;

    for (const p of players) {
      seen.add(p.id);
      // GĐ76: theo dõi trạng thái thiền + bị đánh của chính mình (cho nút thiền)
      if (p.id === this.myId) {
        this.amDowned = (p.downed ?? 0) === 1; // GĐ128: linh thể — chặn đánh/né/chiêu/tương tác ở client
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
      // GĐ88: đang bay → nhãn 🕊️ (ghép vào khóa so sánh để nhãn đổi khi bật/tắt bay)
      // GĐ128: linh thể → nhãn 👻 + thân mờ 0.55 (ghép vào khóa để đổi khi gục/dậy)
      // GĐ138: danh hiệu dưới tên — đổi khi đeo/tháo danh hiệu (màu theo cấp danh hiệu).
      const titleKey = `${p.achTitle || ''}|${p.achTitleColor || ''}|${p.achTitleLevel || 0}`;
      if (actor.titleShown !== titleKey) {
        actor.titleShown = titleKey;
        actor.titleLabel.setText(p.achTitle || '');
        if (p.achTitleColor) actor.titleLabel.setColor(p.achTitleColor);
        actor.titleLabel.setFontSize(10);
        actor.titleLabel.setShadow(0, 0, '#000000', 0, false, false);
      }
      // GĐ139: hiệu ứng động cho danh hiệu cấp 8–10 (tài liệu bản -2).
      // Cấp 8 Siêu Phàm: chữ ánh kim chuyển tông; cấp 9 Chí Tôn: ánh kim + hào quang
      // lớn; cấp 10 Vô Thượng: chữ kim cầu vồng chuyển động + hào quang.
      // Chạy theo nhịp tick (10 lần/s) nên chuyển màu mượt mà không cần tween riêng.
      const tLvl = p.achTitleLevel || 0;
      if (tLvl >= 8 && p.achTitle) {
        const now = Date.now();
        if (tLvl === 8) {
          const pal = ['#ffd94d', '#fff3b0', '#e8c86a', '#ffffff'];
          actor.titleLabel.setColor(pal[Math.floor(now / 250) % pal.length]);
          actor.titleLabel.setFontSize(11);
        } else if (tLvl === 9) {
          actor.titleLabel.setColor('#ffd94d');
          actor.titleLabel.setFontSize(12);
          actor.titleLabel.setShadow(0, 0, '#ffaa00', 8, true, true);
        } else {
          // Cầu vồng tự tính (tránh typings của Phaser cho HSVToRGB).
          const hue = (now / 30) % 360;
          const cc = 0.85, xx = cc * (1 - Math.abs(((hue / 60) % 2) - 1)), mm = 1 - cc;
          let rr = 0, gg = 0, bb = 0;
          if (hue < 60) { rr = cc; gg = xx; } else if (hue < 120) { rr = xx; gg = cc; }
          else if (hue < 180) { gg = cc; bb = xx; } else if (hue < 240) { gg = xx; bb = cc; }
          else if (hue < 300) { rr = xx; bb = cc; } else { rr = cc; bb = xx; }
          actor.titleLabel.setColor(`rgb(${Math.round((rr + mm) * 255)},${Math.round((gg + mm) * 255)},${Math.round((bb + mm) * 255)})`);
          actor.titleLabel.setFontSize(12);
          actor.titleLabel.setShadow(0, 0, '#ffcc00', 10, true, true);
        }
      }
      const stateKey = `${restNow}|${p.flying ? 'fly' : ''}|${p.downed ? 'ghost' : ''}`;
      if (actor.restShown !== stateKey) {
        actor.restShown = stateKey;
        const flyMark = ''; // GĐ171: bay hiện bằng thanh phi kiếm dưới chân
        actor.swordImg.setVisible(!!p.flying);
        actor.label.setText(
          p.downed
            ? `${actor.nameText} 👻${flyMark}`
            : restNow === 'sleep'
              ? `${actor.nameText} 💤${flyMark}`
              : restNow === 'learning' || restNow === 'learn'
                ? `${actor.nameText} 📖${flyMark}`
                : restNow
                  ? `${actor.nameText} 🧘${flyMark}`
                  : `${actor.nameText}${flyMark}`,
        );
        actor.container.setAlpha((p as unknown as { xk?: number }).xk === 1 ? 0.5 : p.downed ? 0.55 : p.rest ? 0.88 : isBot ? 0.9 : 1); // GĐ202: nguyên thần mờ 50%
      }
      // GĐ184: hình Pháp Tướng khổng lồ SAU LƯNG (lớp dưới người, không
      // che người) — đồng bộ MỖI tick theo ptActive/ptStage/ptEl
      {
        const ptOn = (p as unknown as { ptActive?: number }).ptActive === 1;
        if (ptOn && !actor.ptImg) {
          actor.ptImg = this.add.image(actor.container.x, actor.container.y - 60, actor.sprite.texture.key).setAlpha(0.5).setDepth((actor.container.depth || 10) - 1);
        }
        if (actor.ptImg) {
          if (!ptOn) { actor.ptImg.destroy(); actor.ptImg = undefined; }
          else {
            const stg = (p as unknown as { ptStage?: number }).ptStage || 1;
            const el = (p as unknown as { ptEl?: string | null }).ptEl;
            actor.ptImg.setTint(el ? (PT_EL_TINT[el] ?? 0xffffff) : 0xffffff);
            if (actor.sprite.texture.key !== actor.ptImg.texture.key) actor.ptImg.setTexture(actor.sprite.texture.key);
            const fr = (actor.sprite as Phaser.GameObjects.Sprite).frame;
            if (fr && fr.name) { try { actor.ptImg.setFrame(fr.name); } catch { /* khung không khớp thì giữ nguyên */ } }
            const h = 57 * (2.0 + stg * 0.4);
            actor.ptImg.displayHeight = h;
            actor.ptImg.displayWidth = h * (actor.ptImg.width / Math.max(1, actor.ptImg.height));
            actor.ptImg.setPosition(actor.container.x, actor.container.y - h * 0.38);
          }
        }
      }
      // GĐ161: đồng bộ hình thú cưỡi theo tick — có loài thì hiện thú dưới
      // người và nâng thân người lên lưng thú; quay trái/phải thì lật hình.
      const wantMount = (p as any).mountSpecies || '';
      if (actor.mountShown !== wantMount) {
        actor.mountShown = wantMount;
        const tex = wantMount ? MOUNT_TEX[wantMount] : null;
        if (tex && actor.mountImg && this.textures.exists(tex)) {
          actor.mountImg.setTexture(tex);
          const srcH = Math.max(1, (this.textures.get(tex).getSourceImage() as HTMLImageElement).height || 1);
          actor.mountImg.setScale((MOUNT_H[wantMount] || 52) / srcH);
          actor.mountImg.setVisible(true);
          actor.sprite.setY(MOUNT_LIFT[wantMount] ?? -28);
          this.impactFx(actor.container.x, actor.container.y - 4, MOUNT_FX_COLOR[wantMount] || '#ffd873', 42); // GĐ203: vòng sáng khi lên thú
        } else if (actor.mountImg) {
          actor.mountImg.setVisible(false);
          actor.sprite.setY(0);
          this.impactFx(actor.container.x, actor.container.y - 4, '#bdbdbd', 30); // GĐ203: bụp khói nhỏ khi xuống thú
        }
      }
      if (wantMount && actor.mountImg) {
        if (p.direction === 'left') actor.mountImg.setFlipX(true);
        else if (p.direction === 'right') actor.mountImg.setFlipX(false);
        // GĐ203: vệt dưới chân thú khi đang chạy (đo theo vị trí render)
        const movedFx = Math.hypot(actor.container.x - (actor.lastFxX ?? actor.container.x), actor.container.y - (actor.lastFxY ?? actor.container.y));
        actor.lastFxX = actor.container.x; actor.lastFxY = actor.container.y;
        if (movedFx > 3 && this.time.now - (actor.mountFxAt || 0) > 130) {
          actor.mountFxAt = this.time.now;
          this.mountDustFx(actor.container.x, actor.container.y + 8, wantMount);
        }
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

    // GĐ122: pet dùng sprite quái tạm (đã nạp sẵn từ GĐ118) — thiếu texture thì lùi về đệ tử nhuộm màu
    // GĐ137: thú thuần hóa dùng sprite đúng loài của nó (mon-<kind>), cao ~60px như pet khác.
    const petMon = p.cotVuong ? 'mon-cot_vuong' : p.quyHon ? 'mon-quy_hon' : p.tamed ? (p.tamedKind ? 'mon-' + p.tamedKind : null) : null; // GĐ158: Cốt Vương/Quỷ Hồn dùng sprite riêng (trước mượn cot_binh/hap_huyet_quy)
    const petSprite = !!petMon && this.textures.exists(petMon);

    const sprite = petSprite
      ? p.tamed
        ? (() => {
            const img = this.textures.get(petMon as string).getSourceImage() as unknown as HTMLImageElement;
            // GĐ159: thú thuần hóa ngang cỡ đồng loại hoang dã (tỉ lệ thật như quái thường)
            return this.add.image(0, 0, petMon as string).setOrigin(0.5, 0.94).setScale(monSpriteScale(monBaseForKind(p.tamedKind || ''), p.tamedKind, img.height));
          })()
        : this.add
            .sprite(0, 0, petMon as string)
            .setOrigin(0.5, p.cotVuong ? 118 / 128 : 120 / 128)
            .setScale(84 / 128) // GĐ159: vật triệu hồi TO hơn người chơi ~1,3× (khung 84px → hiện ~74px) — Bảo yêu cầu riêng cho Cốt Vương/Quỷ Hồn
      : spriteSet
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
        color: isMe ? '#ffd94d' : p.cotVuong ? '#e8e4d0' : p.quyHon ? '#c8f0e4' : '#d7e8dd',
      })
      .setOrigin(0.5, 1);

    // GĐ138: danh hiệu dưới tên (nằm giữa tên và thanh máu — thanh máu dời xuống −50)
    const titleLabel = this.add
      .text(0, -56, '', {
        fontFamily: 'Palatino, Georgia, serif',
        fontSize: '10px',
        color: '#d7e8dd',
      })
      .setOrigin(0.5, 1);

    // GĐ168: bong bóng chat trên đầu (ẩn cho tới khi có tin)
    const bubble = this.add
      .text(0, -88, '', {
        fontFamily: 'Palatino, Georgia, serif',
        fontSize: '11px',
        color: '#ffffff',
        backgroundColor: 'rgba(7,13,10,0.62)',
        padding: { x: 6, y: 3 },
        wordWrap: { width: 168 },
        align: 'center',
      })
      .setOrigin(0.5, 1)
      .setVisible(false);

    // GĐ101/102: đệ tử nhuộm màu — chỉ khi KHÔNG có sprite quái tạm (GĐ122: sprite đã có màu thật)
    if (p.cotVuong && !petSprite) sprite.setTint(0xd8d4c4);
    if (p.quyHon && !petSprite) sprite.setTint(0xa8e8d8);

    // Thanh máu trên đầu
    const barBg = this.add.rectangle(0, -50, 34, 5, 0x101418).setAlpha(0.55);
    const barFg = this.add.rectangle(-16, -50, 32, 3, 0x53d769).setOrigin(0, 0.5);

    // GĐ16: lớp phủ vũ khí — chỉ cho người chơi thật dùng sprite (bản vẽ code
    // đã có vũ khí trong hình; bot/NPC không cầm vũ khí)
    let weaponImg: Phaser.GameObjects.Image | null = null;
    let weaponImg2: Phaser.GameObjects.Image | null = null;
    if (spriteSet && !isBot) {
      weaponImg = this.add.image(0, 0, '__MISSING').setOrigin(0.5, 66 / 80).setScale(0.9).setVisible(false);
      weaponImg2 = this.add.image(0, 0, '__MISSING').setOrigin(0.5, 66 / 80).setScale(0.9).setVisible(false);
      weaponImg2.setFlipX(true);
    }

    // GĐ161: hình thú cưỡi — nằm dưới thân người, chỉ hiện khi đang cưỡi
    const mountImg = this.add.image(0, 4, '__MISSING').setOrigin(0.5, 1).setVisible(false);
    const swordImg = this.add.image(0, 15, 'flysword').setOrigin(0.5, 0.5).setScale(1.25).setVisible(false); // GĐ171

    const parts: Phaser.GameObjects.GameObject[] = [];
    if (isMe) {
      const ring = this.add.ellipse(0, 2, 34, 11);
      ring.setStrokeStyle(2, 0xffffff, 0.55);
      parts.push(ring);
    }
    parts.push(mountImg);
    parts.push(swordImg); // GĐ171: phi kiếm nằm dưới thân người
    parts.push(sprite);
    if (weaponImg) parts.push(weaponImg);
    if (weaponImg2) parts.push(weaponImg2);
    parts.push(barBg, barFg, label, titleLabel, bubble);

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
      titleLabel,
      titleShown: null,
      nameText: p.name || p.id,
      restShown: null,
      dir: p.direction,
      styleKey,
      curTex: petSprite ? (petMon as string) : spriteSet ? spriteTexKey(spriteSet, p.direction, 'idle') : personTexKey(styleKey, p.direction, 'idle'),
      petSprite,
      walkPhase: 0,
      castUntil: 0, comboIdx: 0, wasPosing: false, lastPoseAt: 0,
      lastX: p.x,
      lastY: p.y,
      spriteSet,
      weaponImg,
      weaponImg2,
      weaponId: null,
      classId: p.classId,
      wpnBehind: false,
      mountImg,
      mountShown: '',
      bubble,
      bubbleUntil: 0,
      swordImg,
      lungeUntil: 0,
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
  // GĐ178: một dòng thông báo nhỏ màu trắng ở chồng sát mép phải;
  // tự mờ sau ~4 giây, tối đa 6 dòng (quá thì bỏ dòng cũ nhất).
  private sideNote(text: string): void {
    const box = document.getElementById('sideNotes');
    if (!box) return;
    const el = document.createElement('div');
    el.className = 'sideNote';
    el.textContent = text;
    box.appendChild(el);
    while (box.children.length > 6) box.removeChild(box.firstChild as Node);
    window.setTimeout(() => { el.style.opacity = '0'; }, 3600);
    window.setTimeout(() => { el.remove(); }, 4400);
  }

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
        const realmTxt = !c.linhCanMain ? 'Phàm nhân' : c.realm === 'na' ? (c.tier >= 10 ? 'Nguyên Anh · Viên mãn' : `Nguyên Anh tầng ${c.tier}`) : c.realm === 'ph' ? `Phản Hư tầng ${c.tier}` : c.realm === 'ht' ? `Hóa Thần tầng ${c.tier}` : c.realm === 'kd' ? `Kim Đan tầng ${c.tier}` : c.realm === 'tc' ? `Trúc Cơ tầng ${c.tier}` : `Luyện Khí tầng ${c.tier}`; // GĐ59 + GĐ180: gọi đúng cảnh giới cả thang mới
        info.innerHTML = `<div class="cname"></div><div class="cmeta">${c.className}${c.weaponName ? ' · ' + c.weaponName : ''} · ${realmTxt}${c.linhCanMain ? ' · Linh căn ' + c.linhCanMain : ''}${c.bienDi ? ' · ✦ Biến dị ' + c.bienDi : ''} · ${c.gender === 'nu' ? 'Nữ' : 'Nam'}</div>`;
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
        if (open) { this.refreshMenuSwatches(); this.refreshSoundBtns(); }
      };
    }
    const menuClose = byId('menuClose');
    if (menuClose && gameMenu) menuClose.onclick = () => (gameMenu.style.display = 'none');
    const menuMount = byId('menuMountBtn'); // GĐ161: mở panel thú cưỡi từ Menu
    if (menuMount && gameMenu) menuMount.onclick = () => { gameMenu.style.display = 'none'; this.openMountPanel(false); };
    // GĐ167: nút bật/tắt Nhạc nền / Hiệu ứng trong Menu + mở khóa
    // AudioContext ở thao tác đầu tiên (trình duyệt chặn tự phát)
    const menuMusic = byId('menuMusicBtn');
    if (menuMusic) menuMusic.onclick = () => { sound.unlock(); sound.toggleMusic(); this.refreshSoundBtns(); };
    const menuSfx = byId('menuSfxBtn');
    if (menuSfx) menuSfx.onclick = () => { sound.unlock(); sound.toggleSfx(); this.refreshSoundBtns(); };
    // GĐ168: ô chat — Enter ngoài game mở ô, Enter trong ô gửi tin,
    // nút kênh đổi Gần/Thế giới; khi ô có focus thì chatOpen khóa phím game
    const chatInput = document.getElementById('chatInput') as HTMLInputElement | null;
    const chatChBtn = document.getElementById('chatChBtn');
    if (chatChBtn && chatInput) {
      chatChBtn.onclick = () => {
        const order: Array<'near' | 'world' | 'party'> = ['near', 'world', 'party']; // GĐ194: thêm kênh Đội
        this.chatCh = order[(order.indexOf(this.chatCh) + 1) % order.length];
        chatChBtn.textContent = this.chatCh === 'near' ? '📍 Gần' : this.chatCh === 'world' ? '🌐 Thế giới' : '⚔ Đội';
        chatInput.focus();
      };
    }
    if (chatInput) {
      chatInput.addEventListener('focus', () => { this.chatOpen = true; });
      chatInput.addEventListener('blur', () => { this.chatOpen = false; });
      chatInput.addEventListener('keydown', (e) => {
        e.stopPropagation();
        if (e.key === 'Enter') {
          const t = chatInput.value.trim();
          if (t) this.socket.emit('chat_send', { text: t, ch: this.chatCh });
          chatInput.value = '';
          chatInput.blur();
        } else if (e.key === 'Escape') chatInput.blur();
      });
      window.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !this.chatOpen && this.myChar) { e.preventDefault(); chatInput.focus(); }
      });
    }
    // GĐ170: nút + panel giao dịch
    const tradeBtn = document.getElementById('tradeBtn');
    if (tradeBtn) tradeBtn.onclick = () => {
      if (this.tradeNearId) this.socket.emit('trade_request', { targetId: this.tradeNearId });
    };
    const tAccept = document.getElementById('tradeAcceptBtn');
    if (tAccept) tAccept.onclick = () => {
      this.socket.emit('trade_accept');
      const inv = document.getElementById('tradeInvite'); if (inv) inv.style.display = 'none';
    };
    const tDecline = document.getElementById('tradeDeclineBtn');
    if (tDecline) tDecline.onclick = () => {
      this.socket.emit('trade_decline');
      const inv = document.getElementById('tradeInvite'); if (inv) inv.style.display = 'none';
    };
    const tClose = document.getElementById('tradeClose');
    if (tClose) tClose.onclick = () => this.socket.emit('trade_cancel');
    // ===== GĐ194/GĐ195: wiring xã hội =====
    const socBtn = document.getElementById('socialBtn');
    if (socBtn) socBtn.onclick = () => {
      this.closePanels();
      const p = document.getElementById('socialPanel'); if (p) p.style.display = 'block';
      this.socket.emit('friend_list');
      this.socket.emit('leaderboard', { board: this.boardCur });
      this.renderParty();
      this.renderFriends();
    };
    const socClose = document.getElementById('socialClose');
    if (socClose) socClose.onclick = () => this.closePanels();
    const nearClose = document.getElementById('nearClose');
    if (nearClose) nearClose.onclick = () => this.closePanels();
    const cardClose = document.getElementById('cardClose');
    if (cardClose) cardClose.onclick = () => this.closePanels();
    const tabs: Array<[string, string]> = [['tabFriends', 'socFriends'], ['tabParty', 'socParty'], ['tabBoard', 'socBoard']];
    for (const [btnId, bodyId] of tabs) {
      const b = document.getElementById(btnId);
      if (b) b.onclick = () => {
        for (const [b2, bd2] of tabs) {
          const bb = document.getElementById(b2); if (bb) bb.classList.toggle('on', b2 === btnId);
          const bd = document.getElementById(bd2); if (bd) bd.style.display = bd2 === bodyId ? 'block' : 'none';
        }
        if (bodyId === 'socBoard') this.socket.emit('leaderboard', { board: this.boardCur });
        if (bodyId === 'socFriends') this.socket.emit('friend_list');
      };
    }
    document.querySelectorAll('[data-board]').forEach((el) => {
      (el as HTMLElement).onclick = () => {
        this.boardCur = (el as HTMLElement).getAttribute('data-board') || 'tuvi';
        document.querySelectorAll('[data-board]').forEach((e2) => e2.classList.toggle('on', e2 === el));
        this.socket.emit('leaderboard', { board: this.boardCur });
      };
    });
    const fAdd = document.getElementById('friendAddBtn');
    if (fAdd) fAdd.onclick = () => {
      const inp = document.getElementById('friendNameInput') as HTMLInputElement | null;
      const nm = (inp?.value || '').trim();
      if (nm) { this.socket.emit('friend_request', { name: nm }); if (inp) inp.value = ''; }
    };
    const sAcc = document.getElementById('socialAcceptBtn');
    if (sAcc) sAcc.onclick = () => {
      if (this.socialInvite) {
        if (this.socialInvite.kind === 'friend') this.socket.emit('friend_respond', { name: this.socialInvite.fromName, accept: true });
        else this.socket.emit('party_accept');
      }
      this.hideSocialInvite();
    };
    const sDec = document.getElementById('socialDeclineBtn');
    if (sDec) sDec.onclick = () => {
      if (this.socialInvite) {
        if (this.socialInvite.kind === 'friend') this.socket.emit('friend_respond', { name: this.socialInvite.fromName, accept: false });
        else this.socket.emit('party_decline');
      }
      this.hideSocialInvite();
    };
    const nearBtn = document.getElementById('nearBtn');
    if (nearBtn) nearBtn.onclick = () => {
      if (!this.nearPlayerId) return;
      const t = document.getElementById('nearTitle'); if (t) t.textContent = `👤 ${this.nearPlayerName}`;
      this.closePanels();
      const p = document.getElementById('nearPanel'); if (p) p.style.display = 'block';
    };
    const nv = document.getElementById('nearViewBtn');
    if (nv) nv.onclick = () => { if (this.nearPlayerName) this.socket.emit('view_char', { name: this.nearPlayerName }); };
    const nf = document.getElementById('nearFriendBtn');
    if (nf) nf.onclick = () => { if (this.nearPlayerName) { this.socket.emit('friend_request', { name: this.nearPlayerName }); this.closePanels(); } };
    const np = document.getElementById('nearPartyBtn');
    if (np) np.onclick = () => { if (this.nearPlayerId) { this.socket.emit('party_invite', { targetId: this.nearPlayerId }); this.closePanels(); } };
    const nt = document.getElementById('nearTradeBtn');
    if (nt) nt.onclick = () => { if (this.nearPlayerId) { this.socket.emit('trade_request', { targetId: this.nearPlayerId }); this.closePanels(); } };
    const tradeBody = document.getElementById('tradeBody');
    if (tradeBody) {
      tradeBody.addEventListener('click', (ev) => {
        const el = (ev.target as HTMLElement).closest('[data-tbag],[data-toff],[data-tmount],[data-tact],[data-tgear],[data-tgoff]') as HTMLElement | null;
        if (!el) return;
        if (el.dataset.tbag) {
          const id = el.dataset.tbag;
          const owned = this.myChar?.inventory?.[id] || 0;
          const cur = this.tradeLocal.items[id] || 0;
          if (cur < owned) this.tradeLocal.items[id] = cur + 1;
        } else if (el.dataset.toff) {
          const id = el.dataset.toff;
          const cur = this.tradeLocal.items[id] || 0;
          if (cur <= 1) delete this.tradeLocal.items[id]; else this.tradeLocal.items[id] = cur - 1;
        } else if (el.dataset.tmount) {
          const uid = el.dataset.tmount;
          const i = this.tradeLocal.mounts.indexOf(uid);
          if (i >= 0) this.tradeLocal.mounts.splice(i, 1); else this.tradeLocal.mounts.push(uid);
        } else if (el.dataset.tgear) {
          const uid = el.dataset.tgear;
          const i = this.tradeLocal.gear.indexOf(uid);
          if (i >= 0) this.tradeLocal.gear.splice(i, 1); else this.tradeLocal.gear.push(uid);
        } else if (el.dataset.tgoff) {
          const uid = el.dataset.tgoff;
          const i = this.tradeLocal.gear.indexOf(uid);
          if (i >= 0) this.tradeLocal.gear.splice(i, 1);
        } else if (el.dataset.tact === 'confirm') {
          this.socket.emit('trade_confirm', { on: !(this.tradeState && this.tradeState.myConf) });
          return;
        } else if (el.dataset.tact === 'cancel') {
          this.socket.emit('trade_cancel');
          return;
        } else return;
        this.socket.emit('trade_set', { items: this.tradeLocal.items, stones: this.tradeLocal.stones, mounts: this.tradeLocal.mounts, gear: this.tradeLocal.gear });
      });
      tradeBody.addEventListener('change', (ev) => {
        const el = ev.target as HTMLInputElement;
        if (el.id !== 'tradeStonesInput') return;
        const max = this.myChar?.stones || 0;
        let v = Math.floor(Number(el.value) || 0);
        v = Math.max(0, Math.min(v, max));
        el.value = String(v);
        this.tradeLocal.stones = v;
        this.socket.emit('trade_set', { items: this.tradeLocal.items, stones: this.tradeLocal.stones, mounts: this.tradeLocal.mounts, gear: this.tradeLocal.gear });
      });
    }
    const unlockSnd = () => sound.unlock();
    window.addEventListener('pointerdown', unlockSnd);
    window.addEventListener('keydown', unlockSnd);
    this.refreshSoundBtns();
    const menuExit = byId('menuExitBtn');
    if (menuExit) menuExit.onclick = () => this.leaveToSplash();
    const menuLogout = byId('menuLogoutBtn');
    if (menuLogout) menuLogout.onclick = () => this.logout();
  }

  // GĐ172: hiệu ứng đột phá theo cỡ: 0 = tiểu (cột sáng nhỏ),
  // 1 = trung (cột sáng + 1 tia sét), 2 = Đại (LÔI KIẾP: 3 tia sét
  // giáng xuống + rung màn hình, rồi cột sáng lớn bừng lên).
  private breakthroughFx(actorId: string, lvl: number): void {
    const a = this.actors.get(actorId);
    if (!a) return;
    const x = a.container.x, y = a.container.y;
    if (lvl >= 2) {
      sound.play('thunder');
      this.cameras.main.shake(300, 0.004);
      for (let i = 0; i < 3; i++) {
        this.time.delayedCall(i * 270, () => { this.lightningFx(x, y); if (i > 0) sound.play('thunder'); });
      }
      this.time.delayedCall(3 * 270 + 140, () => { this.pillarFx(x, y, true); sound.play('breakOk'); });
    } else if (lvl === 1) {
      this.lightningFx(x, y);
      this.time.delayedCall(200, () => this.pillarFx(x, y, false));
    } else {
      this.pillarFx(x, y, false);
    }
  }

  // GĐ172: một tia sét răng cưa từ trời giáng xuống đầu người
  private lightningFx(x: number, y: number): void {
    const g = this.add.graphics().setDepth(9997);
    const pts: Array<[number, number]> = [];
    let px = x + (Math.random() * 36 - 18);
    let cy = y - 330;
    pts.push([px, cy]);
    while (cy < y - 48) { cy += 30 + Math.random() * 24; px += Math.random() * 28 - 14; pts.push([px, cy]); }
    pts.push([x, y - 40]);
    g.lineStyle(7, 0x9fd0ff, 0.30);
    g.beginPath(); g.moveTo(pts[0][0], pts[0][1]);
    for (const [lx, ly] of pts.slice(1)) g.lineTo(lx, ly);
    g.strokePath();
    g.lineStyle(2.5, 0xeaf6ff, 0.98);
    g.beginPath(); g.moveTo(pts[0][0], pts[0][1]);
    for (const [lx, ly] of pts.slice(1)) g.lineTo(lx, ly);
    g.strokePath();
    this.cameras.main.flash(80, 190, 215, 255);
    this.impactFx(x, y - 10, '#bcd8ff', 58);
    this.tweens.add({ targets: g, alpha: 0, duration: 320, delay: 70, onComplete: () => g.destroy() });
  }

  // GĐ172: cột sáng vàng dựng lên tại người đột phá
  private pillarFx(x: number, y: number, big: boolean): void {
    const beam = this.add.image(x, y - 128, 'beampillar').setDepth(9996).setAlpha(big ? 0.95 : 0.7)
      .setScale(big ? 1.5 : 0.9, big ? 1.25 : 0.95).setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({ targets: beam, alpha: 0, duration: big ? 1500 : 950, delay: 260, ease: 'Quad.In', onComplete: () => beam.destroy() });
    this.impactFx(x, y - 6, '#ffd873', big ? 96 : 58);
  }

  // GĐ171: vòng nổ + tia lửa tại điểm chạm (màu theo hệ), dùng cho
  // đạn chiêu chạm đích, chiêu quái tung ra, đòn gần chạm đích.
  // GĐ203: vệt dưới chân thú cưỡi — mây khói mềm theo màu hệ của loài;
  // loài hệ Hỏa thêm tia lửa nhỏ bay lên, Thanh Vân Hạc là mây lớn trôi chậm.
  private mountDustFx(x: number, y: number, species: string): void {
    const colHex = MOUNT_FX_COLOR[species] || '#d8cbb0';
    const col = parseInt(colHex.replace('#', ''), 16) || 0xd8cbb0;
    const big = species === 'thanh_van_hac';
    const puff = this.add.circle(x + (Math.random() * 10 - 5), y, big ? 11 + Math.random() * 5 : 5 + Math.random() * 4)
      .setFillStyle(col, big ? 0.4 : 0.32).setDepth(9990);
    this.tweens.add({
      targets: puff, scale: 1.9, y: y + (big ? -3 : 4), alpha: 0,
      duration: big ? 560 : 380, ease: 'Quad.Out', onComplete: () => puff.destroy(),
    });
    if (species === 'hoa_thu' || species === 'thien_loi_thu') {
      const sp = this.add.image(x + (Math.random() * 14 - 7), y - 2, 'fx-orb-neutral').setDepth(9991).setScale(0.22).setTint(col);
      this.tweens.add({ targets: sp, y: y - 16 - Math.random() * 8, alpha: 0, duration: 320, ease: 'Quad.Out', onComplete: () => sp.destroy() });
    }
  }

  private impactFx(x: number, y: number, colorHex: string, radius = 46): void {
    const col = parseInt(String(colorHex).replace('#', ''), 16) || 0xffd873;
    // GĐ177 (theo ảnh mẫu): thêm chớp sáng trắng ở tâm + vòng phụ đuổi
    // theo + tia lửa nhiều và xa hơn — cú chạm trông 'nổ' hơn hẳn.
    const flash = this.add.circle(x, y, radius * 0.42).setFillStyle(0xffffff, 0.5).setDepth(9998).setScale(0.4);
    this.tweens.add({ targets: flash, scale: 1.15, alpha: 0, duration: 150, ease: 'Quad.Out', onComplete: () => flash.destroy() });
    const ring = this.add.circle(x, y, radius).setStrokeStyle(3, col, 0.95).setFillStyle(col, 0.13).setDepth(9998).setScale(0.35);
    this.tweens.add({ targets: ring, scale: 1, alpha: 0, duration: 280, ease: 'Quad.Out', onComplete: () => ring.destroy() });
    const ring2 = this.add.circle(x, y, radius * 0.72).setStrokeStyle(2, col, 0.7).setDepth(9998).setScale(0.3);
    this.tweens.add({ targets: ring2, scale: 1, alpha: 0, duration: 340, delay: 55, ease: 'Quad.Out', onComplete: () => ring2.destroy() });
    for (let i = 0; i < 11; i++) {
      const sp = this.add.image(x, y, 'fx-orb-neutral').setDepth(9998).setScale(0.35 + Math.random() * 0.35).setTint(col);
      const ang = (i / 11) * Math.PI * 2 + Math.random() * 0.55;
      const dist = radius * (0.6 + Math.random() * 0.45);
      this.tweens.add({
        targets: sp, x: x + Math.cos(ang) * dist, y: y + Math.sin(ang) * dist * 0.55,
        alpha: 0, duration: 300 + Math.random() * 130, ease: 'Quad.Out', onComplete: () => sp.destroy(),
      });
    }
  }

  // GĐ169: số sát thương nổi bay lên trên đầu mục tiêu.
  // GĐ177 viết lại theo ảnh mẫu Bảo gửi: chữ ĐẬM to, viền đen dày,
  // 'nảy' phồng lên khi xuất hiện rồi mới bay; màu vàng kem thường /
  // cam khi đòn nặng (>=20% máu tối đa) / VÀNG RỰC + to nhất khi CHÍ
  // MẠNG; sát thương lên người chơi đỏ kèm dấu trừ. Mỗi đòn một số
  // riêng (server không gộp nữa) + lệch vị trí ngẫu nhiên để chùm số
  // không dính nhau. Trần 80 số thường cùng lúc (chí mạng luôn hiện).
  private dmgFloatActive = 0;
  private spawnDmgFloat(id: string, dmg: number, t: string, crit = false): void {
    if (t === 'p') return; // GĐ178: không hiện số khi người chơi bị đánh (đỡ rối mắt)
    if (dmg <= 0 || (this.dmgFloatActive > 80 && !crit)) return;
    const isPlayer = t === 'p';
    const actor = isPlayer ? this.actors.get(id) : this.monsterActors.get(id);
    if (!actor) return;
    const maxHp = isPlayer ? (this.worldPlayers.get(id)?.maxHp || 0) : (actor as MonsterActor).maxHp || 0;
    const heavy = !crit && maxHp > 0 && dmg >= maxHp * 0.2;
    const size = crit ? 27 : heavy ? 22 : 16;
    const txt = this.add.text(
      actor.container.x + (Math.random() * 34 - 17),
      actor.container.y - 80 + (Math.random() * 12 - 6),
      isPlayer ? `-${dmg}` : `${dmg}`, {
        fontFamily: 'Arial, Helvetica, sans-serif',
        fontSize: `${size}px`,
        fontStyle: 'bold',
        color: isPlayer ? '#ff7a5c' : crit ? '#ffd21f' : heavy ? '#ffb02e' : '#fff3b0',
        stroke: '#160f04',
        strokeThickness: crit ? 6 : 5,
      }).setOrigin(0.5, 1).setDepth(9999).setScale(0.45);
    (window as unknown as { tttFloatSeen?: number }).tttFloatSeen = ((window as unknown as { tttFloatSeen?: number }).tttFloatSeen || 0) + 1;
    this.dmgFloatActive++;
    // nảy phồng: 0.45 → quá đà 1.18 → về 1 (chí mạng nảy mạnh hơn)
    this.tweens.add({ targets: txt, scale: crit ? 1.3 : 1.15, duration: 95, ease: 'Quad.Out' });
    this.tweens.add({ targets: txt, scale: 1, duration: 110, delay: 95, ease: 'Quad.InOut' });
    this.tweens.add({
      targets: txt, y: txt.y - (crit ? 64 : 54), duration: 900, ease: 'Cubic.easeOut',
      onComplete: () => { txt.destroy(); this.dmgFloatActive--; },
    });
    this.tweens.add({ targets: txt, alpha: 0, duration: 300, delay: 620, ease: 'Quad.In' });
  }

  // GĐ170: vẽ bàn giao dịch từ trạng thái server (authoritative)
  private renderTrade(): void {
    const body = document.getElementById('tradeBody');
    const title = document.getElementById('tradeTitle');
    if (!body || !this.tradeState || !this.myChar) return;
    const st = this.tradeState;
    if (title) title.textContent = `🤝 Giao dịch với ${st.partnerName}`;
    const esc = (x: string) => x.replace(/[<>&"]/g, '');
    const itemName = (id: string) => ITEM_INFO[id]?.name || id;
    const offerRows = (o: TradeOffer, clickable: boolean) => {
      const rows: string[] = [];
      for (const [id, q] of Object.entries(o.items)) {
        rows.push(`<div class="tRow${clickable ? ' clickable' : ''}" ${clickable ? `data-toff="${id}" title="Bấm để bớt 1"` : ''}><span>${esc(itemName(id))}</span><span class="tQty">×${q}</span></div>`);
      }
      for (const m of o.mounts) {
        rows.push(`<div class="tRow"><span>🐴 ${esc(m.name)}</span><span class="tQty">tốc ×${m.speedMul}</span></div>`);
      }
      for (const g of o.gear || []) {
        rows.push(`<div class="tRow${clickable ? ' clickable' : ''}" ${clickable ? `data-tgoff="${g.uid}" title="Bấm để gỡ khỏi bàn"` : ''}><span>⚔️ <b style="color:${GEAR_RARITY_COLOR[g.rarity] || '#fff'}">${esc(g.name)}</b>${g.band ? ` <span style="color:#c9a86a">${g.band === 'na' ? '· Nguyên Anh' : '· Hóa Thần'}</span>` : ''}${g.unique && g.unique.length ? ` <span style="color:#ffd75e">✦ ${g.unique.map(esc).join(', ')}</span>` : ''}</span><span class="tQty">${GEAR_RARITY_NAME[g.rarity] || g.rarity}</span></div>`);
      }
      if (o.stones > 0) rows.push(`<div class="tRow"><span>💠 Linh thạch</span><span class="tQty">${o.stones}</span></div>`);
      return rows.length ? rows.join('') : '<div class="tEmpty">Chưa có gì trên bàn</div>';
    };
    const bagRows = Object.entries(this.myChar.inventory || {})
      .filter(([, q]) => q > 0)
      .sort((a, b) => itemName(a[0]).localeCompare(itemName(b[0])))
      .map(([id, q]) => {
        const off = this.tradeLocal.items[id] || 0;
        return `<div class="tRow clickable" data-tbag="${id}" title="Bấm để đưa thêm 1 lên bàn"><span>${esc(itemName(id))}</span><span class="tQty">có ${q}${off ? ` · đang đưa ${off}` : ''}</span></div>`;
      }).join('');
    const equippedUids = new Set(Object.values(this.myChar.gear || {}));
    const gearRows = Object.values(this.myChar.gearBag || {}).map((it) => {
      const eq = equippedUids.has(it.uid);
      const off = this.tradeLocal.gear.includes(it.uid);
      const uniq = (it.talents || []).filter((t) => t.kind === 'docnhat').map((t) => t.name);
      return `<div class="tRow ${eq ? '' : 'clickable'}" ${eq ? '' : `data-tgear="${it.uid}" title="Bấm để đưa/gỡ khỏi bàn"`}><span>⚔️ <b style="color:${GEAR_RARITY_COLOR[it.rarity] || '#fff'}">${esc(it.name)}</b>${uniq.length ? ` <span style="color:#ffd75e">✦ ${uniq.map(esc).join(', ')}</span>` : ''}</span><span class="tQty">${eq ? 'đang mặc — tháo ra mới giao dịch được' : (GEAR_RARITY_NAME[it.rarity] || it.rarity) + (off ? ' · ĐANG ĐƯA' : '')}</span></div>`;
    }).join('');
    const myMounts = (this.myChar as unknown as { mounts?: Array<{ uid: string; name: string; species: string; speedMul: number }> }).mounts || [];
    const mountRows = myMounts.map((m) => {
      const off = this.tradeLocal.mounts.includes(m.uid);
      return `<div class="tRow clickable" data-tmount="${m.uid}" title="Bấm để đưa/gỡ khỏi bàn"><span>🐴 ${esc(m.name)}</span><span class="tQty">tốc ×${m.speedMul}${off ? ' · ĐANG ĐƯA' : ''}</span></div>`;
    }).join('');
    body.innerHTML = `
      <div class="tCols">
        <div class="tBox"><h4>Bạn đưa ${st.myConf ? '· ✔ đã khóa' : ''}</h4>${offerRows(st.mine, true)}
          <div class="tRow"><span>💠 Linh thạch đưa thêm:</span><span><input id="tradeStonesInput" type="number" min="0" max="${this.myChar.stones || 0}" value="${st.mine.stones}" /> / ${this.myChar.stones || 0}</span></div>
        </div>
        <div class="tBox theirs"><h4>${esc(st.partnerName)} đưa ${st.theirConf ? '· ✔ đã khóa' : ''}</h4>${offerRows(st.theirs, false)}</div>
      </div>
      <div class="tSection">🎒 Túi đồ của bạn — bấm vào món để đưa lên bàn, bấm vào món trên bàn (cột trái) để bớt:</div>
      ${bagRows || '<div class="tEmpty">Túi đồ trống</div>'}
      ${mountRows ? `<div class="tSection">🐴 Thú cưỡi của bạn:</div>${mountRows}` : ''}
      ${gearRows ? `<div class="tSection">⚔️ Trang bị trong túi — bấm để đưa lên bàn (đồ đang mặc phải tháo ra trước):</div>${gearRows}` : ''}
      <div class="tFoot">
        <span class="tStatus">${st.theirConf ? `${esc(st.partnerName)} đã xác nhận ✔` : `${esc(st.partnerName)} chưa xác nhận`} · ${st.myConf ? 'Bạn đã khóa bàn — chờ đối tác' : 'Đổi món trên bàn sẽ hủy xác nhận của cả hai'}</span>
        <button class="pbtn ${st.myConf ? '' : 'gold'}" data-tact="confirm" type="button">${st.myConf ? 'Hủy xác nhận' : '✔ Xác nhận'}</button>
        <button class="pbtn" data-tact="cancel" type="button">Hủy giao dịch</button>
      </div>`;
  }

  // GĐ168: thêm dòng vào ô chat (tên nhuộm màu theo kênh; cắt còn 40 dòng)
  // ===== GĐ194/GĐ195: render xã hội =====
  private showSocialInvite(kind: 'friend' | 'party', fromName: string): void {
    this.socialInvite = { kind, fromName };
    const title = document.getElementById('socialInviteTitle');
    if (title) title.textContent = kind === 'friend' ? '👥 Lời mời kết bạn' : '⚔ Lời mời vào tổ đội';
    const body = document.getElementById('socialInviteBody');
    if (body) body.textContent = kind === 'friend' ? `${fromName} muốn kết bạn với bạn.` : `${fromName} mời bạn vào tổ đội. Lời mời hết hạn sau 30 giây.`;
    const panel = document.getElementById('socialInvite');
    if (panel) panel.style.display = 'block';
    sound.play('learn');
    if (this.socialInviteTimer) window.clearTimeout(this.socialInviteTimer);
    this.socialInviteTimer = window.setTimeout(() => this.hideSocialInvite(), 30000);
  }
  private hideSocialInvite(): void {
    this.socialInvite = null;
    const panel = document.getElementById('socialInvite');
    if (panel) panel.style.display = 'none';
  }
  private renderFriends(): void {
    const reqBox = document.getElementById('friendReqs');
    const listBox = document.getElementById('friendList');
    if (!reqBox || !listBox) return;
    const st = this.friendState;
    reqBox.innerHTML = st.reqs.length ? `<div class="tSection">📨 Lời mời đang chờ (${st.reqs.length})</div>` + st.reqs.map((n) => `<div class="socRow"><span class="grow"><b>${socEsc(n)}</b></span><button class="pbtn gold mini" data-fact="acc" data-name="${socEsc(n)}">Chấp nhận</button><button class="pbtn mini" data-fact="dec" data-name="${socEsc(n)}">Từ chối</button></div>`).join('') : '';
    listBox.innerHTML = (st.friends.length ? `<div class="tSection">Bạn bè (${st.friends.length})</div>` : '<div class="tEmpty">Chưa có bạn nào — nhập tên ở trên hoặc đứng gần một người chơi rồi bấm nút 👤.</div>') + st.friends.map((f) => `<div class="socRow"><span class="${f.online ? 'onDot' : 'offDot'}">●</span><span class="grow"><b>${socEsc(f.name)}</b> <span style="color:#9db8a6">${SOC_CLASS[f.classId] || ''} · ${SOC_REALM[f.realm] || ''} tầng ${f.tier}${f.online ? '' : ' · offline'}</span></span><button class="pbtn mini" data-fact="view" data-name="${socEsc(f.name)}">Xem</button><button class="pbtn mini" data-fact="del" data-name="${socEsc(f.name)}">Xóa</button></div>`).join('');
    for (const el of [...reqBox.querySelectorAll('[data-fact]'), ...listBox.querySelectorAll('[data-fact]')]) {
      (el as HTMLElement).onclick = () => {
        const act = el.getAttribute('data-fact');
        const nm = el.getAttribute('data-name') || '';
        if (act === 'acc') this.socket.emit('friend_respond', { name: nm, accept: true });
        else if (act === 'dec') this.socket.emit('friend_respond', { name: nm, accept: false });
        else if (act === 'del') this.socket.emit('friend_remove', { name: nm });
        else if (act === 'view') this.socket.emit('view_char', { name: nm });
      };
    }
  }
  private renderParty(): void {
    const box = document.getElementById('partyBody');
    if (!box) return;
    const p = this.myParty;
    if (!p) {
      box.innerHTML = '<div class="tEmpty">Bạn chưa có tổ đội. Đứng gần một người chơi, bấm nút 👤 rồi chọn "Mời tổ đội" (tối đa 5 người). Chat kênh ⚔ Đội chỉ tổ đội nghe được.</div>';
      return;
    }
    const rows = p.members.map((m) => {
      const hpPct = m.maxHp > 0 ? Math.max(0, Math.min(100, Math.round((m.hp / m.maxHp) * 100))) : 0;
      const lead = m.id === p.leaderId;
      const kick = !lead && p.leaderId === this.myId ? `<button class="pbtn mini" data-kick="${m.id}">Mời ra</button>` : '';
      return `<div class="socRow"><span class="grow">${lead ? '👑 ' : ''}<b>${socEsc(m.name)}</b> <span style="color:#9db8a6">${SOC_CLASS[m.classId] || ''} · ${SOC_REALM[m.realm] || ''} tầng ${m.tier}</span><div class="hpMini"><i style="width:${hpPct}%"></i></div></span><span style="color:#9db8a6;font-size:11px">${m.hp}/${m.maxHp}</span>${kick}</div>`;
    }).join('');
    box.innerHTML = `<div class="tSection">Tổ đội (${p.members.length}/${5})</div>` + rows + `<div class="tradeBtns"><button class="pbtn" id="partyLeaveBtn" type="button">🚪 Rời tổ đội</button></div>`;
    const lv = document.getElementById('partyLeaveBtn');
    if (lv) lv.onclick = () => this.socket.emit('party_leave');
    for (const el of box.querySelectorAll('[data-kick]')) {
      (el as HTMLElement).onclick = () => this.socket.emit('party_kick', { memberId: el.getAttribute('data-kick') });
    }
  }
  private renderBoard(d: { board: string; top: BoardRow[]; me: (BoardRow & { rank: number }) | null }): void {
    const box = document.getElementById('boardBody');
    if (!box || d.board !== this.boardCur) return;
    const scoreText = (r: BoardRow): string => {
      if (d.board === 'tuvi') return `${SOC_REALM[r.realm] || ''} tầng ${r.tier}`;
      if (d.board === 'gear') return `${r.score.toLocaleString('vi-VN')} điểm`;
      if (d.board === 'mount') return `${r.mountCount || 0} thú · tốc ×${(r.bestMul || 1).toFixed(2)}`;
      return `Giai đoạn ${r.stage || 0} · ${(r.progress || 0).toLocaleString('vi-VN')} tu dưỡng`;
    };
    const medal = (i: number): string => (i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`);
    box.innerHTML = (d.top.length ? '' : '<div class="tEmpty">Chưa có ai trên bảng này.</div>') + d.top.map((r, i) => `<div class="socRow${d.me && d.me.name === r.name ? ' rankMe' : ''}"><span style="width:30px">${medal(i)}</span><span class="grow"><b>${socEsc(r.name)}</b> <span style="color:#9db8a6">${SOC_CLASS[r.classId] || ''}</span></span><span>${scoreText(r)}</span></div>`).join('') + (d.me ? `<div class="socRow rankMe"><span class="grow">Hạng của bạn: <b>#${d.me.rank}</b></span><span>${scoreText(d.me)}</span></div>` : '<div class="tEmpty" style="margin-top:6px">Bạn chưa có mặt trên bảng này.</div>');
  }
  private renderPlayerCard(card: PlayerCard): void {
    const title = document.getElementById('cardTitle');
    if (title) title.textContent = `👤 ${card.name}`;
    const box = document.getElementById('cardBody');
    if (!box) return;
    const gearRows = card.gear.length ? card.gear.map((g) => `<div class="socRow"><span class="grow" style="color:${GEAR_RARITY_COLOR[g.rarity] || '#fff'}">${socEsc(g.name)}${g.band ? ` <span style="color:#ffd94d">· ${g.band === 'na' ? 'Nguyên Anh' : 'Hóa Thần'}</span>` : ''}${g.unique && g.unique.length ? `<div style="color:#8be9c9;font-size:11px">✦ ${g.unique.map(socEsc).join(', ')}</div>` : ''}</span><span style="color:#9db8a6;font-size:11px">${GEAR_RARITY_NAME[g.rarity] || g.rarity}</span></div>`).join('') : '<div class="tEmpty">Chưa mặc trang bị nào.</div>';
    box.innerHTML = `
      <div class="socRow"><span class="grow"><span class="${card.online ? 'onDot' : 'offDot'}">●</span> <b>${socEsc(card.name)}</b> — ${SOC_CLASS[card.classId] || ''}</span><span>${card.online ? 'Đang online' : 'Offline'}</span></div>
      <div class="socRow"><span class="grow">Cảnh giới</span><span>${SOC_REALM[card.realm] || ''} tầng ${card.tier}</span></div>
      <div class="socRow"><span class="grow">⚔ Lực chiến</span><span><b>${card.power.toLocaleString('vi-VN')}</b> · đồ ${card.gearScore.toLocaleString('vi-VN')} điểm</span></div>
      ${card.sect ? `<div class="socRow"><span class="grow">Tông môn</span><span>${socEsc(card.sect)}</span></div>` : ''}
      ${card.branch ? `<div class="socRow"><span class="grow">Nhánh tu</span><span>${card.branch === 'tien' ? '✨ Tiên' : '🔥 Ma'}</span></div>` : ''}
      ${card.phapTuong ? `<div class="socRow"><span class="grow">🔥 Pháp thân</span><span>Giai đoạn ${card.phapTuong.stage}${card.phapTuong.element ? ` · hệ ${socEsc(card.phapTuong.element)}` : ''}</span></div>` : ''}
      <div class="socRow"><span class="grow">🏆 Thành tựu đã mở</span><span>${card.achCount} · 👥 ${card.friendCount} bạn</span></div>
      <div class="tSection">🎽 Trang bị đang mặc</div>${gearRows}
      <div class="tSection">🐴 Thú cưỡi (${card.mounts.length})</div>
      <div style="font-size:12.5px;color:#d7e8dd">${card.mounts.length ? card.mounts.map(socEsc).join(' · ') : '<span class="tEmpty">Chưa có thú cưỡi.</span>'}</div>
      ${!card.isSelf && !card.isFriend ? `<div class="tradeBtns"><button class="pbtn gold" id="cardFriendBtn" type="button">👥 Kết bạn</button></div>` : ''}`;
    this.closePanels();
    const panel = document.getElementById('playerCardPanel');
    if (panel) panel.style.display = 'block';
    const fb = document.getElementById('cardFriendBtn');
    if (fb) fb.onclick = () => { this.socket.emit('friend_request', { name: card.name }); };
  }

  private appendChatLine(m: { name: string; text: string; ch: string }): void {
    const box = document.getElementById('chatMsgs');
    if (!box) return;
    const line = document.createElement('div');
    line.className = 'cLine' + (m.ch === 'world' ? ' world' : m.ch === 'party' ? ' party' : '');
    const nm = document.createElement('span');
    nm.className = 'cName';
    nm.textContent = (m.ch === 'world' ? '🌐 ' : m.ch === 'party' ? '⚔ ' : '') + m.name + ': ';
    line.appendChild(nm);
    line.appendChild(document.createTextNode(m.text));
    box.appendChild(line);
    while (box.children.length > 40) box.removeChild(box.firstChild as Node);
  }

  // GĐ168: bong bóng chat trên đầu nhân vật (~4,2s)
  private showChatBubble(id: string, text: string): void {
    const a = this.actors.get(id);
    if (!a) return;
    a.bubble.setText(text);
    a.bubble.setVisible(true);
    a.bubbleUntil = this.time.now + 4200;
  }

  // GĐ167: nhãn 2 nút âm thanh theo trạng thái hiện tại
  private refreshSoundBtns(): void {
    const m = document.getElementById('menuMusicBtn');
    if (m) m.textContent = sound.musicOn ? '🎵 Nhạc nền: Đang bật' : '🔇 Nhạc nền: Đang tắt';
    const x = document.getElementById('menuSfxBtn');
    if (x) x.textContent = sound.sfxOn ? '🔔 Hiệu ứng: Đang bật' : '🔕 Hiệu ứng: Đang tắt';
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
      total.textContent = `Tổng chỉ số: ${sum} · HP tối đa ${100 + stats.khiHuyet * 10} · Chân nguyên tối đa ${stats.minhMan * 10}`;
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
      // GĐ180: đủ thang NA → Vô Danh → Phản Hư → Hóa Thân + NA tầng 10
      // viên mãn. (Trước đây thiếu nhánh 'na' — Nguyên Anh bị hiện nhầm
      // thành Luyện Khí trên thẻ, nay sửa luôn.)
      realm.textContent = !c.linhCan
        ? 'Phàm nhân'
        : c.realm === 'na'
          ? c.tier >= 10
            ? 'Nguyên Anh · Viên mãn'
            : `Nguyên Anh tầng ${c.tier}`
          : c.realm === 'ph'
              ? `Phản Hư tầng ${c.tier}`
              : c.realm === 'ht'
                ? `Hóa Thần tầng ${c.tier}`
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
        ? `Linh căn: ${c.linhCan.elements.join(' · ')} (chính: ${c.linhCan.main})${c.bienDi ? ` · ✦ Biến dị: ${c.bienDi}` : ''}${c.meditation ? ' · 🧘 Đã học Tọa Thiền' : ' · Chưa học Tọa Thiền (kiếm Sách Tọa Thiền — rơi từ sói)'}${c.learning ? ` · 📖 Lĩnh ngộ ${c.learning.name}: ${c.learning.pct}%${c.learning.active ? ' (đang ngồi học)' : ' (thoát game sẽ học tiếp ở nơi an toàn)'}` : ''}`
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
        } else if (bi && bi.type === 'kimdan') {
          brk.textContent = bi.trialReady ? '✦ ĐỘT PHÁ KIM ĐAN ✦' : '⚔ Thử thách: Lôi Kiếp Ảnh';
          brk.onclick = () => this.socket.emit(bi.trialReady ? 'breakthrough' : 'start_trial');
        } else if (bi && bi.type === 'nguyenanh') {
          brk.textContent = bi.trialReady ? '✦ ĐỘT PHÁ NGUYÊN ANH ✦' : '⚔ Thử thách: Thiên Kiếp Ảnh';
          brk.onclick = () => this.socket.emit(bi.trialReady ? 'breakthrough' : 'start_trial');
        } else if (bi && bi.type === 'hoathan') { // GĐ181: viên mãn Tàn Đăng → thẳng Hóa Thần
          brk.textContent = bi.trialReady ? '✦ ĐỘT PHÁ HÓA THẦN ✦' : '⚔ Thử thách: Hóa Thần Kiếp Ảnh';
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
    // GĐ143: dòng phe Tiên/Ma + nút chọn phe (hiện khi đủ điều kiện mà chưa chọn)
    const brEl = document.getElementById('hudBranch');
    const br = (c as any).branch;
    const canBranch = !br && (((c as any).anState?.luyenHon) || (['kd', 'na', 'ht'].includes(c.realm)));
    if (brEl) {
      brEl.style.display = br ? 'block' : 'none';
      if (br) {
        const tokUid = (c as any).gear?.TOKEN;
        const tok = tokUid ? (c as any).gearBag?.[tokUid] : null;
        brEl.textContent = `☯ Phe ${br.side === 'tien' ? 'Tiên' : 'Ma'} (${br.source === 'hidden' ? 'đường nhánh ẩn' : 'đường Kim Đan'})${tok?.faction ? ' · đã đeo Lệnh Bài' : ''}`;
      }
    }
    const brTien = document.getElementById('btnBranchTien') as HTMLButtonElement | null;
    const brMa = document.getElementById('btnBranchMa') as HTMLButtonElement | null;
    for (const [btn, side] of [[brTien, 'tien'], [brMa, 'ma']] as const) {
      if (btn) {
        btn.style.display = canBranch ? 'inline-block' : 'none';
        if (!btn.dataset.bound) { btn.dataset.bound = '1'; btn.onclick = () => this.socket.emit('branch_choose', { side }); }
      }
    }
    // GĐ146: dòng thang Tiên/Ma + nút đột phá thang (hiện khi đã chọn phe)
    const brBreak = document.getElementById('btnBranchBreak') as HTMLButtonElement | null;
    if (brBreak) {
      brBreak.style.display = br ? 'inline-block' : 'none';
      if (!brBreak.dataset.bound) { brBreak.dataset.bound = '1'; brBreak.onclick = () => this.socket.emit('branch_breakthrough'); }
    }
    // GĐ147: nút tẩy luyện đổi phe (hiện khi đã chọn phe; cần tới gần Sứ Giả + 1000 Linh thạch)
    const brCleanse = document.getElementById('btnBranchCleanse') as HTMLButtonElement | null;
    if (brCleanse) {
      brCleanse.style.display = br ? 'inline-block' : 'none';
      if (!brCleanse.dataset.bound) { brCleanse.dataset.bound = '1'; brCleanse.onclick = () => this.socket.emit('branch_cleanse'); }
    }
    // GĐ180: đường Tàn Đăng — nút chọn (chỉ NA9 đã đọc tàn thư) + dòng trạng thái
    const td = (c as unknown as { tanDang?: { known: boolean; active: boolean; stage: string | null } }).tanDang;
    const tdBtn = document.getElementById('btnTanDang') as HTMLButtonElement | null;
    const tdEl = document.getElementById('hudTanDang');
    if (tdBtn) {
      const canChoose = !!td && td.known && !td.active && c.realm === 'na' && (c.tier || 0) === 9;
      tdBtn.style.display = canChoose ? 'inline-block' : 'none';
      if (!tdBtn.dataset.bound) { tdBtn.dataset.bound = '1'; tdBtn.onclick = () => this.socket.emit('choose_tandang'); }
    }
    if (tdEl) {
      if (td && td.active) {
        tdEl.style.display = 'block';
        tdEl.textContent = td.stage === 'reborn'
          ? '🕯 Đã thoát thai hoán cốt — đầy Tu vi để đột phá thẳng Hóa Thần'
          : td.stage === 'vienman'
            ? '🕯 Nguyên Anh VIÊN MÃN — tu đến cuối thọ nguyên để hoán cốt'
            : '🕯 Đường Tàn Đăng — ở lại tu đến cuối thọ nguyên (không thăng cảnh)';
      } else tdEl.style.display = 'none';
    }
    // GĐ184: Pháp Tướng trên thẻ — dòng trạng thái + 3 nút (hiện hình / Ảo Cảnh / tế luyện)
    {
      const pt = (c as unknown as { phapTuong?: { stage: number; stageName: string; mul: number; element: string; progress: number; nextNeed: number | null; active: boolean; inTrial: boolean } | null }).phapTuong;
      const ptEl = document.getElementById('hudPhapTuong');
      const ptBtn = document.getElementById('btnPhapTuong') as HTMLButtonElement | null;
      const ptTrial = document.getElementById('btnPtTrial') as HTMLButtonElement | null;
      const ptOffer = document.getElementById('btnPtOffer') as HTMLButtonElement | null;
      if (ptEl) {
        if (pt) {
          ptEl.style.display = 'block';
          ptEl.textContent = `🔮 Pháp Tướng · ${pt.stageName} · hệ ${pt.element} · Tu dưỡng ${pt.progress}${pt.nextNeed != null ? `/${pt.nextNeed}` : ' (tối đa)'}${pt.active ? ' · ĐANG HIỆN HÌNH' : ''}`;
        } else ptEl.style.display = 'none';
      }
      if (ptBtn) {
        ptBtn.style.display = pt ? 'inline-block' : 'none';
        ptBtn.textContent = pt && pt.active ? '✦ Tắt Pháp Tướng' : '✦ Hiện hình Pháp Tướng';
        if (!ptBtn.dataset.bound) { ptBtn.dataset.bound = '1'; ptBtn.onclick = () => this.socket.emit('phaptuong_toggle', {}); }
      }
      if (ptTrial) {
        const canTrial = !!pt && pt.active && !pt.inTrial && pt.nextNeed != null && pt.progress >= pt.nextNeed;
        ptTrial.style.display = canTrial ? 'inline-block' : 'none';
        if (!ptTrial.dataset.bound) { ptTrial.dataset.bound = '1'; ptTrial.onclick = () => this.socket.emit('phaptuong_trial'); }
      }
      if (ptOffer) {
        ptOffer.style.display = pt ? 'inline-block' : 'none';
        if (!ptOffer.dataset.bound) { ptOffer.dataset.bound = '1'; ptOffer.onclick = () => this.socket.emit('phaptuong_offer', { amount: 10 }); }
      }
      // GĐ202: nút Xuất khiếu — hiện từ Nguyên Anh trở lên
      const xkBtn = document.getElementById('btnXuatKhieu') as HTMLButtonElement | null;
      if (xkBtn) {
        const xkOn = !!(c as unknown as { xuatKhieu?: unknown }).xuatKhieu;
        const xkRealm = ['na', 'ht', 'ph'].includes((c as unknown as { realm: string }).realm);
        xkBtn.style.display = xkRealm ? 'inline-block' : 'none';
        xkBtn.textContent = xkOn ? '🌕 Nhập thể' : '👻 Xuất khiếu';
        if (!xkBtn.dataset.bound) { xkBtn.dataset.bound = '1'; xkBtn.onclick = () => this.socket.emit('xuat_khieu'); }
      }
    }
    if (brEl && br) {
      const step = (c as any).branchStep || 0;
      const qi = (c as any).branchQi || 0;
      const tpr = br.side === 'ma' ? 3 : 9;
      const max = 5 * tpr;
      const names = br.side === 'ma' ? ['Huyết Luyện', 'Nhập Ma', 'Ma Tướng', 'Ma Quân', 'Ma Tôn'] : ['Tiên Cơ', 'Địa Tiên', 'Thiên Tiên', 'Kim Tiên', 'Đại La'];
      const lad = step <= 0 ? 'Chưa lên thang' : `${names[Math.floor((step - 1) / tpr)]} tầng ${((step - 1) % tpr) + 1}`;
      brEl.textContent += ` · Thang: ${lad} (${step}/${max}) · Khí: ${qi}`;
    }
    // GĐ141: dòng cảnh giới ẩn trên thẻ nhân vật (tiến độ năm tu thêm / đã mở)
    const anEl = document.getElementById('hudAnRealm');
    const an = (c as any).anState;
    const anPath = ({ phattu: 'Thánh tăng', nhotu: 'Văn Thánh', ytu: 'Thần y', kiemtu: 'Kiếm Thánh', thetu: 'Võ Vương', phaptu: 'Đại Thiên Sư', cottu: 'Khô Lâu Vương', quytu: 'Minh Thần Đế', satthu: 'Dạ Ảnh Thần Minh' } as Record<string, string>)[c.classId] || ''; // GĐ157: Bảo chốt đủ 9 danh hiệu đường ẩn (29/10) — Nho là Văn Thánh (người truyền bá học thức); Kiếm tâm→Kiếm Thánh, Võ tông sư→Võ Vương so với bản tài liệu 5 đường của GĐ142
    if (anEl) {
      let anText = '';
      if (an) {
        const yrsLK = Math.floor((an.lkDays || 0) / 30);
        const yrsKD = Math.floor((an.kdDays || 0) / 30);
        if (c.realm === 'lk' && c.tier >= 9) {
          const got = [an.vienman ? `Luyện Khí viên mãn${anPath ? ` · ${anPath}` : ''}` : '', an.luyenHon ? 'Luyện Hồn · 🍀 May mắn +15% · 💥 Bạo kích 10%' : ''].filter(Boolean);
          const next = an.vienman ? (an.luyenHon ? null : { y: 15, n: 'Luyện Hồn' }) : { y: 10, n: 'Luyện Khí viên mãn' };
          anText = [...got.map((g: string) => `✦ ${g}`), ...(next ? [`🌑 Năm tu thêm: ${yrsLK}/${next.y} năm → ${next.n}`] : [])].join(' · ');
        } else if (c.realm === 'kd' && c.tier >= 9) {
          anText = an.nhapDao ? '✦ Nhập Đạo · ⚡ Toàn bộ chỉ số ×1,2' : `🌑 Năm tu thêm: ${yrsKD}/20 năm → Nhập Đạo`;
        } else if (an.vienman || an.luyenHon || an.nhapDao) {
          const got = [an.vienman ? `Luyện Khí viên mãn${anPath ? ` · ${anPath}` : ''}` : '', an.luyenHon ? 'Luyện Hồn · 🍀 May mắn +15% · 💥 Bạo kích 10%' : '', an.nhapDao ? 'Nhập Đạo · ⚡ Toàn bộ chỉ số ×1,2' : ''].filter(Boolean);
          anText = `✦ Cảnh giới ẩn: ${got.join(' · ')}`;
        }
      }
      anEl.style.display = anText ? 'block' : 'none';
      if (anText) anEl.textContent = anText;
    }
    // GĐ144: chỉ số ẩn trên thẻ nhân vật — luôn hiện diện, khóa tới khi mở thành tựu Đạo Quán
    const hidEl = document.getElementById('hudHiddenStats');
    if (hidEl) {
      const hs = (c as any).hiddenStats || {};
      const dq = (c as any).daoQuan || { min: 0, tier: 0 };
      const hrs = Math.floor((dq.min || 0) / 60);
      const HID_META = [
        { k: 'ngoTinh', n: 'Ngộ Tính', tier: 1, cost: 1 },
        { k: 'phucDuyen', n: 'Phúc Duyên', tier: 1, cost: 1 },
        { k: 'baoKich', n: 'Bạo Kích', tier: 1, cost: 10 },
        { k: 'baoThuong', n: 'Bạo Thương', tier: 1, cost: 10 },
        { k: 'banNguyen', n: 'Bản Nguyên', tier: 2, cost: 0 },
        { k: 'yChi', n: 'Ý Chí', tier: 2, cost: 0 },
      ];
      const parts: string[] = [`🏯 Đạo Quán: ${hrs} giờ${dq.tier === 0 ? ' (300 giờ → mở cấp 1)' : dq.tier === 1 ? ' (1000 giờ → mở cấp 2)' : ' (đã mở cấp 2)'}`];
      for (const mt of HID_META) {
        if ((dq.tier || 0) >= mt.tier) {
          const v = hs[mt.k] || 0;
          parts.push(mt.cost > 0 ? `${mt.n} ${v} <button data-hid="${mt.k}" data-cost="${mt.cost}">+1 (${mt.cost}đ)</button>` : `${mt.n} ${v} (chỉ tăng qua khảo hạch)`);
        }
      }
      if ((dq.tier || 0) === 0) parts.push('🔒 Chỉ số ẩn chưa mở');
      else if ((dq.tier || 0) === 1) parts.push('🔒 2 chỉ số mạnh nhất chưa mở (1000 giờ)');
      // GĐ148: sổ xem lại gợi ý Đạo Quán đã tìm — GĐ150: thẻ chỉ giữ dòng đếm + nút, toàn văn dời sang panel riêng cho gọn (luật tối giản GĐ42b)
      const dh = ((c as any).daoHints || []) as string[];
      if (dh.length > 0) {
        parts.push(`💡 Gợi ý Đạo Quán đã tìm: ${dh.length}/3 <button data-hints-open>Xem lại</button>`);
      }
      hidEl.style.display = 'block';
      hidEl.innerHTML = parts.join(' · ');
      if (!hidEl.dataset.bound) {
        hidEl.dataset.bound = '1';
        hidEl.addEventListener('click', (ev) => {
          const tg = (ev.target as HTMLElement).closest?.('[data-hints-open]') as HTMLElement | null;
          if (tg) { this.toggleHintPanel(); return; }
          const t = (ev.target as HTMLElement).closest?.('[data-hid]') as HTMLElement | null;
          if (!t) return;
          const k = t.dataset.hid as string;
          const cost = Number(t.dataset.cost || 1);
          if ((this.myChar?.freePoints || 0) < cost) return;
          this.socket.emit('allocate_stats', { hidden: { [k]: 1 } });
        });
      }
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
        const where = info.cityName ? ` ✓ Trả tại ${info.cityName}`
          : info.npcId ? ` ✓ Trả tại ${NPC_NAME_CLIENT[info.npcId] || 'người giao'}` : ' ✓ Trả tại Bảng/Trưởng Làng';
        const st = q.state === 'done' ? where : '';
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
  // GĐ88: Kim Đan 6 ô (ô 6 = phím 0); NA/HT giữ 5 tới khi làm Nguyên Anh.
  private slotCountForChar(c: { realm: string; tier: number }): number {
    if (c.realm === 'lk') return c.tier >= 7 ? 4 : 3;
    if (c.realm === 'tc') return c.tier >= 7 ? 5 : 4;
    if (c.realm === 'kd') return 6;
    if (c.realm === 'na') return 7; // GĐ160: Nguyên Anh 7 ô (mirror server)
    if (c.realm === 'ph') return 7; // GĐ183: Phản Hư 7 ô (mirror server)
    if (c.realm === 'ht') return 8; // GĐ182: Hóa Thần 8 ô (mirror server)
    return 3;
  }

  // ---------------- Thanh công pháp (GĐ7) ----------------
  private renderSkillBar(): void {
    const bar = document.getElementById('skillBar');
    if (!bar || !this.myChar) return;
    // GĐ184: đang hiện hình Pháp Tướng → khay chiêu chính là BỘ CHIÊU CỦA PHÁP TƯỚNG
    const ptMode = !!((this.myChar as unknown as { phapTuong?: { active: boolean; skills: unknown[] } }).phapTuong?.active && (this.myChar as unknown as { phapTuong?: { skills: unknown[] } }).phapTuong?.skills?.length);
    const ptSkills = ptMode ? (this.myChar as unknown as { phapTuong: { skills: Array<{ id: string; name: string; coef: number; cdMs: number; cost: number; fxText?: string }> } }).phapTuong.skills : null;
    const skills = (ptSkills ?? this.myChar.skills) as typeof this.myChar.skills;
    const utils = this.myChar.utilSkills || [];
    // GĐ44: thanh chiêu LUÔN hiện đủ khung (nút ⚔ + 5 ô chính + 4 ô phụ) —
    // ô chưa có chiêu thì mờ/trống nhưng vẫn thấy số phím, bấm chuột được.
    // GĐ88: Kim Đan có ô thứ 6 (phím 0) — khay desktop hiện 6 khung cho KD,
    // các cảnh giới khác giữ 5 khung như GĐ44.
    bar.style.display = 'flex';
    const mainCount = Math.max(5, this.slotCountForChar(this.myChar));
    const keyLabel = (i: number) => (i === 5 ? '0' : String(i + 1));
    const mainSlots = Array.from({ length: mainCount }, (_, i) => {
      const s = skills[i];
      return s
        ? `<div class="slot" data-cast="${i}" title="${s.name} — bấm hoặc phím ${keyLabel(i)}"><span class="key">${keyLabel(i)}</span><img class="skicon-desk" src="${skillIconURL(s)}" alt=""><div class="cdov" id="cdov${i}"></div><span class="cdnum" id="cdnum${i}"></span></div>`
        : `<div class="slot empty" title="Ô chiêu ${i + 1} — chưa lắp công pháp (phím ${keyLabel(i)})"><span class="key">${keyLabel(i)}</span></div>`;
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
    // GĐ88: fan cảm ứng tới 6 nút (Kim Đan) — ô 6 hiện phím 0.
    for (let i = 0; i < 6; i++) {
      const tb = document.getElementById('tSkill' + i);
      if (!tb) continue;
      if (i >= slotCount) { tb.style.display = 'none'; continue; }
      tb.style.display = 'flex';
      if (skills[i]) {
        tb.innerHTML = `<img class="skicon-touch" src="${skillIconURL(skills[i])}" alt="">`;
        tb.title = skills[i].name;
        tb.classList.remove('empty');
      } else {
        tb.textContent = i === 5 ? '0' : String(i + 1);
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
      const maxMp = (this.myChar.stats?.minhMan ?? 0) * 10;
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
    if (this.chatOpen) return; // GĐ168: đang gõ chat
    if (!this.socket?.connected || !this.myChar) return;
    if (this.amDowned) return; // GĐ128: linh thể không tung chiêu được
    // GĐ184: đang hiện hình → ô chính tung chiêu Pháp Tướng
    const ptCast = (this.myChar as unknown as { phapTuong?: { active: boolean; skills: { id: string }[] } }).phapTuong;
    if (area === 'main' && ptCast?.active && ptCast.skills?.length) {
      const sk = ptCast.skills[slot];
      if (!sk) return;
      this.lastCombatLocal = Date.now();
      this.socket.emit('cast_phaptuong', { skillId: sk.id });
      return;
    }
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
    if (this.chatOpen) return; // GĐ168: đang gõ chat
    if (!this.socket?.connected) return;
    if (this.amDowned) return; // GĐ128: linh thể không vung vũ khí nữa (trước: animation vẫn vung dù server chặn đòn, J giữ thì lặp mãi ở chỗ boss)
    this.lastCombatLocal = Date.now(); // GĐ76: ra đòn = giao tranh (ẩn nút thiền)
    this.socket.emit('player_attack');
    const meA = this.actors.get(this.myId);
    if (meA) meA.castUntil = this.time.now + 230;
  }

  // GĐ76: ngồi thiền / đứng dậy (nút 🧘 + phím M). Server kiểm tra điều
  // kiện thật (5s ngoài giao tranh, không bế quan/lĩnh ngộ); client chỉ
  // quyết định HIỆN nút (ước lượng từ lần đánh/bị đánh gần nhất).
  private toggleMeditate(): void {
    if (this.chatOpen) return; // GĐ168: đang gõ chat
    if (!this.socket?.connected) return;
    this.socket.emit('meditate_toggle', {});
  }

  // GĐ88: bật/tắt ngự kiếm bay (Kim Đan) — server kiểm tra cảnh giới + báo notice.
  private toggleFly(): void {
    if (this.chatOpen) return; // GĐ168: đang gõ chat
    if (!this.socket?.connected) return;
    this.socket.emit('fly_toggle', {});
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
    if (this.chatOpen) return; // GĐ168: đang gõ chat
    if (!this.socket?.connected || !this.myChar) return;
    if (this.amDowned) return; // GĐ128: linh thể không né được
    if (Date.now() < this.dodgeCdEnd) return;
    this.dodgeCdEnd = Date.now() + 2500;
    sound.play('dodge'); // GĐ167
    this.socket.emit('dodge', { vx: this.lastSent.vx, vy: this.lastSent.vy });
  }

  private doInteract(): void {
    if (this.chatOpen) return; // GĐ168: đang gõ chat
    if (!this.socket?.connected || !this.myChar) return;
    if (this.amDowned) return; // GĐ128: linh thể chỉ đi lại, không tương tác được
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
    } else if (near.type === 'thuongnhan') {
      // GĐ86: Thương Nhân Lưu Động — mở hộp thoại (trong đó có nút Vào tiệm + dòng khách quen)
      this.socket.emit('talk_npc', { npcId: 'npc_thuongnhan' });
    } else if (near.type === 'shop' && near.shopId) {
      this.openShop(near.shopId);
    } else if (near.type === 'forge') {
      this.openForge(); // GĐ119 bước 5: Tiệm Rèn
    } else if (near.type === 'travel') {
      this.socket.emit('travel_list'); // GĐ59: mở danh sách đích dịch chuyển
    } else if (near.type === 'altar') {
      this.socket.emit('altar_info'); // GĐ85: mở hộp thoại đàn tế
    } else if (near.type === 'study') {
      this.socket.emit('nho_study'); // GĐ105: đọc sách ở Văn Uyển
    } else if (near.type === 'node' && near.nodeId) {
      this.socket.emit('gather_node', { nodeId: near.nodeId }); // GĐ132: thu thập điểm tài nguyên
    } else if (near.type === 'citynpc' && near.npcId) {
      this.socket.emit('talk_npc', { npcId: near.npcId }); // GĐ89: dân thành phố
    }
  }

  private toggleGameMenu(): void {
    if (this.chatOpen) return; // GĐ168: đang gõ chat
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
    bind('tSkill5', () => this.castSlot(5)); // GĐ88: ô chính 6 (Kim Đan)
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
    // GĐ125: bước ra khỏi khu an toàn vào bãi quái — hiệu ứng bước qua (chỉ khi
    // đi bộ qua biên; dịch chuyển/dịch cổng vào bí cảnh không tính)
    const inSafe = inVillage || inSect || inTulinh;
    if (this.prevZoneSafe === undefined) this.prevZoneSafe = inSafe;
    else {
      if (this.prevZoneSafe && !inSafe && !inRealm) this.playZoneStepOut();
      this.prevZoneSafe = inSafe;
    }
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
  private nearestInteract(): { type: string; x: number; y: number; shopId?: string; npcId?: string; name?: string; role?: string; nodeId?: string; kind?: string } | null {
    if (!this.myContainer) return null;
    // GĐ59: ở map khác thì chỉ còn Trận Dịch Chuyển; ở làng có thêm các điểm cũ
    const isHome = !this.mapState || this.mapState.isHome;
    const cands: Array<{ type: string; x: number; y: number; shopId?: string; npcId?: string; name?: string; role?: string; nodeId?: string; kind?: string }> = isHome ? [...INTERACTS] : [];
    const portal = this.mapState?.portal || { x: hs175(1080), y: hs175(600) }; // GĐ175
    cands.push({ type: 'travel', x: portal.x, y: portal.y });
    // GĐ85: đàn tế trên map có trùm (server gửi vị trí theo map_enter)
    if (!isHome && this.mapState?.altar) cands.push({ type: 'altar', x: this.mapState.altar.x, y: this.mapState.altar.y });
    // GĐ105: điểm đọc sách Văn Uyển (server gửi theo map_enter)
    if (!isHome && this.mapState?.study) cands.push({ type: 'study', x: this.mapState.study.x, y: this.mapState.study.y });
    // GĐ89: dân thành phố — điểm E theo từng NPC (server gửi theo map_enter)
    if (!isHome && this.mapState?.npcs) {
      // GĐ156: NPC đang đi nghe Thuyết Pháp thì điểm tương tác theo vị trí sống
      for (const n of this.mapState.npcs) {
        const live = this.cityNpcById.get(n.id);
        cands.push({ type: 'citynpc', npcId: n.id, name: n.name, role: n.role, x: live ? live.x : n.x, y: live ? live.y : n.y });
      }
    }
    // GĐ132: điểm tài nguyên — điểm E theo từng mạch/bụi (server gửi theo map_enter, cả làng lẫn map hoang)
    if (this.mapState?.nodes) {
      for (const n of this.mapState.nodes) cands.push({ type: 'node', nodeId: n.id, kind: n.kind, name: ITEM_INFO[n.itemId]?.name || n.itemId, x: n.x, y: n.y });
    }
    let best: { type: string; x: number; y: number; shopId?: string; npcId?: string; name?: string; role?: string } | null = null;
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
            stroke: '#0a0a18', strokeThickness: 3,
          })
          .setOrigin(0.5, 1);
        plabel.setName('nlabel'); // GĐ174: nhãn theo tầm gần
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
          stroke: '#0a1410', strokeThickness: 3,
        })
        .setOrigin(0.5, 1);
      label.setName('nlabel'); // GĐ174: nhãn theo tầm gần
      const c = this.add.container(n.x, n.y, [sprite, label]);
      (c as any).npcData = { id: n.id, name: n.name, role: n.role, kind: 'village' };
      c.setDepth(n.y);
      this.npcActors.set(n.id, c);
    }
  }

  // GĐ150: hội thoại liên tục của NPC — chữ thường không khung, hiện vài giây rồi đổi câu, chỉ NPC gần người chơi và trong tầm nhìn
  // GĐ174 (Bảo chê rối chữ): tầm nói 520→230px, tối đa 8→2 người cùng lúc, nhịp nói lại ~11s→~28–42s/NPC
  private updateNpcDialogues(): void {
    if (!this.myContainer || !this.myChar) return;
    const now = performance.now();
    const px = this.myContainer.x, py = this.myContainer.y;
    const view = this.cameras.main.worldView;
    const live = new Map<string, { c: Phaser.GameObjects.Container; name: string; role: string; kind: string }>();
    for (const [id, c] of this.npcActors) {
      if (id.startsWith('npc_bicanh')) continue; // cổng không phải người
      const d = (c as any).npcData as { name: string; role: string } | undefined;
      live.set(id, { c, name: d?.name || '', role: d?.role || '', kind: 'village' });
    }
    for (const o of this.cityNpcObjects) {
      const d = (o as any).npcData as { id: string; name: string; role: string; kind: string } | undefined;
      if (d) live.set(d.id, { c: o, name: d.name, role: d.role, kind: d.kind || 'functional' });
    }
    for (const id of Array.from(this.dialogueState.keys())) if (!live.has(id)) this.dialogueState.delete(id);
    const cands = Array.from(live.entries())
      .map(([id, v]) => ({ id, ...v, d: Math.hypot(v.c.x - px, v.c.y - py) }))
      .filter((e) => e.d <= 230 && e.c.x >= view.x - 50 && e.c.x <= view.x + view.width + 50 && e.c.y >= view.y - 50 && e.c.y <= view.y + view.height + 50) // GĐ174: chỉ NPC thật gần (230px) mới nói
      .sort((a, b) => a.d - b.d)
      .slice(0, 2); // GĐ174: tối đa 2 người cùng nói (trước 8 — rối mắt)
    const speaking = new Set(cands.map((e) => e.id));
    for (const [id, v] of live) {
      const cur = v.c.getByName('dlg') as Phaser.GameObjects.Text | null;
      let st = this.dialogueState.get(id);
      if (!st) { st = { idx: 0, nextAt: now + (hashStr(id) % 9000), until: 0 }; this.dialogueState.set(id, st); }
      if (cur && (now > st.until || !speaking.has(id))) { cur.destroy(); continue; }
      if (!cur && speaking.has(id) && now >= st.nextAt) {
        const lines = npcTalkLines({ id, name: v.name, role: v.role, kind: v.kind, mapId: this.mapState?.mapId || '', isHome: !!this.mapState?.isHome, category: this.mapState?.category || '', mapName: this.mapState?.name || '' });
        if (!lines.length) continue;
        const text = lines[st.idx % lines.length];
        st.idx++;
        const t = this.add.text(0, -92, text, { fontFamily: 'Palatino, Georgia, serif', fontSize: '12px', color: '#fff8e0', align: 'center', stroke: '#101408', strokeThickness: 4, wordWrap: { width: 200 } }).setOrigin(0.5, 1);
        t.setName('dlg');
        v.c.add(t);
        st.until = now + 4500;
        st.nextAt = now + 28000 + (hashStr(id) % 14000); // GĐ174: mỗi NPC ~28–42s mới nói lại 1 câu (trước ~11–15s)
      }
    }
    (window as any).tttDialogues = () => {
      const out: Array<{ id: string; text: string }> = [];
      for (const [id, v] of live) {
        const t = v.c.getByName('dlg') as Phaser.GameObjects.Text | null;
        if (t) out.push({ id, text: t.text });
      }
      return out;
    };
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
    for (const id of ['shopPanel', 'questPanel', 'invPanel', 'npcDialog', 'jobPanel', 'achPanel', 'learnPanel', 'boardPanel', 'stonesPanel', 'altarPanel', 'forgePanel', 'hintPanel', 'mountPanel', 'socialPanel', 'playerCardPanel', 'nearPanel', 'socialInvite']) { // GĐ194: + panel xã hội
      const el = document.getElementById(id);
      if (el) el.style.display = 'none';
    }
  }

  // GĐ150: panel SỔ GỢI Ý — toàn văn gợi ý Đạo Quán đã tìm (dời khỏi thẻ cho gọn)
  private toggleHintPanel(): void {
    if (!this.myChar) return;
    if (this.openPanel === 'hint') { this.closePanels(); return; }
    this.closePanels();
    this.openPanel = 'hint';
    const p = document.getElementById('hintPanel');
    if (p) p.style.display = 'block';
    this.renderHintPanel();
  }
  private renderHintPanel(): void {
    const body = document.getElementById('hintBody');
    const title = document.getElementById('hintTitle');
    if (!body) return;
    const dh = ((this.myChar as any)?.daoHints || []) as string[];
    if (title) title.textContent = `💡 Gợi ý Đạo Quán đã tìm (${dh.length}/3)`;
    const HINT_TEXTS: Record<string, string> = {
      daoHint1: 'Bia đá cổ bên Tụ Linh: “Ngồi yên ở đây, tâm tĩnh thì đạo tiến. Có người ngồi đủ lâu, bỗng thấy trong người mở ra những khiếu huyệt trước nay chưa từng biết — nhưng chỉ người kiên trì mới gặp được.”',
      daoHint2: 'Vết kiếm cũ trên cọc gỗ đầu làng: “Kẻ ra ngoài kia đánh quái, nhặt đồ, làm nhiệm vụ — thân thể cứng cáp, túi đầy linh thạch. Nhưng đi mà không tu tâm, sớm muộn cũng gặp bình cảnh.”',
      daoHint3: 'Mảnh giấy kẹp ở cửa Đạo Quán, chữ tiền bối: “Có người cả đời ngồi một chỗ mà thành đạo, có người đi khắp thiên hạ mà thành đạo. Đường nào cũng có thể quay đầu — quan trọng là đừng đứng yên một chỗ mà không hiểu mình đang làm gì.”',
      hintGear: 'Mặt trong của món đồ bỗng hiện dòng chữ nhỏ như tự khắc từ lâu: “Đồ có linh, tự biết theo chủ. Có những dòng nội tại không môn phái nào dạy, không cảnh giới nào khóa được — chúng luôn ở bên chủ nhân, dù trong hoàn cảnh ngặt nghèo nhất.”',
      hintMount: 'Tiếng vó xa vọng lại theo gió. Người già trong làng bảo: “Ngựa hay không ở chỗ nhanh — ở chỗ đi được nhiều đường. Kẻ cưỡi đủ nhiều loài, ngắm đủ nhiều đất, tự khắc lòng rộng ra.”',
      hintLowHp: 'Trong khoảnh khắc tưởng như gục ngã, trong người bỗng có thứ gì đó chực chờ — như lớp màng mỏng chỉ hiện ra khi bị dồn tới đường cùng. Có lẽ… phải tu tới cảnh giới cao hơn mới gọi nó ra được theo ý mình.',
      hintNight: 'Đêm buông xuống bãi cỏ, tiếng quái xa cũng khác hẳn ban ngày. Có những dấu chân chỉ hiện ra dưới ánh trăng — và những người chỉ ra ngoài khi trời đã tối hẳn.',
      hintFriend: 'Có thêm một người đồng hành, con đường bỗng bớt dài. Người xưa nói: một mình đi nhanh, cùng nhau đi xa — có những cửa ải sinh ra là để nhiều người cùng bước qua.',
      hintCity: 'Ra khỏi lũy tre làng mới thấy trời cao đất rộng: thành thị có nhiệm vụ của thành thị, tông môn có đạo của tông môn. Mỗi nơi đều giấu một câu chuyện — chịu khó hỏi han, ắt nghe được điều hay.',
      hintDeath: 'Nằm gục giữa đường tu, mới hiểu vì sao người ta cần đồng đội và cần một vị Y Tu ở gần. Chết không đáng sợ bằng việc ngã xuống mà chẳng ai hay.',
    };
    const found = dh.map((f) => `<p>${HINT_TEXTS[f] || f}</p>`).join('');
    const missing = 3 - dh.length;
    body.innerHTML = found + (missing > 0
      ? `<p style="opacity:0.7">🔒 Còn ${missing} gợi ý chưa tìm thấy — hãy để ý những chỗ mình hay đi qua, cả trong lẫn ngoài làng.</p>`
      : '<p>🎉 Đã tìm đủ 3 gợi ý Đạo Quán!</p>');
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
    // GĐ96: mục Tẩm bổ riêng cho Thể Tu — hiện thêm ở cả 2 nhánh (chưa/có nghề),
    // vì Thể Tu nấu được mà không cần học nghề Thú Sư.
    const tamboSection = (inv: Record<string, number>): string => {
      const rows = Object.entries(RECIPE_INFO).filter(([, r]) => r.tambo).map(([rid, r]) => {
        const inputs = Object.entries(r.inputs).map(([iid, n]) => `${ITEM_INFO[iid]?.name || iid} ×${n} (có ${inv[iid] || 0})`).join(' + ') + (r.stones ? ` + ${r.stones} LT` : '');
        return `<div class="prow"><span class="pname">${r.name}<span class="pdesc">${inputs} → ${ITEM_INFO[r.output]?.name || r.output} · Tỉ lệ thành công ${Math.round(r.rate * 100)}%</span></span><button class="pbtn gold" data-craft="${rid}">Chế tạo</button></div>`;
      }).join('');
      return rows ? `<div class="prow" style="font-weight:bold">🍲 Tẩm bổ nhục thân — riêng Thể Tu, không cần học nghề</div>${rows}` : '';
    };
    // GĐ98: mục Chế độc riêng cho Ảnh Tu — hiện thêm ở cả 2 nhánh (chưa/có nghề),
    // vì Ảnh Tu chế độc được mà không cần học nghề (giống Tẩm bổ của Thể Tu).
    const docduocSection = (inv: Record<string, number>): string => {
      const rows = Object.entries(RECIPE_INFO).filter(([, r]) => r.docduoc).map(([rid, r]) => {
        const inputs = Object.entries(r.inputs).map(([iid, n]) => `${ITEM_INFO[iid]?.name || iid} ×${n} (có ${inv[iid] || 0})`).join(' + ') + (r.stones ? ` + ${r.stones} LT` : '');
        return `<div class="prow"><span class="pname">${r.name}<span class="pdesc">${inputs} → ${ITEM_INFO[r.output]?.name || r.output} · Tỉ lệ thành công ${Math.round(r.rate * 100)}%</span></span><button class="pbtn gold" data-craft="${rid}">Chế tạo</button></div>`;
      }).join('');
      return rows ? `<div class="prow" style="font-weight:bold">☠️ Chế độc — riêng Ảnh Tu, không cần học nghề</div>${rows}` : '';
    };
    const duongkiemSection = (inv: Record<string, number>): string => {
      const rows = Object.entries(RECIPE_INFO).filter(([, r]) => r.duongkiem).map(([rid, r]) => {
        const inputs = Object.entries(r.inputs).map(([iid, n]) => `${ITEM_INFO[iid]?.name || iid} ×${n} (có ${inv[iid] || 0})`).join(' + ') + (r.stones ? ` + ${r.stones} LT` : '');
        const sw = r.sword ? SWORD_INFO[r.sword] : null;
        return `<div class="prow"><span class="pname">${r.name}<span class="pdesc">${inputs} → Rèn ngay, trang bị luôn · ${sw ? sw.desc : ''} · Tỉ lệ thành công ${Math.round(r.rate * 100)}%</span></span><button class="pbtn gold" data-craft="${rid}">Rèn kiếm</button></div>`;
      }).join('');
      return rows ? `<div class="prow" style="font-weight:bold">⚔️ Dưỡng Kiếm — riêng Kiếm Tu, không cần học nghề</div>${rows}` : '';
    };
    const cotloiSection = (inv: Record<string, number>): string => {
      const rows = Object.entries(RECIPE_INFO).filter(([, r]) => r.cotloi).map(([rid, r]) => {
        const inputs = Object.entries(r.inputs).map(([iid, n]) => `${ITEM_INFO[iid]?.name || iid} ×${n} (có ${inv[iid] || 0})`).join(' + ') + (r.stones ? ` + ${r.stones} LT` : '');
        return `<div class="prow"><span class="pname">${r.name}<span class="pdesc">${inputs} → ${ITEM_INFO[r.output]?.name || r.output} · Tỉ lệ thành công ${Math.round(r.rate * 100)}%</span></span><button class="pbtn gold" data-craft="${rid}">Luyện lõi</button></div>`;
      }).join('');
      return rows ? `<div class="prow" style="font-weight:bold">🦴 Luyện Khôi Lõi — riêng Cốt Tu, không cần học nghề</div>${rows}` : '';
    };
    const job = mc.job;
    const job2 = (mc as any).job2 || null; // GĐ142: nghề thứ hai từ Nhập Đạo
    const job3 = (mc as any).job3 || null; // GĐ160: nghề thứ ba từ Nguyên Anh
    if (!job) {
      if (sub) sub.textContent = mc.linhCan
        ? 'Chọn 1 nghề phụ để học (bản này mỗi nhân vật 1 nghề). Chế tạo tốn Nanh Sói + Linh thạch, thất bại mất nguyên liệu.'
        : 'Cần đo linh căn ở Đạo Quán trước khi học nghề phụ.';
      if (sub && mc.classId === 'thetu') sub.textContent += ' Thể Tu nấu Tẩm bổ được ngay bên dưới, không cần học nghề.';
      if (sub && mc.classId === 'satthu') sub.textContent += ' Ảnh Tu chế độc được ngay bên dưới, không cần học nghề.';
      if (sub && mc.classId === 'kiemtu') sub.textContent += ' Kiếm Tu rèn kiếm được ngay bên dưới, không cần học nghề.';
      body.innerHTML = Object.entries(JOB_INFO).map(([jobId, j]) =>
        `<div class="prow"><span class="pname">${j.icon} ${j.name}<span class="pdesc">${Object.values(RECIPE_INFO).filter((r) => r.jobId === jobId && !r.tambo && !r.docduoc && !r.duongkiem && !r.cotloi).map((r) => r.name).join(' · ')}</span></span><button class="pbtn gold" data-learn="${jobId}" ${mc.linhCan ? '' : 'disabled'}>Học nghề</button></div>`,
      ).join('');
      body.querySelectorAll<HTMLButtonElement>('[data-learn]').forEach((b) => {
        b.onclick = () => this.socket.emit('learn_job', { jobId: b.dataset.learn });
      });
      // GĐ96: Thể Tu chưa có nghề vẫn thấy + chế được Tẩm bổ
      if (mc.classId === 'thetu') {
        body.innerHTML += tamboSection(mc.inventory);
        body.querySelectorAll<HTMLButtonElement>('[data-craft]').forEach((b) => {
          b.onclick = () => this.socket.emit('craft_item', { recipeId: b.dataset.craft });
        });
      }
      // GĐ98: Ảnh Tu chưa có nghề vẫn thấy + chế được độc
      if (mc.classId === 'satthu') {
        body.innerHTML += docduocSection(mc.inventory);
        body.querySelectorAll<HTMLButtonElement>('[data-craft]').forEach((b) => {
          b.onclick = () => this.socket.emit('craft_item', { recipeId: b.dataset.craft });
        });
      }
      // GĐ99: Kiếm Tu chưa có nghề vẫn thấy + rèn được kiếm
      if (mc.classId === 'kiemtu') {
        body.innerHTML += duongkiemSection(mc.inventory);
        body.querySelectorAll<HTMLButtonElement>('[data-craft]').forEach((b) => {
          b.onclick = () => this.socket.emit('craft_item', { recipeId: b.dataset.craft });
        });
      }
      // GĐ101: Cốt Tu chưa có nghề vẫn thấy + luyện được lõi
      if (mc.classId === 'cottu') {
        body.innerHTML += cotloiSection(mc.inventory);
        body.querySelectorAll<HTMLButtonElement>('[data-craft]').forEach((b) => {
          b.onclick = () => this.socket.emit('craft_item', { recipeId: b.dataset.craft });
        });
      }
      return;
    }
    // GĐ131: thang 14 cấp — ngưỡng + trần cảnh giới (mirror server, số TẠM)
    const JOB_RANK_CRAFTS_CLIENT = [0, 10, 30, 60, 100, 160, 240, 340, 460, 600, 800, 1000, 1400, 2000];
    const JOB_RANK_CAP_CLIENT: Record<string, number> = { pham: 4, lk: 7, tc: 10, kd: 12, na: 13, ht: 14 };
    const title = job.title || (job.rank === 13 ? `Đế Vương ${job.jobName}` : job.rank === 14 ? `Thánh Vương ${job.jobName}` : `${job.rankName} ${job.jobName}`);
    const cap = JOB_RANK_CAP_CLIENT[mc.realm || 'pham'] ?? 4;
    const nextAt = job.rank < 14 && job.rank < cap ? JOB_RANK_CRAFTS_CLIENT[job.rank] : null;
    const MASTER_NAME_CLIENT: Record<string, string> = { npc_master_dansu: 'Đan Lão', npc_master_luyenkhi: 'Khí Lão', npc_master_tranphap: 'Trận Lão', npc_master_phusu: 'Phù Lão', npc_master_thusu: 'Thú Lão', npc_master_daokhoang: 'Khoáng Lão', npc_master_haithuoc: 'Thảo Lão' };
    const masterName = job.master ? MASTER_NAME_CLIENT[job.master] : null;
    if (sub) sub.textContent = `${JOB_INFO[job.jobId].icon} ${title} · Đã ${job.jobId === 'daokhoang' || job.jobId === 'haithuoc' ? 'thu thập' : 'chế'} thành công ${job.crafts} lần${masterName ? ` · Đệ tử của ${masterName} (+5% tỉ lệ chế)` : ' · Chưa bái sư — gặp sư phụ ở làng để bái sư (+5% tỉ lệ chế)'}${nextAt ? ` · Còn ${nextAt - job.crafts} lần nữa lên ${JOB_RANK_NAMES_CLIENT[job.rank + 1]}` : job.rank >= cap && job.rank < 14 ? ' · Đã chạm trần cảnh giới (lên cảnh giới mới mở thêm phẩm)' : ' · Cấp cao nhất'}`;
    if (sub && job2) sub.textContent += ` · Nghề thứ hai: ${job2.title} (${job2.crafts} lần chế)`;
    if (sub && job3) sub.textContent += ` · Nghề thứ ba: ${job3.title} (${job3.crafts} lần chế)`;
    let html = '';
    const invNow = mc.inventory;
    for (const [rid, r] of Object.entries(RECIPE_INFO)) {
      const rj = r.jobId === job.jobId ? job : (job2 && r.jobId === job2.jobId ? job2 : (job3 && r.jobId === job3.jobId ? job3 : null)); // GĐ142: công thức của nghề khớp (chính hoặc thứ hai); GĐ160: cả nghề thứ ba
      if (!rj || r.tambo || r.docduoc || r.duongkiem || r.cotloi) continue; // GĐ96: Tẩm bổ ra mục riêng, không lẫn vào nghề; GĐ98: Chế độc cũng vậy; GĐ99: Dưỡng Kiếm cũng vậy; GĐ101: Luyện Khôi Lõi cũng vậy
      const inputs = Object.entries(r.inputs).map(([iid, n]) => `${ITEM_INFO[iid]?.name || iid} ×${n} (có ${invNow[iid] || 0})`).join(' + ') + (r.stones ? ` + ${r.stones} LT` : '');
      const locked = rj.rank < r.minRank;
      const effRate = Math.min(100, Math.round(r.rate * 100) + (rj.master ? 5 : 0)); // GĐ131: đệ tử +5%
      html += `<div class="prow"><span class="pname">${r.name}<span class="pdesc">${inputs} → ${ITEM_INFO[r.output]?.name || r.output} · Tỉ lệ thành công ${effRate}%${r.minRank > 1 ? ` · Cần cấp ${JOB_RANK_NAMES_CLIENT[r.minRank]}` : ''}</span></span><button class="pbtn" data-craft="${rid}" ${locked ? 'disabled' : ''}>${locked ? '🔒 Chưa đủ cấp' : 'Chế tạo'}</button></div>`;
    }
    // GĐ134: Luyện Khí Sư tự rèn trang bị — chọn phẩm + ô đồ, rèn ngay không chờ
    // như đặt rèn NPC; hỏng mất nguyên liệu; đồ rèn ra theo hướng tu + hệ của bạn.
    const forgeJob = job.jobId === 'luyenkhi' ? job : (job2 && job2.jobId === 'luyenkhi' ? job2 : (job3 && job3.jobId === 'luyenkhi' ? job3 : null)); // GĐ142: tự rèn theo nghề khớp; GĐ160: cả nghề thứ ba
    if (forgeJob) {
      const FORGE_RARITY_CLIENT = [
        { id: 'TRANG', name: 'Phàm', rank: 1, rate: 95, stones: 10, mats: { quang_sat: 2 } },
        { id: 'XAM', name: 'Sơ', rank: 2, rate: 90, stones: 20, mats: { quang_sat: 3 } },
        { id: 'LUC', name: 'Linh', rank: 4, rate: 85, stones: 40, mats: { quang_sat: 5 } },
        { id: 'LAM', name: 'Bảo', rank: 6, rate: 80, stones: 80, mats: { quang_dong: 3 } },
        { id: 'TIM', name: 'Tiên', rank: 8, rate: 75, stones: 150, mats: { quang_dong: 5 } },
        { id: 'CAM', name: 'Thần', rank: 10, rate: 70, stones: 300, mats: { quang_bac: 3 } },
        { id: 'DO', name: 'Huyết', rank: 12, rate: 65, stones: 600, mats: { quang_bac: 5 } },
        { id: 'DEN', name: 'Ma', rank: 13, rate: 60, stones: 1200, mats: { quang_bac: 8, da_quy: 2 } },
        { id: 'VO', name: 'Vô Cực', rank: 14, rate: 50, stones: 3000, mats: { quang_bac: 12, da_quy: 5, tinh_huyet: 2 } },
      ];
      const FORGE_WEAPON_CLIENT: Record<string, Array<{ id: string; name: string }>> = {
        THE_TU: [{ id: 'TAY_KHONG', name: 'Tay Không' }, { id: 'CHIEN_PHU', name: 'Chiến Phủ' }, { id: 'CU_KIEM', name: 'Cự Kiếm' }, { id: 'DAO', name: 'Đao' }, { id: 'THUONG', name: 'Thương' }, { id: 'THIET_CON', name: 'Thiết Côn' }],
        PHAP_TU: [{ id: 'PHIEN', name: 'Phiến' }, { id: 'PHAP_TRUONG', name: 'Pháp Trượng' }, { id: 'SACH_PHEP', name: 'Sách Phép' }],
        PHAT_TU: [{ id: 'PHAT_CHAU', name: 'Phật Châu' }, { id: 'QUYEN_TRUONG', name: 'Quyền Trượng' }, { id: 'BINH_BAT', name: 'Bình Bát' }],
        COT_TU: [{ id: 'COT_THUAN', name: 'Cốt Thuẫn' }, { id: 'COT_CHUY', name: 'Cốt Chùy' }],
        SAT_THU: [{ id: 'DAO_GAM', name: 'Dao Găm' }, { id: 'SONG_DAO', name: 'Song Dao' }, { id: 'LIEM_NGAN', name: 'Liềm Ngắn' }, { id: 'TRAO', name: 'Trảo' }],
        KIEM_TU: [{ id: 'KIEM', name: 'Kiếm' }, { id: 'SONG_KIEM', name: 'Song Kiếm' }, { id: 'TRONG_KIEM', name: 'Trọng Kiếm' }],
        QUY_TU: [{ id: 'CO_LENH', name: 'Cờ Lệnh' }, { id: 'LUOI_HAI', name: 'Lưỡi Hái' }, { id: 'QUY_THUONG', name: 'Quỷ Thương' }],
        Y_TU: [{ id: 'PHAT_TRAN', name: 'Phất Trần' }, { id: 'KIM_CHAM', name: 'Kim Châm' }, { id: 'CO_CAM', name: 'Cổ Cầm' }],
        NHO_TU: [{ id: 'NGON_LINH', name: 'Ngôn Linh' }, { id: 'BUT_PHEP', name: 'Bút Phép' }, { id: 'QUYEN_TRUC', name: 'Quyển Trúc' }], // GĐ157: Độc Thơ → Ngôn Linh (đọc chữ thành vũ khí — Bảo chốt 29/10)
      };
      const CLASS_PATH_CLIENT: Record<string, string> = { thetu: 'THE_TU', phattu: 'PHAT_TU', cottu: 'COT_TU', satthu: 'SAT_THU', kiemtu: 'KIEM_TU', phaptu: 'PHAP_TU', quytu: 'QUY_TU', ytu: 'Y_TU', nhotu: 'NHO_TU' };
      const path = CLASS_PATH_CLIENT[mc.classId] || 'THE_TU';
      const unlocked = FORGE_RARITY_CLIENT.filter((r) => forgeJob.rank >= r.rank);
      const savedRarity = (this as unknown as { forgeRarity?: string }).forgeRarity;
      const selRarity = savedRarity && unlocked.some((r) => r.id === savedRarity) ? savedRarity : (unlocked[unlocked.length - 1]?.id || 'TRANG');
      const cfg = FORGE_RARITY_CLIENT.find((r) => r.id === selRarity) || FORGE_RARITY_CLIENT[0];
      const matsTxt = Object.entries(cfg.mats).map(([iid, n]) => `${ITEM_INFO[iid]?.name || iid} ×${n} (có ${invNow[iid] || 0})`).join(' + ');
      const effRate = Math.min(100, cfg.rate + (forgeJob.master ? 5 : 0));
      const TOKEN_RANK_NAMES = ['Cửu', 'Bát', 'Thất', 'Lục', 'Ngũ', 'Tứ', 'Tam', 'Nhị', 'Nhất'];
      let rows = '';
      for (const slot of GEAR_SLOT_ORDER) {
        const slotName = GEAR_SLOT_NAME[slot] || slot;
        let extra = '';
        if (slot === 'WEAPON') {
          const opts = (FORGE_WEAPON_CLIENT[path] || []).map((w) => `<option value="${w.id}">${w.name}</option>`).join('');
          extra = ` <select data-forge-weapon>${opts}</select>`;
        } else if (slot === 'TOKEN') {
          extra = ` <select data-forge-token>${[1, 2, 3, 4, 5, 6, 7, 8, 9].map((t) => `<option value="${t}">${TOKEN_RANK_NAMES[t - 1]} phẩm</option>`).join('')}</select>`;
        }
        rows += `<div class="prow"><span class="pname">${slotName}<span class="pdesc">${matsTxt} + ${cfg.stones} LT · Tỉ lệ thành công ${effRate}%</span></span>${extra}<button class="pbtn gold" data-forge="${slot}">Rèn</button></div>`;
      }
      html += `<div class="prow" style="font-weight:bold">🔨 Tự rèn trang bị — rèn ngay, không chờ như đặt rèn ở Tiệm Rèn; hỏng mất nguyên liệu; đồ rèn ra theo hướng tu + hệ của bạn, xem trong Túi đồ tab Trang bị</div><div class="prow"><span class="pname">Chọn phẩm<span class="pdesc">Phẩm tối đa theo cấp nghề (lên cấp mở thêm phẩm)</span></span><select data-forge-rarity>${FORGE_RARITY_CLIENT.map((r) => `<option value="${r.id}" ${r.id === selRarity ? 'selected' : ''} ${forgeJob.rank >= r.rank ? '' : 'disabled'}>${r.name} (cần ${JOB_RANK_NAMES_CLIENT[r.rank]})</option>`).join('')}</select></div>${rows}`;
    }
    // GĐ135: Trận Pháp Sư bố trận — mỗi loại 1 trận/người, tốn 1 Trận Kỳ;
    // Trận Dịch Chuyển bền qua restart, gọi về được nhiều lần (cùng map).
    const tranJob = job.jobId === 'tranphap' ? job : (job2 && job2.jobId === 'tranphap' ? job2 : (job3 && job3.jobId === 'tranphap' ? job3 : null)); // GĐ142: bố trận theo nghề khớp; GĐ160: cả nghề thứ ba
    if (tranJob) {
      const TRAN_ARRAY_CLIENT = [
        { type: 'teleport', name: 'Trận Dịch Chuyển', rank: 1, desc: 'Bố tại chỗ đứng, bấm Gọi về để dịch chuyển tức thời về đây (cùng map, nhiều lần, bền qua restart)' },
        { type: 'buff', name: 'Trận Cường Công', rank: 2, desc: 'Người trong trận (200px, 60s) gây sát thương ×1,25' },
        { type: 'debuff', name: 'Trận Suy Nhược', rank: 4, desc: 'Quái trong trận (200px, 60s) gây sát thương ×0,5' },
        { type: 'seal', name: 'Cấm Chế Trận', rank: 6, desc: 'Quái trong trận (150px, 15s) không đi không cắn được' },
      ];
      const tranKy = invNow['tran_ky'] || 0;
      html += `<div class="prow" style="font-weight:bold">🔮 Bố trận — mỗi loại 1 trận/người (bố lại thay trận cũ), tốn 1 Trận Kỳ/lần (chế ở trên: 4 Nanh Sói + 10 LT; Trận Kỳ dùng trực tiếp thì về làng)</div>`;
      for (const a of TRAN_ARRAY_CLIENT) {
        const locked = tranJob.rank < a.rank;
        html += `<div class="prow"><span class="pname">${a.name}<span class="pdesc">${a.desc} · Cần ${JOB_RANK_NAMES_CLIENT[a.rank]} · Trận Kỳ có ${tranKy}</span></span><button class="pbtn gold" data-array-place="${a.type}" ${locked || tranKy < 1 ? 'disabled' : ''}>${locked ? '🔒 Chưa đủ cấp' : 'Bố trận'}</button></div>`;
      }
      const hasTeleport = !!(mc as unknown as { teleportArray?: unknown }).teleportArray;
      html += `<div class="prow"><span class="pname">🌀 Gọi về Trận Dịch Chuyển<span class="pdesc">${hasTeleport ? 'Dịch chuyển tức thời về chỗ đã bố trận (chỉ cùng map)' : 'Chưa bố Trận Dịch Chuyển'}</span></span><button class="pbtn gold" data-array-recall ${hasTeleport ? '' : 'disabled'}>Gọi về</button></div>`;
    }
    // GĐ132: nghề thu thập không có công thức — hướng dẫn đi thu thập thay cho danh sách trống
    if (!html && (job.jobId === 'daokhoang' || job.jobId === 'haithuoc')) {
      const gatherIcon = job.jobId === 'daokhoang' ? '⛏️' : '🌿';
      const gatherWhat = job.jobId === 'daokhoang' ? 'mạch quặng' : 'bụi thuốc';
      html += `<div class="prow"><span class="pname">Thu thập ngoài hoang<span class="pdesc">${gatherIcon} Đi tới các ${gatherWhat} trên map farm và map nguyên tố (cả vành đai farm phía đông làng), đứng gần bấm E để thu thập — mỗi điểm ngày 1 lần, mỗi lần nghề +1 lượt.</span></span></div>`;
    }
    // GĐ142: nghề thứ hai là nghề thu thập thì cũng hiện hướng dẫn của nó
    if (job2 && (job2.jobId === 'daokhoang' || job2.jobId === 'haithuoc')) {
      const g2Icon = job2.jobId === 'daokhoang' ? '⛏️' : '🌿';
      const g2What = job2.jobId === 'daokhoang' ? 'mạch quặng' : 'bụi thuốc';
      html += `<div class="prow"><span class="pname">Thu thập ngoài hoang (nghề thứ hai)<span class="pdesc">${g2Icon} Đi tới các ${g2What} trên map farm và map nguyên tố, đứng gần bấm E — mỗi điểm ngày 1 lần, mỗi lần nghề +1 lượt.</span></span></div>`;
    }
    // GĐ142: Nhập Đạo cho học thêm 1 nghề phụ thứ hai (chỉ hiện khi chưa có nghề thứ hai)
    if (!job2 && (mc as any).anState?.nhapDao) {
      html += `<div class="prow" style="font-weight:bold">✦ Nhập Đạo — học thêm 1 nghề phụ thứ hai</div>`;
      for (const [jid, j] of Object.entries(JOB_INFO)) {
        if (jid === job.jobId) continue;
        html += `<div class="prow"><span class="pname">${j.icon} ${j.name}<span class="pdesc">${Object.values(RECIPE_INFO).filter((r) => r.jobId === jid && !r.tambo && !r.docduoc && !r.duongkiem && !r.cotloi).map((r) => r.name).join(' · ')}</span></span><button class="pbtn gold" data-learn="${jid}" ${mc.linhCan ? '' : 'disabled'}>Học nghề thứ hai</button></div>`;
      }
    }
    // GĐ160: Nguyên Anh mở trần 3 nghề phụ (hiện khi đã Nguyên Anh và còn ô nghề trống)
    if (['na', 'ht'].includes(mc.realm || '') && job && (!job2 || !job3)) {
      html += `<div class="prow" style="font-weight:bold">✦ Nguyên Anh — học thêm nghề phụ (tối đa 3 nghề)</div>`;
      for (const [jid, j] of Object.entries(JOB_INFO)) {
        if (jid === job.jobId || (job2 && jid === job2.jobId) || (job3 && jid === job3.jobId)) continue;
        html += `<div class="prow"><span class="pname">${j.icon} ${j.name}<span class="pdesc">${Object.values(RECIPE_INFO).filter((r) => r.jobId === jid && !r.tambo && !r.docduoc && !r.duongkiem && !r.cotloi).map((r) => r.name).join(' · ')}</span></span><button class="pbtn gold" data-learn="${jid}" ${mc.linhCan ? '' : 'disabled'}>Học nghề</button></div>`;
      }
    }
    // GĐ160: nghề thứ ba là nghề thu thập thì cũng hiện hướng dẫn của nó
    if (job3 && (job3.jobId === 'daokhoang' || job3.jobId === 'haithuoc')) {
      const g3Icon = job3.jobId === 'daokhoang' ? '⛏️' : '🌿';
      const g3What = job3.jobId === 'daokhoang' ? 'mạch quặng' : 'bụi thuốc';
      html += `<div class="prow"><span class="pname">Thu thập ngoài hoang (nghề thứ ba)<span class="pdesc">${g3Icon} Đi tới các ${g3What} trên map farm và map nguyên tố, đứng gần bấm E — mỗi điểm ngày 1 lần, mỗi lần nghề +1 lượt.</span></span></div>`;
    }
    // GĐ96: Thể Tu có nghề khác vẫn thấy mục Tẩm bổ
    if (mc.classId === 'thetu') html += tamboSection(invNow);
    // GĐ98: Ảnh Tu có nghề khác vẫn thấy mục Chế độc
    if (mc.classId === 'satthu') html += docduocSection(invNow);
    // GĐ99: Kiếm Tu có nghề khác vẫn thấy mục Dưỡng Kiếm
    if (mc.classId === 'kiemtu') html += duongkiemSection(invNow);
    // GĐ101: Cốt Tu có nghề khác vẫn thấy mục Luyện Khôi Lõi
    if (mc.classId === 'cottu') html += cotloiSection(invNow);
    body.innerHTML = html;
    body.querySelectorAll<HTMLButtonElement>('[data-craft]').forEach((b) => {
      b.onclick = () => this.socket.emit('craft_item', { recipeId: b.dataset.craft });
    });
    // GĐ142: bind nút học nghề thứ hai (gửi learn_job như nhánh chưa có nghề)
    body.querySelectorAll<HTMLButtonElement>('[data-learn]').forEach((b) => {
      b.onclick = () => this.socket.emit('learn_job', { jobId: b.dataset.learn });
    });
    // GĐ135: bind khối bố trận (Bố trận gửi array_place, Gọi về gửi array_recall)
    body.querySelectorAll<HTMLButtonElement>('[data-array-place]').forEach((b) => {
      b.onclick = () => this.socket.emit('array_place', { type: b.dataset.arrayPlace });
    });
    body.querySelectorAll<HTMLButtonElement>('[data-array-recall]').forEach((b) => {
      b.onclick = () => this.socket.emit('array_recall', {});
    });
    // GĐ134: bind khối tự rèn (đổi phẩm vẽ lại panel, bấm Rèn gửi forge_gear)
    body.querySelectorAll<HTMLSelectElement>('[data-forge-rarity]').forEach((s) => {
      s.onchange = () => { (this as unknown as { forgeRarity?: string }).forgeRarity = s.value; this.renderJobPanel(); };
    });
    body.querySelectorAll<HTMLButtonElement>('[data-forge]').forEach((b) => {
      b.onclick = () => {
        const rarity = (body.querySelector('[data-forge-rarity]') as HTMLSelectElement | null)?.value || 'TRANG';
        const weapon = (body.querySelector('[data-forge-weapon]') as HTMLSelectElement | null)?.value;
        const tokenRank = (body.querySelector('[data-forge-token]') as HTMLSelectElement | null)?.value;
        this.socket.emit('forge_gear', { slot: b.dataset.forge, rarity, weapon, tokenRank: tokenRank ? Number(tokenRank) : undefined });
      };
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
      const tierName = e.tier === 'coban' ? 'Cơ bản' : e.tier === 'luyenkhi' ? 'Luyện Khí' : e.tier === 'kimdan' ? 'Kim Đan · Thần thông' : e.tier === 'nguyenanh' ? 'Nguyên Anh · Thần thông' : e.tier === 'phaptuong' ? 'Pháp Tướng' : 'Trúc Cơ'; // GĐ184: chiêu Pháp Tướng thay thần thông Hóa Thần
      // GĐ68: icon chiêu vẽ thủ tục (hệ + bậc + vũ khí) — mọi chiêu đều có icon
      const ic = `<img class="skicon" src="${skillIconURL(e)}" alt="" title="${e.name}">`;
      const meta = `Hệ ${e.element} · Hệ số ${e.coef} · Hồi chiêu ${(e.cdMs / 1000).toFixed(1)}s · Tốn ${e.cost} chân nguyên${(e as unknown as { hpCostPct?: number }).hpCostPct ? ` + ${(e as unknown as { hpCostPct?: number }).hpCostPct}% máu` : ''}${e.fxText ? ` · ⚡ ${e.fxText}` : ''}${e.desc ? ` · ${e.desc.slice(0, 90)}${e.desc.length > 90 ? '…' : ''}` : ''}`; // GĐ186: + tốn máu của chiêu Pháp Tướng
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

  // GĐ138: panel thành tựu chung — 11 nhóm, mỗi thành tựu nhiều bậc; mỗi bậc
  // nhận 1 lần (danh hiệu + Rương Thành Tựu + Đạo Tích), danh hiệu đã nhận thì đeo được.
  private renderAchPanel(): void {
    if (!this.myChar) return;
    const body = document.getElementById('achBody');
    if (!body) return;
    const ach = this.myChar.achievements;
    if (!ach) { body.innerHTML = '<div class="prow">Chưa có dữ liệu thành tựu.</div>'; return; }
    const titleTxt = ach.title ? `✦ ${ach.title.text}` : 'Chưa đeo danh hiệu';
    const groupsHtml = ach.groups.map((g) => {
      const pct = g.daoTichMax > 0 ? Math.round((g.daoTich / g.daoTichMax) * 100) : 0;
      const rows = ach.list.filter((a) => a.group === g.id).map((a) => {
        const progTxt = a.next !== null ? `${a.progress}/${a.next}` : `${a.progress} (đủ bậc)`;
        const rewardTxt = a.next !== null ? `Bậc ${a.tier + 1}: “${a.nextTitle}” + ${a.nextChest} + ${a.nextDao} Đạo Tích` : 'Đã đủ mọi bậc';
        const mark = a.claimed >= a.tier && a.tier > 0 ? '✅' : a.claimable ? '🏆' : '▫️';
        const btn = a.claimable
          ? `<button class="pbtn gold" data-ach="${a.id}">Nhận bậc ${a.claimed + 1}</button>`
          : a.claimed > 0 ? `<button class="pbtn" data-title="${a.id}">Đeo</button>` : `<span>${progTxt}</span>`;
        return `<div class="prow"><span class="pname">${mark} ${a.name}<span class="pdesc">${a.desc} · Bậc ${a.tier}/${a.tiers.length} · Tiến độ ${progTxt} · ${rewardTxt}</span></span>${btn}</div>`;
      }).join('');
      // GĐ139: mốc nhóm + thưởng mốc + chọn nhân đôi (mỗi nhóm 1 lựa chọn, vĩnh viễn).
      const ms = g.milestones || [];
      const reached = g.milestoneReached || 0;
      const boostable = (g.perks || []).some((pk) => !pk.parked);
      const milestoneLine = ms.length > 0
        ? `<div class="prow"><span class="pname">🎖️ Mốc nhóm: ${ms.map((m, i) => (i < reached ? `✅ ${m}` : `○ ${m}`)).join(' · ')} Đạo Tích<span class="pdesc">${g.complete ? '🏆 Đã hoàn thành nhóm — đã nhận 1 Rương Thành Tựu Thiên.' : ''}${g.boost ? ` · Đã nhân đôi thưởng mốc ${g.boost} vĩnh viễn.` : g.boostAvailable ? (boostable ? ' · 🎯 Có thể chọn nhân đôi 1 thưởng!' : ' · Nhóm này toàn thưởng chưa có cơ chế nên chưa chọn nhân đôi được.') : ''}</span></span></div>`
        : '';
      const perkRows = (g.perks || []).map((pk, i) => {
        const on = reached > i;
        const boosted = g.boost === i + 1;
        const btn = g.boostAvailable && !pk.parked
          ? `<button class="pbtn gold" data-boost="${g.id}:${i + 1}">Nhân đôi thưởng này</button>`
          : '';
        return `<div class="prow"><span class="pname">${on ? '✅' : '○'} Thưởng mốc ${i + 1}: ${pk.text}${boosted ? ' ×2 (đã nhân đôi)' : ''}${pk.parked ? ' <i>(chưa có cơ chế)</i>' : ''}<span class="pdesc">${on ? 'Đang áp dụng' : `Cần ${ms[i]} Đạo Tích nhóm`}${pk.why ? ` · ${pk.why}` : ''}</span></span>${btn}</div>`;
      }).join('');
      return `<div style="margin:8px 0 4px;font-weight:bold">${g.name} — ${g.daoTich}/${g.daoTichMax} Đạo Tích (${pct}%) · ${g.tiers}/${g.tiersMax} bậc</div>${milestoneLine}${perkRows}${rows}`;
    }).join('');
    // GĐ139: mốc Đạo Tích vĩnh viễn + danh hiệu Vô Thượng Đạo Tích (mốc 780).
    const daoHtml = (ach.daoMilestones || []).map((m) => {
      const daoBtn = m.active === 'title' && m.reached && ach.daoTitle && !ach.daoTitle.equipped
        ? `<button class="pbtn gold" data-daotitle>Đeo danh hiệu này</button>`
        : '';
      return `<div class="prow"><span class="pname">${m.reached ? '✅' : '○'} ${m.at} Đạo Tích: ${m.text}${m.active === 'title' && ach.daoTitle && ach.daoTitle.equipped ? ' (đang đeo)' : ''}<span class="pdesc">${m.why || ''}</span></span>${daoBtn}</div>`;
    }).join('');
    body.innerHTML = `<div class="prow"><span class="pname">🪙 Tổng Đạo Tích: <b>${ach.daoTich}</b><span class="pdesc">Danh hiệu đang đeo: ${titleTxt}</span></span>${ach.title ? '<button class="pbtn" data-title="">Tháo</button>' : ''}</div>${groupsHtml}<div style="margin:8px 0 4px;font-weight:bold">Mốc Đạo Tích vĩnh viễn</div>${daoHtml}`;
    body.querySelectorAll<HTMLButtonElement>('[data-ach]').forEach((b) => {
      b.onclick = () => this.socket.emit('claim_ach_tier', { achId: b.dataset.ach });
    });
    body.querySelectorAll<HTMLButtonElement>('[data-title]').forEach((b) => {
      b.onclick = () => this.socket.emit('ach_equip_title', { achId: b.dataset.title || null });
    });
    body.querySelectorAll<HTMLButtonElement>('[data-boost]').forEach((b) => {
      b.onclick = () => {
        const [groupId, perk] = (b.dataset.boost || '').split(':');
        this.socket.emit('ach_choose_boost', { groupId, perk: parseInt(perk, 10) });
      };
    });
    body.querySelectorAll<HTMLButtonElement>('[data-daotitle]').forEach((b) => {
      b.onclick = () => this.socket.emit('ach_equip_title', { daoTitle: true });
    });
  }

  // GĐ24: hộp thoại trò chuyện với NPC (lời thoại + thiện cảm + nhiệm vụ riêng)
  // GĐ59: vào một bản đồ — ẩn/hiện cảnh làng, dựng nền map mới, đặt biên camera
  // GĐ74: banner tên map chỉ hiện 2,5s khi vào map / đăng nhập (feedback 25/10).
  private zoneBannerTimer: number | null = null;
  private prevZoneSafe: boolean | undefined = undefined;
  private lastZoneStepAt = 0;
  private zoneStepTimer: number | null = null;
  private showZoneBanner(text: string, danger: boolean): void {
    const zb = document.getElementById('zoneBanner');
    if (!zb) return;
    zb.textContent = text;
    zb.classList.toggle('danger', danger);
    zb.classList.add('show');
    if (this.zoneBannerTimer) window.clearTimeout(this.zoneBannerTimer);
    this.zoneBannerTimer = window.setTimeout(() => zb.classList.remove('show'), 2500);
  }

  // GĐ125: hiệu ứng bước ra khỏi khu an toàn — màn tối nhanh + banner đỏ bãi quái
  private playZoneStepOut(): void {
    const now = Date.now();
    if (now - this.lastZoneStepAt < 3000) return; // chống spam khi đi dọc biên
    this.lastZoneStepAt = now;
    (window as unknown as { tttLastZoneStep?: number }).tttLastZoneStep = now;
    this.showZoneBanner('⚔ Bãi Săn Sói · Nguy hiểm', true);
    const f = document.getElementById('zoneStepFade');
    if (!f) return;
    f.classList.add('on');
    if (this.zoneStepTimer) window.clearTimeout(this.zoneStepTimer);
    this.zoneStepTimer = window.setTimeout(() => f.classList.remove('on'), 150);
  }

  // GĐ108: bộ sprite cho dân thành phố (xem vòng render trong onMapEnter).
  private cityNpcSpriteKey(n: { id: string; role: string }): string | null {
    const role = n.role || '';
    if (role.includes('Sứ Giả')) return 'envoy';
    if (role === 'Chủ Tiệm Đan') return 'shopdan';
    if (role === 'Chủ Tiệm Nguyên Liệu') return 'shopnl';
    if (role === 'Chủ Tiệm Thảo Dược') return 'villager-b'; // GĐ151: cùng bộ tạm với chủ tiệm làng (chờ sprite riêng)
    if (role.includes('Thương nhân') || role.includes('Thương Gia')) return 'merchant';
    if (role.startsWith('Trưởng') || role === 'Lão Tổ Về Hưu') return 'elder';
    const m = n.id.match(/(\d+)\s*$/);
    const idx = m ? Number(m[1]) : 0;
    return ['villager-a', 'villager-b', 'villager-c'][Math.abs(idx) % 3];
  }

  private onMapEnter(def: MapEnterData): void {
    // GĐ167: đổi map (không phải lần vào đầu) -> tiếng dịch chuyển + đổi mood nhạc theo loại map
    if (this.mapState && this.mapState.mapId !== def.mapId) sound.play('teleport');
    sound.setMapMood(def.category, !!(def.safe || def.isHome));
    this.mapState = def;
    this.dialogueState.clear(); // GĐ150: đổi map xóa lịch thoại cũ (container cũ đã hủy)
    for (const o of this.nhoZoneObjs.values()) { o.circle.destroy(); o.label.destroy(); } // GĐ105: đổi map xóa vòng Ý Cảnh cũ
    this.nhoZoneObjs.clear();
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
        const beacon = this.add.image(dl.x, dl.y, 'moonGlow').setTint(0xffd94d).setScale(1.6).setDepth(10000).setAlpha(0.9);
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
      const glow = this.add.image(s.x, s.y, 'moonGlow').setTint(0x6ff2d8).setScale(0.55).setDepth(10000).setAlpha(0.85);
      const tag = this.add.text(s.x, s.y - 26, '✦ Linh mạch', { fontSize: '11px', color: '#7df2dc' }).setOrigin(0.5, 0.5).setDepth(10000).setAlpha(0.9);
      this.spotObjects.push(glow, tag);
    }
    // GĐ85: đàn tế — quầng lửa + nhãn, hủy dấu cũ khi đổi map
    for (const o of this.altarObjects) o.destroy();
    this.altarObjects = [];
    if (def.altar) {
      const glow = this.add.image(def.altar.x, def.altar.y, 'moonGlow').setTint(0xff6a3d).setScale(0.55).setDepth(10000).setAlpha(0.85);
      const tag = this.add.text(def.altar.x, def.altar.y - 26, '🕯️ Đàn Tế', { fontSize: '11px', color: '#ffb08a' }).setOrigin(0.5, 0.5).setDepth(10000).setAlpha(0.9);
      this.altarObjects.push(glow, tag);
      this.proxLabels.push({ t: tag, x: def.altar.x, y: def.altar.y }); // GĐ174
    }
    // GĐ128: Trận Dịch Chuyển trên map GDD — quầng sáng + nhãn như đàn tế
    // (trước đây map GDD không vẽ gì ở cổng nên người chơi không tìm được;
    // map làng đã có dấu riêng trong homeObjects nên không vẽ thêm).
    for (const o of this.portalObjects) o.destroy();
    this.portalObjects = [];
    if (!isHome && def.portal) {
      const glow = this.add.image(def.portal.x, def.portal.y, 'moonGlow').setTint(0x57c98b).setScale(0.55).setDepth(10000).setAlpha(0.85);
      const tag = this.add.text(def.portal.x, def.portal.y - 26, '🌀 Trận Dịch Chuyển', { fontSize: '11px', color: '#a9e8c9' }).setOrigin(0.5, 0.5).setDepth(10000).setAlpha(0.9);
      this.portalObjects.push(glow, tag);
      this.proxLabels.push({ t: tag, x: def.portal.x, y: def.portal.y }); // GĐ174
    }
    (window as unknown as { tttPortalMarker?: boolean }).tttPortalMarker = !isHome && !!def.portal;
    // GĐ105: điểm đọc sách Văn Uyển — quầng sáng + nhãn, hủy dấu cũ khi đổi map
    for (const o of this.studyObjects) o.destroy();
    this.studyObjects = [];
    if (def.study) {
      const glow = this.add.image(def.study.x, def.study.y, 'moonGlow').setTint(0xffe9a8).setScale(0.55).setDepth(10000).setAlpha(0.85);
      const tag = this.add.text(def.study.x, def.study.y - 26, '📖 Tàng Kinh Các', { fontSize: '11px', color: '#ffe9a8' }).setOrigin(0.5, 0.5).setDepth(10000).setAlpha(0.9);
      this.studyObjects.push(glow, tag);
      this.proxLabels.push({ t: tag, x: def.study.x, y: def.study.y }); // GĐ174
    }
    // GĐ132: điểm tài nguyên — quầng sáng + nhãn (nhãn chỉ hiện khi gần, như NPC thành phố), hủy dấu cũ khi đổi map
    for (const o of this.nodeObjects) o.destroy();
    this.nodeObjects = [];
    this.nodeLabels = [];
    for (const n of def.nodes || []) {
      const isOre = n.kind === 'ore';
      const glow = this.add.image(n.x, n.y, 'moonGlow').setTint(isOre ? 0xc9b18a : 0x7ddb6a).setScale(0.45).setDepth(10000).setAlpha(0.8);
      const tag = this.add.text(n.x, n.y - 26, `${isOre ? '⛏️' : '🌿'} ${ITEM_INFO[n.itemId]?.name || n.itemId}`, { fontSize: '11px', color: isOre ? '#e8d5b0' : '#b8e8a0' }).setOrigin(0.5, 0.5).setDepth(10000).setAlpha(0.9);
      this.nodeObjects.push(glow, tag);
      this.nodeLabels.push({ label: tag, x: n.x, y: n.y });
    }
    // GĐ89: dân thành phố — sprite người + nhãn (chỉ NPC chức năng có nhãn),
    // hủy dấu cũ khi đổi map; dân thường không nhãn cho đỡ rối màn hình.
    // Nhãn chỉ hiện khi người chơi trong 260px (lưới quảng trường 95px mà
    // hiện hết nhãn thì chữ chồng nhau che map — lỗi thấy ở ảnh probe).
    for (const o of this.cityNpcObjects) o.destroy();
    this.cityNpcObjects = [];
    this.cityNpcById.clear(); // GĐ156
    this.cityNpcLabels = [];
    for (const n of def.npcs || []) {
      // GĐ108: dân thành phố dùng sprite PixelLab thay hình vẽ code — vai trò
      // rõ thì đúng bộ (Sứ Giả→envoy, Tiệm Đan→shopdan, Tiệm Nguyên Liệu→
      // shopnl, thương nhân→merchant, trưởng/lão→elder), còn lại xoay 3 bộ
      // villager theo số cuối id; thiếu texture thì lùi về vẽ code như cũ.
      const npcSet = this.cityNpcSpriteKey(n);
      const sprite = npcSet && this.textures.exists(`${npcSet}-idle-south`)
        ? this.add.sprite(0, 0, spriteTexKey(npcSet, 'down', 'idle')).setOrigin(0.5, HERO_ORIGIN_Y).setScale(HERO_SCALE)
        : this.add.sprite(0, 0, personTexKey(n.style, 'down', 'idle'))
          .setOrigin(PERSON_TEX.originX, PERSON_TEX.originY).setScale(PERSON_TEX.scale);
      const parts: Phaser.GameObjects.GameObject[] = [sprite];
      let funcLabel: Phaser.GameObjects.Text | null = null;
      if (n.kind === 'functional') {
        funcLabel = this.add.text(0, -66, `${n.name}\n${n.role}`, {
          fontFamily: 'Palatino, Georgia, serif', fontSize: '11px', color: '#dff5e6',
          align: 'center', stroke: '#0a1410', strokeThickness: 3,
        }).setOrigin(0.5, 1);
        parts.push(funcLabel);
      }
      const c = this.add.container(n.x, n.y, parts);
      (c as any).npcData = { id: n.id, name: n.name, role: n.role, kind: n.kind };
      c.setDepth(n.y);
      this.cityNpcObjects.push(c);
      this.cityNpcById.set(n.id, c); // GĐ156
      if (funcLabel) this.cityNpcLabels.push({ label: funcLabel, x: n.x, y: n.y, c }); // GĐ156: kèm thùng chứa để nhãn theo vị trí sống
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
    const canFly = (this.myChar?.realm === 'kd' || this.myChar?.realm === 'na' || this.myChar?.realm === 'ht' || this.myChar?.realm === 'ph'); // GĐ183: bỏ Vô Danh
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
    this.lastNpcDialogId = d.npcId; // GĐ89: nút Gia nhập mở lại đúng NPC vừa nói chuyện
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
    // GĐ161: Chủ Trại Ngự Thú — nút vào trại thú cưỡi
    if ((d as any).mountShop) {
      html += `<div class="prow"><span class="pname">🐴 Trại Thú Cưỡi<span class="pdesc">Mua thú · đặt thuần hóa hộ · mua trứng tự ấp — thú cưỡi mở từ Nguyên Anh</span></span><button class="pbtn gold" data-mountshop="1">Vào trại</button></div>`;
    }
    // GĐ131: sư phụ dạy nghề — hướng dẫn + nút bái sư
    if (d.masterInfo) {
      const m = d.masterInfo;
      html += `<div class="prow"><span class="pname">📖 Hướng dẫn nghề ${m.jobName}<span class="pdesc">${m.guide}</span></span></div>`;
      if (m.isApprentice) {
        html += `<div class="prow"><span class="pname">🙏 Bạn là đệ tử của ${d.name}<span class="pdesc">Chế tạo nghề ${m.jobName} dễ thành hơn đôi chút (+5%).</span></span></div>`;
      } else if (m.hasOtherJob) {
        html += `<div class="prow"><span class="pname">🙏 Bái sư<span class="pdesc">Bạn đã học nghề ${m.otherJobName} rồi — mỗi người chỉ theo 1 nghề.</span></span></div>`;
      } else {
        html += `<div class="prow"><span class="pname">🙏 Bái sư ${d.name}<span class="pdesc">${m.hasJob ? 'Trở thành đệ tử chính thức của sư phụ (mở bonus chế tạo +5%).' : `Học nghề ${m.jobName} và trở thành đệ tử.`}</span></span><button class="pbtn gold" data-master="${d.npcId}">Bái sư</button></div>`;
      }
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
      if (d.merchantInfo.rep !== undefined) {
        const disc = d.merchantInfo.repDiscount ?? 1;
        html += `<div class="prow"><span class="pname">🤝 Khách quen mức ${d.merchantInfo.rep}<span class="pdesc">${d.merchantInfo.rep >= 3 ? 'Được xem cả món thứ 4 trong kho. ' : 'Mua thêm để lên mức 3: xem được món thứ 4. '}${disc < 1 ? `Giảm ${Math.round((1 - disc) * 100)}% hôm nay.` : 'Mức 5 giảm 10%, mức 10 giảm 15%.'}</span></span></div>`;
      }
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
    // GĐ89: SỨ GIẢ TRỤ SỞ — gia nhập tông tại thành + chiêu tông + tiệm tông cho đệ tử
    const ev = d.envoySect;
    if (ev) {
      html += `<div class="prow"><span class="pname">🏯 ${ev.name}<span class="pdesc">${ev.sizeText} · Trụ sở tại đây · ${ev.needText}<br/>${ev.isMember ? 'Bạn là đệ tử tông này.' : ev.canJoin ? 'Bạn ĐỦ điều kiện gia nhập!' : `Còn thiếu: ${ev.missing.join('; ')}`}</span></span>${!ev.isMember && ev.canJoin ? `<button class="pbtn gold" data-join="${ev.id}">Gia nhập</button>` : ''}</div>`;
      if (ev.isMember) {
        html += `<div class="prow"><span class="pname">🏪 Tiệm Tông Môn + Kho Đan<span class="pdesc">Giá ưu đãi cho đệ tử — mua được ngay tại trụ sở</span></span><button class="pbtn" data-shop="tiem_tong_mon">Vào tiệm</button></div>`;
        html += `<div class="prow"><span class="pname">📜 Công pháp ${ev.name}<span class="pdesc">Công pháp riêng của tông — học tại Sứ Giả (kể cả trụ sở).</span></span></div>`;
        if (ev.skills) {
          if (!ev.skills.length) html += `<div class="prow"><span class="pname">— Tông này chưa có công pháp riêng —</span></div>`;
          for (const sk of ev.skills) {
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
    // GĐ161: mở panel Trại Thú Cưỡi (chế độ trại — hiện mục mua/thuần/ trứng)
    btns.querySelectorAll<HTMLButtonElement>('[data-mountshop]').forEach((b) => {
      b.onclick = () => { this.closePanels(); this.openMountPanel(true); };
    });
    // GĐ131: bái sư — bấm xong mở lại hộp thoại để xem trạng thái đệ tử mới
    btns.querySelectorAll<HTMLButtonElement>('[data-master]').forEach((b) => {
      b.onclick = () => { this.socket.emit('apprentice_master', { npcId: b.dataset.master }); setTimeout(() => this.socket.emit('talk_npc', { npcId: this.lastNpcDialogId || b.dataset.master }), 350); };
    });
    // GĐ30: các nút tông môn — bấm xong KHÔNG đóng hộp thoại (server trả lỗi/kết quả qua toast; mở lại hộp thoại để xem trạng thái mới)
    // GĐ89: mở lại đúng NPC vừa nói chuyện (làng = npc_sugia, thành = sứ giả trụ sở)
    btns.querySelectorAll<HTMLButtonElement>('[data-join]').forEach((b) => {
      b.onclick = () => { this.socket.emit('join_sect', { sectId: b.dataset.join }); setTimeout(() => this.socket.emit('talk_npc', { npcId: this.lastNpcDialogId || 'npc_sugia' }), 350); };
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
    else if (this.openPanel === 'forge') this.renderForge(); // GĐ119 bước 5
    else if (this.openPanel === 'mount') this.renderMountPanel(); // GĐ161
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
      if (info.cityName) continue; // GĐ90: nhiệm vụ thành phố nhận/trả qua hộp thoại Người Giao Nhiệm Vụ, không qua bảng
      if (info.gd127 || info.gd129 || info.gd130 || info.gd131 || info.gd132) continue; // GĐ127/GĐ129/GĐ130/GĐ131/GĐ132: nhiệm vụ mở rộng nhận/trả qua hộp thoại người giao, không qua bảng
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
    if (this.chatOpen) return; // GĐ168: đang gõ chat
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
    const tabItems = document.getElementById('invTabItems');
    const tabGear = document.getElementById('invTabGear');
    if (tabItems) tabItems.onclick = () => { this.invTab = 'items'; this.renderInv(); };
    if (tabGear) tabGear.onclick = () => { this.invTab = 'gear'; this.renderInv(); };
    const body = document.getElementById('invBody');
    const gearBody = document.getElementById('invGearBody');
    if (!body || !gearBody) return;
    body.style.display = this.invTab === 'items' ? 'block' : 'none';
    gearBody.style.display = this.invTab === 'gear' ? 'block' : 'none';
    if (this.invTab === 'gear') { this.renderGear(); return; }
    const entries = Object.entries(this.myChar.inventory).filter(([, n]) => n > 0);
    if (!entries.length) {
      body.innerHTML = '<div class="prow">Túi trống — hạ quái ngoài làng để nhặt Linh thạch và nguyên liệu.</div>';
      return;
    }
    body.innerHTML = entries
      .map(([itemId, n]) => {
        const usable = itemId === 'dan_hoi_nguyen' || itemId === 'dan_hoi_xuan' || itemId === 'sach_toa_thien'
          || itemId === 'phu_ho_than' || itemId === 'phu_tu_linh' || itemId === 'tran_ky' || itemId === 'banh_thit'
          || itemId === 'phu_don_tho' || itemId === 'phu_cuong_bao' || itemId === 'phu_kim_cang' || itemId === 'phu_dinh_than' || itemId === 'phu_loi_kich' // GĐ136: + 5 bùa
          || itemId === 'com_nam' || itemId === 'thit_nuong' || itemId === 'luong_kho'
          || itemId === 'nuoc_loc' || itemId === 'tra_thao_moc' || itemId === 'ruou_gao'
          || itemId === 'thit_ham_tam_bo' || itemId === 'canh_xuong_tam_bo'
          || itemId === 'lo_doc_ria_mau' || itemId === 'lo_doc_kich_thich' || itemId === 'khoi_loi'; // GĐ26; GĐ78: + đồ ăn thức uống; GĐ96: + món Tẩm bổ; GĐ98: + lọ độc; GĐ101: + Khôi Lõi
        return `<div class="prow"><span class="pname">${ITEM_INFO[itemId]?.name || itemId} ×${n}<span class="pdesc">${ITEM_INFO[itemId]?.desc || ''}</span></span>${usable ? `<button class="pbtn" data-use="${itemId}">Dùng</button>` : ''}</div>`;
      })
      .join('');
    body.querySelectorAll<HTMLButtonElement>('[data-use]').forEach((b) => {
      b.onclick = () => this.socket.emit('use_item', { itemId: b.dataset.use });
    });
  }

  // GĐ119: tab Trang bị trong Túi đồ.
  private renderGear(): void {
    if (!this.myChar) return;
    const body = document.getElementById('invGearBody');
    if (!body) return;
    const bag = this.myChar.gearBag || {};
    const gear = this.myChar.gear || {};
    const gs = this.myChar.gearStats;
    const statNames: Record<string, string> = { attack: 'Công', defense: 'Thủ', hp: 'Máu', mp: 'Nguyên', speed: 'Tốc', crit: 'Bạo' };
    const fmtStats = (s: Record<string, number>) => Object.entries(s).filter(([, v]) => v)
      .map(([k, v]) => `${statNames[k] || k} ${v > 0 ? '+' : ''}${k === 'crit' ? `${Math.round(v * 100)}%` : v}`).join(' · ');
    const fmtItem = (it: GearItem) => {
      const color = GEAR_RARITY_COLOR[it.rarity] || '#fff';
      const talents = it.talents.map((t) => t.kind === 'docnhat' ? `✦ ĐỘC NHẤT · ${t.name}: ${t.desc}` : `${t.name} ${t.bonusPct >= 0 ? '+' : ''}${Math.round(t.bonusPct * 100)}% ${statNames[t.stat] || t.stat}`).join(', '); // GĐ191: dòng độc nhất hiện mô tả riêng
      return `<b style="color:${color}">${it.name}</b><span class="pdesc">${GEAR_ELEMENT_NAME[it.element] || it.element} · ${GEAR_RARITY_NAME[it.rarity] || it.rarity}${fmtStats(it.baseStats) ? ` · ${fmtStats(it.baseStats)}` : ''}${talents ? ` · Nội tại: ${talents}` : ''}</span>`;
    };
    const statLine = gs
      ? `Cộng từ trang bị đang mặc: Công +${gs.attack} · Thủ +${gs.defense} · Máu +${gs.hp} · Nguyên +${gs.mp} · Tốc +${gs.speed} · Bạo +${Math.round(gs.crit * 100)}%`
      : 'Chưa mặc trang bị nào.';
    const slotsHtml = GEAR_SLOT_ORDER.map((slot) => {
      const it = gear[slot] ? bag[gear[slot]] : undefined;
      return `<div class="prow">${it ? gearIconHtml(it) : ''}<span class="pname">${GEAR_SLOT_NAME[slot]}: ${it ? fmtItem(it) : '<i>Trống</i>'}</span>${it ? `<button class="pbtn" data-unequip="${slot}">Tháo</button>` : ''}</div>`;
    }).join('');
    const worn = new Set(Object.values(gear));
    const items = Object.values(bag);
    const bagHtml = items.length ? items.map((it) => {
      const isWorn = worn.has(it.uid);
      const fee = GEAR_REROLL_FEE[it.rarity];
      return `<div class="prow">${gearIconHtml(it)}<span class="pname">${fmtItem(it)}</span>${isWorn ? '<i>Đang mặc</i>' : `<button class="pbtn" data-equip="${it.uid}">Mặc</button>`}${fee ? `<button class="pbtn" data-reroll="${it.uid}">Rèn lại (${fee} 💠)</button>` : ''}</div>`;
    }).join('') : '<div class="prow">Chưa có trang bị nào — rèn ở Tiệm Rèn, mua sẵn, hoặc nhặt từ rương/nhiệm vụ.</div>';
    body.innerHTML = `<div class="prow"><span class="pname">${statLine}</span></div><div class="note">Rèn lại nội tại chỉ dùng được khi đứng gần Thợ Rèn ở Làng Tân Thủ.</div><div class="note">Đang mặc:</div>${slotsHtml}<div class="note">Kho trang bị:</div>${bagHtml}`;
    body.querySelectorAll<HTMLButtonElement>('[data-equip]').forEach((b) => {
      b.onclick = () => this.socket.emit('gear_equip', { uid: b.dataset.equip });
    });
    body.querySelectorAll<HTMLButtonElement>('[data-unequip]').forEach((b) => {
      b.onclick = () => this.socket.emit('gear_unequip', { slot: b.dataset.unequip });
    });
    body.querySelectorAll<HTMLButtonElement>('[data-reroll]').forEach((b) => {
      b.onclick = () => this.socket.emit('gear_reroll', { uid: b.dataset.reroll });
    });
  }

  // GĐ161: panel Thú Cưỡi — chuồng của mình (lên lưng/xuống/phóng sinh,
  // nhận đơn thuần hóa hộ, cho trứng nở) + mục trại khi mở từ Chủ Trại.
  private openMountPanel(fromShop: boolean): void {
    if (!this.myChar) return;
    this.closePanels();
    this.openPanel = 'mount';
    this.mountShopMode = fromShop;
    const p = document.getElementById('mountPanel');
    if (p) p.style.display = 'block';
    this.renderMountPanel();
  }

  private renderMountPanel(): void {
    const mc: any = this.myChar;
    if (!mc) return;
    const body = document.getElementById('mountBody');
    if (!body) return;
    const mounts: any[] = mc.mounts || [];
    const srcName = (s: string) => (s === 'shop' ? 'mua ở trại' : s === 'tame' ? 'trại thuần hóa hộ' : 'nở từ trứng');
    let html = `<div class="prow" style="font-weight:bold">🐴 Thú của bạn (${mounts.length}/3)</div>`;
    if (!mounts.length) html += '<div class="prow">Chưa có con thú nào. Tới Trại Ngự Thú ở Ngự Thú Sơn Trang gặp Mã Vân nhé.</div>';
    for (const m of mounts) {
      const riding = mc.mountedUid === m.uid;
      html += `<div class="prow"><span class="pname">${m.name}<span class="pdesc">Tốc độ ×${m.speedMul} · ${srcName(m.source)}</span></span>${riding ? '<b>Đang cưỡi</b>' : ''}<button class="pbtn ${riding ? '' : 'gold'}" data-ride="${m.uid}">${riding ? 'Xuống thú' : 'Lên lưng'}</button><button class="pbtn" data-release="${m.uid}">Phóng sinh</button></div>`;
    }
    const comm = mc.mountComm;
    if (comm) {
      html += `<div class="prow"><span class="pname">🪢 Đơn thuần hóa hộ: ${MOUNT_SPECIES_NAME[comm.species] || comm.species}<span class="pdesc">${comm.ready ? 'Đã thuần xong — tới trại gặp Mã Vân để nhận!' : 'Đang thuần hóa… quay lại trại khi tới ngày hẹn.'}</span></span>${comm.ready && this.mountShopMode ? '<button class="pbtn gold" data-claim="1">Nhận thú</button>' : ''}</div>`;
    }
    const egg = mc.mountEgg;
    if (egg) {
      html += `<div class="prow"><span class="pname">🥚 Trứng Linh Thú đang ấp<span class="pdesc">${egg.ready ? 'Trứng rung rung — sắp nở rồi!' : 'Chưa nở — chờ sang ngày game sau.'}</span></span>${egg.ready ? '<button class="pbtn gold" data-hatch="1">Cho nở</button>' : ''}</div>`;
    }
    if (this.mountShopMode) {
      html += `<div class="prow" style="font-weight:bold">🏕️ Mua thẳng ở trại (có ngay, tốc độ chuẩn)</div>`;
      for (const s of MOUNT_SHOP_CLIENT) {
        html += `<div class="prow"><span class="pname">${s.name}<span class="pdesc">Tốc độ ×${s.speed} · ${s.price.toLocaleString('vi-VN')} linh thạch</span></span><button class="pbtn gold" data-mbuy="${s.species}">Mua</button></div>`;
      }
      html += `<div class="prow" style="font-weight:bold">🪢 Đặt thuần hóa hộ (rẻ hơn, chờ ngày game, tốc độ hên xui ±10%)</div>`;
      for (const s of MOUNT_TAME_CLIENT) {
        html += `<div class="prow"><span class="pname">${s.name}<span class="pdesc">Tốc độ chuẩn ×${s.speed} · phí ${s.fee.toLocaleString('vi-VN')} linh thạch · chờ ${s.days} ngày game</span></span><button class="pbtn" data-mtame="${s.species}" ${comm ? 'disabled' : ''}>Đặt thuần</button></div>`;
      }
      html += `<div class="prow" style="font-weight:bold">🥚 Trứng Linh Thú (rẻ nhất, hên xui nhất)</div>`;
      html += `<div class="prow"><span class="pname">Trứng Linh Thú<span class="pdesc">5.000 linh thạch · ấp 1 ngày game mới nở. Có thể ra loài hiếm… cũng có con không thuần hóa được, bỏ chạy mất.</span></span><button class="pbtn" data-meggb="1">Mua trứng</button></div>`;
    } else {
      html += '<div class="prow">Muốn mua thêm thú: tới Trại Ngự Thú ở <b>Ngự Thú Sơn Trang</b>, gặp Mã Vân (Chủ Trại).</div>';
    }
    body.innerHTML = html;
    body.querySelectorAll<HTMLButtonElement>('[data-ride]').forEach((b) => { b.onclick = () => this.socket.emit('mount_ride', { uid: b.dataset.ride }); });
    body.querySelectorAll<HTMLButtonElement>('[data-release]').forEach((b) => {
      b.onclick = () => {
        if (!b.dataset.armed) { b.dataset.armed = '1'; b.textContent = 'Chắc chắn phóng sinh?'; return; }
        this.socket.emit('mount_release', { uid: b.dataset.release });
      };
    });
    body.querySelectorAll<HTMLButtonElement>('[data-mbuy]').forEach((b) => { b.onclick = () => this.socket.emit('mount_buy', { species: b.dataset.mbuy }); });
    body.querySelectorAll<HTMLButtonElement>('[data-mtame]').forEach((b) => { b.onclick = () => this.socket.emit('mount_commission', { species: b.dataset.mtame }); });
    body.querySelectorAll<HTMLButtonElement>('[data-meggb]').forEach((b) => { b.onclick = () => this.socket.emit('mount_egg_buy', {}); });
    body.querySelectorAll<HTMLButtonElement>('[data-claim]').forEach((b) => { b.onclick = () => this.socket.emit('mount_claim', {}); });
    body.querySelectorAll<HTMLButtonElement>('[data-hatch]').forEach((b) => { b.onclick = () => this.socket.emit('mount_hatch', {}); });
  }

  // GĐ119 bước 5: panel Tiệm Rèn — mua sẵn theo ngày + đặt rèn theo thiết kế + nhận đơn chờ.
  private openForge(): void {
    if (!this.myChar) return;
    this.closePanels();
    this.openPanel = 'forge';
    const p = document.getElementById('forgePanel');
    if (p) p.style.display = 'block';
    this.socket.emit('gear_meta');
    this.socket.emit('gear_shop_stock');
    this.renderForge();
  }

  private renderForge(): void {
    if (!this.myChar) return;
    const body = document.getElementById('forgeBody');
    if (!body) return;
    const meta = this.forgeMeta;
    const stock = this.forgeStock;
    if (!meta || !stock) {
      body.innerHTML = '<div class="prow">Đang tải kho Tiệm Rèn…</div>';
      return;
    }
    const fmtItem = (it: { name: string; element: string; rarity: string }) => {
      const color = GEAR_RARITY_COLOR[it.rarity] || '#fff';
      return `<b style="color:${color}">${it.name}</b><span class="pdesc">${meta.elements[it.element] || it.element} · ${meta.rarities[it.rarity]?.name || it.rarity}</span>`;
    };
    const stockHtml = stock.map((s) => `<div class="prow">${gearIconHtml(s)}<span class="pname">${fmtItem(s)}<span class="pdesc">${s.price} 💠</span></span>${s.sold ? '<i>Đã mua</i>' : `<button class="pbtn" data-buy="${s.index}">Mua</button>`}</div>`).join('');
    // Form đặt rèn — mặc định theo hướng/hệ của người chơi, server kiểm tra thật khi đặt.
    const classToPath: Record<string, string> = { thetu: 'THE_TU', phattu: 'PHAT_TU', cottu: 'COT_TU', satthu: 'SAT_THU', kiemtu: 'KIEM_TU', phaptu: 'PHAP_TU', quytu: 'QUY_TU', ytu: 'Y_TU', nhotu: 'NHO_TU' };
    const myPath = classToPath[this.myChar.classId] || 'THE_TU';
    const mainVn = this.myChar.linhCan?.main || '';
    const myElement = Object.entries(meta.elements).find(([, vn]) => vn === mainVn)?.[0] || 'VO';
    const orders = this.myChar.gearOrders || [];
    const ordersHtml = orders.length ? orders.map((o) => `<div class="prow">${gearIconHtml(o)}<span class="pname">${meta.rarities[o.rarity]?.name || o.rarity} · ${meta.elements[o.element] || o.element} · ${GEAR_SLOT_NAME[o.slot] || o.slot}<span class="pdesc">Đang rèn — bấm Nhận khi tới ngày (server báo còn bao nhiêu ngày nếu chưa tới).</span></span><button class="pbtn" data-claim="${o.id}">Nhận</button></div>`).join('')
      : '<div class="prow">Chưa có đơn rèn nào.</div>';
    body.innerHTML = `<div class="note">💠 Linh thạch: ${this.myChar.stones} — Thợ rèn nhận tối đa 3 đơn cùng lúc (đang có ${orders.length}/3).</div>`
      + `<div class="note">Kho bán sẵn (đổi mỗi ngày trong game):</div>${stockHtml}`
      + `<div class="note">Đặt rèn theo thiết kế của bạn:</div>`
      + `<div class="prow"><span class="pname">Hướng tu <select id="forgePath">${meta.paths.map((p) => `<option value="${p}"${p === myPath ? ' selected' : ''}>${meta.pathNames[p] || p}</option>`).join('')}</select> `
      + `Hệ <select id="forgeElement">${Object.entries(meta.elements).map(([id, vn]) => `<option value="${id}"${id === myElement ? ' selected' : ''}>${vn}</option>`).join('')}</select> `
      + `Phẩm <select id="forgeRarity">${Object.entries(meta.rarities).map(([id, r]) => `<option value="${id}">${r.name}</option>`).join('')}</select> `
      + `Ô <select id="forgeSlot">${meta.slots.map((s) => `<option value="${s}">${GEAR_SLOT_NAME[s] || s}</option>`).join('')}</select></span></div>`
      + `<div class="prow" id="forgeWeaponRow"><span class="pname">Vũ khí <select id="forgeWeapon"></select></span></div>`
      + `<div class="prow" id="forgeTokenRow" style="display:none"><span class="pname">Hạng lệnh bài <select id="forgeTokenRank">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map((r) => `<option value="${r}">${r === 1 ? 'Nhất phẩm' : r === 2 ? 'Nhị phẩm' : r === 3 ? 'Tam phẩm' : r === 4 ? 'Tứ phẩm' : r === 5 ? 'Ngũ phẩm' : r === 6 ? 'Lục phẩm' : r === 7 ? 'Thất phẩm' : r === 8 ? 'Bát phẩm' : 'Cửu phẩm'}</option>`).join('')}</select></span></div>`
      + `<div class="prow"><span class="pname" id="forgeCost"></span><button class="pbtn" id="forgeOrderBtn" type="button">Đặt rèn</button></div>`
      + `<div class="note">Đơn đang rèn:</div>${ordersHtml}`;
    const pathSel = document.getElementById('forgePath') as HTMLSelectElement | null;
    const slotSel = document.getElementById('forgeSlot') as HTMLSelectElement | null;
    const raritySel = document.getElementById('forgeRarity') as HTMLSelectElement | null;
    const weaponSel = document.getElementById('forgeWeapon') as HTMLSelectElement | null;
    const tokenSel = document.getElementById('forgeTokenRank') as HTMLSelectElement | null;
    const weaponRow = document.getElementById('forgeWeaponRow');
    const tokenRow = document.getElementById('forgeTokenRow');
    const costEl = document.getElementById('forgeCost');
    const refreshForm = () => {
      if (!pathSel || !slotSel || !raritySel || !weaponSel || !costEl) return;
      const path = pathSel.value;
      weaponSel.innerHTML = (meta.weapons[path] || []).map((w) => `<option value="${w.id}">${w.name}</option>`).join('');
      if (weaponRow) weaponRow.style.display = slotSel.value === 'WEAPON' ? 'block' : 'none';
      if (tokenRow) tokenRow.style.display = slotSel.value === 'TOKEN' ? 'block' : 'none';
      const mats = meta.forgeMaterials[raritySel.value] || {};
      const matText = Object.entries(mats).map(([id, n]) => `${ITEM_INFO[id]?.name || id} ×${n} (đang có ${this.myChar?.inventory[id] || 0})`).join(', ');
      costEl.textContent = `Cần: ${matText || 'không cần nguyên liệu'} — chờ ${meta.forgeDays[raritySel.value] ?? '?'} ngày trong game.`;
    };
    if (pathSel) pathSel.onchange = refreshForm;
    if (slotSel) slotSel.onchange = refreshForm;
    if (raritySel) raritySel.onchange = refreshForm;
    refreshForm();
    const orderBtn = document.getElementById('forgeOrderBtn');
    if (orderBtn) orderBtn.onclick = () => {
      if (!pathSel || !slotSel || !raritySel) return;
      const el = (document.getElementById('forgeElement') as HTMLSelectElement | null)?.value || 'VO';
      this.socket.emit('gear_order', {
        path: pathSel.value, element: el, rarity: raritySel.value, slot: slotSel.value,
        weapon: slotSel.value === 'WEAPON' ? weaponSel?.value : undefined,
        tokenRank: slotSel.value === 'TOKEN' ? Number(tokenSel?.value || 1) : undefined,
      });
    };
    body.querySelectorAll<HTMLButtonElement>('[data-buy]').forEach((b) => {
      b.onclick = () => this.socket.emit('gear_shop_buy', { index: Number(b.dataset.buy), dayIndex: this.forgeDay });
    });
    body.querySelectorAll<HTMLButtonElement>('[data-claim]').forEach((b) => {
      b.onclick = () => this.socket.emit('gear_claim', { orderId: b.dataset.claim });
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
    // GĐ95: thanh Nộ Khí — chỉ Thể Tu thấy (kể cả Kim Đan, vì cơ chế lớp không theo cảnh giới).
    const rageEl = document.getElementById('hudRage');
    const isThetu = p.classId === 'thetu';
    if (rageEl) rageEl.style.display = isThetu ? 'block' : 'none';
    if (isThetu) {
      const rf = document.getElementById('hudRageFill') as HTMLElement | null;
      const rt = document.getElementById('hudRageText');
      const rage = p.rage ?? 0;
      if (rf) rf.style.width = `${Math.max(0, Math.min(100, rage))}%`;
      if (rt) rt.textContent = p.unyield ? `🔥 Nộ Khí ${rage}/100 ✦ Bất khuất!` : `🔥 Nộ Khí ${rage}/100`;
    }
    // GĐ97: thanh Sát Khí Ảnh Tu — cùng vị trí/kiểu với thanh Nộ, chỉ Ảnh Tu thấy.
    const satEl = document.getElementById('hudSatKhi');
    const isSatthu = p.classId === 'satthu';
    if (satEl) satEl.style.display = isSatthu ? 'block' : 'none';
    if (isSatthu) {
      const sf = document.getElementById('hudSatKhiFill') as HTMLElement | null;
      const st = document.getElementById('hudSatKhiText');
      const sat = p.satKhi ?? 0;
      if (sf) sf.style.width = `${Math.max(0, Math.min(100, sat))}%`;
      if (st) st.textContent = p.ult ? `🗡️ Sát Khí ${sat}/100 ✦ Siêu Giác Quan!` : `🗡️ Sát Khí ${sat}/100`;
    }
    // GĐ99: thanh Ngộ Kiếm Kiếm Tu — cùng vị trí/kiểu với thanh Nộ/Sát Khí, chỉ Kiếm Tu thấy.
    const ngoEl = document.getElementById('hudNgoKiem');
    const isKiemtu = p.classId === 'kiemtu';
    if (ngoEl) ngoEl.style.display = isKiemtu ? 'block' : 'none';
    if (isKiemtu) {
      const nf = document.getElementById('hudNgoKiemFill') as HTMLElement | null;
      const nt = document.getElementById('hudNgoKiemText');
      const nk = p.ngoKiem ?? 0;
      const swName = p.sword ? (SWORD_INFO[p.sword]?.name || p.sword) : 'Chưa rèn kiếm';
      if (nf) nf.style.width = `${Math.max(0, Math.min(100, nk))}%`;
      if (nt) nt.textContent = `⚔️ Ngộ Kiếm ${nk}/100 · ${swName}` + (p.kiemUlt ? ' ✦ Nhân Kiếm Hợp Nhất!' : '') + (p.kiemVuc ? ' ✦ Kiếm Vực!' : '');
    }
    // GĐ99: nút kích Ultimate — chỉ hiện khi Kiếm Tu đã đầy Ngộ Kiếm và ult chưa bật.
    const ultBtn = document.getElementById('btnKiemUlt') as HTMLButtonElement | null;
    if (ultBtn) {
      ultBtn.style.display = isKiemtu && (p.ngoKiem ?? 0) >= 100 && !p.kiemUlt ? 'block' : 'none';
      if (!ultBtn.dataset.bound) {
        ultBtn.dataset.bound = '1';
        ultBtn.onclick = () => this.socket.emit('kiem_ult');
      }
    }
    // GĐ101: dòng Cốt Vương — chỉ hiện khi chủ có pet đang hoạt động (petHp từ tick).
    // GĐ137: thú thuần hóa hiện tên thật của thú + nút Thả về rừng.
    const petEl = document.getElementById('hudPet');
    if (petEl) {
      const petHp = p.petHp ?? null;
      petEl.style.display = petHp ? 'block' : 'none';
      if (petHp) {
        const pf = document.getElementById('hudPetFill') as HTMLElement | null;
        const pt = document.getElementById('hudPetText');
        const [a, b] = petHp.split('/').map(Number);
        if (pf && b > 0) pf.style.width = `${Math.max(0, Math.min(100, (a / b) * 100))}%`;
        if (pt) pt.textContent = p.petIsTamed ? `🐾 ${p.petName || 'Thú thuần hóa'}: ${petHp}` : p.classId === 'quytu' ? `👻 Quỷ Hồn: ${petHp}` : `🦴 Cốt Vương: ${petHp}`;
      }
      const relBtn = document.getElementById('hudPetRelease') as HTMLButtonElement | null;
      if (relBtn) {
        relBtn.style.display = p.petIsTamed ? 'inline-block' : 'none';
        if (!relBtn.dataset.bound) {
          relBtn.dataset.bound = '1';
          relBtn.onclick = () => this.socket.emit('tame_release');
        }
      }
    }
    // GĐ133: dòng buff đan dược — chỉ hiện khi có buff đang còn hạn, ghi phút còn lại.
    // (updateHudBars nhận tick entry nên KHÔNG có buffs — đọc từ myChar (welcome/sync) mới đúng.)
    const buffEl = document.getElementById('hudBuff');
    const buffs = this.myChar?.buffs || [];
    if (buffEl) {
      buffEl.style.display = buffs.length ? 'block' : 'none';
      if (buffs.length) {
        const bt = document.getElementById('hudBuffText');
        if (bt) bt.textContent = buffs.map((b) => {
          const mins = Math.max(0, Math.ceil((b.until - Date.now()) / 60000));
          return `${b.icon} ${b.name} ${mins}p`;
        }).join(' · ');
      }
    }
    // GĐ102: thanh Hồn Khí Quỷ Tu — cùng kiểu thanh Sát/Ngộ, chỉ Quỷ Tu thấy.
    const honEl = document.getElementById('hudHonKhi');
    const isQuytu = p.classId === 'quytu';
    if (honEl) honEl.style.display = isQuytu ? 'block' : 'none';
    if (isQuytu) {
      const hf = document.getElementById('hudHonKhiFill') as HTMLElement | null;
      const ht = document.getElementById('hudHonKhiText');
      const hk = p.honKhi ?? 0;
      if (hf) hf.style.width = `${Math.max(0, Math.min(100, hk))}%`;
      if (ht) ht.textContent = `👻 Hồn Khí ${hk}/100`;
    }
    // GĐ102: nút triệu hồi Quỷ Hồn — chỉ hiện khi đủ 100 Hồn Khí và chưa có pet.
    const quyBtn = document.getElementById('btnQuySummon') as HTMLButtonElement | null;
    if (quyBtn) {
      quyBtn.style.display = isQuytu && (p.honKhi ?? 0) >= 100 && !p.petHp ? 'block' : 'none';
      if (!quyBtn.dataset.bound) {
        quyBtn.dataset.bound = '1';
        quyBtn.onclick = () => this.socket.emit('quy_summon');
      }
    }
    // GĐ137: nút Thuần Hóa — chỉ hiện cho Thú Sư khi có thú yếu (<50% máu)
    // trong 80px và chưa có thú thuần hóa (server kiểm tra lại mọi cổng).
    const tameBtn = document.getElementById('btnTame') as HTMLButtonElement | null;
    if (tameBtn) {
      tameBtn.style.display = (this.myChar?.job?.jobId === 'thusu' || this.myChar?.job2?.jobId === 'thusu' || (this.myChar as any)?.job3?.jobId === 'thusu') && !!this.tameTargetId && !p.petIsTamed ? 'block' : 'none'; // nghề lấy từ char_sync (tick không có job — đọc p.job như cũ là nút không bao giờ hiện); GĐ160: cả nghề thứ ba
      if (!tameBtn.dataset.bound) {
        tameBtn.dataset.bound = '1';
        tameBtn.onclick = () => { if (this.tameTargetId) this.socket.emit('tame_beast', { monsterId: this.tameTargetId }); };
      }
    }
    // GĐ103: dòng Công Đức + Tầng Thức Phật Tu + trạng thái Thuyết Pháp.
    const phatEl = document.getElementById('hudPhat');
    const isPhattu = p.classId === 'phattu';
    if (phatEl) phatEl.style.display = isPhattu ? 'block' : 'none';
    if (isPhattu) {
      const pt = document.getElementById('hudPhatText');
      const tiers = ['Chưa nhập môn', 'Cư Sĩ Quy Y', 'Sa Di', 'La Hán', 'Bồ Tát', 'Kiếp Môn Thành Phật']; // GĐ104: sửa tên 2 bậc đầu theo nghiên cứu Phật giáo
      if (pt) pt.textContent = `☸ Công Đức: ${p.congDuc ?? 0} · Tầng: ${tiers[p.phatTier ?? 0] || 'Chưa nhập môn'}${p.preaching ? ' · 📿 Đang Thuyết Pháp' : ''}`;
    }
    // GĐ103: nút Phật Quang (luôn hiện cho Phật Tu) + nút Thuyết Pháp (bật/tắt).
    const pqBtn = document.getElementById('btnPhatQuang') as HTMLButtonElement | null;
    if (pqBtn) {
      pqBtn.style.display = isPhattu ? 'block' : 'none';
      if (!pqBtn.dataset.bound) {
        pqBtn.dataset.bound = '1';
        pqBtn.onclick = () => this.socket.emit('phat_quang');
      }
    }
    const tpBtn = document.getElementById('btnThuyetPhap') as HTMLButtonElement | null;
    if (tpBtn) {
      tpBtn.style.display = isPhattu ? 'block' : 'none';
      if (!tpBtn.dataset.bound) {
        tpBtn.dataset.bound = '1';
        tpBtn.onclick = () => this.socket.emit('thuyet_phap');
      }
    }
    // GĐ155: nút Siêu Độ — kỹ năng riêng dùng cho mọi đối tượng gần nhất.
    const sdBtn = document.getElementById('btnSieuDo') as HTMLButtonElement | null;
    if (sdBtn) {
      sdBtn.style.display = isPhattu ? 'block' : 'none';
      if (!sdBtn.dataset.bound) {
        sdBtn.dataset.bound = '1';
        sdBtn.onclick = () => this.socket.emit('sieu_do');
      }
    }
    // GĐ143: nút kỹ năng phe (hiện khi đang đeo Lệnh Bài phe)
    const fsBtn = document.getElementById('btnFactionSkill') as HTMLButtonElement | null;
    if (fsBtn) {
      const tokUid = (p as any).gear?.TOKEN;
      const tok = tokUid ? (p as any).gearBag?.[tokUid] : null;
      const fside = tok?.faction;
      fsBtn.style.display = fside ? 'block' : 'none';
      if (fside) fsBtn.textContent = fside === 'tien' ? '✦ Tiên Quang' : '✦ Ma Diệm';
      if (!fsBtn.dataset.bound) { fsBtn.dataset.bound = '1'; fsBtn.onclick = () => this.socket.emit('faction_skill'); }
    }
    // GĐ104: lớp phủ gục ngã — hiện khi chính mình đang gục ngã.
    // GĐ128: linh thể đi lại được + báo trước 5s trước khi tự hồi sinh.
    const dnEl = document.getElementById('downedOverlay');
    if (dnEl) {
      const isDowned = (p.downed ?? 0) === 1;
      dnEl.style.display = isDowned ? 'block' : 'none';
      if (isDowned) {
        const dt = document.getElementById('downedOverlayText');
        if (dt) dt.textContent = `👻 Linh thể — đi lại được, chờ đồng đội hồi sinh (${p.downedLeft ?? 0}s, hết giờ sẽ về làng)`;
        if ((p.downedLeft ?? 99) <= 5 && !this.downedWarned5) {
          this.downedWarned5 = true;
          this.showToast('⏳ Còn 5 giây nữa sẽ tự hồi sinh tại làng!');
        }
      } else {
        this.downedWarned5 = false;
      }
    }
    // GĐ104: dòng Y Đức + nút Bổ Khí Huyết / Cố Bản Bồi Nguyên / Hồi Dương Cứu Nghịch.
    const yEl = document.getElementById('hudYDuc');
    const isYtu = p.classId === 'ytu';
    if (yEl) yEl.style.display = isYtu ? 'block' : 'none';
    if (isYtu) {
      const yt = document.getElementById('hudYDucText');
      if (yt) yt.textContent = `💚 Y Đức: ${p.yDuc ?? 0}${(p.yGift ?? 0) ? ' · ❤️ Cố Bản đã mở' : ''}${(p.yRevive ?? 0) ? ' · 💚 Hồi Dương đã mở' : ''}`;
    }
    const yhBtn = document.getElementById('btnYHeal') as HTMLButtonElement | null;
    if (yhBtn) {
      yhBtn.style.display = isYtu ? 'block' : 'none';
      if (!yhBtn.dataset.bound) {
        yhBtn.dataset.bound = '1';
        yhBtn.onclick = () => this.socket.emit('y_heal');
      }
    }
    const ygBtn = document.getElementById('btnYGiftHp') as HTMLButtonElement | null;
    if (ygBtn) {
      ygBtn.style.display = isYtu && (p.yGift ?? 0) ? 'block' : 'none';
      if (!ygBtn.dataset.bound) {
        ygBtn.dataset.bound = '1';
        ygBtn.onclick = () => this.socket.emit('y_gift_hp');
      }
    }
    const yrBtn = document.getElementById('btnYRevive') as HTMLButtonElement | null;
    if (yrBtn) {
      yrBtn.style.display = isYtu && (p.yRevive ?? 0) ? 'block' : 'none';
      if (!yrBtn.dataset.bound) {
        yrBtn.dataset.bound = '1';
        yrBtn.onclick = () => this.socket.emit('y_revive');
      }
    }

    // GĐ105: dòng Hạo Nhiên + nút Đọc sách / 4 nút Ý Cảnh.
    const nhoEl = document.getElementById('hudNho');
    const isNhotu = p.classId === 'nhotu';
    if (nhoEl) nhoEl.style.display = isNhotu ? 'block' : 'none';
    if (isNhotu) {
      const nt = document.getElementById('hudNhoText');
      const chs = (p.nhoChuong || '1').split(',').filter(Boolean);
      if (nt) nt.textContent = `📖 Hạo Nhiên: ${p.haoNhien ?? 0}/100 · 📚 Đã đọc: ${p.nhoStudy ?? 0}s · Chương: ${chs.join(',')}${(p.studying ?? 0) ? ' · 📖 Đang đọc sách' : ''}`;
    }
    const nsBtn = document.getElementById('btnNhoStudy') as HTMLButtonElement | null;
    if (nsBtn) {
      nsBtn.style.display = isNhotu ? 'block' : 'none';
      if (!nsBtn.dataset.bound) {
        nsBtn.dataset.bound = '1';
        nsBtn.onclick = () => this.socket.emit('nho_study');
      }
    }
    for (let c = 1; c <= 4; c++) {
      const zb = document.getElementById(`btnNhoZone${c}`) as HTMLButtonElement | null;
      if (!zb) continue;
      const unlocked = (p.nhoChuong || '1').split(',').includes(String(c));
      zb.style.display = isNhotu && unlocked ? 'block' : 'none';
      if (!zb.dataset.bound) {
        zb.dataset.bound = '1';
        const cc = c;
        zb.onclick = () => this.socket.emit('nho_zone', { chuong: cc });
      }
    }
  }


  // GĐ105: vòng Ý Cảnh — 1 vòng/người chơi có vùng đang mở; hủy khi hết vùng hoặc người rời map.
  private nhoZoneObjs = new Map<string, { circle: Phaser.GameObjects.Arc; label: Phaser.GameObjects.Text }>();
  private syncNhoZones(players: PlayerState[]): void {
    const seen = new Set<string>();
    const colors: Record<number, number> = { 1: 0x86efac, 2: 0xf2d24b, 3: 0xa678d8, 4: 0x7fd1e8 };
    const names: Record<number, string> = { 1: 'Thanh Tuyền Thạch Thượng', 2: 'Nghĩa Bạc Vân Thiên', 3: 'Ngôn Xuất Pháp Tùy', 4: 'Liễu Ti Vạn Lũ' };
    for (const pl of players) {
      const cz = pl.nhoZoneChuong || 0;
      if (!cz) continue;
      seen.add(pl.id);
      const x = pl.nhoZoneX || 0; const y = pl.nhoZoneY || 0;
      let o = this.nhoZoneObjs.get(pl.id);
      if (!o) {
        const circle = this.add.circle(x, y, 200).setStrokeStyle(3, colors[cz] || 0xffffff).setFillStyle(colors[cz] || 0xffffff, 0.08).setDepth(9999);
        const label = this.add.text(x, y - 206, `📖 ${names[cz] || ''}`, { fontSize: '11px', color: '#ffffff' }).setOrigin(0.5, 0.5).setDepth(10000).setAlpha(0.9);
        o = { circle, label };
        this.nhoZoneObjs.set(pl.id, o);
      }
      o.circle.setPosition(x, y).setStrokeStyle(3, colors[cz] || 0xffffff).setFillStyle(colors[cz] || 0xffffff, 0.08);
      o.label.setPosition(x, y - 206).setText(`📖 ${names[cz] || ''}`);
    }
    for (const [id, o] of this.nhoZoneObjs) {
      if (!seen.has(id)) { o.circle.destroy(); o.label.destroy(); this.nhoZoneObjs.delete(id); }
    }
  }

  // GĐ135: vòng trận pháp — mirror syncNhoZones, 1 vòng/loại/người chơi có trận đang mở.
  private tranArrayObjs = new Map<string, { circle: Phaser.GameObjects.Arc; label: Phaser.GameObjects.Text }>();
  private syncTranArrays(players: PlayerState[]): void {
    const seen = new Set<string>();
    const defs = [
      { key: 'buff', flag: 'tranBuff', x: 'tranBuffX', y: 'tranBuffY', r: 200, color: 0xf2d24b, icon: '⚔️', name: 'Trận Cường Công' },
      { key: 'debuff', flag: 'tranDebuff', x: 'tranDebuffX', y: 'tranDebuffY', r: 200, color: 0xa678d8, icon: '🟣', name: 'Trận Suy Nhược' },
      { key: 'seal', flag: 'tranSeal', x: 'tranSealX', y: 'tranSealY', r: 150, color: 0xef4444, icon: '🔒', name: 'Cấm Chế Trận' },
      { key: 'teleport', flag: 'tranTeleport', x: 'tranTeleportX', y: 'tranTeleportY', r: 24, color: 0x22d3ee, icon: '🌀', name: 'Trận Dịch Chuyển' },
    ] as const;
    for (const pl of players) {
      for (const d of defs) {
        if (!(pl as unknown as Record<string, number>)[d.flag]) continue;
        const id = `${pl.id}:${d.key}`;
        seen.add(id);
        const x = (pl as unknown as Record<string, number>)[d.x] || 0;
        const y = (pl as unknown as Record<string, number>)[d.y] || 0;
        let o = this.tranArrayObjs.get(id);
        if (!o) {
          const circle = this.add.circle(x, y, d.r).setStrokeStyle(3, d.color).setFillStyle(d.color, 0.08).setDepth(9999);
          const label = this.add.text(x, y - d.r - 6, `${d.icon} ${d.name}`, { fontSize: '11px', color: '#ffffff' }).setOrigin(0.5, 0.5).setDepth(10000).setAlpha(0.9);
          o = { circle, label };
          this.tranArrayObjs.set(id, o);
        }
        o.circle.setPosition(x, y).setStrokeStyle(3, d.color).setFillStyle(d.color, 0.08);
        o.label.setPosition(x, y - d.r - 6).setText(`${d.icon} ${d.name}`);
      }
    }
    for (const [id, o] of this.tranArrayObjs) {
      if (!seen.has(id)) { o.circle.destroy(); o.label.destroy(); this.tranArrayObjs.delete(id); }
    }
  }

  // ---------------- Đồng bộ quái vật ----------------
  private syncMonsters(monsters: MonsterState[]): void {
    const seen = new Set<string>();
    this.tameTargetId = null; // GĐ137: tính lại thú yếu gần nhất mỗi tick
    this.tameTargetDist = null;

    for (const m of monsters) {
      seen.add(m.id);
      // GĐ137: thú yếu gần nhất (trong 80px, dưới 50% máu, không ẩn/không thử thách) → nút Thuần Hóa.
      if (this.myContainer && !m.hidden && !m.trial && m.hp > 0 && m.maxHp > 0 && m.hp < m.maxHp * 0.5) {
        const dd = Math.hypot(m.x - this.myContainer.x, m.y - this.myContainer.y);
        if (dd <= 80 && (this.tameTargetDist === null || dd < this.tameTargetDist)) { this.tameTargetId = m.id; this.tameTargetDist = dd; }
      }
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
        // GĐ171: vòng đỏ báo trước trên mặt đất khi quái vận chiêu diện rộng
        if (stNow === 'windup' && !actor.teleRing && (m.aoeR || 0) > 0) {
          actor.teleRing = this.add.circle(actor.container.x, actor.container.y, (m.aoeR || 46) * 0.4)
            .setStrokeStyle(2, 0xff5040, 0.9).setFillStyle(0xff5040, 0.13).setDepth(actor.container.y - 2);
        } else if (stNow !== 'windup' && actor.teleRing) {
          // chiêu vừa tung: nổ vòng theo đúng bán kính rồi xóa vòng báo
          this.impactFx(actor.container.x, actor.container.y, '#ff5040', actor.aoeR || 46);
          actor.teleRing.destroy();
          actor.teleRing = undefined;
        }
      }
      // GĐ9: hướng mới nhất (vòng update lo mặt trái/phải) + nháy khi mất máu
      actor.dir = m.direction;
      actor.aoeR = m.aoeR || 0; // GĐ171
      actor.wuEnd = m.wuEnd || 0;
      actor.wuDur = m.wuDur || 0;
      actor.maxHp = m.maxHp; // GĐ169
      if (m.hp < actor.lastHp) actor.flashUntil = this.time.now + 130;
      actor.lastHp = m.hp;
    }

    for (const id of Array.from(this.monsterActors.keys())) {
      if (!seen.has(id)) {
        this.monsterActors.get(id)?.teleRing?.destroy(); // GĐ171
        this.monsterActors.get(id)?.container.destroy();
        this.monsterActors.delete(id);
        this.monsterTargets.delete(id);
      }
    }
  }

  // GĐ9: viên đạn chiêu bay từ người tung tới quái, chạm đích thì lóe sáng
  private spawnProjectile(casterId: string, targetId: string, elem: string, variant = 0): void {
    const from = this.actors.get(casterId)?.container;
    const to = this.monsterActors.get(targetId)?.container;
    if (!from || !to) return;
    const key = fxOrbKey(elem);
    const orb = this.add.image(from.x, from.y - 30, key).setDepth(to.y + 60);
    if (variant === 2) orb.setScale(1.5); // GĐ189: nhịp 3 — đạn to, nặng
    const dist = Math.hypot(to.x - from.x, to.y - from.y);
    const dur = Phaser.Math.Clamp(dist * 0.55, 110, 240);
    // GĐ189: nhịp 2 (quét) — đạn bay vòng cung chứ không thẳng
    const bulge = variant === 1 ? Math.min(46, dist * 0.22) : 0;
    const ddx = to.x - from.x, ddy = (to.y - 8) - (from.y - 30);
    const llen = Math.hypot(ddx, ddy) || 1;
    const perpX = -ddy / llen, perpY = ddx / llen;
    this.tweens.add({
      targets: orb,
      x: to.x,
      y: to.y - 8,
      duration: dur,
      ease: 'Quad.In',
      onUpdate: (tw: Phaser.Tweens.Tween) => {
        if (bulge) { const p = tw.progress; const off = Math.sin(p * Math.PI) * bulge; orb.x += perpX * off; orb.y += perpY * off; }
      },
      onComplete: () => {
        this.impactFx(to.x, to.y - 8, FX_ELEM_COLORS[elem] || '#ffd873', 48); // GĐ171
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
    // GĐ118: sprite quái PixelLab — có ảnh thật thì dùng ảnh (trùm thử
    // thách giữ hình thạch quái, không dùng sprite); nạp lỗi thì lùi về
    // họ hình vẽ code như cũ. Sprite đã có màu thật nên bỏ hết nhuộm.
    const monKey = !isTrial && m.kind && MON_SPRITE[m.kind] && this.textures.exists('mon-' + m.kind) ? 'mon-' + m.kind : null;
    // GĐ38: hình theo LOÀI — dơi dùng khung vỗ cánh, thạch quái hình đá
    const key = monKey ?? (base === 'rival'
      ? rivalSet ? spriteTexKey('rival', m.direction, 'idle') : personTexKey('rivalmonk', m.direction, 'idle')
      : base === 'golem' ? 'golem-idle' : base === 'bat' ? 'bat-f0' : wolfTexKey(face, 'idle'));
    const baseScale = base === 'rival' ? PERSON_TEX.scale : isTrial ? 1.2 : m.kind === 'khoiloi' ? 1.15 : base === 'golem' || base === 'bat' ? 1 : WOLF_TEX.scale;
    const sprite = monKey
      ? (() => {
          const img = this.textures.get(monKey).getSourceImage() as unknown as HTMLImageElement;
          // GĐ159: tỉ lệ thật — tính theo họ hình qua monSpriteScale (xem MON_BASE_H).
          return this.add.image(0, 0, monKey).setScale(monSpriteScale(base, m.kind, img.height));
        })()
      : rivalSet
        ? this.add.sprite(0, 0, key).setOrigin(0.5, HERO_ORIGIN_Y).setScale(HERO_SCALE * (vis?.scale ?? 1))
        : this.add.image(0, 0, key).setScale(baseScale * (vis?.scale ?? 1));
    if (!monKey) {
      if (isTrial && (m.trial === 'dai' || m.trial === 'kimdan' || m.trial === 'nguyenanh')) sprite.setTint(m.trial === 'nguyenanh' ? 0x86c5ff : m.trial === 'kimdan' ? 0xffd75e : 0x9a86d8); // GĐ160: Thiên Kiếp Ảnh nhuộm xanh kiếp
      if (m.kind === 'khoiloi') sprite.setTint(0xa8c4de); // GĐ57: khôi lỗi đá xanh xám, khác Thạch Quái thường
      if (m.kind === 'huyetlang') sprite.setTint(0xe58a8a); // GĐ57: Huyết Lang nhuộm đỏ
      if (vis) sprite.setTint(vis.tint); // GĐ59
    }
    const tintN: number | null = monKey ? null : vis ? vis.tint : m.kind === 'khoiloi' ? 0xa8c4de : m.kind === 'huyetlang' ? 0xe58a8a : isTrial && (m.trial === 'dai' || m.trial === 'kimdan' || m.trial === 'nguyenanh') ? (m.trial === 'nguyenanh' ? 0x86c5ff : m.trial === 'kimdan' ? 0xffd75e : 0x9a86d8) : null;
    const barY = monKey ? -(sprite.displayHeight / 2 + 10) : base === 'rival' ? (rivalSet ? -62 : -48) : base === 'golem' ? -56 : -30;
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
      container, sprite, barFg, dir: m.direction, face, curTex: key, trial: m.trial || null, kind: m.kind, rivalSet, base, tintN, monSprite: !!monKey, // GĐ59, GĐ118
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
      // GĐ174: MỌI nhãn tên chỉ hiện khi người chơi đứng trong 240px
      // (Bảo: để xa là ẩn hết cho đỡ rối mắt) — NPC thành phố (GĐ89 cũ
      // 260px), điểm tài nguyên (GĐ132), NPC làng + cổng, người chơi khác.
      if (this.cityNpcLabels.length) {
        for (const l of this.cityNpcLabels) {
          const lx = l.c ? l.c.x : l.x, ly = l.c ? l.c.y : l.y; // GĐ156: nhãn theo vị trí sống của NPC
          l.label.setVisible(Math.hypot(this.myContainer.x - lx, this.myContainer.y - ly) <= 240);
        }
      }
      if (this.nodeLabels.length) {
        for (const l of this.nodeLabels) {
          l.label.setVisible(Math.hypot(this.myContainer.x - l.x, this.myContainer.y - l.y) <= 240);
        }
      }
      for (const c of this.npcActors.values()) {
        const nl = c.getByName('nlabel') as Phaser.GameObjects.Text | null;
        if (nl) nl.setVisible(Math.hypot(this.myContainer.x - c.x, this.myContainer.y - c.y) <= 240);
      }
      if (this.boardLabel) {
        const onHome = (this.mapState?.mapId || '') === 'lang_tan_thu';
        this.boardLabel.setVisible(onHome && Math.hypot(this.myContainer.x - hs175(800), this.myContainer.y - hs175(612)) <= 240); // GĐ175
      }
      if (this.portalHomeLabel) {
        const onHome = (this.mapState?.mapId || '') === 'lang_tan_thu';
        this.portalHomeLabel.setVisible(onHome && Math.hypot(this.myContainer.x - hs175(1080), this.myContainer.y - hs175(570)) <= 240); // GĐ175
      }
      // nhãn điểm đặc biệt của map hiện tại (đăng ký lúc vào map; tự dọn khi đối tượng đã hủy)
      for (let i = this.proxLabels.length - 1; i >= 0; i--) {
        const e = this.proxLabels[i];
        if (!e.t.active) { this.proxLabels.splice(i, 1); continue; }
        e.t.setVisible(Math.hypot(this.myContainer.x - e.x, this.myContainer.y - e.y) <= 240);
      }
      for (const [pid, a] of this.actors) {
        if (pid === this.myId) continue; // tên của mình luôn hiện
        const vis = Math.hypot(this.myContainer.x - a.container.x, this.myContainer.y - a.container.y) <= 240;
        if (a.label.visible !== vis) { a.label.setVisible(vis); a.titleLabel.setVisible(vis); }
      }
      // GĐ150: hội thoại liên tục của NPC — kiểm tra mỗi giây trong vòng 4 lần/giây
      if (_time - this.lastDialogueCheck > 1000) {
        this.lastDialogueCheck = _time;
        this.updateNpcDialogues();
      }
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
          } else if (near.type === 'thuongnhan') {
            // GĐ86: thương nhân vắng làng thì hình NPC đã bị gỡ — không gợi ý E nữa (bấm E lúc đó server cũng báo đã rời làng)
            text = this.npcActors.has('npc_thuongnhan') ? '✦ Bấm E — Thương Nhân Lưu Động (buôn hàng hiếm)' : '';
          } else if (near.type === 'travel') {
            text = '✦ Bấm E — Trận Dịch Chuyển (đi bản đồ khác)';
          } else if (near.type === 'altar') {
            text = '🕯️ Bấm E — Đàn Tế (triệu hồi trùm map, 200 LT)';
          } else if (near.type === 'study') {
            text = this.myChar.classId === 'nhotu'
              ? '📖 Bấm E — Đọc sách ở Văn Uyển (tích Hạo Nhiên, mở Chương)'
              : '📖 Tàng Kinh Các — chỉ Nho Tu đọc sách được';
          } else if (near.type === 'node') {
            text = near.kind === 'ore' ? `⛏️ Bấm E — Đào ${near.name} (mỗi mạch ngày 1 lần)` : `🌿 Bấm E — Hái ${near.name} (mỗi bụi ngày 1 lần)`;
          } else if (near.type === 'citynpc') {
            text = `✦ Bấm E — ${near.name} (${near.role})`; // GĐ89: dân thành phố
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
      if (this.chatOpen) { vx = 0; vy = 0; } // GĐ168: đang gõ chat thì đứng yên
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
      // GĐ88: đang ngự kiếm bay → nhân vật nhấc khỏi mặt đất 14px (chỉ hiển thị,
      // tọa độ thật trên server không đổi nên tương tác/đánh nhau không lệch)
      const lift = this.worldPlayers.get(id)?.flying ? 14 : 0;
      c.x = Phaser.Math.Linear(c.x, target.x, k);
      c.y = Phaser.Math.Linear(c.y, target.y - lift, k);
      c.setDepth(c.y);
      // GĐ9: hoạt ảnh đi / đứng / tung chiêu từ quãng đường đã trôi
      const moved = Math.hypot(c.x - actor.lastX, c.y - actor.lastY);
      actor.lastX = c.x;
      actor.lastY = c.y;
      const moving = moved > 0.08;
      if (moving) actor.walkPhase += moved / 7; // 1 vòng bước ≈ 44px như nhịp bản cũ
      // GĐ171: cưỡi thú thì thú + người nhấp nhô theo nhịp bước
      if (actor.mountImg && actor.mountShown) {
        actor.mountImg.y = 4 - (moving ? Math.abs(Math.sin(actor.walkPhase)) * 2.4 : 0);
        actor.sprite.y = (MOUNT_LIFT[actor.mountShown] ?? -28) + (moving ? Math.sin(actor.walkPhase * 2) * 1.1 : 0);
      }
      // GĐ171: phi kiếm lơ lửng đung đưa dưới chân người bay
      if (actor.swordImg && actor.swordImg.visible) {
        actor.swordImg.y = 15 + Math.sin(_time / 270 + actor.walkPhase * 0.35) * 2;
        actor.swordImg.rotation = Math.sin(_time / 360) * 0.07;
        actor.swordImg.setFlipX(actor.sprite.flipX);
      }
      // GĐ122: pet sprite tĩnh — không đổi khung đi bộ (kẻo quay lại hình đệ tử)
      if (!actor.petSprite) {
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
        // GĐ188: COMBO đòn thường — mỗi lần bắt đầu ra đòn lại qua nhịp
        // kế (0 → 1 → 2 → 0...); nghỉ quá 2,5s thì về nhịp 0. Nhờ vậy
        // thương không còn "mỗi đâm thẳng": đâm → QUÉT NGANG → bổ dọc;
        // kiếm chém xuôi → chém ngược → bổ trên xuống, v.v.
        const posingNow = _time < actor.castUntil;
        if (posingNow && !actor.wasPosing) {
          actor.comboIdx = (_time - (actor.lastPoseAt || 0) > 2500) ? 0 : ((actor.comboIdx || 0) + 1) % 3;
          actor.lastPoseAt = _time;
        }
        actor.wasPosing = posingNow;
        const cv = actor.comboIdx || 0; // nhịp combo hiện tại
        // GĐ190: nhịp này dùng ĐÒN RIÊNG của vũ khí đang cầm
        const mv: WpnMove = (wdef && WPN_COMBOS[wdef.id]) ? WPN_COMBOS[wdef.id][cv] : defaultMoveFor(motion, cv);
        if (_time < actor.castUntil) {
          const p = Math.min(1, Math.max(0, 1 - (actor.castUntil - _time) / 260));
          const s = Math.sin(p * Math.PI);
          const faceSign = dir === 'left' ? -1 : 1;
          if (mv.m === 'swing') {
            let D: number;
            if (mv.chop) { D = p < 0.4 ? -2.8 * (p / 0.4) : -2.8 + 3.4 * ((p - 0.4) / 0.6); if (p > 0.4) y += (p - 0.4) * 7; }
            else D = p < 0.25 ? -2.1 * (p / 0.25) : -2.1 + 3.0 * ((p - 0.25) / 0.75);
            rot = rest + faceSign * (mv.flip ? -1 : 1) * (mv.arc ?? 1) * D;
            if (mv.dip) y += s * mv.dip;
            if (mv.osc) rot += Math.sin(p * Math.PI * 3) * mv.osc * s;
            if (mv.spin) rot += p * mv.spin * Math.PI * 2 * faceSign;
          } else if (mv.m === 'thrust') {
            const [vx2, vy2] = DIR_VEC[dir] || [0, 1];
            const ext = mv.ext ?? 12;
            x += vx2 * s * ext; y += vy2 * s * ext;
            if (mv.sweep) rot = (WPN_THRUST_ROT[dir] ?? 3.0) + faceSign * (-1.5 + 3.0 * p) * (mv.arc ?? 1);
            else rot = (WPN_THRUST_ROT[dir] ?? 3.0) + (mv.tilt ?? 0) * s * faceSign;
            if (mv.dip) y += s * mv.dip;
            if (mv.spin) rot += p * mv.spin * Math.PI * 2 * faceSign;
          } else if (mv.m === 'raise') {
            y -= s * (mv.lift ?? 9);
            rot = rest + (0.2 * faceSign - rest) * Math.min(1, p * 1.6) + (mv.tilt ?? 0) * s;
            if (mv.osc) rot += Math.sin(p * Math.PI * 3) * mv.osc * s;
            if (mv.spin) rot += p * mv.spin * Math.PI * 2 * faceSign;
            if (mv.ext) { const [vx2, vy2] = DIR_VEC[dir] || [0, 1]; x += vx2 * s * mv.ext; y += vy2 * s * mv.ext; }
          } else {
            // guard (khiên): đưa ra trước, nghiêng theo thông số đòn
            const [vx2, vy2] = DIR_VEC[dir] || [0, 1];
            const ext = mv.ext ?? 3;
            x += vx2 * s * ext; y += vy2 * s * ext;
            rot += (mv.tilt ?? 0) * s;
          }
          // Tay phụ (song kiếm/song đao): vung trễ nửa nhịp, phía đối diện
          if (actor.weaponImg2 && actor.weaponImg2.visible) {
            const p2 = Math.min(1, Math.max(0, p - 0.18));
            const rest2 = -rest;
            actor.weaponImg2.setPosition(-ax, ay + (moving ? Math.sin(actor.walkPhase + 1) * 1.4 : 0));
            actor.weaponImg2.setRotation(
              mv.m === 'swing' ? rest2 + -faceSign * (mv.flip ? -1 : 1) * (mv.arc ?? 1) * (p2 < 0.25 ? -2.1 * (p2 / 0.25) : -2.1 + 3.0 * ((p2 - 0.25) / 0.75)) : rest2, // GĐ190: tay phụ theo đòn riêng của vũ khí
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
      // GĐ171: vòng báo trước bám quái + nở theo tiến độ vận chiêu
      if (actor.teleRing) {
        const prog = actor.wuDur ? Phaser.Math.Clamp(1 - ((actor.wuEnd || 0) - Date.now()) / actor.wuDur, 0.05, 1) : 1;
        actor.teleRing.setPosition(c.x, c.y);
        actor.teleRing.setRadius(Math.max(8, (actor.aoeR || 46) * (0.35 + 0.65 * prog)));
        actor.teleRing.setDepth(c.y - 2);
      }
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
      // GĐ118: quái dùng sprite PixelLab thì đứng yên 1 khung, không đổi
      // khung đi bộ/vồ như họ hình vẽ code (đổi là mất sprite).
      if (!actor.monSprite) {
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
      }
      // Nháy sáng khi vừa trúng đòn
      if (_time < actor.flashUntil) actor.sprite.setTintFill(0xffe9e9);
      else if (actor.sprite.tintFill) {
        actor.sprite.clearTint();
        if (!actor.monSprite) { // GĐ118: sprite đã có màu thật, không nhuộm lại
          if (actor.tintN != null) actor.sprite.setTint(actor.tintN); // GĐ59: màu cố định của loài (GDD/khôi lỗi/huyết lang/Tâm Ma)
          if (actor.trial === 'dai' || actor.trial === 'kimdan' || actor.trial === 'nguyenanh') actor.sprite.setTint(actor.trial === 'nguyenanh' ? 0x86c5ff : actor.trial === 'kimdan' ? 0xffd75e : 0x9a86d8);
          if (actor.kind === 'khoiloi') actor.sprite.setTint(0xa8c4de); // GĐ57
          if (actor.kind === 'huyetlang') actor.sprite.setTint(0xe58a8a); // GĐ57
        }
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
