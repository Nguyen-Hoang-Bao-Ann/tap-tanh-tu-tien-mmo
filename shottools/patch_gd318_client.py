# GĐ318 client: panel Đệ tử + nút thoại cầu sư + nhãn "đệ tử của X"
import io
H = '/home/hatch/workspace/tap-tanh-tu-tien-mmo/client/index.html'
M = '/home/hatch/workspace/tap-tanh-tu-tien-mmo/client/src/main.ts'
h = io.open(H, encoding='utf-8').read()
m = io.open(M, encoding='utf-8').read()
def reph(old, new, n=1):
    global h
    assert h.count(old) == n, 'HTML %dx: %s' % (h.count(old), old[:60])
    h = h.replace(old, new)
def repm(old, new, n=1):
    global m
    assert m.count(old) == n, 'TS %dx: %s' % (m.count(old), old[:60])
    m = m.replace(old, new)

# --- index.html: panel + nut menu ---
reph('''      <div id="storyPanel" class="panel" style="display:none">''',
'''      <div id="disciplePanel" class="panel" style="display:none">
        <div class="panelHead"><span>🎓 Đệ tử — sư đồ</span><button class="xBtn" id="discipleClose" type="button">✕</button></div>
        <div id="discipleBody"></div>
        <p class="splash-note">Nhận đệ tử cần có tông môn người chơi và giữ chức Trưởng lão trở lên (hoặc tự lập tông). Quan hệ sư đồ là VĨNH VIỄN — đệ tử không tự rời được, chỉ sư phụ mới có quyền trục xuất. Đệ tử NPC chết trong trận là mất hẳn; đệ tử người chơi đạt Kim Đan sẽ thành tài.</p>
      </div>
      <div id="storyPanel" class="panel" style="display:none">''')
reph('''        <button class="menuAction" id="menuStoryBtn" type="button">📖 Thiên Mệnh Ký (cốt truyện)</button>''',
'''        <button class="menuAction" id="menuStoryBtn" type="button">📖 Thiên Mệnh Ký (cốt truyện)</button>
        <button class="menuAction" id="menuDiscipleBtn" type="button">🎓 Đệ tử (sư đồ)</button>''')

# --- main.ts: type TickPlayer + NpcDialogData ---
repm("  psectx?: string; // GĐ302: tên tông NGƯỜI CHƠI của nhân vật này",
"  psectx?: string; // GĐ302: tên tông NGƯỜI CHƠI của nhân vật này\n  disc?: string; // GĐ318: tên sư phụ nếu entity này là đệ tử NPC")
repm("  festivalInfo?: any; // GĐ217: chỉ có khi nói chuyện với Lão Tư Lễ",
"  festivalInfo?: any; // GĐ217: chỉ có khi nói chuyện với Lão Tư Lễ\n  discipleCandidate?: any; // GĐ318: thiếu niên cầu sư — hiện nút Nhận làm đệ tử")

# --- nhan "de tu cua X": khai bao + tao + cap nhat + an/hien ---
repm("  sectLabel: Phaser.GameObjects.Text; // GĐ302: tên tông người chơi (dòng nhỏ trên tên)",
"  sectLabel: Phaser.GameObjects.Text; // GĐ302: tên tông người chơi (dòng nhỏ trên tên)\n  discLabel: Phaser.GameObjects.Text; // GĐ318: dòng 'đệ tử của X' dưới tên\n  discShown?: string;")
repm("    parts.push(barBg, barFg, label, titleLabel, sectLabel, bubble);",
"    parts.push(barBg, barFg, label, titleLabel, sectLabel, discLabel, bubble);")
# tao discLabel ngay duoi chan nhan vat (y +14), sau khoi tao sectLabel
repm('''    const sectLabel = this.add
      .text(0, -80, '', {
        fontFamily: 'Palatino, Georgia, serif',
        fontSize: '9px',
        color: '#9fd0ff',
      })
      .setOrigin(0.5, 1);''',
'''    const sectLabel = this.add
      .text(0, -80, '', {
        fontFamily: 'Palatino, Georgia, serif',
        fontSize: '9px',
        color: '#9fd0ff',
      })
      .setOrigin(0.5, 1);

    // GĐ318: dòng 'đệ tử của X' dưới chân đệ tử NPC
    const discLabel = this.add
      .text(0, 14, '', {
        fontFamily: 'Palatino, Georgia, serif',
        fontSize: '9px',
        color: '#ffd9a0',
      })
      .setOrigin(0.5, 0);''')
repm("      sectLabel,\n", "      sectLabel,\n      discLabel,\n")
repm("""      const sectKey302 = p.psectx || '';
      if (actor.sectShown !== sectKey302) {
        actor.sectShown = sectKey302;
        actor.sectLabel.setText(sectKey302 ? `«${sectKey302}»` : '');
      }""",
"""      const sectKey302 = p.psectx || '';
      if (actor.sectShown !== sectKey302) {
        actor.sectShown = sectKey302;
        actor.sectLabel.setText(sectKey302 ? `«${sectKey302}»` : '');
      }
      const discKey318 = p.disc || '';
      if (actor.discShown !== discKey318) {
        actor.discShown = discKey318;
        actor.discLabel.setText(discKey318 ? `đệ tử của ${discKey318}` : '');
      }""")
repm("if (a.label.visible !== vis) { a.label.setVisible(vis); a.titleLabel.setVisible(vis); a.sectLabel.setVisible(vis); }",
"if (a.label.visible !== vis) { a.label.setVisible(vis); a.titleLabel.setVisible(vis); a.sectLabel.setVisible(vis); if (a.discLabel) a.discLabel.setVisible(vis); }")

# --- bind menu + close ---
repm("    const menuRebirth = byId('menuRebirthBtn'); // GĐ314: mở panel Luân hồi từ Menu\n    if (menuRebirth && gameMenu) menuRebirth.onclick = () => { gameMenu.style.display = 'none'; this.openRebirthPanel(); };",
"    const menuDisciple = byId('menuDiscipleBtn'); // GĐ318: mở panel Đệ tử từ Menu\n    if (menuDisciple && gameMenu) menuDisciple.onclick = () => { gameMenu.style.display = 'none'; this.openDisciplePanel(); };\n    const discipleClose = byId('discipleClose');\n    if (discipleClose) discipleClose.onclick = () => { const dp = document.getElementById('disciplePanel'); if (dp) dp.style.display = 'none'; };\n    const menuRebirth = byId('menuRebirthBtn'); // GĐ314: mở panel Luân hồi từ Menu\n    if (menuRebirth && gameMenu) menuRebirth.onclick = () => { gameMenu.style.display = 'none'; this.openRebirthPanel(); };")

# --- openDisciplePanel + render (chen truoc openRebirthPanel) ---
PANEL = r'''
  private openDisciplePanel(): void {
    const panel = document.getElementById('disciplePanel');
    if (!panel || !this.myChar) return;
    panel.style.display = 'block';
    this.renderDisciplePanel();
  }
  private renderDisciplePanel(): void {
    const body = document.getElementById('discipleBody');
    if (!body || !this.myChar) return;
    const c: any = this.myChar;
    const esc = (t: string) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;');
    const rows: string[] = [];
    if (c.masterInfo) rows.push(`<p>🎓 Sư phụ của bạn: <b>${esc(c.masterInfo.name)}</b>${c.masterInfo.graduated ? ' — bạn đã <b>THÀNH TÀI</b> (quan hệ vẫn còn)' : ''}. Quan hệ sư đồ là vĩnh viễn.</p>`);
    for (const inv of (c.discipleInvites || [])) {
      rows.push(`<div class="row" style="gap:6px;align-items:center"><span>🎓 <b>${esc(inv.fromName)}</b> muốn nhận bạn làm đệ tử (vĩnh viễn — suy nghĩ kỹ).</span><button class="mini" data-disciple-accept="${esc(inv.fromKey)}" type="button">Nhận lời bái sư</button><button class="mini" data-disciple-decline="${esc(inv.fromKey)}" type="button">Từ chối</button></div>`);
    }
    if (!c.discipleEligible) rows.push('<p>🔒 Muốn NHẬN đệ tử: cần có <b>tông môn người chơi</b> và giữ chức <b>Trưởng lão trở lên</b> — hoặc tự lập tông môn riêng (làm Tông chủ).</p>');
    else {
      rows.push(`<p>🏯 Bạn đủ tư cách nhận đệ tử. Đang theo học: <b>${(c.disciples || []).filter((e: any) => !e.graduated).length}/3</b>.</p>`);
      rows.push(`<div class="row" style="gap:6px"><input id="discipleInviteName" type="text" placeholder="Tên nhân vật muốn nhận làm đệ tử" style="flex:1"><button class="mini" id="discipleInviteBtn" type="button">Mời đệ tử (người chơi)</button></div>`);
      rows.push('<p class="splash-note">Đệ tử NPC: tới gặp các <b>thiếu niên cầu sư</b> đứng quanh làng (gần quảng trường, Đạo Quán, cây cổ thụ) và nói chuyện.</p>');
    }
    const skillOpts = (c.mySkills || []).map((sk: any) => `<option value="${esc(sk.id)}">${esc(sk.name)}</option>`).join('');
    (c.disciples || []).forEach((e: any) => {
      if (e.type === 'npc') {
        const pct = Math.min(100, Math.round(100 * (e.tamDac || 0) / Math.max(1, e.nextNeed || 1)));
        rows.push(`<div style="border-top:1px solid #ffffff22;padding:6px 0">
          <b>${esc(e.name)}</b> — ${esc(e.tiltName)} · Cấp ${e.level} ${esc(e.levelName)} · Máu ${e.hp}/${e.maxHp}<br>
          Tâm đắc: ${e.tamDac}/${e.nextNeed} <span style="display:inline-block;width:110px;height:8px;background:#00000055;vertical-align:middle"><span style="display:block;height:8px;width:${pct}%;background:#ffd76a"></span></span><br>
          Công pháp đã truyền: ${(e.skills || []).map((sk: any) => esc(sk.name)).join(', ') || '(chưa có — cấp 3 tự học 1 chiêu theo thiên hướng)'}<br>
          <span class="row" style="gap:6px;margin-top:4px">
            <button class="mini" data-disciple-point="${e.idx}" type="button" ${e.canPoint ? '' : 'disabled'}>Chỉ điểm (+25 Tâm đắc)${e.canPoint ? '' : ' — hôm nay đã chỉ'}</button>
            <select id="teachSel${e.idx}" ${skillOpts ? '' : 'disabled'}>${skillOpts || '<option>(bạn chưa học chiêu nào)</option>'}</select>
            <button class="mini" data-disciple-teach="${e.idx}" type="button">Truyền công pháp</button>
            ${e.canGraduate ? `<button class="mini" data-disciple-graduate="${e.idx}" type="button">🎓 Cho xuất sư</button>` : ''}
            <button class="mini" data-disciple-expel="${e.idx}" type="button">Trục xuất</button>
          </span></div>`);
      } else {
        rows.push(`<div style="border-top:1px solid #ffffff22;padding:6px 0">
          <b>${esc(e.name)}</b> — đệ tử người chơi ${e.graduated ? '· 🎓 ĐÃ THÀNH TÀI' : ''}<br>
          <span class="row" style="gap:6px;margin-top:4px">
            <button class="mini" data-disciple-point="${e.idx}" type="button" ${e.canPoint ? '' : 'disabled'}>Chỉ điểm (buff thiền +20%)${e.canPoint ? '' : ' — hôm nay đã chỉ'}</button>
            <select id="teachSel${e.idx}" ${skillOpts ? '' : 'disabled'}>${skillOpts || '<option>(bạn chưa học chiêu nào)</option>'}</select>
            <button class="mini" data-disciple-teach="${e.idx}" type="button">Truyền công pháp</button>
            <button class="mini" data-disciple-expel="${e.idx}" type="button">Trục xuất</button>
          </span></div>`);
      }
    });
    if (!(c.disciples || []).length && c.discipleEligible) rows.push('<p>Chưa có đệ tử nào. Nhận một thiếu niên cầu sư ở làng, hoặc mời một người chơi ở trên.</p>');
    body.innerHTML = rows.join('');
    body.querySelectorAll('[data-disciple-accept]').forEach((b) => b.addEventListener('click', () => { this.socket.emit('disciple_respond', { fromKey: (b as HTMLElement).dataset.discipleAccept, accept: true }); }));
    body.querySelectorAll('[data-disciple-decline]').forEach((b) => b.addEventListener('click', () => { this.socket.emit('disciple_respond', { fromKey: (b as HTMLElement).dataset.discipleDecline, accept: false }); }));
    body.querySelectorAll('[data-disciple-point]').forEach((b) => b.addEventListener('click', () => { this.socket.emit('disciple_point', { idx: Number((b as HTMLElement).dataset.disciplePoint) }); }));
    body.querySelectorAll('[data-disciple-expel]').forEach((b) => b.addEventListener('click', () => { if (window.confirm('Trục xuất đệ tử này? Quan hệ sư đồ sẽ đoạn tuyệt hẳn.')) this.socket.emit('disciple_expel', { idx: Number((b as HTMLElement).dataset.discipleExpel) }); }));
    body.querySelectorAll('[data-disciple-graduate]').forEach((b) => b.addEventListener('click', () => { if (window.confirm('Cho đệ tử này xuất sư? Đệ tử sẽ rời đi lập nghiệp.')) this.socket.emit('disciple_graduate', { idx: Number((b as HTMLElement).dataset.discipleGraduate) }); }));
    body.querySelectorAll('[data-disciple-teach]').forEach((b) => b.addEventListener('click', () => { const idx = Number((b as HTMLElement).dataset.discipleTeach); const sel = document.getElementById('teachSel' + idx) as HTMLSelectElement | null; if (sel && sel.value) this.socket.emit('disciple_teach', { idx, skillId: sel.value }); }));
    const invBtn = document.getElementById('discipleInviteBtn');
    if (invBtn) invBtn.addEventListener('click', () => { const inp = document.getElementById('discipleInviteName') as HTMLInputElement | null; const name = inp?.value.trim(); if (name) this.socket.emit('disciple_invite', { name }); });
  }
'''
repm("  private openRebirthPanel(): void {", PANEL + "  private openRebirthPanel(): void {")

io.open(H, 'w', encoding='utf-8').write(h)
io.open(M, 'w', encoding='utf-8').write(m)
print('gd318 client part1 OK')
