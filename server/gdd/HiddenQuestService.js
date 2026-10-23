'use strict';
const fs = require('fs');
// HiddenQuestService — Nhiệm vụ ẩn giành Công Pháp Ẩn (tài liệu mở rộng 2.4).
// Mỗi công pháp ẩn chỉ có DUY NHẤT 1 chủ sở hữu (is_claimed); truyền thừa tối đa 2 người ở 70-80% sức mạnh.
// Điều kiện kích hoạt đọc hoàn toàn từ SkillData.hiddenSkills[].questChains[].conditions:
//   {type:'map', mapId} | {type:'time', fromHour, toHour} | {type:'item', itemId, count} | {type:'realm', realm, tier}
class HiddenQuestService {
  constructor(skillData, opts = {}) {
    this.skills = new Map(((skillData && skillData.hiddenSkills) || []).map((s) => [s.id, { ...s }]));
    this.realms = opts.realms || ['pham', 'lk', 'tc', 'kd', 'na', 'ht'];
    this.stateFile = opts.stateFile || null;
    this.active = new Map(); // playerId -> Map(skillId -> {chainId, startedAt})
    this.inheritances = new Map(); // skillId -> [{to, powerPct}]
    this.loadState();
  }

  realmRank(realm, tier = 0) {
    const i = this.realms.indexOf(realm);
    return i < 0 ? -1 : i * 9 + (tier || 0);
  }

  conditionMet(cond, player, world) {
    switch (cond.type) {
      case 'map':
        return player.mapId === cond.mapId;
      case 'time': {
        const h = world && world.hour;
        if (h == null) return false;
        // Khoảng giờ có thể vắt qua nửa đêm (vd 23h -> 1h)
        return cond.fromHour <= cond.toHour
          ? h >= cond.fromHour && h < cond.toHour
          : h >= cond.fromHour || h < cond.toHour;
      }
      case 'item':
        return ((player.inventory || {})[cond.itemId] || 0) >= (cond.count || 1);
      case 'realm':
        return this.realmRank(player.realm, player.tier) >= this.realmRank(cond.realm, cond.tier);
      default:
        return false;
    }
  }

  // check_hidden_quests(player, world): quét mọi công pháp ẩn CHƯA có chủ;
  // thỏa mãn toàn bộ điều kiện của 1 chuỗi → kích hoạt chuỗi nhiệm vụ cho người chơi đó.
  check_hidden_quests(player, world = {}) {
    const triggered = [];
    if (!this.active.has(player.id)) this.active.set(player.id, new Map());
    const mine = this.active.get(player.id);
    for (const skill of this.skills.values()) {
      if (skill.is_claimed) continue; // đã có chủ → không kích hoạt nữa
      if (mine.has(skill.id)) continue; // đã đang làm chuỗi này
      for (const chain of skill.questChains || []) {
        if ((chain.conditions || []).every((c) => this.conditionMet(c, player, world))) {
          mine.set(skill.id, { chainId: chain.chainId, startedAt: Date.now() });
          triggered.push({
            skillId: skill.id,
            skillName: skill.name,
            chainId: chain.chainId,
            step: 1,
            message: `Chuỗi nhiệm vụ ẩn kích hoạt: tranh đoạt «${skill.name}»`,
          });
          break;
        }
      }
    }
    return triggered;
  }

  // Hoàn thành chuỗi → nhận quyền sở hữu. Người thứ hai đến sau sẽ bị từ chối.
  claim(skillId, playerId) {
    const s = this.skills.get(skillId);
    if (!s) return { ok: false, reason: 'unknown_skill' };
    if (s.is_claimed) return { ok: false, reason: 'already_claimed', claimedBy: s.claimedBy };
    s.is_claimed = true;
    s.claimedBy = playerId;
    this.saveState();
    return { ok: true, skillId, claimedBy: playerId };
  }

  // Truyền thừa: tối đa transferableTo người, sức mạnh kẹp trong inheritPowerPct (70-80%).
  transfer(skillId, fromId, toId, powerPct) {
    const s = this.skills.get(skillId);
    if (!s || !s.is_claimed || s.claimedBy !== fromId) return { ok: false, reason: 'not_owner' };
    const list = this.inheritances.get(skillId) || [];
    if (list.length >= (s.transferableTo || 2)) return { ok: false, reason: 'transfer_limit' };
    const lo = (s.inheritPowerPct || [70, 80])[0];
    const hi = (s.inheritPowerPct || [70, 80])[1];
    const pct = Math.min(Math.max(powerPct == null ? lo + 5 : powerPct, lo), hi);
    list.push({ to: toId, powerPct: pct });
    this.inheritances.set(skillId, list);
    this.saveState();
    return { ok: true, skillId, to: toId, powerPct: pct };
  }

  ownerOf(skillId) {
    const s = this.skills.get(skillId);
    return s ? s.claimedBy : null;
  }

  saveState() {
    if (!this.stateFile) return;
    const claims = {};
    for (const s of this.skills.values()) if (s.is_claimed) claims[s.id] = s.claimedBy;
    fs.writeFileSync(
      this.stateFile,
      JSON.stringify({ claims, inheritances: Object.fromEntries(this.inheritances) }, null, 1),
    );
  }

  loadState() {
    if (!this.stateFile || !fs.existsSync(this.stateFile)) return;
    try {
      const st = JSON.parse(fs.readFileSync(this.stateFile, 'utf8'));
      for (const [id, by] of Object.entries(st.claims || {})) {
        const s = this.skills.get(id);
        if (s) {
          s.is_claimed = true;
          s.claimedBy = by;
        }
      }
      for (const [id, list] of Object.entries(st.inheritances || {})) this.inheritances.set(id, list);
    } catch {
      /* file trạng thái hỏng → khởi tạo sạch */
    }
  }
}

module.exports = { HiddenQuestService };
