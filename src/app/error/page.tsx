'use client'

import { useSearchParams } from 'next/navigation'
import { useEffect, useState, Suspense } from 'react'
import Link from 'next/link'
import { ArrowLeft, AlertCircle, Lock, SearchX, Clock } from 'lucide-react'

const errorConfig: Record<string, { icon: typeof AlertCircle; title: string; message: string }> = {
  INVALID_URL: {
    icon: SearchX,
    title: 'Invalid Profile URL',
    message: 'Please enter a valid Instagram or TikTok profile URL. Make sure the format is correct.',
  },
  PRIVATE_PROFILE: {
    icon: Lock,
    title: 'Private Profile',
    message: 'This profile is set to private. We can only analyze public profiles.',
  },
  NOT_FOUND: {
    icon: SearchX,
    title: 'Profile Not Found',
    message: "We couldn't find this profile. Please check the username and try again.",
  },
  RATE_LIMITED: {
    icon: Clock,
    title: 'Too Many Requests',
    message: "We've received too many requests. Please wait a moment and try again.",
  },
  SCRAPING_FAILED: {
    icon: AlertCircle,
    title: 'Data Unavailable',
    message: "We couldn't fetch the profile data right now. This might be temporary - please try again later.",
  },
}

function ErrorContent() {
  const searchParams = useSearchParams()
  const [errorCode, setErrorCode] = useState<string>('SCRAPING_FAILED')

  useEffect(() => {
    const code = searchParams.get('code')
    if (code && errorConfig[code]) {
      setErrorCode(code)
    }
  }, [searchParams])

  const config = errorConfig[errorCode]
  const Icon = config.icon

  return (
    <div className="px-6 py-20 flex items-center justify-center">
      <div className="max-w-md mx-auto text-center">
        <div
          className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
          style={{ background: 'rgba(239,68,68,0.12)' }}
        >
          <Icon className="h-10 w-10 text-[#F87171]" />
        </div>

        <h1
          className="text-3xl font-bold tracking-tight mb-4"
          style={{
            background: 'linear-gradient(135deg, #00CCFF, #0066FF, #00AAFF)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          {config.title}
        </h1>
        <p className="text-[#94A3B8] mb-8 leading-relaxed">{config.message}</p>

        <Link href="/" className="btn-filled inline-flex items-center gap-2">
          <ArrowLeft className="h-4 w-4" />
          Try Another Profile
        </Link>
      </div>
    </div>
  )
}

export default function ErrorPage() {
  return (
    <Suspense fallback={
      <div className="px-6 py-20 text-center text-[#94A3B8] text-xl">Loading...</div>
    }>
      <ErrorContent />
    </Suspense>
  )
}
