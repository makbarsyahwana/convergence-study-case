# Healthfulforu.com v2.0 — System Architecture & Design Document

## 1. High-Level System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                          CLIENTS                                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────────┐                       │
│  │ Web App  │  │ Mobile   │  │ Admin Panel  │                       │
│  │ (Next.js)│  │ (Future) │  │ (Strapi CMS) │                       │
│  └────┬─────┘  └────┬─────┘  └──────┬───────┘                       │
└───────┼──────────────┼───────────────┼───────────────────────────────┘
        │              │               │
        ▼              ▼               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     API GATEWAY / LOAD BALANCER                      │
│                        (Nginx / AWS ALB)                             │
└───────────────────────────┬─────────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        ▼                   ▼                   ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────────┐
│  NestJS API  │  │  NestJS API  │  │   Strapi CMS     │
│  Instance 1  │  │  Instance N  │  │   (Headless)     │
│              │  │              │  │                   │
│  ┌────────┐  │  │  ┌────────┐  │  │  Content Mgmt    │
│  │ Auth   │  │  │  │ Auth   │  │  │  Media Upload    │
│  │ Content│  │  │  │ Content│  │  │  Webhook Events  │
│  │ Subs   │  │  │  │ Subs   │  │  └──────┬───────────┘
│  │ User   │  │  │  │ User   │  │         │
│  └────────┘  │  │  └────────┘  │         │
└──────┬───────┘  └──────┬───────┘         │
       │                 │                 │
       ▼                 ▼                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        DATA LAYER                                    │
│                                                                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │
│  │  PostgreSQL   │  │    Redis     │  │  S3 / MinIO  │              │
│  │  (Primary DB) │  │   (Cache +   │  │  (Media      │              │
│  │               │  │   Sessions)  │  │   Storage)   │              │
│  └──────────────┘  └──────────────┘  └──────────────┘              │
│                                                                      │
│  ┌──────────────────────────────────────┐                           │
│  │  Notification Service (Future)        │                           │
│  │  - Email (SendGrid/SES)              │                           │
│  │  - Push Notifications (FCM/APNs)     │                           │
│  └──────────────────────────────────────┘                           │
└─────────────────────────────────────────────────────────────────────┘
```

### Component Breakdown

| Component | Technology | Purpose |
|-----------|-----------|---------|
| **Frontend** | Next.js (React) | SSR/SSG public health articles for SEO; client-side for interactive tools |
| **Backend API** | NestJS (TypeScript) | RESTful API with modular architecture; business logic, auth, content delivery |
| **CMS** | Strapi (Headless) | Content editors manage articles/videos without touching code; webhooks sync to API |
| **Database** | PostgreSQL | Relational data — users, subscriptions, content metadata, tags, preferences |
| **Cache** | Redis | Content list caching, session store, rate limiting counters |
| **Media Storage** | S3 / MinIO | Videos, images, PDFs — served via CDN |
| **Notifications** | SendGrid + FCM (future) | Email digests, push notifications for new content |

---

## 2. Technology Choices

### Why NestJS (Node.js) over Laravel or Go?

| Criteria | NestJS (Node.js) | Laravel (PHP) | Go |
|----------|------------------|---------------|-----|
| **Type safety** | ✅ TypeScript native | ❌ PHP lacks strict typing | ✅ Strong typing |
| **Developer ecosystem** | ✅ Huge npm ecosystem | ✅ Mature ecosystem | ⚠️ Smaller web ecosystem |
| **Team hiring** | ✅ JS/TS developers abundant in APAC | ✅ PHP common in APAC | ⚠️ Harder to hire |
| **Framework maturity** | ✅ Modular, DI, decorators | ✅ Very mature MVC | ⚠️ No dominant framework |
| **Performance** | ✅ Non-blocking I/O, great for read-heavy | ✅ Adequate with Octane | ✅✅ Best raw performance |
| **Mobile API readiness** | ✅ JSON-native, same team can build BFF | ✅ Good API support | ✅ Good API support |
| **Code sharing** | ✅ Share types with Next.js frontend | ❌ No sharing | ❌ No sharing |
| **Learning curve** | ⚠️ Moderate (DI, decorators) | ✅ Low | ⚠️ Moderate |

**Decision: NestJS** — TypeScript provides type safety and code sharing with the Next.js frontend. NestJS's modular architecture maps naturally to domain boundaries (auth, content, subscription). The non-blocking I/O model is ideal for a read-heavy content platform. The abundant JS/TS talent pool in APAC reduces hiring friction.

### Why Modular Monolith over Pure Monolith or Microservices?

| Stage | Architecture | Rationale |
|-------|-------------|-----------|
| **MVP (now)** | Modular Monolith | Single deployable unit, fast iteration, clear module boundaries |
| **Growth (later)** | Extract to Microservices | Split auth, content, subscription into separate services when team grows |

**Decision: Modular Monolith** — A small team (2-4 engineers) cannot sustain the operational overhead of microservices (separate deployments, service mesh, distributed tracing). A modular monolith gives us:
- **Clear boundaries** — each NestJS module owns its domain (auth, content, subscription)
- **Single deployment** — one Docker image, one CI/CD pipeline
- **Easy extraction** — modules communicate via well-defined interfaces, making future service extraction straightforward
- **Shared database** — avoids distributed transaction complexity at MVP stage

---

## 3. Data Models

### Entity Relationship Diagram

```
┌──────────────┐       ┌──────────────────┐       ┌──────────────┐
│    User      │       │   Subscription   │       │     Role     │
├──────────────┤       ├──────────────────┤       ├──────────────┤
│ id (PK)      │──┐    │ id (PK)          │       │ id (PK)      │
│ email        │  │    │ userId (FK)      │◄──┐   │ name         │
│ password     │  │    │ plan             │   │   │ description  │
│ firstName    │  ├───►│ status           │   │   └──────┬───────┘
│ lastName     │  │    │ startDate        │   │          │
│ avatarUrl    │  │    │ endDate          │   │          │ M:N
│ roleId (FK)  │──┘    │ stripeCustomerId │   │   ┌──────┴───────┐
│ isActive     │       │ createdAt        │   │   │  UserRole    │
│ createdAt    │       │ updatedAt        │   │   │  (junction)  │
│ updatedAt    │       └──────────────────┘   │   └──────────────┘
└──────┬───────┘                              │
       │                                      │
       │ 1:N                                  │
       ▼                                      │
┌──────────────────┐                          │
│ UserPreference   │                          │
├──────────────────┤                          │
│ id (PK)          │                          │
│ userId (FK)      │──────────────────────────┘
│ topicId (FK)     │
│ emailDigest      │
│ pushNotifications│
│ language         │
│ createdAt        │
└──────────────────┘

┌──────────────────┐       ┌──────────────┐       ┌──────────────┐
│    Content       │       │  ContentTag  │       │     Tag      │
├──────────────────┤       │  (junction)  │       ├──────────────┤
│ id (PK)          │──┐    ├──────────────┤    ┌──│ id (PK)      │
│ title            │  ├───►│ contentId(FK)│    │  │ name         │
│ slug             │  │    │ tagId (FK)   │◄───┘  │ slug         │
│ type (ARTICLE/   │  │    └──────────────┘       │ description  │
│       VIDEO)     │  │                           │ parentId(FK) │
│ body             │  │                           │ createdAt    │
│ excerpt          │  │                           └──────────────┘
│ thumbnailUrl     │  │
│ videoUrl         │  │
│ isPremium        │  │
│ status (DRAFT/   │  │
│   PUBLISHED/     │  │
│   ARCHIVED)      │  │
│ publishedAt      │  │
│ authorId (FK)    │──┘
│ strapiId         │    ◄── synced from CMS
│ viewCount        │
│ readTimeMinutes  │
│ createdAt        │
│ updatedAt        │
└──────────────────┘
```

### Key Schema Decisions

1. **`isPremium` on Content** — Simple boolean flag; premium content requires active subscription
2. **`strapiId` on Content** — Links to Strapi CMS entry for webhook-based sync
3. **Tags with `parentId`** — Supports hierarchical topics (e.g., "Nutrition" → "Diet Plans")
4. **`UserPreference` as separate table** — Avoids bloating the User table; allows multiple topic preferences
5. **Subscription `plan` enum** — `FREE`, `MONTHLY`, `YEARLY` — extensible for future tiers
6. **Role-based access** — Separate Role table with M:N junction for flexible permission assignment

---

## 4. Scalability Strategy

### MVP Phase (0–10K Users)

| Concern | Solution |
|---------|----------|
| **Infrastructure** | Single server / small VPS, Docker Compose |
| **Database** | Single PostgreSQL instance, basic indexing |
| **Caching** | Redis for hot content lists, 5-min TTL |
| **CDN** | CloudFront or Cloudflare for static assets and media |
| **Search** | PostgreSQL full-text search (`tsvector`) |
| **Monitoring** | Basic logging (Winston/Pino), health checks |

**Estimated load**: ~100 concurrent reads, <10 writes/sec — easily handled by a single NestJS instance.

### Growth Phase (100K–1M+ Users)

| Concern | Solution |
|---------|----------|
| **Horizontal scaling** | Multiple NestJS instances behind load balancer (ALB/Nginx) |
| **Database** | Read replicas for content queries; connection pooling (PgBouncer) |
| **Caching** | Redis Cluster; cache content by ID + personalized feeds |
| **Search** | Migrate to Elasticsearch/Meilisearch for full-text + faceted search |
| **Media** | S3 + CloudFront with signed URLs for premium video content |
| **Queue** | Bull/BullMQ for async tasks — email, notifications, CMS sync |
| **Monitoring** | APM (Datadog/New Relic), structured logging, alerting |
| **Database partitioning** | Partition content table by `publishedAt` for efficient time-range queries |
| **Rate limiting** | Redis-based rate limiting per user/IP |

### Future Considerations (1M+ Users)

- **Service extraction** — Split auth, content, notification into separate microservices
- **Event-driven architecture** — Kafka/NATS for inter-service communication
- **Edge caching** — Cache personalized content at CDN edge using Vary headers
- **Multi-region** — Database replication across APAC regions (Singapore, Tokyo, Sydney)

---

## 5. Security Considerations

### Authentication & Authorization

| Concern | Implementation |
|---------|---------------|
| **Auth mechanism** | JWT (access + refresh tokens); access token: 15min, refresh: 7 days |
| **Password storage** | bcrypt with cost factor 12 |
| **RBAC** | Role-based guards — `ADMIN`, `EDITOR`, `SUBSCRIBER`, `FREE_USER` |
| **API protection** | Passport.js JWT strategy + custom guards |
| **Rate limiting** | @nestjs/throttler — 100 req/min for API, 5 req/min for auth endpoints |

### Access Control Matrix

| Resource | Free User | Subscriber | Editor | Admin |
|----------|-----------|------------|--------|-------|
| List free content | ✅ | ✅ | ✅ | ✅ |
| Read free content | ✅ | ✅ | ✅ | ✅ |
| List premium content (excerpt) | ✅ | ✅ | ✅ | ✅ |
| Read premium content (full) | ❌ | ✅ | ✅ | ✅ |
| Create/edit content | ❌ | ❌ | ✅ | ✅ |
| Manage users | ❌ | ❌ | ❌ | ✅ |
| Manage subscriptions | ❌ | ❌ | ❌ | ✅ |

### Data Privacy (APAC Compliance)

- **PDPA (Thailand, Singapore)** / **Privacy Act (Australia)** compliance:
  - Explicit consent for data collection at registration
  - Data export endpoint (`GET /users/me/data`) for data portability
  - Account deletion with cascading data cleanup
  - Minimal PII storage — no unnecessary personal data
- **Encryption**: TLS 1.3 in transit; AES-256 for sensitive fields at rest
- **Audit logging**: Track admin actions on user data
- **CORS**: Strict origin whitelist for API access
- **Input validation**: class-validator + class-transformer on all DTOs
- **SQL injection**: Prevented by Prisma's parameterized queries
- **XSS**: Sanitize user-generated content before storage
