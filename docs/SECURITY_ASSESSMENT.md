# Security Assessment & Hardening Report

**Project:** Sudanese Heritage Platform  
**Assessment type:** Code review, authorization audit, configuration hardening  
**Date:** 2025

---

## 1. Executive Summary

A security review was performed on the codebase to identify IDOR risks, missing authorization checks, configuration issues, and input validation gaps. **Remediations have been applied** where possible; remaining items are documented for operations (e.g. rate limiting, WAF).

| Category        | Status | Notes |
|----------------|--------|--------|
| Authorization   | ✅ Fixed | Tree/member access centralized; IDORs closed |
| Input validation| ✅ Hardened | Max lengths, trim, enums on schemas |
| Security headers| ✅ Added | X-Content-Type-Options, X-Frame-Options, Referrer-Policy |
| CORS           | ✅ Hardened | No wildcard `*` when `NEXT_PUBLIC_APP_URL` is set |
| Config/Secrets  | ✅ Documented | `.env.example` only; no secrets in repo |

---

## 2. Findings and Remediations

### 2.1 IDOR: List members by tree (FIXED)

- **Issue:** `GET /api/family/members?treeId=xxx` did not verify that the authenticated user had access to the tree. Any logged-in user could list members of any tree by guessing or enumerating `treeId`.
- **Fix:** Introduced `getTreeAccess(userId, treeId)` and now require `canView` before returning members. Implemented in `src/lib/auth/tree-access.ts` and used in `src/app/api/family/members/route.ts`.

### 2.2 IDOR: Get member by ID (FIXED)

- **Issue:** `GET /api/family/members/[memberId]` returned any member by ID without checking that the member belonged to a tree the user can access.
- **Fix:** Use `getMemberTreeAccess(userId, memberId)` and return 404 when `!access.canView`.

### 2.3 Collaborator role validation (FIXED)

- **Issue:** `POST /api/family/trees/[treeId]/collaborators` accepted arbitrary `role` and `daysValid` from the request body, allowing invalid roles or excessive expiry.
- **Fix:** Restrict `role` to `VIEWER` | `EDITOR` | `ADMIN`; clamp `daysValid` to 1–90.

### 2.4 Editor/Admin can edit and delete members (FIXED)

- **Issue:** PATCH/DELETE on members only allowed the tree owner; collaborators with EDITOR/ADMIN could not edit or delete members.
- **Fix:** Use `getMemberTreeAccess` and allow `canEdit` (owner or EDITOR/ADMIN) for PATCH and DELETE.

### 2.5 Neo4j sync uses correct ID (FIXED)

- **Issue:** `updatePerson` and `deletePerson` were called with `member.neo4jPersonId`; Neo4j nodes are keyed by `postgresId` (TreeMember.id).
- **Fix:** Pass `member.id` (postgresId) to `updatePerson` and `deletePerson`. Tree visualization fallback now uses `rootMember.id` for `getTreeForVisualization`.

### 2.6 Security headers and CORS (FIXED)

- **Issue:** API CORS used `process.env.NEXT_PUBLIC_APP_URL || '*'`, risking over-permissive origin in production. No explicit X-Content-Type-Options or X-Frame-Options on API.
- **Fix:** In `next.config.js`: use a fixed origin when `NEXT_PUBLIC_APP_URL` is set (otherwise fallback to localhost); add `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, `Referrer-Policy: strict-origin-when-cross-origin` for API and app routes.

### 2.7 Input validation and limits (FIXED)

- **Register:** Name/email length and trim; password max length; email normalized to lowercase.
- **Community posts:** Max lengths on title (200), content (50k), tags (20 items, 50 chars each), tribe/region.
- **Family members:** Max lengths on names, bio, lineage, tribe, etc.; birth/death year bounds.

---

## 3. Recommendations for Operations

### 3.1 Rate limiting

- **Auth endpoints:** Ensure nginx (or your reverse proxy) rate limits `/api/auth/*` (e.g. 10 req/min per IP) as in the existing nginx config. For serverless, consider a rate-limit middleware or external service.
- **Register:** Apply stricter limits (e.g. 3–5 registrations per IP per hour) to reduce abuse.

### 3.2 Health endpoint

- `/api/health` is unauthenticated and returns service name and version. For production, consider:
  - Restricting access (e.g. only from load balancer / internal network), or
  - Removing version from the response if you consider it sensitive.

### 3.3 Dependency and secrets

- Run `npm audit` and `pip audit` (AI service) regularly; fix high/critical issues.
- Never commit `.env` or production secrets. Use a secrets manager in production.
- Ensure `NEXTAUTH_SECRET` is strong (e.g. `openssl rand -base64 32`) and unique per environment.

### 3.4 CSP and XSS

- The app already sets Content-Security-Policy in nginx. Keep script-src as strict as possible; avoid `'unsafe-inline'` where feasible.
- All user-generated content (names, bios, posts) should be rendered in a way that prevents stored XSS (React’s default escaping helps; avoid `dangerouslySetInnerHTML` with unsanitized input).

---

## 4. Penetration Testing Checklist (manual)

Use this as a short PT checklist after deployment:

- [ ] **Auth:** Try accessing `/api/family/trees`, `/api/family/members` without a session → expect 401.
- [ ] **IDOR:** As user A, obtain a tree ID or member ID belonging to user B; call GET with user A’s session → expect 403/404.
- [ ] **CORS:** From a browser on another origin, call API with credentials → only your app origin should succeed if CORS is configured correctly.
- [ ] **Registration:** Submit very long name/email/password → expect 400 or truncation per schema.
- [ ] **Invite:** Accept an expired or already-used invite token → expect 4xx and no access.

---

## 5. Files Touched in This Hardening

| File | Change |
|------|--------|
| `src/lib/auth/tree-access.ts` | **New** – central tree/member access checks |
| `src/app/api/family/members/route.ts` | Tree access check on GET; schema max lengths |
| `src/app/api/family/members/[memberId]/route.ts` | Member access on GET; canEdit for PATCH/DELETE; Neo4j postgresId fix |
| `src/app/api/family/trees/[treeId]/collaborators/route.ts` | Role and daysValid validation |
| `src/app/api/family/trees/[treeId]/route.ts` | Neo4j fallback uses rootMember.id |
| `src/app/api/auth/register/route.ts` | Stricter schema (lengths, trim, email lowerCase) |
| `src/app/api/community/posts/route.ts` | Post schema max lengths and array limits |
| `next.config.js` | CORS origin, X-Content-Type-Options, X-Frame-Options, Referrer-Policy |
| `docs/SECURITY_ASSESSMENT.md` | This report |

---

## 6. Summary

Authorization is now centralized and IDORs on tree and member resources are closed. Input validation and security headers have been tightened. Remaining improvements (rate limiting, health endpoint exposure, dependency audits) are operational and should be part of your deployment and maintenance process.
