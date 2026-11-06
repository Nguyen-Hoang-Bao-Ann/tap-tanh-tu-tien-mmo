# GĐ328a — Sáng tạo công pháp tông môn: bảng + hàm phụ + kênh hiệu ứng + state + móc ngộ pháp
import io, sys
P = 'server/index.js'
s = io.open(P, encoding='utf-8').read()

def rep(old, new, n=1):
    global s
    c = s.count(old)
    assert c == n, 'anchor %dx (want %d): %s' % (c, n, old[:80])
    s = s.replace(old, new)

# 1) Bảng + hàm phụ sau khối SECT_TECH
rep("""const SECT_ACTING_DAYS = 14, SECT_SUCCESSION_DAYS = 30; // TẠM: ngày game Tông chủ vắng mặt""",
    """const SECT_ACTING_DAYS = 14, SECT_SUCCESSION_DAYS = 30; // TẠM: ngày game Tông chủ vắng mặt
// ===== GĐ328: SÁNG TẠO CÔNG PHÁP TÔNG MÔN (ý Bảo 06/11: Tông chủ/Phó/Trưởng Lão Danh Dự tự sáng tạo pháp riêng cho tông; mọi số TẠM — THIET_KE_SANG_TAO_CONG_PHAP.md) =====
const SECT_ART_COMPS = [
  { id: 'cong', name: 'Công', per: 1, w: 2, max: 5 },
  { id: 'phong', name: 'Phòng', per: 1, w: 2, max: 5 },
  { id: 'toc', name: 'Tốc', per: 1, w: 2, max: 4 },
  { id: 'mau', name: 'Máu', per: 1, w: 3, max: 4 },
  { id: 'thien', name: 'Thiền', per: 2, w: 2, max: 5 },
  { id: 'che', name: 'Chế', per: 2, w: 2, max: 4 },
];
const SECT_ART_FLAWS = [
  { id: 'f_cong', name: 'Tổn Công', comp: 'cong', amt: -3 },
  { id: 'f_phong', name: 'Tổn Phòng', comp: 'phong', amt: -3 },
  { id: 'f_toc', name: 'Trì Trệ', comp: 'toc', amt: -3 },
  { id: 'f_mau', name: 'Hư Huyết', comp: 'mau', amt: -3 },
  { id: 'f_thien', name: 'Tạp Niệm', comp: 'thien', amt: -6 },
  { id: 'f_che', name: 'Vụng Về', comp: 'che', amt: -6 },
];
const SECT_ART_FLAW_BONUS = 4; // chọn khuyết điểm được cộng thêm ngân sách
const SECT_ART_GRADES = [
  { id: 'pham', name: 'Phàm cấp', budget: 10, minRealm: 1, minSectLv: 1, minTk: 1, fund: 2000, minUy: 10, trung: 0, thuong: 0, mats: { linh_thao: 10 }, research: 100, life: 0, learn: 150 },
  { id: 'linh', name: 'Linh cấp', budget: 16, minRealm: 2, minSectLv: 2, minTk: 1, fund: 6000, minUy: 30, trung: 300, thuong: 0, mats: { tien_linh_chi: 3 }, research: 250, life: 0, learn: 300 },
  { id: 'huyen', name: 'Huyền cấp', budget: 24, minRealm: 3, minSectLv: 3, minTk: 2, fund: 15000, minUy: 60, trung: 800, thuong: 0, mats: { da_quy: 5 }, research: 500, life: 0, learn: 500 },
  { id: 'dia', name: 'Địa cấp', budget: 34, minRealm: 4, minSectLv: 4, minTk: 2, fund: 40000, minUy: 120, trung: 0, thuong: 300, mats: { da_quy: 10, tien_linh_chi: 5 }, research: 1000, life: 2, learn: 800 },
  { id: 'thien', name: 'Thiên cấp', budget: 46, minRealm: 5, minSectLv: 5, minTk: 3, fund: 100000, minUy: 250, trung: 0, thuong: 1000, mats: { da_quy: 20 }, research: 2000, life: 5, learn: 1200 },
];
const SECT_ART_DONATE_PTS = { da_quy: 8, tien_linh_chi: 6, thanh_thao: 2, nanh_soi: 2, canh_doi: 2, xuong_thu: 2 }; // điểm ngộ khi nộp vật phẩm (món khác = 1)
function sectArtsOf(g) { if (!g) return []; if (!Array.isArray(g.arts)) g.arts = []; return g.arts; }
function sectArtCanCreate(g, token) { if (!g) return false; const m = (g.members || []).find((x) => x.token === token); if (!m) return false; return m.role === 'chu' || m.role === 'pho' || (Array.isArray(g.honor) && g.honor.includes(token)); }
function sectArtFxOf(p) {
  const fx = { cong: 0, phong: 0, toc: 0, mau: 0, thien: 0, che: 0 };
  if (!p || !p.token || p.isCompanion || !Array.isArray(p.sectArtsActive) || !p.sectArtsActive.length) return fx;
  const g = sectOfToken(p.token); if (!g) return fx;
  for (const id of p.sectArtsActive) {
    const a = sectArtsOf(g).find((x) => x.id === id && x.status === 'done'); if (!a) continue;
    for (const cid of Object.keys(a.comps || {})) { const cd = SECT_ART_COMPS.find((c) => c.id === cid); if (cd) fx[cid] += cd.per * (a.comps[cid] || 0); }
    const fl = SECT_ART_FLAWS.find((f) => f.id === a.flaw); if (fl) fx[fl.comp] += fl.amt;
  }
  return fx;
}
function sectArtHpMulOf(p) { return 1 + sectArtFxOf(p).mau / 100; }
function sectArtCraftBonus(p) { return Math.max(0, sectArtFxOf(p).che) / 100; }
function addArtResearch(g, pts) {
  const a = sectArtsOf(g).find((x) => x.status === 'researching'); if (!a || !(pts > 0)) return;
  a.progress = Math.min(a.need || 0, (a.progress || 0) + pts);
  if (a.progress >= (a.need || 0)) { a.status = 'done'; sectLog(g, `Công pháp tự sáng tạo “${a.name}” (${a.gradeName}) đã NGỘ THÀNH — tới Tàng Kinh Các để học.`); sectNotify(g, `📜 Công pháp “${a.name}” của tông đã NGỘ THÀNH! Tới Tàng Kinh Các ở trụ sở để lĩnh ngộ.`); }
  saveWorld(); pushSectStateEveryone();
}""")

# 2) Kênh thiền: gộp hệ số pháp tự tạo vào sectTechMedMulOf
rep("""function sectTechMedMulOf(p) { return sectTechHas(p, 'tu_linh') ? 1.05 : 1; }""",
    """function sectTechMedMulOf(p) { return (sectTechHas(p, 'tu_linh') ? 1.05 : 1) * (1 + sectArtFxOf(p).thien / 100); } // GĐ328: x hệ số Thiền của pháp tự tạo đang vận hành""")

# 3) effStatsOf: kênh công/phòng/tốc của pháp tự tạo (sau khối tông pháp GĐ326)
rep("""    if (p.sectTech.includes('cap_hanh')) { eff.tocDo = Math.round((eff.tocDo || 0) * 1.03); }
  }""",
    """    if (p.sectTech.includes('cap_hanh')) { eff.tocDo = Math.round((eff.tocDo || 0) * 1.03); }
  }
  // GĐ328: CÔNG PHÁP TỰ SÁNG TẠO — chỉ pháp đang vận hành mới cộng (sectArtFxOf đã gồm cả khuyết điểm)
  if (p && p.token && !p.isCompanion && Array.isArray(p.sectArtsActive) && p.sectArtsActive.length) { const afx = sectArtFxOf(p);
    if (afx.cong) { eff.vatCong = Math.round((eff.vatCong || 0) * (1 + afx.cong / 100)); eff.phapCong = Math.round((eff.phapCong || 0) * (1 + afx.cong / 100)); }
    if (afx.phong) { eff.vatPhong = Math.round((eff.vatPhong || 0) * (1 + afx.phong / 100)); eff.phapPhong = Math.round((eff.phapPhong || 0) * (1 + afx.phong / 100)); }
    if (afx.toc) { eff.tocDo = Math.round((eff.tocDo || 0) * (1 + afx.toc / 100)); }
  }""")

# 4) maxHpEff: kênh máu
rep("""return Math.round(m * ptMulOf(p) * raceHpMulOf(p));""",
    """return Math.round(m * ptMulOf(p) * raceHpMulOf(p) * sectArtHpMulOf(p));""")

# 5) Tỉ lệ chế: cộng kênh Chế của pháp tự tạo
rep("""+ sectHqCraftBonus(player, rc.jobId)""",
    """+ sectHqCraftBonus(player, rc.jobId) + sectArtCraftBonus(player)""")

# 6) ensureSectV2: mặc định arts/honor
rep("""  if (!Array.isArray(g.buildings)) g.buildings = []; // GĐ319: công trình quanh bia""",
    """  if (!Array.isArray(g.buildings)) g.buildings = []; // GĐ319: công trình quanh bia
  if (!Array.isArray(g.arts)) g.arts = []; // GĐ328: công pháp tự sáng tạo của tông
  if (!Array.isArray(g.honor)) g.honor = []; // GĐ328: Trưởng Lão Danh Dự (token)""")

# 7) sectStateFor: danh sách pháp + quyền sáng tạo + catalog cho form + cờ danh dự ở thành viên
rep("""    mySect.techs = SECT_TECH.map((t) => ({ id: t.id, name: t.name, cost: t.cost, desc: t.desc, learned: (p.sectTech || []).includes(t.id) }));""",
    """    mySect.techs = SECT_TECH.map((t) => ({ id: t.id, name: t.name, cost: t.cost, desc: t.desc, learned: (p.sectTech || []).includes(t.id) }));
    // GĐ328: công pháp tự sáng tạo của tông
    mySect.arts = sectArtsOf(mine).map((a) => { const gd = SECT_ART_GRADES.find((x) => x.id === a.grade) || {}; return { id: a.id, name: a.name, grade: a.grade, gradeName: a.gradeName, creatorName: a.creatorName, element: a.element, comps: a.comps, flaw: a.flaw, status: a.status, progress: a.progress || 0, need: a.need || 0, learned: (p.sectArts || []).includes(a.id), active: (p.sectArtsActive || []).includes(a.id), learnCost: gd.learn || 0 }; });
    mySect.artSlots = sectLevelOf(mine);
    mySect.canCreateArt = sectArtCanCreate(mine, token);
    mySect.artCatalog = { grades: SECT_ART_GRADES, comps: SECT_ART_COMPS, flaws: SECT_ART_FLAWS, flawBonus: SECT_ART_FLAW_BONUS };""")
rep("""    mySect.members = mySect.members.map((m) => ({ ...m, muted: !!((mine.muted || {})[m.token] > worldMinutes), chapPhap: isChapPhapHead(mine, m.token) }));""",
    """    mySect.members = mySect.members.map((m) => ({ ...m, muted: !!((mine.muted || {})[m.token] > worldMinutes), chapPhap: isChapPhapHead(mine, m.token), honor: !!((mine.honor || []).includes(m.token)) }));""")

# 8) Việc Bảng hoàn thành -> +10 điểm ngộ
rep("""  if (q.rewardUy) sectUyAdd(g, q.rewardUy);""",
    """  if (q.rewardUy) sectUyAdd(g, q.rewardUy);
  addArtResearch(g, 10); // GĐ328: cả tông làm việc Bảng cũng góp phần ngộ pháp đang sáng tạo""")

# 9) Ngày mới -> +5 điểm ngộ (chặn trùng bằng artDay)
rep("""  if (terrN322 && g.tributeDay !== today) { g.tributeDay = today; g.fund = (g.fund || 0) + TERR_TRIBUTE * terrN322; sectUyAdd(g, 5 * terrN322); } // GĐ302 + GĐ322: mỗi lãnh địa +500 LT triều cống + 5 Tông Uy mỗi ngày game""",
    """  if (terrN322 && g.tributeDay !== today) { g.tributeDay = today; g.fund = (g.fund || 0) + TERR_TRIBUTE * terrN322; sectUyAdd(g, 5 * terrN322); } // GĐ302 + GĐ322: mỗi lãnh địa +500 LT triều cống + 5 Tông Uy mỗi ngày game
  if (g.artDay !== today) { g.artDay = today; if (sectArtsOf(g).some((a) => a.status === 'researching')) addArtResearch(g, 5); } // GĐ328: pháp đang ngộ tự tiến 5 điểm/ngày game""")

io.open(P, 'w', encoding='utf-8').write(s)
print('gd328a OK')
