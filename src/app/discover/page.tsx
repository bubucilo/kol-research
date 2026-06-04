'use client'

import { useState, useEffect, useCallback } from 'react'
import { formatNumber, formatEngagementRate } from '@/lib/utils'
import {
  Search,
  Download,
  Copy,
  Check,
  Camera,
  Music,
  ChevronUp,
  ChevronDown,
  ExternalLink,
  Sparkles,
} from 'lucide-react'

interface Profile {
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

export default function DiscoverPage() {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [search, setSearch] = useState('')
  const [platform, setPlatform] = useState('all')
  const [sortBy, setSortBy] = useState('lastSearchedAt')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [loading, setLoading] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const fetchProfiles = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: '50',
        sortBy,
        sortOrder,
      })
      if (platform !== 'all') params.set('platform', platform)
      if (search) params.set('search', search)

      const res = await fetch(`/api/discover?${params}`)
      const data = await res.json()

      if (data.success) {
        setProfiles(data.profiles)
        setTotal(data.total)
        setTotalPages(data.totalPages)
      }
    } catch (err) {
      console.error('Failed to fetch profiles:', err)
    } finally {
      setLoading(false)
    }
  }, [page, platform, search, sortBy, sortOrder])

  useEffect(() => {
    fetchProfiles()
  }, [fetchProfiles])

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(column)
      setSortOrder('desc')
    }
    setPage(1)
  }

  const handleExportCSV = () => {
    const params = new URLSearchParams()
    if (platform !== 'all') params.set('platform', platform)
    if (search) params.set('search', search)
    params.set('sortBy', sortBy)
    params.set('sortOrder', sortOrder)
    window.open(`/api/discover/csv?${params}`, '_blank')
  }

  const handleCopy = (profile: Profile) => {
    const data = [
      profile.platform,
      profile.username,
      profile.followers || 0,
      profile.avgViews ? Math.round(profile.avgViews) : 0,
      profile.engagementRate ? profile.engagementRate.toFixed(2) + '%' : '0%',
    ].join('\t')

    navigator.clipboard.writeText(data).then(() => {
      setCopiedId(profile.id)
      setTimeout(() => setCopiedId(null), 2000)
    })
  }

  const handleCopyAll = () => {
    const header = 'Platform\tUsername\tFollowers\tAvg Views\tEngagement'
    const rows = profiles.map((p) =>
      [
        p.platform,
        p.username,
        p.followers || 0,
        p.avgViews ? Math.round(p.avgViews) : 0,
        p.engagementRate ? p.engagementRate.toFixed(2) + '%' : '0%',
      ].join('\t')
    )
    const data = [header, ...rows].join('\n')

    navigator.clipboard.writeText(data).then(() => {
      setCopiedId('all')
      setTimeout(() => setCopiedId(null), 2000)
    })
  }

  const SortIcon = ({ column }: { column: string }) => {
    if (sortBy !== column) return null
    return sortOrder === 'asc' ? (
      <ChevronUp className="h-3 w-3 inline ml-1" />
    ) : (
      <ChevronDown className="h-3 w-3 inline ml-1" />
    )
  }

  return (
    <div className="px-6 py-8">
      <div className="max-w-[1280px] mx-auto">
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 mb-3 rounded-full text-xs font-semibold uppercase tracking-wider text-[#3B82F6] border border-[rgba(59,130,246,0.25)] bg-[rgba(59,130,246,0.06)]">
            <Sparkles className="h-3.5 w-3.5" />
            Discovery
          </div>
          <h1
            className="text-3xl md:text-4xl font-bold tracking-tight mb-2"
            style={{
              background: 'linear-gradient(135deg, #00CCFF, #0066FF, #00AAFF)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            All Analyzed Profiles
          </h1>
          <p className="text-[#94A3B8]">
            Browse all analyzed profiles. Data is cached for 3 months.
          </p>
        </div>

        <div className="tool-card rounded-xl p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#64748B]" />
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setPage(1)
                }}
                placeholder="Search by username..."
                className="w-full pl-10 pr-4 py-2.5 rounded-lg text-white placeholder:text-[#64748B] focus:outline-none focus:ring-1 transition-all"
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.08)',
                }}
              />
            </div>

            <div className="flex gap-2 flex-wrap">
              <select
                value={platform}
                onChange={(e) => {
                  setPlatform(e.target.value)
                  setPage(1)
                }}
                className="px-4 py-2.5 rounded-lg text-white focus:outline-none cursor-pointer"
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.08)',
                }}
              >
                <option value="all" className="bg-[#0A0F1A]">All Platforms</option>
                <option value="tiktok" className="bg-[#0A0F1A]">TikTok</option>
                <option value="instagram" className="bg-[#0A0F1A]">Instagram</option>
              </select>

              <button
                onClick={handleExportCSV}
                className="btn-ghost flex items-center gap-2 text-sm py-2.5"
                title="Export filtered results to CSV"
              >
                <Download className="h-4 w-4" />
                CSV
              </button>

              <button
                onClick={handleCopyAll}
                className="btn-filled flex items-center gap-2 text-sm py-2.5"
                title="Copy all visible rows for Google Sheets"
              >
                {copiedId === 'all' ? (
                  <>
                    <Check className="h-4 w-4" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    Copy All
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="mt-3 flex items-center gap-3 text-xs text-[#64748B]">
            <span className="font-semibold text-[#94A3B8]">{total}</span> profiles total
            <span>•</span>
            <span>Page {page} of {totalPages || 1}</span>
          </div>
        </div>

        <div className="tool-card rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                  <th className="text-left p-4 text-xs font-semibold uppercase tracking-wider text-[#64748B]">
                    Profile
                  </th>
                  {[
                    { key: 'followers', label: 'Followers' },
                    { key: 'postCount', label: 'Posts' },
                    { key: 'avgViews', label: 'Avg Views' },
                    { key: 'avgLikes', label: 'Avg Likes' },
                    { key: 'engagementRate', label: 'Engagement' },
                  ].map((col) => (
                    <th
                      key={col.key}
                      className="text-right p-4 text-xs font-semibold uppercase tracking-wider text-[#64748B] cursor-pointer hover:text-white transition-colors"
                      onClick={() => handleSort(col.key)}
                    >
                      {col.label}
                      <SortIcon column={col.key} />
                    </th>
                  ))}
                  <th className="text-right p-4 text-xs font-semibold uppercase tracking-wider text-[#64748B]">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} className="p-12 text-center text-[#64748B]">
                      Loading…
                    </td>
                  </tr>
                ) : profiles.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-12 text-center">
                      <div className="text-[#94A3B8] mb-2">No profiles yet</div>
                      <a
                        href="/"
                        className="text-[#00AAFF] hover:text-[#60A5FA] text-sm font-medium"
                      >
                        Analyze your first profile →
                      </a>
                    </td>
                  </tr>
                ) : (
                  profiles.map((profile) => (
                    <tr
                      key={profile.id}
                      className="transition-colors hover:bg-[rgba(59,130,246,0.04)]"
                      style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}
                    >
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          {profile.profilePicture ? (
                            <img
                              src={profile.profilePicture}
                              alt={profile.username}
                              className="w-9 h-9 rounded-full flex-shrink-0"
                              style={{ border: '1px solid rgba(255,255,255,0.08)' }}
                            />
                          ) : (
                            <div
                              className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                              style={{ background: 'rgba(255,255,255,0.04)' }}
                            >
                              {profile.platform === 'tiktok' ? (
                                <Music className="h-4 w-4 text-[#00AAFF]" />
                              ) : (
                                <Camera className="h-4 w-4 text-[#F472B6]" />
                              )}
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-white font-medium">
                                @{profile.username}
                              </span>
                              <span
                                className="text-[10px] px-1.5 py-0.5 rounded font-semibold uppercase tracking-wide"
                                style={
                                  profile.platform === 'tiktok'
                                    ? { background: 'rgba(0,170,255,0.12)', color: '#00AAFF' }
                                    : { background: 'rgba(236,72,153,0.12)', color: '#F472B6' }
                                }
                              >
                                {profile.platform}
                              </span>
                            </div>
                            {profile.bio && (
                              <p className="text-xs text-[#64748B] truncate max-w-xs mt-0.5">
                                {profile.bio}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-right text-white text-sm font-medium">
                        {profile.followers
                          ? formatNumber(profile.followers)
                          : '-'}
                      </td>
                      <td className="p-4 text-right text-white text-sm font-medium">
                        {profile.postCount
                          ? formatNumber(profile.postCount)
                          : '-'}
                      </td>
                      <td className="p-4 text-right text-white text-sm font-medium">
                        {profile.avgViews
                          ? formatNumber(Math.round(profile.avgViews))
                          : '-'}
                      </td>
                      <td className="p-4 text-right text-white text-sm font-medium">
                        {profile.avgLikes
                          ? formatNumber(Math.round(profile.avgLikes))
                          : '-'}
                      </td>
                      <td className="p-4 text-right text-sm font-semibold">
                        <span
                          style={{
                            color:
                              (profile.engagementRate || 0) > 3
                                ? '#34D399'
                                : (profile.engagementRate || 0) > 1
                                ? '#FBBF24'
                                : '#F87171',
                          }}
                        >
                          {profile.engagementRate
                            ? formatEngagementRate(profile.engagementRate)
                            : '-'}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleCopy(profile)}
                            className="p-2 rounded-lg transition-colors"
                            style={{ color: copiedId === profile.id ? '#34D399' : '#94A3B8' }}
                            title="Copy to clipboard (for Google Sheets)"
                          >
                            {copiedId === profile.id ? (
                              <Check className="h-4 w-4" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </button>
                          <a
                            href={profile.profileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 rounded-lg transition-colors text-[#94A3B8] hover:text-[#00AAFF]"
                            title="Open profile"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div
              className="flex items-center justify-between p-4"
              style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}
            >
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="px-4 py-2 rounded-lg text-white text-sm disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                style={{ background: 'rgba(255,255,255,0.04)' }}
              >
                Previous
              </button>
              <span className="text-[#94A3B8] text-sm">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className="px-4 py-2 rounded-lg text-white text-sm disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                style={{ background: 'rgba(255,255,255,0.04)' }}
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
