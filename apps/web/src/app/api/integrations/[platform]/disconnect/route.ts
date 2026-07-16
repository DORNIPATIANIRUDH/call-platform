import { getServerSession } from 'next-auth'
import { NextResponse, type NextRequest } from 'next/server'
import { authOptions } from '@/lib/auth'
import { prisma } from '@call-platform/db'
import type { IntegrationPlatform } from '@call-platform/db'

const PLATFORM_MAP: Record<string, IntegrationPlatform> = {
  zoom: 'ZOOM', google: 'GOOGLE', microsoft: 'MICROSOFT',
  slack: 'SLACK', hubspot: 'HUBSPOT', salesforce: 'SALESFORCE',
}

interface Params { params: { platform: string } }

export async function POST(req: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const platform = PLATFORM_MAP[params.platform.toLowerCase()]
  if (!platform) return NextResponse.json({ error: 'Unknown platform' }, { status: 400 })

  await prisma.integration.deleteMany({
    where: { orgId: session.user.orgId, platform },
  })

  return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/dashboard/integrations?disconnected=${params.platform}`)
}
