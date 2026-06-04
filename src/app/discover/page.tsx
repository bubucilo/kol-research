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
  Filter,
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
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Discovery</h1>
            <p className="text-gray-400">
              Browse all analyzed profiles. Data is cached for 3 months.
            </p>
          </div>

          <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-4 mb-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value)
                    setPage(1)
                  }}
                  placeholder="Search by username..."
                  className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="flex gap-2">
                <select
                  value={platform}
                  onChange={(e) => {
                    setPlatform(e.target.value)
                    setPage(1)
                  }}
                  className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="all">All Platforms</option>
                  <option value="tiktok">TikTok</option>
                  <option value="instagram">Instagram</option>
                </select>

                <button
                  onClick={handleExportCSV}
                  className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white hover:bg-gray-600 flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  CSV
                </button>

                <button
                  onClick={handleCopyAll}
                  className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white hover:bg-gray-600 flex items-center gap-2"
                >
                  {copiedId === 'all' ? (
                    <Check className="h-4 w-4 text-green-400" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                  Copy All
                </button>
              </div>
            </div>

            <div className="mt-3 flex items-center gap-4 text-sm text-gray-400">
              <span>{total} profiles</span>
              <span>•</span>
              <span>
                Page {page} of {totalPages}
              </span>
            </div>
          </div>

          <div className="bg-gray-800/50 rounded-xl border border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left p-4 text-sm font-medium text-gray-400">
                      Profile
                    </th>
                    <th
                      className="text-right p-4 text-sm font-medium text-gray-400 cursor-pointer hover:text-white"
                      onClick={() => handleSort('followers')}
                    >
                      Followers
                      <SortIcon column="followers" />
                    </th>
                    <th
                      className="text-right p-4 text-sm font-medium text-gray-400 cursor-pointer hover:text-white"
                      onClick={() => handleSort('postCount')}
                    >
                      Posts
                      <SortIcon column="postCount" />
                    </th>
                    <th
                      className="text-right p-4 text-sm font-medium text-gray-400 cursor-pointer hover:text-white"
                      onClick={() => handleSort('avgViews')}
                    >
                      Avg Views
                      <SortIcon column="avgViews" />
                    </th>
                    <th
                      className="text-right p-4 text-sm font-medium text-gray-400 cursor-pointer hover:text-white"
                      onClick={() => handleSort('avgLikes')}
                    >
                      Avg Likes
                      <SortIcon column="avgLikes" />
                    </th>
                    <th
                      className="text-right p-4 text-sm font-medium text-gray-400 cursor-pointer hover:text-white"
                      onClick={() => handleSort('engagementRate')}
                    >
                      Engagement
                      <SortIcon column="engagementRate" />
                    </th>
                    <th className="text-right p-4 text-sm font-medium text-gray-400">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-gray-400">
                        Loading...
                      </td>
                    </tr>
                  ) : profiles.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-gray-400">
                        No profiles found. Start by analyzing a profile.
                      </td>
                    </tr>
                  ) : (
                    profiles.map((profile) => (
                      <tr
                        key={profile.id}
                        className="border-b border-gray-700/50 hover:bg-gray-700/30"
                      >
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            {profile.profilePicture ? (
                              <img
                                src={profile.profilePicture}
                                alt={profile.username}
                                className="w-8 h-8 rounded-full"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center">
                                {profile.platform === 'tiktok' ? (
                                  <Music className="h-4 w-4 text-cyan-400" />
                                ) : (
                                  <Camera className="h-4 w-4 text-pink-400" />
                                )}
                              </div>
                            )}
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-white font-medium">
                                  @{profile.username}
                                </span>
                                <span
                                  className={`text-xs px-2 py-0.5 rounded ${
                                    profile.platform === 'tiktok'
                                      ? 'bg-cyan-500/20 text-cyan-400'
                                      : 'bg-pink-500/20 text-pink-400'
                                  }`}
                                >
                                  {profile.platform}
                                </span>
                              </div>
                              {profile.bio && (
                                <p className="text-xs text-gray-500 truncate max-w-xs">
                                  {profile.bio}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="p-4 text-right text-white text-sm">
                          {profile.followers
                            ? formatNumber(profile.followers)
                            : '-'}
                        </td>
                        <td className="p-4 text-right text-white text-sm">
                          {profile.postCount
                            ? formatNumber(profile.postCount)
                            : '-'}
                        </td>
                        <td className="p-4 text-right text-white text-sm">
                          {profile.avgViews
                            ? formatNumber(Math.round(profile.avgViews))
                            : '-'}
                        </td>
                        <td className="p-4 text-right text-white text-sm">
                          {profile.avgLikes
                            ? formatNumber(Math.round(profile.avgLikes))
                            : '-'}
                        </td>
                        <td className="p-4 text-right text-sm">
                          <span
                            className={`${
                              (profile.engagementRate || 0) > 3
                                ? 'text-green-400'
                                : (profile.engagementRate || 0) > 1
                                ? 'text-yellow-400'
                                : 'text-red-400'
                            }`}
                          >
                            {profile.engagementRate
                              ? formatEngagementRate(profile.engagementRate)
                              : '-'}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleCopy(profile)}
                              className="p-1.5 rounded-lg hover:bg-gray-600 text-gray-400 hover:text-white"
                              title="Copy to clipboard (for Google Sheets)"
                            >
                              {copiedId === profile.id ? (
                                <Check className="h-4 w-4 text-green-400" />
                              ) : (
                                <Copy className="h-4 w-4" />
                              )}
                            </button>
                            <a
                              href={profile.profileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 rounded-lg hover:bg-gray-600 text-gray-400 hover:text-white"
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
              <div className="flex items-center justify-between p-4 border-t border-gray-700">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 bg-gray-700 rounded-lg text-white disabled:opacity-50 hover:bg-gray-600"
                >
                  Previous
                </button>
                <span className="text-gray-400 text-sm">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page === totalPages}
                  className="px-4 py-2 bg-gray-700 rounded-lg text-white disabled:opacity-50 hover:bg-gray-600"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}