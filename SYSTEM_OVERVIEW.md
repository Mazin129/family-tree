# Sudanese Heritage Platform — Complete System Picture

A production-ready platform for Sudanese family trees, genealogy, and cultural heritage preservation with AI/ML capabilities. This document provides a full architectural and functional overview.

---

## 1. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT (Browser)                                    │
│  Next.js 14 App (React, RTL/Arabic-first, Tailwind, D3.js tree visualization)   │
└─────────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         NEXT.JS APP (Node.js :3000)                              │
│  • App Router: (auth), (dashboard), api/*                                         │
│  • Server Components + API Routes                                                │
│  • NextAuth.js (JWT sessions, Credentials + Google OAuth)                       │
└─────────────────────────────────────────────────────────────────────────────────┘
                    │                    │                    │
                    ▼                    ▼                    ▼
        ┌───────────────┐    ┌──────────────────┐    ┌──────────────────┐
        │  PostgreSQL   │    │      Neo4j       │    │  AI Service      │
        │  (Prisma ORM) │    │  (Graph DB)      │    │  (FastAPI :8001) │
        │  Users, Trees │    │  Person nodes    │    │  Phase 1–3 AI    │
        │  Members meta │    │  PARENT_OF, etc.  │    │  Duplicates,     │
        │  Community    │    │  Tree traversal  │    │  Lineage, NLP    │
        └───────────────┘    └──────────────────┘    └──────────────────┘
                    │
                    ▼
        ┌───────────────┐
        │     Redis     │  (optional: cache, sessions)
        └───────────────┘
```

**Data split:**
- **PostgreSQL**: Users, accounts, sessions, family tree metadata, tree members (identity/bio), relationships *metadata*, collaborators, invites, community posts, oral history, heritage items, AI insights, audit logs, notifications.
- **Neo4j**: Graph of **Person** nodes (linked by `postgresId` to `TreeMember`) and relationships (`PARENT_OF`, `CHILD_OF`, `SPOUSE_OF`, `SIBLING_OF`, etc.) for efficient ancestry/descendant traversal and tree visualization.
- **AI Service**: Stateless HTTP API; receives member/tree data, returns duplicates, validation, suggestions, lineage analysis, narratives.

---

## 2. Tech Stack Summary

| Layer           | Technology |
|----------------|------------|
| Frontend       | Next.js 14 (App Router), TypeScript, React 18, Tailwind CSS, D3.js, Framer Motion, react-zoom-pan-pinch |
| Styling        | Tailwind, Cairo/Amiri/Inter fonts, RTL, Sudanese color palette |
| Backend API    | Next.js API Routes (REST), server actions where applicable |
| ORM / SQL      | Prisma 5, PostgreSQL 16 |
| Graph DB       | Neo4j 5 (APOC), neo4j-driver (Node) |
| Auth           | NextAuth.js v4, Prisma adapter, JWT sessions, bcrypt, Google OAuth |
| AI/ML          | Python FastAPI, Pydantic, similarity utils, optional Claude/OpenAI |
| Deployment     | Docker Compose (dev), DigitalOcean App Platform, Nginx reverse proxy |
| i18n           | Arabic-first, `LanguageProvider`, `REGION_LABELS`, `SUDANESE_TRIBES` |

---

## 3. Application Structure (Next.js)

### 3.1 Route Groups & Pages

| Path | Purpose |
|------|--------|
| `/` | Landing / home |
| `/(auth)/login` | Login (credentials + Google) |
| `/(auth)/register` | Email/password registration |
| `/(dashboard)/dashboard` | User dashboard (after login) |
| `/(dashboard)/tree` | List user's trees |
| `/(dashboard)/tree/new` | Create new tree |
| `/(dashboard)/tree/[treeId]` | Single tree view + D3 canvas, members, AI insights |
| `/(dashboard)/community` | Community posts, heritage |
| `/(dashboard)/community/oral-history` | Oral history archive |
| `/invite/[token]` | Accept collaboration invite (by token) |

All dashboard routes are protected: no session → redirect to `/login`.

### 3.2 Key Components

| Component | Role |
|-----------|------|
| `FamilyTreeCanvas` | D3-based tree: zoom, pan, portrait cards, male/female/deceased styling, node click, add child/spouse |
| `MemberCard` | Display/edit member in card or modal context |
| `AddMemberModal` | Add a single member with Sudanese naming (father, grandfather, tribe, etc.) |
| `BulkAddMembersModal` | Bulk add members |
| `ShareModal` | Invite collaborators, generate invite links |
| `AIInsightsPanel` | Show AI suggestions: duplicates, missing links, lineage insights |
| `Sidebar` | Nav: Dashboard, Trees, Community, language |
| `TopBar` | User menu, notifications |
| `LanguageProvider` / `LanguageSwitcher` | Arabic/English, RTL/LTR |

### 3.3 API Routes (Next.js)

| Method | Path | Purpose |
|--------|------|--------|
| Auth | | |
| * | `/api/auth/[...nextauth]` | NextAuth catch-all (signin, callback, session) |
| POST | `/api/auth/register` | Email/password registration |
| GET | `/api/auth/google-status` | Whether Google OAuth is configured |
| Family | | |
| GET/POST | `/api/family/trees` | List / create trees |
| GET/PATCH/DELETE | `/api/family/trees/[treeId]` | Single tree CRUD |
| GET/POST | `/api/family/trees/[treeId]/collaborators` | List / add collaborators |
| DELETE | `/api/family/trees/[treeId]/collaborators/[userId]` | Remove collaborator |
| GET/POST | `/api/family/members` | List / create members (syncs to Neo4j) |
| GET/PATCH/DELETE | `/api/family/members/[memberId]` | Single member CRUD |
| POST | `/api/family/members/bulk` | Bulk add members |
| AI (proxy to FastAPI) | | |
| POST | `/api/ai/detect-duplicates` | Forward to AI service, return duplicate pairs |
| POST | `/api/ai/suggest-links` | Missing link suggestions |
| POST | `/api/ai/analyze-lineage` | Lineage patterns, migration, tribe distribution |
| Community | | |
| GET/POST | `/api/community/posts` | List / create community posts |
| Invite | | |
| GET | `/api/invite/[token]` | Validate invite token, return tree info |
| Health | | |
| GET | `/api/health` | App health check (used by Docker/DO) |

---

## 4. Database Design

### 4.1 PostgreSQL (Prisma)

- **Auth**: `User`, `Account`, `Session`, `VerificationToken`
- **User profile**: `UserProfile` (bio, tribe, region, diaspora, etc.)
- **Trees**: `FamilyTree` (owner, name, description, tribe, region, `neo4jTreeId`), `TreeMember` (identity, bio, dates, `neo4jPersonId`), `MemberRelationship` (type: PARENT_OF, SPOUSE_OF, …), `FamilyTreeTag`, `TreeCollaboration`, `InviteToken`
- **Community**: `CommunityPost`, `PostComment`, `PostLike`
- **Heritage**: `OralHistory`, `HeritageItem`
- **AI**: `AIInsight`, `DuplicateAlert`
- **System**: `PrivacySettings`, `AuditLog`, `Notification`
- **Enums**: `UserRole`, `Language`, `Gender`, `Region`, `PrivacyLevel`, `CollaboratorRole`, `PostCategory`, `MediaType`, `HeritageCategory`, `AIInsightType`, `NotificationType`

### 4.2 Neo4j

- **Nodes**: `Person` with `postgresId`, `fullName`, `fullNameArabic`, `gender`, `birthYear`, `isAlive`, `photo`, `tribe`, `createdAt`
- **Relationships**: `PARENT_OF` → `CHILD_OF`, `SPOUSE_OF`, `SIBLING_OF`, plus `HALF_SIBLING_OF`, `ADOPTED_CHILD_OF`, `GUARDIAN_OF`, `EXTENDED_KIN`
- **Usage**: Tree visualization (ancestors + descendants from root), ancestors/descendants queries, immediate family, shortest path, duplicate detection helpers, cycle detection, parent-count validation

---

## 5. AI Service (FastAPI)

- **Base URL**: `AI_SERVICE_URL` (e.g. `http://localhost:8001` or `http://ai-service:8001` in Docker).
- **Auth**: `X-API-Key` header (`AI_SERVICE_API_KEY`); in development env the check can be skipped.

### 5.1 Routers & Endpoints

| Phase | Router | Endpoints | Purpose |
|-------|--------|-----------|---------|
| Health | `health` | `GET /api/v1/health` | Liveness/readiness |
| Phase 1 | `duplicates` | `POST /api/v1/detect-duplicates`, `POST /api/v1/validate-relationship` | Duplicate pairs with reasons; relationship validation (age/gender/circular) |
| Phase 1 | `suggestions` | `POST /api/v1/suggest-links` | Missing parent/sibling/spouse suggestions |
| Phase 2 | `lineage` | `POST /api/v1/analyze-lineage`, `POST /api/v1/infer-tribe` | Lineage patterns, migration route, tribe distribution; tribe inference from name/region |
| Phase 3 | `narrative` | `POST /api/v1/generate-narrative`, `POST /api/v1/heritage-report` | AI-generated family narrative and heritage report (Claude/OpenAI or template fallback) |

### 5.2 Algorithms (summary)

- **Duplicate detection**: Pairwise comparison; composite score from name similarity (e.g. Sorensen–Dice), birth year, gender, tribe; threshold (default 0.85).
- **Relationship validation**: Age constraints (parent/child, spouse, sibling), same-gender spouse warning, circular relationship check (via Neo4j).
- **Suggestions**: Graph-based (shared parents → siblings), tribe + birth year heuristics for potential parents.
- **Lineage**: Tribe/region counters, migration over time, pattern descriptions.
- **Narrative/Report**: LLM (Claude preferred) with Sudanese heritage system prompt, or template-based if no API key.

---

## 6. Authentication & Authorization

- **NextAuth** with **JWT** sessions (no DB session required for each request).
- **Providers**: Credentials (email + bcrypt password), Google OAuth (optional, via env).
- **Roles**: `ADMIN`, `MODERATOR`, `MEMBER`, `GUEST` (from `User.role`).
- **Tree access**: Owner; collaborators with `VIEWER` / `EDITOR` / `ADMIN`; invite tokens for joining.
- **Privacy**: Per-member and tree-level `PrivacyLevel`: PUBLIC, COMMUNITY, FAMILY, PRIVATE; GDPR-style anonymization and data export/deletion support.

---

## 7. Data Flow Examples

### 7.1 View tree and visualize

1. User opens `/(dashboard)/tree/[treeId]`.
2. App loads tree and members (Prisma) and optionally root member.
3. Backend calls Neo4j `getTreeForVisualization(rootPostgresId, maxDepth)` to get subgraph (ancestors + descendants).
4. Backend builds `TreeNode` (nested `children` / `spouses`) via `buildTreeFromGraph`.
5. Frontend receives tree JSON and renders `FamilyTreeCanvas` (D3); zoom/pan/click/add.

### 7.2 Add member and relationship

1. User adds member via `AddMemberModal` or bulk modal.
2. `POST /api/family/members` (and bulk route) create `TreeMember` in PostgreSQL and `Person` in Neo4j; `neo4jPersonId` / `postgresId` stored.
3. When user adds relationship (e.g. PARENT_OF), API creates `MemberRelationship` in PostgreSQL and corresponding edge(s) in Neo4j (`createRelationship`).

### 7.3 AI duplicate check

1. Frontend or API fetches all members for a tree.
2. `POST /api/ai/detect-duplicates` → Next.js API route → `POST` to AI service `/api/v1/detect-duplicates` with member list.
3. AI returns pairs above threshold with score and reasons; app may create `DuplicateAlert` or show in `AIInsightsPanel`.

---

## 8. Deployment

### 8.1 Docker Compose (development)

- **postgres**: 5432, init script, healthcheck.
- **neo4j**: 7474 (browser), 7687 (Bolt), APOC enabled.
- **redis**: 6379, optional for cache/sessions.
- **web**: Next.js app, port 3000, env from `.env` and compose (DB, Neo4j, Redis, AI_SERVICE_URL).
- **ai-service**: FastAPI, port 8001, env (e.g. `AI_SERVICE_API_KEY`, `ANTHROPIC_API_KEY`).
- **nginx**: 80/443, reverse proxy to web and ai-service (optional in dev).

### 8.2 DigitalOcean App Platform

- **web**: Build from repo Dockerfile, 2 instances, health at `/api/health`, env from spec (DATABASE_URL, NEXTAUTH_*, NEO4J_*, AI_SERVICE_URL from internal ai-service URL, etc.).
- **ai-service**: Separate service from `ai-service/Dockerfile`, internal URL for web, secrets for API keys.
- **Databases**: Managed PostgreSQL and (optionally) Neo4j Aura or self-hosted; Redis add-on if used.

---

## 9. Security & Compliance

- Passwords: bcrypt (cost 12).
- Sessions: JWT, 30-day expiry.
- Rate limiting on auth endpoints (e.g. 10 req/min).
- CSRF: NextAuth built-in.
- CSP and security headers.
- Audit log for sensitive actions.
- Privacy: export and deletion requests; per-branch/member privacy levels.

---

## 10. Internationalization & Culture

- **Arabic-first**: `lang="ar"`, `dir="rtl"`, Cairo/Amiri fonts.
- **Sudanese data**: `SUDANESE_TRIBES`, `REGION_LABELS`, relationship labels in Arabic.
- **Naming**: Father name, grandfather name, lineage string; `tatweelName` and Arabic utilities.
- **Bilingual**: Community posts and heritage content in Arabic and English.

---

## 11. File Layout (essence)

```
family-tree/
├── src/
│   ├── app/
│   │   ├── (auth)/login, register
│   │   ├── (dashboard)/dashboard, tree, community
│   │   ├── invite/[token]
│   │   ├── api/auth, api/family, api/ai, api/community, api/invite, api/health
│   │   ├── layout.tsx, globals.css, providers
│   │   └── page.tsx (landing)
│   ├── components/
│   │   ├── family-tree/   (Canvas, MemberCard, Modals, Share)
│   │   ├── ai/             (AIInsightsPanel)
│   │   ├── layout/         (Sidebar, TopBar)
│   │   └── ui/             (Language, etc.)
│   ├── lib/
│   │   ├── db/             (prisma, neo4j)
│   │   ├── auth/           (auth-options)
│   │   ├── ai/             (client for FastAPI)
│   │   └── i18n, utils
│   └── types/              (index.ts: User, Tree, Member, Graph, AI, etc.)
├── prisma/schema.prisma, seed.ts
├── ai-service/
│   ├── main.py
│   ├── routers/            (health, duplicates, suggestions, lineage, narrative)
│   ├── models/schemas.py
│   └── utils/similarity.py
├── infrastructure/nginx, digitalocean
├── docker-compose.yml, Dockerfile
├── README.md
└── SYSTEM_OVERVIEW.md (this file)
```

---

This document gives a single, consistent picture of the Sudanese Heritage Platform for onboarding, maintenance, and extension.
