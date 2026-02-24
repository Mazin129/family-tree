# منصة التراث السوداني — Sudanese Heritage Platform

<div align="center">

![Sudanese Heritage](https://img.shields.io/badge/التراث-السوداني-d4922d?style=for-the-badge)
![Next.js](https://img.shields.io/badge/Next.js-14-black?style=for-the-badge&logo=next.js)
![Neo4j](https://img.shields.io/badge/Neo4j-Graph-008CC1?style=for-the-badge&logo=neo4j)
![Python](https://img.shields.io/badge/Python-FastAPI-009688?style=for-the-badge&logo=fastapi)

**A production-ready platform for Sudanese family trees, genealogy, and cultural heritage preservation with AI/ML capabilities.**

</div>

---

## ✨ Features

### 🌳 Family Tree
- Multi-generation interactive visualization (D3.js)
- Zoom, pan, collapse/expand nodes
- Sudanese naming conventions (Arabic + English)
- Tribe, clan, lineage tagging
- Privacy controls per branch/person

### 👥 Community & Culture
- Tribe/region heritage categorization
- Community posts and collaboration
- Oral history archive (audio/video)
- Cultural storytelling and heritage items
- RTL/LTR bilingual support

### 🤖 AI/ML (3 Phases)
- **Phase 1**: Duplicate detection, name similarity, relationship validation
- **Phase 2**: Lineage pattern recognition, tribe inference, migration visualization
- **Phase 3**: AI-generated family narratives, heritage reports (Claude/GPT)

### 🔐 Authentication
- Email/password registration
- Google OAuth
- JWT sessions
- Consent & privacy management (GDPR-aligned)

---

## 🏗️ Tech Stack

| Layer         | Technology                              |
|---------------|-----------------------------------------|
| Frontend      | Next.js 14 (App Router), TypeScript     |
| Styling       | Tailwind CSS + Custom Sudanese palette  |
| Graph DB      | Neo4j 5 (family relationships)          |
| Relational DB | PostgreSQL 16 via Prisma ORM            |
| Cache         | Redis 7                                 |
| Auth          | NextAuth.js v4                          |
| AI Service    | Python FastAPI                          |
| Deployment    | DigitalOcean App Platform + Droplets    |
| Reverse Proxy | Nginx                                   |

---

## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- Docker & Docker Compose
- Python 3.11+ (for AI service development)

### 1. Clone & Configure
```bash
git clone <repository-url>
cd family-tree
cp .env.example .env
# Fill in .env values
```

### 2. Start with Docker Compose
```bash
docker-compose up -d
```

This starts:
- PostgreSQL on :5432
- Neo4j on :7474 (browser) and :7687 (bolt)
- Redis on :6379
- Next.js app on :3000
- AI service on :8001

### 3. Initialize Database
```bash
npm install
npx prisma migrate dev
npm run db:seed
```

### 4. Open the app
Visit [http://localhost:3000](http://localhost:3000)

Demo credentials:
- Admin: `admin@sudaneseheritagе.com` / `Admin@123!`
- Demo:  `demo@example.com` / `Demo@123!`

---

## 📁 Project Structure

```
family-tree/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (auth)/             # Login, Register
│   │   ├── (dashboard)/        # Protected pages
│   │   │   ├── dashboard/      # User dashboard
│   │   │   ├── tree/           # Family tree pages
│   │   │   └── community/      # Community features
│   │   └── api/                # API routes
│   │       ├── auth/           # NextAuth + Register
│   │       ├── family/         # Trees, Members
│   │       └── ai/             # AI endpoints
│   ├── components/
│   │   ├── family-tree/        # D3 tree visualization
│   │   ├── ai/                 # AI insights panel
│   │   └── layout/             # Sidebar, TopBar
│   ├── lib/
│   │   ├── db/                 # Prisma + Neo4j clients
│   │   ├── auth/               # NextAuth config
│   │   └── ai/                 # AI service client
│   └── types/                  # TypeScript types
├── prisma/
│   ├── schema.prisma           # DB schema
│   └── seed.ts                 # Seed data
├── ai-service/                 # Python FastAPI
│   ├── routers/                # Route handlers
│   ├── models/                 # Pydantic schemas
│   └── utils/                  # Similarity algorithms
├── infrastructure/
│   ├── nginx/                  # Reverse proxy config
│   └── digitalocean/           # DO App Platform spec
└── docker-compose.yml
```

---

## 🗄️ Database Design

### Why Neo4j + PostgreSQL?

| Concern              | Neo4j                     | PostgreSQL              |
|----------------------|---------------------------|-------------------------|
| Family relationships | ✅ Native graph traversal | Recursive CTEs (complex) |
| User accounts        | Possible                  | ✅ Mature, ACID          |
| Cultural content     | Possible                  | ✅ Full-text search      |
| Auth sessions        | Not ideal                 | ✅ NextAuth adapter      |

**Neo4j** handles all person-to-person relationships (PARENT_OF, SPOUSE_OF, etc.) with efficient traversal for finding ancestors/descendants up to N generations.

**PostgreSQL** handles users, auth, community posts, heritage items, and all non-graph data.

---

## 🤖 AI Architecture

```
Next.js API Route → HTTP → FastAPI AI Service
                              ├── /detect-duplicates  (Phase 1)
                              ├── /validate-relationship (Phase 1)
                              ├── /suggest-links       (Phase 1)
                              ├── /analyze-lineage     (Phase 2)
                              ├── /infer-tribe         (Phase 2)
                              ├── /generate-narrative  (Phase 3)
                              └── /heritage-report     (Phase 3)
```

Phase 3 features require `ANTHROPIC_API_KEY` or `OPENAI_API_KEY`. All phases have local fallbacks.

---

## 🚢 Deploy to DigitalOcean

```bash
# Install doctl
brew install doctl
doctl auth init

# Deploy app
doctl apps create --spec infrastructure/digitalocean/app.yaml

# Or use DO App Platform UI and connect your GitHub repo
```

**Recommended DigitalOcean setup:**
- App Platform: Next.js app + Python AI service (auto-scaling)
- Managed PostgreSQL: Production database
- Spaces: File storage (oral history audio/video)
- Neo4j: AuraDB Free (dev) → Self-hosted Droplet (prod)
- Redis: Managed Redis add-on

---

## 🔐 Security

- Passwords hashed with bcrypt (cost factor 12)
- JWT sessions with 30-day expiry
- Rate limiting on auth endpoints (10 req/min)
- CSRF protection via NextAuth
- Content Security Policy headers
- Audit logs for all sensitive operations
- GDPR-aligned: data export + deletion requests
- Privacy levels: PUBLIC → COMMUNITY → FAMILY → PRIVATE

---

## 🌍 Internationalization

The platform is Arabic-first with full RTL support:
- Cairo font for Arabic text
- `dir="rtl"` on the HTML element
- Sudanese naming conventions (father/grandfather name chains)
- Arabic numerals utility
- Bilingual community posts

---

## 📊 Sudanese Cultural Data

- 34+ documented Sudanese tribes
- 20 states/regions with Arabic names
- Relationship labels in Arabic
- Sudanese calendar and date formatting
- Regional and tribal heritage categorization

---

## 🤝 Contributing

This platform is dedicated to preserving Sudanese heritage. Contributions welcome!

1. Fork the repository
2. Create a feature branch
3. Follow the Arabic-first design principle
4. Submit a pull request

---

## 📄 License

MIT License — Free to use, modify, and distribute.

---

<div align="center">
مصنوع بحب للسودان وشعبه 🇸🇩

*Made with love for Sudan and its people*
</div>
