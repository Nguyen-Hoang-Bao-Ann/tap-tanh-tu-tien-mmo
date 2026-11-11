// ============================================================
// GĐ375 (đợt 1): lớp vỏ PWA — đăng ký Service Worker + gợi ý cài
// game như ứng dụng trên điện thoại. Chỉ chạm lớp vỏ, KHÔNG đụng
// logic game. Khối gợi ý cài nằm ở màn hình chờ (index.html:
// #installHint) và chỉ hiện đúng ngữ cảnh:
// - Android/Chrome: bắt beforeinstallprompt → hiện nút "Cài game
//   như ứng dụng", bấm mới gọi hộp thoại cài của trình duyệt.
// - iOS Safari: không có sự kiện đó → hiện dòng hướng dẫn Chia sẻ
//   → Thêm vào Màn hình chính.
// - Đã chạy dạng standalone (đã cài) thì không hiện gì cả.
// ============================================================

// Đăng ký SW chỉ ở bản production (dev không có /sw.js hoàn chỉnh
// trong dist và không cần cache). Lỗi đăng ký thì bỏ qua lặng lẽ —
// game vẫn chơi bình thường như trước.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => { /* không sao: chơi qua trình duyệt như cũ */ });
  });
}

function isStandalone(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches
    || (navigator as unknown as { standalone?: boolean }).standalone === true;
}

function isIos(): boolean {
  const ua = navigator.userAgent || '';
  return /iphone|ipad|ipod/i.test(ua)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1); // iPadOS giả dạng Mac
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: string }>;
}

function setupInstallHint(): void {
  if (isStandalone()) return; // đã cài rồi — không gợi ý nữa
  const wrap = document.getElementById('installHint');
  const btn = document.getElementById('btnInstallApp');
  const iosHint = document.getElementById('iosInstallHint');
  if (!wrap || !btn || !iosHint) return;

  let deferred: BeforeInstallPromptEvent | null = null;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferred = e as BeforeInstallPromptEvent;
    wrap.style.display = 'block';
    btn.style.display = 'block';
    iosHint.style.display = 'none';
  });
  btn.addEventListener('click', () => {
    if (!deferred) return;
    const d = deferred;
    deferred = null;
    d.prompt().then(() => d.userChoice).then(() => {
      wrap.style.display = 'none'; // dù cài hay hủy, ẩn gợi ý cho phiên này
    }).catch(() => { /* bỏ qua */ });
  });
  window.addEventListener('appinstalled', () => { wrap.style.display = 'none'; });

  // iOS: chỉ hiện hướng dẫn khi đang ở Safari chưa standalone.
  const isSafari = /safari/i.test(navigator.userAgent || '') && !/crios|fxios/i.test(navigator.userAgent || '');
  if (isIos() && isSafari) {
    wrap.style.display = 'block';
    iosHint.style.display = 'block';
  }
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', setupInstallHint);
else setupInstallHint();
