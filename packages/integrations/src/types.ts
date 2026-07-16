export interface OAuthTokens {
  accessToken: string
  refreshToken?: string
  expiresAt?: Date
  scope?: string
  raw?: Record<string, unknown>
}

export interface OAuthProvider {
  getAuthorizationUrl(state: string, redirectUri: string): string
  exchangeCode(code: string, redirectUri: string): Promise<OAuthTokens>
  refreshAccessToken(refreshToken: string): Promise<OAuthTokens>
}

export interface CalendarEvent {
  id: string
  title: string
  startAt: Date
  endAt: Date
  joinUrl?: string
  attendees: string[]
  platform: 'GOOGLE' | 'MICROSOFT' | 'ZOOM'
}
