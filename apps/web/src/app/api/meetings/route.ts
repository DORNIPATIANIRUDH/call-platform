import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import { prisma } from '@call-platform/db'

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.orgId) return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'))
  const pageSize = Math.min(50, parseInt(searchParams.get('pageSize') ?? '20'))
  const status = searchParams.get('status')

  const where = {
    orgId: session.user.orgId,
    ...(status ? { status: status as any } : {}),
  }

  const [items, total] = await Promise.all([
    prisma.meeting.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { analysis: { select: { dealScore: true, summary: true } } },
    }),
    prisma.meeting.count({ where }),
  ])

  return NextResponse.json({ data: { items, total, page, pageSize, hasMore: page * pageSize < total } })
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.orgId) return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } }, { status: 401 })

  const body = await req.json()
  const meeting = await prisma.meeting.create({
    data: {
      orgId: session.user.orgId,
      title: body.title ?? 'Untitled Meeting',
      platform: body.platform,
      externalId: body.externalId,
      joinUrl: body.joinUrl,
      scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : undefined,
      hostEmail: body.hostEmail,
      status: 'SCHEDULED',
    },
  })
  return NextResponse.json({ data: meeting }, { status: 201 })
}
