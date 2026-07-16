'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

const LABELS: Record<string, string> = {
  OBJECTION: 'Objections',
  BUYING_SIGNAL: 'Buying Signals',
  COMPETITOR_MENTION: 'Competitors',
  PRICING_DISCUSSION: 'Pricing',
  TIMELINE_DISCUSSION: 'Timeline',
  DECISION_MAKER_IDENTIFIED: 'Decision Maker',
  NEXT_STEP_AGREED: 'Next Steps',
}

interface Props {
  data: { type: string; count: number }[]
}

export function SignalFrequency({ data }: Props) {
  const chart = data.map((d) => ({ name: LABELS[d.type] ?? d.type, count: d.count }))
    .sort((a, b) => b.count - a.count)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Deal Signal Frequency</CardTitle>
      </CardHeader>
      <CardContent>
        {chart.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">No signals detected yet.</p>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={chart} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={100} />
              <Tooltip />
              <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}
