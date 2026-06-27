import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    port: 3000
  },
  build: {
    target: 'es2020',
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            // 무거운 xlsx는 별도 청크(엑셀 내보내기 페이지에서만 로드)
            if (id.includes('xlsx')) return 'xlsx';
            // react/router/socket/axios 등 잘 안 바뀌는 코어는 vendor로 묶어 캐싱
            return 'vendor';
          }
        }
      }
    }
  }
})
