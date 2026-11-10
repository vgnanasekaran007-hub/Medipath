import cors from 'cors';
import express, { type Express, type NextFunction, type Request, type Response } from 'express';
import helmet from 'helmet';
import { env } from './config/env.js';
import { createAdminRouter } from './routes/admin.js';
import { createAuthRouter } from './routes/auth.js';
import { createPatientRouter } from './routes/patient.js';
import { createPublicRouter } from './routes/public.js';
import type { MediPathStore } from './services/index.js';

export function createApp(store: MediPathStore): Express {
  const app = express();
  const startedAt = Date.now();

  app.set('trust proxy', 1);

  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin) {
          callback(null, true);
          return;
        }
        if (env.corsOrigins.includes('*') || env.corsOrigins.includes(origin)) {
          callback(null, true);
          return;
        }
        if (
          env.nodeEnv !== 'production' &&
          /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)
        ) {
          callback(null, true);
          return;
        }
        callback(new Error(`Origin ${origin} not allowed by CORS`));
      },
      credentials: true,
    }),
  );

  app.use(express.json({ limit: '5mb' }));

  app.get('/api/health', async (_req, res, next) => {
    try {
      const versions = await store.getMapVersions();
      const active = versions.find((v) => v.status === 'published') ?? versions[0];
      res.json({
        status: 'ok',
        service: 'medipath-api',
        persistenceMode: store.mode,
        mapVersion: active?.versionNumber ?? 1,
        mapVersionLabel: active?.label ?? 'v1.0',
        uptimeSeconds: Math.round((Date.now() - startedAt) / 1000),
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      next(err);
    }
  });

  app.use('/api/auth', createAuthRouter(store));
  app.use('/api/admin', createAdminRouter(store));
  app.use('/api', createPublicRouter(store));
  app.use('/api', createPatientRouter(store));

  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'API endpoint not found' });
  });

  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.message?.includes('CORS') ? 403 : 500;
    if (env.nodeEnv !== 'test') {
      console.error('[MEDIPATH API ERROR]', err);
    }
    res.status(status).json({
      error: status === 500 ? err.message || 'Internal server error' : err.message,
    });
  });

  return app;
}

