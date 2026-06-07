import { NextRequest, NextResponse } from 'next/server'
import { scrapeProfile } from '@/lib/scraper'
import { profileUrlSchema } from '@/lib/types'
import { ProfileError } from '@/lib/types'
import { detectPlatform, extractUsername } from '@/lib/utils'
import { getCachedProfile, saveProfile, getClient } from '@/lib/db'
import { uploadAvatar } from '@/lib/storage'

export const maxDuration = 120
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { url } = profileUrlSchema.parse(body)

    const platform = detectPlatform(url)
    const username = extractUsername(url, platform || 'tiktok')

    if (platform && username) {
      try {
        const cached = await getCachedProfile(platform, username)
        if (cached) {
          return NextResponse.json({
            success: true,
            data: cached,
            cached: true,
          })
        }
      } catch (dbError) {
        console.warn('DB cache lookup failed, falling back to scrape:', dbError)
      }
    }

    const profileData = await scrapeProfile(url)

    if (platform && username && profileData.profilePicture) {
      try {
        const uploadedUrl = await uploadAvatar(
          profileData.profilePicture,
          profileData.platform,
          profileData.username
        )
        if (uploadedUrl) {
          profileData.profilePicture = uploadedUrl
        } else {
          console.warn(`[profile] Avatar upload failed for ${profileData.username}, keeping original URL`)
        }
      } catch (uploadErr) {
        console.warn('[profile] Avatar upload error:', uploadErr)
      }
    }

    // Skip DB save if scrape returned no video data — don't cache incomplete results
    // (e.g. Apify returns profile metadata but 0 videos for some accounts)
    const shouldSave = profileData.recentContent.length > 0

    if (platform && username && shouldSave) {
      try {
        await saveProfile(profileData)
      } catch (dbError) {
        console.warn('Failed to save to DB:', dbError)
      }
    }

    // Always upsert a stub to KOLContacts so searched profiles appear in Discovery
    // (CSV import later can fill in business data: contact, rate, niche, domisili)
    if (platform && username) {
      try {
        const supabase = getClient()
        const { data: existing } = await supabase
          .from('KOLContacts')
          .select('id, followers, erPercent, avgViews, name')
          .eq('platform', platform)
          .eq('username', username)
          .maybeSingle()

        if (!existing) {
          // First search — create stub with engagement baseline
          await supabase.from('KOLContacts').upsert(
            {
              platform,
              username,
              profileUrl: profileData.profileUrl,
              name: null,
              followers: profileData.followers,
              erPercent: profileData.engagementRate,
              avgViews: profileData.avgViews,
              status: 'cold',
            },
            { onConflict: 'platform,username' }
          )
        } else {
          // Existing row — fill in engagement baseline only if missing
          const updates: any = {}
          if (existing.followers == null && profileData.followers) updates.followers = profileData.followers
          if (existing.erPercent == null && profileData.engagementRate)
            updates.erPercent = profileData.engagementRate
          if (existing.avgViews == null && profileData.avgViews) updates.avgViews = profileData.avgViews
          if (Object.keys(updates).length > 0) {
            await supabase.from('KOLContacts').update(updates).eq('id', existing.id)
          }
        }
      } catch (stubErr) {
        console.warn('[profile] Failed to upsert KOLContacts stub:', stubErr)
      }
    }

    // Fetch matching KOLContacts row (CRM data) so /results can show business info
    let crm: any = null
    if (platform && username) {
      try {
        const { data: crmRow } = await getClient()
          .from('KOLContacts')
          .select(
            'id, name, contact, rates, primaryRate, categories, domisili, tier, remarks, status'
          )
          .eq('platform', platform)
          .eq('username', username)
          .maybeSingle()
        crm = crmRow
      } catch (crmErr) {
        console.warn('[profile] Failed to fetch KOLContacts:', crmErr)
      }
    }

    return NextResponse.json({
      success: true,
      data: profileData,
      crm,
    })
  } catch (error) {
    if (error instanceof ProfileError) {
      const statusMap: Record<string, number> = {
        INVALID_URL: 400,
        PRIVATE_PROFILE: 403,
        NOT_FOUND: 404,
        RATE_LIMITED: 429,
        SCRAPING_FAILED: 500,
      }

      return NextResponse.json(
        {
          success: false,
          error: {
            code: error.code,
            message: error.message,
          },
        },
        { status: statusMap[error.code] || 500 }
      )
    }

    console.error('Unexpected error:', error)
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'SCRAPING_FAILED',
          message: 'An unexpected error occurred. Please try again.',
        },
      },
      { status: 500 }
    )
  }
}