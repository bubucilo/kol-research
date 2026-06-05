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
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '50')

    const result = await getAllProfiles({
      platform,
      search,
      sortBy,
      sortOrder,
      page,
      pageSize,
      followerRanges: parseRangeParam(searchParams.get('followerRanges')),
      postRanges: parseRangeParam(searchParams.get('postRanges')),
      viewRanges: parseRangeParam(searchParams.get('viewRanges')),
      likeRanges: parseRangeParam(searchParams.get('likeRanges')),
      erRanges: parseRangeParam(searchParams.get('erRanges')),
    })

    return NextResponse.json({
      success: true,
      ...result,
    })
  } catch (error) {
    console.error('Discovery API error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch profiles',
        debug: {
          message: error instanceof Error ? error.message : String(error),
          name: error instanceof Error ? error.name : typeof error,
          code: (error as any)?.code,
          meta: (error as any)?.meta,
        },
      },
      { status: 500 }
    )
  }
}