# Profile Calculator

Analyze any public Instagram or TikTok profile instantly. Get engagement rates, average views, and content performance metrics.

## Features

- **Platform Detection**: Automatically detects Instagram or TikTok URLs
- **Profile Analytics**: Follower count, post count, average views, likes, comments
- **Engagement Rate**: Views-based formula for accurate measurement
- **Recent Content**: View performance of latest posts/videos (12 posts, skip 3 pinned)
- **Instagram Reels**: Support for `/reels/` URL for video-only metrics
- **Error Handling**: User-friendly messages for private/not found profiles
- **Caching**: 5-minute cache for faster repeated lookups
- **Mobile Friendly**: Responsive design for all devices

## Supported Formats

- Instagram: `instagram.com/username` or `instagram.com/username/reels/`
- TikTok: `tiktok.com/@username`

## Tech Stack

- **Framework**: Next.js 16+ (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Validation**: Zod
- **Scraping**: Scrapfly API (primary) + Playwright (fallback)

## Getting Started

### Prerequisites

- Node.js 18+
- npm
- Scrapfly API key (get from https://scrapfly.io/register — 1,000 free credits)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd social-profile-calculator
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
# .env
SCRAPFLY_API_KEY="scp-live-your-key-here"
```

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000)

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   └── profile/
│   │       └── route.ts          # Profile lookup API
│   ├── error/
│   │   └── page.tsx              # Error page
│   ├── results/
│   │   └── page.tsx              # Results page
│   ├── layout.tsx                # Root layout
│   ├── page.tsx                  # Landing page
│   └── globals.css               # Global styles
├── components/
│   ├── footer.tsx                # Footer component
│   ├── header.tsx                # Header component
│   └── loading.tsx               # Loading spinner
├── lib/
│   ├── scrapfly.ts              # Scrapfly HTTP client
│   ├── browser.ts               # Playwright browser manager (fallback)
│   ├── scraper.ts               # Main scraper (routes to Scrapfly/Playwright)
│   ├── scrapers/
│   │   ├── tiktok-scrapfly.ts   # TikTok via Scrapfly (XHR interception)
│   │   ├── tiktok.ts            # TikTok via Playwright (fallback)
│   │   ├── instagram-scrapfly.ts # Instagram via Scrapfly
│   │   ├── instagram.ts         # Instagram via Playwright (fallback)
│   │   ├── tiktok-apify.ts      # TikTok via Apify (legacy)
│   │   └── instagram-apify.ts   # Instagram via Apify (legacy)
│   ├── apify.ts                 # Apify client (legacy)
│   ├── types.ts                 # TypeScript interfaces
│   └── utils.ts                 # Utility functions
└── generated/
    └── prisma/                   # Prisma generated types
```

## API Endpoints

### POST /api/profile

Analyze a profile URL.

**Request:**
```json
{
  "url": "https://www.tiktok.com/@username"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "platform": "tiktok",
    "username": "username",
    "followers": 1000000,
    "postCount": 250,
    "avgViews": 50000,
    "avgLikes": 5000,
    "avgComments": 200,
    "engagementRate": 1.04,
    "recentContent": [...]
  }
}
```

## Engagement Rate Formula

Both platforms use a views-based formula:

```
Engagement Rate = ((Sum Likes + Sum Comments + Sum Shares) / Sum Views) × 100
```

Calculated from the 12 most recent posts (skipping first 3 pinned).

## Scraping Architecture

```
User Request → API Route → scraper.ts
                              │
                              ├─ SCRAPFLY_API_KEY set? (cheapest, most reliable)
                              │   ├─ YES → Use Scrapfly
                              │   │        ├─ TikTok: XHR interception for video data
                              │   │        ├─ Instagram: Meta tags + DOM extraction
                              │   │        └─ Failed → Fall back to Playwright
                              │   └─ NO → Skip
                              │
                              ├─ APIFY_API_KEY set? (legacy)
                              │   └─ Fallback if Scrapfly fails
                              │
                              └─ Playwright (free fallback, limited data)
```

## Cost Comparison

| Solution | Cost/Profile | Cost @ 1000/mo | Data Quality |
|----------|-------------|----------------|--------------|
| **Scrapfly** | ~$0.03 | **~$6** | ✅ Excellent |
| Apify | ~$0.10 | ~$100 | ✅ Excellent |
| Playwright (fallback) | $0 | $0 | ⚠️ Limited |

## Error Codes

| Code | Description |
|------|-------------|
| `INVALID_URL` | URL format is invalid |
| `PRIVATE_PROFILE` | Profile is set to private |
| `NOT_FOUND` | Profile does not exist |
| `RATE_LIMITED` | Too many requests |
| `SCRAPING_FAILED` | Failed to fetch profile data |

## Documentation

- [Technical Specification](TECHNICAL_SPEC.md)
- [Project Plan](PROJECT_PLAN.md)
- [PRD Review](PRD_REVIEW.md)

## Known Limitations

- **Scraping Reliability**: Platforms actively block automated scraping
- **Private Profiles**: Cannot analyze private profiles
- **Rate Limiting**: May be rate-limited by platforms
- **Data Accuracy**: Metrics are estimates based on recent content

## Future Enhancements

- [ ] User authentication
- [ ] Database integration
- [ ] Historical tracking
- [ ] CSV/PDF export
- [ ] Bulk analysis
- [ ] API access
- [ ] White-label reports

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License.

## Disclaimer

This tool is for educational and research purposes only. Data is fetched from public profiles and may not be 100% accurate. Use at your own risk.