import { requireOrg } from '@/lib/session'
import { Sidebar } from '@/components/dashboard/sidebar'
import { TopBar } from '@/components/dashboard/top-bar'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { session, org } = await requireOrg()

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar org={org} user={session.user} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar org={org} user={session.user} />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  )
}
