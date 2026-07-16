import { NextResponse, type NextRequest } from 'next/server'
import Stripe from 'stripe'
import { prisma } from '@call-platform/db'
import type { PlanTier, SubscriptionStatus } from '@call-platform/db'

const PRICE_TO_PLAN: Record<string, PlanTier> = {
  [process.env.STRIPE_PRO_PRICE_ID ?? '']: 'PRO',
  [process.env.STRIPE_ENTERPRISE_PRICE_ID ?? '']: 'ENTERPRISE',
}

const STATUS_MAP: Record<string, SubscriptionStatus> = {
  active: 'ACTIVE',
  past_due: 'PAST_DUE',
  canceled: 'CANCELED',
  trialing: 'TRIALING',
  incomplete: 'INCOMPLETE',
}

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  if (!sig || !webhookSecret) return NextResponse.json({ error: 'Missing signature' }, { status: 400 })

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-06-20' })

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret)
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session
      const orgId = session.metadata?.orgId
      if (!orgId || !session.subscription) break
      const subscription = await stripe.subscriptions.retrieve(session.subscription as string)
      const priceId = subscription.items.data[0]?.price.id ?? ''
      await prisma.subscription.upsert({
        where: { orgId },
        create: {
          orgId,
          stripeCustomerId: session.customer as string,
          stripeSubscriptionId: subscription.id,
          stripePriceId: priceId,
          plan: PRICE_TO_PLAN[priceId] ?? 'PRO',
          status: STATUS_MAP[subscription.status] ?? 'ACTIVE',
          currentPeriodStart: new Date(subscription.current_period_start * 1000),
          currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        },
        update: {
          stripeSubscriptionId: subscription.id,
          stripePriceId: priceId,
          plan: PRICE_TO_PLAN[priceId] ?? 'PRO',
          status: STATUS_MAP[subscription.status] ?? 'ACTIVE',
          currentPeriodStart: new Date(subscription.current_period_start * 1000),
          currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        },
      })
      break
    }

    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription
      const orgId = sub.metadata?.orgId
      if (!orgId) break
      const priceId = sub.items.data[0]?.price.id ?? ''
      await prisma.subscription.updateMany({
        where: { orgId },
        data: {
          plan: event.type === 'customer.subscription.deleted' ? 'FREE' : (PRICE_TO_PLAN[priceId] ?? 'PRO'),
          status: STATUS_MAP[sub.status] ?? 'CANCELED',
          currentPeriodEnd: new Date(sub.current_period_end * 1000),
        },
      })
      break
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice
      const sub = invoice.subscription
        ? await stripe.subscriptions.retrieve(invoice.subscription as string)
        : null
      const orgId = sub?.metadata?.orgId
      if (!orgId) break
      await prisma.subscription.updateMany({ where: { orgId }, data: { status: 'PAST_DUE' } })
      break
    }
  }

  return NextResponse.json({ received: true })
}
