# Healthfulforu API — Postman Test Guide

Step-by-step guide to test all API scenarios. Run folders **in order** — the Auth folder populates tokens used by later requests.

## Prerequisites

1. Start infrastructure: `docker compose up -d postgres redis`
2. Start backend: `cd backend && npm run start:dev`
3. Seed the database: `npx prisma migrate dev && npm run prisma:seed`
4. Import `Healthfulforu-API.postman_collection.json` into Postman

Base URL: `http://localhost:3000/api/v1`

---

## Test Accounts (from seed)

| Email | Password | Role | Subscription |
|-------|----------|------|-------------|
| `admin@healthfulforu.com` | `Admin123!` | ADMIN | YEARLY |
| `editor@healthfulforu.com` | `Editor123!` | EDITOR | YEARLY |
| `premium@example.com` | `Premium123!` | SUBSCRIBER | MONTHLY |
| `free@example.com` | `FreeUser123!` | SUBSCRIBER | FREE |

## Seeded Content

| Slug | Premium? | Type |
|------|----------|------|
| `10-simple-ways-improve-daily-nutrition` | No | ARTICLE |
| `understanding-anxiety-comprehensive-guide` | Yes | ARTICLE |
| `home-workout-routines-busy-professionals` | No | VIDEO |
| `complete-guide-heart-health-screening` | Yes | ARTICLE |
| `managing-type-2-diabetes-through-diet` | Yes | ARTICLE |
| `meditation-beginners-5-minute-daily-practice` | No | VIDEO |

---

## Folder 1: Health

| # | Request | Expected |
|---|---------|----------|
| 1 | `GET /health` | `200` — `{ status: "ok" }` |

---

## Folder 2: Auth

Run **all login requests** first — they auto-save JWT tokens to collection variables.

| # | Request | Expected |
|---|---------|----------|
| 1 | Register new user | `201` — returns `accessToken` → saved as `newUserToken` |
| 2 | Register duplicate email | `409` Conflict |
| 3 | Register invalid data (bad email, short password, missing names) | `400` Bad Request |
| 4 | Login as admin | `200` — `accessToken` → saved as `adminToken` |
| 5 | Login as premium user | `200` — `accessToken` → saved as `premiumToken` |
| 6 | Login as free user | `200` — `accessToken` → saved as `freeToken` |
| 7 | Login wrong password | `401` Unauthorized |

---

## Folder 3: User

| # | Request | Token | Expected |
|---|---------|-------|----------|
| 1 | `GET /users/me` | `premiumToken` | `200` — profile with `email: premium@example.com` |
| 2 | `GET /users/me` | (none) | `401` |
| 3 | `PUT /users/me/preferences` | `premiumToken` | `200` — preferences updated |

---

## Folder 4: Content — Public

| # | Request | Expected |
|---|---------|----------|
| 1 | `GET /content` | `200` — paginated list with `data[]` and `meta.total` |
| 2 | `GET /content?page=2&limit=2` | `200` — max 2 items |
| 3 | `GET /content?search=nutrition` | `200` — results matching "nutrition" |
| 4 | `GET /content?tagSlug=mental-health` | `200` — mental health tagged content |
| 5 | `GET /content?type=VIDEO` | `200` — only VIDEO type items |
| 6 | `GET /content?isPremium=true` | `200` — all items have `isPremium: true` |
| 7 | `GET /content/10-simple-ways-improve-daily-nutrition` | `200` — `body` is NOT null, `_gated: false` |
| 8 | `GET /content/understanding-anxiety-comprehensive-guide` (no auth) | `200` — `body: null`, `_gated: true` |
| 9 | `GET /content/this-slug-does-not-exist` | `404` |

---

## Folder 5: Content — Gating Scenarios ⭐

This is the core test for subscription gating. Make sure Auth folder was run first.

| # | Request | Token | Expected |
|---|---------|-------|----------|
| 1 | Free user → premium content | `freeToken` | `_gated: true`, `body: null`, `videoUrl: null` |
| 2 | Premium user → premium content | `premiumToken` | `_gated: false`, `body` has content |
| 3 | Admin → premium content | `adminToken` | `_gated: false`, `body` has content |
| 4 | Free user → free content | `freeToken` | `_gated: false`, `body` has content |

### What this proves

- Premium content body/video is **never sent** to non-subscribers
- The gating happens server-side, not client-side
- Admin and premium users both get full access

---

## Folder 6: Subscription

| # | Request | Token | Expected |
|---|---------|-------|----------|
| 1 | `GET /subscriptions/me` | `premiumToken` | `200` — `status: "ACTIVE"`, `plan: "MONTHLY"` |
| 2 | `POST /subscriptions/upgrade` `{ plan: "MONTHLY" }` | `freeToken` | `201` — upgraded |
| 3 | `DELETE /subscriptions/cancel` | `freeToken` | `200` — cancelled |
| 4 | `GET /subscriptions/me` | (none) | `401` |

### After cancellation test

After running cancel (request #3), re-login as free user and try accessing premium content again — it should be gated.

---

## Folder 7: Tags

| # | Request | Expected |
|---|---------|----------|
| 1 | `GET /tags` | `200` — array of 5 tags |
| 2 | `GET /tags/nutrition` | `200` — tag with `name: "Nutrition"` and associated content |

---

## Folder 8: CMS Sync

### Webhook lifecycle (simulates Strapi → NestJS)

| # | Request | Expected |
|---|---------|----------|
| 1 | Webhook: create premium article (id: 9999) | `200` — `{ status: "synced" }` |
| 2 | Verify: premium user reads new article | `200` — `_gated: false`, full body |
| 3 | Verify: free user reads new article | `200` — `_gated: true`, `body: null` |
| 4 | Webhook: update article (id: 9999) | `200` — `{ status: "synced" }` |
| 5 | Webhook: unpublish (id: 9999) | `200` — `{ status: "unpublished" }` |
| 6 | Webhook: publish (id: 9999) | `200` — `{ status: "published" }` |
| 7 | Webhook: delete (id: 9999) | `200` — `{ status: "deleted" }` |
| 8 | Webhook: unsupported model | `200` — `{ status: "ignored" }` |

### Full sync & access control

| # | Request | Token | Expected |
|---|---------|-------|----------|
| 9 | `POST /cms-sync/full-sync` | `adminToken` | `200/201` — `{ synced, errors, total }` |
| 10 | `POST /cms-sync/full-sync` | (none) | `401` |
| 11 | `POST /cms-sync/full-sync` | `freeToken` | `403` |

### End-to-end premium content flow

This is the scenario where **admin creates premium content in Strapi and premium user accesses it**:

1. Run request #1 (webhook create) — creates premium article via webhook
2. Run request #2 — premium user reads it → **full body returned, `_gated: false`**
3. Run request #3 — free user reads it → **body is null, `_gated: true`**

This proves the full pipeline: Strapi publish → webhook → NestJS upsert → content API → subscription gating.

---

## Running All Tests

In Postman, right-click the **Healthfulforu API** collection → **Run collection**. This runs all requests sequentially. The test scripts auto-save tokens, so the order matters:

1. Auth (saves tokens)
2. Everything else (uses tokens)

Expected: **all tests green** if the server is running with seeded data.

---

## Notes

- **Webhook signature**: In dev mode (`STRAPI_WEBHOOK_SECRET` empty), signature verification is skipped. The test requests don't include signatures for simplicity.
- **Full sync**: Will fail with a connection error if Strapi isn't running. That's expected in dev — the endpoint itself works correctly.
- **Token expiry**: Access tokens expire in 15 minutes. Re-run the Auth folder if tokens expire during testing.
