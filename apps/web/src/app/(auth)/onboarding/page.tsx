import { requireSession } from '@/lib/session'
import { prisma } from '@call-platform/db'
import { OnboardingForm } from '@/components/onboarding/onboarding-form'

export default async function OnboardingPage() {
  const session = await requireSession()

  const membership = await prisma.organizationMember.findFirst({
    where: { userId: session.user.id },
  })

  // Already has an org → go to dashboard
  if (membership) {
    const { redirect } = await import('next/navigation')
    redirect('/dashboard')
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="w-full max-w-lg space-y-8 rounded-2xl border bg-white p-8 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold">Set up your workspace</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Create your organization to get started with CallPlatform.
          </p>
        </div>
        <OnboardingForm userId={session.user.id} />
      </div>
    </div>
  )
}
