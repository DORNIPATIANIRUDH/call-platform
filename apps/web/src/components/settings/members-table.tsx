'use client'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { initials } from '@/lib/utils'
import type { MemberRole } from '@call-platform/db'

interface Member {
  id: string
  role: MemberRole
  user: { id: string; name: string | null; email: string | null; image: string | null }
}

interface Props {
  members: Member[]
  currentUserId: string
  orgId: string
}

export function MembersTable({ members, currentUserId, orgId }: Props) {
  return (
    <div className="divide-y">
      {members.map((m) => (
        <div key={m.id} className="flex items-center gap-3 py-3">
          <Avatar className="h-8 w-8">
            <AvatarImage src={m.user.image ?? undefined} />
            <AvatarFallback className="text-xs">{initials(m.user.name ?? m.user.email ?? 'U')}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{m.user.name ?? m.user.email}</p>
            {m.user.name && <p className="text-xs text-muted-foreground truncate">{m.user.email}</p>}
          </div>
          <Badge variant={m.role === 'OWNER' ? 'default' : 'secondary'} className="capitalize shrink-0">
            {m.role.toLowerCase()}
          </Badge>
          {m.user.id === currentUserId && (
            <span className="text-xs text-muted-foreground">(you)</span>
          )}
        </div>
      ))}
    </div>
  )
}
