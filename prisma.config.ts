import 'dotenv/config';
import { defineConfig } from 'prisma/config';

// Prisma CLI configuration. The runtime application connects through the pg driver adapter
// (see src/config/database.ts); this file only tells the CLI where the schema, migrations and
// database live.
//
// `prisma generate` does not need a database, so a missing DATABASE_URL must not break
// `npm install` or `npm run build` (for example in CI or Docker build stages).
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations' },
  datasource: {
    url: process.env['DATABASE_URL'] ?? '',
  },
});
