import { z } from 'zod'

export const profileUrlSchema = z.object({
  url: z.string().url('Please enter a valid URL'),
})

export interface ProfileData {
  platform: 'tiktok' | 'instagram'
  username: string
  profileUrl: string
  profilePicture: string | null
  bio: string | null
  followers: number
  following: number | null
  postCount: number
  avgViews: number
  avgLikes: number
  avgComments: number
  avgShares: number
  engagementRate: number
  recentContent: ContentItem[]
}

export interface ContentItem {
  url: string
  views: number
  likes: number
  comments: number
  shares: number
  postedAt: string | null
}

export class ProfileError extends Error {
  constructor(
    message: string,
    public code: 'INVALID_URL' | 'PRIVATE_PROFILE' | 'NOT_FOUND' | 'RATE_LIMITED' | 'SCRAPING_FAILED'
  ) {
    super(message)
    this.name = 'ProfileError'
  }
}

export interface KOLContact {
  id: string
  rowNo: number | null
  name: string | null
  profileUrl: string
  platform: 'instagram' | 'tiktok'
  username: string
  categories: string | null
  followers: number | null
  tier: string | null
  erPercent: number | null
  avgViews: number | null
  gmv: number | null
  scopeQty: number | null
  scopeOfWork: string | null
  rateIdr: number | null
  remarks: string | null
  domisili: string | null
  contact: string | null
  status: string | null
  importedAt: string
  updatedAt: string
}

export interface MergedKOL {
  // Identity (from KOLContacts)
  id: string
  platform: 'instagram' | 'tiktok'
  username: string
  profileUrl: string
  name: string | null
  contact: string | null
  rateIdr: number | null
  categories: string | null
  domisili: string | null
  tier: string | null
  scopeOfWork: string | null
  scopeQty: number | null
  remarks: string | null
  status: string | null

  // Engagement (from ProfileLookup if scraped, else from KOLContacts baseline)
  followers: number | null
  avgViews: number | null
  avgLikes: number | null
  avgComments: number | null
  avgShares: number | null
  engagementRate: number | null
  profilePicture: string | null
  bio: string | null
  postCount: number | null
  lastSearchedAt: string | null
  hasScrapedData: boolean
}