# Deploy / Server build

## Why build fails with "Module not found"

The server must have the same source files as your dev machine. If you see:

- `Can't resolve '@/components/family-tree'`
- `Can't resolve '@/components/ai/AIInsightsPanel'`
- `Can't resolve '@/types'`
- `Can't resolve '@/lib/utils/cn'`
- `Can't resolve '@/lib/i18n/store'`

then the server’s repo is missing those files. Fix by pushing from your dev machine, then pulling on the server.

## 1. On your dev machine (where Cursor runs)

Commit and push everything to the branch the server uses:

```bash
git status
git add .
git commit -m "Ensure all source files for build"
git push origin claude/sudanese-heritage-platform-FSeaA
```

(Use your real branch name if different.)

## 2. On the server

```bash
cd /root/family-tree

# Get latest code
git fetch origin
git pull origin claude/sudanese-heritage-platform-FSeaA

# Check that required files exist (optional)
node scripts/verify-build-files.js

# Install, generate, build, restart
npm install
npx prisma generate
rm -rf .next
npm run build
pm2 restart heritage --update-env
```

If `verify-build-files.js` prints "Missing files", run step 1 again and pull on the server again.

## 3. 502 Bad Gateway

502 usually means the app isn’t running. If the build failed, there is no `.next` folder, so `next start` fails and PM2 keeps restarting. Fix the build (steps 1–2) so that `npm run build` completes successfully; then `pm2 restart heritage` will serve the app correctly.
