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