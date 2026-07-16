'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'

interface Props {
  data: { speaker: string; seconds: number }[]
}

const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444']

export function TalkTimeChart({ data }: Props) {
  const total = data.reduce((s, d) => s + d.seconds, 0)
  const chart = data.map((d) => ({ ...d, pct: total > 0 ? Math.round((d.seconds / total) * 100) : 0 }))

  return (
    <Card>
      <CardHeader>
        <CardTitle>Talk Time Distribution</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">No talk-time data yet.</p>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={chart} dataKey="seconds" nameKey="speaker" cx="50%" cy="50%" outerRadius={90} label={({ pct }) => `${pct}%`}>
                {chart.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={(v: number) => `${Math.round(v / 60)}m`} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}
