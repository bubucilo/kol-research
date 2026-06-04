import { PrismaClient } from '@/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { ProfileData } from './types'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

const CACHE_TTL_DAYS = 90

export async function getCachedProfile(
  platform: string,
  username: string
): Promise<ProfileData | null> {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - CACHE_TTL_DAYS)

  const cached = await prisma.profileLookup.findFirst({
    where: {
      platform,
      username: { equals: username, mode: 'insensitive' },
      lastSearchedAt: { gte: cutoff },
    },
    include: {
      contentMetrics: {
        orderBy: { createdAt: 'desc' },
        take: 15,
      },
    },
  })

  if (!cached) return null

  await prisma.profileLookup.update({
    where: { id: cached.id },
    data: { lastSearchedAt: new Date() },
  })

  return {
    platform: cached.platform as 'tiktok' | 'instagram',
    username: cached.username,
    profileUrl: cached.profileUrl,
    profilePicture: cached.profilePicture,
    bio: cached.bio,
    followers: cached.followers || 0,
    following: cached.following,
    postCount: cached.postCount || 0,
    avgViews: cached.avgViews || 0,
    avgLikes: cached.avgLikes || 0,
    avgComments: cached.avgComments || 0,
    avgShares: cached.avgShares || 0,
    engagementRate: cached.engagementRate || 0,
    recentContent: cached.contentMetrics.map((cm) => ({
      url: cm.contentUrl,
      views: cm.views || 0,
      likes: cm.likes || 0,
      comments: cm.comments || 0,
      shares: cm.shares || 0,
      postedAt: cm.postedAt?.toISOString() || null,
    })),
  }
}

export async function saveProfile(profile: ProfileData): Promise<void> {
  const existing = await prisma.profileLookup.findFirst({
    where: {
      platform: profile.platform,
      username: { equals: profile.username, mode: 'insensitive' },
    },
  })

  if (existing) {
    await prisma.profileLookup.update({
      where: { id: existing.id },
      data: {
        profileUrl: profile.profileUrl,
        profilePicture: profile.profilePicture,
        bio: profile.bio,
        followers: profile.followers,
        following: profile.following,
        postCount: profile.postCount,
        avgViews: profile.avgViews,
        avgLikes: profile.avgLikes,
        avgComments: profile.avgComments,
        avgShares: profile.avgShares,
        engagementRate: profile.engagementRate,
        lastSearchedAt: new Date(),
      },
    })

    await prisma.contentMetrics.deleteMany({
      where: { profileLookupId: existing.id },
    })

    if (profile.recentContent.length > 0) {
      await prisma.contentMetrics.createMany({
        data: profile.recentContent.map((cm) => ({
          contentUrl: cm.url,
          views: cm.views,
          likes: cm.likes,
          comments: cm.comments,
          shares: cm.shares,
          postedAt: cm.postedAt ? new Date(cm.postedAt) : null,
          profileLookupId: existing.id,
        })),
      })
    }
  } else {
    await prisma.profileLookup.create({
      data: {
        platform: profile.platform,
        username: profile.username,
        profileUrl: profile.profileUrl,
        profilePicture: profile.profilePicture,
        bio: profile.bio,
        followers: profile.followers,
        following: profile.following,
        postCount: profile.postCount,
        avgViews: profile.avgViews,
        avgLikes: profile.avgLikes,
        avgComments: profile.avgComments,
        avgShares: profile.avgShares,
        engagementRate: profile.engagementRate,
        contentMetrics: {
          create: profile.recentContent.map((cm) => ({
            contentUrl: cm.url,
            views: cm.views,
            likes: cm.likes,
            comments: cm.comments,
            shares: cm.shares,
            postedAt: cm.postedAt ? new Date(cm.postedAt) : null,
          })),
        },
      },
    })
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

  const where: any = {}

  if (platform && platform !== 'all') {
    where.platform = platform
  }

  if (search) {
    where.OR = [
      { username: { contains: search, mode: 'insensitive' } },
      { bio: { contains: search, mode: 'insensitive' } },
    ]
  }

  const [profiles, total] = await Promise.all([
    prisma.profileLookup.findMany({
      where,
      orderBy: { [sortBy]: sortOrder },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.profileLookup.count({ where }),
  ])

  return {
    profiles: profiles.map((p) => ({
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
      lastSearchedAt: p.lastSearchedAt.toISOString(),
      createdAt: p.createdAt.toISOString(),
    })),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  }
}

export async function getProfileById(id: string) {
  return prisma.profileLookup.findUnique({
    where: { id },
    include: {
      contentMetrics: {
        orderBy: { createdAt: 'desc' },
      },
    },
  })
}

export { prisma }