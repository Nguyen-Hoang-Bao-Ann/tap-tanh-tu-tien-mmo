// GĐ245: nội dung BẢNG THÔNG BÁO (mẫu Bảo gửi 03/11/2026) — cập nhật nội
// dung ở đây mỗi đợt ra bản mới; client hiển thị ở màn hình vào game + Menu.
// tab: 'capnhat' (nhật ký thay đổi) | 'thongbao' (tin cho người chơi).
// GĐ362: riêng mục LỄ HỘI ở tab thongbao được TÍNH ĐỘNG theo ngày thật ở
// cuối file (festNotice) — dùng đúng công thức của server (lễ lớn chạy theo
// đợt thật 14 ngày, luân phiên 4 mùa kể từ mốc 02/11/2026 00:00 +07) nên
// thông báo luôn khớp lễ đang chạy thật, hết lễ này tự sang lễ kế tiếp,
// không bao giờ còn câu "đang diễn ra" sai ngày như bản tĩnh trước đây.
export interface NoticeEntry {
  id: string;
  date: string; // hiển thị dd/mm/yyyy
  tab: 'capnhat' | 'thongbao';
  title: string;
  body: string;
}

// GĐ362: gương của FESTIVAL_BIG phía server (server/index.js) — chỉ lấy
// phần hiển thị; công thức đợt ở festNotice() phải khớp bigFestival().
const FEST_EPOCH = Date.parse('2026-11-01T17:00:00.000Z'); // = 02/11/2026 00:00 +07
const FEST_ORDER = ['xuan', 'ha', 'thu', 'dong'];
const FEST_BIG: Record<string, { name: string; icon: string; line: string }> = {
  xuan: { name: 'Vạn Hoa Hội', icon: '🌸', line: 'Xuân về, vạn hoa khai — chúc đạo hữu một năm tu hành nở hoa.' },
  ha: { name: 'Giang Đăng Hội', icon: '🏮', line: 'Đêm hạ dài, sông đầy đèn — thả một chiếc đèn, gửi một điều ước.' },
  thu: { name: 'Thu Nguyệt Hội', icon: '🌕', line: 'Trăng thu tròn, ruộng linh chín — mùa ấm no nhất trong năm.' },
  dong: { name: 'Hàn Mai Tế', icon: '❄️', line: 'Tuyết rơi, mai nở — cuối năm sum họp, tế lễ tạ trời đất.' },
};
function fmtDMY(ms: number): string { // dd/mm/yyyy theo giờ +07
  const d = new Date(ms + 7 * 3600 * 1000);
  return `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}/${d.getUTCFullYear()}`;
}
function festNotice(): NoticeEntry {
  const el = Date.now() - FEST_EPOCH;
  const body = 'Lễ lớn của mùa đang mở ở Làng Tân Thủ! Tới quảng trường gặp Lão Tư Lễ Vân Du để xem quầy quà và các mốc lễ nhỏ. Đánh quái và thu thập trong thời gian lễ có tỉ lệ rơi Đồng Lễ Hội (trần 20 đồng mỗi ngày game) — đổi Pháo Hoa Lễ, Bánh Lễ và Túi Quà Lễ ở quầy của Tư Lễ.';
  if (el < 0) {
    const f = FEST_BIG[FEST_ORDER[0]];
    return { id: 'lehoi', date: fmtDMY(FEST_EPOCH), tab: 'thongbao', title: `${f.icon} ${f.name} sắp mở (${fmtDMY(FEST_EPOCH)})`, body: `Lễ lớn đầu mùa sắp mở ở Làng Tân Thủ! ${f.line}` };
  }
  const k = Math.floor(el / (14 * 86400000));
  const f = FEST_BIG[FEST_ORDER[k % 4]];
  const start = FEST_EPOCH + k * 14 * 86400000;
  const end = start + 14 * 86400000;
  return {
    id: 'lehoi', date: fmtDMY(start), tab: 'thongbao',
    title: `${f.icon} ${f.name} đang diễn ra (${fmtDMY(start)} – ${fmtDMY(end)})`,
    body: `${body} ${f.line}`,
  };
}

export const NOTICES: NoticeEntry[] = [
  {
    id: 'gd235-362',
    date: '08/11/2026',
    tab: 'capnhat',
    title: 'Gói lớn: Thiên Phú, truyện Thiên Mệnh Ký, hệ Khám phá và nhiều nữa',
    body: 'Từ đợt này: tạo nhân vật có bước chọn/bốc Thiên Phú (và bốc lại mỗi kiếp mới); Thiên Mệnh Ký có thêm tầng truyện kể 7 hồi qua mục "Nghe kể chuyện" ở các NPC kể chuyện cùng chương riêng cho từng chủng tộc; mở HỆ KHÁM PHÁ — sổ điểm bí mật + manh mối trong Thiên Mệnh Ký (mục 🧭), manh mối nhận từ lời kể bản rõ, lúc thiền và bia khắc Cổ Ngữ, bản đồ hiện điểm đã tìm. Thêm: hai bí cảnh ẩn Đối Ảnh Cảnh và U Hồn Cảnh với tuyệt kỹ Hồn và phụ ấn lớp phụ, tông môn tự sáng tạo công pháp, Pháp Tướng đủ 5 hệ, vào game nhanh hơn và màn chờ báo trạng thái kết nối. Nhiều thang thành tựu cũng được chỉnh lại theo đúng số thật trong game.',
  },
  {
    id: 'gd244',
    date: '03/11/2026',
    tab: 'capnhat',
    title: 'Panel chế tạo thống nhất + tranh nghề',
    body: 'Panel Nghề phụ làm lại theo khung thống nhất cho mọi nghề: bên trái là danh sách bản vẽ có lọc theo nghề, ở giữa là tranh minh họa riêng của từng nghề (Luyện Khí, Đan Sư, Trận Pháp, Phù Sư, Thú Sư, Linh Khoáng, Thải Dược) cùng hàng nguyên liệu cho thấy rõ đang có bao nhiêu / cần bao nhiêu — thiếu thì tô đỏ. Bên phải là chi tiết vật phẩm. Tự rèn trang bị và Bố trận cũng nằm chung trong khung này. Từ giờ nhận phần thưởng (trả nhiệm vụ, mở rương, thưởng thành tựu, mở túi quà...) sẽ hiện hộp “Nhận được vật phẩm” giữa màn hình.',
  },
  {
    id: 'gd235-243',
    date: '02/11/2026',
    tab: 'capnhat',
    title: 'Cảnh quan mới: landmark, hang động, diện mạo làng',
    body: 'Các cõi Độ Kiếp và Tiên Giới có thêm 5 công trình landmark khắc chữ Cổ Ngữ (Đài Kiếp, Cổng Trời, Bia Cổ, Đài Sen, Tượng Kỳ Lân). Miệng hang trên các map núi giờ chui vào được — trong hang có quái và trùm hang riêng. Toàn bộ cây cối, đá, núi và đồ trang trí trong map được thay bằng hình vẽ mới; Trưởng Làng, các vị sư phụ và nhiều NPC trong làng đã có hình riêng thay cho hình mượn.',
  },
  {
    id: 'gd230-234',
    date: '02/11/2026',
    tab: 'capnhat',
    title: 'Độ Kiếp và hai con đường sau Chứng Thần',
    body: 'Mở cảnh giới Độ Kiếp với 3 cổng kiếp ở Đạo Quán (Thiên Lôi, Tam Kiếp, Thần Kiếp) — bắt buộc hiện hình Pháp Tướng, thua chỉ mang kiếp thương 20 phút. Chứng Thần xong được chọn 1 trong 2 đường vĩnh viễn: Thăng Tiên Giới qua Tiên Môn thành Tiên Nhân, hoặc ở lại nhân giới thành Địa Tiên và né Thiên Đạo Truy Lùng. Thêm 54 map, 46 loài quái, trùm + rương và nhiệm vụ cho các cõi mới.',
  },
  festNotice(), // GĐ362: mục lễ tính động theo ngày thật (xem festNotice ở trên) — luôn khớp lễ lớn đang chạy thật
  {
    id: 'bantest',
    date: '02/11/2026',
    tab: 'thongbao',
    title: 'Bản test — vài lưu ý cho đạo hữu',
    body: 'Server đang chạy bản test miễn phí nên giờ cao điểm (nhiều người vào cùng lúc) có thể hơi lag — mong đạo hữu thông cảm. Nhân vật lưu trên server, đăng nhập máy nào cũng chơi tiếp được. Gặp lỗi hoặc có góp ý, cứ nhắn lại trong nhóm chơi thử giúp ban quản trị nhé. Chúc đạo hữu tu luyện vui!',
  },
];
