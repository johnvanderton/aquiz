import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  server: {
    	host: '0.0.0.0',
    	port: 5173,
    	strictPort: true,
	allowedHosts: ['limac'],
    // En développement, les appels /api sont transmis au serveur Express.
    proxy: {
      '/api': {
        target: `http://localhost:${process.env.PORT || 4000}`,
        changeOrigin: false
      }
    }
  }
})
