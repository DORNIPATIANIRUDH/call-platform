'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Upload, X } from 'lucide-react'
import { createClient } from '@supabase/supabase-js'

interface Props { orgId: string }

export function UploadMeetingDialog({ orgId }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [progress, setProgress] = useState(0)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) return
    setError('')
    setProgress(0)

    try {
      // Step 1: Get signed upload URL from our API
      setStatus('Preparing upload…')
      const urlRes = await fetch('/api/meetings/upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title || file.name.replace(/\.[^.]+$/, ''),
          filename: file.name,
          mimeType: file.type,
          fileSize: file.size,
        }),
      })
      if (!urlRes.ok) {
        const d = await urlRes.json()
        throw new Error(d.error?.message ?? 'Failed to prepare upload')
      }
      const { data } = await urlRes.json()
      const { meetingId, uploadUrl, storageKey, token } = data

      // Step 2: Upload directly to Supabase (bypasses Vercel 4.5MB limit)
      setStatus('Uploading file…')
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )
      const bucket = process.env.NEXT_PUBLIC_SUPABASE_BUCKET ?? 'call-recordings'

      // Simulate progress (Supabase JS v2 doesn't expose upload progress)
      setProgress(10)
      const timer = setInterval(() => setProgress((p) => Math.min(p + 5, 90)), 300)

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .uploadToSignedUrl(storageKey, token, file, { contentType: file.type })

      clearInterval(timer)
      if (uploadError) throw new Error(uploadError.message)
      setProgress(100)

      // Step 3: Notify API that upload is complete → queues transcription
      setStatus('Queuing transcription…')
      const completeRes = await fetch('/api/meetings/upload-complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ meetingId, storageKey, mimeType: file.type, fileSize: file.size }),
      })
      if (!completeRes.ok) {
        const d = await completeRes.json()
        throw new Error(d.error?.message ?? 'Failed to queue transcription')
      }

      setOpen(false)
      setTitle('')
      setFile(null)
      setProgress(0)
      setStatus('')
      router.push(`/dashboard/meetings/${meetingId}`)
      router.refresh()
    } catch (err: any) {
      setError(err.message)
      setStatus('')
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Upload Recording</h2>
          <button onClick={() => { setOpen(false); setError(''); setProgress(0); setStatus('') }} className="text-muted-foreground hover:text-foreground">
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
            <p className="mt-1 text-xs text-muted-foreground">MP3, MP4, WAV, WebM, M4A — up to 500MB</p>
          </div>

          {progress > 0 && (
            <div>
              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                <span>{status}</span>
                <span>{progress}%</span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div className="h-2 bg-primary rounded-full transition-all" style={{ width: `${progress}%` }} />
              </div>
            </div>
          )}

          {status && progress === 0 && (
            <p className="text-sm text-muted-foreground">{status}</p>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={() => { setOpen(false); setError(''); setProgress(0); setStatus('') }}>
              Cancel
            </Button>
            <Button type="submit" disabled={!file || progress > 0}>
              {progress > 0 ? `Uploading ${progress}%…` : 'Upload & Transcribe'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
