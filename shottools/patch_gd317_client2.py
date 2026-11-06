# -*- coding: utf-8 -*-
# GĐ317 client part 2: Thiên Mệnh Ký — wiring + methods (chạy sau patch_gd317_client.py).
import io
P = '/home/hatch/workspace/tap-tanh-tu-tien-mmo/client/src/main.ts'
s = io.open(P, encoding='utf-8').read()
def rep(old, new, cnt=1):
    global s
    assert s.count(old) == cnt, 'ANCHOR x%d: %s' % (s.count(old), old[:90])
    s = s.replace(old, new)

rep("""    const rebirthClose = byId('rebirthClose');
    if (rebirthClose) rebirthClose.onclick = () => { const rp = document.getElementById('rebirthPanel'); if (rp) rp.style.display = 'none'; };""",
"""    const rebirthClose = byId('rebirthClose');
    if (rebirthClose) rebirthClose.onclick = () => { const rp = document.getElementById('rebirthPanel'); if (rp) rp.style.display = 'none'; };
    const menuStory = byId('menuStoryBtn'); // GĐ317: Thiên Mệnh Ký
    if (menuStory && gameMenu) menuStory.onclick = () => { gameMenu.style.display = 'none'; this.openStoryPanel(); };
    const storyClose = byId('storyClose');
    if (storyClose) storyClose.onclick = () => { const sp = document.getElementById('storyPanel'); if (sp) sp.style.display = 'none'; };
    const stLore = byId('storyTabLore');
    if (stLore) stLore.onclick = () => { this.storyTab = 'lore'; this.renderStoryPanel(); };
    const stLog = byId('storyTabLog');
    if (stLog) stLog.onclick = () => { this.storyTab = 'log'; this.renderStoryPanel(); };""")

rep("  private openRebirthPanel(): void {",
"""  private openStoryPanel(): void { // GĐ317: THIÊN MỆNH KÝ — cốt truyện (đợt A)
    const panel = document.getElementById('storyPanel');
    if (!panel) return;
    this.renderStoryPanel();
    panel.style.display = 'block';
  }

  private storyUnlocked(raceId: string): boolean { // GĐ317: luật mở chương truyền thuyết
    const c: any = this.myChar || {};
    const soul: any = c.soul || {};
    if (c.race === raceId) return true;
    if ((soul.relics || []).some((e: any) => e.race === raceId)) return true;
    if (raceId === 'nhan' && soul.visitedStudy) return true;
    return false;
  }

  private renderStoryPanel(): void {
    const body = document.getElementById('storyBody');
    if (!body) return;
    const c: any = this.myChar || {};
    const soul: any = c.soul || {};
    const escS = (t: any) => String(t ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;');
    if (this.storyTab === 'log') {
      const rows: string[] = [];
      rows.push('<div class="prow"><span class="pname">🔄 Kiếp Ký — biên niên hồn của bạn</span></div>');
      rows.push(`<div class="prow"><span>Đã qua ${soul.lives || 0} kiếp · ${soul.fullLives || 0} kiếp trọn vẹn · ${soul.pastDreams || 0} giấc mơ kiếp trước · Vật phẩm ẩn: ${(soul.relics || []).length}/10</span></div>`);
      if (c.raceName) rows.push(`<div class="prow"><span>Kiếp này mang huyết mạch: <b>${escS(c.raceName)}</b></span></div>`);
      const log: any[] = Array.isArray(soul.lifeLog) ? soul.lifeLog : [];
      if (!log.length) rows.push('<div class="prow"><span>(Chưa có kiếp nào khép lại — khi một kiếp tọa hóa, biên niên sẽ ghi vào đây.)</span></div>');
      [...log].reverse().forEach((e: any, i: number) => {
        const rn = e.race ? (RACE_BY_ID[e.race]?.name || e.race) : 'Phàm nhân';
        const pathTxt = e.path === 'dokiem' ? 'Luân hồi làm lại tại Lễ Đăng Tiên' : e.path === 'hoanvu' ? 'Hoán Vu Kiếp Hồn — đổi chủng tộc' : 'Tọa hóa hết thọ nguyên';
        rows.push(`<div class="prow"><span>Kiếp ${log.length - i}: <b>${escS(e.name)}</b> — ${escS(rn)} · cảnh ${escS(e.realm || '')} tầng ${e.tier || 0} · gục ngã ${e.falls || 0} lần · ${pathTxt}</span></div>`);
      });
      body.innerHTML = rows.join('');
      return;
    }
    if (this.storyChapter) {
      const ch = CHAPTERS.find((x) => x.race === this.storyChapter);
      const info = RACE_BY_ID[this.storyChapter];
      if (ch && info && this.storyUnlocked(ch.race)) {
        body.innerHTML = '<button class="mini" id="storyBack" type="button">← Mục lục</button>'
          + `<div class="prow"><span class="pname">${escS(ch.title)}</span></div>`
          + ch.paras.map((p) => `<p class="splash-note" style="text-align:left">${escS(p)}</p>`).join('')
          + `<div class="prow"><span>Vị thần đầu tiên: <b>${escS(info.god)}</b> · Vật phẩm ẩn: <b>${escS(info.relic)}</b> ${(soul.relics || []).some((e: any) => e.race === ch.race) ? '✔ ĐÃ TÌM THẤY' : '(chưa tìm thấy — manh mối nằm trong chương này)'}</span></div>`;
        const back = document.getElementById('storyBack');
        if (back) back.onclick = () => { this.storyChapter = null; this.renderStoryPanel(); };
        return;
      }
      this.storyChapter = null;
    }
    const rows: string[] = [];
    rows.push('<div class="prow"><span class="pname">📜 Truyền Thuyết Sơ Khai — thập tộc và 10 vị thần đầu tiên</span></div>');
    rows.push('<div class="prow"><span>Chương mở khi: sống một kiếp thuộc tộc đó, tìm được vật phẩm ẩn của tộc, hoặc (riêng Nhân tộc) tới Văn Uyển đọc sách. Trong mỗi chương có chôn manh mối nơi giấu vật phẩm ẩn.</span></div>');
    for (const ch of CHAPTERS) {
      const info = RACE_BY_ID[ch.race];
      const open = this.storyUnlocked(ch.race);
      rows.push(open
        ? `<button class="menuAction" type="button" data-chapter="${ch.race}">📖 ${escS(ch.title)}</button>`
        : `<div class="prow"><span>🔒 ${escS(info ? info.name : ch.race)} — chương chưa mở (gợi ý: luân hồi sang tộc này, hoặc tìm vật phẩm ẩn ${escS(info ? info.relic : '')})</span></div>`);
    }
    body.innerHTML = rows.join('');
    body.querySelectorAll('[data-chapter]').forEach((b) => { (b as HTMLButtonElement).onclick = () => { this.storyChapter = (b as HTMLElement).getAttribute('data-chapter'); this.renderStoryPanel(); }; });
  }

  private openRebirthPanel(): void {""")

io.open(P, 'w', encoding='utf-8').write(s)
print('gd317 client part2 OK')
