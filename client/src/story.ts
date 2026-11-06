// GĐ317: THIÊN MỆNH KÝ — dữ liệu cốt truyện (đợt A): 10 chương Truyền Thuyết
// Sơ Khai của 10 tộc + thông tin tộc cho màn chọn tộc ở Thiên Đạo Môn.
// Nội dung theo THIET_KE_COT_TRUYEN.md (Bảo duyệt 05/11/2026). Mỗi chương chôn
// 1 manh mối về nơi giấu vật phẩm ẩn của vị thần đầu tiên — chỉ gợi nơi chốn.
export interface RaceInfo {
  id: string; name: string; god: string; relic: string;
  total: number; lifespan: number; lean: string;
  buff: string; debuff: string; trait: string; traitName: string;
}
export const RACE_INFO: RaceInfo[] = [
  { id: 'nhan', name: 'Nhân tộc', god: 'Nhân Hoàng Toại Hiền', relic: 'Toại Hiền Học Ấn', total: 120, lifespan: 80, lean: 'Đều mọi chỉ số', buff: 'Học/luyện công pháp +20%, học nghề +20%', debuff: 'Nhận thêm 10% sát thương nguyên tố', traitName: 'Thất Khiếu Linh Lung', trait: 'Ngưỡng mở chỉ số ẩn giảm 30% (Đạo Quán 210h/700h)' },
  { id: 'than', name: 'Thần tộc', god: 'Thái Nhất Thần Quân', relic: 'Thái Nhất Thiên Mệnh Kính', total: 132, lifespan: 150, lean: 'Pháp công, Minh Mẫn', buff: 'Sát thương chiêu +20%, sát thương Pháp Tướng +20%', debuff: 'Thiền −20% Tu vi; không theo được phe Ma', traitName: 'Thiên Khiển Miễn Nhiễm', trait: 'Thiên Đạo KHÔNG truy lùng Thần tộc ở đường Địa Tiên' },
  { id: 'hoa', name: 'Hoa tộc', god: 'Xuân Hoa Mẫu', relic: 'Xuân Sinh Chủng', total: 124, lifespan: 120, lean: 'Khí huyết, Minh Mẫn', buff: 'Hồi máu tự nhiên ×2, đan dược/ăn uống +50%, cây vườn lớn nhanh +40%', debuff: 'Nhận thêm 40% sát thương Hỏa', traitName: 'Xuân Phong Xuy Hựu Sinh', trait: 'Mỗi ngày 1 lần, máu về 0 thì hồi ngay 30% thay vì gục ngã' },
  { id: 'ma', name: 'Ma tộc', god: 'Ma Tổ La Hầu', relic: 'La Hầu Huyết Châu', total: 132, lifespan: 90, lean: 'Vật công, Khí huyết', buff: 'Sát thương lên quái +20%, chiêu hút 6% máu', debuff: 'Thiền nơi linh khí −25%', traitName: 'Thị Huyết Cuồng', trait: 'Dưới 30% máu: sát thương +25%' },
  { id: 'quy', name: 'Quỷ tộc', god: 'U Minh Quỷ Đế', relic: 'Sinh Tử Bộ', total: 112, lifespan: 200, lean: 'Minh Mẫn, Tốc độ', buff: 'Tích Hồn Khí +60%, né tránh +10%', debuff: 'Máu tối đa −25%', traitName: 'Vô Hình Thể', trait: 'Tầm phát hiện của quái giảm 40%' },
  { id: 'tien', name: 'Tiên tộc', god: 'Nguyên Thủy Tiên Ông', relic: 'Tiên Thiên Ngọc Giản', total: 128, lifespan: 160, lean: 'Pháp công, Minh Mẫn', buff: 'Thiền +20% Tu vi, hồi chiêu −5%', debuff: 'Sát thương vật lý −15%', traitName: 'Tiên Khí Hộ Thể', trait: 'Cứ 60 giây tự có 1 lớp khiên bằng 12% máu tối đa' },
  { id: 'long', name: 'Long tộc', god: 'Tổ Long', relic: 'Tổ Long Nghịch Lân', total: 148, lifespan: 180, lean: 'Vật công, Khí huyết', buff: 'Máu tối đa +35%, mọi sát thương +15%', debuff: 'Đột phá tốn Tu vi ×1,3; hồi chiêu +15%', traitName: 'Long Tức', trait: 'Mỗi đòn thường thứ 5 phun long tức diện rộng bằng 60% đòn' },
  { id: 'ho', name: 'Hồ tộc', god: 'Thanh Khâu Hồ Tổ', relic: 'Cửu Vĩ Linh Châu', total: 116, lifespan: 110, lean: 'Tốc độ, Minh Mẫn', buff: 'Chí mạng +10%, bán đồ lời +20%, né tránh +6%', debuff: 'Máu tối đa −18%', traitName: 'Cửu Vĩ Ảo Ảnh', trait: 'Đòn trúng mình có 15% hóa ảo ảnh: né trọn đòn + tăng tốc 2 giây' },
  { id: 'dieu', name: 'Bách Điểu tộc', god: 'Đan Phượng Thần Điểu', relic: 'Ngũ Sắc Thần Linh', total: 114, lifespan: 70, lean: 'Tốc độ, Minh Mẫn', buff: 'Tốc độ chạy +18%, né tránh +15%, bay được từ Trúc Cơ', debuff: 'Máu tối đa −25%; thọ ngắn nhất', traitName: 'Thiên Không Ưu Thế', trait: 'Khi đang bay: hồi máu/chân nguyên ×2, sát thương +10%' },
  { id: 'thu', name: 'Vạn Thú tộc', god: 'Bạch Trạch', relic: 'Bạch Trạch Đồ', total: 138, lifespan: 100, lean: 'Vật công, Khí huyết', buff: 'Đòn thường +25%, linh thú theo mình +30%, thuần phục +40%', debuff: 'Học/luyện công pháp −25%', traitName: 'Vạn Thú Triều Bái', trait: 'Quái hệ thú không chủ động tấn công (trừ trùm)' },
];
export const RACE_BY_ID: Record<string, RaceInfo> = Object.fromEntries(RACE_INFO.map((r) => [r.id, r]));

export interface Chapter { race: string; title: string; paras: string[] }
export const CHAPTERS: Chapter[] = [
  { race: 'nhan', title: 'Nhân tộc — Kẻ học nhanh nhất trời đất', paras: [
    'Thân phàm yếu nhất trong thập tộc, thọ ngắn nhất nhì, nhưng học gì cũng nhanh và nghề gì cũng thạo. Trời không cho Nhân tộc sức mạnh bẩm sinh — trời cho họ một thứ đáng sợ hơn: sự không ngừng học.',
    'Thuở hỗn độn mới tan, thập tộc đều có thần tổ che chở, riêng Nhân tộc sinh sau, không ai nhận. Nhân Hoàng Toại Hiền — người phàm đầu tiên của tộc — quỳ ngoài Thiên Đạo Môn đủ 7.749 ngày, chỉ xin một điều: "Cho con cháu ta được HỌC mọi thứ trên đời." Thiên Đạo động lòng, ban cho Nhân tộc Thất Khiếu Linh Lung Tâm.',
    'Tương truyền Toại Hiền Học Ấn — con ấn của người đầu tiên biết chữ — vẫn nằm yên nơi chữ đầu tiên của thế gian được viết xuống: chốn học cung cổ nhất, nơi người ta tới để đọc sách và tĩnh tâm.'] },
  { race: 'than', title: 'Thần tộc — Con của trời, gánh mắt của trời', paras: [
    'Dòng dõi sinh từ tia sáng đầu tiên khi trời đất tách đôi. Mạnh mẽ, kiêu hãnh, được Thiên Đạo công nhận là huyết mạch của chính nó — và cũng vì thế, mắt trời không bao giờ phải dõi theo họ như dõi theo kẻ khác.',
    'Khi Thái Nhất Thần Quân mở mắt, trời có tiếng sấm đầu tiên. Ngài nhận từ Thiên Đạo một mảnh thiên mệnh để thay trời hành đạo, kèm một điều kiện khắc vào huyết mạch: Thần tộc vĩnh viễn không được cúi đầu trước bóng tối.',
    'Thái Nhất Thiên Mệnh Kính — tấm kính soi được mệnh số — tương truyền đã vỡ làm đôi trong cơn sấm đầu tiên ấy. Một nửa chìm xuống nơi sấm sét giáng xuống mặt đất lần đầu tiên: đài cao nơi tu sĩ hứng kiếp lôi mà thăng thiên.'] },
  { race: 'hoa', title: 'Hoa tộc — Chết không phải là hết', paras: [
    'Sinh linh nảy mầm từ linh khí đọng trên cánh hoa đầu tiên của thế gian. Hiền hòa, sống chậm, chết đi lại mọc lại như cỏ xuân — với Hoa tộc, gục ngã chỉ là một mùa đông ngắn.',
    'Xuân Hoa Mẫu là đóa hoa đầu tiên nở sau mùa đông hỗn độn dài vạn năm. Nàng tàn vào cuối xuân đầu tiên — rồi xuân sau, từ đúng chỗ ấy, một đóa hoa y hệt nở ra, mang trọn ký ức của nàng. Từ đó Hoa tộc tin: thân có thể tàn, mầm thì không bao giờ chết.',
    'Xuân Sinh Chủng — hạt giống không bao giờ chết — tương truyền được gieo dưới gốc cây cổ thụ nhất của làng người, nơi bốn mùa đều có hoa nở và người già vẫn ngồi kể chuyện thuở xưa.'] },
  { race: 'ma', title: 'Ma tộc — Kẻ uống máu mình mà mạnh lên', paras: [
    'Sinh ra từ mặt tối của linh khí — nơi dục vọng và sát ý đọng lại qua vạn năm. Bị trời ghét, bị người sợ, nhưng là tộc hiểu rõ nhất cái giá của sức mạnh: máu.',
    'La Hầu vốn là tướng giữ cửa Thiên Đạo Môn. Khi bị vu oan và bị đày xuống hạ giới, ngài cười mà uống chén máu của chính mình thay rượu tiễn biệt: "Trời không chứa ta, ta tự chứa ta." Ma tộc sinh từ giọt máu rơi xuống đất hôm ấy — càng đổ máu càng mạnh, và không bao giờ quỳ.',
    'La Hầu Huyết Châu — viên châu kết từ giọt máu đầu tiên — tương truyền vẫn còn ấm, nằm nơi kẻ bị vu oan năm xưa ngã xuống: chốn đá lạnh phía sau làng, nơi trùm cõi này trấn giữ và không ai dám bén mảng.'] },
  { race: 'quy', title: 'Quỷ tộc — Chết rồi mới bắt đầu sống', paras: [
    'Những linh hồn chọn tu luyện thay vì đầu thai. Không thân xác, khó nắm bắt, sống lâu nhất thập tộc — vì cái chết đối với họ chỉ là một lần thay đổi trạng thái.',
    'U Minh Quỷ Đế là linh hồn đầu tiên từ chối uống canh quên lãng. Ngài ngồi bên bến sông Vong Xuyên đủ lâu để âm khí kết thành ngai vàng dưới chân. Kẻ chết mà không cam lòng ra đi — đều là con cháu của ngài.',
    'Sinh Tử Bộ — cuốn sổ ghi tên những kẻ đáng chết mà chưa chết — tương truyền bị xé mất một trang trong một đêm âm khí nặng nhất. Trang ấy thất lạc ở dương gian, nơi người chết không được chôn cất tử tế: nghĩa địa cổ chìm trong sương, nơi ma trơi không bao giờ tắt.'] },
  { race: 'tien', title: 'Tiên tộc — Kẻ sinh ra đã gần trời', paras: [
    'Dòng dõi cư ngụ lưng chừng trời từ thuở sơ khai, hít thở tiên khí từ khi còn trong nôi. Thanh cao, xa cách, và tu hành thong dong như kẻ đi dạo trong vườn nhà.',
    'Nguyên Thủy Tiên Ông là kẻ đầu tiên lên được tầng mây thứ chín mà không cần tu luyện — vì ngài SINH RA đã ở đó. Khi các tộc hỏi bí quyết, ngài chỉ nói: "Ta không leo lên. Ta chỉ là rơi xuống chậm hơn các ngươi." Tiên tộc từ đó ngộ ra đạo của sự thong dong.',
    'Tiên Thiên Ngọc Giản — thẻ ngọc ghi lại hơi thở đầu tiên của tiên khí — tương truyền rơi ở lưng chừng trời, ngay ngoài cổng Tiên Môn, nơi chỉ kẻ đã chứng thần mới đặt chân tới được.'] },
  { race: 'long', title: 'Long tộc — Máu của đất trời đầu tiên', paras: [
    'Loài cổ xưa nhất còn đi lại trên thế gian. Máu long chảy thành sông, vảy long rơi hóa thành núi. Kiêu hãnh đến mức mạch máu của chúng cũng khó thông hơn kẻ khác — nhưng một khi đã thông, không gì cản nổi.',
    'Tổ Long là sinh linh đầu tiên có MÁU — trước ngài, mọi thứ trên đời chỉ là khí và đá. Ngài đánh một trận với hỗn độn suốt 3.000 năm để giành lấy dòng sông đầu tiên cho muôn loài uống nước. Mảnh vảy ngược — chiếc vảy duy nhất mọc ngược trên cổ ngài — là nơi duy nhất hỗn độn từng chạm vào được thân thể ngài.',
    'Tổ Long Nghịch Lân tương truyền rơi xuống dòng sông đầu tiên ấy, ở tận thượng nguồn — nơi nước còn trong như thuở trời đất mới sinh, xa tít phía những cõi người thường ít lui tới.'] },
  { race: 'ho', title: 'Hồ tộc — Chín đuôi, chín mạng, một nụ cười', paras: [
    'Linh hồ tu trăm năm mới thêm được một đuôi. Nhanh, khéo, và mê hoặc chúng sinh bằng cả sắc lẫn trí. Đừng bao giờ đánh cược với một con hồ ly — nó đã biết kết quả trước khi ngươi đặt cược.',
    'Thanh Khâu Hồ Tổ là con cáo đầu tiên biết NÓI. Lời đầu tiên nàng nói không phải với người — nàng nói với ông trời: "Ngươi thua rồi." Trời hỏi thua chuyện gì, nàng cười: "Thua cược rằng không sinh linh nào dám nói chuyện với ngươi như bằng hữu." Ông trời bật cười, ban cho nàng chiếc đuôi thứ chín.',
    'Cửu Vĩ Linh Châu — viên châu kết từ chín lần lột xác của Hồ Tổ — tương truyền lăn tới cõi nào thì dừng ở đất của kẻ tu hành bậc thấp mà chí cao: vùng đất của những người mới bước lên đường tu đã lâu, nơi hồ ly vẫn thỉnh thoảng hiện về.'] },
  { race: 'dieu', title: 'Bách Điểu tộc — Trời cao là nhà', paras: [
    'Con cháu của đàn chim đầu tiên bay qua khe trời khi đất còn mềm. Xương rỗng, mệnh ngắn, nhưng là tộc duy nhất sinh ra đã thuộc về bầu trời — mặt đất với họ chỉ là nơi ghé qua.',
    'Đan Phượng là con chim đầu tiên bay lên tới nơi mặt trời mọc. Nàng không mang về lửa — nàng mang về một bài hát, và dạy muôn chim hót để nhớ đường về trời. Bách Điểu tộc tin rằng: ai quên bài hát, kẻ đó sẽ rơi.',
    'Ngũ Sắc Thần Linh — chiếc lông ngũ sắc đầu tiên rụng xuống từ cánh Đan Phượng — tương truyền còn găm trên đỉnh cao lạnh nhất của thế gian, nơi chim làm tổ giữa băng tuyết và gió không bao giờ ngừng thổi.'] },
  { race: 'thu', title: 'Vạn Thú tộc — Muôn thú là anh em', paras: [
    'Dòng dõi mang huyết thống của mọi loài thú trên đời. Không khéo léo, không mưu mẹo — họ chỉ có sức mạnh và một trái tim coi muôn thú là ruột thịt của mình.',
    'Bạch Trạch là con thú đầu tiên BIẾT hết muôn loài — tên của chúng, tiếng của chúng, và nỗi đau của chúng. Ngài đi khắp thế gian không phải để trị vì, mà để lắng nghe và ghi lại: "Mỗi loài đều có một câu chuyện đáng nghe." Thú nào gặp nạn, chỉ cần gọi tên Bạch Trạch, bầy thú sẽ tới.',
    'Bạch Trạch Đồ — cuộn đồ ghi hình và tên của vạn loài thú đầu tiên — tương truyền vẫn được bầy thú thay nhau canh giữ, sâu trong vùng rừng hoang nơi dấu chân người hiếm hoi nhất và tiếng thú gầm vang nhất.'] },
];
