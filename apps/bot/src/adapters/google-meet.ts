import { EventEmitter } from 'events'
import puppeteer, { type Browser, type Page } from 'puppeteer'
import type { BotJoinRequest } from '@call-platform/types'
import { AudioStreamForwarder } from '../lib/audio-stream'

export class GoogleMeetAdapter extends EventEmitter {
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
        '--allow-running-insecure-content',
        '--autoplay-policy=no-user-gesture-required',
      ],
    })

    this.page = await this.browser.newPage()
    await this.page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    )

    // Grant camera/microphone permissions
    const context = this.browser.defaultBrowserContext()
    await context.overridePermissions('https://meet.google.com', ['microphone', 'camera'])

    await this.page.goto(req.joinUrl, { waitUntil: 'networkidle2', timeout: 30000 })

    // Dismiss "Join as guest" or enter name
    await this.#tryJoinAsGuest(req)

    // Start audio capture via CDPSession
    this.audioForwarder = new AudioStreamForwarder(req.meetingId, req.orgId)
    await this.audioForwarder.attachToPage(this.page)

    console.log(`[GoogleMeet] Bot joined: ${req.meetingId}`)

    // Monitor for meeting end
    this.page.on('close', () => this.emit('disconnected'))
  }

  async disconnect(): Promise<void> {
    await this.audioForwarder?.stop()
    await this.page?.close()
    await this.browser?.close()
    this.emit('disconnected')
  }

  async #tryJoinAsGuest(req: BotJoinRequest) {
    if (!this.page) return
    try {
      // Dismiss mic/camera dialogs
      await this.page.waitForSelector('button[jsname="Qx7uuf"]', { timeout: 5000 })
        .then((btn) => btn?.click())
        .catch(() => {})

      // Type bot display name if prompted
      const nameInput = await this.page.$('input[placeholder*="name" i], input[aria-label*="name" i]')
      if (nameInput) {
        await nameInput.type(req.displayName ?? 'CallPlatform Bot')
        await this.page.keyboard.press('Enter')
      }

      // Click "Join now" / "Ask to join"
      await this.page.waitForSelector('button[jsname="Qx7uuf"], button[data-idom-class*="join"]', { timeout: 8000 })
        .then((btn) => btn?.click())
        .catch(() => {})
    } catch {
      // Best-effort — some Meet variants differ
    }
  }
}
