'use client'

import { useEffect, useState } from 'react'
import Pusher from 'pusher-js'
import type { TranscriptSegment, CoachingAlert } from '@call-platform/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatDuration } from '@/lib/utils'
import { Mic, AlertTriangle, Info, Zap } from 'lucide-react'

interface Props {
  meetingId: string
  initialStatus: string
}

export function LiveCoachingView({ meetingId, initialStatus }: Props) {
  const [segments, setSegments] = useState<TranscriptSegment[]>([])
  const [alerts, setAlerts] = useState<CoachingAlert[]>([])
  const [status, setStatus] = useState(initialStatus)
  const [elapsed, setElapsed] = useState(0)

  // Elapsed timer
  useEffect(() => {
    const t = setInterval(() => setElapsed((e) => e + 1), 1000)
    return () => clearInterval(t)
  }, [])

  // Pusher subscription
  useEffect(() => {
    const pusherKey = process.env.NEXT_PUBLIC_PUSHER_KEY
    const pusherCluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER ?? 'us2'
    if (!pusherKey) return

    const pusher = new Pusher(pusherKey, { cluster: pusherCluster })
    const channel = pusher.subscribe(`meeting-${meetingId}`)

    channel.bind('transcript', (seg: TranscriptSegment) => {
      setSegments((prev) => [...prev.slice(-200), seg])
    })

    channel.bind('coaching-alert', (alert: CoachingAlert) => {
      setAlerts((prev) => [alert, ...prev].slice(0, 10))
    })

    channel.bind('status', ({ status: s }: { status: string }) => {
      setStatus(s)
    })

    return () => {
      channel.unbind_all()
      pusher.unsubscribe(`meeting-${meetingId}`)
      pusher.disconnect()
    }
  }, [meetingId])

  const AlertIcon = ({ severity }: { severity: string }) => {
    if (severity === 'CRITICAL') return <AlertTriangle className="h-4 w-4 text-red-500" />
    if (severity === 'WARNING') return <Zap className="h-4 w-4 text-yellow-500" />
    return <Info className="h-4 w-4 text-blue-500" />
  }

  return (
    <div className="grid gap-4 lg:grid-cols-3 h-full">
      {/* Live transcript (2/3) */}
      <div className="lg:col-span-2">
        <Card className="h-full flex flex-col">
          <CardHeader className="flex-row items-center gap-3 shrink-0">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-100">
              <Mic className="h-4 w-4 text-red-600 animate-pulse" />
            </div>
            <div>
              <CardTitle className="text-base">Live Transcript</CardTitle>
              <p className="text-xs text-muted-foreground">{formatDuration(elapsed)} elapsed · {status}</p>
            </div>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto">
            {segments.length === 0 ? (
              <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
                Waiting for audio…
              </div>
            ) : (
              <div className="space-y-3">
                {segments.map((seg, i) => (
                  <div key={i} className="flex gap-3 animate-in slide-in-from-bottom-1">
                    <span className="text-xs text-muted-foreground mt-0.5 w-10 shrink-0">
                      {formatDuration(Math.round(seg.startMs / 1000))}
                    </span>
                    <div>
                      {seg.speakerId && (
                        <span className="mr-1 text-xs font-medium text-primary">
                          Speaker {seg.speakerId}:
                        </span>
                      )}
                      <span className="text-sm">{seg.text}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Coaching alerts (1/3) */}
      <div>
        <Card className="h-full flex flex-col">
          <CardHeader className="shrink-0">
            <CardTitle className="text-base flex items-center gap-2">
              AI Coaching
              {alerts.length > 0 && <Badge variant="secondary">{alerts.length}</Badge>}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto">
            {alerts.length === 0 ? (
              <div className="flex h-full items-center justify-center text-center text-sm text-muted-foreground">
                <div>
                  <Zap className="mx-auto mb-2 h-6 w-6 opacity-40" />
                  <p>Coaching alerts will appear here</p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {alerts.map((alert, i) => (
                  <div
                    key={i}
                    className={`rounded-lg border p-3 text-sm animate-in slide-in-from-top-1 ${
                      alert.severity === 'CRITICAL'
                        ? 'border-red-200 bg-red-50'
                        : alert.severity === 'WARNING'
                          ? 'border-yellow-200 bg-yellow-50'
                          : 'border-blue-200 bg-blue-50'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <AlertIcon severity={alert.severity} />
                      <div>
                        <p className="font-medium">{alert.text}</p>
                        {alert.suggestion && (
                          <p className="mt-1 text-xs text-muted-foreground">{alert.suggestion}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
