import http from 'http';
import app from './app.js';
import { connectDB } from './config/db.js';
import { env } from './config/env.js';
import logger from './config/logger.js';

const startServer = async () => {
  await connectDB();

  const server = http.createServer(app);

  server.listen(env.PORT, () => {
    logger.info(`Server running on port ${env.PORT} [${env.NODE_ENV}]`);
  });
};

startServer();