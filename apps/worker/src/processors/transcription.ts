import type { Job } from 'bullmq'
import type { TranscriptionJobData } from '@call-platform/types'
import { getTranscriptionProvider } from '@call-platform/ai'
import { prisma } from '@call-platform/db'
import { createAnalysisQueue } from '@call-platform/queue'
import { pushTranscriptSegment } from '../lib/pusher'

export async function handleTranscription(job: Job<TranscriptionJobData>) {
  const { meetingId, orgId, audioUrl, audioChunk, chunkIndex, isFinal } = job.data

  await prisma.meeting.update({ where: { id: meetingId }, data: { status: 'IN_PROGRESS' } })

  const provider = getTranscriptionProvider()

  if (audioUrl) {
    // Post-call full-file transcription
    const segments = await provider.transcribeFile(audioUrl)

    await prisma.$transaction(
      segments.map((seg) =>
        prisma.transcript.create({
          data: {
            meetingId,
            text: seg.text,
            startMs: seg.startMs,
            endMs: seg.endMs,
            speakerId: seg.speakerId ?? null,
            speaker: seg.speakerId ? `Speaker ${seg.speakerId}` : null,
            confidence: seg.confidence ?? null,
          },
        })
      )
    )

    // Update duration from last segment
    const lastSeg = segments[segments.length - 1]
    if (lastSeg) {
      await prisma.meeting.update({
        where: { id: meetingId },
        data: { durationSeconds: Math.round(lastSeg.endMs / 1000), status: 'PROCESSING' },
      })

      // Also update the recording duration if one exists
      await prisma.recording.updateMany({
        where: { meetingId },
        data: { durationSec: Math.round(lastSeg.endMs / 1000) },
      })

      // Increment org's minutesUsed for billing metering
      const durationMin = Math.ceil(lastSeg.endMs / 1000 / 60)
      await prisma.subscription.updateMany({
        where: { orgId },
        data: { minutesUsed: { increment: durationMin } },
      })
    }

    // Enqueue analysis
    const analysisQueue = createAnalysisQueue()
    await analysisQueue.add('analyze', { meetingId, orgId })
    await analysisQueue.close()
  } else if (audioChunk && chunkIndex !== undefined) {
    // Real-time streaming chunk — not transcribed inline here;
    // The bot service streams directly to Deepgram and pushes results via Pusher.
    // This path handles fallback/re-transcription of a saved chunk.
    const { Readable } = require('stream')
    const stream = Readable.from(audioChunk)

    for await (const seg of provider.transcribeStream(stream)) {
      await prisma.transcript.create({
        data: {
          meetingId,
          text: seg.text,
          startMs: seg.startMs,
          endMs: seg.endMs,
          speakerId: seg.speakerId ?? null,
          speaker: seg.speakerId ? `Speaker ${seg.speakerId}` : null,
          confidence: seg.confidence ?? null,
        },
      })
      // Push to browser in real-time
      await pushTranscriptSegment(meetingId, seg)
    }

    if (isFinal) {
      const analysisQueue = createAnalysisQueue()
      await analysisQueue.add('analyze', { meetingId, orgId })
      await analysisQueue.close()
    }
  }
}
