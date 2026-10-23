#!/usr/bin/env bash
# Cập nhật game lên bản mới nhất — chạy trên VPS (trong thư mục game,
# bản Docker): kéo code mới → dựng lại image → khởi động lại container.
# Dữ liệu người chơi nằm ở volume taptien-data nên cập nhật không mất.
# Cách dùng:  bash deploy/update.sh
set -e
cd "$(dirname "$0")/.."

echo "== Kéo code mới =="
git pull

echo "== Dựng lại image =="
docker build -t taptien .

echo "== Đồng bộ dữ liệu game (gdd + danh mục công pháp) vào volume =="
docker run --rm -v taptien-data:/data -v "$PWD/server/data":/src:ro taptien \
  sh -c "cp -r /src/gdd /data/ 2>/dev/null; cp /src/skills_catalog.json /data/ 2>/dev/null; true"

echo "== Khởi động lại container =="
docker rm -f taptien 2>/dev/null || true
docker run -d --name taptien --restart unless-stopped \
  -p 3001:3001 \
  -v taptien-data:/app/server/data \
  taptien

sleep 2
docker ps --filter name=taptien --format "{{.Names}}: {{.Status}}"
echo "Xong — game đã lên bản mới."
