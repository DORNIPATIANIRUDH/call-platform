import type { Job } from 'bullmq'
import type { AnalysisJobData } from '@call-platform/types'
import { getAnalysisProvider } from '@call-platform/ai'
import { prisma } from '@call-platform/db'
import { createCrmSyncQueue, createSlackNotifyQueue } from '@call-platform/queue'

export async function handleAnalysis(job: Job<AnalysisJobData>) {
  const { meetingId, orgId } = job.data

  const meeting = await prisma.meeting.findUnique({
    where: { id: meetingId },
    include: { transcripts: { orderBy: { startMs: 'asc' } } },
  })
  if (!meeting) throw new Error(`Meeting ${meetingId} not found`)

  if (meeting.transcripts.length === 0) {
    await prisma.meeting.update({ where: { id: meetingId }, data: { status: 'FAILED' } })
    throw new Error('No transcript segments to analyze')
  }

  const provider = getAnalysisProvider()

  const segments = meeting.transcripts.map((t) => ({
    text: t.text,
    startMs: t.startMs,
    endMs: t.endMs,
    speakerId: t.speakerId ?? undefined,
    confidence: t.confidence ?? undefined,
  }))

  const analysis = await provider.analyzeMeeting(segments, {
    meetingId,
    orgId,
    title: meeting.title,
    platform: meeting.platform ?? undefined,
    hostEmail: meeting.hostEmail ?? undefined,
  })

  // Upsert analysis record
  await prisma.analysis.upsert({
    where: { meetingId },
    create: {
      meetingId,
      summary: analysis.summary,
      keyTopics: analysis.keyTopics,
      nextSteps: analysis.nextSteps,
      sentiment: analysis.sentiment,
      dealScore: analysis.dealScore,
      talkTime: analysis.talkTime as any,
      processingJob: 'COMPLETED',
    },
    update: {
      summary: analysis.summary,
      keyTopics: analysis.keyTopics,
      nextSteps: analysis.nextSteps,
      sentiment: analysis.sentiment,
      dealScore: analysis.dealScore,
      talkTime: analysis.talkTime as any,
      processingJob: 'COMPLETED',
    },
  })

  // Save action items
  if (analysis.actionItems.length > 0) {
    await prisma.actionItem.createMany({
      data: analysis.actionItems.map((item) => ({
        meetingId,
        text: item.text,
        assignee: item.assignee ?? null,
        dueDate: item.dueDate ? new Date(item.dueDate) : null,
        status: 'OPEN',
      })),
      skipDuplicates: true,
    })
  }

  // Save deal signals
  if (analysis.dealSignals.length > 0) {
    await prisma.dealSignal.createMany({
      data: analysis.dealSignals.map((sig) => ({
        meetingId,
        type: sig.type,
        text: sig.text,
        speaker: sig.speaker ?? null,
        timestampMs: sig.timestampMs ?? null,
        confidence: sig.confidence ?? null,
      })),
      skipDuplicates: true,
    })
  }

  // Mark meeting completed
  await prisma.meeting.update({ where: { id: meetingId }, data: { status: 'COMPLETED' } })

  // Check which downstream integrations are connected
  const integrations = await prisma.integration.findMany({
    where: { orgId, platform: { in: ['HUBSPOT', 'SALESFORCE', 'SLACK'] } },
  })
  const connectedPlatforms = integrations.map((i) => i.platform)

  const crmPlatforms = connectedPlatforms.filter((p) => p === 'HUBSPOT' || p === 'SALESFORCE') as Array<'HUBSPOT' | 'SALESFORCE'>
  if (crmPlatforms.length > 0) {
    const crmQueue = createCrmSyncQueue()
    await crmQueue.add('crm-sync', { meetingId, orgId, platforms: crmPlatforms })
    await crmQueue.close()
  }

  if (connectedPlatforms.includes('SLACK')) {
    const slackQueue = createSlackNotifyQueue()
    await slackQueue.add('slack-notify', { meetingId, orgId })
    await slackQueue.close()
  }
}
