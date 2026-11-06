# GĐ319 client: ITEM_INFO 2 vật mới + dialog Quản Sự (khai tông) + sect panel mở rộng
# (trụ sở/phòng ban/tầng đệ tử/vườn tông/thiếp đồng sáng lập) + vẽ bia & công trình trong thế giới.
# Chay: python3 shottools/patch_gd319_client.py (tu thu muc game)
import io
P = '/home/hatch/workspace/tap-tanh-tu-tien-mmo/client/src/main.ts'
s = io.open(P, encoding='utf-8').read()
def rep(old, new, n=1):
    global s
    assert s.count(old) == n, 'anchor %dx: %s' % (s.count(old), old[:70])
    s = s.replace(old, new)

# --- 1) ITEM_INFO hai vat moi ---
rep("  dan_cuu_chuyen: { name: 'Cửu Chuyển Đan', desc: 'Dùng: hồi 100% HP và 50% Chân nguyên' }, // GĐ305",
"""  dan_cuu_chuyen: { name: 'Cửu Chuyển Đan', desc: 'Dùng: hồi 100% HP và 50% Chân nguyên' }, // GĐ305
  lenh_bai_tong_mon: { name: 'Lệnh Bài Tông Môn', desc: 'Quầy Quản Lý Đạo Quán cấp khi khai tông. Mang tới vùng đất muốn đặt trụ sở và DÙNG — hóa thành Tông Môn Thạch Bia khắc tên tông.' }, // GĐ319
  tran_phap_khai_son: { name: 'Trận Pháp Khai Sơn', desc: 'Dùng 1 lần cạnh Thạch Bia của tông: dựng 7 công trình cơ bản quanh bia.' }, // GĐ319""")

# --- 2) NpcDialogData: sectFoundInfo ---
rep("""  merchantInfo?: {""",
"""  sectFoundInfo?: { // GĐ319: quy trình khai tông ở Quầy Quản Lý Đạo Quán
    inSect: boolean; realmOk: boolean; realmName: string; fightPassed: boolean;
    slipCount: number; slipNames: string[]; feeNow: number; feeGroup: number; feeSolo: number; slipNeed: number;
    stonesTrung: number; canRegister: boolean;
  } | null;
  merchantInfo?: {""")

# --- 3) openNpcDialog: khoi Quay Quan Ly (chen truoc khoi tang qua GĐ320) ---
rep("    // GĐ320: tặng quà cho NPC (+15 nếu đúng món thích, +3 món khác) + chọn nhánh khi đã Bạn thân",
"""    // GĐ319: QUẦY QUẢN LÝ — quy trình khai tông 3 bài kiểm tra
    if (d.sectFoundInfo) {
      const f = d.sectFoundInfo;
      if (f.inSect) {
        html += `<div class="prow"><span class="pname">🏯 Khai tông lập phái<span class="pdesc">Bạn đã có tông môn rồi — quầy chỉ tiếp nhận khai tông cho người chưa có tông.</span></span></div>`;
      } else {
        html += `<div class="prow"><span class="pname">🏯 ĐĂNG KÝ KHAI TÔNG — 3 bài kiểm tra của Quầy Quản Lý</span></div>`;
        html += `<div class="prow"><span class="pname">${f.realmOk ? '✔' : '✘'} Bài 1 · TU VI<span class="pdesc">Cần Nguyên Anh trở lên (đang ${f.realmName}) và thắng Khảo Quan Ảnh do quầy triệu hồi${f.fightPassed ? ' — ĐÃ THẮNG ✔' : ''}</span></span>${!f.fightPassed && f.realmOk ? '<button class="pbtn gold" data-found-fight="1">Thi khảo hạch</button>' : ''}</div>`;
        html += `<div class="prow"><span class="pname">${f.slipCount >= f.slipNeed ? '✔' : '•'} Bài 3 · SỐ NGƯỜI<span class="pdesc">Thiếp Đồng Sáng Lập: ${f.slipCount}/${f.slipNeed} người đồng ý${f.slipNames.length ? ' — ' + f.slipNames.join(', ') : ''}. Đủ ${f.slipNeed} người: phí giảm còn ${f.feeGroup.toLocaleString('vi-VN')} TP và họ thành thành viên sáng lập. Lập một mình cũng được — Bài 3 tự qua với phí cao hơn.</span></span><span style="display:flex;gap:4px"><input id="foundInviteInput" maxlength="32" style="width:130px" placeholder="Tên người mời…"><button class="pbtn" data-found-invite="1">Gửi thiếp</button></span></div>`;
        html += `<div class="prow"><span class="pname">${f.stonesTrung >= f.feeNow ? '✔' : '✘'} Bài 2 · TÀI NGUYÊN<span class="pdesc">Phí khai tông hiện tại: ${f.feeNow.toLocaleString('vi-VN')} Linh thạch TRUNG PHẨM (đang có ${f.stonesTrung.toLocaleString('vi-VN')}) — thu tại quầy khi đăng ký</span></span></div>`;
        html += `<div class="prow"><span class="pname">✍️ Đăng ký khai tông<span class="pdesc">Đạt đủ điều kiện, quầy sẽ thu phí và trao Lệnh Bài Tông Môn + Trận Pháp Khai Sơn</span></span><span style="display:flex;gap:4px"><input id="foundNameInput" maxlength="24" style="width:150px" placeholder="Tên tông môn…"><button class="pbtn gold" data-found-register="1" ${f.canRegister ? '' : 'disabled'}>Đăng ký</button></span></div>`;
        if (!f.canRegister) html += `<div class="prow"><span class="pname"><i>Chưa đủ điều kiện đăng ký — xem từng bài ở trên.</i></span></div>`;
      }
    }
    // GĐ320: tặng quà cho NPC (+15 nếu đúng món thích, +3 món khác) + chọn nhánh khi đã Bạn thân""")

# --- 4) Wiring nut khai tong trong dialog (chen canh wiring data-gift) ---
import re
m = re.search(r"btns\.querySelectorAll<HTMLButtonElement>\('\[data-gift\]'\)\.forEach", s)
assert m, 'khong thay wiring data-gift'
wiring = """    btns.querySelectorAll<HTMLButtonElement>('[data-found-fight]').forEach((b) => { b.onclick = () => { this.socket.emit('sect_found_fight'); p.style.display = 'none'; }; });
    btns.querySelectorAll<HTMLButtonElement>('[data-found-invite]').forEach((b) => { b.onclick = () => { const n = (document.getElementById('foundInviteInput') as HTMLInputElement | null)?.value || ''; if (n.trim()) this.socket.emit('sect_found_invite', { name: n.trim() }); }; });
    btns.querySelectorAll<HTMLButtonElement>('[data-found-register]').forEach((b) => { b.onclick = () => { const n = (document.getElementById('foundNameInput') as HTMLInputElement | null)?.value || ''; if (n.trim()) { this.socket.emit('sect_found_register', { name: n.trim() }); p.style.display = 'none'; } }; });
"""
s = s[:m.start()] + wiring + s[m.start():]

# --- 5) sectState type: truong GĐ319 (tat ca optional) ---
rep("claimCost?: number; warCost?: number } | null = null; // GĐ224 // GĐ302: + lãnh địa",
"""claimCost?: number; warCost?: number; hq?: { mapId: string; mapName: string; x: number; y: number } | null; buildings?: { kind: string; name: string; x: number; y: number }[]; depts?: { key: string; name: string; chiefToken: string | null; chiefName: string | null }[]; myTier?: string; myTierName?: string; garden?: { i: number; herb: string | null; herbName: string | null; pts: number; stage: number; mature: boolean; canWater: boolean }[]; gardenHerbs?: { itemId: string; name: string }[] } | null = null; // GĐ224 // GĐ302: + lãnh địa // GĐ319: + trụ sở/phòng ban/vườn""")
rep("members: { token: string; name: string; role: string; roleName: string; realm: string; online: boolean }[];",
"members: { token: string; name: string; role: string; roleName: string; realm: string; online: boolean; contrib?: number; tier?: string; tierName?: string; founder?: boolean }[];")

# --- 6) Panel: header them tang + kho theo tang + hang thanh vien them tier/founder ---
rep("html += `<div class=\"prow\"><span class=\"pname\">🏯 ${esc(g.name)}<span class=\"pdesc\">Bạn là ${g.myRoleName} · ${g.members.length} thành viên</span></span></div>`;",
"html += `<div class=\"prow\"><span class=\"pname\">🏯 ${esc(g.name)}<span class=\"pdesc\">Bạn là ${g.myRoleName}${(g as any).myTierName && g.myRole === 'detu' ? ' · ' + (g as any).myTierName : ''} · ${g.members.length} thành viên</span></span></div>`;")
rep("${g.myRole !== 'detu' ? `<button class=\"pbtn\" data-sect=\"store-take\" data-id=\"${w.itemId}\">Lấy 1</button>` : '<span class=\"pdesc\">Trưởng lão trở lên mới lấy được</span>'}",
"${(g as any).myTier !== 'ngoaemon' ? `<button class=\"pbtn\" data-sect=\"store-take\" data-id=\"${w.itemId}\">Lấy 1</button>` : '<span class=\"pdesc\">Nội Môn (100 Tông Cống) trở lên mới lấy được</span>'}")
rep("html += `<div class=\"prow\"><span class=\"pname\">${m.online ? '🟢' : '⚪'} ${esc(m.name)}<span class=\"pdesc\">${m.roleName} · ${esc(m.realm)}</span></span>${acts.join('')}</div>`;",
"html += `<div class=\"prow\"><span class=\"pname\">${m.online ? '🟢' : '⚪'} ${esc(m.name)}<span class=\"pdesc\">${m.roleName}${(m as any).tierName && m.role === 'detu' ? ' · ' + (m as any).tierName : ''}${(m as any).founder ? ' · ⭐ Sáng Lập' : ''} · ${esc(m.realm)} · 💠 ${(m as any).contrib || 0} Tông Cống</span></span>${acts.join('')}</div>`;")

# --- 7) Panel: khoi TRU SO + PHONG BAN + VUON (chen truoc khoi don xin gia nhap) ---
rep("      if (g.applicants.length) {\n        html += '<div class=\"prow\"><span class=\"pname\">📥 Đơn xin gia nhập</span></div>';",
"""      // GĐ319: trụ sở + phòng ban + Dược Viên tông
      html += '<div class="prow"><span class="pname">🏯 Trụ sở tông môn</span></div>';
      if ((g as any).hq) {
        const hq = (g as any).hq;
        html += `<div class="prow"><span class="pname">🗿 Tông Môn Thạch Bia — ${esc(hq.mapName)}<span class="pdesc">Trụ sở của tông nằm ở map này. Tới đó để dùng các công trình: thiền ở Luyện Công Trường = nơi linh khí · luyện đan ở Đan Phòng và rèn ở Khí Phòng +5% tỉ lệ thành công · quầy tông mở ở Tàng Kinh Các (vẫn mở từ xa được)</span></span></div>`;
        for (const b of (g as any).buildings || []) html += `<div class="prow"><span class="pname">• ${esc(b.name)}</span></div>`;
        if (!((g as any).buildings || []).length) html += `<div class="prow"><span class="pname"><i>Chưa dựng công trình — Tông chủ tới đứng cạnh Thạch Bia và dùng Trận Pháp Khai Sơn trong túi.</i></span></div>`;
      } else {
        html += `<div class="prow"><span class="pname">Chưa đặt trụ sở<span class="pdesc">Tông chủ mang LỆNH BÀI TÔNG MÔN (trong túi) tới vùng hoang dã/bãi farm muốn đặt trụ sở rồi bấm Dùng — lệnh bài hóa thành Thạch Bia. Không đặt được trong làng/thành/bí cảnh/hang, phải cách cổng map 400px và cách trụ sở tông khác 800px.</span></span></div>`;
      }
      html += '<div class="prow"><span class="pname">🏛 Phòng ban & Đường Chủ</span></div>';
      for (const dp of (g as any).depts || []) {
        html += `<div class="prow"><span class="pname">${esc(dp.name)}<span class="pdesc">${dp.chiefName ? 'Đường Chủ: ' + esc(dp.chiefName) : 'Chưa có Đường Chủ'}</span></span>${g.myRole === 'chu' && dp.chiefName ? `<button class="pbtn" data-sect="dept-clear" data-id="${dp.key}">Bãi nhiệm</button>` : ''}</div>`;
      }
      if (g.myRole === 'chu') {
        const mOpts = g.members.filter((m) => m.role !== 'chu').map((m) => `<option value="${m.token}">${esc(m.name)}</option>`).join('');
        const dOpts = ((g as any).depts || []).map((dp: any) => `<option value="${dp.key}">${esc(dp.name)}</option>`).join('');
        if (mOpts) html += `<div class="prow"><span class="pname">Bổ nhiệm Đường Chủ<span class="pdesc">Một người chỉ đứng đầu một ban</span></span><span style="display:flex;gap:4px"><select id="sectDeptMemberSel">${mOpts}</select><select id="sectDeptSel">${dOpts}</select><button class="pbtn gold" data-sect="dept-set">Bổ nhiệm</button></span></div>`;
      }
      if (((g as any).buildings || []).some((b: any) => b.kind === 'duocvien')) {
        html += '<div class="prow"><span class="pname">🌿 Dược Viên tông (6 ô chung — làm tại Dược Viên ở trụ sở)</span></div>';
        const inv = ((this.myChar as unknown as { inventory?: Record<string, number> })?.inventory || {}) as Record<string, number>;
        for (const pl of (g as any).garden || []) {
          if (pl.herb) {
            html += `<div class="prow"><span class="pname">Ô ${pl.i + 1}: ${esc(pl.herbName || '')}<span class="pdesc">${pl.mature ? 'ĐÃ CHÍN — hái được (Nội Môn trở lên)' : 'Đang lớn · ' + pl.pts + '/35 điểm'}</span></span>${pl.canWater ? `<button class="pbtn" data-sect="garden-water" data-id="${pl.i}">Tưới</button>` : ''}${pl.mature ? `<button class="pbtn gold" data-sect="garden-harvest" data-id="${pl.i}">Hái ×3</button>` : ''}</div>`;
          } else {
            const hOpts = ((g as any).gardenHerbs || []).map((h: any) => `<option value="${h.itemId}">${esc(h.name)} (có ${inv[h.itemId] || 0})</option>`).join('');
            html += `<div class="prow"><span class="pname">Ô ${pl.i + 1}: trống</span><span style="display:flex;gap:4px"><select id="gardenSel${pl.i}">${hOpts}</select><button class="pbtn" data-sect="garden-plant" data-id="${pl.i}">Gieo</button></span></div>`;
          }
        }
      }
      if (g.applicants.length) {
        html += '<div class="prow"><span class="pname">📥 Đơn xin gia nhập</span></div>';""")

# --- 8) Panel nhanh chua co tong: bo form lap truc tiep, them thiep dong sang lap ---
rep("""      html += `<div class="prow"><span class="pname">🏯 Khai tông lập phái<span class="pdesc">Phí lập tông ${st.cost} Linh thạch — đặt tên tông (3–24 ký tự, không trùng)</span></span></div>`;
      html += `<div class="prow"><input id="sectNameInput" maxlength="24" style="flex:1;min-width:140px" placeholder="Tên tông môn…"><input id="sectIntroInput" maxlength="120" style="flex:1;min-width:140px" placeholder="Lời giới thiệu…"><button class="pbtn gold" data-sect="create">Lập tông</button></div>`;""",
"""      html += `<div class="prow"><span class="pname">🏯 Khai tông lập phái<span class="pdesc">Khai tông phải qua QUẦY QUẢN LÝ ở sân Đạo Quán (gặp Quản Sự Đạo Quán): 3 bài kiểm tra — TU VI (Nguyên Anh + thắng Khảo Quan Ảnh) · SỐ NGƯỜI (Thiếp Đồng Sáng Lập, đủ 5 người phí còn 30.000 Trung phẩm; một mình 70.000) · TÀI NGUYÊN (Linh thạch Trung phẩm). Qua kiểm tra được cấp Lệnh Bài + Trận Pháp dựng trụ sở.</span></span></div>`;
      const mc319 = this.myChar as unknown as { foundInvites?: Array<{ fromKey: string; fromName: string }>; foundSlipFor?: string | null; foundSlip?: { count: number; names: string[] } | null; foundTestPassed?: boolean };
      if (mc319.foundSlip) html += `<div class="prow"><span class="pname">📜 Thiếp Đồng Sáng Lập của bạn: ${mc319.foundSlip.count}/5 người đồng ý<span class="pdesc">${mc319.foundSlip.names.join(', ') || 'Chưa ai'} · Gửi thêm thiếp ở Quầy Quản Lý Đạo Quán</span></span></div>`;
      if ((mc319.foundInvites || []).length) {
        html += '<div class="prow"><span class="pname">📩 Thiếp Đồng Sáng Lập gửi tới bạn</span></div>';
        for (const fv of mc319.foundInvites || []) html += `<div class="prow"><span class="pname">🏯 ${esc(fv.fromName)} mời bạn đồng sáng lập tông mới<span class="pdesc">Đồng ý = thành viên Sáng Lập ngay khi tông thành lập</span></span><button class="pbtn gold" data-sect="found-ok" data-id="${fv.fromKey}">Đồng ý</button><button class="pbtn" data-sect="found-no" data-id="${fv.fromKey}">Từ chối</button></div>`;
      }
      if (mc319.foundSlipFor) html += `<div class="prow"><span class="pname">Bạn đã đồng ý đồng sáng lập cho một tông đang chờ lập<span class="pdesc">Rút đồng ý được bất cứ lúc nào trước khi tông thành lập</span></span><button class="pbtn" data-sect="found-withdraw">Rút đồng ý</button></div>`;""")

# --- 9) Dispatch nut moi ---
rep("        else if (act === 'war-declare') this.socket.emit('sect_war_declare', { pointId: id });",
"""        else if (act === 'war-declare') this.socket.emit('sect_war_declare', { pointId: id });
        else if (act === 'found-ok') this.socket.emit('sect_found_respond', { fromKey: id, accept: true });
        else if (act === 'found-no') this.socket.emit('sect_found_respond', { fromKey: id, accept: false });
        else if (act === 'found-withdraw') this.socket.emit('sect_found_withdraw');
        else if (act === 'dept-set') { const tk = (document.getElementById('sectDeptMemberSel') as HTMLSelectElement | null)?.value || ''; const dp = (document.getElementById('sectDeptSel') as HTMLSelectElement | null)?.value || ''; if (tk && dp) this.socket.emit('sect_dept_set', { dept: dp, token: tk }); }
        else if (act === 'dept-clear') this.socket.emit('sect_dept_set', { dept: id, token: '' });
        else if (act === 'garden-plant') { const h = (document.getElementById('gardenSel' + id) as HTMLSelectElement | null)?.value || ''; if (h) this.socket.emit('sect_garden_op', { plot: Number(id), op: 'plant', herbId: h }); }
        else if (act === 'garden-water') this.socket.emit('sect_garden_op', { plot: Number(id), op: 'water' });
        else if (act === 'garden-harvest') this.socket.emit('sect_garden_op', { plot: Number(id), op: 'harvest' });""")

# --- 10) sect_hqs: state + handler + render trong the gioi ---
rep("    this.socket.on('sect_state', (d: typeof this.sectState) => { this.sectState = d; if (this.openPanel === 'sect') this.renderSectPanel(); }); // GĐ224",
"""    this.socket.on('sect_state', (d: typeof this.sectState) => { this.sectState = d; if (this.openPanel === 'sect') this.renderSectPanel(); }); // GĐ224
    this.socket.on('sect_hqs', (d: { list: Array<{ sectId: string; name: string; mapId: string; x: number; y: number; buildings: Array<{ kind: string; name: string; x: number; y: number }> }> }) => { this.sectHqs = d.list || []; this.renderSectHqs(); }); // GĐ319""")
rep("  private renderGardenPlants(): void { // GĐ308",
"""  private sectHqs: Array<{ sectId: string; name: string; mapId: string; x: number; y: number; buildings: Array<{ kind: string; name: string; x: number; y: number }> }> = []; // GĐ319
  private sectHqObjs: Phaser.GameObjects.GameObject[] = []; // GĐ319
  private renderSectHqs(): void { // GĐ319: vẽ Thạch Bia + công trình các tông trên map hiện tại
    for (const o of this.sectHqObjs) o.destroy();
    this.sectHqObjs = [];
    const mid = this.mapState?.mapId || '';
    if (!mid) return;
    const BICON: Record<string, string> = { sonmon: '⛩️', daidien: '🏯', danphong: '⚗️', khiphong: '🔨', duocvien: '🌿', tangkinh: '📚', luyencong: '🧘' };
    for (const hq of this.sectHqs) {
      if (hq.mapId !== mid) continue;
      const bia = this.add.text(hq.x, hq.y, '🗿', { fontSize: '34px' }).setOrigin(0.5, 0.9).setDepth(-40);
      const lb = this.add.text(hq.x, hq.y + 8, `«${hq.name}»`, { fontFamily: 'Palatino, Georgia, serif', fontSize: '12px', color: '#ffd76a' }).setOrigin(0.5, 0).setDepth(-40);
      this.sectHqObjs.push(bia, lb);
      for (const b of hq.buildings || []) {
        const t = this.add.text(b.x, b.y, BICON[b.kind] || '🏠', { fontSize: '26px' }).setOrigin(0.5, 0.9).setDepth(-40);
        const bl = this.add.text(b.x, b.y + 6, b.name, { fontFamily: 'Palatino, Georgia, serif', fontSize: '9px', color: '#e8e2c8' }).setOrigin(0.5, 0).setDepth(-40);
        this.sectHqObjs.push(t, bl);
      }
    }
  }
  private renderGardenPlants(): void { // GĐ308""")
rep("this.renderGardenPlants();", "this.renderGardenPlants(); this.renderSectHqs(); // GĐ319", 2)

io.open(P, 'w', encoding='utf-8').write(s)
print('patch gd319 client OK')
