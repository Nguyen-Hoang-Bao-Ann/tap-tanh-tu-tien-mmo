// GĐ390: KHUNG CHỌN SERVER — bảng tĩnh trong repo.
//
// Thêm server sau chỉ thêm 1 dòng vào SERVERS (không sửa khung, không sửa
// luồng). Xóa/tắt server = đổi `status` thành 'maintenance' (không xóa dòng —
// người chơi cũ còn nhân vật ở đó cần thấy lý do, xem THIET_KE_..._THONGBAO.md §1.5).
// Tên server theo kiểu "Tinh Túc Mệnh 1, 2, 3…" — số tăng dần theo thứ tự mở.
export interface ServerEntry {
  id: string;
  /** Tên hiển thị, vd "Tinh Túc Mệnh 1". */
  name: string;
  /** Origin của server đó. '' = cùng origin (server live hiện tại); server
   * mới sau này ghi URL đầy đủ, vd 'https://sv2.example.com'. */
  origin: string;
  /** Trạng thái cấu hình. Mặc định online. 'maintenance' = bảo trì (khóa nút
   * vào + hiện lý do/giờ mở lại) — bật/tắt bằng tay ở đây + đăng tin bảo trì. */
  status?: 'online' | 'maintenance';
  /** Sức chứa server (TẠM: chưa đặt số cho server nào — chưa có số để chốt
   * ngưỡng "Đông". Có số rồi thì online ≥ 80% sức chứa = "Đông"). */
  capacity?: number;
  /** Lý do bảo trì (chỉ dùng khi status = 'maintenance'). */
  maintReason?: string;
  /** Giờ mở lại (chỉ dùng khi status = 'maintenance'), vd '20:00 12/11'. */
  maintUntil?: string;
}

// GĐ390 giai đoạn 1: chỉ 1 server — server live hiện tại.
export const SERVERS: ServerEntry[] = [
  { id: 'tinh-tuc-menh-1', name: 'Tinh Túc Mệnh 1', origin: '' },
];

// Lựa chọn server được nhớ ở localStorage (mở game lần sau vào thẳng server đã chọn).
export const SERVER_CHOICE_KEY = 'ttt_server_v1';
