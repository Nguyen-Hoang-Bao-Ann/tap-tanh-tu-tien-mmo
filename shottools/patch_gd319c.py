# GĐ319c: sơ đồ chức vụ — trần Phó 2 / Trưởng Lão 5, bổ nhiệm Đường Chủ, cổng rút kho theo tầng đệ tử
# Chay: python3 shottools/patch_gd319c.py
import io
P = '/home/hatch/workspace/tap-tanh-tu-tien-mmo/server/index.js'
s = io.open(P, encoding='utf-8').read()
def rep(old, new, n=1):
    global s
    assert s.count(old) == n, 'anchor %dx: %s' % (s.count(old), old[:70])
    s = s.replace(old, new)

# --- 1) Tran chuc vu trong sect_set_role ---
rep("""    if (!['pho', 'truonglao', 'detu'].includes(data.role)) return;
    const t = g.members.find((m) => m.token === data.token);
    if (!t || t.token === player.token) return;
    t.role = data.role;""",
"""    if (!['pho', 'truonglao', 'detu'].includes(data.role)) return;
    const t = g.members.find((m) => m.token === data.token);
    if (!t || t.token === player.token) return;
    // GĐ319: trần số lượng chức vụ (TẠM: Phó tối đa 2, Trưởng Lão tối đa 5)
    if (data.role === 'pho' && t.role !== 'pho' && g.members.filter((m) => m.role === 'pho').length >= 2) { socket.emit('interact_error', { message: 'Tông đã có đủ 2 Phó Tông Chủ (trần hiện tại).' }); return; }
    if (data.role === 'truonglao' && t.role !== 'truonglao' && g.members.filter((m) => m.role === 'truonglao').length >= 5) { socket.emit('interact_error', { message: 'Tông đã có đủ 5 Trưởng Lão (trần hiện tại).' }); return; }
    t.role = data.role;""")

# --- 2) Bo nhiem Duong Chu (chen sau sect_set_role) ---
i = s.index("  socket.on('sect_kick', (data) => {")
dept = """  socket.on('sect_dept_set', (data) => { // GĐ319: Tông chủ bổ nhiệm / bãi nhiệm Đường Chủ phòng ban
    if (!player || !data) return;
    const g = sectOfToken(player.token);
    if (!g) return;
    ensureSectV2(g);
    const me = g.members.find((m) => m.token === player.token);
    if (me.role !== 'chu') { socket.emit('interact_error', { message: 'Chỉ Tông chủ mới bổ nhiệm Đường Chủ.' }); return; }
    const dept = String(data.dept || '');
    if (!SECT_DEPTS[dept]) return;
    const tk = String(data.token || '');
    if (!tk) { delete g.depts[dept]; saveWorld(); pushSectStateAll(g); socket.emit('notice', { text: `🏯 Đã bãi nhiệm Đường Chủ ${SECT_DEPTS[dept]}.` }); return; }
    const t = g.members.find((m) => m.token === tk);
    if (!t) return;
    for (const k of Object.keys(g.depts)) if (g.depts[k] === tk) delete g.depts[k]; // 1 người chỉ đứng đầu 1 ban
    g.depts[dept] = tk;
    saveWorld(); pushSectStateAll(g);
    const tp = playerByName(t.name);
    if (tp) emitTo(tp, 'notice', { text: `🏯 Tông chủ bổ nhiệm bạn làm Đường Chủ ${SECT_DEPTS[dept]} của "${g.name}".` });
    socket.emit('notice', { text: `🏯 Đã bổ nhiệm ${t.name} làm Đường Chủ ${SECT_DEPTS[dept]}.` });
  });
"""
s = s[:i] + dept + s[i:]

# --- 3) Cong rut kho: Ngoai Mon khong duoc lay, Noi Mon+ duoc (thay cong Truong lao cu) ---
rep("    if (SECT_RANK[me.role] < 1) { socket.emit('interact_error', { message: 'Từ Trưởng lão trở lên mới lấy đồ từ kho chung.' }); return; }",
"    if (sectTierOf(g, me) === 'ngoaemon') { socket.emit('interact_error', { message: 'Đệ Tử Ngoại Môn chưa được lấy đồ từ kho chung — đạt 100 điểm Tông Cống để thành Đệ Tử Nội Môn (hoặc được phong chức/Đường Chủ) đã.' }); return; } // GĐ319: cổng kho theo tầng đệ tử (thay cổng Trưởng Lão của GĐ266)")

io.open(P, 'w', encoding='utf-8').write(s)
print('patch gd319c OK')
