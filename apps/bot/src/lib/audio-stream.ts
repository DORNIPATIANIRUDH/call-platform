import type { Page } from 'puppeteer'
import { createClient } from '@deepgram/sdk'
import { prisma } from '@call-platform/db'
import { createAnalysisQueue } from '@call-platform/queue'
import type { TranscriptSegment } from '@call-platform/types'
import Pusher from 'pusher'

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

export class AudioStreamForwarder {
  private dgConnection: any = null
  private cdpSession: any = null
  private stopped = false

  constructor(
    private meetingId: string,
    private orgId: string
  ) {}

  async attachToPage(page: Page): Promise<void> {
    const apiKey = process.env.DEEPGRAM_API_KEY
    if (!apiKey) {
      console.warn('DEEPGRAM_API_KEY not set — audio forwarding disabled')
      return
    }

    const deepgram = createClient(apiKey)
    this.dgConnection = deepgram.listen.live({
      model: 'nova-2',
      language: 'en',
      smart_format: true,
      diarize: true,
      interim_results: false,
      utterance_end_ms: 1000,
    })

    this.dgConnection.on('Transcript', async (data: any) => {
      const alt = data?.channel?.alternatives?.[0]
      if (!alt?.transcript || this.stopped) return

      const segment: TranscriptSegment = {
        text: alt.transcript,
        startMs: Math.round((alt.words?.[0]?.start ?? 0) * 1000),
        endMs: Math.round((alt.words?.at(-1)?.end ?? 0) * 1000),
        speakerId: String(alt.words?.[0]?.speaker ?? 'Unknown'),
        confidence: alt.confidence,
      }

      // Persist to DB
      await prisma.transcript.create({
        data: {
          meetingId: this.meetingId,
          text: segment.text,
          startMs: segment.startMs,
          endMs: segment.endMs,
          speakerId: segment.speakerId ?? null,
          speaker: segment.speakerId ? `Speaker ${segment.speakerId}` : null,
          confidence: segment.confidence ?? null,
        },
      }).catch(console.error)

      // Push to browser via Pusher
      const pusher = getPusher()
      pusher?.trigger(`meeting-${this.meetingId}`, 'transcript', segment).catch(() => {})
    })

    // Capture audio via Chrome DevTools Protocol
    this.cdpSession = await (page as any).createCDPSession()
    await this.cdpSession.send('WebAudio.enable')
    this.cdpSession.on('WebAudio.audioNodeCreated', (_: any) => {})

    // Inject JS to capture MediaStream audio and post raw PCM to us
    await page.evaluateOnNewDocument(() => {
      const _origGetUserMedia = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices)
      navigator.mediaDevices.getUserMedia = async (constraints) => {
        const stream = await _origGetUserMedia(constraints)
        const ctx = new AudioContext({ sampleRate: 16000 })
        const source = ctx.createMediaStreamSource(stream)
        const processor = ctx.createScriptProcessor(4096, 1, 1)
        source.connect(processor)
        processor.connect(ctx.destination)
        processor.onaudioprocess = (e) => {
          const pcm = e.inputBuffer.getChannelData(0)
          ;(window as any).__audioChunks = (window as any).__audioChunks || []
          ;(window as any).__audioChunks.push(Array.from(pcm))
        }
        return stream
      }
    })

    // Poll audio chunks from page and forward to Deepgram every 250ms
    const interval = setInterval(async () => {
      if (this.stopped) { clearInterval(interval); return }
      try {
        const chunks: number[][] = await page.evaluate(() => {
          const c = (window as any).__audioChunks || []
          ;(window as any).__audioChunks = []
          return c
        })
        for (const chunk of chunks) {
          const float32 = new Float32Array(chunk)
          const int16 = new Int16Array(float32.length)
          for (let i = 0; i < float32.length; i++) {
            int16[i] = Math.max(-32768, Math.min(32767, float32[i] * 32768))
          }
          this.dgConnection.send(Buffer.from(int16.buffer))
        }
      } catch {
        clearInterval(interval)
      }
    }, 250)
  }

  async stop(): Promise<void> {
    this.stopped = true
    try { this.dgConnection?.requestClose() } catch {}
    try { await this.cdpSession?.detach() } catch {}

    // Trigger post-call analysis
    if (this.meetingId && this.orgId) {
      const queue = createAnalysisQueue()
      await queue.add('analyze', { meetingId: this.meetingId, orgId: this.orgId })
      await queue.close()
    }
  }
}
