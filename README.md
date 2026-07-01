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

## Day 2 Milestone

Small task: add the authentication foundation with users, roles, password hashing, access tokens, refresh token storage, and auth endpoints.

Files created or edited:

- `.env.example`
- `package.json`
- `package-lock.json`
- `prisma/schema.prisma`
- `prisma/migrations/20260613000100_add_auth_foundation/migration.sql`
- `src/app.module.ts`
- `src/config/env.validation.ts`
- `src/auth/auth.module.ts`
- `src/auth/auth.controller.ts`
- `src/auth/auth.service.ts`
- `src/auth/auth.service.spec.ts`
- `src/auth/dto/register.dto.ts`
- `src/auth/dto/login.dto.ts`
- `src/auth/dto/auth-response.dto.ts`
- `src/auth/dto/refresh-token.dto.ts`
- `src/auth/guards/jwt-auth.guard.ts`
- `src/auth/strategies/jwt.strategy.ts`
- `src/auth/types/jwt-payload.type.ts`
- `README.md`

Working at the end of Day 2:

- `User` and `RefreshToken` models exist in Prisma.
- Users can register and log in with hashed passwords.
- Access and refresh tokens are generated with JWT.
- Refresh tokens are stored as SHA-256 hashes.
- Refreshing a token rotates the refresh token.
- Logout revokes a stored refresh token.
- `USER` and `ADMIN` roles are available.
- Jest covers register and login service logic.

Suggested commit message:

```bash
feat: add authentication foundation
```

## Day 3 Milestone

Small task: add the player profile foundation on top of JWT auth.

Files created or edited:

- `prisma/schema.prisma`
- `prisma/migrations/20260702000100_add_player_profile_fields/migration.sql`
- `package.json`
- `package-lock.json`
- `src/app.module.ts`
- `src/common/decorators/current-user.decorator.ts`
- `src/players/players.module.ts`
- `src/players/players.controller.ts`
- `src/players/players.service.ts`
- `src/players/players.service.spec.ts`
- `src/players/dto/player-profile.dto.ts`
- `src/players/dto/update-profile.dto.ts`
- `src/auth/auth.service.spec.ts`
- `README.md`

Working at the end of Day 3:

- Player profile fields exist on `User`: avatar, level, XP, rank, wins, and losses.
- `Rank` enum exists with `BRONZE`, `SILVER`, `GOLD`, `PLATINUM`, `DIAMOND`, and `MASTER`.
- Authenticated users can view their own profile.
- Authenticated users can update username, email, and avatar URL.
- Duplicate email or username updates return a conflict error.
- Jest covers profile read/update service logic.
- Runtime dependency audit is kept clean with a patched `multer` override.

Suggested commit message:

```bash
feat: add player profile foundation
```

## Day 4 Milestone

Small task: add the match foundation with authenticated create, join, view, and start workflows.

Files created or edited:

- `prisma/schema.prisma`
- `prisma/migrations/20260702000200_add_match_foundation/migration.sql`
- `src/app.module.ts`
- `src/matches/matches.module.ts`
- `src/matches/matches.controller.ts`
- `src/matches/matches.service.ts`
- `src/matches/matches.service.spec.ts`
- `src/matches/dto/create-match.dto.ts`
- `src/matches/dto/match-response.dto.ts`
- `README.md`

Working at the end of Day 4:

- `MatchMode` enum exists with `DUEL`, `TEAM_2V2`, and `FREE_FOR_ALL`.
- `MatchStatus` enum starts with `WAITING`, `IN_PROGRESS`, `FINISHED`, and `CANCELLED`.
- Authenticated users can create a match and become the first participant.
- Authenticated users can join waiting matches.
- Match creators can start matches when enough players have joined.
- Duplicate joins, full matches, and unauthorized starts are handled cleanly.
- Jest covers core match create/join/start service logic.

Suggested commit message:

```bash
feat: add match foundation
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

The Day 2 auth settings in `.env.example` are safe local placeholders. Use strong unique secrets outside local development.

Start PostgreSQL:

```bash
npm run db:up
```

Generate the Prisma client:

```bash
npm run prisma:generate
```

Run database migrations:

```bash
npm run prisma:migrate -- --name add_match_foundation
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

## Authentication

Register:

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"player@example.com\",\"username\":\"ArenaPlayer\",\"password\":\"StrongPass123\"}"
```

Login:

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"player@example.com\",\"password\":\"StrongPass123\"}"
```

Refresh:

```bash
curl -X POST http://localhost:3000/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d "{\"refreshToken\":\"paste-refresh-token-here\"}"
```

Logout:

```bash
curl -X POST http://localhost:3000/api/auth/logout \
  -H "Content-Type: application/json" \
  -d "{\"refreshToken\":\"paste-refresh-token-here\"}"
```

## Player Profile

Profile endpoints require a JWT access token from register or login.

Get current profile:

```bash
curl http://localhost:3000/api/players/me \
  -H "Authorization: Bearer paste-access-token-here"
```

Update current profile:

```bash
curl -X PATCH http://localhost:3000/api/players/me \
  -H "Authorization: Bearer paste-access-token-here" \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"ArenaHero\",\"avatar\":\"https://example.com/avatar.png\"}"
```

## Matches

Match endpoints require a JWT access token from register or login.

Create a duel:

```bash
curl -X POST http://localhost:3000/api/matches \
  -H "Authorization: Bearer paste-access-token-here" \
  -H "Content-Type: application/json" \
  -d "{\"mode\":\"DUEL\"}"
```

View a match:

```bash
curl http://localhost:3000/api/matches/paste-match-id-here \
  -H "Authorization: Bearer paste-access-token-here"
```

Join a match:

```bash
curl -X POST http://localhost:3000/api/matches/paste-match-id-here/join \
  -H "Authorization: Bearer paste-access-token-here"
```

Start a match:

```bash
curl -X POST http://localhost:3000/api/matches/paste-match-id-here/start \
  -H "Authorization: Bearer paste-access-token-here"
```

## Database

The local PostgreSQL and auth settings are defined in `.env.example`:

```env
DATABASE_URL="postgresql://arenahub:arenahub_password@localhost:5432/arenahub?schema=public"
JWT_ACCESS_TOKEN_SECRET="change-me-access-secret-for-local-dev-only"
JWT_REFRESH_TOKEN_SECRET="change-me-refresh-secret-for-local-dev-only"
JWT_ACCESS_TOKEN_TTL="15m"
JWT_REFRESH_TOKEN_TTL="7d"
BCRYPT_SALT_ROUNDS=12
```

Docker Compose creates a local database named `arenahub` with the `arenahub` user.

Useful database commands:

```bash
npm run db:up
npm run db:logs
npm run db:down
npm run prisma:generate
npm run prisma:migrate -- --name add_match_foundation
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

The current project includes the NestJS foundation, Prisma/PostgreSQL setup, a health endpoint, authentication foundation, player profile foundation, and match foundation.

Match results, Redis, leaderboards, matchmaking, achievements, seasons, admin features, WebSockets, and Swagger are still intentionally out of scope. Those will be added in later daily milestones.
