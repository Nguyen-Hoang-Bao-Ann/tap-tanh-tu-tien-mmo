import io
P = 'client/src/main.ts'
s = io.open(P, encoding='utf-8').read()
def rep(old, new, n=1):
    global s
    assert s.count(old) == n, 'anchor %dx: %s' % (s.count(old), old[:70])
    s = s.replace(old, new)

# --- kieu du lieu dot 3 ---
rep("""directory: { id: string; name: string; intro: string; count: number; leader: string }[]""",
    """directory: { id: string; name: string; intro: string; count: number; leader: string; level?: number; open?: boolean; minRealm?: number; taxPct?: number }[]""")
rep("""founder?: boolean }[]; applicants:""",
    """founder?: boolean; muted?: boolean; chapPhap?: boolean }[]; applicants:""")
rep("""gardenHerbs?: { itemId: string; name: string }[] } | null = null;""",
    """gardenHerbs?: { itemId: string; name: string }[]; rules?: { open: boolean; minRealm: number; taxPct: number }; log?: { day: number; text: string }[]; acting?: { name: string } | null; canChair?: boolean; isChapPhap?: boolean; techs?: { id: string; name: string; cost: number; desc: string; learned: boolean }[] } | null = null;""")

# --- danh muc tong: hien tong quy + nut Vao tong ---
rep("""        html += `<div class="prow"><span class="pname">🏯 ${esc(d.name)}<span class="pdesc">Tông chủ ${esc(d.leader)} · ${d.count} thành viên${d.intro ? ' · ' + esc(d.intro) : ''}</span></span>${applied ? '<span class="pdesc">Đã gửi đơn…</span>' : `<button class="pbtn" data-sect="apply" data-id="${d.id}">Xin vào</button>`}</div>`;""",
    """        const REALMS326B = ['Phàm Nhân', 'Luyện Khí', 'Trúc Cơ', 'Kim Đan', 'Nguyên Anh', 'Hóa Thần', 'Phản Hư', 'Độ Kiếp', 'Tiên / Địa Tiên'];
        html += `<div class="prow"><span class="pname">🏯 ${esc(d.name)}<span class="pdesc">Tông chủ ${esc(d.leader)} · ${d.count} thành viên · Cấp ${d.level || 1} · ${d.open ? '🚪 Mở cửa tự vào' : '📝 Xét duyệt đơn'}${(d.minRealm || 0) > 0 ? ' · Từ ' + REALMS326B[d.minRealm || 0] : ''} · Thuế việc tông ${d.taxPct ?? 10}%${d.intro ? ' · ' + esc(d.intro) : ''}</span></span>${applied ? '<span class="pdesc">Đã gửi đơn…</span>' : (d.open ? `<button class="pbtn gold" data-sect="join" data-id="${d.id}">Vào tông</button><button class="pbtn" data-sect="apply" data-id="${d.id}">Xin vào</button>` : `<button class="pbtn" data-sect="apply" data-id="${d.id}">Xin vào</button>`)}</div>`; // GĐ326""")

# --- nut Chap Phap + cam chat trong hang thanh vien ---
rep("""        if ((g.myRole === 'chu' && m.role !== 'chu') || (g.myRole === 'pho' && (m.role === 'detu' || m.role === 'truonglao'))) acts.push(`<button class="pbtn" data-sect="kick" data-token="${m.token}">Trục xuất</button>`);""",
    """        if ((g.myRole === 'chu' && m.role !== 'chu') || (g.myRole === 'pho' && (m.role === 'detu' || m.role === 'truonglao'))) acts.push(`<button class="pbtn" data-sect="kick" data-token="${m.token}">Trục xuất</button>`);
        if ((g as any).isChapPhap && m.role === 'detu') acts.push(`<button class="pbtn" data-sect="kick" data-token="${m.token}">Trục xuất (Chấp Pháp)</button>`); // GĐ326
        if ((g.myRole === 'chu' || g.myRole === 'pho' || (g as any).isChapPhap) && m.role !== 'chu' && m.name !== this.myChar?.name) acts.push((m as any).muted ? '<span class="pdesc">🔇 Đang bị cấm chat</span>' : `<button class="pbtn" data-sect="mute" data-token="${m.token}">Cấm chat</button>`); // GĐ326""")

# --- cac khoi dot 3 truoc vong thanh vien ---
rep("""      for (const m of g.members) {
        const acts: string[] = [];""",
    """      { // GĐ326: Quyền Tông chủ + Tông quy + Tàng Kinh Các + Nhật ký
        const g326: any = g as any;
        const REALMS326 = ['Phàm Nhân', 'Luyện Khí', 'Trúc Cơ', 'Kim Đan', 'Nguyên Anh', 'Hóa Thần', 'Phản Hư', 'Độ Kiếp', 'Tiên / Địa Tiên'];
        if (g326.acting) html += `<div class="prow"><span class="pname">👑 Quyền Tông chủ: ${esc(g326.acting.name)}<span class="pdesc">Tông chủ vắng mặt lâu — Quyền Tông chủ điều hành tạm thời (không giải tán / truyền ngôi được; Tông chủ về là hết quyền, vắng đủ 30 ngày game thì kế vị hẳn)</span></span></div>`;
        const rl326 = g326.rules || { open: false, minRealm: 0, taxPct: 10 };
        if (g326.canChair) {
          html += '<div class="prow"><span class="pname">📜 Tông quy<span class="pdesc">Thuế việc tông: phần % tiền thưởng mỗi việc ở Bảng Ủy Thác được chia đều cho thành viên đang online (còn lại vào quỹ)</span></span></div>';
          html += `<div class="prow"><span class="pname"><label><input type="checkbox" id="sectRuleOpen" ${rl326.open ? 'checked' : ''}> Mở cửa tự vào (khỏi duyệt đơn)</label></span><span style="display:flex;gap:4px;align-items:center;flex-wrap:wrap">Từ cảnh <select id="sectRuleRealm">${REALMS326.map((n, i) => `<option value="${i}" ${i === rl326.minRealm ? 'selected' : ''}>${n}</option>`).join('')}</select> · Thuế <input id="sectRuleTax" type="number" min="0" max="30" value="${rl326.taxPct}" style="width:56px">% <button class="pbtn gold" data-sect="rules-save">Lưu tông quy</button></span></div>`;
        } else html += `<div class="prow"><span class="pname">📜 Tông quy<span class="pdesc">${rl326.open ? '🚪 Mở cửa tự vào' : '📝 Vào tông phải được duyệt đơn'} · Cảnh tối thiểu: ${REALMS326[rl326.minRealm] || 'Phàm Nhân'} · Thuế việc tông: ${rl326.taxPct}%</span></span></div>`;
        if ((g326.buildings || []).some((b: any) => b.kind === 'tangkinh')) {
          html += '<div class="prow"><span class="pname">📚 Tàng Kinh Các — Tông pháp<span class="pdesc">Tới công trình Tàng Kinh Các ở trụ sở để học; pháp chỉ có tác dụng khi còn là thành viên tông</span></span></div>';
          for (const t of g326.techs || []) html += `<div class="prow"><span class="pname">${esc(t.name)}<span class="pdesc">${esc(t.desc)} · ${t.cost} Tông Cống</span></span>${t.learned ? '<span class="pdesc">✓ Đã học</span>' : `<button class="pbtn gold" data-sect="tech-learn" data-id="${t.id}">Học</button>`}</div>`;
        }
        if ((g326.log || []).length) { html += '<div class="prow"><span class="pname">🗞️ Nhật ký tông</span></div>'; for (const e of g326.log) html += `<div class="prow"><span class="pname"><span class="pdesc">Ngày ${e.day} — ${esc(e.text)}</span></span></div>`; }
      }
      for (const m of g.members) {
        const acts: string[] = [];""")

# --- xu ly nut moi ---
rep("""        else if (act === 'apply') this.socket.emit('sect_apply', { sectId: id });""",
    """        else if (act === 'apply') this.socket.emit('sect_apply', { sectId: id });
        else if (act === 'join') this.socket.emit('sect_join', { sectId: id }); // GĐ326
        else if (act === 'rules-save') { const o = (document.getElementById('sectRuleOpen') as HTMLInputElement | null)?.checked || false; const r = Number((document.getElementById('sectRuleRealm') as HTMLSelectElement | null)?.value || 0); const t = Number((document.getElementById('sectRuleTax') as HTMLInputElement | null)?.value || 0); this.socket.emit('sect_rules_set', { open: o, minRealm: r, taxPct: t }); } // GĐ326
        else if (act === 'tech-learn') this.socket.emit('sect_tech_learn', { techId: id }); // GĐ326
        else if (act === 'mute') this.socket.emit('sect_mute', { token }); // GĐ326""")

io.open(P, 'w', encoding='utf-8').write(s)
print('gd326 client OK')
