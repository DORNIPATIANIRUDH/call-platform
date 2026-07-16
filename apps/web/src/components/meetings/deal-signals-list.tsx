import type { DealSignal } from '@call-platform/db'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatDuration } from '@/lib/utils'

interface Props { signals: DealSignal[] }

const SIGNAL_CONFIG: Record<string, { label: string; variant: 'destructive' | 'success' | 'secondary' | 'default' }> = {
  OBJECTION: { label: 'Objection', variant: 'destructive' },
  BUYING_SIGNAL: { label: 'Buying Signal', variant: 'success' },
  COMPETITOR_MENTION: { label: 'Competitor', variant: 'secondary' },
  PRICING_DISCUSSION: { label: 'Pricing', variant: 'default' },
  TIMELINE_DISCUSSION: { label: 'Timeline', variant: 'secondary' },
  DECISION_MAKER_IDENTIFIED: { label: 'Decision Maker', variant: 'success' },
  NEXT_STEP_AGREED: { label: 'Next Step', variant: 'success' },
}

export function DealSignalsList({ signals }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Deal Signals
          <Badge variant="secondary">{signals.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {signals.length === 0 ? (
          <p className="text-sm text-muted-foreground">No deal signals detected.</p>
        ) : (
          <ul className="space-y-3">
            {signals.map((signal) => {
              const cfg = SIGNAL_CONFIG[signal.type] ?? { label: signal.type, variant: 'secondary' as const }
              return (
                <li key={signal.id} className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge variant={cfg.variant}>{cfg.label}</Badge>
                    {signal.timestampMs != null && (
                      <span className="text-xs text-muted-foreground">{formatDuration(Math.round(signal.timestampMs / 1000))}</span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">&ldquo;{signal.text}&rdquo;</p>
                </li>
              )
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
