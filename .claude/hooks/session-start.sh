#!/bin/bash
# SessionStart hook — auto-starts the Next.js server in Claude Code cloud sessions.
# Runs every time a session starts; is safe to run multiple times (idempotent).
# NOTE: This container does not use systemd — PM2 is the process manager.
set -euo pipefail

# Only run in Claude Code remote (cloud) environment
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

PROJECT=/home/user/family-tree

echo "[session-start] Ensuring Next.js server is running..."

# ── 0. Ensure PostgreSQL is running ─────────────────────────────────────────
if ! pg_ctlcluster 16 main status > /dev/null 2>&1; then
  echo "[session-start] PostgreSQL not running — starting..."
  pg_ctlcluster 16 main start || true
  sleep 2
  echo "[session-start] PostgreSQL started."
else
  echo "[session-start] PostgreSQL already running."
fi

# ── 1. Ensure standalone static assets are in place ─────────────────────────
# next build with output:standalone omits .next/static and public — copy them in.
if [ -d "$PROJECT/.next/static" ] && [ -d "$PROJECT/.next/standalone" ]; then
  cp -r "$PROJECT/.next/static"  "$PROJECT/.next/standalone/.next/static"  2>/dev/null || true
  cp -r "$PROJECT/public"        "$PROJECT/.next/standalone/public"         2>/dev/null || true
  echo "[session-start] Static assets synced to standalone dir."
fi

# ── 2. Short-circuit if already healthy ─────────────────────────────────────
if curl -s --max-time 3 http://127.0.0.1:3000/ > /dev/null 2>&1; then
  echo "[session-start] Server already running on port 3000 — nothing to do."
  exit 0
fi

echo "[session-start] Server not responding — ensuring PM2 starts it..."

cd "$PROJECT"

# Load .env so ecosystem.config.js can read env vars
if [ -f "$PROJECT/.env" ]; then
  set -a
  # shellcheck disable=SC1090
  source "$PROJECT/.env"
  set +a
fi

# ── 3. Determine PM2 state and act accordingly ───────────────────────────────
if pm2 list 2>/dev/null | grep -q "heritage"; then
  # Process is registered — force restart with latest env and config
  echo "[session-start] heritage registered in PM2 but not responding — restarting..."
  pm2 restart ecosystem.config.js --update-env
else
  # Not registered at all — fresh start
  echo "[session-start] Starting heritage via PM2..."
  pm2 start ecosystem.config.js
fi

pm2 save --force

# ── 4. Wait up to 30 s for the server to respond ────────────────────────────
echo "[session-start] Waiting for server to become ready..."
for i in $(seq 1 30); do
  if curl -s --max-time 2 http://127.0.0.1:3000/ > /dev/null 2>&1; then
    echo "[session-start] Server ready after ${i}s."
    exit 0
  fi
  sleep 1
done

echo "[session-start] WARNING: server did not respond within 30 s — check PM2 logs."
pm2 logs heritage --lines 20 --nostream || true
exit 0
