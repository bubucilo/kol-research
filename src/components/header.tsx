'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Image from 'next/image'

export function Header() {
  const pathname = usePathname()

  return (
    <header
      className="sticky top-0 z-50 transition-all"
      style={{
        background: 'rgba(10, 15, 26, 0.85)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      <div className="max-w-[1200px] mx-auto px-6 py-3.5 flex items-center justify-between">
        <Link
          href="/"
          className="flex items-center gap-2.5 group"
        >
          <div className="relative w-8 h-8 rounded-lg overflow-hidden flex-shrink-0">
            <Image
              src="/favicon.png"
              alt="Proton Media"
              width={32}
              height={32}
              className="object-cover"
            />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-white font-bold text-sm tracking-tight">
              Proton Media
            </span>
            <span className="text-[10px] font-medium uppercase tracking-wider text-[#3B82F6]">
              KOL Research
            </span>
          </div>
        </Link>

        <nav className="flex items-center gap-1">
          <Link
            href="/"
            className="px-3.5 py-2 rounded-lg text-sm font-medium transition-colors"
            style={{
              color: pathname === '/' ? '#ffffff' : 'rgba(255,255,255,0.7)',
              background: pathname === '/' ? 'rgba(59,130,246,0.1)' : 'transparent',
            }}
          >
            Calculator
          </Link>
          <Link
            href="/discover"
            className="px-3.5 py-2 rounded-lg text-sm font-medium transition-colors"
            style={{
              color: pathname === '/discover' ? '#ffffff' : 'rgba(255,255,255,0.7)',
              background: pathname === '/discover' ? 'rgba(59,130,246,0.1)' : 'transparent',
            }}
          >
            Discovery
          </Link>
          <a
            href="https://protonmedia.co.id"
            target="_blank"
            rel="noopener noreferrer"
            className="ml-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all"
            style={{
              background: 'linear-gradient(135deg, #0066FF, #00AAFF)',
              color: '#fff',
              boxShadow: '0 4px 16px rgba(0, 102, 255, 0.3)',
            }}
          >
            protonmedia.co.id →
          </a>
        </nav>
      </div>
    </header>
  )
}
