import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    react({
      include: ['**/*.{js,jsx,ts,tsx}'],
    }),
  ],
  esbuild: {
    loader: 'jsx',
  },
  optimizeDeps: {
    esbuildOptions: {
      loader: {
        '.js': 'jsx',
        '.jsx': 'jsx',
      },
    },
  },
  server: {
    host: '0.0.0.0',   // accept connections from phone/other devices on the network
    port: 5173,
    hmr: {
      overlay: false,
    },
  },
})
