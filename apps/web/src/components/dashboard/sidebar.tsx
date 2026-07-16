'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Phone,
  BarChart3,
  Plug,
  Settings,
  CreditCard,
  Mic,
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

  return (
    <aside className="flex w-60 flex-col border-r bg-white">
      {/* Logo */}
      <div className="flex h-16 items-center gap-2 border-b px-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white">
          <Mic className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{org.name}</p>
          <p className="text-xs text-muted-foreground">CallPlatform</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1 p-3">
        {navItems.map((item) => {
          const active = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href) && item.href !== '/dashboard'
              ? true
              : item.href === '/dashboard' && pathname === '/dashboard'
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
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
      </nav>
    </aside>
  )
}
