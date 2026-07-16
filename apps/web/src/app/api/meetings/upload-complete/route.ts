import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import { prisma } from '@call-platform/db'
import { getStorageProvider } from '@call-platform/storage'

export const maxDuration = 30

// Called after browser finishes direct upload to Supabase
export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.orgId) {
    return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } }, { status: 401 })
  }

  const { meetingId, storageKey, mimeType, fileSize } = await req.json()
  if (!meetingId || !storageKey) {
    return NextResponse.json({ error: { code: 'VALIDATION', message: 'meetingId and storageKey required' } }, { status: 400 })
  }

  // Verify meeting belongs to this org
  const meeting = await prisma.meeting.findFirst({ where: { id: meetingId, orgId: session.user.orgId } })
  if (!meeting) {
    return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Meeting not found' } }, { status: 404 })
  }

  // Get a fresh signed URL for the worker to read
  const storage = getStorageProvider()
  const signedUrl = await storage.getSignedUrl(storageKey, 7200)

  // Save recording metadata
  await prisma.recording.create({
    data: {
      meetingId,
      storageKey,
      storageUrl: signedUrl,
      mimeType: mimeType || 'video/mp4',
      sizeBytes: fileSize || null,
    },
  })

  // Queue transcription
  try {
    const { createTranscriptionQueue } = await import('@call-platform/queue')
    const q = createTranscriptionQueue()
    await q.add('transcribe-file', {
      meetingId,
      orgId: session.user.orgId,
      audioUrl: signedUrl,
      isFinal: true,
    })
    await q.close()
  } catch (err) {
    console.warn('Queue unavailable:', err)
  }

  return NextResponse.json({ data: { id: meetingId } })
}
