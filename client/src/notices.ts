// GĐ245: nội dung BẢNG THÔNG BÁO (mẫu Bảo gửi 03/11/2026) — cập nhật nội
// dung ở đây mỗi đợt ra bản mới; client hiển thị ở màn hình vào game + Menu.
// tab: 'capnhat' (nhật ký thay đổi) | 'thongbao' (tin cho người chơi).
export interface NoticeEntry {
  id: string;
  date: string; // hiển thị dd/mm/yyyy
  tab: 'capnhat' | 'thongbao';
  title: string;
  body: string;
}

export const NOTICES: NoticeEntry[] = [
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
  {
    id: 'vanhoahoi',
    date: '02/11/2026',
    tab: 'thongbao',
    title: '🌸 Vạn Hoa Hội đang diễn ra (02/11 – 16/11)',
    body: 'Lễ lớn đầu mùa đã mở ở Làng Tân Thủ! Tới quảng trường gặp Lão Tư Lễ Vân Du để xem quầy quà và các mốc lễ nhỏ. Đánh quái và thu thập trong thời gian lễ có tỉ lệ rơi Đồng Lễ Hội (trần 20 đồng mỗi ngày game) — đổi Pháo Hoa Lễ, Bánh Lễ và Túi Quà Lễ ở quầy của Tư Lễ. Tiểu Đào bán Hạt Linh Xuân để gieo Ươm Mầm Linh quanh làng.',
  },
  {
    id: 'bantest',
    date: '02/11/2026',
    tab: 'thongbao',
    title: 'Bản test — vài lưu ý cho đạo hữu',
    body: 'Server đang chạy bản test miễn phí nên giờ cao điểm (nhiều người vào cùng lúc) có thể hơi lag — mong đạo hữu thông cảm. Nhân vật lưu trên server, đăng nhập máy nào cũng chơi tiếp được. Gặp lỗi hoặc có góp ý, cứ nhắn lại trong nhóm chơi thử giúp ban quản trị nhé. Chúc đạo hữu tu luyện vui!',
  },
];
