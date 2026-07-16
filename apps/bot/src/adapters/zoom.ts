import { EventEmitter } from 'events'
import puppeteer, { type Browser, type Page } from 'puppeteer'
import type { BotJoinRequest } from '@call-platform/types'
import { AudioStreamForwarder } from '../lib/audio-stream'

export class ZoomAdapter extends EventEmitter {
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
        '--disable-web-security',
      ],
    })

    this.page = await this.browser.newPage()
    await this.page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36'
    )

    // Use Zoom web client (no app required)
    const webClientUrl = req.joinUrl.replace('zoom.us/j/', 'zoom.us/wc/join/')
    await this.page.goto(webClientUrl, { waitUntil: 'networkidle2', timeout: 30000 })

    await this.#dismissDialogs(req)

    this.audioForwarder = new AudioStreamForwarder(req.meetingId, req.orgId)
    await this.audioForwarder.attachToPage(this.page)

    console.log(`[Zoom] Bot joined: ${req.meetingId}`)
    this.page.on('close', () => this.emit('disconnected'))
  }

  async disconnect(): Promise<void> {
    await this.audioForwarder?.stop()
    await this.page?.close()
    await this.browser?.close()
    this.emit('disconnected')
  }

  async #dismissDialogs(req: BotJoinRequest) {
    if (!this.page) return
    try {
      // Enter name
      const nameInput = await this.page.waitForSelector('input#inputname', { timeout: 8000 })
      if (nameInput) {
        await nameInput.type(req.displayName ?? 'CallPlatform Bot')
        await this.page.click('button.preview-join-button, button[aria-label*="Join"]')
      }
      // Dismiss audio dialog
      await this.page.waitForSelector('button.join-audio-by-voip__join-btn, button[aria-label*="Join Audio"]', { timeout: 6000 })
        .then((btn) => btn?.click())
        .catch(() => {})
    } catch {
      // Best-effort
    }
  }
}
