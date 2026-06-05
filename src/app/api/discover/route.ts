import { NextRequest, NextResponse } from 'next/server'
import { getMergedKOLs } from '@/lib/db'

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
    const sortBy = searchParams.get('sortBy') || 'updatedAt'
    const sortOrder = (searchParams.get('sortOrder') as 'asc' | 'desc') || 'desc'
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '50')
    const category = searchParams.get('category') || undefined
    const domisili = searchParams.get('domisili') || undefined
    const hasContact = searchParams.get('hasContact') === 'true'
    const hasRate = searchParams.get('hasRate') === 'true'
    const scrapedOnly = searchParams.get('scrapedOnly') === 'true'
    const unscrapedOnly = searchParams.get('unscrapedOnly') === 'true'

    const result = await getMergedKOLs({
      platform,
      search,
      sortBy,
      sortOrder,
      page,
      pageSize,
      category,
      domisili,
      hasContact,
      hasRate,
      scrapedOnly,
      unscrapedOnly,
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