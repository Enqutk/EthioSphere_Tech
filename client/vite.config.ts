import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function firebaseMessagingSwPlugin() {
  const writeSw = (mode: string, outDir?: string) => {
    const env = loadEnv(mode, __dirname, '');
    const src = path.resolve(__dirname, 'public/firebase-messaging-sw.js');
    let content = fs.readFileSync(src, 'utf8');
    const replacements: Record<string, string> = {
      __VITE_FIREBASE_API_KEY__: env.VITE_FIREBASE_API_KEY || '',
      __VITE_FIREBASE_AUTH_DOMAIN__:
        env.VITE_FIREBASE_AUTH_DOMAIN ||
        (env.VITE_FIREBASE_PROJECT_ID ? `${env.VITE_FIREBASE_PROJECT_ID}.firebaseapp.com` : ''),
      __VITE_FIREBASE_PROJECT_ID__: env.VITE_FIREBASE_PROJECT_ID || '',
      __VITE_FIREBASE_MESSAGING_SENDER_ID__: env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
      __VITE_FIREBASE_APP_ID__: env.VITE_FIREBASE_APP_ID || '',
    };
    for (const [key, value] of Object.entries(replacements)) {
      content = content.split(key).join(value);
    }
    if (outDir) {
      fs.writeFileSync(path.resolve(outDir, 'firebase-messaging-sw.js'), content);
    }
    return content;
  };

  return {
    name: 'firebase-messaging-sw',
    configureServer(server: import('vite').ViteDevServer) {
      server.middlewares.use((req, res, next) => {
        if (req.url?.startsWith('/firebase-messaging-sw.js')) {
          const body = writeSw(server.config.mode);
          res.setHeader('Content-Type', 'application/javascript');
          res.end(body);
          return;
        }
        next();
      });
    },
    closeBundle() {
      const outDir = path.resolve(__dirname, 'dist');
      if (fs.existsSync(outDir)) writeSw(process.env.NODE_ENV === 'production' ? 'production' : 'development', outDir);
    },
  };
}

export default defineConfig(({ mode }) => ({
  plugins: [react(), firebaseMessagingSwPlugin()],
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: process.env.VITE_API_URL || 'http://localhost:4000',
        changeOrigin: true,
        proxyTimeout: 25_000,
        configure(proxy) {
          proxy.on('proxyReq', (proxyReq, req) => {
            const auth = req.headers.authorization;
            if (auth) proxyReq.setHeader('Authorization', auth);
          });
        },
      },
      '/socket.io': {
        target: process.env.VITE_API_URL || 'http://localhost:4000',
        changeOrigin: true,
        ws: true,
      },
    },
  },
}));
