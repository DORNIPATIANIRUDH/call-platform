import type { Analysis } from '@call-platform/db'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface Props { analysis: Analysis }

export function AnalysisPanel({ analysis }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          AI Summary
          {analysis.sentiment && (
            <Badge variant={analysis.sentiment === 'positive' ? 'success' : analysis.sentiment === 'negative' ? 'destructive' : 'secondary'}>
              {analysis.sentiment}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {analysis.summary && (
          <p className="text-sm leading-relaxed whitespace-pre-line">{analysis.summary}</p>
        )}
        {analysis.keyTopics && (analysis.keyTopics as string[]).length > 0 && (
          <div>
            <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Key Topics</p>
            <div className="flex flex-wrap gap-1">
              {(analysis.keyTopics as string[]).map((t) => (
                <Badge key={t} variant="secondary">{t}</Badge>
              ))}
            </div>
          </div>
        )}
        {analysis.nextSteps && (
          <div>
            <p className="mb-1 text-xs font-semibold uppercase text-muted-foreground">Next Steps</p>
            <p className="text-sm whitespace-pre-line">{analysis.nextSteps}</p>
          </div>
        )}
        {analysis.talkTime && Object.keys(analysis.talkTime as object).length > 0 && (
          <div>
            <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Talk Time</p>
            <div className="space-y-1.5">
              {Object.entries(analysis.talkTime as Record<string, number>)
                .sort(([, a], [, b]) => b - a)
                .map(([speaker, seconds]) => {
                  const total = Object.values(analysis.talkTime as Record<string, number>).reduce((s, v) => s + v, 0)
                  const pct = total > 0 ? Math.round((seconds / total) * 100) : 0
                  return (
                    <div key={speaker} className="flex items-center gap-2">
                      <span className="w-24 truncate text-xs">{speaker}</span>
                      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                        <div className="h-2 bg-primary rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-xs text-muted-foreground w-8 text-right">{pct}%</span>
                    </div>
                  )
                })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
