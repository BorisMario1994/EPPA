import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: undefined,
      },
    },
  },  
  server: {
    host: '0.0.0.0', // allows access from any IP
    port: 5173       // or any port you're using
  }
})


