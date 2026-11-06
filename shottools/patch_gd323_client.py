# GĐ323 client: panel Bảng Ủy Thác + nút mở trong hội thoại Ban Lão + panel tông hiện việc + nút nộp đồ.
import io

# ---- index.html: khung panel ----
P = 'client/index.html'
s = io.open(P, encoding='utf-8').read()
def rep(old, new, n=1):
    global s
    assert s.count(old) == n, 'anchor %dx: %s' % (s.count(old), old[:70])
    s = s.replace(old, new)
rep("""      <div id="disciplePanel" class="panel" style="display:none">""",
    """      <div id="boardPanel" class="panel" style="display:none">
        <div class="panelHead"><span>📋 Bảng Ủy Thác — việc cho tông môn</span><button class="xBtn" id="boardClose" type="button">✕</button></div>
        <div id="boardBody"></div>
        <p class="splash-note">Bảng đặt ở sân Đạo Quán, Ban Lão giữ. <b>Nhận việc/treo ủy thác phải đứng tại bảng</b>; xem bảng và nộp vật phẩm cho việc thu mua thì ở đâu cũng được. Việc của làng/thương nhân thay mỗi ngày; ủy thác của người chơi ký quỹ thật — tông làm xong quỹ nhận tiền, vật phẩm gửi về người đăng qua thư; hết hạn 3 ngày game thì hoàn ký quỹ (việc săn được trả theo phần đã làm).</p>
      </div>
      <div id="disciplePanel" class="panel" style="display:none">""")
io.open(P, 'w', encoding='utf-8').write(s)
print('index board panel OK')

# ---- main.ts ----
P = 'client/src/main.ts'
s = io.open(P, encoding='utf-8').read()

# 1) nút mở bảng trong hội thoại Ban Lão
rep("""    // GĐ319: QUẦY QUẢN LÝ — quy trình khai tông 3 bài kiểm tra
    if (d.sectFoundInfo) {""",
    """    // GĐ323: BẢNG ỦY THÁC — nút mở bảng trong hội thoại Ban Lão
    if ((d as unknown as { board?: boolean }).board) {
      html += `<div class="prow"><span class="pname">📋 Bảng Ủy Thác tông môn<span class="pdesc">Việc treo sẵn của làng/thương nhân · Ủy thác thu mua/thuê săn của người chơi (ký quỹ thật) · Việc Admin ghim — Tông chủ/Phó nhận việc cho cả tông tại đây</span></span><button class="pbtn gold" data-board-open="1">Mở Bảng Ủy Thác</button></div>`;
    }
    // GĐ319: QUẦY QUẢN LÝ — quy trình khai tông 3 bài kiểm tra
    if (d.sectFoundInfo) {""")

# 2) wiring nút mở bảng (cạnh data-found-fight)
rep("""        btns.querySelectorAll<HTMLButtonElement>('[data-found-fight]').forEach((b) => { b.onclick = () => { this.socket.emit('sect_found_fight'); p.style.display = 'none'; }; });""",
    """        btns.querySelectorAll<HTMLButtonElement>('[data-found-fight]').forEach((b) => { b.onclick = () => { this.socket.emit('sect_found_fight'); p.style.display = 'none'; }; });
        btns.querySelectorAll<HTMLButtonElement>('[data-board-open]').forEach((b) => { b.onclick = () => { this.boardWanted = true; this.socket.emit('board_get'); p.style.display = 'none'; }; }); // GĐ323""")

# 3) listener board_state (cạnh listener sect_hqs)
rep("""    this.socket.on('sect_hqs', (d: { list: Array<{ sectId: string; name: string; mapId: string; x: number; y: number; buildings: Array<{ kind: string; name: string; x: number; y: number }> }> }) => { this.sectHqs = d.list || []; this.renderSectHqs(); }); // GĐ319""",
    """    this.socket.on('sect_hqs', (d: { list: Array<{ sectId: string; name: string; mapId: string; x: number; y: number; buildings: Array<{ kind: string; name: string; x: number; y: number }> }> }) => { this.sectHqs = d.list || []; this.renderSectHqs(); }); // GĐ319
    this.socket.on('board_state', (st: unknown) => { this.boardState = st as never; this.renderBoardPanel(); }); // GĐ323""")

# 4) state + đóng panel + ủy nhiệm click trong boardBody (cạnh bondClose)
rep("""    const bondClose = byId('bondClose');
    if (bondClose) bondClose.onclick = () => { const bp = document.getElementById('bondPanel'); if (bp) bp.style.display = 'none'; };""",
    """    const bondClose = byId('bondClose');
    if (bondClose) bondClose.onclick = () => { const bp = document.getElementById('bondPanel'); if (bp) bp.style.display = 'none'; };
    const boardClose = byId('boardClose'); // GĐ323
    if (boardClose) boardClose.onclick = () => { const bp = document.getElementById('boardPanel'); if (bp) bp.style.display = 'none'; this.boardWanted = false; };
    const boardBodyEl = byId('boardBody');
    if (boardBodyEl) boardBodyEl.addEventListener('click', (ev) => {
      const b = (ev.target as HTMLElement).closest('button') as HTMLButtonElement | null; if (!b) return;
      const act = b.dataset.boardAct; const id = b.dataset.id || ''; if (!act) return;
      if (act === 'accept') this.socket.emit('board_accept', { key: id });
      else if (act === 'accept-comm') this.socket.emit('board_accept_comm', { id });
      else if (act === 'cancel') this.socket.emit('board_cancel', { id });
      else if (act === 'refresh') this.socket.emit('board_get');
      else if (act === 'post') { const t = (document.getElementById('boardPostType') as HTMLSelectElement | null)?.value || 'collect'; const itemId = (document.getElementById('boardPostItem') as HTMLSelectElement | null)?.value || ''; const monsterKind = (document.getElementById('boardPostMon') as HTMLSelectElement | null)?.value || ''; const target = Number((document.getElementById('boardPostQty') as HTMLInputElement | null)?.value || 0); const pay = Number((document.getElementById('boardPostPay') as HTMLInputElement | null)?.value || 0); this.socket.emit('board_post', { type: t, itemId, monsterKind, target, pay }); }
      else if (act === 'gm-post') { const title = (document.getElementById('gmTitle') as HTMLInputElement | null)?.value || ''; const t = (document.getElementById('gmType') as HTMLSelectElement | null)?.value || 'kill'; const monsterKind = (document.getElementById('gmMon') as HTMLSelectElement | null)?.value || ''; const itemId = (document.getElementById('gmItem') as HTMLSelectElement | null)?.value || ''; const target = Number((document.getElementById('gmTarget') as HTMLInputElement | null)?.value || 0); const rewardFund = Number((document.getElementById('gmFund') as HTMLInputElement | null)?.value || 0); const rewardUy = Number((document.getElementById('gmUy') as HTMLInputElement | null)?.value || 0); this.socket.emit('board_gm_post', { title, type: t, monsterKind, itemId, target, rewardFund, rewardUy }); }
    });""")

# 5) field boardState/boardWanted (cạnh field sectHqs)
rep("""  private sectHqs: Array<{ sectId: string; name: string; mapId: string; x: number; y: number; buildings: Array<{ kind: string; name: string; x: number; y: number }> }> = []; // GĐ319""",
    """  private sectHqs: Array<{ sectId: string; name: string; mapId: string; x: number; y: number; buildings: Array<{ kind: string; name: string; x: number; y: number }> }> = []; // GĐ319
  private boardState: any = null; // GĐ323
  private boardWanted = false; // GĐ323""")

# 6) renderBoardPanel — chèn trước renderBondPanel
rep("""  private renderBondPanel(): void {""",
    """  private renderBoardPanel(): void { // GĐ323
    const body = document.getElementById('boardBody'); const panel = document.getElementById('boardPanel');
    if (!body || !panel) return;
    const st: any = this.boardState;
    if (this.boardWanted) panel.style.display = 'block';
    if (!st) { body.innerHTML = '<div class="prow"><span class="pname"><i>Đang tải bảng…</i></span></div>'; return; }
    const needOf = (t: any) => t.type === 'kill' ? `Săn ${t.monsterName} ×${t.target}` : t.type === 'special' ? `Hạ ${t.monsterName} ×${t.target}` : t.type === 'collect' ? `Thu thập ${t.itemName} ×${t.target}` : `Góp ${Number(t.target).toLocaleString('vi-VN')} LT vào quỹ tông`;
    let html = `<div class="prow"><span class="pname">${st.atBoard ? '📍 Bạn đang đứng tại Bảng Ủy Thác (sân Đạo Quán)' : '👀 Đang xem bảng từ xa — tới sân Đạo Quán gặp Ban Lão mới NHẬN việc và TREO ủy thác được'}<span class="pdesc">${st.canLead ? 'Bạn là Tông chủ/Phó — nhận việc cho tông được' : 'Chỉ Tông chủ/Phó mới nhận việc cho tông; ai cũng treo ủy thác & nộp đồ được'} · Linh thạch của bạn: ${(st.myStone || 0).toLocaleString('vi-VN')}</span></span><button class="pbtn" data-board-act="refresh">Làm mới</button></div>`;
    if ((st.active || []).length) {
      html += '<div class="prow"><span class="pname">🏯 VIỆC TÔNG ĐANG LÀM (tiến độ gộp)</span></div>';
      for (const q of st.active) html += `<div class="prow"><span class="pname">• ${esc(q.title)}<span class="pdesc">${esc(q.giver)} · ${needOf(q)} · Tiến độ ${q.progress}/${q.target} · Thưởng quỹ +${(q.rewardFund || 0).toLocaleString('vi-VN')} LT · +${q.rewardUy || 0} Uy · Còn ${q.daysLeft} ngày</span></span></div>`;
    }
    html += '<div class="prow"><span class="pname">📜 VIỆC TREO SẴN HÔM NAY (làng · thương nhân · tu sĩ)</span></div>';
    for (const o of st.offers || []) html += `<div class="prow"><span class="pname">${esc(o.title)}<span class="pdesc">Người thuê: ${esc(o.giver)} · ${needOf(o)} · Thưởng: ${(o.rewardFund || 0).toLocaleString('vi-VN')} LT + ${o.rewardUy || 0} Tông Uy</span></span>${o.takenByMe ? '<span class="pdesc">✔ Tông bạn đang làm</span>' : (st.canLead && st.atBoard && (st.active || []).length < (st.activeCap || 2) ? `<button class="pbtn gold" data-board-act="accept" data-id="${o.key}">Nhận việc</button>` : '')}</div>`;
    const comms = [...(st.commissions || [])].sort((a: any, b: any) => (b.gm ? 1 : 0) - (a.gm ? 1 : 0));
    html += '<div class="prow"><span class="pname">🤝 ỦY THÁC CỦA NGƯỜI CHƠI & ADMIN</span></div>';
    if (!comms.length) html += '<div class="prow"><span class="pname"><i>Chưa có ủy thác nào đang treo.</i></span></div>';
    for (const c of comms) html += `<div class="prow"><span class="pname">${c.gm ? '🔱 ' : ''}${esc(c.title)}<span class="pdesc">Người đăng: ${esc(c.posterName)} · ${needOf(c)} · ${c.gm ? `Thưởng: ${(c.rewardFund || 0).toLocaleString('vi-VN')} LT + ${c.rewardUy || 0} Uy` : `Ký quỹ: ${(c.escrow || 0).toLocaleString('vi-VN')} LT`} · Tiến độ ${c.progress}/${c.target} · Còn ${c.daysLeft} ngày${c.sectName ? ' · Tông đang làm: ' + esc(c.sectName) : ''}</span></span>${!c.sectName && !c.mine && st.canLead && st.atBoard && (st.active || []).length < (st.activeCap || 2) ? `<button class="pbtn gold" data-board-act="accept-comm" data-id="${c.id}">Nhận ủy thác</button>` : ''}${c.mine && !c.sectName ? `<button class="pbtn" data-board-act="cancel" data-id="${c.id}">Gỡ (hoàn ký quỹ)</button>` : ''}</div>`;
    // form treo ủy thác
    const itemOpts = Object.entries(ITEM_INFO).filter(([id, v]) => (v as any)?.name && id !== 'lenh_bai_tong_mon' && id !== 'tran_phap_khai_son').map(([id, v]) => `<option value="${id}">${esc((v as any).name)}</option>`).join('');
    const monOpts = (st.monsters || []).map((m: any) => `<option value="${m.kind}">${esc(m.name)}</option>`).join('');
    html += '<div class="prow"><span class="pname">✍️ TREO ỦY THÁC CỦA BẠN (ký quỹ trừ ngay, xong việc tông nhận tiền)</span></div>';
    html += `<div class="prow"><span class="pname">Loại việc</span><select id="boardPostType"><option value="collect">Thu mua vật phẩm / nguyên liệu</option><option value="kill">Thuê săn quái</option></select></div>`;
    html += `<div class="prow"><span class="pname">Vật phẩm (khi Thu mua)</span><select id="boardPostItem">${itemOpts}</select></div>`;
    html += `<div class="prow"><span class="pname">Loài quái (khi Thuê săn)</span><select id="boardPostMon">${monOpts}</select></div>`;
    html += `<div class="prow"><span class="pname">Số lượng · Tiền công (LT)</span><span style="display:flex;gap:4px"><input id="boardPostQty" type="number" min="1" value="10" style="width:80px"><input id="boardPostPay" type="number" min="100" value="1000" style="width:110px"><button class="pbtn gold" data-board-act="post" ${st.atBoard ? '' : 'disabled'}>Treo ủy thác</button></span></div>`;
    if (st.isGM) {
      html += '<div class="prow"><span class="pname">🔱 GHIM VIỆC ADMIN (Thiên Cơ — hiện 30 ngày)</span></div>';
      html += `<div class="prow"><span class="pname">Tiêu đề · Loại</span><span style="display:flex;gap:4px"><input id="gmTitle" maxlength="60" style="flex:1;min-width:140px" placeholder="Tên việc…"><select id="gmType"><option value="kill">Săn quái</option><option value="collect">Thu thập</option></select></span></div>`;
      html += `<div class="prow"><span class="pname">Quái / Vật phẩm</span><span style="display:flex;gap:4px"><select id="gmMon">${monOpts}</select><select id="gmItem">${itemOpts}</select></span></div>`;
      html += `<div class="prow"><span class="pname">Mục tiêu · Thưởng LT · Uy</span><span style="display:flex;gap:4px"><input id="gmTarget" type="number" min="1" value="50" style="width:70px"><input id="gmFund" type="number" min="0" value="5000" style="width:100px"><input id="gmUy" type="number" min="0" value="50" style="width:70px"><button class="pbtn gold" data-board-act="gm-post" ${st.atBoard ? '' : 'disabled'}>Ghim việc</button></span></div>`;
    }
    body.innerHTML = html;
  }
  private renderBondPanel(): void {""")

# 7) panel tông: mục việc mới + nút nộp đồ
rep("""      if ((g.quests || []).length) {
        html += '<div class="prow"><span class="pname">📜 Nhiệm vụ tông hôm nay (tiến độ gộp cả tông)</span></div>';
        for (const q of g.quests || []) html += `<div class="prow"><span class="pname">${q.done ? '✔' : '•'} ${esc(q.name)}<span class="pdesc">${q.progress}/${q.target}${q.done ? ' — đã xong: quỹ +1.500 LT, cả tông +25 cống hiến' : ''}</span></span></div>`;
      }""",
    """      if ((g.quests || []).length) {
        html += '<div class="prow"><span class="pname">📋 Việc tông đang làm — Bảng Ủy Thác (tiến độ gộp cả tông)<span class="pdesc">Nhận việc mới: Tông chủ/Phó tới Bảng Ủy Thác ở sân Đạo Quán (Ban Lão giữ bảng)</span></span></div>';
        for (const q of g.quests || []) { const qq: any = q as any; html += `<div class="prow"><span class="pname">• ${esc(q.name)}<span class="pdesc">${esc(qq.giver || '')} · ${q.progress}/${q.target} · Thưởng: quỹ +${(qq.rewardFund || 0).toLocaleString('vi-VN')} LT · +${qq.rewardUy || 0} Tông Uy · cả tông +25 Tông Cống</span></span>${qq.type === 'collect' && qq.itemId ? `<span style="display:flex;gap:4px"><input id="depQty-${esc(q.key)}" type="number" min="1" value="1" style="width:56px"><button class="pbtn gold" data-sect="quest-deposit" data-id="${esc(q.key)}">Nộp đồ</button></span>` : ''}</div>`; }
      } else {
        html += '<div class="prow"><span class="pname">📋 Việc tông đang làm<span class="pdesc">Chưa nhận việc nào — Tông chủ/Phó tới Bảng Ủy Thác ở sân Đạo Quán (gặp Ban Lão) để nhận việc cho tông: việc của làng/thương nhân, ủy thác của người chơi, việc Admin</span></span></div>';
      }""")

# 8) wiring nộp đồ trong handler panel tông
rep("""        else if (act === 'terr-abandon') this.socket.emit('sect_territory_abandon', { pointId: id }); // GĐ322""",
    """        else if (act === 'terr-abandon') this.socket.emit('sect_territory_abandon', { pointId: id }); // GĐ322
        else if (act === 'quest-deposit') { const n = Number((document.getElementById('depQty-' + id) as HTMLInputElement | null)?.value || 1); this.socket.emit('board_deposit', { ref: id, qty: n }); } // GĐ323""")

io.open(P, 'w', encoding='utf-8').write(s)
print('gd323 client OK')
