import { requireOrg } from '@/lib/session'
import { prisma } from '@call-platform/db'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/lib/utils'

export default async function BillingPage() {
  const { org } = await requireOrg()

  const sub = org.subscription
  const usedPct = sub ? Math.min(100, Math.round((sub.minutesUsed / sub.minutesLimit) * 100)) : 0
  const stripeEnabled = !!(process.env.STRIPE_SECRET_KEY && !process.env.STRIPE_SECRET_KEY.includes('...'))

  const PLANS = [
    { tier: 'FREE', name: 'Free', price: '$0', features: ['300 minutes/month recording', '1 seat', 'AI transcription + summary', 'Manual upload only'] },
    { tier: 'PRO', name: 'Pro', price: '$49/seat/mo', features: ['Unlimited recordings', 'Unlimited seats', 'Full AI analysis + deal scoring', 'Auto-join bot', 'CRM sync', 'Slack notifications'] },
    { tier: 'ENTERPRISE', name: 'Enterprise', price: 'Custom', features: ['Everything in Pro', 'SSO / SAML', 'Dedicated support', 'Custom data retention', 'On-premise option'] },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Billing</h1>
        <p className="text-muted-foreground">Manage your subscription and usage.</p>
      </div>

      {/* Current plan */}
      <Card>
        <CardHeader>
          <CardTitle>Current Plan</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <Badge variant={sub?.plan === 'PRO' ? 'default' : 'secondary'} className="text-sm px-3 py-1">
              {sub?.plan ?? 'FREE'}
            </Badge>
            <span className={`text-sm font-medium ${sub?.status === 'ACTIVE' ? 'text-green-600' : 'text-destructive'}`}>
              {sub?.status ?? 'ACTIVE'}
            </span>
            {sub?.currentPeriodEnd && (
              <span className="text-sm text-muted-foreground">Renews {formatDate(sub.currentPeriodEnd)}</span>
            )}
          </div>

          {/* Usage bar */}
          <div>
            <div className="mb-1 flex justify-between text-sm">
              <span>Recording minutes used</span>
              <span className="text-muted-foreground">{sub?.minutesUsed ?? 0} / {sub?.minutesLimit ?? 300} min</span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div className="h-2 rounded-full bg-primary transition-all" style={{ width: `${usedPct}%` }} />
            </div>
          </div>

          {sub?.plan !== 'ENTERPRISE' && (
            <form action="/api/billing/portal" method="POST">
              <Button type="submit" variant="outline">Manage Subscription →</Button>
            </form>
          )}
        </CardContent>
      </Card>

      {/* Plan cards */}
      <div className="grid gap-6 md:grid-cols-3">
        {PLANS.map((plan) => {
          const isCurrent = sub?.plan === plan.tier || (!sub && plan.tier === 'FREE')
          return (
            <Card key={plan.tier} className={isCurrent ? 'ring-2 ring-primary' : ''}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{plan.name}</CardTitle>
                  {isCurrent && <Badge>Current</Badge>}
                </div>
                <CardDescription className="text-xl font-bold text-foreground">{plan.price}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <ul className="space-y-1.5">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm">
                      <span className="text-green-600">✓</span> {f}
                    </li>
                  ))}
                </ul>
                {!isCurrent && plan.tier !== 'ENTERPRISE' && (
                  stripeEnabled ? (
                    <form action="/api/billing/checkout" method="POST">
                      <input type="hidden" name="plan" value={plan.tier} />
                      <Button type="submit" className="w-full mt-2">Upgrade to {plan.name}</Button>
                    </form>
                  ) : (
                    <Button disabled className="w-full mt-2" title="Stripe not configured">
                      Upgrade to {plan.name}
                    </Button>
                  )
                )}
                {!isCurrent && plan.tier === 'ENTERPRISE' && (
                  <Button variant="outline" className="w-full mt-2" asChild>
                    <a href="mailto:sales@yourdomain.com">Contact Sales</a>
                  </Button>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
