import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
    plugins: [
        react({
            include: ['**/*.{js,jsx,ts,tsx}'],
            // AdminDashboard.jsx exceeds Babel's 500KB generator limit, which
            // spams the "[BABEL] Note: The code generator has deoptimised…"
            // warning on every dev start. Vite's built-in esbuild compiles
            // this file instead (JSX is fully supported) — the only trade-off
            // is full-page reload instead of fast-refresh when editing it.
            exclude: ['**/AdminDashboard.jsx'],
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
        // Proxy API calls to the backend so the app works on ANY network IP
        // (the backend is always reached via localhost on this machine).
        proxy: {
            '/api': {
                // Use the literal IPv4 loopback address. "localhost" can resolve to ::1
                // (IPv6), but the backend historically bound 0.0.0.0 (IPv4-only) — that
                // mismatch made the proxy return an unreadable 500 to the React app.
                target: 'http://127.0.0.1:5000',
                changeOrigin: true,
            },
        },
        hmr: {
            overlay: false,
        },
    },
    build: {
        outDir: 'dist',  // Explicitly output to client/dist
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
