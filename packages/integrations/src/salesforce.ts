import axios from 'axios'
import type { OAuthProvider, OAuthTokens } from './types'
import type { MeetingAnalysis } from '@call-platform/types'

export class SalesforceOAuth implements OAuthProvider {
  private instanceUrl: string

  constructor(
    private clientId: string,
    private clientSecret: string
  ) {
    this.instanceUrl = process.env.SALESFORCE_INSTANCE_URL ?? 'https://login.salesforce.com'
  }

  getAuthorizationUrl(state: string, redirectUri: string): string {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.clientId,
      redirect_uri: redirectUri,
      state,
    })
    return `${this.instanceUrl}/services/oauth2/authorize?${params}`
  }

  async exchangeCode(code: string, redirectUri: string): Promise<OAuthTokens> {
    const resp = await axios.post(
      `${this.instanceUrl}/services/oauth2/token`,
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
      `${this.instanceUrl}/services/oauth2/token`,
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
      scope: data.scope,
      raw: { ...data, instance_url: data.instance_url },
    }
  }
}

export class SalesforceClient {
  private base: string

  constructor(
    private accessToken: string,
    instanceUrl: string
  ) {
    this.base = `${instanceUrl}/services/data/v59.0`
  }

  private get headers() {
    return { Authorization: `Bearer ${this.accessToken}` }
  }

  async findContactByEmail(email: string): Promise<string | null> {
    const resp = await axios.get(`${this.base}/query`, {
      headers: this.headers,
      params: { q: `SELECT Id FROM Contact WHERE Email = '${email}' LIMIT 1` },
    })
    return resp.data.records?.[0]?.Id ?? null
  }

  async logCallToOpportunity(
    opportunityId: string,
    title: string,
    analysis: MeetingAnalysis,
    meetingUrl: string
  ): Promise<void> {
    await axios.post(
      `${this.base}/sobjects/Task`,
      {
        WhatId: opportunityId,
        Subject: title,
        Description: `${analysis.summary}\n\nView full recording: ${meetingUrl}`,
        Status: 'Completed',
        ActivityDate: new Date().toISOString().split('T')[0],
        Type: 'Call',
      },
      { headers: this.headers }
    )
  }

  async createTask(
    whoId: string | null,
    whatId: string | null,
    subject: string,
    dueDate?: string
  ): Promise<void> {
    await axios.post(
      `${this.base}/sobjects/Task`,
      {
        Subject: subject,
        Status: 'Not Started',
        Priority: 'Normal',
        ...(whoId ? { WhoId: whoId } : {}),
        ...(whatId ? { WhatId: whatId } : {}),
        ...(dueDate ? { ActivityDate: dueDate } : {}),
      },
      { headers: this.headers }
    )
  }
}

export function getSalesforceOAuth() {
  const id = process.env.SALESFORCE_CLIENT_ID
  const secret = process.env.SALESFORCE_CLIENT_SECRET
  if (!id || !secret)
    throw new Error('SALESFORCE_CLIENT_ID and SALESFORCE_CLIENT_SECRET must be set')
  return new SalesforceOAuth(id, secret)
}
