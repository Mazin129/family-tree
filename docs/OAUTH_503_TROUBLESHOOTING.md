# Google OAuth 503 / OAuthCallback Error — Troubleshooting

When you see **`/api/auth/signin?error=OAuthCallback`** and a **503 Service Temporarily Unavailable** from nginx, the OAuth callback from Google is failing. Usually either nginx cannot reach the Next.js app, or the app is too slow and nginx times out.

---

## Quick deploy checklist (fix 503)

1. **On the server:** Ensure the Next.js app is running and listening on the port nginx proxies to (e.g. 3000).  
   `curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3000/api/health` → must be **200**.
2. **Deploy latest code** so the OAuth callback uses background setup (faster response).
3. **Deploy and reload nginx** so `/api/auth/` has 90s timeouts (see section 2).
4. **Env:** `NEXTAUTH_URL=https://sudandna.com`, `NEXTAUTH_SECRET` and Google client ID/secret set where the app runs.
5. **Google Console:** Redirect URI is exactly `https://sudandna.com/api/auth/callback/google`.

---

## 1. Confirm Next.js is running and reachable

On the server:

```bash
# Is anything listening on 3000?
curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3000/api/health
# Should return 200. If connection refused or timeout, the app is down.
```

- If using **PM2**: `pm2 list` and `pm2 logs` (look for crashes when you attempt Google sign-in).
- If using **systemd**: `systemctl status your-app-service` and `journalctl -u your-app-service -f`.

Restart the app if it’s down, then try Google sign-in again.

---

## 2. Nginx timeouts (already updated in this repo)

The repo’s `infrastructure/nginx/nginx.conf` uses longer timeouts for `/api/auth/` so the callback does not time out:

- `proxy_connect_timeout 30s`
- `proxy_send_timeout 90s`
- `proxy_read_timeout 90s`

**You must deploy this config and reload nginx** on the server where sudandna.com is hosted:

```bash
sudo nginx -t && sudo systemctl reload nginx
```

---

## 3. Environment variables (critical for OAuth)

On the **same machine/container where the Next.js app runs**, ensure:

| Variable | Required | Example |
|----------|----------|---------|
| `NEXTAUTH_URL` | Yes | `https://sudandna.com` (no trailing slash) |
| `NEXTAUTH_SECRET` | Yes | Long random string (e.g. `openssl rand -base64 32`) |
| `GOOGLE_CLIENT_ID` | Yes | From Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | Yes | From Google Cloud Console |

If `NEXTAUTH_URL` is wrong (e.g. `http://` or wrong host), callbacks can fail or redirect incorrectly. If `NEXTAUTH_SECRET` is missing, NextAuth can misbehave.

---

## 4. Google Cloud Console redirect URI

In [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → Credentials → your OAuth 2.0 Client:

- **Authorized redirect URIs** must include exactly:
  - `https://sudandna.com/api/auth/callback/google`

No trailing slash, and it must be HTTPS if your site is HTTPS.

---

## 5. Database reachable during callback

The OAuth callback uses the **Prisma adapter** (creates/updates `User`, `Account`, etc.). If PostgreSQL is unreachable or slow:

- The callback can hang and nginx returns 503 (or 502).
- Check `DATABASE_URL` and that the DB is up; check app logs for Prisma/connection errors when you attempt Google sign-in.

---

## 6. Check app logs during sign-in

Reproduce the issue while watching logs:

```bash
# PM2
pm2 logs --lines 100

# Or Node directly
# Look for errors when you click "Sign in with Google" and get redirected back
```

Look for:

- Uncaught exceptions (e.g. DB, missing env).
- NextAuth errors (e.g. `[next-auth][error]`).

---

## 7. Quick checklist

- [ ] Next.js app is running and `http://127.0.0.1:3000/api/health` returns 200.
- [ ] Nginx config updated and reloaded (longer timeouts for `/api/auth/`).
- [ ] `NEXTAUTH_URL=https://sudandna.com`, `NEXTAUTH_SECRET` set, Google client ID/secret set.
- [ ] Redirect URI in Google Console is `https://sudandna.com/api/auth/callback/google`.
- [ ] Database is reachable; no Prisma errors in logs during callback.

After fixing, try signing in with Google again; the callback should complete and the 503 / OAuthCallback error should stop.
