import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [react()],
    optimizeDeps: {
        include: ['@novnc/novnc'],
        esbuildOptions: {
            resolveExtensions: ['.js', '.mjs', '.jsx']
        }
    },
    resolve: {
        extensions: ['.js', '.mjs', '.jsx', '.json']
    },
    server: {
        port: 3001,
        host: true,
        allowedHosts: [
            'localhost',
            '127.0.0.1',
            'UFOMUM-AbdulA.ufomoviez.com',
            'ufomum-abdula.ufomoviez.com',
            '10.73.77.58',
            '192.168.86.22',
            '192.168.86.152'
        ],
        proxy: {
            '/api': {
                target: 'http://backend:3000',
                changeOrigin: true
            }
        }
    },
    build: {
        outDir: 'dist',
        assetsDir: 'assets',
        sourcemap: false,
        commonjsOptions: {
            include: [/node_modules/],
            transformMixedEsModules: true
        },
        rollupOptions: {
            output: {
                manualChunks: {
                    vendor: ['react', 'react-dom', 'react-router-dom'],
                    charts: ['recharts']
                }
            }
        }
    }
});

