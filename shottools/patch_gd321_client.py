# GĐ321 client: panel Duyên Nợ thêm Sổ kiếp trước + lời hẹn kết lại;
# hội thoại NPC thêm nút kết lại; nút ngữ cảnh quái đặc biệt (Tha/Cho ăn/Kết lại).
import io
P = 'client/src/main.ts'
s = io.open(P, encoding='utf-8').read()
def rep(old, new, n=1):
    global s
    assert s.count(old) == n, 'anchor %dx: %s' % (s.count(old), old[:70])
    s = s.replace(old, new)

# 1) panel: icon quái + mục Sổ kiếp trước + lời hẹn
rep("""<b>${b.kind === 'npc' ? '🏡' : '🧑'} ${esc(b.name)}</b>""",
    """<b>${b.kind === 'npc' ? '🏡' : b.kind === 'monster' ? '🐺' : '🧑'} ${esc(b.name)}</b>""")
rep("""    body.innerHTML = rows.join('');
    body.querySelectorAll('[data-bond-choose]').forEach((b) => { (b as HTMLButtonElement).onclick = () => { this.socket.emit('bond_choose_branch', { key: (b as HTMLElement).getAttribute('data-bond-key'), branch: (b as HTMLElement).getAttribute('data-bond-choose') }); setTimeout(() => this.renderBondPanel(), 500); }; });""",
    """    // GĐ321: lời hẹn kết lại từ người kiếp trước quen biết
    for (const r of (c.reformIn || [])) {
      rows.push(`<div style="border-top:1px solid #ffd97a66;padding:6px 0">💞 <b>${esc(r.fromName)}</b> nói rằng hai người từng có duyên/nợ từ kiếp trước và muốn <b>kết lại</b> (khôi phục thấp hơn kiếp trước một bậc).<br><span style="display:inline-flex;gap:4px;margin-top:4px"><button class="mini" data-reform-accept="${esc(r.fromKey)}" type="button">Đồng ý kết lại</button><button class="mini" data-reform-decline="${esc(r.fromKey)}" type="button">Để sau</button></span></div>`);
    }
    // GĐ321: Sổ kiếp trước
    const pbs = c.pastBonds || [];
    if (pbs.length) {
      rows.push('<div style="border-top:2px solid #ffd97a55;padding-top:8px;margin-top:6px"><b>📜 Sổ kiếp trước</b> — các mối sâu đậm hồn còn ghi nhớ. Gặp lại đúng đối tượng sẽ có cảm ứng; kết lại được sẽ khôi phục quan hệ <b>thấp hơn kiếp trước một bậc</b>.</div>');
      for (const pb of pbs) {
        const icon = pb.kind === 'npc' ? '🏡' : pb.kind === 'monster' ? '🐺' : '🧑';
        let tail = '';
        if (pb.gone) tail = '<br><span class="splash-note">Người ấy đã tan vào hư vô — mối này chỉ còn là kỷ niệm trong Kiếp Ký.</span>';
        else if (!pb.sensed) tail = '<br><span class="splash-note">Chưa gặp lại trong kiếp này.</span>';
        else if (pb.kind === 'player') tail = `<br><span style="display:inline-flex;gap:4px;margin-top:4px"><button class="mini" data-reform-send="${esc(pb.key)}" type="button">Gửi lời kết lại</button></span> <span class="splash-note">Cần người ấy đồng ý mới kết lại được.</span>`;
        else if (pb.kind === 'npc') tail = '<br><span class="splash-note">Đã cảm ứng được nhau — hãy tới <b>nói chuyện</b> với họ để kết lại/đối mặt.</span>';
        else tail = '<br><span class="splash-note">Đã cảm ứng được nhau — tới gần cá thể đặc biệt của loài này sẽ hiện nút kết lại.</span>';
        rows.push(`<div style="border-top:1px solid #ffffff22;padding:6px 0">${icon} <b>${esc(pb.name)}</b> — kiếp trước: <b>${esc(pb.tierName)}</b>${tail}</div>`);
      }
    }
    body.innerHTML = rows.join('');
    body.querySelectorAll('[data-bond-choose]').forEach((b) => { (b as HTMLButtonElement).onclick = () => { this.socket.emit('bond_choose_branch', { key: (b as HTMLElement).getAttribute('data-bond-key'), branch: (b as HTMLElement).getAttribute('data-bond-choose') }); setTimeout(() => this.renderBondPanel(), 500); }; });
    body.querySelectorAll('[data-reform-accept]').forEach((b) => { (b as HTMLButtonElement).onclick = () => { this.socket.emit('bond_reform_respond', { fromKey: (b as HTMLElement).getAttribute('data-reform-accept'), accept: true }); setTimeout(() => this.renderBondPanel(), 500); }; });
    body.querySelectorAll('[data-reform-decline]').forEach((b) => { (b as HTMLButtonElement).onclick = () => { this.socket.emit('bond_reform_respond', { fromKey: (b as HTMLElement).getAttribute('data-reform-decline'), accept: false }); setTimeout(() => this.renderBondPanel(), 500); }; });
    body.querySelectorAll('[data-reform-send]').forEach((b) => { (b as HTMLButtonElement).onclick = () => { this.socket.emit('bond_reform', { key: (b as HTMLElement).getAttribute('data-reform-send') }); setTimeout(() => this.renderBondPanel(), 500); }; });""")

# 2) hội thoại NPC: nút kết lại duyên xưa / đối mặt nợ cũ
rep("""    // GĐ161: Chủ Trại Ngự Thú — nút vào trại thú cưỡi""",
    """    // GĐ321: mối duyên/nợ kiếp trước với NPC này -> kết lại ngay trong hội thoại
    const esc321 = (t: string) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;');
    const pb321 = (((this.myChar as any) || {}).pastBonds || []).find((e: any) => e.key === 'n:' + d.npcId);
    if (pb321) {
      html += `<div class="prow"><span class="pname">${pb321.score >= 0 ? '💞 Duyên xưa chưa dứt' : '🥀 Nợ cũ chưa trả'}<span class="pdesc">Kiếp trước hai người là "${esc321(pb321.tierName)}". Kết lại sẽ khôi phục quan hệ thấp hơn một bậc.</span></span><button class="pbtn gold" data-reform-npc="n:${d.npcId}">${pb321.score >= 0 ? 'Kết lại duyên xưa' : 'Đối mặt nợ cũ'}</button></div>`;
    }
    // GĐ161: Chủ Trại Ngự Thú — nút vào trại thú cưỡi""")
rep("""    btns.querySelectorAll<HTMLButtonElement>('[data-bond-branch]').forEach((b) => {
      b.onclick = () => { this.socket.emit('bond_choose_branch', { key: b.dataset.bondKey, branch: b.dataset.bondBranch }); setTimeout(() => this.socket.emit('talk_npc', { npcId: this.lastNpcDialogId || '' }), 400); };
    });""",
    """    btns.querySelectorAll<HTMLButtonElement>('[data-bond-branch]').forEach((b) => {
      b.onclick = () => { this.socket.emit('bond_choose_branch', { key: b.dataset.bondKey, branch: b.dataset.bondBranch }); setTimeout(() => this.socket.emit('talk_npc', { npcId: this.lastNpcDialogId || '' }), 400); };
    });
    btns.querySelectorAll<HTMLButtonElement>('[data-reform-npc]').forEach((b) => {
      b.onclick = () => { this.socket.emit('bond_reform', { key: b.dataset.reformNpc }); setTimeout(() => this.socket.emit('talk_npc', { npcId: this.lastNpcDialogId || '' }), 400); };
    });""")

# 3) nút ngữ cảnh quái đặc biệt — tạo div + nhịp quét 500ms (neo tại wiring bondClose)
rep("""    if (bondClose) bondClose.onclick = () => { const bp = document.getElementById('bondPanel'); if (bp) bp.style.display = 'none'; };""",
    """    if (bondClose) bondClose.onclick = () => { const bp = document.getElementById('bondPanel'); if (bp) bp.style.display = 'none'; };
    // GĐ321: nút ngữ cảnh với quái đặc biệt ở gần (Tha mạng / Cho ăn / Kết lại duyên nợ quái)
    {
      const ctx = document.createElement('div');
      ctx.id = 'bondCtx';
      ctx.style.cssText = 'position:fixed;left:50%;transform:translateX(-50%);bottom:118px;z-index:60;display:none;gap:6px;justify-content:center';
      document.body.appendChild(ctx);
      setInterval(() => {
        const me: any = this.worldPlayers.get(this.myId);
        let best: any = null; let bd = 1e9;
        if (me) for (const m of this.worldMonsters.values()) { const mm: any = m as any; if (!mm.sp || mm.hidden || (mm.hp || 0) <= 0) continue; const dd = Math.hypot(mm.x - me.x, mm.y - me.y); if (dd <= 260 && dd < bd) { bd = dd; best = mm; } }
        if (!best) { ctx.style.display = 'none'; ctx.innerHTML = ''; return; }
        const past = ((((this.myChar as any) || {}).pastBonds || []) as any[]).find((e) => e.key === 'm:' + best.kind);
        let h = '';
        if (best.hp <= best.maxHp * 0.1) h += `<button class="pbtn gold" data-ctx-spare="${best.id}" type="button">🕊️ Tha mạng</button>`;
        h += `<button class="pbtn" data-ctx-feed="${best.id}" type="button">🍖 Cho ăn</button>`;
        if (past) h += `<button class="pbtn gold" data-ctx-reform="m:${best.kind}" type="button">${past.score >= 0 ? '💞 Kết lại duyên xưa' : '🥀 Đối mặt nợ cũ'}</button>`;
        ctx.innerHTML = h; ctx.style.display = 'flex';
        ctx.querySelectorAll('[data-ctx-spare]').forEach((b) => { (b as HTMLButtonElement).onclick = () => { this.socket.emit('bond_spare', { monsterId: (b as HTMLElement).getAttribute('data-ctx-spare') }); }; });
        ctx.querySelectorAll('[data-ctx-feed]').forEach((b) => { (b as HTMLButtonElement).onclick = () => { this.socket.emit('bond_feed', { monsterId: (b as HTMLElement).getAttribute('data-ctx-feed') }); }; });
        ctx.querySelectorAll('[data-ctx-reform]').forEach((b) => { (b as HTMLButtonElement).onclick = () => { this.socket.emit('bond_reform', { key: (b as HTMLElement).getAttribute('data-ctx-reform') }); }; });
      }, 500);
    }""")

io.open(P, 'w', encoding='utf-8').write(s)
print('gd321 client OK')
