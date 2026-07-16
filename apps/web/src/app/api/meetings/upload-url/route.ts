import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import { prisma } from '@call-platform/db'
import { createClient } from '@supabase/supabase-js'

export const maxDuration = 30

// Returns a signed upload URL so the browser can upload directly to Supabase
export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.orgId) {
    return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } }, { status: 401 })
  }

  const body = await req.json()
  const { title, filename, mimeType, fileSize } = body

  if (!filename) {
    return NextResponse.json({ error: { code: 'VALIDATION', message: 'filename required' } }, { status: 400 })
  }

  const maxBytes = 500 * 1024 * 1024 // 500MB — Supabase handles it directly
  if (fileSize && fileSize > maxBytes) {
    return NextResponse.json({ error: { code: 'FILE_TOO_LARGE', message: 'Max file size is 500MB' } }, { status: 400 })
  }

  // Check plan limit
  const sub = await prisma.subscription.findUnique({ where: { orgId: session.user.orgId } })
  if (sub && sub.plan === 'FREE' && sub.minutesUsed >= sub.minutesLimit) {
    return NextResponse.json({
      error: { code: 'LIMIT_REACHED', message: `You've used all ${sub.minutesLimit} free minutes.` }
    }, { status: 403 })
  }

  // Create meeting record first to get the ID
  const meeting = await prisma.meeting.create({
    data: { orgId: session.user.orgId, title: title || filename.replace(/\.[^.]+$/, ''), status: 'PROCESSING' },
  })

  const ext = filename.split('.').pop()?.toLowerCase() ?? 'webm'
  const storageKey = `orgs/${session.user.orgId}/meetings/${meeting.id}/recording.${ext}`
  const bucket = process.env.SUPABASE_STORAGE_BUCKET ?? 'call-recordings'

  // Generate signed upload URL (valid 1 hour)
  const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const { data, error } = await supabase.storage.from(bucket).createSignedUploadUrl(storageKey)

  if (error || !data) {
    await prisma.meeting.delete({ where: { id: meeting.id } })
    return NextResponse.json({ error: { code: 'STORAGE_ERROR', message: error?.message ?? 'Could not create upload URL' } }, { status: 500 })
  }

  return NextResponse.json({
    data: {
      meetingId: meeting.id,
      uploadUrl: data.signedUrl,
      storageKey,
      token: data.token,
    }
  }, { status: 201 })
}
