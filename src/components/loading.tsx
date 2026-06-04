'use client'

import { Loader2 } from 'lucide-react'

interface LoadingSpinnerProps {
  text?: string
}

export function LoadingSpinner({ text = 'Loading...' }: LoadingSpinnerProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="h-12 w-12 text-purple-400 animate-spin mx-auto mb-4" />
        <p className="text-white text-lg">{text}</p>
        <p className="text-gray-400 text-sm mt-2">This may take a few seconds...</p>
      </div>
    </div>
  )
}