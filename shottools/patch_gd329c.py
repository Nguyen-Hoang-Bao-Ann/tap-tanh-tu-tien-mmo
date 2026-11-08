# GĐ329c client — form tạo chiến kỹ (thể loại + thành phần CK + khuyết CK) + nút Lắp/Gỡ ô chiêu ở hàng pháp
import io
P = 'client/src/main.ts'
s = io.open(P, encoding='utf-8').read()

def rep(old, new, n=1):
    global s
    c = s.count(old)
    assert c == n, 'anchor %dx (want %d): %s' % (c, n, old[:80])
    s = s.replace(old, new)

# 1) Kiểu + trường nháp thể loại
rep("""flaws: { id: string; name: string; comp: string; amt: number }[]; flawBonus: number }""",
    """flaws: { id: string; name: string; comp: string; amt: number }[]; flawBonus: number; compsCk: { id: string; name: string; per: number; w: number; max: number }[]; flawsCk: { id: string; name: string; comp: string; amt: number }[] }""")
rep("""learned: boolean; active: boolean; learnCost: number }[];""",
    """learned: boolean; active: boolean; learnCost: number; kind: string; skill: { coef: number; range: number; mana: number; cdMs: number; text: string } | null }[];""")
rep("""  private artDraftComps: Record<string, number> = {}; // GĐ328: nháp ghép thành phần của form sáng tạo (giữ qua các lần vẽ lại panel)""",
    """  private artDraftComps: Record<string, number> = {}; // GĐ328: nháp ghép thành phần của form sáng tạo (giữ qua các lần vẽ lại panel)
  private artDraftKind: string = 'tamphap'; // GĐ329: thể loại đang chọn ở form sáng tạo (tamphap | chienky)""")

# 2) Hàng pháp đang ngộ: hiện số chiến kỹ nếu là CK
rep("""· ${fxText328(a)} · ⏳ Đang ngộ ${a.progress}/${a.need} điểm""",
    """· ${a.kind === 'chienky' ? '⚔ Chiến kỹ · ' + ((a.skill && a.skill.text) || '') : fxText328(a)} · ⏳ Đang ngộ ${a.progress}/${a.need} điểm""")

# 3) Hàng pháp đã thành: nút theo thể loại (CK = Lắp/Gỡ ô chiêu; tâm pháp = Vận hành)
rep("""              html += `<div class="prow"><span class="pname">${esc(a.name)}<span class="pdesc">${esc(a.gradeName)} · hệ ${ELE328[a.element] || a.element} · Khai sáng: ${esc(a.creatorName)} · ${fxText328(a)}${a.learned ? '' : ` · Học: ${a.learnCost} Tông Cống (Nội Môn trở lên)`}</span></span>${a.learned ? `<button class="pbtn ${a.active ? 'gold' : ''}" data-sect="art-toggle" data-id="${a.id}">${a.active ? '✓ Đang vận hành' : 'Vận hành'}</button>` : `<button class="pbtn gold" data-sect="art-learn" data-id="${a.id}">Học</button>`}${g326.canChair ? `<button class="pbtn" data-sect="art-delete" data-id="${a.id}">Phế</button>` : ''}</div>`;""",
    """              const isCk329r = a.kind === 'chienky';
              const eq329r = isCk329r && a.learned ? !!((((this.myChar as any) || {}).catalog || []).find((c: any) => c.id === 'art:' + a.id) || {}).equipped : false;
              const btn329r = isCk329r ? (a.learned ? (eq329r ? `<button class="pbtn" data-sect="art-unequip" data-id="art:${a.id}">Gỡ ô chiêu</button>` : `<button class="pbtn gold" data-sect="art-equip" data-id="art:${a.id}">Lắp ô chiêu</button>`) : `<button class="pbtn gold" data-sect="art-learn" data-id="${a.id}">Học</button>`) : (a.learned ? `<button class="pbtn ${a.active ? 'gold' : ''}" data-sect="art-toggle" data-id="${a.id}">${a.active ? '✓ Đang vận hành' : 'Vận hành'}</button>` : `<button class="pbtn gold" data-sect="art-learn" data-id="${a.id}">Học</button>`);
              html += `<div class="prow"><span class="pname">${esc(a.name)}<span class="pdesc">${esc(a.gradeName)} · hệ ${ELE328[a.element] || a.element} · Khai sáng: ${esc(a.creatorName)} · ${isCk329r ? '⚔ Chiến kỹ · ' + ((a.skill && a.skill.text) || '') : fxText328(a)}${a.learned ? '' : ` · Học: ${a.learnCost} Tông Cống (Nội Môn trở lên)`}</span></span>${btn329r}${g326.canChair ? `<button class="pbtn" data-sect="art-delete" data-id="${a.id}">Phế</button>` : ''}</div>`;""")

# 4) Form: đếm trọng số cả 2 bảng + chọn thể loại + nhóm thành phần CK + khuyết CK
rep("""            const usedW328 = (cat328.comps || []).reduce((t: number, c: any) => t + (c.w || 0) * (this.artDraftComps[c.id] || 0), 0);""",
    """            const usedW328 = (cat328.comps || []).reduce((t: number, c: any) => t + (c.w || 0) * (this.artDraftComps[c.id] || 0), 0);
            const usedW329 = (cat328.compsCk || []).reduce((t: number, c: any) => t + (c.w || 0) * (this.artDraftComps[c.id] || 0), 0);""")
rep("""            html += `<div class="prow"><span class="pname">Tên pháp: <input id="artName" type="text" maxlength="24" placeholder="3–24 ký tự" style="width:170px"></span><span>Cấp: <select id="artGrade">${(cat328.grades || []).map((x: any) => `<option value="${x.id}">${x.name} · ngân sách ${x.budget}</option>`).join('')}</select></span></div>`;""",
    """            html += `<div class="prow"><span class="pname">Tên pháp: <input id="artName" type="text" maxlength="24" placeholder="3–24 ký tự" style="width:170px"></span><span>Cấp: <select id="artGrade">${(cat328.grades || []).map((x: any) => `<option value="${x.id}">${x.name} · ngân sách ${x.budget}</option>`).join('')}</select></span></div>`;
            html += `<div class="prow"><span class="pname">Thể loại đang tạo: <span id="artKindLabel">${this.artDraftKind === 'chienky' ? '⚔ Chiến kỹ (chiêu đánh thật, lắp ô chiêu)' : '📿 Tâm pháp (bị động, vận hành)'}</span><span class="pdesc">Chỉ ghép thành phần + khuyết điểm của đúng thể loại đang chọn</span></span><span style="display:flex;gap:4px"><button class="pbtn" data-sect="art-kind" data-id="tamphap">📿 Tâm pháp</button><button class="pbtn" data-sect="art-kind" data-id="chienky">⚔ Chiến kỹ</button></span></div>`;
            html += '<div class="prow"><span class="pname">— Thành phần Tâm pháp —</span></div>';""")
rep("""            html += `<div class="prow"><span class="pname">Khuyết điểm (bắt buộc)<span class="pdesc">Được +${cat328.flawBonus} ngân sách — không có pháp nào hoàn hảo</span></span><select id="artFlaw">""",
    """            html += '<div class="prow"><span class="pname">— Thành phần Chiến kỹ —<span class="pdesc">Sát thương +0,4 hệ số/bậc (trần theo cấp pháp) · Tầm +1 ô/bậc · Đánh vùng = trúng mọi quái trong tầm · Làm chậm +10%/bậc trong 2,5 giây</span></span></div>';
            for (const c of cat328.compsCk || []) html += `<div class="prow"><span class="pname">${c.name}<span class="pdesc">trọng số ${c.w}/bậc · tối đa ${c.max} bậc</span></span><span style="display:flex;gap:4px;align-items:center"><button class="pbtn" data-sect="art-step" data-id="${c.id}" data-delta="-1">−</button><span id="artN-${c.id}">${this.artDraftComps[c.id] || 0}</span><button class="pbtn" data-sect="art-step" data-id="${c.id}" data-delta="1">+</button></span></div>`;
            html += `<div class="prow"><span class="pname">Khuyết điểm Chiến kỹ<span class="pdesc">Chỉ áp khi tạo Chiến kỹ</span></span><select id="artFlawCk"><option value="">— chọn khuyết điểm —</option>${(cat328.flawsCk || []).map((f: any) => `<option value="${f.id}">${f.name}</option>`).join('')}</select></div>`;
            html += `<div class="prow"><span class="pname">Khuyết điểm Tâm pháp<span class="pdesc">Được +${cat328.flawBonus} ngân sách — không có pháp nào hoàn hảo; chỉ áp khi tạo Tâm pháp</span></span><select id="artFlaw">""")
rep("""<span class="pdesc" id="artBudget">Trọng số đã ghép: ${usedW328}</span>""",
    """<span class="pdesc" id="artBudget">Trọng số — Tâm pháp: ${usedW328} · Chiến kỹ: ${usedW329}</span>""")

# 5) Ủy quyền: nút thể loại / lắp / gỡ + art-step cập nhật cả 2 tổng + art-create theo thể loại
rep("""        else if (act === 'art-toggle') this.socket.emit('sect_art_toggle', { artId: id }); // GĐ328""",
    """        else if (act === 'art-toggle') this.socket.emit('sect_art_toggle', { artId: id }); // GĐ328
        else if (act === 'art-kind') { this.artDraftKind = id === 'chienky' ? 'chienky' : 'tamphap'; const lb = document.getElementById('artKindLabel'); if (lb) lb.textContent = this.artDraftKind === 'chienky' ? '⚔ Chiến kỹ (chiêu đánh thật, lắp ô chiêu)' : '📿 Tâm pháp (bị động, vận hành)'; } // GĐ329
        else if (act === 'art-equip') this.socket.emit('equip_skill', { skillId: id }); // GĐ329: lắp chiến kỹ tông vào ô chiêu
        else if (act === 'art-unequip') this.socket.emit('unequip_skill', { skillId: id }); // GĐ329""")
rep("""const used = (cat328.comps || []).reduce((t: number, c: any) => t + (c.w || 0) * (this.artDraftComps[c.id] || 0), 0); const bd = document.getElementById('artBudget'); if (bd) bd.textContent = 'Trọng số đã ghép: ' + used;""",
    """const used = (cat328.comps || []).reduce((t: number, c: any) => t + (c.w || 0) * (this.artDraftComps[c.id] || 0), 0); const usedCk = (cat328.compsCk || []).reduce((t: number, c: any) => t + (c.w || 0) * (this.artDraftComps[c.id] || 0), 0); const bd = document.getElementById('artBudget'); if (bd) bd.textContent = 'Trọng số — Tâm pháp: ' + used + ' · Chiến kỹ: ' + usedCk;""")
rep("""        else if (act === 'art-create') { const nm = (document.getElementById('artName') as HTMLInputElement | null)?.value || ''; const gr = (document.getElementById('artGrade') as HTMLSelectElement | null)?.value || 'pham'; const fl = (document.getElementById('artFlaw') as HTMLSelectElement | null)?.value || ''; const comps: Record<string, number> = {}; for (const k of Object.keys(this.artDraftComps)) if ((this.artDraftComps[k] || 0) > 0) comps[k] = this.artDraftComps[k]; this.socket.emit('sect_art_create', { name: nm, gradeId: gr, comps, flawId: fl }); } // GĐ328""",
    """        else if (act === 'art-create') { const nm = (document.getElementById('artName') as HTMLInputElement | null)?.value || ''; const gr = (document.getElementById('artGrade') as HTMLSelectElement | null)?.value || 'pham'; const kind329 = this.artDraftKind === 'chienky' ? 'chienky' : 'tamphap'; const fl = (document.getElementById(kind329 === 'chienky' ? 'artFlawCk' : 'artFlaw') as HTMLSelectElement | null)?.value || ''; const st329: any = this.sectState as any; const cat329: any = (st329 && st329.mySect && st329.mySect.artCatalog) || {}; const table329 = kind329 === 'chienky' ? (cat329.compsCk || []) : (cat329.comps || []); const allow329 = new Set(table329.map((c: any) => c.id)); const comps: Record<string, number> = {}; for (const k of Object.keys(this.artDraftComps)) if ((this.artDraftComps[k] || 0) > 0 && allow329.has(k)) comps[k] = this.artDraftComps[k]; this.socket.emit('sect_art_create', { name: nm, gradeId: gr, comps, flawId: fl, kind: kind329 }); } // GĐ328 + GĐ329""")

io.open(P, 'w', encoding='utf-8').write(s)
print('gd329c client OK')
