import axios from 'axios'
import type { OAuthProvider, OAuthTokens } from './types'
import type { MeetingAnalysis } from '@call-platform/types'

const BASE = 'https://api.hubapi.com'

export class HubSpotOAuth implements OAuthProvider {
  constructor(
    private clientId: string,
    private clientSecret: string
  ) {}

  getAuthorizationUrl(state: string, redirectUri: string): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: redirectUri,
      scope: 'crm.objects.contacts.read crm.objects.contacts.write crm.objects.deals.read crm.objects.deals.write timeline',
      state,
    })
    return `https://app.hubspot.com/oauth/authorize?${params}`
  }

  async exchangeCode(code: string, redirectUri: string): Promise<OAuthTokens> {
    const resp = await axios.post(
      `${BASE}/oauth/v1/token`,
      new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: this.clientId,
        client_secret: this.clientSecret,
        redirect_uri: redirectUri,
        code,
      })
    )
    return this.#toTokens(resp.data)
  }

  async refreshAccessToken(refreshToken: string): Promise<OAuthTokens> {
    const resp = await axios.post(
      `${BASE}/oauth/v1/token`,
      new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: this.clientId,
        client_secret: this.clientSecret,
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

export class HubSpotClient {
  constructor(private accessToken: string) {}

  private get headers() {
    return { Authorization: `Bearer ${this.accessToken}` }
  }

  async findContactByEmail(email: string): Promise<string | null> {
    try {
      const resp = await axios.post(
        `${BASE}/crm/v3/objects/contacts/search`,
        { filterGroups: [{ filters: [{ propertyName: 'email', operator: 'EQ', value: email }] }] },
        { headers: this.headers }
      )
      return resp.data.results?.[0]?.id ?? null
    } catch {
      return null
    }
  }

  async createOrUpdateContact(email: string, properties: Record<string, string>): Promise<string> {
    const existing = await this.findContactByEmail(email)
    if (existing) {
      await axios.patch(
        `${BASE}/crm/v3/objects/contacts/${existing}`,
        { properties },
        { headers: this.headers }
      )
      return existing
    }
    const resp = await axios.post(
      `${BASE}/crm/v3/objects/contacts`,
      { properties: { email, ...properties } },
      { headers: this.headers }
    )
    return resp.data.id
  }

  async logCallActivity(
    contactId: string,
    title: string,
    analysis: MeetingAnalysis,
    meetingUrl: string
  ): Promise<void> {
    await axios.post(
      `${BASE}/crm/v3/objects/notes`,
      {
        properties: {
          hs_note_body: `<b>${title}</b><br/>${analysis.summary}<br/><br/><a href="${meetingUrl}">View full recording</a>`,
          hs_timestamp: Date.now(),
        },
        associations: [{ to: { id: contactId }, types: [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: 202 }] }],
      },
      { headers: this.headers }
    )
  }

  async createTask(contactId: string, text: string, dueDate?: string): Promise<void> {
    await axios.post(
      `${BASE}/crm/v3/objects/tasks`,
      {
        properties: {
          hs_task_subject: text,
          hs_task_status: 'NOT_STARTED',
          ...(dueDate ? { hs_timestamp: new Date(dueDate).getTime() } : {}),
        },
        associations: [{ to: { id: contactId }, types: [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: 204 }] }],
      },
      { headers: this.headers }
    )
  }
}

export function getHubSpotOAuth() {
  const id = process.env.HUBSPOT_CLIENT_ID
  const secret = process.env.HUBSPOT_CLIENT_SECRET
  if (!id || !secret) throw new Error('HUBSPOT_CLIENT_ID and HUBSPOT_CLIENT_SECRET must be set')
  return new HubSpotOAuth(id, secret)
}
