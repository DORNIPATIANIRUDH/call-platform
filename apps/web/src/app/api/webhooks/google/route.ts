import { NextResponse, type NextRequest } from 'next/server'
import { prisma } from '@call-platform/db'
import { GoogleCalendarClient } from '@call-platform/integrations'
import { createBotJoinQueue } from '@call-platform/queue'

export async function POST(req: NextRequest) {
  // Google sends a sync token validation on first subscribe
  const channelToken = req.headers.get('x-goog-channel-token')
  const resourceState = req.headers.get('x-goog-resource-state')
  const channelId = req.headers.get('x-goog-channel-id')

  if (resourceState === 'sync') return NextResponse.json({ ok: true })

  // Find the org by channel ID (stored in integration metadata)
  const integration = await prisma.integration.findFirst({
    where: { platform: 'GOOGLE', metadata: { path: ['channelId'], equals: channelId ?? '' } },
  })
  if (!integration) return NextResponse.json({ ok: true })

  // Refresh upcoming events and schedule bot joins
  const calendarClient = new GoogleCalendarClient(integration.accessToken)
  const events = await calendarClient.getUpcomingEvents(10)

  const queue = createBotJoinQueue()
  for (const event of events) {
    if (!event.joinUrl) continue
    const startsIn = event.startAt.getTime() - Date.now()
    if (startsIn < 0 || startsIn > 15 * 60 * 1000) continue // only join if starting within 15 min

    const meeting = await prisma.meeting.upsert({
      where: { orgId_externalId: { orgId: integration.orgId, externalId: event.id } } as any,
      create: {
        orgId: integration.orgId,
        title: event.title,
        platform: 'GOOGLE',
        externalId: event.id,
        joinUrl: event.joinUrl,
        scheduledAt: event.startAt,
        status: 'SCHEDULED',
      },
      update: { joinUrl: event.joinUrl, scheduledAt: event.startAt },
    })

    await queue.add('bot-join', {
      meetingId: meeting.id,
      orgId: integration.orgId,
      platform: 'GOOGLE',
      joinUrl: event.joinUrl,
    }, { delay: Math.max(0, startsIn) })
  }
  await queue.close()

  return NextResponse.json({ ok: true })
}
