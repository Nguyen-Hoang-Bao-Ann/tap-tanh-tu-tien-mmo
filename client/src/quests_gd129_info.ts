// GĐ129: mirror nhiệm vụ Cổ Thụ Yêu Giới (6 quest, viết tay theo server/data/quests_gd129.json).
export const QUEST_INFO_GD129: Record<string, { name: string; desc: string; target: number; reward: number; kind?: string; itemId?: string; npcId?: string; targetNpcId?: string; destMap?: string; gd129?: boolean }> = {
  q129_kill_lamtru: { name: "Diệt Lâm Trư ở Cổ Thụ Yêu Giới", desc: "Hạ 12 Lâm Trư ở Cổ Thụ Yêu Giới rồi về gặp Ông Lão Giữ Rừng trả nhiệm vụ.", target: 12, reward: 650, kind: "kill", npcId: "co_thu_yeu_gioi_npc_007", gd129: true },
  q129_kill_huyendiep: { name: "Diệt Huyễn Điệp ở Cổ Thụ Yêu Giới", desc: "Hạ 8 Huyễn Điệp ở Cổ Thụ Yêu Giới rồi về gặp Ông Lão Giữ Rừng trả nhiệm vụ.", target: 8, reward: 650, kind: "kill", npcId: "co_thu_yeu_gioi_npc_007", gd129: true },
  q129_kill_huyetlang: { name: "Diệt Huyết Lang ở Cổ Thụ Yêu Giới", desc: "Hạ 6 Huyết Lang ở Cổ Thụ Yêu Giới rồi về gặp Ông Lão Giữ Rừng trả nhiệm vụ.", target: 6, reward: 650, kind: "kill", npcId: "co_thu_yeu_gioi_npc_007", gd129: true },
  q129_boss_huyetlang: { name: "Săn trùm Huyết Lang", desc: "Hạ 1 Huyết Lang (trùm) ở Cổ Thụ Yêu Giới rồi về gặp Ông Lão Giữ Rừng trả nhiệm vụ.", target: 1, reward: 975, kind: "boss", npcId: "co_thu_yeu_gioi_npc_007", gd129: true },
  q129_item_daquy: { name: "Thu thập Đá Quý", desc: "Mang theo 3 Đá Quý tới gặp Ông Lão Giữ Rừng ở Cổ Thụ Yêu Giới.", target: 3, reward: 650, kind: "item", itemId: "da_quy", npcId: "co_thu_yeu_gioi_npc_007", gd129: true },
  q129_explore_tam: { name: "Khám phá Tâm Cổ Thụ", desc: "Tới Tâm Cổ Thụ (giữa Cổ Thụ Yêu Giới) rồi về gặp Ông Lão Giữ Rừng trả nhiệm vụ.", target: 1, reward: 650, kind: "explore", npcId: "co_thu_yeu_gioi_npc_007", gd129: true },
};
