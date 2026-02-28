# Production database setup

If you see **"The table `public.InviteToken` does not exist"** (or other missing tables), the production database schema is out of sync with `prisma/schema.prisma`.

## Option A: Prisma Migrate (if you have migrations)

```bash
cd ~/family-tree
export $(grep -v '^#' .env | xargs)   # load .env so DATABASE_URL is set
npx prisma migrate deploy
```

## Option B: Prisma DB Push (no migration history — syncs schema to DB)

Use when you don't use migration files and just want the DB to match the schema:

```bash
cd ~/family-tree
export $(grep -v '^#' .env | xargs)
npx prisma db push
```

This creates missing tables (e.g. `InviteToken`) and updates columns. **Warning:** In production, prefer `migrate deploy` if you have migrations; `db push` can cause data loss if you remove columns.

## After running

Restart the app so it uses the updated schema:

```bash
pm2 restart heritage --update-env
```

## Neo4j errors in logs

If you see **"Neo4j createPerson failed: Failed to connect to server"**, the app is trying to reach Neo4j (e.g. `bolt://localhost:7687`) but Neo4j is not running or not reachable on the server. Options:

- Start Neo4j on the server (Docker or native), or  
- Use a hosted Neo4j (e.g. [Neo4j Aura](https://neo4j.com/cloud/aura/)) and set `NEO4J_URI` in `.env` to the Aura connection string.

The app will still work for most features without Neo4j; family tree visualization may fall back to PostgreSQL-only data.
