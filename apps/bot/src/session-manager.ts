import type { BotJoinRequest } from '@call-platform/types'
import { prisma } from '@call-platform/db'
import { GoogleMeetAdapter } from './adapters/google-meet'
import { ZoomAdapter } from './adapters/zoom'
import { TeamsAdapter } from './adapters/teams'

export interface BotSession {
  meetingId: string
  platform: string
  joinedAt: Date
  adapter: { disconnect(): Promise<void> }
}

export class BotSessionManager {
  private sessions = new Map<string, BotSession>()

  async join(req: BotJoinRequest): Promise<void> {
    if (this.sessions.has(req.meetingId)) {
      console.warn(`Bot already joined meeting ${req.meetingId}`)
      return
    }

    let adapter: BotSession['adapter']

    switch (req.platform) {
      case 'GOOGLE':
        adapter = new GoogleMeetAdapter()
        break
      case 'ZOOM':
        adapter = new ZoomAdapter()
        break
      case 'MICROSOFT':
        adapter = new TeamsAdapter()
        break
      default:
        throw new Error(`Unsupported platform: ${req.platform}`)
    }

    // Each adapter calls connect() which spawns the headless browser
    await (adapter as any).connect(req)

    const session: BotSession = {
      meetingId: req.meetingId,
      platform: req.platform,
      joinedAt: new Date(),
      adapter,
    }

    this.sessions.set(req.meetingId, session)

    // Auto-cleanup when adapter signals disconnect
    ;(adapter as any).once?.('disconnected', () => this.cleanup(req.meetingId))
  }

  async leave(meetingId: string): Promise<void> {
    const session = this.sessions.get(meetingId)
    if (!session) return
    await session.adapter.disconnect()
    await this.cleanup(meetingId)
  }

  private async cleanup(meetingId: string): Promise<void> {
    this.sessions.delete(meetingId)
    await prisma.meeting.update({
      where: { id: meetingId },
      data: { botStatus: 'DISCONNECTED', endedAt: new Date(), status: 'PROCESSING' },
    }).catch(() => {/* ignore if already updated */})
  }

  listActive() {
    return [...this.sessions.values()].map((s) => ({
      meetingId: s.meetingId,
      platform: s.platform,
      joinedAt: s.joinedAt,
    }))
  }

  async shutdown(): Promise<void> {
    await Promise.all([...this.sessions.keys()].map((id) => this.leave(id)))
  }
}
