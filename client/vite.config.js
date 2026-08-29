import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
var __dirname = path.dirname(fileURLToPath(import.meta.url));
function firebaseMessagingSwPlugin() {
    var writeSw = function (mode, outDir) {
        var env = loadEnv(mode, __dirname, '');
        var src = path.resolve(__dirname, 'public/firebase-messaging-sw.js');
        var content = fs.readFileSync(src, 'utf8');
        var replacements = {
            __VITE_FIREBASE_API_KEY__: env.VITE_FIREBASE_API_KEY || '',
            __VITE_FIREBASE_AUTH_DOMAIN__: env.VITE_FIREBASE_AUTH_DOMAIN ||
                (env.VITE_FIREBASE_PROJECT_ID ? "".concat(env.VITE_FIREBASE_PROJECT_ID, ".firebaseapp.com") : ''),
            __VITE_FIREBASE_PROJECT_ID__: env.VITE_FIREBASE_PROJECT_ID || '',
            __VITE_FIREBASE_MESSAGING_SENDER_ID__: env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
            __VITE_FIREBASE_APP_ID__: env.VITE_FIREBASE_APP_ID || '',
        };
        for (var _i = 0, _a = Object.entries(replacements); _i < _a.length; _i++) {
            var _b = _a[_i], key = _b[0], value = _b[1];
            content = content.split(key).join(value);
        }
        if (outDir) {
            fs.writeFileSync(path.resolve(outDir, 'firebase-messaging-sw.js'), content);
        }
        return content;
    };
    return {
        name: 'firebase-messaging-sw',
        configureServer: function (server) {
            server.middlewares.use(function (req, res, next) {
                var _a;
                if ((_a = req.url) === null || _a === void 0 ? void 0 : _a.startsWith('/firebase-messaging-sw.js')) {
                    var body = writeSw(server.config.mode);
                    res.setHeader('Content-Type', 'application/javascript');
                    res.end(body);
                    return;
                }
                next();
            });
        },
        closeBundle: function () {
            var outDir = path.resolve(__dirname, 'dist');
            if (fs.existsSync(outDir))
                writeSw(process.env.NODE_ENV === 'production' ? 'production' : 'development', outDir);
        },
    };
}
export default defineConfig(function (_a) {
    var mode = _a.mode;
    var env = loadEnv(mode, __dirname, '');
    var apiTarget = env.VITE_API_BASE_URL || env.VITE_API_URL || process.env.VITE_API_URL || 'http://localhost:4000';
    return ({
        plugins: [react(), firebaseMessagingSwPlugin()],
        resolve: {
            alias: { '@': path.resolve(__dirname, 'src') },
        },
        server: {
            port: 3000,
            proxy: {
                '/api': {
                    target: apiTarget,
                    changeOrigin: true,
                    proxyTimeout: 25000,
                    configure: function (proxy) {
                        proxy.on('proxyReq', function (proxyReq, req) {
                            var auth = req.headers.authorization;
                            if (auth)
                                proxyReq.setHeader('Authorization', auth);
                        });
                    },
                },
                '/socket.io': {
                    target: apiTarget,
                    changeOrigin: true,
                    ws: true,
                },
            },
        },
    });
});
