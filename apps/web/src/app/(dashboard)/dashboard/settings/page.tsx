import { requireOrg } from '@/lib/session'
import { prisma } from '@call-platform/db'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { OrgSettingsForm } from '@/components/settings/org-settings-form'
import { MembersTable } from '@/components/settings/members-table'

export default async function SettingsPage() {
  const { org, session } = await requireOrg()

  const members = await prisma.organizationMember.findMany({
    where: { orgId: org.id },
    include: { user: { select: { id: true, name: true, email: true, image: true } } },
    orderBy: { joinedAt: 'asc' },
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Manage your workspace settings.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Workspace</CardTitle>
          <CardDescription>Name and basic settings for your organization.</CardDescription>
        </CardHeader>
        <CardContent>
          <OrgSettingsForm org={{ id: org.id, name: org.name, slug: org.slug }} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Members</CardTitle>
          <CardDescription>{members.length} member{members.length !== 1 ? 's' : ''}</CardDescription>
        </CardHeader>
        <CardContent>
          <MembersTable members={members} currentUserId={session.user.id} orgId={org.id} />
        </CardContent>
      </Card>
    </div>
  )
}
