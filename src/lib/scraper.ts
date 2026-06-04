import { ProfileData, ProfileError } from './types'

export interface ScrapeAttempt {
  provider: 'scrapfly' | 'apify'
  ok: boolean
  error?: string
}

export interface ScrapeResult extends ProfileData {
  attempts: ScrapeAttempt[]
}

export async function scrapeProfile(
  url: string,
  options: { returnAttempts?: boolean } = {}
): Promise<ProfileData> {
  return scrapeProfileWithFallback(url, options)
}

export async function scrapeProfileWithFallback(
  url: string,
  options: { returnAttempts?: boolean } = {}
): Promise<ProfileData> {
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
  const attempts: ScrapeAttempt[] = []

  if (process.env.SCRAPFLY_API_KEY) {
    try {
      if (platform === 'tiktok') {
        const { scrapeTikTokViaScrapfly } = await import('./scrapers/tiktok-scrapfly')
        const data = await scrapeTikTokViaScrapfly(username)
        attempts.push({ provider: 'scrapfly', ok: true })
        return options.returnAttempts ? { ...data, attempts } : data
      } else {
        const { scrapeInstagramViaScrapfly } = await import('./scrapers/instagram-scrapfly')
        const data = await scrapeInstagramViaScrapfly(username, isReels)
        attempts.push({ provider: 'scrapfly', ok: true })
        return options.returnAttempts ? { ...data, attempts } : data
      }
    } catch (err: any) {
      const msg = err instanceof Error ? err.message : String(err)
      attempts.push({ provider: 'scrapfly', ok: false, error: msg })
      console.warn(`[scraper] Scrapfly failed for ${platform}/${username}: ${msg}`)
    }
  }

  if (process.env.APIFY_API_KEY) {
    try {
      if (platform === 'tiktok') {
        const { scrapeTikTokViaApify } = await import('./scrapers/tiktok-apify')
        const data = await scrapeTikTokViaApify(username)
        attempts.push({ provider: 'apify', ok: true })
        return options.returnAttempts ? { ...data, attempts } : data
      } else {
        const { scrapeInstagramViaApify } = await import('./scrapers/instagram-apify')
        const data = await scrapeInstagramViaApify(username, isReels)
        attempts.push({ provider: 'apify', ok: true })
        return options.returnAttempts ? { ...data, attempts } : data
      }
    } catch (err: any) {
      const msg = err instanceof Error ? err.message : String(err)
      attempts.push({ provider: 'apify', ok: false, error: msg })
      console.error(`[scraper] Apify fallback failed for ${platform}/${username}: ${msg}`)
    }
  }

  const tried = attempts.map((a) => a.provider).join(' + ') || 'no providers'
  const lastError = attempts[attempts.length - 1]?.error || 'No scraper configured'
  throw new ProfileError(
    `All scrapers failed (${tried}). Last error: ${lastError}`,
    'SCRAPING_FAILED'
  )
}
