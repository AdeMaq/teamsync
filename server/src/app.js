import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import { env } from './config/env.js';
import logger from './config/logger.js';
import { UPLOADS_URL_PREFIX, uploadsDir } from './config/paths.js';
import apiRouter from './routes/index.js';
import { errorHandler, notFoundHandler } from './core/middleware/error.middleware.js';

const app = express();

app.use(helmet());
app.use(cors({ origin: env.CLIENT_URL, credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());
app.use(
  morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev', {
    stream: { write: (message) => logger.http(message.trim()) },
  })
);

// Uploaded files (avatars). helmet's default is Cross-Origin-Resource-Policy: same-origin, which would
// block the React app (another origin) from showing these images, so it is relaxed for this path only.
app.use(
  UPLOADS_URL_PREFIX,
  (_req, res, next) => {
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    next();
  },
  express.static(uploadsDir, { index: false, dotfiles: 'deny', maxAge: '7d', immutable: true })
);

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.use('/api/v1', apiRouter);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
