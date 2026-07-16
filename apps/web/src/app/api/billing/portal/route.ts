import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import { prisma } from '@call-platform/db'
import Stripe from 'stripe'

export async function POST(_req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-06-20' })
  const sub = await prisma.subscription.findUnique({ where: { orgId: session.user.orgId } })
  if (!sub?.stripeCustomerId) return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings/billing`)

  const portalSession = await stripe.billingPortal.sessions.create({
    customer: sub.stripeCustomerId,
    return_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings/billing`,
  })

  return NextResponse.redirect(portalSession.url)
}
