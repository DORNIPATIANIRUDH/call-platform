import { NextResponse, type NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import Pusher from 'pusher'

// POST /api/realtime/auth — Pusher channel auth for private channels
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.text()
  const params = new URLSearchParams(body)
  const socketId = params.get('socket_id')
  const channelName = params.get('channel_name')

  if (!socketId || !channelName) {
    return NextResponse.json({ error: 'Missing socket_id or channel_name' }, { status: 400 })
  }

  // Verify the meeting belongs to this org
  const meetingId = channelName.replace('private-meeting-', '')
  const { prisma } = await import('@call-platform/db')
  const meeting = await prisma.meeting.findFirst({
    where: { id: meetingId, orgId: session.user.orgId },
  })
  if (!meeting) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const pusher = new Pusher({
    appId: process.env.PUSHER_APP_ID!,
    key: process.env.PUSHER_KEY!,
    secret: process.env.PUSHER_SECRET!,
    cluster: process.env.PUSHER_CLUSTER ?? 'us2',
    useTLS: true,
  })

  const auth = pusher.authorizeChannel(socketId, channelName)
  return NextResponse.json(auth)
}
