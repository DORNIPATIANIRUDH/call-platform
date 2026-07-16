import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { LoginForm } from '@/components/auth/login-form'

export default async function LoginPage() {
  const session = await getServerSession(authOptions)
  if (session) redirect('/dashboard')

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="w-full max-w-md space-y-8 rounded-2xl border bg-white p-8 shadow-sm">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-2xl text-white">
            📞
          </div>
          <h1 className="text-2xl font-bold tracking-tight">CallPlatform</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            AI-powered sales call intelligence
          </p>
        </div>
        <LoginForm />
      </div>
    </div>
  )
}
