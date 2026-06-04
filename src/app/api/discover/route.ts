import { NextRequest, NextResponse } from 'next/server'
import { getAllProfiles } from '@/lib/db'

export const runtime = 'nodejs'

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
    })

    return NextResponse.json({
      success: true,
      ...result,
    })
  } catch (error) {
    console.error('Discovery API error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch profiles' },
      { status: 500 }
    )
  }
}