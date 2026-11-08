# GĐ329b — sect_art_create phân nhánh theo thể loại (tâm pháp / chiến kỹ) + toggle chặn chiến kỹ
import io
P = 'server/index.js'
s = io.open(P, encoding='utf-8').read()

def rep(old, new, n=1):
    global s
    c = s.count(old)
    assert c == n, 'anchor %dx (want %d): %s' % (c, n, old[:80])
    s = s.replace(old, new)

rep("""    const compsIn = (data.comps && typeof data.comps === 'object') ? data.comps : {};
    const comps = {}; let weight = 0; let units = 0;
    for (const cd of SECT_ART_COMPS) { const u = Math.max(0, Math.min(cd.max, Math.floor(Number(compsIn[cd.id]) || 0))); if (u > 0) { comps[cd.id] = u; weight += cd.w * u; units += u; } }
    if (!units) { socket.emit('interact_error', { message: 'Công pháp phải có ít nhất 1 thành phần hiệu ứng.' }); return; }
    const flaw = SECT_ART_FLAWS.find((f) => f.id === String(data.flawId || ''));""",
    """    const isCk329 = data.kind === 'chienky'; // GĐ329: chiến kỹ ghép theo bảng riêng (sát thương/tầm/vùng/chậm), khuyết điểm riêng
    const compTable329 = isCk329 ? SECT_ART_COMPS_CK : SECT_ART_COMPS;
    const flawTable329 = isCk329 ? SECT_ART_FLAWS_CK : SECT_ART_FLAWS;
    const compsIn = (data.comps && typeof data.comps === 'object') ? data.comps : {};
    const comps = {}; let weight = 0; let units = 0;
    for (const cd of compTable329) { const u = Math.max(0, Math.min(cd.max, Math.floor(Number(compsIn[cd.id]) || 0))); if (u > 0) { comps[cd.id] = u; weight += cd.w * u; units += u; } }
    if (!units) { socket.emit('interact_error', { message: 'Công pháp phải có ít nhất 1 thành phần hiệu ứng.' }); return; }
    const flaw = flawTable329.find((f) => f.id === String(data.flawId || ''));""")

rep("""comps, flaw: flaw.id, status: 'researching', progress: 0, need: grade.research, day: worldClock().dayIndex };""",
    """comps, flaw: flaw.id, kind: isCk329 ? 'chienky' : 'tamphap', status: 'researching', progress: 0, need: grade.research, day: worldClock().dayIndex };""")

rep("""  socket.on('sect_art_toggle', (data) => { // GĐ328: bật/tắt vận hành pháp đã học (tối đa 2 cùng lúc)
    if (!player || !data) return;
    const g = sectOfToken(player.token); if (!g) return;
    ensureSectV2(g);
    const art = sectArtsOf(g).find((a) => a.id === String(data.artId || ''));
    if (!art || art.status !== 'done') return;""",
    """  socket.on('sect_art_toggle', (data) => { // GĐ328: bật/tắt vận hành pháp đã học (tối đa 2 cùng lúc)
    if (!player || !data) return;
    const g = sectOfToken(player.token); if (!g) return;
    ensureSectV2(g);
    const art = sectArtsOf(g).find((a) => a.id === String(data.artId || ''));
    if (!art || art.status !== 'done') return;
    if (art.kind === 'chienky') { socket.emit('interact_error', { message: 'Chiến kỹ không vận hành như tâm pháp — mở Sổ Công Pháp để LẮP vào ô chiêu rồi tung bằng phím số.' }); return; } // GĐ329""")

io.open(P, 'w', encoding='utf-8').write(s)
print('gd329b OK')
