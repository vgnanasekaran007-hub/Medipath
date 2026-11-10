import { createApp } from './app.js';
import { env } from './config/env.js';
import { createStore } from './services/index.js';

async function bootstrap() {
  const store = createStore();
  await store.init();

  const app = createApp(store);
  const server = app.listen(env.port, () => {
    console.log(
      `[MEDIPATH] API listening on http://localhost:${env.port} (mode=${store.mode}, env=${env.nodeEnv})`,
    );
  });

  const shutdown = (signal: string) => {
    console.log(`[MEDIPATH] Received ${signal}, shutting down gracefully...`);
    server.close(() => {
      process.exit(0);
    });
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

bootstrap().catch((err) => {
  console.error('[MEDIPATH] Failed to start API server:', err);
  process.exit(1);
});

