// Test GĐ10: tài khoản đăng ký/đăng nhập + danh sách nhân vật + chọn nhân vật
// + tùy chỉnh màu áo. Chạy với server test riêng:
// PORT=3005 TTT_CHAR_FILE=/tmp/chars-test10.json TTT_ACC_FILE=/tmp/acc-test10.json node server/index.js
const { io } = require('socket.io-client');
const URL = process.env.TEST_URL || 'http://localhost:3005';
let pass = 0, fail = 0;
const ok = (cond, label) => { if (cond) { pass++; console.log('  PASS', label); } else { fail++; console.log('  FAIL', label); } };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function connect() {
  return new Promise((resolve) => {
    const s = io(URL, { transports: ['websocket'] });
    s.on('connect', () => resolve(s));
  });
}
function waitEvent(s, ev, timeout = 4000) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('timeout chờ ' + ev)), timeout);
    s.once(ev, (d) => { clearTimeout(t); resolve(d); });
  });
}

(async () => {
  const USER = 'dao_huu_' + Date.now().toString(36);
  // 1) Đăng ký → auth_result + char_list rỗng
  const s1 = await connect();
  const regP = waitEvent(s1, 'auth_result');
  const listP = waitEvent(s1, 'char_list');
  s1.emit('auth_register', { username: USER, password: 'matkhau123' });
  const reg = await regP;
  ok(!!reg.session && reg.username === USER, 'đăng ký trả session + username');
  const list0 = await listP;
  ok(Array.isArray(list0.characters) && list0.characters.length === 0 && list0.maxChars === 3, 'char_list rỗng, maxChars=3');
  const session = reg.session;

  // 2) Đăng ký trùng tên → auth_error
  const s2 = await connect();
  const errP = waitEvent(s2, 'auth_error');
  s2.emit('auth_register', { username: USER, password: 'khac123456' });
  const err = await errP;
  ok(/đã có người dùng/.test(err.message), 'đăng ký trùng bị từ chối');
  s2.disconnect();

  // 3) Tạo nhân vật trong chế độ tài khoản (kèm giới tính + màu áo)
  s1.emit('request_roll');
  await waitEvent(s1, 'roll_result');
  const welP = waitEvent(s1, 'welcome');
  s1.emit('create_character', { name: 'Tiểu Đạo Hữu', classId: 'kiemtu', gender: 'nu', robe: '#e8a0a0' });
  const wel = await welP;
  ok(wel.character.name === 'Tiểu Đạo Hữu' && wel.character.gender === 'nu' && wel.character.robe === '#e8a0a0', 'welcome có gender + robe đã chọn');
  ok(wel.character.account === USER.toLowerCase(), 'welcome gắn account');

  // 4) Đổi màu áo trong game → char_sync cập nhật; màu sai bị bỏ qua
  const syncP = waitEvent(s1, 'char_sync');
  s1.emit('set_robe', { robe: '#a3d9a5' });
  const sync = await syncP;
  ok(sync.robe === '#a3d9a5', 'set_robe hợp lệ → char_sync robe mới');
  let sync2 = null;
  s1.once('char_sync', (d) => { sync2 = d; });
  s1.emit('set_robe', { robe: '#000000' });
  await sleep(400);
  ok(sync2 === null, 'set_robe màu ngoài danh sách bị bỏ qua');
  s1.disconnect();
  await sleep(300);

  // 5) Đăng nhập sai mật khẩu → auth_error; đúng → char_list có 1 nhân vật
  const s3 = await connect();
  const err2P = waitEvent(s3, 'auth_error');
  s3.emit('auth_login', { username: USER, password: 'sai_mat_khau' });
  ok(/Sai tên tài khoản hoặc mật khẩu/.test((await err2P).message), 'đăng nhập sai mật khẩu bị từ chối');
  const loginP = waitEvent(s3, 'auth_result');
  const list2P = waitEvent(s3, 'char_list');
  s3.emit('auth_login', { username: USER, password: 'matkhau123' });
  await loginP;
  const list2 = await list2P;
  ok(list2.characters.length === 1 && list2.characters[0].name === 'Tiểu Đạo Hữu' && list2.characters[0].robe === '#a3d9a5', 'char_list sau đăng nhập: 1 nhân vật, robe đã lưu');
  const charId = list2.characters[0].charId;

  // 6) Chọn nhân vật → welcome (robe giữ nguyên)
  const wel2P = waitEvent(s3, 'welcome');
  s3.emit('select_character', { charId });
  const wel2 = await wel2P;
  ok(wel2.character.robe === '#a3d9a5' && wel2.character.name === 'Tiểu Đạo Hữu', 'select_character vào game đúng nhân vật');
  s3.disconnect();
  await sleep(300);

  // 7) hello bằng session (mô phỏng tải lại trang) → char_list; session sai → auth_expired
  const s4 = await connect();
  const list3P = waitEvent(s4, 'char_list');
  s4.emit('hello', { session });
  ok((await list3P).characters.length === 1, 'hello {session} khôi phục danh sách nhân vật');
  // 8) Xóa nhân vật → char_list rỗng
  const list4P = waitEvent(s4, 'char_list');
  s4.emit('delete_character', { charId });
  ok((await list4P).characters.length === 0, 'delete_character xóa nhân vật');
  s4.disconnect();
  const s5 = await connect();
  const expP = waitEvent(s5, 'auth_expired');
  s5.emit('hello', { session: 'deadbeef'.repeat(6) });
  await expP;
  ok(true, 'session không hợp lệ → auth_expired');
  s5.disconnect();

  console.log(`\nKẾT QUẢ: ${pass} PASS / ${fail} FAIL`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error('LỖI TEST:', e.message); process.exit(1); });
