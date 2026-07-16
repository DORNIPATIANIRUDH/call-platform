import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import { prisma } from '@call-platform/db'
import { slugify } from '@/lib/utils'

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } }, { status: 401 })

  const body = await req.json()
  const name = String(body.name ?? '').trim()
  if (name.length < 2) {
    return NextResponse.json({ error: { code: 'VALIDATION', message: 'Name must be at least 2 characters' } }, { status: 400 })
  }

  const baseSlug = slugify(name)
  let slug = baseSlug
  let i = 1
  while (await prisma.organization.findUnique({ where: { slug } })) {
    slug = `${baseSlug}-${i++}`
  }

  const org = await prisma.organization.create({
    data: {
      name,
      slug,
      members: { create: { userId: session.user.id, role: 'OWNER' } },
      subscription: { create: { plan: 'FREE', status: 'ACTIVE' } },
    },
  })

  return NextResponse.json({ data: org }, { status: 201 })
}

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } }, { status: 401 })

  const orgs = await prisma.organization.findMany({
    where: { members: { some: { userId: session.user.id } } },
    include: { subscription: true },
  })
  return NextResponse.json({ data: orgs })
}
