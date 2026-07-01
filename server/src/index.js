import 'dotenv/config';
import { createApp } from './app.js';
import { config } from './config/index.js';

const app = createApp();

app.listen(config.port, () => {
  console.log(`Programmers World API running at http://localhost:${config.port}`);
});
