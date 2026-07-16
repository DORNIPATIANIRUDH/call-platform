import Pusher from 'pusher'
import type { TranscriptSegment } from '@call-platform/types'

let pusherClient: Pusher | null = null

function getPusher(): Pusher | null {
  if (!process.env.PUSHER_APP_ID) return null
  if (!pusherClient) {
    pusherClient = new Pusher({
      appId: process.env.PUSHER_APP_ID!,
      key: process.env.PUSHER_KEY!,
      secret: process.env.PUSHER_SECRET!,
      cluster: process.env.PUSHER_CLUSTER ?? 'us2',
      useTLS: true,
    })
  }
  return pusherClient
}

export async function pushTranscriptSegment(meetingId: string, segment: TranscriptSegment) {
  const pusher = getPusher()
  if (!pusher) return
  await pusher.trigger(`meeting-${meetingId}`, 'transcript', segment)
}

export async function pushCoachingAlert(meetingId: string, alert: {
  text: string
  suggestion?: string
  severity: string
  triggeredAt: string
}) {
  const pusher = getPusher()
  if (!pusher) return
  await pusher.trigger(`meeting-${meetingId}`, 'coaching-alert', alert)
}

export async function pushMeetingStatus(meetingId: string, status: string) {
  const pusher = getPusher()
  if (!pusher) return
  await pusher.trigger(`meeting-${meetingId}`, 'status', { status })
}
