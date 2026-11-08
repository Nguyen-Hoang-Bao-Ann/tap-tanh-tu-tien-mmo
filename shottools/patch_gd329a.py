# GĐ329a — Chiến kỹ tự tạo: bảng ghép CK + hàm tra pháp + nối equip/cast/normalize/payload
import io
P = 'server/index.js'
s = io.open(P, encoding='utf-8').read()

def rep(old, new, n=1):
    global s
    c = s.count(old)
    assert c == n, 'anchor %dx (want %d): %s' % (c, n, old[:80])
    s = s.replace(old, new)

# 1) Bảng CK + hàm số chiêu + tra cứu pháp (sau khối GĐ328)
rep("""  if (a.progress >= (a.need || 0)) { a.status = 'done'; sectLog(g, `Công pháp tự sáng tạo “${a.name}” (${a.gradeName}) đã NGỘ THÀNH — tới Tàng Kinh Các để học.`); sectNotify(g, `📜 Công pháp “${a.name}” của tông đã NGỘ THÀNH! Tới Tàng Kinh Các ở trụ sở để lĩnh ngộ.`); }
  saveWorld(); pushSectStateEveryone();
}""",
    """  if (a.progress >= (a.need || 0)) { a.status = 'done'; sectLog(g, `Công pháp tự sáng tạo “${a.name}” (${a.gradeName}) đã NGỘ THÀNH — tới Tàng Kinh Các để học.`); sectNotify(g, `📜 Công pháp “${a.name}” của tông đã NGỘ THÀNH! Tới Tàng Kinh Các ở trụ sở để lĩnh ngộ.`); }
  saveWorld(); pushSectStateEveryone();
}
// ===== GĐ329: CHIẾN KỸ TỰ SÁNG TẠO — pháp chủ động lắp vào ô chiêu, tung như chiêu thường (mọi số TẠM) =====
const SECT_ART_COMPS_CK = [
  { id: 'sat', name: 'Sát thương', per: 0.4, w: 3, max: 5 },
  { id: 'tam', name: 'Tầm đánh', per: 1, w: 2, max: 4 },
  { id: 'dien', name: 'Đánh vùng', per: 1, w: 5, max: 1 },
  { id: 'hieu', name: 'Làm chậm', per: 10, w: 3, max: 3 },
];
const SECT_ART_FLAWS_CK = [
  { id: 'f_cd', name: 'Hồi Chiêu Lâu', comp: 'cd', amt: 50 },
  { id: 'f_mp', name: 'Hao Chân Nguyên', comp: 'mp', amt: 50 },
  { id: 'f_yeu', name: 'Thế Yếu', comp: 'sat', amt: -0.4 },
];
const SECT_ART_COEF_CAP = { pham: 1.6, linh: 2.0, huyen: 2.4, dia: 3.0, thien: 3.6 };
function sectArtSkillStats(a) {
  const c = a.comps || {};
  const sat = c.sat || 0, tam = c.tam || 0, dien = c.dien || 0, hieu = c.hieu || 0;
  let coef = Math.min(0.8 + 0.4 * sat, SECT_ART_COEF_CAP[a.grade] || 1.6);
  if (a.flaw === 'f_yeu') coef = Math.max(0.6, coef - 0.4);
  coef = Math.round(coef * 100) / 100;
  let mana = 20 + 10 * sat + 5 * tam + 12 * dien + 6 * hieu;
  if (a.flaw === 'f_mp') mana = Math.round(mana * 1.5);
  let cdMs = 5000 + 800 * sat + 2000 * dien + 500 * hieu;
  if (a.flaw === 'f_cd') cdMs = Math.round(cdMs * 1.5);
  const parts = [`hệ số ${coef}`, `tầm ${4 + tam} ô`];
  if (dien) parts.push('đánh vùng trong tầm');
  if (hieu) parts.push(`chậm ${10 * hieu}% trong 2,5 giây`);
  parts.push(`${mana} chân nguyên`, `hồi ${(cdMs / 1000).toFixed(1).replace('.', ',')} giây`);
  return { coef, range: (4 + tam) * 40, mana, cdMs, aoe: !!dien, slowPct: 10 * hieu, text: parts.join(' · ') };
}
function sectArtOf(p, artId) { const g = p && p.token ? sectOfToken(p.token) : null; if (!g) return null; return sectArtsOf(g).find((a) => a.id === artId && a.status === 'done') || null; }
function sectArtSkillOk(p, id) { if (!p || typeof id !== 'string' || id.indexOf('art:') !== 0) return false; const a = sectArtOf(p, id.slice(4)); return !!(a && a.kind === 'chienky' && Array.isArray(p.sectArts) && p.sectArts.includes(a.id)); }
function sectArtSkillDefOf(p, id) {
  if (!sectArtSkillOk(p, id)) return null;
  const a = sectArtOf(p, id.slice(4));
  const d = sectArtSkillStats(a);
  const fx = {};
  if (d.aoe) fx.aoe = true;
  if (d.slowPct) { fx.slowPct = d.slowPct; fx.slowSec = 2.5; }
  return { id, name: a.name, tier: 'luyenkhi', coef: d.coef, cdMs: d.cdMs, cost: d.mana, range: d.range, element: '', fx: Object.keys(fx).length ? fx : null, fxText: d.text, desc: `Chiến kỹ tự sáng tạo của tông — khai sáng bởi ${a.creatorName}.`, sectArt: true };
}""")

# 2) normalizeEquipped: giữ ô chiêu của chiến kỹ tông còn hợp lệ
rep("""    b.main = (b.main || []).filter((id, i, a) => learned.includes(id) && a.indexOf(id) === i && !(SKILL_BY_ID[id] && SKILL_BY_ID[id].tier === 'phaptuong')).slice(0, slotCountFor(p)); // GĐ184: chiêu Pháp Tướng chỉ dùng khi hiện hình — không vào bảng thường""",
    """    b.main = (b.main || []).filter((id, i, a) => (learned.includes(id) || sectArtSkillOk(p, id)) && a.indexOf(id) === i && !(SKILL_BY_ID[id] && SKILL_BY_ID[id].tier === 'phaptuong')).slice(0, slotCountFor(p)); // GĐ184: chiêu Pháp Tướng chỉ dùng khi hiện hình — không vào bảng thường // GĐ329: giữ chiến kỹ tông còn hợp lệ""")

# 3) equip_skill: cho phép lắp chiến kỹ tông đã học
rep("""    if (!(player.skills || []).includes(data.skillId)) {
      socket.emit('interact_error', { message: 'Chưa học công pháp này.' });
      return;
    }""",
    """    if (!(player.skills || []).includes(data.skillId) && !sectArtSkillOk(player, data.skillId)) {
      socket.emit('interact_error', { message: 'Chưa học công pháp này.' });
      return;
    }""")

# 4) cast_skill: tra thêm định nghĩa chiến kỹ tông
rep("""    const skill = skillId ? skillById(player.classId, skillId) : null;""",
    """    const skill = skillId ? skillById(player.classId, skillId) || sectArtSkillDefOf(player, skillId) : null; // GĐ329: + chiến kỹ tự sáng tạo của tông""")

# 5) Payload: thanh chiêu hiện chiến kỹ tông
rep("""    skills: equippedOf(p)
      .map((id) => skillById(p.classId, id))""",
    """    skills: equippedOf(p)
      .map((id) => skillById(p.classId, id) || sectArtSkillDefOf(p, id)) // GĐ329: + chiến kỹ tông""")

# 6) Payload catalog: chiến kỹ tông hiện trong Sổ Công Pháp
rep("""      for (const sk of VM_SKILLS[p.classId] || []) {
        if ((p.skills || []).includes(sk.id)) push(sk, false);
      }
      return out;""",
    """      for (const sk of VM_SKILLS[p.classId] || []) {
        if ((p.skills || []).includes(sk.id)) push(sk, false);
      }
      // GĐ329: chiến kỹ tự sáng tạo của tông — hiện trong Sổ để lắp/tháo như chiêu thường
      { const g329 = p.token ? sectOfToken(p.token) : null;
        if (g329) for (const a of sectArtsOf(g329)) { if (a.kind !== 'chienky' || a.status !== 'done' || !(p.sectArts || []).includes(a.id)) continue; const d329 = sectArtSkillStats(a); out.push({ id: 'art:' + a.id, name: a.name, tier: 'luyenkhi', coef: d329.coef, cdMs: d329.cdMs, cost: d329.mana, range: d329.range, element: '', weaponId: '', condText: 'Chiến kỹ của tông ' + g329.name, condMet: true, hpCostPct: 0, desc: 'Chiến kỹ tự sáng tạo — khai sáng bởi ' + a.creatorName + '.', fxText: d329.text, learned: true, equipped: equippedOf(p).includes('art:' + a.id), equippedUtil: false, utility: false, isLearning: false }); } }
      return out;""")

# 7) sect_state: catalog cho form thêm bảng CK; mỗi pháp thêm kind + số chiêu
rep("""    mySect.artCatalog = { grades: SECT_ART_GRADES, comps: SECT_ART_COMPS, flaws: SECT_ART_FLAWS, flawBonus: SECT_ART_FLAW_BONUS };""",
    """    mySect.artCatalog = { grades: SECT_ART_GRADES, comps: SECT_ART_COMPS, flaws: SECT_ART_FLAWS, flawBonus: SECT_ART_FLAW_BONUS, compsCk: SECT_ART_COMPS_CK, flawsCk: SECT_ART_FLAWS_CK };""")
rep("""learnCost: gd.learn || 0 }; });""",
    """learnCost: gd.learn || 0, kind: a.kind || 'tamphap', skill: a.kind === 'chienky' ? sectArtSkillStats(a) : null }; });""")

io.open(P, 'w', encoding='utf-8').write(s)
print('gd329a OK')
