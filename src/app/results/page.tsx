'use client'

import { useSearchParams } from 'next/navigation'
import { useEffect, useState, Suspense } from 'react'
import { ProfileData } from '@/lib/types'
import { formatNumber, formatEngagementRate } from '@/lib/utils'
import {
  Users,
  Video,
  Eye,
  Heart,
  MessageCircle,
  Share2,
  TrendingUp,
  ExternalLink,
  ArrowLeft,
  Camera,
  Music,
  Copy,
  Check
} from 'lucide-react'
import Link from 'next/link'

function ResultsContent() {
  const searchParams = useSearchParams()
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const dataParam = searchParams.get('data')
    if (!dataParam) {
      setError('No profile data found')
      return
    }

    try {
      const decoded = JSON.parse(decodeURIComponent(dataParam))
      setProfile(decoded)
    } catch {
      setError('Invalid profile data')
    }
  }, [searchParams])

  if (error) {
    return (
      <div className="px-6 py-20 text-center">
        <p className="text-[#FB7185] text-xl mb-4">{error}</p>
        <Link href="/" className="text-[#3B82F6] hover:text-[#60A5FA] inline-flex items-center gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to Home
        </Link>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="px-6 py-20 text-center">
        <div className="text-[#94A3B8] text-xl">Loading profile data...</div>
      </div>
    )
  }

  const PlatformIcon = profile.platform === 'tiktok' ? Music : Camera

  const metrics = [
    { label: 'Followers', value: formatNumber(profile.followers), icon: Users, color: 'blue' },
    { label: 'Total Posts', value: formatNumber(profile.postCount), icon: Video, color: 'indigo' },
    { label: 'Avg Views', value: profile.avgViews > 0 ? formatNumber(profile.avgViews) : 'N/A', icon: Eye, color: 'cyan' },
    { label: 'Avg Likes', value: profile.avgLikes > 0 ? formatNumber(profile.avgLikes) : 'N/A', icon: Heart, color: 'pink' },
    { label: 'Avg Comments', value: profile.avgComments > 0 ? formatNumber(profile.avgComments) : 'N/A', icon: MessageCircle, color: 'yellow' },
    {
      label: 'Engagement Rate',
      value: profile.engagementRate > 0 ? formatEngagementRate(profile.engagementRate) : 'N/A',
      icon: TrendingUp,
      color: profile.engagementRate > 3 ? 'green' : profile.engagementRate > 1 ? 'yellow' : 'red',
    },
  ]

  const colorClasses: Record<string, { bg: string; text: string }> = {
    blue: { bg: 'rgba(59,130,246,0.12)', text: '#60A5FA' },
    indigo: { bg: 'rgba(99,102,241,0.12)', text: '#A5B4FC' },
    cyan: { bg: 'rgba(0,170,255,0.12)', text: '#00AAFF' },
    green: { bg: 'rgba(16,185,129,0.12)', text: '#34D399' },
    red: { bg: 'rgba(239,68,68,0.12)', text: '#F87171' },
    yellow: { bg: 'rgba(245,158,11,0.12)', text: '#FBBF24' },
    pink: { bg: 'rgba(236,72,153,0.12)', text: '#F472B6' },
  }

  return (
    <div className="px-6 py-8">
      <div className="max-w-[1000px] mx-auto">
        <Link href="/" className="inline-flex items-center gap-2 text-[#94A3B8] hover:text-white mb-6 transition-colors text-sm">
          <ArrowLeft className="h-4 w-4" />
          New Search
        </Link>

        <div className="tool-card rounded-2xl p-6 md:p-8 mb-6">
          <div className="flex flex-col md:flex-row items-start gap-6">
            {profile.profilePicture && (
              <img
                src={profile.profilePicture}
                alt={profile.username}
                className="w-20 h-20 md:w-24 md:h-24 rounded-full border-2 flex-shrink-0 object-cover"
                style={{ borderColor: 'rgba(59,130,246,0.3)' }}
                onError={(e) => {
                  const target = e.currentTarget
                  target.style.display = 'none'
                  const fallback = target.nextElementSibling as HTMLElement
                  if (fallback) fallback.style.display = 'flex'
                }}
              />
            )}
            <div
              className="w-20 h-20 md:w-24 md:h-24 rounded-full border-2 flex-shrink-0 items-center justify-center text-2xl font-bold text-white"
              style={{
                background:
                  profile.platform === 'tiktok'
                    ? 'rgba(0,170,255,0.15)'
                    : 'rgba(236,72,153,0.15)',
                borderColor: 'rgba(59,130,246,0.3)',
                display: profile.profilePicture ? 'none' : 'flex',
              }}
            >
              {profile.username.slice(0, 2).toUpperCase()}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-2">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ background: colorClasses[profile.platform === 'tiktok' ? 'cyan' : 'pink'].bg }}
                >
                  <PlatformIcon
                    className="h-4 w-4"
                    style={{ color: colorClasses[profile.platform === 'tiktok' ? 'cyan' : 'pink'].text }}
                  />
                </div>
                <span className="text-xs font-semibold uppercase tracking-wider text-[#94A3B8]">
                  {profile.platform}
                </span>
              </div>

              <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">
                @{profile.username}
              </h1>

              {profile.bio && (
                <p className="text-[#94A3B8] text-sm mb-4 whitespace-pre-line leading-relaxed">{profile.bio}</p>
              )}

              <div className="flex flex-wrap items-center gap-3">
                <a
                  href={profile.profileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-[#3B82F6] hover:text-[#60A5FA] text-sm font-medium transition-colors"
                >
                  View on {profile.platform}
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>

                <button
                  onClick={() => {
                    const data = [
                      profile.platform,
                      profile.username,
                      profile.followers,
                      profile.avgViews ? Math.round(profile.avgViews) : 0,
                      profile.engagementRate ? profile.engagementRate.toFixed(2) + '%' : '0%',
                    ].join('\t')
                    navigator.clipboard.writeText(data).then(() => {
                      setCopied(true)
                      setTimeout(() => setCopied(false), 2000)
                    })
                  }}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    color: copied ? '#34D399' : '#94A3B8',
                  }}
                >
                  {copied ? (
                    <>
                      <Check className="h-3.5 w-3.5" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      Copy for Sheets
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
          {metrics.map((metric) => {
            const Icon = metric.icon
            const c = colorClasses[metric.color]
            return (
              <div key={metric.label} className="tool-card rounded-xl p-5">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center mb-3"
                  style={{ background: c.bg }}
                >
                  <Icon className="h-5 w-5" style={{ color: c.text }} />
                </div>
                <p className="text-2xl font-bold text-white mb-1">{metric.value}</p>
                <p className="text-xs text-[#94A3B8] font-medium">{metric.label}</p>
              </div>
            )
          })}
        </div>

        {profile.recentContent.length > 0 && (
          <div className="tool-card rounded-2xl overflow-hidden">
            <div className="px-6 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
              <h2 className="text-lg font-semibold text-white">Recent Content</h2>
              <p className="text-xs text-[#64748B] mt-0.5">
                Latest 12 posts (3 most recent pinned posts skipped for accurate averages)
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr style={{ background: 'rgba(255,255,255,0.02)' }}>
                    <th className="text-left p-4 text-xs font-semibold uppercase tracking-wider text-[#64748B]">Content</th>
                    <th className="text-right p-4 text-xs font-semibold uppercase tracking-wider text-[#64748B]">Views</th>
                    <th className="text-right p-4 text-xs font-semibold uppercase tracking-wider text-[#64748B]">Likes</th>
                    <th className="text-right p-4 text-xs font-semibold uppercase tracking-wider text-[#64748B]">Comments</th>
                    {profile.platform === 'tiktok' && (
                      <th className="text-right p-4 text-xs font-semibold uppercase tracking-wider text-[#64748B]">Shares</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {profile.recentContent.map((content, index) => (
                    <tr
                      key={index}
                      style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}
                    >
                      <td className="p-4">
                        <a
                          href={content.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#00AAFF] hover:text-[#60A5FA] text-sm flex items-center gap-1.5 font-medium"
                        >
                          Video {index + 1}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </td>
                      <td className="p-4 text-right text-white text-sm font-medium">
                        {formatNumber(content.views)}
                      </td>
                      <td className="p-4 text-right text-white text-sm font-medium">
                        {formatNumber(content.likes)}
                      </td>
                      <td className="p-4 text-right text-white text-sm font-medium">
                        {formatNumber(content.comments)}
                      </td>
                      {profile.platform === 'tiktok' && (
                        <td className="p-4 text-right text-white text-sm font-medium">
                          {formatNumber(content.shares)}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="mt-8 text-center text-[#64748B] text-xs">
          <p>Data fetched from public {profile.platform} profiles. Metrics are estimates.</p>
        </div>
      </div>
    </div>
  )
}

export default function ResultsPage() {
  return (
    <Suspense fallback={
      <div className="px-6 py-20 text-center">
        <div className="text-[#94A3B8] text-xl">Loading...</div>
      </div>
    }>
      <ResultsContent />
    </Suspense>
  )
}
