# Technical Specification: Instagram & TikTok Profile Calculator

## Architecture Overview

### System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend (Next.js)                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │  Landing Page │  │ Results Page │  │    Error Pages       │  │
│  │  - URL Input  │  │ - Analytics  │  │ - Invalid URL        │  │
│  │  - Validation │  │ - Metrics    │  │ - Private Profile    │  │
│  │  - Detection  │  │ - Content    │  │ - Not Found          │  │
│  └──────────────┘  └──────────────┘  │ - Rate Limited       │  │
│                                       └──────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     API Layer (Next.js API Routes)              │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  POST /api/profile                                       │  │
│  │  - Input validation (Zod)                                │  │
│  │  - Platform detection                                    │  │
│  │  - Cache check (in-memory, 5min TTL)                     │  │
│  │  - Profile scraping                                      │  │
│  │  - Response formatting                                   │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Scraping Layer                              │
│  ┌──────────────────┐  ┌──────────────────┐                    │
│  │  TikTok Scraper  │  │ Instagram Scraper │                    │
│  │  - HTML parsing  │  │  - HTML parsing   │                    │
│  │  - JSON extraction│ │  - JSON extraction│                    │
│  │  - Stats parsing │  │  - Stats parsing  │                    │
│  └──────────────────┘  └──────────────────┘                    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Data Layer (Future)                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │  PostgreSQL  │  │    Redis     │  │  Prisma ORM          │  │
│  │  - Profiles  │  │  - Cache     │  │  - Schema management │  │
│  │  - Metrics   │  │  - Rate limit│  │  - Migrations        │  │
│  │  - Content   │  │  - Sessions  │  │  - Type safety       │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | Next.js 14+ (App Router) | Server-side rendering, API routes |
| Styling | Tailwind CSS | Utility-first CSS framework |
| Icons | Lucide React | Icon library |
| Validation | Zod | Runtime type validation |
| Database | PostgreSQL | Persistent storage |
| ORM | Prisma | Database access & migrations |
| Cache | In-memory (Map) | Short-term caching (5min TTL) |
| Language | TypeScript | Type safety |

## Data Flow

### Profile Lookup Flow

```
1. User pastes URL
2. Frontend validates URL format (regex)
3. Frontend detects platform (Instagram/TikTok)
4. POST /api/profile { url: "..." }
5. API validates with Zod schema
6. API checks cache
   - Cache HIT → return cached data
   - Cache MISS → continue
7. API calls platform-specific scraper
8. Scraper fetches profile page HTML
9. Scraper extracts JSON data from page
10. Scraper parses stats and recent content
11. Scraper calculates engagement rate
12. API caches response (5min TTL)
13. API returns profile data
14. Frontend encodes data in URL
15. Frontend navigates to /results?data=...
16. Results page decodes and displays data
```

## API Specification

### POST /api/profile

**Request:**
```json
{
  "url": "https://www.tiktok.com/@username"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "platform": "tiktok",
    "username": "username",
    "profileUrl": "https://www.tiktok.com/@username",
    "profilePicture": "https://...",
    "bio": "Creator bio text",
    "followers": 1000000,
    "following": 500,
    "postCount": 250,
    "avgViews": 50000,
    "avgLikes": 5000,
    "avgComments": 200,
    "avgShares": 100,
    "engagementRate": 0.53,
    "recentContent": [
      {
        "url": "https://www.tiktok.com/@username/video/123",
        "views": 100000,
        "likes": 10000,
        "comments": 500,
        "shares": 200,
        "postedAt": "2024-01-15T10:30:00Z"
      }
    ]
  }
}
```

**Error Response (4xx/5xx):**
```json
{
  "success": false,
  "error": {
    "code": "PRIVATE_PROFILE",
    "message": "This profile is set to private."
  }
}
```

## Database Schema

### Users Table
```sql
CREATE TABLE users (
  id          TEXT PRIMARY KEY DEFAULT cuid(),
  email       TEXT UNIQUE NOT NULL,
  plan        TEXT DEFAULT 'free',
  created_at  TIMESTAMP DEFAULT NOW(),
  updated_at  TIMESTAMP DEFAULT NOW()
);
```

### Profile Lookups Table
```sql
CREATE TABLE profile_lookups (
  id               TEXT PRIMARY KEY DEFAULT cuid(),
  platform         TEXT NOT NULL,
  username         TEXT NOT NULL,
  profile_url      TEXT NOT NULL,
  profile_picture  TEXT,
  bio              TEXT,
  followers        INTEGER,
  following        INTEGER,
  post_count       INTEGER,
  avg_views        FLOAT,
  avg_likes        FLOAT,
  avg_comments     FLOAT,
  avg_shares       FLOAT,
  engagement_rate  FLOAT,
  created_at       TIMESTAMP DEFAULT NOW(),
  updated_at       TIMESTAMP DEFAULT NOW(),
  user_id          TEXT REFERENCES users(id)
);

CREATE INDEX idx_profile_lookups_platform_username 
  ON profile_lookups(platform, username);
CREATE INDEX idx_profile_lookups_created_at 
  ON profile_lookups(created_at);
```

### Content Metrics Table
```sql
CREATE TABLE content_metrics (
  id                TEXT PRIMARY KEY DEFAULT cuid(),
  content_url       TEXT NOT NULL,
  content_type      TEXT,
  views             INTEGER,
  likes             INTEGER,
  comments          INTEGER,
  shares            INTEGER,
  posted_at         TIMESTAMP,
  created_at        TIMESTAMP DEFAULT NOW(),
  profile_lookup_id TEXT NOT NULL REFERENCES profile_lookups(id)
);

CREATE INDEX idx_content_metrics_profile_lookup_id 
  ON content_metrics(profile_lookup_id);
```

## Engagement Rate Formulas

### Instagram
```
Engagement Rate = ((Average Likes + Average Comments) / Followers) × 100
```

### TikTok
```
Engagement Rate = ((Average Likes + Average Comments + Average Shares) / Followers) × 100
```

## Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `INVALID_URL` | 400 | URL format is invalid |
| `PRIVATE_PROFILE` | 403 | Profile is set to private |
| `NOT_FOUND` | 404 | Profile does not exist |
| `RATE_LIMITED` | 429 | Too many requests |
| `SCRAPING_FAILED` | 500 | Failed to fetch profile data |

## Performance Targets

| Metric | Target |
|--------|--------|
| First Contentful Paint | < 1.5s |
| Largest Contentful Paint | < 2.5s |
| Time to Interactive | < 3.5s |
| API Response Time | < 5s |
| Cache Hit Rate | > 30% |

## Security Considerations

1. **Input Validation**: All URLs validated with Zod schemas
2. **Rate Limiting**: Implement per-IP rate limiting (future)
3. **Caching**: Reduce load on target platforms
4. **Error Handling**: Graceful degradation with user-friendly messages
5. **No Credential Storage**: No user authentication in MVP

## Deployment Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Vercel / AWS                          │
│  ┌────────────────────────────────────────────────────┐ │
│  │  Next.js Application                               │ │
│  │  - Static assets (CDN)                             │ │
│  │  - Serverless functions (API routes)                │ │
│  │  - Edge functions (middleware)                      │ │
│  └────────────────────────────────────────────────────┘ │
│                          │                               │
│                          ▼                               │
│  ┌────────────────────────────────────────────────────┐ │
│  │  Database (PostgreSQL)                             │ │
│  │  - Managed database service                        │ │
│  │  - Connection pooling                              │ │
│  │  - Automated backups                               │ │
│  └────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

## Future Enhancements

### Phase 2
- [ ] User authentication
- [ ] Database integration
- [ ] Redis caching
- [ ] Historical tracking
- [ ] CSV/PDF export

### Phase 3
- [ ] Bulk analysis
- [ ] Team accounts
- [ ] API access
- [ ] White-label reports
- [ ] Campaign comparison

## Monitoring & Observability

### Metrics to Track
- Profile lookup volume (by platform)
- Error rates (by error code)
- API response times
- Cache hit/miss rates
- User engagement (searches per session)

### Logging
- All API requests with timestamps
- Error details with stack traces
- Performance metrics
- Cache statistics