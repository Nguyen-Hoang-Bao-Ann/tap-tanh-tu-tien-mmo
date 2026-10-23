import { defineConfig } from 'vite';

// Client dev server: cổng 5173 (mặc định của Vite), mở host để xem Preview
export default defineConfig({
  server: {
    port: 5173,
    host: true,
  },
});
