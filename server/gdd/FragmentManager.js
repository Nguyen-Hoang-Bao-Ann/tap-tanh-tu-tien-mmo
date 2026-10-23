'use strict';
// FragmentManager — Hệ thống Công Pháp Khiếm Khuyết (tài liệu mở rộng 2.5).
// Dữ liệu đọc từ SkillData.flawedSets (data-driven, không hardcode bộ nào).
// inventory: object { itemId: count } — đúng định dạng túi đồ hiện tại của game.
class FragmentManager {
  constructor(skillData) {
    this.sets = new Map(((skillData && skillData.flawedSets) || []).map((s) => [s.id, s]));
  }

  getSet(setId) {
    return this.sets.get(setId) || null;
  }

  listSets() {
    return [...this.sets.values()];
  }

  // Kiểm tra 1 bộ: đủ mảnh hay thiếu những mảnh nào
  checkSet(inventory, setId) {
    const set = this.getSet(setId);
    if (!set) return { ok: false, reason: 'unknown_set', setId, missing: [] };
    const missing = set.fragments
      .filter((f) => (inventory[f.itemId] || 0) < 1)
      .map((f) => f.itemId);
    return { ok: missing.length === 0, setId, missing };
  }

  // Mọi bộ đang ghép được với túi đồ hiện tại
  combinableSets(inventory) {
    return this.listSets().filter((s) => this.checkSet(inventory, s.id).ok).map((s) => s.id);
  }

  // combine_fragments(): đủ mảnh → xóa các mảnh lẻ khỏi túi, trả về kỹ năng hoàn chỉnh.
  combine_fragments(inventory, setId) {
    const chk = this.checkSet(inventory, setId);
    if (!chk.ok) return { ok: false, reason: chk.reason || 'missing_fragments', missing: chk.missing };
    const set = this.getSet(setId);
    const consumed = [];
    for (const f of set.fragments) {
      inventory[f.itemId] -= 1;
      if (inventory[f.itemId] <= 0) delete inventory[f.itemId];
      consumed.push(f.itemId);
    }
    return {
      ok: true,
      skill: { id: set.id, name: set.name, quality: set.quality, desc: set.fusedDesc, fromFragments: consumed },
      consumed,
    };
  }
}

module.exports = { FragmentManager };
