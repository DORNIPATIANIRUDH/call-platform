'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Upload, X } from 'lucide-react'

interface Props { orgId: string }

export function UploadMeetingDialog({ orgId }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) return
    setUploading(true)
    setError('')
    try {
      const formData = new FormData()
      formData.append('title', title || file.name.replace(/\.[^.]+$/, ''))
      formData.append('file', file)
      const res = await fetch('/api/meetings/upload', { method: 'POST', body: formData })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error?.message ?? 'Upload failed')
      }
      const { data } = await res.json()
      setOpen(false)
      router.push(`/dashboard/meetings/${data.id}`)
      router.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setUploading(false)
    }
  }

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)}>
        <Upload className="mr-2 h-4 w-4" /> Upload Recording
      </Button>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Upload Recording</h2>
          <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="title">Meeting title (optional)</Label>
            <Input id="title" placeholder="Q3 Discovery Call" value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label htmlFor="file">Audio or video file</Label>
            <Input
              id="file"
              type="file"
              accept="audio/*,video/*"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="mt-1"
              required
            />
            <p className="mt-1 text-xs text-muted-foreground">MP3, MP4, WAV, WebM, M4A — up to 50MB</p>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={uploading || !file}>
              {uploading ? 'Uploading…' : 'Upload & Transcribe'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
