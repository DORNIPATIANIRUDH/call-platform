import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import { prisma } from '@call-platform/db'

interface Params { params: { id: string } }

export async function PATCH(req: Request, { params }: Params) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.orgId) return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } }, { status: 401 })

  // Only owner/admin can rename
  const membership = await prisma.organizationMember.findFirst({
    where: { orgId: params.id, userId: session.user.id, role: { in: ['OWNER', 'ADMIN'] } },
  })
  if (!membership) return NextResponse.json({ error: { code: 'FORBIDDEN', message: 'Forbidden' } }, { status: 403 })

  const body = await req.json()
  const name = String(body.name ?? '').trim()
  if (name.length < 2) return NextResponse.json({ error: { code: 'VALIDATION', message: 'Name too short' } }, { status: 400 })

  const org = await prisma.organization.update({ where: { id: params.id }, data: { name } })
  return NextResponse.json({ data: org })
}
