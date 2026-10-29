// GĐ145: mirror nhiệm vụ ẩn tu luyện → khảo hạch (6 quest — 3 Bản Nguyên + 3 Ý Chí, nhận/trả qua Sứ Giả, chỉ hiện khi đạt cấp Đạo Quán 2).
export const QUEST_INFO_GD145 = {
  q145_bn_1: { name: 'Tọa Vong Ngộ Đạo', desc: 'Ngồi thiền trong Đạo Quán đủ 10 giờ game, tâm tĩnh như nước, để ngộ ra Bản Nguyên.', target: 600, reward: 140, kind: 'daoquan', npcId: 'npc_sugia', gd145: true },
  q145_bn_2: { name: 'Phá Cảnh Liên Châu', desc: 'Đột phá thành công 3 lần — mỗi lần phá cảnh là một lần Bản Nguyên dày thêm.', target: 3, reward: 320, kind: 'breakthrough', npcId: 'npc_sugia', gd145: true },
  q145_bn_3: { name: 'Lĩnh Ngộ Song Pháp', desc: 'Lĩnh ngộ hoàn tất 2 chiêu thức — hiểu pháp càng sâu, Bản Nguyên càng vững.', target: 2, reward: 320, kind: 'learn', npcId: 'npc_sugia', gd145: true },
  q145_yc_1: { name: 'Bất Động Như Sơn', desc: 'Ngồi thiền trong Đạo Quán đủ 20 giờ game, núi lở trước mặt mà tâm không động — đó là Ý Chí.', target: 1200, reward: 320, kind: 'daoquan', npcId: 'npc_sugia', gd145: true },
  q145_yc_2: { name: 'Vạn Kiếp Bất Ma', desc: 'Đột phá thành công 5 lần — qua bao kiếp nạn mà đạo tâm không mòn, Ý Chí tăng trưởng.', target: 5, reward: 650, kind: 'breakthrough', npcId: 'npc_sugia', gd145: true },
  q145_yc_3: { name: 'Tâm Như Chỉ Thủy', desc: 'Lĩnh ngộ hoàn tất 3 chiêu thức mà không nản lòng — Ý Chí rèn trong kiên trì.', target: 3, reward: 650, kind: 'learn', npcId: 'npc_sugia', gd145: true },
};
