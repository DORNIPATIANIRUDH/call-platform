import type { Job } from 'bullmq'
import type { BotJoinJobData } from '@call-platform/types'
import { prisma } from '@call-platform/db'

export async function handleBotJoin(job: Job<BotJoinJobData>) {
  const { meetingId, orgId, platform, joinUrl } = job.data

  await prisma.meeting.update({
    where: { id: meetingId },
    data: { status: 'BOT_JOINING', botStatus: 'JOINING' },
  })

  // Signal the bot service to join via HTTP
  const botUrl = process.env.BOT_WORKER_URL
  const botSecret = process.env.BOT_SECRET
  if (!botUrl || !botSecret) {
    console.warn('BOT_WORKER_URL or BOT_SECRET not configured — skipping bot join')
    return
  }

  const res = await fetch(`${botUrl}/join`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-bot-secret': botSecret,
    },
    body: JSON.stringify({ meetingId, orgId, platform, joinUrl }),
  })

  if (!res.ok) {
    const err = await res.text()
    await prisma.meeting.update({
      where: { id: meetingId },
      data: { botStatus: 'ERROR' },
    })
    throw new Error(`Bot join failed (${res.status}): ${err}`)
  }

  await prisma.meeting.update({
    where: { id: meetingId },
    data: { botStatus: 'CONNECTED', startedAt: new Date() },
  })
}
