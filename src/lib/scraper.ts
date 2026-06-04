import { ProfileData, ProfileError } from './types'

export async function scrapeProfile(url: string): Promise<ProfileData> {
  const { detectPlatform, extractUsername, isInstagramReelsUrl } = await import('./utils')

  const platform = detectPlatform(url)
  if (!platform) {
    throw new ProfileError(
      'Invalid profile URL. Please enter a valid Instagram or TikTok profile link.',
      'INVALID_URL'
    )
  }

  const username = extractUsername(url, platform)
  if (!username) {
    throw new ProfileError('Could not extract username from URL.', 'INVALID_URL')
  }

  const isReels = platform === 'instagram' && isInstagramReelsUrl(url)
  const hasScrapflyKey = !!process.env.SCRAPFLY_API_KEY

  if (hasScrapflyKey) {
    if (platform === 'tiktok') {
      const { scrapeTikTokViaScrapfly } = await import('./scrapers/tiktok-scrapfly')
      return await scrapeTikTokViaScrapfly(username)
    } else {
      const { scrapeInstagramViaScrapfly } = await import('./scrapers/instagram-scrapfly')
      return await scrapeInstagramViaScrapfly(username, isReels)
    }
  }

  throw new ProfileError(
    'SCRAPFLY_API_KEY is not configured. Please set it in your environment variables.',
    'SCRAPING_FAILED'
  )
}