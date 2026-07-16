import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import { prisma } from '@call-platform/db'

interface Params { params: { id: string } }

export async function GET(_req: Request, { params }: Params) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.orgId) return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } }, { status: 401 })

  const meeting = await prisma.meeting.findFirst({
    where: { id: params.id, orgId: session.user.orgId },
    include: {
      recording: true,
      transcripts: { orderBy: { startMs: 'asc' } },
      analysis: true,
      actionItems: true,
      dealSignals: true,
    },
  })
  if (!meeting) return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Meeting not found' } }, { status: 404 })

  return NextResponse.json({ data: meeting })
}

export async function DELETE(_req: Request, { params }: Params) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.orgId) return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } }, { status: 401 })

  const meeting = await prisma.meeting.findFirst({ where: { id: params.id, orgId: session.user.orgId } })
  if (!meeting) return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Meeting not found' } }, { status: 404 })

  await prisma.meeting.delete({ where: { id: params.id } })
  return new NextResponse(null, { status: 204 })
}
