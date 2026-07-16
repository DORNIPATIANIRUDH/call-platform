import { requireOrg } from '@/lib/session'
import { prisma } from '@call-platform/db'
import { notFound } from 'next/navigation'
import { LiveCoachingView } from '@/components/meetings/live-coaching-view'

interface Props { params: { id: string } }

export default async function LiveCoachingPage({ params }: Props) {
  const { org } = await requireOrg()

  const meeting = await prisma.meeting.findFirst({
    where: { id: params.id, orgId: org.id },
    select: { id: true, title: true, status: true, botStatus: true, startedAt: true },
  })

  if (!meeting) notFound()

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col gap-4">
      <div className="shrink-0">
        <h1 className="text-xl font-bold">{meeting.title}</h1>
        <p className="text-sm text-muted-foreground">Live call view</p>
      </div>
      <div className="flex-1 min-h-0">
        <LiveCoachingView meetingId={meeting.id} initialStatus={meeting.status} />
      </div>
    </div>
  )
}
