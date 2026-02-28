# Google OAuth 503 / OAuthCallback Error — Troubleshooting

When you see **`/api/auth/signin?error=OAuthCallback`** and a **503 Service Temporarily Unavailable** from nginx, the OAuth callback from Google is failing. Usually either nginx cannot reach the Next.js app, or the app is too slow and nginx times out.

---

## If logs show `invalid_client (Unauthorized)` — fix Google credentials

If **PM2/app logs** show:

```text
[next-auth][error][OAUTH_CALLBACK_ERROR]
invalid_client (Unauthorized)
providerId: 'google',
message: 'invalid_client (Unauthorized)'
```

then **Google is rejecting your OAuth request**. The 503 is a side effect; fix the Google OAuth setup:

1. **Check credentials on the server**
   - Where the app runs (e.g. PM2 env or `.env`), confirm:
     - `GOOGLE_CLIENT_ID` — full value, no spaces, from [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → Credentials.
     - `GOOGLE_CLIENT_SECRET` — correct secret for that same OAuth 2.0 Client. If you regenerated the secret in Console, update it on the server and restart the app.
   - Restart the app after changing env: `pm2 restart heritage` (or your app name).

2. **Check redirect URI in Google Console**
   - In the same OAuth 2.0 Client (Credentials → your Web client):
     - **Authorized redirect URIs** must contain exactly:  
       `https://sudandna.com/api/auth/callback/google`  
       (no trailing slash, same host as your site).
   - Your app uses `NEXTAUTH_URL` to build the callback URL; ensure `NEXTAUTH_URL=https://sudandna.com` (no trailing slash) on the server.

3. **Client type**
   - The credential must be a **Web application** (not Desktop or other). Under "Authorized redirect URIs" you should have the URL above.

4. **No typos**
   - Ensure no leading/trailing spaces in `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in your env file.

After fixing, restart the app and try "Sign in with Google" again.

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
# 1) Ping — no DB. If this fails, the app is not reachable on port 3000.
curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3000/api/ping
# 2) Health — uses DB. If ping=200 but health=503, the database is down.
curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3000/api/health
```

- **If /api/ping is not 200:** App not running or wrong port. **If /api/ping is 200 but /api/health is 503:** DB down or wrong DATABASE_URL; fix DB first.
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

---

## 8. Still 503? — Narrow it down

| Check | What it means |
|-------|----------------|
| `curl http://127.0.0.1:3000/api/ping` from the **server** | **200** = app process is up and nginx can reach it. **Connection refused / timeout** = app not running or wrong port (nginx expects 3000 by default). |
| `curl http://127.0.0.1:3000/api/health` from the **server** | **200** = app + DB OK. **503** = DB unreachable; OAuth callback will hang or fail until DB works. |
| From your **browser**: `https://sudandna.com/api/ping` | **200** = nginx → app works. **503** = nginx can’t reach app or nginx is misconfigured. |
| **Logs at the moment you click “Sign in with Google”** | Look for `[NextAuth] Unhandled error:` or Prisma/DB errors. If you see an error, fix that (e.g. DB URL, missing table, network). |

**If /api/ping is 200 from the server but https://sudandna.com/api/ping is 503:** nginx is not proxying to 127.0.0.1:3000 correctly, or another proxy in front is returning 503. Check nginx `upstream` and `proxy_pass` for `/api/`.

**If the app crashes when the callback runs:** logs will show the exception. Common causes: wrong `DATABASE_URL`, Prisma schema not migrated, or missing env (e.g. `NEXTAUTH_SECRET`). The updated code now catches unhandled errors and redirects to sign-in instead of leaving the request hanging.
