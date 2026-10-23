# Đóng gói game thành 1 image chạy giống hệt ở mọi máy chủ (VPS trong
# nước, Oracle, máy nhà...) — đổi host không đổi cách chạy.
# Build:  docker build -t taptien .
# Chạy:   docker run -d --name taptien -p 3001:3001 -v taptien-data:/app/server/data taptien
FROM node:20-bookworm-slim
WORKDIR /app
# Cài thư viện server trước (tận dụng cache của Docker khi code thay đổi)
COPY server/package.json server/package-lock.json ./server/
RUN npm --prefix server install --omit=dev
# Phần còn lại: server + bản dựng sẵn của client
COPY server ./server
COPY client/dist ./client/dist
ENV PORT=3001
EXPOSE 3001
CMD ["node", "server/index.js"]
