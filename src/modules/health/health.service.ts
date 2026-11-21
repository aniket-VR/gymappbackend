import { appInfo } from '../../config/app-info.js';
import { checkDatabaseConnection } from '../../config/database.js';
import type { HealthData } from './health.types.js';

export async function getHealth(): Promise<HealthData> {
  const databaseUp = await checkDatabaseConnection();

  return {
    status: databaseUp ? 'ok' : 'degraded',
    database: databaseUp ? 'up' : 'down',
    version: appInfo.version,
    timestamp: new Date().toISOString(),
  };
}
