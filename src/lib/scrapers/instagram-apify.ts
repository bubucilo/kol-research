import { ProfileData, ProfileError, ContentItem } from '../types'
import { runApifyActor } from '../apify'

const ACTOR_ID = 'apify/instagram-profile-scraper'
const POSTS_TO_SCRAPE = 15
const POSTS_TO_SKIP = 3

type ApifyInstagramItem = {
  username?: string
  fullName?: string
  biography?: string
  externalUrl?: string | null
  followersCount?: number
  followsCount?: number
  postsCount?: number
  profilePicUrl?: string | null
  latestPosts?: Array<{
    type?: string
    shortCode?: string
    url?: string
    likesCount?: number
    commentsCount?: number
    videoViewCount?: number
    timestamp?: string
  }>
  isPrivate?: boolean
}

export async function scrapeInstagramViaApify(
  username: string,
  isReels: boolean = false
): Promise<ProfileData> {
  const url = isReels
    ? `https://www.instagram.com/${username}/reels/`
    : `https://www.instagram.com/${username}`

  let items: ApifyInstagramItem[]
  try {
    const result = await runApifyActor<ApifyInstagramItem>(ACTOR_ID, {
      usernames: [username],
      resultsType: 'details',
    })
    items = result.items
  } catch (error) {
    if (error instanceof ProfileError) throw error
    console.error('Apify Instagram scraping error:', error)
    throw new ProfileError(
      'Failed to scrape Instagram profile via Apify.',
      'SCRAPING_FAILED'
    )
  }

  if (!items || items.length === 0) {
    throw new ProfileError('Instagram profile not found.', 'NOT_FOUND')
  }

  const profile = items[0]
  if (profile.isPrivate) {
    throw new ProfileError('This Instagram profile is private.', 'PRIVATE_PROFILE')
  }

  const followers = profile.followersCount ?? 0
  const following = profile.followsCount ?? null
  const postCount = profile.postsCount ?? 0
  const profilePicture = profile.profilePicUrl ?? null
  const bio = profile.biography ?? null

  const posts = (profile.latestPosts ?? []).filter((p) => {
    if (isReels) return p.type === 'Video' || p.type === 'Reel'
    return true
  })

  const allContent = posts.map((p) => {
    const isVideo = p.type === 'Video' || p.type === 'Reel'
    const views = isVideo ? p.videoViewCount ?? 0 : 0
    return {
      url: p.url ?? (p.shortCode ? `https://www.instagram.com/p/${p.shortCode}/` : ''),
      views,
      likes: p.likesCount ?? 0,
      comments: p.commentsCount ?? 0,
      shares: 0,
      postedAt: p.timestamp ?? null,
    }
  }).filter((c) => c.url)

  const recentContent: ContentItem[] = allContent
    .slice(POSTS_TO_SKIP, POSTS_TO_SCRAPE)
    .map((c) => ({
      url: c.url,
      views: c.views,
      likes: c.likes,
      comments: c.comments,
      shares: c.shares,
      postedAt: c.postedAt,
    }))

  const sumViews = recentContent.reduce((sum, c) => sum + c.views, 0)
  const sumLikes = recentContent.reduce((sum, c) => sum + c.likes, 0)
  const sumComments = recentContent.reduce((sum, c) => sum + c.comments, 0)

  const avgViews = recentContent.length > 0 ? Math.round(sumViews / recentContent.length) : 0
  const avgLikes = recentContent.length > 0 ? Math.round(sumLikes / recentContent.length) : 0
  const avgComments = recentContent.length > 0 ? Math.round(sumComments / recentContent.length) : 0

  const engagementRate =
    isReels && sumViews > 0
      ? Math.round(((sumLikes + sumComments) / sumViews) * 10000) / 100
      : followers > 0
        ? Math.round(((sumLikes + sumComments) / followers) * 10000) / 100
        : 0

  return {
    platform: 'instagram',
    username,
    profileUrl: url,
    profilePicture,
    bio,
    followers,
    following,
    postCount,
    avgViews,
    avgLikes,
    avgComments,
    avgShares: 0,
    engagementRate,
    recentContent,
  }
}
