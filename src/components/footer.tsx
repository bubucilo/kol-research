'use client'

export function Footer() {
  return (
    <footer className="bg-gray-900/80 border-t border-gray-800 py-6 mt-auto">
      <div className="container mx-auto px-4 text-center">
        <p className="text-gray-400 text-sm">
          Profile Calculator - Analyze public Instagram & TikTok profiles
        </p>
        <p className="text-gray-500 text-xs mt-2">
          Data is fetched from public profiles. Metrics are estimates.
        </p>
      </div>
    </footer>
  )
}