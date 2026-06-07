import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { ProfileData } from './types'

const CACHE_TTL_DAYS = 90

let client: SupabaseClient | null = null

export function getClient(): SupabaseClient {
  if (!client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !key) {
      throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
    }
    client = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  }
  return client
}

type ProfileRow = {
  id: string
  platform: string
  username: string
  profileUrl: string
  profilePicture: string | null
  bio: string | null
  followers: number | null
  following: number | null
  postCount: number | null
  avgViews: number | null
  avgLikes: number | null
  avgComments: number | null
  avgShares: number | null
  engagementRate: number | null
  lastSearchedAt: string
  createdAt: string
}

type ContentRow = {
  id: string
  contentUrl: string
  views: number | null
  likes: number | null
  comments: number | null
  shares: number | null
  postedAt: string | null
  profileLookupId: string
}

function rowToProfile(row: ProfileRow, content: ContentRow[] = []): ProfileData {
  return {
    platform: row.platform as 'tiktok' | 'instagram',
    username: row.username,
    profileUrl: row.profileUrl,
    profilePicture: row.profilePicture,
    bio: row.bio,
    followers: row.followers ?? 0,
    following: row.following,
    postCount: row.postCount ?? 0,
    avgViews: row.avgViews ?? 0,
    avgLikes: row.avgLikes ?? 0,
    avgComments: row.avgComments ?? 0,
    avgShares: row.avgShares ?? 0,
    engagementRate: row.engagementRate ?? 0,
    recentContent: content.map((c) => ({
      url: c.contentUrl,
      views: c.views ?? 0,
      likes: c.likes ?? 0,
      comments: c.comments ?? 0,
      shares: c.shares ?? 0,
      postedAt: c.postedAt,
    })),
  }
}

export async function getCachedProfile(
  platform: string,
  username: string
): Promise<ProfileData | null> {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - CACHE_TTL_DAYS)

  const { data: profile, error } = await getClient()
    .from('ProfileLookup')
    .select('*')
    .ilike('username', username)
    .eq('platform', platform)
    .gte('lastSearchedAt', cutoff.toISOString())
    .maybeSingle()

  if (error) throw error
  if (!profile) return null

  await getClient()
    .from('ProfileLookup')
    .update({ lastSearchedAt: new Date().toISOString() })
    .eq('id', profile.id)

  const { data: content } = await getClient()
    .from('ContentMetrics')
    .select('*')
    .eq('profileLookupId', profile.id)
    .order('createdAt', { ascending: false })
    .limit(15)

  return rowToProfile(profile as ProfileRow, (content ?? []) as ContentRow[])
}

export async function saveProfile(profile: ProfileData): Promise<void> {
  const supabase = getClient()

  const { data: existing } = await supabase
    .from('ProfileLookup')
    .select('id')
    .ilike('username', profile.username)
    .eq('platform', profile.platform)
    .maybeSingle()

  let profileId: string

  if (existing) {
    const { error: updateErr } = await supabase
      .from('ProfileLookup')
      .update({
        profileUrl: profile.profileUrl,
        profilePicture: profile.profilePicture ?? null,
        bio: profile.bio ?? null,
        followers: profile.followers,
        following: profile.following ?? null,
        postCount: profile.postCount,
        avgViews: profile.avgViews,
        avgLikes: profile.avgLikes,
        avgComments: profile.avgComments,
        avgShares: profile.avgShares,
        engagementRate: profile.engagementRate,
        updatedAt: new Date().toISOString(),
        lastSearchedAt: new Date().toISOString(),
      })
      .eq('id', existing.id)

    if (updateErr) throw updateErr
    profileId = existing.id

    await supabase.from('ContentMetrics').delete().eq('profileLookupId', profileId)
  } else {
    const now = new Date().toISOString()
    const { data: created, error: insertErr } = await supabase
      .from('ProfileLookup')
      .insert({
        id: crypto.randomUUID(),
        platform: profile.platform,
        username: profile.username,
        profileUrl: profile.profileUrl,
        profilePicture: profile.profilePicture ?? null,
        bio: profile.bio ?? null,
        followers: profile.followers,
        following: profile.following ?? null,
        postCount: profile.postCount,
        avgViews: profile.avgViews,
        avgLikes: profile.avgLikes,
        avgComments: profile.avgComments,
        avgShares: profile.avgShares,
        engagementRate: profile.engagementRate,
        createdAt: now,
        updatedAt: now,
        lastSearchedAt: now,
      })
      .select('id')
      .single()

    if (insertErr) throw insertErr
    if (!created) throw new Error('Insert returned no data')
    profileId = created.id
  }

  if (profile.recentContent.length > 0) {
    const now = new Date().toISOString()
    const { error: contentErr } = await supabase.from('ContentMetrics').insert(
      profile.recentContent.map((cm) => ({
        id: crypto.randomUUID(),
        contentUrl: cm.url,
        views: cm.views,
        likes: cm.likes,
        comments: cm.comments,
        shares: cm.shares,
        postedAt: cm.postedAt,
        createdAt: now,
        profileLookupId: profileId,
      }))
    )
    if (contentErr) throw contentErr
  }
}

type RangeBucket = { key: string; min: number | null; max: number | null }

const FOLLOWER_BUCKETS: RangeBucket[] = [
  { key: 'nano',  min: 0,           max: 10_000 },
  { key: 'micro', min: 10_000,      max: 100_000 },
  { key: 'mid',   min: 100_000,     max: 500_000 },
  { key: 'macro', min: 500_000,     max: 1_000_000 },
  { key: 'mega',  min: 1_000_000,   max: null },
]

const POST_BUCKETS: RangeBucket[] = [
  { key: 'few',    min: 0,     max: 50 },
  { key: 'active', min: 50,    max: 200 },
  { key: 'power',  min: 200,   max: 1_000 },
  { key: 'pro',    min: 1_000, max: null },
]

const VIEW_BUCKETS: RangeBucket[] = [
  { key: 'low',   min: 0,           max: 1_000 },
  { key: 'mid',   min: 1_000,       max: 10_000 },
  { key: 'high',  min: 10_000,      max: 100_000 },
  { key: 'viral', min: 100_000,     max: 1_000_000 },
  { key: 'mega',  min: 1_000_000,   max: null },
]

const LIKE_BUCKETS: RangeBucket[] = [
  { key: 'low',   min: 0,        max: 100 },
  { key: 'mid',   min: 100,      max: 1_000 },
  { key: 'high',  min: 1_000,    max: 10_000 },
  { key: 'viral', min: 10_000,   max: 100_000 },
  { key: 'mega',  min: 100_000,  max: null },
]

const ER_BUCKETS: RangeBucket[] = [
  { key: 'low',       min: 0, max: 1 },
  { key: 'avg',       min: 1, max: 3 },
  { key: 'good',      min: 3, max: 6 },
  { key: 'excellent', min: 6, max: null },
]

function bucketToFilter(bucket: RangeBucket, column: string): string {
  const parts: string[] = []
  if (bucket.min !== null) parts.push(`${column}.gte.${bucket.min}`)
  if (bucket.max !== null) parts.push(`${column}.lt.${bucket.max}`)
  if (parts.length === 0) return ''
  if (parts.length === 1) return parts[0]
  return `and(${parts.join(',')})`
}

function buildRangeOrFilter(
  keys: string[],
  buckets: RangeBucket[],
  column: string
): string | null {
  if (!keys || keys.length === 0) return null
  const conds = keys
    .map((k) => buckets.find((b) => b.key === k))
    .filter((b): b is RangeBucket => !!b)
    .map((b) => bucketToFilter(b, column))
    .filter(Boolean)
  if (conds.length === 0) return null
  return conds.length === 1 ? conds[0] : `or(${conds.join(',')})`
}

export async function getAllProfiles(options?: {
  platform?: string
  search?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  page?: number
  pageSize?: number
  followerRanges?: string[]
  postRanges?: string[]
  viewRanges?: string[]
  likeRanges?: string[]
  erRanges?: string[]
}) {
  const {
    platform,
    search,
    sortBy = 'lastSearchedAt',
    sortOrder = 'desc',
    page = 1,
    pageSize = 50,
    followerRanges,
    postRanges,
    viewRanges,
    likeRanges,
    erRanges,
  } = options || {}

  let query = getClient()
    .from('ProfileLookup')
    .select('*', { count: 'exact' })
    .order(sortBy, { ascending: sortOrder === 'asc' })
    .range((page - 1) * pageSize, page * pageSize - 1)

  if (platform && platform !== 'all') {
    query = query.eq('platform', platform)
  }

  const rangeFilters: string[] = []
  const f = buildRangeOrFilter(followerRanges || [], FOLLOWER_BUCKETS, 'followers')
  if (f) rangeFilters.push(f)
  const p = buildRangeOrFilter(postRanges || [], POST_BUCKETS, 'postCount')
  if (p) rangeFilters.push(p)
  const v = buildRangeOrFilter(viewRanges || [], VIEW_BUCKETS, 'avgViews')
  if (v) rangeFilters.push(v)
  const l = buildRangeOrFilter(likeRanges || [], LIKE_BUCKETS, 'avgLikes')
  if (l) rangeFilters.push(l)
  const e = buildRangeOrFilter(erRanges || [], ER_BUCKETS, 'engagementRate')
  if (e) rangeFilters.push(e)

  const searchCond = search
    ? `or(username.ilike.%${search}%,bio.ilike.%${search}%)`
    : null

  const allConds = [searchCond, ...rangeFilters].filter((c): c is string => Boolean(c))
  if (allConds.length === 1) {
    query = query.or(allConds[0])
  } else if (allConds.length > 1) {
    query = query.or(`and(${allConds.join(',')})`)
  }

  const { data, count, error } = await query
  if (error) throw error

  const total = count ?? 0

  return {
    profiles: (data ?? []).map((p: any) => ({
      id: p.id,
      platform: p.platform,
      username: p.username,
      profileUrl: p.profileUrl,
      profilePicture: p.profilePicture,
      bio: p.bio,
      followers: p.followers,
      following: p.following,
      postCount: p.postCount,
      avgViews: p.avgViews,
      avgLikes: p.avgLikes,
      avgComments: p.avgComments,
      avgShares: p.avgShares,
      engagementRate: p.engagementRate,
      lastSearchedAt: p.lastSearchedAt,
      createdAt: p.createdAt,
    })),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  }
}

export async function getProfileById(id: string) {
  const supabase = getClient()

  const { data: profile, error: profileErr } = await supabase
    .from('ProfileLookup')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (profileErr) throw profileErr
  if (!profile) return null

  const { data: content, error: contentErr } = await supabase
    .from('ContentMetrics')
    .select('*')
    .eq('profileLookupId', id)
    .order('createdAt', { ascending: false })

  if (contentErr) throw contentErr

  return {
    ...(profile as ProfileRow),
    contentMetrics: (content ?? []) as ContentRow[],
  }
}

type KOLContactRow = {
  id: string
  rowNo: number | null
  name: string | null
  profileUrl: string
  platform: string
  username: string
  categories: string | null
  followers: number | null
  tier: string | null
  erPercent: number | null
  avgViews: number | null
  gmv: number | null
  rates: Array<{ scope: string; qty: number; rate: number }> | null
  primaryRate: number | null
  remarks: string | null
  domisili: string | null
  contact: string | null
  status: string | null
  importedAt: string
  updatedAt: string
}

function pickPrimaryRate(rates: KOLContactRow['rates']): { rate: number | null; scope: string | null } {
  if (!rates || rates.length === 0) return { rate: null, scope: null }
  const first = rates.find((r) => r.rate > 0) || rates[0]
  return { rate: first.rate || null, scope: first.scope || null }
}

export async function getMergedKOLs(options?: {
  platform?: string
  search?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  page?: number
  pageSize?: number
  category?: string
  domisili?: string
  hasContact?: boolean
  hasRate?: boolean
  scrapedOnly?: boolean
  unscrapedOnly?: boolean
  minRate?: number
  maxRate?: number
  scope?: string
}) {
  const {
    platform,
    search,
    sortBy = 'updatedAt',
    sortOrder = 'desc',
    page = 1,
    pageSize = 50,
    category,
    domisili,
    hasContact,
    hasRate,
    scrapedOnly,
    unscrapedOnly,
    minRate,
    maxRate,
    scope,
  } = options || {}

  const supabase = getClient()

  // KOL-level sort columns (sort applies at KOL identity level, then rates within a KOL stay together)
  const KOL_SORT_COLUMNS = new Set([
    'updatedAt', 'importedAt', 'followers',
    'name', 'username', 'categories', 'domisili', 'tier', 'contact', 'erPercent', 'avgViews',
  ])
  // Rate-level sort columns (sort applies at the rate-row level)
  const RATE_SORT_COLUMNS = new Set(['rate'])
  const safeSortBy = KOL_SORT_COLUMNS.has(sortBy)
    ? sortBy
    : RATE_SORT_COLUMNS.has(sortBy)
    ? sortBy
    : 'updatedAt'

  // Fetch ALL matching KOLs (we expand rates[] into rows in JS, then paginate the expanded set)
  // For datasets <100K rows this is fine; switch to SQL function if it grows.
  let query = supabase
    .from('KOLContacts')
    .select('*')

  if (platform && platform !== 'all') {
    query = query.eq('platform', platform)
  }
  if (category) {
    query = query.ilike('categories', `%${category}%`)
  }
  if (domisili) {
    query = query.ilike('domisili', `%${domisili}%`)
  }
  if (hasContact) {
    query = query.not('contact', 'is', null).neq('contact', '')
  }
  if (hasRate) {
    query = query.not('primaryRate', 'is', null).gt('primaryRate', 0)
  }
  if (search) {
    query = query.or(
      `username.ilike.%${search}%,name.ilike.%${search}%,contact.ilike.%${search}%,domisili.ilike.%${search}%`
    )
  }

  const { data, error } = await query
  if (error) throw error

  const rows = (data ?? []) as KOLContactRow[]

  // Batch-fetch fresh ProfileLookup rows (same TTL filter as before)
  let profileLookupMap = new Map<string, any>()
  if (rows.length > 0) {
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - CACHE_TTL_DAYS)
    const cutoffIso = cutoff.toISOString()

    const orClauses = rows
      .map(
        (r) =>
          `and(platform.eq.${r.platform},username.eq.${r.username},lastSearchedAt.gte.${cutoffIso})`
      )
      .join(',')
    const { data: plData, error: plErr } = await supabase
      .from('ProfileLookup')
      .select(
        'platform, username, "profilePicture", bio, following, "postCount", "avgViews", "avgLikes", "avgComments", "avgShares", "engagementRate", "lastSearchedAt", followers'
      )
      .or(orClauses)
    if (plErr) throw plErr
    for (const pl of plData ?? []) {
      profileLookupMap.set(`${pl.platform}:${pl.username}`, pl)
    }
  }

  // Merge KOL + ProfileLookup
  const merged = rows.map((row) => {
    const pl = profileLookupMap.get(`${row.platform}:${row.username}`)
    const hasScraped = !!pl
    const primary = pickPrimaryRate(row.rates)

    return {
      id: row.id,
      platform: row.platform as 'instagram' | 'tiktok',
      username: row.username,
      profileUrl: row.profileUrl,
      name: row.name,
      contact: row.contact,
      rates: row.rates,
      primaryRate: primary.rate,
      primaryScope: primary.scope,
      categories: row.categories,
      domisili: row.domisili,
      tier: row.tier,
      remarks: row.remarks,
      status: row.status,
      followers: hasScraped && pl.followers != null ? pl.followers : row.followers,
      avgViews: hasScraped && pl.avgViews != null ? pl.avgViews : row.avgViews,
      avgLikes: hasScraped && pl.avgLikes != null ? pl.avgLikes : null,
      avgComments: hasScraped && pl.avgComments != null ? pl.avgComments : null,
      avgShares: hasScraped && pl.avgShares != null ? pl.avgShares : null,
      engagementRate: hasScraped && pl.engagementRate != null ? pl.engagementRate : row.erPercent,
      profilePicture: hasScraped ? pl.profilePicture : null,
      bio: hasScraped ? pl.bio : null,
      postCount: hasScraped ? pl.postCount : null,
      lastSearchedAt: hasScraped ? pl.lastSearchedAt : null,
      hasScrapedData: hasScraped,
    }
  })

  // Filter by data source at KOL level
  let kFiltered = merged
  if (scrapedOnly) kFiltered = kFiltered.filter((m) => m.hasScrapedData)
  if (unscrapedOnly) kFiltered = kFiltered.filter((m) => !m.hasScrapedData)

  // Expand rates[] into separate rows
  // - KOLs with no rates become a single row with null rate fields
  // - KOLs with N rates become N rows, each with one rate
  const expanded: any[] = []
  for (const m of kFiltered) {
    if (!m.rates || m.rates.length === 0) {
      expanded.push({ ...m, rateScope: null, rateQty: null, rateRate: null })
    } else {
      for (const r of m.rates) {
        expanded.push({
          ...m,
          rateScope: r.scope || null,
          rateQty: r.qty || null,
          rateRate: r.rate || null,
        })
      }
    }
  }

  // Apply rate-level filters
  let filtered = expanded
  if (minRate != null) {
    filtered = filtered.filter((r) => (r.rateRate || 0) >= minRate)
  }
  if (maxRate != null) {
    filtered = filtered.filter((r) => (r.rateRate || 0) <= maxRate)
  }
  if (scope) {
    const scopeLower = scope.toLowerCase()
    filtered = filtered.filter(
      (r) => r.rateScope && r.rateScope.toLowerCase().includes(scopeLower)
    )
  }

  // Sort
  const dir = sortOrder === 'asc' ? 1 : -1
  if (safeSortBy === 'rate') {
    // Rate-level sort: order by rateRate directly (stable across KOLs)
    filtered.sort((a, b) => {
      const av = a.rateRate || 0
      const bv = b.rateRate || 0
      if (av === bv) return 0
      return av < bv ? -1 * dir : 1 * dir
    })
  } else {
    // KOL-level sort: group by KOL identity, sort KOLs, keep rates within a KOL together
    // Sub-sort within KOL: highest rate first (stable visual)
    const byKol = new Map<string, any[]>()
    for (const r of filtered) {
      const list = byKol.get(r.id) || []
      list.push(r)
      byKol.set(r.id, list)
    }
    for (const list of byKol.values()) {
      list.sort((a, b) => (b.rateRate || 0) - (a.rateRate || 0))
    }
    const kols = Array.from(byKol.values()).map((rows) => rows[0])
    kols.sort((a, b) => {
      const av = (a as any)[safeSortBy]
      const bv = (b as any)[safeSortBy]
      if (av == null && bv == null) return 0
      if (av == null) return 1
      if (bv == null) return -1
      if (av === bv) return 0
      if (typeof av === 'number' && typeof bv === 'number') return av < bv ? -1 * dir : 1 * dir
      return String(av).localeCompare(String(bv)) * dir
    })
    filtered = kols.flatMap((k) => byKol.get((k as any).id) || [])
  }

  const total = filtered.length
  const start = (page - 1) * pageSize
  const paged = filtered.slice(start, start + pageSize)

  return {
    profiles: paged,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  }
}
