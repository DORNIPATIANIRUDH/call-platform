import { requireOrg } from '@/lib/session'
import { prisma } from '@call-platform/db'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatDuration, formatDateTime } from '@/lib/utils'
import Link from 'next/link'
import { Upload } from 'lucide-react'
import { UploadMeetingDialog } from '@/components/meetings/upload-meeting-dialog'

export default async function MeetingsPage() {
  const { org } = await requireOrg()

  const meetings = await prisma.meeting.findMany({
    where: { orgId: org.id },
    orderBy: { createdAt: 'desc' },
    include: { analysis: { select: { dealScore: true, summary: true } } },
  })

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold">Meetings</h1>
          <p className="text-sm text-muted-foreground">{meetings.length} total</p>
        </div>
        <UploadMeetingDialog orgId={org.id} />
      </div>

      <Card>
        <CardContent className="p-0">
          {meetings.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground">
              <Upload className="mx-auto mb-3 h-8 w-8 opacity-40" />
              <p className="font-medium text-sm">No meetings yet</p>
              <p className="mt-1 text-xs">Upload a recording to get started.</p>
            </div>
          ) : (
            <div className="divide-y">
              {meetings.map((meeting) => (
                <Link
                  key={meeting.id}
                  href={`/dashboard/meetings/${meeting.id}`}
                  className="flex items-start justify-between gap-3 px-4 py-3 hover:bg-muted/30 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{meeting.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formatDateTime(meeting.createdAt)}
                      {meeting.durationSeconds ? ` · ${formatDuration(meeting.durationSeconds)}` : ''}
                    </p>
                    {meeting.analysis?.summary && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{meeting.analysis.summary.slice(0, 80)}…</p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <MeetingStatusBadge status={meeting.status} />
                    {meeting.analysis?.dealScore != null && (
                      <span className={`text-xs font-semibold ${meeting.analysis.dealScore >= 70 ? 'text-green-600' : meeting.analysis.dealScore >= 40 ? 'text-yellow-600' : 'text-red-600'}`}>
                        {meeting.analysis.dealScore}/100
                      </span>
                    )}
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

function MeetingStatusBadge({ status }: { status: string }) {
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
