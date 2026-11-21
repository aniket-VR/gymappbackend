import { checkDatabaseConnection, disconnectDatabase } from './config/database.js';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { createApp } from './app.js';

const SHUTDOWN_TIMEOUT_MS = 10_000;

const app = createApp();

const server = app.listen(env.PORT, () => {
  logger.info(`GymConnect API listening on port ${env.PORT} (${env.NODE_ENV})`);
  if (env.apiDocsEnabled) {
    logger.info(`API docs available at http://localhost:${env.PORT}/api-docs`);
  }

  // Report database status at boot, but keep serving: /api/v1/health reports "degraded".
  void checkDatabaseConnection().then((up) => {
    if (up) logger.info('Database connection OK');
    else
      logger.warn('Database is not reachable - check DATABASE_URL and that PostgreSQL is running');
  });
});

let shuttingDown = false;

function shutdown(reason: string, exitCode = 0): void {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info({ reason }, 'Shutting down');

  // Force exit if connections refuse to drain.
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, SHUTDOWN_TIMEOUT_MS).unref();

  server.close((closeError) => {
    if (closeError) logger.error({ err: closeError }, 'Error while closing HTTP server');
    disconnectDatabase()
      .catch((error: unknown) => logger.error({ err: error }, 'Error while closing database'))
      .finally(() => process.exit(closeError ? 1 : exitCode));
  });
}

process.on('SIGTERM', () => {
  shutdown('SIGTERM');
});
process.on('SIGINT', () => {
  shutdown('SIGINT');
});
process.on('unhandledRejection', (reason) => {
  logger.fatal({ err: reason }, 'Unhandled promise rejection');
  shutdown('unhandledRejection', 1);
});
process.on('uncaughtException', (error) => {
  logger.fatal({ err: error }, 'Uncaught exception');
  shutdown('uncaughtException', 1);
});

server.on('error', (error: NodeJS.ErrnoException) => {
  logger.fatal(
    { err: error },
    error.code === 'EADDRINUSE' ? `Port ${env.PORT} is already in use` : 'Server error',
  );
  process.exit(1);
});
