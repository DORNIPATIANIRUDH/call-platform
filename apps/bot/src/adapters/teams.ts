import { EventEmitter } from 'events'
import puppeteer, { type Browser, type Page } from 'puppeteer'
import type { BotJoinRequest } from '@call-platform/types'
import { AudioStreamForwarder } from '../lib/audio-stream'

export class TeamsAdapter extends EventEmitter {
  private browser: Browser | null = null
  private page: Page | null = null
  private audioForwarder: AudioStreamForwarder | null = null

  async connect(req: BotJoinRequest): Promise<void> {
    this.browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--use-fake-ui-for-media-stream',
        '--use-fake-device-for-media-stream',
      ],
    })

    this.page = await this.browser.newPage()
    await this.page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36'
    )

    await this.page.goto(req.joinUrl, { waitUntil: 'networkidle2', timeout: 30000 })

    await this.#joinAsGuest(req)

    this.audioForwarder = new AudioStreamForwarder(req.meetingId, req.orgId)
    await this.audioForwarder.attachToPage(this.page)

    console.log(`[Teams] Bot joined: ${req.meetingId}`)
    this.page.on('close', () => this.emit('disconnected'))
  }

  async disconnect(): Promise<void> {
    await this.audioForwarder?.stop()
    await this.page?.close()
    await this.browser?.close()
    this.emit('disconnected')
  }

  async #joinAsGuest(req: BotJoinRequest) {
    if (!this.page) return
    try {
      // Continue as guest
      await this.page.waitForSelector('[data-tid="prejoin-display-name-input"], input[placeholder*="name" i]', { timeout: 8000 })
        .then(async (input) => {
          if (input) await input.type(req.displayName ?? 'CallPlatform Bot')
        })
        .catch(() => {})

      await this.page.waitForSelector('button[data-tid="prejoin-join-button"], button[aria-label*="Join now"]', { timeout: 6000 })
        .then((btn) => btn?.click())
        .catch(() => {})
    } catch {
      // Best-effort
    }
  }
}
