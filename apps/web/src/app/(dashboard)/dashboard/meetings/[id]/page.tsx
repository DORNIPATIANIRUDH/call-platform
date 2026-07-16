import { requireOrg } from '@/lib/session'
import { prisma } from '@call-platform/db'
import { notFound } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatDuration, formatDateTime } from '@/lib/utils'
import { TranscriptViewer } from '@/components/meetings/transcript-viewer'
import { AnalysisPanel } from '@/components/meetings/analysis-panel'
import { ActionItemsList } from '@/components/meetings/action-items-list'
import { DealSignalsList } from '@/components/meetings/deal-signals-list'

interface Props {
  params: { id: string }
}

export default async function MeetingDetailPage({ params }: Props) {
  const { org } = await requireOrg()

  const meeting = await prisma.meeting.findFirst({
    where: { id: params.id, orgId: org.id },
    include: {
      recording: true,
      transcripts: { orderBy: { startMs: 'asc' } },
      analysis: true,
      actionItems: { orderBy: { createdAt: 'asc' } },
      dealSignals: { orderBy: { timestampMs: 'asc' } },
    },
  })

  if (!meeting) notFound()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{meeting.title}</h1>
          <p className="text-sm text-muted-foreground">
            {formatDateTime(meeting.createdAt)}
            {meeting.durationSeconds ? ` · ${formatDuration(meeting.durationSeconds)}` : ''}
            {meeting.platform ? ` · ${meeting.platform}` : ''}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {meeting.analysis?.dealScore != null && (
            <Badge variant={meeting.analysis.dealScore >= 70 ? 'success' : 'secondary'} className="text-base px-3 py-1">
              Deal Score: {meeting.analysis.dealScore}/100
            </Badge>
          )}
        </div>
      </div>

      {/* Grid layout */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: Transcript (2/3) */}
        <div className="lg:col-span-2 space-y-6">
          {meeting.analysis && <AnalysisPanel analysis={meeting.analysis} />}
          <TranscriptViewer segments={meeting.transcripts} />
        </div>

        {/* Right: Sidebar (1/3) */}
        <div className="space-y-6">
          <ActionItemsList items={meeting.actionItems} meetingId={meeting.id} />
          <DealSignalsList signals={meeting.dealSignals} />
        </div>
      </div>
    </div>
  )
}
