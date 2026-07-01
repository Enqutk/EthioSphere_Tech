import 'dotenv/config';
import app from '../app.js';
import { config } from './config/index.js';

app.listen(config.port, () => {
  console.log(`Programmers World API running at http://localhost:${config.port}`);
});
