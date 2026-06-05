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

export function parseFormattedNumber(value: string | undefined | null): number | null {
  if (!value) return null
  const cleaned = String(value).replace(/[,\s]/g, '').trim()
  if (!cleaned) return null
  const num = Number(cleaned)
  return Number.isFinite(num) ? num : null
}

export function normalizePlatform(value: string | undefined | null): 'instagram' | 'tiktok' | null {
  if (!value) return null
  const v = value.toLowerCase().trim()
  if (v === 'instagram' || v === 'ig' || v === 'ig reels') return 'instagram'
  if (v === 'tiktok' || v === 'tt') return 'tiktok'
  return null
}

export function usernameFromUrl(url: string): { username: string | null; platform: 'instagram' | 'tiktok' | null } {
  const igMatch = url.match(/instagram\.com\/([\w.-]+)/)
  if (igMatch) return { username: igMatch[1].replace(/\/$/, ''), platform: 'instagram' }

  const ttMatch = url.match(/tiktok\.com\/@([\w.-]+)/)
  if (ttMatch) return { username: ttMatch[1].replace(/\/$/, ''), platform: 'tiktok' }

  return { username: null, platform: null }
}

export function parseCSV(text: string): { headers: string[]; rows: string[][] } {
  const firstLine = text.split(/\r?\n/)[0] || ''
  const delimiter = firstLine.includes('\t') ? '\t' : ','

  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0)
  if (lines.length === 0) return { headers: [], rows: [] }

  const parseLine = (line: string): string[] => {
    const result: string[] = []
    let cur = ''
    let inQuotes = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          cur += '"'
          i++
        } else {
          inQuotes = !inQuotes
        }
      } else if (ch === delimiter && !inQuotes) {
        result.push(cur.trim())
        cur = ''
      } else {
        cur += ch
      }
    }
    result.push(cur.trim())
    return result
  }

  const headers = parseLine(lines[0])
  const rows = lines.slice(1).map(parseLine)
  return { headers, rows }
}