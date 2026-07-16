import { NextResponse, type NextRequest } from 'next/server'
import { prisma } from '@call-platform/db'
import { MicrosoftCalendarClient } from '@call-platform/integrations'
import { createBotJoinQueue } from '@call-platform/queue'

export async function POST(req: NextRequest) {
  // Microsoft validation challenge
  const { searchParams } = new URL(req.url)
  const validationToken = searchParams.get('validationToken')
  if (validationToken) {
    return new NextResponse(validationToken, { headers: { 'Content-Type': 'text/plain' } })
  }

  const body = await req.json()
  const notifications = body.value ?? []

  for (const notification of notifications) {
    const clientState = notification.clientState
    if (clientState !== process.env.BOT_SECRET) continue

    const subscriptionId = notification.subscriptionId
    const integration = await prisma.integration.findFirst({
      where: { platform: 'MICROSOFT', metadata: { path: ['subscriptionId'], equals: subscriptionId } },
    })
    if (!integration) continue

    const calClient = new MicrosoftCalendarClient(integration.accessToken)
    const events = await calClient.getUpcomingEvents(10)
    const queue = createBotJoinQueue()

    for (const event of events) {
      if (!event.joinUrl) continue
      const startsIn = event.startAt.getTime() - Date.now()
      if (startsIn < 0 || startsIn > 15 * 60 * 1000) continue

      const meeting = await prisma.meeting.upsert({
        where: { orgId_externalId: { orgId: integration.orgId, externalId: event.id } } as any,
        create: {
          orgId: integration.orgId,
          title: event.title,
          platform: 'MICROSOFT',
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
        platform: 'MICROSOFT',
        joinUrl: event.joinUrl,
      }, { delay: Math.max(0, startsIn) })
    }
    await queue.close()
  }

  return NextResponse.json({ ok: true })
}
