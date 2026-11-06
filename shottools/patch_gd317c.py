# -*- coding: utf-8 -*-
# GĐ317c: vật phẩm ẩn + Hoán Vu Kiếp Hồn + chọn tộc + bền vững trường race/lifeLog.
import io
P = '/home/hatch/workspace/tap-tanh-tu-tien-mmo/server/index.js'
s = io.open(P, encoding='utf-8').read()
def rep(old, new, cnt=1):
    global s
    assert s.count(old) == cnt, 'ANCHOR x%d: %s' % (s.count(old), old[:90])
    s = s.replace(old, new)

# ===== Bền vững trường race (luật GĐ95: persist + 2 bản sao spawn) =====
rep("    blessing: char.blessing || null, blessingPending: !!char.blessingPending, // GĐ315",
    "    blessing: char.blessing || null, blessingPending: !!char.blessingPending, race: char.race || null, springDay: char.springDay ?? -1, // GĐ315 + GĐ317: chủng tộc + mốc Xuân Sinh của Hoa tộc (cả 2 bản sao spawn)", 2)
rep("  c.soul = p.soul || null; // GĐ314: hồn luân hồi (kiếp đã qua, đồ chuyển kiếp...) — thiếu chép là autosave xóa sạch",
    "  c.soul = p.soul ? soulNorm(p.soul) : null; // GĐ314: hồn bền qua các kiếp\n  c.race = p.race || null; c.springDay = p.springDay ?? -1; // GĐ317: chủng tộc + mốc Xuân Sinh")

# ===== Payload: race + soul mở rộng (vật phẩm ẩn, Hoán Vu, Kiếp Ký) =====
rep("    classId: p.classId,",
    "    classId: p.classId, race: raceOf(p), raceName: raceOf(p) ? RACES[p.race].name : null, // GĐ317: chủng tộc")
rep("      deficient: !!p.soul.deficient, shardsFound: p.soul.shardsFound || 0, shardPicks: p.soul.shardPicks || 0, cultPct: Math.round((cultMulOf(p) - 1) * 100),",
    """      deficient: !!p.soul.deficient, shardsFound: p.soul.shardsFound || 0, shardPicks: p.soul.shardPicks || 0, cultPct: Math.round((cultMulOf(p) - 1) * 100),
      relics: Object.keys(RACES).filter((k) => p.soul.relics && p.soul.relics[k]).map((k) => ({ race: k, name: RACES[k].relic, god: RACES[k].god })), // GĐ317
      relicTotal: Object.keys(RACES).length,
      hoanVu: p.soul.hoanVu && p.soul.hoanVu.learned ? { learned: true, cdLeft: Math.max(0, 500 - (Math.floor(worldClock().dayIndex / 360) - (p.soul.hoanVu.lastUseYear ?? -100000))) } : { learned: false }, // GĐ317
      lifeLog: Array.isArray(p.soul.lifeLog) ? p.soul.lifeLog : [], // GĐ317: Kiếp Ký
      visitedStudy: !!(p.counters && p.counters.storyStudy), // GĐ317: đã tới Văn Uyển (mở chương Nhân tộc)""")

# ===== finalize: ghi biên niên kiếp (lifeLog) =====
rep("  sl.lastLife = { classId: p.classId, realm: p.realm, tier: p.tier || 0, name: p.name };",
    """  sl.lastLife = { classId: p.classId, realm: p.realm, tier: p.tier || 0, name: p.name };
  sl.lifeLog = [...(sl.lifeLog || []), { name: p.name, classId: p.classId, realm: p.realm, tier: p.tier || 0, race: p.race || null, falls: sl.lastLifeFalls || 0, path: sl.pendingPath }].slice(-20); // GĐ317: biên niên cho Kiếp Ký""")

# ===== Tạo nhân vật: áp chủng tộc khi hồn đang chờ chọn tộc =====
rep("      deadPrev.soul = { ...sIn, consumed: true };",
    """      if (sIn.raceChoicePending && data && RACES[data.race]) { // GĐ317: THIÊN ĐẠO MÔN — hồn chọn chủng tộc cho kiếp mới
        char.race = data.race;
        char.stats = raceDistribute(data.race); // điểm gốc theo tộc (thiên lệch x2)
        char.lifespan = RACES[data.race].lifespan; // thọ theo tộc
        sIn.raceChoicePending = false;
      }
      deadPrev.soul = { ...sIn, consumed: true };""")

# ===== Điểm giấu 10 vật phẩm ẩn + tick cảm ứng (chèn sau tick mảnh hồn) =====
rep("""      // GĐ78: đói/khát — giao tranh hao thể lực (không áp cho đồng môn; Kim Đan+ tịch cốc)""",
"""        // GĐ317: VẬT PHẨM ẨN của 10 vị thần đầu tiên — cảm ứng trong 1500px, hiện hình khi <=95px.
        // Điểm giấu suy từ manh mối truyền thuyết (Đài Kiếp, cây cổ thụ, bãi trùm, Văn Uyển,
        // nghĩa địa, Tiên Môn, thượng nguồn, đỉnh băng, rừng thú...). Tìm đủ 10 -> mở Hoán Vu.
        if (p.soul && !p.isBot) {
          const spots317 = relicSpots();
          for (const rk of Object.keys(RACES)) {
            if (p.soul.relics && p.soul.relics[rk]) continue;
            const sp = spots317[rk]; if (!sp || sp.mapId !== mapOf(p)) continue;
            const dRel = Math.hypot(p.x - sp.x, p.y - sp.y);
            if (dRel <= 95) {
              if (!p.soul.relics) p.soul.relics = {};
              p.soul.relics[rk] = 1;
              const found = Object.keys(RACES).filter((k) => p.soul.relics[k]).length;
              emitNoticeTo(p, '✦ BẢO VẬT HIỆN HÌNH! Bạn tìm thấy ' + RACES[rk].relic + ' — di vật của ' + RACES[rk].god + '! (' + found + '/10 vật phẩm ẩn)');
              if (found >= 10 && !(p.soul.hoanVu && p.soul.hoanVu.learned)) { p.soul.hoanVu = { learned: 1, lastUseYear: -100000 }; emitNoticeTo(p, '🌌 ĐỦ 10 VẬT PHẨM ẨN! Công pháp HOÁN VU KIẾP HỒN đã mở trong panel Luân hồi — dùng nó để tự tọa hóa, qua Thiên Đạo Môn chọn chủng tộc cho kiếp mới (hồi chiêu 500 năm).'); }
              persistPlayer(p); syncPlayer(p);
            } else if (dRel <= 1500 && Date.now() - (p._relicHintAt || 0) > 8000) {
              p._relicHintAt = Date.now();
              emitNoticeTo(p, dRel > 900 ? '✧ Có một luồng khí tức cổ xưa thoang thoảng đâu đây…' : dRel > 400 ? '✧ Khí tức cổ xưa rõ dần — bảo vật của thần xưa ở gần đây.' : '✧ Bảo vật đang ở RẤT gần — khí tức nóng rực, hãy tìm quanh đây!');
            }
          }
          if (mapOf(p) === NHO_STUDY_MAP && p.counters && !p.counters.storyStudy) { p.counters.storyStudy = 1; } // GĐ317: tới Văn Uyển = mở chương Nhân tộc trong Thiên Mệnh Ký
        }
      // GĐ78: đói/khát — giao tranh hao thể lực (không áp cho đồng môn; Kim Đan+ tịch cốc)""")

# ===== Hàm relicSpots (chèn trước shardSpotsFor của GĐ315) =====
rep("function shardSpotsFor(p) {",
"""let RELIC_SPOTS = null;
function relicSpots() { // GĐ317: điểm giấu 10 vật phẩm ẩn — tính 1 lần từ dữ liệu map
  if (RELIC_SPOTS) return RELIC_SPOTS;
  const byMinRealm = (rk) => MAP_DEFS.filter((d) => !d.safe && d.minRealm === rk && MAP_RUNTIME.get(d.id)).sort((a, b) => a.id.localeCompare(b.id));
  const byTheme = (th) => MAP_DEFS.filter((d) => !d.safe && d.theme === th && MAP_RUNTIME.get(d.id)).sort((a, b) => a.id.localeCompare(b.id));
  const portalOf = (id) => { const rt = MAP_RUNTIME.get(id); return rt && rt.portal ? { mapId: id, x: rt.portal.x, y: rt.portal.y } : null; };
  const firstPortal = (list) => (list.length ? portalOf(list[0].id) : null);
  const dkMaps = byMinRealm('dk');
  let thanSpot = firstPortal(dkMaps);
  for (const d of dkMaps) { const rt = MAP_RUNTIME.get(d.id); if (rt && rt.landmark && rt.landmark.kind === 'daikiep') { thanSpot = { mapId: d.id, x: rt.landmark.x, y: rt.landmark.y }; break; } }
  RELIC_SPOTS = {
    nhan: portalOf(NHO_STUDY_MAP),
    than: thanSpot,
    hoa: { mapId: HOME_MAP, x: 1140, y: 1945 },
    ma: { mapId: HOME_MAP, x: 6105, y: 1230 },
    quy: firstPortal(byTheme('graveyard')) || firstPortal(byTheme('ghost_forest')),
    tien: portalOf('tien_mon_ngoai_vien') || firstPortal(byMinRealm('tn')),
    long: firstPortal(byTheme('stream')) || firstPortal(byMinRealm('na')),
    ho: firstPortal(byMinRealm('tc')),
    dieu: firstPortal(byTheme('ice')) || firstPortal(byTheme('ice_plain')),
    thu: firstPortal(byTheme('beast')) || firstPortal(byTheme('deep_forest')),
  };
  return RELIC_SPOTS;
}
function shardSpotsFor(p) {""")

# ===== Handler Hoán Vu Kiếp Hồn (sau rebirth_now) =====
rep("""    socket.emit('character_died', { name: nm, message: `${nm} đã chủ động tọa hóa — hồn bước vào luân hồi. Hãy tạo nhân vật mới để bắt đầu kiếp tu tiếp theo: ký ức, thành tựu và hành trang chuyển kiếp vẫn theo hồn.` });
  });
""",
"""    socket.emit('character_died', { name: nm, message: `${nm} đã chủ động tọa hóa — hồn bước vào luân hồi. Hãy tạo nhân vật mới để bắt đầu kiếp tu tiếp theo: ký ức, thành tựu và hành trang chuyển kiếp vẫn theo hồn.` });
  });

  // GĐ317: HOÁN VU KIẾP HỒN — công pháp ẩn đổi số mệnh (hồi chiêu 500 năm game)
  socket.on('soul_use_hoanvu', () => {
    if (!player) return;
    const sl = soulOf(player);
    if (!sl.hoanVu || !sl.hoanVu.learned) { socket.emit('interact_error', { message: 'Bạn chưa học được Hoán Vu Kiếp Hồn — hãy tìm đủ 10 vật phẩm ẩn của 10 vị thần đầu tiên.' }); return; }
    const year = Math.floor(worldClock().dayIndex / 360);
    const left = 500 - (year - (sl.hoanVu.lastUseYear ?? -100000));
    if (left > 0) { socket.emit('interact_error', { message: 'Hoán Vu Kiếp Hồn còn ' + left + ' năm nữa mới hồi lại.' }); return; }
    sl.hoanVu.lastUseYear = year;
    sl.raceChoicePending = true;
    persistPlayer(player);
    const nm = player.name;
    killCharacterPermanent(player, 'hoanvu');
    player = null;
    socket.emit('character_died', { name: nm, raceChoice: true, message: nm + ' đã thi triển Hoán Vu Kiếp Hồn — hồn bước qua Thiên Đạo Môn. Hãy tạo nhân vật mới và CHỌN CHỦNG TỘC cho kiếp này: hướng tu, vũ khí và linh căn sẽ làm mới lại từ đầu.' });
    io.emit('notice', { text: '🌌 ' + nm + ' thi triển HOÁN VU KIẾP HỒN — tự tọa hóa, hồn bước qua Thiên Đạo Môn chọn lại chủng tộc!' });
  });""")
rep("      socket.emit('character_died', { name: char.name, message: `${char.name} đã tọa hóa vĩnh viễn (hết thọ nguyên). Hãy tạo nhân vật mới để bắt đầu kiếp tu mới.` });",
    "      socket.emit('character_died', { name: char.name, raceChoice: !!(char.soul && soulNorm(char.soul).raceChoicePending), message: `${char.name} đã tọa hóa vĩnh viễn (hết thọ nguyên). Hãy tạo nhân vật mới để bắt đầu kiếp tu mới.` }); // GĐ317: mang cờ chờ chọn tộc nếu có")
rep("      socket.emit('character_died', { name: char.name, message: `${char.name} đã tọa hóa vĩnh viễn (hết thọ nguyên).` });",
    "      socket.emit('character_died', { name: char.name, raceChoice: !!(char.soul && soulNorm(char.soul).raceChoicePending), message: `${char.name} đã tọa hóa vĩnh viễn (hết thọ nguyên).` }); // GĐ317")

io.open(P, 'w', encoding='utf-8').write(s)
print('gd317 part3 OK')
