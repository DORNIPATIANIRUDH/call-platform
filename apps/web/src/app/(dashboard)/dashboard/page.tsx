import { requireOrg } from '@/lib/session'
import { prisma } from '@call-platform/db'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatDuration, formatDateTime } from '@/lib/utils'
import { Phone, Clock, TrendingUp, Zap } from 'lucide-react'
import Link from 'next/link'

export default async function DashboardPage() {
  const { org } = await requireOrg()

  const [totalMeetings, recentMeetings, completedThisMonth] = await Promise.all([
    prisma.meeting.count({ where: { orgId: org.id } }),
    prisma.meeting.findMany({
      where: { orgId: org.id },
      orderBy: { createdAt: 'desc' },
      take: 8,
      include: { analysis: true },
    }),
    prisma.meeting.count({
      where: {
        orgId: org.id,
        status: 'COMPLETED',
        createdAt: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) },
      },
    }),
  ])

  const avgScore =
    recentMeetings.filter((m) => m.analysis?.dealScore).length > 0
      ? Math.round(
          recentMeetings
            .filter((m) => m.analysis?.dealScore)
            .reduce((sum, m) => sum + (m.analysis?.dealScore ?? 0), 0) /
            recentMeetings.filter((m) => m.analysis?.dealScore).length
        )
      : null

  const stats = [
    { label: 'Total Meetings', value: totalMeetings, icon: Phone, color: 'text-blue-600' },
    { label: 'This Month', value: completedThisMonth, icon: Clock, color: 'text-green-600' },
    { label: 'Avg Deal Score', value: avgScore ? `${avgScore}/100` : '—', icon: TrendingUp, color: 'text-purple-600' },
    { label: 'Minutes Used', value: `${org.subscription?.minutesUsed ?? 0}/${org.subscription?.minutesLimit ?? 300}`, icon: Zap, color: 'text-orange-600' },
  ]

  return (
    <div className="space-y-4 md:space-y-6">
      <div>
        <h1 className="text-xl md:text-2xl font-bold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Welcome back to {org.name}</p>
      </div>

      {/* Stats — 2 cols on mobile, 4 on desktop */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-1 pt-3 px-4">
              <CardTitle className="text-xs font-medium text-muted-foreground leading-tight">{stat.label}</CardTitle>
              <stat.icon className={`h-4 w-4 shrink-0 ${stat.color}`} />
            </CardHeader>
            <CardContent className="px-4 pb-3">
              <p className="text-xl md:text-2xl font-bold">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Meetings */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between py-3 px-4">
          <CardTitle className="text-base">Recent Meetings</CardTitle>
          <Link href="/dashboard/meetings" className="text-xs text-primary hover:underline">
            View all →
          </Link>
        </CardHeader>
        <CardContent className="px-4 pb-3">
          {recentMeetings.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground">
              <Phone className="mx-auto mb-3 h-8 w-8 opacity-40" />
              <p className="font-medium text-sm">No meetings yet</p>
              <p className="text-xs mt-1">Upload a recording to get started.</p>
            </div>
          ) : (
            <div className="divide-y">
              {recentMeetings.map((meeting) => (
                <Link
                  key={meeting.id}
                  href={`/dashboard/meetings/${meeting.id}`}
                  className="flex items-center justify-between py-3 hover:bg-muted/50 -mx-2 px-2 rounded transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{meeting.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDateTime(meeting.createdAt)}
                    </p>
                  </div>
                  <div className="ml-2 flex items-center gap-1.5 shrink-0">
                    {meeting.analysis?.dealScore != null && (
                      <Badge variant={meeting.analysis.dealScore >= 70 ? 'success' : 'secondary'} className="text-xs">
                        {meeting.analysis.dealScore}
                      </Badge>
                    )}
                    <StatusBadge status={meeting.status} />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; variant: 'default' | 'secondary' | 'success' | 'outline' | 'destructive' }> = {
    COMPLETED: { label: 'Done', variant: 'success' },
    PROCESSING: { label: 'Processing', variant: 'secondary' },
    IN_PROGRESS: { label: 'Live', variant: 'default' },
    SCHEDULED: { label: 'Scheduled', variant: 'outline' },
    FAILED: { label: 'Failed', variant: 'destructive' },
    BOT_JOINING: { label: 'Joining', variant: 'secondary' },
  }
  const { label, variant } = map[status] ?? { label: status, variant: 'outline' }
  return <Badge variant={variant} className="text-xs">{label}</Badge>
}
