'use client'

import Link from 'next/link'
import Image from 'next/image'

export function Footer() {
  return (
    <footer
      className="mt-auto"
      style={{
        background: 'rgba(10, 15, 26, 0.85)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderTop: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      <div className="max-w-[1200px] mx-auto px-6 py-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="relative w-7 h-7 rounded-md overflow-hidden flex-shrink-0">
              <Image
                src="/favicon.png"
                alt="Proton Media"
                width={28}
                height={28}
                className="object-cover"
              />
            </div>
            <div className="text-sm">
              <p className="text-white font-semibold">Proton Media Indonesia</p>
              <p className="text-xs text-[#94A3B8]">
                Growth marketing agency · Social · KOL · Livestream
              </p>
            </div>
          </div>

          <div className="flex flex-col md:flex-row items-center gap-3 md:gap-6 text-xs">
            <Link
              href="/"
              className="text-[#94A3B8] hover:text-white transition-colors"
            >
              Calculator
            </Link>
            <Link
              href="/discover"
              className="text-[#94A3B8] hover:text-white transition-colors"
            >
              Discovery
            </Link>
            <a
              href="https://protonmedia.co.id"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#00AAFF] hover:text-[#60A5FA] transition-colors font-medium"
            >
              protonmedia.co.id →
            </a>
          </div>
        </div>

        <p className="text-center text-[11px] text-[#64748B] mt-6">
          Data is fetched from public profiles. Metrics are estimates.
        </p>
      </div>
    </footer>
  )
}
