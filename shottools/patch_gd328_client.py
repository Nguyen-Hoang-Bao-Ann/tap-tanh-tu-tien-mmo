# GĐ328 client — panel công pháp tự sáng tạo: danh sách + nộp đồ + học/vận hành/phế + form sáng tạo + nút Danh Dự
import io
P = 'client/src/main.ts'
s = io.open(P, encoding='utf-8').read()

def rep(old, new, n=1):
    global s
    c = s.count(old)
    assert c == n, 'anchor %dx (want %d): %s' % (c, n, old[:80])
    s = s.replace(old, new)

# 1) Kiểu dữ liệu: cờ Danh Dự ở thành viên + khối arts ở mySect + trường nháp form
rep("""muted?: boolean; chapPhap?: boolean }[]""",
    """muted?: boolean; chapPhap?: boolean; honor?: boolean }[]""")
rep("""techs?: { id: string; name: string; cost: number; desc: string; learned: boolean }[] } | null = null;""",
    """techs?: { id: string; name: string; cost: number; desc: string; learned: boolean }[]; arts?: { id: string; name: string; grade: string; gradeName: string; creatorName: string; element: string; comps: Record<string, number>; flaw: string; status: string; progress: number; need: number; learned: boolean; active: boolean; learnCost: number }[]; artSlots?: number; canCreateArt?: boolean; artCatalog?: { grades: { id: string; name: string; budget: number }[]; comps: { id: string; name: string; per: number; w: number; max: number }[]; flaws: { id: string; name: string; comp: string; amt: number }[]; flawBonus: number } } | null = null;
  private artDraftComps: Record<string, number> = {}; // GĐ328: nháp ghép thành phần của form sáng tạo (giữ qua các lần vẽ lại panel)""")

# 2) Hàng thành viên: nút Phong/Bỏ Trưởng Lão Danh Dự cho Trưởng lão (người cầm quyền tông)
rep("""          acts.push(`<button class="pbtn" data-sect="transfer" data-token="${m.token}">Truyền ngôi</button>`);
        }""",
    """          acts.push(`<button class="pbtn" data-sect="transfer" data-token="${m.token}">Truyền ngôi</button>`);
        }
        if ((g as any).canChair && m.role === 'truonglao') acts.push((m as any).honor ? `<button class="pbtn" data-sect="honor-off" data-token="${m.token}">Bỏ Danh Dự</button>` : `<button class="pbtn" data-sect="honor-on" data-token="${m.token}">Phong Danh Dự</button>`); // GĐ328: Trưởng Lão Danh Dự — được quyền sáng tạo công pháp""")

# 3) Khối Công pháp tự sáng tạo (trước mục Nhật ký tông)
ARTS_BLOCK = """        { // GĐ328: CÔNG PHÁP TỰ SÁNG TẠO của tông
          const cat328: any = g326.artCatalog || { grades: [], comps: [], flaws: [], flawBonus: 4 };
          const compOf328 = (id: string) => (cat328.comps || []).find((c: any) => c.id === id) || {};
          const flawOf328 = (id: string) => (cat328.flaws || []).find((f: any) => f.id === id) || {};
          const fxText328 = (a: any) => { const parts: string[] = []; for (const cid of Object.keys(a.comps || {})) parts.push(`+${(compOf328(cid).per || 1) * a.comps[cid]}% ${compOf328(cid).name || cid}`); const fl = flawOf328(a.flaw); if (fl && fl.name) parts.push(`khuyết ${fl.name} (${fl.amt}% ${compOf328(fl.comp).name || fl.comp})`); return parts.join(' · '); };
          const ELE328: Record<string, string> = { kim: 'Kim ⚙', moc: 'Mộc 🌿', thuy: 'Thủy 💧', hoa: 'Hỏa 🔥', tho: 'Thổ ⛰' };
          html += `<div class="prow"><span class="pname">📜 Công pháp tự sáng tạo của tông<span class="pdesc">Ô pháp: ${(g326.arts || []).length}/${g326.artSlots || 1} (theo cấp tông) · Pháp do Tông chủ / Phó / Trưởng Lão Danh Dự sáng tạo riêng — học ở Tàng Kinh Các, vận hành tối đa 2 cùng lúc, rời tông mất hiệu lực</span></span></div>`;
          for (const a of g326.arts || []) {
            if (a.status === 'researching') {
              const inv328: Record<string, number> = (((this.myChar as any) || {}).inventory || {}) as Record<string, number>;
              const opts328 = Object.keys(inv328).filter((k) => (inv328[k] || 0) > 0).map((k) => `<option value="${k}">${esc(ITEM_INFO[k]?.name || k)} (${inv328[k]})</option>`).join('');
              html += `<div class="prow"><span class="pname">${esc(a.name)}<span class="pdesc">${esc(a.gradeName)} · hệ ${ELE328[a.element] || a.element} · Khai sáng: ${esc(a.creatorName)} · ${fxText328(a)} · ⏳ Đang ngộ ${a.progress}/${a.need} điểm</span></span>${g326.canChair ? `<button class="pbtn" data-sect="art-delete" data-id="${a.id}">Phế</button>` : ''}</div>`;
              html += `<div class="prow"><span class="pname">Góp vật phẩm ngộ pháp<span class="pdesc">Nộp đồ trong túi để đẩy tiến độ — đồ hiếm góp nhiều điểm hơn; việc Bảng Ủy Thác xong cũng góp +10</span></span><span style="display:flex;gap:4px;align-items:center;flex-wrap:wrap"><select id="artDonateItem">${opts328}</select><input id="artDonateQty" type="number" min="1" max="99" value="1" style="width:52px"><button class="pbtn gold" data-sect="art-donate">Nộp</button></span></div>`;
            } else {
              html += `<div class="prow"><span class="pname">${esc(a.name)}<span class="pdesc">${esc(a.gradeName)} · hệ ${ELE328[a.element] || a.element} · Khai sáng: ${esc(a.creatorName)} · ${fxText328(a)}${a.learned ? '' : ` · Học: ${a.learnCost} Tông Cống (Nội Môn trở lên)`}</span></span>${a.learned ? `<button class="pbtn ${a.active ? 'gold' : ''}" data-sect="art-toggle" data-id="${a.id}">${a.active ? '✓ Đang vận hành' : 'Vận hành'}</button>` : `<button class="pbtn gold" data-sect="art-learn" data-id="${a.id}">Học</button>`}${g326.canChair ? `<button class="pbtn" data-sect="art-delete" data-id="${a.id}">Phế</button>` : ''}</div>`;
            }
          }
          if (g326.canCreateArt) {
            const usedW328 = (cat328.comps || []).reduce((t: number, c: any) => t + (c.w || 0) * (this.artDraftComps[c.id] || 0), 0);
            html += '<div class="prow"><span class="pname">✒️ Sáng tạo công pháp mới<span class="pdesc">Ghép thành phần trong ngân sách của cấp pháp; bắt buộc chọn 1 khuyết điểm (được cộng ngân sách). Tốn quỹ tông + Linh thạch/nguyên liệu của chính người tạo — cấp Địa/Thiên còn đốt thọ nguyên. Pháp tạo xong phải NGỘ (cả tông góp tiến độ) mới học được.</span></span></div>';
            html += `<div class="prow"><span class="pname">Tên pháp: <input id="artName" type="text" maxlength="24" placeholder="3–24 ký tự" style="width:170px"></span><span>Cấp: <select id="artGrade">${(cat328.grades || []).map((x: any) => `<option value="${x.id}">${x.name} · ngân sách ${x.budget}</option>`).join('')}</select></span></div>`;
            for (const c of cat328.comps || []) html += `<div class="prow"><span class="pname">${c.name}<span class="pdesc">+${c.per}% mỗi bậc · trọng số ${c.w}/bậc · tối đa ${c.max} bậc</span></span><span style="display:flex;gap:4px;align-items:center"><button class="pbtn" data-sect="art-step" data-id="${c.id}" data-delta="-1">−</button><span id="artN-${c.id}">${this.artDraftComps[c.id] || 0}</span><button class="pbtn" data-sect="art-step" data-id="${c.id}" data-delta="1">+</button></span></div>`;
            html += `<div class="prow"><span class="pname">Khuyết điểm (bắt buộc)<span class="pdesc">Được +${cat328.flawBonus} ngân sách — không có pháp nào hoàn hảo</span></span><select id="artFlaw"><option value="">— chọn khuyết điểm —</option>${(cat328.flaws || []).map((f: any) => `<option value="${f.id}">${f.name} (${f.amt}% ${compOf328(f.comp).name || f.comp})</option>`).join('')}</select></div>`;
            html += `<div class="prow"><span class="pname"><span class="pdesc" id="artBudget">Trọng số đã ghép: ${usedW328}</span></span><button class="pbtn gold" data-sect="art-create">✒️ Khởi sáng công pháp</button></div>`;
          }
        }
"""
rep("""        if ((g326.log || []).length) { html += '<div class="prow"><span class="pname">🗞️ Nhật ký tông</span></div>';""",
    ARTS_BLOCK + """        if ((g326.log || []).length) { html += '<div class="prow"><span class="pname">🗞️ Nhật ký tông</span></div>';""")

# 4) Ủy quyền thao tác
rep("""        else if (act === 'tech-learn') this.socket.emit('sect_tech_learn', { techId: id }); // GĐ326""",
    """        else if (act === 'tech-learn') this.socket.emit('sect_tech_learn', { techId: id }); // GĐ326
        else if (act === 'honor-on') this.socket.emit('sect_honor_set', { token, on: true }); // GĐ328
        else if (act === 'honor-off') this.socket.emit('sect_honor_set', { token, on: false }); // GĐ328
        else if (act === 'art-learn') this.socket.emit('sect_art_learn', { artId: id }); // GĐ328
        else if (act === 'art-toggle') this.socket.emit('sect_art_toggle', { artId: id }); // GĐ328
        else if (act === 'art-delete') this.socket.emit('sect_art_delete', { artId: id }); // GĐ328
        else if (act === 'art-donate') { const it = (document.getElementById('artDonateItem') as HTMLSelectElement | null)?.value || ''; const q = Number((document.getElementById('artDonateQty') as HTMLInputElement | null)?.value || 1); if (it) this.socket.emit('sect_art_donate', { itemId: it, qty: q }); } // GĐ328
        else if (act === 'art-step') { const cid = id || ''; const d = Number(b.dataset.delta || 0); const st328: any = this.sectState as any; const cat328: any = (st328 && st328.mySect && st328.mySect.artCatalog) || { comps: [] }; const cd328 = (cat328.comps || []).find((c: any) => c.id === cid); if (cd328) { const nv = Math.max(0, Math.min(cd328.max, (this.artDraftComps[cid] || 0) + d)); this.artDraftComps[cid] = nv; const sp = document.getElementById('artN-' + cid); if (sp) sp.textContent = String(nv); const used = (cat328.comps || []).reduce((t: number, c: any) => t + (c.w || 0) * (this.artDraftComps[c.id] || 0), 0); const bd = document.getElementById('artBudget'); if (bd) bd.textContent = 'Trọng số đã ghép: ' + used; } } // GĐ328: nút +/- của form sáng tạo — chỉ cập nhật nháp + số trên form, không gửi server
        else if (act === 'art-create') { const nm = (document.getElementById('artName') as HTMLInputElement | null)?.value || ''; const gr = (document.getElementById('artGrade') as HTMLSelectElement | null)?.value || 'pham'; const fl = (document.getElementById('artFlaw') as HTMLSelectElement | null)?.value || ''; const comps: Record<string, number> = {}; for (const k of Object.keys(this.artDraftComps)) if ((this.artDraftComps[k] || 0) > 0) comps[k] = this.artDraftComps[k]; this.socket.emit('sect_art_create', { name: nm, gradeId: gr, comps, flawId: fl }); } // GĐ328""")

io.open(P, 'w', encoding='utf-8').write(s)
print('gd328 client OK')
