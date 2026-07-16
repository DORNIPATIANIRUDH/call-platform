import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import { prisma } from '@call-platform/db'
import { getStorageProvider, recordingKey } from '@call-platform/storage'

// App Router config — increase body size limit and function timeout
export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.orgId) {
    return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } }, { status: 401 })
  }

  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json({ error: { code: 'PARSE_ERROR', message: 'Could not parse upload. Max file size is 50MB.' } }, { status: 400 })
  }

  const file = formData.get('file') as File | null
  const title = String(formData.get('title') ?? 'Untitled Meeting')

  if (!file) {
    return NextResponse.json({ error: { code: 'VALIDATION', message: 'No file provided' } }, { status: 400 })
  }

  const maxBytes = 50 * 1024 * 1024 // 50MB — Vercel hobby plan limit
  if (file.size > maxBytes) {
    return NextResponse.json({ error: { code: 'FILE_TOO_LARGE', message: 'Max file size is 50MB on the free plan.' } }, { status: 400 })
  }

  // Check plan limit
  const sub = await prisma.subscription.findUnique({ where: { orgId: session.user.orgId } })
  if (sub && sub.plan === 'FREE' && sub.minutesUsed >= sub.minutesLimit) {
    return NextResponse.json({
      error: { code: 'LIMIT_REACHED', message: `You've used all ${sub.minutesLimit} free minutes.` }
    }, { status: 403 })
  }

  // Create meeting record
  const meeting = await prisma.meeting.create({
    data: {
      orgId: session.user.orgId,
      title,
      status: 'PROCESSING',
    },
  })

  // Upload to Supabase Storage
  const storage = getStorageProvider()
  const ext = (file.name.split('.').pop() ?? 'webm').toLowerCase()
  const key = recordingKey(session.user.orgId, meeting.id, ext)
  const buffer = Buffer.from(await file.arrayBuffer())
  await storage.upload(key, buffer, file.type || 'audio/webm')

  // Get a signed URL (valid 1 hour) so Deepgram can fetch it
  const signedUrl = await storage.getSignedUrl(key, 3600)

  // Save recording metadata
  await prisma.recording.create({
    data: {
      meetingId: meeting.id,
      storageKey: key,
      storageUrl: signedUrl,
      mimeType: file.type || 'audio/webm',
      sizeBytes: file.size,
    },
  })

  // Queue transcription — skip gracefully if Redis not available
  try {
    const { createTranscriptionQueue } = await import('@call-platform/queue')
    const transcriptionQueue = createTranscriptionQueue()
    await transcriptionQueue.add('transcribe-file', {
      meetingId: meeting.id,
      orgId: session.user.orgId,
      audioUrl: signedUrl,
      isFinal: true,
    })
    await transcriptionQueue.close()
  } catch (err) {
    console.warn('Queue unavailable — transcription will need to be triggered manually:', err)
    // Meeting is saved and file is uploaded — don't fail the whole request
  }

  return NextResponse.json({ data: { id: meeting.id, title: meeting.title } }, { status: 201 })
}
