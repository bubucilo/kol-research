'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { detectPlatform } from '@/lib/utils'
import { Search, Camera, Music, ArrowRight, Loader2, Sparkles } from 'lucide-react'

export default function Home() {
  const [url, setUrl] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const trimmedUrl = url.trim()
    if (!trimmedUrl) {
      setError('Please enter a profile URL')
      return
    }

    const platform = detectPlatform(trimmedUrl)
    if (!platform) {
      setError('Please enter a valid Instagram or TikTok profile URL')
      return
    }

    setLoading(true)

    try {
      const response = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: trimmedUrl }),
      })

      const data = await response.json()

      if (!response.ok) {
        router.push(`/error?code=${data.error?.code || 'SCRAPING_FAILED'}`)
        return
      }

      const encoded = encodeURIComponent(JSON.stringify(data.data))
      router.push(`/results?data=${encoded}`)
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative">
      <section className="px-6 py-20 md:py-28">
        <div className="max-w-[900px] mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 mb-7 rounded-full text-xs font-semibold uppercase tracking-wider text-[#3B82F6] border border-[rgba(59,130,246,0.25)] bg-[rgba(59,130,246,0.06)]">
            <Sparkles className="h-3.5 w-3.5" />
            KOL Research Tool
          </div>

          <h1
            className="text-4xl md:text-6xl font-bold tracking-tight mb-6 leading-[1.1]"
            style={{
              background: 'linear-gradient(135deg, #00CCFF, #0066FF, #00AAFF)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            Profile Calculator
          </h1>

          <p className="text-lg md:text-xl text-[rgba(255,255,255,0.7)] max-w-2xl mx-auto mb-12 leading-relaxed">
            Analyze any public Instagram or TikTok profile instantly.
            Get engagement rates, average views, and content performance metrics.
          </p>

          <form onSubmit={handleSubmit} className="max-w-2xl mx-auto space-y-4">
            <div
              className="flex items-center gap-2 px-4 py-2 rounded-xl"
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.08)',
                backdropFilter: 'blur(12px)',
              }}
            >
              <Search className="h-5 w-5 text-[#94A3B8] flex-shrink-0" />
              <input
                type="text"
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value)
                  setError('')
                }}
                placeholder="Paste Instagram or TikTok profile URL..."
                className="flex-1 bg-transparent border-0 outline-none text-white placeholder:text-[#64748B] text-base py-2 focus:ring-0"
                disabled={loading}
              />
              <button
                type="submit"
                disabled={loading}
                className="btn-filled flex items-center gap-2 text-sm py-2 px-4 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Analyzing…
                  </>
                ) : (
                  <>
                    Calculate
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>

            {error && (
              <p className="text-[#FB7185] text-sm text-left px-1">{error}</p>
            )}

            {loading && (
              <p className="text-[#64748B] text-xs text-center">
                First-time scrape may take 10-30 seconds. Cached results are instant.
              </p>
            )}
          </form>

          <div className="mt-16 grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl mx-auto">
            <div className="tool-card p-6 text-left">
              <div className="flex items-center gap-3 mb-3">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{ background: 'rgba(236,72,153,0.12)' }}
                >
                  <Camera className="h-5 w-5 text-[#F472B6]" />
                </div>
                <h3 className="text-lg font-semibold text-white">Instagram</h3>
              </div>
              <p className="text-[#94A3B8] text-sm leading-relaxed">
                Analyze follower count, post engagement, and content performance for any public Instagram profile.
              </p>
            </div>

            <div className="tool-card p-6 text-left">
              <div className="flex items-center gap-3 mb-3">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{ background: 'rgba(0,170,255,0.12)' }}
                >
                  <Music className="h-5 w-5 text-[#00AAFF]" />
                </div>
                <h3 className="text-lg font-semibold text-white">TikTok</h3>
              </div>
              <p className="text-[#94A3B8] text-sm leading-relaxed">
                Get video views, likes, comments, and engagement metrics for any public TikTok creator.
              </p>
            </div>
          </div>

          <div className="mt-12 text-[#64748B] text-xs">
            <p>Supported formats:</p>
            <p className="mt-1.5 font-mono">
              instagram.com/username · tiktok.com/@username
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}
