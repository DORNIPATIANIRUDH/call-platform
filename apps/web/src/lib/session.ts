import { getServerSession } from 'next-auth'
import { authOptions } from './auth'
import { prisma } from '@call-platform/db'
import { redirect } from 'next/navigation'

export async function requireSession() {
  const session = await getServerSession(authOptions)
  if (!session?.user) redirect('/login')
  return session
}

export async function requireOrg() {
  const session = await requireSession()
  if (!session.user.orgId) redirect('/onboarding')
  const org = await prisma.organization.findUniqueOrThrow({
    where: { id: session.user.orgId },
    include: { subscription: true },
  })
  return { session, org }
}

export async function getOrgForApi(orgId: string) {
  return prisma.organization.findUnique({
    where: { id: orgId },
    include: { subscription: true },
  })
}
