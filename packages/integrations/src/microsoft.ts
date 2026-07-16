import axios from 'axios'
import type { OAuthProvider, OAuthTokens, CalendarEvent } from './types'

const GRAPH = 'https://graph.microsoft.com/v1.0'

export class MicrosoftOAuth implements OAuthProvider {
  constructor(
    private clientId: string,
    private clientSecret: string
  ) {}

  getAuthorizationUrl(state: string, redirectUri: string): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      response_type: 'code',
      redirect_uri: redirectUri,
      scope: [
        'openid',
        'email',
        'profile',
        'offline_access',
        'Calendars.Read',
        'OnlineMeetings.Read',
        'OnlineMeetings.ReadWrite',
      ].join(' '),
      state,
    })
    return `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params}`
  }

  async exchangeCode(code: string, redirectUri: string): Promise<OAuthTokens> {
    const resp = await axios.post(
      'https://login.microsoftonline.com/common/oauth2/v2.0/token',
      new URLSearchParams({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
        code,
      })
    )
    return this.#toTokens(resp.data)
  }

  async refreshAccessToken(refreshToken: string): Promise<OAuthTokens> {
    const resp = await axios.post(
      'https://login.microsoftonline.com/common/oauth2/v2.0/token',
      new URLSearchParams({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      })
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

export class MicrosoftCalendarClient {
  constructor(private accessToken: string) {}

  async getUpcomingEvents(top = 20): Promise<CalendarEvent[]> {
    const resp = await axios.get(`${GRAPH}/me/calendar/events`, {
      headers: { Authorization: `Bearer ${this.accessToken}` },
      params: {
        $top: top,
        $orderby: 'start/dateTime',
        $filter: `start/dateTime ge '${new Date().toISOString()}'`,
        $select: 'id,subject,start,end,onlineMeeting,attendees',
      },
    })
    return (resp.data.value ?? []).map((e: any) => ({
      id: e.id,
      title: e.subject ?? 'Untitled',
      startAt: new Date(e.start.dateTime),
      endAt: new Date(e.end.dateTime),
      joinUrl: e.onlineMeeting?.joinUrl,
      attendees: (e.attendees ?? [])
        .map((a: any) => a.emailAddress?.address)
        .filter(Boolean),
      platform: 'MICROSOFT' as const,
    }))
  }

  async subscribeToCalendar(notificationUrl: string): Promise<{ id: string; expirationDateTime: string }> {
    const expiration = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) // 3 days max for calendar
    const resp = await axios.post(
      `${GRAPH}/subscriptions`,
      {
        changeType: 'created,updated',
        notificationUrl,
        resource: 'me/events',
        expirationDateTime: expiration.toISOString(),
        clientState: process.env.BOT_SECRET ?? 'changeme',
      },
      { headers: { Authorization: `Bearer ${this.accessToken}` } }
    )
    return { id: resp.data.id, expirationDateTime: resp.data.expirationDateTime }
  }
}

export function getMicrosoftOAuth() {
  const id = process.env.MICROSOFT_CLIENT_ID
  const secret = process.env.MICROSOFT_CLIENT_SECRET
  if (!id || !secret)
    throw new Error('MICROSOFT_CLIENT_ID and MICROSOFT_CLIENT_SECRET must be set')
  return new MicrosoftOAuth(id, secret)
}
