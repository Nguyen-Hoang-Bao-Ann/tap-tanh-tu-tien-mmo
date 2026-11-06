# GĐ320 client: panel Duyên Nợ + dialog NPC (mức quan hệ/tặng quà/chọn nhánh) + server bổ sung trường dialog.
# Chay: python3 shottools/patch_gd320_client.py
import io

# ---------- SERVER: trường Duyên Nợ trong hộp thoại NPC làng ----------
P = '/home/hatch/workspace/tap-tanh-tu-tien-mmo/server/index.js'
s = io.open(P, encoding='utf-8').read()
def rep(old, new, n=1):
    global s
    assert s.count(old) == n, 'server anchor %dx: %s' % (s.count(old), old[:70])
    s = s.replace(old, new)
rep("""      npcId: npc.id, name: npc.name, personality: npc.personality, shopId: npc.shopId || null,
      affinity: aff, gained,""",
"""      npcId: npc.id, name: npc.name, personality: npc.personality, shopId: npc.shopId || null,
      affinity: aff, gained,
      // GĐ320: DUYÊN NỢ — mức quan hệ + gợi ý món thích (quen mặt >=30 mới hé) + quà tặng được + chọn nhánh
      bondTierName: bondTierNameFor(player, 'n:' + npc.id, aff, (player.bonds && player.bonds['n:' + npc.id] && player.bonds['n:' + npc.id].branch) || null),
      bondBranch: (player.bonds && player.bonds['n:' + npc.id] && player.bonds['n:' + npc.id].branch) || null,
      bondCanChoose: aff >= 300 && !(player.bonds && player.bonds['n:' + npc.id] && player.bonds['n:' + npc.id].branch),
      likedItemName: aff >= 30 ? (ITEMS[npcLikedItem(npc.id)] && ITEMS[npcLikedItem(npc.id)].name) || null : null,
      giftItems: NPC_GIFT_POOL.filter((id) => (player.inventory[id] || 0) > 0).map((id) => ({ id, name: (ITEMS[id] && ITEMS[id].name) || id, qty: player.inventory[id] })),""")
io.open(P, 'w', encoding='utf-8').write(s)
print('server dialog OK')

# ---------- INDEX.HTML: panel + nút menu ----------
P = '/home/hatch/workspace/tap-tanh-tu-tien-mmo/client/index.html'
s = io.open(P, encoding='utf-8').read()
def reph(old, new, n=1):
    global s
    assert s.count(old) == n, 'html anchor %dx: %s' % (s.count(old), old[:70])
    s = s.replace(old, new)
reph("""      <div id="disciplePanel" class="panel" style="display:none">""",
"""      <div id="bondPanel" class="panel" style="display:none">
        <div class="panelHead"><span>💞 Duyên Nợ — các mối quan hệ đặc biệt</span><button class="xBtn" id="bondClose" type="button">✕</button></div>
        <div id="bondBody"></div>
        <p class="splash-note">Thang thiện cảm −1000…+1000, 0 là người dưng. Leo rất chậm: ở gần nhau săn quái/thiền chung, trả nhiệm vụ, tặng quà, cứu mạng. Đạt <b>Bạn thân (300)</b> được chọn 1 trong 2 hướng — <b>Thân tình</b> (Tri kỉ → Huynh đệ/Tỷ muội) hoặc <b>Tình cảm</b> (Động lòng → Phu thê → Tri âm) — chọn rồi khóa vĩnh viễn; với người chơi phải cả hai cùng chọn một hướng. Buff/debuff chỉ tính khi hai bên ở gần nhau (cùng map) và lấy mối mạnh nhất. Nợ tới mức Không đội trời chung: NPC từ chối phục vụ.</p>
      </div>
      <div id="disciplePanel" class="panel" style="display:none">""")
reph("""        <button class="menuAction" id="menuDiscipleBtn" type="button">🎓 Đệ tử (sư đồ)</button>""",
"""        <button class="menuAction" id="menuDiscipleBtn" type="button">🎓 Đệ tử (sư đồ)</button>
        <button class="menuAction" id="menuBondBtn" type="button">💞 Duyên Nợ</button>""")
io.open(P, 'w', encoding='utf-8').write(s)
print('html OK')

# ---------- MAIN.TS ----------
P = '/home/hatch/workspace/tap-tanh-tu-tien-mmo/client/src/main.ts'
s = io.open(P, encoding='utf-8').read()
def rept(old, new, n=1):
    global s
    assert s.count(old) == n, 'ts anchor %dx: %s' % (s.count(old), old[:70])
    s = s.replace(old, new)
# interface char: bonds
rept("""  // GĐ24: thiện cảm theo NPC
  affinity: Record<string, number>;""",
"""  // GĐ24: thiện cảm theo NPC
  affinity: Record<string, number>;
  // GĐ320: Duyên Nợ — danh sách quan hệ đặc biệt (server tính sẵn mức + nhánh)
  bonds?: Array<{ key: string; kind: string; name: string; score: number; branch: string | null; pick: string | null; tier: string; tierName: string; canChoose: boolean }>;""")
# interface dialog: bond fields
rept("""  shopId: string | null;
  affinity: number;
  gained: number;""",
"""  shopId: string | null;
  affinity: number;
  gained: number;
  bondTierName?: string; // GĐ320
  bondBranch?: string | null; // GĐ320
  bondCanChoose?: boolean; // GĐ320
  likedItemName?: string | null; // GĐ320
  giftItems?: Array<{ id: string; name: string; qty: number }>; // GĐ320""")
# dòng thiện cảm trong dialog -> mức quan hệ thang mới
rept("""      const tier = d.affinity >= 50
        ? ' — Rất thân thiết: giảm giá mua 10% (nếu là chủ tiệm) + đã mở nhiệm vụ riêng'
        : d.affinity <= -50
          ? ' — NPC này từ chối giao dịch với bạn!'
          : ' — Thiện cảm ≥ 50 mở nhiệm vụ riêng + giảm giá 10%';
      affEl.textContent = `💛 Thiện cảm: ${d.affinity}/100${d.gained ? ` (+${d.gained} vì trò chuyện hôm nay)` : ''}${tier}`;""",
"""      const tier = d.affinity <= -600
        ? ' — NPC này TỪ CHỐI phục vụ bạn (nợ quá sâu)!'
        : d.affinity >= 600
          ? ' — Tri kỉ trở lên: giảm giá mua 10% (nếu là chủ tiệm)'
          : d.affinity >= 100
            ? ' — Đã mở nhiệm vụ riêng'
            : ' — Đạt Bạn bè (100) mở nhiệm vụ riêng';
      affEl.textContent = `💞 Quan hệ: ${d.bondTierName || 'Người dưng'} · thiện cảm ${d.affinity}${d.gained ? ` (+${d.gained} vì trò chuyện hôm nay)` : ''}${tier}${d.likedItemName ? ` · Nghe nói ${d.name} đang thích: ${d.likedItemName}` : ''}`;""")
# hàng nhiệm vụ khóa: số cổng theo payload mới
rept("""        html += `<div class="prow"><span class="pname">🔒 Nhiệm vụ riêng<span class="pdesc">Mở khi thiện cảm với ${d.name} đạt 50 (hiện ${d.affinity}) — trò chuyện mỗi ngày, mua bán và trả nhiệm vụ để tăng</span></span></div>`;""",
"""        html += `<div class="prow"><span class="pname">🔒 Nhiệm vụ riêng<span class="pdesc">Mở khi thiện cảm với ${d.name} đạt ${(pq as any).minAffinity ?? 100} (hiện ${d.affinity}) — trò chuyện mỗi ngày, mua bán, tặng quà và trả nhiệm vụ để tăng</span></span></div>`;""")
# hàng tặng quà + chọn nhánh — chen sau hàng Vào tiệm
rept("""    if (d.shopId) {
      html += `<div class="prow"><span class="pname">🛒 Mua bán<span class="pdesc">Vào tiệm của ${d.name}</span></span><button class="pbtn" data-shop="${d.shopId}">Vào tiệm</button></div>`;
    }""",
"""    if (d.shopId) {
      html += `<div class="prow"><span class="pname">🛒 Mua bán<span class="pdesc">Vào tiệm của ${d.name}</span></span><button class="pbtn" data-shop="${d.shopId}">Vào tiệm</button></div>`;
    }
    // GĐ320: tặng quà cho NPC (+15 nếu đúng món thích, +3 món khác) + chọn nhánh khi đã Bạn thân
    if (d.giftItems && d.giftItems.length) {
      const opts = d.giftItems.map((g) => `<option value="${g.id}">${g.name} (có ${g.qty})</option>`).join('');
      html += `<div class="prow"><span class="pname">🎁 Tặng quà<span class="pdesc">Tặng đúng món ${d.name} thích thì thiện cảm tăng nhiều — sở thích phải tự quan sát, trò chuyện quen mặt sẽ hé dần</span></span><span style="display:flex;gap:4px"><select id="giftSel">${opts}</select><button class="pbtn" data-gift="${d.npcId}">Tặng</button></span></div>`;
    }
    if (d.bondCanChoose) {
      html += `<div class="prow"><span class="pname">💞 Đã là Bạn thân — chọn hướng quan hệ<span class="pdesc">Chọn 1 trong 2 hướng, khóa vĩnh viễn: Thân tình đi tới Tri kỉ rồi Huynh đệ/Tỷ muội; Tình cảm đi tới Động lòng, Hẹn hò, Phu thê, Tri âm</span></span><span style="display:flex;gap:4px"><button class="pbtn gold" data-bond-branch="than" data-bond-key="n:${d.npcId}">Thân tình</button><button class="pbtn gold" data-bond-branch="tinh" data-bond-key="n:${d.npcId}">Tình cảm</button></span></div>`;
    } else if (d.bondBranch) {
      html += `<div class="prow"><span class="pname">💞 Hướng quan hệ: ${d.bondBranch === 'than' ? 'Thân tình' : 'Tình cảm'}<span class="pdesc">Nhánh đã khóa — chỉ còn đường làm sâu thêm (hoặc làm xấu đi)</span></span></div>`;
    }""")
# wiring nút tặng quà + chọn nhánh (sau wiring data-disciple-npc)
rept("""    btns.querySelectorAll<HTMLButtonElement>('[data-disciple-npc]').forEach((b) => {
      b.onclick = () => { this.socket.emit('disciple_accept_npc', { spotId: b.dataset.discipleNpc }); const p = document.getElementById('npcDialog'); if (p) p.style.display = 'none'; };
    });""",
"""    btns.querySelectorAll<HTMLButtonElement>('[data-disciple-npc]').forEach((b) => {
      b.onclick = () => { this.socket.emit('disciple_accept_npc', { spotId: b.dataset.discipleNpc }); const p = document.getElementById('npcDialog'); if (p) p.style.display = 'none'; };
    });
    // GĐ320: tặng quà + chọn nhánh ngay trong hộp thoại
    btns.querySelectorAll<HTMLButtonElement>('[data-gift]').forEach((b) => {
      b.onclick = () => { const sel = document.getElementById('giftSel') as HTMLSelectElement | null; if (sel && sel.value) { this.socket.emit('npc_gift', { npcId: b.dataset.gift, itemId: sel.value }); setTimeout(() => this.socket.emit('talk_npc', { npcId: this.lastNpcDialogId || b.dataset.gift }), 400); } };
    });
    btns.querySelectorAll<HTMLButtonElement>('[data-bond-branch]').forEach((b) => {
      b.onclick = () => { this.socket.emit('bond_choose_branch', { key: b.dataset.bondKey, branch: b.dataset.bondBranch }); setTimeout(() => this.socket.emit('talk_npc', { npcId: this.lastNpcDialogId || '' }), 400); };
    });""")
# wiring menu + đóng panel
rept("""    const discipleClose = byId('discipleClose');
    if (discipleClose) discipleClose.onclick = () => { const dp = document.getElementById('disciplePanel'); if (dp) dp.style.display = 'none'; };""",
"""    const discipleClose = byId('discipleClose');
    if (discipleClose) discipleClose.onclick = () => { const dp = document.getElementById('disciplePanel'); if (dp) dp.style.display = 'none'; };
    const menuBond = byId('menuBondBtn'); // GĐ320: mở panel Duyên Nợ từ Menu
    if (menuBond && gameMenu) menuBond.onclick = () => { gameMenu.style.display = 'none'; this.openBondPanel(); };
    const bondClose = byId('bondClose');
    if (bondClose) bondClose.onclick = () => { const bp = document.getElementById('bondPanel'); if (bp) bp.style.display = 'none'; };""")
# methods panel — chen trước openDisciplePanel
rept("""  private openDisciplePanel(): void {""",
"""  private openBondPanel(): void {
    const panel = document.getElementById('bondPanel');
    if (!panel || !this.myChar) return;
    panel.style.display = 'block';
    this.renderBondPanel();
  }
  private renderBondPanel(): void {
    const body = document.getElementById('bondBody');
    if (!body || !this.myChar) return;
    const c: any = this.myChar;
    const esc = (t: string) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;');
    const rows: string[] = [];
    const bonds = c.bonds || [];
    if (!bonds.length) rows.push('<p>Chưa có mối quan hệ đặc biệt nào. Hãy trò chuyện với dân làng mỗi ngày, săn quái/thiền chung với người chơi khác, trả nhiệm vụ và tặng quà — thiện cảm sẽ dần thành duyên (hoặc nợ).</p>');
    for (const b of bonds) {
      const pct = Math.max(2, Math.round(Math.abs(b.score) / 1000 * 50));
      const bar = b.score >= 0
        ? `<span style="display:inline-block;width:120px;height:8px;background:#00000055;position:relative;vertical-align:middle"><span style="position:absolute;left:50%;top:0;height:8px;width:${pct}%;background:#7dd87d"></span><span style="position:absolute;left:50%;top:-2px;width:1px;height:12px;background:#fff"></span></span>`
        : `<span style="display:inline-block;width:120px;height:8px;background:#00000055;position:relative;vertical-align:middle"><span style="position:absolute;right:50%;top:0;height:8px;width:${pct}%;background:#e06c5c"></span><span style="position:absolute;left:50%;top:-2px;width:1px;height:12px;background:#fff"></span></span>`;
      rows.push(`<div style="border-top:1px solid #ffffff22;padding:6px 0"><b>${b.kind === 'npc' ? '🏡' : '🧑'} ${esc(b.name)}</b> — <b>${esc(b.tierName)}</b>${b.branch ? ` · nhánh ${b.branch === 'than' ? 'Thân tình' : 'Tình cảm'} (đã khóa)` : ''}<br>${bar} <span class="splash-note">${b.score > 0 ? '+' : ''}${b.score}</span>${b.pick ? `<br><span class="splash-note">Bạn đã chọn hướng ${b.pick === 'than' ? 'Thân tình' : 'Tình cảm'} — chờ đối phương chọn cùng hướng để khóa nhánh.</span>` : ''}${b.canChoose ? `<br><span style="display:inline-flex;gap:4px;margin-top:4px"><button class="mini" data-bond-choose="than" data-bond-key="${esc(b.key)}" type="button">Chọn Thân tình</button><button class="mini" data-bond-choose="tinh" data-bond-key="${esc(b.key)}" type="button">Chọn Tình cảm</button></span>` : ''}</div>`);
    }
    body.innerHTML = rows.join('');
    body.querySelectorAll('[data-bond-choose]').forEach((b) => { (b as HTMLButtonElement).onclick = () => { this.socket.emit('bond_choose_branch', { key: (b as HTMLElement).getAttribute('data-bond-key'), branch: (b as HTMLElement).getAttribute('data-bond-choose') }); setTimeout(() => this.renderBondPanel(), 500); }; });
  }

  private openDisciplePanel(): void {""")
io.open(P, 'w', encoding='utf-8').write(s)
print('main.ts OK')
