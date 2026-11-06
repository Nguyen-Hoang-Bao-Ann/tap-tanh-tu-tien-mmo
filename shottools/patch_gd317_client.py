# -*- coding: utf-8 -*-
# GĐ317 client: Thiên Mệnh Ký (panel truyện + Kiếp Ký) + chọn tộc ở màn tạo
# nhân vật + mục Hoán Vu/vật phẩm ẩn trong panel Luân hồi + dòng tộc ở thẻ nhân vật.
import io
P = '/home/hatch/workspace/tap-tanh-tu-tien-mmo/client/src/main.ts'
s = io.open(P, encoding='utf-8').read()
def rep(old, new, cnt=1):
    global s
    assert s.count(old) == cnt, 'ANCHOR x%d: %s' % (s.count(old), old[:90])
    s = s.replace(old, new)

rep("import { NOTICES } from './notices'; // GĐ245: bảng thông báo / cập nhật",
    "import { NOTICES } from './notices'; // GĐ245: bảng thông báo / cập nhật\nimport { RACE_INFO, RACE_BY_ID, CHAPTERS } from './story'; // GĐ317: Thiên Mệnh Ký + chủng tộc")

rep("  private selSkin: string | null = null; // GĐ248: skin chọn lúc tạo nhân vật",
    "  private selSkin: string | null = null; // GĐ248: skin chọn lúc tạo nhân vật\n  private selRace: string = 'nhan'; // GĐ317: tộc chọn ở Thiên Đạo Môn\n  private raceChoicePending = false; // GĐ317: hồn đang chờ chọn tộc (sau Hoán Vu Kiếp Hồn)\n  private storyTab: string = 'lore'; // GĐ317: tab Thiên Mệnh Ký\n  private storyChapter: string | null = null; // GĐ317: chương đang đọc")

# character_died: nhận cờ chờ chọn tộc
rep("""    this.socket.on('character_died', (d: { name: string; message: string }) => {""",
    """    this.socket.on('character_died', (d: { name: string; message: string; raceChoice?: boolean }) => {
      if (d.raceChoice) this.raceChoicePending = true; // GĐ317: kiếp mới sẽ chọn chủng tộc""")

# setupCreationUI: dựng hàng chọn tộc sau hàng skin
rep("    if (skinRow) this.buildSkinRow(skinRow, () => this.selSkin, (sk) => { this.selSkin = sk; });",
    """    if (skinRow) this.buildSkinRow(skinRow, () => this.selSkin, (sk) => { this.selSkin = sk; });
    // GĐ317: hàng CHỌN CHỦNG TỘC — chỉ hiện khi hồn chờ ở Thiên Đạo Môn (sau Hoán Vu)
    const raceWrap = document.getElementById('racePickWrap');
    const raceRow = document.getElementById('raceRow');
    if (raceWrap) raceWrap.style.display = this.raceChoicePending ? 'block' : 'none';
    if (raceRow && this.raceChoicePending) {
      raceRow.innerHTML = '';
      for (const r of RACE_INFO) {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'menuAction';
        b.style.outline = this.selRace === r.id ? '2px solid #ffd76a' : '';
        b.textContent = `${r.name} — ${r.total} điểm gốc · thọ ${r.lifespan} năm`;
        b.onclick = () => { this.selRace = r.id; this.setupCreationUI(); };
        raceRow.appendChild(b);
      }
      const cur = RACE_BY_ID[this.selRace] || RACE_INFO[0];
      const rn = document.getElementById('raceNote');
      if (rn) rn.textContent = `${cur.name} (thần tổ: ${cur.god}): ${cur.buff}. Debuff: ${cur.debuff}. Đặc trưng ${cur.traitName}: ${cur.trait}. Thiên lệch: ${cur.lean}.`;
    }""")

# create_character: gửi kèm race khi đang chờ chọn tộc
rep("          path: this.selPath, // GĐ22\n        });",
    "          path: this.selPath, // GĐ22\n          race: this.raceChoicePending ? this.selRace : undefined, // GĐ317: chủng tộc chọn ở Thiên Đạo Môn\n        });")

# Panel Luân hồi: thêm khối vật phẩm ẩn + Hoán Vu + sửa dòng 10% -> 30%
rep("    rows.push(`<div class=\"prow\"><span>Khi hết thọ nguyên và qua 30 ngày ân hạn, nhân vật sẽ TỌA HÓA — nhưng hồn không mất: thành tựu, ký ức và đồ trong hành trang chuyển kiếp theo sang kiếp sau; Linh thạch giữ lại 10%.</span></div>`);",
    """    const relics317: any[] = soul.relics || [];
    rows.push(`<div class="prow"><span class="pname">✦ Vật phẩm ẩn của 10 vị thần đầu tiên: ${relics317.length}/10${relics317.length ? ' — ' + relics317.map((e: any) => esc(e.name)).join(', ') : ''}</span></div>`);
    rows.push(`<div class="prow"><span>Manh mối nơi giấu từng món nằm trong 📖 Thiên Mệnh Ký → Truyền Thuyết Sơ Khai. Tới gần nơi giấu, hồn sẽ cảm ứng được khí tức cổ xưa.</span></div>`);
    if (soul.hoanVu && soul.hoanVu.learned) {
      if ((soul.hoanVu.cdLeft || 0) > 0) rows.push(`<div class="prow"><span>🌌 Hoán Vu Kiếp Hồn: còn ${soul.hoanVu.cdLeft} năm nữa mới hồi lại.</span></div>`);
      else rows.push(`<button class="menuAction" type="button" id="hoanVuBtn">🌌 Dùng HOÁN VU KIẾP HỒN — tự tọa hóa, qua Thiên Đạo Môn chọn chủng tộc cho kiếp mới</button>`);
    }
    rows.push(`<div class="prow"><span>Khi hết thọ nguyên và qua 30 ngày ân hạn, nhân vật sẽ TỌA HÓA — nhưng hồn không mất: thành tựu, ký ức và đồ trong hành trang chuyển kiếp theo sang kiếp sau; Linh thạch Hạ phẩm giữ lại 30%.</span></div>`);""")
rep("    body.querySelectorAll('[data-shardpick]').forEach((b) => { (b as HTMLButtonElement).onclick = () => { this.socket.emit('soul_shard_pick', { itemId: (b as HTMLElement).getAttribute('data-shardpick') }); this.openRebirthPanel(); }; });",
    """    body.querySelectorAll('[data-shardpick]').forEach((b) => { (b as HTMLButtonElement).onclick = () => { this.socket.emit('soul_shard_pick', { itemId: (b as HTMLElement).getAttribute('data-shardpick') }); this.openRebirthPanel(); }; });
    const hv = document.getElementById('hoanVuBtn');
    if (hv) hv.onclick = () => {
      if (window.confirm('Dùng HOÁN VU KIẾP HỒN? Nhân vật sẽ TỌA HÓA ngay — kiếp mới được CHỌN CHỦNG TỘC ở Thiên Đạo Môn (hướng tu, vũ khí, linh căn làm mới lại). Hồi chiêu 500 năm. Đồ muốn mang theo hãy gửi vào Hành trang chuyển kiếp TRƯỚC.')) {
        this.socket.emit('soul_use_hoanvu', {});
      }
    };""")

io.open(P, 'w', encoding='utf-8').write(s)
print('gd317 client part1 OK')
