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
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 text-xl mb-4">{error}</p>
          <Link href="/" className="text-purple-400 hover:text-purple-300 flex items-center gap-2 justify-center">
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Link>
        </div>
      </div>
    )
  }
  
  if (!profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="animate-pulse text-white text-xl">Loading profile data...</div>
      </div>
    )
  }
  
  const PlatformIcon = profile.platform === 'tiktok' ? Music : Camera
  const platformColor = profile.platform === 'tiktok' ? 'cyan' : 'pink'
  
  const metrics = [
    {
      label: 'Followers',
      value: formatNumber(profile.followers),
      icon: Users,
      color: 'purple',
    },
    {
      label: 'Total Posts',
      value: formatNumber(profile.postCount),
      icon: Video,
      color: 'blue',
    },
    {
      label: 'Avg Views',
      value: profile.avgViews > 0 ? formatNumber(profile.avgViews) : 'N/A',
      icon: Eye,
      color: 'green',
    },
    {
      label: 'Avg Likes',
      value: profile.avgLikes > 0 ? formatNumber(profile.avgLikes) : 'N/A',
      icon: Heart,
      color: 'red',
    },
    {
      label: 'Avg Comments',
      value: profile.avgComments > 0 ? formatNumber(profile.avgComments) : 'N/A',
      icon: MessageCircle,
      color: 'yellow',
    },
    {
      label: 'Engagement Rate',
      value: profile.engagementRate > 0 ? formatEngagementRate(profile.engagementRate) : 'N/A',
      icon: TrendingUp,
      color: profile.engagementRate > 3 ? 'green' : profile.engagementRate > 1 ? 'yellow' : 'red',
    },
  ]
  
  const colorClasses: Record<string, string> = {
    purple: 'bg-purple-500/20 text-purple-400',
    blue: 'bg-blue-500/20 text-blue-400',
    green: 'bg-green-500/20 text-green-400',
    red: 'bg-red-500/20 text-red-400',
    yellow: 'bg-yellow-500/20 text-yellow-400',
    cyan: 'bg-cyan-500/20 text-cyan-400',
    pink: 'bg-pink-500/20 text-pink-400',
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <Link href="/" className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-8 transition-colors">
            <ArrowLeft className="h-4 w-4" />
            New Search
          </Link>
          
          <div className="bg-gray-800/50 rounded-2xl border border-gray-700 p-8 mb-8">
            <div className="flex flex-col md:flex-row items-start gap-6">
              {profile.profilePicture && (
                <img
                  src={profile.profilePicture}
                  alt={profile.username}
                  className="w-24 h-24 rounded-full border-2 border-gray-600"
                />
              )}
              
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${colorClasses[platformColor]}`}>
                    <PlatformIcon className="h-4 w-4" />
                  </div>
                  <span className="text-sm font-medium text-gray-400 uppercase">
                    {profile.platform}
                  </span>
                </div>
                
                <h1 className="text-3xl font-bold text-white mb-2">
                  @{profile.username}
                </h1>
                
                {profile.bio && (
                  <p className="text-gray-300 mb-4 whitespace-pre-line">{profile.bio}</p>
                )}
                
                <a
                  href={profile.profileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-purple-400 hover:text-purple-300 text-sm"
                >
                  View on {profile.platform}
                  <ExternalLink className="h-3 w-3" />
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
                  className="ml-4 inline-flex items-center gap-2 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm text-gray-300 hover:text-white transition-colors"
                >
                  {copied ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-green-400" />
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
          
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
            {metrics.map((metric) => {
              const Icon = metric.icon
              return (
                <div
                  key={metric.label}
                  className="bg-gray-800/50 rounded-xl border border-gray-700 p-6"
                >
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-4 ${colorClasses[metric.color]}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <p className="text-2xl font-bold text-white mb-1">{metric.value}</p>
                  <p className="text-sm text-gray-400">{metric.label}</p>
                </div>
              )
            })}
          </div>
          
          {profile.recentContent.length > 0 && (
            <div className="bg-gray-800/50 rounded-2xl border border-gray-700 overflow-hidden">
              <div className="p-6 border-b border-gray-700">
                <h2 className="text-xl font-semibold text-white">Recent Content</h2>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-700">
                      <th className="text-left p-4 text-sm font-medium text-gray-400">Content</th>
                      <th className="text-right p-4 text-sm font-medium text-gray-400">Views</th>
                      <th className="text-right p-4 text-sm font-medium text-gray-400">Likes</th>
                      <th className="text-right p-4 text-sm font-medium text-gray-400">Comments</th>
                      {profile.platform === 'tiktok' && (
                        <th className="text-right p-4 text-sm font-medium text-gray-400">Shares</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {profile.recentContent.map((content, index) => (
                      <tr key={index} className="border-b border-gray-700/50 last:border-0">
                        <td className="p-4">
                          <a
                            href={content.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-purple-400 hover:text-purple-300 text-sm flex items-center gap-1"
                          >
                            Video {index + 1}
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </td>
                        <td className="p-4 text-right text-white text-sm">
                          {formatNumber(content.views)}
                        </td>
                        <td className="p-4 text-right text-white text-sm">
                          {formatNumber(content.likes)}
                        </td>
                        <td className="p-4 text-right text-white text-sm">
                          {formatNumber(content.comments)}
                        </td>
                        {profile.platform === 'tiktok' && (
                          <td className="p-4 text-right text-white text-sm">
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
          
          <div className="mt-8 text-center text-gray-500 text-sm">
            <p>Data fetched from public {profile.platform} profiles. Metrics are estimates.</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function ResultsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="animate-pulse text-white text-xl">Loading...</div>
      </div>
    }>
      <ResultsContent />
    </Suspense>
  )
}