import { requireOrg } from '@/lib/session'
import { prisma } from '@call-platform/db'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatDuration, formatDateTime } from '@/lib/utils'
import Link from 'next/link'
import { Plus, Upload } from 'lucide-react'
import { UploadMeetingDialog } from '@/components/meetings/upload-meeting-dialog'

export default async function MeetingsPage() {
  const { org } = await requireOrg()

  const meetings = await prisma.meeting.findMany({
    where: { orgId: org.id },
    orderBy: { createdAt: 'desc' },
    include: { analysis: { select: { dealScore: true, summary: true } }, recording: { select: { durationSec: true } } },
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Meetings</h1>
          <p className="text-muted-foreground">{meetings.length} total</p>
        </div>
        <UploadMeetingDialog orgId={org.id} />
      </div>

      <Card>
        <CardContent className="p-0">
          {meetings.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground">
              <Upload className="mx-auto mb-3 h-8 w-8 opacity-40" />
              <p className="font-medium">No meetings yet</p>
              <p className="mt-1 text-sm">Upload a recording or connect your calendar to auto-join meetings.</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b text-left text-xs font-medium uppercase text-muted-foreground">
                  <th className="px-6 py-3">Meeting</th>
                  <th className="px-6 py-3 hidden md:table-cell">Date</th>
                  <th className="px-6 py-3 hidden lg:table-cell">Duration</th>
                  <th className="px-6 py-3 hidden lg:table-cell">Deal Score</th>
                  <th className="px-6 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {meetings.map((meeting) => (
                  <tr key={meeting.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4">
                      <Link href={`/dashboard/meetings/${meeting.id}`} className="font-medium hover:underline">
                        {meeting.title}
                      </Link>
                      {meeting.analysis?.summary && (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{meeting.analysis.summary.slice(0, 80)}…</p>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground hidden md:table-cell">
                      {formatDateTime(meeting.createdAt)}
                    </td>
                    <td className="px-6 py-4 text-sm hidden lg:table-cell">
                      {meeting.durationSeconds ? formatDuration(meeting.durationSeconds) : '—'}
                    </td>
                    <td className="px-6 py-4 hidden lg:table-cell">
                      {meeting.analysis?.dealScore != null ? (
                        <span className={`font-semibold ${meeting.analysis.dealScore >= 70 ? 'text-green-600' : meeting.analysis.dealScore >= 40 ? 'text-yellow-600' : 'text-red-600'}`}>
                          {meeting.analysis.dealScore}/100
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-6 py-4">
                      <MeetingStatusBadge status={meeting.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function MeetingStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; variant: 'default' | 'secondary' | 'success' | 'outline' | 'destructive' }> = {
    COMPLETED: { label: 'Completed', variant: 'success' },
    PROCESSING: { label: 'Processing', variant: 'secondary' },
    IN_PROGRESS: { label: 'Live', variant: 'default' },
    SCHEDULED: { label: 'Scheduled', variant: 'outline' },
    FAILED: { label: 'Failed', variant: 'destructive' },
    BOT_JOINING: { label: 'Bot joining', variant: 'secondary' },
  }
  const { label, variant } = map[status] ?? { label: status, variant: 'outline' }
  return <Badge variant={variant}>{label}</Badge>
}
