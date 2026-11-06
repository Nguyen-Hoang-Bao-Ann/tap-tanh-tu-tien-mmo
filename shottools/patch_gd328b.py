# GĐ328b — handlers sáng tạo/học/vận hành/phế pháp + Trưởng Lão Danh Dự + lưu trữ sectArts
import io
P = 'server/index.js'
s = io.open(P, encoding='utf-8').read()

def rep(old, new, n=1):
    global s
    c = s.count(old)
    assert c == n, 'anchor %dx (want %d): %s' % (c, n, old[:80])
    s = s.replace(old, new)

HANDLERS = """  socket.on('sect_honor_set', (data) => { // GĐ328: Tông chủ phong/bãi Trưởng Lão Danh Dự (mang quyền sáng tạo công pháp; tối đa 2)
    if (!player || !data) return;
    const g = sectOfToken(player.token); if (!g) return;
    ensureSectV2(g);
    if (!sectChairedBy(g, player.token)) { socket.emit('interact_error', { message: 'Chỉ Tông chủ (hoặc Quyền Tông chủ) mới phong Trưởng Lão Danh Dự.' }); return; }
    const m = g.members.find((x) => x.token === String(data.token || ''));
    if (!m || m.role !== 'truonglao') { socket.emit('interact_error', { message: 'Chỉ phong Danh Dự cho Trưởng lão của tông.' }); return; }
    g.honor = Array.isArray(g.honor) ? g.honor : [];
    if (data.on) { if (!g.honor.includes(m.token)) { if (g.honor.length >= 2) { socket.emit('interact_error', { message: 'Tối đa 2 Trưởng Lão Danh Dự.' }); return; } g.honor.push(m.token); sectLog(g, `${player.name} phong ${m.name} làm Trưởng Lão Danh Dự — được quyền sáng tạo công pháp cho tông.`); } }
    else { g.honor = g.honor.filter((t) => t !== m.token); sectLog(g, `${m.name} thôi giữ chức Trưởng Lão Danh Dự.`); }
    saveWorld(); pushSectStateEveryone();
    socket.emit('notice', { text: data.on ? `🏯 ${m.name} đã là Trưởng Lão Danh Dự.` : `🏯 ${m.name} thôi chức Danh Dự.` });
  });
  socket.on('sect_art_create', (data) => { // GĐ328: sáng tạo công pháp riêng cho tông — ghép thành phần trong ngân sách, bắt buộc 1 khuyết điểm, trả nhiều loại chi phí
    if (!player || !data) return;
    const g = sectOfToken(player.token); if (!g) return;
    ensureSectV2(g);
    if (!sectArtCanCreate(g, player.token)) { socket.emit('interact_error', { message: 'Chỉ Tông chủ, Phó tông chủ và Trưởng Lão Danh Dự mới sáng tạo được công pháp cho tông.' }); return; }
    const grade = SECT_ART_GRADES.find((x) => x.id === String(data.gradeId || ''));
    if (!grade) return;
    if (sectArtsOf(g).length >= sectLevelOf(g)) { socket.emit('interact_error', { message: `Tông cấp ${sectLevelOf(g)} chỉ chứa tối đa ${sectLevelOf(g)} công pháp tự sáng tạo. Thăng cấp tông hoặc phế bớt pháp cũ.` }); return; }
    if (sectLevelOf(g) < grade.minSectLv) { socket.emit('interact_error', { message: `${grade.name} cần tông đạt cấp ${grade.minSectLv}.` }); return; }
    const tk = (g.buildings || []).find((x) => x.kind === 'tangkinh');
    if (!g.hq || !tk) { socket.emit('interact_error', { message: 'Tông chưa dựng Tàng Kinh Các ở trụ sở.' }); return; }
    if ((tk.lv || 1) < grade.minTk) { socket.emit('interact_error', { message: `${grade.name} cần Tàng Kinh Các cấp ${grade.minTk} (hiện cấp ${tk.lv || 1}) — nâng cấp công trình trước.` }); return; }
    const myRealmIdx = SECT_REALM_IDS.indexOf(player.realm || 'pham');
    if (myRealmIdx < grade.minRealm) { socket.emit('interact_error', { message: `${grade.name} cần người sáng tạo đạt ${REALM_NAMES[SECT_REALM_IDS[grade.minRealm]] || ''} trở lên.` }); return; }
    if ((g.uy || 0) < grade.minUy) { socket.emit('interact_error', { message: `Cần Tông Uy ${grade.minUy} (tông đang có ${g.uy || 0}).` }); return; }
    const name = String(data.name || '').trim();
    if (name.length < 3 || name.length > 24 || /[<>{}\\\\]/.test(name)) { socket.emit('interact_error', { message: 'Tên công pháp phải dài 3–24 ký tự, không chứa ký tự lạ.' }); return; }
    if (sectArtsOf(g).some((a) => a.name.toLowerCase() === name.toLowerCase())) { socket.emit('interact_error', { message: 'Tông đã có công pháp mang tên này.' }); return; }
    const compsIn = (data.comps && typeof data.comps === 'object') ? data.comps : {};
    const comps = {}; let weight = 0; let units = 0;
    for (const cd of SECT_ART_COMPS) { const u = Math.max(0, Math.min(cd.max, Math.floor(Number(compsIn[cd.id]) || 0))); if (u > 0) { comps[cd.id] = u; weight += cd.w * u; units += u; } }
    if (!units) { socket.emit('interact_error', { message: 'Công pháp phải có ít nhất 1 thành phần hiệu ứng.' }); return; }
    const flaw = SECT_ART_FLAWS.find((f) => f.id === String(data.flawId || ''));
    if (!flaw) { socket.emit('interact_error', { message: 'Phải chọn đúng 1 khuyết điểm cho công pháp — không có pháp nào hoàn hảo.' }); return; }
    if (weight > grade.budget + SECT_ART_FLAW_BONUS) { socket.emit('interact_error', { message: `Vượt ngân sách: ghép ${weight} trọng số, tối đa ${grade.budget + SECT_ART_FLAW_BONUS} (${grade.name} ${grade.budget} + khuyết điểm ${SECT_ART_FLAW_BONUS}).` }); return; }
    if ((g.fund || 0) < grade.fund) { socket.emit('interact_error', { message: `Quỹ tông cần ${grade.fund.toLocaleString('vi-VN')} LT (đang có ${(g.fund || 0).toLocaleString('vi-VN')}).` }); return; }
    if ((player.stonesTrung || 0) < grade.trung) { socket.emit('interact_error', { message: `Người sáng tạo cần trả ${grade.trung} LT Trung phẩm (đang có ${player.stonesTrung || 0}).` }); return; }
    if ((player.stonesThuong || 0) < grade.thuong) { socket.emit('interact_error', { message: `Người sáng tạo cần trả ${grade.thuong} LT Thượng phẩm (đang có ${player.stonesThuong || 0}).` }); return; }
    for (const mid of Object.keys(grade.mats)) if (((player.inventory || {})[mid] || 0) < grade.mats[mid]) { socket.emit('interact_error', { message: `Thiếu nguyên liệu: cần ${grade.mats[mid]} × ${((ITEMS[mid] || {}).name || mid)} (đang có ${(player.inventory || {})[mid] || 0}).` }); return; }
    if (grade.life > 0) { const remain = (player.lifespan || 0) - ageOf(player); if (remain < grade.life + 5) { socket.emit('interact_error', { message: `Sáng tạo ${grade.name} đốt ${grade.life} năm thọ nguyên — thọ còn lại của bạn (${remain} năm) không đủ an toàn (cần còn dư ít nhất 5 năm).` }); return; } }
    g.fund -= grade.fund;
    player.stonesTrung = (player.stonesTrung || 0) - grade.trung;
    player.stonesThuong = (player.stonesThuong || 0) - grade.thuong;
    for (const mid of Object.keys(grade.mats)) player.inventory[mid] -= grade.mats[mid];
    if (grade.life > 0) player.lifespan = (player.lifespan || 0) - grade.life;
    const art = { id: 'a' + Date.now().toString(36) + Math.floor(Math.random() * 1296).toString(36), name, grade: grade.id, gradeName: grade.name, creator: player.token, creatorName: player.name, element: (player.linhCan || {}).element || 'tho', comps, flaw: flaw.id, status: 'researching', progress: 0, need: grade.research, day: worldClock().dayIndex };
    sectArtsOf(g).push(art);
    sectLog(g, `${player.name} bắt đầu SÁNG TẠO công pháp ${grade.name} “${name}” — cả tông cùng góp sức ngộ pháp.`);
    sectNotify(g, `📜 ${player.name} bắt đầu sáng tạo công pháp ${grade.name} “${name}” cho tông! Cả tông làm việc Bảng Ủy Thác và nộp vật phẩm ở panel Tông Môn để góp phần ngộ pháp.`);
    saveWorld(); persistPlayer(player); syncPlayerSocket(player); pushSectStateEveryone();
    socket.emit('notice', { text: `📜 Đã khởi sáng “${name}” (${grade.name}) — pháp đang NGỘ, cần ${grade.research} điểm tiến độ. Quỹ −${grade.fund.toLocaleString('vi-VN')} LT${grade.life ? `, thọ nguyên −${grade.life} năm` : ''}.` });
  });
  socket.on('sect_art_donate', (data) => { // GĐ328: nộp vật phẩm góp điểm ngộ pháp (điểm theo độ hiếm — SECT_ART_DONATE_PTS, món thường 1)
    if (!player || !data) return;
    const g = sectOfToken(player.token); if (!g) return;
    ensureSectV2(g);
    if (!sectArtsOf(g).some((a) => a.status === 'researching')) { socket.emit('interact_error', { message: 'Hiện không có công pháp nào đang ngộ.' }); return; }
    const itemId = String(data.itemId || '');
    if (!ITEMS[itemId]) return;
    const qty = Math.max(1, Math.min(99, Math.floor(Number(data.qty) || 1)));
    if (((player.inventory || {})[itemId] || 0) < qty) { socket.emit('interact_error', { message: 'Không đủ vật phẩm để nộp.' }); return; }
    player.inventory[itemId] -= qty;
    const pts = (SECT_ART_DONATE_PTS[itemId] || 1) * qty;
    addArtResearch(g, pts);
    persistPlayer(player); syncPlayerSocket(player); pushSectState(player);
    socket.emit('notice', { text: `📜 Đã nộp ${qty} × ${(ITEMS[itemId] || {}).name || itemId} — góp +${pts} điểm ngộ pháp.` });
  });
  socket.on('sect_art_learn', (data) => { // GĐ328: học công pháp tự sáng tạo ở Tàng Kinh Các (Nội Môn trở lên, tốn Tông Cống theo cấp pháp)
    if (!player || !data) return;
    const g = sectOfToken(player.token); if (!g) return;
    ensureSectV2(g);
    const art = sectArtsOf(g).find((a) => a.id === String(data.artId || ''));
    if (!art) return;
    if (art.status !== 'done') { socket.emit('interact_error', { message: 'Công pháp này còn đang ngộ, chưa học được.' }); return; }
    player.sectArts = Array.isArray(player.sectArts) ? player.sectArts : [];
    if (player.sectArts.includes(art.id)) { socket.emit('interact_error', { message: 'Bạn đã học công pháp này rồi.' }); return; }
    const b = (g.buildings || []).find((x) => x.kind === 'tangkinh');
    if (!g.hq || !b) { socket.emit('interact_error', { message: 'Tông chưa dựng Tàng Kinh Các ở trụ sở.' }); return; }
    if (mapOf(player) !== g.hq.mapId || Math.hypot(player.x - b.x, player.y - b.y) > 350) { socket.emit('interact_error', { message: 'Tới Tàng Kinh Các ở trụ sở tông để học công pháp.' }); return; }
    const me = g.members.find((m) => m.token === player.token);
    if (!me || sectTierOf(g, me) === 'ngoaemon') { socket.emit('interact_error', { message: 'Công pháp tự sáng tạo chỉ truyền cho Nội Môn trở lên (Tông Cống từ 100).' }); return; }
    const grade = SECT_ART_GRADES.find((x) => x.id === art.grade) || {};
    if ((me.contrib || 0) < (grade.learn || 0)) { socket.emit('interact_error', { message: `Cần ${grade.learn} Tông Cống (bạn đang có ${me.contrib || 0}).` }); return; }
    me.contrib -= grade.learn || 0;
    player.sectArts.push(art.id);
    sectLog(g, `${player.name} lĩnh ngộ công pháp “${art.name}” (−${grade.learn} Tông Cống).`);
    saveWorld(); persistPlayer(player); syncPlayerSocket(player); pushSectState(player);
    socket.emit('notice', { text: `📜 Đã lĩnh ngộ “${art.name}” (${art.gradeName}, khai sáng bởi ${art.creatorName}). Bật VẬN HÀNH trong panel Tông Môn để pháp có hiệu lực (tối đa 2 pháp cùng lúc).` });
  });
  socket.on('sect_art_toggle', (data) => { // GĐ328: bật/tắt vận hành pháp đã học (tối đa 2 cùng lúc)
    if (!player || !data) return;
    const g = sectOfToken(player.token); if (!g) return;
    ensureSectV2(g);
    const art = sectArtsOf(g).find((a) => a.id === String(data.artId || ''));
    if (!art || art.status !== 'done') return;
    player.sectArts = Array.isArray(player.sectArts) ? player.sectArts : [];
    if (!player.sectArts.includes(art.id)) { socket.emit('interact_error', { message: 'Bạn chưa học công pháp này.' }); return; }
    player.sectArtsActive = Array.isArray(player.sectArtsActive) ? player.sectArtsActive : [];
    if (player.sectArtsActive.includes(art.id)) player.sectArtsActive = player.sectArtsActive.filter((x) => x !== art.id);
    else { if (player.sectArtsActive.length >= 2) { socket.emit('interact_error', { message: 'Chỉ vận hành tối đa 2 công pháp tông cùng lúc — tắt bớt 1 pháp trước.' }); return; } player.sectArtsActive.push(art.id); }
    persistPlayer(player); syncPlayerSocket(player); pushSectState(player);
  });
  socket.on('sect_art_delete', (data) => { // GĐ328: Tông chủ phế công pháp (trống ô, không hoàn chi phí; pháp mất hiệu lực với mọi người)
    if (!player || !data) return;
    const g = sectOfToken(player.token); if (!g) return;
    ensureSectV2(g);
    if (!sectChairedBy(g, player.token)) { socket.emit('interact_error', { message: 'Chỉ Tông chủ (hoặc Quyền Tông chủ) mới phế được công pháp.' }); return; }
    const ix = sectArtsOf(g).findIndex((a) => a.id === String(data.artId || ''));
    if (ix < 0) return;
    const gone = g.arts[ix];
    g.arts.splice(ix, 1);
    sectLog(g, `${player.name} đã PHẾ công pháp “${gone.name}” (${gone.gradeName}).`);
    sectNotify(g, `📜 Công pháp “${gone.name}” đã bị phế — không còn hiệu lực với bất kỳ ai.`);
    saveWorld(); pushSectStateEveryone();
  });
"""

rep("""  socket.on('sect_building_upgrade', (data) => { // GĐ322: nâng cấp công trình tại trụ sở (tiền quỹ; TẠM cấp 2 = 20.000, cấp 3 = 50.000 LT)""",
    HANDLERS + """  socket.on('sect_building_upgrade', (data) => { // GĐ322: nâng cấp công trình tại trụ sở (tiền quỹ; TẠM cấp 2 = 20.000, cấp 3 = 50.000 LT)""")

# --- Lưu trữ sectArts / sectArtsActive (4 điểm như sectTech) ---
rep("""  c.sectTech = Array.isArray(p.sectTech) ? p.sectTech : []; // GĐ326: tông pháp Tàng Kinh Các đã học""",
    """  c.sectTech = Array.isArray(p.sectTech) ? p.sectTech : []; // GĐ326: tông pháp Tàng Kinh Các đã học
  c.sectArts = Array.isArray(p.sectArts) ? p.sectArts : []; c.sectArtsActive = Array.isArray(p.sectArtsActive) ? p.sectArtsActive : []; // GĐ328: công pháp tự sáng tạo đã học / đang vận hành""")
rep("""sectTech: Array.isArray(char.sectTech) ? char.sectTech : [], // GĐ319 + GĐ321 + GĐ326""",
    """sectTech: Array.isArray(char.sectTech) ? char.sectTech : [], sectArts: Array.isArray(char.sectArts) ? char.sectArts : [], sectArtsActive: Array.isArray(char.sectArtsActive) ? char.sectArtsActive : [], // GĐ319 + GĐ321 + GĐ326 + GĐ328""", n=2)
rep("""sectTech: Array.isArray(p.sectTech) ? p.sectTech : [], // GĐ326""",
    """sectTech: Array.isArray(p.sectTech) ? p.sectTech : [], sectArts: Array.isArray(p.sectArts) ? p.sectArts : [], sectArtsActive: Array.isArray(p.sectArtsActive) ? p.sectArtsActive : [], // GĐ326 + GĐ328""")

io.open(P, 'w', encoding='utf-8').write(s)
print('gd328b OK')
