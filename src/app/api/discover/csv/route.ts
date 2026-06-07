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
      page: 1,
      pageSize: 10000,
      category,
      domisili,
      hasContact,
      hasRate,
      scrapedOnly,
      unscrapedOnly,
    })

    const headers = [
      'Platform',
      'Username',
      'Name',
      'Followers',
      'Tier',
      'ER %',
      'Avg Views',
      'Avg Likes',
      'Engagement Rate %',
      'Primary Rate (IDR)',
      'Primary Scope',
      'All Rates (IDR)',
      'All Scopes',
      'Contact',
      'Categories',
      'Domisili',
      'Remarks',
      'Status',
      'Profile URL',
      'Last Scraped',
      'Data Source',
    ]

    const rows = result.profiles.map((p: any) => {
      const allRates = (p.rates || [])
        .map((r: any) => r.rate)
        .filter((n: number) => n > 0)
        .join(' | ')
      const allScopes = (p.rates || [])
        .map((r: any) => r.scope)
        .filter(Boolean)
        .join(' | ')
      return [
        p.platform,
        p.username,
        p.name || '',
        p.followers || 0,
        p.tier || '',
        (p.engagementRate || 0).toFixed(2),
        Math.round(p.avgViews || 0),
        Math.round(p.avgLikes || 0),
        (p.engagementRate || 0).toFixed(2),
        p.primaryRate || '',
        p.primaryScope || '',
        allRates,
        allScopes,
        p.contact || '',
        p.categories || '',
        p.domisili || '',
        p.remarks || '',
        p.status || '',
        p.profileUrl,
        p.lastSearchedAt ? new Date(p.lastSearchedAt).toISOString().split('T')[0] : '',
        p.hasScrapedData ? 'live' : 'csv',
      ]
    })

    const csv = [headers.join(','), ...rows.map((r: any[]) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))].join('\n')

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="kol-database-${new Date().toISOString().split('T')[0]}.csv"`,
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