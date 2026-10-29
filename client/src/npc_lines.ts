// GĐ150: lời thoại liên tục của NPC — chạy phía client, không cần server.
// Mỗi NPC nói theo vai trò + map đang đứng: nhiệm vụ, hint ẩn (nói bóng gió, không spoil số),
// chuyện xung quanh và đời sống. NPC nào cũng có thoại: NPC chức năng theo id/role riêng,
// dân thường theo map (làng / thành / map nghề). Cổng bí cảnh không phải người nên không có thoại.

export interface NpcTalkCtx {
  id: string; name: string; role: string; kind: string;
  mapId: string; isHome: boolean; category: string; mapName: string;
}

export function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

// ---- NPC làng (theo id) ----
const BY_ID: Record<string, string[]> = {
  npc_truonglang: [
    'Có nhiệm vụ làm xong thì về đây trả, đừng để quá hạn rồi tiếc.',
    'Làng này tuy nhỏ nhưng người chịu khó thì không thiếu đường tiến.',
    'Mấy đứa trẻ mới đo linh căn xong, cứ từ từ mà chọn đường, đừng vội.',
    'Bảng treo thưởng ngoài quảng trường ngày nào cũng có việc mới.',
  ],
  npc_dan: [
    'Đan Hồi Nguyên nhà ta uống vào là chân nguyên lại đầy, đi farm khỏi lo.',
    'Muốn chế đan thì bái Đan Lão làm sư phụ, đừng tự mò mà phí nguyên liệu.',
    'Đan tốt phải có thảo tốt — thảo thì chỉ Tiệm Thảo Dược mới bán.',
    'Dạo này người mua đan đi farm nhiều hơn hẳn, chắc ngoài kia có biến.',
  ],
  npc_nguyenlieu: [
    'Nguyên liệu rèn, chế đan, vẽ bùa — thiếu gì cứ ghé, ta đủ cả.',
    'Đi farm nhặt được xương thịt thì bán lại cho ta, giá sòng phẳng.',
    'Thương nhân lưu động hay mang hàng hiếm, gặp thì đừng bỏ qua.',
    'Nghe nói mỏ sâu có quặng lạ, nhưng phải có nghề Linh Khoáng mới đào được.',
  ],
  npc_thaoduoc: [
    'Thảo dược nhà ta chỉ bán cho người biết dùng — uống bậy là hại thân.',
    'Linh thảo, tiên thảo phải hái ở nơi linh khí đậm, không phải chợ nào cũng có.',
    'Ai học Thải Dược thì ghé Thảo Lão, đừng hái bừa mà hỏng cả bụi thuốc.',
    'Đan sư giỏi cũng cần thảo tốt, hai nghề này đi với nhau như hình với bóng.',
  ],
  npc_thuongnhan: [
    'Hàng hiếm khắp thiên hạ ta đều có — chỉ sợ ngươi không đủ linh thạch.',
    'Ta nay đây mai đó, gặp được là duyên, lần sau gặp lại chưa biết khi nào.',
    'Đi nhiều nơi mới biết: mỗi thành có một thứ đặc sản riêng.',
    'Nghe đâu có người ngồi thiền ở Đạo Quán rất lâu mà ngộ ra điều lạ...',
  ],
  npc_sugia: [
    'Tông môn chiêu mộ đệ tử — có chí thì theo, không ép ai cả.',
    'Đo linh căn rồi thì chọn đường cho kỹ: ở lại tu luyện hay ra ngoài farm, đường nào cũng tới đích nếu kiên trì.',
    'Có những nhiệm vụ không treo trên bảng — người tinh ý tự tìm ra.',
    'Chọn phe Tiên hay Ma là chuyện cả đời, nhưng đường nào cũng có thể quay đầu nếu chịu trả giá.',
    'Người tu lâu ở Đạo Quán, nghe nói sẽ mở ra những khiếu huyệt trước nay chưa từng biết.',
  ],
  npc_laibuan: [
    'Hộ tống thương nhân là việc vừa có linh thạch vừa ngắm thiên hạ — nhận không?',
    'Đường xa thì đi với đoàn, đi một mình dễ gặp cướp lắm.',
    'Luyện Khí, Trúc Cơ muốn sang map khác thì đi theo đoàn của ta là chắc nhất.',
    'Hàng tới nơi an toàn thì tiền công mới đủ — đừng để mất hàng giữa đường.',
  ],
  npc_ren: [
    'Rèn đồ thì mang nguyên liệu tới đây, ta rèn cho, phẩm càng cao chờ càng lâu.',
    'Đồ rèn sẵn trong tiệm mỗi ngày một khác, ghé sớm thì còn đồ ngon.',
    'Muốn tự rèn thì học Luyện Khí Sư với Khí Lão, rồi tự làm lấy mà dùng.',
    'Trang bị hợp hệ, hợp đường tu mới phát huy hết sức — mặc bừa là phí.',
  ],
  npc_master_dansu: [
    'Chế đan là nghề tỉ mỉ: sai một vị thuốc là hỏng cả lò.',
    'Đan buff tuy chỉ có hạn nhưng đúng lúc thì cứu được cả mạng.',
    'Muốn theo nghề Đan Sư thì bái sư rồi làm nhiệm vụ nghề mà lên phẩm.',
    'Đan tốt cần thảo tốt — rảnh thì ghé Thảo Lão học hái thuốc mà dùng.',
  ],
  npc_master_luyenkhi: [
    'Rèn là nghề của lửa và kiên nhẫn, không vội được.',
    'Tự rèn thì không tốn tiền tiệm, nhưng tốn quặng với đá — liệu mà tính.',
    'Đồ rèn theo phẩm mà lên, phẩm cao thì chờ lâu, đừng nôn nóng.',
    'Quặng tốt nằm ở mỏ sâu, muốn đào thì phải học Linh Khoáng trước.',
  ],
  npc_master_tranphap: [
    'Trận pháp bố đúng chỗ thì một người giữ được cả một vùng.',
    'Trận dịch chuyển gọi về là cứu cánh những lúc đi xa gặp nạn.',
    'Phong ấn trùm thử thách không phải để khoe — để giữ mạng cho người yếu hơn.',
    'Học trận pháp thì phải hiểu địa thế trước, vẽ bừa là trận phản lại chủ.',
  ],
  npc_master_phusu: [
    'Bùa là lời gửi vào giấy — tâm không tĩnh thì bùa không linh.',
    'Độn Thổ dùng để chạy, Định Thân dùng để giữ, Lôi Kích dùng để đánh — mỗi bùa một việc.',
    'Phù Sư chế được bùa thì ai cũng dùng được, nhưng người chế mới hiểu hết.',
    'Vẽ bùa tốn giấy tốt với mực tốt, đừng tiếc nguyên liệu mà hỏng việc lớn.',
  ],
  npc_master_thusu: [
    'Thuần hóa không phải đánh cho quái sợ — phải đợi nó yếu rồi mới dỗ.',
    'Thú thuần rồi là bạn đồng hành, chết là mất hẳn, liệu mà giữ.',
    'Mỗi loài thú một tính, sói khác dơi, dơi khác thạch quái.',
    'Thú Sư giỏi thì đi đâu cũng có bạn, đi một mình cũng không cô đơn.',
  ],
  npc_master_daokhoang: [
    'Mỏ sâu thì quặng tốt, nhưng đường xuống cũng nguy hiểm hơn.',
    'Mỗi mỏ một ngày chỉ đào được có hạn — tham là hỏng mỏ.',
    'Quặng với đá là máu của nghề rèn, không có thợ mỏ thì thợ rèn cũng đói.',
    'Muốn đào thì bái sư rồi nhận nhiệm vụ thu thập mà lên phẩm.',
  ],
  npc_master_haithuoc: [
    'Hái thuốc là nghề của mắt tinh và tay nhẹ — giật mạnh là nát bụi.',
    'Thảo dược chỉ mọc ở nơi linh khí đậm, đi lung tung không thấy đâu.',
    'Thảo dược chỉ bán ở Tiệm Thảo Dược, người không có bằng thì đừng mong bán.',
    'Biết hái thuốc thì đan sư nào cũng quý, đi đâu cũng có việc.',
  ],
};

// ---- NPC thành phố (theo role, dùng chung cách nhận diện với sprite) ----
const ROLE: Record<string, string[]> = {
  envoy: [
    'Tông môn ở thành này chiêu mộ đệ tử quanh năm, có chí thì ghé.',
    'Mỗi tông một phép tắc riêng, vào rồi thì phải giữ quy củ.',
    'Đệ tử tông môn học chiêu Trúc Cơ được giảm giá — nhớ hỏi khi học.',
    'Người từ làng lên thành thì đừng ngại hỏi đường, ai cũng từng như vậy.',
  ],
  shopdan: [
    'Đan thành phố đủ loại hơn làng, nhưng giá cũng cao hơn một chút.',
    'Đi farm xa thì mang dư đan hồi máu, đừng để hết giữa đường.',
    'Đan sư trong thành hay cần thảo lạ — có thì mang tới bán.',
    'Nghe nói có đan buff giúp đánh mạnh hơn một lúc, dùng đúng lúc mới đáng.',
  ],
  shopnl: [
    'Nguyên liệu thành phố nhiều hơn làng, hàng hiếm cũng hay về đây.',
    'Rèn, chế đan, vẽ bùa đều cần nguyên liệu — thiếu gì cứ hỏi.',
    'Hàng từ farm mang về bán được giá, đừng vứt đi phí.',
    'Thương nhân lưu động hay ghé thành này, gặp thì hỏi hàng hiếm.',
  ],
  shopthao: [
    'Thảo dược của ta có bằng Thải Dược Sư chứng nhận, mua là yên tâm.',
    'Thảo hái từ các vùng dược mang về, dược tính còn nguyên.',
    'Đan sư trong thành toàn qua ta lấy thảo — giá ta giữ như ở làng thôi.',
    'Muốn tự hái thì về làng bái Thảo Lão làm Thải Dược Sư, nghề này không khó sống.',
    'Linh thảo với tiên thảo hiếm lắm, có hàng là hết nhanh.',
  ],
  merchant: [
    'Hàng của ta đi khắp các thành, mỗi nơi một giá khác nhau.',
    'Buôn bán thì phải biết nhìn người — khách quen ta bớt cho.',
    'Đường buôn xa thì hay có đoàn hộ tống đi kèm, an toàn hơn nhiều.',
    'Thành này buôn bán sầm uất, ở lại vài hôm cũng không chán.',
  ],
  elder: [
    'Thành này có việc riêng của thành, làm xong thì về đây trả.',
    'Người mới tới thành thì cứ đi dạo một vòng, xem bảng treo thưởng trước.',
    'Mỗi thành một tính, dân mỗi nơi một nết — ở lâu thì quen.',
    'Có những việc không treo trên bảng, người tinh ý hỏi han mới biết.',
    'Trẻ tuổi thì đừng vội lên map mạnh, cứ làm việc thành mà tích lũy đã.',
  ],
};

// ---- Dân thường (theo map) ----
const AMBIENT_VILLAGE: string[] = [
  'Ruộng ngoài làng năm nay tốt, chắc được mùa.',
  'Chợ sáng đông vui thật, chiều thì vắng hoe.',
  'Mấy đứa trẻ trong làng đứa nào cũng mơ tu tiên.',
  'Trời sắp mưa rồi, phơi thuốc thì nhớ thu vào.',
  'Nghe nói ngoài bãi farm sói nhiều lắm, đi thì đi theo nhóm.',
  'Ở làng này sống chậm mà yên, ta không muốn đi đâu nữa.',
  'Đạo Quán dạo này đông người thiền hơn trước.',
  'Có những việc không treo trên bảng, hỏi han mới biết.',
];
const AMBIENT_CITY: string[] = [
  'Thành này đông đúc thật, ở làng lên mà choáng.',
  'Phố xá bán đủ thứ, chỉ sợ không đủ linh thạch.',
  'Dân thành này sống nhanh, sáng mở hàng tối đã dọn.',
  'Nghe nói thành bên có đặc sản riêng, rảnh thì qua xem.',
  'Bảng treo thưởng thành này ngày nào cũng có việc mới.',
  'Ở thành thì tiện đủ thứ, chỉ tội không yên tĩnh như làng.',
  'Người tu tiên qua lại thành này nhiều lắm.',
  'Trời thành này hay đổi, ra đường nhớ mang áo.',
  'Quán ăn trong thành ngon hơn làng nhiều, có tiền thì ghé.',
  'Có những việc không treo trên bảng, hỏi han mới biết.',
];
const AMBIENT_PROF: string[] = [
  'Map nghề này ai có nghề mới sống được, không thì chỉ đứng xem.',
  'Làm nghề thì phải lên phẩm từ từ, không vội được.',
  'Người có nghề đi đâu cũng có việc, không lo đói.',
  'Điểm tài nguyên ở đây mỗi ngày chỉ lấy được có hạn.',
  'Sư phụ dạy nghề ở làng, học xong rồi hãy qua đây làm việc.',
  'Nghề phụ không bắt buộc nhưng ai tinh ý thì nhờ nó mà khá lên nhiều.',
];
// Hương vị riêng theo map nghề (nhận diện bằng từ khóa trong mapId)
const PROF_FLAVOR: Array<[RegExp, string[]]> = [
  [/duoc|thao/, [
    'Bụi thuốc ở đây mọc theo linh mạch, tìm được mạch là tìm được thuốc.',
    'Hái thuốc thì nhẹ tay thôi, giật mạnh là nát cả bụi.',
    'Thảo dược tốt phải phơi đủ nắng mới giữ được dược tính.',
  ]],
  [/thiet|khoang|quang/, [
    'Mạch quặng ở đây sâu, đào nông thì chỉ được quặng vụn.',
    'Đào mỏ thì nhớ mang đèn, dưới sâu tối lắm.',
    'Quặng tốt rèn ra đồ tốt, thợ rèn nào cũng dặn vậy.',
  ]],
  [/dan|lo/, [
    'Lò đan ở đây lửa lúc nào cũng cháy, đừng tới gần mà bỏng.',
    'Chế đan thì lửa phải đều, lửa to lửa nhỏ đều hỏng.',
    'Mùi thuốc ở đây thơm cả một vùng, ngửi quen thì nghiện.',
  ]],
  [/thu|son_trang|vien/, [
    'Thú ở đây nhiều nhưng đừng chọc ổ của chúng.',
    'Thuần thú thì phải kiên nhẫn, vội là nó chạy mất.',
    'Nghe tiếng thú kêu mà đoán được loài, đó mới là thợ giỏi.',
  ]],
  [/tran|ky_mon|bat_quai/, [
    'Trận đồ ở đây vẽ theo địa thế, đứng sai vị là lạc.',
    'Trận pháp không phải để ngắm — đi qua mà không hiểu thì đừng đi.',
    'Người bố trận giỏi thì nhìn đá xếp cũng biết trận gì.',
  ]],
  [/phu|chu_van|but_mac/, [
    'Giấy bùa ở đây làm từ vỏ cây đặc biệt, mực cũng khác.',
    'Vẽ bùa thì tâm phải tĩnh, tay run là hỏng lá bùa.',
    'Bùa tốt thì người thường cũng dùng được, nhưng đừng lạm dụng.',
  ]],
];
const AMBIENT_WILD: string[] = [
  'Chỗ này hoang vắng thật, đi một mình phải cẩn thận.',
  'Quái ở đây không dễ chọc đâu, yếu thì đừng tới gần.',
  'Đi farm thì đi theo nhóm, đừng đi lẻ.',
  'Nghe nói map mạnh thì boss cũng mạnh theo, liệu sức mà đi.',
];

function roleKeyOf(role: string): string {
  if (role.includes('Sứ Giả')) return 'envoy';
  if (role === 'Chủ Tiệm Đan') return 'shopdan';
  if (role === 'Chủ Tiệm Nguyên Liệu') return 'shopnl';
  if (role === 'Chủ Tiệm Thảo Dược') return 'shopthao';
  if (role.includes('Thương nhân') || role.includes('Thương Gia')) return 'merchant';
  if (role.startsWith('Trưởng') || role === 'Lão Tổ Về Hưu') return 'elder';
  return '';
}

export function npcTalkLines(ctx: NpcTalkCtx): string[] {
  if (BY_ID[ctx.id]) return BY_ID[ctx.id];
  const rk = roleKeyOf(ctx.role);
  if (rk && ROLE[rk]) return ROLE[rk];
  if (ctx.isHome) return AMBIENT_VILLAGE;
  if (ctx.category === 'city') return AMBIENT_CITY;
  if (ctx.category === 'profession') {
    for (const [re, lines] of PROF_FLAVOR) if (re.test(ctx.mapId)) return lines;
    return AMBIENT_PROF;
  }
  return AMBIENT_WILD;
}
