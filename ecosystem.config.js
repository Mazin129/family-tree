// pm2 ecosystem — reads env vars from .env at startup
// Usage: pm2 start ecosystem.config.js
const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '.env') })

module.exports = {
  apps: [
    {
      name: 'heritage',
      script: path.join(__dirname, '.next/standalone/server.js'),
      cwd: path.join(__dirname, '.next/standalone'),
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      // Prevent PM2 from giving up after rapid successive crashes:
      // wait at least 10 s of uptime before marking the process "stable"
      min_uptime: '10s',
      // Exponential backoff on restarts (100ms → 200 → 400 → … up to 16 s)
      exp_backoff_restart_delay: 100,
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        HOSTNAME: '0.0.0.0',

        // ── Auth ──────────────────────────────────────────────────────
        NEXTAUTH_URL: process.env.NEXTAUTH_URL,
        NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
        NEXTAUTH_URL_INTERNAL: 'http://127.0.0.1:3000',

        // ── Google OAuth ──────────────────────────────────────────────
        GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
        GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,

        // ── Outbound proxy (sandbox / restricted network environments) ─
        // Passed so the app can route OAuth token-exchange through the
        // egress proxy.  Empty string on plain VPS deployments → no-op.
        HTTPS_PROXY: process.env.HTTPS_PROXY || '',
        HTTP_PROXY:  process.env.HTTP_PROXY  || '',
        // Preserve NO_PROXY but strip Google from it so the app can
        // reach Google's OAuth token endpoint through the proxy above.
        NO_PROXY: (process.env.NO_PROXY || '')
          .split(',')
          .filter(h => !h.includes('google'))
          .join(','),

        // ── Database ──────────────────────────────────────────────────
        DATABASE_URL: process.env.DATABASE_URL,
        NEO4J_URI: process.env.NEO4J_URI,
        NEO4J_USERNAME: process.env.NEO4J_USERNAME,
        NEO4J_PASSWORD: process.env.NEO4J_PASSWORD,

        // ── Redis ─────────────────────────────────────────────────────
        REDIS_URL: process.env.REDIS_URL,
        REDIS_PASSWORD: process.env.REDIS_PASSWORD,

        // ── AI Service ────────────────────────────────────────────────
        AI_SERVICE_URL: process.env.AI_SERVICE_URL,
        AI_SERVICE_API_KEY: process.env.AI_SERVICE_API_KEY,

        // ── Public vars ───────────────────────────────────────────────
        NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
        NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
        NEXT_PUBLIC_CDN_URL: process.env.NEXT_PUBLIC_CDN_URL,
      },
    },
  ],
}
