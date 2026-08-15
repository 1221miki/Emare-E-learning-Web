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
            host: '192.168.8.100',  // HMR client connects back to correct network IP (not localhost)
            overlay: false,
        },
    },
    build: {
        // Split into separate chunks so the browser only downloads what each page needs
        rollupOptions: {
            output: {
                manualChunks: {
                    // Core React runtime — cached separately, never changes
                    'react-vendor':   ['react', 'react-dom', 'react-router-dom'],
                    // Heavy charting library — only loaded on analytics/dashboard pages
                    'recharts':       ['recharts'],
                    // Icon libraries — loaded once and cached
                    'icons':          ['lucide-react', 'react-icons'],
                    // HTTP client
                    'axios':          ['axios'],
                }
            }
        },
        // Increase warning threshold to avoid noise; real splitting is handled above
        chunkSizeWarningLimit: 800,
        // Target modern browsers for smaller output
        target: 'es2020',
        // Minify for production
        minify: 'esbuild',
        sourcemap: false,
    }
})
