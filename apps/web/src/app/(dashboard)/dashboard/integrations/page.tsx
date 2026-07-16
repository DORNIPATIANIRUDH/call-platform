import { requireOrg } from '@/lib/session'
import { prisma } from '@call-platform/db'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { IntegrationPlatform } from '@call-platform/db'
import Link from 'next/link'

const INTEGRATIONS = [
  { platform: IntegrationPlatform.ZOOM, name: 'Zoom', description: 'Auto-join Zoom meetings and import recordings', icon: '🎥', category: 'Meeting' },
  { platform: IntegrationPlatform.GOOGLE, name: 'Google Workspace', description: 'Sync Google Calendar and join Google Meet calls', icon: '📅', category: 'Meeting' },
  { platform: IntegrationPlatform.MICROSOFT, name: 'Microsoft 365', description: 'Sync Outlook calendar and join Teams meetings', icon: '💼', category: 'Meeting' },
  { platform: IntegrationPlatform.SLACK, name: 'Slack', description: 'Post call summaries and action items to Slack channels', icon: '💬', category: 'Notifications' },
  { platform: IntegrationPlatform.HUBSPOT, name: 'HubSpot', description: 'Auto-populate CRM deals, contacts, and tasks', icon: '🧡', category: 'CRM' },
  { platform: IntegrationPlatform.SALESFORCE, name: 'Salesforce', description: 'Sync call activity to opportunities and contacts', icon: '☁️', category: 'CRM' },
] as const

export default async function IntegrationsPage() {
  const { org } = await requireOrg()

  const connected = await prisma.integration.findMany({ where: { orgId: org.id } })
  const connectedSet = new Set(connected.map((i) => i.platform))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Integrations</h1>
        <p className="text-muted-foreground">Connect your tools to unlock the full platform.</p>
      </div>

      {(['Meeting', 'Notifications', 'CRM'] as const).map((category) => (
        <div key={category}>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">{category}</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {INTEGRATIONS.filter((i) => i.category === category).map((integration) => {
              const isConnected = connectedSet.has(integration.platform)
              return (
                <Card key={integration.platform} className="flex flex-col">
                  <CardHeader className="flex-row items-start gap-3 space-y-0">
                    <span className="text-2xl">{integration.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-base">{integration.name}</CardTitle>
                        {isConnected && <Badge variant="success">Connected</Badge>}
                      </div>
                      <CardDescription className="mt-1">{integration.description}</CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent className="mt-auto pt-0">
                    {isConnected ? (
                      <div className="flex gap-2">
                        <Link href={`/api/integrations/${integration.platform.toLowerCase()}/connect`} className="flex-1">
                          <Button variant="outline" size="sm" className="w-full">Reconnect</Button>
                        </Link>
                        <form action={`/api/integrations/${integration.platform.toLowerCase()}/disconnect`} method="POST">
                          <Button variant="ghost" size="sm" type="submit">Disconnect</Button>
                        </form>
                      </div>
                    ) : (
                      <Link href={`/api/integrations/${integration.platform.toLowerCase()}/connect`}>
                        <Button size="sm" className="w-full">Connect</Button>
                      </Link>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
