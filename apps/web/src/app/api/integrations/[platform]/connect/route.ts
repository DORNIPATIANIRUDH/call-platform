import { getServerSession } from 'next-auth'
import { NextResponse, type NextRequest } from 'next/server'
import { authOptions } from '@/lib/auth'
import {
  getZoomOAuth, getGoogleOAuth, getMicrosoftOAuth, getSlackOAuth,
  getHubSpotOAuth, getSalesforceOAuth,
} from '@call-platform/integrations'

const OAUTH_PROVIDERS = {
  zoom: getZoomOAuth,
  google: getGoogleOAuth,
  microsoft: getMicrosoftOAuth,
  slack: getSlackOAuth,
  hubspot: getHubSpotOAuth,
  salesforce: getSalesforceOAuth,
} as const

type Platform = keyof typeof OAUTH_PROVIDERS

interface Params { params: { platform: string } }

export async function GET(req: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.orgId) return NextResponse.redirect(new URL('/login', req.url))

  const platform = params.platform.toLowerCase() as Platform
  if (!(platform in OAUTH_PROVIDERS)) {
    return NextResponse.json({ error: 'Unknown platform' }, { status: 400 })
  }

  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/${platform}/callback`
  const state = Buffer.from(JSON.stringify({ orgId: session.user.orgId, userId: session.user.id })).toString('base64url')

  const provider = OAUTH_PROVIDERS[platform]()
  const url = provider.getAuthorizationUrl(state, redirectUri)

  return NextResponse.redirect(url)
}
