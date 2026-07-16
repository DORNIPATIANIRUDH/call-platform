import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import { prisma } from '@call-platform/db'
import { getStorageProvider } from '@call-platform/storage'

interface Params { params: { id: string } }

export async function GET(_req: Request, { params }: Params) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.orgId) return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } }, { status: 401 })

  const recording = await prisma.recording.findFirst({
    where: { meeting: { id: params.id, orgId: session.user.orgId } },
  })
  if (!recording) return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Recording not found' } }, { status: 404 })

  const storage = getStorageProvider()
  const signedUrl = await storage.getSignedUrl(recording.storageKey, 3600)

  return NextResponse.json({ data: { url: signedUrl, mimeType: recording.mimeType, durationSec: recording.durationSec } })
}
