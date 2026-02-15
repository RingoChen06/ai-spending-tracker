import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // We use '/api' as a proxy prefix.
      // Any request starting with '/api' will be forwarded.
      '/api': {
        target: 'http://127.0.0.1:5001', // Local Flask backend server's address
        changeOrigin: true, // Recommended for virtual hosted sites
        rewrite: (path) => path.replace(/^\/api/, ''), // Removes '/api' from the forwarded request
      },
    }
  }
})