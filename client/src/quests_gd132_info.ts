// GĐ132: mirror client của server/data/quests_gd132.json (2 nghề thu thập × chuỗi 3).
// Chỉ dùng để nhận/trả qua hộp thoại người giao (không qua bảng) — xem QUEST_INFO.
export const QUEST_INFO_GD132: Record<string, { name: string; desc: string; target: number; reward: number; kind?: string; npcId?: string; gd132?: boolean }> = {
  q132_daokhoang_1: { name: 'Bái kiến Khoáng Lão (1/3)', desc: 'Chuỗi nghề Linh Khoáng Sư (1/3): tới gặp Khoáng Lão ở Làng Tân Thủ trò chuyện, rồi trả nhiệm vụ ngay tại chỗ.', target: 1, reward: 80, kind: 'talk', npcId: 'npc_master_daokhoang', gd132: true },
  q132_daokhoang_2: { name: 'Linh khoáng nhập môn (2/3)', desc: 'Chuỗi nghề Linh Khoáng Sư (2/3): đào thành công 5 mạch quặng bất kỳ rồi về gặp Khoáng Lão trả nhiệm vụ.', target: 5, reward: 140, kind: 'gather', npcId: 'npc_master_daokhoang', gd132: true },
  q132_daokhoang_3: { name: 'Linh khoáng chăm chỉ (3/3)', desc: 'Chuỗi nghề Linh Khoáng Sư (3/3): đào thành công 15 mạch quặng bất kỳ rồi về gặp Khoáng Lão trả nhiệm vụ.', target: 15, reward: 320, kind: 'gather', npcId: 'npc_master_daokhoang', gd132: true },
  q132_haithuoc_1: { name: 'Bái kiến Thảo Lão (1/3)', desc: 'Chuỗi nghề Thải Dược Sư (1/3): tới gặp Thảo Lão ở Làng Tân Thủ trò chuyện, rồi trả nhiệm vụ ngay tại chỗ.', target: 1, reward: 80, kind: 'talk', npcId: 'npc_master_haithuoc', gd132: true },
  q132_haithuoc_2: { name: 'Thải dược nhập môn (2/3)', desc: 'Chuỗi nghề Thải Dược Sư (2/3): hái thành công 5 bụi thuốc bất kỳ rồi về gặp Thảo Lão trả nhiệm vụ.', target: 5, reward: 140, kind: 'gather', npcId: 'npc_master_haithuoc', gd132: true },
  q132_haithuoc_3: { name: 'Thải dược chăm chỉ (3/3)', desc: 'Chuỗi nghề Thải Dược Sư (3/3): hái thành công 15 bụi thuốc bất kỳ rồi về gặp Thảo Lão trả nhiệm vụ.', target: 15, reward: 320, kind: 'gather', npcId: 'npc_master_haithuoc', gd132: true },
};
