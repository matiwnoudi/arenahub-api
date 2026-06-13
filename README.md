# ArenaHub API

ArenaHub API is a multiplayer game backend portfolio project built with NestJS, TypeScript, PostgreSQL, Prisma, Redis, JWT auth, WebSockets, Docker Compose, Swagger, and Jest.

This repository is being built in small daily milestones. Each day should leave the project runnable and ready for a small GitHub commit.

## Day 1 Milestone

Small task: initialize the NestJS API foundation with Prisma, PostgreSQL through Docker Compose, environment validation, and a basic health check endpoint.

Files created or edited:

- `package.json`
- `nest-cli.json`
- `tsconfig.json`
- `tsconfig.build.json`
- `.gitignore`
- `.env.example`
- `docker-compose.yml`
- `prisma/schema.prisma`
- `src/main.ts`
- `src/app.module.ts`
- `src/config/env.validation.ts`
- `src/prisma/prisma.module.ts`
- `src/prisma/prisma.service.ts`
- `src/health/health.module.ts`
- `src/health/health.controller.ts`
- `src/health/health.service.ts`
- `src/health/health.controller.spec.ts`
- `README.md`

Working at the end of Day 1:

- The API starts as a NestJS app.
- PostgreSQL can run locally with Docker Compose.
- Prisma is configured for PostgreSQL.
- Environment variables are validated on startup.
- `GET /api/health` returns the service health status.
- A Jest unit test covers the health endpoint behavior.

Suggested commit message:

```bash
chore: initialize NestJS API with Prisma and Postgres
```

## Local Setup

Prerequisites:

- Node.js 22 or newer
- npm
- Docker Desktop

Install dependencies:

```bash
npm install
```

Create a local environment file:

```powershell
Copy-Item .env.example .env
```

Start PostgreSQL:

```bash
npm run db:up
```

Generate the Prisma client:

```bash
npm run prisma:generate
```

Start the API in development mode:

```bash
npm run start:dev
```

Check the health endpoint:

```bash
curl http://localhost:3000/api/health
```

Expected response shape:

```json
{
  "status": "ok",
  "service": "ArenaHub API",
  "timestamp": "2026-06-13T00:00:00.000Z",
  "uptime": 1.23
}
```

## Database

The local PostgreSQL connection string is defined in `.env.example`:

```env
DATABASE_URL="postgresql://arenahub:arenahub_password@localhost:5432/arenahub?schema=public"
```

Docker Compose creates a local database named `arenahub` with the `arenahub` user.

Useful database commands:

```bash
npm run db:up
npm run db:logs
npm run db:down
npm run prisma:generate
npm run prisma:migrate -- --name init
npm run prisma:studio
```

## Testing

Run the unit tests:

```bash
npm test
```

Run a production build:

```bash
npm run build
```

## Current Scope

Day 1 intentionally does not include auth, players, matches, Redis, leaderboards, matchmaking, achievements, seasons, admin features, WebSockets, or Swagger yet. Those will be added in later daily milestones.
