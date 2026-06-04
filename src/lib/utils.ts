import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M'
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K'
  }
  return num.toString()
}

export function formatEngagementRate(rate: number): string {
  return rate.toFixed(2) + '%'
}

export function detectPlatform(url: string): 'tiktok' | 'instagram' | null {
  const tiktokRegex = /^https?:\/\/(www\.)?tiktok\.com\/@[\w.-]+\/?$/
  const instagramRegex = /^https?:\/\/(www\.)?instagram\.com\/[\w.-]+\/?$/
  const instagramReelsRegex = /^https?:\/\/(www\.)?instagram\.com\/[\w.-]+\/reels\/?$/

  if (tiktokRegex.test(url)) return 'tiktok'
  if (instagramRegex.test(url)) return 'instagram'
  if (instagramReelsRegex.test(url)) return 'instagram'
  return null
}

export function extractUsername(url: string, platform: 'tiktok' | 'instagram'): string | null {
  if (platform === 'tiktok') {
    const match = url.match(/@([\w.-]+)/)
    return match ? match[1] : null
  }
  if (platform === 'instagram') {
    const match = url.match(/instagram\.com\/([\w.-]+)/)
    return match ? match[1] : null
  }
  return null
}

export function isInstagramReelsUrl(url: string): boolean {
  return /instagram\.com\/[\w.-]+\/reels\/?$/.test(url)
}

export function calculateEngagementRate(
  avgLikes: number,
  avgComments: number,
  followers: number,
  avgShares?: number
): number {
  if (followers === 0) return 0
  const interactions = avgLikes + avgComments + (avgShares || 0)
  return (interactions / followers) * 100
}