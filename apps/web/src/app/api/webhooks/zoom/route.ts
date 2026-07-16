import { NextResponse, type NextRequest } from 'next/server'
import { prisma } from '@call-platform/db'
import { verifyZoomWebhook } from '@call-platform/integrations'
import { createBotJoinQueue } from '@call-platform/queue'

export async function POST(req: NextRequest) {
  const body = await req.text()
  const timestamp = req.headers.get('x-zm-request-timestamp') ?? ''
  const signature = req.headers.get('x-zm-signature') ?? ''

  // Zoom URL validation challenge
  const parsed = JSON.parse(body)
  if (parsed.event === 'endpoint.url_validation') {
    const crypto = require('crypto')
    const hash = crypto.createHmac('sha256', process.env.ZOOM_WEBHOOK_SECRET!).update(parsed.payload.plainToken).digest('hex')
    return NextResponse.json({ plainToken: parsed.payload.plainToken, encryptedToken: hash })
  }

  if (!verifyZoomWebhook(body, timestamp, signature)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  const { event, payload } = parsed

  if (event === 'meeting.started') {
    const meetingId = payload.object?.id
    const joinUrl = payload.object?.join_url
    const hostEmail = payload.object?.host_email

    if (!meetingId || !joinUrl) return NextResponse.json({ ok: true })

    // Find org with Zoom integration that owns this host
    const integration = await prisma.integration.findFirst({
      where: { platform: 'ZOOM' },
      include: { organization: true },
    })
    if (!integration) return NextResponse.json({ ok: true })

    // Create or find meeting record
    const meeting = await prisma.meeting.upsert({
      where: { orgId_externalId: { orgId: integration.orgId, externalId: String(meetingId) } } as any,
      create: {
        orgId: integration.orgId,
        title: payload.object?.topic ?? 'Zoom Meeting',
        platform: 'ZOOM',
        externalId: String(meetingId),
        joinUrl,
        hostEmail: hostEmail ?? null,
        status: 'BOT_JOINING',
      },
      update: { joinUrl, status: 'BOT_JOINING', startedAt: new Date() },
    })

    // Enqueue bot join
    const queue = createBotJoinQueue()
    await queue.add('bot-join', {
      meetingId: meeting.id,
      orgId: integration.orgId,
      platform: 'ZOOM',
      joinUrl,
    })
    await queue.close()
  }

  if (event === 'meeting.ended') {
    const externalId = String(payload.object?.id ?? '')
    await prisma.meeting.updateMany({
      where: { externalId, platform: 'ZOOM' },
      data: { status: 'PROCESSING', endedAt: new Date() },
    })
  }

  return NextResponse.json({ ok: true })
}
