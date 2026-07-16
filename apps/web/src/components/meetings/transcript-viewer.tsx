'use client'

import type { Transcript } from '@call-platform/db'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatDuration } from '@/lib/utils'

interface Props { segments: Transcript[] }

const SPEAKER_COLORS = [
  'bg-blue-100 text-blue-800',
  'bg-purple-100 text-purple-800',
  'bg-green-100 text-green-800',
  'bg-orange-100 text-orange-800',
  'bg-pink-100 text-pink-800',
]

export function TranscriptViewer({ segments }: Props) {
  const speakerIds = [...new Set(segments.map((s) => s.speakerId).filter(Boolean))]
  const colorMap = Object.fromEntries(speakerIds.map((id, i) => [id, SPEAKER_COLORS[i % SPEAKER_COLORS.length]]))

  return (
    <Card>
      <CardHeader>
        <CardTitle>Transcript</CardTitle>
      </CardHeader>
      <CardContent>
        {segments.length === 0 ? (
          <p className="text-muted-foreground text-sm">Transcript not yet available.</p>
        ) : (
          <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
            {segments.map((seg) => (
              <div key={seg.id} className="flex gap-3">
                <span className="text-xs text-muted-foreground mt-1 w-12 shrink-0">
                  {formatDuration(Math.round(seg.startMs / 1000))}
                </span>
                <div className="flex-1">
                  {seg.speakerId && (
                    <span className={`mr-2 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${colorMap[seg.speakerId] ?? ''}`}>
                      {seg.speaker ?? `Speaker ${seg.speakerId}`}
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
  )
}
