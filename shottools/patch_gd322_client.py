# GĐ322 client: dòng cấp tông/Uy/phí + lãnh địa nhiều ô + nút nâng cấp công trình + nhãn cấp ngoài thế giới.
import io
P = 'client/src/main.ts'
s = io.open(P, encoding='utf-8').read()
def rep(old, new, n=1):
    global s
    assert s.count(old) == n, 'anchor %dx: %s' % (s.count(old), old[:70])
    s = s.replace(old, new)

# 1) dòng cấp tông trước mục lãnh địa
rep("""      // GĐ302: lãnh địa + tông chiến
      html += '<div class="prow"><span class="pname">🚩 Lãnh địa tông môn</span></div>';""",
    """      // GĐ322: cấp tông + Tông Uy + trần + phí duy trì
      const gg322: any = g as any;
      html += `<div class="prow"><span class="pname">🏯 Cấp tông: ${gg322.level || 1} · Tông Uy ${gg322.uy || 0}${gg322.uyNext ? ' / ' + gg322.uyNext : ' (tối đa)'}<span class="pdesc">Thành viên ${g.members.length}/${gg322.memberCap || 10} · Kho chung ${gg322.warehouseCap || 60} ô · Lãnh địa ${((gg322.territories || []).length)}/${gg322.territoryCap || 1} · Phí duy trì ${gg322.upkeepPerDay || 0} LT/ngày trừ từ quỹ${(gg322.debtDays || 0) > 0 ? ` · ⚠️ Đang thiếu phí ${gg322.debtDays} ngày — thiếu 3 ngày liền sẽ TỤT CẤP` : ''} · Tông Uy từ: nhiệm vụ tông +10 · giữ lãnh địa +5/ngày · thắng tông chiến +50</span></span></div>`;
      // GĐ302: lãnh địa + tông chiến
      html += '<div class="prow"><span class="pname">🚩 Lãnh địa tông môn</span></div>';""")

# 2) hiển thị lãnh địa dạng danh sách (mỗi điểm 1 nút Bỏ riêng)
rep("""      if (g.territory) {
        html += `<div class="prow"><span class="pname">🏴 Đang giữ: ${esc(g.territory.name)}<span class="pdesc">${esc(g.territory.mapName)} · Thiền trên map này +10% tốc độ Tu vi · Đứng tại cờ = nơi linh khí · Quỹ +500 LT/ngày triều cống</span></span>${officer ? `<button class="pbtn" data-sect="terr-abandon">Bỏ lãnh địa</button>` : ''}</div>`;
      } else {""",
    """      const myTerrs322: any[] = (g as any).territories && (g as any).territories.length ? (g as any).territories : (g.territory ? [g.territory] : []); // GĐ322
      if (myTerrs322.length) {
        for (const t322 of myTerrs322) html += `<div class="prow"><span class="pname">🏴 Đang giữ: ${esc(t322.name)}<span class="pdesc">${esc(t322.mapName)} · Thiền trên map này +10% tốc độ Tu vi · Đứng tại cờ = nơi linh khí · Quỹ +500 LT/ngày triều cống · +5 Tông Uy/ngày</span></span>${officer ? `<button class="pbtn" data-sect="terr-abandon" data-id="${t322.pointId}">Bỏ lãnh địa</button>` : ''}</div>`;
      } else {""")

# 3) nút cắm cờ/tuyên chiến theo trần lãnh địa của cấp
rep("""        if (!t.owner && !g.territory && officer) act = `<button class="pbtn gold" data-sect="terr-claim" data-id="${t.id}">Cắm cờ</button>`;
        else if (t.owner && t.ownerId !== g.id && !g.territory && officer && !g.war) act = `<button class="pbtn" data-sect="war-declare" data-id="${t.id}">Tuyên chiến</button>`;""",
    """        if (!t.owner && officer && myTerrs322.length < ((g as any).territoryCap || 1)) act = `<button class="pbtn gold" data-sect="terr-claim" data-id="${t.id}">Cắm cờ</button>`; // GĐ322: theo trần cấp
        else if (t.owner && t.ownerId !== g.id && officer && !g.war && myTerrs322.length < ((g as any).territoryCap || 1)) act = `<button class="pbtn" data-sect="war-declare" data-id="${t.id}">Tuyên chiến</button>`;""")

# 4) công trình: hiện cấp + hiệu ứng + nút nâng cấp
rep("""        for (const b of (g as any).buildings || []) html += `<div class="prow"><span class="pname">• ${esc(b.name)}</span></div>`;""",
    """        for (const b of (g as any).buildings || []) { const blv = (b as any).lv || 1; const bdesc = b.kind === 'danphong' ? 'Luyện đan tại đây +' + [0, 5, 8, 12][blv] + '% tỉ lệ thành công' : b.kind === 'khiphong' ? 'Rèn tại đây +' + [0, 5, 8, 12][blv] + '% tỉ lệ thành công' : b.kind === 'duocvien' ? 'Vườn tông ' + (4 + 2 * blv) + ' ô trồng chung' : b.kind === 'luyencong' ? 'Thiền trong vùng ' + Math.round(90 * [0, 1, 1.5, 2][blv]) + 'px quanh trường = nơi linh khí' : 'Công trình của tông'; html += `<div class="prow"><span class="pname">• ${esc(b.name)} · cấp ${blv}${blv >= 3 ? ' (tối đa)' : ''}<span class="pdesc">${bdesc}</span></span>${officer && blv < 3 ? `<button class="pbtn" data-sect="building-upgrade" data-id="${b.kind}">Nâng cấp ${((blv === 1 ? 20000 : 50000)).toLocaleString('vi-VN')} LT</button>` : ''}</div>`; } // GĐ322""")

# 5) tiêu đề vườn theo số ô thật
rep("""        html += '<div class="prow"><span class="pname">🌿 Dược Viên tông (6 ô chung — làm tại Dược Viên ở trụ sở)</span></div>';""",
    """        html += `<div class="prow"><span class="pname">🌿 Dược Viên tông (${((g as any).garden || []).length} ô chung — làm tại Dược Viên ở trụ sở)</span></div>`; // GĐ322: số ô theo cấp vườn""")

# 6) wiring: bỏ lãnh địa theo điểm + nâng cấp công trình
rep("""        else if (act === 'terr-abandon') this.socket.emit('sect_territory_abandon');""",
    """        else if (act === 'terr-abandon') this.socket.emit('sect_territory_abandon', { pointId: id }); // GĐ322
        else if (act === 'building-upgrade') this.socket.emit('sect_building_upgrade', { kind: id }); // GĐ322""")

# 7) nhãn công trình ngoài thế giới kèm cấp khi > 1
rep("""        const bl = this.add.text(b.x, b.y + 6, b.name, { fontFamily: 'Palatino, Georgia, serif', fontSize: '9px', color: '#e8e2c8' }).setOrigin(0.5, 0).setDepth(-40);""",
    """        const blv2 = (b as unknown as { lv?: number }).lv || 1; // GĐ322
        const bl = this.add.text(b.x, b.y + 6, blv2 > 1 ? `${b.name} ·${blv2}` : b.name, { fontFamily: 'Palatino, Georgia, serif', fontSize: '9px', color: '#e8e2c8' }).setOrigin(0.5, 0).setDepth(-40);""")

io.open(P, 'w', encoding='utf-8').write(s)
print('gd322 client OK')
