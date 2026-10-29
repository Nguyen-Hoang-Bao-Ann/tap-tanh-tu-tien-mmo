// GĐ143: mirror nhiệm vụ Tiên/Ma (4 quest — 2 nhánh ẩn + 2 nhánh thường, nhận/trả qua Sứ Giả).
export const QUEST_INFO_GD143 = {
  q143_an_1: { name: 'Tranh đấu nhánh ẩn (1/2): Lập uy', desc: 'Phe bạn đã chọn. Hạ 10 quái bất kỳ để lập uy cho phe mình, Sứ Giả sẽ cử Tướng phe đối địch tới thử sức.', target: 10, reward: 140, kind: 'kill', npcId: 'npc_sugia', gd143: true },
  q143_an_2: { name: 'Tranh đấu nhánh ẩn (2/2): Nhận Lệnh Bài', desc: 'Về gặp Sứ Giả Tông Môn nhận Lệnh Bài phe + buff ẩn của nhánh tu.', target: 1, reward: 320, kind: 'talk', npcId: 'npc_sugia', gd143: true },
  q143_thuong_1: { name: 'Tranh đấu nhánh thường (1/2): Lập uy', desc: 'Phe bạn đã chọn. Hạ 10 quái bất kỳ để lập uy cho phe mình, Sứ Giả sẽ cử Tướng phe đối địch tới thử sức.', target: 10, reward: 650, kind: 'kill', npcId: 'npc_sugia', gd143: true },
  q143_thuong_2: { name: 'Tranh đấu nhánh thường (2/2): Trả nhiệm vụ', desc: 'Về gặp Sứ Giả Tông Môn trả nhiệm vụ tranh đấu.', target: 1, reward: 650, kind: 'talk', npcId: 'npc_sugia', gd143: true },
};
