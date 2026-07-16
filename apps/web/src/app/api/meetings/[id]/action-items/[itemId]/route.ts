import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import { prisma } from '@call-platform/db'

interface Params { params: { id: string; itemId: string } }

export async function PATCH(req: Request, { params }: Params) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.orgId) return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } }, { status: 401 })

  // Verify meeting belongs to org
  const meeting = await prisma.meeting.findFirst({ where: { id: params.id, orgId: session.user.orgId } })
  if (!meeting) return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Not found' } }, { status: 404 })

  const body = await req.json()
  const item = await prisma.actionItem.update({
    where: { id: params.itemId },
    data: { status: body.status, assignee: body.assignee, dueDate: body.dueDate ? new Date(body.dueDate) : undefined },
  })
  return NextResponse.json({ data: item })
}
