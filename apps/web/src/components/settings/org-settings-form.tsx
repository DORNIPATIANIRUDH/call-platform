'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useRouter } from 'next/navigation'
import { toast } from '@/hooks/use-toast'

interface Props {
  org: { id: string; name: string; slug: string }
}

export function OrgSettingsForm({ org }: Props) {
  const router = useRouter()
  const [name, setName] = useState(org.name)
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch(`/api/organizations/${org.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      if (!res.ok) throw new Error('Failed to save')
      toast({ title: 'Saved', description: 'Workspace name updated.' })
      router.refresh()
    } catch {
      toast({ title: 'Error', description: 'Could not save settings.', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-sm">
      <div>
        <Label htmlFor="name">Workspace name</Label>
        <Input id="name" value={name} onChange={(e) => setName(e.target.value)} className="mt-1" required />
      </div>
      <div>
        <Label>Slug</Label>
        <Input value={org.slug} disabled className="mt-1 bg-muted" />
      </div>
      <Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</Button>
    </form>
  )
}
