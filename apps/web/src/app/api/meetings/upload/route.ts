import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import { prisma } from '@call-platform/db'
import { getStorageProvider, recordingKey } from '@call-platform/storage'
import { createAnalysisQueue, createTranscriptionQueue } from '@call-platform/queue'

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.orgId) {
    return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } }, { status: 401 })
  }

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  const title = String(formData.get('title') ?? 'Untitled Meeting')

  if (!file) {
    return NextResponse.json({ error: { code: 'VALIDATION', message: 'No file provided' } }, { status: 400 })
  }

  const maxBytes = 500 * 1024 * 1024 // 500 MB
  if (file.size > maxBytes) {
    return NextResponse.json({ error: { code: 'FILE_TOO_LARGE', message: 'Max file size is 500MB' } }, { status: 400 })
  }

  // Check plan limit
  const sub = await prisma.subscription.findUnique({ where: { orgId: session.user.orgId } })
  if (sub && sub.plan === 'FREE' && sub.minutesUsed >= sub.minutesLimit) {
    return NextResponse.json({
      error: { code: 'LIMIT_REACHED', message: `You've used all ${sub.minutesLimit} free minutes. Upgrade to Pro for unlimited recordings.` }
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

  // Upload to storage
  const storage = getStorageProvider()
  const ext = file.name.split('.').pop() ?? 'webm'
  const key = recordingKey(session.user.orgId, meeting.id, ext)
  const buffer = Buffer.from(await file.arrayBuffer())
  const { storageUrl } = await storage.upload(key, buffer, file.type || 'audio/webm')

  // Save recording metadata
  await prisma.recording.create({
    data: {
      meetingId: meeting.id,
      storageKey: key,
      storageUrl,
      mimeType: file.type || 'audio/webm',
      sizeBytes: file.size,
    },
  })

  // Queue transcription job (full-file mode)
  const transcriptionQueue = createTranscriptionQueue()
  await transcriptionQueue.add('transcribe-file', {
    meetingId: meeting.id,
    orgId: session.user.orgId,
    audioUrl: storageUrl,
    isFinal: true,
  })
  await transcriptionQueue.close()

  return NextResponse.json({ data: { id: meeting.id, title: meeting.title } }, { status: 201 })
}
