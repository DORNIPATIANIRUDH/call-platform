'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function OnboardingForm({ userId }: { userId: string }) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/organizations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error?.message ?? 'Failed to create workspace')
      }
      router.push('/dashboard?welcome=1')
      router.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <Label htmlFor="orgName">Workspace name</Label>
        <Input
          id="orgName"
          placeholder="Acme Sales Team"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          minLength={2}
          className="mt-1"
        />
        <p className="mt-1 text-xs text-muted-foreground">
          Usually your company or team name.
        </p>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? 'Creating workspace...' : 'Create workspace →'}
      </Button>
    </form>
  )
}
