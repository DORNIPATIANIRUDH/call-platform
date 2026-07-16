'use client'

import { signIn } from 'next-auth/react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function LoginForm() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState<string | null>(null)

  const handleOAuth = async (provider: string) => {
    setLoading(provider)
    await signIn(provider, { callbackUrl: '/dashboard' })
  }

  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading('email')
    await signIn('email', { email, callbackUrl: '/dashboard' })
    setLoading(null)
  }

  return (
    <div className="space-y-4">
      <Button
        variant="outline"
        className="w-full"
        onClick={() => handleOAuth('google')}
        disabled={!!loading}
      >
        <GoogleIcon className="mr-2 h-4 w-4" />
        {loading === 'google' ? 'Redirecting...' : 'Continue with Google'}
      </Button>

      <Button
        variant="outline"
        className="w-full"
        onClick={() => handleOAuth('azure-ad')}
        disabled={!!loading}
      >
        <MicrosoftIcon className="mr-2 h-4 w-4" />
        {loading === 'azure-ad' ? 'Redirecting...' : 'Continue with Microsoft'}
      </Button>

      {process.env.NEXT_PUBLIC_EMAIL_LOGIN_ENABLED && (
        <>
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-muted-foreground">or</span>
            </div>
          </div>

          <form onSubmit={handleEmail} className="space-y-3">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={!!loading}>
              {loading === 'email' ? 'Sending link...' : 'Send magic link'}
            </Button>
          </form>
        </>
      )}

      <p className="text-center text-xs text-muted-foreground">
        By signing in you agree to our Terms of Service and Privacy Policy.
      </p>
    </div>
  )
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  )
}

function MicrosoftIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <path fill="#f25022" d="M1 1h10v10H1z" />
      <path fill="#00a4ef" d="M13 1h10v10H13z" />
      <path fill="#7fba00" d="M1 13h10v10H1z" />
      <path fill="#ffb900" d="M13 13h10v10H13z" />
    </svg>
  )
}
