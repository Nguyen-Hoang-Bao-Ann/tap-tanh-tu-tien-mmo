// GĐ130: mirror nhiệm vụ Cửu U Bí Cảnh (8 quest, viết tay theo server/data/quests_gd130.json).
export const QUEST_INFO_GD130: Record<string, { name: string; desc: string; target: number; reward: number; kind?: string; itemId?: string; npcId?: string; targetNpcId?: string; destMap?: string; gd130?: boolean }> = {
  q130_chain_1: { name: "Chạm ngõ Cửu U (1/6)", desc: "Chuỗi Cửu U: tới cổng Cửu U Bí Cảnh rồi về gặp Ông Lão Giữ Cổng trả nhiệm vụ.", target: 1, reward: 650, kind: "explore", npcId: "cuu_u_bi_canh_npc_007", gd130: true },
  q130_chain_2: { name: "Dọn Cốt Binh (2/6)", desc: "Chuỗi Cửu U (tiếp): hạ 10 Cốt Binh ở Cửu U Bí Cảnh rồi về gặp Ông Lão Giữ Cổng trả nhiệm vụ.", target: 10, reward: 650, kind: "kill", npcId: "cuu_u_bi_canh_npc_007", gd130: true },
  q130_chain_3: { name: "Diệt Đan Ma (3/6)", desc: "Chuỗi Cửu U (tiếp): hạ 8 Đan Ma ở Cửu U Bí Cảnh rồi về gặp Ông Lão Giữ Cổng trả nhiệm vụ.", target: 8, reward: 650, kind: "kill", npcId: "cuu_u_bi_canh_npc_007", gd130: true },
  q130_chain_4: { name: "Săn Huyễn Ảnh Miêu (4/6)", desc: "Chuỗi Cửu U (tiếp): hạ 8 Huyễn Ảnh Miêu ở Cửu U Bí Cảnh rồi về gặp Ông Lão Giữ Cổng trả nhiệm vụ.", target: 8, reward: 650, kind: "kill", npcId: "cuu_u_bi_canh_npc_007", gd130: true },
  q130_chain_5: { name: "Tru Ma Quân (5/6)", desc: "Chuỗi Cửu U (tiếp): hạ 1 Cửu U Ma Quân (trùm) ở Cửu U Bí Cảnh rồi về gặp Ông Lão Giữ Cổng trả nhiệm vụ.", target: 1, reward: 975, kind: "boss", npcId: "cuu_u_bi_canh_npc_007", gd130: true },
  q130_chain_6: { name: "Bình định Cửu U (6/6)", desc: "Chuỗi Cửu U (cuối): hạ cả 3 Cửu U Ma Quân (trùm) ở Cửu U Bí Cảnh rồi về gặp Ông Lão Giữ Cổng trả nhiệm vụ.", target: 3, reward: 975, kind: "boss", npcId: "cuu_u_bi_canh_npc_007", gd130: true },
  q130_item_daquy: { name: "Thu thập Đá Quý", desc: "Mang theo 5 Đá Quý tới gặp Ông Lão Giữ Cổng ở Cửu U Bí Cảnh.", target: 5, reward: 650, kind: "item", itemId: "da_quy", npcId: "cuu_u_bi_canh_npc_007", gd130: true },
  q130_explore_tam: { name: "Khám phá Tâm Cửu U", desc: "Tới Tâm Cửu U (giữa Cửu U Bí Cảnh) rồi về gặp Ông Lão Giữ Cổng trả nhiệm vụ.", target: 1, reward: 650, kind: "explore", npcId: "cuu_u_bi_canh_npc_007", gd130: true },
};
