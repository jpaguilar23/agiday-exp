import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/',
  define: {
    'import.meta.env.VITE_API_URL': JSON.stringify('https://sitema-gestion-backend.onrender.com')
  }
})