import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
var __dirname = path.dirname(fileURLToPath(import.meta.url));
export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: { '@': path.resolve(__dirname, 'src') },
    },
    server: {
        port: 3000,
        proxy: {
            '/api': {
                target: process.env.VITE_API_URL || 'http://localhost:4000',
                changeOrigin: true,
                /** Outgoing request to the API — fail before the default ~120s hang (Neon cold, API down). */
                proxyTimeout: 25000,
                configure: function (proxy) {
                    proxy.on('proxyReq', function (proxyReq, req) {
                        var auth = req.headers.authorization;
                        if (auth)
                            proxyReq.setHeader('Authorization', auth);
                    });
                },
            },
        },
    },
});
