# Healthfulforu.com v2.0 — Entity Relationship Diagram

## Mermaid ERD

```mermaid
erDiagram
    User ||--o{ Subscription : has
    User ||--o{ UserPreference : has
    User ||--o{ Content : authors
    User }o--o{ Role : has
    Content }o--o{ Tag : tagged_with
    Tag ||--o| Tag : parent_of

    User {
        uuid id PK
        string email UK
        string password
        string firstName
        string lastName
        string avatarUrl
        boolean isActive
        datetime createdAt
        datetime updatedAt
    }

    Role {
        uuid id PK
        string name UK
        string description
        datetime createdAt
    }

    Subscription {
        uuid id PK
        uuid userId FK
        enum plan "FREE | MONTHLY | YEARLY"
        enum status "ACTIVE | CANCELLED | EXPIRED | PAST_DUE"
        datetime startDate
        datetime endDate
        string stripeCustomerId
        datetime createdAt
        datetime updatedAt
    }

    UserPreference {
        uuid id PK
        uuid userId FK
        uuid topicId FK
        boolean emailDigest
        boolean pushNotifications
        string language
        datetime createdAt
    }

    Content {
        uuid id PK
        string title
        string slug UK
        enum type "ARTICLE | VIDEO"
        text body
        string excerpt
        string thumbnailUrl
        string videoUrl
        boolean isPremium
        enum status "DRAFT | PUBLISHED | ARCHIVED"
        datetime publishedAt
        uuid authorId FK
        string strapiId
        int viewCount
        int readTimeMinutes
        datetime createdAt
        datetime updatedAt
    }

    Tag {
        uuid id PK
        string name UK
        string slug UK
        string description
        uuid parentId FK
        datetime createdAt
    }
```

## Index Strategy

| Table | Index | Type | Purpose |
|-------|-------|------|---------|
| `User` | `email` | UNIQUE | Login lookup |
| `Content` | `slug` | UNIQUE | URL-friendly content access |
| `Content` | `status, publishedAt` | COMPOSITE | Published content listing |
| `Content` | `type, isPremium` | COMPOSITE | Content filtering |
| `Content` | `authorId` | BTREE | Author's content lookup |
| `Tag` | `slug` | UNIQUE | Tag URL lookup |
| `Subscription` | `userId, status` | COMPOSITE | Active subscription check |
| `UserPreference` | `userId` | BTREE | User preferences lookup |
