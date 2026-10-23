'use strict';
const fs = require('fs');
const path = require('path');
// MapManager — Quản lý map & chuyển cảnh (tài liệu mở rộng phần 4-5).
// Đọc MapData.json / MonsterData.json / NPCData.json; kiểm tra điều kiện cảnh giới
// trước khi cho vào map (vd map Ngũ Hành yêu cầu Kim Đan); map thành phố tự có đủ 200 NPC.
class MapManager {
  constructor(dataDir) {
    const read = (f) => JSON.parse(fs.readFileSync(path.join(dataDir, f), 'utf8'));
    this.mapData = read('MapData.json');
    this.monsterData = read('MonsterData.json');
    this.npcData = read('NPCData.json');
    this.maps = new Map(this.mapData.maps.map((mp) => [mp.id, mp]));
    this.monsters = new Map(this.monsterData.monsters.map((mo) => [mo.id, mo]));
    this.realms = this.mapData.meta.realms;
  }

  realmRank(realm, tier = 0) {
    const i = this.realms.indexOf(realm);
    return i < 0 ? -1 : i * 9 + (tier || 0);
  }

  getMap(mapId) {
    return this.maps.get(mapId) || null;
  }

  listMaps(filter = {}) {
    return [...this.maps.values()].filter(
      (mp) =>
        (!filter.category || mp.category === filter.category) &&
        (filter.safe === undefined || mp.safe === filter.safe),
    );
  }

  // Điều kiện vào map: hạng cảnh giới (realm × 9 + tầng) phải >= yêu cầu của map.
  canEnter(player, mapId) {
    const map = this.getMap(mapId);
    if (!map) return { ok: false, reason: 'unknown_map', mapId };
    const need = this.realmRank(map.minRealm, map.minTier);
    const have = this.realmRank(player.realm, player.tier);
    if (have < need) {
      return { ok: false, reason: 'realm_too_low', mapId, needRealm: map.minRealm, needTier: map.minTier };
    }
    return { ok: true, mapId };
  }

  // Quái của map = monsterSet khai trong MapData ∪ quái khai map này trong MonsterData.
  monstersForMap(mapId) {
    const map = this.getMap(mapId);
    if (!map) return [];
    const ids = new Set(map.monsterSet || []);
    for (const mon of this.monsters.values()) if ((mon.maps || []).includes(mapId)) ids.add(mon.id);
    return [...ids].map((id) => this.monsters.get(id)).filter(Boolean);
  }

  npcsForMap(mapId) {
    const entry = this.npcData.maps[mapId];
    return entry ? entry.npcs : [];
  }

  // Vào map: trả về map + quái + NPC đã sẵn sàng để server sinh ra.
  enterMap(player, mapId) {
    const chk = this.canEnter(player, mapId);
    if (!chk.ok) return chk;
    const map = this.getMap(mapId);
    return {
      ok: true,
      map,
      monsters: map.safe ? [] : this.monstersForMap(mapId),
      npcs: this.npcsForMap(mapId),
    };
  }
}

module.exports = { MapManager };
