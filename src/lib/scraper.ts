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
  const tried: string[] = []
  const errors: string[] = []

  if (process.env.SCRAPFLY_API_KEY) {
    tried.push('scrapfly')
    try {
      if (platform === 'tiktok') {
        const { scrapeTikTokViaScrapfly } = await import('./scrapers/tiktok-scrapfly')
        return await scrapeTikTokViaScrapfly(username)
      } else {
        const { scrapeInstagramViaScrapfly } = await import('./scrapers/instagram-scrapfly')
        return await scrapeInstagramViaScrapfly(username, isReels)
      }
    } catch (err: any) {
      const msg = err instanceof Error ? err.message : String(err)
      errors.push(`scrapfly: ${msg}`)
      console.warn(`[scraper] Scrapfly failed for ${platform}/${username}: ${msg}`)
    }
  }

  if (process.env.APIFY_API_KEY) {
    tried.push('apify')
    try {
      if (platform === 'tiktok') {
        const { scrapeTikTokViaApify } = await import('./scrapers/tiktok-apify')
        return await scrapeTikTokViaApify(username)
      } else {
        const { scrapeInstagramViaApify } = await import('./scrapers/instagram-apify')
        return await scrapeInstagramViaApify(username, isReels)
      }
    } catch (err: any) {
      const msg = err instanceof Error ? err.message : String(err)
      errors.push(`apify: ${msg}`)
      console.error(`[scraper] Apify fallback failed for ${platform}/${username}: ${msg}`)
    }
  }

  if (tried.length === 0) {
    throw new ProfileError(
      'No scraper configured. Set SCRAPFLY_API_KEY or APIFY_API_KEY.',
      'SCRAPING_FAILED'
    )
  }

  throw new ProfileError(
    `All scrapers failed (${tried.join(', ')}). ${errors[errors.length - 1] || ''}`,
    'SCRAPING_FAILED'
  )
}
