import { requireOrg } from '@/lib/session'
import { prisma } from '@call-platform/db'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TalkTimeChart } from '@/components/analytics/talk-time-chart'
import { DealScoreTrend } from '@/components/analytics/deal-score-trend'
import { SignalFrequency } from '@/components/analytics/signal-frequency'

export default async function AnalyticsPage() {
  const { org } = await requireOrg()

  const [meetings, signalCounts] = await Promise.all([
    prisma.meeting.findMany({
      where: { orgId: org.id, status: 'COMPLETED' },
      orderBy: { createdAt: 'asc' },
      include: { analysis: { select: { dealScore: true, talkTime: true, sentiment: true, createdAt: true } } },
      take: 60,
    }),
    prisma.dealSignal.groupBy({
      by: ['type'],
      where: { meeting: { orgId: org.id } },
      _count: { id: true },
    }),
  ])

  const dealScoreData = meetings
    .filter((m) => m.analysis?.dealScore != null)
    .map((m) => ({ date: m.createdAt.toISOString().slice(0, 10), score: m.analysis!.dealScore! }))

  const signalData = signalCounts.map((s) => ({ type: s.type, count: s._count.id }))

  const avgDealScore =
    dealScoreData.length > 0
      ? Math.round(dealScoreData.reduce((s, d) => s + d.score, 0) / dealScoreData.length)
      : null

  const sentiments = meetings.filter((m) => m.analysis?.sentiment).map((m) => m.analysis!.sentiment!)
  const positiveRate =
    sentiments.length > 0
      ? Math.round((sentiments.filter((s) => s === 'positive').length / sentiments.length) * 100)
      : null

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Analytics</h1>
        <p className="text-muted-foreground">Insights across {meetings.length} completed calls</p>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Avg Deal Score</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{avgDealScore != null ? `${avgDealScore}/100` : '—'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Positive Sentiment</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{positiveRate != null ? `${positiveRate}%` : '—'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Calls Analyzed</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{meetings.filter((m) => m.analysis).length}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <DealScoreTrend data={dealScoreData} />
        <SignalFrequency data={signalData} />
      </div>
    </div>
  )
}
