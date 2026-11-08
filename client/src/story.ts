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

// ===== GĐ352–355: THIÊN MỆNH KÝ TẦNG 3 "THIÊN MỆNH" (đợt B/C) =====
// Tuyến chính 7 hồi về Kẻ Không Tên Trong Sổ. Văn bản theo THIET_KE_COT_TRUYEN.md §B3
// (thoại mẫu dùng nguyên văn; đoạn nào tài liệu chỉ có diễn biến thì agent viết bổ sung
// cùng giọng — đã ghi trong báo cáo đợt). Điều kiện mở đoạn do SERVER kiểm hoàn toàn;
// file này chỉ giữ: văn mở hồi (§B3.1), thoại từng đoạn (paras = bản mơ hồ / bản thường,
// parasClear = bản RÕ sau khi người chơi tự trải qua việc liên quan), gợi ý khi khóa.
export interface HoiInfo { n: number; name: string; span: string; hint: string; intro: string[] }
export const HOIS: HoiInfo[] = [
  { n: 1, name: 'Tiếng Sấm Xa', span: 'Luyện Khí → Trúc Cơ', hint: 'Chuyện bắt đầu ngay ở làng — dưới gốc cổ thụ phía nam, có một người mù chép chuyện vào cuốn sổ không chữ.', intro: [
    'Mỗi làng đều có một người già nhớ những chuyện không ai còn nhớ. Làng này có một người mù ngồi dưới gốc cổ thụ, chép chuyện vào một cuốn sổ không có chữ. Khi ngươi hỏi vì sao chép vào sổ trắng, cụ cười: "Chữ là để người quên. Ta chép cho người nhớ." Từ hôm nay, có những chuyện ngươi sẽ bắt đầu nghe thấy — như tiếng sấm rất xa, từ một cơn giông chưa ai nhìn thấy mây.'] },
  { n: 2, name: 'Trang Sổ Bị Xé', span: 'Trúc Cơ → Kim Đan', hint: 'Có một người ở nghĩa địa cổ phía bắc làng biết chuyện cuốn sổ ấy.', intro: [
    'Ở phía bắc làng có một nghĩa địa cổ, sương không bao giờ tan hết và ma trơi không bao giờ tắt. Người ta chôn ở đó những kẻ chết mà không ai dám chắc họ đã chết yên. Có một cuốn sổ ghi tên tất cả những người như thế. Và trong cuốn sổ ấy, thiếu đúng một trang.'] },
  { n: 3, name: 'Người Gác Cửa Bị Oan', span: 'Kim Đan → Nguyên Anh', hint: 'Kẻ buôn hàng khắp các cõi và người của Đạo Quán kể vụ này bằng hai giọng khác nhau.', intro: [
    'Truyền thuyết kể La Hầu bị đày vì tội của ngài. Nhưng càng đi xa, ngươi càng nghe chuyện kể khác đi một chút: ở chợ, người ta kể ngài cười khi bị đày; ở Đạo Quán, người ta kể ngài im lặng; còn những kẻ từng gặp ngài trong mộng thì nói ngài chỉ hỏi một câu — "Hôm ấy, sau lưng ta, có ai đứng đó không?"'] },
  { n: 4, name: 'Hồn Nghe Tiếng Sổ', span: 'Nguyên Anh → Hóa Thần', hint: 'Khi hồn rời thân được, ngươi sẽ nghe thấy những âm thanh ban ngày không hề có.', intro: [
    'Nguyên Anh rời thân như người rời nhà lúc nửa đêm: nhẹ, lạnh, và nghe rõ những âm thanh ban ngày không nghe được. Trong những âm thanh ấy có tiếng lật trang. Rất xa, rất đều, không ngừng nghỉ — như thể ở đâu đó ngoài tầm mắt, một cuốn sổ rất lớn vẫn đang được ai đó lật, từng trang một, suốt vạn năm nay.'] },
  { n: 5, name: 'Mặt Trong Gương Vỡ', span: 'Hóa Thần → Phản Hư', hint: 'Nửa tấm kính ở Đài Kiếp soi được nhiều hơn là mệnh số của người đứng trước nó.', intro: [
    'Nửa tấm kính ở Đài Kiếp soi được mệnh số của kẻ đứng trước nó. Nhưng hôm nay, kẻ đứng trước nó là ngươi — và trong kính, sau lưng ngươi, còn một người nữa. Ngươi quay lại: không có ai. Ngươi nhìn vào kính: nửa gương mặt ấy vẫn ở đó, và hình như nó cũng đang nhìn ngươi — bằng con mắt còn lại của tấm kính vỡ.'] },
  { n: 6, name: 'Kiếp Nặng Hơn Người', span: 'Phản Hư → Độ Kiếp', hint: 'Người giữ Đài Kiếp giữ cả một câu gia truyền đời đời chỉ truyền miệng.', intro: [
    'Người đời gọi Độ Kiếp là kiếp nạn. Người gác Đài Kiếp gọi nó bằng một cái tên khác: buổi điểm danh. Sét giáng xuống không phải để giết — sét giáng xuống để gọi tên. Tên ai còn trong sổ, người ấy nghe thấy tiếng gọi của mình trong tiếng sấm. Ngươi có nghe thấy không?'] },
  { n: 7, name: 'Ba Cách Xử Lý Một Cái Tên', span: 'Chứng Thần → Ba đường cuối', hint: 'Chỉ người Chứng Thần mới được nghe trọn câu chuyện này — ở Đạo Quán.', intro: [
    'Vạn năm trước, một kẻ xé tên mình khỏi cuốn sổ của trời để trốn cái chết. Hôm nay, một kẻ khác đứng trước ba con đường, và cả ba con đường đều bắt đầu bằng cùng một câu hỏi mà kẻ kia chưa bao giờ dám tự hỏi: cái tên của ta — ta muốn nó đi về đâu?'] },
];
export const HOI_BY_N: Record<number, HoiInfo> = Object.fromEntries(HOIS.map((h) => [h.n, h]));

export interface SegText { title: string; teller: string; paras: string[]; parasClear?: string[]; hint?: string; clearHint?: string }
export const STORY_SEG_TEXT: Record<string, SegText> = {
  // --- Trưởng Làng ---
  tl_chao: { title: 'Ghế đá đầu làng', teller: 'Trưởng Làng', paras: [
    '“Lại đây, ngồi xuống cái ghế đá này đã. Tu hành không vội được đâu — người vội nhất làng này ngày xưa là ta, và ngươi xem, ta làm trưởng làng chứ có thành tiên đâu.”'] },
  tl_h1_tree: { title: 'Chuyện cây cổ thụ', teller: 'Trưởng Làng', paras: [
    '“Cây cổ thụ phía nam ấy à? Nó ở đó trước cả làng. Người đầu tiên tới đất này không dựng nhà trước — ông ấy trồng cây trước, rồi dựng nhà nhìn về phía cây. Ông nói: nhà sập còn dựng lại, cây ngã thì làng mất gốc.”'] },
  tl_h1_cuahep: { title: 'Cửa hẹp của Đạo Quán', teller: 'Trưởng Làng', hint: 'Nghe Trưởng Làng kể chuyện cây cổ thụ trước đã.', paras: [
    '“Ngươi hỏi vì sao Đạo Quán xây cao mà cửa lại hẹp? Người xưa nói, cửa hẹp là để mỗi lần một người bước vào phải cúi đầu. Cúi đầu trước trời — và cúi đầu nhớ rằng từng có kẻ bước qua cửa ấy mà không ai nhớ mặt.”'] },
  tl_tc: { title: 'Đường về làng', teller: 'Trưởng Làng', hint: 'Đạt Trúc Cơ rồi quay lại, Trưởng Làng sẽ nói thêm.', paras: [
    '“Ừ, khí tức khác hẳn rồi. Đi xa thì nhớ: đường tu dài, nhưng đường về làng lúc nào cũng ngắn — về ăn cơm rồi hẵng đi tiếp.”'] },
  tl_luanhoi: { title: 'Người khách cũ', teller: 'Trưởng Làng', hint: 'Chỉ người đã đi qua một kiếp mới nghe được đoạn này.', paras: [
    '“Ơ… cháu là…? Xin lỗi, già này lẫn rồi. Chỉ là… nhìn cháu, ta cứ nhớ tới một người khách cũ, cũng hay ngồi ghế đá này nghe ta lảm nhảm.”'] },
  // --- Cụ Ký (NPC mới, dưới cây cổ thụ) ---
  ck_chao: { title: 'Cuốn sổ không chữ', teller: 'Cụ Ký', paras: [
    '“Ngồi đi. Đừng đứng, đứng nghe chuyện thì chuyện nó ngắn lại.”',
    '“Ta là Ký. Không phải tên — là nghề. Làng này ai sinh, ai mất, ai đi tu, ai bỏ về, ta chép hết. Chép vào đâu à? Vào cuốn sổ này. Không có chữ đâu — mắt ta thế này, chữ nghĩa gì nữa. Ta chép bằng nhớ.”'] },
  ck_h1_nhanhoang: { title: 'Bảy nghìn ngày quỳ', teller: 'Cụ Ký', paras: [
    '“Toại Hiền quỳ ngoài Thiên Đạo Môn 7.749 ngày. Người ta hay kể đoạn ngài quỳ. Ít ai kể đoạn trước đó: cửa Thiên Đạo Môn vốn không đóng với người phàm — nó chỉ đóng lại sau một đêm. Đêm gì thì… đoạn này để khi khác. Ngươi chưa nghe được đâu, nghe sớm nó hỏng chuyện.”'] },
  ck_h1_kinh: { title: 'Kính trống trơn', teller: 'Cụ Ký', hint: 'Nghe Cụ Ký kể chuyện Nhân Hoàng trước đã.', clearHint: 'Tới Đài Kiếp một lần — khi người ngươi có “mùi sấm sét”, quay lại cụ sẽ kể rõ.', paras: [
    '“Đoạn kính vỡ à…” (cụ nghiêng đầu, như nghe ngóng) “…Ngươi chưa từng đứng trước kính. Nghe bây giờ cũng như nhìn qua sương — thấy có bóng, không thấy mặt. Đợi tới ngày ngươi lên Đài Kiếp, đứng trong tiếng sấm một lần rồi quay lại đây. Khi ấy ta kể, ngươi mới nghe ra.”'],
    parasClear: [
    '“Ngươi có mùi sấm sét.”',
    '“Đừng ngạc nhiên, người mù ngửi tốt lắm. Nói ta nghe: ở Đài Kiếp, kính vỡ có soi thấy ngươi không? … Soi thấy là mừng đấy. Có kẻ đứng trước kính mà kính trống trơn. Kẻ đó mới đáng thương — trời không còn nhìn thấy hắn nữa, mà hắn thì không chết được.”'] },
  // --- Âm Bà (NPC mới, nghĩa địa cổ) ---
  ab_chao: { title: 'Chỗ giữ sẵn', teller: 'Âm Bà', paras: [
    '“Đứng chỗ khô mà nói. Đất ở đây mềm, toàn xương cũ.”',
    '“Ta giữ mộ này. Mộ của ai à? Của những người chết mà chưa yên. Và của một người chưa chết mà ta vẫn phải giữ chỗ sẵn. Hỏi nữa không? Không thì nghe chuyện.”'] },
  ab_h2_sotb: { title: 'Trang sổ bị xé', teller: 'Âm Bà', hint: 'Đạt Trúc Cơ rồi hãy hỏi Âm Bà chuyện cuốn sổ.', paras: [
    '“Sổ Sinh Tử ghi tên kẻ đáng chết mà chưa chết. Tu sĩ các ngươi, một nửa đã có tên trong đó rồi — cãi trời mà sống, trời ghi sổ, công bằng thôi.”',
    '“Có một trang bị xé. Vết xé lạ lắm: giấy vạn năm mà rìa còn trắng như mới xé sáng nay. Giấy không già đi được nữa, từ ngày rời khỏi sổ. Như chủ của nó vậy.”'] },
  ab_h2_mangdi: { title: 'Tên bị bôi', teller: 'Âm Bà', hint: 'Chỉ người tu Quỷ đạo, người đi đường Luyện Hồn, hoặc người được Âm Bà thật sự quý (duyên nợ Bạn bè trở lên) mới nghe được đoạn này.', paras: [
    '“Trang ấy không bị đốt. Đốt thì còn tro, còn mùi khét — ta giữ mộ, ta biết thế nào là hết. Trang ấy bị mang đi.”',
    '“Người mang nó đi không để lại dấu chân. Ngươi nghĩ vì sao? Sổ không ghi tên y, thì đất cũng không nhớ bước y. Vạn năm đi qua đất này, mà như chưa từng đi.”'] },
  ab_quy: { title: 'Thay áo', teller: 'Âm Bà', hint: 'Đoạn này Âm Bà chỉ kể cho người Quỷ tộc / Quỷ tu.', paras: [
    '“Ngươi thì ta không phải giữ chỗ. Chết đối với ngươi là thay áo.”',
    '“Nhưng nghe này: kẻ xé sổ không thay áo được như ngươi. Hắn giữ nguyên một tấm áo vạn năm. Ngươi có biết mặc một tấm áo vạn năm là thế nào không? Là mỗi ngày đều mặc lại ngày chết hụt của chính mình.”'] },
  ab_duyen: { title: 'Người khách không bóng', teller: 'Âm Bà', hint: 'Ngồi lại với Âm Bà đủ lâu (duyên nợ đạt Bạn bè trở lên) mới nghe được đoạn này.', paras: [
    '“Ngồi lâu thêm chút. Chỗ này lạnh, ít người ngồi lâu với ta.”',
    '“Chuyện này ta chỉ kể người ngồi lâu: trang sổ bị xé, ta từng thấy nó. Không phải ở đây. Trong tay một người khách đi qua nghĩa địa, lâu lắm rồi. Người ấy không có bóng. Ta giữ mộ nên ta để ý bóng người ta lắm.”'] },
  // --- Thương Nhân Lưu Động ---
  tn_chao: { title: 'Chuyện đổi chuyện', teller: 'Thương Nhân Lưu Động', paras: [
    '“Kể chuyện à? Được! Chuyện của ta rẻ lắm — một chén trà, một cái bánh, hoặc một câu chuyện của ngươi đổi một câu chuyện của ta. Buôn bán là trao đổi, nghe chuyện cũng vậy, công bằng!”'] },
  tn_h3_lahau: { title: 'La Hầu không hận trời', teller: 'Thương Nhân Lưu Động', hint: 'Đạt Kim Đan rồi hãy hỏi thương nhân chuyện La Hầu.', paras: [
    '“Ta đi buôn qua đất Ma tộc ba lần, lần nào cũng nghe kể về La Hầu khác một chút. Bên ấy họ không gọi ngài là tội đồ đâu — họ gọi ngài là ‘người gác cửa bị oan’. Và họ kể: hôm bị đày, ngài không cãi một lời, chỉ hỏi lính áp giải một câu: ‘Hôm qua, ở cửa Thiên Đạo, ngoài ta ra còn ai nữa không?’ Lính nói không ai. Ngài cười: ‘Ừ. Không ai. Vấn đề là ở chỗ đó.’”'] },
  tn_h3_muoimot: { title: 'Dòng thứ mười một', teller: 'Thương Nhân Lưu Động', hint: 'Nghe thương nhân kể chuyện La Hầu trước đã.', clearHint: 'Biếu thương nhân một món ăn/uống (tặng quà trong hộp thoại), ông ta sẽ kể bản rõ.', paras: [
    '“Đoạn sau mới là đoạn đáng tiền… mà thôi, khát quá, cổ họng khô kể không ra đoạn hay. Có gì uống không, bạn hiền?”'],
    parasClear: [
    '“Àaa, được rồi! Có cái thấm giọng, kể mới ra đoạn hay. Nghe này: người ta nói ở Tiên Giới có một danh sách cũ, ghi tên các thần đầu tiên. Mười vị thần của mười tộc — ai cũng biết.”',
    '“Nhưng bản danh sách đầu tiên nhất… có mười một dòng. Dòng thứ mười một bị bôi. Bôi bằng thứ mực mà tới giờ vẫn chưa khô hẳn.”'] },
  // --- GĐ353 (B2): Kiếp Đài Thủ / Quản Sự / Sứ Giả + Hồi 4–6 ---
  kdt_chao: { title: 'Ba đời giữ đài', teller: 'Kiếp Đài Thủ', paras: [
    '“Đứng xa mép đài.”',
    '“Ta giữ đài này. Ba đời nhà ta giữ đài này. Việc của ta: quét lá, và nhớ.”'] },
  kdt_h1_kinh: { title: 'Nửa tấm kính', teller: 'Kiếp Đài Thủ', paras: [
    '“Kính vỡ đôi, một nửa chìm ở đây, trong đá, dưới chân ngươi ba tấc. Nửa kia —” (im lặng rất lâu) “— không ở đây.”'] },
  kdt_h1_mangkinh: { title: 'Ngày kính về đài', teller: 'Kiếp Đài Thủ', hint: 'Mang Thái Nhất Thiên Mệnh Kính (vật phẩm ẩn của Thần tộc) tới Đài Kiếp rồi hãy nói chuyện với ông.', paras: [
    '(nhìn tấm kính rất lâu) “Ngươi nhặt được nó.”',
    '“Tổ tiên ta nói: ngày nào nửa kính này về lại đài, ngày đó trời sắp gọi tên một người rất cũ. Ta quét lá ở đây bốn mươi năm để chờ câu đó thành thật. Ngươi về đi. Sắp tới, sấm ở đây sẽ khác.”'] },
  qs_chao: { title: 'Chuyện có thứ tự', teller: 'Quản Sự Đạo Quán', paras: [
    '“Đạo Quán ghi chép mọi việc có thứ tự. Chuyện kể cũng vậy — có đoạn được phép kể, có đoạn chưa tới lúc. Ngươi muốn nghe đoạn nào trong phạm vi cho phép, ta kể.”'] },
  qs_h3_chinhthong: { title: 'Bản kể của Đạo Quán', teller: 'Quản Sự Đạo Quán', hint: 'Đạt Kim Đan rồi hãy hỏi Quản Sự về vụ La Hầu.', paras: [
    '“Theo văn bản của Đạo Quán: La Hầu, tướng giữ cửa Thiên Đạo Môn, phạm tội để lọt kẻ gian trong đêm kính vỡ, bị đày làm án.”',
    '“Đó là văn bản.” (dừng) “Còn điều văn bản không ghi, ta không có thẩm quyền nói. Ngươi thông cảm.”'] },
  sg_h3_ma: { title: 'Đệ tử bị xóa tên', teller: 'Sứ Giả Tông Môn', hint: 'Đoạn này Sứ Giả chỉ kể cho người phe Ma đã đạt Kim Đan.', paras: [
    '“Chuyện này Sứ Giả chỉ nói với người của Ma đạo — nói ra ngoài, Đạo Quán sẽ bảo ta bịa.”',
    '“Tông môn đầu tiên của thế gian từng có một đệ tử bị xóa tên khỏi danh sách. Không phải trục xuất. Xóa — như chưa từng bái sư, chưa từng ngồi trong giảng đường. Các trưởng lão đời đầu tìm khắp sổ sách: trang của y còn nguyên, chỉ trống trơn.”',
    '“Ma Tổ La Hầu năm xưa gác cửa Thiên Đạo Môn. Kẻ bước qua sau lưng ngài mà không ai nhìn thấy — ngươi có nghĩ, hắn và người đệ tử bị xóa tên kia… dùng chung một cách biến mất không?”'] },
  tn_h3_tien: { title: 'Tông môn bị xóa tên', teller: 'Thương Nhân Lưu Động', hint: 'Đoạn này thương nhân chỉ kể cho người phe Tiên.', paras: [
    '“Ngươi theo Tiên đạo à? Thì ta kể ngươi nghe chuyện Đạo Quán giấu: năm xưa có một tông môn bị xóa tên khỏi mọi sổ sách trong một đêm. Không phải giải tán — xóa, như chưa từng có. Đệ tử của họ giờ ở đâu? Có khi… đang ngồi nghe ta kể chuyện cũng nên.”'] },
  tn_hetchuyen: { title: 'Để dành vốn', teller: 'Thương Nhân Lưu Động', hint: 'Nghe thương nhân kể chuyện La Hầu trước đã.', paras: [
    '“Hết chuyện hôm nay rồi! Kể nữa là lộ hết vốn, mai lấy gì buôn. Đi đi, tu hành đi — chuyện hay phải để dành, như tiền vậy.”'] },
  ab_h4_tiengso: { title: 'Tiếng lật trang', teller: 'Âm Bà', hint: 'Đạt Nguyên Anh và đã nghe chuyện Hồi 3 rồi hãy hỏi Âm Bà về tiếng sổ.', paras: [
    '“Ngươi xuất hồn được rồi thì đêm nay thử nghe. Không phải bằng tai.”',
    '“Tiếng lật trang. Xa, đều, không nghỉ. Mỗi lần có kẻ trong thế gian lẽ ra phải chết mà chưa chết, sổ lật một trang. Ta giữ mộ nên ta nghe quen rồi.”',
    '“Ngươi tưởng tiếng ấy chỉ của một mình kẻ xé sổ năm xưa à? Đếm thử đi: một đêm có bao nhiêu trang lật. Tu sĩ các ngươi — kẻ nào chẳng là ‘đáng chết mà chưa chết’? Có khi trời để yên cho các ngươi tu, chính vì cuốn sổ ấy đã quá dày.”'] },
  ab_h4_quy: { title: 'Ngươi đã chết một lần chưa', teller: 'Âm Bà', hint: 'Bản kể riêng cho Quỷ tộc / Quỷ tu ở Hồi 4.', paras: [
    '“Riêng giống ngươi thì nghe rõ hơn. Chết đối với ngươi là thay áo — nên tiếng sổ gọi tên ngươi, nghe như tiếng người nhà gọi về ăn cơm.”',
    '“Ta hỏi một câu, ngươi tự trả lời lấy: ngươi đã chết một lần chưa? Chết thật ấy. Nếu rồi — trang của ngươi trong sổ lật khác hẳn người ta. Mỏng hơn. Và… nghe gần hơn.”'] },
  ck_h5_bong: { title: 'Cái bóng không có người', teller: 'Cụ Ký', hint: 'Đạt Hóa Thần và đã mở đường Luyện Hồn rồi hãy nghe đoạn này.', paras: [
    '“Dạo này ngươi đi đứng nhẹ hơn, mà cái bóng thì nặng hơn. Ừ — hồn người tu tới mức ấy là bắt đầu có sức nặng riêng. Ngồi xuống, ta kể ngươi nghe đoạn về một cái bóng không có người. Nghe xong đừng sợ: nó đứng sau lưng mọi người tu hành, không riêng ngươi.”'] },
  kdt_h5_soi: { title: 'Mặt trong gương vỡ', teller: 'Kiếp Đài Thủ', hint: 'Đạt Hóa Thần và mang theo Thái Nhất Thiên Mệnh Kính tới Đài Kiếp.', paras: [
    '“Đặt kính lên đài.” (im lặng rất lâu) “Xong. Nhìn đi.”',
    '“Kính không soi ngươi. Nó soi kẻ sau lưng ngươi. Nửa mặt thôi — nửa còn lại thuộc về tấm kính đã mất.”',
    '“Đừng quay lại. Quay lại thì không thấy gì đâu. Hắn đứng ở chỗ chỉ kính mới thấy được: sau lưng mọi kẻ cãi lại cái chết.”'] },
  ck_h5_chuky: { title: 'Chữ ký của hồn', teller: 'Cụ Ký', hint: 'Khi Thần Thuật của ngươi sinh ra (Pháp Tướng Chân Ảnh), quay lại nghe Cụ Ký nói về chữ ký.', paras: [
    '“Thần Thuật của ngươi sinh rồi à. Ngồi xuống, ta nói câu này một lần thôi: thuật ấy là chữ ký của hồn ngươi. Trời đọc người không đọc mặt — trời đọc chữ ký.”',
    '“Kẻ Không Tên mà tìm được chữ ký của hắn, thì biết hắn là ai. Chữ ký ấy không ở trên trời, không ở dưới đất. Nó nằm trong trang sổ bị mang đi.”'] },
  kdt_h6_giatruyen: { title: 'Câu gia truyền', teller: 'Kiếp Đài Thủ', hint: 'Đạt Phản Hư rồi hãy lên Đài Kiếp nghe câu gia truyền.', paras: [
    '“Tổ tiên ta chép phụ cuốn Sinh Tử Bộ — ở dương gian này, chép chuyện người chết oan cho âm gian đối chiếu.”',
    '“Gia truyền nhà ta có một câu, đời đời chỉ truyền miệng: Trang bị xé không mất. Nó nằm trong tay kẻ sẽ tự viết lại tên mình — khi hắn chán trốn. Ngươi tu hành, nhớ câu ấy. Có ngày ngươi sẽ hiểu vì sao ta nói.”'] },
  kdt_h6_diemdanh: { title: 'Buổi điểm danh', teller: 'Kiếp Đài Thủ', hint: 'Vào Độ Kiếp rồi hãy nghe đoạn này ở Đài Kiếp.', paras: [
    '“Sắp tới lượt ngươi lên đài.”',
    '“Người đời gọi là Độ Kiếp. Nhà ta gọi là điểm danh. Sét đánh xuống không phải để giết — để gọi tên. Tên còn trong sổ thì nghe thấy tiếng gọi của mình.”',
    '“Ngươi nghe thấy. Tốt. Kẻ không nghe thấy gì trong tiếng sấm mới là kẻ đáng sợ — sổ đã mất tên hắn rồi.”'] },
  // --- GĐ354 (B3): Hồi 7 + kết 3 đường + tình huống ---
  qs_h7_tron: { title: 'Bản kể trọn — Vụ án Thiên Đạo Môn', teller: 'Quản Sự Đạo Quán', hint: 'Chỉ người Chứng Thần mới đủ tư cách nghe bản kể trọn.', paras: [
    '“Ngươi đã Chứng Thần. Vậy ta kể hết. Từ nay, ngươi là một trong rất ít người sống biết chuyện này.”',
    '“Đêm ấy, kẻ gian không lẻn qua cửa. Hắn đi qua cửa, đàng hoàng, ngay sau lưng La Hầu. Hắn là người của Thiên Đạo Môn — chức không nhỏ. Kẻ có quyền mới biết trang nào trong sổ là trang của mình; kẻ có quyền mới dám xé nó ngay trong kho; và kẻ có quyền mới ung dung đi ra bằng cửa chính.”',
    '“Thiên Đạo Môn biết. Không phải về sau mới biết — biết ngay từ đầu. Nhưng công khai vụ án là công khai một sự thật làm sụp cả ngôi nhà: trời cũng có kẻ phản. Nên họ chọn La Hầu. Một người gác cửa hiền lành, không phe cánh, không ai bênh.”',
    '“Ngươi hỏi ta sao biết? Vì ta là đời thứ tư chép sổ phụ cho dương gian — và đời nào trong nhà ta cũng chép thêm một dòng ngoài sổ: dòng về vụ án này. Nhà ta không quên. Nhà ta chỉ chờ người đủ mạnh để nghe mà không sợ.”',
    '“Còn hắn? Hắn vẫn đâu đó. Không già đi được trọn vẹn, vì cái chết hắn trốn cũng là một phần của hắn. Hắn sẽ tự viết lại tên mình vào một ngày nào đó — khi hắn chán trốn. Ngày đó, sổ sẽ rung. Và những người biết chuyện như ngươi… sẽ nghe thấy đầu tiên.”'] },
  hv_h7_tien: { title: 'Kẻ từng đứng ở cổng này', teller: 'Hộ Vệ Tiên Môn', hint: 'Đoạn này chỉ mở cho người đã Thăng Tiên Giới.', paras: [
    '“Ngươi là người mới nhất chép tên vào Tiên tịch. Ta mừng cho ngươi. Việc ấy… không phải ai cũng làm được đâu.”',
    '“Ngày xưa — lâu lắm rồi — có một người cũng tới cổng này. Tiên tịch mở ra trước mặt hắn. Hắn đứng rất lâu. Rồi hắn quay xuống, không lên.”',
    '“Ta hỏi vì sao. Hắn nói: chép tên vào đây, là phải bỏ tên cũ. Mà tên cũ của hắn… có người đang giữ giùm. Ta không hiểu. Giờ thì già rồi, ta cũng vẫn không hiểu. Chỉ nhớ hắn quay xuống — và từ đó không ai thấy hắn trong sổ nào nữa.”'] },
  ab_h7_diem: { title: 'Mùi giấy cháy', teller: 'Âm Bà', hint: 'Điềm báo chỉ hiện với Địa Tiên đã nhiều lần thoát khỏi tay trời.', paras: [
    '“Lại chạy thoát… ngươi có ngửi thấy mùi giấy cháy không?”',
    '“Điềm báo thật sự không phải sấm. Sấm ai cũng thấy. Điềm báo là mùi giấy cháy — khi trời lật sổ tìm ngươi, giấy cũ cháy xém ở mép.”',
    '“Ngửi thấy mùi ấy giữa đêm, không sấm không mây — là lúc hắn ở gần. Hắn cũng đang bị tìm. Mà không — hắn không bị tìm nữa. Hắn chỉ… đi ngang qua chỗ ngươi đang bị tìm, như hai kẻ ướt mưa đi ngang qua nhau.”',
    '“Ngươi còn được trời gọi tên. Hắn thì không. Trong hai kẻ, ta không biết ai khổ hơn.”'] },
  ab_dt_truylung: { title: 'Chạy được là giỏi', teller: 'Âm Bà', hint: 'Trở thành Địa Tiên và thoát khỏi Thiên Đạo Truy Lùng một lần rồi hãy nghe.', paras: [
    '“Ngươi bị trời điểm danh rồi à. Ngồi xuống, thở đi. Chạy được là giỏi.”',
    '“Ta chôn nhiều người bị trời tìm lắm. Ngươi biết điểm chung của họ không? Họ đều còn tên trong sổ — trời tìm được là vì trời còn nhớ tên. Ngươi còn được trời gọi tên. Hắn thì không.”'] },
  ck_h7_nhanra: { title: 'Giọng bước chân này', teller: 'Cụ Ký', hint: 'Sang kiếp mới, sau khi đã nghe trọn vụ án ở kiếp trước, hãy quay lại nghe Cụ Ký.', paras: [
    'Cụ Ký ngẩng mặt lên, hướng về phía tiếng bước chân của bạn, im lặng rất lâu.',
    '“…Giọng bước chân này… Kiếp trước — à không, xin lỗi, già lẩm cẩm. Ngồi đi, để ta kể lại từ đầu.”'] },
  ck_god10: { title: 'Mười món đồ và một khoảng trống', teller: 'Cụ Ký', hint: 'Thu thập đủ 10 vật phẩm ẩn của mười vị thần đầu tiên rồi quay lại chỗ Cụ Ký.', paras: [
    '“Ngươi mang mùi của mười món đồ rất cũ. Mười vị đầu tiên để lại mười dấu — ngươi đã chạm cả mười.”',
    '“Mà lạ. Mười dấu ấy xếp quanh ngươi thành một vòng… và giữa vòng có một khoảng trống, hình một trang giấy.”',
    '“Ta không biết nó nghĩa là gì. Nhưng nếu một ngày ngươi gặp kẻ mà mười dấu ấy đều tránh ra… thì đó là người ngươi đang tìm.”'] },
  lng_chao: { title: 'Chuyện sông nước', teller: 'Lão Ngư', hint: 'Nghe ở Lão Ngư, mỗi mùa lễ Hạ.', paras: [
    '“Ngồi xuống, ăn con cá. Chuyện sông nước dài, không kể vội được.”',
    '“Ta chèo thuyền trên con sông này từ khi nó còn chưa có tên trong sổ của làng. Sổ làng ghi sông này có từ đời vua nào đó. Ta thì biết: sông có trước sổ. Nhiều thứ có trước sổ.”'] },
  lng_den: { title: 'Chiếc đèn không ghi tên', teller: 'Lão Ngư', hint: 'Nghe chuyện sông nước trước, rồi hãy hỏi về chiếc đèn.', paras: [
    '“Đêm lễ, người ta thả đèn ghi tên người thân đã mất. Có năm, ta thấy một chiếc đèn không ghi tên — mà cháy sáng nhất sông.”',
    '“Ta chèo theo nó tới gần sáng. Nó không tắt, không trôi vào bờ. Tới thượng nguồn thì… mất. Như có người cầm lên.”',
    '“Người ta nói thả đèn không tên là gọi hồn lang thang. Ta thì nghĩ ngược: có kẻ nào đó, tự thả đèn cho chính mình — vì không còn ai nhớ tên hắn để mà thả.”'] },
  // --- GĐ355 (C): chương tộc — Nhập Tộc / Thử Thách / Truyền Thừa (chỉ mở tiếp trong đúng kiếp tộc đó) ---
  rc_nhan_1: { title: 'Bảy Nghìn Ngày Học Nữa — Nhập Tộc', teller: 'Thầy Đồ / Cụ Ký', hint: 'Sống kiếp Nhân tộc và một lần đứng học ở Văn Uyển, rồi nghe ở Thầy Đồ hoặc Cụ Ký.', paras: [
    '“Ngươi là người. Người thì không có gì đặc biệt — đó là đặc biệt của người.”',
    '“Vị đầu tiên của tộc ngươi không mạnh nhất, không sống lâu nhất. Người ấy chỉ có một thứ: học. Học từ mọi tộc, mọi nghề, mọi kẻ thù. Ngươi đã đứng học ở Văn Uyển — tốt. Con đường của Nhân tộc bắt đầu bằng việc cúi đầu.”'] },
  rc_nhan_2: { title: 'Bảy Nghìn Ngày Học Nữa — Thử Thách', teller: 'Thầy Đồ / Cụ Ký', hint: 'Đạt Trúc Cơ trong kiếp Nhân tộc rồi nghe tiếp.', paras: [
    '“Bảy nghìn ngày — đó là số ngày vị đầu tiên dùng để học hết những gì các tộc khác biết mà chịu dạy.”',
    '“Ngày cuối cùng, người ấy không học thêm được gì nữa — vì không còn ai chịu dạy một kẻ đã biết hết cách hỏi. Thử thách của Nhân tộc không phải thi. Là bị từ chối, rồi vẫn học tiếp bằng mắt.”'] },
  rc_nhan_3: { title: 'Bảy Nghìn Ngày Học Nữa — Truyền Thừa', teller: 'Thầy Đồ / Cụ Ký', hint: 'Kim Đan trong kiếp Nhân tộc, và vẫn giữ thói quen đứng học ở Văn Uyển.', paras: [
    '“Truyền thừa của Nhân tộc không phải một món đồ. Là một câu: học nữa.”',
    '“Vị đầu tiên để lại Văn Uyển — nơi ngươi đã đứng học. Ai thuộc tộc người, đứng ở đó đủ lâu, sẽ nghe thấy tiếng lật sách không có gió. Đó là người ấy vẫn đang học — học qua mắt của các ngươi.”',
    '“Nhớ lấy: tộc ngươi yếu nhất từng cá nhân, và mạnh nhất khi tính cả thư viện. Đừng bao giờ đi một mình vào chỗ không có sách.”'] },
  rc_than_1: { title: 'Con Mắt Không Nhắm — Nhập Tộc', teller: 'Kiếp Đài Thủ', hint: 'Sống kiếp Thần tộc và một lần đứng trên Đài Kiếp, rồi nghe ở Kiếp Đài Thủ.', paras: [
    '“Ngươi là thần. Ta biết — ngươi nhìn đời khác chúng ta. Ta giữ đài này ba đời, chỉ để nhìn lên một lần mỗi kiếp người.”',
    '“Vị đầu tiên của tộc ngươi từng đứng đúng chỗ ngươi đang đứng, nhìn xuống. Từ đó, một con mắt của người ấy không bao giờ nhắm nữa. Ngươi đã đứng trên đài — con mắt ấy vừa nhìn ngươi.”'] },
  rc_than_2: { title: 'Con Mắt Không Nhắm — Thử Thách', teller: 'Kiếp Đài Thủ', hint: 'Đạt Nguyên Anh trong kiếp Thần tộc rồi nghe tiếp.', paras: [
    '“Thử thách của Thần tộc không phải chịu đựng. Là nhìn mà không can thiệp.”',
    '“Con mắt không nhắm đã thấy mọi vụ án của trời đất — kể cả vụ án mà nhà ta chép trong sổ phụ. Thấy hết, và không nói. Ngươi muốn truyền thừa của tộc mình, thì học cách thấy mà không nói trước.”'] },
  rc_than_3: { title: 'Con Mắt Không Nhắm — Truyền Thừa', teller: 'Kiếp Đài Thủ', hint: 'Hóa Thần trong kiếp Thần tộc, và đã đứng trên Đài Kiếp.', paras: [
    '“Ta kể ngươi nghe điều nhà ta chỉ dám chép bằng mực nhạt: con mắt không nhắm có một lần chớp.”',
    '“Đêm trang sổ bị xé, con mắt ấy chớp một lần. Chỉ một lần — đúng lúc kẻ gian đi qua cửa. Thần tộc các ngươi biết hắn là ai từ khoảnh khắc đó. Và chọn im lặng, như đã chọn từ đầu.”',
    '“Truyền thừa này không phải sức mạnh. Là một món nợ: tộc ngươi nợ thế gian một lời nói thật, chưa trả.”'] },
  rc_hoa_1: { title: 'Mầm Nhớ Mùa Xuân Trước — Nhập Tộc', teller: 'Cụ Ký', hint: 'Sống kiếp Hoa tộc rồi nghe ở Cụ Ký, dưới cây cổ thụ.', paras: [
    'Cụ Ký đưa tay chạm nhẹ vào thân cây cổ thụ sau lưng, mỉm cười: “Ngươi là hoa. Hoa thì nhớ bằng rễ.”',
    '“Vị đầu tiên của tộc ngươi là một cái cây — cây cổ thụ này, hoặc một cây như nó. Mầm nào của tộc ngươi cũng nhớ mùa xuân trước, dù chưa từng sống qua. Ngươi cũng vậy — có những thứ ngươi nhớ mà không hiểu vì sao.”'] },
  rc_hoa_2: { title: 'Mầm Nhớ Mùa Xuân Trước — Thử Thách', teller: 'Cụ Ký', hint: 'Đạt Trúc Cơ trong kiếp Hoa tộc rồi nghe tiếp.', paras: [
    '“Thử thách của Hoa tộc là chết.”',
    '“Không phải chết hẳn — các ngươi có đặc ân sống lại một lần trong ngày, như cây đâm chồi sau khi bị đốn. Nhưng mỗi lần sống lại, rễ nhớ thêm một mùa đau. Hoa tộc mạnh không phải vì không chết. Vì nhớ hết mọi lần chết.”'] },
  rc_hoa_3: { title: 'Mầm Nhớ Mùa Xuân Trước — Truyền Thừa', teller: 'Cụ Ký', hint: 'Trong kiếp Hoa tộc, hãy dùng đặc ân hồi sinh một lần rồi quay lại nghe.', paras: [
    '“Ngươi đã chết và đã dậy. Tốt. Giờ ta kể phần cuối.”',
    '“Vị đầu tiên của tộc ngươi từng che cho một kẻ chạy trốn — tán cây của người ấy là chỗ ẩn duy nhất mà sổ trời không soi tới trong một đêm. Kẻ chạy trốn đó là ai, cây không nói. Cây chỉ nhớ: hắn khóc, và nước mắt của hắn làm một mầm lạ mọc lên.”',
    '“Truyền thừa của Hoa tộc: chỗ ngươi đứng mà thiền, là nơi linh khí. Và một lời dặn — đừng bao giờ hỏi cái cây về đêm đó. Nó đã giữ bí mật ấy lâu hơn mọi lời thề.”'] },
  rc_ma_1: { title: 'Chén Máu Không Đổ — Nhập Tộc', teller: 'Âm Bà / Thương Nhân Lưu Động', hint: 'Sống kiếp Ma tộc và chọn phe Ma, rồi nghe ở Âm Bà hoặc Thương Nhân.', paras: [
    '“Ngươi là ma, và ngươi đã nhận phe của mình. Tốt — ma mà không nhận mình là ma thì yếu lắm.”',
    '“Vị đầu tiên của tộc ngươi lập thệ bằng một chén máu: uống cạn, không đổ một giọt. Từ đó Ma tộc trọng lời hứa hơn trọng mạng — vì kẻ bội thệ, máu trong người tự sôi.”'] },
  rc_ma_2: { title: 'Chén Máu Không Đổ — Thử Thách', teller: 'Âm Bà / Thương Nhân Lưu Động', hint: 'Đạt Kim Đan trong kiếp Ma tộc rồi nghe tiếp.', paras: [
    '“Thử thách của Ma tộc là lúc máu xuống thấp nhất.”',
    '“Khi ngươi thoi thóp — dưới ba phần máu — tộc ngươi đánh đau hơn hẳn. Đó không phải quà. Là chén máu năm xưa đòi nợ: hoặc ngươi giết, hoặc ngươi là giọt máu bị đổ.”'] },
  rc_ma_3: { title: 'Chén Máu Không Đổ — Truyền Thừa', teller: 'Âm Bà / Thương Nhân Lưu Động', hint: 'Nguyên Anh trong kiếp Ma tộc, vẫn thuộc phe Ma.', paras: [
    '“Phần cuối đây. Chén máu của vị đầu tiên… còn một nửa.”',
    '“Người ấy uống nửa chén, để nửa chén lại — nói rằng nửa còn lại dành cho một người bạn sẽ tới trong tương lai xa, kẻ mà trời không tìm được tên. Ma tộc giữ nửa chén ấy tới nay, trong một cái hộp không ai dám mở.”',
    '“Truyền thừa không phải chén máu. Là tiêu chuẩn chọn bạn của tộc ngươi: chỉ kẻ không còn tên trong sổ mới xứng uống nửa chén còn lại.”'] },
  rc_quy_1: { title: 'Trang Sổ Thứ Hai — Nhập Tộc', teller: 'Âm Bà', hint: 'Sống kiếp Quỷ tộc, đạt Trúc Cơ rồi nghe ở Âm Bà.', paras: [
    '“Ngươi là quỷ. Âm Bà ta gặp quỷ nhiều — ngươi là một trong số ít kẻ dám tới nghe chuyện của chính mình.”',
    '“Người ta tưởng Sinh Tử Bộ chỉ có một cuốn. Không. Có một cuốn thứ hai — chép những kẻ chết mà không chịu chết hẳn. Tộc ngươi nằm trong cuốn đó. Đó là lý do hồn khí của các ngươi dồi dào: các ngươi sống bằng phần hồn của chính trang sổ ấy.”'] },
  rc_quy_2: { title: 'Trang Sổ Thứ Hai — Thử Thách', teller: 'Âm Bà', hint: 'Đi đường Luyện Hồn, hoặc đạt Kim Đan trong kiếp Quỷ tộc.', paras: [
    '“Thử thách của Quỷ tộc là đọc được tên mình trong cuốn thứ hai.”',
    '“Tên ngươi ở đó viết bằng mực của kẻ khác — kẻ đã ghi ngươi vào sổ phụ của dương gian. Đọc được nó, ngươi biết ai nợ ngươi một kiếp. Chưa đọc được, thì cứ luyện hồn tiếp — hồn mạnh lên, chữ sẽ hiện.”'] },
  rc_quy_3: { title: 'Trang Sổ Thứ Hai — Truyền Thừa', teller: 'Âm Bà', hint: 'Đi đường Luyện Hồn tới nơi, hoặc đạt Nguyên Anh trong kiếp Quỷ tộc.', paras: [
    '“Truyền thừa đây — ta chỉ nói một lần: cuốn sổ thứ hai cũng bị thiếu một trang.”',
    '“Cùng một đêm, cùng một kẻ. Hắn xé trang của mình trong cuốn thứ nhất, và xé luôn trang của… một người khác trong cuốn thứ hai. Vì sao phải xé hai trang? Bà già này nghĩ mãi không ra. Có lẽ hắn không trốn một mình.”',
    '“Quỷ tộc các ngươi là tộc duy nhất có thể lần theo trang thiếu ấy — vì hồn khí của các ngươi nhận ra chỗ trống trong sổ như mũi chó nhận ra mùi.”'] },
  rc_tien_1: { title: 'Rơi Xuống Chậm Hơn — Nhập Tộc', teller: 'Hộ Vệ Tiên Môn', hint: 'Sống kiếp Tiên tộc và Thăng Tiên Giới, rồi nghe ở Hộ Vệ Tiên Môn.', paras: [
    '“Ngươi là tiên — và là tiên rơi xuống mà thành, hay tiên sinh ra đã ở trên này? Ta giữ cổng lâu, ta phân biệt được.”',
    '“Vị đầu tiên của tộc ngươi là một vị thần bị đày — rơi từ trên cao xuống. Nhưng người ấy rơi chậm hơn mọi kẻ bị đày, vì trong lúc rơi, người ấy kịp nhìn hết thế gian một lượt và thương nó.”'] },
  rc_tien_2: { title: 'Rơi Xuống Chậm Hơn — Thử Thách', teller: 'Hộ Vệ Tiên Môn', hint: 'Nghe tiếp ở Hộ Vệ Tiên Môn trong kiếp Tiên tộc.', paras: [
    '“Thử thách của Tiên tộc là cái khiên.”',
    '“Lớp khiên mỏng quanh người ngươi — phần thương thế gian còn sót lại trong vị đầu tiên, truyền xuống cho cả tộc. Mỗi lần khiên vỡ rồi lại đầy, là một lần ngươi chọn ở lại với thế gian thay vì bay lên hẳn.”'] },
  rc_tien_3: { title: 'Rơi Xuống Chậm Hơn — Truyền Thừa', teller: 'Hộ Vệ Tiên Môn', hint: 'Nghe phần cuối ở Hộ Vệ Tiên Môn trong kiếp Tiên tộc.', paras: [
    '“Ta kể ngươi nghe điều chỉ người giữ cổng mới thấy: kẻ năm xưa quay xuống ở cổng này — hắn cũng rơi chậm.”',
    '“Người thường rơi thì vút qua. Hắn rơi như có ai đỡ. Tộc ngươi đỡ người rơi từ ngày vị đầu tiên được đỡ — dù các ngươi không còn nhớ. Có khi kẻ các ngươi từng đỡ, chính là kẻ mà sổ trời đang tìm.”',
    '“Truyền thừa của Tiên tộc không nằm ở trên này. Nằm ở chỗ: khi gặp một kẻ đang rơi, ngươi sẽ đưa tay ra trước khi kịp nghĩ.”'] },
  rc_long_1: { title: 'Ngụm Nước Thượng Nguồn — Nhập Tộc', teller: 'Lão Ngư / Thú Lão', hint: 'Sống kiếp Long tộc và một lần lên thượng nguồn sông, rồi nghe ở Lão Ngư hoặc Thú Lão.', paras: [
    '“Ngươi là long. Ta chèo thuyền cả đời, gặp long đúng hai lần — ngươi là lần thứ hai.”',
    '“Vị đầu tiên của tộc ngươi uống ngụm nước đầu tiên của con sông này khi sông còn chưa chảy tới biển. Từ đó Long tộc nhớ đường nước như nhớ nhà. Ngươi đã lên thượng nguồn — ngụm nước ấy vừa nhận ra ngươi.”'] },
  rc_long_2: { title: 'Ngụm Nước Thượng Nguồn — Thử Thách', teller: 'Lão Ngư / Thú Lão', hint: 'Đạt Trúc Cơ trong kiếp Long tộc rồi nghe tiếp.', paras: [
    '“Thử thách của Long tộc là hơi thở.”',
    '“Cứ năm đòn, tộc ngươi lại phun Long Tức một lần — đó là ngụm nước thượng nguồn năm xưa hóa thành lửa. Ai giữ được nhịp thở ấy trong trận dài, kẻ đó giữ được mình. Mất nhịp là mất cả hai: lửa và nước.”'] },
  rc_long_3: { title: 'Ngụm Nước Thượng Nguồn — Truyền Thừa', teller: 'Lão Ngư / Thú Lão', hint: 'Kim Đan trong kiếp Long tộc, và đã lên thượng nguồn.', paras: [
    '“Phần cuối, ta kể như người chèo đò kể cho khách cuối ngày: thượng nguồn không phải nơi nước bắt đầu.”',
    '“Nước bắt đầu từ một cái giếng không đáy ở rất xa. Vị đầu tiên của tộc ngươi từng canh giếng ấy — và từng để một người lạ uống nước giếng trong đêm trang sổ bị xé. Người lạ đó không để lại tên. Chỉ để lại một vệt ướt hình bàn chân, đi về phía hạ lưu.”',
    '“Truyền thừa của Long tộc: các ngươi là tộc duy nhất biết đường nước mà kẻ đó đã đi. Khi sông đổi dòng bất thường, hãy đi ngược lên. Có dấu ở đó.”'] },
  rc_ho_1: { title: 'Cược Chưa Ai Thu Tiền — Nhập Tộc', teller: 'Thương Nhân Lưu Động', hint: 'Sống kiếp Hồ tộc và kết thân với Thương Nhân (thiện cảm 100+), rồi nghe ở Thương Nhân.', paras: [
    '“Ngươi là hồ ly, và ngươi tới nghe chuyện với một người buôn. Khôn đấy — hồ ly khôn là hồ ly biết chọn bạn.”',
    '“Vị đầu tiên của tộc ngươi từng đặt một ván cược với trời: cược rằng sẽ có một ngày, một kẻ không còn tên trong sổ tới xin tá túc. Trời cười, nhận cược. Tiền cược là chín cái đuôi.”'] },
  rc_ho_2: { title: 'Cược Chưa Ai Thu Tiền — Thử Thách', teller: 'Thương Nhân Lưu Động', hint: 'Thiện cảm với Thương Nhân đạt 200+ trong kiếp Hồ tộc.', paras: [
    '“Thử thách của Hồ tộc là ảo ảnh — mười lăm phần trăm đòn đánh vào ngươi chỉ là đánh vào bóng.”',
    '“Trời đặt ra luật ấy để chọc tức vị đầu tiên: ngươi khéo lách vậy thì cho ngươi lách cả lưỡi dao. Nhưng ảo ảnh chỉ cứu được thân. Cái cược thì vẫn treo — và trời chưa từng thua cược nào mà không tìm cách gỡ.”'] },
  rc_ho_3: { title: 'Cược Chưa Ai Thu Tiền — Truyền Thừa', teller: 'Thương Nhân Lưu Động', hint: 'Thiện cảm với Thương Nhân đạt 300+ trong kiếp Hồ tộc.', paras: [
    '“Bạn thân, ta kể ngươi nghe điều ta chỉ kể cho người ta quý thật: ván cược đó… sắp tới ngày thu tiền.”',
    '“Kẻ không tên đã xuất hiện quanh đây rồi — mười dấu của thập thần tránh hắn mà đi, người giữ sổ thì run tay khi chép. Nếu hắn tới xin tá túc thật, Hồ tộc thắng cược, trời phải trả chín cái đuôi… bằng một thứ mà trời không muốn trả: một cái tên mới.”',
    '“Truyền thừa của Hồ tộc: hãy là tộc đầu tiên mở cửa cho hắn. Thắng thua tính sau — mở cửa trước đã.”'] },
  rc_dieu_1: { title: 'Bài Hát Nhớ Đường — Nhập Tộc', teller: 'Tuyết Ông / Thú Lão', hint: 'Sống kiếp Bách Điểu và một lần lên đỉnh băng, rồi nghe ở Tuyết Ông hoặc Thú Lão.', paras: [
    '“Ngươi là điểu. Ta viết câu đối cả đời, chưa từng viết được câu nào bay như các ngươi.”',
    '“Vị đầu tiên của tộc ngươi là một con chim đưa thư của trời — bay mọi đường, nhớ mọi đường. Bài hát của tộc ngươi không phải để hát. Là bản đồ: mỗi nốt là một khúc quanh của gió.”'] },
  rc_dieu_2: { title: 'Bài Hát Nhớ Đường — Thử Thách', teller: 'Tuyết Ông / Thú Lão', hint: 'Đạt Trúc Cơ trong kiếp Bách Điểu rồi nghe tiếp.', paras: [
    '“Thử thách của Bách Điểu là bay sớm.”',
    '“Tộc khác phải đợi Kim Đan mới ngự không; các ngươi bay từ Trúc Cơ — vì vị đầu tiên xin trời một ân huệ duy nhất: cho con cháu được về nhà sớm khi trời trở gió. Trời cho. Và ghi nợ vào sổ — sổ nào, thì ngươi biết rồi đấy.”'] },
  rc_dieu_3: { title: 'Bài Hát Nhớ Đường — Truyền Thừa', teller: 'Tuyết Ông / Thú Lão', hint: 'Trong kiếp Bách Điểu, quay lại đỉnh băng rồi nghe phần cuối.', paras: [
    '“Phần cuối của bài hát, chỉ chim đầu đàn mới được dạy — và ta là người, nên ta chỉ nghe lỏm được một đoạn.”',
    '“Đoạn cuối không chỉ đường về nhà. Nó chỉ một đường bay không có trong sổ của trời — đường mà vị đầu tiên từng bay trong đêm đưa một lá thư không người nhận. Từ đó, năm nào tới mùa gió lớn, Bách Điểu cũng bay tránh một khoảng trời trống — khoảng trời mà kẻ không tên từng đi qua.”',
    '“Truyền thừa: nếu một ngày bài hát trong ngươi tự đổi một nốt — đừng sợ. Là đường bay cũ đang tự hiện lại.”'] },
  rc_thu_1: { title: 'Mỗi Loài Một Chuyện — Nhập Tộc', teller: 'Thú Lão', hint: 'Sống kiếp Vạn Thú và một lần vào rừng thú, rồi nghe ở Thú Lão.', paras: [
    '“Ngươi là Vạn Thú. Ngồi xuống đi — thú hoang ngoài kia không đánh ngươi, ta biết. Chúng nó nhận ra mùi của nhau.”',
    '“Vị đầu tiên của tộc ngươi không phải một con thú. Là mọi con thú — kẻ đã đi nói chuyện với từng loài một, xin mỗi loài một câu chuyện và một lời hứa: không đánh kẻ mang mùi của rừng.”'] },
  rc_thu_2: { title: 'Mỗi Loài Một Chuyện — Thử Thách', teller: 'Thú Lão', hint: 'Thuần hóa ít nhất 1 con thú trong kiếp Vạn Thú rồi nghe tiếp.', paras: [
    '“Thử thách của Vạn Thú là thuần hóa mà không trói.”',
    '“Ngươi đã thuần được một con — nó theo ngươi vì nó muốn. Thú theo người vì sợ thì là tù. Thú theo vì tin thì là bạn. Tộc ngươi đánh thường đau hơn người, nhưng đòn đau nhất của các ngươi là đòn không đánh: cái nhìn khiến thú dữ hạ tai xuống.”'] },
  rc_thu_3: { title: 'Mỗi Loài Một Chuyện — Truyền Thừa', teller: 'Thú Lão', hint: 'Vào rừng thú và thuần hóa từ 3 con thú trở lên trong kiếp Vạn Thú.', paras: [
    '“Phần cuối đây, nhóc. Mỗi loài một chuyện — và mọi chuyện đều có một đoạn giống nhau.”',
    '“Sói kể: có một đêm, một người không mùi đi qua rừng — thú dữ không ngửi thấy hắn, chó săn không sủa. Lang kể: hắn cho nó ăn mà không lại gần. Dơi kể: hắn đi qua hang mà không tiếng chân. Vị đầu tiên của tộc ngươi ghi lại hết — và dặn: kẻ không mùi sẽ quay lại rừng khi bị cả trời lẫn người truy.”',
    '“Truyền thừa của Vạn Thú: rừng là nơi duy nhất hắn có thể trốn mà không cần nói dối. Hãy giữ rừng cho hắn — và cho mọi kẻ bị truy như hắn.”'] },
};

// Bản đồ đoạn kể cho Thiên Mệnh Ký (hồi/kind do server sở hữu — bảng này chỉ để client XẾP đoạn vào hồi khi dựng sổ).
export const STORY_SEG_META: Record<string, { hoi: number; kind: string; race?: string }> = {
  tl_chao: { hoi: 0, kind: 'extra' }, tl_h1_tree: { hoi: 1, kind: 'main' }, tl_h1_cuahep: { hoi: 1, kind: 'main' },
  tl_tc: { hoi: 0, kind: 'extra' }, tl_luanhoi: { hoi: 0, kind: 'extra' },
  ck_chao: { hoi: 0, kind: 'extra' }, ck_h1_nhanhoang: { hoi: 1, kind: 'main' }, ck_h1_kinh: { hoi: 1, kind: 'main' },
  ab_chao: { hoi: 0, kind: 'extra' }, ab_h2_sotb: { hoi: 2, kind: 'main' }, ab_h2_mangdi: { hoi: 2, kind: 'main' },
  ab_quy: { hoi: 0, kind: 'extra' }, ab_duyen: { hoi: 0, kind: 'extra' },
  tn_chao: { hoi: 0, kind: 'extra' }, tn_h3_lahau: { hoi: 3, kind: 'main' }, tn_h3_muoimot: { hoi: 3, kind: 'main' },
  kdt_chao: { hoi: 0, kind: 'extra' }, kdt_h1_kinh: { hoi: 1, kind: 'main' }, kdt_h1_mangkinh: { hoi: 0, kind: 'extra' },
  qs_chao: { hoi: 0, kind: 'extra' }, qs_h3_chinhthong: { hoi: 3, kind: 'main' }, sg_h3_ma: { hoi: 3, kind: 'main' },
  tn_h3_tien: { hoi: 0, kind: 'extra' }, tn_hetchuyen: { hoi: 0, kind: 'extra' },
  ab_h4_tiengso: { hoi: 4, kind: 'main' }, ab_h4_quy: { hoi: 4, kind: 'main' },
  ck_h5_bong: { hoi: 5, kind: 'main' }, kdt_h5_soi: { hoi: 5, kind: 'main' }, ck_h5_chuky: { hoi: 5, kind: 'main' },
  kdt_h6_giatruyen: { hoi: 6, kind: 'main' }, kdt_h6_diemdanh: { hoi: 6, kind: 'main' },
  qs_h7_tron: { hoi: 7, kind: 'main' }, hv_h7_tien: { hoi: 7, kind: 'main' }, ab_h7_diem: { hoi: 7, kind: 'main' },
  ab_dt_truylung: { hoi: 0, kind: 'extra' }, ck_h7_nhanra: { hoi: 0, kind: 'extra' }, ck_god10: { hoi: 0, kind: 'extra' },
  lng_chao: { hoi: 0, kind: 'extra' }, lng_den: { hoi: 0, kind: 'extra' },
  rc_nhan_1: { hoi: 0, kind: 'race', race: 'nhan' }, rc_nhan_2: { hoi: 0, kind: 'race', race: 'nhan' }, rc_nhan_3: { hoi: 0, kind: 'race', race: 'nhan' },
  rc_than_1: { hoi: 0, kind: 'race', race: 'than' }, rc_than_2: { hoi: 0, kind: 'race', race: 'than' }, rc_than_3: { hoi: 0, kind: 'race', race: 'than' },
  rc_hoa_1: { hoi: 0, kind: 'race', race: 'hoa' }, rc_hoa_2: { hoi: 0, kind: 'race', race: 'hoa' }, rc_hoa_3: { hoi: 0, kind: 'race', race: 'hoa' },
  rc_ma_1: { hoi: 0, kind: 'race', race: 'ma' }, rc_ma_2: { hoi: 0, kind: 'race', race: 'ma' }, rc_ma_3: { hoi: 0, kind: 'race', race: 'ma' },
  rc_quy_1: { hoi: 0, kind: 'race', race: 'quy' }, rc_quy_2: { hoi: 0, kind: 'race', race: 'quy' }, rc_quy_3: { hoi: 0, kind: 'race', race: 'quy' },
  rc_tien_1: { hoi: 0, kind: 'race', race: 'tien' }, rc_tien_2: { hoi: 0, kind: 'race', race: 'tien' }, rc_tien_3: { hoi: 0, kind: 'race', race: 'tien' },
  rc_long_1: { hoi: 0, kind: 'race', race: 'long' }, rc_long_2: { hoi: 0, kind: 'race', race: 'long' }, rc_long_3: { hoi: 0, kind: 'race', race: 'long' },
  rc_ho_1: { hoi: 0, kind: 'race', race: 'ho' }, rc_ho_2: { hoi: 0, kind: 'race', race: 'ho' }, rc_ho_3: { hoi: 0, kind: 'race', race: 'ho' },
  rc_dieu_1: { hoi: 0, kind: 'race', race: 'dieu' }, rc_dieu_2: { hoi: 0, kind: 'race', race: 'dieu' }, rc_dieu_3: { hoi: 0, kind: 'race', race: 'dieu' },
  rc_thu_1: { hoi: 0, kind: 'race', race: 'thu' }, rc_thu_2: { hoi: 0, kind: 'race', race: 'thu' }, rc_thu_3: { hoi: 0, kind: 'race', race: 'thu' },
};
