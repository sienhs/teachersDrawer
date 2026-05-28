import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),  // Tailwind 플러그인 추가
  ],
  server: {
    port: 5173,
    // 백엔드 API 프록시 설정
    // /api 로 시작하는 요청을 백엔드로 자동으로 넘겨줌
    // 개발 중에 CORS 없이도 통신 가능
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      }
    }
  }
})