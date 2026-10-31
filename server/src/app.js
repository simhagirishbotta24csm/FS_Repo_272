import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import postRoutes from './routes/posts.js';
import commentRoutes from './routes/comments.js';
import { UPLOAD_DIR } from './middleware/upload.js';
import { notFound, errorHandler } from './middleware/error.js';

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  if (process.env.VERCEL) app.set('trust proxy', 1);

  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      contentSecurityPolicy: {
        useDefaults: true,
        directives: {
          'style-src': ["'self'", 'https:', "'unsafe-inline'"],
          'font-src': ["'self'", 'https:', 'data:'],
          'img-src': ["'self'", 'data:', 'blob:', 'https:'],
        },
      },
    })
  );
  app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173' }));
  app.use(express.json({ limit: '100kb' }));
  if (process.env.NODE_ENV !== 'test') app.use(morgan('dev'));

  app.get('/api/health', (req, res) => res.json({ ok: true }));
  app.use('/api/auth', authRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/posts', postRoutes);
  app.use('/api/comments', commentRoutes);
  app.use('/uploads', express.static(UPLOAD_DIR, { maxAge: '7d', immutable: true }));

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
