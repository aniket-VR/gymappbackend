import { config as loadDotenv } from 'dotenv';
import { defineConfig } from 'vitest/config';

// Lets a developer keep TEST_DATABASE_URL in their untracked .env file.
loadDotenv({ quiet: true });

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    // Tests NEVER read the development DATABASE_URL, so they cannot touch development data.
    // They use TEST_DATABASE_URL when set; otherwise a dummy URL, in which case tests that need
    // a real database skip themselves.
    env: {
      NODE_ENV: 'test',
      LOG_LEVEL: 'silent',
      PORT: '4999',
      DATABASE_URL:
        process.env['TEST_DATABASE_URL'] ??
        'postgresql://test_user:test_password@localhost:5432/gymconnect_test',
      JWT_ACCESS_SECRET: 'test-access-secret-0123456789abcdef0123456789',
      JWT_REFRESH_SECRET: 'test-refresh-secret-0123456789abcdef012345678',
      FRONTEND_ORIGINS: 'http://localhost:3000,http://localhost:5173',
      RATE_LIMIT_MAX: '1000',
      API_DOCS_ENABLED: 'true',
      TRUST_PROXY: '0',
    },
  },
});
