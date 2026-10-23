#!/usr/bin/env bash
# Cài đặt server Tập Tành Tu Tiên trên Oracle Cloud Always Free
# (Ubuntu ARM — chạy bằng user ubuntu, từ thư mục home)
# Cách dùng: chép file này lên máy ảo rồi chạy:  bash oracle-install.sh [địa-chỉ-repo-github]
set -e

REPO_URL="${1:-}"
GAME_DIR="$HOME/tap-tanh-tu-tien-mmo"

echo "== 1. Cài Node.js 20 + git =="
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs git

echo "== 2. Lấy mã nguồn game =="
if [ ! -d "$GAME_DIR" ]; then
  if [ -n "$REPO_URL" ]; then
    git clone "$REPO_URL" "$GAME_DIR"
  else
    echo "Chưa có thư mục game và chưa cho địa chỉ repo."
    echo "Hãy chạy lại kèm repo GitHub, ví dụ:"
    echo "  bash oracle-install.sh https://github.com/<ten-ban>/tap-tanh-tu-tien-mmo.git"
    exit 1
  fi
fi
cd "$GAME_DIR"
npm run install:all

echo "== 3. Mở cổng 3001 trong tường lửa của Ubuntu (OCI chặn sẵn) =="
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 3001 -j ACCEPT || true
if command -v netfilter-persistent >/dev/null 2>&1; then sudo netfilter-persistent save || true; fi

echo "== 4. Tạo dịch vụ chạy nền (tự khởi động lại khi máy restart) =="
sudo tee /etc/systemd/system/taptien.service > /dev/null << UNIT
[Unit]
Description=Tap Tanh Tu Tien — MMO server
After=network.target

[Service]
WorkingDirectory=$GAME_DIR
ExecStart=/usr/bin/node server/index.js
Restart=always
Environment=PORT=3001
User=$USER

[Install]
WantedBy=multi-user.target
UNIT
# Muốn bật chế độ test nhanh thì bỏ dấu # ở 2 dòng Environment TTT_*
# trong file /etc/systemd/system/taptien.service rồi chạy:
#   sudo systemctl daemon-reload && sudo systemctl restart taptien
sudo systemctl daemon-reload
sudo systemctl enable --now taptien
sleep 2
systemctl --no-pager status taptien | head -n 6 || true

echo ""
echo "XONG PHẦN TRONG MÁY. Còn 1 bước ở trang web Oracle:"
echo "  OCI Console → máy ảo của bạn → Subnet → Security List →"
echo "  Add Ingress Rule: Source 0.0.0.0/0, TCP, cổng 3001"
echo "Sau đó vào:  http://<IP-công-khai-của-máy>:3001"
