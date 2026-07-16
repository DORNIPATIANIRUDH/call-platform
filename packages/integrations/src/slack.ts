import axios from 'axios'
import type { OAuthProvider, OAuthTokens } from './types'

export class SlackOAuth implements OAuthProvider {
  constructor(
    private clientId: string,
    private clientSecret: string
  ) {}

  getAuthorizationUrl(state: string, redirectUri: string): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: redirectUri,
      scope: 'chat:write,channels:read,groups:read,commands',
      state,
    })
    return `https://slack.com/oauth/v2/authorize?${params}`
  }

  async exchangeCode(code: string, redirectUri: string): Promise<OAuthTokens> {
    const resp = await axios.post(
      'https://slack.com/api/oauth.v2.access',
      new URLSearchParams({ code, redirect_uri: redirectUri }),
      { auth: { username: this.clientId, password: this.clientSecret } }
    )
    if (!resp.data.ok) throw new Error(`Slack OAuth error: ${resp.data.error}`)
    return {
      accessToken: resp.data.access_token,
      scope: resp.data.scope,
      raw: resp.data,
    }
  }

  async refreshAccessToken(_refreshToken: string): Promise<OAuthTokens> {
    throw new Error('Slack tokens do not expire and do not support refresh')
  }
}

export class SlackClient {
  constructor(private botToken: string) {}

  async postMessage(channel: string, text: string, blocks?: object[]): Promise<void> {
    const resp = await axios.post(
      'https://slack.com/api/chat.postMessage',
      { channel, text, blocks },
      { headers: { Authorization: `Bearer ${this.botToken}` } }
    )
    if (!resp.data.ok) throw new Error(`Slack postMessage failed: ${resp.data.error}`)
  }

  async listChannels(): Promise<Array<{ id: string; name: string }>> {
    const resp = await axios.get('https://slack.com/api/conversations.list', {
      headers: { Authorization: `Bearer ${this.botToken}` },
      params: { types: 'public_channel,private_channel', limit: 200 },
    })
    return (resp.data.channels ?? []).map((c: any) => ({ id: c.id, name: c.name }))
  }

  buildMeetingSummaryBlocks(
    title: string,
    summary: string,
    actionItems: string[],
    meetingUrl: string
  ): object[] {
    return [
      {
        type: 'header',
        text: { type: 'plain_text', text: `📞 ${title}` },
      },
      {
        type: 'section',
        text: { type: 'mrkdwn', text: summary },
      },
      ...(actionItems.length > 0
        ? [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `*Action Items:*\n${actionItems.map((i) => `• ${i}`).join('\n')}`,
              },
            },
          ]
        : []),
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: { type: 'plain_text', text: 'View Full Summary' },
            url: meetingUrl,
            style: 'primary',
          },
        ],
      },
    ]
  }
}

export function getSlackOAuth() {
  const id = process.env.SLACK_CLIENT_ID
  const secret = process.env.SLACK_CLIENT_SECRET
  if (!id || !secret) throw new Error('SLACK_CLIENT_ID and SLACK_CLIENT_SECRET must be set')
  return new SlackOAuth(id, secret)
}
