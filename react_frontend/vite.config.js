import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/react_frontend/dist',
  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3003',
        changeOrigin: true
      }
    }
  }
})
