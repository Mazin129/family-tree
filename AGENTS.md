# AGENTS.md

## Cursor Cloud specific instructions

### Architecture Overview
This is a **Sudanese Heritage Platform** — a Next.js 14 (App Router) + TypeScript web app with a Python FastAPI AI microservice. It uses a dual-database architecture: PostgreSQL (via Prisma ORM) for relational data and Neo4j for family tree graph relationships, with Redis for caching/sessions.

### Services

| Service | Port | How to start |
|---------|------|-------------|
| PostgreSQL, Neo4j, Redis | 5432, 7474/7687, 6379 | `sudo docker compose up -d postgres neo4j redis` |
| Next.js web app (dev) | 3000 | `npm run dev` |
| AI service (dev) | 8001 | `cd ai-service && source .venv/bin/activate && ENVIRONMENT=development uvicorn main:app --reload --port 8001` |

### Key Commands
- **Lint**: `npm run lint`
- **Build**: `npm run build`
- **Dev server**: `npm run dev`
- **DB migrate**: `npx prisma migrate dev`
- **DB seed**: `npm run db:seed`
- **AI service dev**: `npm run ai:dev` (or the manual command above)
- See `package.json` for the full list of npm scripts.

### Non-obvious Notes

- **Docker daemon must be started manually**: Run `sudo dockerd &>/tmp/dockerd.log &` before `docker compose up`. The VM snapshot preserves Docker installation but not the running daemon.
- **Docker requires sudo**: Docker commands need `sudo` in this environment. Use `sudo docker compose ...`.
- **ESLint config**: The project needs `.eslintrc.json` with `{"extends": "next/core-web-vitals"}` — without it, `next lint` enters an interactive prompt that blocks CI.
- **`.env` file**: Copy `.env.example` to `.env` before running. The `NEXTAUTH_SECRET` must be set to a real value (not the placeholder). All database connection strings use default Docker Compose credentials.
- **Neo4j takes ~30-60s to become healthy** on first start due to APOC plugin installation. Wait for `docker compose ps` to show `(healthy)` before running the app.
- **Python AI service venv**: Located at `ai-service/.venv`. Activate with `source ai-service/.venv/bin/activate`. The AI service has local fallbacks so the Next.js app works without it running.
- **Demo credentials**: `demo@example.com` / `Demo@123!` (regular user) and `admin@sudaneseheritagе.com` / `Admin@123!` (admin). These are seeded by `npm run db:seed`.
- **Health endpoints**: Next.js at `GET /api/health`, AI service at `GET /api/v1/health`.
- **Prisma migrations**: The `prisma/migrations/` directory is gitignored by default after initial setup. Run `npx prisma migrate dev` to apply schema to a fresh database.
