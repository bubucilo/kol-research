import { ProfileData, ProfileError, ContentItem } from '../types'
import { scrapeWithScrapfly } from '../scrapfly'

const POSTS_TO_SCRAPE = 15
const POSTS_TO_SKIP = 3

export async function scrapeTikTokViaScrapfly(
  username: string
): Promise<ProfileData> {
  const url = `https://www.tiktok.com/@${username}`

  try {
    // Use SG proxy — 'us' fails to trigger post/item_list XHR for Indonesian accounts
    const result = await scrapeWithScrapfly({
      url,
      asp: true,
      renderJs: true,
      country: 'sg',
      renderingWait: 8000,
      autoScroll: true,
    })

    const html = result.content

    const isPrivate = html.includes('"privateAccount":true')
    if (isPrivate) {
      throw new ProfileError('This TikTok profile is private', 'PRIVATE_PROFILE')
    }

    const notFound = html.includes("couldn't find this account")
    if (notFound) {
      throw new ProfileError('TikTok profile not found', 'NOT_FOUND')
    }

    const followersMatch = html.match(/"followerCount":(\d+)/)
    const followingMatch = html.match(/"followingCount":(\d+)/)
    const videoMatch = html.match(/"videoCount":(\d+)/)
    const avatarMatch = html.match(/"avatarLarger":"([^"]+)"/)
    const bioMatch = html.match(/"signature":"([^"]*)"/)

    const followers = followersMatch ? parseInt(followersMatch[1]) : 0
    const following = followingMatch ? parseInt(followingMatch[1]) : null
    const videoCount = videoMatch ? parseInt(videoMatch[1]) : 0
    // avatarLarger URL has JSON unicode escapes (\\u002F for '/', \\u0026 for '&', etc.)
    // Wrap in quotes and JSON.parse to decode all of them in one shot.
    // Fallback to a manual regex decode if JSON.parse fails for any reason.
    const profilePicture = avatarMatch
      ? (() => {
          try {
            return JSON.parse('"' + avatarMatch[1] + '"')
          } catch {
            return avatarMatch[1].replace(/\\u([0-9a-fA-F]{4})/g, (_m, hex) =>
              String.fromCharCode(parseInt(hex, 16))
            )
          }
        })()
      : null
    const bio = bioMatch ? bioMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"') : null

    const allVideos: Array<{
      id: string
      playCount: number
      diggCount: number
      commentCount: number
      shareCount: number
    }> = []

    const xhrCalls = result.browserData?.xhr_call || []
    let xhrWithItems = 0
    let xhrParseFailed = 0
    for (const xhr of xhrCalls) {
      const respBody = xhr?.response?.body || ''
      if (!respBody.includes('itemList')) continue

      try {
        const data = JSON.parse(respBody)
        const items = data?.itemList || []
        xhrWithItems++
        for (const item of items) {
          const stats = item?.stats
          if (stats && typeof stats.playCount === 'number') {
            allVideos.push({
              id: item.id || '',
              playCount: stats.playCount,
              diggCount: stats.diggCount || 0,
              commentCount: stats.commentCount || 0,
              shareCount: stats.shareCount || 0,
            })
          }
        }
      } catch {
        xhrParseFailed++
      }
    }

    console.log(`[tiktok] @${username}: captured ${xhrCalls.length} XHR calls, ${xhrWithItems} had itemList, ${xhrParseFailed} parse failed → ${allVideos.length} total videos before slicing`)

    const recentVideos = allVideos.slice(POSTS_TO_SKIP, POSTS_TO_SCRAPE)

    console.log(`[tiktok] @${username}: skipped first ${Math.min(POSTS_TO_SKIP, allVideos.length)} (pinned), ${recentVideos.length} videos in final dataset`)

    const recentContent: ContentItem[] = recentVideos.map((video) => ({
      url: `https://www.tiktok.com/@${username}/video/${video.id}`,
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

    const rawEngagement =
      sumViews > 0
        ? Math.round(((sumLikes + sumComments + sumShares) / sumViews) * 10000) / 100
        : 0

    // Cap engagement at 100% — if likes+comments+shares exceed views, it's a data error
    const engagementRate = rawEngagement > 100 ? 100 : rawEngagement

    if (rawEngagement > 100) {
      console.warn(`[tiktok] @${username}: engagement capped — raw=${rawEngagement}%, likes=${sumLikes}, comments=${sumComments}, shares=${sumShares}, views=${sumViews}`)
    }

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
  } catch (error) {
    if (error instanceof ProfileError) throw error
    console.error('Scrapfly TikTok scraping error:', error)
    throw new ProfileError(
      'Failed to scrape TikTok profile via Scrapfly.',
      'SCRAPING_FAILED'
    )
  }
}