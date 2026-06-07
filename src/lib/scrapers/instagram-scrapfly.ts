import { ProfileData, ProfileError, ContentItem } from '../types'
import { scrapeWithScrapfly } from '../scrapfly'

const POSTS_TO_SCRAPE = 15
const POSTS_TO_SKIP = 3

export async function scrapeInstagramViaScrapfly(
  username: string,
  isReels: boolean = false
): Promise<ProfileData> {
  const profileUrl = `https://www.instagram.com/${username}/`
  const reelsUrl = `https://www.instagram.com/${username}/reels/`

  try {
    // Step 1: Scrape profile page for metadata (followers, bio, pic, postCount)
    const profileResult = await scrapeWithScrapfly({
      url: profileUrl,
      asp: true,
      renderJs: true,
      country: 'us',
    })

    if (!profileResult.content) {
      throw new ProfileError(
        'No data returned from Instagram. The profile may not exist.',
        'NOT_FOUND'
      )
    }

    const html = profileResult.content

    const isPrivate = html.includes('"is_private":true') || html.includes('This account is private')
    if (isPrivate) {
      throw new ProfileError('This Instagram profile is private', 'PRIVATE_PROFILE')
    }

    const notFound = html.includes("Sorry, this page isn't available")
    if (notFound) {
      throw new ProfileError('Instagram profile not found', 'NOT_FOUND')
    }

    let followers = 0
    let following = 0
    let postCount = 0
    let bio = ''
    let profilePicture = ''

    const followersMatch = html.match(/"edge_followed_by":\{"count":(\d+)\}/)
    const followingMatch = html.match(/"edge_follow":\{"count":(\d+)\}/)
    const postsMatch = html.match(/"edge_owner_to_timeline_media":\{"count":(\d+)\}/)
    const bioMatch = html.match(/"biography":"([^"]*)"/)
    // Prefer og:image (480x480 typical) over profile_pic_url_hd (150x150).
    // The "HD" in profile_pic_url_hd is misleading — it's still Instagram's small
    // mobile-size variant, not high-res. og:image is the web-share variant and
    // is what we'd want for display.
    const ogImageMatch = html.match(/<meta property="og:image" content="([^"]*)"/)
    const picMatch =
      html.match(/"profile_pic_url_hd":"([^"]*)"/) ||
      html.match(/"profile_pic_url":"([^"]*)"/)

    if (followersMatch) followers = parseInt(followersMatch[1])
    if (followingMatch) following = parseInt(followingMatch[1])
    if (postsMatch) postCount = parseInt(postsMatch[1])
    if (bioMatch) bio = bioMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"')
    // Prefer og:image — it's the larger variant
    if (ogImageMatch) {
      profilePicture = ogImageMatch[1].replace(/\\u0026/g, '&')
    } else if (picMatch) {
      profilePicture = picMatch[1].replace(/\\u0026/g, '&')
    }

    if (followers === 0) {
      const metaDesc = html.match(/<meta name="description" content="([^"]*)"/)
      if (metaDesc) {
        const desc = metaDesc[1]
        const followersDesc = desc.match(/([\d,.]+[KMB]?)\s+Followers/i)
        const followingDesc = desc.match(/([\d,.]+[KMB]?)\s+Following/i)
        const postsDesc = desc.match(/([\d,.]+[KMB]?)\s+Posts/i)

        if (followersDesc) {
          const num = followersDesc[1]
          if (num.endsWith('M')) followers = Math.round(parseFloat(num) * 1000000)
          else if (num.endsWith('K')) followers = Math.round(parseFloat(num) * 1000)
          else followers = parseInt(num.replace(/,/g, '')) || 0
        }
        if (followingDesc) {
          const num = followingDesc[1]
          if (num.endsWith('M')) following = Math.round(parseFloat(num) * 1000000)
          else if (num.endsWith('K')) following = Math.round(parseFloat(num) * 1000)
          else following = parseInt(num.replace(/,/g, '')) || 0
        }
        if (postsDesc) {
          const num = postsDesc[1]
          if (num.endsWith('M')) postCount = Math.round(parseFloat(num) * 1000000)
          else if (num.endsWith('K')) postCount = Math.round(parseFloat(num) * 1000)
          else postCount = parseInt(num.replace(/,/g, '')) || 0
        }
      }
    }

    if (!bio) {
      const ogDesc = html.match(/<meta property="og:description" content="([^"]*)"/)
      if (ogDesc) {
        const desc = ogDesc[1]
        const bioMatch2 = desc.match(/- ([^"]*?) on/)
        if (bioMatch2) bio = bioMatch2[1]
      }
    }

    if (followers === 0 && postCount === 0) {
      throw new ProfileError(
        'Could not extract Instagram profile data.',
        'SCRAPING_FAILED'
      )
    }

    const recentContent: ContentItem[] = []

    try {
      // Step 2: Scrape /reels page for video links, fall back to profile page links
      console.log(`[instagram] @${username}: scraping /reels page for video links...`)
      const reelsResult = await scrapeWithScrapfly({
        url: reelsUrl,
        asp: true,
        renderJs: true,
        country: 'us',
      })

      const reelsHtml = reelsResult.content || ''

      // Extract reel links from /reels page — video-only, no image posts
      const postLinks: string[] = []
      const reelMatches = reelsHtml.matchAll(/href="(\/reel\/[A-Za-z0-9_-]+\/)"/g)
      for (const match of reelMatches) {
        if (postLinks.length >= POSTS_TO_SCRAPE + POSTS_TO_SKIP) break
        postLinks.push(`https://www.instagram.com${match[1]}`)
      }

      // Also grab /p/ links from reels page (some reels are served as /p/ URLs)
      const pMatchesReels = reelsHtml.matchAll(/href="(\/p\/[A-Za-z0-9_-]+\/)"/g)
      for (const match of pMatchesReels) {
        if (postLinks.length >= POSTS_TO_SCRAPE + POSTS_TO_SKIP) break
        postLinks.push(`https://www.instagram.com${match[1]}`)
      }

      // Fallback: if /reels page returned nothing, extract from profile page HTML
      if (postLinks.length === 0) {
        console.log(`[instagram] @${username}: /reels page returned 0 links, falling back to profile page`)
        const pMatchesProfile = html.matchAll(/href="(\/reel\/[A-Za-z0-9_-]+\/)"/g)
        for (const match of pMatchesProfile) {
          if (postLinks.length >= POSTS_TO_SCRAPE + POSTS_TO_SKIP) break
          postLinks.push(`https://www.instagram.com${match[1]}`)
        }
        const pMatchesProfile2 = html.matchAll(/href="(\/p\/[A-Za-z0-9_-]+\/)"/g)
        for (const match of pMatchesProfile2) {
          if (postLinks.length >= POSTS_TO_SCRAPE + POSTS_TO_SKIP) break
          postLinks.push(`https://www.instagram.com${match[1]}`)
        }
      }

      const seen = new Set<string>()
      const uniqueLinks = postLinks.filter((link) => {
        if (seen.has(link)) return false
        seen.add(link)
        return true
      })

      const linksToProcess = uniqueLinks.slice(POSTS_TO_SKIP, POSTS_TO_SCRAPE + POSTS_TO_SKIP)

      console.log(`[instagram] @${username}: ${uniqueLinks.length} unique video links, skipping ${Math.min(POSTS_TO_SKIP, uniqueLinks.length)} pinned, scraping ${linksToProcess.length} videos`)

      let scrapeSuccess = 0
      let scrapeFailed = 0
      let scrapeNoMeta = 0

      for (const postUrl of linksToProcess) {
        try {
          const postResult = await scrapeWithScrapfly({
            url: postUrl,
            asp: true,
            renderJs: true,
            country: 'us',
          })

          const postHtml = postResult.content
          const postMeta = postHtml.match(/<meta name="description" content="([^"]*)"/)
          if (postMeta) {
            const desc = postMeta[1]
            const likesMatch = desc.match(/([\d,.]+[KMB]?)\s+likes?/i)
            const commentsMatch = desc.match(/([\d,.]+[KMB]?)\s+comments?/i)
            const viewsMatch = desc.match(/([\d,.]+[KMB]?)\s+views?/i)

            const parseNum = (s: string): number => {
              if (!s) return 0
              s = s.replace(/,/g, '').trim()
              if (s.endsWith('M')) return Math.round(parseFloat(s) * 1000000)
              if (s.endsWith('K')) return Math.round(parseFloat(s) * 1000)
              if (s.endsWith('B')) return Math.round(parseFloat(s) * 1000000000)
              return parseInt(s) || 0
            }

            recentContent.push({
              url: postUrl,
              views: viewsMatch ? parseNum(viewsMatch[1]) : 0,
              likes: likesMatch ? parseNum(likesMatch[1]) : 0,
              comments: commentsMatch ? parseNum(commentsMatch[1]) : 0,
              shares: 0,
              postedAt: null,
            })
            scrapeSuccess++
          } else {
            scrapeNoMeta++
          }
        } catch {
          scrapeFailed++
        }
      }

      console.log(`[instagram] @${username}: scrape results — ${scrapeSuccess} succeeded, ${scrapeNoMeta} no meta tag, ${scrapeFailed} failed → ${recentContent.length} videos in final dataset`)
    } catch (e) {
      console.warn(`[instagram] @${username}: /reels page scrape failed:`, e)
    }

    // Only include videos with views > 0 in averages (Instagram doesn't show views on image/carousel posts)
    const videosWithViews = recentContent.filter((v) => v.views > 0)

    const sumViews = videosWithViews.reduce((sum, v) => sum + v.views, 0)
    const sumLikes = videosWithViews.reduce((sum, v) => sum + v.likes, 0)
    const sumComments = videosWithViews.reduce((sum, v) => sum + v.comments, 0)

    const avgViews = videosWithViews.length > 0 ? Math.round(sumViews / videosWithViews.length) : 0
    const avgLikes = videosWithViews.length > 0 ? Math.round(sumLikes / videosWithViews.length) : 0
    const avgComments = videosWithViews.length > 0 ? Math.round(sumComments / videosWithViews.length) : 0

    const rawEngagement =
      sumViews > 0
        ? Math.round(((sumLikes + sumComments) / sumViews) * 10000) / 100
        : 0

    // Cap engagement at 100% — if likes+comments exceed views, it's a data error
    // (carousels picked up, wrong meta parsed, etc). Log so we can investigate.
    const engagementRate = rawEngagement > 100 ? 100 : rawEngagement

    if (rawEngagement > 100) {
      console.warn(`[instagram] @${username}: engagement capped — raw=${rawEngagement}%, likes=${sumLikes}, comments=${sumComments}, views=${sumViews}, videosWithViews=${videosWithViews.length}/${recentContent.length}`)
    }

    console.log(`[instagram] @${username}: ${videosWithViews.length}/${recentContent.length} videos have views, avgViews=${avgViews}, avgLikes=${avgLikes}, engagement=${engagementRate}%${rawEngagement > 100 ? ` (raw was ${rawEngagement}%)` : ''}`)

    return {
      platform: 'instagram',
      username,
      profileUrl,
      profilePicture: profilePicture || null,
      bio: bio || null,
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
  } catch (error) {
    if (error instanceof ProfileError) throw error
    console.error('Scrapfly Instagram scraping error:', error)
    throw new ProfileError(
      'Failed to scrape Instagram profile via Scrapfly.',
      'SCRAPING_FAILED'
    )
  }
}