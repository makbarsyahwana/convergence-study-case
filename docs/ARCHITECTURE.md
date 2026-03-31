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

### Why NestJS over Laravel or Go?

This is a read-heavy API — most traffic is `GET /content` and `GET /content/:slug`. The critical path on every request is: **decode JWT → check subscription status → query content → gate the body if premium**. The right framework for this workload is one that handles many concurrent reads without blocking and makes the gating logic easy to reason about.

| Criteria | NestJS (Node.js) | Laravel (PHP) | Go |
|----------|------------------|---------------|-----|
| **Concurrent reads** | Non-blocking event loop — while waiting on a DB query, the process handles other requests. No thread spawning per request | PHP-FPM spawns a worker process per request. More memory per connection. Octane (Swoole) improves this but adds operational complexity | Goroutines are very lightweight — can hold thousands of open connections with low memory. Best concurrency model of the three |
| **Content gating** | Guards run before the handler — gating logic (`isPremium` + subscription check) lives in one place, applied declaratively per route | Middleware and Gates work similarly. Clean enough, but subscription checks often end up scattered across controllers without discipline | Middleware is manual — you write the gating logic yourself and wire it to each route handler. No conventions, just code |
| **Subscription check per request** | JWT payload carries `hasActiveSubscription` — avoids a DB hit on every read. Guard reads from the token, not the DB | Same pattern is possible with JWT, but Passport.js equivalent (Laravel Sanctum/JWT-auth) needs extra config to embed custom claims | Middleware can read JWT claims directly. Same capability, just more code to set it up |
| **Caching (content lists)** | In-process Map cache or Redis — easy to inject via DI and invalidate on CMS webhook events | Laravel Cache facade works well. Redis or file cache. Invalidation on webhook is straightforward | No built-in cache layer. Use a Redis client directly. Works fine, but no DI — you pass the client around manually |
| **Type safety on response shape** | TypeScript interfaces on DTOs catch mismatches between what the service returns and what the controller sends. Shared with frontend | PHP arrays are untyped by default. API Resources help but don't catch shape errors at write-time | Compile-time struct checks. If the struct compiles, the shape is correct. No runtime surprises |
| **Downsides for this workload** | CPU-bound work (e.g., image processing, PDF generation) blocks the event loop. Not an issue for content reads, but matters if the API expands | N+1 queries are easy to miss — a list of 20 articles with tags each triggering a separate query. Need explicit `with()` eager loading | Genuinely more verbose. A single content endpoint with gating, pagination, and filtering takes 3–4x the lines of NestJS |

**Decision: NestJS.**

For a read-heavy content API with per-request subscription gating, the two things that matter technically are concurrency and how the gating logic is expressed.

- **Concurrency:** Node's event loop handles many concurrent reads efficiently because content GETs are I/O-bound (waiting on Postgres), not CPU-bound. Go handles concurrency better in absolute terms, but the difference doesn't matter at the scale this platform targets.
- **Gating logic:** NestJS Guards let you express `@Roles('SUBSCRIBER')` or check `hasActiveSubscription` in a single injectable class, applied at the controller level. This keeps gating out of the service layer and easy to audit. Laravel Middleware achieves the same result. Go requires writing the equivalent logic manually.
- **Practical:** The team writes TypeScript. The frontend is React/Next.js. Shared TS interfaces between the API and frontend mean the content shape — including `_gated`, `body`, `isPremium` — stays in sync without manual coordination.


### Why Modular Monolith?

| Approach | When it makes sense | When it doesn't |
|----------|-------------------|-----------------|
| **Plain monolith** | Solo dev, throwaway prototype | Code becomes tangled fast once multiple devs contribute |
| **Modular monolith** | Small team (2-5), single product, clear domain boundaries | If modules need independent scaling or different tech stacks |
| **Microservices** | Large team (10+), high scale, independent deployment needed | Small team — the operational overhead (networking, tracing, deployment pipelines per service) will slow you down |

**Decision: Modular monolith.** With 2-4 engineers, microservices means spending more time on deployment pipelines, service discovery, and distributed tracing than on the actual product. What we get instead:
- **One deployment** — one Docker image, one CI/CD pipeline, one thing to debug when it breaks
- **Module boundaries** — each NestJS module (auth, content, subscription) has its own service and controller. They call each other through injected services, not over HTTP
- **Shared database** — one Postgres instance, no distributed transactions, no eventual consistency headaches
- **Can split later** — if a module needs to scale independently, the interfaces are there. But realistically, extracting a module into its own service still means a lot of work (separate database, API contracts, new deployment pipeline). Don't assume it'll be easy

The main risk: without code reviews enforcing boundaries, developers will take shortcuts across modules and it becomes a regular monolith. The structure only works if the team agrees to follow it.

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
