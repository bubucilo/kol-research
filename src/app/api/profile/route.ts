import { NextRequest, NextResponse } from 'next/server'
import { scrapeProfile } from '@/lib/scraper'
import { profileUrlSchema } from '@/lib/types'
import { ProfileError } from '@/lib/types'
import { detectPlatform, extractUsername } from '@/lib/utils'
import { getCachedProfile, saveProfile } from '@/lib/db'
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

    if (platform && username) {
      try {
        await saveProfile(profileData)
      } catch (dbError) {
        console.warn('Failed to save to DB:', dbError)
      }
    }

    return NextResponse.json({
      success: true,
      data: profileData,
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