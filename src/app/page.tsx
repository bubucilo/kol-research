'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { detectPlatform } from '@/lib/utils'
import { Search, Camera, Music, ArrowRight, Loader2 } from 'lucide-react'

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
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-6 bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-pink-500 to-red-500">
            Profile Calculator
          </h1>
          
          <p className="text-xl text-gray-300 mb-12">
            Analyze any public Instagram or TikTok profile instantly.
            Get engagement rates, average views, and content performance metrics.
          </p>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value)
                  setError('')
                }}
                placeholder="Paste Instagram or TikTok profile URL..."
                className="w-full pl-12 pr-4 py-4 bg-gray-800/50 border border-gray-700 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-lg"
                disabled={loading}
              />
            </div>
            
            {error && (
              <p className="text-red-400 text-sm">{error}</p>
            )}
            
            <button
              type="submit"
              disabled={loading}
              className="w-full md:w-auto px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-xl hover:from-purple-700 hover:to-pink-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Analyzing... (may take 10-15 seconds)
                </>
              ) : (
                <>
                  Calculate Profile
                  <ArrowRight className="h-5 w-5" />
                </>
              )}
            </button>
          </form>
          
          <div className="mt-16 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 bg-gray-800/50 rounded-xl border border-gray-700">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-pink-500/20 rounded-lg flex items-center justify-center">
                  <Camera className="h-5 w-5 text-pink-400" />
                </div>
                <h3 className="text-lg font-semibold text-white">Instagram</h3>
              </div>
              <p className="text-gray-400 text-sm">
                Analyze follower count, post engagement, and content performance for any public Instagram profile.
              </p>
            </div>
            
            <div className="p-6 bg-gray-800/50 rounded-xl border border-gray-700">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-cyan-500/20 rounded-lg flex items-center justify-center">
                  <Music className="h-5 w-5 text-cyan-400" />
                </div>
                <h3 className="text-lg font-semibold text-white">TikTok</h3>
              </div>
              <p className="text-gray-400 text-sm">
                Get video views, likes, comments, and engagement metrics for any public TikTok creator.
              </p>
            </div>
          </div>
          
          <div className="mt-12 text-gray-500 text-sm">
            <p>Supported formats:</p>
            <p className="mt-1 font-mono text-xs">
              instagram.com/username • tiktok.com/@username
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}