'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Calculator, Compass } from 'lucide-react'

export function Header() {
  const pathname = usePathname()

  return (
    <header className="bg-gray-900/80 backdrop-blur-sm border-b border-gray-800 sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <Link
          href="/"
          className="flex items-center gap-2 text-white hover:text-purple-400 transition-colors"
        >
          <Calculator className="h-6 w-6 text-purple-400" />
          <span className="text-xl font-bold">Profile Calculator</span>
        </Link>

        <nav className="flex items-center gap-6">
          <Link
            href="/"
            className={`text-sm transition-colors ${
              pathname === '/'
                ? 'text-white font-medium'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Calculator
          </Link>
          <Link
            href="/discover"
            className={`flex items-center gap-1.5 text-sm transition-colors ${
              pathname === '/discover'
                ? 'text-white font-medium'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Compass className="h-4 w-4" />
            Discovery
          </Link>
        </nav>
      </div>
    </header>
  )
}