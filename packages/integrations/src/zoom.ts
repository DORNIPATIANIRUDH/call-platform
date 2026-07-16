import axios from 'axios'
import type { OAuthProvider, OAuthTokens } from './types'

const BASE = 'https://api.zoom.us/v2'

export class ZoomOAuth implements OAuthProvider {
  constructor(
    private clientId: string,
    private clientSecret: string
  ) {}

  getAuthorizationUrl(state: string, redirectUri: string): string {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.clientId,
      redirect_uri: redirectUri,
      state,
    })
    return `https://zoom.us/oauth/authorize?${params}`
  }

  async exchangeCode(code: string, redirectUri: string): Promise<OAuthTokens> {
    const resp = await axios.post(
      'https://zoom.us/oauth/token',
      new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri: redirectUri }),
      { auth: { username: this.clientId, password: this.clientSecret } }
    )
    return this.#toTokens(resp.data)
  }

  async refreshAccessToken(refreshToken: string): Promise<OAuthTokens> {
    const resp = await axios.post(
      'https://zoom.us/oauth/token',
      new URLSearchParams({ grant_type: 'refresh_token', refresh_token: refreshToken }),
      { auth: { username: this.clientId, password: this.clientSecret } }
    )
    return this.#toTokens(resp.data)
  }

  #toTokens(data: any): OAuthTokens {
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: data.expires_in ? new Date(Date.now() + data.expires_in * 1000) : undefined,
      scope: data.scope,
      raw: data,
    }
  }
}

export class ZoomClient {
  constructor(private accessToken: string) {}

  async getUpcomingMeetings() {
    const resp = await axios.get(`${BASE}/users/me/meetings`, {
      headers: { Authorization: `Bearer ${this.accessToken}` },
      params: { type: 'upcoming', page_size: 50 },
    })
    return resp.data.meetings ?? []
  }

  async getMeeting(meetingId: string) {
    const resp = await axios.get(`${BASE}/meetings/${meetingId}`, {
      headers: { Authorization: `Bearer ${this.accessToken}` },
    })
    return resp.data
  }

  async getRecordingDownloadUrl(meetingId: string): Promise<string | null> {
    try {
      const resp = await axios.get(`${BASE}/meetings/${meetingId}/recordings`, {
        headers: { Authorization: `Bearer ${this.accessToken}` },
      })
      const file = resp.data.recording_files?.find((f: any) => f.file_type === 'M4A')
      return file?.download_url ?? null
    } catch {
      return null
    }
  }
}

export function verifyZoomWebhook(payload: string, timestamp: string, signature: string): boolean {
  const secret = process.env.ZOOM_WEBHOOK_SECRET
  if (!secret) return false
  const crypto = require('crypto')
  const message = `v0:${timestamp}:${payload}`
  const expected = `v0=${crypto.createHmac('sha256', secret).update(message).digest('hex')}`
  return expected === signature
}

export function getZoomOAuth() {
  const id = process.env.ZOOM_CLIENT_ID
  const secret = process.env.ZOOM_CLIENT_SECRET
  if (!id || !secret) throw new Error('ZOOM_CLIENT_ID and ZOOM_CLIENT_SECRET must be set')
  return new ZoomOAuth(id, secret)
}
