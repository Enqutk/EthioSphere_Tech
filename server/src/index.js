import 'dotenv/config';
import http from 'http';
import { createApp } from './app.js';
import { config } from './config/index.js';
import { attachSocketIo } from './realtime/socket.js';
import { grandfatherLegacyEmailVerification } from './lib/emailVerification.js';

const app = createApp();
const server = http.createServer(app);
attachSocketIo(server);

server.listen(config.port, () => {
  console.log(`Programmers World API running at http://localhost:${config.port}`);
  void grandfatherLegacyEmailVerification();
});
