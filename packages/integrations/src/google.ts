import axios from 'axios'
import type { OAuthProvider, OAuthTokens, CalendarEvent } from './types'

export class GoogleOAuth implements OAuthProvider {
  constructor(
    private clientId: string,
    private clientSecret: string
  ) {}

  getAuthorizationUrl(state: string, redirectUri: string): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: [
        'openid',
        'email',
        'profile',
        'https://www.googleapis.com/auth/calendar.readonly',
        'https://www.googleapis.com/auth/calendar.events',
      ].join(' '),
      access_type: 'offline',
      prompt: 'consent',
      state,
    })
    return `https://accounts.google.com/o/oauth2/v2/auth?${params}`
  }

  async exchangeCode(code: string, redirectUri: string): Promise<OAuthTokens> {
    const resp = await axios.post('https://oauth2.googleapis.com/token', {
      client_id: this.clientId,
      client_secret: this.clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
      code,
    })
    return this.#toTokens(resp.data)
  }

  async refreshAccessToken(refreshToken: string): Promise<OAuthTokens> {
    const resp = await axios.post('https://oauth2.googleapis.com/token', {
      client_id: this.clientId,
      client_secret: this.clientSecret,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    })
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

export class GoogleCalendarClient {
  constructor(private accessToken: string) {}

  async getUpcomingEvents(maxResults = 20): Promise<CalendarEvent[]> {
    const resp = await axios.get(
      'https://www.googleapis.com/calendar/v3/calendars/primary/events',
      {
        headers: { Authorization: `Bearer ${this.accessToken}` },
        params: {
          timeMin: new Date().toISOString(),
          maxResults,
          singleEvents: true,
          orderBy: 'startTime',
        },
      }
    )
    return (resp.data.items ?? []).map((e: any) => ({
      id: e.id,
      title: e.summary ?? 'Untitled',
      startAt: new Date(e.start.dateTime ?? e.start.date),
      endAt: new Date(e.end.dateTime ?? e.end.date),
      joinUrl: e.hangoutLink ?? e.conferenceData?.entryPoints?.[0]?.uri,
      attendees: (e.attendees ?? []).map((a: any) => a.email).filter(Boolean),
      platform: 'GOOGLE' as const,
    }))
  }

  async watchCalendar(webhookUrl: string, channelId: string): Promise<{ expiration: string }> {
    const resp = await axios.post(
      'https://www.googleapis.com/calendar/v3/calendars/primary/events/watch',
      {
        id: channelId,
        type: 'web_hook',
        address: webhookUrl,
        expiration: String(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
      { headers: { Authorization: `Bearer ${this.accessToken}` } }
    )
    return { expiration: resp.data.expiration }
  }
}

export function getGoogleOAuth() {
  const id = process.env.GOOGLE_CLIENT_ID
  const secret = process.env.GOOGLE_CLIENT_SECRET
  if (!id || !secret) throw new Error('GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set')
  return new GoogleOAuth(id, secret)
}
