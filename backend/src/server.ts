import { app } from './app';
import { env } from './config/env';

const server = app.listen(env.PORT, () => {
  console.log(`[MULYANKAN] Academic Evaluation Server running on port ${env.PORT} (${env.NODE_ENV})`);
  console.log(`[MULYANKAN] Health check available at: http://localhost:${env.PORT}/api/health`);
});

process.on('SIGTERM', () => {
  console.log('[MULYANKAN] Gracefully shutting down server...');
  server.close(() => {
    process.exit(0);
  });
});
