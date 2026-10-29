// Gộp server_tick delta (v2, tối ưu băng thông A+B) thành snapshot đầy đủ —
// dùng cho các client thô (test/probe/đo tải): entity mới có đủ trường, entity
// cũ chỉ có trường thay đổi, entity biến mất nằm trong mảng *Gone; bản đầu
// tiên server gửi riêng có full: true. Cách gộp khớp mergeTick trong main.ts.
function createMerger() {
  const players = new Map();
  const monsters = new Map();
  const drops = new Map();
  const chests = new Map(); // GĐ39
  let npcs = [];
  function apply(t) {
    if (!t || t.v !== 2) return t; // payload lạ: trả nguyên
    if (t.full) {
      players.clear();
      monsters.clear();
      drops.clear();
      chests.clear();
      npcs = t.npcs || [];
    }
    const mergeInto = (map, list) => {
      for (const e of list || []) map.set(e.id, { ...(map.get(e.id) || {}), ...e });
    };
    mergeInto(players, t.players);
    mergeInto(monsters, t.monsters);
    mergeInto(drops, t.drops);
    mergeInto(chests, t.chests);
    for (const id of t.playersGone || []) players.delete(id);
    for (const id of t.monstersGone || []) monsters.delete(id);
    for (const id of t.dropsGone || []) drops.delete(id);
    for (const id of t.chestsGone || []) chests.delete(id);
    return {
      players: [...players.values()],
      monsters: [...monsters.values()],
      npcs,
      npcMoves: t.npcMoves || [], // GĐ156: chuyển động NPC thành phố của tick này
      drops: [...drops.values()],
      chests: [...chests.values()],
    };
  }
  return apply;
}
module.exports = { createMerger };
