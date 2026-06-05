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
  scopeQty: number | null
  scopeOfWork: string | null
  rateIdr: number | null
  remarks: string | null
  domisili: string | null
  contact: string | null
  status: string | null
  importedAt: string
  updatedAt: string
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
  } = options || {}

  const supabase = getClient()

  const KOL_SORT_COLUMNS = new Set([
    'updatedAt', 'importedAt', 'followers', 'rateIdr',
    'name', 'username', 'categories', 'domisili', 'tier', 'contact', 'erPercent', 'avgViews',
  ])
  const safeSortBy = KOL_SORT_COLUMNS.has(sortBy) ? sortBy : 'updatedAt'

  let query = supabase
    .from('KOLContacts')
    .select('*', { count: 'exact' })

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
    query = query.not('rateIdr', 'is', null).gt('rateIdr', 0)
  }
  if (search) {
    query = query.or(
      `username.ilike.%${search}%,name.ilike.%${search}%,contact.ilike.%${search}%,domisili.ilike.%${search}%`
    )
  }

  query = query.order(safeSortBy, { ascending: sortOrder === 'asc' })
  query = query.range((page - 1) * pageSize, page * pageSize - 1)

  const { data, count, error } = await query
  if (error) throw error

  const rows = (data ?? []) as KOLContactRow[]

  let profileLookupMap = new Map<string, any>()
  if (rows.length > 0) {
    const orClauses = rows
      .map((r) => `and(platform.eq.${r.platform},username.eq.${r.username})`)
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

  const merged = rows.map((row) => {
    const pl = profileLookupMap.get(`${row.platform}:${row.username}`)
    const hasScraped = !!pl

    return {
      id: row.id,
      platform: row.platform as 'instagram' | 'tiktok',
      username: row.username,
      profileUrl: row.profileUrl,
      name: row.name,
      contact: row.contact,
      rateIdr: row.rateIdr,
      categories: row.categories,
      domisili: row.domisili,
      tier: row.tier,
      scopeOfWork: row.scopeOfWork,
      scopeQty: row.scopeQty,
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

  let filtered = merged
  if (scrapedOnly) filtered = filtered.filter((m) => m.hasScrapedData)
  if (unscrapedOnly) filtered = filtered.filter((m) => !m.hasScrapedData)

  return {
    profiles: filtered,
    total: count ?? 0,
    page,
    pageSize,
    totalPages: Math.ceil((count ?? 0) / pageSize),
  }
}
