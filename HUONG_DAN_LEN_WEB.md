# ĐƯA GAME LÊN WEB — bạn bè chỉ mở link là chơi (Render.com, miễn phí)

Cách này đưa server game lên hosting Render: máy nhà **không cần chạy**,
bạn bè ở bất cứ đâu mở link `https://...onrender.com` là vào game.
Toàn bộ chuẩn bị ~15–20 phút, chỉ làm 1 lần.

> Lưu ý trước: itch.io và các trang đăng game web thông thường chỉ chứa
> game **tĩnh** (không chạy được server riêng) nên không dùng cho bản
> MMO này. Render thì chạy được nguyên server Node của game.

## Bước 1 — Tài khoản GitHub

1. Vào `github.com`, bấm **Sign up**, tạo tài khoản (email + mật khẩu).
2. Xong thì tải **GitHub Desktop** tại `desktop.github.com`, cài và
   đăng nhập bằng tài khoản vừa tạo.

## Bước 2 — Đưa code lên GitHub bằng GitHub Desktop

1. Giải nén file zip game ra một thư mục (ví dụ `D:\Game\tap-tanh-tu-tien-mmo`).
   Trong thư mục phải thấy sẵn 2 file `render.yaml` và `.gitignore`
   (đã chuẩn bị sẵn trong zip — đừng xóa).
2. Mở GitHub Desktop → menu **File → Add local repository...** → chọn
   thư mục game → nếu nó báo "this directory does not appear to be a
   Git repository" thì bấm **create a repository** → **Create repository**.
3. Bấm nút **Publish repository** ở thanh trên. Để nguyên các ô mặc
   định (giữ **Private** cũng được). Chờ nó đẩy xong (vài chục giây —
   file `node_modules` và dữ liệu nhân vật cá nhân đã được `.gitignore`
   loại ra nên repo rất nhẹ).

## Bước 3 — Tạo Web Service trên Render

1. Vào `render.com` → **Get Started** → đăng nhập **bằng GitHub**
   (nút "GitHub") — cách này cho Render thấy repo của bạn.
2. Vào Dashboard → **New → Web Service** → chọn repo
   `tap-tanh-tu-tien-mmo` vừa đẩy → **Connect**.
3. Render tự đọc file `render.yaml` nên các ô Build Command / Start
   Command / biến môi trường đã điền sẵn — kiểm tra nhanh:
   - Name: `tap-tanh-tu-tien` (nếu bị báo trùng tên, thêm số phía sau,
     ví dụ `tap-tanh-tu-tien-2026` — link web sẽ theo tên này)
   - Instance Type: **Free**
4. Bấm **Create Web Service** và chờ trạng thái chuyển thành **Live**
   (lần đầu khoảng 2–5 phút).
5. Link game của bạn hiện ở đầu trang, dạng
   `https://tap-tanh-tu-tien.onrender.com` — **gửi link này cho bạn bè**.

## Đã cài sẵn cho buổi test

Trong `render.yaml` đã đặt sẵn chế độ test nhanh giống chạy ở nhà:
1 ngày game = 10 phút thật (`TTT_DAY_REAL_MS=600000`) và đột phá nhanh
(`TTT_TUVI_NEED=5`). Muốn chuyển về nhịp chơi thật: vào Render →
service của bạn → **Environment** → xóa 2 biến đó → nó tự khởi động lại.

## Giới hạn bản miễn phí — biết trước để khỏi bất ngờ

- **Server ngủ sau ~15 phút không có ai vào.** Người vào đầu tiên sau
  khi nó ngủ sẽ chờ khoảng 1 phút cho server thức dậy (trang quay lâu
  là bình thường, đừng tưởng lỗi). Đang có người chơi thì không ngủ.
- **Dữ liệu nhân vật nằm trên đĩa tạm** — ĐÃ CÓ THUỐC ở Phần 2 bên
  dưới (gắn MongoDB Atlas free): làm xong phần đó thì restart/deploy
  bao nhiêu lần cũng không mất nhân vật. Chưa làm Phần 2 thì dữ liệu
  mất khi Render khởi động lại hoặc deploy lại — với buổi test 1 tối
  thì vẫn ổn, đừng bấm Manual Deploy / restart giữa buổi chơi.
- Băng thông miễn phí của workspace khá ít (khoảng 5 GB/tháng) — đủ
  cho các buổi test vài người bạn, nhưng đừng đăng link công khai cho
  người lạ vào xem, kẻo hết băng thông là bị treo tới tháng sau.
  Đây cũng là lý do Render free chỉ hợp làm chỗ test/demo: lên cỡ
  100 người chơi thường xuyên thì nên dời về máy nhà hoặc VPS
  (xem HUONG_DAN_TEST.md) — dữ liệu ở Atlas thì dời đâu cũng mang
  theo được nguyên vẹn.

## Cập nhật bản mới sau này

Mỗi khi có bản game mới: giải nén đè vào thư mục cũ → mở GitHub
Desktop → nó hiện danh sách file thay đổi → ghi vài chữ vào ô
"Summary" → **Commit to main** → **Push origin**. Render thấy code
mới sẽ tự deploy lại sau ~2–5 phút (link giữ nguyên).

---

# PHẦN 2 — Gắn kho lưu trữ cloud (MongoDB Atlas, free, không cần thẻ)

Làm phần này (khoảng 10 phút, 1 lần duy nhất) thì dữ liệu nhân vật
sống **độc lập với Render**: restart, deploy lại, thậm chí sau này
dời game sang máy khác, chỉ cần cắm cùng 1 chuỗi kết nối là dữ liệu
đi theo. Atlas free cho 512 MB — dữ liệu game này vài trăm người
chơi cũng chỉ vài MB.

1. Vào `mongodb.com/atlas` → **Try Free** → đăng ký (dùng Google
   hoặc email đều được, không hỏi thẻ).
2. Tạo cụm miễn phí: chọn **M0 / Free** → vùng máy chủ chọn
   **Singapore** → **Create**.
3. Tạo người dùng database: mục **Database Access → Add New Database
   User** → đặt tên + mật khẩu (ghi lại mật khẩu này — bước 5 cần).
4. Mở cửa cho server Render nối vào: mục **Network Access → Add IP
   Address → Allow Access from Anywhere** (`0.0.0.0/0`) → Confirm.
5. Lấy chuỗi kết nối: mục **Database → Connect → Drivers** → chép
   dòng `mongodb+srv://...` → thay `<password>` trong chuỗi bằng mật
   khẩu ở bước 3.
6. Dán vào Render: mở service game → **Environment → Add Environment
   Variable** → Key: `MONGODB_URI`, Value: chuỗi vừa chép → **Save**
   → Render tự khởi động lại.
7. **Kiểm tra đã ăn chưa**: mở link `<link-game>/api/status` — thấy
   `"storage":"mongodb"` là thành công. Còn `"storage":"file"` nghĩa
   là chuỗi chưa đúng, kiểm tra lại mật khẩu trong chuỗi.
   (Chuỗi kết nối chứa mật khẩu database — chỉ dán vào trang Render
   như trên, đừng gửi vào chat hay để trong code.)

# PHẦN 3 — Chống ngủ 24/7 (cron-job.org, free)

Render free ngủ sau 15 phút vắng người. Một dịch vụ ping miễn phí
sẽ gọi vào link game mỗi 10 phút để giữ nó **thức 24/7**: mỗi tháng
Render cho 750 giờ chạy, một tháng tối đa 744 giờ — vừa đủ cho 1
dịch vụ thức liên tục (đây là cách dùng mà chính Render cũng tính
trước), và người chơi vào lúc nào cũng gặp server đang thức.

1. Vào `cron-job.org` → đăng ký tài khoản free (không cần thẻ).
2. **Create cronjob**: URL = link game của bạn + `/api/status`
   (ví dụ `https://tap-tanh-tu-tien.onrender.com/api/status`).
3. Lịch chạy: mỗi **10 phút**, mọi giờ trong ngày.
4. Save. Xong — server không ngủ nữa.

Lưu ý thật về giới hạn còn lại: **băng thông free ~5 GB/tháng**.
Ước tính với nhịp chơi vài chục người mỗi buổi tối, 5 GB dùng được
khoảng 1–3 tuần chơi đều — hết là Render tạm dừng tới tháng sau
(không mất dữ liệu vì dữ liệu nằm ở Atlas theo Phần 2). Khi chạm
mốc đó tức là game đã đông — lúc ấy dời sang VPS trong nước
(~150k/tháng, trả chuyển khoản) là êm: dữ liệu Atlas mang theo,
code đã có trên GitHub, nửa buổi là xong.
