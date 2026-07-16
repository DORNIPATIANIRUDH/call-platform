import type { Job } from 'bullmq'
import type { SlackNotifyJobData } from '@call-platform/types'
import { prisma } from '@call-platform/db'
import { SlackClient } from '@call-platform/integrations'

export async function handleSlackNotify(job: Job<SlackNotifyJobData>) {
  const { meetingId, orgId, channelId } = job.data

  const meeting = await prisma.meeting.findUnique({
    where: { id: meetingId },
    include: { analysis: true, actionItems: { where: { status: 'OPEN' } } },
  })
  if (!meeting?.analysis) throw new Error(`No analysis for meeting ${meetingId}`)

  const integration = await prisma.integration.findUnique({
    where: { orgId_platform: { orgId, platform: 'SLACK' } },
  })
  if (!integration) return

  const client = new SlackClient(integration.accessToken)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.callplatform.io'
  const meetingUrl = `${appUrl}/dashboard/meetings/${meetingId}`

  // Use configured channel or default from metadata
  const targetChannel = channelId ?? (integration.metadata as any)?.default_channel ?? '#general'

  const actionItemTexts = meeting.actionItems.slice(0, 5).map((i) => {
    const due = i.dueDate ? ` (due ${i.dueDate.toISOString().slice(0, 10)})` : ''
    const who = i.assignee ? ` — ${i.assignee}` : ''
    return `${i.text}${who}${due}`
  })

  const blocks = client.buildMeetingSummaryBlocks(
    meeting.title,
    meeting.analysis.summary ?? 'No summary available.',
    actionItemTexts,
    meetingUrl
  )

  await client.postMessage(
    targetChannel,
    `📞 New call summary: *${meeting.title}*`,
    blocks
  )
}
