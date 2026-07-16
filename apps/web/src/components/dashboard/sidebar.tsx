'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Phone, BarChart3, Plug, Settings, CreditCard, Mic, Menu, X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Organization } from '@call-platform/db'

const navItems = [
  { href: '/dashboard', label: 'Home', icon: LayoutDashboard, exact: true },
  { href: '/dashboard/meetings', label: 'Meetings', icon: Phone },
  { href: '/dashboard/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/dashboard/integrations', label: 'Integrations', icon: Plug },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
  { href: '/dashboard/settings/billing', label: 'Billing', icon: CreditCard },
]

interface SidebarProps {
  org: Organization
  user: { name?: string | null; email?: string | null; image?: string | null }
}

export function Sidebar({ org }: SidebarProps) {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  const NavLinks = () => (
    <>
      {navItems.map((item) => {
        const active =
          item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href) && item.href !== '/dashboard'
              ? true
              : item.href === '/dashboard' && pathname === '/dashboard'
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setMobileOpen(false)}
            className={cn(
              'flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors',
              active
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            <item.icon className="h-4 w-4 shrink-0" />
            {item.label}
          </Link>
        )
      })}
    </>
  )

  return (
    <>
      {/* ── Desktop sidebar ── */}
      <aside className="hidden md:flex w-60 flex-col border-r bg-white">
        <div className="flex h-16 items-center gap-2 border-b px-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white">
            <Mic className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{org.name}</p>
            <p className="text-xs text-muted-foreground">CallPlatform</p>
          </div>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          <NavLinks />
        </nav>
      </aside>

      {/* ── Mobile top bar ── */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 flex h-14 items-center justify-between border-b bg-white px-4">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-white">
            <Mic className="h-3.5 w-3.5" />
          </div>
          <span className="text-sm font-semibold truncate max-w-[160px]">{org.name}</span>
        </div>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-1.5 rounded-md hover:bg-muted"
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* ── Mobile drawer overlay ── */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-30 bg-black/40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ── Mobile drawer ── */}
      <div className={cn(
        'md:hidden fixed top-14 left-0 bottom-0 z-40 w-64 bg-white border-r shadow-lg transition-transform duration-200',
        mobileOpen ? 'translate-x-0' : '-translate-x-full'
      )}>
        <nav className="space-y-1 p-3 pt-4">
          <NavLinks />
        </nav>
      </div>
    </>
  )
}
