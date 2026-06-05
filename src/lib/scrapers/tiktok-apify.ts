import { ProfileData, ProfileError, ContentItem } from '../types'
import { runApifyActor } from '../apify'

// NOTE: clockworks/tiktok-profile-scraper returns REPOSTS only, not original posts.
// For accounts that don't repost, the actor returns 0 videos with note
// "Profile has no reposts (or is behind a login wall)".
// This is a known actor limitation. Scrapfly primary path handles original posts.
// For Indonesian accounts, Scrapfly should use country='sg' (not 'us').

const ACTOR_ID = 'clockworks/tiktok-profile-scraper'
const POSTS_TO_SCRAPE = 15
const POSTS_TO_SKIP = 3

type ApifyTikTokItem = {
  id?: string
  authorMeta?: {
    id?: string
    name?: string
    profileUrl?: string
    nickName?: string
    signature?: string
    bioLink?: string
    avatar?: string
    verified?: boolean
    fans?: number
    following?: number
    video?: number
  }
  webVideoUrl?: string
  playCount?: number
  diggCount?: number
  commentCount?: number
  shareCount?: number
  collectCount?: number
  repostCount?: number
}

export async function scrapeTikTokViaApify(
  username: string
): Promise<ProfileData> {
  const url = `https://www.tiktok.com/@${username}`

  let items: ApifyTikTokItem[]
  try {
    const result = await runApifyActor<ApifyTikTokItem>(ACTOR_ID, {
      profiles: [username],
      resultsPerPage: POSTS_TO_SCRAPE,
      shouldDownloadVideos: false,
      shouldDownloadCovers: false,
    })
    items = result.items
  } catch (error) {
    if (error instanceof ProfileError) throw error
    console.error('Apify TikTok scraping error:', error)
    throw new ProfileError(
      'Failed to scrape TikTok profile via Apify.',
      'SCRAPING_FAILED'
    )
  }

  if (!items || items.length === 0) {
    throw new ProfileError('TikTok profile not found or has no posts.', 'NOT_FOUND')
  }

  const firstAuthor = items[0]?.authorMeta
  const followers = firstAuthor?.fans ?? 0
  const following = firstAuthor?.following ?? null
  const videoCount = firstAuthor?.video ?? 0
  const profilePicture = firstAuthor?.avatar ?? null
  const bio = firstAuthor?.signature ?? null

  const allVideos = items
    .filter((it) => typeof it.playCount === 'number' && it.webVideoUrl)
    .map((it) => ({
      url: it.webVideoUrl ?? '',
      playCount: it.playCount ?? 0,
      diggCount: it.diggCount ?? 0,
      commentCount: it.commentCount ?? 0,
      shareCount: it.shareCount ?? 0,
    }))

  const recentVideos = allVideos.slice(POSTS_TO_SKIP, POSTS_TO_SCRAPE)

  const recentContent: ContentItem[] = recentVideos.map((video) => ({
    url: video.url,
    views: video.playCount,
    likes: video.diggCount,
    comments: video.commentCount,
    shares: video.shareCount,
    postedAt: null,
  }))

  const sumViews = recentContent.reduce((sum, v) => sum + v.views, 0)
  const sumLikes = recentContent.reduce((sum, v) => sum + v.likes, 0)
  const sumComments = recentContent.reduce((sum, v) => sum + v.comments, 0)
  const sumShares = recentContent.reduce((sum, v) => sum + v.shares, 0)

  const avgViews = recentContent.length > 0 ? Math.round(sumViews / recentContent.length) : 0
  const avgLikes = recentContent.length > 0 ? Math.round(sumLikes / recentContent.length) : 0
  const avgComments = recentContent.length > 0 ? Math.round(sumComments / recentContent.length) : 0
  const avgShares = recentContent.length > 0 ? Math.round(sumShares / recentContent.length) : 0

  const engagementRate =
    sumViews > 0
      ? Math.round(((sumLikes + sumComments + sumShares) / sumViews) * 10000) / 100
      : 0

  return {
    platform: 'tiktok',
    username,
    profileUrl: url,
    profilePicture,
    bio,
    followers,
    following,
    postCount: videoCount,
    avgViews,
    avgLikes,
    avgComments,
    avgShares,
    engagementRate,
    recentContent,
  }
}
