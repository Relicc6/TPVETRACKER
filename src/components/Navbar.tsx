'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Target, Building2, TrendingUp, LogIn, LayoutDashboard, Shield } from 'lucide-react'

const navLinks = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/tasks', label: 'Tasks', icon: Target },
  { href: '/hideout', label: 'Hideout', icon: Building2 },
  { href: '/kappa', label: 'Kappa', icon: Shield },
  { href: '/prices', label: 'Flea Market', icon: TrendingUp },
]

export default function Navbar() {
  const pathname = usePathname()

  return (
    <nav className="border-b border-tarkov-border bg-tarkov-surface sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 flex items-center h-14 gap-1">
        <Link href="/" className="mr-6 flex items-center gap-2">
          <span className="text-tarkov-yellow font-bold text-lg tracking-widest font-mono">
            TPVE
          </span>
          <span className="text-tarkov-muted text-xs hidden sm:block">TRACKER</span>
        </Link>

        <div className="flex items-center gap-1 flex-1">
          {navLinks.map(({ href, label, icon: Icon }) => {
            const active = href === '/' ? pathname === '/' : pathname.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-sm transition-colors ${
                  active
                    ? 'bg-tarkov-yellow/10 text-tarkov-yellow border border-tarkov-yellow/30'
                    : 'text-tarkov-muted hover:text-tarkov-text hover:bg-white/5'
                }`}
              >
                <Icon size={14} />
                <span className="hidden sm:block">{label}</span>
              </Link>
            )
          })}
        </div>

        <Link
          href="/auth"
          className="flex items-center gap-1.5 text-tarkov-muted hover:text-tarkov-yellow text-sm transition-colors px-2"
        >
          <LogIn size={14} />
          <span className="hidden sm:block">Sign In</span>
        </Link>
      </div>
    </nav>
  )
}
