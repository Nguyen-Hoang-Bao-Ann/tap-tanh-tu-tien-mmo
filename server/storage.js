// ============================================================
// Lớp lưu trữ — 2 chế độ:
// 1) Không đặt biến MONGODB_URI: mọi hàm ở đây là no-op, server
//    lưu bằng file JSON tại chỗ như trước giờ (mặc định).
// 2) Có MONGODB_URI (MongoDB Atlas bản free): tài khoản/nhân vật/
//    đồng hồ thế giới được lưu thêm lên cloud, và khi khởi động sẽ
//    lấy từ cloud xuống TRƯỚC khi mở cổng. Lợi ích:
//    - Đưa game lên host có đĩa tạm thời (Render...) không mất dữ
//      liệu mỗi lần restart/deploy.
//    - Chạy ở máy nhà thì cloud đóng vai trò bản sao lưu tự động:
//      máy hỏng vẫn còn dữ liệu trên Atlas.
//    Cloud trống + file có dữ liệu → tự đẩy file lên (chuyển nhà
//    1 bước). Mongo lỗi/hỏng → server vẫn chạy bằng file, không sập.
// Dữ liệu nằm ở collection "ttt_kv": mỗi mục 1 document
// {_id: 'characters' | 'accounts' | 'world', data: {...}}.
// ============================================================

let col = null;
let ready = false;
const pending = new Map(); // tên -> bản dữ liệu mới nhất chờ ghi
let flushing = false;

async function init() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.log('[storage] Chế độ FILE tại chỗ (chưa đặt MONGODB_URI).');
    return false;
  }
  try {
    const { MongoClient } = require('mongodb');
    const client = new MongoClient(uri, { serverSelectionTimeoutMS: 8000 });
    await client.connect();
    col = client.db().collection('ttt_kv');
    ready = true;
    console.log('[storage] Đã nối MongoDB — dữ liệu chính ở cloud.');
    return true;
  } catch (e) {
    console.warn('[storage] Không nối được MongoDB (' + e.message + ') — chạy bằng FILE tại chỗ.');
    col = null;
    ready = false;
    return false;
  }
}

// Trả về: data nếu có document; null nếu cloud CHƯA có mục này;
// undefined nếu không dùng cloud hoặc đọc lỗi.
async function loadDoc(name) {
  if (!ready) return undefined;
  try {
    const d = await col.findOne({ _id: name });
    return d ? d.data : null;
  } catch (e) {
    console.warn('[storage] Đọc Mongo lỗi (' + name + '):', e.message);
    return undefined;
  }
}

// Ghi gộp (chống dồn dập): nhiều lần gọi liên tiếp chỉ ghi bản mới
// nhất, trễ tối đa ~0,8 giây; không chặn luồng game, lỗi chỉ cảnh báo.
function saveDoc(name, data) {
  if (!ready) return;
  try {
    pending.set(name, JSON.parse(JSON.stringify(data)));
  } catch {
    return; // dữ liệu không tuần tự hóa được thì bỏ qua lần này
  }
  if (!flushing) {
    flushing = true;
    setTimeout(flush, 800);
  }
}

async function flush() {
  try {
    while (pending.size) {
      const [name, data] = pending.entries().next().value;
      pending.delete(name);
      await col.replaceOne(
        { _id: name },
        { _id: name, data, updatedAt: new Date() },
        { upsert: true }
      );
    }
  } catch (e) {
    console.warn('[storage] Ghi Mongo lỗi:', e.message);
  }
  flushing = false;
  if (pending.size) {
    flushing = true;
    setTimeout(flush, 2000);
  }
}

function mode() {
  return ready ? 'mongodb' : 'file';
}

module.exports = { init, loadDoc, saveDoc, mode };
