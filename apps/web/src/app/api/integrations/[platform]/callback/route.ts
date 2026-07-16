import { NextResponse, type NextRequest } from 'next/server'
import { prisma } from '@call-platform/db'
import {
  getZoomOAuth, getGoogleOAuth, getMicrosoftOAuth, getSlackOAuth,
  getHubSpotOAuth, getSalesforceOAuth,
} from '@call-platform/integrations'
import type { IntegrationPlatform } from '@call-platform/db'

const OAUTH_PROVIDERS = {
  zoom: { factory: getZoomOAuth, platform: 'ZOOM' as IntegrationPlatform },
  google: { factory: getGoogleOAuth, platform: 'GOOGLE' as IntegrationPlatform },
  microsoft: { factory: getMicrosoftOAuth, platform: 'MICROSOFT' as IntegrationPlatform },
  slack: { factory: getSlackOAuth, platform: 'SLACK' as IntegrationPlatform },
  hubspot: { factory: getHubSpotOAuth, platform: 'HUBSPOT' as IntegrationPlatform },
  salesforce: { factory: getSalesforceOAuth, platform: 'SALESFORCE' as IntegrationPlatform },
} as const

interface Params { params: { platform: string } }

export async function GET(req: NextRequest, { params }: Params) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  const appUrl = process.env.NEXT_PUBLIC_APP_URL!

  if (error || !code || !state) {
    return NextResponse.redirect(`${appUrl}/dashboard/integrations?error=oauth_failed`)
  }

  let orgId: string
  try {
    const decoded = JSON.parse(Buffer.from(state, 'base64url').toString())
    orgId = decoded.orgId
  } catch {
    return NextResponse.redirect(`${appUrl}/dashboard/integrations?error=invalid_state`)
  }

  const platform = params.platform.toLowerCase() as keyof typeof OAUTH_PROVIDERS
  const entry = OAUTH_PROVIDERS[platform]
  if (!entry) return NextResponse.redirect(`${appUrl}/dashboard/integrations?error=unknown_platform`)

  const redirectUri = `${appUrl}/api/integrations/${platform}/callback`

  try {
    const provider = entry.factory()
    const tokens = await provider.exchangeCode(code, redirectUri)

    await prisma.integration.upsert({
      where: { orgId_platform: { orgId, platform: entry.platform } },
      create: {
        orgId,
        platform: entry.platform,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken ?? null,
        expiresAt: tokens.expiresAt ?? null,
        scope: tokens.scope ?? null,
        metadata: (tokens.raw ?? null) as any,
      },
      update: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken ?? null,
        expiresAt: tokens.expiresAt ?? null,
        scope: tokens.scope ?? null,
        metadata: (tokens.raw ?? null) as any,
      },
    })

    return NextResponse.redirect(`${appUrl}/dashboard/integrations?connected=${platform}`)
  } catch (err) {
    console.error(`OAuth callback error for ${platform}:`, err)
    return NextResponse.redirect(`${appUrl}/dashboard/integrations?error=exchange_failed`)
  }
}
