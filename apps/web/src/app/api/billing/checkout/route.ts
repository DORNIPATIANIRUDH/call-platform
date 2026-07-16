import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import { prisma } from '@call-platform/db'
import Stripe from 'stripe'

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) throw new Error('STRIPE_SECRET_KEY not set')
  return new Stripe(key, { apiVersion: '2024-06-20' })
}

// POST /api/billing/checkout — create Stripe Checkout session
export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const plan = body.plan === 'ENTERPRISE' ? 'ENTERPRISE' : 'PRO'

  const priceId = plan === 'PRO' ? process.env.STRIPE_PRO_PRICE_ID : process.env.STRIPE_ENTERPRISE_PRICE_ID
  if (!priceId) return NextResponse.json({ error: 'Price not configured' }, { status: 500 })

  const org = await prisma.organization.findUnique({
    where: { id: session.user.orgId },
    include: { subscription: true },
  })
  if (!org) return NextResponse.json({ error: 'Org not found' }, { status: 404 })

  const stripe = getStripe()
  const appUrl = process.env.NEXT_PUBLIC_APP_URL!

  // Reuse or create Stripe customer
  let customerId = org.subscription?.stripeCustomerId
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: session.user.email ?? undefined,
      name: org.name,
      metadata: { orgId: org.id },
    })
    customerId = customer.id
    if (org.subscription) {
      await prisma.subscription.update({ where: { orgId: org.id }, data: { stripeCustomerId: customerId } })
    }
  }

  const checkoutSession = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${appUrl}/dashboard/settings/billing?success=1`,
    cancel_url: `${appUrl}/dashboard/settings/billing?canceled=1`,
    metadata: { orgId: org.id },
    subscription_data: { metadata: { orgId: org.id } },
  })

  return NextResponse.json({ url: checkoutSession.url })
}
