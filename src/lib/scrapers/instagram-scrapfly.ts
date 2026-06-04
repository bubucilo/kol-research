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
  const scrapeUrl = isReels ? reelsUrl : profileUrl

  try {
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
    const picMatch =
      html.match(/"profile_pic_url_hd":"([^"]*)"/) ||
      html.match(/"profile_pic_url":"([^"]*)"/)

    if (followersMatch) followers = parseInt(followersMatch[1])
    if (followingMatch) following = parseInt(followingMatch[1])
    if (postsMatch) postCount = parseInt(postsMatch[1])
    if (bioMatch) bio = bioMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"')
    if (picMatch) profilePicture = picMatch[1].replace(/\\u0026/g, '&')

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

    if (!profilePicture) {
      const ogImage = html.match(/<meta property="og:image" content="([^"]*)"/)
      if (ogImage) profilePicture = ogImage[1].replace(/\\u0026/g, '&')
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
      const postLinks: string[] = []
      const linkMatches = html.matchAll(/href="(\/p\/[A-Za-z0-9_-]+\/)"/g)
      for (const match of linkMatches) {
        if (postLinks.length >= POSTS_TO_SCRAPE) break
        postLinks.push(`https://www.instagram.com${match[1]}`)
      }

      const reelsMatches = html.matchAll(/href="(\/reel\/[A-Za-z0-9_-]+\/)"/g)
      for (const match of reelsMatches) {
        if (postLinks.length >= POSTS_TO_SCRAPE) break
        postLinks.push(`https://www.instagram.com${match[1]}`)
      }

      const seen = new Set<string>()
      const uniqueLinks = postLinks.filter((link) => {
        if (seen.has(link)) return false
        seen.add(link)
        return true
      })

      const linksToProcess = uniqueLinks.slice(POSTS_TO_SKIP, POSTS_TO_SCRAPE)

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
          }
        } catch {}
      }
    } catch {}

    const sumViews = recentContent.reduce((sum, v) => sum + v.views, 0)
    const sumLikes = recentContent.reduce((sum, v) => sum + v.likes, 0)
    const sumComments = recentContent.reduce((sum, v) => sum + v.comments, 0)

    const avgViews = recentContent.length > 0 ? Math.round(sumViews / recentContent.length) : 0
    const avgLikes = recentContent.length > 0 ? Math.round(sumLikes / recentContent.length) : 0
    const avgComments = recentContent.length > 0 ? Math.round(sumComments / recentContent.length) : 0

    const engagementRate =
      sumViews > 0
        ? Math.round(((sumLikes + sumComments) / sumViews) * 10000) / 100
        : 0

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