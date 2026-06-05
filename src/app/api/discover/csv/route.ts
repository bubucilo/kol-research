import { NextRequest, NextResponse } from 'next/server'
import { getAllProfiles } from '@/lib/db'

export const runtime = 'nodejs'

function parseRangeParam(value: string | null): string[] | undefined {
  if (!value) return undefined
  const parts = value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  return parts.length > 0 ? parts : undefined
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const platform = searchParams.get('platform') || undefined
    const search = searchParams.get('search') || undefined
    const sortBy = searchParams.get('sortBy') || 'lastSearchedAt'
    const sortOrder = (searchParams.get('sortOrder') as 'asc' | 'desc') || 'desc'

    const result = await getAllProfiles({
      platform,
      search,
      sortBy,
      sortOrder,
      page: 1,
      pageSize: 10000,
      followerRanges: parseRangeParam(searchParams.get('followerRanges')),
      postRanges: parseRangeParam(searchParams.get('postRanges')),
      viewRanges: parseRangeParam(searchParams.get('viewRanges')),
      likeRanges: parseRangeParam(searchParams.get('likeRanges')),
      erRanges: parseRangeParam(searchParams.get('erRanges')),
    })

    const headers = [
      'Platform',
      'Username',
      'Followers',
      'Following',
      'Posts',
      'Avg Views',
      'Avg Likes',
      'Avg Comments',
      'Engagement Rate %',
      'Profile URL',
      'Last Searched',
    ]

    const rows = result.profiles.map((p: any) => [
      p.platform,
      p.username,
      p.followers || 0,
      p.following || 0,
      p.postCount || 0,
      Math.round(p.avgViews || 0),
      Math.round(p.avgLikes || 0),
      Math.round(p.avgComments || 0),
      (p.engagementRate || 0).toFixed(2),
      p.profileUrl,
      new Date(p.lastSearchedAt).toISOString().split('T')[0],
    ])

    const csv = [headers.join(','), ...rows.map((r: string[]) => r.join(','))].join('\n')

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="profile-analytics-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    })
  } catch (error) {
    console.error('CSV export error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to export CSV' },
      { status: 500 }
    )
  }
}