import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { ProfileData } from './types'

const CACHE_TTL_DAYS = 90

let client: SupabaseClient | null = null

function getClient(): SupabaseClient {
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
    profilePicture: row.profilePicture ?? undefined,
    bio: row.bio ?? undefined,
    followers: row.followers ?? 0,
    following: row.following ?? undefined,
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
        lastSearchedAt: new Date().toISOString(),
      })
      .eq('id', existing.id)

    if (updateErr) throw updateErr

    await supabase.from('ContentMetrics').delete().eq('profileLookupId', existing.id)
  }

  const profileId = existing?.id
  if (profileId && profile.recentContent.length > 0) {
    const { error: insertErr } = await supabase.from('ContentMetrics').insert(
      profile.recentContent.map((cm) => ({
        contentUrl: cm.url,
        views: cm.views,
        likes: cm.likes,
        comments: cm.comments,
        shares: cm.shares,
        postedAt: cm.postedAt,
        profileLookupId: profileId,
      }))
    )
    if (insertErr) throw insertErr
  }
}

export async function getAllProfiles(options?: {
  platform?: string
  search?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  page?: number
  pageSize?: number
}) {
  const {
    platform,
    search,
    sortBy = 'lastSearchedAt',
    sortOrder = 'desc',
    page = 1,
    pageSize = 50,
  } = options || {}

  let query = getClient()
    .from('ProfileLookup')
    .select('*', { count: 'exact' })
    .order(sortBy, { ascending: sortOrder === 'asc' })
    .range((page - 1) * pageSize, page * pageSize - 1)

  if (platform && platform !== 'all') {
    query = query.eq('platform', platform)
  }

  if (search) {
    query = query.or(`username.ilike.%${search}%,bio.ilike.%${search}%`)
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
