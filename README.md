# GymConnect Backend

Backend API for **GymConnect**, a multi-tenant gym management platform (modular monolith).
Node.js · TypeScript (strict) · Express 5 · PostgreSQL · Prisma 7 · Zod · Pino · Swagger · Vitest.

> **Status: Phase 1 (foundation).** Health endpoint, middleware, Swagger and tests only. No
> authentication or business modules yet.

## Requirements

- Node.js **22+** (`.nvmrc` is provided)
- PostgreSQL 16 (via Docker or Homebrew, see below)

## Run on macOS (Terminal)

### 1. Install tools (once)

```bash
# Homebrew (skip if `brew --version` already works)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Node 22 (either of these)
brew install node@22 && brew link --overwrite --force node@22
# or: brew install nvm  (then follow its shell setup)  &&  nvm install   # reads .nvmrc

node -v   # should print v22.x
```

### 2. Start PostgreSQL

**Option A - Docker Desktop** (install from docker.com, open it once, then):

```bash
cp .env.example .env          # see step 3 first: set POSTGRES_PASSWORD before starting
docker compose up -d
docker compose exec postgres createdb -U gymconnect gymconnect_test   # database for tests
```

**Option B - Homebrew PostgreSQL**

```bash
brew install postgresql@16
brew services start postgresql@16
export PATH="$(brew --prefix postgresql@16)/bin:$PATH"

psql postgres -c "CREATE ROLE gymconnect LOGIN CREATEDB PASSWORD 'choose-a-password';"
createdb -O gymconnect gymconnect
createdb -O gymconnect gymconnect_test
```

### 3. Configure environment

```bash
cp .env.example .env
openssl rand -hex 32     # run twice; use one value for each JWT secret
open -e .env             # edit: JWT_ACCESS_SECRET, JWT_REFRESH_SECRET and the DB password
```

The password inside `DATABASE_URL` must match `POSTGRES_PASSWORD` (Docker) or the role password
(Homebrew). `.env` is git-ignored; never commit it. Optionally add `TEST_DATABASE_URL` pointing at
`gymconnect_test` so the database tests run.

### 4. Install and start

```bash
npm install        # also runs `prisma generate`
npm run dev        # http://localhost:4000, restarts on file changes
```

### 5. Try it

```bash
curl -i http://localhost:4000/api/v1/health
open http://localhost:4000/api-docs
```

Expected health response (HTTP 200, or 503 with `"status":"degraded"` when the database is down):

```json
{
  "data": {
    "status": "ok",
    "database": "up",
    "version": "0.1.0",
    "timestamp": "2026-11-17T05:30:00.000Z"
  }
}
```

## Scripts

| Command                           | Purpose                                             |
| --------------------------------- | --------------------------------------------------- |
| `npm run dev`                     | Development server with reload (tsx + pretty logs)  |
| `npm run build`                   | `prisma generate` + compile to `dist/`              |
| `npm start`                       | Run the compiled build (`NODE_ENV=production`)      |
| `npm run typecheck`               | `tsc --noEmit`                                      |
| `npm run lint` / `lint:fix`       | ESLint (type-aware)                                 |
| `npm run format` / `format:check` | Prettier                                            |
| `npm test` / `npm run test:watch` | Vitest + Supertest                                  |
| `npm run check`                   | typecheck + lint + format check + tests             |
| `npm run db:migrate`              | `prisma migrate dev` (create/apply migrations, dev) |
| `npm run db:deploy`               | `prisma migrate deploy` (apply migrations, CI/prod) |
| `npm run db:status` / `db:studio` | Migration status / Prisma Studio                    |

## Testing

```bash
npm test
```

- Tests **never** use `DATABASE_URL`. They use `TEST_DATABASE_URL` or a dummy URL, so they cannot
  touch development data.
- Without a reachable test database, the real-database tests **skip**. Set `REQUIRE_DB_TESTS=true`
  (do this in CI) to make a missing database fail the run instead.

## Project structure

```
prisma/                 schema.prisma, migrations/
prisma.config.ts        Prisma CLI config
src/
  app.ts                builds the Express app (no listen) - used by server and tests
  server.ts             HTTP entrypoint, graceful shutdown
  config/               env (Zod-validated), logger, database, cors, openapi, swagger
  middlewares/          requestLogger, notFound, errorHandler, validate, rateLimiter
  modules/              one folder per business module (routes, controller, service,
                        repository*, validation, types)  *only where useful
    health/
    index.ts            mounts module routers under /api/v1
  integrations/         third-party adapters (payments, SMS, push) - empty for now
  utils/                AppError classes, zod (OpenAPI-enabled)
  types/                shared API response types
  generated/            Prisma client (git-ignored, created by `prisma generate`)
tests/                  unit/, integration/, helpers.ts
```

## Conventions

- ESM + `NodeNext`: relative imports end in `.js` (`import { x } from './x.js'`), even in `.ts` files.
- Import `z` from `src/utils/zod.js` so schemas can also generate Swagger docs.
- Errors: throw an `AppError` subclass; never build error responses by hand.
- Success: `{ "data": ..., "meta": ... }`. Error: `{ "error": { code, message, details?, requestId } }`.
- UUID primary keys, UTC timestamps, money as integer paise (see comments in `schema.prisma`).
- Use `.strict()` on request schemas so unknown fields (e.g. a client-sent `gymId`) are rejected.

## Troubleshooting

- **`Invalid environment configuration`** on start: the message lists the variables to fix.
- **`Database is not reachable`**: PostgreSQL is not running, or `DATABASE_URL` is wrong.
  `/api/v1/health` returns 503 until it is fixed.
- **Port in use**: change `PORT` in `.env`, or find the process with `lsof -i :4000`.
- **Production**: `API_DOCS_ENABLED` defaults to `false`; set `TRUST_PROXY` to the number of reverse
  proxies in front of the app, otherwise rate limiting sees the proxy's IP for every client.
